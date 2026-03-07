import Link from 'next/link';
import { createMovementAction } from '@/app/lib/actions/movements';
import type { Account } from '@/app/lib/definitions';
import styles from './MovementForm.module.css';

type Props = {
  period: string;
  accounts: Account[];
};

export default function MovementForm({ period, accounts }: Props) {
  return (
    <form action={createMovementAction} className={styles.form}>
      <input type="hidden" name="period" value={period} />
      <div className={styles.field}>
        <label htmlFor="account_id" className={styles.label}>
          Cuenta
        </label>
        <select
          id="account_id"
          name="account_id"
          className={styles.select}
          required
        >
          <option value="">Seleccionar cuenta</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="record_type" className={styles.label}>
          Tipo
        </label>
        <select
          id="record_type"
          name="record_type"
          className={styles.select}
          required
        >
          <option value="income">Ingreso</option>
          <option value="variable_payment">Pago varios</option>
          <option value="fixed_payment">Gasto fijo</option>
          <option value="conversion">Conversión</option>
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="description" className={styles.label}>
          Descripción
        </label>
        <input
          id="description"
          name="description"
          type="text"
          className={styles.input}
          placeholder="Ej. Sueldo, Alquiler..."
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="amount_pesos" className={styles.label}>
          Monto (pesos)
        </label>
        <input
          id="amount_pesos"
          name="amount_pesos"
          type="number"
          step="0.01"
          min="0"
          className={styles.input}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="amount_dollars" className={styles.label}>
          Monto (dólares)
        </label>
        <input
          id="amount_dollars"
          name="amount_dollars"
          type="number"
          step="0.01"
          min="0"
          className={styles.input}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="payment_date" className={styles.label}>
          Fecha de pago
        </label>
        <input
          id="payment_date"
          name="payment_date"
          type="date"
          className={styles.input}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="status" className={styles.label}>
          Estado (pagos)
        </label>
        <select id="status" name="status" className={styles.select}>
          <option value="">—</option>
          <option value="false">Pendiente</option>
          <option value="true">Pagado</option>
        </select>
      </div>
      <div className={styles.actions}>
        <button type="submit" className={styles.button}>
          Guardar
        </button>
        <Link
          href={`/dashboard/movimientos?period=${period}`}
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
