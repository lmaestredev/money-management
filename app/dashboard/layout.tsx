import DashboardShell from '@/app/ui/dashboard/DashboardShell';

// El dashboard muestra datos vivos del usuario (cuentas, movimientos, etc.):
// se renderiza por request, nunca se prerenderiza en build. Esto evita además
// que el build de Vercel intente conectar a la BD al generar páginas estáticas.
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
