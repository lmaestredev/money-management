import { sql } from '../db';
import type { Account, AccountCurrency, AccountInsert } from '../definitions';

const CURRENCIES: AccountCurrency[] = ['peso', 'dollar', 'crypto', 'dual'];

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
    owner_id: (row.owner_id as string) ?? null,
    owner_name: (row.owner_name as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchAccounts(): Promise<Account[]> {
  const rows = await sql`
    SELECT a.id, a.name, a.bank, a.currency, a.balance_pesos, a.balance_dollars,
           a.user_id, a.owner_id, p.name AS owner_name, a.created_at, a.updated_at
    FROM accounts a
    LEFT JOIN people p ON p.id = a.owner_id
    ORDER BY a.name ASC
  `;
  return rows.map((r) => rowToAccount(r as Record<string, unknown>));
}

export async function fetchAccountById(id: string): Promise<Account | null> {
  const [row] = await sql`
    SELECT a.id, a.name, a.bank, a.currency, a.balance_pesos, a.balance_dollars,
           a.user_id, a.owner_id, p.name AS owner_name, a.created_at, a.updated_at
    FROM accounts a
    LEFT JOIN people p ON p.id = a.owner_id
    WHERE a.id = ${id}
  `;
  if (!row) return null;
  return rowToAccount(row as Record<string, unknown>);
}

export function getAccountBalance(account: Account): number {
  switch (account.currency) {
    case 'peso':
      return account.balance_pesos;
    case 'dual':
      return account.balance_dollars;
    case 'dollar':
    case 'crypto':
      return account.balance_dollars;
    default:
      return account.balance_pesos;
  }
}

export async function createAccount(data: AccountInsert): Promise<Account> {
  const currency = data.currency ?? 'peso';
  let balancePesos = 0;
  let balanceDollars = 0;
  if (currency === 'dual') {
    balancePesos = data.balance_pesos ?? 0;
    balanceDollars = data.balance_dollars ?? 0;
  } else if (currency === 'peso') {
    balancePesos = data.balance_pesos ?? data.balance_dollars ?? 0;
  } else {
    balanceDollars = data.balance_dollars ?? data.balance_pesos ?? 0;
  }
  const name = data.name.trim() || (data.bank ? `${data.bank} - ${currency}` : currency);

  const [row] = await sql`
    INSERT INTO accounts (name, bank, currency, balance_pesos, balance_dollars, user_id, owner_id)
    VALUES (${name}, ${data.bank ?? null}, ${currency}, ${balancePesos}, ${balanceDollars}, ${data.user_id ?? null}, ${data.owner_id ?? null})
    RETURNING id, name, bank, currency, balance_pesos, balance_dollars, user_id, owner_id, created_at, updated_at
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
  data: AccountUpdate
): Promise<Account | null> {
  const [row] = await sql`
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
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'has_movements' };

/**
 * Elimina una cuenta. Se bloquea si tiene movimientos asociados (no se puede
 * orfanar el historial: movements.account_id es NOT NULL). Las referencias
 * opcionales (compras en cuotas y gastos fijos) se desvinculan.
 */
export async function deleteAccount(id: string): Promise<DeleteAccountResult> {
  return sql.begin(async (tx) => {
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
