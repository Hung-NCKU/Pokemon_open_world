// 畫面提示
// - 野外左下角顯示「下一步」（任務線目前的目標），第一次玩的人也知道接下來要做什麼
// - 手機直向：遊戲畫面和按鍵之間的空白放大字的提示——平常是下一步與操作說明，戰鬥選招式時是招式說明
import { G, Story } from './core.js';
import { U } from './util.js';
const Hud = (() => {
  const $ = id => document.getElementById(id);
  let goalEl = null, sideEl = null, lastSide = '';

  function goalText() {
    const s = G.state;
    if (!s || !s.region || typeof Story === 'undefined') return '';
    try { return Story.questText(s, s.region); } catch { return ''; }
  }
  // 對話框、選單、面板打開時不顯示左下角的提示（避免蓋住）
  function covered() {
    const d = $('dialog'), c = $('choices');
    return !!document.querySelector('#game .modal') || (d && !d.classList.contains('hidden')) || (c && !c.classList.contains('hidden'));
  }

  function update() {
    if (!goalEl) return;
    const world = G.mode === 'world' && G.state;
    const goal = world ? goalText() : '';
    const portrait = document.body.classList.contains('portrait');
    goalEl.textContent = goal ? '下一步：' + goal : '';
    goalEl.classList.toggle('hidden', !goal || portrait || covered());

    // 手機直向的提示區：放在遊戲畫面下緣與按鍵區上緣之間
    let html = '';
    if (portrait) {
      const wrap = $('wrap').getBoundingClientRect(), touch = $('touch');
      const top = Math.round(wrap.bottom + 6), bottom = Math.round((touch ? touch.offsetHeight : 0) + 6);
      sideEl.style.top = top + 'px'; sideEl.style.bottom = bottom + 'px';
      if (window.innerHeight - top - bottom >= 40) {
        const info = $('choice-info'), desc = info && !info.classList.contains('hidden') && info.querySelector('.mv-desc');
        if (desc && desc.innerHTML) html = `<div class="hd-move">${desc.innerHTML}</div>`;
        else if (goal && !document.querySelector('#game .modal')) html = `<div class="hd-goal"><b>下一步</b>${U.esc(goal)}</div>`
          + '<div class="hd-keys">A：確定／調查　B：返回（野外按住 B 奔跑）　START：選單</div>';
      }
    }
    document.body.classList.toggle('side-on', !!html);
    sideEl.classList.toggle('hidden', !html);
    if (html !== lastSide) { sideEl.innerHTML = html; lastSide = html; }
  }

  function init() {
    goalEl = document.createElement('div');
    goalEl.id = 'goal'; goalEl.className = 'hidden';
    $('game').appendChild(goalEl);
    sideEl = document.createElement('div');
    sideEl.id = 'side-hud'; sideEl.className = 'hidden';
    document.body.appendChild(sideEl);
    // 選招式時游標移動要馬上更新說明；其他情況每 0.3 秒檢查一次就夠了
    const info = $('choice-info');
    if (info && window.MutationObserver) new MutationObserver(update).observe(info, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    setInterval(update, 300);
    window.addEventListener('resize', update);
  }
  window.addEventListener('load', init);
  return { update, goalText };
})();

export { Hud };
