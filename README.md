# Pokémon THE WORLD — 寶可夢開放世界（非營利同人研究作品）

參考《寶可夢 綠寶石》的玩法與畫面製作的網頁版開放世界寶可夢遊戲。九大地區依照寶可夢世界全圖的相對位置連在同一張地圖上，全部 1025 種寶可夢都能在野外遇到；對戰以最新世代（朱／紫）的規則為準，回合處理參考 Pokémon Showdown。

開發紀錄見 [DEVLOG.md](DEVLOG.md)，待辦與規劃見 [PROGRESS.md](PROGRESS.md)。

## 開始遊玩

用瀏覽器（Chrome / Edge）直接開啟 `index.html`。寶可夢圖像從 PokéAPI 的公開圖庫線上載入，需要網路連線。

| 按鍵 | 功能 |
|---|---|
| 方向鍵 / WASD | 移動、選擇 |
| Shift | 跑步 |
| Z / Enter | 確定、調查、對話（面向告示牌、隱藏道具、人物） |
| X / Esc | 選單／返回 |
| 按住 Space | 二倍速（移動、文字、戰鬥動畫） |
| M | 世界地圖（隊伍有飛行屬性時，方向鍵選去過的城鎮、Z 或點選後確認飛翔） |
| F3 | 顯示 FPS、世界生成耗時、錯誤數 |
| 戰鬥中 R / M / E / G | 太晶化／超級進化（究極爆發）／Z 招式／極巨化（招式選單上方的「特殊能力列」會顯示能不能用與原因） |

手機、平板：直向時下方是十字鍵、A／B、SELECT（地圖）、START（選單）與 ▶▶（按住二倍速）；橫向時按鍵半透明疊在畫面兩側。

### 使用綠寶石原版素材（本機）

圖塊、建築、室內地圖、角色、戰鬥介面、選單、音效與 MIDI 音樂取自 [pret/pokeemerald](https://github.com/pret/pokeemerald)，需要在本機建置一次（`assets/gen3/` 不會推上 GitHub）：

```
git clone --depth 1 https://github.com/pret/pokeemerald .cache/pokeemerald
python tools/build_assets.py
```

沒有建置時使用內建的原創像素圖與晶片音樂，建築進門後改用對話選單。把標題標誌的圖檔存成 `assets/title_logo.png`，標題畫面會直接使用它。

## 遊戲內容

### 世界
- **九大地區**：關都、城都、豐緣、神奧、合眾、卡洛斯、阿羅拉、伽勒爾、帕底亞，各自從原作的出發城鎮與御三家開始。960×600 格的大地圖，每個地區 10 座城鎮（家鄉、8 座道館、聯盟），以道路和跨海大橋相連；離家越遠越強。
- **關都的手工城鎮**：真新鎮與 8 座道館城鎮有各自的配置、告示牌與小屋事件（奈奈美、姓名鑑定師、博物館、化石復活、遊戲內交換、發燒友俱樂部、玉虹公寓的伊布、招式回憶處與遺忘爺爺、格鬥道場……）。
- **室內地圖**：寶可夢中心、友好商店、主角家、研究所與道館都能走進去（綠寶石原作地圖）；道館依館主屬性選用地圖，有道館訓練家與嚮導。
- **各地區的進度結構**：關都的火箭隊、合眾的等離子隊（Ｎ、魁奇思）、卡洛斯的閃焰隊、阿羅拉的島巡禮試煉（霸主寶可夢）、伽勒爾的冠軍盃、帕底亞的三條主線（道館、寶主寶可夢、天星隊）。
- **對戰塔**：成為冠軍後，在各地區聯盟旁用 3 隻 Lv.50 的寶可夢連戰 7 位訓練家，累積連勝與 BP 兌換道具；館主與冠軍也可以重賽。
- **探索**：天氣（下雨、下雪、大晴天、起霧、沙暴，影響遭遇並帶進對戰）、每個地區 16 個隱藏道具、推石頭的洞窟解謎（月見山、燈火山、華藍洞窟）、古代石板、火箭隊基地、寶可夢塔、卡比獸。
- **野生寶可夢**：依棲息地、屬性、晝夜出現，在地圖上看得到；依物種有不同習性（悠閒、好奇、膽小、兇猛、成群、夜行、定點）。傳說與幻之寶可夢在世界上各只有一隻，捕捉或打倒後就會消失。

### 對戰
- 最新世代的數值與公式：物理／特殊、屬性相剋、會心、能力等級、異常狀態、天氣、場地、牆壁、陷阱、替身等。特性與持有道具依 Showdown 實作。
- 太晶化、超級進化、原始回歸、Z 招式、究極爆發、極巨化／超極巨化、太晶團體戰、雙打。
- 訓練家 AI 三層：一般訓練家估算傷害；館主會換人、看時機用異常狀態與天氣；四天王與冠軍會預測、強化與太晶化。

### 成長與系統
- 個體值、努力值、性格、薄荷、極限特訓、經驗值曲線、學習裝置（一開始就有，可以開關）、升級學招式、各種進化方式、地區形態與形態變化、合體。
- 招式學習器製作、野餐與培育（蛋）、圖鑑（搜尋、分布、習性）、訓練家卡片、綠寶石樣式的隊伍／能力／背包／友好商店／電腦箱子（2D 游標、分箱、桌布）／地圖。
- 存檔：自動存檔與備份、匯出／匯入、存檔格式版本與遷移；遊玩紀錄（錯誤、FPS、耗時）可在設定中查看與下載。

## 測試

- `tests/engine_test.html`：引擎與系統的回歸測試（對戰機制、存檔、世界生成、城鎮、室內、洞窟解謎、AI、遊玩節奏……）。用瀏覽器開啟即可。
- `tests/playthrough.html`：自動遊玩機器人從新遊戲打到關都冠軍，記錄每段的練等場數與失敗次數；`?seed=數字` 可以固定世界重現。
- `tools/check_caves.py`：確認每個推石頭的洞窟都解得開。

## 資料與參考

- 寶可夢、招式資料：[PokéAPI](https://pokeapi.co/docs/v2)（`tools/fetch_data.py`）；對戰資料與回合處理：[Pokémon Showdown](https://github.com/smogon/pokemon-showdown)（`tools/fetch_showdown.py`）。
- 中文譯名：[神奇寶貝百科](https://wiki.52poke.com/)、[寶可夢官方圖鑑](https://tw.portal-pokemon.com/play/pokedex/)。
- 對戰機制：[Smogon 朱紫對戰機制研究](https://www.smogon.com/forums/threads/scarlet-violet-battle-mechanics-research.3709545/)、[Bulbapedia](https://bulbapedia.bulbagarden.net/)、[Serebii](https://www.serebii.net/pokemon/)。
- 畫面、地圖、流程：[pokeemerald](https://github.com/pret/pokeemerald)。道具圖示另參考 Showdown、PokéAPI、[pokesprite](https://github.com/msikma/pokesprite)、Serebii。

## 檔案結構

```
index.html            入口
css/                  介面樣式（style、menus、summary、storage）
data/                 自動產生的資料（寶可夢、招式、道具、形態、招式學習器、Z 招式……）與 towns.js（關都城鎮配置）
js/util.js            亂數、雜訊        js/telemetry.js  遊玩紀錄
js/data.js            屬性、道具、地區、館主
js/mon.js             能力值、經驗值、進化          js/forms.js      形態
js/world.js           地圖生成、城鎮、訓練家、繪製  js/ecology.js    野生寶可夢生態
js/weather.js         天氣              js/hidden.js     隱藏道具
js/overworld_mons.js  地圖上的野生寶可夢與習性
js/story.js、events.js、regions.js、regions2.js、town_events.js   劇情、支線、各地區內容、城鎮事件
js/interior.js        室內地圖、洞窟解謎、寶可夢中心的治療機器
js/fieldmove.js       秘傳招式的演出（衝浪、飛翔、怪力）
js/ui.js、menus.js、bagui.js、shopui.js、storageui.js、summaryui.js、mapui.js   介面
js/battle.js、engine.js、battle_view.js、move_anims.js   對戰
js/ai.js              訓練家 AI
js/battletower.js     對戰塔
js/mega.js、zmove.js、late.js、doubles.js、picnic.js、tm.js   特殊能力、雙打、野餐、招式學習器
js/gen3.js、sprites.js、audio.js   綠寶石素材、原創像素圖、音樂與音效
js/game.js            主程式、選單、存檔
tools/                資料下載與素材建置
tests/                回歸測試與自動遊玩
```

## 版權聲明

本專案為非營利的同人研究作品。寶可夢相關名稱、圖像與設定的版權屬於任天堂、Creatures Inc.、GAME FREAK inc. 與 The Pokémon Company。原版素材只在本機建置使用，不包含在此儲存庫中。
