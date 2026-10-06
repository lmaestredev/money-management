import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cooldownSecondsLeft, cooldownToast, isRateOld, isStale, rateAgeLabel, refreshToast, RATE_OLD_MS, STALE_MS } from './rates-refresh';

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

test('isRateOld: avisa pasadas 24 h, no antes, y la tasa manual nunca envejece', () => {
  assert.equal(isRateOld(ago(RATE_OLD_MS - 1000), NOW), false);
  assert.equal(isRateOld(ago(RATE_OLD_MS + 1000), NOW), true);
  assert.equal(isRateOld(null, NOW), false);
  assert.equal(isRateOld(new Date(NOW - RATE_OLD_MS - 5000), NOW), true);
});

test('rateAgeLabel: instantes, minutos, horas y días', () => {
  assert.equal(rateAgeLabel(ago(10_000), NOW), 'hace instantes');
  assert.equal(rateAgeLabel(ago(5 * 60_000), NOW), 'hace 5 min');
  assert.equal(rateAgeLabel(ago(3 * 3_600_000 + 10_000), NOW), 'hace 3 h');
  assert.equal(rateAgeLabel(ago(24 * 3_600_000), NOW), 'hace 1 día');
  assert.equal(rateAgeLabel(ago(50 * 3_600_000), NOW), 'hace 2 días');
  assert.equal(rateAgeLabel(new Date(NOW + 60_000), NOW), 'hace instantes', 'una fecha futura no da negativo');
});
