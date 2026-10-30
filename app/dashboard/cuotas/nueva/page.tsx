import { redirect } from 'next/navigation';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import { createClient } from '@/app/lib/supabase/server';
import InstallmentForm from '@/app/ui/installments/InstallmentForm';
import styles from './page.module.css';

export default async function NuevaCuotaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [accounts, cards, categories] = await Promise.all([
    fetchAccounts(user.id),
    fetchActiveCreditCards(user.id),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>Registrar compra en cuotas</h1>
      <InstallmentForm accounts={accounts} cards={cards} categories={categories} />
    </div>
  );
}
