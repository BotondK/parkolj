import { expect, test } from '@playwright/test';

// Összeomlás esetén: hibaképernyő a futó jeggyel, névtelen hibajelentés, újraindítás
test('hibaképernyő: futó jegy látszik, jelentés névtelen, újraindítás működik', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const sent: Record<string, string>[] = [];
  await page.route('**/rest/v1/app_errors', (r) => {
    sent.push(...r.request().postDataJSON());
    return r.fulfill({ status: 201, body: '' });
  });
  await page.goto('./');
  await page.getByText('Kezdjük').click();
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await page.getByText('Navigálj oda').click();
  await page.getByText(/Megérkeztem/).click();
  await page.getByText(/Fizetés és indítás|Indítás \(most/).click();
  await expect(page.getByRole('tab', { name: 'Parkolásaim' })).toBeVisible();

  await page.goto('./?crashtest');
  await expect(page.getByTestId('crash-screen')).toContainText('Hoppá, hiba történt');
  await expect(page.getByTestId('crash-ticket')).toContainText(/Érvényes eddig: \d{1,2}:\d{2}/);
  await expect(page.getByTestId('crash-ticket')).toContainText('Operaház');
  // CI-ben be van állítva a Supabase, ott a jelentést is ellenőrizzük: rendszám, e-mail, koordináta nélkül
  if (process.env.CI) await expect.poll(() => sent.length).toBeGreaterThan(0);
  for (const r of sent) {
    expect(r.kind).toBe('render');
    expect(JSON.stringify(r)).not.toMatch(/ABC-123|teszt@pelda|(?<!\d:)47\.49|(?<!\d:)19\.04/);
    expect(r.message).toContain('<rsz>');
  }
  await page.getByRole('button', { name: 'Újraindítás' }).click();
  await expect(page).not.toHaveURL(/crashtest/);
  await expect(page.getByTestId('crash-screen')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Parkolásaim' })).toBeVisible();
});
