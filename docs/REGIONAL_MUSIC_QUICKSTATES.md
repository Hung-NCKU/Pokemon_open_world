# 地區音樂與即時存檔

九地區音樂使用 [ENLS’s Pre-Looped Music Library](https://enls.eu/prelooped/)：關都 FRLG、城都 HGSS、豐緣 RSE、神奧 DPPt、合眾 BW、卡洛斯 XY、阿羅拉 SM、伽勒爾 SwSh、帕底亞 SV。原始音樂權利屬 Nintendo / Creatures / GAME FREAK；整理與循環標記感謝 ENLS 與該音樂庫列出的協作者。

`data/music_selection.json` 記錄每個場景的選曲。除家鄉、道路、城鎮、中心、道館、聯盟、戰鬥與勝利外，也指定可用的道館城鎮曲、神奧／阿羅拉日夜版本，以及超夢、鳳王、洛奇亞、創世神等專屬戰鬥曲。傳說之島使用 HGSS 自然公園；島上的傳說戰鬥依物種原生世代選曲。

安裝 ffmpeg／ffprobe 後執行 `python tools/build_regional_music.py`。工具下載選定曲目到 `.cache/regional-music/`，保留來源循環起訖，以 32 kHz stereo Ogg 輸出 `assets/bgm/`，並更新 Gen3 manifest。這些資源不加入 main，隨 gh-pages 發布。首頁不下載整套曲庫；只有播放時才載入音檔，Service Worker 保存壓縮檔，解碼快取有容量限制。沒有本機素材時保留既有 MIDI／晶片音樂備援。

Shift＋F1～F12 保存對應即時存檔，F1～F12 讀取。戰鬥在回合選擇行動前建立檢查點；動畫中要求存檔會等本回合結算完成。單打、雙打的隊伍、HP、PP、狀態、場地、暫時能力與游標會保存。讀取會重新載入頁面，清除舊選單與未完成的非同步流程，回到存檔場景。進行中的劇情以記錄的入口與選項重建，再接續戰鬥結果處理；重建期間不寫入普通存檔或上傳雲端。一般存檔與背景自動保存仍保留原有安全檢查，即時存檔欄位與一般存檔分開。
