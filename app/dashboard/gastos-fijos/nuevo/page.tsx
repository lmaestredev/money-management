import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchCategories } from '@/app/lib/data/categories';
import RecurringExpenseForm from '@/app/ui/recurring/RecurringExpenseForm';
import styles from './page.module.css';

export default async function NuevoGastoFijoPage() {
  const [accounts, categories] = await Promise.all([
    fetchAccounts(),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>Registrar gasto fijo</h1>
      <RecurringExpenseForm accounts={accounts} categories={categories} />
    </div>
  );
}
