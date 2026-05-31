import '@/app/styles/globals.css';
import {
  ArrowRightIcon,
  ShoppingBagIcon,
  ArrowDownTrayIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { interVariable } from '@/app/ui/fonts';
import Button from '@/app/ui/ds/Button';
import Card from '@/app/ui/ds/Card';
import TransactionItem from '@/app/ui/ds/TransactionItem';
import typo from '@/app/styles/typography.module.css';
import glass from '@/app/styles/glass.module.css';
import styles from './page.module.css';

const SWATCHES: { name: string; varName: string }[] = [
  { name: 'primary', varName: '--color-primary' },
  { name: 'secondary', varName: '--color-secondary' },
  { name: 'tertiary', varName: '--color-tertiary' },
  { name: 'error', varName: '--color-error' },
  { name: 'surface-container', varName: '--color-surface-container' },
  { name: 'surface-container-high', varName: '--color-surface-container-high' },
  { name: 'outline', varName: '--color-outline' },
  { name: 'on-surface', varName: '--color-on-surface' },
];

export default function DesignSystemPreview() {
  return (
    <main className={`${interVariable.variable} ${styles.page}`}>
      <header>
        <h1 className={`${typo.displayLg} ${styles.pageTitle}`}>Ethereal Finance</h1>
        <p className={`${typo.bodyLg} ${styles.pageSubtitle}`}>
          Design system preview — tokens, tipografía, glass y componentes.
        </p>
      </header>

      {/* Tipografía */}
      <section className={styles.section}>
        <h2 className={`${typo.headlineMd} ${styles.sectionTitle}`}>Tipografía</h2>
        <div className={styles.stack}>
          <span className={`${typo.displayLg} ${styles.onSurface}`}>Display LG — $12,480.50</span>
          <span className={`${typo.headlineMd} ${styles.onSurface}`}>Headline MD</span>
          <span className={`${typo.headlineSm} ${styles.onSurface}`}>Headline SM</span>
          <span className={`${typo.bodyLg} ${styles.onSurface}`}>
            Body LG — texto de párrafo para descripciones largas.
          </span>
          <span className={`${typo.bodyMd} ${styles.onSurfaceVariant}`}>
            Body MD — información secundaria.
          </span>
          <span className={`${typo.labelMd} ${styles.onSurfaceVariant}`}>
            LABEL MD — etiquetas y timestamps
          </span>
        </div>
      </section>

      {/* Botones */}
      <section className={styles.section}>
        <h2 className={`${typo.headlineMd} ${styles.sectionTitle}`}>Botones</h2>

        <div className={styles.row}>
          <Button variant="primary" size="sm">Primary SM</Button>
          <Button variant="primary" size="md">Primary MD</Button>
          <Button variant="primary" size="lg">Primary LG</Button>
          <Button variant="primary" size="md" icon={<ArrowRightIcon />}>
            Con icono
          </Button>
        </div>

        <div className={styles.row}>
          <Button variant="secondary" size="sm">Secondary SM</Button>
          <Button variant="secondary" size="md">Secondary MD</Button>
          <Button variant="secondary" size="lg">Secondary LG</Button>
        </div>

        <div className={styles.row}>
          <Button variant="ghost" size="sm">Ghost SM</Button>
          <Button variant="ghost" size="md">Ghost MD</Button>
          <Button variant="ghost" size="lg">Ghost LG</Button>
        </div>

        <div className={styles.row}>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="secondary" disabled>Disabled</Button>
          <Button variant="ghost" disabled>Disabled</Button>
        </div>
      </section>

      {/* Cards */}
      <section className={styles.section}>
        <h2 className={`${typo.headlineMd} ${styles.sectionTitle}`}>Cards</h2>
        <div className={styles.grid}>
          <Card variant="surface">
            <h3 className={`${typo.headlineSm} ${styles.cardTitle}`}>Surface Card</h3>
            <p className={`${typo.bodyMd} ${styles.cardText}`}>
              Contenedor sólido charcoal con esquinas muy redondeadas y padding interno.
            </p>
          </Card>

          <div className={styles.glassStage}>
            <span className={`${styles.blob} ${styles.blobOne}`} aria-hidden="true" />
            <span className={`${styles.blob} ${styles.blobTwo}`} aria-hidden="true" />
            <Card variant="glass">
              <h3 className={`${typo.headlineSm} ${styles.cardTitle}`}>Glass Card</h3>
              <p className={`${typo.bodyMd} ${styles.cardText}`}>
                Vidrio esmerilado con blur de fondo y borde de gradiente.
              </p>
            </Card>
          </div>

          <div className={styles.glassStage}>
            <span className={`${styles.blob} ${styles.blobTwo}`} aria-hidden="true" />
            <Card variant="glass" className={glass.glassHover}>
              <h3 className={`${typo.headlineSm} ${styles.cardTitle}`}>Glass + hover</h3>
              <p className={`${typo.bodyMd} ${styles.cardText}`}>
                Pasá el mouse para ver el bloom exterior con el color primary.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Transacciones */}
      <section className={styles.section}>
        <h2 className={`${typo.headlineMd} ${styles.sectionTitle}`}>Transacciones</h2>
        <Card variant="surface">
          <TransactionItem
            icon={<ArrowDownTrayIcon />}
            title="Sueldo mensual"
            subtitle="Transferencia recibida"
            amount={3200}
            date="31 may"
          />
          <TransactionItem
            icon={<ShoppingBagIcon />}
            title="Supermercado"
            subtitle="Tarjeta de crédito"
            amount={-84.32}
            date="30 may"
          />
          <TransactionItem
            icon={<CreditCardIcon />}
            title="Pago resumen Visa"
            subtitle="Débito automático"
            amount={-540}
            date="28 may"
          />
        </Card>
      </section>

      {/* Swatches */}
      <section className={styles.section}>
        <h2 className={`${typo.headlineMd} ${styles.sectionTitle}`}>Color tokens</h2>
        <div className={styles.swatchGrid}>
          {SWATCHES.map((s) => (
            <div key={s.name} className={styles.swatch}>
              <span
                className={styles.swatchChip}
                style={{ background: `var(${s.varName})` }}
              />
              <span className={`${typo.labelMd} ${styles.swatchLabel}`}>{s.name}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
