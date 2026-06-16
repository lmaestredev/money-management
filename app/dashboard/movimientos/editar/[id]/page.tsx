import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import { fetchMovementById } from '@/app/lib/data/movements';
import EditMovementForm from '@/app/ui/movements/EditMovementForm';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
};

export default async function EditarMovimientoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { period: periodParam } = await searchParams;
  const [movement, accounts, cards, categories] = await Promise.all([
    fetchMovementById(id),
    fetchAccounts(),
    fetchActiveCreditCards(),
    fetchCategories(),
  ]);

  if (!movement) notFound();

  const backPeriod = periodParam ?? movement.period;
  const backHref = `/dashboard/movimientos?period=${backPeriod}`;

  return (
    <div className={styles.page}>
      <Link href={backHref} className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver a movimientos
      </Link>
      <header className={styles.header}>
        <h1 className={styles.title}>Editar movimiento</h1>
        {movement.description && (
          <p className={styles.subtitle}>{movement.description}</p>
        )}
      </header>
      <EditMovementForm
        movement={movement}
        accounts={accounts}
        cards={cards}
        categories={categories}
      />
    </div>
  );
}
