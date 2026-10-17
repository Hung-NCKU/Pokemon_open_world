// Vite：開發伺服器（npm run dev，修改後自動重新載入）與打包（npm run build → dist/）
// - 開發伺服器也提供 tests/ 的測試頁（Playwright 用它跑測試）；JSX 與 import 'preact' 都要經過 Vite 轉換，不能直接用靜態伺服器
// - 進入點是 index.html 的 <script type="module" src="js/main.js">，Vite 把所有模組與資料檔打包、壓縮成帶雜湊值的檔案
// - 綠寶石素材（assets/gen3，本機用 python tools/build_assets.py 建置）、字型、Service Worker 在執行期才用網址載入，
//   打包後原樣複製到 dist/
// - 圖鑑說明（pokedex.js 的 fl 欄位，約 57 KB）拆成 data/dex_text.js，頁面載入完成後才下載
import { defineConfig } from 'vite';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const STATIC = ['assets', 'fonts', 'sw.js'];

function copyStatic() {
  let out;
  return {
    name: 'copy-static',
    apply: 'build',
    transformIndexHtml(html) {
      // Missing classic scripts can receive the SPA HTML fallback in preview.
      // Omit optional Emerald manifests entirely when building without local assets.
      return html.replace(/<script src="(assets\/gen3\/(?:manifest|interiors)\.js)"><\/script>/g,
        (tag, path) => existsSync(path) ? tag : '');
    },
    configResolved(c) { out = resolve(c.root, c.build.outDir); },
    closeBundle() {
      for (const p of STATIC) if (existsSync(p)) cpSync(p, resolve(out, p), { recursive: true });
      const html = readFileSync(resolve(out, 'index.html'), 'utf8');
      const version = createHash('sha256').update(html).digest('hex').slice(0, 16);
      const critical = ['index.html', ...[...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map(m => m[1].replace(/^\.\//, ''))
        .filter(p => /\.(js|css|woff2)$/.test(p) && existsSync(resolve(out, p)))];
      let worker = readFileSync(resolve(out, 'sw.js'), 'utf8');
      worker = worker.replace("const VERSION = 'dev';", `const VERSION = '${version}';`)
        .replace('/* __PRECACHE__ */ []', JSON.stringify([...new Set(critical)]));
      writeFileSync(resolve(out, 'sw.js'), worker);
      writeFileSync(resolve(out, 'build-info.json'), JSON.stringify({ version, critical }));
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
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      input: { main: resolve('index.html') },
      output: { manualChunks(id) {
        const path = id.replace(/\\/g, '/');
        if (path.endsWith('/data/sd_anims.js')) return 'sd-anims';
        if (path.includes('/data/')) return 'game-data';
      } },
    },
  },
  plugins: [splitDexText(), copyStatic()],
});
