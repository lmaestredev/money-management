import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchInstallments } from '@/app/lib/data/installments';
import { formatUsd } from '@/app/lib/utils';
import styles from './page.module.css';

export default async function CuotasPage() {
  const installments = await fetchInstallments();
  const active = installments.filter((i) => i.status === 'active');
  const monthlyCommitted = active.reduce((sum, i) => sum + i.monthly_amount_dollars, 0);
  const remainingTotal = active.reduce((sum, i) => sum + i.remaining_amount_dollars, 0);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Compras en cuotas</h1>
          <p className={styles.pageSubtitle}>Artículos financiados y su progreso de pago</p>
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
            <span className={styles.summaryValueExpense}>{formatUsd(monthlyCommitted)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Saldo total faltante</span>
            <span className={styles.summaryValueExpense}>{formatUsd(remainingTotal)}</span>
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
                  <div className={styles.itemBank}>💳 {i.account_name ?? 'Sin tarjeta'}</div>
                  <div className={styles.itemAmounts}>
                    <span className={styles.itemMonthly}>
                      {formatUsd(i.monthly_amount_dollars)}/mes
                    </span>
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
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
