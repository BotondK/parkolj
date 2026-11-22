import { defineConfig, devices } from '@playwright/test';

// Végigkattintós tesztek a webes buildre (előtte: npx expo export -p web). Futtatás: npm run e2e
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:8090/parkolj/',
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    trace: 'off',
    // A service worker csak az offline tesztben fut (máshol zavarná a hálózati elfogást)
    serviceWorkers: 'block',
    // A konténerben előre telepített Chromium (CI-ben a Playwright sajátja)
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: { command: 'node scripts/serve-dist.mjs', url: 'http://localhost:8090/parkolj/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'asztali-világos', use: { viewport: { width: 1440, height: 900 }, colorScheme: 'light' } },
    { name: 'mobil-sötét', use: { ...devices['Pixel 7'], colorScheme: 'dark' } },
  ],
});
