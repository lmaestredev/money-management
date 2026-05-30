import { notFound } from 'next/navigation';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchCategories } from '@/app/lib/data/categories';
import { fetchMovementById } from '@/app/lib/data/movements';
import EditMovementForm from '@/app/ui/movements/EditMovementForm';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarMovimientoPage({ params }: Props) {
  const { id } = await params;
  const [movement, accounts, categories] = await Promise.all([
    fetchMovementById(id),
    fetchAccounts(),
    fetchCategories(),
  ]);

  if (!movement) notFound();

  return (
    <div>
      <h1 className={styles.title}>Editar movimiento</h1>
      <EditMovementForm movement={movement} accounts={accounts} categories={categories} />
    </div>
  );
}
