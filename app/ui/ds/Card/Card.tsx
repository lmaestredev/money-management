import type { HTMLAttributes, ReactNode } from 'react';
import glass from '@/app/styles/glass.module.css';
import styles from './Card.module.css';

export type CardVariant = 'surface' | 'glass';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  children: ReactNode;
};

export default function Card({
  variant = 'surface',
  children,
  className,
  ...rest
}: CardProps) {
  const variantClass = variant === 'glass' ? glass.glassBase : styles.surface;
  const classes = [styles.card, variantClass, className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
