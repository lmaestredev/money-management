import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchInstallments } from '@/app/lib/data/installments';
import { getEffectiveRate, refreshExchangeRatesIfStale } from '@/app/lib/data/exchange-rates';
import { formatArs, formatUsd } from '@/app/lib/utils';
import { amountsToUsd } from '@/app/lib/utils/currency';
import { installmentPaymentLabel } from '@/app/lib/utils/installment-display';
import ItemActions from '@/app/ui/movements/ItemActions';
import DeleteInstallmentButton from '@/app/ui/installments/DeleteInstallmentButton';
import styles from './page.module.css';

export default async function CuotasPage() {
  await refreshExchangeRatesIfStale();
  const [installments, effectiveRate] = await Promise.all([
    fetchInstallments(),
    getEffectiveRate(),
  ]);
  const rate = effectiveRate?.rate ?? null;
  const active = installments.filter((i) => i.status === 'active');
  const monthlyCommittedPesos = active.reduce((sum, i) => sum + i.monthly_amount_pesos, 0);
  const remainingTotalPesos = active.reduce((sum, i) => sum + i.remaining_amount_pesos, 0);
  const monthlyCommittedUsd = active.reduce(
    (sum, i) => sum + amountsToUsd(i.monthly_amount_pesos, i.monthly_amount_dollars, rate),
    0
  );
  const remainingTotalUsd = active.reduce(
    (sum, i) => sum + amountsToUsd(i.remaining_amount_pesos, i.remaining_amount_dollars, rate),
    0
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Compras en cuotas</h1>
          <p className={styles.pageSubtitle}>Control de financiación — el pago es por tarjeta en Movimientos</p>
        </div>
        <Link href="/dashboard/cuotas/nueva" className={styles.newLink}>
          <PlusIcon className={styles.newLinkIcon} aria-hidden />
          Registrar compra
        </Link>
      </header>

      {active.length > 0 && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Compras activas</span>
            <span className={styles.summaryValue}>{active.length}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Cuota mensual comprometida</span>
            <span className={styles.summaryValueExpense}>{formatUsd(monthlyCommittedUsd)}</span>
            <span className={styles.summaryValueSecondary}>{formatArs(monthlyCommittedPesos)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Saldo total faltante</span>
            <span className={styles.summaryValueExpense}>{formatUsd(remainingTotalUsd)}</span>
            <span className={styles.summaryValueSecondary}>{formatArs(remainingTotalPesos)}</span>
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Listado</h2>
        {installments.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden>
              💳
            </span>
            <p className={styles.emptyText}>No hay compras en cuotas registradas</p>
            <p className={styles.emptySub}>Registra una compra financiada para seguir su progreso.</p>
            <Link href="/dashboard/cuotas/nueva" className={styles.emptyLink}>
              Registrar compra
            </Link>
          </div>
        ) : (
          <ul className={styles.grid}>
            {installments.map((i) => {
              const pct =
                i.total_installments > 0
                  ? Math.min(100, (i.paid_installments / i.total_installments) * 100)
                  : 0;
              const finished = i.status === 'finished';
              return (
                <li key={i.id} className={styles.itemCard}>
                  <div className={styles.itemTop}>
                    <span className={styles.itemName}>{i.name}</span>
                    <span className={finished ? styles.badgeFinished : styles.badgeActive}>
                      {finished ? 'Finalizada' : 'Activa'}
                    </span>
                  </div>
                  <div className={styles.itemBank}>💳 {installmentPaymentLabel(i)}</div>
                  <div className={styles.itemAmounts}>
                    <span className={styles.itemMonthly}>
                      {formatUsd(amountsToUsd(i.monthly_amount_pesos, i.monthly_amount_dollars, rate))}/mes
                    </span>
                    {i.monthly_amount_pesos > 0 && (
                      <span className={styles.itemRemaining}>
                        {formatArs(i.monthly_amount_pesos)}/mes
                      </span>
                    )}
                    <span className={styles.itemRemaining}>
                      Faltan {formatUsd(amountsToUsd(i.remaining_amount_pesos, i.remaining_amount_dollars, rate))}
                    </span>
                    {i.remaining_amount_pesos > 0 && (
                      <span className={styles.itemRemaining}>
                        {formatArs(i.remaining_amount_pesos)}
                      </span>
                    )}
                  </div>
                  <div className={styles.progressRow}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.progressLabel}>
                      {i.paid_installments}/{i.total_installments}
                    </span>
                  </div>
                  <div className={styles.itemFooter}>
                    <ItemActions
                      editHref={`/dashboard/cuotas/editar/${i.id}?return=/dashboard/cuotas`}
                      editLabel={`Editar ${i.name}`}
                      deleteSlot={
                        <DeleteInstallmentButton
                          id={i.id}
                          name={i.name}
                          redirectTo="/dashboard/cuotas"
                        />
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
