// 戰鬥引擎：參考 Pokémon Showdown（sim/battle.ts、sim/battle-actions.ts）的回合處理，單打。
// 招式資料：data/showdown.js（Showdown 客戶端資料，以全國招式編號對應）＋ data/moves.js（中文名稱與說明）。
// 每個招式都有支援狀態：full（完整）、partial（部分效果未實作）、none（未支援，AI 不會使用）。

const SD = window.SHOWDOWN || { moves: {}, speciesAbilities: {} };
const TYPE_KEY = t => (t || '').toLowerCase();
const BOOST_ZH = { atk: '攻擊', def: '防禦', spa: '特攻', spd: '特防', spe: '速度', accuracy: '命中率', evasion: '閃避率' };
const STAGE_OF = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', accuracy: 'acc', evasion: 'eva' };

// ---------- 招式描述 ----------
const _md = {};
function md(id) {
  if (_md[id]) return _md[id];
  const zh = MOVES[id] || {};
  const s = SD.moves[id];
  let m;
  if (s) {
    m = { ...s, num: +id, n: zh.n || s.id, d: zh.d || '', type: TYPE_KEY(s.type), cat: s.category, bp: s.basePower, acc: s.accuracy, pri: s.priority, flags: s.flags || {} };
  } else {
    // 沒有 Showdown 資料時退回 PokéAPI 的欄位
    m = { id: 'm' + id, num: +id, n: zh.n || '？', d: zh.d || '', type: zh.t, cat: zh.c === 'ph' ? 'Physical' : zh.c === 'sp' ? 'Special' : 'Status',
      bp: zh.p || 0, acc: zh.a || true, pri: zh.pr || 0, pp: zh.pp || 10, flags: {}, target: 'normal' };
  }
  m.support = classify(m);
  return (_md[id] = m);
}
const STRUGGLE_MD = { id: 'struggle', num: 165, n: '掙扎', d: '', type: '???', cat: 'Physical', bp: 50, acc: true, pri: 0, flags: { contact: 1, protect: 1 }, target: 'randomNormal', struggleRecoil: true, support: 'full' };

// 實作清單（用於判定支援狀態）
const IMPL = {
  volatile: new Set(['aquaring', 'attract', 'banefulbunker', 'burningbulwark', 'partiallytrapped', 'charge', 'confusion', 'curse', 'defensecurl', 'destinybond',
    'protect', 'disable', 'encore', 'endure', 'focusenergy', 'followme', 'ragepowder', 'helpinghand', 'ingrain', 'kingsshield', 'laserfocus', 'leechseed',
    'magnetrise', 'minimize', 'noretreat', 'obstruct', 'octolock', 'foresight', 'smackdown', 'spikyshield', 'silktrap', 'substitute', 'tarshot', 'taunt', 'yawn',
    'flinch', 'saltcure', 'sparklingaria', 'syrupbomb', 'mustrecharge', 'lockedmove', 'roost', 'stockpile', 'torment', 'imprison', 'grudge', 'electrify',
    'bide', 'magiccoat', 'powertrick', 'gastroacid', 'uproar', 'glaiverush']),
  side: new Set(['auroraveil', 'lightscreen', 'reflect', 'mist', 'safeguard', 'spikes', 'stealthrock', 'stickyweb', 'tailwind', 'toxicspikes', 'craftyshield', 'quickguard', 'wideguard']),
  pseudo: new Set(['trickroom', 'gravity', 'magicroom', 'wonderroom', 'fairylock', 'iondeluge', 'watersport', 'mudsport']),
  slot: new Set(['Wish', 'healingwish', 'lunardance', 'revivalblessing']),
  calls: new Set(['metronome', 'sleeptalk', 'copycat', 'naturepower']),
  bp: new Set(['acrobatics', 'assurance', 'avalanche', 'beatup', 'boltbeak', 'crushgrip', 'dragonenergy', 'echoedvoice', 'electroball', 'eruption', 'fishiousrend',
    'flail', 'furycutter', 'grassknot', 'gyroball', 'heatcrash', 'heavyslam', 'hex', 'lastrespects', 'lowkick', 'payback', 'powertrip', 'ragefist', 'revenge',
    'reversal', 'risingvoltage', 'rollout', 'round', 'stompingtantrum', 'storedpower', 'triplekick', 'watershuriken', 'waterspout', 'wringout', 'punishment',
    'magnitude', 'present', 'facade', 'brine', 'venoshock', 'return', 'frustration', 'pikapapow', 'veeveevolley', 'wakeupslap', 'smellingsalts', 'weatherball',
    'barbbarrage', 'collisioncourse', 'electrodrift', 'hardpress', 'temperflare', 'iceball', 'triplearrows', 'tripleaxel', 'populationbomb', 'terrainpulse',
    'knockoff', 'hydrosteam', 'psyblade', 'solarbeam', 'solarblade', 'expandingforce', 'mistyexplosion', 'grassyglide', 'freezedry', 'flyingpress', 'spitup']),
  // 只有專屬效果函式的招式中，已實作的部分
  special: new Set(['bellydrum', 'haze', 'painsplit', 'rest', 'perishsong', 'psychup', 'defog', 'splash', 'meanlook', 'block', 'lockon', 'mindreader', 'moonlight',
    'morningsun', 'synthesis', 'shoreup', 'strengthsap', 'aromatherapy', 'healbell', 'junglehealing', 'lunarblessing', 'purify', 'soak', 'topsyturvy', 'spite',
    'acupressure', 'tidyup', 'takeheart', 'venomdrench', 'conversion', 'reflecttype', 'floralhealing', 'healpulse', 'powerswap', 'guardswap', 'heartswap',
    'speedswap', 'trickortreat', 'forestscurse', 'celebrate', 'holdhands', 'happyhour', 'teleport', 'memento', 'healingwish', 'lunardance', 'gearup', 'magneticflux',
    'counter', 'mirrorcoat', 'metalburst', 'comeuppance', 'endeavor', 'finalgambit', 'superfang', 'naturesmadness', 'ruination', 'suckerpunch', 'thunderclap',
    'fakeout', 'firstimpression', 'focuspunch', 'brickbreak', 'psychicfangs', 'ragingbull', 'rapidspin', 'mortalspin', 'falseswipe', 'holdback', 'feint',
    'refresh', 'clearsmog', 'burnup', 'doubleshock', 'thief', 'covet', 'pluck', 'bugbite', 'incinerate', 'knockoff', 'clangoroussoul', 'filletaway', 'shedtail',
    'courtchange', 'afteryou', 'allyswitch', 'quash', 'instruct', 'stuffcheeks', 'swallow', 'spitup', 'teatime', 'recycle', 'magicpowder', 'flowershield', 'rototiller',
    'mimic', 'sketch', 'transform', 'conversion2', 'trick', 'switcheroo', 'roleplay', 'skillswap', 'worryseed', 'simplebeam', 'entrainment', 'doodle',
    'guardsplit', 'powersplit', 'revivalblessing', 'bide']),
};
// 只有訊息、沒有實際效果的招式（目前沒有）
const NOOP_STATUS = new Set([]);

function classify(m) {
  if (m.isNonstandard === 'Past' && !MOVES[m.num]) return 'none';
  const miss = [];
  if (m.volatileStatus && !IMPL.volatile.has(m.volatileStatus)) miss.push('v');
  if (m.self && m.self.volatileStatus && !IMPL.volatile.has(m.self.volatileStatus)) miss.push('sv');
  if (m.sideCondition && !IMPL.side.has(m.sideCondition)) miss.push('side');
  if (m.slotCondition && !IMPL.slot.has(m.slotCondition)) miss.push('slot');
  if (m.callsMove && !IMPL.calls.has(m.id)) miss.push('calls');
  if (m.basePowerCallback && !IMPL.bp.has(m.id)) miss.push('bp');
  if ((m.condition && m.target === 'scripted') && !IMPL.special.has(m.id)) miss.push('scripted');
  const sec = m.secondaries || (m.secondary ? [m.secondary] : []);
  for (const s of sec) if (s.volatileStatus && !IMPL.volatile.has(s.volatileStatus)) miss.push('sec');
  if (m.cat === 'Status') {
    const has = ['status', 'boosts', 'volatileStatus', 'sideCondition', 'weather', 'terrain', 'pseudoWeather', 'heal', 'selfSwitch', 'forceSwitch', 'slotCondition', 'callsMove', 'self']
      .some(k => m[k] !== undefined);
    if (!has && !IMPL.special.has(m.id)) return 'none';
    if (NOOP_STATUS.has(m.id) || NOOP_STATUS.has(m.volatileStatus) || NOOP_STATUS.has(m.pseudoWeather) || NOOP_STATUS.has(m.sideCondition)) return 'partial';
    if (m.slotCondition && !IMPL.slot.has(m.slotCondition) && !IMPL.special.has(m.id)) return 'none';
    if (miss.length) return m.cat === 'Status' && (miss.includes('v') || miss.includes('calls')) ? 'none' : 'partial';
    return 'full';
  }
  return miss.length ? 'partial' : 'full';
}
const SUPPORT_ZH = { full: '', partial: '（部分效果未實作）', none: '（未支援）' };

// 戰鬥中才會出現的形態（PokéAPI 的形態編號、屬性、種族值、體重）；名稱沿用物種名稱，戰鬥結束時恢復
// 堅盾劍怪、弱丁魚、達摩狒狒、小隕星、謎擬Ｑ、海豚俠的形態在 data/late.js，變化由 js/late.js 的 BattleForms 處理
const BATTLE_FORMS = {
  'terapagos-terastal': [1024, 10276, ['normal'], [95, 95, 110, 105, 110, 85], 160],
  'eiscue-noice': [875, 10185, ['ice'], [75, 80, 70, 65, 50, 130], 890],
  'cramorant-gulping': [845, 10182, ['flying', 'water'], [70, 85, 55, 85, 95, 85], 180],
  'cramorant-gorging': [845, 10183, ['flying', 'water'], [70, 85, 55, 85, 95, 85], 180],
  'morpeko-hangry': [877, 10187, ['electric', 'dark'], [58, 95, 58, 70, 58, 97], 30],
  'castform-sunny': [351, 10013, ['fire'], [70, 70, 70, 70, 70, 70], 8],
  'castform-rainy': [351, 10014, ['water'], [70, 70, 70, 70, 70, 70], 8],
  'castform-snowy': [351, 10015, ['ice'], [70, 70, 70, 70, 70, 70], 8],
};
if (window.FORMS && window.POKEDEX) {
  for (const [k, [base, id, t, s, w]] of Object.entries(BATTLE_FORMS)) {
    if (!POKEDEX[base] || FORMS[k]) continue;
    FORMS[k] = { id, t, s, ey: [0, 0, 0, 0, 0, 0], ab: POKEDEX[base].ab, w, base, region: '', n: POKEDEX[base].n, l: [], battle: 1 };
  }
}
// 不會被胃液、中和氣體消除，也不能被交換、複製、覆蓋的特性
const FIXED_AB = new Set(['multitype', 'stance-change', 'schooling', 'comatose', 'shields-down', 'disguise', 'rks-system', 'battle-bond', 'power-construct',
  'ice-face', 'gulp-missile', 'zero-to-hero', 'commander', 'tera-shift', 'as-one-glastrier', 'as-one-spectrier']);
// 不能被複製（扮演、複製、塗鴉）的特性
const NO_COPY_AB = new Set([...FIXED_AB, 'trace', 'receiver', 'power-of-alchemy', 'flower-gift', 'forecast', 'hunger-switch', 'illusion', 'imposter',
  'neutralizing-gas', 'wonder-guard', 'zen-mode', 'protosynthesis', 'quark-drive', 'embody-aspect-teal', 'poison-puppeteer']);
// 多屬性（阿爾宙斯的石板）、ＡＲ系統（銀伴戰獸的記憶碟）
const PLATE_TYPE = { 'flame-plate': 'fire', 'splash-plate': 'water', 'zap-plate': 'electric', 'meadow-plate': 'grass', 'icicle-plate': 'ice',
  'fist-plate': 'fighting', 'toxic-plate': 'poison', 'earth-plate': 'ground', 'sky-plate': 'flying', 'mind-plate': 'psychic', 'insect-plate': 'bug',
  'stone-plate': 'rock', 'spooky-plate': 'ghost', 'draco-plate': 'dragon', 'dread-plate': 'dark', 'iron-plate': 'steel', 'pixie-plate': 'fairy' };
const MEMORY_TYPE = Object.fromEntries(Object.values(PLATE_TYPE).map(t => [t + '-memory', t]));

// ---------- 小工具 ----------
const BOOST_TABLE = [1, 1.5, 2, 2.5, 3, 3.5, 4];
function boostMul(s) { return s >= 0 ? BOOST_TABLE[Math.min(6, s)] : 1 / BOOST_TABLE[Math.min(6, -s)]; }
function accBoostMul(s) { s = U.clamp(s, -6, 6); return s >= 0 ? (3 + s) / 3 : 3 / (3 - s); }
function weightOf(m) { const f = Forms.get(m); if (f) return f.w / 10; return (SD.speciesAbilities[m.sp] && SD.speciesAbilities[m.sp].w) || 10; }
function hasType(m, v, t) { return (v && v.types ? v.types : Mon.types(m)).includes(t); }

function newVol() {
  return {
    stg: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }, conf: 0, flinch: false, toxN: 0, seed: false, trap: 0, yawn: 0, love: false, focus: 0,
    protect: false, protectCount: 0, sub: 0, charging: null, semi: null, recharge: false, locked: null, lastMove: null, lastMoveFailed: false,
    hitBy: [], damagedThisTurn: false, turnsOut: 0, taunt: 0, encore: 0, encoreMove: null, disable: 0, disableMove: null, endure: false, destinyBond: false,
    curse: false, perish: 0, ingrain: false, aquaRing: false, magnetRise: 0, minimize: false, defenseCurl: false, charge: false, lockOn: 0, foresight: false,
    smackDown: false, roost: false, trapped: false, octolock: false, laserFocus: 0, tarShot: false, saltCure: false, syrupBomb: 0, types: null,
    echoed: 0, furyCutter: 0, rollout: 0, timesHit: 0, statsLoweredThisTurn: false, movedThisTurn: false,
  };
}

Object.assign(Battle.prototype, {
  initEngine() {
    this.field = { weather: null, weatherT: 0, terrain: null, terrainT: 0, trickRoom: 0, gravity: 0, lastMoveUsed: null, faintedLastTurn: { me: false, foe: false } };
    const side = () => ({ reflect: 0, lightscreen: 0, auroraveil: 0, tailwind: 0, mist: 0, safeguard: 0, spikes: 0, toxicspikes: 0, stealthrock: false, stickyweb: false, wish: null, fainted: 0 });
    this.sides = { me: side(), foe: side() };
    this.futures = [];
  },
  // 特性（破格類特性會讓目標的特性在這次攻擊中失效）
  ab(m) {
    if (!m || !m.ability) return null;
    if (this.moldTarget === m) return null;
    return this.abRaw(m);
  },
  // 不考慮破格的特性
  abRaw(m) {
    if (!m || !m.ability) return null;
    // 胃液、中和氣體：特性失效（固定的特性除外）
    if (!FIXED_AB.has(m.ability)) {
      const v = this.volOf(m);
      if (v && v.gastro) return null;
      if (m.ability !== 'neutralizing-gas' && this.activeMons && this.activeMons().some(x => x !== m && x.ability === 'neutralizing-gas' && !this.volOf(x).gastro)) return null;
    }
    return m.ability;
  },
  // 持有道具（笨拙特性、魔法空間讓道具失效）
  itm(m) { return m && m.item && this.abRaw(m) !== 'klutz' && !(this.field && this.field.magicRoom) ? m.item : null; },
  async consume(m, txt) {
    const it = m.item;
    m.item = null;
    const v = this.volOf(m);
    if (v) {
      if (m.ability === 'unburden') v.unburden = true; // 輕裝：道具消失後速度加倍
      if (it && it.endsWith('-berry')) v.lastBerry = it;
      v.usedItem = it; // 回收利用
    }
    if (txt) await this.msg(txt.replace('{i}', Held.name(it)));
    if (it && it.endsWith('-berry') && m.ability === 'cheek-pouch' && m.hp > 0) {
      await this.healMon(m, Math.floor(Mon.maxHp(m) / 3)); await this.abilityMsg(m, `${this.label(m)} 的體力回復了！`);
    }
    return it;
  },
  // 體重（重金屬加倍、輕金屬減半）
  wt(m) { const w = weightOf(m); return this.ab(m) === 'heavy-metal' ? w * 2 : this.ab(m) === 'light-metal' ? w / 2 : w; },
  // 古代活性（晴天）、夸克充能（電氣場地）：提高最高的能力
  paradoxStat(m) {
    const a = this.ab(m);
    if (!((a === 'protosynthesis' && this.wx() === 'sunnyday') || (a === 'quark-drive' && this.field.terrain === 'electricterrain'))) return null;
    const s = Mon.stats(m);
    return ['atk', 'def', 'spa', 'spd', 'spe'][[1, 2, 3, 4, 5].reduce((b, i) => s[i] > s[b] ? i : b, 1) - 1];
  },
  async abilityMsg(m, txt) { await this.msg(`［${this.label(m)} 的${Abil.name(m.ability)}］\n${txt}`); },
  hasAbility(id) { return this.activeMons().some(m => this.ab(m) === id); },
  sideKey(m) { return m === this.me ? 'me' : m === this.foe ? 'foe' : (this.foeParty && this.foeParty.includes(m) ? 'foe' : 'me'); },
  volOf(m) {
    if (m === this.me) return this.vMe;
    if (m === this.foe) return this.vFoe;
    // 不在場上的寶可夢：能力等級等暫時狀態都是初始值（每隻各自一份，不會借用場上其他寶可夢的）
    this._benchVol = this._benchVol || new WeakMap();
    if (m && typeof m === 'object') { if (!this._benchVol.has(m)) this._benchVol.set(m, newVol()); return this._benchVol.get(m); }
    return newVol();
  },
  // 這隻寶可夢是不是本回合最後行動的（守住類招式最後行動時失敗）；雙打由 DoubleBattle 依行動佇列覆寫
  isLastMover(m) { return !!(this.order && this.order[this.order.length - 1] === this.sideKey(m)); },
  // 目標本回合要使用的招式（突襲、迅雷用）；換人、用道具、還沒選招式時是 null。雙打由 DoubleBattle 依每隻寶可夢的行動覆寫
  queuedMoveOf(m) {
    const a = this.queued && this.queued[this.sideKey(m)];
    if (!a || (a.type && a.type !== 'move') || a.idx === undefined || a.idx < 0 || !m.moves[a.idx]) return null;
    return md(m.moves[a.idx].id);
  },
  // 未來攻擊（預知未來、破滅之願）命中的對象：那一邊目前在場的寶可夢（雙打依格位覆寫）
  futureTarget(fu) { return fu.side === 'me' ? this.me : this.foe; },
  // 結算時把運算配對切到目標（雙打覆寫），回傳還原的函式
  focusOn() { return () => { }; },
  // 場上的寶可夢（雙打由 DoubleBattle 覆寫為四隻）
  activeMons() { return [this.me, this.foe].filter(m => m && m.hp > 0); },
  otherOf(m) { return m === this.me ? this.foe : this.me; },
  // 太晶化：屬性只剩太晶屬性（直到戰鬥結束）
  isTera(m) { return !!(this.tera && m && (this.tera.me === m || this.tera.foe === m)); },
  // 屬性一致加成（第九世代）：太晶屬性與原本屬性相同 2 倍（適應力 2.25）；新的太晶屬性 1.5 倍（適應力 2）；原本的屬性仍有 1.5 倍
  stabMod(user, type) {
    const v = this.volOf(user), orig = v && v.types ? v.types : Mon.types(user), adapt = this.ab(user) === 'adaptability';
    if (!this.isTera(user)) return orig.includes(type) ? (adapt ? 2 : 1.5) : 1;
    const tt = Mon.teraType(user);
    if (type === tt) return orig.includes(tt) ? (adapt ? 2.25 : 2) : (adapt ? 2 : 1.5);
    return orig.includes(type) ? 1.5 : 1;
  },
  async terastallize(m) {
    const side = this.sideKey(m);
    this.tera = this.tera || { me: null, foe: null };
    if (this.tera[side] !== null || this.teraUsed && this.teraUsed[side]) return;
    this.tera[side] = m;
    this.teraUsed = this.teraUsed || {};
    this.teraUsed[side] = true;
    if (this.teraAnim) await this.teraAnim(side);
    await this.msg(`${this.label(m)} 太晶化成了${TYPES[Mon.teraType(m)].n}屬性！`);
    this.draw && this.draw();
  },
  typesOf(m) {
    if (this.isTera(m)) return [Mon.teraType(m)];
    const v = this.volOf(m);
    let t = v && v.types ? v.types : Mon.types(m);
    // 多屬性、ＡＲ系統：依攜帶的石板、記憶碟改變屬性
    if (!(v && v.types) && m.ability === 'multitype' && PLATE_TYPE[m.item]) t = [PLATE_TYPE[m.item]];
    if (!(v && v.types) && m.ability === 'rks-system' && MEMORY_TYPE[m.item]) t = [MEMORY_TYPE[m.item]];
    if (v && v.roost) t = t.filter(x => x !== 'flying');
    return t.length ? t : ['normal'];
  },
  grounded(m) {
    const v = this.volOf(m);
    if (this.field.gravity || v.smackDown || v.ingrain) return true;
    if (v.magnetRise || this.ab(m) === 'levitate' || this.itm(m) === 'air-balloon') return false;
    return !this.typesOf(m).includes('flying');
  },
  // 天氣（無關天氣、氣閘會讓天氣失效）
  wx() { return this.hasAbility('air-lock') || this.hasAbility('cloud-nine') ? null : this.field.weather; },

  speedOf(m, v) {
    let s = Mon.stats(m)[5] * boostMul(v.stg.spe);
    const a = this.ab(m), w = this.field ? this.wx() : null;
    if (m.st === 'par' && a !== 'quick-feet') s *= .5;
    if (this.sides && this.sides[this.sideKey(m)].tailwind) s *= 2;
    if ((a === 'swift-swim' && w === 'raindance') || (a === 'chlorophyll' && w === 'sunnyday') || (a === 'sand-rush' && w === 'sandstorm')
      || (a === 'slush-rush' && (w === 'snowscape' || w === 'hail')) || (a === 'surge-surfer' && this.field && this.field.terrain === 'electricterrain')) s *= 2;
    if (a === 'quick-feet' && m.st) s *= 1.5;
    if (v.unburden && !m.item) s *= 2;
    if (a === 'slow-start' && v.turnsOut < 5) s *= .5; // 慢啟動：登場後 5 回合速度減半
    if (this.field && this.paradoxStat(m) === 'spe') s *= 1.5;
    if (this.itm(m) === 'choice-scarf') s *= 1.5;
    return Math.floor(s);
  },

  // ---------- 回合 ----------
  async doTurn(action) {
    if (!this.field) this.initEngine();
    for (const v of [this.vMe, this.vFoe]) { v.hitBy = []; v.damagedThisTurn = false; v.movedThisTurn = false; v.statsLoweredThisTurn = false; }
    const foeAction = this.aiChoose();
    this.queued = { me: action, foe: foeAction };
    this.selfKO = null;
    // 1. 逃跑、交換、道具（Showdown：優先度高於所有招式）
    if (action.type === 'run') {
      if (this.trainer) { await this.msg('不行！不能從訓練家對戰中逃走！'); this.turn--; return null; }
      if (this.ab(this.me) === 'run-away') { Sound.sfx('run'); await this.msg('順利逃走了！'); return 'run'; }
      if (this.trappedBy(this.me)) { await this.msg(`${this.trappedBy(this.me)}，無法逃走！`); this.turn--; return null; }
      // 逃走：幽靈屬性必定成功；其餘 F = A×32 ÷（B÷4 mod 256）＋ 30×C，F > 255 必定成功
      this.runTries++;
      const a = this.speedOf(this.me, this.vMe), b = this.speedOf(this.foe, this.vFoe);
      const B = Math.floor(b / 4) % 256;
      const F = B === 0 ? 256 : Math.floor(a * 32 / B) + 30 * this.runTries;
      if (this.typesOf(this.me).includes('ghost') || F > 255 || U.rand() * 256 < F) { Sound.sfx('run'); await this.msg('順利逃走了！'); return 'run'; }
      await this.msg('沒能逃走！');
    } else if (action.type === 'switch') {
      if (this.trappedBy(this.me)) {
        await this.msg(`${this.trappedBy(this.me)}，${Mon.name(this.me)} 無法退場！`); this.turn--; return null;
      }
      await this.switchTo(action.idx);
    } else if (action.type === 'item') {
      const r = await this.useItem(action);
      if (r) return r;
    }
    if (foeAction.heal) { await this.aiHeal(); }
    if (foeAction.switchTo !== undefined) { await this.foeSwitch(foeAction.switchTo); }
    // 超級進化、太晶化：在所有招式之前（玩家先、對手後）
    if (action.type === 'move' && action.mega && this.megaEvolve) await this.megaEvolve(this.me);
    if (!foeAction.heal && foeAction.switchTo === undefined && this.aiMega && this.aiMega()) await this.megaEvolve(this.foe);
    if (action.type === 'move' && action.tera) await this.terastallize(this.me);
    if (!foeAction.heal && foeAction.switchTo === undefined && this.aiTera()) await this.terastallize(this.foe);
    // 2. 招式依優先度 → 速度 → 隨機排序（戲法空間時速度反轉）
    const acts = [];
    // 記住使用者：被吹走、強制換下後，替補不會使用原本的招式
    if (action.type === 'move') acts.push({ side: 'me', mon: this.me, ...this.resolveMove(this.me, this.vMe, action.idx) });
    if (!foeAction.heal && foeAction.switchTo === undefined) acts.push({ side: 'foe', mon: this.foe, ...this.resolveMove(this.foe, this.vFoe, foeAction.idx) });
    for (const a of acts) {
      const m = a.side === 'me' ? this.me : this.foe, v = a.side === 'me' ? this.vMe : this.vFoe;
      const ua = this.ab(m);
      a.pri = a.mv.pri || 0;
      if (a.mv.id === 'grassyglide' && this.field.terrain === 'grassyterrain') a.pri += 1;
      if (ua === 'prankster' && a.mv.cat === 'Status') { a.pri += 1; a.prankster = true; }
      if (ua === 'gale-wings' && a.mv.type === 'flying' && m.hp === Mon.maxHp(m)) a.pri += 1;
      if (ua === 'triage' && (a.mv.heal || a.mv.drain)) a.pri += 3;
      a.quick = this.itm(m) === 'quick-claw' && U.rand() < .2 ? 1 : 0;
      a.stall = ua === 'stall' || (ua === 'mycelium-might' && a.mv.cat === 'Status') ? 1 : 0;
      a.spe = this.speedOf(m, v) * (this.field.trickRoom ? -1 : 1);
      a.rnd = U.rand();
    }
    acts.sort((x, y) => y.pri - x.pri || y.quick - x.quick || x.stall - y.stall || y.spe - x.spe || x.rnd - y.rnd);
    for (const a of acts) if (a.quick) await this.msg(`${this.label(a.side === 'me' ? this.me : this.foe)} 靠先制之爪搶先行動了！`);
    this.order = acts.map(a => a.side);
    for (let i = 0; i < acts.length; i++) {
      const a = acts[i];
      const user = a.side === 'me' ? this.me : this.foe;
      const target = this.otherOf(user);
      if (!user || user.hp <= 0 || (a.mon && a.mon !== user)) continue;
      this.firstMover = i === 0;
      await this.runMove(user, target, a);
      const r = await this.checkFaints();
      if (r) return r;
      if (r === false) break;
    }
    await this.endOfTurn();
    const r = await this.checkFaints();
    return r || null;
  },

  // 是否被困住（回傳原因或 null）；幽靈屬性與脫出殼不會被困住
  trappedBy(m) {
    const v = this.volOf(m), o = this.otherOf(m);
    if (this.typesOf(m).includes('ghost') || this.itm(m) === 'shed-shell') return null;
    if (v.trapped || v.trap || v.ingrain || v.octolock) return '被困住了';
    if (this.field && this.field.fairyLock) return '受到妖精之鎖的影響';
    const oa = o && o.hp > 0 ? this.ab(o) : null;
    if (oa === 'shadow-tag' && this.ab(m) !== 'shadow-tag') return `受到${Abil.name(oa)}的影響`;
    if (oa === 'arena-trap' && this.grounded(m)) return `受到${Abil.name(oa)}的影響`;
    if (oa === 'magnet-pull' && this.typesOf(m).includes('steel')) return `受到${Abil.name(oa)}的影響`;
    return null;
  },

  // 決定實際要使用的招式（鎖定、蓄力、再來一次、掙扎）
  resolveMove(m, v, idx) {
    // 忍耐、吵鬧被打斷（睡著、麻痺、畏縮）時結束
    if (v.bide && !v.locked) v.bide = null;
    if (v.uproar && !v.locked) v.uproar = 0;
    if (v.recharge) return { mv: { ...STRUGGLE_MD, n: '', pri: 0 }, slot: null, recharge: true };
    if (v.charging) return { mv: md(v.charging), slot: null, cont: true };
    if (v.locked) return { mv: md(v.locked.id), slot: null, cont: true };
    if (v.encore > 0 && v.encoreMove) {
      const slot = m.moves.find(s => s.id === v.encoreMove && s.pp > 0);
      if (slot) return { mv: md(slot.id), slot };
    }
    const slot = idx >= 0 ? m.moves[idx] : null;
    if (!slot || slot.pp <= 0) return { mv: STRUGGLE_MD, slot: null };
    return { mv: md(slot.id), slot };
  },

  // ---------- AI ----------
  // 訓練家的王牌（最後一隻）、館主、四天王、冠軍會太晶化（每場一次）
  aiTera() {
    if (this.wildMon || !this.trainer || (this.teraUsed && this.teraUsed.foe)) return false;
    const k = this.trainer.kind, ace = this.foe === this.foeParty[this.foeParty.length - 1];
    return ace && (k === 'gym' || k === 'champion' || this.trainer.tera);
  },
  aiChoose() {
    const foe = this.foe, me = this.me;
    if (this.aiItems > 0 && foe.hp < Mon.maxHp(foe) * .25 && U.rand() < .7) return { heal: true };
    const usable = foe.moves.map((s, i) => ({ s, i })).filter(({ s, i }) => s.pp > 0 && md(s.id).support !== 'none' && !this.moveBlocked(foe, this.vFoe, s.id));
    if (!usable.length) {
      const any = foe.moves.findIndex(s => s.pp > 0);
      return { idx: any };
    }
    if (this.wildMon) return { idx: U.pick(usable).i };
    let best = null;
    for (const { s, i } of usable) {
      const m = md(s.id);
      let score;
      if (m.cat !== 'Status') {
        const eff = this.effectiveness(m, me);
        const bp = this.basePower(foe, me, m) || 60;
        const stab = this.typesOf(foe).includes(m.type) ? 1.5 : 1;
        const acc = m.acc === true ? 100 : m.acc;
        score = bp * stab * eff * acc / 100;
        if (m.multihit) score *= Array.isArray(m.multihit) ? 3 : m.multihit;
        if (m.selfdestruct && foe.hp > Mon.maxHp(foe) * .3) score *= .2;
        if ((m.id === 'fakeout' || m.id === 'firstimpression') && this.vFoe.turnsOut > 0) score = 0;
        if (m.flags.charge && !(m.id.startsWith('solar') && this.field.weather === 'sunnyday')) score *= .6;
        if (m.ohko) score = me.lv > foe.lv ? 0 : 70;
      } else if (m.status && !me.st) score = 55;
      else if (m.volatileStatus === 'substitute' && !this.vFoe.sub && foe.hp > Mon.maxHp(foe) / 2) score = 35;
      else if ((m.heal || ['moonlight', 'morningsun', 'synthesis', 'shoreup', 'rest'].includes(m.id)) && foe.hp < Mon.maxHp(foe) / 2) score = 70;
      else if (m.boosts && m.target === 'self' && this.turn <= 2) score = 40;
      else if (m.boosts && this.turn <= 2) score = 30;
      else if (m.sideCondition && !this.sides.foe[m.sideCondition] && !this.sides.me[m.sideCondition]) score = 30;
      else if (m.weather && this.field.weather !== m.weather) score = 25;
      else if (m.stallingMove) score = this.vFoe.protectCount ? 0 : 15;
      else score = m.support === 'partial' ? 5 : 10;
      score *= .85 + U.rand() * .3;
      if (!best || score > best.score) best = { i, score };
    }
    return { idx: best.i };
  },
  async aiHeal() {
    this.aiItems--;
    const foe = this.foe;
    foe.hp = Math.min(Mon.maxHp(foe), foe.hp + 120);
    await this.msg(`${this.trainer.name} 使用了厲害傷藥！`);
    this.draw();
  },
  async foeSwitch(i) {
    await this.msg(`${this.trainer.name} 收回了 ${Mon.name(this.foe)}！`);
    await this.recall('foe');
    await this.onSwitchOut(this.foe);
    this.foeIdx = i;
    this.vFoe = newVol();
    Game.markSeen(this.foe.sp);
    await this.msg(`${this.trainer.name} 派出了 ${Mon.name(this.shownMon(this.foe))}！`);
    await this.sendOut('foe', this.foe);
    await this.onEntry(this.foe);
  },

  moveBlocked(m, v, id) {
    const mv = md(id);
    const it = this.itm(m);
    if (v.choiceLock && v.choiceLock !== id && (['choice-band', 'choice-specs', 'choice-scarf'].includes(it) || this.ab(m) === 'gorilla-tactics')
      && m.moves.some(s => s.id === v.choiceLock && s.pp > 0)) return it ? Held.name(it) : Abil.name('gorilla-tactics');
    if (it === 'assault-vest' && mv.cat === 'Status') return Held.name(it);
    if (v.taunt > 0 && mv.cat === 'Status') return '挑釁';
    if (v.disable > 0 && v.disableMove === id) return '定身法';
    if (this.field && this.field.gravity && mv.flags.gravity) return '重力';
    // 無理取鬧：不能連續使用同一個招式
    if (v.torment && v.lastMove === +id && mv.id !== 'struggle') return '無理取鬧';
    // 封印：對手使用了封印時，不能使用對手也會的招式
    if (this.activeMons && this.activeMons().some(o => o !== m && this.sideKey(o) !== this.sideKey(m) && this.volOf(o).imprison && o.moves.some(s => s.id === +id))) return '封印';
    return null;
  },

  effectiveness(mv, target, user = null) {
    if (!TYPES[mv.type] || mv.type === '???' || mv.type === 'stellar') return 1;
    const tv = this.volOf(target);
    let types = this.typesOf(target);
    let e = 1;
    const scrappy = user && ['scrappy', 'minds-eye'].includes(this.ab(user));
    for (const t of types) {
      let r = CHART[mv.type] && CHART[mv.type][t];
      if (r === undefined) r = 1;
      if (r === 0 && t === 'ghost' && (mv.type === 'normal' || mv.type === 'fighting') && (tv.foresight || scrappy)) r = 1;
      if (r === 0 && t === 'flying' && mv.type === 'ground' && this.grounded(target)) r = 1;
      if (mv.id === 'freezedry' && t === 'water') r = 2;
      e *= r;
    }
    if (mv.id === 'flyingpress') e *= typeEff('flying', types) || 0;
    if (mv.type === 'ground' && !this.grounded(target) && mv.id !== 'thousandarrows') e = 0;
    if (tv.tarShot && mv.type === 'fire') e *= 2;
    return e;
  },

  // ---------- 招式執行（Showdown runMove → useMove → tryMoveHit → spreadMoveHit） ----------
  async runMove(user, target, act) {
    const vU = this.volOf(user), vT = this.volOf(target);
    const name = this.label(user);
    let mv = act.mv;
    vU.movedThisTurn = true;
    if (!act.dancer) { vU.grudge = false; vU.glaiveRush = false; } // 怨念、巨劍突擊的效果到自己下次行動為止
    if (act.recharge) { vU.recharge = false; await this.msg(`${name} 需要休息，無法動彈！`); return; }
    // 行動前判定（beforeMove）
    if (user.st === 'slp') {
      user.slpT = (user.slpT || 1) - (this.ab(user) === 'early-bird' ? 2 : 1);
      if (user.slpT <= 0) { user.st = null; this.draw(); await this.msg(`${name} 醒過來了！`); }
      else if (!mv.sleepUsable) { await this.msg(`${name} 正在呼呼大睡。`); vU.locked = null; vU.charging = null; vU.semi = null; return; }
      else await this.msg(`${name} 正在呼呼大睡。`);
    }
    if (user.st === 'frz') {
      if (U.rand() < .2 || mv.flags.defrost) { user.st = null; this.draw(); await this.msg(`${name} 的冰凍融化了！`); }
      else { await this.msg(`${name} 因冰凍而無法行動！`); return; }
    }
    // 懶惰：每兩回合只能行動一次
    if (this.ab(user) === 'truant' && !act.dancer) {
      if (vU.truantLoaf) { vU.truantLoaf = false; vU.locked = null; await this.abilityMsg(user, `${name} 正在偷懶。`); return; }
      vU.truantLoaf = true;
    }
    if (vU.flinch) {
      await this.msg(`${name} 畏縮了，無法使出招式！`);
      vU.locked = null;
      if (this.ab(user) === 'steadfast') await this.boost(user, { spe: 1 }, user);
      return;
    }
    const blocked = !act.cont && act.slot && this.moveBlocked(user, vU, act.slot.id);
    if (blocked) { await this.msg(`${name} 因${blocked}而無法使出 ${mv.n}！`); return; }
    if (vU.conf > 0) {
      vU.conf--;
      if (vU.conf === 0) await this.msg(`${name} 的混亂解除了！`);
      else {
        await this.msg(`${name} 混亂了！`);
        if (U.rand() < 1 / 3) {
          const st = Mon.stats(user);
          const base = Math.floor(Math.floor(Math.floor(2 * user.lv / 5 + 2) * 40 * st[1] * boostMul(vU.stg.atk) / (st[2] * boostMul(vU.stg.def))) / 50) + 2;
          await this.hurt(user, Math.max(1, Math.floor(base * (100 - U.ri(0, 15)) / 100)));
          await this.msg('不知所以地攻擊了自己！');
          vU.locked = null; vU.charging = null; vU.semi = null;
          return;
        }
      }
    }
    if (user.st === 'par' && U.rand() < .25) { await this.msg(`${name} 因麻痺而無法動彈！`); vU.locked = null; vU.charging = null; vU.semi = null; return; }
    if (vU.love && U.rand() < .5) { await this.msg(`${name} 著迷了，無法使出招式！`); return; }

    // 呼叫其他招式
    if (mv.callsMove) {
      if (act.slot) act.slot.pp = Math.max(0, act.slot.pp - 1);
      await this.msg(`${name} 使出了 ${mv.n}！`);
      const called = this.calledMove(user, vU, mv);
      if (!called) { await this.msg('但是失敗了！'); return; }
      mv = called;
      act = { ...act, slot: null, called: true };
    } else {
      if (act.slot && !act.cont) {
        // 壓迫感：對手的招式指向自己時多扣 1 PP
        const aimed = target && target !== user && target.hp > 0 && !['self', 'allySide', 'allyTeam', 'adjacentAllyOrSelf', 'allies', 'adjacentAlly', 'all'].includes(mv.target);
        act.slot.pp = Math.max(0, act.slot.pp - (aimed && this.ab(target) === 'pressure' && this.sideKey(target) !== this.sideKey(user) ? 2 : 1));
      }
      if (!act.slot && mv === STRUGGLE_MD) await this.msg(`${name} 沒有可以使用的招式了！`);
    }
    const moveId = mv.num;
    if (!act.cont || !vU.charging) await this.msg(`${name} 使出了 ${mv.n}！`);
    this.field.lastMoveUsed = moveId;
    vU.lastMove = mv.id === 'struggle' ? null : moveId;
    if (mv.id !== 'protect' && !mv.stallingMove) vU.protectCount = 0;
    // 講究類道具、一猩一意：鎖定第一個使用的招式
    if (act.slot && !act.called && (['choice-band', 'choice-specs', 'choice-scarf'].includes(this.itm(user)) || this.ab(user) === 'gorilla-tactics')) vU.choiceLock = act.slot.id;

    // 蓄力招式（第一回合）
    if (mv.flags.charge && !vU.charging) {
      const sun = this.wx() === 'sunnyday';
      if ((mv.id === 'solarbeam' || mv.id === 'solarblade') && sun) { /* 晴天直接發動 */ }
      else if (this.itm(user) === 'power-herb') { await this.consume(user, `${name} 用{i}完成了蓄力！`); }
      else {
        vU.charging = moveId;
        const semi = { fly: 'fly', bounce: 'fly', skydrop: 'fly', dig: 'dig', dive: 'dive', phantomforce: 'phantom', shadowforce: 'phantom' }[mv.id];
        vU.semi = semi || null;
        const txt = { fly: '飛向了高空！', dig: '鑽入了地下！', dive: '潛入了水中！', phantom: '消失了蹤影！' }[semi] || '正在蓄積力量！';
        await this.msg(`${name} ${txt}`);
        if (mv.id === 'skullbash') await this.boost(user, { def: 1 }, user);
        if (mv.id === 'meteorbeam' || mv.id === 'electroshot') await this.boost(user, { spa: 1 }, user);
        if (mv.id === 'electroshot' && this.field.weather === 'raindance') { vU.charging = null; } else return;
      }
    }
    const wasCharging = !!vU.charging;
    vU.charging = null; vU.semi = null;
    if (wasCharging && mv.id === 'shadowforce' || mv.id === 'phantomforce') vT.protect = false;

    // 變幻自如、自由者：使用招式前變成招式的屬性（每次登場一次）
    const pa = this.ab(user);
    if ((pa === 'protean' || pa === 'libero') && !vU.proteanUsed && TYPES[this.moveType(user, mv)]) {
      const t = this.moveType(user, mv);
      if (this.typesOf(user).join() !== t) { vU.types = [t]; vU.proteanUsed = true; await this.abilityMsg(user, `${name} 變成了${TYPES[t].n}屬性！`); }
    }
    // 破格、渦輪火焰、兆級電壓（菌絲之力的變化招式）：無視目標的特性
    this.moldTarget = ['mold-breaker', 'teravolt', 'turboblaze'].includes(this.ab(user)) || (this.ab(user) === 'mycelium-might' && mv.cat === 'Status') ? target : null;
    let ok;
    try { ok = await this.useMoveOn(user, target, mv, act); } finally { this.moldTarget = null; }
    // 吵鬧：連續 3 回合，期間場上的寶可夢都不會睡著
    if (mv.id === 'uproar' && ok !== null && user.hp > 0) {
      if (!vU.uproar) {
        vU.uproar = 3; vU.locked = { id: moveId, turns: 99 };
        await this.msg(`${name} 吵鬧了起來！`);
        for (const m of this.activeMons()) if (m.st === 'slp' && this.ab(m) !== 'soundproof') { m.st = null; this.draw(); await this.msg(`${this.label(m)} 被吵醒了！`); }
      }
      if (--vU.uproar <= 0) { vU.uproar = 0; vU.locked = null; await this.msg(`${name} 安靜了下來。`); }
    }
    // 舞者：其他寶可夢使出舞蹈招式後跟著使出同一個招式
    if (ok && mv.flags && mv.flags.dance && !act.dancer) await this.dancers(user, target, mv);
    // 天氣改變後的形態（飄浮泡泡）
    for (const m of this.activeMons()) await this.formCheck(m, 'move');
    if (vU.metronomeMove === mv.num && ok) vU.metronomeN = (vU.metronomeN || 0) + 1;
    else { vU.metronomeMove = mv.num; vU.metronomeN = 0; }
    vU.lastMoveFailed = !ok;
    // 連續攻擊類（逆鱗）
    if (mv.self && mv.self.volatileStatus === 'lockedmove' && ok !== null) {
      if (!vU.locked) vU.locked = { id: moveId, turns: U.ri(2, 3) };
      vU.locked.turns--;
      if (vU.locked.turns <= 0) {
        vU.locked = null;
        if (!vU.conf) { vU.conf = U.ri(2, 5); await this.msg(`${name} 累得混亂了！`); }
      }
    }
    if (mv.self && mv.self.volatileStatus === 'mustrecharge' && ok) vU.recharge = true;
  },

  calledMove(user, vU, mv) {
    const pickFrom = ids => {
      const ok = ids.filter(id => md(id).support === 'full' && !md(id).callsMove && !md(id).flags.charge);
      return ok.length ? md(U.pick(ok)) : null;
    };
    if (mv.id === 'metronome') return pickFrom(Object.keys(MOVES).filter(id => SD.moves[id] && (SD.moves[id].flags || {}).metronome));
    if (mv.id === 'sleeptalk') {
      if (user.st !== 'slp') return null;
      return pickFrom(user.moves.map(s => String(s.id)).filter(id => id !== String(mv.num)));
    }
    if (mv.id === 'copycat') return this.field.lastMoveUsed && !md(this.field.lastMoveUsed).callsMove ? md(this.field.lastMoveUsed) : null;
    if (mv.id === 'naturepower') return md({ electricterrain: 85, grassyterrain: 412, mistyterrain: 585, psychicterrain: 94 }[this.field.terrain] || 161);
    return null;
  },

  // 回傳 true（命中）、false（失敗／未命中）、null（被打斷）
  async useMoveOn(user, target, mv, act) {
    this._moveUsed = true; // 招式確實使出（雙打的全體招式依此決定要不要打其他目標）
    // 濕氣：場上有濕氣時無法使用爆炸類招式（在守住、屬性免疫之前判斷，所以自爆的寶可夢不會倒下）
    if (['selfdestruct', 'explosion', 'mindblown', 'mistyexplosion'].includes(mv.id)
      && !['mold-breaker', 'teravolt', 'turboblaze'].includes(this.ab(user))
      && [...new Set([...this.activeMons(), user, target])].some(m => m && m.hp > 0 && this.ab(m) === 'damp')) {
      await this.msg('受到濕氣的影響，無法使用這個招式！');
      this._moveUsed = false;
      return false;
    }
    // 預知未來、破滅之願：兩回合後才攻擊（同一邊只能有一個）
    if ((mv.id === 'futuresight' || mv.id === 'doomdesire') && !act.futureHit) {
      // 綁定「邊＋格位」：命中時打那個格位當時在場的寶可夢（換人也一樣）；同一個格位只能有一個
      const side = this.sideKey(target), slot = this.slotOf ? Math.max(0, this.slotOf(target)) : 0;
      if (this.futures.some(f => f.side === side && (f.slot || 0) === slot)) { await this.msg('但是失敗了！'); return false; }
      this.futures.push({ turns: 3, side, slot, user, mv, act: { ...act } });
      await this.msg(mv.id === 'futuresight' ? `${this.label(user)} 預知了未來的攻擊！` : `${this.label(user)} 把破滅之願託付給了未來！`);
      return true;
    }
    // 忍耐：承受兩回合的攻擊，再以兩倍奉還
    if (mv.id === 'bide') return this.bide(user, target, mv);
    const vU = this.volOf(user), vT = this.volOf(target);
    const name = this.label(user), tname = this.label(target);
    const selfTarget = ['self', 'allySide', 'allyTeam', 'adjacentAllyOrSelf', 'allies', 'adjacentAlly'].includes(mv.target);
    const fieldTarget = ['all', 'foeSide'].includes(mv.target);
    const hitsTarget = !selfTarget && !fieldTarget;

    // 只在登場第一回合能用
    if ((mv.id === 'fakeout' || mv.id === 'firstimpression' || mv.id === 'matblock') && vU.turnsOut > 0) { await this.msg('但是失敗了！'); return false; }
    // 突襲：目標本回合沒有要用攻擊招式或已行動
    if (mv.id === 'suckerpunch' || mv.id === 'thunderclap') {
      const tmv = this.queuedMoveOf(target);
      if (vT.movedThisTurn || !tmv || tmv.cat === 'Status') { await this.msg('但是失敗了！'); return false; }
    }
    if (mv.id === 'focuspunch' && vU.damagedThisTurn) { await this.msg(`${name} 失去了集中力，無法使出招式！`); return false; }

    if (hitsTarget) {
      if (!target || target.hp <= 0) { await this.msg('但是沒有目標……'); return false; }
      // 守住
      // 無形拳：接觸類招式無視守住
      if (vT.protect && mv.flags.protect && !mv.breaksProtect && !(this.ab(user) === 'unseen-fist' && mv.flags.contact)) {
        await this.msg(`${tname} 保護住了自己！`);
        await this.protectContact(user, target, mv);
        if (mv.hasCrashDamage) await this.crash(user);
        if (mv.selfdestruct === 'always') await this.selfFaint(user); // 自爆、大爆炸：被守住也會倒下
        return false;
      }
      if (mv.breaksProtect && vT.protect) { vT.protect = false; await this.msg(`${tname} 的守護被打破了！`); }
      // 半無敵狀態
      if (vT.semi) {
        const can = { fly: ['thunder', 'hurricane', 'gust', 'twister', 'skyuppercut', 'smackdown', 'thousandarrows'], dig: ['earthquake', 'magnitude', 'fissure'],
          dive: ['surf', 'whirlpool'], phantom: [] }[vT.semi] || [];
        if (!can.includes(mv.id) && !(vU.lockOn > 0)) { await this.msg(`${tname} 躲開了攻擊！`); return false; }
      }
      // 精神場地擋下先制招式
      if (this.field.terrain === 'psychicterrain' && ((act && act.pri !== undefined ? act.pri : mv.pri) || 0) > 0 && this.grounded(target)) { await this.msg(`${tname} 受到了精神場地的保護！`); return false; }
      // 快速防守、廣域防守、戲法防守：保護自己這一邊（這一回合）
      const sT = this.sides[this.sideKey(target)], pri = (act && act.pri !== undefined ? act.pri : mv.pri) || 0, foeMove = this.sideKey(target) !== this.sideKey(user);
      if (sT.quickGuard && pri > 0 && target !== user) { await this.msg(`${tname} 受到了快速防守的保護！`); return false; }
      if (sT.wideGuard && ['allAdjacent', 'allAdjacentFoes'].includes(mv.target)) { await this.msg(`${tname} 受到了廣域防守的保護！`); return false; }
      if (sT.craftyShield && mv.cat === 'Status' && foeMove) { await this.msg(`${tname} 受到了戲法防守的保護！`); return false; }
      // 鮮艷之軀、女王的威嚴、尾甲：對手的先制招式對自己和隊友無效
      if (pri > 0 && foeMove) {
        const guard = [target, this.allyOf ? this.allyOf(target) : null].find(x => x && x.hp > 0 && ['dazzling', 'queenly-majesty', 'armor-tail'].includes(this.ab(x)));
        if (guard) { await this.abilityMsg(guard, `${name} 無法使出 ${mv.n}！`); return false; }
      }
      // 惡作劇之心的變化招式對惡屬性無效
      if (act.prankster && this.typesOf(target).includes('dark') && this.sideKey(target) !== this.sideKey(user)) { await this.msg(`對 ${tname} 好像沒有效果……`); return false; }
      // 屬性免疫（Showdown：變化招式預設忽略免疫）
      const ignoreImm = mv.ignoreImmunity !== undefined ? mv.ignoreImmunity === true : mv.cat === 'Status';
      if (!ignoreImm && this.effectiveness({ ...mv, type: this.moveType(user, mv) }, target, user) === 0) {
        await this.msg(`對 ${tname} 好像沒有效果……`);
        if (mv.hasCrashDamage) await this.crash(user);
        if (mv.selfdestruct === 'always') await this.selfFaint(user); // 對幽靈屬性使用自爆也會倒下
        return false;
      }
      if (mv.flags.powder && (this.typesOf(target).includes('grass') || this.ab(target) === 'overcoat' || this.itm(target) === 'safety-goggles')) {
        await this.msg(`對 ${tname} 好像沒有效果……`); return false;
      }
      // 特性造成的免疫（飄浮、蓄電、引火、神奇守護……）
      if (await this.abilityImmune(user, target, mv)) return false;
      // 替身擋下變化招式
      if (vT.sub && mv.cat === 'Status' && !mv.flags.bypasssub && !mv.flags.sound && this.ab(user) !== 'infiltrator') { await this.msg('但是失敗了！'); return false; }
      // 魔法鏡：把變化招式反彈回去
      if (mv.cat === 'Status' && mv.flags.reflectable && (this.ab(target) === 'magic-bounce' || vT.magicCoat) && !act.bounced) {
        if (vT.magicCoat) await this.msg(`${tname} 用魔法反射把 ${mv.n} 反彈了回去！`);
        else await this.abilityMsg(target, `把 ${mv.n} 反彈了回去！`);
        return this.useMoveOn(target, user, mv, { ...act, bounced: true, prankster: false });
      }
      // 芳香幕：擋下挑釁、再來一次、定身法、著迷
      if (this.ab(target) === 'aroma-veil' && ['taunt', 'encore', 'disable', 'attract'].includes(mv.volatileStatus)) { await this.abilityMsg(target, '受到了芳香幕的保護！'); return false; }
      // 命中判定
      if (!(await this.accuracyCheck(user, target, mv))) {
        await this.msg(`${tname} 躲開了攻擊！`);
        if (mv.hasCrashDamage) await this.crash(user);
        if (mv.selfdestruct === 'always') await this.selfFaint(user);
        return false;
      }
    }

    await this.moveAnim(user, target, this.viewMove(mv));
    if (mv.cat !== 'Status') return this.damagingMove(user, target, mv, act);
    return this.statusMove(user, target, mv, act);
  },

  // 回傳 true 表示招式被特性擋下（並處理吸收、提升等效果）
  async abilityImmune(user, target, mv) {
    const a = this.ab(target);
    if (!a || target === user) return false;
    const type = this.moveType(user, mv), tname = this.label(target);
    const heal = async frac => {
      const max = Mon.maxHp(target);
      if (target.hp < max) { await this.healMon(target, Math.floor(max * frac)); await this.abilityMsg(target, `${tname} 的體力回復了！`); }
      else await this.abilityMsg(target, `對 ${tname} 好像沒有效果……`);
      return true;
    };
    const raise = async boosts => { await this.abilityMsg(target, '吸收了招式！'); await this.boost(target, boosts, target); return true; };
    if (type === 'electric' && mv.cat !== 'Status' || mv.id === 'thunderwave') {
      if (a === 'volt-absorb') return heal(.25);
      if (a === 'lightning-rod') return raise({ spa: 1 });
      if (a === 'motor-drive') return raise({ spe: 1 });
    }
    if (type === 'water' && (mv.cat !== 'Status' || mv.target !== 'self')) {
      if (a === 'water-absorb' || a === 'dry-skin') return heal(.25);
      if (a === 'storm-drain') return raise({ spa: 1 });
    }
    if (type === 'grass' && a === 'sap-sipper') return raise({ atk: 1 });
    if (type === 'ground' && a === 'earth-eater') return heal(.25);
    if (type === 'fire' && a === 'well-baked-body') return raise({ def: 2 });
    if (type === 'fire' && a === 'flash-fire') { this.volOf(target).flashFire = true; await this.abilityMsg(target, `${tname} 的火屬性招式威力提高了！`); return true; }
    if (mv.flags.wind && a === 'wind-rider') return raise({ atk: 1 });
    if (type === 'ground' && mv.cat !== 'Status' && a === 'levitate' && !this.field.gravity && !this.volOf(target).smackDown) { await this.abilityMsg(target, `${tname} 浮在空中，地面屬性招式沒有效果！`); return true; }
    // 黃金之軀：對手的變化招式無效
    if (a === 'good-as-gold' && mv.cat === 'Status') { await this.abilityMsg(target, `${tname} 不受 ${mv.n} 的影響！`); return true; }
    if (mv.flags.sound && a === 'soundproof') { await this.abilityMsg(target, '聲音類招式沒有效果！'); return true; }
    if (mv.flags.bullet && a === 'bulletproof') { await this.abilityMsg(target, '球和彈類招式沒有效果！'); return true; }
    if (a === 'wonder-guard' && mv.cat !== 'Status' && this.effectiveness({ ...mv, type }, target, user) <= 1 && mv.id !== 'struggle') {
      await this.abilityMsg(target, `對 ${tname} 好像沒有效果……`); return true;
    }
    return false;
  },

  viewMove(mv) {
    return { id: mv.baseId || mv.id, isZ: !!mv.isZ, t: mv.type === '???' ? 'normal' : mv.type, c: mv.cat === 'Physical' ? 'ph' : mv.cat === 'Special' ? 'sp' : 'st', tg: mv.target === 'self' ? 'user' : 'selected-pokemon',
      sx: mv.boosts ? Object.entries(mv.boosts) : null, ail: mv.status };
  },

  async accuracyCheck(user, target, mv) {
    const vU = this.volOf(user), vT = this.volOf(target);
    if (mv.ohko) {
      if (target.lv > user.lv) return false;
      let acc = 30 + user.lv - target.lv;
      if (mv.id === 'sheercold' && !this.typesOf(user).includes('ice')) acc -= 10;
      return U.rand() * 100 < acc;
    }
    let acc = mv.acc;
    const w = this.wx();
    if ((mv.id === 'thunder' || mv.id === 'hurricane') && w === 'raindance') acc = true;
    if ((mv.id === 'thunder' || mv.id === 'hurricane') && w === 'sunnyday') acc = 50;
    if (mv.id === 'blizzard' && (w === 'hail' || w === 'snowscape')) acc = true;
    if (vT.minimize && mv.flags.minimize) acc = true;
    if (vU.lockOn > 0) { vU.lockOn = 0; acc = true; }
    if (vT.glaiveRush) acc = true; // 巨劍突擊之後：對手的招式必定命中
    const ua = this.ab(user), ta = this.ab(target);
    if (ua === 'no-guard' || ta === 'no-guard') acc = true;
    if (acc === true) return true;
    // 能力等級：純樸無視對方的等級，銳利目光無視閃避提升
    const accStage = ta === 'unaware' ? 0 : vU.stg.acc;
    let evaStage = ua === 'unaware' ? 0 : vT.stg.eva;
    if (mv.ignoreEvasion || vT.foresight || ua === 'keen-eye' || ua === 'minds-eye') evaStage = Math.min(0, evaStage);
    acc = acc * accBoostMul(accStage - evaStage);
    if (ua === 'compound-eyes') acc *= 1.3;
    if (ua === 'victory-star') acc *= 1.1;
    if (ua === 'hustle' && mv.cat === 'Physical') acc *= .8;
    if ((ta === 'sand-veil' && w === 'sandstorm') || (ta === 'snow-cloak' && (w === 'snowscape' || w === 'hail'))) acc *= .8;
    if (this.itm(target) === 'bright-powder') acc *= .9;
    if (ta === 'tangled-feet' && vT.conf > 0) acc *= .5;
    if (ta === 'wonder-skin' && mv.cat === 'Status') acc = Math.min(acc, 50);
    if (this.itm(user) === 'wide-lens') acc *= 1.1;
    if (this.itm(user) === 'zoom-lens' && vT.movedThisTurn) acc *= 1.2;
    if (this.field.gravity) acc = acc * 5 / 3;
    return U.rand() * 100 < acc;
  },

  // ---------- 威力 ----------
  basePower(user, target, mv) {
    const vU = this.volOf(user), vT = this.volOf(target);
    const su = Mon.stats(user), st = Mon.stats(target);
    const hpR = user.hp / su[0];
    let bp = mv.bp;
    switch (mv.id) {
      case 'grassknot': case 'lowkick': {
        const w = this.wt(target);
        bp = w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20; break;
      }
      case 'heavyslam': case 'heatcrash': {
        const r = this.wt(user) / this.wt(target);
        bp = r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40; break;
      }
      case 'gyroball': bp = Math.min(150, Math.floor(25 * this.speedOf(target, vT) / Math.max(1, this.speedOf(user, vU))) + 1); break;
      case 'electroball': {
        const r = this.speedOf(user, vU) / Math.max(1, this.speedOf(target, vT));
        bp = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; break;
      }
      case 'flail': case 'reversal': {
        const p = Math.floor(48 * user.hp / su[0]);
        bp = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20; break;
      }
      case 'eruption': case 'waterspout': case 'dragonenergy': bp = Math.max(1, Math.floor(150 * hpR)); break;
      case 'crushgrip': case 'wringout': bp = Math.max(1, Math.floor(120 * target.hp / st[0])); break;
      case 'hardpress': bp = Math.max(1, Math.floor(100 * target.hp / st[0])); break;
      case 'return': case 'pikapapow': case 'veeveevolley': bp = Math.max(1, Math.floor((user.happy || 0) * 10 / 25)); break;
      case 'frustration': bp = Math.max(1, Math.floor((255 - (user.happy || 0)) * 10 / 25)); break;
      case 'hex': if (target.st) bp *= 2; break;
      case 'venoshock': case 'barbbarrage': if (target.st === 'psn' || target.st === 'tox') bp *= 2; break;
      case 'brine': if (target.hp * 2 <= st[0]) bp *= 2; break;
      case 'facade': if (['brn', 'par', 'psn', 'tox'].includes(user.st)) bp *= 2; break;
      case 'acrobatics': if (!user.item) bp *= 2; break; // 雜技：沒有攜帶道具時威力加倍
      case 'knockoff': if (this.itm(target)) bp = Math.floor(bp * 1.5); break;
      case 'assurance': if (vT.damagedThisTurn) bp *= 2; break;
      case 'avalanche': case 'revenge': if (vU.hitBy.length) bp *= 2; break;
      case 'payback': if (vT.movedThisTurn) bp *= 2; break;
      case 'boltbeak': case 'fishiousrend': if (!vT.movedThisTurn) bp *= 2; break;
      case 'stompingtantrum': case 'temperflare': if (vU.lastMoveFailed) bp *= 2; break;
      case 'storedpower': case 'powertrip': bp = 20 + 20 * Object.values(vU.stg).reduce((a, b) => a + Math.max(0, b), 0); break;
      case 'punishment': bp = Math.min(200, 60 + 20 * Object.values(vT.stg).reduce((a, b) => a + Math.max(0, b), 0)); break;
      case 'lastrespects': bp = 50 + 50 * this.sides[this.sideKey(user)].fainted; break;
      case 'ragefist': bp = Math.min(350, 50 + 50 * vU.timesHit); break;
      case 'risingvoltage': if (this.field.terrain === 'electricterrain' && this.grounded(target)) bp *= 2; break;
      case 'expandingforce': if (this.field.terrain === 'psychicterrain') bp = Math.floor(bp * 1.5); break;
      case 'mistyexplosion': if (this.field.terrain === 'mistyterrain') bp = Math.floor(bp * 1.5); break;
      case 'terrainpulse': if (this.field.terrain) bp *= 2; break;
      case 'weatherball': if (this.field.weather) bp *= 2; break;
      case 'solarbeam': case 'solarblade': if (this.field.weather && this.field.weather !== 'sunnyday') bp = Math.floor(bp / 2); break;
      case 'hydrosteam': if (this.field.weather === 'sunnyday') bp = Math.floor(bp * 1.5); break;
      case 'psyblade': if (this.field.terrain === 'electricterrain') bp = Math.floor(bp * 1.5); break;
      case 'wakeupslap': if (target.st === 'slp') bp *= 2; break;
      case 'smellingsalts': if (target.st === 'par') bp *= 2; break;
      case 'collisioncourse': case 'electrodrift': break;
      case 'echoedvoice': bp = Math.min(200, 40 * (1 + vU.echoed)); break;
      case 'furycutter': bp = Math.min(160, 40 * Math.pow(2, vU.furyCutter)); break;
      case 'rollout': case 'iceball': bp = 30 * Math.pow(2, Math.min(4, vU.rollout)) * (vU.defenseCurl ? 2 : 1); break;
      case 'round': break;
      case 'magnitude': {
        const r = U.rand() * 100;
        bp = r < 5 ? 10 : r < 15 ? 30 : r < 35 ? 50 : r < 65 ? 70 : r < 85 ? 90 : r < 95 ? 110 : 150; break;
      }
      case 'present': { const r = U.rand(); bp = r < .4 ? 40 : r < .7 ? 80 : r < .8 ? 120 : 0; break; }
      case 'beatup': bp = 5 + Math.floor(POKEDEX[user.sp].s[1] / 10); break;
      case 'spitup': bp = 100 * (vU.stockpile || 0); break;
      case 'watershuriken': break;
    }
    // 太晶化：與太晶屬性相同、威力不到 60 的招式提升到 60（連續攻擊與先制招式除外）
    if (this.isTera(user) && bp > 0 && bp < 60 && this.moveType(user, mv) === Mon.teraType(user) && !mv.multihit && !(mv.pri > 0)) bp = 60;
    return bp;
  },
  moveType(user, mv) {
    if (mv.id === 'terablast' && this.isTera(user)) return Mon.teraType(user);
    if (mv.id === 'weatherball') return { sunnyday: 'fire', raindance: 'water', sandstorm: 'rock', hail: 'ice', snowscape: 'ice' }[this.field.weather] || 'normal';
    if (mv.id === 'terrainpulse') return { electricterrain: 'electric', grassyterrain: 'grass', mistyterrain: 'fairy', psychicterrain: 'psychic' }[this.field.terrain] || 'normal';
    if (mv.id === 'revelationdance') return this.typesOf(user)[0];
    if (mv.id === 'ragingbull' && user.sp === 128) return 'fighting';
    if (mv.id === 'judgment' && PLATE_TYPE[user.item]) return PLATE_TYPE[user.item];
    if (mv.id === 'multiattack' && MEMORY_TYPE[user.item]) return MEMORY_TYPE[user.item];
    if (mv.id === 'aurawheel' && user.form === 'morpeko-hangry') return 'dark';
    // 輸電：這回合目標的招式變成電屬性；等離子浴：一般屬性招式變成電屬性
    if (this.volOf(user).electrify) return 'electric';
    const a = this.ab(user);
    if (a === 'liquid-voice' && mv.flags && mv.flags.sound) return 'water';
    if (this.field && this.field.ionDeluge && mv.type === 'normal' && !['normalize', 'aerilate', 'pixilate', 'refrigerate', 'galvanize'].includes(a)) return 'electric';
    if (a === 'normalize') return 'normal';
    const ate = { aerilate: 'flying', pixilate: 'fairy', refrigerate: 'ice', galvanize: 'electric' }[a];
    if (ate && mv.type === 'normal') return ate;
    return mv.type;
  },

  // ---------- 傷害招式 ----------
  async damagingMove(user, target, mv, act) {
    const vU = this.volOf(user), vT = this.volOf(target);
    const tname = this.label(target);
    const type = this.moveType(user, mv);
    const tmv = { ...mv, type };
    const eff = this.effectiveness(tmv, target, user);
    if (eff === 0 && mv.damage === undefined && !mv.ohko) { await this.msg(`對 ${tname} 好像沒有效果……`); return false; }
    if (mv.ohko && this.ab(target) === 'sturdy') { await this.abilityMsg(target, `${tname} 不會受到一擊必殺的影響！`); return false; }
    const ua = this.ab(user), ui = this.itm(user);
    const contact = mv.flags.contact && ui !== 'punching-glove' && ua !== 'long-reach' && ui !== 'protective-pads';

    // 破壁（劈瓦、精神之牙、怒牛）
    if (['brickbreak', 'psychicfangs', 'ragingbull'].includes(mv.id)) {
      const s = this.sides[this.sideKey(target)];
      if (s.reflect || s.lightscreen || s.auroraveil) { s.reflect = s.lightscreen = s.auroraveil = 0; await this.msg('牆壁被打破了！'); }
    }

    // 擊中次數
    let hits = 1;
    if (Array.isArray(mv.multihit)) {
      const [a, b] = mv.multihit;
      if (ua === 'skill-link') hits = b;
      else if (ui === 'loaded-dice') hits = a === 2 && b === 5 ? U.ri(4, 5) : b;
      else if (a === 2 && b === 5) { const r = U.rand(); hits = r < .35 ? 2 : r < .7 ? 3 : r < .85 ? 4 : 5; }
      else hits = U.ri(a, b);
    } else if (mv.multihit) hits = mv.multihit;

    let total = 0, n = 0, anyCrit = false, subHit = false;
    for (let i = 0; i < hits && target.hp > 0 && user.hp > 0; i++) {
      if (i > 0 && mv.multiaccuracy && !(await this.accuracyCheck(user, target, mv))) break;
      let dmg, crit = false;
      const fixed = this.fixedDamage(user, target, mv);
      if (fixed === false) { await this.msg('但是失敗了！'); return false; }
      if (fixed !== null) dmg = fixed;
      else {
        let bp = this.basePower(user, target, mv);
        if (mv.id === 'triplekick') bp = 10 * (i + 1);
        if (mv.id === 'tripleaxel') bp = 20 * (i + 1);
        if (bp <= 0) { if (mv.id === 'present') { await this.healMon(target, Math.floor(Mon.maxHp(target) / 4)); await this.msg(`${tname} 的體力回復了！`); return true; } await this.msg('但是失敗了！'); return false; }
        ({ dmg, crit } = this.calcDamage(user, target, vU, vT, tmv, eff, bp));
      }
      // 替身（穿透可以無視）
      if (vT.sub && !mv.flags.bypasssub && !mv.flags.sound && ua !== 'infiltrator') {
        const d = Math.min(vT.sub, dmg);
        vT.sub -= d;
        subHit = true;
        await this.msg('替身代替承受了攻擊！');
        if (vT.sub <= 0) { vT.sub = 0; await this.msg(`${tname} 的替身消失了……`); }
        total += d; n++;
        continue;
      }
      // 結凍頭（冰砌鵝）：第一次受到的物理招式由冰臉承受（畫皮在 js/late.js）
      if (this.ab(target) === 'ice-face' && target.sp === 875 && target.form !== 'eiscue-noice' && mv.cat === 'Physical') {
        n++; subHit = true;
        await this.abilityMsg(target, `${tname} 的冰臉代替承受了攻擊！`);
        await this.setForm(target, 'eiscue-noice', `${tname} 的冰臉碎掉了！`);
        continue;
      }
      // 點到為止、手下留情：至少留下 1 HP
      if ((mv.id === 'falseswipe' || mv.id === 'holdback') && dmg >= target.hp) dmg = target.hp - 1;
      // 挺住、結實、氣勢披帶、氣勢頭帶
      const full = target.hp === Mon.maxHp(target);
      let survived = null;
      if (dmg >= target.hp) {
        if (vT.endure) survived = 'endure';
        else if (full && this.ab(target) === 'sturdy') survived = 'sturdy';
        else if (full && this.itm(target) === 'focus-sash') survived = 'sash';
        else if (this.itm(target) === 'focus-band' && U.rand() < .1) survived = 'band';
        if (survived) dmg = target.hp - 1;
      }
      dmg = Math.min(dmg, target.hp);
      if (crit) anyCrit = true;
      total += dmg; n++;
      const hpBefore = target.hp;
      await this.hurt(target, dmg, fixed !== null ? 1 : eff);
      if (crit) await this.msg('擊中了要害！');
      vT.hitBy.push({ by: this.sideKey(user), dmg, cat: mv.cat });
      if (vT.bide) { vT.bide.dmg += dmg; vT.bide.by = user; } // 忍耐：累積受到的傷害
      // 怨念：被打倒時，打倒自己的招式 PP 歸零
      if (target.hp <= 0 && vT.grudge && act && act.slot) { act.slot.pp = 0; await this.msg(`${this.label(user)} 的 ${mv.n} 因為怨念失去了所有 PP！`); }
      vT.damagedThisTurn = true;
      vT.timesHit++;
      if (survived === 'endure') await this.msg(`${tname} 挺住了攻擊！`);
      if (survived === 'sturdy') await this.abilityMsg(target, `${tname} 挺住了攻擊！`);
      if (survived === 'sash' || survived === 'band') await this.consume(target, `${tname} 靠著{i}撐了下來！`);
      if (survived === 'band') target.item = 'focus-band';
      await this.afterHit(user, target, tmv, dmg, eff, crit, contact, hpBefore);
      if (user.hp <= 0) break;
    }
    if (n === 0) return false;
    if (fixedType(mv) === null && !subHit) {
      if (eff > 1) await this.msg('效果絕佳！');
      else if (eff < 1) await this.msg('效果不好……');
    }
    if (hits > 1) await this.msg(`擊中了 ${n} 次！`);
    // 連續招式的計數
    vU.echoed = mv.id === 'echoedvoice' ? vU.echoed + 1 : 0;
    vU.furyCutter = mv.id === 'furycutter' ? vU.furyCutter + 1 : 0;
    vU.rollout = (mv.id === 'rollout' || mv.id === 'iceball') ? vU.rollout + 1 : 0;

    // 吸取／反作用力（大根莖增加吸取量；堅硬腦袋、魔法防守不受反作用力）
    if (mv.drain && user.hp > 0 && total > 0) {
      let h = Math.max(1, Math.floor(total * mv.drain[0] / mv.drain[1]));
      if (ui === 'big-root') h = Math.floor(h * 1.3);
      if (this.ab(target) === 'liquid-ooze') { await this.hurt(user, Math.min(user.hp, h)); await this.abilityMsg(target, `${this.label(user)} 吸到了污泥漿！`); }
      else { await this.healMon(user, h); await this.msg(`從 ${tname} 吸取了體力！`); }
    }
    // 詛咒之軀：30% 封住打中自己的招式
    if (this.ab(target) === 'cursed-body' && target.hp >= 0 && !vU.disable && U.rand() < .3 && act.slot) {
      vU.disable = 4; vU.disableMove = act.slot.id;
      await this.abilityMsg(target, `${this.label(user)} 的 ${mv.n} 被封住了！`);
    }
    if (user.hp > 0 && total > 0 && ua !== 'magic-guard') {
      let rec = 0;
      if (mv.recoil && ua !== 'rock-head') rec = Math.max(1, Math.round(total * mv.recoil[0] / mv.recoil[1]));
      if (mv.struggleRecoil) rec = Math.max(1, Math.round(Mon.maxHp(user) / 4));
      if (mv.mindBlownRecoil || mv.chloroblastRecoil) rec = Math.ceil(Mon.maxHp(user) / 2);
      if (rec) { await this.selfDamage(user, rec); await this.msg(`${this.label(user)} 受到了反作用力的傷害！`); }
    }

    // 追加效果（強行會消除；天恩機率加倍；替身、鱗粉、密探斗篷擋下對目標的追加效果）
    const secs = mv.secondaries || (mv.secondary ? [mv.secondary] : []);
    const sheer = ua === 'sheer-force' && secs.length > 0;
    const shielded = subHit || this.ab(target) === 'shield-dust' || this.itm(target) === 'covert-cloak';
    if (!sheer) {
      for (const s of secs) {
        if (U.rand() * 100 >= (s.chance ?? 100) * (ua === 'serene-grace' ? 2 : 1)) continue;
        if (s.self) { if (user.hp > 0 && s.self.boosts) await this.boost(user, s.self.boosts, user); continue; }
        if (target.hp <= 0 || shielded) continue;
        if (s.status) await this.setStatus(target, s.status, user, true);
        if (s.volatileStatus) await this.addVolatile(target, s.volatileStatus, user, mv, true);
        if (s.boosts) await this.boost(target, s.boosts, user, true);
      }
      // 毒鎖鏈：30% 讓目標中劇毒（不是追加效果，強行不會消除）
      if (ua === 'toxic-chain' && target.hp > 0 && !shielded && U.rand() < .3) await this.setStatus(target, 'tox', user, true);
      // 王者之證、銳利之牙：10% 畏縮
      if ((ui === 'kings-rock' || ui === 'razor-fang') && target.hp > 0 && !shielded && !secs.some(s => s.volatileStatus === 'flinch') && U.rand() < .1) vT.flinch = true;
    }
    // 生命寶珠的反作用力、貝殼之鈴、打倒對手時的特性
    // 雙打的全體招式：生命寶珠、爽喉噴霧、自身的能力變化是「整個招式一次」，而且在所有目標都打完之後才結算
    // （淘金潮打第二個目標時特攻還沒降；act._once 記錄已排入的項目，act._once.after 是招式結束後要執行的）
    const later = async (k, fn) => {
      const o = act && act._once;
      if (!o) return fn();
      if (o[k]) return;
      o[k] = true;
      if (o.after) o.after.push(fn); else await fn();
    };
    if (user.hp > 0 && total > 0) {
      if (ui === 'life-orb' && ua !== 'magic-guard' && !sheer && !this._futureSrcOut) await later('lifeOrb', async () => { if (user.hp > 0) { await this.selfDamage(user, Math.max(1, Math.floor(Mon.maxHp(user) / 10))); await this.msg(`${this.label(user)} 的體力被削減了！`); } });
      if (ui === 'shell-bell' && user.hp > 0 && user.hp < Mon.maxHp(user)) { await this.healMon(user, Math.max(1, Math.floor(total / 8))); await this.msg(`${this.label(user)} 用貝殼之鈴回復了少許體力！`); }
      if (ui === 'throat-spray' && mv.flags.sound && user.hp > 0) await later('throatSpray', async () => { if (user.hp > 0 && user.item === 'throat-spray') { await this.consume(user, `${this.label(user)} 使用了{i}！`); await this.boost(user, { spa: 1 }, user); } });
    }
    if (target.hp <= 0 && user.hp > 0) {
      if (ua === 'moxie' || ua === 'chilling-neigh') await this.boost(user, { atk: 1 }, user);
      if (ua === 'grim-neigh' || ua === 'soul-heart') await this.boost(user, { spa: 1 }, user);
      if (ua === 'beast-boost') {
        const s = Mon.stats(user);
        const k = ['atk', 'def', 'spa', 'spd', 'spe'][[1, 2, 3, 4, 5].reduce((b, i) => s[i] > s[b] ? i : b, 1) - 1];
        await this.boost(user, { [k]: 1 }, user);
      }
    }
    if (user.hp > 0) await this.checkBerry(user);
    // 對目標的揮發狀態（束縛類）
    if (mv.volatileStatus && target.hp > 0 && !subHit) await this.addVolatile(target, mv.volatileStatus, user, mv);
    // 自身效果
    if (mv.self && mv.self.boosts && user.hp > 0) await later('self', async () => { if (user.hp > 0 && (!mv.self.chance || U.rand() * 100 < mv.self.chance)) await this.boost(user, mv.self.boosts, user); });
    if (mv.self && mv.self.volatileStatus === 'roost') vU.roost = true;
    if (mv.self && mv.self.volatileStatus === 'glaiverush' && user.hp > 0) vU.glaiveRush = true;
    if (mv.selfBoost && mv.selfBoost.boosts && user.hp > 0) await later('selfBoost', async () => { if (user.hp > 0) await this.boost(user, mv.selfBoost.boosts, user); });
    // 解凍
    if (mv.thawsTarget && target.st === 'frz' && target.hp > 0) { target.st = null; this.draw(); await this.msg(`${tname} 的冰凍融化了！`); }
    if (mv.id === 'sparklingaria' && target.st === 'brn') { target.st = null; this.draw(); }
    // 特殊招式後續
    if (mv.id === 'rapidspin' || mv.id === 'mortalspin') {
      const s = this.sides[this.sideKey(user)];
      s.spikes = 0; s.toxicspikes = 0; s.stealthrock = false; s.stickyweb = false;
      vU.seed = false; vU.trap = 0;
      if (mv.id === 'mortalspin' && target.hp > 0) await this.setStatus(target, 'psn', user, true);
    }
    if (mv.id === 'clearsmog' && target.hp > 0) { Object.keys(vT.stg).forEach(k => { vT.stg[k] = 0; }); await this.msg(`${tname} 的能力變化恢復原狀了！`); }
    if (mv.id === 'burnup') vU.types = this.typesOf(user).filter(t => t !== 'fire');
    if (mv.id === 'doubleshock') vU.types = this.typesOf(user).filter(t => t !== 'electric');
    // 與道具相關的招式
    const tItem = this.itm(target);
    const sticky = this.ab(target) === 'sticky-hold';
    if (mv.id === 'knockoff' && tItem && target.hp > 0 && !subHit && !sticky) { this.keep(target, 'item'); await this.consume(target, `${tname} 的{i}被拍落了！`); vT.usedItem = null; }
    if (mv.id === 'incinerate' && tItem && tItem.endsWith('-berry') && !subHit) { await this.consume(target, `${tname} 的{i}被燒掉了！`); vT.usedItem = null; }
    if ((mv.id === 'pluck' || mv.id === 'bugbite') && tItem && tItem.endsWith('-berry') && !subHit) {
      const b = await this.consume(target, `${this.label(user)} 吃掉了 ${tname} 的{i}！`);
      vT.usedItem = null;
      await this.berryEffect(user, b);
    }
    // 小偷、想要、魔術師（打中時）：搶走目標的道具（訓練家對戰結束後會還回去）
    const steal = mv.id === 'thief' || mv.id === 'covet';
    if ((steal || (ua === 'magician' && total > 0)) && tItem && !user.item && user.hp > 0 && !subHit && !sticky) {
      const it = await this.moveItem(target, user, steal ? `${this.label(user)} 搶走了 ${tname} 的{i}！` : null);
      if (!steal) await this.abilityMsg(user, `搶走了 ${tname} 的${Held.name(it)}！`);
    }
    // 一口飛彈：衝浪、潛水後叼住獵物（體力一半以上是沙丁魚，以下是皮卡丘）
    if (ua === 'gulp-missile' && user.sp === 845 && (mv.id === 'surf' || mv.id === 'dive') && !user.form && user.hp > 0)
      await this.setForm(user, user.hp * 2 > Mon.maxHp(user) ? 'cramorant-gulping' : 'cramorant-gorging');
    // 噴出：用掉蓄力
    if (mv.id === 'spitup') await this.clearStockpile(user);
    // 自爆類
    if (mv.selfdestruct === 'always' || mv.selfdestruct === 'ifHit') await this.selfFaint(user);
    if (mv.id === 'finalgambit') await this.selfFaint(user);
    // 吹飛
    if (mv.forceSwitch && target.hp > 0) await this.forceOut(target);
    // 交換（急速折返等）
    if (mv.selfSwitch && user.hp > 0) await this.selfSwitchOut(user, mv);
    // 危險迴避、躍躍欲逃：體力降到一半以下時退場
    if (vT.emergencyExit && target.hp > 0) { vT.emergencyExit = false; await this.emergencyExit(target); }
    return true;
  },

  // 每次命中後：受擊方的特性與道具、接觸效果、樹果
  async afterHit(user, target, mv, dmg, eff, crit, contact, hpBefore) {
    const ta = this.ab(target), ua = this.ab(user), ti = this.itm(target);
    const tname = this.label(target), uname = this.label(user);
    const max = Mon.maxHp(target);
    if (dmg > 0 && ti === 'air-balloon') await this.consume(target, `${tname} 的{i}破掉了！`);
    if (target.hp > 0 && dmg > 0) {
      if (eff > 1 && ti === 'weakness-policy') { await this.consume(target, `${tname} 的{i}發動了！`); await this.boost(target, { atk: 2, spa: 2 }, target); }
      if (ta === 'justified' && mv.type === 'dark') await this.boost(target, { atk: 1 }, target);
      if (ta === 'rattled' && ['dark', 'ghost', 'bug'].includes(mv.type)) await this.boost(target, { spe: 1 }, target);
      if (ta === 'weak-armor' && mv.cat === 'Physical') await this.boost(target, { def: -1, spe: 2 }, target);
      if (ta === 'stamina') await this.boost(target, { def: 1 }, target);
      if (ta === 'thermal-exchange' && mv.type === 'fire') await this.boost(target, { atk: 1 }, target);
      if (ta === 'anger-point' && crit && this.volOf(target).stg.atk < 6) { this.volOf(target).stg.atk = 6; await this.abilityMsg(target, `${tname} 的攻擊提升到了最大！`); }
      const crossed = hpBefore * 2 > max && target.hp * 2 <= max;
      if (crossed && ta === 'berserk') await this.boost(target, { spa: 1 }, target);
      if (crossed && ta === 'anger-shell') await this.boost(target, { atk: 1, spa: 1, spe: 1, def: -1, spd: -1 }, target);
      // 危險迴避、躍躍欲逃：招式結束後退場
      if (crossed && (ta === 'emergency-exit' || ta === 'wimp-out')) this.volOf(target).emergencyExit = true;
      // 變色：變成打中自己的招式的屬性
      if (ta === 'color-change' && mv.type && TYPES[mv.type] && this.typesOf(target).join() !== mv.type) { this.volOf(target).types = [mv.type]; await this.abilityMsg(target, `${tname} 變成了${TYPES[mv.type].n}屬性！`); }
      if (ta === 'electromorphosis' || (ta === 'wind-power' && mv.flags.wind)) { this.volOf(target).charge = true; await this.abilityMsg(target, `${tname} 開始充電了！`); }
      if (ta === 'steam-engine' && (mv.type === 'fire' || mv.type === 'water')) await this.boost(target, { spe: 6 }, target);
      if (ta === 'water-compaction' && mv.type === 'water') await this.boost(target, { def: 2 }, target);
      await this.checkBerry(target);
    }
    if (dmg > 0) {
      // 幻覺：受到傷害後現出原形
      const vt = this.volOf(target);
      if (vt.illusion && !vt.illusionBroken) { vt.illusionBroken = true; this.refreshSprite(target); await this.msg(`${this.label(target)} 的幻覺解除了！`); }
      // 棉絮：降低其他寶可夢的速度；吐沙：颳起沙暴；掉出種子：長出青草場地；毒滿地：在對手腳下撒毒菱
      if (ta === 'cotton-down') { await this.abilityMsg(target, '棉絮飛散了！'); for (const o of this.activeMons()) if (o !== target) await this.boost(o, { spe: -1 }, target, true); }
      if (ta === 'sand-spit' && this.field.weather !== 'sandstorm') { this.field.weather = 'sandstorm'; this.field.weatherT = this.itm(target) === 'smooth-rock' ? 8 : 5; await this.abilityMsg(target, '開始颳沙暴了！'); }
      if (ta === 'seed-sower' && this.field.terrain !== 'grassyterrain') { this.field.terrain = 'grassyterrain'; this.field.terrainT = this.itm(target) === 'terrain-extender' ? 8 : 5; await this.abilityMsg(target, '腳下青草如茵！'); }
      if (ta === 'toxic-debris' && mv.cat === 'Physical') { const sd = this.sides[this.sideKey(user)]; if (sd.toxicspikes < 2) { sd.toxicspikes++; await this.abilityMsg(target, '對手的腳下散落著毒菱！'); } }
      // 一口飛彈：受到攻擊時把叼著的獵物吐向對手
      if (ta === 'gulp-missile' && target.sp === 845 && (target.form === 'cramorant-gulping' || target.form === 'cramorant-gorging') && user.hp > 0) {
        const pika = target.form === 'cramorant-gorging';
        await this.setForm(target, this.baseForm(target));
        if (this.ab(user) !== 'magic-guard') { await this.hurt(user, Math.max(1, Math.floor(Mon.maxHp(user) / 4))); await this.abilityMsg(target, `${uname} 受到了傷害！`); }
        if (pika) await this.setStatus(user, 'par', target, true); else await this.boost(user, { def: -1 }, target, true);
      }
    }
    // 飛出的內在物：倒下時給對手和失去的體力相同的傷害
    if (target.hp <= 0 && ta === 'innards-out' && user.hp > 0 && this.ab(user) !== 'magic-guard') {
      await this.hurt(user, Math.min(user.hp, hpBefore)); await this.abilityMsg(target, `${uname} 受到了傷害！`);
    }
    if (target.hp <= 0 && contact && ta === 'aftermath' && user.hp > 0 && this.ab(user) !== 'magic-guard') {
      await this.hurt(user, Math.max(1, Math.floor(Mon.maxHp(user) / 4))); await this.abilityMsg(target, `${uname} 受到了傷害！`);
    }
    if (!contact || user.hp <= 0) return;
    const guard = this.ab(user) === 'magic-guard';
    if ((ta === 'rough-skin' || ta === 'iron-barbs') && !guard) { await this.hurt(user, Math.max(1, Math.floor(Mon.maxHp(user) / 8))); await this.abilityMsg(target, `${uname} 受到了傷害！`); }
    if (ti === 'rocky-helmet' && !guard && user.hp > 0) { await this.hurt(user, Math.max(1, Math.floor(Mon.maxHp(user) / 6))); await this.msg(`${uname} 受到了凸凸頭盔的傷害！`); }
    if (user.hp <= 0) return;
    if (U.rand() < .3) {
      if (ta === 'static') await this.setStatus(user, 'par', target, true);
      if (ta === 'flame-body') await this.setStatus(user, 'brn', target, true);
      if (ta === 'poison-point') await this.setStatus(user, 'psn', target, true);
      if (ta === 'cute-charm') await this.addVolatile(user, 'attract', target, mv, true);
      if (ta === 'effect-spore' && !this.typesOf(user).includes('grass') && this.ab(user) !== 'overcoat' && this.itm(user) !== 'safety-goggles') {
        await this.setStatus(user, U.pick(['slp', 'par', 'psn']), target, true);
      }
    }
    if (ta === 'gooey' || ta === 'tangling-hair') await this.boost(user, { spe: -1 }, target, true);
    // 木乃伊、甩不掉的氣味：把對手的特性變成自己的特性；遊魂：和對手交換特性
    const uAb = user.ability;
    if ((ta === 'mummy' || ta === 'lingering-aroma') && uAb !== ta && !FIXED_AB.has(uAb)) {
      this.keep(user, 'ability'); user.ability = ta; await this.abilityMsg(target, `${uname} 的特性變成了${Abil.name(ta)}！`);
    }
    if (ta === 'wandering-spirit' && !FIXED_AB.has(uAb) && !NO_COPY_AB.has(uAb) && target.hp > 0) {
      this.keep(user, 'ability'); this.keep(target, 'ability');
      await this.abilityMsg(target, `和 ${uname} 交換了特性！`);
      [user.ability, target.ability] = [target.ability, uAb];
    }
    // 滅亡之軀：被接觸時雙方 3 回合後倒下
    if (ta === 'perish-body' && !this.volOf(user).perish) {
      this.volOf(user).perish = 4; if (!this.volOf(target).perish && target.hp > 0) this.volOf(target).perish = 4;
      await this.abilityMsg(target, '雙方都會在 3 回合後倒下！');
    }
    // 順手牽羊：被接觸時搶走對手的道具
    if (ta === 'pickpocket' && target.hp > 0 && !target.item && this.itm(user) && this.ab(user) !== 'sticky-hold') {
      const it = await this.moveItem(user, target, null);
      await this.abilityMsg(target, `搶走了 ${uname} 的${Held.name(it)}！`);
    }
    if (ua === 'poison-touch' && target.hp > 0 && U.rand() < .3) await this.setStatus(target, 'psn', user, true);
  },
  // 樹果：HP 低於一半時回復
  async checkBerry(m) {
    if (!m || m.hp <= 0) return;
    const it = this.itm(m), max = Mon.maxHp(m);
    if (!['sitrus-berry', 'oran-berry'].includes(it) || m.hp * 2 > max || this.unnerved(m)) return;
    await this.consume(m, `${this.label(m)} 吃掉了{i}，回復了體力！`);
    await this.berryEffect(m, it);
  },
  // 異常狀態樹果、木子果
  async checkStatusBerry(m) {
    const it = this.itm(m);
    if (!it || !m.st || this.unnerved(m)) return;
    if (it === 'lum-berry' || (STATUS_BERRY[it] || []).includes(m.st)) {
      await this.consume(m, `${this.label(m)} 吃掉了{i}！`);
      await this.berryEffect(m, it);
    }
  },

  // 固定傷害；null 表示一般計算，false 表示失敗
  fixedDamage(user, target, mv) {
    const vU = this.volOf(user);
    if (mv.ohko) return target.hp;
    if (mv.damage === 'level') return user.lv;
    if (typeof mv.damage === 'number') return mv.damage;
    switch (mv.id) {
      case 'superfang': case 'naturesmadness': case 'ruination': return Math.max(1, Math.floor(target.hp / 2));
      case 'psywave': return Math.max(1, Math.floor(user.lv * U.ri(50, 150) / 100));
      case 'endeavor': return target.hp > user.hp ? target.hp - user.hp : false;
      case 'finalgambit': return user.hp;
      case 'counter': case 'mirrorcoat': case 'metalburst': case 'comeuppance': {
        const want = mv.id === 'counter' ? 'Physical' : mv.id === 'mirrorcoat' ? 'Special' : null;
        const hit = [...vU.hitBy].reverse().find(h => h.by !== this.sideKey(user) && (!want || h.cat === want));
        if (!hit || !hit.dmg) return false;
        return Math.max(1, Math.floor(hit.dmg * (mv.id === 'counter' || mv.id === 'mirrorcoat' ? 2 : 1.5)));
      }
    }
    return null;
  },

  // Showdown getDamage（單打）
  calcDamage(user, target, vU, vT, mv, eff, bp) {
    const st = Mon.stats(target);
    // 太晶爆發：太晶化時攻擊比特攻高就變成物理招式
    const phys = mv.id === 'terablast' && this.isTera(user) ? Mon.stats(user)[1] > Mon.stats(user)[3] : mv.cat === 'Physical';
    const ua = this.ab(user), ta = this.ab(target), ui = this.itm(user), ti = this.itm(target);
    const w = this.wx(), t = this.field.terrain;
    const contact = mv.flags.contact && ui !== 'punching-glove' && ua !== 'long-reach';
    // 會心
    let critStage = (mv.critRatio ? mv.critRatio - 1 : 0) + (vU.focus || 0) + (ua === 'super-luck' ? 1 : 0) + (ui === 'scope-lens' || ui === 'razor-claw' ? 1 : 0);
    let crit = !!mv.willCrit || vU.laserFocus > 0 || (ua === 'merciless' && (target.st === 'psn' || target.st === 'tox')) || U.rand() < [1 / 24, 1 / 8, 1 / 2, 1][Math.min(3, critStage)];
    if (ta === 'battle-armor' || ta === 'shell-armor') crit = false;
    if (vU.laserFocus > 0) vU.laserFocus = 0;
    // 威力修正（Showdown onBasePower）
    let bpMod = 1;
    if (ua === 'technician' && bp <= 60) bpMod *= 1.5;
    if (ua === 'iron-fist' && mv.flags.punch) bpMod *= 1.2;
    if (ua === 'strong-jaw' && mv.flags.bite) bpMod *= 1.5;
    if (ua === 'mega-launcher' && mv.flags.pulse) bpMod *= 1.5;
    if (ua === 'tough-claws' && contact) bpMod *= 1.3;
    if (ua === 'sharpness' && mv.flags.slicing) bpMod *= 1.5;
    if (ua === 'reckless' && (mv.recoil || mv.hasCrashDamage)) bpMod *= 1.2;
    if (ua === 'sheer-force' && (mv.secondary || mv.secondaries)) bpMod *= 1.3;
    if (ua === 'sand-force' && w === 'sandstorm' && ['rock', 'ground', 'steel'].includes(mv.type)) bpMod *= 1.3;
    if (ua === 'analytic' && vT.movedThisTurn) bpMod *= 1.3;
    if (ua === 'punk-rock' && mv.flags.sound) bpMod *= 1.3;
    if (ua === 'steelworker' && mv.type === 'steel') bpMod *= 1.5;
    if (ua === 'transistor' && mv.type === 'electric') bpMod *= 1.3;
    if (ua === 'dragons-maw' && mv.type === 'dragon') bpMod *= 1.5;
    if (ua === 'rocky-payload' && mv.type === 'rock') bpMod *= 1.5;
    if (['aerilate', 'pixilate', 'refrigerate', 'galvanize'].includes(ua) && MOVES[mv.num] && MOVES[mv.num].t === 'normal') bpMod *= 1.2;
    if (ua === 'normalize') bpMod *= 1.2;
    if (ua === 'toxic-boost' && phys && (user.st === 'psn' || user.st === 'tox')) bpMod *= 1.5;
    if (ua === 'flare-boost' && !phys && user.st === 'brn') bpMod *= 1.5;
    if (ua === 'stakeout' && vT.turnsOut === 0) bpMod *= 2;
    if (ua === 'supreme-overlord') bpMod *= 1 + .1 * Math.min(5, this.sides[this.sideKey(user)].fainted);
    if (TYPE_ITEM[ui] === mv.type) bpMod *= 1.2;
    if (ui === 'muscle-band' && phys) bpMod *= 1.1;
    if (ui === 'wise-glasses' && !phys) bpMod *= 1.1;
    if (ui === 'punching-glove' && mv.flags.punch) bpMod *= 1.1;
    if (vU.flashFire && mv.type === 'fire') bpMod *= 1.5;
    if (ta === 'dry-skin' && mv.type === 'fire') bpMod *= 1.25;
    // 場地
    if (this.grounded(user) && ((t === 'electricterrain' && mv.type === 'electric') || (t === 'grassyterrain' && mv.type === 'grass') || (t === 'psychicterrain' && mv.type === 'psychic'))) bpMod *= 1.3;
    if (t === 'mistyterrain' && mv.type === 'dragon' && this.grounded(target)) bpMod *= .5;
    if (t === 'grassyterrain' && ['earthquake', 'bulldoze', 'magnitude'].includes(mv.id)) bpMod *= .5;
    if (vU.charge && mv.type === 'electric') { bpMod *= 2; vU.charge = false; }
    // 暗黑氣場、妖精氣場（氣場破壞反轉）
    const on = this.activeMons ? this.activeMons() : [user, target];
    const aura = { dark: 'dark-aura', fairy: 'fairy-aura' }[mv.type];
    if (aura && on.some(m => this.ab(m) === aura)) bpMod *= on.some(m => this.ab(m) === 'aura-break') ? 3072 / 4096 : 5448 / 4096;
    // 玩水、玩泥巴：火屬性、電屬性招式的威力變成 1/3
    if (this.field.waterSport && mv.type === 'fire') bpMod *= 1352 / 4096;
    if (this.field.mudSport && mv.type === 'electric') bpMod *= 1352 / 4096;
    bp = Math.max(1, Math.floor(bp * bpMod));

    // 攻擊與防禦能力（純樸無視對方的能力等級）
    const atkMon = mv.overrideOffensivePokemon === 'target' ? target : user;
    const atkV = atkMon === user ? vU : vT;
    const atkStat = mv.overrideOffensiveStat === 'def' ? 'def' : phys ? 'atk' : 'spa';
    const defStat = mv.overrideDefensiveStat === 'def' ? 'def' : phys ? 'def' : 'spd';
    const IDX = { atk: 1, def: 2, spa: 3, spd: 4 };
    let aS = ta === 'unaware' ? 0 : atkV.stg[atkStat];
    let dS = mv.ignoreDefensive || ua === 'unaware' ? 0 : vT.stg[defStat];
    if (crit) { aS = Math.max(0, aS); dS = Math.min(0, dS); }
    let A = Math.floor(Mon.stats(atkMon)[IDX[atkStat]] * boostMul(aS));
    // 奇妙空間：防禦與特防的能力值互換（能力等級不換）
    const dIdx = this.field.wonderRoom ? { def: 4, spd: 2 }[defStat] : IDX[defStat];
    let D = Math.floor(st[dIdx] * boostMul(dS));
    const lowHp = user.hp * 3 <= Mon.maxHp(user);
    let aMod = 1;
    if (phys && (ua === 'huge-power' || ua === 'pure-power')) aMod *= 2;
    if (phys && (ua === 'hustle' || ua === 'gorilla-tactics')) aMod *= 1.5;
    if (phys && ua === 'guts' && user.st) aMod *= 1.5;
    if (lowHp && ({ blaze: 'fire', torrent: 'water', overgrow: 'grass', swarm: 'bug' }[ua] === mv.type)) aMod *= 1.5;
    if (!phys && ua === 'solar-power' && w === 'sunnyday') aMod *= 1.5;
    if (ua === 'defeatist' && user.hp * 2 <= Mon.maxHp(user)) aMod *= .5;
    if (phys && ua === 'slow-start' && vU.turnsOut < 5) aMod *= .5;
    // 災禍之簡、災禍之鼎：降低其他寶可夢的攻擊、特攻
    if (on.some(m => m !== atkMon && this.ab(m) === (phys ? 'tablets-of-ruin' : 'vessel-of-ruin')) && this.ab(atkMon) !== (phys ? 'tablets-of-ruin' : 'vessel-of-ruin')) aMod *= .75;
    if (ua === 'water-bubble' && mv.type === 'water') aMod *= 2;
    if (!phys && ua === 'hadron-engine' && t === 'electricterrain') aMod *= 5461 / 4096;
    if (phys && ua === 'orichalcum-pulse' && w === 'sunnyday') aMod *= 5461 / 4096;
    if (phys && ui === 'choice-band') aMod *= 1.5;
    if (!phys && ui === 'choice-specs') aMod *= 1.5;
    if (ta === 'thick-fat' && (mv.type === 'fire' || mv.type === 'ice')) aMod *= .5;
    if ((ta === 'water-bubble' || ta === 'heatproof') && mv.type === 'fire') aMod *= .5;
    if (ta === 'purifying-salt' && mv.type === 'ghost') aMod *= .5;
    if (this.paradoxStat(atkMon) === atkStat) aMod *= 1.3;
    // 鬥爭心：同性別威力提高、異性別降低
    if (ua === 'rivalry' && user.gender && target.gender) aMod *= user.gender === target.gender ? 1.25 : .75;
    A = Math.floor(A * aMod);
    let dMod = 1;
    if (this.paradoxStat(target) === defStat) dMod *= 1.3;
    if (defStat === 'def' && ta === 'fur-coat') dMod *= 2;
    // 災禍之劍、災禍之玉：降低其他寶可夢的防禦、特防
    const ruinD = defStat === 'def' ? 'sword-of-ruin' : 'beads-of-ruin';
    if (on.some(m => m !== target && this.ab(m) === ruinD) && this.ab(target) !== ruinD) dMod *= .75;
    if (defStat === 'def' && ta === 'marvel-scale' && target.st) dMod *= 1.5;
    if (defStat === 'def' && ta === 'grass-pelt' && t === 'grassyterrain') dMod *= 1.5;
    if (ti === 'eviolite' && (POKEDEX[target.sp].ev || []).length) dMod *= 1.5;
    if (defStat === 'spd' && ti === 'assault-vest') dMod *= 1.5;
    if (w === 'sandstorm' && this.typesOf(target).includes('rock') && defStat === 'spd') dMod *= 1.5;
    if ((w === 'snowscape' || w === 'hail') && this.typesOf(target).includes('ice') && defStat === 'def') dMod *= 1.5;
    D = Math.floor(D * dMod);

    let base = Math.floor(Math.floor(Math.floor(2 * user.lv / 5 + 2) * bp * A / Math.max(1, D)) / 50) + 2;
    // 天氣
    if (w === 'sunnyday') { if (mv.type === 'fire') base = Math.floor(base * 1.5); if (mv.type === 'water' && mv.id !== 'hydrosteam') base = Math.floor(base / 2); }
    if (w === 'raindance') { if (mv.type === 'water') base = Math.floor(base * 1.5); if (mv.type === 'fire') base = Math.floor(base / 2); }
    if (crit) base = Math.floor(base * (ua === 'sniper' ? 2.25 : 1.5));
    base = Math.floor(base * (100 - U.ri(0, 15)) / 100);
    base = Math.floor(base * this.stabMod(user, mv.type));
    base = Math.floor(base * eff);
    if (phys && user.st === 'brn' && mv.id !== 'facade' && ua !== 'guts') base = Math.floor(base / 2);
    // 最終修正（穿透無視牆壁）
    const sd = this.sides[this.sideKey(target)];
    if (!crit && ua !== 'infiltrator' && !['brickbreak', 'psychicfangs', 'ragingbull'].includes(mv.id) && (sd.auroraveil || (phys ? sd.reflect : sd.lightscreen))) base = (this.activePerHalf || 1) > 1 ? Math.floor(base * 2732 / 4096) : Math.floor(base / 2);
    // Z 招式打在守住上：只受到 1/4 傷害
    if (mv.isZ && mv.zHitProtect) base = Math.floor(base / 4);
    let fMod = 1;
    if (ua === 'tinted-lens' && eff < 1) fMod *= 2;
    if (['filter', 'solid-rock', 'prism-armor'].includes(ta) && eff > 1) fMod *= .75;
    if ((ta === 'multiscale' || ta === 'shadow-shield') && target.hp === Mon.maxHp(target)) fMod *= .5;
    if (ta === 'fluffy') { if (contact) fMod *= .5; if (mv.type === 'fire') fMod *= 2; }
    if (ta === 'ice-scales' && !phys) fMod *= .5;
    if (ta === 'punk-rock' && mv.flags.sound) fMod *= .5;
    if (ui === 'expert-belt' && eff > 1) fMod *= 1.2;
    if (ui === 'life-orb' && !this._futureSrcOut) fMod *= 1.3;
    if (ui === 'metronome') fMod *= 1 + Math.min(1, .2 * (vU.metronomeN || 0));
    base = Math.floor(base * fMod);
    if (vT.minimize && mv.flags.minimize) base *= 2;
    if (vT.glaiveRush) base *= 2; // 巨劍突擊之後受到的傷害加倍
    if ((mv.id === 'collisioncourse' || mv.id === 'electrodrift') && eff > 1) base = Math.floor(base * 5461 / 4096);
    if (vT.semi === 'dig' && ['earthquake', 'magnitude'].includes(mv.id)) base *= 2;
    if (vT.semi === 'dive' && ['surf', 'whirlpool'].includes(mv.id)) base *= 2;
    return { dmg: Math.max(1, base), crit };
  },

  // ---------- 變化招式 ----------
  async statusMove(user, target, mv, act) {
    const vU = this.volOf(user), vT = this.volOf(target);
    const name = this.label(user), tname = this.label(target);
    const sideU = this.sides[this.sideKey(user)], sideT = this.sides[this.sideKey(target)];
    const fail = async () => { await this.msg('但是失敗了！'); return false; };
    const selfMove = mv.target === 'self' || mv.target === 'allySide' || mv.target === 'allyTeam' || mv.target === 'adjacentAllyOrSelf' || mv.target === 'allies';
    if (mv.support === 'none') { await this.msg('但是什麼事都沒有發生。（這個招式尚未支援）'); return false; }
    let did = false;

    // 專屬效果
    switch (mv.id) {
      case 'rest': {
        const max = Mon.maxHp(user);
        if (user.hp >= max || user.st === 'slp' || (this.field.terrain === 'electricterrain' && this.grounded(user)) || this.activeMons().some(m => this.volOf(m).uproar > 0) || ['insomnia', 'vital-spirit'].includes(this.ab(user))) return fail();
        user.hp = max; user.st = 'slp'; user.slpT = 3; this.draw();
        await this.statusFx(user, 'slp');
        await this.msg(`${name} 睡著了，體力完全恢復了！`);
        return true;
      }
      case 'bellydrum': {
        const max = Mon.maxHp(user);
        if (user.hp <= Math.floor(max / 2) || vU.stg.atk >= 6) return fail();
        await this.hurt(user, Math.floor(max / 2));
        vU.stg.atk = 6;
        await this.statFx(user, true);
        await this.msg(`${name} 削減了體力，攻擊提升到了最大！`);
        return true;
      }
      case 'haze': for (const v of [vU, vT]) Object.keys(v.stg).forEach(k => { v.stg[k] = 0; }); await this.msg('所有能力變化都恢復原狀了！'); return true;
      case 'painsplit': {
        const avg = Math.floor((user.hp + target.hp) / 2);
        user.hp = Math.min(Mon.maxHp(user), avg); target.hp = Math.min(Mon.maxHp(target), avg); this.draw();
        await this.msg('雙方平分了體力！'); return true;
      }
      case 'perishsong': for (const v of [vU, vT]) if (!v.perish) v.perish = 4; await this.msg('聽了滅亡之歌的寶可夢會在 3 回合後倒下！'); return true;
      case 'psychup': vU.stg = { ...vT.stg }; await this.msg(`${name} 複製了 ${tname} 的能力變化！`); return true;
      case 'topsyturvy': Object.keys(vT.stg).forEach(k => { vT.stg[k] = -vT.stg[k]; }); await this.msg(`${tname} 的能力變化顛倒了！`); return true;
      case 'powerswap': for (const k of ['atk', 'spa']) [vU.stg[k], vT.stg[k]] = [vT.stg[k], vU.stg[k]]; await this.msg('互換了攻擊與特攻的能力變化！'); return true;
      case 'guardswap': for (const k of ['def', 'spd']) [vU.stg[k], vT.stg[k]] = [vT.stg[k], vU.stg[k]]; await this.msg('互換了防禦與特防的能力變化！'); return true;
      case 'heartswap': [vU.stg, vT.stg] = [vT.stg, vU.stg]; await this.msg('互換了所有能力變化！'); return true;
      case 'speedswap': await this.msg('互換了速度！（以能力變化代替）'); [vU.stg.spe, vT.stg.spe] = [vT.stg.spe, vU.stg.spe]; return true;
      case 'defog': {
        sideT.reflect = sideT.lightscreen = sideT.auroraveil = sideT.safeguard = sideT.mist = 0;
        for (const s of [sideU, sideT]) { s.spikes = 0; s.toxicspikes = 0; s.stealthrock = false; s.stickyweb = false; }
        if (this.field.terrain) { this.field.terrain = null; }
        await this.boost(target, { evasion: -1 }, user);
        await this.msg('吹散了場上的障礙！'); return true;
      }
      case 'splash': case 'celebrate': case 'holdhands': case 'happyhour': await this.msg('但是什麼事都沒有發生。'); return true;
      case 'meanlook': case 'block': if (vT.trapped) return fail(); vT.trapped = true; await this.msg(`${tname} 無法逃走了！`); return true;
      case 'lockon': case 'mindreader': vU.lockOn = 2; await this.msg(`${name} 鎖定了 ${tname}！`); return true;
      case 'moonlight': case 'morningsun': case 'synthesis': case 'shoreup': {
        const max = Mon.maxHp(user);
        if (user.hp >= max) return fail();
        const w = this.field.weather;
        let r = .5;
        if (mv.id === 'shoreup') r = w === 'sandstorm' ? 2 / 3 : .5;
        else if (w === 'sunnyday') r = 2 / 3;
        else if (w) r = .25;
        await this.healMon(user, Math.round(max * r));
        await this.msg(`${name} 的體力回復了！`); return true;
      }
      case 'strengthsap': {
        if (vT.stg.atk <= -6) return fail();
        const amt = Math.floor(Mon.stats(target)[1] * boostMul(vT.stg.atk));
        await this.boost(target, { atk: -1 }, user);
        await this.healMon(user, amt);
        await this.msg(`${name} 吸取了力量！`); return true;
      }
      case 'aromatherapy': case 'healbell': case 'junglehealing': case 'lunarblessing': {
        const party = user === this.me ? G.party : this.foeParty;
        party.forEach(m => { m.st = null; });
        if (mv.id === 'junglehealing' || mv.id === 'lunarblessing') await this.healMon(user, Math.floor(Mon.maxHp(user) / 4));
        this.draw(); await this.msg('同伴的異常狀態都治好了！'); return true;
      }
      case 'refresh': if (!['brn', 'par', 'psn', 'tox'].includes(user.st)) return fail(); user.st = null; this.draw(); await this.msg(`${name} 恢復了健康！`); return true;
      case 'purify': if (!target.st) return fail(); target.st = null; await this.healMon(user, Math.floor(Mon.maxHp(user) / 2)); this.draw(); return true;
      case 'takeheart': user.st = null; this.draw(); await this.boost(user, { spa: 1, spd: 1 }, user); return true;
      case 'soak': vT.types = ['water']; await this.msg(`${tname} 變成了水屬性！`); return true;
      case 'trickortreat': vT.types = [...new Set([...this.typesOf(target), 'ghost'])]; await this.msg(`${tname} 增加了幽靈屬性！`); return true;
      case 'forestscurse': vT.types = [...new Set([...this.typesOf(target), 'grass'])]; await this.msg(`${tname} 增加了草屬性！`); return true;
      case 'conversion': vU.types = [md(user.moves[0].id).type]; await this.msg(`${name} 的屬性改變了！`); return true;
      case 'reflecttype': vU.types = [...this.typesOf(target)]; await this.msg(`${name} 變成了和 ${tname} 相同的屬性！`); return true;
      case 'spite': {
        const last = vT.lastMove && target.moves.find(s => s.id === vT.lastMove);
        if (!last || last.pp <= 0) return fail();
        last.pp = Math.max(0, last.pp - 4); await this.msg(`減少了 ${tname} 的 PP！`); return true;
      }
      case 'acupressure': {
        const ks = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'].filter(k => vU.stg[STAGE_OF[k]] < 6);
        if (!ks.length) return fail();
        await this.boost(user, { [U.pick(ks)]: 2 }, user); return true;
      }
      case 'tidyup': for (const s of [sideU, sideT]) { s.spikes = 0; s.toxicspikes = 0; s.stealthrock = false; s.stickyweb = false; } vU.sub = 0; vT.sub = 0;
        await this.boost(user, { atk: 1, spe: 1 }, user); return true;
      case 'venomdrench': if (target.st !== 'psn' && target.st !== 'tox') return fail(); await this.boost(target, { atk: -1, spa: -1, spe: -1 }, user); return true;
      case 'floralhealing': case 'healpulse': await this.healMon(target, Math.floor(Mon.maxHp(target) / 2)); await this.msg(`${tname} 的體力回復了！`); return true;
      case 'memento': await this.boost(target, { atk: -2, spa: -2 }, user); await this.selfFaint(user); return true;
      case 'healingwish': case 'lunardance': {
        const party = user === this.me ? G.party : this.foeParty;
        if (!party.some(m => m !== user && m.hp > 0)) return fail();
        await this.selfFaint(user); this.pendingHealingWish = { side: this.sideKey(user), lunar: mv.id === 'lunardance' }; return true;
      }
      // ---------- 複製、變身 ----------
      case 'mimic': case 'sketch': {
        const last = vT.lastMove && md(vT.lastMove);
        const i = user.moves.findIndex(s => s === act.slot) >= 0 ? user.moves.indexOf(act.slot) : user.moves.findIndex(s => s.id === mv.num);
        if (!last || i < 0 || last.id === 'struggle' || last.flags.failmimic || (mv.id === 'sketch' && last.flags.nosketch) || user.moves.some(s => s.id === vT.lastMove)) return fail();
        // 模仿：在場期間暫時學會；寫生：永久學會
        user.moves[i] = mv.id === 'mimic' ? { id: vT.lastMove, pp: last.pp, mimicOf: user.moves[i] } : { id: vT.lastMove, pp: last.pp };
        await this.msg(`${name} 學會了 ${last.n}！`); return true;
      }
      case 'transform':
        if (vU.transformed || vT.transformed || vT.sub || this.illusionOf(target) || target === user) return fail();
        await this.transformInto(user, target); return true;
      case 'conversion2': {
        const last = vT.lastMove && md(vT.lastMove);
        if (!last || !CHART[last.type]) return fail();
        const opts = Object.keys(CHART).filter(t => TYPES[t] && t !== 'stellar' && typeEff(last.type, [t]) < 1 && !this.typesOf(user).includes(t));
        if (!opts.length) return fail();
        const t = U.pick(opts);
        vU.types = [t]; await this.msg(`${name} 變成了${TYPES[t].n}屬性！`); return true;
      }
      // ---------- 道具交換 ----------
      case 'trick': case 'switcheroo': {
        const a = user.item || null, b = target.item || null;
        const locked = x => x && ((window.MEGA_STONES && MEGA_STONES[x]) || x.endsWith('-z') || PLATE_TYPE[x] || MEMORY_TYPE[x]);
        if ((!a && !b) || locked(a) || locked(b) || this.ab(target) === 'sticky-hold') return fail();
        this.keep(user, 'item'); this.keep(target, 'item');
        user.item = b; target.item = a;
        for (const [m, v] of [[user, vU], [target, vT]]) { v.choiceLock = null; if (!m.item && m.ability === 'unburden') v.unburden = true; }
        await this.msg(`${name} 和 ${tname} 交換了道具！`);
        if (b) await this.msg(`${name} 得到了${Held.name(b)}！`);
        if (a) await this.msg(`${tname} 得到了${Held.name(a)}！`);
        return true;
      }
      // ---------- 特性 ----------
      case 'roleplay': {
        const ta = target.ability;
        if (!ta || ta === user.ability || NO_COPY_AB.has(ta) || FIXED_AB.has(user.ability)) return fail();
        this.keep(user, 'ability'); user.ability = ta;
        await this.msg(`${name} 複製了 ${tname} 的${Abil.name(ta)}！`);
        await this.abilityStart(user); return true;
      }
      case 'skillswap': {
        const a = user.ability, b = target.ability;
        const bad = x => !x || FIXED_AB.has(x) || ['wonder-guard', 'illusion', 'neutralizing-gas', 'hunger-switch', 'zen-mode'].includes(x);
        if (bad(a) || bad(b)) return fail();
        this.keep(user, 'ability'); this.keep(target, 'ability');
        user.ability = b; target.ability = a;
        await this.msg(`${name} 和 ${tname} 交換了特性！`);
        if (this.sideKey(user) !== this.sideKey(target)) { await this.abilityStart(user); await this.abilityStart(target); }
        return true;
      }
      case 'worryseed': case 'simplebeam': {
        const nb = mv.id === 'worryseed' ? 'insomnia' : 'simple';
        if (target.ability === nb || FIXED_AB.has(target.ability) || target.ability === 'truant') return fail();
        this.keep(target, 'ability'); target.ability = nb; vT.gastro = false;
        await this.msg(`${tname} 的特性變成了${Abil.name(nb)}！`);
        if (nb === 'insomnia' && target.st === 'slp') { target.st = null; this.draw(); await this.msg(`${tname} 醒過來了！`); }
        return true;
      }
      case 'entrainment': {
        const a = user.ability;
        if (!a || a === target.ability || NO_COPY_AB.has(a) || FIXED_AB.has(target.ability) || target.ability === 'truant') return fail();
        this.keep(target, 'ability'); target.ability = a; vT.gastro = false;
        await this.msg(`${tname} 的特性變成了${Abil.name(a)}！`);
        await this.abilityStart(target); return true;
      }
      case 'doodle': {
        const ta = target.ability;
        if (!ta || NO_COPY_AB.has(ta)) return fail();
        let any = false;
        for (const m of [user, this.allyOf ? this.allyOf(user) : null]) {
          if (!m || m.hp <= 0 || m.ability === ta || FIXED_AB.has(m.ability)) continue;
          this.keep(m, 'ability'); m.ability = ta; any = true;
          await this.msg(`${this.label(m)} 的特性變成了${Abil.name(ta)}！`);
          await this.abilityStart(m);
        }
        return any || fail();
      }
      // ---------- 能力值 ----------
      case 'guardsplit': case 'powersplit': {
        const su = Mon.stats(user), st = Mon.stats(target);
        for (const k of mv.id === 'guardsplit' ? [2, 4] : [1, 3]) { const avg = Math.floor((su[k] + st[k]) / 2); this.setStat(user, k, avg); this.setStat(target, k, avg); }
        await this.msg(mv.id === 'guardsplit' ? `${name} 和 ${tname} 平分了防守！` : `${name} 和 ${tname} 平分了力量！`); return true;
      }
      // ---------- 復活、回收、吃樹果 ----------
      case 'revivalblessing': {
        const mine = this.sideKey(user) === 'me', party = mine ? G.party : this.foeParty;
        const dead = party.filter(m => m.hp <= 0);
        if (!dead.length) return fail();
        let m = dead[0];
        if (mine && dead.length > 1) m = dead[Math.max(0, await UI.choose(dead.map(x => Mon.name(x)), { prompt: '要讓哪一隻寶可夢復活？', cancel: false }))];
        m.hp = Math.max(1, Math.floor(Mon.maxHp(m) / 2)); m.st = null; delete m._fainted;
        this.draw(); await this.msg(`${Mon.name(m)} 復活了！`); return true;
      }
      case 'recycle':
        if (user.item || !vU.usedItem) return fail();
        user.item = vU.usedItem; vU.usedItem = null;
        await this.msg(`${name} 撿回了${Held.name(user.item)}！`); return true;
      case 'stuffcheeks': {
        const it = this.itm(user);
        if (!it || !it.endsWith('-berry') || this.unnerved(user)) return fail();
        const b = await this.consume(user, `${name} 吃掉了{i}！`);
        await this.berryEffect(user, b);
        await this.boost(user, { def: 2 }, user); return true;
      }
      case 'teatime': {
        let any = false;
        for (const m of this.activeMons()) {
          const it = this.itm(m);
          if (!it || !it.endsWith('-berry')) continue;
          any = true;
          const b = await this.consume(m, `${this.label(m)} 吃掉了{i}！`);
          await this.berryEffect(m, b);
        }
        return any || fail();
      }
      // ---------- 蓄力 ----------
      case 'swallow': {
        const n = vU.stockpile || 0, max = Mon.maxHp(user);
        if (!n || user.hp >= max) return fail();
        await this.healMon(user, Math.floor(max * [0, .25, .5, 1][n]));
        await this.msg(`${name} 的體力回復了！`);
        await this.clearStockpile(user); return true;
      }
      // ---------- 屬性、場地 ----------
      case 'magicpowder':
        if (this.typesOf(target).join() === 'psychic') return fail();
        vT.types = ['psychic']; await this.msg(`${tname} 變成了超能力屬性！`); return true;
      case 'courtchange': {
        const A = this.sides.me, B = this.sides.foe;
        for (const k of ['reflect', 'lightscreen', 'auroraveil', 'tailwind', 'mist', 'safeguard', 'spikes', 'toxicspikes', 'stealthrock', 'stickyweb']) [A[k], B[k]] = [B[k], A[k]];
        await this.msg('雙方場地上的效果交換了！'); return true;
      }
      case 'rototiller': case 'flowershield': {
        const ms = this.activeMons().filter(m => this.typesOf(m).includes('grass') && (mv.id === 'flowershield' || this.grounded(m)));
        if (!ms.length) return fail();
        for (const m of ms) await this.boost(m, mv.id === 'rototiller' ? { atk: 1, spa: 1 } : { def: 1 }, user);
        return true;
      }
      case 'gearup': case 'magneticflux': {
        const ms = [user, this.allyOf ? this.allyOf(user) : null].filter(m => m && m.hp > 0 && ['plus', 'minus'].includes(this.ab(m)));
        if (!ms.length) return fail();
        for (const m of ms) await this.boost(m, mv.id === 'gearup' ? { atk: 1, spa: 1 } : { def: 1, spd: 1 }, user);
        return true;
      }
      // ---------- 行動順序、隊友 ----------
      case 'afteryou': case 'quash':
        if (target === user || vT.movedThisTurn || !this.reorder(target, mv.id === 'afteryou' ? 'first' : 'last')) return fail();
        await this.msg(mv.id === 'afteryou' ? `${tname} 接受了對方的好意！` : `${tname} 的行動被延後了！`); return true;
      case 'allyswitch':
        if (!this.swapAlly || !(await this.swapAlly(user))) return fail();
        return true;
      case 'instruct': {
        const id = vT.lastMove, last = id && md(id);
        const slot = last && target.moves.find(s => s.id === id && s.pp > 0);
        if (!slot || target === user || target.hp <= 0 || last.flags.failinstruct || last.flags.charge || last.callsMove || vT.locked || vT.recharge || vT.charging) return fail();
        await this.msg(`${tname} 聽從了 ${name} 的指示！`);
        const foe = this.activeMons().find(o => o.hp > 0 && this.sideKey(o) !== this.sideKey(target));
        if (!foe) return true;
        const restore = this.pairUp(target, foe);
        try { await this.runMove(target, foe, { mv: last, slot, instructed: true }); } finally { restore(); }
        return true;
      }
      case 'helpinghand': return fail(); // 單打沒有隊友（雙打由 DoubleBattle 處理）
      case 'followme': case 'ragepowder': await this.msg(`${name} 成為了注目的焦點！`); return true;
      case 'teleport':
        if (this.wildMon) { await this.msg(`${name} 逃走了！`); this.fled = true; return true; }
        await this.selfSwitchOut(user, mv); return true;
    }

    // 治癒招式
    if (mv.heal) {
      const who = selfMove || mv.target === 'self' ? user : target;
      const max = Mon.maxHp(who);
      if (who.hp >= max) return fail();
      await this.healMon(who, Math.round(max * mv.heal[0] / mv.heal[1]));
      await this.msg(`${this.label(who)} 的體力回復了！`);
      did = true;
    }
    // 天氣、場地、空間
    if (mv.weather) {
      const w = mv.weather === 'RainDance' ? 'raindance' : mv.weather === 'Sandstorm' ? 'sandstorm' : mv.weather;
      if (this.field.weather === w) return fail();
      // 天氣岩石讓天氣持續 8 回合
      const rocks = { raindance: 'damp-rock', sunnyday: 'heat-rock', sandstorm: 'smooth-rock', snowscape: 'icy-rock', hail: 'icy-rock' };
      this.field.weather = w; this.field.weatherT = this.itm(user) === rocks[w] ? 8 : 5;
      await this.msg({ raindance: '開始下雨了！', sunnyday: '日照變強了！', sandstorm: '開始颳沙暴了！', hail: '開始下冰雹了！', snowscape: '開始下雪了！' }[w]);
      did = true;
    }
    if (mv.terrain) {
      if (this.field.terrain === mv.terrain) return fail();
      this.field.terrain = mv.terrain; this.field.terrainT = 5;
      await this.msg({ electricterrain: '腳下電流飛竄！', grassyterrain: '腳下青草如茵！', mistyterrain: '腳下霧氣繚繞！', psychicterrain: '腳下傳來奇妙的感覺！' }[mv.terrain]);
      did = true;
    }
    if (mv.pseudoWeather) {
      if (mv.pseudoWeather === 'trickroom') {
        this.field.trickRoom = this.field.trickRoom ? 0 : 5;
        await this.msg(this.field.trickRoom ? `${name} 扭曲了時空！` : '扭曲的時空恢復原狀了！');
      } else if (mv.pseudoWeather === 'gravity') {
        if (this.field.gravity) return fail();
        this.field.gravity = 5; vU.magnetRise = 0; vT.magnetRise = 0;
        await this.msg('重力變強了！');
      } else if (mv.pseudoWeather === 'magicroom' || mv.pseudoWeather === 'wonderroom') {
        // 魔法空間（道具沒有效果）、奇妙空間（防禦與特防互換）：5 回合，再用一次結束
        const k = mv.pseudoWeather === 'magicroom' ? 'magicRoom' : 'wonderRoom', zh = k === 'magicRoom' ? '魔法空間' : '奇妙空間';
        this.field[k] = this.field[k] ? 0 : 5;
        await this.msg(this.field[k] ? `周圍變成了${zh}！` : `${zh}消失了，恢復原狀了！`);
      } else if (mv.pseudoWeather === 'watersport' || mv.pseudoWeather === 'mudsport') {
        const k = mv.pseudoWeather === 'watersport' ? 'waterSport' : 'mudSport';
        if (this.field[k]) return fail();
        this.field[k] = 5;
        await this.msg(k === 'waterSport' ? '火的威力減弱了！' : '電的威力減弱了！');
      } else if (mv.pseudoWeather === 'fairylock') {
        if (this.field.fairyLock) return fail();
        this.field.fairyLock = 2; await this.msg('下一回合誰都無法逃走了！');
      } else if (mv.pseudoWeather === 'iondeluge') {
        this.field.ionDeluge = true; await this.msg('電漿傾盆而下！');
      } else await this.msg('但是什麼事都沒有發生。');
      did = true;
    }
    // 場地狀態
    if (mv.sideCondition) {
      const sc = mv.sideCondition;
      const hazard = ['spikes', 'toxicspikes', 'stealthrock', 'stickyweb'].includes(sc);
      const side = hazard ? sideT : sideU;
      const zh = { reflect: '反射壁', lightscreen: '光牆', auroraveil: '極光幕', tailwind: '順風', mist: '白霧', safeguard: '神秘守護' }[sc];
      if (sc === 'spikes') { if (side.spikes >= 3) return fail(); side.spikes++; await this.msg('對手的腳下散落著撒菱！'); }
      else if (sc === 'toxicspikes') { if (side.toxicspikes >= 2) return fail(); side.toxicspikes++; await this.msg('對手的腳下散落著毒菱！'); }
      else if (sc === 'stealthrock') { if (side.stealthrock) return fail(); side.stealthrock = true; await this.msg('對手的周圍浮著尖銳的岩石！'); }
      else if (sc === 'stickyweb') { if (side.stickyweb) return fail(); side.stickyweb = true; await this.msg('對手的腳下佈滿了黏黏網！'); }
      else if (['wideguard', 'quickguard', 'craftyshield'].includes(sc)) {
        // 廣域防守、快速防守、戲法防守：這一回合保護自己這一邊；最後行動時失敗
        if (this.isLastMover(user)) return fail();
        side[{ wideguard: 'wideGuard', quickguard: 'quickGuard', craftyshield: 'craftyShield' }[sc]] = true;
        await this.msg(`${{ wideguard: '廣域防守', quickguard: '快速防守', craftyshield: '戲法防守' }[sc]}保護了己方！`);
      }
      else if (zh) {
        if (side[sc]) return fail();
        if (sc === 'auroraveil' && !['hail', 'snowscape'].includes(this.field.weather)) return fail();
        side[sc] = sc === 'tailwind' ? 4 : ['reflect', 'lightscreen', 'auroraveil'].includes(sc) && this.itm(user) === 'light-clay' ? 8 : 5;
        await this.msg(`${name} 張起了${zh}！`);
        // 風力發電：順風吹起時充電
        if (sc === 'tailwind') for (const m of this.activeMons()) if (this.sideKey(m) === this.sideKey(user) && this.ab(m) === 'wind-power') { this.volOf(m).charge = true; await this.abilityMsg(m, `${this.label(m)} 開始充電了！`); }
      } else await this.msg('但是什麼事都沒有發生。');
      did = true;
    }
    if (mv.slotCondition === 'Wish') {
      if (sideU.wish) return fail();
      sideU.wish = { turns: 2, hp: Math.floor(Mon.maxHp(user) / 2) };
      await this.msg(`${name} 許下了願望！`);
      did = true;
    }
    // 揮發狀態
    if (mv.volatileStatus) {
      const who = selfMove ? user : target;
      const r = await this.addVolatile(who, mv.volatileStatus, user, mv);
      if (r === false && !mv.boosts && !mv.status) return false;
      did = true;
    }
    if (mv.self && mv.self.volatileStatus === 'roost') {
      const max = Mon.maxHp(user);
      vU.roost = true;
    }
    // 異常狀態
    if (mv.status) {
      const r = await this.setStatus(target, mv.status, user, false, mv);
      if (!r && !mv.boosts) return false;
      did = true;
    }
    // 能力變化
    if (mv.boosts) {
      const who = selfMove ? user : target;
      if (who !== user && sideT.mist && Object.values(mv.boosts).some(v => v < 0)) { await this.msg(`${tname} 受到白霧的保護！`); return false; }
      const r = await this.boost(who, mv.boosts, user, false);
      if (mv.id === 'swagger' || mv.id === 'flatter') await this.addVolatile(target, 'confusion', user, mv);
      if (!r && !did) return false;
      did = true;
    }
    if (mv.self && mv.self.boosts) { await this.boost(user, mv.self.boosts, user); did = true; }
    if (mv.forceSwitch) { await this.forceOut(target); did = true; }
    if (mv.selfSwitch && user.hp > 0) { await this.selfSwitchOut(user, mv); did = true; }
    if (!did) await this.msg('但是什麼事都沒有發生。');
    return did;
  },

  // ---------- 狀態 ----------
  async setStatus(target, status, source, secondary = false, mv = null) {
    const name = this.label(target);
    const types = this.typesOf(target);
    const fail = async txt => { if (!secondary) await this.msg(txt || `對 ${name} 好像沒有效果……`); return false; };
    if (target.hp <= 0) return false;
    if (target.st) return fail(secondary ? '' : `${name} 已經處於異常狀態了！`);
    const sideT = this.sides[this.sideKey(target)];
    if (sideT.safeguard && source !== target) return fail(`${name} 受到神秘守護的保護！`);
    const grounded = this.grounded(target);
    if (this.field.terrain === 'mistyterrain' && grounded) return fail(`${name} 受到薄霧場地的保護！`);
    if (status === 'slp' && this.field.terrain === 'electricterrain' && grounded) return fail(`${name} 受到電氣場地的保護！`);
    // 吵鬧：場上有寶可夢在吵鬧時不會睡著
    if (status === 'slp' && this.activeMons().some(m => this.volOf(m).uproar > 0)) return fail(`${name} 因為吵鬧無法入睡！`);
    // 花幕：草屬性的自己和隊友不會被對手變成異常狀態
    if (source && source !== target && types.includes('grass') && [target, this.allyOf ? this.allyOf(target) : null].some(x => x && x.hp > 0 && this.ab(x) === 'flower-veil')) return fail(`${name} 受到了花幕的保護！`);
    if (status === 'brn' && types.includes('fire')) return fail();
    if (status === 'par' && types.includes('electric')) return fail();
    // 腐蝕：可以讓毒屬性、鋼屬性中毒
    if ((status === 'psn' || status === 'tox') && (types.includes('poison') || types.includes('steel')) && !(source && this.ab(source) === 'corrosion')) return fail();
    if (status === 'frz' && (types.includes('ice') || this.field.weather === 'sunnyday')) return fail();
    if (status === 'par' && mv && mv.id === 'thunderwave' && types.includes('ground')) return fail();
    // 特性造成的異常狀態免疫
    const a = this.ab(target);
    const immune = {
      immunity: ['psn', 'tox'], limber: ['par'], insomnia: ['slp'], 'vital-spirit': ['slp'], 'sweet-veil': ['slp'], 'water-veil': ['brn'],
      'water-bubble': ['brn'], 'thermal-exchange': ['brn'], 'magma-armor': ['frz'], comatose: ['par', 'slp', 'frz', 'brn', 'psn', 'tox'],
      'purifying-salt': ['par', 'slp', 'frz', 'brn', 'psn', 'tox'],
    }[a];
    // 界限盾殼：流星的樣子不會變成異常狀態
    if ((immune && immune.includes(status)) || (a === 'leaf-guard' && this.wx() === 'sunnyday') || (a === 'shields-down' && target.sp === 774 && target.form !== 'minior-red')) {
      if (!secondary) await this.abilityMsg(target, `${name} 不會陷入異常狀態！`);
      return false;
    }
    target.st = status;
    if (status === 'slp') target.slpT = U.ri(2, 4);
    if (status === 'tox') this.volOf(target).toxN = 0;
    this.draw();
    await this.statusFx(target, status);
    await this.msg(`${name} ${{ par: '麻痺了，可能會無法行動！', slp: '睡著了！', frz: '被凍住了！', brn: '被灼傷了！', psn: '中毒了！', tox: '中了劇毒！' }[status]}`);
    // 同步：把灼傷、麻痺、中毒傳回給對手
    if (a === 'synchronize' && source && source !== target && ['brn', 'par', 'psn', 'tox'].includes(status)) {
      await this.abilityMsg(target, '把異常狀態傳給了對手！');
      await this.setStatus(source, status === 'tox' ? 'tox' : status, target, true);
    }
    // 毒傀儡：讓對手中毒時也會混亂
    if (source && source !== target && (status === 'psn' || status === 'tox') && this.ab(source) === 'poison-puppeteer') await this.addVolatile(target, 'confusion', source, null, true);
    await this.checkStatusBerry(target);
    return true;
  },

  // 舊介面相容
  async inflict(target, vT, mv, secondary) {
    const st = { paralysis: 'par', sleep: 'slp', freeze: 'frz', burn: 'brn', poison: mv.id === 92 ? 'tox' : 'psn' }[mv.ail];
    if (st) return this.setStatus(target, st, null, secondary);
  },

  async addVolatile(target, vs, source, mv, secondary = false) {
    const v = this.volOf(target), name = this.label(target);
    const user = source, vU = this.volOf(source);
    const fail = async () => { if (!secondary) await this.msg('但是失敗了！'); return false; };
    switch (vs) {
      case 'flinch': if (this.ab(target) !== 'inner-focus') v.flinch = true; return true;
      case 'confusion':
        if (v.conf > 0) return fail();
        if (this.field.terrain === 'mistyterrain' && this.grounded(target)) return fail();
        if (this.ab(target) === 'own-tempo') { if (!secondary) await this.abilityMsg(target, `${name} 不會混亂！`); return false; }
        v.conf = U.ri(2, 5); await this.msg(`${name} 混亂了！`);
        if (['persim-berry', 'lum-berry'].includes(this.itm(target))) { await this.consume(target, `${name} 吃掉了{i}！`); v.conf = 0; await this.msg(`${name} 的混亂解除了！`); }
        return true;
      case 'attract':
        if (v.love) return fail();
        if (this.ab(target) === 'oblivious') { if (!secondary) await this.abilityMsg(target, `${name} 不會著迷！`); return false; }
        v.love = true; await this.msg(`${name} 著迷了！`);
        if (this.itm(target) === 'mental-herb') { await this.consume(target, `${name} 用{i}恢復了正常！`); v.love = false; }
        return true;
      case 'leechseed': if (v.seed || this.typesOf(target).includes('grass')) { if (!secondary) await this.msg(`對 ${name} 好像沒有效果……`); return false; }
        v.seed = true; await this.msg(`在 ${name} 身上種下了種子！`); return true;
      case 'partiallytrapped':
        if (v.trap) return true;
        v.trap = this.itm(source) === 'grip-claw' ? 8 : U.ri(5, 6);
        v.trapDiv = this.itm(source) === 'binding-band' ? 6 : 8;
        await this.msg(`${name} 被困住了！`); return true;
      case 'yawn': if (target.st || v.yawn) return fail(); v.yawn = 2; await this.msg(`${name} 變得昏昏欲睡了！`); return true;
      case 'substitute': {
        const max = Mon.maxHp(target);
        if (v.sub || target.hp <= Math.floor(max / 4)) return fail();
        await this.hurt(target, Math.floor(max / 4));
        v.sub = Math.floor(max / 4); await this.msg(`${name} 製造出了替身！`); return true;
      }
      case 'protect': case 'kingsshield': case 'spikyshield': case 'banefulbunker': case 'obstruct': case 'silktrap': case 'burningbulwark': case 'endure': {
        const last = this.isLastMover(target);
        if (last || U.rand() > Math.pow(1 / 3, v.protectCount)) { v.protectCount = 0; return fail(); }
        v.protectCount++;
        if (vs === 'endure') { v.endure = true; await this.msg(`${name} 擺出了挺住的架式！`); }
        else { v.protect = vs; await this.msg(`${name} 擺出了防守的架式！`); }
        return true;
      }
      case 'focusenergy': if (v.focus) return fail(); v.focus = 2; await this.msg(`${name} 變得充滿幹勁！`); return true;
      case 'laserfocus': v.laserFocus = 2; await this.msg(`${name} 磨練了專注力！`); return true;
      case 'taunt':
        if (v.taunt) return fail();
        if (this.ab(target) === 'oblivious') { await this.abilityMsg(target, `${name} 沒有理會挑釁！`); return false; }
        v.taunt = 3; await this.msg(`${name} 被挑釁了！`);
        if (this.itm(target) === 'mental-herb') { await this.consume(target, `${name} 用{i}恢復了正常！`); v.taunt = 0; }
        return true;
      case 'encore': {
        if (v.encore || !v.lastMove || md(v.lastMove).callsMove) return fail();
        v.encore = 3; v.encoreMove = v.lastMove; await this.msg(`${name} 接受了再來一次！`); return true;
      }
      case 'disable': {
        if (v.disable || !v.lastMove) return fail();
        v.disable = 4; v.disableMove = v.lastMove; await this.msg(`${name} 的 ${md(v.lastMove).n} 被封住了！`); return true;
      }
      case 'destinybond': v.destinyBond = true; await this.msg(`${name} 想要和對手同歸於盡！`); return true;
      case 'curse':
        // 非幽靈屬性：攻擊、防禦 +1，速度 −1
        if (!this.typesOf(user).includes('ghost')) { await this.boost(user, { atk: 1, def: 1, spe: -1 }, user); return true; }
        if (v.curse) return fail();
        await this.hurt(user, Math.floor(Mon.maxHp(user) / 2));
        v.curse = true; await this.msg(`${this.label(user)} 削減了體力，詛咒了 ${name}！`); return true;
      case 'ingrain': if (v.ingrain) return fail(); v.ingrain = true; await this.msg(`${name} 紮下了根！`); return true;
      case 'aquaring': if (v.aquaRing) return fail(); v.aquaRing = true; await this.msg(`${name} 被水環包圍了！`); return true;
      case 'magnetrise': if (v.magnetRise || v.ingrain || this.field.gravity) return fail(); v.magnetRise = 5; await this.msg(`${name} 用電磁力浮了起來！`); return true;
      case 'minimize': v.minimize = true; return true;
      case 'defensecurl': v.defenseCurl = true; return true;
      case 'charge': v.charge = true; await this.msg(`${name} 開始充電了！`); return true;
      case 'foresight': v.foresight = true; await this.msg(`${name} 被識破了！`); return true;
      case 'smackdown': v.smackDown = true; v.magnetRise = 0; if (v.semi === 'fly') v.semi = null; return true;
      case 'tarshot': if (v.tarShot) return fail(); v.tarShot = true; await this.msg(`${name} 變得怕火了！`); return true;
      case 'noretreat': if (v.trapped) return fail(); v.trapped = true; return true;
      case 'octolock': if (v.octolock) return fail(); v.octolock = true; v.trapped = true; await this.msg(`${name} 被章魚桶縛住了！`); return true;
      case 'saltcure': if (!v.saltCure) { v.saltCure = true; await this.msg(`${name} 被鹽醃了！`); } return true;
      case 'syrupbomb': if (!v.syrupBomb) { v.syrupBomb = 3; await this.msg(`${name} 沾滿了糖漿！`); } return true;
      case 'sparklingaria': return true;
      case 'roost': v.roost = true; return true;
      case 'stockpile': {
        if ((v.stockpile || 0) >= 3) return fail();
        v.stockpile = (v.stockpile || 0) + 1;
        await this.msg(`${name} 蓄力了 ${v.stockpile} 次！`);
        const d0 = v.stg.def, s0 = v.stg.spd;
        await this.boost(target, { def: 1, spd: 1 }, target);
        v.stockDef = (v.stockDef || 0) + v.stg.def - d0; v.stockSpd = (v.stockSpd || 0) + v.stg.spd - s0;
        return true;
      }
      case 'torment': if (v.torment) return fail(); v.torment = true; await this.msg(`${name} 陷入了無理取鬧的狀態！`); return true;
      case 'imprison': if (v.imprison) return fail(); v.imprison = true; await this.msg(`${name} 封印了對手的招式！`); return true;
      case 'grudge': v.grudge = true; await this.msg(`${name} 想要向對手施加怨念！`); return true;
      case 'electrify': if (v.movedThisTurn) return fail(); v.electrify = true; await this.msg(`${name} 的招式變成了電屬性！`); return true;
      case 'magiccoat': v.magicCoat = true; await this.msg(`${name} 用魔法反射包圍了自己！`); return true;
      case 'gastroacid':
        if (v.gastro || FIXED_AB.has(target.ability)) return fail();
        v.gastro = true; await this.msg(`${name} 的特性失效了！`); return true;
      case 'powertrick': {
        const st = Mon.stats(target);
        this.setStat(target, 1, st[2]); this.setStat(target, 2, st[1]);
        await this.msg(`${name} 交換了攻擊和防禦！`); return true;
      }
      default:
        if (!secondary) await this.msg('但是什麼事都沒有發生。');
        return false;
    }
  },

  // 能力變化（Showdown boost）
  async boost(target, boosts, source, secondary = false) {
    if (!target || target.hp <= 0) return false;
    const v = this.volOf(target), name = this.label(target);
    const a = this.ab(target);
    const byFoe = source && source !== target;
    let any = false, droppedByFoe = false;
    const raised = {};
    for (let [k, c] of Object.entries(boosts)) {
      const key = STAGE_OF[k];
      if (!key || !c) continue;
      if (a === 'contrary') c = -c;
      if (a === 'simple') c *= 2;
      if (c < 0 && byFoe) {
        // 鏡甲：把對手降低能力的效果反彈回去
        if (a === 'mirror-armor' && !this._mirror && source.hp > 0) {
          await this.abilityMsg(target, '把能力降低反彈了回去！');
          this._mirror = true;
          try { await this.boost(source, { [k]: c }, target, secondary); } finally { this._mirror = false; }
          continue;
        }
        // 花幕：草屬性的自己和隊友的能力不會被對手降低
        if (this.typesOf(target).includes('grass') && [target, this.allyOf ? this.allyOf(target) : null].some(x => x && x.hp > 0 && this.ab(x) === 'flower-veil')) { if (!secondary) await this.msg(`${name} 受到了花幕的保護！`); continue; }
        if (this.sides[this.sideKey(target)].mist) { if (!secondary) await this.msg(`${name} 受到白霧的保護！`); continue; }
        if (this.volOf(target).sub && !secondary) { await this.msg('但是失敗了！'); continue; }
        // 恆淨之軀、白色煙霧、金屬防護、清淨墜飾：不會被對手降低能力
        if (['clear-body', 'white-smoke', 'full-metal-body'].includes(a)) { if (!secondary) await this.abilityMsg(target, `${name} 的能力不會被降低！`); continue; }
        if (this.itm(target) === 'clear-amulet') { if (!secondary) await this.msg(`${name} 的清淨墜飾防止了能力降低！`); continue; }
        if ((a === 'hyper-cutter' && key === 'atk') || (a === 'big-pecks' && key === 'def') || ((a === 'keen-eye' || a === 'minds-eye') && key === 'acc')) {
          if (!secondary) await this.abilityMsg(target, `${name} 的${BOOST_ZH[k]}不會被降低！`); continue;
        }
      }
      const cur = v.stg[key];
      if ((c > 0 && cur >= 6) || (c < 0 && cur <= -6)) {
        if (!secondary) await this.msg(`${name} 的${BOOST_ZH[k]}已經無法再${c > 0 ? '提高' : '降低'}了！`);
        continue;
      }
      v.stg[key] = U.clamp(cur + c, -6, 6);
      if (c > 0) raised[k] = v.stg[key] - cur;
      if (c < 0) { v.statsLoweredThisTurn = true; if (byFoe) droppedByFoe = true; }
      any = true;
      const amt = Math.abs(c) >= 3 ? '極大幅' : Math.abs(c) === 2 ? '大幅' : '';
      await this.statFx(target, c > 0);
      await this.msg(`${name} 的${BOOST_ZH[k]}${amt}${c > 0 ? '提高' : '降低'}了！`);
    }
    // 不服輸、好勝：被對手降低能力時大幅提高攻擊／特攻
    if (droppedByFoe && a === 'defiant') await this.boost(target, { atk: 2 }, target);
    if (droppedByFoe && a === 'competitive') await this.boost(target, { spa: 2 }, target);
    // 跟風：對手的能力提高時，自己也提高同樣的等級
    if (Object.keys(raised).length && !this._opportunist) {
      for (const o of this.activeMons()) {
        if (o.hp <= 0 || this.sideKey(o) === this.sideKey(target) || this.ab(o) !== 'opportunist') continue;
        this._opportunist = true;
        try { await this.boost(o, raised, o); } finally { this._opportunist = false; }
      }
    }
    // 白色香草：恢復被降低的能力
    if (this.itm(target) === 'white-herb' && Object.values(v.stg).some(s => s < 0)) {
      await this.consume(target, `${name} 用{i}恢復了降低的能力！`);
      for (const kk of Object.keys(v.stg)) if (v.stg[kk] < 0) v.stg[kk] = 0;
    }
    return any;
  },
  async stage(m, v, stat, c) {
    const k = { attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spd', speed: 'spe', accuracy: 'accuracy', evasion: 'evasion' }[stat];
    if (k) await this.boost(m, { [k]: c }, m);
  },

  async protectContact(user, target, mv) {
    const p = this.volOf(target).protect;
    if (!mv.flags.contact) return;
    if (p === 'spikyshield') { await this.hurt(user, Math.max(1, Math.floor(Mon.maxHp(user) / 8))); await this.msg(`${this.label(user)} 受到了傷害！`); }
    if (p === 'banefulbunker') await this.setStatus(user, 'psn', target, true);
    if (p === 'burningbulwark') await this.setStatus(user, 'brn', target, true);
    if (p === 'kingsshield') await this.boost(user, { atk: -1 }, target, true);
    if (p === 'obstruct') await this.boost(user, { def: -2 }, target, true);
    if (p === 'silktrap') await this.boost(user, { spe: -1 }, target, true);
  },
  async crash(user) {
    await this.selfDamage(user, Math.floor(Mon.maxHp(user) / 2));
    await this.msg(`${this.label(user)} 摔了下去，受到了傷害！`);
  },
  async selfFaint(user) {
    if (user.hp <= 0) return;
    if (this._deferFaint) { this._deferFaint.add(user); return; } // 雙打的大爆炸：所有目標都打完才倒下
    this.selfKO = this.sideKey(user);
    await this.hurt(user, user.hp);
  },
  // 自己造成的傷害（反作用力、生命寶珠、撞空）：倒下時記錄是哪一方造成的
  async selfDamage(user, dmg) {
    await this.hurt(user, Math.min(dmg, user.hp));
    if (user.hp <= 0) this.selfKO = this.sideKey(user);
  },

  // 吹飛：野生戰鬥直接結束；訓練家戰隨機換上下一隻
  async forceOut(target) {
    if (['suction-cups', 'guard-dog'].includes(this.ab(target)) || this.volOf(target).ingrain) { await this.msg(`${this.label(target)} 緊緊吸附在地面上！`); return; }
    if (this.wildMon) { this.fled = true; await this.msg(this.sideKey(target) === 'foe' ? `${this.label(target)} 被吹走了！` : '被吹走了，戰鬥結束了！'); return; }
    const isFoe = target === this.foe;
    const party = isFoe ? this.foeParty : G.party;
    const cur = isFoe ? this.foeIdx : this.myIdx;
    const opts = party.map((m, i) => i).filter(i => i !== cur && party[i].hp > 0);
    if (!opts.length) { await this.msg('但是失敗了！'); return; }
    const i = U.pick(opts);
    await this.onSwitchOut(target);
    if (isFoe) { this.foeIdx = i; this.vFoe = newVol(); Game.markSeen(this.foe.sp); await this.sendOut('foe', this.foe); await this.msg(`${Mon.name(this.foe)} 被拖了出來！`); await this.onEntry(this.foe); }
    else { this.myIdx = i; this.vMe = newVol(); this.participants.add(i); await this.sendOut('me', this.me); await this.msg(`${Mon.name(this.me)} 被拖了出來！`); await this.onEntry(this.me); }
  },
  async selfSwitchOut(user, mv) {
    const isFoe = user === this.foe;
    if (isFoe) {
      if (this.wildMon) return;
      const opts = this.foeParty.map((m, i) => i).filter(i => i !== this.foeIdx && this.foeParty[i].hp > 0);
      if (!opts.length) return;
      const keep = mv.selfSwitch === 'copyvolatile' ? { stg: { ...this.vFoe.stg }, sub: this.vFoe.sub } : null;
      await this.foeSwitch(U.pick(opts));
      if (keep) Object.assign(this.vFoe, keep);
      return;
    }
    if (!G.party.some((m, i) => i !== this.myIdx && m.hp > 0)) return;
    const keep = mv.selfSwitch === 'copyvolatile' ? { stg: { ...this.vMe.stg }, sub: this.vMe.sub } : null;
    let i = -1;
    while (i < 0 || i === this.myIdx) i = await Game.partyMenu({ battle: this, forced: true });
    await this.switchTo(i);
    if (keep) Object.assign(this.vMe, keep);
  },

  // 登場時：撒菱、隱形岩、毒菱、黏黏網、治癒之願
  async onEntry(m) {
    Mon.ovr.delete(m);
    const side = this.sides[this.sideKey(m)];
    const v = this.volOf(m);
    v.turnsOut = 0;
    // 治癒之願：體力與異常狀態全部恢復；新月舞連 PP 也恢復
    const hw = this.pendingHealingWish;
    if (hw && hw.side === this.sideKey(m)) {
      this.pendingHealingWish = null;
      m.hp = Mon.maxHp(m); m.st = null;
      if (hw.lunar) m.moves.forEach(x => { if (MOVES[x.id]) x.pp = MOVES[x.id].pp; });
      this.draw(); await this.msg(`${hw.lunar ? '新月舞' : '治癒之願'}讓 ${this.label(m)} 恢復了！`);
    }
    const grounded = this.grounded(m);
    // 厚底靴、魔法防守不受場上的陷阱影響
    const hazardFree = this.itm(m) === 'heavy-duty-boots' || this.ab(m) === 'magic-guard';
    if (side.stealthrock && !hazardFree) {
      const e = typeEff('rock', this.typesOf(m));
      await this.hurt(m, Math.max(1, Math.floor(Mon.maxHp(m) * e / 8)));
      await this.msg(`尖銳的岩石扎進了 ${this.label(m)} 的身體！`);
    }
    if (side.spikes && grounded && m.hp > 0 && !hazardFree) {
      await this.hurt(m, Math.floor(Mon.maxHp(m) * [0, 1 / 8, 1 / 6, 1 / 4][side.spikes]));
      await this.msg(`${this.label(m)} 受到了撒菱的傷害！`);
    }
    if (side.toxicspikes && grounded && m.hp > 0) {
      if (this.typesOf(m).includes('poison')) { side.toxicspikes = 0; await this.msg('毒菱被吸收了！'); }
      else if (this.itm(m) !== 'heavy-duty-boots') await this.setStatus(m, side.toxicspikes >= 2 ? 'tox' : 'psn', null, true);
    }
    if (side.stickyweb && grounded && m.hp > 0 && this.itm(m) !== 'heavy-duty-boots') { await this.msg(`${this.label(m)} 被黏黏網纏住了！`); await this.boost(m, { spe: -1 }, null, true); }
    if (m.hp > 0 && this.primalCheck) await this.primalCheck(m);
    if (m.hp > 0) await this.abilityStart(m);
  },

  // 特性的登場效果
  async abilityStart(m) {
    // 登場時的形態（陰晴不定）
    await this.formCheck(m, 'entry');
    const a = this.ab(m), o = this.otherOf(m), name = this.label(m);
    if (!a) return;
    // 每場戰鬥只發動一次的登場特性
    const once = () => { this._abOnce = this._abOnce || new Set(); if (this._abOnce.has(m)) return false; this._abOnce.add(m); return true; };
    const foes = this.activeMons().filter(x => x.hp > 0 && this.sideKey(x) !== this.sideKey(m));
    const rock = it => this.itm(m) === it ? 8 : 5;
    const setW = async (w, it, txt) => {
      if (this.field.weather === w) return;
      this.field.weather = w; this.field.weatherT = rock(it);
      await this.abilityMsg(m, txt);
    };
    const setT = async (t, txt) => {
      if (this.field.terrain === t) return;
      this.field.terrain = t; this.field.terrainT = this.itm(m) === 'terrain-extender' ? 8 : 5;
      await this.abilityMsg(m, txt);
    };
    switch (a) {
      case 'drizzle': return setW('raindance', 'damp-rock', '開始下雨了！');
      // 原始回歸的特性：持續到離場（以 99 回合表示）
      case 'desolate-land': this.field.weather = 'sunnyday'; this.field.weatherT = 99; return this.abilityMsg(m, '日照變得非常強烈了！');
      case 'primordial-sea': this.field.weather = 'raindance'; this.field.weatherT = 99; return this.abilityMsg(m, '開始下起了傾盆大雨！');
      case 'drought': case 'orichalcum-pulse': return setW('sunnyday', 'heat-rock', '日照變強了！');
      case 'sand-stream': return setW('sandstorm', 'smooth-rock', '開始颳沙暴了！');
      case 'snow-warning': return setW('snowscape', 'icy-rock', '開始下雪了！');
      case 'electric-surge': case 'hadron-engine': return setT('electricterrain', '腳下電流飛竄！');
      case 'grassy-surge': return setT('grassyterrain', '腳下青草如茵！');
      case 'misty-surge': return setT('mistyterrain', '腳下霧氣繚繞！');
      case 'psychic-surge': return setT('psychicterrain', '腳下傳來奇妙的感覺！');
      case 'intimidate': {
        if (!o || o.hp <= 0) return;
        await this.abilityMsg(m, `威嚇了 ${this.label(o)}！`);
        const oa = this.ab(o);
        if (['inner-focus', 'own-tempo', 'oblivious', 'scrappy'].includes(oa)) { await this.abilityMsg(o, `${this.label(o)} 沒有被威嚇！`); return; }
        if (oa === 'guard-dog') { await this.boost(o, { atk: 1 }, o); return; } // 看門犬：被威嚇時反而提高攻擊
        await this.boost(o, { atk: -1 }, m);
        if (oa === 'rattled') await this.boost(o, { spe: 1 }, o);
        return;
      }
      case 'intrepid-sword': if (once()) await this.boost(m, { atk: 1 }, m); return;
      case 'dauntless-shield': if (once()) await this.boost(m, { def: 1 }, m); return;
      case 'supersweet-syrup':
        if (!once() || !foes.length) return;
        await this.abilityMsg(m, '散發出了甜甜的香氣！');
        for (const f of foes) await this.boost(f, { evasion: -1 }, m);
        return;
      case 'screen-cleaner': {
        let any = false;
        for (const sd of Object.values(this.sides)) for (const k of ['reflect', 'lightscreen', 'auroraveil']) if (sd[k]) { sd[k] = 0; any = true; }
        if (any) await this.abilityMsg(m, '雙方的牆壁都消失了！');
        return;
      }
      case 'hospitality': {
        const ally = this.allyOf ? this.allyOf(m) : null;
        if (ally && ally.hp > 0 && ally.hp < Mon.maxHp(ally)) { await this.healMon(ally, Math.floor(Mon.maxHp(ally) / 4)); await this.abilityMsg(m, `${this.label(ally)} 的體力回復了！`); }
        return;
      }
      case 'imposter': {
        const t = o && o.hp > 0 ? o : foes[0];
        if (!t || this.volOf(m).transformed || this.volOf(t).sub || this.volOf(t).transformed || this.illusionOf(t)) return;
        return this.transformInto(m, t);
      }
      case 'tera-shift': if (m.sp === 1024) await this.setForm(m, 'terapagos-terastal', `${name} 變成了太晶形態！`); return;
      case 'neutralizing-gas': return this.abilityMsg(m, '周圍充滿了化學變化氣體！');
      case 'slow-start': return this.abilityMsg(m, `${name} 無法拿出平時的水準！`);
      case 'dark-aura': return this.abilityMsg(m, `${name} 散發著暗黑氣場！`);
      case 'fairy-aura': return this.abilityMsg(m, `${name} 散發著妖精氣場！`);
      case 'aura-break': return this.abilityMsg(m, `${name} 壓制了所有的氣場！`);
      case 'tablets-of-ruin': return this.abilityMsg(m, '周圍寶可夢的攻擊降低了！');
      case 'sword-of-ruin': return this.abilityMsg(m, '周圍寶可夢的防禦降低了！');
      case 'vessel-of-ruin': return this.abilityMsg(m, '周圍寶可夢的特攻降低了！');
      case 'beads-of-ruin': return this.abilityMsg(m, '周圍寶可夢的特防降低了！');
      case 'download': {
        if (!o) return;
        const s = Mon.stats(o);
        await this.boost(m, s[2] < s[4] ? { atk: 1 } : { spa: 1 }, m);
        return;
      }
      case 'pressure': return this.abilityMsg(m, `${name} 散發著壓迫感！`);
      case 'mold-breaker': return this.abilityMsg(m, `${name} 打破了常規！`);
      case 'unnerve': return this.abilityMsg(m, '對手變得緊張，無法吃樹果！');
      case 'air-lock': case 'cloud-nine': return this.abilityMsg(m, '天氣的影響消失了！');
      case 'frisk': if (o && this.itm(o)) return this.abilityMsg(m, `察覺到了 ${this.label(o)} 的${Held.name(this.itm(o))}！`); return;
      case 'anticipation':
        if (o && o.moves.some(s => { const x = md(s.id); return x.cat !== 'Status' && this.effectiveness({ ...x, type: x.type }, m) > 1 || x.ohko; })) return this.abilityMsg(m, `${name} 打了個寒顫！`);
        return;
      case 'forewarn': {
        if (!o) return;
        const best = o.moves.map(s => md(s.id)).sort((x, y) => (y.bp || 0) - (x.bp || 0))[0];
        if (best) return this.abilityMsg(m, `察覺到了 ${this.label(o)} 的 ${best.n}！`);
        return;
      }
      case 'trace': {
        const oa = o && o.ability;
        if (!oa || ['trace', 'multitype', 'stance-change', 'schooling', 'comatose', 'shields-down', 'disguise', 'rks-system', 'battle-bond', 'power-construct', 'ice-face', 'gulp-missile', 'neutralizing-gas', 'hunger-switch', 'zero-to-hero', 'commander', 'protosynthesis', 'quark-drive', 'imposter'].includes(oa)) return;
        this.volOf(m).tracedFrom = m.ability;
        m.ability = oa;
        await this.msg(`［${this.label(m)} 的複製］\n複製了 ${this.label(o)} 的${Abil.name(oa)}！`);
        return this.abilityStart(m);
      }
    }
  },
  // 退場時：自然回復、再生力；複製來的特性還原
  async onSwitchOut(m) {
    const v = this.volOf(m);
    if (v && v.tracedFrom) { m.ability = v.tracedFrom; v.tracedFrom = null; }
    const a = this.ab(m);
    // 變身、模仿、被交換或覆蓋的特性在退場時恢復
    this.restoreMon(m, ['moves', 'ability']);
    Mon.ovr.delete(m);
    // 退場時恢復的戰鬥形態（畫皮、全能形態、太晶形態、冰臉維持到戰鬥結束）
    if (/^(castform-|cramorant-|morpeko-hangry|aegislash-blade)/.test(m.form || '') && typeof BForm !== 'undefined') BForm.revert(m);
    if (a === 'natural-cure' && m.st) { m.st = null; }
    if (a === 'regenerator' && m.hp > 0) m.hp = Math.min(Mon.maxHp(m), m.hp + Math.floor(Mon.maxHp(m) / 3));
  },

  // ---------- 回合結束（Showdown residual 順序） ----------
  async endOfTurn() {
    const f = this.field;
    // 天氣
    if (f.weather) {
      if ((f.weather === 'sandstorm' || f.weather === 'hail') && this.wx()) {
        for (const m of [this.me, this.foe]) {
          if (!m || m.hp <= 0 || (this.residualSkip && this.residualSkip.has(m))) continue;
          const t = this.typesOf(m), a = this.ab(m);
          // 防塵、防塵護目鏡、魔法防守，以及各自天氣的相關特性不受傷害
          const abilityImmune = ['overcoat', 'magic-guard'].includes(a) || this.itm(m) === 'safety-goggles'
            || (f.weather === 'sandstorm' ? ['sand-veil', 'sand-rush', 'sand-force'].includes(a) : ['ice-body', 'snow-cloak'].includes(a));
          const immune = abilityImmune || (f.weather === 'sandstorm' ? t.some(x => ['rock', 'ground', 'steel'].includes(x)) : t.includes('ice'));
          if (immune || this.volOf(m).semi === 'dig' || this.volOf(m).semi === 'dive') continue;
          await this.hurt(m, Math.max(1, Math.floor(Mon.maxHp(m) / 16)));
          await this.msg(`${this.label(m)} 受到了${f.weather === 'sandstorm' ? '沙暴' : '冰雹'}的傷害！`);
        }
      }
      if (--f.weatherT <= 0) {
        await this.msg({ raindance: '雨停了。', sunnyday: '日照恢復正常了。', sandstorm: '沙暴停止了。', hail: '冰雹停止了。', snowscape: '雪停了。' }[f.weather]);
        f.weather = null;
      }
    }
    // 未來攻擊
    for (const fu of this.futures.splice(0)) {
      if (--fu.turns > 0) { this.futures.push(fu); continue; }
      const target = this.futureTarget(fu);
      if (!target || target.hp <= 0) continue;
      const restore = this.focusOn(target);
      // 施術者不在場時，持有道具（生命寶珠）不影響未來攻擊：不加傷害、也不扣後備的體力
      this._futureSrcOut = !this.activeMons().includes(fu.user);
      try {
        await this.msg(`${this.label(target)} 受到了${fu.mv.n}的攻擊！`);
        await this.useMoveOn(fu.user, target, fu.mv, { ...fu.act, futureHit: true });
      } finally { this._futureSrcOut = false; restore(); }
    }
    for (const key of ['me', 'foe']) {
      const s = this.sides[key];
      const m = key === 'me' ? this.me : this.foe;
      if (s.wish && --s.wish.turns <= 0) {
        if (m && m.hp > 0 && m.hp < Mon.maxHp(m)) { await this.healMon(m, s.wish.hp); await this.msg('願望實現了！'); }
        s.wish = null;
      }
    }
    for (const [m, v, om] of [[this.me, this.vMe, this.foe], [this.foe, this.vFoe, this.me]]) {
      if (this.residualSkip && this.residualSkip.has(m)) continue; // 雙打：這回合已處理過
      v.flinch = false; v.protect = false; v.endure = false; v.roost = false; v.magicCoat = false; v.electrify = false;
      if (!m || m.hp <= 0) continue;
      const wasOut = v.turnsOut > 0;
      v.turnsOut++;
      const max = Mon.maxHp(m), name = this.label(m);
      const a = this.ab(m), it = this.itm(m), w = this.wx();
      const guard = a === 'magic-guard'; // 魔法防守：不受招式以外的傷害
      const heal = async (frac, txt) => { if (m.hp < max) { await this.healMon(m, Math.max(1, Math.floor(max * frac))); await this.msg(txt); } };
      const hurt = async (frac, txt) => { if (!guard && m.hp > 0) { await this.hurt(m, Math.max(1, Math.floor(max * frac))); await this.msg(txt); } };
      // 天氣相關特性
      if (a === 'rain-dish' && w === 'raindance') await heal(1 / 16, `［${Abil.name(a)}］${name} 的體力回復了！`);
      if (a === 'ice-body' && (w === 'snowscape' || w === 'hail')) await heal(1 / 16, `［${Abil.name(a)}］${name} 的體力回復了！`);
      if (a === 'dry-skin' && w === 'raindance') await heal(1 / 8, `［${Abil.name(a)}］${name} 的體力回復了！`);
      if (a === 'dry-skin' && w === 'sunnyday') await hurt(1 / 8, `［${Abil.name(a)}］${name} 受到了傷害！`);
      if (a === 'solar-power' && w === 'sunnyday') await hurt(1 / 8, `［${Abil.name(a)}］${name} 受到了傷害！`);
      if (a === 'hydration' && w === 'raindance' && m.st) { m.st = null; this.draw(); await this.abilityMsg(m, `${name} 的異常狀態治好了！`); }
      if (f.terrain === 'grassyterrain' && this.grounded(m)) await heal(1 / 16, `${name} 的體力回復了！`);
      if (v.aquaRing) await heal(1 / 16, `水環回復了 ${name} 的體力！`);
      if (v.ingrain) await heal(1 / 16, `${name} 從根部吸取了養分！`);
      if (it === 'leftovers') await heal(1 / 16, `${name} 用吃剩的東西回復了少許體力！`);
      if (it === 'black-sludge') {
        if (this.typesOf(m).includes('poison')) await heal(1 / 16, `${name} 用黑色污泥回復了少許體力！`);
        else await hurt(1 / 8, `${name} 受到了黑色污泥的傷害！`);
      }
      if (v.seed && om && om.hp > 0 && !guard) {
        const d = Math.min(m.hp, Math.max(1, Math.floor(max / 8)));
        await this.hurt(m, d); await this.healMon(om, d);
        await this.msg(`寄生種子吸取了 ${name} 的體力！`);
      }
      if (m.hp > 0) {
        if ((m.st === 'psn' || m.st === 'tox') && a === 'poison-heal') { if (m.st === 'tox') v.toxN = Math.min(15, v.toxN + 1); await heal(1 / 8, `［${Abil.name(a)}］${name} 的體力回復了！`); }
        else if (m.st === 'brn') await hurt(1 / 16, `${name} 受到了灼傷的傷害！`);
        else if (m.st === 'psn') await hurt(1 / 8, `${name} 受到了毒的傷害！`);
        else if (m.st === 'tox') { v.toxN = Math.min(15, v.toxN + 1); await hurt(v.toxN / 16, `${name} 受到了劇毒的傷害！`); }
      }
      if (m.hp > 0 && v.curse) await hurt(1 / 4, `${name} 受到了詛咒的傷害！`);
      // 夢魘：睡著時受到對手的夢魘傷害
      if (m.hp > 0 && m.st === 'slp' && om && om.hp > 0 && this.ab(om) === 'bad-dreams') await hurt(1 / 8, `${name} 被夢魘折磨著！`);
      // 反芻：上一回合吃的樹果再吃一次
      if (m.hp > 0 && v.cudChew && --v.cudChew.t <= 0) { const b = v.cudChew.b; v.cudChew = null; await this.abilityMsg(m, `${name} 又吃了一次${Held.name(b)}！`); await this.berryEffect(m, b, true); }
      if (m.hp > 0 && v.trap > 0) {
        v.trap--;
        if (v.trap > 0) await hurt(1 / (v.trapDiv || 8), `${name} 受到了束縛的傷害！`);
        else await this.msg(`${name} 從束縛中解放了！`);
      }
      if (m.hp > 0 && v.saltCure) {
        const big = this.typesOf(m).some(t => t === 'water' || t === 'steel');
        await hurt(1 / (big ? 4 : 8), `${name} 受到了鹽醃的傷害！`);
      }
      // 加速、心情不定、蛻皮
      if (m.hp > 0 && a === 'speed-boost' && wasOut) await this.boost(m, { spe: 1 }, m);
      if (m.hp > 0 && a === 'moody') {
        const ks = ['atk', 'def', 'spa', 'spd', 'spe'];
        const upK = U.pick(ks.filter(k => v.stg[k] < 6)), downK = U.pick(ks.filter(k => k !== upK && v.stg[k] > -6));
        if (upK) await this.boost(m, { [upK]: 2 }, m);
        if (downK) await this.boost(m, { [downK]: -1 }, m);
      }
      if (m.hp > 0 && a === 'shed-skin' && m.st && U.rand() < 1 / 3) { m.st = null; this.draw(); await this.abilityMsg(m, `${name} 的異常狀態治好了！`); }
      // 收穫：吃掉的樹果有 50% 機率長回來（晴天必定）
      if (m.hp > 0 && a === 'harvest' && !m.item && v.lastBerry && (w === 'sunnyday' || U.rand() < .5)) {
        m.item = v.lastBerry; await this.abilityMsg(m, `${name} 收穫了${Held.name(v.lastBerry)}！`);
      }
      // 劇毒寶珠、火焰寶珠
      if (m.hp > 0 && !m.st && it === 'toxic-orb') await this.setStatus(m, 'tox', null, true);
      if (m.hp > 0 && !m.st && it === 'flame-orb') await this.setStatus(m, 'brn', null, true);
      if (m.hp > 0) await this.checkBerry(m);
      if (m.hp > 0 && v.octolock) await this.boost(m, { def: -1, spd: -1 }, om, true);
      if (m.hp > 0 && v.syrupBomb > 0) { v.syrupBomb--; await this.boost(m, { spe: -1 }, om, true); }
      if (v.taunt > 0 && --v.taunt === 0) await this.msg(`${name} 不再被挑釁了。`);
      if (v.encore > 0 && --v.encore === 0) { v.encoreMove = null; await this.msg(`${name} 的再來一次結束了。`); }
      if (v.disable > 0 && --v.disable === 0) { v.disableMove = null; await this.msg(`${name} 的定身法解除了。`); }
      if (v.magnetRise > 0) v.magnetRise--;
      if (v.lockOn > 0) v.lockOn--;
      if (m.hp > 0 && v.yawn > 0 && --v.yawn === 0) await this.setStatus(m, 'slp', null, true);
      if (m.hp > 0 && v.perish > 0) {
        v.perish--;
        await this.msg(`${name} 的滅亡計數變成了 ${v.perish}！`);
        if (v.perish === 0) await this.hurt(m, m.hp);
      }
    }
    for (const key of ['me', 'foe']) {
      const s = this.sides[key];
      for (const k of ['reflect', 'lightscreen', 'auroraveil', 'tailwind', 'mist', 'safeguard']) {
        if (s[k] > 0 && --s[k] === 0) await this.msg({ reflect: '反射壁消失了。', lightscreen: '光牆消失了。', auroraveil: '極光幕消失了。', tailwind: '順風停止了。', mist: '白霧消失了。', safeguard: '神秘守護消失了。' }[k]);
      }
    }
    if (f.terrain && --f.terrainT <= 0) { f.terrain = null; await this.msg('場地恢復原狀了。'); }
    if (f.trickRoom && --f.trickRoom <= 0) await this.msg('扭曲的時空恢復原狀了！');
    if (f.gravity && --f.gravity <= 0) await this.msg('重力恢復正常了。');
    if (f.magicRoom && --f.magicRoom <= 0) await this.msg('魔法空間消失了，恢復原狀了！');
    if (f.wonderRoom && --f.wonderRoom <= 0) await this.msg('奇妙空間消失了，恢復原狀了！');
    if (f.waterSport && --f.waterSport <= 0) await this.msg('玩水的效果消失了。');
    if (f.mudSport && --f.mudSport <= 0) await this.msg('玩泥巴的效果消失了。');
    if (f.fairyLock) f.fairyLock--;
    f.ionDeluge = false;
    for (const sd of Object.values(this.sides)) { sd.wideGuard = false; sd.quickGuard = false; sd.craftyShield = false; }
    // 回合結束時的形態變化（結凍頭、飽了又餓；達摩模式、魚群、界限盾殼在 js/late.js）
    for (const m of [this.me, this.foe]) if (m && m.hp > 0 && !(this.residualSkip && this.residualSkip.has(m))) await this.formCheck(m, 'end');
    // 同歸：本回合倒下時把對手一起帶走
    for (const [m, v] of [[this.me, this.vMe], [this.foe, this.vFoe]]) if (v.destinyBond && m.hp > 0) v.destinyBond = false;
  },
});

// ---------- 戰鬥中暫時的改變（變身、特性與道具交換、戰鬥形態），退場或戰鬥結束時恢復 ----------
Object.assign(Battle.prototype, {
  // 記住原本的值（同一個欄位只記第一次）
  keep(m, key) {
    if (!m) return;
    this._orig = this._orig || new Map();
    const o = this._orig.get(m) || {};
    if (!(key in o)) o[key] = m[key];
    this._orig.set(m, o);
  },
  restoreMon(m, keys) {
    const o = this._orig && this._orig.get(m);
    if (o) for (const k of keys) if (k in o) {
      if (o[k] === undefined) delete m[k]; else m[k] = o[k];
      delete o[k];
    }
    // 模仿學來的招式換回模仿
    if (keys.includes('moves') && m.moves) m.moves = m.moves.map(s => s.mimicOf || s);
    if (m.hp > Mon.maxHp(m)) m.hp = Mon.maxHp(m);
  },
  // 戰鬥結束：招式、特性、形態恢復；訓練家對戰中被交換、搶走的道具也還回去（野生對戰搶到的道具保留）
  cleanupBattle() {
    for (const m of [...G.party, ...(this.foeParty || [])]) {
      this.restoreMon(m, ['moves', 'ability']); // 形態由 js/late.js 的 BForm 在戰鬥結束時恢復
      if (this.trainer) this.restoreMon(m, ['item']);
      Mon.ovr.delete(m);
    }
    this._orig = null;
  },
  setStat(m, i, val) { const o = Mon.ovr.get(m) || {}; o[i] = val; Mon.ovr.set(m, o); },

  // 外觀：變身後是變身對象，幻覺是隊伍最後一隻還能戰鬥的寶可夢
  illusionOf(m) {
    if (!m || m.ability !== 'illusion' || !this.volOf) return null;
    const v = this.volOf(m);
    if (!v || v.illusionBroken) return null;
    if (v.illusion === undefined) {
      const party = this.sideKey(m) === 'me' ? G.party : this.foeParty;
      v.illusion = [...party].reverse().find(p => p !== m && p.hp > 0) || null;
    }
    return v.illusion;
  },
  shownMon(m) { return this.illusionOf(m) || m; },
  lookOf(m) { const v = this.volOf(m); return (v && v.look) || this.illusionOf(m) || m; },
  refreshSprite(m) {
    if (!this.el || !this.setSprite || !this.activeMons().includes(m)) return;
    const restore = this.focusOn(m);
    try { this.setSprite(this.sideKey(m), m); this.draw(); } finally { restore(); }
  },
  // 雙打：讓 a 和 b 成為目前運算的一對（回傳還原的函式）
  pairUp(a, b) {
    if (!this.pair) return () => { };
    const keep = [this.me, this.foe];
    this.pair(a, b);
    return () => this.ctx(keep[0], keep[1]);
  },

  // ---------- 形態 ----------
  baseForm(m) { return m._bfFrom !== undefined ? (m._bfFrom || null) : (m.form || null); },
  // 改變形態（js/late.js 的 BForm 記住原本的形態，戰鬥結束時恢復）；HP 上限改變時維持比例
  async setForm(m, form, txt) {
    if ((m.form || null) === (form || null)) return;
    const before = Mon.maxHp(m);
    if ((form || null) === this.baseForm(m)) BForm.revert(m); else BForm.set(m, form);
    const after = Mon.maxHp(m);
    if (after !== before && m.hp > 0) m.hp = Math.max(1, Math.min(after, Math.round(m.hp * after / before)));
    this.refreshSprite(m);
    if (txt) await this.abilityMsg(m, txt);
  },
  // 依特性改變形態：登場（entry）、每次行動後（move）、回合結束（end）；HP 相關的形態在 js/late.js
  async formCheck(m, when) {
    if (!m || m.hp <= 0) return;
    const a = this.ab(m), base = this.baseForm(m), name = this.label(m);
    const to = async (f, txt) => { if ((m.form || null) !== (f || null)) await this.setForm(m, f, txt); };
    // 陰晴不定（飄浮泡泡）：依天氣改變屬性
    if (m.sp === 351) {
      const f = a === 'forecast' ? ({ sunnyday: 'castform-sunny', raindance: 'castform-rainy', snowscape: 'castform-snowy', hail: 'castform-snowy' }[this.wx()] || base) : base;
      await to(f, a === 'forecast' ? `${name} 變化了樣子！` : null);
    }
    if (when !== 'end') return;
    // 結凍頭：下雪時冰臉恢復
    if (m.sp === 875 && a === 'ice-face' && m.form === 'eiscue-noice' && ['snowscape', 'hail'].includes(this.wx())) await to(base, `${name} 的冰臉恢復了！`);
    // 飽了又餓：每回合切換滿腹花紋與空腹花紋
    if (m.sp === 877 && a === 'hunger-switch') await to(m.form === 'morpeko-hangry' ? base : 'morpeko-hangry', null);
  },

  // ---------- 道具 ----------
  async moveItem(from, to, txt) {
    this.keep(from, 'item'); this.keep(to, 'item');
    const it = from.item;
    from.item = null; to.item = it;
    if (from.ability === 'unburden') this.volOf(from).unburden = true;
    if (txt) await this.msg(txt.replace('{i}', Held.name(it)));
    return it;
  },
  // 緊張感、人馬一體：對手不能吃樹果
  unnerved(m) { return this.activeMons().some(o => this.sideKey(o) !== this.sideKey(m) && ['unnerve', 'as-one-glastrier', 'as-one-spectrier'].includes(this.ab(o))); },
  // 吃下樹果的效果（熟成：效果加倍；反芻：下一回合結束時再吃一次）
  async berryEffect(m, b, again = false) {
    if (!b || m.hp <= 0) return;
    const r = this.ab(m) === 'ripen' ? 2 : 1, max = Mon.maxHp(m), v = this.volOf(m), name = this.label(m);
    if (b === 'sitrus-berry') await this.healMon(m, Math.floor(max / 4) * r);
    else if (b === 'oran-berry') await this.healMon(m, 10 * r);
    else if (b === 'leppa-berry') { const s = m.moves.find(x => x.pp === 0) || m.moves.find(x => MOVES[x.id] && x.pp < MOVES[x.id].pp); if (s) s.pp = Math.min(MOVES[s.id].pp, s.pp + 10 * r); }
    if ((b === 'lum-berry' || (STATUS_BERRY[b] || []).includes(m.st)) && m.st) { m.st = null; this.draw(); await this.msg(`${name} 的異常狀態治好了！`); }
    if ((b === 'lum-berry' || b === 'persim-berry') && v.conf) { v.conf = 0; await this.msg(`${name} 的混亂解除了！`); }
    if (!again && this.ab(m) === 'cud-chew') v.cudChew = { b, t: 2 };
  },
  // 用掉蓄力（噴出、吞下）：蓄力提高的防禦、特防恢復
  async clearStockpile(m) {
    const v = this.volOf(m);
    if (!v.stockpile) return;
    v.stg.def = U.clamp(v.stg.def - (v.stockDef || 0), -6, 6); v.stg.spd = U.clamp(v.stg.spd - (v.stockSpd || 0), -6, 6);
    v.stockpile = 0; v.stockDef = 0; v.stockSpd = 0;
    await this.msg(`${this.label(m)} 的蓄力效果消失了！`);
  },

  // ---------- 招式 ----------
  async transformInto(user, t) {
    const vU = this.volOf(user), vT = this.volOf(t);
    const ts = Mon.stats(t);
    Mon.ovr.set(user, { 1: ts[1], 2: ts[2], 3: ts[3], 4: ts[4], 5: ts[5] });
    vU.types = [...(vT.types || Mon.types(t))];
    vU.stg = { ...vT.stg };
    this.keep(user, 'ability'); user.ability = t.ability;
    this.keep(user, 'moves'); user.moves = t.moves.map(s => ({ id: s.id, pp: Math.min(5, MOVES[s.id] ? MOVES[s.id].pp : 5) }));
    vU.transformed = true;
    vU.look = { sp: t.sp, form: t.form, shiny: user.shiny };
    this.refreshSprite(user);
    await this.msg(`${this.label(user)} 變身成了 ${this.label(t)}！`);
  },
  // 忍耐：兩回合承受攻擊，第三回合把受到的傷害加倍奉還給最後攻擊自己的寶可夢
  async bide(user, target, mv) {
    const v = this.volOf(user), name = this.label(user);
    if (!v.bide) { v.bide = { n: 2, dmg: 0, by: null }; v.locked = { id: mv.num, turns: 99 }; await this.msg(`${name} 開始忍耐了！`); return true; }
    if (--v.bide.n > 0) { await this.msg(`${name} 正在忍耐攻擊。`); return true; }
    const { dmg, by } = v.bide;
    v.bide = null; v.locked = null;
    await this.msg(`${name} 釋放了忍耐的力量！`);
    const t = by && by.hp > 0 && this.activeMons().includes(by) ? by : target;
    if (!dmg || !t || t.hp <= 0) { await this.msg('但是失敗了！'); return false; }
    const vT = this.volOf(t);
    if (vT.protect) { await this.msg(`${this.label(t)} 保護住了自己！`); return false; }
    const restore = this.pairUp(user, t);
    try {
      await this.moveAnim(user, t, this.viewMove(mv));
      const d = Math.min(t.hp, dmg * 2);
      await this.hurt(t, d);
      vT.hitBy.push({ by: this.sideKey(user), dmg: d, cat: 'Physical' }); vT.damagedThisTurn = true;
    } finally { restore(); }
    return true;
  },
  // 危險迴避、躍躍欲逃：退場（野生寶可夢逃走）
  async emergencyExit(m) {
    if (this.doubles) return;
    const side = this.sideKey(m);
    if (this.wildMon && side === 'foe') { await this.abilityMsg(m, `${this.label(m)} 逃走了！`); this.fled = true; return; }
    const party = side === 'me' ? G.party : this.foeParty;
    if (!party.some(p => p !== m && p.hp > 0)) return;
    await this.abilityMsg(m, `${this.label(m)} 退了回去！`);
    await this.selfSwitchOut(m, {});
  },
  // 舞者：跟著使出別人的舞蹈招式
  async dancers(user, target, mv) {
    for (const d of this.activeMons()) {
      if (d === user || d.hp <= 0 || this.ab(d) !== 'dancer') continue;
      const opp = o => o && o.hp > 0 && this.sideKey(o) !== this.sideKey(d);
      const t = opp(user) ? user : opp(target) ? target : this.activeMons().find(opp);
      if (!t) continue;
      await this.abilityMsg(d, `${this.label(d)} 跟著跳起舞來！`);
      const restore = this.pairUp(d, t);
      try { await this.runMove(d, t, { mv, slot: null, dancer: true, cont: true }); } finally { restore(); }
    }
  },
  // 先行一步、延後：調整這回合的行動順序（雙打由 DoubleBattle 覆寫；單打只判斷成功與否）
  reorder(m) { return !this.volOf(m).movedThisTurn && !!this.queuedMoveOf(m); },
});

function fixedType(mv) { return mv.damage !== undefined || mv.ohko || ['superfang', 'naturesmadness', 'ruination', 'psywave', 'endeavor', 'finalgambit', 'counter', 'mirrorcoat', 'metalburst', 'comeuppance'].includes(mv.id) ? 'fixed' : null; }
