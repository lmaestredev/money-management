'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createCreditCard,
  deleteCreditCard,
  payStatement,
  setCardStatementTotal,
  updateCreditCard,
} from '@/app/lib/data/credit-cards';
import { fetchActiveInstallments } from '@/app/lib/data/installments';
import { getCardMonthlyInstallmentFloor } from '@/app/lib/utils/card-totals';
import { revalidateFinancialScreens } from '@/app/lib/revalidate-financial';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import type { AccountCurrency, CardBrand } from '@/app/lib/definitions';

const currencySchema = z.enum(['peso', 'dollar', 'crypto']);
const brandSchema = z
  .union([z.enum(['visa', 'mastercard', 'amex', 'otra']), z.literal('')])
  .optional()
  .transform((v) => (v ? (v as CardBrand) : null));

// El select de dueño envía un UUID o '' (compartida / sin asignar) -> null.
const ownerSchema = z
  .union([z.string().uuid(), z.literal('')])
  .optional()
  .transform((v) => (v ? v : null));

// Día del mes 1–31 o '' -> null.
const daySchema = z
  .union([z.string(), z.literal('')])
  .optional()
  .transform((v) => {
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 1 && n <= 31 ? n : null;
  });

const cardFormSchema = z.object({
  name: z.string().min(1, 'Indica un nombre para la tarjeta'),
  bank: z.string().optional().transform((v) => (v?.trim() ? v.trim() : null)),
  brand: brandSchema,
  currency: currencySchema,
  credit_limit: z.string().optional().transform((s) => parseFloat(s ?? '') || 0),
  closing_day: daySchema,
  due_day: daySchema,
  owner_id: ownerSchema,
});

export async function createCreditCardAction(formData: FormData) {
  const parsed = cardFormSchema.safeParse({
    name: formData.get('name'),
    bank: formData.get('bank'),
    brand: formData.get('brand'),
    currency: formData.get('currency'),
    credit_limit: formData.get('credit_limit'),
    closing_day: formData.get('closing_day'),
    due_day: formData.get('due_day'),
    owner_id: formData.get('owner_id'),
  });
  if (!parsed.success) {
    redirect('/dashboard/tarjetas/nueva?error=validation');
  }

  const d = parsed.data;
  await createCreditCard({
    name: d.name.trim(),
    bank: d.bank,
    brand: d.brand,
    currency: d.currency as AccountCurrency,
    credit_limit: d.credit_limit,
    closing_day: d.closing_day,
    due_day: d.due_day,
    owner_id: d.owner_id,
  });

  revalidatePath('/dashboard/tarjetas');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/tarjetas', 'Tarjeta creada');
}

const updateCardFormSchema = cardFormSchema.extend({
  id: z.string().uuid(),
  active: z
    .union([z.literal('true'), z.literal('false'), z.literal('')])
    .optional()
    .transform((v) => v !== 'false'),
});

export async function updateCreditCardAction(formData: FormData) {
  const rawId = formData.get('id');
  const parsed = updateCardFormSchema.safeParse({
    id: rawId,
    name: formData.get('name'),
    bank: formData.get('bank'),
    brand: formData.get('brand'),
    currency: formData.get('currency'),
    credit_limit: formData.get('credit_limit'),
    closing_day: formData.get('closing_day'),
    due_day: formData.get('due_day'),
    owner_id: formData.get('owner_id'),
    active: formData.get('active'),
  });
  if (!parsed.success) {
    const id = typeof rawId === 'string' ? rawId : '';
    redirect(id ? `/dashboard/tarjetas/editar/${id}?error=validation` : '/dashboard/tarjetas');
  }

  const d = parsed.data;
  const updated = await updateCreditCard(d.id, {
    name: d.name.trim(),
    bank: d.bank,
    brand: d.brand,
    currency: d.currency as AccountCurrency,
    credit_limit: d.credit_limit,
    closing_day: d.closing_day,
    due_day: d.due_day,
    owner_id: d.owner_id,
    active: d.active,
  });
  if (!updated) {
    redirect('/dashboard/tarjetas?error=notfound');
  }

  revalidatePath('/dashboard/tarjetas');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/tarjetas', 'Tarjeta actualizada');
}

const deleteCardFormSchema = z.object({ id: z.string().uuid() });

export async function deleteCreditCardAction(formData: FormData) {
  const parsed = deleteCardFormSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    redirect('/dashboard/tarjetas?error=validation');
  }

  let result: Awaited<ReturnType<typeof deleteCreditCard>>;
  try {
    result = await deleteCreditCard(parsed.data.id);
  } catch {
    redirect('/dashboard/tarjetas?error=delete');
  }

  if (!result.ok) {
    redirect(
      `/dashboard/tarjetas?error=${result.reason === 'has_movements' ? 'has_movements' : 'notfound'}`
    );
  }

  revalidatePath('/dashboard/tarjetas');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/tarjetas', 'Tarjeta eliminada');
}

const payStatementFormSchema = z.object({
  statement_id: z.string().uuid(),
  account_id: z.string().uuid(),
});

export async function payStatementAction(formData: FormData) {
  const parsed = payStatementFormSchema.safeParse({
    statement_id: formData.get('statement_id'),
    account_id: formData.get('account_id'),
  });
  if (!parsed.success) {
    redirect('/dashboard/tarjetas?error=validation');
  }

  const result = await payStatement(parsed.data.statement_id, parsed.data.account_id);
  if (!result.ok) {
    redirect(`/dashboard/tarjetas?error=${result.reason}`);
  }

  revalidateFinancialScreens();
  redirectWithToast('/dashboard/tarjetas', 'Resumen pagado');
}

const setCardTotalFormSchema = z.object({
  card_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  total_pesos: z.string(),
  total_dollars: z.string().optional().or(z.literal('')),
});

export async function setCardStatementTotalAction(formData: FormData) {
  const parsed = setCardTotalFormSchema.safeParse({
    card_id: formData.get('card_id'),
    period: formData.get('period'),
    total_pesos: formData.get('total_pesos') ?? '',
    total_dollars: formData.get('total_dollars') ?? '',
  });
  if (!parsed.success) {
    redirect('/dashboard/movimientos?error=validation');
  }

  const { card_id, period } = parsed.data;
  const totalPesos = parseFloat(parsed.data.total_pesos);
  const totalDollars = parseFloat(parsed.data.total_dollars || '0');
  if (Number.isNaN(totalPesos) || Number.isNaN(totalDollars) || totalPesos < 0 || totalDollars < 0) {
    redirect(`/dashboard/movimientos?period=${period}&error=validation`);
  }

  const installments = await fetchActiveInstallments();
  const floor = getCardMonthlyInstallmentFloor(card_id, installments);

  const result = await setCardStatementTotal(
    card_id,
    totalPesos,
    totalDollars,
    floor.pesos,
    floor.dollars
  );

  if (!result.ok) {
    const err =
      result.reason === 'below_cuota_minimum' ? 'below_cuota_minimum' : result.reason;
    redirect(`/dashboard/movimientos?period=${period}&error=${err}`);
  }

  revalidateFinancialScreens();
  redirectWithToast(`/dashboard/movimientos?period=${period}`, 'Total de tarjeta actualizado');
}
