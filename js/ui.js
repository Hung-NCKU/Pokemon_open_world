// 介面：對話框、選單、清單視窗
const UI = (() => {
  const $ = id => document.getElementById(id);
  const stack = [];
  const isOk = e => ['z', 'Z', 'Enter', ' '].includes(e.key);
  const isNo = e => ['x', 'X', 'Escape', 'Backspace'].includes(e.key);

  function pushKey(fn) {
    stack.push(fn);
    return () => { const i = stack.lastIndexOf(fn); if (i >= 0) stack.splice(i, 1); };
  }
  function handleKey(e) {
    if (!stack.length) return false;
    stack[stack.length - 1](e);
    return true;
  }
  function active() { return stack.length > 0; }

  function showText(text) {
    $('dialog').classList.remove('hidden');
    $('dialog-text').textContent = text;
    $('dialog-more').classList.add('hidden');
  }
  function hideDialog() { $('dialog').classList.add('hidden'); }

  // 依文字框寬度把訊息切成每頁 2 行（第三世代文字框的顯示方式）
  function paginate(text) {
    const box = $('dialog');
    const width = (box.clientWidth || 660) - 24;
    const size = parseFloat(getComputedStyle(box).fontSize) || 33;
    const maxUnits = Math.max(8, Math.floor(width / size));
    const lines = [];
    for (const para of String(text).split('\n')) {
      let cur = '', units = 0;
      for (const ch of para) {
        const u = ch.charCodeAt(0) < 256 ? .5 : 1;
        if (units + u > maxUnits) { lines.push(cur); cur = ''; units = 0; }
        cur += ch; units += u;
      }
      lines.push(cur);
    }
    const pages = [];
    for (let i = 0; i < lines.length; i += 2) pages.push(lines.slice(i, i + 2).join('\n'));
    return pages;
  }
  async function say(text, opts = {}) {
    const pages = paginate(text);
    for (let i = 0; i < pages.length; i++) await sayPage(pages[i], i < pages.length - 1 ? { ...opts, auto: opts.auto ? opts.auto : 0 } : opts);
  }
  // 顯示一頁訊息；auto: 打字完畢後自動前進的毫秒數
  function sayPage(text, { auto = 0 } = {}) {
    return new Promise(res => {
      const dlg = $('dialog'), tx = $('dialog-text'), more = $('dialog-more');
      dlg.classList.remove('hidden');
      more.classList.add('hidden');
      let i = 0, done = false, closed = false, autoT = null;
      const speed = G.settings?.textSpeed ?? 22;
      const close = () => {
        if (closed) return;
        closed = true; clearTimeout(autoT); pop(); dlg.onclick = null; more.classList.add('hidden'); res();
      };
      const finish = () => {
        clearInterval(timer); tx.textContent = text; done = true;
        more.classList.remove('hidden');
        if (auto) autoT = setTimeout(close, auto);
      };
      const timer = speed <= 0 ? null : setInterval(() => { i += 1; tx.textContent = text.slice(0, i); if (i >= text.length) finish(); }, speed);
      if (speed <= 0) finish();
      const onKey = e => {
        if (e.repeat) return;
        if (isOk(e) || isNo(e)) { if (!done) finish(); else { if (typeof Sound !== 'undefined') Sound.sfx('select'); close(); } }
      };
      const pop = pushKey(onKey);
      dlg.onclick = () => onKey({ key: 'z' });
    });
  }

  // 選項選單：回傳索引；取消回傳 -1
  function choose(options, { prompt = null, cancel = true, cols = 1, start = 0, cls = '', onFocus = null } = {}) {
    return new Promise(res => {
      if (prompt !== null) showText(prompt);
      const dlg = $('dialog');
      dlg.classList.toggle('act', cls === 'battle-menu');
      dlg.classList.toggle('mov', cls === 'move-menu');
      const info = $('choice-info');
      info.classList.toggle('hidden', !onFocus);
      const box = $('choices');
      box.className = cls;
      box.innerHTML = '';
      box.style.gridTemplateColumns = `repeat(${cols}, auto)`;
      let idx = Math.min(start, options.length - 1);
      const els = options.map((o, i) => {
        const d = document.createElement('div');
        const opt = typeof o === 'string' ? { label: o } : o;
        d.className = 'choice' + (opt.disabled ? ' dis' : '');
        d.innerHTML = opt.html ?? U.esc(opt.label);
        d.onmouseenter = () => { idx = i; upd(); };
        d.onclick = e => { e.stopPropagation(); pick(i); };
        box.appendChild(d);
        return d;
      });
      const upd = () => {
        els.forEach((e, i) => e.classList.toggle('sel', i === idx));
        if (onFocus) info.innerHTML = onFocus(idx) || '';
      };
      upd();
      const close = v => {
        pop(); box.classList.add('hidden'); box.innerHTML = '';
        info.classList.add('hidden'); dlg.classList.remove('act', 'mov');
        res(v);
      };
      const pick = i => {
        const o = options[i];
        if (o && typeof o === 'object' && o.disabled) return;
        if (typeof Sound !== 'undefined') Sound.sfx('select');
        close(i);
      };
      const n = options.length;
      const onKey = e => {
        const k = e.key;
        if (k === 'ArrowDown' || k === 's') idx = cols === 1 ? (idx + 1) % n : (idx + cols < n ? idx + cols : idx);
        else if (k === 'ArrowUp' || k === 'w') idx = cols === 1 ? (idx - 1 + n) % n : (idx - cols >= 0 ? idx - cols : idx);
        else if ((k === 'ArrowRight' || k === 'd') && cols > 1) { if (idx % cols < cols - 1 && idx + 1 < n) idx++; }
        else if ((k === 'ArrowLeft' || k === 'a') && cols > 1) { if (idx % cols > 0) idx--; }
        else if (isOk(e)) { if (!e.repeat) pick(idx); return; }
        else if (isNo(e)) { if (cancel && !e.repeat) close(-1); return; }
        upd();
      };
      const pop = pushKey(onKey);
      box.classList.remove('hidden');
    });
  }

  // 全螢幕清單：rows 為 HTML 字串或 {html, disabled}
  function list({ title, rows, cancel = true, start = 0, extra = '', cls = '', onFocus = null }) {
    return new Promise(res => {
      const m = document.createElement('div');
      m.className = 'modal ' + cls;
      m.innerHTML = `<h2><span>${title}</span><span class="extra">${extra}</span></h2><div class="body"></div><div class="hint">↑↓ 選擇　Z／Enter 確定　X／Esc 返回</div>`;
      const body = m.querySelector('.body');
      let idx = Math.max(0, Math.min(start, rows.length - 1));
      const els = rows.map((r, i) => {
        const row = typeof r === 'string' ? { html: r } : r;
        const d = document.createElement('div');
        d.className = 'row' + (row.disabled ? ' dis' : '');
        d.innerHTML = row.html;
        d.onclick = () => { idx = i; upd(); pick(i); };
        body.appendChild(d);
        return d;
      });
      if (!rows.length) body.innerHTML = '<div class="empty">（空空如也）</div>';
      const upd = (scroll = true) => {
        els.forEach((e, i) => e.classList.toggle('sel', i === idx));
        if (scroll && els[idx]) els[idx].scrollIntoView({ block: 'nearest' });
        if (onFocus) onFocus(idx, m);
      };
      $('game').appendChild(m);
      upd();
      const close = v => { pop(); m.remove(); res(v); };
      const pick = i => {
        const r = rows[i];
        if (r && typeof r === 'object' && r.disabled) return;
        close(i);
      };
      const onKey = e => {
        const k = e.key, n = rows.length;
        if (!n) { if (isNo(e) || isOk(e)) close(-1); return; }
        if (k === 'ArrowDown' || k === 's') idx = (idx + 1) % n;
        else if (k === 'ArrowUp' || k === 'w') idx = (idx - 1 + n) % n;
        else if (k === 'PageDown' || k === 'ArrowRight' || k === 'd') idx = Math.min(n - 1, idx + 8);
        else if (k === 'PageUp' || k === 'ArrowLeft' || k === 'a') idx = Math.max(0, idx - 8);
        else if (isOk(e)) { if (!e.repeat) pick(idx); return; }
        else if (isNo(e)) { if (cancel && !e.repeat) close(-1); return; }
        else return;
        upd();
      };
      const pop = pushKey(onKey);
    });
  }

  // 顯示資訊面板，任意鍵關閉
  function panel(html, cls = '') {
    return new Promise(res => {
      const m = document.createElement('div');
      m.className = 'modal panel ' + cls;
      m.innerHTML = `<div class="body">${html}</div><div class="hint">按任意鍵返回</div>`;
      $('game').appendChild(m);
      const close = () => { pop(); m.remove(); res(); };
      m.onclick = close;
      const onKey = e => { if (!e.repeat && (isOk(e) || isNo(e))) close(); };
      const pop = pushKey(onKey);
    });
  }

  function input(prompt, def = '') {
    return new Promise(res => {
      const m = document.createElement('div');
      m.className = 'modal input-modal';
      m.innerHTML = `<div class="body"><p>${U.esc(prompt)}</p><input maxlength="10" value="${U.esc(def)}"><button>確定</button></div>`;
      $('game').appendChild(m);
      const inp = m.querySelector('input');
      const done = () => { pop(); const v = inp.value.trim() || def; m.remove(); res(v); };
      inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') done(); };
      m.querySelector('button').onclick = done;
      const pop = pushKey(() => { });
      setTimeout(() => inp.focus(), 30);
    });
  }

  let bannerT = null;
  function banner(text) {
    const b = $('banner');
    b.textContent = text;
    b.classList.add('show');
    clearTimeout(bannerT);
    bannerT = setTimeout(() => b.classList.remove('show'), 2200);
  }

  function hpColor(r) { return r > .5 ? '#3ccf5a' : r > .2 ? '#f0c020' : '#f04030'; }
  function hpBar(hp, max, w = 120) {
    const r = Math.max(0, hp / max);
    return `<div class="hpbar" style="width:${w}px"><div style="width:${r * 100}%;background:${hpColor(r)}"></div></div>`;
  }
  function statusTag(st) {
    return st ? `<span class="st" style="background:${STATUS_C[st]}">${STATUS_ZH[st]}</span>` : '';
  }

  return { say, choose, list, panel, input, banner, handleKey, active, hideDialog, showText, hpBar, hpColor, statusTag, isOk, isNo, pushKey };
})();
