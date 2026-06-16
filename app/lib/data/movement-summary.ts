import type { Movement, RecurringIncome } from '@/app/lib/definitions';
import { amountsToUsd, movementToUsd } from '@/app/lib/utils/currency';

export type MovementSummary = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  totalIncomePesos: number;
  totalExpensePesos: number;
  incomeCount: number;
  expenseCount: number;
  fixedTotal: number;
  variableTotal: number;
};

export type CategoryTotal = { name: string; amount: number };

type ComputeOptions = {
  /** Movimientos de pago de resumen de tarjeta (no cuentan como egreso extra). */
  statementPaymentIds?: Set<string>;
};

/**
 * Resume ingresos/egresos del período en USD (con conversión de pesos) y ARS crudo.
 */
export function computeMovementSummary(
  movements: Movement[],
  rate: number | null,
  options: ComputeOptions = {}
): MovementSummary & { categoryTotals: CategoryTotal[] } {
  const statementPaymentIds = options.statementPaymentIds ?? new Set<string>();

  let totalIncome = 0;
  let totalExpense = 0;
  let totalIncomePesos = 0;
  let totalExpensePesos = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let fixedTotal = 0;
  let variableTotal = 0;
  const categoryMap = new Map<string, number>();

  for (const m of movements) {
    if (m.record_type === 'income') {
      totalIncome += movementToUsd(m, rate);
      totalIncomePesos += m.amount_pesos;
      incomeCount += 1;
    } else if (
      m.record_type === 'variable_payment' ||
      m.record_type === 'fixed_payment'
    ) {
      if (statementPaymentIds.has(m.id)) continue;

      const counts = m.credit_card_id ? true : m.status === true;
      if (counts) {
        const usd = movementToUsd(m, rate);
        totalExpense += usd;
        totalExpensePesos += m.amount_pesos;
        if (m.record_type === 'fixed_payment') fixedTotal += usd;
        else variableTotal += usd;
        const cat = m.category_name?.trim() || 'Sin categoría';
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + usd);
      }
      expenseCount += 1;
    }
  }

  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    balance: totalIncome - totalExpense,
    totalIncome,
    totalExpense,
    totalIncomePesos,
    totalExpensePesos,
    incomeCount,
    expenseCount,
    fixedTotal,
    variableTotal,
    categoryTotals,
  };
}

export type RecurringIncomeProgress = {
  expectedUsd: number;
  percent: number;
  receivedCount: number;
  totalCount: number;
};

/** Progreso de cobro vs ingresos recurrentes programados (ej. sueldos del mes). */
export function computeRecurringIncomeProgress(
  incomes: RecurringIncome[],
  receivedIds: Set<string>,
  collectedIncomeUsd: number,
  rate: number | null
): RecurringIncomeProgress {
  const totalCount = incomes.length;
  const receivedCount = incomes.filter((i) => receivedIds.has(i.id)).length;
  const expectedUsd = incomes.reduce(
    (sum, i) => sum + amountsToUsd(i.amount_pesos, i.amount_dollars, rate),
    0
  );
  const percent =
    expectedUsd > 0
      ? Math.min(100, (collectedIncomeUsd / expectedUsd) * 100)
      : totalCount > 0
        ? Math.min(100, (receivedCount / totalCount) * 100)
        : 100;

  return { expectedUsd, percent, receivedCount, totalCount };
}
