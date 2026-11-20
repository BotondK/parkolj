import pg from 'pg';
import type { OpenStore, SessionStore, StoredSession } from './store';

const { Client, Pool } = pg;

// PostgreSQL tároló (Supabase vagy bármilyen Postgres). A táblát első induláskor magától létrehozza.
// Később: PostGIS geography oszlop a térbeli lekérdezésekhez (közeli parkolások, foglaltsági hőtérkép).
const SCHEMA = `
CREATE TABLE IF NOT EXISTS parking_sessions (
  id              uuid PRIMARY KEY,
  plate           text NOT NULL,
  country         text NOT NULL,
  zone_id         text,
  zone_code       text,
  district        text,
  lat             double precision NOT NULL,
  lng             double precision NOT NULL,
  started_at      timestamptz NOT NULL,
  planned_minutes integer NOT NULL,
  auto_stop_at    timestamptz,
  stopped_at      timestamptz,
  cost            integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parking_sessions_started_idx ON parking_sessions (started_at);
CREATE INDEX IF NOT EXISTS parking_sessions_zone_code_idx ON parking_sessions (zone_code);
-- Supabase: a tábla ne legyen olvasható a nyilvános REST API-n (anon kulcs). A szerver a postgres szerepkörrel kapcsolódik, arra ez nem vonatkozik.
ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;
`;

type Row = {
  id: string; plate: string; country: string; zone_id: string | null; zone_code: string | null; district: string | null;
  lat: number; lng: number; started_at: Date; planned_minutes: number; auto_stop_at: Date | null; stopped_at: Date | null; cost: number | null;
};

const toSession = (r: Row): StoredSession => ({
  id: r.id,
  plate: r.plate,
  country: r.country,
  zoneId: r.zone_id,
  zoneCode: r.zone_code,
  district: r.district,
  lat: r.lat,
  lng: r.lng,
  startedAt: r.started_at.getTime(),
  plannedMinutes: r.planned_minutes,
  autoStopAt: r.auto_stop_at?.getTime() ?? null,
  stoppedAt: r.stopped_at?.getTime() ?? null,
  cost: r.cost,
});

const ts = (ms: number | null) => (ms == null ? null : new Date(ms));

const ssl = (url: string) => (/localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false });

/** SQL-futtató: egy kapcsolat (Workers: kérésenként) vagy pool (Node). */
type Q = { query<R extends object = Row>(sql: string, params?: unknown[]): Promise<{ rows: R[] }> };

function storeOn(db: Q): SessionStore {
  return {
    async create(s) {
      await db.query(
        `INSERT INTO parking_sessions (id, plate, country, zone_id, zone_code, district, lat, lng, started_at, planned_minutes, auto_stop_at, stopped_at, cost)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [s.id, s.plate, s.country, s.zoneId, s.zoneCode, s.district, s.lat, s.lng, ts(s.startedAt), s.plannedMinutes, ts(s.autoStopAt), ts(s.stoppedAt), s.cost],
      );
    },
    async get(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const r = await db.query('SELECT * FROM parking_sessions WHERE id = $1', [id]);
      return r.rows[0] ? toSession(r.rows[0]) : null;
    },
    async update(s) {
      await db.query(
        'UPDATE parking_sessions SET planned_minutes = $2, auto_stop_at = $3, stopped_at = $4, cost = $5 WHERE id = $1',
        [s.id, s.plannedMinutes, ts(s.autoStopAt), ts(s.stoppedAt), s.cost],
      );
    },
    async all() {
      // A statisztikához az utolsó 90 nap elég
      const r = await db.query("SELECT * FROM parking_sessions WHERE started_at > now() - interval '90 days'");
      return r.rows.map(toSession);
    },
    async open() {
      const r = await db.query("SELECT * FROM parking_sessions WHERE stopped_at IS NULL AND started_at > now() - interval '2 days'");
      return r.rows.map(toSession);
    },
  };
}

let schemaReady: Promise<void> | null = null;

/**
 * Kérésenkénti kapcsolat (Cloudflare Workers + Supabase pooler vagy Hyperdrive).
 * A táblát az első kéréskor magától létrehozza.
 */
export function pgOpen(connectionString: string): OpenStore {
  return async () => {
    const client = new Client({ connectionString, ssl: ssl(connectionString) });
    await client.connect();
    try {
      schemaReady ??= client.query(SCHEMA).then(() => undefined);
      await schemaReady;
    } catch (e) {
      schemaReady = null;
      await client.end().catch(() => {});
      throw e;
    }
    return { store: storeOn(client as unknown as Q), close: () => client.end().catch(() => {}) };
  };
}

/** Node (helyi futtatás, tesztek): egy közös pool. */
export async function pgStore(connectionString: string): Promise<SessionStore & { close(): Promise<void> }> {
  const pool = new Pool({ connectionString, ssl: ssl(connectionString), max: 5 });
  await pool.query(SCHEMA);
  return { ...storeOn(pool as unknown as Q), close: () => pool.end() };
}
