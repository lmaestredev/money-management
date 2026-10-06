'use client';

import { useFormStatus } from 'react-dom';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import styles from './RatesPanel.module.css';

/** Botón de "Actualizar ahora": se deshabilita y el ícono gira mientras se actualiza. */
export default function RefreshRatesButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.refreshBtn} disabled={pending} aria-busy={pending}>
      <ArrowPathIcon
        className={`${styles.refreshIcon} ${pending ? styles.spinning : ''}`}
        aria-hidden
      />
      {pending ? 'Actualizando…' : 'Actualizar ahora'}
    </button>
  );
}
