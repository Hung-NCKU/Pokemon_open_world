// 第三世代（綠寶石）風格的原創像素美術：以 16×16 原生解析度繪製後放大 2 倍
import { Forms, G, T } from './core.js';
import { mulberry32 } from './util.js';
import { Mon } from './mon.js';
import { TRAINER_CLASSES } from './data.js';
const Spr = (() => {
  const S = 3; // 放大倍率
  const N = 16; // 原生圖塊大小

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }
  const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const P = (g, x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };

  // 在透明像素與實心像素交界處加上輪廓
  function outline(c, col, diag = false) {
    const g = c.getContext('2d');
    const { width: w, height: h } = c;
    const d = g.getImageData(0, 0, w, h);
    const a = i => d.data[i * 4 + 3];
    const mark = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (a(y * w + x)) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      if (diag) n.push([1, 1], [-1, -1], [1, -1], [-1, 1]);
      for (const [dx, dy] of n) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && a(ny * w + nx)) { mark.push([x, y]); break; }
      }
    }
    g.fillStyle = col;
    for (const [x, y] of mark) g.fillRect(x, y, 1, 1);
    return c;
  }
  function up(c) {
    const [o, g] = canvas(c.width * S, c.height * S);
    g.drawImage(c, 0, 0, o.width, o.height);
    return o;
  }
  function layer(w, h, fn, line = '#203018') {
    const [c, g] = canvas(w, h);
    fn(g);
    return outline(c, line);
  }
  function mirror(c) {
    const [o, g] = canvas(c.width, c.height);
    g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
    return o;
  }

  // ---------- 色盤 ----------
  const C = {
    grass: '#90d878', grassD: '#68b850', grassL: '#b8f0a0',
    tall: '#58b048', tallD: '#30803c', tallM: '#70c858', tallL: '#a8e888', tallLine: '#205828',
    leaf: '#409840', leafD: '#2c7034', leafL: '#70c060', leafLine: '#183c20', trunk: '#986030', trunkD: '#684020',
    water: '#5898f0', waterD: '#4078d8', waterL: '#90c0f8', waterW: '#e0f0ff', deep: '#3868c8', deepL: '#5890e8',
    sand: '#f0e0a8', sandD: '#d8c488', sandL: '#fff4d0',
    path: '#e8d0a0', pathD: '#d0b080', pathL: '#f8e8c0',
    rock: '#c89860', rockD: '#986838', rockL: '#e8c088', rockLine: '#583818',
    cave: '#d0b088', caveD: '#b08c60', caveL: '#e8d0a8',
    snow: '#f8f8f8', snowD: '#d8e4f0', snowB: '#b0c8e0',
    desert: '#e8c878', desertD: '#d0a858', desertL: '#f8e0a0',
    plank: '#d8a060', plankD: '#a87038', plankL: '#f0c080',
    pave: '#e8dcc0', paveD: '#d0c4a0', paveL: '#f8f0dc',
  };

  // ---------- 小型點陣字（招牌用） ----------
  const FONT = {
    A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
    E: ['111', '100', '110', '100', '111'], G: ['011', '100', '101', '101', '011'], L: ['100', '100', '100', '100', '111'],
    M: ['101', '111', '111', '101', '101'], P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '101', '101'],
    T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'], Y: ['101', '101', '010', '010', '010'],
  };
  function text(g, str, x, y, col) {
    for (const ch of str) {
      const f = FONT[ch];
      if (f) f.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') P(g, x + i, y + j, col); }));
      x += 4;
    }
  }

  // ---------- 地形圖塊 ----------
  function rnd(seed) { return mulberry32(seed * 7919 + 13); }

  function grassBase(g, v) {
    R(g, 0, 0, N, N, C.grass);
    const r = rnd(v + 1);
    for (let i = 0; i < 3; i++) {
      const x = 1 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 12);
      P(g, x, y, C.grassD); P(g, x + 2, y, C.grassD); P(g, x + 1, y - 1, C.grassD);
      P(g, x + 1, y + 1, C.grassL);
    }
  }
  function tallTuft(g, x, y, pal) {
    // W 字形的草叢一束（綠寶石的高草地是由一格格草束排成）
    const [line, d, m, l] = pal;
    const shape = ['0100010', '1210121', '1221221', '1232321', '1333331', '0111110'];
    shape.forEach((row, j) => [...row].forEach((b, i) => {
      if (b === '1') P(g, x + i, y + j, line);
      else if (b === '2') P(g, x + i, y + j, l);
      else if (b === '3') P(g, x + i, y + j, m);
    }));
    P(g, x + 3, y + 4, d);
  }
  function tall(g, base, pal) {
    R(g, 0, 0, N, N, base);
    tallTuft(g, 0, 1, pal); tallTuft(g, 8, 1, pal);
    tallTuft(g, 0, 9, pal); tallTuft(g, 8, 9, pal);
    tallTuft(g, 4, 5, pal); tallTuft(g, 12, 5, pal);
  }
  function tree(g, v) {
    grassBase(g, v);
    R(g, 3, 13, 10, 2, 'rgba(40,90,40,.35)');
    const t = layer(N, N, q => {
      R(q, 6, 11, 4, 4, C.trunk); R(q, 8, 11, 2, 4, C.trunkD);
      // 樹冠
      const rows = [[5, 6], [3, 10], [2, 12], [1, 14], [1, 14], [1, 14], [1, 14], [2, 12], [2, 12], [3, 10], [5, 6]];
      rows.forEach(([x, w], j) => R(q, x, j + 1, w, 1, C.leaf));
      // 陰影與亮部（左上亮、右下暗）
      [[9, 7, 5, 4], [7, 9, 7, 2], [11, 5, 3, 2]].forEach(([x, y, w, h]) => R(q, x, y, w, h, C.leafD));
      [[4, 3, 4, 2], [3, 5, 3, 2], [7, 2, 2, 1]].forEach(([x, y, w, h]) => R(q, x, y, w, h, C.leafL));
      P(q, 9, 4, C.leafL); P(q, 5, 8, C.leafD); P(q, 6, 6, C.leafD);
    }, C.leafLine);
    g.drawImage(t, 0, 0);
  }
  function water(g, f, deep) {
    R(g, 0, 0, N, N, deep ? C.deep : C.water);
    const L = deep ? C.deepL : C.waterL;
    const o = f * 2;
    [[1, 3], [9, 6], [3, 10], [11, 13]].forEach(([x, y], i) => {
      const xx = (x + o + i) % 16;
      R(g, xx, y, 4, 1, L); P(g, (xx + 4) % 16, y - 1, L); P(g, (xx + 15) % 16, y - 1, L);
    });
    if (!deep && f % 2 === 0) { P(g, (5 + f * 3) % 16, 7, C.waterW); P(g, (13 + f) % 16, 2, C.waterW); }
  }
  function speckle(g, base, dark, light, v, n = 6) {
    R(g, 0, 0, N, N, base);
    const r = rnd(v + 50);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * 15), y = Math.floor(r() * 15);
      P(g, x, y, dark); P(g, x + 1, y, dark); P(g, x, y - 1 < 0 ? 0 : y - 1, light);
    }
  }
  function rock(g, v) {
    R(g, 0, 0, N, N, C.rockD);
    const boulder = (x, y, w, h) => {
      const b = layer(N, N, q => {
        R(q, x + 1, y, w - 2, h, C.rock); R(q, x, y + 1, w, h - 2, C.rock);
        R(q, x + 1, y + 1, w - 3, 2, C.rockL); P(q, x + 1, y + 3, C.rockL);
        R(q, x + 2, y + h - 2, w - 3, 1, C.rockD); R(q, x + w - 2, y + 2, 1, h - 3, C.rockD);
      }, C.rockLine);
      g.drawImage(b, 0, 0);
    };
    if (v === 0) { boulder(1, 1, 8, 7); boulder(8, 7, 7, 8); boulder(0, 9, 7, 6); }
    else { boulder(0, 0, 7, 8); boulder(7, 2, 9, 7); boulder(3, 9, 9, 7); }
  }
  function cave(g, v) {
    speckle(g, C.cave, C.caveD, C.caveL, v, 5);
    const r = rnd(v + 9);
    const x = 2 + Math.floor(r() * 9), y = 3 + Math.floor(r() * 9);
    R(g, x, y, 3, 2, C.caveD); R(g, x, y, 2, 1, C.rockL); P(g, x + 3, y + 1, C.rockLine);
  }
  function flower(g, v, f) {
    grassBase(g, v + 3);
    const pet = v === 0 ? '#f85858' : '#f8f8f8';
    const pd = v === 0 ? '#b83030' : '#c8c8d0';
    const spots = [[3, 3], [10, 9]];
    spots.forEach(([x, y]) => {
      const sx = x + (f ? 1 : 0);
      P(g, sx + 1, y, pet); P(g, sx, y + 1, pet); P(g, sx + 2, y + 1, pet); P(g, sx + 1, y + 2, pet);
      P(g, sx + 1, y + 1, '#f8d030');
      P(g, sx + 2, y + 2, pd); P(g, sx + 1, y + 3, C.grassD); P(g, x + 1, y + 4, C.grassD);
    });
  }
  function path(g, v) {
    speckle(g, C.path, C.pathD, C.pathL, v, 4);
  }
  function snow(g, v) {
    R(g, 0, 0, N, N, C.snow);
    const r = rnd(v + 77);
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(r() * 13), y = Math.floor(r() * 14);
      R(g, x, y, 3, 1, C.snowD); P(g, x + 1, y + 1, C.snowB);
    }
  }
  function desert(g, v) {
    R(g, 0, 0, N, N, C.desert);
    for (let i = 0; i < 3; i++) {
      const y = 3 + i * 5 + v;
      for (let x = 0; x < 16; x++) if ((x + i * 3) % 8 < 5) P(g, x, y + ((x + i) % 8 < 3 ? 0 : 1), C.desertD);
      P(g, (4 + i * 5) % 16, y - 1, C.desertL);
    }
  }
  function bridge(g) {
    R(g, 0, 0, N, N, C.plank);
    for (let y = 0; y < 16; y += 4) { R(g, 0, y + 3, N, 1, C.plankD); R(g, 0, y, N, 1, C.plankL); }
    P(g, 3, 1, C.plankD); P(g, 11, 5, C.plankD); P(g, 6, 9, C.plankD); P(g, 13, 13, C.plankD);
  }
  function pave(g) {
    R(g, 0, 0, N, N, C.pave);
    R(g, 0, 7, N, 1, C.paveD); R(g, 0, 15, N, 1, C.paveD);
    R(g, 7, 0, 1, 7, C.paveD); R(g, 15, 8, 1, 7, C.paveD);
    R(g, 0, 0, 7, 1, C.paveL); R(g, 8, 8, 7, 1, C.paveL);
  }

  // 道路與草地交界的草邊
  function edge(side) {
    const [c, g] = canvas(N, N);
    const r = rnd(side.length * 3);
    for (let i = 0; i < 16; i++) {
      const d = 1 + Math.floor(r() * 2);
      if (side === 'top') { R(g, i, 0, 1, d, C.grass); P(g, i, d, C.grassD); }
      if (side === 'bottom') { R(g, i, 16 - d, 1, d, C.grass); P(g, i, 15 - d, C.grassD); }
      if (side === 'left') { R(g, 0, i, d, 1, C.grass); P(g, d, i, C.grassD); }
      if (side === 'right') { R(g, 16 - d, i, d, 1, C.grass); P(g, 15 - d, i, C.grassD); }
    }
    return up(c);
  }

  function makeTiles() {
    const mk = fn => { const [c, g] = canvas(N, N); fn(g); return up(c); };
    const t = {};
    t[T.GRASS] = [0, 1, 2].map(v => mk(g => grassBase(g, v)));
    t[T.FLOWER] = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([v, f]) => mk(g => flower(g, v, f)));
    t[T.TALL] = [mk(g => tall(g, C.tall, [C.tallLine, C.tallD, C.tallM, C.tallL]))];
    t[T.SNOWTALL] = [mk(g => tall(g, '#e0ecf8', ['#6888a8', '#98b0c8', '#c8dcf0', '#ffffff']))];
    t[T.TREE] = [0, 1].map(v => mk(g => tree(g, v)));
    t[T.WATER] = [0, 1, 2, 3].map(f => mk(g => water(g, f, false)));
    t[T.DEEP] = [0, 1, 2, 3].map(f => mk(g => water(g, f, true)));
    t[T.SAND] = [0, 1].map(v => mk(g => speckle(g, C.sand, C.sandD, C.sandL, v)));
    t[T.DESERT] = [0, 1].map(v => mk(g => desert(g, v)));
    t[T.MOUNT] = [0, 1].map(v => mk(g => rock(g, v)));
    t[T.CAVE] = [0, 1].map(v => mk(g => cave(g, v)));
    t[T.SNOW] = [0, 1].map(v => mk(g => snow(g, v)));
    t[T.PATH] = [0, 1].map(v => mk(g => path(g, v)));
    t[T.BRIDGE] = [mk(bridge)];
    t[T.TOWN] = [mk(pave)];
    t[T.BLDG] = t[T.TOWN];
    t[T.DOOR] = t[T.TOWN];
    t.edges = { top: edge('top'), bottom: edge('bottom'), left: edge('left'), right: edge('right') };
    return t;
  }

  // ---------- 建築物 ----------
  const BLD = {
    center: { roof: '#e85848', roofD: '#b03028', roofL: '#f89080', wall: '#f8f0e0', sign: 'PC', signC: '#d83030', glass: true },
    mart: { roof: '#4878e0', roofD: '#2850a8', roofL: '#88b0f8', wall: '#f8f0e0', sign: 'MART', signC: '#3058c0', glass: true },
    gym: { roof: '#58a8a0', roofD: '#307870', roofL: '#90d8c8', wall: '#e8e0d0', sign: 'GYM', signC: '#c89810', trim: '#e8b828' },
    house: { roof: '#d06840', roofD: '#984028', roofL: '#f09870', wall: '#f8f0d8' },
    lab: { roof: '#8898b8', roofD: '#586888', roofL: '#b8c8e0', wall: '#f8f8f0', sign: 'LAB', signC: '#405890' },
    league: { roof: '#8860c8', roofD: '#583890', roofL: '#b898e8', wall: '#f0e8f8', sign: 'LEAGUE', signC: '#583890', trim: '#f0c030' },
  };
  const bldCache = new Map();
  function building(b) {
    const key = `${b.kind}_${b.w}_${b.h}_${b.door.x - b.x}`;
    if (bldCache.has(key)) return bldCache.get(key);
    if (b.kind === 'sign') {
      // 告示牌：木柱與木板
      const [c, g] = canvas(N, N);
      R(g, 7, 9, 2, 6, '#7a5030'); R(g, 2, 3, 12, 7, '#384048'); R(g, 3, 4, 10, 5, '#d8a868'); R(g, 4, 5, 8, 1, '#a07040'); R(g, 4, 7, 6, 1, '#a07040');
      const out = up(c); bldCache.set(key, out); return out;
    }
    const st = BLD[b.kind] || BLD.house;
    const W = b.w * N, H = b.h * N;
    const [c, g] = canvas(W, H);
    const roofH = Math.round(H * (b.kind === 'house' ? .55 : .5));
    const dx = (b.door.x - b.x) * N;
    // 牆
    const wall = layer(W, H, q => {
      R(q, 1, roofH - 2, W - 2, H - roofH + 1, st.wall);
      for (let x = 4; x < W - 2; x += 8) R(q, x, roofH, 1, H - roofH - 3, 'rgba(0,0,0,.06)');
      R(q, 1, H - 3, W - 2, 2, '#a8a0a0');
      R(q, 1, roofH - 1, W - 2, 2, 'rgba(0,0,0,.12)');
    }, '#384048');
    g.drawImage(wall, 0, 0);
    // 屋頂（瓦片紋）
    const roof = layer(W, H, q => {
      R(q, 1, 1, W - 2, roofH - 2, st.roof);
      R(q, 2, 0, W - 4, 1, st.roof);
      for (let y = 3; y < roofH - 2; y += 3) R(q, 1, y, W - 2, 1, st.roofD);
      for (let y = 4; y < roofH - 2; y += 6) for (let x = 3; x < W - 2; x += 6) P(q, x, y, st.roofL);
      R(q, 2, 1, W - 4, 1, st.roofL);
      R(q, 1, roofH - 3, W - 2, 2, st.roofD);
      if (st.trim) { R(q, 1, roofH - 3, W - 2, 1, st.trim); R(q, Math.floor(W / 2) - 3, 0, 6, 2, st.trim); }
    }, '#302028');
    g.drawImage(roof, 0, 0);
    // 寶可夢中心屋頂的精靈球標誌
    if (b.kind === 'center') {
      const cx = Math.floor(W / 2), cy = Math.floor(roofH / 2) - 1;
      const ball = layer(W, H, q => {
        R(q, cx - 3, cy - 4, 7, 9, '#f8f8f8'); R(q, cx - 4, cy - 3, 9, 7, '#f8f8f8');
        R(q, cx - 3, cy - 4, 7, 4, '#e83030'); R(q, cx - 4, cy - 3, 9, 3, '#e83030');
        R(q, cx - 4, cy, 9, 1, '#303030'); R(q, cx - 1, cy - 1, 3, 3, '#303030'); P(q, cx, cy, '#f8f8f8');
      }, '#303030');
      g.drawImage(ball, 0, 0);
    }
    // 窗戶
    for (let i = 0; i < b.w; i++) {
      const x = i * N;
      if (x === dx) continue;
      const wy = roofH + 2;
      if (wy + 7 > H - 4) continue;
      R(g, x + 3, wy, 10, 8, '#485068');
      R(g, x + 4, wy + 1, 8, 6, '#98c8f0');
      R(g, x + 4, wy + 1, 8, 2, '#c8e8ff');
      P(g, x + 5, wy + 3, '#f8f8f8'); P(g, x + 6, wy + 2, '#f8f8f8');
      R(g, x + 7, wy + 1, 1, 6, '#485068');
    }
    // 門
    const doorH = Math.min(12, H - roofH - 1);
    const dy = H - doorH - 1;
    if (st.glass) {
      R(g, dx + 2, dy, 12, doorH, '#585868');
      R(g, dx + 3, dy + 1, 5, doorH - 1, '#a8d8f8'); R(g, dx + 8, dy + 1, 5, doorH - 1, '#a8d8f8');
      R(g, dx + 3, dy + 1, 5, 2, '#d8f0ff'); R(g, dx + 8, dy + 1, 5, 2, '#d8f0ff');
    } else {
      R(g, dx + 3, dy, 10, doorH, '#584028');
      R(g, dx + 4, dy + 1, 8, doorH - 1, '#a86838');
      R(g, dx + 4, dy + 1, 8, 1, '#c88850');
      P(g, dx + 10, dy + Math.floor(doorH / 2), '#f8d040');
    }
    R(g, dx + 2, H - 1, 12, 1, '#788090');
    // 招牌
    if (st.sign) {
      const tw = st.sign.length * 4 + 3;
      const sx = dx + 8 - Math.floor(tw / 2), sy = Math.max(roofH - 1, dy - 8);
      const sign = layer(W, H, q => { R(q, sx, sy, tw, 7, '#f8f8f8'); }, '#383838');
      g.drawImage(sign, 0, 0);
      text(g, st.sign, sx + 2, sy + 1, st.signC);
    }
    const out = up(c);
    bldCache.set(key, out);
    return out;
  }

  // ---------- 人物（自動加輪廓的程序化像素角色） ----------
  const charCache = new Map();
  function person(pal, dir, frame) {
    const [c, g] = canvas(16, 24);
    const sk = '#f8c8a0', skD = '#d89870', eye = '#282830';
    const legA = frame === 1, legB = frame === 2;
    if (dir === 'down' || dir === 'up') {
      // 腳與褲子
      R(g, 5, 18, 3, legA ? 2 : 3, pal.pants); R(g, 8, 18, 3, legB ? 2 : 3, pal.pants);
      R(g, 5, legA ? 20 : 21, 3, 2, pal.shoe); R(g, 8, legB ? 20 : 21, 3, 2, pal.shoe);
      // 身體
      R(g, 4, 12, 8, 7, pal.shirt); R(g, 10, 12, 2, 7, pal.shirtD);
      R(g, 4, 17, 8, 1, pal.belt || pal.shirtD);
      // 手臂
      const la = legB ? 1 : 0, ra = legA ? 1 : 0;
      R(g, 3, 12, 1, 4 - la, pal.shirt); P(g, 3, 16 - la, sk);
      R(g, 12, 12, 1, 4 - ra, pal.shirtD); P(g, 12, 16 - ra, sk);
      if (dir === 'up' && pal.pack) { R(g, 5, 12, 6, 5, pal.pack); R(g, 5, 12, 6, 1, pal.packL || pal.pack); }
      if (dir === 'down') R(g, 6, 12, 4, 1, pal.collar || '#f8f8f8');
      // 頭
      R(g, 4, 5, 8, 7, sk);
      R(g, 3, 6, 10, 3, pal.hair);
      if (dir === 'down') {
        R(g, 4, 8, 8, 4, sk); R(g, 3, 8, 1, 3, pal.hair); R(g, 12, 8, 1, 3, pal.hair);
        R(g, 5, 8, 1, 2, eye); R(g, 10, 8, 1, 2, eye);
        P(g, 4, 10, '#f8a0a0'); P(g, 11, 10, '#f8a0a0');
        R(g, 4, 11, 8, 1, skD);
      } else {
        R(g, 3, 6, 10, 6, pal.hair); R(g, 4, 11, 8, 1, pal.hairD || pal.hair);
      }
      // 帽子
      R(g, 5, 1, 6, 1, pal.hat); R(g, 4, 2, 8, 1, pal.hat); R(g, 3, 3, 10, 3, pal.hat);
      R(g, 3, 5, 10, 1, pal.band);
      if (dir === 'down') { R(g, 3, 6, 10, 1, pal.brim); R(g, 7, 2, 2, 2, pal.mark); }
      else R(g, 6, 3, 4, 1, pal.hatD);
    } else {
      // 側面（朝左，朝右用鏡像）
      R(g, 6, 18, 4, legA || legB ? 2 : 3, pal.pants);
      if (legA) { R(g, 4, 18, 3, 3, pal.pants); R(g, 3, 20, 3, 2, pal.shoe); R(g, 9, 18, 2, 2, pal.pants); R(g, 9, 20, 3, 1, pal.shoe); }
      else if (legB) { R(g, 9, 18, 3, 3, pal.pants); R(g, 10, 20, 3, 2, pal.shoe); R(g, 5, 18, 2, 2, pal.pants); R(g, 4, 20, 3, 1, pal.shoe); }
      else { R(g, 6, 21, 4, 2, pal.shoe); }
      R(g, 5, 12, 6, 7, pal.shirt); R(g, 9, 12, 2, 7, pal.shirtD);
      R(g, 5, 17, 6, 1, pal.belt || pal.shirtD);
      if (pal.pack) { R(g, 10, 12, 3, 5, pal.pack); }
      const sw = legA ? -1 : legB ? 1 : 0;
      R(g, 7 + sw, 13, 2, 3, pal.shirtD); P(g, 7 + sw, 16, sk); P(g, 8 + sw, 16, sk);
      // 頭
      R(g, 4, 5, 8, 7, sk);
      R(g, 8, 6, 5, 6, pal.hair); R(g, 4, 6, 4, 2, pal.hair);
      R(g, 5, 8, 1, 2, eye);
      P(g, 4, 9, sk); R(g, 4, 11, 6, 1, skD); P(g, 6, 10, '#f8a0a0');
      // 帽子
      R(g, 5, 1, 6, 1, pal.hat); R(g, 4, 2, 8, 1, pal.hat); R(g, 4, 3, 9, 3, pal.hat);
      R(g, 4, 5, 9, 1, pal.band); R(g, 1, 6, 6, 1, pal.brim);
      R(g, 6, 2, 2, 2, pal.mark);
    }
    outline(c, '#282830');
    return up(c);
  }
  function character(pal, dir, frame) {
    const key = pal.id + dir + frame;
    if (charCache.has(key)) return charCache.get(key);
    const img = dir === 'right' ? mirror(person(pal, 'left', frame)) : person(pal, dir, frame);
    charCache.set(key, img);
    return img;
  }
  // 主角：紅白帽子、紅黑上衣、黑褲（第三世代男主角風格）
  const PLAYER = { id: 'player', hat: '#f8f8f8', hatD: '#d0d0d8', band: '#e04038', brim: '#e04038', mark: '#e04038', hair: '#585058', hairD: '#383038',
    shirt: '#e05040', shirtD: '#b03028', collar: '#303038', belt: '#303038', pants: '#384060', shoe: '#e04038', pack: '#58a858', packL: '#78c878' };
  function trainerPal(cls, idx) {
    const hair = ['#683818', '#383030', '#a86830', '#e8c048', '#303868'][idx % 5];
    const hat = ['#f8f8f8', '#e8c040', '#58a8e8', '#58b858', '#e86878'][idx % 5];
    return { id: 'tr' + cls + '_' + idx, hat, hatD: hat, band: '#383838', brim: hat, mark: '#f8f8f8', hair, hairD: hair,
      shirt: TRAINER_CLASSES[cls].c, shirtD: shade(TRAINER_CLASSES[cls].c, -40), collar: '#f8f8f8', pants: '#485068', shoe: '#383838' };
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.max(0, Math.min(255, v + amt));
    return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // 衝浪用的坐騎
  let surfImg = null;
  function surfBlob(frame) {
    if (surfImg && surfImg[frame]) return surfImg[frame];
    surfImg = surfImg || [];
    const [c, g] = canvas(16, 16);
    const y = frame ? 1 : 0;
    R(g, 2, 6 + y, 12, 7, '#4870d0'); R(g, 1, 8 + y, 14, 4, '#4870d0');
    R(g, 3, 6 + y, 6, 2, '#88b0f0'); R(g, 3, 11 + y, 10, 2, '#e8e8f8');
    P(g, 12, 8 + y, '#f8f8f8'); P(g, 12, 9 + y, '#282830');
    outline(c, '#203060');
    R(g, 0, 14, 16, 2, 'rgba(255,255,255,.6)');
    surfImg[frame] = up(c);
    return surfImg[frame];
  }

  // 「！」對話泡泡
  let bang = null;
  function exclaim() {
    if (bang) return bang;
    const [c, g] = canvas(10, 12);
    R(g, 1, 0, 8, 10, '#f8f8f8'); R(g, 0, 1, 10, 8, '#f8f8f8'); R(g, 3, 10, 2, 1, '#f8f8f8');
    R(g, 4, 2, 2, 4, '#e03030'); R(g, 4, 7, 2, 1, '#e03030');
    outline(c, '#282830');
    bang = up(c);
    return bang;
  }

  // ---------- 戰鬥背景（224×160 原生，放大 3 倍） ----------
  const BG = {
    tall: { sky: '#d8f0f0', far: '#58a058', farD: '#407840', ground: '#b8e088', stripe: '#a8d078', pad: '#88c060', padD: '#609840', padL: '#b0e080' },
    water: { sky: '#d0e8f8', far: '#78b0e8', farD: '#5890d0', ground: '#70a8e8', stripe: '#88b8f0', pad: '#5890d8', padD: '#3870b8', padL: '#a0c8f8' },
    cave: { sky: '#584838', far: '#786048', farD: '#5c4834', ground: '#c0a078', stripe: '#b09068', pad: '#a08058', padD: '#806040', padL: '#d0b088' },
    snow: { sky: '#e0f0f8', far: '#c8dcf0', farD: '#a8c0e0', ground: '#f0f4f8', stripe: '#e0e8f0', pad: '#d0dcec', padD: '#a8b8d0', padL: '#ffffff' },
    desert: { sky: '#f8ecc8', far: '#e0b868', farD: '#c89850', ground: '#f0d898', stripe: '#e8cc88', pad: '#d8b070', padD: '#b08850', padL: '#f8e0a8' },
    gym: { sky: '#403860', far: '#585080', farD: '#484068', ground: '#a8a0c8', stripe: '#9890b8', pad: '#c8c0e0', padD: '#8880a8', padL: '#e8e0f8' },
  };
  const bgCache = {};
  function battleBg(biome) {
    if (bgCache[biome]) return bgCache[biome];
    const p = BG[biome] || BG.tall;
    const [c, g] = canvas(224, 160);
    R(g, 0, 0, 224, 160, p.ground);
    R(g, 0, 0, 224, 44, p.sky);
    // 遠景
    const r = rnd(biome.length);
    for (let x = -8; x < 232; x += 10 + Math.floor(r() * 6)) {
      const h = 10 + Math.floor(r() * 10);
      g.fillStyle = p.farD; g.beginPath(); g.ellipse(x, 46, 9, h, 0, Math.PI, 0); g.fill();
      g.fillStyle = p.far; g.beginPath(); g.ellipse(x - 1, 46, 7, h - 2, 0, Math.PI, 0); g.fill();
    }
    R(g, 0, 44, 224, 3, p.farD);
    for (let y = 50; y < 160; y += 6 + Math.floor((y - 50) / 12)) R(g, 0, y, 224, 2, p.stripe);
    const pad = (cx, cy, rx, ry) => {
      g.fillStyle = p.padD; g.beginPath(); g.ellipse(cx, cy + 1, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = p.pad; g.beginPath(); g.ellipse(cx, cy, rx - 1, ry - 1, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = p.padL; g.beginPath(); g.ellipse(cx - 4, cy - 2, rx * .6, ry * .4, 0, 0, Math.PI * 2); g.fill();
    };
    pad(167, 69, 40, 9);
    pad(57, 120, 52, 11);
    const url = up3(c).toDataURL();
    bgCache[biome] = url;
    return url;
  }
  function up3(c) {
    const [o, g] = canvas(c.width * 3, c.height * 3);
    g.drawImage(c, 0, 0, o.width, o.height);
    return o;
  }

  return { makeTiles, building, character, PLAYER, trainerPal, surfBlob, exclaim, battleBg, C };
})();

// ---------- 寶可夢圖片與叫聲（從 battle_view.js 移來：圖鑑、能力頁、電腦箱子也會用到） ----------
// 寶可夢圖：1–386 用綠寶石原版、387–649 用黑白版動態圖、其後用最新版；叫聲取自 PokéAPI
const PKSPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const CRY = id => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
const ITEM_SPR = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${id}.png`;

function monSprite(m, back) {
  const id = m.sp, sh = m.shiny;
  const f = typeof Forms !== 'undefined' && Forms.get(m);
  if (f) return { url: Mon.spritePath(`${back ? 'back/' : ''}${sh ? 'shiny/' : ''}${f.id}.png`), scale: 2 };
  if (id <= 386) return { url: Mon.spritePath(`versions/generation-iii/emerald/${back ? 'back/' : ''}${sh ? 'shiny/' : ''}${id}.png`), scale: 3 };
  if (id <= 649) return { url: Mon.spritePath(`versions/generation-v/black-white/animated/${back ? 'back/' : ''}${sh ? 'shiny/' : ''}${id}.gif`), scale: 2 };
  return { url: Mon.spritePath(`${back ? 'back/' : ''}${sh ? 'shiny/' : ''}${id}.png`), scale: 2 };
}

function playCry(id, faint = false) {
  const v = (G.settings.sfxVol ?? 7) / 10;
  if (v <= 0) return;
  try {
    const a = new Audio(CRY(id));
    a.volume = .6 * v;
    if (faint) { a.playbackRate = .75; a.preservesPitch = false; }
    a.play().catch(() => { });
  } catch { }
}

export { Spr, PKSPR, CRY, ITEM_SPR, monSprite, playCry };
