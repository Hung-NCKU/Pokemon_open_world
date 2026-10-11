// 城都：比照關都的完整度（關都有招牌隊伍、四天王、勁敵、地標生態、任務線、支線）
// - 招牌隊伍、四天王、冠軍、傳說地標、白銀山在 js/regions.js；這裡補上：
//   1. 地標與生態：黑暗洞穴、互連洞、阿露福遺跡、呆呆獸之井、櫟樹林、自然公園、擂缽山、憤怒之湖、冰雪小徑、龍穴、播音塔
//   2. 支線：呆呆獸之井的火箭隊（蘭斯）、憤怒之湖的紅色暴鯉龍、播音塔的火箭隊（拉姆達、雅典娜、阿波羅）、擋路的樹才怪
//   3. 勁敵小銀（研究所、2 枚與 6 枚城都徽章後）
//   4. 空木博士的任務線（取代通用的五步任務）
// 地名、人名依神奇寶貝百科（52poke）；隊伍參考心金魂銀。新的地標與樹才怪只在世界配置第 8 版以後出現，舊存檔的世界不變。
import { G, Game, LANDMARKS, Sound, Story, T, UI } from './core.js';
import { U, mulberry32 } from './util.js';
import { ITEMS, REGIONS } from './data.js';
import { Mon } from './mon.js';
import { WH, WW, World } from './world.js';
import { HOME_ECO, LANDMARK_ECO } from './ecology.js';

const VER = 8;
ITEMS['squirt-bottle'] = { n: '傑尼龜噴壺', price: 0, kind: 'key', d: '傑尼龜造型的噴壺。可以用來替樹木澆水。' };
ITEMS.honey = { n: '甜甜蜜', price: 300, kind: 'misc', d: '寶可夢採集來的甜甜的蜂蜜。可以賣給商店。' };

// ---------- 1. 地標 ----------
// event: place（景點：說明＋第一次來時找到的東西）、boss（js/regions2.js 的組織戰）、redgyarados、sudowoodo（道路上的實體）
LANDMARKS.johto.push(
  { id: 'darkcave', n: '黑暗洞穴', near: 0, ver: VER, event: 'place', text: '伸手不見五指的洞穴。地鼠在黑暗中挖出了好幾條通道。', gift: ['revive', 2] },
  { id: 'ruinsofalph', n: '阿露福遺跡', near: 0, ver: VER, event: 'place', text: '古代人留下的遺跡。牆上刻滿了形狀奇特的文字……文字好像在動？', gift: ['rare-candy', 2] },
  { id: 'unioncave', n: '互連洞', near: 1, ver: VER, event: 'place', text: '連接桔梗市與檜皮鎮的洞窟。聽說每到星期五，洞窟深處會傳來寶可夢的歌聲。', gift: ['great-ball', 5] },
  { id: 'slowpokewell', n: '呆呆獸之井', near: 1, ver: VER, event: 'boss', need: 1, lvOff: 1,
    fights: [{ title: '火箭隊手下', name: '', sprite: 'rocketgrunt', team: [41, 19] }, { title: '火箭隊手下', name: '', sprite: 'rocketgruntf', team: [109, 41] },
      { title: '火箭隊幹部', name: '蘭斯', sprite: 'proton', team: [41, 109] }],
    intro: '井底傳來呆呆獸的哀叫聲……\n火箭隊手下：「呆呆獸的尾巴可是很值錢的！小鬼別來礙事！」',
    win: '蘭斯：「可惡，撤退！」\n火箭隊離開了呆呆獸之井。呆呆獸們打了個呵欠……', reward: [['kings-rock', 1], ['exp-candy-m', 2]] },
  { id: 'ilexforest', n: '櫟樹林', near: 1, ver: VER, event: 'place', text: '茂密的森林，白天也很昏暗。林中有一座小小的祠堂，據說供奉著森林的守護神。', gift: ['miracle-seed', 1] },
  { id: 'nationalpark', n: '自然公園', near: 2, ver: VER, event: 'place', text: '寬廣的公園。每週二、四、六會舉辦捕蟲大賽。', gift: ['sun-stone', 1] },
  { id: 'radiotower', n: '播音塔', near: 2, ver: VER, event: 'boss', need: 7, lvOff: 4, needFlag: 'lm_lakeofrage',
    fights: [{ title: '火箭隊幹部', name: '拉姆達', sprite: 'petrel', team: [109, 41, 110] }, { title: '火箭隊幹部', name: '雅典娜', sprite: 'ariana', team: [24, 42, 198] },
      { title: '火箭隊幹部', name: '阿波羅', sprite: 'archer', team: [228, 42, 110, 229] }],
    intro: '播音塔被火箭隊佔領了！\n阿波羅：「我們要用電波呼喚坂木大人回來！火箭隊將會復活！」',
    win: '阿波羅：「……坂木大人，我們失敗了。」\n火箭隊宣布解散，播音塔恢復了正常。', reward: [['rare-candy', 3], ['ultra-ball', 5]] },
  { id: 'mtmortar', n: '擂缽山', near: 3, ver: VER, event: 'place', text: '形狀像擂缽的山。洞窟深處有一位閉關修行的空手道大王。', gift: ['black-belt', 1] },
  { id: 'lakeofrage', n: '憤怒之湖', near: 6, ver: VER, event: 'redgyarados' },
  { id: 'icepath', n: '冰雪小徑', near: 7, ver: VER, event: 'place', text: '結滿冰的洞窟，腳下很滑。走錯一步就會一路滑到底。', gift: ['never-melt-ice', 1] },
  { id: 'dragonsden', n: '龍穴', near: 7, ver: VER, event: 'place', text: '煙墨市道館後方的洞穴，是龍使一族修行的地方。水面下好像有什麼在游動。', gift: ['dragon-fang', 1] },
);

// 地標附近的固定生態（心金魂銀的出現寶可夢）
Object.assign(LANDMARK_ECO, {
  darkcave: [['cave', 41, 'common'], ['cave', 74, 'common'], ['cave', 206, 'rare'], ['cave', 202, 'uncommon'], ['water', 129, 'common']],
  ruinsofalph: [['cave', 201, 'common'], ['tall', 177, 'common'], ['tall', 235, 'rare'], ['tall', 202, 'uncommon']],
  unioncave: [['cave', 41, 'common'], ['cave', 74, 'common'], ['cave', 95, 'uncommon'], ['water', 194, 'common'], ['water', 131, 'rare']],
  slowpokewell: [['cave', 79, 'common'], ['cave', 41, 'common'], ['water', 79, 'common'], ['water', 80, 'rare']],
  ilexforest: [['tall', 43, 'common'], ['tall', 46, 'common'], ['tall', 10, 'common'], ['tall', 204, 'uncommon'], ['tall', 214, 'rare']],
  nationalpark: [['tall', 161, 'common'], ['tall', 13, 'common'], ['tall', 48, 'uncommon'], ['tall', 123, 'rare'], ['tall', 127, 'rare']],
  radiotower: [['tall', 19, 'common'], ['tall', 109, 'uncommon'], ['tall', 228, 'rare']],
  mtmortar: [['cave', 41, 'common'], ['cave', 66, 'common'], ['cave', 218, 'uncommon'], ['cave', 236, 'rare'], ['water', 118, 'common']],
  lakeofrage: [['water', 129, 'common'], ['water', 118, 'uncommon'], ['tall', 203, 'common'], ['tall', 21, 'common']],
  icepath: [['cave', 220, 'common'], ['cave', 86, 'uncommon'], ['cave', 225, 'uncommon'], ['cave', 215, 'rare'], ['snow', 220, 'common'], ['snow', 124, 'rare']],
  dragonsden: [['water', 147, 'common'], ['water', 129, 'common'], ['water', 148, 'rare']],
  // 原本就有的傳說地標也補上周圍的生態
  belltower: [['tall', 92, 'common'], ['tall', 163, 'common'], ['tall', 200, 'rare']],
  burnedtower: [['cave', 19, 'common'], ['cave', 109, 'common'], ['cave', 41, 'common'], ['cave', 126, 'rare']],
  whirlislands: [['water', 72, 'common'], ['water', 116, 'common'], ['water', 222, 'uncommon'], ['cave', 86, 'common'], ['cave', 74, 'common']],
  mtsilver: [['cave', 75, 'common'], ['cave', 217, 'uncommon'], ['cave', 246, 'rare'], ['snow', 220, 'common'], ['snow', 215, 'uncommon']],
});
// 若葉鎮附近（29 號道路）的草叢：波波、尾立、小拉達、咕咕
HOME_ECO.johto = [16, 161, 19, 163];

// ---------- 2. 支線 ----------
const has = id => [...(World.landmarks || new Map()).values()].some(l => l.id === id);
const badges = () => (G.state.badges.johto || []).length;

// 擋路的樹才怪：城都的道路上一隻（有路可以繞），需要 3 枚城都徽章（滿金市花店借的傑尼龜噴壺）
const _placeEvents = World.placeEvents;
World.placeEvents = function (rng) {
  _placeEvents.call(this, rng);
  if (this.worldVer < VER || !this.events) return;
  const r = mulberry32((this.seed ^ 0x51d0) >>> 0); // 獨立的亂數，不影響關都的事件位置
  const roads = [];
  for (let y = 0; y < WH; y += 2) for (let x = 0; x < WW; x += 2) if (this.tile(x, y) === T.PATH && this.regionAt(x, y) === 'johto') roads.push([x, y]);
  for (let i = roads.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [roads[i], roads[j]] = [roads[j], roads[i]]; }
  const free = (x, y) => !this.townAt(x, y) && !this.trainers.has(x + ',' + y) && !this.doors.has(x + ',' + y) && !this.events.has(x + ',' + y)
    && !(this.legends && this.legends.has(x + ',' + y)) && !(this.landmarks && this.landmarks.has(x + ',' + y));
  for (const [gap, spacing] of [[14, 30], [10, 20], [8, 12]]) {
    const spot = roads.find(([x, y]) => free(x, y) && !this.towns.some(t => Math.hypot(t.cx - x, t.cy - y) < gap)
      && ![...this.events.values()].some(e => Math.hypot(e.x - x, e.y - y) < spacing) && this.detourExists(x, y));
    if (spot) { this.events.set(spot[0] + ',' + spot[1], { kind: 'sudowoodo', id: 'sudowoodo', x: spot[0], y: spot[1], sp: 185 }); break; }
  }
};

const _eventEntity = Story.eventEntity;
Story.eventEntity = async function (e) {
  if (e.kind !== 'sudowoodo') return _eventEntity.call(this, e);
  const s = G.state;
  if (badges() < 3 && !s.bag['squirt-bottle']) { await UI.say('一棵奇怪的樹擋住了道路……\n輕輕一碰，樹好像動了一下？\n（聽說滿金市的花店有能澆水的東西）'); return; }
  if (!s.bag['squirt-bottle']) {
    Game.giveItem('squirt-bottle', 1);
    Sound.sfx('item');
    await UI.say('滿金市花店的老闆：「那棵會動的樹？用這個澆澆看吧！」\n借到了傑尼龜噴壺！');
  }
  const c = await UI.choose(['用傑尼龜噴壺澆水', '不要'], { prompt: '奇怪的樹擋住了道路。要澆水嗎？' });
  if (c !== 0) return;
  await UI.say('用傑尼龜噴壺澆了水！\n奇怪的樹討厭水，跳了起來！');
  const L = Math.max(20, Math.round(World.levelAt(e.x, e.y)) + 3);
  const r = await Game.battle({ wild: Mon.create(185, L, { perfect: 15 }), biome: 'tall' });
  s.flags['ev_' + e.id] = 1;
  if (r !== 'catch') await UI.say(`${POKEDEX[185].n}逃走了。道路暢通了！`);
  Game.save(true);
};

// 景點與紅色暴鯉龍
const _landmark = Story.landmark;
Story.landmark = async function (lm) {
  const s = G.state;
  if (lm.event === 'place') {
    s.flags['seen_' + lm.id] = 1;
    await UI.say(`這裡是${lm.n}。\n${lm.text}`);
    if (lm.gift && !s.flags['gift_' + lm.id]) {
      s.flags['gift_' + lm.id] = 1; s.flags['lm_' + lm.id] = 1;
      const [id, n] = lm.gift;
      Game.giveItem(id, n);
      Sound.sfx('item');
      await UI.say(`在${lm.n}找到了${ITEMS[id] ? ITEMS[id].n : id}${n > 1 ? ` ×${n}` : ''}！`);
      Game.save(true);
    }
    return;
  }
  if (lm.event === 'redgyarados') {
    s.flags['seen_' + lm.id] = 1;
    await UI.say(`這裡是${lm.n}。湖面掀起了不尋常的大浪……`);
    if (s.flags.lm_lakeofrage) { await UI.say('湖面恢復了平靜。'); return; }
    if (badges() < 6) { await UI.say('湖中央好像有一個紅色的身影，但是浪太大了，沒辦法靠近。\n（需要 6 枚城都徽章）'); return; }
    await UI.say('湖中央的紅色暴鯉龍憤怒地衝了過來！');
    const L = Math.max(30, Math.round(World.levelAt(lm.x, lm.y)) + 5);
    const r = await Game.battle({ wild: Mon.create(130, L, { shiny: true, perfect: 31 }), biome: 'water' });
    if (r === 'lose') return;
    s.flags.lm_lakeofrage = 1;
    if (r !== 'catch') await UI.say('紅色暴鯉龍沉入了湖底……湖面恢復了平靜。');
    await UI.say('湖邊的人：「暴鯉龍會發狂，好像是卡吉鎮附近發出的怪電波造成的……」\n（滿金市的播音塔好像出事了）');
    Game.save(true);
    return;
  }
  return _landmark.call(this, lm);
};

// ---------- 3. 勁敵小銀 ----------
// 從空木博士的研究所偷走屬性有利的御三家（心金魂銀），2 枚、6 枚城都徽章後在城都的城鎮再遇到
const SILVER = {
  name: '小銀', sprite: 'silver',
  // 玩家的御三家（或首發）屬性：草 → 火球鼠、火 → 小鋸鱷、水 → 菊草葉
  counter(starter) {
    const t = (POKEDEX[starter] || { t: [] }).t[0];
    return t === 'grass' ? 155 : t === 'fire' ? 158 : t === 'water' ? 152 : 155;
  },
  team(stage, starter, L) {
    const base = SILVER.counter(starter);
    const list = stage === 1 ? [[base, 5]]
      : stage === 2 ? [[92, L - 2], [41, L - 2], [64, L - 1], [base, L]]
        : [[215, L - 2], [42, L - 2], [82, L - 1], [93, L - 1], [64, L - 1], [base, L]];
    return list.map(([sp, lv]) => { lv = U.clamp(lv, 2, 100); return Mon.create(World.evolveFor(sp, lv), lv, { shiny: false, perfect: stage === 3 ? 20 : 0 }); });
  },
  async battle(stage) {
    const s = G.state;
    if (s.flags['silver' + stage]) return;
    s.flags['silver' + stage] = 1;
    const L = stage === 1 ? 5 : World.gymLevel(World.towns.find(t => t.region === 'johto' && t.gym === 0)) + (stage === 3 ? 4 : 2);
    const lines = {
      1: '紅頭髮的少年從研究所跑了出來：「……你也拿到寶可夢了？哼，就讓你看看我搶來的寶可夢有多強！」',
      2: '小銀：「又是你。弱者只會拖累寶可夢……讓開！」',
      3: '小銀：「我要變得比任何人都強……我要證明給那傢伙看！」',
    };
    await UI.say(lines[stage]);
    const starter = s.starter || G.party[0].sp;
    await Game.battle({ trainer: { title: '勁敵', name: SILVER.name, party: SILVER.team(stage, starter, L), kind: stage === 3 ? 'gym' : 'trainer', money: 60, sprite: SILVER.sprite, lose: stage === 3 ? '……我輸了？為什麼……' : '……哼，算你運氣好。' }, noBlackout: stage === 1 });
    if (stage === 1) await UI.say('空木博士：「剛剛那個少年從研究所偷走了一隻寶可夢！他好像叫……小銀？」');
  },
};

const _prof = Story.prof;
Story.prof = async function (region) {
  const first = region === 'johto' && !G.state.flags.q_johto;
  const r = await _prof.call(this, region);
  if (first) await SILVER.battle(1);
  return r;
};
const _onEnterTown = Story.onEnterTown;
Story.onEnterTown = async function (town) {
  await _onEnterTown.call(this, town);
  const s = G.state;
  if (town.region !== 'johto' || !s.flags.q_johto) return;
  const n = badges();
  if (n >= 6 && !s.flags.silver3) { if (!s.flags.silver2) s.flags.silver2 = 'skip'; await SILVER.battle(3); }
  else if (n >= 2 && !s.flags.silver2) await SILVER.battle(2);
};

// ---------- 4. 空木博士的任務線 ----------
// 舊存檔的世界沒有新地標：那一步視為完成，不會卡住
const JOHTO_QUEST = [
  { t: '到若葉鎮的研究所找空木博士', done: s => !!s.flags.q_johto },
  { t: '生態調查：捕捉 5 種城都地區的寶可夢（第 2 世代）', done: s => Object.keys(s.caught).filter(id => POKEDEX[id].g === 2).length >= 5, reward: ['great-ball', 10] },
  { t: '打敗桔梗市的道館館主阿速', done: s => (s.badges.johto || []).includes(0), reward: ['rare-candy', 2] },
  { t: '趕走呆呆獸之井（檜皮鎮附近）的火箭隊', done: s => !!s.flags.boss_slowpokewell || !has('slowpokewell'), reward: ['exp-candy-m', 3] },
  { t: '收集 4 枚城都徽章', done: s => (s.badges.johto || []).length >= 4, reward: ['ultra-ball', 5] },
  { t: '調查憤怒之湖（卡吉鎮附近）的紅色暴鯉龍', done: s => !!s.flags.lm_lakeofrage || !has('lakeofrage'), reward: ['max-potion', 3] },
  { t: '從火箭隊手中奪回滿金市的播音塔', done: s => !!s.flags.boss_radiotower || !has('radiotower'), reward: ['rare-candy', 3] },
  { t: '收集 8 枚城都徽章，挑戰城都寶可夢聯盟', done: s => !!s.champs.johto, reward: ['ability-capsule', 1] },
  { t: '登上緣朱市的鈴鐺塔', done: s => !!s.flags.lm_belltower || Story.legendDone(250), reward: ['master-ball', 1] },
  { t: '前往白銀山的山頂', done: s => !!s.flags.red_done },
];
const _questsFor = Story.questsFor;
Story.questsFor = function (region) { return region === 'johto' ? JOHTO_QUEST : _questsFor.call(this, region); };

// 任務選單：城都的支線
const _questSummary = Story.questSummary;
Story.questSummary = function (s) {
  const base = _questSummary.call(this, s);
  const seen = s.region === 'johto' || World.towns.some(t => t.region === 'johto' && s.visited[t.id]);
  if (!seen || !has('slowpokewell')) return base;
  const out = [];
  out.push(`勁敵小銀：${s.flags.silver3 ? '已經打過 3 次' : s.flags.silver2 ? '下一次：6 枚城都徽章後' : s.flags.silver1 ? '下一次：2 枚城都徽章後' : '還沒遇到'}`);
  const sd = [...(World.events || new Map()).values()].find(e => e.kind === 'sudowoodo');
  if (sd) out.push(s.flags['ev_' + sd.id] ? '奇怪的樹：已經澆水（道路暢通了）' : `奇怪的樹：擋在城都的道路上${badges() < 3 ? '（需要 3 枚城都徽章）' : ''}`);
  const places = LANDMARKS.johto.filter(l => l.event === 'place');
  out.push(`城都的景點：${places.filter(l => s.flags['seen_' + l.id]).length}／${places.length}`);
  return base + '\n' + out.map(x => '・' + x).join('\n');
};

export { SILVER, JOHTO_QUEST };
