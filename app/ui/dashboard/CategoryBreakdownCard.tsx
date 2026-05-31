import { formatUsd } from '@/app/lib/utils';
import styles from './CategoryBreakdownCard.module.css';

const CATEGORY_ICONS: Record<string, string> = {
  vivienda: '🏠',
  hogar: '🏠',
  alimentación: '🛒',
  comida: '🛒',
  servicios: '⚡',
  educación: '📚',
  ocio: '🎯',
  transporte: '🚗',
  salud: '❤️',
};

function getCategoryIcon(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '');
  for (const [k, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return icon;
  }
  return '📁';
}

export type CategoryTotal = {
  name: string;
  amount: number;
};

type Props = {
  items: CategoryTotal[];
};

export default function CategoryBreakdownCard({ items }: Props) {
  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Gastos por categoría</h2>
          <p className={styles.cardSubtitle}>Distribución del mes</p>
        </div>
      </div>
      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.name} className={styles.categoryItem}>
            <div className={styles.categoryInfo}>
              <span className={styles.categoryIcon} aria-hidden>
                {getCategoryIcon(item.name)}
              </span>
              <span className={styles.categoryName}>{item.name}</span>
            </div>
            <span className={styles.categoryAmount}>{formatUsd(item.amount)}</span>
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <div className={styles.categoryItem}>
          <span className={styles.totalLabel}>Total</span>
          <span className={styles.totalAmount}>{formatUsd(total)}</span>
        </div>
      </div>
    </section>
  );
}
