import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByPeriod } from '@/app/lib/data/movements';
import type { Movement } from '@/app/lib/definitions';
import MovementPeriodSelector from '@/app/ui/movements/MovementPeriodSelector';
import MovementsPageClient, { type MovementSummary } from '@/app/ui/movements/MovementsPageClient';
import styles from './page.module.css';

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function computeSummary(movements: Movement[]): MovementSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const m of movements) {
    if (m.record_type === 'income') {
      totalIncome += m.amount_dollars;
      incomeCount += 1;
    } else if (
      m.record_type === 'variable_payment' ||
      m.record_type === 'fixed_payment'
    ) {
      if (m.status === true) {
        totalExpense += m.amount_dollars;
      }
      expenseCount += 1;
    }
  }

  const balance = totalIncome - totalExpense;

  return {
    balance,
    totalIncome,
    totalExpense,
    incomeCount,
    expenseCount,
  };
}

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function MovimientosPage({ searchParams }: Props) {
  const { period: periodParam } = await searchParams;
  const period =
    periodParam && /^\d{4}-\d{2}$/.test(periodParam)
      ? periodParam
      : getCurrentPeriod();

  const [accounts, movements] = await Promise.all([
    fetchAccounts(),
    fetchMovementsByPeriod(period),
  ]);

  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const summary = computeSummary(movements);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Movimientos</h1>
          <p className={styles.pageSubtitle}>
            Seguimiento de ingresos y egresos
          </p>
        </div>
        <div className={styles.headerActions}>
          <MovementPeriodSelector currentPeriod={period} />
          <Link
            href={`/dashboard/movimientos/nuevo?period=${period}`}
            className={styles.newLink}
          >
            <PlusIcon className={styles.newLinkIcon} aria-hidden />
            Nuevo movimiento
          </Link>
        </div>
      </header>

      <MovementsPageClient
        movements={movements}
        accountNames={accountNames}
        summary={summary}
      />
    </div>
  );
}
