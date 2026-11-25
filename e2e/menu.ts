import type { Page } from '@playwright/test';

/** Menü megnyitása: telefonon az alsó Menü fül, asztalon a jobb felső pirula lenyíló menüje */
export async function openMenu(page: Page) {
  if ((page.viewportSize()?.width ?? 0) >= 900) await page.getByTestId('top-menu-btn').click();
  else await page.getByRole('tab', { name: 'Menü', exact: true }).click();
}
