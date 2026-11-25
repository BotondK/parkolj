import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// „Információk és súgó” (a BudapestGO mintájára): vészhelyzet, jelmagyarázat, fő funkciók, mobilparkolás, GYIK, visszajelzés, dokumentumok, verzió
const axe = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').analyze()).violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);

test('súgó: minden aloldal megnyílik, akadálymentes', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./');
  await page.getByText('Kezdjük').click();
  await page.getByRole('tab', { name: 'Menü', exact: true }).click();
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
  await page.getByText('Licencek és adatforrások').click();
  await expect(page.getByText('© OpenStreetMap közreműködők, ODbL licenc')).toBeVisible();
  await back();

  await page.getByRole('button', { name: 'Visszajelzés küldése' }).click();
  await expect(page.getByRole('heading', { name: 'Visszajelzés küldése' }).or(page.getByText('Visszajelzés küldése').first())).toBeVisible();
  console.log(issues.join('\n'));
  expect(issues).toEqual([]);
});
