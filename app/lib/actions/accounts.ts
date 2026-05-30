'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAccount, deleteAccount, updateAccount } from '@/app/lib/data/accounts';
import type { AccountCurrency } from '@/app/lib/definitions';

function buildAccountName(bank: string, currency: AccountCurrency): string {
  const label = currency === 'peso' ? 'Pesos' : currency === 'dollar' ? 'Dólares' : 'Cripto';
  return `${bank} - ${label}`;
}

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
  const name = buildAccountName(bank.trim(), currency as AccountCurrency);
  await createAccount({
    name,
    bank: bank.trim(),
    currency: currency as AccountCurrency,
    balance_pesos: currency === 'peso' ? balance : 0,
    balance_dollars: currency !== 'peso' ? balance : 0,
  });

  redirect('/dashboard/cuentas');
}

const deleteAccountFormSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteAccountAction(formData: FormData) {
  const raw = { id: formData.get('id') };
  const parsed = deleteAccountFormSchema.safeParse(raw);
  if (!parsed.success) {
    redirect('/dashboard/cuentas?error=validation');
  }

  let result: Awaited<ReturnType<typeof deleteAccount>>;
  try {
    result = await deleteAccount(parsed.data.id);
  } catch {
    redirect('/dashboard/cuentas?error=delete');
  }

  if (!result.ok) {
    redirect(
      `/dashboard/cuentas?error=${result.reason === 'has_movements' ? 'has_movements' : 'notfound'}`
    );
  }

  revalidatePath('/dashboard/cuentas');
  revalidatePath('/dashboard');
  redirect('/dashboard/cuentas');
}

const updateAccountFormSchema = z.object({
  id: z.string().uuid(),
  bank: z.string().min(1, 'Indica el banco o institución'),
  currency: currencySchema,
  balance: z.string().transform((s) => parseFloat(s) || 0),
});

export async function updateAccountAction(formData: FormData) {
  const rawId = formData.get('id');
  const parsed = updateAccountFormSchema.safeParse({
    id: rawId,
    bank: formData.get('bank'),
    currency: formData.get('currency'),
    balance: formData.get('balance'),
  });
  if (!parsed.success) {
    const id = typeof rawId === 'string' ? rawId : '';
    redirect(id ? `/dashboard/cuentas/editar/${id}?error=validation` : '/dashboard/cuentas');
  }

  const { id, bank, currency, balance } = parsed.data;
  const cur = currency as AccountCurrency;
  const updated = await updateAccount(id, {
    name: buildAccountName(bank.trim(), cur),
    bank: bank.trim(),
    currency: cur,
    balance_pesos: cur === 'peso' ? balance : 0,
    balance_dollars: cur !== 'peso' ? balance : 0,
  });
  if (!updated) {
    redirect('/dashboard/cuentas?error=notfound');
  }

  revalidatePath('/dashboard/cuentas');
  revalidatePath('/dashboard');
  redirect('/dashboard/cuentas');
}
