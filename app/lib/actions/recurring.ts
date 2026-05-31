'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createRecurringExpense,
  deleteRecurringExpense,
  payRecurringExpense,
} from '@/app/lib/data/recurring';
import { redirectWithToast } from '@/app/lib/toast-redirect';

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
  // Efectivo: la cuenta no se fija al crear; se elige al confirmar el pago.
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
  });

  revalidatePath('/dashboard/gastos-fijos');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/gastos-fijos', 'Gasto fijo creado');
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
  const parsed = payRecurringFormSchema.safeParse({
    recurring_expense_id: formData.get('recurring_expense_id'),
    period: formData.get('period'),
    account_id: formData.get('account_id') ?? undefined,
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos');
  }

  const { recurring_expense_id, period, account_id } = parsed.data;
  await payRecurringExpense(recurring_expense_id, period, account_id);
  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard/gastos-fijos');
  revalidatePath('/dashboard');
  redirectWithToast(`/dashboard/movimientos?period=${period}`, 'Gasto fijo pagado');
}

const deleteRecurringFormSchema = z.object({ id: z.string().uuid() });

export async function deleteRecurringExpenseAction(formData: FormData) {
  const parsed = deleteRecurringFormSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    redirect('/dashboard/gastos-fijos?error=validation');
  }

  let deleted = false;
  try {
    deleted = await deleteRecurringExpense(parsed.data.id);
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
