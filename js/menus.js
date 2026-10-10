// 綠寶石版介面：隊伍、圖鑑、訓練家卡片（素材由 tools/build_ui.py 從 pokeemerald 產生）
// 位置依 pokeemerald 的視窗與座標資料（GBA 240×160，畫面放大 3 倍）

// 寶可夢小圖示：No.1–386 用綠寶石的圖示（2 格動畫），之後用第七世代圖示，再之後用一般圖
function monIcon(sp, shiny, form = null) {
  const n = Gen3.on && GEN3.ui && GEN3.ui.icons || 0;
  if (form && window.FORMS && FORMS[form]) return `<img class="micon big" src="${Mon.sprite(FORMS[form].id, { shiny })}">`;
  if (sp <= n) {
    const k = sp - 1, x = (k % 32) * 96, y = Math.floor(k / 32) * 192;
    return `<i class="micon g3" style="background-image:url(${Gen3.base}mon_icons.png);--x:${-x}px;--y:${-y}px"></i>`;
  }
  const fb = Mon.sprite(sp, { shiny });
  const url = sp <= 807 ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${sp}.png` : fb;
  return `<img class="micon${sp > 807 ? ' big' : ''}" src="${url}" onerror="this.onerror=null;this.classList.add('big');this.src='${fb}'">`;
}

function hpColor(r) { return r > .5 ? 'g' : r > .2 ? 'y' : 'r'; }

const PartyUI = (() => {
  // 格子位置（party_menu.h sSinglePartyMenuWindowTemplate、sPartyMenuSpriteCoords）
  const MAIN = { x: 8, y: 24 }, WIDE = k => ({ x: 96, y: 8 + 24 * (k - 1) });

  // opts：msg 提示文字、can(m) 可否選擇、start 起始位置、cancel 可否取消、active 戰鬥中的位置
  function pick({ msg = '請選擇一隻寶可夢。', can = null, start = 0, cancel = true, active = -1, switching = -1 } = {}) {
    return new Promise(res => {
      const root = document.createElement('div');
      root.id = 'party';
      document.getElementById('game').appendChild(root);
      const n = G.party.length;
      let cur = U.clamp(start, 0, n - 1);
      const box = (m, k) => {
        const main = k === 0, p = main ? MAIN : WIDE(k);
        const sel = k === cur;
        if (!m) return `<div class="pslot wide" style="left:${p.x * 3}px;top:${p.y * 3}px;background-image:url(${Gen3.base}party_wide_empty.png)"></div>`;
        const max = Mon.maxHp(m), hp = Math.max(0, m.hp), r = hp / max;
        const st = k === switching ? 'switch' : m.hp <= 0 ? (sel ? 'faintsel' : 'faint') : sel ? 'sel' : 'normal';
        const dis = can && !can(m);
        const g = m.gender === 'm' ? '<i class="gm">♂</i>' : m.gender === 'f' ? '<i class="gf">♀</i>' : '';
        return `<div class="pslot ${main ? 'main' : 'wide'}${dis ? ' dis' : ''}${sel ? ' sel' : ''}" data-k="${k}" style="left:${p.x * 3}px;top:${p.y * 3}px;background-image:url(${Gen3.base}party_${main ? 'main' : 'wide'}_${st}.png)">
          <div class="pball${sel ? ' open' : ''}" style="background-image:url(${Gen3.base}party_ball.png)"></div>
          ${monIcon(m.sp, m.shiny, m.form)}
          ${m.item ? '<div class="pitem"></div>' : ''}
          <div class="pname">${U.esc(Mon.name(m))}</div>
          <div class="plv">${m.st ? UI.statusTag(m.st) : 'Lv' + m.lv}${g}</div>
          ${k === active ? '<div class="ptag">戰鬥中</div>' : ''}
          ${dis ? '<div class="pdesc">不能使用</div>' : ''}
          <div class="phpbar"><div class="${hpColor(r)}" style="width:${r * 100}%"></div></div>
          <div class="php">${hp}<span>/</span>${max}</div>
        </div>`;
      };
      const draw = () => {
        let html = `<div class="pmsg">${U.esc(msg)}</div>`;
        for (let k = 0; k < 6; k++) html += box(G.party[k], k);
        if (cancel) html += `<div class="pcancel${cur === n ? ' sel' : ''}">取消</div>`;
        root.innerHTML = html;
        root.querySelectorAll('.pslot[data-k]').forEach(el => { el.onclick = () => { cur = +el.dataset.k; choose(); }; });
        const c = root.querySelector('.pcancel');
        if (c) c.onclick = () => close(-1);
      };
      const close = v => { pop(); root.remove(); res(v); };
      const choose = () => {
        if (cur === n) return close(-1);
        if (can && !can(G.party[cur])) { Sound.sfx('bump'); return; }
        Sound.sfx('select');
        close(cur);
      };
      const last = cancel ? n : n - 1;
      const onKey = e => {
        const k = e.key;
        if (k === 'ArrowDown' || k === 's') cur = cur >= last ? 0 : cur + 1;
        else if (k === 'ArrowUp' || k === 'w') cur = cur <= 0 ? last : cur - 1;
        else if (k === 'ArrowLeft' || k === 'a') cur = 0;
        else if (k === 'ArrowRight' || k === 'd') { if (cur === 0 && n > 1) cur = 1; else return; }
        else if (UI.isOk(e)) { if (!e.repeat) choose(); return; }
        else if (UI.isNo(e)) { if (cancel && !e.repeat) close(-1); return; }
        else return;
        Sound.sfx('select');
        draw();
      };
      const pop = UI.pushKey(onKey);
      draw();
    });
  }
  return { pick };
})();

// 圖鑑：清單（左邊大圖、右邊捲動清單，選擇列固定在中間）與資料頁
const DexUI = (() => {
  let curId = 1;
  const ROWS = 9; // 畫面上的列數（選擇列在第 5 列）
  // q：搜尋條件（Search）；回傳選到的編號、{ filter: true }（按 F 開啟搜尋）或 null
  function list(q = Search.empty()) {
    return new Promise(res => {
      const ids = Object.keys(POKEDEX).map(Number).sort((a, b) => a - b).filter(id => Search.matchSpecies(id, q));
      const [seen, caught] = Game.dexCount();
      let cur = Math.max(0, ids.indexOf(curId));
      if (ids.indexOf(curId) < 0) { const k = ids.findIndex(id => id > curId); cur = k < 0 ? Math.max(0, ids.length - 1) : k; }
      const root = document.createElement('div');
      root.id = 'dex';
      root.innerHTML = `<div class="dx-count"><div>發現</div><b>${seen}</b><div>捕捉</div><b>${caught}</b></div>
        <div class="dx-pic"></div><div class="dx-list"></div><div class="dx-hint">${Search.active(q) ? `🔍 ${U.esc(Search.label(q))}（${ids.length}）　` : ''}↑↓ 選擇　←→ 翻頁　Z 查看　F 搜尋　X 關閉</div>`;
      document.getElementById('game').appendChild(root);
      const $ = s => root.querySelector(s);
      const draw = () => {
        const id = ids[cur];
        curId = id || curId;
        if (!ids.length) { $('.dx-pic').innerHTML = ''; $('.dx-list').innerHTML = '<div class="dx-row">（沒有符合的寶可夢）</div>'; return; }
        $('.dx-pic').innerHTML = G.state.seen[id] ? `<img src="${Mon.sprite(id)}">` : '';
        let html = '';
        for (let r = 0; r < ROWS; r++) {
          const i = cur + r - 4;
          if (i < 0 || i >= ids.length) { html += '<div class="dx-row"></div>'; continue; }
          const k = ids[i], sn = G.state.seen[k];
          html += `<div class="dx-row${r === 4 ? ' sel' : ''}" data-i="${i}">${G.state.caught[k] ? `<i class="dx-ball" style="background-image:url(${Gen3.base}dex_ball.png)"></i>` : '<i></i>'}<span class="no">${String(k).padStart(3, '0')}</span><span>${sn ? U.esc(POKEDEX[k].n) : '－－－－－'}</span></div>`;
        }
        $('.dx-list').innerHTML = html;
        root.querySelectorAll('.dx-row[data-i]').forEach(el => { el.onclick = () => { const i = +el.dataset.i; if (i === cur) choose(); else { cur = i; draw(); } }; });
      };
      const close = v => { pop(); root.remove(); res(v); };
      const choose = () => {
        if (!ids.length || !G.state.seen[ids[cur]]) { Sound.sfx('bump'); return; }
        Sound.sfx('select');
        close(ids[cur]);
      };
      const onKey = e => {
        const k = e.key;
        if (k === 'ArrowDown' || k === 's') cur = Math.min(ids.length - 1, cur + 1);
        else if (k === 'ArrowUp' || k === 'w') cur = Math.max(0, cur - 1);
        else if (k === 'ArrowRight' || k === 'd' || k === 'PageDown') cur = Math.min(ids.length - 1, cur + 7);
        else if (k === 'ArrowLeft' || k === 'a' || k === 'PageUp') cur = Math.max(0, cur - 7);
        else if (UI.isOk(e)) { if (!e.repeat) choose(); return; }
        else if (UI.isNo(e)) { if (!e.repeat) close(null); return; }
        else if (k === 'f' || k === 'F') { if (!e.repeat) close({ filter: true }); return; }
        else return;
        draw();
      };
      root.querySelector('.dx-hint').onclick = () => close({ filter: true });
      root.addEventListener('wheel', e => { e.preventDefault(); cur = U.clamp(cur + Math.sign(e.deltaY), 0, ids.length - 1); draw(); }, { passive: false });
      const pop = UI.pushKey(onKey);
      draw();
    });
  }

  // 資料頁：上方分頁（分布、叫聲、大小、返回）；caught=false 時只顯示基本資料
  function entry(id) {
    return new Promise(res => {
      const s = POKEDEX[id], caught = G.state.caught[id];
      const root = document.createElement('div');
      root.id = 'dex';
      root.className = 'info';
      const tabs = ['分布', '叫聲', '能力', '返回'];
      let tab = -1;
      const where = () => {
        const reg = Object.entries(REGIONS).find(([, r]) => r.gen === s.g);
        if (!s.lg && World.habitats) {
          const hs = World.habitats(id);
          if (hs.length) return hs.map(h => `${REGIONS[h.region].n}地區・${U.esc(h.town.name)}附近的${BIOME_ZH[h.biome]}（${ECO_ZH[h.slot]}）`).join('<br>');
          return '附近沒有發現牠的棲息地。可能需要進化或用其他方式取得。';
        }
        return s.lg ? `${s.lg === 1 ? '傳說' : '幻之'}寶可夢：世界上只有一隻，就在${reg ? reg[1].n : ''}地區的某處。` : `主要棲息在${reg ? reg[1].n + '地區' : '各地'}。${s.t.includes('water') ? '在水面上常常可以遇到。' : ''}`;
      };
      const stats = () => {
        const ey = (s.ey || []).map((v, k) => v ? `${STAT_ZH[k]}+${v}` : '').filter(Boolean).join(' ');
        return `<table class="dx-stats">${s.s.map((v, k) => `<tr><td>${STAT_ZH[k]}</td><td>${v}</td><td><div class="sbar"><div style="width:${Math.min(100, v / 1.6)}%"></div></div></td></tr>`).join('')}</table>
          <div class="dx-small">總和 ${Mon.bst(id)}　捕捉率 ${s.cr}　努力值 ${ey || '無'}<br>特性：${(s.ab || []).map(([a, h]) => U.esc(Abil.name(a)) + (h ? '（隱藏）' : '')).join('／')}</div>`;
      };
      const evo = () => (s.ev || []).map(e => `→ ${G.state.seen[e.to] ? POKEDEX[e.to].n : '？？？'}：${(e.c || [e]).map(c => Mon.evoText(c)).join(' 或 ')}`).join('<br>');
      const draw = () => {
        const body = tab === 2 ? stats() : `<p>${caught ? U.esc(s.fl) : '捕捉後可以查看更多資料。'}</p>${caught && evo() ? `<div class="dx-small">${evo()}</div>` : ''}`;
        root.innerHTML = `<div class="dx-tabs">${tabs.map((t, i) => `<span class="${i === tab ? 'on' : ''}" data-t="${i}">${t}</span>`).join('')}</div>
          <div class="dx-sprite"><img src="${Mon.sprite(id)}"></div>
          <div class="dx-no">No.${String(id).padStart(3, '0')}</div><div class="dx-name">${U.esc(s.n)}</div>
          <div class="dx-gen">${U.esc(s.gen)}</div>
          <div class="dx-types">${s.t.map(typeTag).join('')}</div>
          <div class="dx-l1"><span>世代</span><b>第 ${s.g} 世代</b></div>
          ${id <= (GEN3.ui.icons || 0) ? `<i class="dx-foot" style="background-image:url(${Gen3.base}mon_feet.png);background-position:${-((id - 1) % 32) * 48}px ${-Math.floor((id - 1) / 32) * 48}px"></i>` : ''}
          <div class="dx-l2"><span>重量</span><b>${caught ? (s.w / 10).toFixed(1) : '???.?'} kg</b></div>
          <div class="dx-text">${tab === 0 ? `<p>${where()}</p>` : body}</div>`;
        root.querySelectorAll('.dx-tabs span').forEach(el => { el.onclick = () => act(+el.dataset.t); });
      };
      const close = () => { pop(); root.remove(); res(); };
      const act = t => {
        if (t === 3) return close();
        if (t === 1) { if (typeof playCry === 'function') playCry(id); }
        tab = tab === t && t !== 1 ? -1 : t;
        Sound.sfx('select');
        draw();
      };
      const onKey = e => {
        if (e.repeat) return;
        const k = e.key;
        if (k === 'ArrowRight' || k === 'd') { tab = (tab + 1) % 4; draw(); }
        else if (k === 'ArrowLeft' || k === 'a') { tab = (tab + 3) % 4; draw(); }
        else if (UI.isOk(e)) { if (tab < 0) close(); else act(tab); }
        else if (UI.isNo(e)) close();
      };
      document.getElementById('game').appendChild(root);
      const pop = UI.pushKey(onKey);
      if (typeof playCry === 'function') playCry(id);
      draw();
    });
  }
  return { list, entry };
})();

// 訓練家卡片：正面（名字、零用錢、圖鑑、時間、徽章）與背面（紀錄），A 翻面
const CardUI = (() => {
  // 星數（依 CountPlayerTrainerStars 改編）：成為冠軍、出身地區的寶可夢全部捕捉、九個地區的冠軍、全國圖鑑完成
  function stars() {
    const s = G.state, gen = REGIONS[s.region].gen;
    const genIds = Object.values(POKEDEX).filter(p => p.g === gen).map(p => p.id);
    let n = 0;
    if (Object.keys(s.champs).length) n++;
    if (genIds.every(id => s.caught[id])) n++;
    if (REGION_KEYS.every(r => s.champs[r])) n++;
    if (Object.keys(POKEDEX).every(id => s.caught[id])) n++;
    return n;
  }
  function show() {
    return new Promise(res => {
      const s = G.state, [, caught] = Game.dexCount(), st = stars();
      const ms = s.playMs, hh = Math.floor(ms / 3600000), mm = Math.floor(ms / 60000) % 60;
      // 徽章欄顯示目前所在地區（沒有道館資料的地區顯示出身地區）
      const reg = (World.regionAt && G.state && World.regionAt(s.x, s.y)) || s.region;
      const got = s.badges[reg] || [];
      const root = document.createElement('div');
      root.id = 'card';
      let back = false;
      const id = String((s.seed % 65536) + 100000).slice(-5);
      const draw = () => {
        const bg = `${Gen3.base}card_${back ? 'back' : 'front'}_${st}.png`;
        if (!back) {
          root.innerHTML = `<div class="cd-face" style="background-image:url(${bg})">
            <div class="cd-id">IDNo.${id}</div>
            <div class="cd-row" style="top:132px">${U.esc(s.name)}</div>
            <div class="cd-row" style="top:202px">零用錢</div><div class="cd-val" style="top:202px">${s.money}元</div>
            <div class="cd-row" style="top:251px">寶可夢圖鑑</div><div class="cd-val" style="top:251px">${caught}</div>
            <div class="cd-row" style="top:299px">遊玩時間</div><div class="cd-val" style="top:299px">${hh}:${String(mm).padStart(2, '0')}</div>
            <div class="cd-stars">${`<i style="background-image:url(${Gen3.base}card_star.png)"></i>`.repeat(st)}</div>
            <div class="cd-pic" style="background-image:url(${Gen3.base}trainer_brendan.png)"></div>
            <div class="cd-region">${REGIONS[reg].n}</div>
            ${(LEADERS[reg] || []).slice(0, 8).map((l, i) => got.includes(i) ? `<i class="cd-badge" title="${U.esc(l[0])}" style="left:${(32 + 24 * i) * 3}px;background-image:url(${Gen3.base}card_badges${reg === 'kanto' ? '_kanto' : ''}.png);background-position:${-i * 48}px 0"></i>` : '').join('')}
          </div>`;
        } else {
          const champs = REGION_KEYS.filter(r => s.champs[r]).map(r => REGIONS[r].n).join('、') || '—';
          const rows = [
            ['名人堂登錄', s.hofTime ? s.hofTime : '—'],
            ['冠軍地區', champs],
            ['徽章總數', `${Game.badgeCount()}／${REGION_KEYS.length * 8}`],
            ['打倒的訓練家', Object.keys(s.defeated).length],
            ['傳說的寶可夢', Object.keys(s.legendsCaught || {}).length],
          ];
          root.innerHTML = `<div class="cd-face" style="background-image:url(${bg})">
            <div class="cd-backname">${U.esc(s.name)} 的訓練家卡片</div>
            ${rows.map(([a, b], i) => `<div class="cd-brow" style="top:${(i * 16 + 33 + 8) * 3}px"><span>${a}</span><b>${U.esc(String(b))}</b></div>`).join('')}
            <div class="cd-party">${G.party.map(m => monIcon(m.sp, m.shiny, m.form)).join('')}</div>
          </div>`;
        }
        root.querySelector('.cd-face').onclick = flip;
      };
      const flip = () => {
        const f = root.querySelector('.cd-face');
        Sound.sfx('select');
        // 翻面：縮成一條線後換面再展開（原作的 Task_DoCardFlipTask）
        f.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 120, fill: 'forwards' });
        setTimeout(() => {
          back = !back; draw();
          root.querySelector('.cd-face').animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 120 });
        }, 120);
      };
      const close = () => { pop(); root.remove(); res(); };
      const onKey = e => {
        if (e.repeat) return;
        if (UI.isOk(e)) { if (back) close(); else flip(); }
        else if (UI.isNo(e)) close();
      };
      document.getElementById('game').appendChild(root);
      const pop = UI.pushKey(onKey);
      draw();
    });
  }
  return { show, stars };
})();
