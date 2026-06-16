'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAccount, deleteAccount, updateAccount } from '@/app/lib/data/accounts';
import { redirectWithToast } from '@/app/lib/toast-redirect';
import type { AccountCurrency } from '@/app/lib/definitions';

function buildAccountName(bank: string, currency: AccountCurrency): string {
  const label =
    currency === 'peso'
      ? 'Pesos'
      : currency === 'dollar'
        ? 'Dólares'
        : currency === 'dual'
          ? 'Pesos y dólares'
          : 'Cripto';
  return `${bank} - ${label}`;
}

const currencySchema = z.enum(['peso', 'dollar', 'crypto', 'dual']);

const optionalNumber = z.preprocess(
  (v) => (v == null || v === '' ? undefined : String(v)),
  z
    .string()
    .optional()
    .transform((s) => (s && String(s).trim() ? parseFloat(String(s)) : 0))
);

const ownerSchema = z
  .union([z.string().uuid(), z.literal('')])
  .optional()
  .transform((v) => (v ? v : null));

const createAccountFormSchema = z.object({
  bank: z.string().min(1, 'Indica el banco o institución'),
  currency: currencySchema,
  balance: optionalNumber,
  balance_pesos: optionalNumber,
  balance_dollars: optionalNumber,
  owner_id: ownerSchema,
});

export async function createAccountAction(formData: FormData) {
  const raw = {
    bank: formData.get('bank'),
    currency: formData.get('currency'),
    balance: formData.get('balance'),
    balance_pesos: formData.get('balance_pesos'),
    balance_dollars: formData.get('balance_dollars'),
    owner_id: formData.get('owner_id'),
  };

  const parsed = createAccountFormSchema.safeParse(raw);
  if (!parsed.success) {
    redirect('/dashboard/cuentas/nueva?error=validation');
  }

  const { bank, currency, balance, balance_pesos, balance_dollars, owner_id } = parsed.data;
  const cur = currency as AccountCurrency;
  const name = buildAccountName(bank.trim(), cur);

  await createAccount({
    name,
    bank: bank.trim(),
    currency: cur,
    balance_pesos: cur === 'dual' ? balance_pesos : cur === 'peso' ? balance : 0,
    balance_dollars: cur === 'dual' ? balance_dollars : cur !== 'peso' ? balance : 0,
    owner_id,
  });

  revalidatePath('/dashboard/cuentas');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/cuentas', 'Cuenta creada');
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
  redirectWithToast('/dashboard/cuentas', 'Cuenta eliminada');
}

const updateAccountFormSchema = z.object({
  id: z.string().uuid(),
  bank: z.string().min(1, 'Indica el banco o institución'),
  currency: currencySchema,
  balance: optionalNumber,
  balance_pesos: optionalNumber,
  balance_dollars: optionalNumber,
  owner_id: ownerSchema,
});

export async function updateAccountAction(formData: FormData) {
  const rawId = formData.get('id');
  const parsed = updateAccountFormSchema.safeParse({
    id: rawId,
    bank: formData.get('bank'),
    currency: formData.get('currency'),
    balance: formData.get('balance'),
    balance_pesos: formData.get('balance_pesos'),
    balance_dollars: formData.get('balance_dollars'),
    owner_id: formData.get('owner_id'),
  });
  if (!parsed.success) {
    const id = typeof rawId === 'string' ? rawId : '';
    redirect(id ? `/dashboard/cuentas/editar/${id}?error=validation` : '/dashboard/cuentas');
  }

  const { id, bank, currency, balance, balance_pesos, balance_dollars, owner_id } = parsed.data;
  const cur = currency as AccountCurrency;
  const updated = await updateAccount(id, {
    name: buildAccountName(bank.trim(), cur),
    bank: bank.trim(),
    currency: cur,
    balance_pesos: cur === 'dual' ? balance_pesos : cur === 'peso' ? balance : 0,
    balance_dollars: cur === 'dual' ? balance_dollars : cur !== 'peso' ? balance : 0,
    owner_id,
  });
  if (!updated) {
    redirect('/dashboard/cuentas?error=notfound');
  }

  revalidatePath('/dashboard/cuentas');
  revalidatePath('/dashboard');
  redirectWithToast('/dashboard/cuentas', 'Cuenta actualizada');
}
