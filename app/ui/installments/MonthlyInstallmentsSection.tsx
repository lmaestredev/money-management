import type { InstallmentPurchase } from '@/app/lib/definitions';
import { installmentPaymentLabel } from '@/app/lib/utils/installment-display';
import { payAllInstallmentsAction, payInstallmentAction } from '@/app/lib/actions/installments';
import DeleteInstallmentButton from '@/app/ui/installments/DeleteInstallmentButton';
import ItemActions from '@/app/ui/movements/ItemActions';
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
  pendingInstallments: InstallmentPurchase[];
  paidIds: Set<string>;
  period: string;
  rate: number | null;
};

export default function MonthlyInstallmentsSection({
  installments,
  pendingInstallments,
  paidIds,
  period,
  rate,
}: Props) {
  if (pendingInstallments.length === 0) return null;

  const pending = pendingInstallments;
  const allPendingCount = installments.filter((i) => !paidIds.has(i.id)).length;
  const doneCount = installments.filter((i) => paidIds.has(i.id)).length;
  const totalCount = installments.length;

  const pendingTotal = pending.reduce((sum, i) => sum + i.monthly_amount_pesos, 0);

  return (
    <section className={styles.section} aria-labelledby="cuotas-mes">
      <div className={styles.sectionHeader}>
        <h2 id="cuotas-mes" className={styles.sectionTitle}>
          Cuotas del mes
          <span className={styles.countBadge}>
            {doneCount}/{totalCount} pendiente
          </span>
        </h2>
        <div className={styles.headerActions}>
          <span className={styles.pendingTotal}>Pendiente: {formatPesos(pendingTotal)}</span>
          {allPendingCount > 0 && (
            <form action={payAllInstallmentsAction}>
              <input type="hidden" name="period" value={period} />
              <button type="submit" className={styles.payAllBtn}>
                Registrar todos
              </button>
            </form>
          )}
        </div>
      </div>

      <div className={styles.list}>
        {pending.map((i) => {
          const currentNumber = Math.min(i.paid_installments + 1, i.total_installments);
          return (
            <div key={i.id} className={styles.row}>
              <div className={styles.icon} aria-hidden>
                💳
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{i.name}</div>
                <div className={styles.meta}>
                  <span>🏦 {installmentPaymentLabel(i)}</span>
                  <span className={styles.cuotaNum}>
                    Cuota {currentNumber}/{i.total_installments}
                  </span>
                </div>
              </div>
              <div className={styles.amounts}>
                <div className={styles.amountPrimary}>
                  −{formatPesos(i.monthly_amount_pesos)}
                </div>
              </div>
              <div className={styles.action}>
                <form action={payInstallmentAction}>
                  <input type="hidden" name="installment_id" value={i.id} />
                  <input type="hidden" name="period" value={period} />
                  <button type="submit" className={styles.payBtn}>
                    Registrar pago
                  </button>
                </form>
              </div>
              <ItemActions
                editHref={`/dashboard/cuotas/editar/${i.id}?return=/dashboard/movimientos`}
                editLabel={`Editar ${i.name}`}
                deleteSlot={
                  <DeleteInstallmentButton
                    id={i.id}
                    name={i.name}
                    redirectTo="/dashboard/movimientos"
                  />
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
