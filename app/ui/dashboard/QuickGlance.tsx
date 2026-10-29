import Link from 'next/link';
import type { Account, CreditCard } from '@/app/lib/definitions';
import type { CategoryTotal } from '@/app/lib/summary';
import { formatUsdOrDash } from '@/app/lib/utils';
import MoneyFigure from './MoneyFigure';
import styles from './QuickGlance.module.css';

type Props = {
  accounts: Account[];
  creditCards: CreditCard[];
  categories: CategoryTotal[];
  rate: number | null;
};

const TOP_CATEGORIES = 3;

/** Resumen de cuentas, tarjetas y categorías. Solo totales: el detalle está en cada pantalla. */
export default function QuickGlance({ accounts, creditCards, categories, rate }: Props) {
  const hasRate = Boolean(rate && rate > 0);

  // Las cuentas en pesos se pasan a USD con la cotización; las demás ya están en USD.
  let accountsUsd = 0;
  let accountsIncomplete = false;
  for (const a of accounts) {
    if (a.currency === 'peso') {
      if (hasRate) accountsUsd += a.balance_pesos / (rate as number);
      else if (a.balance_pesos !== 0) accountsIncomplete = true;
    } else {
      accountsUsd += a.balance_dollars;
    }
  }

  let debtUsd = 0;
  let debtIncomplete = false;
  for (const c of creditCards) {
    debtUsd += c.current_balance_dollars;
    if (hasRate) debtUsd += c.current_balance_pesos / (rate as number);
    else if (c.current_balance_pesos !== 0) debtIncomplete = true;
  }

  const topCategories = categories.slice(0, TOP_CATEGORIES);

  return (
    <section className={styles.grid}>
      <Link href="/dashboard/cuentas" className={styles.card}>
        <span className={styles.label}>Plata en tus cuentas</span>
        <MoneyFigure usd={accountsUsd} rate={rate} incomplete={accountsIncomplete} />
        <span className={styles.hint}>Ver cuentas →</span>
      </Link>

      <Link href="/dashboard/tarjetas" className={styles.card}>
        <span className={styles.label}>Debés en tarjetas</span>
        <MoneyFigure usd={debtUsd} rate={rate} incomplete={debtIncomplete} />
        <span className={styles.hint}>Ver tarjetas →</span>
      </Link>

      <div className={styles.card}>
        <span className={styles.label}>Dónde más gastaste</span>
        {topCategories.length === 0 ? (
          <span className={styles.hint}>Todavía no hay gastos este mes.</span>
        ) : (
          <ul className={styles.list}>
            {topCategories.map((c) => (
              <li key={c.name} className={styles.row}>
                <span className={styles.rowName}>{c.name}</span>
                <span className={styles.rowAmount}>{formatUsdOrDash(c.amount, c.incomplete)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
