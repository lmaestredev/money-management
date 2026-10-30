'use client';

import { useFormStatus } from 'react-dom';
import styles from './MonthlyFixedExpensesSection.module.css';

type Props = {
  label?: string;
};

export default function PayRecurringButton({ label = 'Registrar pago' }: Props) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.payBtn} disabled={pending} aria-busy={pending}>
      {pending ? 'Registrando…' : label}
    </button>
  );
}
