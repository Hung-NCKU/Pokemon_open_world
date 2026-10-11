#!/usr/bin/env bash
# 實際遊玩測試（tests/natural.html）：只用按鍵操作綠寶石的介面玩一段豐緣、打聯盟
# 改成 ES module 之後不能從 file:// 開啟，改由 Playwright 透過本機伺服器執行（npm run test:natural）
# 用法：bash tools/natural.sh [情境 1|2]（不指定就兩個都跑）；本機沒有裝 Node 時使用 .cache/node-*（可攜版）
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
NODE_DIR=$(dirname "$(command -v node || ls "$ROOT"/.cache/node-*/node.exe 2>/dev/null | head -1)")
export PATH="$NODE_DIR:$PATH"
[ -n "${1:-}" ] && export SCENARIO=$1
# 有安裝 Chrome 時直接用，不必下載 Playwright 的瀏覽器
[ -z "${PW_CHANNEL:-}" ] && [ -x "/c/Program Files/Google/Chrome/Application/chrome.exe" ] && export PW_CHANNEL=chrome
npx playwright test --project=natural
