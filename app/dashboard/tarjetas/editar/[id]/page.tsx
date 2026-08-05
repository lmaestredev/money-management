import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchCreditCardById } from '@/app/lib/data/credit-cards';
import { createClient } from '@/app/lib/supabase/server';
import CreditCardForm from '@/app/ui/credit-cards/CreditCardForm';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarTarjetaPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const card = await fetchCreditCardById(id, user.id);
  if (!card) notFound();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Editar tarjeta</h1>
      <p className={styles.subtitle}>Actualiza los datos y el ciclo de facturación de la tarjeta.</p>
      <CreditCardForm card={card} />
      <Link href="/dashboard/tarjetas" className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver a Tarjetas
      </Link>
    </div>
  );
}
