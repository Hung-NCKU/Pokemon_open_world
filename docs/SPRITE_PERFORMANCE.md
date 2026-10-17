# 寶可夢圖片與畫面效能

地圖寶可夢改用四方向 HGSS 風格行走精靈；第 5–9 世代使用社群延伸素材。來源為 [pokeemerald-expansion](https://github.com/rh-hideout/pokeemerald-expansion/tree/73b3fbeb574327cd9420c89e56bef5aa3c08fead/graphics/pokemon)，固定版本 `73b3fbeb574327cd9420c89e56bef5aa3c08fead`。原始寶可夢美術屬 Nintendo / Creatures / GAME FREAK；社群素材與作者名單見[來源專案 credits](https://github.com/rh-hideout/pokeemerald-expansion/blob/73b3fbeb574327cd9420c89e56bef5aa3c08fead/CREDITS.md)。

戰鬥、圖鑑與選單圖片取自 [PokéAPI sprites](https://github.com/PokeAPI/sprites)。固定版本 `289e842364648ec0495ae4ba12f48d5cbfbf670b`。保留原有綠寶石、黑白動態與後續世代圖片選擇；已建置的圖片由本站提供。未建置的特殊型態或異色仍保留原本來源作為備援。隊伍與電腦箱子的一般圖示合併為一張 1,025 種圖集。

`python tools/build_assets.py` 會完整建置；也能分別執行 `build_overworld.py`、`build_battle_sprites.py`。輸出放在忽略的 `assets/gen3/`，隨 gh-pages 發布。`manifest.js` 記錄實際可用圖片，沒有素材的開發／CI 環境繼續使用備援。

地形快取只保留目前視窗，鏡頭在同一格內移動時沿用；換世界、改地形、換動畫幀立即重繪。人物、天氣與草叢遮擋仍逐幀繪製。`tools/render_perf.mjs` 可在相同手機尺寸與 CPU 降速條件量測移動繪圖耗時；這不是整體 FPS 或所有裝置的保證。
