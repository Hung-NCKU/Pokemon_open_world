# 開發進度與待辦

接手時請先讀這份檔案。每完成一項就更新並推上 GitHub。

## 已完成

- 九大地區開放世界（依寶可夢世界全圖配置）、全 1025 種寶可夢、道館與聯盟
- PokéAPI 資料（`tools/fetch_data.py` → `data/*.js`）
- 綠寶石素材管線：`tools/build_assets.py` 從 pret/pokeemerald 產生 `assets/gen3/`
  - 從真實地圖學習地形邊緣自動拼接（道路、水面、沙灘、沙漠、岩山）
  - 建築直接裁切自古金鎮、未白鎮、橙華市、彩幽市
  - 主角、訓練家走路圖，衝浪
  - 戰鬥背景、血條框、文字框、精靈球、招式特效圖、文字視窗
  - 36 首 MIDI（`js/gen3.js` 的 MIDI 播放器，支援 `[` `]` 循環標記）
- 畫面改為 720×480（GBA 240×160 的 3 倍），俐方體 11 號像素字型
- 戰鬥畫面：`js/battle_view.js`（訓練家滑入、丟球放出、招式特效、捕捉流程、叫聲、倒下沉入台座）
- 對話依 2 行分頁

## 待辦（依優先順序）

1. ~~戰鬥引擎改寫~~（完成：`js/engine.js`，參考 Showdown 回合處理；`tools/fetch_showdown.py` → `data/showdown.js`）
   - 已修正：近身戰／過熱、點到為止、自爆、雙倍奉還類、條件威力招式、蓄力與硬直
   - 支援狀態：完整 638、部分 34、未支援 19（戰鬥選單以＊／✕標示，AI 不使用未支援招式）
   - 回歸測試：`tests/engine_test.html`（用瀏覽器開啟，20 項全過）
   - 尚待：學習招式介面也顯示支援狀態；特性與道具相關招式（變身、戲法等）
2. **EV 與進化**
   - EV 改用 PokéAPI `stats[].effort`；增量受單項 252 與總量 510 的剩餘空間限制（目前 509 + 2 會變 511）
   - 能力頁顯示 EV
   - 進化條件完整保留（多組條件、性別、已學招式、招式屬性等），不要隨機挑選候選
   - 改編條件（連接繩等）在圖鑑明確標示
3. 特性、持有道具
4. 等級帶（野外固定區域等級、道館依徽章數切換隊伍、通關後重賽）
5. 關都手工城鎮、地標、招牌館主隊伍、短任務線；傳說寶可夢改由事件取得
6. 其他地區比照擴展

## 開發備忘

- Windows 環境；Python 用 `C:\Users\ChihChien\AppData\Local\Python\pythoncore-3.14-64\python.exe`（`python` 指令別名不穩定）
- 自動測試：用 Chrome headless 載入測試頁（`--allow-file-access-from-files --virtual-time-budget`），測試頁可設 `window.GEN3_BASE` 指定素材路徑
- `assets/gen3/`、`.cache/` 不推上公開儲存庫（官方素材，僅限本機）
