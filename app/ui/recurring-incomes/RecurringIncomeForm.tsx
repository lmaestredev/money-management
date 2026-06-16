'use client';

import Link from 'next/link';
import {
  createRecurringIncomeAction,
  updateRecurringIncomeAction,
} from '@/app/lib/actions/recurring-incomes';
import SubmitButton from '@/app/ui/SubmitButton';
import type { Account, Category, RecurringIncome } from '@/app/lib/definitions';
import styles from './RecurringIncomeForm.module.css';

type Props = {
  accounts: Account[];
  categories: Category[];
  income?: RecurringIncome;
  returnTo?: string;
};

export default function RecurringIncomeForm({
  accounts,
  categories,
  income,
  returnTo,
}: Props) {
  const isEdit = !!income;
  const cancelHref = returnTo || '/dashboard/ingresos';

  return (
    <form
      action={isEdit ? updateRecurringIncomeAction : createRecurringIncomeAction}
      className={styles.form}
    >
      {isEdit && <input type="hidden" name="id" value={income.id} />}
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          Nombre
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className={styles.input}
          required
          defaultValue={income?.name ?? ''}
          placeholder="Ej. Sueldo Luis, Sueldo Valen, Honorarios..."
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="category_id" className={styles.label}>
          Categoría
        </label>
        <select
          id="category_id"
          name="category_id"
          className={styles.select}
          defaultValue={income?.category_id ?? ''}
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
        <label htmlFor="account_id" className={styles.label}>
          Cuenta donde se acredita
        </label>
        <select
          id="account_id"
          name="account_id"
          className={styles.select}
          defaultValue={income?.account_id ?? ''}
        >
          <option value="">Se elige al cobrar</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.bank ? ` · ${a.bank}` : ''}
            </option>
          ))}
        </select>
        <span className={styles.hint}>
          Si la dejas sin asignar, eliges la cuenta al registrar el cobro en Movimientos.
        </span>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="amount_pesos" className={styles.label}>
            Monto mensual (pesos)
          </label>
          <input
            id="amount_pesos"
            name="amount_pesos"
            type="number"
            min="0"
            step="0.01"
            className={styles.input}
            defaultValue={income?.amount_pesos ?? ''}
            placeholder="0"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="amount_dollars" className={styles.label}>
            Monto mensual (dólares)
          </label>
          <input
            id="amount_dollars"
            name="amount_dollars"
            type="number"
            min="0"
            step="0.01"
            className={styles.input}
            defaultValue={income?.amount_dollars ?? ''}
            placeholder="0"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="receive_day" className={styles.label}>
          Día de cobro
        </label>
        <input
          id="receive_day"
          name="receive_day"
          type="number"
          min="1"
          max="31"
          step="1"
          className={styles.input}
          defaultValue={income?.receive_day ?? ''}
          placeholder="1"
        />
      </div>

      <div className={styles.actions}>
        <SubmitButton>{isEdit ? 'Guardar cambios' : 'Guardar'}</SubmitButton>
        <Link href={cancelHref} className={`${styles.button} ${styles.buttonSecondary}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
