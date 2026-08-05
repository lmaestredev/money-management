import { notFound, redirect } from 'next/navigation';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import { fetchMovementById } from '@/app/lib/data/movements';
import { createClient } from '@/app/lib/supabase/server';
import EditMovementForm from '@/app/ui/movements/EditMovementForm';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarMovimientoPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const [movement, accounts, cards, categories] = await Promise.all([
    fetchMovementById(id, user.id),
    fetchAccounts(user.id),
    fetchActiveCreditCards(user.id),
    fetchCategories(),
  ]);

  if (!movement) notFound();

  return (
    <div>
      <h1 className={styles.title}>Editar movimiento</h1>
      <EditMovementForm
        movement={movement}
        accounts={accounts}
        cards={cards}
        categories={categories}
      />
    </div>
  );
}
