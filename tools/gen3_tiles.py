"""讀取 pokeemerald 的圖塊格式（tiles.png + JASC 調色盤 + metatiles.bin），渲染成 16×16 metatile。"""
import os
import struct
from PIL import Image


def read_pal(path):
    with open(path, encoding="ascii") as f:
        lines = f.read().split()
    n = int(lines[2])
    vals = list(map(int, lines[3:3 + n * 3]))
    return [tuple(vals[i * 3:i * 3 + 3]) for i in range(n)]


class Tileset:
    def __init__(self, root):
        self.root = root
        img = Image.open(os.path.join(root, "tiles.png"))
        if img.mode != "P":
            img = img.convert("P")
        self.w, self.h = img.size
        self.px = img.load()
        self.ntiles = (self.w // 8) * (self.h // 8)
        self.pals = []
        pd = os.path.join(root, "palettes")
        for i in range(16):
            p = os.path.join(pd, f"{i:02d}.pal")
            self.pals.append(read_pal(p) if os.path.exists(p) else [(0, 0, 0)] * 16)
        with open(os.path.join(root, "metatiles.bin"), "rb") as f:
            data = f.read()
        self.metatiles = [struct.unpack_from("<8H", data, i * 16) for i in range(len(data) // 16)]
        attr = os.path.join(root, "metatile_attributes.bin")
        if os.path.exists(attr):
            with open(attr, "rb") as f:
                d = f.read()
            self.attrs = [struct.unpack_from("<H", d, i * 2)[0] for i in range(len(d) // 2)]
        else:
            self.attrs = []

    def tile_pixel(self, t, x, y):
        tx, ty = t % (self.w // 8), t // (self.w // 8)
        return self.px[tx * 8 + x, ty * 8 + y] & 15


class Pair:
    """主要圖塊組（primary，metatile 0–511，調色盤 0–5）+ 次要圖塊組（secondary，512 起，調色盤 6–12）。"""

    def __init__(self, primary, secondary=None):
        self.p = primary
        self.s = secondary

    def palette(self, i):
        if i < 6 or not self.s:
            return self.p.pals[i]
        return self.s.pals[i]

    def metatile(self, idx):
        if idx < 512:
            return self.p.metatiles[idx] if idx < len(self.p.metatiles) else None
        if not self.s:
            return None
        j = idx - 512
        return self.s.metatiles[j] if j < len(self.s.metatiles) else None

    def render(self, idx, layers=(0, 1), backdrop=True):
        mt = self.metatile(idx)
        im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        if mt is None:
            return im
        px = im.load()
        if backdrop:
            c = self.p.pals[0][0]
            for y in range(16):
                for x in range(16):
                    px[x, y] = c + (255,)
        for layer in layers:
            for q in range(4):
                e = mt[layer * 4 + q]
                t, hf, vf, pal = e & 0x3FF, (e >> 10) & 1, (e >> 11) & 1, e >> 12
                ts = self.p if t < 512 else self.s
                if ts is None:
                    continue
                tt = t if t < 512 else t - 512
                if tt >= ts.ntiles:
                    continue
                colors = self.palette(pal)
                ox, oy = (q % 2) * 8, (q // 2) * 8
                for y in range(8):
                    for x in range(8):
                        sx = 7 - x if hf else x
                        sy = 7 - y if vf else y
                        ci = ts.tile_pixel(tt, sx, sy)
                        if ci == 0:
                            continue
                        px[ox + x, oy + y] = colors[ci] + (255,)
        return im


def atlas(pair, start, count, out, scale=2, cols=16):
    from PIL import ImageDraw
    rows = (count + cols - 1) // cols
    cell = 16 * scale + 14
    img = Image.new("RGB", (cols * cell, rows * cell), (40, 40, 40))
    d = ImageDraw.Draw(img)
    for i in range(count):
        idx = start + i
        t = pair.render(idx).resize((16 * scale, 16 * scale), Image.NEAREST)
        x, y = (i % cols) * cell, (i // cols) * cell
        img.paste(t, (x, y + 12), t)
        d.text((x + 1, y), f"{idx:03X}", fill=(255, 255, 0))
    img.save(out)


if __name__ == "__main__":
    import sys
    root = sys.argv[1]
    out = sys.argv[2]
    prim = Tileset(os.path.join(root, "data/tilesets/primary/general"))
    sec = Tileset(os.path.join(root, "data/tilesets/secondary/petalburg"))
    pair = Pair(prim, sec)
    atlas(pair, 0, 256, os.path.join(out, "atlas_general_0.png"))
    atlas(pair, 256, 256, os.path.join(out, "atlas_general_1.png"))
    atlas(pair, 512, len(sec.metatiles), os.path.join(out, "atlas_petalburg.png"))


def tileset_dir(root, name):
    import re
    base = name.replace("gTileset_", "")
    snake = re.sub(r"(?<!^)(?=[A-Z])", "_", base).lower()
    for kind in ("primary", "secondary"):
        p = os.path.join(root, "data/tilesets", kind, snake)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


_ts_cache = {}


def load_layout(root, layout_id):
    import json
    d = json.load(open(os.path.join(root, "data/layouts/layouts.json")))
    lay = next(l for l in d["layouts"] if l.get("id") == layout_id)
    def ts(name):
        if name not in _ts_cache:
            _ts_cache[name] = Tileset(tileset_dir(root, name))
        return _ts_cache[name]
    pair = Pair(ts(lay["primary_tileset"]), ts(lay["secondary_tileset"]))
    with open(os.path.join(root, lay["blockdata_filepath"]), "rb") as f:
        data = f.read()
    w, h = lay["width"], lay["height"]
    blocks = [struct.unpack_from("<H", data, i * 2)[0] for i in range(w * h)]
    return pair, w, h, blocks


def render_layout(root, layout_id, out=None, grid=False):
    from PIL import ImageDraw
    pair, w, h, blocks = load_layout(root, layout_id)
    img = Image.new("RGBA", (w * 16, h * 16))
    cache = {}
    for y in range(h):
        for x in range(w):
            m = blocks[y * w + x] & 0x3FF
            if m not in cache:
                cache[m] = pair.render(m)
            img.paste(cache[m], (x * 16, y * 16))
    if grid:
        img = img.resize((w * 32, h * 32), Image.NEAREST)
        d = ImageDraw.Draw(img)
        for x in range(w):
            d.text((x * 32 + 2, 0), str(x), fill=(255, 255, 0))
        for y in range(h):
            d.text((0, y * 32 + 2), str(y), fill=(255, 255, 0))
    if out:
        img.save(out)
    return img


def render_tilemap(tiles_png, map_bin, pal_path, w_tiles=32, h_tiles=None, pal_offset=0):
    """GBA 4bpp BG：tiles.png + map.bin（每格 u16：tile|hflip|vflip|palette）+ 調色盤。"""
    img = Image.open(tiles_png)
    if img.mode != "P":
        img = img.convert("P")
    px = img.load()
    tw = img.size[0] // 8
    ntiles = tw * (img.size[1] // 8)
    pal = read_pal(pal_path)
    with open(map_bin, "rb") as f:
        data = f.read()
    n = len(data) // 2
    h_tiles = h_tiles or n // w_tiles
    out = Image.new("RGBA", (w_tiles * 8, h_tiles * 8), (0, 0, 0, 0))
    op = out.load()
    for i in range(min(n, w_tiles * h_tiles)):
        e = struct.unpack_from("<H", data, i * 2)[0]
        t, hf, vf, p = e & 0x3FF, (e >> 10) & 1, (e >> 11) & 1, (e >> 12) - pal_offset
        if t >= ntiles:
            continue
        ox, oy = (i % w_tiles) * 8, (i // w_tiles) * 8
        for y in range(8):
            for x in range(8):
                sx, sy = (7 - x if hf else x), (7 - y if vf else y)
                ci = px[(t % tw) * 8 + sx, (t // tw) * 8 + sy] & 15
                if ci == 0:
                    continue
                k = p * 16 + ci
                if 0 <= k < len(pal):
                    op[ox + x, oy + y] = pal[k] + (255,)
    return out


def png_rgba(path, pal_path=None):
    """讀取索引色 PNG，索引 0 透明；可指定外部 JASC 調色盤。"""
    img = Image.open(path)
    if img.mode != "P":
        return img.convert("RGBA")
    pal = read_pal(pal_path) if pal_path else None
    raw = img.getpalette()
    w, h = img.size
    px = img.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            i = px[x, y]
            if i % 16 == 0:
                continue
            if pal:
                c = pal[i % len(pal)]
            else:
                c = tuple(raw[i * 3:i * 3 + 3])
            op[x, y] = c + (255,)
    return out
