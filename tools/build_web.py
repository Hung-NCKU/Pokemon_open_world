"""線上版的建置（tools/deploy_pages.sh 在發布用的暫存資料夾裡執行，不改動原始碼）

1. 合併腳本：index.html 依序載入的 60 個 js 檔合併成一個 app.js（請求數從 60 個變 1 個，壓縮率也比較好）
2. 拆開圖鑑說明：data/pokedex.js 裡的圖鑑說明文字（fl，壓縮後約 57 KB）搬到 data/dex_text.js，
   等頁面載入完成後才下載（標題畫面、野外都用不到；圖鑑、選夥伴時才顯示）

本機開啟（file://）仍然用原本分開的檔案，方便開發與除錯。
用法：python tools/build_web.py <發布資料夾> <版本>
"""
import json
import os
import re
import sys


def main(out, rev):
    index = os.path.join(out, 'index.html')
    html = open(index, encoding='utf-8').read()

    # 2. 圖鑑說明拆到另一個檔案
    dex_path = os.path.join(out, 'data', 'pokedex.js')
    src = open(dex_path, encoding='utf-8').read()
    prefix = 'window.POKEDEX='
    assert src.startswith(prefix)
    dex = json.loads(src[len(prefix):].rstrip().rstrip(';'))
    text = {k: v.pop('fl') for k, v in dex.items() if 'fl' in v}
    with open(dex_path, 'w', encoding='utf-8') as f:
        f.write(prefix + json.dumps(dex, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with open(os.path.join(out, 'data', 'dex_text.js'), 'w', encoding='utf-8') as f:
        f.write('// 圖鑑說明（由 tools/build_web.py 從 pokedex.js 拆出，頁面載入後才下載）\n')
        f.write('(t => { for (const k in t) if (window.POKEDEX[k]) window.POKEDEX[k].fl = t[k]; })('
                + json.dumps(text, ensure_ascii=False, separators=(',', ':')) + ');\n')

    # 1. 合併腳本（依 index.html 的順序；每個檔案之間加分號與換行，避免前一個檔案沒有分號結尾）
    tags = re.findall(r'<script src="([^"]+)"></script>\n?', html)
    parts = []
    for s in tags:
        with open(os.path.join(out, s), encoding='utf-8') as f:
            parts.append(f'// ===== {s} =====\n' + f.read().rstrip() + '\n;\n')
    with open(os.path.join(out, 'app.js'), 'w', encoding='utf-8') as f:
        f.write(''.join(parts))
    first = True

    def repl(m):
        nonlocal first
        if first:
            first = False
            return f'<script src="app.js?v={rev}"></script>\n'
        return ''
    html = re.sub(r'<script src="[^"]+"></script>\n?', repl, html)
    # 圖鑑說明：和音樂、音效一樣，頁面載入完成後才下載
    anchor = "  add('assets/gen3/se_bank.js');"
    assert anchor in html
    html = html.replace(anchor, anchor + "\n  add('data/dex_text.js');", 1)
    with open(index, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'合併 {len(tags)} 個腳本 → app.js（{os.path.getsize(os.path.join(out, "app.js")) // 1024} KB），圖鑑說明 {len(text)} 筆 → data/dex_text.js')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1], sys.argv[2])
