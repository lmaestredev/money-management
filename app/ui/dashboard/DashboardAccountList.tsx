import type { Account } from '@/app/lib/definitions';
import styles from './DashboardAccountList.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getAccountIcon(currency: string): string {
  if (currency === 'dollar') return '💵';
  if (currency === 'crypto') return '₿';
  return '🏦';
}

type Props = {
  accounts: Account[];
};

export default function DashboardAccountList({ accounts }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Saldos en cuentas</h2>
          <p className={styles.cardSubtitle}>Dinero disponible</p>
        </div>
      </div>
      <div className={styles.list}>
        {accounts.map((account) => (
          <div key={account.id} className={styles.accountCard}>
            <div className={styles.accountHeader}>
              <span className={styles.accountIcon} aria-hidden>
                {getAccountIcon(account.currency)}
              </span>
              <div className={styles.accountInfo}>
                <span className={styles.accountName}>{account.name}</span>
                <span className={styles.accountType}>
                  {account.bank ?? (account.currency === 'peso' ? 'Pesos' : account.currency === 'dollar' ? 'Dólares' : 'Efectivo')}
                </span>
              </div>
            </div>
            <div className={styles.accountAmount}>
              {formatPesos(account.balance_pesos)}
            </div>
            <div className={styles.accountSecondary}>
              {formatDollars(account.balance_dollars)} USD
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
