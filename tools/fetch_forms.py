"""形態資料 → data/forms.js

收錄：地區形態（阿羅拉、伽勒爾、洗翠、帕底亞）與洛托姆的家電形態。
來源：PokéAPI pokemon-species/{id}.varieties → pokemon/{name}（屬性、種族值、特性、升級招式）
      → pokemon-form/{name}（中文名稱）。
用法：python tools/fetch_forms.py [物種資料快取資料夾]
"""
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "api")
SPECIES_CACHE = sys.argv[1] if len(sys.argv) > 1 else CACHE
API = "https://pokeapi.co/api/v2/"
os.makedirs(CACHE, exist_ok=True)

REGION_SUFFIX = {"alola": "alola", "galar": "galar", "hisui": "hisui", "paldea": "paldea"}
REGION_ZH = {"alola": "阿羅拉", "galar": "伽勒爾", "hisui": "洗翠", "paldea": "帕底亞"}
# PokéAPI 沒有個別中文名稱的形態（名稱依 52poke）
NAME_FIX = {
    "rotom-heat": "加熱洛托姆", "rotom-wash": "清洗洛托姆", "rotom-frost": "結冰洛托姆", "rotom-fan": "旋轉洛托姆", "rotom-mow": "切割洛托姆",
    "tauros-paldea-combat-breed": "帕底亞肯泰羅（鬥戰種）", "tauros-paldea-blaze-breed": "帕底亞肯泰羅（火熾種）",
    "tauros-paldea-aqua-breed": "帕底亞肯泰羅（水瀾種）",
}
SKIP_VG = {"legends-arceus", "legends-za", "colosseum", "xd", "lets-go-pikachu-lets-go-eevee"}


def get(path, cache=CACHE):
    for c in (cache, CACHE, SPECIES_CACHE):
        fn = os.path.join(c, path.strip("/").replace("/", "_") + ".json")
        if os.path.exists(fn):
            return json.load(open(fn, encoding="utf-8"))
    url = path if path.startswith("http") else API + path
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "pokemon-fan-research"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
            fn = os.path.join(CACHE, path.strip("/").replace("/", "_") + ".json")
            json.dump(data, open(fn, "w", encoding="utf-8"))
            return data
        except Exception:  # noqa: BLE001
            if attempt == 4:
                raise
            time.sleep(1 + attempt * 2)


def url_id(url):
    return int(url.rstrip("/").split("/")[-1])


def zh(names, fallback=""):
    for lang in ("zh-hant", "zh-hans"):
        for n in names:
            if n["language"]["name"] == lang and n.get("name"):
                return n["name"]
    return fallback


def learnset(p):
    by_vg = {}
    for m in p["moves"]:
        mid = url_id(m["move"]["url"])
        for d in m["version_group_details"]:
            if d["move_learn_method"]["name"] != "level-up" or d["version_group"]["name"] in SKIP_VG:
                continue
            by_vg.setdefault(url_id(d["version_group"]["url"]), []).append((d["level_learned_at"], mid))
    if not by_vg:
        return []
    out, seen = [], set()
    for lv, mid in sorted(by_vg[max(by_vg)]):
        if mid not in seen:
            seen.add(mid)
            out.append([max(1, lv), mid])
    return out


def mega_stones():
    """Showdown items.js 的 megaStone 欄位：道具 → (物種, 形態)；紅色／藍色寶珠 → 原始回歸。"""
    import re
    src = open(os.path.join(ROOT, ".cache", "showdown", "items.js"), encoding="utf-8").read()
    out = []
    pat = r'([a-z0-9]+):\{name:"([^"]+)",spritenum:\d+,megaStone:\{([^:"]+):"([^"]+)"\}'
    for m in re.finditer(pat, src):
        _, name, base, form = m.groups()
        out.append((name, base, form))
    out.append(("Red Orb", "Groudon", "Groudon-Primal"))
    out.append(("Blue Orb", "Kyogre", "Kyogre-Primal"))
    return out


def slug(s):
    return s.lower().replace(" ", "-").replace(".", "").replace("'", "").replace("é", "e")


def fetch_form(name, base_zh, region):
    p = get(f"pokemon/{name}")
    stats = {s["stat"]["name"]: s["base_stat"] for s in p["stats"]}
    effort = {s["stat"]["name"]: s["effort"] for s in p["stats"]}
    order = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"]
    fname = ""
    if p.get("forms"):
        f = get(f"pokemon-form/{p['forms'][0]['name']}")
        fname = zh(f.get("names", []), "")
    return p, {
        "id": p["id"], "t": [t["type"]["name"] for t in sorted(p["types"], key=lambda t: t["slot"])],
        "s": [stats[k] for k in order], "ey": [effort[k] for k in order],
        "ab": [[a["ability"]["name"], 1 if a["is_hidden"] else 0] for a in sorted(p["abilities"], key=lambda a: a["slot"])],
        "w": p["weight"], "fn": fname,
    }


def main():
    forms = {}
    # 超級進化與原始回歸
    stones = {}
    species_by_en = {}
    for sid in range(1, 1026):
        sp = get(f"pokemon-species/{sid}", SPECIES_CACHE)
        species_by_en[sp["name"]] = (sid, zh(sp["names"], sp["name"]))
    for item_name, base, form in mega_stones():
        fslug, bslug = slug(form), slug(base)
        if bslug not in species_by_en:
            continue
        sid, base_zh = species_by_en[bslug]
        try:
            p, d = fetch_form(fslug, base_zh, "")
        except Exception:  # noqa: BLE001
            print("  PokéAPI 沒有：", fslug)
            continue
        islug = slug(item_name)
        try:
            it = get(f"item/{islug}")
            iname = zh(it.get("names", []), item_name)
        except Exception:  # noqa: BLE001
            iname = item_name
        primal = fslug.endswith("-primal")
        n = d.pop("fn") or (("原始" if primal else "超級") + base_zh)
        suf = fslug.rsplit("-", 1)[-1]
        if suf in ("x", "y", "z") and not n.endswith(("Ｘ", "Ｙ", "Ｚ", "X", "Y", "Z")):
            n += {"x": "Ｘ", "y": "Ｙ", "z": "Ｚ"}[suf]
        forms[fslug] = {**d, "base": sid, "region": "", "n": n, "l": [], "mega": islug, "primal": 1 if primal else 0}
        stones[islug] = {"n": iname, "form": fslug, "base": sid}
        print(" ", fslug, n, islug, iname)
    for sid in range(1, 1026):
        sp = get(f"pokemon-species/{sid}", SPECIES_CACHE)
        base_zh = zh(sp["names"], sp["name"])
        for v in sp["varieties"]:
            name = v["pokemon"]["name"]
            if v["is_default"]:
                continue
            region = next((r for k, r in REGION_SUFFIX.items() if f"-{k}" in name), None)
            rotom = sid == 479
            if not region and not rotom:
                continue
            if name.endswith("-zen") or "-zen-" in name or name.endswith("-gmax") or "totem" in name or "-cap" in name:
                continue
            p = get(f"pokemon/{name}")
            stats = {s["stat"]["name"]: s["base_stat"] for s in p["stats"]}
            effort = {s["stat"]["name"]: s["effort"] for s in p["stats"]}
            order = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"]
            fname = ""
            if p.get("forms"):
                f = get(f"pokemon-form/{p['forms'][0]['name']}")
                fname = zh(f.get("names", []), "")
            fname = NAME_FIX.get(name, fname)
            if not fname:
                fname = f"{REGION_ZH[region]}{base_zh}" if region else base_zh
            forms[name] = {
                "id": p["id"], "base": sid, "region": region or "", "n": fname,
                "t": [t["type"]["name"] for t in sorted(p["types"], key=lambda t: t["slot"])],
                "s": [stats[k] for k in order], "ey": [effort[k] for k in order],
                "ab": [[a["ability"]["name"], 1 if a["is_hidden"] else 0] for a in sorted(p["abilities"], key=lambda a: a["slot"])],
                "w": p["weight"], "l": learnset(p),
            }
            print(" ", name, fname, forms[name]["t"])
    out = os.path.join(ROOT, "data", "forms.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("// 由 tools/fetch_forms.py 產生（PokéAPI）：地區形態與洛托姆的形態\n")
        f.write("window.FORMS=" + json.dumps(forms, ensure_ascii=False, separators=(",", ":")) + ";\n")
        f.write("window.MEGA_STONES=" + json.dumps(stones, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"形態 {len(forms)} 種 → {out}")


if __name__ == "__main__":
    main()
