'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { updateSettingsAction, type SettingsActionState } from '@/app/lib/actions/settings';
import SubmitButton from '@/app/ui/SubmitButton';
import { useToast } from '@/app/ui/toast/ToastProvider';
import type { AppSettings } from '@/app/lib/definitions';
import styles from './SettingsForm.module.css';

type Props = {
  settings: AppSettings;
};

export default function SettingsForm({ settings }: Props) {
  const [manualEnabled, setManualEnabled] = useState(settings.manual_rate_enabled);
  const { toast } = useToast();

  const [state, formAction] = useActionState<SettingsActionState, FormData>(
    updateSettingsAction,
    null
  );

  // Dispara el toast cada vez que la action devuelve un resultado nuevo.
  const lastShown = useRef<SettingsActionState>(null);
  useEffect(() => {
    if (state && state !== lastShown.current) {
      lastShown.current = state;
      toast(state.message, state.ok ? 'success' : 'error');
    }
  }, [state, toast]);

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="manual_rate_enabled" value={manualEnabled ? 'true' : 'false'} />

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Presupuestos mensuales (USD)</legend>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="budget_total_usd" className={styles.label}>
              Presupuesto total
            </label>
            <input
              id="budget_total_usd"
              name="budget_total_usd"
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              defaultValue={settings.budget_total_usd}
            />
            <span className={styles.hint}>Todos los gastos del mes (fijos + variables + tarjeta + cuotas).</span>
          </div>
          <div className={styles.field}>
            <label htmlFor="budget_variable_usd" className={styles.label}>
              Presupuesto de variables
            </label>
            <input
              id="budget_variable_usd"
              name="budget_variable_usd"
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              defaultValue={settings.budget_variable_usd}
            />
            <span className={styles.hint}>Solo gastos variables (tarjeta + efectivo/cuentas).</span>
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Tasa de cambio</legend>
        <div className={styles.field}>
          <label htmlFor="rate_source" className={styles.label}>
            Cotización para convertir pesos → USD
          </label>
          <select
            id="rate_source"
            name="rate_source"
            className={styles.select}
            defaultValue={settings.rate_source}
          >
            <option value="blue">Blue</option>
            <option value="oficial">Oficial</option>
          </select>
          <span className={styles.hint}>
            La que se usa para sumar los gastos en pesos al total en dólares.
          </span>
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={manualEnabled}
            onChange={(e) => setManualEnabled(e.target.checked)}
            className={styles.checkbox}
          />
          <span>
            <span className={styles.checkboxLabel}>Usar tasa manual</span>
            <span className={styles.hint}>
              Si la activás, este valor tiene prioridad sobre la cotización de la API.
            </span>
          </span>
        </label>

        {manualEnabled ? (
          <div className={styles.field}>
            <label htmlFor="manual_rate_value" className={styles.label}>
              Tasa manual (pesos por USD)
            </label>
            <input
              id="manual_rate_value"
              name="manual_rate_value"
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              defaultValue={settings.manual_rate_value ?? ''}
              placeholder="Ej. 1430"
            />
          </div>
        ) : (
          <input
            type="hidden"
            name="manual_rate_value"
            value={settings.manual_rate_value ?? ''}
          />
        )}
      </fieldset>

      <div className={styles.actions}>
        <SubmitButton>Guardar configuración</SubmitButton>
      </div>
    </form>
  );
}
