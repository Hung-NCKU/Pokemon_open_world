// 秘傳招式（場地招式）的演出：和綠寶石一樣，畫面中間出現一條帶子，寶可夢從右邊滑進來並發出叫聲
// - 衝浪：演出後坐上寶可夢下水
// - 飛翔：演出後主角飛上天空、畫面變暗，到目的地後再亮起
// - 怪力：每次進洞窟第一次推石頭時演出
const FieldMove = (() => {
  function overlay(cls) {
    const el = document.createElement('div');
    el.className = cls;
    document.getElementById('game').appendChild(el);
    return el;
  }
  const wait = ms => new Promise(r => setTimeout(r, G.fast ? ms / 2 : ms));

  // 帶子＋寶可夢滑入（約 1.3 秒）
  async function cutIn(m, moveName) {
    const el = overlay('fieldmove');
    el.innerHTML = `<div class="fm-band"><img src="${Mon.sprite(m.sp, { shiny: m.shiny })}" alt=""></div>`;
    const band = el.querySelector('.fm-band'), img = el.querySelector('img');
    band.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 180, fill: 'forwards' });
    await wait(180);
    if (typeof playCry === 'function') playCry(m.sp);
    img.animate([{ transform: 'translateX(560px)' }, { transform: 'translateX(0)', offset: .35 }, { transform: 'translateX(0)', offset: .75 }, { transform: 'translateX(-620px)' }],
      { duration: 1100, easing: 'ease-in-out', fill: 'forwards' });
    await wait(1100);
    band.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 160, fill: 'forwards' });
    await wait(160);
    el.remove();
  }
  // 畫面漸暗／漸亮
  async function fade(toBlack, ms = 350) {
    let el = document.querySelector('.fm-fade');
    if (!el) el = overlay('fm-fade');
    el.animate([{ opacity: toBlack ? 0 : 1 }, { opacity: toBlack ? 1 : 0 }], { duration: ms, fill: 'forwards' });
    await wait(ms);
    if (!toBlack) el.remove();
  }
  // 飛翔：主角往上飛走（在世界畫面上畫一個向上離開的影子），暗下來
  async function flyAway() {
    const el = overlay('fm-fly');
    el.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: 'translate(160px, -320px) scale(.4)', opacity: 0 }], { duration: 650, easing: 'ease-in', fill: 'forwards' });
    await wait(650);
    el.remove();
  }
  async function surf(m) { await cutIn(m, '衝浪'); }
  async function fly(m, go) {
    await cutIn(m, '飛翔');
    Sound.sfx && Sound.sfx('fly');
    await flyAway();
    await fade(true);
    go();
    await wait(200);
    await fade(false);
  }
  async function strength(m) { await cutIn(m, '怪力'); }
  return { cutIn, fade, surf, fly, strength };
})();
