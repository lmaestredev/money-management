import { formatUsd, formatArs } from '@/app/lib/utils';
import styles from './BudgetCard.module.css';

type Props = {
  /** Moneda en la que están expresados available/total/spent. */
  primaryCurrency?: 'usd' | 'ars';
  available?: number;
  total?: number;
  spent?: number;
  /** Valores de referencia en la otra moneda (opcional), se muestran más chicos. */
  secondaryAvailable?: number | null;
  secondaryTotal?: number | null;
  secondarySpent?: number | null;
  percentUsed?: number;
  showWarning?: boolean;
  title?: string;
  subtitle?: string;
  /** Sin cotización: no se puede calcular. Muestra "—" y oculta la barra y las alertas. */
  unavailable?: boolean;
};

function formatPrimary(amount: number, currency: 'usd' | 'ars'): string {
  return currency === 'usd' ? formatUsd(amount) : formatArs(amount);
}

function formatSecondary(amount: number, primaryCurrency: 'usd' | 'ars'): string {
  // La referencia se muestra en la moneda contraria a la primaria.
  return primaryCurrency === 'usd' ? formatArs(amount) : formatUsd(amount);
}

export default function BudgetCard({
  primaryCurrency = 'usd',
  available = 0,
  total = 500,
  spent = 0,
  secondaryAvailable = null,
  secondaryTotal = null,
  secondarySpent = null,
  percentUsed = 0,
  showWarning = false,
  title = 'Presupuesto variables',
  subtitle = 'Límite mensual establecido',
  unavailable = false,
}: Props) {
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
  const displayPct = unavailable ? 0 : percentUsed || pct;
  const money = (amount: number, currency: 'usd' | 'ars') =>
    unavailable ? '—' : formatPrimary(amount, currency);

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
          <span className={styles.budgetAmountGroup}>
            <span className={styles.budgetAmount}>{money(available, primaryCurrency)}</span>
            {!unavailable && secondaryAvailable != null && (
              <span className={styles.budgetAmountSecondary}>
                ≈ {formatSecondary(secondaryAvailable, primaryCurrency)}
              </span>
            )}
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
        {unavailable && (
          <p className={styles.budgetStatus}>Sin cotización del dólar: no se puede calcular.</p>
        )}
        {!unavailable && showWarning && (
          <p className={styles.budgetStatus}>
            ⚠️ {Math.round(displayPct)}% del presupuesto utilizado
          </p>
        )}
      </div>
      <div className={styles.divider}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Presupuesto total:</span>
          <span className={styles.detailValueGroup}>
            <span className={styles.detailValue}>{money(total, primaryCurrency)}</span>
            {!unavailable && secondaryTotal != null && (
              <span className={styles.detailValueSecondary}>
                ≈ {formatSecondary(secondaryTotal, primaryCurrency)}
              </span>
            )}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Gastado:</span>
          <span className={styles.detailValueGroup}>
            <span className={styles.detailValueExpense}>{money(spent, primaryCurrency)}</span>
            {!unavailable && secondarySpent != null && (
              <span className={styles.detailValueSecondary}>
                ≈ {formatSecondary(secondarySpent, primaryCurrency)}
              </span>
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
