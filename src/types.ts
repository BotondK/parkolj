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
};

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
};

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
