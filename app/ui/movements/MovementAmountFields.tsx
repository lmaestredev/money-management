'use client';

import styles from './MovementAmountFields.module.css';

type Props = {
  showSplitAmounts: boolean;
  amountLabel: string;
  sourceSelected: boolean;
  defaultPesos?: number | string;
  defaultDollars?: number | string;
  defaultSingle?: number | string;
};

export default function MovementAmountFields({
  showSplitAmounts,
  amountLabel,
  sourceSelected,
  defaultPesos = '',
  defaultDollars = '',
  defaultSingle = '',
}: Props) {
  if (showSplitAmounts) {
    return (
      <div className={styles.field}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="amount_pesos" className={styles.label}>
              Monto (pesos)
            </label>
            <input
              id="amount_pesos"
              name="amount_pesos"
              type="number"
              step="0.01"
              min="0"
              className={styles.input}
              disabled={!sourceSelected}
              defaultValue={defaultPesos}
              placeholder={sourceSelected ? '0' : 'Selecciona una cuenta'}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="amount_dollars" className={styles.label}>
              Monto (dólares)
            </label>
            <input
              id="amount_dollars"
              name="amount_dollars"
              type="number"
              step="0.01"
              min="0"
              className={styles.input}
              disabled={!sourceSelected}
              defaultValue={defaultDollars}
              placeholder={sourceSelected ? '0' : 'Selecciona una cuenta'}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.field}>
      <label htmlFor="amount" className={styles.label}>
        {amountLabel}
      </label>
      <input
        id="amount"
        name="amount"
        type="number"
        step="0.01"
        min="0"
        className={styles.input}
        required
        disabled={!sourceSelected}
        defaultValue={defaultSingle}
        placeholder={sourceSelected ? '0' : 'Selecciona una cuenta o tarjeta'}
      />
    </div>
  );
}
