// 實際遊玩測試：只用按鍵操作綠寶石的介面（真實時間，約 10～30 分鐘；需要 assets/gen3 素材，CI 不跑）
import { test } from '@playwright/test';
import { runPage } from './pages.js';

test('實際遊玩：新遊戲到草叢、商店、寶可夢中心；豐緣聯盟（tests/natural.html）', async ({ page }) => {
  page.on('console', m => { if (m.text().startsWith('NATURAL ')) console.log(m.text().slice(8)); });
  const scenario = process.env.SCENARIO ? `?scenario=${process.env.SCENARIO}` : '';
  await runPage(page, `/tests/natural.html${scenario}`, { timeout: 58 * 60 * 1000 });
});
