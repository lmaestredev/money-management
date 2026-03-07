import SideNav from '@/app/ui/dashboard/sidenav';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <SideNav />
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
