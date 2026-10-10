// 雲端帳號與存檔（跨平台：本機 file:// 與線上版共用同一個帳號與存檔）
// 設定方式見 docs/CLOUD_SETUP.md。兩個值都留空時，帳號只存在這台裝置的瀏覽器（離線模式）。
// anonKey 是 Supabase 的「公開金鑰」，本來就設計給網頁使用；資料的保護靠資料表的 Row Level Security（每個人只能讀寫自己的存檔）。
window.CLOUD_CONFIG = {
  url: 'https://gggscgdqlfafiamdnklx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZ3NjZ2RxbGZhZmlhbWRua2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTMzMjMsImV4cCI6MjEwNzIyOTMyM30.lFUlBSLydU4CMQQFs-fIPqEiFoT0acln5ouvglV4H3c', // anon public（公開金鑰）
  github: false, // true：帳號選單多一個「用 GitHub 同步存檔」（每個玩家要有自己的 GitHub 帳號，見 js/gist_cloud.js）
};
