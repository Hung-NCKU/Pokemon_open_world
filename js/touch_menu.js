// Native-size touch targets outside the scaled 720x480 canvas.
// The existing choice handler remains the single source of battle actions.
export function touchMenu({ options, cls, focus, pick, cancel, current, info }) {
  if (!document.body.classList.contains('touch') || !['move-menu', 'battle-menu'].includes(cls)) return null;
  const moves = cls === 'move-menu', root = document.createElement('section');
  root.id = 'touch-battle-menu'; root.className = moves ? 'moves' : 'actions';
  root.setAttribute('aria-label', moves ? '選擇招式' : '戰鬥行動');
  root.innerHTML = `<div class="tb-options"></div>${moves ? '<div class="tb-info" aria-live="polite"></div><div class="tb-gimmicks"></div><div class="tb-footer"><button class="tb-back">返回</button><button class="tb-confirm">使出招式</button></div>' : ''}`;
  const grid = root.querySelector('.tb-options');
  const buttons = options.map((o, i) => {
    const opt = typeof o === 'string' ? { label: o } : o, b = document.createElement('button');
    b.textContent = opt.label || '－';
    b.className = opt.disabled ? 'dis' : '';
    if (!moves) b.setAttribute('aria-disabled', String(!!opt.disabled));
    if (moves && opt.disabled) b.setAttribute('aria-description', '此招式目前無法使出，可點選查看原因');
    b.onclick = () => { focus(i); if (!moves && !opt.disabled) pick(i); };
    grid.appendChild(b); return b;
  });
  if (moves) {
    root.querySelector('.tb-back').onclick = cancel;
    root.querySelector('.tb-confirm').onclick = () => pick(current());
  }
  const syncGimmicks = () => {
    if (!moves) return;
    const box = root.querySelector('.tb-gimmicks'); box.replaceChildren();
    for (const original of document.querySelectorAll('#gimmick-bar .gb')) {
      const b = document.createElement('button'); b.textContent = original.textContent.replace(/^[RMEG] /, '');
      b.className = original.className; b.disabled = original.classList.contains('dis');
      b.onclick = () => { original.click(); syncGimmicks(); }; box.appendChild(b);
    }
  };
  const observer = new MutationObserver(syncGimmicks), bar = document.getElementById('gimmick-bar');
  if (bar) observer.observe(bar, { childList: true, subtree: true, attributes: true });
  document.body.appendChild(root); document.body.classList.add('touch-menu-open'); syncGimmicks();
  return {
    update(i) {
      buttons.forEach((b, k) => { b.classList.toggle('sel', k === i); b.setAttribute('aria-pressed', String(k === i)); });
      if (moves) {
        const opt = options[i]; root.querySelector('.tb-confirm').disabled = !opt || !!opt.disabled;
        const detail = root.querySelector('.tb-info');
        const temp = document.createElement('div'); temp.innerHTML = info?.() || '';
        // Full description remains in the existing HUD; this panel shows the move's key numbers.
        temp.querySelector('.mv-desc')?.remove(); detail.textContent = [...temp.childNodes].map(n => n.textContent).filter(Boolean).join('　');
      }
    },
    close() { observer.disconnect(); root.remove(); document.body.classList.remove('touch-menu-open'); },
  };
}
