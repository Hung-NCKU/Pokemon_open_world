// 野生寶可夢的地圖實體：草叢附近會出現看得到的寶可夢
// - 行為依物種（Wild.of）：
//   passive 閒晃、curious 好奇（看到玩家會靠近）、timid 膽小（逃跑，被逼近時可能消失）、
//   aggressive 兇猛（6 格內衝過來，等級 +2）、pack 成群（2～3 隻一起出現、跟著帶頭的移動）、
//   nocturnal 夜行（只在晚上出現）、stationary 定點（睡在原地不動，靠近也不會醒）
// - 碰到就開始戰鬥；離開太遠會消失；使用除蟲噴霧時不會出現
// - 圖示：No.1–386 用綠寶石的圖示（2 格動畫），其他用第七世代圖示
// 物種的習性：先看代表性物種的表，其他依屬性與種族值推定
const Wild = (() => {
  const TABLE = {
    stationary: [143, 185, 213, 79, 74, 95, 111, 76, 446, 531, 324, 338, 337, 299, 476, 524, 557, 688, 703, 771, 194, 590, 591, 836, 833],
    aggressive: [56, 57, 23, 24, 32, 33, 29, 30, 128, 130, 127, 214, 66, 67, 236, 237, 296, 297, 261, 262, 403, 404, 447, 448, 551, 552, 559, 560, 624, 625, 674, 675, 759, 760, 827, 828],
    timid: [63, 64, 133, 175, 183, 187, 216, 228, 280, 300, 311, 312, 427, 417, 506, 572, 659, 661, 722, 734, 819, 921],
    pack: [21, 41, 16, 19, 13, 10, 84, 179, 194, 263, 265, 278, 396, 401, 415, 504, 506, 519, 543, 659, 734, 742, 819, 821, 831, 915, 917],
    nocturnal: [92, 93, 163, 164, 198, 200, 197, 215, 228, 302, 353, 355, 425, 429, 430, 434, 442, 491, 509, 570, 607, 708, 710, 734, 778],
  };
  const byId = new Map();
  for (const [k, ids] of Object.entries(TABLE)) for (const id of ids) if (!byId.has(id)) byId.set(id, k);
  const cache = new Map();
  function of(sp) {
    if (cache.has(sp)) return cache.get(sp);
    let k = byId.get(sp);
    const d = POKEDEX[sp];
    if (!k && d) {
      const [, atk, , , , spe] = d.s, t = d.t, bst = d.s.reduce((a, b) => a + b, 0);
      if (t.includes('ghost') || (t.includes('dark') && spe >= 60)) k = 'nocturnal';
      else if (spe <= 30 || d.w >= 2000) k = 'stationary';
      else if (t.includes('fighting') || t.includes('dragon') || (atk >= 100 && atk > d.s[3] + 20)) k = 'aggressive';
      else if (t.includes('bug') && bst < 320) k = 'pack';
      else if (spe >= 90 && bst < 480) k = 'timid';
      else k = sp % 2 ? 'curious' : 'passive';
    }
    k = k || 'passive';
    cache.set(sp, k);
    return k;
  }
  const ZH = { passive: '悠閒', curious: '好奇', timid: '膽小', aggressive: '兇猛', pack: '成群', nocturnal: '夜行', stationary: '定點（睡在原地）' };
  return { of, ZH, TABLE };
})();

const OverworldMons = (() => {
  const MAX = 4, NEAR = 11, FAR = 16;
  const SPAWN_TILES = new Set([T.TALL, T.SNOWTALL]);
  let list = [], lastSpawn = 0, lastStep = 0;
  const imgCache = new Map();

  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const at = (x, y) => list.find(w => w.x === x && w.y === y);
  const canStand = (w, x, y) => {
    if (!World.inside(x, y) || at(x, y) || World.trainers.has(x + ',' + y) || World.doors.has(x + ',' + y)) return false;
    if (World.legendAt && World.legendAt(x, y)) return false;
    const t = World.tile(x, y);
    if (BLOCKED.has(t) || t === T.DOOR || t === T.TOWN || t === T.PATH) return false; // 不進城鎮與道路
    if (t === T.WATER || t === T.DEEP) return false;
    return true;
  };

  function spawn(now) {
    const s = G.state;
    if (s.repel || list.length >= MAX || now - lastSpawn < 1500) return;
    lastSpawn = now;
    for (let tries = 0; tries < 20; tries++) {
      const x = s.x + U.ri(-NEAR, NEAR), y = s.y + U.ri(-7, 7);
      if (Math.abs(x - s.x) + Math.abs(y - s.y) < 4) continue;
      const t = World.tile(x, y);
      if (!SPAWN_TILES.has(t) || !canStand(null, x, y)) continue;
      const biome = t === T.TALL ? 'tall' : 'snow';
      let mon = World.rollWild(x, y, biome);
      // 夜行性的只在晚上出現（白天重抽一次）
      if (Wild.of(mon.sp) === 'nocturnal' && !U.isNight()) mon = World.rollWild(x, y, biome);
      if (Wild.of(mon.sp) === 'nocturnal' && !U.isNight()) continue;
      const mood = Wild.of(mon.sp);
      if (mood === 'aggressive') { mon.lv = Math.min(100, mon.lv + 2); mon.exp = Mon.expFor(POKEDEX[mon.sp].gr, mon.lv); mon.hp = Mon.maxHp(mon); }
      const lead = { x, y, px: x, py: y, t: 0, mon, mood, dir: 'down', biome, seen: false };
      list.push(lead);
      // 成群：同種的 1～2 隻在旁邊
      if (mood === 'pack') {
        const n = 1 + (U.rand() < .5 ? 1 : 0);
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]].slice(0, 4)) {
          if (list.filter(w => w.leader === lead).length >= n || list.length >= MAX + 2) break;
          const nx = x + dx, ny = y + dy;
          if (!SPAWN_TILES.has(World.tile(nx, ny)) || !canStand(null, nx, ny)) continue;
          list.push({ x: nx, y: ny, px: nx, py: ny, t: 0, mon: Mon.create(mon.sp, Math.max(2, mon.lv - U.ri(0, 2))), mood, dir: 'down', biome, seen: false, leader: lead });
        }
      }
      return;
    }
  }

  // 每 0.4 秒（膽小的逃跑時 0.25 秒、兇猛的衝過來時 0.2 秒）走一步
  function step(now) {
    const s = G.state, p = { x: s.x, y: s.y };
    for (const w of [...list]) {
      const d = dist(w, p);
      if (w.mood === 'stationary') continue;                       // 睡在原地
      const fleeing = (w.mood === 'timid' || w.mood === 'shy') && d <= 4;
      const charging = w.mood === 'aggressive' && d <= 6;
      if (now - w.t < (charging ? 200 : fleeing ? 250 : 420)) continue;
      w.t = now;
      // 膽小的被逼到 2 格內：有三成機率逃走消失
      if (fleeing && d <= 2 && U.rand() < .3) { list = list.filter(x => x !== w); continue; }
      let dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      // 成群：跟著帶頭的走（帶頭的消失就自己行動）
      if (w.leader && list.includes(w.leader) && dist(w, w.leader) > 1) {
        dirs.sort((a, b) => dist({ x: w.x + a[0], y: w.y + a[1] }, w.leader) - dist({ x: w.x + b[0], y: w.y + b[1] }, w.leader));
        dirs = dirs.slice(0, 2);
      } else if (charging) {
        w.seen = true;
        dirs.sort((a, b) => dist({ x: w.x + a[0], y: w.y + a[1] }, p) - dist({ x: w.x + b[0], y: w.y + b[1] }, p));
        dirs = dirs.slice(0, 2);
      } else if (w.mood === 'curious' && d <= 5) {
        w.seen = true;
        dirs.sort((a, b) => dist({ x: w.x + a[0], y: w.y + a[1] }, p) - dist({ x: w.x + b[0], y: w.y + b[1] }, p));
        dirs = dirs.slice(0, 2);
      } else if (fleeing) {
        w.seen = true;
        dirs.sort((a, b) => dist({ x: w.x + b[0], y: w.y + b[1] }, p) - dist({ x: w.x + a[0], y: w.y + a[1] }, p));
        dirs = dirs.slice(0, 2);
      } else if (U.rand() < .55) continue; // 閒晃：常常停下來
      else dirs = [U.pick(dirs)];
      for (const [dx, dy] of dirs) {
        const nx = w.x + dx, ny = w.y + dy;
        if (nx === s.x && ny === s.y) { touch(w); return; }
        if (!canStand(w, nx, ny)) continue;
        w.px = w.x; w.py = w.y; w.x = nx; w.y = ny; w.moved = now;
        w.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
        break;
      }
    }
    // 太遠的消失
    list = list.filter(w => dist(w, p) <= FAR);
  }

  // 碰到：開始戰鬥（戰鬥結束後從地圖上消失）
  function touch(w) {
    if (G.busy) return;
    list = list.filter(x => x !== w);
    G.keys.clear();
    Game.flow(async () => {
      Sound.sfx('encounter');
      if (w.mood === 'aggressive') await UI.say(`野生的 ${Mon.name(w.mon)} 衝了過來！`, { auto: 900 });
      if (w.mood === 'stationary') await UI.say(`${Mon.name(w.mon)} 被吵醒了！`, { auto: 900 });
      // 成群：同伴嚇得四散
      list = list.filter(x => x.leader !== w && x !== w.leader);
      G.flash = 1;
      await U.sleep(450);
      G.flash = 0;
      await Game.battle({ wild: w.mon, biome: w.biome });
    });
  }

  function update(now) {
    if (G.mode !== 'world' || G.busy || UI.active()) return;
    spawn(now);
    if (now - lastStep > 60) { lastStep = now; step(now); }
  }

  function icon(sp) {
    if (imgCache.has(sp)) return imgCache.get(sp);
    const n = Gen3.on && GEN3.ui && GEN3.ui.icons || 0;
    let e;
    if (typeof sp === 'string') { const img = new Image(); img.crossOrigin = 'anonymous'; img.src = Mon.sprite(+sp.slice(1)); e = { img }; }
    else if (sp <= n) e = { sheet: true };
    else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sp <= 807 ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${sp}.png` : Mon.sprite(sp);
      e = { img };
    }
    imgCache.set(sp, e);
    return e;
  }
  let sheet = null;
  // 繪製（由 Game.render 依 y 座標排序呼叫）；ox, oy 為畫面左上角的世界像素座標
  function draw(g, w, ox, oy) {
    const k = U.clamp((performance.now() - (w.moved || 0)) / 300, 0, 1);
    const x = (w.px + (w.x - w.px) * k) * TILE - ox, y = (w.py + (w.y - w.py) * k) * TILE - oy;
    drawIcon(g, w.mon.sp, x, y, Forms.get(w.mon) ? Forms.get(w.mon).id : null);
    if (w.seen && (w.mood === 'curious' || w.mood === 'aggressive')) { g.fillStyle = w.mood === 'aggressive' ? '#f84838' : '#f8f8f8'; g.font = 'bold 22px sans-serif'; g.fillText('!', x + TILE / 2 - 3, y - 10); }
    if (w.mood === 'stationary') { g.fillStyle = '#f8f8f8'; g.font = 'bold 16px sans-serif'; const z = (G.frame >> 5) % 3; g.fillText('z'.repeat(z + 1), x + TILE - 8, y - 4 - z * 3); }
  }
  // 地圖上的寶可夢小圖示（野生、傳說、卡比獸共用）；x, y 為格子左上角的畫面座標
  function drawIcon(g, sp, x, y, formId = null) {
    const e = formId ? icon('f' + formId) : icon(sp), frame = (G.frame >> 4) % 2;
    g.imageSmoothingEnabled = false;
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.beginPath(); g.ellipse(x + TILE / 2, y + TILE - 6, 14, 5, 0, 0, Math.PI * 2); g.fill();
    if (e.sheet) {
      if (!sheet) { sheet = new Image(); sheet.src = Gen3.base + 'mon_icons.png'; }
      if (sheet.complete && sheet.naturalWidth) {
        const k2 = sp - 1;
        g.drawImage(sheet, (k2 % 32) * 32, Math.floor(k2 / 32) * 64 + frame * 32, 32, 32, x, y - 6 - frame * 2, TILE, TILE);
      }
    } else if (e.img.complete && e.img.naturalWidth) {
      const s = TILE / Math.max(e.img.naturalWidth, e.img.naturalHeight) * 1.2;
      g.drawImage(e.img, x + (TILE - e.img.naturalWidth * s) / 2, y + TILE - e.img.naturalHeight * s - 2 - frame * 2, e.img.naturalWidth * s, e.img.naturalHeight * s);
    }
  }
  return {
    update, draw, drawIcon, touch, at, spawn,
    get list() { return list; },
    clear() { list = []; },
    // 測試用
    _spawnAt(x, y, mon, mood = 'wander') { const w = { x, y, px: x, py: y, t: 0, mon, mood, dir: 'down', biome: 'tall' }; list.push(w); return w; },
    _step: step,
  };
})();
