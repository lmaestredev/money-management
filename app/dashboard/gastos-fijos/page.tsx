import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import { fetchRecurringExpenses } from '@/app/lib/data/recurring';
import { createClient } from '@/app/lib/supabase/server';
import { formatArs, formatUsd } from '@/app/lib/utils';
import DeleteRecurringButton from '@/app/ui/recurring/DeleteRecurringButton';
import styles from './page.module.css';

export default async function GastosFijosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const expenses = await fetchRecurringExpenses(user.id);
  const active = expenses.filter((e) => e.active);
  const monthlyTotalPesos = active.reduce((sum, e) => sum + e.amount_pesos, 0);
  const monthlyTotalDollars = active.reduce((sum, e) => sum + e.amount_dollars, 0);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Gastos fijos</h1>
          <p className={styles.pageSubtitle}>Compromisos mensuales recurrentes</p>
        </div>
        <Link href="/dashboard/gastos-fijos/nuevo" className={styles.newLink}>
          <PlusIcon className={styles.newLinkIcon} aria-hidden />
          Registrar gasto fijo
        </Link>
      </header>

      {active.length > 0 && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Gastos fijos activos</span>
            <span className={styles.summaryValue}>{active.length}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total fijo mensual</span>
            <span className={styles.summaryValueExpense}>{formatArs(monthlyTotalPesos)}</span>
            {monthlyTotalDollars > 0 && (
              <span className={styles.summaryValueSecondary}>{formatUsd(monthlyTotalDollars)}</span>
            )}
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Listado</h2>
        {expenses.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden>
              🔒
            </span>
            <p className={styles.emptyText}>No hay gastos fijos registrados</p>
            <p className={styles.emptySub}>
              Registra alquiler, servicios o suscripciones para seguirlos cada mes.
            </p>
            <Link href="/dashboard/gastos-fijos/nuevo" className={styles.emptyLink}>
              Registrar gasto fijo
            </Link>
          </div>
        ) : (
          <ul className={styles.grid}>
            {expenses.map((e) => (
              <li key={e.id} className={styles.itemCard}>
                <div className={styles.itemTop}>
                  <span className={styles.itemName}>
                    {e.name}
                    {e.is_cash && <span className={styles.cashBadge}>💵 Efectivo</span>}
                  </span>
                  <div className={styles.itemTopActions}>
                    <span className={e.active ? styles.badgeActive : styles.badgeInactive}>
                      {e.active ? 'Activo' : 'Inactivo'}
                    </span>
                    <Link
                      href={`/dashboard/gastos-fijos/editar/${e.id}`}
                      className={styles.editBtn}
                      title="Editar"
                      aria-label={`Editar gasto fijo ${e.name}`}
                    >
                      <PencilIcon className={styles.editIcon} aria-hidden />
                    </Link>
                  </div>
                </div>
                <div className={styles.itemMeta}>
                  {e.category_name ?? 'Sin categoría'} · 🏦{' '}
                  {e.account_name ?? (e.is_cash ? 'Se elige al pagar' : 'Sin cuenta')}
                  {e.pay_before_day ? ` · vence día ${e.pay_before_day}` : ''}
                </div>
                <div className={styles.itemFooter}>
                  <div className={styles.itemAmounts}>
                    <span className={styles.itemAmount}>{formatArs(e.amount_pesos)}</span>
                    {e.amount_dollars > 0 && (
                      <span className={styles.itemAmountSecondary}>{formatUsd(e.amount_dollars)}</span>
                    )}
                  </div>
                  <DeleteRecurringButton id={e.id} name={e.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
