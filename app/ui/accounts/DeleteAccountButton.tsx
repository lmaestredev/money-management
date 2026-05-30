'use client';

import { TrashIcon } from '@heroicons/react/24/outline';
import { deleteAccountAction } from '@/app/lib/actions/accounts';
import styles from './AccountCard.module.css';

type Props = {
  id: string;
  name: string;
};

export default function DeleteAccountButton({ id, name }: Props) {
  return (
    <form
      action={deleteAccountAction}
      className={styles.deleteForm}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Eliminar la cuenta "${name}"? Solo es posible si no tiene movimientos asociados.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={styles.menuBtn}
        title="Eliminar"
        aria-label={`Eliminar cuenta ${name}`}
      >
        <TrashIcon className={styles.menuIcon} />
      </button>
    </form>
  );
}
