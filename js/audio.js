// 音樂與音效：GBA 音源風格的晶片音樂引擎（原創曲）
// 若 assets/bgm、assets/sfx 內有同名音檔（自備官方素材），會優先播放音檔。

// ---------- 自備素材載入 ----------
const Assets = {
  bgm: {}, sfx: {}, playerSheet: null, frames: null,
  BGM_NAMES: ['title', 'town', 'route', 'surf', 'center', 'battle_wild', 'battle_trainer', 'battle_gym', 'battle_champion', 'battle_legend', 'victory_wild', 'victory_trainer', 'victory_gym'],
  SFX_NAMES: ['select', 'bump', 'door', 'encounter', 'hit', 'hit_super', 'hit_weak', 'faint', 'ball_throw', 'ball_shake', 'caught', 'heal', 'levelup', 'run', 'stat_up', 'stat_down', 'save', 'badge', 'evolve'],

  load() {
    const exts = ['ogg', 'mp3', 'wav', 'm4a'];
    const probe = (dir, name, store) => {
      let i = 0;
      const tryNext = () => {
        if (i >= exts.length) return;
        const a = new Audio();
        a.preload = 'auto';
        a.oncanplaythrough = () => { a.oncanplaythrough = null; store[name] = a.src; };
        a.onerror = () => { i++; tryNext(); };
        a.src = `assets/${dir}/${name}.${exts[i]}`;
      };
      tryNext();
    };
    this.BGM_NAMES.forEach(n => probe('bgm', n, this.bgm));
    this.SFX_NAMES.forEach(n => probe('sfx', n, this.sfx));
    // 主角走路圖（pokeemerald graphics/object_events/pics/people/brendan/walking.png 的排列：
    // 16×32 九格：下站、上站、左站、下走1、下走2、上走1、上走2、左走1、左走2）
    const img = new Image();
    img.onload = () => {
      const fw = 16, fh = img.height;
      const n = Math.floor(img.width / fw);
      if (n < 9) return;
      const src = document.createElement('canvas');
      src.width = img.width; src.height = img.height;
      const sg = src.getContext('2d');
      sg.drawImage(img, 0, 0);
      const d = sg.getImageData(0, 0, src.width, src.height);
      const key = [d.data[0], d.data[1], d.data[2]];
      for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i] === key[0] && d.data[i + 1] === key[1] && d.data[i + 2] === key[2]) d.data[i + 3] = 0;
      }
      sg.putImageData(d, 0, 0);
      const cut = (k, flip) => {
        const c = document.createElement('canvas');
        c.width = fw * 2; c.height = fh * 2;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
        g.drawImage(src, k * fw, 0, fw, fh, 0, 0, fw * 2, fh * 2);
        return c;
      };
      this.frames = {
        down: [cut(0), cut(3), cut(4)], up: [cut(1), cut(5), cut(6)],
        left: [cut(2), cut(7), cut(8)], right: [cut(2, true), cut(7, true), cut(8, true)],
      };
      this.playerSheet = true;
    };
    img.src = 'assets/player.png';
  },
  playerFrame(dir, frame) { return this.frames[dir][frame]; },
};

// ---------- 音源 ----------
const Sound = (() => {
  let ctx = null, master, musicGain, sfxGain, noiseBuf, waves = {};
  let current = null, currentName = null, fileAudio = null;
  const settings = () => G.settings;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.connect(master);
    applyVolume();
    // 方波（不同佔空比）
    for (const [name, d] of [['sq12', .125], ['sq25', .25], ['sq50', .5]]) {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * d);
      waves[name] = ctx.createPeriodicWave(re, im);
    }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    if (pending) { const p = pending; pending = null; play(p); }
  }
  // 音量：設定裡的 0～10 段（預設 7）
  const vol = k => { const v = settings()[k]; return v === undefined ? .7 : v / 10; };
  function applyVolume() {
    if (!ctx) return;
    musicGain.gain.value = .45 * vol('musicVol');
    sfxGain.gain.value = .7 * vol('sfxVol');
    if (fileAudio) fileAudio.volume = Math.min(1, .85 * vol('musicVol'));
  }

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    if (!m) return null;
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  // 一個音符
  function tone(inst, m, t, dur, vol, out) {
    if (inst === 'noise') return drum(m, t, vol, out);
    const o = ctx.createOscillator();
    if (inst === 'tri') o.type = 'triangle';
    else if (inst === 'sine') o.type = 'sine';
    else o.setPeriodicWave(waves[inst] || waves.sq50);
    o.frequency.setValueAtTime(freq(m), t);
    const g = ctx.createGain();
    const d = Math.max(.04, dur * .92);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .006);
    g.gain.setValueAtTime(vol, t + Math.min(.05, d * .3));
    g.gain.linearRampToValueAtTime(vol * (inst === 'tri' ? .9 : .6), t + d * .7);
    g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + d + .02);
  }
  function drum(kind, t, vol, out) {
    if (kind === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .12);
      g.gain.setValueAtTime(vol * 1.6, t); g.gain.exponentialRampToValueAtTime(.001, t + .15);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + .16);
      return;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'h' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'h' ? 7000 : 1800;
    const g = ctx.createGain();
    const len = kind === 'h' ? .04 : .12;
    g.gain.setValueAtTime(vol * (kind === 'h' ? .5 : 1.1), t); g.gain.exponentialRampToValueAtTime(.001, t + len);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t, Math.random() * .5); s.stop(t + len + .01);
  }

  // ---------- MIDI 音符（pokeemerald 曲） ----------
  const MIDI_WAVE = { bass: 'tri', pad: 'sq12', brass: 'sq50', flute: 'tri', bell: 'sine', pluck: 'sq25', piano: 'sq25', lead: 'sq50' };
  const MIDI_AMP = { bass: .5, pad: .16, brass: .2, flute: .32, bell: .3, pluck: .22, piano: .22, lead: .2 };
  function midiNote(kind, n, t, d, v, out) {
    if (kind === 'drum') {
      const k = n <= 36 ? 'k' : (n >= 37 && n <= 40) ? 's' : (n >= 42 && n <= 46) || n >= 49 ? 'h' : 'k';
      return drum(k, t, v * .9, out);
    }
    const o = ctx.createOscillator();
    const wave = MIDI_WAVE[kind] || 'sq50';
    if (wave === 'tri') o.type = 'triangle';
    else if (wave === 'sine') o.type = 'sine';
    else o.setPeriodicWave(waves[wave] || waves.sq50);
    o.frequency.setValueAtTime(freq(n), t);
    const g = ctx.createGain();
    const amp = v * (MIDI_AMP[kind] || .2);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + .008);
    if (['piano', 'pluck', 'bell'].includes(kind)) g.gain.exponentialRampToValueAtTime(Math.max(.0005, amp * .15), t + Math.max(.05, Math.min(d, 1.2)));
    else g.gain.setValueAtTime(amp * .8, t + Math.max(.01, d * .8));
    g.gain.linearRampToValueAtTime(0, t + d + .04);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + d + .06);
  }
  // 回傳排程函式；real = base + 音符時間，到循環終點時把 base 往後推一段
  // startAt：從曲中的某個時間點開始（短樂句結束後續播用）；pos() 回傳目前播放到曲中的位置
  function midiScheduler(song, out, loop, startAt = 0) {
    const notes = song.notes;
    const loopS = song.loopS, loopE = song.hasLoop ? song.loopE : song.end;
    let base = ctx.currentTime + .08 - startAt;
    let idx = Math.max(0, notes.findIndex(n => n.t >= startAt));
    if (startAt > 0 && notes.findIndex(n => n.t >= startAt) < 0) idx = notes.length;
    const step = () => {
      // 預排 1 秒，避免分頁在背景或主執行緒忙碌時掉音
      const horizon = ctx.currentTime + 1;
      while (true) {
        if (idx >= notes.length || notes[idx].t >= loopE) {
          if (!loop || loopE - loopS < .5) return false;
          base += loopE - loopS;
          loops++;
          idx = notes.findIndex(n => n.t >= loopS);
          if (idx < 0) return false;
          continue;
        }
        const n = notes[idx];
        const real = base + n.t;
        if (real > horizon) return true;
        if (real >= ctx.currentTime - .05) {
          try { midiNote(Midi.inst(n.prog, n.ch), n.n, real, Math.min(n.d, 4), n.v, out); } catch (e) { /* 單一音符失敗就略過 */ }
        }
        idx++;
      }
    };
    let loops = 0;
    // 目前播放到曲中的位置（預排已跨到下一輪時要扣回來）
    step.pos = () => {
      let p = ctx.currentTime - base;
      if (loops > 0 && p < loopS) p += loopE - loopS;
      return Math.max(0, p);
    };
    return step;
  }

  // ---------- 編曲輔助 ----------
  // "A4:4 C5:2 r:2" → [[midi, 長度(16分音符)], ...]
  function parse(str) {
    return str.trim().split(/\s+/).map(tok => {
      const [n, l] = tok.split(':');
      const len = +(l || 2);
      if (n === 'r') return [null, len];
      if (['k', 's', 'h'].includes(n)) return [n, len];
      return [midi(n), len];
    });
  }
  // 和弦琶音：每個和弦佔一小節
  function arp(chords, oct = 4, step = 2) {
    const out = [];
    for (const ch of chords) {
      const [root, kind] = ch.split('/');
      const r = midi(root + oct);
      const iv = kind === 'm' ? [0, 3, 7, 12] : kind === '7' ? [0, 4, 7, 10] : [0, 4, 7, 12];
      const pat = [0, 1, 2, 1, 3, 2, 1, 2];
      for (let i = 0; i < 16 / step; i++) out.push([r + iv[pat[i % pat.length]], step]);
    }
    return out;
  }
  function bass(chords, style = 'half', oct = 2) {
    const out = [];
    for (const ch of chords) {
      const r = midi(ch.split('/')[0] + oct);
      if (style === 'half') out.push([r, 4], [r + 7, 4], [r, 4], [r + 7, 4]);
      else if (style === 'drive') for (let i = 0; i < 8; i++) out.push([i % 2 ? r + 12 : r, 2]);
      else if (style === 'walk') out.push([r, 4], [r + 4, 4], [r + 7, 4], [r + 4, 4]);
      else out.push([r, 8], [r + 7, 8]);
    }
    return out;
  }
  function drums(pattern, bars) {
    const p = parse(pattern);
    let out = [];
    for (let i = 0; i < bars; i++) out = out.concat(p);
    return out;
  }

  // ---------- 原創曲目 ----------
  const SONGS = {};
  function song(name, bpm, chords, melody, opts = {}) {
    const bars = chords.length;
    SONGS[name] = {
      bpm, loop: opts.loop !== false,
      ch: [
        { inst: opts.lead || 'sq50', vol: .22, notes: parse(melody) },
        { inst: opts.harm || 'sq25', vol: .07, notes: arp(chords, opts.arpOct || 4, opts.arpStep || 2) },
        { inst: 'tri', vol: .3, notes: bass(chords, opts.bass || 'half') },
        ...(opts.drums ? [{ inst: 'noise', vol: .14, notes: drums(opts.drums, bars) }] : []),
      ],
    };
  }

  song('title', 120, ['C', 'F', 'G', 'C', 'A/m', 'F', 'G', 'G'],
    'C5:2 G4:2 C5:2 E5:2 G5:8 F5:4 A5:4 C6:6 A5:2 G5:4 D5:4 B4:4 D5:4 E5:8 C5:8 A4:2 C5:2 E5:2 A5:2 G5:4 E5:4 F5:4 C5:4 A5:4 F5:4 G5:2 F5:2 E5:2 D5:2 B4:4 D5:4 G5:16',
    { bass: 'drive', drums: 'k:4 s:4 k:2 k:2 s:4' });
  song('town', 96, ['F', 'D/m', 'Bb', 'C', 'F', 'A/m', 'Bb', 'F'],
    'A4:4 C5:2 A4:2 G4:4 F4:4 D5:6 C5:2 A4:4 F4:4 Bb4:4 D5:2 Bb4:2 A4:4 G4:4 G4:6 A4:2 C5:8 A4:4 C5:2 F5:2 E5:4 D5:4 C5:6 A4:2 E5:8 D5:4 Bb4:4 C5:4 E5:4 F5:12 r:4',
    { lead: 'sq50', harm: 'sq12', bass: 'walk', drums: 'k:4 h:4 s:4 h:4' });
  song('route', 132, ['G', 'E/m', 'C', 'D', 'G', 'B/m', 'C', 'G'],
    'D5:2 D5:2 B4:2 G4:2 A4:2 B4:2 D5:4 E5:4 D5:2 B4:2 G4:4 E4:4 C5:2 C5:2 E5:2 G5:2 E5:4 C5:4 D5:6 C5:2 B4:2 A4:2 F#4:4 G4:2 B4:2 D5:2 G5:2 F#5:4 E5:4 D5:4 F#4:4 B4:8 C5:2 E5:2 G5:4 F#5:2 E5:2 D5:4 G5:12 r:4',
    { bass: 'drive', drums: 'k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2' });
  song('surf', 108, ['D', 'B/m', 'G', 'A', 'D', 'B/m', 'G', 'D'],
    'F#5:6 E5:2 D5:4 A4:4 B4:6 C#5:2 D5:4 F#5:4 G5:6 F#5:2 E5:4 D5:4 E5:8 A4:8 F#5:4 A5:4 D6:4 C#6:4 B5:6 A5:2 F#5:8 G5:4 B5:4 A5:4 E5:4 D5:12 r:4',
    { harm: 'sq12', arpStep: 2, bass: 'slow', drums: 'k:4 h:4 h:4 s:4' });
  song('center', 92, ['C', 'G', 'F', 'G', 'C', 'G', 'F', 'C'],
    'E5:4 G5:4 C6:4 G5:4 B4:4 D5:4 C5:4 E5:4 F5:4 A5:4 C6:4 A5:4 G5:6 F5:2 E5:4 D5:4 E5:4 G5:4 C6:4 E6:4 D6:4 B5:4 C6:4 A5:4 F5:4 E5:4 D5:4 F5:4 C5:12 r:4',
    { lead: 'sq25', harm: 'sq12', bass: 'walk' });
  song('battle_wild', 168, ['A/m', 'F', 'G', 'E', 'A/m', 'F', 'D/m', 'E'],
    'A4:2 C5:2 E5:2 A5:4 G5:2 E5:4 F5:4 E5:2 C5:2 A4:4 C5:4 D5:2 B4:2 G4:2 B4:2 D5:4 G5:4 G#5:6 E5:2 B4:8 A5:2 G5:2 E5:2 C5:2 E5:2 A5:2 B5:4 C6:4 A5:4 F5:4 C5:4 D5:2 F5:2 A5:2 D6:2 C6:4 A5:4 B5:4 G#5:4 E5:4 B4:4',
    { lead: 'sq25', harm: 'sq12', arpStep: 1, bass: 'drive', drums: 'k:2 h:2 s:2 h:2 k:2 h:1 h:1 s:2 s:2' });
  song('battle_trainer', 176, ['D/m', 'Bb', 'C', 'A', 'D/m', 'G/m', 'Bb', 'A'],
    'D5:3 F5:3 A5:2 G5:4 F5:4 Bb5:6 A5:2 F5:4 D5:4 C5:2 E5:2 G5:2 C6:2 Bb5:4 G5:4 A5:8 C#5:4 E5:4 F5:2 E5:2 D5:2 F5:2 A5:4 D6:4 Bb5:4 G5:4 D5:4 G5:4 F5:4 D5:4 E5:4 C#5:4 D5:12 A4:4',
    { lead: 'sq25', harm: 'sq12', arpStep: 1, bass: 'drive', drums: 'k:2 s:2 k:2 s:2 k:2 k:2 s:2 h:1 h:1' });
  song('battle_gym', 180, ['E/m', 'C', 'D', 'B', 'E/m', 'A/m', 'C', 'B'],
    'E5:2 E5:2 G5:2 B5:4 A5:2 G5:2 F#5:2 E5:4 C5:4 G5:4 E5:4 F#5:2 A5:2 D6:4 C6:2 B5:2 A5:4 B5:8 D#5:4 F#5:4 G5:4 B5:4 E6:4 D6:2 B5:2 C6:4 A5:4 E5:4 A5:4 G5:4 E5:4 F#5:4 D#5:4 E5:12 B4:4',
    { lead: 'sq50', harm: 'sq25', arpStep: 1, bass: 'drive', drums: 'k:2 s:1 h:1 k:2 s:2 k:1 k:1 s:2 k:2 s:2' });
  SONGS.battle_champion = { ...SONGS.battle_gym, bpm: 190 };
  SONGS.battle_legend = { ...SONGS.battle_trainer, bpm: 150 };
  song('victory_wild', 140, ['C', 'A/m', 'F', 'G'],
    'G4:2 C5:2 E5:2 G5:6 E5:2 G5:2 A5:4 E5:4 C5:8 F5:2 E5:2 F5:2 A5:6 G5:4 G5:2 F5:2 E5:2 D5:2 B4:8',
    { bass: 'walk', drums: 'k:4 h:4 s:4 h:4' });
  SONGS.victory_trainer = SONGS.victory_wild;
  SONGS.victory_gym = { ...SONGS.victory_wild, bpm: 120 };

  const MIDI_ALIAS = { evolve: 'evolved' };

  // 短旋律（不循環）
  const JINGLES = {
    heal: 'C5:2 E5:2 G5:2 C6:4 G5:2 C6:6',
    levelup: 'C5:1 E5:1 G5:1 C6:3 G5:1 C6:5',
    caught: 'G4:2 C5:2 E5:2 G5:4 E5:2 G5:2 C6:10',
    badge: 'C5:2 C5:2 C5:2 G5:6 F5:2 E5:2 F5:2 G5:4 C6:12',
    evolve: 'C5:2 D5:2 E5:2 G5:2 C6:4 E6:4 G6:8',
    save: 'E5:2 G5:2 C6:4',
  };

  // ---------- 播放 ----------
  let pending = null;
  let timer = null;
  function stopMusic() {
    if (timer) { clearInterval(timer); timer = null; }
    if (current) { current.out.gain.setTargetAtTime(0, ctx.currentTime, .05); current = null; }
    if (fileAudio) { fileAudio.pause(); fileAudio = null; }
    currentName = null;
  }
  // 音樂出錯不能中斷遊戲流程
  function play(name) {
    try { playInner(name); } catch (e) { console.warn('音樂播放失敗', name, e); }
  }
  function playInner(name, at = 0) {
    if (name === currentName) return;
    if (!ctx) { pending = name; return; }
    stopMusic();
    currentName = name;
    if (Assets.bgm[name]) {
      fileAudio = new window.Audio(Assets.bgm[name]);
      fileAudio.loop = true;
      fileAudio.volume = Math.min(1, .85 * vol('musicVol'));
      fileAudio.play().catch(() => { });
      return;
    }
    const midi = typeof Midi !== 'undefined' && Midi.get(MIDI_ALIAS[name] || name);
    if (midi) {
      const out = ctx.createGain(); out.connect(musicGain);
      const step = midiScheduler(midi, out, true, at);
      current = { out, name, step };
      step();
      timer = setInterval(() => { if (!step()) { clearInterval(timer); timer = null; } }, 60);
      return;
    }
    const FALLBACK = { home: 'town', city: 'town', city2: 'town', town2: 'town', ever_grande: 'town', gym: 'town', lab: 'town', mart: 'center',
      route2: 'route', route3: 'route', desert: 'route', snow: 'route', cave: 'route', victory_league: 'victory_gym' };
    const s = SONGS[name] || SONGS[FALLBACK[name]];
    if (!s) return;
    const out = ctx.createGain(); out.connect(musicGain);
    const six = 60 / s.bpm / 4;
    const chs = s.ch.map(c => ({ ...c, i: 0, t: ctx.currentTime + .08 }));
    current = { out, name };
    const tick = () => {
      const horizon = ctx.currentTime + 1;
      for (const c of chs) {
        while (c.t < horizon) {
          if (c.i >= c.notes.length) { if (!s.loop) break; c.i = 0; }
          const [m, len] = c.notes[c.i++];
          if (m !== null) tone(c.inst, m, c.t, len * six, c.vol, out);
          c.t += len * six;
        }
      }
    };
    tick();
    timer = setInterval(tick, 60);
  }
  // 播放短旋律，結束後回到原本的音樂
  function jingle(name) {
    if (!ctx) return Promise.resolve();
    if (Assets.sfx[name]) return fileSfx(name);
    // 和原作一樣：背景音樂暫停，短樂句結束後從原本的位置續播
    const prev = currentName;
    const prevPos = current && current.step ? current.step.pos() : 0;
    stopMusic();
    const resume = () => { if (prev && currentName === null) { try { playInner(prev, prevPos); } catch (e) { console.warn(e); } } };
    const midi = typeof Midi !== 'undefined' && Midi.get(MIDI_ALIAS[name] || name);
    if (midi) {
      const out = ctx.createGain(); out.connect(musicGain);
      const step = midiScheduler(midi, out, false);
      const iv = setInterval(() => { if (!step()) clearInterval(iv); }, 60);
      step();
      const ms = (midi.end + .3) * 1000;
      return new Promise(r => setTimeout(() => { clearInterval(iv); out.disconnect(); resume(); r(); }, ms));
    }
    const notes = parse(JINGLES[name] || JINGLES.save);
    const six = 60 / 140 / 4;
    let t = ctx.currentTime + .05;
    const out = ctx.createGain(); out.connect(musicGain);
    for (const [m, len] of notes) {
      if (m !== null) { tone('sq50', m, t, len * six, .25, out); tone('tri', m - 12, t, len * six, .25, out); }
      t += len * six;
    }
    const ms = (t - ctx.currentTime) * 1000 + 150;
    return new Promise(r => setTimeout(() => { resume(); r(); }, ms));
  }
  function fileSfx(name) {
    const a = new window.Audio(Assets.sfx[name]);
    a.volume = Math.min(1, vol('sfxVol'));
    return new Promise(r => { a.onended = r; a.onerror = r; a.play().catch(r); });
  }

  // ---------- 音效 ----------
  function env(o, g, t, a, d, v) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.001, t + a + d);
    o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + a + d + .02);
  }
  function osc(type, f0, f1, t, dur, v = .3) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    if (waves[type]) o.setPeriodicWave(waves[type]); else o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(o, g, t, .005, dur, v);
  }
  function noise(t, dur, f, v = .3, type = 'lowpass') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxGain); s.start(t); s.stop(t + dur + .01);
  }
  const SFX = {
    select: t => osc('sq50', 1760, 1760, t, .05, .15),
    bump: t => osc('sq50', 110, 80, t, .08, .2),
    door: t => { noise(t, .25, 900, .25); osc('sq25', 330, 220, t, .2, .1); },
    encounter: t => { for (let i = 0; i < 8; i++) osc('sq50', 300 + i * 120, 300 + i * 120, t + i * .05, .04, .12); },
    hit: t => { noise(t, .18, 2000, .4); osc('sq50', 200, 60, t, .15, .2); },
    hit_super: t => { noise(t, .3, 3000, .5); osc('sq50', 300, 50, t, .25, .3); osc('sq50', 300, 50, t + .1, .2, .2); },
    hit_weak: t => { noise(t, .1, 800, .3); },
    faint: t => osc('sq50', 800, 60, t, .7, .25),
    ball_throw: t => osc('sq25', 300, 1400, t, .3, .15),
    ball_shake: t => { noise(t, .06, 3000, .3, 'highpass'); osc('sq50', 220, 180, t, .06, .15); },
    caught: t => { noise(t, .05, 4000, .4, 'highpass'); },
    run: t => { for (let i = 0; i < 6; i++) { noise(t + i * .06, .08, 1200 + i * 700, .5, 'bandpass'); osc('sq50', 600 + i * 150, 900 + i * 150, t + i * .06, .05, .12); } },
    stat_up: t => { for (let i = 0; i < 6; i++) osc('sq25', 400 * Math.pow(1.19, i), 400 * Math.pow(1.19, i), t + i * .05, .05, .12); },
    stat_down: t => { for (let i = 0; i < 6; i++) osc('sq25', 1200 / Math.pow(1.19, i), 1200 / Math.pow(1.19, i), t + i * .05, .05, .12); },
    save: t => { osc('sq50', 1318, 1318, t, .08, .15); osc('sq50', 1976, 1976, t + .08, .15, .15); },
  };
  // pokeemerald 的音效 MIDI：音色 120 以上是噪音聲道（依音高濾波），其餘用方波
  function playSE(song) {
    const t0 = ctx.currentTime + .01;
    for (const n of song.notes) {
      const t = t0 + n.t, d = Math.max(.02, Math.min(n.d, 1.5)), v = n.v * .5;
      if (n.prog >= 120 || n.ch === 9) {
        const s = ctx.createBufferSource(); s.buffer = noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
        f.frequency.value = Math.min(12000, freq(n.n) * 4);
        const g = ctx.createGain();
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d + .02);
        s.connect(f); f.connect(g); g.connect(sfxGain);
        s.start(t, Math.random() * .5); s.stop(t + d + .05);
      } else {
        const o = ctx.createOscillator();
        o.setPeriodicWave(waves[n.prog >= 80 && n.prog < 88 ? 'sq25' : 'sq50']);
        o.frequency.setValueAtTime(freq(n.n), t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .6, t + .005);
        g.gain.exponentialRampToValueAtTime(.001, t + d + .03);
        o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + d + .05);
      }
    }
  }
  // ---------- 綠寶石音效（m4a 音色組：取樣、方波、雜訊；資料 assets/gen3/se_bank.js） ----------
  const GBA_SE = {
    run: 'se_flee', select: 'se_select', hit: 'se_effective', hit_super: 'se_super_effective', hit_weak: 'se_not_effective',
    ball_throw: 'se_ball_throw', ball_open: 'se_ball_open', ball_shake: 'se_ball', caught: 'se_rg_ball_click', faint: 'se_faint',
    door: 'se_door', bump: 'se_wall_hit', exp: 'se_exp', save: 'se_save', stat_up: 'se_m_stat_increase', stat_down: 'se_m_stat_decrease',
    pc: 'se_pc_on', use_item: 'se_use_item', low_health: 'se_low_health', shiny: 'se_shiny', repel: 'se_repel', exit: 'se_exit', ledge: 'se_ledge',
    item: 'se_use_item', encounter: 'se_ball_bounce_1',
  };
  const smpCache = {};
  let noise7 = null;
  function sampleBuf(name) {
    if (smpCache[name]) return smpCache[name];
    const s = window.SE_BANK && SE_BANK.samples[name];
    if (!s) return null;
    const bin = atob(s.pcm), n = bin.length;
    const buf = ctx.createBuffer(1, n, s.rate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (bin.charCodeAt(i) - 128) / 128;
    let rev = null;
    smpCache[name] = { buf, loop: s.loop, rate: s.rate, get rev() { if (!rev) { rev = ctx.createBuffer(1, n, s.rate); const r = rev.getChannelData(0); for (let i = 0; i < n; i++) r[i] = d[n - 1 - i]; } return rev; } };
    return smpCache[name];
  }
  // 7 位元雜訊（帶音高的金屬聲）
  function noise7Buf() {
    if (noise7) return noise7;
    noise7 = ctx.createBuffer(1, 127 * 8, 32768);
    const d = noise7.getChannelData(0);
    let lfsr = 0x7f;
    for (let i = 0; i < 127; i++) { const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 6); for (let j = 0; j < 8; j++) d[i * 8 + j] = bit ? .8 : -.8; }
    return noise7;
  }
  // 包絡：取樣音色以每幀（1/60 秒）的倍率；方波、雜訊（CGB）以 0–7 的步數
  function envelope(g, v, t, off, peak, cgb) {
    const frame = 1 / 60;
    const tau = (f, max = 3) => f <= 0 ? .005 : f >= 255 ? max : Math.min(max, -frame / Math.log(f / 256));
    let attack, decayTau, sus, relTau;
    if (cgb) {
      attack = v.a ? v.a * .04 : 0; decayTau = v.d ? v.d * .05 : 0; sus = v.d ? (v.su / 15) : 1; relTau = v.r ? v.r * .05 : .01;
    } else {
      attack = v.a >= 255 ? 0 : (255 / Math.max(1, v.a)) * frame; decayTau = v.d === 0 ? .001 : tau(v.d); sus = v.su / 255; relTau = tau(v.r, 1.5);
    }
    g.gain.setValueAtTime(attack ? 0 : peak, t);
    if (attack) g.gain.linearRampToValueAtTime(peak, t + attack);
    if (decayTau) g.gain.setTargetAtTime(Math.max(.0001, peak * sus), t + attack, decayTau);
    g.gain.cancelScheduledValues(off);
    g.gain.setTargetAtTime(0, off, relTau);
    return off + Math.min(2, relTau * 5);
  }
  function playGbaSE(file) {
    const meta = window.SE_BANK && SE_BANK.songs[file];
    const song = typeof Midi !== 'undefined' && Midi.get(file);
    if (!meta || !song) return false;
    const group = SE_BANK.groups[meta.g] || [];
    const t0 = ctx.currentTime + .01, songVol = meta.v / 127;
    for (const n of song.notes) {
      const v = group[n.prog];
      if (!v) continue;
      const t = t0 + n.t, off = t + Math.max(.02, Math.min(n.d, 3));
      const peak = n.v * songVol * .9;
      const g = ctx.createGain();
      g.connect(sfxGain);
      const semis = (n.b0 || 0);
      const bendAt = (param, base, f) => { for (const [bt, b] of n.bends || []) param.setValueAtTime(f(base, b), t + bt); };
      if (v.k.startsWith('voice_directsound')) {
        const s = sampleBuf(v.s);
        if (!s) continue;
        const src = ctx.createBufferSource();
        src.buffer = v.k.endsWith('reverse') ? s.rev : s.buf;
        if (s.loop && !v.k.endsWith('reverse')) { src.loop = true; src.loopStart = s.loop[0] / s.rate; src.loopEnd = s.loop[1] / s.rate; }
        const rate = st => v.k.endsWith('no_resample') ? 1 : Math.pow(2, (n.n - (v.key || 60) + st) / 12);
        src.playbackRate.setValueAtTime(rate(semis), t);
        bendAt(src.playbackRate, 0, (b, st) => rate(st));
        const end = envelope(g, v, t, off, peak, false);
        src.connect(g); src.start(t); src.stop(end);
      } else if (v.k.startsWith('voice_square')) {
        const o = ctx.createOscillator();
        o.setPeriodicWave(waves[['sq12', 'sq25', 'sq50', 'sq25'][v.duty & 3]]);
        let f = freq(n.n + semis);
        o.frequency.setValueAtTime(f, t);
        // 掃頻（square_1）：每 (time/128) 秒，頻率暫存器 ± 暫存器 >> shift
        const sw = v.sweep || 0, swT = (sw >> 4) & 7, dec = (sw >> 3) & 1, shift = sw & 7;
        if (swT && shift) {
          let x = 2048 - 131072 / f;
          for (let tt = t + swT / 128; tt < off && tt < t + 2; tt += swT / 128) {
            x += (dec ? -1 : 1) * Math.floor(x / (1 << shift));
            if (x >= 2047 || x <= 0) break;
            o.frequency.setValueAtTime(131072 / (2048 - x), tt);
          }
        } else bendAt(o.frequency, 0, (b, st) => freq(n.n + st));
        const end = envelope(g, v, t, off, peak * .45, true);
        o.connect(g); o.start(t); o.stop(end);
      } else if (v.k.startsWith('voice_noise')) {
        const src = ctx.createBufferSource();
        src.buffer = v.period ? noise7Buf() : noiseBuf;
        src.loop = true;
        const rate = st => Math.pow(2, (n.n - 60 + st) / 12) * (v.period ? 1 : .6);
        src.playbackRate.setValueAtTime(rate(semis), t);
        bendAt(src.playbackRate, 0, (b, st) => rate(st));
        const end = envelope(g, v, t, off, peak * .5, true);
        src.connect(g); src.start(t, Math.random() * .3); src.stop(end);
      }
    }
    return true;
  }

  function sfx(name) {
    if (!ctx) return;
    // 綠寶石音效庫：別名（hit、ball_throw…）或直接的檔名（m_flamethrower → se_m_flamethrower）
    const file = GBA_SE[name] || (window.SE_BANK && SE_BANK.songs['se_' + name] ? 'se_' + name : null);
    if (file) { try { if (playGbaSE(file)) return; } catch (e) { console.warn('音效播放失敗', name, e); } }
    if (Assets.sfx[name]) { fileSfx(name); return; }
    const se = typeof Midi !== 'undefined' && Midi.get('se_' + name);
    if (se) { try { playSE(se); } catch (e) { console.warn('音效播放失敗', name, e); } return; }
    if (JINGLES[name]) return jingle(name);
    const f = SFX[name];
    try { if (f) f(ctx.currentTime + .01); } catch (e) { console.warn('音效播放失敗', name, e); }
  }

  return { init, play, stop: stopMusic, sfx, jingle, applyVolume, get current() { return currentName; } };
})();
