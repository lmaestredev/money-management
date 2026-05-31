'use client';

import { TrashIcon } from '@heroicons/react/24/outline';
import { deleteCreditCardAction } from '@/app/lib/actions/credit-cards';
import styles from './CreditCardItem.module.css';

type Props = {
  id: string;
  name: string;
};

export default function DeleteCreditCardButton({ id, name }: Props) {
  return (
    <form
      action={deleteCreditCardAction}
      className={styles.deleteForm}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Eliminar la tarjeta "${name}"? Solo es posible si no tiene movimientos asociados.`
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
        aria-label={`Eliminar tarjeta ${name}`}
      >
        <TrashIcon className={styles.menuIcon} />
      </button>
    </form>
  );
}
