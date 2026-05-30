import Link from 'next/link';
import { PencilIcon } from '@heroicons/react/24/outline';
import { getAccountBalance } from '@/app/lib/data/accounts';
import DeleteAccountButton from './DeleteAccountButton';
import type { Account, AccountCurrency } from '@/app/lib/definitions';
import styles from './AccountCard.module.css';

const CURRENCY_LABELS: Record<AccountCurrency, string> = {
  peso: 'Pesos ARS',
  dollar: 'Dólares USD',
  crypto: 'Cripto',
};

const CURRENCY_VARIANTS: Record<AccountCurrency, 'peso' | 'dollar' | 'crypto'> = {
  peso: 'peso',
  dollar: 'dollar',
  crypto: 'crypto',
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

function getAccountIcon(currency: AccountCurrency): string {
  switch (currency) {
    case 'peso':
      return '🏦';
    case 'dollar':
      return '💵';
    case 'crypto':
      return '💳';
    default:
      return '🏦';
  }
}

function getBadgeLabel(currency: AccountCurrency): string {
  switch (currency) {
    case 'peso':
      return 'Pesos';
    case 'dollar':
      return 'Dólares';
    case 'crypto':
      return 'Efectivo / Cripto';
    default:
      return 'Cuenta';
  }
}

type Props = {
  account: Account;
};

export default function AccountCard({ account }: Props) {
  const balance = getAccountBalance(account);
  const variant = CURRENCY_VARIANTS[account.currency];
  const bankLabel = account.bank || account.name;

  return (
    <article className={`${styles.card} ${styles[`card_${variant}`]}`}>
      <div className={styles.cardHeader}>
        <div className={styles.accountInfo}>
          <div className={styles.accountIcon}>{getAccountIcon(account.currency)}</div>
          <div className={styles.accountDetails}>
            <div className={styles.accountName}>{account.name}</div>
            <div className={styles.accountBank}>{bankLabel}</div>
          </div>
        </div>
        <div className={styles.accountMenu}>
          <Link
            href={`/dashboard/cuentas/editar/${account.id}`}
            className={styles.menuBtn}
            title="Editar"
            aria-label={`Editar cuenta ${account.name}`}
          >
            <PencilIcon className={styles.menuIcon} />
          </Link>
          <DeleteAccountButton id={account.id} name={account.name} />
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.accountAmount}>{formatBalance(account.currency, balance)}</div>
        <div className={styles.accountCurrency}>{CURRENCY_LABELS[account.currency]}</div>
      </div>

      <footer className={styles.cardFooter}>
        <span className={styles.badge}>{getBadgeLabel(account.currency)}</span>
      </footer>
    </article>
  );
}
