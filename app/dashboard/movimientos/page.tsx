import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchMovementsByPeriod } from '@/app/lib/data/movements';
import MovementList from '@/app/ui/movements/MovementList';
import MovementPeriodSelector from '@/app/ui/movements/MovementPeriodSelector';
import styles from './page.module.css';

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function MovimientosPage({ searchParams }: Props) {
  const { period: periodParam } = await searchParams;
  const period = periodParam && /^\d{4}-\d{2}$/.test(periodParam)
    ? periodParam
    : getCurrentPeriod();

  const [accounts, movements] = await Promise.all([
    fetchAccounts(),
    fetchMovementsByPeriod(period),
  ]);

  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Movimientos</h1>
        <MovementPeriodSelector currentPeriod={period} />
        <Link href={`/dashboard/movimientos/nuevo?period=${period}`} className={styles.newLink}>
          <PlusIcon style={{ width: 1.25 * 16, height: 1.25 * 16 }} />
          Nuevo movimiento
        </Link>
      </div>
      <section>
        <h2 className={styles.sectionTitle}>Listado</h2>
        <MovementList movements={movements} accountNames={accountNames} />
      </section>
    </div>
  );
}
