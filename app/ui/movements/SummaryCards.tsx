import styles from './SummaryCards.module.css';

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type SummaryCardsProps = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  incomeCount: number;
  expenseCount: number;
  balancePercent?: number;
  expensePercent?: number;
};

export default function SummaryCards({
  balance,
  totalIncome,
  totalExpense,
  incomeCount,
  expenseCount,
  balancePercent = 0,
  expensePercent = 0,
}: SummaryCardsProps) {
  const incomePct = totalIncome > 0 ? Math.min(100, (balance / totalIncome) * 100) : 0;
  const displayBalancePct = balancePercent ?? incomePct;

  return (
    <div className={styles.summaryGrid}>
      <div className={`${styles.summaryCard} ${styles.summaryCardBalance}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Balance del mes</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconBalance}`}>💼</div>
        </div>
        <div className={styles.summaryCardAmount}>{formatDollars(balance)}</div>
        <div className={styles.summaryCardProgress}>
          <div className={styles.summaryCardProgressTrack}>
            <div
              className={`${styles.summaryCardProgressFill} ${styles.summaryCardProgressFillBalance}`}
              style={{ width: `${Math.min(100, Math.max(0, displayBalancePct))}%` }}
            />
          </div>
        </div>
        <div className={styles.summaryCardMeta}>
          {totalIncome > 0 ? (
            <>
              <span className={styles.summaryCardTag}>
                {Math.round(displayBalancePct)}% del ingreso
              </span>
              {' '}disponible
            </>
          ) : (
            <span className={styles.summaryCardTag}>Sin ingresos</span>
          )}
        </div>
      </div>

      <div className={`${styles.summaryCard} ${styles.summaryCardIncome}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Ingresos</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconIncome}`}>📈</div>
        </div>
        <div className={`${styles.summaryCardAmount} ${styles.summaryCardAmountIncome}`}>
          {formatDollars(totalIncome)}
        </div>
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

      <div className={`${styles.summaryCard} ${styles.summaryCardExpense}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Egresos</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconExpense}`}>📉</div>
        </div>
        <div className={`${styles.summaryCardAmount} ${styles.summaryCardAmountExpense}`}>
          {formatDollars(totalExpense)}
        </div>
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
