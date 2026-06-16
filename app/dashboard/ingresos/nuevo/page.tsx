import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchCategories } from '@/app/lib/data/categories';
import RecurringIncomeForm from '@/app/ui/recurring-incomes/RecurringIncomeForm';
import FormValidationBanner from '@/app/ui/FormValidationBanner';
import styles from './page.module.css';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NuevoIngresoPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const [accounts, categories] = await Promise.all([
    fetchAccounts(),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>Registrar ingreso recurrente</h1>
      <FormValidationBanner error={error} />
      <RecurringIncomeForm accounts={accounts} categories={categories} />
    </div>
  );
}
