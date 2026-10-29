/**
 * Resumen de un conjunto de movimientos (dashboard, movimientos, historial).
 * Es el ÚNICO lugar donde se decide qué cuenta como gasto.
 *
 * Regla de negocio: un cargo con tarjeta cuenta como gasto del mes en que se hace;
 * el PAGO del resumen no cuenta (el gasto ya se contó al hacer el cargo).
 */
import type { Movement } from './definitions';

export type CategoryTotal = {
  name: string;
  amount: number;
  /** USD incompleto: sin cotización y la categoría tiene pesos sin convertir. */
  incomplete?: boolean;
};

/**
 * true cuando el importe en USD está INCOMPLETO: no hay cotización válida y hay pesos
 * que no se pudieron convertir. Con tasa nula esos pesos aportan 0 y la cifra queda
 * subestimada, así que la UI muestra "—" en lugar de un número engañoso.
 */
export type UsdIncomplete = {
  income: boolean;
  expense: boolean;
  variable: boolean;
  fixed: boolean;
  /** Solo las cuotas (subconjunto de los fijos). */
  installments: boolean;
  /** Fijos sin cuotas (alquiler, servicios, etc.). */
  fixedExpenses: boolean;
  balance: boolean;
};

/**
 * Lo mismo pero para las cifras en PESOS: sin cotización, los montos cargados en
 * dólares no se pueden pasar a pesos y esa cifra queda subestimada.
 */
export type ArsIncomplete = { income: boolean; expense: boolean; variable: boolean };

export type Summary = {
  /** Ingresos − gastos, en USD. */
  balance: number;
  totalIncome: number; // USD (pesos convertidos con la tasa)
  totalExpense: number; // USD
  totalIncomePesos: number; // ARS crudo
  totalExpensePesos: number; // ARS crudo
  incomeCount: number;
  /** Egresos registrados (cuenten o no como gasto), sin los pagos de resumen. */
  expenseCount: number;
  fixedTotal: number; // USD, gastos fijos
  variableTotal: number; // USD, gastos variables
  variableTotalPesos: number; // ARS crudo, gastos variables
  /**
   * Los pagos de cuotas se guardan como gastos fijos (con installment_id). Acá se
   * separan: `installmentsTotal` + `fixedExpensesTotal` = `fixedTotal`.
   */
  installmentsTotal: number; // USD, cuotas pagadas
  installmentsTotalPesos: number; // ARS crudo
  fixedExpensesTotal: number; // USD, gastos fijos sin cuotas
  fixedExpensesTotalPesos: number; // ARS crudo
  categoryTotals: CategoryTotal[];
  incomplete: UsdIncomplete;
  incompleteArs: ArsIncomplete;
};

type AmountFields = Pick<Movement, 'amount_pesos' | 'amount_dollars'>;

/**
 * Valor del movimiento en USD. Los dólares se toman directo; los pesos se convierten
 * con la tasa. Sin tasa válida los pesos no se pueden convertir y aportan 0.
 */
export function toUsd(m: AmountFields, rate: number | null): number {
  const pesosUsd = rate && rate > 0 ? m.amount_pesos / rate : 0;
  return m.amount_dollars + pesosUsd;
}

export function isExpenseType(m: Pick<Movement, 'record_type'>): boolean {
  return m.record_type === 'variable_payment' || m.record_type === 'fixed_payment';
}

/**
 * ¿El egreso cuenta como gasto del período?
 * (con tarjeta, o pagado) y NO es el pago de un resumen.
 * Un egreso común pendiente (status ≠ true) todavía no es gasto.
 */
export function countsAsExpense(
  m: Pick<Movement, 'record_type' | 'status' | 'credit_card_id' | 'is_statement_payment'>
): boolean {
  if (!isExpenseType(m)) return false;
  if (m.is_statement_payment) return false;
  return Boolean(m.credit_card_id) || m.status === true;
}

export function computeSummary(movements: Movement[], rate: number | null): Summary {
  let totalIncome = 0;
  let totalExpense = 0;
  let totalIncomePesos = 0;
  let totalExpensePesos = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let fixedTotal = 0;
  let variableTotal = 0;
  let variableTotalPesos = 0;
  let installmentsTotal = 0;
  let installmentsTotalPesos = 0;
  let totalIncomeDollars = 0;
  let totalExpenseDollars = 0;
  let variableDollars = 0;
  const categoryMap = new Map<string, number>();
  const categoryPesos = new Map<string, number>();

  for (const m of movements) {
    if (m.record_type === 'income') {
      totalIncome += toUsd(m, rate);
      totalIncomePesos += m.amount_pesos;
      totalIncomeDollars += m.amount_dollars;
      incomeCount += 1;
      continue;
    }
    if (!isExpenseType(m) || m.is_statement_payment) continue;

    expenseCount += 1;
    if (!countsAsExpense(m)) continue;

    const usd = toUsd(m, rate);
    totalExpense += usd;
    totalExpensePesos += m.amount_pesos;
    totalExpenseDollars += m.amount_dollars;
    if (m.record_type === 'fixed_payment') {
      fixedTotal += usd;
      if (m.installment_id) {
        installmentsTotal += usd;
        installmentsTotalPesos += m.amount_pesos;
      }
    } else {
      variableTotal += usd;
      variableTotalPesos += m.amount_pesos;
      variableDollars += m.amount_dollars;
    }
    const category = m.category_name?.trim() || 'Sin categoría';
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + usd);
    categoryPesos.set(category, (categoryPesos.get(category) ?? 0) + m.amount_pesos);
  }

  const rateMissing = !(rate && rate > 0);
  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      incomplete: rateMissing && (categoryPesos.get(name) ?? 0) > 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  const fixedTotalPesos = totalExpensePesos - variableTotalPesos;
  const fixedExpensesTotalPesos = fixedTotalPesos - installmentsTotalPesos;
  const incomplete: UsdIncomplete = {
    income: rateMissing && totalIncomePesos > 0,
    expense: rateMissing && totalExpensePesos > 0,
    variable: rateMissing && variableTotalPesos > 0,
    fixed: rateMissing && fixedTotalPesos > 0,
    installments: rateMissing && installmentsTotalPesos > 0,
    fixedExpenses: rateMissing && fixedExpensesTotalPesos > 0,
    balance: rateMissing && (totalIncomePesos > 0 || totalExpensePesos > 0),
  };

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
    variableTotalPesos,
    installmentsTotal,
    installmentsTotalPesos,
    fixedExpensesTotal: fixedTotal - installmentsTotal,
    fixedExpensesTotalPesos,
    categoryTotals,
    incomplete,
    incompleteArs: {
      income: rateMissing && totalIncomeDollars > 0,
      expense: rateMissing && totalExpenseDollars > 0,
      variable: rateMissing && variableDollars > 0,
    },
  };
}
