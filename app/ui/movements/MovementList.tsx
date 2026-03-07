import type { Movement } from '@/app/lib/definitions';
import styles from './MovementList.module.css';

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function recordTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    income: 'Ingreso',
    conversion: 'Conversión',
    variable_payment: 'Pago varios',
    fixed_payment: 'Gasto fijo',
  };
  return labels[type] ?? type;
}

type Props = {
  movements: Movement[];
  accountNames: Map<string, string>;
};

export default function MovementList({ movements, accountNames }: Props) {
  if (movements.length === 0) {
    return <p className={styles.empty}>No hay movimientos en este periodo.</p>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Tipo</th>
            <th className={styles.th}>Descripción</th>
            <th className={styles.th}>Cuenta</th>
            <th className={styles.th}>Pesos</th>
            <th className={styles.th}>Dólares</th>
            <th className={styles.th}>Fecha</th>
            <th className={styles.th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id} className={styles.tr}>
              <td className={styles.td}>
                <span className={m.record_type === 'income' ? styles.typeIncome : ''}>
                  {recordTypeLabel(m.record_type)}
                </span>
              </td>
              <td className={styles.td}>{m.description ?? '—'}</td>
              <td className={styles.td}>{accountNames.get(m.account_id) ?? m.account_id}</td>
              <td className={styles.td}>{formatPesos(m.amount_pesos)}</td>
              <td className={styles.td}>{formatDollars(m.amount_dollars)}</td>
              <td className={styles.td}>{formatDate(m.payment_date)}</td>
              <td className={styles.td}>
                {m.status === null ? '—' : m.status ? 'Pagado' : 'Pendiente'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
