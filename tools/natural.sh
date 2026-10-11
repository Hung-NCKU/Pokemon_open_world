#!/usr/bin/env bash
# 實際遊玩測試（tests/natural.html）：只用按鍵操作綠寶石的介面玩一段豐緣、打聯盟
# 聲音：無頭瀏覽器裡模擬的按鍵不算使用者操作，要允許自動播放，否則等待音樂結束的地方會停住
# 遊戲的畫面更新靠 requestAnimationFrame，無頭瀏覽器的「虛擬時間」不會推進，所以這個測試用真實時間跑（約 10～30 分鐘）
# 用法：bash tools/natural.sh [情境 1|2]（不指定就兩個都跑）；進度與結果印在終端機
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
CHROME=${CHROME:-"/c/Program Files/Google/Chrome/Application/chrome.exe"}
SC=${1:-}
URL="file:///$(cd "$ROOT" && pwd -W 2>/dev/null || pwd)/tests/natural.html${SC:+?scenario=$SC}"
PROFILE=$(mktemp -d)
mkdir -p "$ROOT/.cache"
LOG="$ROOT/.cache/natural.log"   # 進度：tail -f .cache/natural.log | grep NATURAL
: > "$LOG"
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --enable-logging=stderr --v=0 --autoplay-policy=no-user-gesture-required --user-data-dir="$PROFILE" "$URL" > "$LOG" 2>&1 &
PID=$!
# 等到測試印出 DONE（最多 60 分鐘）
for _ in $(seq 1 1200); do
  if grep -q "NATURAL DONE" "$LOG"; then break; fi
  sleep 3
done
kill "$PID" 2>/dev/null
grep -o 'NATURAL .*' "$LOG" | sed -e 's/^NATURAL //' -e 's/", source: .*$//'
grep -q "NATURAL DONE .* PASS" "$LOG"; RES=$?
rm -rf "$PROFILE"
exit $RES
