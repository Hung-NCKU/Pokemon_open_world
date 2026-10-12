"""專屬 Z 純晶與專屬 Z 招式 → data/zsig.js

來源：Pokémon Showdown 的 data/items.ts（zMove、zMoveFrom、itemUser）與 data/moves.ts（威力、屬性、分類、追加效果）；
中文名稱取自 PokéAPI（item/{純晶}、move/{招式} 的 zh-Hant）
皮卡丘（帽子）的 Z 純晶沒有對應的形態，不收錄
用法：python tools/fetch_zsig.py
"""
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "showdown")
SD = "https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/"
API = "https://pokeapi.co/api/v2/"
SKIP = {"pikashuniumz"}
# Showdown 的形態名稱 → 本專案的形態（data/forms.js、data/late.js 的 FORMS）
FORM_ALIAS = {"necrozmaduskmane": "necrozma-dusk", "necrozmadawnwings": "necrozma-dawn", "necrozmaultra": "necrozma-ultra"}


def get(url, path=None):
    if path and os.path.exists(path):
        return open(path, encoding="utf-8").read()
    req = urllib.request.Request(url, headers={"User-Agent": "pokemon-fan-research"})
    t = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")
    if path:
        open(path, "w", encoding="utf-8").write(t)
    return t


def load_js(path, name):
    s = open(os.path.join(ROOT, path), encoding="utf-8").read()
    i = s.index(f"window.{name}=") + len(f"window.{name}=")
    return json.JSONDecoder().raw_decode(s[i:])[0]


def zh(kind, slug):
    try:
        d = json.loads(get(API + f"{kind}/{slug}/"))
        n = [x["name"] for x in d["names"] if x["language"]["name"] == "zh-hant"]
        return n[0] if n else None
    except Exception:  # noqa: BLE001
        return None


def block(src, key):
    m = re.search(r"^\t" + key + r": \{\n(.*?)\n\t\},", src, re.S | re.M)
    return m.group(1) if m else ""


def main():
    os.makedirs(CACHE, exist_ok=True)
    items = get(SD + "items.ts", os.path.join(CACHE, "items.ts"))
    moves = get(SD + "moves.ts", os.path.join(CACHE, "moves.ts"))
    dex = load_js("data/pokedex.js", "POKEDEX")
    forms = {}
    forms.update(load_js("data/forms.js", "FORMS"))
    # data/late.js 是 Object.assign(window.FORMS, {...})
    t = open(os.path.join(ROOT, "data", "late.js"), encoding="utf-8").read()
    i = t.index("Object.assign(window.FORMS, ") + len("Object.assign(window.FORMS, ")
    forms.update(json.JSONDecoder().raw_decode(t[i:])[0])
    sd = load_js("data/showdown.js", "SHOWDOWN")
    move_num = {m["id"]: int(k) for k, m in sd["moves"].items()}
    by_en = {re.sub(r"[^a-z0-9]", "", p["en"].lower()): int(k) for k, p in dex.items()}
    by_form = {re.sub(r"[^a-z0-9]", "", k): k for k in forms}

    out = {}
    for m in re.finditer(r"^\t(\w+): \{\n(.*?)\n\t\},", items, re.S | re.M):
        key, b = m.group(1), m.group(2)
        zm, zf = re.search(r'zMove: "([^"]+)"', b), re.search(r'zMoveFrom: "([^"]+)"', b)
        if not (zm and zf) or key in SKIP:
            continue
        users = []
        for u in re.findall(r'"([^"]+)"', (re.search(r"itemUser: \[([^\]]*)\]", b) or [None, ""])[1] if re.search(r"itemUser", b) else ""):
            if "Totem" in u:
                continue
            uid = re.sub(r"[^a-z0-9]", "", u.lower())
            if uid in FORM_ALIAS or uid in by_form:
                fk = FORM_ALIAS.get(uid) or by_form[uid]
                users.append({"sp": forms[fk]["base"], "form": fk})
            elif uid in by_en:
                users.append({"sp": by_en[uid], "form": None})
            else:
                base = re.sub(r"[^a-z0-9]", "", u.split("-")[0].lower())
                if base in by_en:
                    users.append({"sp": by_en[base], "form": None, "anyForm": True})
        zid = re.sub(r"[^a-z0-9]", "", zm.group(1).lower())
        fid = re.sub(r"[^a-z0-9]", "", zf.group(1).lower())
        mb = block(moves, zid)
        num = int(re.search(r"num: (\d+)", mb).group(1))
        bp = int(re.search(r"basePower: (\d+)", mb).group(1))
        cat = re.search(r'category: "(\w+)"', mb).group(1)
        typ = re.search(r'type: "(\w+)"', mb).group(1).lower()
        z = {"id": zid, "num": num, "type": typ, "cat": cat, "bp": bp, "ignoreAbility": "ignoreAbility: true" in mb}
        boosts = re.search(r"boosts: \{([^}]*)\}", mb)
        if boosts:
            z["boosts"] = {k: int(v) for k, v in re.findall(r"(\w+): (-?\d+)", boosts.group(1))}
        sec = re.search(r"secondary: \{\n\t\t\tchance: (\d+),\n\t\t\tstatus: '(\w+)'", mb)
        if sec:
            z["status"] = sec.group(2)
        item_slug = re.sub(r"(ium|um)z$", r"\1-z", key)
        z["n"] = zh("move", zm.group(1).lower().replace("'", "").replace(",", "").replace(" ", "-").replace("--", "-")) or zm.group(1)
        out[item_slug] = {"n": zh("item", item_slug + "--held") or zh("item", item_slug) or m.group(1), "users": users, "from": move_num.get(fid), "z": z}
        print(item_slug, out[item_slug]["n"], z["n"], z["type"], z["cat"], z["bp"], users)
    path = os.path.join(ROOT, "data", "zsig.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("// 由 tools/fetch_zsig.py 產生（Showdown items/moves＋PokéAPI 中文名稱）：專屬 Z 純晶 → 使用者、原本的招式、專屬 Z 招式\n")
        f.write("window.ZSIG=")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"{len(out)} 種專屬 Z 純晶 → {path}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
