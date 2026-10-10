// 綠寶石的友好商店購買畫面（src/shop.c 的視窗配置；1 格 = 8px × 3 倍）
//   左上：金錢（1,1 10×2）　右側：商品清單（14,2 15×16，每列 16px）
//   左側小框：道具圖示　左下：說明（0,13 14×6）
//   選數量時：背包裡的數量（1,11 12×2）、數量與價錢（18,11 10×2）
// 背景框 ui_shop.png 的左上是透明的，看得到後面的商店地圖（和原作一樣）
const ShopUI = (() => {
  const T = 24, ROWS = 8;
  const css = (x, y, w, h) => `left:${x * T}px;top:${y * T}px;width:${w * T}px;height:${h * T}px`;
  const yen = n => `${n} 元`;

  function open(list) {
    return new Promise(res => {
      const m = document.createElement('div');
      m.className = 'shopui';
      m.innerHTML = `
        <div class="shop-win money" style="${css(1, 1, 10, 2)}"></div>
        <div class="shop-list" style="${css(14, 2, 15, 16)}"></div>
        <div class="shop-icon"></div>
        <div class="shop-desc" style="${css(0.6, 13.4, 12.8, 5.4)}"></div>
        <div class="shop-win inbag hidden" style="${css(1, 11, 12, 2)}"></div>
        <div class="shop-win qty hidden" style="${css(18, 11, 10, 2)}"></div>
        <div class="shop-up hidden">▲</div><div class="shop-down hidden">▼</div>`;
      document.getElementById('game').appendChild(m);
      const $ = s => m.querySelector(s);
      const rows = [...list, null]; // 最後一列是「取消」
      let idx = 0, top = 0, mode = 'list', qty = 1, busy = false;

      const priceOf = id => ITEMS[id].price;
      const maxQty = id => Math.max(1, Math.min(99, Math.floor(G.state.money / priceOf(id))));
      function draw() {
        $('.money').innerHTML = `<span>金錢</span><b>${yen(G.state.money)}</b>`;
        if (idx < top) top = idx;
        if (idx >= top + ROWS) top = idx - ROWS + 1;
        $('.shop-list').innerHTML = rows.slice(top, top + ROWS).map((id, k) => {
          const i = top + k;
          const sel = i === idx ? ' sel' : '';
          return id ? `<div class="srow${sel}"><span class="n">${U.esc(ITEMS[id].n)}</span><span class="p">${yen(priceOf(id))}</span></div>`
            : `<div class="srow${sel}"><span class="n">取消</span></div>`;
        }).join('');
        $('.shop-up').classList.toggle('hidden', top === 0);
        $('.shop-down').classList.toggle('hidden', top + ROWS >= rows.length);
        const id = rows[idx];
        $('.shop-icon').innerHTML = id && typeof BagUI !== 'undefined' ? BagUI.icon(id) : '';
        $('.shop-desc').textContent = id ? ITEMS[id].d || '' : '結束購物。';
        const q = mode === 'qty';
        $('.inbag').classList.toggle('hidden', !q);
        $('.qty').classList.toggle('hidden', !q);
        if (q) {
          $('.inbag').innerHTML = `<span>背包裡有</span><b>${G.state.bag[id] || 0}</b>`;
          $('.qty').innerHTML = `<span>×${String(qty).padStart(2, '0')}</span><b>${yen(qty * priceOf(id))}</b>`;
        }
      }
      draw();

      async function buy(id) {
        busy = true;
        const it = ITEMS[id], cost = qty * it.price;
        const ok = await UI.choose(['是', '否'], { prompt: `${it.n} ${qty} 個，一共 ${yen(cost)}。\n可以嗎？`, cls: 'shop-yesno' });
        if (ok === 0) {
          G.state.money -= cost;
          Game.giveItem(id, qty);
          Sound.sfx('item');
          let msg = '謝謝惠顧！';
          if (it.kind === 'ball' && qty >= 10) {
            const bonus = Math.floor(qty / 10);
            Game.giveItem('premier-ball' in ITEMS ? 'premier-ball' : 'poke-ball', bonus);
            msg += `\n另外送你 ${bonus} 個${ITEMS['premier-ball'] ? ITEMS['premier-ball'].n : '精靈球'}！`;
          }
          await UI.say(msg);
        }
        UI.hideDialog();
        mode = 'list'; busy = false; draw();
      }

      const close = () => { pop(); m.remove(); res(); };
      const onKey = async e => {
        if (busy) return;
        const k = e.key, id = rows[idx];
        if (mode === 'list') {
          if (k === 'ArrowDown' || k === 's') idx = (idx + 1) % rows.length;
          else if (k === 'ArrowUp' || k === 'w') idx = (idx - 1 + rows.length) % rows.length;
          else if (UI.isNo(e)) { if (!e.repeat) close(); return; }
          else if (UI.isOk(e)) {
            if (e.repeat) return;
            Sound.sfx('select');
            if (!id) return close();
            if (G.state.money < priceOf(id)) { busy = true; await UI.say('你的錢好像不夠呢。'); UI.hideDialog(); busy = false; return; }
            mode = 'qty'; qty = 1;
          } else return;
        } else {
          if (k === 'ArrowUp' || k === 'w') qty = qty >= maxQty(id) ? 1 : qty + 1;
          else if (k === 'ArrowDown' || k === 's') qty = qty <= 1 ? maxQty(id) : qty - 1;
          else if (k === 'ArrowRight' || k === 'd') qty = Math.min(maxQty(id), qty + 10);
          else if (k === 'ArrowLeft' || k === 'a') qty = Math.max(1, qty - 10);
          else if (UI.isNo(e)) { if (!e.repeat) { mode = 'list'; draw(); } return; }
          else if (UI.isOk(e)) { if (!e.repeat) { draw(); buy(id); } return; }
          else return;
        }
        draw();
      };
      const pop = UI.pushKey(onKey);
    });
  }
  return { open };
})();
