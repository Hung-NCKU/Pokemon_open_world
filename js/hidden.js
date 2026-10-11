// 隱藏道具：散落在野外（每個地區 16 個，依世界種子決定位置），面向那一格按確認就能撿到
// 走近 3 格以內時，地面偶爾會閃一下光；道具依地區的等級帶決定（越後面越好）
import { G, Game, Hidden, Sound, T, UI, define } from './core.js';
import { mulberry32 } from './util.js';
import { Telemetry } from './telemetry.js';
import { ITEMS, REGION_KEYS, REGION_POS } from './data.js';
import { TILE, World } from './world.js';
define(Hidden, (() => {
  const PER_REGION = 16;
  const POOL = [
    [0, ['potion', 'super-potion', 'poke-ball', 'great-ball', 'repel', 'full-heal', 'ether']],
    [20, ['super-potion', 'hyper-potion', 'great-ball', 'ultra-ball', 'revive', 'ether', 'rare-candy', 'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone']],
    [40, ['hyper-potion', 'max-potion', 'ultra-ball', 'revive', 'rare-candy', 'rare-candy', 'sun-stone', 'dusk-stone', 'shiny-stone', 'leftovers', 'life-orb', 'focus-sash', 'choice-scarf']],
  ];
  const OK = () => new Set([T.GRASS, T.TALL, T.FLOWER, T.SAND, T.CAVE, T.SNOW, T.SNOWTALL, T.DESERT]);
  const key = (x, y) => x + ',' + y;
  const found = (x, y) => !!(G.state && G.state.flags['hid' + key(x, y)]);

  function place() {
    const W = World;
    W.hidden = new Map();
    const rng = mulberry32((W.seed ^ 0x41dd3) >>> 0);
    const ok = OK();
    for (const region of REGION_KEYS) {
      const [rx, ry, rad] = REGION_POS[region];
      let n = 0;
      for (let tries = 0; tries < 3000 && n < PER_REGION; tries++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * rad;
        const x = Math.round(rx + Math.cos(a) * r), y = Math.round(ry + Math.sin(a) * r);
        if (!W.inside(x, y) || W.regionAt(x, y) !== region || !ok.has(W.tile(x, y))) continue;
        if (W.townAt(x, y) || W.trainers.has(key(x, y)) || W.doors.has(key(x, y)) || (W.events && W.events.has(key(x, y)))
          || (W.legends && W.legends.has(key(x, y))) || (W.landmarks && W.landmarks.has(key(x, y)))) continue;
        if ([...W.hidden.values()].some(h => Math.abs(h.x - x) + Math.abs(h.y - y) < 12)) continue;
        const L = W.levelAt(x, y);
        const pool = POOL.filter(([lv]) => L >= lv).pop()[1].filter(id => ITEMS[id]);
        const item = pool[Math.floor(rng() * pool.length)];
        W.hidden.set(key(x, y), { x, y, item, region, n: item.endsWith('ball') ? 3 : 1 });
        n++;
      }
    }
  }
  const at = (x, y) => { const h = World.hidden && World.hidden.get(key(x, y)); return h && !found(x, y) ? h : null; };

  async function pickUp(h) {
    G.state.flags['hid' + key(h.x, h.y)] = 1;
    Game.giveItem(h.item, h.n);
    Sound.sfx('item');
    Telemetry.event('隱藏道具', { item: h.item });
    await UI.say(`地上藏著東西！\n找到了${ITEMS[h.item].n}${h.n > 1 ? ` ×${h.n}` : ''}！`);
  }
  // 附近的隱藏道具偶爾閃光（每 4 秒閃一下）
  function draw(g, ox, oy) {
    if (!World.hidden || (G.frame % 240) > 18) return;
    const s = G.state;
    for (const h of World.hidden.values()) {
      if (Math.abs(h.x - s.x) + Math.abs(h.y - s.y) > 3 || found(h.x, h.y)) continue;
      const k = (G.frame >> 2) % 4, r = 4 + k * 2;
      const cx = h.x * TILE - ox + TILE / 2, cy = h.y * TILE - oy + TILE / 2;
      g.fillStyle = k % 2 ? '#fff8c0' : '#ffffff';
      g.fillRect(cx - 1, cy - r, 3, r * 2); g.fillRect(cx - r, cy - 1, r * 2, 3);
    }
  }
  function count() {
    if (!World.hidden) return [0, 0];
    const all = [...World.hidden.values()];
    return [all.filter(h => found(h.x, h.y)).length, all.length];
  }

  // 世界產生後放置（不改變地形）
  const gen = World.generate;
  World.generate = function (...a) { const r = gen.apply(this, a); place(); return r; };
  return { at, pickUp, draw, count, place };
})());
