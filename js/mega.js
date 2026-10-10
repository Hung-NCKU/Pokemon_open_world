// 超級進化與原始回歸（資料：data/forms.js 的 MEGA_STONES 與超級形態）
// - 需要重要物品「超級手環」，寶可夢攜帶對應的超級石；每場戰鬥一次，戰鬥結束後恢復
// - 一場戰鬥只能使用一種特殊能力：超級進化或太晶化
// - 原始回歸：固拉多／蓋歐卡攜帶朱紅色／靛藍色寶珠出場時自動發生
// - 取得：第一次成為冠軍時獲得超級手環與御三家的超級石；其他超級石散落在各地區（靠近時閃光）
ITEMS['mega-ring'] = { n: '超級手環', price: 0, kind: 'key', d: '鑲著鑰石的手環。寶可夢攜帶超級石時，可以在戰鬥中超級進化。' };
for (const [id, st] of Object.entries(window.MEGA_STONES || {})) {
  if (!ITEMS[id] || !ITEMS[id].n || /[A-Za-z]{4}/.test(ITEMS[id].n)) ITEMS[id] = { n: st.n, price: 0, kind: 'held' };
  ITEMS[id].kind = 'held';
  ITEMS[id].mega = st.form;
  ITEMS[id].d = FORMS[st.form] && FORMS[st.form].primal
    ? `讓${POKEDEX[st.base].n}攜帶後出場時會原始回歸。`
    : `讓${POKEDEX[st.base].n}攜帶後，就能在戰鬥中超級進化成${FORMS[st.form] ? FORMS[st.form].n : ''}。`;
}

const Mega = {
  // 這隻寶可夢攜帶的超級石對應的形態（原始回歸的寶珠另外處理）
  formFor(m) {
    const st = m && m.item && window.MEGA_STONES && MEGA_STONES[m.item];
    if (!st || st.base !== m.sp || !FORMS[st.form] || FORMS[st.form].primal) return null;
    return st.form;
  },
  primalFor(m) {
    const st = m && m.item && window.MEGA_STONES && MEGA_STONES[m.item];
    return st && st.base === m.sp && FORMS[st.form] && FORMS[st.form].primal ? st.form : null;
  },
  // 變身（戰鬥中）：記住原本的形態與特性
  apply(m, form) {
    if (m._megaFrom === undefined) { m._megaFrom = m.form || null; m._megaAb = m.ability; }
    m.form = form;
    m.ability = FORMS[form].ab[0][0];
  },
  // 戰鬥結束：恢復
  revert(m) {
    if (!m || m._megaFrom === undefined) return;
    if (m._megaFrom) m.form = m._megaFrom; else delete m.form;
    m.ability = m._megaAb;
    delete m._megaFrom; delete m._megaAb;
    m.hp = Math.min(m.hp, Mon.maxHp(m));
  },
  // 御三家（最終形態）有超級石的
  starterStone(sp) {
    let s = sp;
    for (let i = 0; i < 2; i++) { const e = (POKEDEX[s].ev || []).find(x => x.lvl); if (!e) break; s = e.to; }
    return Object.keys(MEGA_STONES || {}).find(k => MEGA_STONES[k].base === s && !FORMS[MEGA_STONES[k].form].primal) || null;
  },
};

// ---------- 戰鬥 ----------
Object.assign(Battle.prototype, {
  canMega(m) {
    const side = this.sideKey(m);
    if ((this.megaUsed && this.megaUsed[side]) || (this.teraUsed && this.teraUsed[side])) return false;
    if (side === 'me' && !G.state.bag['mega-ring']) return false;
    return !!Mega.formFor(m);
  },
  async megaEvolve(m) {
    const side = this.sideKey(m), form = Mega.formFor(m);
    if (!form || !this.canMega(m)) return;
    this.megaUsed = this.megaUsed || {};
    this.megaUsed[side] = true;
    const before = Mon.name(m);
    await this.msg(`${this.label(m)} 的${Held.name(m.item)}與${side === 'me' ? G.state.name + '的超級手環' : '鑰石'}產生了反應！`);
    if (this.teraAnim) await this.teraAnim(side);
    Mega.apply(m, form);
    this.setSprite && this.setSprite(side, m);
    await this.msg(`${before} 超級進化成了${FORMS[form].n}！`);
    this.draw && this.draw();
    await this.abilityStart(m);
  },
  async primalCheck(m) {
    const form = Mega.primalFor(m);
    if (!form || m.form === form) return;
    Mega.apply(m, form);
    this.setSprite && this.setSprite(this.sideKey(m), m);
    await this.msg(`${this.label(m)} 原始回歸了！\n恢復了原始的樣子！`);
    this.draw && this.draw();
  },
  // 訓練家的寶可夢攜帶超級石時，第一回合就超級進化
  aiMega() { return !this.wildMon && this.trainer && this.canMega(this.foe); },
});

// 太晶化與超級進化互斥
const _canTera = Battle.prototype.terastallize;
Battle.prototype.terastallize = async function (m) {
  const side = this.sideKey(m);
  if (this.megaUsed && this.megaUsed[side]) return;
  return _canTera.call(this, m);
};

// ---------- 地圖上的超級石（每個地區 3 顆，靠近時閃光；豐緣另有朱紅色、靛藍色寶珠） ----------
const _megaGenerate = World.generate;
World.generate = function (...a) {
  const r = _megaGenerate.apply(this, a);
  this.placeMegaStones(mulberry32((this.seed ^ 0x3e9a) >>> 0));
  return r;
};
World.placeMegaStones = function (rng) {
  this.events = this.events || new Map();
  const stones = Object.entries(window.MEGA_STONES || {});
  const ok = new Set([T.TALL, T.GRASS, T.CAVE, T.SAND, T.FLOWER, T.SNOW, T.DESERT]);
  for (const region of REGION_KEYS) {
    const gen = REGIONS[region].gen;
    let pool = stones.filter(([, st]) => POKEDEX[st.base] && POKEDEX[st.base].g === gen && !FORMS[st.form].primal);
    if (region === 'hoenn') pool = pool.concat(stones.filter(([, st]) => FORMS[st.form].primal));
    pool.sort(() => rng() - .5);
    const pick = region === 'hoenn' ? pool.filter(([, st]) => FORMS[st.form].primal).concat(pool.filter(([, st]) => !FORMS[st.form].primal).slice(0, 3)) : pool.slice(0, 3);
    const [rx, ry, rad] = REGION_POS[region];
    let n = 0;
    for (let tries = 0; tries < 3000 && n < pick.length; tries++) {
      const ang = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * rad;
      const x = Math.round(rx + Math.cos(ang) * rr), y = Math.round(ry + Math.sin(ang) * rr);
      if (this.regionAt(x, y) !== region || !ok.has(this.tile(x, y)) || this.townAt(x, y) || this.trainers.has(x + ',' + y)) continue;
      if ((this.legends && this.legends.has(x + ',' + y)) || [...this.events.values()].some(e => Math.hypot(e.x - x, e.y - y) < 12)) continue;
      const [item] = pick[n];
      this.events.set(x + ',' + y, { kind: 'megastone', id: 'ms_' + item, item, x, y });
      n++;
    }
  }
};
const _eventEntity = Story.eventEntity;
Story.eventEntity = async function (e) {
  if (e.kind !== 'megastone') return _eventEntity.call(this, e);
  G.state.flags['ev_' + e.id] = 1;
  Game.giveItem(e.item, 1);
  Sound.sfx('item');
  await UI.say(`發現了${ITEMS[e.item].n}！`);
  if (!G.state.bag['mega-ring'] && MEGA_STONES[e.item] && !FORMS[MEGA_STONES[e.item].form].primal) await UI.say('（好像需要超級手環才能使用。聽說成為冠軍就能得到……）');
  Game.save(true);
};
