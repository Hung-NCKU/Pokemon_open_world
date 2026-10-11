// 綠寶石的設定畫面（option_menu.c）：前端框架 Preact 的第一個畫面（逐步把介面改成元件的起點）
// 淡紫色背景、上面的標題視窗、下面 7 列的設定視窗；↑↓ 選列、←→ 改值（選到的值是紅字）、A 執行、B 離開
// DOM 結構與 class 和原本相同（#option、.op-head、.op-win、.op-row、.sel、b、i、span.on），樣式在 css/emerald.css
import { render } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { G, Game, SAVE_KEY, Sound, UI } from '../core.js';
import { Telemetry } from '../telemetry.js';
import { U } from '../util.js';

const SPEEDS = [[40, '慢'], [22, '普通'], [0, '快']];

// 設定項目：vals（幾個選項之一）、num（0～10 的數字）、act（按 A 執行）
function settingRows(st) {
  return [
    { label: '文字速度', vals: () => SPEEDS.map(x => x[1]), cur: () => Math.max(0, SPEEDS.findIndex(x => x[0] === (st.textSpeed ?? 22))), set: i => { st.textSpeed = SPEEDS[i][0]; } },
    { label: '戰鬥訊息', vals: () => ['手動', '自動'], cur: () => (st.battleAuto ? 1 : 0), set: i => { st.battleAuto = i ? 900 : 0; } },
    { label: '音樂', num: () => st.musicVol, add: d => { st.musicVol = U.clamp(st.musicVol + d, 0, 10); Sound.applyVolume(); } },
    { label: '音效', num: () => st.sfxVol, add: d => { st.sfxVol = U.clamp(st.sfxVol + d, 0, 10); Sound.applyVolume(); Sound.sfx('select'); } },
    { label: '遊玩紀錄', act: 'log', text: () => `錯誤 ${Telemetry.errors.length} 筆` },
    { label: '回到標題畫面', act: 'title', text: () => '' },
    { label: '完成', act: 'done', text: () => '' },
  ];
}

function Row({ row, selected, onClick }) {
  let right;
  if (row.vals) { const c = row.cur(); right = row.vals().map((v, k) => <span class={k === c ? 'on' : ''}>{v}</span>); }
  else if (row.num) right = <span class="on">◀ {row.num()} ▶</span>;
  else right = <span>{row.text()}</span>;
  return <div class={'op-row' + (selected ? ' sel' : '')} onClick={onClick}><b>{row.label}</b><i>{right}</i></div>;
}

function OptionMenu({ rows, onClose, setHidden }) {
  const [sel, setSel] = useState(0);
  const [, redraw] = useState(0); // 設定值存在 G.settings（元件外），改了之後重畫
  const busy = useRef(false);
  const refresh = () => redraw(n => n + 1);

  const change = (i, d) => {
    const r = rows[i];
    if (r.vals) { const n = r.vals().length; r.set((r.cur() + d + n) % n); Sound.sfx('select'); }
    else if (r.add) r.add(d);
    refresh();
  };
  const activate = async i => {
    const r = rows[i];
    if (!r.act) return change(i, 1);
    Sound.sfx('select');
    if (r.act === 'done') return onClose(null);
    if (busy.current) return;
    busy.current = true; setHidden(true);
    try {
      if (r.act === 'log') await Game.logMenu();
      if (r.act === 'title') {
        const c = await UI.choose(['記錄後回去', '不記錄直接回去', '取消'], { prompt: '要回到標題畫面嗎？' });
        UI.hideDialog();
        if (c === 0 || c === 1) { if (c === 0) Game.save(true); onClose('title'); Game.toTitle(); return; }
      }
    } finally { busy.current = false; setHidden(false); UI.hideDialog(); }
    refresh();
  };

  // 鍵盤：用 UI.pushKey 接手按鍵（和其他綠寶石畫面相同），卸載時還原
  // useLayoutEffect 在 render() 裡同步執行：打開畫面後馬上按的鍵也收得到（useEffect 要等到下一次繪製）
  const state = useRef();
  state.current = { sel, change, activate };
  useLayoutEffect(() => UI.pushKey(e => {
    if (busy.current) return;
    const { sel, change, activate } = state.current, k = e.key, n = rows.length;
    if (k === 'ArrowUp' || k === 'w') setSel((sel + n - 1) % n);
    else if (k === 'ArrowDown' || k === 's') setSel((sel + 1) % n);
    else if (k === 'ArrowLeft' || k === 'a') change(sel, -1);
    else if (k === 'ArrowRight' || k === 'd') change(sel, 1);
    else if (UI.isOk(e)) { if (!e.repeat) activate(sel); }
    else if (UI.isNo(e)) { if (!e.repeat) { Sound.sfx('select'); onClose(null); } }
  }), []);

  return <>
    <div class="op-head">設定</div>
    <div class="op-win">
      {rows.map((r, i) => <Row row={r} selected={i === sel} onClick={() => (i === sel ? activate(i) : setSel(i))} />)}
    </div>
  </>;
}

// 打開設定畫面；關閉時回傳 null，選「回到標題畫面」時回傳 'title'
export function openOptionMenu() {
  const st = G.settings;
  if (st.musicVol === undefined) st.musicVol = st.music === false ? 0 : 7;
  if (st.sfxVol === undefined) st.sfxVol = st.sfx === false ? 0 : 7;
  const root = document.createElement('div');
  root.id = 'option';
  document.getElementById('game').appendChild(root);
  return new Promise(res => {
    const onClose = v => {
      render(null, root); // 卸載元件（也會還原按鍵處理）
      root.remove();
      try { localStorage.setItem(SAVE_KEY + '_settings', JSON.stringify(st)); } catch { }
      res(v);
    };
    const setHidden = h => root.classList.toggle('hidden', h);
    render(<OptionMenu rows={settingRows(st)} onClose={onClose} setHidden={setHidden} />, root);
  });
}
