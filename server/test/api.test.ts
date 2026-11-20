import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app';

// Szerda 2026-11-18, helyi idő
const at = (h: number, m = 0) => new Date(2026, 10, 18, h, m).getTime();
const OPERA = { lat: 47.5026, lng: 19.0583 }; // VI. ker., B zóna
const PARLAMENT = { lat: 47.507, lng: 19.0456 }; // V. ker., A zóna

function setup(start: number) {
  let t = start;
  const app = buildApp({ now: () => t });
  return { app, advance: (min: number) => (t += min * 60000) };
}

test('zónalista: 4 zóna, BKK díjak, 68 zónakód', async () => {
  const { app } = setup(at(10));
  const r = await app.inject('/v1/zones');
  const b = r.json();
  assert.equal(r.statusCode, 200);
  assert.deepEqual(b.zones.map((z: { pricePerHour: number }) => z.pricePerHour), [800, 600, 400, 300]);
  assert.equal(b.zones.reduce((a: number, z: { codes: unknown[] }) => a + z.codes.length, 0), 68);
});

test('zone-at: kerület és zóna, hibás pontra 400', async () => {
  const { app } = setup(at(19, 30));
  const r = (await app.inject(`/v1/zone-at?lat=${OPERA.lat}&lng=${OPERA.lng}`)).json();
  assert.equal(r.district, 'VI. kerület');
  assert.equal(r.zone.id, 'B');
  assert.equal(r.zone.chargingNow, true);
  assert.equal(new Date(r.zone.paidUntil).getHours(), 20);
  assert.equal((await app.inject('/v1/zone-at?lat=48&lng=20')).statusCode, 400);
});

test('recommend: 3 opció', async () => {
  const { app } = setup(at(18));
  const r = (await app.inject(`/v1/recommend?lat=${OPERA.lat}&lng=${OPERA.lng}&minutes=120`)).json();
  assert.deepEqual(r.options.map((o: { kind: string }) => o.kind), ['fastest', 'cheapest', 'garage']);
});

test('parkolás: este 19:30-tól 3 órára → automatikus leállítás 20:00-kor, 30 perc díj', async () => {
  const { app, advance } = setup(at(19, 30));
  const c = await app.inject({ method: 'POST', url: '/v1/sessions', payload: { ...OPERA, plate: 'abc-123', minutes: 180 } });
  assert.equal(c.statusCode, 201);
  const s = c.json();
  assert.equal(s.zoneId, 'B');
  assert.equal(s.estimatedCost, 300);
  assert.equal(new Date(s.autoStopAt).getHours(), 20);
  advance(45);
  const g = (await app.inject(`/v1/sessions/${s.id}`)).json();
  assert.equal(g.status, 'auto_stopped');
  assert.equal(g.cost, 300);
});

test('parkolás: hosszabbítás és a 3 órás szabály', async () => {
  const { app } = setup(at(10));
  const s = (await app.inject({ method: 'POST', url: '/v1/sessions', payload: { ...PARLAMENT, plate: 'ABC-123', minutes: 165 } })).json();
  assert.equal(s.zoneId, 'A');
  const e1 = await app.inject({ method: 'POST', url: `/v1/sessions/${s.id}/extend`, payload: { minutes: 15 } });
  assert.equal(e1.json().plannedMinutes, 180);
  const e2 = await app.inject({ method: 'POST', url: `/v1/sessions/${s.id}/extend`, payload: { minutes: 15 } });
  assert.equal(e2.statusCode, 422);
  const tooLong = await app.inject({ method: 'POST', url: '/v1/sessions', payload: { ...PARLAMENT, plate: 'ABC-123', minutes: 200 } });
  assert.equal(tooLong.statusCode, 422);
});

test('parkolás: leállításkor percre pontos díj', async () => {
  const { app, advance } = setup(at(10));
  const s = (await app.inject({ method: 'POST', url: '/v1/sessions', payload: { ...PARLAMENT, plate: 'ABC-123', minutes: 120 } })).json();
  advance(37);
  const st = (await app.inject({ method: 'POST', url: `/v1/sessions/${s.id}/stop` })).json();
  assert.equal(st.status, 'stopped');
  assert.equal(st.usedMinutes, 37);
  assert.equal(st.cost, Math.round((800 * 37) / 60));
  advance(30);
  assert.equal((await app.inject(`/v1/sessions/${s.id}`)).json().cost, st.cost, 'leállítás után nem nő');
});

test('parkolás: rossz rendszám 400, díjmentes terület 422', async () => {
  const { app } = setup(at(10));
  assert.equal((await app.inject({ method: 'POST', url: '/v1/sessions', payload: { ...OPERA, plate: '1', minutes: 60 } })).statusCode, 400);
  assert.equal(
    (await app.inject({ method: 'POST', url: '/v1/sessions', payload: { lat: 47.6, lng: 18.95, plate: 'ABC-123', minutes: 60 } })).statusCode,
    422,
  );
});

test('városi statisztika: csak legalább 5 parkolású cellák, rendszám nélkül', async () => {
  const { app } = setup(at(10));
  for (let i = 0; i < 5; i++) await app.inject({ method: 'POST', url: '/v1/sessions', payload: { ...OPERA, plate: 'ABC-123', minutes: 60 } });
  for (let i = 0; i < 2; i++) await app.inject({ method: 'POST', url: '/v1/sessions', payload: { ...PARLAMENT, plate: 'XYZ-999', minutes: 60 } });
  const r = (await app.inject('/v1/stats/occupancy')).json();
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].zoneId, 'B');
  assert.equal(r.rows[0].sessions, 5);
  assert.ok(!JSON.stringify(r).includes('ABC'));
});
