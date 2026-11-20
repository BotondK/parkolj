import { buildApp } from './app';
import { pgStore } from './pgStore';
import { memoryStore } from './store';

// Indításkor TZ=Europe/Budapest kell (npm start beállítja), a díjfizetési idők helyi időben értendők.
async function main() {
  const url = process.env.DATABASE_URL;
  const store = url ? await pgStore(url) : memoryStore();
  if (!url) console.warn('DATABASE_URL nincs megadva: memóriában tárolok, újraindításkor minden elvész.');
  const extra = (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const app = buildApp({
    store,
    logger: true,
    corsOrigins: ['https://botondk.github.io', 'http://localhost:8081', 'http://localhost:19006', ...extra],
  });
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
