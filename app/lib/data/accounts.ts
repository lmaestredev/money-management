import { sql } from '../db';
import type { Account } from '../definitions';

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    name: row.name as string,
    balance_pesos: Number(row.balance_pesos),
    balance_dollars: Number(row.balance_dollars),
    user_id: (row.user_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchAccounts(): Promise<Account[]> {
  const rows = await sql`
    SELECT id, name, balance_pesos, balance_dollars, user_id, created_at, updated_at
    FROM accounts
    ORDER BY name ASC
  `;
  return rows.map(rowToAccount);
}

export async function fetchAccountById(id: string): Promise<Account | null> {
  const [row] = await sql`
    SELECT id, name, balance_pesos, balance_dollars, user_id, created_at, updated_at
    FROM accounts
    WHERE id = ${id}
  `;
  if (!row) return null;
  return rowToAccount(row as Record<string, unknown>);
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
