#!/usr/bin/env bash
# 產生 docs/UNSUPPORTED.md（已知還沒完成的招式與特性）：用無頭 Chrome 載入遊戲，由戰鬥引擎自己判定支援狀態
# 用法：bash tools/unsupported.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PY=${PYTHON:-python}
"$PY" - "$ROOT" <<'EOF'
import re, sys, os
root = sys.argv[1]
s = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
s = re.sub(r'(src|href)="(data|js|css|assets|fonts)/', r'\1="../\2/', s)
s = s.replace("add('assets/", "add('../assets/")
s = s.replace('</body>', '<script type="module" src="unsupported.js"></script>\n</body>', 1)
open(os.path.join(root, 'tools', 'unsupported.html'), 'w', encoding='utf-8').write(s)
EOF
CHROME=${CHROME:-"/c/Program Files/Google/Chrome/Application/chrome.exe"}
# ES module 不能從 file:// 載入，JSX 也要轉換：用 Vite 開發伺服器
NODE=$(command -v node || ls "$ROOT"/.cache/node-*/node.exe 2>/dev/null | head -1)
PORT=${PORT:-4322}
(cd "$ROOT" && exec "$NODE" node_modules/vite/bin/vite.js --port "$PORT" --strictPort >/dev/null 2>&1) &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 3
URL="http://localhost:$PORT/tools/unsupported.html"
OUT=$(mktemp)
timeout 120 "$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=10000 --dump-dom "$URL" > "$OUT" 2>/dev/null
"$PY" - "$OUT" "$ROOT/docs/UNSUPPORTED.md" <<'EOF'
import sys, html, re
s = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'<pre id="out">(.*?)</pre>', s, re.S)
open(sys.argv[2], 'w', encoding='utf-8').write(html.unescape(m.group(1)))
print('已產生', sys.argv[2])
EOF
rm -f "$OUT" "$ROOT/tools/unsupported.html"
