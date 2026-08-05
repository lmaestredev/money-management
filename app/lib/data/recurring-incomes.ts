import { sql, withAuthenticatedTx } from '../db';
import { getBalanceDeltas } from './movements';
import type { RecurringIncome, RecurringIncomeInsert, RecurringIncomeUpdate } from '../definitions';

function rowToRecurringIncome(row: Record<string, unknown>): RecurringIncome {
  return {
    id: row.id as string,
    name: row.name as string,
    category_id: (row.category_id as string) ?? null,
    category_name: (row.category_name as string) ?? null,
    account_id: (row.account_id as string) ?? null,
    account_name: (row.account_name as string) ?? null,
    amount_pesos: Number(row.amount_pesos),
    amount_dollars: Number(row.amount_dollars),
    receive_day: row.receive_day != null ? Number(row.receive_day) : null,
    active: Boolean(row.active),
    user_id: row.user_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

const SELECT_COLUMNS = sql`
  r.id, r.name, r.category_id, c.name AS category_name,
  r.account_id, a.name AS account_name,
  r.amount_pesos, r.amount_dollars, r.receive_day, r.active,
  r.user_id, r.created_at, r.updated_at
`;

export async function fetchRecurringIncomes(userId: string): Promise<RecurringIncome[]> {
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = await tx`
      SELECT ${SELECT_COLUMNS}
      FROM recurring_incomes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      ORDER BY r.active DESC, r.name ASC
    `;
    return rows.map((r) => rowToRecurringIncome(r as Record<string, unknown>));
  });
}

export async function fetchActiveRecurringIncomes(userId: string): Promise<RecurringIncome[]> {
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = await tx`
      SELECT ${SELECT_COLUMNS}
      FROM recurring_incomes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.active = true
      ORDER BY r.name ASC
    `;
    return rows.map((r) => rowToRecurringIncome(r as Record<string, unknown>));
  });
}

export async function fetchRecurringIncomeById(id: string, userId: string): Promise<RecurringIncome | null> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      SELECT ${SELECT_COLUMNS}
      FROM recurring_incomes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.id = ${id}
    `;
    if (!row) return null;
    return rowToRecurringIncome(row as Record<string, unknown>);
  });
}

export async function fetchRecurringIncomeReceivedIds(financialPeriodId: string, userId: string): Promise<Set<string>> {
  if (!financialPeriodId) return new Set();
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = (await tx`
      SELECT DISTINCT recurring_income_id
      FROM movements
      WHERE financial_period_id = ${financialPeriodId} AND recurring_income_id IS NOT NULL
    `) as { recurring_income_id: string }[];
    return new Set(rows.map((r) => r.recurring_income_id));
  });
}

export async function createRecurringIncome(
  data: RecurringIncomeInsert,
  userId: string
): Promise<RecurringIncome> {
  const insertedId = await withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      INSERT INTO recurring_incomes (
        name, category_id, account_id, amount_pesos, amount_dollars,
        receive_day, active, user_id
      )
      VALUES (
        ${data.name},
        ${data.category_id ?? null},
        ${data.account_id ?? null},
        ${data.amount_pesos ?? 0},
        ${data.amount_dollars ?? 0},
        ${data.receive_day ?? null},
        ${data.active ?? true},
        ${userId}
      )
      RETURNING id
    `;
    return (row as { id: string }).id;
  });
  const created = await fetchRecurringIncomeById(insertedId, userId);
  return created!;
}

export async function updateRecurringIncome(
  id: string,
  data: RecurringIncomeUpdate,
  userId: string
): Promise<RecurringIncome | null> {
  const updated = await withAuthenticatedTx(userId, async (tx) => {
    const rows = await tx`
      UPDATE recurring_incomes SET
        name = ${data.name},
        category_id = ${data.category_id ?? null},
        account_id = ${data.account_id ?? null},
        amount_pesos = ${data.amount_pesos ?? 0},
        amount_dollars = ${data.amount_dollars ?? 0},
        receive_day = ${data.receive_day ?? null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;
    return rows.length > 0;
  });
  if (!updated) return null;
  return fetchRecurringIncomeById(id, userId);
}

export async function deleteRecurringIncome(id: string, userId: string): Promise<boolean> {
  return withAuthenticatedTx(userId, async (tx) => {
    await tx`
      UPDATE movements SET recurring_income_id = NULL
      WHERE recurring_income_id = ${id}
    `;
    const rows = await tx`
      DELETE FROM recurring_incomes WHERE id = ${id}
      RETURNING id
    `;
    return rows.length > 0;
  });
}

export type ReceiveIncomeResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'inactive' | 'already_received' | 'no_account' };

export async function receiveRecurringIncome(
  recurringId: string,
  period: string,
  financialPeriodId: string,
  userId: string,
  overrideAccountId?: string | null
): Promise<ReceiveIncomeResult> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [rec] = await tx`
      SELECT id, name, account_id, category_id, amount_pesos, amount_dollars, active
      FROM recurring_incomes
      WHERE id = ${recurringId}
      FOR UPDATE
    `;
    if (!rec) return { ok: false, reason: 'not_found' as const };
    if (!rec.active) return { ok: false, reason: 'inactive' as const };

    const accountId = overrideAccountId ?? rec.account_id;
    if (!accountId) return { ok: false, reason: 'no_account' as const };

    const [existing] = await tx`
      SELECT id FROM movements
      WHERE recurring_income_id = ${recurringId} AND financial_period_id = ${financialPeriodId}
      LIMIT 1
    `;
    if (existing) return { ok: false, reason: 'already_received' as const };

    const amountPesos = Number(rec.amount_pesos);
    const amountDollars = Number(rec.amount_dollars);

    await tx`
      INSERT INTO movements (
        period, financial_period_id, record_type, account_id, category_id, description, status,
        amount_pesos, amount_dollars, payment_date, comment, source, recurring_income_id, user_id
      )
      VALUES (
        ${period}, ${financialPeriodId}, 'income', ${accountId}, ${rec.category_id ?? null},
        ${rec.name}, true, ${amountPesos}, ${amountDollars}, NULL, NULL, 'app',
        ${recurringId}, ${userId}
      )
    `;

    const { deltaPesos, deltaDollars } = getBalanceDeltas(
      'income',
      true,
      amountPesos,
      amountDollars
    );
    if (deltaPesos !== 0 || deltaDollars !== 0) {
      await tx`
        UPDATE accounts
        SET balance_pesos = balance_pesos + ${deltaPesos},
            balance_dollars = balance_dollars + ${deltaDollars},
            updated_at = NOW()
        WHERE id = ${accountId}
      `;
    }

    return { ok: true as const };
  });
}
