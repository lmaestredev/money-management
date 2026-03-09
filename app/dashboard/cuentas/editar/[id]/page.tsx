import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarCuentaPage({ params }: Props) {
  await params; // required for dynamic route
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Editar cuenta</h1>
      <p className={styles.subtitle}>
        La edición de cuentas estará disponible próximamente.
      </p>
      <Link href="/dashboard/cuentas" className={styles.backLink}>
        <ArrowLeftIcon className={styles.backIcon} aria-hidden />
        Volver a Cuentas
      </Link>
    </div>
  );
}
