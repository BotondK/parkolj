// „Nem volt hely” és „Hibás adat” jelzések: tiszta modul (node-ban tesztelhető).
// Felhasználói azonosító, rendszám nélkül; a hely ~100 m-re kerekítve (3 tizedesjegy), a megjegyzés legfeljebb 300 karakter.
import type { LatLng } from '../data/zones';

/** found: leállítás után a felhasználó megmondja, mennyi ideig keresett helyet (search_min) */
export type ReportKind = 'nospace' | 'wrongzone' | 'wrongprice' | 'notpaid' | 'other' | 'found';
export const REPORT_KINDS: ReportKind[] = ['nospace', 'wrongzone', 'wrongprice', 'notpaid', 'other', 'found'];

export type SpotReport = {
  at: string;
  kind: ReportKind;
  zone_id: string | null;
  district: string | null;
  option_kind: 'fastest' | 'cheapest' | 'garage' | 'here' | null;
  lat: number;
  lng: number;
  note: string | null;
  lang: 'hu' | 'en' | 'de';
  /** Csak „found” jelzésnél: hány percig keresett helyet (0, 3, 10, 20) */
  search_min?: number | null;
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;
/** Budapest környéke (a szerver is ezt ellenőrzi) */
export const inBudapest = (p: LatLng) => p.lat >= 47.3 && p.lat <= 47.7 && p.lng >= 18.9 && p.lng <= 19.4;

export function buildReport(p: {
  kind: ReportKind;
  coord: LatLng;
  zone: string | null;
  district?: string | null;
  optionKind?: SpotReport['option_kind'];
  note?: string;
  lang: SpotReport['lang'];
  now?: Date;
  searchMin?: number;
}): SpotReport | null {
  if (!inBudapest(p.coord)) return null;
  const note = (p.note ?? '').trim().slice(0, 300);
  return {
    at: (p.now ?? new Date()).toISOString(),
    kind: p.kind,
    zone_id: p.zone && /^[A-D]$/.test(p.zone) ? p.zone : null,
    district: p.district ? p.district.slice(0, 40) : null,
    option_kind: p.optionKind ?? null,
    lat: r3(p.coord.lat),
    lng: r3(p.coord.lng),
    note: note || null,
    lang: p.lang,
    // Mindig benne van (null is): a szerver egy kötegben csak azonos mezőkészletű sorokat fogad el
    search_min: p.kind === 'found' ? Math.max(0, Math.min(60, Math.round(p.searchMin ?? 0))) : null,
  };
}

/** Kapcsolat nélkül sorba kerül; legfeljebb 50 jelzés marad meg */
export const MAX_REPORTS = 50;
export const enqueueReport = (q: SpotReport[], r: SpotReport) => [...q, r].slice(-MAX_REPORTS);

/** „Nem volt hely” forró pont (a szerver összesítése: ≥3 jelzés ≥2 napról, ~100 m-es cella × 3 órás sáv) */
export type Hotspot = { lat: number; lng: number; zone_id: string | null; hour_from: number; reports: number; last_at: string };

let hotspots: Hotspot[] = [];
export const setHotspots = (h: Hotspot[]) => {
  hotspots = h.map((x) => ({ ...x, lat: Number(x.lat), lng: Number(x.lng) }));
};
export const getHotspots = () => hotspots;

/**
 * Mennyivel kisebb a szabad hely esélye egy ponton az adott órában (0..0,35), a közeli „nem volt hely” jelzések alapján.
 * 120 m-en belüli cella, ugyanabban a 3 órás sávban; több jelzés nagyobb levonás.
 */
export function hotspotPenalty(p: LatLng, hour: number, list: Hotspot[] = hotspots): number {
  let pen = 0;
  for (const h of list) {
    if (Math.floor(hour / 3) * 3 !== h.hour_from) continue;
    const dy = (h.lat - p.lat) * 110540, dx = (h.lng - p.lng) * 75000;
    if (dx * dx + dy * dy > 120 * 120) continue;
    pen = Math.max(pen, Math.min(0.35, 0.12 + 0.04 * (h.reports - 3)));
  }
  return pen;
}

/** Válaszlehetőségek a „Mennyi ideig kerestél helyet?” kérdésre: a tárolt perc a sáv jellemző értéke */
export const SEARCH_BUCKETS = [0, 3, 10, 20] as const;

/** Valódi helykeresési idő a válaszokból (szerver: zóna × 3 órás sáv, legalább 5 válasz) */
export type SearchStat = { zone_id: string; hour_from: number; answers: number; avg_min: number; quick_share: number };
let searchStats: SearchStat[] = [];
export const setSearchStats = (s: SearchStat[]) => {
  searchStats = s.map((x) => ({ ...x, avg_min: Number(x.avg_min), quick_share: Number(x.quick_share), answers: Number(x.answers) }));
};
export const getSearchStats = () => searchStats;

/** Átlagos keresési idő percben egy zónában az adott órában, vagy null, ha nincs elég válasz */
export function searchMinutesFor(zoneId: string | null | undefined, hour: number, list: SearchStat[] = searchStats): number | null {
  if (!zoneId) return null;
  const s = list.find((x) => x.zone_id === zoneId && x.hour_from === Math.floor(hour / 3) * 3);
  return s && s.answers >= 5 ? s.avg_min : null;
}

/**
 * Becsült keresési idő egy jelöltre: a szabad hely esélyéből (0–12 perc), és ha van valódi adat a zónára és sávra,
 * akkor a kettő átlaga, ahol a valódi átlagot az esélyhez igazítjuk (jobb esély → kevesebb keresés).
 */
export function searchEstimate(availability: number, real: number | null): number {
  const sim = (1 - availability) * 12;
  if (real == null) return sim;
  const scaled = real * (1 - availability) * 2; // átlagos esély (0,5) mellett pont a valódi átlag
  return (sim + scaled) / 2;
}
