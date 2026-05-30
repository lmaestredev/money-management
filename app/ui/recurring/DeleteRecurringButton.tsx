'use client';

import { TrashIcon } from '@heroicons/react/24/outline';
import { deleteRecurringExpenseAction } from '@/app/lib/actions/recurring';
import styles from './DeleteRecurringButton.module.css';

type Props = {
  id: string;
  name: string;
};

export default function DeleteRecurringButton({ id, name }: Props) {
  return (
    <form
      action={deleteRecurringExpenseAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Eliminar el gasto fijo "${name}"? Los pagos ya registrados se conservan en el historial.`
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
        aria-label={`Eliminar gasto fijo ${name}`}
      >
        <TrashIcon className={styles.deleteIcon} aria-hidden />
      </button>
    </form>
  );
}
