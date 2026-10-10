// 戰鬥畫面（綠寶石版面：240×160 × 3）
// 寶可夢圖：1–386 用綠寶石原版、387–649 用黑白版動態圖、其後用最新版；叫聲取自 PokéAPI
const PKSPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const CRY = id => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
const ITEM_SPR = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${id}.png`;

const TYPE_FX = {
  normal: ['impact', 'impact'], fire: ['small_ember', 'fire'], water: ['water_droplet', 'bubble'], electric: ['electric_orbs', 'lightning'],
  grass: ['razor_leaf', 'leaf'], ice: ['ice_crystals_0', 'ice_chunk'], fighting: ['hands_and_feet', 'punch_impact'], poison: ['poison_bubble', 'toxic_bubble'],
  ground: ['mud_sand_0', 'rocks'], flying: ['white_feather', 'gust'], psychic: ['pink_orb', 'ring'], bug: ['needle', 'string'],
  rock: ['rocks', 'rocks'], ghost: ['shadow_ball', 'ghostly_spirit'], dragon: ['purple_flame', 'blue_flames'], dark: ['black_ball', 'sharp_teeth'],
  steel: ['metal_ball', 'sword'], fairy: ['pink_heart_2', 'sparkle_1'], unknown: ['impact', 'impact'], stellar: ['sparkle_1', 'sparkle_1'],
};
const STATUS_FX = { par: 'lightning', brn: 'small_ember', psn: 'poison_bubble', tox: 'toxic_bubble', slp: 'letter_z', frz: 'ice_crystals_0' };
const STATUS_ICON_ROW = { psn: 0, tox: 0, par: 1, slp: 2, frz: 3, brn: 4 };

function monSprite(m, back) {
  const id = m.sp, sh = m.shiny;
  if (id <= 386) return { url: `${PKSPR}versions/generation-iii/emerald/${back ? 'back/' : ''}${sh ? 'shiny/' : ''}${id}.png`, scale: 3 };
  if (id <= 649) return { url: `${PKSPR}versions/generation-v/black-white/animated/${back ? 'back/' : ''}${sh ? 'shiny/' : ''}${id}.gif`, scale: 2 };
  return { url: `${PKSPR}${back ? 'back/' : ''}${sh ? 'shiny/' : ''}${id}.png`, scale: 2 };
}

function playCry(id, faint = false) {
  const v = (G.settings.sfxVol ?? 7) / 10;
  if (v <= 0) return;
  try {
    const a = new Audio(CRY(id));
    a.volume = .6 * v;
    if (faint) { a.playbackRate = .75; a.preservesPitch = false; }
    a.play().catch(() => { });
  } catch { }
}

Object.assign(Battle.prototype, {
  setup() {
    const el = document.getElementById('battle');
    const bgKey = { tall: 'tall', water: 'water', cave: 'cave', snow: 'snow', desert: 'desert', gym: 'gym' }[this.biome] || 'tall';
    const bg = Gen3.on ? `${Gen3.base}bg_${bgKey}.png` : Spr.battleBg(this.biome);
    el.className = Gen3.on ? 'gen3' : '';
    el.style.backgroundImage = `url("${bg}")`;
    el.innerHTML = `
      <div class="bmon foe"><img draggable="false"></div>
      <div class="bmon me"><img draggable="false"></div>
      <img class="btrainer hidden" draggable="false">
      <div class="hbox foe"><span class="hn"></span><span class="hl"></span><span class="hs"></span><span class="hc"></span>
        <span class="hlab">HP</span><div class="hpb"><div></div></div></div>
      <div class="hbox me"><span class="hn"></span><span class="hl"></span><span class="hs"></span>
        <span class="hlab">HP</span><div class="hpb"><div></div></div><span class="hnum"></span><div class="xpb"><div></div></div></div>
      <div class="fx"></div>
      <div class="tbox"></div>`;
    el.classList.remove('hidden');
    document.body.classList.add('in-battle');
    document.getElementById('banner').classList.remove('show');
    this.el = el;
    this.fxEl = el.querySelector('.fx');
    this.shown = { me: null, foe: null };
  },

  setSprite(side, m) {
    const img = this.el.querySelector(`.bmon.${side} img`);
    const back = side === 'me';
    const s = monSprite(m, back);
    img.className = '';
    img.style.width = '';
    img.style.bottom = '';
    img.style.top = '';
    // 第三世代的圖依 pokeemerald 的座標資料定位（GetBattlerSpriteFinal_Y）：
    //   對手：中心 y = 40 + front y_offset − 飄浮高度；我方：中心 y = 80 + back y_offset（x 分別為 176、72）
    // 容器：對手 top 0、我方 top 96（GBA 32），高度都延伸到文字框上緣，超出的部分和原作一樣被文字框遮住
    const P = Gen3.on && GEN3.pic && GEN3.pic[m.sp];
    const place = scale => {
      img.style.width = img.naturalWidth * scale + 'px';
      if (P && m.sp <= 386 && scale === 3) {
        const cy = back ? 80 + P[1] : 40 + P[0] - P[2];
        img.style.top = (cy - 32) * 3 - (back ? 96 : 0) + 'px';
        img.style.bottom = 'auto';
        return;
      }
      // 其他圖片：依實際內容的下緣定位（對手腳底在 GBA y=72；我方下緣略低於文字框上緣）
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let pad = 0;
        outer: for (let y = c.height - 1; y >= 0; y--) {
          for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 16) break outer;
          pad++;
        }
        img.style.bottom = (back ? -24 : 24) - pad * scale + 'px';
      } catch { }
    };
    img.crossOrigin = 'anonymous';
    img.onload = () => place(s.scale);
    img.onerror = () => {
      img.onerror = null;
      img.src = Mon.sprite(m.sp, { back, shiny: m.shiny });
      img.onload = () => place(2);
    };
    img.src = s.url;
    this.shown[side] = m;
  },

  hpColor(r) { return r > .5 ? 'g' : r > .2 ? 'y' : 'r'; },

  draw() {
    for (const side of ['foe', 'me']) {
      const m = side === 'me' ? this.me : this.foe;
      if (!m) continue;
      const box = this.el.querySelector(`.hbox.${side}`);
      const max = Mon.maxHp(m);
      const r = Math.max(0, m.hp) / max;
      box.querySelector('.hn').textContent = Mon.name(m);
      box.querySelector('.hl').textContent = 'Lv' + m.lv;
      const hs = box.querySelector('.hs');
      if (m.st && Gen3.on) { hs.style.backgroundImage = `url(${Gen3.base}ui_status.png)`; hs.style.backgroundPositionY = -STATUS_ICON_ROW[m.st] * 24 + 'px'; hs.style.display = 'block'; }
      else if (m.st) { hs.textContent = STATUS_ZH[m.st]; hs.style.display = 'block'; }
      else hs.style.display = 'none';
      const bar = box.querySelector('.hpb div');
      bar.style.width = r * 100 + '%';
      bar.className = this.hpColor(r);
      if (side === 'foe') {
        const c = box.querySelector('.hc');
        c.style.display = this.wildMon && G.state.caught[m.sp] ? 'block' : 'none';
      } else {
        this.countHp(box.querySelector('.hnum'), Math.max(0, m.hp), max);
        const sp = POKEDEX[m.sp];
        const a = Mon.expFor(sp.gr, m.lv), b = Mon.expFor(sp.gr, m.lv + 1);
        box.querySelector('.xpb div').style.width = (m.lv >= 100 ? 0 : U.clamp((m.exp - a) / (b - a), 0, 1) * 100) + '%';
      }
    }
  },
  // HP 數字逐步增減
  countHp(el, hp, max) {
    const from = +(el.dataset.hp ?? hp);
    el.dataset.hp = hp;
    if (from === hp) { el.textContent = `${hp}/ ${max}`; return; }
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 500);
      el.textContent = `${Math.round(from + (hp - from) * k)}/ ${max}`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  async anim(side, cls, ms = 400) {
    const img = this.el.querySelector(`.bmon.${side} img`);
    img.classList.add(cls);
    await U.sleep(ms);
    img.classList.remove(cls);
  },
  sideOf(m) { return m === this.me ? 'me' : 'foe'; },

  // ---------- 特效 ----------
  center(side) { return side === 'foe' ? { x: 528, y: 120 } : { x: 216, y: 240 }; },
  spawn(name, x, y, { dur = 500, loop = 1, scale = 3, size = null } = {}) {
    const url = Gen3.animUrl(name);
    if (!url) return null;
    const d = document.createElement('div');
    d.className = 'sp';
    const im = new Image();
    im.src = url;
    const apply = () => {
      const w = im.naturalWidth, h = im.naturalHeight;
      const fw = size || w, frames = Math.max(1, Math.floor(h / fw));
      d.style.width = fw * scale + 'px';
      d.style.height = fw * scale + 'px';
      d.style.left = x - fw * scale / 2 + 'px';
      d.style.top = y - fw * scale / 2 + 'px';
      d.style.backgroundImage = `url(${url})`;
      d.style.backgroundSize = `${w * scale}px ${h * scale}px`;
      if (frames > 1) d.animate([{ backgroundPositionY: '0px' }, { backgroundPositionY: -frames * fw * scale + 'px' }], { duration: dur, iterations: loop, easing: `steps(${frames})` });
    };
    if (im.complete && im.naturalWidth) apply(); else im.onload = apply;
    this.fxEl.appendChild(d);
    setTimeout(() => d.remove(), dur * loop + 50);
    return d;
  },
  async moveAnim(user, target, mv) {
    if (!Gen3.on) return this.anim(this.sideOf(target), 'hit', 300);
    const us = this.sideOf(user), ts = this.sideOf(target);
    const a = this.center(us), b = this.center(ts);
    const [proj, burst] = TYPE_FX[mv.t] || TYPE_FX.normal;
    const self = mv.tg === 'user';
    if (mv.c === 'ph') {
      // 物理：衝向對手 → 撞擊
      const img = this.el.querySelector(`.bmon.${us} img`);
      const dx = us === 'me' ? 60 : -60, dy = us === 'me' ? -30 : 30;
      img.animate([{ translate: '0 0' }, { translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 320 });
      await U.sleep(160);
      Sound.sfx('hit_weak');
      const fx = mv.t === 'normal' || mv.t === 'fighting' ? 'impact' : burst;
      this.spawn(fx, b.x + U.ri(-20, 20), b.y + U.ri(-20, 20), { dur: 300 });
      if (fx !== 'impact') this.spawn('impact', b.x, b.y, { dur: 250 });
      await U.sleep(320);
    } else if (mv.c === 'sp') {
      // 特殊：從使用者射向目標
      for (let i = 0; i < 4; i++) {
        const p = this.spawn(proj, a.x, a.y, { dur: 300, loop: 2 });
        if (p) p.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${b.x - a.x + U.ri(-24, 24)}px, ${b.y - a.y + U.ri(-24, 24)}px)` }], { duration: 380, easing: 'ease-in', fill: 'forwards' });
        await U.sleep(70);
      }
      await U.sleep(320);
      this.spawn(burst, b.x, b.y, { dur: 400 });
      await U.sleep(250);
    } else {
      // 變化：在自己或對手身上產生效果
      const at = self ? a : b;
      for (let i = 0; i < 3; i++) { this.spawn(i ? burst : proj, at.x + U.ri(-40, 40), at.y + U.ri(-40, 20), { dur: 450 }); await U.sleep(120); }
      await U.sleep(300);
    }
  },

  async hurt(m, dmg, eff = 1) {
    m.hp = Math.max(0, m.hp - dmg);
    const side = this.sideOf(m);
    Sound.sfx(eff > 1 ? 'hit_super' : eff < 1 ? 'hit_weak' : 'hit');
    await this.anim(side, 'hit', 420);
    this.draw();
    await U.sleep(520);
  },
  async healMon(m, h) {
    m.hp = Math.min(Mon.maxHp(m), m.hp + h);
    this.draw();
    await U.sleep(520);
  },
  async statFx(m, up) {
    Sound.sfx(up ? 'stat_up' : 'stat_down');
    await this.anim(this.sideOf(m), up ? 'up' : 'down', 600);
  },
  async statusFx(m, st) {
    const c = this.center(this.sideOf(m));
    const n = STATUS_FX[st];
    if (n) for (let i = 0; i < 3; i++) { this.spawn(n, c.x + U.ri(-40, 40), c.y + U.ri(-40, 10), { dur: 400 }); await U.sleep(110); }
    await this.anim(this.sideOf(m), 'status', 300);
  },

  // ---------- 出場／倒下／收回 ----------
  async sendOut(side, m) {
    this.setSprite(side, m);
    const img = this.el.querySelector(`.bmon.${side} img`);
    const c = this.center(side);
    const ball = this.ballEl('poke-ball');
    ball.style.left = c.x - 24 + 'px'; ball.style.top = c.y + 40 + 'px';
    ball.animate([{ transform: `translate(${side === 'me' ? -200 : 120}px, -80px)` }, { transform: 'translate(0,0)' }], { duration: 300, easing: 'ease-out' });
    img.classList.add('gone');
    await U.sleep(300);
    ball.remove();
    this.spawn('sparkle_1', c.x, c.y + 30, { dur: 300 });
    img.classList.remove('gone');
    img.animate([{ transform: 'scale(0)', filter: 'brightness(4)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 350, easing: 'ease-out' });
    playCry(m.sp);
    this.el.querySelector(`.hbox.${side}`).classList.remove('hidden');
    this.draw();
    await U.sleep(450);
  },
  async faint(side) {
    const m = side === 'me' ? this.me : this.foe;
    playCry(m.sp, true);
    Sound.sfx('faint');
    const img = this.el.querySelector(`.bmon.${side} img`);
    img.classList.add('faint');
    await U.sleep(650);
    img.classList.add('gone');
    img.classList.remove('faint');
    this.el.querySelector(`.hbox.${side}`).classList.add('hidden');
  },
  async recall(side) {
    const img = this.el.querySelector(`.bmon.${side} img`);
    img.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(0)', filter: 'brightness(4) sepia(1) hue-rotate(-50deg)' }], { duration: 300, fill: 'forwards' });
    await U.sleep(320);
    img.classList.add('gone');
    img.getAnimations().forEach(a => a.cancel());
  },

  ballEl(item) {
    const d = document.createElement('div');
    d.className = 'ball';
    const key = { 'poke-ball': 'poke', 'great-ball': 'great', 'ultra-ball': 'ultra', 'master-ball': 'master' }[item] || 'poke';
    d.style.backgroundImage = Gen3.on ? `url(${Gen3.base}ball_${key}.png)` : `url(${ITEM_SPR(item)})`;
    if (!Gen3.on) d.classList.add('item');
    this.fxEl.appendChild(d);
    return d;
  },
  // 丟球捕捉動畫
  // 丟球捕捉動畫：按任意鍵或點擊畫面可以加速
  async catchAnim(item, shakes, caught) {
    const FAST = 8;
    let fast = false;
    const speedUp = () => {
      if (fast) return;
      fast = true;
      for (const a of this.el.getAnimations({ subtree: true })) a.playbackRate = FAST;
    };
    const pop = UI.pushKey(e => { if (UI.isOk(e) || UI.isNo(e)) speedUp(); });
    this.el.addEventListener('pointerdown', speedUp);
    const wait = ms => U.sleep(fast ? ms / FAST : ms);
    const anim = (el, kf, opt) => { const a = el.animate(kf, opt); if (fast) a.playbackRate = FAST; return a; };
    try {
      const foe = this.el.querySelector('.bmon.foe img');
      const ball = this.ballEl(item);
      const c = this.center('foe');
      const tx = c.x - 24, ty = c.y - 10;
      ball.style.left = tx + 'px'; ball.style.top = ty + 'px';
      Sound.sfx('ball_throw');
      await anim(ball, [
        { transform: 'translate(-420px, 220px) rotate(0deg)' },
        { transform: 'translate(-200px, -80px) rotate(-360deg)', offset: .5 },
        { transform: 'translate(0, 0) rotate(-720deg)' },
      ], { duration: 650, easing: 'linear' }).finished;
      ball.classList.add('open');
      Sound.sfx('ball_open');
      anim(foe, [{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(0) translateY(60px)', filter: 'brightness(3) sepia(1) hue-rotate(-50deg) saturate(5)' }], { duration: 380, fill: 'forwards' });
      await wait(400);
      ball.classList.remove('open');
      foe.classList.add('gone');
      // 掉到地上彈跳
      await anim(ball, [{ transform: 'translateY(0)' }, { transform: 'translateY(66px)', offset: .5 }, { transform: 'translateY(40px)', offset: .7 }, { transform: 'translateY(66px)' }],
        { duration: 500, easing: 'ease-in', fill: 'forwards' }).finished;
      ball.style.top = ty + 66 + 'px';
      ball.getAnimations().forEach(a => a.cancel());
      for (let i = 0; i < shakes; i++) {
        await wait(350);
        Sound.sfx('ball_shake');
        await anim(ball, [{ transform: 'rotate(0)' }, { transform: 'rotate(-28deg)' }, { transform: 'rotate(28deg)' }, { transform: 'rotate(0)' }], { duration: 480 }).finished;
      }
      await wait(300);
      if (caught) {
        Sound.sfx('caught');
        ball.classList.add('done');
        for (let i = 0; i < 3; i++) this.spawn('yellow_star', tx + 24 + (i - 1) * 40, ty + 50, { dur: 500 });
        await wait(500);
        return ball;
      }
      ball.classList.add('open');
      foe.getAnimations().forEach(a => a.cancel());
      foe.classList.remove('gone');
      anim(foe, [{ transform: 'scale(0)', filter: 'brightness(4)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 300 });
      await wait(300);
      ball.remove();
      return null;
    } finally {
      pop();
      this.el.removeEventListener('pointerdown', speedUp);
    }
  },

  async trainerIntro() {
    const tr = this.trainer;
    const im = this.el.querySelector('.btrainer');
    if (!tr.sprite) return;
    im.src = TRAINER_SPRITE_URL(tr.sprite);
    im.onerror = () => im.classList.add('hidden');
    im.classList.remove('hidden');
    im.animate([{ transform: 'translateX(-520px)' }, { transform: 'translateX(0)' }], { duration: 700, easing: 'ease-out' });
    await U.sleep(700);
  },
  async trainerLeave() {
    const im = this.el.querySelector('.btrainer');
    if (im.classList.contains('hidden')) return;
    await im.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(300px)', opacity: 0 }], { duration: 400, fill: 'forwards' }).finished;
    im.classList.add('hidden');
  },
  async trainerReturn() {
    const im = this.el.querySelector('.btrainer');
    if (!this.trainer.sprite) return;
    im.getAnimations().forEach(a => a.cancel());
    im.classList.remove('hidden');
    im.animate([{ transform: 'translateX(300px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 400 });
    await U.sleep(400);
  },
  async wildIntro() {
    const img = this.el.querySelector('.bmon.foe img');
    img.animate([{ transform: 'translateX(-560px)', filter: 'brightness(0)' }, { transform: 'translateX(0)', filter: 'brightness(0)', offset: .8 }, { transform: 'translateX(0)', filter: 'brightness(1)' }], { duration: 900, easing: 'ease-out' });
    await U.sleep(800);
    playCry(this.foe.sp);
    if (this.foe.shiny) { for (let i = 0; i < 4; i++) { this.spawn('sparkle_1', 528 + U.ri(-60, 60), 110 + U.ri(-60, 40), { dur: 400 }); await U.sleep(100); } }
    await U.sleep(200);
  },
});
