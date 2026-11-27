import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zoneById } from '../src/data/zones';
import { smsLimitMinutes, smsNumber, smsNumberPretty, smsPlate, smsUri } from '../src/logic/sms';

test('SMS-szám: +36 <szolgáltató> 763 <zónakód>, hibás kódra üres', () => {
  assert.equal(smsNumber('30', '0601'), '+36307630601');
  assert.equal(smsNumber('70', '0501'), '+36707630501');
  assert.equal(smsNumber('20', '12'), '');
  assert.equal(smsNumberPretty('+36307630601'), '+36 30 763 0601');
});

test('SMS-rendszám: szóköz és kötőjel nélkül, külföldinél vesszővel az országjel', () => {
  assert.equal(smsPlate('ABC-123', 'H'), 'ABC123');
  assert.equal(smsPlate('aa ab-123', 'H'), 'AAAB123');
  assert.equal(smsPlate('BA 123AB', 'SK'), 'BA123AB,SK');
  assert.equal(smsPlate('W-12345 A', 'A'), 'W12345A,A');
});

test('sms: link: iOS-en &body, máshol ?body, kódolt szöveggel', () => {
  assert.equal(smsUri('+36307630601', 'ABC123,SK', true), 'sms:+36307630601&body=ABC123%2CSK');
  assert.equal(smsUri('+36307630601', 'STOP', false), 'sms:+36307630601?body=STOP');
});

test('SMS-es parkolás időzítője: a 3 órás korlátig, vagy a fizetős idő végéig, ha az előbb jön', () => {
  const A = zoneById('A');
  const D = zoneById('D');
  // 2026. nov. 25. szerda, budapesti idő (UTC+1)
  const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 25, h - 1, m));
  assert.equal(smsLimitMinutes(A, at(10)), 180);
  assert.equal(smsLimitMinutes(A, at(21)), 60); // A zóna 22:00-ig fizetős
  assert.ok(smsLimitMinutes(D, at(9)) <= 600);
  assert.equal(smsLimitMinutes(null, at(9)), 600);
});
