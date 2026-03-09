import styles from './ExpenseBreakdownCard.module.css';

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type ExpenseBreakdownCardProps = {
  periodLabel: string;
  fixedTotal: number;
  variableTotal: number;
};

export default function ExpenseBreakdownCard({
  periodLabel,
  fixedTotal,
  variableTotal,
}: ExpenseBreakdownCardProps) {
  const total = fixedTotal + variableTotal;
  const fixedPct = total > 0 ? (fixedTotal / total) * 100 : 0;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Desglose de gastos</h2>
          <p className={styles.cardSubtitle}>{periodLabel}</p>
        </div>
      </div>
      <div className={styles.expenseRow}>
        <div className={styles.expenseInfo}>
          <span className={styles.expenseIcon} aria-hidden>🔒</span>
          <div className={styles.expenseDetails}>
            <span className={styles.expenseName}>Gastos fijos</span>
            <span className={styles.expenseStatus}>Alquiler, servicios, etc.</span>
          </div>
        </div>
        <span className={styles.expenseAmount}>−{formatDollars(fixedTotal)}</span>
      </div>
      <div className={styles.expenseRow}>
        <div className={styles.expenseInfo}>
          <span className={styles.expenseIcon} aria-hidden>🛒</span>
          <div className={styles.expenseDetails}>
            <span className={styles.expenseName}>Gastos variables</span>
            <span className={styles.expenseStatus}>Comida, entretenimiento, etc.</span>
          </div>
        </div>
        <span className={styles.expenseAmount}>−{formatDollars(variableTotal)}</span>
      </div>
      <div className={styles.progressWrap}>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.min(100, fixedPct)}%` }}
          />
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.tag}>Total: {formatDollars(total)}</span>
      </div>
    </section>
  );
}
