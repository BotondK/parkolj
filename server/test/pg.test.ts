import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { pgStore } from '../src/pgStore';

// Valódi PostgreSQL-lel fut, ha TEST_DATABASE_URL meg van adva (a GitHub Actions ad egyet).
const url = process.env.TEST_DATABASE_URL;

test('PostgreSQL tároló: létrehozás, olvasás, frissítés', { skip: !url && 'nincs TEST_DATABASE_URL' }, async () => {
  const store = await pgStore(url!);
  const id = randomUUID();
  const s = {
    id, plate: 'ABC-123', country: 'H', zoneId: 'B', zoneCode: '0602', district: 'VI. kerület', lat: 47.5026, lng: 19.0583,
    startedAt: Date.UTC(2026, 10, 18, 9, 0), plannedMinutes: 60, autoStopAt: null, stoppedAt: null, cost: null,
  };
  await store.create(s);
  assert.deepEqual(await store.get(id), s);
  await store.update({ ...s, plannedMinutes: 75, stoppedAt: s.startedAt + 30 * 60000, cost: 300 });
  const g = await store.get(id);
  assert.equal(g?.plannedMinutes, 75);
  assert.equal(g?.cost, 300);
  assert.equal(await store.get('nem-uuid'), null);
  await store.close();
});

test('PostgreSQL kérésenkénti kapcsolat (Workers-mód) + nyitott parkolások', { skip: !url && 'nincs TEST_DATABASE_URL' }, async () => {
  const { pgOpen } = await import('../src/pgStore');
  const open = pgOpen(url!);
  const h = await open();
  const id = randomUUID();
  await h.store.create({
    id, plate: 'XYZ-999', country: 'H', zoneId: 'A', zoneCode: '0501', district: 'V. kerület', lat: 47.507, lng: 19.0456,
    startedAt: Date.now() - 60 * 60000, plannedMinutes: 30, autoStopAt: null, stoppedAt: null, cost: null,
  });
  assert.ok((await h.store.open()).some((s) => s.id === id));
  await h.close();
  const h2 = await open();
  assert.equal((await h2.store.get(id))?.plate, 'XYZ-999');
  await h2.close();
});
