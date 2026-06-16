'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateMovementAction } from '@/app/lib/actions/movements';
import SubmitButton from '@/app/ui/SubmitButton';
import PaymentSourceSelect, { type PaymentSource } from '@/app/ui/credit-cards/PaymentSourceSelect';
import type { Account, AccountCurrency, Category, CreditCard, Movement } from '@/app/lib/definitions';
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
  cards: CreditCard[];
  categories: Category[];
};

export default function EditMovementForm({ movement, accounts, cards, categories }: Props) {
  const initialCard = movement.credit_card_id
    ? cards.find((c) => c.id === movement.credit_card_id)
    : undefined;
  const initialAccount = movement.account_id
    ? accounts.find((a) => a.id === movement.account_id)
    : undefined;

  const initialSource: PaymentSource = initialCard
    ? { kind: 'card', id: initialCard.id, currency: initialCard.currency }
    : initialAccount
      ? { kind: 'account', id: initialAccount.id, currency: initialAccount.currency }
      : null;

  const initialEncoded = initialCard
    ? `card:${initialCard.id}`
    : initialAccount
      ? `acc:${initialAccount.id}`
      : '';

  const [source, setSource] = useState<PaymentSource>(initialSource);
  const currency: AccountCurrency | null = source?.currency ?? null;
  const isDual = currency === 'dual';

  const amountLabel =
    currency === 'peso'
      ? 'Monto (pesos)'
      : currency === 'dollar'
        ? 'Monto (dólares)'
        : 'Monto';

  const initialCurrency = initialSource?.currency;
  const initialAmount =
    initialCurrency === 'peso'
      ? movement.amount_pesos
      : initialCurrency === 'dual'
        ? 0
        : movement.amount_dollars || movement.amount_pesos;

  const statusValue =
    movement.status === true ? 'true' : movement.status === false ? 'false' : '';

  return (
    <form action={updateMovementAction} className={styles.form}>
      <input type="hidden" name="id" value={movement.id} />
      <input type="hidden" name="period" value={movement.period} />

      <div className={styles.field}>
        <label htmlFor="payment_source" className={styles.label}>
          Cuenta o tarjeta
        </label>
        <PaymentSourceSelect
          accounts={accounts}
          cards={cards}
          className={styles.select}
          required
          defaultValue={initialEncoded}
          noneLabel="Seleccionar cuenta o tarjeta"
          onSelect={setSource}
        />
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
        {isDual ? (
          <div className={styles.row}>
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
                disabled={!source}
                defaultValue={movement.amount_pesos || ''}
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
                disabled={!source}
                defaultValue={movement.amount_dollars || ''}
              />
            </div>
          </div>
        ) : (
          <>
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
              disabled={!source}
              defaultValue={initialAmount}
            />
          </>
        )}
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
        <SubmitButton>Guardar cambios</SubmitButton>
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
