import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openMenu } from './menu';

// „Információk és súgó” (a BudapestGO mintájára): vészhelyzet, jelmagyarázat, fő funkciók, mobilparkolás, GYIK, visszajelzés, dokumentumok, verzió
const axe = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').analyze()).violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);

test('súgó: minden aloldal megnyílik, akadálymentes', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./');
  await page.getByText('Kezdjük').click();
  await openMenu(page);
  await page.getByText('Információk és súgó').click();
  const home = page.getByTestId('help-home');
  await expect(home).toContainText('Vészhelyzet van?');
  await expect(home).toContainText('Nem találod az autód?');
  await expect(home).toContainText(/Verzió: \d+\.\d+\.\d+/);
  await expect(page.getByRole('link', { name: 'Hívás: 112' })).toBeVisible();
  const issues: string[] = (await axe(page)).map((v) => `súgó: ${v}`);

  const back = () => page.getByRole('button', { name: 'Vissza' }).first().click();
  await page.getByText('Jelmagyarázat').click();
  await expect(page.getByTestId('help-legend')).toContainText('A zóna');
  await expect(page.getByTestId('help-legend')).toContainText('P+R parkoló');
  issues.push(...(await axe(page)).map((v) => `jelmagyarázat: ${v}`));
  await back();

  await page.getByText('Az alkalmazás fő funkciói').click();
  await expect(page.getByText('Hol hagytam az autót?')).toBeVisible();
  await back();

  await page.getByText('A mobilparkolás működése').click();
  await expect(page.getByText('Mi a 3 órás szabály?').or(page.getByText(/3 órás/).first())).toBeVisible();
  await back();

  await page.getByText('Gyakran ismételt kérdések').click();
  await page.getByText('Mi a 3 órás szabály?').click();
  await expect(page.getByText(/legfeljebb 3 órát parkolhatsz/)).toBeVisible();
  issues.push(...(await axe(page)).map((v) => `gyik: ${v}`));
  await back();

  await page.getByText('Akadálymentesítési nyilatkozat').click();
  await expect(page.getByText(/WCAG 2.1 AA/)).toBeVisible();
  await back();
  await page.getByText('Béta felhasználási feltételek').click();
  await expect(page.getByTestId('terms')).toContainText('A fizetés a bétában nem valódi');
  await expect(page.getByTestId('terms')).toContainText('helyszíni táblák');
  issues.push(...(await axe(page)).map((v) => `feltételek: ${v}`));
  await openMenu(page);
  await page.getByText('Információk és súgó').click();
  await page.getByText('Licencek és adatforrások').click();
  await expect(page.getByText('© OpenStreetMap közreműködők, ODbL licenc')).toBeVisible();
  await back();

  await page.getByRole('button', { name: 'Visszajelzés küldése' }).click();
  await expect(page.getByRole('heading', { name: 'Visszajelzés küldése' }).or(page.getByText('Visszajelzés küldése').first())).toBeVisible();
  console.log(issues.join('\n'));
  expect(issues).toEqual([]);
});

test('asztali menü: pirula, lenyíló menü, nyelv almenü, Ctrl+U, bal sáv alja', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 900, 'csak asztali nézetben');
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./');
  await page.getByText('Kezdjük').click();
  await expect(page.getByRole('tab', { name: 'Menü' })).toHaveCount(0);
  await page.getByTestId('top-menu-btn').click();
  const menu = page.getByTestId('top-menu');
  await expect(menu).toContainText('Hibabejelentés (Ctrl+U)');
  // Nyelv almenü: angolra vált
  await menu.getByText('Nyelv').click();
  await menu.getByText('English').click();
  await expect(menu).toHaveCount(0);
  await expect(page.getByPlaceholder(/Where/)).toBeVisible();
  await page.getByTestId('top-menu-btn').click();
  await page.getByTestId('top-menu').getByText('Language').click();
  await page.getByTestId('top-menu').getByText('Magyar').click();
  // Esc bezárja
  await page.getByTestId('top-menu-btn').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('top-menu')).toHaveCount(0);
  // Ctrl+U: hibabejelentés
  await page.keyboard.press('Control+u');
  await expect(page.getByText('Mennyire vagy elégedett?')).toBeVisible();
  // Bal sáv alja: logó → Névjegy
  await expect(page.getByTestId('side-bug')).toContainText('Hibabejelentés (Ctrl+U)');
  await page.getByRole('button', { name: 'Névjegy' }).click();
  await expect(page.getByTestId('help-about')).toContainText('Verzió: 0.3.0');
});

test('béta oldal: a felhasználási feltételek megnyílnak és vissza lehet lépni', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./?beta&lang=en');
  await page.getByTestId('beta-terms').click();
  await expect(page.getByTestId('terms')).toContainText('Payment in the beta is not real');
  await page.getByRole('button', { name: 'Vissza' }).first().click();
  await expect(page.getByTestId('beta-terms')).toBeVisible();
});
