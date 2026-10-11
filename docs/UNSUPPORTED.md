# 已知還沒完成的招式與特性

由 `tools/unsupported.sh` 依戰鬥引擎目前的判定自動產生（2026-10-11），不要手動修改。

- 招式共 691 個：完整 638、部分效果未實作 34、未支援 19。
- 特性共 284 個：效果未實作 71 個。
- 遊戲中招式名稱後面的「＊」是部分效果未實作、「✕」是未支援（使用時沒有效果，AI 不會選）；特性在能力頁標示「效果未實作」。
- 這份清單是「已經知道還沒做」的範圍，不算錯誤回報；測試全部通過也不代表這些機制已經支援。

## 未支援的招式（19）

| 編號 | 名稱 | Showdown ID | 屬性 | 分類 | 學得到的寶可夢 |
|---|---|---|---|---|---|
| 102 | 模仿 | mimic | 一般 | 變化 | 10 |
| 117 | 忍耐 | bide | 一般 | 物理 | 2 |
| 144 | 變身 | transform | 一般 | 變化 | 2 |
| 166 | 寫生 | sketch | 一般 | 變化 | 1 |
| 176 | 紋理２ | conversion2 | 一般 | 變化 | 3 |
| 271 | 戲法 | trick | 超能力 | 變化 | 8 |
| 272 | 扮演 | roleplay | 超能力 | 變化 | 14 |
| 277 | 魔法反射 | magiccoat | 超能力 | 變化 | 5 |
| 285 | 特性互換 | skillswap | 超能力 | 變化 | 12 |
| 379 | 力量戲法 | powertrick | 超能力 | 變化 | 8 |
| 380 | 胃液 | gastroacid | 毒 | 變化 | 24 |
| 388 | 煩惱種子 | worryseed | 草 | 變化 | 22 |
| 415 | 掉包 | switcheroo | 惡 | 變化 | 15 |
| 470 | 防守平分 | guardsplit | 超能力 | 變化 | 15 |
| 471 | 力量平分 | powersplit | 超能力 | 變化 | 12 |
| 493 | 單純光束 | simplebeam | 一般 | 變化 | 5 |
| 494 | 找夥伴 | entrainment | 一般 | 變化 | 20 |
| 863 | 復生祈禱 | revivalblessing | 一般 | 變化 | 2 |
| 867 | 描繪 | doodle | 一般 | 變化 | 1 |

## 部分效果未實作的招式（34）

傷害或主要效果有作用，但附帶的某個效果（例如特殊的場地狀態、交換位置、指定隊友）還沒做。

| 編號 | 名稱 | Showdown ID | 屬性 | 分類 | 學得到的寶可夢 |
|---|---|---|---|---|---|
| 253 | 吵鬧 | uproar | 一般 | 特殊 | 45 |
| 254 | 蓄力 | stockpile | 一般 | 變化 | 26 |
| 255 | 噴出 | spitup | 一般 | 特殊 | 21 |
| 256 | 吞下 | swallow | 一般 | 變化 | 24 |
| 259 | 無理取鬧 | torment | 惡 | 變化 | 30 |
| 266 | 看我嘛 | followme | 一般 | 變化 | 8 |
| 270 | 幫助 | helpinghand | 一般 | 變化 | 78 |
| 278 | 回收利用 | recycle | 一般 | 變化 | 18 |
| 286 | 封印 | imprison | 超能力 | 變化 | 33 |
| 288 | 怨念 | grudge | 幽靈 | 變化 | 4 |
| 346 | 玩水 | watersport | 水 | 變化 | 1 |
| 361 | 治癒之願 | healingwish | 超能力 | 變化 | 19 |
| 461 | 新月舞 | lunardance | 超能力 | 變化 | 1 |
| 469 | 廣域防守 | wideguard | 岩石 | 變化 | 32 |
| 472 | 奇妙空間 | wonderroom | 超能力 | 變化 | 12 |
| 476 | 憤怒粉 | ragepowder | 蟲 | 變化 | 9 |
| 478 | 魔法空間 | magicroom | 超能力 | 變化 | 7 |
| 495 | 您先請 | afteryou | 一般 | 變化 | 17 |
| 501 | 快速防守 | quickguard | 格鬥 | 變化 | 33 |
| 502 | 交換場地 | allyswitch | 超能力 | 變化 | 13 |
| 511 | 延後 | quash | 惡 | 變化 | 4 |
| 563 | 耕地 | rototiller | 地面 | 變化 | 1 |
| 578 | 戲法防守 | craftyshield | 妖精 | 變化 | 3 |
| 579 | 鮮花防守 | flowershield | 妖精 | 變化 | 1 |
| 582 | 輸電 | electrify | 電 | 變化 | 3 |
| 587 | 妖精之鎖 | fairylock | 妖精 | 變化 | 1 |
| 602 | 磁場操控 | magneticflux | 電 | 變化 | 8 |
| 674 | 輔助齒輪 | gearup | 鋼 | 變化 | 1 |
| 689 | 號令 | instruct | 超能力 | 變化 | 1 |
| 747 | 大快朵頤 | stuffcheeks | 一般 | 變化 | 2 |
| 750 | 魔法粉 | magicpowder | 超能力 | 變化 | 1 |
| 752 | 茶會 | teatime | 一般 | 變化 | 1 |
| 756 | 換場 | courtchange | 一般 | 變化 | 1 |
| 862 | 巨劍突擊 | glaiverush | 龍 | 物理 | 1 |

## 效果未實作的特性（71）

| 特性 | 名稱 | 擁有這個特性的寶可夢 |
|---|---|---|
| armor-tail | 尾甲 | 1 |
| aura-break | 氣場破壞 | 1 |
| bad-dreams | 夢魘 | 1 |
| beads-of-ruin | 災禍之玉 | 1 |
| color-change | 變色 | 1 |
| corrosion | 腐蝕 | 4 |
| cotton-down | 棉絮 | 2 |
| cud-chew | 反芻 | 1 |
| dancer | 舞者 | 1 |
| dark-aura | 暗黑氣場 | 1 |
| dauntless-shield | 不屈之盾 | 1 |
| dazzling | 鮮艷之軀 | 1 |
| disguise | 畫皮 | 1 |
| electromorphosis | 電力轉換 | 1 |
| emergency-exit | 危險迴避 | 1 |
| fairy-aura | 妖精氣場 | 1 |
| flower-veil | 花幕 | 4 |
| forecast | 陰晴不定 | 1 |
| gluttony | 貪吃鬼 | 27 |
| good-as-gold | 黃金之軀 | 1 |
| guard-dog | 看門犬 | 2 |
| gulp-missile | 一口飛彈 | 1 |
| hospitality | 款待 | 2 |
| hunger-switch | 飽了又餓 | 1 |
| ice-face | 結凍頭 | 1 |
| illusion | 幻覺 | 2 |
| imposter | 變身者 | 1 |
| innards-out | 飛出的內在物 | 1 |
| intrepid-sword | 不撓之劍 | 1 |
| lingering-aroma | 甩不掉的氣味 | 1 |
| liquid-voice | 濕潤之聲 | 3 |
| magician | 魔術師 | 5 |
| merciless | 不仁不義 | 2 |
| mirror-armor | 鏡甲 | 1 |
| multitype | 多屬性 | 1 |
| mummy | 木乃伊 | 2 |
| mycelium-might | 菌絲之力 | 2 |
| neutralizing-gas | 化學變化氣體 | 2 |
| opportunist | 跟風 | 1 |
| perish-body | 滅亡之軀 | 1 |
| pickpocket | 順手牽羊 | 14 |
| poison-puppeteer | 毒傀儡 | 1 |
| propeller-tail | 螺旋尾鰭 | 2 |
| queenly-majesty | 女王的威嚴 | 1 |
| ripen | 熟成 | 3 |
| rks-system | ＡＲ系統 | 1 |
| sand-spit | 吐沙 | 2 |
| schooling | 魚群 | 1 |
| screen-cleaner | 除障 | 1 |
| seed-sower | 掉出種子 | 1 |
| shields-down | 界限盾殼 | 1 |
| slow-start | 慢啟動 | 2 |
| stalwart | 堅毅 | 2 |
| stance-change | 戰鬥切換 | 1 |
| steam-engine | 蒸汽機 | 3 |
| supersweet-syrup | 甘露之蜜 | 2 |
| sword-of-ruin | 災禍之劍 | 1 |
| tablets-of-ruin | 災禍之簡 | 1 |
| tera-shift | 太晶變形 | 1 |
| toxic-chain | 毒鎖鏈 | 3 |
| toxic-debris | 毒滿地 | 2 |
| truant | 懶惰 | 3 |
| unnerve | 緊張感 | 25 |
| unseen-fist | 無形拳 | 1 |
| vessel-of-ruin | 災禍之鼎 | 1 |
| wandering-spirit | 遊魂 | 1 |
| water-compaction | 遇水凝固 | 2 |
| wimp-out | 躍躍欲逃 | 1 |
| wind-power | 風力發電 | 2 |
| zen-mode | 達摩模式 | 1 |
| zero-to-hero | 全能變身 | 1 |
