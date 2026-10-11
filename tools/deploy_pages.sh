#!/usr/bin/env bash
# 發布線上版（GitHub Pages，gh-pages 分支）：已提交的程式＋本機建置的綠寶石素材（assets/gen3）
#
# - main 分支不含原版素材（.gitignore）；素材只放在 gh-pages 分支，網站從這個分支提供
# - 每次執行都重新產生 gh-pages（強制推送，只保留最新一份），不影響 main 的歷史
# - 要撤下原版素材：刪除 gh-pages 分支，並把 Pages 的來源改回 main（見 docs/DEVELOPMENT.md）
#
# 用法：bash tools/deploy_pages.sh   （先執行 python tools/build_assets.py 產生 assets/gen3）
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
[ -f assets/gen3/manifest.js ] || { echo "找不到 assets/gen3/manifest.js，請先執行 python tools/build_assets.py"; exit 1; }
REMOTE=$(git remote get-url origin)
REV=$(git rev-parse --short HEAD)
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT

git archive HEAD | tar -x -C "$OUT"
mkdir -p "$OUT/assets"
cp -r assets/gen3 "$OUT/assets/"
touch "$OUT/.nojekyll"
# Service Worker 的版本＝提交編號（版本改變時，玩家的裝置會清掉舊的快取）
sed -i "s/const VERSION = 'dev';/const VERSION = '$REV';/" "$OUT/sw.js"
# 合併腳本成 app.js、圖鑑說明改成載入後才下載（只改發布的複本，原始碼不變）
PY=${PYTHON:-python}
"$PY" tools/build_web.py "$OUT" "$REV"

cd "$OUT"
git init -q
git checkout -q -b gh-pages
git add -A
git add -f assets/gen3   # .gitignore 會忽略素材，這裡強制加入（只在 gh-pages）
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
  commit -q -m "Deploy $REV with local Emerald assets (gh-pages only)"
git push -q -f "$REMOTE" gh-pages
echo "已發布 $REV 到 gh-pages（含 $(find assets/gen3 -type f | wc -l) 個素材檔）"
