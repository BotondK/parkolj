import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardBrand, expValid, luhnValid, taxNumberValid } from '../src/types';

test('bankkártya: Luhn-ellenőrzés, márka, lejárat', () => {
  assert.ok(luhnValid('4242 4242 4242 4242'));
  assert.ok(!luhnValid('4242 4242 4242 4241'));
  assert.ok(!luhnValid('1234'));
  assert.equal(cardBrand('4242424242424242'), 'Visa');
  assert.equal(cardBrand('5555555555554444'), 'Mastercard');
  assert.equal(cardBrand('2223003122003222'), 'Mastercard');
  assert.equal(cardBrand('378282246310005'), 'Amex');
  const now = new Date(2026, 10, 21);
  assert.ok(expValid('11/26', now));
  assert.ok(!expValid('10/26', now));
  assert.ok(!expValid('13/30', now));
});

test('magyar adószám formátuma', () => {
  assert.ok(taxNumberValid('12345678-1-23'));
  assert.ok(taxNumberValid('12345678123'));
  assert.ok(!taxNumberValid('1234567-1-23'));
});
