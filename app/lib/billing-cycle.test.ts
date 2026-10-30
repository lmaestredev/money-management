import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCycle } from './billing-cycle';
import { todayAR } from './dates';

test('compra el día del cierre pertenece al resumen de ese mes', () => {
  const c = resolveCycle('2026-10-15', 15, 10);
  assert.equal(c.period, '2026-10');
  assert.equal(c.closingDate, '2026-10-15');
  assert.equal(c.dueDate, '2026-11-10'); // vence después del cierre
});

test('compra el día siguiente al cierre pasa al resumen siguiente', () => {
  assert.equal(resolveCycle('2026-10-16', 15, 10).period, '2026-11');
});

test('compra 15/10 22:00 ART con cierre día 15 cae en el resumen de octubre', () => {
  // En el servidor (UTC) ese instante ya es 16/10 01:00.
  const hoy = todayAR(new Date('2026-10-16T01:00:00Z'));
  assert.equal(hoy, '2026-10-15');
  assert.equal(resolveCycle(hoy, 15, 10).period, '2026-10');
});

test('cruce de año', () => {
  const c = resolveCycle('2026-12-20', 15, 5);
  assert.equal(c.period, '2027-01');
  assert.equal(c.closingDate, '2027-01-15');
  assert.equal(c.dueDate, '2027-02-05');
});

test('día de cierre 31 se ajusta al último día del mes', () => {
  const c = resolveCycle('2026-02-28', 31, null);
  assert.equal(c.period, '2026-02');
  assert.equal(c.closingDate, '2026-02-28');
  assert.equal(c.dueDate, null);
});

test('vencimiento mayor al cierre queda en el mismo mes', () => {
  assert.equal(resolveCycle('2026-10-01', 5, 20).dueDate, '2026-10-20');
});

test('tarjeta sin día de cierre usa el mes de la compra', () => {
  assert.deepEqual(resolveCycle('2026-10-31', null, null), {
    period: '2026-10',
    closingDate: null,
    dueDate: null,
  });
});
