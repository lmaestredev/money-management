import { formatUsd, formatArs } from '@/app/lib/utils';
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
  /** % cobrado vs ingresos programados (sueldos). Si no se pasa, la barra queda al 100%. */
  incomePercent?: number;
  /** Sueldos cobrados / total programado (muestra barra y leyenda en Movimientos). */
  recurringIncomeReceived?: number;
  recurringIncomeTotal?: number;
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
  incomePercent,
  recurringIncomeReceived = 0,
  recurringIncomeTotal = 0,
  balanceLabel = 'Balance del mes',
  balanceMeta,
}: SummaryCardsProps) {
  const incomePct = totalIncome > 0 ? Math.min(100, (balance / totalIncome) * 100) : 0;
  const displayBalancePct = balancePercent ?? incomePct;
  const displayIncomePct = incomePercent ?? 100;

  // Todas las cards: primario USD, secundario ARS.
  const balanceArs = rate != null ? balance * rate : null;
  const incomeArs =
    totalIncomePesos > 0 ? totalIncomePesos : rate ? totalIncome * rate : null;
  const expenseArs =
    totalExpensePesos > 0 ? totalExpensePesos : rate ? totalExpense * rate : null;

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
              style={{ width: `${Math.min(100, Math.max(0, displayIncomePct))}%` }}
            />
          </div>
        </div>
        <div className={styles.summaryCardMeta}>
          {recurringIncomeTotal > 0 ? (
            <>
              <span className={styles.summaryCardTag}>
                {recurringIncomeReceived}/{recurringIncomeTotal} sueldos cobrados
              </span>
            </>
          ) : (
            <>
              <span className={styles.summaryCardTag}>{incomeCount} movimientos</span>
              {' '}este mes
            </>
          )}
        </div>
      </div>

      {/* ── EGRESOS ── primario USD, secundario ARS */}
      <div className={`${styles.summaryCard} ${styles.summaryCardExpense}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Egresos</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconExpense}`}>📉</div>
        </div>
        <div className={`${styles.summaryCardAmount} ${styles.summaryCardAmountExpense}`}>
          {formatUsd(totalExpense)}
        </div>
        {expenseArs !== null && (
          <div className={styles.summaryCardSecondary}>≈ {formatArs(expenseArs)}</div>
        )}
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
