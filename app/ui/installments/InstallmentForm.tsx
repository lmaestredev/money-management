'use client';

import Link from 'next/link';
import { createInstallmentAction } from '@/app/lib/actions/installments';
import PaymentSourceSelect from '@/app/ui/credit-cards/PaymentSourceSelect';
import type { Account, Category, CreditCard } from '@/app/lib/definitions';
import styles from './InstallmentForm.module.css';

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

type Props = {
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
};

export default function InstallmentForm({ accounts, cards, categories }: Props) {
  return (
    <form action={createInstallmentAction} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          Artículo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className={styles.input}
          required
          placeholder="Ej. Televisor, Compras USA..."
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="payment_source" className={styles.label}>
          Tarjeta / cuenta
        </label>
        <PaymentSourceSelect
          accounts={accounts}
          cards={cards}
          className={styles.select}
          noneLabel="Sin asignar"
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

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="total_installments" className={styles.label}>
            Cuotas totales
          </label>
          <input
            id="total_installments"
            name="total_installments"
            type="number"
            min="1"
            step="1"
            className={styles.input}
            required
            placeholder="12"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="paid_installments" className={styles.label}>
            Cuotas ya pagadas
          </label>
          <input
            id="paid_installments"
            name="paid_installments"
            type="number"
            min="0"
            step="1"
            className={styles.input}
            defaultValue={0}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="monthly_amount_pesos" className={styles.label}>
            Cuota mensual (pesos)
          </label>
          <input
            id="monthly_amount_pesos"
            name="monthly_amount_pesos"
            type="number"
            min="0"
            step="0.01"
            className={styles.input}
            placeholder="0"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="monthly_amount_dollars" className={styles.label}>
            Cuota mensual (dólares)
          </label>
          <input
            id="monthly_amount_dollars"
            name="monthly_amount_dollars"
            type="number"
            min="0"
            step="0.01"
            className={styles.input}
            placeholder="0"
          />
        </div>
      </div>

      <div className={styles.row}>
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
        <div className={styles.field}>
          <label htmlFor="start_period" className={styles.label}>
            Mes de inicio
          </label>
          <input
            id="start_period"
            name="start_period"
            type="month"
            className={styles.input}
            defaultValue={currentPeriod()}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.button}>
          Guardar
        </button>
        <Link href="/dashboard/cuotas" className={`${styles.button} ${styles.buttonSecondary}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
