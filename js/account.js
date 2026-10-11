// 帳號：在標題畫面註冊、登入；每個帳號有自己的存檔（含備份）
// - 帳號資料：localStorage「pkmn_accounts」＝ { 名稱: { salt, hash, created } }，密碼用 PBKDF2-SHA256（12 萬次）雜湊，不存明文
// - 存檔：訪客用原本的位置（舊存檔不受影響）；帳號用「存檔位置_帳號名稱」
// - 登入狀態記在「pkmn_session」（下次開啟自動登入）
// - 跨平台同步（優先順序）：GitHub Gist（js/gist_cloud.js，每台裝置輸入一次只有 gist 權限的金鑰）
//   → Supabase（js/cloud.js，js/cloud_config.js 有設定時）→ 只存在這台裝置的本機帳號
import { Account, SAVE_KEY, UI, define } from './core.js';
import { Telemetry } from './telemetry.js';
import { Cloud } from './cloud.js';
import { GistCloud } from './gist_cloud.js';
define(Account, (() => {
  const ACC_KEY = 'pkmn_accounts', SES_KEY = 'pkmn_session';
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
    remove: k => { try { localStorage.removeItem(k); } catch { } },
    keys: () => { try { return Object.keys(localStorage); } catch { return []; } },
  };
  const accounts = () => { try { return JSON.parse(store.get(ACC_KEY) || '{}') || {}; } catch { return {}; } };
  let current = null;
  { const s = store.get(SES_KEY); if (s && accounts()[s]) current = s; }

  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  let fastHash = false; // 測試用：無頭瀏覽器的虛擬時間下 Web Crypto 可能不會完成
  async function hash(pw, salt) {
    if (!fastHash && window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
      return 'pbkdf2:' + hex(bits);
    }
    // 沒有 Web Crypto 的環境：簡單的雜湊（仍不存明文）
    let h = 2166136261;
    for (const ch of salt + pw + salt) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return 'fnv:' + h.toString(16);
  }
  const validName = n => typeof n === 'string' && /^[\p{L}\p{N}_-]{2,12}$/u.test(n);

  // 雲端模式（js/cloud_config.js 有設定時）：帳號與存檔在雲端，本機的存檔只是快取
  const cloud = () => typeof Cloud !== 'undefined' && Cloud.enabled();
  async function register(name, pw) {
    name = (name || '').trim();
    if (!validName(name)) return { ok: false, error: '帳號名稱要 2～12 個字（中英文、數字、底線）' };
    if (!pw || pw.length < (cloud() ? 6 : 4)) return { ok: false, error: `密碼至少 ${cloud() ? 6 : 4} 個字` };
    if (cloud()) return Cloud.register(name, pw);
    const all = accounts();
    if (all[name]) return { ok: false, error: '這個帳號名稱已經有人使用了' };
    const salt = hex(crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(16)) : new Uint8Array(16).map(() => Math.random() * 256));
    all[name] = { salt, hash: await hash(pw, salt), created: new Date().toISOString() };
    store.set(ACC_KEY, JSON.stringify(all));
    return { ok: true };
  }
  async function login(name, pw) {
    if (cloud()) return Cloud.login((name || '').trim(), pw);
    const a = accounts()[(name || '').trim()];
    if (!a || (await hash(pw || '', a.salt)) !== a.hash) return { ok: false, error: '帳號或密碼不正確' };
    current = name.trim();
    store.set(SES_KEY, current);
    return { ok: true };
  }
  const gh = () => typeof GistCloud !== 'undefined' && GistCloud.name;
  function logout() { current = null; store.remove(SES_KEY); if (cloud()) Cloud.logout(); if (gh()) GistCloud.disconnect(); }
  const who = () => (gh() ? GistCloud.name : cloud() ? Cloud.name : current);
  // 正在使用的同步服務（沒有就是 null）
  const backend = () => (gh() ? GistCloud : cloud() && Cloud.name ? Cloud : null);
  // 目前帳號的存檔位置（同步帳號在本機的快取用另一個位置）
  const saveKey = () => (gh() ? SAVE_KEY + '_gh_' + GistCloud.name : cloud() ? (Cloud.name ? SAVE_KEY + '_cloud_' + Cloud.name : SAVE_KEY) : current ? SAVE_KEY + '_' + current : SAVE_KEY);
  const upload = json => { const b = backend(); if (b) b.upload(json); };
  // 開啟標題畫面時：雲端的存檔比本機新就下載（以存檔時間 savedAt 比較）
  // 下載開始時記住「哪個服務、哪個身分、寫到哪個位置」，下載回來後三者都沒變才寫入（中途登出、換帳號就丟掉）
  async function sync() {
    const be = backend();
    if (!be) return null;
    const id = be.identity(), key = saveKey();
    const still = () => backend() === be && be.identity() === id && saveKey() === key;
    try {
      const remote = await be.download();
      if (!still()) return 'stale';
      if (!remote || !remote.data) return 'none';
      const localRaw = store.get(key);
      let localAt = 0;
      try { localAt = localRaw ? Date.parse(JSON.parse(localRaw).savedAt || 0) || 0 : 0; } catch { }
      const remoteAt = Date.parse(remote.data.savedAt || remote.updated_at || 0) || 0;
      if (remoteAt > localAt) { store.set(key, JSON.stringify(remote.data)); return 'downloaded'; }
      return 'local';
    } catch (e) { Telemetry.error('雲端同步失敗：' + e.message, 'cloud'); return 'error'; }
  }
  const hasSave = name => !!store.get(name ? SAVE_KEY + '_' + name : SAVE_KEY);

  // GitHub 同步：輸入金鑰、連結；如果 GitHub 上還沒有存檔，可以把這台裝置的存檔傳上去
  async function linkGitHub() {
    await UI.panel(`<div class="quest-panel"><h3>用 GitHub 同步存檔</h3>
      <p>存檔會存在你 GitHub 帳號底下的一個私人 Gist。電腦本機版、線上版、手機只要連結同一個 GitHub 帳號，就共用同一份存檔。</p>
      <p>取得金鑰（只需要做一次）：</p>
      <p>1. 登入 GitHub，打開 github.com/settings/tokens</p>
      <p>2. 「Generate new token」→「Generate new token (classic)」</p>
      <p>3. Note 隨便填（例如 pokemon），Expiration 自己選，<b>只勾選「gist」</b>，按 Generate token</p>
      <p>4. 複製產生的金鑰（ghp_ 開頭），貼到下一步</p>
      <p><small>金鑰只存在這台裝置的瀏覽器；因為只有 gist 權限，就算外流也碰不到你的儲存庫。每台裝置都要輸入一次。</small></p></div>`);
    const token = await UI.input('貼上 GitHub 金鑰（只有 gist 權限）', '', { cancel: true, password: true, maxLength: 255 });
    if (token === null) return false;
    UI.showText('正在連線到 GitHub……');
    const r = await GistCloud.connect(token);
    UI.hideDialog();
    if (!r.ok) { await UI.say(r.error); return false; }
    if (!r.found) {
      // GitHub 上還沒有存檔：把這台裝置目前的存檔（帳號或訪客）傳上去
      const localRaw = store.get(current ? SAVE_KEY + '_' + current : SAVE_KEY);
      if (localRaw) {
        const m = await UI.choose(['上傳到 GitHub', '不用（從頭開始）'], { prompt: '這台裝置上有存檔。要把它上傳到 GitHub，讓其他裝置也能玩嗎？' });
        if (m === 0) { store.set(saveKey(), localRaw); GistCloud.upload(localRaw); await GistCloud.flush(); }
      }
    }
    await UI.say(`已連結 GitHub 帳號 ${r.login}！${r.found ? '\n找到了之前的存檔，會自動下載。' : ''}`);
    return true;
  }

  // 標題畫面的帳號選單
  async function menu() {
    while (true) {
      if (gh()) {
        const c = await UI.choose(['解除 GitHub 連結', '返回'], { prompt: `已連結 GitHub：${GistCloud.name}\n存檔會同步到你的私人 Gist，其他裝置連結同一個 GitHub 帳號就能接著玩。` });
        if (c === 0) { GistCloud.disconnect(); await UI.say('已解除連結。這台裝置不再同步（GitHub 上的存檔仍然保留）。'); continue; }
        UI.hideDialog(); return;
      }
      // GitHub 同步是選用的（需要每個玩家都有 GitHub 帳號），cloud_config.js 的 github: true 才顯示
      if (!who() && typeof GistCloud !== 'undefined' && window.CLOUD_CONFIG && CLOUD_CONFIG.github) {
        const c = await UI.choose(['用 GitHub 同步存檔（跨平台）', cloud() ? '雲端帳號' : '這台裝置的帳號', '返回'], { prompt: '要怎麼保存帳號與存檔？\n用 GitHub 同步：電腦、手機、線上版共用同一份存檔。' });
        if (c === 0) { if (await linkGitHub()) { UI.hideDialog(); return; } continue; }
        if (c !== 1) { UI.hideDialog(); return; }
      }
      const me = who();
      const opts = me ? ['登出', '返回'] : ['登入', '註冊新帳號', '返回'];
      const where = cloud() ? '雲端帳號：電腦、手機、線上版都能用同一個帳號與存檔' : '這台裝置的帳號（還沒有設定雲端）';
      const c = await UI.choose(opts, { prompt: me ? `目前登入：${me}\n（${where}）` : `目前以訪客身分遊玩。\n（${where}）` });
      const pick = opts[c];
      if (!pick || pick === '返回') { UI.hideDialog(); return; }
      if (pick === '登出') { logout(); await UI.say('已登出，切換回訪客。'); continue; }
      const name = await UI.input('帳號名稱', '', { cancel: true });
      if (name === null) continue;
      const pw = await UI.input('密碼', '', { cancel: true, password: true });
      if (pw === null) continue;
      if (pick === '註冊新帳號') {
        const pw2 = await UI.input('再輸入一次密碼', '', { cancel: true, password: true });
        if (pw2 === null) continue;
        if (pw !== pw2) { await UI.say('兩次輸入的密碼不一樣。'); continue; }
        const r = await register(name, pw);
        if (!r.ok) { await UI.say(r.error); continue; }
        if (!cloud()) await login(name, pw);
        // 訪客的存檔可以搬進新帳號（雲端帳號會在下次存檔時上傳）
        if (cloud() && hasSave(null)) {
          const m = await UI.choose(['搬進新帳號', '不用（從頭開始）'], { prompt: '這台裝置上有訪客的存檔。要把它搬進新帳號嗎？' });
          if (m === 0) { store.set(saveKey(), store.get(SAVE_KEY)); Cloud.upload(store.get(SAVE_KEY)); }
        } else if (hasSave(null) && !hasSave(current)) {
          const m = await UI.choose(['搬進新帳號', '不用（從頭開始）'], { prompt: '這台裝置上有訪客的存檔。要把它搬進新帳號嗎？' });
          if (m === 0) { store.set(saveKey(), store.get(SAVE_KEY)); const b = store.get(SAVE_KEY + '_bak'); if (b) store.set(saveKey() + '_bak', b); }
        }
        await UI.say(`註冊完成！已登入 ${who()}。`);
      } else {
        const r = await login(name, pw);
        await UI.say(r.ok ? `歡迎回來，${who()}！` : r.error);
      }
      UI.hideDialog();
      return;
    }
  }
  return { sync, upload, backend, online: () => !!backend(), linkGitHub, set fastHash(v) { fastHash = v; }, get current() { return who(); }, saveKey, register, login, logout, menu, store, accounts };
})());
