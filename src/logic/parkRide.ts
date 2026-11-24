// P+R javaslat: belvárosi célnál az autó a város szélén marad, onnan tömegközlekedéssel. A BKK P+R-ek jellemzően ingyenesek.
// A menetidő becslés (nincs menetrendi adat): ~8 perc várakozás/átszállás + ~23 km/h átlagsebesség. „kb.”-ként jelenik meg.
import { PARK_RIDES, type ParkRide } from '../data/poi';
import type { LatLng, Zone } from '../data/zones';
import { distanceM } from './geo';

export type PrSuggestion = { pr: ParkRide; distKm: number; transitMin: number };

export const transitMinutes = (m: number) => Math.round(8 + (m / 1000) * 2.6);

/**
 * A célhoz legjobb P+R, ha a cél fizetős (A–C) zónában van. Ha ismert, honnan indulsz, az útba eső P+R-t választja
 * (indulás → P+R → cél összesen a legrövidebb), egyébként a célhoz legközelebbit. A díjköteles (fee=yes) P+R kimarad; a P+R maga közúton kívüli parkoló, ezért zónán belül is lehet.
 */
export function prSuggestion(dest: LatLng, destZone: Zone | null, origin?: LatLng | null, list: ParkRide[] = PARK_RIDES): PrSuggestion | null {
  if (!destZone || destZone.id === 'D') return null;
  const ok = list.filter((p) => p.name && p.fee !== 'yes').map((p) => ({ p, d: distanceM(p, dest) })).filter((x) => x.d >= 2500 && x.d <= 15000);
  if (!ok.length) return null;
  const score = (x: { p: ParkRide; d: number }) => (origin && distanceM(origin, dest) > 4000 ? distanceM(origin, x.p) + x.d * 1.3 : x.d);
  const best = ok.sort((a, b) => score(a) - score(b))[0];
  return { pr: best.p, distKm: Math.round(best.d / 100) / 10, transitMin: transitMinutes(best.d) };
}

export const driveToUrl = (p: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
export const transitUrl = (from: LatLng, to: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=transit`;
