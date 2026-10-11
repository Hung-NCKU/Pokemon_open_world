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

  // 寶可夢寄放系統（src/pokemon_storage_system.c）的三種用法：
  //   withdraw 領取：在箱子選寶可夢 →「領取」→ 加入隊伍
  //   deposit 寄放：隊伍面板打開 → 選寶可夢 →「寄放」→ 選箱子
  //   move 移動：抓起來放到別的位置（箱子、隊伍都可以），左上的「PARTY POKéMON」打開隊伍面板
  // 畫面：左邊資料欄、右邊箱子；上方「PARTY POKéMON」按鈕（打開隊伍面板）與「CLOSE BOX」按鈕
  // 隊伍面板（party_menu.bin）在 x=80 滑出：左邊第 1 隻，右邊 5 格，最下面 CANCEL；圖示位置 (104,64)、(152,16+24k)
  const OPTION_ZH = { withdraw: '領取寶可夢', deposit: '寄放寶可夢', move: '移動寶可夢' };
  function open({ start = 'box', option = null } = {}) {
    option = option || (start === 'party' ? 'deposit' : 'move');
    return new Promise(res => {
      const s = G.state;
      let grid = layout();
      // mode：box 箱子格子、title 箱子名稱、buttons 上方按鈕、party 隊伍面板
      let box = 0, cur = 0, mode = option === 'deposit' ? 'party' : 'box', pslot = 0, bsel = 0;
      let partyOpen = option === 'deposit';
      let held = null; // { m, from: { kind, b, i } }（只有移動模式會抓起來）
      let chooser = null; // 寄放時選箱子：{ m, k }（拎著寶可夢，左右選箱子，確認後放下）
      const root = document.createElement('div');
      root.id = 'storage';
      document.getElementById('game').appendChild(root);
      Sound.sfx('pc');
      const iconHtml = m => monIcon(m.sp, m.shiny, m.form);
      const focused = () => mode === 'party' ? G.party[pslot] : mode === 'box' ? grid[box][cur] : null;
      // 隊伍面板裡各格的位置（GBA 座標）：0 是左邊的大格，1～5 是右邊，6 是 CANCEL
      const PSLOT = [[104, 64], [152, 16], [152, 40], [152, 64], [152, 88], [152, 112], [152, 140]];
      const draw = () => {
        const meta = s.boxMeta[box], m = held ? held.m : focused();
        const cx = cur % COLS, cy = Math.floor(cur / COLS);
        let html = `<div class="st-scroll"></div><div class="st-panel"></div>
          <div class="st-pic">${m ? `<img src="${monSprite(m, false).url}" onerror="this.onerror=null;this.src='${Mon.spriteOf(m, { shiny: m.shiny })}'">` : ''}</div>
          <div class="st-info">${m ? `<b>${U.esc(Mon.name(m))}</b>${m.gender === 'm' ? ' <i class="gm">♂</i>' : m.gender === 'f' ? ' <i class="gf">♀</i>' : ''}<br>Lv${m.lv}　${Mon.types(m).map(typeTag).join('')}<br><small>${m.item ? U.esc(Held.name(m.item)) : ''}${(m.marks || []).length ? '　' + m.marks.join('') : ''}</small>` : ''}</div>
          <div class="st-wall" style="background-image:url(${Gen3.base}pc_wp_${meta.wp}.png)"></div>
          <div class="st-title${mode === 'title' ? ' on' : ''}"><i class="l"></i><span>${U.esc(meta.n)}</span><i class="r"></i></div>
          <div class="st-grid">${grid[box].map((x, i) => `<div class="st-cell" data-i="${i}">${x && (!held || held.m !== x) ? iconHtml(x) : ''}</div>`).join('')}</div>
          <div class="st-count">${box + 1}／${grid.length}</div>
          <div class="st-tab${mode === 'buttons' && bsel === 0 ? ' on' : ''}"></div>
          <div class="st-close${mode === 'buttons' && bsel === 1 ? ' on' : ''}"></div>`;
        if (partyOpen) {
          html += `<div class="st-party">${[1, 2, 3, 4, 5].map(k => `<i class="st-pslotbg" style="top:${(8 + 24 * (k - 1)) * 3}px;background-image:url(${Gen3.base}pc_slot_${G.party[k] ? 'filled' : 'empty'}.png)"></i>`).join('')}
            ${PSLOT.slice(0, 6).map(([x, y], k) => { const p = G.party[k]; return `<div class="st-pslot" data-k="${k}" style="left:${(x - 80 - 16) * 3}px;top:${(y - 16) * 3}px">${p && (!held || held.m !== p) && (!chooser || chooser.m !== p) ? iconHtml(p) : ''}</div>`; }).join('')}
            <div class="st-pcancel" data-k="6"></div></div>`;
        }
        // 手形游標（抓著寶可夢時是握拳，並顯示抓著的寶可夢）
        let hx, hy;
        if (mode === 'box') { hx = 264 + cx * 72 + 18; hy = 120 + cy * 72 - 54; }
        else if (mode === 'title') { hx = 456; hy = 30; }
        else if (mode === 'buttons') { hx = bsel === 0 ? 300 : 552; hy = -30; }
        else { const [x, y] = PSLOT[pslot]; hx = (x - 8) * 3; hy = (y - 24) * 3; }
        html += `<div class="st-hand" style="left:${hx}px;top:${hy}px;background-image:url(${Gen3.base}pc_hand.png);background-position:0 ${held || chooser ? -192 : 0}px"></div>`;
        if (held) html += `<div class="st-held" style="left:${hx - 30}px;top:${hy + 36}px">${iconHtml(held.m)}</div>`;
        // 寄放：選箱子的小視窗（原作在畫面中間的 (120,64)～(200,128)），左右箭頭換箱子
        if (chooser) {
          const n = grid[box].filter(Boolean).length;
          html += `<div class="st-held" style="left:${hx - 30}px;top:${hy + 36}px">${iconHtml(chooser.m)}</div>
            <div class="st-pick" style="background-image:url(${Gen3.base}pc_boxpick.png)"><i class="l" style="background-image:url(${Gen3.base}pc_arrow.png)"></i>
            <b>${U.esc(meta.n)}</b><span class="${n >= PER ? 'full' : ''}">${n}／${PER}</span><i class="r" style="background-image:url(${Gen3.base}pc_arrow.png)"></i></div>`;
        }
        root.innerHTML = html;
        root.querySelectorAll('.st-cell').forEach(el => { el.onclick = () => { mode = 'box'; cur = +el.dataset.i; act(); }; });
        root.querySelectorAll('.st-pslot, .st-pcancel').forEach(el => { el.onclick = () => { mode = 'party'; pslot = +el.dataset.k; act(); }; });
        root.querySelector('.st-tab').onclick = () => { mode = 'buttons'; bsel = 0; act(); };
        root.querySelector('.st-close').onclick = () => { mode = 'buttons'; bsel = 1; act(); };
        root.querySelector('.st-title .l').onclick = () => switchBox(-1);
        root.querySelector('.st-title .r').onclick = () => switchBox(1);
        const pk = root.querySelector('.st-pick');
        if (pk) {
          pk.querySelector('.l').onclick = e => { e.stopPropagation(); switchBox(-1); };
          pk.querySelector('.r').onclick = e => { e.stopPropagation(); switchBox(1); };
          pk.onclick = () => drop();
        }
      };
      const switchBox = d => { box = (box + d + grid.length) % grid.length; Sound.sfx('select'); draw(); };
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
      const say = async t => { await UI.say(t); UI.hideDialog(); draw(); };
      // 領取：箱子 → 隊伍最後
      async function withdraw(m) {
        if (G.party.length >= 6) return say('隊伍已經滿了！');
        grid[m.boxPos.b][m.boxPos.i] = null;
        const j = s.box.indexOf(m); if (j >= 0) s.box.splice(j, 1);
        delete m.boxPos;
        G.party.push(m);
        Sound.sfx('select');
        grid = layout();
        await say(`領取了 ${Mon.name(m)}。`);
      }
      // 寄放（原作的流程）：選「寄放」後拎起寶可夢，畫面中間出現選箱子的小視窗，←→ 換箱子，確認後放進那個箱子的第一個空格
      function deposit(m) {
        if (G.party.length <= 1 || !ableAfter(m, null)) return say('隊伍裡至少要留一隻能戰鬥的寶可夢！');
        chooser = { m, k: G.party.indexOf(m) };
        Sound.sfx('select');
        UI.showText('要寄放到哪個箱子？');
        draw();
      }
      async function drop() {
        if (!chooser) return;
        const i = grid[box].indexOf(null);
        if (i < 0) { Sound.sfx('bump'); UI.showText('這個箱子已經滿了！\n請選別的箱子。'); return; }
        const m = chooser.m;
        chooser = null;
        Mon.heal(m);
        put({ kind: 'box', b: box, i }, m);
        G.state.party = G.state.party.filter(Boolean);
        if (pslot >= G.party.length) pslot = Math.max(0, G.party.length - 1);
        grid = layout();
        Sound.sfx('select');
        await say(`把 ${Mon.name(m)} 寄放到了 ${s.boxMeta[box].n}。`);
      }
      const cancelChooser = () => { chooser = null; UI.hideDialog(); Sound.sfx('select'); draw(); };
      async function act() {
        if (mode === 'buttons') {
          if (bsel === 1) return tryClose();
          if (held && held.from.kind === 'party') return; // 抓著隊伍的寶可夢時不能收起隊伍面板
          partyOpen = !partyOpen;
          mode = partyOpen ? 'party' : 'buttons';
          Sound.sfx('select');
          return draw();
        }
        if (mode === 'title') {
          const c = await UI.choose(['換桌布', '改箱子名稱', '取消'], { prompt: `${s.boxMeta[box].n}` });
          if (c === 0) { const i = await UI.list({ title: '桌布', rows: WALLS.map(w => WALL_ZH[w]) }); if (i >= 0) s.boxMeta[box].wp = WALLS[i]; }
          if (c === 1) { const n = await UI.input('箱子的名稱：', s.boxMeta[box].n, { cancel: true }); if (n) s.boxMeta[box].n = n.slice(0, 8); }
          UI.hideDialog(); draw(); return;
        }
        if (mode === 'party' && pslot === 6) { // CANCEL
          if (option === 'deposit') return tryClose();
          partyOpen = false; mode = 'buttons'; bsel = 0; Sound.sfx('select'); return draw();
        }
        const w = here();
        const target = mode === 'party' ? G.party[pslot] : grid[box][cur];
        if (held) {
          if (mode === 'party' && !target) { // 隊伍的空位：放在最後
            if (held.from.kind === 'party') { held = null; draw(); return; }
            if (G.party.length >= 6) return say('隊伍已經滿了！');
            grid[held.from.b][held.from.i] = null;
            const j = s.box.indexOf(held.m); if (j >= 0) s.box.splice(j, 1);
            delete held.m.boxPos; G.party.push(held.m);
          } else {
            if (held.from.kind === 'party' && w.kind === 'box' && !ableAfter(held.m, target)) return say('隊伍裡至少要留一隻能戰鬥的寶可夢！');
            const a = held.from, other = target;
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
        // 選單：依用法不同（原作：領取時「領取／查看能力／標記／取消」，寄放時「寄放／……」，移動時「移動／……」）
        const first = option === 'withdraw' && w.kind === 'box' ? '領取' : option === 'deposit' && w.kind === 'party' ? '寄放' : '移動';
        const c = await UI.choose([first, '查看能力', '標記', '取消'], { prompt: `要對 ${Mon.name(target)} 做什麼？` });
        UI.hideDialog();
        if (c === 0) {
          if (first === '領取') return withdraw(target);
          if (first === '寄放') return deposit(target);
          if (w.kind === 'party' && G.party.length <= 1) return say('隊伍裡至少要有一隻寶可夢！');
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
      const tryClose = () => {
        if (held) { held = null; draw(); return; }
        clearInterval(scroll);
        pop(); root.remove(); res();
      };
      const onKey = e => {
        const k = { w: 'ArrowUp', s: 'ArrowDown', a: 'ArrowLeft', d: 'ArrowRight' }[e.key] || e.key;
        if (e.repeat && !k.startsWith('Arrow')) return;
        if (chooser) { // 選箱子
          if (k === 'ArrowLeft') switchBox(-1);
          else if (k === 'ArrowRight') switchBox(1);
          else if (UI.isOk(e)) drop();
          else if (UI.isNo(e)) cancelChooser();
          return;
        }
        if (mode === 'party') {
          if (k === 'ArrowUp') pslot = pslot === 0 ? 0 : pslot === 1 ? 6 : pslot - 1;
          else if (k === 'ArrowDown') pslot = pslot === 0 ? 0 : pslot === 6 ? 1 : pslot + 1;
          else if (k === 'ArrowLeft') pslot = 0;
          else if (k === 'ArrowRight') { if (pslot === 0) pslot = 1; else if (option !== 'deposit') { mode = 'box'; cur = 0; } }
          else if (UI.isOk(e)) { act(); return; }
          else if (UI.isNo(e)) { if (held) { held = null; draw(); } else if (option === 'deposit') tryClose(); else { partyOpen = false; mode = 'buttons'; bsel = 0; draw(); } return; }
          else return;
          draw(); return;
        }
        if (k === 'ArrowLeft') {
          if (mode === 'title') switchBox(-1);
          else if (mode === 'buttons') bsel = 0;
          else if (mode === 'box') { if (cur % COLS === 0) { switchBox(-1); cur += COLS - 1; } else cur--; }
        } else if (k === 'ArrowRight') {
          if (mode === 'title') switchBox(1);
          else if (mode === 'buttons') bsel = 1;
          else if (cur % COLS === COLS - 1) { switchBox(1); cur -= COLS - 1; } else cur++;
        } else if (k === 'ArrowUp') {
          if (mode === 'box') { if (cur < COLS) mode = 'title'; else cur -= COLS; }
          else if (mode === 'title') { mode = 'buttons'; bsel = 0; }
          else if (mode === 'buttons') { mode = 'box'; cur = PER - COLS + (bsel ? COLS - 1 : 0); }
        } else if (k === 'ArrowDown') {
          if (mode === 'title') { mode = 'box'; cur = cur % COLS; }
          else if (mode === 'buttons') { mode = 'title'; }
          else if (mode === 'box') { if (cur + COLS < PER) cur += COLS; else { mode = 'buttons'; bsel = cur % COLS < 3 ? 0 : 1; } }
        } else if (k === 'q' || k === 'Q' || k === 'PageUp') { switchBox(-1); return; }
        else if (k === 'e' || k === 'E' || k === 'PageDown') { switchBox(1); return; }
        else if (k === 'p' || k === 'P') { mode = 'buttons'; bsel = 0; act(); return; }
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
