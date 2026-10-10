"""從 pokeemerald（pret 反編譯專案）建置遊戲用的第三世代素材，輸出到 assets/gen3/。

用法：
  git clone https://github.com/pret/pokeemerald .cache/pokeemerald   （或 sparse checkout）
  python tools/build_assets.py

輸出（僅供本機個人研究使用，已列入 .gitignore）：
  assets/gen3/tiles.png      地形 metatile 圖集（16×16，每列 32 格）
  assets/gen3/*.png          建築、角色、戰鬥背景與介面、精靈球、招式特效
  assets/gen3/midi/*.mid     音樂
  assets/gen3/manifest.js    window.GEN3 = {...} 對照表
"""
import json
import os
import re
import shutil
import sys
from collections import Counter, defaultdict

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen3_tiles import Pair, Tileset, load_layout, png_rgba, read_pal, render_tilemap, tileset_dir  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EM = os.path.join(ROOT, ".cache", "pokeemerald")
OUT = os.path.join(ROOT, "assets", "gen3")
os.makedirs(OUT, exist_ok=True)

beh_src = open(os.path.join(EM, "include/constants/metatile_behaviors.h"), encoding="utf-8").read()
BEH = {n: i for i, n in enumerate(re.findall(r"^\s*(MB_\w+)", beh_src, re.M))}
WATER_B = {BEH[k] for k in ("MB_POND_WATER", "MB_DEEP_WATER", "MB_OCEAN_WATER", "MB_INTERIOR_DEEP_WATER",
                            "MB_NO_SURFACING", "MB_SEAWEED", "MB_WATERFALL") if k in BEH}
SAND_B = {BEH["MB_SAND"], BEH["MB_DEEP_SAND"]}

# ---------- 圖集 ----------
atlas_imgs = []
atlas_index = {}


def add(img):
    key = img.tobytes()
    if key not in atlas_index:
        atlas_index[key] = len(atlas_imgs)
        atlas_imgs.append(img)
    return atlas_index[key]


def avg(img):
    px = [p for p in img.get_flattened_data() if p[3]] if hasattr(img, "get_flattened_data") else [p for p in img.getdata() if p[3]]
    n = max(1, len(px))
    return tuple(sum(p[i] for p in px) / n for i in range(3))


# ---------- 從實際地圖學習地形邊緣（自動拼接） ----------
def attr_of(pair, m):
    ts = pair.p if m < 512 else pair.s
    i = m if m < 512 else m - 512
    return ts.attrs[i] & 0xFF if i < len(ts.attrs) else 0


def classify(pair, m, coll, cache):
    if m in cache:
        r, g, b = cache[m]
    else:
        r, g, b = cache[m] = avg(pair.render(m))
    be = attr_of(pair, m)
    if be in WATER_B:
        return "water"
    if be == BEH["MB_TALL_GRASS"]:
        return "tall"
    if be in SAND_B:
        return "sand"
    if be == BEH["MB_MOUNTAIN_TOP"]:
        return "rock"
    green = g > r + 10
    if coll:
        if not green and r > g + 15 and r > 110:
            return "rock"
        return None
    if not green and r > 190 and g > 170 and b < 160:
        return "path"
    if green:
        return "grass"
    return None


def reduce_mask(n, e, s, w, ne, se, sw, nw):
    m = (1 if n else 0) | (2 if e else 0) | (4 if s else 0) | (8 if w else 0)
    if n and e and ne: m |= 16
    if s and e and se: m |= 32
    if s and w and sw: m |= 64
    if n and w and nw: m |= 128
    return m


LEARN = {
    "path": ["LAYOUT_PETALBURG_CITY", "LAYOUT_ROUTE102", "LAYOUT_ROUTE104", "LAYOUT_ROUTE110", "LAYOUT_ROUTE116", "LAYOUT_ROUTE117",
             "LAYOUT_ROUTE118", "LAYOUT_ROUTE121", "LAYOUT_ROUTE123", "LAYOUT_MAUVILLE_CITY", "LAYOUT_RUSTBORO_CITY"],
    "water": ["LAYOUT_ROUTE103", "LAYOUT_ROUTE104", "LAYOUT_ROUTE105", "LAYOUT_ROUTE106", "LAYOUT_ROUTE107", "LAYOUT_ROUTE109",
              "LAYOUT_ROUTE110", "LAYOUT_ROUTE115", "LAYOUT_ROUTE118", "LAYOUT_ROUTE121", "LAYOUT_ROUTE123", "LAYOUT_ROUTE124",
              "LAYOUT_DEWFORD_TOWN", "LAYOUT_SLATEPORT_CITY", "LAYOUT_LILYCOVE_CITY"],
    "sand": ["LAYOUT_ROUTE103", "LAYOUT_ROUTE104", "LAYOUT_ROUTE109", "LAYOUT_ROUTE115", "LAYOUT_DEWFORD_TOWN", "LAYOUT_SLATEPORT_CITY"],
    "desert": ["LAYOUT_ROUTE111"],
    "rock": ["LAYOUT_ROUTE111", "LAYOUT_ROUTE112", "LAYOUT_ROUTE114", "LAYOUT_ROUTE115", "LAYOUT_ROUTE116", "LAYOUT_ROUTE113",
             "LAYOUT_EVER_GRANDE_CITY", "LAYOUT_ROUTE118", "LAYOUT_ROUTE120"],
}


def learn(cls_name, layouts):
    stats = defaultdict(Counter)  # (mask, d) -> Counter(atlas idx)
    want = "sand" if cls_name == "desert" else cls_name
    for lid in layouts:
        try:
            pair, w, h, blocks = load_layout(EM, lid)
        except (StopIteration, FileNotFoundError):
            continue
        cache = {}
        cls = [[classify(pair, blocks[y * w + x] & 0x3FF, (blocks[y * w + x] >> 10) & 3, cache) for x in range(w)] for y in range(h)]
        same = lambda x, y: True if not (0 <= x < w and 0 <= y < h) else cls[y][x] == want
        rend = {}
        for y in range(h):
            for x in range(w):
                if cls[y][x] != want:
                    continue
                m = reduce_mask(same(x, y - 1), same(x + 1, y), same(x, y + 1), same(x - 1, y),
                                same(x + 1, y - 1), same(x + 1, y + 1), same(x - 1, y + 1), same(x - 1, y - 1))
                d = 0
                if cls_name == "rock":
                    while d < 3 and same(x, y + d + 1):
                        d += 1
                mt = blocks[y * w + x] & 0x3FF
                if mt not in rend:
                    rend[mt] = add(pair.render(mt))
                stats[(m, d)][rend[mt]] += 1
    return stats


ALL_MASKS = sorted({reduce_mask(*[(i >> k) & 1 for k in range(8)]) for i in range(256)})


def complete(stats, use_d):
    """為每個 (mask, d) 選出最相近的已學習圖塊。"""
    table = {}
    learned = {k: c.most_common(1)[0][0] for k, c in stats.items()}
    for m in ALL_MASKS:
        for d in (range(4) if use_d else [0]):
            if (m, d) in learned:
                table[f"{m},{d}"] = learned[(m, d)]
                continue
            best, bs = None, -1e9
            for (lm, ld), idx in learned.items():
                s = 0
                for bit in range(4):
                    s += 8 if ((m >> bit) & 1) == ((lm >> bit) & 1) else -8
                for bit in range(4, 8):
                    s += 1 if ((m >> bit) & 1) == ((lm >> bit) & 1) else -1
                if use_d:
                    s -= abs(d - ld) * 3
                s += min(stats[(lm, ld)].total(), 50) / 100
                if s > bs:
                    bs, best = s, idx
            table[f"{m},{d}"] = best
    return table


def snowify(img):
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and g > r + 8 and g >= b - 20:
                lum = (r + g * 2 + b) / 4
                if lum > 150: c = (248, 248, 252)
                elif lum > 120: c = (216, 228, 244)
                elif lum > 90: c = (176, 196, 224)
                else: c = (112, 136, 176)
                px[x, y] = c + (a,)
    return out


def build_tiles():
    man = {"auto": {}, "single": {}}
    for cname, lays in LEARN.items():
        st = learn(cname, lays)
        print(f"  {cname}: 學到 {len(st)} 種邊緣組合")
        if st:
            man["auto"][cname] = complete(st, cname == "rock")
    gen = Pair(Tileset(tileset_dir(EM, "gTileset_General")), Tileset(tileset_dir(EM, "gTileset_Petalburg")))
    single = {
        "grass": [0x001], "tall": [0x00D], "flower": [0x004], "cave": [0x071],
        "tree": [0x1D4, 0x1D5, 0x1DC, 0x1DD, 0x1E4, 0x1E5, 0x1E6, 0x1E7],
    }
    for k, ids in single.items():
        man["single"][k] = [add(gen.render(i)) for i in ids]
    # 雪地版本
    man["single"]["snow"] = [add(snowify(gen.render(0x001)))]
    man["single"]["snowtall"] = [add(snowify(gen.render(0x00D)))]
    man["single"]["snowtree"] = [add(snowify(gen.render(i))) for i in single["tree"]]
    # 橋：左右是水、自己可通行
    br = Counter()
    for lid in ["LAYOUT_ROUTE110", "LAYOUT_ROUTE119", "LAYOUT_ROUTE120", "LAYOUT_ROUTE104", "LAYOUT_ROUTE123"]:
        try:
            pair, w, h, blocks = load_layout(EM, lid)
        except (StopIteration, FileNotFoundError):
            continue
        for y in range(h):
            for x in range(1, w - 1):
                v = blocks[y * w + x]
                if (v >> 10) & 3:
                    continue
                m = v & 0x3FF
                l, r = blocks[y * w + x - 1] & 0x3FF, blocks[y * w + x + 1] & 0x3FF
                if attr_of(pair, m) not in WATER_B and attr_of(pair, l) in WATER_B and attr_of(pair, r) in WATER_B:
                    br[add(pair.render(m))] += 1
    if br:
        man["single"]["bridge"] = [br.most_common(1)[0][0]]
    cols = 32
    rows = (len(atlas_imgs) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * 16, rows * 16))
    for i, im in enumerate(atlas_imgs):
        sheet.paste(im, ((i % cols) * 16, (i // cols) * 16))
    sheet.save(os.path.join(OUT, "tiles.png"))
    print(f"  圖集共 {len(atlas_imgs)} 格")
    return man


# ---------- 建築（直接從原作城鎮裁切） ----------
BUILDINGS = {
    "center": ("LAYOUT_OLDALE_TOWN", 5, 13, 4, 4, 1),
    "mart": ("LAYOUT_OLDALE_TOWN", 13, 3, 4, 4, 1),
    "house": ("LAYOUT_LITTLEROOT_TOWN", 2, 4, 5, 5, 3),
    "lab": ("LAYOUT_LITTLEROOT_TOWN", 3, 12, 7, 5, 4),
    "gym": ("LAYOUT_PETALBURG_CITY", 12, 4, 6, 5, 3),
    "league": ("LAYOUT_EVER_GRANDE_CITY", 13, 0, 11, 7, 5),
}


def build_buildings():
    out = {}
    for kind, (lid, x0, y0, w, h, door) in BUILDINGS.items():
        pair, lw, lh, blocks = load_layout(EM, lid)
        img = Image.new("RGBA", (w * 16, h * 16))
        for y in range(h):
            for x in range(w):
                img.paste(pair.render(blocks[(y0 + y) * lw + x0 + x] & 0x3FF), (x * 16, y * 16))
        img.save(os.path.join(OUT, f"bld_{kind}.png"))
        out[kind] = {"w": w, "h": h, "door": door}
    return out


# ---------- 角色 ----------
TRAINER_SPRITES = ["youngster", "lass", "bug_catcher", "hiker", "swimmer_m", "psychic_m", "black_belt", "man_2", "beauty",
                   "expert_m", "hex_maniac", "man_1", "maniac", "camper", "expert_f", "scientist_1", "picnicker"]


def build_chars():
    P = os.path.join(EM, "graphics/object_events/pics/people")
    png_rgba(os.path.join(P, "brendan/walking.png")).save(os.path.join(OUT, "player_walk.png"))
    png_rgba(os.path.join(P, "brendan/running.png")).save(os.path.join(OUT, "player_run.png"))
    png_rgba(os.path.join(P, "brendan/surfing.png")).save(os.path.join(OUT, "player_surf.png"))
    out = []
    for name in TRAINER_SPRITES:
        p = os.path.join(P, name + ".png")
        if os.path.exists(p):
            png_rgba(p).save(os.path.join(OUT, f"npc_{name}.png"))
            out.append(name)
    for extra in ["nurse", "mart_employee", "mom", "prof_birch"]:
        p = os.path.join(P, extra + ".png")
        if os.path.exists(p):
            png_rgba(p).save(os.path.join(OUT, f"npc_{extra}.png"))
    F = os.path.join(EM, "graphics/field_effects/pics")
    # 衝浪的坐騎沒有自己的調色盤（paletteTag = TAG_NONE），沿用主角的調色盤
    pal = {"surf_blob": os.path.join(EM, "graphics/object_events/palettes/brendan.pal")}
    for f in ["surf_blob", "emotion_exclamation", "tall_grass", "sparkle", "shadow_medium"]:
        p = os.path.join(F, f + ".png")
        if os.path.exists(p):
            pp = pal.get(f)
            png_rgba(p, pp if pp and os.path.exists(pp) else None).save(os.path.join(OUT, f"fx_{f}.png"))
    return out


# ---------- 戰鬥 ----------
ENVS = {"tall": "tall_grass", "water": "water", "cave": "cave", "desert": "sand", "gym": "building", "rock": "rock", "plain": "plain"}


def build_battle():
    B = os.path.join(EM, "graphics/battle_environment")
    for k, d in ENVS.items():
        p = os.path.join(B, d)
        if not os.path.exists(os.path.join(p, "tiles.png")):
            continue
        im = render_tilemap(os.path.join(p, "tiles.png"), os.path.join(p, "map.bin"), os.path.join(p, "palette.pal"), 32, pal_offset=2)
        bg = Image.new("RGBA", (240, 160), im.getpixel((4, 4)))
        bg.paste(im.crop((0, 0, 240, 160)), (0, 0), im.crop((0, 0, 240, 160)))
        bg.save(os.path.join(OUT, f"bg_{k}.png"))
    # 雪地背景：由草地背景轉成雪色
    snowify(Image.open(os.path.join(OUT, "bg_tall.png")).convert("RGBA")).save(os.path.join(OUT, "bg_snow.png"))
    I = os.path.join(EM, "graphics/battle_interface")
    p0, p1 = read_pal(os.path.join(I, "textbox_0.pal")), read_pal(os.path.join(I, "textbox_1.pal"))
    tmp = os.path.join(OUT, "_tb.pal")
    with open(tmp, "w") as f:
        f.write("JASC-PAL\n0100\n32\n" + "\n".join("%d %d %d" % c for c in p0[:16] + p1[:16]))
    tb = render_tilemap(os.path.join(I, "textbox.png"), os.path.join(I, "textbox_map.bin"), tmp, 32)
    os.remove(tmp)
    tb.crop((0, 112, 240, 160)).save(os.path.join(OUT, "ui_textbox.png"))
    tb.crop((0, 272, 240, 320)).save(os.path.join(OUT, "ui_actionbox.png"))
    tb.crop((0, 432, 240, 480)).save(os.path.join(OUT, "ui_movebox.png"))
    for f in ["healthbox_singles_player", "healthbox_singles_opponent", "hpbar", "expbar", "status", "ball_display", "ball_status_bar"]:
        p = os.path.join(I, f + ".png")
        if os.path.exists(p):
            png_rgba(p).save(os.path.join(OUT, f"ui_{f}.png"))
    BL = os.path.join(EM, "graphics/balls")
    for f in os.listdir(BL):
        if f.endswith(".png"):
            png_rgba(os.path.join(BL, f)).save(os.path.join(OUT, f"ball_{f}"))
    # 招式特效
    A = os.path.join(EM, "graphics/battle_anims/sprites")
    os.makedirs(os.path.join(OUT, "anim"), exist_ok=True)
    anims = []
    pals = {f[:-4]: os.path.join(A, f) for f in os.listdir(A) if f.endswith(".pal")}
    for f in sorted(os.listdir(A)):
        if not f.endswith(".png"):
            continue
        name = f[:-4]
        base = re.sub(r"(_\d+)$", "", name)
        pal = pals.get(name) or pals.get(base)
        try:
            png_rgba(os.path.join(A, f), pal).save(os.path.join(OUT, "anim", f))
            anims.append(name)
        except Exception as e:  # noqa: BLE001
            print("  略過", f, e)
    # 文字視窗外框
    T = os.path.join(EM, "graphics/text_window")
    for f in ["1.png", "message_box.png"]:
        p = os.path.join(T, f)
        if os.path.exists(p):
            png_rgba(p).save(os.path.join(OUT, "ui_window_" + f))
    return anims


MIDI = {
    "title": "mus_title", "town": "mus_oldale", "home": "mus_littleroot", "route": "mus_route101", "route2": "mus_route110",
    "route3": "mus_route119", "surf": "mus_surf", "center": "mus_poke_center", "mart": "mus_poke_mart", "lab": "mus_birch_lab",
    "battle_wild": "mus_vs_wild", "battle_trainer": "mus_vs_trainer", "battle_gym": "mus_vs_gym_leader",
    "battle_champion": "mus_vs_champion", "battle_legend": "mus_vs_kyogre_groudon",
    "victory_wild": "mus_victory_wild", "victory_trainer": "mus_victory_trainer", "victory_gym": "mus_victory_gym_leader",
    "victory_league": "mus_victory_league", "encounter": "mus_encounter_male", "gym": "mus_gym", "desert": "mus_route111",
    "evolution": "mus_evolution", "evolved": "mus_evolved", "heal": "mus_heal", "levelup": "mus_level_up", "caught": "mus_caught",
    "badge": "mus_obtain_badge", "item": "mus_obtain_item", "hall_of_fame": "mus_hall_of_fame", "cave": "mus_cave_of_origin",
    "city": "mus_slateport", "city2": "mus_lilycove", "town2": "mus_fallarbor", "snow": "mus_route120", "ever_grande": "mus_ever_grande",
}


# 遊戲音效名稱 → pokeemerald 的音效 MIDI
SE = {
    "run": "se_flee", "select": "se_select", "hit": "se_effective", "hit_super": "se_super_effective", "hit_weak": "se_not_effective",
    "ball_throw": "se_ball_throw", "ball_open": "se_ball_open", "ball_shake": "se_ball", "caught": "se_rg_ball_click", "faint": "se_faint",
    "door": "se_door", "bump": "se_wall_hit", "exp": "se_exp", "save": "se_save", "stat_up": "se_m_stat_increase",
    "stat_down": "se_m_stat_decrease", "pc": "se_pc_on", "use_item": "se_use_item", "low_health": "se_low_health", "shiny": "se_shiny",
    "repel": "se_repel", "exit": "se_exit", "ledge": "se_ledge",
}


def build_midi():
    M = os.path.join(EM, "sound/songs/midi")
    os.makedirs(os.path.join(OUT, "midi"), exist_ok=True)
    out = {}
    for k, f in list(MIDI.items()) + [("se_" + k, f) for k, f in SE.items()]:
        p = os.path.join(M, f + ".mid")
        if os.path.exists(p):
            shutil.copy(p, os.path.join(OUT, "midi", k + ".mid"))
            out[k] = f"midi/{k}.mid"
    # MIDI 以 base64 內嵌，讓 file:// 也能讀取
    import base64
    data = {k: base64.b64encode(open(os.path.join(OUT, v), "rb").read()).decode() for k, v in out.items()}
    with open(os.path.join(OUT, "midi.js"), "w", encoding="utf-8") as f:
        f.write("window.GEN3_MIDI=" + json.dumps(data) + ";\n")
    return list(out)


# 背包畫面：背景、背包圖（各口袋）、道具圖示圖集（24×24，每列 16 個）
def build_bag():
    B = os.path.join(EM, "graphics/bag")
    bg = render_tilemap(os.path.join(B, "menu.png"), os.path.join(B, "menu.bin"), os.path.join(B, "menu_male.pal"), 32)
    bg.crop((0, 0, 240, 160)).save(os.path.join(OUT, "bag_bg.png"))
    png_rgba(os.path.join(B, "bag_male.png"), os.path.join(B, "bag.pal")).save(os.path.join(OUT, "bag_sprite.png"))
    I = os.path.join(EM, "graphics/items/icons")
    P = os.path.join(EM, "graphics/items/icon_palettes")
    def snake(s):
        return re.sub(r"(?<!^)(?=[A-Z0-9])", "_", s).lower().replace("__", "_")
    # 道具 → (圖檔, 調色盤)，依 src/data/item_icon_table.h（多個道具共用一張圖、換調色盤）
    pairs = {}
    table = os.path.join(EM, "src/data/item_icon_table.h")
    if os.path.exists(table):
        for item, icon, pal in re.findall(r"\[ITEM_(\w+)\]\s*=\s*\{gItemIcon_(\w+),\s*gItemIconPalette_(\w+)\}", open(table, encoding="utf-8").read()):
            pairs[item.lower().replace("_", "-")] = (snake(icon), snake(pal))
    for f in os.listdir(I):
        if f.endswith(".png"):
            pairs.setdefault(f[:-4].replace("_", "-"), (f[:-4], f[:-4]))
    cols = 16
    items = sorted(pairs)
    sheet = Image.new("RGBA", (cols * 24, ((len(items) + cols - 1) // cols) * 24))
    idx = {}
    for name in items:
        icon, pal = pairs[name]
        png = os.path.join(I, icon + ".png")
        palp = os.path.join(P, pal + ".pal")
        if not os.path.exists(png):
            continue
        try:
            ic = png_rgba(png, palp if os.path.exists(palp) else None)
        except Exception:  # noqa: BLE001
            continue
        i = len(idx)
        sheet.paste(ic.crop((0, 0, 24, 24)), ((i % cols) * 24, (i // cols) * 24))
        idx[name] = i
    sheet = sheet.crop((0, 0, cols * 24, ((len(idx) + cols - 1) // cols) * 24))
    sheet.save(os.path.join(OUT, "item_icons.png"))
    print(f"  道具圖示 {len(idx)} 個")
    return idx


# 寶可夢圖片在戰鬥中的位置（pokeemerald：front/back_pic_coordinates.h、enemy_mon_elevation.h），以全國圖鑑編號對應
def build_pic_coords():
    G = os.path.join(EM, "src/data/pokemon_graphics")
    pokedex = json.loads(open(os.path.join(ROOT, "data", "pokedex.js"), encoding="utf-8").read()[len("window.POKEDEX="):-2])
    by_name = {v["en"].replace("-", "_").upper(): int(k) for k, v in pokedex.items()}

    def parse(fn, field):
        out = {}
        if not os.path.exists(os.path.join(G, fn)):
            return out
        src = open(os.path.join(G, fn), encoding="utf-8").read()
        for name, body in re.findall(r"\[SPECIES_(\w+)\]\s*=\s*([^\n]+)", src):
            m = re.search(field, body)
            if m and name in by_name:
                out[by_name[name]] = int(m.group(1))
        return out

    front = parse("front_pic_coordinates.h", r"\.y_offset\s*=\s*(\d+)")
    back = parse("back_pic_coordinates.h", r"\.y_offset\s*=\s*(\d+)")
    elev = parse("enemy_mon_elevation.h", r"^(\d+)")
    pic = {}
    for nid in set(front) | set(back):
        pic[nid] = [front.get(nid, 0), back.get(nid, 0), elev.get(nid, 0)]
    print(f"  圖片座標 {len(pic)} 種")
    return pic


def main():
    if not os.path.exists(EM):
        print("找不到 .cache/pokeemerald，請先 clone pret/pokeemerald")
        sys.exit(1)
    print("地形圖塊...")
    man = build_tiles()
    print("建築...")
    man["buildings"] = build_buildings()
    print("角色...")
    man["trainers"] = build_chars()
    print("戰鬥介面與特效...")
    man["anims"] = build_battle()
    print("音樂與音效...")
    man["midi"] = build_midi()
    man["pic"] = build_pic_coords()
    print("背包...")
    man["itemIcons"] = build_bag()
    with open(os.path.join(OUT, "manifest.js"), "w", encoding="utf-8") as f:
        f.write("window.GEN3=" + json.dumps(man, ensure_ascii=False) + ";\n")
    print("完成 →", OUT)


if __name__ == "__main__":
    main()
