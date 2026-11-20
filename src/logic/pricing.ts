import type { Zone } from '../data/zones';
import { HOLIDAYS } from '../data/zoneCodes';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const isHoliday = (d: Date) => HOLIDAYS.has(ymd(d));

/** Díj a megadott percekre, percalapú elszámolással (ahogy a mobilparkolás működik). */
export function priceFor(zone: Pick<Zone, 'pricePerHour'>, minutes: number): number {
  return Math.round((zone.pricePerHour * minutes) / 60);
}

export function chargingWindow(zone: Zone, at: Date): [number, number] | null {
  const day = at.getDay(); // 0 = vasárnap
  if (day === 0 || isHoliday(at)) return null;
  if (day === 6) return zone.saturdayHours;
  return zone.weekdayHours;
}

/** Fizetős-e most a zóna (demó szabályok). */
export function isCharging(zone: Zone, at: Date = new Date()): boolean {
  const w = chargingWindow(zone, at);
  if (!w) return false;
  const h = at.getHours() + at.getMinutes() / 60;
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

export const formatDuration = (min: number, lang: 'hu' | 'en') => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (lang === 'hu') return h ? (m ? `${h} ó ${m} p` : `${h} óra`) : `${m} perc`;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
};

export const formatClock = (d: Date) =>
  `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

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
  const end = new Date(at);
  end.setHours(w[1], 0, 0, 0);
  return end;
}
