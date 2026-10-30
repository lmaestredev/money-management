import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByFinancialPeriod } from '@/app/lib/data/movements';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { currentPeriodAR } from '@/app/lib/dates';
import { computeSummary } from '@/app/lib/summary';
import { fetchActiveInstallments, fetchInstallmentPaidIds } from '@/app/lib/data/installments';
import { fetchActiveRecurringExpenses, fetchRecurringPaidIds } from '@/app/lib/data/recurring';
import {
  fetchActiveRecurringIncomes,
  fetchRecurringIncomeReceivedIds,
} from '@/app/lib/data/recurring-incomes';
import { getEffectiveRate } from '@/app/lib/data/exchange-rates';
import { createClient } from '@/app/lib/supabase/server';
import PeriodBadge from '@/app/ui/financial-periods/PeriodBadge';
import MovementsPageClient from '@/app/ui/movements/MovementsPageClient';
import MonthlyInstallmentsSection from '@/app/ui/installments/MonthlyInstallmentsSection';
import MonthlyFixedExpensesSection from '@/app/ui/recurring/MonthlyFixedExpensesSection';
import MonthlyIncomesSection from '@/app/ui/recurring-incomes/MonthlyIncomesSection';
import styles from './page.module.css';

export default async function MovimientosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const userId = user.id;

  const period = currentPeriodAR();

  const currentFinancialPeriod = await fetchCurrentPeriod(userId);
  const financialPeriodId = currentFinancialPeriod?.id ?? '';

  const [
    accounts,
    movements,
    activeInstallments,
    paidInstallmentIds,
    activeRecurring,
    paidRecurringIds,
    activeIncomes,
    receivedIncomeIds,
    effectiveRate,
  ] = await Promise.all([
    fetchAccounts(userId),
    fetchMovementsByFinancialPeriod(financialPeriodId, userId),
    fetchActiveInstallments(userId),
    fetchInstallmentPaidIds(financialPeriodId, userId),
    fetchActiveRecurringExpenses(userId),
    fetchRecurringPaidIds(financialPeriodId, userId),
    fetchActiveRecurringIncomes(userId),
    fetchRecurringIncomeReceivedIds(financialPeriodId, userId),
    getEffectiveRate(userId),
  ]);

  const rate = effectiveRate?.rate ?? null;
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const summary = computeSummary(movements, rate);

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

      <MonthlyIncomesSection
        incomes={activeIncomes}
        receivedIds={receivedIncomeIds}
        period={period}
        accounts={accounts}
      />

      <MonthlyFixedExpensesSection
        expenses={activeRecurring}
        paidIds={paidRecurringIds}
        period={period}
        accounts={accounts}
      />

      <MonthlyInstallmentsSection
        installments={activeInstallments}
        paidIds={paidInstallmentIds}
        period={period}
      />

      <MovementsPageClient
        movements={movements}
        accountNames={accountNames}
        summary={summary}
        rate={rate}
      />
    </div>
  );
}
