import { redirect } from 'next/navigation';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import { currentPeriodAR, todayAR } from '@/app/lib/dates';
import { createClient } from '@/app/lib/supabase/server';
import MovementForm from '@/app/ui/movements/MovementForm';
import styles from './page.module.css';

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function NuevoMovimientoPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { period: periodParam } = await searchParams;
  const period =
    periodParam && /^\d{4}-\d{2}$/.test(periodParam)
      ? periodParam
      : currentPeriodAR();

  const [accounts, cards, categories] = await Promise.all([
    fetchAccounts(user.id),
    fetchActiveCreditCards(user.id),
    fetchCategories(),
  ]);

  return (
    <div>
      <h1 className={styles.title}>
        Nuevo movimiento
      </h1>
      <MovementForm
        period={period}
        accounts={accounts}
        cards={cards}
        categories={categories}
        defaultPaymentDate={todayAR()}
      />
    </div>
  );
}
