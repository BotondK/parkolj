import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

// Mélygarázsban nincs térerő: egyszeri betöltés után az app internet nélkül is induljon, és jelezze az állapotot.
test('internet nélkül is betölt, az aktív jegy látszik, és jelzi, hogy nincs internet', async ({ page, context }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  await page.getByText('Kezdjük').click();
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await page.getByText('Navigálj oda').click();
  await page.getByText(/Megérkeztem/).click();
  await page.getByText(/Fizetés és indítás|Indítás \(most/).click();
  await expect(page.getByText('Aktív parkolás')).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Nincs internet/)).toBeVisible();
  await page.getByRole('tab', { name: 'Parkolásaim' }).click();
  await expect(page.getByText(/Érvényes|Lejárt/)).toBeVisible();
  await context.setOffline(false);
});
