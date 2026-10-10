// 訓練家 AI（三層，啟發式評分）
//   第 1 層 一般訓練家：估算傷害（含屬性、會不會打倒），變化招式用簡單規則，有較大的隨機性
//   第 2 層 道館館主、勁敵最終戰：＋被剋制時換人、異常狀態的時機與免疫、配合天氣與場地、回復道具
//   第 3 層 四天王、冠軍：＋預測玩家最強的招式（換成抵抗的寶可夢）、安全時強化、太晶化的時機
// 野生寶可夢維持隨機選招式。傷害估算不擲骰、不動到對戰狀態（和 calcDamage 分開）
const AI = {
  tier(b) {
    if (b.wildMon || !b.trainer) return 0;
    const t = b.trainer;
    return t.ai || (t.kind === 'champion' ? 3 : t.kind === 'gym' ? 2 : 1);
  },
  // 平均傷害（HP）；bench：不在場上的寶可夢（用牠本來的屬性、不含能力變化）
  est(b, user, target, mv, { vU = null, vT = null, typesT = null } = {}) {
    if (mv.cat === 'Status') return 0;
    if (mv.damage === 'level') return user.lv;
    if (typeof mv.damage === 'number') return mv.damage;
    let bp;
    try { bp = b.basePower(user, target, mv); } catch { bp = mv.bp; }
    bp = bp || mv.bp || 0;
    if (!bp) return 0;
    const type = b.moveType ? b.moveType(user, mv) : mv.type;
    const tTypes = typesT || b.typesOf(target);
    let eff = 1;
    if (typesT) { for (const t of tTypes) { const r = CHART[type] && CHART[type][t]; eff *= r === undefined ? 1 : r; } }
    else eff = b.effectiveness({ ...mv, type }, target, user);
    if (!eff) return 0;
    const phys = mv.cat === 'Physical';
    const sU = Mon.stats(user), sT = Mon.stats(target);
    const A = sU[phys ? 1 : 3] * (vU ? boostMul(vU.stg[phys ? 'atk' : 'spa']) : 1);
    const D = sT[phys ? 2 : 4] * (vT ? boostMul(vT.stg[phys ? 'def' : 'spd']) : 1);
    let dmg = Math.floor(Math.floor(Math.floor(2 * user.lv / 5 + 2) * bp * A / Math.max(1, D)) / 50) + 2;
    const uTypes = b.typesOf(user);
    if (uTypes.includes(type)) dmg *= b.ab(user) === 'adaptability' ? 2 : 1.5;
    const w = b.field ? b.wx() : null;
    if (w === 'raindance') dmg *= type === 'water' ? 1.5 : type === 'fire' ? .5 : 1;
    if (w === 'sunnyday') dmg *= type === 'fire' ? 1.5 : type === 'water' ? .5 : 1;
    if (phys && user.st === 'brn' && b.ab(user) !== 'guts') dmg *= .5;
    if (mv.multihit) dmg *= Array.isArray(mv.multihit) ? 3 : mv.multihit;
    return dmg * eff * .925;
  },
  acc(mv) { return mv.acc === true || !mv.acc ? 1 : mv.acc / 100; },
  // 某一方對另一方最強的招式（估算）：{ i, mv, dmg }
  best(b, user, target, opt = {}) {
    let best = { i: -1, mv: null, dmg: 0 };
    user.moves.forEach((s, i) => {
      if (s.pp <= 0) return;
      const mv = md(s.id);
      const d = AI.est(b, user, target, mv, opt) * AI.acc(mv);
      if (d > best.dmg) best = { i, mv, dmg: d };
    });
    return best;
  },
  // 異常狀態招式對目標有沒有用（免疫、已有狀態）
  statusUseful(b, mv, target) {
    if (target.st) return false;
    const t = b.typesOf(target), s = mv.status;
    if (s === 'par' && (t.includes('electric') || (mv.id === 'thunderwave' && t.includes('ground')))) return false;
    if ((s === 'psn' || s === 'tox') && (t.includes('poison') || t.includes('steel'))) return false;
    if (s === 'brn' && t.includes('fire')) return false;
    if (s === 'frz' && t.includes('ice')) return false;
    if (mv.flags && mv.flags.powder && t.includes('grass')) return false;
    if (b.sides && b.sides.me && b.sides.me.safeguard) return false;
    return true;
  },
};

Battle.prototype.aiChoose = function () {
  const tier = AI.tier(this);
  const foe = this.foe, me = this.me, vF = this.vFoe, vM = this.vMe;
  let usable = foe.moves.map((s, i) => ({ s, i })).filter(({ s, i }) => s.pp > 0 && md(s.id).support !== 'none' && !this.moveBlocked(foe, vF, s.id));
  // 雙打：會打到自己隊友的全體招式（aiDouble 指定）
  if (this._aiExclude && usable.some(u => !this._aiExclude.has(u.i))) usable = usable.filter(u => !this._aiExclude.has(u.i));
  if (!usable.length) return { idx: foe.moves.findIndex(s => s.pp > 0) };
  if (tier === 0) return { idx: U.pick(usable).i };
  const maxF = Mon.maxHp(foe);
  const foeFaster = this.speedOf(foe, vF) > this.speedOf(me, vM);
  const threat = AI.best(this, me, foe, { vU: vM, vT: vF });          // 玩家打過來最痛的招式
  const threatPct = threat.dmg / Math.max(1, foe.hp);

  // 回復道具：第 1 層 25% 以下 70%；第 2、3 層 35% 以下，而且回復後撐得住下一擊
  if (this.aiItems > 0) {
    const low = tier === 1 ? foe.hp < maxF * .25 && U.rand() < .7 : foe.hp < maxF * .35 && threat.dmg < Math.min(maxF, foe.hp + 120);
    if (low) return { heal: true };
  }

  // 換人（第 2 層以上，單打）
  const isDouble = typeof DoubleBattle !== 'undefined' && this instanceof DoubleBattle;
  if (tier >= 2 && !isDouble && !vF.trapped && !vF.locked && !(vF.partiallytrapped) && (this.turn - (this._aiSwitchTurn ?? -9)) >= 2) {
    const myBest = AI.best(this, foe, me, { vU: vF, vT: vM });
    const willDie = threat.dmg >= foe.hp && !(foeFaster && myBest.dmg >= me.hp);
    const se = threat.mv && AI.est(this, me, foe, threat.mv) > 0 && this.effectiveness({ ...threat.mv, type: this.moveType ? this.moveType(me, threat.mv) : threat.mv.type }, foe, me) >= 2;
    const predict = tier >= 3 && se && threatPct > .45 && U.rand() < .6;
    if ((willDie && se) || predict) {
      let pick = null;
      this.foeParty.forEach((m, i) => {
        if (m === foe || m.hp <= 0) return;
        const taken = AI.est(this, me, m, threat.mv, { vU: vM, typesT: Mon.types(m) }) / Math.max(1, m.hp);
        const deal = AI.best(this, m, me, { vT: vM, typesT: null }).dmg / Math.max(1, me.hp);
        const score = deal - taken * 1.2;
        if (taken < .45 && (!pick || score > pick.score)) pick = { i, score };
      });
      if (pick) { this._aiSwitchTurn = this.turn; return { switchTo: pick.i }; }
    }
  }

  const noise = tier === 1 ? .3 : tier === 2 ? .16 : .06;
  let best = null;
  for (const { s, i } of usable) {
    const m = md(s.id);
    let score;
    if (m.cat !== 'Status') {
      const dmg = AI.est(this, foe, me, m, { vU: vF, vT: vM }) * AI.acc(m);
      score = Math.min(100, dmg / Math.max(1, me.hp) * 100);
      if (dmg >= me.hp) score += tier >= 2 ? 60 : 30;                        // 打得倒
      if (dmg >= me.hp && m.pri > 0 && !foeFaster) score += 40;             // 先制招式收尾
      if (m.selfdestruct && foe.hp > maxF * .3) score *= .2;
      if ((m.id === 'fakeout' || m.id === 'firstimpression') && vF.turnsOut > 0) score = 0;
      if (m.flags.charge && !(m.id.startsWith('solar') && this.field.weather === 'sunnyday')) score *= .6;
      if (m.ohko) score = me.lv > foe.lv ? 0 : 40;
      if (m.recoil && tier >= 2 && foe.hp < maxF * .3) score *= .7;
    } else if (m.status) {
      const useful = AI.statusUseful(this, m, me);
      if (!useful) score = 0;
      else if (tier === 1) score = 45;
      else {
        // 睡眠最好；麻痺在對方比較快時；灼傷對物理攻擊手；中毒對耐久型
        const phys = Mon.stats(me)[1] > Mon.stats(me)[3];
        score = m.status === 'slp' ? 75 : m.status === 'par' ? (foeFaster ? 35 : 65) : m.status === 'brn' ? (phys ? 65 : 30) : m.status === 'tox' ? 55 : 40;
        if (me.hp < Mon.maxHp(me) * .3) score *= .4;                          // 快倒的對手直接打
      }
    } else if (m.volatileStatus === 'substitute') score = !vF.sub && foe.hp > maxF / 2 ? (tier >= 3 && threatPct < .25 ? 50 : 30) : 0;
    else if (m.heal || ['moonlight', 'morningsun', 'synthesis', 'shoreup', 'rest', 'roost', 'slackoff', 'softboiled', 'recover'].includes(m.id)) {
      score = foe.hp < maxF / 2 ? (tier >= 2 && threat.dmg > maxF / 2 ? 30 : 70) : 0;
    } else if (m.boosts && m.target === 'self') {
      const stage = Math.max(...Object.keys(m.boosts).map(k => vF.stg[k] || 0));
      if (stage >= 2) score = 5;
      else if (tier >= 3) score = threatPct < .35 ? 85 : 15;                 // 安全時才強化
      else score = this.turn <= 2 ? (tier === 2 && threatPct < .5 ? 50 : 30) : 10;
    } else if (m.boosts) score = this.turn <= 2 ? 25 : 8;
    else if (m.sideCondition) {
      const left = this.myParty ? this.myParty.filter(x => x.hp > 0).length : G.party.filter(x => x.hp > 0).length;
      score = this.sides.me[m.sideCondition] ? 0 : tier >= 2 && left >= 3 ? 50 : 25;
      if (m.sideCondition === 'reflect' || m.sideCondition === 'lightscreen') score = this.sides.foe[m.sideCondition] ? 0 : 35;
    } else if (m.weather) {
      if (this.field.weather === m.weather) score = 0;
      else {
        // 天氣對自己的招式有利才用
        const boosted = { raindance: 'water', sunnyday: 'fire', sandstorm: 'rock', snowscape: 'ice' }[m.weather];
        const ours = foe.moves.some(x => md(x.id).type === boosted) || this.typesOf(foe).includes(boosted);
        score = tier >= 2 ? (ours ? 60 : 10) : 25;
      }
    } else if (m.terrain) score = this.field.terrain === m.terrain ? 0 : tier >= 2 ? 40 : 20;
    else if (m.stallingMove) score = vF.protectCount ? 0 : (tier >= 3 && (me.st === 'tox' || me.st === 'brn' || vM.seed) ? 45 : 12);
    else score = m.support === 'partial' ? 5 : 10;
    score *= 1 - noise / 2 + U.rand() * noise;
    if (!best || score > best.score) best = { i, score };
  }
  return { idx: best.i };
};

// 太晶化的時機：第 3 層在太晶屬性能抵抗玩家最強的招式、或是王牌時使用；其他照原本（王牌／館主）
const _aiTera = Battle.prototype.aiTera;
Battle.prototype.aiTera = function () {
  if (AI.tier(this) < 3) return _aiTera.call(this);
  if (this.wildMon || !this.trainer || (this.teraUsed && this.teraUsed.foe) || !Mon.teraType) return false;
  const ace = this.foe === this.foeParty[this.foeParty.length - 1];
  const threat = AI.best(this, this.me, this.foe, { vU: this.vMe, vT: this.vFoe });
  if (!threat.mv) return ace;
  const tt = Mon.teraType(this.foe);
  const now = AI.est(this, this.me, this.foe, threat.mv, { vU: this.vMe, vT: this.vFoe });
  const after = AI.est(this, this.me, this.foe, threat.mv, { vU: this.vMe, vT: this.vFoe, typesT: [tt] });
  return ace || (after < now * .6 && now > this.foe.hp * .5);
};
