import styles from './BudgetCard.module.css';

type Props = {
  available?: number;
  total?: number;
  spent?: number;
  percentUsed?: number;
  showWarning?: boolean;
  title?: string;
  subtitle?: string;
};

export default function BudgetCard({
  available = 0,
  total = 500,
  spent = 0,
  percentUsed = 0,
  showWarning = false,
  title = 'Presupuesto variables',
  subtitle = 'Límite mensual establecido',
}: Props) {
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
  const displayPct = percentUsed || pct;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          <p className={styles.cardSubtitle}>{subtitle}</p>
        </div>
      </div>
      <div className={styles.budgetBlock}>
        <div className={styles.budgetRow}>
          <span className={styles.budgetLabel}>Disponible</span>
          <span className={styles.budgetAmount}>
            ${available.toFixed(2)}
          </span>
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${displayPct >= 80 ? styles.progressFillWarning : ''}`}
              style={{ width: `${Math.min(100, displayPct)}%` }}
            />
          </div>
        </div>
        {showWarning && (
          <p className={styles.budgetStatus}>
            ⚠️ {Math.round(displayPct)}% del presupuesto utilizado
          </p>
        )}
      </div>
      <div className={styles.divider}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Presupuesto total:</span>
          <span className={styles.detailValue}>${total.toFixed(2)}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Gastado:</span>
          <span className={styles.detailValueExpense}>${spent.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
