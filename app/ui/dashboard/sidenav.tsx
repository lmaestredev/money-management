'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon,
  BanknotesIcon,
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

export default function SideNav() {
  const pathname = usePathname();

  return (
    <div className={styles.sidebar}>
      <Link className={styles.logoLink} href="/">
        <span className={`${styles.logoText} font-heading`}>
          Money Management
        </span>
      </Link>
      <div className={styles.nav}>
        {links.map((link) => {
          const LinkIcon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
            >
              <LinkIcon className={styles.linkIcon} />
              <span className={styles.linkLabel}>{link.name}</span>
            </Link>
          );
        })}
        <button type="button" className={styles.signOut}>
          <PowerIcon className={styles.linkIcon} />
          <span className={styles.signOutLabel}>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}
