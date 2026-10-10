// 綠寶石版背包畫面（pokeemerald graphics/bag：背景、背包圖、道具圖示）
// 左右切換口袋、上下選擇道具；回傳選到的道具 id 或 null
const BagUI = (() => {
  const POCKETS = [
    { n: '道具', frame: 1, has: id => !isBall(id) && !isBerry(id) && !isKey(id) && !isTM(id) },
    { n: '精靈球', frame: 2, has: id => isBall(id) },
    { n: '招式學習器', frame: 3, has: id => isTM(id) },
    { n: '樹果', frame: 4, has: id => isBerry(id) },
    { n: '重要物品', frame: 5, has: id => isKey(id) },
  ];
  const isBall = id => ITEMS[id] && ITEMS[id].kind === 'ball';
  const isBerry = id => id.endsWith('-berry');
  const isKey = id => ITEMS[id] && ITEMS[id].kind === 'key';
  const isTM = id => ITEMS[id] && ITEMS[id].kind === 'tm';
  let pocket = 0;
  const cursor = [0, 0, 0, 0, 0];

  function icon(id) {
    const i = Gen3.on && GEN3.itemIcons ? GEN3.itemIcons[isTM(id) ? 'tm' : id] : undefined;
    if (i !== undefined) {
      const x = (i % 16) * 24, y = Math.floor(i / 16) * 24;
      return `<div class="bag-ic" style="background-image:url(${Gen3.base}item_icons.png);background-position:${-x * 3}px ${-y * 3}px;background-size:${16 * 24 * 3}px auto"></div>`;
    }
    return `<img class="bag-ic" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${id}.png">`;
  }

  function pick() {
    return new Promise(res => {
      const root = document.createElement('div');
      root.id = 'bag';
      root.innerHTML = `<div class="bag-name"></div><div class="bag-dots"></div><div class="bag-sprite"></div>
        <div class="bag-icon"></div><div class="bag-desc"></div><div class="bag-list"></div><div class="bag-money"></div>`;
      document.getElementById('game').appendChild(root);
      const $ = s => root.querySelector(s);
      let items = [];
      const draw = () => {
        const P = POCKETS[pocket];
        items = Object.keys(G.state.bag).filter(id => ITEMS[id] && G.state.bag[id] > 0 && P.has(id));
        const n = items.length + 1; // 最後一行是「關閉背包」
        cursor[pocket] = U.clamp(cursor[pocket], 0, n - 1);
        const cur = cursor[pocket];
        $('.bag-name').textContent = P.n;
        $('.bag-dots').innerHTML = POCKETS.map((_, i) => `<i class="${i === pocket ? 'on' : ''}"></i>`).join('');
        $('.bag-sprite').style.backgroundPosition = `0 ${-P.frame * 192}px`;
        $('.bag-money').textContent = `${G.state.money} 元`;
        // 清單一次顯示 8 行，游標附近捲動
        const top = U.clamp(cur - 3, 0, Math.max(0, n - 8));
        let html = '';
        for (let i = top; i < Math.min(n, top + 8); i++) {
          const id = items[i];
          const label = id ? U.esc(ITEMS[id].n) : '關閉背包';
          const cnt = id && !isKey(id) ? `<span class="cnt">×${G.state.bag[id]}</span>` : '';
          html += `<div class="bag-row${i === cur ? ' sel' : ''}" data-i="${i}">${label}${cnt}</div>`;
        }
        $('.bag-list').innerHTML = html;
        const id = items[cur];
        $('.bag-icon').innerHTML = id ? icon(id) : '';
        $('.bag-desc').textContent = id ? (ITEMS[id].d || '') : '關上背包。';
        root.querySelectorAll('.bag-row').forEach(r => { r.onclick = () => { cursor[pocket] = +r.dataset.i; choose(); }; });
      };
      const close = v => { pop(); root.remove(); res(v); };
      const choose = () => {
        const id = items[cursor[pocket]];
        Sound.sfx('select');
        close(id || null);
      };
      const onKey = e => {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a') { pocket = (pocket + POCKETS.length - 1) % POCKETS.length; Sound.sfx('select'); draw(); }
        else if (k === 'ArrowRight' || k === 'd') { pocket = (pocket + 1) % POCKETS.length; Sound.sfx('select'); draw(); }
        else if (k === 'ArrowUp' || k === 'w') { cursor[pocket] = Math.max(0, cursor[pocket] - 1); draw(); }
        else if (k === 'ArrowDown' || k === 's') { cursor[pocket] = Math.min(items.length, cursor[pocket] + 1); draw(); }
        else if (UI.isOk(e) && !e.repeat) choose();
        else if (UI.isNo(e) && !e.repeat) close(null);
      };
      const pop = UI.pushKey(onKey);
      // 點擊左右兩側切換口袋
      $('.bag-sprite').onclick = () => { pocket = (pocket + 1) % POCKETS.length; draw(); };
      draw();
    });
  }
  return { pick };
})();
