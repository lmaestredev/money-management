'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  createRecurringExpense,
  deleteRecurringExpense,
  payRecurringExpense,
  updateRecurringExpense,
} from '@/app/lib/data/recurring';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { fetchAccountById } from '@/app/lib/data/accounts';
import { revalidateFinancialScreens } from '@/app/lib/revalidate-financial';
import { normalizeRecurringAmounts } from '@/app/lib/utils/recurring-amounts';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import { optionalNumber, safeDashboardPath } from '@/app/lib/utils/zod-form';

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

  revalidateFinancialScreens();
  redirectWithToast('/dashboard/gastos-fijos', 'Gasto fijo creado');
}

const updateRecurringFormSchema = createRecurringFormSchema.extend({
  id: z.string().uuid(),
  return_to: z.string().optional(),
});

export async function updateRecurringExpenseAction(formData: FormData) {
  const raw = {
    id: formData.get('id'),
    name: formData.get('name') ?? '',
    category_id: formData.get('category_id') ?? undefined,
    account_id: formData.get('account_id') ?? undefined,
    credit_card_id: formData.get('credit_card_id') ?? undefined,
    amount_pesos: formData.get('amount_pesos') ?? undefined,
    amount_dollars: formData.get('amount_dollars') ?? undefined,
    pay_before_day: formData.get('pay_before_day') ?? undefined,
    return_to: formData.get('return_to') ?? undefined,
  };
  const parsed = updateRecurringFormSchema.safeParse(raw);
  if (!parsed.success) {
    const id = String(formData.get('id') ?? '');
    redirect(id ? `/dashboard/gastos-fijos/editar/${id}?error=validation` : '/dashboard/gastos-fijos');
  }

  const data = parsed.data;
  const payBeforeDay = data.pay_before_day ? parseInt(data.pay_before_day, 10) : null;
  const isCash = formData.get('is_cash') === 'true';

  let amounts = { amount_pesos: data.amount_pesos, amount_dollars: data.amount_dollars };
  const accountId = isCash ? null : data.account_id;
  if (accountId) {
    const account = await fetchAccountById(accountId);
    amounts = normalizeRecurringAmounts(
      account?.currency,
      data.amount_pesos,
      data.amount_dollars
    );
  }

  let updated;
  try {
    updated = await updateRecurringExpense(data.id, {
      name: data.name.trim(),
      category_id: data.category_id,
      account_id: accountId,
      credit_card_id: isCash ? null : data.credit_card_id,
      amount_pesos: amounts.amount_pesos,
      amount_dollars: amounts.amount_dollars,
      pay_before_day: payBeforeDay != null && !Number.isNaN(payBeforeDay) ? payBeforeDay : null,
      is_cash: isCash,
    });
  } catch {
    redirect(`/dashboard/gastos-fijos/editar/${data.id}?error=save`);
  }
  if (!updated) {
    redirect(`/dashboard/gastos-fijos/editar/${data.id}?error=notfound`);
  }

  const returnTo = safeDashboardPath(data.return_to, '/dashboard/gastos-fijos');
  revalidateFinancialScreens();
  redirectWithToast(returnTo, 'Gasto fijo actualizado');
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
  const currentPeriod = await fetchCurrentPeriod();
  if (!currentPeriod) redirect('/dashboard/movimientos');
  await payRecurringExpense(recurring_expense_id, period, currentPeriod.id, account_id);
  revalidateFinancialScreens();
  redirectWithToast(`/dashboard/movimientos?period=${period}`, 'Gasto fijo pagado');
}

const deleteRecurringFormSchema = z.object({
  id: z.string().uuid(),
  redirect_to: z.string().optional(),
});

export async function deleteRecurringExpenseAction(formData: FormData) {
  const parsed = deleteRecurringFormSchema.safeParse({
    id: formData.get('id'),
    redirect_to: formData.get('redirect_to') ?? undefined,
  });
  if (!parsed.success) {
    redirect('/dashboard/gastos-fijos?error=validation');
  }

  const redirectTo = safeDashboardPath(parsed.data.redirect_to, '/dashboard/gastos-fijos');

  let deleted = false;
  try {
    deleted = await deleteRecurringExpense(parsed.data.id);
  } catch {
    redirect(`${redirectTo}?error=delete`);
  }
  if (!deleted) {
    redirect(`${redirectTo}?error=notfound`);
  }

  revalidateFinancialScreens();
  redirectWithToast(redirectTo, 'Gasto fijo eliminado');
}
