// GitHub Gist 存檔同步（跨平台：本機 file://、線上版、手機共用同一份存檔）
// - 每個玩家用自己的 GitHub 帳號：建立一把「只有 gist 權限」的金鑰（token），在每台裝置的遊戲裡輸入一次
// - 金鑰只存在這台裝置的瀏覽器（localStorage），不會出現在網頁原始碼裡；外流也只能動 gist，碰不到儲存庫
// - 存檔存在玩家帳號底下的一個私人 gist（檔名 pokemon_openworld_save.json），以存檔時間 savedAt 判斷哪邊比較新
// 和 cloud.js（Supabase）提供相同的介面，Account 依設定選用其中一個
const GistCloud = (() => {
  const KEY = 'pkmn_gist_session', FILE = 'pokemon_openworld_save.json', DESC = 'Pokémon THE WORLD 存檔（自動同步）';
  const API = 'https://api.github.com';
  let session = null; // { token, login, gistId }
  try { session = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { }
  const keep = s => { session = s; try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { } };

  async function gh(path, { method = 'GET', body, token = session && session.token } = {}) {
    const r = await fetch(API + path, {
      method,
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  }
  // 找到之前建立的存檔 gist（換新裝置時用）
  async function findGist(token) {
    for (let page = 1; page <= 5; page++) {
      const r = await gh(`/gists?per_page=100&page=${page}`, { token });
      if (!r.ok || !Array.isArray(r.data) || !r.data.length) return null;
      const g = r.data.find(x => x.files && x.files[FILE]);
      if (g) return g.id;
    }
    return null;
  }

  // 連結：驗證金鑰、找出（或之後建立）存檔 gist
  async function connect(token) {
    token = (token || '').trim();
    if (!token) return { ok: false, error: '請輸入金鑰' };
    const u = await gh('/user', { token });
    if (!u.ok) return { ok: false, error: u.status === 401 ? '金鑰無效或已過期' : '無法連線到 GitHub' };
    const gistId = await findGist(token);
    keep({ token, login: u.data.login, gistId });
    return { ok: true, login: u.data.login, found: !!gistId };
  }
  function disconnect() { clearTimeout(upT); upT = null; pending = null; keep(null); }

  // 上傳（10 秒內的多次存檔只上傳最後一次，減少 gist 的版本數）
  let upT = null, pending = null;
  function upload(json) {
    if (!session) return;
    pending = { json, login: session.login, token: session.token };
    clearTimeout(upT);
    upT = setTimeout(flush, 10000);
  }
  async function flush() {
    if (!session || pending === null) return;
    // 排程期間換了 GitHub 帳號：丟掉（不把別人的存檔傳到現在的帳號）
    if (pending.login !== session.login || pending.token !== session.token) { pending = null; return; }
    const content = pending.json; pending = null;
    try {
      const files = { [FILE]: { content } };
      const r = session.gistId
        ? await gh(`/gists/${session.gistId}`, { method: 'PATCH', body: { files } })
        : await gh('/gists', { method: 'POST', body: { description: DESC, public: false, files } });
      if (!r.ok) { Telemetry.error('GitHub 存檔失敗：' + ((r.data && r.data.message) || r.status), 'cloud'); return; }
      if (!session.gistId) keep({ ...session, gistId: r.data.id });
      Telemetry.event('GitHub 存檔');
    } catch (e) { Telemetry.error('GitHub 存檔失敗：' + e.message, 'cloud'); }
  }
  // 下載：回傳 { data } 或 null（檔案太大被截斷時改讀 raw_url）
  async function download() {
    if (!session || !session.gistId) return null;
    const r = await gh(`/gists/${session.gistId}`);
    if (!r.ok) return null;
    const f = r.data.files && r.data.files[FILE];
    if (!f) return null;
    let text = f.content;
    if (f.truncated) { const raw = await fetch(f.raw_url); text = await raw.text(); }
    try { return { data: JSON.parse(text), updated_at: r.data.updated_at }; } catch { return null; }
  }
  return { connect, disconnect, upload, flush, download, get name() { return session && session.login; }, get session() { return session; } };
})();
