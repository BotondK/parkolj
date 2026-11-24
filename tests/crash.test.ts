import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCrash, enqueueCrash, fingerprint, MAX_CRASHES, scrubMessage, scrubStack } from '../src/logic/crashCore';

test('hibaüzenet: rendszám, e-mail, koordináta, hosszú szám és URL kiszűrve', () => {
  const m = scrubMessage('Nem sikerült ABC-123 / AABB123 teszt@pelda.hu 47.49781,19.04015 kártya 4111111111111111 https://x.hu/a?b=1');
  for (const bad of ['ABC-123', 'AABB123', 'teszt@pelda.hu', '47.49781', '19.04015', '4111', 'x.hu']) assert.ok(!m.includes(bad), `${bad} benne maradt: ${m}`);
  assert.match(m, /<rsz>.*<email>.*<n>/);
  assert.ok(scrubMessage('x'.repeat(500)).length <= 200);
  assert.equal(scrubMessage("Cannot read properties of undefined (reading 'zone')"), "Cannot read properties of undefined (reading 'zone')");
});

test('hívási lánc: csak fájlnév, sor, függvény; elérési út és lekérdezés nélkül', () => {
  const web = `TypeError: x is undefined
    at PayStep (https://botondk.github.io/parkolj/_expo/static/js/web/index-5322a80743876dbcd880e1d87cae0252.js:12:3456)
    at renderWithHooks (https://botondk.github.io/parkolj/_expo/static/js/web/index-5322a80743876dbcd880e1d87cae0252.js:99:1)`;
  assert.equal(scrubStack(web), 'PayStep index.js:12\nrenderWithHooks index.js:99');
  const ff = `PayStep@http://localhost:8090/parkolj/App.tsx?platform=web:120:7`;
  assert.equal(scrubStack(ff), 'PayStep App.tsx:120');
  assert.equal(scrubStack(undefined), '');
  assert.ok(scrubStack(Array(50).fill('at f (a.js:1:1)').join('\n')).split('\n').length <= 6);
});

test('ujjlenyomat: a számok nem változtatják, más hely igen', () => {
  assert.equal(fingerprint('E', 'idx 3', 'a.js:1'), fingerprint('E', 'idx 7', 'a.js:1'));
  assert.notEqual(fingerprint('E', 'idx', 'a.js:1'), fingerprint('E', 'idx', 'b.js:1'));
  assert.match(fingerprint('E', '', ''), /^[0-9a-f]{8}$/);
});

test('hibajelentés összeállítása és sorba tétele', () => {
  const ctx = { sid: 's1', kind: 'render' as const, version: '1.0.0', platform: 'web', lang: 'hu', screen: 'pay', now: new Date('2026-11-24T10:00:00Z') };
  const c = buildCrash(new TypeError('rossz ABC-123'), ctx);
  assert.equal(c.name, 'TypeError');
  assert.equal(c.message, 'rossz <rsz>');
  assert.equal(c.at, '2026-11-24T10:00:00.000Z');
  assert.equal(buildCrash('szöveg', ctx).message, 'szöveg');
  assert.equal(buildCrash(null, ctx).name, 'Error');
  let q = enqueueCrash([], c);
  q = enqueueCrash(q, c);
  assert.equal(q.length, 1, 'ugyanaz a hiba egy alkalmon belül csak egyszer');
  q = enqueueCrash(q, { ...c, sid: 's2' });
  assert.equal(q.length, 2);
  for (let i = 0; i < 40; i++) q = enqueueCrash(q, { ...c, fp: i.toString(16).padStart(8, '0') });
  assert.equal(q.length, MAX_CRASHES);
});
