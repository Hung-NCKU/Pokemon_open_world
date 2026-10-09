// 戰鬥系統（最新世代公式：物理／特殊分類、會心 1.5 倍、麻痺速度減半等）
const STAT_KEY = { attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spd', speed: 'spe', accuracy: 'acc', evasion: 'eva' };
const STAGE_ZH = { atk: '攻擊', def: '防禦', spa: '特攻', spd: '特防', spe: '速度', acc: '命中率', eva: '閃避率' };
const SELF_TARGETS = new Set(['user', 'users-field', 'user-or-ally', 'user-and-allies', 'ally', 'all-allies']);
const FIELD_TARGETS = new Set(['entire-field', 'opponents-field']);
const FIXED_DMG = { 49: 'sonic', 82: 'rage', 69: 'level', 101: 'level', 162: 'half', 877: 'half', 149: 'psywave' };

function newVol() {
  return { stg: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }, conf: 0, flinch: false, toxN: 0, seed: false, trap: 0, yawn: 0, love: false, focus: 0 };
}
function stageMul(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
function accMul(s) { return s >= 0 ? (3 + s) / 3 : 3 / (3 - s); }

class Battle {
  constructor(opts) {
    this.wildMon = opts.wild || null;
    this.trainer = opts.trainer || null; // {title, name, party, kind, money, intro, lose}
    this.biome = opts.biome || 'tall';
    this.foeParty = this.wildMon ? [this.wildMon] : this.trainer.party;
    this.foeIdx = 0;
    this.myIdx = G.party.findIndex(m => m.hp > 0);
    this.vMe = newVol();
    this.vFoe = newVol();
    this.participants = new Set([this.myIdx]);
    this.runTries = 0;
    this.turn = 0;
    this.aiItems = this.trainer && this.trainer.kind !== 'trainer' ? 2 : 0;
  }
  get me() { return G.party[this.myIdx]; }
  get foe() { return this.foeParty[this.foeIdx]; }
  msg(t) { return UI.say(t, { auto: G.settings.battleAuto }); }
  foeName(m = this.foe) { return (this.wildMon ? '野生的 ' : '對手的 ') + Mon.name(m); }
  label(m) { return m === this.foe ? this.foeName(m) : Mon.name(m); }

  // ---------- 畫面 ----------
  setup() {
    const el = document.getElementById('battle');
    el.className = 'bg-' + this.biome;
    el.innerHTML = `
      <div class="binfo foe"><div class="bn"></div><div class="bh"></div></div>
      <div class="bmon foe"><div class="plat"></div><img draggable="false"></div>
      <div class="bmon me"><div class="plat"></div><img draggable="false"></div>
      <div class="binfo me"><div class="bn"></div><div class="bh"></div><div class="bnum"></div><div class="bexp"><div></div></div></div>
      <div class="btrainer hidden"></div>`;
    el.classList.remove('hidden');
    document.getElementById('banner').classList.remove('show');
    this.el = el;
  }
  setSprite(side, m) {
    const img = this.el.querySelector(`.bmon.${side} img`);
    const back = side === 'me';
    img.classList.remove('flip', 'faint', 'gone');
    img.onerror = () => { img.onerror = null; img.src = Mon.sprite(m.sp, { shiny: m.shiny }); if (back) img.classList.add('flip'); };
    img.src = Mon.sprite(m.sp, { back, shiny: m.shiny });
    img.classList.add('enter');
    setTimeout(() => img.classList.remove('enter'), 400);
  }
  draw() {
    for (const side of ['foe', 'me']) {
      const m = side === 'me' ? this.me : this.foe;
      if (!m) continue;
      const box = this.el.querySelector(`.binfo.${side}`);
      const max = Mon.maxHp(m);
      const caught = side === 'foe' && this.wildMon && G.state.caught[m.sp] ? '<span class="ball-mark">●</span>' : '';
      box.querySelector('.bn').innerHTML = `${caught}${U.esc(Mon.name(m))}${m.shiny ? ' ✨' : ''} <span class="lv">Lv.${m.lv}</span> ${UI.statusTag(m.st)}`;
      box.querySelector('.bh').innerHTML = `<span class="hplbl">HP</span>${UI.hpBar(m.hp, max, 150)}`;
      if (side === 'me') {
        box.querySelector('.bnum').textContent = `${Math.max(0, m.hp)} / ${max}`;
        const s = POKEDEX[m.sp];
        const a = Mon.expFor(s.gr, m.lv), b = Mon.expFor(s.gr, m.lv + 1);
        const r = m.lv >= 100 ? 1 : (m.exp - a) / (b - a);
        box.querySelector('.bexp div').style.width = U.clamp(r * 100, 0, 100) + '%';
      }
    }
  }
  async anim(side, cls, ms = 400) {
    const img = this.el.querySelector(`.bmon.${side} img`);
    img.classList.add(cls);
    await U.sleep(ms);
    img.classList.remove(cls);
  }
  sideOf(m) { return m === this.me ? 'me' : 'foe'; }

  // ---------- 主流程 ----------
  async run() {
    this.setup();
    G.mode = 'battle';
    Game.markSeen(this.foe.sp);
    if (this.wildMon) {
      this.setSprite('foe', this.foe);
      this.el.querySelector('.bmon.me').classList.add('hidden');
      this.draw();
      this.el.querySelector('.binfo.me').classList.add('hidden');
      if (this.foe.shiny) await this.msg('✨ 閃閃發光！');
      await this.msg(`野生的 ${Mon.name(this.foe)} 跳出來了！`);
    } else {
      const tr = this.el.querySelector('.btrainer');
      tr.classList.remove('hidden');
      tr.textContent = this.trainer.title;
      this.el.querySelector('.bmon.foe').classList.add('hidden');
      this.el.querySelector('.bmon.me').classList.add('hidden');
      this.el.querySelector('.binfo.foe').classList.add('hidden');
      this.el.querySelector('.binfo.me').classList.add('hidden');
      await this.msg(`${this.trainer.title} ${this.trainer.name} 向你發起了對戰！`);
      tr.classList.add('hidden');
      this.el.querySelector('.bmon.foe').classList.remove('hidden');
      this.el.querySelector('.binfo.foe').classList.remove('hidden');
      this.setSprite('foe', this.foe);
      this.draw();
      await this.msg(`${this.trainer.name} 派出了 ${Mon.name(this.foe)}！`);
    }
    this.el.querySelector('.bmon.me').classList.remove('hidden');
    this.el.querySelector('.binfo.me').classList.remove('hidden');
    this.setSprite('me', this.me);
    this.draw();
    await this.msg(`就決定是你了！${Mon.name(this.me)}！`);

    let result = null;
    while (!result) {
      this.turn++;
      const action = await this.chooseAction();
      result = await this.doTurn(action);
    }
    return this.finish(result);
  }

  async chooseAction() {
    while (true) {
      const me = this.me;
      const c = await UI.choose(['戰鬥', '背包', '寶可夢', '逃跑'], { prompt: `${Mon.name(me)} 要做什麼？`, cols: 2, cancel: false, cls: 'battle-menu' });
      if (c === 0) {
        if (me.moves.every(m => m.pp <= 0)) return { type: 'move', idx: -1 };
        const opts = me.moves.map(mv => {
          const d = MOVES[mv.id];
          const ty = TYPES[d.t] || TYPES.unknown;
          const eff = d.c !== 'st' ? typeEff(d.t, Mon.types(this.foe)) : 1;
          const effTxt = d.c === 'st' ? '' : eff === 0 ? '<i>沒有效果</i>' : eff > 1 ? '<i class="good">效果絕佳</i>' : eff < 1 ? '<i class="bad">效果不好</i>' : '';
          return {
            html: `<div class="mvbtn" style="border-color:${ty.c}"><b>${U.esc(d.n)}</b><span>${typeTag(d.t)} ${['ph', 'sp'].includes(d.c) ? (d.c === 'ph' ? '物理' : '特殊') : '變化'} ${d.p || '—'} · PP ${mv.pp}/${d.pp}</span>${effTxt}</div>`,
            disabled: mv.pp <= 0,
          };
        });
        const i = await UI.choose(opts, { prompt: '要使用哪一個招式？', cols: 2, cls: 'move-menu' });
        if (i >= 0) return { type: 'move', idx: i };
      } else if (c === 1) {
        const r = await Game.bagMenu({ battle: this });
        if (r) return { type: 'item', ...r };
      } else if (c === 2) {
        const i = await Game.partyMenu({ battle: this });
        if (i >= 0 && i !== this.myIdx) return { type: 'switch', idx: i };
      } else if (c === 3) {
        return { type: 'run' };
      }
    }
  }

  speedOf(m, v) {
    let s = Mon.stats(m)[5] * stageMul(v.stg.spe);
    if (m.st === 'par') s *= .5;
    return s;
  }

  async doTurn(action) {
    const foeAction = this.aiChoose();
    // 非招式行動優先
    if (action.type === 'run') {
      if (this.trainer) { await this.msg('不行！不能從訓練家對戰中逃走！'); this.turn--; return null; }
      this.runTries++;
      const a = this.speedOf(this.me, this.vMe), b = this.speedOf(this.foe, this.vFoe);
      const odds = (Math.floor(a * 128 / Math.max(1, b)) + 30 * this.runTries) % 256;
      if (a >= b || Math.random() * 256 < odds) { await this.msg('順利逃走了！'); return 'run'; }
      await this.msg('沒能逃走！');
    } else if (action.type === 'switch') {
      await this.switchTo(action.idx);
    } else if (action.type === 'item') {
      const r = await this.useItem(action);
      if (r) return r;
    }
    let order;
    if (action.type === 'move') {
      const mySlot = action.idx >= 0 ? this.me.moves[action.idx] : null;
      const myPr = mySlot ? MOVES[mySlot.id].pr : 0;
      const foePr = foeAction.slot ? MOVES[foeAction.slot.id].pr : 0;
      let meFirst;
      if (myPr !== foePr) meFirst = myPr > foePr;
      else {
        const a = this.speedOf(this.me, this.vMe), b = this.speedOf(this.foe, this.vFoe);
        meFirst = a === b ? Math.random() < .5 : a > b;
      }
      const mine = { user: 'me', slot: mySlot };
      const theirs = { user: 'foe', ...foeAction };
      order = meFirst ? [mine, theirs] : [theirs, mine];
    } else {
      order = [{ user: 'foe', ...foeAction }];
    }
    for (let i = 0; i < order.length; i++) {
      const a = order[i];
      const user = a.user === 'me' ? this.me : this.foe;
      const target = a.user === 'me' ? this.foe : this.me;
      if (user.hp <= 0 || target.hp <= 0 && !a.heal) continue;
      if (a.heal) { await this.aiHeal(); continue; }
      await this.useMove(user, target, a.user === 'me' ? this.vMe : this.vFoe, a.user === 'me' ? this.vFoe : this.vMe, a.slot, i === 0);
      const r = await this.checkFaints();
      if (r) return r;
      if (r === false) break; // 有一方倒下並已替換，這回合結束
    }
    await this.endOfTurn();
    const r = await this.checkFaints();
    return r || null;
  }

  // ---------- AI ----------
  aiChoose() {
    const foe = this.foe;
    if (this.aiItems > 0 && foe.hp < Mon.maxHp(foe) * .25 && Math.random() < .7) {
      return { heal: true };
    }
    const usable = foe.moves.filter(m => m.pp > 0);
    if (!usable.length) return { slot: null };
    if (this.wildMon) return { slot: U.pick(usable) };
    let best = null;
    for (const slot of usable) {
      const d = MOVES[slot.id];
      let score;
      if (d.c !== 'st' && d.p) {
        const stab = Mon.types(foe).includes(d.t) ? 1.5 : 1;
        score = d.p * stab * typeEff(d.t, Mon.types(this.me)) * ((d.a || 100) / 100);
        if (d.h1) score *= (d.h0 + d.h1) / 2;
      } else if (d.ail && !this.me.st && ['paralysis', 'sleep', 'burn', 'poison'].includes(d.ail)) score = 55;
      else if (d.sx && this.turn <= 2) score = 40;
      else if (d.hl && foe.hp < Mon.maxHp(foe) / 2) score = 60;
      else score = 10;
      score *= .8 + Math.random() * .4;
      if (!best || score > best.score) best = { slot, score };
    }
    return { slot: best.slot };
  }
  async aiHeal() {
    this.aiItems--;
    const foe = this.foe;
    foe.hp = Math.min(Mon.maxHp(foe), foe.hp + 120);
    await this.msg(`${this.trainer.name} 使用了厲害傷藥！`);
    this.draw();
  }

  // ---------- 招式 ----------
  async useMove(user, target, vU, vT, slot, first) {
    const name = this.label(user);
    // 行動前狀態判定
    if (user.st === 'slp') {
      user.slpT = (user.slpT || 1) - 1;
      if (user.slpT <= 0) { user.st = null; this.draw(); await this.msg(`${name} 醒過來了！`); }
      else { await this.msg(`${name} 正在呼呼大睡。`); return; }
    }
    if (user.st === 'frz') {
      if (Math.random() < .2 || (slot && ['fire'].includes(MOVES[slot.id].t))) { user.st = null; this.draw(); await this.msg(`${name} 的冰凍融化了！`); }
      else { await this.msg(`${name} 因冰凍而無法行動！`); return; }
    }
    if (vU.flinch) { await this.msg(`${name} 畏縮了，無法使出招式！`); return; }
    if (vU.conf > 0) {
      vU.conf--;
      if (vU.conf === 0) await this.msg(`${name} 的混亂解除了！`);
      else {
        await this.msg(`${name} 混亂了！`);
        if (Math.random() < 1 / 3) {
          const st = Mon.stats(user);
          const dmg = Math.max(1, Math.floor((Math.floor(Math.floor(2 * user.lv / 5 + 2) * 40 * st[1] / st[2]) / 50 + 2) * (.85 + Math.random() * .15)));
          await this.hurt(user, dmg);
          await this.msg('不知所以地攻擊了自己！');
          return;
        }
      }
    }
    if (user.st === 'par' && Math.random() < .25) { await this.msg(`${name} 因麻痺而無法動彈！`); return; }
    if (vU.love && Math.random() < .5) { await this.msg(`${name} 著迷了，無法使出招式！`); return; }

    const mv = slot ? MOVES[slot.id] : STRUGGLE;
    if (!slot) await this.msg(`${name} 沒有可以使用的招式了！`);
    await this.msg(`${name} 使出了 ${mv.n}！`);
    if (slot) slot.pp = Math.max(0, slot.pp - 1);

    const selfTarget = SELF_TARGETS.has(mv.tg);
    const field = FIELD_TARGETS.has(mv.tg);
    const fixed = FIXED_DMG[mv.id];
    const damaging = mv.c !== 'st' && (mv.p > 0 || fixed || mv.cat === 'ohko' || mv.cat?.startsWith('damage'));

    // 命中判定
    if (!selfTarget && !field && mv.a) {
      let acc = mv.a * accMul(U.clamp(vU.stg.acc - vT.stg.eva, -6, 6));
      if (mv.cat === 'ohko') acc = 30 + Math.max(0, user.lv - target.lv);
      if (mv.cat === 'ohko' && target.lv > user.lv) acc = 0;
      if (Math.random() * 100 >= acc) { await this.msg('但是沒有命中！'); return; }
    }

    if (mv.id === 156) { // 睡覺
      const max = Mon.maxHp(user);
      if (user.hp >= max) { await this.msg('但是失敗了！'); return; }
      user.hp = max; user.st = 'slp'; user.slpT = 3;
      this.draw();
      await this.msg(`${name} 睡著了，體力完全恢復了！`);
      return;
    }

    if (damaging) {
      const eff = typeEff(mv.t, Mon.types(target));
      if (eff === 0) { await this.msg(`對 ${this.label(target)} 好像沒有效果……`); return; }
      if (mv.cat === 'ohko') {
        await this.hurt(target, target.hp);
        await this.msg('一擊必殺！');
        return;
      }
      const hits = mv.h0 ? U.ri(mv.h0, mv.h1 || mv.h0) : 1;
      let total = 0, n = 0;
      for (let i = 0; i < hits && target.hp > 0; i++) {
        let dmg, crit = false;
        if (fixed) {
          dmg = fixed === 'sonic' ? 20 : fixed === 'rage' ? 40 : fixed === 'level' ? user.lv : fixed === 'half' ? Math.max(1, Math.floor(target.hp / 2)) : Math.max(1, Math.floor(user.lv * (U.ri(50, 150)) / 100));
        } else {
          ({ dmg, crit } = this.calcDamage(user, target, vU, vT, mv, eff));
        }
        dmg = Math.min(dmg, target.hp);
        total += dmg; n++;
        await this.hurt(target, dmg);
        if (crit) await this.msg('擊中了要害！');
      }
      if (!fixed) {
        if (eff > 1) await this.msg('效果絕佳！');
        else if (eff < 1) await this.msg('效果不好……');
      }
      if (hits > 1) await this.msg(`擊中了 ${n} 次！`);
      if (mv.dr > 0 && user.hp > 0) {
        const h = Math.max(1, Math.floor(total * mv.dr / 100));
        await this.healMon(user, h);
        await this.msg(`從 ${this.label(target)} 吸取了體力！`);
      } else if (mv.dr < 0 && user.hp > 0) {
        const r = mv === STRUGGLE ? Math.max(1, Math.floor(Mon.maxHp(user) / 4)) : Math.max(1, Math.floor(total * -mv.dr / 100));
        await this.hurt(user, r);
        await this.msg(`${this.label(user)} 受到了反作用力的傷害！`);
      }
      if (mv.hl > 0 && user.hp > 0) {
        await this.healMon(user, Math.floor(Mon.maxHp(user) * mv.hl / 100));
      }
      // 追加效果
      if (target.hp > 0) {
        if (mv.ail && Math.random() * 100 < (mv.ac || 100)) await this.inflict(target, vT, mv, true);
        if (mv.fc && first && Math.random() * 100 < mv.fc) vT.flinch = true;
      }
      if (mv.sx) {
        const toSelf = mv.cat === 'damage+raise' || (mv.cat !== 'damage+lower' && mv.sx.every(([, c]) => c < 0) && mv.sc === 0);
        const chance = mv.sc || 100;
        const who = toSelf ? user : target, wv = toSelf ? vU : vT;
        if (who.hp > 0 && Math.random() * 100 < chance) for (const [st, c] of mv.sx) await this.stage(who, wv, st, c);
      }
      return;
    }

    // 變化招式
    let did = false;
    if (mv.hl > 0 && (selfTarget || mv.cat === 'heal')) {
      const max = Mon.maxHp(user);
      if (user.hp >= max) { await this.msg(`${name} 的體力已經全滿了！`); return; }
      await this.healMon(user, Math.floor(max * mv.hl / 100));
      await this.msg(`${name} 的體力回復了！`);
      did = true;
    }
    if (mv.sx) {
      const who = selfTarget ? user : target, wv = selfTarget ? vU : vT;
      for (const [st, c] of mv.sx) await this.stage(who, wv, st, c);
      did = true;
    }
    if (mv.ail && !selfTarget) {
      await this.inflict(target, vT, mv, false);
      did = true;
    }
    if (mv.cat === 'swagger' && !mv.ail) { vT.conf = U.ri(2, 5); await this.msg(`${this.label(target)} 混亂了！`); did = true; }
    if (mv.id === 116) { vU.focus = 2; await this.msg(`${name} 變得充滿幹勁！`); did = true; } // 聚氣
    if (!did) await this.msg('但是什麼事都沒有發生。');
  }

  calcDamage(user, target, vU, vT, mv, eff) {
    const phys = mv.c === 'ph';
    const su = Mon.stats(user), st = Mon.stats(target);
    const power = mv.p || 60;
    const critStage = Math.min(3, (mv.cr || 0) + (vU.focus || 0));
    const crit = Math.random() < [1 / 24, 1 / 8, 1 / 2, 1][critStage];
    let aS = phys ? vU.stg.atk : vU.stg.spa, dS = phys ? vT.stg.def : vT.stg.spd;
    if (crit) { aS = Math.max(0, aS); dS = Math.min(0, dS); }
    const a = (phys ? su[1] : su[3]) * stageMul(aS);
    const d = (phys ? st[2] : st[4]) * stageMul(dS);
    let base = Math.floor(Math.floor(Math.floor(2 * user.lv / 5 + 2) * power * a / d) / 50) + 2;
    let mod = (crit ? 1.5 : 1) * (.85 + Math.random() * .15) * eff;
    if (Mon.types(user).includes(mv.t)) mod *= 1.5;
    if (phys && user.st === 'brn') mod *= .5;
    return { dmg: Math.max(1, Math.floor(base * mod)), crit };
  }

  async hurt(m, dmg) {
    m.hp = Math.max(0, m.hp - dmg);
    const side = this.sideOf(m);
    await this.anim(side, 'hit', 350);
    this.draw();
    await U.sleep(250);
  }
  async healMon(m, h) {
    m.hp = Math.min(Mon.maxHp(m), m.hp + h);
    this.draw();
    await U.sleep(250);
  }

  async stage(m, v, stat, c) {
    const k = STAT_KEY[stat];
    if (!k) return;
    const name = this.label(m);
    const cur = v.stg[k];
    if ((c > 0 && cur >= 6) || (c < 0 && cur <= -6)) {
      await this.msg(`${name} 的${STAGE_ZH[k]}已經無法再${c > 0 ? '提高' : '降低'}了！`);
      return;
    }
    v.stg[k] = U.clamp(cur + c, -6, 6);
    const amt = Math.abs(c) >= 3 ? '極大幅' : Math.abs(c) === 2 ? '大幅' : '';
    await this.anim(this.sideOf(m), c > 0 ? 'up' : 'down', 450);
    await this.msg(`${name} 的${STAGE_ZH[k]}${amt}${c > 0 ? '提高' : '降低'}了！`);
  }

  async inflict(target, vT, mv, secondary) {
    const name = this.label(target);
    const types = Mon.types(target);
    let ail = mv.ail;
    if (mv.id === 92) ail = 'toxic';
    const major = { paralysis: 'par', sleep: 'slp', freeze: 'frz', burn: 'brn', poison: 'psn', toxic: 'tox' }[ail];
    const fail = async () => { if (!secondary) await this.msg(`對 ${name} 好像沒有效果……`); };
    if (major) {
      if (target.st) return secondary ? null : this.msg(`${name} 已經處於異常狀態了！`);
      if (major === 'brn' && types.includes('fire')) return fail();
      if (major === 'par' && types.includes('electric')) return fail();
      if ((major === 'psn' || major === 'tox') && (types.includes('poison') || types.includes('steel'))) return fail();
      if (major === 'frz' && types.includes('ice')) return fail();
      if (major === 'par' && mv.id === 86 && types.includes('ground')) return fail();
      target.st = major;
      if (major === 'slp') target.slpT = U.ri(2, 4);
      if (major === 'tox') vT.toxN = 0;
      this.draw();
      const txt = { par: '麻痺了，可能會無法行動！', slp: '睡著了！', frz: '被凍住了！', brn: '被灼傷了！', psn: '中毒了！', tox: '中了劇毒！' }[major];
      await this.anim(this.sideOf(target), 'status', 400);
      await this.msg(`${name} ${txt}`);
      return;
    }
    switch (ail) {
      case 'confusion':
        if (vT.conf > 0) return fail();
        vT.conf = U.ri(2, 5); await this.msg(`${name} 混亂了！`); return;
      case 'leech-seed':
        if (types.includes('grass') || vT.seed) return fail();
        vT.seed = true; await this.msg(`在 ${name} 身上種下了種子！`); return;
      case 'trap':
        if (vT.trap) return;
        vT.trap = U.ri(4, 5); await this.msg(`${name} 被困住了！`); return;
      case 'infatuation':
        vT.love = true; await this.msg(`${name} 著迷了！`); return;
      case 'yawn':
        if (target.st || vT.yawn) return fail();
        vT.yawn = 2; await this.msg(`${name} 變得昏昏欲睡了！`); return;
      default:
        if (!secondary) await this.msg('但是什麼事都沒有發生。');
    }
  }

  async endOfTurn() {
    for (const [m, v, ov, om] of [[this.me, this.vMe, this.vFoe, this.foe], [this.foe, this.vFoe, this.vMe, this.me]]) {
      v.flinch = false;
      if (!m || m.hp <= 0) continue;
      const max = Mon.maxHp(m), name = this.label(m);
      if (m.st === 'brn') { await this.hurt(m, Math.max(1, Math.floor(max / 16))); await this.msg(`${name} 受到了灼傷的傷害！`); }
      else if (m.st === 'psn') { await this.hurt(m, Math.max(1, Math.floor(max / 8))); await this.msg(`${name} 受到了毒的傷害！`); }
      else if (m.st === 'tox') { v.toxN++; await this.hurt(m, Math.max(1, Math.floor(max * Math.min(15, v.toxN) / 16))); await this.msg(`${name} 受到了劇毒的傷害！`); }
      if (m.hp > 0 && v.seed && om && om.hp > 0) {
        const d = Math.max(1, Math.floor(max / 8));
        await this.hurt(m, d); await this.healMon(om, d);
        await this.msg(`寄生種子吸取了 ${name} 的體力！`);
      }
      if (m.hp > 0 && v.trap > 0) {
        v.trap--;
        await this.hurt(m, Math.max(1, Math.floor(max / 8)));
        await this.msg(v.trap ? `${name} 受到了束縛的傷害！` : `${name} 從束縛中解放了！`);
      }
      if (m.hp > 0 && v.yawn > 0) {
        v.yawn--;
        if (v.yawn === 0 && !m.st) { m.st = 'slp'; m.slpT = U.ri(2, 4); this.draw(); await this.msg(`${name} 睡著了！`); }
      }
    }
  }

  // 回傳：'win' | 'lose' | false（有倒下並替換）| null（無事）
  async checkFaints() {
    let changed = null;
    if (this.foe.hp <= 0) {
      await this.anim('foe', 'faint', 600);
      this.el.querySelector('.bmon.foe img').classList.add('gone');
      await this.msg(`${this.foeName()} 倒下了！`);
      await this.awardExp();
      const next = this.foeParty.findIndex(m => m.hp > 0);
      if (next < 0) return 'win';
      this.foeIdx = next;
      this.vFoe = newVol();
      this.participants = new Set([this.myIdx]);
      if (this.me.hp > 0) {
        const c = await UI.choose(['是', '否'], { prompt: `${this.trainer.name} 準備派出 ${Mon.name(this.foe)}。要替換寶可夢嗎？` });
        if (c === 0) {
          const i = await Game.partyMenu({ battle: this });
          if (i >= 0 && i !== this.myIdx) await this.switchTo(i);
        }
      }
      Game.markSeen(this.foe.sp);
      this.setSprite('foe', this.foe);
      this.draw();
      await this.msg(`${this.trainer.name} 派出了 ${Mon.name(this.foe)}！`);
      changed = false;
    }
    if (this.me.hp <= 0) {
      await this.anim('me', 'faint', 600);
      this.el.querySelector('.bmon.me img').classList.add('gone');
      await this.msg(`${Mon.name(this.me)} 倒下了！`);
      if (!G.party.some(m => m.hp > 0)) return 'lose';
      if (this.wildMon) {
        const c = await UI.choose(['換下一隻', '逃跑'], { prompt: '要使用下一隻寶可夢嗎？', cancel: false });
        if (c === 1) {
          const a = Mon.stats(G.party.find(m => m.hp > 0))[5], b = this.speedOf(this.foe, this.vFoe);
          if (a >= b || Math.random() < .5) { await this.msg('順利逃走了！'); return 'run'; }
          await this.msg('沒能逃走！');
        }
      }
      let i = -1;
      while (i < 0) i = await Game.partyMenu({ battle: this, forced: true });
      await this.switchTo(i, true);
      changed = false;
    }
    return changed;
  }

  async awardExp() {
    const foe = this.foe;
    const tr = !!this.trainer;
    const got = [];
    for (let i = 0; i < G.party.length; i++) {
      const m = G.party[i];
      if (m.hp <= 0 || m.lv >= 100) continue;
      const part = this.participants.has(i);
      const amt = Mon.expGain(foe, m, tr, part);
      Mon.gainEV(m, foe);
      got.push([m, amt, part]);
    }
    for (const [m, amt, part] of got) {
      if (part) await this.msg(`${Mon.name(m)} 獲得了 ${amt} 點經驗值！`);
      await Game.giveExp(m, amt, this);
    }
    if (got.some(g => !g[2])) await this.msg('其他夥伴也透過學習裝置獲得了經驗值！');
  }

  async switchTo(i, forced = false) {
    if (!forced && this.me.hp > 0) {
      await this.msg(`回來吧，${Mon.name(this.me)}！`);
      this.el.querySelector('.bmon.me img').classList.add('gone');
      await U.sleep(250);
    }
    this.myIdx = i;
    this.vMe = newVol();
    this.participants.add(i);
    this.setSprite('me', this.me);
    this.draw();
    await this.msg(`去吧！${Mon.name(this.me)}！`);
  }

  async useItem({ item, target }) {
    const it = ITEMS[item];
    if (it.kind === 'ball') return this.throwBall(item);
    const m = G.party[target];
    Game.takeItem(item);
    await this.msg(`${G.state.name} 使用了${it.n}！`);
    await Game.applyItem(m, item, true);
    this.draw();
    return null;
  }

  async throwBall(item) {
    const it = ITEMS[item];
    if (this.trainer) { await this.msg('不能搶奪別人的寶可夢！'); return null; }
    Game.takeItem(item);
    await this.msg(`${G.state.name} 丟出了${it.n}！`);
    const foe = this.foe;
    const M = Mon.maxHp(foe), H = foe.hp;
    const rate = POKEDEX[foe.sp].cr;
    const bonus = ['slp', 'frz'].includes(foe.st) ? 2.5 : foe.st ? 1.5 : 1;
    const a = ((3 * M - 2 * H) * rate * it.rate) / (3 * M) * bonus;
    let shakes = 0, caught = false;
    if (it.rate >= 255 || a >= 255) { caught = true; shakes = 3; }
    else {
      const b = 65536 / Math.pow(255 / a, 0.1875);
      for (shakes = 0; shakes < 4; shakes++) if (Math.random() * 65536 >= b) break;
      caught = shakes >= 4;
      shakes = Math.min(shakes, 3);
    }
    const img = this.el.querySelector('.bmon.foe img');
    const ball = document.createElement('div');
    ball.className = 'pokeball throw ' + item;
    this.el.querySelector('.bmon.foe').appendChild(ball);
    await U.sleep(450);
    img.classList.add('gone');
    ball.classList.remove('throw');
    for (let i = 0; i < shakes; i++) {
      ball.classList.add('shake'); await U.sleep(500); ball.classList.remove('shake'); await U.sleep(300);
    }
    if (caught) {
      ball.classList.add('caught');
      await this.msg(`抓到了！成功捕捉了 ${Mon.name(foe)}！`);
      ball.remove();
      return 'catch';
    }
    ball.remove();
    img.classList.remove('gone');
    await this.msg(['糟糕！寶可夢從球裡跑出來了！', '啊！差一點就抓到了！', '可惡！只差一點點！', '啊啊！還以為抓到了！'][shakes]);
    return null;
  }

  async finish(result) {
    const tr = this.trainer;
    if (result === 'win' && tr) {
      await this.msg(`打敗了 ${tr.title} ${tr.name}！`);
      if (tr.lose) await this.msg(`${tr.name}：「${tr.lose}」`);
      const last = this.foeParty[this.foeParty.length - 1];
      const money = tr.money * last.lv;
      G.state.money += money;
      await this.msg(`獲得了 ${money} 元的獎金！`);
    }
    if (result === 'win' || result === 'catch') {
      G.party.forEach((m, i) => { if (this.participants.has(i) && m.hp > 0) m.happy = Math.min(255, m.happy + 1); });
    }
    if (result === 'catch') {
      await Game.addCaught(this.foe);
    }
    if (result === 'lose') {
      await this.msg(`${G.state.name} 已經沒有可以戰鬥的寶可夢了……`);
      const lost = Math.floor(G.state.money / 2);
      G.state.money -= lost;
      await this.msg(`慌亂中掉了 ${lost} 元……眼前變得一片漆黑！`);
    }
    // 戰鬥結束後才進化（與原作相同）
    for (const m of G.party) {
      if (m._lvUp && m.hp > 0) {
        delete m._lvUp;
        const c = Mon.evoCandidates(m);
        if (c.length) await Game.evolve(m, U.pick(c).to);
      }
      delete m._lvUp;
    }
    this.el.classList.add('hidden');
    UI.hideDialog();
    G.mode = 'world';
    return result;
  }
}
