// Névtelen hibajelentés a zárt bétához: ha az app összeomlik, megtudjuk, hol és milyen hibával.
// Nincs benne név, e-mail, rendszám, pontos hely vagy URL (lásd crashCore.scrubMessage). A statisztika kapcsolója erre is vonatkozik.
import { Platform } from 'react-native';
import app from '../../app.json';
import { cloud } from './cloud';
import { buildCrash, enqueueCrash, MAX_CRASHES, type CrashReport } from './crashCore';
import { loadJSON, saveJSON } from './storage';

const SID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});

let enabled = true;
let lang = 'hu';
let screen = 'start';
let queue: CrashReport[] = [];
let loaded = false;
let timer: ReturnType<typeof setTimeout> | null = null;

export function configureCrash(opts: { enabled: boolean; lang: string }) {
  enabled = opts.enabled;
  lang = opts.lang;
  if (!enabled) {
    queue = [];
    saveJSON('crashQueue', []);
  } else schedule(1500);
}

/** Melyik képernyőn járt a felhasználó (pl. 'pay', 'active', 'menu'): segít megtalálni a hibát */
export function setCrashScreen(s: string) {
  screen = s;
}

async function flush() {
  timer = null;
  if (!loaded) {
    queue = [...(await loadJSON<CrashReport[]>('crashQueue', [])), ...queue].slice(-MAX_CRASHES);
    loaded = true;
  }
  if (!enabled) return;
  if (!cloud || !queue.length) return void saveJSON('crashQueue', queue);
  const batch = queue;
  try {
    await cloud.sendCrashes(batch);
    queue = queue.slice(batch.length);
  } catch (e) {
    // 4xx (pl. még nincs app_errors tábla): eldobjuk; hálózati hiba: marad, legközelebb újra
    const status = (e as { status?: number })?.status ?? 0;
    if (status >= 400 && status < 500) queue = queue.slice(batch.length);
  }
  saveJSON('crashQueue', queue);
}

function schedule(ms: number) {
  if (!timer) timer = setTimeout(flush, ms);
}

export function reportCrash(err: unknown, kind: CrashReport['kind']) {
  if (!enabled) return;
  try {
    const c = buildCrash(err, { sid: SID, kind, version: app.expo.version, platform: Platform.OS, lang, screen });
    queue = enqueueCrash(queue, c);
    // Azonnal mentjük: ha az app most leáll, a következő indításkor megy el
    saveJSON('crashQueue', queue);
    schedule(800);
  } catch {}
}

let installed = false;
/** Elkapja a React-on kívüli hibákat is (weben window.onerror / unhandledrejection, telefonon a globális kezelő) */
export function installCrashHandlers() {
  if (installed) return;
  installed = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (ev) => {
      // Külső szkript (térképcsempe, böngészőbővítmény) hibája „Script error.” üzenettel jön: nem a miénk
      if (ev.error) reportCrash(ev.error, 'global');
    });
    window.addEventListener('unhandledrejection', (ev) => {
      if (ev.reason instanceof Error) reportCrash(ev.reason, 'promise');
    });
    return;
  }
  const g = globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => {
    reportCrash(e, 'global');
    prev(e, fatal);
  });
}
