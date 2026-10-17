
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateAmount,
  validateDate,
  validateCategory,
  validateDescription,
  validatePaymentMode
} from '../validation.js';

test('accepts a positive amount', () => {
  assert.equal(validateAmount('250'), 250);
});

test('rejects zero and negative amounts', () => {
  assert.throws(() => validateAmount('0'), /greater than zero/);
  assert.throws(() => validateAmount('-100'), /greater than zero/);
});

test('accepts a valid calendar date', () => {
  assert.equal(validateDate('2026-10-17'), '2026-10-17');
});

test('rejects an impossible calendar date', () => {
  assert.throws(() => validateDate('2026-02-30'), /valid calendar date/);
});

test('accepts an allowed category', () => {
  assert.equal(validateCategory('Food'), 'Food');
});

test('rejects an unknown category', () => {
  assert.throws(() => validateCategory('Gaming'), /Category must be one of/);
});

test('rejects an empty description', () => {
  assert.throws(() => validateDescription('  '), /cannot be empty/);
});

test('accepts an allowed payment mode', () => {
  assert.equal(validatePaymentMode('UPI'), 'UPI');
});

test('rejects an unknown payment mode', () => {
  assert.throws(() => validatePaymentMode('Crypto'), /Payment mode must be one of/);
});
