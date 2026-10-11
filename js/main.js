// 進入點（Vite 打包的起點）：依原本 index.html 的順序載入資料與各個模組（由 tools/esm_convert.cjs 產生）
// 每個模組的 export 也放到 window 上：測試頁、開發者工具仍然可以直接用 Game、Battle、G 等名稱
import '../data/pokedex.js';
import '../data/moves.js';
import '../data/showdown.js';
import '../data/items.js';
import '../data/abilities.js';
import '../data/tms.js';
import '../data/forms.js';
import '../data/late.js';
import '../data/zmoves.js';
import '../data/sd_anims.js'; // Showdown 的 Z 招式動畫（tools/fetch_showdown_anims.mjs）
import '../data/breeding.js';
import '../data/towns.js';
import * as core from './core.js';
import * as m0 from './util.js';
import * as m1 from './telemetry.js';
import * as m2 from './data.js';
import * as m3 from './abilities.js';
import * as m4 from './mon.js';
import * as m5 from './forms.js';
import * as m6 from './tm.js';
import * as m7 from './movedata.js';
import * as m8 from './gen3.js';
import * as m9 from './sprites.js';
import * as m10 from './audio.js';
import * as m11 from './world.js';
import * as m12 from './ecology.js';
import * as m13 from './overworld_mons.js';
import * as m14 from './story.js';
import * as m15 from './events.js';
import * as m16 from './regions.js';
import * as m17 from './regions2.js';
import * as johto from './johto.js'; // 城都的地標、支線、勁敵、任務線
import * as sdanim from './sd_anim.js'; // Showdown 動畫的執行（Z 招式）
import * as m18 from './battletower.js';
import * as m19 from './town_events.js';
import * as m20 from './weather.js';
import * as m21 from './hidden.js';
import * as m22 from './ui.js';
import * as m23 from './search.js';
import * as m24 from './bagui.js';
import * as m25 from './menus.js';
import * as m26 from './emerald_ui.js';
import * as m27 from './mapui.js';
import * as m28 from './summaryui.js';
import * as m29 from './storageui.js';
import * as m30 from './shopui.js';
import * as m31 from './battle.js';
import * as m32 from './engine.js';
import * as m33 from './battle_view.js';
import * as m34 from './move_anims.js';
import * as m35 from './mega.js';
import * as m36 from './zmove.js';
import * as m37 from './picnic.js';
import * as m38 from './doubles.js';
import * as m39 from './late.js';
import * as m40 from './ai.js';
import * as m41 from './fieldmove.js';
import * as m42 from './interior.js';
import * as m43 from './cloud_config.js';
import * as m44 from './cloud.js';
import * as m45 from './gist_cloud.js';
import * as m46 from './account.js';
import * as m47 from './game.js';
import * as m48 from './hud.js';

for (const m of [core, m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17, m18, m19, m20, m21, m22, m23, m24, m25, m26, m27, m28, m29, m30, m31, m32, m33, m34, m35, m36, m37, m38, m39, m40, m41, m42, m43, m44, m45, m46, m47, m48]) Object.assign(window, m);
Object.assign(window, johto, sdanim);
