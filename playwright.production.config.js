import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e', testMatch: /production\.spec\.js/, timeout: 60000,
  fullyParallel: false, workers: 1, forbidOnly: !!process.env.CI, reporter: 'list',
  use: { baseURL: 'http://localhost:4280', channel: process.env.PW_CHANNEL || undefined },
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js preview --port 4280 --strictPort`,
    url: 'http://localhost:4280', reuseExistingServer: !process.env.CI,
  },
});
