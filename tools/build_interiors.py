"""從 pokeemerald 建置室內地圖：寶可夢中心、友好商店、主角家、研究所、各屬性的道館。

輸出（assets/gen3/，已列入 .gitignore）：
  int_<房間>.png       地板與在人物下方的圖層（每格 16×16）
  int_<房間>_top.png   蓋在人物上方的圖層（Emerald 的 NORMAL／SPLIT 圖層類型）
  npc_<外觀>.png       房間裡人物用到的行走圖
  interiors.js         window.INTERIORS = { 房間: { w, h, coll, counter, pc, npcs, exits } }

碰撞取自地圖區塊的 collision 位元；櫃台（MB_COUNTER）可以隔著說話；道館只收錄
「從入口走得到館主」的地圖（有機關的道館靠事件才能通過，暫時不收）。
"""
import json
import os
import re
import sys
from collections import deque

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen3_tiles import load_layout, png_rgba  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EM = os.path.join(ROOT, ".cache", "pokeemerald")
OUT = os.path.join(ROOT, "assets", "gen3")
PEOPLE = os.path.join(EM, "graphics/object_events/pics/people")

beh_src = open(os.path.join(EM, "include/constants/metatile_behaviors.h"), encoding="utf-8").read()
BEH = {n: i for i, n in enumerate(re.findall(r"^\s*(MB_\w+)", beh_src, re.M))}

# 房間：地圖名稱、保留的人物（graphics_id → 角色），其餘人物不放
ROOMS = {
    "center": ("OldaleTown_PokemonCenter_1F", {"NURSE": "nurse", "GENTLEMAN": "tm", "BOY_1": "talk", "GIRL_3": "talk"}),
    "mart": ("OldaleTown_Mart", {"MART_EMPLOYEE": "clerk", "WOMAN_5": "talk", "BOY_1": "talk"}),
    "house": ("LittlerootTown_BrendansHouse_1F", {"MOM": "mom"}),
    "lab": ("LittlerootTown_ProfessorBirchsLab", {"PROF_BIRCH": "prof", "SCIENTIST_1": "talk"}),
    # 城鎮的小屋：兩個人物位置，由城鎮配置指定的事件（data/towns.js）決定角色與外觀
    "house_s": ("PetalburgCity_House1", {"EXPERT_M": "ev0", "GIRL_1": "ev1"}),
}
# 額外的建築外觀（從橙華市裁切）：小屋 4×4（門在左起第 2 格）、告示牌 1×1
EXTRA_BLDGS = {"house_s": ("LAYOUT_PETALBURG_CITY", 9, 16, 4, 4, 1), "sign": ("LAYOUT_PETALBURG_CITY", 8, 9, 1, 1, 0)}
# 道館：依館主的屬性選用綠寶石的道館（館主＝第一個 gym_leaders 外觀的人物）
GYMS = {
    "rock": "RustboroCity_Gym", "fighting": "DewfordTown_Gym", "electric": "MauvilleCity_Gym", "fire": "LavaridgeTown_Gym_1F",
    "normal": "PetalburgCity_Gym", "flying": "FortreeCity_Gym", "psychic": "MossdeepCity_Gym", "water": "SootopolisCity_Gym_1F",
}
# 寶可夢聯盟：大廳（護士、店員、兩位警衛）→ 四天王的四個房間 → 冠軍的房間
# 入口是最下面的傳送點，往下一間的門（goals）是最上面的傳送點
LEAGUE = {
    "league": ("EverGrandeCity_PokemonLeague_1F", {"NURSE": "nurse", "MART_EMPLOYEE": "clerk", "MAN_3": "guard"}),
    "league_e0": ("EverGrandeCity_SidneysRoom", {"SIDNEY": "elite"}),
    "league_e1": ("EverGrandeCity_PhoebesRoom", {"PHOEBE": "elite"}),
    "league_e2": ("EverGrandeCity_GlaciasRoom", {"GLACIA": "elite"}),
    "league_e3": ("EverGrandeCity_DrakesRoom", {"DRAKE": "elite"}),
    "league_champ": ("EverGrandeCity_ChampionsRoom", {"WALLACE": "champion"}),
}
# 洞窟解謎（怪力推石頭）：入口是最下面的傳送點，終點是最上面的傳送點，其他傳送點擋住
CAVES = {"cave_a": "SeafloorCavern_Room8", "cave_b": "SeafloorCavern_Room5", "cave_c": "SeafloorCavern_Room2"}
LEADER_GFX = {"ROXANNE", "BRAWLY", "WATTSON", "FLANNERY", "NORMAN", "WINONA", "TATE", "LIZA", "JUAN"}
# 人物外觀 → 行走圖檔名
GFX_FILE = {"NURSE": "nurse", "GENTLEMAN": "gentleman", "BOY_1": "boy_1", "GIRL_3": "girl_3", "MART_EMPLOYEE": "mart_employee",
            "WOMAN_5": "woman_5", "MOM": "mom", "PROF_BIRCH": "prof_birch", "SCIENTIST_1": "scientist_1", "MAN_2": "man_2",
            "YOUNGSTER": "youngster", "HIKER": "hiker", "LASS": "lass", "BLACK_BELT": "black_belt", "BATTLE_GIRL": "black_belt",
            "PSYCHIC_M": "psychic_m", "BEAUTY": "beauty", "PICNICKER": "picnicker", "CAMPER": "camper", "BIRD_KEEPER": "man_1",
            "GENTLEMAN_2": "gentleman", "MAN_1": "man_1", "WOMAN_2": "woman_2", "TUBER_F": "tuber_f", "TUBER_M": "tuber_m",
            "SWIMMER_F": "swimmer_f", "SWIMMER_M": "swimmer_m", "GIRL_1": "girl_1", "EXPERT_M": "expert_m", "EXPERT_F": "expert_f",
            "HEX_MANIAC": "hex_maniac", "MANIAC": "maniac", "GUITARIST": "man_3", "SCHOOL_KID_M": "school_kid_m", "LADY": "woman_4",
            "POKEFAN_M": "pokefan_m", "SIDNEY": "e4_sidney", "PHOEBE": "e4_phoebe", "GLACIA": "e4_glacia", "DRAKE": "e4_drake", "WALLACE": "wallace", "POKEFAN_F": "pokefan_f", "COOK": "cook", "WOMAN_4": "woman_4", "MAN_3": "man_3", "MAN_4": "man_4"}
DIRS = {"FACE_DOWN": "down", "FACE_UP": "up", "FACE_LEFT": "left", "FACE_RIGHT": "right"}


def attrs(pair, m):
    ts = pair.p if m < 512 else pair.s
    i = m if m < 512 else m - 512
    return ts.attrs[i] if i < len(ts.attrs) else 0


def room(map_name, keep, gym=False):
    d = json.load(open(os.path.join(EM, "data/maps", map_name, "map.json"), encoding="utf-8"))
    lid = d["layout"]
    pair, w, h, blocks = load_layout(EM, lid)
    bg = Image.new("RGBA", (w * 16, h * 16), (0, 0, 0, 255))
    top = Image.new("RGBA", (w * 16, h * 16), (0, 0, 0, 0))
    coll, counter, pc = [], [], []
    for y in range(h):
        for x in range(w):
            b = blocks[y * w + x]
            m, c = b & 0x3FF, (b >> 10) & 3
            a = attrs(pair, m)
            beh, layer = a & 0xFF, (a >> 12) & 0xF
            # 圖層類型：0 NORMAL（下層在人物下、上層在人物上）、1 COVERED（兩層都在人物下）、2 SPLIT（同 NORMAL）
            bg.alpha_composite(pair.render(m, layers=(0, 1) if layer == 1 else (0,)), (x * 16, y * 16))
            if layer != 1:
                top.alpha_composite(pair.render(m, layers=(1,), backdrop=False), (x * 16, y * 16))
            coll.append("1" if c else "0")
            if beh == BEH.get("MB_COUNTER"):
                counter.append([x, y])
            if beh in (BEH.get("MB_PC"), BEH.get("MB_CLOSED_SOOTOPOLIS_DOOR")) and beh == BEH.get("MB_PC"):
                pc.append([x, y])
    exits = [[wv["x"], wv["y"]] for wv in d.get("warp_events", []) if "_GYM" not in wv["dest_map"] and wv["y"] >= h - 2]
    # 出口格可以通行；離開房間的其他傳送點（樓梯、機關）擋住
    for wv in d.get("warp_events", []):
        if [wv["x"], wv["y"]] not in exits:
            coll[wv["y"] * w + wv["x"]] = "1"
    npcs = []
    for o in d.get("object_events", []):
        g = o.get("graphics_id", "").replace("OBJ_EVENT_GFX_", "")
        mv = o.get("movement_type", "").replace("MOVEMENT_TYPE_", "")
        dir_ = DIRS.get(mv, "down")
        if gym and g in LEADER_GFX:
            npcs.append({"x": o["x"], "y": o["y"], "gfx": "leader_" + g.lower(), "dir": "down", "role": "leader"})
        elif gym and g == "MAN_2" and "GymGuide" in (o.get("script") or ""):
            npcs.append({"x": o["x"], "y": o["y"], "gfx": "man_2", "dir": dir_, "role": "guide"})
        elif gym and "trainer_type" in o and o.get("trainer_type") not in ("TRAINER_TYPE_NONE", "0") and g in GFX_FILE:
            npcs.append({"x": o["x"], "y": o["y"], "gfx": GFX_FILE[g], "dir": dir_, "role": "gymTrainer"})
        elif not gym and g in keep and g in GFX_FILE and not any(n["x"] == o["x"] and n["y"] == o["y"] for n in npcs):
            npcs.append({"x": o["x"], "y": o["y"], "gfx": GFX_FILE[g], "dir": dir_, "role": keep[g]})
    return lid, w, h, bg, top, coll, counter, pc, npcs, exits


def reachable(w, h, coll, npcs, start, goal):
    """從入口走到目標（目標前一格）是否可行；人物所在格不能通行。"""
    block = {(n["x"], n["y"]) for n in npcs}
    seen = {tuple(start)}
    q = deque([tuple(start)])
    while q:
        x, y = q.popleft()
        if abs(x - goal[0]) + abs(y - goal[1]) == 1:
            return True
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and coll[ny * w + nx] == "0" and (nx, ny) not in block:
                seen.add((nx, ny))
                q.append((nx, ny))
    return False


MAX_OPEN = 4


def open_path(w, h, coll, npcs, start, goal, bg, top):
    """機關道館（紫堇市的電力柵欄、釜炎鎮的洞、橙華市的房門、綠嶺市的旋轉地板）在這個遊戲沒有機關，
    從入口走不到館主時：找「穿過最少障礙格」的路線，把路上的障礙格改成可以走，
    圖換成旁邊的地板（看起來像打開的柵欄、門），前景清空。最外圈的牆與人物所在的格子不打開。回傳打開的格數。"""
    import heapq
    block = {(n["x"], n["y"]) for n in npcs}
    INF = 10 ** 9
    dist = {tuple(start): 0}
    prev = {}
    pq = [(0, tuple(start))]
    end = None
    while pq:
        d0, (x, y) = heapq.heappop(pq)
        if d0 > dist.get((x, y), INF):
            continue
        if abs(x - goal[0]) + abs(y - goal[1]) == 1:
            end = (x, y)
            break
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (1 <= nx < w - 1 and 1 <= ny < h - 1) or (nx, ny) in block:
                continue
            cost = 1 if coll[ny * w + nx] == "0" else 200
            if d0 + cost < dist.get((nx, ny), INF):
                dist[(nx, ny)] = d0 + cost
                prev[(nx, ny)] = (x, y)
                heapq.heappush(pq, (d0 + cost, (nx, ny)))
    if not end:
        return 0
    path = [end]
    while path[-1] in prev:
        path.append(prev[path[-1]])
    opened = [(x, y) for (x, y) in path if coll[y * w + x] == "1"]
    # 地板的樣子：路線上原本就能走的格子（離被打開的格子最近的那一格）
    floor = [(x, y) for (x, y) in path if coll[y * w + x] == "0"]
    for (x, y) in opened:
        fx, fy = min(floor, key=lambda p: abs(p[0] - x) + abs(p[1] - y))
        tile = bg.crop((fx * 16, fy * 16, fx * 16 + 16, fy * 16 + 16))
        bg.paste(tile, (x * 16, y * 16))
        top.paste((0, 0, 0, 0), (x * 16, y * 16, x * 16 + 16, y * 16 + 16))
        coll[y * w + x] = "0"
    return len(opened)


def save_sprite(gfx):
    out = os.path.join(OUT, f"npc_{gfx}.png")
    if gfx.startswith("leader_"):
        src = os.path.join(PEOPLE, "gym_leaders", gfx[7:] + ".png")
    elif gfx.startswith("e4_"):
        src = os.path.join(PEOPLE, "elite_four", gfx[3:] + ".png")
    else:
        src = os.path.join(PEOPLE, gfx + ".png")
    if not os.path.exists(src):
        return False
    png_rgba(src).save(out)
    return True


def main():
    data = {}
    todo = [(k, m, keep, False) for k, (m, keep) in ROOMS.items()] + [("gym_" + t, m, {}, True) for t, m in GYMS.items()]
    for key, map_name, keep, gym in todo:
        lid, w, h, bg, top, coll, counter, pc, npcs, exits = room(map_name, keep, gym)
        if not exits:
            print(f"  {key}: 找不到出口，略過")
            continue
        if gym:
            leader = next((n for n in npcs if n["role"] == "leader"), None)
            if not leader:
                print(f"  {key}（{map_name}）：沒有館主，略過")
                continue
            if not reachable(w, h, coll, npcs, exits[0], (leader["x"], leader["y"])):
                # 只打開少數幾格（柵欄、一兩格牆）；房間之間靠門或傳送台相連的道館（橙華市、綠嶺市）打開會很不自然，略過
                trial = list(coll)
                if open_path(w, h, trial, npcs, exits[0], (leader["x"], leader["y"]), bg.copy(), top.copy()) > MAX_OPEN:
                    print(f"  {key}（{map_name}）：要打開太多格才走得到館主，略過")
                    continue
                n = open_path(w, h, coll, npcs, exits[0], (leader["x"], leader["y"]), bg, top)
                if not reachable(w, h, coll, npcs, exits[0], (leader["x"], leader["y"])):
                    print(f"  {key}（{map_name}）：從入口走不到館主，略過")
                    continue
                print(f"  {key}（{map_name}）：沒有機關，打開路線上的 {n} 格障礙")
            # 原作要經過機關（樓下、傳送）才到得了的道館訓練家：這裡走不到，拿掉
            far = [t for t in npcs if t["role"] == "gymTrainer" and not reachable(w, h, coll, [x for x in npcs if x is not t], exits[0], (t["x"], t["y"]))]
            if far:
                npcs = [t for t in npcs if t not in far]
                print(f"  {key}：拿掉走不到的道館訓練家 {len(far)} 位")
        for n in npcs:
            if not save_sprite(n["gfx"]):
                print(f"  缺少人物圖 {n['gfx']}，改用一般人物")
                n["gfx"] = "man_1"
                save_sprite("man_1")
        bg.save(os.path.join(OUT, f"int_{key}.png"))
        top.save(os.path.join(OUT, f"int_{key}_top.png"))
        data[key] = {"map": map_name, "w": w, "h": h, "coll": "".join(coll), "counter": counter, "pc": pc, "npcs": npcs, "exits": exits}
        print(f"  {key}: {map_name} {w}×{h}，人物 {len(npcs)}，出口 {exits}")
    # 豐緣館主的行走圖（其他地區的館主沒有綠寶石的行走圖，遊戲中依屬性選一般人物）
    for key, (map_name, keep) in LEAGUE.items():
        d = json.load(open(os.path.join(EM, "data/maps", map_name, "map.json"), encoding="utf-8"))
        lid, w, h, bg, top, coll, counter, pc, npcs, exits = room(map_name, keep)
        top_y = min(wv["y"] for wv in d["warp_events"])
        goals = [[wv["x"], wv["y"]] for wv in d["warp_events"] if wv["y"] == top_y]
        for x, y in goals:
            coll[y * w + x] = "0"
        for n in npcs:
            if not save_sprite(n["gfx"]):
                n["gfx"] = "man_3"
                save_sprite("man_3")
        bg.save(os.path.join(OUT, f"int_{key}.png"))
        top.save(os.path.join(OUT, f"int_{key}_top.png"))
        data[key] = {"map": map_name, "w": w, "h": h, "coll": "".join(coll), "counter": counter, "pc": pc, "npcs": npcs, "exits": exits, "goals": goals}
        print(f"  {key}: {map_name} {w}×{h}，人物 {[n['role'] for n in npcs]}，入口 {exits}，往前 {goals}")
    for key, map_name in CAVES.items():
        d = json.load(open(os.path.join(EM, "data/maps", map_name, "map.json"), encoding="utf-8"))
        lid, w, h, bg, top, coll, counter, pc, npcs, exits = room(map_name, {})
        warps = sorted(([wv["x"], wv["y"]] for wv in d["warp_events"]), key=lambda p: p[1])
        goal, entry = warps[0], warps[-1]
        coll[goal[1] * w + goal[0]] = "0"
        for x, y in exits:
            if [x, y] != entry:
                coll[y * w + x] = "1"
        boulders = [[o["x"], o["y"]] for o in d["object_events"] if "BOULDER" in o.get("graphics_id", "")]
        bg.save(os.path.join(OUT, f"int_{key}.png"))
        top.save(os.path.join(OUT, f"int_{key}_top.png"))
        data[key] = {"map": map_name, "w": w, "h": h, "coll": "".join(coll), "counter": [], "pc": [], "npcs": [], "exits": [entry], "goal": goal, "boulders": boulders}
        print(f"  {key}: {map_name} {w}×{h}，石頭 {len(boulders)}，入口 {entry}，終點 {goal}")
    png_rgba(os.path.join(EM, "graphics/object_events/pics/misc/pushable_boulder.png")).save(os.path.join(OUT, "npc_boulder.png"))
    bl = {}
    for kind, (lid, x0, y0, w, h, door) in EXTRA_BLDGS.items():
        pair, lw, lh, blocks = load_layout(EM, lid)
        img = Image.new("RGBA", (w * 16, h * 16))
        for y in range(h):
            for x in range(w):
                img.alpha_composite(pair.render(blocks[(y0 + y) * lw + x0 + x] & 0x3FF), (x * 16, y * 16))
        img.save(os.path.join(OUT, f"bld_{kind}.png"))
        bl[kind] = {"w": w, "h": h, "door": door}
    data["_buildings"] = bl
    data["_leaders"] = sorted(g.lower() for g in LEADER_GFX if save_sprite("leader_" + g.lower()))
    # 依屬性代替的館主外觀
    for g in ["old_man", "sailor", "pokefan_m", "scientist_1", "gentleman", "hiker", "black_belt", "man_3", "expert_f", "psychic_m", "swimmer_f", "picnicker", "hex_maniac", "bug_catcher", "beauty", "expert_m", "camper", "maniac", "lass", "cook", "man_1", "girl_3", "woman_2"]:
        save_sprite(g)
    with open(os.path.join(OUT, "interiors.js"), "w", encoding="utf-8") as f:
        f.write("// 由 tools/build_interiors.py 產生\nwindow.INTERIORS = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")

    export_heal_fx()


def read_pal(path):
    lines = open(path, encoding="utf-8").read().splitlines()[3:19]
    return [tuple(int(v) for v in l.split()) for l in lines if l.strip()]


def export_heal_fx():
    """寶可夢中心治療機器的特效（src/field_effect.c 的 FldEff_PokecenterHeal）：
    fx_heal_ball.png：精靈球 8×8，8 格（前 4 格是 Flash1 的 4 個相位，後 4 格是 Flash2），
      閃光＝調色盤第 8、6、2、5、3 色依相位往白色混合（MultiplyInvertedPaletteRGBComponents，比例 16／12／8／0 ÷ 16）
    fx_heal_monitor.png：牆上的螢幕 24×16，2 格（交替閃爍）"""
    fe = os.path.join(EM, "graphics", "field_effects")
    ball = Image.open(os.path.join(fe, "pics", "pokeball_glow.png"))
    pal = read_pal(os.path.join(fe, "palettes", "pokeball_glow.pal"))
    idx = list(ball.getdata())
    K = [16, 12, 8, 0]
    def tint(c, k):  # 5 位元色彩往白色混合，和 GBA 相同的整數運算
        c5 = [v >> 3 for v in c]
        return tuple(round((v + (((31 - v) * k) >> 4)) * 255 / 31) for v in c5)
    def frame(phases):
        im = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
        for i, v in enumerate(idx):
            if v == 0:
                continue
            col = tint(pal[v], K[phases[v]]) if v in phases else pal[v]
            im.putpixel((i % 8, i // 8), col + (255,))
        return im
    sheet = Image.new("RGBA", (64, 8), (0, 0, 0, 0))
    for c in range(4):  # Flash1：第 8 色相位 (c+3)&3、第 6 色 (c+2)&3、第 2 色 (c+1)&3、第 5、3 色 c
        sheet.paste(frame({8: (c + 3) & 3, 6: (c + 2) & 3, 2: (c + 1) & 3, 5: c, 3: c}), (c * 8, 0))
    for c in range(4):  # Flash2：全部同一個相位
        sheet.paste(frame({8: c, 6: c, 2: c, 5: c, 3: c}), (32 + c * 8, 0))
    sheet.save(os.path.join(OUT, "fx_heal_ball.png"))
    gp = read_pal(os.path.join(fe, "palettes", "general_0.pal"))
    mon = Image.new("RGBA", (48, 16), (0, 0, 0, 0))
    for k in range(2):
        im = Image.open(os.path.join(fe, "pics", "pokecenter_monitor", f"{k}.png"))
        for i, v in enumerate(im.getdata()):
            if v:
                mon.putpixel((k * 24 + i % 24, i // 24), gp[v] + (255,))
    mon.save(os.path.join(OUT, "fx_heal_monitor.png"))
    print("  治療機器特效：fx_heal_ball.png、fx_heal_monitor.png")


if __name__ == "__main__":
    main()
