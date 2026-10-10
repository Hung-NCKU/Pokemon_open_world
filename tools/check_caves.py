"""檢查洞窟解謎（推石頭）從入口走得到終點：搜尋玩家位置與石頭配置的所有狀態。
用法：python tools/check_caves.py   （讀 assets/gen3/interiors.js）"""
import json
import os
import sys
from collections import deque

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load():
    s = open(os.path.join(ROOT, "assets/gen3/interiors.js"), encoding="utf-8").read()
    return json.loads(s[s.index("{"):s.rindex("}") + 1])


def solve(r, limit=400000):
    w, h, coll = r["w"], r["h"], r["coll"]
    free = lambda x, y: 0 <= x < w and 0 <= y < h and coll[y * w + x] == "0"
    goal = tuple(r["goal"])
    exits = {tuple(e) for e in r["exits"]}
    start = (tuple(r["exits"][0]), frozenset(map(tuple, r["boulders"])))
    seen = {start}
    q = deque([(start, 0)])
    while q:
        (p, bs), pushes = q.popleft()
        if p == goal:
            return pushes, len(seen)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (p[0] + dx, p[1] + dy)
            if not free(*n):
                continue
            nb = bs
            if n in bs:
                t = (n[0] + dx, n[1] + dy)
                # 石頭不能推進牆、其他石頭、出入口
                if not free(*t) or t in bs or t == goal or t in exits:
                    continue
                nb = (bs - {n}) | {t}
                n = p  # 推石頭時玩家不動
            st = (n, nb)
            if st not in seen:
                seen.add(st)
                if len(seen) > limit:
                    return None, len(seen)
                q.append((st, pushes + (nb is not bs)))
    return None, len(seen)


if __name__ == "__main__":
    d = load()
    ok = True
    for k, r in d.items():
        if not k.startswith("cave_"):
            continue
        steps, n = solve(r)
        print(f"{k}: {'可以解' if steps is not None else '無解'}（搜尋 {n} 個狀態）")
        ok &= steps is not None
    sys.exit(0 if ok else 1)
