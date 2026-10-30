import Link from 'next/link';
import MoneyFigure from './MoneyFigure';
import styles from './ExpenseSplit.module.css';

type Item = { usd: number; incomplete: boolean };

type Props = {
  installments: Item;
  fixed: Item;
  other: Item;
  rate: number | null;
};

/** En qué se fue lo que gastaste este mes. El detalle está en cada pantalla. */
export default function ExpenseSplit({ installments, fixed, other, rate }: Props) {
  const cards = [
    { href: '/dashboard/cuotas', icon: '💳', title: 'Cuotas', hint: 'Pagadas este mes', item: installments },
    { href: '/dashboard/gastos-fijos', icon: '🔒', title: 'Gastos fijos', hint: 'Alquiler, servicios, etc.', item: fixed },
    { href: '/dashboard/movimientos', icon: '🛒', title: 'Otros gastos', hint: 'Compras del día a día', item: other },
  ];

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>En qué se fue tu plata</h2>
      <div className={styles.grid}>
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={styles.card}>
            <span className={styles.cardTop}>
              <span className={styles.icon} aria-hidden>{c.icon}</span>
              <span className={styles.title}>{c.title}</span>
              <span className={styles.arrow} aria-hidden>→</span>
            </span>
            <MoneyFigure usd={c.item.usd} rate={rate} incomplete={c.item.incomplete} />
            <span className={styles.hint}>{c.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
