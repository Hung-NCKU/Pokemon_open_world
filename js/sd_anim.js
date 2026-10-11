// 執行 Pokémon Showdown 的招式動畫（data/sd_anims.js，由 tools/fetch_showdown_anims.mjs 產生）：Z 力量與 18 個 Z 招式
// Showdown 的動畫是寫給它的對戰畫面的（640×360，我方 z=0、對手 z=200，jQuery 動畫）；這裡提供相同介面的 scene 與
// attacker／defender，把 Showdown 的座標換算到綠寶石的戰鬥畫面（720 寬，依兩隻寶可夢實際的位置），用 Web Animations 播放
import { G } from './core.js';

// jQuery 的緩動 → CSS（quadUp＝減速、quadDown＝加速）
const EASE = { linear: 'linear', decel: 'cubic-bezier(.25,.46,.45,.94)', accel: 'cubic-bezier(.55,.085,.68,.53)', swing: 'ease-in-out',
  ballistic: 'ease-in-out', ballistic2: 'ease-in-out', ballistic2Back: 'ease-in-out', ballisticUnder: 'ease-in-out', ballistic2Under: 'ease-in-out' };

// Showdown BattleScene.pos（第五世代以外）：位置 → 左上角、寬高（Showdown 畫面的像素）
function sdPos(loc, obj) {
  loc = { x: 0, y: 0, z: 0, scale: 1, opacity: 1, ...loc };
  if (!loc.xscale && loc.xscale !== 0) loc.xscale = loc.scale;
  if (!loc.yscale && loc.yscale !== 0) loc.yscale = loc.scale;
  let left = 210, top = 245;
  const scale = Math.max(.1, 1.5 - .5 * (loc.z / 200));
  left += (410 - 190) * (loc.z / 200);
  top += (135 - 245) * (loc.z / 200);
  left += Math.floor(loc.x * scale);
  top -= Math.floor(loc.y * scale);
  const width = Math.floor(obj.w * scale * loc.xscale), height = Math.floor(obj.h * scale * loc.yscale);
  const hoffset = Math.floor((obj.h - (obj.y || 0) * 2) * scale * loc.yscale);
  left -= Math.floor(width / 2);
  top -= Math.floor(hoffset / 2);
  return { left, top, width, height, opacity: loc.opacity };
}

class Scene {
  constructor(battle) {
    this.b = battle;
    this.timeOffset = 0;
    this.end = 0;
    this.els = [];
    this.anims = [];
    this.rate = G.fast ? 2 : 1;
    // Showdown 的兩個寶可夢中心（我方 z=0 → (210,245)、對手 z=200 → (430,135)）對到綠寶石畫面上的實際位置
    const me = battle.center('me'), foe = battle.center('foe');
    this.kx = (foe.x - me.x) / 220; this.ky = (foe.y - me.y) / -110;
    this.ox = me.x - this.kx * 210; this.oy = me.y - this.ky * 245;
    this.k = (Math.abs(this.kx) + Math.abs(this.ky)) / 2;
  }
  // Showdown 的位置 → 綠寶石畫面的 left/top/width/height（保持中心點）
  map(p) {
    const cx = p.left + p.width / 2, cy = p.top + p.height / 2;
    const w = p.width * this.k, h = p.height * this.k;
    return { left: this.ox + this.kx * cx - w / 2, top: this.oy + this.ky * cy - h / 2, width: w, height: h, opacity: p.opacity };
  }
  css(p) { return { left: p.left + 'px', top: p.top + 'px', width: p.width + 'px', height: p.height + 'px', opacity: p.opacity }; }
  play(el, frames, duration) {
    const a = el.animate(frames, { duration: Math.max(1, duration), fill: 'forwards' });
    a.playbackRate = this.rate;
    this.anims.push(a);
    return a;
  }
  wait(t) { this.timeOffset += t; }
  showEffect(effect, start, end, transition, after) {
    if (typeof effect === 'string') effect = SD_ANIMS.BattleEffects[effect];
    if (!effect || !effect.url) return;
    start = { ...start }; end = { ...end };
    if (!start.time) start.time = 0;
    if (!end.time) end.time = start.time + 500;
    start.time += this.timeOffset; end.time += this.timeOffset;
    for (const k of ['scale', 'xscale', 'yscale']) if (!end[k] && end[k] !== 0 && start[k]) end[k] = start[k];
    end = { ...start, ...end };
    const p0 = this.map(sdPos(start, effect)), p1 = this.map(sdPos(end, effect));
    let p2 = null, t2 = end.time;
    if (after === 'fade') { p2 = { ...p1, opacity: 0 }; t2 += 100; }
    if (after === 'explode') {
      const e = { ...end, opacity: 0 };
      for (const k of ['scale', 'xscale', 'yscale']) if (e[k]) e[k] *= 3;
      p2 = this.map(sdPos(e, effect)); t2 += 200;
    }
    const total = Math.max(1, t2);
    const img = document.createElement('img');
    img.src = effect.url;
    img.style.cssText = 'position:absolute;display:block;opacity:0;image-rendering:auto;pointer-events:none';
    this.b.fxEl.appendChild(img);
    this.els.push(img);
    const frames = [];
    if (start.time > 0) frames.push({ ...this.css(p0), opacity: 0, offset: 0 });
    frames.push({ ...this.css(p0), offset: start.time / total, easing: EASE[transition] || 'linear' });
    frames.push({ ...this.css(p1), offset: end.time / total });
    if (p2) frames.push({ ...this.css(p2), offset: 1 });
    else frames[frames.length - 1].offset = 1;
    this.play(img, frames, total);
    this.end = Math.max(this.end, total);
  }
  backgroundEffect(bg, duration, opacity = 1, delay = 0) {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:0;top:0;width:720px;height:336px;pointer-events:none;opacity:0;background:${bg};background-size:cover;background-position:center`;
    this.b.el.insertBefore(d, this.b.el.firstChild); // 在寶可夢的後面
    this.els.push(d);
    // Showdown：延遲 → 250ms 淡入 → 停留（duration − 250，最少 0）→ 250ms 淡出
    const hold = Math.max(0, duration - 250), total = delay + 250 + hold + 250;
    this.play(d, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: delay / total }, { opacity, offset: (delay + 250) / total },
      { opacity, offset: (delay + 250 + hold) / total }, { opacity: 0, offset: 1 }], total);
    this.end = Math.max(this.end, total);
  }
  // Showdown 的寶可夢精靈：位置（x、y、z）與 anim()／delay() 的動作佇列
  sprite(side) {
    const scene = this, img = this.b.el.querySelector(`.bmon.${side} img`);
    const front = side === 'foe';
    const z = front ? 200 : 0, sdScale = 1.5 - .5 * (z / 200);
    const r = img ? img.getBoundingClientRect() : { width: 192, height: 192 };
    const s = (this.b.el.getBoundingClientRect().width / 720) || 1;
    const sp = { url: img ? img.src : '', w: r.width / s / (this.k * sdScale), h: r.height / s / (this.k * sdScale), y: 0 };
    const base = { x: 0, y: 0, z, scale: 1, opacity: 1 };
    const segs = [];
    const o = {
      x: 0, y: 0, z, sp, isFrontSprite: front, t: 0, cur: { ...base },
      behind: off => z + (front ? 1 : -1) * off,
      leftof: off => (front ? 1 : -1) * off,
      behindx: off => (front ? 1 : -1) * off,
      behindy: off => (front ? -1 : 1) * off,
      delay(t) { this.t += t; return this; },
      anim(end, transition) {
        end = { x: this.x, y: this.y, z: this.z, scale: 1, opacity: 1, time: 500, ...end };
        segs.push({ from: this.cur, to: end, t0: this.t, t1: this.t + end.time, ease: EASE[transition] || 'linear' });
        this.cur = end; this.t += end.time;
        return this;
      },
      // 把佇列的動作變成 transform（相對於原本的位置與大小）
      flush() {
        if (!img || !segs.length) return 0;
        const pb = scene.map(sdPos(base, sp));
        const tf = loc => {
          const p = scene.map(sdPos(loc, sp));
          const dx = (p.left + p.width / 2) - (pb.left + pb.width / 2), dy = (p.top + p.height / 2) - (pb.top + pb.height / 2);
          return { transform: `translate(${dx}px, ${dy}px) scale(${p.width / pb.width}, ${p.height / pb.height})`, opacity: loc.opacity ?? 1 };
        };
        const total = Math.max(1, ...segs.map(g => g.t1));
        const frames = [{ ...tf(base), offset: 0 }];
        for (const g of segs) {
          frames.push({ ...tf(g.from), offset: g.t0 / total, easing: g.ease });
          frames.push({ ...tf(g.to), offset: g.t1 / total });
        }
        frames.sort((a, b) => a.offset - b.offset);
        const a = img.animate(frames, { duration: total, fill: 'none' });
        a.playbackRate = scene.rate;
        scene.anims.push(a);
        return total;
      },
    };
    return o;
  }
  async run(fn, user, target) {
    const us = this.b.sideOf(user), ts = this.b.sideOf(target);
    const attacker = this.sprite(us), defender = us === ts ? attacker : this.sprite(ts);
    try { fn(this, [attacker, defender]); } catch (e) { console.warn('Showdown 動畫', e); }
    const total = Math.max(this.end, attacker.flush(), defender === attacker ? 0 : defender.flush());
    await new Promise(r => setTimeout(r, total / this.rate + 50));
    for (const a of this.anims) a.cancel();
    for (const el of this.els) el.remove();
  }
}

const SDAnim = {
  ok() { return !!(window.SD_ANIMS && typeof Element !== 'undefined' && Element.prototype.animate); },
  // Z 力量（使出 Z 招式前，使用者身上的 Z 標誌與光芒）
  zpower(battle, user, target) {
    if (!SDAnim.ok() || !battle.el) return Promise.resolve();
    return new Scene(battle).run(SD_ANIMS.BattleOtherAnims.zpower.anim, user, target);
  },
  // 依屬性的 Z 招式動畫
  zmove(battle, user, target, type) {
    const id = SDAnim.ok() && SD_ANIMS.Z[type];
    const a = id && SD_ANIMS.BattleMoveAnims[id];
    if (!a || !battle.el) return Promise.resolve(false);
    return new Scene(battle).run(a.anim, user, target).then(() => true);
  },
};

export { SDAnim, sdPos };
