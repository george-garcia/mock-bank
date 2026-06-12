import { defineConfig, devices } from '@playwright/test';

// Skip e2e tests if Playwright browsers aren't installed
// (e.g. on Ubuntu 26.04 which lacks prebuilt binaries)
const browsersInstalled = (() => {
  try {
    require.resolve('playwright-core/lib/server');
    return true;
  } catch {
    return false;
  }
})();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: browsersInstalled
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [],
  webServer: {
    command: 'cd ../apps/web && pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
