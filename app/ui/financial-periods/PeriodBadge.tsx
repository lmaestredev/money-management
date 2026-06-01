import type { FinancialPeriod } from '@/app/lib/definitions';
import styles from './PeriodBadge.module.css';

/** Formatea una fecha ISO "YYYY-MM-DD" (o un Date) como "1 may. 2025". */
export function formatShortDate(iso: string | Date): string {
  // Si llega un Date object (el driver postgres devuelve DATE así), extraemos YYYY-MM-DD.
  const isoStr = iso instanceof Date ? iso.toISOString().slice(0, 10) : iso;
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
  const today = new Date();
  const todayStr = today.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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
