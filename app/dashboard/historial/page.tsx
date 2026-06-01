import Link from 'next/link';
import { fetchClosedPeriodsWithSummary } from '@/app/lib/data/financial-periods';
import { formatUsd, formatArs } from '@/app/lib/utils';
import { formatShortDate } from '@/app/ui/financial-periods/PeriodBadge';
import styles from './page.module.css';

export default async function HistorialPage() {
  const periods = await fetchClosedPeriodsWithSummary();

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Historial de períodos</h1>
        <p className={styles.pageSubtitle}>
          Ciclos financieros cerrados con sus totales
        </p>
      </header>

      {periods.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden>🗂️</span>
          <p className={styles.emptyText}>No hay períodos cerrados todavía</p>
          <p className={styles.emptySub}>
            Cuando cierres el período activo desde el Dashboard, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {periods.map((p) => {
            const balancePositive = p.balance_dollars >= 0;
            return (
              <div key={p.id} className={styles.periodCard}>
                <div className={styles.cardTop}>
                  <div className={styles.dateRange}>
                    <span className={styles.dateLabel}>Período cerrado</span>
                    <span className={styles.dateValue}>
                      {formatShortDate(p.start_date)}
                      {' → '}
                      {p.end_date ? formatShortDate(p.end_date) : '—'}
                    </span>
                  </div>
                  <span className={styles.closedBadge}>Cerrado</span>
                </div>

                <div className={styles.stats}>
                  <div className={styles.statBlock}>
                    <span className={styles.statLabel}>Ingresos</span>
                    <span className={styles.statValueIncome}>
                      {formatUsd(p.total_income_dollars)}
                    </span>
                    {p.total_income_pesos > 0 && (
                      <span className={styles.statSecondary}>
                        {formatArs(p.total_income_pesos)}
                      </span>
                    )}
                  </div>

                  <div className={styles.statBlock}>
                    <span className={styles.statLabel}>Egresos</span>
                    <span className={styles.statValueExpense}>
                      {formatArs(p.total_expense_pesos)}
                    </span>
                    <span className={styles.statSecondary}>
                      ≈ {formatUsd(p.total_expense_dollars)}
                    </span>
                  </div>

                  <div className={styles.statBlock}>
                    <span className={styles.statLabel}>Balance</span>
                    <span className={balancePositive ? styles.statValuePositive : styles.statValueNegative}>
                      {balancePositive ? '+' : ''}{formatUsd(p.balance_dollars)}
                    </span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.movCount}>
                    {p.movement_count} movimiento{p.movement_count !== 1 ? 's' : ''}
                  </span>
                  <Link
                    href={`/dashboard/historial/${p.id}`}
                    className={styles.detailLink}
                  >
                    Ver detalle →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
