import { sql } from '../db';
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
    user_id: (row.user_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchAccounts(): Promise<Account[]> {
  const rows = await sql`
    SELECT id, name, bank, currency, balance_pesos, balance_dollars, user_id, created_at, updated_at
    FROM accounts
    ORDER BY name ASC
  `;
  return rows.map(rowToAccount);
}

export async function fetchAccountById(id: string): Promise<Account | null> {
  const [row] = await sql`
    SELECT id, name, bank, currency, balance_pesos, balance_dollars, user_id, created_at, updated_at
    FROM accounts
    WHERE id = ${id}
  `;
  if (!row) return null;
  return rowToAccount(row as Record<string, unknown>);
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

export async function createAccount(data: AccountInsert): Promise<Account> {
  const currency = data.currency ?? 'peso';
  const balancePesos = currency === 'peso' ? (data.balance_pesos ?? data.balance_dollars ?? 0) : 0;
  const balanceDollars = currency !== 'peso' ? (data.balance_dollars ?? data.balance_pesos ?? 0) : 0;
  const name = data.name.trim() || (data.bank ? `${data.bank} - ${currency}` : currency);

  const [row] = await sql`
    INSERT INTO accounts (name, bank, currency, balance_pesos, balance_dollars, user_id)
    VALUES (${name}, ${data.bank ?? null}, ${currency}, ${balancePesos}, ${balanceDollars}, ${data.user_id ?? null})
    RETURNING id, name, bank, currency, balance_pesos, balance_dollars, user_id, created_at, updated_at
  `;
  return rowToAccount((row ?? {}) as Record<string, unknown>);
}

export async function updateAccountBalances(
  accountId: string,
  deltaPesos: number,
  deltaDollars: number
): Promise<void> {
  await sql`
    UPDATE accounts
    SET 
      balance_pesos = balance_pesos + ${deltaPesos},
      balance_dollars = balance_dollars + ${deltaDollars},
      updated_at = NOW()
    WHERE id = ${accountId}
  `;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const [row] = await sql`
    DELETE FROM accounts WHERE id = ${id}
    RETURNING id
  `;
  return Boolean(row);
}
