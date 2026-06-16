import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchRecurringExpenses } from '@/app/lib/data/recurring';
import { getEffectiveRate, refreshExchangeRatesIfStale } from '@/app/lib/data/exchange-rates';
import { formatArs, formatUsd } from '@/app/lib/utils';
import { amountsToUsd } from '@/app/lib/utils/currency';
import { recurringExpensePaymentLabel } from '@/app/lib/utils/installment-display';
import DeleteRecurringButton from '@/app/ui/recurring/DeleteRecurringButton';
import ItemActions from '@/app/ui/movements/ItemActions';
import styles from './page.module.css';

export default async function GastosFijosPage() {
  await refreshExchangeRatesIfStale();
  const [expenses, effectiveRate] = await Promise.all([
    fetchRecurringExpenses(),
    getEffectiveRate(),
  ]);
  const rate = effectiveRate?.rate ?? null;
  const active = expenses.filter((e) => e.active);
  const monthlyTotalPesos = active.reduce((sum, e) => sum + e.amount_pesos, 0);
  const monthlyTotalUsd = active.reduce(
    (sum, e) => sum + amountsToUsd(e.amount_pesos, e.amount_dollars, rate),
    0
  );

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
            <span className={styles.summaryValueExpense}>{formatUsd(monthlyTotalUsd)}</span>
            <div className={styles.summaryPesosRow}>
              <span className={styles.summaryValueSecondary}>{formatArs(monthlyTotalPesos)}</span>
              <span className={styles.summaryPesosLabel}>Gastos en pesos</span>
            </div>
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
                  <span className={e.active ? styles.badgeActive : styles.badgeInactive}>
                    {e.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className={styles.itemMeta}>
                  {e.category_name ?? 'Sin categoría'} · 🏦{' '}
                  {recurringExpensePaymentLabel(e)}
                  {e.pay_before_day ? ` · vence día ${e.pay_before_day}` : ''}
                </div>
                <div className={styles.itemFooter}>
                  <div className={styles.itemAmounts}>
                    <span className={styles.itemAmount}>
                      {formatUsd(amountsToUsd(e.amount_pesos, e.amount_dollars, rate))}
                    </span>
                    {e.amount_pesos > 0 && (
                      <span className={styles.itemAmountSecondary}>{formatArs(e.amount_pesos)}</span>
                    )}
                  </div>
                  <ItemActions
                    editHref={`/dashboard/gastos-fijos/editar/${e.id}?return=/dashboard/gastos-fijos`}
                    editLabel={`Editar ${e.name}`}
                    deleteSlot={
                      <DeleteRecurringButton
                        id={e.id}
                        name={e.name}
                        redirectTo="/dashboard/gastos-fijos"
                      />
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
