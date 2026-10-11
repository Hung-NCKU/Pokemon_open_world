// 雙打（第一版：固定的 NPC 雙打，驗證選擇目標、全體招式、隊友特性與換人）
// 做法：沿用單打引擎，每次行動前把「我方／對手」切換成行動的那一對（ctx），每隻寶可夢有自己的狀態（vols）
// - 單體招式：選擇目標（對手兩隻都在時）；目標倒下時改打另一隻
// - 全體招式：allAdjacentFoes 打兩隻對手；allAdjacent（地震、衝浪、放電、大爆炸……）連隊友也打到；目標兩個以上時威力 ×0.75
//   隊友有心靈感應時不會被隊友的招式打到
// - 單體招式可以選隊友當目標（花粉團、治癒波動……）
// - 行動順序：優先度 → 當下的速度（每次行動後重新排序，順風、冰凍之風等速度變化立刻生效，第八世代起的規則）
// - AI：比較兩個目標選傷害最大的，避免用會打到自己隊友的全體招式
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
  sideOf(m) { return this.sideKey(m); }
  // 守住類：佇列裡沒有其他還能行動的寶可夢時，就是最後行動
  isLastMover() { return !this._pending || !this._pending.some(a => a.user && a.user.hp > 0); }
  activeMons() { return [...this.actives('me'), ...this.actives('foe')]; }
  // 雙打專屬的支援招式（幫助、看我嘛、憤怒粉）：和一般招式一樣先經過 runMove 的行動前判定（睡眠、冰凍、畏縮、麻痺、挑釁……），
  // 這裡只結算效果
  async useMoveOn(user, target, mv, act) {
    if (mv.id === 'helpinghand') {
      this._moveUsed = true;
      const ally = this.allyOf(user);
      if (!ally) { await this.msg('但是失敗了！'); return false; }
      this.volOf(ally).helping = true;
      await this.msg(`${this.label(user)} 準備幫助 ${this.label(ally)}！`);
      return true;
    }
    if (mv.id === 'followme' || mv.id === 'ragepowder') {
      this._moveUsed = true;
      this.volOf(user).followMe = mv.id;
      await this.msg(`${this.label(user)} 成為了注目的焦點！`);
      return true;
    }
    return super.useMoveOn(user, target, mv, act);
  }
  get activePerHalf() { return 2; } // 每邊兩隻（牆壁的減傷是 2732/4096）
  // 四隻寶可夢各自的行動（突襲、迅雷查的是目標那一隻，不是「那一邊」）
  queuedMoveOf(m) { const a = this.queuedBy && this.queuedBy.get(m); return a && a.type === 'move' && a.mv ? a.mv : null; }
  // 未來攻擊：打施放時選的格位目前在場的寶可夢
  futureTarget(fu) {
    const list = fu.side === 'me' ? this.mySlots.map(i => G.party[i]) : this.foeSlots.map(i => this.foeParty[i]);
    return list[fu.slot || 0] || null;
  }
  focusOn(m) {
    const [me, foe] = [this.me, this.foe];
    if (this.sideKey(m) === 'foe') this.ctx(null, m); else this.ctx(m, null);
    return () => this.ctx(me, foe);
  }
  label(m) { return this.foeParty.includes(m) ? this.foeName(m) : Mon.name(this.shownMon(m)); }
  // 先行一步、延後：讓目標接著行動，或排到最後
  reorder(m, how) {
    const a = this._pending && this._pending.find(x => x.user === m);
    if (!a) return false;
    if (how === 'first') a.afterYou = true; else a.quash = true;
    return true;
  }
  // 自己換下（急速折返、伏特替換、危險迴避……）：換上後備，放進同一個格位
  async selfSwitchOut(user, mv) {
    const side = this.sideKey(user), mine = side === 'me';
    const party = mine ? G.party : this.foeParty, slots = mine ? this.mySlots : this.foeSlots;
    const k = this.slotOf(user);
    const opts = party.map((m, i) => i).filter(i => party[i].hp > 0 && !slots.includes(i));
    if (k < 0 || !opts.length) return;
    let i = -1;
    if (mine) { while (i < 0 || slots.includes(i) || G.party[i].hp <= 0) i = await Game.partyMenu({ battle: this, forced: true }); }
    else i = U.pick(opts);
    const v0 = this.volOf(user);
    const keep = mv && mv.selfSwitch === 'copyvolatile' ? { stg: { ...v0.stg }, sub: v0.sub } : null;
    if (mine) this.ctx(user, null); else this.ctx(null, user);
    await this.msg(mine ? `回來吧，${Mon.name(user)}！` : `${this.trainer.name} 收回了 ${Mon.name(user)}！`);
    await this.recall(side);
    await this.onSwitchOut(user);
    this.vols.delete(user);
    slots[k] = i;
    const m = party[i], v = this.volOf(m);
    if (keep) Object.assign(v, keep);
    if (mine) { this.myIdx = i; this.vMe = v; this.participants.add(i); } else { this.foeIdx = i; this.vFoe = v; Game.markSeen(m.sp); }
    this.front(side, k);
    await this.msg(mine ? `去吧！${Mon.name(m)}！` : `${this.trainer.name} 派出了 ${Mon.name(this.shownMon(m))}！`);
    await this.sendOut(side, m);
    await this.onEntry(m);
    this.drawAll();
  }
  // 交換場地：和隊友交換位置
  async swapAlly(user) {
    const ally = this.allyOf(user);
    if (!ally) return false;
    const side = this.sideKey(user), arr = side === 'me' ? this.mySlots : this.foeSlots;
    const i = this.slotOf(user), j = this.slotOf(ally);
    [arr[i], arr[j]] = [arr[j], arr[i]];
    for (const m of [user, ally]) this.refreshSprite(m);
    this.drawAll();
    await this.msg(`${this.label(user)} 和 ${this.label(ally)} 交換了位置！`);
    return true;
  }
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
      // 體力框：src/battle_interface.c 的 InitBattlerHealthboxCoords（雙打：我方左 (159,76)、右 (171,101)，對手左 (44,19)、右 (32,44)）
      // 錨點是精靈的中心，框圖的左上角＝錨點 −(32,16)；框圖寬 100 像素（300px），四個框都在 720px 的畫面內
      hbox: { foe: [{ left: '36px', top: '9px' }, { left: '0px', top: '84px' }], me: [{ left: '381px', top: '180px' }, { left: '417px', top: '255px' }] },
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
        if (kind === 'hbox') { x.classList.add('dbl'); x.style.zIndex = 8; }
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
      // 單體招式：對手兩隻都在、或有隊友時選擇目標（normal、any 可以選隊友）
      const ally = this.allyOf(m);
      const canAlly = ally && mv && ['normal', 'any', 'adjacentAllyOrSelf'].includes(mv.target);
      if (mv && (foes.length > 1 || canAlly) && ['normal', 'any', 'adjacentFoe', 'adjacentAllyOrSelf'].includes(mv.target)) {
        const opts = [...foes.map(f => this.foeName(f)), ...(canAlly ? [`隊友 ${Mon.name(ally)}`] : []), '取消'];
        const t = await UI.choose(opts, { prompt: `要對誰使用 ${mv.n}？` });
        if (t < 0 || t === opts.length - 1) continue;
        return { ...a, user: m, target: t < foes.length ? foes[t] : ally };
      }
      return { ...a, user: m, target: foes[0] };
    }
  }
  // AI：對每個目標各評估一次，選估計傷害比例最高的；會打到自己隊友的全體招式不用（隊友免疫時例外）
  aiDouble(m) {
    const targets = this.actives('me');
    const v = this.volOf(m);
    if (v.recharge || v.charging || v.locked) { this.ctx(targets[0], m); return { type: 'move', idx: -2, user: m, target: targets[0], foe: true }; }
    const ally = this.allyOf(m);
    this._aiExclude = new Set();
    if (ally && typeof AI !== 'undefined') {
      m.moves.forEach((s, i) => {
        const mv = md(s.id);
        if (mv.target !== 'allAdjacent' || mv.cat === 'Status') return;
        const hurt = this.ab(ally) === 'telepathy' ? 0 : AI.est(this, m, ally, mv, { typesT: this.typesOf(ally) });
        if (hurt > ally.hp * .15) this._aiExclude.add(i);
      });
    }
    let best = null;
    for (const t of targets) {
      this.ctx(t, m);
      const a = this.aiChoose();
      if (a.heal) { this._aiExclude = null; return { type: 'move', idx: 0, user: m, target: t, foe: true, heal: true }; }
      const s = a.idx >= 0 ? md(m.moves[a.idx].id) : null;
      const val = s && typeof AI !== 'undefined' ? AI.est(this, m, t, s, { vU: v, vT: this.volOf(t) }) / Math.max(1, t.hp) + U.rand() * .05 : U.rand();
      if (!best || val > best.val) best = { val, idx: a.idx ?? 0, target: t };
    }
    this._aiExclude = null;
    this.ctx(best.target, m);
    return { type: 'move', idx: best.idx, user: m, target: best.target, foe: true };
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
        this.vols.delete(a.user); // 換下的寶可夢：能力等級等暫時狀態歸零（例如預知未來之後換下，不保留換下前的特攻等級）
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
    // 行動順序：每次行動後用當下的速度重新排序（第八世代起）
    const pending = [...moves];
    this._pending = pending;
    this.queuedBy = new Map(acts.filter(a => a.user).map(a => [a.user, a]));
    for (const a of moves) a._once = {}; // 整個招式只結算一次的效果（生命寶珠、自身能力變化）
    let first = true;
    while (pending.length) {
      for (const a of pending) a.spe = a.user && a.user.hp > 0 ? this.speedOf(a.user, this.volOf(a.user)) * (this.field.trickRoom ? -1 : 1) : -1e9;
      // 先行一步的目標排最前、被延後的排最後，其餘依優先度 → 速度
      pending.sort((x, y) => (y.afterYou ? 1 : 0) - (x.afterYou ? 1 : 0) || (x.quash ? 1 : 0) - (y.quash ? 1 : 0) || y.pri - x.pri || y.spe - x.spe || x.rnd - y.rnd);
      const a = pending.shift();
      const user = a.user;
      if (!user || user.hp <= 0 || !this.activeMons().includes(user)) continue; // 倒下或已經換下
      const oppSide = this.sideKey(user) === 'me' ? 'foe' : 'me';
      const opps = this.actives(oppSide);
      if (!opps.length) break;
      // 目標：吸引招式 → 指定目標（可以是隊友）→ 另一隻
      const ally = this.allyOf(user);
      const toAlly = a.target && ally && a.target === ally && ally.hp > 0;
      let target = toAlly ? ally : a.target && a.target.hp > 0 && opps.includes(a.target) ? a.target : opps[0];
      // 吸引招式：螺旋尾鰭、堅毅不受影響；憤怒粉對草屬性、防塵、防塵護目鏡無效
      const powderSafe = this.typesOf(user).includes('grass') || this.ab(user) === 'overcoat' || this.itm(user) === 'safety-goggles';
      const lure = ['propeller-tail', 'stalwart'].includes(this.ab(user)) || a.mv.id === 'snipeshot' ? null
        : opps.find(o => this.volOf(o).followMe && !(this.volOf(o).followMe === 'ragepowder' && powderSafe));
      if (lure && !toAlly && ['normal', 'any', 'adjacentFoe'].includes(a.mv.target)) target = lure;
      if (toAlly) { if (this.sideKey(user) === 'me') this.ctx(ally, opps[0]); else this.ctx(opps[0], ally); }
      else this.pair(user, target);
      // 全體招式：第一個目標走完整流程，其他目標（另一隻對手、allAdjacent 的隊友）只計算命中與傷害
      const hitsAlly = a.mv.target === 'allAdjacent' && ally && ally.hp > 0;
      const others = ['allAdjacentFoes', 'allAdjacent'].includes(a.mv.target) ? [...opps.filter(o => o !== target), ...(hitsAlly ? [ally] : [])] : [];
      if (others.length) a.mv = { ...a.mv, spreadMod: .75 };
      this.firstMover = first; first = false;
      this._moveUsed = false;
      // 全體招式：自身的效果與自爆類的倒下等所有目標都打完才結算
      if (others.length) { a._once.after = []; this._deferFaint = new Set(); }
      await this.runMove(user, target, a);
      // 全體招式：只要招式確實使出了，每個目標分開判定（第一個目標守住、免疫或沒打中，不影響其他目標）
      // 大爆炸等自己倒下的招式：仍然打到其他目標；濕氣讓招式沒有使出時不打
      if (others.length && this._moveUsed) {
        for (const o of others) {
          if (o.hp <= 0) continue;
          if (o === ally) {
            if (this.ab(o) === 'telepathy') { await this.msg(`${this.label(o)} 讀出了隊友的攻擊，閃開了！`); continue; }
            const oppo = this.actives(this.sideKey(user) === 'me' ? 'foe' : 'me')[0] || null;
            if (this.sideKey(user) === 'me') this.ctx(o, oppo); else this.ctx(oppo, o);
          } else this.pair(user, o);
          // 破格、渦輪火焰、兆級電壓：每個目標都無視特性（runMove 只替第一個目標設定）
          this.moldTarget = ['mold-breaker', 'teravolt', 'turboblaze'].includes(this.ab(user)) ? o : null;
          try { await this.useMoveOn(user, o, a.mv, a); } finally { this.moldTarget = null; }
        }
      }
      if (others.length) {
        const after = a._once.after || [], faint = this._deferFaint;
        a._once.after = null; this._deferFaint = null;
        if (after.length || (faint && faint.size)) {
          const oppo = this.actives(this.sideKey(user) === 'me' ? 'foe' : 'me')[0] || null;
          if (oppo) this.pair(user, oppo);
          for (const fn of after) await fn();
          for (const u of faint || []) await this.selfFaint(u);
        }
      }
      this.drawAll();
      const r = await this.faintCheck();
      if (r) return r;
    }
    this._pending = null;
    this.queuedBy = null;
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
