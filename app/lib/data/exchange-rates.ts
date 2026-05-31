import { sql } from '../db';
import { getSettings } from './settings';
import type { ExchangeRate, RateSource } from '../definitions';

function rowToRate(row: Record<string, unknown>): ExchangeRate {
  const source = row.source as string;
  return {
    source: source === 'oficial' ? 'oficial' : 'blue',
    compra: Number(row.compra),
    venta: Number(row.venta),
    source_updated_at: (row.source_updated_at as string) ?? null,
    updated_at: row.updated_at as string,
  };
}

/** Devuelve las cotizaciones almacenadas (blue y oficial). */
export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  const rows = await sql`
    SELECT source, compra, venta, source_updated_at, updated_at
    FROM exchange_rates
    ORDER BY source ASC
  `;
  return rows.map((r) => rowToRate(r as Record<string, unknown>));
}

/** Devuelve la cotización de una casa puntual, o null si no hay registro. */
export async function fetchExchangeRate(source: RateSource): Promise<ExchangeRate | null> {
  const [row] = await sql`
    SELECT source, compra, venta, source_updated_at, updated_at
    FROM exchange_rates
    WHERE source = ${source}
  `;
  if (!row) return null;
  return rowToRate(row as Record<string, unknown>);
}

export type ExchangeRateUpsert = {
  source: RateSource;
  compra: number;
  venta: number;
  source_updated_at?: string | null;
};

/** Inserta o actualiza la cotización de una casa. */
export async function upsertExchangeRate(data: ExchangeRateUpsert): Promise<void> {
  await sql`
    INSERT INTO exchange_rates (source, compra, venta, source_updated_at, updated_at)
    VALUES (${data.source}, ${data.compra}, ${data.venta}, ${data.source_updated_at ?? null}, NOW())
    ON CONFLICT (source) DO UPDATE SET
      compra = ${data.compra},
      venta = ${data.venta},
      source_updated_at = ${data.source_updated_at ?? null},
      updated_at = NOW()
  `;
}

// ---------------------------------------------------------------------------
// Integración con dolarapi.com (https://dolarapi.com/docs/argentina/)
// ---------------------------------------------------------------------------

const DOLARAPI_BASE = 'https://dolarapi.com/v1/dolares';

type DolarApiResponse = {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
};

async function fetchDolarApi(source: RateSource): Promise<ExchangeRateUpsert> {
  const res = await fetch(`${DOLARAPI_BASE}/${source}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`dolarapi ${source} respondió ${res.status}`);
  }
  const data = (await res.json()) as DolarApiResponse;
  const compra = Number(data.compra);
  const venta = Number(data.venta);
  if (!Number.isFinite(compra) || !Number.isFinite(venta)) {
    throw new Error(`dolarapi ${source}: cotización inválida`);
  }
  return {
    source,
    compra,
    venta,
    source_updated_at: data.fechaActualizacion ?? null,
  };
}

export type RefreshRatesResult =
  | { ok: true; rates: ExchangeRate[] }
  | { ok: false; error: string };

/** Trae blue y oficial de dolarapi y los persiste. */
export async function refreshExchangeRates(): Promise<RefreshRatesResult> {
  try {
    const [blue, oficial] = await Promise.all([
      fetchDolarApi('blue'),
      fetchDolarApi('oficial'),
    ]);
    await Promise.all([upsertExchangeRate(blue), upsertExchangeRate(oficial)]);
    const rates = await fetchExchangeRates();
    return { ok: true, rates };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'error desconocido' };
  }
}

const STALE_MS = 6 * 60 * 60 * 1000; // 6 horas

/** Refresca solo si faltan cotizaciones o la última quedó vieja (red de seguridad sin cron). */
export async function refreshExchangeRatesIfStale(maxAgeMs: number = STALE_MS): Promise<void> {
  const rates = await fetchExchangeRates();
  const newest = rates.reduce(
    (acc, r) => Math.max(acc, new Date(r.updated_at).getTime()),
    0
  );
  if (rates.length < 2 || Date.now() - newest > maxAgeMs) {
    await refreshExchangeRates();
  }
}

export type EffectiveRate = {
  rate: number; // pesos por USD
  source: 'manual' | RateSource;
  updatedAt: string | null;
};

/**
 * Tasa efectiva para convertir pesos→USD: el override manual si está activo y es
 * válido; si no, la `venta` de la casa configurada. null si no hay cotización.
 */
export async function getEffectiveRate(): Promise<EffectiveRate | null> {
  const settings = await getSettings();

  if (
    settings.manual_rate_enabled &&
    settings.manual_rate_value != null &&
    settings.manual_rate_value > 0
  ) {
    return { rate: settings.manual_rate_value, source: 'manual', updatedAt: null };
  }

  const rate = await fetchExchangeRate(settings.rate_source);
  if (!rate || rate.venta <= 0) return null;
  return {
    rate: rate.venta,
    source: settings.rate_source,
    updatedAt: rate.source_updated_at ?? rate.updated_at,
  };
}
