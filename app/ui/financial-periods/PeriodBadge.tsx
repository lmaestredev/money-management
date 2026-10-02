import type { FinancialPeriod } from '@/app/lib/definitions';
import { formatDateAR, todayAR } from '@/app/lib/dates';
import styles from './PeriodBadge.module.css';

/** Formatea una fecha ISO "YYYY-MM-DD" (o un Date) como "1 may. 2025". */
export function formatShortDate(iso: string | Date): string {
  // El driver devuelve las columnas DATE como Date a medianoche UTC: se formatea en UTC.
  return formatDateAR(iso, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Formatea el rango de un período financiero para usar en labels de cards. */
export function formatPeriodRange(period: FinancialPeriod | null): string {
  if (!period) return 'Período activo';
  const start = formatShortDate(period.start_date);
  if (!period.end_date) return `Desde ${start}`;
  return `${start} → ${formatShortDate(period.end_date)}`;
}

type Props = {
  period: FinancialPeriod | null;
};

/**
 * Badge que muestra el rango del período financiero activo en el header
 * de las páginas que antes usaban el MovementPeriodSelector.
 */
export default function PeriodBadge({ period }: Props) {
  if (!period) return null;
  const todayStr = formatShortDate(todayAR());

  return (
    <div className={styles.badge}>
      <span className={styles.label}>Período activo</span>
      <span className={styles.range}>
        {formatShortDate(period.start_date)}
        <span className={styles.arrow}> → </span>
        <span className={styles.today}>{todayStr}</span>
      </span>
    </div>
  );
}
