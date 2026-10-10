// 對戰塔（可重複遊玩）：各地區寶可夢聯盟旁（世界配置第 6 版），成為任一地區冠軍後開放
// - 從隊伍選 3 隻；對戰時使用 Lv.50 的複本（不改動原本的寶可夢、不拿經驗值、不存檔）
// - 連續挑戰 7 位訓練家（第 3 層 AI，完全進化、個體值滿、攜帶道具），每場之間全部回復
// - 每贏一場得到對戰點數（BP），7 連勝另有獎勵；記錄最高連勝；BP 可以兌換道具
const BattleTower = (() => {
  const LV = 50, ROUND = 7;
  const NAMES = ['精英訓練家 ' + '雅各', '精英訓練家 艾琳', '紳士 羅伯', '大小姐 夏洛特', '龍使者 凱', '超能力者 米雅', '空手道王 大地', '靈媒師 夜子', '老練的訓練家 宗一', '老練的訓練家 千惠'];
  const SPRITES = ['acetrainer-gen3', 'acetrainerf-gen3', 'gentleman-gen3', 'lady-gen3', 'dragontamer-gen3', 'psychic-gen3', 'blackbelt-gen3', 'hexmaniac-gen3', 'veteran', 'veteranf'];
  const ITEMS_POOL = ['leftovers', 'life-orb', 'choice-scarf', 'choice-band', 'choice-specs', 'focus-sash', 'sitrus-berry', 'lum-berry', 'assault-vest', 'expert-belt', 'rocky-helmet'];
  const SHOP = [['rare-candy', 3], ['leftovers', 12], ['life-orb', 12], ['choice-scarf', 16], ['choice-band', 16], ['choice-specs', 16], ['focus-sash', 10], ['assault-vest', 12], ['master-ball', 64]];

  // 對手的寶可夢：完全進化（不是傳說）、種族值 450–600
  let pool = null;
  function candidates() {
    if (pool) return pool;
    pool = Object.values(POKEDEX).filter(s => s.id <= 1025 && !s.lg && !s.baby && !Object.values(POKEDEX).some(o => o.pre === s.id))
      .map(s => s.id).filter(id => { const b = Mon.bst(id); return b >= 450 && b <= 600; });
    return pool;
  }
  // 第 n 場（0 起）的對手：連勝越多越強（種族值越高）
  function opponent(streak, n) {
    const rnd = mulberry32((G.state.seed ^ (streak * 7919 + n * 104729)) >>> 0);
    const list = candidates();
    const strength = Math.min(1, (streak + n) / 28);
    const sorted = [...list].sort((a, b) => Mon.bst(a) - Mon.bst(b));
    const lo = Math.floor(strength * sorted.length * .6), span = Math.max(20, Math.floor(sorted.length * .4));
    const party = [];
    while (party.length < 3) {
      const id = sorted[Math.min(sorted.length - 1, lo + Math.floor(rnd() * span))];
      if (party.some(m => m.sp === id)) continue;
      party.push(Mon.create(id, LV, { shiny: false, perfect: 31, hidden: .3, item: ITEMS_POOL[Math.floor(rnd() * ITEMS_POOL.length)] }));
    }
    const k = Math.floor(rnd() * NAMES.length);
    return { name: NAMES[k], sprite: SPRITES[k], party };
  }
  // Lv.50 的複本（努力值、個體值、招式、道具、形態都保留）
  function copy(m) {
    const c = JSON.parse(JSON.stringify(m));
    c.lv = LV;
    c.exp = Mon.expFor(POKEDEX[c.sp].gr, LV);
    c.hp = Mon.maxHp(c); c.st = null;
    c.moves.forEach(x => { x.pp = MOVES[x.id].pp; });
    c.uid = 'tower-' + m.uid;
    return c;
  }

  async function pickTeam() {
    const team = [];
    while (team.length < 3) {
      const opts = G.party.map((m, i) => ({ label: `${Mon.name(m)} Lv.${m.lv}${team.includes(i) ? '（已選）' : ''}`, disabled: team.includes(i) || m.isEgg }));
      opts.push({ label: '取消' });
      const c = await UI.choose(opts, { prompt: `選擇參賽的寶可夢（${team.length + 1}／3）\n等級會暫時調整為 Lv.${LV}` });
      if (c < 0 || c === opts.length - 1) return null;
      team.push(c);
    }
    return team;
  }

  async function challenge() {
    const s = G.state;
    if (G.party.filter(m => !m.isEgg).length < 3) { await UI.say('對戰塔要用 3 隻寶可夢參賽。'); return; }
    const team = await pickTeam();
    if (!team) return;
    const realParty = s.party;
    const tower = team.map(i => copy(realParty[i]));
    s.towerStreak = s.towerStreak || 0;
    let won = 0, lost = false;
    G.tower = true;
    try {
      s.party = tower;
      for (let n = 0; n < ROUND; n++) {
        tower.forEach(Mon.heal);
        const o = opponent(s.towerStreak, n);
        await UI.say(`第 ${n + 1} 場（連勝 ${s.towerStreak + n}）\n${o.name} 走了出來！`);
        const r = await Game.battle({ trainer: { title: '', name: o.name, party: o.party, kind: 'gym', ai: 3, money: 0, items: 0, sprite: o.sprite, lose: '……你很強。' }, biome: 'gym', noBlackout: true, tower: true });
        if (r !== 'win') { lost = true; break; }
        won++;
        s.bp = (s.bp || 0) + (n === ROUND - 1 ? 5 : 1);
        if (n < ROUND - 1) {
          const c = await UI.choose(['繼續挑戰', '休息（結束這一輪）'], { prompt: `贏了！連勝 ${s.towerStreak + won}。目前有 ${s.bp} BP。`, cancel: false });
          if (c === 1) break;
        }
      }
    } finally {
      s.party = realParty;
      G.tower = false;
    }
    // 最高紀錄：這一輪結束時的連勝（輸了之前的也算）
    s.towerBest = Math.max(s.towerBest || 0, s.towerStreak + won);
    if (lost) {
      await UI.say(`挑戰結束。這一輪贏了 ${won} 場。`);
      s.towerStreak = 0;
    } else {
      s.towerStreak += won;
      if (won === ROUND) await UI.say(`7 連勝！太厲害了！\n目前連勝 ${s.towerStreak}。`);
    }
    Game.save(true);
  }

  async function exchange() {
    const s = G.state;
    while (true) {
      const opts = SHOP.map(([id, bp]) => ({ label: `${ITEMS[id] ? ITEMS[id].n : id}　${bp} BP`, disabled: !ITEMS[id] || (s.bp || 0) < bp }));
      opts.push({ label: '離開' });
      const c = await UI.choose(opts, { prompt: `要兌換什麼？（目前 ${s.bp || 0} BP）` });
      if (c < 0 || c === opts.length - 1) return;
      const [id, bp] = SHOP[c];
      s.bp -= bp;
      Game.giveItem(id, 1);
      Sound.sfx('item');
      await UI.say(`兌換了 ${ITEMS[id].n}！`);
    }
  }

  async function visit(lm) {
    const s = G.state;
    await UI.say('這裡是對戰塔。強大的訓練家們聚集在這裡，挑戰你的連勝紀錄！');
    if (!Object.keys(s.champs).length) { await UI.say('櫃台：「對戰塔只開放給成為冠軍的訓練家。」'); return; }
    while (true) {
      const c = await UI.choose(['挑戰（3 對 3，Lv.50）', '兌換獎品', '規則說明', '離開'], { prompt: `目前連勝 ${s.towerStreak || 0}　最高紀錄 ${s.towerBest || 0}　${s.bp || 0} BP` });
      if (c === 0) await challenge();
      else if (c === 1) await exchange();
      else if (c === 2) await UI.say(`選 3 隻寶可夢參賽，等級暫時調整為 Lv.${LV}（不會改動原本的寶可夢）。\n連續挑戰 7 位訓練家，每場之間會全部回復。每贏一場得到 1 BP，7 連勝再多 4 BP。連勝會累積到輸掉為止。`);
      else return;
    }
  }
  return { visit, challenge, exchange, opponent, copy, LV, ROUND };
})();

// 對戰塔的地標：各地區聯盟旁（第 6 版）
for (const r of REGION_KEYS) (LANDMARKS[r] = LANDMARKS[r] || []).push({ id: 'tower_' + r, n: '對戰塔', near: 'league', event: 'battletower', ver: 6 });
const _storyLandmarkT = Story.landmark;
Story.landmark = async function (lm) {
  if (lm.event === 'battletower') { G.state.flags['seen_' + lm.id] = 1; return BattleTower.visit(lm); }
  return _storyLandmarkT.call(this, lm);
};
