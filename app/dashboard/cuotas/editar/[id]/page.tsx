import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchInstallmentById } from '@/app/lib/data/installments';
import { fetchAccounts } from '@/app/lib/data/accounts';
import { fetchActiveCreditCards } from '@/app/lib/data/credit-cards';
import { fetchCategories } from '@/app/lib/data/categories';
import { createClient } from '@/app/lib/supabase/server';
import EditInstallmentForm from '@/app/ui/installments/EditInstallmentForm';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarCuotaPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const [installment, accounts, cards, categories] = await Promise.all([
    fetchInstallmentById(id, user.id),
    fetchAccounts(user.id),
    fetchActiveCreditCards(user.id),
    fetchCategories(),
  ]);
  if (!installment) notFound();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Editar compra en cuotas</h1>
      <p className={styles.subtitle}>Corrige el monto o las cuotas ya pagadas.</p>
      <EditInstallmentForm
        installment={installment}
        accounts={accounts}
        cards={cards}
        categories={categories}
      />
      <Link href="/dashboard/cuotas" className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver a Cuotas
      </Link>
    </div>
  );
}
