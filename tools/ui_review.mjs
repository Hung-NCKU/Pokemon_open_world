import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base = process.argv[2] || 'http://localhost:4321';
const out = resolve(process.argv[3] || 'test-results/ui-review');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const errors = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 960, height: 640 }, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    const screens = mobile ? ['battle_move', 'party', 'bag', 'option', 'quest'] : ['title', 'world', 'mainmenu', 'party', 'summary1', 'bag', 'dex', 'shop', 'st_move_party', 'option', 'quest', 'battle_move', 'evolve'];
    const selected = process.argv[4]?.split(',');
    for (const screen of screens.filter(s => !selected || selected.includes(s))) {
      console.log('Review', mobile ? 'mobile' : 'desktop', screen);
      await page.goto(`${base}/tests/ui_tour.html?screen=${screen}#${screen}`);
      if (screen === 'title') await page.waitForFunction(() => window.Game && !document.getElementById('loading'));
      else await page.waitForFunction(s => document.title === 'READY ' + s, screen, { timeout: 35000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
      });
      await page.screenshot({ path: resolve(out, `${mobile ? 'mobile' : 'desktop'}-${screen}.png`) });
    }
    await context.close();
  }
} finally { await browser.close(); }
writeFileSync(resolve(out, 'errors.json'), JSON.stringify(errors, null, 2));
console.log(JSON.stringify({ out, errors }));
if (errors.length) process.exitCode = 1;
