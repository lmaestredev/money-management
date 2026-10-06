import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDolarApiQuote, parseDolarApiQuote, settleQuotes, type DolarApiQuote } from './dolarapi';

const OK = { compra: 1525, venta: 1545, fechaActualizacion: '2026-10-05T19:57:00.000Z' };

test('una cotización válida se acepta', () => {
  const q = parseDolarApiQuote('blue', OK);
  assert.deepEqual(q, { source: 'blue', compra: 1525, venta: 1545, source_updated_at: '2026-10-05T19:57:00.000Z' });
});

test('acepta números en texto pero no vacíos', () => {
  assert.equal(parseDolarApiQuote('oficial', { compra: '1490', venta: '1540' }).venta, 1540);
  assert.throws(() => parseDolarApiQuote('oficial', { compra: '', venta: '1540' }));
});

test('null, 0, negativos, NaN e Infinity se rechazan (antes null pasaba como 0 y pisaba la cotización buena)', () => {
  for (const bad of [null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, undefined, '0', 'abc', {}]) {
    assert.throws(() => parseDolarApiQuote('blue', { ...OK, venta: bad }), /inválida/, `venta=${String(bad)}`);
    assert.throws(() => parseDolarApiQuote('blue', { ...OK, compra: bad }), /inválida/, `compra=${String(bad)}`);
  }
});

test('un cuerpo que no es un objeto se rechaza', () => {
  for (const body of [null, undefined, 'x', 42, []]) {
    assert.throws(() => parseDolarApiQuote('blue', body), /inválida/);
  }
});

test('una fecha de actualización inválida se descarta sin invalidar la cotización', () => {
  assert.equal(parseDolarApiQuote('blue', { ...OK, fechaActualizacion: 'no es fecha' }).source_updated_at, null);
  assert.equal(parseDolarApiQuote('blue', { compra: 1, venta: 2 }).source_updated_at, null);
});

test('settleQuotes: si una casa falla se guarda la otra', () => {
  const blue: DolarApiQuote = { source: 'blue', compra: 1, venta: 2, source_updated_at: null };
  const r = settleQuotes(
    ['blue', 'oficial'],
    [{ status: 'fulfilled', value: blue }, { status: 'rejected', reason: new Error('dolarapi oficial respondió 503') }]
  );
  assert.deepEqual(r.quotes, [blue]);
  assert.deepEqual(r.failed, [{ source: 'oficial', error: 'dolarapi oficial respondió 503' }]);
});

test('settleQuotes: si fallan las dos no queda nada para guardar', () => {
  const r = settleQuotes(
    ['blue', 'oficial'],
    [{ status: 'rejected', reason: new Error('a') }, { status: 'rejected', reason: 'b' }]
  );
  assert.equal(r.quotes.length, 0);
  assert.deepEqual(r.failed.map((f) => f.error), ['a', 'b']);
});

test('fetchDolarApiQuote: respuesta HTTP de error', async () => {
  const fake = (async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
  await assert.rejects(fetchDolarApiQuote('blue', { fetchImpl: fake }), /respondió 503/);
});

test('fetchDolarApiQuote: cuerpo con null no se acepta como 0', async () => {
  const fake = (async () => ({ ok: true, status: 200, json: async () => ({ compra: 1500, venta: null }) })) as unknown as typeof fetch;
  await assert.rejects(fetchDolarApiQuote('blue', { fetchImpl: fake }), /inválida/);
});

test('fetchDolarApiQuote: corta por timeout si la API no responde', async () => {
  const colgado = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason ?? new Error('abortado')));
    })) as unknown as typeof fetch;
  const t0 = Date.now();
  await assert.rejects(fetchDolarApiQuote('blue', { fetchImpl: colgado, timeoutMs: 30 }));
  assert.ok(Date.now() - t0 < 1000, 'debe cortar rápido, no quedar esperando');
});

test('fetchDolarApiQuote: camino feliz', async () => {
  const fake = (async () => ({ ok: true, status: 200, json: async () => OK })) as unknown as typeof fetch;
  assert.equal((await fetchDolarApiQuote('blue', { fetchImpl: fake })).venta, 1545);
});
