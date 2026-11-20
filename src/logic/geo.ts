import { ZONES, type LatLng, type Zone } from '../data/zones';

export function pointInPolygon(pt: LatLng, poly: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersect =
      a.lng > pt.lng !== b.lng > pt.lng &&
      pt.lat < ((b.lat - a.lat) * (pt.lng - a.lng)) / (b.lng - a.lng) + a.lat;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** A legbelső (legdrágább) zóna, ahová a pont esik. null = nem fizetős terület. */
export function zoneAt(pt: LatLng): Zone | null {
  for (const z of ZONES) if (pointInPolygon(pt, z.polygon)) return z;
  return null;
}

/** Távolság méterben (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Gyalogidő percben (utcahálózati szorzó 1,3; 80 m/perc). */
export function walkMinutes(a: LatLng, b: LatLng): number {
  return Math.max(1, Math.round((distanceM(a, b) * 1.3) / 80));
}

export function offset(pt: LatLng, northM: number, eastM: number): LatLng {
  const dLat = northM / 111320;
  const dLng = eastM / (111320 * Math.cos((pt.lat * Math.PI) / 180));
  return { lat: pt.lat + dLat, lng: pt.lng + dLng };
}
