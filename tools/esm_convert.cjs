// 一次性的轉換工具：把 index.html 依序載入的傳統腳本（共用全域變數）改成 ES module（import／export）
// 用 espree 解析、eslint-scope 找出每個檔案「宣告了什麼」與「用到別的檔案的什麼」，自動加上 import 與 export。
//
// 執行順序：傳統腳本依 index.html 的順序執行，很多檔案在最外層修改別的檔案的物件（例如 engine.js 把方法加到
// Battle.prototype、late.js 再包一層）。ES module 會先執行被 import 的模組，循環引用時順序會亂掉，所以要讓
// 「每個 import 都指向比較早的檔案」：
//   - 比較早的檔案在執行期才用到的比較晚的「單例物件」（G、Game、UI、Story……）：在最早的 js/core.js 先宣告成空物件，
//     原本的檔案用 define() 把內容填進去（呼叫的地方不用改）
//   - 字面常數（SAVE_KEY）直接搬到 core.js
//   - 其餘函式已經先手動搬到比較早的檔案（md、newVol → movedata.js；monSprite、playCry → sprites.js）
// 這樣模組的執行順序就和原本的載入順序完全一樣（工具會模擬並檢查）。
//
//   node tools/esm_convert.cjs            只分析
//   node tools/esm_convert.cjs --write    改寫 js/*.js，產生 js/core.js、js/main.js
// 需要：npm i --no-save espree eslint-scope（只有轉換時用到）
const fs = require('fs');
const path = require('path');
const espree = require('espree');
const eslintScope = require('eslint-scope');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const jsFiles = scripts.filter(s => s.startsWith('js/'));
const dataFiles = scripts.filter(s => s.startsWith('data/'));
const WRITE = process.argv.includes('--write');
const orderIdx = Object.fromEntries(jsFiles.map((f, i) => [f, i]));

const info = {};
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'script', range: true, loc: true });
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  const declared = sm.globalScope.variables.map(v => v.name);
  // 最外層的宣告：名稱 → 敘述（只處理單一宣告的 const）
  const decl = {};
  for (const st of ast.body) if (st.type === 'VariableDeclaration' && st.declarations.length === 1 && st.declarations[0].id.type === 'Identifier') decl[st.declarations[0].id.name] = st;
  info[f] = { src, ast, sm, declared, decl, through: sm.globalScope.through };
}
const owner = {};
const dups = [];
for (const f of jsFiles) for (const n of info[f].declared) { if (owner[n]) dups.push(`${n}: ${owner[n]} 與 ${f}`); owner[n] = owner[n] || f; }

// ---------- 往後參照 → 提前宣告 ----------
const FORWARD = new Set(), LITERAL = new Set(), issues = [];
for (const f of jsFiles) for (const ref of info[f].through) {
  const n = ref.identifier.name, o = owner[n];
  if (!o || o === f || orderIdx[o] < orderIdx[f]) continue;
  const st = info[o].decl[n];
  const init = st && st.declarations[0].init;
  if (st && st.kind === 'const' && init && (init.type === 'ObjectExpression' || init.type === 'CallExpression')) FORWARD.add(n);
  else if (st && st.kind === 'const' && init && init.type === 'Literal') LITERAL.add(n);
  else issues.push(`${f}:${ref.identifier.loc.start.line} 往後參照 ${n}（${o}），不是物件也不是字面常數，要手動搬到比較早的檔案`);
}
const CORE = 'js/core.js';
const src0 = n => owner[n];
const from = n => (FORWARD.has(n) || LITERAL.has(n) || n === 'define') ? CORE : owner[n];

// ---------- 每個檔案的 import ----------
const plan = {};
for (const f of jsFiles) {
  const imports = {};
  const add = (o, n) => (imports[o] = imports[o] || new Set()).add(n);
  for (const ref of info[f].through) {
    const n = ref.identifier.name;
    if (!owner[n]) { if (ref.isWrite()) issues.push(`${f}:${ref.identifier.loc.start.line} 寫入未宣告的全域變數 ${n}`); continue; }
    if (owner[n] === f) continue;
    add(from(n), n);
    if (ref.isWrite()) issues.push(`${f}:${ref.identifier.loc.start.line} 寫入 ${owner[n]} 的 ${n}（import 是唯讀的）`);
  }
  // 自己提前宣告的物件：從 core 匯入並用 define 填入
  const own = info[f].declared.filter(n => FORWARD.has(n));
  for (const n of own) { add(CORE, n); add(CORE, 'define'); }
  for (const n of info[f].declared.filter(n => LITERAL.has(n))) add(CORE, n);
  plan[f] = Object.fromEntries(Object.entries(imports).sort((a, b) => (a[0] === CORE ? -1 : orderIdx[a[0]]) - (b[0] === CORE ? -1 : orderIdx[b[0]])));
}

// ---------- 檢查：import 都指向比較早的檔案、執行順序和原本相同 ----------
for (const f of jsFiles) for (const o of Object.keys(plan[f])) if (o !== CORE && orderIdx[o] > orderIdx[f]) issues.push(`${f} import 比較晚的 ${o}：${[...plan[f][o]].join(', ')}`);
const evalOrder = [], state = {};
const visit = f => { if (state[f]) return; state[f] = 1; for (const o of Object.keys(plan[f])) if (o !== CORE) visit(o); evalOrder.push(f); };
for (const f of jsFiles) visit(f);
const same = evalOrder.every((f, i) => f === jsFiles[i]);

console.log(`${jsFiles.length} 個 js 檔、${dataFiles.length} 個資料檔；提前宣告 ${FORWARD.size} 個：${[...FORWARD].join(' ')}；搬到 core：${[...LITERAL].join(' ')}`);
console.log(same ? '模組的執行順序和原本的載入順序相同' : '執行順序不同：' + evalOrder.map(f => path.basename(f, '.js')).join(' → '));
if (dups.length) console.log('重複宣告：\n  ' + dups.join('\n  '));
if (issues.length) console.log('需要手動處理：\n  ' + issues.join('\n  '));
if (!WRITE) process.exit(0);
if (issues.length || dups.length || !same) { console.log('有問題，不改寫'); process.exit(1); }

// ---------- 改寫 ----------
const rel = (f, o) => './' + path.relative(path.dirname(f), o).replace(/\\/g, '/');
const core = [
  '// 最早載入的模組：比較早的模組在執行期才會用到、但由比較晚的模組定義的單例物件，先在這裡宣告成空物件，',
  '// 定義它的模組再用 define() 把內容填進去（由 tools/esm_convert.cjs 產生；這樣 import 都指向比較早的模組，執行順序和原本相同）',
  'export function define(target, src) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(src)); return target; }',
  '',
  ...[...FORWARD].sort((a, b) => orderIdx[owner[a]] - orderIdx[owner[b]] || a.localeCompare(b)).map(n => `export const ${n} = {}; // ${owner[n]}`),
  ...[...LITERAL].map(n => { const st = info[owner[n]].decl[n]; return `export const ${n} = ${info[owner[n]].src.slice(...st.declarations[0].init.range)}; // 原本在 ${owner[n]}`; }),
  '',
].join('\n');
fs.writeFileSync(path.join(ROOT, CORE), core);

for (const f of jsFiles) {
  let { src } = info[f];
  // define() 取代提前宣告的物件；字面常數刪掉（由後往前改，位置才不會跑掉）
  const edits = [];
  for (const n of info[f].declared) {
    const st = info[f].decl[n];
    if (FORWARD.has(n)) edits.push([st.range[0], st.range[1], `define(${n}, ${src.slice(...st.declarations[0].init.range)});`]);
    if (LITERAL.has(n)) edits.push([st.range[0], st.range[1], `// ${n} 搬到 js/core.js`]);
  }
  for (const [a, b, t] of edits.sort((x, y) => y[0] - x[0])) src = src.slice(0, a) + t + src.slice(b);
  const lines = Object.entries(plan[f]).map(([o, s]) => `import { ${[...s].sort().join(', ')} } from '${rel(f, o)}';`);
  const exp = info[f].declared.filter(n => !FORWARD.has(n) && !LITERAL.has(n));
  const m = src.match(/^((?:\/\/[^\n]*\n)+)/);
  const lead = m ? m[0] : '';
  fs.writeFileSync(path.join(ROOT, f), lead + (lines.length ? lines.join('\n') + '\n' : '') + src.slice(lead.length).replace(/\s*$/, '\n') + (exp.length ? `\nexport { ${exp.join(', ')} };\n` : ''));
}
const main = [
  '// 進入點（Vite 打包的起點）：依原本 index.html 的順序載入資料與各個模組（由 tools/esm_convert.cjs 產生）',
  '// 每個模組的 export 也放到 window 上：測試頁、開發者工具仍然可以直接用 Game、Battle、G 等名稱',
  ...dataFiles.map(d => `import '../${d}';`),
  `import * as core from './core.js';`,
  ...jsFiles.map((f, i) => `import * as m${i} from '${rel('js/main.js', f)}';`),
  '',
  `for (const m of [core, ${jsFiles.map((f, i) => 'm' + i).join(', ')}]) Object.assign(window, m);`,
  '',
].join('\n');
fs.writeFileSync(path.join(ROOT, 'js', 'main.js'), main);
console.log('已改寫', jsFiles.length, '個檔案，產生 js/core.js、js/main.js');
