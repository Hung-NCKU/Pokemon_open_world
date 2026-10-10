// 主程式：標題、移動、建築物、選單、存檔
const SAVE_KEY = 'pkmn_openworld_save_v1';
const VW = 15, VH = 10;

const G = {
  mode: 'title',
  fast: false, // 按住 Space 時為二倍速
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
      v: SAVE_VER, worldVer: WORLD_VER, seed, region, name, x: 0, y: 0, dir: 'down', surf: false,
      party: [], box: [],
      bag: { 'poke-ball': 5, 'potion': 3 },
      money: 3000, badges: {}, champs: {}, seen: {}, caught: {},
      defeated: {}, visited: {}, center: null, repel: 0, steps: 0, playMs: 0,
      flags: {}, starter,
    };
  },
  // 存檔：寫入前把上一份有效的存檔保留為備份
  save(silent = false) {
    try {
      const prev = localStorage.getItem(SAVE_KEY);
      if (prev && Game.parseSave(prev).ok) localStorage.setItem(SAVE_KEY + '_bak', prev);
      Telemetry.measure('存檔', () => localStorage.setItem(SAVE_KEY, Game.serialize(G.state)));
      Telemetry.event('存檔');
      if (!silent) UI.banner('已儲存遊戲進度');
      return true;
    } catch (e) { console.error(e); UI.banner('存檔失敗！'); return false; }
  },
  // 驗證存檔內容；必要欄位錯誤時回傳 { ok:false, error }，選填欄位缺少時補上預設值
  // 存檔版本遷移：MIGRATE[n] 把第 n 版的存檔升級成第 n+1 版（只補欄位，不刪除玩家資料）
  MIGRATE: {
    // 1 → 2：加上世界配置版本；沒有記錄的是舊世界（道館依離家由遠到近），保留原本的配置
    1: s => { if (!Number.isInteger(s.worldVer)) s.worldVer = 1; },
  },
  migrateState(s) {
    let v = Number.isInteger(s.v) && s.v >= 1 ? s.v : 1;
    if (v > SAVE_VER) return `存檔來自較新的版本（第 ${v} 版，目前支援到第 ${SAVE_VER} 版）`;
    for (; v < SAVE_VER; v++) Game.MIGRATE[v](s);
    s.v = SAVE_VER;
    return null;
  },
  validateState(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return '存檔不是有效的資料';
    const mErr = Game.migrateState(s);
    if (mErr) return mErr;
    if (!Number.isFinite(s.seed)) return '缺少世界種子';
    if (!REGIONS[s.region]) return '出發地區不正確';
    if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) return '位置資料不正確';
    if (s.x < 0 || s.y < 0 || s.x >= WW || s.y >= WH) return '位置超出世界範圍';
    if (!Array.isArray(s.party) || !s.party.length || s.party.length > 6) return '隊伍中沒有寶可夢';
    for (const m of [...s.party, ...(Array.isArray(s.box) ? s.box : [])]) {
      const err = Game.validateMon(m);
      if (err) return `寶可夢資料不正確（${err}）`;
    }
    const def = { name: '主角', dir: 'down', surf: false, box: [], bag: {}, money: 0, badges: {}, champs: {}, seen: {}, caught: {},
      defeated: {}, visited: {}, flags: {}, repel: 0, steps: 0, playMs: 0, center: null, starter: s.party[0].sp, mats: {} };
    for (const [k, v] of Object.entries(def)) {
      const bad = s[k] === undefined || (typeof v === 'object' && v !== null && (typeof s[k] !== 'object' || s[k] === null || Array.isArray(v) !== Array.isArray(s[k])));
      if (bad) s[k] = v;
    }
    if (!Number.isFinite(s.money) || s.money < 0) s.money = 0;
    // 世界配置版本：沒有記錄的是舊存檔（第 1 版），保留原本的世界
    if (!Number.isInteger(s.worldVer) || s.worldVer < 1 || s.worldVer > WORLD_VER) s.worldVer = 1;
    // 箱子名稱與桌布
    if (!Array.isArray(s.boxMeta)) s.boxMeta = [];
    s.boxMeta = s.boxMeta.map((x, i) => (x && typeof x.n === 'string' && typeof x.wp === 'string' ? { n: x.n.slice(0, 8), wp: x.wp } : { n: `箱子 ${i + 1}`, wp: 'forest' }));
    // 蛋籃與野餐
    if (!Array.isArray(s.eggs)) s.eggs = [];
    s.eggs = s.eggs.filter(e => e && e.mon && Number.isFinite(e.steps) && !Game.validateMon(e.mon)).slice(0, 6);
    s.picnic = null;
    if (s.meal && !(s.meal.type in TYPES && Number.isFinite(s.meal.until))) s.meal = null;
    // 巢狀資料：徽章是各地區 0–7 的不重複整數陣列；冠軍、旗標等是物件
    for (const k of Object.keys(s.badges)) {
      const b = s.badges[k];
      if (!REGIONS[k] || !Array.isArray(b)) { delete s.badges[k]; continue; }
      s.badges[k] = [...new Set(b.filter(v => Number.isInteger(v) && v >= 0 && v <= 7))];
    }
    for (const k of Object.keys(s.champs)) if (!REGIONS[k]) delete s.champs[k];
    for (const k of ['repel', 'steps', 'playMs']) if (!Number.isFinite(s[k]) || s[k] < 0) s[k] = 0;
    if (!['up', 'down', 'left', 'right'].includes(s.dir)) s.dir = 'down';
    for (const k of Object.keys(s.bag)) if (!Number.isInteger(s.bag[k]) || s.bag[k] <= 0) delete s.bag[k];
    // 舊存檔：已捕捉過的傳說／幻之寶可夢不再出現在地圖上
    if (!s.legendsCaught || typeof s.legendsCaught !== 'object' || Array.isArray(s.legendsCaught)) {
      s.legendsCaught = {};
      for (const id of Object.keys(s.caught)) if (POKEDEX[id] && POKEDEX[id].lg) s.legendsCaught[id] = 1;
    }
    return null;
  },
  // 驗證單隻寶可夢；無法修正的錯誤回傳原因，可修正的直接修正
  validateMon(m) {
    const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
    if (!m || typeof m !== 'object') return '不是寶可夢資料';
    if (!POKEDEX[m.sp]) return '物種不存在';
    if (!int(m.lv, 1, 100)) return '等級';
    if (!Array.isArray(m.iv) || m.iv.length !== 6 || !m.iv.every(v => int(v, 0, 31))) return '個體值';
    if (!int(m.nat, 0, 24)) return '性格';
    if (!Array.isArray(m.moves) || m.moves.length < 1 || m.moves.length > 4) return '招式數量';
    for (const x of m.moves) {
      if (!x || !MOVES[x.id]) return '招式不存在';
      if (!Number.isFinite(x.pp) || x.pp < 0) return '招式 PP';
      x.pp = Math.min(x.pp, MOVES[x.id].pp);
    }
    if (!Array.isArray(m.ev) || m.ev.length !== 6 || !m.ev.every(v => int(v, 0, 252))) m.ev = [0, 0, 0, 0, 0, 0];
    if (m.ev.reduce((a, b) => a + b, 0) > 510) m.ev = [0, 0, 0, 0, 0, 0];
    if (!Number.isFinite(m.exp) || m.exp < 0) m.exp = Mon.expFor(POKEDEX[m.sp].gr, m.lv);
    if (!int(m.happy, 0, 255)) m.happy = POKEDEX[m.sp].hap;
    // 培育欄位：薄荷（0–24 的性格）、極限特訓（6 項旗標）
    if (m.mint !== undefined && !int(m.mint, 0, 24)) delete m.mint;
    if (m._megaFrom !== undefined && typeof Mega !== 'undefined') Mega.revert(m);
    if (m._bfFrom !== undefined) { if (m._bfFrom) m.form = m._bfFrom; else delete m.form; delete m._bfFrom; }
    delete m._dmax; delete m._raid; delete m._heroReady;
    // 合體：夥伴的資料要正確，否則解除合體
    if (m.fused !== undefined && (typeof m.fused !== 'object' || Game.validateMon(m.fused))) { delete m.fused; delete m.form; }
    if (m.form !== undefined && (!Forms.get(m) || FORMS[m.form].mega || FORMS[m.form].battle || FORMS[m.form].gmax || FORMS[m.form].ultra || FORMS[m.form].primal)) delete m.form;
    if (m.form && FORMS[m.form] && FORMS[m.form].fusion && !m.fused) delete m.form;
    if (m.boxPos !== undefined && !(m.boxPos && int(m.boxPos.b, 0, 999) && int(m.boxPos.i, 0, 29))) delete m.boxPos;
    if (m.marks !== undefined && !(Array.isArray(m.marks) && m.marks.every(x => MARKS.includes(x)))) delete m.marks;
    if (m.ivHT !== undefined && !(Array.isArray(m.ivHT) && m.ivHT.length === 6)) delete m.ivHT;
    else if (m.ivHT) m.ivHT = m.ivHT.map(v => (v ? 1 : 0));
    const max = Mon.stats(m)[0];
    if (!Number.isFinite(max)) return '能力值無法計算';
    if (!Number.isFinite(m.hp)) m.hp = max;
    m.hp = U.clamp(Math.floor(m.hp), 0, max);
    if (m.st && !STATUS_ZH[m.st]) m.st = null;
    if (m.item && !ITEMS[m.item]) m.item = null;
    if (m.nick !== undefined && (typeof m.nick !== 'string' || !m.nick.trim() || m.nick.length > 12)) delete m.nick;
    if (!m.uid) m.uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    return null;
  },
  parseSave(text) {
    if (!text) return { ok: false, empty: true };
    let s;
    try { s = JSON.parse(text); } catch { return { ok: false, error: '存檔格式損毀（無法解析）' }; }
    const err = Game.validateState(s);
    return err ? { ok: false, error: err } : { ok: true, state: s };
  },
  // 讀取存檔：主存檔無效時改用備份，並回報原因
  loadSave() {
    let main = null, bak = null;
    try { main = localStorage.getItem(SAVE_KEY); bak = localStorage.getItem(SAVE_KEY + '_bak'); } catch { }
    const m = Game.parseSave(main);
    if (m.ok) return { state: m.state };
    const b = Game.parseSave(bak);
    if (m.empty && !b.ok) return null;
    return { state: b.ok ? b.state : null, fromBackup: b.ok, error: m.error || '找不到主存檔' };
  },
  // 匯出、匯入存檔（JSON 檔案）
  serialize(state) { return JSON.stringify(state); },
  exportSave() {
    const blob = new Blob([Game.serialize(G.state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pokemon-openworld-${G.state.name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  importSave() {
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return res({ ok: false, error: '沒有選擇檔案' });
        const r = new FileReader();
        r.onload = () => res(Game.parseSave(String(r.result)));
        r.onerror = () => res({ ok: false, error: '無法讀取檔案' });
        r.readAsText(f);
      };
      inp.click();
    });
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
    // 第一次捕捉：和原作一樣顯示圖鑑頁
    if (first) { await UI.say(`${Mon.name(m)} 的資料已登錄到寶可夢圖鑑！`); await Game.dexEntry(m.sp); }
    if (typeof Fusion !== 'undefined') await Fusion.onCaught();
    if (m.sp === 479 && !G.state.bag['rotom-catalog']) {
      Game.giveItem('rotom-catalog', 1);
      await UI.say('洛托姆身上掉下了一本型錄！\n獲得了洛托姆型錄！（可以在背包裡使用，改變洛托姆的形態）');
    }
    // 捕捉後可以查看能力或取名
    while (true) {
      const c = await UI.choose(['查看能力', '取名', '繼續'], { prompt: `捕捉到了 ${Mon.name(m)}！要做什麼？`, cancel: false });
      if (c === 0) await Game.summary(m);
      else if (c === 1) { const n = await UI.input(`要幫 ${POKEDEX[m.sp].n} 取什麼名字？（留空用原名）`, ''); m.nick = n && n !== POKEDEX[m.sp].n ? n : undefined; }
      else break;
    }
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
    const nf = Forms.evolvedForm(m, to, World.regionAt(G.state.x, G.state.y));
    m.sp = to;
    if (nf) m.form = nf; else delete m.form;
    Abil.afterEvolve(m, fromSp, to);
    const after = Mon.stats(m);
    m.hp = Math.max(m.hp > 0 ? 1 : 0, m.hp + after[0] - before[0]);
    Game.markCaught(to);
    Sound.jingle('evolve');
    await UI.say(`恭喜！${from} 進化成了 ${Forms.data(m).n}！`);
    box.remove();
    if (G.mode === 'world') Game.updateMusic(true);
    for (const [lv, mid] of Forms.data(m).l) if (lv === m.lv) await Game.learnMove(m, mid);
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
    // 使用回復道具的音效（原作的 SE_USE_ITEM），血條回復時再播回復音
    if (['heal', 'cure', 'revive', 'pp', 'full'].includes(it.kind)) Sound.sfx('use_item');
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
    } else if (it.kind === 'vitamin') {
      // 營養飲料：努力值 +10（第八世代起可提升到單項上限 252）
      const k = VITAMIN[id];
      m.ev = m.ev || [0, 0, 0, 0, 0, 0];
      const add = Math.min(10, 252 - m.ev[k], 510 - m.ev.reduce((a, b) => a + b, 0));
      const before = Mon.maxHp(m);
      m.ev[k] += add;
      if (k === 0 && m.hp > 0) m.hp += Mon.maxHp(m) - before;
      await UI.say(`${name} 的${STAT_ZH[k]}努力值提高了！（${m.ev[k]}／252）`);
    } else if (it.kind === 'expcandy') {
      await UI.say(`${name} 獲得了 ${EXP_CANDY[id]} 點經驗值！`);
      await Game.giveExp(m, EXP_CANDY[id]);
      const c = Mon.evoCandidates(m);
      if (m._lvUp && c.length && m.item !== 'everstone') { delete m._lvUp; await Game.evolve(m, Mon.pickEvo(m, c)); }
      delete m._lvUp;
    } else if (it.kind === 'mint') {
      m.mint = NATURE_INDEX[id.replace('-mint', '')];
      const hp = Mon.maxHp(m);
      m.hp = Math.min(m.hp, hp);
      await UI.say(`${name} 聞了${it.n}，能力的成長方式變成了「${NATURES[m.mint]}」！`);
    } else if (it.kind === 'abilcap') {
      const normal = Forms.data(m).ab.filter(a => !a[1]).map(a => a[0]);
      m.ability = normal.find(a => a !== m.ability) || m.ability;
      await UI.say(`${name} 的特性變成了${Abil.name(m.ability)}！`);
    } else if (it.kind === 'abilpatch') {
      m.ability = Forms.data(m).ab.find(a => a[1])[0];
      await UI.say(`${name} 的特性變成了${Abil.name(m.ability)}！`);
    } else if (it.kind === 'bottlecap') {
      // 極限特訓（第九世代需 Lv.50 以上）：銀色王冠選一項個體值變為最高，金色王冠全部
      // HP 上限增加的部分補到目前 HP（瀕死的不會因此復活）
      const before = Mon.maxHp(m);
      if (id === 'gold-bottle-cap') { m.ivHT = [1, 1, 1, 1, 1, 1]; await UI.say(`${name} 的所有能力都經過了極限特訓！`); }
      else {
        const c = await UI.choose(STAT_ZH.map((s, i) => ({ label: `${s}（個體值 ${m.iv[i]}）`, disabled: (m.ivHT || [])[i] || m.iv[i] === 31 })), { prompt: '要特訓哪一項能力？', cancel: false });
        m.ivHT = m.ivHT || [0, 0, 0, 0, 0, 0];
        m.ivHT[c] = 1;
        await UI.say(`${name} 的${STAT_ZH[c]}經過了極限特訓！`);
      }
      if (m.hp > 0) m.hp += Mon.maxHp(m) - before;
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
      case 'vitamin': { const ev = m.ev || [0, 0, 0, 0, 0, 0]; return !inBattle && ev[VITAMIN[id]] < 252 && ev.reduce((a, b) => a + b, 0) < 510; }
      case 'expcandy': return !inBattle && m.lv < 100;
      case 'mint': return !inBattle && (m.mint ?? m.nat) !== NATURE_INDEX[id.replace('-mint', '')];
      case 'abilcap': return !inBattle && Forms.data(m).ab.filter(a => !a[1]).length > 1;
      case 'abilpatch': return !inBattle && Forms.data(m).ab.some(a => a[1]) && !Forms.data(m).ab.some(a => a[1] && a[0] === m.ability);
      case 'bottlecap': return !inBattle && m.lv >= 50 && m.iv.some((v, i) => v < 31 && !(m.ivHT || [])[i]);
      default: return false;
    }
  },

  // ---------- 選單 ----------
  partyRow(m, i, extra = '') {
    const max = Mon.maxHp(m);
    return `<img class="icon" src="${Mon.spriteOf(m, { shiny: m.shiny })}" loading="lazy">
      <div class="grow"><div><b>${U.esc(Mon.name(m))}</b>${m.shiny ? ' ✨' : ''} <span class="lv">Lv.${m.lv}</span> ${UI.statusTag(m.st)} ${m.hp <= 0 ? '<span class="st" style="background:#555">瀕死</span>' : ''}</div>
      <div class="hprow">${UI.hpBar(m.hp, max, 160)} <span>${Math.max(0, m.hp)}/${max}</span></div></div>
      <div class="types">${Mon.types(m).map(typeTag).join('')}</div>${extra}`;
  },

  async partyMenu({ battle = null, forced = false, pick = null } = {}) {
    let start = battle ? battle.myIdx : 0;
    while (true) {
      const rows = G.party.map((m, i) => ({ html: Game.partyRow(m, i, battle && i === battle.myIdx ? '<span class="tag">戰鬥中</span>' : ''), disabled: pick ? !pick(m) : false }));
      const title = pick ? '要對哪一隻寶可夢使用？' : battle ? (forced ? '要派出哪一隻寶可夢？' : '寶可夢') : '寶可夢';
      const i = Game.emeraldUI('party')
        ? await PartyUI.pick({ msg: pick ? '要對哪一隻使用？' : battle ? (forced ? '要派出哪一隻寶可夢？' : '要替換哪一隻？') : '請選擇一隻寶可夢。', can: pick, start, cancel: !forced, active: battle ? battle.myIdx : -1 })
        : await UI.list({ title, rows, start, cancel: !forced });
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
      const c = await UI.choose(['查看能力', '持有道具', '想起招式', '換到首位', '取名', '取消'], { prompt: `要對 ${Mon.name(m)} 做什麼？` });
      if (c === 0) await Game.summary(m);
      else if (c === 1) await Game.heldMenu(m);
      else if (c === 2) await Game.moveReminder(m);
      else if (c === 3 && i > 0) { G.party.splice(i, 1); G.party.unshift(m); start = 0; }
      else if (c === 4) { const n = await UI.input('要幫牠取什麼名字？（留空恢復原名）', ''); m.nick = n && n !== POKEDEX[m.sp].n ? n : undefined; }
      UI.hideDialog();
    }
  },

  // 想起招式（第九世代可以隨時想起曾經能學會的升級招式）
  async moveReminder(m) {
    const known = new Set(m.moves.map(x => x.id));
    const ids = [...new Set(Forms.data(m).l.filter(([lv, mid]) => lv <= m.lv && MOVES[mid] && !known.has(mid)).map(([, mid]) => mid))];
    if (!ids.length) { await UI.say(`${Mon.name(m)} 沒有可以想起的招式。`); return; }
    const rows = ids.map(mid => {
      const d = MOVES[mid];
      return `${typeTag(d.t)}<div class="grow"><b>${U.esc(d.n)}</b>${SUPPORT_ZH[md(mid).support]}<div class="dim small">${d.c === 'ph' ? '物理' : d.c === 'sp' ? '特殊' : '變化'}｜威力 ${d.p || '—'}｜命中 ${d.a || '—'}｜PP ${d.pp}　${U.esc(d.d || '')}</div></div>`;
    });
    const i = await UI.list({ title: `${Mon.name(m)} 要想起哪個招式？`, rows });
    if (i >= 0) await Game.learnMove(m, ids[i]);
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

  // list：可用 ↑↓ 切換的寶可夢（隊伍）
  async summary(m, list = null) {
    if (Game.emeraldUI('summary')) {
      const l = list || (G.party.includes(m) ? G.party : [m]);
      return SummaryUI.show(l, Math.max(0, l.indexOf(m)));
    }
    const s = POKEDEX[m.sp];
    const st = Mon.stats(m);
    const nat = m.mint ?? m.nat, up = NAT_STAT[Math.floor(nat / 5)], down = NAT_STAT[nat % 5];
    const next = m.lv >= 100 ? 0 : Mon.expFor(s.gr, m.lv + 1) - m.exp;
    const statRows = st.map((v, i) => `<tr><td class="${i === up && up !== down ? 'nup' : i === down && up !== down ? 'ndown' : ''}">${STAT_ZH[i]}</td><td>${i === 0 ? `${Math.max(0, m.hp)}/${v}` : v}</td>
      <td><div class="sbar"><div style="width:${Math.min(100, s.s[i] / 1.6)}%"></div></div></td><td class="dim">種族 ${s.s[i]}／個體 ${m.ivHT?.[i] ? "★31" : m.iv[i]}／努力 ${m.ev?.[i] || 0}</td></tr>`).join('');
    const moves = m.moves.map(x => {
      const d = MOVES[x.id];
      return `<div class="mv">${typeTag(d.t)} <b>${U.esc(d.n)}</b> <span class="dim">${d.c === 'ph' ? '物理' : d.c === 'sp' ? '特殊' : '變化'}｜威力 ${d.p || '—'}｜命中 ${d.a || '—'}｜PP ${x.pp}/${d.pp}</span><b class="small">${SUPPORT_ZH[md(x.id).support]}</b><div class="dim small">${U.esc(d.d || '')}</div></div>`;
    }).join('');
    await UI.panel(`<div class="summary">
      <div class="left"><img class="big" src="${Mon.sprite(m.sp, { shiny: m.shiny })}">
        <div class="nm">No.${U.pad3(s.id)} ${U.esc(Mon.name(m))}${m.shiny ? ' ✨' : ''}</div>
        <div>${s.t.map(typeTag).join('')}</div>
        <div class="dim">Lv.${m.lv} ${Mon.genderMark(m)}　性格：${NATURES[m.nat]}${m.mint !== undefined && m.mint !== m.nat ? `（薄荷：${NATURES[m.mint]}）` : ""}</div>
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
      let id;
      if (Gen3.on && typeof BagUI !== 'undefined') {
        // 綠寶石版背包畫面
        id = await BagUI.pick();
        if (!id) return null;
      } else {
        const ids = Object.keys(G.state.bag).filter(x => ITEMS[x] && G.state.bag[x] > 0);
        const rows = ids.map(x => `<div class="grow"><b>${U.esc(ITEMS[x].n)}</b><div class="dim small">${U.esc(ITEMS[x].d)}</div></div><div>× ${G.state.bag[x]}</div>`);
        const i = await UI.list({ title: '背包', rows, start, extra: `💰 ${G.state.money} 元` });
        if (i < 0) return null;
        start = i;
        id = ids[i];
      }
      const it = ITEMS[id];
      if (it.kind === 'key') { await UI.say(`${it.n}：${it.d}`); UI.hideDialog(); continue; }
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
      if (it.kind === 'shard') {
        if (battle) { await UI.say('現在不能使用這個道具。'); continue; }
        if ((G.state.bag[id] || 0) < 10) { await UI.say(`需要 10 個${it.n}才能改變太晶屬性。`); continue; }
        const t = await Game.partyMenu({ pick: m => Mon.teraType(m) !== it.tera });
        if (t >= 0) { Game.takeItem(id, 10); G.party[t].tera = it.tera; await UI.say(`${Mon.name(G.party[t])} 的太晶屬性變成了${TYPES[it.tera].n}屬性！`); }
        UI.hideDialog();
        continue;
      }
      if (typeof FUSION !== 'undefined' && FUSION.some(f => f.item === id)) {
        if (battle) { await UI.say('現在不能使用這個道具。'); continue; }
        await Fusion.use(id);
        UI.hideDialog();
        continue;
      }
      if (id === 'rotom-catalog') {
        if (battle) { await UI.say('現在不能使用這個道具。'); continue; }
        const t = await Game.partyMenu({ pick: m => m.sp === 479 });
        if (t >= 0) await Forms.rotom(G.party[t]);
        UI.hideDialog();
        continue;
      }
      if (it.kind === 'tm') {
        if (battle) { await UI.say('現在不能使用這個道具。'); continue; }
        await TM.use(id);
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

  dexQuery: Search.empty(),
  boxQuery: Search.empty(),
  boxSort: 0,
  // 綠寶石版介面是否可用（素材由 tools/build_ui.py 產生）
  emeraldUI(k) { return Gen3.on && GEN3.ui && GEN3.ui[k]; },

  async dexMenu() {
    if (Game.emeraldUI('dex')) {
      while (true) {
        const id = await DexUI.list(Game.dexQuery);
        if (id == null) return;
        if (id.filter) { Game.dexQuery = await Search.menu(Game.dexQuery); UI.hideDialog(); continue; }
        await DexUI.entry(id);
      }
    }
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
      const id = ids[i];
      if (!G.state.seen[id]) continue;
      await Game.dexEntry(id);
    }
  },
  // 圖鑑頁（捕捉新寶可夢後也會顯示）
  async dexEntry(id) {
    if (Game.emeraldUI('dex')) return DexUI.entry(id);
    const s = POKEDEX[id];
    // 進化條件：列出所有條件組，改編的條件會註明原作的方式
    const evo = (s.ev || []).map(e => `→ ${G.state.seen[e.to] ? POKEDEX[e.to].n : '？？？'}：${(e.c || [e]).map(c => Mon.evoText(c)).join(' 或 ')}`).join('<br>');
    const ey = (s.ey || []).map((v, k) => v ? `${STAT_ZH[k]}+${v}` : '').filter(Boolean).join(' ');
    await UI.panel(`<div class="summary"><div class="left"><img class="big" src="${Mon.sprite(id)}"><div class="nm">No.${U.pad3(id)} ${U.esc(s.n)}</div>
      <div class="dim">${U.esc(s.gen)}</div><div>${s.t.map(typeTag).join('')}</div>${s.lg ? `<div class="legend">${s.lg === 1 ? '傳說的寶可夢' : '幻之寶可夢'}</div>` : ''}
      <div class="dim small">特性：${(s.ab || []).map(([a, h]) => U.esc(Abil.name(a)) + (h ? '（隱藏）' : '')).join('／')}</div></div>
      <div class="right"><p>${G.state.caught[id] ? U.esc(s.fl) : '捕捉後可以查看更多資料。'}</p>
      <table class="stats">${s.s.map((v, k) => `<tr><td>${STAT_ZH[k]}</td><td>${v}</td><td><div class="sbar"><div style="width:${Math.min(100, v / 1.6)}%"></div></div></td></tr>`).join('')}<tr><td>總和</td><td>${Mon.bst(id)}</td></tr></table>
      <p class="dim">捕捉率 ${s.cr}　打倒後的努力值：${ey || '無'}${evo ? '<br>' + evo : ''}</p></div></div>`);
  },

  async shopMenu() {
    let start = 0;
    // 綠寶石的購買畫面（有素材時）
    if (Gen3.on && typeof ShopUI !== 'undefined') {
      while (true) {
        const c = await UI.choose(['購買', '離開'], { prompt: '歡迎光臨！\n請問需要什麼呢？' });
        if (c !== 0) break;
        UI.hideDialog();
        await ShopUI.open(SHOP_LIST);
      }
      await UI.say('歡迎再次光臨！');
      return;
    }
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
    // 綠寶石版寄放系統：箱子畫面
    if (Game.emeraldUI('storage')) { await StorageUI.open(); return; }
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
        if (!G.state.box.length) { await UI.say('箱子裡沒有寶可夢。'); continue; }
        await Game.boxMenu();
      } else return;
    }
  },

  // 箱子：搜尋（名稱／屬性／地區／標記）、排序、領取、查看能力、標記
  async boxMenu() {
    const SORTS = [['編號', (a, b) => a.sp - b.sp], ['等級', (a, b) => b.lv - a.lv], ['名稱', (a, b) => Mon.name(a).localeCompare(Mon.name(b), 'zh-Hant')], ['寄放順序', () => 0]];
    let start = 0;
    while (true) {
      const q = Game.boxQuery;
      const list = G.state.box.map((m, k) => [m, k]).filter(([m]) => Search.matchMon(m, q));
      list.sort((a, b) => SORTS[Game.boxSort][1](a[0], b[0]) || a[1] - b[1]);
      const rows = [`<div class="grow"><b>🔍 搜尋／排序</b>　<span class="dim">${Search.active(q) ? U.esc(Search.label(q)) : '全部'}・依${SORTS[Game.boxSort][0]}</span></div>`,
        ...list.map(([m]) => Game.partyRow(m, 0, (m.marks || []).length ? `<span class="marks">${m.marks.join('')}</span>` : ''))];
      const i = await UI.list({ title: `箱子（${list.length}／${G.state.box.length} 隻）`, rows, start });
      if (i < 0) return;
      start = i;
      if (i === 0) {
        const c = await UI.choose(['搜尋條件', `排序：${SORTS[Game.boxSort][0]}`, '取消'], { prompt: '要怎麼整理箱子？' });
        if (c === 0) Game.boxQuery = await Search.menu(q, { box: true });
        if (c === 1) { const k = await UI.choose(SORTS.map(s => '依' + s[0]), { prompt: '排序方式' }); if (k >= 0) Game.boxSort = k; }
        UI.hideDialog();
        continue;
      }
      const [m, k] = list[i - 1];
      const c = await UI.choose(['領取', '查看能力', '標記', '取消'], { prompt: `要對 ${Mon.name(m)} 做什麼？` });
      if (c === 0) {
        if (G.party.length >= 6) { await UI.say('隊伍已經滿了！'); continue; }
        G.state.box.splice(k, 1);
        G.party.push(m);
        await UI.say(`領取了 ${Mon.name(m)}。`);
      } else if (c === 1) await Game.summary(m, list.map(x => x[0]));
      else if (c === 2) {
        while (true) {
          const cur = m.marks || [];
          const j = await UI.choose([...MARKS.map(x => (cur.includes(x) ? '✓' : '　') + x), '完成'], { prompt: '要加上哪些標記？（再選一次取消）', cols: 4 });
          if (j < 0 || j === MARKS.length) break;
          const x = MARKS[j];
          m.marks = cur.includes(x) ? cur.filter(y => y !== x) : [...cur, x];
        }
      }
      UI.hideDialog();
    }
  },

  async mapMenu() {
    if (Game.emeraldUI('map')) {
      const r = await MapUI.show({ canFly: Game.canFly() });
      let dest = r && r !== 'list' ? r : null;
      if (r === 'list') {
        const list = World.towns.filter(t => G.state.visited[t.id]);
        const i = await UI.list({ title: '要飛到哪裡？', rows: list.map(t => `<div class="grow"><b>${U.esc(t.name)}</b></div><span class="dim">${REGIONS[t.region].n}地區</span>`) });
        if (i >= 0) dest = list[i];
      }
      if (dest) {
        const flyer = G.party.find(m => m.hp > 0 && (Mon.types(m).includes('flying') || m.moves.some(x => x.id === 19)));
        await UI.say(`${Mon.name(flyer)} 使用了飛翔！`);
        Game.warp(dest.x + 4, dest.y + 6, 'down');
      }
      return;
    }
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
      // 地區名稱與等級帶
      const [lo, hi] = World.regionBand(k);
      for (const [txt, dy, size] of [[REGIONS[k].n, -18, 20], [`Lv.${lo}–${hi}`, 0, 16]]) {
        g.font = `bold ${size}px "Cubic11", "Microsoft JhengHei"`;
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(txt, x + 1, y - r + dy + 1);
        g.fillStyle = dy ? '#fff' : '#ffe080'; g.fillText(txt, x, y - r + dy);
      }
    }
    // 地標（去過的顯示名稱）
    g.font = 'bold 14px "Cubic11", "Microsoft JhengHei"';
    for (const lm of (World.landmarks || new Map()).values()) {
      const seen = G.state.flags['lm_' + lm.id] || G.state.flags['seen_' + lm.id];
      g.fillStyle = seen ? '#ffd040' : '#c08040';
      g.beginPath(); g.moveTo(lm.x, lm.y - 7); g.lineTo(lm.x + 6, lm.y + 4); g.lineTo(lm.x - 6, lm.y + 4); g.fill();
      if (seen) { g.fillStyle = '#000'; g.fillText(lm.n, lm.x + 1, lm.y + 19); g.fillStyle = '#fff'; g.fillText(lm.n, lm.x, lm.y + 18); }
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
    const items = ['寶可夢', '圖鑑', '背包', '野餐', '任務', '地圖', '訓練家卡片', '存檔', '設定', '返回標題', '關閉'];
    while (true) {
      const c = items[await UI.choose(items, { cls: 'side-menu' })];
      if (!c || c === '關閉') return;
      if (c === '寶可夢') await Game.partyMenu();
      if (c === '圖鑑') await Game.dexMenu();
      if (c === '背包') await Game.bagMenu();
      if (c === '野餐') { await Picnic.open(); return; }
      if (c === '任務') await UI.panel(`<div class="quest-panel"><h3>任務與進度</h3>${Story.questSummary(G.state).split('\n').map(l => `<p>${U.esc(l)}</p>`).join('')}</div>`);
      if (c === '地圖') { await Game.mapMenu(); return; }
      if (c === '訓練家卡片') await Game.trainerCard();
      if (c === '存檔') {
        const ok = await UI.choose(['儲存', '匯出存檔檔案', '取消'], { prompt: '要儲存目前的進度嗎？（儲存時會自動保留上一份備份）' });
        if (ok === 0 && Game.save(true)) Sound.sfx('save'), await UI.say(`${G.state.name} 將進度儲存好了！`);
        if (ok === 1) { Game.save(true); Game.exportSave(); await UI.say('已下載存檔檔案。可以在標題畫面選擇「匯入存檔」讀回。'); }
      }
      if (c === '設定') await Game.settingsMenu();
      if (c === '返回標題') {
        const ok = await UI.choose(['儲存後返回', '不儲存直接返回', '取消'], { prompt: '要返回標題畫面嗎？' });
        if (ok === 0 || ok === 1) {
          if (ok === 0) Game.save(true);
          UI.hideDialog();
          Game.toTitle();
          return;
        }
      }
      UI.hideDialog();
    }
  },

  async trainerCard() {
    if (Game.emeraldUI('card')) return CardUI.show();
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

  // 設定：音樂與音效音量（0～10，左右鍵調整）、文字速度、戰鬥訊息
  async settingsMenu() {
    const st = G.settings;
    if (st.musicVol === undefined) st.musicVol = st.music === false ? 0 : 7;
    if (st.sfxVol === undefined) st.sfxVol = st.sfx === false ? 0 : 7;
    const bar = v => '■'.repeat(v) + '□'.repeat(10 - v);
    const speedName = { 40: '慢', 22: '普通', 0: '快' };
    let idx = 0;
    while (true) {
      const opts = [`音樂　${bar(st.musicVol)} ${st.musicVol}`, `音效　${bar(st.sfxVol)} ${st.sfxVol}`,
        `文字速度：${speedName[st.textSpeed] || '普通'}`, `戰鬥訊息：${st.battleAuto ? '自動前進' : '手動按鍵'}`, `遊玩紀錄（錯誤 ${Telemetry.errors.length}）`, '完成'];
      const adjust = d => {
        if (idx === 0) st.musicVol = U.clamp(st.musicVol + d, 0, 10);
        if (idx === 1) { st.sfxVol = U.clamp(st.sfxVol + d, 0, 10); Sound.sfx('select'); }
        Sound.applyVolume();
      };
      // 選單開著時用左右鍵直接調整音量
      const onKey = (e, i, els) => {
        idx = i;
        if (!['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key) || i > 1) return false;
        adjust(e.key === 'ArrowRight' || e.key === 'd' ? 1 : -1);
        els[i].textContent = i === 0 ? `音樂　${bar(st.musicVol)} ${st.musicVol}` : `音效　${bar(st.sfxVol)} ${st.sfxVol}`;
        return true;
      };
      const c = await UI.choose(opts, { prompt: '設定（音量用 ←→ 調整）', start: idx, onKey });
      if (c < 0 || c === 5) break;
      if (c === 4) { await Game.logMenu(); idx = c; continue; }
      idx = c;
      if (c === 0) { st.musicVol = st.musicVol >= 10 ? 0 : st.musicVol + 1; Sound.applyVolume(); }
      if (c === 1) { st.sfxVol = st.sfxVol >= 10 ? 0 : st.sfxVol + 1; Sound.applyVolume(); Sound.sfx('select'); }
      if (c === 2) st.textSpeed = st.textSpeed === 40 ? 22 : st.textSpeed === 22 ? 0 : 40;
      if (c === 3) st.battleAuto = st.battleAuto ? 0 : 900;
    }
    try { localStorage.setItem(SAVE_KEY + '_settings', JSON.stringify(st)); } catch { }
    UI.hideDialog();
  },

  // 遊玩紀錄：畫面更新率、耗時、最近的錯誤；可以下載成檔案回報問題
  async logMenu() {
    while (true) {
      const r = Telemetry.report();
      const tm = Object.entries(r.timings).map(([k, v]) => `${k}：最近 ${v.last}ms、平均 ${v.avg}ms、最大 ${v.max}ms（${v.n} 次）`);
      const er = r.errors.slice(-8).reverse().map(e => `${new Date(e.t).toLocaleString()}［${e.mode || '-'}］${e.msg}${e.n > 1 ? `（×${e.n}）` : ''}${e.where ? ' @' + e.where : ''}`);
      await UI.panel(`<div class="quest-panel log-panel"><h3>遊玩紀錄</h3>
        <p>畫面更新率：${r.fps.avg ? `目前 ${r.fps.now}、平均 ${r.fps.avg}、最低 ${r.fps.min} FPS` : '測量中'}；卡頓（超過 50ms 的畫格）${r.fps.longFrames} 次，最長 ${r.fps.worstMs}ms</p>
        ${tm.map(l => `<p>${U.esc(l)}</p>`).join('') || '<p>還沒有耗時紀錄</p>'}
        <h3>最近的錯誤（共 ${r.errors.length} 筆）</h3>${er.map(l => `<p class="err">${U.esc(l)}</p>`).join('') || '<p>沒有錯誤</p>'}
        <p><small>F3：在畫面左上角顯示 FPS 與錯誤數</small></p></div>`);
      const c = await UI.choose(['下載紀錄檔', '清除錯誤紀錄', '返回'], { prompt: '遊玩紀錄' });
      if (c === 0) Telemetry.download();
      else if (c === 1) Telemetry.clearErrors();
      else break;
    }
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
    Telemetry.event('傳送', { x, y });
    if (G.room) Interior.leave();
    G.state.x = x; G.state.y = y; G.state.dir = dir || G.state.dir; G.state.surf = false;
    G.move = null;
  },

  healParty() { G.party.forEach(Mon.heal); G.state.teraCharged = true; },

  async enterBuilding(b) {
    const t = b.town;
    // 有室內地圖的建築：走進去，和裡面的人說話
    if (typeof Interior !== 'undefined' && Interior.can(b)) return Interior.enter(b);
    if (b.kind === 'center') {
      await UI.say('歡迎來到寶可夢中心。');
      const c0 = await UI.choose(['治療寶可夢', '使用電腦', '招式機器', '離開'], { prompt: '這裡可以讓你的寶可夢恢復健康。' });
      if (c0 === 2) {
        const k = await UI.choose(['製作招式學習器', '查看素材', '取消'], { prompt: '這是招式機器。可以用寶可夢的素材製作招式學習器。' });
        if (k === 0) await TM.machine();
        if (k === 1) await TM.materials();
        return;
      }
      const c = c0 === 3 ? 2 : c0;
      if (c === 0) await Game.centerHeal(b, true);
      else if (c === 1) await Game.pcMenu();
    } else if (b.kind === 'mart') {
      await Game.shopMenu();
    } else if (b.kind === 'house_s') {
      await TownEvents.house(b);
    } else if (b.kind === 'house') {
      if (t.region === G.state.region) await Game.momTalk();
      else await UI.say('這裡沒有人在家。');
    } else if (b.kind === 'lab') {
      await Game.labTalk(t);
    } else if (b.kind === 'gym') {
      await Game.gymChallenge(t);
    } else if (b.kind === 'league') {
      await Game.leagueChallenge(t);
    }
  },

  // 寶可夢中心的護士：治療並記錄為輸掉對戰時回來的地點
  async centerHeal(b, asked = false) {
    if (!asked) {
      await UI.say('歡迎來到寶可夢中心。\n這裡可以讓你的寶可夢恢復健康。');
      const c = await UI.choose(['治療', '不用了'], { prompt: '要治療你的寶可夢嗎？' });
      if (c !== 0) { await UI.say('期待你再次光臨！'); return; }
    }
    await UI.say('那麼，請把你的寶可夢交給我一會兒。');
    Game.healParty();
    G.state.center = { x: b.door.x, y: b.door.y + 1 };
    await Sound.jingle('heal');
    await UI.say('讓你久等了！你的寶可夢都已經恢復健康了。');
    Game.save(true);
    await UI.say('期待你再次光臨！');
  },
  async momTalk() {
    Game.healParty();
    await UI.say('媽媽：「歡迎回家！好好休息一下吧。」\n（寶可夢都恢復了精神！）');
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
    // 關都：大木博士的任務線；其他地區：當地博士的任務
    if (t.region === 'kanto') await Story.oak();
    else await Story.prof(t.region);
  },

  async gymChallenge(t) {
    const [name, type] = LEADERS[t.region][t.gym];
    const got = (G.state.badges[t.region] || []).includes(t.gym);
    const title = REGIONS[t.region].gen === 7 ? '' : '道館館主';
    const rematch = got && G.state.champs[t.region];
    if (got && !rematch) { await UI.say(`${name}：「你的實力我已經見識過了。成為${REGIONS[t.region].n}冠軍之後，再來找我重賽吧！」`); return; }
    if (rematch) await UI.say(`${name}：「新冠軍！我也變強了，再來比一場吧！」`);
    else await UI.say(`這裡是${t.name}道館，館主是擅長${TYPES[type].n}屬性的${name}！\n（館主的隊伍會配合你的徽章數調整，目前 ${Game.badgeCount()} 枚）`);
    const c = await UI.choose([rematch ? '重賽' : '挑戰', '離開'], { prompt: `要挑戰${title}${name}嗎？（對手約 Lv.${World.gymLevel(t)}）` });
    if (c !== 0) return;
    if (!rematch) await UI.say(`${name}：「歡迎你，挑戰者！就讓我用${TYPES[type].n}屬性寶可夢來試試你的實力吧！」`);
    const party = World.gymParty(t);
    // 後期（徽章 8 枚以上）：館主展開屬性對應的場地，並可使用 3 個回復道具
    const late = Game.badgeCount() >= 8;
    const FIELD = { water: 'raindance', fire: 'sunnyday', rock: 'sandstorm', ground: 'sandstorm', ice: 'snowscape', electric: 'electricterrain',
      grass: 'grassyterrain', psychic: 'psychicterrain', fairy: 'mistyterrain' };
    const r = await Game.battle({ trainer: { title, name, party, kind: 'gym', money: rematch ? 150 : 100, sprite: LEADER_SPRITES[t.region][t.gym],
      field: late ? FIELD[type] : null, items: late ? 3 : 2, dmax: t.region === 'galar', lose: rematch ? '果然名不虛傳！' : '……我輸了。這枚徽章是你的了！' }, biome: 'gym' });
    if (r === 'win' && rematch) { Game.save(true); return; }
    if (r === 'win') {
      (G.state.badges[t.region] = G.state.badges[t.region] || []).push(t.gym);
      Sound.jingle('badge');
      await UI.say(`獲得了${t.name}道館的徽章！（${REGIONS[t.region].n}徽章 ${Game.badgeCount(t.region)}／8）`);
      if (!G.state.bag['tera-orb']) {
        Game.giveItem('tera-orb', 1); G.state.teraCharged = true;
        await UI.say(`${name}：「你也該有這個了。」
獲得了太晶珠！
（戰鬥中選招式時按 R 讓寶可夢太晶化；用過後到寶可夢中心充能）`);
      }
      // 阿羅拉：同屬性的 Z 純晶
      if (t.region === 'alola' && window.ZMOVES && ZMOVES[type] && !G.state.bag[ZMOVES[type].item]) {
        Game.giveItem(ZMOVES[type].item, 1);
        await UI.say(`獲得了${ITEMS[ZMOVES[type].item].n}！`);
      }
      if (typeof TM !== 'undefined') {
        const tm = TM.give(TM.forType(type).mv);
        if (tm) { Sound.sfx('item'); await UI.say(`${name}：「這個也送給你吧！」
獲得了 ${ITEMS[tm.id].n}！（可以在寶可夢中心的招式機器製作）`); }
      }
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
    const champLv = World.championParty(t).reduce((a, m) => Math.max(a, m.lv), 0);
    const e4 = typeof ELITE_FOUR !== 'undefined' && ELITE_FOUR[t.region];
    const c = await UI.choose(['挑戰', '離開'], { prompt: `要挑戰${reg.n}寶可夢聯盟嗎？${e4 ? '要連續打敗四天王與冠軍。' : ''}（冠軍最高 Lv.${champLv}${G.state.champs[t.region] ? '，重賽' : ''}）` });
    if (c !== 0) return;
    // 四天王連戰：中間可以整理隊伍、使用道具，但不能回寶可夢中心
    if (e4) {
      for (let i = 0; i < e4.length; i++) {
        const e = e4[i];
        await UI.say(`四天王 ${e.name}：「我是四天王的${e.name}，擅長${TYPES[e.type].n}屬性。來吧！」`);
        const r = await Game.battle({ trainer: { title: '四天王', name: e.name, party: World.eliteParty(t, i), kind: 'gym', ai: 3, money: 150, sprite: e.sprite, lose: '……你通過了。前進吧。' }, biome: 'gym' });
        if (r !== 'win') return;
        {
          const last = i === e4.length - 1;
          while (true) {
            const n = await UI.choose([last ? '前往冠軍的房間' : '前往下一個房間', '寶可夢', '背包'], { prompt: `打敗了四天王 ${e.name}！（${i + 1}／4）${last ? '\n接下來是冠軍戰，先整頓隊伍吧。' : ''}`, cancel: false });
            if (n === 0) break;
            if (n === 1) await Game.partyMenu();
            if (n === 2) await Game.bagMenu();
          }
        }
      }
    }
    await UI.say(`${reg.champ}：「歡迎來到${reg.n}寶可夢聯盟的頂點。讓我看看你和寶可夢之間的羈絆吧！」`);
    const party = World.championParty(t);
    const r = await Game.battle({ trainer: { title: '冠軍', name: reg.champ, party, kind: 'champion', dmax: t.region === 'galar', money: 200, sprite: CHAMP_SPRITES[t.region], lose: '恭喜你！你就是新的冠軍！' }, biome: 'gym' });
    if (r === 'win') {
      const first = !Object.keys(G.state.champs).length;
      G.state.champs[t.region] = 1;
      if (!G.state.hofTime) { const ms = G.state.playMs; G.state.hofTime = `${Math.floor(ms / 3600000)}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}`; }
      await UI.say(`恭喜！${G.state.name} 成為了${reg.n}地區的冠軍！你和寶可夢的名字已被記錄在名人堂中！`);
      if (first) { Game.giveItem('master-ball', 1); await UI.say('獲得了大師球！'); }
      if (!G.state.bag['mega-ring'] && typeof Mega !== 'undefined') {
        Game.giveItem('mega-ring', 1);
        const st = Mega.starterStone(G.state.starter);
        if (st) Game.giveItem(st, 1);
        await UI.say(`${reg.champ}：「這是給新冠軍的禮物。」\n獲得了超級手環${st ? '和' + ITEMS[st].n : ''}！\n（寶可夢攜帶超級石時，在戰鬥中選招式時按 M 超級進化）`);
        await UI.say('聽說各地區都散落著其他的超級石……');
      }
      Game.save(true);
    }
  },

  async battle(opts) {
    // 雙打：雙方都有兩隻以上能戰鬥的寶可夢時
    const dbl = opts.double && typeof DoubleBattle !== 'undefined' && opts.trainer && opts.trainer.party.length >= 2 && G.party.filter(m => m.hp > 0).length >= 2;
    const b = dbl ? new DoubleBattle(opts) : new Battle(opts);
    b.raid = opts.raid ? { ...opts.raid } : null;
    const kind = opts.trainer ? (opts.trainer.kind || 'trainer') : opts.raid ? 'raid' : 'wild';
    // 野外的天氣帶進對戰（道館、室內、團體戰除外）
    if (!G.room && !opts.raid && opts.biome !== 'gym' && !(opts.trainer && opts.trainer.field)) b.owWeather = Weather.KINDS[Weather.here()].battle || null;
    const who = opts.trainer ? opts.trainer.name : opts.wild ? POKEDEX[opts.wild.sp].n + opts.wild.lv : '';
    Telemetry.event('戰鬥開始', { kind, who, dbl });
    const t0 = performance.now();
    const r = await b.run();
    Telemetry.time(kind === 'wild' ? '野生戰鬥' : '訓練家戰鬥', performance.now() - t0);
    Telemetry.event('戰鬥結束', { kind, who, r });
    // noBlackout：劇情戰輸了也不會被送回寶可夢中心（例如第一場勁敵戰）
    if (r === 'lose' && opts.noBlackout) { Game.healParty(); await UI.say('寶可夢都恢復了精神。'); }
    else if (r === 'lose') await Game.blackout();
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
    if (typeof Picnic !== 'undefined') await Picnic.step();
    if (s.steps % 128 === 0) G.party.forEach(m => { if (m.hp > 0) m.happy = Math.min(255, m.happy + 1); });
    if (s.repel > 0) { s.repel--; if (s.repel === 0) await UI.say('除蟲噴霧的效果消失了。'); }
    const town = World.townAt(s.x, s.y);
    Game.updateMusic();
    if (town !== G.lastTown) {
      G.lastTown = town;
      if (town) {
        s.visited[town.id] = 1;
        UI.banner(`${REGIONS[town.region].n}地區・${town.name}`);
        await Story.onEnterTown(town);
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
    if (typeof OverworldMons !== 'undefined' && OverworldMons.list.length) rate /= 2; // 看得到的寶可夢在附近時，隨機遇敵減半
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
    if (World.legendAt && World.legendAt(x, y)) return false;
    if (World.eventAt && World.eventAt(x, y)) return false;
    if (t === T.WATER || t === T.DEEP) return G.state.surf || Game.canSurf();
    return true;
  },

  async interact() {
    if (G.room) return Interior.interact();
    const s = G.state;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[s.dir];
    const fx = s.x + d[0], fy = s.y + d[1];
    const b = World.doors.get(fx + ',' + fy);
    if (b) return Game.enterBuilding(b);
    const sign = World.signs && World.signs.get(fx + ',' + fy);
    if (sign) return UI.say(sign);
    const hid = Hidden.at(fx, fy);
    if (hid) return Hidden.pickUp(hid);
    const lm = World.landmarks && World.landmarks.get(fx + ',' + fy);
    if (lm) return Story.landmark(lm);
    const lg = World.legendAt && World.legendAt(fx, fy);
    if (lg) return Story.legend(lg);
    const ev = World.eventAt && World.eventAt(fx, fy);
    if (ev) return Story.eventEntity(ev);
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

  // ---------- 二倍速（按住 Space） ----------
  setFast(on) {
    if (G.fast === on) return;
    G.fast = on;
    document.body.classList.toggle('fast', on);
    if (on) Game.speedAnims();
    else for (const a of document.getAnimations()) if (a._fast) { a.playbackRate = 1; a._fast = false; }
  },
  // 畫面上的動畫（戰鬥特效、捕捉、送出寶可夢……）也加速
  speedAnims() {
    for (const a of document.getAnimations()) if (!a._fast && a.playbackRate < 2) { a.playbackRate = 2; a._fast = true; }
  },

  // ---------- 主迴圈 ----------
  update(dt) {
    if (G.mode !== 'world') return;
    G.state.playMs += dt;
    if (typeof OverworldMons !== 'undefined' && !G.room) OverworldMons.update(performance.now());
    if (G.busy || UI.active()) return;
    // 保險：沒有任何流程或選單在等待時，殘留在畫面上的對話框、選項一律收起
    const dlg = document.getElementById('dialog'), ch = document.getElementById('choices');
    if (dlg && !dlg.classList.contains('hidden')) UI.hideDialog();
    if (ch && !ch.classList.contains('hidden')) { ch.classList.add('hidden'); ch.innerHTML = ''; }
    if (G.room) return Interior.update(dt);
    const s = G.state;
    if (G.move) {
      G.move.t += G.fast ? dt * 2 : dt;
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
    if (World.landmarks && World.landmarks.has(tx + ',' + ty)) { Sound.sfx('door'); Game.flow(() => Story.landmark(World.landmarks.get(tx + ',' + ty))); G.keys.clear(); return; }
    const lg = World.legendAt && World.legendAt(tx, ty);
    if (lg) { Game.flow(() => Story.legend(lg)); G.keys.clear(); return; }
    const ev = World.eventAt && World.eventAt(tx, ty);
    if (ev) { Game.flow(() => Story.eventEntity(ev)); G.keys.clear(); return; }
    const ow = typeof OverworldMons !== 'undefined' && OverworldMons.at(tx, ty);
    if (ow) { OverworldMons.touch(ow); return; }
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
    if (G.room) return Interior.render(g, cv);
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
    Hidden.draw(g, ox, oy);
    // 人物依 y 座標排序繪製（下方的人物蓋住上方）
    const people = [];
    for (let y = y0 - 1; y <= y0 + VH + 1; y++) for (let x = x0; x <= x0 + VW; x++) {
      const tr = World.trainers.get(x + ',' + y);
      if (tr) people.push({ y: y * TILE, tr });
      const lg = World.legendAt && World.legendAt(x, y);
      if (lg) people.push({ y: y * TILE, lg });
      const ev = World.eventAt && World.eventAt(x, y);
      if (ev) people.push({ y: y * TILE, ev });
    }
    if (typeof OverworldMons !== 'undefined') for (const w of OverworldMons.list) people.push({ y: w.y * TILE, ow: w });
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
      if (p.lg) { Game.drawLegend(g, p.lg, p.lg.x * TILE - ox, p.lg.y * TILE - oy); continue; }
      if (p.ow) { OverworldMons.draw(g, p.ow, ox, oy); continue; }
      if (p.ev) { Game.drawEvent(g, p.ev, p.ev.x * TILE - ox, p.ev.y * TILE - oy); continue; }
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
    Weather.draw(g, cv);
    if (U.isNight()) { g.fillStyle = 'rgba(20,30,90,.33)'; g.fillRect(0, 0, cv.width, cv.height); }
    if (G.flash) { g.fillStyle = (G.frame >> 2) % 2 ? '#000' : '#fff'; g.fillRect(0, 0, cv.width, cv.height); }
  },

  // 地圖上的傳說／幻之寶可夢：和野生寶可夢一樣用小圖示（2 格動畫）
  drawLegend(g, l, x, y) { OverworldMons.drawIcon(g, l.sp, x, y); },

  // 從遊戲中返回標題畫面（在目前的流程結束後才切換）
  toTitle() {
    G.room = null;
    G.mode = 'title';
    G.move = null;
    G.keys.clear();
    Sound.stop();
    const cv = document.getElementById('world');
    cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    const wait = () => (G.busy ? setTimeout(wait, 30) : Game.title());
    setTimeout(wait, 0);
  },

  // 事件實體：卡比獸（正面圖，睡著的 Z）、古代石板（靠近 6 格內才會閃光）
  drawEvent(g, e, x, y) {
    if (e.kind === 'raid' && typeof drawRaidCrystal !== 'undefined') return drawRaidCrystal(g, e, x, y);
    if (e.kind === 'twins') {
      const sheet = Gen3.on ? 'npc_lass' : null;
      World.drawPerson(g, x - 10, y, 'down', { pal: Spr.trainerPal(1, 0), sheet }, 0);
      World.drawPerson(g, x + 10, y, 'down', { pal: Spr.trainerPal(1, 1), sheet }, 0);
      return;
    }
    if (e.kind === 'snorlax') {
      Game.drawLegend(g, { sp: 143 }, x, y);
      g.fillStyle = '#f8f8f8'; g.font = 'bold 18px sans-serif';
      const z = (G.frame >> 5) % 3;
      g.fillText('z'.repeat(z + 1), x + TILE - 6, y - 6 - z * 4);
      return;
    }
    const s = G.state;
    if (Math.abs(e.x - s.x) + Math.abs(e.y - s.y) > 6) return;
    const k = (G.frame >> 3) % 4;
    g.fillStyle = k % 2 ? '#fff8c0' : '#ffffff';
    const cx = x + TILE / 2, cy = y + TILE / 2, r = 6 + k * 2;
    g.fillRect(cx - 1, cy - r, 3, r * 2); g.fillRect(cx - r, cy - 1, r * 2, 3);
  },

  // ---------- 標題 / 新遊戲 ----------
  async title() {
    G.mode = 'title';
    Sound.play('title');   // 音訊在第一次按鍵或點擊後才能開始（瀏覽器限制），之後自動播放
    const loaded = Game.loadSave();
    const scr = document.getElementById('title');
    scr.classList.remove('hidden');
    let save = loaded && loaded.state;
    if (loaded && loaded.error) {
      if (loaded.fromBackup) {
        const c = await UI.choose(['恢復備份', '不要'], { prompt: `主存檔無法使用（${loaded.error}）。\n要恢復上一份有效的備份嗎？`, cancel: false });
        if (c !== 0) save = null;
        else { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { } }
      } else {
        await UI.say(`存檔無法使用（${loaded.error}），也沒有可用的備份。\n可以匯入之前匯出的存檔，或開始新遊戲。`);
      }
      UI.hideDialog();
    }
    while (true) {
      const opts = save ? ['繼續遊戲', '新遊戲', '匯入存檔'] : ['新遊戲', '匯入存檔'];
      const c = await UI.choose(opts, { cancel: false, cls: 'title-menu' });
      if (opts[c] === '繼續遊戲') { scr.classList.add('hidden'); return Game.start(save); }
      if (opts[c] === '匯入存檔') {
        const r = await Game.importSave();
        if (!r.ok) { await UI.say(`匯入失敗：${r.error}`); UI.hideDialog(); continue; }
        save = r.state;
        G.state = save;
        Game.save(true);
        await UI.say(`已匯入 ${save.name} 的存檔！`);
        UI.hideDialog();
        continue;
      }
      if (save) {
        const ok = await UI.choose(['是', '否'], { prompt: '開始新遊戲會覆蓋原本的存檔，確定嗎？' });
        UI.hideDialog();
        if (ok !== 0) continue;
      }
      scr.classList.add('hidden');
      if (await Game.newGame() !== false) return;
      // 在輸入名字時返回：回到標題選單
      UI.hideDialog();
      scr.classList.remove('hidden');
    }
  },

  // 新遊戲設定：每一步都可以按 X／Esc 回到上一步（名字 → 地區 → 夥伴）；在名字返回時回傳 false
  async newGame() {
    await UI.say('歡迎來到寶可夢的世界！');
    await UI.say('這個世界上住著被稱為「寶可夢」的不可思議的生物。在這片廣大的世界裡，九個地區相連在一起，全部 1025 種寶可夢都生活在某個角落。');
    const keys = Object.keys(REGIONS);
    let step = 1, name = '小智', r = 0, region, reg, starter;
    while (step < 4) {
      if (step === 1) {
        UI.hideDialog();
        const v = await UI.input('首先，請告訴我你的名字。', name, { cancel: true });
        if (v === null) return false;
        name = v; step = 2;
      } else if (step === 2) {
        const i = await UI.list({
          title: '要從哪個地區開始冒險？',
          rows: keys.map(k => `<div class="grow"><b>${REGIONS[k].n}地區</b>　<span class="dim">第 ${REGIONS[k].gen} 世代・從${REGIONS[k].home}出發・${REGIONS[k].prof}</span></div>
            ${REGIONS[k].starters.map(id => `<img class="icon" src="${Mon.sprite(id)}">`).join('')}`),
          start: r,
        });
        if (i < 0) { step = 1; continue; }
        r = i; region = keys[r]; reg = REGIONS[region];
        await UI.say(`${reg.prof}：「${name}，歡迎來到${reg.n}地區！我是${reg.prof}。」`);
        step = 3;
      } else {
        const i = await UI.list({
          title: `${reg.prof}：「選一隻作為你的夥伴吧！」`,
          rows: reg.starters.map(id => `<img class="big-icon" src="${Mon.sprite(id)}"><div class="grow"><b>${POKEDEX[id].n}</b> ${POKEDEX[id].t.map(typeTag).join('')}<div class="dim small">${U.esc(POKEDEX[id].gen)}　${U.esc(POKEDEX[id].fl)}</div></div>`),
        });
        if (i < 0) { UI.hideDialog(); step = 2; continue; }
        const ok = await UI.choose(['是', '否'], { prompt: `確定要選擇 ${POKEDEX[reg.starters[i]].n} 嗎？` });
        if (ok === 0) { starter = reg.starters[i]; step = 4; }
      }
    }
    UI.showText('正在生成世界……');
    await U.sleep(50);
    const st = Game.newState(name, region, starter);
    const m = Mon.create(starter, 5);
    m.happy = 120;
    st.party.push(m);
    st.seen[starter] = 1; st.caught[starter] = 1; st.legendsCaught = {};
    Game.start(st, true);
    await UI.say(`${reg.prof}：「${POKEDEX[starter].n} 和你看起來很合得來呢！」`);
    await UI.say(`${reg.prof}：「這個世界很廣闊。往遠處走，寶可夢會越來越強。收集各地區的徽章、挑戰聯盟，並且完成這本圖鑑吧！」`);
    await UI.say('（操作：方向鍵／WASD 移動，Shift 跑步，Z／Enter 調查，X／Esc 選單，M 地圖，按住 Space 二倍速）');
    UI.hideDialog();
    Game.save(true);
  },

  start(state, fresh = false) {
    G.room = null;
    G.state = state;
    G.state.flags = G.state.flags || {};
    // 舊存檔的寶可夢補上性別
    for (const m of [...state.party, ...state.box]) {
      if (!('gender' in m)) m.gender = Mon.genderOf(m.sp);
      if (!m.ability) m.ability = Abil.pick(m.sp);
      if (!('item' in m)) m.item = null;
    }
    UI.showText('正在生成世界……');
    Telemetry.measure('世界生成', () => World.generate(state.seed, state.region, state.worldVer || 1));
    Telemetry.measure('地圖繪製', () => World.renderMap());
    Telemetry.event('開始遊戲', { region: state.region, worldVer: state.worldVer || 1 });
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
    // 按住 Space：二倍速（不當作確認鍵）
    if (e.key === ' ') { Game.setFast(true); return; }
    Sound.init();
    if (UI.handleKey(e)) { G.keys.clear(); return; }
    G.keys.add(e.key);
    if (G.mode !== 'world' || G.busy || e.repeat) return;
    if (UI.isOk(e) && !G.move) Game.flow(() => Game.interact());
    else if ((e.key === 'x' || e.key === 'X' || e.key === 'Escape') && !G.move) Game.flow(() => Game.mainMenu());
    else if ((e.key === 'm' || e.key === 'M') && !G.move) Game.flow(() => Game.mapMenu());
  });
  // 點擊／觸控也能解除瀏覽器的音訊限制
  window.addEventListener('pointerdown', () => Sound.init(), true);
  window.addEventListener('keyup', e => { if (e.key === ' ') Game.setFast(false); G.keys.delete(e.key); G.keys.delete(e.key.toLowerCase()); G.keys.delete(e.key.toUpperCase()); });
  window.addEventListener('blur', () => { G.keys.clear(); Game.setFast(false); });
  // 觸控：按住 ▶▶ 按鈕二倍速
  document.querySelectorAll('#touch [data-fast]').forEach(b => {
    b.addEventListener('pointerdown', e => { e.preventDefault(); Game.setFast(true); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => Game.setFast(false));
  });

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
    if (G.fast) Game.speedAnims();
    Telemetry.frame(dt);
    // 一個畫格出錯時記錄下來並繼續執行，不讓整個遊戲停住
    try { Game.update(dt); Game.render(); } catch (e) { Telemetry.error(e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e), 'loop'); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  Game.title();
  // 每 2 分鐘自動存檔
  setInterval(() => { if (G.mode === 'world' && !G.busy) Game.save(true); }, 120000);
});
