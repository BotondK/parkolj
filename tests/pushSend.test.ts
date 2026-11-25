import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeys } from '../supabase/functions/_shared/webpush';

// A Supabase Edge Function (Deno) futtatása Node-ban: Deno.env és Deno.serve helyett egyszerű pótlás, a hálózat elfogva.
test('push-send: kulcs lekérése, esedékes értesítések kiküldése, megszűnt feliratkozás törlése', async () => {
  const vapid = await generateKeys();
  const sub = await generateKeys();
  const env: Record<string, string> = { VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv' };
  let handler: (r: Request) => Promise<Response> = async () => new Response();
  (globalThis as any).Deno = { env: { get: (k: string) => env[k] }, serve: (h: typeof handler) => (handler = h) };
  const calls: { url: string; headers: Headers; body?: any }[] = [];
  const now = new Date().toISOString();
  const jobs = [
    { id: 1, endpoint: 'https://fcm.googleapis.com/fcm/send/aaa', p256dh: sub.publicKey, auth: 'BTBZMqHH6r4Tts7J_aSIgg', title: 'Parkolj', body: '10 perc múlva lejár', send_at: now },
    { id: 2, endpoint: 'https://web.push.apple.com/gone', p256dh: sub.publicKey, auth: 'BTBZMqHH6r4Tts7J_aSIgg', title: 'Parkolj', body: 'Lejárt', send_at: now },
    { id: 3, endpoint: 'https://web.push.apple.com/late', p256dh: sub.publicKey, auth: 'BTBZMqHH6r4Tts7J_aSIgg', title: 'Parkolj', body: 'régi', send_at: new Date(Date.now() - 2 * 3600_000).toISOString() },
  ];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const h = new Headers(init.headers);
    calls.push({ url, headers: h, body: init.body });
    if (url.endsWith('/rpc/push_take_due')) return new Response(JSON.stringify(jobs), { status: 200 });
    if (url.endsWith('/rpc/push_forget')) return new Response(null, { status: 204 });
    if (url.includes('/gone')) return new Response('', { status: 410 });
    return new Response('', { status: 201 });
  }) as typeof fetch;
  try {
    await import('../supabase/functions/push-send/index.ts');
    const key = await (await handler(new Request('https://x/functions/v1/push-send'))).json();
    assert.deepEqual(key, { publicKey: vapid.publicKey });
    const res = await (await handler(new Request('https://x/functions/v1/push-send', { method: 'POST' }))).json();
    assert.deepEqual(res, { sent: 1, gone: 1, failed: 0 });
    const push = calls.find((c) => c.url.includes('fcm.googleapis.com'))!;
    assert.equal(push.headers.get('content-encoding'), 'aes128gcm');
    assert.match(push.headers.get('authorization')!, /^vapid t=.+, k=/);
    assert.ok(!calls.some((c) => c.url.includes('/late')), 'a több mint egy órát késett értesítés nem megy ki');
    const forget = calls.find((c) => c.url.endsWith('/rpc/push_forget'))!;
    assert.deepEqual(JSON.parse(forget.body), { p_endpoint: 'https://web.push.apple.com/gone' });
    assert.equal(calls.find((c) => c.url.endsWith('/rpc/push_take_due'))!.headers.get('apikey'), 'srv');
  } finally {
    globalThis.fetch = realFetch;
  }
});
