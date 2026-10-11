// 關都的冒險支線（不同於道館的目標與獎勵）
// 1. 火箭隊秘密基地（玉虹市附近）：連戰手下與首領坂木 → 西爾佛檢視鏡
// 2. 寶可夢塔（金黃市附近）：有檢視鏡才看得清幽靈 → 安撫嘎啦嘎啦的靈魂 → 富士老人送寶可夢之笛
// 3. 卡比獸（兩隻，睡在道路上）：用寶可夢之笛叫醒後戰鬥（只放在有其他路可以繞過的地方）
// 4. 古代石板（五片，散落在關都各地，靠近時會閃光）：集齊後解讀出夢幻的所在
ITEMS['silph-scope'] = { n: '西爾佛檢視鏡', price: 0, kind: 'key', d: '能看穿幽靈真面目的檢視鏡。' };
ITEMS['poke-flute'] = { n: '寶可夢之笛', price: 0, kind: 'key', d: '能叫醒睡著的寶可夢的笛子。' };
ITEMS['ancient-tablet'] = { n: '古代石板', price: 0, kind: 'key', d: '刻著古代文字的石板碎片。集齊五片就能解讀。' };

LANDMARKS.kanto.push(
  { id: 'rockethideout', n: '火箭隊秘密基地', near: 3, event: 'rocket' },
  { id: 'pokemontower', n: '寶可夢塔', near: 5, event: 'tower' },
);
LANDMARK_ECO.pokemontower = [['tall', 92, 'common'], ['tall', 104, 'common'], ['tall', 200, 'uncommon'], ['tall', 93, 'rare']];
LANDMARK_ECO.rockethideout = [['tall', 19, 'common'], ['tall', 41, 'common'], ['tall', 109, 'common'], ['tall', 23, 'uncommon'], ['tall', 52, 'rare']];

const TABLETS = 5;

// 世界產生後放置事件實體（不改變地形）
const _evGenerate = World.generate;
World.generate = function (...a) {
  const r = _evGenerate.apply(this, a);
  this.placeEvents(mulberry32((this.seed ^ 0x5eed) >>> 0));
  return r;
};

Object.assign(World, {
  placeEvents(rng) {
    this.events = new Map();
    const kanto = this.towns.filter(t => t.region === 'kanto');
    if (!kanto.length) return;
    const free = (x, y) => this.inside(x, y) && !this.townAt(x, y) && !this.trainers.has(x + ',' + y) && !this.doors.has(x + ',' + y)
      && !(this.legends && this.legends.has(x + ',' + y)) && !(this.landmarks && this.landmarks.has(x + ',' + y)) && !this.events.has(x + ',' + y);
    // 卡比獸：道路上、移除後兩側仍然連通（有路可以繞）
    // 關都所有道路格（亂數排序），先用嚴格條件，找不到再放寬
    const roads = [];
    for (let y = 0; y < WH; y += 2) for (let x = 0; x < WW; x += 2) if (this.tile(x, y) === T.PATH && this.regionAt(x, y) === 'kanto') roads.push([x, y]);
    for (let i = roads.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [roads[i], roads[j]] = [roads[j], roads[i]]; }
    let placed = 0;
    for (const [townGap, spacing] of [[14, 30], [10, 20], [8, 12]]) {
      for (const [x, y] of roads) {
        if (placed >= 2) break;
        if (!free(x, y) || this.towns.some(t => Math.hypot(t.cx - x, t.cy - y) < townGap)) continue;
        if ([...this.events.values()].some(e => Math.hypot(e.x - x, e.y - y) < spacing)) continue;
        if (!this.detourExists(x, y)) continue;
        this.events.set(x + ',' + y, { kind: 'snorlax', id: 'snorlax' + placed, x, y, sp: 143 });
        placed++;
      }
      if (placed >= 2) break;
    }
    // 雙胞胎（雙打）：華藍市附近的道路上
    const cer = kanto.find(t => t.gym === 1);
    if (cer) {
      let spot = null;
      for (let r = 10; r < 26 && !spot; r++) for (let a = 0; a < 16 && !spot; a++) {
        const x = Math.round(cer.cx + Math.cos(a / 16 * Math.PI * 2) * r), y = Math.round(cer.cy + Math.sin(a / 16 * Math.PI * 2) * r);
        if (this.tile(x, y) === T.PATH && free(x, y) && !this.townAt(x, y) && this.detourExists(x, y)) spot = [x, y];
      }
      if (spot) this.events.set(spot[0] + ',' + spot[1], { kind: 'twins', id: 'twins', x: spot[0], y: spot[1] });
    }
    // 古代石板：關都的草叢、岩地、沙灘
    const ok = new Set([T.TALL, T.GRASS, T.CAVE, T.SAND, T.FLOWER]);
    const [, , rad] = REGION_POS.kanto, [rx, ry] = REGION_POS.kanto;
    let n = 0;
    for (let tries = 0; tries < 4000 && n < TABLETS; tries++) {
      const ang = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * rad;
      const x = Math.round(rx + Math.cos(ang) * rr), y = Math.round(ry + Math.sin(ang) * rr);
      if (this.regionAt(x, y) !== 'kanto' || !ok.has(this.tile(x, y)) || !free(x, y)) continue;
      if ([...this.events.values()].some(e => Math.hypot(e.x - x, e.y - y) < 25)) continue;
      this.events.set(x + ',' + y, { kind: 'tablet', id: 'tablet' + n, x, y });
      n++;
    }
  },
  // 從 (x, y) 一側走到另一側的路（不經過 (x, y)）是否存在，限制在半徑 40 格內
  detourExists(x, y) {
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => this.passable(a, b));
    if (nb.length < 2) return true;
    const key = (a, b) => a + ',' + b;
    const seen = new Set([key(x, y), key(...nb[0])]);
    const q = [nb[0]];
    while (q.length) {
      const [a, b] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const na = a + dx, nb2 = b + dy, k = key(na, nb2);
        if (seen.has(k) || Math.abs(na - x) > 40 || Math.abs(nb2 - y) > 40 || !this.passable(na, nb2)) continue;
        seen.add(k);
        q.push([na, nb2]);
      }
    }
    return nb.every(p => seen.has(key(...p)));
  },
  passable(x, y) {
    if (!this.inside(x, y)) return false;
    const t = this.tile(x, y);
    return !BLOCKED.has(t) && t !== T.DOOR && t !== T.WATER && t !== T.DEEP;
  },
  // 還存在的事件實體
  eventAt(x, y) {
    const e = this.events && this.events.get(x + ',' + y);
    return e && !(G.state && G.state.flags && G.state.flags['ev_' + e.id]) ? e : null;
  },
});

Object.assign(Story, {
  async eventEntity(e) {
    const s = G.state;
    if (e.kind === 'tablet') {
      s.flags['ev_' + e.id] = 1;
      Game.giveItem('ancient-tablet', 1);
      Sound.sfx('item');
      const got = s.bag['ancient-tablet'] || 0;
      await UI.say(`發現了一片古代石板！（${got}／${TABLETS}）`);
      if (got === 1) await UI.say('上面刻著古代文字……其他碎片好像散落在關都各地。靠近時石板會閃閃發光。');
      if (got >= TABLETS) {
        s.flags.mewhint = 1;
        await UI.say('五片石板拼在一起了！\n「傳說中所有寶可夢的祖先，至今仍在這片土地的某處……」');
        const mew = World.legends && [...World.legends.values()].find(l => l.sp === 151);
        if (mew) await UI.say('石板上的地圖指向了某個地方！（地圖上已經標示出夢幻的位置）');
        Game.giveItem('rare-candy', 3);
        await UI.say('石板的縫隙裡還夾著 3 顆神奇糖果！');
      } else await UI.say(Story.tabletHint());
      Game.save(true);
      return;
    }
    if (e.kind === 'twins') {
      if (G.party.filter(m => m.hp > 0).length < 2) { await UI.say('雙胞胎：「我們要兩個人一起比賽！你也要有兩隻能戰鬥的寶可夢才行喔！」'); return; }
      await UI.say('雙胞胎 小優與小美：「我們兩個人一起上！來雙打吧！」');
      const L = World.gymLevel(World.towns.find(t => t.region === 'kanto' && t.gym === 1)) + 2;
      const mk = (sp, moves, ab) => { const m = Mon.create(sp, L); m.moves = moves.filter(id => MOVES[id]).map(id => ({ id, pp: MOVES[id].pp })); m.ability = ab; return m; };
      const party = [mk(311, [435, 270, 98, 209], 'plus'), mk(312, [486, 270, 435, 204], 'minus')];
      const r = await Game.battle({ trainer: { title: '雙胞胎', name: '小優與小美', party, kind: 'trainer', money: 60, sprite: 'twins', lose: '兩個人一起還是輸了……' }, double: true });
      if (r === 'win') {
        s.flags['ev_' + e.id] = 1;
        Game.giveItem('rare-candy', 2);
        await UI.say('雙胞胎：「好厲害！這個送給你！」\n獲得了 2 顆神奇糖果！');
        Game.save(true);
      }
      return;
    }
    if (e.kind === 'snorlax') {
      if (!s.bag['poke-flute']) { await UI.say('一隻巨大的寶可夢擋住了道路，正在呼呼大睡……\n（好像需要什麼東西才能叫醒牠）'); return; }
      const c = await UI.choose(['吹寶可夢之笛', '不要'], { prompt: '卡比獸正在呼呼大睡。要吹寶可夢之笛嗎？' });
      if (c !== 0) return;
      await UI.say('吹起了寶可夢之笛！\n♪～♪♪～');
      await UI.say('卡比獸醒過來了！生氣地撲了過來！');
      const L = Math.max(30, Math.round(World.levelAt(e.x, e.y)) + 5);
      const r = await Game.battle({ wild: Mon.create(143, L, { perfect: 15 }), biome: 'tall' });
      s.flags['ev_' + e.id] = 1;
      if (r !== 'catch') await UI.say('卡比獸慢吞吞地離開了。道路暢通了！');
      Game.save(true);
    }
  },
  // 下一片石板的提示：最近的城鎮與方位
  tabletHint() {
    const s = G.state;
    const left = [...(World.events || new Map()).values()].filter(e => e.kind === 'tablet' && !s.flags['ev_' + e.id]);
    if (!left.length) return '';
    const e = left.reduce((a, b) => (Math.hypot(b.x - s.x, b.y - s.y) < Math.hypot(a.x - s.x, a.y - s.y) ? b : a));
    const town = World.towns.filter(t => t.region === 'kanto').reduce((a, t) => (Math.hypot(t.cx - e.x, t.cy - e.y) < Math.hypot(a.cx - e.x, a.cy - e.y) ? t : a));
    const dx = e.x - town.cx, dy = e.y - town.cy;
    const dir = Math.abs(dx) > Math.abs(dy) * 2 ? (dx > 0 ? '東' : '西') : Math.abs(dy) > Math.abs(dx) * 2 ? (dy > 0 ? '南' : '北') : (dy > 0 ? '南' : '北') + (dx > 0 ? '東' : '西');
    return `石板的紋路指向${town.name}的${dir}方……`;
  },
  // 火箭隊秘密基地：手下 ×3 → 坂木
  async rocket(lm) {
    const s = G.state;
    if (s.flags.rocket_done) { await UI.say('秘密基地已經人去樓空了。'); return; }
    if ((s.badges.kanto || []).length < 3) { await UI.say('入口站著穿黑衣服的人。「小鬼，滾一邊去！」\n（好像需要更多實力才進得去，至少 3 枚關都徽章）'); return; }
    const L = World.gymLevel(World.towns.find(t => t.region === 'kanto' && t.gym === 0));
    await UI.say('「入侵者！給我拿下！」');
    const grunts = [[[19, 41], '火箭隊手下'], [[23, 109], '火箭隊手下'], [[41, 88, 20], '火箭隊手下']];
    for (let i = s.flags.rocket_n || 0; i < grunts.length; i++) {
      const [sps, title] = grunts[i];
      const party = sps.map(sp => Mon.create(World.evolveFor(sp, L), L));
      const r = await Game.battle({ trainer: { title, name: '', party, kind: 'trainer', money: 40, sprite: i === 1 ? 'rocketgruntf' : 'rocketgrunt', lose: '可惡……！' } });
      if (r !== 'win') return;
      s.flags.rocket_n = i + 1;
    }
    await UI.say('坂木：「沒想到有小鬼能闖到這裡……就讓我親自來對付你！」');
    const boss = [51, 34, 31, 115].map(sp => Mon.create(World.evolveFor(sp, L + 4), L + 4));
    boss.forEach(m => { m.item = null; });
    const r = await Game.battle({ trainer: { title: '火箭隊首領', name: '坂木', party: boss, kind: 'gym', money: 120, items: 2, sprite: 'giovanni', lose: '……我會記住你的。' } });
    if (r !== 'win') return;
    s.flags.rocket_done = 1; s.flags['lm_' + lm.id] = 1;
    Game.giveItem('silph-scope', 1);
    Sound.sfx('item');
    await UI.say('坂木留下了一個奇怪的道具就逃走了。\n獲得了西爾佛檢視鏡！');
    await UI.say('（聽說金黃市附近的寶可夢塔出現了幽靈……）');
    Game.save(true);
  },
  // 寶可夢塔：需要西爾佛檢視鏡
  async tower(lm) {
    const s = G.state;
    if (s.flags.tower_done) { await UI.say('寶可夢塔恢復了寧靜。富士老人在這裡為寶可夢們祈禱。'); return; }
    await UI.say('寶可夢塔是供奉寶可夢的地方。塔裡瀰漫著冰冷的空氣……');
    if (!s.bag['silph-scope']) { await UI.say('「走……開……」\n一個看不清楚的幽靈擋住了去路！嚇得只能退了出來。\n（需要能看穿幽靈的道具）'); return; }
    await UI.say('戴上了西爾佛檢視鏡！\n幽靈的真面目是……嘎啦嘎啦！');
    const L = Math.max(30, Math.round(World.levelAt(lm.x, lm.y)) + 3);
    const r = await Game.battle({ wild: Mon.create(105, L), biome: 'cave' });
    if (r === 'lose') return;
    s.flags.tower_done = 1; s.flags['lm_' + lm.id] = 1;
    await UI.say('嘎啦嘎啦的靈魂平靜下來，消失在光芒之中……');
    await UI.say('富士老人：「謝謝你，孩子。這是我的一點心意。」');
    Game.giveItem('poke-flute', 1);
    Sound.sfx('item');
    await UI.say('獲得了寶可夢之笛！\n（聽說關都的道路上有睡著的寶可夢擋路……）');
    Game.save(true);
  },
  // 支線任務的進度（主選單「任務」）
  sideQuests(s) {
    if (s.region !== 'kanto' && !s.visited[World.towns.find(t => t.region === 'kanto').id]) return [];
    const out = [];
    out.push(s.flags.rocket_done ? '火箭隊：已擊退（獲得西爾佛檢視鏡）' : `火箭隊：玉虹市附近有可疑的秘密基地${(s.badges.kanto || []).length < 3 ? '（需要 3 枚關都徽章）' : ''}`);
    out.push(s.flags.tower_done ? '寶可夢塔：已安撫幽靈（獲得寶可夢之笛）' : '寶可夢塔：金黃市附近的塔裡出現了幽靈');
    const sn = [...(World.events || new Map()).values()].filter(e => e.kind === 'snorlax');
    if (sn.length) out.push(`卡比獸：${sn.filter(e => s.flags['ev_' + e.id]).length}／${sn.length} 隻已叫醒`);
    const got = s.bag['ancient-tablet'] || 0;
    out.push(got >= TABLETS ? '古代石板：已解讀（夢幻的所在已標示在地圖上）' : got ? `古代石板：${got}／${TABLETS}　${Story.tabletHint()}` : '古代石板：關都各地好像散落著奇怪的石板');
    return out;
  },
});

// 地標事件與任務摘要接上支線
const _storyLandmark = Story.landmark;
Story.landmark = async function (lm) {
  if (lm.event === 'rocket') { G.state.flags['seen_' + lm.id] = 1; await UI.say(`這裡是${lm.n}。`); return Story.rocket(lm); }
  if (lm.event === 'tower') { G.state.flags['seen_' + lm.id] = 1; await UI.say(`這裡是${lm.n}。`); return Story.tower(lm); }
  return _storyLandmark.call(this, lm);
};
const _questSummary = Story.questSummary;
Story.questSummary = function (s) {
  const side = Story.sideQuests(s);
  return _questSummary.call(this, s) + (side.length ? '\n' + side.map(x => '・' + x).join('\n') : '');
};

// 鯉魚王：每個地區初始城鎮的寶可夢中心正上方站著一隻，和牠說話就能對戰（等級是隊伍的平均等級），打幾次都可以
// 只放事件實體，不改變地形；舊存檔的世界也有
const _evGenerateK = World.generate;
World.generate = function (...a) {
  const r = _evGenerateK.apply(this, a);
  this.placeMagikarps();
  return r;
};
World.placeMagikarps = function () {
  this.events = this.events || new Map();
  for (const town of this.towns.filter(t => t.kind === 'home')) {
    const c = this.buildings.find(b => b.town === town && b.kind === 'center');
    if (!c) continue;
    // 寶可夢中心上緣的正中間；被占用或走不到時往兩旁找
    const mid = c.x + Math.floor(c.w / 2), y = c.y - 1;
    const cols = [mid, mid - 1, mid + 1, mid - 2, mid + 2].filter(x => x >= c.x && x < c.x + c.w);
    const ok = x => { const k = x + ',' + y; return this.passable(x, y) && this.tile(x, y) !== T.PATH && !this.events.has(k) && !this.trainers.has(k) && !this.doors.has(k)
      && !(this.legends && this.legends.has(k)) && !(this.landmarks && this.landmarks.has(k)); };
    const x = cols.find(x => ok(x) && this.detourExists(x, y)) ?? cols.find(ok);
    if (x === undefined) continue;
    this.events.set(x + ',' + y, { kind: 'magikarp', id: 'magikarp_' + town.region, x, y, sp: 129, region: town.region });
  }
};
const _eventAtK = World.eventAt;
World.eventAt = function (x, y) {
  const e = this.events && this.events.get(x + ',' + y);
  if (e && e.kind === 'magikarp') return e; // 不會因為打過就消失
  return _eventAtK.call(this, x, y);
};
const _eventEntityK = Story.eventEntity;
Story.eventEntity = async function (e) {
  if (e.kind !== 'magikarp') return _eventEntityK.call(this, e);
  if (!G.party.some(m => m.hp > 0)) { await UI.say('鯉魚王：「鯉魚～」\n（先讓寶可夢恢復精神再來吧！）'); return; }
  const wild = Game.trainingWild();
  const c = await UI.choose(['對戰', '不要'], { prompt: `鯉魚王：「鯉魚～鯉魚～」\n牠好像想和你比試一下！（Lv.${wild.lv}，隊伍的平均等級）` });
  UI.hideDialog();
  if (c !== 0) return;
  Sound.sfx('encounter');
  await Game.battle({ wild, biome: 'water' });
};
