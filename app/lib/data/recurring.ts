import { sql } from '../db';
import { getBalanceDeltas, getCardDeltas } from './movements';
import { applyCardCharge, resolveOrCreateStatement } from './credit-cards';
import type { RecurringExpense, RecurringExpenseInsert } from '../definitions';

function rowToRecurring(row: Record<string, unknown>): RecurringExpense {
  return {
    id: row.id as string,
    name: row.name as string,
    category_id: (row.category_id as string) ?? null,
    category_name: (row.category_name as string) ?? null,
    account_id: (row.account_id as string) ?? null,
    account_name: (row.account_name as string) ?? null,
    credit_card_id: (row.credit_card_id as string) ?? null,
    credit_card_name: (row.credit_card_name as string) ?? null,
    amount_pesos: Number(row.amount_pesos),
    amount_dollars: Number(row.amount_dollars),
    pay_before_day: row.pay_before_day != null ? Number(row.pay_before_day) : null,
    is_cash: Boolean(row.is_cash),
    active: Boolean(row.active),
    user_id: (row.user_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

const SELECT_COLUMNS = sql`
  r.id, r.name, r.category_id, c.name AS category_name,
  r.account_id, a.name AS account_name,
  r.credit_card_id, cc.name AS credit_card_name,
  r.amount_pesos, r.amount_dollars, r.pay_before_day, r.is_cash, r.active,
  r.user_id, r.created_at, r.updated_at
`;

export async function fetchRecurringExpenses(): Promise<RecurringExpense[]> {
  const rows = await sql`
    SELECT ${SELECT_COLUMNS}
    FROM recurring_expenses r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts a ON r.account_id = a.id
    LEFT JOIN credit_cards cc ON r.credit_card_id = cc.id
    ORDER BY r.active DESC, r.name ASC
  `;
  return rows.map((r) => rowToRecurring(r as Record<string, unknown>));
}

export async function fetchActiveRecurringExpenses(): Promise<RecurringExpense[]> {
  const rows = await sql`
    SELECT ${SELECT_COLUMNS}
    FROM recurring_expenses r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts a ON r.account_id = a.id
    LEFT JOIN credit_cards cc ON r.credit_card_id = cc.id
    WHERE r.active = true
    ORDER BY r.name ASC
  `;
  return rows.map((r) => rowToRecurring(r as Record<string, unknown>));
}

export async function fetchRecurringExpenseById(id: string): Promise<RecurringExpense | null> {
  const [row] = await sql`
    SELECT ${SELECT_COLUMNS}
    FROM recurring_expenses r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts a ON r.account_id = a.id
    LEFT JOIN credit_cards cc ON r.credit_card_id = cc.id
    WHERE r.id = ${id}
  `;
  if (!row) return null;
  return rowToRecurring(row as Record<string, unknown>);
}

/** IDs de gastos fijos ya pagados en el período financiero dado. */
export async function fetchRecurringPaidIds(financialPeriodId: string): Promise<Set<string>> {
  const rows = (await sql`
    SELECT DISTINCT recurring_expense_id
    FROM movements
    WHERE financial_period_id = ${financialPeriodId} AND recurring_expense_id IS NOT NULL
  `) as { recurring_expense_id: string }[];
  return new Set(rows.map((r) => r.recurring_expense_id));
}

export async function createRecurringExpense(
  data: RecurringExpenseInsert
): Promise<RecurringExpense> {
  const [row] = await sql`
    INSERT INTO recurring_expenses (
      name, category_id, account_id, credit_card_id, amount_pesos, amount_dollars,
      pay_before_day, is_cash, active, user_id
    )
    VALUES (
      ${data.name},
      ${data.category_id ?? null},
      ${data.account_id ?? null},
      ${data.credit_card_id ?? null},
      ${data.amount_pesos ?? 0},
      ${data.amount_dollars ?? 0},
      ${data.pay_before_day ?? null},
      ${data.is_cash ?? false},
      ${data.active ?? true},
      ${data.user_id ?? null}
    )
    RETURNING id
  `;
  const created = await fetchRecurringExpenseById((row as { id: string }).id);
  return created!;
}

/**
 * Elimina un gasto fijo. Preserva el historial: desvincula los pagos ya
 * registrados (quedan como movimientos normales) antes de borrar la plantilla.
 */
export async function deleteRecurringExpense(id: string): Promise<boolean> {
  return sql.begin(async (tx) => {
    await tx`
      UPDATE movements SET recurring_expense_id = NULL
      WHERE recurring_expense_id = ${id}
    `;
    const rows = await tx`
      DELETE FROM recurring_expenses WHERE id = ${id}
      RETURNING id
    `;
    return rows.length > 0;
  });
}

export type PayRecurringResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'inactive' | 'already_paid' | 'no_account' };

/**
 * Registra el pago del gasto fijo del mes: crea un movement enlazado. Atómico.
 * Evita doble pago en el periodo.
 *
 * Cómo se contabiliza:
 * - Si se pasa `overrideAccountId` (caso efectivo: se elige al confirmar) se
 *   debita esa cuenta.
 * - Si no, y la plantilla está asociada a una tarjeta, se carga al resumen de
 *   la tarjeta (suma a la deuda; no debita ninguna cuenta).
 * - Si no, se debita la cuenta fija de la plantilla.
 * Si no hay ninguna, devuelve 'no_account'.
 */
export async function payRecurringExpense(
  recurringId: string,
  period: string,
  financialPeriodId: string,
  overrideAccountId?: string | null
): Promise<PayRecurringResult> {
  return sql.begin(async (tx) => {
    const [rec] = await tx`
      SELECT id, name, account_id, credit_card_id, category_id,
             amount_pesos, amount_dollars, active
      FROM recurring_expenses
      WHERE id = ${recurringId}
      FOR UPDATE
    `;
    if (!rec) return { ok: false, reason: 'not_found' as const };
    if (!rec.active) return { ok: false, reason: 'inactive' as const };

    const accountId = overrideAccountId ?? rec.account_id;
    const useCard = !overrideAccountId && rec.credit_card_id;
    if (!accountId && !useCard) return { ok: false, reason: 'no_account' as const };

    const [existing] = await tx`
      SELECT id FROM movements
      WHERE recurring_expense_id = ${recurringId} AND financial_period_id = ${financialPeriodId}
      LIMIT 1
    `;
    if (existing) return { ok: false, reason: 'already_paid' as const };

    const amountPesos = Number(rec.amount_pesos);
    const amountDollars = Number(rec.amount_dollars);

    if (useCard) {
      const st = await resolveOrCreateStatement(tx, rec.credit_card_id as string, new Date());
      await tx`
        INSERT INTO movements (
          period, financial_period_id, record_type, credit_card_id, statement_id, category_id,
          description, status,
          amount_pesos, amount_dollars, payment_date, comment, source, recurring_expense_id
        )
        VALUES (
          ${period}, ${financialPeriodId}, 'fixed_payment', ${rec.credit_card_id}, ${st.id}, ${rec.category_id ?? null},
          ${rec.name}, true, ${amountPesos}, ${amountDollars}, NULL, NULL, 'app',
          ${recurringId}
        )
      `;
      const card = getCardDeltas('fixed_payment', amountPesos, amountDollars);
      await applyCardCharge(tx, rec.credit_card_id as string, st.id, card.deltaPesos, card.deltaDollars);
    } else {
      await tx`
        INSERT INTO movements (
          period, financial_period_id, record_type, account_id, category_id, description, status,
          amount_pesos, amount_dollars, payment_date, comment, source, recurring_expense_id
        )
        VALUES (
          ${period}, ${financialPeriodId}, 'fixed_payment', ${accountId}, ${rec.category_id ?? null},
          ${rec.name}, true, ${amountPesos}, ${amountDollars}, NULL, NULL, 'app',
          ${recurringId}
        )
      `;

      const { deltaPesos, deltaDollars } = getBalanceDeltas(
        'fixed_payment',
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
    }

    return { ok: true as const };
  });
}
