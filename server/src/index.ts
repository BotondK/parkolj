import { serve } from '@hono/node-server';
import { buildApp, DEFAULT_ORIGINS } from './app';
import { pgStore } from './pgStore';

// Helyi futtatás Node-on (npm run dev). Élesben a Cloudflare Worker fut: src/worker.ts
async function main() {
  const url = process.env.DATABASE_URL;
  const store = url ? await pgStore(url) : undefined;
  if (!url) console.warn('DATABASE_URL nincs megadva: memóriában tárolok, újraindításkor minden elvész.');
  const extra = (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const app = buildApp({ store, corsOrigins: [...DEFAULT_ORIGINS, ...extra] });
  setInterval(() => app.closeExpired().catch(console.error), 5 * 60000);
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => console.log(`Parkolj API: http://localhost:${port}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
