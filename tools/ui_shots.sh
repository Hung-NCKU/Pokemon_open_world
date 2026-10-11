#!/usr/bin/env bash
# 介面截圖：產生 tests/ui_tour.html（由 index.html 加上 tests/ui_tour.js），用無頭 Chrome 把每個畫面截成 PNG
# 用法：bash tools/ui_shots.sh 輸出資料夾 [畫面名稱 ...]（沒有指定就截全部）
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=${1:-"$ROOT/.cache/ui_shots"}; shift || true
mkdir -p "$OUT"
PY=${PYTHON:-python}
"$PY" - "$ROOT" <<'EOF'
import re, sys, os
root = sys.argv[1]
s = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
s = re.sub(r'(src|href)="(data|js|css|assets|fonts)/', r'\1="../\2/', s)
s = s.replace("add('assets/", "add('../assets/")
s = s.replace('<!doctype html>', '<!doctype html>\n<!-- 由 index.html 產生：介面巡覽（tools/ui_shots.sh） -->', 1)
# 這一頁在 tests/ 裡：綠寶石素材的位置要往上一層（否則會退回原創圖）
s = s.replace('<script src="../assets/gen3/manifest.js"></script>', '<script>window.GEN3_BASE = "../assets/gen3/";</script>\n<script src="../assets/gen3/manifest.js"></script>', 1)
s = s.replace('</body>', '<script type="module" src="ui_tour.js"></script>\n</body>', 1)
open(os.path.join(root, 'tests', 'ui_tour.html'), 'w', encoding='utf-8').write(s)
EOF
CHROME=${CHROME:-"/c/Program Files/Google/Chrome/Application/chrome.exe"}
SCREENS=("$@")
if [ ${#SCREENS[@]} -eq 0 ]; then
  SCREENS=($(grep -oE '^    [a-z0-9_]+:' "$ROOT/tests/ui_tour.js" | tr -d ' :'))
fi
# ES module 不能從 file:// 載入，JSX 也要轉換：用 Vite 開發伺服器
NODE=$(command -v node || ls "$ROOT"/.cache/node-*/node.exe 2>/dev/null | head -1)
PORT=${PORT:-4321}
(cd "$ROOT" && exec "$NODE" node_modules/vite/bin/vite.js --port "$PORT" --strictPort >/dev/null 2>&1) &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 3
URL="http://localhost:$PORT/tests/ui_tour.html"
for s in "${SCREENS[@]}"; do
  timeout 120 "$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --window-size=720,560 \
    --virtual-time-budget=14000 --screenshot="$OUT/$s.png" "$URL#$s" >/dev/null 2>&1 || true
  echo "$s"
done
