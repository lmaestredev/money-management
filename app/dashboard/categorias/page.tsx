import { fetchCategories } from '@/app/lib/data/categories';
import styles from './page.module.css';

export default async function CategoriasPage() {
  const categories = await fetchCategories();

  return (
    <div>
      <h1 className={styles.title}>Categorías</h1>
      <p className={styles.subtitle}>
        Categorías disponibles para clasificar gastos e ingresos.
      </p>
      {categories.length === 0 ? (
        <p className={styles.empty}>No hay categorías definidas.</p>
      ) : (
        <ul className={styles.list}>
          {categories.map((c) => (
            <li key={c.id} className={styles.listItem}>
              <span className={styles.listOrder}>{c.sort_order}</span>
              <span className={styles.listName}>{c.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
