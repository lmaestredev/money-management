import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';
import DashboardShell from '@/app/ui/dashboard/DashboardShell';

// El dashboard es inherentemente dinámico: depende del usuario autenticado y de
// datos vivos. Lo declaramos a nivel de segmento (se hereda a todas las rutas
// hijas) para garantizar que el build NO lo prerenderice ni conecte a la BD.
// Es complementario a la auth: auth = seguridad, esto = modo de render.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protege todo el dashboard: requiere sesión.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <DashboardShell>{children}</DashboardShell>;
}
