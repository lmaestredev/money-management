import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import RecurringExpenseForm from '@/app/ui/recurring/RecurringExpenseForm';
import styles from './page.module.css';

export default async function NuevoGastoFijoPage() {
  const [accounts, cards, categories] = await Promise.all([
    fetchAccounts(),
    fetchActiveCreditCards(),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>Registrar gasto fijo</h1>
      <RecurringExpenseForm accounts={accounts} cards={cards} categories={categories} />
    </div>
  );
}
