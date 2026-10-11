// 天氣：各地區每 20 分鐘（現實時間）變化一次，依地區氣候決定機率
// - 畫面：雨絲、雪花、強烈日照、霧、沙暴
// - 遭遇：天氣中有 35% 的遭遇換成天氣喜歡的屬性（雨：水／電，雪：冰，晴：火／草，霧：幽靈／超能力／妖精，沙暴：地面／岩石／鋼）
// - 對戰：雨、晴、雪、沙暴會帶進對戰（整場持續）；霧只影響遭遇
import { G, T, UI, Weather, define } from './core.js';
import { U, mulberry32 } from './util.js';
import { CLIMATE, REGIONS, REGION_KEYS } from './data.js';
import { World } from './world.js';
define(Weather, (() => {
  const PERIOD = 20 * 60 * 1000;
  const KINDS = {
    clear: { n: '晴朗' },
    rain: { n: '下雨', battle: 'raindance', types: ['water', 'electric', 'bug'], start: '下起雨來了……' },
    snow: { n: '下雪', battle: 'snowscape', types: ['ice'], start: '開始下雪了……' },
    sun: { n: '大晴天', battle: 'sunnyday', types: ['fire', 'grass'], start: '陽光變得強烈了！' },
    fog: { n: '起霧', battle: null, types: ['ghost', 'psychic', 'fairy'], start: '起霧了，四周變得朦朧……' },
    sand: { n: '沙暴', battle: 'sandstorm', types: ['ground', 'rock', 'steel'], start: '颳起了沙暴！' },
  };
  let forced = null; // 測試用

  // 地區某時段的天氣：依氣候（溫度、濕度）決定各種天氣的權重
  function forRegion(region, now = Date.now()) {
    if (forced) return forced;
    const c = CLIMATE[region] || { temp: 0, wet: .5 };
    const slot = Math.floor(now / PERIOD);
    const r = mulberry32(((World.seed || 1) ^ (REGION_KEYS.indexOf(region) * 2654435761) ^ (slot * 40503)) >>> 0)();
    const w = [
      ['clear', 5],
      ['rain', 1 + Math.max(0, c.wet) * 15],
      ['snow', c.temp < -.1 ? 2.5 : 0],
      ['sun', c.temp > .1 ? 1.8 : .6],
      ['fog', .8 + Math.max(0, c.wet) * 6],
      ['sand', c.temp > .2 && c.wet < .4 ? 1.2 : 0],
    ];
    const sum = w.reduce((a, [, x]) => a + x, 0);
    let t = r * sum;
    for (const [k, x] of w) { t -= x; if (t <= 0) return k; }
    return 'clear';
  }
  // 某一格的天氣：雪地一定是雪（或晴），沙漠容易颳沙暴，雪不會下在熱的地方
  function at(x, y, now) {
    if (!World.tiles) return 'clear';
    const w = forRegion(World.regionAt(x, y), now);
    const t = World.tile(x, y);
    if (t === T.SNOW || t === T.SNOWTALL) return w === 'rain' ? 'snow' : w === 'sand' ? 'clear' : w;
    if (t === T.DESERT) return w === 'rain' || w === 'snow' ? 'sand' : w;
    if (w === 'snow' && (CLIMATE[World.regionAt(x, y)] || {}).temp > 0) return 'rain';
    return w;
  }
  const here = () => (G.state && !G.room ? at(G.state.x, G.state.y) : 'clear');

  // 遭遇：天氣喜歡的屬性
  function adjustWild(id, x, y, biome, L) {
    const w = at(x, y);
    const k = KINDS[w];
    if (!k.types || U.rand() >= .35) return id;
    const cand = World.ecoCandidates(biome === 'water' ? 'water' : biome).concat(biome === 'water' ? [] : World.ecoCandidates('tall'))
      .filter(c => c.wm <= L + 5 && c.types.some(t => k.types.includes(t)));
    if (!cand.length) return id;
    const gen = REGIONS[World.regionAt(x, y)].gen;
    const local = cand.filter(c => c.g === gen);
    return U.weighted((local.length && U.rand() < .7 ? local : cand).map(c => ({ ...c }))).id;
  }

  // 畫面效果（在世界畫面上方）
  const drops = Array.from({ length: 90 }, (_, i) => ({ x: (i * 97) % 720, y: (i * 53) % 480, s: .7 + ((i * 37) % 10) / 20 }));
  let last = 'clear';
  function draw(g, cv) {
    const w = here();
    if (w !== last) {
      if (G.mode === 'world' && G.state && KINDS[w].start && last !== null) UI.banner(KINDS[w].start);
      last = w;
    }
    const f = G.frame;
    if (w === 'rain') {
      g.fillStyle = 'rgba(40,60,110,.18)'; g.fillRect(0, 0, cv.width, cv.height);
      g.strokeStyle = 'rgba(200,220,255,.55)'; g.lineWidth = 2;
      g.beginPath();
      for (const d of drops) {
        const x = (d.x + f * 3 * d.s) % cv.width, y = (d.y + f * 14 * d.s) % cv.height;
        g.moveTo(x, y); g.lineTo(x - 4, y - 14);
      }
      g.stroke();
    } else if (w === 'snow') {
      g.fillStyle = 'rgba(220,230,255,.12)'; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (const d of drops) {
        const x = (d.x + Math.sin((f + d.y) / 30) * 12) % cv.width, y = (d.y + f * 1.2 * d.s) % cv.height;
        g.fillRect(x, y, 3 + d.s * 2, 3 + d.s * 2);
      }
    } else if (w === 'sun') {
      g.fillStyle = 'rgba(255,200,80,.12)'; g.fillRect(0, 0, cv.width, cv.height);
    } else if (w === 'fog') {
      g.fillStyle = 'rgba(235,235,240,.38)'; g.fillRect(0, 0, cv.width, cv.height);
    } else if (w === 'sand') {
      g.fillStyle = 'rgba(200,160,90,.28)'; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = 'rgba(230,200,140,.8)';
      for (const d of drops) {
        const x = (d.x + f * 9 * d.s) % cv.width, y = (d.y + Math.sin((f + d.x) / 20) * 6) % cv.height;
        g.fillRect(x, y, 4, 2);
      }
    }
  }
  return { KINDS, PERIOD, forRegion, at, here, adjustWild, draw, force: w => { forced = w; } };
})());
