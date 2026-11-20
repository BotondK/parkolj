import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { ZONE_CODES } from '../../src/data/zoneCodes';
import { ZONES, zoneById, type ZoneId } from '../../src/data/zones';
import { districtAt, zoneAt } from '../../src/logic/geo';
import { chargeableMinutes, isCharging, paidEnd, priceWindow } from '../../src/logic/pricing';
import { recommend } from '../../src/logic/recommend';
import { bpParts } from '../../src/logic/budapestTime';
import { plateValid } from '../../src/types';
import { memoryStore, type OpenStore, type SessionStore, type StoredSession } from './store';

type Opts = {
  /** Tároló: egy példány (memória, tesztek) vagy kérésenként megnyitott kapcsolat (Workers + Postgres). */
  store?: SessionStore | OpenStore;
  now?: () => number;
  corsOrigins?: string[];
};
type Env = { Variables: { store: SessionStore } };
type Body = Record<string, unknown>;

const readBody = async (c: Context): Promise<Body> => {
  try {
    const b = await c.req.json();
    return b && typeof b === 'object' ? (b as Body) : {};
  } catch {
    return {};
  }
};

const num = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN);
const inBudapest = (lat: number, lng: number) => lat > 47.3 && lat < 47.65 && lng > 18.9 && lng < 19.35;

export const DEFAULT_ORIGINS = ['https://botondk.github.io', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:19006'];

export function buildApp(opts: Opts = {}) {
  const src = opts.store ?? memoryStore();
  const open: OpenStore = typeof src === 'function' ? src : async () => ({ store: src, close: async () => {} });
  const now = opts.now ?? Date.now;
  const app = new Hono<Env>();
  // A webes demó (GitHub Pages) és a helyi fejlesztés hívhatja
  const origins = opts.corsOrigins ?? DEFAULT_ORIGINS;
  app.use('*', cors({ origin: (o) => (origins.includes(o) ? o : null) }));
  // Adatbázis csak ott, ahol kell; a kapcsolat a kérés végén lezárul
  app.use('/v1/sessions/*', withStore);
  app.use('/v1/sessions', withStore);
  app.use('/v1/stats/*', withStore);
  async function withStore(c: Context<Env>, next: () => Promise<void>) {
    const h = await open();
    c.set('store', h.store);
    try {
      await next();
    } finally {
      await h.close();
    }
  }
  app.onError((e, c) => {
    console.error(e);
    return c.json({ error: 'Szerverhiba' }, 500);
  });

  const point = (q: Record<string, unknown>) => {
    const lat = num(q.lat);
    const lng = num(q.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inBudapest(lat, lng)) return null;
    return { lat, lng };
  };
  const bad = (msg: string) => ({ error: msg });

  /** Egy parkolás aktuális állapota: eltelt idő, díj, automatikus leállítás. */
  const view = (s: StoredSession, t = now()) => {
    const plannedEnd = s.startedAt + s.plannedMinutes * 60000;
    const end = Math.min(plannedEnd, s.autoStopAt ?? Infinity);
    const until = s.stoppedAt ?? Math.min(t, end);
    const usedMin = Math.max(0, Math.floor((until - s.startedAt) / 60000));
    const zone = s.zoneId ? zoneById(s.zoneId as ZoneId) : null;
    const cost = s.cost ?? (zone ? priceWindow(zone, new Date(s.startedAt), usedMin) : 0);
    const status = s.stoppedAt ? 'stopped' : t >= end ? (s.autoStopAt && end === s.autoStopAt ? 'auto_stopped' : 'expired') : 'active';
    return { ...s, endsAt: end, usedMinutes: usedMin, cost, status };
  };

  /** Leállítás most (vagy a lejáratkor, ha az már elmúlt), a díj rögzítésével. */
  const close = (s: StoredSession) => {
    s.stoppedAt = Math.min(now(), view(s).endsAt);
    s.cost = view(s).cost;
  };

  app.get('/health', (c) => c.json({ ok: true, storage: typeof src === 'function' ? 'postgres' : 'memory' }));

  app.get('/v1/zones', (c) => c.json({
    source: 'BKK zónalista, https://bkk.hu/downloads/43733/ (2026. július)',
    zones: ZONES.map((z) => ({
      id: z.id,
      pricePerHour: z.pricePerHour,
      maxMinutes: z.maxMinutes,
      paidHours: { workdays: z.weekdayHours, saturday: z.saturdayHours },
      surcharge: { within15Days: z.surcharge[0], after15Days: z.surcharge[1] },
      codes: ZONE_CODES[z.id].map(([code, district]) => ({ code, district })),
      chargingNow: isCharging(z, new Date(now())),
    })),
  }));

  app.get('/v1/zone-at', (c) => {
    const p = point(c.req.query());
    if (!p) return c.json(bad('lat és lng kell, Budapest területén'), 400);
    const z = zoneAt(p);
    const at = new Date(now());
    return c.json({
      district: districtAt(p),
      zone: z
        ? {
            id: z.id,
            pricePerHour: z.pricePerHour,
            maxMinutes: z.maxMinutes,
            chargingNow: isCharging(z, at),
            paidUntil: paidEnd(z, at)?.getTime() ?? null,
          }
        : null,
    });
  });

  app.get('/v1/recommend', (c) => {
    const q = c.req.query();
    const p = point(q);
    if (!p) return c.json(bad('lat és lng kell, Budapest területén'), 400);
    const minutes = Number.isFinite(num(q.minutes)) ? Math.min(600, Math.max(15, num(q.minutes))) : 120;
    const arrive = Number.isFinite(num(q.arriveAt)) ? num(q.arriveAt) : now();
    const options = recommend(p, minutes, new Date(arrive)).map((o) => ({
      kind: o.kind,
      lat: o.coord.lat,
      lng: o.coord.lng,
      zone: o.zone?.id ?? null,
      walkMinutes: o.walkMin,
      distanceM: o.distanceM,
      availability: Math.round(o.availability * 100) / 100,
      cost: o.cost,
      freeFrom: o.freeFrom ?? null,
      maxMinutes: o.maxMinutes,
      garage: o.garage ? { name: o.garage.name, pricePerHour: o.garage.pricePerHour, freeSpots: o.garage.capacity } : null,
    }));
    return c.json({ minutes, arriveAt: arrive, options, note: 'A foglaltság a prototípusban szimulált.' });
  });

  app.post('/v1/sessions', async (c) => {
    const store = c.get('store');
    const b = await readBody(c);
    const p = point(b);
    const plate = String(b.plate ?? '').trim().toUpperCase();
    const country = String(b.country ?? 'H');
    const minutes = num(b.minutes);
    if (!p) return c.json(bad('lat és lng kell, Budapest területén'), 400);
    if (!plateValid(plate, country)) return c.json(bad('Érvénytelen rendszám'), 400);
    if (!Number.isFinite(minutes) || minutes < 1) return c.json(bad('minutes kell (perc)'), 400);
    const z = zoneAt(p);
    if (!z) return c.json(bad('Ez a pont nem díjköteles terület'), 422);
    if (z.maxMinutes && minutes > z.maxMinutes)
      return c.json(bad(`Ebben a zónában legfeljebb ${z.maxMinutes} perc indítható (3 órás szabály)`), 422);
    const t = now();
    const pe = paidEnd(z, new Date(t));
    const s: StoredSession = {
      id: crypto.randomUUID(),
      plate,
      country,
      zoneId: z.id,
      zoneCode: typeof b.zoneCode === 'string' ? b.zoneCode : z.smsCode,
      district: districtAt(p),
      lat: p.lat,
      lng: p.lng,
      startedAt: t,
      plannedMinutes: minutes,
      autoStopAt: pe && pe.getTime() < t + minutes * 60000 ? pe.getTime() : null,
      stoppedAt: null,
      cost: null,
    };
    await store.create(s);
    const v = view(s, t);
    return c.json({ ...v, estimatedCost: priceWindow(z, new Date(t), minutes), chargeableMinutes: chargeableMinutes(z, new Date(t), minutes) }, 201);
  });

  app.get('/v1/sessions/:id', async (c) => {
    const s = await c.get('store').get(c.req.param('id'));
    return s ? c.json(view(s)) : c.json(bad('Nincs ilyen parkolás'), 404);
  });

  app.post('/v1/sessions/:id/extend', async (c) => {
    const store = c.get('store');
    const s = await store.get(c.req.param('id'));
    if (!s) return c.json(bad('Nincs ilyen parkolás'), 404);
    if (s.stoppedAt) return c.json(bad('A parkolás már le van állítva'), 409);
    const add = num((await readBody(c)).minutes) || 15;
    const z = s.zoneId ? zoneById(s.zoneId as ZoneId) : null;
    if (z?.maxMinutes && s.plannedMinutes + add > z.maxMinutes)
      return c.json(bad('Elérted a 3 órás maximumot ebben a zónában'), 422);
    if (now() >= view(s).endsAt) return c.json(bad('A parkolás már lejárt'), 409);
    s.plannedMinutes += add;
    await store.update(s);
    return c.json(view(s));
  });

  app.post('/v1/sessions/:id/stop', async (c) => {
    const store = c.get('store');
    const s = await store.get(c.req.param('id'));
    if (!s) return c.json(bad('Nincs ilyen parkolás'), 404);
    if (!s.stoppedAt) {
      close(s);
      await store.update(s);
    }
    return c.json(view(s));
  });

  /**
   * Anonim, összesített városi statisztika (BKK adatmegosztási pilot):
   * zónakódonként és óránként a parkolások száma és átlagos időtartama. Rendszám és pontos hely nélkül.
   * 5-nél kevesebb parkolású cellát nem ad ki (visszakövethetőség ellen).
   */
  app.get('/v1/stats/occupancy', async (c) => {
    const store = c.get('store');
    const cells = new Map<string, { zoneId: string | null; zoneCode: string | null; hour: number; n: number; minutes: number }>();
    for (const s of (await store.all()).map(view)) {
      const hour = bpParts(s.startedAt).hour;
      const key = `${s.zoneCode}|${hour}`;
      const c = cells.get(key) ?? { zoneId: s.zoneId, zoneCode: s.zoneCode, hour, n: 0, minutes: 0 };
      c.n++;
      c.minutes += s.usedMinutes;
      cells.set(key, c);
    }
    const MIN = 5;
    return c.json({
      kAnonymity: MIN,
      rows: [...cells.values()]
        .filter((c) => c.n >= MIN)
        .map((c) => ({ zoneId: c.zoneId, zoneCode: c.zoneCode, hour: c.hour, sessions: c.n, avgMinutes: Math.round(c.minutes / c.n) }))
        .sort((a, b) => (a.zoneCode ?? '').localeCompare(b.zoneCode ?? '') || a.hour - b.hour),
    });
  });

  /** Lejárt vagy a díjfizetés végén automatikusan leálló parkolások lezárása (Workers cron, 5 percenként). */
  async function closeExpired() {
    const h = await open();
    try {
      let n = 0;
      const t = now();
      for (const s of await h.store.open()) {
        if (t < view(s, t).endsAt) continue;
        close(s);
        await h.store.update(s);
        n++;
      }
      return n;
    } finally {
      await h.close();
    }
  }

  return Object.assign(app, { closeExpired });
}
