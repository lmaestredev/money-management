import { revalidatePath } from 'next/cache';

/** Invalida las pantallas que leen movimientos, plantillas y saldos. */
export function revalidateFinancialScreens(): void {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/movimientos');
  revalidatePath('/dashboard/ingresos');
  revalidatePath('/dashboard/gastos-fijos');
  revalidatePath('/dashboard/cuotas');
  revalidatePath('/dashboard/historial');
  revalidatePath('/dashboard/cuentas');
  revalidatePath('/dashboard/tarjetas');
}
