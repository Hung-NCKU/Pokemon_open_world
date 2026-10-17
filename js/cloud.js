// 雲端帳號與存檔（Supabase：Auth ＋ 一張 saves 資料表），用 fetch 直接呼叫 REST API，不需要額外的套件
// - 帳號名稱對應成內部用的電子郵件（名稱@pokemon-openworld.app），玩家只需要記帳號名稱與密碼
// - 登入後的 token 記在 localStorage（各網址各自記住登入狀態；存檔本身在雲端，所以兩邊看到同一份）
// - 存檔：存檔時同時上傳（合併 2 秒內的多次存檔）；開啟標題畫面時下載雲端的存檔，比本機新就用雲端的
import { UI } from './core.js';
import { Telemetry } from './telemetry.js';
import { syncJournal, revisionOf, revisionId } from './sync_journal.js';
const Cloud = (() => {
  const cfg = () => window.CLOUD_CONFIG || {};
  const enabled = () => !!(cfg().url && cfg().anonKey);
  const SES = 'pkmn_cloud_session';
  const email = name => encodeURIComponent(name).replace(/%/g, '_').toLowerCase() + '@pokemon-openworld.app';
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SES) || 'null'); } catch { }
  // 登入世代：每次登入、註冊、登出都加一。非同步的回覆、排程的上傳都記住自己的世代，
  // 世代不同（中途登出或換了帳號）就丟掉，避免 A 帳號的存檔被送到 B 帳號、或舊的登入回覆蓋掉新的登入
  let gen = 0;
  let status = 'idle'; // idle／syncing／saved／failed
  const keep = s => { session = s; try { s ? localStorage.setItem(SES, JSON.stringify(s)) : localStorage.removeItem(SES); } catch { } };

  async function call(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
    const h = { apikey: cfg().anonKey, 'Content-Type': 'application/json', ...headers };
    if (auth && session) h.Authorization = 'Bearer ' + session.access_token;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    let r;
    try { r = await fetch(cfg().url.replace(/\/$/, '') + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal }); }
    finally { clearTimeout(timer); }
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  }
  const errMsg = d => (d && (d.msg || d.message || d.error_description || d.error)) || '連線失敗';
  function setSession(d, name) {
    keep({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, user_id: d.user && d.user.id, name });
  }
  // token 過期前自動更新
  async function fresh() {
    if (!session) return false;
    if (Date.now() < session.expires_at - 60000) return true;
    const g = gen, name = session.name;
    const r = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token }, auth: false });
    if (g !== gen) return false;               // 更新期間登出或換了帳號
    if (!r.ok) { keep(null); return false; }
    setSession(r.data, name);
    return true;
  }

  async function register(name, pw) {
    cancelUpload(); const g = ++gen;
    const r = await call('/auth/v1/signup', { method: 'POST', body: { email: email(name), password: pw, data: { name } }, auth: false });
    if (g !== gen) return { ok: false, error: '已取消' };
    if (!r.ok) return { ok: false, error: /registered|exists/i.test(errMsg(r.data)) ? '這個帳號名稱已經有人使用了' : errMsg(r.data) };
    if (!r.data.access_token) return { ok: false, error: '雲端要求電子郵件確認：請在 Supabase 關閉「Confirm email」（見 docs/CLOUD_SETUP.md）' };
    setSession(r.data, name);
    return { ok: true };
  }
  async function login(name, pw) {
    cancelUpload(); const g = ++gen;
    const r = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email(name), password: pw }, auth: false });
    if (g !== gen) return { ok: false, error: '已取消' };
    if (!r.ok) return { ok: false, error: '帳號或密碼不正確' };
    setSession(r.data, name);
    return { ok: true };
  }
  function logout() { cancelUpload(); gen++; keep(null); status = 'idle'; }

  // Compare-and-swap uses a revision inside the existing JSONB column; no schema migration.
  const journal = () => syncJournal('supabase:' + cfg().url, session.user_id);
  let upT = null, retryT = null, attempts = 0;
  function cancelUpload() { clearTimeout(upT); clearTimeout(retryT); upT = retryT = null; }
  function upload(json) {
    if (!enabled() || !session) return;
    try { journal().stage(json); }
    catch { fail('無法保留待同步的存檔'); return; }
    status = journal().get().conflict ? 'conflict' : 'syncing';
    clearTimeout(upT);
    upT = setTimeout(flush, 2000);
  }
  let chain = Promise.resolve();
  function flush() { clearTimeout(upT); clearTimeout(retryT); upT = retryT = null; chain = chain.then(send, send); return chain; }
  async function readRemote() {
    const r = await call(`/rest/v1/saves?select=data,updated_at&user_id=eq.${encodeURIComponent(session.user_id)}`);
    if (!r.ok) throw new Error(errMsg(r.data));
    return Array.isArray(r.data) && r.data.length ? r.data[0] : null;
  }
  function conflict(j, remote) {
    j.conflict(remote);
    status = 'conflict';
    UI.banner?.('發現另一台裝置的進度，兩份都已保留；請到「帳號」處理同步衝突');
  }
  async function send() {
    if (!enabled() || !session) return;
    const j = journal(), state = j.get(), json = state.pending;
    if (!json || state.conflict) { if (state.conflict) status = 'conflict'; return; }
    const g = gen, uid = session.user_id;
    const same = () => g === gen && session?.user_id === uid;
    try {
      status = 'syncing';
      if (!(await fresh()) || !same()) return;
      const remote = await readRemote();
      if (!same()) return;
      const head = revisionOf(remote);
      // Unknown ancestry with an existing remote must be resolved, never blindly overwritten.
      if (head !== (state.head ?? null)) { conflict(j, remote); return; }
      const data = { ...JSON.parse(json), syncRevision: revisionId() };
      const body = { user_id: uid, data, updated_at: new Date().toISOString() };
      let r;
      if (remote) {
        const filter = remote.data?.syncRevision
          ? 'data->>syncRevision=eq.' + encodeURIComponent(remote.data.syncRevision)
          : 'data->>syncRevision=is.null' + (remote.updated_at ? '&updated_at=eq.' + encodeURIComponent(remote.updated_at) : '');
        r = await call('/rest/v1/saves?user_id=eq.' + encodeURIComponent(uid) + '&' + filter,
          { method: 'PATCH', headers: { Prefer: 'return=representation' }, body });
      } else r = await call('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'return=representation' }, body });
      if (!same()) return;
      if (r.status === 409 || (r.ok && remote && (!Array.isArray(r.data) || r.data.length !== 1))) {
        const latest = await readRemote();
        if (same()) conflict(j, latest);
        return;
      }
      if (!r.ok) throw new Error(errMsg(r.data));
      j.ack(json, data.syncRevision); attempts = 0;
      status = j.get().conflict ? 'conflict' : j.get().pending ? 'syncing' : 'saved';
      Telemetry.event('雲端存檔');
      if (j.get().pending && !j.get().conflict) upT = setTimeout(flush, 0);
    } catch (e) {
      if (same()) {
        fail(e.message);
        retryT = setTimeout(flush, Math.min(60000, 2000 * 2 ** Math.min(attempts++, 5)));
      }
    }
  }
  function fail(msg) {
    status = 'failed';
    Telemetry.error('雲端存檔失敗：' + msg, 'cloud');
    UI.banner?.('雲端同步失敗：本機已保留，恢復連線後會重試');
  }
  async function download() {
    if (!enabled() || !session) return null;
    const g = gen, uid = session.user_id;
    if (!(await fresh()) || g !== gen || session?.user_id !== uid) return null;
    const row = await readRemote();
    return g === gen && session?.user_id === uid ? row : null;
  }
  function accept(row) { if (session) { const j = journal(); j.observe(revisionOf(row)); j.clearConflict(); } }
  function markConflict(row) { if (session) conflict(journal(), row); }
  function discardPending(row) { if (session) { const j = journal(); j.ack(j.get().pending, revisionOf(row)); status = 'saved'; } }
  function getJournal() { return session ? journal().get() : {}; }
  const identity = () => (session ? gen + ':' + session.user_id : null);
  return { enabled, register, login, logout, upload, flush, download, identity, accept, getJournal, markConflict, discardPending,
    get status() { return status; }, get name() { return session && session.name; }, get session() { return session; } };
})();

export { Cloud };
