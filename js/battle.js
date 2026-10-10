// 戰鬥流程：開場、選擇行動、倒下處理、經驗值、捕捉、結束
// 回合處理與招式效果在 engine.js（參考 Pokémon Showdown），畫面在 battle_view.js。

class Battle {
  constructor(opts) {
    this.wildMon = opts.wild || null;
    this.trainer = opts.trainer || null; // {title, name, party, kind, money, lose, sprite}
    this.biome = opts.biome || 'tall';
    this.foeParty = this.wildMon ? [this.wildMon] : this.trainer.party;
    this.foeIdx = 0;
    this.myIdx = G.party.findIndex(m => m.hp > 0);
    this.vMe = newVol();
    this.vFoe = newVol();
    this.participants = new Set([this.myIdx]);
    this.runTries = 0;
    this.turn = 0;
    this.fled = false;
    this.noBlackout = !!opts.noBlackout;
    this.aiItems = this.trainer && this.trainer.kind !== 'trainer' ? (this.trainer.items ?? 2) : 0;
    this.initEngine();
  }
  musicName() {
    if (this.wildMon) return POKEDEX[this.wildMon.sp].lg ? 'battle_legend' : 'battle_wild';
    return { gym: 'battle_gym', champion: 'battle_champion' }[this.trainer.kind] || 'battle_trainer';
  }
  get me() { return G.party[this.myIdx]; }
  get foe() { return this.foeParty[this.foeIdx]; }
  msg(t) { return UI.say(t, { auto: G.settings.battleAuto }); }
  foeName(m = this.foe) { return (this.wildMon ? '野生的 ' : '對手的 ') + Mon.name(m); }
  label(m) { return m === this.foe ? this.foeName(m) : Mon.name(m); }

  // ---------- 主流程 ----------
  async run() {
    this.setup();
    G.mode = 'battle';
    Game.markSeen(this.foe.sp);
    Sound.play(this.musicName());
    this.el.querySelector('.hbox.me').classList.add('hidden');
    this.el.querySelector('.bmon.me img').classList.add('gone');
    if (this.wildMon) {
      this.el.querySelector('.hbox.foe').classList.add('hidden');
      this.setSprite('foe', this.foe);
      await this.wildIntro();
      this.el.querySelector('.hbox.foe').classList.remove('hidden');
      this.draw();
      if (this.foe.shiny) await this.msg('閃閃發光！');
      await this.msg(`野生的 ${Mon.name(this.foe)} 跳出來了！`);
    } else {
      this.el.querySelector('.hbox.foe').classList.add('hidden');
      this.el.querySelector('.bmon.foe img').classList.add('gone');
      await this.trainerIntro();
      await this.msg(`${this.trainer.title} ${this.trainer.name} 向你發起了對戰！`);
      await this.trainerLeave();
      await this.sendOut('foe', this.foe);
      await this.msg(`${this.trainer.name} 派出了 ${Mon.name(this.foe)}！`);
    }
    await this.msg(`就決定是你了！${Mon.name(this.me)}！`);
    await this.sendOut('me', this.me);
    // 登場時的特性（速度快的先發動）
    const first = this.speedOf(this.me, this.vMe) >= this.speedOf(this.foe, this.vFoe) ? [this.me, this.foe] : [this.foe, this.me];
    for (const m of first) await this.abilityStart(m);
    // 館主展開的場地（後期道館）
    const fld = this.trainer && this.trainer.field;
    if (fld) {
      const isTerrain = fld.endsWith('terrain');
      if (isTerrain) { this.field.terrain = fld; this.field.terrainT = 8; } else { this.field.weather = fld; this.field.weatherT = 8; }
      const zh = { raindance: '下起了雨', sunnyday: '日照變強了', sandstorm: '颳起了沙暴', snowscape: '下起了雪', electricterrain: '腳下電流飛竄',
        grassyterrain: '腳下青草如茵', psychicterrain: '腳下傳來奇妙的感覺', mistyterrain: '腳下霧氣繚繞' }[fld];
      await this.msg(`${this.trainer.name} 展開了道館的場地！${zh}！`);
    }

    // 氣場（霸主寶可夢、寶主寶可夢）：帶頭的對手全能力提升 1 級
    if (this.aura) {
      for (const k of ['atk', 'def', 'spa', 'spd', 'spe']) this.vFoe.stg[k] = Math.min(6, this.vFoe.stg[k] + 1);
      await this.msg(`${this.label(this.foe)} 散發著氣場！全部能力都提升了！`);
    }
    // 野外的天氣（整場對戰持續）
    if (this.owWeather && !this.field.weather) {
      this.field.weather = this.owWeather; this.field.weatherT = 99;
      await this.msg({ raindance: '外面正在下雨。', sunnyday: '陽光非常強烈。', snowscape: '外面正在下雪。', sandstorm: '沙暴正在吹襲。' }[this.owWeather] || '');
    }
    let result = null;
    while (!result) {
      this.turn++;
      const v = this.vMe;
      // 鎖定、蓄力、硬直中不用選擇行動
      const action = v.recharge || v.charging || v.locked ? { type: 'move', idx: -2 } : await this.chooseAction();
      result = await this.doTurn(action);
    }
    return this.finish(result);
  }

  async chooseAction() {
    while (true) {
      const me = this.me;
      const c = await UI.choose(['戰鬥', '背包', '寶可夢', '逃跑'], { prompt: `${Mon.name(me)} 要做什麼？`, cols: 2, cancel: false, cls: 'battle-menu' });
      if (c === 0) {
        const usable = me.moves.filter(s => s.pp > 0 && !this.moveBlocked(me, this.vMe, s.id));
        if (!usable.length) return { type: 'move', idx: -1 };
        // 招式名後的記號：＊部分效果未實作、✕未支援
        const mark = id => ({ full: '', partial: '＊', none: '✕' }[md(id).support]);
        const opts = me.moves.map(s => ({ label: MOVES[s.id].n + mark(s.id), disabled: s.pp <= 0 || !!this.moveBlocked(me, this.vMe, s.id) }));
        while (opts.length < 4) opts.push({ label: '－', disabled: true });
        // 招式資訊：PP、屬性；無法使用時說明原因；極巨化中顯示極巨招式
        const info = i => {
          const s = me.moves[i];
          if (!s) return '';
          const m = md(s.id);
          const why = this.moveBlocked(me, this.vMe, s.id);
          const maxName = me._dmax ? (m.cat === 'Status' ? (MAX_MOVES.guard || {}).n : (MAX_MOVES[m.type] || {}).n) : '';
          return `PP　${s.pp}/${m.pp || MOVES[s.id].pp}<br>類型/${(TYPES[m.type] || TYPES.unknown).n}`
            + (why ? `<br><span class="mv-why">因${U.esc(why)}無法使用</span>` : '') + (maxName ? `<br>${maxName}` : '');
        };
        // 特殊能力列：擁有的道具都會顯示，不能用時灰色並說明原因；同時只能選一種
        const gm = this.gimmicks(me);
        let on = null;
        const bar = document.createElement('div');
        bar.id = 'gimmick-bar';
        const drawBar = idx => {
          bar.innerHTML = gm.map(g => {
            const zTxt = g.id === 'z' && on === 'z' && me.moves[idx] ? (ZMove.eligible(this, me, md(me.moves[idx].id)) ? '：' + ZMOVES[ZMove.typeOf(me)].n : '（這個招式屬性不符）') : '';
            return `<span class="gb${g.ok ? '' : ' dis'}${on === g.id ? ' on' : ''}" data-g="${g.id}" title="${U.esc(g.why || '')}">${g.key} ${g.label}${zTxt}${g.ok ? '' : `<small>${U.esc(g.why)}</small>`}</span>`;
          }).join('');
          bar.querySelectorAll('.gb').forEach(el => { el.onclick = ev => { ev.stopPropagation(); toggle(el.dataset.g); }; });
        };
        let focusIdx = 0;
        const toggle = id => { const g = gm.find(x => x.id === id); if (!g || !g.ok) { Sound.sfx('bump'); return; } on = on === id ? null : id; Sound.sfx('select'); drawBar(focusIdx); };
        if (gm.length) { this.el.appendChild(bar); drawBar(0); }
        const onKey = e => {
          if (e.repeat) return false;
          const g = gm.find(x => x.key.toLowerCase() === e.key.toLowerCase());
          if (g) { toggle(g.id); return true; }
          return false;
        };
        let i;
        try {
          i = await UI.choose(opts, { prompt: '', cols: 2, cls: 'move-menu', onFocus: k => { focusIdx = k; if (gm.length) drawBar(k); return info(k); }, onKey });
        } finally { bar.remove(); }
        if (i >= 0) return { type: 'move', idx: i, tera: on === 'tera', mega: on === 'mega', z: on === 'z', dmax: on === 'dmax' };
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

  // 這隻寶可夢可以使用的特殊能力（只列出持有對應道具的；不能用時附上原因）
  gimmicks(me) {
    const bag = G.state.bag, used = this.gimmickUsed ? this.gimmickUsed('me') : false;
    const one = '這場戰鬥已經使用過特殊能力（一場只能用一種）';
    const out = [];
    if (bag['tera-orb']) {
      const why = used ? one : G.state.teraCharged === false ? '太晶珠需要到寶可夢中心充能' : '';
      out.push({ id: 'tera', key: 'R', label: `太晶化（${TYPES[Mon.teraType(me)].n}）`, ok: !why, why });
    }
    if (bag['mega-ring'] || (bag['z-ring'] && me.sp === 800)) {
      const form = typeof Mega !== 'undefined' && Mega.formFor(me);
      const why = used ? one : !form ? '要讓寶可夢攜帶對應的超級石' : '';
      out.push({ id: 'mega', key: 'M', label: form === 'necrozma-ultra' ? '究極爆發' : '超級進化', ok: !why && this.canMega(me), why: why || (this.canMega(me) ? '' : '現在不能超級進化') });
    }
    if (bag['z-ring'] && typeof ZMove !== 'undefined') {
      const t = ZMove.typeOf(me);
      const why = used ? one : !t ? '要讓寶可夢攜帶 Z 純晶' : !this.canZ(me) ? `沒有${TYPES[t].n}屬性的攻擊招式` : '';
      out.push({ id: 'z', key: 'E', label: 'Z 招式', ok: !why, why });
    }
    if (bag['dynamax-band'] && typeof Dmax !== 'undefined') {
      const why = me._dmax ? '已經極巨化了' : used ? one : !this.canDmax(me) ? '這隻寶可夢不能極巨化（攜帶超級石等）' : '';
      out.push({ id: 'dmax', key: 'G', label: Dmax.gmaxForm(me) ? '超極巨化' : '極巨化', ok: !why, why });
    }
    return out;
  }

  // 回傳：'win' | 'lose' | 'run' | false（有倒下並替換）| null（無事）
  async checkFaints() {
    if (this.fled) return 'run';
    let changed = null;
    // 雙方最後一隻同時倒下：自己造成的倒下（自爆、反作用力、生命寶珠等）由造成的一方落敗，其餘視為玩家全滅
    if (this.me.hp <= 0 && this.foe.hp <= 0 && !G.party.some(m => m.hp > 0) && !this.foeParty.some(m => m.hp > 0)) {
      await this.faint('foe');
      await this.faint('me');
      await this.msg('雙方的寶可夢同時倒下了！');
      return this.selfKO === 'foe' ? 'win' : 'lose';
    }
    // 同歸：倒下的一方帶走對手
    for (const [m, v, o] of [[this.foe, this.vFoe, this.me], [this.me, this.vMe, this.foe]]) {
      if (m.hp <= 0 && v.destinyBond && o.hp > 0) {
        v.destinyBond = false;
        await this.msg(`${this.label(m)} 和 ${this.label(o)} 同歸於盡了！`);
        await this.hurt(o, o.hp);
      }
    }
    if (this.foe.hp <= 0) {
      await this.faint('foe');
      await this.msg(`${this.foeName()} 倒下了！`);
      this.sides.foe.fainted++;
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
      await this.msg(`${this.trainer.name} 派出了 ${Mon.name(this.foe)}！`);
      await this.sendOut('foe', this.foe);
      await this.onEntry(this.foe);
      changed = false;
    }
    if (this.me.hp <= 0) {
      await this.faint('me');
      await this.msg(`${Mon.name(this.me)} 倒下了！`);
      this.sides.me.fainted++;
      if (!G.party.some(m => m.hp > 0)) return 'lose';
      if (this.wildMon) {
        const c = await UI.choose(['換下一隻', '逃跑'], { prompt: '要使用下一隻寶可夢嗎？', cancel: false });
        if (c === 1) {
          const a = Mon.stats(G.party.find(m => m.hp > 0))[5], b = this.speedOf(this.foe, this.vFoe);
          if (a >= b || U.rand() < .5) { Sound.sfx('run'); await this.msg('順利逃走了！'); return 'run'; }
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
    if (G.tower) return; // 對戰塔：使用複本，不拿經驗值
    const foe = this.foe;
    const tr = !!this.trainer;
    const got = [];
    for (let i = 0; i < G.party.length; i++) {
      const m = G.party[i];
      if (m.hp <= 0) continue;
      // 努力值：Lv.100 也會獲得
      Mon.gainEV(m, foe);
      if (m.lv >= 100) continue;
      const part = this.participants.has(i);
      if (!part && G.state.expShareOff) continue; // 學習裝置關閉：只有上場的獲得經驗值
      let amt = Mon.expGain(foe, m, tr, part);
      if (m.item === 'lucky-egg') amt = Math.floor(amt * 1.5);
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
      await this.recall('me');
      await this.onSwitchOut(this.me);
    }
    this.myIdx = i;
    this.vMe = newVol();
    this.participants.add(i);
    await this.msg(`去吧！${Mon.name(this.me)}！`);
    await this.sendOut('me', this.me);
    await this.onEntry(this.me);
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

  // 捕捉（第八、九世代的公式）：
  //   a = (3M − 2H) × 捕獲率 × 球 ÷ 3M × 異常狀態（睡眠、冰凍 2.5，其他 1.5）× 低等級加成 max(1, (36 − 2L) ÷ 10)
  //   搖晃判定 4 次，每次通過機率 b ÷ 65536，b = 65536 ÷ (255 ÷ a)^(3/16)
  //   會心捕捉：依已捕捉種數決定倍率，只需通過 1 次判定
  async throwBall(item) {
    const it = ITEMS[item];
    if (this.trainer) { await this.msg('不能搶奪別人的寶可夢！'); return null; }
    if (this.vFoe.semi) { Game.takeItem(item); await this.msg('沒辦法瞄準寶可夢！'); return null; }
    Game.takeItem(item);
    await this.msg(`${G.state.name} 丟出了${it.n}！`);
    const foe = this.foe;
    const M = Mon.maxHp(foe), H = foe.hp;
    const rate = POKEDEX[foe.sp].cr;
    const bonus = ['slp', 'frz'].includes(foe.st) ? 2.5 : foe.st ? 1.5 : 1;
    const lowLevel = Math.max(1, (36 - 2 * foe.lv) / 10);
    const a = ((3 * M - 2 * H) * rate * it.rate) / (3 * M) * bonus * lowLevel;
    const caughtCount = Object.keys(G.state.caught).length;
    const critMul = caughtCount > 600 ? 2.5 : caughtCount > 450 ? 2 : caughtCount > 300 ? 1.5 : caughtCount > 150 ? 1 : caughtCount > 30 ? .5 : 0;
    const critical = U.rand() * 256 < Math.floor(Math.min(255, a) * critMul / 6);
    let shakes = 0, caught = false;
    if (it.rate >= 255 || a >= 255) { caught = true; shakes = 3; }
    else {
      const b = 65536 / Math.pow(255 / a, 0.1875);
      const checks = critical ? 1 : 4;
      for (shakes = 0; shakes < checks; shakes++) if (U.rand() * 65536 >= b) break;
      caught = shakes >= checks;
      shakes = critical ? (caught ? 1 : 0) : Math.min(shakes, 3);
    }
    if (critical) await this.msg('會心捕捉！');
    const ball = await this.catchAnim(item, shakes, caught);
    if (caught) {
      await this.msg(`抓到了！成功捕捉了 ${Mon.name(foe)}！`);
      // 捕捉成功的音樂可以按鍵或點擊跳過
      const skip = UI.waitKey();
      await Promise.race([Sound.jingle('caught'), skip]);
      skip.cancel();
      // 第六世代起：捕捉成功也會獲得經驗值
      await this.awardExp();
      if (ball) ball.remove();
      return 'catch';
    }
    await this.msg(['糟糕！寶可夢從球裡跑出來了！', '啊！差一點就抓到了！', '可惡！只差一點點！', '啊啊！還以為抓到了！'][shakes]);
    return null;
  }

  async finish(result) {
    const tr = this.trainer;
    // 太晶珠用過後要到寶可夢中心充能
    if (this.teraUsed && this.teraUsed.me) G.state.teraCharged = false;
    this.tera = null;
    // 超級進化、原始回歸在戰鬥結束後恢復
    if (typeof Mega !== 'undefined') { G.party.forEach(m => Mega.revert(m)); this.foeParty.forEach(m => Mega.revert(m)); }
    if (result === 'win') Sound.play(this.wildMon ? 'victory_wild' : tr.kind === 'gym' || tr.kind === 'champion' ? 'victory_gym' : 'victory_trainer');
    if (result === 'win' && tr) {
      await this.trainerReturn();
      await this.msg(`打敗了 ${tr.title} ${tr.name}！`);
      if (tr.lose) await this.msg(`${tr.name}：「${tr.lose}」`);
      const last = this.foeParty[this.foeParty.length - 1];
      // 護符金幣：上場過的寶可夢攜帶時獎金加倍
      const coin = [...this.participants].some(i => G.party[i] && G.party[i].item === 'amulet-coin');
      const money = tr.money * last.lv * (coin ? 2 : 1);
      G.state.money += money;
      await this.msg(`獲得了 ${money} 元的獎金！`);
    }
    // 打倒野生寶可夢：掉落素材（招式機器的材料）
    if (result === 'win' && this.wildMon && typeof TM !== 'undefined') await this.msg(TM.drop(this.wildMon));
    if (result === 'win' || result === 'catch') {
      G.party.forEach((m, i) => { if (this.participants.has(i) && m.hp > 0) m.happy = Math.min(255, m.happy + 1); });
    }
    if (result === 'catch') await Game.addCaught(this.foe);
    if (result === 'lose' && this.noBlackout) {
      await this.msg(`${tr ? tr.name : ''}：「哈哈，我贏了！」`);
    } else if (result === 'lose') {
      await this.msg(`${G.state.name} 已經沒有可以戰鬥的寶可夢了……`);
      // 第四世代起：掉落金額 = 隊伍最高等級 × 依徽章數的倍率
      const base = [8, 16, 24, 36, 48, 64, 80, 100, 120][Math.min(8, Game.badgeCount())];
      const lost = Math.min(G.state.money, Math.max(...G.party.map(m => m.lv)) * base);
      G.state.money -= lost;
      await this.msg(`慌亂中掉了 ${lost} 元……眼前變得一片漆黑！`);
    }
    if (this.vMe.tracedFrom) this.me.ability = this.vMe.tracedFrom;
    // 戰鬥結束後才進化（與原作相同）
    for (const m of G.party) {
      if (m._lvUp && m.hp > 0 && m.item !== 'everstone') {
        delete m._lvUp;
        const c = Mon.evoCandidates(m);
        if (c.length) await Game.evolve(m, Mon.pickEvo(m, c));
      }
      delete m._lvUp;
    }
    this.el.classList.add('hidden');
    document.body.classList.remove('in-battle');
    UI.hideDialog();
    G.mode = 'world';
    Game.updateMusic(true);
    return result;
  }
}
