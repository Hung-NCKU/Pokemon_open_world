// 城都、豐緣、神奧：比照關都標準的招牌隊伍、四天王、冠軍、傳說地標
// 隊伍參考原作（心金魂銀、綠寶石／歐米加紅寶石阿爾法藍寶石、白金）；名稱依神奇寶貝百科（52poke）
import { ELITE_FOUR, G, Game, LANDMARKS, LEAGUE_TOWN, SIGNATURE, Story, UI } from './core.js';
import { ITEMS, REGIONS } from './data.js';
import { Mon } from './mon.js';
import { EVENT_LEGENDS } from './story.js';
Object.assign(SIGNATURE, {
  johto: {
    gyms: [
      [[16, 17], [85, 164, 277, 398, 18]],            // 阿速：波波、比比鳥 → 嘟嘟利、貓頭夜鷹、大王燕、姆克鷹、大比鳥
      [[11, 14, 123], [214, 267, 416, 469, 212]],     // 阿筆：鐵甲蛹、鐵殼蛹、飛天螳螂 → 赫拉克羅斯、狩獵鳳蝶、蜂女王、遠古巨蜓、巨鉗螳螂
      [[35, 241], [40, 203, 400, 428, 241]],          // 小茜：皮皮、大奶罐 → 胖可丁、麒麟奇、大尾狸、長耳兔、大奶罐
      [[92, 93, 94], [302, 426, 429, 477, 94]],       // 松葉：鬼斯、鬼斯通、耿鬼 → 勾魂眼、隨風球、夢妖魔、黑夜魔靈、耿鬼
      [[57, 62], [237, 297, 57, 62, 68]],             // 阿四：火爆猴、蚊香泳士 → 戰舞郎、鐵掌力士、火爆猴、蚊香泳士、怪力
      [[81, 81, 208], [227, 437, 462, 306, 208]],     // 阿蜜：小磁怪、大鋼蛇 → 盔甲鳥、青銅鐘、自爆磁怪、波士可多拉、大鋼蛇
      [[86, 87, 221], [478, 461, 365, 131, 473]],     // 柳伯：小海獅、白海獅、長毛豬 → 雪妖女、瑪狃拉、帝牙海獅、拉普拉斯、象牙豬
      [[148, 148, 148, 230], [334, 130, 445, 149, 230]], // 小椿：哈克龍 ×3、刺龍王 → 七夕青鳥、暴鯉龍、烈咬陸鯊、快龍、刺龍王
    ],
    champ: () => [130, 142, 6, 149, 149, 149],        // 阿渡：暴鯉龍、化石翼龍、噴火龍、快龍 ×3
  },
  hoenn: {
    gyms: [
      [[74, 299], [76, 346, 348, 476]],               // 杜娟：小拳石、朝北鼻 → 隆隆岩、搖籃百合、太古盔甲、大朝北鼻
      [[66, 307, 296], [68, 308, 448, 297]],          // 藤樹：腕力、瑪沙那、幕下力士 → 怪力、恰雷姆、路卡利歐、鐵掌力士
      [[100, 309, 82, 310], [101, 462, 466, 310]],    // 鐵旋：霹靂電球、落雷獸、三合一磁怪、雷電獸
      [[218, 322, 324], [219, 323, 467, 324]],        // 亞莎：熔岩蟲、呆火駝、煤炭龜 → 熔岩蝸牛、噴火駝、鴨嘴炎獸、煤炭龜
      [[327, 288, 289], [264, 327, 288, 289]],        // 千里：晃晃斑、過動猿、請假王
      [[277, 279, 227, 334], [357, 279, 227, 398, 334]], // 娜琪：大王燕、大嘴鷗、盔甲鳥、七夕青鳥
      [[337, 338], [178, 344, 337, 338]],             // 小楓與小南：月石、太陽岩
      [[370, 340, 364, 342, 230], [340, 365, 342, 350, 230]], // 亞當：愛心魚、鯰魚王、海魔獅、鐵螯龍蝦、刺龍王 → 美納斯
    ],
    champ: () => [321, 73, 272, 340, 130, 350],      // 米可利：吼鯨王、毒刺水母、樂天河童、鯰魚王、暴鯉龍、美納斯
  },
  sinnoh: {
    gyms: [
      [[74, 95, 408], [76, 142, 411, 409]],           // 瓢太：小拳石、大岩蛇、頭蓋龍 → 隆隆岩、化石翼龍、護城龍、戰槌龍
      [[420, 387, 407], [455, 421, 465, 407]],        // 菜種：櫻花寶、草苗龜、羅絲雷朵 → 尖牙籠、櫻花兒、巨蔓藤、羅絲雷朵
      [[307, 67, 448], [62, 308, 297, 448]],          // 阿李：瑪沙那、豪力、路卡利歐
      [[130, 195, 419], [55, 130, 195, 419]],         // 吉憲：暴鯉龍、沼王、浮潛鼬
      [[426, 93, 429], [94, 477, 354, 429]],          // 梅麗莎：隨風球、鬼斯通、夢妖魔
      [[436, 208, 411], [462, 437, 208, 411]],        // 東瓜：銅鏡怪、大鋼蛇、護城龍
      [[459, 215, 308, 478], [460, 461, 308, 478]],   // 小菘：雪笠怪、狃拉、恰雷姆、雪妖女
      [[26, 424, 224, 405], [26, 466, 135, 405]],     // 電次：雷丘、雙尾怪手、章魚桶、倫琴貓
    ],
    champ: () => [442, 407, 423, 448, 350, 445],     // 竹蘭：花岩怪、羅絲雷朵、海兔獸、路卡利歐、美納斯、烈咬陸鯊
  },
});

Object.assign(ELITE_FOUR, {
  johto: [
    { name: '一樹', type: 'psychic', sprite: 'will', team: [178, 103, 80, 124, 178] },
    { name: '小桐', type: 'poison', sprite: 'koga', team: [168, 205, 89, 49, 169] },
    { name: '希巴', type: 'fighting', sprite: 'bruno', team: [237, 106, 107, 95, 68] },
    { name: '梨花', type: 'dark', sprite: 'karen', team: [197, 45, 198, 94, 229] },
  ],
  hoenn: [
    { name: '花月', type: 'dark', sprite: 'sidney', team: [262, 275, 332, 342, 359] },
    { name: '芙蓉', type: 'ghost', sprite: 'phoebe', team: [356, 354, 302, 354, 477] },
    { name: '波妮', type: 'ice', sprite: 'glacia', team: [362, 364, 362, 364, 365] },
    { name: '源治', type: 'dragon', sprite: 'drake', team: [372, 330, 334, 330, 373] },
  ],
  sinnoh: [
    { name: '阿柳', type: 'bug', sprite: 'aaron', team: [469, 416, 214, 452, 212] },
    { name: '菊野', type: 'ground', sprite: 'bertha', team: [195, 76, 450, 340, 464] },
    { name: '大葉', type: 'fire', sprite: 'flint', team: [229, 136, 78, 392, 467] },
    { name: '悟松', type: 'psychic', sprite: 'lucian', team: [122, 203, 196, 437, 475] },
  ],
});

Object.assign(LEAGUE_TOWN, { sinnoh: '寶可夢聯盟（鈴蘭島）' });

// 傳說地標（地名依神奇寶貝百科）；need：badges4（該地區 4 枚徽章）、champion（該地區冠軍）
LANDMARKS.johto = [
  { id: 'belltower', n: '鈴鐺塔', near: 3, event: 'legend', sp: 250, lv: 60, need: 'champion' },
  { id: 'whirlislands', n: '漩渦島', near: 5, sea: true, event: 'legend', sp: 249, lv: 60, need: 'badges4' },
  { id: 'burnedtower', n: '燒焦塔', near: 3, event: 'legend', sp: 245, lv: 45, need: 'badges4' },
  { id: 'mtsilver', n: '白銀山', near: 'league', event: 'red' },
];
LANDMARKS.hoenn = [
  { id: 'skypillar', n: '天空之柱', near: 7, event: 'legend', sp: 384, lv: 70, need: 'champion' },
  { id: 'seafloorcavern', n: '海底洞窟', near: 7, sea: true, event: 'legend', sp: 382, lv: 60, need: 'badges4' },
  { id: 'caveoforigin', n: '覺醒神殿', near: 7, event: 'legend', sp: 383, lv: 60, need: 'badges4' },
  { id: 'southernisland', n: '南方孤島', near: 4, sea: true, event: 'legend', sp: 380, lv: 50, need: 'badges4' },
  { id: 'desertruins', n: '沙漠遺跡', near: 3, event: 'legend', sp: 377, lv: 45 },
  { id: 'islandcave', n: '小島洞穴', near: 5, event: 'legend', sp: 378, lv: 45 },
  { id: 'ancienttomb', n: '古代墳墓', near: 5, event: 'legend', sp: 379, lv: 45 },
];
LANDMARKS.sinnoh = [
  { id: 'spearpillar', n: '槍之柱', near: 'league', event: 'legend', sp: 483, lv: 70, need: 'champion' },
  { id: 'turnbackcave', n: '歸途洞窟', near: 6, event: 'legend', sp: 487, lv: 70, need: 'champion' },
  { id: 'stark', n: '嚴酷山', near: 'league', event: 'legend', sp: 485, lv: 65, need: 'champion' },
  { id: 'laketemp', n: '心齊湖', near: 2, event: 'legend', sp: 481, lv: 50 },
  { id: 'lakevalor', n: '立志湖', near: 4, event: 'legend', sp: 482, lv: 50 },
  { id: 'lakeacuity', n: '睿智湖', near: 6, event: 'legend', sp: 480, lv: 50 },
  { id: 'snowpointtemple', n: '雪峰神殿', near: 6, event: 'legend', sp: 486, lv: 70, need: 'champion' },
  { id: 'fullmoon', n: '滿月島', near: 3, sea: true, event: 'legend', sp: 488, lv: 50, need: 'badges4' },
];
for (const list of [LANDMARKS.johto, LANDMARKS.hoenn, LANDMARKS.sinnoh]) for (const lm of list) if (lm.sp) EVENT_LEGENDS.add(lm.sp);

// 條件判定（關都沿用原本的 birds）
const LegendGate = {
  ok(lm) {
    const s = G.state, region = lm.region;
    if (lm.need === 'birds') return (s.badges.kanto || []).length >= 4;
    if (lm.need === 'badges4') return (s.badges[region] || []).length >= 4;
    if (lm.need === 'champion') return !!s.champs[region];
    return true;
  },
  text(lm, name) {
    const reg = REGIONS[lm.region].n;
    if (lm.need === 'champion') return `${name} 靜靜地看著你……「只有${reg}的冠軍才能接近。」`;
    return `${name} 散發著強大的氣息……以現在的實力好像還無法接近。\n（需要 4 枚${reg}徽章）`;
  },
};
const _storyLegend = Story.legend;
Story.legend = async function (l) {
  if (l.lm && l.lm.need && !LegendGate.ok(l.lm)) { await UI.say(LegendGate.text(l.lm, POKEDEX[l.sp].n)); return; }
  return _storyLegend.call(this, l.lm ? { ...l, lm: { ...l.lm, need: null }, _lm: l.lm } : l).then(r => {
    // 捕捉的旗標仍記在原本的地標上
    if (l.lm && Story.legendDone(l.sp)) G.state.flags['lm_' + l.lm.id] = 1;
    return r;
  });
};

// 白銀山：城都冠軍之後，赤紅
const _storyLandmarkR = Story.landmark;
Story.landmark = async function (lm) {
  if (lm.event !== 'red') return _storyLandmarkR.call(this, lm);
  const s = G.state;
  s.flags['seen_' + lm.id] = 1;
  await UI.say(`這裡是${lm.n}。山頂吹著刺骨的寒風……`);
  if (!s.champs.johto) { await UI.say('入口的警衛：「只有實力被城都聯盟認可的訓練家才能入山。」'); return; }
  if (s.flags.red_done) { await UI.say('山頂上站著一位沉默的訓練家。他對你點了點頭。'); }
  await UI.say('山頂上站著一位沉默的訓練家……\n「…………」');
  const c = await UI.choose(['挑戰', '離開'], { prompt: '要挑戰他嗎？' });
  if (c !== 0) return;
  const L = s.flags.red_done ? 95 : 85;
  const party = [[25, 'light-ball'], [196, 'leftovers'], [143, 'leftovers'], [3, 'sitrus-berry'], [6, 'charizardite-y'], [9, 'blastoisinite']]
    .map(([sp, it], i) => { const m = Mon.create(sp, L - (5 - i), { perfect: 31 }); m.item = ITEMS[it] ? it : null; return m; });
  const r = await Game.battle({ trainer: { title: '寶可夢訓練家', name: '赤紅', party, kind: 'champion', money: 300, items: 2, sprite: 'red', lose: '…………！' }, biome: 'snow' });
  if (r === 'win') {
    if (!s.flags.red_done) { Game.giveItem('master-ball', 1); await UI.say('赤紅默默地遞給你一顆大師球，然後消失在風雪之中……'); }
    s.flags.red_done = 1; s.flags['lm_' + lm.id] = 1;
    Game.save(true);
  }
};

export { LegendGate, _storyLegend, _storyLandmarkR };
