'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fetchAccountById } from '@/app/lib/data/accounts';
import { fetchCreditCardById } from '@/app/lib/data/credit-cards';
import { createMovement, deleteMovement, updateMovement } from '@/app/lib/data/movements';
import { currentPeriodAR } from '@/app/lib/dates';
import {
  MAX_COMMENT,
  MAX_DESCRIPTION,
  hasValidMovementAmounts,
  isoDate,
  parseAmount,
  parseOptionalRate,
  period as periodSchema,
  recordType as recordTypeSchema,
} from '@/app/lib/validation';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import { createClient } from '@/app/lib/supabase/server';
import type { AccountCurrency } from '@/app/lib/definitions';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

const optionalUuid = z
  .union([z.string().uuid(), z.literal('')])
  .optional()
  .transform((s) => (s && String(s).trim() ? (s as string) : null));

async function resolveSourceCurrency(
  userId: string,
  accountId: string | null,
  cardId: string | null
): Promise<AccountCurrency | null> {
  if (accountId) {
    const account = await fetchAccountById(accountId, userId);
    return account ? account.currency : null;
  }
  if (cardId) {
    const card = await fetchCreditCardById(cardId, userId);
    return card ? card.currency : null;
  }
  return null;
}

const createMovementFormSchema = z.object({
  period: periodSchema,
  record_type: recordTypeSchema,
  account_id: optionalUuid,
  credit_card_id: optionalUuid,
  category_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  description: z.string().max(MAX_DESCRIPTION).optional(),
  status: z
    .string()
    .optional()
    .transform((s) => (s === 'true' ? true : s === 'false' ? false : null)),
  amount: z.string().optional(),
  amount_pesos: z.string().optional(),
  amount_dollars: z.string().optional(),
  payment_date: isoDate.or(z.literal('')).optional(),
  dollar_rate: z.string().optional().or(z.literal('')),
  comment: z.string().max(MAX_COMMENT).optional(),
});

type MovementFormData = {
  record_type: string;
  account_id: string | null;
  credit_card_id: string | null;
  amount?: string;
  amount_pesos?: string;
  amount_dollars?: string;
  dollar_rate?: string;
};

type ResolvedAmounts = { amountPesos: number; amountDollars: number; dollarRate: number | null };

const hasValue = (s: string | undefined): s is string => s != null && s !== '';

/**
 * Resuelve y valida los importes de un movimiento en el servidor: finitos, >= 0
 * y una sola moneda con importe > 0 (salvo conversiones). null si algo es inválido.
 */
async function resolveMovementAmounts(
  userId: string,
  data: MovementFormData
): Promise<ResolvedAmounts | null> {
  const rate = parseOptionalRate(data.dollar_rate);
  if (!rate.ok) return null;

  let amountPesos: number;
  let amountDollars: number;

  if (hasValue(data.amount)) {
    const amount = parseAmount(data.amount);
    if (amount === null) return null;
    const currency = await resolveSourceCurrency(userId, data.account_id, data.credit_card_id);
    if (!currency) return null;
    amountPesos = currency === 'peso' ? amount : 0;
    amountDollars = currency === 'peso' ? 0 : amount;
  } else if (hasValue(data.amount_pesos) && hasValue(data.amount_dollars)) {
    const pesos = parseAmount(data.amount_pesos);
    const dollars = parseAmount(data.amount_dollars);
    if (pesos === null || dollars === null) return null;
    amountPesos = pesos;
    amountDollars = dollars;
  } else {
    return null;
  }

  if (!hasValidMovementAmounts(data.record_type, amountPesos, amountDollars)) return null;
  return { amountPesos, amountDollars, dollarRate: rate.value };
}

export async function createMovementAction(formData: FormData) {
  const user = await requireUser();
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
        : currentPeriodAR();
    redirect(`/dashboard/movimientos/nuevo?period=${period}&error=validation`);
  }

  const data = parsed.data;
  if (!data.account_id && !data.credit_card_id) {
    redirect(`/dashboard/movimientos/nuevo?period=${data.period}&error=validation`);
  }
  const amounts = await resolveMovementAmounts(user.id, data);
  if (!amounts) {
    redirect(`/dashboard/movimientos/nuevo?period=${data.period}&error=validation`);
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
      amount_pesos: amounts.amountPesos,
      amount_dollars: amounts.amountDollars,
      payment_date: data.payment_date && data.payment_date !== '' ? data.payment_date : null,
      dollar_rate: amounts.dollarRate,
      comment: data.comment || null,
    },
    user.id,
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
  const user = await requireUser();
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
        : currentPeriodAR();
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
  const amounts = await resolveMovementAmounts(user.id, data);
  if (!amounts) {
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
    amount_pesos: amounts.amountPesos,
    amount_dollars: amounts.amountDollars,
    payment_date: data.payment_date && data.payment_date !== '' ? data.payment_date : null,
    dollar_rate: amounts.dollarRate,
    comment: data.comment || null,
  }, user.id);

  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard');
  redirectWithToast(`/dashboard/movimientos?period=${data.period}`, 'Movimiento actualizado');
}

const deleteMovementFormSchema = z.object({
  id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function deleteMovementAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteMovementFormSchema.safeParse({
    id: formData.get('id'),
    period: formData.get('period'),
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos');
  }

  const { id, period } = parsed.data;
  await deleteMovement(id, user.id);

  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard/gastos-fijos');
  redirectWithToast(`/dashboard/movimientos?period=${period}`, 'Movimiento eliminado');
}
