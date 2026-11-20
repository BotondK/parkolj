import type { LatLng } from './zones';

export type PlaceKind = 'theatre' | 'cinema' | 'concert' | 'sight' | 'mall' | 'sport' | 'address';

export type Place = LatLng & {
  id: string;
  name: string;
  nameEn?: string;
  address: string;
  kind: PlaceKind;
};

// Demó célpontok. Élesben a keresés geokódoló API-n (pl. Google Places / OSM) fut.
export const PLACES: Place[] = [
  { id: 'opera', name: 'Magyar Állami Operaház', nameEn: 'Hungarian State Opera', address: 'Andrássy út 22.', kind: 'theatre', lat: 47.5026, lng: 19.0583 },
  { id: 'vig', name: 'Vígszínház', nameEn: 'Comedy Theatre', address: 'Szent István krt. 14.', kind: 'theatre', lat: 47.5137, lng: 19.0526 },
  { id: 'nemzeti', name: 'Nemzeti Színház', nameEn: 'National Theatre', address: 'Bajor Gizi park 1.', kind: 'theatre', lat: 47.4717, lng: 19.0717 },
  { id: 'mupa', name: 'Müpa – Művészetek Palotája', nameEn: 'Müpa Budapest', address: 'Komor Marcell u. 1.', kind: 'concert', lat: 47.4687, lng: 19.0707 },
  { id: 'katona', name: 'Katona József Színház', nameEn: 'Katona József Theatre', address: 'Petőfi Sándor u. 6.', kind: 'theatre', lat: 47.495, lng: 19.0545 },
  { id: 'madach', name: 'Madách Színház', nameEn: 'Madách Theatre', address: 'Erzsébet krt. 29–33.', kind: 'theatre', lat: 47.4995, lng: 19.0695 },
  { id: 'erkel', name: 'Erkel Színház', nameEn: 'Erkel Theatre', address: 'II. János Pál pápa tér 30.', kind: 'theatre', lat: 47.4965, lng: 19.082 },
  { id: 'vigado', name: 'Pesti Vigadó', nameEn: 'Pesti Vigadó', address: 'Vigadó tér 2.', kind: 'concert', lat: 47.496, lng: 19.049 },
  { id: 'urania', name: 'Uránia Nemzeti Filmszínház', nameEn: 'Uránia Cinema', address: 'Rákóczi út 21.', kind: 'cinema', lat: 47.4952, lng: 19.065 },
  { id: 'corvin', name: 'Corvin Budapest Filmpalota', nameEn: 'Corvin Cinema', address: 'Corvin köz 1.', kind: 'cinema', lat: 47.4855, lng: 19.0738 },
  { id: 'allee', name: 'Allee – mozi', nameEn: 'Allee cinema', address: 'Október huszonharmadika u. 8–10.', kind: 'cinema', lat: 47.4753, lng: 19.0492 },
  { id: 'mammut', name: 'Mammut – mozi', nameEn: 'Mammut cinema', address: 'Lövőház u. 2–6.', kind: 'cinema', lat: 47.5085, lng: 19.0255 },
  { id: 'parlament', name: 'Országház', nameEn: 'Parliament', address: 'Kossuth Lajos tér 1–3.', kind: 'sight', lat: 47.507, lng: 19.0456 },
  { id: 'bazilika', name: 'Szent István-bazilika', nameEn: "St. Stephen's Basilica", address: 'Szent István tér 1.', kind: 'sight', lat: 47.5009, lng: 19.0539 },
  { id: 'vasarcsarnok', name: 'Központi Vásárcsarnok', nameEn: 'Great Market Hall', address: 'Vámház krt. 1–3.', kind: 'sight', lat: 47.4871, lng: 19.0587 },
  { id: 'arena', name: 'Puskás Aréna', nameEn: 'Puskás Arena', address: 'Istvánmezei út 3–5.', kind: 'sport', lat: 47.5031, lng: 19.0973 },
  { id: 'westend', name: 'WestEnd City Center', nameEn: 'WestEnd City Center', address: 'Váci út 1–3.', kind: 'mall', lat: 47.5128, lng: 19.0574 },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function searchPlaces(q: string, extra: Place[] = []): Place[] {
  const n = norm(q.trim());
  if (!n) return PLACES.slice(0, 6);
  return [...PLACES, ...extra]
    .filter((p) => [p.name, p.nameEn ?? '', p.address].some((f) => norm(f).includes(n)))
    .slice(0, 8);
}
