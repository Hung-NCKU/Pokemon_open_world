# 寶可夢 開放世界（非營利同人研究作品）

參考《寶可夢 綠寶石》玩法製作的網頁版開放世界寶可夢遊戲。九大地區依照寶可夢世界全圖的相對位置連在同一張地圖上，全部 1025 種寶可夢都能在野外遇到。

## 開始遊玩

直接用瀏覽器（Chrome / Edge）開啟 `index.html` 即可。寶可夢圖像從 PokéAPI 的公開圖庫線上載入，需要網路連線。

| 按鍵 | 功能 |
|---|---|
| 方向鍵 / WASD | 移動 |
| Shift | 跑步 |
| Z / Enter / 空白 | 確定、調查、對話 |
| X / Esc | 選單 / 返回 |
| M | 世界地圖（隊伍有飛行屬性時按 F 飛翔） |

### 使用綠寶石原版素材（本機）

圖塊、角色、戰鬥介面、MIDI 音樂取自 [pret/pokeemerald](https://github.com/pret/pokeemerald)，需要在本機建置一次（不會推上 GitHub）：

```
git clone --depth 1 https://github.com/pret/pokeemerald .cache/pokeemerald
python tools/build_assets.py
```

完成後會產生 `assets/gen3/`，遊戲會自動改用綠寶石的畫面與音樂；沒有建置時使用內建的原創像素圖與晶片音樂。

## 遊戲內容

- **選擇出發地區**：關都、城都、豐緣、神奧、合眾、卡洛斯、阿羅拉、伽勒爾、帕底亞，各自從原作的出發城鎮開始，並選擇該地區的御三家。
- **開放世界**：960×600 格的大地圖，九個地區各有 10 座城鎮（家鄉、8 座道館、寶可夢聯盟），以道路和跨海大橋相連。離出發點越遠，野生寶可夢與訓練家越強。
- **全 1025 種寶可夢**：依棲息地（草叢、水面、岩地、雪原、沙漠）與屬性出現。該地區世代的寶可夢較常見，其他地區的也會出現；夜晚幽靈／惡屬性較多；傳說／幻之寶可夢在 Lv.35 以上的地區有極低機率出現。進化型會在合理的等級才出現。
- **72 位道館館主 + 9 位冠軍**：使用原作館主名稱與擅長屬性，收集該地區 8 枚徽章後可挑戰聯盟。
- **對戰**：以最新世代（朱／紫）的數值與公式為主，包括物理／特殊分類、第六世代以後的屬性相剋表、會心一擊 1.5 倍、能力等級、異常狀態（麻痺、睡眠、冰凍、灼傷、中毒、劇毒）、混亂、畏縮、寄生種子、束縛、吸血與反作用力、多段攻擊、一擊必殺等。
- **成長**：個體值、努力值、性格、六種經驗值曲線、學習裝置（未上場者也得一半經驗）、升級學招式（招式表以各寶可夢最新登場的版本為準）、等級／道具／親密度／晝夜進化（通訊進化改用「連接繩」）。
- **系統**：寶可夢中心、友好商店、電腦寄放系統、圖鑑、訓練家卡片、衝浪（隊伍有水屬性寶可夢時可在水上移動）、飛翔、除蟲噴霧、自動存檔（瀏覽器 localStorage）。

## 資料與參考

- 寶可夢、招式資料：[PokéAPI](https://pokeapi.co/docs/v2)，用 `tools/fetch_data.py` 下載後轉成 `data/*.js`。要重新產生資料可執行：
  ```
  python tools/fetch_data.py
  ```
- 中文譯名（館主、冠軍、博士、城鎮）：[神奇寶貝百科](https://wiki.52poke.com/)、[寶可夢官方圖鑑](https://tw.portal-pokemon.com/play/pokedex/)
- 對戰公式：參考 [Pokémon Showdown](https://github.com/smogon/pokemon-showdown)、[Smogon 朱紫對戰機制研究](https://www.smogon.com/forums/threads/scarlet-violet-battle-mechanics-research.3709545/)、[Bulbapedia](https://bulbapedia.bulbagarden.net/)、[Serebii](https://www.serebii.net/pokemon/)
- 遊戲流程（戰鬥後才進化、學習招式流程等）：參考 [pokeemerald](https://github.com/pret/pokeemerald)
- 世界配置：寶可夢世界全圖（同人地圖）

## 檔案結構

```
index.html          入口
css/style.css       介面樣式
data/pokedex.js     1025 種寶可夢資料（自動產生）
data/moves.js       招式資料（自動產生）
js/util.js          亂數、雜訊
js/data.js          屬性相剋、道具、地區、館主
js/mon.js           能力值、經驗值、進化
js/world.js         地圖生成、城鎮、訓練家、野生寶可夢、繪製
js/ui.js            對話框與選單
js/battle.js        戰鬥系統
js/game.js          主程式、選單、存檔
tools/fetch_data.py 資料下載腳本
```

## 尚未實作（簡化之處）

特性、持有道具、天氣與場地、雙打、性別，以及部分特殊招式（守住、替身等），使用這些招式時會顯示「但是什麼事都沒有發生」。建築物沒有室內地圖，進門後直接以對話選單處理。

## 版權聲明

本專案為非營利的同人研究作品。寶可夢相關名稱、圖像與設定的版權屬於任天堂、Creatures Inc.、GAME FREAK inc. 與 The Pokémon Company。
