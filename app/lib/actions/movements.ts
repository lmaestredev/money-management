'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fetchAccountById } from '@/app/lib/data/accounts';
import { createMovement } from '@/app/lib/data/movements';

const recordTypeSchema = z.enum([
  'income',
  'conversion',
  'variable_payment',
  'fixed_payment',
]);

const createMovementFormSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'),
  record_type: recordTypeSchema,
  account_id: z.string().uuid(),
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
    account_id: formData.get('account_id'),
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
  let amountPesos: number;
  let amountDollars: number;

  if (data.amount != null && data.amount !== '') {
    const amount = parseFloat(data.amount);
    if (Number.isNaN(amount) || amount < 0) {
      const period = data.period;
      redirect(`/dashboard/movimientos/nuevo?period=${period}&error=validation`);
    }
    const account = await fetchAccountById(data.account_id);
    if (!account) {
      const period = data.period;
      redirect(`/dashboard/movimientos/nuevo?period=${period}&error=validation`);
    }
    if (account.currency === 'peso') {
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

  redirect(`/dashboard/movimientos?period=${data.period}`);
}
