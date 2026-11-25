import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sampleSearchStats, searchTone } from '../src/logic/city';
import { buildReport, searchEstimate, searchMinutesFor, SEARCH_BUCKETS } from '../src/logic/reportCore';

test('„Mennyi ideig kerestél helyet?” válasz: found jelzés perccel, a többi jelzésnél null', () => {
  const coord = { lat: 47.50291, lng: 19.05844 };
  const r = buildReport({ kind: 'found', coord, zone: 'A', optionKind: 'fastest', lang: 'hu', searchMin: 10 })!;
  assert.equal(r.kind, 'found');
  assert.equal(r.search_min, 10);
  assert.equal(r.lat, 47.503);
  assert.equal(buildReport({ kind: 'found', coord, zone: 'A', lang: 'hu', searchMin: 500 })!.search_min, 60);
  // A szerver egy kötegben azonos mezőket vár: a „nem volt hely” jelzésben is ott a mező, null értékkel
  assert.ok('search_min' in buildReport({ kind: 'nospace', coord, zone: 'A', lang: 'hu' })!);
  assert.equal(buildReport({ kind: 'nospace', coord, zone: 'A', lang: 'hu' })!.search_min, null);
  assert.deepEqual([...SEARCH_BUCKETS], [0, 3, 10, 20]);
});

test('valódi keresési idő: csak legalább 5 válasznál, a 3 órás sávra', () => {
  const list = [
    { zone_id: 'A', hour_from: 18, answers: 7, avg_min: 12, quick_share: 0.2 },
    { zone_id: 'B', hour_from: 18, answers: 3, avg_min: 2, quick_share: 0.9 },
  ];
  assert.equal(searchMinutesFor('A', 19, list), 12);
  assert.equal(searchMinutesFor('A', 15, list), null);
  assert.equal(searchMinutesFor('B', 18, list), null, 'kevés válasz');
  assert.equal(searchMinutesFor(null, 18, list), null);
});

test('becslés: valódi adat nélkül az esélyből, vele a kettő átlaga (jobb esély → kevesebb)', () => {
  assert.equal(searchEstimate(0.5, null), 6);
  assert.equal(searchEstimate(0.5, 12), 9); // (6 + 12) / 2
  assert.ok(searchEstimate(0.8, 12) < searchEstimate(0.3, 12));
  assert.ok(searchEstimate(0.5, 1) < searchEstimate(0.5, null), 'ahol valójában gyorsan találnak helyet, ott kevesebb');
});

test('Városnak oldal: mintaadat minden zónára és sávra, színfokozat', () => {
  const s = sampleSearchStats();
  assert.equal(s.length, 24);
  assert.ok(s.every((x) => x.answers >= 5));
  assert.equal(searchTone(2), 'good');
  assert.equal(searchTone(5), 'mid');
  assert.equal(searchTone(12), 'bad');
});
