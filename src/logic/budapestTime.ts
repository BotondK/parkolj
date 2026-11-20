// Budapesti falióra-idő, a készülék/szerver időzónájától függetlenül.
// A díjfizetési idők budapesti helyi időben értendők; a Cloudflare szerver UTC-ben fut,
// egy külföldi turista telefonja pedig más időzónában is lehet. Intl nélkül (Hermes-en is megbízható).
// EU nyári időszámítás: március utolsó vasárnapja 01:00 UTC-től október utolsó vasárnapja 01:00 UTC-ig (+2), egyébként +1.

const lastSundayUtc = (year: number, month: number) => {
  const d = new Date(Date.UTC(year, month + 1, 0, 1)); // a hónap utolsó napja 01:00 UTC
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.getTime();
};

/** Budapest eltolása UTC-hez képest órában (1 vagy 2) az adott pillanatban. */
export function budapestOffset(ms: number): number {
  const y = new Date(ms).getUTCFullYear();
  return ms >= lastSundayUtc(y, 2) && ms < lastSundayUtc(y, 9) ? 2 : 1;
}

export type BpParts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number };

/** month: 1–12, weekday: 0 = vasárnap */
export function bpParts(d: Date | number): BpParts {
  const ms = typeof d === 'number' ? d : d.getTime();
  const l = new Date(ms + budapestOffset(ms) * 3600000);
  return {
    year: l.getUTCFullYear(),
    month: l.getUTCMonth() + 1,
    day: l.getUTCDate(),
    weekday: l.getUTCDay(),
    hour: l.getUTCHours(),
    minute: l.getUTCMinutes(),
  };
}

/** Budapesti helyi időből (month: 1–12, órák törtben is, pl. 8.5) epoch ms. */
export function bpTime(year: number, month: number, day: number, hours: number): number {
  const guess = Date.UTC(year, month - 1, day) + hours * 3600000;
  const off = budapestOffset(guess - 3600000);
  return guess - off * 3600000;
}

export const bpYmd = (d: Date | number) => {
  const p = bpParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};
