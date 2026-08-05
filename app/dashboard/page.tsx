import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Movement } from '@/app/lib/definitions';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByFinancialPeriod } from '@/app/lib/data/movements';
import { fetchInstallments } from '@/app/lib/data/installments';
import { fetchRecurringExpenses } from '@/app/lib/data/recurring';
import { fetchRecurringIncomes } from '@/app/lib/data/recurring-incomes';
import { fetchCreditCards, fetchStatementPaymentIds } from '@/app/lib/data/credit-cards';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { getSettings } from '@/app/lib/data/settings';
import {
  fetchExchangeRates,
  getEffectiveRate,
  refreshExchangeRatesIfStale,
} from '@/app/lib/data/exchange-rates';
import { createClient } from '@/app/lib/supabase/server';
import DashboardSummaryCards from '@/app/ui/dashboard/DashboardSummaryCards';
import ExchangeRateBadge from '@/app/ui/dashboard/ExchangeRateBadge';
import DashboardAlert from '@/app/ui/dashboard/DashboardAlert';
import PeriodBadge, { formatPeriodRange } from '@/app/ui/financial-periods/PeriodBadge';
import ExpenseBreakdownCard from '@/app/ui/dashboard/ExpenseBreakdownCard';
import BudgetCard from '@/app/ui/dashboard/BudgetCard';
import DashboardAccountList from '@/app/ui/dashboard/DashboardAccountList';
import InstallmentsCard from '@/app/ui/installments/InstallmentsCard';
import RecurringExpensesCard from '@/app/ui/recurring/RecurringExpensesCard';
import RecurringIncomesCard from '@/app/ui/recurring-incomes/RecurringIncomesCard';
import CategoryBreakdownCard from '@/app/ui/dashboard/CategoryBreakdownCard';
import type { CategoryTotal } from '@/app/ui/dashboard/CategoryBreakdownCard';
import CreditCardsCard from '@/app/ui/dashboard/CreditCardsCard';
import RateInfoCard from '@/app/ui/dashboard/RateInfoCard';
import ClosePeriodButton from '@/app/ui/financial-periods/ClosePeriodButton';
import styles from './page.module.css';

function getCurrentPeriod(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mm}`;
}

/**
 * Valor del movimiento en USD. Los importes en dólares se toman directo; los de
 * pesos se convierten con la tasa efectiva. Si no hay tasa, el monto en pesos no
 * puede convertirse y aporta 0 (se avisa en el dashboard).
 */
function toUsd(m: Movement, rate: number | null): number {
  const pesosUsd = rate && rate > 0 ? m.amount_pesos / rate : 0;
  return m.amount_dollars + pesosUsd;
}

function computeSummary(
  movements: Movement[],
  statementPaymentIds: Set<string>,
  rate: number | null
) {
  let totalIncome = 0;         // USD (convertido)
  let totalExpense = 0;        // USD (convertido)
  let totalIncomePesos = 0;    // ARS crudo
  let totalExpensePesos = 0;   // ARS crudo
  let incomeCount = 0;
  let expenseCount = 0;
  let fixedTotal = 0;
  let variableTotal = 0;
  let variableTotalPesos = 0;  // ARS crudo (solo gastos variables)
  const categoryMap = new Map<string, number>();

  for (const m of movements) {
    if (m.record_type === 'income') {
      totalIncome += toUsd(m, rate);
      totalIncomePesos += m.amount_pesos;
      incomeCount += 1;
    } else if (
      m.record_type === 'variable_payment' ||
      m.record_type === 'fixed_payment'
    ) {
      if (statementPaymentIds.has(m.id)) continue;

      const counts = m.credit_card_id ? true : m.status === true;
      if (counts) {
        const usd = toUsd(m, rate);
        totalExpense += usd;
        totalExpensePesos += m.amount_pesos;
        if (m.record_type === 'fixed_payment') {
          fixedTotal += usd;
        } else {
          variableTotal += usd;
          variableTotalPesos += m.amount_pesos;
        }
        const cat = m.category_name?.trim() || 'Sin categoría';
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + usd);
      }
      expenseCount += 1;
    }
  }

  const balance = totalIncome - totalExpense;
  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    balance,
    totalIncome,
    totalExpense,
    totalIncomePesos,
    totalExpensePesos,
    incomeCount,
    expenseCount,
    fixedTotal,
    variableTotal,
    variableTotalPesos,
    categoryTotals,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const userId = user.id;

  const period = getCurrentPeriod();

  await refreshExchangeRatesIfStale();

  const currentFinancialPeriod = await fetchCurrentPeriod(userId);
  const currentFinancialPeriodId = currentFinancialPeriod?.id ?? '';

  const [
    accounts,
    movements,
    installments,
    recurringExpenses,
    recurringIncomes,
    creditCards,
    statementPaymentIds,
    settings,
    effectiveRate,
    rates,
  ] = await Promise.all([
    fetchAccounts(userId),
    fetchMovementsByFinancialPeriod(currentFinancialPeriodId, userId),
    fetchInstallments(userId),
    fetchRecurringExpenses(userId),
    fetchRecurringIncomes(userId),
    fetchCreditCards(userId),
    fetchStatementPaymentIds(userId),
    getSettings(userId),
    getEffectiveRate(userId),
    fetchExchangeRates(),
  ]);

  const rate = effectiveRate?.rate ?? null;
  const summary = computeSummary(movements, statementPaymentIds, rate);
  // Label del período para las cards (rango de fechas del período financiero).
  const periodLabel = formatPeriodRange(currentFinancialPeriod);

  // Brecha blue / oficial (sobre venta), para mostrar en el dashboard.
  const blue = rates.find((r) => r.source === 'blue');
  const oficial = rates.find((r) => r.source === 'oficial');
  const gapPercent =
    blue && oficial && oficial.venta > 0
      ? ((blue.venta - oficial.venta) / oficial.venta) * 100
      : null;

  // Presupuesto total (todos los gastos).
  const budgetTotalLimit = settings.budget_total_usd;
  const totalSpent = summary.totalExpense;
  const totalAvailable = Math.max(0, budgetTotalLimit - totalSpent);
  const totalPercentUsed = budgetTotalLimit > 0 ? (totalSpent / budgetTotalLimit) * 100 : 0;
  const showTotalWarning = totalPercentUsed >= 80;

  // Presupuesto de gastos variables. Foco en pesos (gasto del día a día),
  // con el USD como referencia. El % usado se calcula en USD (fuente única)
  // para que la alerta de "casi agotado" sea consistente en ambas monedas.
  const budgetVarLimit = settings.budget_variable_usd;
  const varSpent = summary.variableTotal;
  const varAvailable = Math.max(0, budgetVarLimit - varSpent);
  const varPercentUsed = budgetVarLimit > 0 ? (varSpent / budgetVarLimit) * 100 : 0;
  const showVarWarning = varPercentUsed >= 80;

  const budgetVarLimitArs = rate ? budgetVarLimit * rate : null;
  const varAvailableArs =
    budgetVarLimitArs != null ? Math.max(0, budgetVarLimitArs - summary.variableTotalPesos) : null;

  const noRate = rate == null;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Resumen de tu situación financiera</p>
        </div>
        <div className={styles.headerActions}>
          <ExchangeRateBadge effective={effectiveRate} />
          <PeriodBadge period={currentFinancialPeriod} />
          <ClosePeriodButton />
        </div>
      </header>

      <DashboardSummaryCards
        variableExpensePesos={summary.variableTotalPesos}
        variableExpenseUsd={summary.variableTotal}
        totalExpensePesos={summary.totalExpensePesos}
        totalExpenseUsd={summary.totalExpense}
        balanceUsd={summary.balance}
        totalIncomeUsd={summary.totalIncome}
        totalIncomePesos={summary.totalIncomePesos}
        rate={rate}
      />

      {noRate && (
        <DashboardAlert
          message={
            <>
              <strong>Sin cotización del dólar:</strong> los gastos en pesos no se están
              convirtiendo a USD.{' '}
              <Link href="/dashboard/configuracion" className={styles.alertLink}>
                Actualizá la tasa en Configuración
              </Link>
              .
            </>
          }
        />
      )}

      {showTotalWarning && (
        <DashboardAlert
          message={
            <>
              <strong>Presupuesto total casi agotado:</strong> llevás gastados $
              {totalSpent.toFixed(2)} de ${budgetTotalLimit.toFixed(2)} este mes (
              {Math.round(totalPercentUsed)}%).
            </>
          }
        />
      )}

      {showVarWarning && (
        <DashboardAlert
          message={
            <>
              <strong>Presupuesto de variables casi agotado:</strong> $
              {varSpent.toFixed(2)} de ${budgetVarLimit.toFixed(2)} este mes (
              {Math.round(varPercentUsed)}%).
            </>
          }
        />
      )}

      <div className={styles.grid2}>
        <BudgetCard
          title="Presupuesto total (USD)"
          subtitle="Todos los gastos del mes, en dólares"
          primaryCurrency="usd"
          available={totalAvailable}
          total={budgetTotalLimit}
          spent={totalSpent}
          percentUsed={totalPercentUsed}
          showWarning={showTotalWarning}
        />
        <BudgetCard
          title="Presupuesto variables"
          subtitle="Día a día en pesos: tarjeta + efectivo/cuentas"
          primaryCurrency="ars"
          available={varAvailableArs ?? 0}
          total={budgetVarLimitArs ?? 0}
          spent={summary.variableTotalPesos}
          secondaryAvailable={varAvailable}
          secondaryTotal={budgetVarLimit}
          secondarySpent={varSpent}
          percentUsed={varPercentUsed}
          showWarning={showVarWarning}
        />
      </div>

      <div className={styles.grid2}>
        <ExpenseBreakdownCard
          periodLabel={periodLabel}
          fixedTotal={summary.fixedTotal}
          variableTotal={summary.variableTotal}
        />
        <RateInfoCard effective={effectiveRate} gapPercent={gapPercent} />
      </div>

      <div className={styles.grid2}>
        <DashboardAccountList accounts={accounts} rate={rate} />
        <InstallmentsCard installments={installments} />
      </div>

      <div className={styles.grid2}>
        <CreditCardsCard cards={creditCards} />
        <CategoryBreakdownCard items={summary.categoryTotals} />
      </div>

      <div className={styles.grid2}>
        <RecurringIncomesCard incomes={recurringIncomes} />
        <RecurringExpensesCard expenses={recurringExpenses} />
      </div>
    </div>
  );
}
