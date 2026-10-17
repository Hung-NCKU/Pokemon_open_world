// 寶可夢個體：能力值、經驗值、招式、進化（最新世代公式）
import { FORM_EVO, Forms, G } from './core.js';
import { U } from './util.js';
import { ITEMS, TYPES } from './data.js';
import { Abil } from './abilities.js';
const NATURES = ['勤奮', '怕寂寞', '勇敢', '固執', '頑皮', '大膽', '坦率', '悠閒', '淘氣', '樂天', '膽小', '急躁', '認真', '爽朗',
  '天真', '內斂', '慢吞吞', '冷靜', '害羞', '馬虎', '溫和', '溫順', '自大', '慎重', '浮躁'];
const NAT_STAT = [1, 2, 5, 3, 4]; // 攻擊 防禦 速度 特攻 特防
const STAT_ZH = ['HP', '攻擊', '防禦', '特攻', '特防', '速度'];
const STATUS_ZH = { par: '麻痺', slp: '睡眠', frz: '冰凍', brn: '灼傷', psn: '中毒', tox: '劇毒' };
const STATUS_C = { par: '#d8b020', slp: '#8a8a8a', frz: '#60c8e8', brn: '#e05030', psn: '#9040b0', tox: '#702090' };
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const localSprites = new Set(window.GEN3 && GEN3.battleSprites || []);
const warmedSprites = new Map();
const STRUGGLE = { id: 165, n: '掙扎', t: 'unknown', c: 'ph', p: 50, a: 0, pp: 1, pr: 0, tg: 'selected-pokemon', dr: -25 };

const Mon = {
  ovr: new WeakMap(),
  sp(id) { return POKEDEX[id]; },
  name(m) { return m.nick || Forms.data(m).n; },
  types(m) { return Forms.data(m).t; },
  spriteOf(m, opts = {}) { return Mon.sprite(Forms.spriteId(m), opts); },
  bst(id) { return POKEDEX[id].s.reduce((a, b) => a + b, 0); },

  expFor(gr, n) {
    if (n <= 1) return 0;
    const n3 = n * n * n;
    switch (gr) {
      case 'fast': return Math.floor(4 * n3 / 5);
      case 'medium': return n3;
      case 'medium-slow': return Math.max(0, Math.floor(6 / 5 * n3 - 15 * n * n + 100 * n - 140));
      case 'slow': return Math.floor(5 * n3 / 4);
      case 'slow-then-very-fast':
        if (n < 50) return Math.floor(n3 * (100 - n) / 50);
        if (n < 68) return Math.floor(n3 * (150 - n) / 100);
        if (n < 98) return Math.floor(n3 * Math.floor((1911 - 10 * n) / 3) / 500);
        return Math.floor(n3 * (160 - n) / 100);
      case 'fast-then-very-slow':
        if (n < 15) return Math.floor(n3 * (Math.floor((n + 1) / 3) + 24) / 50);
        if (n < 36) return Math.floor(n3 * (n + 14) / 50);
        return Math.floor(n3 * (Math.floor(n / 2) + 32) / 50);
      default: return n3;
    }
  },

  stats(m) {
    const b = Forms.data(m).s, L = m.lv, out = [];
    // 極限特訓過的能力視為個體值 31
    const iv = i => (m.ivHT && m.ivHT[i] ? 31 : m.iv[i]);
    out[0] = b[0] === 1 ? 1 : Math.floor((2 * b[0] + iv(0) + Math.floor((m.ev?.[0] || 0) / 4)) * L / 100) + L + 10;
    for (let i = 1; i < 6; i++) {
      out[i] = Math.floor((2 * b[i] + iv(i) + Math.floor((m.ev?.[i] || 0) / 4)) * L / 100) + 5;
    }
    // 性格薄荷：只改變能力修正（m.mint），性格本身不變
    const nat = m.mint ?? m.nat;
    const up = NAT_STAT[Math.floor(nat / 5)], down = NAT_STAT[nat % 5];
    if (up !== down) {
      out[up] = Math.floor(out[up] * 1.1);
      out[down] = Math.floor(out[down] * 0.9);
    }
    // 戰鬥中暫時改變的能力值（變身、力量戲法、力量平分、防守平分）；HP 不變，戰鬥結束時清除
    const o = Mon.ovr.get(m);
    if (o) for (const i of Object.keys(o)) if (+i > 0) out[i] = o[i];
    return out;
  },
  maxHp(m) { return Mon.stats(m)[0]; },

  movesFor(id, lv, form = null) {
    const fl = form && window.FORMS && FORMS[form] && FORMS[form].l.length ? FORMS[form].l : null;
    const learn = (fl || POKEDEX[id].l).filter(([l, mid]) => l <= lv && MOVES[mid]);
    const ids = [];
    for (let i = learn.length - 1; i >= 0 && ids.length < 4; i--) {
      if (!ids.includes(learn[i][1])) ids.push(learn[i][1]);
    }
    if (!ids.length) ids.push(33);
    return ids.reverse();
  },

  create(id, lv, opts = {}) {
    const s = POKEDEX[id];
    const m = {
      uid: Date.now().toString(36) + U.rand().toString(36).slice(2, 7),
      sp: id, lv, exp: Mon.expFor(s.gr, lv),
      iv: Array.from({ length: 6 }, () => U.ri(0, 31)),
      ev: [0, 0, 0, 0, 0, 0],
      nat: U.ri(0, 24),
      gender: Mon.genderOf(id),
      ability: typeof Abil !== 'undefined' ? Abil.pick(id, opts.hidden || 0) : null,
      item: opts.item || null,
      happy: s.hap,
      st: null,
      shiny: opts.shiny ?? U.rand() < 1 / 4096,
      tera: opts.tera || U.pick(s.t),
      moves: Mon.movesFor(id, lv, opts.form).filter(x => MOVES[x]).map(x => ({ id: x, pp: MOVES[x].pp })),
    };
    if (opts.form && window.FORMS && FORMS[opts.form] && FORMS[opts.form].base === id) {
      m.form = opts.form;
      const f = FORMS[opts.form];
      m.tera = opts.tera || U.pick(f.t);
      const normal = f.ab.filter(a => !a[1]), hidden = f.ab.filter(a => a[1]);
      m.ability = (hidden.length && U.rand() < (opts.hidden || 0) ? U.pick(hidden) : U.pick(normal.length ? normal : f.ab))[0];
    }
    if (opts.perfect) m.iv = m.iv.map(v => Math.max(v, opts.perfect));
    m.hp = Mon.maxHp(m);
    return m;
  },

  heal(m) {
    m.hp = Mon.maxHp(m);
    m.st = null;
    m.moves.forEach(x => { x.pp = MOVES[x.id].pp; });
  },

  // 太晶屬性：沒有設定時是第一個屬性
  teraType(m) { return m.tera && TYPES[m.tera] ? m.tera : Forms.data(m).t[0]; },

  sprite(id, { back = false, shiny = false } = {}) {
    return Mon.spritePath((back ? 'back/' : '') + (shiny ? 'shiny/' : '') + id + '.png');
  },

  spritePath(path) { return localSprites.has(path) ? (window.GEN3_BASE || 'assets/gen3/') + 'battle/' + path : SPR + path; },
  warmSprite(url) {
    if (warmedSprites.has(url)) return;
    const img = new Image(); img.decoding = 'async'; img.src = url; warmedSprites.set(url, img);
    if (warmedSprites.size > 128) warmedSprites.delete(warmedSprites.keys().next().value);
  },

  // 單一條件組是否成立（item：使用道具時傳入的道具；null 表示升級時判定）
  evoCondMet(m, c, item = null, party = null) {
    if (item) { if (c.item !== item) return false; }
    else if (c.item) return false;
    if (c.lvl && m.lv < c.lvl) return false;
    if (c.happy && (m.happy || 0) < c.happy) return false;
    if (c.time) {
      const h = new Date().getHours();
      const ok = c.time === 'day' ? h >= 6 && h < 18 : c.time === 'night' ? h < 6 || h >= 18 : c.time === 'dusk' ? h >= 17 && h < 19 : true;
      if (!ok) return false;
    }
    if (c.gender === 1 && m.gender !== 'F') return false;
    if (c.gender === 2 && m.gender !== 'M') return false;
    if (c.move && !m.moves.some(x => x.id === c.move)) return false;
    if (c.mtype && !m.moves.some(x => MOVES[x.id] && MOVES[x.id].t === c.mtype)) return false;
    if (c.rps !== undefined) {
      const st = Mon.stats(m);
      if (Math.sign(st[1] - st[2]) !== c.rps) return false;
    }
    party = party || (typeof G !== 'undefined' && G.state ? G.party : []);
    if (c.partySp && !party.some(p => p !== m && p.sp === c.partySp)) return false;
    if (c.partyType && !party.some(p => p !== m && Mon.types(p).includes(c.partyType))) return false;
    return true;
  },
  // 等級提升或使用道具時的進化候選（任一條件組成立即可）；依條件明確程度排序
  evoCandidates(m, item = null) {
    const special = !item && Forms.candidates(m);
    if (special) return special;
    if (m.form && FORM_EVO[m.form]) return [];
    const out = [];
    for (const e of POKEDEX[m.sp].ev || []) {
      // 脫殼忍者只會在土居忍士進化成鐵面忍者時，隊伍有空位才額外出現（Game.evolve），不是一般進化
      if (!POKEDEX[e.to] || e.to === 292) continue;
      const conds = e.c || [e];
      let best = -1;
      for (const c of conds) {
        if (!Mon.evoCondMet(m, c, item)) continue;
        // 條件越多越優先；需要特定招式的條件再加權（最新世代：會妖精招式的伊布優先進化為仙子伊布）
        const score = Object.keys(c).filter(k => !['adapt', 'fb'].includes(k)).length + (c.move || c.mtype ? 1 : 0);
        best = Math.max(best, score);
      }
      if (best >= 0) out.push({ ...e, score: best });
    }
    return out.sort((a, b) => b.score - a.score);
  },
  // 多個候選同樣明確時（例如刺尾蟲），依個體固定決定，不隨機
  pickEvo(m, cands) {
    if (!cands.length) return null;
    const top = cands.filter(c => c.score === cands[0].score);
    if (top.length === 1) return top[0].to;
    let h = 0;
    for (const ch of String(m.uid)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return top[h % top.length].to;
  },
  // 圖鑑用的進化條件說明
  evoText(c) {
    const parts = [];
    if (c.item) parts.push(`使用${ITEMS[c.item] ? ITEMS[c.item].n : c.item}`);
    if (c.lvl && !c.fb) parts.push(`Lv.${c.lvl}`);
    if (c.happy) parts.push('親密度高');
    if (c.time) parts.push({ day: '白天', night: '夜晚', dusk: '黃昏' }[c.time] || c.time);
    if (c.gender) parts.push(c.gender === 1 ? '雌性' : '雄性');
    if (c.move) parts.push(`學會${MOVES[c.move] ? MOVES[c.move].n : '特定招式'}`);
    if (c.mtype) parts.push(`學會${TYPES[c.mtype] ? TYPES[c.mtype].n : c.mtype}屬性招式`);
    if (c.rps !== undefined) parts.push(c.rps > 0 ? '攻擊＞防禦' : c.rps < 0 ? '攻擊＜防禦' : '攻擊＝防禦');
    if (c.partySp) parts.push(`隊伍中有${POKEDEX[c.partySp] ? POKEDEX[c.partySp].n : '特定寶可夢'}`);
    if (c.partyType) parts.push(`隊伍中有${TYPES[c.partyType] ? TYPES[c.partyType].n : ''}屬性寶可夢`);
    if (c.fb) parts.push(`Lv.${c.lvl}`);
    let s = parts.join('・') || '升級';
    const ADAPT = { trade: '原作需通訊交換', held: '原作需攜帶道具升級', tower: '原作需挑戰塔', affection: '原作需好感度', spin: '原作需旋轉',
      location: '原作需在特定地點升級', rain: '原作需下雨', upside: '原作需倒拿主機', beauty: '原作需美麗度' };
    if (c.adapt) s += `（改編：${ADAPT[c.adapt] || '原作的特殊條件無法重現'}）`;
    return s;
  },

  // 第七世代起的經驗值公式（第九世代沿用）：沒有訓練家對戰 1.5 倍；學習裝置常駐，未上場者獲得一半
  expGain(foe, me, trainer, participated) {
    const b = POKEDEX[foe.sp].xp, L = foe.lv, Lp = me.lv;
    let e = (b * L / 5) * Math.pow((2 * L + 10) / (L + Lp + 10), 2.5) + 1;
    if (!participated) e /= 2;
    return Math.max(1, Math.floor(e));
  },

  // EV：依打倒的寶可夢實際的努力值產出（PokéAPI stats[].effort）；單項上限 252、總和上限 510
  gainEV(m, foe) {
    const y = Forms.data(foe).ey || [0, 0, 0, 0, 0, 0];
    m.ev = m.ev || [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6; i++) {
      const total = m.ev.reduce((a, c) => a + c, 0);
      const add = Math.min(y[i], 252 - m.ev[i], 510 - total);
      if (add > 0) m.ev[i] += add;
    }
  },
  genderOf(id) {
    const r = POKEDEX[id].gr8;
    if (r === undefined || r < 0) return null;
    return U.rand() * 8 < r ? 'F' : 'M';
  },
  genderMark(m) { return m.gender === 'F' ? '♀' : m.gender === 'M' ? '♂' : ''; },
};

export { NATURES, NAT_STAT, STAT_ZH, STATUS_ZH, STATUS_C, SPR, STRUGGLE, Mon };
