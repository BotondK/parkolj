// Opcionális szerverszinkron. Ha nincs beállítva EXPO_PUBLIC_API_URL, semmit sem csinál.
// Offline-first: az app mindig a helyi állapotból dolgozik, a szerverhiba nem akadályozza a parkolást.
import type { LatLng } from '../data/zones';

export const API_URL: string | null = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '') || null;

async function call<T>(path: string, body?: unknown): Promise<T | null> {
  if (!API_URL) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(API_URL + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type RemoteStart = { coord: LatLng; plate: string; country: string; minutes: number; zoneCode?: string };

export async function remoteStart(s: RemoteStart): Promise<string | null> {
  const r = await call<{ id: string }>('/v1/sessions', {
    lat: s.coord.lat,
    lng: s.coord.lng,
    plate: s.plate,
    country: s.country,
    minutes: s.minutes,
    zoneCode: s.zoneCode,
  });
  return r?.id ?? null;
}

export const remoteExtend = (id: string, minutes = 15) => call(`/v1/sessions/${id}/extend`, { minutes });
export const remoteStop = (id: string) => call(`/v1/sessions/${id}/stop`, {});
export const remoteHealth = () => call<{ ok: boolean; storage: string }>('/health');
