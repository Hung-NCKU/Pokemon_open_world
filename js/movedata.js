// 招式描述與支援狀態（從 engine.js 分出來：戰鬥流程、能力頁、AI 都會用到，不依賴 Battle）
// 招式資料：data/showdown.js（Showdown 客戶端資料，以全國招式編號對應）＋ data/moves.js（中文名稱與說明）。
// 每個招式都有支援狀態：full（完整）、partial（部分效果未實作）、none（未支援，AI 不會使用）。
import { Forms } from './core.js';
import { U } from './util.js';
import { Mon } from './mon.js';

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

export { SD, TYPE_KEY, BOOST_ZH, STAGE_OF, _md, md, STRUGGLE_MD, IMPL, NOOP_STATUS, classify, SUPPORT_ZH, BATTLE_FORMS, FIXED_AB, NO_COPY_AB, PLATE_TYPE, MEMORY_TYPE, BOOST_TABLE, boostMul, accBoostMul, weightOf, hasType, newVol };
