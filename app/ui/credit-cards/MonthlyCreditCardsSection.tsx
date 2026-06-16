'use client';

import Link from 'next/link';
import { setCardStatementTotalAction } from '@/app/lib/actions/credit-cards';
import type { Account, CardStatement, CreditCard, InstallmentPurchase } from '@/app/lib/definitions';
import {
  cardDisplayDebtToUsd,
  getCardDisplayDebt,
} from '@/app/lib/utils/card-totals';
import { formatUsd } from '@/app/lib/utils';
import PayStatementForm from '@/app/ui/credit-cards/PayStatementForm';
import styles from './MonthlyCreditCardsSection.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

type Props = {
  cards: CreditCard[];
  installments: InstallmentPurchase[];
  unpaidStatements: CardStatement[];
  accounts: Account[];
  period: string;
  rate: number | null;
};

function CardRow({
  debt,
  card,
  statements,
  accounts,
  period,
  rate,
}: {
  debt: ReturnType<typeof getCardDisplayDebt>;
  card: CreditCard;
  statements: CardStatement[];
  accounts: Account[];
  period: string;
  rate: number | null;
}) {
  const cardStatements = statements.filter((s) => s.credit_card_id === card.id);
  const showPesos = card.currency === 'peso' || card.currency === 'dual';
  const showDollars =
    card.currency === 'dollar' || card.currency === 'dual' || card.currency === 'crypto';
  const hasAmount = debt.pesos !== 0 || debt.dollars !== 0;

  return (
    <div className={styles.row}>
      <div className={styles.icon} aria-hidden>
        💳
      </div>
      <div className={styles.info}>
        <div className={styles.name}>{debt.cardName}</div>
        <div className={styles.meta}>
          <span>Total del mes</span>
          {debt.cuotaFloorApplied && (
            <span className={styles.floorHint}>
              Mín. cuotas: {formatPesos(debt.cuotaFloorPesos)}
              {debt.cuotaFloorDollars > 0 && ` · ${formatUsd(debt.cuotaFloorDollars)}`}
            </span>
          )}
        </div>
      </div>
      <div className={styles.amounts}>
        {hasAmount ? (
          <>
            <div className={styles.amountPrimary}>
              −{formatUsd(cardDisplayDebtToUsd(debt, rate))}
            </div>
            {debt.pesos > 0 && (
              <div className={styles.amountSecondary}>{formatPesos(debt.pesos)}</div>
            )}
            {debt.dollars > 0 && (
              <div className={styles.amountSecondary}>{formatUsd(debt.dollars)}</div>
            )}
          </>
        ) : (
          <div className={styles.amountSecondary}>Sin cargos</div>
        )}
      </div>
      <form action={setCardStatementTotalAction} className={styles.setTotalForm}>
        <input type="hidden" name="card_id" value={card.id} />
        <input type="hidden" name="period" value={period} />
        {!showPesos && <input type="hidden" name="total_pesos" value="0" />}
        {!showDollars && <input type="hidden" name="total_dollars" value="0" />}
        {showPesos && (
          <input
            name="total_pesos"
            type="number"
            step="0.01"
            min={debt.cuotaFloorPesos}
            className={styles.totalInput}
            defaultValue={debt.pesos || ''}
            placeholder="Pesos"
            aria-label={`Total en pesos para ${debt.cardName}`}
          />
        )}
        {showDollars && (
          <input
            name="total_dollars"
            type="number"
            step="0.01"
            min={debt.cuotaFloorDollars}
            className={styles.totalInput}
            defaultValue={debt.dollars || ''}
            placeholder="USD"
            aria-label={`Total en dólares para ${debt.cardName}`}
          />
        )}
        <button type="submit" className={styles.updateBtn}>
          Actualizar
        </button>
      </form>
      {cardStatements.length > 0 && (
        <div className={styles.payBlock}>
          {cardStatements.map((st) => (
            <PayStatementForm key={st.id} statement={st} accounts={accounts} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MonthlyCreditCardsSection({
  cards,
  installments,
  unpaidStatements,
  accounts,
  period,
  rate,
}: Props) {
  const activeCards = cards.filter((c) => c.active);
  if (activeCards.length === 0) return null;

  const cardDebts = activeCards.map((c) => getCardDisplayDebt(c, installments));
  const totalUsd = cardDebts.reduce((sum, d) => sum + cardDisplayDebtToUsd(d, rate), 0);
  const withDebt = cardDebts.filter((d) => d.pesos !== 0 || d.dollars !== 0).length;

  return (
    <section className={styles.section} aria-labelledby="tarjetas-mes">
      <div className={styles.sectionHeader}>
        <h2 id="tarjetas-mes" className={styles.sectionTitle}>
          Tarjetas del mes
          {withDebt > 0 && <span className={styles.countBadge}>{withDebt}</span>}
        </h2>
        <div className={styles.headerActions}>
          {totalUsd > 0 && (
            <span className={styles.pendingTotal}>Deuda: {formatUsd(totalUsd)}</span>
          )}
          <Link href="/dashboard/tarjetas" className={styles.manageLink}>
            Gestionar tarjetas
          </Link>
        </div>
      </div>

      <p className={styles.hint}>
        Un total por tarjeta (incluye cuotas). Las cuotas se controlan en{' '}
        <Link href="/dashboard/cuotas" className={styles.inlineLink}>
          Compras en cuotas
        </Link>
        .
      </p>

      <div className={styles.list}>
        {cardDebts.map((debt) => {
          const card = cards.find((c) => c.id === debt.cardId);
          if (!card) return null;
          return (
            <CardRow
              key={debt.cardId}
              debt={debt}
              card={card}
              statements={unpaidStatements}
              accounts={accounts}
              period={period}
              rate={rate}
            />
          );
        })}
      </div>
    </section>
  );
}
