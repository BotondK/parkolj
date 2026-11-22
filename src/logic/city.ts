// A „Városnak” oldal adatlogikája: összesítés, mintaadat, CSV. Tiszta függvények (tesztelhető).
import type { CityRow } from './cloud';

export const CITY_ZONES = ['A', 'B', 'C', 'D'] as const;
export const CITY_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7–22 óra

/** Mintaadat a béta előttre: egyszerű modell (zónasúly × napszak-görbe × hétvégi szorzó), determinisztikus */
export function sampleCityRows(): CityRow[] {
  const zoneW: Record<string, number> = { A: 1, B: 0.8, C: 0.45, D: 0.25 };
  const curve = (h: number) => 0.25 + Math.exp(-((h - 10) ** 2) / 6) * 0.6 + Math.exp(-((h - 19) ** 2) / 5) * 0.9;
  const rows: CityRow[] = [];
  for (const z of CITY_ZONES)
    for (let dow = 1; dow <= 7; dow++)
      for (const hour of CITY_HOURS) {
        const wk = dow >= 6 ? (z === 'A' ? 0.7 : 0.4) : 1;
        const jitter = 0.85 + (((dow * 31 + hour * 17 + z.charCodeAt(0) * 7) % 13) / 13) * 0.3;
        const sessions = Math.round(40 * zoneW[z] * curve(hour) * wk * jitter);
        if (sessions < 5) continue;
        const avg = Math.round((z === 'A' ? 70 : z === 'B' ? 85 : 110) * (hour >= 18 ? 1.4 : 1));
        const price = { A: 800, B: 600, C: 400, D: 300 }[z];
        rows.push({ zone_id: z, dow, hour, sessions, users: Math.max(3, Math.round(sessions * 0.7)), avg_minutes: avg, total_ft: Math.round((sessions * avg * price) / 60) });
      }
  return rows;
}

export type DayFilter = 'all' | 'weekday' | 'weekend';
const pick = (r: CityRow, f: DayFilter) => f === 'all' || (f === 'weekend' ? r.dow >= 6 : r.dow <= 5);

/** Zóna × óra mátrix (parkolások száma) */
export function heat(rows: CityRow[], f: DayFilter) {
  const m: Record<string, Record<number, number>> = {};
  for (const z of CITY_ZONES) m[z] = Object.fromEntries(CITY_HOURS.map((h) => [h, 0]));
  for (const r of rows) if (pick(r, f) && m[r.zone_id] && r.hour in m[r.zone_id]) m[r.zone_id][r.hour] += r.sessions;
  const max = Math.max(1, ...CITY_ZONES.flatMap((z) => CITY_HOURS.map((h) => m[z][h])));
  return { m, max };
}

/** Zónánkénti összesítés: parkolások, súlyozott átlagidő, díj */
export function byZone(rows: CityRow[], f: DayFilter) {
  return CITY_ZONES.map((z) => {
    const rs = rows.filter((r) => r.zone_id === z && pick(r, f));
    const n = rs.reduce((a, r) => a + r.sessions, 0);
    const mins = rs.reduce((a, r) => a + r.sessions * r.avg_minutes, 0);
    return { zone: z, sessions: n, avgMinutes: n ? Math.round(mins / n) : 0, totalFt: rs.reduce((a, r) => a + r.total_ft, 0) };
  });
}

export function cityCsv(rows: CityRow[]) {
  const head = 'zona;het_napja;ora;parkolasok;felhasznalok;atlag_perc;osszes_ft';
  return '﻿' + [head, ...rows.map((r) => [r.zone_id, r.dow, r.hour, r.sessions, r.users, r.avg_minutes, r.total_ft].join(';'))].join('\r\n');
}
