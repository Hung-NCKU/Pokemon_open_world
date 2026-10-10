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
}
# 道館：依館主的屬性選用綠寶石的道館（館主＝第一個 gym_leaders 外觀的人物）
GYMS = {
    "rock": "RustboroCity_Gym", "fighting": "DewfordTown_Gym", "electric": "MauvilleCity_Gym", "fire": "LavaridgeTown_Gym_1F",
    "normal": "PetalburgCity_Gym", "flying": "FortreeCity_Gym", "psychic": "MossdeepCity_Gym", "water": "SootopolisCity_Gym_1F",
}
LEADER_GFX = {"ROXANNE", "BRAWLY", "WATTSON", "FLANNERY", "NORMAN", "WINONA", "TATE", "LIZA", "JUAN"}
# 人物外觀 → 行走圖檔名
GFX_FILE = {"NURSE": "nurse", "GENTLEMAN": "gentleman", "BOY_1": "boy_1", "GIRL_3": "girl_3", "MART_EMPLOYEE": "mart_employee",
            "WOMAN_5": "woman_5", "MOM": "mom", "PROF_BIRCH": "prof_birch", "SCIENTIST_1": "scientist_1", "MAN_2": "man_2",
            "YOUNGSTER": "youngster", "HIKER": "hiker", "LASS": "lass", "BLACK_BELT": "black_belt", "BATTLE_GIRL": "black_belt",
            "PSYCHIC_M": "psychic_m", "BEAUTY": "beauty", "PICNICKER": "picnicker", "CAMPER": "camper", "BIRD_KEEPER": "man_1",
            "GENTLEMAN_2": "gentleman", "MAN_1": "man_1", "WOMAN_2": "woman_2", "TUBER_F": "tuber_f", "TUBER_M": "tuber_m",
            "SWIMMER_F": "swimmer_f", "SWIMMER_M": "swimmer_m", "GIRL_1": "girl_1", "EXPERT_M": "expert_m", "EXPERT_F": "expert_f",
            "HEX_MANIAC": "hex_maniac", "MANIAC": "maniac", "GUITARIST": "man_3", "SCHOOL_KID_M": "school_kid_m", "LADY": "woman_4",
            "POKEFAN_M": "pokefan_m", "POKEFAN_F": "pokefan_f", "COOK": "cook", "WOMAN_4": "woman_4", "MAN_3": "man_3", "MAN_4": "man_4"}
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


def save_sprite(gfx):
    out = os.path.join(OUT, f"npc_{gfx}.png")
    if gfx.startswith("leader_"):
        src = os.path.join(PEOPLE, "gym_leaders", gfx[7:] + ".png")
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
            if not leader or not reachable(w, h, coll, npcs, exits[0], (leader["x"], leader["y"])):
                print(f"  {key}（{map_name}）：從入口走不到館主，略過")
                continue
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
    data["_leaders"] = sorted(g.lower() for g in LEADER_GFX if save_sprite("leader_" + g.lower()))
    # 依屬性代替的館主外觀
    for g in ["hiker", "black_belt", "man_3", "expert_f", "psychic_m", "swimmer_f", "picnicker", "hex_maniac", "bug_catcher", "beauty", "expert_m", "camper", "maniac", "lass", "cook", "man_1", "girl_3", "woman_2"]:
        save_sprite(g)
    with open(os.path.join(OUT, "interiors.js"), "w", encoding="utf-8") as f:
        f.write("// 由 tools/build_interiors.py 產生\nwindow.INTERIORS = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    main()
