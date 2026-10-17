import { G, Game } from './core.js';
import { safeToSave } from './lifecycle.js';

export async function installUpdates() {
  if (!('serviceWorker' in navigator) || !['https:', 'http:'].includes(location.protocol)) return;
  if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) return;
  try {
    const reg = await navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { updateViaCache: 'none' });
    let updating = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (updating) location.reload(); });
    const offer = () => {
      if (!reg.waiting || !navigator.serviceWorker.controller || document.getElementById('game-update')) return;
      const button = document.createElement('button');
      button.id = 'game-update'; button.textContent = '新版已備妥・儲存並更新';
      button.onclick = () => {
        if (G.mode !== 'title' && !safeToSave()) { button.textContent = '請先結束戰鬥或關閉選單，再點此更新'; return; }
        if (G.mode !== 'title' && !Game.save(true)) return;
        updating = true; reg.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' });
      };
      document.body.appendChild(button);
    };
    offer();
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offer(); });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void reg.update().catch(() => {}); });
  } catch { /* An offline first visit must not prevent play. */ }
}
