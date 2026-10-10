// 雙打（第一版：固定的 NPC 雙打，驗證選擇目標、全體招式、隊友特性與換人）
// 做法：沿用單打引擎，每次行動前把「我方／對手」切換成行動的那一對（ctx），每隻寶可夢有自己的狀態（vols）
// - 單體招式：選擇目標（對手兩隻都在時）；目標倒下時改打另一隻
// - 全體招式（allAdjacentFoes、allAdjacent）：打兩隻對手，威力 ×0.75（第一版不會打到隊友）
// - 隊友：幫助（威力 ×1.5）、看我嘛／憤怒粉（吸引招式）、友情防守、正電／負電、電池、能量點
// - 倒下的寶可夢在回合結束時由後備替換
class DoubleBattle extends Battle {
  constructor(opts) {
    super(opts);
    this.doubles = true;
    this.vols = new Map();
    this.mySlots = G.party.map((m, i) => i).filter(i => G.party[i].hp > 0).slice(0, 2);
    this.foeSlots = this.foeParty.map((m, i) => i).slice(0, 2);
    this.myIdx = this.mySlots[0];
    this.foeIdx = this.foeSlots[0];
    this.participants = new Set(this.mySlots);
    this.vMe = this.volOf(this.me);
    this.vFoe = this.volOf(this.foe);
  }
  volOf(m) {
    if (!this.vols) return m === this.me ? this.vMe : this.vFoe;
    if (!m) return newVol();
    if (!this.vols.has(m)) this.vols.set(m, newVol());
    return this.vols.get(m);
  }
  sideKey(m) { return this.foeParty.includes(m) ? 'foe' : 'me'; }
  label(m) { return this.foeParty.includes(m) ? this.foeName(m) : Mon.name(m); }
  actives(side) { return (side === 'me' ? this.mySlots.map(i => G.party[i]) : this.foeSlots.map(i => this.foeParty[i])).filter(m => m && m.hp > 0); }
  allyOf(m) {
    const side = this.sideKey(m);
    return this.actives(side).find(x => x !== m) || null;
  }
  slotOf(m) { const side = this.sideKey(m); return (side === 'me' ? this.mySlots.map(i => G.party[i]) : this.foeSlots.map(i => this.foeParty[i])).indexOf(m); }
  // 切換目前的「我方／對手」
  ctx(mine, theirs) {
    if (this.vols) {
      if (this.vMe && this.me) this.vols.set(this.me, this.vMe);
      if (this.vFoe && this.foe) this.vols.set(this.foe, this.vFoe);
    }
    if (mine) { this.myIdx = G.party.indexOf(mine); this.vMe = this.volOf(mine); this.front('me', this.slotOf(mine)); }
    if (theirs) { this.foeIdx = this.foeParty.indexOf(theirs); this.vFoe = this.volOf(theirs); this.front('foe', this.slotOf(theirs)); }
  }
  // 讓目前行動的那一格排在前面（單打的畫面程式用 querySelector 找第一個 .bmon.me）
  front(side, slot) {
    if (!this.slotEls || slot < 0) return;
    const els = this.slotEls[side];
    if (this.curSlot[side] === slot) return;
    this.body = this.body || {};
    this.bodySlots[side][this.curSlot[side]] = this.body[side];
    for (const kind of ['bmon', 'hbox']) {
      const a = els[kind][slot], b = els[kind][1 - slot];
      a.parentNode.insertBefore(a, b);
    }
    this.curSlot[side] = slot;
    this.body[side] = this.bodySlots[side][slot];
  }

  setup() {
    super.setup();
    const el = this.el;
    el.classList.add('doubles');
    // 複製出第二格（位置用 inline style，兩格都保留 .me／.foe 的樣式）
    const pos = {
      bmon: { foe: [{ left: '360px', top: '-6px' }, { left: '516px', top: '6px' }], me: [{ left: '30px', top: '96px' }, { left: '210px', top: '102px' }] },
      hbox: { foe: [{ left: '6px', top: '12px' }, { left: '6px', top: '96px' }], me: [{ left: '444px', top: '178px' }, { left: '444px', top: '256px' }] },
    };
    this.slotEls = { me: { bmon: [], hbox: [] }, foe: { bmon: [], hbox: [] } };
    this.curSlot = { me: 0, foe: 0 };
    this.bodySlots = { me: [null, null], foe: [null, null] };
    for (const side of ['foe', 'me']) for (const kind of ['bmon', 'hbox']) {
      const a = el.querySelector(`.${kind}.${side}`);
      const b = a.cloneNode(true);
      a.after(b);
      [a, b].forEach((x, k) => {
        Object.assign(x.style, pos[kind][side][k]);
        x.dataset.slot = k;
        if (kind === 'hbox') { x.style.transform = `scale(${side === 'me' ? .72 : .82})`; x.style.transformOrigin = 'top left'; x.style.zIndex = 8; }
        if (kind === 'bmon') x.style.zIndex = side === 'me' ? 3 + k : 1 + k;
      });
      this.slotEls[side][kind] = [a, b];
    }
  }
  drawAll() {
    const keep = [this.me, this.foe];
    const ms = this.mySlots.map(i => G.party[i]), fs = this.foeSlots.map(i => this.foeParty[i]);
    for (let k = 0; k < 2; k++) {
      if (ms[k]) { this.ctx(ms[k], null); this.draw(); }
      if (fs[k]) { this.ctx(null, fs[k]); this.draw(); }
    }
    this.ctx(keep[0], keep[1]);
  }
  draw() {
    super.draw();
    // 倒下或空的格子：隱藏血條
    if (!this.slotEls) return;
    for (const side of ['me', 'foe']) {
      const list = side === 'me' ? this.mySlots.map(i => G.party[i]) : this.foeSlots.map(i => this.foeParty[i]);
      this.slotEls[side].hbox.forEach((h, k) => { if (!list[k] || list[k].hp <= 0) h.classList.add('hidden'); });
    }
  }

  // ---------- 主流程 ----------
  async run() {
    this.setup();
    G.mode = 'battle';
    Sound.play(this.musicName());
    for (const side of ['me', 'foe']) for (const k of [0, 1]) {
      this.slotEls[side].hbox[k].classList.add('hidden');
      this.slotEls[side].bmon[k].querySelector('img').classList.add('gone');
    }
    await this.trainerIntro();
    await this.msg(`${this.trainer.title} ${this.trainer.name} 向你發起了雙打對戰！`);
    await this.trainerLeave();
    const fs = this.foeSlots.map(i => this.foeParty[i]);
    for (const m of fs) { Game.markSeen(m.sp); this.ctx(null, m); await this.sendOut('foe', m); }
    await this.msg(`${this.trainer.name} 派出了 ${fs.map(m => Mon.name(m)).join(' 和 ')}！`);
    const ms = this.mySlots.map(i => G.party[i]);
    await this.msg(`去吧！${ms.map(m => Mon.name(m)).join('、')}！`);
    for (const m of ms) { this.ctx(m, null); await this.sendOut('me', m); }
    // 登場特性：速度快的先；威嚇等針對對手的特性對兩隻對手各發動一次
    const all = [...ms, ...fs].sort((a, b) => this.speedOf(b, this.volOf(b)) - this.speedOf(a, this.volOf(a)));
    for (const m of all) await this.entryAbility(m);
    this.drawAll();
    let result = null;
    while (!result) {
      this.turn++;
      result = await this.doubleTurn();
    }
    return this.finish(result);
  }
  async entryAbility(m) {
    const opp = this.actives(this.sideKey(m) === 'me' ? 'foe' : 'me');
    if (this.ab(m) === 'intimidate') {
      for (const o of opp) { this.pair(m, o); await this.abilityStart(m); }
    } else { this.pair(m, opp[0]); await this.abilityStart(m); }
  }
  // 讓 m 和 o 成為目前的一對（不論哪一方）
  pair(m, o) {
    if (this.sideKey(m) === 'me') this.ctx(m, o && this.sideKey(o) === 'foe' ? o : null);
    else this.ctx(o && this.sideKey(o) === 'me' ? o : null, m);
  }

  // 選擇行動（每隻我方寶可夢）
  async chooseDouble(m, k) {
    const foes = this.actives('foe');
    this.ctx(m, foes[0]);
    const v = this.volOf(m);
    if (v.recharge || v.charging || v.locked) return { type: 'move', idx: -2, user: m };
    await this.msg(`${Mon.name(m)} 要做什麼？`);
    while (true) {
      const a = await this.chooseAction();
      if (a.type === 'run') { await this.msg('不行！不能從訓練家對戰中逃走！'); continue; }
      if (a.type === 'switch') {
        if (this.mySlots.includes(a.idx)) { await this.msg(`${Mon.name(G.party[a.idx])} 已經在場上了！`); continue; }
        return { ...a, user: m };
      }
      if (a.type !== 'move') return { ...a, user: m };
      const slot = m.moves[a.idx];
      const mv = slot ? md(slot.id) : null;
      // 單體招式：對手兩隻都在時選擇目標
      if (mv && foes.length > 1 && ['normal', 'any', 'adjacentFoe'].includes(mv.target)) {
        const t = await UI.choose([...foes.map(f => this.foeName(f)), '取消'], { prompt: `要對誰使用 ${mv.n}？` });
        if (t < 0 || t === foes.length) continue;
        return { ...a, user: m, target: foes[t] };
      }
      return { ...a, user: m, target: foes[0] };
    }
  }
  aiDouble(m) {
    const targets = this.actives('me');
    const target = targets[Math.floor(U.rand() * targets.length)];
    this.ctx(target, m);
    const v = this.volOf(m);
    if (v.recharge || v.charging || v.locked) return { type: 'move', idx: -2, user: m, target, foe: true };
    const a = this.aiChoose();
    return { type: 'move', idx: a.idx ?? 0, user: m, target, foe: true, heal: a.heal };
  }

  async doubleTurn() {
    for (const m of [...this.actives('me'), ...this.actives('foe')]) { const v = this.volOf(m); v.hitBy = []; v.damagedThisTurn = false; v.movedThisTurn = false; v.helping = false; v.followMe = false; }
    const acts = [];
    const mine = this.actives('me');
    for (let k = 0; k < mine.length; k++) acts.push(await this.chooseDouble(mine[k], k));
    for (const f of this.actives('foe')) acts.push(this.aiDouble(f));
    this.queued = {};
    // 換人、道具先處理
    for (const a of acts.filter(a => a.type === 'switch' || a.type === 'item')) {
      if (a.user.hp <= 0) continue;
      this.ctx(a.user, this.actives('foe')[0]);
      if (a.type === 'switch') {
        const k = this.slotOf(a.user);
        await this.switchTo(a.idx);
        this.mySlots[k] = a.idx;
        this.vols.set(this.me, this.vMe);
        a.done = true;
      } else { const r = await this.useItem(a); if (r) return r; }
    }
    for (const a of acts.filter(a => a.heal)) { this.ctx(a.target, a.user); await this.aiHeal(); a.done = true; }
    // 招式：優先度 → 速度
    const moves = acts.filter(a => a.type === 'move' && !a.done && !a.heal);
    for (const a of moves) {
      const m = a.user;
      this.pair(m, a.target);
      const r = this.resolveMove(m, this.volOf(m), a.idx);
      Object.assign(a, r);
      a.pri = (a.mv.pri || 0) + (this.ab(m) === 'prankster' && a.mv.cat === 'Status' ? 1 : 0);
      a.spe = this.speedOf(m, this.volOf(m)) * (this.field.trickRoom ? -1 : 1);
      a.rnd = U.rand();
    }
    moves.sort((x, y) => y.pri - x.pri || y.spe - x.spe || x.rnd - y.rnd);
    for (const a of moves) {
      const user = a.user;
      if (!user || user.hp <= 0) continue;
      const oppSide = this.sideKey(user) === 'me' ? 'foe' : 'me';
      const opps = this.actives(oppSide);
      if (!opps.length) break;
      // 目標：吸引招式 → 指定目標 → 另一隻
      let target = a.target && a.target.hp > 0 && opps.includes(a.target) ? a.target : opps[0];
      const lure = opps.find(o => this.volOf(o).followMe);
      if (lure && ['normal', 'any', 'adjacentFoe'].includes(a.mv.target)) target = lure;
      this.pair(user, target);
      // 隊友招式
      if (a.mv.id === 'helpinghand') {
        const ally = this.allyOf(user);
        if (a.slot) a.slot.pp = Math.max(0, a.slot.pp - 1);
        await this.msg(`${this.label(user)} 使出了 ${a.mv.n}！`);
        if (ally) { this.volOf(ally).helping = true; await this.msg(`${this.label(user)} 準備幫助 ${this.label(ally)}！`); }
        else await this.msg('但是失敗了！');
        continue;
      }
      if (a.mv.id === 'followme' || a.mv.id === 'ragepowder') {
        if (a.slot) a.slot.pp = Math.max(0, a.slot.pp - 1);
        await this.msg(`${this.label(user)} 使出了 ${a.mv.n}！`);
        this.volOf(user).followMe = true;
        await this.msg(`${this.label(user)} 成為了注目的焦點！`);
        continue;
      }
      // 全體招式：第一個目標走完整流程，其他目標只計算命中與傷害
      const spread = ['allAdjacentFoes', 'allAdjacent'].includes(a.mv.target) && opps.length > 1;
      if (spread) a.mv = { ...a.mv, spreadMod: .75 };
      this.firstMover = moves.indexOf(a) === 0;
      await this.runMove(user, target, a);
      if (spread && user.hp > 0 && !this.volOf(user).lastMoveFailed) {
        for (const o of opps) {
          if (o === target || o.hp <= 0) continue;
          this.pair(user, o);
          await this.useMoveOn(user, o, a.mv, a);
        }
      }
      this.drawAll();
      const r = await this.faintCheck();
      if (r) return r;
    }
    // 回合結束：每一對各處理一次殘留效果，場地計時只算一次
    const ms = this.actives('me'), fs = this.actives('foe');
    const done = new Set();
    for (let k = 0; k < Math.max(ms.length, fs.length); k++) {
      const a = ms[k] || ms[0], b = fs[k] || fs[0];
      if (!a || !b) break;
      this.ctx(a, b);
      this.residualSkip = new Set(done);
      if (k === 0) await this.endOfTurn();
      else {
        // 第二對：在場地的複本上執行（計時器不再減少、願望不再實現），只處理殘留傷害與回復
        const field = this.field, sides = this.sides;
        const copy = JSON.parse(JSON.stringify({ field, sides }));
        for (const key of Object.keys(copy.field)) if (typeof copy.field[key] === 'number' && copy.field[key] > 0) copy.field[key] = 99;
        for (const sd of Object.values(copy.sides)) { for (const key of Object.keys(sd)) if (typeof sd[key] === 'number' && sd[key] > 0 && !['spikes', 'toxicspikes'].includes(key)) sd[key] = 99; sd.wish = null; }
        const futures = this.futures; this.futures = [];
        this.field = copy.field; this.sides = copy.sides;
        try { await this.endOfTurn(); } finally { this.field = field; this.sides = sides; this.futures = futures; }
      }
      this.residualSkip = null;
      done.add(a); done.add(b);
      const r = await this.faintCheck();
      if (r) return r;
    }
    this.drawAll();
    return this.replaceFainted();
  }

  // 倒下處理：經驗值；全滅判定
  async faintCheck() {
    for (const f of this.foeSlots.map(i => this.foeParty[i])) {
      if (!f || f.hp > 0 || f._fainted) continue;
      f._fainted = true;
      this.ctx(this.actives('me')[0] || null, f);
      await this.faint('foe');
      await this.msg(`${this.foeName(f)} 倒下了！`);
      if (this.actives('me').length) await this.awardExp();
    }
    for (const m of this.mySlots.map(i => G.party[i])) {
      if (!m || m.hp > 0 || m._fainted) continue;
      m._fainted = true;
      this.ctx(m, null);
      await this.faint('me');
      await this.msg(`${Mon.name(m)} 倒下了！`);
    }
    if (!this.foeParty.some(m => m.hp > 0)) return 'win';
    if (!G.party.some(m => m.hp > 0)) return 'lose';
    return null;
  }
  // 回合結束時替換倒下的寶可夢
  async replaceFainted() {
    for (let k = 0; k < 2; k++) {
      const f = this.foeParty[this.foeSlots[k]];
      if (f && f.hp > 0) continue;
      const next = this.foeParty.findIndex((m, i) => m.hp > 0 && !this.foeSlots.includes(i));
      if (next < 0) continue;
      this.foeSlots[k] = next;
      const m = this.foeParty[next];
      Game.markSeen(m.sp);
      this.ctx(this.actives('me')[0] || null, m);
      await this.msg(`${this.trainer.name} 派出了 ${Mon.name(m)}！`);
      await this.sendOut('foe', m);
      await this.onEntry(m);
    }
    for (let k = 0; k < 2; k++) {
      const cur = G.party[this.mySlots[k]];
      if (cur && cur.hp > 0) continue;
      if (!G.party.some((m, i) => m.hp > 0 && !this.mySlots.includes(i))) continue;
      this.ctx(cur || null, this.actives('foe')[0]);
      let i = -1;
      while (i < 0 || this.mySlots.includes(i) || G.party[i].hp <= 0) i = await Game.partyMenu({ battle: this, forced: true });
      this.mySlots[k] = i;
      this.participants.add(i);
      this.myIdx = i;
      this.vMe = this.volOf(G.party[i]);
      this.front('me', k);
      await this.msg(`去吧！${Mon.name(G.party[i])}！`);
      await this.sendOut('me', G.party[i]);
      await this.onEntry(G.party[i]);
    }
    this.drawAll();
    return null;
  }
  async finish(result) {
    for (const m of [...G.party, ...this.foeParty]) delete m._fainted;
    // 單打的結束流程用第一隻
    this.myIdx = G.party.findIndex(m => m.hp > 0) >= 0 ? G.party.findIndex(m => m.hp > 0) : 0;
    this.foeIdx = this.foeParty.length - 1;
    return super.finish(result);
  }
}

// 隊友相關的傷害修正（單打時 allyOf 不存在，不影響）
const _calcDamageD = Battle.prototype.calcDamage;
Battle.prototype.calcDamage = function (user, target, vU, vT, mv, eff, bp) {
  let mod = 1;
  if (this.allyOf) {
    const ua = this.allyOf(user), ta = this.allyOf(target);
    if (vU && vU.helping) mod *= 1.5;
    if (ta && this.ab(ta) === 'friend-guard') mod *= .75;
    if (ua && this.ab(ua) === 'power-spot') mod *= 1.3;
    if (ua && this.ab(ua) === 'battery' && mv.cat === 'Special') mod *= 1.3;
    if (mv.cat === 'Special' && ['plus', 'minus'].includes(this.ab(user)) && ua && ['plus', 'minus'].includes(this.ab(ua))) mod *= 1.5;
  }
  if (mv.spreadMod) mod *= mv.spreadMod;
  const r = _calcDamageD.call(this, user, target, vU, vT, mv, eff, bp);
  if (mod === 1) return r;
  if (typeof r === 'number') return Math.max(1, Math.floor(r * mod));
  if (r && typeof r.dmg === 'number') { r.dmg = Math.max(1, Math.floor(r.dmg * mod)); return r; }
  return r;
};
