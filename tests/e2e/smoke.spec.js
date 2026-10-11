import { test } from '@playwright/test';
import { runPage } from './pages.js';

test('冒煙測試：新遊戲、室內、戰鬥、存檔（tests/smoke.html）', async ({ page }) => {
  await runPage(page, '/tests/smoke.html', { timeout: 10 * 60 * 1000 });
});
