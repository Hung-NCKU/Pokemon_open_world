// 實際遊玩測試（不替換任何介面）：只用按鍵操作綠寶石的介面，看畫面上的元素決定下一步
// 情境一（豐緣，從標題畫面開始）：主選單 → 新遊戲 → 取名字 → 選地區與夥伴 → 走進研究所和博士說話 → 到草叢戰鬥
//   （捕捉、用傷藥、升級的能力視窗、忘記招式的畫面）→ 友好商店買傷藥 → 寶可夢中心治療 → 用開始選單記錄 → 讀回存檔確認
// 情境二（豐緣聯盟）：一支 Lv.70 的隊伍從聯盟旁開始，走進聯盟、四天王與冠軍逐一對戰，
//   房間之間用開始選單 → 背包 → 好傷藥補血；成為冠軍後確認冠軍後的內容（超級手環、對戰塔）
// 結果寫在畫面上（#out）並設定 document.title 為 PASS／FAIL；用 ?scenario=1 或 2 只跑一個情境
(() => {
  const results = [], log = [];
  const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); note((ok ? '✔ ' : '✘ ') + name + (detail ? '　' + detail : '')); };
  // 紀錄同時寫在頁面上（測試跑到一半也看得到進度）
  const note = t => {
    log.push(`[${(performance.now() / 1000).toFixed(1)}s] ${t}`);
    console.log('NATURAL ' + log[log.length - 1]); // 用 --enable-logging 看進度
    let el = document.getElementById('natlog');
    if (!el) { el = document.createElement('pre'); el.id = 'natlog'; el.style.display = 'none'; document.body.appendChild(el); }
    el.textContent = log.join('\n');
  };
  const errors = [];
  window.addEventListener('error', e => errors.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const realErr = console.error;
  console.error = (...a) => { errors.push(a.map(x => (x && x.stack) ? x.stack.split('\n').slice(0, 3).join(' | ') : String(x)).join(' ')); realErr(...a); };

  // ---------- 輸入：只送鍵盤事件 ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const kd = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const ku = k => document.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
  const tap = async (k, wait = 90) => { kd(k); await sleep(50); ku(k); await sleep(wait); };
  const $ = s => document.querySelector(s);
  const visible = el => el && !el.classList.contains('hidden') && el.offsetParent !== null;

  // ---------- 看畫面 ----------
  const choiceLabels = () => [...document.querySelectorAll('#choices .choice')].map(e => e.textContent.trim());
  const choiceIdx = () => [...document.querySelectorAll('#choices .choice')].findIndex(e => e.classList.contains('sel'));
  const dialogText = () => (visible($('#dialog')) ? $('#dialog-text').textContent : '');
  const idleWorld = () => G.mode === 'world' && !G.busy && !visible($('#dialog')) && !visible($('#choices'));
  // 在一般選單上把游標移到第 i 項（cols 欄）再按確認
  async function pickChoice(i) {
    const box = $('#choices'), cols = getComputedStyle(box).gridTemplateColumns.split(' ').length || 1;
    for (let n = 0; n < 40 && choiceIdx() !== i; n++) {
      const cur = choiceIdx();
      if (cols > 1 && Math.floor(cur / cols) === Math.floor(i / cols)) await tap(cur % cols < i % cols ? 'ArrowRight' : 'ArrowLeft', 40);
      else await tap(Math.floor(cur / cols) < Math.floor(i / cols) ? 'ArrowDown' : 'ArrowUp', 40);
    }
    await tap('z');
  }
  // 清單（UI.list）：.row.sel
  async function pickRow(i) {
    const rows = () => [...document.querySelectorAll('.modal .row')];
    for (let n = 0; n < 60; n++) {
      const cur = rows().findIndex(r => r.classList.contains('sel'));
      if (cur === i) break;
      await tap(cur < i ? 'ArrowDown' : 'ArrowUp', 40);
    }
    await tap('z');
  }
  // 背包（BagUI）：換口袋到 pocket，選名稱是 name 的道具
  async function pickBag(pocket, name) {
    for (let n = 0; n < 6 && $('#bag .bag-name').textContent !== pocket; n++) await tap('ArrowRight', 60);
    // 背包會記住上次的游標位置：先移到最上面再往下找
    for (let n = 0, last = null; n < 60; n++) {
      const t = ($('#bag .bag-row.sel') || {}).textContent;
      if (t === last && n > 0) break;
      last = t; await tap('ArrowUp', 30);
    }
    for (let n = 0; n < 60; n++) {
      const sel = $('#bag .bag-row.sel');
      if (sel && sel.textContent.startsWith(name)) { await tap('z'); return true; }
      if (sel && sel.textContent.startsWith('關閉背包')) break;
      await tap('ArrowDown', 40);
    }
    await tap('x');
    return false;
  }
  // 隊伍（PartyUI）：選第 k 隻
  async function pickParty(k) {
    if (k < 0) { await tap('x', 200); return; } // 不選：返回
    for (let n = 0; n < 10; n++) {
      const sel = $('#party .pslot.sel');
      if (sel && +sel.dataset.k === k) break;
      await tap('ArrowDown', 40);
    }
    await tap('z');
  }

  // 追蹤：記錄目前還在執行中的非同步函式（只記錄，不改變行為），逾時時看卡在哪裡
  const running = new Map();
  let seq = 0;
  function trace(obj, label) {
    for (const k of Object.getOwnPropertyNames(obj)) {
      const d = Object.getOwnPropertyDescriptor(obj, k);
      if (!d || typeof d.value !== 'function' || d.value.constructor.name !== 'AsyncFunction' || k === 'constructor') continue;
      const f = d.value;
      obj[k] = function (...a) { const id = ++seq; running.set(id, label + '.' + k); const p = f.apply(this, a); Promise.resolve(p).finally(() => running.delete(id)); return p; };
    }
  }
  for (const [o, l] of [[Battle.prototype, 'Battle'], [typeof DoubleBattle !== 'undefined' ? DoubleBattle.prototype : {}, 'Double'], [UI, 'UI'], [Sound, 'Sound'], [Game, 'Game'], [Story, 'Story']]) trace(o, l);
  const stuck = () => [...running.values()].slice(-8).join(' > ');
  // 目前畫面上有什麼（逾時時記錄）
  const describe = () => [G.mode, G.busy ? 'busy' : '', ...['#bag', '#party', '#summary', '#dex', '#card', '#naming', '#storage', '#option', '#mainmenu', '.shopui', '.modal', '.evolve', '#levelup-win'].filter(s => $(s)),
    $('#bag') ? `背包[${$('#bag .bag-name').textContent}]：${[...document.querySelectorAll('#bag .bag-row')].map(r => (r.classList.contains('sel') ? '▶' : '') + r.textContent).join('／')}` : '',
    $('#party') ? `隊伍游標 ${($('#party .pslot.sel') || {}).dataset?.k}` : '',
    visible($('#choices')) ? `選項[${$('#choices').className}]：${choiceLabels().join('／')}` : '', dialogText() ? `對話：${dialogText().slice(0, 40)}` : ''].filter(Boolean).join(' ');

  // ---------- 自動處理畫面上出現的東西，直到 until() 成立 ----------
  // policy：choose(prompt, labels) → 索引；list(title, rows) → 索引；battleMenu()、moveIdx()、bagChoice() 等
  const stats = { battles: 0, levelWin: 0, forget: 0, learned: 0, caught: 0, potions: 0, evolve: 0 };
  async function settle(policy, until = idleWorld, maxMs = 120000) {
    const t0 = performance.now();
    let idleTicks = 0;
    while (performance.now() - t0 < maxMs) {
      if (until()) { if (++idleTicks >= 3) return true; await sleep(80); continue; }
      idleTicks = 0;
      if ($('#title .press-start')) { await tap('z'); continue; }
      if ($('#mainmenu')) {
        const wins = [...document.querySelectorAll('#mainmenu .mm-win')].map(w => w.querySelector('.mm-h').textContent);
        const want = policy.mainMenu ? policy.mainMenu(wins) : 0;
        const cur = [...document.querySelectorAll('#mainmenu .mm-win')].findIndex(w => w.classList.contains('sel'));
        if (cur !== want) { await tap(cur < want ? 'ArrowDown' : 'ArrowUp', 60); continue; }
        await tap('z'); continue;
      }
      if ($('#naming')) { await tap('Enter'); continue; }
      if ($('#levelup-win')) { stats.levelWin++; await tap('z', 200); await tap('z', 200); continue; }
      if ($('#summary.sm-forget')) { stats.forget++; await tap('z', 300); continue; } // 忘記第一個招式
      if ($('.evolve')) { if (visible($('#dialog'))) { await tap('z', 200); } else await sleep(200); continue; }
      if ($('#bag')) { const [p, n] = policy.bagChoice ? policy.bagChoice() : ['道具', '傷藥']; await pickBag(p, n); continue; }
      if ($('#party')) { await pickParty(policy.partyPick ? policy.partyPick() : 0); continue; }
      if ($('#summary') || $('#dex') || $('#card')) { await tap('x', 200); continue; } // 能力頁、圖鑑頁（第一次捕捉時）、訓練家卡片：看完關掉
      if ($('.modal .row')) {
        const title = ($('.modal h2') || {}).textContent || '';
        const rows = [...document.querySelectorAll('.modal .row')].map(r => r.textContent);
        await pickRow(policy.list ? policy.list(title, rows) : 0); continue;
      }
      if ($('.modal')) { await tap('z'); continue; }
      if (visible($('#choices'))) {
        const labels = choiceLabels(), box = $('#choices');
        let i;
        if (box.classList.contains('battle-menu')) i = policy.battleMenu ? policy.battleMenu(labels) : 0;
        else if (box.classList.contains('move-menu')) i = policy.moveIdx ? policy.moveIdx(labels) : 0;
        else i = policy.choose ? policy.choose(dialogText(), labels) : 0;
        if (i < 0) { await tap('x'); continue; }
        await pickChoice(i); continue;
      }
      if (visible($('#dialog'))) {
        const t = dialogText();
        if (/學會了/.test(t)) stats.learned++;
        await tap('z', 120); continue;
      }
      await sleep(100);
    }
    note('等待逾時：' + describe() + '｜執行中：' + stuck());
    return false;
  }

  // ---------- 走路：在野外或室內用 BFS 找路，按住方向鍵一格一格走 ----------
  const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const pos = () => (G.room ? [Interior.room.x, Interior.room.y] : [G.state.x, G.state.y]);
  const canStep = (x, y) => (G.room ? Interior.walkable(x, y) : Game.walkable(x, y));
  function path(goal, maxN = 40000) {
    const [sx, sy] = pos(), key = (x, y) => x + ',' + y;
    const prev = new Map([[key(sx, sy), null]]), q = [[sx, sy]];
    while (q.length && prev.size < maxN) {
      const [x, y] = q.shift();
      if (goal(x, y)) {
        const out = []; let k = key(x, y);
        while (prev.get(k)) { const [d, pk] = prev.get(k); out.unshift(d); k = pk; }
        return out;
      }
      for (const [d, [dx, dy]] of Object.entries(DIRS)) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (prev.has(k) || !canStep(nx, ny)) continue;
        prev.set(k, [d, key(x, y)]);
        q.push([nx, ny]);
      }
    }
    return null;
  }
  // 走一步：按住方向鍵直到位置改變（或撞牆、開始對話、進入戰鬥）
  async function step(d) {
    const [x, y] = pos(), wasRoom = !!G.room;
    kd(d);
    for (let n = 0; n < 40; n++) {
      await sleep(30);
      const [nx, ny] = pos();
      // 開始移動（G.move）就放開方向鍵，一次只走一格
      if (G.move || nx !== x || ny !== y || G.busy || G.mode !== 'world' || !!G.room !== wasRoom) break;
    }
    const started = !!G.move;
    ku(d);
    for (let n = 0; n < 40 && G.move; n++) await sleep(30);
    const moved = started || pos()[0] !== x || pos()[1] !== y;
    if (!moved && G.mode === 'world' && !G.busy) note(`沒有移動：${d} frame=${G.frame} UI.active=${UI.active()} keys=${[...G.keys]} move=${!!G.move} dir=${G.state.dir} err=${(Telemetry.errors.slice(-1)[0] || {}).msg}`);
  }
  async function walkTo(goal, policy, label) {
    for (let tries = 0; tries < 30; tries++) {
      const p = path(goal);
      if (!p) { note(`找不到路：${label}（在 ${pos()}）`); return false; }
      note(`走到${label}：${p.length} 步（從 ${pos()}）`);
      if (!p.length) return true;
      for (const d of p) {
        await step(d);
        if (!idleWorld()) { await settle(policy); break; } // 路上被訓練家看到、遇到野生寶可夢……處理完再重新找路
      }
      const [x, y] = pos();
      if (goal(x, y)) return true;
      note(`還沒到${label}：在 ${pos()}，${G.mode}，busy=${G.busy}`);
    }
    return false;
  }
  // 面向某個方向按確認（和人說話、調查）
  async function face(d) { G.state.dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[d]; if (G.room) Interior.room.dir = G.state.dir; await sleep(60); }
  async function talk(d, policy) { await face(d); await tap('z', 200); await settle(policy, idleWorld, 900000); } // 說話後可能開始對戰（冠軍戰可能打很久）

  // ---------- 戰鬥策略：先丟球捕捉沒有的寶可夢，自己體力低時用傷藥，其他時候用最強的招式 ----------
  function battlePolicy(opts = {}) {
    let usingBall = false, usingPotion = false;
    return {
      choose: (prompt, labels) => {
        if (labels.includes('是') && /忘記一個招式/.test(prompt)) return labels.indexOf('是');
        if (labels.includes('否') && /放棄學習/.test(prompt)) return labels.indexOf('否');
        if (opts.choose) { const r = opts.choose(prompt, labels); if (r !== undefined) return r; }
        if (/要替換寶可夢嗎/.test(prompt) && labels.includes('否')) return labels.indexOf('否'); // 對手換人時不換
        if (labels.includes('繼續')) return labels.indexOf('繼續');   // 捕捉後：查看能力／取名／繼續
        if (labels.includes('是')) return labels.indexOf('是');
        return 0;
      },
      list: opts.list,
      mainMenu: opts.mainMenu,
      battleMenu: labels => {
        const b = G.battle, me = (b && b.me) || G.party.find(m => m.hp > 0) || G.party[0];
        const wild = b && b.wildMon, foe = b && b.foe;
        usingBall = usingPotion = false;
        if (wild && foe && opts.catchIt && opts.catchIt(foe) && (G.state.bag['poke-ball'] || 0) > 0) { usingBall = true; return labels.indexOf('背包'); }
        if (me && me.hp < Mon.maxHp(me) * .35 && (G.state.bag.potion || G.state.bag['hyper-potion'])) { usingPotion = true; return labels.indexOf('背包'); }
        return labels.indexOf('戰鬥');
      },
      moveIdx: labels => {
        const me = G.battle ? G.battle.me : G.party[0];
        let best = 0, bp = -1;
        me.moves.forEach((s, i) => { const m = MOVES[s.id]; const p = s.pp > 0 && m ? (m.p || 0) : -1; if (p > bp) { bp = p; best = i; } });
        return best;
      },
      bagChoice: () => (usingBall ? ['精靈球', '精靈球'] : G.state.bag['hyper-potion'] ? ['道具', '厲害傷藥'] : ['道具', '傷藥']),
      partyPick: () => {
        if (opts.partyPick) return opts.partyPick();
        // 戰鬥中：換上還能戰鬥、不在場上的寶可夢；用傷藥時：選受傷的那隻
        // 隊伍畫面的提示文字分辨是「換人」還是「用道具」
        const msg = ($('#party .pmsg') || {}).textContent || '';
        if (G.battle && (!usingPotion || /替換|下一隻|換上/.test(msg))) return Math.max(0, G.party.findIndex(m => m.hp > 0 && m !== G.battle.me));
        return Math.max(0, G.party.findIndex(m => m.hp > 0 && m.hp < Mon.maxHp(m)));
      },
    };
  }

  // ---------- 情境一：豐緣，從標題畫面開始 ----------
  async function scenario1() {
    note('情境一：豐緣從標題畫面開始');
    const keys = Object.keys(REGIONS);
    const pol = battlePolicy({
      mainMenu: wins => Math.max(0, wins.indexOf('新遊戲')),
      list: (title, rows) => (/哪個地區/.test(title) ? keys.indexOf('hoenn') : 0),
      catchIt: foe => !G.state.caught[foe.sp] && stats.caught < 2,
    });
    await settle(pol, () => G.mode === 'world' && G.state && idleWorld(), 120000);
    check('新遊戲：從主選單開始，選了豐緣與木守宮，進到野外', G.state && G.state.region === 'hoenn' && G.party[0] && G.party[0].sp === 252, G.state && G.state.region);
    const home = World.homeTown;
    // 研究所：走到門口往上走進去，和博士說話
    const lab = World.buildings.find(b => b.town === home && b.kind === 'lab');
    await walkTo((x, y) => x === lab.door.x && y === lab.door.y + 1, pol, '研究所門口');
    await step('ArrowUp'); await settle(pol, () => !!G.room && idleWorld());
    const prof = Interior.room.npcs.find(n => n.role === 'prof');
    await walkTo((x, y) => x === prof.x && y === prof.y + 1, pol, '博士前面');
    await talk('ArrowUp', pol);
    check('研究所：走進去和博士說話，任務開始', G.state.flags.q_hoenn, JSON.stringify(Object.keys(G.state.flags)));
    // 走出研究所
    await leaveRoom(pol);
    check('研究所：走出來回到野外', !G.room);
    // 草叢：找最近的草叢，來回走直到遇到野生寶可夢；打 10 場或到 Lv.12
    const lv0 = G.party[0].lv, caught0 = Object.keys(G.state.caught).length;
    const tall = (x, y) => World.tile(x, y) === T.TALL && !World.townAt(x, y);
    for (let round = 0; round < 80 && (stats.battles < 10 || G.party[0].lv < 10); round++) {
      if (!tall(...pos())) { if (!(await walkTo(tall, pol, '草叢'))) break; }
      const [x, y] = pos();
      // 旁邊可以走的格子（優先草叢）：來回走，每走進草叢一次就有機會遇到野生寶可夢
      const ds = Object.keys(DIRS).filter(d => canStep(x + DIRS[d][0], y + DIRS[d][1]));
      const side = ds.find(d => tall(x + DIRS[d][0], y + DIRS[d][1])) || ds[0];
      if (!side) break;
      const back = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft', ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp' }[side];
      for (let n = 0; n < 40 && G.mode === 'world'; n++) {
        await step(n % 2 ? back : side);
        if (G.mode === 'battle' || !idleWorld()) break;
      }
      if (G.mode === 'battle' || !idleWorld()) {
        stats.battles++;
        await settle(pol, idleWorld, 180000);
        if (stats.battles % 3 === 0) note(`第 ${stats.battles} 場後：Lv.${G.party[0].lv}，隊伍 ${G.party.length} 隻`);
      }
      // 隊伍都受傷了：回寶可夢中心
      if (G.party.every(m => m.hp < Mon.maxHp(m) * .4)) await centerHeal(pol);
    }
    stats.caught = Object.keys(G.state.caught).length - caught0;
    check('草叢：用按鍵打了多場野生戰鬥', stats.battles >= 10, `${stats.battles} 場`);
    check('升級：出現升級的能力視窗', G.party[0].lv > lv0 && stats.levelWin > 0, `Lv.${lv0}→${G.party[0].lv}，能力視窗 ${stats.levelWin} 次`);
    check('捕捉：用背包的精靈球抓到新的寶可夢', stats.caught >= 1 && G.party.length >= 2, `${stats.caught} 種`);
    check('學招式：學會新招式（招式滿 4 個時經過忘記招式的畫面）', stats.learned >= 1, `學會 ${stats.learned} 次、忘記招式畫面 ${stats.forget} 次`);
    // 友好商店：買 5 個傷藥
    const mart = World.buildings.find(b => b.town === home && b.kind === 'mart') || World.buildings.find(b => b.kind === 'mart' && b.town.region === 'hoenn');
    const money0 = G.state.money, pot0 = G.state.bag.potion || 0;
    await walkTo((x, y) => x === mart.door.x && y === mart.door.y + 1, pol, '商店門口');
    await step('ArrowUp'); await settle(pol, () => !!G.room && idleWorld());
    const clerk = Interior.room.npcs.find(n => n.role === 'clerk');
    await walkTo((x, y) => x === clerk.x + 2 && y === clerk.y, pol, '櫃台前');
    let bought = false;
    const shopPol = { ...pol, choose: (p, labels) => (labels.includes('購買') ? labels.indexOf(bought ? '不用了' : '購買') : labels.includes('是') ? labels.indexOf('是') : 0) };
    await face('ArrowLeft'); await tap('z', 300);
    for (let n = 0; n < 200; n++) {
      const shop = $('.shopui');
      if (shop && !visible($('#choices')) && !visible($('#dialog'))) {
        if (bought) { await tap('x', 300); continue; }                       // 買完：關閉購買畫面
        if (visible(shop.querySelector('.qty'))) {                           // 數量：調到 5 個後確認
          for (let q = 0; q < 4; q++) await tap('ArrowUp', 60);
          await tap('z', 300);
          continue;
        }
        const sel = shop.querySelector('.srow.sel .n');
        if (sel && sel.textContent === '傷藥') { await tap('z', 300); continue; }
        await tap('ArrowDown', 80); continue;
      }
      if (visible($('#choices')) || visible($('#dialog'))) {
        if (visible($('#choices')) && /一共/.test(dialogText())) { await pickChoice(choiceLabels().indexOf('是')); bought = true; continue; }
        await settle(shopPol, () => !!$('.shopui') && !visible($('#dialog')) && !visible($('#choices')) || idleWorld(), 10000);
        if (idleWorld()) break;
        continue;
      }
      if (idleWorld()) break;
      await sleep(100);
    }
    check('友好商店：用購買畫面買了傷藥，錢減少', (G.state.bag.potion || 0) > pot0 && G.state.money < money0, `傷藥 ${pot0}→${G.state.bag.potion || 0}、${money0}→${G.state.money} 元`);
    await leaveRoom(pol);
    // 寶可夢中心
    await centerHeal(pol);
    check('寶可夢中心：治療後全部回滿', G.party.every(m => m.hp === Mon.maxHp(m)));
    // 開始選單 → 記錄
    const saveKey = Account.saveKey();
    const savePol = { ...pol, choose: (p, labels) => (labels.includes('記錄') ? labels.indexOf('記錄') : labels.includes('是') ? labels.indexOf('是') : 0) };
    await tap('Enter', 300); // START：開始選單
    await settle(savePol, idleWorld, 20000);
    const raw = localStorage.getItem(saveKey), saved = raw && JSON.parse(raw);
    check('記錄：用開始選單記錄，讀回的存檔和目前一致', saved && saved.party.length === G.party.length && saved.money === G.state.money && saved.party[0].lv === G.party[0].lv);
  }
  // 走出房間：走到出口那一格（踩上去就會出去），還在房間裡就再往下走一步
  async function leaveRoom(pol) {
    if (!G.room) return;
    const ex = Interior.room.d.exits[0];
    await walkTo((x, y) => !G.room || (x === ex[0] && y === ex[1]), pol, '出口');
    if (G.room) await step('ArrowDown');
    await settle(pol, () => !G.room && idleWorld());
  }
  async function centerHeal(pol) {
    const c = World.buildings.find(b => b.kind === 'center' && b.town === (World.townAt(G.state.x, G.state.y) || World.homeTown)) || World.buildings.find(b => b.kind === 'center' && b.town === World.homeTown);
    await walkTo((x, y) => x === c.door.x && y === c.door.y + 1, pol, '寶可夢中心門口');
    await step('ArrowUp'); await settle(pol, () => !!G.room && idleWorld());
    const nurse = Interior.room.npcs.find(n => n.role === 'nurse');
    await walkTo((x, y) => x === nurse.x && y === nurse.y + 2, pol, '護士前面');
    await talk('ArrowUp', { ...pol, choose: (p, labels) => (labels.includes('治療') ? labels.indexOf('治療') : 0) });
    await leaveRoom(pol);
  }

  // 測試用的存檔：Lv.70 的隊伍，站在豐緣聯盟的門口前（世界依存檔的種子生成，先算出聯盟的位置）；回傳聯盟大樓
  function prepLeague() {
    const st = Game.newState('冠軍候補', 'hoenn', 1);
    const team = [[254, [348, 89, 202, 280]], [257, [394, 370, 89, 53]], [260, [57, 89, 58, 182]], [376, [309, 89, 8, 428]], [373, [434, 337, 53, 89]], [282, [94, 85, 247, 585]]];
    st.party = team.map(([sp, mv]) => { const m = Mon.create(sp, 70, { perfect: 31 }); m.moves = mv.filter(id => MOVES[id]).map(id => ({ id, pp: MOVES[id].pp })); return m; });
    st.badges.hoenn = [0, 1, 2, 3, 4, 5, 6, 7];
    Object.assign(st.bag, { 'hyper-potion': 30, 'full-restore': 5, 'revive': 10 });
    World.generate(st.seed, st.region, st.worldVer);
    const league0 = World.towns.find(t => t.region === 'hoenn' && t.kind === 'league');
    const lb = World.buildings.find(x => x.town === league0 && x.kind === 'league');
    st.x = lb.door.x; st.y = lb.door.y + 1; st.dir = 'up';
    st.savedAt = new Date().toISOString();
    localStorage.setItem(Account.saveKey(), JSON.stringify(st));
    return lb;
  }

  // ---------- 情境二：豐緣聯盟（Lv.70 的隊伍），房間之間用背包補血 ----------
  async function scenario2() {
    note('情境二：豐緣聯盟');
    const lb = prepared || prepLeague();
    // 像玩家一樣：開始選單 → 回到標題 → 按任意鍵 → 主選單「繼續遊戲」
    const pol = battlePolicy({ choose: (p, labels) => (labels.includes('前進') ? labels.indexOf('前進') : labels.includes('回到標題') ? labels.indexOf('回到標題') : labels.includes('不記錄直接回去') ? labels.indexOf('不記錄直接回去') : undefined),
      mainMenu: wins => Math.max(0, wins.indexOf('繼續遊戲')) });
    if (G.mode === 'world' && G.state) { await tap('Enter', 300); await settle(pol, () => !!$('#title .press-start') || !!$('#mainmenu'), 30000); }
    await settle(pol, () => G.mode === 'world' && G.state && G.state.name === '冠軍候補' && idleWorld(), 60000);
    check('聯盟：從主選單「繼續遊戲」讀取存檔，站在聯盟門口', G.state.name === '冠軍候補' && G.state.x === lb.door.x && G.state.y === lb.door.y + 1);
    const league = World.towns.find(t => t.region === 'hoenn' && t.kind === 'league');
    const b = World.buildings.find(x => x.town === league && x.kind === 'league');
    await step('ArrowUp'); await settle(pol, () => !!G.room && idleWorld());
    check('聯盟：走進聯盟大廳', G.room && Interior.room.key === 'league');
    let rooms = 0, healed = 0;
    for (let guard = 0; guard < 8 && !G.state.champs.hoenn; guard++) {
      const r = Interior.room;
      // 房間裡的對手：走到前面說話
      const foe = r.npcs.find(n => n.role === 'elite' || n.role === 'champion');
      if (foe && !r.cleared) {
        await walkTo((x, y) => x === foe.x && y === foe.y + 1, pol, '對手前面');
        await talk('ArrowUp', pol);
        await settle(pol, idleWorld, 600000);
        rooms++;
        if (G.state.champs.hoenn) break;
        // 房間之間：開始選單 → 背包 → 好傷藥（像玩家一樣補血）
        for (const m of G.party) {
          if (m.hp > 0 && m.hp < Mon.maxHp(m) * .7 && G.state.bag['hyper-potion']) {
            const k = G.party.indexOf(m);
            const usePol = { ...pol, choose: (p, labels) => (labels.includes('背包') ? labels.indexOf('背包') : labels.includes('使用') ? labels.indexOf('使用') : 0),
              bagChoice: () => (m.hp >= Mon.maxHp(m) * .7 ? ['道具', '關閉背包'] : ['道具', '厲害傷藥']),
              partyPick: () => (m.hp >= Mon.maxHp(m) * .7 ? -1 : k) };
            const before = m.hp;
            await tap('Enter', 300);
            await settle(usePol, () => !$('#bag') && !$('#party') && G.mode === 'world' && visible($('#choices')) && choiceLabels().includes('寶可導航') && m.hp > before || idleWorld(), 20000);
            if (visible($('#choices'))) await tap('x', 300);
            await settle(pol, idleWorld, 5000);
            if (m.hp > before) healed++;
          }
        }
      }
      // 往前的門
      const goals = (r.d.goals || []);
      if (!goals.length) break;
      await walkTo((x, y) => goals.some(([a, c]) => (a === x && c === y - 1)), pol, '往前的門');
      await step('ArrowUp');
      await settle(pol, idleWorld, 20000);
    }
    check('聯盟：用按鍵和四天王、冠軍逐一對戰並成為冠軍', !!G.state.champs.hoenn, `打了 ${rooms} 間`);
    check('聯盟：房間之間用開始選單 → 背包 → 好傷藥補血', healed >= 1, `${healed} 次`);
    await settle(pol, idleWorld, 60000);
    check('冠軍後：拿到超級手環（冠軍後的內容）', !!(G.state.bag['mega-ring'] || G.state.bag['key-stone'] || G.state.flags.mega), JSON.stringify(Object.keys(G.state.bag).filter(k => /mega|ring|stone/.test(k))));
    const tower = World.landmarks && [...World.landmarks.values()].find(l => l.event === 'battletower' && l.region === 'hoenn');
    check('冠軍後：豐緣有對戰塔（冠軍後的挑戰）', !!tower && !!G.state.champs.hoenn);
  }

  // 這一頁和遊戲共用 localStorage：載入時（標題畫面讀存檔之前）先備份並清空玩家的資料，結束時還原
  const backup = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^pkmn/.test(k)) backup[k] = localStorage.getItem(k); }
  for (const k of Object.keys(backup)) localStorage.removeItem(k);
  window.CLOUD_CONFIG = { url: '', anonKey: '', github: false };
  const which = new URLSearchParams(location.search).get('scenario');
  let prepared = null;
  if (which === '2') prepared = prepLeague(); // 只跑情境二：標題畫面就會有「繼續遊戲」
  async function run() {
    G.settings.textSpeed = 0; // 玩家設定：文字速度「快」
    kd(' ');                   // 按住 Space：二倍速（玩家的操作）
    try {
      if (!which || which === '1') await scenario1();
      if (!which || which === '2') await scenario2();
    } catch (e) { check('流程沒有例外', false, e.stack); }
    finally {
      ku(' ');
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/^pkmn/.test(k)) localStorage.removeItem(k); }
      for (const k in backup) localStorage.setItem(k, backup[k]);
    }
    check('過程中沒有錯誤訊息', !errors.length, errors.slice(0, 5).join(' / '));
    const pass = results.filter(r => r.ok).length;
    const out = document.createElement('pre');
    out.id = 'out';
    out.style.cssText = 'position:fixed;inset:0;z-index:999;margin:0;padding:12px;background:#fff;color:#000;font:13px/1.5 monospace;overflow:auto;white-space:pre-wrap';
    out.textContent = results.map(r => `${r.ok ? '✔' : '✘'} ${r.name}${r.detail ? '　' + r.detail : ''}`).join('\n') + `\n\n${pass}/${results.length} 通過\n\n紀錄：\n` + log.join('\n');
    document.body.appendChild(out);
    document.title = pass === results.length ? 'PASS' : 'FAIL';
    console.log(`NATURAL DONE ${pass}/${results.length} ${document.title}`);
  }
  window.addEventListener('load', () => setTimeout(() => run().catch(e => { document.title = 'FAIL'; document.body.textContent = 'EXC ' + e.stack; }), 500));
})();
