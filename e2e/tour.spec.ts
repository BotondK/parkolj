import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Bemutató mód (?bemutato): bemutatkozás nélkül indul, lépésenként végigmegy egy estén, a végén a városnak szóló oldal
test('bemutató: 8 lépés az Operától a leállításig, akadálymentes', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./?bemutato');
  const card = page.getByTestId('tour-card');
  await expect(card).toContainText('Parkolj bemutató');
  await expect(card).toContainText('1/8');
  const next = () => page.getByTestId('tour-next').click();
  await next();
  await expect(card).toContainText('Hova mész?');
  await expect(page.getByText('A 3 legjobb lehetőség')).toBeVisible();
  await next();
  await expect(card).toContainText('Garázs');
  await expect(page.getByTestId('opt-garage')).toBeInViewport();
  await next();
  await expect(page.getByText(/Megérkeztem/)).toBeVisible();
  await next();
  await expect(page.getByText('Parkolás indítása')).toBeVisible();
  await next();
  await expect(page.getByText('Aktív parkolás')).toBeVisible();
  const v = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').analyze()).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect(v).toEqual([]);
  await next();
  await expect(page.getByText('Parkolás leállítva')).toBeVisible();
  await next();
  await expect(card).toContainText('8/8');
  await expect(card).toContainText('A városnak');
  await page.getByRole('button', { name: 'Újra' }).click();
  await expect(card).toContainText('1/8');
  await page.getByRole('button', { name: 'Bemutató bezárása' }).click();
  await expect(card).toHaveCount(0);
});
