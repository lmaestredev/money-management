import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cooldownSecondsLeft, cooldownToast, isStale, refreshToast, STALE_MS } from './rates-refresh';

const NOW = Date.parse('2026-10-05T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

test('isStale: faltan cotizaciones', () => {
  assert.equal(isStale([], NOW), true);
  assert.equal(isStale([ago(1000)], NOW), true);
});

test('isStale: se usa la más reciente y el límite es de 6 horas', () => {
  assert.equal(isStale([ago(1000), ago(1000)], NOW), false);
  assert.equal(isStale([ago(STALE_MS - 1000), ago(STALE_MS + 99999)], NOW), false, 'basta que una sea reciente');
  assert.equal(isStale([ago(STALE_MS + 1000), ago(STALE_MS + 2000)], NOW), true);
});

test('isStale acepta fechas Date además de strings', () => {
  assert.equal(isStale([new Date(NOW - 1000), new Date(NOW - 2000)], NOW), false);
});

test('cooldownSecondsLeft: 0 si no hay datos o ya pasó el minuto', () => {
  assert.equal(cooldownSecondsLeft([], NOW), 0);
  assert.equal(cooldownSecondsLeft([ago(60_000), ago(120_000)], NOW), 0);
  assert.equal(cooldownSecondsLeft([ago(90_000)], NOW), 0);
});

test('cooldownSecondsLeft: cuenta lo que falta, redondeando hacia arriba', () => {
  assert.equal(cooldownSecondsLeft([ago(10_000), ago(500_000)], NOW), 50);
  assert.equal(cooldownSecondsLeft([ago(59_500)], NOW), 1);
  assert.equal(cooldownSecondsLeft([ago(0)], NOW), 60);
});

test('mensajes: éxito completo, éxito parcial, falla total y límite', () => {
  assert.deepEqual(refreshToast({ ok: true, failed: [] }), { message: 'Cotizaciones actualizadas.', type: 'success' });
  const parcial = refreshToast({ ok: true, failed: [{ source: 'oficial', error: 'x' }] });
  assert.equal(parcial.type, 'error');
  assert.match(parcial.message, /Oficial sigue con su última cotización/);
  const total = refreshToast({ ok: false, failed: [{ source: 'blue', error: 'a' }, { source: 'oficial', error: 'b' }] });
  assert.equal(total.type, 'error');
  assert.match(total.message, /Se mantiene la última guardada/);
  const lim = cooldownToast(42);
  assert.equal(lim.type, 'error');
  assert.match(lim.message, /42 s/);
});
