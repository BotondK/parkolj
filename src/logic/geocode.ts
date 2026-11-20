import type { Place, PlaceKind } from '../data/places';

// Valódi címkeresés a Photon (OpenStreetMap) geokódolóval, Budapest területére szűkítve.
// Prototípushoz jó; élesben saját vagy fizetős geokódoló kell (pl. Google Places), a használati feltételek miatt.
const BBOX = '18.92,47.35,19.34,47.62';

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
  };
};

const KIND: Record<string, PlaceKind> = {
  theatre: 'theatre',
  cinema: 'cinema',
  concert_hall: 'concert',
  arts_centre: 'concert',
  mall: 'mall',
  stadium: 'sport',
  sports_centre: 'sport',
};

export function parsePhoton(json: { features?: PhotonFeature[] }): Place[] {
  const out: Place[] = [];
  for (const f of json.features ?? []) {
    const pr = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const street = [pr.street, pr.housenumber].filter(Boolean).join(' ');
    const name = pr.name ?? street;
    if (!name) continue;
    out.push({
      id: `osm-${pr.osm_id ?? `${lat},${lng}`}`,
      name,
      address: [pr.name ? street : '', pr.district].filter(Boolean).join(', ') || 'Budapest',
      kind: KIND[pr.osm_value ?? ''] ?? 'address',
      lat,
      lng,
    });
  }
  // Ugyanaz a hely többször is jöhet (pl. épület és bejárat)
  return out.filter((p, i) => out.findIndex((q) => q.name === p.name && q.address === p.address) === i);
}

export async function geocode(q: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&bbox=${BBOX}&lat=47.4979&lon=19.0402`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    return parsePhoton(await res.json());
  } catch {
    return [];
  }
}
