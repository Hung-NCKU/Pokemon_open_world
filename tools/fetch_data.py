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
            # 優先採用道具進化，其次等級，其次其它
            pick = None
            for d in details:
                if d.get("trigger", {}).get("name") == "use-item" and d.get("item"):
                    pick = d
                    break
            if not pick:
                for d in details:
                    if d.get("min_level"):
                        pick = d
                        break
            if not pick:
                pick = details[0]
            trig = (pick.get("trigger") or {}).get("name", "other")
            e = {"to": tid}
            if trig == "use-item" and pick.get("item"):
                e["item"] = pick["item"]["name"]
            elif trig == "trade":
                e["item"] = "linking-cord"
            elif pick.get("min_level"):
                e["lvl"] = pick["min_level"]
            elif pick.get("min_happiness") or pick.get("min_affection"):
                e["happy"] = 1
            else:
                e["lvl"] = 30
            if pick.get("time_of_day"):
                e["time"] = pick["time_of_day"]
            if pick.get("relative_physical_stats") is not None:
                e["rps"] = pick["relative_physical_stats"]
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
