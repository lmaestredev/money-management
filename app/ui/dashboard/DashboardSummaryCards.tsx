import { formatUsd, formatArs } from '@/app/lib/utils';
import styles from './DashboardSummaryCards.module.css';

export type DashboardSummaryCardsProps = {
  /** Gastos variados del mes (compras del día a día: no fijos, no cuotas). */
  variableExpensePesos: number;
  variableExpenseUsd: number;
  /** Gasto total del mes: variados + fijos + cuotas. */
  totalExpensePesos: number;
  totalExpenseUsd: number;
  /** Balance neto: ingresos − egresos. */
  balanceUsd: number;
  totalIncomeUsd: number;
  totalIncomePesos: number;
  rate: number | null;
};

export default function DashboardSummaryCards({
  variableExpensePesos,
  variableExpenseUsd,
  totalExpensePesos,
  totalExpenseUsd,
  balanceUsd,
  totalIncomeUsd,
  totalIncomePesos,
  rate,
}: DashboardSummaryCardsProps) {
  const balanceArs = rate ? balanceUsd * rate : null;
  const incomeArs = totalIncomePesos > 0 ? totalIncomePesos : rate ? totalIncomeUsd * rate : null;
  const balancePositive = balanceUsd >= 0;

  return (
    <div className={styles.summaryGrid}>
      {/* 1. Gasto variado — primario ARS, secundario USD */}
      <div className={`${styles.summaryCard} ${styles.summaryCardExpense}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Gasto variado</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconExpense}`}>🛒</div>
        </div>
        <div className={`${styles.summaryCardAmount} ${styles.summaryCardAmountExpense}`}>
          {formatArs(variableExpensePesos)}
        </div>
        <div className={styles.summaryCardSecondary}>≈ {formatUsd(variableExpenseUsd)}</div>
        <div className={styles.summaryCardMeta}>
          <span className={styles.summaryCardTag}>Día a día</span>
          {' '}compras, supermercado, salidas, etc.
        </div>
      </div>

      {/* 2. Gasto total — primario ARS, secundario USD */}
      <div className={`${styles.summaryCard} ${styles.summaryCardExpense}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Gasto total</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconExpense}`}>📉</div>
        </div>
        <div className={`${styles.summaryCardAmount} ${styles.summaryCardAmountExpense}`}>
          {formatArs(totalExpensePesos)}
        </div>
        <div className={styles.summaryCardSecondary}>≈ {formatUsd(totalExpenseUsd)}</div>
        <div className={styles.summaryCardMeta}>
          <span className={styles.summaryCardTag}>Variados + fijos + cuotas</span>
        </div>
      </div>

      {/* 3. Balance neto — primario USD, secundario ARS */}
      <div className={`${styles.summaryCard} ${styles.summaryCardBalance}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Balance neto</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconBalance}`}>💼</div>
        </div>
        <div className={styles.summaryCardAmount}>
          {balancePositive ? '+' : ''}{formatUsd(balanceUsd)}
        </div>
        {balanceArs !== null && (
          <div className={styles.summaryCardSecondary}>
            ≈ {balancePositive ? '+' : ''}{formatArs(balanceArs)}
          </div>
        )}
        <div className={styles.summaryCardMeta}>
          <span className={styles.summaryCardTag}>Ingresos − Egresos</span>
        </div>
      </div>

      {/* Ingresos — primario USD, secundario ARS */}
      <div className={`${styles.summaryCard} ${styles.summaryCardIncome}`}>
        <div className={styles.summaryCardHeader}>
          <span className={styles.summaryCardLabel}>Ingresos</span>
          <div className={`${styles.summaryCardIcon} ${styles.summaryCardIconIncome}`}>📈</div>
        </div>
        <div className={`${styles.summaryCardAmount} ${styles.summaryCardAmountIncome}`}>
          {formatUsd(totalIncomeUsd)}
        </div>
        {incomeArs !== null && (
          <div className={styles.summaryCardSecondary}>≈ {formatArs(incomeArs)}</div>
        )}
      </div>
    </div>
  );
}
