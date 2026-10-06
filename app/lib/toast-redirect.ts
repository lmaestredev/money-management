import { redirect } from 'next/navigation';

/**
 * Redirige agregando un toast a la URL de destino. El ToastProvider lo lee del
 * parámetro `?toast=` (y `?toastType=error|warning`) y lo muestra al llegar, limpiando
 * luego los params. Útil para acciones que navegan tras guardar/borrar.
 */
export function redirectWithToast(
  path: string,
  message: string,
  type: 'success' | 'error' | 'warning' = 'success'
): never {
  const sep = path.includes('?') ? '&' : '?';
  const params = new URLSearchParams({ toast: message });
  if (type !== 'success') params.set('toastType', type);
  redirect(`${path}${sep}${params.toString()}`);
}
