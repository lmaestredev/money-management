import Link from 'next/link';
import { formatUsd } from '@/app/lib/utils';
import { amountsToUsd } from '@/app/lib/utils/currency';
import { installmentPaymentLabel } from '@/app/lib/utils/installment-display';
import type { InstallmentPurchase } from '@/app/lib/definitions';
import styles from './InstallmentsCard.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

type Props = {
  installments: InstallmentPurchase[];
  rate: number | null;
};

export default function InstallmentsCard({ installments, rate }: Props) {
  const active = installments.filter((i) => i.status === 'active');
  const monthlyCommitted = active.reduce(
    (sum, i) => sum + amountsToUsd(i.monthly_amount_pesos, i.monthly_amount_dollars, rate),
    0
  );

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
                      {formatUsd(amountsToUsd(i.monthly_amount_pesos, i.monthly_amount_dollars, rate))}/mes
                    </span>
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemBank}>💳 {installmentPaymentLabel(i)}</span>
                    {i.monthly_amount_pesos > 0 && (
                      <span className={styles.itemRemaining}>{formatPesos(i.monthly_amount_pesos)}/mes</span>
                    )}
                    <span className={styles.itemRemaining}>
                      Faltan {formatUsd(amountsToUsd(i.remaining_amount_pesos, i.remaining_amount_dollars, rate))}
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
