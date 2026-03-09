import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchAccounts, getAccountBalance } from '@/app/lib/data/accounts';
import type { AccountCurrency } from '@/app/lib/definitions';
import CuentasPageInfoBox from '@/app/ui/accounts/CuentasPageInfoBox';
import CuentasSummaryCards from '@/app/ui/accounts/CuentasSummaryCards';
import AccountCard from '@/app/ui/accounts/AccountCard';
import styles from './page.module.css';

export default async function CuentasPage() {
  const accounts = await fetchAccounts();

  const totalPesos = accounts
    .filter((a) => a.currency === 'peso')
    .reduce((sum, a) => sum + getAccountBalance(a), 0);
  const totalDollars = accounts
    .filter((a) => a.currency === 'dollar' || a.currency === 'crypto')
    .reduce((sum, a) => sum + getAccountBalance(a), 0);
  const countPesos = accounts.filter((a) => a.currency === 'peso').length;
  const countDollars = accounts.filter((a) => a.currency === 'dollar' || a.currency === 'crypto').length;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Cuentas</h1>
          <p className={styles.pageSubtitle}>Gestiona tus cuentas bancarias y billeteras</p>
        </div>
        <Link href="/dashboard/cuentas/nueva" className={styles.newLink}>
          <PlusIcon className={styles.newLinkIcon} aria-hidden />
          Registrar cuenta
        </Link>
      </header>

      <CuentasPageInfoBox />

      <CuentasSummaryCards
        totalPesos={totalPesos}
        totalDollars={totalDollars}
        countPesos={countPesos}
        countDollars={countDollars}
        countTotal={accounts.length}
      />

      <section className={styles.section} aria-labelledby="cuentas-listado">
        <h2 id="cuentas-listado" className={styles.sectionTitle}>
          Listado
        </h2>
        {accounts.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden>
              🏦
            </span>
            <p className={styles.emptyText}>No hay cuentas registradas</p>
            <p className={styles.emptySub}>Registra una cuenta desde el botón superior para comenzar.</p>
            <Link href="/dashboard/cuentas/nueva" className={styles.emptyLink}>
              Registrar cuenta
            </Link>
          </div>
        ) : (
          <ul className={styles.accountsGrid}>
            {accounts.map((account) => (
              <li key={account.id}>
                <AccountCard account={account} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
