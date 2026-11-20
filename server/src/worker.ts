import { buildApp, DEFAULT_ORIGINS } from './app';
import { pgOpen } from './pgStore';

// Cloudflare Workers belépési pont. Beállítás: wrangler.toml és docs/HOSZTOLAS.md
type Env = {
  /** Supabase kapcsolat (Transaction pooler, 6543-as port). Titok: Cloudflare → Settings → Variables and Secrets */
  DATABASE_URL?: string;
  /** Opcionális Cloudflare Hyperdrive kapcsolatgyorsító; ha be van kötve, ezt használja */
  HYPERDRIVE?: { connectionString: string };
  CORS_ORIGINS?: string;
};

let cached: { key: string; app: ReturnType<typeof buildApp> } | null = null;

function appFor(env: Env) {
  const url = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  const extra = (env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const key = `${url ?? ''}|${extra.join(',')}`;
  if (!cached || cached.key !== key) {
    if (!url) console.warn('DATABASE_URL nincs megadva: memóriában tárolok (a Worker újraindulásakor elvész).');
    cached = { key, app: buildApp({ store: url ? pgOpen(url) : undefined, corsOrigins: [...DEFAULT_ORIGINS, ...extra] }) };
  }
  return cached.app;
}

export default {
  fetch: (req: Request, env: Env, ctx: unknown) => appFor(env).fetch(req, env, ctx as never),
  /** 5 percenként: lejárt és díjfizetési idő végén leálló parkolások lezárása */
  async scheduled(_event: unknown, env: Env) {
    const n = await appFor(env).closeExpired();
    if (n) console.log(`Lezárt parkolások: ${n}`);
  },
};
