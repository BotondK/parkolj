import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeCloud, mergeData, freshSession, type AuthSession } from '../src/logic/cloud';

const cfg = { url: 'https://x.supabase.co', anonKey: 'anon' };
const fake = (responses: Record<string, unknown>, log: { url: string; init: RequestInit }[]) =>
  (async (url: string, init: RequestInit) => {
    log.push({ url, init });
    const key = Object.keys(responses).find((k) => url.includes(k));
    const body = key ? responses[key] : null;
    const status = body && typeof body === 'object' && 'status' in (body as object) ? (body as { status: number }).status : 200;
    return new Response(body ? JSON.stringify(body) : '', { status });
  }) as unknown as typeof fetch;

const sess: AuthSession = { accessToken: 'tok', refreshToken: 'ref', expiresAt: Date.now() + 3600_000, userId: 'u1', email: 'a@b.hu' };

test('felhő: kódküldés, belépés, mentés a megfelelő végpontokra és fejlécekkel', async () => {
  const log: { url: string; init: RequestInit }[] = [];
  const c = makeCloud(cfg, fake({ '/auth/v1/verify': { access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: { id: 'u1', email: 'a@b.hu' } } }, log));
  await c.sendCode('a@b.hu');
  assert.equal(log[0].url, 'https://x.supabase.co/auth/v1/otp');
  assert.deepEqual(JSON.parse(log[0].init.body as string), { email: 'a@b.hu', create_user: true });
  const s = await c.verifyCode('a@b.hu', '123456');
  assert.equal(s.userId, 'u1');
  assert.ok(s.expiresAt > Date.now());
  await c.save(s, { cars: [] });
  const save = log[2];
  assert.match(save.url, /\/rest\/v1\/user_data\?on_conflict=user_id$/);
  const h = save.init.headers as Record<string, string>;
  assert.equal(h.Authorization, 'Bearer tok');
  assert.equal(h.apikey, 'anon');
  assert.match(h.Prefer, /merge-duplicates/);
});

test('felhő: hibás kódnál hibát dob', async () => {
  const c = makeCloud(cfg, fake({ '/auth/v1/verify': { status: 403, msg: 'Token has expired or is invalid' } }, []));
  await assert.rejects(() => c.verifyCode('a@b.hu', '000000'), /expired/);
});

test('felhő: lejárás előtt frissíti a tokent', async () => {
  const log: { url: string; init: RequestInit }[] = [];
  const c = makeCloud(cfg, fake({ grant_type: { access_token: 'új', refresh_token: 'r2', expires_in: 3600, user: { id: 'u1', email: 'a@b.hu' } } }, log));
  assert.equal(await freshSession(c, sess), sess);
  const s2 = await freshSession(c, { ...sess, expiresAt: Date.now() + 10_000 });
  assert.equal(s2.accessToken, 'új');
});

test('összefésülés belépéskor: unió azonosító szerint, ütközésnél a felhő nyer, demó autó kimarad', () => {
  const m = mergeData(
    {
      name: 'Helyi',
      cars: [{ id: 'demo', plate: 'ABC-123', country: 'H' }, { id: 'c2', plate: 'XYZ-999', country: 'H' }],
      favorites: [{ id: 'home', slot: 'home', label: 'Otthon', name: 'régi', address: '', lat: 1, lng: 1 }],
      settings: { remindMin: 5, helpBar: false },
    },
    {
      cars: [{ id: 'c1', plate: 'AA-BB-123', country: 'H' }],
      favorites: [{ id: 'home', slot: 'home', label: 'Otthon', name: 'új', address: '', lat: 2, lng: 2 }],
      settings: { remindMin: 15 },
    },
  );
  assert.deepEqual(m.cars?.map((c) => c.id), ['c1', 'c2']);
  assert.equal(m.favorites?.length, 1);
  assert.equal(m.favorites?.[0].name, 'új');
  assert.deepEqual(m.settings, { remindMin: 15, helpBar: false });
  assert.equal(m.name, 'Helyi');
});

test('felhő: visszajelzés küldése belépés nélkül (csak apikey)', async () => {
  const log: { url: string; init: RequestInit }[] = [];
  const c = makeCloud(cfg, fake({}, log));
  await c.sendFeedback({ at: 0, rating: 4, message: 'jó', meta: { platform: 'web' } });
  assert.equal(log[0].url, 'https://x.supabase.co/rest/v1/feedback');
  assert.equal((log[0].init.headers as Record<string, string>).Authorization, undefined);
  const b = JSON.parse(log[0].init.body as string);
  assert.equal(b.rating, 4);
  assert.equal(b.meta.platform, 'web');
});

test('felhő: belépő link – visszairányítási cím, majd munkamenet az URL-ből', async () => {
  const log: { url: string; init: RequestInit }[] = [];
  const c = makeCloud(cfg, fake({ '/auth/v1/user': { id: 'u9', email: 'x@y.hu' } }, log));
  await c.sendCode('x@y.hu', 'https://botondk.github.io/parkolj/');
  assert.equal(log[0].url, 'https://x.supabase.co/auth/v1/otp?redirect_to=https%3A%2F%2Fbotondk.github.io%2Fparkolj%2F');
  const s = await c.sessionFromUrl('#access_token=AT&expires_in=3600&refresh_token=RT&token_type=bearer&type=magiclink');
  assert.ok(s && !('error' in s));
  if (s && !('error' in s)) {
    assert.equal(s.userId, 'u9');
    assert.equal(s.refreshToken, 'RT');
  }
  assert.equal((log[1].init.headers as Record<string, string>).Authorization, 'Bearer AT');
  assert.deepEqual(await c.sessionFromUrl('#error=access_denied&error_description=Email+link+is+invalid+or+has+expired'), { error: 'Email link is invalid or has expired' });
  assert.equal(await c.sessionFromUrl(''), null);
});

test('Supabase URL elnéző beolvasása', async () => {
  const { normalizeSupabaseUrl: n } = await import('../src/logic/cloud');
  const want = 'https://mnpbboufqvhbhxiquaiy.supabase.co';
  assert.equal(n('mnpbboufqvhbhxiquaiy.supabase.co'), want);
  assert.equal(n(' https://mnpbboufqvhbhxiquaiy.supabase.co/ '), want);
  assert.equal(n('mnpbboufqvhbhxiquaiy'), want);
  assert.equal(n('https://mnpbboufqvhbhxiquaiy.supabase.co/rest/v1/'), want);
  assert.equal(n('https://supabase.com/dashboard/project/mnpbboufqvhbhxiquaiy/auth/templates'), want);
  assert.equal(n(''), '');
});

test('új formátumú (sb_publishable_) kulcs nem kerül az Authorization fejlécbe', async () => {
  const log: { url: string; init: RequestInit }[] = [];
  const c = makeCloud({ url: 'https://x.supabase.co', anonKey: 'sb_publishable_abc' }, fake({}, log));
  await c.sendCode('a@b.hu');
  const h = log[0].init.headers as Record<string, string>;
  assert.equal(h.apikey, 'sb_publishable_abc');
  assert.equal(h.Authorization, undefined);
});
