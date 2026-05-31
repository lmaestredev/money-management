import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import InstallmentForm from '@/app/ui/installments/InstallmentForm';
import styles from './page.module.css';

export default async function NuevaCuotaPage() {
  const [accounts, cards, categories] = await Promise.all([
    fetchAccounts(),
    fetchActiveCreditCards(),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>Registrar compra en cuotas</h1>
      <InstallmentForm accounts={accounts} cards={cards} categories={categories} />
    </div>
  );
}
