import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchAccountById } from '@/app/lib/data/accounts';
import EditAccountForm from '@/app/ui/accounts/EditAccountForm';
import FormValidationBanner from '@/app/ui/FormValidationBanner';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditarCuentaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const account = await fetchAccountById(id);
  if (!account) notFound();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Editar cuenta</h1>
      <p className={styles.subtitle}>Actualiza la moneda y el saldo de la cuenta.</p>
      <FormValidationBanner error={error} />
      <EditAccountForm account={account} />
      <Link href="/dashboard/cuentas" className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver a Cuentas
      </Link>
    </div>
  );
}
