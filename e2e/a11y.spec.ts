import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openMenu } from './menu';

// Akadálymentességi vizsgálat (WCAG 2.1 A/AA) a fő képernyőkön. A térkép vásznát kihagyjuk (külön szöveges lista van).
const scan = async (page: Page, name: string) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').analyze();
  const v = r.violations.map((x) => `${name}: ${x.id} (${x.impact}) ×${x.nodes.length} → ${x.nodes.slice(0, 4).map((n) => (x.id === 'label' ? n.html.slice(0, 200) : x.id === 'color-contrast' ? `"${(n.html.match(/>([^<]{1,40})</) || [])[1] ?? n.html.slice(0, 60)}" ${n.any[0]?.message.match(/contrast of [\d.]+ \(foreground color: #\w+, background color: #\w+/)?.[0]}` : n.target.join(' '))).join(' | ')}`);
  return v;
};

test('akadálymentesség: fő képernyők', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./');
  const all: string[] = [];
  all.push(...(await scan(page, 'bemutató')));
  await page.getByText('Kezdjük').click();
  all.push(...(await scan(page, 'parkolás')));
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  all.push(...(await scan(page, 'javaslatok')));
  await page.getByText('Navigálj oda').click();
  await page.getByText(/Megérkeztem/).click();
  all.push(...(await scan(page, 'fizetés')));
  await page.getByText(/Fizetés és indítás|Indítás \(most/).click();
  all.push(...(await scan(page, 'aktív')));
  await page.getByRole('tab', { name: 'Parkolásaim' }).click();
  all.push(...(await scan(page, 'parkolásaim')));
  await page.getByRole('tab', { name: 'Kedvenceim' }).click();
  all.push(...(await scan(page, 'kedvencek')));
  await openMenu(page);
  all.push(...(await scan(page, 'menü')));
  for (const p of ['Beállítások', 'Widgetek', 'Parkolj Plusz', 'Vásárlás és fizetés', 'Visszajelzés küldése', 'Hibabejelentés', 'Névjegy', 'Fiók']) {
    const row = page.getByText(p, { exact: true }).first();
    if (!(await row.isVisible().catch(() => false))) continue;
    await row.click();
    all.push(...(await scan(page, p)));
    // Vissza a menübe: telefonon a Menü fül kétszer (főoldal), asztalon újra a lenyíló menü
    if ((page.viewportSize()?.width ?? 0) >= 900) await openMenu(page);
    else {
      await page.getByRole('tab', { name: 'Menü' }).click();
      await page.getByRole('tab', { name: 'Menü' }).click();
    }
  }
  console.log(all.join('\n'));
  expect(all).toEqual([]);
});

test('Városnak oldal: mintaadat, szűrő, CSV, akadálymentes', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./?varos');
  await expect(page.getByText('Parkolj – adatok a városnak')).toBeVisible();
  await expect(page.getByText(/Mintaadat/).first()).toBeVisible();
  await expect(page.getByTestId('nospace-card')).toContainText('Hol nem találnak helyet?');
  await expect(page.getByTestId('nospace-card')).toContainText('9 jelzés');
  await page.getByRole('radio', { name: 'Hétvége' }).click();
  await expect(page.getByRole('radio', { name: 'Hétvége' })).toBeChecked();
  await page.getByLabel(/A zóna, 19:00–20:00/).click();
  await expect(page.getByText(/^A zóna, 19:00–20:00: \d+ parkolás$/)).toBeVisible();
  const dl = page.waitForEvent('download');
  await page.getByText('CSV letöltése').click();
  expect((await dl).suggestedFilename()).toBe('parkolj-varosi-adatok-minta.csv');
  expect(await scan(page, 'városnak')).toEqual([]);
});

test('Béta jelentkezés: ellenőrzés, hozzájárulás, beküldés, akadálymentes', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const box: { sent?: Record<string, string> } = {};
  await page.route('**/rest/v1/rpc/beta_signup', (r) => {
    box.sent = r.request().postDataJSON();
    return r.fulfill({ status: 204, body: '' });
  });
  await page.goto('./?beta&lang=hu');
  await expect(page.getByRole('heading', { name: 'Légy béta tesztelő' })).toBeVisible();
  expect(await scan(page, 'béta')).toEqual([]);
  await page.getByText('Jelentkezem').click();
  await expect(page.getByText('Adj meg egy érvényes e-mail címet.')).toBeVisible();
  await page.getByLabel('E-mail cím').fill('  Teszt.Elek@Pelda.hu ');
  await page.getByRole('radio', { name: 'Android' }).click();
  await page.getByRole('radio', { name: 'Hetente' }).click();
  await page.getByRole('radio', { name: 'látogató, turista' }).click();
  await page.getByText('Jelentkezem').click();
  await expect(page.getByRole('alert')).toHaveText('A jelentkezéshez el kell fogadnod az adatkezelést.');
  await page.getByRole('checkbox').click();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.getByText('Jelentkezem').click();
  // CI-ben be van állítva a Supabase (elfogott kérés), helyben nincs: akkor a „nincs bekapcsolva” üzenet jön
  await expect(page.getByText(/Köszönjük, felírtunk!|még nincs bekapcsolva/).first()).toBeVisible();
  if (box.sent) expect(box.sent).toEqual({ p_email: 'teszt.elek@pelda.hu', p_platform: 'android', p_freq: 'weekly', p_who: 'visitor', p_lang: 'hu' });
  // Nyelvváltás és a tájékoztató
  await page.goto('./?beta&lang=de');
  await expect(page.getByRole('heading', { name: 'Werde Beta-Tester' })).toBeVisible();
  await page.getByRole('link', { name: 'Datenschutzhinweis' }).click();
  await expect(page.getByText('Anmeldung zur Beta')).toBeVisible();
});
