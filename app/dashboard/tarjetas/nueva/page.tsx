import CreditCardForm from '@/app/ui/credit-cards/CreditCardForm';
import FormValidationBanner from '@/app/ui/FormValidationBanner';
import styles from './page.module.css';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NuevaTarjetaPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className={styles.title}>Registrar tarjeta</h1>
      <p className={styles.subtitle}>
        Indica el nombre, el límite y los días de cierre y vencimiento del resumen.
      </p>
      <FormValidationBanner error={error} />
      <CreditCardForm />
    </div>
  );
}
