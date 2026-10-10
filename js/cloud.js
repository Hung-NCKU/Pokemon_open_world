// 雲端帳號與存檔（Supabase：Auth ＋ 一張 saves 資料表），用 fetch 直接呼叫 REST API，不需要額外的套件
// - 帳號名稱對應成內部用的電子郵件（名稱@pokemon-openworld.app），玩家只需要記帳號名稱與密碼
// - 登入後的 token 記在 localStorage（各網址各自記住登入狀態；存檔本身在雲端，所以兩邊看到同一份）
// - 存檔：存檔時同時上傳（合併 2 秒內的多次存檔）；開啟標題畫面時下載雲端的存檔，比本機新就用雲端的
const Cloud = (() => {
  const cfg = () => window.CLOUD_CONFIG || {};
  const enabled = () => !!(cfg().url && cfg().anonKey);
  const SES = 'pkmn_cloud_session';
  const email = name => encodeURIComponent(name).replace(/%/g, '_').toLowerCase() + '@pokemon-openworld.app';
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SES) || 'null'); } catch { }
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
    const r = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token }, auth: false });
    if (!r.ok) { keep(null); return false; }
    setSession(r.data, session.name);
    return true;
  }

  async function register(name, pw) {
    const r = await call('/auth/v1/signup', { method: 'POST', body: { email: email(name), password: pw, data: { name } }, auth: false });
    if (!r.ok) return { ok: false, error: /registered|exists/i.test(errMsg(r.data)) ? '這個帳號名稱已經有人使用了' : errMsg(r.data) };
    if (!r.data.access_token) return { ok: false, error: '雲端要求電子郵件確認：請在 Supabase 關閉「Confirm email」（見 docs/CLOUD_SETUP.md）' };
    setSession(r.data, name);
    return { ok: true };
  }
  async function login(name, pw) {
    const r = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email(name), password: pw }, auth: false });
    if (!r.ok) return { ok: false, error: '帳號或密碼不正確' };
    setSession(r.data, name);
    return { ok: true };
  }
  function logout() { keep(null); }

  // 存檔：upsert 到 saves（每個帳號一份），2 秒內的多次存檔只上傳最後一次
  let upT = null, pending = null;
  function upload(json) {
    if (!enabled() || !session) return;
    pending = json;
    clearTimeout(upT);
    upT = setTimeout(async () => {
      const data = pending; pending = null;
      try {
        if (!(await fresh())) return;
        const r = await call('/rest/v1/saves?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' },
          body: { user_id: session.user_id, data: JSON.parse(data), updated_at: new Date().toISOString() } });
        if (!r.ok) Telemetry.error('雲端存檔失敗：' + errMsg(r.data), 'cloud');
        else Telemetry.event('雲端存檔');
      } catch (e) { Telemetry.error('雲端存檔失敗：' + e.message, 'cloud'); }
    }, 2000);
  }
  // 下載：回傳 { data, updated_at } 或 null
  async function download() {
    if (!enabled() || !session || !(await fresh())) return null;
    const r = await call(`/rest/v1/saves?select=data,updated_at&user_id=eq.${session.user_id}`);
    if (!r.ok || !Array.isArray(r.data) || !r.data.length) return null;
    return r.data[0];
  }
  return { enabled, register, login, logout, upload, download, get name() { return session && session.name; }, get session() { return session; } };
})();
