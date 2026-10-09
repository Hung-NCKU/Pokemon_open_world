"""下載 Pokémon Showdown 的客戶端資料（招式／特性／道具），轉成 data/showdown.js。

Showdown 的招式資料以 num（全國招式編號）對應 PokéAPI 的招式 id。
用法：python tools/fetch_showdown.py
"""
import json
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "showdown")
os.makedirs(CACHE, exist_ok=True)
BASE = "https://play.pokemonshowdown.com/data/"


def get(name):
    p = os.path.join(CACHE, name + ".js")
    if not os.path.exists(p):
        req = urllib.request.Request(BASE + name + ".js", headers={"User-Agent": "pokemon-fan-research"})
        with urllib.request.urlopen(req, timeout=60) as r, open(p, "wb") as f:
            f.write(r.read())
    return open(p, encoding="utf-8").read()


def js_object(src):
    """把 `exports.X = {...};` 的 JS 物件常值轉成 Python dict（不含函式）。"""
    body = src[src.index("{"):src.rstrip().rstrip(";").rindex("}") + 1]
    out, i, n = [], 0, len(body)
    while i < n:
        c = body[i]
        if c == '"':  # 字串原樣保留
            j = i + 1
            while body[j] != '"':
                j += 2 if body[j] == "\\" else 1
            out.append(body[i:j + 1])
            i = j + 1
            continue
        if c in "{,":
            out.append(c)
            m = re.match(r"\s*([A-Za-z_$][\w$]*|\d+[A-Za-z_]\w*)\s*:", body[i + 1:])
            if m:
                out.append(json.dumps(m.group(1)) + ":")
                i += 1 + m.end()
                continue
            i += 1
            continue
        out.append(c)
        i += 1
    return json.loads("".join(out))


DROP = {"num", "name", "desc", "shortDesc", "contestType", "zMove", "maxMove", "isZ", "isMax", "gen"}


def main():
    moves = js_object(get("moves"))
    out = {}
    for sid, m in moves.items():
        num = m.get("num", 0)
        if num <= 0 or m.get("isZ") or m.get("isMax"):
            continue
        e = {k: v for k, v in m.items() if k not in DROP}
        e["id"] = sid
        out[num] = e
    abilities = js_object(get("abilities"))
    items = js_object(get("items"))
    pokedex = js_object(get("pokedex"))
    # 物種的特性與體重（以全國圖鑑編號，只取基本型態）
    abil = {}
    for sid, p in pokedex.items():
        num = p.get("num", 0)
        if 0 < num <= 1025 and not p.get("forme") and num not in abil:
            abil[num] = {"a": p.get("abilities", {}), "w": p.get("weightkg", 10)}
    data = {
        "moves": out,
        "abilities": {k: {"name": v.get("name"), "rating": v.get("rating")} for k, v in abilities.items()},
        "items": {k: {"name": v.get("name"), "num": v.get("num")} for k, v in items.items()},
        "speciesAbilities": abil,
    }
    with open(os.path.join(ROOT, "data", "showdown.js"), "w", encoding="utf-8") as f:
        f.write("window.SHOWDOWN=")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"招式 {len(out)}、特性 {len(abilities)}、道具 {len(items)}、物種特性 {len(abil)}")


if __name__ == "__main__":
    main()
