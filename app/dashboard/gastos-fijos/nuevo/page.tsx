import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import RecurringExpenseForm from '@/app/ui/recurring/RecurringExpenseForm';
import FormValidationBanner from '@/app/ui/FormValidationBanner';
import styles from './page.module.css';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NuevoGastoFijoPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const [accounts, cards, categories] = await Promise.all([
    fetchAccounts(),
    fetchActiveCreditCards(),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>Registrar gasto fijo</h1>
      <FormValidationBanner error={error} />
      <RecurringExpenseForm accounts={accounts} cards={cards} categories={categories} />
    </div>
  );
}
