// 雲端帳號與存檔（Supabase：Auth ＋ 一張 saves 資料表），用 fetch 直接呼叫 REST API，不需要額外的套件
// - 帳號名稱對應成內部用的電子郵件（名稱@pokemon-openworld.app），玩家只需要記帳號名稱與密碼
// - 登入後的 token 記在 localStorage（各網址各自記住登入狀態；存檔本身在雲端，所以兩邊看到同一份）
// - 存檔：存檔時同時上傳（合併 2 秒內的多次存檔）；開啟標題畫面時下載雲端的存檔，比本機新就用雲端的
import { UI } from './core.js';
import { Telemetry } from './telemetry.js';
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
    const r = await fetch(cfg().url.replace(/\/$/, '') + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
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

  // 存檔：upsert 到 saves（每個帳號一份），2 秒內的多次存檔只上傳最後一次
  // 排程的資料綁定「當時的帳號」與登入世代；送出前再確認一次，不是同一個人就丟掉
  let upT = null, pending = null;
  function cancelUpload() { clearTimeout(upT); upT = null; pending = null; }
  function upload(json) {
    if (!enabled() || !session) return;
    pending = { json, uid: session.user_id, gen };
    status = 'syncing';
    clearTimeout(upT);
    upT = setTimeout(flush, 2000);
  }
  // 同一時間只有一個上傳在傳輸：新的上傳排在前一個完成之後，並且送出「當時最新」的存檔
  // （否則網路慢時，先送出的舊存檔可能比新存檔晚到伺服器，把雲端的進度蓋回舊的）
  let chain = Promise.resolve();
  function flush() { clearTimeout(upT); upT = null; chain = chain.then(send, send); return chain; }
  async function send() {
    const p = pending; pending = null;
    if (!p) return;
    const same = () => p.gen === gen && session && session.user_id === p.uid;
    try {
      if (!same() || !(await fresh()) || !same()) return;
      const r = await call('/rest/v1/saves?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' },
        body: { user_id: p.uid, data: JSON.parse(p.json), updated_at: new Date().toISOString() } });
      if (p.gen !== gen) return;
      if (!r.ok) fail(errMsg(r.data));
      else { status = 'saved'; Telemetry.event('雲端存檔'); }
    } catch (e) { if (p.gen === gen) fail(e.message); }
  }
  function fail(msg) {
    status = 'failed';
    Telemetry.error('雲端存檔失敗：' + msg, 'cloud');
    if (typeof UI !== 'undefined') UI.banner('雲端同步失敗：這次的存檔只存在這台裝置（下次存檔會再試）');
  }
  // 下載：回傳 { data, updated_at } 或 null
  // 下載期間登出或換了帳號：丟掉回覆（不把 A 的存檔交給 B）
  async function download() {
    if (!enabled() || !session) return null;
    const g = gen, uid = session.user_id;
    const same = () => g === gen && session && session.user_id === uid;
    if (!(await fresh()) || !same()) return null;
    const r = await call(`/rest/v1/saves?select=data,updated_at&user_id=eq.${uid}`);
    if (!same() || !r.ok || !Array.isArray(r.data) || !r.data.length) return null;
    return r.data[0];
  }
  // 目前的身分（登入世代＋使用者）：Account.sync 用來確認下載前後是同一個人
  const identity = () => (session ? gen + ':' + session.user_id : null);
  return { enabled, register, login, logout, upload, flush, download, identity, get status() { return status; }, get name() { return session && session.name; }, get session() { return session; } };
})();

export { Cloud };
