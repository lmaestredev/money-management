import CreditCardForm from '@/app/ui/credit-cards/CreditCardForm';
import styles from './page.module.css';

export default function NuevaTarjetaPage() {
  return (
    <div>
      <h1 className={styles.title}>Registrar tarjeta</h1>
      <p className={styles.subtitle}>
        Indica el nombre, el límite y los días de cierre y vencimiento del resumen.
      </p>
      <CreditCardForm />
    </div>
  );
}
