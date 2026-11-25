import assert from 'node:assert/strict';
import { test } from 'node:test';
import { b64u, encryptPayload, generateKeys, unb64u, vapidAuth } from '../supabase/functions/_shared/webpush';
import { expiryPlan } from '../src/logic/pushPlan';

test('Web Push titkosítás: pontosan az RFC 8291 példája', async () => {
  const out = await encryptPayload('When I grow up, I want to be a watermelon', 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', 'BTBZMqHH6r4Tts7J_aSIgg', {
    salt: 'DGv6ra1nlYgDCS1FRnbzlw',
    keys: { publicKey: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8', privateKey: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw' },
  });
  assert.equal(
    b64u(out),
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
  );
});

test('Web Push: véletlen só és kulcs, más-más eredmény', async () => {
  const sub = await generateKeys();
  const a = await encryptPayload('x', sub.publicKey, 'BTBZMqHH6r4Tts7J_aSIgg');
  const b = await encryptPayload('x', sub.publicKey, 'BTBZMqHH6r4Tts7J_aSIgg');
  assert.notEqual(b64u(a), b64u(b));
  assert.equal(a[20], 65, 'a fejlécben a küldő 65 bájtos kulcsa');
});

test('VAPID: érvényes ES256 aláírás, a push szolgáltatás címére', async () => {
  const v = await generateKeys();
  const h = await vapidAuth('https://web.push.apple.com/QGx…', 'https://botondk.github.io/parkolj/', v, Date.UTC(2026, 10, 25));
  const m = h.match(/^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/);
  assert.ok(m, h);
  assert.equal(m![4], v.publicKey);
  const claims = JSON.parse(new TextDecoder().decode(unb64u(m![2])));
  assert.equal(claims.aud, 'https://web.push.apple.com');
  assert.equal(claims.exp, Date.UTC(2026, 10, 25) / 1000 + 12 * 3600);
  const pub = unb64u(v.publicKey);
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33)) }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unb64u(m![3]), new TextEncoder().encode(`${m![1]}.${m![2]}`));
  assert.ok(ok);
});

test('lejárati értesítések időpontjai: a múltbeli kimarad', () => {
  const now = Date.UTC(2026, 10, 25, 10);
  const end = now + 30 * 60000;
  assert.deepEqual(
    expiryPlan(end, 'hamarosan', 'lejárt', 'Parkolj', 10, now).map((p) => [p.at - now, p.body]),
    [
      [20 * 60000, 'hamarosan'],
      [30 * 60000, 'lejárt'],
    ],
  );
  assert.equal(expiryPlan(now + 5 * 60000, 'h', 'l', 'P', 10, now).length, 1);
  assert.equal(expiryPlan(now - 1, 'h', 'l', 'P', 10, now).length, 0);
});
