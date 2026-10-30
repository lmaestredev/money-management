import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { fetchInstallments } from '@/app/lib/data/installments';
import { createClient } from '@/app/lib/supabase/server';
import { formatArs, formatUsd } from '@/app/lib/utils';
import styles from './page.module.css';

export default async function HistorialCuotasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const installments = await fetchInstallments(user.id);

  // Finalizadas primero, activas al final; dentro de cada grupo, alfabético.
  const sorted = [...installments].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'finished' ? -1 : 1;
    return a.name.localeCompare(b.name, 'es');
  });

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Historial de cuotas</h1>
          <p className={styles.pageSubtitle}>Todas las compras en cuotas, finalizadas y activas</p>
        </div>
        <Link href="/dashboard/cuotas" className={styles.backLink}>
          <ArrowLeftIcon className={styles.backIcon} aria-hidden />
          Volver a Cuotas
        </Link>
      </header>

      {sorted.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden>💳</span>
          <p className={styles.emptyText}>No hay compras en cuotas registradas</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Tarjeta / cuenta</th>
                <th>Cuotas</th>
                <th>Cuota mensual</th>
                <th>Total compra</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => {
                const finished = i.status === 'finished';
                return (
                  <tr key={i.id} className={finished ? styles.rowFinished : undefined}>
                    <td className={styles.nameCell}>{i.name}</td>
                    <td>{i.account_name ?? i.credit_card_name ?? 'Sin asignar'}</td>
                    <td>{i.paid_installments}/{i.total_installments}</td>
                    <td>
                      <div className={styles.amountCell}>
                        <span>{formatArs(i.monthly_amount_pesos)}</span>
                        {i.monthly_amount_dollars > 0 && (
                          <span className={styles.amountSecondary}>
                            {formatUsd(i.monthly_amount_dollars)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.amountCell}>
                        <span>{formatArs(i.total_amount_pesos)}</span>
                        {i.total_amount_dollars > 0 && (
                          <span className={styles.amountSecondary}>
                            {formatUsd(i.total_amount_dollars)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={finished ? styles.badgeFinished : styles.badgeActive}>
                        {finished ? 'Finalizada' : 'Activa'}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/cuotas/editar/${i.id}`}
                        className={styles.editBtn}
                        title="Editar"
                        aria-label={`Editar compra ${i.name}`}
                      >
                        <PencilIcon className={styles.editIcon} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
