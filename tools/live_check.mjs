// 線上版實測：打開 GitHub Pages 的網站，注入實際遊玩測試（tests/natural.js，只用按鍵操作），
// 跑情境一（新遊戲 → 研究所 → 草叢戰鬥與捕捉 → 商店 → 寶可夢中心 → 記錄與讀檔），
// 再檢查 Service Worker（已註冊、控制頁面、快取裡有程式與素材）與素材路徑（沒有 404）
// 用法：node tools/live_check.mjs [網址]（需要 npm install；本機有 Chrome 時用 PW_CHANNEL=chrome）
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const SITE = process.argv[2] || 'https://hung-ncku.github.io/Pokemon_open_world/';
const natural = readFileSync(new URL('../tests/natural.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ serviceWorkers: 'allow' });
const page = await ctx.newPage();
const bad = [], errors = [];
page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(new URL(SITE).origin)) bad.push(`${r.status()} ${r.url()}`); });
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.text().startsWith('NATURAL ')) console.log(m.text().slice(8)); });
// 注入測試：同一個網域的假檔案（避免 https 網頁載入 http 的腳本）
await page.route('**/__natural.js', r => r.fulfill({ contentType: 'text/javascript', body: natural }));
await page.route(u => u.pathname.endsWith('/Pokemon_open_world/') || u.pathname.endsWith('/index.html'), async r => {
  const res = await r.fetch();
  const html = (await res.text()).replace('</body>', '<script type="module" src="./__natural.js"></script>\n</body>');
  await r.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
}, { times: 1 });
await page.goto(SITE + '?scenario=1');
await page.waitForFunction(() => document.title === 'PASS' || document.title === 'FAIL', null, { timeout: 40 * 60 * 1000, polling: 2000 });
const title = await page.title();
console.log('實際遊玩：', title);
// Service Worker：第一次載入時註冊；重新整理後由它控制頁面，快取裡有打包後的程式與綠寶石素材
await page.unroute('**/__natural.js');
await page.reload();
await page.waitForTimeout(6000);
const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const keys = await caches.keys();
  const files = [];
  for (const k of keys) for (const req of await (await caches.open(k)).keys()) files.push(new URL(req.url).pathname);
  return { registered: !!reg, controlled: !!navigator.serviceWorker.controller, caches: keys, js: files.filter(f => /assets\/main-.*\.js$/.test(f)).length, gen3: files.filter(f => f.includes('/assets/gen3/')).length, total: files.length, mode: window.G && G.mode };
});
console.log('Service Worker：', JSON.stringify(sw));
console.log('素材 404：', bad.filter(u => !u.endsWith('title_logo.png')).length ? bad : '無（title_logo.png 本來就沒有）');
console.log('頁面錯誤：', errors.length ? errors : '無');
await browser.close();
process.exit(title === 'PASS' && sw.registered && sw.controlled && sw.js > 0 && sw.gen3 > 0 && !errors.length ? 0 : 1);
