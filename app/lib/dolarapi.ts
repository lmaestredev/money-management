/**
 * Cliente puro (sin DB) de dolarapi.com: valida la respuesta y clasifica los
 * resultados. Separado de data/exchange-rates.ts para poder testearlo.
 */
import type { RateSource } from './definitions';

const DOLARAPI_BASE = 'https://dolarapi.com/v1/dolares';
export const DOLARAPI_TIMEOUT_MS = 3000;

export type DolarApiQuote = {
  source: RateSource;
  compra: number;
  venta: number;
  source_updated_at: string | null;
};

export type RateFailure = { source: RateSource; error: string };

/**
 * Número positivo y finito, o NaN. NO usa Number(null): eso da 0 y una cotización
 * en 0 pisaba la buena y dejaba de convertir los pesos.
 */
function positiveNumber(value: unknown): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : Number.NaN;
}

/** Valida el cuerpo de dolarapi. Lanza si compra o venta no son números > 0. */
export function parseDolarApiQuote(source: RateSource, data: unknown): DolarApiQuote {
  const body = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const compra = positiveNumber(body.compra);
  const venta = positiveNumber(body.venta);
  if (Number.isNaN(compra) || Number.isNaN(venta)) {
    throw new Error(`dolarapi ${source}: cotización inválida (compra y venta deben ser > 0)`);
  }
  const updated = body.fechaActualizacion;
  return {
    source,
    compra,
    venta,
    source_updated_at:
      typeof updated === 'string' && !Number.isNaN(Date.parse(updated)) ? updated : null,
  };
}

type FetchOptions = { fetchImpl?: typeof fetch; timeoutMs?: number };

/** Trae y valida la cotización de una casa. Corta a los 3 s si la API no responde. */
export async function fetchDolarApiQuote(
  source: RateSource,
  { fetchImpl = fetch, timeoutMs = DOLARAPI_TIMEOUT_MS }: FetchOptions = {}
): Promise<DolarApiQuote> {
  const res = await fetchImpl(`${DOLARAPI_BASE}/${source}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`dolarapi ${source} respondió ${res.status}`);
  return parseDolarApiQuote(source, await res.json());
}

/**
 * Separa lo que salió bien de lo que falló. Una casa que falla no impide guardar
 * la otra: la que falla conserva su última cotización buena.
 */
export function settleQuotes(
  sources: RateSource[],
  settled: PromiseSettledResult<DolarApiQuote>[]
): { quotes: DolarApiQuote[]; failed: RateFailure[] } {
  const quotes: DolarApiQuote[] = [];
  const failed: RateFailure[] = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      quotes.push(r.value);
    } else {
      const error = r.reason instanceof Error ? r.reason.message : String(r.reason);
      failed.push({ source: sources[i], error });
    }
  });
  return { quotes, failed };
}
