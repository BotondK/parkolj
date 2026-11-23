// Jelentkezés a zárt bétára (?beta): tiszta segédfüggvények, react-native nélkül, hogy node-ban tesztelhető legyen.

export const BETA_PLATFORMS = ['ios', 'android', 'web'] as const;
export const BETA_FREQS = ['daily', 'weekly', 'monthly', 'rarely'] as const;
export const BETA_WHO = ['resident', 'commuter', 'visitor'] as const;

export type BetaPlatform = (typeof BETA_PLATFORMS)[number];
export type BetaFreq = (typeof BETA_FREQS)[number];
export type BetaWho = (typeof BETA_WHO)[number];

export type BetaForm = { email: string; platform: BetaPlatform | null; freq: BetaFreq | null; who: BetaWho | null; consent: boolean };
export type BetaRow = { p_email: string; p_platform: BetaPlatform; p_freq: BetaFreq; p_who: BetaWho; p_lang: string };
export type BetaError = 'email' | 'platform' | 'freq' | 'who' | 'consent';

export const normalizeEmail = (s: string) => s.trim().toLowerCase();

/** Ugyanaz a szabály, mint az adatbázisban (supabase/schema.sql, beta_signups.email) */
export const validEmail = (s: string) => {
  const e = normalizeEmail(s);
  return e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
};

/** Az első hiányzó vagy hibás mező, vagy null, ha beküldhető */
export function betaError(f: BetaForm): BetaError | null {
  if (!validEmail(f.email)) return 'email';
  if (!f.platform) return 'platform';
  if (!f.freq) return 'freq';
  if (!f.who) return 'who';
  if (!f.consent) return 'consent';
  return null;
}

/** A beta_signup adatbázis-függvény paraméterei */
export function betaRow(f: BetaForm, lang: string): BetaRow {
  if (betaError(f)) throw new Error('hiányos jelentkezés');
  return { p_email: normalizeEmail(f.email), p_platform: f.platform!, p_freq: f.freq!, p_who: f.who!, p_lang: lang.slice(0, 5) };
}
