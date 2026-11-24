// Gyakori helyek: a felhasználó által választott célok, gyakoriság és frissesség szerint (csak a készüléken).
import type { Place } from '../data/places';

export type FrequentPlace = { place: Place; count: number; last: number };
export const MAX_FREQUENT = 30;

/** Ugyanaz a hely: azonos azonosító, vagy ~40 m-en belül */
const same = (a: Place, b: Place) => a.id === b.id || (Math.abs(a.lat - b.lat) < 0.0004 && Math.abs(a.lng - b.lng) < 0.0006);

export function rememberPlace(list: FrequentPlace[], p: Place, now = Date.now()): FrequentPlace[] {
  const i = list.findIndex((f) => same(f.place, p));
  const next = i >= 0 ? list.map((f, j) => (j === i ? { place: p, count: f.count + 1, last: now } : f)) : [...list, { place: p, count: 1, last: now }];
  // a legrégebben használt kerül ki, ha betelt
  return next.sort((a, b) => b.last - a.last).slice(0, MAX_FREQUENT);
}

/** Pontszám: a választások száma, az elmúlt hetek súlyával (a 30 napnál régebbi fele annyit ér) */
export function topFrequent(list: FrequentPlace[], n = 5, now = Date.now()): Place[] {
  const score = (f: FrequentPlace) => f.count * (now - f.last > 30 * 86400000 ? 0.5 : 1) + (now - f.last < 86400000 ? 0.5 : 0);
  return [...list].sort((a, b) => score(b) - score(a) || b.last - a.last).slice(0, n).map((f) => f.place);
}

export const forgetPlace = (list: FrequentPlace[], id: string) => list.filter((f) => f.place.id !== id);
