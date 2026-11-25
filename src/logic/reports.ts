// Jelzések küldése sorral: ha nincs kapcsolat vagy fiókszerver, a készüléken marad, és később megy el.
import { cloud } from './cloud';
import { enqueueReport, setHotspots, setSearchStats, type Hotspot, type SearchStat, type SpotReport } from './reportCore';
import { loadJSON, saveJSON } from './storage';

export async function sendReport(r: SpotReport | null): Promise<'sent' | 'queued' | 'invalid'> {
  if (!r) return 'invalid';
  const q = enqueueReport(await loadJSON<SpotReport[]>('reportQueue', []), r);
  const left = await flushReports(q);
  return left.length ? 'queued' : 'sent';
}

export async function flushReports(q?: SpotReport[]): Promise<SpotReport[]> {
  const queue = q ?? (await loadJSON<SpotReport[]>('reportQueue', []));
  let left = queue;
  if (cloud && queue.length) {
    try {
      await cloud.sendReports(queue);
      left = [];
    } catch (e) {
      // Elutasított (hibás) jelzés: eldobjuk. A 404 (még nincs tábla a szerveren) után megtartjuk, és később újra próbáljuk.
      const status = (e as { status?: number })?.status ?? 0;
      if (status >= 400 && status < 500 && status !== 404) left = [];
    }
  }
  await saveJSON('reportQueue', left);
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
