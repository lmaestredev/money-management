'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateRecurringExpenseAction } from '@/app/lib/actions/recurring';
import SubmitButton from '@/app/ui/SubmitButton';
import PaymentSourceSelect from '@/app/ui/credit-cards/PaymentSourceSelect';
import type { Account, Category, CreditCard, RecurringExpense } from '@/app/lib/definitions';
import styles from './RecurringExpenseForm.module.css';

type Props = {
  expense: RecurringExpense;
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
};

export default function EditRecurringExpenseForm({ expense, accounts, cards, categories }: Props) {
  const [isCash, setIsCash] = useState(expense.is_cash);

  const defaultPaymentSource = expense.credit_card_id
    ? `card:${expense.credit_card_id}`
    : expense.account_id
      ? `acc:${expense.account_id}`
      : '';

  return (
    <form action={updateRecurringExpenseAction} className={styles.form}>
      <input type="hidden" name="id" value={expense.id} />
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
          defaultValue={expense.name}
          required
          placeholder="Ej. Alquiler, Internet, Medicina prepaga..."
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
          defaultValue={expense.category_id ?? ''}
        >
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
          <label htmlFor="payment_source" className={styles.label}>
            Cuenta o tarjeta de pago
          </label>
          <PaymentSourceSelect
            accounts={accounts}
            cards={cards}
            className={styles.select}
            defaultValue={defaultPaymentSource}
            noneLabel="Sin asignar"
          />
          <span className={styles.hint}>
            Si la asignas, el pago mensual se registra con un clic. Con tarjeta, el gasto suma a
            su resumen. Si la dejas sin asignar, elegirás la cuenta al pagar.
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
            defaultValue={expense.amount_pesos || undefined}
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
            defaultValue={expense.amount_dollars || undefined}
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
          defaultValue={expense.pay_before_day ?? undefined}
          placeholder="10"
        />
      </div>

      <div className={styles.actions}>
        <SubmitButton>Guardar cambios</SubmitButton>
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
