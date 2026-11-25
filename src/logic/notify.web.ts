// Webes értesítés: böngésző Notification API, ha engedélyezett. Az appon belüli sáv mindig megjelenik.
// Bezárt appnál (pl. iPhone kezdőképernyőre mentett webapp) Web Push szól: a parkolás indításakor elküldjük a Supabase-nek,
// mikor kell szólni, és a percenként futó küldő (supabase/functions/push-send) küldi ki. Ha nincs beállítva, minden megy tovább, mint eddig.
import { cloud } from './cloud';
import { expiryPlan } from './pushPlan';
import { loadJSON, saveJSON } from './storage';

export async function requestNotify() {
  try {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  } catch {}
}

/** Van-e élő push ütemezés: ilyenkor a nyitott app nem küld külön rendszerértesítést (különben kétszer jönne) */
let pushActive = false;

export async function alertUser(title: string, body: string) {
  if (pushActive) return;
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
  } catch {}
}

const unb64u = (s: string) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64u = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '');
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => ((c === 'x' ? (Math.random() * 16) | 0 : (((Math.random() * 16) | 0) & 3) | 8).toString(16)));

let publicKey: string | null = null;

/** Böngésző-feliratkozás a küldő kulcsával; ha a kulcs megváltozott, újra feliratkozik */
async function subscription(): Promise<PushSubscription | null> {
  if (!cloud || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || Notification.permission !== 'granted') return null;
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
  if (!reg) return null;
  publicKey ??= await cloud.pushKey();
  const key = unb64u(publicKey);
  let sub = await reg.pushManager.getSubscription();
  const same = sub?.options?.applicationServerKey && b64u(sub.options.applicationServerKey) === publicKey;
  if (sub && !same) {
    await sub.unsubscribe().catch(() => null);
    sub = null;
  }
  return sub ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
}

let seq = 0;
export async function scheduleExpiry(endAt: number, soon: string, expired: string, title: string, soonMin = 10) {
  const my = ++seq;
  try {
    const sub = await subscription();
    if (!sub || !cloud || my !== seq) return;
    const j = sub.toJSON();
    if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return;
    const plan = expiryPlan(endAt, soon, expired, title, soonMin, Date.now(), 30000).map((p) => ({ ...p, at: new Date(p.at).toISOString() }));
    const token = (await loadJSON<string | null>('pushToken', null)) ?? uuid();
    await saveJSON('pushToken', token);
    const n = await cloud.pushSchedule(token, { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, plan);
    if (my === seq) pushActive = n > 0;
  } catch {
    // Nincs beállítva a küldő, nincs internet vagy a böngésző nem engedi: marad az appon belüli figyelmeztetés
    if (my === seq) pushActive = false;
  }
}

export async function cancelExpiry() {
  const my = ++seq;
  pushActive = false;
  const token = await loadJSON<string | null>('pushToken', null);
  if (!token || !cloud || my !== seq) return;
  try {
    await cloud.pushCancel(token);
    await saveJSON('pushToken', null);
  } catch {}
}
export const SCHEDULES_IN_BACKGROUND = false;
