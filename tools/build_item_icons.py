"""綠寶石沒有的道具圖示 → assets/gen3/item_icons_ext.png（24×24，每列 16 個）

來源順序：
1. Pokémon Showdown 的道具圖示表（items.js 的 spritenum 對應 itemicons-sheet.png），涵蓋第四到第九世代、
   Z-A 的超級石、Z 純晶、薄荷、能力道具
2. PokéAPI item/{id} 的 sprites.default（太晶碎塊、經驗糖果、重要物品等）
道具清單：tools/item_ids.json（遊戲中沒有綠寶石圖示的道具）
"""
import io
import json
import os
import re
import sys
import urllib.request

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "gen3")
SD = os.path.join(ROOT, ".cache", "showdown")
CACHE = os.path.join(ROOT, ".cache", "item_sprites")
os.makedirs(CACHE, exist_ok=True)


def showdown_sprites():
    src = open(os.path.join(SD, "items.js"), encoding="utf-8").read()
    return {m.group(1): int(m.group(2)) for m in re.finditer(r'([a-z0-9]+):\{name:"[^"]*",spritenum:(\d+)', src)}


def fetch(url):
    """單次請求（404 不重試）。"""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "pokemon-fan-research"})
        return urllib.request.urlopen(req, timeout=20).read()
    except Exception:  # noqa: BLE001
        return None


def pokeapi_sprite(item_id):
    fn = os.path.join(CACHE, item_id + ".png")
    if os.path.exists(fn):
        return Image.open(fn).convert("RGBA") if os.path.getsize(fn) else None
    data = None
    # 先直接試 sprites/items/{名稱}.png，再查 item API 取得正確的圖片網址
    for name in (item_id, item_id + "--held"):
        data = fetch(f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{name}.png")
        if data:
            break
    if not data:
        for name in (item_id, item_id + "--held", item_id + "--bag"):
            raw = fetch(f"https://pokeapi.co/api/v2/item/{name}")
            if raw:
                url = (json.loads(raw).get("sprites") or {}).get("default")
                data = fetch(url) if url else None
                if data:
                    break
    open(fn, "wb").write(data or b"")
    return Image.open(io.BytesIO(data)).convert("RGBA") if data else None


# 3. msikma/pokesprite（第八世代的薄荷、經驗糖果、重要物品）
MINT_STAT = {}
for stat, names in {"attack": "lonely adamant naughty brave", "defense": "bold impish lax relaxed", "special-attack": "modest mild rash quiet",
                    "special-defense": "calm gentle careful sassy", "speed": "timid hasty jolly naive", "neutral": "serious"}.items():
    for n in names.split():
        MINT_STAT[n + "-mint"] = stat


def pokesprite_paths(item_id):
    if item_id.startswith("exp-candy-"):
        return ["exp-candy/" + item_id[len("exp-candy-"):]]
    if item_id in MINT_STAT:
        return ["mint/" + MINT_STAT[item_id]]
    return [f"{d}/{item_id}" for d in ("key-item", "other-item", "evo-item", "hold-item", "medicine", "valuable-item", "ingredient")]


def pokesprite(item_id):
    fn = os.path.join(CACHE, "ps_" + item_id + ".png")
    if os.path.exists(fn):
        return Image.open(fn).convert("RGBA") if os.path.getsize(fn) else None
    data = None
    for path in pokesprite_paths(item_id):
        data = fetch(f"https://raw.githubusercontent.com/msikma/pokesprite/master/items/{path}.png")
        if data:
            break
    open(fn, "wb").write(data or b"")
    return Image.open(io.BytesIO(data)).convert("RGBA") if data else None


# 4. Serebii 的道具圖（朱紫的太晶碎塊、太晶珠、阿爾宙斯的道具等）
def serebii(item_id):
    fn = os.path.join(CACHE, "sb_" + item_id + ".png")
    if os.path.exists(fn):
        return Image.open(fn).convert("RGBA") if os.path.getsize(fn) else None
    key = item_id.replace("-", "")
    data = None
    for d in ("itemdex/sprites/sv", "itemdex/sprites"):
        try:
            req = urllib.request.Request(f"https://www.serebii.net/{d}/{key}.png", headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=20).read()
            break
        except Exception:  # noqa: BLE001
            data = None
    open(fn, "wb").write(data or b"")
    return Image.open(io.BytesIO(data)).convert("RGBA") if data else None


def fit24(im):
    """裁掉透明邊，縮放到 24×24 以內並置中。"""
    box = im.getbbox()
    if box:
        im = im.crop(box)
    w, h = im.size
    k = min(1, 22 / max(w, h))
    if k < 1:
        # 高解析度的圖用平滑縮小，像素圖用最近鄰
        im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS if max(w, h) > 40 else Image.NEAREST)
    out = Image.new("RGBA", (24, 24))
    out.alpha_composite(im, ((24 - im.size[0]) // 2, (24 - im.size[1]) // 2))
    return out


def build():
    ids = json.load(open(os.path.join(ROOT, "tools", "item_ids.json"), encoding="utf-8"))
    sheet = Image.open(os.path.join(SD, "itemicons-sheet.png")).convert("RGBA") if os.path.exists(os.path.join(SD, "itemicons-sheet.png")) else None
    sd = showdown_sprites()
    icons, index, miss = [], {}, []
    for item in ids:
        key = re.sub(r"--(held|bag)$", "", item).replace("-", "")
        im = None
        if sheet is not None and key in sd:
            n = sd[key]
            im = sheet.crop(((n % 16) * 24, (n // 16) * 24, (n % 16) * 24 + 24, (n // 16) * 24 + 24))
            if not im.getbbox():
                im = None
        if im is None:
            im = pokeapi_sprite(item)
            if im is not None:
                im = fit24(im)
        if im is None:
            im = pokesprite(item)
            if im is not None:
                im = fit24(im)
        if im is None:
            im = serebii(item)
            if im is not None:
                im = fit24(im)
        if im is None:
            miss.append(item)
            continue
        index[item] = len(icons)
        icons.append(im)
    cols = 16
    out = Image.new("RGBA", (cols * 24, max(1, (len(icons) + cols - 1) // cols) * 24))
    for i, im in enumerate(icons):
        out.paste(im, ((i % cols) * 24, (i // cols) * 24))
    out.save(os.path.join(OUT, "item_icons_ext.png"))
    print(f"道具圖示（補充）{len(index)} 個；仍缺 {len(miss)} 個：{', '.join(miss)}")
    return index


if __name__ == "__main__":
    build()
