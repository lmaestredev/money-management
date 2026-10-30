import { withAuthenticatedTx } from '../db';
import type { Account, AccountCurrency, AccountInsert } from '../definitions';

const CURRENCIES: AccountCurrency[] = ['peso', 'dollar', 'crypto'];

function rowToAccount(row: Record<string, unknown>): Account {
  const currency = row.currency as string;
  return {
    id: row.id as string,
    name: row.name as string,
    bank: (row.bank as string) ?? null,
    currency: CURRENCIES.includes(currency as AccountCurrency) ? (currency as AccountCurrency) : 'peso',
    balance_pesos: Number(row.balance_pesos),
    balance_dollars: Number(row.balance_dollars),
    user_id: row.user_id as string,
    owner_id: (row.owner_id as string) ?? null,
    owner_name: (row.owner_name as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchAccounts(userId: string): Promise<Account[]> {
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = await tx`
      SELECT a.id, a.name, a.bank, a.currency, a.balance_pesos, a.balance_dollars,
             a.user_id, a.owner_id, p.name AS owner_name, a.created_at, a.updated_at
      FROM accounts a
      LEFT JOIN people p ON p.id = a.owner_id
      ORDER BY a.name ASC
    `;
    return rows.map((r) => rowToAccount(r as Record<string, unknown>));
  });
}

export async function fetchAccountById(id: string, userId: string): Promise<Account | null> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      SELECT a.id, a.name, a.bank, a.currency, a.balance_pesos, a.balance_dollars,
             a.user_id, a.owner_id, p.name AS owner_name, a.created_at, a.updated_at
      FROM accounts a
      LEFT JOIN people p ON p.id = a.owner_id
      WHERE a.id = ${id}
    `;
    if (!row) return null;
    return rowToAccount(row as Record<string, unknown>);
  });
}

export function getAccountBalance(account: Account): number {
  switch (account.currency) {
    case 'peso':
      return account.balance_pesos;
    case 'dollar':
    case 'crypto':
      return account.balance_dollars;
    default:
      return account.balance_pesos;
  }
}

export async function createAccount(data: AccountInsert, userId: string): Promise<Account> {
  const currency = data.currency ?? 'peso';
  const balancePesos = currency === 'peso' ? (data.balance_pesos ?? data.balance_dollars ?? 0) : 0;
  const balanceDollars = currency !== 'peso' ? (data.balance_dollars ?? data.balance_pesos ?? 0) : 0;
  const name = data.name.trim() || (data.bank ? `${data.bank} - ${currency}` : currency);

  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      INSERT INTO accounts (name, bank, currency, balance_pesos, balance_dollars, user_id, owner_id)
      VALUES (${name}, ${data.bank ?? null}, ${currency}, ${balancePesos}, ${balanceDollars}, ${userId}, ${data.owner_id ?? null})
      RETURNING id, name, bank, currency, balance_pesos, balance_dollars, user_id, owner_id, created_at, updated_at
    `;
    return rowToAccount((row ?? {}) as Record<string, unknown>);
  });
}

export async function updateAccountBalances(
  accountId: string,
  deltaPesos: number,
  deltaDollars: number,
  userId: string
): Promise<void> {
  await withAuthenticatedTx(userId, async (tx) => {
    await tx`
      UPDATE accounts
      SET
        balance_pesos = balance_pesos + ${deltaPesos},
        balance_dollars = balance_dollars + ${deltaDollars},
        updated_at = NOW()
      WHERE id = ${accountId}
    `;
  });
}

export type AccountUpdate = {
  name: string;
  bank?: string | null;
  currency: AccountCurrency;
  balance_pesos: number;
  balance_dollars: number;
  owner_id?: string | null;
};

export async function updateAccount(
  id: string,
  data: AccountUpdate,
  userId: string
): Promise<Account | null> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      UPDATE accounts SET
        name = ${data.name},
        bank = ${data.bank ?? null},
        currency = ${data.currency},
        balance_pesos = ${data.balance_pesos},
        balance_dollars = ${data.balance_dollars},
        owner_id = ${data.owner_id ?? null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, bank, currency, balance_pesos, balance_dollars, user_id, owner_id, created_at, updated_at
    `;
    if (!row) return null;
    return rowToAccount(row as Record<string, unknown>);
  });
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'has_movements' };

export async function deleteAccount(id: string, userId: string): Promise<DeleteAccountResult> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [acc] = await tx`SELECT id FROM accounts WHERE id = ${id} FOR UPDATE`;
    if (!acc) return { ok: false, reason: 'not_found' as const };

    const [{ count }] = await tx`
      SELECT COUNT(*)::int AS count FROM movements WHERE account_id = ${id}
    `;
    if (Number(count) > 0) return { ok: false, reason: 'has_movements' as const };

    await tx`UPDATE installment_purchases SET account_id = NULL WHERE account_id = ${id}`;
    await tx`UPDATE recurring_expenses SET account_id = NULL WHERE account_id = ${id}`;
    await tx`DELETE FROM accounts WHERE id = ${id}`;
    return { ok: true as const };
  });
}
