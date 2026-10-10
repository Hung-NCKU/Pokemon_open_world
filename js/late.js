// 後期機制：極巨化／超極巨化、太晶團體戰、合體與分離、究極爆發、戰鬥中變形（資料：data/late.js）

// ============ 戰鬥中暫時的形態（變形、極巨化外觀）：戰鬥結束後恢復 ============
const BForm = {
  set(m, form) {
    if (m._bfFrom === undefined) m._bfFrom = m.form || null;
    if (form) m.form = form; else if (m._bfFrom) m.form = m._bfFrom; else delete m.form;
  },
  revert(m) {
    if (!m || m._bfFrom === undefined) return;
    if (m._bfFrom) m.form = m._bfFrom; else delete m.form;
    delete m._bfFrom;
  },
};

// ============ 極巨化 ============
ITEMS['dynamax-band'] = { n: '極巨腕帶', price: 0, kind: 'key', d: '能讓寶可夢極巨化的腕帶。極巨化持續 3 回合，HP 變成 2 倍，招式變成極巨招式。' };
const Dmax = {
  // 第八世代：原本威力 → 極巨招式威力（格鬥、毒另一張表）
  power(bp, type) {
    const low = type === 'fighting' || type === 'poison';
    const t = low ? [70, 75, 80, 85, 90, 95, 100] : [90, 100, 110, 120, 130, 140, 150];
    const k = bp <= 40 ? 0 : bp <= 50 ? 1 : bp <= 60 ? 2 : bp <= 70 ? 3 : bp <= 100 ? 4 : bp <= 140 ? 5 : 6;
    return t[k];
  },
  // 附加效果：天氣／場地、自己能力提升（我方）或對手能力下降
  EFFECT: {
    fire: { weather: 'sunnyday' }, water: { weather: 'raindance' }, rock: { weather: 'sandstorm' }, ice: { weather: 'snowscape' },
    electric: { terrain: 'electricterrain' }, grass: { terrain: 'grassyterrain' }, psychic: { terrain: 'psychicterrain' }, fairy: { terrain: 'mistyterrain' },
    fighting: { self: { atk: 1 } }, flying: { self: { spe: 1 } }, poison: { self: { spa: 1 } }, ground: { self: { spd: 1 } }, steel: { self: { def: 1 } },
    normal: { foe: { spe: -1 } }, dragon: { foe: { atk: -1 } }, ghost: { foe: { def: -1 } }, dark: { foe: { spd: -1 } }, bug: { foe: { spa: -1 } },
  },
  gmaxForm(m) { const k = POKEDEX[m.sp].en + '-gmax'; return m.gmax && FORMS[k] ? k : null; },
  make(b, user, mv) {
    if (mv.cat === 'Status') {
      const g = md(182);
      return { ...g, id: 'maxguard', baseId: mv.id, n: (MAX_MOVES.guard || {}).n || '極巨防壁', pri: 4, isMax: true };
    }
    const type = b.moveType(user, mv);
    const gm = Dmax.gmaxForm(user);
    const name = gm ? `超極巨${TYPES[type].n}` : (MAX_MOVES[type] || {}).n || '極巨攻擊';
    return { ...mv, id: 'maxmove', baseId: mv.id, n: name, type, bp: Dmax.power(mv.bp, type), acc: true, isMax: true, maxEffect: type,
      secondary: null, secondaries: null, self: null, multihit: null, drain: null, recoil: null, flags: { ...mv.flags, protect: 1 } };
  },
};
// 極巨化時 HP 2 倍；團體戰的首領 HP 5 倍
const _monStats = Mon.stats;
Mon.stats = function (m) {
  const s = _monStats.call(this, m);
  if (m && (m._dmax || m._raid)) return [s[0] * (m._raid ? 5 : 2), s[1], s[2], s[3], s[4], s[5]];
  return s;
};

Object.assign(Battle.prototype, {
  canDmax(m) {
    const side = this.sideKey(m);
    if (this.gimmickUsed(side) || (this.dmaxUsed && this.dmaxUsed[side])) return false;
    if (side === 'me' && !G.state.bag['dynamax-band']) return false;
    return !Mega.formFor(m) && !(m.form && FORMS[m.form] && (FORMS[m.form].mega || FORMS[m.form].primal));
  },
  async dynamax(m) {
    const side = this.sideKey(m);
    if (!this.canDmax(m)) return;
    this.dmaxUsed = this.dmaxUsed || {};
    this.dmaxUsed[side] = true;
    await this.msg(side === 'me' ? `${Mon.name(m)}，回來吧！\n用極巨腕帶的力量……極巨化吧！` : `${this.label(m)} 極巨化了！`);
    const gm = Dmax.gmaxForm(m);
    m.hp = m.hp * 2;
    m._dmax = true;
    this.volOf(m).dmaxT = 3;
    this.volOf(m).choiceLock = null;
    if (gm) BForm.set(m, gm);
    if (this.setSprite) { this.setSprite(side, m); this.el.querySelector(`.bmon.${side} img`).classList.add('dmax'); }
    await this.msg(gm ? `${Mon.name(m)} 超極巨化了！` : `${this.label(m)} 變得巨大了！`);
    this.draw();
  },
  async undynamax(m, quiet = false) {
    if (!m || !m._dmax) return;
    m._dmax = false;
    delete m._dmax;
    if (m.hp > 0) m.hp = Math.ceil(m.hp / 2);
    if (Dmax.gmaxForm(m) && m.form === Dmax.gmaxForm(m)) BForm.revert(m);
    if (this.el) { const side = this.sideKey(m); if (this.setSprite) this.setSprite(side, m); const img = this.el.querySelector(`.bmon.${side} img`); if (img) img.classList.remove('dmax'); }
    if (!quiet) await this.msg(`${this.label(m)} 恢復了原本的樣子！`);
    this.draw && this.draw();
  },
  aiDmax() { return !!(!this.wildMon && this.trainer && this.trainer.dmax && this.foe === this.foeParty[this.foeParty.length - 1] && this.canDmax(this.foe)); },
});
// 「一場一種」也包含極巨化
const _gimmickUsed = Battle.prototype.gimmickUsed;
Battle.prototype.gimmickUsed = function (side) { return _gimmickUsed.call(this, side) || !!(this.dmaxUsed && this.dmaxUsed[side]); };

// 招式換成極巨招式
const _resolveMoveD = Battle.prototype.resolveMove;
Battle.prototype.resolveMove = function (m, v, idx) {
  const r = _resolveMoveD.call(this, m, v, idx);
  if (m._dmax && r.mv && !r.recharge && r.mv !== STRUGGLE_MD) r.mv = Dmax.make(this, m, r.mv);
  return r;
};
const _runMoveD = Battle.prototype.runMove;
Battle.prototype.runMove = async function (user, target, act) {
  if (user._dmax) { this.volOf(user).flinch = false; this.volOf(user).choiceLock = null; } // 極巨化不會畏縮、不受講究類限制
  await BattleForms.before(this, user, act);
  const r = await _runMoveD.call(this, user, target, act);
  const mv = act.mv;
  if (mv && mv.maxEffect && user.hp > 0 && !this.volOf(user).lastMoveFailed) {
    const e = Dmax.EFFECT[mv.maxEffect] || {};
    if (e.weather && this.field.weather !== e.weather) { this.field.weather = e.weather; this.field.weatherT = 5; await this.msg({ sunnyday: '日照變強了！', raindance: '開始下雨了！', sandstorm: '開始颳沙暴了！', snowscape: '開始下雪了！' }[e.weather]); }
    if (e.terrain && this.field.terrain !== e.terrain) { this.field.terrain = e.terrain; this.field.terrainT = 5; await this.msg({ electricterrain: '腳下電流飛竄！', grassyterrain: '腳下青草如茵！', psychicterrain: '腳下傳來奇妙的感覺！', mistyterrain: '腳下霧氣繚繞！' }[e.terrain]); }
    if (e.self) await this.boost(user, e.self, user);
    if (e.foe && target && target.hp > 0) await this.boost(target, e.foe, user);
  }
  return r;
};
// 極巨化的寶可夢不會被強制換下
const _forceOut = Battle.prototype.forceOut;
Battle.prototype.forceOut = async function (m) {
  if (m && m._dmax) { await this.msg('但是失敗了！'); return; }
  return _forceOut.call(this, m);
};
// 回合開始：玩家按 D、訓練家的王牌
const _doTurnD = Battle.prototype.doTurn;
Battle.prototype.doTurn = async function (action) {
  if (action && action.type === 'move' && action.dmax) await this.dynamax(this.me);
  if (this.aiDmax && this.aiDmax()) await this.dynamax(this.foe);
  return _doTurnD.call(this, action);
};
// 回合結束：極巨化倒數、戰鬥中變形、團體戰的同伴與時間
const _endOfTurnD = Battle.prototype.endOfTurn;
Battle.prototype.endOfTurn = async function () {
  await _endOfTurnD.call(this);
  for (const m of [this.me, this.foe]) {
    if (!m || m.hp <= 0) continue;
    if (m._dmax) { const v = this.volOf(m); if (--v.dmaxT <= 0) await this.undynamax(m); }
    await BattleForms.endOfTurn(this, m);
  }
  if (this.raid) await Raid.endOfTurn(this);
};
const _onSwitchOutD = Battle.prototype.onSwitchOut;
Battle.prototype.onSwitchOut = async function (m) {
  if (m && m._dmax) await this.undynamax(m, true);
  await BattleForms.switchOut(this, m);
  return _onSwitchOutD.call(this, m);
};
const _onEntryD = Battle.prototype.onEntry;
Battle.prototype.onEntry = async function (m) {
  const r = await _onEntryD.call(this, m);
  if (m && m.hp > 0) await BattleForms.entry(this, m);
  return r;
};
const _finishD = Battle.prototype.finish;
Battle.prototype.finish = async function (result) {
  for (const m of [...G.party, ...this.foeParty]) {
    if (m._dmax) { delete m._dmax; if (m.hp > 0) m.hp = Math.ceil(m.hp / 2); }
    BForm.revert(m);
    delete m._heroReady;
  }
  return _finishD.call(this, result);
};

// ============ 戰鬥中變形 ============
const BattleForms = {
  async change(b, m, form, txt) {
    const before = m.form || null;
    BForm.set(m, form);
    if ((m.form || null) === before) return;
    m.hp = Math.min(m.hp, Mon.maxHp(m));
    if (b.setSprite && b.el) b.setSprite(b.sideKey(m), m);
    if (txt) await b.msg(txt);
    b.draw && b.draw();
  },
  // 使用招式前：堅盾劍怪的戰鬥切換
  async before(b, m, act) {
    if (m.sp !== 681 || b.ab(m) !== 'stance-change' || !act.mv) return;
    if (act.mv.cat !== 'Status' && m.form !== 'aegislash-blade') await BattleForms.change(b, m, 'aegislash-blade', `［戰鬥切換］${b.label(m)} 切換成刀劍形態！`);
    else if (act.mv.id === 'kingsshield' && m.form === 'aegislash-blade') await BattleForms.change(b, m, null, `［戰鬥切換］${b.label(m)} 切換成盾牌形態！`);
  },
  async entry(b, m) {
    if (m._heroReady) { delete m._heroReady; await b.msg(`［全能變身］${b.label(m)} 變身成英雄了！`); }
    await BattleForms.hpForms(b, m);
  },
  async endOfTurn(b, m) { await BattleForms.hpForms(b, m); },
  // 弱丁魚（魚群）、達摩狒狒（達摩模式）、小隕星（界限盾殼）：依 HP 變化
  async hpForms(b, m) {
    const max = Mon.maxHp(m), a = b.ab(m);
    if (m.sp === 746 && a === 'schooling') {
      const want = m.lv >= 20 && m.hp > max / 4 ? 'wishiwashi-school' : null;
      if ((m.form || null) !== want) await BattleForms.change(b, m, want, want ? `［魚群］${b.label(m)} 聚集成魚群了！` : `［魚群］${b.label(m)} 的魚群散開了！`);
    }
    if (m.sp === 555 && a === 'zen-mode') {
      const galar = (m._bfFrom ?? m.form) === 'darmanitan-galar-standard';
      const zen = galar ? 'darmanitan-galar-zen' : 'darmanitan-zen';
      if (m.hp <= max / 2 && m.form !== zen) await BattleForms.change(b, m, zen, `［達摩模式］${b.label(m)} 進入了達摩模式！`);
      else if (m.hp > max / 2 && m.form === zen) await BattleForms.change(b, m, null, `［達摩模式］${b.label(m)} 恢復了原本的樣子！`);
    }
    if (m.sp === 774 && a === 'shields-down') {
      if (m.hp <= max / 2 && m.form !== 'minior-red') await BattleForms.change(b, m, 'minior-red', `［界限盾殼］${b.label(m)} 的外殼剝落了！`);
      else if (m.hp > max / 2 && m.form === 'minior-red') await BattleForms.change(b, m, null, `［界限盾殼］${b.label(m)} 重新長出了外殼！`);
    }
  },
  // 海豚俠：退場後變成英雄形態（持續到戰鬥結束）
  async switchOut(b, m) {
    if (m && m.sp === 964 && b.ab(m) === 'zero-to-hero' && m.form !== 'palafin-hero') { BForm.set(m, 'palafin-hero'); m._heroReady = true; }
  },
};
// 謎擬Ｑ：畫皮擋下第一次招式傷害，改受 1/8 HP 的傷害
const _useMoveOnD = Battle.prototype.useMoveOn;
Battle.prototype.useMoveOn = async function (user, target, mv, act) {
  this._moveHitBy = user;
  try { return await _useMoveOnD.call(this, user, target, mv, act); } finally { this._moveHitBy = null; }
};
const _hurtD = Battle.prototype.hurt;
Battle.prototype.hurt = async function (m, dmg, eff) {
  if (m && m.sp === 778 && this._moveHitBy && this._moveHitBy !== m && m.form !== 'mimikyu-busted' && this.ab(m) === 'disguise' && dmg > 0) {
    await this.msg(`［畫皮］${this.label(m)} 的畫皮代替它承受了攻擊！`);
    await BattleForms.change(this, m, 'mimikyu-busted', `${this.label(m)} 的畫皮脫落了！`);
    dmg = Math.max(1, Math.floor(Mon.maxHp(m) / 8));
    this._moveHitBy = null;
    return _hurtD.call(this, m, dmg, 1);
  }
  return _hurtD.call(this, m, dmg, eff);
};

// ============ 合體與分離、究極爆發 ============
const FUSION = [
  { item: 'dna-splicers', n: '基因之楔', base: 646, parts: { 643: 'kyurem-white', 644: 'kyurem-black' } },
  { item: 'n-solarizer', n: '奈克洛索爾合體器', base: 800, parts: { 791: 'necrozma-dusk' } },
  { item: 'n-lunarizer', n: '奈克洛露奈合體器', base: 800, parts: { 792: 'necrozma-dawn' } },
  { item: 'reins-of-unity', n: '牽絆韁繩', base: 898, parts: { 896: 'calyrex-ice', 897: 'calyrex-shadow' } },
];
for (const f of FUSION) ITEMS[f.item] = { n: f.n, price: 0, kind: 'key', d: `讓${POKEDEX[f.base].n}與夥伴合體或分離的道具。` };
ITEMS['ultranecrozium-z'] = { n: '究極奈克洛Ｚ', price: 0, kind: 'held', d: '讓合體後的奈克洛茲瑪攜帶，在戰鬥中可以究極爆發（按 M）。' };
const Fusion = {
  async use(id) {
    const f = FUSION.find(x => x.item === id);
    const i = await Game.partyMenu({ pick: m => m.sp === f.base });
    if (i < 0) return;
    const m = G.party[i];
    if (m.fused) {
      // 分離
      const part = m.fused;
      delete m.fused;
      delete m.form;
      if (m._fuseAb) { m.ability = m._fuseAb; delete m._fuseAb; }
      if (G.party.length < 6) G.party.push(part); else G.state.box.push(part);
      m.hp = Math.min(m.hp, Mon.maxHp(m));
      await UI.say(`${Mon.name(m)} 和 ${Mon.name(part)} 分離了！`);
      return;
    }
    const j = await Game.partyMenu({ pick: x => x !== m && f.parts[x.sp] });
    if (j < 0) return;
    const part = G.party[j];
    const form = f.parts[part.sp];
    G.party.splice(j, 1);
    m.fused = part;
    m.form = form;
    m._fuseAb = m.ability;
    m.ability = FORMS[form].ab[0][0];
    m.hp = Math.min(Mon.maxHp(m), m.hp + 1);
    Sound.jingle('evolved');
    await UI.say(`${Mon.name(part)} 和 ${POKEDEX[m.sp].n} 合體了！\n變成了${FORMS[form].n}！`);
  },
  // 捕捉到合體的兩方後取得道具
  async onCaught() {
    const s = G.state;
    for (const f of FUSION) {
      if (s.bag[f.item] || !s.caught[f.base] || !Object.keys(f.parts).some(p => s.caught[p])) continue;
      Game.giveItem(f.item, 1);
      await UI.say(`${POKEDEX[f.base].n} 和夥伴之間產生了共鳴……\n獲得了${f.n}！`);
    }
    if (!s.bag['ultranecrozium-z'] && s.bag['n-solarizer'] && s.caught[800]) { Game.giveItem('ultranecrozium-z', 1); await UI.say('獲得了究極奈克洛Ｚ！'); }
  },
};
// 究極爆發：合體後的奈克洛茲瑪攜帶究極奈克洛Ｚ（和超級進化同一個按鍵，超級手環或 Z 手環皆可）
const _megaFormFor = Mega.formFor;
Mega.formFor = function (m) {
  if (m && m.sp === 800 && (m.form === 'necrozma-dusk' || m.form === 'necrozma-dawn') && m.item === 'ultranecrozium-z') return 'necrozma-ultra';
  return _megaFormFor.call(this, m);
};
const _canMegaU = Battle.prototype.canMega;
Battle.prototype.canMega = function (m) {
  if (Mega.formFor(m) === 'necrozma-ultra' && this.sideKey(m) === 'me' && !G.state.bag['mega-ring'] && G.state.bag['z-ring']) {
    G.state.bag['mega-ring'] = G.state.bag['mega-ring'] || 0;
    const ok = !this.gimmickUsed('me');
    return ok;
  }
  return _canMegaU.call(this, m);
};

// ============ 太晶團體戰 ============
// 帕底亞地區的太晶結晶（地圖上 6 處，遊玩時間每 30 分鐘重新出現），單人＋NPC 同伴，10 回合內打倒首領
const RAID_TYPES = Object.keys(TYPES).filter(t => !['unknown', 'shadow', 'stellar'].includes(t));
for (const t of RAID_TYPES) ITEMS[`${t}-tera-shard`] = { n: `${TYPES[t].n}太晶碎塊`, price: 0, kind: 'shard', tera: t, d: `集齊 10 個，就能把寶可夢的太晶屬性改成${TYPES[t].n}屬性。` };
const Raid = {
  RESPAWN: 30 * 60 * 1000,
  TURNS: 10,
  async start(e) {
    const s = G.state;
    const last = s.flags['raid_' + e.id];
    if (last && s.playMs - last < Raid.RESPAWN) { await UI.say('太晶結晶的光芒暗淡了下來。（過一段時間再來看看吧）'); return; }
    if (!G.party.some(m => m.hp > 0)) return;
    const L = U.clamp(Math.round(World.levelAt(e.x, e.y)) + 10, 15, 90);
    const stars = L >= 75 ? 6 : L >= 60 ? 5 : L >= 45 ? 4 : L >= 30 ? 3 : 2;
    let sp = World.rollWild(e.x, e.y, 'tall').sp;
    sp = World.evolveFor(sp, L);
    const boss = Mon.create(sp, L, { perfect: 31, tera: U.pick(RAID_TYPES), hidden: .3 });
    if (FORMS[POKEDEX[sp].en + '-gmax'] && U.chance(.2)) boss.gmax = true;
    await UI.say(`閃耀的太晶結晶！\n裡面有一隻${'★'.repeat(stars)}的${TYPES[boss.tera].n}太晶寶可夢！`);
    const c = await UI.choose(['挑戰', '離開'], { prompt: '要和同伴一起挑戰太晶團體戰嗎？（10 回合內打倒）' });
    if (c !== 0) return;
    s.flags['raid_' + e.id] = s.playMs;
    boss._raid = true;
    boss.hp = Mon.maxHp(boss);
    const r = await Game.battle({ wild: boss, biome: 'cave', raid: { stars, turns: Raid.TURNS }, noBlackout: true });
    delete boss._raid;
    if (r === 'win') await Raid.reward(boss, stars);
    else if (r !== 'catch') await UI.say('團體戰失敗了……回到了原來的地方。');
    Game.save(true);
  },
  async endOfTurn(b) {
    const boss = b.foe;
    if (!boss || boss.hp <= 0) return;
    // 同伴各攻擊一次（首領 HP 的 4%）
    for (const ally of ['同伴Ａ', '同伴Ｂ', '同伴Ｃ']) {
      if (boss.hp <= 0) break;
      await b.msg(`${ally}的寶可夢發動了攻擊！`);
      await b.hurt(boss, Math.max(1, Math.floor(Mon.maxHp(boss) * .04)));
    }
    b.raid.turns--;
    if (boss.hp > 0 && b.raid.turns <= 0) { await b.msg('團體戰的時間用完了！\n被太晶的力量推出了結晶外……'); b.fled = true; }
    else if (boss.hp > 0 && b.raid.turns <= 3) await b.msg(`剩下 ${b.raid.turns} 回合！`);
  },
  async reward(boss, stars) {
    const t = boss.tera;
    const n = stars + U.ri(1, 3);
    Game.giveItem(`${t}-tera-shard`, n);
    Game.giveItem(stars >= 4 ? 'exp-candy-l' : 'exp-candy-m', stars);
    const b = TM.base(boss.sp); G.state.mats = G.state.mats || {}; G.state.mats[b] = (G.state.mats[b] || 0) + stars;
    if (stars >= 5 && ITEMS['ability-patch']) Game.giveItem('ability-patch', 1);
    await UI.say(`團體戰勝利！\n獲得了 ${n} 個${ITEMS[`${t}-tera-shard`].n}、經驗糖果、${TM.matName(b)}！`);
    const c = await UI.choose(['捕捉', '不要'], { prompt: `要捕捉 ${Mon.name(boss)} 嗎？（團體戰的寶可夢一定能捕捉）` });
    if (c !== 0) return;
    boss.hp = Mon.maxHp(boss);
    boss.st = null;
    if (G.party.length < 6) G.party.push(boss); else G.state.box.push(boss);
    await Game.addCaught(boss);
  },
};
// 團體戰：首領一開始就太晶化（b.raid 由 Game.battle 設定）
const _abilityStartR = Battle.prototype.abilityStart;
Battle.prototype.abilityStart = async function (m) {
  const r = await _abilityStartR.call(this, m);
  if (this.raid && m === this.foe && !(this.tera && this.tera.foe)) await this.terastallize(m);
  return r;
};

// ============ 地圖：帕底亞的太晶結晶 ============
const _lateGenerate = World.generate;
World.generate = function (...a) {
  const r = _lateGenerate.apply(this, a);
  const rng = mulberry32((this.seed ^ 0x7e7a) >>> 0);
  const [rx, ry, rad] = REGION_POS.paldea;
  const ok = new Set([T.TALL, T.GRASS, T.CAVE, T.SAND, T.FLOWER, T.SNOW, T.DESERT]);
  let n = 0;
  for (let tries = 0; tries < 4000 && n < 6; tries++) {
    const ang = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * rad;
    const x = Math.round(rx + Math.cos(ang) * rr), y = Math.round(ry + Math.sin(ang) * rr);
    if (this.regionAt(x, y) !== 'paldea' || !ok.has(this.tile(x, y)) || this.townAt(x, y) || this.trainers.has(x + ',' + y)) continue;
    if ((this.legends && this.legends.has(x + ',' + y)) || [...this.events.values()].some(e => Math.hypot(e.x - x, e.y - y) < 14)) continue;
    this.events.set(x + ',' + y, { kind: 'raid', id: 'raid' + n, x, y });
    n++;
  }
  return r;
};
// 太晶結晶不會因為挑戰過就消失（重新出現的時間由 Raid 控制）
const _eventAtR = World.eventAt;
World.eventAt = function (x, y) {
  const e = this.events && this.events.get(x + ',' + y);
  if (e && e.kind === 'raid') return e;
  return _eventAtR.call(this, x, y);
};
const _eventEntityR = Story.eventEntity;
Story.eventEntity = async function (e) {
  if (e.kind === 'raid') return Raid.start(e);
  return _eventEntityR.call(this, e);
};
// 太晶結晶的繪製（Game.drawEvent 呼叫；game.js 在本檔之後載入）
function drawRaidCrystal(g, e, x, y) {
  const s = G.state, last = s.flags['raid_' + e.id], lit = !last || s.playMs - last >= Raid.RESPAWN;
  const k = (G.frame >> 3) % 6;
  g.save();
  g.translate(x + TILE / 2, y + TILE / 2);
  g.fillStyle = lit ? `hsl(${(G.frame * 3) % 360}, 90%, 70%)` : '#888';
  g.beginPath(); g.moveTo(0, -20); g.lineTo(12, 0); g.lineTo(0, 20); g.lineTo(-12, 0); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(-2, -14 + k, 4, 6);
  g.restore();
};

// 伽勒爾的野生寶可夢：有超極巨化形態的物種 3% 擁有超極巨因子
const _rollWildG = World.rollWild;
World.rollWild = function (x, y, biome) {
  const m = _rollWildG.call(this, x, y, biome);
  if (this.regionAt(x, y) === 'galar' && FORMS[POKEDEX[m.sp].en + '-gmax'] && U.chance(.03)) m.gmax = true;
  return m;
};

// ============ 取得極巨腕帶：伽勒爾的博士 ============
const _profD = Story.prof;
Story.prof = async function (region) {
  if (region === 'galar' && !G.state.bag['dynamax-band']) {
    Game.giveItem('dynamax-band', 1);
    await UI.say(`${REGIONS.galar.prof}：「這是極巨腕帶！在伽勒爾的道館戰裡一定用得到！」\n獲得了極巨腕帶！\n（在戰鬥中選招式時按 G 極巨化，持續 3 回合）`);
  }
  return _profD.call(this, region);
};
