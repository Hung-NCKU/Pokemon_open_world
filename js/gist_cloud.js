// GitHub Gist 存檔同步（跨平台：本機 file://、線上版、手機共用同一份存檔）
// - 每個玩家用自己的 GitHub 帳號：建立一把「只有 gist 權限」的金鑰（token），在每台裝置的遊戲裡輸入一次
// - 金鑰只存在這台裝置的瀏覽器（localStorage），不會出現在網頁原始碼裡；外流也只能動 gist，碰不到儲存庫
// - 存檔存在玩家帳號底下的一個私人 gist（檔名 pokemon_openworld_save.json），以存檔時間 savedAt 判斷哪邊比較新
// 和 cloud.js（Supabase）提供相同的介面，Account 依設定選用其中一個
import { Telemetry } from './telemetry.js';
import { UI } from './core.js';
import { syncJournal, revisionOf, revisionId } from './sync_journal.js';
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
      if (!r.ok) throw new Error('無法讀取 GitHub 存檔清單：' + r.status);
      if (!Array.isArray(r.data) || !r.data.length) return null;
      const g = r.data.find(x => x.files && x.files[FILE]);
      if (g) return g.id;
    }
    return null;
  }

  // 連結：驗證金鑰、找出（或之後建立）存檔 gist
  async function connect(token) {
    token = (token || '').trim();
    if (!token) return { ok: false, error: '請輸入金鑰' };
    const g = ++gen;
    const u = await gh('/user', { token });
    if (g !== gen) return { ok: false, error: '已取消連結' };
    if (!u.ok) return { ok: false, error: u.status === 401 ? '金鑰無效或已過期' : '無法連線到 GitHub' };
    const gistId = await findGist(token);
    if (g !== gen) return { ok: false, error: '已取消連結' };
    keep({ token, login: u.data.login, gistId });
    return { ok: true, login: u.data.login, found: !!gistId };
  }
  let gen = 0; // 連結世代：每次連結、中斷都加一
  function disconnect() { clearTimeout(upT); clearTimeout(retryT); upT = retryT = null; gen++; keep(null); status = 'idle'; }
  const identity = () => (session ? gen + ':' + session.login : null);

  const journal = () => syncJournal('gist', session.login);
  let upT = null, retryT = null, status = 'idle', attempts = 0;
  function upload(json) {
    if (!session) return;
    try { journal().stage(json); } catch { status = 'failed'; return; }
    status = journal().get().conflict ? 'conflict' : 'syncing';
    clearTimeout(upT); upT = setTimeout(flush, 10000);
  }
  let chain = Promise.resolve();
  function flush() { clearTimeout(upT); clearTimeout(retryT); upT = retryT = null; chain = chain.then(send, send); return chain; }
  function conflict(j, remote) {
    j.conflict(remote); status = 'conflict';
    UI.banner?.('發現 GitHub 上另一份進度，兩份都已保留；請到「帳號」處理同步衝突');
  }
  async function send() {
    if (!session) return;
    const j = journal(), state = j.get(), json = state.pending;
    if (!json || state.conflict) { if (state.conflict) status = 'conflict'; return; }
    const id = identity();
    try {
      status = 'syncing';
      const remote = await download();
      if (identity() !== id) return;
      if (revisionOf(remote) !== (state.head ?? null)) { conflict(j, remote); return; }
      const data = { ...JSON.parse(json), syncRevision: revisionId() };
      const content = JSON.stringify(data), files = { [FILE]: { content } };
      // Gist keeps each update in its revision history. Also retain our last branch locally.
      j.remember(json);
      const r = session.gistId
        ? await gh(`/gists/${session.gistId}`, { method: 'PATCH', body: { files } })
        : await gh('/gists', { method: 'POST', body: { description: DESC, public: false, files } });
      if (identity() !== id) return;
      if (!r.ok) throw new Error((r.data && r.data.message) || String(r.status));
      if (!session.gistId) keep({ ...session, gistId: r.data.id });
      const latest = await download();
      if (identity() !== id) return;
      if (latest?.data?.syncRevision !== data.syncRevision) { conflict(j, latest); return; }
      j.ack(json, data.syncRevision); attempts = 0;
      status = j.get().conflict ? 'conflict' : j.get().pending ? 'syncing' : 'saved';
      Telemetry.event('GitHub 存檔');
      if (j.get().pending && !j.get().conflict) upT = setTimeout(flush, 0);
    } catch (e) {
      if (identity() !== id) return;
      status = 'failed';
      Telemetry.error('GitHub 存檔失敗：' + e.message, 'cloud');
      UI.banner?.('雲端同步失敗：本機已保留，恢復連線後會重試');
      retryT = setTimeout(flush, Math.min(60000, 2000 * 2 ** Math.min(attempts++, 5)));
    }
  }
  // 下載：回傳 { data } 或 null（檔案太大被截斷時改讀 raw_url）
  async function download() {
    if (!session || !session.gistId) return null;
    const id = identity();
    const r = await gh(`/gists/${session.gistId}`);
    if (identity() !== id) return null;
    if (!r.ok) throw new Error('GitHub 下載失敗：' + r.status);
    const f = r.data.files && r.data.files[FILE];
    if (!f) return null;
    let text = f.content;
    if (f.truncated) { const raw = await fetch(f.raw_url); if (!raw.ok) throw new Error('GitHub 下載失敗'); text = await raw.text(); if (identity() !== id) return null; }
    try { return { data: JSON.parse(text), updated_at: r.data.updated_at }; } catch { throw new Error('GitHub 存檔格式損毀，已保留本機進度'); }
  }
  function accept(row) { if (session) { const j = journal(); j.observe(revisionOf(row)); j.clearConflict(); } }
  function markConflict(row) { if (session) conflict(journal(), row); }
  function discardPending(row) { if (session) { const j = journal(); j.ack(j.get().pending, revisionOf(row)); status = 'saved'; } }
  function getJournal() { return session ? journal().get() : {}; }
  return { connect, disconnect, upload, flush, download, identity, accept, getJournal, markConflict, discardPending, get status() { return status; }, get name() { return session && session.login; }, get session() { return session; } };
})();

export { GistCloud };
