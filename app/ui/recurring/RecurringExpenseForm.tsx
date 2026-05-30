'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createRecurringExpenseAction } from '@/app/lib/actions/recurring';
import type { Account, Category } from '@/app/lib/definitions';
import styles from './RecurringExpenseForm.module.css';

type Props = {
  accounts: Account[];
  categories: Category[];
};

export default function RecurringExpenseForm({ accounts, categories }: Props) {
  const [isCash, setIsCash] = useState(false);

  return (
    <form action={createRecurringExpenseAction} className={styles.form}>
      <input type="hidden" name="is_cash" value={isCash ? 'true' : 'false'} />

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
          placeholder="Ej. Alquiler, Internet, Medicina prepaga..."
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="category_id" className={styles.label}>
          Categoría
        </label>
        <select id="category_id" name="category_id" className={styles.select}>
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={isCash}
          onChange={(e) => setIsCash(e.target.checked)}
          className={styles.checkbox}
        />
        <span>
          <span className={styles.checkboxLabel}>💵 Se paga en efectivo</span>
          <span className={styles.hint}>
            La cuenta de la que sale el dinero se elige al confirmar el pago en Movimientos.
          </span>
        </span>
      </label>

      {!isCash && (
        <div className={styles.field}>
          <label htmlFor="account_id" className={styles.label}>
            Cuenta de pago
          </label>
          <select id="account_id" name="account_id" className={styles.select}>
            <option value="">Sin asignar</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.bank ? ` · ${a.bank}` : ''}
              </option>
            ))}
          </select>
          <span className={styles.hint}>
            Si la asignas, el pago mensual se registra con un clic. Si la dejas sin asignar,
            elegirás la cuenta al pagar.
          </span>
        </div>
      )}

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
            placeholder="0"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="pay_before_day" className={styles.label}>
          Pagar antes del día
        </label>
        <input
          id="pay_before_day"
          name="pay_before_day"
          type="number"
          min="1"
          max="31"
          step="1"
          className={styles.input}
          placeholder="10"
        />
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.button}>
          Guardar
        </button>
        <Link
          href="/dashboard/gastos-fijos"
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
