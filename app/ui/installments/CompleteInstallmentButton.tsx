'use client';

import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { completeInstallmentAction } from '@/app/lib/actions/installments';
import styles from './CompleteInstallmentButton.module.css';

type Props = {
  id: string;
  name: string;
};

export default function CompleteInstallmentButton({ id, name }: Props) {
  return (
    <form
      action={completeInstallmentAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Marcar "${name}" como pagada por completo? Se van a dar por pagadas todas las cuotas restantes sin generar movimientos nuevos.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="installment_id" value={id} />
      <button type="submit" className={styles.completeBtn}>
        <CheckCircleIcon className={styles.completeIcon} aria-hidden />
        Marcar como pagada
      </button>
    </form>
  );
}
