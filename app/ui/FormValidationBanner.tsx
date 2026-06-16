import { getFormErrorMessage } from '@/app/lib/utils/form-errors';
import styles from './FormValidationBanner.module.css';

type Props = {
  error?: string | null;
};

export default function FormValidationBanner({ error }: Props) {
  const message = getFormErrorMessage(error);
  if (!message) return null;

  return (
    <div className={styles.banner} role="alert">
      <span aria-hidden>⛔</span>
      <span>{message}</span>
    </div>
  );
}
