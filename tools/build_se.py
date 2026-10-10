"""綠寶石音效庫（pokeemerald sound/）→ assets/gen3/se_bank.js、assets/gen3/se_midi.js

- 音色組：voicegroups/rs_sfx_1、rs_sfx_2、frlg_sfx、bard（每組 128 個音色）
  directsound（取樣，含迴圈點）、square_1／square_2（工作週期、掃頻、包絡）、noise（週期）
- 取樣：direct_sound_samples/*.wav（8 位元單聲道、smpl 迴圈資訊）
- 每個音效使用的音色組與音量：songs/midi/midi.cfg 的 -G、-V
- 所有 se_*.mid（含 130 個招式音效 se_m_*）
"""
import base64
import json
import os
import re
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, ".cache", "pokeemerald", "sound")
OUT = os.path.join(ROOT, "assets", "gen3")
GROUPS = ["rs_sfx_1", "rs_sfx_2", "frlg_sfx", "bard"]


def parse_group(name):
    path = os.path.join(S, "voicegroups", name + ".inc")
    voices = []
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        m = re.match(r"(voice_\w+)\s+(.*)", line)
        if not m:
            continue
        kind, args = m.group(1), [a.strip() for a in m.group(2).split(",")]
        v = {"k": kind}
        if kind.startswith("voice_directsound"):
            v.update(key=int(args[0]), s=args[2].replace("DirectSoundWaveData_", ""), a=int(args[3]), d=int(args[4]), su=int(args[5]), r=int(args[6]))
        elif kind.startswith("voice_square_1"):
            v.update(key=int(args[0]), sweep=int(args[2]), duty=int(args[3]), a=int(args[4]), d=int(args[5]), su=int(args[6]), r=int(args[7]))
        elif kind.startswith("voice_square_2"):
            v.update(key=int(args[0]), duty=int(args[2]), a=int(args[3]), d=int(args[4]), su=int(args[5]), r=int(args[6]))
        elif kind.startswith("voice_noise"):
            v.update(key=int(args[0]), period=int(args[2]), a=int(args[3]), d=int(args[4]), su=int(args[5]), r=int(args[6]))
        elif kind.startswith("voice_programmable_wave"):
            v.update(key=int(args[0]), wave=args[2].replace("ProgrammableWaveData_", ""), a=int(args[3]), d=int(args[4]), su=int(args[5]), r=int(args[6]))
        voices.append(v)
    return voices[:128]


def read_wav(path):
    d = open(path, "rb").read()
    rate = struct.unpack_from("<I", d, 24)[0]
    loop = None
    i = d.find(b"smpl")
    if i >= 0:
        n = struct.unpack_from("<I", d, i + 36)[0]
        if n:
            start, end = struct.unpack_from("<II", d, i + 52)
            loop = [start, end]
    j = d.find(b"data")
    size = struct.unpack_from("<I", d, j + 4)[0]
    pcm = d[j + 8:j + 8 + size]
    return {"rate": rate, "loop": loop, "pcm": base64.b64encode(pcm).decode()}


def main():
    cfg = {}
    for line in open(os.path.join(S, "songs", "midi", "midi.cfg"), encoding="utf-8"):
        m = re.match(r"(se_\w+)\.mid:\s*(.*)", line.strip())
        if not m:
            continue
        g = re.search(r"-G_?(\w+)", m.group(2))
        v = re.search(r"-V(\d+)", m.group(2))
        if g and g.group(1) in GROUPS:
            cfg[m.group(1)] = {"g": g.group(1), "v": int(v.group(1)) if v else 127}
    groups = {g: parse_group(g) for g in GROUPS}
    samples = {}
    for vs in groups.values():
        for v in vs:
            if "s" in v and v["s"] not in samples:
                p = os.path.join(S, "direct_sound_samples", v["s"] + ".wav")
                if os.path.exists(p):
                    samples[v["s"]] = read_wav(p)
    midis = {}
    for name in cfg:
        p = os.path.join(S, "songs", "midi", name + ".mid")
        if os.path.exists(p):
            midis[name] = base64.b64encode(open(p, "rb").read()).decode()
    with open(os.path.join(OUT, "se_bank.js"), "w", encoding="utf-8") as f:
        f.write("window.SE_BANK=" + json.dumps({"songs": {k: v for k, v in cfg.items() if k in midis}, "groups": groups, "samples": samples}, separators=(",", ":")) + ";\n")
        f.write("window.SE_MIDI=" + json.dumps(midis, separators=(",", ":")) + ";\n")
    print(f"音效 {len(midis)} 個、取樣 {len(samples)} 個 → se_bank.js")
    return list(midis)


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
