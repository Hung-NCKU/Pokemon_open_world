// Save validation, migration, import/export and slots live outside the game loop.
import { Account, Forms, G, Game, Mega, SAVE_KEY, Sound, UI, define } from './core.js';
import { U } from './util.js';
import { Telemetry } from './telemetry.js';
import { ITEMS, REGIONS, TYPES } from './data.js';
import { Mon, STATUS_ZH } from './mon.js';
import { MARKS } from './search.js';
import { SAVE_VER, WORLD_VER, WW, WH } from './world.js';
import { SaveStore } from './save_store.js';

define(Game, {
  // ---------- 存檔 ----------
  newState(name, region, starter) {
    const seed = Math.floor(Math.random() * 1e9);
    return {
      v: SAVE_VER, worldVer: WORLD_VER, seed, region, name, x: 0, y: 0, dir: 'down', surf: false,
      party: [], box: [],
      bag: { 'poke-ball': 5, 'potion': 3, 'exp-share': 1 },
      money: 3000, badges: {}, champs: {}, seen: {}, caught: {},
      defeated: {}, visited: {}, center: null, repel: 0, steps: 0, playMs: 0,
      flags: {}, starter,
    };
  },
  // 存檔：寫入前把上一份有效的存檔保留為備份
  save(silent = false) {
    // 對戰塔進行中：隊伍是 Lv.50 的複本，不能存檔
    if (G.tower) return true;
    try {
      // 存檔位置依登入的帳號（訪客用原本的位置）
      const key = typeof Account !== 'undefined' ? Account.saveKey() : SAVE_KEY;
      Telemetry.progress(G.state);
      G.state.savedAt = new Date().toISOString();
      const json = Game.serialize(G.state);
      Telemetry.measure('存檔', () => SaveStore.write(key, json, Game.parseSave));
      // 同步帳號（GitHub 或雲端）：同時上傳（跨裝置共用）
      if (typeof Account !== 'undefined') Account.upload(json);
      Telemetry.event('存檔');
      if (!silent) UI.banner(typeof Account !== 'undefined' && Account.online() ? '已儲存遊戲進度（同步到雲端中……）' : '已儲存遊戲進度');
      return true;
    } catch (e) { console.error(e); UI.banner('存檔失敗！'); return false; }
  },
  // 驗證存檔內容；必要欄位錯誤時回傳 { ok:false, error }，選填欄位缺少時補上預設值
  // 存檔版本遷移：MIGRATE[n] 把第 n 版的存檔升級成第 n+1 版（只補欄位，不刪除玩家資料）
  MIGRATE: {
    // 1 → 2：加上世界配置版本；沒有記錄的是舊世界（道館依離家由遠到近），保留原本的配置
    1: s => { if (!Number.isInteger(s.worldVer)) s.worldVer = 1; },
  },
  migrateState(s) {
    let v = Number.isInteger(s.v) && s.v >= 1 ? s.v : 1;
    if (v > SAVE_VER) return `存檔來自較新的版本（第 ${v} 版，目前支援到第 ${SAVE_VER} 版）`;
    for (; v < SAVE_VER; v++) Game.MIGRATE[v](s);
    s.v = SAVE_VER;
    return null;
  },
  validateState(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return '存檔不是有效的資料';
    const mErr = Game.migrateState(s);
    if (mErr) return mErr;
    if (!Number.isFinite(s.seed)) return '缺少世界種子';
    if (!REGIONS[s.region]) return '出發地區不正確';
    if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) return '位置資料不正確';
    if (s.x < 0 || s.y < 0 || s.x >= WW || s.y >= WH) return '位置超出世界範圍';
    if (!Array.isArray(s.party) || !s.party.length || s.party.length > 6) return '隊伍中沒有寶可夢';
    for (const m of [...s.party, ...(Array.isArray(s.box) ? s.box : [])]) {
      const err = Game.validateMon(m);
      if (err) return `寶可夢資料不正確（${err}）`;
    }
    const def = { name: '主角', dir: 'down', surf: false, box: [], bag: {}, money: 0, badges: {}, champs: {}, seen: {}, caught: {},
      defeated: {}, visited: {}, flags: {}, repel: 0, steps: 0, playMs: 0, center: null, starter: s.party[0].sp, mats: {} };
    for (const [k, v] of Object.entries(def)) {
      const bad = s[k] === undefined || (typeof v === 'object' && v !== null && (typeof s[k] !== 'object' || s[k] === null || Array.isArray(v) !== Array.isArray(s[k])));
      if (bad) s[k] = v;
    }
    if (!Number.isFinite(s.money) || s.money < 0) s.money = 0;
    // 學習裝置：一開始就有（舊存檔補上）
    if (!s.bag['exp-share']) s.bag['exp-share'] = 1;
    // 對戰塔：BP、連勝紀錄
    for (const k of ['bp', 'towerStreak', 'towerBest']) if (s[k] !== undefined && !(Number.isInteger(s[k]) && s[k] >= 0)) s[k] = 0;
    // 世界配置版本：沒有記錄的是舊存檔（第 1 版），保留原本的世界
    if (!Number.isInteger(s.worldVer) || s.worldVer < 1 || s.worldVer > WORLD_VER) s.worldVer = 1;
    // 箱子名稱與桌布
    if (!Array.isArray(s.boxMeta)) s.boxMeta = [];
    s.boxMeta = s.boxMeta.map((x, i) => (x && typeof x.n === 'string' && typeof x.wp === 'string' ? { n: x.n.slice(0, 8), wp: x.wp } : { n: `箱子 ${i + 1}`, wp: 'forest' }));
    // 蛋籃與野餐
    if (!Array.isArray(s.eggs)) s.eggs = [];
    s.eggs = s.eggs.filter(e => e && e.mon && Number.isFinite(e.steps) && !Game.validateMon(e.mon)).slice(0, 6);
    s.picnic = null;
    if (s.meal && !(s.meal.type in TYPES && Number.isFinite(s.meal.until))) s.meal = null;
    // 巢狀資料：徽章是各地區 0–7 的不重複整數陣列；冠軍、旗標等是物件
    for (const k of Object.keys(s.badges)) {
      const b = s.badges[k];
      if (!REGIONS[k] || !Array.isArray(b)) { delete s.badges[k]; continue; }
      s.badges[k] = [...new Set(b.filter(v => Number.isInteger(v) && v >= 0 && v <= 7))];
    }
    for (const k of Object.keys(s.champs)) if (!REGIONS[k]) delete s.champs[k];
    for (const k of ['repel', 'steps', 'playMs']) if (!Number.isFinite(s[k]) || s[k] < 0) s[k] = 0;
    if (!['up', 'down', 'left', 'right'].includes(s.dir)) s.dir = 'down';
    for (const k of Object.keys(s.bag)) if (!Number.isInteger(s.bag[k]) || s.bag[k] <= 0) delete s.bag[k];
    // 舊存檔：已捕捉過的傳說／幻之寶可夢不再出現在地圖上
    if (s.legendsGone !== undefined && (!s.legendsGone || typeof s.legendsGone !== 'object' || Array.isArray(s.legendsGone))) s.legendsGone = {};
    if (!s.legendsCaught || typeof s.legendsCaught !== 'object' || Array.isArray(s.legendsCaught)) {
      s.legendsCaught = {};
      for (const id of Object.keys(s.caught)) if (POKEDEX[id] && POKEDEX[id].lg) s.legendsCaught[id] = 1;
    }
    return null;
  },
  // 驗證單隻寶可夢；無法修正的錯誤回傳原因，可修正的直接修正
  validateMon(m) {
    const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
    if (!m || typeof m !== 'object') return '不是寶可夢資料';
    if (!POKEDEX[m.sp]) return '物種不存在';
    if (!int(m.lv, 1, 100)) return '等級';
    if (!Array.isArray(m.iv) || m.iv.length !== 6 || !m.iv.every(v => int(v, 0, 31))) return '個體值';
    if (!int(m.nat, 0, 24)) return '性格';
    if (!Array.isArray(m.moves) || m.moves.length < 1 || m.moves.length > 4) return '招式數量';
    for (const x of m.moves) {
      if (!x || !MOVES[x.id]) return '招式不存在';
      if (!Number.isFinite(x.pp) || x.pp < 0) return '招式 PP';
      x.pp = Math.min(x.pp, MOVES[x.id].pp);
    }
    if (!Array.isArray(m.ev) || m.ev.length !== 6 || !m.ev.every(v => int(v, 0, 252))) m.ev = [0, 0, 0, 0, 0, 0];
    if (m.ev.reduce((a, b) => a + b, 0) > 510) m.ev = [0, 0, 0, 0, 0, 0];
    if (!Number.isFinite(m.exp) || m.exp < 0) m.exp = Mon.expFor(POKEDEX[m.sp].gr, m.lv);
    if (!int(m.happy, 0, 255)) m.happy = POKEDEX[m.sp].hap;
    // 培育欄位：薄荷（0–24 的性格）、極限特訓（6 項旗標）
    if (m.mint !== undefined && !int(m.mint, 0, 24)) delete m.mint;
    if (m._megaFrom !== undefined && typeof Mega !== 'undefined') Mega.revert(m);
    if (m._bfFrom !== undefined) { if (m._bfFrom) m.form = m._bfFrom; else delete m.form; delete m._bfFrom; }
    delete m._dmax; delete m._raid; delete m._heroReady;
    // 合體：夥伴的資料要正確，否則解除合體
    if (m.fused !== undefined && (typeof m.fused !== 'object' || Game.validateMon(m.fused))) { delete m.fused; delete m.form; }
    if (m.form !== undefined && (!Forms.get(m) || FORMS[m.form].mega || FORMS[m.form].battle || FORMS[m.form].gmax || FORMS[m.form].ultra || FORMS[m.form].primal)) delete m.form;
    if (m.form && FORMS[m.form] && FORMS[m.form].fusion && !m.fused) delete m.form;
    if (m.boxPos !== undefined && !(m.boxPos && int(m.boxPos.b, 0, 999) && int(m.boxPos.i, 0, 29))) delete m.boxPos;
    if (m.marks !== undefined && !(Array.isArray(m.marks) && m.marks.every(x => MARKS.includes(x)))) delete m.marks;
    if (m.ivHT !== undefined && !(Array.isArray(m.ivHT) && m.ivHT.length === 6)) delete m.ivHT;
    else if (m.ivHT) m.ivHT = m.ivHT.map(v => (v ? 1 : 0));
    const max = Mon.stats(m)[0];
    if (!Number.isFinite(max)) return '能力值無法計算';
    if (!Number.isFinite(m.hp)) m.hp = max;
    m.hp = U.clamp(Math.floor(m.hp), 0, max);
    if (m.st && !STATUS_ZH[m.st]) m.st = null;
    if (m.item && !ITEMS[m.item]) m.item = null;
    if (m.nick !== undefined && (typeof m.nick !== 'string' || !m.nick.trim() || m.nick.length > 12)) delete m.nick;
    if (!m.uid) m.uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    return null;
  },
  parseSave(text) {
    if (!text) return { ok: false, empty: true };
    let s;
    try { s = JSON.parse(text); } catch { return { ok: false, error: '存檔格式損毀（無法解析）' }; }
    try {
      const err = Game.validateState(s);
      return err ? { ok: false, error: err } : { ok: true, state: s };
    } catch { return { ok: false, error: '存檔內容不完整或巢狀資料過深' }; }
  },
  // 讀取存檔：主存檔無效時改用備份，並回報原因
  loadSave() {
    let main = null, bak = null;
    const key = typeof Account !== 'undefined' ? Account.saveKey() : SAVE_KEY;
    try { main = localStorage.getItem(key); bak = localStorage.getItem(key + '_bak'); } catch { }
    const m = Game.parseSave(main);
    if (m.ok) return { state: m.state };
    const b = Game.parseSave(bak);
    if (m.empty && !b.ok) return null;
    return { state: b.ok ? b.state : null, fromBackup: b.ok, error: m.error || '找不到主存檔' };
  },
  // 即時存檔欄位（Shift＋F1～F12 存、F1～F12 讀；每個帳號各自 12 格，和一般存檔分開）
  // 奔跑：按住 X（GBA 的 B 鍵）或 Shift
  running() { return G.keys.has('Shift') || G.keys.has('x') || G.keys.has('X'); },
  slotKey(n) { return (typeof Account !== 'undefined' ? Account.saveKey() : SAVE_KEY) + '_slot' + n; },
  async quickSlot(n, save) {
    return save ? Game.writeQuickState(n) : Game.readQuickState(n);
  },
  // 匯出、匯入存檔（JSON 檔案）
  /** @param {import('./types.js').SaveState} state */
  serialize(state) { return JSON.stringify(state); },
  exportSave() {
    const blob = new Blob([Game.serialize(G.state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pokemon-openworld-${G.state.name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  importSave() {
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return res({ ok: false, error: '沒有選擇檔案' });
        const r = new FileReader();
        r.onload = () => res(Game.parseSave(String(r.result)));
        r.onerror = () => res({ ok: false, error: '無法讀取檔案' });
        r.readAsText(f);
      };
      inp.click();
    });
  },

});
