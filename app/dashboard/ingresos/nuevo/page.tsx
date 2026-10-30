import { redirect } from 'next/navigation';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchCategories } from '@/app/lib/data/categories';
import { createClient } from '@/app/lib/supabase/server';
import RecurringIncomeForm from '@/app/ui/recurring-incomes/RecurringIncomeForm';
import styles from './page.module.css';

export default async function NuevoIngresoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [accounts, categories] = await Promise.all([
    fetchAccounts(user.id),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>Registrar ingreso recurrente</h1>
      <RecurringIncomeForm accounts={accounts} categories={categories} />
    </div>
  );
}
