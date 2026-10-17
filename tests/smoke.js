// 冒煙測試：用遊戲本身的流程快速走過主要功能，確認「整個遊戲接起來」沒有出錯
// 新遊戲 → 進出室內 → 單打 → 雙打 → 存檔與讀檔 → 雲端同步失敗（模擬） → 畫面提示
// 和 engine_test.html（單一機制）、playthrough.html（打到冠軍，很久）互補：這個幾秒就跑完，每次修改後都可以跑
(() => {
  const results = [], errors = [];
  const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
  const moveId = sd => +Object.keys(SHOWDOWN.moves).find(k => SHOWDOWN.moves[k].id === sd);
  window.addEventListener('error', e => errors.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const realErr = console.error;
  console.error = (...a) => { errors.push(a.map(x => (x && x.stack) ? x.stack.split('\n').slice(0, 3).join(' | ') : String(x)).join(' ')); realErr(...a); };

  // 不等待動畫與對話；選項一律選第一個可以選的（戰鬥中＝「戰鬥」→ 第一個招式）
  U.sleep = () => Promise.resolve();
  UI.say = async () => { };
  UI.panel = async () => { };
  UI.input = async (p, d) => d || '測試';
  UI.list = async () => 0;
  UI.choose = async opts => { const i = opts.findIndex(x => !(x && x.disabled)); return i < 0 ? 0 : i; };
  Game.dexEntry = async () => { };
  G.skipLevelWindow = true; // 升級的能力視窗要按鍵才關，這裡不等
  Sound.sfx = () => { }; Sound.play = () => { }; Sound.jingle = async () => { };
  for (const k of ['moveAnim', 'anim', 'trainerIntro', 'trainerLeave', 'wildIntro']) Battle.prototype[k] = async () => { };
  Battle.prototype.catchAnim = async function () { return null; };

  async function run() {
    // 這一頁和遊戲共用 localStorage（file:// 的網頁共用同一份）：先備份玩家的資料，結束時還原
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^pkmn/.test(k)) backup[k] = localStorage.getItem(k); }
    const realFetch = window.fetch, realCfg = window.CLOUD_CONFIG;
    window.CLOUD_CONFIG = { url: '', anonKey: '', github: false };
    if (Cloud.session) Cloud.logout();
    try {
      // 1. 新遊戲
      U.seed(7);
      const st = Game.newState('冒煙', 'kanto', 1);
      const starter = Mon.create(4, 12);
      starter.moves = [{ id: moveId('ember'), pp: 25 }, { id: moveId('scratch'), pp: 35 }];
      const buddy = Mon.create(7, 12);
      buddy.moves = [{ id: moveId('watergun'), pp: 25 }];
      st.party = [starter, buddy];
      Game.start(st, true);
      check('新遊戲：進入野外，玩家站在家門口', G.mode === 'world' && World.tile(G.state.x, G.state.y) !== undefined && !!World.homeTown);

      // 1b. 按鍵（GBA 模擬器的配置）：Shift＋F1～F12 即時存檔、F1～F12 讀檔；Enter＝START（選單）；按住 X 奔跑
      {
        const key = (k, o = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...o }));
        const up = k => window.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
        // Reloading this test document would restart the suite. Real scene reset
        // and combat reloads are covered in quickstates.spec.js; keep this key test local.
        const realRead = Game.readQuickState;
        Game.readQuickState = async n => {
          const data = JSON.parse(localStorage.getItem(Game.slotKey(n)) || 'null');
          if (!data) return false;
          const { unpackGraph } = await import('../js/quick_states.js');
          Game.start(data.quickVersion === 2 ? unpackGraph(data.graph).state : data);
          return true;
        };
        const money0 = G.state.money, x0 = G.state.x;
        key('F2', { shiftKey: true });
        G.state.money += 777; G.state.x += 1;
        key('F2');
        await new Promise(r => setTimeout(r, 100));
        check('即時存檔：Shift＋F2 存檔、F2 讀回原本的狀態', G.state.money === money0 && G.state.x === x0 && G.mode === 'world', `${G.state.money}/${money0}`);
        key('F7');
        await Promise.resolve();
        check('即時存檔：沒有存檔的格子不會讀取', G.state.money === money0 && G.mode === 'world');
        key('x');
        check('按住 X 奔跑（GBA 的 B 鍵）', Game.running());
        up('x');
        check('放開 X 停止奔跑', !Game.running());
        Game.readQuickState = realRead;
        // Enter＝START：在野外打開開始選單（這一頁的 UI.choose 是自動選第一項的替身，所以只確認有呼叫選單）
        const realMenu = Game.mainMenu;
        let menuCalls = 0;
        Game.mainMenu = async () => { menuCalls++; };
        key('Enter'); up('Enter');
        await new Promise(r => setTimeout(r, 50));
        key('Escape'); up('Escape');
        await new Promise(r => setTimeout(r, 50));
        Game.mainMenu = realMenu;
        check('Enter 打開開始選單（START）；Esc 不再打開選單', menuCalls === 1, String(menuCalls));
        for (let n = 1; n <= 12; n++) try { localStorage.removeItem(Game.slotKey(n)); } catch { }
      }

      // 2. 進出室內
      const house = World.buildings.find(b => b.town === World.homeTown && typeof Interior !== 'undefined' && Interior.can(b));
      if (house) {
        await Game.enterBuilding(house);
        const inside = !!G.room;
        Interior.leave();
        check('室內：走進家裡再走出來', inside && !G.room, `inside=${inside}`);
      } else if (!window.INTERIORS) results.push({ name: '室內：走進家裡再走出來', ok: true, skipped: true }); // 沒有 assets/gen3 素材（例如 CI）
      else check('室內：家裡有室內地圖', false);

      // 3. 單打（野生）
      const wild = Mon.create(16, 3);
      const r1 = await Game.battle({ wild });
      check('單打：和野生寶可夢戰鬥到打倒對手', wild.hp <= 0, `${r1} / HP ${wild.hp}`);
      check('單打：結束後回到野外', G.mode === 'world');

      // 4. 雙打（訓練家）
      for (const m of G.party) { m.hp = Mon.maxHp(m); m.st = null; }
      const foes = [Mon.create(19, 3), Mon.create(16, 3)];
      foes.forEach(m => { m.moves = [{ id: moveId('tackle'), pp: 35 }]; });
      const r2 = await Game.battle({ trainer: { title: '雙胞胎', name: '冒煙', party: foes, kind: 'trainer', money: 10 }, double: true });
      check('雙打：和兩位對手的對戰打完', foes.every(m => m.hp <= 0) || G.party.every(m => m.hp <= 0), String(r2));
      check('雙打：結束後回到野外', G.mode === 'world');

      // 5. 存檔與讀檔
      G.state.money = 4321;
      const saved = Game.save(true);
      const loaded = Game.loadSave();
      check('存檔與讀檔：讀回相同的金錢與隊伍', saved && loaded && loaded.state.money === 4321 && loaded.state.party.length === G.party.length
        && loaded.state.party[0].sp === G.party[0].sp, loaded && loaded.error);

      // 6. 雲端同步失敗（模擬伺服器錯誤）：顯示失敗的提示，本機的存檔仍然在
      window.CLOUD_CONFIG = { url: 'https://smoke.test', anonKey: 'anon', github: false };
      const reply = (status, obj) => Promise.resolve({ ok: status < 300, status, text: () => Promise.resolve(JSON.stringify(obj)) });
      window.fetch = async url => {
        const u = new URL(url);
        if (u.pathname === '/auth/v1/token') return reply(200, { access_token: 't', refresh_token: 'r', expires_in: 3600, user: { id: 'U1' } });
        if (u.pathname === '/rest/v1/saves') return reply(500, { message: '伺服器暫時無法使用' });
        return reply(404, {});
      };
      let banner = '';
      const realBanner = UI.banner;
      UI.banner = t => { banner = t; };
      await Cloud.login('冒煙', 'secret12');
      G.state.money = 5555;
      Game.save(true);
      await Cloud.flush();
      UI.banner = realBanner;
      const local = Game.loadSave();
      check('雲端同步失敗：狀態為失敗並提示玩家', Cloud.status === 'failed' && /雲端同步失敗/.test(banner), `${Cloud.status} / ${banner}`);
      check('雲端同步失敗：本機的存檔仍然是最新的', local && local.state.money === 5555);
      Cloud.logout();
      window.fetch = realFetch; window.CLOUD_CONFIG = { url: '', anonKey: '', github: false };

      // 7. 綠寶石介面：取名字、設定畫面、商店賣出、電腦
      if (typeof EmeraldUI !== 'undefined' && Gen3.on) {
        const press = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
        const p = EmeraldUI.naming('你的名字是？', '', { icon: 'player' });
        press('z'); press('ArrowRight'); press('z'); press('Enter');   // 輸入 A、B 後確定
        check('綠寶石取名字：用鍵盤輸入 AB 後確定', (await p) === 'AB' && !document.getElementById('naming'));
        const speed0 = G.settings.textSpeed ?? 22;
        const o = EmeraldUI.optionMenu();
        press('ArrowRight'); press('x');
        await o;
        check('綠寶石設定畫面：←→ 改文字速度，B 關閉', (G.settings.textSpeed ?? 22) !== speed0 && !document.getElementById('option'));
        G.settings.textSpeed = speed0;
        const realPick = BagUI.pick, money0 = G.state.money;
        G.state.bag.potion = 3;
        let picks = ['potion', null];
        BagUI.pick = async () => picks.shift();
        await EmeraldUI.sell();
        BagUI.pick = realPick;
        check('綠寶石商店：賣出傷藥得到一半的價錢', G.state.money - money0 === Math.floor(ITEMS.potion.price / 2) && G.state.bag.potion === 2, `${G.state.money - money0}`);
        const realOpen = StorageUI.open; let opened = null;
        StorageUI.open = async o => { opened = o; };
        let answers = [0, 0, 3, 2];
        const realChoose = UI.choose; UI.choose = async () => answers.shift();
        await EmeraldUI.pc();
        UI.choose = realChoose; StorageUI.open = realOpen;
        check('綠寶石電腦：某人的電腦 → 領取寶可夢 → 以領取模式打開箱子', opened && opened.option === 'withdraw');
        // 箱子：領取（箱子 → 隊伍）與寄放（隊伍 → 選的箱子）
        const boxed = Mon.create(41, 10);
        G.state.box = [boxed]; delete boxed.boxPos;
        const n0 = G.party.length;
        const realChoose2 = UI.choose; UI.choose = async () => 0;
        let st = StorageUI.open({ option: 'withdraw' });
        press('z'); await new Promise(r => setTimeout(r, 50)); press('x'); await st;
        check('箱子：領取模式選箱子裡的寶可夢 →「領取」→ 加入隊伍', G.party.includes(boxed) && !G.state.box.includes(boxed) && G.party.length === n0 + 1);
        st = StorageUI.open({ option: 'deposit' });
        press('ArrowRight'); press('ArrowUp'); press('ArrowUp'); press('ArrowUp'); press('ArrowUp'); press('ArrowUp');  // 右邊最下面的寶可夢（剛領取的）
        const target = G.party[G.party.length - 1];
        await new Promise(r => setTimeout(r, 20));
        press('z'); await new Promise(r => setTimeout(r, 50));
        const picking = !!document.querySelector('#storage .st-pick');
        press('ArrowRight'); press('z'); await new Promise(r => setTimeout(r, 50)); press('x'); await st;
        UI.choose = realChoose2;
        check('箱子：寄放模式選隊伍的寶可夢 →「寄放」→ 拎起來、出現選箱子的視窗 → → 換到箱子 2 → 放下', picking && !G.party.includes(target) && G.state.box.includes(target) && target.boxPos && target.boxPos.b === 1, `${picking} ${G.party.length} ${target.boxPos && target.boxPos.b}`);
      }

      // 8. 畫面提示：野外顯示下一步
      Hud.update();
      const goal = document.getElementById('goal');
      check('畫面提示：野外顯示任務的下一步', goal && /下一步：/.test(goal.textContent), goal && goal.textContent);
    } catch (e) {
      check('流程沒有例外', false, e.stack);
    } finally {
      window.fetch = realFetch; window.CLOUD_CONFIG = realCfg;
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/^pkmn/.test(k) && !(k in backup)) localStorage.removeItem(k); }
      for (const k in backup) localStorage.setItem(k, backup[k]);
    }
    check('過程中沒有錯誤訊息', !errors.length, errors.slice(0, 5).join('\n'));

    const pass = results.filter(r => r.ok).length;
    const out = document.createElement('pre');
    out.id = 'out';
    out.style.cssText = 'position:fixed;inset:0;z-index:999;margin:0;padding:16px;background:#fff;color:#000;font:14px/1.6 monospace;overflow:auto;white-space:pre-wrap';
    const skipped = results.filter(r => r.skipped).length;
    out.textContent = results.map(r => `${r.skipped ? '－' : r.ok ? '✔' : '✘'} ${r.name}${r.detail && !r.ok ? '\n    ' + r.detail : ''}`).join('\n') + `\n\n${pass}/${results.length} 通過` + (skipped ? `（${skipped} 個略過）` : '');
    document.body.appendChild(out);
    document.title = pass === results.length ? 'PASS' : 'FAIL';
  }
  window.addEventListener('load', () => setTimeout(() => run().catch(e => { document.title = 'FAIL'; document.body.textContent = 'EXC ' + e.stack; }), 300));
})();
