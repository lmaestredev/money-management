import Link from 'next/link';
import { formatUsd } from '@/app/lib/utils';
import { PencilIcon } from '@heroicons/react/24/outline';
import type { Account, CardStatement, CreditCard } from '@/app/lib/definitions';
import DeleteCreditCardButton from './DeleteCreditCardButton';
import PayStatementForm from './PayStatementForm';
import styles from './CreditCardItem.module.css';

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  otra: 'Otra',
};

function formatMoney(amount: number, currency: 'peso' | 'dollar'): string {
  if (currency === 'peso') {
    return amount.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  card: CreditCard;
  accounts: Account[];
  statements: CardStatement[];
};

export default function CreditCardItem({ card, accounts, statements }: Props) {
  const cur = card.currency === 'dollar' ? 'dollar' : 'peso';
  const debt = cur === 'dollar' ? card.current_balance_dollars : card.current_balance_pesos;
  const limit = card.credit_limit;
  const pct = limit > 0 ? Math.min(100, (debt / limit) * 100) : 0;
  const available = Math.max(0, limit - debt);
  const overLimit = limit > 0 && debt > limit;

  const brand = card.brand ? BRAND_LABELS[card.brand] : null;
  const subtitle = [brand, card.bank].filter(Boolean).join(' · ');

  return (
    <article className={`${styles.card} ${!card.active ? styles.cardInactive : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardInfo}>
          <span className={styles.cardIcon} aria-hidden>💳</span>
          <div>
            <div className={styles.cardName}>{card.name}</div>
            {subtitle && <div className={styles.cardSub}>{subtitle}</div>}
          </div>
        </div>
        <div className={styles.cardMenu}>
          {!card.active && <span className={styles.inactiveBadge}>Inactiva</span>}
          <Link
            href={`/dashboard/tarjetas/editar/${card.id}`}
            className={styles.menuBtn}
            title="Editar"
            aria-label={`Editar tarjeta ${card.name}`}
          >
            <PencilIcon className={styles.menuIcon} />
          </Link>
          <DeleteCreditCardButton id={card.id} name={card.name} />
        </div>
      </div>

      <div className={styles.debtBlock}>
        <span className={styles.debtLabel}>Deuda actual</span>
        <span className={`${styles.debtAmount} ${overLimit ? styles.debtOver : ''}`}>
          {formatMoney(debt, cur)}
        </span>
      </div>

      {limit > 0 && (
        <div className={styles.limitBlock}>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${overLimit ? styles.progressOver : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className={styles.limitMeta}>
            <span>Límite {formatMoney(limit, cur)}</span>
            <span>{overLimit ? 'Excedido' : `Disponible ${formatMoney(available, cur)}`}</span>
          </div>
        </div>
      )}

      {(card.closing_day || card.due_day) && (
        <div className={styles.cycle}>
          {card.closing_day && <span>Cierre día {card.closing_day}</span>}
          {card.due_day && <span>Vence día {card.due_day}</span>}
        </div>
      )}

      {card.owner_name && (
        <div className={styles.owner}>
          <span aria-hidden>👤</span> {card.owner_name}
        </div>
      )}

      {statements.length > 0 && (
        <div className={styles.statements}>
          <div className={styles.statementsTitle}>Resúmenes a pagar</div>
          {statements.map((st) => (
            <PayStatementForm key={st.id} statement={st} accounts={accounts} />
          ))}
        </div>
      )}
    </article>
  );
}
