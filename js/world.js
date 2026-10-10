// 開放世界：地形生成、城鎮道路、訓練家、野生寶可夢、繪製
const T = { GRASS: 0, TALL: 1, TREE: 2, WATER: 3, SAND: 4, MOUNT: 5, CAVE: 6, SNOW: 7, SNOWTALL: 8, DESERT: 9, PATH: 10, BRIDGE: 11, TOWN: 12, BLDG: 13, DOOR: 14, FLOWER: 15, DEEP: 16, LANDMARK: 17 };
const TILE = 48; // 16px × 3（GBA 畫面放大 3 倍）
// [寬, 高, 門的 x, 門的 y]
const BUILDING_SIZE = { center: [4, 4, 1, 3], mart: [4, 4, 1, 3], house: [5, 5, 3, 4], lab: [7, 5, 4, 4], gym: [6, 5, 3, 4], league: [11, 7, 5, 5], house_s: [4, 4, 1, 3], sign: [1, 1, 0, 0] };
const WW = 960, WH = 600;
const WORLD_VER = 5; // 世界配置的版本（見 World.generate）
const SAVE_VER = 2;  // 存檔格式的版本（見 Game.MIGRATE）
const TOWN_W = 16, TOWN_H = 12;
const BLOCKED = new Set([T.TREE, T.MOUNT, T.BLDG, T.LANDMARK]);

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
  // 每格的氣候：各地區中心依距離加權（每次生成世界要算 57 萬次，所以先把地區資料攤平成陣列）
  // 計算順序與運算和原本完全相同，結果逐位元一致（世界不會因此改變）
  landInfo(x, y, out = { temp: 0, wet: 0, water: 0, s: 0, ri: 0 }) {
    const L = this._landTab || (this._landTab = REGION_KEYS.map(k => [...REGION_POS[k], CLIMATE[k].temp, CLIMATE[k].wet, CLIMATE[k].water]));
    let best = 9, bi = 0, wsum = 0, temp = 0, wet = 0, water = 0;
    for (let i = 0; i < L.length; i++) {
      const R = L[i];
      const d = Math.hypot(x - R[0], y - R[1]) / R[2];
      if (d < best) { best = d; bi = i; }
      const w = 1 / Math.pow(Math.max(d, .05), 4);
      wsum += w;
      temp += R[3] * w; wet += R[4] * w; water += R[5] * w;
    }
    out.temp = temp / wsum; out.wet = wet / wsum; out.water = water / wsum;
    out.s = best; out.ri = bi;
    return out;
  },

  // worldVer：世界配置的版本（存檔記錄，舊存檔沿用舊配置）
  //   1：道館編號依「離家由遠到近」（錯誤：第一座道館在地區最遠處）
  //   2：道館編號依「離家由近到遠」，城鎮編號與位置不變，只改哪座城鎮是第幾座道館
  //   3：關都重要城鎮改用手工配置（data/towns.js：小屋事件、告示牌、花圃、池塘）
  //   4：道路旁增加訓練家（原本平均 38 格道路才有 1 位，路上幾乎沒有對戰；不改變地形）
  //   5：合眾到帕底亞的地標（等離子隊、閃焰隊、天星隊、寶主寶可夢、傳說寶可夢；js/regions2.js 的 ver: 5）
  generate(seed, homeRegion, worldVer = WORLD_VER) {
    this.seed = seed;
    this.worldVer = worldVer;
    this._ring = null;
    const rng = mulberry32(seed);
    const tiles = this.tiles = new Uint8Array(WW * WH);
    const regionMap = this.regionMap = new Uint8Array(WW * WH);
    this.landVal = new Float32Array(WW * WH);
    const c = { temp: 0, wet: 0, water: 0, s: 0, ri: 0 };
    for (let y = 0; y < WH; y++) {
      for (let x = 0; x < WW; x++) {
        this.landInfo(x, y, c);
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
    this.alignTrees();
    this.placeLandmarks(rng);
    this.placeLegends(rng);
    this.alignTrees();
    if (this.worldVer >= 4) this.placeRouteTrainers();
    this.buildPools();
  },

  // 道路旁的訓練家（第 4 版）：每個地區約每 8 格道路 1 位，彼此相隔 7 格以上，站在路邊面向道路
  // 只放在草地等可通行的格子上，不改變地形，也不會擋住道路
  placeRouteTrainers() {
    const rng = mulberry32((this.seed ^ 0x7a1e5) >>> 0);
    const ok = new Set([T.GRASS, T.TALL, T.FLOWER, T.SAND, T.SNOW, T.DESERT]);
    const cand = [], pathCount = {};
    for (let y = 1; y < WH - 1; y++) for (let x = 1; x < WW - 1; x++) {
      if (this.tiles[y * WW + x] !== T.PATH) continue;
      const r = this.regionAt(x, y);
      pathCount[r] = (pathCount[r] || 0) + 1;
      for (const [dx, dy, face] of [[0, -1, 'down'], [0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left']]) {
        if (ok.has(this.tile(x + dx, y + dy))) cand.push([x + dx, y + dy, face, r]);
      }
    }
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const placed = {}, list = [...this.trainers.values()];
    const near = (x, y, d) => list.some(t => Math.abs(t.x - x) + Math.abs(t.y - y) < d);
    for (const [x, y, face, r] of cand) {
      if ((placed[r] || 0) >= (pathCount[r] || 0) / 10) continue;
      const k = x + ',' + y;
      if (this.trainers.has(k) || this.doors.has(k) || (this.landmarks && this.landmarks.has(k)) || (this.legends && this.legends.has(k))) continue;
      if (this.towns.some(tw => x > tw.x - 5 && y > tw.y - 5 && x < tw.x + TOWN_W + 5 && y < tw.y + TOWN_H + 5)) continue;
      if (near(x, y, 7)) continue;
      const tr = { x, y, dir: face, cls: Math.floor(rng() * TRAINER_CLASSES.length), name: TRAINER_NAMES[Math.floor(rng() * TRAINER_NAMES.length)], seed: Math.floor(rng() * 1e9) };
      this.trainers.set(k, tr); list.push(tr);
      placed[r] = (placed[r] || 0) + 1;
    }
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
        const rnd = TOWN_A[Math.floor(rng() * TOWN_A.length)] + TOWN_A[Math.floor(rng() * TOWN_A.length)] + TOWN_B[Math.floor(rng() * TOWN_B.length)];
        // 原作的城鎮名稱（道館所在城鎮、聯盟），沒有資料的地區用隨機名稱
        if (kind === 'home') name = REGIONS[region].home;
        else if (kind === 'league') name = (typeof LEAGUE_TOWN !== 'undefined' && LEAGUE_TOWN[region]) || REGIONS[region].n + '寶可夢聯盟';
        const gymIdx = kind !== 'gym' ? -1 : this.worldVer >= 2 ? (order.length - 2) - k : k - 1;
        if (kind === 'gym') name = (typeof GYM_TOWNS !== 'undefined' && GYM_TOWNS[region] && GYM_TOWNS[region][gymIdx]) || rnd;
        this.towns.push({ id: id++, region, kind, gym: gymIdx, name, x: p.x, y: p.y, cx: p.cx, cy: p.cy });
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
    this.signs = new Map();
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
      // 建築尺寸與門的位置對應綠寶石原作（寶可夢中心、友好商店取自古金鎮，住家與研究所取自未白鎮，
      // 道館取自橙華市，聯盟取自彩幽市）；dy 是門所在的列，門以下的列（聯盟的台階）可以通行
      const add = (kind, bx, by) => {
        const [w, h, dx, dy] = BUILDING_SIZE[kind];
        const b = { kind, town: t, x: t.x + bx, y: t.y + by, w, h, door: { x: t.x + bx + dx, y: t.y + by + dy } };
        this.buildings.push(b);
        for (let y = 0; y <= dy; y++) for (let x = 0; x < w; x++) this.set(b.x + x, b.y + y, T.BLDG);
        this.set(b.door.x, b.door.y, T.DOOR);
        this.doors.set(b.door.x + ',' + b.door.y, b);
      };
      const design = this.worldVer >= 3 && typeof TOWN_DESIGNS !== 'undefined' && t.kind !== 'league' && TOWN_DESIGNS[t.name];
      if (design) this.stampDesign(t, design, add);
      else if (t.kind === 'league') {
        add('center', 0, 1); add('mart', 12, 1); add('league', 2, 5);
      } else {
        add('center', 1, 1); add('mart', 11, 1);
        if (t.kind === 'gym') add('gym', 5, 6);
        if (t.kind === 'home') { add('house', 1, 6); add('lab', 8, 6); }
      }
    }
  },

  // 手工配置的城鎮（data/towns.js）
  stampDesign(t, design, add) {
    const KIND = { C: 'center', M: 'mart', G: 'gym', H: 'house', L: 'lab' };
    const GROUND = { '.': T.TOWN, ',': T.GRASS, f: T.FLOWER, w: T.WATER, '#': T.TOWN };
    design.rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (GROUND[c] !== undefined) this.set(t.x + x, t.y + y, GROUND[c]);
    }));
    design.rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (KIND[c]) add(KIND[c], x, y);
      else if (design.houses && design.houses[c]) { add('house_s', x, y); this.buildings[this.buildings.length - 1].ev = design.houses[c]; }
      else if (/[0-9]/.test(c)) {
        const sx = t.x + x, sy = t.y + y;
        this.set(sx, sy, T.BLDG);
        this.buildings.push({ kind: 'sign', town: t, x: sx, y: sy, w: 1, h: 1, door: { x: sx, y: sy } });
        this.signs.set(sx + ',' + sy, design.signs[c]);
      }
    }));
  },

  // 地標（洞窟入口等）：放在指定城鎮附近，並開一條路連到最近的道路
  placeLandmarks(rng) {
    this.landmarks = new Map();
    if (typeof LANDMARKS === 'undefined') return;
    const hard = [T.WATER, T.DEEP, T.BRIDGE, T.PATH, T.TOWN, T.BLDG, T.DOOR, T.LANDMARK];
    for (const [region, list] of Object.entries(LANDMARKS)) for (const lm of list) {
      if (lm.ver && lm.ver > this.worldVer) continue; // 較新版本才有的地標（舊存檔的世界不變）
      const anchor = this.towns.find(t => t.region === region && (lm.near === 'home' ? t.kind === 'home' : lm.near === 'league' ? t.kind === 'league' : t.gym === lm.near));
      if (!anchor) continue;
      let best = null;
      for (let tries = 0; tries < 800 && !best; tries++) {
        const ang = rng() * Math.PI * 2, r = 12 + rng() * (lm.sea ? 30 : 16);
        const x = Math.round(anchor.cx + Math.cos(ang) * r), y = Math.round(anchor.cy + Math.sin(ang) * r);
        if (!this.inside(x - 3, y - 3) || !this.inside(x + 3, y + 3) || this.regionAt(x, y) !== region) continue;
        if ([[0, 0], [0, 1], [0, -2], [2, 0], [-2, 0]].some(([dx, dy]) => this.townAt(x + dx, y + dy))) continue;
        let near = false;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (this.trainers.has((x + dx) + ',' + (y + dy)) || this.landmarks.has((x + dx) + ',' + (y + dy))) near = true;
        if (near) continue;
        const t = this.tile(x, y);
        if (lm.sea) { if (t === T.DEEP || t === T.WATER) best = [x, y]; }
        else if (!hard.includes(t) && !hard.includes(this.tile(x, y + 1))) best = [x, y];
      }
      if (!best) continue;
      const [x, y] = best;
      if (lm.sea) {
        // 海上的小島：沙灘與岩石
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.set(x + dx, y + dy, Math.abs(dx) + Math.abs(dy) <= 3 ? T.SAND : this.tile(x + dx, y + dy));
        for (let dx = -1; dx <= 1; dx++) { this.set(x + dx, y - 1, T.MOUNT); this.set(x + dx, y - 2, T.MOUNT); }
      } else {
        for (let dy = -2; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) this.set(x + dx, y + dy, T.MOUNT);
        this.set(x, y + 1, T.PATH);
        this.connectToRoad(x, y + 1);
      }
      this.set(x, y, T.LANDMARK);
      this.landmarks.set(x + ',' + y, { ...lm, x, y, region });
    }
  },
  // 傳說與幻之寶可夢：每種只有一隻，以實體站在固定位置（依世界種子決定）
  // 只放沒有進化前型態的物種（科斯莫古、熊徒弟等靠進化取得最終型態）；關都的事件傳說站在地標入口前
  placeLegends(rng) {
    this.legends = new Map();
    const genRegion = {};
    for (const [k, r] of Object.entries(REGIONS)) genRegion[r.gen] = k;
    const species = Object.values(POKEDEX).filter(s => s.lg && !(s.pre && POKEDEX[s.pre] && POKEDEX[s.pre].lg)).sort((a, b) => a.id - b.id);
    const taken = (x, y) => [...this.legends.values()].some(l => Math.abs(l.x - x) + Math.abs(l.y - y) < 10);
    const landTiles = new Set([T.GRASS, T.TALL, T.FLOWER, T.SNOW, T.SNOWTALL, T.DESERT, T.CAVE, T.SAND]);
    for (const s of species) {
      const region = genRegion[s.g] || 'kanto';
      const [lo, hi] = this.regionBand(region);
      const bst = Mon.bst(s.id);
      const lv = U.clamp(Math.max(50, hi + 5) + (bst >= 670 ? 10 : 0), 50, 90);
      // 事件傳說：站在地標入口前
      const lm = [...this.landmarks.values()].find(l => l.sp === s.id);
      if (lm) {
        this.legends.set(lm.x + ',' + (lm.y + 1), { sp: s.id, x: lm.x, y: lm.y + 1, lv: lm.lv || lv, region, lm });
        continue;
      }
      const water = s.t[0] === 'water';
      const home = this.towns.find(t => t.region === region && t.kind === 'home');
      const league = this.towns.find(t => t.region === region && t.kind === 'league');
      const total = Math.hypot(league.cx - home.cx, league.cy - home.cy) || 1;
      const [rx, ry, rr] = REGION_POS[region];
      let best = null;
      for (let tries = 0; tries < 3000 && !best; tries++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * rr * (water ? 1.35 : 1);
        const x = Math.round(rx + Math.cos(a) * d), y = Math.round(ry + Math.sin(a) * d);
        if (!this.inside(x, y - 1) || !this.inside(x, y + 1) || this.regionAt(x, y) !== region) continue;
        // 遠離家鄉（地區後半段）、不在城鎮附近、不和其他傳說擠在一起
        if (Math.hypot(x - home.cx, y - home.cy) / total < .45 && tries < 2500) continue;
        if (this.towns.some(t => Math.abs(t.cx - x) < 14 && Math.abs(t.cy - y) < 12) || taken(x, y)) continue;
        if (this.trainers.has(x + ',' + y) || this.landmarks.has(x + ',' + y)) continue;
        const t = this.tile(x, y);
        if (water ? (t === T.WATER || t === T.DEEP) : landTiles.has(t)) best = [x, y];
      }
      if (!best) continue;
      const [x, y] = best;
      if (!water) this.connectToRoad(x, y);
      this.legends.set(x + ',' + y, { sp: s.id, x, y, lv, region });
    }
  },
  // 地圖上仍存在（尚未被捕捉）的傳說
  legendAt(x, y) {
    const l = this.legends && this.legends.get(x + ',' + y);
    return l && !(G.state && G.state.legendsCaught && G.state.legendsCaught[l.sp]) ? l : null;
  },

  // 從 (x,y) 找最近的道路或城鎮，沿途鋪成道路（水面鋪橋）
  connectToRoad(sx, sy) {
    const R = 60, W2 = R * 2 + 1;
    const prev = new Int32Array(W2 * W2).fill(-1);
    const key = (x, y) => (y - sy + R) * W2 + (x - sx + R);
    const q = [[sx, sy]];
    prev[key(sx, sy)] = key(sx, sy);
    let goal = null;
    while (q.length && !goal) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (Math.abs(nx - sx) > R || Math.abs(ny - sy) > R || !this.inside(nx, ny)) continue;
        const k = key(nx, ny);
        if (prev[k] !== -1) continue;
        const t = this.tile(nx, ny);
        if (t === T.BLDG || t === T.DOOR || t === T.LANDMARK) continue;
        prev[k] = key(x, y);
        if ((t === T.PATH || t === T.TOWN || t === T.BRIDGE) && Math.abs(nx - sx) + Math.abs(ny - sy) > 1) { goal = [nx, ny]; break; }
        q.push([nx, ny]);
      }
    }
    if (!goal) return;
    let k = key(goal[0], goal[1]);
    const start = key(sx, sy);
    while (k !== start) {
      const x = (k % W2) - R + sx, y = Math.floor(k / W2) - R + sy;
      const t = this.tile(x, y);
      if (t !== T.PATH && t !== T.TOWN && t !== T.BRIDGE) this.set(x, y, t === T.WATER || t === T.DEEP ? T.BRIDGE : T.PATH);
      k = prev[k];
    }
  },

  // 綠寶石的樹是 2×2 格；把樹對齊到偶數座標的 2×2 區塊
  // 樹木對齊 2×2：每塊有兩棵以上的樹而且沒有障礙（道路、建築、訓練家）就整塊種樹，否則移除樹
  alignTrees() {
    const tiles = this.tiles;
    const soft = new Uint8Array(256);
    for (const t of [T.GRASS, T.TALL, T.FLOWER, T.SNOW, T.SNOWTALL, T.TREE]) soft[t] = 1;
    const off = [0, 1, WW, WW + 1];
    for (let y = 0; y < WH - 1; y += 2) for (let x = 0; x < WW - 1; x += 2) {
      const i0 = y * WW + x;
      let trees = 0, hard = false, snowy = false;
      for (let k = 0; k < 4; k++) {
        const t = tiles[i0 + off[k]];
        if (t === T.TREE) trees++;
        else if (!soft[t]) hard = true;
        if (t === T.SNOW || t === T.SNOWTALL) snowy = true;
      }
      if (!trees) continue;
      // 訓練家站的格子不能種樹（只在有樹的區塊才需要檢查）
      if (!hard && this.trainers.size) for (let k = 0; k < 4 && !hard; k++) if (this.trainers.has((x + (k & 1)) + ',' + (y + (k >> 1)))) hard = true;
      const fill = trees >= 2 && !hard ? T.TREE : (snowy ? T.SNOW : T.GRASS);
      for (let k = 0; k < 4; k++) {
        const i = i0 + off[k];
        if (fill === T.TREE || tiles[i] === T.TREE) tiles[i] = fill;
      }
    }
  },

  // 地區與出發地區之間隔了幾個地區（依 REGION_LINKS 的連接）
  regionRing(region) {
    if (!this._ring) {
      const start = this.homeTown.region;
      this._ring = { [start]: 0 };
      const q = [start];
      while (q.length) {
        const r = q.shift();
        for (const [a, b] of REGION_LINKS) {
          const n = a === r ? b : b === r ? a : null;
          if (n && this._ring[n] === undefined) { this._ring[n] = this._ring[r] + 1; q.push(n); }
        }
      }
    }
    return this._ring[region] ?? 3;
  },
  // 地區的等級帶：出發地區 Lv.3 起，每隔一個地區提高一階；地區內從家鄉往聯盟逐漸變強
  regionBand(region) {
    // 出發地區到聯盟附近約 Lv.45（像原作的冠軍之路）；其他地區維持 30 級的寬度
    const ring = Math.min(4, this.regionRing(region));
    const base = [3, 20, 35, 50, 60][ring];
    return [base, base + (ring === 0 ? 42 : 30)];
  },
  // 野生寶可夢與訓練家的等級（固定的區域等級帶；山地、岩地、外海是危險地帶）
  levelAt(x, y) {
    const region = this.regionAt(x, y);
    const [lo, hi] = this.regionBand(region);
    const home = this.towns.find(t => t.region === region && t.kind === 'home');
    const league = this.towns.find(t => t.region === region && t.kind === 'league');
    let k = 0;
    if (home && league) {
      const total = Math.hypot(league.cx - home.cx, league.cy - home.cy) || 1;
      k = U.clamp(Math.hypot(x - home.cx, y - home.cy) / total, 0, 1);
    }
    // 前期緩慢、後期加快（k^1.35；原本 1.6 讓中期的野外比道館低約 7 級，需要大量練等）；危險地帶的加成隨地區進度遞增，避免家鄉附近就出現高等級
    let L = lo + (hi - lo) * Math.pow(k, 1.35);
    const t = this.tile(x, y);
    if (t === T.MOUNT || t === T.CAVE) L += 1 + 5 * k;
    if (t === T.DEEP) L += 2 + 7 * k;
    return U.clamp(Math.floor(L), 2, 100);
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

  // 野生寶可夢的遭遇：見 js/ecology.js（rollWild、zoneTable）

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
    // 前期的訓練家只帶 1～2 隻、等級略低於當地
    const n = 1 + Math.floor(rnd() * Math.min(3, L / 10));
    const party = [];
    for (let i = 0; i < n; i++) {
      const lv = U.clamp(L - 2 + Math.floor(rnd() * 3), 2, 100);
      party.push(Mon.create(this.pickForLevel(rnd, lv, { types: cls.types, gen: rnd() < .7 ? gen : null }), lv, { shiny: false, hidden: .05, item: L >= 30 && rnd() < .3 ? 'oran-berry' : null }));
    }
    return party;
  },

  // 道館的強度依玩家的徽章總數決定（可以用任意順序挑戰）；成為該地區冠軍後是重賽隊伍
  gymLevel(town) {
    const badges = typeof Game !== 'undefined' && G.state ? Game.badgeCount() : 0;
    const rematch = G.state && G.state.champs && G.state.champs[town.region];
    if (rematch) return Math.min(100, 70 + Math.floor(badges / 4));
    // 依徽章數：Lv.12 起每枚 +5（出發地區第 8 座約 Lv.47，接近火紅葉綠的節奏）
    return Math.min(85, 12 + badges * 5);
  },
  gymParty(town) {
    const L = this.gymLevel(town);
    const tier = Math.floor(L / 6);
    const rnd = mulberry32(this.seed + town.id * 7919 + tier * 31);
    const [, type] = LEADERS[town.region][town.gym];
    const n = U.clamp(2 + Math.floor(L / 14), 2, 6);
    const gen = REGIONS[town.region].gen;
    const party = [];
    const used = new Set();
    // 招牌隊伍：依等級選前期或後期版本，取最後 n 隻（最後一隻是王牌）
    const sig = typeof SIGNATURE !== 'undefined' && SIGNATURE[town.region] && SIGNATURE[town.region].gyms[town.gym];
    const sigList = sig ? (L < 35 ? sig[0] : sig[1]).slice(-n) : null;
    for (let i = 0; i < n; i++) {
      const lv = Math.min(100, L - (n - 1 - i));
      let id, tries = 0;
      const sigIdx = sigList ? i - (n - sigList.length) : -1;
      if (sigIdx >= 0) id = sigList[sigIdx];
      else do { id = this.pickForLevel(rnd, lv, { types: [type], gen, strong: i === n - 1 }); } while ((used.has(id) || (sigList && sigList.includes(id))) && ++tries < 30);
      used.add(id);
      // 王牌寶可夢攜帶文柚果；徽章 8 枚以上時全隊攜帶對戰道具並有努力值
      const late = G.state && Game.badgeCount() >= 8;
      const pool = ['leftovers', 'life-orb', 'focus-sash', 'expert-belt', 'assault-vest', 'lum-berry', 'choice-scarf', 'rocky-helmet'];
      const item = i === n - 1 ? 'sitrus-berry' : late ? pool[Math.floor(rnd() * pool.length)] : null;
      const mon = Mon.create(id, lv, { shiny: false, perfect: late ? 31 : 20, hidden: late ? .3 : .1, item });
      if (late) {
        const s = Mon.stats(mon);
        const atk = s[1] >= s[3] ? 1 : 3;
        mon.ev = [4, 0, 0, 0, 0, 252]; mon.ev[atk] = 252;
        mon.hp = Mon.maxHp(mon);
      }
      party.push(mon);
    }
    return party;
  },

  // 四天王：第 i 位的王牌等級為冠軍等級 − 8 + 2i
  eliteParty(town, i) {
    const e = ELITE_FOUR[town.region][i];
    const champ = this.championParty(town);
    const top = champ.reduce((a, m) => Math.max(a, m.lv), 0);
    const ace = Math.min(100, top - 8 + 2 * i);
    return e.team.map((sp, k) => Mon.create(sp, U.clamp(ace - (e.team.length - 1 - k), 2, 100),
      { shiny: false, perfect: 25, hidden: .2, item: k === e.team.length - 1 ? 'sitrus-berry' : null }));
  },

  championParty(town) {
    const rnd = mulberry32(this.seed + town.id * 104729);
    // 冠軍：不低於該地區等級帶上限，也隨徽章數變強；重賽時更強
    const badges = G.state ? Game.badgeCount() : 0;
    const rematch = G.state && G.state.champs && G.state.champs[town.region];
    const L = Math.min(100, Math.max(this.regionBand(town.region)[1] + 8, Math.round(16 + badges * 4.5)) + (rematch ? 10 : 0));
    const reg = REGIONS[town.region];
    const party = [];
    const used = new Set();
    const sig = typeof SIGNATURE !== 'undefined' && SIGNATURE[town.region] && SIGNATURE[town.region].champ;
    const sigList = sig ? sig(G.state ? G.state.starter : 1) : null;
    for (let i = 0; i < 6; i++) {
      let id, tries = 0;
      if (sigList) id = sigList[i];
      else do { id = this.pickForLevel(rnd, L, { gen: reg.gen, strong: true }); } while (used.has(id) && ++tries < 10);
      used.add(id);
      // 冠軍的隊伍各自攜帶對戰道具
      const pool = ['leftovers', 'life-orb', 'choice-scarf', 'focus-sash', 'sitrus-berry', 'expert-belt', 'assault-vest', 'lum-berry', 'choice-band', 'choice-specs'];
      party.push(Mon.create(id, Math.min(100, L - 5 + i), { shiny: false, perfect: 31, hidden: .3, item: pool[Math.floor(rnd() * pool.length)] }));
    }
    return party;
  },

  // ---------- 繪製（像素美術在 sprites.js） ----------
  tileCache: null,

  makeTiles() {
    this.tileCache = Spr.makeTiles();
  },

  // 綠寶石圖塊（自動拼接）
  gen3Tile(t, x, y) {
    const at = (a, b) => this.tile(a, b);
    switch (t) {
      case T.GRASS: case T.TOWN: case T.BLDG: case T.DOOR: return Gen3.single('grass');
      case T.FLOWER: return Gen3.single('flower');
      case T.TALL: return Gen3.single('tall');
      case T.SNOW: return Gen3.single('snow');
      case T.SNOWTALL: return Gen3.single('snowtall');
      case T.CAVE: return Gen3.single('cave');
      case T.BRIDGE: return Gen3.single('bridge') || Gen3.auto('path', (a, b) => at(a, b) === T.PATH || at(a, b) === T.BRIDGE, x, y);
      case T.WATER: case T.DEEP: {
        const w = v => v === T.WATER || v === T.DEEP || v === T.BRIDGE;
        return Gen3.auto('water', (a, b) => !this.inside(a, b) || w(at(a, b)), x, y);
      }
      case T.SAND: return Gen3.auto('sand', (a, b) => at(a, b) === T.SAND || !this.inside(a, b), x, y);
      case T.DESERT: return Gen3.auto('desert', (a, b) => at(a, b) === T.DESERT || at(a, b) === T.CAVE, x, y);
      case T.PATH: return Gen3.auto('path', (a, b) => at(a, b) === T.PATH || at(a, b) === T.BRIDGE, x, y);
      case T.MOUNT: {
        let d = 0;
        while (d < 3 && at(x, y + d + 1) === T.MOUNT) d++;
        return Gen3.auto('rock', (a, b) => at(a, b) === T.MOUNT || !this.inside(a, b), x, y, d);
      }
      case T.TREE: {
        const snowy = [[0, -2], [0, 2], [-2, 0], [2, 0], [0, -1], [0, 1], [-1, 0], [1, 0]].some(([a, b]) => {
          const v = at(x + a, y + b); return v === T.SNOW || v === T.SNOWTALL;
        });
        const set = snowy ? 'snowtree' : 'tree';
        const qx = x & 1, qy = y & 1;
        // 0:1D4 1:1D5 2:1DC 3:1DD 4:1E4 5:1E5 6:1E6 7:1E7
        if (!qy) return Gen3.single(set, qx);
        if (at(x, y + 1) === T.TREE) return Gen3.single(set, 2 + qx);
        if (!qx) return Gen3.single(set, at(x - 1, y) === T.TREE ? 4 : 6);
        return Gen3.single(set, at(x + 1, y) === T.TREE ? 5 : 7);
      }
    }
    return null;
  },

  drawTile(g, t, x, y, px, py, frame) {
    // 地標：岩壁上的洞窟入口
    if (t === T.LANDMARK) {
      this.drawTile(g, T.MOUNT, x, y, px, py, frame);
      const s = TILE / 16;
      g.fillStyle = '#382818';
      g.beginPath(); g.ellipse(px + 8 * s, py + 9 * s, 6 * s, 6 * s, 0, Math.PI, 0); g.rect(px + 2 * s, py + 9 * s, 12 * s, 7 * s); g.fill();
      g.fillStyle = '#100808';
      g.beginPath(); g.ellipse(px + 8 * s, py + 10 * s, 4.5 * s, 4.5 * s, 0, Math.PI, 0); g.rect(px + 3.5 * s, py + 10 * s, 9 * s, 6 * s); g.fill();
      return;
    }
    if (Gen3.on) {
      const im = this.gen3Tile(t, x, y);
      if (im) { g.drawImage(im, px, py); return; }
    }
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
    const img = (Gen3.on && Gen3.building(b.kind)) || Spr.building(b);
    g.drawImage(img, b.x * TILE - ox, b.y * TILE - oy);
  },

  // who = { pal: 原創圖色盤, sheet: 綠寶石角色圖名稱 }
  drawPerson(g, px, py, dir, who, frame, opts = {}) {
    const bob = opts.surf ? ((opts.tick >> 4) & 1) * 3 : 0;
    if (opts.surf) {
      const blob = Gen3.on && Gen3.surfBlob(dir);
      const rider = Gen3.on && Gen3.surfFrame(dir);
      if (blob && rider) {
        // 坐騎與騎乘的主角都是 32×32，置中對齊，主角略高於坐騎
        const bx = px + (TILE - blob.width) / 2, by = py + TILE - blob.height + 6 + bob;
        g.drawImage(blob, bx, by);
        g.drawImage(rider, px + (TILE - rider.width) / 2, by - 12);
        return;
      }
      g.drawImage(Spr.surfBlob((opts.tick >> 4) % 2), px, py + 14);
      const c = Spr.character(who.pal, dir, 0);
      g.drawImage(c, 0, 0, c.width, 45, px, py - 10, c.width, 45);
      return;
    }
    const c = (Gen3.on && who.sheet && Gen3.charFrame(who.sheet, dir, frame)) || Spr.character(who.pal, dir, frame);
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
