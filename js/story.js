// 劇情內容：原作城鎮名稱、館主招牌隊伍、地標與傳說事件、關都任務線
// 名稱參考神奇寶貝百科（wiki.52poke.com）；隊伍參考原作（紅綠／火紅葉綠、心金魂銀重賽）
import { ELITE_FOUR, G, GYM_TOWNS, Game, Hidden, Interior, LANDMARKS, LEAGUE_TOWN, SIGNATURE, Sound, Story, T, UI, Weather, define } from './core.js';
import { U } from './util.js';
import { ITEMS, REGIONS } from './data.js';
import { Mon } from './mon.js';
import { playCry } from './sprites.js';
import { World } from './world.js';

// 道館所在城鎮（依道館順序）與聯盟所在地
define(GYM_TOWNS, {
  kanto: ['深灰市', '華藍市', '枯葉市', '玉虹市', '淺紅市', '金黃市', '紅蓮島', '常青市'],
  johto: ['桔梗市', '檜皮鎮', '滿金市', '緣朱市', '湛藍市', '淺蔥市', '卡吉鎮', '煙墨市'],
  hoenn: ['卡那茲市', '武鬥鎮', '紫菫市', '釜炎鎮', '橙華市', '茵鬱市', '綠嶺市', '琉璃市'],
  sinnoh: ['黑金市', '百代市', '帷幕市', '野原市', '家緣市', '水脈市', '雪峰市', '濱海市'],
});
define(LEAGUE_TOWN, { kanto: '石英高原', hoenn: '彩幽市' });

// 招牌隊伍：[前期（約 Lv.35 以下）, 後期／重賽]，排在最後的是王牌
define(SIGNATURE, {
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
});

// 四天王（火紅葉綠），排在最後的是王牌
define(ELITE_FOUR, {
  kanto: [
    { name: '科拿', type: 'ice', sprite: 'lorelei-gen3', team: [87, 91, 80, 124, 131] },     // 白海獅、刺甲貝、呆殼獸、迷唇姐、拉普拉斯
    { name: '希巴', type: 'fighting', sprite: 'bruno-gen3', team: [95, 107, 106, 95, 68] }, // 大岩蛇、快拳郎、飛腿郎、大岩蛇、怪力
    { name: '菊子', type: 'ghost', sprite: 'agatha-gen3', team: [94, 42, 93, 24, 94] },      // 耿鬼、大嘴蝠、鬼斯通、阿柏怪、耿鬼
    { name: '阿渡', type: 'dragon', sprite: 'lance-gen3', team: [130, 148, 148, 142, 149] }, // 暴鯉龍、哈克龍、哈克龍、化石翼龍、快龍
  ],
});

// 勁敵青綠：依玩家的御三家選擇屬性有利的那隻，隨進度進化
const RIVAL = {
  name: '青綠', sprite: 'blue-gen3',
  counter(starter) { return { 1: 6, 4: 9, 7: 3 }[starter] || [3, 6, 9][starter % 3]; },
  team(stage, starter, L) {
    const fin = RIVAL.counter(starter), base = fin - 2, mid = fin - 1;
    const pair = { 6: [130, 103], 9: [103, 59], 3: [59, 130] }[fin];
    const list = stage === 1 ? [[base, 5]]
      : stage === 2 ? [[17, L - 2], [63, L - 3], [19, L - 3], [mid, L]]
        : [[18, L - 3], [65, L - 2], [111, L - 2], [pair[0], L - 1], [fin, L]];
    return list.map(([sp, lv]) => Mon.create(sp, U.clamp(lv, 2, 100), { shiny: false, perfect: stage === 3 ? 20 : 0 }));
  },
};

// 地標：near 指定靠近哪座城鎮（gym 編號或 home／league）；sea 表示在海上的小島
define(LANDMARKS, {
  kanto: [
    { id: 'mtmoon', n: '月見山', near: 0, event: 'fossil' },
    { id: 'powerplant', n: '無人發電廠', near: 2, event: 'legend', sp: 145, lv: 50, need: 'birds' },
    { id: 'seafoam', n: '雙子島', near: 6, sea: true, event: 'legend', sp: 144, lv: 50, need: 'birds' },
    { id: 'mtember', n: '燈火山', near: 6, event: 'legend', sp: 146, lv: 50, need: 'birds' },
    { id: 'ceruleancave', n: '華藍洞窟', near: 1, event: 'legend', sp: 150, lv: 70, need: 'champion' },
  ],
});
const EVENT_LEGENDS = new Set([144, 145, 146, 150]);
// 洞窟解謎（tools/build_interiors.py 的 CAVES）與深處的寶物
const CAVE_PUZZLES = { mtmoon: 'cave_a', ceruleancave: 'cave_b', mtember: 'cave_c' };
const CAVE_LOOT = { ceruleancave: [['ultra-ball', 5], ['rare-candy', 3], ['max-potion', 2]], mtember: [['fire-stone', 1], ['rare-candy', 2], ['revive', 2]] };

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

// 非關都地區的當地任務（研究所 → 生態調查 → 首個挑戰 → 收集徽章 → 冠軍）
function localQuest(region) {
  const reg = REGIONS[region];
  const town = reg.home;
  return [
    { t: `到${town}的研究所找${reg.prof}`, done: s => !!s.flags['q_' + region] },
    { t: `生態調查：捕捉 5 種${reg.n}地區的寶可夢（第 ${reg.gen} 世代）`, done: s => Object.keys(s.caught).filter(id => POKEDEX[id].g === reg.gen).length >= 5, reward: ['great-ball', 10] },
    { t: `首個挑戰：取得${reg.n}地區的第一枚徽章`, done: s => (s.badges[region] || []).length >= 1, reward: ['exp-candy-m', 3] },
    { t: `收集 4 枚${reg.n}徽章`, done: s => (s.badges[region] || []).length >= 4, reward: ['ultra-ball', 5] },
    { t: `收集 8 枚${reg.n}徽章，挑戰${reg.n}寶可夢聯盟`, done: s => !!s.champs[region], reward: ['ability-capsule', 1] },
  ];
}

define(Story, {
  questsFor(region) { return region === 'kanto' ? QUEST : localQuest(region); },
  questStage(s, region = 'kanto') { const q = Story.questsFor(region); let i = 0; while (i < q.length && q[i].done(s)) i++; return i; },
  questText(s, region = 'kanto') {
    const q = Story.questsFor(region);
    const i = Story.questStage(s, region);
    return i >= q.length ? `${REGIONS[region].n}的冒險告一段落了！繼續完成圖鑑吧。` : q[i].t;
  },
  // 主選單「任務」：出發地區的任務；關都的任務線開始後也會列出
  questSummary(s) {
    const lines = [`【${REGIONS[s.region].n}】${Story.questText(s, s.region)}`];
    if (s.region !== 'kanto' && s.flags.q_start) lines.push(`【關都・大木博士】${Story.questText(s, 'kanto')}`);
    if (typeof Hidden !== 'undefined') { const [f, n] = Hidden.count(); lines.push(`【探索】隱藏道具 ${f}／${n}（走近時地面會閃光，面向那一格按確認）；目前天氣：${Weather.KINDS[Weather.here()].n}`); }
    return lines.join('\n');
  },
  // 非關都地區的博士
  async prof(region) {
    const s = G.state, reg = REGIONS[region];
    const key = 'q_' + region;
    if (!s.flags[key]) {
      s.flags[key] = 1;
      await UI.say(`${reg.prof}：「我正在研究${reg.n}地區的寶可夢生態。可以幫我調查嗎？先捕捉 5 種${reg.n}地區的寶可夢吧！」`);
      return;
    }
    const q = Story.questsFor(region); // 城都有自己的任務線（js/johto.js）
    for (let i = 0; i < q.length; i++) {
      if (!q[i].done(s) || !q[i].reward || s.flags[`${key}_r${i}`]) continue;
      s.flags[`${key}_r${i}`] = 1;
      Game.giveItem(q[i].reward[0], q[i].reward[1]);
      await UI.say(`${reg.prof}：「謝謝你的幫忙！這是謝禮。」\n獲得了 ${q[i].reward[1]} 個${ITEMS[q[i].reward[0]].n}！`);
    }
    await UI.say(`${reg.prof}：「下一步：${Story.questText(s, region)}」`);
  },
  // 勁敵：在研究所（第一次）、關都城鎮（2、6 枚關都徽章後）遇到
  async rival(stage) {
    const s = G.state;
    if (s.flags['rival' + stage]) return;
    s.flags['rival' + stage] = 1;
    const kb = (s.badges.kanto || []).length;
    const L = stage === 1 ? 5 : World.gymLevel(World.towns.find(t => t.region === 'kanto' && t.gym === 0)) + (stage === 3 ? 4 : 2);
    const lines = { 1: '「喂！我也要選一隻寶可夢！來比一場吧！」', 2: `「喲！你收集了 ${kb} 枚徽章了？讓我看看你變強了多少！」`, 3: '「我的寶可夢已經是全關都最強的了！」' };
    await UI.say(`${RIVAL.name}：${lines[stage]}`);
    await Game.battle({ trainer: { title: '勁敵', name: RIVAL.name, party: RIVAL.team(stage, s.starter, L), kind: stage === 3 ? 'gym' : 'trainer', money: 60, sprite: RIVAL.sprite, lose: '可惡！下次我一定會贏！' }, noBlackout: stage === 1 });
  },
  // 進入關都城鎮時的事件
  async onEnterTown(town) {
    const s = G.state;
    if (town.region !== 'kanto' || !s.flags.q_start) return;
    const kb = (s.badges.kanto || []).length;
    // 依序進行；已經跳過的階段（例如拿到 6 枚徽章才開始任務）明確略過，不會倒序出現
    if (kb >= 6 && !s.flags.rival3) { if (!s.flags.rival2) s.flags.rival2 = 'skip'; await Story.rival(3); }
    else if (kb >= 2 && !s.flags.rival2) await Story.rival(2);
  },
  // 大木博士（真新鎮研究所）
  async oak() {
    const s = G.state;
    if (!s.flags.q_start) {
      s.flags.q_start = 1;
      await UI.say('大木博士：「喔，你來啦！我正在研究關都地區的寶可夢。」');
      await UI.say('大木博士：「可以幫我一個忙嗎？先去捕捉 10 種寶可夢，讓我看看你的圖鑑吧！」');
      await Story.rival(1);
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
    if (s.flags.fossil && !s.flags.fossil_revived && G.state.bag[s.flags.fossil]) {
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

  // 傳說與幻之寶可夢（地圖上的實體）：捕捉後就從世界上消失，只有一隻
  // 傳說／幻之寶可夢已經捕捉或打倒（不再出現）
  legendDone(sp) { const s = G.state; return !!((s.legendsCaught && s.legendsCaught[sp]) || (s.legendsGone && s.legendsGone[sp])); },
  async legend(l) {
    const s = G.state, sp = POKEDEX[l.sp];
    const lm = l.lm;
    if (lm && lm.need === 'birds' && (s.badges.kanto || []).length < 4) { await UI.say(`${sp.n} 散發著強大的氣息……以現在的實力好像還無法接近。\n（需要 4 枚關都徽章）`); return; }
    if (lm && lm.need === 'champion' && !s.champs.kanto) { await UI.say(`${sp.n} 靜靜地看著你……「只有關都的冠軍才能接近。」`); return; }
    if (typeof playCry === 'function') playCry(l.sp);
    await UI.say(`${sp.lg === 2 ? '幻之寶可夢' : '傳說的寶可夢'}「${sp.n}」出現在眼前！`);
    const top = Math.max(...G.party.map(m => m.lv));
    if (top < l.lv - 15) {
      const c = await UI.choose(['挑戰', '先離開'], { prompt: `牠的力量深不可測（約 Lv.${l.lv}）。要挑戰嗎？`, cancel: false });
      if (c !== 0) return;
    }
    const wild = Mon.create(l.sp, l.lv, { perfect: 31, hidden: 0 });
    const r = await Game.battle({ wild, biome: World.tile(l.x, l.y) === T.WATER || World.tile(l.x, l.y) === T.DEEP ? 'water' : 'cave' });
    if (r === 'catch') {
      s.legendsCaught = s.legendsCaught || {};
      s.legendsCaught[l.sp] = 1;
      if (lm) s.flags['lm_' + lm.id] = 1;
      Game.save(true);
    } else if (r === 'win') {
      // 打倒之後：傳說／幻之寶可夢消失（和捕捉一樣，不會再出現在地圖上）
      s.legendsGone = s.legendsGone || {};
      s.legendsGone[l.sp] = 1;
      if (lm) s.flags['lm_' + lm.id] = 1;
      await UI.say(`${sp.n} 發出一聲長鳴，消失在遠方了……`);
      Game.save(true);
    }
    else if (r === 'run') await UI.say(`${sp.n} 仍然在原地。`);
  },

  // 地標事件
  async landmark(lm) {
    const s = G.state;
    const key = 'lm_' + lm.id;
    s.flags['seen_' + lm.id] = 1;
    await UI.say(`這裡是${lm.n}。`);
    // 洞窟解謎：推開石頭走到深處（沒有室內素材時直接進行原本的事件）
    const cave = CAVE_PUZZLES[lm.id];
    if (cave && typeof Interior !== 'undefined' && Interior.canCave(cave) && (lm.event === 'fossil' || s.flags[key] || Story.legendDone(lm.sp))) {
      await UI.say('大石頭擋住了洞窟的去路……推動石頭，找出通往深處的路吧！\n（走進石頭就能推動；卡住的話，離開洞窟再進來石頭會回到原位）');
      return Interior.enterCave(lm, cave, () => Story.caveGoal(lm));
    }
    return Story.caveGoal(lm, true);
  },
  // 走到洞窟深處（或沒有解謎時直接在入口）
  async caveGoal(lm, entrance = false) {
    const s = G.state;
    const key = 'lm_' + lm.id;
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
    // 洞窟深處的寶物（解謎的獎勵，只有一次）
    const loot = CAVE_LOOT[lm.id];
    if (!entrance && loot) {
      if (s.flags['cave_' + lm.id]) { await UI.say('洞窟深處很安靜，已經沒有東西了。'); return; }
      s.flags['cave_' + lm.id] = 1;
      for (const [id, n] of loot) Game.giveItem(id, n);
      Sound.sfx('item');
      await UI.say(`在洞窟深處找到了寶物！\n${loot.map(([id, n]) => `${ITEMS[id].n} ×${n}`).join('、')}`);
      return;
    }
    // 傳說寶可夢站在入口前（見 Story.legend）；入口本身只有景色
    if (s.flags[key] || Story.legendDone(lm.sp)) { await UI.say('這裡已經恢復了平靜。'); return; }
    const moved = [...World.legends.values()].find(l => l.sp === lm.sp && l.island);
    await UI.say(moved ? `${lm.n}留有傳說寶可夢的氣息……\n牠現在棲息在阿羅拉北方的「傳說之島」，可以從地圖使用飛翔前往。` : `${lm.n}的深處傳來強大的氣息……傳說的寶可夢就在入口前。`);
  },
});

export { RIVAL, EVENT_LEGENDS, CAVE_PUZZLES, CAVE_LOOT, QUEST, localQuest };
