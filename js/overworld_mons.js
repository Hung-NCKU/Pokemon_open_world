// 野生寶可夢的地圖實體：草叢附近會出現看得到的寶可夢
// - 行為：閒晃、好奇（看到玩家會靠近）、膽小（看到玩家會逃跑）
// - 碰到就開始戰鬥；離開太遠會消失；使用除蟲噴霧時不會出現
// - 圖示：No.1–386 用綠寶石的圖示（2 格動畫），其他用第七世代圖示
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
      const mon = World.rollWild(x, y, t === T.TALL ? 'tall' : 'snow');
      const r = U.rand();
      const mood = r < .4 ? 'wander' : r < .7 ? 'curious' : 'shy';
      list.push({ x, y, px: x, py: y, t: 0, mon, mood, dir: 'down', biome: t === T.TALL ? 'tall' : 'snow', seen: false });
      return;
    }
  }

  // 每 0.4 秒（膽小的逃跑時 0.25 秒）走一步
  function step(now) {
    const s = G.state, p = { x: s.x, y: s.y };
    for (const w of list) {
      const d = dist(w, p);
      const fleeing = w.mood === 'shy' && d <= 4;
      if (now - w.t < (fleeing ? 250 : 420)) continue;
      w.t = now;
      let dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      if (w.mood === 'curious' && d <= 5) {
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
    if (sp <= n) e = { sheet: true };
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
    const e = icon(w.mon.sp), frame = (G.frame >> 4) % 2;
    g.imageSmoothingEnabled = false;
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.beginPath(); g.ellipse(x + TILE / 2, y + TILE - 6, 14, 5, 0, 0, Math.PI * 2); g.fill();
    if (e.sheet) {
      if (!sheet) { sheet = new Image(); sheet.src = Gen3.base + 'mon_icons.png'; }
      if (sheet.complete && sheet.naturalWidth) {
        const k2 = w.mon.sp - 1;
        g.drawImage(sheet, (k2 % 32) * 32, Math.floor(k2 / 32) * 64 + frame * 32, 32, 32, x, y - 6 - frame * 2, TILE, TILE);
      }
    } else if (e.img.complete && e.img.naturalWidth) {
      const s = TILE / Math.max(e.img.naturalWidth, e.img.naturalHeight) * 1.2;
      g.drawImage(e.img, x + (TILE - e.img.naturalWidth * s) / 2, y + TILE - e.img.naturalHeight * s - 2 - frame * 2, e.img.naturalWidth * s, e.img.naturalHeight * s);
    }
    if (w.seen && w.mood === 'curious') { g.fillStyle = '#f8f8f8'; g.font = 'bold 22px sans-serif'; g.fillText('!', x + TILE / 2 - 3, y - 10); }
  }
  return {
    update, draw, touch, at,
    get list() { return list; },
    clear() { list = []; },
    // 測試用
    _spawnAt(x, y, mon, mood = 'wander') { const w = { x, y, px: x, py: y, t: 0, mon, mood, dir: 'down', biome: 'tall' }; list.push(w); return w; },
    _step: step,
  };
})();
