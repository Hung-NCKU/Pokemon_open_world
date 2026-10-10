"""蛋群與孵化週期 → data/breeding.js（PokéAPI pokemon-species 的 egg_groups、hatch_counter）"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_forms import SPECIES_CACHE, get  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    out = {}
    for sid in range(1, 1026):
        sp = get(f"pokemon-species/{sid}", SPECIES_CACHE)
        out[sid] = [[g["name"] for g in sp["egg_groups"]], sp.get("hatch_counter") or 20]
    path = os.path.join(ROOT, "data", "breeding.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("// 由 tools/fetch_breeding.py 產生（PokéAPI）：[蛋群, 孵化週期]\n")
        f.write("window.BREEDING=" + json.dumps(out, separators=(",", ":")) + ";\n")
    print(len(out), "→", path)


if __name__ == "__main__":
    main()
