import {
  BanknotesIcon,
  WalletIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import styles from './cards.module.css';

export type CardType = 'account' | 'income' | 'expense';

export type CardData =
  | {
      type: 'account';
      title: string;
      valuePesos: number;
      valueDollars: number;
    }
  | {
      type: 'income';
      title: string;
      value: string;
    }
  | {
      type: 'expense';
      title: string;
      value: string;
    };

function formatPesos(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDollars(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Card({ data }: { data: CardData }) {
  if (data.type === 'account') {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <WalletIcon className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>{data.title}</h3>
        </div>
        <div className={styles.cardValue}>
          <span className="font-heading">{formatPesos(data.valuePesos)}</span>
          <div className={styles.cardValueSecondary}>
            {formatDollars(data.valueDollars)}
          </div>
        </div>
      </div>
    );
  }

  if (data.type === 'income') {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <ArrowTrendingUpIcon className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>{data.title}</h3>
        </div>
        <p className={styles.cardValue}>{data.value}</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <ArrowTrendingDownIcon className={styles.cardIcon} />
        <h3 className={styles.cardTitle}>{data.title}</h3>
      </div>
      <p className={styles.cardValue}>{data.value}</p>
    </div>
  );
}

export function CardGrid({ cards }: { cards: CardData[] }) {
  return (
    <div className={styles.grid}>
      {cards.map((data, i) => (
        <Card key={data.type === 'account' ? data.title : `${data.type}-${i}`} data={data} />
      ))}
    </div>
  );
}
