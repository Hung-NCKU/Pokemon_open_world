"""後期機制的資料 → data/late.js
- 形態：合體（酋雷姆、奈克洛茲瑪、蕾冠王）、究極奈克洛茲瑪、戰鬥中變形（堅盾劍怪、弱丁魚、謎擬Ｑ、海豚俠、達摩狒狒、小隕星）、
  超極巨化（所有 -gmax）
- 極巨招式：各屬性的名稱與極巨防壁（PokéAPI move/743–774）
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_forms import SPECIES_CACHE, fetch_form, get, zh  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRA = {
    "kyurem-black": "fusion", "kyurem-white": "fusion", "necrozma-dusk": "fusion", "necrozma-dawn": "fusion",
    "calyrex-ice": "fusion", "calyrex-shadow": "fusion", "necrozma-ultra": "ultra",
    "aegislash-blade": "battle", "wishiwashi-school": "battle", "mimikyu-busted": "battle", "palafin-hero": "battle",
    "darmanitan-zen": "battle", "darmanitan-galar-zen": "battle", "minior-red": "battle",
}
NAME_FIX = {
    "kyurem-black": "闇黑酋雷姆", "kyurem-white": "焰白酋雷姆", "necrozma-dusk": "黃昏之鬃奈克洛茲瑪", "necrozma-dawn": "拂曉之翼奈克洛茲瑪",
    "necrozma-ultra": "究極奈克洛茲瑪", "calyrex-ice": "騎白馬的蕾冠王", "calyrex-shadow": "騎黑馬的蕾冠王",
}


def main():
    forms = {}
    species = {}
    for sid in range(1, 1026):
        sp = get(f"pokemon-species/{sid}", SPECIES_CACHE)
        species[sp["name"]] = sid
        base_zh = zh(sp["names"], sp["name"])
        for v in sp["varieties"]:
            name = v["pokemon"]["name"]
            kind = EXTRA.get(name) or ("gmax" if name.endswith("-gmax") else None)
            if not kind:
                continue
            p, d = fetch_form(name, base_zh, "")
            n = NAME_FIX.get(name) or d.pop("fn", "") or base_zh
            d.pop("fn", None)
            if kind == "gmax":
                n = "超極巨" + base_zh
            forms[name] = {**d, "base": sid, "region": "", "n": n, "l": [], kind: 1}
            print(name, kind)
    maxm = {}
    for mid in range(743, 775):
        try:
            m = get(f"move/{mid}")
        except Exception:  # noqa: BLE001
            continue
        if not m["name"].startswith("max-"):
            continue
        key = "guard" if m["name"] == "max-guard" else m["type"]["name"]
        maxm.setdefault(key, {"n": zh(m["names"], m["name"]), "id": m["name"]})
    path = os.path.join(ROOT, "data", "late.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("// 由 tools/fetch_late.py 產生（PokéAPI）：合體、戰鬥中變形、超極巨化形態與極巨招式\n")
        f.write("Object.assign(window.FORMS, " + json.dumps(forms, ensure_ascii=False, separators=(",", ":")) + ");\n")
        f.write("window.MAX_MOVES=" + json.dumps(maxm, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(len(forms), "forms,", len(maxm), "max moves →", path)


if __name__ == "__main__":
    main()
