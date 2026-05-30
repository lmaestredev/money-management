import Link from 'next/link';
import type { RecurringIncome } from '@/app/lib/definitions';
import styles from './RecurringIncomesCard.module.css';

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  incomes: RecurringIncome[];
};

export default function RecurringIncomesCard({ incomes }: Props) {
  const active = incomes.filter((i) => i.active);
  const monthlyTotal = active.reduce((sum, i) => sum + i.amount_dollars, 0);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Ingresos recurrentes</h2>
          <p className={styles.cardSubtitle}>Sueldos y cobros mensuales fijos</p>
        </div>
        <Link href="/dashboard/ingresos" className={styles.manageLink}>
          Gestionar
        </Link>
      </div>

      {active.length === 0 ? (
        <p className={styles.placeholder}>
          No hay ingresos recurrentes registrados.{' '}
          <Link href="/dashboard/ingresos/nuevo" className={styles.inlineLink}>
            Registrar uno
          </Link>
          .
        </p>
      ) : (
        <>
          <div className={styles.list}>
            {active.map((i) => (
              <div key={i.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{i.name}</span>
                  <span className={styles.itemMeta}>
                    🏦 {i.account_name ?? 'Se elige al cobrar'}
                    {i.receive_day ? ` · día ${i.receive_day}` : ''}
                  </span>
                </div>
                <span className={styles.itemAmount}>+{formatDollars(i.amount_dollars)}</span>
              </div>
            ))}
          </div>
          <div className={styles.totalBlock}>
            <div className={styles.totalLabel}>Ingreso mensual estimado</div>
            <div className={styles.totalAmount}>+{formatDollars(monthlyTotal)}</div>
          </div>
        </>
      )}
    </section>
  );
}
