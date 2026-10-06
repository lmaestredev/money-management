/**
 * Política de refresco de cotizaciones (sin DB, testeable): cuándo están viejas,
 * cuánto falta para poder volver a actualizar a mano, y qué mensaje mostrar.
 */
import type { RateFailure } from './dolarapi';

export const STALE_MS = 6 * 60 * 60 * 1000; // 6 horas
export const REFRESH_COOLDOWN_MS = 60 * 1000; // 1 actualización manual por minuto
export const RATE_OLD_MS = 24 * 60 * 60 * 1000; // más de 24 h sin actualizarse: se avisa
const EXPECTED_RATES = 2; // blue y oficial

type Timestamp = string | Date;

function newestMs(updatedAts: Timestamp[]): number {
  return updatedAts.reduce((acc, t) => Math.max(acc, new Date(t).getTime()), 0);
}

/** true si faltan cotizaciones o la más reciente es más vieja que `maxAgeMs`. */
export function isStale(
  updatedAts: Timestamp[],
  nowMs: number,
  maxAgeMs: number = STALE_MS
): boolean {
  return updatedAts.length < EXPECTED_RATES || nowMs - newestMs(updatedAts) > maxAgeMs;
}

/** Segundos que faltan para poder actualizar a mano de nuevo (0 = ya se puede). */
export function cooldownSecondsLeft(
  updatedAts: Timestamp[],
  nowMs: number,
  cooldownMs: number = REFRESH_COOLDOWN_MS
): number {
  if (updatedAts.length === 0) return 0;
  const left = cooldownMs - (nowMs - newestMs(updatedAts));
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

export type RefreshToast = { message: string; type: 'success' | 'error' };

const LABELS: Record<string, string> = { blue: 'Blue', oficial: 'Oficial' };

export function cooldownToast(secondsLeft: number): RefreshToast {
  return {
    message: `Las cotizaciones se actualizaron hace instantes. Probá de nuevo en ${secondsLeft} s.`,
    type: 'error',
  };
}

/** Mensaje para el resultado de refreshExchangeRates. */
export function refreshToast(
  result: { ok: true; failed: RateFailure[] } | { ok: false; failed: RateFailure[] }
): RefreshToast {
  if (!result.ok) {
    return {
      message: 'No se pudo actualizar la cotización. Se mantiene la última guardada.',
      type: 'error',
    };
  }
  if (result.failed.length > 0) {
    const names = result.failed.map((f) => LABELS[f.source] ?? f.source).join(' y ');
    return {
      message: `Se actualizó solo una casa. ${names} sigue con su última cotización.`,
      type: 'error',
    };
  }
  return { message: 'Cotizaciones actualizadas.', type: 'success' };
}

/**
 * ¿La cotización que se usa lleva demasiado sin actualizarse? `fetchedAt` es cuándo la
 * APP la guardó por última vez (no la fecha de la fuente, que en fin de semana puede no
 * cambiar). null = tasa manual: no envejece.
 */
export function isRateOld(
  fetchedAt: Timestamp | null,
  nowMs: number,
  maxAgeMs: number = RATE_OLD_MS
): boolean {
  if (fetchedAt == null) return false;
  return nowMs - new Date(fetchedAt).getTime() > maxAgeMs;
}

/** "hace instantes", "hace 5 min", "hace 3 h", "hace 2 días". */
export function rateAgeLabel(fetchedAt: Timestamp, nowMs: number): string {
  const min = Math.max(0, Math.floor((nowMs - new Date(fetchedAt).getTime()) / 60_000));
  if (min < 1) return 'hace instantes';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}
