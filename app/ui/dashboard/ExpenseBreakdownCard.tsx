import { formatUsdOrDash } from '@/app/lib/utils';
import styles from './ExpenseBreakdownCard.module.css';

export type ExpenseBreakdownCardProps = {
  periodLabel: string;
  fixedTotal: number;
  variableTotal: number;
  /** Sin cotización y con pesos sin convertir: se muestra "—" en esa línea. */
  fixedIncomplete?: boolean;
  variableIncomplete?: boolean;
};

export default function ExpenseBreakdownCard({
  periodLabel,
  fixedTotal,
  variableTotal,
  fixedIncomplete,
  variableIncomplete,
}: ExpenseBreakdownCardProps) {
  const total = fixedTotal + variableTotal;
  const anyIncomplete = Boolean(fixedIncomplete || variableIncomplete);
  const fixedPct = total > 0 && !anyIncomplete ? (fixedTotal / total) * 100 : 0;

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
        <span className={styles.expenseAmount}>−{formatUsdOrDash(fixedTotal, fixedIncomplete)}</span>
      </div>
      <div className={styles.expenseRow}>
        <div className={styles.expenseInfo}>
          <span className={styles.expenseIcon} aria-hidden>🛒</span>
          <div className={styles.expenseDetails}>
            <span className={styles.expenseName}>Gastos variables</span>
            <span className={styles.expenseStatus}>Comida, entretenimiento, etc.</span>
          </div>
        </div>
        <span className={styles.expenseAmount}>−{formatUsdOrDash(variableTotal, variableIncomplete)}</span>
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
        <span className={styles.tag}>Total: {formatUsdOrDash(total, anyIncomplete)}</span>
      </div>
    </section>
  );
}
