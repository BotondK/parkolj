// Supabase Edge Function: lejárati értesítések kiküldése a webappnak (Web Push), akkor is, ha az app be van zárva.
// GET  → a VAPID nyilvános kulcs (ezzel iratkozik fel az app)
// POST → kiküldi az esedékes értesítéseket (percenként a pg_cron hívja, lásd .github/workflows/supabase-telepites.yml)
// Titkok (a telepítő állítja be): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY. A SUPABASE_URL és SUPABASE_SERVICE_ROLE_KEY
// a Supabase-ben magától megvan; a service_role kulcs csak itt, a szerveren van, az appba soha nem kerül.
import { sendPush, type KeyPair } from '../_shared/webpush.ts';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Job = { id: number; endpoint: string; p256dh: string; auth: string; title: string; body: string; send_at: string };

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const vapid: KeyPair = { publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '', privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '' };
  if (!vapid.publicKey || !vapid.privateKey) return json({ error: 'nincs beállítva' }, 503);
  if (req.method === 'GET') return json({ publicKey: vapid.publicKey });
  if (req.method !== 'POST') return json({ error: 'csak GET vagy POST' }, 405);

  const subject = Deno.env.get('VAPID_SUBJECT') || 'https://botondk.github.io/parkolj/';
  const jobs = await rpc<Job[]>('push_take_due');
  let sent = 0, gone = 0, failed = 0;
  for (const j of jobs ?? []) {
    // Ha a küldés egy órát késett (pl. leállás), már nem küldjük ki: elavult figyelmeztetés többet árt, mint használ
    if (Date.now() - Date.parse(j.send_at) > 3600_000) continue;
    try {
      const status = await sendPush({ endpoint: j.endpoint, p256dh: j.p256dh, auth: j.auth }, JSON.stringify({ title: j.title, body: j.body, tag: 'parkolj-lejarat' }), vapid, subject);
      if (status === 404 || status === 410) {
        gone++;
        await rpc('push_forget', { p_endpoint: j.endpoint }).catch(() => null);
      } else if (status >= 200 && status < 300) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return json({ sent, gone, failed });
});
