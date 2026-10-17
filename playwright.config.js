// Playwright：在瀏覽器裡執行 tests/ 的測試頁（引擎、冒煙、實際遊玩），由 Vite 開發伺服器提供網頁
// npm test → 引擎＋冒煙；npm run test:natural → 實際遊玩（真實時間，約 10～30 分鐘，需要 assets/gen3 素材）
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT || 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 15 * 60 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    serviceWorkers: 'block',
    baseURL: `http://localhost:${PORT}`,
    // 本機可以用已安裝的 Chrome（PW_CHANNEL=chrome），不必下載 Playwright 的瀏覽器
    channel: process.env.PW_CHANNEL || undefined,
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [
    { name: 'unit', testMatch: /(engine|smoke|reliability|mobile|hooks|overworld)\.spec\.js/ },
    { name: 'natural', testMatch: /natural\.spec\.js/, timeout: 60 * 60 * 1000 },
  ],
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js --port ${PORT} --strictPort`, // Vite 開發伺服器（轉換 JSX、解析 import 'preact'）
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
