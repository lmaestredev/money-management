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
import { ensureCurrentPeriod } from '@/app/lib/data/financial-periods';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import { createClient } from '@/app/lib/supabase/server';
import { formAmount, formOptionalDay, refineOneCurrency } from '@/app/lib/validation';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

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
  amount_pesos: formAmount,
  amount_dollars: formAmount,
  receive_day: formOptionalDay,
}).superRefine((d, ctx) => refineOneCurrency(d.amount_pesos, d.amount_dollars, 'amount_pesos', ctx));

export async function createRecurringIncomeAction(formData: FormData) {
  const user = await requireUser();
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

  await createRecurringIncome({
    name: data.name.trim(),
    category_id: data.category_id,
    account_id: data.account_id,
    amount_pesos: data.amount_pesos,
    amount_dollars: data.amount_dollars,
    receive_day: data.receive_day,
  }, user.id);

  revalidatePath('/dashboard/ingresos');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/ingresos', 'Ingreso recurrente creado');
}

const updateIncomeFormSchema = z.object({
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
  amount_pesos: formAmount,
  amount_dollars: formAmount,
  receive_day: formOptionalDay,
}).superRefine((d, ctx) => refineOneCurrency(d.amount_pesos, d.amount_dollars, 'amount_pesos', ctx));

export async function updateRecurringIncomeAction(formData: FormData) {
  const user = await requireUser();
  const rawId = formData.get('id');
  const parsed = updateIncomeFormSchema.safeParse({
    id: rawId,
    name: formData.get('name') ?? '',
    category_id: formData.get('category_id') ?? undefined,
    account_id: formData.get('account_id') ?? undefined,
    amount_pesos: formData.get('amount_pesos') ?? undefined,
    amount_dollars: formData.get('amount_dollars') ?? undefined,
    receive_day: formData.get('receive_day') ?? undefined,
  });
  if (!parsed.success) {
    const id = typeof rawId === 'string' ? rawId : '';
    redirect(id ? `/dashboard/ingresos/editar/${id}?error=validation` : '/dashboard/ingresos');
  }

  const data = parsed.data;

  const updated = await updateRecurringIncome(data.id, {
    name: data.name.trim(),
    category_id: data.category_id,
    account_id: data.account_id,
    amount_pesos: data.amount_pesos,
    amount_dollars: data.amount_dollars,
    receive_day: data.receive_day,
  }, user.id);
  if (!updated) {
    redirect('/dashboard/ingresos?error=notfound');
  }

  revalidatePath('/dashboard/ingresos');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/ingresos', 'Ingreso actualizado');
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
  const user = await requireUser();
  const parsed = receiveIncomeFormSchema.safeParse({
    recurring_income_id: formData.get('recurring_income_id'),
    period: formData.get('period'),
    account_id: formData.get('account_id') ?? undefined,
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos');
  }

  const { recurring_income_id, period, account_id } = parsed.data;
  const currentPeriod = await ensureCurrentPeriod(user.id);
  await receiveRecurringIncome(recurring_income_id, period, currentPeriod.id, user.id, account_id);
  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard/ingresos');
  revalidatePath('/dashboard');
  redirectWithToast(`/dashboard/movimientos?period=${period}`, 'Ingreso registrado');
}

const deleteIncomeFormSchema = z.object({ id: z.string().uuid() });

export async function deleteRecurringIncomeAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteIncomeFormSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    redirect('/dashboard/ingresos?error=validation');
  }

  let deleted = false;
  try {
    deleted = await deleteRecurringIncome(parsed.data.id, user.id);
  } catch {
    redirect('/dashboard/ingresos?error=delete');
  }
  if (!deleted) {
    redirect('/dashboard/ingresos?error=notfound');
  }

  revalidatePath('/dashboard/ingresos');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/movimientos');
  redirectWithToast('/dashboard/ingresos', 'Ingreso eliminado');
}
