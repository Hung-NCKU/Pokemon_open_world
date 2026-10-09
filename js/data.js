// 遊戲常數：屬性相剋、道具、地區、館主
// 中文譯名參考：神奇寶貝百科 (wiki.52poke.com)、寶可夢官方圖鑑 (tw.portal-pokemon.com)

const TYPES = {
  normal: { n: '一般', c: '#9fa19f' }, fire: { n: '火', c: '#e62829' }, water: { n: '水', c: '#2980ef' },
  electric: { n: '電', c: '#e0b000' }, grass: { n: '草', c: '#3fa129' }, ice: { n: '冰', c: '#3dcef3' },
  fighting: { n: '格鬥', c: '#ff8000' }, poison: { n: '毒', c: '#9141cb' }, ground: { n: '地面', c: '#915121' },
  flying: { n: '飛行', c: '#81b9ef' }, psychic: { n: '超能力', c: '#ef4179' }, bug: { n: '蟲', c: '#91a119' },
  rock: { n: '岩石', c: '#afa981' }, ghost: { n: '幽靈', c: '#704170' }, dragon: { n: '龍', c: '#5060e1' },
  dark: { n: '惡', c: '#624d4e' }, steel: { n: '鋼', c: '#60a1b8' }, fairy: { n: '妖精', c: '#ef70ef' },
  stellar: { n: '星晶', c: '#40b5a5' }, unknown: { n: '？？？', c: '#68a090' },
};

// 第六世代起的屬性相剋表（攻擊方 → 防守方）
const CHART = {
  normal: { rock: .5, ghost: 0, steel: .5 },
  fire: { fire: .5, water: .5, grass: 2, ice: 2, bug: 2, rock: .5, dragon: .5, steel: 2 },
  water: { fire: 2, water: .5, grass: .5, ground: 2, rock: 2, dragon: .5 },
  electric: { water: 2, electric: .5, grass: .5, ground: 0, flying: 2, dragon: .5 },
  grass: { fire: .5, water: 2, grass: .5, poison: .5, ground: 2, flying: .5, bug: .5, rock: 2, dragon: .5, steel: .5 },
  ice: { fire: .5, water: .5, grass: 2, ice: .5, ground: 2, flying: 2, dragon: 2, steel: .5 },
  fighting: { normal: 2, ice: 2, poison: .5, flying: .5, psychic: .5, bug: .5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: .5 },
  poison: { grass: 2, poison: .5, ground: .5, rock: .5, ghost: .5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: .5, poison: 2, flying: 0, bug: .5, rock: 2, steel: 2 },
  flying: { electric: .5, grass: 2, fighting: 2, bug: 2, rock: .5, steel: .5 },
  psychic: { fighting: 2, poison: 2, psychic: .5, dark: 0, steel: .5 },
  bug: { fire: .5, grass: 2, fighting: .5, poison: .5, flying: .5, psychic: 2, ghost: .5, dark: 2, steel: .5, fairy: .5 },
  rock: { fire: 2, ice: 2, fighting: .5, ground: .5, flying: 2, bug: 2, steel: .5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: .5 },
  dragon: { dragon: 2, steel: .5, fairy: 0 },
  dark: { fighting: .5, psychic: 2, ghost: 2, dark: .5, fairy: .5 },
  steel: { fire: .5, water: .5, electric: .5, ice: 2, rock: 2, steel: .5, fairy: 2 },
  fairy: { fire: .5, fighting: 2, poison: .5, dragon: 2, dark: 2, steel: .5 },
};

function typeEff(atk, defTypes) {
  let m = 1;
  for (const d of defTypes) {
    const r = CHART[atk] && CHART[atk][d];
    if (r !== undefined) m *= r;
  }
  return m;
}

function typeTag(t) {
  const ty = TYPES[t] || TYPES.unknown;
  return `<span class="type" style="background:${ty.c}">${ty.n}</span>`;
}

const ITEMS = {
  'poke-ball': { n: '精靈球', price: 200, kind: 'ball', rate: 1, d: '用來捕捉野生寶可夢的球。' },
  'great-ball': { n: '超級球', price: 600, kind: 'ball', rate: 1.5, d: '比精靈球更容易捕捉寶可夢。' },
  'ultra-ball': { n: '高級球', price: 800, kind: 'ball', rate: 2, d: '比超級球更容易捕捉寶可夢。' },
  'master-ball': { n: '大師球', price: 0, kind: 'ball', rate: 255, d: '必定能捕捉到野生寶可夢的最高性能球。' },
  'potion': { n: '傷藥', price: 200, kind: 'heal', hp: 20, d: '回復 20 HP。' },
  'super-potion': { n: '好傷藥', price: 700, kind: 'heal', hp: 60, d: '回復 60 HP。' },
  'hyper-potion': { n: '厲害傷藥', price: 1500, kind: 'heal', hp: 120, d: '回復 120 HP。' },
  'max-potion': { n: '全滿藥', price: 2500, kind: 'heal', hp: 99999, d: '回復全部 HP。' },
  'full-heal': { n: '萬靈藥', price: 400, kind: 'cure', d: '治癒所有異常狀態。' },
  'revive': { n: '活力碎片', price: 2000, kind: 'revive', d: '讓瀕死的寶可夢恢復一半 HP。' },
  'ether': { n: 'PP單項小補劑', price: 1200, kind: 'pp', d: '回復所有招式 10 PP。' },
  'repel': { n: '除蟲噴霧', price: 400, kind: 'repel', steps: 100, d: '100 步內不會遇到野生寶可夢。' },
  'rare-candy': { n: '神奇糖果', price: 4800, kind: 'candy', d: '讓寶可夢提升 1 級。' },
};

// 進化道具（含通訊交換用的連接繩）
const EVO_ITEMS = {
  'fire-stone': '火之石', 'water-stone': '水之石', 'thunder-stone': '雷之石', 'leaf-stone': '葉之石',
  'moon-stone': '月之石', 'sun-stone': '日之石', 'shiny-stone': '光之石', 'dusk-stone': '暗之石',
  'dawn-stone': '覺醒之石', 'ice-stone': '冰之石', 'linking-cord': '連接繩',
  'sweet-apple': '甜甜蘋果', 'tart-apple': '酸酸蘋果', 'syrupy-apple': '蜜汁蘋果',
  'cracked-pot': '破裂的茶壺', 'chipped-pot': '缺損的茶壺', 'galarica-cuff': '伽勒豆蔻手環',
  'galarica-wreath': '伽勒豆蔻花圈', 'black-augurite': '黑奇石', 'peat-block': '泥炭塊',
  'auspicious-armor': '慶祝之鎧', 'malicious-armor': '咒術之鎧', 'unremarkable-teacup': '凡作茶碗',
  'masterpiece-teacup': '傑作茶碗', 'metal-alloy': '複合金屬', 'scroll-of-darkness': '惡之掛軸',
  'scroll-of-waters': '水之掛軸',
};
for (const [id, n] of Object.entries(EVO_ITEMS)) {
  ITEMS[id] = { n, price: id === 'linking-cord' ? 3000 : 2100, kind: 'evo', d: '能讓某些寶可夢進化的道具。' };
}

const SHOP_LIST = ['poke-ball', 'great-ball', 'ultra-ball', 'potion', 'super-potion', 'hyper-potion', 'max-potion',
  'full-heal', 'revive', 'ether', 'repel', 'rare-candy', ...Object.keys(EVO_ITEMS)];

// 地區
const REGIONS = {
  kanto: { n: '關都', gen: 1, starters: [1, 4, 7], home: '真新鎮', prof: '大木博士', champ: '青綠' },
  johto: { n: '城都', gen: 2, starters: [152, 155, 158], home: '若葉鎮', prof: '空木博士', champ: '阿渡' },
  hoenn: { n: '豐緣', gen: 3, starters: [252, 255, 258], home: '未白鎮', prof: '小田卷博士', champ: '米可利' },
  sinnoh: { n: '神奧', gen: 4, starters: [387, 390, 393], home: '雙葉鎮', prof: '山梨博士', champ: '竹蘭' },
  unova: { n: '合眾', gen: 5, starters: [495, 498, 501], home: '鹿子鎮', prof: '紅豆杉博士', champ: '阿戴克' },
  kalos: { n: '卡洛斯', gen: 6, starters: [650, 653, 656], home: '朝香鎮', prof: '布拉塔諾博士', champ: '卡露妮' },
  alola: { n: '阿羅拉', gen: 7, starters: [722, 725, 728], home: '利利小鎮', prof: '庫庫伊博士', champ: '庫庫伊博士' },
  galar: { n: '伽勒爾', gen: 8, starters: [810, 813, 816], home: '化朗鎮', prof: '木蘭博士', champ: '丹帝' },
  paldea: { n: '帕底亞', gen: 9, starters: [906, 909, 912], home: '小匙鎮', prof: '奧琳博士', champ: '也慈' },
};

// 世界中各地區的位置（參考寶可夢世界全圖的相對位置；單位：格）[x, y, 半徑]
const REGION_POS = {
  galar: [250, 165, 50], kalos: [375, 185, 64], sinnoh: [545, 140, 56], johto: [535, 262, 58],
  kanto: [628, 272, 52], paldea: [300, 268, 52], unova: [385, 372, 66], hoenn: [528, 360, 56], alola: [820, 285, 62],
};
const REGION_KEYS = Object.keys(REGION_POS);
// 互相連通的地區（陸路或跨海大橋）
const REGION_LINKS = [
  ['kanto', 'johto'], ['johto', 'sinnoh'], ['sinnoh', 'kalos'], ['kalos', 'galar'], ['kalos', 'paldea'],
  ['paldea', 'unova'], ['kalos', 'unova'], ['unova', 'johto'], ['johto', 'hoenn'], ['kanto', 'hoenn'], ['kanto', 'alola'],
];
const CLIMATE = {
  sinnoh: { temp: -.45, wet: 0, water: 0 }, galar: { temp: -.12, wet: .03, water: 0 }, kalos: { temp: 0, wet: .02, water: 0 },
  johto: { temp: 0, wet: .04, water: 0 }, kanto: { temp: 0, wet: 0, water: 0 }, unova: { temp: .05, wet: -.04, water: 0 },
  hoenn: { temp: .2, wet: .05, water: .05 }, alola: { temp: .3, wet: .02, water: .08 }, paldea: { temp: .28, wet: -.12, water: -.02 },
};

// 道館館主（依各地區原作挑戰順序）
const LEADERS = {
  kanto: [['小剛', 'rock'], ['小霞', 'water'], ['馬志士', 'electric'], ['莉佳', 'grass'], ['阿桔', 'poison'], ['娜姿', 'psychic'], ['夏伯', 'fire'], ['坂木', 'ground']],
  johto: [['阿速', 'flying'], ['阿筆', 'bug'], ['小茜', 'normal'], ['松葉', 'ghost'], ['阿四', 'fighting'], ['阿蜜', 'steel'], ['柳伯', 'ice'], ['小椿', 'dragon']],
  hoenn: [['杜娟', 'rock'], ['藤樹', 'fighting'], ['鐵旋', 'electric'], ['亞莎', 'fire'], ['千里', 'normal'], ['娜琪', 'flying'], ['小楓與小南', 'psychic'], ['亞當', 'water']],
  sinnoh: [['瓢太', 'rock'], ['菜種', 'grass'], ['阿李', 'fighting'], ['吉憲', 'water'], ['梅麗莎', 'ghost'], ['東瓜', 'steel'], ['小菘', 'ice'], ['電次', 'electric']],
  unova: [['天桐', 'grass'], ['蘆薈', 'normal'], ['亞堤', 'bug'], ['小菊兒', 'electric'], ['菊老大', 'ground'], ['風露', 'flying'], ['哈奇庫', 'ice'], ['夏卡', 'dragon']],
  kalos: [['紫羅蘭', 'bug'], ['查克洛', 'rock'], ['可爾妮', 'fighting'], ['福爺', 'grass'], ['希特隆', 'electric'], ['瑪綉', 'fairy'], ['葛吉花', 'psychic'], ['得撫', 'ice']],
  alola: [['一般系隊長', 'normal'], ['水系隊長', 'water'], ['火系隊長', 'fire'], ['草系隊長', 'grass'], ['電系隊長', 'electric'], ['幽靈系隊長', 'ghost'], ['妖精系隊長', 'fairy'], ['龍系島主', 'dragon']],
  galar: [['亞洛', 'grass'], ['露璃娜', 'water'], ['卡蕪', 'fire'], ['彩豆', 'fighting'], ['波普菈', 'fairy'], ['瑪瓜', 'rock'], ['聶梓', 'dark'], ['奇巴納', 'dragon']],
  paldea: [['阿楓', 'bug'], ['寇沙', 'grass'], ['奇樹', 'electric'], ['海岱', 'water'], ['青木', 'normal'], ['萊姆', 'ghost'], ['莉普', 'psychic'], ['古魯夏', 'ice']],
};

const TRAINER_CLASSES = [
  { n: '短褲小子', types: null, c: '#e0603a' }, { n: '迷你裙', types: null, c: '#e86fb0' },
  { n: '捕蟲少年', types: ['bug'], c: '#7fae2a' }, { n: '登山男', types: ['rock', 'ground'], c: '#8a6a4a' },
  { n: '泳褲小伙子', types: ['water'], c: '#3a8ee0' }, { n: '超能力者', types: ['psychic'], c: '#b05ad0' },
  { n: '空手道王', types: ['fighting'], c: '#f0f0f0' }, { n: '養鳥人', types: ['flying'], c: '#70b0e0' },
  { n: '大小姐', types: ['fairy', 'normal'], c: '#f0a0c0' }, { n: '精英訓練家', types: null, c: '#304080' },
  { n: '靈媒師', types: ['ghost', 'psychic'], c: '#6a4a8a' }, { n: '噴火男', types: ['fire'], c: '#d03020' },
  { n: '暴走族', types: ['poison', 'dark'], c: '#404040' }, { n: '露營男', types: ['grass', 'normal'], c: '#5a9a3a' },
  { n: '龍使者', types: ['dragon'], c: '#4050c0' }, { n: '工作員', types: ['steel', 'electric'], c: '#e0a020' },
  { n: '滑雪者', types: ['ice'], c: '#a0e0f0' },
];
const TRAINER_NAMES = ['阿明', '小華', '志豪', '怡君', '家豪', '雅婷', '俊傑', '淑芬', '建宏', '美玲', '冠宇', '佳穎', '宗翰', '欣怡',
  '承恩', '詩涵', '柏翰', '品妤', '宇軒', '子晴', '彥廷', '思妤', '偉誠', '靜宜', '育成', '心怡', '冠廷', '于婷'];

const TOWN_A = ['紅', '青', '白', '黑', '金', '銀', '翠', '紫', '藍', '橙', '楓', '松', '竹', '梅', '櫻', '桐', '雲', '霧', '雪', '霜',
  '星', '月', '日', '風', '雷', '虹', '浪', '石', '岩', '砂', '泉', '湖', '海', '港', '峰', '谷', '原', '森', '花', '葉', '鈴', '鏡',
  '琥', '珀', '玫', '輝', '曙', '暮', '晴', '碧', '朱', '霞', '蓮', '菫'];
const TOWN_B = ['鎮', '市', '城', '村', '港', '丘', '鎮', '市'];

// 野生寶可夢棲息地 → 屬性權重
const BIOME_TYPES = {
  tall: { normal: 3, grass: 3, bug: 3, flying: 2, poison: 1.5, electric: 1.5, fairy: 1.2, fighting: .7, psychic: .7, fire: .8, dark: .5, ground: .5, dragon: .25, ghost: .3 },
  water: { water: 5 },
  cave: { rock: 3, ground: 3, steel: 2, fighting: 1.5, ghost: 1.2, dark: 1.2, poison: 1, dragon: .8, psychic: .5 },
  snow: { ice: 4, water: .4, steel: .5, fairy: .6, normal: .6, ghost: .4 },
  desert: { ground: 4, rock: 2, fire: 2, bug: 1, dragon: .8, poison: .5 },
};
const BIOME_ZH = { tall: '草叢', water: '水面', cave: '岩地', snow: '雪原', desert: '沙漠' };

// 對戰時的訓練家圖（Pokémon Showdown 圖庫）
const TRAINER_BATTLE_SPRITES = ['youngster-gen3', 'lass-gen3', 'bugcatcher-gen3', 'hiker-gen3', 'swimmerm-gen3', 'psychic-gen3',
  'blackbelt-gen3', 'birdkeeper-gen3', 'lady-gen3', 'acetrainer-gen3', 'hexmaniac-gen3', 'kindler-gen3', 'pokemaniac-gen3',
  'camper-gen3', 'dragontamer-gen3', 'ninjaboy-gen3', 'acetrainer-gen3'];
const LEADER_SPRITES = {
  kanto: ['brock', 'misty', 'ltsurge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'],
  johto: ['falkner', 'bugsy', 'whitney', 'morty', 'chuck', 'jasmine', 'pryce', 'clair'],
  hoenn: ['roxanne', 'brawly', 'wattson', 'flannery', 'norman', 'winona', 'tate', 'juan'],
  sinnoh: ['roark', 'gardenia', 'maylene', 'crasherwake', 'fantina', 'byron', 'candice', 'volkner'],
  unova: ['cilan', 'lenora', 'burgh', 'elesa', 'clay', 'skyla', 'brycen', 'drayden'],
  kalos: ['viola', 'grant', 'korrina', 'ramos', 'clemont', 'valerie', 'olympia', 'wulfric'],
  alola: ['ilima', 'lana', 'kiawe', 'mallow', 'sophocles', 'acerola', 'mina', 'ryuki'],
  galar: ['milo', 'nessa', 'kabu', 'bea', 'opal', 'gordie', 'piers', 'raihan'],
  paldea: ['katy', 'brassius', 'iono', 'kofu', 'larry', 'ryme', 'tulip', 'grusha'],
};
const CHAMP_SPRITES = { kanto: 'blue', johto: 'lance', hoenn: 'wallace', sinnoh: 'cynthia', unova: 'alder', kalos: 'diantha', alola: 'kukui', galar: 'leon', paldea: 'geeta' };
const TRAINER_SPRITE_URL = n => `https://play.pokemonshowdown.com/sprites/trainers/${n}.png`;
