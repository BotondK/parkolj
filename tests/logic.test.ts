import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zoneById } from '../src/data/zones';
import { searchPlaces, PLACES } from '../src/data/places';
import { distanceM, zoneAt } from '../src/logic/geo';
import { chargeableMinutes, formatFt, isCharging, paidEnd, priceFor, priceWindow } from '../src/logic/pricing';
import { hereOption, recommend } from '../src/logic/recommend';
import { plateValid } from '../src/types';

// Fix időpontok helyi időben: 2026-11-18 szerda, 2026-11-22 vasárnap
const wed = (h: number, m = 0) => new Date(2026, 10, 18, h, m);
const sun = (h: number) => new Date(2026, 10, 22, h, 0);

test('zóna felismerés: belváros A, Opera B, Nemzeti Színház C', () => {
  assert.equal(zoneAt({ lat: 47.495, lng: 19.0545 })?.id, 'A'); // Katona
  assert.equal(zoneAt({ lat: 47.5026, lng: 19.0583 })?.id, 'B'); // Opera
  assert.equal(zoneAt({ lat: 47.4717, lng: 19.0717 })?.id, 'C'); // Nemzeti
  assert.equal(zoneAt({ lat: 47.7, lng: 19.3 }), null);
});

test('díjak a 2026-os budapesti tarifák szerint', () => {
  assert.deepEqual(['A', 'B', 'C', 'D'].map((z) => zoneById(z as 'A').pricePerHour), [800, 600, 400, 300]);
  assert.equal(priceFor(zoneById('B'), 60), 600);
  assert.equal(priceFor(zoneById('A'), 4), 53); // percalapú
  assert.equal(formatFt(1200), '1 200 Ft');
});

test('3 órás szabály: A–C korlátos, D nem', () => {
  assert.equal(zoneById('A').maxMinutes, 180);
  assert.equal(zoneById('C').maxMinutes, 180);
  assert.equal(zoneById('D').maxMinutes, null);
});

test('díjfizetési idő: vasárnap ingyenes, hétköznap este a B zóna 20:00-ig fizetős', () => {
  const B = zoneById('B');
  assert.equal(isCharging(B, sun(12)), false);
  assert.equal(isCharging(B, wed(19, 30)), true);
  assert.equal(isCharging(B, wed(20, 0)), false);
  assert.equal(paidEnd(B, wed(19, 0))?.getHours(), 20);
  assert.equal(paidEnd(B, wed(21, 0)), null);
});

test('csak a díjfizetési időre fizetsz: 19:00-tól 3 óra B zónában = 1 óra díj', () => {
  const B = zoneById('B');
  assert.equal(chargeableMinutes(B, wed(19, 0), 180), 60);
  assert.equal(priceWindow(B, wed(19, 0), 180), 600);
  assert.equal(priceWindow(B, wed(10, 0), 120), 1200);
  assert.equal(priceWindow(B, sun(10), 120), 0);
});

test('ajánló: mindig 3 opció, ebből egy garázs, és a garázs közel van', () => {
  for (const p of PLACES) {
    const o = recommend(p, 120, wed(18, 0));
    assert.equal(o.length, 3);
    assert.deepEqual(o.map((x) => x.kind), ['fastest', 'cheapest', 'garage']);
    assert.ok(distanceM(p, o[2].coord) < 4000, `${p.name}: garázs túl messze`);
    assert.ok(o[1].cost <= o[0].cost || o[1].availability >= o[0].availability);
  }
});

test('ajánló: a díjmentes időszak kezdetét jelzi', () => {
  const opera = PLACES.find((p) => p.id === 'opera')!;
  const o = recommend(opera, 180, wed(19, 0));
  assert.equal(o[0].freeFrom, '20:00');
});

test('parkolás itt: zóna és ár a kijelölt pontra', () => {
  const h = hereOption({ lat: 47.495, lng: 19.0545 }, 60, wed(10, 0));
  assert.equal(h.zone?.id, 'A');
  assert.equal(h.cost, 800);
});

test('rendszám ellenőrzés', () => {
  assert.ok(plateValid('ABC-123', 'H'));
  assert.ok(plateValid('AA-BC-123', 'H'));
  assert.ok(plateValid('aabc123', 'H')); // kisbetű és kötőjel nélkül is elfogadja
  assert.ok(!plateValid('12', 'H'));
  assert.ok(plateValid('B-XY 1234', 'D'));
});

test('keresés ékezet nélkül is talál', () => {
  assert.equal(searchPlaces('mupa')[0]?.id, 'mupa');
  assert.equal(searchPlaces('vigszinhaz')[0]?.id, 'vig');
  assert.equal(searchPlaces('opera')[0]?.id, 'opera');
});
