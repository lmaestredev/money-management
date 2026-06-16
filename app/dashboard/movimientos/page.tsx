import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByFinancialPeriod } from '@/app/lib/data/movements';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { fetchActiveInstallments } from '@/app/lib/data/installments';
import { fetchActiveRecurringExpenses, fetchRecurringPaidIds } from '@/app/lib/data/recurring';
import {
  fetchActiveRecurringIncomes,
  fetchRecurringIncomeReceivedIds,
} from '@/app/lib/data/recurring-incomes';
import {
  fetchCreditCards,
  fetchStatementPaymentIds,
  fetchUnpaidStatements,
} from '@/app/lib/data/credit-cards';
import { computeMovementSummary, computeRecurringIncomeProgress } from '@/app/lib/data/movement-summary';
import {
  getEffectiveRate,
  refreshExchangeRatesIfStale,
} from '@/app/lib/data/exchange-rates';
import PeriodBadge from '@/app/ui/financial-periods/PeriodBadge';
import DashboardAlert from '@/app/ui/dashboard/DashboardAlert';
import SummaryCards from '@/app/ui/movements/SummaryCards';
import DollarRateBar from '@/app/ui/movements/DollarRateBar';
import MovementsPageClient from '@/app/ui/movements/MovementsPageClient';
import styles from './page.module.css';

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default async function MovimientosPage() {
  const period = getCurrentPeriod();

  await refreshExchangeRatesIfStale();

  const currentFinancialPeriod = await fetchCurrentPeriod();
  const financialPeriodId = currentFinancialPeriod?.id ?? '';

  const [
    accounts,
    cards,
    movements,
    activeInstallments,
    activeRecurring,
    paidRecurringIds,
    activeIncomes,
    receivedIncomeIds,
    unpaidStatements,
    statementPaymentIds,
    effectiveRate,
  ] = await Promise.all([
    fetchAccounts(),
    fetchCreditCards(),
    fetchMovementsByFinancialPeriod(financialPeriodId),
    fetchActiveInstallments(),
    fetchActiveRecurringExpenses(),
    fetchRecurringPaidIds(financialPeriodId),
    fetchActiveRecurringIncomes(),
    fetchRecurringIncomeReceivedIds(financialPeriodId),
    fetchUnpaidStatements(),
    fetchStatementPaymentIds(),
    getEffectiveRate(),
  ]);

  const accountNames = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const cardNames = Object.fromEntries(cards.map((c) => [c.id, c.name]));
  const rate = effectiveRate?.rate ?? null;
  const summary = computeMovementSummary(movements, rate, {
    statementPaymentIds,
    cards,
    installments: activeInstallments,
  });
  const incomeProgress = computeRecurringIncomeProgress(
    activeIncomes,
    receivedIncomeIds,
    summary.totalIncome,
    rate
  );
  const noRate = rate == null;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Movimientos</h1>
          <p className={styles.pageSubtitle}>Seguimiento de ingresos y egresos</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodBadge period={currentFinancialPeriod} />
          <Link
            href={`/dashboard/movimientos/nuevo?period=${period}`}
            className={styles.newLink}
          >
            <PlusIcon className={styles.newLinkIcon} aria-hidden />
            Nuevo movimiento
          </Link>
        </div>
      </header>

      <DollarRateBar effective={effectiveRate} />

      {noRate && (
        <DashboardAlert
          message={
            <>
              <strong>Sin cotización del dólar:</strong> los gastos en pesos no se están
              convirtiendo a USD. Usá el botón Actualizar o revisá{' '}
              <Link href="/dashboard/configuracion" className={styles.alertLink}>
                Configuración
              </Link>
              .
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
        incomePercent={incomeProgress.percent}
        recurringIncomeReceived={incomeProgress.receivedCount}
        recurringIncomeTotal={incomeProgress.totalCount}
        balanceLabel="Balance del mes"
      />

      <MovementsPageClient
        movements={movements}
        accountNames={accountNames}
        cardNames={cardNames}
        rate={rate}
        monthly={{
          incomes: activeIncomes,
          receivedIncomeIds: [...receivedIncomeIds],
          expenses: activeRecurring,
          paidRecurringIds: [...paidRecurringIds],
          cards,
          installments: activeInstallments,
          unpaidStatements,
          period,
          accounts,
        }}
      />
    </div>
  );
}
