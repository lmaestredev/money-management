import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchAccounts, getAccountBalance } from '@/app/lib/data/accounts';
import type { AccountCurrency } from '@/app/lib/definitions';
import styles from './page.module.css';

const CURRENCY_LABELS: Record<AccountCurrency, string> = {
  peso: 'Pesos',
  dollar: 'Dólares',
  crypto: 'Cripto',
};

function formatBalance(currency: AccountCurrency, amount: number): string {
  if (currency === 'peso') {
    return amount.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  if (currency === 'dollar') {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

export default async function CuentasPage() {
  const accounts = await fetchAccounts();

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Cuentas</h1>
        <Link href="/dashboard/cuentas/nueva" className={styles.newLink}>
          <PlusIcon style={{ width: 1.25 * 16, height: 1.25 * 16 }} />
          Registrar cuenta
        </Link>
      </div>
      <p className={styles.subtitle}>
        Tus cuentas bancarias y billeteras. Registra banco, moneda y saldo actual.
      </p>
      <section>
        <h2 className={styles.sectionTitle}>Listado</h2>
        {accounts.length === 0 ? (
          <p className={styles.empty}>No hay cuentas. Registra una desde el botón superior.</p>
        ) : (
          <ul className={styles.list}>
            {accounts.map((account) => {
              const balance = getAccountBalance(account);
              const bankLabel = account.bank || account.name;
              return (
                <li key={account.id} className={styles.card}>
                  <div>
                    <div className={styles.cardBank}>{bankLabel}</div>
                    <div className={styles.cardCurrency}>{CURRENCY_LABELS[account.currency]}</div>
                  </div>
                  <span className={styles.cardBalance}>
                    {formatBalance(account.currency, balance)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
