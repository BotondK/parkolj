// Névtelen hibajelentés tiszta függvényei (React Native nélkül, tesztelhető).
// Csak a hiba típusa, egy megtisztított üzenet és a kódhelyek kerülnek bele: rendszám, e-mail, szám, koordináta, URL nem.

export type CrashReport = {
  sid: string;
  at: string;
  kind: 'render' | 'global' | 'promise';
  name: string;
  message: string;
  stack: string;
  /** Ugyanaz a hiba ugyanazon a helyen ugyanazt az ujjlenyomatot kapja: így számolható, melyik a gyakori */
  fp: string;
  version: string;
  platform: string;
  lang: string;
  screen: string;
};

export const MAX_CRASHES = 20;

/** Személyes vagy pontos adat kiszűrése a hibaüzenetből */
export function scrubMessage(msg: string): string {
  return String(msg ?? '')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<email>')
    .replace(/\b[A-Z]{2,4}[- ]?\d{2,3}\b/g, '<rsz>')
    .replace(/-?\d+[.,]\d{3,}/g, '<n>')
    .replace(/\d{4,}/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/** Csak a fájlnév, sor és függvénynév marad (elérési út és lekérdezés nélkül), legfeljebb 6 sor */
export function scrubStack(stack: string | undefined): string {
  if (!stack) return '';
  const out: string[] = [];
  for (const line of stack.split('\n')) {
    const loc = line.match(/([\w.-]+\.(?:js|tsx?|bundle))(?:\?[^:\s]*)?:(\d+)(?::\d+)?\)?\s*$/);
    if (!loc) continue;
    const fnm = line.match(/^\s*at\s+([\w$.<>\[\] ]+?)\s+\(/) || line.match(/^\s*([\w$.<>]+)@/);
    const fn = (fnm?.[1] ?? '').trim().slice(0, 40);
    out.push(`${fn ? fn + ' ' : ''}${loc[1].replace(/-[0-9a-f]{16,}/, '')}:${loc[2]}`);
    if (out.length >= 6) break;
  }
  return out.join('\n').slice(0, 600);
}

/** Rövid, stabil ujjlenyomat (FNV-1a) a hiba nevéből, a számok nélküli üzenetből és az első kódhelyből */
export function fingerprint(name: string, message: string, stack: string): string {
  const s = `${name}|${message.replace(/<\w+>|\d+/g, '#')}|${stack.split('\n')[0] ?? ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function buildCrash(err: unknown, ctx: { sid: string; kind: CrashReport['kind']; version: string; platform: string; lang: string; screen: string; now?: Date }): CrashReport {
  const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Ismeretlen hiba');
  const name = (e.name || 'Error').replace(/[^\w]/g, '').slice(0, 40) || 'Error';
  const message = scrubMessage(e.message);
  const stack = scrubStack(e.stack);
  return {
    sid: ctx.sid,
    at: (ctx.now ?? new Date()).toISOString(),
    kind: ctx.kind,
    name,
    message,
    stack,
    fp: fingerprint(name, message, stack),
    version: ctx.version.slice(0, 20),
    platform: ctx.platform.slice(0, 10),
    lang: ctx.lang.slice(0, 5),
    screen: ctx.screen.replace(/[^\w-]/g, '').slice(0, 20),
  };
}

/** Sorba tesz; ugyanaz az ujjlenyomat egy alkalmon belül csak egyszer (ne árassza el egy ismétlődő hiba) */
export function enqueueCrash(queue: CrashReport[], c: CrashReport): CrashReport[] {
  if (queue.some((q) => q.fp === c.fp && q.sid === c.sid)) return queue;
  return [...queue, c].slice(-MAX_CRASHES);
}
