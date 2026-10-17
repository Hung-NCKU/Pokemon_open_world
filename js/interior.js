// 室內地圖：寶可夢中心、友好商店、主角家、研究所、道館
// 地圖與碰撞取自綠寶石（tools/build_interiors.py → assets/gen3/interiors.js）。
// 主角在室內時，世界座標停在門口前一格，所以在室內存檔、讀檔會回到門口。
// 沒有室內素材時（或測試環境），進門仍是原本的選單。
import { ELITE_FOUR, G, Game, Interior, Sound, UI, define } from './core.js';
import { U, mulberry32 } from './util.js';
import { Telemetry } from './telemetry.js';
import { LEADERS, LEADER_SPRITES, REGIONS, TRAINER_BATTLE_SPRITES, TRAINER_CLASSES, TRAINER_NAMES, TYPES, typeEff } from './data.js';
import { Mon } from './mon.js';
import { TM } from './tm.js';
import { Gen3 } from './gen3.js';
import { Spr } from './sprites.js';
import { TILE, World } from './world.js';
import { TownEvents } from './town_events.js';
import { FieldMove } from './fieldmove.js';
define(Interior, (() => {
  const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  // 館主屬性 → 使用的綠寶石道館（沒有對應道館的屬性選相近的）
  const GYM_ROOM = {
    // 有素材的屬性用自己的道館（紫堇市：電、釜炎鎮：火）；沒有的用相近的
    rock: 'gym_rock', ground: 'gym_rock', steel: 'gym_electric', electric: 'gym_electric', fire: 'gym_fire',
    fighting: 'gym_fighting', dark: 'gym_fighting', ghost: 'gym_fighting', poison: 'gym_fighting', psychic: 'gym_fighting',
    flying: 'gym_flying', grass: 'gym_flying', bug: 'gym_flying', fairy: 'gym_flying', normal: 'gym_flying',
    water: 'gym_water', ice: 'gym_water', dragon: 'gym_water',
  };
  // 沒有綠寶石行走圖的館主：依屬性選一般人物
  const LEADER_LOOK = {
    rock: 'hiker', ground: 'expert_m', steel: 'man_1', electric: 'man_3', fire: 'expert_f', fighting: 'black_belt', dark: 'man_1',
    ghost: 'hex_maniac', poison: 'maniac', psychic: 'psychic_m', flying: 'camper', grass: 'picnicker', bug: 'bug_catcher',
    fairy: 'beauty', normal: 'lass', water: 'swimmer_f', ice: 'woman_2', dragon: 'expert_m',
  };
  // 一般居民的對話（遊戲提示）
  const TALK = {
    center: ['在寶可夢中心可以免費治療寶可夢，存檔也會記錄在這裡。', '右邊的電腦可以整理箱子裡的寶可夢。', '輸掉對戰的話，會回到最後治療過的寶可夢中心。',
      '旁邊的招式機器可以用寶可夢的素材做出招式學習器喔！', '按住 Space 可以用兩倍速移動和戰鬥。'],
    mart: ['徽章越多，商店賣的東西就越多。', '捕捉強大的寶可夢之前，先讓牠睡著或麻痺會比較容易。', '除蟲噴霧可以讓弱小的野生寶可夢不靠近。', '活力塊可以讓瀕死的寶可夢恢復。'],
    lab: ['博士最近在研究各地區寶可夢的生態。', '不同的地形會出現不同屬性的寶可夢。', '圖鑑上看過的寶可夢會記錄牠出現的地點。'],
  };
  let room = null; // { key, d, b, x, y, dir, npcs }

  // window.INTERIORS_FORCE：測試環境沒有載入圖片素材時也啟用室內地圖
  const can = b => !!(window.INTERIORS && (Gen3.on || window.INTERIORS_FORCE) && keyFor(b) && INTERIORS[keyFor(b)]);
  function keyFor(b) {
    if (b.kind === 'gym') {
      const lead = LEADERS[b.town.region] && LEADERS[b.town.region][b.town.gym];
      if (!lead) return null;
      const k = GYM_ROOM[lead[1]] || 'gym_rock';
      return INTERIORS[k] ? k : 'gym_rock'; // 舊版素材沒有這間道館時退回岩石道館
    }
    if (b.kind === 'league') return 'league';
    return ['center', 'mart', 'house', 'lab', 'house_s'].includes(b.kind) ? b.kind : null;
  }
  // 道館訓練家的類型：第一個擅長館主屬性的訓練家類型
  function gymTrainerClass(type) {
    const i = TRAINER_CLASSES.findIndex(c => c.types && c.types.includes(type));
    return i >= 0 ? i : 9;
  }

  // 進入前先下載房間的圖（背景、前景、人物），下載好才切換畫面：不會先看到黑畫面或原創圖的人物再變成綠寶石的圖
  const roomImages = (key, gfx) => {
    Gen3.ensure('int_' + key, `int_${key}.png`); Gen3.ensure('int_' + key + '_top', `int_${key}_top.png`);
    for (const g of gfx) Gen3.ensure('npc_' + g, `npc_${g}.png`);
    return ['int_' + key, 'int_' + key + '_top', ...gfx.map(g => 'npc_' + g)];
  };
  // 走進城鎮時，在背景先下載這座城鎮的建築內部（玩家走到門口時通常已經下載好了）
  function prefetch(town) {
    if (!window.INTERIORS || !Gen3.on) return;
    const go = () => {
      for (const b of World.buildings) {
        if (b.town !== town || !can(b)) continue;
        const key = keyFor(b);
        roomImages(key, INTERIORS[key].npcs.map(n => n.gfx).filter(Boolean));
      }
    };
    (window.requestIdleCallback || (f => setTimeout(f, 200)))(go);
  }
  async function enter(b) {
    const key = keyFor(b), d = INTERIORS[key];
    const t = b.town;
    const lead = b.kind === 'gym' ? LEADERS[t.region][t.gym] : null;
    const npcs = d.npcs.map((n, i) => ({ ...n, i })).filter(n => !(n.role === 'mom' && t.region !== G.state.region) && !(/^ev\d$/.test(n.role) && !(b.ev || [])[+n.role[2]]));
    for (const n of npcs) {
      if (n.role === 'leader') {
        const own = (LEADER_SPRITES[t.region] || [])[t.gym];
        n.gfx = own && (INTERIORS._leaders || []).includes(own) ? 'leader_' + own : LEADER_LOOK[lead[1]] || 'man_1';
      }
      // 小屋：兩個位置的人由城鎮配置的事件決定
      if (/^ev\d$/.test(n.role)) { n.ev = (b.ev || [])[+n.role[2]]; if (n.ev && TownEvents.DEF[n.ev]) n.gfx = TownEvents.DEF[n.ev].gfx; }
      if (n.role === 'gymTrainer') { n.cls = gymTrainerClass(lead[1]); n.gfx = ((window.GEN3 && GEN3.trainers) || [])[n.cls] || n.gfx; }
    }
    Sound.sfx('door');
    await Gen3.whenLoaded(roomImages(key, npcs.map(n => n.gfx)));
    const [ex, ey] = d.exits[0];
    room = { key, d, b, x: ex, y: ey, dir: 'up', npcs };
    G.room = room;
    Game.updateMusic(true);
    G.move = null;
    Telemetry.event('進入建築', { kind: b.kind, town: t.name });
  }
  // 洞窟解謎：從地標進入，推開石頭走到終點（每次進入石頭都會回到原位）
  const canCave = key => !!(window.INTERIORS && (Gen3.on || window.INTERIORS_FORCE) && INTERIORS[key] && INTERIORS[key].goal);
  async function enterCave(lm, key, onGoal) {
    const d = INTERIORS[key];
    Sound.sfx('door');
    await Gen3.whenLoaded(roomImages(key, ['boulder']));
    const [ex, ey] = d.exits[0];
    room = { key, d, b: { kind: 'cave', town: null, door: { x: lm.x, y: lm.y }, lm }, x: ex, y: ey, dir: 'up', npcs: [],
      boulders: d.boulders.map(([x, y]) => ({ x, y })), onGoal };
    G.room = room; G.move = null; Game.updateMusic(true);
    Telemetry.event('進入洞窟', { lm: lm.id });
  }
  // 怪力：會怪力的寶可夢優先，其次格鬥屬性，再其次攻擊最高的（不會因為沒有秘傳招式而卡住）
  async function useStrength() {
    const alive = G.party.filter(m => m.hp > 0);
    const m = alive.find(x => x.moves.some(s => s.id === 70)) || alive.find(x => Mon.types(x).includes('fighting'))
      || alive.reduce((a, x) => (Mon.stats(x)[1] > Mon.stats(a)[1] ? x : a), alive[0]);
    if (!m) return;
    const c = await UI.choose(['是', '否'], { prompt: `大石頭擋住了去路……\n要讓 ${Mon.name(m)} 使用怪力嗎？` });
    UI.hideDialog();
    if (c !== 0) return;
    await UI.say(`${Mon.name(m)} 使用了怪力！`, { auto: 700 });
    UI.hideDialog();
    await FieldMove.strength(m);
    room.strength = true;
    await UI.say('現在可以推動大石頭了！', { auto: 900 });
  }
  const boulderAt = (x, y) => room.boulders && room.boulders.find(b => b.x === x && b.y === y);
  // 推石頭：後面那一格要是空地（不能推進牆、其他石頭、出入口）
  function push(bd, dx, dy) {
    const tx = bd.x + dx, ty = bd.y + dy, d = room.d;
    if (!walkable(tx, ty) || isExit(tx, ty) || (d.goal && d.goal[0] === tx && d.goal[1] === ty)) return false;
    bd.x = tx; bd.y = ty;
    Sound.sfx('select');
    return true;
  }

  // 寶可夢中心的治療機器：照綠寶石 src/field_effect.c 的 FldEff_PokecenterHeal（以 60 格／秒計時）
  //   精靈球：每 25 格放一顆（SE_BALL），位置＝(93,36) 起、偏移 (0,0)(6,0)(0,4)(6,4)(0,8)(6,8)，8×8 置中
  //   放完 32 格後播放治療音樂、牆上的螢幕開始閃（16 格換一次，共 8 次）
  //   球閃光：Flash1 每 8 格換相位、繞 3 圈（96 格），Flash2 再 3 個相位（24 格），停 30 格後球消失，等音樂結束
  //   座標是主角站在櫃台前（第 7 欄第 4 列）時的畫面座標：主角那一格的左上角在畫面 (112,72)，所以地圖像素＝畫面座標 − (0,8)（GBA 1 像素＝畫布 3 像素）
  const HEAL_BALL = [[0, 0], [6, 0], [0, 4], [6, 4], [0, 8], [6, 8]];
  const healTimeline = n => {
    const place = 25 * (n - 1), jingle = place + 32, flash1 = jingle, flash2 = flash1 + 96, gone = flash2 + 24 + 30;
    return { place, jingle, flash1, flash2, gone, monitorEnd: jingle + 128 };
  };
  async function healAnim(n, playJingle) {
    if (!room) return playJingle();
    n = Math.max(1, Math.min(6, n));
    const nurse = room.npcs.find(x => x.role === 'nurse');
    if (nurse) nurse.dir = 'left';
    Gen3.ensure('fx_heal_ball', 'fx_heal_ball.png'); Gen3.ensure('fx_heal_monitor', 'fx_heal_monitor.png');
    const tl = healTimeline(n);
    const fps = () => (G.fast ? 120 : 60);
    room.healing = { n, f: 0 };
    const wait = frames => new Promise(r => setTimeout(r, frames * 1000 / fps()));
    // 放球（每 25 格一顆）
    for (let i = 0; i < n; i++) {
      room.healing.f = i * 25;
      Sound.sfx('ball_shake');
      if (i < n - 1) await wait(25);
    }
    await wait(32);
    // 音樂開始：之後的動畫以時間推進，直到球消失、音樂結束
    const t0 = performance.now(), f0 = tl.jingle;
    let live = true;
    const tick = () => { if (!live || !room || !room.healing) return; room.healing.f = f0 + (performance.now() - t0) * fps() / 1000; requestAnimationFrame(tick); };
    room.healing.f = f0;
    requestAnimationFrame(tick);
    await Promise.all([playJingle(), wait(tl.gone - tl.jingle)]);
    live = false;
    if (room) { room.healing = null; if (nurse) nurse.dir = 'down'; }
  }
  function drawHeal(g, ox, oy) {
    const h = room.healing, S = TILE / 16, tl = healTimeline(h.n), f = h.f;
    const ball = Gen3.ensure('fx_heal_ball', 'fx_heal_ball.png'), mon = Gen3.ensure('fx_heal_monitor', 'fx_heal_monitor.png');
    // 牆上的螢幕
    if (f >= tl.jingle && f < tl.monitorEnd && mon.naturalWidth) {
      const k = Math.floor((f - tl.jingle) / 16) % 2;
      g.drawImage(mon, k * 24, 0, 24, 16, (124 - 12) * S - ox, (24 - 8 - 8) * S - oy, 24 * S, 16 * S);
    }
    if (f >= tl.gone) return;
    // 球的閃光相位：Flash1 第 0～3 格、Flash2 第 4～7 格；還沒閃時用原本的樣子（第 7 格＝不混白色）
    let fr = 7;
    if (f >= tl.flash1 && f < tl.flash2) fr = Math.floor((f - tl.flash1) / 8) % 4;
    else if (f >= tl.flash2) fr = 4 + Math.min(3, Math.floor((f - tl.flash2) / 8));
    const placed = Math.min(h.n, Math.floor(f / 25) + 1);
    for (let i = 0; i < placed; i++) {
      const x = (93 + HEAL_BALL[i][0] - 4) * S - ox, y = (36 + HEAL_BALL[i][1] - 4 - 8) * S - oy;
      if (ball.naturalWidth) g.drawImage(ball, fr * 8, 0, 8, 8, x, y, 8 * S, 8 * S);
      else { g.fillStyle = '#e83030'; g.beginPath(); g.arc(x + 4 * S, y + 4 * S, 3.5 * S, 0, Math.PI * 2); g.fill(); }
    }
  }

  function exit() {
    if (!room) return;
    const b = room.b;
    room = null; G.room = null; G.move = null;
    G.state.x = b.door.x; G.state.y = b.door.y + 1; G.state.dir = 'down';
    Sound.sfx('door');
    Game.updateMusic(true);
  }
  // 從別處傳送（輸掉對戰回到中心等）時離開室內，不移動主角
  function leave() { room = null; G.room = null; }

  const npcAt = (x, y) => room.npcs.find(n => n.x === x && n.y === y);
  // 聯盟的四天王、冠軍房間：進去之後門會關上，打完之前不能回頭（和原作一樣）
  const isExit = (x, y) => !room.noBack && room.d.exits.some(([a, b]) => a === x && b === y);
  const isGoal = (x, y) => (room.d.goals || []).some(([a, b]) => a === x && b === y);

  // ---------- 寶可夢聯盟：大廳 → 四天王 ×4 → 冠軍 ----------
  const CHAMP_LOOK = { hoenn: 'wallace' };
  async function goRoom(key, e4) {
    const d = INTERIORS[key], b = room.b, t = b.town;
    const npcs = d.npcs.map((n, i) => ({ ...n, i }));
    for (const n of npcs) {
      if (n.role === 'elite') {
        const e = ELITE_FOUR[t.region] && ELITE_FOUR[t.region][e4];
        if (t.region !== 'hoenn' && e) n.gfx = LEADER_LOOK[e.type] || 'expert_m';
      }
      if (n.role === 'champion' && t.region !== 'hoenn') n.gfx = CHAMP_LOOK[t.region] || 'expert_m';
    }
    Sound.sfx('door');
    await Gen3.whenLoaded(roomImages(key, npcs.map(n => n.gfx)));
    const [ex, ey] = d.exits[0];
    room = { key, d, b, x: ex, y: ey, dir: 'up', npcs, e4, noBack: true, cleared: false };
    G.room = room; G.move = null; Game.updateMusic(true);
    Telemetry.event('聯盟房間', { key });
  }
  // 往前的門：大廳需要 8 枚徽章並確認；四天王與冠軍的房間要先打贏
  async function tryGoal(tx, ty) {
    const t = room.b.town, reg = REGIONS[t.region];
    if (room.key === 'league') {
      if (Game.badgeCount(t.region) < 8) { await UI.say(`警衛：「要挑戰${reg.n}寶可夢聯盟，必須收集${reg.n}地區的 8 枚徽章。」\n（目前 ${Game.badgeCount(t.region)}／8）`); return; }
      const e4 = ELITE_FOUR[t.region] || [];
      const c = await UI.choose(['前進', '還不要'], { prompt: `前面是${e4[0] && e4[0].title ? e4[0].title : '四天王'}的房間。\n進去之後，打完之前就不能回頭了。要前進嗎？` });
      UI.hideDialog();
      if (c !== 0) return;
      return goRoom(e4.length ? 'league_e0' : 'league_champ', 0);
    }
    if (!room.cleared) { await UI.say('前面的門關著……先打贏這個房間的訓練家吧。'); return; }
    if (room.key === 'league_champ') { exit(); return; }
    const n = room.e4 + 1;
    return goRoom(n < 4 && INTERIORS['league_e' + n] ? 'league_e' + n : 'league_champ', n);
  }
  async function leagueTalk(n) {
    const t = room.b.town;
    if (n.role === 'guard') {
      return UI.say(Game.badgeCount(t.region) < 8 ? `警衛：「只有收集了 8 枚${REGIONS[t.region].n}徽章的訓練家才能前進。」` : '警衛：「四天王在後面等著你。祝你好運！」');
    }
    if (room.cleared) return UI.say(n.role === 'champion' ? '「你是真正的冠軍。」' : '「前進吧，前面的門已經打開了。」');
    if (n.role === 'elite') {
      const r = await Game.eliteBattle(t, room.e4);
      if (r === 'win' && G.room === room) { room.cleared = true; Sound.sfx('door'); await UI.say('後面的門打開了！'); }
      return;
    }
    if (n.role === 'champion') {
      const r = await Game.championBattle(t);
      if (r === 'win' && G.room === room) { room.cleared = true; exit(); }
    }
  }
  function walkable(x, y) {
    const d = room.d;
    if (x < 0 || y < 0 || x >= d.w || y >= d.h) return false;
    return d.coll[y * d.w + x] === '0' && !npcAt(x, y) && !boulderAt(x, y);
  }

  function update(dt) {
    if (G.move) {
      G.move.t += G.fast ? dt * 2 : dt;
      if (G.move.t >= G.move.dur) {
        room.x = G.move.tx; room.y = G.move.ty;
        G.move = null;
        G.stepAnim = (G.stepAnim % 2) + 1;
        if (room.dir === 'down' && isExit(room.x, room.y)) exit();
        else if (room.d.goal && room.x === room.d.goal[0] && room.y === room.d.goal[1]) {
          const cb = room.onGoal;
          Game.flow(async () => { if (cb) await cb(); exit(); });
        }
      }
      return;
    }
    const dirKey = [['ArrowUp', 'w', 'up'], ['ArrowDown', 's', 'down'], ['ArrowLeft', 'a', 'left'], ['ArrowRight', 'd', 'right']]
      .find(([a, b]) => G.keys.has(a) || G.keys.has(b) || G.keys.has(b.toUpperCase()));
    const dir = dirKey ? dirKey[2] : G.touchDir;
    if (!dir) return;
    room.dir = dir;
    const [dx, dy] = DIR[dir];
    const tx = room.x + dx, ty = room.y + dy;
    // 站在出口往下走：離開建築
    if (dir === 'down' && isExit(room.x, room.y) && !walkable(tx, ty)) { exit(); G.keys.clear(); return; }
    // 往前的門：條件不符時不讓走上去
    if (isGoal(tx, ty) && room.d.goals) { G.keys.clear(); Game.flow(() => tryGoal(tx, ty)); return; }
    if (!walkable(tx, ty)) {
      // 推石頭：主角不動，石頭往前一格（推一次要等一下）
      const bd = boulderAt(tx, ty);
      // 每次進洞窟第一次推石頭：先使用怪力（演出）
      if (bd && !room.strength) { G.keys.clear(); Game.flow(() => useStrength()); return; }
      if (bd && push(bd, dx, dy)) G.move = { fx: room.x, fy: room.y, tx: room.x, ty: room.y, t: 0, dur: 220, room: true };
      return;
    }
    const run = G.keys.has('Shift');
    G.move = { fx: room.x, fy: room.y, tx, ty, t: 0, dur: run ? 85 : 160, room: true };
  }

  function render(g, cv) {
    const d = room.d;
    let px = room.x * TILE, py = room.y * TILE;
    if (G.move) {
      const k = G.move.t / G.move.dur;
      px = (G.move.fx + (G.move.tx - G.move.fx) * k) * TILE;
      py = (G.move.fy + (G.move.ty - G.move.fy) * k) * TILE;
    }
    // 鏡頭跟著主角；房間比畫面小時置中
    const W = d.w * TILE, H = d.h * TILE;
    const cam = (p, size, view) => (size <= view ? (size - view) / 2 : U.clamp(p + TILE / 2 - view / 2, 0, size - view));
    const ox = Math.round(cam(px, W, cv.width)), oy = Math.round(cam(py, H, cv.height));
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
    const bg = Gen3.ensure('int_' + room.key, `int_${room.key}.png`);
    if (bg.naturalWidth) g.drawImage(bg, -ox, -oy, W, H);
    const people = room.npcs.map(n => ({ y: n.y * TILE, n }));
    for (const bd of room.boulders || []) people.push({ y: bd.y * TILE, n: { x: bd.x, y: bd.y, dir: 'down', gfx: 'boulder', i: 0 } });
    people.push({ y: py, player: true });
    people.sort((a, b) => a.y - b.y);
    const walking = G.move ? (G.move.t / G.move.dur < .5 ? G.stepAnim : 0) : 0;
    for (const p of people) {
      if (p.player) {
        const sheet = G.keys.has('Shift') && G.move ? 'player_run' : 'player_walk';
        World.drawPerson(g, px - ox, py - oy, room.dir, { pal: Spr.PLAYER, sheet }, walking, {});
      } else {
        const n = p.n;
        World.drawPerson(g, n.x * TILE - ox, n.y * TILE - oy, n.dir, { pal: Spr.trainerPal(n.cls || 0, n.i % 5), sheet: 'npc_' + n.gfx }, 0);
      }
    }
    // 治療機器上的精靈球與牆上的螢幕
    if (room.healing) drawHeal(g, ox, oy);
    const top = Gen3.ensure('int_' + room.key + '_top', `int_${room.key}_top.png`);
    if (top.naturalWidth) g.drawImage(top, -ox, -oy, W, H);
  }

  // 面對的人物（隔著櫃台也可以說話）
  async function interact() {
    const [dx, dy] = DIR[room.dir];
    const fx = room.x + dx, fy = room.y + dy;
    let n = npcAt(fx, fy);
    const counter = room.d.counter.some(([a, b]) => a === fx && b === fy);
    if (!n && counter) n = npcAt(fx + dx, fy + dy);
    if (n) { n.dir = OPP[room.dir]; return talk(n); }
    if (room.d.pc.some(([a, b]) => a === fx && b === fy)) { Sound.sfx('select'); return Game.pcMenu(); }
  }

  async function talk(n) {
    const b = room.b, t = b.town;
    if (['guard', 'elite', 'champion'].includes(n.role)) return leagueTalk(n);
    if (n.role === 'nurse') return Game.centerHeal(b);
    if (n.role === 'tm') {
      const k = await UI.choose(['製作招式學習器', '查看素材', '取消'], { prompt: '研究員：「這是招式機器。可以用寶可夢的素材製作招式學習器。」' });
      if (k === 0) await TM.machine();
      if (k === 1) await TM.materials();
      return;
    }
    if (n.role === 'clerk') return Game.shopMenu();
    if (n.role === 'mom') return Game.momTalk();
    if (n.role === 'prof') return Game.labTalk(t);
    if (n.role === 'leader') return Game.gymChallenge(t);
    if (n.role === 'guide') return guide(t);
    if (n.role === 'gymTrainer') return gymTrainer(n, t);
    if (n.ev) return TownEvents.run(n.ev, t);
    const lines = TALK[b.kind] || TALK.center;
    return UI.say(lines[(n.i + t.id) % lines.length]);
  }

  // 道館嚮導：館主的屬性與相剋建議
  async function guide(t) {
    const [name, type] = LEADERS[t.region][t.gym];
    const strong = Object.keys(TYPES).filter(a => typeEff(a, [type]) > 1).map(a => TYPES[a].n);
    const got = (G.state.badges[t.region] || []).includes(t.gym);
    await UI.say(got ? `嚮導：「喔！你已經拿到${t.name}道館的徽章了，真厲害！」`
      : `嚮導：「嗨，挑戰者！這座道館的館主${name}擅長${TYPES[type].n}屬性。\n帶${strong.join('、') || '各種'}屬性的寶可夢去會比較有利喔！（館主約 Lv.${World.gymLevel(t)}）」`);
  }

  // 道館訓練家：每人只對戰一次，隊伍是館主屬性的寶可夢
  async function gymTrainer(n, t) {
    const key = `gym_${t.id}_${n.i}`;
    const cls = TRAINER_CLASSES[n.cls];
    const [, type] = LEADERS[t.region][t.gym];
    const name = TRAINER_NAMES[(t.id * 7 + n.i * 3) % TRAINER_NAMES.length];
    if (G.state.defeated[key]) return UI.say(`${cls.n} ${name}：「館主比我強多了，加油吧！」`);
    await UI.say(`${cls.n} ${name}：「想挑戰館主，要先過我這一關！」`);
    const rnd = mulberry32(World.seed + t.id * 131 + n.i * 17);
    const lv = Math.max(3, World.gymLevel(t) - 5);
    const count = lv >= 30 ? 3 : 2;
    const party = [];
    for (let i = 0; i < count; i++) party.push(Mon.create(World.pickForLevel(rnd, lv - (count - 1 - i), { types: [type], gen: REGIONS[t.region].gen }), lv - (count - 1 - i)));
    const r = await Game.battle({ trainer: { title: cls.n, name, party, kind: 'trainer', money: 60, sprite: TRAINER_BATTLE_SPRITES[n.cls], lose: '……不愧是挑戰者！' }, biome: 'gym' });
    if (r === 'win') G.state.defeated[key] = 1;
  }

  return { goRoom, tryGoal, prefetch, healAnim, can, canCave, enterCave, boulderAt, enter, exit, leave, update, render, interact, keyFor, get room() { return room; }, walkable: (x, y) => room && walkable(x, y) };
})());
