import { expect, test } from '@playwright/test';

// Ledolgozós szombat (2026. aug. 8.): a fizetésnél és a Tudnivalókban is szól, hogy munkanapi rend szerint kell fizetni
test('ledolgozós szombaton figyelmeztet, és díjat számol', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-08-08T08:00:00Z')); // 10:00 Budapesten
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./');
  await page.getByText('Kezdjük').click();
  await page.getByPlaceholder('Hova szeretnél menni?').fill('opera');
  await page.getByText('Magyar Állami Operaház').first().click();
  await page.getByText('Navigálj oda').click();
  await page.getByText(/Megérkeztem/).click();
  await expect(page.getByText('Parkolás indítása')).toBeVisible();
  await expect(page.getByTestId('special-day')).toContainText('Ma ledolgozós szombat');
  await expect(page.getByText('A zóna most díjmentes', { exact: false })).toHaveCount(0);
});

test('a ledolgozós szombat előtt pár nappal is látszik a Tudnivalókban', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-08-05T08:00:00Z'));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto('./');
  await page.getByText('Kezdjük').click();
  await page.getByRole('tab', { name: 'Menü', exact: true }).click();
  await page.getByText('Információk és súgó').click();
  await expect(page.getByTestId('special-day')).toContainText('augusztus 8., szombat ledolgozós szombat');
});
