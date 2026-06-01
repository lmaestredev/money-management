import { sql } from '../db';
import type { FinancialPeriod, FinancialPeriodStatus } from '../definitions';

function rowToPeriod(row: Record<string, unknown>): FinancialPeriod {
  const status = row.status as string;
  return {
    id: row.id as string,
    start_date: row.start_date as string,
    end_date: (row.end_date as string) ?? null,
    status: (['open', 'closed'].includes(status) ? status : 'open') as FinancialPeriodStatus,
    closed_at: (row.closed_at as string) ?? null,
    created_at: row.created_at as string,
  };
}

/** Período actualmente abierto. Null solo si la tabla está vacía (no debería pasar). */
export async function fetchCurrentPeriod(): Promise<FinancialPeriod | null> {
  const [row] = await sql`
    SELECT id, start_date, end_date, status, closed_at, created_at
    FROM financial_periods
    WHERE status = 'open'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (!row) return null;
  return rowToPeriod(row as Record<string, unknown>);
}

/** Historial de períodos cerrados, más reciente primero. */
export async function fetchClosedPeriods(): Promise<FinancialPeriod[]> {
  const rows = await sql`
    SELECT id, start_date, end_date, status, closed_at, created_at
    FROM financial_periods
    WHERE status = 'closed'
    ORDER BY start_date DESC
  `;
  return rows.map((r) => rowToPeriod(r as Record<string, unknown>));
}

export type PeriodWithSummary = FinancialPeriod & {
  movement_count: number;
  total_income_dollars: number;
  total_expense_dollars: number;
  total_income_pesos: number;
  total_expense_pesos: number;
  balance_dollars: number;
};

/**
 * Períodos cerrados con totales calculados en una sola query.
 * Excluye los pagos de resúmenes de tarjeta (paid_movement_id) para evitar
 * doble conteo, igual que el dashboard.
 */
export async function fetchClosedPeriodsWithSummary(): Promise<PeriodWithSummary[]> {
  const rows = await sql`
    SELECT
      fp.id, fp.start_date, fp.end_date, fp.status, fp.closed_at, fp.created_at,
      COUNT(m.id)::int AS movement_count,
      COALESCE(SUM(
        CASE WHEN m.record_type = 'income' THEN m.amount_dollars ELSE 0 END
      ), 0) AS total_income_dollars,
      COALESCE(SUM(
        CASE WHEN m.record_type IN ('variable_payment','fixed_payment')
              AND m.id NOT IN (
                SELECT paid_movement_id FROM credit_card_statements
                WHERE paid_movement_id IS NOT NULL
              )
             THEN m.amount_dollars ELSE 0 END
      ), 0) AS total_expense_dollars,
      COALESCE(SUM(
        CASE WHEN m.record_type = 'income' THEN m.amount_pesos ELSE 0 END
      ), 0) AS total_income_pesos,
      COALESCE(SUM(
        CASE WHEN m.record_type IN ('variable_payment','fixed_payment')
              AND m.id NOT IN (
                SELECT paid_movement_id FROM credit_card_statements
                WHERE paid_movement_id IS NOT NULL
              )
             THEN m.amount_pesos ELSE 0 END
      ), 0) AS total_expense_pesos
    FROM financial_periods fp
    LEFT JOIN movements m ON m.financial_period_id = fp.id
    WHERE fp.status = 'closed'
    GROUP BY fp.id
    ORDER BY fp.start_date DESC
  `;

  return rows.map((r) => {
    const income = Number(r.total_income_dollars);
    const expense = Number(r.total_expense_dollars);
    return {
      ...rowToPeriod(r as Record<string, unknown>),
      movement_count: Number(r.movement_count),
      total_income_dollars: income,
      total_expense_dollars: expense,
      total_income_pesos: Number(r.total_income_pesos),
      total_expense_pesos: Number(r.total_expense_pesos),
      balance_dollars: income - expense,
    };
  });
}

export async function fetchPeriodById(id: string): Promise<FinancialPeriod | null> {
  const [row] = await sql`
    SELECT id, start_date, end_date, status, closed_at, created_at
    FROM financial_periods
    WHERE id = ${id}
  `;
  if (!row) return null;
  return rowToPeriod(row as Record<string, unknown>);
}

/** Crea el período siguiente (start_date = hoy + 1 día). */
export async function createNextPeriod(startDate: string): Promise<FinancialPeriod> {
  const [row] = await sql`
    INSERT INTO financial_periods (start_date, status)
    VALUES (${startDate}, 'open')
    RETURNING id, start_date, end_date, status, closed_at, created_at
  `;
  return rowToPeriod(row as Record<string, unknown>);
}

/** Sella el período activo con end_date y crea el siguiente. Devuelve ambos. */
export async function closePeriodRecord(
  periodId: string,
  endDate: string,
  nextStartDate: string
): Promise<{ closed: FinancialPeriod; next: FinancialPeriod }> {
  return sql.begin(async (tx) => {
    const [closedRow] = await tx`
      UPDATE financial_periods
      SET status = 'closed', end_date = ${endDate}, closed_at = NOW()
      WHERE id = ${periodId} AND status = 'open'
      RETURNING id, start_date, end_date, status, closed_at, created_at
    `;
    if (!closedRow) {
      throw new Error('El período ya fue cerrado o no existe.');
    }

    const [nextRow] = await tx`
      INSERT INTO financial_periods (start_date, status)
      VALUES (${nextStartDate}, 'open')
      RETURNING id, start_date, end_date, status, closed_at, created_at
    `;

    return {
      closed: rowToPeriod(closedRow as Record<string, unknown>),
      next: rowToPeriod(nextRow as Record<string, unknown>),
    };
  });
}
