// Version and precache URLs are filled by the production build.
const VERSION = '51ce699f186d7192';
const PRECACHE = ["index.html","assets/Cubic_11_game-UnpbrcuP.woff2","assets/main-BqilQ0xt.js","assets/game-data-B0CUPFit.js","assets/main-9aldyPpK.css","assets/gen3/manifest.js","assets/gen3/interiors.js"];
const PREFIX = 'pkmn-' + new URL(self.registration.scope).pathname + '-';
const SHELL = PREFIX + VERSION, ASSETS = PREFIX + 'assets', SPRITES = PREFIX + 'sprites';
const absolute = path => new URL(path, self.registration.scope).href;
const immutable = url => /\/assets\/[^/]+-[\w-]{8,}\.(?:js|css|woff2|png)$/.test(url.pathname);
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const assets = await caches.open(ASSETS), shell = await caches.open(SHELL);
    await Promise.all(PRECACHE.map(async path => {
      const url = absolute(path), r = await fetch(url, { cache: 'reload' });
      if (!r.ok) throw new Error('Precache failed: ' + path);
      await (immutable(new URL(url)) ? assets : shell).put(url, r);
    }));
  })());
});
self.addEventListener('message', e => { if (e.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Keep hashed assets available for tabs still running an older version.
    for (const k of await caches.keys()) {
      if (k.startsWith(PREFIX) && ![SHELL, ASSETS, SPRITES].includes(k)) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const sprite = url.hostname === 'raw.githubusercontent.com';
  if (url.origin !== self.location.origin && !sprite) return;
  if (!sprite && !url.href.startsWith(self.registration.scope)) return;
  e.respondWith((async () => {
    // Pokemon art is stable within one release. Cache-first avoids a network
    // round trip whenever a menu recreates its images; a new shell refreshes it.
    const localSprite = url.href.startsWith(absolute('assets/gen3/battle/'))
      || url.href.startsWith(absolute('assets/gen3/overworld/'))
      || url.href === absolute('assets/gen3/mon_icons.png');
    const fixed = sprite || localSprite || immutable(url);
    const c = await caches.open(sprite ? SPRITES : localSprite ? SHELL : fixed ? ASSETS : SHELL);
    const hit = await c.match(req);
    if (fixed && hit) return hit;
    try {
      const r = await fetch(req, fixed ? {} : { cache: 'no-cache' });
      if (r.ok) e.waitUntil(c.put(req, r.clone()).catch(() => {}));
      if (!r.ok && req.mode === 'navigate' && hit) return hit;
      return r;
    } catch {
      if (hit) return hit;
      if (req.mode === 'navigate') return (await c.match(absolute('index.html'))) || Response.error();
      return Response.error();
    }
  })());
});
