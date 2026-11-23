// Kezdőképernyő-widgetek közös adatmodellje (Android, iPhone és a webes előnézet ugyanezt használja).
// Tiszta modul: nincs react-native import, node-ban tesztelhető. Az app minden változáskor elmenti a pillanatképet
// (WidgetData), a widgetek ebből rajzolnak, a gombok mélylinkkel (parkolj://widget/…) nyitják az appot.

export type WidgetLang = 'hu' | 'en' | 'de';
export type WidgetAction = 'open' | 'extend' | 'stop' | 'here' | 'home' | 'work';

/** Az app URL-sémája (app.json: scheme) */
export const WIDGET_SCHEME = 'parkolj';
export const widgetUrl = (a: WidgetAction) => `${WIDGET_SCHEME}://widget/${a}`;

/** parkolj://widget/extend → 'extend'; minden más null */
export function parseWidgetUrl(url: string | null | undefined): WidgetAction | null {
  const m = /^parkolj:\/\/+widget\/([a-z]+)\/?(?:[?#].*)?$/i.exec(url ?? '');
  const a = m?.[1].toLowerCase();
  return a && (['open', 'extend', 'stop', 'here', 'home', 'work'] as string[]).includes(a) ? (a as WidgetAction) : null;
}

/** Ennyi perccel a lejárat előtt vált a widget figyelmeztető színre (az app is ekkor szól) */
export const SOON_MIN = 10;

export type WidgetLabels = {
  title: string;
  idle: string;
  idleSub: string;
  expires: string;
  expired: string;
  soon: string;
  extend: string;
  stop: string;
  here: string;
  home: string;
  work: string;
  zone: string;
  quickTitle: string;
  notSet: string;
};

const LABELS: Record<WidgetLang, WidgetLabels> = {
  hu: {
    title: 'Parkolásom',
    idle: 'Nincs aktív parkolás',
    idleSub: 'Koppints a parkolás indításához',
    expires: 'Lejár',
    expired: 'Lejárt',
    soon: 'Hamarosan lejár',
    extend: '+15 perc',
    stop: 'Leállítás',
    here: 'Parkolás itt',
    home: 'Otthon',
    work: 'Munkahely',
    zone: 'zóna',
    quickTitle: 'Gyors indítás',
    notSet: 'Beállítás',
  },
  en: {
    title: 'My parking',
    idle: 'No active parking',
    idleSub: 'Tap to start parking',
    expires: 'Ends',
    expired: 'Expired',
    soon: 'Ending soon',
    extend: '+15 min',
    stop: 'Stop',
    here: 'Park here',
    home: 'Home',
    work: 'Work',
    zone: 'Zone',
    quickTitle: 'Quick start',
    notSet: 'Set up',
  },
  de: {
    title: 'Mein Parken',
    idle: 'Kein aktiver Parkvorgang',
    idleSub: 'Tippen, um zu parken',
    expires: 'Endet',
    expired: 'Abgelaufen',
    soon: 'Läuft bald ab',
    extend: '+15 Min.',
    stop: 'Beenden',
    here: 'Hier parken',
    home: 'Zuhause',
    work: 'Arbeit',
    zone: 'Zone',
    quickTitle: 'Schnellstart',
    notSet: 'Einrichten',
  },
};

export type WidgetActive = {
  /** Zóna betűjele, vagy null (mélygarázs) */
  zone: string | null;
  /** A zóna színe (#RRGGBB), garázsnál a márkaszín */
  color: string;
  plate: string;
  place: string;
  /** Kezdés és lejárat, ms (epoch) */
  startedAt: number;
  endsAt: number;
  /** Hosszabbítható-e még +15 perccel (3 órás szabály) */
  canExtend: boolean;
};

export type WidgetData = {
  v: 1;
  lang: WidgetLang;
  updatedAt: number;
  active: WidgetActive | null;
  /** Gyors indítás: be van-e állítva az Otthon / Munkahely (a név csak a widgeten látszik, a készüléken marad) */
  home: string | null;
  work: string | null;
  labels: WidgetLabels;
};

type SessionLike = {
  option: { kind: string; zone: { id: string; color: string; maxMinutes: number | null } | null };
  placeName: string;
  plate: string;
  durationMin: number;
  elapsedSec: number;
};
type FavLike = { slot: string; name: string };

export function buildWidgetData(p: { lang: WidgetLang; session: SessionLike | null; favorites: FavLike[]; now: number; brand?: string }): WidgetData {
  const s = p.session;
  const active: WidgetActive | null = s
    ? {
        zone: s.option.zone?.id ?? null,
        color: s.option.zone?.color ?? p.brand ?? '#4A1D7A',
        plate: s.plate,
        place: s.placeName.slice(0, 40),
        startedAt: p.now - s.elapsedSec * 1000,
        endsAt: p.now + Math.max(0, s.durationMin * 60 - s.elapsedSec) * 1000,
        canExtend: !(s.option.zone?.maxMinutes && s.durationMin + 15 > s.option.zone.maxMinutes),
      }
    : null;
  const fav = (slot: string) => p.favorites.find((f) => f.slot === slot)?.name.slice(0, 30) ?? null;
  return { v: 1, lang: p.lang, updatedAt: p.now, active, home: fav('home'), work: fav('work'), labels: LABELS[p.lang] };
}

export type WidgetState = 'idle' | 'active' | 'soon' | 'expired';

export function widgetState(d: WidgetData, now: number): WidgetState {
  if (!d.active) return 'idle';
  const left = d.active.endsAt - now;
  if (left <= 0) return 'expired';
  return left <= SOON_MIN * 60000 ? 'soon' : 'active';
}

/** Hátralévő idő „1:05” vagy „12 perc” helyett mindig ó:pp formában (a widgeten egyforma szélességű) */
export function leftText(d: WidgetData, now: number): string {
  if (!d.active) return '';
  const min = Math.max(0, Math.ceil((d.active.endsAt - now) / 60000));
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

/** Óra:perc Budapest idő szerint (a widget a készülék idejét mutatja, de a parkolási díj Budapesten fut) */
export function clockText(ms: number, lang: WidgetLang): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : 'hu-HU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest' }).format(ms);
}

/** Előrehaladás 0..1 (a sávhoz) */
export function progress(d: WidgetData, now: number): number {
  if (!d.active) return 0;
  const total = d.active.endsAt - d.active.startedAt;
  return total > 0 ? Math.min(1, Math.max(0, (now - d.active.startedAt) / total)) : 1;
}

/** Widget-színek (az app témájával egyezően), világos és sötét változat */
export type WidgetTheme = Record<'bg' | 'text' | 'sub' | 'line' | 'brand' | 'btn' | 'onBtn' | 'btn2' | 'onBtn2' | 'warn' | 'warnSoft' | 'danger' | 'dangerSoft' | 'track', string>;
export const WIDGET_THEME: { light: WidgetTheme; dark: WidgetTheme } = {
  light: { bg: '#FFFFFF', text: '#1C1B1F', sub: '#5E5D66', line: '#E0D8E5', brand: '#4A1466', btn: '#4A1466', onBtn: '#FFFFFF', btn2: '#F1E9F5', onBtn2: '#4A1466', warn: '#9A4A06', warnSoft: '#FEF3C7', danger: '#B91C1C', dangerSoft: '#FEE2E2', track: '#EDE7F1' },
  dark: { bg: '#242328', text: '#F5F4F7', sub: '#B6B3BE', line: '#3D3B44', brand: '#C9A9DC', btn: '#B99BCB', onBtn: '#2C0A3D', btn2: '#3A2D44', onBtn2: '#F5F4F7', warn: '#F5B85A', warnSoft: '#3D2E12', danger: '#FF8A8A', dangerSoft: '#452020', track: '#3A3940' },
};

/** Vonalas ikonok SVG-ben (ugyanazok, mint az appban), a natív widgetekhez */
export function iconSvg(name: 'home' | 'work' | 'pin' | 'plus' | 'stop' | 'parking', color: string, size = 24): string {
  const a = `stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const body = {
    home: `<path ${a} d="M3 11 12 3.5 21 11M5.5 9v11h5v-6h3v6h5V9"/>`,
    work: `<rect ${a} x="5" y="3" width="14" height="18" rx="1"/><path ${a} d="M8.5 7h2m3 0h2m-7 4h2m3 0h2m-7 4h2m3 0h2M10.5 21v-3h3v3"/>`,
    pin: `<path ${a} d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle ${a} cx="12" cy="9.5" r="2.5"/>`,
    plus: `<path ${a} d="M12 5v14M5 12h14"/>`,
    stop: `<rect ${a} x="6" y="6" width="12" height="12" rx="2"/>`,
    parking: `<rect ${a} x="3.5" y="3.5" width="17" height="17" rx="4"/><path ${a} d="M9.5 17V7.5h3.2a2.8 2.8 0 0 1 0 5.6H9.5"/>`,
  }[name];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${body}</svg>`;
}
