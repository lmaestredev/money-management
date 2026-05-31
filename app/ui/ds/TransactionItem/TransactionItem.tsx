import type { ReactNode } from 'react';
import styles from './TransactionItem.module.css';

export type TransactionItemProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Monto: positivo = ingreso (teal), negativo = egreso (rojo). */
  amount: number;
  date: string;
  /** Código ISO para formatear (default USD). */
  currency?: string;
};

function formatAmount(amount: number, currency: string): string {
  const sign = amount < 0 ? '−' : '+';
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${formatted}`;
}

export default function TransactionItem({
  icon,
  title,
  subtitle,
  amount,
  date,
  currency = 'USD',
}: TransactionItemProps) {
  const positive = amount >= 0;
  const amountText = formatAmount(amount, currency);
  const amountClass = `${styles.amount} ${positive ? styles.amountPositive : styles.amountNegative}`;

  return (
    <div
      className={styles.item}
      role="group"
      aria-label={`${title}${subtitle ? `, ${subtitle}` : ''}, ${amountText}, ${date}`}
    >
      <div className={styles.iconWrap} aria-hidden="true">
        {icon}
      </div>
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      <div className={styles.meta}>
        <span className={amountClass}>{amountText}</span>
        <span className={styles.date}>{date}</span>
      </div>
    </div>
  );
}
