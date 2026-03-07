import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import styles from './page.module.css';

export default function Page() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Money Management
        </h1>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <p className={styles.text}>
            <strong>Bienvenido.</strong> Gestiona tus ingresos, egresos y
            finanzas personales en un solo lugar.
          </p>
          <Link href="/dashboard" className={styles.link}>
            <span>Ir al dashboard</span>
            <ArrowRightIcon className={styles.linkIcon} />
          </Link>
        </div>
      </div>
    </main>
  );
}
