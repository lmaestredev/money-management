import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchCreditCardById } from '@/app/lib/data/credit-cards';
import CreditCardForm from '@/app/ui/credit-cards/CreditCardForm';
import FormValidationBanner from '@/app/ui/FormValidationBanner';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditarTarjetaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const card = await fetchCreditCardById(id);
  if (!card) notFound();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Editar tarjeta</h1>
      <p className={styles.subtitle}>Actualiza los datos y el ciclo de facturación de la tarjeta.</p>
      <FormValidationBanner error={error} />
      <CreditCardForm card={card} />
      <Link href="/dashboard/tarjetas" className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver a Tarjetas
      </Link>
    </div>
  );
}
