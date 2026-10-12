"""遺傳招式（蛋招式）→ data/eggmoves.js

來源：Pokémon Showdown 的 data/learnsets.ts（學習方式的代碼：9E＝第九世代的蛋招式、8E＝第八世代……）
每個物種取「最新世代」的蛋招式（朱紫有的用朱紫；沒有出現在朱紫的寶可夢用之前世代的）
物種名稱用 PokéAPI 的英文名稱轉成 Showdown 的 id（去掉非英數字），招式用 data/showdown.js 的 id 對應全國招式編號
用法：python tools/fetch_eggmoves.py
"""
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "showdown")
URL = "https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/learnsets.ts"


def load_js(path, name):
    s = open(os.path.join(ROOT, path), encoding="utf-8").read()
    i = s.index(f"window.{name}=") + len(f"window.{name}=")
    return json.JSONDecoder().raw_decode(s[i:])[0]


def main():
    os.makedirs(CACHE, exist_ok=True)
    src_path = os.path.join(CACHE, "learnsets.ts")
    if not os.path.exists(src_path):
        print("下載 learnsets.ts ...")
        req = urllib.request.Request(URL, headers={"User-Agent": "pokemon-fan-research"})
        open(src_path, "wb").write(urllib.request.urlopen(req, timeout=60).read())
    src = open(src_path, encoding="utf-8").read()

    dex = load_js("data/pokedex.js", "POKEDEX")
    sd = load_js("data/showdown.js", "SHOWDOWN")
    move_num = {m["id"]: int(k) for k, m in sd["moves"].items()}
    sid = {re.sub(r"[^a-z0-9]", "", p["en"].lower()): int(k) for k, p in dex.items()}

    out = {}
    # 每個物種的區塊：\tbulbasaur: {\n\t\tlearnset: {\n\t\t\tamnesia: ["9E", ...],
    for m in re.finditer(r"^\t(\w+): \{\n\t\tlearnset: \{\n(.*?)\n\t\t\},", src, re.S | re.M):
        name, body = m.group(1), m.group(2)
        if name not in sid:
            continue
        by_gen = {}
        for mm in re.finditer(r'^\t\t\t(\w+): \[([^\]]*)\]', body, re.M):
            mv, codes = mm.group(1), re.findall(r'"(\d)E', mm.group(2))
            for g in codes:
                by_gen.setdefault(int(g), set()).add(mv)
        if not by_gen:
            continue
        latest = max(by_gen)
        nums = sorted(move_num[mv] for mv in by_gen[latest] if mv in move_num)
        if nums:
            out[sid[name]] = nums
    path = os.path.join(ROOT, "data", "eggmoves.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("// 由 tools/fetch_eggmoves.py 產生（Pokémon Showdown learnsets：每個物種最新世代的蛋招式）：全國圖鑑編號 → 招式編號\n")
        f.write("window.EGG_MOVES=")
        json.dump(out, f, separators=(",", ":"))
        f.write(";\n")
    print(f"{len(out)} 種寶可夢有遺傳招式，共 {sum(len(v) for v in out.values())} 筆 → {path}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
