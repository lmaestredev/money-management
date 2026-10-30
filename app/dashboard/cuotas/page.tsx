import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import { fetchInstallments } from '@/app/lib/data/installments';
import { createClient } from '@/app/lib/supabase/server';
import { formatArs, formatUsd } from '@/app/lib/utils';
import CompleteInstallmentButton from '@/app/ui/installments/CompleteInstallmentButton';
import DeleteInstallmentButton from '@/app/ui/installments/DeleteInstallmentButton';
import styles from './page.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  notfound: 'La compra en cuotas no existe o ya fue eliminada.',
  already_finished: 'Esa compra ya estaba marcada como pagada.',
  delete: 'No se pudo eliminar la compra. Intenta de nuevo.',
  validation: 'Solicitud inválida.',
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function CuotasPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;
  const installments = await fetchInstallments(user.id);
  const active = installments.filter((i) => i.status === 'active');
  const monthlyCommittedPesos = active.reduce((sum, i) => sum + i.monthly_amount_pesos, 0);
  const monthlyCommittedDollars = active.reduce((sum, i) => sum + i.monthly_amount_dollars, 0);
  const remainingTotalPesos = active.reduce((sum, i) => sum + i.remaining_amount_pesos, 0);
  const remainingTotalDollars = active.reduce((sum, i) => sum + i.remaining_amount_dollars, 0);

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

      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          <span aria-hidden>⛔</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {active.length > 0 && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Compras activas</span>
            <span className={styles.summaryValue}>{active.length}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Cuota mensual comprometida</span>
            <span className={styles.summaryValueExpense}>{formatArs(monthlyCommittedPesos)}</span>
            {monthlyCommittedDollars > 0 && (
              <span className={styles.summaryValueSecondary}>{formatUsd(monthlyCommittedDollars)}</span>
            )}
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Saldo total faltante</span>
            <span className={styles.summaryValueExpense}>{formatArs(remainingTotalPesos)}</span>
            {remainingTotalDollars > 0 && (
              <span className={styles.summaryValueSecondary}>{formatUsd(remainingTotalDollars)}</span>
            )}
          </div>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Listado</h2>
          <Link href="/dashboard/cuotas/historial" className={styles.historyLink}>
            Historial
          </Link>
        </div>
        {active.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden>
              💳
            </span>
            <p className={styles.emptyText}>No hay compras en cuotas activas</p>
            <p className={styles.emptySub}>Registra una compra financiada para seguir su progreso.</p>
            <Link href="/dashboard/cuotas/nueva" className={styles.emptyLink}>
              Registrar compra
            </Link>
          </div>
        ) : (
          <ul className={styles.grid}>
            {active.map((i) => {
              const pct =
                i.total_installments > 0
                  ? Math.min(100, (i.paid_installments / i.total_installments) * 100)
                  : 0;
              return (
                <li key={i.id} className={styles.itemCard}>
                  <div className={styles.itemTop}>
                    <span className={styles.itemName}>{i.name}</span>
                    <div className={styles.itemTopActions}>
                      <span className={styles.badgeActive}>Activa</span>
                      <Link
                        href={`/dashboard/cuotas/editar/${i.id}`}
                        className={styles.editBtn}
                        title="Editar"
                        aria-label={`Editar compra ${i.name}`}
                      >
                        <PencilIcon className={styles.editIcon} aria-hidden />
                      </Link>
                      <DeleteInstallmentButton id={i.id} name={i.name} />
                    </div>
                  </div>
                  <div className={styles.itemBank}>💳 {i.credit_card_name ?? i.account_name ?? 'Sin tarjeta'}</div>
                  <div className={styles.itemTotal}>
                    Total de la compra: {formatArs(i.total_amount_pesos)}
                    {i.total_amount_dollars > 0 && ` (${formatUsd(i.total_amount_dollars)})`}
                  </div>
                  <div className={styles.itemAmounts}>
                    <div className={styles.itemAmountGroup}>
                      <span className={styles.itemMonthly}>
                        {formatArs(i.monthly_amount_pesos)}/mes
                      </span>
                      {i.monthly_amount_dollars > 0 && (
                        <span className={styles.itemMonthlySecondary}>
                          {formatUsd(i.monthly_amount_dollars)}/mes
                        </span>
                      )}
                    </div>
                    <span className={styles.itemRemaining}>
                      Faltan {formatArs(i.remaining_amount_pesos)}
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
                  <div className={styles.itemFooter}>
                    <CompleteInstallmentButton id={i.id} name={i.name} />
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
