import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';
import DashboardShell from '@/app/ui/dashboard/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protege todo el dashboard: requiere sesión. Leer la sesión (cookies) hace
  // que estas rutas se rendericen por request y no se prerendericen en build.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <DashboardShell>{children}</DashboardShell>;
}
