import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchCategories } from '@/app/lib/data/categories';
import RecurringIncomeForm from '@/app/ui/recurring-incomes/RecurringIncomeForm';
import styles from './page.module.css';

export default async function NuevoIngresoPage() {
  const [accounts, categories] = await Promise.all([
    fetchAccounts(),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>Registrar ingreso recurrente</h1>
      <RecurringIncomeForm accounts={accounts} categories={categories} />
    </div>
  );
}
