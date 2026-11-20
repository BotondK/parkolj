// Parkolások tárolója: memóriában (tesztek, helyi próba) vagy PostgreSQL-ben (Supabase), ugyanazzal az interfésszel.
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
  /** Még le nem állított parkolások (az időzített lezáráshoz) */
  open(): Promise<StoredSession[]>;
}

/** Kérésenként megnyitott tároló (Cloudflare Workersben a kapcsolat nem élhet túl egy kérést). */
export type OpenStore = () => Promise<{ store: SessionStore; close(): Promise<void> }>;

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
    async open() {
      return [...m.values()].filter((s) => s.stoppedAt == null).map((s) => ({ ...s }));
    },
  };
}
