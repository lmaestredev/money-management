'use client';

import { useFormStatus } from 'react-dom';
import styles from './MonthlyInstallmentsSection.module.css';

export default function PayInstallmentButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.payBtn} disabled={pending} aria-busy={pending}>
      {pending ? 'Registrando…' : 'Registrar pago'}
    </button>
  );
}
