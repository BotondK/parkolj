// A statisztika tiszta függvényei (React Native nélkül, tesztelhető).
export const EVENT_NAMES = ['app_open', 'dest_selected', 'here_selected', 'navigate', 'start', 'extend', 'auto_extend', 'stop', 'sms_open', 'plus_subscribe', 'feedback'] as const;
export type EventName = (typeof EVENT_NAMES)[number];
export type StatEvent = { sid: string; name: EventName; at: string; lang: string; platform: string; props: Record<string, string | number | boolean> };

export const MAX_QUEUE = 200;
/** Csak egyszerű, rövid kategóriaértékek mehetnek (szabad szöveg, hosszú érték nem) */
export function cleanProps(p: Record<string, unknown> = {}) {
  const out: StatEvent['props'] = {};
  for (const [k, v] of Object.entries(p).slice(0, 6)) {
    if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && v.length <= 24) out[k] = v;
  }
  return out;
}

export function enqueue(queue: StatEvent[], e: StatEvent) {
  return [...queue, e].slice(-MAX_QUEUE);
}

