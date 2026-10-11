// 招式學習器與製作（參考朱／紫的招式學習器機器）
// - 招式學習器是消耗品；使用後寶可夢學會招式（相容名單：data/tms.js）
// - 打倒野生寶可夢會掉落「素材」（依進化鏈最初形態，例如「小火龍的素材」）
// - 寶可夢中心的招式機器：消耗與招式同屬性的寶可夢素材＋金錢製作；配方在第一次取得該招式學習器時解鎖
import { G, Game, Sound, UI } from './core.js';
import { U } from './util.js';
import { ITEMS, TYPES, typeTag } from './data.js';
const TM = (() => {
  const LIST = (window.TM_DATA || []).filter(t => MOVES[t.mv]);
  const BY_MOVE = {}, COMPAT = {};
  for (const t of LIST) {
    t.id = t.no.toLowerCase();
    BY_MOVE[t.mv] = t;
    COMPAT[t.mv] = new Set(t.c);
    const mv = MOVES[t.mv];
    ITEMS[t.id] = { n: `${t.no} ${mv.n}`, kind: 'tm', mv: t.mv, d: `讓寶可夢學會「${mv.n}」。${mv.d || ''}`, price: 0 };
  }
  // 一開始就能製作的基本配方
  const STARTER = [182, 263, 156, 164];

  const base = sp => { let s = sp; while (POKEDEX[s] && POKEDEX[s].pre && POKEDEX[POKEDEX[s].pre]) s = POKEDEX[s].pre; return s; };
  const matName = sp => `${POKEDEX[sp].n}的素材`;
  const compatible = (m, mv) => COMPAT[mv] && COMPAT[mv].has(m.sp);
  // 配方：與招式同屬性的素材，數量依威力；金錢
  function recipe(t) {
    const mv = MOVES[t.mv], p = mv.p || 0;
    return { type: mv.t, need: p >= 90 ? 6 : p >= 60 ? 4 : 3, money: 800 + p * 20 };
  }
  const st = () => {
    const s = G.state;
    s.mats = s.mats || {};
    if (!s.tmRecipes) { s.tmRecipes = {}; for (const mv of STARTER) if (BY_MOVE[mv]) s.tmRecipes[mv] = 1; }
    return s;
  };
  // 某屬性可用的素材（依數量多的優先使用）
  function matsOfType(type) {
    const s = st();
    return Object.entries(s.mats).filter(([sp, n]) => n > 0 && POKEDEX[sp] && POKEDEX[sp].t.includes(type)).sort((a, b) => b[1] - a[1]);
  }
  const haveOfType = type => matsOfType(type).reduce((a, [, n]) => a + n, 0);

  // 打倒野生寶可夢時掉落素材（1 個，30% 機率 2 個）
  function drop(foe) {
    const s = st(), b = base(foe.sp);
    const n = U.chance(.3) ? 2 : 1;
    s.mats[b] = (s.mats[b] || 0) + n;
    return `獲得了 ${n} 個${matName(b)}！`;
  }
  // 取得招式學習器（同時解鎖配方）
  function give(mv, n = 1) {
    const t = BY_MOVE[mv];
    if (!t) return null;
    st().tmRecipes[mv] = 1;
    Game.giveItem(t.id, n);
    return t;
  }
  // 館主的招式學習器：與道館屬性相同、還沒有配方的優先
  function forType(type) {
    const s = st();
    const c = LIST.filter(t => MOVES[t.mv].t === type);
    return (c.find(t => !s.tmRecipes[t.mv]) || c[0] || LIST.find(t => !s.tmRecipes[t.mv]) || LIST[0]);
  }
  function craft(t) {
    const s = st(), r = recipe(t);
    if (!s.tmRecipes[t.mv] || haveOfType(r.type) < r.need || s.money < r.money) return false;
    let left = r.need;
    for (const [sp, n] of matsOfType(r.type)) {
      const use = Math.min(n, left);
      s.mats[sp] -= use; left -= use;
      if (!s.mats[sp]) delete s.mats[sp];
      if (!left) break;
    }
    s.money -= r.money;
    Game.giveItem(t.id, 1);
    return true;
  }

  // 寶可夢中心的招式機器
  async function machine() {
    let start = 0;
    while (true) {
      const s = st();
      const rows = LIST.map(t => {
        const mv = MOVES[t.mv], r = recipe(t), open = s.tmRecipes[t.mv];
        const have = haveOfType(r.type), ok = open && have >= r.need && s.money >= r.money;
        return {
          html: open
            ? `<span class="dexno">${t.no}</span>${typeTag(mv.t)}<div class="grow"><b>${U.esc(mv.n)}</b><div class="dim small">${TYPES[mv.t].n}屬性素材 ${have}／${r.need}　${r.money} 元</div></div><div class="dim">持有 ${s.bag[t.id] || 0}</div>`
            : `<span class="dexno">${t.no}</span><div class="grow dim">？？？（取得一次這個招式學習器後就能製作）</div>`,
          disabled: !ok,
        };
      });
      const i = await UI.list({ title: '招式機器', rows, start, extra: `💰 ${s.money} 元　素材 ${Object.values(s.mats).reduce((a, b) => a + b, 0)} 個` });
      if (i < 0) return;
      start = i;
      const t = LIST[i], mv = MOVES[t.mv], r = recipe(t);
      const c = await UI.choose(['製作', '取消'], { prompt: `要製作 ${t.no} ${mv.n} 嗎？\n需要 ${TYPES[mv.t].n}屬性素材 ${r.need} 個、${r.money} 元。` });
      if (c !== 0) continue;
      if (craft(t)) { Sound.sfx('item'); await UI.say(`製作了 ${t.no} ${mv.n}！`); }
    }
  }
  // 素材清單
  async function materials() {
    const s = st();
    const ids = Object.keys(s.mats).filter(k => s.mats[k] > 0).map(Number).sort((a, b) => a - b);
    if (!ids.length) { await UI.say('還沒有任何素材。打倒野生寶可夢就能取得素材。'); return; }
    await UI.list({ title: '寶可夢素材', rows: ids.map(sp => `<div class="grow"><b>${U.esc(matName(sp))}</b> ${POKEDEX[sp].t.map(typeTag).join('')}</div><div>× ${s.mats[sp]}</div>`) });
  }
  // 使用招式學習器（背包）；學會時才消耗
  async function use(id) {
    const t = LIST.find(x => x.id === id), mv = MOVES[t.mv];
    const i = await Game.partyMenu({ pick: m => compatible(m, t.mv) && !m.moves.some(x => x.id === t.mv) });
    if (i < 0) return;
    const m = G.party[i];
    await UI.say(`啟動了 ${t.no}。\n裡面記錄著「${mv.n}」。`);
    await Game.learnMove(m, t.mv);
    if (m.moves.some(x => x.id === t.mv)) Game.takeItem(id);
  }
  return { LIST, BY_MOVE, compatible, recipe, drop, give, forType, craft, machine, materials, use, base, matName, haveOfType };
})();

export { TM };
