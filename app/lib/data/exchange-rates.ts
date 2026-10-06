import { sql } from '../db';
import { fetchDolarApiQuote, settleQuotes, type RateFailure } from '../dolarapi';
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

/** Inserta o actualiza la cotización de una casa. Rechaza valores no positivos. */
export async function upsertExchangeRate(data: ExchangeRateUpsert): Promise<void> {
  // Red de seguridad: una cotización en 0 dejaría de convertir los pesos a USD.
  if (!(data.compra > 0) || !(data.venta > 0) || !Number.isFinite(data.compra + data.venta)) {
    throw new Error(`cotización inválida para ${data.source}: compra y venta deben ser > 0`);
  }
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
// La validación y el timeout viven en ../dolarapi (módulo puro, con tests).
// ---------------------------------------------------------------------------

const RATE_SOURCES: RateSource[] = ['blue', 'oficial'];

export type RefreshRatesResult =
  | { ok: true; rates: ExchangeRate[]; failed: RateFailure[] }
  | { ok: false; error: string; failed: RateFailure[] };

/**
 * Trae blue y oficial de dolarapi y persiste las que lleguen válidas. Si una casa
 * falla (HTTP, timeout o dato inválido) conserva su última cotización buena y se
 * informa en `failed`; solo es `ok: false` si fallan las dos.
 */
export async function refreshExchangeRates(): Promise<RefreshRatesResult> {
  const settled = await Promise.allSettled(RATE_SOURCES.map((s) => fetchDolarApiQuote(s)));
  const { quotes, failed } = settleQuotes(RATE_SOURCES, settled);

  const saved: typeof quotes = [];
  for (const quote of quotes) {
    try {
      await upsertExchangeRate(quote);
      saved.push(quote);
    } catch (err) {
      failed.push({ source: quote.source, error: err instanceof Error ? err.message : String(err) });
    }
  }

  for (const f of failed) {
    console.error(`[rates] ${f.source} quedó con su última cotización: ${f.error}`);
  }

  if (saved.length === 0) {
    return { ok: false, error: failed.map((f) => `${f.source}: ${f.error}`).join('; '), failed };
  }
  try {
    return { ok: true, rates: await fetchExchangeRates(), failed };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'error desconocido', failed };
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
export async function getEffectiveRate(userId: string): Promise<EffectiveRate | null> {
  const settings = await getSettings(userId);

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
