// 開放世界：地形生成、城鎮道路、訓練家、野生寶可夢、繪製
const T = { GRASS: 0, TALL: 1, TREE: 2, WATER: 3, SAND: 4, MOUNT: 5, CAVE: 6, SNOW: 7, SNOWTALL: 8, DESERT: 9, PATH: 10, BRIDGE: 11, TOWN: 12, BLDG: 13, DOOR: 14, FLOWER: 15, DEEP: 16 };
const TILE = 32;
const WW = 960, WH = 600;
const TOWN_W = 16, TOWN_H = 12;
const BLOCKED = new Set([T.TREE, T.MOUNT, T.BLDG]);

const World = {
  seed: 0, tiles: null, towns: [], buildings: [], doors: new Map(), trainers: new Map(), pools: null,
  homeTown: null,

  idx(x, y) { return y * WW + x; },
  inside(x, y) { return x >= 0 && y >= 0 && x < WW && y < WH; },
  tile(x, y) { return this.inside(x, y) ? this.tiles[y * WW + x] : T.DEEP; },
  set(x, y, t) { if (this.inside(x, y)) this.tiles[y * WW + x] = t; },
  regionAt(x, y) {
    if (!this.inside(x, y)) return 'kanto';
    return REGION_KEYS[this.regionMap[y * WW + x]];
  },
  townAt(x, y) {
    for (const t of this.towns) if (x >= t.x && y >= t.y && x < t.x + TOWN_W && y < t.y + TOWN_H) return t;
    return null;
  },

  // 依世界地圖位置的「最近地區」與混合氣候
  landInfo(x, y) {
    let best = 9, bi = 0;
    const out = { temp: 0, wet: 0, water: 0 };
    let wsum = 0;
    REGION_KEYS.forEach((k, i) => {
      const [rx, ry, r] = REGION_POS[k];
      const d = Math.hypot(x - rx, y - ry) / r;
      if (d < best) { best = d; bi = i; }
      const w = 1 / Math.pow(Math.max(d, .05), 4);
      wsum += w;
      for (const c of ['temp', 'wet', 'water']) out[c] += CLIMATE[k][c] * w;
    });
    for (const c of ['temp', 'wet', 'water']) out[c] /= wsum;
    out.s = best; out.ri = bi;
    return out;
  },

  generate(seed, homeRegion) {
    this.seed = seed;
    const rng = mulberry32(seed);
    const tiles = this.tiles = new Uint8Array(WW * WH);
    const regionMap = this.regionMap = new Uint8Array(WW * WH);
    this.landVal = new Float32Array(WW * WH);
    for (let y = 0; y < WH; y++) {
      for (let x = 0; x < WW; x++) {
        const c = this.landInfo(x, y);
        regionMap[y * WW + x] = c.ri;
        const rough = REGION_KEYS[c.ri] === 'alola' ? 1.5 : .9;
        const land = c.s + (fbm(x / 34, y / 34, seed + 5, 4) - .5) * rough;
        this.landVal[y * WW + x] = land;
        const e = fbm(x / 44, y / 44, seed, 5) + (1 - Math.min(c.s, 1)) * .12;
        const m = fbm(x / 38, y / 38, seed + 77, 4) + c.wet;
        const temp = c.temp + (fbm(x / 30, y / 30, seed + 191, 2) - .5) * .25;
        const g = valueNoise(x / 6, y / 6, seed + 313);
        const pole = Math.min(y, WH - 1 - y);
        let t;
        if (pole < 18) t = pole < 9 || g > .6 ? T.MOUNT : T.SNOW;
        else if (pole < 30 && land >= 1) t = g > .5 ? T.SNOW : T.DEEP;
        else if (land >= 1.12 - c.water) t = T.DEEP;
        else if (land >= 1 - c.water) t = T.WATER;
        else if (land >= .95 - c.water) t = temp < -.25 ? T.SNOW : T.SAND;
        else if (e > .7) t = T.MOUNT;
        else if (e > .65) t = T.CAVE;
        else if (temp < -.22) t = g > .55 ? T.SNOWTALL : (m > .6 && g < .3 ? T.TREE : T.SNOW);
        else if (temp > .18 && m < .44) t = (g > .8 ? T.CAVE : T.DESERT);
        else if (m > .59) t = (g > .72 ? T.TALL : T.TREE);
        else if (g > .56) t = T.TALL;
        else if (g < .08) t = T.FLOWER;
        else t = T.GRASS;
        tiles[y * WW + x] = t;
      }
    }
    this.placeTowns(rng, homeRegion);
    this.carveRoads(rng);
    this.stampTowns();
    this.buildPools();
  },

  placeTowns(rng, homeRegion) {
    this.towns = [];
    let id = 0;
    for (const region of REGION_KEYS) {
      const [rx, ry, r] = REGION_POS[region];
      const placed = [];
      let minD = 30;
      for (let tries = 0; placed.length < 10 && tries < 6000; tries++) {
        if (tries % 1500 === 1499) minD -= 5;
        const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * r * .78;
        const cx = Math.round(rx + Math.cos(a) * rr), cy = Math.round(ry + Math.sin(a) * rr);
        const x = cx - 8, y = cy - 6;
        if (x < 4 || y < 34 || x + TOWN_W > WW - 4 || y + TOWN_H > WH - 34) continue;
        if (this.regionAt(cx, cy) !== region || this.landVal[cy * WW + cx] > .8) continue;
        if (placed.some(p => Math.hypot(p.cx - cx, p.cy - cy) < minD)) continue;
        if (this.towns.some(p => Math.hypot(p.cx - cx, p.cy - cy) < 24)) continue;
        placed.push({ x, y, cx, cy });
      }
      // 家鄉在地區邊緣、聯盟在家鄉的另一側
      placed.sort((p, q) => Math.hypot(q.cx - rx, q.cy - ry) - Math.hypot(p.cx - rx, p.cy - ry));
      const home = placed[0];
      const far = placed.slice(1).sort((p, q) => Math.hypot(q.cx - home.cx, q.cy - home.cy) - Math.hypot(p.cx - home.cx, p.cy - home.cy));
      const order = [home, ...far.slice(1), far[0]];
      order.forEach((p, k) => {
        const kind = k === 0 ? 'home' : k === order.length - 1 ? 'league' : 'gym';
        let name;
        if (kind === 'home') name = REGIONS[region].home;
        else if (kind === 'league') name = REGIONS[region].n + '寶可夢聯盟';
        else name = TOWN_A[Math.floor(rng() * TOWN_A.length)] + TOWN_A[Math.floor(rng() * TOWN_A.length)] + TOWN_B[Math.floor(rng() * TOWN_B.length)];
        this.towns.push({ id: id++, region, kind, gym: kind === 'gym' ? k - 1 : -1, name, x: p.x, y: p.y, cx: p.cx, cy: p.cy });
      });
    }
    this.homeTown = this.towns.find(t => t.region === homeRegion && t.kind === 'home');
  },

  carveRoads(rng) {
    const edges = [];
    const byRegion = {};
    for (const t of this.towns) (byRegion[t.region] = byRegion[t.region] || []).push(t);
    const d2 = (a, b) => (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2;
    for (const list of Object.values(byRegion)) {
      // Prim 最小生成樹 + 少量額外道路
      const inTree = [list[0]], rest = list.slice(1);
      while (rest.length) {
        let best = null;
        for (const a of inTree) for (const b of rest) {
          const d = d2(a, b);
          if (!best || d < best[2]) best = [a, b, d];
        }
        edges.push([best[0], best[1]]);
        inTree.push(best[1]);
        rest.splice(rest.indexOf(best[1]), 1);
      }
      for (let k = 0; k < 2; k++) {
        const a = list[Math.floor(rng() * list.length)];
        const near = list.filter(b => b !== a).sort((p, q) => d2(a, p) - d2(a, q));
        edges.push([a, near[1] || near[0]]);
      }
    }
    // 地區之間的連線（陸路或跨海大橋），依世界地圖相對位置
    for (const [ra, rb] of REGION_LINKS) {
      const A = byRegion[ra], B = byRegion[rb];
      const pairs = [];
      for (const a of A) for (const b of B) pairs.push([a, b, d2(a, b)]);
      pairs.sort((p, q) => p[2] - q[2]);
      edges.push([pairs[0][0], pairs[0][1]]);
      const second = pairs.find(p => p[0] !== pairs[0][0] && p[1] !== pairs[0][1]);
      if (second && second[2] < pairs[0][2] * 2.5) edges.push([second[0], second[1]]);
    }
    this.trainers = new Map();
    for (const [a, b] of edges) this.carve(a, b, rng);
  },

  carve(a, b, rng) {
    const pts = [];
    const wx = Math.round(a.cx + (b.cx - a.cx) * (.3 + rng() * .4) + (rng() - .5) * 30);
    const wy = Math.round(a.cy + (b.cy - a.cy) * (.3 + rng() * .4) + (rng() - .5) * 30);
    const seg = (x0, y0, x1, y1) => {
      const hFirst = rng() < .5;
      const legs = hFirst ? [[x1, y0], [x1, y1]] : [[x0, y1], [x1, y1]];
      let x = x0, y = y0;
      for (const [tx, ty] of legs) {
        while (x !== tx || y !== ty) {
          const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
          x += dx; y += dy;
          pts.push([x, y, dx !== 0 ? 'h' : 'v']);
        }
      }
    };
    seg(a.cx, a.cy, wx, wy);
    seg(wx, wy, b.cx, b.cy);
    for (const [x, y] of pts) {
      for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) {
        const px = x + ox, py = y + oy;
        if (!this.inside(px, py)) continue;
        const t = this.tile(px, py);
        if (t === T.WATER || t === T.DEEP || t === T.BRIDGE) this.set(px, py, T.BRIDGE);
        else this.set(px, py, T.PATH);
      }
    }
    // 在道路旁安排訓練家
    for (let i = 14; i < pts.length - 14; i += 17) {
      if (rng() > .55) continue;
      const [x, y, dir] = pts[i];
      const side = rng() < .5 ? -1 : 2;
      const tx = dir === 'h' ? x : x + side, ty = dir === 'h' ? y + side : y;
      if (!this.inside(tx, ty)) continue;
      const t = this.tile(tx, ty);
      if (t === T.PATH || t === T.BRIDGE || t === T.WATER || t === T.DEEP) continue;
      const near = this.towns.some(tw => tx > tw.x - 4 && ty > tw.y - 4 && tx < tw.x + TOWN_W + 4 && ty < tw.y + TOWN_H + 4);
      if (near) continue;
      this.set(tx, ty, T.GRASS);
      const face = dir === 'h' ? (side < 0 ? 'down' : 'up') : (side < 0 ? 'right' : 'left');
      const cls = Math.floor(rng() * TRAINER_CLASSES.length);
      this.trainers.set(tx + ',' + ty, {
        x: tx, y: ty, dir: face, cls, name: TRAINER_NAMES[Math.floor(rng() * TRAINER_NAMES.length)],
        seed: Math.floor(rng() * 1e9),
      });
    }
  },

  stampTowns() {
    this.buildings = [];
    this.doors = new Map();
    for (const t of this.towns) {
      for (let y = -2; y < TOWN_H + 2; y++) for (let x = -2; x < TOWN_W + 2; x++) {
        const px = t.x + x, py = t.y + y;
        const inner = x >= 0 && y >= 0 && x < TOWN_W && y < TOWN_H;
        if (inner) this.set(px, py, T.TOWN);
        else {
          const cur = this.tile(px, py);
          if (cur !== T.PATH && cur !== T.BRIDGE) this.set(px, py, (x + y) % 5 === 0 ? T.FLOWER : T.GRASS);
        }
      }
      const add = (kind, bx, by, w, h, dx) => {
        const b = { kind, town: t, x: t.x + bx, y: t.y + by, w, h, door: { x: t.x + bx + dx, y: t.y + by + h - 1 } };
        this.buildings.push(b);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.set(b.x + x, b.y + y, T.BLDG);
        this.set(b.door.x, b.door.y, T.DOOR);
        this.doors.set(b.door.x + ',' + b.door.y, b);
      };
      add('center', 2, 1, 5, 4, 2);
      add('mart', 9, 1, 4, 4, 1);
      if (t.kind === 'gym') add('gym', 5, 6, 6, 5, 2);
      if (t.kind === 'home') { add('house', 2, 7, 4, 3, 1); add('lab', 9, 6, 5, 4, 2); }
      if (t.kind === 'league') add('league', 4, 6, 8, 5, 3);
    }
  },

  // 依起點距離決定野生寶可夢與訓練家的等級
  levelAt(x, y) {
    const h = this.homeTown;
    const d = Math.hypot(x - h.cx, y - h.cy);
    return U.clamp(Math.floor(3 + d / 8.5), 2, 100);
  },

  buildPools() {
    const pools = {};
    for (const b of Object.keys(BIOME_TYPES)) pools[b] = [];
    for (const k in POKEDEX) {
      const s = POKEDEX[k];
      for (const [b, tw] of Object.entries(BIOME_TYPES)) {
        let w = 0;
        s.t.forEach((t, i) => { if (tw[t]) w = Math.max(w, tw[t] * (i === 0 ? 1 : .6)); });
        if (b === 'water' && !s.t.includes('water')) w = 0;
        if (w > 0) pools[b].push({ id: s.id, w, g: s.g, lg: s.lg, wm: s.wm, types: s.t });
      }
    }
    this.pools = pools;
  },

  rollWild(x, y, biome) {
    const region = this.regionAt(x, y);
    const gen = REGIONS[region].gen;
    let L = U.clamp(this.levelAt(x, y) + U.ri(-2, 2), 2, 100);
    const pool = this.pools[biome];
    const night = U.isNight();
    // 傳說／幻之寶可夢：極低機率
    if (L >= 35 && U.chance(1 / 350)) {
      const legends = pool.filter(p => p.lg && p.wm <= L);
      if (legends.length) return Mon.create(U.pick(legends).id, L);
    }
    const local = U.chance(.75);
    const build = (useGen, useLevel) => pool.filter(p => !p.lg && (!useGen || p.g === gen) && (!useLevel || p.wm <= L)).map(p => {
      let w = p.w;
      const s = POKEDEX[p.id];
      const lvlEvo = (s.ev || []).find(e => e.lvl);
      if (lvlEvo && L >= lvlEvo.lvl + 6) w *= .15;
      if (night && (p.types.includes('ghost') || p.types.includes('dark'))) w *= 2.5;
      return { id: p.id, w };
    });
    let cands = build(local, true);
    if (!cands.length) cands = build(false, true);
    if (!cands.length) cands = build(false, false);
    return Mon.create(U.weighted(cands).id, L);
  },

  // 從指定屬性中挑選適合等級的寶可夢（訓練家、館主用）
  pickForLevel(rnd, L, { types = null, gen = null, strong = false } = {}) {
    let list = Object.values(POKEDEX).filter(s => !s.lg && s.wm <= L);
    if (types) list = list.filter(s => s.t.some(t => types.includes(t)));
    const fitting = list.filter(s => {
      const lv = (s.ev || []).find(e => e.lvl);
      if (lv && L >= lv.lvl + 4) return false;
      if ((s.ev || []).length && L >= (strong ? 30 : 40)) return false;
      return true;
    });
    if (fitting.length) list = fitting;
    if (gen) {
      const g = list.filter(s => s.g === gen);
      if (g.length >= 3) list = g;
    }
    if (strong) list = list.sort((a, b) => Mon.bst(b.id) - Mon.bst(a.id)).slice(0, Math.max(6, Math.floor(list.length / 3)));
    if (!list.length) list = Object.values(POKEDEX).filter(s => !s.lg);
    return list[Math.floor(rnd() * list.length)].id;
  },

  trainerParty(tr) {
    const rnd = mulberry32(tr.seed);
    const cls = TRAINER_CLASSES[tr.cls];
    const L = this.levelAt(tr.x, tr.y);
    const gen = REGIONS[this.regionAt(tr.x, tr.y)].gen;
    const n = 1 + Math.floor(rnd() * Math.min(3, 1 + L / 12));
    const party = [];
    for (let i = 0; i < n; i++) {
      const lv = U.clamp(L - 1 + Math.floor(rnd() * 3), 2, 100);
      party.push(Mon.create(this.pickForLevel(rnd, lv, { types: cls.types, gen: rnd() < .7 ? gen : null }), lv, { shiny: false }));
    }
    return party;
  },

  gymParty(town) {
    const rnd = mulberry32(this.seed + town.id * 7919);
    const [, type] = LEADERS[town.region][town.gym];
    const L = this.levelAt(town.cx, town.cy) + 4;
    const n = U.clamp(2 + Math.floor(L / 14), 2, 6);
    const gen = REGIONS[town.region].gen;
    const party = [];
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const lv = Math.min(100, L - (n - 1 - i));
      let id, tries = 0;
      do { id = this.pickForLevel(rnd, lv, { types: [type], gen, strong: i === n - 1 }); } while (used.has(id) && ++tries < 30);
      used.add(id);
      party.push(Mon.create(id, lv, { shiny: false, perfect: 20 }));
    }
    return party;
  },

  championParty(town) {
    const rnd = mulberry32(this.seed + town.id * 104729);
    const L = Math.min(100, this.levelAt(town.cx, town.cy) + 10);
    const reg = REGIONS[town.region];
    const party = [];
    const used = new Set();
    for (let i = 0; i < 6; i++) {
      let id, tries = 0;
      do { id = this.pickForLevel(rnd, L, { gen: reg.gen, strong: true }); } while (used.has(id) && ++tries < 10);
      used.add(id);
      party.push(Mon.create(id, Math.min(100, L - 5 + i), { shiny: false, perfect: 31 }));
    }
    return party;
  },

  // ---------- 繪製（像素美術在 sprites.js） ----------
  tileCache: null,

  makeTiles() {
    this.tileCache = Spr.makeTiles();
  },

  drawTile(g, t, x, y, px, py, frame) {
    const arr = this.tileCache[t] || this.tileCache[T.GRASS];
    let img;
    if (t === T.WATER || t === T.DEEP) img = arr[frame % 4];
    else if (t === T.FLOWER) img = arr[(Math.floor(hash2(x, y, 7) * 2) * 2) + (frame >> 1) % 2];
    else img = arr[Math.floor(hash2(x, y, 7) * arr.length)];
    g.drawImage(img, px, py);
    // 道路邊緣長出草
    if (t === T.PATH) {
      const grassy = n => n === T.GRASS || n === T.TALL || n === T.FLOWER || n === T.TREE;
      const e = this.tileCache.edges;
      if (grassy(this.tile(x, y - 1))) g.drawImage(e.top, px, py);
      if (grassy(this.tile(x, y + 1))) g.drawImage(e.bottom, px, py);
      if (grassy(this.tile(x - 1, y))) g.drawImage(e.left, px, py);
      if (grassy(this.tile(x + 1, y))) g.drawImage(e.right, px, py);
    }
  },

  drawBuilding(g, b, ox, oy) {
    g.drawImage(Spr.building(b), b.x * TILE - ox, b.y * TILE - oy);
  },

  drawPerson(g, px, py, dir, pal, frame, opts = {}) {
    const img = Assets.playerSheet && pal === Spr.PLAYER ? Assets.playerFrame(dir, frame) : null;
    if (opts.surf) {
      g.drawImage(Spr.surfBlob((opts.tick >> 4) % 2), px, py + 10);
      const c = img || Spr.character(pal, dir, 0);
      g.drawImage(c, 0, 0, c.width, 30, px, py - 6, c.width, 30);
      return;
    }
    const c = img || Spr.character(pal, dir, frame);
    g.drawImage(c, px + (TILE - c.width) / 2, py + TILE - c.height);
  },

  // 整張世界地圖（1 格 = 1 像素）
  mapCanvas: null,
  renderMap() {
    const c = document.createElement('canvas'); c.width = WW; c.height = WH;
    const g = c.getContext('2d');
    const img = g.createImageData(WW, WH);
    const col = {
      [T.GRASS]: [124, 207, 90], [T.TALL]: [76, 175, 60], [T.TREE]: [31, 107, 42], [T.WATER]: [74, 144, 226], [T.DEEP]: [47, 111, 196],
      [T.SAND]: [241, 223, 163], [T.MOUNT]: [110, 98, 87], [T.CAVE]: [167, 137, 106], [T.SNOW]: [244, 248, 255], [T.SNOWTALL]: [200, 222, 240],
      [T.DESERT]: [232, 196, 122], [T.PATH]: [230, 200, 140], [T.BRIDGE]: [160, 112, 60], [T.TOWN]: [240, 240, 240], [T.BLDG]: [220, 80, 80],
      [T.DOOR]: [220, 80, 80], [T.FLOWER]: [140, 210, 100],
    };
    for (let i = 0; i < WW * WH; i++) {
      const cc = col[this.tiles[i]] || [0, 0, 0];
      img.data[i * 4] = cc[0]; img.data[i * 4 + 1] = cc[1]; img.data[i * 4 + 2] = cc[2]; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.mapCanvas = c;
  },
};
