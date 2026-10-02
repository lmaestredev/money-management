import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByFinancialPeriod } from '@/app/lib/data/movements';
import { fetchInstallments } from '@/app/lib/data/installments';
import { fetchRecurringExpenses } from '@/app/lib/data/recurring';
import { fetchRecurringIncomes } from '@/app/lib/data/recurring-incomes';
import { fetchCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { currentPeriodAR } from '@/app/lib/dates';
import { computeSummary } from '@/app/lib/summary';
import { getSettings } from '@/app/lib/data/settings';
import {
  fetchExchangeRates,
  getEffectiveRate,
  refreshExchangeRatesIfStale,
} from '@/app/lib/data/exchange-rates';
import { createClient } from '@/app/lib/supabase/server';
import { arsEquivalent } from '@/app/lib/utils';
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
import CreditCardsCard from '@/app/ui/dashboard/CreditCardsCard';
import RateInfoCard from '@/app/ui/dashboard/RateInfoCard';
import ClosePeriodButton from '@/app/ui/financial-periods/ClosePeriodButton';
import styles from './page.module.css';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const userId = user.id;

  const period = currentPeriodAR();

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
    getSettings(userId),
    getEffectiveRate(userId),
    fetchExchangeRates(),
  ]);

  const rate = effectiveRate?.rate ?? null;
  const summary = computeSummary(movements, rate);
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
  // Preferimos el equivalente ARS de lo convertido a USD (incluye montos
  // cargados directo en dólares) en vez del crudo en pesos solo.
  const varSpentArs = arsEquivalent(varSpent, summary.variableTotalPesos, rate);
  const varAvailableArs =
    budgetVarLimitArs != null ? Math.max(0, budgetVarLimitArs - varSpentArs) : null;

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
          spent={varSpentArs}
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
