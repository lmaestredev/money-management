import Link from 'next/link';
import type { Movement } from '@/app/lib/definitions';
import DeleteMovementButton from './DeleteMovementButton';
import styles from './MovementList.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function recordTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    income: 'Ingreso',
    conversion: 'Conversión',
    variable_payment: 'Egreso',
    fixed_payment: 'Gasto fijo',
  };
  return labels[type] ?? type;
}

function getDayKey(m: Movement): string {
  const dateStr = m.payment_date ?? m.created_at;
  if (!dateStr) return 'unknown';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const formatted = d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });
  return isToday ? `Hoy · ${formatted}` : formatted;
}

function getCategoryIcon(categoryName: string | null, recordType: string): string {
  if (categoryName) {
    const name = categoryName.toLowerCase();
    if (name.includes('alquiler') || name.includes('rent')) return '🏠';
    if (name.includes('servicio') || name.includes('luz') || name.includes('internet')) return '⚡';
    if (name.includes('sueldo') || name.includes('salario')) return '💼';
    if (name.includes('freelance') || name.includes('proyecto')) return '💻';
    if (name.includes('super') || name.includes('comida') || name.includes('alimentación')) return '🛒';
    if (name.includes('hogar')) return '🏠';
    if (name.includes('trabajo')) return '💼';
  }
  switch (recordType) {
    case 'income':
      return '💼';
    case 'fixed_payment':
      return '🏠';
    case 'variable_payment':
      return '📉';
    case 'conversion':
      return '🔄';
    default:
      return '📄';
  }
}

function getDayTotal(movements: Movement[]): number {
  let total = 0;
  for (const m of movements) {
    if (m.record_type === 'income') total += m.amount_dollars;
    else if (
      (m.record_type === 'variable_payment' || m.record_type === 'fixed_payment') &&
      m.status === true
    ) {
      total -= m.amount_dollars;
    }
  }
  return total;
}

function getStatusLabel(m: Movement): 'paid' | 'pending' | 'overdue' {
  if (m.record_type === 'income') return 'paid';
  if (m.status === true) return 'paid';
  if (m.status === false && m.payment_date) {
    const due = new Date(m.payment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }
  return 'pending';
}

type Props = {
  movements: Movement[];
  accountNames: Map<string, string>;
};

export default function MovementList({ movements, accountNames }: Props) {
  if (movements.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📋</div>
        <p className={styles.emptyText}>No hay movimientos en este periodo.</p>
        <p className={styles.emptySub}>Añade un movimiento o cambia el mes.</p>
      </div>
    );
  }

  const byDay = new Map<string, Movement[]>();
  for (const m of movements) {
    const key = getDayKey(m);
    const list = byDay.get(key) ?? [];
    list.push(m);
    byDay.set(key, list);
  }

  const sortedDays = Array.from(byDay.keys()).sort((a, b) => (b > a ? 1 : -1));

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          Listado
          <span className={styles.countBadge}>{movements.length} movimientos</span>
        </h2>
        <div className={styles.sectionActions}>
          <button type="button" className={styles.btnGhost} aria-label="Exportar">
            ⬇ Exportar
          </button>
          <button type="button" className={styles.btnGhost} aria-label="Columnas">
            ⚙ Columnas
          </button>
        </div>
      </div>

      {sortedDays.map((dayKey) => {
        const dayMovements = byDay.get(dayKey)!;
        const dayTotal = getDayTotal(dayMovements);
        const firstDate = dayMovements[0]?.payment_date ?? dayMovements[0]?.created_at ?? dayKey;

        return (
          <div key={dayKey} className={styles.dayGroup}>
            <div className={styles.dayLabel}>
              <span className={styles.dayLabelText}>
                {formatDayLabel(firstDate).charAt(0).toUpperCase() + formatDayLabel(firstDate).slice(1)}
              </span>
              <span
                className={
                  dayTotal >= 0 ? styles.dayTotalPositive : styles.dayTotalNegative
                }
              >
                {dayTotal >= 0 ? '+' : '−'}
                {formatDollars(Math.abs(dayTotal))}
              </span>
            </div>

            {dayMovements.map((m) => {
              const isIncome = m.record_type === 'income';
              const isExpense =
                m.record_type === 'variable_payment' || m.record_type === 'fixed_payment';
              const isFixed = m.record_type === 'fixed_payment';
              const iconClass = isIncome
                ? styles.movIconIncome
                : isFixed
                  ? styles.movIconFixed
                  : styles.movIconExpense;
              const typeBadgeClass = isIncome
                ? styles.movTypeBadgeIncome
                : isFixed
                  ? styles.movTypeBadgeFixed
                  : styles.movTypeBadgeExpense;
              const amountClass = isIncome
                ? styles.movAmountPrimaryIncome
                : styles.movAmountPrimaryExpense;
              const status = getStatusLabel(m);

              return (
                <div key={m.id} className={styles.movementRow}>
                  <div className={`${styles.movIcon} ${iconClass}`}>
                    {getCategoryIcon(m.category_name ?? null, m.record_type)}
                  </div>
                  <div className={styles.movInfo}>
                    <div className={styles.movDescription}>
                      {m.description ?? '—'}
                    </div>
                    <div className={styles.movMeta}>
                      <span className={`${styles.movTypeBadge} ${typeBadgeClass}`}>
                        {recordTypeLabel(m.record_type)}
                      </span>
                      <span className={styles.movAccount}>
                        🏦 {(m.account_id && (accountNames.get(m.account_id) ?? m.account_id)) ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.movCategory}>
                    {m.category_name ?? 'Sin categoría'}
                  </div>
                  <div className={styles.movAmounts}>
                    <div className={`${styles.movAmountPrimary} ${amountClass}`}>
                      {isIncome ? '+' : '−'}
                      {formatDollars(m.amount_dollars)}
                    </div>
                    <div className={styles.movAmountSecondary}>
                      {formatPesos(m.amount_pesos)}
                    </div>
                  </div>
                  <div className={styles.movStatus}>
                    <span
                      className={
                        status === 'paid'
                          ? styles.statusPillPaid
                          : status === 'overdue'
                            ? styles.statusPillOverdue
                            : styles.statusPillPending
                      }
                    >
                      <span className={styles.statusDot} />
                      {status === 'paid' ? 'Pagado' : status === 'overdue' ? 'Vencido' : 'Pendiente'}
                    </span>
                  </div>
                  <div className={styles.movActions}>
                    <Link
                      href={`/dashboard/movimientos/editar/${m.id}?period=${m.period}`}
                      className={styles.actionBtn}
                      title="Editar"
                      aria-label="Editar movimiento"
                    >
                      ✏️
                    </Link>
                    <DeleteMovementButton id={m.id} period={m.period} description={m.description} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
