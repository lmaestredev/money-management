'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAccount } from '@/app/lib/data/accounts';
import type { AccountCurrency } from '@/app/lib/definitions';

const currencySchema = z.enum(['peso', 'dollar', 'crypto']);

const createAccountFormSchema = z.object({
  bank: z.string().min(1, 'Indica el banco o institución'),
  currency: currencySchema,
  balance: z.string().transform((s) => parseFloat(s) || 0),
});

export async function createAccountAction(formData: FormData) {
  const raw = {
    bank: formData.get('bank'),
    currency: formData.get('currency'),
    balance: formData.get('balance'),
  };

  const parsed = createAccountFormSchema.safeParse(raw);
  if (!parsed.success) {
    redirect('/dashboard/cuentas/nueva?error=validation');
  }

  const { bank, currency, balance } = parsed.data;
  const name = `${bank} - ${currency === 'peso' ? 'Pesos' : currency === 'dollar' ? 'Dólares' : 'Cripto'}`;
  await createAccount({
    name,
    bank: bank.trim(),
    currency: currency as AccountCurrency,
    balance_pesos: currency === 'peso' ? balance : 0,
    balance_dollars: currency !== 'peso' ? balance : 0,
  });

  redirect('/dashboard/cuentas');
}
