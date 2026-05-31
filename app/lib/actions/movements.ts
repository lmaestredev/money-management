'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fetchAccountById } from '@/app/lib/data/accounts';
import { fetchCreditCardById } from '@/app/lib/data/credit-cards';
import { createMovement, deleteMovement, updateMovement } from '@/app/lib/data/movements';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import type { AccountCurrency } from '@/app/lib/definitions';

const optionalUuid = z
  .union([z.string().uuid(), z.literal('')])
  .optional()
  .transform((s) => (s && String(s).trim() ? (s as string) : null));

/** Resuelve la moneda del medio de pago (cuenta o tarjeta) para repartir el monto. */
async function resolveSourceCurrency(
  accountId: string | null,
  cardId: string | null
): Promise<AccountCurrency | null> {
  if (accountId) {
    const account = await fetchAccountById(accountId);
    return account ? account.currency : null;
  }
  if (cardId) {
    const card = await fetchCreditCardById(cardId);
    return card ? card.currency : null;
  }
  return null;
}

const recordTypeSchema = z.enum([
  'income',
  'conversion',
  'variable_payment',
  'fixed_payment',
]);

const createMovementFormSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'),
  record_type: recordTypeSchema,
  account_id: optionalUuid,
  credit_card_id: optionalUuid,
  category_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  description: z.string().optional(),
  status: z
    .string()
    .optional()
    .transform((s) => (s === 'true' ? true : s === 'false' ? false : null)),
  amount: z.string().optional(),
  amount_pesos: z.string().optional(),
  amount_dollars: z.string().optional(),
  payment_date: z.string().optional().or(z.literal('')),
  dollar_rate: z.string().optional().or(z.literal('')),
  comment: z.string().optional(),
});

export async function createMovementAction(formData: FormData) {
  const raw = {
    period: formData.get('period'),
    record_type: formData.get('record_type') ?? undefined,
    account_id: formData.get('account_id') ?? undefined,
    credit_card_id: formData.get('credit_card_id') ?? undefined,
    category_id: formData.get('category_id') ?? undefined,
    description: formData.get('description') ?? undefined,
    status: formData.get('status') ?? undefined,
    amount: formData.get('amount') ?? undefined,
    amount_pesos: formData.get('amount_pesos') ?? undefined,
    amount_dollars: formData.get('amount_dollars') ?? undefined,
    payment_date: formData.get('payment_date') ?? undefined,
    dollar_rate: formData.get('dollar_rate') ?? undefined,
    comment: formData.get('comment') ?? undefined,
  };

  const parsed = createMovementFormSchema.safeParse(raw);
  if (!parsed.success) {
    const period =
      typeof raw.period === 'string' && /^\d{4}-\d{2}$/.test(raw.period)
        ? raw.period
        : new Date().toISOString().slice(0, 7);
    redirect(`/dashboard/movimientos/nuevo?period=${period}&error=validation`);
  }

  const data = parsed.data;
  if (!data.account_id && !data.credit_card_id) {
    redirect(`/dashboard/movimientos/nuevo?period=${data.period}&error=validation`);
  }
  let amountPesos: number;
  let amountDollars: number;

  if (data.amount != null && data.amount !== '') {
    const amount = parseFloat(data.amount);
    if (Number.isNaN(amount) || amount < 0) {
      const period = data.period;
      redirect(`/dashboard/movimientos/nuevo?period=${period}&error=validation`);
    }
    const currency = await resolveSourceCurrency(data.account_id, data.credit_card_id);
    if (!currency) {
      const period = data.period;
      redirect(`/dashboard/movimientos/nuevo?period=${period}&error=validation`);
    }
    if (currency === 'peso') {
      amountPesos = amount;
      amountDollars = 0;
    } else {
      amountPesos = 0;
      amountDollars = amount;
    }
  } else if (
    data.amount_pesos != null &&
    data.amount_pesos !== '' &&
    data.amount_dollars != null &&
    data.amount_dollars !== ''
  ) {
    amountPesos = parseFloat(data.amount_pesos);
    amountDollars = parseFloat(data.amount_dollars);
    if (Number.isNaN(amountPesos) || Number.isNaN(amountDollars)) {
      const period = data.period;
      redirect(`/dashboard/movimientos/nuevo?period=${period}&error=validation`);
    }
  } else {
    const period = data.period;
    redirect(`/dashboard/movimientos/nuevo?period=${period}&error=validation`);
  }

  await createMovement(
    {
      period: data.period,
      record_type: data.record_type,
      account_id: data.account_id,
      credit_card_id: data.credit_card_id,
      category_id: data.category_id ?? null,
      description: data.description || null,
      status: data.status ?? null,
      amount_pesos: amountPesos,
      amount_dollars: amountDollars,
      payment_date: data.payment_date && data.payment_date !== '' ? data.payment_date : null,
      dollar_rate: data.dollar_rate && data.dollar_rate !== '' ? parseFloat(data.dollar_rate) : null,
      comment: data.comment || null,
    },
    'app'
  );

  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard');
  redirectWithToast(`/dashboard/movimientos?period=${data.period}`, 'Movimiento guardado');
}

const updateMovementFormSchema = createMovementFormSchema.extend({
  id: z.string().uuid(),
});

export async function updateMovementAction(formData: FormData) {
  const raw = {
    id: formData.get('id'),
    period: formData.get('period'),
    record_type: formData.get('record_type') ?? undefined,
    account_id: formData.get('account_id') ?? undefined,
    credit_card_id: formData.get('credit_card_id') ?? undefined,
    category_id: formData.get('category_id') ?? undefined,
    description: formData.get('description') ?? undefined,
    status: formData.get('status') ?? undefined,
    amount: formData.get('amount') ?? undefined,
    amount_pesos: formData.get('amount_pesos') ?? undefined,
    amount_dollars: formData.get('amount_dollars') ?? undefined,
    payment_date: formData.get('payment_date') ?? undefined,
    dollar_rate: formData.get('dollar_rate') ?? undefined,
    comment: formData.get('comment') ?? undefined,
  };

  const parsed = updateMovementFormSchema.safeParse(raw);
  if (!parsed.success) {
    const id = typeof raw.id === 'string' ? raw.id : '';
    const period =
      typeof raw.period === 'string' && /^\d{4}-\d{2}$/.test(raw.period)
        ? raw.period
        : new Date().toISOString().slice(0, 7);
    redirect(
      id
        ? `/dashboard/movimientos/editar/${id}?period=${period}&error=validation`
        : '/dashboard/movimientos'
    );
  }

  const data = parsed.data;
  const errorTarget = `/dashboard/movimientos/editar/${data.id}?period=${data.period}&error=validation`;
  if (!data.account_id && !data.credit_card_id) {
    redirect(errorTarget);
  }
  let amountPesos: number;
  let amountDollars: number;

  if (data.amount != null && data.amount !== '') {
    const amount = parseFloat(data.amount);
    if (Number.isNaN(amount) || amount < 0) {
      redirect(errorTarget);
    }
    const currency = await resolveSourceCurrency(data.account_id, data.credit_card_id);
    if (!currency) {
      redirect(errorTarget);
    }
    if (currency === 'peso') {
      amountPesos = amount;
      amountDollars = 0;
    } else {
      amountPesos = 0;
      amountDollars = amount;
    }
  } else if (
    data.amount_pesos != null &&
    data.amount_pesos !== '' &&
    data.amount_dollars != null &&
    data.amount_dollars !== ''
  ) {
    amountPesos = parseFloat(data.amount_pesos);
    amountDollars = parseFloat(data.amount_dollars);
    if (Number.isNaN(amountPesos) || Number.isNaN(amountDollars)) {
      redirect(errorTarget);
    }
  } else {
    redirect(errorTarget);
  }

  await updateMovement(data.id, {
    period: data.period,
    record_type: data.record_type,
    account_id: data.account_id,
    credit_card_id: data.credit_card_id,
    category_id: data.category_id ?? null,
    description: data.description || null,
    status: data.status ?? null,
    amount_pesos: amountPesos,
    amount_dollars: amountDollars,
    payment_date: data.payment_date && data.payment_date !== '' ? data.payment_date : null,
    dollar_rate: data.dollar_rate && data.dollar_rate !== '' ? parseFloat(data.dollar_rate) : null,
    comment: data.comment || null,
  });

  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard');
  redirectWithToast(`/dashboard/movimientos?period=${data.period}`, 'Movimiento actualizado');
}

const deleteMovementFormSchema = z.object({
  id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function deleteMovementAction(formData: FormData) {
  const parsed = deleteMovementFormSchema.safeParse({
    id: formData.get('id'),
    period: formData.get('period'),
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos');
  }

  const { id, period } = parsed.data;
  await deleteMovement(id);

  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard/gastos-fijos');
  redirectWithToast(`/dashboard/movimientos?period=${period}`, 'Movimiento eliminado');
}
