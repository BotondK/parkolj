import type { ParkingOption } from './logic/recommend';

export type Car = { id: string; plate: string; country: string };

export type Session = {
  option: ParkingOption;
  placeName: string;
  plate: string;
  country: string;
  durationMin: number;
  startedAt: number;
  elapsedSec: number;
  warnedSoon: boolean;
  warnedExpired: boolean;
  /** Szerveroldali azonosító, ha be van állítva az API (EXPO_PUBLIC_API_URL) */
  remoteId?: string;
  payLabel?: string;
  profileLabel?: string;
  /** Plusz csak erre a parkolásra (alkalmi díj) */
  plusOnce?: boolean;
  /** Automatikus hosszabbítással eddig hozzáadott percek */
  autoExtMin?: number;
  /** „Hol hagytam az autót”: szint, oszlop, megjegyzés */
  spot?: string;
  /** Garázsszint (pl. „-2”, „0”); a fotó külön, csak a készüléken (carPhoto kulcs) */
  floor?: string;
  /** SMS-ben indított valódi parkolás (a szolgáltatón át): ide megy a STOP */
  sms?: { number: string };
};

/** A terv szerint a „Hol parkoltam” (szint, jegyzet, fotó) az MVP része, mindenkinek ingyenes. false: Plusz-funkció. */
export const CAR_SPOT_FREE = true;

export type HistoryItem = {
  id: string;
  placeName: string;
  zoneId: string | null;
  pricePerHour: number;
  plate: string;
  country: string;
  startedAt: number;
  minutes: number;
  cost: number;
  /** Fizetési mód és számlázási profil a nyugtán */
  payLabel?: string;
  profileLabel?: string;
  /** Felhasznált kuponjóváírás (Ft) */
  credit?: number;
  /** Alkalmi Plusz díja (Ft) */
  plusFee?: number;
  spot?: string;
  floor?: string;
};

export const COUNTRIES = ['H', 'A', 'D', 'SK', 'RO', 'HR', 'SRB', 'UA', 'PL', 'CZ', 'I', 'F', 'GB', '…'];

const HU_PLATE = /^([A-Z]{3}-?\d{3}|[A-Z]{2}-?[A-Z]{2}-?\d{3})$/;

export function plateValid(plate: string, country: string) {
  const p = plate.trim().toUpperCase();
  if (country === 'H') return HU_PLATE.test(p);
  return p.replace(/[^A-Z0-9]/g, '').length >= 2;
}

// --- Fiók, kedvencek, fizetés (BudapestGO-szerű menü) ---

export type ThemeMode = 'system' | 'light' | 'dark';

/** Mentett bankkártya. A teljes kártyaszámot SOHA nem tároljuk: csak márka, utolsó 4 számjegy, lejárat.
 *  Éles verzióban a kártyát a fizetési szolgáltató (pl. Barion/SimplePay) tárolja, mi csak tokent kapunk. */
export type PaymentCard = { id: string; brand: 'Visa' | 'Mastercard' | 'Amex' | 'Kártya'; last4: string; exp: string; holder: string };

/** Számlázási (vásárlói) profil: magán vagy céges számla */
export type BillingProfile = {
  id: string;
  kind: 'private' | 'company';
  name: string;
  taxNumber?: string;
  zip: string;
  city: string;
  address: string;
  email: string;
};

export type FavoritePlace = {
  id: string;
  /** 'home' és 'work' fix helyek, a többi egyéni */
  slot: 'home' | 'work' | 'custom';
  label: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type AppNote = { id: string; at: number; title: string; body: string };

export type Account = { name: string; email: string } | null;

export type Settings = {
  theme: ThemeMode;
  remind: boolean;
  remindMin: 5 | 10 | 15;
  helpBar: boolean;
  biometric: boolean;
  /** E fölötti összegnél kér arc-/ujjlenyomat-azonosítást (Ft) */
  biometricOver: number;
  defaultPay: string;
  defaultProfile: string;
  /** Parkolj Plusz előfizetés */
  plus: 'none' | 'monthly';
  plusSince: number;
  /** Plusz: automatikus hosszabbítás lejárat előtt, legfeljebb ennyi extra percig */
  autoExtend: boolean;
  autoExtendMax: 30 | 60 | 120;
  /** Névtelen használati statisztika (zárt béta), kikapcsolható */
  stats: boolean;
  /** Mobilszolgáltató előhívója az SMS-es parkoláshoz */
  smsPrefix: '20' | '30' | '70';
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  remind: true,
  remindMin: 10,
  helpBar: true,
  biometric: false,
  biometricOver: 2000,
  defaultPay: 'wallet',
  defaultProfile: 'none',
  plus: 'none',
  plusSince: 0,
  autoExtend: true,
  autoExtendMax: 60,
  stats: true,
  smsPrefix: '30',
};

/** Parkolj Plusz árak (a bevételi modell szerint, a Simple Pro 69 Ft-ja alatt) */
export const PLUS_MONTHLY_FT = 590;
export const PLUS_ONCE_FT = 39;

/** Automatikus hosszabbítás: lejárat előtt ennyi másodperccel, ennyi perccel */
export const AUTO_EXT_BEFORE_SEC = 120;
export const AUTO_EXT_STEP_MIN = 15;

/** Hosszabbítson-e most automatikusan (tiszta függvény, tesztelhető) */
export function shouldAutoExtend(s: { durationMin: number; elapsedSec: number; autoExtMin?: number }, maxExtraMin: number, zoneMaxMin: number | null | undefined) {
  const left = s.durationMin * 60 - s.elapsedSec;
  if (left > AUTO_EXT_BEFORE_SEC || left <= 0) return false;
  if ((s.autoExtMin ?? 0) + AUTO_EXT_STEP_MIN > maxExtraMin) return false;
  if (zoneMaxMin != null && s.durationMin + AUTO_EXT_STEP_MIN > zoneMaxMin) return false;
  return true;
}

/** Havi kimutatás CSV (pontosvesszővel, magyar Excelhez) */
export function historyCsv(items: HistoryItem[]) {
  const esc = (v: string | number | undefined) => {
    const s = v == null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const head = ['Kezdés', 'Hely', 'Zóna', 'Rendszám', 'Perc', 'Parkolási díj (Ft)', 'Plusz (Ft)', 'Kupon (Ft)', 'Fizetés', 'Számlázás'];
  const rows = items.map((i) => [fmt(i.startedAt), i.placeName, i.zoneId ?? '', `${i.country} ${i.plate}`, i.minutes, i.cost, i.plusFee ?? 0, i.credit ?? 0, i.payLabel ?? '', i.profileLabel ?? '']);
  return '\ufeff' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

/** Luhn-ellenőrzés kártyaszámra (csak formai ellenőrzés) */
export function luhnValid(num: string) {
  const d = num.replace(/\D/g, '');
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i];
    if (i % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string): PaymentCard['brand'] {
  const d = num.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  return 'Kártya';
}

/** Lejárat „HH/ÉÉ” formában, és nem járt-e le */
export function expValid(exp: string, now = new Date()) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(exp.trim());
  if (!m) return false;
  const mm = +m[1];
  const yy = 2000 + +m[2];
  if (mm < 1 || mm > 12) return false;
  return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}

/** Magyar adószám formai ellenőrzése: 12345678-1-23 */
export function taxNumberValid(s: string) {
  return /^\d{8}-?\d-?\d{2}$/.test(s.trim());
}
