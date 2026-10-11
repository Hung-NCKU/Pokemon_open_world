// Vite：開發伺服器（npm run dev，修改後自動重新載入）與打包（npm run build → dist/）
// - 開發伺服器也提供 tests/ 的測試頁（Playwright 用它跑測試）；JSX 與 import 'preact' 都要經過 Vite 轉換，不能直接用靜態伺服器
// - 進入點是 index.html 的 <script type="module" src="js/main.js">，Vite 把所有模組與資料檔打包、壓縮成帶雜湊值的檔案
// - 綠寶石素材（assets/gen3，本機用 python tools/build_assets.py 建置）、字型、Service Worker 在執行期才用網址載入，
//   打包後原樣複製到 dist/
// - 圖鑑說明（pokedex.js 的 fl 欄位，約 57 KB）拆成 data/dex_text.js，頁面載入完成後才下載
import { defineConfig } from 'vite';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STATIC = ['assets', 'fonts', 'sw.js'];

function copyStatic() {
  let out;
  return {
    name: 'copy-static',
    apply: 'build',
    configResolved(c) { out = resolve(c.root, c.build.outDir); },
    closeBundle() {
      for (const p of STATIC) if (existsSync(p)) cpSync(p, resolve(out, p), { recursive: true });
    },
  };
}

function splitDexText() {
  let text = null, out;
  return {
    name: 'split-dex-text',
    apply: 'build',
    configResolved(c) { out = resolve(c.root, c.build.outDir); },
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/data/pokedex.js')) return null;
      const prefix = 'window.POKEDEX=';
      const dex = JSON.parse(code.slice(code.indexOf(prefix) + prefix.length).trim().replace(/;$/, ''));
      text = {};
      for (const [k, v] of Object.entries(dex)) if (v.fl) { text[k] = v.fl; delete v.fl; }
      return { code: prefix + JSON.stringify(dex) + ';', map: null };
    },
    transformIndexHtml(html) {
      const anchor = "  add('assets/gen3/se_bank.js');";
      return html.replace(anchor, anchor + "\n  add('data/dex_text.js');");
    },
    closeBundle() {
      if (!text) return;
      mkdirSync(resolve(out, 'data'), { recursive: true });
      writeFileSync(resolve(out, 'data/dex_text.js'), '// 圖鑑說明（打包時從 pokedex.js 拆出，頁面載入後才下載）\n'
        + `(t => { for (const k in t) if (window.POKEDEX[k]) window.POKEDEX[k].fl = t[k]; })(${JSON.stringify(text)});\n`);
    },
  };
}

export default defineConfig({
  base: './', // GitHub Pages 的網址有子路徑，用相對路徑
  // 介面元件用 Preact（JSX，例如 js/ui/option_menu.jsx）
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  server: { port: 5173, open: false },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: { main: resolve('index.html') } },
  },
  plugins: [splitDexText(), copyStatic()],
});
