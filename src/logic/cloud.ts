// Fiók és felhőszinkron Supabase-szel (Auth + Postgres), külső csomag nélkül, sima fetch-csel.
// Ha nincs beállítva EXPO_PUBLIC_SUPABASE_URL és EXPO_PUBLIC_SUPABASE_ANON_KEY, az app helyi fiókkal működik tovább.
// A tábla és a jogosultságok: supabase/schema.sql. Beállítás: docs/FIOK.md.
import type { BillingProfile, Car, FavoritePlace, HistoryItem, PaymentCard, Session, Settings } from '../types';

export type CloudConfig = { url: string; anonKey: string };

/** Elnéző URL-beolvasás: elfogadja a teljes címet, a https:// nélkülit, a puszta projektazonosítót
 *  és a Dashboard linkjét is; levágja a szóközt, a záró perjelet és a véletlenül bemásolt /rest/v1-et. */
export function normalizeSupabaseUrl(raw: string): string {
  let s = raw.trim().replace(/^["']|["']$/g, '');
  if (!s) return '';
  const dash = /supabase\.com\/dashboard\/project\/([a-z0-9]+)/i.exec(s);
  if (dash) return `https://${dash[1].toLowerCase()}.supabase.co`;
  if (/^[a-z0-9]{15,30}$/i.test(s)) return `https://${s.toLowerCase()}.supabase.co`;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '');
}

export const CLOUD: CloudConfig | null = (() => {
  const url = normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
  const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return url && anonKey ? { url, anonKey } : null;
})();

export type AuthSession = { accessToken: string; refreshToken: string; expiresAt: number; userId: string; email: string };

/** A felhőben tárolt adatok. Kártyából itt is csak márka + utolsó 4 számjegy + lejárat van. */
export type CloudData = {
  name?: string;
  cars?: Car[];
  favorites?: FavoritePlace[];
  cards?: PaymentCard[];
  profiles?: BillingProfile[];
  history?: HistoryItem[];
  settings?: Partial<Settings>;
  /** Az aktív parkolás (vagy null, ha nincs) és mikor változott utoljára: a frissebb nyer */
  active?: { s: Session | null; at: number };
};

type Fetch = typeof fetch;

export type Feedback = { at: number; rating: number | null; message: string; meta: Record<string, string> };

export class CloudError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function makeCloud(cfg: CloudConfig, f: Fetch = fetch) {
  // Az új formátumú (sb_publishable_…) kulcs nem JWT: csak az apikey fejlécbe mehet, Authorization-be csak a felhasználó tokenje.
  // A régi (eyJ…) anon kulcsnál a Supabase mindkét módot elfogadja.
  const base = (token?: string): Record<string, string> => ({
    apikey: cfg.anonKey,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : cfg.anonKey.startsWith('eyJ') ? { Authorization: `Bearer ${cfg.anonKey}` } : {}),
  });
  const call = async <T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> => {
    const r = await f(`${cfg.url}${path}`, { ...init, headers: { ...base(init.token), ...(init.headers as Record<string, string>) } });
    const text = await r.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { message: text.slice(0, 200) };
    }
    if (!r.ok) throw new CloudError(r.status, `${r.status}: ${body?.msg || body?.error_description || body?.message || body?.error || 'hiba'}`);
    return body as T;
  };
  const toSession = (b: { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email: string } }): AuthSession => ({
    accessToken: b.access_token,
    refreshToken: b.refresh_token,
    expiresAt: Date.now() + b.expires_in * 1000,
    userId: b.user.id,
    email: b.user.email,
  });

  return {
    /** Belépő e-mail küldése (új fióknál regisztrál is). A levélben link van (alap sablon), egyedi SMTP-vel kód is lehet.
     *  A link ide irányít vissza: redirectTo (a Supabase „Redirect URLs” listáján szerepelnie kell). */
    sendCode: (email: string, redirectTo?: string) =>
      call<unknown>(`/auth/v1/otp${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''}`, {
        method: 'POST',
        body: JSON.stringify({ email, create_user: true }),
      }),
    /** A belépő linkről visszatérve az URL-ben (#access_token=…) lévő adatokból munkamenet */
    sessionFromUrl: async (hash: string): Promise<AuthSession | { error: string } | null> => {
      const q = new URLSearchParams(hash.replace(/^#/, ''));
      if (q.get('error')) return { error: q.get('error_description') || q.get('error')! };
      const accessToken = q.get('access_token');
      const refreshToken = q.get('refresh_token');
      if (!accessToken || !refreshToken) return null;
      const user = await call<{ id: string; email: string }>('/auth/v1/user', { token: accessToken });
      const expiresIn = Number(q.get('expires_in') || 3600);
      return { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000, userId: user.id, email: user.email };
    },
    /** A kapott 6 jegyű kód ellenőrzése */
    verifyCode: async (email: string, token: string) =>
      toSession(await call('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ type: 'email', email, token }) })),
    refresh: async (s: AuthSession) =>
      toSession(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.refreshToken }) })),
    signOut: (s: AuthSession) => call<unknown>('/auth/v1/logout', { method: 'POST', token: s.accessToken }).catch(() => null),
    /** A saját adatsor (a sorszintű jogosultság miatt csak a sajátját látja) */
    load: async (s: AuthSession): Promise<CloudData | null> => {
      const rows = await call<{ data: CloudData }[]>(`/rest/v1/user_data?select=data&user_id=eq.${s.userId}`, { token: s.accessToken });
      return rows[0]?.data ?? null;
    },
    save: (s: AuthSession, data: CloudData) =>
      call<unknown>('/rest/v1/user_data?on_conflict=user_id', {
        method: 'POST',
        token: s.accessToken,
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: s.userId, data, updated_at: new Date().toISOString() }),
      }),
    /** Visszajelzés küldése (be nem lépve is); belépve a fiókhoz kötve */
    sendFeedback: (fb: Feedback, s?: AuthSession | null) =>
      call<unknown>('/rest/v1/feedback', {
        method: 'POST',
        token: s?.accessToken,
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ rating: fb.rating, message: fb.message, meta: { ...fb.meta, at: new Date(fb.at).toISOString() } }),
      }),
    /** Fiók és minden adat végleges törlése (adatbázis-függvény, csak a saját fiókra) */
    deleteAccount: (s: AuthSession) => call<unknown>('/rest/v1/rpc/delete_my_account', { method: 'POST', token: s.accessToken, body: '{}' }),
  };
}

export type Cloud = ReturnType<typeof makeCloud>;
export const cloud: Cloud | null = CLOUD ? makeCloud(CLOUD) : null;

/** Érvényes token: lejárat előtt 60 mp-cel frissít */
export async function freshSession(c: Cloud, s: AuthSession): Promise<AuthSession> {
  return s.expiresAt - Date.now() > 60_000 ? s : c.refresh(s);
}

/** Belépéskor a helyi és a felhős adatok összefésülése: azonosító szerint unió, ütközésnél a felhő nyer.
 *  Így a belépés előtt (vendégként) felvett autó vagy kedvenc sem vész el. */
export function mergeData(local: CloudData, remote: CloudData | null): CloudData {
  if (!remote) return local;
  const union = <T extends { id: string }>(r?: T[], l?: T[]) => {
    const out = [...(r ?? [])];
    for (const x of l ?? []) if (!out.some((y) => y.id === x.id)) out.push(x);
    return out;
  };
  return {
    name: remote.name || local.name,
    cars: union(remote.cars, local.cars?.filter((c) => c.id !== 'demo')),
    favorites: union(remote.favorites, local.favorites),
    cards: union(remote.cards, local.cards),
    profiles: union(remote.profiles, local.profiles),
    history: union(remote.history, local.history).sort((a, b) => b.startedAt - a.startedAt).slice(0, 500),
    settings: { ...local.settings, ...remote.settings },
    active: (remote.active?.at ?? 0) >= (local.active?.at ?? 0) ? remote.active ?? local.active : local.active,
  };
}
