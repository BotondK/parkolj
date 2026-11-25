import { expect, test } from '@playwright/test';

// Lejárati értesítés bezárt webappnál (Web Push): indításkor ütemez, leállításkor töröl.
// A böngésző push-feliratkozását pótoljuk (a tesztböngészőben nincs push szolgáltatás); a Supabase-hívásokat elfogjuk.
// Csak akkor fut, ha a build Supabase-szel készült (CI); helyben: EXPO_PUBLIC_SUPABASE_URL=… build.
test('lejárati push: indításkor ütemez, leállításkor töröl', async ({ page }) => {
  test.skip(!process.env.CI, 'Supabase-es build kell hozzá (CI)');
  await page.addInitScript(() => {
    const sub = {
      endpoint: 'https://web.push.apple.com/teszt',
      options: { applicationServerKey: null },
      toJSON: () => ({ endpoint: 'https://web.push.apple.com/teszt', keys: { p256dh: 'B' + 'A'.repeat(86), auth: 'BTBZMqHH6r4Tts7J_aSIgg' } }),
      unsubscribe: async () => true,
    };
    const reg = { pushManager: { getSubscription: async () => null, subscribe: async () => sub } };
    Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve(reg), register: async () => reg }, configurable: true });
    (window as any).PushManager = function () {};
    (window as any).Notification = Object.assign(function () {}, { permission: 'granted', requestPermission: async () => 'granted' });
  });
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const sched: any[] = [];
  let cancelled = 0;
  await page.route('**/functions/v1/push-send', (r) => r.fulfill({ json: { publicKey: 'B' + 'A'.repeat(86) } }));
  await page.route('**/rest/v1/rpc/push_schedule', (r) => (sched.push(r.request().postDataJSON()), r.fulfill({ json: 2 })));
  await page.route('**/rest/v1/rpc/push_cancel', (r) => (cancelled++, r.fulfill({ status: 204 })));

  await page.goto('./');
  await page.getByText('Kezdjük').click();
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await page.getByText('Navigálj oda').click();
  await page.getByText(/Megérkeztem/).click();
  await page.getByText(/Fizetés és indítás|Indítás \(most/).click();
  // A demó alapból gyorsított órával fut (ilyenkor nem ütemez); valós időre váltunk
  await page.getByRole('switch', { name: /Demó/ }).click();

  await expect.poll(() => sched.length).toBeGreaterThan(0);
  const s = sched.at(-1);
  expect(s.p_endpoint).toBe('https://web.push.apple.com/teszt');
  expect(s.p_token).toMatch(/^[0-9a-f-]{36}$/);
  expect(s.p_jobs.length).toBeGreaterThan(0);
  expect(s.p_jobs.at(-1).title).toBe('Parkolj');
  // Nincs benne rendszám
  expect(JSON.stringify(s)).not.toMatch(/ABC|[A-Z]{3}-\d{3}/);

  await page.getByText('Parkolás leállítása').click();
  await expect.poll(() => cancelled).toBeGreaterThan(0);
});
