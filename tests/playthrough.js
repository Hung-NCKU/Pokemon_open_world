// 自動遊玩測試：從新遊戲到關都冠軍（機器人透過遊戲本身的流程進行）
// - 新遊戲（關都、小火龍）→ 大木博士（勁敵第一戰）→ 依序挑戰 8 座道館 → 四天王 → 冠軍
// - 每座道館前在附近的野外訓練，直到隊伍最高等級接近館主
// - 戰鬥時選預估傷害最高的招式；輸了就回寶可夢中心再訓練、再挑戰
// - 紀錄：每個階段的訓練場數、等級、失敗次數、例外錯誤、世界生成耗時
(() => {
  const log = [], errors = [];
  window.addEventListener('error', e => errors.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const realErr = console.error;
  console.error = (...a) => { errors.push(a.map(x => (x && x.stack) ? x.stack.split('\n').slice(0, 3).join(' | ') : String(x)).join(' ')); realErr(...a); };

  // 不顯示畫面、不等待
  U.sleep = () => Promise.resolve();
  UI.say = async () => { };
  UI.panel = async () => { };
  UI.input = async (p, d) => d || '測試';
  UI.list = async () => 0;
  UI.choose = async (opts, o = {}) => {
    // 四天王的房間之間：像玩家用全滿藥／活力塊整頓隊伍（用錢換算：每隻受傷的寶可夢 1500 元＝厲害傷藥，買不起就不補）
    if (/打敗了四天王/.test(o.prompt || '')) {
      for (const m of G.party) {
        const max = Mon.maxHp(m);
        if ((m.hp < max * 0.7 || m.st) && G.state.money >= 1500) { G.state.money -= 1500; spent += 1500; m.hp = max; m.st = null; }
      }
      return 0;
    }
    const i = opts.findIndex(x => !(x && x.disabled)); return i < 0 ? 0 : i;
  };
  let spent = 0;
  Game.dexEntry = async () => { };
  Sound.sfx = () => { }; Sound.play = () => { }; Sound.jingle = async () => { };
  Battle.prototype.moveAnim = async () => { };
  Battle.prototype.anim = async () => { };
  Battle.prototype.trainerIntro = async () => { };
  Battle.prototype.trainerLeave = async () => { };
  Battle.prototype.wildIntro = async () => { };
  Battle.prototype.catchAnim = async function () { return null; };
  Game.save = () => true;

  // 機器人的戰鬥：預估傷害最高的招式（屬性相剋 × 屬性一致 × 威力）
  Battle.prototype.chooseAction = async function () {
    const me = this.me, foe = this.foe;
    let best = -1, bi = -1;
    me.moves.forEach((s, i) => {
      if (s.pp <= 0 || this.moveBlocked(me, this.vMe, s.id)) return;
      const m = md(s.id);
      let score = m.cat === 'Status' ? 1 : (m.bp || 40) * this.effectiveness(m, foe, me) * (this.typesOf(me).includes(m.type) ? 1.5 : 1);
      if (score > best) { best = score; bi = i; }
    });
    return { type: 'move', idx: bi };
  };
  // 學招式：已有 4 招時，取代最弱的一招（變化招式最先被取代；同屬性加成 1.5 倍）
  const realLearn = Game.learnMove.bind(Game);
  Game.learnMove = async (m, mid, battle) => {
    if (m.moves.length < 4 || m.moves.some(x => x.id === mid)) return realLearn(m, mid, battle);
    const types = POKEDEX[m.sp].t || [];
    const val = id => { const x = md(id); return x.cat === 'Status' ? 0 : (x.bp || 40) * (types.includes(x.type) ? 1.5 : 1) * ((x.acc === true || !x.acc) ? 1 : x.acc / 100); };
    let wi = 0;
    m.moves.forEach((x, i) => { if (val(x.id) < val(m.moves[wi].id)) wi = i; });
    if (val(mid) > val(m.moves[wi].id)) m.moves[wi] = { id: mid, pp: MOVES[mid].pp };
  };
  // 換人：第一隻還能戰鬥的
  Game.partyMenu = async ({ battle = null } = {}) => G.party.findIndex((m, i) => m.hp > 0 && (!battle || i !== battle.myIdx));

  // 紀錄訓練家戰鬥的結果（失敗時看得出原因）
  const realBattle = Game.battle.bind(Game);
  let lastFight = null;
  Game.battle = async opts => {
    const r = await realBattle(opts);
    if (opts.trainer) lastFight = { r, foe: opts.trainer.party.map(m => POKEDEX[m.sp].n + m.lv + (m.item ? '@' + m.item : '')).join(' '), mine: G.party.map(m => POKEDEX[m.sp].n + m.lv + ':' + m.hp + '/' + m.moves.map(x => x.id + '(' + x.pp + ')').join(',')).join(' ; ') };
    return r;
  };
  const kantoTowns = () => World.towns.filter(t => t.region === 'kanto');
  const top = () => Math.max(...G.party.map(m => m.lv));
  const low = () => Math.min(...G.party.map(m => m.lv));
  // 訓練：在「上一個地點 → 目標」路上，找野外等級接近隊伍等級的草叢；最弱的寶可夢帶頭，讓全隊平均升級
  async function train(from, near, targetLv, maxBattles = 400) {
    let n = 0;
    while (low() < targetLv && n < maxBattles) {
      Game.healParty();
      const want = Math.min(targetLv, low() + 2);
      let spot = null, bestD = 1e9;
      for (let k = 0; k <= 20; k++) {
        const cx = from.cx + (near.cx - from.cx) * k / 20, cy = from.cy + (near.cy - from.cy) * k / 20;
        for (let r = 0; r < 24; r += 3) for (let a = 0; a < 12; a++) {
          const x = Math.round(cx + Math.cos(a / 12 * 6.283) * r), y = Math.round(cy + Math.sin(a / 12 * 6.283) * r);
          if (World.tile(x, y) !== T.TALL || World.regionAt(x, y) !== 'kanto') continue;
          const d = Math.abs(World.levelAt(x, y) - want);
          if (d < bestD) { bestD = d; spot = [x, y]; }
        }
      }
      if (!spot) spot = [near.cx, near.cy + 10];
      // 最弱的帶頭
      const w = G.party.indexOf(G.party.reduce((a, m) => (m.lv < a.lv ? m : a)));
      if (w > 0) { const m = G.party.splice(w, 1)[0]; G.party.unshift(m); }
      const wild = World.rollWild(spot[0], spot[1], 'tall');
      const r = await Game.battle({ wild, biome: 'tall' });
      n++;
      if (r === 'lose') Game.healParty();
    }
    // 出戰前：最強的帶頭
    G.party.sort((a, b) => b.lv - a.lv);
    return n;
  }
  // 路上的訓練家：上一站 → 目標的路線附近（10 格內）還沒打過的，依序挑戰（像玩家一樣邊走邊打）
  async function routeTrainers(from, to) {
    const seg = (x, y) => { const vx = to.cx - from.cx, vy = to.cy - from.cy, L = vx * vx + vy * vy || 1; const k = U.clamp(((x - from.cx) * vx + (y - from.cy) * vy) / L, 0, 1); return Math.hypot(from.cx + vx * k - x, from.cy + vy * k - y); };
    const list = [...World.trainers.values()].filter(tr => World.regionAt(tr.x, tr.y) === 'kanto' && !G.state.defeated[tr.x + ',' + tr.y] && seg(tr.x, tr.y) <= 10);
    let won = 0;
    for (const tr of list) {
      Game.healParty();
      G.party.sort((a, b) => b.lv - a.lv);
      await Game.trainerBattle(tr);
      if (G.state.defeated[tr.x + ',' + tr.y]) won++;
    }
    return [won, list.length];
  }
  // 依目標修正：捕捉一些隊友（第一座道館前補到 3 隻）
  async function catchTeam(near, want) {
    let tries = 0;
    while (G.party.length < want && tries < 60) {
      tries++;
      const wild = World.rollWild(near.cx + 8, near.cy + 8, 'tall');
      if (G.party.some(m => m.sp === wild.sp)) continue;
      wild.hp = 1;
      G.party.push(wild); Game.markCaught(wild.sp);
      wild.hp = Mon.maxHp(wild);
    }
  }

  const pace = [];
  async function run() {
    Weather.force('clear');
    const t0 = performance.now();
    G.state = Game.newState('機器人', 'kanto', 4);
    // ?seed=數字：固定世界與亂數（重現同一場遊玩）
    const qs = new URLSearchParams(location.search);
    if (qs.get('seed')) { G.state.seed = +qs.get('seed'); U.seed(+qs.get('seed')); }
    log.push({ stage: '種子', seed: G.state.seed });
    const m = Mon.create(4, 5); G.state.party.push(m); G.state.seen[4] = 1; G.state.caught[4] = 1;
    const g0 = performance.now();
    Game.start(G.state, true);
    const genMs = Math.round(performance.now() - g0);
    log.push({ stage: '世界生成', ms: genMs });
    const home = World.homeTown;
    // 大木博士（任務開始、勁敵第一戰）
    await Story.oak();
    log.push({ stage: '勁敵第一戰', flags: !!G.state.flags.rival1, lv: top() });
    await catchTeam(home, 3);
    const gyms = kantoTowns().filter(t => t.kind === 'gym').sort((a, b) => a.gym - b.gym);
    let prev = home;
    for (const g of gyms) {
      let fails = 0, trained = 0;
      const [tw, tn] = await routeTrainers(prev, g);
      const lvAfterTrainers = low();
      // 第 4 座道館之後隊伍補到 6 隻（新隊友在之後的訓練中由最弱的帶頭追上等級）
      if (g.gym >= 3) await catchTeam(g, Math.min(6, g.gym));
      while (!(G.state.badges.kanto || []).includes(g.gym) && fails < 6) {
        const target = World.gymLevel(g) - 1 + fails * 2;
        trained += await train(prev, g, target);
        Game.healParty();
        Game.warp(g.cx, g.cy, 'down');
        await Game.gymChallenge(g);
        await Story.onEnterTown(g);
        if (!(G.state.badges.kanto || []).includes(g.gym)) { fails++; if (fails === 1 || fails === 6) log.push({ stage: `道館 ${g.gym + 1} 失敗`, ...lastFight }); }
      }
      log.push({ stage: `道館 ${g.gym + 1}（${g.name}）`, badge: (G.state.badges.kanto || []).includes(g.gym), trainers: `${tw}/${tn}`, lvAfterTrainers, trained, fails, lv: top(), low: low(), gymLv: World.gymLevel(g) });
      pace.push(trained);
      if (!(G.state.badges.kanto || []).includes(g.gym)) break;
      prev = g;
    }
    const league = kantoTowns().find(t => t.kind === 'league');
    await routeTrainers(prev, league);
    let fails = 0, trained = 0;
    while (!G.state.champs.kanto && fails < 10 && (G.state.badges.kanto || []).length === 8) {
      const champTop = World.championParty(league).reduce((a, x) => Math.max(a, x.lv), 0);
      trained += await train(prev, league, champTop - 2 + fails * 2, 600);
      Game.healParty();
      await Game.leagueChallenge(league);
      if (!G.state.champs.kanto) { fails++; if (fails === 1 || fails === 10) log.push({ stage: '聯盟失敗', ...lastFight }); }
    }
    log.push({ stage: '四天王與冠軍', champion: !!G.state.champs.kanto, trained, fails, lv: top(), low: low(), spent, money: G.state.money });
    pace.push(trained);
    log.push({ stage: '總計', ms: Math.round(performance.now() - t0), party: G.party.map(x => POKEDEX[x.sp].n + x.lv).join(' '), trainedTotal: pace.reduce((a, b) => a + b, 0), trainedMax: Math.max(...pace) });
    return !!G.state.champs.kanto;
  }

  window.addEventListener('load', () => setTimeout(async () => {
    let ok = false;
    try { ok = await run(); } catch (e) { errors.push('EXC ' + e.stack); }
    const out = document.createElement('pre');
    out.id = 'result';
    out.textContent = (ok && !errors.length ? 'PASS' : 'FAIL') + '\n' + log.map(x => JSON.stringify(x)).join('\n') + (errors.length ? '\n錯誤：\n' + errors.slice(0, 20).join('\n') : '');
    document.body.appendChild(out);
    document.title = ok && !errors.length ? 'PASS' : 'FAIL';
  }, 100));
})();
