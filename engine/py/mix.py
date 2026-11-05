"""Arc Lab pipeline: THE SOUND MIX. Voice + sound effects + beds -> out/mix.wav at -14 LUFS, true peak under -1 dBTP,
exactly the episode's frame count long (frames x 1600 samples at 48 kHz). Plus out/CUES.md: every sound, where it
lands, and why.

    python mix.py --ep ep01

INPUTS: vo.wav + timeline (voice step), <ep>/cues.json (the sound plan you write per episode), overlay/cues_overlay.json
(when cards/pills land: UI sounds follow them automatically), out/cuts.json (named CUES exported by the shot modules).

cues.json:
{
 "beds": [ { "sound": "synth:sea_waves", "from": 0, "to": 8.7, "gain": -24, "fade": [0.3, 0.8], "duck": 3 } ],
 "hits": [ { "sound": "synth:lamp_die", "at": "word:0:out", "gain": -16, "note": "the lamp dies" },
           { "sound": "dog_bark_1.mp3", "at": "cue:B05.bark", "gain": -20, "a": "on", "b": 0.8, "rate": 1.0, "lp": 6000, "pan": -0.2 } ],
 "ui": "auto", "ui_gain": 0
}
"at": seconds | "frame:F" | "line:N" | "line:N:end" | "word:N:word[:nth]" | "cue:NAME" (a shot module's CUES), plus
"offset" seconds. The sound's loudest instant lands ON that time ("hit_at": "start" places its start there instead).
"sound": "synth:<name>" (python sfx.py --list) or a file inside <series>/sfx/ (Pixabay downloads, logged in SOURCES.md).
Clip options for files: a (start s, or "on" = the recording's onset), b (length after a), rate, hp, lp, rev, pan.
Beds: "duck" dB under the voice (default 3); "gain" is the bed level with no voice.
Music: if the episode has a score.json (see score.py), it is rendered on its own MUSIC bus. cues.json "music":
{ "gain": -17, "duck": 7 } sets its level and how far it dips under the voice; { "off": true } leaves it out.

RULES (kept from the series that proved this): every effect is pinned to a REAL word onset or picture event, never
"roughly there"; any line with less than 5.6 LU of voice over the rest gets the rest pulled down (FX-under-voice
protection); no music with lyrics, no game audio, nothing voice-like under the narration.
"""
import json
import os
import re
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Episode, read_json, ep_arg  # noqa: E402
import sfx as SFX  # noqa: E402

SR = 48000
E = Episode(ep_arg(sys.argv[1:]))
FPS = E.fps
SPF = SR // FPS
TL = E.timeline
NF = int(TL["frames"]); N = NF * SPF; DUR = N / SR
LN = TL["lines"]
LINES = [(l["start"], l["end"]) for l in LN]
PLAN = read_json(E.dir / "cues.json", {"beds": [], "hits": [], "ui": "auto"})
OVC = read_json(E.overlay / "cues_overlay.json", {})
NAMED = read_json(E.out / "cuts.json", {}).get("cues", {})
CUES, CACHE = [], {}
_PUN = re.compile(r"[*!\"“”.,?;:—…]")


def db(g):
    return 10 ** (np.asarray(g) / 20)


def tt(n):
    return np.arange(n) / SR


def toks(s):
    return [_PUN.sub("", x).replace("’", "'").lower() for x in s.split()]


def when(spec):
    """resolve an "at" spec to seconds"""
    if isinstance(spec, (int, float)):
        return float(spec)
    s = str(spec)
    if s.startswith("frame:"):
        return int(s.split(":")[1]) / FPS
    if s.startswith("cue:"):
        k = s[4:]
        if k not in NAMED:
            raise SystemExit(f"cues.json: no shot cue '{k}' (shot modules export CUES; run `arclab plan` to refresh out/cuts.json)")
        return float(NAMED[k])
    p = s.split(":")
    if p[0] == "line":
        l = LN[int(p[1])]
        return l["end"] if len(p) > 2 and p[2] == "end" else l["start"]
    if p[0] == "word":
        l = LN[int(p[1])]; w = p[2].lower(); nth = int(p[3]) if len(p) > 3 else 0
        tk = toks(l["text"]); on = l.get("words") or []
        hits = [on[i] for i, x in enumerate(tk) if (x == w or x.startswith(w)) and i < len(on)]
        if len(hits) > nth:
            return float(hits[nth])
        print(f"  WARNING: word '{w}' not found in line {p[1]} ({l['text']!r}): using the line start")
        return l["start"]
    raise SystemExit(f"cues.json: can't read time '{spec}'")


def snap(t):
    return round(t * FPS) / FPS


def filt(x, kind, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype=kind, fs=SR, output="sos"), x, axis=0)


def peaking(x, f0, gain_db, q=1.0):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def load(name, dur=None):
    """a sound as float64 stereo: synth:<name> or a file in <series>/sfx/"""
    key = (name, dur if name.split(":")[-1] in SFX.BEDS else None)
    if key in CACHE:
        return CACHE[key]
    if name.startswith("synth:"):
        y = SFX.synth(name[6:], dur)
    else:
        p = E.series / "sfx" / name
        if not p.exists():
            raise SystemExit(f"sound file missing: {p} (fetch it with sfx.py, or use a synth: sound)")
        r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True)
        y = np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    CACHE[key] = y
    return y


def clip(name, a=0.0, b=None, rate=1.0, hp=None, lp=None, rev=False, fi=0.003, fo=0.03, **_):
    x = load(name)
    if a == "on":
        e = maximum_filter1d(np.abs(x).max(1), int(0.005 * SR)); a = max(0.0, int(np.argmax(e >= e.max() * db(-20))) / SR - 0.01)
        b = None if b is None else a + b
    elif b is not None:
        b = a + b
    y = x[int(a * SR): (len(x) if b is None else min(len(x), int(b * SR)))].copy()
    if rev:
        y = y[::-1].copy()
    if rate != 1.0:
        fr = Fraction(1 / rate).limit_denominator(50); y = signal.resample_poly(y, fr.numerator, fr.denominator, axis=0)
    if hp:
        y = filt(y, "highpass", hp)
    if lp:
        y = filt(y, "lowpass", lp)
    n = len(y); e = np.ones(n)
    if fi > 0:
        e = np.minimum(e, np.clip(tt(n) / fi, 0, 1))
    if fo > 0:
        e = np.minimum(e, np.clip((n / SR - tt(n)) / fo, 0, 1))
    y = y * e[:, None]
    pk = np.abs(y).max()
    return y / pk if pk > 0 else y


def place(bus, sig, t, gain_db=0.0, pan=0.0):
    if pan:
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        sig = sig * (np.array([np.cos(a), np.sin(a)]) * np.sqrt(2))[None, :]
    s = int(round(t * SR)); a, b = s, s + len(sig); sa, sb = 0, len(sig)
    if a < 0:
        sa, a = -a, 0
    if b > N:
        sb -= b - N; b = N
    if b > a:
        bus[a:b] += sig[sa:sb] * db(gain_db)


def peak_time(y):
    return int(np.argmax(uniform_filter1d(np.abs(y).max(1), int(0.01 * SR)))) / SR


def hit(bus, busname, h, label=None):
    t = when(h["at"]) + h.get("offset", 0.0)
    y = clip(h["sound"], **{k: v for k, v in h.items() if k in ("a", "b", "rate", "hp", "lp", "rev")})
    ht = 0.0 if h.get("hit_at") == "start" else peak_time(y)
    place(bus, y, snap(t) - ht, h.get("gain", -20), h.get("pan", 0.0))
    CUES.append((snap(t), label or h.get("note", h["sound"]), h.get("gain", -20), busname, h["sound"], str(h["at"])))


def beds(bus):
    for b in PLAN.get("beds", []):
        t0, t1 = when(b.get("from", 0)), min(DUR, when(b.get("to", DUR)))
        n = int((t1 - t0) * SR)
        if n <= 0:
            continue
        y = load(b["sound"], dur=(t1 - t0) + 0.1) if b["sound"].startswith("synth:") else loop(b["sound"], n)
        y = y[:n].copy()
        if b.get("lp"):
            y = filt(y, "lowpass", b["lp"])
        fin, fout = (b.get("fade") or [0.6, 0.8])
        e = np.minimum(np.clip(tt(n) / max(fin, 1e-3), 0, 1), np.clip((n / SR - tt(n)) / max(fout, 1e-3), 0, 1))
        y = y * e[:, None]
        rms = np.sqrt(np.mean(y ** 2)) + 1e-12
        a = int(t0 * SR)
        bus[a:a + n] += y / rms * 0.1 * db(b.get("gain", -24))
        CUES.append((snap(t0), b.get("note", f"bed {b['sound']}"), b.get("gain", -24), "bed", b["sound"], f"{t0:.2f}-{t1:.2f} s"))


MUSIC = PLAN.get("music") or {}


def music():
    """the episode's score (score.json) on its own bus, at the cues.json "music" level"""
    sc = read_json(E.dir / MUSIC.get("score", "score.json"), None)
    if not sc or MUSIC.get("off"):
        return np.zeros((N, 2))
    import score as SC                                                  # noqa: E402
    y = SC.render(sc, DUR, when)[:N]
    y = np.pad(y, ((0, N - len(y)), (0, 0)))
    rms = np.sqrt(np.mean(y[np.abs(y).max(1) > 1e-4] ** 2)) + 1e-12 if np.any(np.abs(y) > 1e-4) else 1.0
    g = MUSIC.get("gain", -17)
    CUES.append((0.0, f"music: {MUSIC.get('score', 'score.json')} ({len(sc.get('parts', []))} parts)", g, "music", "score.py", f"0-{DUR:.2f} s"))
    return y / rms * 0.1 * db(g)


def loop(name, n):
    x = load(name); k = min(int(0.8 * SR), len(x) // 3); L = len(x) - k
    out = np.zeros((n + len(x), 2)); pos = 0
    fin = np.sqrt(np.linspace(0, 1, k))[:, None]; fout = np.sqrt(np.linspace(1, 0, k))[:, None]
    while pos < n:
        y = x.copy()
        if pos > 0:
            y[:k] *= fin
        y[-k:] *= fout
        out[pos:pos + len(y)] += y; pos += L
    return out[:n]


UI = {"hud": ("synth:whoosh", -30), "card_in": ("synth:whoosh_big", -26), "card_land": ("synth:stamp", -24), "chip": ("synth:whoosh", -36),
      "stat_in": ("synth:whoosh", -28), "stat_tick": ("synth:tick", -32), "stat_stamp": ("synth:stamp", -22),
      "vote_in": ("synth:whoosh_big", -26), "pill": ("synth:pop", -22), "num": ("synth:tick", -28), "comment": ("synth:click", -28), "end": ("synth:whoosh_big", -27)}


def ui(bus):
    if PLAN.get("ui", "auto") != "auto":
        return
    g0 = PLAN.get("ui_gain", 0)
    def put(k, t, label):  # noqa: E306
        if t is None:
            return
        snd, g = UI[k]
        hit(bus, "ui", {"sound": snd, "at": float(t), "gain": g + g0}, label)
    if OVC.get("hud"):
        put("hud", OVC["hud"]["in"], "HUD slides in")
    for c in OVC.get("cards", []):
        put("card_in", c["in"] + 0.08, f"card {c['text']} slams in"); put("card_land", c["in"] + 0.17, f"card {c['text']} lands"); put("chip", c["chip"], "card shrinks to a chip")
    st = OVC.get("stat")
    if st:
        put("stat_in", st["in"], "vote card in")
        for k, t in enumerate(np.linspace(st["in"] + 0.25, st["in"] + 1.4, 8)):
            put("stat_tick", float(t), "count-up tick")
        put("stat_stamp", st["stamp"], "YOU CHOSE stamp")
    v = OVC.get("vote")
    if v:
        put("vote_in", v["in"] + 0.06, "WHAT DO YOU DO? slams in")
        for k, t in enumerate(v.get("pills", [])):
            put("pill", t, f"vote pill {k + 1} pops")
        put("comment", v.get("comment"), "COMMENT 1 2 3")
        for k, t in enumerate(v.get("nums", [])):
            put("num", t, f"pill {k + 1} pulses on its number")
    if OVC.get("end"):
        put("end", OVC["end"]["in"] + 0.1, "end card")


# ------------------------------------------------------------------------------------------------ voice + master
def kweight(x):
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]; a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]; a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)


def lufs(x):
    y = kweight(x); bl, hop = int(0.4 * SR), int(0.1 * SR)
    p = np.sum(y ** 2, axis=1); c = np.concatenate([[0], np.cumsum(p)])
    st = np.arange(0, len(p) - bl + 1, hop); z = (c[st + bl] - c[st]) / bl
    L = -0.691 + 10 * np.log10(z + 1e-20); z1 = z[L > -70]
    if len(z1) == 0:
        return -99.0
    rel = -0.691 + 10 * np.log10(z1.mean()) - 10
    z2 = z1[(-0.691 + 10 * np.log10(z1 + 1e-20)) > rel]
    return -0.691 + 10 * np.log10(z2.mean())


def mom(x, a, b):
    y = kweight(x[int(a * SR):int(b * SR)])
    return -0.691 + 10 * np.log10(np.mean(np.sum(y ** 2, 1)) + 1e-20)


def true_peak(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return np.abs(up).max(axis=1)[: len(x) * 4].reshape(len(x), 4).max(axis=1)


def limiter(x, ceil_db=-1.3):
    req = np.minimum(1.0, db(ceil_db) / np.maximum(true_peak(x), 1e-9))
    g = uniform_filter1d(minimum_filter1d(req, int(0.08 * SR) + 1), int(0.04 * SR))
    return x * g[:, None], 20 * np.log10(g.min())


def voice():
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", str(E.dir / "vo.wav"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True)
    v = np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64).copy()
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    st2 = lambda x: np.stack([x, x], 1)  # noqa: E731
    lv = [mom(st2(v), a, b) for a, b in LINES]; med = float(np.median(lv))
    g_line = np.zeros(N)
    for i, (a, b) in enumerate(LINES):                                  # even out line levels (half way to the median)
        g_line[int(max(0, a - 0.05) * SR):int(min(DUR, b + 0.12) * SR)] = float(np.clip((med - lv[i]) * 0.5, -3, 3))
    v = v * db(uniform_filter1d(g_line, int(0.02 * SR)))
    v = filt(v, "highpass", 75); v = peaking(v, 3200, 2.0, 0.9); v = peaking(v, 250, -1.5, 1.0)
    rms = uniform_filter1d(maximum_filter1d(np.sqrt(uniform_filter1d(v ** 2, int(0.010 * SR)) + 1e-12), int(0.006 * SR)), int(0.012 * SR))
    lvv = 20 * np.log10(rms); v = v * db(np.where(lvv > -24.0, (-24.0 - lvv) * (1 - 1 / 3.0), 0.0))
    req = np.minimum(1.0, db(-13.0) / np.maximum(np.abs(v), 1e-9))
    v = v * uniform_filter1d(minimum_filter1d(req, int(0.006 * SR) + 1), int(0.006 * SR))
    return st2(v)


def voice_env():
    cr = 1000; m = int(DUR * cr) + 1; gate = np.zeros(m)
    for s, e in LINES:
        gate[max(0, int((s - 0.06) * cr)): int((e + 0.08) * cr)] = 1
    env = np.zeros(m); v = 0.0; a = 1 - np.exp(-1 / (0.05 * cr)); rl = 1 - np.exp(-1 / (0.30 * cr))
    for i in range(m):
        v += (gate[i] - v) * (a if gate[i] > v else rl); env[i] = v
    return np.interp(np.arange(N) / SR, np.arange(m) / cr, env)


def main():
    bed, fx, uib = np.zeros((N, 2)), np.zeros((N, 2)), np.zeros((N, 2))
    beds(bed)
    mus = music()
    for h in PLAN.get("hits", []):
        hit(fx, "fx", h)
    ui(uib)
    vo = voice(); venv = voice_env()
    duck = max([b.get("duck", 3) for b in PLAN.get("beds", [])] or [3])
    rest = bed * db(-duck * venv)[:, None] + mus * db(-MUSIC.get("duck", 7) * venv)[:, None] + fx + uib
    Tn = np.arange(N) / SR; prot = np.zeros(N); PROT = {}
    for _ in range(4):                                                  # FX-under-voice protection
        bm = rest * db(prot)[:, None]
        low = [(i, mom(vo, a, b) - mom(bm, a, b)) for i, (a, b) in enumerate(LINES)]
        low = [(i, m) for i, m in low if m < 5.6]
        if not low:
            break
        for i, m in low:
            a, b = LINES[i]; d_ = 5.9 - m
            prot += np.interp(Tn, [0, a - 0.3, a - 0.05, b + 0.05, b + 0.3, DUR], [0, 0, -d_, -d_, 0, 0])
            PROT[i] = PROT.get(i, 0.0) + d_
    rest = rest * db(prot)[:, None]
    print("fx-under-voice protection:", ", ".join(f"L{i:02d} -{d:.1f} dB" for i, d in sorted(PROT.items())) or "none needed")
    mix = vo + rest
    target, gain = -14.0, -14.0 - lufs(vo + rest)
    for it in range(8):
        y, gr = limiter(mix * db(gain), -1.3)
        Lm = lufs(y); tp = 20 * np.log10(true_peak(y).max())
        out = y
        if abs(Lm - target) < 0.05 and tp <= -1.05:
            break
        gain += target - Lm
    print(f"master: {Lm:.2f} LUFS, true peak {tp:.2f} dBTP, max limiting {gr:.1f} dB")
    out[: int(0.001 * SR)] *= np.linspace(0, 1, int(0.001 * SR))[:, None]
    out[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))[:, None]
    E.out.mkdir(exist_ok=True)
    sf.write(E.out / "mix.wav", out.astype(np.float32), SR, subtype="PCM_24")
    margins = [mom(vo * db(gain), a, b) - mom(rest * db(gain), a, b) for a, b in LINES]
    print(f"wrote out/mix.wav: {len(out)} samples = {len(out) / SPF:.0f} frames (want {NF}); voice over the rest: min {min(margins):.1f} LU")
    with open(E.out / "CUES.md", "w", encoding="utf-8") as f:
        f.write(f"# Sound cues: {E.cfg.get('title', E.dir.name)}\n\n| Frame | Time | Cue | dB | Bus | Source | Anchor |\n|---|---|---|---|---|---|---|\n")
        for t, label, g, bus, src, anchor in sorted(CUES):
            f.write(f"| {round(t * FPS)} | {t:.2f} | {label} | {g} | {bus} | {src} | {anchor} |\n")
    print(f"wrote out/CUES.md ({len(CUES)} cues)")


if __name__ == "__main__":
    main()
