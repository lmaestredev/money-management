import { fetchClosedPeriods, type PeriodWithSummary } from './financial-periods';
import { fetchMovementsByFinancialPeriod } from './movements';
import { fetchStatementPaymentIds } from './credit-cards';
import { computeMovementSummary } from './movement-summary';
import { getEffectiveRate } from './exchange-rates';

/** Períodos cerrados con totales alineados a computeMovementSummary. */
export async function fetchClosedPeriodsWithSummary(): Promise<PeriodWithSummary[]> {
  const [periods, statementPaymentIds, effectiveRate] = await Promise.all([
    fetchClosedPeriods(),
    fetchStatementPaymentIds(),
    getEffectiveRate(),
  ]);
  const rate = effectiveRate?.rate ?? null;

  return Promise.all(
    periods.map(async (period) => {
      const movements = await fetchMovementsByFinancialPeriod(period.id);
      const summary = computeMovementSummary(movements, rate, { statementPaymentIds });
      return {
        ...period,
        movement_count: movements.length,
        total_income_dollars: summary.totalIncome,
        total_expense_dollars: summary.totalExpense,
        total_income_pesos: summary.totalIncomePesos,
        total_expense_pesos: summary.totalExpensePesos,
        balance_dollars: summary.balance,
      };
    })
  );
}
