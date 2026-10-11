// 圖鑑與箱子共用的搜尋：名稱、屬性、地區（世代）、捕捉狀態、標記
import { G, UI } from './core.js';
import { REGIONS, TYPES, typeTag } from './data.js';
import { Mon } from './mon.js';
const MARKS = ['●', '▲', '■', '♥', '★', '◆'];
const Search = {
  empty() { return { text: '', type: null, gen: null, status: 'all', mark: null }; },
  active(q) { return !!(q.text || q.type || q.gen || q.status !== 'all' || q.mark); },
  label(q) {
    const p = [];
    if (q.text) p.push(`「${q.text}」`);
    if (q.type) p.push(TYPES[q.type].n + '屬性');
    if (q.gen) p.push((Object.values(REGIONS).find(r => r.gen === q.gen) || { n: '第' + q.gen + '世代' }).n);
    if (q.status !== 'all') p.push({ caught: '已捕捉', uncaught: '未捕捉', seen: '看過但未捕捉' }[q.status]);
    if (q.mark) p.push('標記' + q.mark);
    return p.join('・');
  },
  // 圖鑑：物種是否符合（名稱只比對看過的寶可夢，避免洩漏未發現的名稱）
  matchSpecies(id, q) {
    const s = POKEDEX[id], st = G.state;
    if (q.status === 'caught' && !st.caught[id]) return false;
    if (q.status === 'uncaught' && st.caught[id]) return false;
    if (q.status === 'seen' && (!st.seen[id] || st.caught[id])) return false;
    if (q.gen && s.g !== q.gen) return false;
    if ((q.type || q.text) && !st.seen[id]) return false;
    if (q.type && !s.t.includes(q.type)) return false;
    if (q.text && !(s.n.includes(q.text) || String(id) === q.text.replace(/^0+/, ''))) return false;
    return true;
  },
  // 箱子：個體是否符合
  matchMon(m, q) {
    const s = POKEDEX[m.sp];
    if (q.gen && s.g !== q.gen) return false;
    if (q.type && !Mon.types(m).includes(q.type)) return false;
    if (q.text && !(Mon.name(m).includes(q.text) || s.n.includes(q.text))) return false;
    if (q.mark && !(m.marks || []).includes(q.mark)) return false;
    return true;
  },
  // 設定搜尋條件（回傳新的條件）
  async menu(q, { box = false } = {}) {
    q = { ...q };
    while (true) {
      const opts = [
        `名稱：${q.text || '（全部）'}`,
        `屬性：${q.type ? TYPES[q.type].n : '（全部）'}`,
        `地區：${q.gen ? Object.values(REGIONS).find(r => r.gen === q.gen).n : '（全部）'}`,
        box ? `標記：${q.mark || '（全部）'}` : `狀態：${{ all: '（全部）', caught: '已捕捉', uncaught: '未捕捉', seen: '看過但未捕捉' }[q.status]}`,
        '清除條件', '完成',
      ];
      const c = await UI.choose(opts, { prompt: '搜尋條件' });
      if (c < 0 || c === 5) return q;
      if (c === 0) { const t = await UI.input('要搜尋的名稱（或編號）：', q.text, { cancel: true }); if (t !== null) q.text = t.trim(); }
      if (c === 1) {
        const types = Object.keys(TYPES).filter(t => t !== 'unknown' && t !== 'shadow' && t !== 'stellar');
        const i = await UI.list({ title: '屬性', rows: ['（全部）', ...types.map(t => typeTag(t))] });
        if (i >= 0) q.type = i === 0 ? null : types[i - 1];
      }
      if (c === 2) {
        const keys = Object.keys(REGIONS);
        const i = await UI.list({ title: '地區', rows: ['（全部）', ...keys.map(k => `${REGIONS[k].n}地區（第 ${REGIONS[k].gen} 世代）`)] });
        if (i >= 0) q.gen = i === 0 ? null : REGIONS[keys[i - 1]].gen;
      }
      if (c === 3) {
        if (box) {
          const i = await UI.choose(['（全部）', ...MARKS], { prompt: '標記', cols: 4 });
          if (i >= 0) q.mark = i === 0 ? null : MARKS[i - 1];
        } else {
          const list = ['all', 'caught', 'uncaught', 'seen'];
          const i = await UI.choose(['（全部）', '已捕捉', '未捕捉', '看過但未捕捉'], { prompt: '捕捉狀態' });
          if (i >= 0) q.status = list[i];
        }
      }
      if (c === 4) q = Search.empty();
    }
  },
};

export { MARKS, Search };
