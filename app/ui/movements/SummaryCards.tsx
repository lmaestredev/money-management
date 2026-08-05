import { formatUsd, formatArs, arsEquivalent } from '@/app/lib/utils';
import styles from './SummaryCards.module.css';


export type SummaryCardsProps = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  /** Pesos crudos sumados de los egresos (amount_pesos). */
  totalExpensePesos?: number;
  /** Pesos crudos sumados de los ingresos (amount_pesos). */
  totalIncomePesos?: number;
  /** Tasa efectiva (pesos/USD). Si null, no se muestra el valor secundario. */
  rate?: number | null;
  incomeCount: number;
  expenseCount: number;
  balancePercent?: number;
  expensePercent?: number;
  balanceLabel?: string;
  balanceMeta?: React.ReactNode;
};

export default function SummaryCards({
  balance,
  totalIncome,
  totalExpense,
  totalExpensePesos = 0,
  totalIncomePesos = 0,
  rate = null,
  incomeCount,
  expenseCount,
  balancePercent = 0,
  expensePercent = 0,
  balanceLabel = 'Balance del mes',
  balanceMeta,
}: SummaryCardsProps) {
  const incomePct = totalIncome > 0 ? Math.min(100, (balance / totalIncome) * 100) : 0;
  const displayBalancePct = balancePercent ?? incomePct;

  // Valores secundarios (referencia, menos prominentes).
  // Balance y Ingresos: referencia en ARS = valor USD * tasa.
  const balanceArs = rate ? balance * rate : null;
  // Preferimos el equivalente ARS de todo lo convertido a USD (incluye montos
  // cargados directo en dólares, ej. un alquiler en USD) en vez del crudo en
  // pesos solo: si no, esos montos en USD quedan invisibles ("$0") en la
  // vista primaria en pesos de Egresos.
  const incomeArs = rate ? totalIncome * rate : totalIncomePesos > 0 ? totalIncomePesos : null;
  const expenseArs = arsEquivalent(totalExpense, totalExpensePesos, rate);

  return (
    <div className={styles.summaryGrid}>

      {/* ── BALANCE ── primario USD, secundario ARS */}
      <div className={`${styles.summaryCard} ${styles.summaryCardBalance}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>{balanceLabel}</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconBalance}`}>💼</div>
        </div>
        <div className={styles.summaryCardAmount}>{formatUsd(balance)}</div>
        {balanceArs !== null && (
          <div className={styles.summaryCardSecondary}>≈ {formatArs(balanceArs)}</div>
        )}
        <div className={styles.summaryCardProgress}>
          <div className={styles.summaryCardProgressTrack}>
            <div
              className={`${styles.summaryCardProgressFill} ${styles.summaryCardProgressFillBalance}`}
              style={{ width: `${Math.min(100, Math.max(0, displayBalancePct))}%` }}
            />
          </div>
        </div>
        <div className={styles.summaryCardMeta}>
          {balanceMeta !== undefined
            ? balanceMeta
            : totalIncome > 0
              ? (
                  <>
                    <span className={styles.summaryCardTag}>
                      {Math.round(displayBalancePct)}% del ingreso
                    </span>
                    {' '}disponible
                  </>
                )
              : (
                  <span className={styles.summaryCardTag}>Sin ingresos</span>
                )}
        </div>
      </div>

      {/* ── INGRESOS ── primario USD, secundario ARS */}
      <div className={`${styles.summaryCard} ${styles.summaryCardIncome}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Ingresos</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconIncome}`}>📈</div>
        </div>
        <div className={`${styles.summaryCardAmount} ${styles.summaryCardAmountIncome}`}>
          {formatUsd(totalIncome)}
        </div>
        {incomeArs !== null && (
          <div className={styles.summaryCardSecondary}>≈ {formatArs(incomeArs)}</div>
        )}
        <div className={styles.summaryCardProgress}>
          <div className={styles.summaryCardProgressTrack}>
            <div
              className={`${styles.summaryCardProgressFill} ${styles.summaryCardProgressFillIncome}`}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div className={styles.summaryCardMeta}>
          <span className={styles.summaryCardTag}>{incomeCount} movimientos</span>
          {' '}este mes
        </div>
      </div>

      {/* ── EGRESOS ── primario ARS (equivalente), secundario USD convertido */}
      <div className={`${styles.summaryCard} ${styles.summaryCardExpense}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Egresos</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconExpense}`}>📉</div>
        </div>
        <div className={`${styles.summaryCardAmount} ${styles.summaryCardAmountExpense}`}>
          {formatArs(expenseArs)}
        </div>
        <div className={styles.summaryCardSecondary}>≈ {formatUsd(totalExpense)}</div>
        <div className={styles.summaryCardProgress}>
          <div className={styles.summaryCardProgressTrack}>
            <div
              className={`${styles.summaryCardProgressFill} ${styles.summaryCardProgressFillExpense}`}
              style={{
                width: `${Math.min(100, expensePercent || (totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0))}%`,
              }}
            />
          </div>
        </div>
        <div className={styles.summaryCardMeta}>
          <span className={styles.summaryCardTag}>{expenseCount} movimientos</span>
          {' '}este mes
        </div>
      </div>

    </div>
  );
}
