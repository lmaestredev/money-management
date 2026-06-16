'use client';

import { useState } from 'react';
import type { AccountCurrency } from '@/app/lib/definitions';
import styles from './AccountForm.module.css';

type Props = {
  initialCurrency?: AccountCurrency;
  initialBalancePesos?: number;
  initialBalanceDollars?: number;
  initialSingleBalance?: number;
};

export default function AccountCurrencyFields({
  initialCurrency = 'peso',
  initialBalancePesos = 0,
  initialBalanceDollars = 0,
  initialSingleBalance = 0,
}: Props) {
  const [currency, setCurrency] = useState<AccountCurrency>(initialCurrency);
  const isDual = currency === 'dual';

  return (
    <>
      <div className={styles.field}>
        <label htmlFor="currency" className={styles.label}>
          Moneda de la cuenta
        </label>
        <select
          id="currency"
          name="currency"
          className={styles.select}
          required
          value={currency}
          onChange={(e) => setCurrency(e.target.value as AccountCurrency)}
        >
          <option value="peso">Solo pesos (ARS)</option>
          <option value="dollar">Solo dólares (USD)</option>
          <option value="dual">Pesos y dólares</option>
          <option value="crypto">Cripto</option>
        </select>
        <p className={styles.hint}>
          {isDual
            ? 'Los gastos en pesos se debitan en pesos y los de dólares en dólares, sin convertir entre monedas.'
            : currency === 'peso'
              ? 'Solo movimientos y saldos en pesos argentinos.'
              : currency === 'dollar'
                ? 'Solo movimientos y saldos en dólares. Los montos en pesos se convierten al pagar.'
                : 'Saldo en cripto (USD).'}
        </p>
      </div>

      {isDual ? (
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="balance_pesos" className={styles.label}>
              Saldo en pesos
            </label>
            <input
              id="balance_pesos"
              name="balance_pesos"
              type="number"
              step="0.01"
              min="0"
              className={styles.input}
              defaultValue={initialBalancePesos || ''}
              placeholder="0"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="balance_dollars" className={styles.label}>
              Saldo en dólares
            </label>
            <input
              id="balance_dollars"
              name="balance_dollars"
              type="number"
              step="0.00000001"
              min="0"
              className={styles.input}
              defaultValue={initialBalanceDollars || ''}
              placeholder="0"
            />
          </div>
        </div>
      ) : (
        <div className={styles.field}>
          <label htmlFor="balance" className={styles.label}>
            Saldo actual
          </label>
          <input
            id="balance"
            name="balance"
            type="number"
            step="0.00000001"
            min="0"
            className={styles.input}
            defaultValue={initialSingleBalance}
            placeholder="0"
            required
          />
        </div>
      )}
    </>
  );
}
