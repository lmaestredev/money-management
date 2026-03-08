'use client';

import { useState } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import SideNav from '@/app/ui/dashboard/sidenav';
import styles from './DashboardShell.module.css';

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={styles.container}>
      {/* Barra superior solo en móvil: abre el drawer */}
      <header className={styles.mobileHeader}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <Bars3Icon className={styles.menuIcon} />
        </button>
        <span className={`${styles.mobileTitle} font-heading`}>Money Management</span>
      </header>

      {/* Fondo oscuro al abrir el drawer en móvil */}
      <button
        type="button"
        className={styles.backdrop}
        aria-hidden={!mobileMenuOpen}
        onClick={() => setMobileMenuOpen(false)}
        style={{ visibility: mobileMenuOpen ? 'visible' : 'hidden', opacity: mobileMenuOpen ? 1 : 0 }}
      />

      {/* Sidebar: en móvil es drawer (fuera de pantalla si está cerrado), en desktop siempre visible */}
      <aside
        className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <SideNav onNavigate={() => setMobileMenuOpen(false)} />
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
