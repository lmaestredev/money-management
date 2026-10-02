import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { fetchPeriodById } from '@/app/lib/data/financial-periods';
import { fetchMovementsByFinancialPeriod } from '@/app/lib/data/movements';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { getEffectiveRate } from '@/app/lib/data/exchange-rates';
import { createClient } from '@/app/lib/supabase/server';
import { formatUsd, formatArs } from '@/app/lib/utils';
import { formatShortDate } from '@/app/ui/financial-periods/PeriodBadge';
import SummaryCards from '@/app/ui/movements/SummaryCards';
import MovementsPageClient from '@/app/ui/movements/MovementsPageClient';
import { computeSummary } from '@/app/lib/summary';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function HistorialDetailPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const userId = user.id;
  const { id } = await params;
  const [period, accounts, effectiveRate] = await Promise.all([
    fetchPeriodById(id, userId),
    fetchAccounts(userId),
    getEffectiveRate(userId),
  ]);

  if (!period) notFound();
  if (period.status !== 'closed') notFound();

  const movements = await fetchMovementsByFinancialPeriod(id, userId);
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const rate = effectiveRate?.rate ?? null;
  const summary = computeSummary(movements, rate);

  const dateRange = `${formatShortDate(period.start_date)} → ${
    period.end_date ? formatShortDate(period.end_date) : '—'
  }`;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Link href="/dashboard/historial" className={styles.backLink}>
          <ArrowLeftIcon className={styles.backIcon} aria-hidden />
          Volver al historial
        </Link>
        <div className={styles.closedChip}>
          <LockClosedIcon style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden />
          Período cerrado
        </div>
        <h1 className={styles.pageTitle}>{dateRange}</h1>
        <p className={styles.pageSubtitle}>
          {movements.length} movimiento{movements.length !== 1 ? 's' : ''} · solo lectura
        </p>
      </header>

      <p className={styles.readonlyNote}>
        Este período está cerrado. Los movimientos son de solo lectura.
      </p>

      <SummaryCards
        balance={summary.balance}
        totalIncome={summary.totalIncome}
        totalExpense={summary.totalExpense}
        totalExpensePesos={summary.totalExpensePesos}
        totalIncomePesos={summary.totalIncomePesos}
        rate={rate}
        incomeCount={summary.incomeCount}
        expenseCount={summary.expenseCount}
        balanceLabel="Balance del período"
      />

      <MovementsPageClient
        movements={movements}
        accountNames={accountNames}
        summary={{
          balance: summary.balance,
          totalIncome: summary.totalIncome,
          totalExpense: summary.totalExpense,
          incomeCount: summary.incomeCount,
          expenseCount: summary.expenseCount,
        }}
        readOnly
      />
    </div>
  );
}
