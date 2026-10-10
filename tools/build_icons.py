"""第三世代寶可夢小圖示（graphics/pokemon/*/icon.png，2 格動畫）→ assets/gen3/mon_icons.png。

圖示依全國圖鑑編號排列，每隻 32×64（上下兩格），每列 32 隻；調色盤依 src/pokemon_icon.c 的
gMonIconPaletteIndices 使用 graphics/pokemon/icon_palettes/icon_palette_N.pal。
回傳已收錄的最大編號（No.1–386）。
"""
import json
import os
import re
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen3_tiles import png_rgba  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EM = os.path.join(ROOT, ".cache", "pokeemerald")
OUT = os.path.join(ROOT, "assets", "gen3")
COLS = 32


def national_ids():
    """從 data/pokedex.js 取英文名稱 → 編號。"""
    txt = open(os.path.join(ROOT, "data", "pokedex.js"), encoding="utf-8").read()
    dex = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
    return {v["en"]: int(k) for k, v in dex.items()}


def build_icons():
    P = os.path.join(EM, "graphics/pokemon")
    src = os.path.join(EM, "src/pokemon_icon.c")
    if not os.path.isdir(P) or not os.path.exists(src):
        return 0
    pal_idx = {m.group(1).lower(): int(m.group(2)) for m in re.finditer(r"\[SPECIES_(\w+)\]\s*=\s*(\d)\s*,", open(src, encoding="utf-8").read())}
    ids = national_ids()
    sheet = Image.new("RGBA", (COLS * 32, ((386 + COLS - 1) // COLS) * 64))
    feet = Image.new("RGBA", (COLS * 16, ((386 + COLS - 1) // COLS) * 16))  # 腳印（圖鑑資料頁）
    done = 0
    for folder in os.listdir(P):
        icon = os.path.join(P, folder, "icon.png")
        if folder == "unown":  # 未知圖騰：取 A 形態
            icon = os.path.join(P, folder, "a", "icon.png")
        if not os.path.exists(icon):
            continue
        en = folder.replace("_", "-")
        n = ids.get(en) or ids.get(en.replace("-", "")) or ids.get(en + "-normal")
        if folder == "farfetchd":
            n = 83
        if not n or n > 386:
            continue
        pal = os.path.join(P, "icon_palettes", f"icon_palette_{pal_idx.get(folder, 0)}.pal")
        img = png_rgba(icon, pal)
        k = n - 1
        sheet.paste(img.crop((0, 0, 32, 64)), ((k % COLS) * 32, (k // COLS) * 64))
        fp = os.path.join(os.path.dirname(icon), "footprint.png")
        if folder == "unown":
            fp = os.path.join(P, folder, "footprint.png")
        if os.path.exists(fp):
            f = Image.open(fp).convert("L")
            mark = Image.new("RGBA", (16, 16))
            mark.putdata([(65, 65, 65, 255) if v < 128 else (0, 0, 0, 0) for v in f.getdata()])
            feet.paste(mark, ((k % COLS) * 16, (k // COLS) * 16))
        done += 1
    sheet.save(os.path.join(OUT, "mon_icons.png"))
    feet.save(os.path.join(OUT, "mon_feet.png"))
    print(f"  寶可夢圖示 {done} 隻")
    return 386 if done >= 380 else 0


if __name__ == "__main__":
    print(build_icons())
