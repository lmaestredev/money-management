import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByFinancialPeriod } from '@/app/lib/data/movements';
import { fetchCurrentPeriod } from '@/app/lib/data/financial-periods';
import { fetchActiveInstallments, fetchInstallmentPaidIds } from '@/app/lib/data/installments';
import { fetchActiveRecurringExpenses, fetchRecurringPaidIds } from '@/app/lib/data/recurring';
import {
  fetchActiveRecurringIncomes,
  fetchRecurringIncomeReceivedIds,
} from '@/app/lib/data/recurring-incomes';
import { getEffectiveRate } from '@/app/lib/data/exchange-rates';
import { createClient } from '@/app/lib/supabase/server';
import type { Movement } from '@/app/lib/definitions';
import PeriodBadge from '@/app/ui/financial-periods/PeriodBadge';
import MovementsPageClient, { type MovementSummary } from '@/app/ui/movements/MovementsPageClient';
import MonthlyInstallmentsSection from '@/app/ui/installments/MonthlyInstallmentsSection';
import MonthlyFixedExpensesSection from '@/app/ui/recurring/MonthlyFixedExpensesSection';
import MonthlyIncomesSection from '@/app/ui/recurring-incomes/MonthlyIncomesSection';
import styles from './page.module.css';

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Valor del movimiento en USD. Los importes en dólares se toman directo; los de
 * pesos se convierten con la tasa efectiva. Si no hay tasa, el monto en pesos no
 * puede convertirse y aporta 0.
 */
function toUsd(m: Movement, rate: number | null): number {
  const pesosUsd = rate && rate > 0 ? m.amount_pesos / rate : 0;
  return m.amount_dollars + pesosUsd;
}

function computeSummary(movements: Movement[], rate: number | null): MovementSummary {
  let totalIncome = 0;       // USD (convertido)
  let totalExpense = 0;      // USD (convertido)
  let totalIncomePesos = 0;  // ARS crudo
  let totalExpensePesos = 0; // ARS crudo
  let incomeCount = 0;
  let expenseCount = 0;

  for (const m of movements) {
    if (m.record_type === 'income') {
      totalIncome += toUsd(m, rate);
      totalIncomePesos += m.amount_pesos;
      incomeCount += 1;
    } else if (
      m.record_type === 'variable_payment' ||
      m.record_type === 'fixed_payment'
    ) {
      if (m.status === true) {
        totalExpense += toUsd(m, rate);
        totalExpensePesos += m.amount_pesos;
      }
      expenseCount += 1;
    }
  }

  const balance = totalIncome - totalExpense;

  return {
    balance,
    totalIncome,
    totalExpense,
    totalIncomePesos,
    totalExpensePesos,
    incomeCount,
    expenseCount,
  };
}

export default async function MovimientosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const userId = user.id;

  const period = getCurrentPeriod();

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
