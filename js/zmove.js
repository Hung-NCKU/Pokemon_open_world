// Z 招式（一般屬性的 Z 純晶；資料：data/zmoves.js）
// - 需要重要物品「Z 手環」，寶可夢攜帶某屬性的 Z 純晶，使用該屬性的攻擊招式時可以變成 Z 招式（招式選單按 E）
// - 威力依原本招式的威力換算（第七世代表）；不會被守住完全擋下（只受到 1/4 傷害）；每場一次，和超級進化、太晶化擇一
// - 取得：阿羅拉地區的博士送 Z 手環與一般 Z，或第一次成為任一地區的冠軍時取得；阿羅拉的道館送同屬性的 Z 純晶，
//   拿到 Z 手環後其他地區的館主（含重賽）也會給；其餘的散落在阿羅拉各地
// - 動畫：Pokémon Showdown 的 Z 力量與 18 個 Z 招式動畫（data/sd_anims.js、js/sd_anim.js）
import { G, Game, Story, T, UI, ZMove, define } from './core.js';
import { mulberry32 } from './util.js';
import { ITEMS, LEADERS, REGIONS, REGION_POS, TYPES } from './data.js';
import { md } from './movedata.js';
import { World } from './world.js';
import { Battle } from './battle.js';
import { SDAnim } from './sd_anim.js';
ITEMS['z-ring'] = { n: 'Z 手環', price: 0, kind: 'key', d: '能把 Z 純晶的力量傳給寶可夢的手環。' };
const ZCRYSTAL = {};
for (const [type, z] of Object.entries(window.ZMOVES || {})) {
  ZCRYSTAL[z.item] = type;
  ITEMS[z.item] = { n: z.itemN, price: 0, kind: 'held', d: `讓寶可夢攜帶後，可以把${TYPES[type].n}屬性的招式變成 Z 招式「${z.n}」。` };
}

// 專屬 Z 純晶（data/zsig.js）：特定寶可夢＋特定招式 → 專屬 Z 招式（皮卡丘＋伏特攻擊 → 皮卡皮卡必殺擊……）
const ZSIG = window.ZSIG || {};
for (const [item, z] of Object.entries(ZSIG)) {
  const who = [...new Set(z.users.map(u => POKEDEX[u.sp] && POKEDEX[u.sp].n))].filter(Boolean).join('、');
  ITEMS[item] = { n: z.n, price: 0, kind: 'held', d: `讓${who}攜帶後，可以把「${MOVES[z.from] ? MOVES[z.from].n : ''}」變成專屬 Z 招式「${z.z.n}」。` };
}

define(ZMove, {
  // 第七世代：原本威力 → Z 招式威力
  power(bp) {
    if (bp <= 55) return 100; if (bp <= 65) return 120; if (bp <= 75) return 140; if (bp <= 85) return 160;
    if (bp <= 95) return 175; if (bp <= 100) return 180; if (bp <= 110) return 185; if (bp <= 125) return 190;
    if (bp <= 130) return 195; return 200;
  },
  typeOf(m) { return m && m.item ? ZCRYSTAL[m.item] || null : null; },
  // 攜帶的是 Z 純晶（屬性或專屬）
  holds(m) { return !!(m && m.item && (ZCRYSTAL[m.item] || ZSIG[m.item])); },
  // 專屬 Z 招式：攜帶對應的純晶、是指定的寶可夢（形態）、使用指定的招式
  sigFor(m, mv) {
    const z = m && m.item && ZSIG[m.item];
    if (!z || !mv || mv.num !== z.from) return null;
    return z.users.some(u => u.sp === m.sp && (!u.form || u.form === m.form)) ? z : null;
  },
  // 這個招式能不能變成 Z 招式
  eligible(b, m, mv) {
    if (ZMove.sigFor(m, mv)) return true;
    const t = ZMove.typeOf(m);
    return !!(t && mv && mv.cat !== 'Status' && mv.bp > 0 && b.moveType(m, mv) === t);
  },
  // 選單上顯示的 Z 招式名稱
  nameFor(m, mv) { const z = ZMove.sigFor(m, mv); return z ? z.z.n : ZMOVES[ZMove.typeOf(m)] ? ZMOVES[ZMove.typeOf(m)].n : ''; },
  // 實際使出的招式（專屬優先）
  makeFor(m, mv) {
    const s = ZMove.sigFor(m, mv);
    if (!s) return ZMove.make(mv, ZMove.typeOf(m));
    const z = s.z;
    const out = { ...mv, id: z.id, num: z.num, baseId: z.id, n: z.n, type: z.type, cat: z.cat, bp: z.bp, acc: true, isZ: true, breaksProtect: true,
      secondary: null, secondaries: null, self: null, selfBoost: null, multihit: null, drain: null, recoil: null, boosts: null, ignoreAbility: !!z.ignoreAbility,
      support: 'full', flags: { ...mv.flags } };
    if (z.cat === 'Status') { out.target = 'self'; out.boosts = z.boosts || null; }
    else if (z.boosts) out.selfBoost = { boosts: z.boosts }; // 熾魂熱舞烈音爆：自己全能力 +1
    if (z.status) out.secondaries = [{ chance: 100, status: z.status }]; // 駕雷馭電戲衝浪：麻痺
    return out;
  },
  make(mv, type) {
    const z = ZMOVES[type];
    return { ...mv, id: 'zmove', baseId: mv.id, n: z.n, type, bp: ZMove.power(mv.bp), acc: true, isZ: true, breaksProtect: true,
      secondary: null, secondaries: null, self: null, multihit: null, drain: null, recoil: null, flags: { ...mv.flags, contact: mv.flags && mv.flags.contact } };
  },
});

Object.assign(Battle.prototype, {
  gimmickUsed(side) { return !!((this.megaUsed && this.megaUsed[side]) || (this.teraUsed && this.teraUsed[side]) || (this.zUsed && this.zUsed[side])); },
  canZ(m) {
    const side = this.sideKey(m);
    if (this.gimmickUsed(side)) return false;
    if (side === 'me' && !G.state.bag['z-ring']) return false;
    return ZMove.holds(m) && m.moves.some(s => s.pp > 0 && ZMove.eligible(this, m, md(s.id)));
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
    r.mv = ZMove.makeFor(m, r.mv);
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
    // Z 力量的演出（Showdown 的動畫：Z 標誌與光芒）；沒有動畫資料時用太晶化的閃光代替
    if (this.el && await SDAnim.load()) await SDAnim.zpower(this, user, target);
    else if (this.teraAnim) await this.teraAnim(this.sideKey(user));
  }
  return _runMove.call(this, user, target, act);
};
// Z 招式的動畫：Showdown 的 18 個 Z 招式動畫（js/sd_anim.js）；沒有資料時用原本招式的動畫
// （move_anims.js 比 zmove.js 早載入，這裡包在最外層）
function installZAnim() {
  const prev = Battle.prototype.moveAnim;
  Battle.prototype.moveAnim = async function (user, target, view) {
    // 專屬 Z 招式用自己的動畫；一般 Z 招式的 view.id 是原本的招式，依屬性播放
    const sig = view && Object.values(ZSIG).some(z => z.z.id === view.id) ? view.id : null;
    if (view && view.isZ && await SDAnim.zmove(this, user, target, view.t, sig)) return;
    return prev.call(this, user, target, view);
  };
}
installZAnim();
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
  // 屬性的 Z 純晶在前、專屬 Z 純晶接在後面（原本的位置不變）；究極奈克洛Ｚ靠劇情取得
  const left = [...Object.keys(ZMOVES || {}).filter(t => t !== 'normal' && !gymTypes.has(t)).map(t => ZMOVES[t].item),
    ...Object.keys(ZSIG).filter(k => k !== 'ultranecrozium-z')];
  const ok = new Set([T.TALL, T.GRASS, T.CAVE, T.SAND, T.FLOWER, T.SNOW, T.DESERT]);
  const [rx, ry, rad] = REGION_POS.alola;
  let n = 0;
  for (let tries = 0; tries < 4000 && n < left.length; tries++) {
    const ang = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * rad;
    const x = Math.round(rx + Math.cos(ang) * rr), y = Math.round(ry + Math.sin(ang) * rr);
    if (this.regionAt(x, y) !== 'alola' || !ok.has(this.tile(x, y)) || this.townAt(x, y) || this.trainers.has(x + ',' + y)) continue;
    if ((this.legends && this.legends.has(x + ',' + y)) || [...this.events.values()].some(e => Math.hypot(e.x - x, e.y - y) < 10)) continue;
    const item = left[n];
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

export { ZCRYSTAL, _resolveMove, _runMove, _doTurn, _aiChoose, _megaOk, _teraZ, _zGenerate, _prof };
