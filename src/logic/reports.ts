// Jelzések küldése sorral: ha nincs kapcsolat vagy fiókszerver, a készüléken marad, és később megy el.
import { cloud } from './cloud';
import { enqueueReport, setHotspots, setSearchStats, type Hotspot, type SearchStat, type SpotReport } from './reportCore';
import { loadJSON, saveJSON } from './storage';

// Egyszerre egy művelet fér a sorhoz: két egymás utáni jelzés ne írja felül egymást
let lock: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
};

export function sendReport(r: SpotReport | null): Promise<'sent' | 'queued' | 'invalid'> {
  if (!r) return Promise.resolve('invalid');
  return serial(async () => {
    // Előbb a készülékre mentjük, hogy a küldés közbeni bezárásnál se vesszen el
    const q = enqueueReport(await loadJSON<SpotReport[]>('reportQueue', []), r);
    await saveJSON('reportQueue', q);
    const left = await flushNow(q);
    return left.length ? 'queued' : 'sent';
  });
}

export function flushReports(): Promise<SpotReport[]> {
  return serial(() => flushNow());
}

async function flushNow(q?: SpotReport[]): Promise<SpotReport[]> {
  const queue = q ?? (await loadJSON<SpotReport[]>('reportQueue', []));
  if (!cloud || !queue.length) return queue;
  let left = queue;
  try {
    await cloud.sendReports(queue);
    left = [];
  } catch (e) {
    // Elutasított (hibás) jelzés: eldobjuk. A 404 (még nincs tábla a szerveren) után megtartjuk, és később újra próbáljuk.
    const status = (e as { status?: number })?.status ?? 0;
    if (status >= 400 && status < 500 && status !== 404) left = [];
  }
  if (left !== queue) await saveJSON('reportQueue', left);
  return left;
}

/** Forró pontok betöltése: a tárolt példány azonnal, a szerverről 6 óránként frissítve */
export async function loadHotspots(): Promise<Hotspot[]> {
  const cached = await loadJSON<{ at: number; items: Hotspot[] } | null>('hotspots', null);
  if (cached) setHotspots(cached.items);
  if (!cloud || (cached && Date.now() - cached.at < 6 * 3600_000)) return cached?.items ?? [];
  try {
    const items = await cloud.nospaceHotspots();
    setHotspots(items);
    await saveJSON('hotspots', { at: Date.now(), items });
    return items;
  } catch {
    return cached?.items ?? [];
  }
}

/** Valódi helykeresési idők: a tárolt példány azonnal, a szerverről 12 óránként frissítve */
export async function loadSearchStats(): Promise<SearchStat[]> {
  const cached = await loadJSON<{ at: number; items: SearchStat[] } | null>('searchStats', null);
  if (cached) setSearchStats(cached.items);
  if (!cloud || (cached && Date.now() - cached.at < 12 * 3600_000)) return cached?.items ?? [];
  try {
    const items = await cloud.searchTimeStats();
    setSearchStats(items);
    await saveJSON('searchStats', { at: Date.now(), items });
    return items;
  } catch {
    return cached?.items ?? [];
  }
}
