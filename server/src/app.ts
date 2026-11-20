import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZONE_CODES } from '../../src/data/zoneCodes';
import { ZONES, zoneById, type ZoneId } from '../../src/data/zones';
import { districtAt, zoneAt } from '../../src/logic/geo';
import { chargeableMinutes, isCharging, paidEnd, priceWindow } from '../../src/logic/pricing';
import { recommend } from '../../src/logic/recommend';
import { plateValid } from '../../src/types';
import { memoryStore, type SessionStore, type StoredSession } from './store';

type Opts = { store?: SessionStore; now?: () => number; logger?: boolean; corsOrigins?: string[] };

const num = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN);
const inBudapest = (lat: number, lng: number) => lat > 47.3 && lat < 47.65 && lng > 18.9 && lng < 19.35;

export function buildApp(opts: Opts = {}): FastifyInstance {
  const store = opts.store ?? memoryStore();
  const now = opts.now ?? Date.now;
  const app = Fastify({ logger: opts.logger ?? false });
  // A webes demó (GitHub Pages) és a helyi fejlesztés hívhatja
  app.register(cors, { origin: opts.corsOrigins ?? ['https://botondk.github.io', /^http:\/\/localhost(:\d+)?$/] });

  const point = (q: Record<string, unknown>) => {
    const lat = num(q.lat);
    const lng = num(q.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inBudapest(lat, lng)) return null;
    return { lat, lng };
  };
  const bad = (msg: string) => ({ error: msg });

  /** Egy parkolás aktuális állapota: eltelt idő, díj, automatikus leállítás. */
  const view = (s: StoredSession) => {
    const t = now();
    const plannedEnd = s.startedAt + s.plannedMinutes * 60000;
    const end = Math.min(plannedEnd, s.autoStopAt ?? Infinity);
    const until = s.stoppedAt ?? Math.min(t, end);
    const usedMin = Math.max(0, Math.floor((until - s.startedAt) / 60000));
    const zone = s.zoneId ? zoneById(s.zoneId as ZoneId) : null;
    const cost = s.cost ?? (zone ? priceWindow(zone, new Date(s.startedAt), usedMin) : 0);
    const status = s.stoppedAt ? 'stopped' : t >= end ? (s.autoStopAt && end === s.autoStopAt ? 'auto_stopped' : 'expired') : 'active';
    return { ...s, endsAt: end, usedMinutes: usedMin, cost, status };
  };

  app.get('/health', async () => ({ ok: true, storage: opts.store ? 'external' : 'memory' }));

  app.get('/v1/zones', async () => ({
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

  app.get('/v1/zone-at', async (req, reply) => {
    const p = point(req.query as Record<string, unknown>);
    if (!p) return reply.code(400).send(bad('lat és lng kell, Budapest területén'));
    const z = zoneAt(p);
    const at = new Date(now());
    return {
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
    };
  });

  app.get('/v1/recommend', async (req, reply) => {
    const q = req.query as Record<string, unknown>;
    const p = point(q);
    if (!p) return reply.code(400).send(bad('lat és lng kell, Budapest területén'));
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
    return { minutes, arriveAt: arrive, options, note: 'A foglaltság a prototípusban szimulált.' };
  });

  app.post('/v1/sessions', async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const p = point(b);
    const plate = String(b.plate ?? '').trim().toUpperCase();
    const country = String(b.country ?? 'H');
    const minutes = num(b.minutes);
    if (!p) return reply.code(400).send(bad('lat és lng kell, Budapest területén'));
    if (!plateValid(plate, country)) return reply.code(400).send(bad('Érvénytelen rendszám'));
    if (!Number.isFinite(minutes) || minutes < 1) return reply.code(400).send(bad('minutes kell (perc)'));
    const z = zoneAt(p);
    if (!z) return reply.code(422).send(bad('Ez a pont nem díjköteles terület'));
    if (z.maxMinutes && minutes > z.maxMinutes)
      return reply.code(422).send(bad(`Ebben a zónában legfeljebb ${z.maxMinutes} perc indítható (3 órás szabály)`));
    const t = now();
    const pe = paidEnd(z, new Date(t));
    const s: StoredSession = {
      id: randomUUID(),
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
    const v = view(s);
    return reply.code(201).send({ ...v, estimatedCost: priceWindow(z, new Date(t), minutes), chargeableMinutes: chargeableMinutes(z, new Date(t), minutes) });
  });

  app.get('/v1/sessions/:id', async (req, reply) => {
    const s = await store.get((req.params as { id: string }).id);
    return s ? view(s) : reply.code(404).send(bad('Nincs ilyen parkolás'));
  });

  app.post('/v1/sessions/:id/extend', async (req, reply) => {
    const s = await store.get((req.params as { id: string }).id);
    if (!s) return reply.code(404).send(bad('Nincs ilyen parkolás'));
    if (s.stoppedAt) return reply.code(409).send(bad('A parkolás már le van állítva'));
    const add = num(((req.body ?? {}) as Record<string, unknown>).minutes) || 15;
    const z = s.zoneId ? zoneById(s.zoneId as ZoneId) : null;
    if (z?.maxMinutes && s.plannedMinutes + add > z.maxMinutes)
      return reply.code(422).send(bad('Elérted a 3 órás maximumot ebben a zónában'));
    s.plannedMinutes += add;
    await store.update(s);
    return view(s);
  });

  app.post('/v1/sessions/:id/stop', async (req, reply) => {
    const s = await store.get((req.params as { id: string }).id);
    if (!s) return reply.code(404).send(bad('Nincs ilyen parkolás'));
    if (!s.stoppedAt) {
      const v = view(s);
      s.stoppedAt = Math.min(now(), v.endsAt);
      s.cost = view(s).cost;
      await store.update(s);
    }
    return view(s);
  });

  /**
   * Anonim, összesített városi statisztika (BKK adatmegosztási pilot):
   * zónakódonként és óránként a parkolások száma és átlagos időtartama. Rendszám és pontos hely nélkül.
   * 5-nél kevesebb parkolású cellát nem ad ki (visszakövethetőség ellen).
   */
  app.get('/v1/stats/occupancy', async () => {
    const cells = new Map<string, { zoneId: string | null; zoneCode: string | null; hour: number; n: number; minutes: number }>();
    for (const s of (await store.all()).map(view)) {
      const hour = new Date(s.startedAt).getHours();
      const key = `${s.zoneCode}|${hour}`;
      const c = cells.get(key) ?? { zoneId: s.zoneId, zoneCode: s.zoneCode, hour, n: 0, minutes: 0 };
      c.n++;
      c.minutes += s.usedMinutes;
      cells.set(key, c);
    }
    const MIN = 5;
    return {
      kAnonymity: MIN,
      rows: [...cells.values()]
        .filter((c) => c.n >= MIN)
        .map((c) => ({ zoneId: c.zoneId, zoneCode: c.zoneCode, hour: c.hour, sessions: c.n, avgMinutes: Math.round(c.minutes / c.n) }))
        .sort((a, b) => (a.zoneCode ?? '').localeCompare(b.zoneCode ?? '') || a.hour - b.hour),
    };
  });

  return app;
}
