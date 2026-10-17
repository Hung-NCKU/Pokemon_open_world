import { test, expect } from '@playwright/test';
test.setTimeout(60000);

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`觸控選招式、PP、返回與太晶化 ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    try {
      await page.goto('/tests/ui_tour.html#world');
      await page.waitForFunction(() => document.title === 'READY world');
      await page.evaluate(() => {
        G.settings.textSpeed = 0;
        const m = G.party[0]; m.moves = [53, 299, 370, 89].map(id => ({ id, pp: MOVES[id].pp }));
        m.moves[2].pp = 0; G.state.bag['tera-orb'] = 1; G.state.teraUsed = false;
        window.testBattle = new Battle({ wild: Mon.create(129, 5) });
        testBattle.setup(); testBattle.draw(); G.mode = 'battle';
        window.chosen = null;
        testBattle.chooseAction().then(a => { window.chosen = a; });
      });
      const panel = page.locator('#touch-battle-menu');
      await panel.getByRole('button', { name: '戰鬥', exact: true }).tap();
      await expect(panel.locator('.tb-options button')).toHaveCount(4);
      const bounds = await panel.locator('button:visible').evaluateAll(buttons => buttons.map(b => {
        const r = b.getBoundingClientRect(); return { width: r.width, height: r.height, right: r.right, bottom: r.bottom };
      }));
      for (const r of bounds) {
        expect(r.width).toBeGreaterThanOrEqual(44); expect(r.height).toBeGreaterThanOrEqual(44);
        expect(r.right).toBeLessThanOrEqual(viewport.width); expect(r.bottom).toBeLessThanOrEqual(viewport.height);
      }
      await panel.locator('.tb-options button').nth(2).tap();
      await expect(panel.locator('.tb-confirm')).toBeDisabled();
      await expect(page.locator('#choice-info .mv-desc')).toContainText('PP 已用完');
      await panel.locator('.tb-back').tap();
      await panel.getByRole('button', { name: '戰鬥', exact: true }).tap();
      await panel.locator('.tb-options button').nth(1).tap();
      await expect(panel.locator('.tb-confirm')).toBeEnabled();
      await panel.locator('.tb-gimmicks button').filter({ hasText: '太晶化' }).tap();
      await expect(panel.locator('.tb-gimmicks .on')).toContainText('太晶化');
      await expect.poll(() => page.evaluate(() => window.chosen)).toBeNull();
      await panel.locator('.tb-confirm').tap();
      await expect.poll(() => page.evaluate(() => window.chosen?.idx)).toBe(1);
      await expect(panel).toHaveCount(0);
      expect(await page.evaluate(() => window.chosen.tera)).toBe(true);
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
