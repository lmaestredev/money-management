'use client';

import { TrashIcon } from '@heroicons/react/24/outline';
import { deleteInstallmentAction } from '@/app/lib/actions/installments';
import styles from './DeleteInstallmentButton.module.css';

type Props = {
  id: string;
  name: string;
};

export default function DeleteInstallmentButton({ id, name }: Props) {
  return (
    <form
      action={deleteInstallmentAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Eliminar la compra en cuotas "${name}"? Los pagos ya registrados se conservan en el historial de movimientos.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={styles.deleteBtn}
        title={`Eliminar ${name}`}
        aria-label={`Eliminar compra en cuotas ${name}`}
      >
        <TrashIcon className={styles.deleteIcon} aria-hidden />
      </button>
    </form>
  );
}
