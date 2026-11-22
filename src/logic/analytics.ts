// Névtelen használati statisztika a zárt bétához: hol akadnak el a felhasználók (keresés → javaslat → navigáció → indítás).
// Nincs felhasználói azonosító, e-mail, rendszám vagy pontos hely; csak az esemény neve, ideje, nyelv, platform és néhány kategória.
// A Beállításokban kikapcsolható. Kapcsolat nélkül sorba kerül (legfeljebb 200 esemény), és később megy el.
import { Platform } from 'react-native';
import { cloud } from './cloud';
import { loadJSON, saveJSON } from './storage';

import { cleanProps, enqueue, MAX_QUEUE, type EventName, type StatEvent } from './analyticsCore';
export { EVENT_NAMES, type EventName } from './analyticsCore';

/** Indításonként új, véletlen azonosító: egy alkalmon belüli tölcsérhez kell, eszközt vagy személyt nem azonosít */
const SID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});

let enabled = true;
let lang = 'hu';
let queue: StatEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let loadedQueue = false;

export function configureStats(opts: { enabled: boolean; lang: string }) {
  enabled = opts.enabled;
  lang = opts.lang;
  if (!enabled) {
    queue = [];
    saveJSON('statsQueue', []);
  }
}

async function flush() {
  timer = null;
  if (!loadedQueue) {
    queue = [...(await loadJSON<StatEvent[]>('statsQueue', [])), ...queue].slice(-MAX_QUEUE);
    loadedQueue = true;
  }
  if (!cloud || !queue.length) return void saveJSON('statsQueue', queue);
  const batch = queue;
  try {
    await cloud.sendEvents(batch);
    queue = queue.slice(batch.length);
  } catch {
    // marad a sorban, a következő eseménynél újra próbáljuk
  }
  saveJSON('statsQueue', queue);
}

export function track(name: EventName, props?: Record<string, unknown>) {
  if (!enabled) return;
  queue = enqueue(queue, { sid: SID, name, at: new Date().toISOString(), lang, platform: Platform.OS, props: cleanProps(props) });
  if (!timer) timer = setTimeout(flush, 4000);
}
