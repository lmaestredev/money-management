import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { fetchRecurringIncomes } from '@/app/lib/data/recurring-incomes';
import DeleteRecurringIncomeButton from '@/app/ui/recurring-incomes/DeleteRecurringIncomeButton';
import styles from './page.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  delete: 'No se pudo eliminar el ingreso. Intenta de nuevo.',
  notfound: 'El ingreso no existe o ya fue eliminado.',
  validation: 'Solicitud inválida.',
};

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function IngresosPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;
  const incomes = await fetchRecurringIncomes();
  const active = incomes.filter((i) => i.active);
  const monthlyTotal = active.reduce((sum, i) => sum + i.amount_dollars, 0);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>Ingresos recurrentes</h1>
          <p className={styles.pageSubtitle}>Sueldos y cobros mensuales fijos</p>
        </div>
        <Link href="/dashboard/ingresos/nuevo" className={styles.newLink}>
          <PlusIcon className={styles.newLinkIcon} aria-hidden />
          Registrar ingreso
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
            <span className={styles.summaryLabel}>Ingresos activos</span>
            <span className={styles.summaryValue}>{active.length}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Ingreso mensual estimado</span>
            <span className={styles.summaryValueIncome}>+{formatDollars(monthlyTotal)}</span>
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Listado</h2>
        {incomes.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden>
              💰
            </span>
            <p className={styles.emptyText}>No hay ingresos recurrentes registrados</p>
            <p className={styles.emptySub}>
              Registra sueldos u honorarios para confirmarlos cada mes.
            </p>
            <Link href="/dashboard/ingresos/nuevo" className={styles.emptyLink}>
              Registrar ingreso
            </Link>
          </div>
        ) : (
          <ul className={styles.grid}>
            {incomes.map((i) => (
              <li key={i.id} className={styles.itemCard}>
                <div className={styles.itemTop}>
                  <span className={styles.itemName}>{i.name}</span>
                  <span className={i.active ? styles.badgeActive : styles.badgeInactive}>
                    {i.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className={styles.itemMeta}>
                  {i.category_name ?? 'Sin categoría'} · 🏦{' '}
                  {i.account_name ?? 'Se elige al cobrar'}
                  {i.receive_day ? ` · día ${i.receive_day}` : ''}
                </div>
                <div className={styles.itemFooter}>
                  <div className={styles.itemAmounts}>
                    <span className={styles.itemAmount}>+{formatDollars(i.amount_dollars)}</span>
                    <span className={styles.itemAmountSecondary}>{formatPesos(i.amount_pesos)}</span>
                  </div>
                  <DeleteRecurringIncomeButton id={i.id} name={i.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
