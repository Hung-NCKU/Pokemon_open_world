"""Z 招式與 Z 純晶 → data/zmoves.js（PokéAPI move/622–657、item/{type}ium-z，中文名稱）"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_forms import get, zh  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRYSTAL = {
    "normal": "normalium-z", "fire": "firium-z", "water": "waterium-z", "electric": "electrium-z", "grass": "grassium-z",
    "ice": "icium-z", "fighting": "fightinium-z", "poison": "poisonium-z", "ground": "groundium-z", "flying": "flyinium-z",
    "psychic": "psychium-z", "bug": "buginium-z", "rock": "rockium-z", "ghost": "ghostium-z", "dragon": "dragonium-z",
    "dark": "darkinium-z", "steel": "steelium-z", "fairy": "fairium-z",
}


def main():
    out = {}
    for mid in range(622, 659):
        m = get(f"move/{mid}")
        t = m["type"]["name"]
        if t in out or t not in CRYSTAL:
            continue
        it = get(f"item/{CRYSTAL[t]}--held")
        out[t] = {"n": zh(m["names"], m["name"]), "item": CRYSTAL[t], "itemN": zh(it["names"], CRYSTAL[t])}
        print(t, out[t])
    path = os.path.join(ROOT, "data", "zmoves.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("// 由 tools/fetch_zmoves.py 產生（PokéAPI）：各屬性的 Z 招式與 Z 純晶\n")
        f.write("window.ZMOVES=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(len(out), "→", path)


if __name__ == "__main__":
    main()
