import { Pool } from 'pg';
import type { SessionStore, StoredSession } from './store';

// PostgreSQL tároló (Neon, Render, Supabase vagy bármilyen Postgres). A táblát első induláskor magától létrehozza.
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

export async function pgStore(connectionString: string): Promise<SessionStore & { close(): Promise<void> }> {
  const pool = new Pool({
    connectionString,
    // A felhős Postgres-szolgáltatók TLS-t kérnek; helyi adatbázisnál nem kell
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
    max: 5,
  });
  await pool.query(SCHEMA);
  return {
    async create(s) {
      await pool.query(
        `INSERT INTO parking_sessions (id, plate, country, zone_id, zone_code, district, lat, lng, started_at, planned_minutes, auto_stop_at, stopped_at, cost)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [s.id, s.plate, s.country, s.zoneId, s.zoneCode, s.district, s.lat, s.lng, ts(s.startedAt), s.plannedMinutes, ts(s.autoStopAt), ts(s.stoppedAt), s.cost],
      );
    },
    async get(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const r = await pool.query<Row>('SELECT * FROM parking_sessions WHERE id = $1', [id]);
      return r.rows[0] ? toSession(r.rows[0]) : null;
    },
    async update(s) {
      await pool.query(
        'UPDATE parking_sessions SET planned_minutes = $2, auto_stop_at = $3, stopped_at = $4, cost = $5 WHERE id = $1',
        [s.id, s.plannedMinutes, ts(s.autoStopAt), ts(s.stoppedAt), s.cost],
      );
    },
    async all() {
      // A statisztikához az utolsó 90 nap elég
      const r = await pool.query<Row>("SELECT * FROM parking_sessions WHERE started_at > now() - interval '90 days'");
      return r.rows.map(toSession);
    },
    close: () => pool.end(),
  };
}
