'use client';

import { TrashIcon } from '@heroicons/react/24/outline';
import { deleteRecurringIncomeAction } from '@/app/lib/actions/recurring-incomes';
import styles from './DeleteRecurringIncomeButton.module.css';

type Props = {
  id: string;
  name: string;
};

export default function DeleteRecurringIncomeButton({ id, name }: Props) {
  return (
    <form
      action={deleteRecurringIncomeAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Eliminar el ingreso recurrente "${name}"? Los cobros ya registrados se conservan en el historial.`
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
        aria-label={`Eliminar ingreso recurrente ${name}`}
      >
        <TrashIcon className={styles.deleteIcon} aria-hidden />
      </button>
    </form>
  );
}
