// Service Worker（只在線上版 https 啟用）：第一次開啟後把檔案存在手機／電腦上，之後開啟幾乎不用等待，網路不穩也能玩
// - 同網站的檔案：先用快取、背景更新（stale-while-revalidate）
// - 寶可夢圖片（PokéAPI 的 raw.githubusercontent.com）：先用快取，獨立的快取不隨版本清除
// - VERSION 由 tools/deploy_pages.sh 換成提交編號；版本改變時清掉舊的快取
const VERSION = 'dev';
const CACHE = 'pkmn-' + VERSION, SPRITES = 'pkmn-sprites';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== SPRITES) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 雲端存檔、帳號：一律走網路
  if (url.hostname.endsWith('supabase.co') || url.hostname === 'api.github.com') return;
  if (url.hostname === 'raw.githubusercontent.com') {
    e.respondWith((async () => {
      const c = await caches.open(SPRITES);
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })());
});
