import Link from 'next/link';
import { PencilIcon } from '@heroicons/react/24/outline';
import { getAccountBalance } from '@/app/lib/data/accounts';
import { formatUsd, formatArs } from '@/app/lib/utils';
import DeleteAccountButton from './DeleteAccountButton';
import type { Account, AccountCurrency } from '@/app/lib/definitions';
import styles from './AccountCard.module.css';

const CURRENCY_LABELS: Record<AccountCurrency, string> = {
  peso: 'Pesos ARS',
  dollar: 'Dólares USD',
  crypto: 'Cripto',
  dual: 'Pesos y dólares',
};

const CURRENCY_VARIANTS: Record<AccountCurrency, 'peso' | 'dollar' | 'crypto' | 'dual'> = {
  peso: 'peso',
  dollar: 'dollar',
  crypto: 'crypto',
  dual: 'dual',
};

function formatBalance(currency: AccountCurrency, amount: number): string {
  if (currency === 'peso') return formatArs(amount);
  if (currency === 'dollar' || currency === 'dual') return formatUsd(amount);
  return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function getAccountIcon(currency: AccountCurrency): string {
  switch (currency) {
    case 'peso':
      return '🏦';
    case 'dollar':
      return '💵';
    case 'dual':
      return '💱';
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
    case 'dual':
      return 'Pesos y dólares';
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
        {account.currency === 'dual' ? (
          <>
            <div className={styles.accountAmount}>{formatUsd(account.balance_dollars)}</div>
            <div className={styles.accountAmountSecondary}>{formatArs(account.balance_pesos)}</div>
            <div className={styles.accountCurrency}>{CURRENCY_LABELS.dual}</div>
          </>
        ) : (
          <>
            <div className={styles.accountAmount}>{formatBalance(account.currency, balance)}</div>
            <div className={styles.accountCurrency}>{CURRENCY_LABELS[account.currency]}</div>
          </>
        )}
      </div>

      <footer className={styles.cardFooter}>
        <span className={styles.badge}>{getBadgeLabel(account.currency)}</span>
        {account.owner_name && (
          <span className={styles.ownerBadge}>
            <span aria-hidden>👤</span>
            {account.owner_name}
          </span>
        )}
      </footer>
    </article>
  );
}
