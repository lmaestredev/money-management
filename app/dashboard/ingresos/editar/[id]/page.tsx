import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchRecurringIncomeById } from '@/app/lib/data/recurring-incomes';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchCategories } from '@/app/lib/data/categories';
import { createClient } from '@/app/lib/supabase/server';
import EditRecurringIncomeForm from '@/app/ui/recurring-incomes/EditRecurringIncomeForm';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarIngresoPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const [income, accounts, categories] = await Promise.all([
    fetchRecurringIncomeById(id, user.id),
    fetchAccounts(user.id),
    fetchCategories(),
  ]);
  if (!income) notFound();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Editar ingreso recurrente</h1>
      <p className={styles.subtitle}>Actualiza el monto u otros datos del ingreso.</p>
      <EditRecurringIncomeForm income={income} accounts={accounts} categories={categories} />
      <Link href="/dashboard/ingresos" className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver a Ingresos
      </Link>
    </div>
  );
}
