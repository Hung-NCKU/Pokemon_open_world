// 遊玩紀錄：錯誤、畫面更新率、耗時、遊玩事件
// - 錯誤（含未處理的 Promise）保留最近 30 筆，存在 localStorage，重新開啟遊戲後仍看得到
// - 畫面更新率：每秒取樣，記錄平均與最差、超過 50ms 的卡頓次數
// - 耗時：世界生成、地圖繪製、存檔、戰鬥……（最近一次、平均、最大）
// - 遊玩事件：最近 60 筆（進入戰鬥、勝負、傳送、存檔），錯誤發生時可以對照前後發生了什麼
// ` 鍵（Esc 下面）切換畫面左上角的即時顯示；設定選單「遊玩紀錄」可以查看與下載（F1～F12 是即時存檔／讀檔）
import { G } from './core.js';
const Telemetry = (() => {
  const KEY = 'pkmn_openworld_log';
  const MAX_ERR = 30, MAX_EV = 60;
  let errors = [], events = [], battles = {};
  const timings = {};
  const fps = { frames: 0, acc: 0, cur: 0, min: Infinity, samples: 0, sum: 0, long: 0, worst: 0 };
  const started = Date.now();
  try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); errors = Array.isArray(s.errors) ? s.errors.slice(-MAX_ERR) : []; battles = s.battles && typeof s.battles === 'object' ? s.battles : {}; } catch { }

  let saveT = 0;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify({ errors, battles })); } catch { } }, 200);
  }
  const mode = () => (typeof G !== 'undefined' && G.mode) || '';
  function error(msg, where = '') {
    msg = String(msg).slice(0, 400);
    const last = errors[errors.length - 1];
    // 同一個錯誤連續發生（例如每個畫格）只記一次並計數
    if (last && last.msg === msg && last.where === where) { last.n = (last.n || 1) + 1; last.t = Date.now(); }
    else errors.push({ t: Date.now(), msg, where, mode: mode(), recent: events.slice(-5).map(e => e.e) });
    if (errors.length > MAX_ERR) errors = errors.slice(-MAX_ERR);
    persist();
  }
  function event(e, data) {
    events.push({ t: Date.now(), e, ...(data || {}) });
    if (events.length > MAX_EV) events = events.slice(-MAX_EV);
  }
  function time(name, ms) {
    const r = timings[name] || (timings[name] = { last: 0, n: 0, total: 0, max: 0 });
    r.last = ms; r.n++; r.total += ms; r.max = Math.max(r.max, ms);
  }
  // 量測同步或非同步的函式
  function measure(name, fn) {
    const t0 = performance.now();
    const done = v => { time(name, performance.now() - t0); return v; };
    const v = fn();
    return v && typeof v.then === 'function' ? v.then(done) : done(v);
  }
  // 每個畫格呼叫；dt 是與上一格的間隔（毫秒）
  function frame(dt) {
    if (document.hidden) return;
    fps.frames++; fps.acc += dt;
    if (dt > 50) fps.long++;
    fps.worst = Math.max(fps.worst, dt);
    if (fps.acc >= 1000) {
      fps.cur = Math.round(fps.frames * 1000 / fps.acc);
      fps.min = Math.min(fps.min, fps.cur); fps.sum += fps.cur; fps.samples++;
      fps.frames = 0; fps.acc = 0;
      if (overlay) draw();
    }
  }
  // 對戰統計（依遊玩數據調整平衡用）：每種對戰的場數、勝負、平均回合、我方與對手的等級差
  function battle(kind, result, lvDiff, turns) {
    const b = battles[kind] || (battles[kind] = { n: 0, win: 0, lose: 0, other: 0, turns: 0, lvDiff: 0 });
    b.n++; b.turns += turns || 0; b.lvDiff += lvDiff || 0;
    if (result === 'win') b.win++; else if (result === 'lose') b.lose++; else b.other++;
    persist();
  }
  function battleStats() {
    return Object.entries(battles).map(([k, b]) => ({ kind: k, n: b.n, winRate: b.n ? Math.round(b.win / b.n * 100) : 0, lose: b.lose, avgTurns: b.n ? +(b.turns / b.n).toFixed(1) : 0, avgLvDiff: b.n ? +(b.lvDiff / b.n).toFixed(1) : 0 }));
  }
  function report() {
    const t = {};
    for (const [k, r] of Object.entries(timings)) t[k] = { last: Math.round(r.last), avg: Math.round(r.total / r.n), max: Math.round(r.max), n: r.n };
    return {
      at: new Date().toISOString(), sessionMin: Math.round((Date.now() - started) / 60000),
      ua: navigator.userAgent,
      fps: { now: fps.cur, avg: fps.samples ? Math.round(fps.sum / fps.samples) : 0, min: fps.samples ? fps.min : 0, longFrames: fps.long, worstMs: Math.round(fps.worst) },
      timings: t, errors, events: events.slice(-30), battles: battleStats(),
      save: typeof G !== 'undefined' && G.state ? { v: G.state.v, worldVer: G.state.worldVer, region: G.state.region, seed: G.state.seed } : null,
    };
  }
  function download() {
    const blob = new Blob([JSON.stringify(report(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pokemon-openworld-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function clearErrors() { errors = []; persist(); }

  // ` 鍵：即時顯示
  let overlay = null;
  function draw() {
    const r = report();
    const g = r.timings['世界生成'];
    overlay.textContent = (fps.samples ? `FPS ${r.fps.now}（最低 ${r.fps.min}）卡頓 ${r.fps.longFrames}` : 'FPS 測量中') + '\n' +
      `世界生成 ${g ? g.last + 'ms' : '—'}　錯誤 ${errors.length}`;
  }
  function toggleOverlay() {
    if (overlay) { overlay.remove(); overlay = null; return; }
    overlay = document.createElement('pre');
    overlay.id = 'telemetry';
    (document.getElementById('game') || document.body).appendChild(overlay);
    draw();
  }

  window.addEventListener('error', e => error(e.message, `${(e.filename || '').split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', e => error(e.reason && e.reason.stack ? e.reason.stack.split('\n').slice(0, 3).join(' | ') : String(e.reason), 'promise'));
  const realErr = console.error;
  console.error = (...a) => { error(a.map(x => (x && x.stack) ? x.stack.split('\n').slice(0, 3).join(' | ') : String(x)).join(' '), 'console'); realErr.apply(console, a); };
  window.addEventListener('keydown', e => { if (e.key === '`' && e.target.tagName !== 'INPUT') { e.preventDefault(); toggleOverlay(); } });

  return { battle, battleStats, error, event, time, measure, frame, report, download, clearErrors, toggleOverlay, get errors() { return errors; } };
})();

export { Telemetry };
