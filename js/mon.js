// 寶可夢個體：能力值、經驗值、招式、進化（最新世代公式）
const NATURES = ['勤奮', '怕寂寞', '勇敢', '固執', '頑皮', '大膽', '坦率', '悠閒', '淘氣', '樂天', '膽小', '急躁', '認真', '爽朗',
  '天真', '內斂', '慢吞吞', '冷靜', '害羞', '馬虎', '溫和', '溫順', '自大', '慎重', '浮躁'];
const NAT_STAT = [1, 2, 5, 3, 4]; // 攻擊 防禦 速度 特攻 特防
const STAT_ZH = ['HP', '攻擊', '防禦', '特攻', '特防', '速度'];
const STATUS_ZH = { par: '麻痺', slp: '睡眠', frz: '冰凍', brn: '灼傷', psn: '中毒', tox: '劇毒' };
const STATUS_C = { par: '#d8b020', slp: '#8a8a8a', frz: '#60c8e8', brn: '#e05030', psn: '#9040b0', tox: '#702090' };
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const STRUGGLE = { id: 165, n: '掙扎', t: 'unknown', c: 'ph', p: 50, a: 0, pp: 1, pr: 0, tg: 'selected-pokemon', dr: -25 };

const Mon = {
  sp(id) { return POKEDEX[id]; },
  name(m) { return m.nick || POKEDEX[m.sp].n; },
  types(m) { return POKEDEX[m.sp].t; },
  bst(id) { return POKEDEX[id].s.reduce((a, b) => a + b, 0); },

  expFor(gr, n) {
    if (n <= 1) return 0;
    const n3 = n * n * n;
    switch (gr) {
      case 'fast': return Math.floor(4 * n3 / 5);
      case 'medium': return n3;
      case 'medium-slow': return Math.max(0, Math.floor(6 / 5 * n3 - 15 * n * n + 100 * n - 140));
      case 'slow': return Math.floor(5 * n3 / 4);
      case 'slow-then-very-fast':
        if (n < 50) return Math.floor(n3 * (100 - n) / 50);
        if (n < 68) return Math.floor(n3 * (150 - n) / 100);
        if (n < 98) return Math.floor(n3 * Math.floor((1911 - 10 * n) / 3) / 500);
        return Math.floor(n3 * (160 - n) / 100);
      case 'fast-then-very-slow':
        if (n < 15) return Math.floor(n3 * (Math.floor((n + 1) / 3) + 24) / 50);
        if (n < 36) return Math.floor(n3 * (n + 14) / 50);
        return Math.floor(n3 * (Math.floor(n / 2) + 32) / 50);
      default: return n3;
    }
  },

  stats(m) {
    const b = POKEDEX[m.sp].s, L = m.lv, out = [];
    out[0] = b[0] === 1 ? 1 : Math.floor((2 * b[0] + m.iv[0] + Math.floor((m.ev?.[0] || 0) / 4)) * L / 100) + L + 10;
    for (let i = 1; i < 6; i++) {
      out[i] = Math.floor((2 * b[i] + m.iv[i] + Math.floor((m.ev?.[i] || 0) / 4)) * L / 100) + 5;
    }
    const up = NAT_STAT[Math.floor(m.nat / 5)], down = NAT_STAT[m.nat % 5];
    if (up !== down) {
      out[up] = Math.floor(out[up] * 1.1);
      out[down] = Math.floor(out[down] * 0.9);
    }
    return out;
  },
  maxHp(m) { return Mon.stats(m)[0]; },

  movesFor(id, lv) {
    const learn = POKEDEX[id].l.filter(([l, mid]) => l <= lv && MOVES[mid]);
    const ids = [];
    for (let i = learn.length - 1; i >= 0 && ids.length < 4; i--) {
      if (!ids.includes(learn[i][1])) ids.push(learn[i][1]);
    }
    if (!ids.length) ids.push(33);
    return ids.reverse();
  },

  create(id, lv, opts = {}) {
    const s = POKEDEX[id];
    const m = {
      uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      sp: id, lv, exp: Mon.expFor(s.gr, lv),
      iv: Array.from({ length: 6 }, () => U.ri(0, 31)),
      ev: [0, 0, 0, 0, 0, 0],
      nat: U.ri(0, 24),
      happy: s.hap,
      st: null,
      shiny: opts.shiny ?? Math.random() < 1 / 4096,
      moves: Mon.movesFor(id, lv).filter(x => MOVES[x]).map(x => ({ id: x, pp: MOVES[x].pp })),
    };
    if (opts.perfect) m.iv = m.iv.map(v => Math.max(v, opts.perfect));
    m.hp = Mon.maxHp(m);
    return m;
  },

  heal(m) {
    m.hp = Mon.maxHp(m);
    m.st = null;
    m.moves.forEach(x => { x.pp = MOVES[x.id].pp; });
  },

  sprite(id, { back = false, shiny = false } = {}) {
    return SPR + (back ? 'back/' : '') + (shiny ? 'shiny/' : '') + id + '.png';
  },

  // 等級提升或使用道具時的進化候選
  evoCandidates(m, item = null) {
    const evs = POKEDEX[m.sp].ev || [];
    const night = U.isNight();
    const st = Mon.stats(m);
    return evs.filter(e => {
      if (!POKEDEX[e.to]) return false;
      if (item) return e.item === item;
      if (e.item) return false;
      if (e.time === 'day' && night) return false;
      if (e.time === 'night' && !night) return false;
      if (e.rps !== undefined) {
        const r = Math.sign(st[1] - st[2]);
        if (r !== e.rps) return false;
      }
      if (e.happy) return m.happy >= 160;
      return e.lvl && m.lv >= e.lvl;
    });
  },

  // 最新世代經驗值公式（含學習裝置：未上場者獲得一半）
  expGain(foe, me, trainer, participated) {
    const b = POKEDEX[foe.sp].xp, L = foe.lv, Lp = me.lv;
    let e = (b * L / 5) * Math.pow((2 * L + 10) / (L + Lp + 10), 2.5) + 1;
    if (trainer) e *= 1.5;
    if (!participated) e /= 2;
    return Math.max(1, Math.floor(e));
  },

  // EV：打倒對手獲得其最高種族值項目的努力值
  gainEV(m, foe) {
    const b = POKEDEX[foe.sp].s;
    let best = 0;
    for (let i = 1; i < 6; i++) if (b[i] > b[best]) best = i;
    const pts = b[best] >= 100 ? 2 : 1;
    m.ev = m.ev || [0, 0, 0, 0, 0, 0];
    const total = m.ev.reduce((a, c) => a + c, 0);
    if (total < 510 && m.ev[best] < 252) m.ev[best] = Math.min(252, m.ev[best] + pts);
  },
};
