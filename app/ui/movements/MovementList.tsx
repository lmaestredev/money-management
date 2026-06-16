import { formatUsd } from '@/app/lib/utils';
import { movementToUsd } from '@/app/lib/utils/currency';
import { movementPaymentLabel } from '@/app/lib/utils/installment-display';
import { getMovementEditHref } from '@/app/lib/utils/movement-edit';
import { getMovementStatus } from '@/app/lib/utils/movement-status';
import type { Movement } from '@/app/lib/definitions';
import ItemActions from './ItemActions';
import DeleteMovementButton from './DeleteMovementButton';
import styles from './MovementList.module.css';

type AccountNames = Record<string, string>;

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

function getDayTotal(movements: Movement[], rate: number | null): number {
  let total = 0;
  for (const m of movements) {
    const usd = movementToUsd(m, rate);
    if (m.record_type === 'income') {
      total += usd;
    } else if (m.record_type === 'variable_payment' || m.record_type === 'fixed_payment') {
      const counts = m.credit_card_id ? true : m.status === true;
      if (counts) total -= usd;
    }
  }
  return total;
}

function pesosSecondary(m: Movement, usdAmount: number, rate: number | null): string | null {
  if (m.amount_pesos > 0) return formatPesos(m.amount_pesos);
  if (rate && rate > 0) return `≈ ${formatPesos(usdAmount * rate)}`;
  return null;
}

type Props = {
  movements: Movement[];
  accountNames: AccountNames;
  cardNames: AccountNames;
  rate: number | null;
  readOnly?: boolean;
  isFiltering?: boolean;
  showFilterEmpty?: boolean;
};

export default function MovementList({
  movements,
  accountNames,
  cardNames,
  rate,
  readOnly = false,
  isFiltering = false,
  showFilterEmpty = false,
}: Props) {
  if (movements.length === 0) {
    if (isFiltering && !showFilterEmpty) return null;

    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📋</div>
        <p className={styles.emptyText}>
          {isFiltering
            ? 'Ningún movimiento coincide con el filtro.'
            : 'No hay movimientos en este periodo.'}
        </p>
        <p className={styles.emptySub}>
          {isFiltering
            ? 'Probá con otro término o quitá los filtros.'
            : 'Añade un movimiento o cambia el mes.'}
        </p>
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
      </div>

      <div className={styles.listScroll}>
        {sortedDays.map((dayKey) => {
          const dayMovements = byDay.get(dayKey)!;
          const dayTotal = getDayTotal(dayMovements, rate);
          const firstDate = dayMovements[0]?.payment_date ?? dayMovements[0]?.created_at ?? dayKey;

          return (
            <div key={dayKey} className={styles.dayGroup}>
              <div className={styles.dayLabel}>
                <span className={styles.dayLabelText}>
                  {formatDayLabel(firstDate).charAt(0).toUpperCase() +
                    formatDayLabel(firstDate).slice(1)}
                </span>
                <span
                  className={
                    dayTotal >= 0 ? styles.dayTotalPositive : styles.dayTotalNegative
                  }
                >
                  {dayTotal >= 0 ? '+' : '−'}
                  {formatUsd(Math.abs(dayTotal))}
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
                const status = getMovementStatus(m);
                const usdAmount = movementToUsd(m, rate);
                const arsLine = pesosSecondary(m, usdAmount, rate);
                const accountLabel = movementPaymentLabel(m, cardNames, accountNames);

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
                        <span className={styles.movAccount}>🏦 {accountLabel}</span>
                      </div>
                    </div>
                    <div className={styles.movCategory}>
                      {m.category_name ?? 'Sin categoría'}
                    </div>
                    <div className={styles.movAmounts}>
                      <div className={`${styles.movAmountPrimary} ${amountClass}`}>
                        {isIncome ? '+' : isExpense ? '−' : ''}
                        {formatUsd(usdAmount)}
                      </div>
                      {arsLine && (
                        <div className={styles.movAmountSecondary}>{arsLine}</div>
                      )}
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
                        {status === 'paid'
                          ? 'Pagado'
                          : status === 'overdue'
                            ? 'Vencido'
                            : 'Pendiente'}
                      </span>
                    </div>
                    {!readOnly && (
                      <ItemActions
                        editHref={getMovementEditHref(m)}
                        editLabel={`Editar ${m.description ?? 'movimiento'}`}
                        deleteSlot={
                          <DeleteMovementButton
                            id={m.id}
                            period={m.period}
                            description={m.description}
                          />
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
