// 最早載入的模組：比較早的模組在執行期才會用到、但由比較晚的模組定義的單例物件，先在這裡宣告成空物件，
// 定義它的模組再用 define() 把內容填進去（由 tools/esm_convert.cjs 產生；這樣 import 都指向比較早的模組，執行順序和原本相同）
export function define(target, src) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(src)); return target; }

export const FORM_EVO = {}; // js/forms.js
export const Forms = {}; // js/forms.js
export const Sound = {}; // js/audio.js
export const T = {}; // js/world.js
export const ELITE_FOUR = {}; // js/story.js
export const GYM_TOWNS = {}; // js/story.js
export const LANDMARKS = {}; // js/story.js
export const LEAGUE_TOWN = {}; // js/story.js
export const SIGNATURE = {}; // js/story.js
export const Story = {}; // js/story.js
export const Weather = {}; // js/weather.js
export const Hidden = {}; // js/hidden.js
export const UI = {}; // js/ui.js
export const EmeraldUI = {}; // js/emerald_ui.js
export const StorageUI = {}; // js/storageui.js
export const ShopUI = {}; // js/shopui.js
export const Mega = {}; // js/mega.js
export const ZMove = {}; // js/zmove.js
export const Picnic = {}; // js/picnic.js
export const BForm = {}; // js/late.js
export const Dmax = {}; // js/late.js
export const AI = {}; // js/ai.js
export const Interior = {}; // js/interior.js
export const Account = {}; // js/account.js
export const G = {}; // js/game.js
export const Game = {}; // js/game.js
export const SAVE_KEY = 'pkmn_openworld_save_v1'; // 原本在 js/game.js
