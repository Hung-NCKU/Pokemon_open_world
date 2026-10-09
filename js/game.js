// 主程式：標題、移動、建築物、選單、存檔
const SAVE_KEY = 'pkmn_openworld_save_v1';
const VW = 15, VH = 10;

const G = {
  mode: 'title',
  state: null,
  get party() { return this.state.party; },
  busy: false,
  keys: new Set(),
  move: null, // {fx,fy,tx,ty,t,dur}
  stepAnim: 0,
  frame: 0,
  settings: { textSpeed: 22, battleAuto: 900 },
  lastTown: null,
};

const Game = {
  // ---------- 存檔 ----------
  newState(name, region, starter) {
    const seed = Math.floor(Math.random() * 1e9);
    return {
      v: 1, seed, region, name, x: 0, y: 0, dir: 'down', surf: false,
      party: [], box: [],
      bag: { 'poke-ball': 5, 'potion': 3 },
      money: 3000, badges: {}, champs: {}, seen: {}, caught: {},
      defeated: {}, visited: {}, center: null, repel: 0, steps: 0, playMs: 0,
      flags: {}, starter,
    };
  },
  save(silent = false) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(G.state));
      if (!silent) UI.banner('已儲存遊戲進度');
      return true;
    } catch (e) { console.error(e); UI.banner('存檔失敗！'); return false; }
  },
  loadSave() {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  },

  markSeen(id) { G.state.seen[id] = 1; },
  markCaught(id) { G.state.seen[id] = 1; G.state.caught[id] = 1; },
  dexCount() { return [Object.keys(G.state.seen).length, Object.keys(G.state.caught).length]; },
  takeItem(id, n = 1) { G.state.bag[id] = (G.state.bag[id] || 0) - n; if (G.state.bag[id] <= 0) delete G.state.bag[id]; },
  giveItem(id, n = 1) { G.state.bag[id] = (G.state.bag[id] || 0) + n; },
  badgeCount(region) {
    if (region) return (G.state.badges[region] || []).length;
    return Object.values(G.state.badges).reduce((a, b) => a + b.length, 0);
  },
  canSurf() { return G.party.some(m => m.hp > 0 && (Mon.types(m).includes('water') || m.moves.some(x => x.id === 57))); },
  canFly() { return G.party.some(m => m.hp > 0 && (Mon.types(m).includes('flying') || m.moves.some(x => x.id === 19))); },

  async addCaught(m) {
    const first = !G.state.caught[m.sp];
    Game.markCaught(m.sp);
    if (first) await UI.say(`${Mon.name(m)} 的資料已登錄到寶可夢圖鑑！`, { auto: 1200 });
    m.happy = Math.max(m.happy, 70);
    if (G.party.length < 6) G.party.push(m);
    else { G.state.box.push(m); await UI.say(`${Mon.name(m)} 已被傳送到電腦的寄放系統。`, { auto: 1200 }); }
  },

  // ---------- 經驗值、升級、學招式、進化 ----------
  async giveExp(m, amt, battle) {
    const s = POKEDEX[m.sp];
    m.exp += amt;
    const say = t => battle ? battle.msg(t) : UI.say(t);
    while (m.lv < 100 && m.exp >= Mon.expFor(s.gr, m.lv + 1)) {
      const before = Mon.stats(m);
      m.lv++;
      const after = Mon.stats(m);
      if (m.hp > 0) m.hp += after[0] - before[0];
      m.happy = Math.min(255, m.happy + (m.item === 'soothe-bell' ? 7 : 5));
      m._lvUp = true;
      if (battle) battle.draw();
      Sound.jingle('levelup');
      await say(`${Mon.name(m)} 升到了 Lv.${m.lv}！`);
      for (const [lv, mid] of s.l) if (lv === m.lv) await Game.learnMove(m, mid, battle);
    }
    if (m.lv >= 100) m.exp = Math.min(m.exp, Mon.expFor(s.gr, 100));
    if (battle) battle.draw();
  },

  async learnMove(m, mid, battle) {
    const mv = MOVES[mid];
    if (!mv || m.moves.some(x => x.id === mid)) return;
    const say = t => UI.say(t);
    const name = Mon.name(m);
    if (m.moves.length < 4) {
      m.moves.push({ id: mid, pp: mv.pp });
      await say(`${name} 學會了 ${mv.n}！`);
      return;
    }
    if (md(mid).support !== 'full') await say(`提醒：${mv.n} ${SUPPORT_ZH[md(mid).support]}。`);
    await say(`${name} 想要學習新招式 ${mv.n}，但是 ${name} 已經學會 4 個招式了。`);
    while (true) {
      const c = await UI.choose(['忘記一個招式', '放棄學習'], { prompt: `要忘記一個招式來學習 ${mv.n} 嗎？`, cancel: false });
      if (c === 0) {
        const sup = id => `<small>${SUPPORT_ZH[md(id).support]}</small>`;
        const opts = m.moves.map(x => ({ html: `${typeTag(MOVES[x.id].t)} ${U.esc(MOVES[x.id].n)} <small>威力 ${MOVES[x.id].p || '—'}</small>${sup(x.id)}` }));
        opts.push({ html: `<b>${typeTag(mv.t)} ${U.esc(mv.n)} <small>威力 ${mv.p || '—'}</small>${sup(mid)}（不學）</b>` });
        const i = await UI.choose(opts, { prompt: `要忘記哪一個招式？\n新招式：${mv.n}　${mv.d || ''}` });
        if (i >= 0 && i < 4) {
          const old = MOVES[m.moves[i].id].n;
          m.moves[i] = { id: mid, pp: mv.pp };
          await say(`1、2、3……噗！${name} 忘記了 ${old}，並學會了 ${mv.n}！`);
          return;
        }
      }
      const c2 = await UI.choose(['是', '否'], { prompt: `要放棄學習 ${mv.n} 嗎？`, cancel: false });
      if (c2 === 0) { await say(`${name} 沒有學習 ${mv.n}。`); return; }
    }
  },

  async evolve(m, to) {
    const from = Mon.name(m);
    const box = document.createElement('div');
    box.className = 'evolve';
    box.innerHTML = `<img class="a" src="${Mon.sprite(m.sp, { shiny: m.shiny })}"><img class="b" src="${Mon.sprite(to, { shiny: m.shiny })}">`;
    document.getElementById('game').appendChild(box);
    await UI.say(`咦？${from} 的樣子……！`);
    box.classList.add('go');
    Sound.play('evolution');
    let cancelled = false;
    const pop = UI.pushKey(e => { if (UI.isNo(e)) cancelled = true; });
    await U.sleep(3200);
    pop();
    if (cancelled) {
      box.remove();
      await UI.say(`咦？${from} 停止進化了。`);
      return;
    }
    box.classList.add('done');
    const before = Mon.stats(m);
    const fromSp = m.sp;
    m.sp = to;
    Abil.afterEvolve(m, fromSp, to);
    const after = Mon.stats(m);
    m.hp = Math.max(m.hp > 0 ? 1 : 0, m.hp + after[0] - before[0]);
    Game.markCaught(to);
    Sound.jingle('evolve');
    await UI.say(`恭喜！${from} 進化成了 ${POKEDEX[to].n}！`);
    box.remove();
    if (G.mode === 'world') Game.updateMusic(true);
    for (const [lv, mid] of POKEDEX[to].l) if (lv === m.lv) await Game.learnMove(m, mid);
    // 鬼斯通→耿鬼這類多段即時進化不處理；脫殼忍者特例
    if (to === 291 && G.party.length < 6 && Game.takeBall()) {
      const sh = Mon.create(292, m.lv);
      G.party.push(sh);
      Game.markCaught(292);
      await UI.say('隊伍中多了一隻 鐵面忍者 ！');
    }
  },
  takeBall() { if (G.state.bag['poke-ball']) { Game.takeItem('poke-ball'); return true; } return false; },

  // 道具效果（回傳是否有使用）
  async applyItem(m, id, inBattle = false) {
    const it = ITEMS[id];
    const name = Mon.name(m);
    const max = Mon.maxHp(m);
    if (it.kind === 'heal') {
      const h = Math.min(it.hp, max - m.hp);
      m.hp += h;
      await UI.say(`${name} 回復了 ${h} HP！`, inBattle ? { auto: 900 } : {});
    } else if (it.kind === 'cure') {
      m.st = null;
      await UI.say(`${name} 恢復了健康！`, inBattle ? { auto: 900 } : {});
    } else if (it.kind === 'revive') {
      m.hp = Math.floor(max / 2);
      await UI.say(`${name} 恢復了精神！`, inBattle ? { auto: 900 } : {});
    } else if (it.kind === 'pp') {
      m.moves.forEach(x => { x.pp = Math.min(MOVES[x.id].pp, x.pp + 10); });
      await UI.say(`${name} 的 PP 回復了！`, inBattle ? { auto: 900 } : {});
    } else if (it.kind === 'candy') {
      const s = POKEDEX[m.sp];
      await Game.giveExp(m, Mon.expFor(s.gr, m.lv + 1) - m.exp);
      const c = Mon.evoCandidates(m);
      delete m._lvUp;
      if (c.length && m.item !== 'everstone') await Game.evolve(m, Mon.pickEvo(m, c));
    } else if (it.kind === 'evo') {
      const c = Mon.evoCandidates(m, id);
      await Game.evolve(m, Mon.pickEvo(m, c));
    }
  },
  itemUsable(m, id, inBattle) {
    const it = ITEMS[id], max = Mon.maxHp(m);
    switch (it.kind) {
      case 'heal': return m.hp > 0 && m.hp < max;
      case 'cure': return m.hp > 0 && !!m.st;
      case 'revive': return m.hp <= 0;
      case 'pp': return m.moves.some(x => x.pp < MOVES[x.id].pp);
      case 'candy': return !inBattle && m.lv < 100;
      case 'evo': return !inBattle && Mon.evoCandidates(m, id).length > 0;
      default: return false;
    }
  },

  // ---------- 選單 ----------
  partyRow(m, i, extra = '') {
    const max = Mon.maxHp(m);
    return `<img class="icon" src="${Mon.sprite(m.sp, { shiny: m.shiny })}" loading="lazy">
      <div class="grow"><div><b>${U.esc(Mon.name(m))}</b>${m.shiny ? ' ✨' : ''} <span class="lv">Lv.${m.lv}</span> ${UI.statusTag(m.st)} ${m.hp <= 0 ? '<span class="st" style="background:#555">瀕死</span>' : ''}</div>
      <div class="hprow">${UI.hpBar(m.hp, max, 160)} <span>${Math.max(0, m.hp)}/${max}</span></div></div>
      <div class="types">${Mon.types(m).map(typeTag).join('')}</div>${extra}`;
  },

  async partyMenu({ battle = null, forced = false, pick = null } = {}) {
    let start = battle ? battle.myIdx : 0;
    while (true) {
      const rows = G.party.map((m, i) => ({ html: Game.partyRow(m, i, battle && i === battle.myIdx ? '<span class="tag">戰鬥中</span>' : ''), disabled: pick ? !pick(m) : false }));
      const title = pick ? '要對哪一隻寶可夢使用？' : battle ? (forced ? '要派出哪一隻寶可夢？' : '寶可夢') : '寶可夢';
      const i = await UI.list({ title, rows, start, cancel: !forced });
      if (i < 0) return -1;
      start = i;
      if (pick) return i;
      const m = G.party[i];
      if (battle) {
        const c = await UI.choose(['替換', '查看能力', '取消'], { prompt: `要對 ${Mon.name(m)} 做什麼？` });
        if (c === 0) {
          if (m.hp <= 0) { await UI.say(`${Mon.name(m)} 已經沒有力氣戰鬥了！`); continue; }
          if (i === battle.myIdx) { await UI.say(`${Mon.name(m)} 已經在戰鬥中了！`); continue; }
          return i;
        }
        if (c === 1) await Game.summary(m);
        continue;
      }
      const c = await UI.choose(['查看能力', '持有道具', '換到首位', '取名', '取消'], { prompt: `要對 ${Mon.name(m)} 做什麼？` });
      if (c === 0) await Game.summary(m);
      else if (c === 1) await Game.heldMenu(m);
      else if (c === 2 && i > 0) { G.party.splice(i, 1); G.party.unshift(m); start = 0; }
      else if (c === 3) { const n = await UI.input('要幫牠取什麼名字？（留空恢復原名）', ''); m.nick = n && n !== POKEDEX[m.sp].n ? n : undefined; }
      UI.hideDialog();
    }
  },

  // 持有道具：交給寶可夢、取下
  async heldMenu(m) {
    const name = Mon.name(m);
    const opts = m.item ? ['交換道具', '取下道具', '取消'] : ['給予道具', '取消'];
    const c = await UI.choose(opts, { prompt: m.item ? `${name} 正攜帶著${Held.name(m.item)}。` : `${name} 沒有攜帶任何道具。` });
    if (opts[c] === '取下道具') {
      Game.giveItem(m.item);
      await UI.say(`從 ${name} 身上取下了${Held.name(m.item)}。`);
      m.item = null;
      return;
    }
    if (opts[c] !== '交換道具' && opts[c] !== '給予道具') return;
    const ids = Object.keys(G.state.bag).filter(id => ITEMS[id] && (ITEMS[id].kind === 'held' || ITEMS[id].held) && G.state.bag[id] > 0);
    if (!ids.length) { await UI.say('背包裡沒有可以攜帶的道具。'); return; }
    const i = await UI.list({ title: '要讓牠攜帶什麼？', rows: ids.map(id => `<div class="grow"><b>${U.esc(ITEMS[id].n)}</b><div class="dim small">${U.esc(ITEMS[id].d)}</div></div><div>× ${G.state.bag[id]}</div>`) });
    if (i >= 0) await Game.giveHeld(m, ids[i]);
  },
  async giveHeld(m, id) {
    Game.takeItem(id);
    if (m.item) { Game.giveItem(m.item); await UI.say(`把${Held.name(m.item)}放回了背包。`); }
    m.item = id;
    await UI.say(`讓 ${Mon.name(m)} 攜帶了${Held.name(id)}。`);
  },

  async summary(m) {
    const s = POKEDEX[m.sp];
    const st = Mon.stats(m);
    const up = NAT_STAT[Math.floor(m.nat / 5)], down = NAT_STAT[m.nat % 5];
    const next = m.lv >= 100 ? 0 : Mon.expFor(s.gr, m.lv + 1) - m.exp;
    const statRows = st.map((v, i) => `<tr><td class="${i === up && up !== down ? 'nup' : i === down && up !== down ? 'ndown' : ''}">${STAT_ZH[i]}</td><td>${i === 0 ? `${Math.max(0, m.hp)}/${v}` : v}</td>
      <td><div class="sbar"><div style="width:${Math.min(100, s.s[i] / 1.6)}%"></div></div></td><td class="dim">種族 ${s.s[i]}／個體 ${m.iv[i]}／努力 ${m.ev?.[i] || 0}</td></tr>`).join('');
    const moves = m.moves.map(x => {
      const d = MOVES[x.id];
      return `<div class="mv">${typeTag(d.t)} <b>${U.esc(d.n)}</b> <span class="dim">${d.c === 'ph' ? '物理' : d.c === 'sp' ? '特殊' : '變化'}｜威力 ${d.p || '—'}｜命中 ${d.a || '—'}｜PP ${x.pp}/${d.pp}</span><b class="small">${SUPPORT_ZH[md(x.id).support]}</b><div class="dim small">${U.esc(d.d || '')}</div></div>`;
    }).join('');
    await UI.panel(`<div class="summary">
      <div class="left"><img class="big" src="${Mon.sprite(m.sp, { shiny: m.shiny })}">
        <div class="nm">No.${U.pad3(s.id)} ${U.esc(Mon.name(m))}${m.shiny ? ' ✨' : ''}</div>
        <div>${s.t.map(typeTag).join('')}</div>
        <div class="dim">Lv.${m.lv} ${Mon.genderMark(m)}　性格：${NATURES[m.nat]}</div>
        <div class="dim">努力值合計 ${(m.ev || []).reduce((a, b) => a + b, 0)}／510</div>
        <div class="dim">距離升級還需 ${next} 經驗值</div>
        <div class="dim">親密度 ${m.happy}</div>
        <div class="ab"><b>特性：${U.esc(Abil.name(m.ability))}</b>${Abil.supported(m.ability) ? '' : '<small>（效果未實作）</small>'}<div class="dim small">${U.esc(Abil.desc(m.ability))}</div></div>
        <div class="ab"><b>持有：${m.item ? U.esc(Held.name(m.item)) : '無'}</b>${m.item && !IT_IMPL.has(m.item) && ITEMS[m.item] && ITEMS[m.item].kind !== 'evo' ? '<small>（效果未實作）</small>' : ''}</div>
      </div>
      <div class="right"><table class="stats">${statRows}</table><div class="moves">${moves}</div></div></div>`);
  },

  async bagMenu({ battle = null } = {}) {
    let start = 0;
    while (true) {
      const ids = Object.keys(G.state.bag).filter(id => ITEMS[id] && G.state.bag[id] > 0);
      const rows = ids.map(id => `<div class="grow"><b>${U.esc(ITEMS[id].n)}</b><div class="dim small">${U.esc(ITEMS[id].d)}</div></div><div>× ${G.state.bag[id]}</div>`);
      const i = await UI.list({ title: '背包', rows, start, extra: `💰 ${G.state.money} 元` });
      if (i < 0) return null;
      start = i;
      const id = ids[i], it = ITEMS[id];
      if (it.kind === 'ball') {
        if (!battle) { await UI.say('現在不能使用這個道具。'); UI.hideDialog(); continue; }
        return { item: id };
      }
      if (it.kind === 'held' || (it.held && !battle && (await UI.choose(['讓寶可夢攜帶', '使用'], { prompt: `要怎麼使用${it.n}？` })) === 0)) {
        if (battle) { await UI.say('現在不能使用這個道具。'); continue; }
        const t = await Game.partyMenu({ pick: () => true });
        if (t >= 0) await Game.giveHeld(G.party[t], id);
        UI.hideDialog();
        continue;
      }
      if (it.kind === 'repel') {
        if (battle) { await UI.say('現在不能使用這個道具。'); continue; }
        Game.takeItem(id);
        G.state.repel = it.steps;
        await UI.say(`使用了${it.n}！接下來 ${it.steps} 步不會遇到野生寶可夢。`);
        UI.hideDialog();
        continue;
      }
      const t = await Game.partyMenu({ battle, pick: m => Game.itemUsable(m, id, !!battle) });
      if (t < 0) continue;
      if (battle) return { item: id, target: t };
      Game.takeItem(id);
      await Game.applyItem(G.party[t], id);
      UI.hideDialog();
    }
  },

  async dexMenu() {
    let start = 0;
    const ids = Object.keys(POKEDEX).map(Number).sort((a, b) => a - b);
    const [seen, caught] = Game.dexCount();
    while (true) {
      const rows = ids.map(id => {
        const s = POKEDEX[id];
        const sn = G.state.seen[id], ct = G.state.caught[id];
        return `<span class="dexno">No.${U.pad3(id)}</span>${sn ? `<img class="icon" loading="lazy" src="${Mon.sprite(id)}">` : '<span class="icon unk">?</span>'}
          <div class="grow"><b>${sn ? U.esc(s.n) : '？？？'}</b> ${sn ? s.t.map(typeTag).join('') : ''}</div>${ct ? '<span class="ball-mark">●</span>' : ''}<span class="dim small">第${s.g}世代</span>`;
      });
      const i = await UI.list({ title: '寶可夢圖鑑', rows, start, extra: `發現 ${seen}／捕捉 ${caught}／全 ${ids.length}` });
      if (i < 0) return;
      start = i;
      const id = ids[i], s = POKEDEX[id];
      if (!G.state.seen[id]) continue;
      // 進化條件：列出所有條件組，改編的條件會註明原作的方式
      const evo = (s.ev || []).map(e => `→ ${G.state.seen[e.to] ? POKEDEX[e.to].n : '？？？'}：${(e.c || [e]).map(c => Mon.evoText(c)).join(' 或 ')}`).join('<br>');
      const ey = (s.ey || []).map((v, k) => v ? `${STAT_ZH[k]}+${v}` : '').filter(Boolean).join(' ');
      await UI.panel(`<div class="summary"><div class="left"><img class="big" src="${Mon.sprite(id)}"><div class="nm">No.${U.pad3(id)} ${U.esc(s.n)}</div>
        <div class="dim">${U.esc(s.gen)}</div><div>${s.t.map(typeTag).join('')}</div>${s.lg ? `<div class="legend">${s.lg === 1 ? '傳說的寶可夢' : '幻之寶可夢'}</div>` : ''}
        <div class="dim small">特性：${(s.ab || []).map(([a, h]) => U.esc(Abil.name(a)) + (h ? '（隱藏）' : '')).join('／')}</div></div>
        <div class="right"><p>${G.state.caught[id] ? U.esc(s.fl) : '捕捉後可以查看更多資料。'}</p>
        <table class="stats">${s.s.map((v, k) => `<tr><td>${STAT_ZH[k]}</td><td>${v}</td><td><div class="sbar"><div style="width:${Math.min(100, v / 1.6)}%"></div></div></td></tr>`).join('')}<tr><td>總和</td><td>${Mon.bst(id)}</td></tr></table>
        <p class="dim">捕捉率 ${s.cr}　打倒後的努力值：${ey || '無'}${evo ? '<br>' + evo : ''}</p></div></div>`);
    }
  },

  async shopMenu() {
    let start = 0;
    await UI.say('歡迎光臨！請問需要什麼呢？');
    while (true) {
      const rows = SHOP_LIST.map(id => `<div class="grow"><b>${U.esc(ITEMS[id].n)}</b><div class="dim small">${U.esc(ITEMS[id].d)}</div></div><div class="dim">持有 ${G.state.bag[id] || 0}</div><div class="price">${ITEMS[id].price} 元</div>`);
      const i = await UI.list({ title: '友好商店', rows, start, extra: `💰 ${G.state.money} 元` });
      if (i < 0) break;
      start = i;
      const id = SHOP_LIST[i], it = ITEMS[id];
      const qs = [1, 5, 10, 25];
      const c = await UI.choose(qs.map(q => ({ label: `${q} 個（${q * it.price} 元）`, disabled: q * it.price > G.state.money })), { prompt: `${it.n} 要買幾個？` });
      if (c < 0) continue;
      const q = qs[c];
      G.state.money -= q * it.price;
      Game.giveItem(id, q);
      let msg = `買了 ${q} 個${it.n}！謝謝惠顧！`;
      if (it.kind === 'ball' && q >= 10) { Game.giveItem('premier-ball' in ITEMS ? 'premier-ball' : 'poke-ball', Math.floor(q / 10)); msg += `\n另外送你 ${Math.floor(q / 10)} 個精靈球！`; }
      await UI.say(msg);
    }
    await UI.say('歡迎再次光臨！');
  },

  async pcMenu() {
    while (true) {
      const c = await UI.choose(['寄放寶可夢', '領取寶可夢', '離開'], { prompt: `已連接到寶可夢寄放系統。（箱子裡有 ${G.state.box.length} 隻）` });
      if (c === 0) {
        if (G.party.length <= 1) { await UI.say('隊伍裡至少要留一隻寶可夢！'); continue; }
        const i = await UI.list({ title: '要寄放哪一隻？', rows: G.party.map((m, k) => Game.partyRow(m, k)) });
        if (i < 0) continue;
        if (G.party.filter((m, k) => k !== i && m.hp > 0).length === 0) { await UI.say('不能寄放最後一隻能戰鬥的寶可夢！'); continue; }
        const m = G.party.splice(i, 1)[0];
        Mon.heal(m);
        G.state.box.push(m);
        await UI.say(`寄放了 ${Mon.name(m)}。`);
      } else if (c === 1) {
        if (G.party.length >= 6) { await UI.say('隊伍已經滿了！'); continue; }
        if (!G.state.box.length) { await UI.say('箱子裡沒有寶可夢。'); continue; }
        const sorted = G.state.box.map((m, k) => [m, k]).sort((a, b) => a[0].sp - b[0].sp);
        const i = await UI.list({ title: `領取寶可夢（${G.state.box.length} 隻）`, rows: sorted.map(([m]) => Game.partyRow(m, 0)) });
        if (i < 0) continue;
        const k = sorted[i][1];
        const m = G.state.box.splice(k, 1)[0];
        G.party.push(m);
        await UI.say(`領取了 ${Mon.name(m)}。`);
      } else return;
    }
  },

  async mapMenu() {
    const town = World.townAt(G.state.x, G.state.y);
    const m = document.createElement('div');
    m.className = 'modal mapmodal';
    const scale = 0.6;
    m.innerHTML = `<h2><span>世界地圖</span><span class="extra">${REGIONS[World.regionAt(G.state.x, G.state.y)].n}地區${town ? '・' + town.name : ''}</span></h2><div class="body"><div class="mapwrap"></div></div><div class="hint">● 白：去過的城鎮　● 紅：你的位置　X 返回${Game.canFly() ? '　F 飛翔' : ''}</div>`;
    const wrap = m.querySelector('.mapwrap');
    const c = document.createElement('canvas');
    c.width = WW; c.height = WH;
    c.style.width = WW * scale + 'px'; c.style.height = WH * scale + 'px';
    const g = c.getContext('2d');
    g.drawImage(World.mapCanvas, 0, 0);
    for (const t of World.towns) {
      const v = G.state.visited[t.id];
      g.fillStyle = v ? '#fff' : 'rgba(80,80,80,.8)';
      g.fillRect(t.x, t.y, TOWN_W, TOWN_H);
      g.strokeStyle = t.kind === 'league' ? '#ffd700' : t.kind === 'home' ? '#4cf' : '#333';
      g.lineWidth = 2; g.strokeRect(t.x, t.y, TOWN_W, TOWN_H);
    }
    g.font = 'bold 20px "Microsoft JhengHei"'; g.textAlign = 'center';
    for (const k of REGION_KEYS) {
      const [x, y, r] = REGION_POS[k];
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(REGIONS[k].n, x + 1, y - r - 3);
      g.fillStyle = '#fff'; g.fillText(REGIONS[k].n, x, y - r - 4);
    }
    g.fillStyle = '#f22'; g.beginPath(); g.arc(G.state.x, G.state.y, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    wrap.appendChild(c);
    document.getElementById('game').appendChild(m);
    const action = await new Promise(res => {
      const pop = UI.pushKey(e => {
        if (e.repeat) return;
        if ((e.key === 'f' || e.key === 'F') && Game.canFly()) { pop(); res('fly'); }
        else if (UI.isNo(e) || UI.isOk(e) || e.key === 'm' || e.key === 'M') { pop(); res(null); }
      });
      c.onclick = ev => {
        const r = c.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width * WW, y = (ev.clientY - r.top) / r.height * WH;
        const t = World.towns.find(t => x >= t.x - 4 && x <= t.x + TOWN_W + 4 && y >= t.y - 4 && y <= t.y + TOWN_H + 4);
        if (t && G.state.visited[t.id] && Game.canFly()) { pop(); res(t); }
      };
    });
    m.remove();
    let dest = action && action !== 'fly' ? action : null;
    if (action === 'fly') {
      const list = World.towns.filter(t => G.state.visited[t.id]);
      const i = await UI.list({ title: '要飛到哪裡？', rows: list.map(t => `<div class="grow"><b>${U.esc(t.name)}</b></div><span class="dim">${REGIONS[t.region].n}地區</span>`) });
      if (i >= 0) dest = list[i];
    }
    if (dest) {
      const flyer = G.party.find(m => m.hp > 0 && (Mon.types(m).includes('flying') || m.moves.some(x => x.id === 19)));
      await UI.say(`${Mon.name(flyer)} 使用了飛翔！`);
      Game.warp(dest.x + 4, dest.y + 6, 'down');
    }
  },

  async mainMenu() {
    const items = ['寶可夢', '圖鑑', '背包', '地圖', '訓練家卡片', '存檔', '設定', '關閉'];
    while (true) {
      const c = await UI.choose(items, { cls: 'side-menu' });
      if (c < 0 || c === 7) return;
      if (c === 0) await Game.partyMenu();
      if (c === 1) await Game.dexMenu();
      if (c === 2) await Game.bagMenu();
      if (c === 3) { await Game.mapMenu(); return; }
      if (c === 4) await Game.trainerCard();
      if (c === 5) {
        const ok = await UI.choose(['是', '否'], { prompt: '要儲存目前的進度嗎？' });
        if (ok === 0 && Game.save(true)) Sound.sfx('save'), await UI.say(`${G.state.name} 將進度儲存好了！`);
      }
      if (c === 6) await Game.settingsMenu();
      UI.hideDialog();
    }
  },

  async trainerCard() {
    const [seen, caught] = Game.dexCount();
    const ms = G.state.playMs;
    const badges = REGION_KEYS.map(r => {
      const got = G.state.badges[r] || [];
      return `<div class="badgerow"><b>${REGIONS[r].n}</b> ${LEADERS[r].map((l, i) => `<span class="badge ${got.includes(i) ? 'on' : ''}" style="--c:${TYPES[l[1]].c}" title="${l[0]}"></span>`).join('')}${G.state.champs[r] ? ' 👑' : ''}</div>`;
    }).join('');
    await UI.panel(`<div class="card"><h3>訓練家卡片</h3>
      <p>名字：<b>${U.esc(G.state.name)}</b>　出身：${REGIONS[G.state.region].n}地區</p>
      <p>零用錢：${G.state.money} 元　圖鑑：發現 ${seen}／捕捉 ${caught}</p>
      <p>遊玩時間：${Math.floor(ms / 3600000)} 小時 ${Math.floor(ms / 60000) % 60} 分　徽章：${Game.badgeCount()}／72</p>
      ${badges}</div>`);
  },

  async settingsMenu() {
    const c = await UI.choose(['文字速度：慢', '文字速度：普通', '文字速度：快', '戰鬥訊息：自動前進', '戰鬥訊息：手動按鍵'], { prompt: '設定' });
    if (c >= 0 && c <= 2) G.settings.textSpeed = [40, 22, 0][c];
    if (c === 3) G.settings.battleAuto = 900;
    if (c === 4) G.settings.battleAuto = 0;
    try { localStorage.setItem(SAVE_KEY + '_settings', JSON.stringify(G.settings)); } catch { }
  },

  // ---------- 背景音樂 ----------
  updateMusic(force = false) {
    if (G.mode !== 'world' || !G.state) return;
    const s = G.state;
    const town = World.townAt(s.x, s.y);
    let name;
    if (s.surf) name = 'surf';
    else if (town) {
      if (town.kind === 'league') name = 'ever_grande';
      else if (town.kind === 'home') name = 'home';
      else name = ['town', 'city', 'town2', 'city2'][town.id % 4];
    } else {
      const t = World.tile(s.x, s.y);
      const ri = REGION_KEYS.indexOf(World.regionAt(s.x, s.y));
      if (t === T.DESERT) name = 'desert';
      else if (t === T.SNOW || t === T.SNOWTALL) name = 'snow';
      else if (t === T.CAVE || t === T.MOUNT) name = 'cave';
      else name = ['route', 'route2', 'route3'][ri % 3];
    }
    // 只在進出城鎮、開始／結束衝浪、跨越地區時換曲，避免野外地形交錯時頻繁切換
    const zone = town ? 'town' + town.id : s.surf ? 'surf' : 'wild' + World.regionAt(s.x, s.y);
    if (force || zone !== G.musicZone) {
      G.musicZone = zone;
      Sound.play(name);
    }
  },

  // ---------- 世界互動 ----------
  warp(x, y, dir) {
    G.state.x = x; G.state.y = y; G.state.dir = dir || G.state.dir; G.state.surf = false;
    G.move = null;
  },

  healParty() { G.party.forEach(Mon.heal); },

  async enterBuilding(b) {
    const t = b.town;
    if (b.kind === 'center') {
      await UI.say('歡迎來到寶可夢中心。');
      const c = await UI.choose(['治療寶可夢', '使用電腦', '離開'], { prompt: '這裡可以讓你的寶可夢恢復健康。' });
      if (c === 0) {
        await UI.say('那麼，請把你的寶可夢交給我一會兒。');
        Game.healParty();
        G.state.center = { x: b.door.x, y: b.door.y + 1 };
        await Sound.jingle('heal');
        await UI.say('讓你久等了！你的寶可夢都已經恢復健康了。');
        Game.save(true);
        await UI.say('期待你再次光臨！');
      } else if (c === 1) await Game.pcMenu();
    } else if (b.kind === 'mart') {
      await Game.shopMenu();
    } else if (b.kind === 'house') {
      if (t.region === G.state.region) {
        Game.healParty();
        await UI.say('媽媽：「歡迎回家！好好休息一下吧。」\n（寶可夢都恢復了精神！）');
      } else await UI.say('這裡沒有人在家。');
    } else if (b.kind === 'lab') {
      await Game.labTalk(t);
    } else if (b.kind === 'gym') {
      await Game.gymChallenge(t);
    } else if (b.kind === 'league') {
      await Game.leagueChallenge(t);
    }
  },

  async labTalk(t) {
    const reg = REGIONS[t.region];
    const [seen, caught] = Game.dexCount();
    await UI.say(`${reg.prof}：「歡迎來到寶可夢研究所！」`);
    const key = 'gift_' + t.region;
    if (!G.state.flags[key]) {
      G.state.flags[key] = 1;
      Game.giveItem('poke-ball', 10);
      Game.giveItem('potion', 5);
      await UI.say(`${reg.prof}：「這是給你的禮物，拿去用吧！」\n獲得了 10 個精靈球和 5 個傷藥！`);
    }
    let comment = '寶可夢的世界很廣大，到處去冒險吧！';
    if (caught >= 1000) comment = '太驚人了！你幾乎完成了整本圖鑑！';
    else if (caught >= 500) comment = '你已經捕捉了一半以上的寶可夢，真了不起！';
    else if (caught >= 150) comment = '很不錯！試著到其他地區看看吧，那裡有不同的寶可夢。';
    else if (caught >= 50) comment = '進展很順利！草叢、水面、岩地、雪原、沙漠都住著不同的寶可夢。';
    await UI.say(`${reg.prof}：「你已經發現了 ${seen} 種，捕捉了 ${caught} 種寶可夢。${comment}」`);
  },

  async gymChallenge(t) {
    const [name, type] = LEADERS[t.region][t.gym];
    const got = (G.state.badges[t.region] || []).includes(t.gym);
    const title = REGIONS[t.region].gen === 7 ? '' : '道館館主';
    if (got) { await UI.say(`${name}：「你的實力我已經見識過了。繼續加油吧！」`); return; }
    await UI.say(`這裡是${t.name}道館，館主是擅長${TYPES[type].n}屬性的${name}！`);
    const c = await UI.choose(['挑戰', '離開'], { prompt: `要挑戰${title}${name}嗎？（建議等級 ${World.levelAt(t.cx, t.cy) + 4}）` });
    if (c !== 0) return;
    await UI.say(`${name}：「歡迎你，挑戰者！就讓我用${TYPES[type].n}屬性寶可夢來試試你的實力吧！」`);
    const party = World.gymParty(t);
    const r = await Game.battle({ trainer: { title, name, party, kind: 'gym', money: 100, sprite: LEADER_SPRITES[t.region][t.gym], lose: '……我輸了。這枚徽章是你的了！' }, biome: 'gym' });
    if (r === 'win') {
      (G.state.badges[t.region] = G.state.badges[t.region] || []).push(t.gym);
      Sound.jingle('badge');
      await UI.say(`獲得了${t.name}道館的徽章！（${REGIONS[t.region].n}徽章 ${Game.badgeCount(t.region)}／8）`);
      if (Game.badgeCount(t.region) === 8) await UI.say(`收集齊了${REGIONS[t.region].n}地區的 8 枚徽章！可以挑戰${REGIONS[t.region].n}寶可夢聯盟了！`);
      Game.save(true);
    }
  },

  async leagueChallenge(t) {
    const reg = REGIONS[t.region];
    if (Game.badgeCount(t.region) < 8) {
      await UI.say(`警衛：「要挑戰${reg.n}寶可夢聯盟，必須收集${reg.n}地區的 8 枚徽章。」\n（目前 ${Game.badgeCount(t.region)}／8）`);
      return;
    }
    const c = await UI.choose(['挑戰', '離開'], { prompt: `要挑戰${reg.n}冠軍 ${reg.champ} 嗎？（建議等級 ${World.levelAt(t.cx, t.cy) + 10}）` });
    if (c !== 0) return;
    await UI.say(`${reg.champ}：「歡迎來到${reg.n}寶可夢聯盟。讓我看看你和寶可夢之間的羈絆吧！」`);
    const party = World.championParty(t);
    const r = await Game.battle({ trainer: { title: '冠軍', name: reg.champ, party, kind: 'champion', money: 200, sprite: CHAMP_SPRITES[t.region], lose: '恭喜你！你就是新的冠軍！' }, biome: 'gym' });
    if (r === 'win') {
      const first = !Object.keys(G.state.champs).length;
      G.state.champs[t.region] = 1;
      await UI.say(`恭喜！${G.state.name} 成為了${reg.n}地區的冠軍！你和寶可夢的名字已被記錄在名人堂中！`);
      if (first) { Game.giveItem('master-ball', 1); await UI.say('獲得了大師球！'); }
      Game.save(true);
    }
  },

  async battle(opts) {
    const b = new Battle(opts);
    const r = await b.run();
    if (r === 'lose') await Game.blackout();
    return r;
  },

  async blackout() {
    const c = G.state.center || { x: World.homeTown.x + 4, y: World.homeTown.y + 6 };
    Game.warp(c.x, c.y, 'down');
    Game.healParty();
    await UI.say('……\n你急忙回到了寶可夢中心，寶可夢都已經恢復健康了。');
  },

  async trainerBattle(tr) {
    const cls = TRAINER_CLASSES[tr.cls];
    const lines = ['眼神交會就是對戰的信號！', '來對戰吧！', '我的寶可夢可是很強的喔！', '你看起來很強，我們來比一場！', '終於等到人了！'];
    await UI.say(`${cls.n} ${tr.name}：「${lines[tr.seed % lines.length]}」`);
    const party = World.trainerParty(tr);
    const r = await Game.battle({ trainer: { title: cls.n, name: tr.name, party, kind: 'trainer', money: 40, sprite: TRAINER_BATTLE_SPRITES[tr.cls], lose: '輸了啊……你好強！' }, biome: Game.biomeHere() });
    if (r === 'win') G.state.defeated[tr.x + ',' + tr.y] = 1;
  },

  biomeHere() {
    const t = World.tile(G.state.x, G.state.y);
    return { [T.TALL]: 'tall', [T.SNOW]: 'snow', [T.SNOWTALL]: 'snow', [T.WATER]: 'water', [T.DEEP]: 'water', [T.CAVE]: 'cave', [T.DESERT]: 'desert', [T.SAND]: 'desert' }[t] || 'tall';
  },

  // 走完一步之後
  async onStep() {
    const s = G.state;
    s.steps++;
    if (s.steps % 128 === 0) G.party.forEach(m => { if (m.hp > 0) m.happy = Math.min(255, m.happy + 1); });
    if (s.repel > 0) { s.repel--; if (s.repel === 0) await UI.say('除蟲噴霧的效果消失了。'); }
    const town = World.townAt(s.x, s.y);
    Game.updateMusic();
    if (town !== G.lastTown) {
      G.lastTown = town;
      if (town) {
        s.visited[town.id] = 1;
        UI.banner(`${REGIONS[town.region].n}地區・${town.name}`);
      } else {
        UI.banner(`${REGIONS[World.regionAt(s.x, s.y)].n}地區・野外（約 Lv.${World.levelAt(s.x, s.y)}）`);
      }
    }
    // 訓練家視線
    for (const tr of Game.nearbyTrainers(6)) {
      if (s.defeated[tr.x + ',' + tr.y]) continue;
      if (Game.inSight(tr)) {
        G.alert = tr;
        await U.sleep(500);
        G.alert = null;
        await Game.trainerBattle(tr);
        return;
      }
    }
    // 野生寶可夢
    const t = World.tile(s.x, s.y);
    let biome = null, rate = 0;
    if (t === T.TALL) { biome = 'tall'; rate = .1; }
    else if (t === T.SNOWTALL) { biome = 'snow'; rate = .1; }
    else if ((t === T.WATER || t === T.DEEP) && s.surf) { biome = 'water'; rate = .045; }
    else if (t === T.CAVE) { biome = 'cave'; rate = .07; }
    else if (t === T.DESERT) { biome = 'desert'; rate = .05; }
    if (biome && !s.repel && Math.random() < rate) {
      const wild = World.rollWild(s.x, s.y, biome);
      Sound.sfx('encounter');
      G.flash = 1;
      await U.sleep(450);
      G.flash = 0;
      await Game.battle({ wild, biome });
    }
  },

  nearbyTrainers(r) {
    const out = [];
    const { x, y } = G.state;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tr = World.trainers.get((x + dx) + ',' + (y + dy));
      if (tr) out.push(tr);
    }
    return out;
  },
  inSight(tr) {
    const { x, y } = G.state;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[tr.dir];
    for (let i = 1; i <= 4; i++) {
      const px = tr.x + d[0] * i, py = tr.y + d[1] * i;
      if (px === x && py === y) return true;
      if (BLOCKED.has(World.tile(px, py))) return false;
    }
    return false;
  },

  walkable(x, y) {
    if (!World.inside(x, y)) return false;
    const t = World.tile(x, y);
    if (BLOCKED.has(t) || t === T.DOOR) return false;
    if (World.trainers.has(x + ',' + y)) return false;
    if (t === T.WATER || t === T.DEEP) return G.state.surf || Game.canSurf();
    return true;
  },

  async interact() {
    const s = G.state;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[s.dir];
    const fx = s.x + d[0], fy = s.y + d[1];
    const b = World.doors.get(fx + ',' + fy);
    if (b) return Game.enterBuilding(b);
    const tr = World.trainers.get(fx + ',' + fy);
    if (tr) {
      if (s.defeated[tr.x + ',' + tr.y]) {
        tr.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[s.dir];
        return UI.say(`${TRAINER_CLASSES[tr.cls].n} ${tr.name}：「下次我一定會贏的！」`);
      }
      return Game.trainerBattle(tr);
    }
    const t = World.tile(fx, fy);
    if ((t === T.WATER || t === T.DEEP) && !Game.canSurf()) {
      return UI.say('水面一片蔚藍……如果隊伍中有水屬性寶可夢（或會衝浪的寶可夢），就能在水上移動。');
    }
  },

  // ---------- 主迴圈 ----------
  update(dt) {
    if (G.mode !== 'world') return;
    G.state.playMs += dt;
    if (G.busy || UI.active()) return;
    const s = G.state;
    if (G.move) {
      G.move.t += dt;
      if (G.move.t >= G.move.dur) {
        s.x = G.move.tx; s.y = G.move.ty;
        G.move = null;
        G.stepAnim = (G.stepAnim % 2) + 1;
        const t = World.tile(s.x, s.y);
        s.surf = t === T.WATER || t === T.DEEP;
        Game.flow(() => Game.onStep());
      }
      return;
    }
    const dirKey = [['ArrowUp', 'w', 'up'], ['ArrowDown', 's', 'down'], ['ArrowLeft', 'a', 'left'], ['ArrowRight', 'd', 'right']]
      .find(([a, b]) => G.keys.has(a) || G.keys.has(b) || G.keys.has(b.toUpperCase()));
    const dir = dirKey ? dirKey[2] : G.touchDir;
    if (!dir) return;
    s.dir = dir;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    const tx = s.x + d[0], ty = s.y + d[1];
    if (World.doors.has(tx + ',' + ty) && dir === 'up') { Game.flow(() => Game.enterBuilding(World.doors.get(tx + ',' + ty))); G.keys.clear(); return; }
    if (!Game.walkable(tx, ty)) return;
    const run = G.keys.has('Shift');
    G.move = { fx: s.x, fy: s.y, tx, ty, t: 0, dur: s.surf ? 120 : run ? 85 : 160 };
  },

  async flow(fn) {
    if (G.busy) return;
    G.busy = true;
    try { await fn(); } catch (e) { console.error(e); }
    finally { UI.hideDialog(); G.busy = false; }
  },

  render() {
    const cv = document.getElementById('world');
    const g = cv.getContext('2d');
    if (G.mode === 'title' || !G.state) return;
    const s = G.state;
    let px = s.x * TILE, py = s.y * TILE;
    if (G.move) {
      const k = G.move.t / G.move.dur;
      px = (G.move.fx + (G.move.tx - G.move.fx) * k) * TILE;
      py = (G.move.fy + (G.move.ty - G.move.fy) * k) * TILE;
    }
    const ox = Math.round(px - (VW * TILE) / 2 + TILE / 2), oy = Math.round(py - (VH * TILE) / 2 + TILE / 2);
    const x0 = Math.floor(ox / TILE), y0 = Math.floor(oy / TILE);
    const wf = Math.floor(G.frame / 30) % 4;
    for (let y = y0; y <= y0 + VH; y++) for (let x = x0; x <= x0 + VW; x++) {
      World.drawTile(g, World.tile(x, y), x, y, x * TILE - ox, y * TILE - oy, wf);
    }
    for (const b of World.buildings) {
      if (b.x + b.w < x0 - 1 || b.x > x0 + VW + 1 || b.y + b.h < y0 - 1 || b.y > y0 + VH + 1) continue;
      World.drawBuilding(g, b, ox, oy);
    }
    // 人物依 y 座標排序繪製（下方的人物蓋住上方）
    const people = [];
    for (let y = y0 - 1; y <= y0 + VH + 1; y++) for (let x = x0; x <= x0 + VW; x++) {
      const tr = World.trainers.get(x + ',' + y);
      if (tr) people.push({ y: y * TILE, tr });
    }
    people.push({ y: py, player: true });
    people.sort((a, b) => a.y - b.y);
    const walking = G.move ? (G.move.t / G.move.dur < .5 ? G.stepAnim : 0) : 0;
    const exclaim = (Gen3.on && Gen3.exclaim()) || Spr.exclaim();
    for (const p of people) {
      if (p.player) {
        const sheet = G.keys.has('Shift') && G.move ? 'player_run' : 'player_walk';
        World.drawPerson(g, px - ox, py - oy, s.dir, { pal: Spr.PLAYER, sheet }, walking, { surf: s.surf, tick: G.frame });
        continue;
      }
      const tr = p.tr;
      const names = Gen3.on ? GEN3.trainers : [];
      const sheet = names.length ? 'npc_' + names[tr.cls % names.length] : null;
      World.drawPerson(g, tr.x * TILE - ox, tr.y * TILE - oy, tr.dir, { pal: Spr.trainerPal(tr.cls, tr.seed % 5), sheet }, 0);
      if (G.alert === tr) g.drawImage(exclaim, tr.x * TILE - ox + (TILE - exclaim.width) / 2, tr.y * TILE - oy - TILE - exclaim.height + 8);
    }
    // 站在草叢裡時，草蓋住下半身
    const tt = World.tile(G.move ? G.move.tx : s.x, G.move ? G.move.ty : s.y);
    if ((tt === T.TALL || tt === T.SNOWTALL) && !G.move) {
      const gi = (Gen3.on && Gen3.single(tt === T.TALL ? 'tall' : 'snowtall')) || World.tileCache[tt][0];
      g.drawImage(gi, 0, gi.height * .5, gi.width, gi.height * .5, px - ox, py - oy + TILE * .5, TILE, TILE * .5);
    }
    if (U.isNight()) { g.fillStyle = 'rgba(20,30,90,.33)'; g.fillRect(0, 0, cv.width, cv.height); }
    if (G.flash) { g.fillStyle = (G.frame >> 2) % 2 ? '#000' : '#fff'; g.fillRect(0, 0, cv.width, cv.height); }
  },

  // ---------- 標題 / 新遊戲 ----------
  async title() {
    G.mode = 'title';
    const save = Game.loadSave();
    const scr = document.getElementById('title');
    scr.classList.remove('hidden');
    const opts = save ? ['繼續遊戲', '新遊戲'] : ['新遊戲'];
    while (true) {
      const c = await UI.choose(opts, { cancel: false, cls: 'title-menu' });
      if (opts[c] === '繼續遊戲') { scr.classList.add('hidden'); return Game.start(save); }
      if (save) {
        const ok = await UI.choose(['是', '否'], { prompt: '開始新遊戲會覆蓋原本的存檔，確定嗎？' });
        UI.hideDialog();
        if (ok !== 0) continue;
      }
      scr.classList.add('hidden');
      return Game.newGame();
    }
  },

  async newGame() {
    const bg = document.getElementById('title');
    await UI.say('歡迎來到寶可夢的世界！');
    await UI.say('這個世界上住著被稱為「寶可夢」的不可思議的生物。在這片廣大的世界裡，九個地區相連在一起，全部 1025 種寶可夢都生活在某個角落。');
    const name = await UI.input('首先，請告訴我你的名字。', '小智');
    const keys = Object.keys(REGIONS);
    const r = await UI.list({
      title: '要從哪個地區開始冒險？',
      rows: keys.map(k => `<div class="grow"><b>${REGIONS[k].n}地區</b>　<span class="dim">第 ${REGIONS[k].gen} 世代・從${REGIONS[k].home}出發・${REGIONS[k].prof}</span></div>
        ${REGIONS[k].starters.map(id => `<img class="icon" src="${Mon.sprite(id)}">`).join('')}`),
      cancel: false,
    });
    const region = keys[r];
    const reg = REGIONS[region];
    await UI.say(`${reg.prof}：「${name}，歡迎來到${reg.n}地區！我是${reg.prof}。」`);
    let starter;
    while (true) {
      const i = await UI.list({
        title: `${reg.prof}：「選一隻作為你的夥伴吧！」`,
        rows: reg.starters.map(id => `<img class="big-icon" src="${Mon.sprite(id)}"><div class="grow"><b>${POKEDEX[id].n}</b> ${POKEDEX[id].t.map(typeTag).join('')}<div class="dim small">${U.esc(POKEDEX[id].gen)}　${U.esc(POKEDEX[id].fl)}</div></div>`),
        cancel: false,
      });
      const ok = await UI.choose(['是', '否'], { prompt: `確定要選擇 ${POKEDEX[reg.starters[i]].n} 嗎？` });
      if (ok === 0) { starter = reg.starters[i]; break; }
    }
    UI.showText('正在生成世界……');
    await U.sleep(50);
    const st = Game.newState(name, region, starter);
    const m = Mon.create(starter, 5);
    m.happy = 120;
    st.party.push(m);
    st.seen[starter] = 1; st.caught[starter] = 1;
    Game.start(st, true);
    await UI.say(`${reg.prof}：「${POKEDEX[starter].n} 和你看起來很合得來呢！」`);
    await UI.say(`${reg.prof}：「這個世界很廣闊。往遠處走，寶可夢會越來越強。收集各地區的徽章、挑戰聯盟，並且完成這本圖鑑吧！」`);
    await UI.say('（操作：方向鍵／WASD 移動，Shift 跑步，Z／Enter 調查，X／Esc 選單，M 地圖）');
    UI.hideDialog();
    Game.save(true);
  },

  start(state, fresh = false) {
    G.state = state;
    G.state.flags = G.state.flags || {};
    // 舊存檔的寶可夢補上性別
    for (const m of [...state.party, ...state.box]) {
      if (!('gender' in m)) m.gender = Mon.genderOf(m.sp);
      if (!m.ability) m.ability = Abil.pick(m.sp);
      if (!('item' in m)) m.item = null;
    }
    UI.showText('正在生成世界……');
    World.generate(state.seed, state.region);
    World.renderMap();
    if (fresh) {
      const h = World.homeTown;
      const house = World.buildings.find(b => b.town === h && b.kind === 'house');
      state.x = house.door.x; state.y = house.door.y + 1;
      state.center = { x: house.door.x, y: house.door.y + 1 };
      state.visited[h.id] = 1;
    }
    G.lastTown = World.townAt(state.x, state.y);
    G.mode = 'world';
    UI.hideDialog();
    if (Gen3.on) document.body.classList.add('gen3');
    Game.updateMusic(true);
    UI.banner(`${REGIONS[World.regionAt(state.x, state.y)].n}地區・${G.lastTown ? G.lastTown.name : '野外'}`);
  },
};

// ---------- 啟動 ----------
function fit() {
  const w = document.getElementById('wrap');
  const s = Math.min(window.innerWidth / 720, window.innerHeight / 480);
  w.style.transform = `scale(${s})`;
  w.style.left = (window.innerWidth - 720 * s) / 2 + 'px';
  w.style.top = (window.innerHeight - 480 * s) / 2 + 'px';
}

window.addEventListener('load', () => {
  fit();
  window.addEventListener('resize', fit);
  if (!window.POKEDEX || !window.MOVES) {
    document.getElementById('title').innerHTML = '<div class="err">找不到 data/pokedex.js。請先執行：python tools/fetch_data.py</div>';
    return;
  }
  try { Object.assign(G.settings, JSON.parse(localStorage.getItem(SAVE_KEY + '_settings') || '{}')); } catch { }
  World.makeTiles();
  Assets.load();

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    Sound.init();
    if (UI.handleKey(e)) { G.keys.clear(); return; }
    G.keys.add(e.key);
    if (G.mode !== 'world' || G.busy || e.repeat) return;
    if (UI.isOk(e) && !G.move) Game.flow(() => Game.interact());
    else if ((e.key === 'x' || e.key === 'X' || e.key === 'Escape') && !G.move) Game.flow(() => Game.mainMenu());
    else if ((e.key === 'm' || e.key === 'M') && !G.move) Game.flow(() => Game.mapMenu());
  });
  window.addEventListener('keyup', e => { G.keys.delete(e.key); G.keys.delete(e.key.toLowerCase()); G.keys.delete(e.key.toUpperCase()); });
  window.addEventListener('blur', () => G.keys.clear());

  // 觸控方向鍵
  document.querySelectorAll('#touch [data-dir]').forEach(b => {
    const set = v => e => { e.preventDefault(); G.touchDir = v; };
    b.addEventListener('pointerdown', set(b.dataset.dir));
    b.addEventListener('pointerup', set(null));
    b.addEventListener('pointerleave', set(null));
  });
  document.querySelectorAll('#touch [data-key]').forEach(b => {
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: b.dataset.key }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: b.dataset.key }));
    });
  });

  let last = performance.now();
  const loop = now => {
    const dt = Math.min(100, now - last); last = now;
    G.frame++;
    Game.update(dt);
    Game.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  Game.title();
  // 每 2 分鐘自動存檔
  setInterval(() => { if (G.mode === 'world' && !G.busy) Game.save(true); }, 120000);
});
