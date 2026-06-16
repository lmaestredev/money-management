import { z } from 'zod';

/** Acepta null/'' de FormData y convierte a número (0 si vacío). */
export const optionalNumber = z.preprocess(
  (v) => (v == null || v === '' ? undefined : String(v)),
  z
    .string()
    .optional()
    .transform((s) => (s && String(s).trim() ? parseFloat(String(s)) : 0))
);

const DASHBOARD_PATH = /^\/dashboard(\/|$)/;

/** Evita open redirects en return_to / redirect_to de formularios. */
export function safeDashboardPath(path: string | undefined | null, fallback: string): string {
  if (!path || typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (!DASHBOARD_PATH.test(trimmed) || trimmed.includes('://') || trimmed.startsWith('//')) {
    return fallback;
  }
  return trimmed;
}
