// 產生「已知還沒完成」清單（docs/UNSUPPORTED.md）：tools/unsupported.sh 用無頭瀏覽器載入遊戲，執行這個檔案後把 #out 的內容存成檔案
// 招式的支援狀態由戰鬥引擎的 classify() 判定（js/engine.js）：full 完整、partial 部分效果未實作、none 未支援（AI 不會使用）
// 特性：js/abilities.js 的 AB_IMPL 有實作的才算支援
(() => {
  Game.title = async () => { };
  window.addEventListener('load', () => setTimeout(() => {
    const ids = Object.keys(MOVES).map(Number).filter(id => SHOWDOWN.moves[id] || MOVES[id]).sort((a, b) => a - b);
    const by = { full: [], partial: [], none: [] };
    for (const id of ids) by[md(id).support].push(id);
    // 學得到這個招式的寶可夢數（升級、招式學習器）
    const learners = {};
    for (const [sp, p] of Object.entries(POKEDEX)) for (const [, mid] of p.l || []) (learners[mid] = learners[mid] || new Set()).add(+sp);
    const row = id => {
      const m = md(id), n = learners[id] ? learners[id].size : 0;
      return `| ${id} | ${m.n} | ${m.id} | ${(TYPES[m.type] || {}).n || m.type} | ${{ Physical: '物理', Special: '特殊', Status: '變化' }[m.cat] || ''} | ${n} |`;
    };
    const abil = Object.keys(window.ABILITIES || {}).filter(k => !Abil.supported(k)).sort();
    const abilUsed = k => Object.values(POKEDEX).filter(p => (p.ab || []).some(([a]) => a === k)).length;
    const total = ids.length;
    const md_ = [
      '# 已知還沒完成的招式與特性',
      '',
      `由 \`tools/unsupported.sh\` 依戰鬥引擎目前的判定自動產生（${new Date().toISOString().slice(0, 10)}），不要手動修改。`,
      '',
      `- 招式共 ${total} 個：完整 ${by.full.length}、部分效果未實作 ${by.partial.length}、未支援 ${by.none.length}。`,
      `- 特性共 ${Object.keys(window.ABILITIES || {}).length} 個：效果未實作 ${abil.length} 個。`,
      '- 遊戲中招式名稱後面的「＊」是部分效果未實作、「✕」是未支援（使用時沒有效果，AI 不會選）；特性在能力頁標示「效果未實作」。',
      '- 這份清單是「已經知道還沒做」的範圍，不算錯誤回報；測試全部通過也不代表這些機制已經支援。',
      '',
      `## 未支援的招式（${by.none.length}）`,
      '',
      '| 編號 | 名稱 | Showdown ID | 屬性 | 分類 | 學得到的寶可夢 |',
      '|---|---|---|---|---|---|',
      ...by.none.map(row),
      '',
      `## 部分效果未實作的招式（${by.partial.length}）`,
      '',
      '傷害或主要效果有作用，但附帶的某個效果（例如特殊的場地狀態、交換位置、指定隊友）還沒做。',
      '',
      '| 編號 | 名稱 | Showdown ID | 屬性 | 分類 | 學得到的寶可夢 |',
      '|---|---|---|---|---|---|',
      ...by.partial.map(row),
      '',
      `## 效果未實作的特性（${abil.length}）`,
      '',
      '| 特性 | 名稱 | 擁有這個特性的寶可夢 |',
      '|---|---|---|',
      ...abil.map(k => `| ${k} | ${Abil.name(k)} | ${abilUsed(k)} |`),
      '',
    ].join('\n');
    const out = document.createElement('pre');
    out.id = 'out';
    out.textContent = md_;
    document.body.appendChild(out);
    document.title = 'DONE';
  }, 300));
})();
