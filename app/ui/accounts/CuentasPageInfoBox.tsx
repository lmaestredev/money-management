import styles from './CuentasPageInfoBox.module.css';

export default function CuentasPageInfoBox() {
  return (
    <div className={styles.infoBox} role="region" aria-label="Información">
      <span className={styles.infoIcon} aria-hidden>ℹ️</span>
      <p className={styles.infoText}>
        Registra todas tus cuentas bancarias y billeteras digitales. Así tendrás un control
        completo de tu dinero en un solo lugar.
      </p>
    </div>
  );
}
