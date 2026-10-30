import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  createCreditCardAction,
  updateCreditCardAction,
} from '@/app/lib/actions/credit-cards';
import { fetchPeople } from '@/app/lib/data/people';
import { createClient } from '@/app/lib/supabase/server';
import SubmitButton from '@/app/ui/SubmitButton';
import type { CreditCard } from '@/app/lib/definitions';
import styles from './CreditCardForm.module.css';

type Props = {
  card?: CreditCard;
};

export default async function CreditCardForm({ card }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const people = await fetchPeople(user.id);
  const isEdit = !!card;
  const limit = card ? card.credit_limit : undefined;

  return (
    <form
      action={isEdit ? updateCreditCardAction : createCreditCardAction}
      className={styles.form}
    >
      {isEdit && <input type="hidden" name="id" value={card!.id} />}

      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          Nombre de la tarjeta
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className={styles.input}
          placeholder="Ej. Visa Galicia, Amex Platinum"
          defaultValue={card?.name ?? ''}
          required
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="bank" className={styles.label}>
            Banco o emisor
          </label>
          <input
            id="bank"
            name="bank"
            type="text"
            className={styles.input}
            placeholder="Ej. Banco Galicia"
            defaultValue={card?.bank ?? ''}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="brand" className={styles.label}>
            Marca
          </label>
          <select
            id="brand"
            name="brand"
            className={styles.select}
            defaultValue={card?.brand ?? ''}
          >
            <option value="">Sin especificar</option>
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="amex">American Express</option>
            <option value="otra">Otra</option>
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="currency" className={styles.label}>
            Moneda
          </label>
          <select
            id="currency"
            name="currency"
            className={styles.select}
            defaultValue={card?.currency ?? 'peso'}
            required
          >
            <option value="peso">Peso (ARS)</option>
            <option value="dollar">Dólar (USD)</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="credit_limit" className={styles.label}>
            Límite de crédito
          </label>
          <input
            id="credit_limit"
            name="credit_limit"
            type="number"
            step="0.01"
            min="0"
            className={styles.input}
            placeholder="0"
            defaultValue={limit ?? ''}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="closing_day" className={styles.label}>
            Día de cierre
          </label>
          <input
            id="closing_day"
            name="closing_day"
            type="number"
            min="1"
            max="31"
            className={styles.input}
            placeholder="Ej. 25"
            defaultValue={card?.closing_day ?? ''}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="due_day" className={styles.label}>
            Día de vencimiento
          </label>
          <input
            id="due_day"
            name="due_day"
            type="number"
            min="1"
            max="31"
            className={styles.input}
            placeholder="Ej. 10"
            defaultValue={card?.due_day ?? ''}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="owner_id" className={styles.label}>
          Dueño
        </label>
        <select
          id="owner_id"
          name="owner_id"
          className={styles.select}
          defaultValue={card?.owner_id ?? ''}
        >
          <option value="">Compartida / sin asignar</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>

      {isEdit && (
        <div className={styles.field}>
          <label htmlFor="active" className={styles.label}>
            Estado
          </label>
          <select
            id="active"
            name="active"
            className={styles.select}
            defaultValue={card!.active ? 'true' : 'false'}
          >
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
        </div>
      )}

      <div className={styles.actions}>
        <SubmitButton>{isEdit ? 'Guardar cambios' : 'Guardar tarjeta'}</SubmitButton>
        <Link href="/dashboard/tarjetas" className={`${styles.button} ${styles.buttonSecondary}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
