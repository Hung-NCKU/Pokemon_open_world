// 形態：地區形態（阿羅拉、伽勒爾、洗翠、帕底亞）與洛托姆的家電形態（資料：data/forms.js）
// 個體以 m.form（形態名稱，例如 'vulpix-alola'）記錄；屬性、種族值、特性、招式、體重都改用形態的資料
const FORM_REGION = { alola: 'alola', galar: 'galar', paldea: 'paldea', hisui: 'sinnoh' };
// 地區形態進化成不同物種（其餘維持同一地區形態，例如 阿羅拉六尾 → 阿羅拉九尾）
const FORM_EVO = {
  'meowth-galar': { to: 863, lvl: 28 }, 'farfetchd-galar': { to: 865, lvl: 30 }, 'mr-mime-galar': { to: 866, lvl: 42 },
  'corsola-galar': { to: 864, lvl: 38 }, 'yamask-galar': { to: 867, lvl: 34 }, 'linoone-galar': { to: 862, lvl: 35 },
  'sneasel-hisui': { to: 903, lvl: 30 }, 'qwilfish-hisui': { to: 904, lvl: 30 }, 'wooper-paldea': { to: 980, lvl: 20 },
};
// 洛托姆的形態與專屬招式（PokéAPI 招式編號）
const ROTOM_FORMS = [
  [null, 84], ['rotom-heat', 315], ['rotom-wash', 56], ['rotom-frost', 59], ['rotom-fan', 403], ['rotom-mow', 437],
];
ITEMS['rotom-catalog'] = { n: '洛托姆型錄', price: 0, kind: 'key', d: '記載著家電的型錄。可以改變洛托姆的形態。' };

const Forms = {
  get(m) { return m && m.form && window.FORMS && FORMS[m.form] && FORMS[m.form].base === m.sp ? FORMS[m.form] : null; },
  // 個體資料：形態覆蓋物種
  data(m) {
    const f = Forms.get(m), s = POKEDEX[m.sp];
    if (!f) return s;
    return { ...s, n: f.n, t: f.t, s: f.s, ey: f.ey, ab: f.ab, w: f.w, l: f.l.length ? f.l : s.l, formId: f.id };
  },
  // 某物種在某地區的地區形態（傳說的伽勒爾三聖鳥不算）
  regional(sp, region) {
    if (!window.FORMS || POKEDEX[sp].lg) return null;
    for (const [name, f] of Object.entries(FORMS)) {
      if (f.base !== sp || !f.region || FORM_REGION[f.region] !== region) continue;
      if (name.includes('-breed') && name !== 'tauros-paldea-combat-breed') continue;
      return name;
    }
    return null;
  },
  // 野生寶可夢：阿羅拉、伽勒爾、帕底亞一定是地區形態；神奧有 40% 是洗翠形態；帕底亞肯泰羅三種之一
  wild(sp, region) {
    let f = Forms.regional(sp, region);
    if (!f) return null;
    if (region === 'sinnoh' && !U.chance(.4)) return null;
    if (sp === 128 && region === 'paldea') f = U.pick(['tauros-paldea-combat-breed', 'tauros-paldea-blaze-breed', 'tauros-paldea-aqua-breed']);
    return f;
  },
  // 進化後的形態：同地區形態的進化型；沒有形態的寶可夢在阿羅拉／伽勒爾地區進化時變成當地形態
  evolvedForm(m, to, region) {
    const f = Forms.get(m);
    const toEn = POKEDEX[to].en;
    if (f && f.region) {
      const hit = Object.keys(FORMS).find(k => FORMS[k].base === to && FORMS[k].region === f.region);
      return hit || null;
    }
    if (!f && (region === 'alola' || region === 'galar')) {
      const hit = Object.keys(FORMS).find(k => FORMS[k].base === to && FORMS[k].region === region && k.startsWith(toEn));
      return hit || null;
    }
    return null;
  },
  // 地區形態專屬的進化（伽勒爾喵喵 → 喵頭目 等），回傳 Mon.evoCandidates 格式
  candidates(m) {
    const e = m.form && FORM_EVO[m.form];
    if (!e || !POKEDEX[e.to]) return null;
    return m.lv >= e.lvl ? [{ to: e.to, lvl: e.lvl, score: 1 }] : [];
  },
  spriteId(m) { const f = Forms.get(m); return f ? f.id : m.sp; },
  // 洛托姆型錄：換形態並換專屬招式
  async rotom(m) {
    const cur = ROTOM_FORMS.findIndex(([f]) => (m.form || null) === f);
    const i = await UI.choose(ROTOM_FORMS.map(([f]) => f ? FORMS[f].n : '洛托姆（一般）').concat(['取消']), { prompt: '要變成哪種形態？' });
    if (i < 0 || i === ROTOM_FORMS.length || i === cur) return false;
    const [form, mv] = ROTOM_FORMS[i], oldMv = ROTOM_FORMS[cur < 0 ? 0 : cur][1];
    if (form) m.form = form; else delete m.form;
    const k = m.moves.findIndex(x => x.id === oldMv);
    if (k >= 0) m.moves[k] = { id: mv, pp: MOVES[mv].pp };
    else if (!m.moves.some(x => x.id === mv)) await Game.learnMove(m, mv);
    m.hp = Math.min(m.hp, Mon.maxHp(m));
    await UI.say(`洛托姆變成了${form ? FORMS[form].n : '原本的樣子'}！`);
    return true;
  },
};
