import { test } from '@playwright/test';
import { runPage } from './pages.js';

test('戰鬥引擎回歸測試（tests/engine_test.html）', async ({ page }) => {
  await runPage(page, '/tests/engine_test.html', { timeout: 14 * 60 * 1000 });
});
