import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUniqueViolation } from './db-errors';

test('isUniqueViolation reconoce el código 23505 del driver', () => {
  assert.equal(isUniqueViolation(Object.assign(new Error('duplicate key'), { code: '23505' })), true);
});

test('isUniqueViolation rechaza otros errores y valores no-error', () => {
  assert.equal(isUniqueViolation(Object.assign(new Error('check'), { code: '23514' })), false);
  assert.equal(isUniqueViolation(new Error('sin código')), false);
  for (const v of [null, undefined, '23505', 23505, {}]) assert.equal(isUniqueViolation(v), false);
});
