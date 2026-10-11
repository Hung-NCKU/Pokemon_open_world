// 綠寶石版寶可夢寄放系統（graphics/pokemon_storage）：一個一個箱子（6×5），方向鍵二維移動，抓起放下交換
// 資料：G.state.box 仍是一個陣列（其他功能沿用），每隻寶可夢以 m.boxPos = { b, i } 記錄所在的箱子與格子
//       G.state.boxMeta = [{ n: 箱子名稱, wp: 桌布 }]
const StorageUI = (() => {
  const COLS = 6, ROWS = 5, PER = COLS * ROWS;
  const WALLS = ['forest', 'city', 'desert', 'savanna', 'crag', 'volcano', 'snow', 'cave', 'beach', 'seafloor', 'river', 'sky', 'polkadot', 'pokecenter', 'machine', 'plain'];
  const WALL_ZH = { forest: '森林', city: '城市', desert: '沙漠', savanna: '草原', crag: '岩山', volcano: '火山', snow: '雪原', cave: '洞窟', beach: '海灘', seafloor: '海底', river: '河川', sky: '天空', polkadot: '圓點', pokecenter: '寶可夢中心', machine: '機械', plain: '素色' };

  // 依 boxPos 整理出各箱子的格子；沒有位置的寶可夢放進第一個空格
  function layout() {
    const s = G.state;
    const nBox = Math.max(14, Math.ceil(s.box.length / PER) + 1);
    s.boxMeta = s.boxMeta || [];
    for (let b = 0; b < nBox; b++) if (!s.boxMeta[b]) s.boxMeta[b] = { n: `箱子 ${b + 1}`, wp: WALLS[b % WALLS.length] };
    const grid = Array.from({ length: nBox }, () => Array(PER).fill(null));
    const loose = [];
    for (const m of s.box) {
      const p = m.boxPos;
      if (p && p.b < nBox && p.i >= 0 && p.i < PER && !grid[p.b][p.i]) grid[p.b][p.i] = m;
      else loose.push(m);
    }
    for (const m of loose) {
      outer: for (let b = 0; b < nBox; b++) for (let i = 0; i < PER; i++) if (!grid[b][i]) { grid[b][i] = m; m.boxPos = { b, i }; break outer; }
    }
    return grid;
  }

  // start：'party' 從隊伍開始（寄放寶可夢），其他從箱子開始
  function open({ start = 'box' } = {}) {
    return new Promise(res => {
      const s = G.state;
      let grid = layout();
      let box = 0, cur = 0, mode = start === 'party' ? 'party' : 'box', pslot = 0; // mode: box | title | party
      let held = null; // { m, from: { kind, b, i } }
      const root = document.createElement('div');
      root.id = 'storage';
      document.getElementById('game').appendChild(root);
      Sound.sfx('pc');
      const iconHtml = m => monIcon(m.sp, m.shiny, m.form);
      const focused = () => mode === 'party' ? G.party[pslot] : mode === 'box' ? grid[box][cur] : null;
      const draw = () => {
        const meta = s.boxMeta[box], m = held ? held.m : focused();
        const cx = mode === 'box' ? (cur % COLS) : 0, cy = mode === 'box' ? Math.floor(cur / COLS) : 0;
        let html = `<div class="st-scroll"></div><div class="st-panel"></div>
          <div class="st-pic">${m ? `<img src="${monSprite(m, false).url}" onerror="this.onerror=null;this.src='${Mon.spriteOf(m, { shiny: m.shiny })}'">` : ''}</div>
          <div class="st-info">${m ? `<b>${U.esc(Mon.name(m))}</b>${m.gender === 'm' ? ' <i class="gm">♂</i>' : m.gender === 'f' ? ' <i class="gf">♀</i>' : ''}<br>Lv${m.lv}　${Mon.types(m).map(typeTag).join('')}<br><small>${m.item ? U.esc(Held.name(m.item)) : ''}${(m.marks || []).length ? '　' + m.marks.join('') : ''}</small>` : ''}</div>
          <div class="st-btn party${mode === 'party' ? ' on' : ''}">隊伍寶可夢</div><div class="st-btn close">關閉箱子</div>
          <div class="st-wall" style="background-image:url(${Gen3.base}pc_wp_${meta.wp}.png)"></div>
          <div class="st-title${mode === 'title' ? ' on' : ''}"><i class="l"></i><span>${U.esc(meta.n)}</span><i class="r"></i></div>
          <div class="st-grid">${grid[box].map((x, i) => `<div class="st-cell" data-i="${i}">${x && (!held || held.m !== x) ? iconHtml(x) : ''}</div>`).join('')}</div>
          <div class="st-count">${box + 1}／${grid.length}</div>`;
        if (mode === 'party') {
          html += `<div class="st-party">${Array.from({ length: 6 }, (_, k) => { const p = G.party[k]; return `<div class="st-pslot${k === pslot ? ' sel' : ''}" data-k="${k}">${p && (!held || held.m !== p) ? iconHtml(p) : ''}</div>`; }).join('')}<div class="st-pclose">返回</div></div>`;
        }
        // 手形游標（抓著寶可夢時顯示圖示）
        const hx = mode === 'box' ? 264 + cx * 72 + 18 : mode === 'title' ? 456 : 60;
        const hy = mode === 'box' ? 120 + cy * 72 - 54 : mode === 'title' ? 30 : 96 + pslot * 54 - 30;
        html += `<div class="st-hand" style="left:${hx}px;top:${hy}px;background-image:url(${Gen3.base}pc_hand.png);background-position:0 ${held ? -192 : 0}px"></div>`;
        if (held) html += `<div class="st-held" style="left:${hx - 30}px;top:${hy + 36}px">${iconHtml(held.m)}</div>`;
        html += `<div class="st-hint">方向鍵 移動　Z ${held ? '放下／交換' : '選擇'}　P 隊伍　Q／E 換箱子　F 搜尋　X ${held ? '放回' : '關閉'}</div>`;
        root.innerHTML = html;
        root.querySelectorAll('.st-cell').forEach(el => { el.onclick = () => { mode = 'box'; cur = +el.dataset.i; act(); }; });
        root.querySelectorAll('.st-pslot').forEach(el => { el.onclick = () => { mode = 'party'; pslot = +el.dataset.k; act(); }; });
        root.querySelector('.st-btn.party').onclick = () => { mode = mode === 'party' ? 'box' : 'party'; draw(); };
        root.querySelector('.st-btn.close').onclick = () => tryClose();
        root.querySelector('.st-title .l').onclick = () => switchBox(-1);
        root.querySelector('.st-title .r').onclick = () => switchBox(1);
        const pc = root.querySelector('.st-pclose'); if (pc) pc.onclick = () => { mode = 'box'; draw(); };
      };
      const switchBox = d => { box = (box + d + grid.length) % grid.length; Sound.sfx('select'); draw(); };
      // 從某個位置拿起／放下
      const take = where => {
        if (where.kind === 'party') return G.party[where.k];
        return grid[where.b][where.i];
      };
      const put = (where, m) => {
        if (where.kind === 'party') {
          if (m) G.party[where.k] = m; else G.party.splice(where.k, 1);
          if (m) { delete m.boxPos; const j = s.box.indexOf(m); if (j >= 0) s.box.splice(j, 1); }
        } else {
          grid[where.b][where.i] = m;
          if (m) { m.boxPos = { b: where.b, i: where.i }; if (!s.box.includes(m)) s.box.push(m); const k = G.party.indexOf(m); if (k >= 0) G.party.splice(k, 1); }
        }
      };
      const here = () => mode === 'party' ? { kind: 'party', k: pslot } : { kind: 'box', b: box, i: cur };
      const ableAfter = (removed, added) => G.party.filter(p => p !== removed && p.hp > 0).length + (added && added.hp > 0 ? 1 : 0) > 0;
      async function act() {
        if (mode === 'title') {
          const c = await UI.choose(['換桌布', '改箱子名稱', '取消'], { prompt: `${s.boxMeta[box].n}` });
          if (c === 0) { const i = await UI.list({ title: '桌布', rows: WALLS.map(w => WALL_ZH[w]) }); if (i >= 0) s.boxMeta[box].wp = WALLS[i]; }
          if (c === 1) { const n = await UI.input('箱子的名稱：', s.boxMeta[box].n, { cancel: true }); if (n) s.boxMeta[box].n = n.slice(0, 8); }
          UI.hideDialog(); draw(); return;
        }
        const w = here();
        const target = mode === 'party' ? G.party[pslot] : grid[box][cur];
        if (held) {
          // 放下或交換
          if (mode === 'party' && pslot >= G.party.length && !target) { // 隊伍的空位：放在最後
            if (held.from.kind === 'party') { await say('已經在隊伍裡了。'); return; }
            if (G.party.length >= 6) { await say('隊伍已經滿了！'); return; }
            grid[held.from.b][held.from.i] = null;
            const j = s.box.indexOf(held.m); if (j >= 0) s.box.splice(j, 1);
            delete held.m.boxPos; G.party.push(held.m);
          } else {
            // 從隊伍拿出、放進箱子時，隊伍至少要留一隻能戰鬥的
            if (held.from.kind === 'party' && w.kind === 'box' && !ableAfter(held.m, target)) { await say('隊伍裡至少要留一隻能戰鬥的寶可夢！'); return; }
            const a = held.from;
            const other = target;
            // 原位置先清空，再放到新位置，其他寶可夢移到原位置
            if (a.kind === 'party') G.party[a.k] = null; else grid[a.b][a.i] = null;
            put(w, held.m);
            if (other && other !== held.m) put(a, other);
            G.state.party = G.state.party.filter(Boolean);
          }
          held = null;
          Sound.sfx('select');
          grid = layout();
          draw();
          return;
        }
        if (!target) return;
        const c = await UI.choose(['移動', '查看能力', '標記', '取消'], { prompt: `要對 ${Mon.name(target)} 做什麼？` });
        UI.hideDialog();
        if (c === 0) {
          if (w.kind === 'party' && G.party.length <= 1) { await say('隊伍裡至少要有一隻寶可夢！'); return; }
          held = { m: target, from: w };
          Sound.sfx('select');
        } else if (c === 1) {
          const list = mode === 'party' ? G.party : grid[box].filter(Boolean);
          await Game.summary(target, list);
        } else if (c === 2) {
          while (true) {
            const cm = target.marks || [];
            const j = await UI.choose([...MARKS.map(x => (cm.includes(x) ? '✓' : '　') + x), '完成'], { prompt: '要加上哪些標記？', cols: 4 });
            if (j < 0 || j === MARKS.length) break;
            const x = MARKS[j];
            target.marks = cm.includes(x) ? cm.filter(y => y !== x) : [...cm, x];
          }
          UI.hideDialog();
        }
        draw();
      }
      const say = async t => { await UI.say(t); UI.hideDialog(); draw(); };
      const tryClose = () => {
        if (held) { held = null; draw(); return; }
        clearInterval(scroll);
        pop(); root.remove(); res();
      };
      const onKey = e => {
        const k = e.key;
        if (e.repeat && !k.startsWith('Arrow')) return;
        if (k === 'ArrowLeft' || k === 'a') {
          if (mode === 'title') switchBox(-1);
          else if (mode === 'box') { if (cur % COLS === 0) { switchBox(-1); cur += COLS - 1; } else cur--; }
        } else if (k === 'ArrowRight' || k === 'd') {
          if (mode === 'title') switchBox(1);
          else if (mode === 'party') mode = 'box';
          else if (cur % COLS === COLS - 1) { switchBox(1); cur -= COLS - 1; } else cur++;
        } else if (k === 'ArrowUp' || k === 'w') {
          if (mode === 'box') { if (cur < COLS) mode = 'title'; else cur -= COLS; }
          else if (mode === 'party') pslot = (pslot + 5) % 6;
        } else if (k === 'ArrowDown' || k === 's') {
          if (mode === 'title') { mode = 'box'; cur = cur % COLS; }
          else if (mode === 'box') { if (cur + COLS < PER) cur += COLS; }
          else if (mode === 'party') pslot = (pslot + 1) % 6;
        } else if (k === 'q' || k === 'Q' || k === 'PageUp') { switchBox(-1); return; }
        else if (k === 'e' || k === 'E' || k === 'PageDown') { switchBox(1); return; }
        else if (k === 'p' || k === 'P') { mode = mode === 'party' ? 'box' : 'party'; }
        else if (k === 'f' || k === 'F') {
          if (held) return;
          pop(); root.style.display = 'none';
          Game.boxMenu().then(() => { root.style.display = ''; pop = UI.pushKey(onKey); grid = layout(); draw(); });
          return;
        } else if (UI.isOk(e)) { act(); return; }
        else if (UI.isNo(e)) { tryClose(); return; }
        else return;
        draw();
      };
      let pop = UI.pushKey(onKey);
      // 背景緩慢捲動（原作的斜向捲動）
      let off = 0;
      const scroll = setInterval(() => { off = (off + 1) % 96; const el = root.querySelector('.st-scroll'); if (el) el.style.backgroundPosition = `${off}px ${off}px`; }, 50);
      draw();
    });
  }
  return { open, layout, PER };
})();
