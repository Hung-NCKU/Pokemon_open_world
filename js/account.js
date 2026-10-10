// 帳號：在標題畫面註冊、登入；每個帳號有自己的存檔（含備份）
// - 帳號資料：localStorage「pkmn_accounts」＝ { 名稱: { salt, hash, created } }，密碼用 PBKDF2-SHA256（12 萬次）雜湊，不存明文
// - 存檔：訪客用原本的位置（舊存檔不受影響）；帳號用「存檔位置_帳號名稱」
// - 登入狀態記在「pkmn_session」（下次開啟自動登入）
// - 儲存層集中在 Account.store：之後要接雲端（自己的伺服器、Firebase、Supabase……）只要換掉 store 的四個函式
const Account = (() => {
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
  function logout() { current = null; store.remove(SES_KEY); if (cloud()) Cloud.logout(); }
  const who = () => (cloud() ? Cloud.name : current);
  // 目前帳號的存檔位置（雲端帳號在本機的快取用另一個位置）
  const saveKey = () => (cloud() ? (Cloud.name ? SAVE_KEY + '_cloud_' + Cloud.name : SAVE_KEY) : current ? SAVE_KEY + '_' + current : SAVE_KEY);
  // 開啟標題畫面時：雲端的存檔比本機新就下載（以存檔時間 savedAt 比較）
  async function sync() {
    if (!cloud() || !Cloud.name) return null;
    try {
      const remote = await Cloud.download();
      if (!remote || !remote.data) return 'none';
      const localRaw = store.get(saveKey());
      let localAt = 0;
      try { localAt = localRaw ? Date.parse(JSON.parse(localRaw).savedAt || 0) || 0 : 0; } catch { }
      const remoteAt = Date.parse(remote.data.savedAt || remote.updated_at || 0) || 0;
      if (remoteAt > localAt) { store.set(saveKey(), JSON.stringify(remote.data)); return 'downloaded'; }
      return 'local';
    } catch (e) { Telemetry.error('雲端同步失敗：' + e.message, 'cloud'); return 'error'; }
  }
  const hasSave = name => !!store.get(name ? SAVE_KEY + '_' + name : SAVE_KEY);

  // 標題畫面的帳號選單
  async function menu() {
    while (true) {
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
  return { sync, set fastHash(v) { fastHash = v; }, get current() { return who(); }, saveKey, register, login, logout, menu, store, accounts };
})();
