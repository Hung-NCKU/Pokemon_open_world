// 第三世代素材轉接層：讀取 tools/build_assets.py 產生的 assets/gen3/（pokeemerald 素材）
// 若素材不存在，遊戲會自動退回 sprites.js 的原創像素圖與 audio.js 的原創曲。
const Gen3 = (() => {
  const on = !!window.GEN3;
  const SC = 3; // 放大倍率（GBA 240×160 → 720×480）
  const img = {};
  const base = window.GEN3_BASE || 'assets/gen3/';
  let loaded = 0, total = 0;

  function load(name, file) {
    total++;
    const i = new Image();
    i.onload = () => { loaded++; };
    i.onerror = () => { loaded++; console.warn('缺少素材', file); };
    i.src = base + file;
    img[name] = i;
  }
  if (on) {
    load('tiles', 'tiles.png');
    for (const k of Object.keys(GEN3.buildings)) load('bld_' + k, `bld_${k}.png`);
    load('player_walk', 'player_walk.png'); load('player_run', 'player_run.png'); load('player_surf', 'player_surf.png');
    load('surf_blob', 'fx_surf_blob.png'); load('exclaim', 'fx_emotion_exclamation.png');
    for (const t of GEN3.trainers) load('npc_' + t, `npc_${t}.png`);
  }
  const ready = () => !on || loaded >= total;
  // 需要時才載入的圖（室內地圖、室內人物）：回傳圖片物件，載入完成前 naturalWidth 為 0
  function ensure(name, file) {
    if (!img[name]) { const i = new Image(); i.onerror = () => console.warn('缺少素材', file); i.src = base + file; img[name] = i; }
    return img[name];
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }
  const cache = new Map();
  function cut(key, src, sx, sy, sw, sh, flip = false) {
    const k = key + (flip ? '_f' : '');
    if (cache.has(k)) return cache.get(k);
    if (!src || !src.complete || !src.naturalWidth) return null;
    const [c, g] = canvas(sw * SC, sh * SC);
    if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(src, sx, sy, sw, sh, 0, 0, sw * SC, sh * SC);
    cache.set(k, c);
    return c;
  }
  function tile(i) {
    return cut('t' + i, img.tiles, (i % 32) * 16, Math.floor(i / 32) * 16, 16, 16);
  }
  // 依環境換色的圖塊（綠寶石沒有雪地、沙漠的道路，也沒有雪地的草叢）：
  //   snowpath：道路的草邊換成雪、路面帶一點積雪；desertpath：草邊換成沙；frost：草叢結霜（偏白的淡綠）
  // 只用畫布合成（source-atop 疊色），不讀取像素：直接開啟 file:// 時圖片算跨來源，讀像素會出錯讓畫面停住
  const TINT = { snowpath: 'rgba(236,240,250,.5)', desertpath: 'rgba(224,190,120,.38)', frost: 'rgba(238,244,250,.58)' };
  function recolor(src, kind) {
    if (!src) return null;
    const k = 'rc_' + kind + '_' + (src._id || (src._id = Math.random().toString(36).slice(2)));
    if (cache.has(k)) return cache.get(k);
    const [c, g] = canvas(src.width, src.height);
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = TINT[kind] || 'rgba(255,255,255,0)';
    g.fillRect(0, 0, c.width, c.height);
    cache.set(k, c);
    return c;
  }

  function building(kind) {
    let b = img['bld_' + kind];
    // 室內地圖建置時另外輸出的建築（小屋、告示牌）
    if (!b && window.INTERIORS && INTERIORS._buildings && INTERIORS._buildings[kind]) b = ensure('bld_' + kind, `bld_${kind}.png`);
    return b && b.naturalWidth ? cut('b' + kind, b, 0, 0, b.naturalWidth, b.naturalHeight) : null;
  }
  // 走路圖 9 格：下站、上站、左站、下走1、下走2、上走1、上走2、左走1、左走2
  const FRAME = { down: [0, 3, 4], up: [1, 5, 6], left: [2, 7, 8], right: [2, 7, 8] };
  function charFrame(sheet, dir, frame) {
    const s = img[sheet];
    if (!s || !s.naturalWidth) return null;
    const n = Math.max(1, Math.floor(s.naturalWidth / 16));
    let f = FRAME[dir][frame] ?? 0;
    if (f >= n) f = FRAME[dir][0] % n;
    return cut(`${sheet}_${f}`, s, f * 16, 0, 16, s.naturalHeight, dir === 'right');
  }
  // 衝浪圖：6 格 32×32（下、下、上、上、左、左）
  function surfFrame(dir) {
    const s = img.player_surf;
    const f = { down: 0, up: 2, left: 4, right: 4 }[dir];
    return s && s.naturalWidth ? cut('ps' + f, s, f * 32, 0, 32, 32, dir === 'right') : null;
  }
  function surfBlob(dir) {
    const s = img.surf_blob;
    const f = { down: 0, up: 1, left: 2, right: 2 }[dir];
    return s && s.naturalWidth ? cut('sb' + f, s, f * 32, 0, 32, 32, dir === 'right') : null;
  }
  function exclaim() {
    const s = img.exclaim;
    return s && s.naturalWidth ? cut('ex', s, 0, 0, 16, 16) : null;
  }

  // ---------- 地形自動拼接 ----------
  function mask(same, x, y) {
    const n = same(x, y - 1), e = same(x + 1, y), s = same(x, y + 1), w = same(x - 1, y);
    let m = (n ? 1 : 0) | (e ? 2 : 0) | (s ? 4 : 0) | (w ? 8 : 0);
    if (n && e && same(x + 1, y - 1)) m |= 16;
    if (s && e && same(x + 1, y + 1)) m |= 32;
    if (s && w && same(x - 1, y + 1)) m |= 64;
    if (n && w && same(x - 1, y - 1)) m |= 128;
    return m;
  }
  function auto(cls, same, x, y, d = 0) {
    const t = GEN3.auto[cls];
    if (!t) return null;
    const i = t[`${mask(same, x, y)},${d}`] ?? t[`255,${d}`] ?? t['255,0'];
    return i === undefined ? null : tile(i);
  }
  function single(name, k = 0) {
    const a = GEN3.single[name];
    return a ? tile(a[k % a.length]) : null;
  }

  const anims = on ? new Set(GEN3.anims) : new Set();
  function animUrl(name) { return anims.has(name) ? `${base}anim/${name}.png` : null; }

  return { on, ready, ensure, tile, recolor, building, charFrame, surfFrame, surfBlob, exclaim, auto, single, animUrl, base, SC,
    hasTrainer: n => on && GEN3.trainers.includes(n), bld: k => on && GEN3.buildings[k] };
})();

// ---------- MIDI 播放（pokeemerald 的 MIDI 檔，以 [ ] 標記循環區段） ----------
const Midi = (() => {
  function b64(s) {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function parse(bytes) {
    let p = 0;
    const u32 = () => (bytes[p++] << 24 | bytes[p++] << 16 | bytes[p++] << 8 | bytes[p++]) >>> 0;
    const u16 = () => bytes[p++] << 8 | bytes[p++];
    const vlq = () => { let v = 0, c; do { c = bytes[p++]; v = (v << 7) | (c & 127); } while (c & 128); return v; };
    const str = n => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[p++]); return s; };
    if (str(4) !== 'MThd') throw new Error('not midi');
    u32(); u16();
    const ntr = u16(), div = u16();
    const events = [];
    for (let t = 0; t < ntr; t++) {
      if (str(4) !== 'MTrk') break;
      const len = u32(), end = p + len;
      let tick = 0, run = 0;
      while (p < end) {
        tick += vlq();
        let st = bytes[p];
        if (st & 128) p++; else st = run;
        const type = st & 0xF0, ch = st & 15;
        if (st === 0xFF) {
          const mt = bytes[p++], l = vlq();
          const data = bytes.slice(p, p + l); p += l;
          if (mt === 0x51) events.push({ tick, k: 'tempo', v: data[0] << 16 | data[1] << 8 | data[2] });
          else if (mt === 0x06 || mt === 0x01) {
            const txt = String.fromCharCode(...data);
            if (txt === '[') events.push({ tick, k: 'loopStart' });
            if (txt === ']') events.push({ tick, k: 'loopEnd' });
          }
        } else if (st === 0xF0 || st === 0xF7) { p += vlq(); }
        else {
          run = st;
          if (type === 0x90 || type === 0x80) {
            const n = bytes[p++], v = bytes[p++];
            events.push({ tick, k: type === 0x90 && v ? 'on' : 'off', ch, n, v });
          } else if (type === 0xB0) { const c = bytes[p++], v = bytes[p++]; events.push({ tick, k: 'cc', ch, c, v }); }
          else if (type === 0xC0) { events.push({ tick, k: 'prog', ch, v: bytes[p++] }); }
          else if (type === 0xD0) p += 1;
          else if (type === 0xE0) { const lo = bytes[p++], hi = bytes[p++]; events.push({ tick, k: 'bend', ch, v: ((hi << 7) | lo) - 8192 }); }
          else p += 2;
        }
      }
      p = end;
    }
    events.sort((a, b) => a.tick - b.tick || (a.k === 'off' ? -1 : 1));
    // 轉成秒並配對音符
    let tempo = 500000, last = 0, sec = 0;
    const notes = [], open = {}, prog = {}, vol = {}, bend = {}, bendR = {};
    let loopS = null, loopE = null, endT = 0;
    for (const e of events) {
      sec += (e.tick - last) * tempo / div / 1e6; last = e.tick;
      e.t = sec;
      if (e.k === 'tempo') tempo = e.v;
      else if (e.k === 'prog') prog[e.ch] = e.v;
      else if (e.k === 'cc' && e.c === 7) vol[e.ch] = e.v;
      else if (e.k === 'cc' && e.c === 20) bendR[e.ch] = e.v; // m4a 的 BENDR（彎音範圍，半音）
      else if (e.k === 'bend') {
        // 彎音：記在這個聲道正在發聲的音符上（秒、半音）
        bend[e.ch] = e.v / 8192 * (bendR[e.ch] ?? 2);
        for (const o of Object.values(open)) if (o.ch === e.ch) (o.bends = o.bends || []).push([sec - o.t, bend[e.ch]]);
      }
      else if (e.k === 'loopStart') loopS = sec;
      else if (e.k === 'loopEnd') loopE = sec;
      else if (e.k === 'on') {
        const key = e.ch + ':' + e.n;
        if (open[key]) { open[key].d = sec - open[key].t; notes.push(open[key]); }
        open[key] = { t: sec, n: e.n, ch: e.ch, v: e.v / 127 * ((vol[e.ch] ?? 100) / 127), prog: prog[e.ch] ?? 0, b0: bend[e.ch] || 0 };
      } else if (e.k === 'off') {
        const key = e.ch + ':' + e.n;
        if (open[key]) { open[key].d = Math.max(.03, sec - open[key].t); notes.push(open[key]); delete open[key]; }
      }
      endT = sec;
    }
    notes.sort((a, b) => a.t - b.t);
    return { notes, loopS: loopS ?? 0, loopE: loopE ?? endT, end: endT, hasLoop: loopE !== null };
  }
  const songs = {};
  function get(name) {
    if (songs[name] !== undefined) return songs[name];
    const d = (window.GEN3_MIDI && window.GEN3_MIDI[name]) || (window.SE_MIDI && window.SE_MIDI[name]);
    try { songs[name] = d ? parse(b64(d)) : null; } catch (e) { console.warn(e); songs[name] = null; }
    return songs[name];
  }
  // 依 GM 音色編號選擇 GBA 風格的波形
  function inst(prog, ch) {
    if (ch === 9 || prog >= 112) return 'drum';
    if (prog >= 32 && prog < 40) return 'bass';
    if (prog >= 40 && prog < 56) return 'pad';
    if (prog >= 56 && prog < 64) return 'brass';
    if (prog >= 64 && prog < 80) return 'flute';
    if (prog >= 8 && prog < 16) return 'bell';
    if (prog >= 24 && prog < 32) return 'pluck';
    if (prog < 8) return 'piano';
    return 'lead';
  }
  return { get, inst };
})();
