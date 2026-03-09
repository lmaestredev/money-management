import styles from './DashboardAlert.module.css';

type Props = {
  message: React.ReactNode;
};

export default function DashboardAlert({ message }: Props) {
  return (
    <div className={styles.alert} role="alert">
      <span className={styles.alertIcon} aria-hidden>⚠️</span>
      <span className={styles.alertText}>{message}</span>
    </div>
  );
}
