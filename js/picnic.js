// 野餐與繁殖（參考朱／紫）
// 野餐（主選單）：在城鎮外展開野餐
//   - 做三明治：用 3 顆樹果，30 分鐘內指定屬性更容易遇到（遭遇力）、經驗值 1.5 倍（經驗力）
//   - 和寶可夢玩：隊伍親密度上升（每次野餐一次）
//   - 野餐籃：隊伍裡有能生蛋的組合（同蛋群、異性，或百變怪）時，每分鐘會出現一顆蛋（最多 3 顆，吃過三明治更快）
// 繁殖規則（第九世代）：蛋是非百變怪那方（或母方）的最初形態、地區形態會遺傳；
//   個體值從雙親遺傳 3 項（紅線 5 項）；攜帶不變之石的一方遺傳性格；隱藏特性 60% 遺傳；孵化時 Lv.1
// 蛋放在「蛋籃」（最多 6 顆），走路就會孵化（孵化週期 × 128 步，隊伍有火焰之軀時減半）
import { Forms, G, Game, Picnic, Sound, T, UI, define } from './core.js';
import { U } from './util.js';
import { ITEMS, SHOP_LIST, TYPES, typeTag } from './data.js';
import { Mon } from './mon.js';
import { World } from './world.js';
import { monIcon } from './menus.js';
ITEMS['destiny-knot'] = ITEMS['destiny-knot'] || { n: '紅線', price: 0, kind: 'held', d: '讓寶可夢攜帶後，生蛋時會從雙親遺傳 5 項個體值。' };
ITEMS['destiny-knot'].kind = ITEMS['destiny-knot'].kind || 'held';
ITEMS.everstone = ITEMS.everstone || { n: '不變之石', price: 0, kind: 'held', d: '攜帶後不會進化。生蛋時會遺傳攜帶者的性格。' };
if (typeof SHOP_LIST !== 'undefined' && !SHOP_LIST.includes('destiny-knot')) { ITEMS['destiny-knot'].price = 10000; SHOP_LIST.push('destiny-knot'); }

define(Picnic, {
  MEAL_MS: 30 * 60 * 1000,
  EGG_MS: 60 * 1000,
  groups(sp) { return (window.BREEDING && BREEDING[sp] ? BREEDING[sp][0] : []); },
  cycles(sp) { return (window.BREEDING && BREEDING[sp] ? BREEDING[sp][1] : 20); },
  // 兩隻寶可夢能不能生蛋
  compatible(a, b) {
    if (a === b) return false;
    const ga = Picnic.groups(a.sp), gb = Picnic.groups(b.sp);
    if (ga.includes('no-eggs') || gb.includes('no-eggs')) return false;
    if (a.sp === 132 && b.sp === 132) return false;
    if (a.sp === 132 || b.sp === 132) return true;
    if (!a.gender || !b.gender || a.gender === b.gender || a.gender === 'n' || b.gender === 'n') return false;
    return ga.some(g => gb.includes(g));
  },
  pair(party) {
    for (let i = 0; i < party.length; i++) for (let j = i + 1; j < party.length; j++) if (Picnic.compatible(party[i], party[j])) return [party[i], party[j]];
    return null;
  },
  // 產生蛋
  makeEgg(a, b) {
    const mother = a.sp === 132 ? b : b.sp === 132 ? a : (a.gender === 'f' ? a : b);
    const father = mother === a ? b : a;
    const sp = World.baseOf(mother.sp);
    const f = Forms.get(mother);
    const form = f && f.region ? Object.keys(FORMS).find(k => FORMS[k].base === sp && FORMS[k].region === f.region) : null;
    const child = Mon.create(sp, 1, { form });
    // 個體值：3 項（紅線 5 項）隨機從雙親遺傳
    const n = a.item === 'destiny-knot' || b.item === 'destiny-knot' ? 5 : 3;
    const stats = [0, 1, 2, 3, 4, 5].sort(() => U.rand() - .5).slice(0, n);
    for (const k of stats) child.iv[k] = (U.chance(.5) ? mother : father).iv[k];
    // 性格：不變之石
    const ever = [mother, father].filter(p => p.item === 'everstone');
    if (ever.length) child.nat = U.pick(ever).nat;
    // 隱藏特性：母方（或非百變怪那方）有隱藏特性時 60% 遺傳
    const hidden = Forms.data(mother).ab.find(x => x[1]);
    if (hidden && mother.ability === hidden[0] && U.chance(.6)) child.ability = hidden[0];
    // 遺傳招式（第九世代）：雙親任一方會的蛋招式都會遺傳；招式滿 4 個時擠掉最早的
    const egg = (window.EGG_MOVES && EGG_MOVES[sp]) || [];
    for (const id of egg) {
      if (!MOVES[id] || child.moves.some(s => s.id === id) || ![mother, father].some(p => p.moves.some(s => s.id === id))) continue;
      if (child.moves.length >= 4) child.moves.shift();
      child.moves.push({ id, pp: MOVES[id].pp });
    }
    child.happy = 120;
    child.hp = Mon.maxHp(child);
    return { egg: true, mon: child, steps: Picnic.cycles(sp) * 128, laid: G.state.playMs };
  },
  // 野餐籃裡現在有幾顆蛋（依野餐開始後經過的時間）
  basket(now = G.state.playMs) {
    const p = G.state.picnic;
    if (!p) return 0;
    const pair = Picnic.pair(G.party);
    if (!pair) return 0;
    const fast = G.state.meal && G.state.meal.until > now ? 2 : 1;
    return Math.min(3, Math.floor((now - p.start) * fast / Picnic.EGG_MS)) - p.taken;
  },
  // 走一步：蛋籃裡的蛋往孵化前進（火焰之軀、熔岩鎧甲時兩倍速度）
  async step() {
    const s = G.state;
    if (!s.eggs || !s.eggs.length) return;
    const fast = G.party.some(m => m.hp > 0 && ['flame-body', 'magma-armor'].includes(m.ability)) ? 2 : 1;
    for (const e of s.eggs) e.steps -= fast;
    const ready = s.eggs.filter(e => e.steps <= 0);
    if (!ready.length) return;
    s.eggs = s.eggs.filter(e => e.steps > 0);
    for (const e of ready) await Picnic.hatch(e);
  },
  async hatch(e) {
    const m = e.mon;
    await UI.say('咦？蛋籃裡的蛋動了一下……');
    Sound.jingle('evolved');
    await UI.say(`蛋孵化了！\n生出了 ${Mon.name(m)}！`);
    const first = !G.state.caught[m.sp];
    Game.markCaught(m.sp);
    if (G.party.length < 6) G.party.push(m); else { G.state.box.push(m); await UI.say(`隊伍已經滿了，${Mon.name(m)} 被送到箱子裡了。`); }
    if (first) await Game.dexEntry(m.sp);
    Game.save(true);
  },

  // ---------- 野餐畫面 ----------
  async open() {
    const s = G.state;
    const t = World.tile(s.x, s.y);
    if (World.townAt(s.x, s.y) || s.surf || t === T.WATER || t === T.DEEP) { await UI.say('這裡不能野餐。到城鎮外的空地再試試吧。'); return; }
    s.picnic = { start: s.playMs, taken: 0, played: false };
    s.eggs = s.eggs || [];
    const root = document.createElement('div');
    root.id = 'picnic';
    root.innerHTML = `<div class="pc-table"></div><div class="pc-mons">${G.party.map((m, i) => `<div class="pc-mon" style="--d:${i * .17}s">${monIcon(m.sp, m.shiny, m.form)}</div>`).join('')}</div>`;
    document.getElementById('game').appendChild(root);
    Sound.play('route2');
    try {
      while (true) {
        const eggs = Picnic.basket();
        const meal = s.meal && s.meal.until > s.playMs ? `（${TYPES[s.meal.type].n}屬性遭遇力、經驗力：還有 ${Math.ceil((s.meal.until - s.playMs) / 60000)} 分鐘）` : '';
        const c = await UI.choose(['做三明治', '和寶可夢玩', `野餐籃${eggs > 0 ? `（${eggs} 顆蛋）` : ''}`, `蛋籃（${s.eggs.length}／6）`, '收拾'], { prompt: `正在野餐。${meal}` });
        if (c === 0) await Picnic.sandwich();
        else if (c === 1) {
          if (s.picnic.played) { await UI.say('寶可夢們玩累了，正在休息。'); continue; }
          s.picnic.played = true;
          G.party.forEach(m => { m.happy = Math.min(255, m.happy + 3); });
          root.querySelectorAll('.pc-mon').forEach(el => el.classList.add('happy'));
          await UI.say('和寶可夢們一起玩了一會兒！\n大家看起來都很開心。');
        } else if (c === 2) {
          const pair = Picnic.pair(G.party);
          if (!pair) { await UI.say('野餐籃是空的。\n（隊伍裡有同一個蛋群的公母寶可夢，或有百變怪時，野餐籃裡會出現蛋）'); continue; }
          if (eggs <= 0) { await UI.say(`野餐籃還是空的……\n${Mon.name(pair[0])} 和 ${Mon.name(pair[1])} 好像相處得很好。（過一會兒再來看看吧）`); continue; }
          let got = 0;
          for (let i = 0; i < eggs && s.eggs.length < 6; i++) { s.eggs.push(Picnic.makeEgg(pair[0], pair[1])); s.picnic.taken++; got++; }
          if (!got) { await UI.say('蛋籃已經滿了！'); continue; }
          Sound.sfx('item');
          await UI.say(`野餐籃裡有 ${got} 顆蛋！放進了蛋籃。\n（走路就會孵化）`);
        } else if (c === 3) {
          if (!s.eggs.length) { await UI.say('蛋籃裡沒有蛋。'); continue; }
          await UI.list({ title: '蛋籃', rows: s.eggs.map(e => `<div class="grow"><b>蛋</b>　<span class="dim">${e.steps > Picnic.cycles(e.mon.sp) * 128 * .66 ? '好像還要很久才會孵化。' : e.steps > Picnic.cycles(e.mon.sp) * 128 * .2 ? '偶爾會動一下。' : '好像快要孵化了！'}</span></div>`) });
        } else break;
      }
    } finally {
      root.remove();
      s.picnic = null;
      Game.updateMusic(true);
    }
  },
  async sandwich() {
    const s = G.state;
    const berries = Object.keys(s.bag).filter(id => id.endsWith('-berry') && s.bag[id] > 0);
    const total = berries.reduce((a, id) => a + s.bag[id], 0);
    if (total < 3) { await UI.say('做三明治需要 3 顆樹果。'); return; }
    const types = Object.keys(TYPES).filter(t => !['unknown', 'shadow', 'stellar'].includes(t));
    const i = await UI.list({ title: '要做哪種口味的三明治？（遭遇力的屬性）', rows: types.map(t => typeTag(t)) });
    if (i < 0) return;
    let need = 3;
    for (const id of berries.sort((a, b) => s.bag[b] - s.bag[a])) { const u = Math.min(need, s.bag[id]); Game.takeItem(id, u); need -= u; if (!need) break; }
    s.meal = { type: types[i], until: s.playMs + Picnic.MEAL_MS };
    Sound.sfx('item');
    await UI.say(`做好了美味的三明治！\n接下來 30 分鐘：${TYPES[types[i]].n}屬性的寶可夢更容易出現，獲得的經驗值變成 1.5 倍。`);
  },
  // 遭遇力：遭遇表中這個屬性的權重 ×4
  mealType() { const m = G.state && G.state.meal; return m && m.until > G.state.playMs ? m.type : null; },
});

// 遭遇力：重新抽一次，偏向三明治的屬性
const _rollWildMeal = World.rollWild;
World.rollWild = function (x, y, biome) {
  const t = Picnic.mealType();
  if (!t) return _rollWildMeal.call(this, x, y, biome);
  for (let i = 0; i < 4; i++) {
    const m = _rollWildMeal.call(this, x, y, biome);
    if (Mon.types(m).includes(t)) return m;
  }
  return _rollWildMeal.call(this, x, y, biome);
};
// 經驗力：1.5 倍
const _expGain = Mon.expGain;
Mon.expGain = function (...a) { const e = _expGain.apply(this, a); return Picnic.mealType() ? Math.floor(e * 1.5) : e; };

export { _rollWildMeal, _expGain };
