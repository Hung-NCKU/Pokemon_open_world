import { test, expect } from '@playwright/test';
test.setTimeout(60000);

const host = 'https://sync.test.supabase.co';
async function mockServer(context, server) {
  await context.route(host + '/**', async route => {
    const req = route.request(), url = new URL(req.url()), body = req.postDataJSON();
    const send = (status, data) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.startsWith('/auth/')) return send(200, { access_token: 'test:uid', refresh_token: 'r', expires_in: 3600, user: { id: 'uid' } });
    if (server.offline) return send(503, { message: 'offline' });
    if (req.method() === 'GET') {
      const snapshot = structuredClone(server.row);
      if (server.barrier && ++server.reads <= 2) { if (server.reads === 2) server.release(); await server.barrier; }
      return send(200, snapshot ? [snapshot] : []);
    }
    if (req.method() === 'POST' && server.row) return send(409, { message: 'duplicate' });
    if (req.method() === 'PATCH') {
      const filter = url.searchParams.get('data->>syncRevision');
      if (filter !== (server.row?.data.syncRevision ? 'eq.' + server.row.data.syncRevision : 'is.null')) return send(200, []);
    }
    server.row = body; return send(200, [body]);
  });
}
async function login(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.Account && window.Game);
  await page.evaluate(async host => {
    window.CLOUD_CONFIG = { url: host, anonKey: 'test' };
    await Cloud.login('測試', 'secret12');
  }, host);
}
async function localSave(page, money) {
  await page.evaluate(money => {
    if (!G.state) { G.state = Game.newState('可靠性測試', 'kanto', 1); G.state.party = [Mon.create(1, 5)]; }
    G.state.money = money; Game.save(true);
  }, money);
}

test('兩台裝置同時寫入：CAS 只接受一份，另一份保留可復原', async ({ browser }) => {
  const server = { row: null }, contexts = await Promise.all([browser.newContext({ baseURL: test.info().project.use.baseURL, serviceWorkers: 'block' }), browser.newContext({ baseURL: test.info().project.use.baseURL, serviceWorkers: 'block' })]);
  try {
    for (const c of contexts) await mockServer(c, server);
    const [a, b] = await Promise.all(contexts.map(c => c.newPage()));
    await Promise.all([login(a), login(b)]);
    await localSave(a, 100); await a.evaluate(() => Cloud.flush());
    await b.evaluate(async () => { await Account.sync(); G.state = Game.loadSave().state; });
    await localSave(a, 200); await localSave(b, 300);
    server.reads = 0; server.barrier = new Promise(resolve => { server.release = resolve; });
    await Promise.all([a.evaluate(() => Cloud.flush()), b.evaluate(() => Cloud.flush())]);
    const states = await Promise.all([a, b].map(p => p.evaluate(() => ({ status: Cloud.status, queue: Cloud.getJournal(), local: Game.loadSave().state.money }))));
    expect(states.map(s => s.status).sort()).toEqual(['conflict', 'saved']);
    const loser = states.find(s => s.status === 'conflict');
    expect(JSON.parse(loser.queue.pending).money).toBe(loser.local);
    expect(loser.queue.conflict.data.money).toBe(server.row.data.money);
    expect([200, 300]).toContain(server.row.data.money);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});

test('同步失敗後重開頁面，online 事件補傳持久保存的進度', async ({ context, page }) => {
  const server = { row: null, offline: true }; await mockServer(context, server);
  await login(page); await localSave(page, 777);
  await page.evaluate(() => Cloud.flush());
  expect(await page.evaluate(() => Cloud.status)).toBe('failed');
  await page.reload();
  await page.waitForFunction(() => window.Cloud);
  server.offline = false;
  await page.evaluate(host => { window.CLOUD_CONFIG = { url: host, anonKey: 'test' }; window.dispatchEvent(new Event('online')); }, host);
  await expect.poll(() => server.row?.data.money).toBe(777);
  expect(await page.evaluate(() => Cloud.getJournal().pending)).toBeUndefined();
});

test('損毀的雲端資料不能覆蓋本機；額滿寫入不能回報下載成功', async ({ context, page }) => {
  const server = { row: null }; await mockServer(context, server); await login(page);
  await localSave(page, 123); await page.evaluate(() => Cloud.flush());
  const original = await page.evaluate(() => localStorage.getItem(Account.saveKey()));
  server.row = { data: { savedAt: '2099-01-01', party: [] } };
  expect(await page.evaluate(() => Account.sync())).toBe('error');
  expect(await page.evaluate(() => localStorage.getItem(Account.saveKey()))).toBe(original);
  server.row = { data: { ...JSON.parse(original), savedAt: '2099-01-01T00:00:00Z', money: 999, syncRevision: 'other' } };
  expect(await page.evaluate(async () => {
    const original = Storage.prototype.setItem, key = Account.saveKey();
    Storage.prototype.setItem = function (k, v) { if (k === key) throw new DOMException('full', 'QuotaExceededError'); return original.call(this, k, v); };
    try { return await Account.sync(); } finally { Storage.prototype.setItem = original; }
  })).toBe('error');
  expect(await page.evaluate(() => localStorage.getItem(Account.saveKey()))).toBe(original);
});

test('切背景只保存安全野外狀態，不保存對戰塔或戰鬥中隊伍', async ({ page }) => {
  await page.goto('/tests/ui_tour.html#world'); await page.waitForFunction(() => document.title === 'READY world');
  const result = await page.evaluate(async () => {
    const { checkpoint } = await import('/js/lifecycle.js');
    const original = Game.save; let saves = 0; Game.save = () => { saves++; return true; };
    try {
      G.busy = false; G.move = null; G.tower = null; G.mode = 'world';
      await checkpoint(); const safe = saves;
      G.mode = 'battle'; await checkpoint(); G.mode = 'world';
      G.tower = {}; await checkpoint(); G.tower = null;
      G.busy = true; await checkpoint(); G.busy = false;
      return { safe, saves };
    } finally { Game.save = original; }
  });
  expect(result).toEqual({ safe: 1, saves: 1 });
});

test('任務節奏紀錄可匯出，固定亂數可重現遇敵判定來源', async ({ page }) => {
  await page.goto('/tests/ui_tour.html#world'); await page.waitForFunction(() => document.title === 'READY world');
  const result = await page.evaluate(() => {
    const start = G.state.playMs; Telemetry.progress();
    G.state.playMs = start + 62000; Telemetry.battle('gym', 'lose', -5, 8);
    const j = Telemetry.progress();
    U.seed(42); const a = Array.from({ length: 20 }, () => U.rand());
    U.seed(42); const b = Array.from({ length: 20 }, () => U.rand()); U.unseed();
    return { phase: j.phases[j.stage], exported: !!Telemetry.report().journeys, deterministic: JSON.stringify(a) === JSON.stringify(b) };
  });
  expect(result.phase.losses).toBe(1); expect(result.phase.elapsedMs).toBeGreaterThanOrEqual(61000);
  expect(result.exported).toBe(true); expect(result.deterministic).toBe(true);
});

test('GitHub 衝突不覆寫遠端，選擇雲端後仍保留本機復原副本', async ({ page }) => {
  await page.goto('/'); await page.waitForFunction(() => window.GistCloud && window.Game);
  const result = await page.evaluate(async () => {
    const fetch = window.fetch, choose = UI.choose, say = UI.say;
    const state = Game.newState('Gist 測試', 'kanto', 1); state.party = [Mon.create(1, 5)];
    state.savedAt = '2026-01-01T00:00:00Z'; state.syncRevision = 'head1'; state.money = 100;
    let remote = structuredClone(state), writes = 0;
    const reply = data => Promise.resolve({ ok: true, status: 200, text: async () => JSON.stringify(data) });
    window.fetch = (url, options = {}) => {
      const path = new URL(url).pathname;
      if (path === '/user') return reply({ login: 'gist-test' });
      if (path === '/gists') return reply([{ id: 'g1', files: { 'pokemon_openworld_save.json': {} } }]);
      if (options.method === 'PATCH') { writes++; remote = JSON.parse(JSON.parse(options.body).files['pokemon_openworld_save.json'].content); return reply({ id: 'g1' }); }
      return reply({ files: { 'pokemon_openworld_save.json': { content: JSON.stringify(remote), truncated: false } } });
    };
    try {
      await GistCloud.connect('mock-token'); await Account.sync();
      G.state = Game.loadSave().state; G.state.money = 300;
      remote.money = 200; remote.syncRevision = 'head2';
      Game.save(true); await GistCloud.flush();
      const conflict = GistCloud.status, before = writes;
      UI.choose = async () => 1; UI.say = async () => {};
      await Account.conflictMenu();
      const key = Account.saveKey();
      return { conflict, before, money: Game.loadSave().state.money,
        local: JSON.parse(localStorage.getItem(key + '_conflict_local')).money,
        remote: JSON.parse(localStorage.getItem(key + '_conflict_remote')).money,
        pending: GistCloud.getJournal().pending };
    } finally { GistCloud.disconnect(); window.fetch = fetch; UI.choose = choose; UI.say = say; }
  });
  expect(result).toEqual({ conflict: 'conflict', before: 0, money: 200, local: 300, remote: 200, pending: undefined });
});
