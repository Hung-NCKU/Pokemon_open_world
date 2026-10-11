"""字型子集：只保留遊戲文字用到的字，縮小第一次開啟要下載的字型

俐方體 11 號（fonts/Cubic_11.woff2）有一萬多個字，約 400 KB；遊戲的文字（js/、data/、index.html、css/）
只用到其中兩千多個。這個工具掃描所有文字，產生 fonts/Cubic_11_game.woff2（約 100 KB）。

CSS 先用子集；遇到子集裡沒有的字（例如玩家自己取的名字）時，瀏覽器才會下載完整的字型（見 css/style.css 的 @font-face）。
改了遊戲文字之後重新執行：python tools/subset_font.py（需要 fonttools、brotli：pip install fonttools brotli）
"""
import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'fonts', 'Cubic_11.woff2')
OUT = os.path.join(ROOT, 'fonts', 'Cubic_11_game.woff2')


def game_text():
    files = glob.glob(os.path.join(ROOT, 'js', '*.js')) + glob.glob(os.path.join(ROOT, 'data', '*.js')) \
        + glob.glob(os.path.join(ROOT, 'css', '*.css')) + [os.path.join(ROOT, 'index.html')]
    chars = set()
    for f in files:
        with open(f, encoding='utf-8') as fh:
            chars |= set(fh.read())
    chars |= {chr(c) for c in range(0x20, 0x7f)}           # 英數字與符號（玩家輸入名字常用）
    chars |= set('，。、！？：；「」『』（）《》〈〉…—～・　０１２３４５６７８９')  # 常用全形標點
    return ''.join(sorted(c for c in chars if c.isprintable() or c == '　'))


def main():
    text = game_text()
    font = TTFont(SRC)
    opt = subset.Options()
    opt.flavor = 'woff2'
    opt.layout_features = ['*']
    opt.drop_tables += ['FFTM']
    sub = subset.Subsetter(opt)
    sub.populate(text=text)
    sub.subset(font)
    font.flavor = 'woff2'
    font.save(OUT)
    print(f'{len(text)} 個字 → {os.path.relpath(OUT, ROOT)}（{os.path.getsize(OUT) // 1024} KB，完整字型 {os.path.getsize(SRC) // 1024} KB）')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
