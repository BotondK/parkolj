// Zónahatárok: a BKK hivatalos zónatérképéből (zoneShapes.ts), utcaszinten az OSM pontosít (logic/zoneStreets.ts).
// Díjak, díjfizetési idők, időkorlátok és pótdíjak a BKK hivatalos listái szerint (2026. július 1-től):
//   zónalista:  https://bkk.hu/downloads/43733/
//   pótdíjak:   https://bkk.hu/downloads/43739/
// Díjfizetés csak munkanapokon: A 8–22, B 8–20, C 8–18, D 8–18 (néhány zónakódnál 8:30-tól).
// A–C: max. 3 óra, D: nincs korlát.

import { ZONE_SHAPES } from './zoneShapes';

export type LatLng = { lat: number; lng: number };

export type ZoneId = 'A' | 'B' | 'C' | 'D';

export type Zone = {
  id: ZoneId;
  /** Ft / óra */
  pricePerHour: number;
  /** Maximális egybefüggő parkolási idő percben, null = nincs korlát */
  maxMinutes: number | null;
  /** Díjfizetési idő munkanapokon, órában [kezdet, vége) */
  weekdayHours: [number, number];
  /** Szombati díjfizetés, null = ingyenes (Budapesten jelenleg minden zónában) */
  saturdayHours: [number, number] | null;
  /** Demó SMS zónakód (élesben a táblán lévő 4 jegyű kód, lásd zoneCodes.ts) */
  smsCode: string;
  /** Pótdíj személyautóra (D1): [15 napon belül, 15 nap után] Ft */
  surcharge: [number, number];
  /** A BKK zónatérkép színeihez igazítva */
  color: string;
  /** Területek: sokszögek, mindegyik gyűrűk listája (első a külső határ, a többi lyuk) */
  areas: LatLng[][][];
};

export const ZONES: Zone[] = [
  {
    id: 'A',
    pricePerHour: 800,
    maxMinutes: 180,
    weekdayHours: [8, 22],
    saturdayHours: null,
    smsCode: '0501',
    surcharge: [12800, 32000],
    color: '#F15B22',
    areas: [],
  },
  {
    id: 'B',
    pricePerHour: 600,
    maxMinutes: 180,
    weekdayHours: [8, 20],
    saturdayHours: null,
    smsCode: '0602',
    surcharge: [8400, 24000],
    color: '#50459C',
    areas: [],
  },
  {
    id: 'C',
    pricePerHour: 400,
    maxMinutes: 180,
    weekdayHours: [8, 18],
    saturdayHours: null,
    smsCode: '0907',
    surcharge: [4800, 16000],
    color: '#E8577A',
    areas: [],
  },
  {
    id: 'D',
    pricePerHour: 300,
    maxMinutes: null,
    weekdayHours: [8, 18],
    saturdayHours: null,
    smsCode: '0908',
    surcharge: [3600, 12000],
    color: '#9AA61A',
    areas: [],
  },
];

for (const z of ZONES) z.areas = ZONE_SHAPES[z.id].map((poly) => poly.map((ring) => ring.map(([lat, lng]) => ({ lat, lng }))));

export const zoneById = (id: ZoneId) => ZONES.find((z) => z.id === id)!;
