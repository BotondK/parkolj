import { expect, test, type Page } from '@playwright/test';

// Külső szolgáltatások (térképcsempék, címkereső) nélkül is működnie kell: tartalékokkal
test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  (page as Page & { errors: string[] }).errors = errors;
  await page.goto('./');
  await page.getByText('Kezdjük').click();
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { errors: string[] }).errors).toEqual([]);
});

const tab = (page: Page, name: string) => page.getByRole('tab', { name });

test('célpont → 3 javaslat → navigáció → fizetés → aktív jegy → leállítás → nyugta', async ({ page }) => {
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await expect(page.getByText('A 3 legjobb lehetőség')).toBeVisible();
  await expect(page.getByText(/zóna · \d+ Ft\/óra/).first()).toBeVisible();

  await page.getByText('Navigálj oda').click();
  await expect(page.getByText('Google Maps')).toBeVisible();
  await page.getByText(/Megérkeztem/).click();

  await expect(page.getByText('Parkolás indítása')).toBeVisible();
  await page.getByText(/Fizetés és indítás|Indítás \(most/).click();
  await expect(page.getByText('Aktív parkolás')).toBeVisible();

  await tab(page, 'Parkolásaim').click();
  await expect(page.getByText(/Érvényes|Lejárt/)).toBeVisible();
  await page.getByText('+15 perc', { exact: true }).click();
  await page.getByText('Részletek', { exact: true }).click();
  await page.getByText('Parkolás leállítása').click();
  await expect(page.getByText('Parkolás leállítva')).toBeVisible();
  await page.getByText('Kész').click();

  await tab(page, 'Parkolásaim').click();
  await page.getByText('Lezárt').click();
  await expect(page.getByText('Magyar Állami Operaház').first()).toBeVisible();

  await tab(page, 'Menü').click();
  await page.getByText('Értesítéseim').click();
  await expect(page.getByText('Parkolás elindult')).toBeVisible();
  await expect(page.getByText('Parkolás lezárva')).toBeVisible();
});

test('kedvenc hely mentése csillaggal, majd indítás a Kedvenceimből', async ({ page }) => {
  await page.getByPlaceholder('Hova szeretnél menni?').fill('vígszínház');
  await page.getByText('Vígszínház').first().click();
  await page.getByLabel('Hely mentése').click();
  await page.getByText('Munkahely', { exact: true }).click();
  await expect(page.getByText('Elmentve a Kedvenceim közé')).toBeVisible();

  await tab(page, 'Kedvenceim').click();
  await expect(page.getByText(/Vígszínház · [A-D] zóna/)).toBeVisible();
  await page.getByText('Munkahely').click();
  await expect(page.getByText('A 3 legjobb lehetőség')).toBeVisible();
});

test('bankkártya: hibás szám elutasítva, jó szám csak utolsó 4 számjeggyel tárolva; kupon', async ({ page }) => {
  await tab(page, 'Menü').click();
  await page.getByText('Vásárlás és fizetés').click();
  await page.getByText('Bankkártyáim').click();
  // Üres listánál az új kártya űrlapja eleve nyitva van
  if (await page.getByText('Kártya hozzáadása').isVisible()) await page.getByText('Kártya hozzáadása').click();
  const number = page.getByPlaceholder('4242 4242 4242 4242');
  await number.fill('4242424242424241');
  await expect(page.getByText('Hibás kártyaszám.')).toBeVisible();
  await number.fill('4242424242424242');
  await page.getByPlaceholder('12/29').fill('1230');
  await page.getByText('Mentés', { exact: true }).click();
  await expect(page.getByText('Visa •••• 4242')).toBeVisible();
  const stored = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  expect(stored).not.toContain('4242424242424242');

  await page.getByLabel('Vissza').click();
  await page.getByText('Kuponbeváltás').click();
  await page.getByPlaceholder('PARKOLJ500').fill('PARKOLJ500');
  await page.getByText('Beváltás', { exact: true }).click();
  await expect(page.getByText(/Beváltva: 500/)).toBeVisible();
  await page.getByPlaceholder('PARKOLJ500').fill('PARKOLJ500');
  await page.getByText('Beváltás', { exact: true }).click();
  await expect(page.getByText('Ismeretlen vagy már beváltott kód.')).toBeVisible();
});

test('beállítások: sötét/világos mód és nyelvváltás', async ({ page }) => {
  await tab(page, 'Menü').click();
  await page.getByText('Beállítások').click();
  await page.getByText('Sötét', { exact: true }).click();
  const bg = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="app-root"]') ?? document.body).backgroundColor);
  await expect.poll(bg).toBe('rgb(20, 20, 20)');
  await page.getByText('Világos', { exact: true }).click();
  await expect.poll(bg).toBe('rgb(241, 238, 243)');
  await page.getByText('English', { exact: true }).click();
  await expect(page.getByText('Settings')).toBeVisible();
  await expect(tab(page, 'Favourites')).toBeVisible();
  await page.getByText('Deutsch', { exact: true }).click();
  await expect(page.getByText('Einstellungen')).toBeVisible();
  await expect(tab(page, 'Favoriten')).toBeVisible();
  await page.getByRole('tab', { name: 'Parken', exact: true }).click();
  await page.getByPlaceholder('Wohin möchtest du?').fill('staatsoper');
  await page.getByText('Ungarische Staatsoper').first().click();
  await expect(page.getByText(/Zone A · 800 Ft\/Std\./).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kartenebenen' })).toBeVisible();
});

test('visszajelzés: fiókszerver nélkül sorba kerül, nem vész el', async ({ page }) => {
  await tab(page, 'Menü').click();
  await page.getByText('Visszajelzés küldése').click();
  await page.getByLabel('4/5').click();
  await page.getByPlaceholder('Írd le a tapasztalatod…').fill('Nagyon jó, de kellene több garázs.');
  await page.getByText('Küldés', { exact: true }).click();
  await expect(page.getByText(/Elmentettük|Megkaptuk/)).toBeVisible();
  const queue = await page.evaluate(() => Object.entries(localStorage).find(([k]) => k.includes('feedbackQueue'))?.[1] ?? '');
  expect(queue).toContain('több garázs');
});

test('Parkolj Plusz: alkalmi Plusz fizetéskor, autó helye, majd havi előfizetés és kimutatás', async ({ page }) => {
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await page.getByText('Navigálj oda').click();
  await page.getByText(/Megérkeztem/).click();
  await page.getByRole('checkbox', { name: /Plusz erre a parkolásra/ }).click();
  await expect(page.getByRole('checkbox', { name: /Plusz erre a parkolásra/ })).toBeChecked();
  await page.getByText(/Fizetés és indítás|Indítás \(most/).click();
  await expect(page.getByText('Aktív parkolás')).toBeVisible();

  // „Hol hagytam az autót?”: mindenkinek, szint + jegyzet + fotó (a fotó csak a készüléken)
  const spot = page.getByTestId('car-spot');
  await spot.getByText('-2', { exact: true }).click();
  await page.getByPlaceholder(/-2\. szint/).fill('C12 oszlop');
  await page.getByPlaceholder(/-2\. szint/).press('Enter');
  const chooser = page.waitForEvent('filechooser');
  await spot.getByText(/Fotó a galériából/).click();
  await (await chooser).setFiles('e2e/fixtures/auto.png');
  await expect(spot.getByRole('img', { name: 'Fotó arról, hol hagytad az autót' })).toBeVisible();

  await tab(page, 'Parkolásaim').click();
  await expect(page.getByText('📍 -2. szint · C12 oszlop')).toBeVisible();
  await page.getByText('Részletek', { exact: true }).click();
  await page.getByText('Parkolás leállítása').click();
  await expect(page.getByText('Parkolás leállítva')).toBeVisible();
  await page.getByText('Kész').click();

  await tab(page, 'Menü').click();
  await page.getByText('Parkolj Plusz').first().click();
  await page.getByText('Előfizetek').click();
  await expect(page.getByText(/Aktív előfizetés/)).toBeVisible();

  await tab(page, 'Parkolásaim').click();
  await page.getByText('Lezárt').click();
  await expect(page.getByText('Havi kimutatás')).toBeVisible();
  await expect(page.getByText('1 parkolás').first()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByText('CSV letöltése').click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
});

test('a választógombok felirata keskeny telefonon sem csonkul', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const notTruncated = async () => {
    const labels = page.getByTestId('seg-label');
    await expect(labels.first()).toBeVisible();
    const cut = await labels.evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
    expect(cut).toEqual([]);
  };
  await tab(page, 'Menü').click();
  await page.getByText('Beállítások', { exact: true }).click();
  await notTruncated();
  await page.getByLabel('Vissza').first().click();
  await page.getByText('Parkolj Plusz').first().click();
  await notTruncated();
});

test('garázsjavaslat valódi helyről becsült árral; adatkezelési tájékoztató a Menüben', async ({ page }) => {
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await expect(page.getByText(/^kb\. \d+ Ft\/óra$/).first()).toBeVisible();

  await tab(page, 'Menü').click();
  await page.getByText('Adatkezelési tájékoztató').click();
  await expect(page.getByText('Milyen adatokat tárolunk?')).toBeVisible();
  await expect(page.getByText(/a teljes számot és a CVC-t soha/)).toBeVisible();
});

test('névtelen statisztika: lépések sorba kerülnek személyes adat nélkül, kikapcsolva törlődnek', async ({ page }) => {
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await page.getByText('Navigálj oda').click();
  await page.getByText(/Megérkeztem/).click();
  await page.getByText(/Fizetés és indítás|Indítás \(most/).click();
  const queue = () => page.evaluate(() => JSON.parse(localStorage.getItem('parkolj:statsQueue') || '[]') as { name: string; props: object }[]);
  await expect.poll(async () => (await queue()).map((e) => e.name), { timeout: 10_000 }).toEqual(expect.arrayContaining(['app_open', 'dest_selected', 'navigate', 'start']));
  const raw = JSON.stringify(await queue());
  expect(raw).not.toContain('ABC');
  expect(raw).not.toMatch(/47\.\d{3}/);

  await tab(page, 'Menü').click();
  await page.getByText('Beállítások').click();
  await page.getByRole('switch', { name: 'Névtelen használati statisztika' }).click();
  await expect.poll(async () => (await queue()).length).toBe(0);
});

test('widgetek: előnézet üresen és aktív parkolással, +15 perc és leállítás a widgetről', async ({ page }) => {
  await tab(page, 'Menü').click();
  await page.getByText('Widgetek', { exact: true }).click();
  await expect(page.getByText(/^Tedd ki a Parkolj widgetet/)).toBeVisible();
  await expect(page.getByText('Nincs aktív parkolás').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Otthon: Beállítás' })).toBeVisible();

  // Parkolás indítása, majd vissza a widgetekhez
  await page.getByRole('tab', { name: 'Parkolás', exact: true }).click();
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await page.getByText('1 óra', { exact: true }).click(); // a 3 órás korlát alatt, hogy hosszabbítható legyen
  await page.getByText('Navigálj oda').click();
  await page.getByText(/Megérkeztem/).click();
  await page.getByText(/Fizetés és indítás|Indítás \(most/).click();
  await expect(page.getByText('Aktív parkolás')).toBeVisible();
  const lejar = async () => (await page.getByText(/^ABC-123 · . zóna · Lejár \d\d:\d\d$|· Lejár \d\d:\d\d/).first().textContent())!.match(/(\d\d):(\d\d)/)!;

  const before = await lejar();
  await tab(page, 'Menü').click();
  await page.getByText('Widgetek', { exact: true }).click();
  const stage = page.getByTestId('widget-stage');
  await expect(stage.getByText(/zóna · /).first()).toBeVisible();
  await expect(stage.getByText(/^\d:\d\d$/).first()).toBeVisible(); // iPhone: élő visszaszámlálás
  await expect(page.getByTestId('live-stage').getByText(/^Lejár \d\d:\d\d$/)).toBeVisible(); // iPhone élő tevékenység
  await page.getByRole('radio', { name: 'Android' }).click();
  await expect(stage.getByText(/^Lejár \d\d:\d\d$/).first()).toBeVisible(); // Android: a lejárat ideje
  await page.getByRole('radio', { name: 'Sötét' }).click();
  await stage.getByRole('button', { name: '+15 perc' }).click();
  await expect(page.getByText('Aktív parkolás')).toBeVisible();
  const after = await lejar();
  const mins = (m: RegExpMatchArray) => Number(m[1]) * 60 + Number(m[2]);
  expect((mins(after) - mins(before) + 1440) % 1440).toBe(15);

  await tab(page, 'Menü').click();
  await page.getByText('Widgetek', { exact: true }).click();
  await page.getByTestId('widget-stage').getByRole('button', { name: 'Leállítás' }).click();
  await expect(page.getByText('Parkolás leállítva')).toBeVisible();
});

test('„Nem volt hely”: a következő javaslatra lép; hibás adat jelzése a fizetésnél', async ({ page }) => {
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await page.getByText('Navigálj oda').click();
  await page.getByRole('button', { name: 'Nem volt hely, mutasd a következőt' }).click();
  await expect(page.getByText('Köszönjük a jelzést!', { exact: false })).toBeVisible();
  const queued = await page.evaluate(() => Object.entries(localStorage).find(([k]) => k.includes('reportQueue'))?.[1] ?? '');
  expect(queued).toContain('"kind":"nospace"');
  expect(queued).not.toMatch(/"lat":\d+\.\d{4,}/);
  await page.getByText('Navigálj oda').click();
  await page.getByText(/Megérkeztem/).click();
  await page.getByText('Hibás zóna vagy ár? Jelezd ›').click();
  await page.getByText('Rossz ár', { exact: true }).click();
  await page.getByLabel('Mi a hiba? (nem kötelező)').fill('A tábla szerint 400 Ft');
  await page.getByText('Jelzés küldése').click();
  await expect(page.getByText(/Köszönjük! (Átnézzük|Elmentettük)/)).toBeVisible();
});

test('P+R javaslat belvárosi célnál, tömegközlekedési átadással', async ({ page }) => {
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await expect(page.getByTestId('pr-card')).toContainText('P+R és tömegközlekedés');
  await expect(page.getByText(/perc a célig/).first()).toBeVisible();
  await expect(page.getByText('⚡ Leggyorsabb')).toHaveCount(1);
});
