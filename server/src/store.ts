// Parkolások tárolója. Most memóriában; élesben PostgreSQL + PostGIS (ugyanez az interfész).
export type StoredSession = {
  id: string;
  plate: string;
  country: string;
  zoneId: string | null;
  zoneCode: string | null;
  district: string | null;
  lat: number;
  lng: number;
  startedAt: number;
  plannedMinutes: number;
  /** Ha a díjfizetés előbb ér véget, eddig fut (automatikus leállítás) */
  autoStopAt: number | null;
  stoppedAt: number | null;
  cost: number | null;
};

export interface SessionStore {
  create(s: StoredSession): Promise<void>;
  get(id: string): Promise<StoredSession | null>;
  update(s: StoredSession): Promise<void>;
  all(): Promise<StoredSession[]>;
}

export function memoryStore(): SessionStore {
  const m = new Map<string, StoredSession>();
  return {
    async create(s) {
      m.set(s.id, { ...s });
    },
    async get(id) {
      const s = m.get(id);
      return s ? { ...s } : null;
    },
    async update(s) {
      m.set(s.id, { ...s });
    },
    async all() {
      return [...m.values()].map((s) => ({ ...s }));
    },
  };
}
