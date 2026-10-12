// 從 Pokémon Showdown 的對戰客戶端取出 Z 招式的動畫（CC0）→ data/sd_anims.js
// 來源：smogon/pokemon-showdown-client 的 battle-animations-moves.ts（招式動畫）與 battle-animations.ts（BattleEffects、BattleOtherAnims）
// 只留下 Z 力量（zpower）與 18 個 Z 招式，以及它們用到的其他動畫和特效圖（特效圖執行時從 play.pokemonshowdown.com/fx/ 載入）
// 用法：node tools/fetch_showdown_anims.mjs
import { transform } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'https://raw.githubusercontent.com/smogon/pokemon-showdown-client/master/play.pokemonshowdown.com/src/';
const FX = 'https://play.pokemonshowdown.com/fx/';
const Z = {
  normal: 'breakneckblitz', fighting: 'alloutpummeling', flying: 'supersonicskystrike', poison: 'aciddownpour', ground: 'tectonicrage',
  rock: 'continentalcrush', bug: 'savagespinout', ghost: 'neverendingnightmare', steel: 'corkscrewcrash', fire: 'infernooverdrive',
  water: 'hydrovortex', grass: 'bloomdoom', electric: 'gigavolthavoc', psychic: 'shatteredpsyche', ice: 'subzeroslammer',
  dragon: 'devastatingdrake', dark: 'blackholeeclipse', fairy: 'twinkletackle',
};

const get = async f => { const r = await fetch(BASE + f); if (!r.ok) throw new Error(f + ' ' + r.status); return r.text(); };
let moves = await get('battle-animations-moves.ts');
let engine = await get('battle-animations.ts');

// battle-animations.ts：只取 BattleEffects 與 BattleOtherAnims 兩個表
const slice = (src, start) => {
  const a = src.indexOf(start);
  let depth = 0, i = src.indexOf('= {', a) + 2; // 跳過型別註記裡的 { }
  for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
  return src.slice(a, i + 1) + ';';
};
const effectsSrc = slice(engine, 'const BattleEffects');
const otherSrc = slice(engine, 'export const BattleOtherAnims').replace('export const', 'const');
moves = moves.replace(/^import[^\n]*\n/gm, '').replace(/export const BattleMoveAnims/, 'const BattleMoveAnims');
const all = `${effectsSrc}\n${otherSrc}\n${moves}\nglobalThis.__SD = { BattleEffects, BattleOtherAnims, BattleMoveAnims };`;
const { code } = await transform(all, { loader: 'ts', format: 'esm', target: 'es2020' });
globalThis.Config = { server: {} };
await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const { BattleEffects, BattleOtherAnims, BattleMoveAnims } = globalThis.__SD;

// 需要的動畫：Z 力量、18 個 Z 招式，以及它們的程式裡用到的其他動畫（遞迴）
const need = { move: new Map(), other: new Map() };
const fxUsed = new Set();
const visit = (table, kind, id) => {
  const map = need[kind];
  if (map.has(id) || !table[id]) return;
  const fn = table[id].anim;
  const src = fn.toString();
  map.set(id, src);
  // esbuild 輸出的字串是雙引號
  for (const m of src.matchAll(/BattleMoveAnims(?:\.(\w+)|\[["'](\w+)["']\])/g)) visit(BattleMoveAnims, 'move', m[1] || m[2]);
  for (const m of src.matchAll(/BattleOtherAnims(?:\.(\w+)|\[["'](\w+)["']\])/g)) visit(BattleOtherAnims, 'other', m[1] || m[2]);
  for (const m of src.matchAll(/showEffect\(\s*["'](\w+)["']/g)) fxUsed.add(m[1]);
  for (const m of src.matchAll(/BattleEffects\.(\w+)/g)) fxUsed.add(m[1]);
};
// 專屬 Z 招式（data/zsig.js）
const SIG = ['catastropika', 'stokedsparksurfer', 'sinisterarrowraid', 'maliciousmoonsault', 'oceanicoperetta', 'extremeevoboost', 'pulverizingpancake',
  'genesissupernova', 'guardianofalola', 'soulstealing7starstrike', 'clangoroussoulblaze', 'splinteredstormshards', 'letssnuggleforever',
  'searingsunrazesmash', 'menacingmoonrazemaelstrom', 'lightthatburnsthesky'];
visit(BattleOtherAnims, 'other', 'zpower');
for (const id of [...Object.values(Z), ...SIG]) visit(BattleMoveAnims, 'move', id);

// 動畫用到的場景與精靈的方法（確認執行時的替代實作都有）
const api = new Set();
for (const src of [...need.move.values(), ...need.other.values()]) {
  for (const m of src.matchAll(/scene\.(\w+)/g)) api.add('scene.' + m[1]);
  for (const m of src.matchAll(/(?:attacker|defender|defenders\[\d\])\.(\w+)/g)) api.add('sprite.' + m[1]);
}
const effects = {};
for (const id of [...fxUsed].sort()) {
  const e = BattleEffects[id];
  if (!e) continue;
  effects[id] = { ...e, url: e.url ? FX + e.url.replace(/^.*\//, '') : '' };
}
const fnEntries = map => [...map].map(([id, src]) => `  ${id}: { ${src} },`).join('\n');
const out = `// 由 tools/fetch_showdown_anims.mjs 產生：Pokémon Showdown 的 Z 招式動畫（battle-animations*.ts，CC0）
// 特效圖從 ${FX} 載入（大多是 CC0；icicle、lightning、bone、rock 系列另有授權，見 Showdown 的說明）
// 執行時由 js/sd_anim.js 提供 scene 與 attacker／defender（換算到綠寶石的戰鬥畫面）
/* eslint-disable */
const Config = { routes: { client: 'play.pokemonshowdown.com' } }; // 冰的 Z 招式用到的背景圖網址
const BattleEffects = ${JSON.stringify(effects)};
const BattleOtherAnims = {
${fnEntries(need.other)}
};
const BattleMoveAnims = {
${fnEntries(need.move)}
};
window.SD_ANIMS = { BattleEffects, BattleOtherAnims, BattleMoveAnims, Z: ${JSON.stringify(Z)} };
`;
mkdirSync('data', { recursive: true });
writeFileSync('data/sd_anims.js', out);
console.log(`動畫：其他 ${need.other.size} 個（${[...need.other.keys()].join(' ')}）、招式 ${need.move.size} 個；特效圖 ${Object.keys(effects).length} 種；${(out.length / 1024).toFixed(0)} KB`);
console.log('用到的方法：' + [...api].sort().join(' '));
