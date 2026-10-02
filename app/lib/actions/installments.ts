'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  completeInstallment,
  createInstallment,
  deleteInstallment,
  payInstallment,
  updateInstallment,
  type PayInstallmentResult,
} from '@/app/lib/data/installments';
import { ensureCurrentPeriod } from '@/app/lib/data/financial-periods';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import { createClient } from '@/app/lib/supabase/server';
import { installmentScheduleFields, refineInstallment } from '@/app/lib/validation';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

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
  ...installmentScheduleFields,
}).superRefine(refineInstallment);

export async function createInstallmentAction(formData: FormData) {
  const user = await requireUser();
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
  const total = data.total_installments;
  const paid = data.paid_installments;

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
    pay_before_day: data.pay_before_day,
    start_period: data.start_period,
  }, user.id);

  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/cuotas', 'Compra en cuotas registrada');
}

const updateInstallmentFormSchema = z.object({
  id: z.string().uuid(),
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
  ...installmentScheduleFields,
}).superRefine(refineInstallment);

export async function updateInstallmentAction(formData: FormData) {
  const user = await requireUser();
  const rawId = formData.get('id');
  const parsed = updateInstallmentFormSchema.safeParse({
    id: rawId,
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
  });
  const editPath = (id: string) => `/dashboard/cuotas/editar/${id}`;
  if (!parsed.success) {
    const id = typeof rawId === 'string' ? rawId : '';
    redirect(id ? `${editPath(id)}?error=validation` : '/dashboard/cuotas');
  }

  const data = parsed.data;
  const total = data.total_installments;
  const paid = data.paid_installments;
  const totalPesos = data.total_amount_pesos || data.monthly_amount_pesos * total;
  const totalDollars = data.total_amount_dollars || data.monthly_amount_dollars * total;

  const updated = await updateInstallment(data.id, {
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
    pay_before_day: data.pay_before_day,
    start_period: data.start_period,
  }, user.id);
  if (!updated) {
    redirect('/dashboard/cuotas?error=notfound');
  }

  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/movimientos');
  redirectWithToast('/dashboard/cuotas', 'Compra en cuotas actualizada');
}

const payInstallmentFormSchema = z.object({
  installment_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function payInstallmentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = payInstallmentFormSchema.safeParse({
    installment_id: formData.get('installment_id'),
    period: formData.get('period'),
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos');
  }

  const { installment_id, period } = parsed.data;
  const currentPeriod = await ensureCurrentPeriod(user.id);

  // Idempotente: si la cuota de este período ya estaba registrada (p. ej. un
  // doble click mandó dos submits), no se crea un segundo movimiento; se
  // informa el estado real en vez de fingir un nuevo registro.
  const result = await payInstallment(installment_id, period, currentPeriod.id, user.id);
  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard');

  const redirectPath = `/dashboard/movimientos?period=${period}`;
  if (result.ok) {
    redirectWithToast(redirectPath, 'Cuota registrada');
  }

  type FailureReason = Extract<PayInstallmentResult, { ok: false }>['reason'];
  const messages: Record<FailureReason, string> = {
    already_paid: 'Esa cuota ya estaba registrada',
    completed: 'Esta compra ya está pagada por completo',
    no_account: 'Asigná una cuenta o tarjeta a la compra antes de registrar el pago',
    not_found: 'La compra en cuotas no existe o ya fue eliminada',
  };
  const isError = result.reason === 'no_account' || result.reason === 'not_found';
  redirectWithToast(redirectPath, messages[result.reason], isError ? 'error' : 'success');
}

const completeInstallmentFormSchema = z.object({
  installment_id: z.string().uuid(),
});

export async function completeInstallmentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = completeInstallmentFormSchema.safeParse({
    installment_id: formData.get('installment_id'),
  });
  if (!parsed.success) {
    redirect('/dashboard/cuotas?error=validation');
  }

  const result = await completeInstallment(parsed.data.installment_id, user.id);
  if (!result.ok) {
    redirect(
      `/dashboard/cuotas?error=${result.reason === 'not_found' ? 'notfound' : 'already_finished'}`
    );
  }

  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/cuotas', 'Compra marcada como pagada por completo');
}

const deleteInstallmentFormSchema = z.object({ id: z.string().uuid() });

export async function deleteInstallmentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteInstallmentFormSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    redirect('/dashboard/cuotas?error=validation');
  }

  let deleted = false;
  try {
    deleted = await deleteInstallment(parsed.data.id, user.id);
  } catch {
    redirect('/dashboard/cuotas?error=delete');
  }
  if (!deleted) {
    redirect('/dashboard/cuotas?error=notfound');
  }

  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/movimientos');
  redirectWithToast('/dashboard/cuotas', 'Compra en cuotas eliminada');
}
