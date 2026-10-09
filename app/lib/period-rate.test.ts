import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodRate } from './period-rate';

test('un período con tasa de cierre la usa, aunque la actual sea otra', () => {
  assert.deepEqual(periodRate(1435, 1545), { rate: 1435, frozen: true });
});

test('sin tasa de cierre se usa la actual y se marca como no congelada', () => {
  assert.deepEqual(periodRate(null, 1545), { rate: 1545, frozen: false });
  assert.deepEqual(periodRate(undefined, 1545), { rate: 1545, frozen: false });
});

test('una tasa de cierre inválida (0 o negativa) no se toma como congelada', () => {
  assert.deepEqual(periodRate(0, 1545), { rate: 1545, frozen: false });
  assert.deepEqual(periodRate(-5, 1545), { rate: 1545, frozen: false });
});

test('sin tasa de cierre ni actual no hay tasa', () => {
  assert.deepEqual(periodRate(null, null), { rate: null, frozen: false });
});

test('con tasa congelada no importa si hoy no hay cotización', () => {
  assert.deepEqual(periodRate(1540, null), { rate: 1540, frozen: true });
});
