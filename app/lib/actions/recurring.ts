'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createRecurringExpense,
  deleteRecurringExpense,
  payRecurringExpense,
  updateRecurringExpense,
  type PayRecurringResult,
} from '@/app/lib/data/recurring';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import { createClient } from '@/app/lib/supabase/server';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

const optionalNumber = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((s) => (s && String(s).trim() ? parseFloat(String(s)) : 0));

const createRecurringFormSchema = z.object({
  name: z.string().min(1),
  category_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  account_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  credit_card_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  amount_pesos: optionalNumber,
  amount_dollars: optionalNumber,
  pay_before_day: z.string().optional().or(z.literal('')),
});

export async function createRecurringExpenseAction(formData: FormData) {
  const user = await requireUser();
  const raw = {
    name: formData.get('name') ?? '',
    category_id: formData.get('category_id') ?? undefined,
    account_id: formData.get('account_id') ?? undefined,
    credit_card_id: formData.get('credit_card_id') ?? undefined,
    amount_pesos: formData.get('amount_pesos') ?? undefined,
    amount_dollars: formData.get('amount_dollars') ?? undefined,
    pay_before_day: formData.get('pay_before_day') ?? undefined,
  };

  const parsed = createRecurringFormSchema.safeParse(raw);
  if (!parsed.success) {
    redirect('/dashboard/gastos-fijos/nuevo?error=validation');
  }

  const data = parsed.data;
  const payBeforeDay = data.pay_before_day ? parseInt(data.pay_before_day, 10) : null;
  const isCash = formData.get('is_cash') === 'true';

  await createRecurringExpense({
    name: data.name.trim(),
    category_id: data.category_id,
    account_id: isCash ? null : data.account_id,
    credit_card_id: isCash ? null : data.credit_card_id,
    amount_pesos: data.amount_pesos,
    amount_dollars: data.amount_dollars,
    pay_before_day: payBeforeDay != null && !Number.isNaN(payBeforeDay) ? payBeforeDay : null,
    is_cash: isCash,
  }, user.id);

  revalidatePath('/dashboard/gastos-fijos');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/gastos-fijos', 'Gasto fijo creado');
}

const updateRecurringFormSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  category_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  account_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  credit_card_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  amount_pesos: optionalNumber,
  amount_dollars: optionalNumber,
  pay_before_day: z.string().optional().or(z.literal('')),
});

export async function updateRecurringExpenseAction(formData: FormData) {
  const user = await requireUser();
  const rawId = formData.get('id');
  const parsed = updateRecurringFormSchema.safeParse({
    id: rawId,
    name: formData.get('name') ?? '',
    category_id: formData.get('category_id') ?? undefined,
    account_id: formData.get('account_id') ?? undefined,
    credit_card_id: formData.get('credit_card_id') ?? undefined,
    amount_pesos: formData.get('amount_pesos') ?? undefined,
    amount_dollars: formData.get('amount_dollars') ?? undefined,
    pay_before_day: formData.get('pay_before_day') ?? undefined,
  });
  const editPath = (id: string) => `/dashboard/gastos-fijos/editar/${id}`;
  if (!parsed.success) {
    const id = typeof rawId === 'string' ? rawId : '';
    redirect(id ? `${editPath(id)}?error=validation` : '/dashboard/gastos-fijos');
  }

  const data = parsed.data;
  const payBeforeDay = data.pay_before_day ? parseInt(data.pay_before_day, 10) : null;
  const isCash = formData.get('is_cash') === 'true';

  const updated = await updateRecurringExpense(data.id, {
    name: data.name.trim(),
    category_id: data.category_id,
    account_id: isCash ? null : data.account_id,
    credit_card_id: isCash ? null : data.credit_card_id,
    amount_pesos: data.amount_pesos,
    amount_dollars: data.amount_dollars,
    pay_before_day: payBeforeDay != null && !Number.isNaN(payBeforeDay) ? payBeforeDay : null,
    is_cash: isCash,
  }, user.id);
  if (!updated) {
    redirect('/dashboard/gastos-fijos?error=notfound');
  }

  revalidatePath('/dashboard/gastos-fijos');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/movimientos');
  redirectWithToast('/dashboard/gastos-fijos', 'Gasto fijo actualizado');
}

const payRecurringFormSchema = z.object({
  recurring_expense_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  account_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
});

export async function payRecurringExpenseAction(formData: FormData) {
  const user = await requireUser();
  const parsed = payRecurringFormSchema.safeParse({
    recurring_expense_id: formData.get('recurring_expense_id'),
    period: formData.get('period'),
    account_id: formData.get('account_id') ?? undefined,
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos');
  }

  const { recurring_expense_id, period, account_id } = parsed.data;
  const currentPeriod = await fetchCurrentPeriod(user.id);
  if (!currentPeriod) redirect('/dashboard/movimientos');

  // Idempotente: si el gasto de este período ya estaba pagado (p. ej. un
  // doble click mandó dos submits), no se crea un segundo movimiento; se
  // informa el estado real en vez de fingir un nuevo pago.
  const result = await payRecurringExpense(recurring_expense_id, period, currentPeriod.id, user.id, account_id);
  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard/gastos-fijos');
  revalidatePath('/dashboard');

  const redirectPath = `/dashboard/movimientos?period=${period}`;
  if (result.ok) {
    redirectWithToast(redirectPath, 'Gasto fijo pagado');
  }

  type FailureReason = Extract<PayRecurringResult, { ok: false }>['reason'];
  const messages: Record<FailureReason, string> = {
    already_paid: 'Ese gasto ya estaba pagado',
    inactive: 'Este gasto fijo está inactivo',
    no_account: 'Asigná una cuenta o tarjeta antes de registrar el pago',
    not_found: 'El gasto fijo no existe o ya fue eliminado',
  };
  const isError = result.reason === 'no_account' || result.reason === 'not_found' || result.reason === 'inactive';
  redirectWithToast(redirectPath, messages[result.reason], isError ? 'error' : 'success');
}

const deleteRecurringFormSchema = z.object({ id: z.string().uuid() });

export async function deleteRecurringExpenseAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteRecurringFormSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    redirect('/dashboard/gastos-fijos?error=validation');
  }

  let deleted = false;
  try {
    deleted = await deleteRecurringExpense(parsed.data.id, user.id);
  } catch {
    redirect('/dashboard/gastos-fijos?error=delete');
  }
  if (!deleted) {
    redirect('/dashboard/gastos-fijos?error=notfound');
  }

  revalidatePath('/dashboard/gastos-fijos');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/movimientos');
  redirectWithToast('/dashboard/gastos-fijos', 'Gasto fijo eliminado');
}
