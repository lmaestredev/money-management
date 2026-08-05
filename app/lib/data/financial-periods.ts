import { withAuthenticatedTx } from '../db';
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
    created_at: toTsStr(row.created_at) ?? '',
    user_id: row.user_id as string,
  };
}

export async function fetchCurrentPeriod(userId: string): Promise<FinancialPeriod | null> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      SELECT id, start_date, end_date, status, closed_at, created_at, user_id
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
      SELECT id, start_date, end_date, status, closed_at, created_at, user_id
      FROM financial_periods
      WHERE status = 'closed'
      ORDER BY start_date DESC
    `;
    return rows.map((r) => rowToPeriod(r as Record<string, unknown>));
  });
}

export type PeriodWithSummary = FinancialPeriod & {
  movement_count: number;
  total_income_dollars: number;
  total_expense_dollars: number;
  total_income_pesos: number;
  total_expense_pesos: number;
  balance_dollars: number;
};

export async function fetchClosedPeriodsWithSummary(userId: string): Promise<PeriodWithSummary[]> {
  return withAuthenticatedTx(userId, async (tx) => {
    const rows = await tx`
      SELECT
        fp.id, fp.start_date, fp.end_date, fp.status, fp.closed_at, fp.created_at, fp.user_id,
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
  });
}

export async function fetchPeriodById(id: string, userId: string): Promise<FinancialPeriod | null> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      SELECT id, start_date, end_date, status, closed_at, created_at, user_id
      FROM financial_periods
      WHERE id = ${id}
    `;
    if (!row) return null;
    return rowToPeriod(row as Record<string, unknown>);
  });
}

export async function createNextPeriod(startDate: string, userId: string): Promise<FinancialPeriod> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [row] = await tx`
      INSERT INTO financial_periods (start_date, status, user_id)
      VALUES (${startDate}, 'open', ${userId})
      RETURNING id, start_date, end_date, status, closed_at, created_at, user_id
    `;
    return rowToPeriod(row as Record<string, unknown>);
  });
}

export async function closePeriodRecord(
  periodId: string,
  endDate: string,
  nextStartDate: string,
  userId: string
): Promise<{ closed: FinancialPeriod; next: FinancialPeriod }> {
  return withAuthenticatedTx(userId, async (tx) => {
    const [closedRow] = await tx`
      UPDATE financial_periods
      SET status = 'closed', end_date = ${endDate}, closed_at = NOW()
      WHERE id = ${periodId} AND status = 'open'
      RETURNING id, start_date, end_date, status, closed_at, created_at, user_id
    `;
    if (!closedRow) {
      throw new Error('El período ya fue cerrado o no existe.');
    }

    const [nextRow] = await tx`
      INSERT INTO financial_periods (start_date, status, user_id)
      VALUES (${nextStartDate}, 'open', ${userId})
      RETURNING id, start_date, end_date, status, closed_at, created_at, user_id
    `;

    return {
      closed: rowToPeriod(closedRow as Record<string, unknown>),
      next: rowToPeriod(nextRow as Record<string, unknown>),
    };
  });
}
