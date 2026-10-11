// 綠寶石版能力頁（graphics/summary_screen）：資料、能力、招式三頁；←→ 換頁、↑↓ 換寶可夢
// 能力頁按 Z 切換顯示 能力值 → 個體值 → 努力值；招式頁按 Z 進入選擇，可查看說明並交換順序
const SummaryUI = (() => {
  const PAGES = ['寶可夢資訊', '寶可夢能力', '戰鬥招式'];
  const CAT = { ph: '物理', sp: '特殊', st: '變化' };

  function show(list, idx = 0) {
    return new Promise(res => {
      let page = 0, k = idx, mode = 0, sel = -1, swap = -1;
      const root = document.createElement('div');
      root.id = 'summary';
      document.getElementById('game').appendChild(root);
      const draw = () => {
        const m = list[k], s = POKEDEX[m.sp], st = Mon.stats(m);
        const nat = m.mint ?? m.nat, up = NAT_STAT[Math.floor(nat / 5)], down = NAT_STAT[nat % 5];
        const g = m.gender === 'm' ? '<i class="gm">♂</i>' : m.gender === 'f' ? '<i class="gf">♀</i>' : '';
        let html = `<div class="sm-bg" style="background-image:url(${Gen3.base}sum_${['info', 'skills', 'moves'][page]}.png)"></div>
          <div class="sm-title">${PAGES[page]}</div>${[285, 330, 378].map((x, i) => `<i class="sm-dot${i === page ? ' on' : ''}" style="left:${x}px"></i>`).join('')}
          <div class="sm-pic"><img src="${monSprite(m, false).url}" onerror="this.onerror=null;this.src='${Mon.spriteOf(m, { shiny: m.shiny })}'"></div>
          <div class="sm-lv">Lv${m.lv}</div>${page < 2 ? `<div class="sm-nm">${U.esc(Mon.name(m))}${g}</div>
          <div class="sm-ball">No.${String(m.sp).padStart(3, '0')}</div>` : ''}`;
        if (page === 0) {
          const next = m.lv >= 100 ? 0 : Mon.expFor(s.gr, m.lv + 1) - m.exp;
          html += `<div class="sm-r1">${U.esc(s.n)}${m.shiny ? '　✨' : ''}<span class="sm-ot">親密度 ${m.happy}</span></div>
            <div class="sm-r2">${Mon.types(m).map(typeTag).join('')}${m.st ? ' ' + UI.statusTag(m.st) : ''}<span class="sm-tera">太晶 ${typeTag(Mon.teraType(m))}</span></div>
            <div class="sm-r3">${U.esc(Abil.name(m.ability))}${Abil.supported(m.ability) ? '' : '<small>（效果未實作）</small>'}</div>
            <div class="sm-r4">${U.esc(Abil.desc(m.ability))}</div>
            <div class="sm-memo"><b>${NATURES[nat]}</b>性格${m.mint !== undefined && m.mint !== m.nat ? `（原本是${NATURES[m.nat]}，薄荷改變了成長）` : '。'}<br>
              努力值合計 ${(m.ev || []).reduce((a, b) => a + b, 0)}／510　距離升級 ${next}</div>`;
        } else if (page === 1) {
          const label = ['能力值', '個體值', '努力值'][mode];
          const val = i => mode === 0 ? (i === 0 ? `${Math.max(0, m.hp)}/${st[0]}` : st[i]) : mode === 1 ? (m.ivHT?.[i] ? '★31' : m.iv[i]) : (m.ev?.[i] || 0);
          const cls = i => (up !== down && i === up ? ' up' : up !== down && i === down ? ' down' : '');
          const next = m.lv >= 100 ? 0 : Mon.expFor(s.gr, m.lv + 1) - m.exp;
          const lo = Mon.expFor(s.gr, m.lv), hi = m.lv >= 100 ? lo + 1 : Mon.expFor(s.gr, m.lv + 1);
          html += `<div class="sm-item">${m.item ? U.esc(Held.name(m.item)) : '沒有'}</div><div class="sm-ribbon">${label}　<small>Z 切換</small></div>
            ${[0, 1, 2].map(r => `<div class="sm-sl${cls(r)}" style="top:${(58 + r * 16) * 3}px">${STAT_ZH[r]}</div><div class="sm-sv" style="top:${(58 + r * 16) * 3}px">${val(r)}</div>`).join('')}
            ${[3, 4, 5].map((i, r) => `<div class="sm-sl2${cls(i)}" style="top:${(58 + r * 16) * 3}px">${STAT_ZH[i]}</div><div class="sm-sv2" style="top:${(58 + r * 16) * 3}px">${val(i)}</div>`).join('')}
            <div class="sm-el" style="top:${114 * 3}px">經驗值</div><div class="sm-ev" style="top:${114 * 3}px">${m.exp}</div>
            <div class="sm-el" style="top:${128 * 3}px">下一級</div><div class="sm-ev" style="top:${128 * 3}px">${next}</div>
            <div class="sm-exp"><div style="width:${U.clamp((m.exp - lo) / (hi - lo), 0, 1) * 100}%"></div></div>`;
        } else {
          const rows = m.moves.map((x, i) => {
            const d = MOVES[x.id];
            return `<div class="sm-mv${i === sel ? ' sel' : ''}${i === swap ? ' swap' : ''}" style="top:${(33 + i * 16) * 3}px" data-i="${i}">
              <span class="t">${typeTag(d.t)}</span><span class="n">${U.esc(d.n)}${SUPPORT_ZH[md(x.id).support]}</span><span class="pp">PP ${x.pp}/${d.pp}</span></div>`;
          }).join('');
          const d = sel >= 0 ? MOVES[m.moves[sel].id] : null;
          html += rows + (d ? `<div class="sm-pw">威力<b>${d.p || '－'}</b></div><div class="sm-ac">命中<b>${d.a || '－'}</b></div>
            <div class="sm-desc"><b>${CAT[d.c] || ''}</b>　${U.esc(d.d || '')}</div>` : `<div class="sm-desc">按 Z 查看招式的說明${m.moves.length > 1 ? '，選擇後可以交換順序' : ''}。</div>`);
        }
        root.innerHTML = html;
        root.querySelectorAll('.sm-mv').forEach(el => { el.onclick = () => { pickMove(+el.dataset.i); }; });
      };
      const pickMove = i => {
        const m = list[k];
        if (sel < 0 || swap < 0) { if (sel === i) { swap = i; } else sel = i; draw(); return; }
        if (swap !== i) { const a = m.moves[swap]; m.moves[swap] = m.moves[i]; m.moves[i] = a; Sound.sfx('select'); }
        swap = -1; sel = i; draw();
      };
      const close = () => { pop(); root.remove(); res(); };
      const onKey = e => {
        const key = e.key, m = list[k];
        if (page === 2 && sel >= 0) {
          if (key === 'ArrowUp' || key === 'w') sel = (sel + m.moves.length - 1) % m.moves.length;
          else if (key === 'ArrowDown' || key === 's') sel = (sel + 1) % m.moves.length;
          else if (UI.isOk(e)) { if (e.repeat) return; if (swap < 0) swap = sel; else pickMove(sel); }
          else if (UI.isNo(e)) { if (e.repeat) return; if (swap >= 0) swap = -1; else sel = -1; }
          else return;
          draw(); return;
        }
        if (key === 'ArrowRight' || key === 'd') { if (page < 2) { page++; Sound.sfx('select'); } }
        else if (key === 'ArrowLeft' || key === 'a') { if (page > 0) { page--; Sound.sfx('select'); } }
        else if (key === 'ArrowUp' || key === 'w') { if (list.length > 1) { k = (k + list.length - 1) % list.length; playCry(list[k].sp); } }
        else if (key === 'ArrowDown' || key === 's') { if (list.length > 1) { k = (k + 1) % list.length; playCry(list[k].sp); } }
        else if (UI.isOk(e)) {
          if (e.repeat) return;
          if (page === 1) mode = (mode + 1) % 3;
          else if (page === 2) sel = 0;
          else return close();
        } else if (UI.isNo(e)) { if (!e.repeat) close(); return; }
        else return;
        draw();
      };
      const pop = UI.pushKey(onKey);
      playCry(list[k].sp);
      draw();
    });
  }
  // 學習新招式時選擇要忘記的招式（綠寶石：能力頁的招式頁，新招式排在第 5 列）
  // 回傳要忘記的招式位置 0～3；選新招式或按 B 回傳 -1（不學）
  function forget(m, mid) {
    return new Promise(res => {
      const ids = [...m.moves.map(x => x.id), mid];
      let sel = 0;
      const root = document.createElement('div');
      root.id = 'summary';
      root.className = 'sm-forget';
      document.getElementById('game').appendChild(root);
      const draw = () => {
        const rows = ids.map((id, i) => {
          const d = MOVES[id], pp = i < 4 ? `${m.moves[i].pp}/${d.pp}` : `${d.pp}/${d.pp}`;
          return `<div class="sm-mv${i === sel ? ' sel' : ''}${i === 4 ? ' new' : ''}" style="top:${(33 + i * 16) * 3}px" data-i="${i}">
            <span class="t">${typeTag(d.t)}</span><span class="n">${U.esc(d.n)}${SUPPORT_ZH[md(id).support]}</span><span class="pp">PP ${pp}</span></div>`;
        }).join('');
        const d = MOVES[ids[sel]];
        root.innerHTML = `<div class="sm-bg" style="background-image:url(${Gen3.base}sum_moves.png)"></div>
          <div class="sm-title">戰鬥招式</div>${[285, 330, 378].map((x, i) => `<i class="sm-dot${i === 2 ? ' on' : ''}" style="left:${x}px"></i>`).join('')}
          <div class="sm-pic"><img src="${monSprite(m, false).url}" onerror="this.onerror=null;this.src='${Mon.spriteOf(m, { shiny: m.shiny })}'"></div>
          <div class="sm-lv">Lv${m.lv}</div><div class="sm-newbox"></div>${rows}
          <div class="sm-pw">威力<b>${d.p || '－'}</b></div><div class="sm-ac">命中<b>${d.a || '－'}</b></div>
          <div class="sm-desc"><b>${CAT[d.c] || ''}</b>　${U.esc(d.d || '')}</div>`;
        root.querySelectorAll('.sm-mv').forEach(el => { el.onclick = ev => { ev.stopPropagation(); const i = +el.dataset.i; if (i === sel) done(i); else { sel = i; Sound.sfx('select'); draw(); } }; });
      };
      const done = i => { pop(); root.remove(); Sound.sfx('select'); res(i < 4 ? i : -1); };
      const onKey = e => {
        const key = e.key;
        if (key === 'ArrowUp' || key === 'w') { sel = (sel + 4) % 5; Sound.sfx('select'); draw(); }
        else if (key === 'ArrowDown' || key === 's') { sel = (sel + 1) % 5; Sound.sfx('select'); draw(); }
        else if (UI.isOk(e)) { if (!e.repeat) done(sel); }
        else if (UI.isNo(e)) { if (!e.repeat) done(4); }
      };
      const pop = UI.pushKey(onKey);
      draw();
    });
  }
  return { show, forget };
})();
