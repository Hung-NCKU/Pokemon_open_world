"""從 PokéAPI 抓取全部寶可夢 / 招式資料，輸出成遊戲用的 data/*.js。

用法:  python tools/fetch_data.py [快取資料夾]
原始 JSON 會快取在快取資料夾，重跑時不會重複下載。
"""
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

API = "https://pokeapi.co/api/v2/"
MAX_ID = 1025
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, ".cache")
os.makedirs(CACHE, exist_ok=True)

# 不採用的版本組（學習方式與主系列不同）
SKIP_VG = {"legends-arceus", "legends-za", "colosseum", "xd",
           "lets-go-pikachu-lets-go-eevee", "red-green-japan", "blue-japan"}


def get(path):
    fn = os.path.join(CACHE, path.strip("/").replace("/", "_") + ".json")
    if os.path.exists(fn):
        with open(fn, encoding="utf-8") as f:
            return json.load(f)
    url = path if path.startswith("http") else API + path
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "pokemon-fan-research"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
            with open(fn, "w", encoding="utf-8") as f:
                json.dump(data, f)
            return data
        except Exception as e:  # noqa: BLE001
            if attempt == 4:
                raise
            time.sleep(1 + attempt * 2)


def safe_get(path):
    try:
        return get(path)
    except Exception:  # noqa: BLE001
        return None


def url_id(url):
    return int(url.rstrip("/").split("/")[-1])


def path_of(url):
    return url.split("/api/v2/")[1]


def zh_name(names, fallback):
    by = {n["language"]["name"]: n["name"] for n in names}
    return by.get("zh-hant") or by.get("zh-hans") or fallback


def zh_text(entries, key):
    for lang in ("zh-hant", "zh-hans"):
        for e in reversed(entries):
            if e["language"]["name"] == lang:
                return " ".join(e[key].split())
    for e in reversed(entries):
        if e["language"]["name"] == "en":
            return " ".join(e[key].split())
    return ""


# 遊戲中可以讓寶可夢攜帶、在對戰中有效果的道具
HELD_ITEMS = [
    "leftovers", "life-orb", "choice-band", "choice-specs", "choice-scarf", "focus-sash", "focus-band",
    "sitrus-berry", "oran-berry", "lum-berry", "chesto-berry", "cheri-berry", "pecha-berry", "rawst-berry",
    "aspear-berry", "persim-berry", "leppa-berry", "expert-belt", "muscle-band", "wise-glasses",
    "charcoal", "mystic-water", "miracle-seed", "magnet", "never-melt-ice", "black-belt", "poison-barb",
    "soft-sand", "sharp-beak", "twisted-spoon", "silver-powder", "hard-stone", "spell-tag", "dragon-fang",
    "black-glasses", "metal-coat", "silk-scarf", "fairy-feather", "rocky-helmet", "black-sludge", "eviolite",
    "assault-vest", "kings-rock", "razor-fang", "scope-lens", "razor-claw", "quick-claw", "shell-bell",
    "air-balloon", "heavy-duty-boots", "light-clay", "damp-rock", "heat-rock", "smooth-rock", "icy-rock",
    "lucky-egg", "amulet-coin", "everstone", "soothe-bell", "bright-powder", "wide-lens", "zoom-lens",
    "toxic-orb", "flame-orb", "white-herb", "mental-herb", "power-herb", "weakness-policy", "clear-amulet",
    "covert-cloak", "loaded-dice", "punching-glove", "protective-pads", "safety-goggles", "big-root",
    "binding-band", "grip-claw", "shed-shell", "metronome", "throat-spray",
]

# 培育道具（最新世代）：營養飲料、經驗糖果、性格薄荷、特性膠囊、王冠
NATURE_EN = ["lonely", "adamant", "naughty", "brave", "bold", "impish", "lax", "relaxed", "modest", "mild", "rash", "quiet",
             "calm", "gentle", "careful", "sassy", "timid", "hasty", "jolly", "naive", "serious"]
TRAIN_ITEMS = ["hp-up", "protein", "iron", "calcium", "zinc", "carbos", "exp-candy-xs", "exp-candy-s", "exp-candy-m",
               "exp-candy-l", "exp-candy-xl", "ability-capsule", "ability-patch", "bottle-cap", "gold-bottle-cap"] + [n + "-mint" for n in NATURE_EN]

TOWER_ITEM = {"tower-of-darkness": "scroll-of-darkness", "tower-of-waters": "scroll-of-waters"}


def convert_evo(d):
    """PokéAPI evolution_details → 遊戲用的條件。單機無法達成的條件改編並以 adapt 標示。"""
    trig = (d.get("trigger") or {}).get("name", "other")
    c = {}
    if trig == "use-item" and d.get("item"):
        c["item"] = d["item"]["name"]
    elif trig == "trade":
        held = d.get("held_item")
        c["item"] = held["name"] if held else "linking-cord"
        c["adapt"] = "trade"
    elif trig in TOWER_ITEM:
        c["item"] = TOWER_ITEM[trig]
        c["adapt"] = "tower"
    if d.get("held_item") and trig != "trade":
        c["item"] = d["held_item"]["name"]
        c["adapt"] = "held"
    if d.get("min_level"):
        c["lvl"] = d["min_level"]
    if d.get("min_happiness"):
        c["happy"] = d["min_happiness"]
    if d.get("min_affection"):
        c["happy"] = 220
        c["adapt"] = "affection"
    if d.get("time_of_day"):
        c["time"] = d["time_of_day"]
    if d.get("gender") is not None:
        c["gender"] = d["gender"]  # 1 雌性、2 雄性
    if d.get("known_move"):
        c["move"] = url_id(d["known_move"]["url"])
    if d.get("known_move_type"):
        c["mtype"] = d["known_move_type"]["name"]
    if d.get("relative_physical_stats") is not None:
        c["rps"] = d["relative_physical_stats"]
    if d.get("party_species"):
        c["partySp"] = url_id(d["party_species"]["url"])
    if d.get("party_type"):
        c["partyType"] = d["party_type"]["name"]
    if d.get("trade_species"):
        c["adapt"] = "trade"
    for flag, name in (("needs_overworld_rain", "rain"), ("turn_upside_down", "upside"), ("location", "location"), ("min_beauty", "beauty")):
        if d.get(flag):
            c["adapt"] = name
    if trig not in ("level-up", "use-item", "trade") and trig not in TOWER_ITEM:
        c["adapt"] = trig
    # 沒有任何可在遊戲中判定的條件時，改為升級時進化
    if not any(k in c for k in ("lvl", "item", "happy", "move", "mtype")):
        c["lvl"] = 30
        c.setdefault("adapt", trig)
        c["fb"] = 1  # 補位用的條件，有其他條件時會被移除
    return c


def pmap(fn, items, workers=24):
    with ThreadPoolExecutor(workers) as ex:
        return list(ex.map(fn, items))


def main():
    ids = list(range(1, MAX_ID + 1))
    print("下載寶可夢...")
    pokes = pmap(lambda i: get(f"pokemon/{i}"), ids)
    print("下載物種...")
    species = pmap(lambda i: get(f"pokemon-species/{i}"), ids)
    chain_urls = sorted({s["evolution_chain"]["url"] for s in species if s.get("evolution_chain")})
    print(f"下載進化鏈 ({len(chain_urls)})...")
    chains = pmap(lambda u: get(path_of(u)), chain_urls)

    # ---- 進化 ----
    evo = {}  # from id -> list
    pre = {}  # to id -> from id

    def walk(node):
        sid = url_id(node["species"]["url"])
        for nxt in node["evolves_to"]:
            tid = url_id(nxt["species"]["url"])
            if tid > MAX_ID:
                walk(nxt)
                continue
            details = nxt["evolution_details"] or [{}]
            # 保留所有條件組合（任一組成立即可進化）
            conds = []
            for d in details:
                c = convert_evo(d)
                if c not in conds:
                    conds.append(c)
            # 有其他條件時移除補位條件；有原作條件時移除同類的改編條件（例如親密度與好感度）
            if len(conds) > 1:
                conds = [c for c in conds if not c.get("fb")] or conds
            if any(not c.get("adapt") for c in conds):
                conds = [c for c in conds if not c.get("adapt") or c["adapt"] in ("trade", "held")]
            # 優先列出原作條件
            conds.sort(key=lambda c: 1 if c.get("adapt") else 0)
            e = {"to": tid, "c": conds}
            # 摘要欄位（野生等級推算、圖鑑顯示用）
            lv = [c["lvl"] for c in conds if "lvl" in c and not c.get("item")]
            if lv:
                e["lvl"] = min(lv)
            it = [c["item"] for c in conds if c.get("item")]
            if it:
                e["item"] = it[0]
            if any(c.get("happy") for c in conds):
                e["happy"] = 1
            evo.setdefault(sid, []).append(e)
            pre[tid] = sid
            walk(nxt)

    for c in chains:
        walk(c["chain"])

    # ---- 學習招式 ----
    vg_cache = {}
    all_moves = set()
    out = {}
    for p, s in zip(pokes, species):
        pid = p["id"]
        by_vg = {}
        for m in p["moves"]:
            mid = url_id(m["move"]["url"])
            for d in m["version_group_details"]:
                if d["move_learn_method"]["name"] != "level-up":
                    continue
                vg = d["version_group"]["name"]
                if vg in SKIP_VG:
                    continue
                vgid = url_id(d["version_group"]["url"])
                vg_cache[vg] = vgid
                by_vg.setdefault(vgid, []).append((d["level_learned_at"], mid))
        learn = []
        if by_vg:
            best = max(by_vg)
            seen = set()
            for lv, mid in sorted(by_vg[best]):
                if mid in seen:
                    continue
                seen.add(mid)
                learn.append([max(1, lv), mid])
                all_moves.add(mid)
        stats = {st["stat"]["name"]: st["base_stat"] for st in p["stats"]}
        effort = {st["stat"]["name"]: st["effort"] for st in p["stats"]}
        genus = ""
        for lang in ("zh-hant", "zh-hans", "en"):
            g = [x["genus"] for x in s["genera"] if x["language"]["name"] == lang]
            if g:
                genus = g[0]
                break
        out[pid] = {
            "id": pid,
            "n": zh_name(s["names"], s["name"]),
            "en": s["name"],
            "t": [t["type"]["name"] for t in sorted(p["types"], key=lambda t: t["slot"])],
            "s": [stats["hp"], stats["attack"], stats["defense"],
                  stats["special-attack"], stats["special-defense"], stats["speed"]],
            # 打倒時給予的努力值（HP、攻擊、防禦、特攻、特防、速度）
            "ey": [effort["hp"], effort["attack"], effort["defense"],
                   effort["special-attack"], effort["special-defense"], effort["speed"]],
            "gr8": s["gender_rate"],  # 雌性比例（八分之幾），-1 為無性別
            # 特性：[特性 id, 是否為隱藏特性]
            "ab": [[a["ability"]["name"], 1 if a["is_hidden"] else 0] for a in sorted(p["abilities"], key=lambda a: a["slot"])],
            "w": p["weight"],  # 體重（0.1 公斤）
            "cr": s["capture_rate"],
            "xp": p["base_experience"] or 60,
            "gr": s["growth_rate"]["name"],
            "g": url_id(s["generation"]["url"]),
            "lg": 1 if s["is_legendary"] else (2 if s["is_mythical"] else 0),
            "baby": 1 if s["is_baby"] else 0,
            "hap": s["base_happiness"] if s["base_happiness"] is not None else 50,
            "gen": genus,
            "fl": zh_text(s["flavor_text_entries"], "flavor_text"),
            "l": learn,
        }
        if pid in evo:
            out[pid]["ev"] = evo[pid]
        if pid in pre:
            out[pid]["pre"] = pre[pid]

    # 野生出現的最低等級：依進化階段推算
    def wild_min(pid, depth=0):
        if pid not in pre or depth > 5:
            return 1 if out[pid]["lg"] == 0 else 40
        par = pre[pid]
        base = wild_min(par, depth + 1)
        for e in evo.get(par, []):
            if e["to"] == pid:
                if "lvl" in e:
                    return max(base, e["lvl"])
                return base + 15
        return base + 15

    for pid in out:
        out[pid]["wm"] = wild_min(pid)

    # 進化道具的中文名稱
    item_names = sorted({c["item"] for es in evo.values() for e in es for c in e["c"] if c.get("item")})
    print(f"下載進化道具 ({len(item_names)})...")
    items = {}
    for name, it in zip(item_names, pmap(lambda n: safe_get(f"item/{n}"), item_names)):
        items[name] = zh_name(it["names"], name) if it else name
    with open(os.path.join(ROOT, "data", "items.js"), "w", encoding="utf-8") as f:
        f.write("window.ITEMNAMES=")
        json.dump(items, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    # 特性的中文名稱與說明
    ab_names = sorted({a[0] for v in out.values() for a in v["ab"]})
    print(f"下載特性 ({len(ab_names)})...")
    abilities = {}
    for name, a in zip(ab_names, pmap(lambda n: safe_get(f"ability/{n}"), ab_names)):
        if not a:
            continue
        abilities[name] = {"n": zh_name(a["names"], name), "d": zh_text(a["flavor_text_entries"], "flavor_text")}
    # 持有道具
    print(f"下載持有道具 ({len(HELD_ITEMS)})...")
    held = {}
    for name, it in zip(HELD_ITEMS, pmap(lambda n: safe_get(f"item/{n}"), HELD_ITEMS)):
        if not it:
            continue
        held[name] = {"n": zh_name(it["names"], name), "d": zh_text(it["flavor_text_entries"], "text"), "cost": it.get("cost") or 0}
    print(f"下載培育道具 ({len(TRAIN_ITEMS)})...")
    train = {}
    for name, it in zip(TRAIN_ITEMS, pmap(lambda n: safe_get(f"item/{n}"), TRAIN_ITEMS)):
        if it:
            train[name] = {"n": zh_name(it["names"], name), "d": zh_text(it["flavor_text_entries"], "text"), "cost": it.get("cost") or 0}
    with open(os.path.join(ROOT, "data", "abilities.js"), "w", encoding="utf-8") as f:
        f.write("window.ABILITIES=")
        json.dump(abilities, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\nwindow.HELDITEMS=")
        json.dump(held, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\nwindow.TRAINITEMS=")
        json.dump(train, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    print(f"下載招式 ({len(all_moves)})...")
    move_ids = sorted(all_moves)
    moves_raw = pmap(lambda i: get(f"move/{i}"), move_ids)
    moves = {}
    for m in moves_raw:
        meta = m.get("meta") or {}
        mv = {
            "id": m["id"],
            "n": zh_name(m["names"], m["name"]),
            "t": m["type"]["name"],
            "c": m["damage_class"]["name"][:2],  # ph / sp / st
            "p": m["power"] or 0,
            "a": m["accuracy"] or 0,
            "pp": m["pp"] or 10,
            "pr": m["priority"],
            "tg": m["target"]["name"],
            "d": zh_text(m["flavor_text_entries"], "flavor_text"),
        }
        if meta:
            cat = (meta.get("category") or {}).get("name")
            if cat:
                mv["cat"] = cat
            ail = (meta.get("ailment") or {}).get("name")
            if ail and ail not in ("none", "unknown"):
                mv["ail"] = ail
                mv["ac"] = meta.get("ailment_chance") or 0
            for k, short in (("crit_rate", "cr"), ("drain", "dr"), ("flinch_chance", "fc"),
                             ("healing", "hl"), ("min_hits", "h0"), ("max_hits", "h1"),
                             ("stat_chance", "sc")):
                if meta.get(k):
                    mv[short] = meta[k]
        if m["stat_changes"]:
            mv["sx"] = [[sc["stat"]["name"], sc["change"]] for sc in m["stat_changes"]]
        moves[m["id"]] = mv

    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "pokedex.js"), "w", encoding="utf-8") as f:
        f.write("window.POKEDEX=")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    with open(os.path.join(ROOT, "data", "moves.js"), "w", encoding="utf-8") as f:
        f.write("window.MOVES=")
        json.dump(moves, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"完成：{len(out)} 隻寶可夢、{len(moves)} 個招式")


if __name__ == "__main__":
    main()
