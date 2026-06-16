'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createRecurringIncome,
  deleteRecurringIncome,
  receiveRecurringIncome,
  updateRecurringIncome,
} from '@/app/lib/data/recurring-incomes';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { fetchAccountById } from '@/app/lib/data/accounts';
import { revalidateFinancialScreens } from '@/app/lib/revalidate-financial';
import { normalizeRecurringAmounts } from '@/app/lib/utils/recurring-amounts';
import { redirectWithToast } from '@/app/lib/toast-redirect';

const optionalNumber = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((s) => (s && String(s).trim() ? parseFloat(String(s)) : 0));

const createIncomeFormSchema = z.object({
  name: z.string().min(1),
  category_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  account_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  amount_pesos: optionalNumber,
  amount_dollars: optionalNumber,
  receive_day: z.string().optional().or(z.literal('')),
});

export async function createRecurringIncomeAction(formData: FormData) {
  const parsed = createIncomeFormSchema.safeParse({
    name: formData.get('name') ?? '',
    category_id: formData.get('category_id') ?? undefined,
    account_id: formData.get('account_id') ?? undefined,
    amount_pesos: formData.get('amount_pesos') ?? undefined,
    amount_dollars: formData.get('amount_dollars') ?? undefined,
    receive_day: formData.get('receive_day') ?? undefined,
  });
  if (!parsed.success) {
    redirect('/dashboard/ingresos/nuevo?error=validation');
  }

  const data = parsed.data;
  const receiveDay = data.receive_day ? parseInt(data.receive_day, 10) : null;

  let amounts = { amount_pesos: data.amount_pesos, amount_dollars: data.amount_dollars };
  if (data.account_id) {
    const account = await fetchAccountById(data.account_id);
    amounts = normalizeRecurringAmounts(
      account?.currency,
      data.amount_pesos,
      data.amount_dollars
    );
  }

  await createRecurringIncome({
    name: data.name.trim(),
    category_id: data.category_id,
    account_id: data.account_id,
    amount_pesos: amounts.amount_pesos,
    amount_dollars: amounts.amount_dollars,
    receive_day: receiveDay != null && !Number.isNaN(receiveDay) ? receiveDay : null,
  });

  revalidatePath('/dashboard/ingresos');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/ingresos', 'Ingreso recurrente creado');
}

const updateIncomeFormSchema = createIncomeFormSchema.extend({
  id: z.string().uuid(),
  return_to: z.string().optional(),
});

export async function updateRecurringIncomeAction(formData: FormData) {
  const parsed = updateIncomeFormSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name') ?? '',
    category_id: formData.get('category_id') ?? undefined,
    account_id: formData.get('account_id') ?? undefined,
    amount_pesos: formData.get('amount_pesos') ?? undefined,
    amount_dollars: formData.get('amount_dollars') ?? undefined,
    receive_day: formData.get('receive_day') ?? undefined,
    return_to: formData.get('return_to') ?? undefined,
  });
  if (!parsed.success) {
    const id = String(formData.get('id') ?? '');
    redirect(id ? `/dashboard/ingresos/editar/${id}?error=validation` : '/dashboard/ingresos');
  }

  const data = parsed.data;
  const receiveDay = data.receive_day ? parseInt(data.receive_day, 10) : null;

  let amounts = { amount_pesos: data.amount_pesos, amount_dollars: data.amount_dollars };
  if (data.account_id) {
    const account = await fetchAccountById(data.account_id);
    amounts = normalizeRecurringAmounts(
      account?.currency,
      data.amount_pesos,
      data.amount_dollars
    );
  }

  let updated;
  try {
    updated = await updateRecurringIncome(data.id, {
      name: data.name.trim(),
      category_id: data.category_id,
      account_id: data.account_id,
      amount_pesos: amounts.amount_pesos,
      amount_dollars: amounts.amount_dollars,
      receive_day: receiveDay != null && !Number.isNaN(receiveDay) ? receiveDay : null,
    });
  } catch {
    redirect(`/dashboard/ingresos/editar/${data.id}?error=save`);
  }
  if (!updated) {
    redirect(`/dashboard/ingresos/editar/${data.id}?error=notfound`);
  }

  const returnTo = data.return_to || '/dashboard/ingresos';
  revalidateFinancialScreens();
  redirectWithToast(returnTo, 'Ingreso actualizado');
}

const receiveIncomeFormSchema = z.object({
  recurring_income_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  account_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
});

export async function receiveRecurringIncomeAction(formData: FormData) {
  const parsed = receiveIncomeFormSchema.safeParse({
    recurring_income_id: formData.get('recurring_income_id'),
    period: formData.get('period'),
    account_id: formData.get('account_id') ?? undefined,
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos');
  }

  const { recurring_income_id, period, account_id } = parsed.data;
  const currentPeriod = await fetchCurrentPeriod();
  if (!currentPeriod) redirect('/dashboard/movimientos');
  await receiveRecurringIncome(recurring_income_id, period, currentPeriod.id, account_id);
  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard/ingresos');
  revalidatePath('/dashboard');
  redirectWithToast(`/dashboard/movimientos?period=${period}`, 'Ingreso registrado');
}

const deleteIncomeFormSchema = z.object({
  id: z.string().uuid(),
  redirect_to: z.string().optional(),
});

export async function deleteRecurringIncomeAction(formData: FormData) {
  const parsed = deleteIncomeFormSchema.safeParse({
    id: formData.get('id'),
    redirect_to: formData.get('redirect_to') ?? undefined,
  });
  if (!parsed.success) {
    redirect('/dashboard/ingresos?error=validation');
  }

  const redirectTo = parsed.data.redirect_to || '/dashboard/ingresos';

  let deleted = false;
  try {
    deleted = await deleteRecurringIncome(parsed.data.id);
  } catch {
    redirect(`${redirectTo}?error=delete`);
  }
  if (!deleted) {
    redirect(`${redirectTo}?error=notfound`);
  }

  revalidatePath('/dashboard/ingresos');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/movimientos');
  redirectWithToast(redirectTo, 'Ingreso eliminado');
}
