'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon,
  BanknotesIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  RectangleStackIcon,
  ArrowDownCircleIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { PowerIcon } from '@heroicons/react/24/outline';
import { signOut } from '@/app/lib/actions/auth';
import styles from './sidenav.module.css';

const links = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Movimientos',
    href: '/dashboard/movimientos',
    icon: ArrowTrendingUpIcon,
  },
  { name: 'Ingresos', href: '/dashboard/ingresos', icon: ArrowDownCircleIcon },
  { name: 'Cuentas', href: '/dashboard/cuentas', icon: BanknotesIcon },
  { name: 'Tarjetas', href: '/dashboard/tarjetas', icon: CreditCardIcon },
  { name: 'Cuotas', href: '/dashboard/cuotas', icon: RectangleStackIcon },
  { name: 'Gastos fijos', href: '/dashboard/gastos-fijos', icon: CalendarDaysIcon },
  { name: 'Categorías', href: '/dashboard/categorias', icon: Squares2X2Icon },
];

type Props = {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export default function SideNav({ onNavigate, collapsed = false, onToggleCollapsed }: Props) {
  const pathname = usePathname();

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      <header className={styles.sidebarHeader}>
        <Link
          className={styles.logoLink}
          href="/"
          onClick={onNavigate}
          title={collapsed ? 'Money Management' : undefined}
        >
          {collapsed ? (
            <CurrencyDollarIcon className={styles.logoIcon} aria-hidden />
          ) : (
            <span className={`${styles.logoText} font-heading`}>
              Money Management
            </span>
          )}
        </Link>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onNavigate}
          aria-label="Cerrar menú"
        >
          <XMarkIcon className={styles.closeIcon} />
        </button>
      </header>
      <nav className={styles.nav} aria-label="Principal">
        {links.map((link) => {
          const LinkIcon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'));
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`${styles.link} ${isActive ? styles.linkActive : ''} ${collapsed ? styles.linkCollapsed : ''}`}
              onClick={onNavigate}
              title={collapsed ? link.name : undefined}
            >
              <LinkIcon className={styles.linkIcon} />
              <span className={styles.linkLabel}>{link.name}</span>
            </Link>
          );
        })}
      </nav>
      <footer className={styles.sidebarFooter}>
        <form action={signOut} className={styles.signOutForm}>
          <button
            type="submit"
            className={`${styles.signOut} ${collapsed ? styles.signOutCollapsed : ''}`}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <PowerIcon className={styles.linkIcon} />
            <span className={styles.signOutLabel}>Cerrar sesión</span>
          </button>
        </form>
        {onToggleCollapsed && (
          <button
            type="button"
            className={styles.collapseToggle}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {collapsed ? (
              <ChevronRightIcon className={styles.collapseIcon} />
            ) : (
              <ChevronLeftIcon className={styles.collapseIcon} />
            )}
          </button>
        )}
      </footer>
    </div>
  );
}
