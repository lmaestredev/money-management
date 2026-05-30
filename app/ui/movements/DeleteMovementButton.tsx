'use client';

import { deleteMovementAction } from '@/app/lib/actions/movements';
import styles from './MovementList.module.css';

type Props = {
  id: string;
  period: string;
  description: string | null;
};

export default function DeleteMovementButton({ id, period, description }: Props) {
  return (
    <form
      action={deleteMovementAction}
      className={styles.deleteForm}
      onSubmit={(e) => {
        const label = description ? ` "${description}"` : '';
        if (
          !window.confirm(
            `¿Eliminar el movimiento${label}? Se revertirá su efecto en el saldo de la cuenta.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="period" value={period} />
      <button
        type="submit"
        className={styles.actionBtn}
        title="Eliminar"
        aria-label="Eliminar movimiento"
      >
        🗑️
      </button>
    </form>
  );
}
