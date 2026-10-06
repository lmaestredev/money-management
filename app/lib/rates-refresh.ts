/**
 * Política de refresco de cotizaciones (sin DB, testeable): cuándo están viejas,
 * cuánto falta para poder volver a actualizar a mano, y qué mensaje mostrar.
 */
import type { RateFailure } from './dolarapi';

export const STALE_MS = 6 * 60 * 60 * 1000; // 6 horas
export const REFRESH_COOLDOWN_MS = 60 * 1000; // 1 actualización manual por minuto
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
