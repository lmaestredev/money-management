import type { InstallmentPurchase } from '@/app/lib/definitions';
import { formatUsd } from '@/app/lib/utils';
import { payInstallmentAction } from '@/app/lib/actions/installments';
import PayInstallmentButton from './PayInstallmentButton';
import styles from './MonthlyInstallmentsSection.module.css';

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
  paidIds: Set<string>;
  period: string;
};

export default function MonthlyInstallmentsSection({ installments, paidIds, period }: Props) {
  if (installments.length === 0) return null;

  const pendingInstallments = installments.filter((i) => !paidIds.has(i.id));
  const pendingTotalPesos = pendingInstallments.reduce((sum, i) => sum + i.monthly_amount_pesos, 0);
  const pendingTotalDollars = pendingInstallments.reduce((sum, i) => sum + i.monthly_amount_dollars, 0);

  return (
    <section className={styles.section} aria-labelledby="cuotas-mes">
      <div className={styles.sectionHeader}>
        <h2 id="cuotas-mes" className={styles.sectionTitle}>
          Cuotas del mes
          <span className={styles.countBadge}>{installments.length}</span>
        </h2>
        <span className={styles.pendingTotal}>
          Pendiente: {formatPesos(pendingTotalPesos)}
          {pendingTotalDollars > 0 && ` (${formatUsd(pendingTotalDollars)})`}
        </span>
      </div>

      <div className={styles.list}>
        {installments.map((i) => {
          const isPaid = paidIds.has(i.id);
          const currentNumber = Math.min(i.paid_installments + (isPaid ? 0 : 1), i.total_installments);
          return (
            <div key={i.id} className={styles.row}>
              <div className={styles.icon} aria-hidden>
                💳
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{i.name}</div>
                <div className={styles.meta}>
                  <span>🏦 {i.credit_card_name ?? i.account_name ?? 'Sin tarjeta'}</span>
                  <span className={styles.cuotaNum}>
                    Cuota {currentNumber}/{i.total_installments}
                  </span>
                </div>
              </div>
              <div className={styles.amounts}>
                <div className={styles.amountPrimary}>
                  −{formatPesos(i.monthly_amount_pesos)}
                </div>
                {i.monthly_amount_dollars > 0 && (
                  <div className={styles.amountSecondary}>
                    {formatUsd(i.monthly_amount_dollars)}
                  </div>
                )}
              </div>
              <div className={styles.action}>
                {isPaid ? (
                  <span className={styles.statusPaid}>
                    <span className={styles.statusDot} />
                    Pagada
                  </span>
                ) : (
                  <form action={payInstallmentAction}>
                    <input type="hidden" name="installment_id" value={i.id} />
                    <input type="hidden" name="period" value={period} />
                    <PayInstallmentButton />
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
