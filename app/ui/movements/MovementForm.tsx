'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createMovementAction } from '@/app/lib/actions/movements';
import SubmitButton from '@/app/ui/SubmitButton';
import PaymentSourceSelect, { type PaymentSource } from '@/app/ui/credit-cards/PaymentSourceSelect';
import MovementAmountFields from './MovementAmountFields';
import type { Account, AccountCurrency, Category, CreditCard } from '@/app/lib/definitions';
import styles from './MovementForm.module.css';

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  period: string;
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  defaultPaymentDate?: string;
};

export default function MovementForm({
  period,
  accounts,
  cards,
  categories,
  defaultPaymentDate = getTodayISO(),
}: Props) {
  const [source, setSource] = useState<PaymentSource>(null);
  const currency: AccountCurrency | null = source?.currency ?? null;
  const showSplitAmounts = currency === 'dual';

  const amountLabel =
    currency === 'peso'
      ? 'Monto (pesos)'
      : currency === 'dollar'
        ? 'Monto (dólares)'
        : 'Monto';

  return (
    <form action={createMovementAction} className={styles.form}>
      <input type="hidden" name="period" value={period} />
      <div className={styles.field}>
        <label htmlFor="payment_source" className={styles.label}>
          Cuenta o tarjeta
        </label>
        <PaymentSourceSelect
          accounts={accounts}
          cards={cards}
          className={styles.select}
          required
          noneLabel="Seleccionar cuenta o tarjeta"
          onSelect={setSource}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="record_type" className={styles.label}>
          Tipo
        </label>
        <select id="record_type" name="record_type" className={styles.select} required>
          <option value="income">Ingreso</option>
          <option value="variable_payment">Egreso (pago varios)</option>
          <option value="fixed_payment">Egreso (gasto fijo)</option>
        </select>
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
      <MovementAmountFields
        showSplitAmounts={showSplitAmounts}
        amountLabel={amountLabel}
        sourceSelected={!!source}
      />
      <div className={styles.field}>
        <label htmlFor="payment_date" className={styles.label}>
          Fecha de pago
        </label>
        <input
          id="payment_date"
          name="payment_date"
          type="date"
          className={styles.input}
          defaultValue={defaultPaymentDate}
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
        <SubmitButton>Guardar</SubmitButton>
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
