import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchCategories } from '@/app/lib/data/categories';
import { fetchRecurringIncomeById } from '@/app/lib/data/recurring-incomes';
import RecurringIncomeForm from '@/app/ui/recurring-incomes/RecurringIncomeForm';
import styles from '../../nuevo/page.module.css';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
};

export default async function EditarIngresoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { return: returnTo } = await searchParams;
  const [income, accounts, categories] = await Promise.all([
    fetchRecurringIncomeById(id),
    fetchAccounts(),
    fetchCategories(),
  ]);

  if (!income) notFound();

  const backHref = returnTo || '/dashboard/ingresos';

  return (
    <div>
      <Link href={backHref} className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver
      </Link>
      <h1 className={styles.title}>Editar ingreso recurrente</h1>
      <RecurringIncomeForm
        accounts={accounts}
        categories={categories}
        income={income}
        returnTo={returnTo}
      />
    </div>
  );
}
