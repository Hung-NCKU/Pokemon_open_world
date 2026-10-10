// 室內地圖：寶可夢中心、友好商店、主角家、研究所、道館
// 地圖與碰撞取自綠寶石（tools/build_interiors.py → assets/gen3/interiors.js）。
// 主角在室內時，世界座標停在門口前一格，所以在室內存檔、讀檔會回到門口。
// 沒有室內素材時（或測試環境），進門仍是原本的選單。
const Interior = (() => {
  const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  // 館主屬性 → 使用的綠寶石道館（沒有對應道館的屬性選相近的）
  const GYM_ROOM = {
    rock: 'gym_rock', ground: 'gym_rock', steel: 'gym_rock', electric: 'gym_rock', fire: 'gym_rock',
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
      return lead ? GYM_ROOM[lead[1]] || 'gym_rock' : null;
    }
    return ['center', 'mart', 'house', 'lab', 'house_s'].includes(b.kind) ? b.kind : null;
  }
  // 道館訓練家的類型：第一個擅長館主屬性的訓練家類型
  function gymTrainerClass(type) {
    const i = TRAINER_CLASSES.findIndex(c => c.types && c.types.includes(type));
    return i >= 0 ? i : 9;
  }

  function enter(b) {
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
    const [ex, ey] = d.exits[0];
    room = { key, d, b, x: ex, y: ey, dir: 'up', npcs };
    G.room = room;
    G.move = null;
    Gen3.ensure('int_' + key, `int_${key}.png`); Gen3.ensure('int_' + key + '_top', `int_${key}_top.png`);
    for (const n of npcs) Gen3.ensure('npc_' + n.gfx, `npc_${n.gfx}.png`);
    Sound.sfx('door');
    Telemetry.event('進入建築', { kind: b.kind, town: t.name });
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
  const isExit = (x, y) => room.d.exits.some(([a, b]) => a === x && b === y);
  function walkable(x, y) {
    const d = room.d;
    if (x < 0 || y < 0 || x >= d.w || y >= d.h) return false;
    return d.coll[y * d.w + x] === '0' && !npcAt(x, y);
  }

  function update(dt) {
    if (G.move) {
      G.move.t += G.fast ? dt * 2 : dt;
      if (G.move.t >= G.move.dur) {
        room.x = G.move.tx; room.y = G.move.ty;
        G.move = null;
        G.stepAnim = (G.stepAnim % 2) + 1;
        if (room.dir === 'down' && isExit(room.x, room.y)) exit();
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
    if (!walkable(tx, ty)) return;
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

  return { can, enter, exit, leave, update, render, interact, keyFor, get room() { return room; }, walkable: (x, y) => room && walkable(x, y) };
})();
