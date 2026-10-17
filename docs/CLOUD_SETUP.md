# 雲端帳號設定（跨平台共用帳號與存檔）

本機開啟的遊戲（`file:///D:/claude/pokemon/index.html`）和線上版（https://hung-ncku.github.io/Pokemon_open_world/）是不同的網址，瀏覽器會把它們的資料分開存放，所以**兩邊沒辦法直接共用帳號與存檔**。要跨平台（電腦、手機、本機版、線上版）使用同一個帳號，需要一個雲端資料庫。本專案使用 [Supabase](https://supabase.com)（有免費方案，不需要寫伺服器程式）。

設定大約 10 分鐘，只需要做一次。

## 1. 建立 Supabase 專案

1. 到 https://supabase.com 註冊並登入。
2. 按「New project」，名稱隨意（例如 `pokemon-openworld`），設定資料庫密碼（請自己記下，遊戲用不到），地區選離你近的（例如 Northeast Asia (Tokyo)），方案選 Free。
3. 等專案建立完成（約 1～2 分鐘）。

## 2. 建立存檔資料表

左邊選單「SQL Editor」→「New query」，貼上下面的內容後按「Run」：

```sql
-- 每個帳號一份存檔
create table if not exists public.saves (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- 只允許每個人讀寫自己的存檔（Row Level Security）
alter table public.saves enable row level security;
create policy "read own save"   on public.saves for select using (auth.uid() = user_id);
create policy "insert own save" on public.saves for insert with check (auth.uid() = user_id);
create policy "update own save" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 3. 關閉電子郵件確認

遊戲的帳號只用「名稱＋密碼」，不需要真的電子郵件。左邊選單「Authentication」→「Sign In / Providers」→「Email」，把 **Confirm email** 關掉並儲存。

## 4. 把連線資訊填進遊戲

左邊選單「Project Settings」→「API」（或「Data API」），複製兩個值：

- **Project URL**（例如 `https://abcdefgh.supabase.co`）
- **anon public** 金鑰（很長的一串，`eyJ` 開頭）

打開 `js/cloud_config.js`，填進去：

```js
window.CLOUD_CONFIG = {
  url: 'https://abcdefgh.supabase.co',
  anonKey: 'eyJhbGciOi...',
};
```

> ⚠️ 只能填 **anon public** 金鑰。**不要**填 `service_role` 金鑰（那把金鑰可以略過所有權限，絕對不能放在網頁裡）。anon 金鑰本來就是設計給網頁使用的，資料的保護靠第 2 步的 Row Level Security。

## 5. 發布

```
git add js/cloud_config.js
git commit -m "設定雲端帳號"
git push
bash tools/deploy_pages.sh      # 更新線上版
```

## 6. 使用

- 標題畫面選「帳號」→「註冊新帳號」（在任何一邊註冊都可以），之後在電腦本機版、線上版、手機上用同一組名稱和密碼登入。
- 存檔時會同時上傳到雲端；開啟標題畫面時，如果雲端的存檔比這台裝置上的新，會自動下載。
- 註冊時如果這台裝置上有訪客的存檔，可以選擇搬進新帳號。
- 沒有設定雲端（兩個值留空）時，帳號只存在這台裝置的瀏覽器，和之前一樣。

## 常見問題

| 狀況 | 原因與處理 |
|---|---|
| 註冊時出現「雲端要求電子郵件確認」 | 第 3 步沒有關閉 Confirm email |
| 存檔沒有出現在另一台裝置 | 在「設定 → 遊玩紀錄」查看是否有「雲端存檔失敗」的錯誤；確認第 2 步的資料表與權限已建立 |
| 想重設某個帳號 | Supabase 的「Authentication → Users」可以刪除使用者（存檔會一起刪除） |


## 同步衝突與斷線復原

新版使用現有 `data` JSONB 欄位中的 `syncRevision` 進行條件更新，不需要修改上面的資料表。請讓各裝置更新到新版。網路失敗時待同步資料會留在本機；恢復連線或重開會補傳。

兩台裝置各自遊玩時，版本衝突會保留雙方進度；請從標題的「帳號」→「處理同步衝突／比較進度」選擇要繼續的進度，另一份仍可從復原選單匯出。單純的時間戳較新不再足以覆蓋尚未同步的本機分支。

GitHub Gist 會檢查版本並保留歷史，但沒有與 Supabase 相同的原子條件寫入保障。詳細行為、限制與測試見 [QUALITY_UPGRADE.md](QUALITY_UPGRADE.md)。
