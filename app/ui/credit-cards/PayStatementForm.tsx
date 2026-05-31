'use client';

import { useState } from 'react';
import { payStatementAction } from '@/app/lib/actions/credit-cards';
import type { Account, CardStatement } from '@/app/lib/definitions';
import styles from './CreditCardItem.module.css';

type Props = {
  statement: CardStatement;
  accounts: Account[];
};

function formatMoney(amount: number, currency: 'peso' | 'dollar'): string {
  if (currency === 'peso') {
    return amount.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export default function PayStatementForm({ statement, accounts }: Props) {
  const [accountId, setAccountId] = useState('');

  const hasPesos = statement.total_pesos !== 0;
  const hasDollars = statement.total_dollars !== 0;
  const due = formatDate(statement.due_date);

  const totalLabel = [
    hasPesos ? formatMoney(statement.total_pesos, 'peso') : null,
    hasDollars ? formatMoney(statement.total_dollars, 'dollar') : null,
  ]
    .filter(Boolean)
    .join(' + ');

  return (
    <form action={payStatementAction} className={styles.stmtRow}>
      <input type="hidden" name="statement_id" value={statement.id} />
      <div className={styles.stmtInfo}>
        <span className={styles.stmtPeriod}>Resumen {statement.period}</span>
        <span className={styles.stmtTotal}>{totalLabel}</span>
        {due && <span className={styles.stmtDue}>Vence {due}</span>}
      </div>
      <div className={styles.stmtActions}>
        <select
          name="account_id"
          className={styles.stmtSelect}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
          aria-label="Cuenta para pagar el resumen"
        >
          <option value="">Pagar desde…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.stmtPayBtn} disabled={!accountId}>
          Pagar
        </button>
      </div>
    </form>
  );
}
