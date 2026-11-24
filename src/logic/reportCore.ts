// „Nem volt hely” és „Hibás adat” jelzések: tiszta modul (node-ban tesztelhető).
// Felhasználói azonosító, rendszám nélkül; a hely ~100 m-re kerekítve (3 tizedesjegy), a megjegyzés legfeljebb 300 karakter.
import type { LatLng } from '../data/zones';

export type ReportKind = 'nospace' | 'wrongzone' | 'wrongprice' | 'notpaid' | 'other';
export const REPORT_KINDS: ReportKind[] = ['nospace', 'wrongzone', 'wrongprice', 'notpaid', 'other'];

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
  };
}

/** Kapcsolat nélkül sorba kerül; legfeljebb 50 jelzés marad meg */
export const MAX_REPORTS = 50;
export const enqueueReport = (q: SpotReport[], r: SpotReport) => [...q, r].slice(-MAX_REPORTS);
