import Link from 'next/link';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { computeMovementSummary } from '@/app/lib/data/movement-summary';
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
import SummaryCards from '@/app/ui/movements/SummaryCards';
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

function getCurrentPeriod(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mm}`;
}

export default async function DashboardPage() {
  // Período YYYY-MM del mes actual: se usa como campo secundario en movimientos
  // (el filtro principal ya es financial_period_id).
  const period = getCurrentPeriod();

  // Red de seguridad: si las cotizaciones quedaron viejas, refrescamos antes de leer.
  await refreshExchangeRatesIfStale();

  const currentFinancialPeriod = await fetchCurrentPeriod();
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
    fetchAccounts(),
    fetchMovementsByFinancialPeriod(currentFinancialPeriodId),
    fetchInstallments(),
    fetchRecurringExpenses(),
    fetchRecurringIncomes(),
    fetchCreditCards(),
    fetchStatementPaymentIds(),
    getSettings(),
    getEffectiveRate(),
    fetchExchangeRates(),
  ]);

  const rate = effectiveRate?.rate ?? null;
  const activeInstallments = installments.filter(
    (i) => i.status === 'active' && i.paid_installments < i.total_installments
  );
  const summary = computeMovementSummary(movements, rate, {
    statementPaymentIds,
    cards: creditCards,
    installments: activeInstallments,
  });
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

  // Presupuesto de gastos variables.
  const budgetVarLimit = settings.budget_variable_usd;
  const varSpent = summary.variableTotal;
  const varAvailable = Math.max(0, budgetVarLimit - varSpent);
  const varPercentUsed = budgetVarLimit > 0 ? (varSpent / budgetVarLimit) * 100 : 0;
  const showVarWarning = varPercentUsed >= 80;

  const noRate = rate == null;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Resumen de tu situación financiera</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodBadge period={currentFinancialPeriod} />
          <ClosePeriodButton />
        </div>
      </header>

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

      <SummaryCards
        balance={summary.balance}
        totalIncome={summary.totalIncome}
        totalExpense={summary.totalExpense}
        totalExpensePesos={summary.totalExpensePesos}
        totalIncomePesos={summary.totalIncomePesos}
        rate={rate}
        incomeCount={summary.incomeCount}
        expenseCount={summary.expenseCount}
        balanceLabel="Balance neto"
        balanceMeta={<span className={styles.balanceMetaTag}>Ingresos − Egresos</span>}
      />

      <div className={styles.grid2}>
        <BudgetCard
          title="Presupuesto total"
          subtitle="Todos los gastos del mes"
          available={totalAvailable}
          total={budgetTotalLimit}
          spent={totalSpent}
          percentUsed={totalPercentUsed}
          showWarning={showTotalWarning}
        />
        <BudgetCard
          title="Presupuesto variables"
          subtitle="Tarjeta + efectivo/cuentas"
          available={varAvailable}
          total={budgetVarLimit}
          spent={varSpent}
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
        <DashboardAccountList accounts={accounts} />
        <InstallmentsCard installments={installments} rate={rate} />
      </div>

      <div className={styles.grid2}>
        <CreditCardsCard cards={creditCards} installments={activeInstallments} rate={rate} />
        <CategoryBreakdownCard items={summary.categoryTotals} />
      </div>

      <div className={styles.grid2}>
        <RecurringIncomesCard incomes={recurringIncomes} rate={rate} />
        <RecurringExpensesCard expenses={recurringExpenses} rate={rate} />
      </div>
    </div>
  );
}
