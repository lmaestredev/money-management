import AccountForm from '@/app/ui/accounts/AccountForm';
import FormValidationBanner from '@/app/ui/FormValidationBanner';
import styles from './page.module.css';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NuevaCuentaPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className={styles.title}>Registrar cuenta</h1>
      <p className={styles.subtitle}>
        Indica el banco o institución, la moneda y el saldo actual.
      </p>
      <FormValidationBanner error={error} />
      <AccountForm />
    </div>
  );
}
