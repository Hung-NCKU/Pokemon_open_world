// 地點專屬生態：世界切成 24×24 格的區域，每個區域、每種地形有固定的遭遇表（由世界種子決定）
//   代表物種 4 種（合計約 60%）、少見 2 種（約 25%）、稀有 1 種（約 4%）、白天限定與夜晚限定各 1 種
// 關都的地標周圍使用原作的代表物種（月見山的皮皮、無人發電廠的霹靂電球……）
// 遭遇時依等級換成適合的進化階段；圖鑑的「分布」用同一份資料顯示棲息地
const ZONE = 24;
const ECO_SLOTS = [
  ['common', 22], ['common', 16], ['common', 12], ['common', 10],
  ['uncommon', 7], ['uncommon', 5],
  ['rare', 1.5],
  ['day', 6], ['night', 6],
];
const ECO_ZH = { common: '常見', uncommon: '少見', rare: '稀有', day: '白天', night: '夜晚' };

// 關都地標周圍（半徑 14 格）的原作代表物種：[地形, 物種, 欄位]
const LANDMARK_ECO = {
  mtmoon: [['cave', 41, 'common'], ['cave', 74, 'common'], ['cave', 46, 'common'], ['cave', 35, 'rare'], ['tall', 35, 'uncommon']],
  powerplant: [['tall', 100, 'common'], ['tall', 81, 'common'], ['tall', 25, 'uncommon'], ['tall', 125, 'rare'], ['cave', 81, 'common']],
  seafoam: [['water', 86, 'common'], ['water', 90, 'common'], ['water', 116, 'common'], ['water', 131, 'rare'], ['cave', 86, 'common'], ['cave', 54, 'common']],
  mtember: [['cave', 74, 'common'], ['cave', 66, 'common'], ['cave', 126, 'rare'], ['tall', 58, 'common'], ['tall', 77, 'uncommon']],
  ceruleancave: [['cave', 42, 'common'], ['cave', 47, 'common'], ['cave', 64, 'uncommon'], ['cave', 132, 'rare'], ['water', 55, 'common'], ['water', 61, 'uncommon']],
};
// 關都家鄉附近（真新鎮周圍，像 1 號道路）的草叢
const HOME_ECO = { kanto: [16, 19, 10, 13] };

// 產生新世界時清除遭遇表
const _worldGenerate = World.generate;
World.generate = function (...a) { this.zoneTables = new Map(); this.ecoCand = {}; return _worldGenerate.apply(this, a); };

Object.assign(World, {
  zoneTables: new Map(),

  // 依等級換成適合的進化階段（等級進化，最多兩段）
  evolveFor(id, L) {
    for (let i = 0; i < 2; i++) {
      const e = (POKEDEX[id].ev || []).find(x => x.lvl && POKEDEX[x.to]);
      if (!e || L < e.lvl + 2) break;
      id = e.to;
    }
    return id;
  },
  baseOf(id) { let s = id; while (POKEDEX[s].pre && POKEDEX[POKEDEX[s].pre]) s = POKEDEX[s].pre; return s; },

  // 每種地形的候選（進化鏈的最初形態；實際遭遇時再依等級進化），每個世界只算一次
  ecoCandidates(biome) {
    this.ecoCand = this.ecoCand || {};
    if (this.ecoCand[biome]) return this.ecoCand[biome];
    const pool = (this.pools[biome] || []).filter(p => !p.lg && POKEDEX[p.id] && !POKEDEX[p.id].baby);
    const byId = new Map(pool.map(p => [p.id, p]));
    const out = new Map();
    for (const p of pool) {
      const b = this.baseOf(p.id);
      if (out.has(b) || !POKEDEX[b] || POKEDEX[b].lg) continue;
      const bp = byId.get(b);
      out.set(b, { id: b, w: bp ? bp.w : p.w * .7, g: POKEDEX[b].g, wm: POKEDEX[b].wm, types: POKEDEX[b].t, bst: Mon.bst(b) });
    }
    return (this.ecoCand[biome] = [...out.values()]);
  },

  // 某區域某地形的遭遇表：[{ id, w, slot }]
  zoneTable(zx, zy, biome) {
    const key = `${zx},${zy},${biome}`;
    if (this.zoneTables.has(key)) return this.zoneTables.get(key);
    const cx = zx * ZONE + ZONE / 2, cy = zy * ZONE + ZONE / 2;
    const region = this.regionAt(cx, cy), gen = REGIONS[region].gen;
    const L = U.clamp(Math.round(this.levelAt(cx, cy)), 2, 100);
    const rnd = mulberry32((this.seed ^ (zx * 73856093) ^ (zy * 19349663) ^ (biome.length * 83492791)) >>> 0);
    const cand = this.ecoCandidates(biome).filter(c => c.wm <= L + 5).map(c => ({ ...c, local: c.g === gen }));
    const pick = (filter, used) => {
      let list = cand.filter(c => !used.has(c.id) && filter(c));
      const local = list.filter(c => c.local);
      if (local.length && rnd() < .8) list = local;
      if (!list.length) return null;
      let sum = list.reduce((a, c) => a + c.w, 0), r = rnd() * sum;
      for (const c of list) { r -= c.w; if (r <= 0) return c; }
      return list[list.length - 1];
    };
    const used = new Set(), table = [];
    const nightType = c => c.types.some(t => t === 'ghost' || t === 'dark') || [163, 167, 41, 92, 198, 200, 261, 302, 353, 355].includes(c.id);
    for (const [slot, w] of ECO_SLOTS) {
      const f = slot === 'rare' ? c => c.bst >= 420 || c.w < 1 : slot === 'night' ? nightType : slot === 'day' ? c => !nightType(c) : slot === 'common' ? c => c.bst < 420 : () => true;
      const c = pick(f, used) || pick(() => true, used);
      if (!c) continue;
      used.add(c.id);
      table.push({ id: c.id, w, slot });
    }
    // 關都的固定生態
    const tx = cx, ty = cy;
    for (const lm of (this.landmarks || new Map()).values()) {
      const eco = LANDMARK_ECO[lm.id];
      if (!eco || Math.hypot(lm.x - tx, lm.y - ty) > 14 + ZONE / 2) continue;
      for (const [b, id, slot] of eco) if (b === biome && POKEDEX[id]) {
        table.splice(0, table.length, ...table.filter(t => t.id !== id));
        table.unshift({ id, w: slot === 'rare' ? 2 : slot === 'uncommon' ? 8 : 20, slot });
      }
    }
    const home = this.homeTown && this.homeTown.region === region && HOME_ECO[region];
    if (home && biome === 'tall' && Math.hypot(this.homeTown.cx - tx, this.homeTown.cy - ty) < 40) {
      table.splice(0, 4, ...home.map((id, i) => ({ id, w: [24, 20, 12, 10][i], slot: 'common' })));
    }
    this.zoneTables.set(key, table);
    return table;
  },

  rollWild(x, y, biome) {
    const L = U.clamp(this.levelAt(x, y) + U.ri(-2, 2), 2, 100);
    const night = U.isNight();
    const table = this.zoneTable(Math.floor(x / ZONE), Math.floor(y / ZONE), biome)
      .filter(t => !(t.slot === 'day' && night) && !(t.slot === 'night' && !night));
    let id = table.length ? U.weighted(table).id : this.pickForLevel(U.rand, L);
    if (typeof Weather !== 'undefined') id = Weather.adjustWild(id, x, y, biome, L);
    id = this.evolveFor(id, L);
    const form = Forms.wild(id, this.regionAt(x, y));
    // 野生寶可夢：隱藏特性 3%、有 5% 機率攜帶樹果
    const item = U.rand() < .05 ? U.pick(['oran-berry', 'sitrus-berry', 'cheri-berry', 'pecha-berry', 'rawst-berry', 'chesto-berry']) : null;
    return Mon.create(id, L, { hidden: .03, item, form });
  },

  // 圖鑑「分布」：這個物種（或其進化鏈）出現的區域，最多 n 筆；只列出有這種地形的區域
  habitats(id, n = 4) {
    const base = this.baseOf(id), out = [];
    const ZW = Math.ceil(WW / ZONE), ZH = Math.ceil(WH / ZONE);
    for (let zy = 0; zy < ZH && out.length < 40; zy++) for (let zx = 0; zx < ZW; zx++) {
      const cx = zx * ZONE + ZONE / 2, cy = zy * ZONE + ZONE / 2;
      for (const biome of Object.keys(BIOME_TYPES)) {
        if (!this.zoneHas(zx, zy, biome)) continue;
        const e = this.zoneTable(zx, zy, biome).find(t => t.id === base);
        if (!e) continue;
        const town = this.towns.reduce((a, t) => (!a || Math.hypot(t.cx - cx, t.cy - cy) < Math.hypot(a.cx - cx, a.cy - cy) ? t : a), null);
        out.push({ region: this.regionAt(cx, cy), town, biome, slot: e.slot, d: Math.hypot(cx - G.state.x, cy - G.state.y) });
      }
    }
    // 離玩家近的優先，同一城鎮與地形只列一次
    const uniq = new Map();
    for (const h of out.sort((a, b) => a.d - b.d)) { const k = h.town.id + h.biome; if (!uniq.has(k)) uniq.set(k, h); }
    return [...uniq.values()].slice(0, n);
  },
  // 區域內是否有這種地形（避免列出不存在的棲息地）
  zoneHas(zx, zy, biome) {
    const want = { tall: [T.TALL], snow: [T.SNOWTALL], water: [T.WATER, T.DEEP], cave: [T.CAVE], desert: [T.DESERT] }[biome];
    for (let y = zy * ZONE; y < zy * ZONE + ZONE; y += 3) for (let x = zx * ZONE; x < zx * ZONE + ZONE; x += 3) if (want.includes(this.tile(x, y))) return true;
    return false;
  },
});
