import Link from 'next/link';
import type { RecurringExpense } from '@/app/lib/definitions';
import styles from './RecurringExpensesCard.module.css';

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  expenses: RecurringExpense[];
};

export default function RecurringExpensesCard({ expenses }: Props) {
  const active = expenses.filter((e) => e.active);
  const monthlyTotal = active.reduce((sum, e) => sum + e.amount_dollars, 0);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Gastos fijos recurrentes</h2>
          <p className={styles.cardSubtitle}>Compromisos mensuales fijos</p>
        </div>
        <Link href="/dashboard/gastos-fijos" className={styles.manageLink}>
          Gestionar
        </Link>
      </div>

      {active.length === 0 ? (
        <p className={styles.placeholder}>
          No hay gastos fijos registrados.{' '}
          <Link href="/dashboard/gastos-fijos/nuevo" className={styles.inlineLink}>
            Registrar uno
          </Link>
          .
        </p>
      ) : (
        <>
          <div className={styles.list}>
            {active.map((e) => (
              <div key={e.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{e.name}</span>
                  <span className={styles.itemMeta}>
                    {e.category_name ?? 'Sin categoría'}
                    {e.pay_before_day ? ` · vence día ${e.pay_before_day}` : ''}
                  </span>
                </div>
                <span className={styles.itemAmount}>{formatDollars(e.amount_dollars)}</span>
              </div>
            ))}
          </div>
          <div className={styles.totalBlock}>
            <div className={styles.totalLabel}>Total fijo mensual</div>
            <div className={styles.totalAmount}>{formatDollars(monthlyTotal)}</div>
          </div>
        </>
      )}
    </section>
  );
}
