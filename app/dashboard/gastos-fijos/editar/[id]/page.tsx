import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchRecurringExpenseById } from '@/app/lib/data/recurring';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import { createClient } from '@/app/lib/supabase/server';
import EditRecurringExpenseForm from '@/app/ui/recurring/EditRecurringExpenseForm';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarGastoFijoPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const [expense, accounts, cards, categories] = await Promise.all([
    fetchRecurringExpenseById(id, user.id),
    fetchAccounts(user.id),
    fetchActiveCreditCards(user.id),
    fetchCategories(),
  ]);
  if (!expense) notFound();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Editar gasto fijo</h1>
      <p className={styles.subtitle}>Actualiza el monto u otros datos del gasto fijo.</p>
      <EditRecurringExpenseForm
        expense={expense}
        accounts={accounts}
        cards={cards}
        categories={categories}
      />
      <Link href="/dashboard/gastos-fijos" className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver a Gastos fijos
      </Link>
    </div>
  );
}
