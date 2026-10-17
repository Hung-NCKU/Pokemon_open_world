import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

test('沒有原作素材時，正式版備援仍能存檔、重開並繼續', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, serviceWorkers: 'block' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/assets/gen3/**', route => route.abort());
  try {
    await page.goto('/'); await page.waitForFunction(() => window.Game && !document.getElementById('loading'));
    expect(await page.evaluate(() => Gen3.on)).toBe(false);
    await page.evaluate(() => {
      const s = Game.newState('備援測試', 'kanto', 1); s.party = [Mon.create(1, 5)];
      document.getElementById('title').classList.add('hidden'); Game.start(s, true); Game.save(true);
    });
    await page.reload(); await page.waitForFunction(() => window.Game && !document.getElementById('loading'));
    await page.keyboard.press('z'); await page.waitForFunction(() => G.mode === 'world');
    expect(await page.evaluate(() => G.state.name)).toBe('備援測試'); expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('正式打包版：存檔、重開、繼續與延遲載入 Z 動畫', async ({ page }) => {
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => requests.push(r.url()));
  await page.goto('/'); await page.waitForFunction(() => window.Game && !document.getElementById('loading'));
  expect(requests.some(u => /sd-anims-[\w-]+\.js/.test(u))).toBe(false);
  await page.evaluate(() => {
    const state = Game.newState('正式版測試', 'kanto', 1); state.party = [Mon.create(1, 5)];
    document.getElementById('title').classList.add('hidden'); Game.start(state, true); Game.save(true);
  });
  await page.reload(); await page.waitForFunction(() => window.Game && !document.getElementById('loading'));
  if (await page.locator('#title .press-start').isVisible()) await page.keyboard.press('z');
  await expect.poll(() => page.evaluate(() => document.body.textContent.includes('繼續遊戲'))).toBe(true);
  await page.keyboard.press('z');
  await page.waitForFunction(() => G.mode === 'world');
  expect(await page.evaluate(() => G.state.name)).toBe('正式版測試');
  expect(await page.evaluate(() => SDAnim.load())).toBe(true);
  expect(requests.some(u => /sd-anims-[\w-]+\.js/.test(u))).toBe(true);
  expect(errors).toEqual([]);
});

test('正式版必要檔案預快取後，離線重開仍能載入遊戲', async ({ page, context }) => {
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/'); await page.waitForFunction(() => window.Game && !document.getElementById('loading'));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const info = await (await page.request.get('/build-info.json')).json();
  const cached = await page.evaluate(async critical => {
    const keys = await caches.keys(), cache = await caches.open(keys.find(k => k.endsWith('-assets')));
    return Promise.all(critical.filter(p => /-[\w-]{8,}\.(js|css|woff2)$/.test(p)).map(async p => !!(await cache.match(new URL(p, location.href)))));
  }, info.critical);
  expect(cached.length).toBeGreaterThan(1); expect(cached.every(Boolean)).toBe(true);
  await context.setOffline(true);
  try { await page.reload(); await page.waitForFunction(() => window.Game && !document.getElementById('loading')); }
  finally { await context.setOffline(false); }
  expect(errors).toEqual([]);
});

test('版本更新：等待確認、保留舊雜湊資源、HTML 網路優先與離線備援', async ({ browser }) => {
  let version = 'v1';
  const source = readFileSync('sw.js', 'utf8');
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(source.replace("const VERSION = 'dev';", `const VERSION = '${version}';`)
        .replace('/* __PRECACHE__ */ []', JSON.stringify(['index.html', `assets/main-${version}aaaaaa.js`]))); return;
    }
    if (url.pathname.startsWith('/assets/')) {
      res.setHeader('Content-Type', 'application/javascript');
      if (!url.pathname.includes(version)) { res.statusCode = 404; res.end('gone'); return; }
      res.end(`window.boot = '${version}';`); return;
    }
    if (url.pathname === '/config.js') { res.end(url.search); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<html><body>${version}<script src="/assets/main-${version}aaaaaa.js"></script><script>navigator.serviceWorker.register('/sw.js')</script></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext(), page = await context.newPage();
  try {
    await page.goto(origin); await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.evaluate(async () => { await caches.open('unrelated-app'); await fetch('/config.js?mode=a'); await fetch('/config.js?mode=b'); });
    version = 'v2';
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()).waiting);
    expect(await page.evaluate(() => window.boot)).toBe('v1');
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await new Promise(resolve => { navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }); r.waiting.postMessage({ type: 'ACTIVATE_UPDATE' }); });
    });
    expect(await page.evaluate(() => caches.has('unrelated-app'))).toBe(true);
    // Old tabs can still request their original code after deployment removes that file.
    expect(await page.evaluate(() => fetch('/assets/main-v1aaaaaa.js').then(r => r.text()))).toContain("'v1'");
    await page.reload(); expect(await page.evaluate(() => window.boot)).toBe('v2');
    await page.evaluate(async () => { await fetch('/config.js?mode=a'); await fetch('/config.js?mode=b'); });
    await context.setOffline(true);
    await page.reload(); expect(await page.evaluate(() => window.boot)).toBe('v2');
    const queries = await page.evaluate(async () => Promise.all(['a', 'b'].map(x => fetch('/config.js?mode=' + x).then(r => r.text()))));
    expect(queries).toEqual(['?mode=a', '?mode=b']);
  } finally { await context.close(); await new Promise(resolve => server.close(resolve)); }
});
