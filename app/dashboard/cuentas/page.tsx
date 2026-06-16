import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchAccounts, getAccountBalance } from '@/app/lib/data/accounts';
import CuentasPageInfoBox from '@/app/ui/accounts/CuentasPageInfoBox';
import CuentasSummaryCards from '@/app/ui/accounts/CuentasSummaryCards';
import AccountCard from '@/app/ui/accounts/AccountCard';
import styles from './page.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  has_movements:
    'No se puede eliminar la cuenta porque tiene movimientos asociados. Elimina o reasigna esos movimientos primero.',
  notfound: 'La cuenta no existe o ya fue eliminada.',
  delete: 'No se pudo eliminar la cuenta. Intenta de nuevo.',
  validation: 'Solicitud inválida.',
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function CuentasPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;
  const accounts = await fetchAccounts();

  const totalPesos = accounts.reduce((sum, a) => {
    if (a.currency === 'peso') return sum + getAccountBalance(a);
    if (a.currency === 'dual') return sum + a.balance_pesos;
    return sum;
  }, 0);
  const totalDollars = accounts.reduce((sum, a) => {
    if (a.currency === 'dollar' || a.currency === 'crypto') return sum + getAccountBalance(a);
    if (a.currency === 'dual') return sum + a.balance_dollars;
    return sum;
  }, 0);
  const countPesos = accounts.filter((a) => a.currency === 'peso' || a.currency === 'dual').length;
  const countDollars = accounts.filter(
    (a) => a.currency === 'dollar' || a.currency === 'crypto' || a.currency === 'dual'
  ).length;

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

      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          <span aria-hidden>⛔</span>
          <span>{errorMessage}</span>
        </div>
      )}

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
