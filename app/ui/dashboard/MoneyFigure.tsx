import { formatUsd, formatArs } from '@/app/lib/utils';
import styles from './MoneyFigure.module.css';

type Props = {
  usd: number;
  /** Cotización pesos/USD. Sin cotización no se muestra el equivalente en pesos. */
  rate: number | null;
  /** USD incompleto (sin cotización y con pesos sin convertir): se muestra "—". */
  incomplete?: boolean;
  /** Prefijo opcional ("+", "−") delante del monto principal. */
  prefix?: string;
  size?: 'lg' | 'md';
  tone?: 'default' | 'income' | 'expense';
};

/** Monto principal en dólares, con el equivalente en pesos en letra chica. */
export default function MoneyFigure({
  usd,
  rate,
  incomplete = false,
  prefix = '',
  size = 'md',
  tone = 'default',
}: Props) {
  const toneClass =
    tone === 'income' ? styles.income : tone === 'expense' ? styles.expense : '';
  return (
    <span className={styles.root}>
      <span className={`${styles.main} ${size === 'lg' ? styles.lg : styles.md} ${toneClass}`}>
        {incomplete ? '—' : `${prefix}${formatUsd(usd)}`}
      </span>
      {!incomplete && rate ? <span className={styles.sub}>≈ {formatArs(usd * rate)}</span> : null}
    </span>
  );
}
