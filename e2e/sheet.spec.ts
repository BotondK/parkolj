import { expect, test, type Page } from '@playwright/test';

// Telefonon az alsó panel húzással felhúzható teljes képernyőre, és vissza (mint a BudapestGO-ban)
test.skip(({ viewport }) => (viewport?.width ?? 0) > 700, 'csak telefonméretben van alsó panel');

const sheetH = async (page: Page) => (await page.getByTestId('sheet').boundingBox())!.height;

// Érintéses húzás a fogantyún (a Pixel 7 profil érintőképernyős)
async function drag(page: Page, dy: number) {
  const b = (await page.getByTestId('sheet-handle').or(page.getByTestId('sheet-collapse')).boundingBox())!;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / 12 }] });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(150);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(600);
}

test('alsó panel: felhúzás teljes képernyőre, vissza nyíllal és húzással', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./');
  await page.getByText('Kezdjük').click();
  const vh = page.viewportSize()!.height;
  const mid = await sheetH(page);
  expect(mid).toBeLessThan(vh * 0.6);

  // Felhúzás: teljes képernyő, fent „˅ Parkolás”, a fülsor eltűnik
  await drag(page, -(vh * 0.5));
  await expect(page.getByTestId('sheet-collapse')).toBeVisible();
  expect(await sheetH(page)).toBeGreaterThan(vh * 0.85);
  await expect(page.getByRole('tab', { name: 'Kedvenceim' })).toHaveCount(0);

  // Vissza a nyíllal
  await page.getByTestId('sheet-collapse').click();
  await expect(page.getByTestId('sheet-handle')).toBeVisible();
  await expect.poll(async () => Math.abs((await sheetH(page)) - mid)).toBeLessThan(3);
  await expect(page.getByRole('tab', { name: 'Kedvenceim' })).toBeVisible();

  // Lehúzás: kisebb panel, több térkép
  await drag(page, vh * 0.25);
  expect(await sheetH(page)).toBeLessThan(mid - 50);

  // Koppintás a fogantyúra: vissza középre, újabb koppintásra teljes képernyő
  await page.getByTestId('sheet-handle').click();
  await expect.poll(() => sheetH(page)).toBeGreaterThan(mid - 10);
  await page.getByTestId('sheet-handle').click();
  await expect(page.getByTestId('sheet-collapse')).toBeVisible();

  // Felhúzva a kereső a panel tetején van (a térképen lévő eltűnik), és használható
  await expect(page.getByPlaceholder('Hova szeretnél menni?')).toHaveCount(1);
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  // Új lépésnél középre áll vissza, hogy a térképen lássa a javaslatokat
  await expect(page.getByTestId('sheet-handle')).toBeVisible();
});
