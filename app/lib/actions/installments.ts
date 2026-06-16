'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createInstallment, deleteInstallment, fetchActiveInstallments, fetchInstallmentPaidIds, payInstallment, updateInstallment } from '@/app/lib/data/installments';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import { revalidateFinancialScreens } from '@/app/lib/revalidate-financial';

const optionalNumber = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((s) => (s && String(s).trim() ? parseFloat(String(s)) : 0));

const createInstallmentFormSchema = z.object({
  name: z.string().min(1),
  account_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  credit_card_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  category_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((s) => (s && String(s).trim() ? s : null)),
  total_installments: z.string(),
  paid_installments: z.string().optional().or(z.literal('')),
  monthly_amount_pesos: optionalNumber,
  monthly_amount_dollars: optionalNumber,
  total_amount_pesos: optionalNumber,
  total_amount_dollars: optionalNumber,
  pay_before_day: z.string().optional().or(z.literal('')),
  start_period: z.string().optional().or(z.literal('')),
});

export async function createInstallmentAction(formData: FormData) {
  const raw = {
    name: formData.get('name') ?? '',
    account_id: formData.get('account_id') ?? undefined,
    credit_card_id: formData.get('credit_card_id') ?? undefined,
    category_id: formData.get('category_id') ?? undefined,
    total_installments: formData.get('total_installments') ?? '',
    paid_installments: formData.get('paid_installments') ?? undefined,
    monthly_amount_pesos: formData.get('monthly_amount_pesos') ?? undefined,
    monthly_amount_dollars: formData.get('monthly_amount_dollars') ?? undefined,
    total_amount_pesos: formData.get('total_amount_pesos') ?? undefined,
    total_amount_dollars: formData.get('total_amount_dollars') ?? undefined,
    pay_before_day: formData.get('pay_before_day') ?? undefined,
    start_period: formData.get('start_period') ?? undefined,
  };

  const parsed = createInstallmentFormSchema.safeParse(raw);
  if (!parsed.success) {
    redirect('/dashboard/cuotas/nueva?error=validation');
  }

  const data = parsed.data;
  const total = parseInt(data.total_installments, 10);
  const paid = data.paid_installments ? parseInt(data.paid_installments, 10) : 0;
  if (Number.isNaN(total) || total < 1 || Number.isNaN(paid) || paid < 0 || paid > total) {
    redirect('/dashboard/cuotas/nueva?error=validation');
  }

  const payBeforeDay = data.pay_before_day ? parseInt(data.pay_before_day, 10) : null;

  // Si no se informa el total, derivarlo de la cuota mensual × cuotas totales.
  const totalPesos = data.total_amount_pesos || data.monthly_amount_pesos * total;
  const totalDollars = data.total_amount_dollars || data.monthly_amount_dollars * total;

  await createInstallment({
    name: data.name.trim(),
    account_id: data.account_id,
    credit_card_id: data.credit_card_id,
    category_id: data.category_id,
    total_installments: total,
    paid_installments: paid,
    monthly_amount_pesos: data.monthly_amount_pesos,
    monthly_amount_dollars: data.monthly_amount_dollars,
    total_amount_pesos: totalPesos,
    total_amount_dollars: totalDollars,
    pay_before_day: payBeforeDay != null && !Number.isNaN(payBeforeDay) ? payBeforeDay : null,
    start_period: data.start_period && /^\d{4}-\d{2}$/.test(data.start_period) ? data.start_period : null,
  });

  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/cuotas', 'Compra en cuotas registrada');
}

const updateInstallmentFormSchema = createInstallmentFormSchema.extend({
  id: z.string().uuid(),
  return_to: z.string().optional(),
});

export async function updateInstallmentAction(formData: FormData) {
  const raw = {
    id: formData.get('id'),
    name: formData.get('name') ?? '',
    account_id: formData.get('account_id') ?? undefined,
    credit_card_id: formData.get('credit_card_id') ?? undefined,
    category_id: formData.get('category_id') ?? undefined,
    total_installments: formData.get('total_installments') ?? '',
    paid_installments: formData.get('paid_installments') ?? undefined,
    monthly_amount_pesos: formData.get('monthly_amount_pesos') ?? undefined,
    monthly_amount_dollars: formData.get('monthly_amount_dollars') ?? undefined,
    total_amount_pesos: formData.get('total_amount_pesos') ?? undefined,
    total_amount_dollars: formData.get('total_amount_dollars') ?? undefined,
    pay_before_day: formData.get('pay_before_day') ?? undefined,
    start_period: formData.get('start_period') ?? undefined,
    return_to: formData.get('return_to') ?? undefined,
  };

  const parsed = updateInstallmentFormSchema.safeParse(raw);
  if (!parsed.success) {
    const id = String(formData.get('id') ?? '');
    redirect(id ? `/dashboard/cuotas/editar/${id}?error=validation` : '/dashboard/cuotas');
  }

  const data = parsed.data;
  const total = parseInt(data.total_installments, 10);
  const paid = data.paid_installments ? parseInt(data.paid_installments, 10) : 0;
  if (Number.isNaN(total) || total < 1 || Number.isNaN(paid) || paid < 0 || paid > total) {
    redirect(`/dashboard/cuotas/editar/${data.id}?error=validation`);
  }

  const payBeforeDay = data.pay_before_day ? parseInt(data.pay_before_day, 10) : null;
  const totalPesos = data.total_amount_pesos || data.monthly_amount_pesos * total;
  const totalDollars = data.total_amount_dollars || data.monthly_amount_dollars * total;

  let updated;
  try {
    updated = await updateInstallment(data.id, {
    name: data.name.trim(),
    account_id: data.account_id,
    credit_card_id: data.credit_card_id,
    category_id: data.category_id,
    total_installments: total,
    paid_installments: paid,
    monthly_amount_pesos: data.monthly_amount_pesos,
    monthly_amount_dollars: data.monthly_amount_dollars,
    total_amount_pesos: totalPesos,
    total_amount_dollars: totalDollars,
    pay_before_day: payBeforeDay != null && !Number.isNaN(payBeforeDay) ? payBeforeDay : null,
    start_period: data.start_period && /^\d{4}-\d{2}$/.test(data.start_period) ? data.start_period : null,
    });
  } catch {
    redirect(`/dashboard/cuotas/editar/${data.id}?error=save`);
  }
  if (!updated) {
    redirect(`/dashboard/cuotas/editar/${data.id}?error=notfound`);
  }

  const returnTo = data.return_to || '/dashboard/cuotas';
  revalidateFinancialScreens();
  redirectWithToast(returnTo, 'Cuota actualizada');
}

const payInstallmentFormSchema = z.object({
  installment_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function payInstallmentAction(formData: FormData) {
  const parsed = payInstallmentFormSchema.safeParse({
    installment_id: formData.get('installment_id'),
    period: formData.get('period'),
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos');
  }

  const { installment_id, period } = parsed.data;
  const currentPeriod = await fetchCurrentPeriod();
  if (!currentPeriod) redirect('/dashboard/movimientos');
  await payInstallment(installment_id, period, currentPeriod.id);
  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard');
  redirectWithToast(`/dashboard/movimientos?period=${period}`, 'Cuota registrada');
}

const payAllInstallmentsFormSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function payAllInstallmentsAction(formData: FormData) {
  const parsed = payAllInstallmentsFormSchema.safeParse({
    period: formData.get('period'),
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos');
  }

  const { period } = parsed.data;
  const currentPeriod = await fetchCurrentPeriod();
  if (!currentPeriod) redirect('/dashboard/movimientos');

  const [activeInstallments, paidIds] = await Promise.all([
    fetchActiveInstallments(),
    fetchInstallmentPaidIds(currentPeriod.id),
  ]);

  const pending = activeInstallments.filter((i) => !paidIds.has(i.id));
  let paidCount = 0;
  for (const inst of pending) {
    const result = await payInstallment(inst.id, period, currentPeriod.id);
    if (result.ok) paidCount++;
  }

  revalidateFinancialScreens();
  const message =
    pending.length === 0
      ? 'No hay cuotas pendientes'
      : paidCount === pending.length
        ? `${paidCount} cuota${paidCount === 1 ? '' : 's'} registrada${paidCount === 1 ? '' : 's'}`
        : `${paidCount} de ${pending.length} cuotas registradas`;
  redirectWithToast(`/dashboard/movimientos?period=${period}`, message);
}

const deleteInstallmentFormSchema = z.object({
  id: z.string().uuid(),
  redirect_to: z.string().optional(),
});

export async function deleteInstallmentAction(formData: FormData) {
  const parsed = deleteInstallmentFormSchema.safeParse({
    id: formData.get('id'),
    redirect_to: formData.get('redirect_to') ?? undefined,
  });
  if (!parsed.success) {
    redirect('/dashboard/cuotas?error=validation');
  }

  const redirectTo = parsed.data.redirect_to || '/dashboard/cuotas';

  let deleted = false;
  try {
    deleted = await deleteInstallment(parsed.data.id);
  } catch {
    redirect(`${redirectTo}?error=delete`);
  }
  if (!deleted) {
    redirect(`${redirectTo}?error=notfound`);
  }

  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard');
  redirectWithToast(redirectTo, 'Compra en cuotas eliminada');
}
