"""招式學習器資料 → data/tms.js

- 招式與編號：PokéAPI move/{id} 的 machines（朱／紫 scarlet-violet 版本組）→ machine/{id} 的道具名稱（tm001…）
- 相容名單：Pokémon Showdown learnsets（"9M" = 第九世代招式學習器）；沒有出現在朱／紫的寶可夢，
  改用該寶可夢最新一個有招式學習器資料的世代
- 素材與配方（遊戲自訂）：每個招式學習器需要與招式同屬性的寶可夢素材，數量依威力，加上金錢
"""
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "api")
SD = os.path.join(ROOT, ".cache", "showdown")
API = "https://pokeapi.co/api/v2/"
os.makedirs(CACHE, exist_ok=True)

# 常用招式（PokéAPI 招式編號）
MOVES = [
    182, 164, 263, 156, 214,          # 守住、替身、硬撐、睡覺、夢話
    85, 58, 53, 57, 89,               # 十萬伏特、冰凍光束、噴射火焰、衝浪、地震
    94, 247, 412, 399, 605,           # 精神強念、暗影球、能量球、惡之波動、魔法閃耀
    430, 188, 406, 157, 404,          # 加農光炮、污泥炸彈、龍之波動、岩崩、十字剪
    280, 332, 442, 583, 14,           # 劈瓦、燕返、鐵頭、嬉鬧、劍舞
    347, 261, 86, 369, 202,           # 冥想、鬼火、電磁波、急速折返、終極吸取
    34, 91, 19,                       # 泰山壓頂、挖洞、飛翔
]


def get(path):
    fn = os.path.join(CACHE, path.strip("/").replace("/", "_") + ".json")
    if os.path.exists(fn):
        return json.load(open(fn, encoding="utf-8"))
    url = path if path.startswith("http") else API + path
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "pokemon-fan-research"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
            json.dump(data, open(fn, "w", encoding="utf-8"))
            return data
        except Exception:  # noqa: BLE001
            if attempt == 4:
                raise
            time.sleep(1 + attempt * 2)


def js_object(path, name):
    src = open(path, encoding="utf-8").read()
    src = src[src.index("{", src.index(name)):]
    # Showdown 的 data 檔是 JS 物件字面值：補上鍵的引號後當 JSON 讀
    src = re.sub(r'([{,])([A-Za-z0-9_]+):', r'\1"\2":', src.rstrip().rstrip(";"))
    return json.loads(src)


def main():
    learn = js_object(os.path.join(SD, "learnsets.js"), "BattleLearnsets")
    dex = js_object(os.path.join(SD, "pokedex.js"), "BattlePokedex")
    sdmoves = js_object(os.path.join(SD, "moves.js"), "BattleMovedex")
    move_key = {v["num"]: k for k, v in sdmoves.items() if v.get("num", 0) > 0}
    tms = []
    for mid in MOVES:
        m = get(f"move/{mid}")
        no = None
        for x in m.get("machines", []):
            if x["version_group"]["name"] == "scarlet-violet":
                no = get(x["machine"]["url"])["item"]["name"].upper()
        if not no:
            print("  不是朱／紫的招式學習器：", m["name"])
            continue
        tms.append({"no": "TM%03d" % int(no[2:]), "mv": mid})
    tms.sort(key=lambda t: t["no"])
    # 相容名單：全國編號（只取一般形態）
    compat = {t["mv"]: [] for t in tms}
    for sid, ent in learn.items():
        d = dex.get(sid)
        if not d or d.get("forme") or d.get("num", 0) <= 0 or not ent.get("learnset"):
            continue
        ls = ent["learnset"]
        # 最新一個有招式學習器（xM）資料的世代
        gens = [int(src[0]) for srcs in ls.values() for src in srcs if src[1:2] == "M" and src[0].isdigit()]
        if not gens:
            continue
        g = str(max(gens))
        for t in tms:
            key = move_key.get(t["mv"])
            if key and any(src.startswith(g + "M") for src in ls.get(key, [])):
                compat[t["mv"]].append(d["num"])
    for t in tms:
        t["c"] = sorted(set(compat[t["mv"]]))
    out = os.path.join(ROOT, "data", "tms.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("// 由 tools/fetch_tms.py 產生（PokéAPI 朱／紫招式學習器編號＋Showdown 相容名單）\n")
        f.write("window.TM_DATA=" + json.dumps(tms, separators=(",", ":")) + ";\n")
    print(f"招式學習器 {len(tms)} 個 → {out}")
    for t in tms:
        print(" ", t["no"], t["mv"], len(t["c"]))


if __name__ == "__main__":
    sys.exit(main())
