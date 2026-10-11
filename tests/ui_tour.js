// 介面巡覽：用網址的 #名稱 打開指定的畫面，方便逐一截圖檢查（tools/ui_shots.sh 會依序截下所有畫面）
// 例：tests/ui_tour.html#party、#summary1、#battle_move
(() => {
  const key = k => { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })), 40); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keys = async (...ks) => { for (const k of ks) { key(k); await sleep(350); } };
  // 戰鬥：一直按確認直到出現「要做什麼？」的選單
  const untilMenu = async () => {
    for (let i = 0; i < 60; i++) {
      const ch = document.getElementById('choices');
      if (ch.classList.contains('battle-menu') && !ch.classList.contains('hidden')) return;
      key('z'); await sleep(400);
    }
  };
  // 一份「玩到中段」的存檔：6 隻寶可夢、道具、徽章、圖鑑
  function richState() {
    const st = Game.newState('小智', 'hoenn', 1);
    const mk = (sp, lv, moves, item) => { const m = Mon.create(sp, lv); if (moves) m.moves = moves.map(id => ({ id, pp: MOVES[id].pp })); if (item) m.item = item; return m; };
    st.party = [mk(257, 42, [53, 299, 370, 89], 'charcoal'), mk(282, 38, [94, 85, 247, 104]), mk(260, 40, [57, 89, 58, 182], 'leftovers'),
      mk(334, 36, [225, 337, 19, 97]), mk(25, 30, [85, 98, 86, 104]), mk(306, 37, [231, 157, 89, 442])];
    st.party[3].hp = Math.floor(Mon.maxHp(st.party[3]) * .3); st.party[4].st = 'par'; st.party[5].hp = 0;
    st.money = 123456;
    st.box = [mk(41, 20), mk(19, 18), mk(263, 15), mk(270, 12), mk(129, 25)];
    Object.assign(st.bag, { 'potion': 12, 'super-potion': 5, 'hyper-potion': 3, 'full-heal': 4, 'revive': 2, 'rare-candy': 7, 'escape-rope': 1,
      'great-ball': 20, 'ultra-ball': 8, 'master-ball': 1, 'repel': 6, 'fire-stone': 1, 'oran-berry': 9, 'sitrus-berry': 3 });
    st.badges.hoenn = [0, 1, 2, 3, 4];
    for (let i = 1; i <= 260; i++) { st.seen[i] = 1; if (i % 3) st.caught[i] = 1; }
    st.playMs = 12 * 3600000 + 34 * 60000;
    return st;
  }
  const SCREENS = {
    title: null,
    mainmenu: async () => { EmeraldUI.mainMenu(['繼續遊戲', '新遊戲', '匯入存檔', '匯出存檔', '帳號'], G.state); },
    mainmenu_down: async () => { EmeraldUI.mainMenu(['繼續遊戲', '新遊戲', '匯入存檔', '匯出存檔', '帳號'], G.state); await sleep(300); await keys('ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'); },
    world: async () => { },
    popup: async () => { await sleep(2800); EmeraldUI.mapPopup("未白鎮", "wood", 0); document.getElementById("mappopup").style.transition = "none"; await sleep(600); },
    popup_city: async () => { await sleep(2800); EmeraldUI.mapPopup("卡那茲市", "marble", 0); document.getElementById("mappopup").style.transition = "none"; await sleep(600); },
    option: async () => { Game.settingsMenu(); },
    savescreen: async () => { EmeraldUI.saveScreen(); },
    nav: async () => { EmeraldUI.pokeNav(); },
    picnic: async () => { Picnic.open(); },
    tm: async () => { TM.machine(); },
    held: async () => { Game.heldMenu(G.party[0]); },
    dexsearch: async () => { Game.dexMenu(); await sleep(600); await keys('f'); },
    levelup: async () => { const m = G.party[4]; Game.giveExp(m, Mon.expFor(POKEDEX[m.sp].gr, m.lv + 1) - m.exp + 1); await sleep(2500); await keys('z'); },
    say: async () => { UI.say('媽媽：「小智，你終於起床了！\n博士在研究所等你喔。」'); },
    yesno: async () => { UI.choose(['是', '否'], { prompt: '要使用衝浪嗎？' }); },
    start: async () => { Game.mainMenu(); },
    party: async () => { Game.partyMenu(); },
    summary0: async () => { Game.summary(G.party[0]); },
    summary1: async () => { Game.summary(G.party[0]); await sleep(500); await keys('ArrowRight'); },
    summary2: async () => { Game.summary(G.party[0]); await sleep(500); await keys('ArrowRight', 'ArrowRight'); },
    bag: async () => { Game.bagMenu(); },
    dex: async () => { Game.dexMenu(); },
    dexentry: async () => { Game.dexEntry(25); },
    card: async () => { Game.trainerCard(); },
    map: async () => { Game.mapMenu(); },
    settings: async () => { Game.settingsMenu(); },
    shop: async () => { Game.shopMenu(); },
    shop_sell: async () => { Game.shopMenu(); await sleep(400); await keys('ArrowDown', 'z'); },
    st_withdraw: async () => { StorageUI.open({ option: 'withdraw' }); await sleep(400); await keys('ArrowRight'); },
    st_withdraw_menu: async () => { StorageUI.open({ option: 'withdraw' }); await sleep(400); await keys('z'); },
    st_deposit: async () => { StorageUI.open({ option: 'deposit' }); await sleep(400); await keys('ArrowRight', 'ArrowDown'); },
    st_deposit_pick: async () => { StorageUI.open({ option: 'deposit' }); await sleep(400); await keys('ArrowRight', 'z', 'z', 'ArrowRight'); },
    st_move_party: async () => { StorageUI.open({ option: 'move' }); await sleep(400); await keys('p'); },
    pc: async () => { Game.pcMenu(); await sleep(300); await keys('z'); },
    pc_storage: async () => { Game.pcMenu(); await sleep(300); await keys('z', 'z', 'z', 'z', 'ArrowDown'); },
    box: async () => { Game.boxMenu(); },
    quest: async () => { UI.panel(`<div class="quest-panel"><h3>任務與進度</h3>${Story.questSummary(G.state).split('\n').map(l => `<p>${U.esc(l)}</p>`).join('')}</div>`); },
    savemenu: async () => { UI.choose(['儲存', '匯出存檔檔案', '取消'], { prompt: '要儲存目前的進度嗎？（儲存時會自動保留上一份備份）' }); },
    input: async () => { UI.input('你的名字是？', '小智', { cancel: true, icon: 'player' }); },
    input_mon: async () => { UI.input('要幫 皮卡丘 取什麼名字？', '', { cancel: true, icon: 25 }); await sleep(300); await keys('ArrowRight', 'ArrowDown', 'z', 'z'); },
    banner: async () => { UI.banner('豐緣地區・未白鎮'); },
    evolve: async () => { Game.evolve(G.party[4], 26); },
    evolve_go: async () => { Game.evolve(G.party[4], 26); await sleep(1500); await keys('z'); await sleep(1200); },
    account: async () => { Account.menu(); },
    battle_intro: async () => { Game.battle({ wild: Mon.create(263, 8) }); await sleep(1200); },
    battle_action: async () => { Game.battle({ wild: Mon.create(263, 8) }); await untilMenu(); },
    battle_move: async () => { Game.battle({ wild: Mon.create(263, 8) }); await untilMenu(); await keys('z'); },
    battle_party: async () => { Game.battle({ wild: Mon.create(263, 8) }); await untilMenu(); await keys('ArrowDown', 'z'); },
    battle_bag: async () => { Game.battle({ wild: Mon.create(263, 8) }); await untilMenu(); await keys('ArrowRight', 'z'); },
    battle_win: async () => { const w = Mon.create(263, 3); Game.battle({ wild: w }); await untilMenu(); await keys('z', 'z'); for (let i = 0; i < 12; i++) { await sleep(400); key('z'); } },
    battle_trainer: async () => {
      const foe = [Mon.create(74, 14), Mon.create(299, 15)];
      Game.battle({ trainer: { title: '登山男', name: '阿健', party: foe, kind: 'trainer', money: 300, cls: 3 } }); await sleep(900);
    },
    battle_double: async () => {
      const foe = [Mon.create(74, 14), Mon.create(299, 15)];
      Game.battle({ trainer: { title: '雙胞胎', name: '小優與小美', party: foe, kind: 'trainer', money: 300 }, double: true }); await untilMenu();
    },
  };
  window.UI_SCREENS = Object.keys(SCREENS);
  const name = location.hash.slice(1) || 'world';
  if (name === 'title') return;
  Game.title = async () => {
    document.getElementById('title').classList.add('hidden');
    Game.start(richState(), true);
    G.state.x += 0;
    await sleep(800);
    await SCREENS[name]();
    document.title = 'READY ' + name;
  };
})();
