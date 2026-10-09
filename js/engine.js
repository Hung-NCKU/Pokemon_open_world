// 戰鬥引擎：參考 Pokémon Showdown（sim/battle.ts、sim/battle-actions.ts）的回合處理，單打。
// 招式資料：data/showdown.js（Showdown 客戶端資料，以全國招式編號對應）＋ data/moves.js（中文名稱與說明）。
// 每個招式都有支援狀態：full（完整）、partial（部分效果未實作）、none（未支援，AI 不會使用）。

const SD = window.SHOWDOWN || { moves: {}, speciesAbilities: {} };
const TYPE_KEY = t => (t || '').toLowerCase();
const BOOST_ZH = { atk: '攻擊', def: '防禦', spa: '特攻', spd: '特防', spe: '速度', accuracy: '命中率', evasion: '閃避率' };
const STAGE_OF = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', accuracy: 'acc', evasion: 'eva' };

// ---------- 招式描述 ----------
const _md = {};
function md(id) {
  if (_md[id]) return _md[id];
  const zh = MOVES[id] || {};
  const s = SD.moves[id];
  let m;
  if (s) {
    m = { ...s, num: +id, n: zh.n || s.id, d: zh.d || '', type: TYPE_KEY(s.type), cat: s.category, bp: s.basePower, acc: s.accuracy, pri: s.priority, flags: s.flags || {} };
  } else {
    // 沒有 Showdown 資料時退回 PokéAPI 的欄位
    m = { id: 'm' + id, num: +id, n: zh.n || '？', d: zh.d || '', type: zh.t, cat: zh.c === 'ph' ? 'Physical' : zh.c === 'sp' ? 'Special' : 'Status',
      bp: zh.p || 0, acc: zh.a || true, pri: zh.pr || 0, pp: zh.pp || 10, flags: {}, target: 'normal' };
  }
  m.support = classify(m);
  return (_md[id] = m);
}
const STRUGGLE_MD = { id: 'struggle', num: 165, n: '掙扎', d: '', type: '???', cat: 'Physical', bp: 50, acc: true, pri: 0, flags: { contact: 1, protect: 1 }, target: 'randomNormal', struggleRecoil: true, support: 'full' };

// 實作清單（用於判定支援狀態）
const IMPL = {
  volatile: new Set(['aquaring', 'attract', 'banefulbunker', 'burningbulwark', 'partiallytrapped', 'charge', 'confusion', 'curse', 'defensecurl', 'destinybond',
    'protect', 'disable', 'encore', 'endure', 'focusenergy', 'followme', 'ragepowder', 'helpinghand', 'ingrain', 'kingsshield', 'laserfocus', 'leechseed',
    'magnetrise', 'minimize', 'noretreat', 'obstruct', 'octolock', 'foresight', 'smackdown', 'spikyshield', 'silktrap', 'substitute', 'tarshot', 'taunt', 'yawn',
    'flinch', 'saltcure', 'sparklingaria', 'syrupbomb', 'mustrecharge', 'lockedmove', 'roost', 'stockpile', 'torment', 'imprison', 'grudge', 'electrify']),
  side: new Set(['auroraveil', 'lightscreen', 'reflect', 'mist', 'safeguard', 'spikes', 'stealthrock', 'stickyweb', 'tailwind', 'toxicspikes', 'craftyshield', 'quickguard', 'wideguard']),
  pseudo: new Set(['trickroom', 'gravity', 'magicroom', 'wonderroom', 'fairylock', 'iondeluge', 'watersport', 'mudsport']),
  slot: new Set(['Wish']),
  calls: new Set(['metronome', 'sleeptalk', 'copycat', 'naturepower']),
  bp: new Set(['acrobatics', 'assurance', 'avalanche', 'beatup', 'boltbeak', 'crushgrip', 'dragonenergy', 'echoedvoice', 'electroball', 'eruption', 'fishiousrend',
    'flail', 'furycutter', 'grassknot', 'gyroball', 'heatcrash', 'heavyslam', 'hex', 'lastrespects', 'lowkick', 'payback', 'powertrip', 'ragefist', 'revenge',
    'reversal', 'risingvoltage', 'rollout', 'round', 'stompingtantrum', 'storedpower', 'triplekick', 'watershuriken', 'waterspout', 'wringout', 'punishment',
    'magnitude', 'present', 'facade', 'brine', 'venoshock', 'return', 'frustration', 'pikapapow', 'veeveevolley', 'wakeupslap', 'smellingsalts', 'weatherball',
    'barbbarrage', 'collisioncourse', 'electrodrift', 'hardpress', 'temperflare', 'iceball', 'triplearrows', 'tripleaxel', 'populationbomb', 'terrainpulse',
    'knockoff', 'hydrosteam', 'psyblade', 'solarbeam', 'solarblade', 'expandingforce', 'mistyexplosion', 'grassyglide', 'freezedry', 'flyingpress']),
  // 只有專屬效果函式的招式中，已實作的部分
  special: new Set(['bellydrum', 'haze', 'painsplit', 'rest', 'perishsong', 'psychup', 'defog', 'splash', 'meanlook', 'block', 'lockon', 'mindreader', 'moonlight',
    'morningsun', 'synthesis', 'shoreup', 'strengthsap', 'aromatherapy', 'healbell', 'junglehealing', 'lunarblessing', 'purify', 'soak', 'topsyturvy', 'spite',
    'acupressure', 'tidyup', 'takeheart', 'venomdrench', 'conversion', 'reflecttype', 'floralhealing', 'healpulse', 'powerswap', 'guardswap', 'heartswap',
    'speedswap', 'trickortreat', 'forestscurse', 'celebrate', 'holdhands', 'happyhour', 'teleport', 'memento', 'healingwish', 'lunardance', 'gearup', 'magneticflux',
    'counter', 'mirrorcoat', 'metalburst', 'comeuppance', 'endeavor', 'finalgambit', 'superfang', 'naturesmadness', 'ruination', 'suckerpunch', 'thunderclap',
    'fakeout', 'firstimpression', 'focuspunch', 'brickbreak', 'psychicfangs', 'ragingbull', 'rapidspin', 'mortalspin', 'falseswipe', 'holdback', 'feint',
    'refresh', 'clearsmog', 'burnup', 'doubleshock', 'thief', 'covet', 'pluck', 'bugbite', 'incinerate', 'knockoff', 'clangoroussoul', 'filletaway', 'shedtail',
    'courtchange', 'afteryou', 'allyswitch', 'quash', 'instruct', 'stuffcheeks', 'swallow', 'spitup', 'teatime', 'recycle', 'magicpowder', 'flowershield', 'rototiller']),
};
const NOOP_STATUS = new Set(['followme', 'ragepowder', 'helpinghand', 'afteryou', 'allyswitch', 'quash', 'instruct', 'gearup', 'magneticflux', 'celebrate',
  'holdhands', 'happyhour', 'flowershield', 'rototiller', 'craftyshield', 'quickguard', 'wideguard', 'teatime', 'stuffcheeks', 'swallow', 'spitup', 'recycle',
  'magicpowder', 'courtchange', 'imprison', 'grudge', 'electrify', 'torment', 'stockpile', 'magicroom', 'wonderroom', 'fairylock', 'iondeluge', 'watersport', 'mudsport']);

function classify(m) {
  if (m.isNonstandard === 'Past' && !MOVES[m.num]) return 'none';
  const miss = [];
  if (m.volatileStatus && !IMPL.volatile.has(m.volatileStatus)) miss.push('v');
  if (m.self && m.self.volatileStatus && !IMPL.volatile.has(m.self.volatileStatus)) miss.push('sv');
  if (m.sideCondition && !IMPL.side.has(m.sideCondition)) miss.push('side');
  if (m.slotCondition && !IMPL.slot.has(m.slotCondition)) miss.push('slot');
  if (m.callsMove && !IMPL.calls.has(m.id)) miss.push('calls');
  if (m.basePowerCallback && !IMPL.bp.has(m.id)) miss.push('bp');
  if ((m.condition && m.target === 'scripted') && !IMPL.special.has(m.id)) miss.push('scripted');
  const sec = m.secondaries || (m.secondary ? [m.secondary] : []);
  for (const s of sec) if (s.volatileStatus && !IMPL.volatile.has(s.volatileStatus)) miss.push('sec');
  if (m.cat === 'Status') {
    const has = ['status', 'boosts', 'volatileStatus', 'sideCondition', 'weather', 'terrain', 'pseudoWeather', 'heal', 'selfSwitch', 'forceSwitch', 'slotCondition', 'callsMove', 'self']
      .some(k => m[k] !== undefined);
    if (!has && !IMPL.special.has(m.id)) return 'none';
    if (NOOP_STATUS.has(m.id) || NOOP_STATUS.has(m.volatileStatus) || NOOP_STATUS.has(m.pseudoWeather) || NOOP_STATUS.has(m.sideCondition)) return 'partial';
    if (m.slotCondition && !IMPL.slot.has(m.slotCondition) && !IMPL.special.has(m.id)) return 'none';
    if (miss.length) return m.cat === 'Status' && (miss.includes('v') || miss.includes('calls')) ? 'none' : 'partial';
    return 'full';
  }
  if (m.id === 'bide' || m.id === 'beatup' && false) return 'none';
  return miss.length ? 'partial' : 'full';
}
const SUPPORT_ZH = { full: '', partial: '（部分效果未實作）', none: '（未支援）' };

// ---------- 小工具 ----------
const BOOST_TABLE = [1, 1.5, 2, 2.5, 3, 3.5, 4];
function boostMul(s) { return s >= 0 ? BOOST_TABLE[Math.min(6, s)] : 1 / BOOST_TABLE[Math.min(6, -s)]; }
function accBoostMul(s) { s = U.clamp(s, -6, 6); return s >= 0 ? (3 + s) / 3 : 3 / (3 - s); }
function weightOf(m) { return (SD.speciesAbilities[m.sp] && SD.speciesAbilities[m.sp].w) || 10; }
function hasType(m, v, t) { return (v && v.types ? v.types : Mon.types(m)).includes(t); }

function newVol() {
  return {
    stg: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }, conf: 0, flinch: false, toxN: 0, seed: false, trap: 0, yawn: 0, love: false, focus: 0,
    protect: false, protectCount: 0, sub: 0, charging: null, semi: null, recharge: false, locked: null, lastMove: null, lastMoveFailed: false,
    hitBy: [], damagedThisTurn: false, turnsOut: 0, taunt: 0, encore: 0, encoreMove: null, disable: 0, disableMove: null, endure: false, destinyBond: false,
    curse: false, perish: 0, ingrain: false, aquaRing: false, magnetRise: 0, minimize: false, defenseCurl: false, charge: false, lockOn: 0, foresight: false,
    smackDown: false, roost: false, trapped: false, octolock: false, laserFocus: 0, tarShot: false, saltCure: false, syrupBomb: 0, types: null,
    echoed: 0, furyCutter: 0, rollout: 0, timesHit: 0, statsLoweredThisTurn: false, movedThisTurn: false,
  };
}

Object.assign(Battle.prototype, {
  initEngine() {
    this.field = { weather: null, weatherT: 0, terrain: null, terrainT: 0, trickRoom: 0, gravity: 0, lastMoveUsed: null, faintedLastTurn: { me: false, foe: false } };
    const side = () => ({ reflect: 0, lightscreen: 0, auroraveil: 0, tailwind: 0, mist: 0, safeguard: 0, spikes: 0, toxicspikes: 0, stealthrock: false, stickyweb: false, wish: null, fainted: 0 });
    this.sides = { me: side(), foe: side() };
    this.futures = [];
  },
  sideKey(m) { return m === this.me ? 'me' : 'foe'; },
  volOf(m) { return m === this.me ? this.vMe : this.vFoe; },
  otherOf(m) { return m === this.me ? this.foe : this.me; },
  typesOf(m) {
    const v = this.volOf(m);
    let t = v && v.types ? v.types : Mon.types(m);
    if (v && v.roost) t = t.filter(x => x !== 'flying');
    return t.length ? t : ['normal'];
  },
  grounded(m) {
    const v = this.volOf(m);
    if (this.field.gravity || v.smackDown || v.ingrain) return true;
    if (v.magnetRise) return false;
    return !this.typesOf(m).includes('flying');
  },

  speedOf(m, v) {
    let s = Mon.stats(m)[5] * boostMul(v.stg.spe);
    if (m.st === 'par') s *= .5;
    if (this.sides && this.sides[this.sideKey(m)].tailwind) s *= 2;
    return Math.floor(s);
  },

  // ---------- 回合 ----------
  async doTurn(action) {
    if (!this.field) this.initEngine();
    for (const v of [this.vMe, this.vFoe]) { v.hitBy = []; v.damagedThisTurn = false; v.movedThisTurn = false; v.statsLoweredThisTurn = false; }
    const foeAction = this.aiChoose();
    this.queued = { me: action, foe: foeAction };
    // 1. 逃跑、交換、道具（Showdown：優先度高於所有招式）
    if (action.type === 'run') {
      if (this.trainer) { await this.msg('不行！不能從訓練家對戰中逃走！'); this.turn--; return null; }
      if (this.vMe.trapped || this.vMe.trap || this.vMe.ingrain || this.vMe.octolock) { if (!this.typesOf(this.me).includes('ghost')) { await this.msg('無法逃走！'); this.turn--; return null; } }
      this.runTries++;
      const a = this.speedOf(this.me, this.vMe), b = this.speedOf(this.foe, this.vFoe);
      const odds = (Math.floor(a * 128 / Math.max(1, b)) + 30 * this.runTries) % 256;
      if (a >= b || Math.random() * 256 < odds) { Sound.sfx('run'); await this.msg('順利逃走了！'); return 'run'; }
      await this.msg('沒能逃走！');
    } else if (action.type === 'switch') {
      if ((this.vMe.trapped || this.vMe.trap || this.vMe.ingrain || this.vMe.octolock) && !this.typesOf(this.me).includes('ghost')) {
        await this.msg(`${Mon.name(this.me)} 無法退場！`); this.turn--; return null;
      }
      await this.switchTo(action.idx);
    } else if (action.type === 'item') {
      const r = await this.useItem(action);
      if (r) return r;
    }
    if (foeAction.heal) { await this.aiHeal(); }
    if (foeAction.switchTo !== undefined) { await this.foeSwitch(foeAction.switchTo); }
    // 2. 招式依優先度 → 速度 → 隨機排序（戲法空間時速度反轉）
    const acts = [];
    if (action.type === 'move') acts.push({ side: 'me', ...this.resolveMove(this.me, this.vMe, action.idx) });
    if (!foeAction.heal && foeAction.switchTo === undefined) acts.push({ side: 'foe', ...this.resolveMove(this.foe, this.vFoe, foeAction.idx) });
    for (const a of acts) {
      const m = a.side === 'me' ? this.me : this.foe, v = a.side === 'me' ? this.vMe : this.vFoe;
      a.pri = a.mv.pri || 0;
      if (a.mv.id === 'grassyglide' && this.field.terrain === 'grassyterrain') a.pri += 1;
      a.spe = this.speedOf(m, v) * (this.field.trickRoom ? -1 : 1);
      a.rnd = Math.random();
    }
    acts.sort((x, y) => y.pri - x.pri || y.spe - x.spe || x.rnd - y.rnd);
    this.order = acts.map(a => a.side);
    for (let i = 0; i < acts.length; i++) {
      const a = acts[i];
      const user = a.side === 'me' ? this.me : this.foe;
      const target = this.otherOf(user);
      if (!user || user.hp <= 0) continue;
      this.firstMover = i === 0;
      await this.runMove(user, target, a);
      const r = await this.checkFaints();
      if (r) return r;
      if (r === false) break;
    }
    await this.endOfTurn();
    const r = await this.checkFaints();
    return r || null;
  },

  // 決定實際要使用的招式（鎖定、蓄力、再來一次、掙扎）
  resolveMove(m, v, idx) {
    if (v.recharge) return { mv: { ...STRUGGLE_MD, n: '', pri: 0 }, slot: null, recharge: true };
    if (v.charging) return { mv: md(v.charging), slot: null, cont: true };
    if (v.locked) return { mv: md(v.locked.id), slot: null, cont: true };
    if (v.encore > 0 && v.encoreMove) {
      const slot = m.moves.find(s => s.id === v.encoreMove && s.pp > 0);
      if (slot) return { mv: md(slot.id), slot };
    }
    const slot = idx >= 0 ? m.moves[idx] : null;
    if (!slot || slot.pp <= 0) return { mv: STRUGGLE_MD, slot: null };
    return { mv: md(slot.id), slot };
  },

  // ---------- AI ----------
  aiChoose() {
    const foe = this.foe, me = this.me;
    if (this.aiItems > 0 && foe.hp < Mon.maxHp(foe) * .25 && Math.random() < .7) return { heal: true };
    const usable = foe.moves.map((s, i) => ({ s, i })).filter(({ s, i }) => s.pp > 0 && md(s.id).support !== 'none' && !this.moveBlocked(foe, this.vFoe, s.id));
    if (!usable.length) {
      const any = foe.moves.findIndex(s => s.pp > 0);
      return { idx: any };
    }
    if (this.wildMon) return { idx: U.pick(usable).i };
    let best = null;
    for (const { s, i } of usable) {
      const m = md(s.id);
      let score;
      if (m.cat !== 'Status') {
        const eff = this.effectiveness(m, me);
        const bp = this.basePower(foe, me, m) || 60;
        const stab = this.typesOf(foe).includes(m.type) ? 1.5 : 1;
        const acc = m.acc === true ? 100 : m.acc;
        score = bp * stab * eff * acc / 100;
        if (m.multihit) score *= Array.isArray(m.multihit) ? 3 : m.multihit;
        if (m.selfdestruct && foe.hp > Mon.maxHp(foe) * .3) score *= .2;
        if ((m.id === 'fakeout' || m.id === 'firstimpression') && this.vFoe.turnsOut > 0) score = 0;
        if (m.flags.charge && !(m.id.startsWith('solar') && this.field.weather === 'sunnyday')) score *= .6;
        if (m.ohko) score = me.lv > foe.lv ? 0 : 70;
      } else if (m.status && !me.st) score = 55;
      else if (m.volatileStatus === 'substitute' && !this.vFoe.sub && foe.hp > Mon.maxHp(foe) / 2) score = 35;
      else if ((m.heal || ['moonlight', 'morningsun', 'synthesis', 'shoreup', 'rest'].includes(m.id)) && foe.hp < Mon.maxHp(foe) / 2) score = 70;
      else if (m.boosts && m.target === 'self' && this.turn <= 2) score = 40;
      else if (m.boosts && this.turn <= 2) score = 30;
      else if (m.sideCondition && !this.sides.foe[m.sideCondition] && !this.sides.me[m.sideCondition]) score = 30;
      else if (m.weather && this.field.weather !== m.weather) score = 25;
      else if (m.stallingMove) score = this.vFoe.protectCount ? 0 : 15;
      else score = m.support === 'partial' ? 5 : 10;
      score *= .85 + Math.random() * .3;
      if (!best || score > best.score) best = { i, score };
    }
    return { idx: best.i };
  },
  async aiHeal() {
    this.aiItems--;
    const foe = this.foe;
    foe.hp = Math.min(Mon.maxHp(foe), foe.hp + 120);
    await this.msg(`${this.trainer.name} 使用了厲害傷藥！`);
    this.draw();
  },
  async foeSwitch(i) {
    await this.msg(`${this.trainer.name} 收回了 ${Mon.name(this.foe)}！`);
    await this.recall('foe');
    this.foeIdx = i;
    this.vFoe = newVol();
    Game.markSeen(this.foe.sp);
    await this.msg(`${this.trainer.name} 派出了 ${Mon.name(this.foe)}！`);
    await this.sendOut('foe', this.foe);
    await this.onEntry(this.foe);
  },

  moveBlocked(m, v, id) {
    const mv = md(id);
    if (v.taunt > 0 && mv.cat === 'Status') return '挑釁';
    if (v.disable > 0 && v.disableMove === id) return '定身法';
    if (this.field && this.field.gravity && mv.flags.gravity) return '重力';
    return null;
  },

  effectiveness(mv, target) {
    if (!TYPES[mv.type] || mv.type === '???' || mv.type === 'stellar') return 1;
    const tv = this.volOf(target);
    let types = this.typesOf(target);
    let e = 1;
    for (const t of types) {
      let r = CHART[mv.type] && CHART[mv.type][t];
      if (r === undefined) r = 1;
      if (r === 0 && t === 'ghost' && (mv.type === 'normal' || mv.type === 'fighting') && tv.foresight) r = 1;
      if (r === 0 && t === 'flying' && mv.type === 'ground' && this.grounded(target)) r = 1;
      if (mv.id === 'freezedry' && t === 'water') r = 2;
      e *= r;
    }
    if (mv.id === 'flyingpress') e *= typeEff('flying', types) || 0;
    if (mv.type === 'ground' && !this.grounded(target) && mv.id !== 'thousandarrows') e = 0;
    if (tv.tarShot && mv.type === 'fire') e *= 2;
    return e;
  },

  // ---------- 招式執行（Showdown runMove → useMove → tryMoveHit → spreadMoveHit） ----------
  async runMove(user, target, act) {
    const vU = this.volOf(user), vT = this.volOf(target);
    const name = this.label(user);
    let mv = act.mv;
    vU.movedThisTurn = true;
    if (act.recharge) { vU.recharge = false; await this.msg(`${name} 需要休息，無法動彈！`); return; }
    // 行動前判定（beforeMove）
    if (user.st === 'slp') {
      user.slpT = (user.slpT || 1) - 1;
      if (user.slpT <= 0) { user.st = null; this.draw(); await this.msg(`${name} 醒過來了！`); }
      else if (!mv.sleepUsable) { await this.msg(`${name} 正在呼呼大睡。`); vU.locked = null; vU.charging = null; vU.semi = null; return; }
      else await this.msg(`${name} 正在呼呼大睡。`);
    }
    if (user.st === 'frz') {
      if (Math.random() < .2 || mv.flags.defrost) { user.st = null; this.draw(); await this.msg(`${name} 的冰凍融化了！`); }
      else { await this.msg(`${name} 因冰凍而無法行動！`); return; }
    }
    if (vU.flinch) { await this.msg(`${name} 畏縮了，無法使出招式！`); vU.locked = null; return; }
    const blocked = !act.cont && act.slot && this.moveBlocked(user, vU, act.slot.id);
    if (blocked) { await this.msg(`${name} 因${blocked}而無法使出 ${mv.n}！`); return; }
    if (vU.conf > 0) {
      vU.conf--;
      if (vU.conf === 0) await this.msg(`${name} 的混亂解除了！`);
      else {
        await this.msg(`${name} 混亂了！`);
        if (Math.random() < 1 / 3) {
          const st = Mon.stats(user);
          const base = Math.floor(Math.floor(Math.floor(2 * user.lv / 5 + 2) * 40 * st[1] * boostMul(vU.stg.atk) / (st[2] * boostMul(vU.stg.def))) / 50) + 2;
          await this.hurt(user, Math.max(1, Math.floor(base * (100 - U.ri(0, 15)) / 100)));
          await this.msg('不知所以地攻擊了自己！');
          vU.locked = null; vU.charging = null; vU.semi = null;
          return;
        }
      }
    }
    if (user.st === 'par' && Math.random() < .25) { await this.msg(`${name} 因麻痺而無法動彈！`); vU.locked = null; vU.charging = null; vU.semi = null; return; }
    if (vU.love && Math.random() < .5) { await this.msg(`${name} 著迷了，無法使出招式！`); return; }

    // 呼叫其他招式
    if (mv.callsMove) {
      if (act.slot) act.slot.pp = Math.max(0, act.slot.pp - 1);
      await this.msg(`${name} 使出了 ${mv.n}！`);
      const called = this.calledMove(user, vU, mv);
      if (!called) { await this.msg('但是失敗了！'); return; }
      mv = called;
      act = { ...act, slot: null, called: true };
    } else {
      if (act.slot && !act.cont) act.slot.pp = Math.max(0, act.slot.pp - 1);
      if (!act.slot && mv === STRUGGLE_MD) await this.msg(`${name} 沒有可以使用的招式了！`);
    }
    const moveId = mv.num;
    if (!act.cont || !vU.charging) await this.msg(`${name} 使出了 ${mv.n}！`);
    this.field.lastMoveUsed = moveId;
    vU.lastMove = mv.id === 'struggle' ? null : moveId;
    if (mv.id !== 'protect' && !mv.stallingMove) vU.protectCount = 0;

    // 蓄力招式（第一回合）
    if (mv.flags.charge && !vU.charging) {
      const sun = this.field.weather === 'sunnyday';
      if ((mv.id === 'solarbeam' || mv.id === 'solarblade') && sun) { /* 晴天直接發動 */ }
      else {
        vU.charging = moveId;
        const semi = { fly: 'fly', bounce: 'fly', skydrop: 'fly', dig: 'dig', dive: 'dive', phantomforce: 'phantom', shadowforce: 'phantom' }[mv.id];
        vU.semi = semi || null;
        const txt = { fly: '飛向了高空！', dig: '鑽入了地下！', dive: '潛入了水中！', phantom: '消失了蹤影！' }[semi] || '正在蓄積力量！';
        await this.msg(`${name} ${txt}`);
        if (mv.id === 'skullbash') await this.boost(user, { def: 1 }, user);
        if (mv.id === 'meteorbeam' || mv.id === 'electroshot') await this.boost(user, { spa: 1 }, user);
        if (mv.id === 'electroshot' && this.field.weather === 'raindance') { vU.charging = null; } else return;
      }
    }
    const wasCharging = !!vU.charging;
    vU.charging = null; vU.semi = null;
    if (wasCharging && mv.id === 'shadowforce' || mv.id === 'phantomforce') vT.protect = false;

    const ok = await this.useMoveOn(user, target, mv, act);
    vU.lastMoveFailed = !ok;
    // 連續攻擊類（逆鱗）
    if (mv.self && mv.self.volatileStatus === 'lockedmove' && ok !== null) {
      if (!vU.locked) vU.locked = { id: moveId, turns: U.ri(2, 3) };
      vU.locked.turns--;
      if (vU.locked.turns <= 0) {
        vU.locked = null;
        if (!vU.conf) { vU.conf = U.ri(2, 5); await this.msg(`${name} 累得混亂了！`); }
      }
    }
    if (mv.self && mv.self.volatileStatus === 'mustrecharge' && ok) vU.recharge = true;
  },

  calledMove(user, vU, mv) {
    const pickFrom = ids => {
      const ok = ids.filter(id => md(id).support === 'full' && !md(id).callsMove && !md(id).flags.charge);
      return ok.length ? md(U.pick(ok)) : null;
    };
    if (mv.id === 'metronome') return pickFrom(Object.keys(MOVES).filter(id => SD.moves[id] && (SD.moves[id].flags || {}).metronome));
    if (mv.id === 'sleeptalk') {
      if (user.st !== 'slp') return null;
      return pickFrom(user.moves.map(s => String(s.id)).filter(id => id !== String(mv.num)));
    }
    if (mv.id === 'copycat') return this.field.lastMoveUsed && !md(this.field.lastMoveUsed).callsMove ? md(this.field.lastMoveUsed) : null;
    if (mv.id === 'naturepower') return md({ electricterrain: 85, grassyterrain: 412, mistyterrain: 585, psychicterrain: 94 }[this.field.terrain] || 161);
    return null;
  },

  // 回傳 true（命中）、false（失敗／未命中）、null（被打斷）
  async useMoveOn(user, target, mv, act) {
    const vU = this.volOf(user), vT = this.volOf(target);
    const name = this.label(user), tname = this.label(target);
    const selfTarget = ['self', 'allySide', 'allyTeam', 'adjacentAllyOrSelf', 'allies', 'adjacentAlly'].includes(mv.target);
    const fieldTarget = ['all', 'foeSide'].includes(mv.target);
    const hitsTarget = !selfTarget && !fieldTarget;

    // 只在登場第一回合能用
    if ((mv.id === 'fakeout' || mv.id === 'firstimpression' || mv.id === 'matblock') && vU.turnsOut > 0) { await this.msg('但是失敗了！'); return false; }
    // 突襲：目標本回合沒有要用攻擊招式或已行動
    if (mv.id === 'suckerpunch' || mv.id === 'thunderclap') {
      const tAct = this.queued[this.sideKey(target)];
      const tmv = tAct && tAct.idx !== undefined && target.moves[tAct.idx] ? md(target.moves[tAct.idx].id) : null;
      if (vT.movedThisTurn || !tmv || tmv.cat === 'Status') { await this.msg('但是失敗了！'); return false; }
    }
    if (mv.id === 'focuspunch' && vU.damagedThisTurn) { await this.msg(`${name} 失去了集中力，無法使出招式！`); return false; }

    if (hitsTarget) {
      if (!target || target.hp <= 0) { await this.msg('但是沒有目標……'); return false; }
      // 守住
      if (vT.protect && mv.flags.protect && !mv.breaksProtect) {
        await this.msg(`${tname} 保護住了自己！`);
        await this.protectContact(user, target, mv);
        if (mv.hasCrashDamage) await this.crash(user);
        return false;
      }
      if (mv.breaksProtect && vT.protect) { vT.protect = false; await this.msg(`${tname} 的守護被打破了！`); }
      // 半無敵狀態
      if (vT.semi) {
        const can = { fly: ['thunder', 'hurricane', 'gust', 'twister', 'skyuppercut', 'smackdown', 'thousandarrows'], dig: ['earthquake', 'magnitude', 'fissure'],
          dive: ['surf', 'whirlpool'], phantom: [] }[vT.semi] || [];
        if (!can.includes(mv.id) && !(vU.lockOn > 0)) { await this.msg(`${tname} 躲開了攻擊！`); return false; }
      }
      // 精神場地擋下先制招式
      if (this.field.terrain === 'psychicterrain' && (mv.pri || 0) > 0 && this.grounded(target)) { await this.msg(`${tname} 受到了精神場地的保護！`); return false; }
      // 屬性免疫（Showdown：變化招式預設忽略免疫）
      const ignoreImm = mv.ignoreImmunity !== undefined ? mv.ignoreImmunity === true : mv.cat === 'Status';
      if (!ignoreImm && this.effectiveness(mv, target) === 0 && !(mv.damage === undefined && mv.cat === 'Status' && mv.ignoreImmunity === undefined)) {
        await this.msg(`對 ${tname} 好像沒有效果……`);
        if (mv.hasCrashDamage) await this.crash(user);
        return false;
      }
      if (mv.flags.powder && this.typesOf(target).includes('grass')) { await this.msg(`對 ${tname} 好像沒有效果……`); return false; }
      // 替身擋下變化招式
      if (vT.sub && mv.cat === 'Status' && !mv.flags.bypasssub && !mv.flags.sound) { await this.msg('但是失敗了！'); return false; }
      // 命中判定
      if (!(await this.accuracyCheck(user, target, mv))) {
        await this.msg(`${tname} 躲開了攻擊！`);
        if (mv.hasCrashDamage) await this.crash(user);
        if (mv.selfdestruct === 'always') await this.selfFaint(user);
        return false;
      }
    }

    await this.moveAnim(user, target, this.viewMove(mv));
    if (mv.cat !== 'Status') return this.damagingMove(user, target, mv, act);
    return this.statusMove(user, target, mv, act);
  },

  viewMove(mv) {
    return { t: mv.type === '???' ? 'normal' : mv.type, c: mv.cat === 'Physical' ? 'ph' : mv.cat === 'Special' ? 'sp' : 'st', tg: mv.target === 'self' ? 'user' : 'selected-pokemon',
      sx: mv.boosts ? Object.entries(mv.boosts) : null, ail: mv.status };
  },

  async accuracyCheck(user, target, mv) {
    const vU = this.volOf(user), vT = this.volOf(target);
    if (mv.ohko) {
      if (target.lv > user.lv) return false;
      let acc = 30 + user.lv - target.lv;
      if (mv.id === 'sheercold' && !this.typesOf(user).includes('ice')) acc -= 10;
      return Math.random() * 100 < acc;
    }
    let acc = mv.acc;
    const w = this.field.weather;
    if ((mv.id === 'thunder' || mv.id === 'hurricane') && w === 'raindance') acc = true;
    if ((mv.id === 'thunder' || mv.id === 'hurricane') && w === 'sunnyday') acc = 50;
    if (mv.id === 'blizzard' && (w === 'hail' || w === 'snowscape')) acc = true;
    if (vT.minimize && mv.flags.minimize) acc = true;
    if (vU.lockOn > 0) { vU.lockOn = 0; acc = true; }
    if (acc === true) return true;
    let stage = vU.stg.acc - (mv.ignoreEvasion || vT.foresight ? Math.min(0, vT.stg.eva) : vT.stg.eva);
    acc = acc * accBoostMul(stage);
    if (this.field.gravity) acc = acc * 5 / 3;
    return Math.random() * 100 < acc;
  },

  // ---------- 威力 ----------
  basePower(user, target, mv) {
    const vU = this.volOf(user), vT = this.volOf(target);
    const su = Mon.stats(user), st = Mon.stats(target);
    const hpR = user.hp / su[0];
    let bp = mv.bp;
    switch (mv.id) {
      case 'grassknot': case 'lowkick': {
        const w = weightOf(target);
        bp = w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20; break;
      }
      case 'heavyslam': case 'heatcrash': {
        const r = weightOf(user) / weightOf(target);
        bp = r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40; break;
      }
      case 'gyroball': bp = Math.min(150, Math.floor(25 * this.speedOf(target, vT) / Math.max(1, this.speedOf(user, vU))) + 1); break;
      case 'electroball': {
        const r = this.speedOf(user, vU) / Math.max(1, this.speedOf(target, vT));
        bp = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; break;
      }
      case 'flail': case 'reversal': {
        const p = Math.floor(48 * user.hp / su[0]);
        bp = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20; break;
      }
      case 'eruption': case 'waterspout': case 'dragonenergy': bp = Math.max(1, Math.floor(150 * hpR)); break;
      case 'crushgrip': case 'wringout': bp = Math.max(1, Math.floor(120 * target.hp / st[0])); break;
      case 'hardpress': bp = Math.max(1, Math.floor(100 * target.hp / st[0])); break;
      case 'return': case 'pikapapow': case 'veeveevolley': bp = Math.max(1, Math.floor((user.happy || 0) * 10 / 25)); break;
      case 'frustration': bp = Math.max(1, Math.floor((255 - (user.happy || 0)) * 10 / 25)); break;
      case 'hex': if (target.st) bp *= 2; break;
      case 'venoshock': case 'barbbarrage': if (target.st === 'psn' || target.st === 'tox') bp *= 2; break;
      case 'brine': if (target.hp * 2 <= st[0]) bp *= 2; break;
      case 'facade': if (['brn', 'par', 'psn', 'tox'].includes(user.st)) bp *= 2; break;
      case 'acrobatics': bp *= 2; break; // 尚無持有道具系統，視為沒有道具
      case 'knockoff': break;
      case 'assurance': if (vT.damagedThisTurn) bp *= 2; break;
      case 'avalanche': case 'revenge': if (vU.hitBy.length) bp *= 2; break;
      case 'payback': if (vT.movedThisTurn) bp *= 2; break;
      case 'boltbeak': case 'fishiousrend': if (!vT.movedThisTurn) bp *= 2; break;
      case 'stompingtantrum': case 'temperflare': if (vU.lastMoveFailed) bp *= 2; break;
      case 'storedpower': case 'powertrip': bp = 20 + 20 * Object.values(vU.stg).reduce((a, b) => a + Math.max(0, b), 0); break;
      case 'punishment': bp = Math.min(200, 60 + 20 * Object.values(vT.stg).reduce((a, b) => a + Math.max(0, b), 0)); break;
      case 'lastrespects': bp = 50 + 50 * this.sides[this.sideKey(user)].fainted; break;
      case 'ragefist': bp = Math.min(350, 50 + 50 * vU.timesHit); break;
      case 'risingvoltage': if (this.field.terrain === 'electricterrain' && this.grounded(target)) bp *= 2; break;
      case 'expandingforce': if (this.field.terrain === 'psychicterrain') bp = Math.floor(bp * 1.5); break;
      case 'mistyexplosion': if (this.field.terrain === 'mistyterrain') bp = Math.floor(bp * 1.5); break;
      case 'terrainpulse': if (this.field.terrain) bp *= 2; break;
      case 'weatherball': if (this.field.weather) bp *= 2; break;
      case 'solarbeam': case 'solarblade': if (this.field.weather && this.field.weather !== 'sunnyday') bp = Math.floor(bp / 2); break;
      case 'hydrosteam': if (this.field.weather === 'sunnyday') bp = Math.floor(bp * 1.5); break;
      case 'psyblade': if (this.field.terrain === 'electricterrain') bp = Math.floor(bp * 1.5); break;
      case 'wakeupslap': if (target.st === 'slp') bp *= 2; break;
      case 'smellingsalts': if (target.st === 'par') bp *= 2; break;
      case 'collisioncourse': case 'electrodrift': break;
      case 'echoedvoice': bp = Math.min(200, 40 * (1 + vU.echoed)); break;
      case 'furycutter': bp = Math.min(160, 40 * Math.pow(2, vU.furyCutter)); break;
      case 'rollout': case 'iceball': bp = 30 * Math.pow(2, Math.min(4, vU.rollout)) * (vU.defenseCurl ? 2 : 1); break;
      case 'round': break;
      case 'magnitude': {
        const r = Math.random() * 100;
        bp = r < 5 ? 10 : r < 15 ? 30 : r < 35 ? 50 : r < 65 ? 70 : r < 85 ? 90 : r < 95 ? 110 : 150; break;
      }
      case 'present': { const r = Math.random(); bp = r < .4 ? 40 : r < .7 ? 80 : r < .8 ? 120 : 0; break; }
      case 'beatup': bp = 5 + Math.floor(POKEDEX[user.sp].s[1] / 10); break;
      case 'watershuriken': break;
    }
    return bp;
  },
  moveType(user, mv) {
    if (mv.id === 'weatherball') return { sunnyday: 'fire', raindance: 'water', sandstorm: 'rock', hail: 'ice', snowscape: 'ice' }[this.field.weather] || 'normal';
    if (mv.id === 'terrainpulse') return { electricterrain: 'electric', grassyterrain: 'grass', mistyterrain: 'fairy', psychicterrain: 'psychic' }[this.field.terrain] || 'normal';
    if (mv.id === 'revelationdance') return this.typesOf(user)[0];
    if (mv.id === 'ragingbull' && user.sp === 128) return 'fighting';
    return mv.type;
  },

  // ---------- 傷害招式 ----------
  async damagingMove(user, target, mv, act) {
    const vU = this.volOf(user), vT = this.volOf(target);
    const tname = this.label(target);
    const type = this.moveType(user, mv);
    const tmv = { ...mv, type };
    const eff = this.effectiveness(tmv, target);
    if (eff === 0 && mv.damage === undefined && !mv.ohko) { await this.msg(`對 ${tname} 好像沒有效果……`); return false; }

    // 破壁（劈瓦、精神之牙、怒牛）
    if (['brickbreak', 'psychicfangs', 'ragingbull'].includes(mv.id)) {
      const s = this.sides[this.sideKey(target)];
      if (s.reflect || s.lightscreen || s.auroraveil) { s.reflect = s.lightscreen = s.auroraveil = 0; await this.msg('牆壁被打破了！'); }
    }

    // 擊中次數
    let hits = 1;
    if (Array.isArray(mv.multihit)) {
      const [a, b] = mv.multihit;
      if (a === 2 && b === 5) { const r = Math.random(); hits = r < .35 ? 2 : r < .7 ? 3 : r < .85 ? 4 : 5; }
      else hits = U.ri(a, b);
    } else if (mv.multihit) hits = mv.multihit;

    let total = 0, n = 0, anyCrit = false, subHit = false;
    for (let i = 0; i < hits && target.hp > 0 && user.hp > 0; i++) {
      if (i > 0 && mv.multiaccuracy && !(await this.accuracyCheck(user, target, mv))) break;
      let dmg, crit = false;
      const fixed = this.fixedDamage(user, target, mv);
      if (fixed === false) { await this.msg('但是失敗了！'); return false; }
      if (fixed !== null) dmg = fixed;
      else {
        let bp = this.basePower(user, target, mv);
        if (mv.id === 'triplekick') bp = 10 * (i + 1);
        if (mv.id === 'tripleaxel') bp = 20 * (i + 1);
        if (bp <= 0) { if (mv.id === 'present') { await this.healMon(target, Math.floor(Mon.maxHp(target) / 4)); await this.msg(`${tname} 的體力回復了！`); return true; } await this.msg('但是失敗了！'); return false; }
        ({ dmg, crit } = this.calcDamage(user, target, vU, vT, tmv, eff, bp));
      }
      // 替身
      if (vT.sub && !mv.flags.bypasssub && !mv.flags.sound) {
        const d = Math.min(vT.sub, dmg);
        vT.sub -= d;
        subHit = true;
        await this.msg('替身代替承受了攻擊！');
        if (vT.sub <= 0) { vT.sub = 0; await this.msg(`${tname} 的替身消失了……`); }
        total += d; n++;
        continue;
      }
      // 點到為止、手下留情：至少留下 1 HP
      if ((mv.id === 'falseswipe' || mv.id === 'holdback') && dmg >= target.hp) dmg = target.hp - 1;
      // 挺住
      if (vT.endure && dmg >= target.hp) { dmg = target.hp - 1; vT.endureUsed = true; }
      dmg = Math.min(dmg, target.hp);
      if (crit) anyCrit = true;
      total += dmg; n++;
      await this.hurt(target, dmg, fixed !== null ? 1 : eff);
      if (crit) await this.msg('擊中了要害！');
      vT.hitBy.push({ by: this.sideKey(user), dmg, cat: mv.cat });
      vT.damagedThisTurn = true;
      vT.timesHit++;
      if (vT.endureUsed) { vT.endureUsed = false; await this.msg(`${tname} 挺住了攻擊！`); }
      if (vT.recharge === false && target.hp <= 0) break;
    }
    if (n === 0) return false;
    if (fixedType(mv) === null && !subHit) {
      if (eff > 1) await this.msg('效果絕佳！');
      else if (eff < 1) await this.msg('效果不好……');
    }
    if (hits > 1) await this.msg(`擊中了 ${n} 次！`);
    // 連續招式的計數
    vU.echoed = mv.id === 'echoedvoice' ? vU.echoed + 1 : 0;
    vU.furyCutter = mv.id === 'furycutter' ? vU.furyCutter + 1 : 0;
    vU.rollout = (mv.id === 'rollout' || mv.id === 'iceball') ? vU.rollout + 1 : 0;

    // 吸取／反作用力
    if (mv.drain && user.hp > 0 && total > 0) {
      const h = Math.max(1, Math.floor(total * mv.drain[0] / mv.drain[1]));
      await this.healMon(user, h);
      await this.msg(`從 ${tname} 吸取了體力！`);
    }
    if (user.hp > 0 && total > 0) {
      let rec = 0;
      if (mv.recoil) rec = Math.max(1, Math.round(total * mv.recoil[0] / mv.recoil[1]));
      if (mv.struggleRecoil) rec = Math.max(1, Math.round(Mon.maxHp(user) / 4));
      if (mv.mindBlownRecoil || mv.chloroblastRecoil) rec = Math.ceil(Mon.maxHp(user) / 2);
      if (rec) { await this.hurt(user, Math.min(rec, user.hp)); await this.msg(`${this.label(user)} 受到了反作用力的傷害！`); }
    }

    // 追加效果（替身擋下對目標的追加效果）
    const secs = mv.secondaries || (mv.secondary ? [mv.secondary] : []);
    for (const s of secs) {
      if (Math.random() * 100 >= (s.chance ?? 100)) continue;
      if (s.self) { if (user.hp > 0 && s.self.boosts) await this.boost(user, s.self.boosts, user); continue; }
      if (target.hp <= 0 || subHit) continue;
      if (s.status) await this.setStatus(target, s.status, user, true);
      if (s.volatileStatus) await this.addVolatile(target, s.volatileStatus, user, mv, true);
      if (s.boosts) await this.boost(target, s.boosts, user, true);
    }
    // 對目標的揮發狀態（束縛類）
    if (mv.volatileStatus && target.hp > 0 && !subHit) await this.addVolatile(target, mv.volatileStatus, user, mv);
    // 自身效果
    if (mv.self && mv.self.boosts && user.hp > 0 && (!mv.self.chance || Math.random() * 100 < mv.self.chance)) await this.boost(user, mv.self.boosts, user);
    if (mv.self && mv.self.volatileStatus === 'roost') vU.roost = true;
    if (mv.selfBoost && mv.selfBoost.boosts && user.hp > 0) await this.boost(user, mv.selfBoost.boosts, user);
    // 解凍
    if (mv.thawsTarget && target.st === 'frz' && target.hp > 0) { target.st = null; this.draw(); await this.msg(`${tname} 的冰凍融化了！`); }
    if (mv.id === 'sparklingaria' && target.st === 'brn') { target.st = null; this.draw(); }
    // 特殊招式後續
    if (mv.id === 'rapidspin' || mv.id === 'mortalspin') {
      const s = this.sides[this.sideKey(user)];
      s.spikes = 0; s.toxicspikes = 0; s.stealthrock = false; s.stickyweb = false;
      vU.seed = false; vU.trap = 0;
      if (mv.id === 'mortalspin' && target.hp > 0) await this.setStatus(target, 'psn', user, true);
    }
    if (mv.id === 'clearsmog' && target.hp > 0) { Object.keys(vT.stg).forEach(k => { vT.stg[k] = 0; }); await this.msg(`${tname} 的能力變化恢復原狀了！`); }
    if (mv.id === 'burnup') vU.types = this.typesOf(user).filter(t => t !== 'fire');
    if (mv.id === 'doubleshock') vU.types = this.typesOf(user).filter(t => t !== 'electric');
    if (mv.id === 'incinerate' || mv.id === 'thief' || mv.id === 'covet' || mv.id === 'pluck' || mv.id === 'bugbite' || mv.id === 'knockoff') { /* 尚無持有道具 */ }
    // 自爆類
    if (mv.selfdestruct === 'always' || mv.selfdestruct === 'ifHit') await this.selfFaint(user);
    if (mv.id === 'finalgambit') await this.selfFaint(user);
    // 吹飛
    if (mv.forceSwitch && target.hp > 0) await this.forceOut(target);
    // 交換（急速折返等）
    if (mv.selfSwitch && user.hp > 0) await this.selfSwitchOut(user, mv);
    return true;
  },

  // 固定傷害；null 表示一般計算，false 表示失敗
  fixedDamage(user, target, mv) {
    const vU = this.volOf(user);
    if (mv.ohko) return target.hp;
    if (mv.damage === 'level') return user.lv;
    if (typeof mv.damage === 'number') return mv.damage;
    switch (mv.id) {
      case 'superfang': case 'naturesmadness': case 'ruination': return Math.max(1, Math.floor(target.hp / 2));
      case 'psywave': return Math.max(1, Math.floor(user.lv * U.ri(50, 150) / 100));
      case 'endeavor': return target.hp > user.hp ? target.hp - user.hp : false;
      case 'finalgambit': return user.hp;
      case 'counter': case 'mirrorcoat': case 'metalburst': case 'comeuppance': {
        const want = mv.id === 'counter' ? 'Physical' : mv.id === 'mirrorcoat' ? 'Special' : null;
        const hit = [...vU.hitBy].reverse().find(h => h.by !== this.sideKey(user) && (!want || h.cat === want));
        if (!hit || !hit.dmg) return false;
        return Math.max(1, Math.floor(hit.dmg * (mv.id === 'counter' || mv.id === 'mirrorcoat' ? 2 : 1.5)));
      }
    }
    return null;
  },

  // Showdown getDamage（單打）
  calcDamage(user, target, vU, vT, mv, eff, bp) {
    const su = Mon.stats(user), st = Mon.stats(target);
    const phys = mv.cat === 'Physical';
    let critStage = (mv.critRatio ? mv.critRatio - 1 : 0) + (vU.focus || 0);
    let crit = !!mv.willCrit || vU.laserFocus > 0 || Math.random() < [1 / 24, 1 / 8, 1 / 2, 1][Math.min(3, critStage)];
    if (vU.laserFocus > 0) vU.laserFocus = 0;
    // 攻擊方能力
    let atkMon = mv.overrideOffensivePokemon === 'target' ? target : user;
    let atkV = atkMon === user ? vU : vT;
    let atkStat = mv.overrideOffensiveStat === 'def' ? 'def' : phys ? 'atk' : 'spa';
    let defStat = mv.overrideDefensiveStat === 'def' ? 'def' : phys ? 'def' : 'spd';
    const IDX = { atk: 1, def: 2, spa: 3, spd: 4 };
    let aS = atkV.stg[atkStat], dS = mv.ignoreDefensive ? 0 : vT.stg[defStat];
    if (crit) { aS = Math.max(0, aS); dS = Math.min(0, dS); }
    let A = Math.floor(Mon.stats(atkMon)[IDX[atkStat]] * boostMul(aS));
    let D = Math.floor(st[IDX[defStat]] * boostMul(dS));
    if (this.field.weather === 'sandstorm' && this.typesOf(target).includes('rock') && defStat === 'spd') D = Math.floor(D * 1.5);
    if ((this.field.weather === 'snowscape' || this.field.weather === 'hail') && this.typesOf(target).includes('ice') && defStat === 'def') D = Math.floor(D * 1.5);
    // 場地威力修正
    const t = this.field.terrain, grounded = this.grounded(user);
    if (grounded && ((t === 'electricterrain' && mv.type === 'electric') || (t === 'grassyterrain' && mv.type === 'grass') || (t === 'psychicterrain' && mv.type === 'psychic'))) bp = Math.floor(bp * 1.3);
    if (t === 'mistyterrain' && mv.type === 'dragon' && this.grounded(target)) bp = Math.floor(bp / 2);
    if (t === 'grassyterrain' && ['earthquake', 'bulldoze', 'magnitude'].includes(mv.id)) bp = Math.floor(bp / 2);
    if (vU.charge && mv.type === 'electric') { bp *= 2; vU.charge = false; }
    let base = Math.floor(Math.floor(Math.floor(2 * user.lv / 5 + 2) * bp * A / Math.max(1, D)) / 50) + 2;
    // 天氣
    const w = this.field.weather;
    if (w === 'sunnyday') { if (mv.type === 'fire') base = Math.floor(base * 1.5); if (mv.type === 'water' && mv.id !== 'hydrosteam') base = Math.floor(base / 2); }
    if (w === 'raindance') { if (mv.type === 'water') base = Math.floor(base * 1.5); if (mv.type === 'fire') base = Math.floor(base / 2); }
    if (crit) base = Math.floor(base * 1.5);
    base = Math.floor(base * (100 - U.ri(0, 15)) / 100);
    if (this.typesOf(user).includes(mv.type)) base = Math.floor(base * 1.5);
    base = Math.floor(base * eff);
    if (phys && user.st === 'brn' && mv.id !== 'facade') base = Math.floor(base / 2);
    // 牆壁（會心一擊無視）
    const sd = this.sides[this.sideKey(target)];
    if (!crit && !['brickbreak', 'psychicfangs', 'ragingbull'].includes(mv.id) && (sd.auroraveil || (phys ? sd.reflect : sd.lightscreen))) base = Math.floor(base / 2);
    if (vT.minimize && mv.flags.minimize) base *= 2;
    if ((mv.id === 'collisioncourse' || mv.id === 'electrodrift') && eff > 1) base = Math.floor(base * 5461 / 4096);
    if (vT.semi === 'dig' && ['earthquake', 'magnitude'].includes(mv.id)) base *= 2;
    if (vT.semi === 'dive' && ['surf', 'whirlpool'].includes(mv.id)) base *= 2;
    return { dmg: Math.max(1, base), crit };
  },

  // ---------- 變化招式 ----------
  async statusMove(user, target, mv, act) {
    const vU = this.volOf(user), vT = this.volOf(target);
    const name = this.label(user), tname = this.label(target);
    const sideU = this.sides[this.sideKey(user)], sideT = this.sides[this.sideKey(target)];
    const fail = async () => { await this.msg('但是失敗了！'); return false; };
    const selfMove = mv.target === 'self' || mv.target === 'allySide' || mv.target === 'allyTeam' || mv.target === 'adjacentAllyOrSelf' || mv.target === 'allies';
    if (mv.support === 'none') { await this.msg('但是什麼事都沒有發生。（這個招式尚未支援）'); return false; }
    let did = false;

    // 專屬效果
    switch (mv.id) {
      case 'rest': {
        const max = Mon.maxHp(user);
        if (user.hp >= max || user.st === 'slp' || (this.field.terrain === 'electricterrain' && this.grounded(user))) return fail();
        user.hp = max; user.st = 'slp'; user.slpT = 3; this.draw();
        await this.statusFx(user, 'slp');
        await this.msg(`${name} 睡著了，體力完全恢復了！`);
        return true;
      }
      case 'bellydrum': {
        const max = Mon.maxHp(user);
        if (user.hp <= Math.floor(max / 2) || vU.stg.atk >= 6) return fail();
        await this.hurt(user, Math.floor(max / 2));
        vU.stg.atk = 6;
        await this.statFx(user, true);
        await this.msg(`${name} 削減了體力，攻擊提升到了最大！`);
        return true;
      }
      case 'haze': for (const v of [vU, vT]) Object.keys(v.stg).forEach(k => { v.stg[k] = 0; }); await this.msg('所有能力變化都恢復原狀了！'); return true;
      case 'painsplit': {
        const avg = Math.floor((user.hp + target.hp) / 2);
        user.hp = Math.min(Mon.maxHp(user), avg); target.hp = Math.min(Mon.maxHp(target), avg); this.draw();
        await this.msg('雙方平分了體力！'); return true;
      }
      case 'perishsong': for (const v of [vU, vT]) if (!v.perish) v.perish = 4; await this.msg('聽了滅亡之歌的寶可夢會在 3 回合後倒下！'); return true;
      case 'psychup': vU.stg = { ...vT.stg }; await this.msg(`${name} 複製了 ${tname} 的能力變化！`); return true;
      case 'topsyturvy': Object.keys(vT.stg).forEach(k => { vT.stg[k] = -vT.stg[k]; }); await this.msg(`${tname} 的能力變化顛倒了！`); return true;
      case 'powerswap': for (const k of ['atk', 'spa']) [vU.stg[k], vT.stg[k]] = [vT.stg[k], vU.stg[k]]; await this.msg('互換了攻擊與特攻的能力變化！'); return true;
      case 'guardswap': for (const k of ['def', 'spd']) [vU.stg[k], vT.stg[k]] = [vT.stg[k], vU.stg[k]]; await this.msg('互換了防禦與特防的能力變化！'); return true;
      case 'heartswap': [vU.stg, vT.stg] = [vT.stg, vU.stg]; await this.msg('互換了所有能力變化！'); return true;
      case 'speedswap': await this.msg('互換了速度！（以能力變化代替）'); [vU.stg.spe, vT.stg.spe] = [vT.stg.spe, vU.stg.spe]; return true;
      case 'defog': {
        sideT.reflect = sideT.lightscreen = sideT.auroraveil = sideT.safeguard = sideT.mist = 0;
        for (const s of [sideU, sideT]) { s.spikes = 0; s.toxicspikes = 0; s.stealthrock = false; s.stickyweb = false; }
        if (this.field.terrain) { this.field.terrain = null; }
        await this.boost(target, { evasion: -1 }, user);
        await this.msg('吹散了場上的障礙！'); return true;
      }
      case 'splash': case 'celebrate': case 'holdhands': case 'happyhour': await this.msg('但是什麼事都沒有發生。'); return true;
      case 'meanlook': case 'block': if (vT.trapped) return fail(); vT.trapped = true; await this.msg(`${tname} 無法逃走了！`); return true;
      case 'lockon': case 'mindreader': vU.lockOn = 2; await this.msg(`${name} 鎖定了 ${tname}！`); return true;
      case 'moonlight': case 'morningsun': case 'synthesis': case 'shoreup': {
        const max = Mon.maxHp(user);
        if (user.hp >= max) return fail();
        const w = this.field.weather;
        let r = .5;
        if (mv.id === 'shoreup') r = w === 'sandstorm' ? 2 / 3 : .5;
        else if (w === 'sunnyday') r = 2 / 3;
        else if (w) r = .25;
        await this.healMon(user, Math.round(max * r));
        await this.msg(`${name} 的體力回復了！`); return true;
      }
      case 'strengthsap': {
        if (vT.stg.atk <= -6) return fail();
        const amt = Math.floor(Mon.stats(target)[1] * boostMul(vT.stg.atk));
        await this.boost(target, { atk: -1 }, user);
        await this.healMon(user, amt);
        await this.msg(`${name} 吸取了力量！`); return true;
      }
      case 'aromatherapy': case 'healbell': case 'junglehealing': case 'lunarblessing': {
        const party = user === this.me ? G.party : this.foeParty;
        party.forEach(m => { m.st = null; });
        if (mv.id === 'junglehealing' || mv.id === 'lunarblessing') await this.healMon(user, Math.floor(Mon.maxHp(user) / 4));
        this.draw(); await this.msg('同伴的異常狀態都治好了！'); return true;
      }
      case 'refresh': if (!['brn', 'par', 'psn', 'tox'].includes(user.st)) return fail(); user.st = null; this.draw(); await this.msg(`${name} 恢復了健康！`); return true;
      case 'purify': if (!target.st) return fail(); target.st = null; await this.healMon(user, Math.floor(Mon.maxHp(user) / 2)); this.draw(); return true;
      case 'takeheart': user.st = null; this.draw(); await this.boost(user, { spa: 1, spd: 1 }, user); return true;
      case 'soak': vT.types = ['water']; await this.msg(`${tname} 變成了水屬性！`); return true;
      case 'trickortreat': vT.types = [...new Set([...this.typesOf(target), 'ghost'])]; await this.msg(`${tname} 增加了幽靈屬性！`); return true;
      case 'forestscurse': vT.types = [...new Set([...this.typesOf(target), 'grass'])]; await this.msg(`${tname} 增加了草屬性！`); return true;
      case 'conversion': vU.types = [md(user.moves[0].id).type]; await this.msg(`${name} 的屬性改變了！`); return true;
      case 'reflecttype': vU.types = [...this.typesOf(target)]; await this.msg(`${name} 變成了和 ${tname} 相同的屬性！`); return true;
      case 'spite': {
        const last = vT.lastMove && target.moves.find(s => s.id === vT.lastMove);
        if (!last || last.pp <= 0) return fail();
        last.pp = Math.max(0, last.pp - 4); await this.msg(`減少了 ${tname} 的 PP！`); return true;
      }
      case 'acupressure': {
        const ks = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'].filter(k => vU.stg[STAGE_OF[k]] < 6);
        if (!ks.length) return fail();
        await this.boost(user, { [U.pick(ks)]: 2 }, user); return true;
      }
      case 'tidyup': for (const s of [sideU, sideT]) { s.spikes = 0; s.toxicspikes = 0; s.stealthrock = false; s.stickyweb = false; } vU.sub = 0; vT.sub = 0;
        await this.boost(user, { atk: 1, spe: 1 }, user); return true;
      case 'venomdrench': if (target.st !== 'psn' && target.st !== 'tox') return fail(); await this.boost(target, { atk: -1, spa: -1, spe: -1 }, user); return true;
      case 'floralhealing': case 'healpulse': await this.healMon(target, Math.floor(Mon.maxHp(target) / 2)); await this.msg(`${tname} 的體力回復了！`); return true;
      case 'memento': await this.boost(target, { atk: -2, spa: -2 }, user); await this.selfFaint(user); return true;
      case 'healingwish': case 'lunardance': {
        const party = user === this.me ? G.party : this.foeParty;
        if (!party.some(m => m !== user && m.hp > 0)) return fail();
        await this.selfFaint(user); this.pendingHealingWish = this.sideKey(user); return true;
      }
      case 'teleport':
        if (this.wildMon) { await this.msg(`${name} 逃走了！`); this.fled = true; return true; }
        await this.selfSwitchOut(user, mv); return true;
    }

    // 治癒招式
    if (mv.heal) {
      const who = selfMove || mv.target === 'self' ? user : target;
      const max = Mon.maxHp(who);
      if (who.hp >= max) return fail();
      await this.healMon(who, Math.round(max * mv.heal[0] / mv.heal[1]));
      await this.msg(`${this.label(who)} 的體力回復了！`);
      did = true;
    }
    // 天氣、場地、空間
    if (mv.weather) {
      const w = mv.weather === 'RainDance' ? 'raindance' : mv.weather === 'Sandstorm' ? 'sandstorm' : mv.weather;
      if (this.field.weather === w) return fail();
      this.field.weather = w; this.field.weatherT = 5;
      await this.msg({ raindance: '開始下雨了！', sunnyday: '日照變強了！', sandstorm: '開始颳沙暴了！', hail: '開始下冰雹了！', snowscape: '開始下雪了！' }[w]);
      did = true;
    }
    if (mv.terrain) {
      if (this.field.terrain === mv.terrain) return fail();
      this.field.terrain = mv.terrain; this.field.terrainT = 5;
      await this.msg({ electricterrain: '腳下電流飛竄！', grassyterrain: '腳下青草如茵！', mistyterrain: '腳下霧氣繚繞！', psychicterrain: '腳下傳來奇妙的感覺！' }[mv.terrain]);
      did = true;
    }
    if (mv.pseudoWeather) {
      if (mv.pseudoWeather === 'trickroom') {
        this.field.trickRoom = this.field.trickRoom ? 0 : 5;
        await this.msg(this.field.trickRoom ? `${name} 扭曲了時空！` : '扭曲的時空恢復原狀了！');
      } else if (mv.pseudoWeather === 'gravity') {
        if (this.field.gravity) return fail();
        this.field.gravity = 5; vU.magnetRise = 0; vT.magnetRise = 0;
        await this.msg('重力變強了！');
      } else await this.msg('但是什麼事都沒有發生。');
      did = true;
    }
    // 場地狀態
    if (mv.sideCondition) {
      const sc = mv.sideCondition;
      const hazard = ['spikes', 'toxicspikes', 'stealthrock', 'stickyweb'].includes(sc);
      const side = hazard ? sideT : sideU;
      const zh = { reflect: '反射壁', lightscreen: '光牆', auroraveil: '極光幕', tailwind: '順風', mist: '白霧', safeguard: '神秘守護' }[sc];
      if (sc === 'spikes') { if (side.spikes >= 3) return fail(); side.spikes++; await this.msg('對手的腳下散落著撒菱！'); }
      else if (sc === 'toxicspikes') { if (side.toxicspikes >= 2) return fail(); side.toxicspikes++; await this.msg('對手的腳下散落著毒菱！'); }
      else if (sc === 'stealthrock') { if (side.stealthrock) return fail(); side.stealthrock = true; await this.msg('對手的周圍浮著尖銳的岩石！'); }
      else if (sc === 'stickyweb') { if (side.stickyweb) return fail(); side.stickyweb = true; await this.msg('對手的腳下佈滿了黏黏網！'); }
      else if (zh) {
        if (side[sc]) return fail();
        if (sc === 'auroraveil' && !['hail', 'snowscape'].includes(this.field.weather)) return fail();
        side[sc] = sc === 'tailwind' ? 4 : 5;
        await this.msg(`${name} 張起了${zh}！`);
      } else await this.msg('但是什麼事都沒有發生。');
      did = true;
    }
    if (mv.slotCondition === 'Wish') {
      if (sideU.wish) return fail();
      sideU.wish = { turns: 2, hp: Math.floor(Mon.maxHp(user) / 2) };
      await this.msg(`${name} 許下了願望！`);
      did = true;
    }
    // 揮發狀態
    if (mv.volatileStatus) {
      const who = selfMove ? user : target;
      const r = await this.addVolatile(who, mv.volatileStatus, user, mv);
      if (r === false && !mv.boosts && !mv.status) return false;
      did = true;
    }
    if (mv.self && mv.self.volatileStatus === 'roost') {
      const max = Mon.maxHp(user);
      vU.roost = true;
    }
    // 異常狀態
    if (mv.status) {
      const r = await this.setStatus(target, mv.status, user, false, mv);
      if (!r && !mv.boosts) return false;
      did = true;
    }
    // 能力變化
    if (mv.boosts) {
      const who = selfMove ? user : target;
      if (who !== user && sideT.mist && Object.values(mv.boosts).some(v => v < 0)) { await this.msg(`${tname} 受到白霧的保護！`); return false; }
      const r = await this.boost(who, mv.boosts, user, false);
      if (mv.id === 'swagger' || mv.id === 'flatter') await this.addVolatile(target, 'confusion', user, mv);
      if (!r && !did) return false;
      did = true;
    }
    if (mv.self && mv.self.boosts) { await this.boost(user, mv.self.boosts, user); did = true; }
    if (mv.forceSwitch) { await this.forceOut(target); did = true; }
    if (mv.selfSwitch && user.hp > 0) { await this.selfSwitchOut(user, mv); did = true; }
    if (!did) await this.msg('但是什麼事都沒有發生。');
    return did;
  },

  // ---------- 狀態 ----------
  async setStatus(target, status, source, secondary = false, mv = null) {
    const name = this.label(target);
    const types = this.typesOf(target);
    const fail = async txt => { if (!secondary) await this.msg(txt || `對 ${name} 好像沒有效果……`); return false; };
    if (target.hp <= 0) return false;
    if (target.st) return fail(secondary ? '' : `${name} 已經處於異常狀態了！`);
    const sideT = this.sides[this.sideKey(target)];
    if (sideT.safeguard && source !== target) return fail(`${name} 受到神秘守護的保護！`);
    const grounded = this.grounded(target);
    if (this.field.terrain === 'mistyterrain' && grounded) return fail(`${name} 受到薄霧場地的保護！`);
    if (status === 'slp' && this.field.terrain === 'electricterrain' && grounded) return fail(`${name} 受到電氣場地的保護！`);
    if (status === 'brn' && types.includes('fire')) return fail();
    if (status === 'par' && types.includes('electric')) return fail();
    if ((status === 'psn' || status === 'tox') && (types.includes('poison') || types.includes('steel'))) return fail();
    if (status === 'frz' && (types.includes('ice') || this.field.weather === 'sunnyday')) return fail();
    if (status === 'par' && mv && mv.id === 'thunderwave' && types.includes('ground')) return fail();
    target.st = status;
    if (status === 'slp') target.slpT = U.ri(2, 4);
    if (status === 'tox') this.volOf(target).toxN = 0;
    this.draw();
    await this.statusFx(target, status);
    await this.msg(`${name} ${{ par: '麻痺了，可能會無法行動！', slp: '睡著了！', frz: '被凍住了！', brn: '被灼傷了！', psn: '中毒了！', tox: '中了劇毒！' }[status]}`);
    return true;
  },

  // 舊介面相容
  async inflict(target, vT, mv, secondary) {
    const st = { paralysis: 'par', sleep: 'slp', freeze: 'frz', burn: 'brn', poison: mv.id === 92 ? 'tox' : 'psn' }[mv.ail];
    if (st) return this.setStatus(target, st, null, secondary);
  },

  async addVolatile(target, vs, source, mv, secondary = false) {
    const v = this.volOf(target), name = this.label(target);
    const user = source, vU = this.volOf(source);
    const fail = async () => { if (!secondary) await this.msg('但是失敗了！'); return false; };
    switch (vs) {
      case 'flinch': v.flinch = true; return true;
      case 'confusion':
        if (v.conf > 0) return fail();
        if (this.field.terrain === 'mistyterrain' && this.grounded(target)) return fail();
        v.conf = U.ri(2, 5); await this.msg(`${name} 混亂了！`); return true;
      case 'attract': if (v.love) return fail(); v.love = true; await this.msg(`${name} 著迷了！`); return true;
      case 'leechseed': if (v.seed || this.typesOf(target).includes('grass')) { if (!secondary) await this.msg(`對 ${name} 好像沒有效果……`); return false; }
        v.seed = true; await this.msg(`在 ${name} 身上種下了種子！`); return true;
      case 'partiallytrapped': if (v.trap) return true; v.trap = U.ri(4, 5); await this.msg(`${name} 被困住了！`); return true;
      case 'yawn': if (target.st || v.yawn) return fail(); v.yawn = 2; await this.msg(`${name} 變得昏昏欲睡了！`); return true;
      case 'substitute': {
        const max = Mon.maxHp(target);
        if (v.sub || target.hp <= Math.floor(max / 4)) return fail();
        await this.hurt(target, Math.floor(max / 4));
        v.sub = Math.floor(max / 4); await this.msg(`${name} 製造出了替身！`); return true;
      }
      case 'protect': case 'kingsshield': case 'spikyshield': case 'banefulbunker': case 'obstruct': case 'silktrap': case 'burningbulwark': case 'endure': {
        const last = this.order[this.order.length - 1] === this.sideKey(target);
        if (last || Math.random() > Math.pow(1 / 3, v.protectCount)) { v.protectCount = 0; return fail(); }
        v.protectCount++;
        if (vs === 'endure') { v.endure = true; await this.msg(`${name} 擺出了挺住的架式！`); }
        else { v.protect = vs; await this.msg(`${name} 擺出了防守的架式！`); }
        return true;
      }
      case 'focusenergy': if (v.focus) return fail(); v.focus = 2; await this.msg(`${name} 變得充滿幹勁！`); return true;
      case 'laserfocus': v.laserFocus = 2; await this.msg(`${name} 磨練了專注力！`); return true;
      case 'taunt': if (v.taunt) return fail(); v.taunt = 3; await this.msg(`${name} 被挑釁了！`); return true;
      case 'encore': {
        if (v.encore || !v.lastMove || md(v.lastMove).callsMove) return fail();
        v.encore = 3; v.encoreMove = v.lastMove; await this.msg(`${name} 接受了再來一次！`); return true;
      }
      case 'disable': {
        if (v.disable || !v.lastMove) return fail();
        v.disable = 4; v.disableMove = v.lastMove; await this.msg(`${name} 的 ${md(v.lastMove).n} 被封住了！`); return true;
      }
      case 'destinybond': v.destinyBond = true; await this.msg(`${name} 想要和對手同歸於盡！`); return true;
      case 'curse':
        if (!this.typesOf(user).includes('ghost')) return true;
        if (v.curse) return fail();
        await this.hurt(user, Math.floor(Mon.maxHp(user) / 2));
        v.curse = true; await this.msg(`${this.label(user)} 削減了體力，詛咒了 ${name}！`); return true;
      case 'ingrain': if (v.ingrain) return fail(); v.ingrain = true; await this.msg(`${name} 紮下了根！`); return true;
      case 'aquaring': if (v.aquaRing) return fail(); v.aquaRing = true; await this.msg(`${name} 被水環包圍了！`); return true;
      case 'magnetrise': if (v.magnetRise || v.ingrain || this.field.gravity) return fail(); v.magnetRise = 5; await this.msg(`${name} 用電磁力浮了起來！`); return true;
      case 'minimize': v.minimize = true; return true;
      case 'defensecurl': v.defenseCurl = true; return true;
      case 'charge': v.charge = true; await this.msg(`${name} 開始充電了！`); return true;
      case 'foresight': v.foresight = true; await this.msg(`${name} 被識破了！`); return true;
      case 'smackdown': v.smackDown = true; v.magnetRise = 0; if (v.semi === 'fly') v.semi = null; return true;
      case 'tarshot': if (v.tarShot) return fail(); v.tarShot = true; await this.msg(`${name} 變得怕火了！`); return true;
      case 'noretreat': if (v.trapped) return fail(); v.trapped = true; return true;
      case 'octolock': if (v.octolock) return fail(); v.octolock = true; v.trapped = true; await this.msg(`${name} 被章魚桶縛住了！`); return true;
      case 'saltcure': if (!v.saltCure) { v.saltCure = true; await this.msg(`${name} 被鹽醃了！`); } return true;
      case 'syrupbomb': if (!v.syrupBomb) { v.syrupBomb = 3; await this.msg(`${name} 沾滿了糖漿！`); } return true;
      case 'sparklingaria': return true;
      case 'roost': v.roost = true; return true;
      default:
        if (!secondary) await this.msg('但是什麼事都沒有發生。');
        return false;
    }
  },

  // 能力變化（Showdown boost）
  async boost(target, boosts, source, secondary = false) {
    if (!target || target.hp <= 0) return false;
    const v = this.volOf(target), name = this.label(target);
    let any = false;
    for (const [k, c] of Object.entries(boosts)) {
      const key = STAGE_OF[k];
      if (!key || !c) continue;
      if (c < 0 && target !== source && this.sides[this.sideKey(target)].mist) { if (!secondary) await this.msg(`${name} 受到白霧的保護！`); continue; }
      if (c < 0 && target !== source && this.volOf(target).sub && !secondary) { await this.msg('但是失敗了！'); continue; }
      const cur = v.stg[key];
      if ((c > 0 && cur >= 6) || (c < 0 && cur <= -6)) {
        if (!secondary) await this.msg(`${name} 的${BOOST_ZH[k]}已經無法再${c > 0 ? '提高' : '降低'}了！`);
        continue;
      }
      v.stg[key] = U.clamp(cur + c, -6, 6);
      if (c < 0) v.statsLoweredThisTurn = true;
      any = true;
      const amt = Math.abs(c) >= 3 ? '極大幅' : Math.abs(c) === 2 ? '大幅' : '';
      await this.statFx(target, c > 0);
      await this.msg(`${name} 的${BOOST_ZH[k]}${amt}${c > 0 ? '提高' : '降低'}了！`);
    }
    return any;
  },
  async stage(m, v, stat, c) {
    const k = { attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spd', speed: 'spe', accuracy: 'accuracy', evasion: 'evasion' }[stat];
    if (k) await this.boost(m, { [k]: c }, m);
  },

  async protectContact(user, target, mv) {
    const p = this.volOf(target).protect;
    if (!mv.flags.contact) return;
    if (p === 'spikyshield') { await this.hurt(user, Math.max(1, Math.floor(Mon.maxHp(user) / 8))); await this.msg(`${this.label(user)} 受到了傷害！`); }
    if (p === 'banefulbunker') await this.setStatus(user, 'psn', target, true);
    if (p === 'burningbulwark') await this.setStatus(user, 'brn', target, true);
    if (p === 'kingsshield') await this.boost(user, { atk: -1 }, target, true);
    if (p === 'obstruct') await this.boost(user, { def: -2 }, target, true);
    if (p === 'silktrap') await this.boost(user, { spe: -1 }, target, true);
  },
  async crash(user) {
    await this.hurt(user, Math.floor(Mon.maxHp(user) / 2));
    await this.msg(`${this.label(user)} 摔了下去，受到了傷害！`);
  },
  async selfFaint(user) {
    if (user.hp <= 0) return;
    await this.hurt(user, user.hp);
  },

  // 吹飛：野生戰鬥直接結束；訓練家戰隨機換上下一隻
  async forceOut(target) {
    if (this.wildMon) { this.fled = true; await this.msg(this.sideKey(target) === 'foe' ? `${this.label(target)} 被吹走了！` : '被吹走了，戰鬥結束了！'); return; }
    const isFoe = target === this.foe;
    const party = isFoe ? this.foeParty : G.party;
    const cur = isFoe ? this.foeIdx : this.myIdx;
    const opts = party.map((m, i) => i).filter(i => i !== cur && party[i].hp > 0);
    if (!opts.length) { await this.msg('但是失敗了！'); return; }
    const i = U.pick(opts);
    if (isFoe) { this.foeIdx = i; this.vFoe = newVol(); Game.markSeen(this.foe.sp); await this.sendOut('foe', this.foe); await this.msg(`${Mon.name(this.foe)} 被拖了出來！`); await this.onEntry(this.foe); }
    else { this.myIdx = i; this.vMe = newVol(); this.participants.add(i); await this.sendOut('me', this.me); await this.msg(`${Mon.name(this.me)} 被拖了出來！`); await this.onEntry(this.me); }
  },
  async selfSwitchOut(user, mv) {
    const isFoe = user === this.foe;
    if (isFoe) {
      if (this.wildMon) return;
      const opts = this.foeParty.map((m, i) => i).filter(i => i !== this.foeIdx && this.foeParty[i].hp > 0);
      if (!opts.length) return;
      const keep = mv.selfSwitch === 'copyvolatile' ? { stg: { ...this.vFoe.stg }, sub: this.vFoe.sub } : null;
      await this.foeSwitch(U.pick(opts));
      if (keep) Object.assign(this.vFoe, keep);
      return;
    }
    if (!G.party.some((m, i) => i !== this.myIdx && m.hp > 0)) return;
    const keep = mv.selfSwitch === 'copyvolatile' ? { stg: { ...this.vMe.stg }, sub: this.vMe.sub } : null;
    let i = -1;
    while (i < 0 || i === this.myIdx) i = await Game.partyMenu({ battle: this, forced: true });
    await this.switchTo(i);
    if (keep) Object.assign(this.vMe, keep);
  },

  // 登場時：撒菱、隱形岩、毒菱、黏黏網、治癒之願
  async onEntry(m) {
    const side = this.sides[this.sideKey(m)];
    const v = this.volOf(m);
    v.turnsOut = 0;
    if (this.pendingHealingWish === this.sideKey(m)) {
      this.pendingHealingWish = null;
      Mon.heal(m); this.draw(); await this.msg(`治癒之願讓 ${this.label(m)} 恢復了！`);
    }
    const grounded = this.grounded(m);
    if (side.stealthrock) {
      const e = typeEff('rock', this.typesOf(m));
      await this.hurt(m, Math.max(1, Math.floor(Mon.maxHp(m) * e / 8)));
      await this.msg(`尖銳的岩石扎進了 ${this.label(m)} 的身體！`);
    }
    if (side.spikes && grounded && m.hp > 0) {
      await this.hurt(m, Math.floor(Mon.maxHp(m) * [0, 1 / 8, 1 / 6, 1 / 4][side.spikes]));
      await this.msg(`${this.label(m)} 受到了撒菱的傷害！`);
    }
    if (side.toxicspikes && grounded && m.hp > 0) {
      if (this.typesOf(m).includes('poison')) { side.toxicspikes = 0; await this.msg('毒菱被吸收了！'); }
      else await this.setStatus(m, side.toxicspikes >= 2 ? 'tox' : 'psn', null, true);
    }
    if (side.stickyweb && grounded && m.hp > 0) { await this.msg(`${this.label(m)} 被黏黏網纏住了！`); await this.boost(m, { spe: -1 }, null, true); }
  },

  // ---------- 回合結束（Showdown residual 順序） ----------
  async endOfTurn() {
    const f = this.field;
    // 天氣
    if (f.weather) {
      if (f.weather === 'sandstorm' || f.weather === 'hail') {
        for (const m of [this.me, this.foe]) {
          if (!m || m.hp <= 0) continue;
          const t = this.typesOf(m);
          const immune = f.weather === 'sandstorm' ? t.some(x => ['rock', 'ground', 'steel'].includes(x)) : t.includes('ice');
          if (immune || this.volOf(m).semi === 'dig' || this.volOf(m).semi === 'dive') continue;
          await this.hurt(m, Math.max(1, Math.floor(Mon.maxHp(m) / 16)));
          await this.msg(`${this.label(m)} 受到了${f.weather === 'sandstorm' ? '沙暴' : '冰雹'}的傷害！`);
        }
      }
      if (--f.weatherT <= 0) {
        await this.msg({ raindance: '雨停了。', sunnyday: '日照恢復正常了。', sandstorm: '沙暴停止了。', hail: '冰雹停止了。', snowscape: '雪停了。' }[f.weather]);
        f.weather = null;
      }
    }
    // 未來攻擊
    for (const fu of this.futures.splice(0)) {
      if (--fu.turns > 0) { this.futures.push(fu); continue; }
    }
    for (const key of ['me', 'foe']) {
      const s = this.sides[key];
      const m = key === 'me' ? this.me : this.foe;
      if (s.wish && --s.wish.turns <= 0) {
        if (m && m.hp > 0 && m.hp < Mon.maxHp(m)) { await this.healMon(m, s.wish.hp); await this.msg('願望實現了！'); }
        s.wish = null;
      }
    }
    for (const [m, v, om] of [[this.me, this.vMe, this.foe], [this.foe, this.vFoe, this.me]]) {
      v.flinch = false; v.protect = false; v.endure = false; v.roost = false;
      if (!m || m.hp <= 0) continue;
      v.turnsOut++;
      const max = Mon.maxHp(m), name = this.label(m);
      if (f.terrain === 'grassyterrain' && this.grounded(m) && m.hp < max) { await this.healMon(m, Math.max(1, Math.floor(max / 16))); await this.msg(`${name} 的體力回復了！`); }
      if (v.aquaRing && m.hp < max) { await this.healMon(m, Math.max(1, Math.floor(max / 16))); await this.msg(`水環回復了 ${name} 的體力！`); }
      if (v.ingrain && m.hp < max) { await this.healMon(m, Math.max(1, Math.floor(max / 16))); await this.msg(`${name} 從根部吸取了養分！`); }
      if (v.seed && om && om.hp > 0) {
        const d = Math.min(m.hp, Math.max(1, Math.floor(max / 8)));
        await this.hurt(m, d); await this.healMon(om, d);
        await this.msg(`寄生種子吸取了 ${name} 的體力！`);
      }
      if (m.hp > 0) {
        if (m.st === 'brn') { await this.hurt(m, Math.max(1, Math.floor(max / 16))); await this.msg(`${name} 受到了灼傷的傷害！`); }
        else if (m.st === 'psn') { await this.hurt(m, Math.max(1, Math.floor(max / 8))); await this.msg(`${name} 受到了毒的傷害！`); }
        else if (m.st === 'tox') { v.toxN = Math.min(15, v.toxN + 1); await this.hurt(m, Math.max(1, Math.floor(max * v.toxN / 16))); await this.msg(`${name} 受到了劇毒的傷害！`); }
      }
      if (m.hp > 0 && v.curse) { await this.hurt(m, Math.max(1, Math.floor(max / 4))); await this.msg(`${name} 受到了詛咒的傷害！`); }
      if (m.hp > 0 && v.trap > 0) {
        v.trap--;
        if (v.trap > 0) { await this.hurt(m, Math.max(1, Math.floor(max / 8))); await this.msg(`${name} 受到了束縛的傷害！`); }
        else await this.msg(`${name} 從束縛中解放了！`);
      }
      if (m.hp > 0 && v.saltCure) {
        const big = this.typesOf(m).some(t => t === 'water' || t === 'steel');
        await this.hurt(m, Math.max(1, Math.floor(max / (big ? 4 : 8)))); await this.msg(`${name} 受到了鹽醃的傷害！`);
      }
      if (m.hp > 0 && v.octolock) await this.boost(m, { def: -1, spd: -1 }, om, true);
      if (m.hp > 0 && v.syrupBomb > 0) { v.syrupBomb--; await this.boost(m, { spe: -1 }, om, true); }
      if (v.taunt > 0 && --v.taunt === 0) await this.msg(`${name} 不再被挑釁了。`);
      if (v.encore > 0 && --v.encore === 0) { v.encoreMove = null; await this.msg(`${name} 的再來一次結束了。`); }
      if (v.disable > 0 && --v.disable === 0) { v.disableMove = null; await this.msg(`${name} 的定身法解除了。`); }
      if (v.magnetRise > 0) v.magnetRise--;
      if (v.lockOn > 0) v.lockOn--;
      if (m.hp > 0 && v.yawn > 0 && --v.yawn === 0) await this.setStatus(m, 'slp', null, true);
      if (m.hp > 0 && v.perish > 0) {
        v.perish--;
        await this.msg(`${name} 的滅亡計數變成了 ${v.perish}！`);
        if (v.perish === 0) await this.hurt(m, m.hp);
      }
    }
    for (const key of ['me', 'foe']) {
      const s = this.sides[key];
      for (const k of ['reflect', 'lightscreen', 'auroraveil', 'tailwind', 'mist', 'safeguard']) {
        if (s[k] > 0 && --s[k] === 0) await this.msg({ reflect: '反射壁消失了。', lightscreen: '光牆消失了。', auroraveil: '極光幕消失了。', tailwind: '順風停止了。', mist: '白霧消失了。', safeguard: '神秘守護消失了。' }[k]);
      }
    }
    if (f.terrain && --f.terrainT <= 0) { f.terrain = null; await this.msg('場地恢復原狀了。'); }
    if (f.trickRoom && --f.trickRoom <= 0) await this.msg('扭曲的時空恢復原狀了！');
    if (f.gravity && --f.gravity <= 0) await this.msg('重力恢復正常了。');
    // 同歸：本回合倒下時把對手一起帶走
    for (const [m, v] of [[this.me, this.vMe], [this.foe, this.vFoe]]) if (v.destinyBond && m.hp > 0) v.destinyBond = false;
  },
});

function fixedType(mv) { return mv.damage !== undefined || mv.ohko || ['superfang', 'naturesmadness', 'ruination', 'psywave', 'endeavor', 'finalgambit', 'counter', 'mirrorcoat', 'metalburst', 'comeuppance'].includes(mv.id) ? 'fixed' : null; }
