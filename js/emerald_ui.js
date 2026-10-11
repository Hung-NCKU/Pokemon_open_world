// 綠寶石的野外介面：開始選單、記錄（存檔）畫面、設定（OPTION）畫面、地名看板
// 位置與內容依 pokeemerald 的 src/start_menu.c、src/option_menu.c、src/map_name_popup.c（GBA 240×160，畫面放大 3 倍）
const EmeraldUI = (() => {
  const $ = id => document.getElementById(id);
  const on = () => typeof Gen3 !== 'undefined' && Gen3.on;

  // ---------- 開始選單（start_menu.c 的 sStartMenuItems：圖鑑、寶可夢、背包、寶可導航、玩家名字、記錄、設定、離開） ----------
  async function startMenu() {
    const items = [['圖鑑', 'dex'], ['寶可夢', 'party'], ['背包', 'bag'], ['寶可導航', 'nav'], [G.state.name, 'card'], ['記錄', 'save'], ['設定', 'option'], ['回到標題', 'title'], ['離開', 'exit']];
    while (true) {
      const c = await UI.choose(items.map(i => i[0]), { cls: 'start-menu', start: G.startMenuIdx || 0 });
      if (c < 0 || items[c][1] === 'exit') { UI.hideDialog(); return; }
      G.startMenuIdx = c;
      const k = items[c][1];
      if (k === 'dex') await Game.dexMenu();
      if (k === 'party') await Game.partyMenu();
      if (k === 'bag') await Game.bagMenu();
      if (k === 'card') await Game.trainerCard();
      if (k === 'nav' && (await pokeNav()) === 'close') return;
      if (k === 'save' && (await saveScreen())) return; // 記錄完成後選單關閉（和原作一樣）
      if (k === 'option' && (await optionMenu()) === 'title') return;
      if (k === 'title' && (await toTitle())) return;
      UI.hideDialog();
    }
  }

  // 回到標題畫面（原作的開始選單沒有這一項；使用者要求加回來）
  async function toTitle() {
    const c = await UI.choose(['記錄後回去', '不記錄直接回去', '取消'], { prompt: '要回到標題畫面嗎？' });
    UI.hideDialog();
    if (c !== 0 && c !== 1) return false;
    if (c === 0) Game.save(true);
    Game.toTitle();
    return true;
  }

  // 寶可導航：這個遊戲的地圖、任務、野餐放在這裡（原作的寶可導航有地圖、比賽資料、通話……）
  async function pokeNav() {
    const opts = ['地圖', '任務', '野餐', '關閉'];
    const c = await UI.choose(opts, { prompt: '寶可導航', cls: 'nav-menu' });
    UI.hideDialog();
    if (c === 0) { await Game.mapMenu(); return 'close'; }
    if (c === 1) await UI.panel(`<div class="quest-panel"><h3>任務與進度</h3>${Story.questSummary(G.state).split('\n').map(l => `<p>${U.esc(l)}</p>`).join('')}</div>`);
    if (c === 2) { await Picnic.open(); return 'close'; }
    return null;
  }

  // ---------- 記錄（start_menu.c 的 ShowSaveInfoWindow）：左上的資訊視窗＋「要記錄目前的進度嗎？」 ----------
  function placeName() {
    const s = G.state;
    if (G.room && G.room.b && G.room.b.town) return G.room.b.town.name;
    const t = World.townAt(s.x, s.y);
    return t ? t.name : `${REGIONS[World.regionAt(s.x, s.y)].n}的野外`;
  }
  function playTime() {
    const ms = G.state.playMs || 0;
    return `${Math.floor(ms / 3600000)}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}`;
  }
  async function saveScreen() {
    const s = G.state;
    const box = document.createElement('div');
    box.id = 'save-info';
    const color = s.gender === 'f' ? 'red' : 'blue';
    box.innerHTML = `<div class="loc">${U.esc(placeName())}</div>
      <div class="row">玩家<b class="${color}">${U.esc(s.name)}</b></div>
      <div class="row">徽章<b class="${color}">${Game.badgeCount()}</b></div>
      <div class="row">圖鑑<b class="${color}">${Game.dexCount()[1]}</b></div>
      <div class="row">時間<b class="${color}">${playTime()}</b></div>`;
    $('game').appendChild(box);
    try {
      const yes = async prompt => (await UI.choose(['是', '否'], { prompt, cls: 'yesno' })) === 0;
      if (!(await yes('要記錄目前的進度嗎？'))) { UI.hideDialog(); return false; }
      const key = typeof Account !== 'undefined' ? Account.saveKey() : SAVE_KEY;
      let had = null;
      try { had = localStorage.getItem(key); } catch { }
      if (had && !(await yes('已經有記錄了。\n要覆蓋原本的記錄嗎？'))) { UI.hideDialog(); return false; }
      UI.showText('記錄中……\n請不要關閉電源。');
      await U.sleep(700);
      if (!Game.save(true)) { await UI.say('記錄失敗了！'); return false; }
      Sound.sfx('save');
      await UI.say(`${s.name} 記錄了目前的進度。`);
      UI.hideDialog();
      return true;
    } finally { box.remove(); }
  }

  // ---------- 設定（option_menu.c）：淡紫色背景、上面的標題視窗、下面 7 列的設定視窗；←→ 改值，選到的值是紅字 ----------
  async function optionMenu() {
    const st = G.settings;
    if (st.musicVol === undefined) st.musicVol = st.music === false ? 0 : 7;
    if (st.sfxVol === undefined) st.sfxVol = st.sfx === false ? 0 : 7;
    const SPEEDS = [[40, '慢'], [22, '普通'], [0, '快']];
    const rows = [
      { label: '文字速度', vals: () => SPEEDS.map(x => x[1]), cur: () => Math.max(0, SPEEDS.findIndex(x => x[0] === (st.textSpeed ?? 22))), set: i => { st.textSpeed = SPEEDS[i][0]; } },
      { label: '戰鬥訊息', vals: () => ['手動', '自動'], cur: () => (st.battleAuto ? 1 : 0), set: i => { st.battleAuto = i ? 900 : 0; } },
      { label: '音樂', num: () => st.musicVol, add: d => { st.musicVol = U.clamp(st.musicVol + d, 0, 10); Sound.applyVolume(); } },
      { label: '音效', num: () => st.sfxVol, add: d => { st.sfxVol = U.clamp(st.sfxVol + d, 0, 10); Sound.applyVolume(); Sound.sfx('select'); } },
      { label: '遊玩紀錄', act: 'log', text: `錯誤 ${Telemetry.errors.length} 筆` },
      { label: '回到標題畫面', act: 'title', text: '' },
      { label: '完成', act: 'done', text: '' },
    ];
    const root = document.createElement('div');
    root.id = 'option';
    $('game').appendChild(root);
    let sel = 0;
    const draw = () => {
      root.innerHTML = `<div class="op-head">設定</div><div class="op-win">${rows.map((r, i) => {
        let right = '';
        if (r.vals) { const c = r.cur(); right = r.vals().map((v, k) => `<span class="${k === c ? 'on' : ''}">${v}</span>`).join(''); }
        else if (r.num) right = `<span class="on">◀ ${r.num()} ▶</span>`;
        else right = `<span>${U.esc(r.text)}</span>`;
        return `<div class="op-row${i === sel ? ' sel' : ''}" data-i="${i}"><b>${U.esc(r.label)}</b><i>${right}</i></div>`;
      }).join('')}</div>`;
      root.querySelectorAll('.op-row').forEach(el => { el.onclick = () => { const i = +el.dataset.i; if (i === sel) activate(); else { sel = i; draw(); } }; });
    };
    return new Promise(res => {
      const close = v => { pop(); root.remove(); try { localStorage.setItem(SAVE_KEY + '_settings', JSON.stringify(st)); } catch { } res(v); };
      const change = d => {
        const r = rows[sel];
        if (r.vals) { const n = r.vals().length; r.set((r.cur() + d + n) % n); Sound.sfx('select'); }
        else if (r.add) r.add(d);
        draw();
      };
      let busy = false;
      const activate = async () => {
        const r = rows[sel];
        if (!r.act) return change(1);
        Sound.sfx('select');
        if (r.act === 'done') return close(null);
        if (busy) return;
        busy = true; root.classList.add('hidden');
        try {
          if (r.act === 'log') await Game.logMenu();
          if (r.act === 'title') {
            const c = await UI.choose(['記錄後回去', '不記錄直接回去', '取消'], { prompt: '要回到標題畫面嗎？' });
            UI.hideDialog();
            if (c === 0 || c === 1) { if (c === 0) Game.save(true); close('title'); Game.toTitle(); return; }
          }
        } finally { busy = false; root.classList.remove('hidden'); UI.hideDialog(); }
        draw();
      };
      const onKey = e => {
        if (busy) return;
        const k = e.key;
        if (k === 'ArrowUp' || k === 'w') { sel = (sel + rows.length - 1) % rows.length; draw(); }
        else if (k === 'ArrowDown' || k === 's') { sel = (sel + 1) % rows.length; draw(); }
        else if (k === 'ArrowLeft' || k === 'a') change(-1);
        else if (k === 'ArrowRight' || k === 'd') change(1);
        else if (UI.isOk(e)) { if (!e.repeat) activate(); }
        else if (UI.isNo(e)) { if (!e.repeat) { Sound.sfx('select'); close(null); } }
      };
      const pop = UI.pushKey(onKey);
      draw();
    });
  }

  // ---------- 地名看板（map_name_popup.c）：左上角從上方滑下來，停一下再收回去 ----------
  // 看板樣式：城鎮是木頭、有道館的城市是大理石或磚頭（輪流）、聯盟是磚頭、野外是木頭、洞窟是石頭
  const THEME_TEXT = { wood: ['#f8f8f8', '#283058'], marble: ['#f8f8f8', '#585878'], stone: ['#f8f8f8', '#585878'], brick: ['#f8f8f8', '#585878'], underwater: ['#f8f8f8', '#585878'], stone2: ['#e8f8f8', '#404078'] };
  let popT = null;
  function themeFor(town) {
    if (!town) return 'wood';
    if (town.kind === 'league') return 'brick';
    if (town.kind === 'gym') return town.id % 2 ? 'marble' : 'brick';
    return 'wood';
  }
  function mapPopup(name, theme = 'wood', ms = 2600) {
    if (!on()) return UI.banner(name);
    let el = $('mappopup');
    if (!el) { el = document.createElement('div'); el.id = 'mappopup'; $('game').appendChild(el); }
    const [fg, sh] = THEME_TEXT[theme] || THEME_TEXT.wood;
    el.style.backgroundImage = `url(${Gen3.base}popup_${theme}.png)`;
    el.innerHTML = `<span style="color:${fg};text-shadow:3px 3px 0 ${sh}">${U.esc(name)}</span>`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(popT);
    if (ms) popT = setTimeout(() => el.classList.remove('show'), ms);
  }
  // ---------- 標題：「按任意鍵開始」（原作的 PRESS START）與主選單（src/main_menu.c） ----------
  function pressStart() {
    return new Promise(res => {
      const t = $('title');
      const el = document.createElement('div');
      el.className = 'press-start';
      el.textContent = '按任意鍵開始';
      t.appendChild(el);
      const done = () => { pop(); el.remove(); t.removeEventListener('click', done); Sound.sfx('select'); res(); };
      const pop = UI.pushKey(e => { if (!e.repeat) done(); });
      t.addEventListener('click', done);
    });
  }
  // 主選單：淡紫色背景、每個選項一個視窗（第 2 欄、寬 26 格）；有存檔時「繼續遊戲」的視窗高 6 格，顯示玩家、時間、圖鑑、徽章
  // 選到的視窗以外變暗；選項超過畫面時往上捲（原作捲 32 像素）
  function mainMenu(opts, save) {
    return new Promise(res => {
      const root = document.createElement('div');
      root.id = 'mainmenu';
      $('game').appendChild(root);
      let sel = 0;
      const info = save ? (() => {
        const ms = save.playMs || 0, caught = Object.keys(save.caught || {}).length;
        const badges = Object.values(save.badges || {}).reduce((a, b) => a + (b ? b.length : 0), 0);
        return [['玩家', save.name], ['時間', `${Math.floor(ms / 3600000)}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}`], ['圖鑑', caught], ['徽章', badges]];
      })() : null;
      const draw = () => {
        let y = 0, html = '';
        opts.forEach((o, i) => {
          const tall = i === 0 && info && o === '繼續遊戲';
          const h = tall ? 192 : 96;
          html += `<div class="mm-win${i === sel ? ' sel' : ''}" data-i="${i}" style="top:${y}px;height:${h}px"><div class="mm-h">${U.esc(o)}</div>${tall ? `<div class="mm-info">${info.map(([k, v]) => `<span>${k}</span><b>${U.esc(String(v))}</b>`).join('')}</div>` : ''}</div>`;
          y += h;
        });
        root.innerHTML = `<div class="mm-scroll">${html}</div>`;
        // 選到的視窗超出畫面時往上捲
        const el = root.querySelector('.mm-win.sel'), top = parseInt(el.style.top, 10), bottom = top + parseInt(el.style.height, 10);
        root.querySelector('.mm-scroll').style.transform = bottom > 480 ? `translateY(${480 - bottom}px)` : '';
        root.querySelectorAll('.mm-win').forEach(w => { w.onclick = () => { const i = +w.dataset.i; if (i === sel) pick(); else { sel = i; Sound.sfx('select'); draw(); } }; });
      };
      const pick = () => { Sound.sfx('select'); pop(); root.remove(); res(sel); };
      const pop = UI.pushKey(e => {
        const k = e.key;
        if (k === 'ArrowUp' || k === 'w') { if (sel > 0) { sel--; Sound.sfx('select'); draw(); } }
        else if (k === 'ArrowDown' || k === 's') { if (sel < opts.length - 1) { sel++; Sound.sfx('select'); draw(); } }
        else if (UI.isOk(e)) { if (!e.repeat) pick(); }
      });
      draw();
    });
  }
  // 左上角的選單、下方對話框顯示目前選項的說明（寶可夢寄放系統、商店）
  function menuWithHelp(items, helps, prompt) {
    return UI.choose(items, { cls: 'corner-menu', prompt: prompt ?? helps[0], onFocus: i => { if (helps[i]) UI.showText(helps[i]); return ''; } });
  }

  // ---------- 友好商店（src/shop.c）：「歡迎光臨！請問需要什麼呢？」→ 購買／賣出／不用了（左上角的選單） ----------
  async function shop(list) {
    let first = true;
    while (true) {
      const c = await UI.choose(['購買', '賣出', '不用了'], { cls: 'corner-menu', prompt: first ? '歡迎光臨！\n請問需要什麼呢？' : '還需要什麼嗎？' });
      first = false;
      if (c === 0) { UI.hideDialog(); await ShopUI.open(list); continue; }
      if (c === 1) { UI.hideDialog(); await sell(); continue; }
      break;
    }
    await UI.say('歡迎再次光臨！');
    UI.hideDialog();
  }
  // 賣出：從背包選道具，價錢是買價的一半；重要物品、沒有價錢的不收
  async function sell() {
    while (true) {
      const id = await BagUI.pick();
      if (!id) return;
      const it = ITEMS[id], price = Math.floor((it.price || 0) / 2), have = G.state.bag[id] || 0;
      if (!price || it.kind === 'key') { await UI.say(`${it.n}嗎？\n很抱歉，這個不能收購。`); UI.hideDialog(); continue; }
      const qs = [1, 5, 10, have].filter((q, i, a) => q <= have && a.indexOf(q) === i);
      const c = await UI.choose(qs.map(q => `${q === have && q > 1 ? '全部 ' : ''}${q} 個（${q * price} 元）`), { prompt: `${it.n}嗎？要賣幾個？` });
      if (c < 0) { UI.hideDialog(); continue; }
      const q = qs[c];
      if ((await UI.choose(['是', '否'], { prompt: `${q} 個${it.n}可以賣 ${q * price} 元，\n這樣可以嗎？` })) !== 0) { UI.hideDialog(); continue; }
      Game.takeItem(id, q);
      G.state.money += q * price;
      Sound.sfx('select');
      await UI.say(`把${it.n}交給了店員，\n拿到了 ${q * price} 元。`);
      UI.hideDialog();
    }
  }

  // ---------- 電腦（src/player_pc.c、pokemon_storage_system.c）：選哪一台電腦 → 寶可夢寄放系統的選單 → 箱子 ----------
  async function pc() {
    const name = G.state.name;
    await UI.say(`${name} 打開了電腦。`);
    while (true) {
      const c = await UI.choose(['某人的電腦', `${name}的電腦`, '關機'], { cls: 'corner-menu', prompt: '要連接哪一台電腦？' });
      if (c === 0) {
        await UI.say('連接到了某人的電腦。');
        await UI.say('寶可夢寄放系統已經開啟。');
        while (true) {
          const k = await menuWithHelp(['領取寶可夢', '寄放寶可夢', '移動寶可夢', '再見！'],
            ['把箱子裡的寶可夢\n移到自己的隊伍。', '把隊伍裡的寶可夢\n寄放到箱子裡。', '整理箱子裡和隊伍裡的寶可夢。', '回到上一個選單。']);
          if (k < 0 || k === 3) break;
          UI.hideDialog();
          await StorageUI.open({ option: ['withdraw', 'deposit', 'move'][k] });
        }
      } else if (c === 1) {
        await UI.say(`連接到了 ${name} 的電腦。`);
        await UI.say('這台電腦裡沒有寄放的道具。');
      } else break;
    }
    UI.hideDialog();
  }
  // ---------- 取名字（src/naming_screen.c）：三頁鍵盤（大寫、小寫、符號）、右邊的換頁／刪除／確定 ----------
  // 原作只能輸入英文字母；中文名字：點名字（或按 Tab）用輸入法打字，打完按 Enter
  const KEYS = {
    upper: ['ABCDEF .', 'GHIJKL ,', 'MNOPQRS ', 'TUVWXYZ '],
    lower: ['abcdef .', 'ghijkl ,', 'mnopqrs ', 'tuvwxyz '],
    symbols: ['01234 ', '56789 ', '!?♂♀/-', '…“”‘’ '],
  };
  const COLX = { upper: [0, 12, 24, 56, 68, 80, 92, 123], lower: [0, 12, 24, 56, 68, 80, 92, 123], symbols: [0, 22, 44, 66, 88, 110] };
  const PAGES = ['upper', 'lower', 'symbols'];
  function naming(prompt, def = '', { maxLength = 12, cancel = true, icon = null } = {}) {
    return new Promise(res => {
      const root = document.createElement('div');
      root.id = 'naming';
      $('game').appendChild(root);
      UI.hideDialog();
      let page = 0, cx = 0, cy = 0, name = Array.from(def || '');
      const slots = Math.min(maxLength, 10);
      const ic = icon === 'player' ? `<div class="ns-icon player" style="background-image:url(${Gen3.base}player_walk.png)"></div>`
        : icon ? `<div class="ns-icon mon">${monIcon(icon, false)}</div>` : '';
      root.innerHTML = `<div class="ns-bg"></div>${ic}<div class="ns-title">${U.esc(prompt)}</div>
        <div class="ns-name"></div><input class="ns-ime" maxlength="${maxLength}" autocomplete="off">
        <div class="ns-hint">點名字或按 Tab 可以用輸入法打中文</div>
        <div class="ns-keys"></div><div class="ns-cursor"></div>
        <div class="ns-btn page" data-b="0"><i></i></div><div class="ns-btn back" data-b="1"></div><div class="ns-btn ok" data-b="2"></div>`;
      const ime = root.querySelector('.ns-ime');
      const draw = () => {
        const p = PAGES[page];
        root.querySelector('.ns-bg').style.backgroundImage = `url(${Gen3.base}ns_${p}.png)`;
        root.querySelector('.ns-btn.page i').style.backgroundImage = `url(${Gen3.base}ns_page_swap_${p === 'symbols' ? 'others' : p}.png)`;
        root.querySelector('.ns-name').innerHTML = Array.from({ length: Math.max(slots, name.length) }, (_, i) => `<span class="${i === name.length ? 'cur' : ''}">${U.esc(name[i] || '')}</span>`).join('');
        root.querySelector('.ns-keys').innerHTML = KEYS[p].map((row, y) => Array.from(row).map((ch, x) => ch === ' ' ? '' :
          `<span data-x="${x}" data-y="${y}" style="left:${(COLX[p][x] + 38) * 3 - 18}px;top:${(88 + y * 16) * 3 - 24}px">${U.esc(ch)}</span>`).join('')).join('');
        const cols = COLX[p].length, cur = root.querySelector('.ns-cursor');
        root.querySelectorAll('.ns-btn').forEach(b => b.classList.toggle('sel', cx >= cols && +b.dataset.b === Math.min(2, cy)));
        cur.style.display = cx >= cols ? 'none' : '';
        if (cx < cols) { cur.style.left = `${(COLX[p][cx] + 38) * 3 - 24}px`; cur.style.top = `${(88 + cy * 16) * 3 - 36}px`; }
        root.querySelectorAll('.ns-keys span').forEach(el => { el.onclick = e => { e.stopPropagation(); cx = +el.dataset.x; cy = +el.dataset.y; press(); }; });
      };
      const type = ch => { if (name.length < maxLength) { name.push(ch); Sound.sfx('select'); } else Sound.sfx('bump'); };
      const del = () => { if (name.length) { name.pop(); Sound.sfx('select'); } };
      const finish = () => {
        // 留空：用預設的名字（寶可夢的暱稱留空＝用原本的名字）
        const v = name.join('').trim() || def || '';
        Sound.sfx('select'); pop(); root.remove(); res(v);
      };
      const press = () => {
        const p = PAGES[page], cols = COLX[p].length;
        if (cx >= cols) {
          const b = Math.min(2, cy);
          if (b === 0) { page = (page + 1) % 3; Sound.sfx('select'); }
          else if (b === 1) del();
          else return finish();
        } else {
          const ch = KEYS[p][cy][cx];
          if (ch && ch !== ' ') type(ch);
        }
        draw();
      };
      const back = () => { if (name.length) { del(); draw(); } else if (cancel) { pop(); root.remove(); res(null); } };
      // 中文：用輸入法打字（輸入框蓋在名字上，打完按 Enter 或點別的地方）
      const imeOn = () => { ime.value = name.join(''); ime.classList.add('on'); ime.focus(); };
      ime.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ime.blur(); }
        if (e.key === 'Escape') ime.blur();
      });
      ime.addEventListener('input', () => { name = Array.from(ime.value).slice(0, maxLength); draw(); });
      ime.addEventListener('blur', () => { ime.classList.remove('on'); name = Array.from(ime.value).slice(0, maxLength); draw(); });
      root.querySelector('.ns-name').onclick = imeOn;
      root.querySelector('.ns-hint').onclick = imeOn;
      root.querySelectorAll('.ns-btn').forEach(b => { b.onclick = e => { e.stopPropagation(); cx = 99; cy = +b.dataset.b; press(); }; });
      const onKey = e => {
        if (document.activeElement === ime) return;
        const p = PAGES[page], cols = COLX[p].length, k = e.key;
        if (k === 'Tab') { e.preventDefault(); imeOn(); return; }
        if (k === 'ArrowLeft') cx = cx >= cols ? cols - 1 : cx > 0 ? cx - 1 : cols;
        else if (k === 'ArrowRight') cx = cx >= cols ? 0 : cx + 1;
        else if (k === 'ArrowUp') cy = (cy + 3) % 4;
        else if (k === 'ArrowDown') cy = (cy + 1) % 4;
        else if (k === 'Enter') { if (!e.repeat) finish(); return; }
        else if (k === 'Shift') { page = (page + 1) % 3; }
        else if (k === 'Backspace') del();
        else if (UI.isOk(e)) { if (!e.repeat) press(); return; }
        else if (UI.isNo(e)) { if (!e.repeat) back(); return; }
        else return;
        if (cx > COLX[PAGES[page]].length) cx = COLX[PAGES[page]].length;
        draw();
      };
      const pop = UI.pushKey(onKey);
      draw();
    });
  }
  // ---------- 升級時的能力視窗（src/battle_script_commands.c 的升級畫面）：先顯示各能力增加多少，按鍵後顯示新的數值 ----------
  async function levelUp(before, after) {
    const box = document.createElement('div');
    box.id = 'levelup-win';
    $('game').appendChild(box);
    const show = diff => {
      box.innerHTML = STAT_ZH.map((n, i) => `<div><span>${n}</span><b>${diff ? '+' + (after[i] - before[i]) : after[i]}</b></div>`).join('');
    };
    show(true);
    await UI.waitKey();
    show(false);
    await UI.waitKey();
    box.remove();
  }
  return { startMenu, pokeNav, saveScreen, optionMenu, mapPopup, themeFor, placeName, pressStart, mainMenu, shop, sell, pc, naming, levelUp };
})();
