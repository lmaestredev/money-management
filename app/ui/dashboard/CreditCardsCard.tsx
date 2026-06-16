import Link from 'next/link';
import { formatUsd, formatArs } from '@/app/lib/utils';
import {
  cardDisplayDebtToUsd,
  getCardDisplayDebt,
} from '@/app/lib/utils/card-totals';
import type { CreditCard, InstallmentPurchase } from '@/app/lib/definitions';
import styles from './CreditCardsCard.module.css';

type Props = {
  cards?: CreditCard[];
  installments?: InstallmentPurchase[];
  rate?: number | null;
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

export default function CreditCardsCard({
  cards = [],
  installments = [],
  rate = null,
}: Props) {
  const activeCards = cards.filter((c) => c.active);
  const displayDebts = activeCards
    .map((c) => getCardDisplayDebt(c, installments))
    .filter((d) => d.pesos !== 0 || d.dollars !== 0);

  const totalPesos = displayDebts.reduce((sum, d) => sum + d.pesos, 0);
  const totalDollars = displayDebts.reduce((sum, d) => sum + d.dollars, 0);
  const totalUsd = displayDebts.reduce((sum, d) => sum + cardDisplayDebtToUsd(d, rate), 0);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Gastos por tarjeta</h2>
          <p className={styles.cardSubtitle}>Deuda del mes (incluye mínimo de cuotas)</p>
        </div>
        <Link href="/dashboard/tarjetas" className={styles.headerLink}>
          Ver todas
        </Link>
      </div>
      {activeCards.length > 0 ? (
        <>
          {displayDebts.length > 0 ? (
            <div className={styles.list}>
              {displayDebts.map((debt) => {
                const card = cards.find((c) => c.id === debt.cardId)!;
                const cur = card.currency === 'dollar' ? 'dollar' : 'peso';
                const primary =
                  cur === 'dollar'
                    ? formatMoney(debt.dollars, 'dollar')
                    : formatMoney(debt.pesos, 'peso');
                const limit = card.credit_limit;
                const debtAmount = cur === 'dollar' ? debt.dollars : debt.pesos;
                const pct = limit > 0 ? Math.min(100, (debtAmount / limit) * 100) : 0;
                const over = limit > 0 && debtAmount > limit;
                return (
                  <div key={debt.cardId} className={styles.creditCard}>
                    <div className={styles.ccHeader}>
                      <span className={styles.ccName}>{debt.cardName}</span>
                      <span className={styles.ccIcon} aria-hidden>
                        💳
                      </span>
                    </div>
                    <div className={styles.ccAmount}>{primary}</div>
                    {debt.cuotaFloorApplied && (
                      <div className={styles.ccLimit}>
                        Incluye mín. cuotas: {formatArs(debt.cuotaFloorPesos)}
                      </div>
                    )}
                    <div className={styles.ccLimit}>
                      {limit > 0 ? `Límite: ${formatMoney(limit, cur)}` : 'Sin límite definido'}
                    </div>
                    {limit > 0 && (
                      <div className={styles.ccProgress}>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${pct}%`, background: over ? '#dc2626' : undefined }}
                          />
                        </div>
                        <span className={styles.ccPct}>{Math.round(pct)}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.placeholder}>Sin deuda en tarjetas este mes.</p>
          )}
          <div className={styles.totalBlock}>
            <div className={styles.totalLabel}>Deuda total en tarjetas</div>
            <div className={styles.totalAmount}>
              {totalUsd > 0 ? formatUsd(totalUsd) : formatArs(0)}
              {totalPesos > 0 && totalUsd > 0 && ` · ${formatArs(totalPesos)}`}
            </div>
          </div>
        </>
      ) : (
        <p className={styles.placeholder}>
          No hay tarjetas de crédito registradas.{' '}
          <Link href="/dashboard/tarjetas/nueva" className={styles.placeholderLink}>
            Registrar una
          </Link>
        </p>
      )}
    </section>
  );
}
