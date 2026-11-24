// Utcaszintű parkolási zónák az OpenStreetMapből (parking:left|right|both:zone).
// Ha be van töltve, a zóna meghatározása a legközelebbi zónás utcaszakasz alapján történik (pontosabb a sokszögnél).
import type { LatLng } from '../data/zones';

export type ZoneStreet = { z: 'A' | 'B' | 'C' | 'D'; n: string | null; h: string | null; c: [number, number][] };

let streets: ZoneStreet[] = [];
let grid = new Map<string, number[]>();
const CELL = 0.002; // ~150–220 m-es rácscellák a gyors kereséshez
const key = (lat: number, lng: number) => `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;

export function setZoneStreets(items: ZoneStreet[]) {
  streets = items;
  grid = new Map();
  items.forEach((s, i) => {
    const seen = new Set<string>();
    for (const [lng, lat] of s.c) {
      const k = key(lat, lng);
      if (seen.has(k)) continue;
      seen.add(k);
      (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
    }
  });
}

export const zoneStreetsLoaded = () => streets.length > 0;

/** Pont távolsága egy szakasztól méterben (helyi síkvetület, városi léptékben pontos). */
function segDist(p: LatLng, a: [number, number], b: [number, number]) {
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 110540;
  const ax = (a[0] - p.lng) * kx, ay = (a[1] - p.lat) * ky;
  const bx = (b[0] - p.lng) * kx, by = (b[1] - p.lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** A legközelebbi zónás utcaszakasz (maxM méteren belül), vagy null. */
export function streetZoneAt(p: LatLng, maxM = 30): (ZoneStreet & { distM: number }) | null {
  if (!streets.length) return null;
  const cy = Math.floor(p.lat / CELL), cx = Math.floor(p.lng / CELL);
  const cand = new Set<number>();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) grid.get(`${cy + dy}:${cx + dx}`)?.forEach((i) => cand.add(i));
  let best: ZoneStreet | null = null;
  let bestD = maxM;
  for (const i of cand) {
    const c = streets[i].c;
    for (let j = 1; j < c.length; j++) {
      const d = segDist(p, c[j - 1], c[j]);
      if (d < bestD) {
        bestD = d;
        best = streets[i];
      }
    }
  }
  return best ? { ...best, distM: Math.round(bestD) } : null;
}

/**
 * Zónás utcaszakaszok pontjai a cél körül (szakaszfelezők, ~70 m-enként egy), a javaslatokhoz.
 * Így a javasolt hely mindig valódi, fizetős zónás utcán van (nem pályaudvaron, parkban vagy épületben).
 */
export function streetPointsNear(p: LatLng, radiusM: number): { coord: LatLng; z: ZoneStreet['z']; n: string | null }[] {
  if (!streets.length) return [];
  const rLat = radiusM / 110540, rLng = radiusM / (111320 * Math.cos((p.lat * Math.PI) / 180));
  const cand = new Set<number>();
  for (let y = Math.floor((p.lat - rLat) / CELL); y <= Math.floor((p.lat + rLat) / CELL); y++)
    for (let x = Math.floor((p.lng - rLng) / CELL); x <= Math.floor((p.lng + rLng) / CELL); x++) grid.get(`${y}:${x}`)?.forEach((i) => cand.add(i));
  const out = new Map<string, { coord: LatLng; z: ZoneStreet['z']; n: string | null }>();
  for (const i of cand) {
    const s = streets[i];
    for (let j = 1; j < s.c.length; j++) {
      const lng = (s.c[j - 1][0] + s.c[j][0]) / 2, lat = (s.c[j - 1][1] + s.c[j][1]) / 2;
      if (Math.abs(lat - p.lat) > rLat || Math.abs(lng - p.lng) > rLng) continue;
      const k = `${Math.round(lat / 0.0006)}:${Math.round(lng / 0.0009)}`;
      if (!out.has(k)) out.set(k, { coord: { lat, lng }, z: s.z, n: s.n });
    }
  }
  return [...out.values()];
}
