import type { Zone } from '../data/zones';
import { HOLIDAYS, TRANSFERRED_REST_DAYS, WORKING_SATURDAYS } from '../data/zoneCodes';
import { bpParts, bpTime, bpYmd } from './budapestTime';

// Minden időpont budapesti helyi időben értendő (lásd budapestTime.ts), a készülék időzónájától függetlenül.
export const isHoliday = (d: Date) => HOLIDAYS.has(bpYmd(d));

/** Különleges nap: ledolgozós szombat (munkanapi díjfizetés) vagy áthelyezett pihenőnap (díjmentes) */
export type SpecialDay = 'workSaturday' | 'restDay' | null;
export function specialDay(d: Date): SpecialDay {
  const ymd = bpYmd(d);
  if (WORKING_SATURDAYS.has(ymd)) return 'workSaturday';
  if (TRANSFERRED_REST_DAYS.has(ymd)) return 'restDay';
  return null;
}

/** A következő különleges napok `from`-tól `days` napon belül (a figyelmeztetéshez és a Tudnivalókhoz) */
export function upcomingSpecialDays(from: Date, days = 14): { ymd: string; kind: Exclude<SpecialDay, null> }[] {
  const out: { ymd: string; kind: Exclude<SpecialDay, null> }[] = [];
  const today = bpYmd(from);
  const until = bpYmd(new Date(from.getTime() + days * 86400000));
  for (const ymd of [...WORKING_SATURDAYS].sort()) if (ymd >= today && ymd <= until) out.push({ ymd, kind: 'workSaturday' });
  for (const ymd of [...TRANSFERRED_REST_DAYS].sort()) if (ymd >= today && ymd <= until) out.push({ ymd, kind: 'restDay' });
  return out.sort((a, b) => a.ymd.localeCompare(b.ymd));
}

/** Díj a megadott percekre, percalapú elszámolással (ahogy a mobilparkolás működik). */
export function priceFor(zone: Pick<Zone, 'pricePerHour'>, minutes: number): number {
  return Math.round((zone.pricePerHour * minutes) / 60);
}

export function chargingWindow(zone: Zone, at: Date): [number, number] | null {
  const day = bpParts(at).weekday; // 0 = vasárnap
  const special = specialDay(at);
  if (day === 0 || isHoliday(at) || special === 'restDay') return null;
  // Ledolgozós szombaton a munkanapi díjfizetési rend érvényes
  if (day === 6) return special === 'workSaturday' ? zone.weekdayHours : zone.saturdayHours;
  return zone.weekdayHours;
}

/** Fizetős-e most a zóna (demó szabályok). */
export function isCharging(zone: Zone, at: Date = new Date()): boolean {
  const w = chargingWindow(zone, at);
  if (!w) return false;
  const p = bpParts(at);
  const h = p.hour + p.minute / 60;
  return h >= w[0] && h < w[1];
}

/**
 * A 3 órás szabály: A–C zónában egy helyen legfeljebb maxMinutes egybefüggően.
 * Visszaadja, hány perc indítható még, ha már `usedMinutes` eltelt.
 */
export function remainingAllowed(zone: Zone, usedMinutes: number): number | null {
  if (zone.maxMinutes == null) return null;
  return Math.max(0, zone.maxMinutes - usedMinutes);
}

export const formatFt = (n: number) =>
  `${Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Ft`;

export const formatDuration = (min: number, lang: 'hu' | 'en' | 'de') => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (lang === 'hu') return h ? (m ? `${h} ó ${m} p` : `${h} óra`) : `${m} perc`;
  if (lang === 'de') return h ? (m ? `${h} Std. ${m} Min.` : `${h} Std.`) : `${m} Min.`;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
};

export const formatClock = (d: Date) => {
  const p = bpParts(d);
  return `${p.hour.toString().padStart(2, '0')}:${p.minute.toString().padStart(2, '0')}`;
};

/** Hány perc esik díjfizetési időbe a [start, start+minutes) szakaszból. */
export function chargeableMinutes(zone: Zone, start: Date, minutes: number): number {
  let n = 0;
  const t0 = start.getTime();
  for (let m = 0; m < Math.floor(minutes); m++) if (isCharging(zone, new Date(t0 + m * 60000))) n++;
  return n;
}

/** Díj a díjfizetési időszakot figyelembe véve: díjmentes időre nem fizetsz. */
export function priceWindow(zone: Zone, start: Date, minutes: number): number {
  return priceFor(zone, chargeableMinutes(zone, start, minutes));
}

/** Ha most fizetős a zóna: mikor ér véget a mostani díjfizetési időszak. Egyébként null. */
export function paidEnd(zone: Zone, at: Date): Date | null {
  if (!isCharging(zone, at)) return null;
  const w = chargingWindow(zone, at)!;
  const p = bpParts(at);
  return new Date(bpTime(p.year, p.month, p.day, w[1]));
}
