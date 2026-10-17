// 城鎮地圖（綠寶石的飛翔畫面格式）：外框、條紋海面、由海岸向內漸亮的陸地、橘色道路、城鎮膠囊、游標
// 世界每 3×3 格對應地圖上 1 點（320×200），畫面顯示 224×128 並隨游標捲動，放大 3 倍；素材由 tools/build_ui.py 從 graphics/pokenav/region_map 產生
import { G, Sound, Story, T, UI } from './core.js';
import { U } from './util.js';
import { REGIONS } from './data.js';
import { Gen3 } from './gen3.js';
import { WH, WW, World } from './world.js';
const MapUI = (() => {
  const CELL = 3, MW = WW / CELL, MH = WH / CELL, CW = 224, CH = 128, EDGE = 4;
  // 顏色取自 pokeemerald 的 region_map/map.png
  const C = {
    sea1: [156, 213, 255], sea2: [164, 180, 255], coast: [0, 115, 0], g1: [57, 172, 8], g2: [98, 213, 0], g3: [172, 238, 49],
    mt: [238, 230, 115], mt2: [205, 205, 148], snow: [255, 255, 255], snow2: [205, 205, 205], desert: [246, 213, 82], desert2: [238, 189, 57],
    road: [230, 164, 0], road2: [238, 189, 57],
  };
  let cache = null;

  // 地形分類（每 3×3 格）與距離海岸的遠近（決定綠色深淺）
  function base() {
    if (cache && cache.tiles === World.tiles) return cache.c;
    const kind = new Uint8Array(MW * MH); // 0 海 1 陸 2 山 3 雪 4 沙漠 5 道路
    for (let my = 0; my < MH; my++) for (let mx = 0; mx < MW; mx++) {
      let water = 0, mount = 0, snow = 0, desert = 0, path = 0;
      for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
        const t = World.tile(mx * CELL + x, my * CELL + y);
        if (t === T.WATER || t === T.DEEP) water++;
        else if (t === T.MOUNT || t === T.CAVE) mount++;
        else if (t === T.SNOW || t === T.SNOWTALL) snow++;
        else if (t === T.DESERT) desert++;
        else if (t === T.PATH || t === T.BRIDGE || t === T.TOWN) path++;
      }
      const edge = mx < EDGE || my < EDGE || mx >= MW - EDGE || my >= MH - EDGE; // 世界邊緣的樹林當作海
      kind[my * MW + mx] = edge ? 0 : path >= 2 ? 5 : water > 4 ? 0 : mount >= 4 ? 2 : snow >= 4 ? 3 : desert >= 4 ? 4 : 1;
    }
    const dist = new Uint8Array(MW * MH).fill(9);
    for (let i = 0; i < MW * MH; i++) if (!kind[i]) dist[i] = 0;
    for (let pass = 0; pass < 5; pass++) for (let my = 0; my < MH; my++) for (let mx = 0; mx < MW; mx++) {
      const i = my * MW + mx;
      if (!kind[i]) continue;
      let m = 9;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = mx + dx, y = my + dy;
        m = Math.min(m, x < 0 || y < 0 || x >= MW || y >= MH ? 0 : dist[y * MW + x]);
      }
      dist[i] = Math.min(dist[i], m + 1);
    }
    const c = document.createElement('canvas');
    c.width = MW; c.height = MH;
    const g = c.getContext('2d');
    const img = g.createImageData(MW, MH);
    for (let my = 0; my < MH; my++) for (let mx = 0; mx < MW; mx++) {
      let col = my % 2 ? C.sea2 : C.sea1;
      {
        const i = my * MW + mx, k = kind[i], d = dist[i];
        if (k === 5) col = (mx + my) % 2 ? C.road : C.road2;
        else if (k && d <= 1) col = C.coast;
        else if (k === 1) col = d === 2 ? C.g1 : d <= 4 ? C.g2 : C.g3;
        else if (k === 2) col = (mx + my) % 3 ? C.mt : C.mt2;
        else if (k === 3) col = (mx * 2 + my) % 5 ? C.snow : C.snow2;
        else if (k === 4) col = (mx + my * 2) % 4 ? C.desert : C.desert2;
      }
      const o = (my * MW + mx) * 4;
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    cache = { tiles: World.tiles, c };
    return c;
  }

  const toMap = (x, y) => [Math.floor(x / CELL), Math.floor(y / CELL)];

  // 城鎮：紅色（去過）或藍色（還沒去過）的膠囊
  function capsule(g, x, y, fill, edge) {
    g.fillStyle = `rgb(${edge})`; g.fillRect(x - 3, y - 2, 7, 5);
    g.fillStyle = `rgb(${fill})`; g.fillRect(x - 2, y - 1, 5, 3);
    g.fillStyle = '#fff'; g.fillRect(x - 2, y - 1, 1, 1);
  }

  // 游標所在位置的城鎮、地標、地區
  function at(mx, my) {
    const wx = mx * CELL + 1, wy = my * CELL + 1;
    const town = World.islandAt?.(wx, wy) || World.towns.find(t => Math.abs(t.cx - wx) <= 10 && Math.abs(t.cy - wy) <= 8);
    const lm = [...(World.landmarks || new Map()).values()].find(l => Math.abs(l.x - wx) <= 4 && Math.abs(l.y - wy) <= 4);
    const inside = wx >= 0 && wy >= 0 && wx < WW && wy < WH;
    return { town, lm, region: inside ? World.regionAt(wx, wy) : null };
  }

  // 回傳：選到的城鎮（飛翔）或 null
  // 可以飛翔時：方向鍵讓游標在去過的城鎮之間跳（按住 Shift 自由移動），Z 或點選城鎮後確認就飛過去
  function show({ canFly = false } = {}) {
    return new Promise(res => {
      const s = G.state;
      const root = document.createElement('div');
      root.id = 'rmap';
      root.innerHTML = `<canvas width="${CW}" height="${CH}"></canvas><div class="rm-name"></div><div class="rm-hint">${canFly ? '方向鍵 選目的地　Z／點選 飛翔　' : ''}X 返回</div>`;
      document.getElementById('game').appendChild(root);
      const cv = root.querySelector('canvas'), g = cv.getContext('2d');
      const cursorImg = new Image(); cursorImg.src = Gen3.base + 'map_cursor.png';
      const playerImg = new Image(); playerImg.src = Gen3.base + 'map_player.png';
      let [cx, cy] = toMap(s.x, s.y);
      let tick = 0;
      const seen = lm => s.flags['lm_' + lm.id] || s.flags['seen_' + lm.id];
      const draw = () => {
        // 視窗跟著游標捲動
        const vx = U.clamp(cx - CW / 2, 0, MW - CW), vy = U.clamp(cy - CH / 2, 0, MH - CH);
        g.save();
        g.drawImage(base(), -vx, -vy);
        g.translate(-vx, -vy);
        for (const lm of (World.landmarks || new Map()).values()) {
          const [x, y] = toMap(lm.x, lm.y);
          g.fillStyle = 'rgb(98,98,98)'; g.fillRect(x - 1, y - 1, 3, 3);
          g.fillStyle = seen(lm) ? 'rgb(255,172,16)' : 'rgb(205,205,205)'; g.fillRect(x, y, 1, 1);
        }
        for (const t of [...World.towns, ...(World.legendIsland ? [World.legendIsland] : [])]) {
          const [x, y] = toMap(t.cx, t.cy);
          if (t.alwaysFly || s.visited[t.id]) capsule(g, x, y, [255, 57, 16], [148, 0, 0]);
          else capsule(g, x, y, [0, 115, 172], [0, 57, 139]);
        }
        // 古代石板解讀後：標示夢幻的位置
        if (s.flags.mewhint && World.legends) {
          const mew = [...World.legends.values()].find(l => l.sp === 151 && !Story.legendDone(151));
          if (mew && (tick >> 3) % 2) { const [mx, my] = toMap(mew.x, mew.y); g.fillStyle = 'rgb(255,120,200)'; g.fillRect(mx - 2, my - 2, 5, 5); g.fillStyle = '#fff'; g.fillRect(mx - 1, my - 1, 3, 3); }
        }
        const [px, py] = toMap(s.x, s.y);
        if (playerImg.complete && playerImg.naturalWidth && (tick >> 4) % 2 === 0) g.drawImage(playerImg, px - 8, py - 8);
        if (cursorImg.complete && cursorImg.naturalWidth) g.drawImage(cursorImg, 0, (tick >> 3) % 2 ? 16 : 0, 16, 16, cx - 8, cy - 8, 16, 16);
        g.restore();
        const a = at(cx, cy);
        const name = a.town ? a.town.name : a.lm && seen(a.lm) ? a.lm.n : '';
        const band = a.town?.alwaysFly ? [50, 90] : a.region ? World.regionBand(a.region) : null;
        root.querySelector('.rm-name').textContent = a.region ? `${REGIONS[a.region].n}地區${name ? '・' + name : ''}　Lv.${band[0]}–${band[1]}` : '海上';
      };
      const timer = setInterval(() => { tick++; draw(); }, 1000 / 30);
      const close = v => { clearInterval(timer); pop(); root.remove(); res(v); };
      const visited = () => World.flyDestinations ? World.flyDestinations(s) : World.towns.filter(t => s.visited[t.id]);
      // 往某個方向最近的去過的城鎮（夾角 60 度以內）
      const jump = (dx, dy) => {
        let best = null, bd = 1e9;
        for (const t of visited()) {
          const [x, y] = toMap(t.cx, t.cy);
          const vx = x - cx, vy = y - cy, d = Math.hypot(vx, vy);
          if (d < 2 || (vx * dx + vy * dy) / d < .5) continue;
          if (d < bd) { bd = d; best = [x, y]; }
        }
        if (best) { [cx, cy] = best; Sound.sfx('select'); return true; }
        return false;
      };
      // 確認後飛過去
      let asking = false;
      const tryFly = async t => {
        if (!canFly || !t || !t.alwaysFly && !s.visited[t.id]) { Sound.sfx('bump'); return; }
        asking = true;
        const c = await UI.choose(['是', '否'], { prompt: `要飛到${t.name}嗎？` });
        UI.hideDialog();
        asking = false;
        if (c === 0) close(t);
      };
      const onKey = e => {
        if (asking) return;
        const k = e.key, step = G.keys.has('Shift') ? 6 : 2;
        const dir = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1] }[k];
        if (dir && canFly && !G.keys.has('Shift') && jump(...dir)) { draw(); return; }
        if (k === 'ArrowLeft' || k === 'a') cx = Math.max(0, cx - step);
        else if (k === 'ArrowRight' || k === 'd') cx = Math.min(MW - 1, cx + step);
        else if (k === 'ArrowUp' || k === 'w') cy = Math.max(0, cy - step);
        else if (k === 'ArrowDown' || k === 's') cy = Math.min(MH - 1, cy + step);
        else if (UI.isOk(e)) {
          if (e.repeat) return;
          tryFly(at(cx, cy).town);
          return;
        } else if (UI.isNo(e) || k === 'm' || k === 'M') { if (!e.repeat) close(null); return; }
        else return;
        draw();
      };
      cv.onclick = ev => {
        const r = cv.getBoundingClientRect();
        const vx = U.clamp(cx - CW / 2, 0, MW - CW), vy = U.clamp(cy - CH / 2, 0, MH - CH);
        cx = vx + Math.round((ev.clientX - r.left) / r.width * CW);
        cy = vy + Math.round((ev.clientY - r.top) / r.height * CH);
        // 點選：附近（8 格內）去過的城鎮
        let t = null, bd = 9;
        for (const v of visited()) { const [x, y] = toMap(v.cx, v.cy); const d = Math.hypot(x - cx, y - cy); if (d < bd) { bd = d; t = v; } }
        if (t) { [cx, cy] = toMap(t.cx, t.cy); draw(); if (!asking) tryFly(t); } else draw();
      };
      const pop = UI.pushKey(onKey);
      draw();
    });
  }
  return { show, base, at, toMap };
})();

export { MapUI };
