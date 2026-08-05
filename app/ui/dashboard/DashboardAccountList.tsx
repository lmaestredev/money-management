import type { Account } from '@/app/lib/definitions';
import { getAccountBalance } from '@/app/lib/data/accounts';
import { formatUsd, formatArs } from '@/app/lib/utils';
import styles from './DashboardAccountList.module.css';

function getAccountIcon(currency: string): string {
  if (currency === 'dollar') return '💵';
  if (currency === 'crypto') return '₿';
  return '🏦';
}

type Props = {
  accounts: Account[];
  /** Tasa efectiva (pesos/USD), para mostrar una referencia secundaria. Null si no hay cotización. */
  rate?: number | null;
};

export default function DashboardAccountList({ accounts, rate = null }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Saldos en cuentas</h2>
          <p className={styles.cardSubtitle}>Dinero disponible</p>
        </div>
      </div>
      <div className={styles.list}>
        {accounts.map((account) => {
          const balance = getAccountBalance(account);
          const isPeso = account.currency === 'peso';
          const secondary = rate
            ? isPeso
              ? formatUsd(balance / rate)
              : formatArs(balance * rate)
            : null;
          return (
            <div key={account.id} className={styles.accountCard}>
              <div className={styles.accountHeader}>
                <span className={styles.accountIcon} aria-hidden>
                  {getAccountIcon(account.currency)}
                </span>
                <div className={styles.accountInfo}>
                  <span className={styles.accountName}>{account.name}</span>
                  <span className={styles.accountType}>
                    {account.bank ?? (isPeso ? 'Pesos' : account.currency === 'dollar' ? 'Dólares' : 'Efectivo')}
                  </span>
                </div>
              </div>
              <div className={styles.accountAmount}>
                {isPeso ? formatArs(balance) : formatUsd(balance)}
              </div>
              {secondary && <div className={styles.accountSecondary}>≈ {secondary}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
