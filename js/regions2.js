// 合眾、卡洛斯、阿羅拉、伽勒爾、帕底亞：比照關都的招牌隊伍、四天王、冠軍、傳說地標，以及各地區自己的進度結構
//   合眾：等離子隊（手下 → Ｎ → 冠軍後的魁奇思）
//   卡洛斯：閃焰隊秘密基地（弗拉達利），打倒後哲爾尼亞斯才會現身
//   阿羅拉：島巡禮的試煉（隊長＋霸主寶可夢，霸主有提升全能力的氣場），試煉通過後拿到 Z 純晶
//   伽勒爾：冠軍盃（瑪俐 → 赫普 → 露璃娜 → 奇巴納）之後才是冠軍丹帝
//   帕底亞：三條主線——冠軍之路（道館）、傳說之路（5 隻寶主寶可夢）、星塵大道（5 個天星隊據點）
// 名稱依神奇寶貝百科（52poke）；隊伍參考原作。新的地標只在世界配置第 5 版以後出現（ver: 5），舊存檔的世界不變。
Object.assign(GYM_TOWNS, {
  unova: ['三曜市', '七寶市', '飛雲市', '雷文市', '帆巴市', '吹寄市', '雪花市', '雙龍市'],
  kalos: ['白檀市', '遙香市', '娑羅市', '比翼市', '密阿雷市', '香薰市', '百刻市', '映雪市'],
  alola: ['蔥鬱洞窟', '潺潺之丘', '維拉火山公園', '樹蔭叢林', '輝克拉尼天文台', '超值超市舊址', '海洋居民之村', '魄鎮'],
  galar: ['草路鎮', '水舟鎮', '機擎市', '溯傳鎮', '舞姿鎮', '戰競鎮', '尖釘鎮', '拳關市'],
  paldea: ['圓模鎮', '深缽鎮', '釀光市', '玻瓶市', '錦匯鎮', '冰櫃鎮', '焙固鎮', '霜抹山'],
});
Object.assign(LEAGUE_TOWN, { galar: '宮門市', alola: '寶可夢聯盟（拉納基拉山）' });
// 阿羅拉的試煉：隊長（原本是「○○系隊長」）
LEADERS.alola = [['伊利馬', 'normal'], ['水蓮', 'water'], ['卡奇', 'fire'], ['瑪奧', 'grass'], ['馬瑪內', 'electric'], ['阿塞蘿拉', 'ghost'], ['茉莉', 'fairy'], ['大峽谷的霸主', 'dragon']];
// 霸主寶可夢（依試煉屬性）：貓鼬探長、弱丁魚、焰后蜥、蘭螳花、鍬農炮蟲、謎擬Ｑ、蝶結萌虻、杖尾鱗甲龍
const TOTEMS = { normal: 735, water: 746, fire: 758, grass: 754, electric: 738, ghost: 778, fairy: 743, dragon: 784 };

Object.assign(SIGNATURE, {
  unova: {
    gyms: [
      [[506, 511], [556, 549, 547, 591, 512]],          // 天桐：小約克、花椰猴 → 沙鈴仙人掌、裙兒小姐、風妖精、敗露球菇、花椰猿
      [[507, 505], [531, 573, 628, 508, 505]],          // 蘆薈：哈約克、步哨鼠 → 差不多娃娃、奇諾栗鼠、勇士雄鷹、長毛狗、步哨鼠
      [[544, 541, 542], [545, 558, 589, 617, 542]],     // 亞堤：車輪毬、寶包繭、保母蟲 → 蜈蚣王、岩殿居蟹、騎士蝸牛、敏捷蟲、保母蟲
      [[587, 587, 523], [596, 604, 587, 523]],          // 小菊兒：電飛鼠、斑馬 → 電蜘蛛、麻麻鰻魚王、電飛鼠、雷電斑馬
      [[552, 536, 530], [553, 537, 623, 530]],          // 菊老大：混混鱷、藍蟾蜍、龍頭地鼠 → 流氓鱷、蟾蜍王、泥偶巨人、龍頭地鼠
      [[528, 521, 581], [528, 628, 561, 521, 581]],     // 風露：心蝙蝠、高傲雉雞、舞天鵝 → ……象徵鳥
      [[583, 615, 614], [584, 615, 87, 614]],           // 哈奇庫：雙倍多多冰、幾何雪花、凍原熊
      [[611, 621, 612], [621, 330, 373, 612]],          // 夏卡：斧牙龍、赤面龍、雙斧戰龍 → ……沙漠蜻蜓、暴飛龍
    ],
    champ: () => [617, 626, 621, 584, 589, 637],        // 阿戴克：敏捷蟲、爆炸頭水牛、赤面龍、雙倍多多冰、騎士蝸牛、火神蛾
  },
  kalos: {
    gyms: [
      [[283, 666], [284, 213, 617, 666]],               // 紫羅蘭：溜溜糖球、彩粉蝶 → 雨翅蛾、壺壺、敏捷蟲、彩粉蝶
      [[698, 696], [699, 142, 526, 697]],               // 查克洛：冰雪龍、寶寶暴龍 → 冰雪巨龍、化石翼龍、龐岩怪、怪顎龍
      [[619, 67, 701], [620, 68, 701, 448]],            // 可爾妮：功夫鼬、豪力、摔角鷹人 → 師父鼬、怪力、摔角鷹人、路卡利歐
      [[189, 70, 673], [189, 71, 465, 673]],            // 福爺：毽子棉、口呆花、坐騎山羊 → ……大食花、巨蔓藤
      [[587, 82, 695], [587, 462, 181, 695]],           // 希特隆：電飛鼠、三合一磁怪、光電傘蜥 → ……自爆磁怪、電龍
      [[303, 122, 700], [303, 122, 683, 685, 700]],     // 瑪綉：大嘴娃、魔牆人偶、仙子伊布 → ……芳香精、胖甜妮
      [[561, 199, 678], [561, 199, 576, 678]],          // 葛吉花：象徵鳥、呆呆王、超能妙喵 → ……哥德小姐
      [[460, 615, 713], [460, 615, 87, 713]],           // 得撫：暴雪王、幾何雪花、冰岩怪
    ],
    champ: () => [701, 697, 699, 711, 706, 282],        // 卡露妮：摔角鷹人、怪顎龍、冰雪巨龍、南瓜怪人、黏美龍、沙奈朵
  },
  alola: {
    // 試煉：霸主寶可夢由 TOTEMS 指定，這裡是前期／後期的同伴（排在霸主前面）
    gyms: [
      [[734], [20, 734]], [[747], [594, 747]], [[757], [752, 757]], [[753], [756, 753]],
      [[737], [596, 737]], [[592], [302, 592]], [[742], [700, 742]], [[783], [373, 783]],
    ],
    champ: () => [745, 38, 628, 462, 143, 727],        // 庫庫伊博士：鬃岩狼人、九尾、勇士雄鷹、自爆磁怪、卡比獸、熾焰咆哮虎
  },
  galar: {
    gyms: [
      [[829, 830], [549, 547, 470, 830]],               // 亞洛：幼棉棉、白蓬蓬 → 裙兒小姐、風妖精、葉伊布、白蓬蓬
      [[118, 846, 834], [119, 847, 130, 834]],          // 露璃娜：角金魚、刺梭魚、暴噬龜 → 金魚王、戽斗尖梭、暴鯉龍、暴噬龜
      [[38, 59, 851], [38, 59, 324, 851]],              // 卡蕪：九尾、風速狗、焚焰蚣 → ……煤炭龜
      [[237, 68], [237, 870, 107, 68]],                 // 彩豆：戰舞郎、怪力 → ……列陣兵、快拳郎
      [[303, 869], [303, 468, 858, 869]],               // 波普菈：大嘴娃、霜奶仙 → ……波克基斯、布莉姆溫
      [[874, 839], [689, 213, 874, 839]],               // 瑪瓜：巨石丁、巨炭山 → 龜足巨鎧、壺壺……
      [[560, 435, 862], [560, 435, 687, 862]],          // 聶梓：頭巾混混、坦克臭鼬、堵攔熊 → ……烏賊王
      [[330, 844, 884], [526, 330, 844, 884]],          // 奇巴納：沙漠蜻蜓、沙螺蟒、鋁鋼龍 → 龐岩怪……
    ],
    champ: () => [681, 887, 866, 464, 612, 6],          // 丹帝：堅盾劍怪、多龍巴魯托、踏冰人偶、超甲狂犀、雙斧戰龍、噴火龍
  },
  paldea: {
    gyms: [
      [[919, 917, 216], [920, 918, 666, 217]],          // 阿楓：豆蟋蟀、團珠蛛、熊寶寶 → 烈腿蝗、操陷蛛、彩粉蝶、圈圈熊
      [[548, 928, 185], [549, 930, 950, 185]],          // 寇沙：百合根娃娃、迷你芙、樹才怪 → 裙兒小姐、奧利瓦、毛崖蟹……
      [[940, 939, 404, 429], [941, 939, 405, 429]],     // 奇樹：電海燕、電肚蛙、勒克貓、夢妖魔 → 大電海燕……倫琴貓
      [[976, 961, 740], [976, 961, 130, 740]],          // 海岱：輕身鱈、三海地鼠、好勝毛蟹 → ……暴鯉龍
      [[775, 982, 398], [775, 982, 693, 398]],          // 青木：樹枕尾熊、土龍節節、姆克鷹
      [[354, 778, 972, 849], [354, 778, 972, 849]],     // 萊姆：詛咒娃娃、謎擬Ｑ、墓揚犬、顫弦蠑螈
      [[981, 282, 956, 671], [981, 282, 956, 671]],     // 莉普：奇麒麟、沙奈朵、超能艷鴕、花潔夫人
      [[873, 614, 975, 334], [873, 614, 975, 334]],     // 古魯夏：鎧甲蛾、凍原熊、浩大鯨、七夕青鳥
    ],
    champ: () => [956, 673, 976, 983, 713, 970],        // 也慈：超能艷鴕、坐騎山羊、輕身鱈、仆刀將軍、冰岩怪、晶光花
  },
});

Object.assign(ELITE_FOUR, {
  unova: [
    { name: '婉龍', type: 'ghost', sprite: 'shauntal', team: [563, 593, 623, 609] },
    { name: '越橘', type: 'dark', sprite: 'grimsley', team: [510, 553, 560, 625] },
    { name: '嘉德麗雅', type: 'psychic', sprite: 'caitlin', team: [518, 561, 579, 576] },
    { name: '連武', type: 'fighting', sprite: 'marshal', team: [538, 539, 534, 620] },
  ],
  kalos: [
    { name: '帕琦拉', type: 'fire', sprite: 'malva', team: [668, 324, 609, 663] },
    { name: '志米', type: 'water', sprite: 'siebold', team: [693, 121, 689, 130] },
    { name: '雁鎧', type: 'steel', sprite: 'wikstrom', team: [707, 476, 589, 681] },
    { name: '朵拉塞娜', type: 'dragon', sprite: 'drasna', team: [691, 715, 334, 621] },
  ],
  alola: [
    { name: '哈拉', type: 'fighting', sprite: 'hala', team: [297, 57, 760, 62, 740] },
    { name: '麗姿', type: 'rock', sprite: 'olivia', team: [476, 703, 76, 745] },
    { name: '阿塞蘿拉', type: 'ghost', sprite: 'acerola', team: [302, 478, 426, 781, 770] },
    { name: '卡希麗', type: 'flying', sprite: 'kahili', team: [227, 630, 741, 733] },
  ],
  // 伽勒爾沒有四天王，冠軍盃的對手依序上場
  galar: [
    { name: '瑪俐', title: '冠軍盃', type: 'dark', sprite: 'marnie', team: [510, 454, 560, 877, 861] },
    { name: '赫普', title: '冠軍盃', type: 'normal', sprite: 'hop', team: [832, 143, 823, 870, 812] },
    { name: '露璃娜', title: '冠軍盃', type: 'water', sprite: 'nessa', team: [119, 847, 130, 834] },
    { name: '奇巴納', title: '冠軍盃', type: 'dragon', sprite: 'raihan', team: [526, 330, 844, 884] },
  ],
  paldea: [
    { name: '辛俐', type: 'ground', sprite: 'rika', team: [340, 232, 51, 980, 323] },
    { name: '波琵', type: 'steel', sprite: 'poppy', team: [879, 437, 966, 959] },
    { name: '青木', type: 'flying', sprite: 'larry', team: [357, 741, 334, 398, 973] },
    { name: '八朔', type: 'dragon', sprite: 'hassel', team: [715, 691, 841, 612, 998] },
  ],
});

// 地標（ver 5 起）：傳說寶可夢與各地區的組織
LANDMARKS.unova = [
  { id: 'plasma', n: '等離子隊的集會', near: 2, event: 'boss', ver: 5, need: 2, lvOff: 2,
    fights: [{ title: '等離子隊手下', name: '', sprite: 'plasmagrunt', team: [509, 504, 551] }, { title: '等離子隊手下', name: '', sprite: 'plasmagruntf', team: [570, 509, 543] }],
    intro: '穿著騎士服的人正在演講：「讓寶可夢獲得解放吧！」', win: '等離子隊的手下四散逃走了。', reward: [['rare-candy', 2]] },
  { id: 'nscastle', n: 'Ｎ的身影', near: 5, event: 'boss', ver: 5, need: 5, lvOff: 4, needFlag: 'boss_plasma',
    fights: [{ title: '等離子隊之王', name: 'Ｎ', sprite: 'n', team: [571, 565, 601, 567, 584] }],
    intro: 'Ｎ：「你的寶可夢在說話……牠們說喜歡你。我想知道那是不是真的。」', win: 'Ｎ：「……原來如此。我要再想一想。」', reward: [['ultra-ball', 5]] },
  { id: 'ghetsis', n: '等離子隊的城堡', near: 'league', event: 'boss', ver: 5, need: 'champion', lvOff: 0, needFlag: 'boss_nscastle', champBase: true,
    fights: [{ title: '等離子隊', name: '魁奇思', sprite: 'ghetsis', team: [563, 537, 625, 604, 452, 635] }],
    intro: '魁奇思：「Ｎ不過是我的棋子。打倒冠軍又如何？我要用寶可夢支配這個世界！」', win: '魁奇思：「不可能……我的計畫……」\n等離子隊徹底瓦解了。', reward: [['master-ball', 1]] },
  { id: 'dragonspiral', n: '龍螺旋之塔', near: 6, event: 'legend', sp: 643, lv: 60, need: 'champion', ver: 5 },
  { id: 'giantchasm', n: '巨人洞窟', near: 7, event: 'legend', sp: 646, lv: 70, need: 'champion', ver: 5 },
];
LANDMARKS.kalos = [
  { id: 'flare', n: '閃焰隊秘密基地', near: 6, event: 'boss', ver: 5, need: 7, lvOff: 4,
    fights: [{ title: '閃焰隊手下', name: '', sprite: 'flaregrunt', team: [228, 434, 668] }, { title: '閃焰隊老大', name: '弗拉達利', sprite: 'lysandre', team: [620, 430, 668, 130] }],
    intro: '弗拉達利：「這個世界的資源有限。為了美麗的世界，只能讓少數人留下來。」', win: '弗拉達利：「……我的理想……」\n閃焰隊的終極兵器停止了。基地深處傳來生命的光芒……', reward: [['rare-candy', 3]] },
  { id: 'xerneasdeep', n: '基地深處的光芒', near: 6, event: 'legend', sp: 716, lv: 60, need: 'flag:boss_flare', needText: '要先阻止閃焰隊（打倒弗拉達利）', ver: 5 },
  { id: 'terminuscave', n: '終結洞窟', near: 7, event: 'legend', sp: 718, lv: 70, need: 'champion', ver: 5 },
];
LANDMARKS.alola = [
  // 索爾迦雷歐、露奈雅拉由科斯莫古進化而來（世界上只放科斯莫古）
  { id: 'altarsun', n: '日輪祭壇', near: 'league', event: 'legend', sp: 789, lv: 40, need: 'champion', ver: 5 },
  { id: 'ruinsconflict', n: '戰爭遺跡', near: 0, event: 'legend', sp: 785, lv: 60, need: 'badges4', ver: 5 },
  { id: 'ruinslife', n: '生命遺跡', near: 2, event: 'legend', sp: 786, lv: 60, need: 'badges4', ver: 5 },
  { id: 'ruinsabundance', n: '豐收遺跡', near: 4, event: 'legend', sp: 787, lv: 60, need: 'badges4', ver: 5 },
  { id: 'ruinshope', n: '彼岸遺跡', near: 6, event: 'legend', sp: 788, lv: 60, need: 'badges4', ver: 5 },
];
LANDMARKS.galar = [
  { id: 'slumberingweald', n: '微寐森林', near: 0, event: 'legend', sp: 888, lv: 70, need: 'champion', ver: 5 },
  { id: 'energyplant', n: '能源工廠', near: 7, event: 'legend', sp: 890, lv: 60, need: 'badges4', ver: 5 },
];
// 帕底亞：寶主寶可夢（傳說之路）與天星隊據點（星塵大道）
LANDMARKS.paldea = [
  { id: 'titan1', n: '岩壁寶主', near: 0, event: 'titan', sp: 950, lvOff: 4, ver: 5 },
  { id: 'titan2', n: '長空寶主', near: 1, event: 'titan', sp: 962, lvOff: 4, ver: 5 },
  { id: 'titan3', n: '潛鋼寶主', near: 3, event: 'titan', sp: 968, lvOff: 4, ver: 5 },
  { id: 'titan4', n: '土震寶主', near: 5, event: 'titan', sp: 984, lvOff: 4, ver: 5 },
  { id: 'titan5', n: '偽龍寶主', near: 7, event: 'titan', sp: 977, lvOff: 4, ver: 5 },
  { id: 'star1', n: '天星隊據點（惡）', near: 0, event: 'boss', ver: 5, need: 0, lvOff: 3, star: true,
    fights: [{ title: '天星隊老大', name: '皮拿', sprite: 'giacomo', team: [624, 966] }], intro: '皮拿：「想讓天星隊解散？先打贏我再說！」', win: '皮拿：「……好啦，你很強。」', reward: [['rare-candy', 1]] },
  { id: 'star2', n: '天星隊據點（火）', near: 2, event: 'boss', ver: 5, need: 0, lvOff: 3, star: true,
    fights: [{ title: '天星隊老大', name: '梅洛可', sprite: 'mela', team: [935, 966] }], intro: '梅洛可：「你就是那個踢館的？燒光你！」', win: '梅洛可：「哼……算你厲害。」', reward: [['rare-candy', 1]] },
  { id: 'star3', n: '天星隊據點（毒）', near: 4, event: 'boss', ver: 5, need: 0, lvOff: 3, star: true,
    fights: [{ title: '天星隊老大', name: '秋明', sprite: 'atticus', team: [454, 453, 966] }], intro: '秋明：「風雅之毒，閣下可願一試？」', win: '秋明：「……甘拜下風。」', reward: [['rare-candy', 1]] },
  { id: 'star4', n: '天星隊據點（妖精）', near: 5, event: 'boss', ver: 5, need: 0, lvOff: 3, star: true,
    fights: [{ title: '天星隊老大', name: '奧爾迪加', sprite: 'ortega', team: [700, 858, 966] }], intro: '奧爾迪加：「你這樣闖進來很失禮耶！」', win: '奧爾迪加：「嗚……不公平啦！」', reward: [['rare-candy', 1]] },
  { id: 'star5', n: '天星隊據點（格鬥）', near: 6, event: 'boss', ver: 5, need: 0, lvOff: 3, star: true,
    fights: [{ title: '天星隊老大', name: '枇琶', sprite: 'eri', team: [68, 107, 966] }], intro: '枇琶：「天星隊由我來守護！」', win: '枇琶：「……我認輸。」', reward: [['rare-candy', 1]] },
  { id: 'areazero', n: '零之大空洞', near: 'league', event: 'legend', sp: 1007, lv: 70, need: 'champion', ver: 5 },
];
for (const r of ['unova', 'kalos', 'alola', 'galar', 'paldea']) for (const lm of LANDMARKS[r]) if (lm.sp && lm.event === 'legend') EVENT_LEGENDS.add(lm.sp);

// 條件：flag:xxx（某個旗標）
const _gateOk = LegendGate.ok, _gateText = LegendGate.text;
LegendGate.ok = function (lm) {
  if (typeof lm.need === 'string' && lm.need.startsWith('flag:')) return !!G.state.flags[lm.need.slice(5)];
  return _gateOk.call(this, lm);
};
LegendGate.text = function (lm, name) {
  if (lm.needText) return `${name} 散發著強大的氣息……\n（${lm.needText}）`;
  return _gateText.call(this, lm, name);
};

// 組織的首領與寶主寶可夢
const Regions2 = {
  // 地標附近的強度：該地區、該地點的野外等級 + 偏移
  level(lm, off = 0) {
    const t = World.towns.find(x => x.region === lm.region && (lm.near === 'league' ? x.kind === 'league' : x.gym === lm.near));
    const base = lm.champBase ? Math.max(...World.championParty(t).map(m => m.lv)) : Math.round(World.levelAt(lm.x, lm.y));
    return U.clamp(base + off, 5, 100);
  },
  async boss(lm) {
    const s = G.state, key = 'boss_' + lm.id;
    await UI.say(`這裡是${lm.n}。`);
    if (s.flags[key]) { await UI.say(lm.star ? '據點已經解散了，只剩下天星隊的旗子。' : '這裡已經恢復了平靜。'); return; }
    const have = Game.badgeCount(lm.region);
    if (lm.need === 'champion' ? !s.champs[lm.region] : have < (lm.need || 0)) {
      await UI.say(`入口有人把守著，好像還進不去。\n（需要${lm.need === 'champion' ? `成為${REGIONS[lm.region].n}冠軍` : ` ${lm.need} 枚${REGIONS[lm.region].n}徽章`}）`);
      return;
    }
    if (lm.needFlag && !s.flags[lm.needFlag]) { await UI.say('四周空無一人……好像還有別的事要先做。'); return; }
    await UI.say(lm.intro);
    const L = Regions2.level(lm, lm.lvOff || 0);
    for (let i = s.flags[key + '_n'] || 0; i < lm.fights.length; i++) {
      const f = lm.fights[i];
      const last = i === lm.fights.length - 1;
      const party = f.team.map((sp, k) => Mon.create(World.evolveFor(sp, L), U.clamp(L - (f.team.length - 1 - k), 5, 100), { perfect: last ? 25 : 15 }));
      // 天星隊的王牌：星隊車（車輪型態的噗隆隆）
      const r = await Game.battle({ trainer: { title: f.title, name: f.name, party, kind: last ? 'gym' : 'trainer', money: last ? 120 : 50, items: last ? 2 : 0, sprite: f.sprite, lose: last ? '……' : '可惡……！' } });
      if (r !== 'win') return;
      s.flags[key + '_n'] = i + 1;
    }
    s.flags[key] = 1; s.flags['lm_' + lm.id] = 1;
    await UI.say(lm.win);
    for (const [id, n] of lm.reward || []) { Game.giveItem(id, n); await UI.say(`獲得了 ${ITEMS[id].n}${n > 1 ? ` ×${n}` : ''}！`); }
    Game.save(true);
  },
  // 寶主寶可夢：有氣場（全能力提升）的大型野生寶可夢，打倒後牠會離開（不能捕捉）
  async titan(lm) {
    const s = G.state, key = 'titan_' + lm.id;
    await UI.say(`這裡是${lm.n}的地盤。`);
    if (s.flags[key]) { await UI.say(`${POKEDEX[lm.sp].n}已經離開了。地上留著祕傳調味料的香氣……`); return; }
    await UI.say(`巨大的${POKEDEX[lm.sp].n}出現了！牠的身體散發著奇妙的光芒！`);
    const L = Regions2.level(lm, lm.lvOff || 0);
    const m = Mon.create(lm.sp, L, { perfect: 31 });
    const r = await Game.battle({ trainer: { title: '寶主寶可夢', name: POKEDEX[lm.sp].n, party: [m], kind: 'gym', money: 0, sprite: null, aura: true, lose: '' }, biome: 'rock' });
    if (r !== 'win') return;
    s.flags[key] = 1; s.flags['lm_' + lm.id] = 1;
    Game.giveItem('rare-candy', 2);
    await UI.say(`${POKEDEX[lm.sp].n}逃走了！\n找到了祕傳調味料……和 2 顆神奇糖果！\n（帕底亞的傳說之路：${Regions2.count('titan')}／5）`);
    Game.save(true);
  },
  count(kind) { return (LANDMARKS.paldea || []).filter(l => l.event === kind && G.state.flags[(kind === 'titan' ? 'titan_' : 'boss_') + l.id]).length; },
  // 任務摘要
  quests(s) {
    const out = [];
    const seen = r => s.region === r || World.towns.some(t => t.region === r && s.visited[t.id]);
    if (seen('unova')) out.push(s.flags.boss_ghetsis ? '等離子隊：已瓦解' : s.flags.boss_nscastle ? '等離子隊：Ｎ離開了……成為合眾冠軍後去等離子隊的城堡' : s.flags.boss_plasma ? '等離子隊：Ｎ出現在吹寄市附近（需要 5 枚合眾徽章）' : '等離子隊：在飛雲市附近集會（需要 2 枚合眾徽章）');
    if (seen('kalos')) out.push(s.flags.boss_flare ? '閃焰隊：已阻止（基地深處的傳說寶可夢現身了）' : '閃焰隊：百刻市附近有秘密基地（需要 7 枚卡洛斯徽章）');
    if (seen('alola')) out.push(`島巡禮：通過了 ${(s.badges.alola || []).length}／8 個試煉`);
    if (seen('paldea')) {
      out.push(`帕底亞・冠軍之路：道館徽章 ${(s.badges.paldea || []).length}／8`);
      out.push(`帕底亞・傳說之路：寶主寶可夢 ${Regions2.count('titan')}／5`);
      out.push(`帕底亞・星塵大道：天星隊據點 ${Regions2.count('boss')}／5`);
    }
    return out;
  },
};

// 地標事件、任務摘要接上
const _storyLandmark2 = Story.landmark;
Story.landmark = async function (lm) {
  if (lm.event === 'boss') { G.state.flags['seen_' + lm.id] = 1; return Regions2.boss(lm); }
  if (lm.event === 'titan') { G.state.flags['seen_' + lm.id] = 1; return Regions2.titan(lm); }
  return _storyLandmark2.call(this, lm);
};
const _questSummary2 = Story.questSummary;
Story.questSummary = function (s) {
  const extra = Regions2.quests(s);
  return _questSummary2.call(this, s) + (extra.length ? '\n' + extra.map(x => '・' + x).join('\n') : '');
};

// 阿羅拉的試煉隊伍：霸主寶可夢帶頭（Lv +1、個體值滿、文柚果），後面是同伴
const _gymParty2 = World.gymParty;
World.gymParty = function (town) {
  const party = _gymParty2.call(this, town);
  if (town.region !== 'alola' || (G.state && G.state.champs && G.state.champs.alola)) return party;
  const type = LEADERS.alola[town.gym][1];
  const L = this.gymLevel(town);
  const totem = Mon.create(TOTEMS[type], Math.min(100, L + 1), { shiny: false, perfect: 31, item: 'sitrus-berry' });
  return [totem, ...party.slice(0, Math.max(1, party.length - 1)).filter(m => m.sp !== totem.sp)];
};
