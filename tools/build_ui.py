"""綠寶石介面素材：圖鑑、訓練家卡片、隊伍畫面、地圖框（由 build_assets.py 呼叫，也可單獨執行）。

來源：pret/pokeemerald 的 graphics/pokedex、graphics/trainer_card、graphics/trainers、
graphics/party_menu、graphics/pokenav/region_map；圖層與調色盤的組合方式依 src/pokedex.c、
src/trainer_card.c、src/party_menu.c。
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen3_tiles import png_rgba, read_pal, render_tilemap  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EM = os.path.join(ROOT, ".cache", "pokeemerald")
OUT = os.path.join(ROOT, "assets", "gen3")


def _stack(w, h, back, *layers):
    o = Image.new("RGBA", (w, h), back + (255,))
    for im in layers:
        o.alpha_composite(im.crop((0, 0, w, h)))
    return o


def _png_pal(path):
    """索引色 PNG 內建的調色盤（取 GBA 的 15 位元色）。"""
    raw = Image.open(path).getpalette()
    return [((raw[i * 3] >> 3) << 3, (raw[i * 3 + 1] >> 3) << 3, (raw[i * 3 + 2] >> 3) << 3) for i in range(len(raw) // 3)]


def _write_pal(path, pal):
    with open(path, "w", encoding="ascii") as f:
        f.write("JASC-PAL\n0100\n%d\n" % len(pal))
        for c in pal:
            f.write("%d %d %d\n" % c)


def build_dex():
    D = os.path.join(EM, "graphics/pokedex")
    if not os.path.isdir(D):
        return False
    # 背景圖塊 menu.png（BG3），調色盤 bg_national.pal
    dpal = os.path.join(D, "bg_national.pal")
    back = read_pal(dpal)[0]
    tm = lambda name: render_tilemap(os.path.join(D, "menu.png"), os.path.join(D, name), dpal, 32)
    _stack(240, 160, back, tm("list_underlay.bin"), tm("list.bin")).save(os.path.join(OUT, "dex_list.png"))
    _stack(240, 160, back, tm("info_screen.bin"), tm("screen_select_bar_main.bin")).save(os.path.join(OUT, "dex_info.png"))
    png_rgba(os.path.join(D, "caught_ball.png")).save(os.path.join(OUT, "dex_ball.png"))
    return True


def build_card():
    C = os.path.join(EM, "graphics/trainer_card")
    if not os.path.isdir(C):
        return False
    tiles = os.path.join(C, "tiles.png")
    img = Image.open(tiles)
    px = img.load()
    spal = read_pal(os.path.join(C, "star.pal"))
    # 依星數換色：0 綠、1 銅、2 紅銅、3 銀、4 金
    for k, name in enumerate(["green", "bronze", "copper", "silver", "gold"]):
        pal = os.path.join(C, name + ".pal")
        bg = render_tilemap(tiles, os.path.join(C, "bg.bin"), pal, 30)
        for side in ("front", "back"):
            _stack(240, 160, read_pal(pal)[0], bg, render_tilemap(tiles, os.path.join(C, side + ".bin"), pal, 30)).save(os.path.join(OUT, f"card_{side}_{k}.png"))
    # 星星：圖塊 143，調色盤 star.pal
    star = Image.new("RGBA", (8, 8))
    for y in range(8):
        for x in range(8):
            ci = px[120 + x, 64 + y] & 15
            if ci:
                star.putpixel((x, y), spal[ci] + (255,))
    star.save(os.path.join(OUT, "card_star.png"))
    png_rgba(os.path.join(C, "badges.png")).save(os.path.join(OUT, "card_badges.png"))
    if os.path.exists(os.path.join(C, "frlg", "badges.png")):  # 關都徽章（火紅／葉綠）
        png_rgba(os.path.join(C, "frlg", "badges.png")).save(os.path.join(OUT, "card_badges_kanto.png"))
    T = os.path.join(EM, "graphics/trainers")
    if os.path.isdir(T):
        png_rgba(os.path.join(T, "front_pics/brendan.png"), os.path.join(T, "palettes/brendan.pal")).save(os.path.join(OUT, "trainer_brendan.png"))
    return True


def build_party():
    P = os.path.join(EM, "graphics/party_menu")
    if not os.path.isdir(P):
        return False
    bgpng = os.path.join(P, "bg.png")
    pal = _png_pal(bgpng)
    tmp = os.path.join(OUT, "_party.pal")
    _write_pal(tmp, pal)
    render_tilemap(bgpng, os.path.join(P, "bg.bin"), tmp, 32).crop((0, 0, 240, 160)).save(os.path.join(OUT, "party_bg.png"))
    os.remove(tmp)
    img = Image.open(bgpng)
    px = img.load()
    tw = img.size[0] // 8

    # 格子是以背景圖塊編號（u8）組成的點陣圖，視窗調色盤第 3 列再替換部分顏色
    def blit(name, w, h, row):
        data = open(os.path.join(P, name), "rb").read()
        out = Image.new("RGBA", (w * 8, h * 8))
        for i in range(w * h):
            t = data[i]
            for y in range(8):
                for x in range(8):
                    ci = px[(t % tw) * 8 + x, (t // tw) * 8 + y] & 15
                    if ci:
                        out.putpixel(((i % w) * 8 + x, (i // w) * 8 + y), row[ci] + (255,))
        return out

    states = {  # 狀態: (調色盤編號 → 顏色 4,5,6；→ 顏色 1,7,8)
        "normal": ((52, 53, 54), (49, 55, 56)),
        "sel": ((116, 117, 118), (97, 103, 104)),
        "faint": ((84, 85, 86), (81, 87, 88)),
        "faintsel": ((148, 149, 150), (97, 103, 104)),
        "switch": ((100, 101, 102), (161, 167, 168)),
    }
    for st, (a, b) in states.items():
        row = list(pal[3 * 16:4 * 16])
        for off, pid in zip((4, 5, 6), a):
            row[off] = pal[pid]
        for off, pid in zip((1, 7, 8), b):
            row[off] = pal[pid]
        row[9], row[10] = pal[57], pal[58]
        blit("slot_main.bin", 10, 7, row).save(os.path.join(OUT, f"party_main_{st}.png"))
        blit("slot_wide.bin", 18, 3, row).save(os.path.join(OUT, f"party_wide_{st}.png"))
    row = list(pal[3 * 16:4 * 16])
    for off, pid in zip((1, 11, 12), (17, 27, 28)):
        row[off] = pal[pid]
    blit("slot_wide_empty.bin", 18, 3, row).save(os.path.join(OUT, "party_wide_empty.png"))
    png_rgba(os.path.join(P, "pokeball.png")).save(os.path.join(OUT, "party_ball.png"))
    png_rgba(os.path.join(P, "hold_icons.png")).save(os.path.join(OUT, "party_hold.png"))  # 攜帶道具（上）、信件（下）
    return True


def build_map():
    """城鎮地圖（飛翔畫面）的外框、游標、主角圖示（graphics/pokenav/region_map）。"""
    R = os.path.join(EM, "graphics/pokenav/region_map")
    if not os.path.isdir(R):
        return False
    tmp = os.path.join(OUT, "_frame.pal")
    _write_pal(tmp, _png_pal(os.path.join(R, "frame.png")))
    render_tilemap(os.path.join(R, "frame.png"), os.path.join(R, "frame.bin"), tmp, 32, pal_offset=1).crop((0, 0, 240, 160)).save(os.path.join(OUT, "map_frame.png"))
    os.remove(tmp)
    png_rgba(os.path.join(R, "cursor_small.png")).save(os.path.join(OUT, "map_cursor.png"))
    png_rgba(os.path.join(R, "brendan_icon.png")).save(os.path.join(OUT, "map_player.png"))
    return True


def build_summary():
    """能力頁（graphics/summary_screen）：資料頁為底，能力、招式頁疊在右側。"""
    S = os.path.join(EM, "graphics/summary_screen")
    if not os.path.isdir(S):
        return False
    tiles = os.path.join(S, "tiles.png")
    pal = _png_pal(tiles)
    tmp = os.path.join(OUT, "_sum.pal")
    _write_pal(tmp, pal)
    tm = lambda n: render_tilemap(tiles, os.path.join(S, n + ".bin"), tmp, 32)
    info = tm("page_info")
    _stack(240, 160, pal[0], info).save(os.path.join(OUT, "sum_info.png"))
    _stack(240, 160, pal[0], info, tm("page_skills")).save(os.path.join(OUT, "sum_skills.png"))
    _stack(240, 160, pal[0], info, tm("page_battle_moves")).save(os.path.join(OUT, "sum_moves.png"))
    os.remove(tmp)
    return True


def build_storage():
    """寶可夢寄放系統（graphics/pokemon_storage）：捲動背景、左側資料欄、16 種箱子桌布、手形游標。"""
    S = os.path.join(EM, "graphics/pokemon_storage")
    if not os.path.isdir(S):
        return []
    tmp = os.path.join(OUT, "_st.pal")
    # 捲動背景
    _write_pal(tmp, read_pal(os.path.join(S, "scrolling_bg.pal")))
    render_tilemap(os.path.join(S, "scrolling_bg.png"), os.path.join(S, "scrolling_bg.bin"), tmp, 32, pal_offset=3).crop((0, 0, 256, 256)).save(os.path.join(OUT, "pc_scroll.png"))
    # 左側資料欄（menu.png ＋ interface.pal）
    # 圖塊編號從 0x100 開始（menu.png 載入在第 256 格）
    import struct
    _write_pal(tmp, read_pal(os.path.join(S, "interface.pal")))
    try:
        raw = open(os.path.join(S, "display_menu.bin"), "rb").read()
        fixed = b"".join(struct.pack("<H", (e & 0xFC00) | max(0, (e & 0x3FF) - 256)) for e in struct.unpack("<%dH" % (len(raw) // 2), raw))
        tb = os.path.join(OUT, "_dm.bin")
        open(tb, "wb").write(fixed)
        render_tilemap(os.path.join(S, "menu.png"), tb, tmp, 32).crop((0, 0, 240, 160)).save(os.path.join(OUT, "pc_panel.png"))
        os.remove(tb)
    except Exception as e:  # noqa: BLE001
        print("  資料欄失敗", e)
    # 桌布：frame.png 的圖塊後面接 bg.png 的圖塊；調色盤第 0 列 frame、第 1 列 bg
    names = []
    W = os.path.join(S, "wallpapers")
    for name in ["forest", "city", "desert", "savanna", "crag", "volcano", "snow", "cave", "beach", "seafloor", "river", "sky", "polkadot", "pokecenter", "machine", "plain"]:
        d = os.path.join(W, name)
        if not os.path.exists(os.path.join(d, "tilemap.bin")):
            continue
        fr, bg = Image.open(os.path.join(d, "frame.png")), Image.open(os.path.join(d, "bg.png"))
        # 實際的圖塊資料會去掉 frame 後面空白的圖塊：bg 的圖塊接在「圖塊表用到的最大編號 − bg 圖塊數 + 1」
        import struct
        raw = open(os.path.join(d, "tilemap.bin"), "rb").read()
        maxt = max(e & 0x3FF for e in struct.unpack("<%dH" % (len(raw) // 2), raw))
        bgt = [bg.crop((tx * 8, ty * 8, tx * 8 + 8, ty * 8 + 8)) for ty in range(bg.size[1] // 8) for tx in range(bg.size[0] // 8)]
        nframe = maxt + 1 - len(bgt)
        tiles = [fr.crop((tx * 8, ty * 8, tx * 8 + 8, ty * 8 + 8)) for ty in range(fr.size[1] // 8) for tx in range(fr.size[0] // 8)][:nframe] + bgt
        sheet = Image.new("P", (128, ((len(tiles) + 15) // 16) * 8))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % 16) * 8, (i // 16) * 8))
        pal = _png_pal(os.path.join(d, "frame.png"))[:16] + _png_pal(os.path.join(d, "bg.png"))[:16]
        flat = [c for rgb in pal for c in rgb] + [0] * (768 - len(pal) * 3)
        sheet.putpalette(flat)
        sp = os.path.join(OUT, "_wp.png")
        sheet.save(sp)
        _write_pal(tmp, pal)
        # 圖塊表的調色盤 1 = frame、2 = bg（0 是透明的背景色）
        im = render_tilemap(sp, os.path.join(d, "tilemap.bin"), tmp, 20, 18, pal_offset=1)
        # 箱子本體（第 4 列以下）的透明處填上 bg 調色盤的第 0 色（GBA 的背景色）
        px = im.load()
        base = pal[16] + (255,)
        for y in range(32, im.size[1]):
            for x in range(im.size[0]):
                if px[x, y][3] == 0:
                    px[x, y] = base
        im.save(os.path.join(OUT, f"pc_wp_{name}.png"))
        os.remove(sp)
        names.append(name)
    # 隊伍面板（party_menu.bin，12×22 格，調色盤 1＝party_menu.pal）：上面 20 列是面板、最下面 2 列是「PARTY POKéMON」按鈕；
    # 右邊 5 格依有沒有寶可夢換成 party_slot_filled／empty（4×3 格）；右上角的 CLOSE BOX 按鈕（close_box_button.bin，9×4 格，上下兩列是一般與閃爍）
    def fixbin(src, dst):
        raw = open(src, "rb").read()
        v = struct.unpack("<%dH" % (len(raw) // 2), raw)
        open(dst, "wb").write(b"".join(struct.pack("<H", (e & 0xFC00) | max(0, (e & 0x3FF) - 256)) for e in v))
    _write_pal(tmp, read_pal(os.path.join(S, "interface.pal"))[:16] + read_pal(os.path.join(S, "party_menu.pal"))[:16])
    tb = os.path.join(OUT, "_pt.bin")
    for name, f, w, h in [("pc_party", "party_menu.bin", 12, 22), ("pc_slot_filled", "party_slot_filled.bin", 4, 3), ("pc_slot_empty", "party_slot_empty.bin", 4, 3), ("pc_closebox", "close_box_button.bin", 9, 4)]:
        fixbin(os.path.join(S, f), tb)
        im = render_tilemap(os.path.join(S, "menu.png"), tb, tmp, w, h)
        if name == "pc_party":
            im.crop((0, 0, 96, 160)).save(os.path.join(OUT, "pc_party.png"))
            im.crop((0, 160, 96, 176)).save(os.path.join(OUT, "pc_party_tab.png"))
        else:
            im.save(os.path.join(OUT, name + ".png"))
    os.remove(tb)
    png_rgba(os.path.join(S, "hand_cursor.png")).save(os.path.join(OUT, "pc_hand.png"))
    png_rgba(os.path.join(S, "arrow.png")).save(os.path.join(OUT, "pc_arrow.png"))
    os.remove(tmp)
    return names


def build_shop():
    """友好商店的購買畫面框（graphics/shop/menu.png + menu.bin，調色盤取自 png 內建）。
    透明的部分（左上）在遊戲中會看到商店的地圖，和原作一樣。"""
    S = os.path.join(EM, "graphics/shop")
    if not os.path.exists(os.path.join(S, "menu.bin")):
        return False
    tmp = os.path.join(OUT, "_shop.pal")
    _write_pal(tmp, _png_pal(os.path.join(S, "menu.png"))[:16])
    render_tilemap(os.path.join(S, "menu.png"), os.path.join(S, "menu.bin"), tmp, 32).crop((0, 0, 240, 160)).save(os.path.join(OUT, "ui_shop.png"))
    os.remove(tmp)
    return True


def _tiles_rgba(path, pal_from=None):
    """索引色 PNG 切成 8×8 的格子（RGBA，索引 0 透明）；調色盤取自 pal_from（另一張 PNG）或自己。"""
    img = Image.open(path)
    pal = _png_pal(pal_from or path)
    w, h = img.size
    px = img.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            c = px[x, y] & 15
            if c:
                op[x, y] = pal[c] + (255,)
    cols = w // 8
    return [out.crop(((i % cols) * 8, (i // cols) * 8, (i % cols) * 8 + 8, (i // cols) * 8 + 8)) for i in range(cols * (h // 8))], out, pal


def build_msgbox():
    """野外的對話框（src/menu.c 的 WindowFunc_DrawDialogueFrame，graphics/text_window/message_box.png）：
    視窗在 (2,15) 寬 27 高 4 格，外框從第 0 欄到第 29 欄、第 14 列到第 19 列 → 240×48 的整張圖"""
    p = os.path.join(EM, "graphics/text_window/message_box.png")
    if not os.path.exists(p):
        return False
    t, _, _ = _tiles_rgba(p)
    W, H = 30, 6
    o = Image.new("RGBA", (W * 8, H * 8), (0, 0, 0, 0))
    def put(i, x, y, vf=False):
        im = t[i].transpose(Image.FLIP_TOP_BOTTOM) if vf else t[i]
        o.alpha_composite(im, (x * 8, y * 8))
    for row, vf in ((0, False), (H - 1, True)):
        put(1, 0, row, vf); put(3, 1, row, vf)
        for x in range(2, 28):
            put(4, x, row, vf)
        put(5, 28, row, vf); put(6, 29, row, vf)
    for y in range(1, H - 1):
        put(7, 0, y)
        for x in range(1, 29):
            put(9, x, y)
        put(10, 29, y)
    o.save(os.path.join(OUT, "ui_msgbox.png"))
    return True


POPUP_THEMES = ["wood", "marble", "stone", "brick", "underwater", "stone2"]


def build_popups():
    """地名看板（src/map_name_popup.c）：外框 12×5 格（上緣 12 格、左右各 3 格、下緣 12 格）＋中間 80×24 的底圖。
    調色盤：木頭用 wood.png 的，其他用外框圖的；文字顏色是調色盤第 2（字）、第 3（陰影）色"""
    D = os.path.join(EM, "graphics/map_popup")
    if not os.path.exists(D):
        return False
    colors = {}
    for th in POPUP_THEMES:
        pal_src = os.path.join(D, "wood.png" if th == "wood" else th + "_outline.png")
        frame, _, pal = _tiles_rgba(os.path.join(D, th + "_outline.png"), pal_src)
        _, inner, _ = _tiles_rgba(os.path.join(D, th + ".png"), pal_src)
        o = Image.new("RGBA", (96, 40), (0, 0, 0, 0))
        for i in range(12):
            o.alpha_composite(frame[i], (i * 8, 0))
            o.alpha_composite(frame[18 + i], (i * 8, 32))
        for k in range(3):
            o.alpha_composite(frame[12 + k * 2], (0, 8 + k * 8))
            o.alpha_composite(frame[13 + k * 2], (88, 8 + k * 8))
        o.alpha_composite(inner, (8, 8))
        o.save(os.path.join(OUT, f"popup_{th}.png"))
        colors[th] = ["#%02x%02x%02x" % pal[2], "#%02x%02x%02x" % pal[3]]
    return colors


def build_naming():
    """取名字的畫面（src/naming_screen.c）：背景（background.bin）＋三頁鍵盤（大寫藍、小寫橘、符號綠，keyboard_*.bin），
    調色盤＝menu／page_swap_upper／page_swap_lower／page_swap_others／buttons／cursor 六組，keyboard.pal 在第 10 組；
    右邊的按鈕（換頁、刪除、確定）與游標是精靈圖，各自用 buttons.pal、page_swap_*.pal、cursor.pal"""
    D = os.path.join(EM, "graphics/naming_screen")
    if not os.path.exists(D):
        return False
    pad = lambda p: (p + [(0, 0, 0)] * 16)[:16]
    pal = []
    for f in ["menu", "page_swap_upper", "page_swap_lower", "page_swap_others", "buttons", "cursor"]:
        pal += pad(read_pal(os.path.join(D, f + ".pal")))
    pal += [(0, 0, 0)] * 64 + pad(read_pal(os.path.join(D, "keyboard.pal"))) + [(0, 0, 0)] * 80
    tmp = os.path.join(OUT, "_ns.pal")
    _write_pal(tmp, pal)
    bg = render_tilemap(os.path.join(D, "menu.png"), os.path.join(D, "background.bin"), tmp, 32).crop((0, 0, 240, 160))
    for page in ("upper", "lower", "symbols"):
        o = Image.new("RGBA", (240, 160), (0, 0, 0, 255))
        o.alpha_composite(bg)
        o.paste(o.crop((0, 144, 240, 160)), (0, 0))  # 最上面兩列在原作是空的（底下的條紋層），用最下面的條紋補上
        o.alpha_composite(render_tilemap(os.path.join(D, "menu.png"), os.path.join(D, f"keyboard_{page}.bin"), tmp, 32).crop((0, 0, 240, 160)))
        o.save(os.path.join(OUT, f"ns_{page}.png"))
    os.remove(tmp)
    # 精靈圖：依各自的調色盤上色（索引 0 透明）
    def sprite(name, palname):
        im = Image.open(os.path.join(D, name + ".png"))
        sp = pad(read_pal(os.path.join(D, palname + ".pal")))
        o = Image.new("RGBA", im.size, (0, 0, 0, 0))
        px, op = im.load(), o.load()
        for y in range(im.size[1]):
            for x in range(im.size[0]):
                c = px[x, y] & 15
                if c:
                    op[x, y] = sp[c] + (255,)
        o.save(os.path.join(OUT, f"ns_{name}.png"))
    for name, palname in [("page_swap_frame", "buttons"), ("ok_button", "buttons"), ("back_button", "buttons"), ("page_swap_upper", "page_swap_upper"),
                          ("page_swap_lower", "page_swap_lower"), ("page_swap_others", "page_swap_others"), ("cursor", "cursor"), ("input_arrow", "cursor"), ("underscore", "cursor")]:
        if os.path.exists(os.path.join(D, name + ".png")):
            sprite(name, palname)
    return True


def build_all():
    return {"dex": build_dex(), "card": build_card(), "party": build_party(), "map": build_map(), "summary": build_summary(), "storage": build_storage(), "shop": build_shop(),
            "msgbox": build_msgbox(), "popups": build_popups(), "naming": build_naming()}


if __name__ == "__main__":
    print(build_all())
