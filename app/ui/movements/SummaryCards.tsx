import styles from './SummaryCards.module.css';

function fmtUsd(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtArs(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

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
  // Egresos: referencia en USD ya viene calculada; el primario es ARS crudo.
  const balanceArs = rate ? balance * rate : null;
  // Para ingresos: si hay pesos registrados, los mostramos directo;
  // si el ingreso es mayormente en USD, mostramos el equivalente ARS.
  const incomeArs = totalIncomePesos > 0 ? totalIncomePesos : rate ? totalIncome * rate : null;

  return (
    <div className={styles.summaryGrid}>

      {/* ── BALANCE ── primario USD, secundario ARS */}
      <div className={`${styles.summaryCard} ${styles.summaryCardBalance}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>{balanceLabel}</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconBalance}`}>💼</div>
        </div>
        <div className={styles.summaryCardAmount}>{fmtUsd(balance)}</div>
        {balanceArs !== null && (
          <div className={styles.summaryCardSecondary}>≈ {fmtArs(balanceArs)}</div>
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
          {fmtUsd(totalIncome)}
        </div>
        {incomeArs !== null && (
          <div className={styles.summaryCardSecondary}>≈ {fmtArs(incomeArs)}</div>
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

      {/* ── EGRESOS ── primario ARS crudo, secundario USD convertido */}
      <div className={`${styles.summaryCard} ${styles.summaryCardExpense}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Egresos</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconExpense}`}>📉</div>
        </div>
        <div className={`${styles.summaryCardAmount} ${styles.summaryCardAmountExpense}`}>
          {fmtArs(totalExpensePesos)}
        </div>
        <div className={styles.summaryCardSecondary}>≈ {fmtUsd(totalExpense)}</div>
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
