import { sql } from '../db';
import { fetchCurrentPeriod } from './financial-periods';
import { getEffectiveRate } from './exchange-rates';
import { syncRecurringIncomeLinkedMovements } from './sync-template-movements';
import type { AccountCurrency } from '../definitions';
import { getAccountBalanceDeltas } from './movements';
import type { RecurringIncome, RecurringIncomeInsert } from '../definitions';

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
    user_id: (row.user_id as string) ?? null,
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

export async function fetchRecurringIncomes(): Promise<RecurringIncome[]> {
  const rows = await sql`
    SELECT ${SELECT_COLUMNS}
    FROM recurring_incomes r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts a ON r.account_id = a.id
    ORDER BY r.active DESC, r.name ASC
  `;
  return rows.map((r) => rowToRecurringIncome(r as Record<string, unknown>));
}

export async function fetchActiveRecurringIncomes(): Promise<RecurringIncome[]> {
  const rows = await sql`
    SELECT ${SELECT_COLUMNS}
    FROM recurring_incomes r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts a ON r.account_id = a.id
    WHERE r.active = true
    ORDER BY r.name ASC
  `;
  return rows.map((r) => rowToRecurringIncome(r as Record<string, unknown>));
}

export async function fetchRecurringIncomeById(id: string): Promise<RecurringIncome | null> {
  const [row] = await sql`
    SELECT ${SELECT_COLUMNS}
    FROM recurring_incomes r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts a ON r.account_id = a.id
    WHERE r.id = ${id}
  `;
  if (!row) return null;
  return rowToRecurringIncome(row as Record<string, unknown>);
}

/** IDs de ingresos ya cobrados en el período financiero dado. */
export async function fetchRecurringIncomeReceivedIds(financialPeriodId: string): Promise<Set<string>> {
  const rows = (await sql`
    SELECT DISTINCT recurring_income_id
    FROM movements
    WHERE financial_period_id = ${financialPeriodId} AND recurring_income_id IS NOT NULL
  `) as { recurring_income_id: string }[];
  return new Set(rows.map((r) => r.recurring_income_id));
}

export async function createRecurringIncome(
  data: RecurringIncomeInsert
): Promise<RecurringIncome> {
  const [row] = await sql`
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
      ${data.user_id ?? null}
    )
    RETURNING id
  `;
  const created = await fetchRecurringIncomeById((row as { id: string }).id);
  return created!;
}

export async function updateRecurringIncome(
  id: string,
  data: RecurringIncomeInsert
): Promise<RecurringIncome | null> {
  const [currentPeriod, effectiveRate] = await Promise.all([
    fetchCurrentPeriod(),
    getEffectiveRate(),
  ]);
  const rate = effectiveRate?.rate ?? null;

  const updated = await sql.begin(async (tx) => {
    const [row] = await tx`
      UPDATE recurring_incomes
      SET
        name = ${data.name},
        category_id = ${data.category_id ?? null},
        account_id = ${data.account_id ?? null},
        amount_pesos = ${data.amount_pesos ?? 0},
        amount_dollars = ${data.amount_dollars ?? 0},
        receive_day = ${data.receive_day ?? null},
        active = ${data.active ?? true},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;
    if (!row) return false;

    await syncRecurringIncomeLinkedMovements(tx, id, data, {
      financialPeriodId: currentPeriod?.id ?? null,
      rate,
    });
    return true;
  });

  if (!updated) return null;
  return fetchRecurringIncomeById(id);
}

/**
 * Elimina un ingreso recurrente. Preserva el historial: desvincula los cobros
 * ya registrados (quedan como movimientos normales) antes de borrar la plantilla.
 */
export async function deleteRecurringIncome(id: string): Promise<boolean> {
  return sql.begin(async (tx) => {
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

/**
 * Registra el cobro del ingreso del mes: crea un movement de tipo income que
 * acredita la cuenta. Atómico. Evita doble cobro en el periodo. La cuenta se
 * resuelve por override (elegida al confirmar) o la fija de la plantilla.
 */
export async function receiveRecurringIncome(
  recurringId: string,
  period: string,
  financialPeriodId: string,
  overrideAccountId?: string | null
): Promise<ReceiveIncomeResult> {
  const effectiveRate = await getEffectiveRate();
  const rate = effectiveRate?.rate ?? null;

  return sql.begin(async (tx) => {
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

    const [account] = await tx`
      SELECT currency FROM accounts WHERE id = ${accountId}
    `;

    await tx`
      INSERT INTO movements (
        period, financial_period_id, record_type, account_id, category_id, description, status,
        amount_pesos, amount_dollars, payment_date, comment, source, recurring_income_id
      )
      VALUES (
        ${period}, ${financialPeriodId}, 'income', ${accountId}, ${rec.category_id ?? null},
        ${rec.name}, true, ${amountPesos}, ${amountDollars}, NULL, NULL, 'app',
        ${recurringId}
      )
    `;

    const { deltaPesos, deltaDollars } = getAccountBalanceDeltas(
      (account?.currency as AccountCurrency) ?? null,
      'income',
      true,
      amountPesos,
      amountDollars,
      rate
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
