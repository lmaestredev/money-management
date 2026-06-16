'use client';

import { useState } from 'react';
import type { Account, AccountCurrency, CreditCard } from '@/app/lib/definitions';

export type PaymentSource =
  | { kind: 'account'; id: string; currency: AccountCurrency }
  | { kind: 'card'; id: string; currency: AccountCurrency }
  | null;

type Props = {
  accounts: Account[];
  cards: CreditCard[];
  id?: string;
  className?: string;
  /** Valor inicial codificado: 'acc:<id>' | 'card:<id>' | '' */
  defaultValue?: string;
  required?: boolean;
  /** Si se pasa, agrega una opción vacía con esta etiqueta (ej. "Sin asignar"). */
  noneLabel?: string;
  onSelect?: (source: PaymentSource) => void;
};

function currencySuffix(currency: AccountCurrency): string {
  if (currency === 'peso') return ' (pesos)';
  if (currency === 'dollar') return ' (dólares)';
  if (currency === 'dual') return ' (pesos y dólares)';
  return '';
}

export default function PaymentSourceSelect({
  accounts,
  cards,
  id = 'payment_source',
  className,
  defaultValue = '',
  required,
  noneLabel,
  onSelect,
}: Props) {
  const [value, setValue] = useState(defaultValue);

  function parse(v: string): PaymentSource {
    if (v.startsWith('acc:')) {
      const acc = accounts.find((a) => a.id === v.slice(4));
      return acc ? { kind: 'account', id: acc.id, currency: acc.currency } : null;
    }
    if (v.startsWith('card:')) {
      const card = cards.find((c) => c.id === v.slice(5));
      return card ? { kind: 'card', id: card.id, currency: card.currency } : null;
    }
    return null;
  }

  const selected = parse(value);

  return (
    <>
      <select
        id={id}
        className={className}
        required={required}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onSelect?.(parse(e.target.value));
        }}
      >
        <option value="">{noneLabel ?? 'Seleccionar…'}</option>
        {accounts.length > 0 && (
          <optgroup label="Cuentas">
            {accounts.map((a) => (
              <option key={a.id} value={`acc:${a.id}`}>
                {a.name}
                {currencySuffix(a.currency)}
              </option>
            ))}
          </optgroup>
        )}
        {cards.length > 0 && (
          <optgroup label="Tarjetas de crédito">
            {cards.map((c) => (
              <option key={c.id} value={`card:${c.id}`}>
                💳 {c.name}
                {currencySuffix(c.currency)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {selected?.kind === 'account' && <input type="hidden" name="account_id" value={selected.id} />}
      {selected?.kind === 'card' && (
        <input type="hidden" name="credit_card_id" value={selected.id} />
      )}
    </>
  );
}
