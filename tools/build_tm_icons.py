"""招式學習器的圖示：依招式屬性換色（pokeemerald graphics/items/icons/tm.png ＋ icon_palettes/<屬性>_tm_hm.pal）。

綠寶石沒有蟲與妖精屬性的招式學習器調色盤，用一般屬性的調色盤，把「隨屬性改變的顏色」換成該屬性的顏色。
輸出 assets/gen3/tm_icons.png：18 格 24×24，順序同 TYPES_ORDER（bagui.js 依招式屬性取用）。
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen3_tiles import read_pal  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EM = os.path.join(ROOT, ".cache", "pokeemerald", "graphics", "items")
OUT = os.path.join(ROOT, "assets", "gen3")
TYPES_ORDER = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
               "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"]
EXTRA = {"bug": (168, 184, 32), "fairy": (238, 153, 172)}


def render(png, pal):
    im = Image.open(png)
    if im.mode != "P":
        im = im.convert("P")
    px = im.load()
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    op = out.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            c = px[x, y] & 15
            if c:
                op[x, y] = pal[c] + (255,)
    return out


def build():
    png = os.path.join(EM, "icons", "tm.png")
    if not os.path.exists(png):
        return False
    pals = {t: read_pal(os.path.join(EM, "icon_palettes", f"{t}_tm_hm.pal")) for t in TYPES_ORDER
            if os.path.exists(os.path.join(EM, "icon_palettes", f"{t}_tm_hm.pal"))}
    normal, fire = pals["normal"], pals["fire"]
    # 隨屬性改變的調色盤位置：一般與火不同的那幾格
    varying = [i for i in range(16) if normal[i] != fire[i]]
    base = sum(sum(normal[i]) for i in varying) / max(1, len(varying)) / 3
    for t, rgb in EXTRA.items():
        p = list(normal)
        for i in varying:
            k = (sum(normal[i]) / 3) / max(1, base)  # 保留原本的明暗
            p[i] = tuple(max(0, min(255, int(c * k))) for c in rgb)
        pals[t] = p
    sheet = Image.new("RGBA", (24 * len(TYPES_ORDER), 24), (0, 0, 0, 0))
    for k, t in enumerate(TYPES_ORDER):
        ic = render(png, pals[t])
        sheet.alpha_composite(ic, (k * 24 + (24 - ic.size[0]) // 2, (24 - ic.size[1]) // 2))
    sheet.save(os.path.join(OUT, "tm_icons.png"))
    return True


if __name__ == "__main__":
    print(build())
