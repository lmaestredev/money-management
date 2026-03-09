import styles from './ChartPlaceholder.module.css';

type Props = {
  title?: string;
  subtitle?: string;
};

export default function ChartPlaceholder({
  title = 'Tendencia de gastos',
  subtitle = 'Últimos 6 meses',
}: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          <p className={styles.cardSubtitle}>{subtitle}</p>
        </div>
      </div>
      <div className={styles.chart}>
        📊 Gráfico de líneas (últimos 6 meses)
      </div>
    </section>
  );
}
