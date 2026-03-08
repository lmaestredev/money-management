'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon,
  BanknotesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { PowerIcon } from '@heroicons/react/24/outline';
import styles from './sidenav.module.css';

const links = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Movimientos',
    href: '/dashboard/movimientos',
    icon: ArrowTrendingUpIcon,
  },
  { name: 'Cuentas', href: '/dashboard/cuentas', icon: BanknotesIcon },
  { name: 'Categorías', href: '/dashboard/categorias', icon: Squares2X2Icon },
];

type Props = {
  onNavigate?: () => void;
};

export default function SideNav({ onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <Link
          className={styles.logoLink}
          href="/"
          onClick={onNavigate}
        >
          <span className={`${styles.logoText} font-heading`}>
            Money Management
          </span>
        </Link>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onNavigate}
          aria-label="Cerrar menú"
        >
          <XMarkIcon className={styles.closeIcon} />
        </button>
      </div>
      <div className={styles.nav}>
        {links.map((link) => {
          const LinkIcon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
              onClick={onNavigate}
            >
              <LinkIcon className={styles.linkIcon} />
              <span className={styles.linkLabel}>{link.name}</span>
            </Link>
          );
        })}
        <button type="button" className={styles.signOut} onClick={onNavigate}>
          <PowerIcon className={styles.linkIcon} />
          <span className={styles.signOutLabel}>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}
