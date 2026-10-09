// 劇情內容：原作城鎮名稱、館主招牌隊伍、地標與傳說事件、關都任務線
// 名稱參考神奇寶貝百科（wiki.52poke.com）；隊伍參考原作（紅綠／火紅葉綠、心金魂銀重賽）

// 道館所在城鎮（依道館順序）與聯盟所在地
const GYM_TOWNS = {
  kanto: ['深灰市', '華藍市', '枯葉市', '玉虹市', '淺紅市', '金黃市', '紅蓮島', '常青市'],
  johto: ['桔梗市', '檜皮鎮', '滿金市', '緣朱市', '湛藍市', '淺蔥市', '卡吉鎮', '煙墨市'],
  hoenn: ['卡那茲市', '武鬥鎮', '紫菫市', '釜炎鎮', '橙華市', '茵鬱市', '綠嶺市', '琉璃市'],
  sinnoh: ['黑金市', '百代市', '帷幕市', '野原市', '家緣市', '水脈市', '雪峰市', '濱海市'],
};
const LEAGUE_TOWN = { kanto: '石英高原', hoenn: '彩幽市' };

// 招牌隊伍：[前期（約 Lv.35 以下）, 後期／重賽]，排在最後的是王牌
const SIGNATURE = {
  kanto: {
    gyms: [
      [[74, 95], [76, 141, 139, 112, 208, 95]],            // 小剛：小拳石、大岩蛇 → 隆隆岩、鐮刀盔、多刺菊石獸、鑽角犀獸、大鋼蛇
      [[120, 121], [55, 131, 195, 130, 121]],              // 小霞：海星星、寶石海星 → 哥達鴨、拉普拉斯、沼王、暴鯉龍、寶石海星
      [[100, 25, 26], [101, 82, 135, 466, 26]],            // 馬志士：霹靂電球、皮卡丘、雷丘 → 頑皮雷彈、三合一磁怪、雷伊布、電擊魔獸、雷丘
      [[71, 114, 45], [189, 182, 465, 71, 45]],            // 莉佳：大食花、蔓藤怪、霸王花 → 毽子棉、美麗花、巨蔓藤、大食花、霸王花
      [[109, 89, 110], [168, 49, 89, 110, 169]],           // 阿桔：瓦斯彈、臭臭泥、雙彈瓦斯 → 阿利多斯、摩魯蛾、臭臭泥、雙彈瓦斯、叉字蝠
      [[64, 122, 49, 65], [196, 122, 80, 103, 65]],        // 娜姿：勇基拉、魔牆人偶、摩魯蛾、胡地 → 太陽伊布、魔牆人偶、呆殼獸、椰蛋樹、胡地
      [[58, 77, 78, 59], [126, 38, 467, 78, 59]],          // 夏伯：卡蒂狗、小火馬、烈焰馬、風速狗 → 鴨嘴火獸、九尾、鴨嘴炎獸、烈焰馬、風速狗
      [[111, 51, 31, 34, 112], [51, 105, 31, 34, 464]],    // 坂木：獨角犀牛、三地鼠、尼多后、尼多王、鑽角犀獸 → 超甲狂犀
    ],
    // 青綠：依玩家的御三家選擇屬性有利的那隻（火紅葉綠的對手）
    champ: starter => {
      const counter = { 1: 6, 4: 9, 7: 3 }[starter] || [3, 6, 9][starter % 3];
      // 噴火龍：暴鯉龍、椰蛋樹；水箭龜：椰蛋樹、風速狗；妙蛙花：風速狗、暴鯉龍
      const pair = { 6: [130, 103], 9: [103, 59], 3: [59, 130] }[counter];
      return [18, 65, 112, ...pair, counter];
    },
  },
};

// 地標：near 指定靠近哪座城鎮（gym 編號或 home／league）；sea 表示在海上的小島
const LANDMARKS = {
  kanto: [
    { id: 'mtmoon', n: '月見山', near: 0, event: 'fossil' },
    { id: 'powerplant', n: '無人發電廠', near: 2, event: 'legend', sp: 145, lv: 50, need: 'birds' },
    { id: 'seafoam', n: '雙子島', near: 6, sea: true, event: 'legend', sp: 144, lv: 50, need: 'birds' },
    { id: 'mtember', n: '燈火山', near: 6, event: 'legend', sp: 146, lv: 50, need: 'birds' },
    { id: 'ceruleancave', n: '華藍洞窟', near: 1, event: 'legend', sp: 150, lv: 70, need: 'champion' },
  ],
};
const EVENT_LEGENDS = new Set([144, 145, 146, 150]);

// 化石
ITEMS['helix-fossil'] = { n: '貝殼化石', price: 0, kind: 'key', d: '古代寶可夢的化石，看起來像貝殼。研究所可以讓它復活。' };
ITEMS['dome-fossil'] = { n: '甲殼化石', price: 0, kind: 'key', d: '古代寶可夢的化石，看起來像甲殼。研究所可以讓它復活。' };

// 關都任務線（大木博士）
const QUEST = [
  { t: '和真新鎮的大木博士說話', done: s => !!s.flags.q_start },
  { t: '捕捉 10 種寶可夢，再回去找大木博士', done: s => Object.keys(s.caught).length >= 10, reward: ['great-ball', 10] },
  { t: '打敗深灰市的道館館主小剛', done: s => (s.badges.kanto || []).includes(0), reward: ['rare-candy', 2] },
  { t: '調查深灰市附近的月見山', done: s => !!s.flags.fossil },
  { t: '把化石交給大木博士', done: s => !!s.flags.fossil_revived },
  { t: '收集 4 枚關都徽章', done: s => (s.badges.kanto || []).length >= 4, reward: ['ultra-ball', 5] },
  { t: '尋找傳說中的三隻鳥寶可夢（無人發電廠、雙子島、燈火山）', done: s => ['powerplant', 'seafoam', 'mtember'].every(k => s.flags['lm_' + k]), reward: ['max-potion', 5] },
  { t: '收集 8 枚關都徽章，挑戰石英高原', done: s => !!s.champs.kanto },
  { t: '前往華藍洞窟深處', done: s => !!s.flags.lm_ceruleancave },
];

const Story = {
  questStage(s) { let i = 0; while (i < QUEST.length && QUEST[i].done(s)) i++; return i; },
  questText(s) {
    const i = Story.questStage(s);
    return i >= QUEST.length ? '關都的冒險告一段落了！繼續完成圖鑑吧。' : QUEST[i].t;
  },
  // 大木博士（真新鎮研究所）
  async oak() {
    const s = G.state;
    if (!s.flags.q_start) {
      s.flags.q_start = 1;
      await UI.say('大木博士：「喔，你來啦！我正在研究關都地區的寶可夢。」');
      await UI.say('大木博士：「可以幫我一個忙嗎？先去捕捉 10 種寶可夢，讓我看看你的圖鑑吧！」');
      return;
    }
    // 發放已完成階段的獎勵
    for (let i = 0; i < QUEST.length; i++) {
      const q = QUEST[i];
      if (!q.done(s) || !q.reward || s.flags['q_reward_' + i]) continue;
      s.flags['q_reward_' + i] = 1;
      Game.giveItem(q.reward[0], q.reward[1]);
      await UI.say(`大木博士：「做得好！這是給你的謝禮。」\n獲得了 ${q.reward[1]} 個${ITEMS[q.reward[0]].n}！`);
    }
    if (s.flags.fossil && !s.flags.fossil_revived) {
      const fid = s.flags.fossil;
      const sp = fid === 'helix-fossil' ? 138 : 140;
      await UI.say(`大木博士：「這是${ITEMS[fid].n}！讓我用研究所的機器讓它復活……」`);
      Game.takeItem(fid);
      s.flags.fossil_revived = 1;
      const m = Mon.create(sp, 15);
      await UI.say(`化石復活成了 ${POKEDEX[sp].n}！`);
      await Game.addCaught(m);
    }
    const i = Story.questStage(s);
    const hints = {
      3: '大木博士：「聽說深灰市北邊的月見山裡有古代寶可夢的化石。去調查看看吧！」',
      6: '大木博士：「傳說關都有三隻鳥寶可夢：閃電鳥在無人發電廠、急凍鳥在雙子島、火焰鳥在燈火山。」',
      8: '大木博士：「成為冠軍的你，或許可以進入華藍洞窟了。那裡似乎有非常強大的寶可夢……」',
    };
    await UI.say(hints[i] || `大木博士：「下一步：${Story.questText(s)}」`);
  },

  // 地標事件
  async landmark(lm) {
    const s = G.state;
    const key = 'lm_' + lm.id;
    s.flags['seen_' + lm.id] = 1;
    await UI.say(`這裡是${lm.n}。`);
    if (lm.event === 'fossil') {
      if (s.flags.fossil) { await UI.say('洞窟深處很安靜，已經沒有化石了。'); s.flags[key] = 1; return; }
      await UI.say('在洞窟深處發現了兩塊化石！但是只能帶走一塊。');
      const c = await UI.choose(['貝殼化石', '甲殼化石'], { prompt: '要帶走哪一塊化石？', cancel: false });
      const fid = c === 0 ? 'helix-fossil' : 'dome-fossil';
      Game.giveItem(fid);
      s.flags.fossil = fid; s.flags[key] = 1;
      await UI.say(`獲得了${ITEMS[fid].n}！拿去給大木博士看看吧。`);
      return;
    }
    if (s.flags[key]) { await UI.say('這裡已經恢復了平靜。'); return; }
    if (lm.need === 'birds' && (s.badges.kanto || []).length < 4) { await UI.say('裡面傳來強大的氣息……但以現在的實力好像還無法深入。\n（需要 4 枚關都徽章）'); return; }
    if (lm.need === 'champion' && !s.champs.kanto) { await UI.say('入口被守衛擋住了。「只有關都的冠軍才能進入。」'); return; }
    await UI.say(`在${lm.n}的深處感覺到了強大的氣息……！`);
    const wild = Mon.create(lm.sp, lm.lv, { perfect: 20 });
    const r = await Game.battle({ wild, biome: lm.sea ? 'water' : 'cave' });
    if (r === 'catch') { s.flags[key] = 1; Game.save(true); }
    else if (r === 'win') await UI.say(`${POKEDEX[lm.sp].n} 消失了蹤影……再來一次或許還會遇到。`);
  },
};
