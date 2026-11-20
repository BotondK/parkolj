// A zónahatárok (polygon) DEMÓ közelítések a prototípushoz; élesben a hivatalos határokból töltjük be.
// Díjak, díjfizetési idők, időkorlátok és pótdíjak a BKK hivatalos listái szerint (2026. július 1-től):
//   zónalista:  https://bkk.hu/downloads/43733/
//   pótdíjak:   https://bkk.hu/downloads/43739/
// Díjfizetés csak munkanapokon: A 8–22, B 8–20, C 8–18, D 8–18 (néhány zónakódnál 8:30-tól).
// A–C: max. 3 óra, D: nincs korlát.

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
  color: string;
  polygon: LatLng[];
};

const p = (pairs: [number, number][]): LatLng[] => pairs.map(([lat, lng]) => ({ lat, lng }));

export const ZONES: Zone[] = [
  {
    id: 'A',
    pricePerHour: 800,
    maxMinutes: 180,
    weekdayHours: [8, 22],
    saturdayHours: null,
    smsCode: '0501',
    surcharge: [12800, 32000],
    color: '#E5484D',
    // Belváros, Kiskörúton belül (közelítés)
    polygon: p([
      [47.5001, 19.0478],
      [47.5016, 19.0532],
      [47.5008, 19.0566],
      [47.4978, 19.0592],
      [47.4958, 19.0602],
      [47.4925, 19.0612],
      [47.4893, 19.0614],
      [47.4868, 19.0590],
      [47.4876, 19.0548],
      [47.4925, 19.0510],
      [47.4970, 19.0488],
    ]),
  },
  {
    id: 'B',
    pricePerHour: 600,
    maxMinutes: 180,
    weekdayHours: [8, 20],
    saturdayHours: null,
    smsCode: '0602',
    surcharge: [8400, 24000],
    color: '#F76B15',
    // Pest, Nagykörúton belül (közelítés)
    polygon: p([
      [47.5115, 19.0468],
      [47.5122, 19.0538],
      [47.5108, 19.0572],
      [47.5082, 19.0606],
      [47.5050, 19.0645],
      [47.5012, 19.0680],
      [47.4968, 19.0708],
      [47.4920, 19.0722],
      [47.4868, 19.0724],
      [47.4830, 19.0705],
      [47.4795, 19.0668],
      [47.4790, 19.0625],
      [47.4835, 19.0575],
      [47.4876, 19.0530],
      [47.4940, 19.0490],
      [47.5000, 19.0470],
      [47.5060, 19.0462],
    ]),
  },
  {
    id: 'C',
    pricePerHour: 400,
    maxMinutes: 180,
    weekdayHours: [8, 18],
    saturdayHours: null,
    smsCode: '0907',
    surcharge: [4800, 16000],
    color: '#E2A336',
    // Belső kerületek a Nagykörúton kívül + belső Buda (közelítés)
    polygon: p([
      [47.5360, 19.0300],
      [47.5370, 19.0700],
      [47.5250, 19.0900],
      [47.5080, 19.1030],
      [47.4880, 19.1080],
      [47.4700, 19.0950],
      [47.4620, 19.0750],
      [47.4630, 19.0450],
      [47.4720, 19.0280],
      [47.4880, 19.0170],
      [47.5060, 19.0150],
      [47.5230, 19.0180],
    ]),
  },
  {
    id: 'D',
    pricePerHour: 300,
    maxMinutes: null,
    weekdayHours: [8, 18],
    saturdayHours: null,
    smsCode: '0908',
    surcharge: [3600, 12000],
    color: '#3E63DD',
    // Külső díjfizetős területek (közelítés)
    polygon: p([
      [47.5600, 18.9900],
      [47.5650, 19.1000],
      [47.5300, 19.1600],
      [47.4700, 19.1700],
      [47.4350, 19.1200],
      [47.4350, 19.0100],
      [47.4700, 18.9700],
      [47.5200, 18.9650],
    ]),
  },
];

export const zoneById = (id: ZoneId) => ZONES.find((z) => z.id === id)!;
