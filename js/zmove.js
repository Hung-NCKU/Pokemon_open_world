// Z 招式（一般屬性的 Z 純晶；資料：data/zmoves.js）
// - 需要重要物品「Z 手環」，寶可夢攜帶某屬性的 Z 純晶，使用該屬性的攻擊招式時可以變成 Z 招式（招式選單按 E）
// - 威力依原本招式的威力換算（第七世代表）；不會被守住完全擋下（只受到 1/4 傷害）；每場一次，和超級進化、太晶化擇一
// - 取得：阿羅拉地區的博士送 Z 手環與一般 Z；阿羅拉的道館送同屬性的 Z 純晶；其餘的散落在阿羅拉各地
ITEMS['z-ring'] = { n: 'Z 手環', price: 0, kind: 'key', d: '能把 Z 純晶的力量傳給寶可夢的手環。' };
const ZCRYSTAL = {};
for (const [type, z] of Object.entries(window.ZMOVES || {})) {
  ZCRYSTAL[z.item] = type;
  ITEMS[z.item] = { n: z.itemN, price: 0, kind: 'held', d: `讓寶可夢攜帶後，可以把${TYPES[type].n}屬性的招式變成 Z 招式「${z.n}」。` };
}

const ZMove = {
  // 第七世代：原本威力 → Z 招式威力
  power(bp) {
    if (bp <= 55) return 100; if (bp <= 65) return 120; if (bp <= 75) return 140; if (bp <= 85) return 160;
    if (bp <= 95) return 175; if (bp <= 100) return 180; if (bp <= 110) return 185; if (bp <= 125) return 190;
    if (bp <= 130) return 195; return 200;
  },
  typeOf(m) { return m && m.item ? ZCRYSTAL[m.item] || null : null; },
  // 這個招式能不能變成 Z 招式
  eligible(b, m, mv) {
    const t = ZMove.typeOf(m);
    return !!(t && mv && mv.cat !== 'Status' && mv.bp > 0 && b.moveType(m, mv) === t);
  },
  make(mv, type) {
    const z = ZMOVES[type];
    return { ...mv, id: 'zmove', baseId: mv.id, n: z.n, type, bp: ZMove.power(mv.bp), acc: true, isZ: true, breaksProtect: true,
      secondary: null, secondaries: null, self: null, multihit: null, drain: null, recoil: null, flags: { ...mv.flags, contact: mv.flags && mv.flags.contact } };
  },
};

Object.assign(Battle.prototype, {
  gimmickUsed(side) { return !!((this.megaUsed && this.megaUsed[side]) || (this.teraUsed && this.teraUsed[side]) || (this.zUsed && this.zUsed[side])); },
  canZ(m) {
    const side = this.sideKey(m);
    if (this.gimmickUsed(side)) return false;
    if (side === 'me' && !G.state.bag['z-ring']) return false;
    return !!ZMove.typeOf(m) && m.moves.some(s => s.pp > 0 && ZMove.eligible(this, m, md(s.id)));
  },
});

// 選擇的招式在執行前換成 Z 招式
const _resolveMove = Battle.prototype.resolveMove;
Battle.prototype.resolveMove = function (m, v, idx) {
  const r = _resolveMove.call(this, m, v, idx);
  const side = this.sideKey(m);
  const want = side === 'me' ? this._zMe : this._zFoe;
  if (want && r.slot && !r.cont && this.canZ(m) && ZMove.eligible(this, m, r.mv)) {
    this.zUsed = this.zUsed || {};
    this.zUsed[side] = true;
    r.mv = ZMove.make(r.mv, ZMove.typeOf(m));
  }
  if (side === 'me') this._zMe = false; else this._zFoe = false;
  return r;
};
const _runMove = Battle.prototype.runMove;
Battle.prototype.runMove = async function (user, target, act) {
  if (act.mv && act.mv.isZ && !act.zShown) {
    act.zShown = true;
    act.mv.zHitProtect = !!this.volOf(target).protect;
    await this.msg(`${this.label(user)} 把全身的力量集中起來！\n釋放出全力的 Z 招式！`);
    if (this.teraAnim) await this.teraAnim(this.sideKey(user));
  }
  return _runMove.call(this, user, target, act);
};
// 玩家在招式選單按 E；訓練家的王牌攜帶 Z 純晶時，選到同屬性的攻擊招式就使用
const _doTurn = Battle.prototype.doTurn;
Battle.prototype.doTurn = async function (action) {
  this._zMe = !!(action && action.type === 'move' && action.z);
  return _doTurn.call(this, action);
};
const _aiChoose = Battle.prototype.aiChoose;
Battle.prototype.aiChoose = function () {
  const a = _aiChoose.call(this);
  this._zFoe = !!(!this.wildMon && this.trainer && a && a.idx >= 0 && this.foe.moves[a.idx] && this.canZ(this.foe) && ZMove.eligible(this, this.foe, md(this.foe.moves[a.idx].id)));
  return a;
};
// 超級進化、太晶化也要遵守「一場一種」
const _megaOk = Battle.prototype.canMega;
Battle.prototype.canMega = function (m) { return !(this.zUsed && this.zUsed[this.sideKey(m)]) && _megaOk.call(this, m); };
const _teraZ = Battle.prototype.terastallize;
Battle.prototype.terastallize = async function (m) { if (this.zUsed && this.zUsed[this.sideKey(m)]) return; return _teraZ.call(this, m); };

// ---------- 取得 ----------
// 阿羅拉沒有道館給的 Z 純晶，散落在阿羅拉各地
const _zGenerate = World.generate;
World.generate = function (...a) {
  const r = _zGenerate.apply(this, a);
  const rng = mulberry32((this.seed ^ 0x2a2a) >>> 0);
  const gymTypes = new Set((LEADERS.alola || []).map(l => l[1]));
  const left = Object.keys(ZMOVES || {}).filter(t => t !== 'normal' && !gymTypes.has(t));
  const ok = new Set([T.TALL, T.GRASS, T.CAVE, T.SAND, T.FLOWER, T.SNOW, T.DESERT]);
  const [rx, ry, rad] = REGION_POS.alola;
  let n = 0;
  for (let tries = 0; tries < 4000 && n < left.length; tries++) {
    const ang = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * rad;
    const x = Math.round(rx + Math.cos(ang) * rr), y = Math.round(ry + Math.sin(ang) * rr);
    if (this.regionAt(x, y) !== 'alola' || !ok.has(this.tile(x, y)) || this.townAt(x, y) || this.trainers.has(x + ',' + y)) continue;
    if ((this.legends && this.legends.has(x + ',' + y)) || [...this.events.values()].some(e => Math.hypot(e.x - x, e.y - y) < 10)) continue;
    const item = ZMOVES[left[n]].item;
    this.events.set(x + ',' + y, { kind: 'megastone', id: 'zc_' + item, item, x, y });
    n++;
  }
  return r;
};
// 阿羅拉的博士：第一次見面送 Z 手環與一般 Z
const _prof = Story.prof;
Story.prof = async function (region) {
  if (region === 'alola' && !G.state.bag['z-ring'] && window.ZMOVES) {
    Game.giveItem('z-ring', 1);
    Game.giveItem('normalium-z', 1);
    await UI.say(`${REGIONS.alola.prof}：「阿羅拉！這是在阿羅拉旅行的必需品！」\n獲得了 Z 手環和一般Ｚ！\n（讓寶可夢攜帶 Z 純晶，在戰鬥中選招式時按 E 使用 Z 招式）`);
  }
  return _prof.call(this, region);
};
