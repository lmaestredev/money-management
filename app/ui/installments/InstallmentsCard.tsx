import Link from 'next/link';
import { formatUsd } from '@/app/lib/utils';
import type { InstallmentPurchase } from '@/app/lib/definitions';
import styles from './InstallmentsCard.module.css';

type Props = {
  installments: InstallmentPurchase[];
};

export default function InstallmentsCard({ installments }: Props) {
  const active = installments.filter((i) => i.status === 'active');
  const monthlyCommitted = active.reduce((sum, i) => sum + i.monthly_amount_dollars, 0);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Compras en cuotas</h2>
          <p className={styles.cardSubtitle}>Financiación activa por tarjeta</p>
        </div>
        <Link href="/dashboard/cuotas" className={styles.manageLink}>
          Gestionar
        </Link>
      </div>

      {active.length === 0 ? (
        <p className={styles.placeholder}>
          No hay compras en cuotas activas.{' '}
          <Link href="/dashboard/cuotas/nueva" className={styles.inlineLink}>
            Registrar una
          </Link>
          .
        </p>
      ) : (
        <>
          <div className={styles.list}>
            {active.map((i) => {
              const pct =
                i.total_installments > 0
                  ? Math.min(100, (i.paid_installments / i.total_installments) * 100)
                  : 0;
              return (
                <div key={i.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemName}>{i.name}</span>
                    <span className={styles.itemMonthly}>
                      {formatUsd(i.monthly_amount_dollars)}/mes
                    </span>
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemBank}>💳 {i.account_name ?? 'Sin tarjeta'}</span>
                    <span className={styles.itemRemaining}>
                      Faltan {formatUsd(i.remaining_amount_dollars)}
                    </span>
                  </div>
                  <div className={styles.progressRow}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.progressLabel}>
                      {i.paid_installments}/{i.total_installments}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.totalBlock}>
            <div className={styles.totalLabel}>Cuota mensual comprometida</div>
            <div className={styles.totalAmount}>{formatUsd(monthlyCommitted)}</div>
          </div>
        </>
      )}
    </section>
  );
}
