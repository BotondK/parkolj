// SMS-es parkolás Budapesten (a mobilszolgáltatón át, a Parkolj nem kezel pénzt):
// indítás: SMS a rendszámmal a +36 <20|30|70> 763 <zónakód> számra; leállítás: „STOP” ugyanarra a számra.
// A rendszám szóköz és kötőjel nélkül megy, külföldi autónál vesszővel az országjel (pl. „ABC123,SK”).
import type { Zone } from '../data/zones';
import { paidEnd } from './pricing';

/** Telefonszolgáltatók előhívója a 763-as mobilparkolási számhoz */
export const SMS_PREFIXES = [
  { prefix: '20', label: 'Yettel' },
  { prefix: '30', label: 'Telekom' },
  { prefix: '70', label: 'One' },
] as const;
export type SmsPrefix = (typeof SMS_PREFIXES)[number]['prefix'];

export const smsNumber = (prefix: SmsPrefix, zoneCode: string) => (/^\d{4}$/.test(zoneCode) ? `+36${prefix}763${zoneCode}` : '');

/** Olvasható alak a képernyőre: +36 30 763 0601 */
export const smsNumberPretty = (n: string) => (n ? n.replace(/^\+36(\d{2})763(\d{4})$/, '+36 $1 763 $2') : '');

export function smsPlate(plate: string, country: string): string {
  const p = plate.toUpperCase().replace(/[\s\-.]/g, '');
  return country && country !== 'H' ? `${p},${country.toUpperCase()}` : p;
}

/** sms: link előtöltött szöveggel (iOS-en & elválasztó, máshol ?) */
export const smsUri = (number: string, body: string, ios: boolean) => `sms:${number}${ios ? '&' : '?'}body=${encodeURIComponent(body)}`;

export const SMS_STOP = 'STOP';

/** Az SMS-es parkolás addig fut, amíg le nem állítod: az időzítő a zóna korlátjáig vagy a fizetős idő végéig számol, legfeljebb 10 óráig */
export function smsLimitMinutes(zone: Zone | null | undefined, now: Date): number {
  const cap = Math.min(zone?.maxMinutes ?? 600, 600);
  const pe = zone ? paidEnd(zone, now) : null;
  if (!pe) return cap;
  const toEnd = Math.ceil((pe.getTime() - now.getTime()) / 60000);
  return Math.max(1, Math.min(cap, toEnd));
}
