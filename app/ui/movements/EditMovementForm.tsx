'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { updateMovementAction } from '@/app/lib/actions/movements';
import type { Account, Category, Movement } from '@/app/lib/definitions';
import styles from './MovementForm.module.css';

function toDateInput(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

type Props = {
  movement: Movement;
  accounts: Account[];
  categories: Category[];
};

export default function EditMovementForm({ movement, accounts, categories }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(movement.account_id);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const amountLabel =
    selectedAccount?.currency === 'peso'
      ? 'Monto (pesos)'
      : selectedAccount?.currency === 'dollar'
        ? 'Monto (dólares)'
        : 'Monto';

  const initialAccount = accounts.find((a) => a.id === movement.account_id);
  const initialAmount =
    initialAccount?.currency === 'peso'
      ? movement.amount_pesos
      : movement.amount_dollars || movement.amount_pesos;

  const statusValue =
    movement.status === true ? 'true' : movement.status === false ? 'false' : '';

  return (
    <form action={updateMovementAction} className={styles.form}>
      <input type="hidden" name="id" value={movement.id} />
      <input type="hidden" name="period" value={movement.period} />

      <div className={styles.field}>
        <label htmlFor="account_id" className={styles.label}>
          Cuenta
        </label>
        <select
          id="account_id"
          name="account_id"
          className={styles.select}
          required
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
        >
          <option value="">Seleccionar cuenta</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.currency === 'peso' ? ' (pesos)' : a.currency === 'dollar' ? ' (dólares)' : ''}
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
          defaultValue={movement.record_type}
        >
          <option value="income">Ingreso</option>
          <option value="variable_payment">Egreso (pago varios)</option>
          <option value="fixed_payment">Egreso (gasto fijo)</option>
          <option value="conversion">Conversión (dólar ↔ peso)</option>
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="category_id" className={styles.label}>
          Categoría
        </label>
        <select
          id="category_id"
          name="category_id"
          className={styles.select}
          defaultValue={movement.category_id ?? ''}
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
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
          defaultValue={movement.description ?? ''}
          placeholder="Ej. Sueldo, Alquiler..."
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="amount" className={styles.label}>
          {amountLabel}
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          className={styles.input}
          required
          disabled={!selectedAccountId}
          defaultValue={initialAmount}
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
          defaultValue={toDateInput(movement.payment_date)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="status" className={styles.label}>
          Estado (pagos)
        </label>
        <select id="status" name="status" className={styles.select} defaultValue={statusValue}>
          <option value="">—</option>
          <option value="false">Pendiente</option>
          <option value="true">Pagado</option>
        </select>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.button}>
          Guardar cambios
        </button>
        <Link
          href={`/dashboard/movimientos?period=${movement.period}`}
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
