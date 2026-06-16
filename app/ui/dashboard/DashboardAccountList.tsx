import type { Account } from '@/app/lib/definitions';
import { formatUsd } from '@/app/lib/utils';
import styles from './DashboardAccountList.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getAccountIcon(currency: string): string {
  if (currency === 'dollar') return '💵';
  if (currency === 'dual') return '💱';
  if (currency === 'crypto') return '₿';
  return '🏦';
}

function accountTypeLabel(currency: string, bank: string | null): string {
  if (bank) return bank;
  if (currency === 'peso') return 'Pesos';
  if (currency === 'dollar') return 'Dólares';
  if (currency === 'dual') return 'Pesos y dólares';
  return 'Efectivo';
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
                  {accountTypeLabel(account.currency, account.bank)}
                </span>
              </div>
            </div>
            {account.currency === 'dual' ? (
              <>
                <div className={styles.accountAmount}>{formatUsd(account.balance_dollars)}</div>
                <div className={styles.accountSecondary}>{formatPesos(account.balance_pesos)}</div>
              </>
            ) : (
              <>
                <div className={styles.accountAmount}>
                  {formatPesos(account.balance_pesos)}
                </div>
                <div className={styles.accountSecondary}>
                  {formatUsd(account.balance_dollars)}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
