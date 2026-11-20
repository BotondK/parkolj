import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bpParts, bpTime } from '../src/logic/budapestTime';
import { zoneById } from '../src/data/zones';
import { searchPlaces, PLACES } from '../src/data/places';
import { distanceM, districtAt, zoneAt } from '../src/logic/geo';
import { chargeableMinutes, formatFt, isCharging, paidEnd, priceFor, priceWindow } from '../src/logic/pricing';
import { hereOption, recommend } from '../src/logic/recommend';
import { parsePhoton } from '../src/logic/geocode';
import { ZONE_CODES } from '../src/data/zoneCodes';
import { plateValid } from '../src/types';

// Fix időpontok helyi időben: 2026-11-18 szerda, 2026-11-22 vasárnap
const wed = (h: number, m = 0) => new Date(bpTime(2026, 10 + 1, 18, h + m / 60));
const sun = (h: number) => new Date(bpTime(2026, 10 + 1, 22, h));

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
  assert.equal(bpParts(paidEnd(B, wed(19, 0))!).hour, 20);
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

test('BKK szabályok: C zóna 18:00-ig, szombaton és ünnepnap ingyenes', () => {
  const C = zoneById('C');
  assert.equal(isCharging(C, wed(17, 59)), true);
  assert.equal(isCharging(C, wed(18, 0)), false);
  assert.equal(isCharging(zoneById('A'), wed(21, 30)), true);
  assert.equal(isCharging(zoneById('A'), new Date(bpTime(2026, 10 + 1, 21, 12))), false); // szombat
  assert.equal(isCharging(zoneById('A'), new Date(bpTime(2026, 11 + 1, 24, 12))), false); // dec. 24., csütörtök
  assert.equal(isCharging(zoneById('A'), new Date(bpTime(2026, 9 + 1, 23, 12))), false); // okt. 23.
});

test('BKK zónakódok és pótdíjak', () => {
  assert.deepEqual(
    (['A', 'B', 'C', 'D'] as const).map((z) => ZONE_CODES[z].length),
    [20, 27, 15, 6],
  );
  const all = Object.values(ZONE_CODES).flat().map(([c]) => c);
  assert.equal(new Set(all).size, all.length, 'egy kód csak egy zónában lehet');
  assert.ok(all.every((c) => /^\d{4}$/.test(c)));
  assert.deepEqual(zoneById('A').surcharge, [12800, 32000]);
  assert.ok(ZONE_CODES.A.some(([c]) => c === zoneById('A').smsCode));
});

test('címkeresés: Photon válasz feldolgozása', () => {
  const places = parsePhoton({
    features: [
      { geometry: { coordinates: [19.0583, 47.5026] }, properties: { osm_id: 1, osm_value: 'theatre', name: 'Operaház', street: 'Andrássy út', housenumber: '22', district: 'VI. kerület' } },
      { geometry: { coordinates: [19.0583, 47.5026] }, properties: { osm_id: 2, osm_value: 'theatre', name: 'Operaház', street: 'Andrássy út', housenumber: '22', district: 'VI. kerület' } },
      { geometry: { coordinates: [19.06, 47.5] }, properties: { osm_id: 3, osm_value: 'house', street: 'Király utca', housenumber: '10' } },
      { geometry: { coordinates: [19.06, 47.5] }, properties: { osm_id: 4 } },
    ],
  });
  assert.equal(places.length, 2);
  assert.equal(places[0].kind, 'theatre');
  assert.equal(places[0].address, 'Andrássy út 22, VI. kerület');
  assert.equal(places[1].name, 'Király utca 10');
  assert.equal(places[1].kind, 'address');
});

test('valódi kerülethatárok: kerület felismerés, az V. kerület A zóna', () => {
  assert.equal(districtAt({ lat: 47.5026, lng: 19.0583 }), 'VI. kerület'); // Opera
  assert.equal(districtAt({ lat: 47.507, lng: 19.0456 }), 'V. kerület'); // Országház
  assert.equal(districtAt({ lat: 47.4717, lng: 19.0717 }), 'IX. kerület'); // Nemzeti Színház
  assert.equal(zoneAt({ lat: 47.507, lng: 19.0456 })?.id, 'A');
});

test('budapesti idő: téli/nyári időszámítás, a gép időzónájától függetlenül', async () => {
  const { bpParts, bpTime, budapestOffset } = await import('../src/logic/budapestTime');
  // 2026-03-29 01:00 UTC-kor vált nyári időre, 2026-10-25 01:00 UTC-kor vissza
  assert.equal(budapestOffset(Date.UTC(2026, 2, 29, 0, 59)), 1);
  assert.equal(budapestOffset(Date.UTC(2026, 2, 29, 1, 0)), 2);
  assert.equal(budapestOffset(Date.UTC(2026, 9, 25, 0, 59)), 2);
  assert.equal(budapestOffset(Date.UTC(2026, 9, 25, 1, 0)), 1);
  // Szerda 2026-11-18 19:30 Budapest = 18:30 UTC
  const p = bpParts(Date.UTC(2026, 10, 18, 18, 30));
  assert.deepEqual([p.weekday, p.hour, p.minute], [3, 19, 30]);
  assert.equal(bpTime(2026, 11, 18, 20), Date.UTC(2026, 10, 18, 19));
  assert.equal(bpTime(2026, 7, 1, 8.5), Date.UTC(2026, 6, 1, 6, 30));
});

test('utcaszintű zóna: a legközelebbi zónás utca dönt, 30 m-en túl a sokszög', async () => {
  const { setZoneStreets, streetZoneAt } = await import('../src/logic/zoneStreets');
  // Kitalált utcaszakasz az Operaház mellett C zónával, hogy látszódjon: az utcaadat felülírja a sokszöget (B)
  setZoneStreets([{ z: 'C', n: 'Próba utca', h: 'Mo-Fr 08:30-18:00', c: [[19.058, 47.5026], [19.0586, 47.5026]] }]);
  assert.equal(streetZoneAt({ lat: 47.50262, lng: 19.0583 })?.n, 'Próba utca');
  assert.equal(zoneAt({ lat: 47.50262, lng: 19.0583 })?.id, 'C');
  assert.equal(zoneAt({ lat: 47.5035, lng: 19.0583 })?.id, 'B'); // ~100 m-re: sokszög
  setZoneStreets([]);
  assert.equal(zoneAt({ lat: 47.50262, lng: 19.0583 })?.id, 'B');
});
