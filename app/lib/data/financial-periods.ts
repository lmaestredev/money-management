import { withAuthenticatedTx } from '../db';
import { currentPeriodAR } from '../dates';
import { periodRate } from '../period-rate';
import { toUsd } from '../summary';
import type { FinancialPeriod, FinancialPeriodStatus } from '../definitions';

function toDateStr(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function toTsStr(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function rowToPeriod(row: Record<string, unknown>): FinancialPeriod {
  const status = row.status as string;
  return {
    id: row.id as string,
    start_date: toDateStr(row.start_date),
    end_date: row.end_date ? toDateStr(row.end_date) : null,
    status: (['open', 'closed'].includes(status) ? status : 'open') as FinancialPeriodStatus,
    closed_at: toTsStr(row.closed_at),
    closing_rate: row.closing_rate != null ? Number(row.closing_rate) : null,
    created_at: toTsStr(row.created_at) ?? '',
    user_id: row.user_id as string,
  };
}

export async function fetchCurrentPeriod(userId: string): Promise<FinancialPeriod | null> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      SELECT id, start_date, end_date, status, closed_at, closing_rate, created_at, user_id
      FROM financial_periods
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (!row) return null;
    return rowToPeriod(row as Record<string, unknown>);
  });
}

export async function fetchClosedPeriods(userId: string): Promise<FinancialPeriod[]> {
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = await tx`
      SELECT id, start_date, end_date, status, closed_at, closing_rate, created_at, user_id
      FROM financial_periods
      WHERE status = 'closed'
      ORDER BY start_date DESC
    `;
    return rows.map((r) => rowToPeriod(r as Record<string, unknown>));
  });
}

/**
 * Totales de un período cerrado. Los *_dollars son USD EQUIVALENTES (los pesos se
 * convierten con la tasa que recibe la función), igual que el detalle del período.
 */
export type PeriodWithSummary = FinancialPeriod & {
  movement_count: number;
  total_income_dollars: number;
  total_expense_dollars: number;
  total_income_pesos: number;
  total_expense_pesos: number;
  balance_dollars: number;
  /** USD incompletos: sin cotización y con pesos sin convertir (la UI muestra "—"). */
  incomplete: { income: boolean; expense: boolean; balance: boolean; expenseArs: boolean };
};

export async function fetchClosedPeriodsWithSummary(
  userId: string,
  rate: number | null
): Promise<PeriodWithSummary[]> {
  return withAuthenticatedTx(userId, async (tx) => {
    // El predicado de gasto debe coincidir con countsAsExpense (app/lib/summary.ts):
    // egreso con tarjeta o pagado, y que NO sea el pago de un resumen.
    const rows = await tx`
      SELECT
        fp.id, fp.start_date, fp.end_date, fp.status, fp.closed_at, fp.closing_rate, fp.created_at, fp.user_id,
        COUNT(m.id)::int AS movement_count,
        COALESCE(SUM(CASE WHEN m.record_type = 'income' THEN m.amount_dollars ELSE 0 END), 0) AS income_dollars,
        COALESCE(SUM(CASE WHEN m.record_type = 'income' THEN m.amount_pesos ELSE 0 END), 0) AS income_pesos,
        COALESCE(SUM(CASE WHEN m.record_type IN ('variable_payment', 'fixed_payment')
                           AND NOT m.is_statement_payment
                           AND (m.credit_card_id IS NOT NULL OR m.status = true)
                          THEN m.amount_dollars ELSE 0 END), 0) AS expense_dollars,
        COALESCE(SUM(CASE WHEN m.record_type IN ('variable_payment', 'fixed_payment')
                           AND NOT m.is_statement_payment
                           AND (m.credit_card_id IS NOT NULL OR m.status = true)
                          THEN m.amount_pesos ELSE 0 END), 0) AS expense_pesos
      FROM financial_periods fp
      LEFT JOIN movements m ON m.financial_period_id = fp.id
      WHERE fp.status = 'closed'
      GROUP BY fp.id
      ORDER BY fp.start_date DESC
    `;

    return rows.map((r) => {
      const incomePesos = Number(r.income_pesos);
      const expensePesos = Number(r.expense_pesos);
      // Cada período se convierte con su tasa congelada; si no la tiene, con la actual.
      const { rate: pRate } = periodRate(
        r.closing_rate != null ? Number(r.closing_rate) : null,
        rate
      );
      const rateMissing = !(pRate && pRate > 0);
      const income = toUsd({ amount_pesos: incomePesos, amount_dollars: Number(r.income_dollars) }, pRate);
      const expense = toUsd({ amount_pesos: expensePesos, amount_dollars: Number(r.expense_dollars) }, pRate);
      return {
        ...rowToPeriod(r as Record<string, unknown>),
        movement_count: Number(r.movement_count),
        total_income_dollars: income,
        total_expense_dollars: expense,
        total_income_pesos: incomePesos,
        total_expense_pesos: expensePesos,
        balance_dollars: income - expense,
        incomplete: {
          income: rateMissing && incomePesos > 0,
          expense: rateMissing && expensePesos > 0,
          balance: rateMissing && (incomePesos > 0 || expensePesos > 0),
          // En pesos: los gastos cargados en dólares no se pueden pasar a pesos sin cotización.
          expenseArs: rateMissing && Number(r.expense_dollars) > 0,
        },
      };
    });
  });
}

export async function fetchPeriodById(id: string, userId: string): Promise<FinancialPeriod | null> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      SELECT id, start_date, end_date, status, closed_at, closing_rate, created_at, user_id
      FROM financial_periods
      WHERE id = ${id}
    `;
    if (!row) return null;
    return rowToPeriod(row as Record<string, unknown>);
  });
}

/**
 * Devuelve el período abierto del usuario y, si no tiene ninguno (usuario nuevo),
 * crea el primero: arranca el día 1 del mes actual (hora Argentina).
 * Seguro ante pedidos simultáneos: el índice único parcial de un período abierto
 * por usuario (migración 019) hace que el segundo INSERT no haga nada.
 */
export async function ensureCurrentPeriod(userId: string): Promise<FinancialPeriod> {
  const existing = await fetchCurrentPeriod(userId);
  if (existing) return existing;

  return withAuthenticatedTx(userId, async (tx) => {
    await tx`
      INSERT INTO financial_periods (start_date, status, user_id)
      VALUES (${`${currentPeriodAR()}-01`}, 'open', ${userId})
      ON CONFLICT (user_id) WHERE status = 'open' DO NOTHING
    `;
    const [row] = await tx`
      SELECT id, start_date, end_date, status, closed_at, closing_rate, created_at, user_id
      FROM financial_periods
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rowToPeriod(row as Record<string, unknown>);
  });
}

export async function createNextPeriod(startDate: string, userId: string): Promise<FinancialPeriod> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      INSERT INTO financial_periods (start_date, status, user_id)
      VALUES (${startDate}, 'open', ${userId})
      RETURNING id, start_date, end_date, status, closed_at, closing_rate, created_at, user_id
    `;
    return rowToPeriod(row as Record<string, unknown>);
  });
}

export async function closePeriodRecord(
  periodId: string,
  endDate: string,
  nextStartDate: string,
  userId: string,
  /** Cotización en uso al cerrar (pesos por USD); se congela en el período. null si no hay. */
  closingRate: number | null = null
): Promise<{ closed: FinancialPeriod; next: FinancialPeriod }> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [closedRow] = await tx`
      UPDATE financial_periods
      SET status = 'closed', end_date = ${endDate}, closed_at = NOW(), closing_rate = ${closingRate}
      WHERE id = ${periodId} AND status = 'open'
      RETURNING id, start_date, end_date, status, closed_at, closing_rate, created_at, user_id
    `;
    if (!closedRow) {
      throw new Error('El período ya fue cerrado o no existe.');
    }

    const [nextRow] = await tx`
      INSERT INTO financial_periods (start_date, status, user_id)
      VALUES (${nextStartDate}, 'open', ${userId})
      RETURNING id, start_date, end_date, status, closed_at, closing_rate, created_at, user_id
    `;

    return {
      closed: rowToPeriod(closedRow as Record<string, unknown>),
      next: rowToPeriod(nextRow as Record<string, unknown>),
    };
  });
}
