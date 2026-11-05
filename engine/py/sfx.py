"""Arc Lab pipeline: SOUND EFFECTS. Two sources:

1. SYNTH: an original library of sound effects made from code (no recordings, no licences to worry about): whooshes,
   hits, stamps, clicks, ticks, pops, a heartbeat, chimes, drips, sniffs, soft steps, creaks, a lamp buzz and power-down,
   a foghorn, and beds (sea, wind, rain, room tone, dark and warm drones). Deterministic: the same name always gives the
   same sound. Use them in cues.json as "synth:<name>".
       python sfx.py --ep ep01 --list                      what's in the synth library
       python sfx.py --ep ep01 --render sea_waves 12       write <series>/sfx/synth/sea_waves.wav (12 s) to listen to

2. PIXABAY (real recordings, free for commercial use under the Pixabay Content License, which forbids redistributing the
   files on their own). The skill never ships Pixabay files: it searches and downloads them into YOUR series (with your
   OK) and logs every file's title, author and page in <series>/sfx/SOURCES.md.
       python sfx.py --ep ep01 --search "dog bark" "foghorn"   ranked results (metadata only, nothing downloaded)
       python sfx.py --ep ep01 --fetch picks.json             download the picks into <series>/sfx/ + log them
   picks.json: [{"name": "dog_bark_1", "use": "the dog barks", "page": "...", "url": "...", "title": "...", "author": "...", "secs": 2}]
   ("url" may be left out: it is read from the page.) Files already there are skipped; files already in SOURCES.md
   aren't logged twice.
   In cues.json, refer to a fetched file as "dog_bark_1.mp3" (a path inside <series>/sfx/).
"""
import json
import re
import subprocess
import sys
import time
import urllib.parse
from datetime import date
from pathlib import Path

import numpy as np
from scipy import signal

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Episode, ep_arg, find_series  # noqa: E402

SR = 48000


# ------------------------------------------------------------------------------------------------ DSP basics
def _t(n):
    return np.arange(n) / SR


def _n(dur):
    return int(dur * SR)


def _rng(seed):
    return np.random.default_rng(seed)


def _bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x, axis=0)


def _lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x, axis=0)


def _hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x, axis=0)


def _env(n, a=0.005, r=0.2, hold=0.0):
    t = _t(n)
    e = np.minimum(1, t / max(a, 1e-4))
    rel = np.clip((t - a - hold) / max(r, 1e-4), 0, None)
    return e * np.exp(-rel * 5)


def _st(x, width=0.0, seed=1):
    """mono -> stereo; width adds a slightly decorrelated copy"""
    if width <= 0:
        return np.stack([x, x], 1)
    d = int(0.011 * SR * width)
    y = np.concatenate([np.zeros(d), x[:-d]]) if d else x
    return np.stack([x * (1 - width * 0.3) + y * width * 0.3, y * (1 - width * 0.3) + x * width * 0.3], 1)


def _norm(x, peak=0.9):
    m = np.abs(x).max()
    return x / m * peak if m > 0 else x


def _verb(x, dur=0.8, mix=0.25, seed=3):
    """cheap reverb: convolution with a decaying noise tail"""
    n = _n(dur)
    ir = _rng(seed).standard_normal(n) * np.exp(-_t(n) * 6 / dur)
    ir = _lp(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    if x.ndim == 1:
        w = np.pad(signal.fftconvolve(x, ir), (0, 1))[:len(x) + n]
        return np.concatenate([x, np.zeros(n)]) * (1 - mix) + w * mix
    return np.stack([_verb(x[:, c], dur, mix, seed + c) for c in range(x.shape[1])], 1)


def _pink(n, seed):
    w = _rng(seed).standard_normal(n)
    b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w)


# ------------------------------------------------------------------------------------------------ the synth library
def whoosh(dur=0.55, seed=1, up=True):
    n = _n(dur); x = _rng(seed).standard_normal(n); t = _t(n)
    fc = 300 + 2600 * np.sin(np.pi * t / dur) ** 2 if up else 2400 - 2000 * t / dur
    y = np.zeros(n); hop = 512
    for i in range(0, n, hop):
        f = float(fc[min(i, n - 1)]); y[i:i + hop] = _bp(x[max(0, i - 2048):i + hop], max(60, f * 0.6), min(18000, f * 1.6))[-len(y[i:i + hop]):]
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    return _st(_norm(y * e), 0.6, seed)


def whoosh_big(seed=2):
    a = whoosh(1.1, seed)
    n = len(a); t = _t(n); boom = np.sin(2 * np.pi * (48 - 14 * t) * t) * np.exp(-np.clip(t - 0.55, 0, None) * 5) * (t > 0.5)
    return _norm(a + _st(boom * 0.8))


def thud(seed=3):
    n = _n(0.5); t = _t(n)
    y = np.sin(2 * np.pi * (70 * np.exp(-t * 6) + 38) * t) * np.exp(-t * 9)
    y += _lp(_rng(seed).standard_normal(n), 900) * np.exp(-t * 40) * 0.5
    return _st(_norm(y))


def stamp(seed=4):
    n = _n(0.35); t = _t(n)
    y = np.sin(2 * np.pi * (90 * np.exp(-t * 10) + 55) * t) * np.exp(-t * 14)
    y += _bp(_rng(seed).standard_normal(n), 1200, 4000) * np.exp(-t * 60) * 0.7
    return _st(_norm(_verb(y, 0.3, 0.12)))


def click(seed=5):
    n = _n(0.06); t = _t(n)
    y = _hp(_rng(seed).standard_normal(n), 2000) * np.exp(-t * 400) + np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 120) * 0.6
    return _st(_norm(y))


def tick(seed=6):
    n = _n(0.04); t = _t(n)
    return _st(_norm(np.sin(2 * np.pi * 5200 * t) * np.exp(-t * 300) + _hp(_rng(seed).standard_normal(n), 4000) * np.exp(-t * 700) * 0.5))


def pop(seed=7):
    n = _n(0.12); t = _t(n)
    f = 420 + 900 * (t / 0.12)
    return _st(_norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35)))


def heartbeat(seed=8):
    one = thud(seed)[:, 0][: _n(0.3)] * 0.9
    n = _n(0.9); y = np.zeros(n)
    y[: len(one)] += one; s = _n(0.22); y[s:s + len(one)] += one * 0.7
    return _st(_norm(_lp(y, 300)))


def chime(seed=9, f0=880):
    n = _n(2.2); t = _t(n); y = np.zeros(n)
    for k, (r, a, d) in enumerate([(1, 1, 2.2), (2.76, 0.5, 3.5), (5.4, 0.25, 5), (8.9, 0.12, 7)]):
        y += a * np.sin(2 * np.pi * f0 * r * t + k) * np.exp(-t * d)
    return _st(_norm(_verb(y * np.minimum(1, t / 0.002), 1.0, 0.2)), 0.4)


def sparkle(seed=10):
    n = _n(1.2); y = np.zeros(n); r = _rng(seed)
    for i in range(9):
        a = _n(0.09 * i); c = chime(seed + i, 1400 + 400 * r.random())[:, 0][: _n(0.6)] * (0.9 - i * 0.07)
        y[a:a + len(c)] += c[: max(0, n - a)]
    return _st(_norm(y), 0.7)


def drip(seed=11):
    n = _n(0.25); t = _t(n)
    f = 900 + 1400 * np.minimum(1, t / 0.03)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28)
    return _st(_norm(_verb(y, 0.5, 0.25)))


def sniff(seed=12, n_=3):
    n = _n(0.7); y = np.zeros(n); x = _rng(seed).standard_normal(n)
    for i in range(n_):
        a = _n(0.06 + i * 0.17); m = _n(0.11); e = np.sin(np.pi * np.linspace(0, 1, m)) ** 2
        y[a:a + m] += _bp(x[a:a + m], 1800, 6000) * e * (1 - 0.15 * i)
    return _st(_norm(y))


def steps_soft(seed=13, n_=4, gap=0.24):
    n = _n(gap * n_ + 0.2); y = np.zeros(n); r = _rng(seed)
    for i in range(n_):
        a = _n(i * gap + r.uniform(-0.02, 0.02)); m = _n(0.08); tt = _t(m)
        y[a:a + m] += _lp(r.standard_normal(m), 1400) * np.exp(-tt * 45) * r.uniform(0.7, 1)
    return _st(_norm(y))


def bark(seed=18, n_=1):
    """a small cartoon dog's bark (a pitched burst through two formants)"""
    n = _n(0.32 * n_ + 0.1); y = np.zeros(n); r = _rng(seed)
    for i in range(n_):
        m = _n(0.17); t = _t(m)
        f = 520 * np.exp(-t * 4.5) + 260
        src = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) + 0.35 * r.standard_normal(m)
        v = _bp(src, 600, 1400) + 0.6 * _bp(src, 1800, 3200)
        a = _n(0.3 * i); y[a:a + m] += v * np.minimum(1, t / 0.008) * np.exp(-t * 14) * (1 - 0.15 * i)
    return _st(_norm(_verb(y, 0.35, 0.15)))


def creak(seed=14, dur=0.9):
    n = _n(dur); t = _t(n); r = _rng(seed)
    f = 180 + 120 * np.sin(2 * np.pi * 1.3 * t) + 40 * signal.sosfilt(signal.butter(1, 8, fs=SR, output="sos"), r.standard_normal(n)) * 20
    saw = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR)
    y = _bp(saw, 300, 2500) * np.sin(np.pi * t / dur) ** 0.7
    return _st(_norm(_verb(y, 0.6, 0.2)))


def lamp_buzz(dur=2.0, seed=15):
    n = _n(dur); t = _t(n); r = _rng(seed)
    y = 0.6 * np.sin(2 * np.pi * 120 * t) + 0.3 * signal.sawtooth(2 * np.pi * 240 * t) * 0.3 + 0.1 * _bp(r.standard_normal(n), 2000, 6000)
    return _st(_norm(_lp(y, 3000)) * 0.8)


def lamp_die(seed=16):
    """the lamp: a crackle and flicker, then the hum sweeps down and stops (~0.9 s)"""
    n = _n(1.0); t = _t(n); r = _rng(seed)
    f = 120 * np.exp(-np.clip(t - 0.25, 0, None) * 2.2)
    hum = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * signal.sawtooth(2 * np.pi * np.cumsum(f * 2) / SR)) * np.exp(-np.clip(t - 0.25, 0, None) * 4)
    crack = np.zeros(n)
    for k in range(7):
        a = _n(r.uniform(0, 0.35)); m = _n(0.012); crack[a:a + m] += _hp(r.standard_normal(m), 1500) * r.uniform(0.4, 1)
    y = _lp(hum, 2500) * 0.6 + crack
    return _st(_norm(y))


def foghorn(seed=17, dur=2.6):
    n = _n(dur); t = _t(n)
    f = 92 * (1 - 0.04 * np.clip((t - dur + 0.6) / 0.6, 0, 1))
    y = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) + 0.6 * signal.sawtooth(2 * np.pi * np.cumsum(f * 1.5) / SR)
    y = _lp(y, 650, 4) * np.minimum(1, t / 0.25) * np.clip((dur - t) / 0.7, 0, 1)
    return _st(_norm(_verb(y, 2.2, 0.45)), 0.5)


def bed_noise(dur, seed, kind):
    n = _n(dur); t = _t(n); r = _rng(seed)
    if kind == "sea_waves":
        base = _lp(_pink(n, seed), 900)
        sw = 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t + 1) ** 2
        crest = _bp(r.standard_normal(n), 2500, 9000) * np.clip(np.sin(2 * np.pi * 0.11 * t + 1.4), 0, 1) ** 6 * 0.4
        y = base * sw + crest
    elif kind == "wind":
        y = np.zeros(n); x = r.standard_normal(n); hop = 4096
        fc = 500 + 350 * np.sin(2 * np.pi * 0.07 * t) + 150 * np.sin(2 * np.pi * 0.23 * t + 2)
        for i in range(0, n, hop):
            seg = x[max(0, i - 4096):i + hop]; y[i:i + hop] = _bp(seg, fc[i] * 0.6, fc[i] * 1.6)[-len(y[i:i + hop]):]
        y *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.09 * t) ** 2
    elif kind == "rain":
        y = _hp(r.standard_normal(n), 2500) * 0.4 + _lp(_pink(n, seed + 1), 500) * 0.6
    elif kind == "room_tone":
        y = _lp(_pink(n, seed), 250) + 0.02 * np.sin(2 * np.pi * 60 * t)
    elif kind == "drone_dark":
        y = np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.6 * t + 1) + 0.3 * np.sin(2 * np.pi * 110.4 * t)
        y *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.17 * t)
        y = _lp(y + 0.15 * _lp(_pink(n, seed), 300), 400)
    elif kind == "drone_warm":
        y = sum(a * np.sin(2 * np.pi * f * t + k) for k, (f, a) in enumerate([(110, 1), (164.8, 0.6), (277.2, 0.4), (329.6, 0.25)]))
        y *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.21 * t)
        y = _lp(y, 1200)
    else:
        raise SystemExit(f"unknown bed {kind}")
    return np.stack([y, np.roll(y, _n(0.013))], 1)


BEDS = ("sea_waves", "wind", "rain", "room_tone", "drone_dark", "drone_warm")
LIB = {"whoosh": whoosh, "whoosh_big": whoosh_big, "thud": thud, "stamp": stamp, "click": click, "tick": tick, "pop": pop,
       "heartbeat": heartbeat, "chime": chime, "sparkle": sparkle, "drip": drip, "sniff": sniff, "steps_soft": steps_soft,
       "creak": creak, "bark": bark, "lamp_buzz": lamp_buzz, "lamp_die": lamp_die, "foghorn": foghorn}


def synth(name, dur=None):
    """a library sound as a float64 stereo array at 48 kHz (beds need a duration)"""
    if name in BEDS:
        y = bed_noise(dur or 10.0, sum(map(ord, name)), name)
        return y / (np.sqrt(np.mean(y ** 2)) + 1e-12) * 0.25
    if name not in LIB:
        raise SystemExit(f"no synth sound '{name}': have {', '.join(sorted([*LIB, *BEDS]))}")
    return LIB[name]().astype(np.float64)


# ------------------------------------------------------------------------------------------------ Pixabay
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


def _get(url):
    for wait in (3, 8, 20, None):                     # Pixabay refuses quick repeat requests for a few seconds: wait, retry
        r = subprocess.run(["curl", "-sSL", "--fail", "-A", UA, url], capture_output=True, timeout=40)   # curl passes the bot check
        if r.returncode == 0:
            return r.stdout.decode("utf-8", "replace")
        if wait:
            time.sleep(wait)
    raise RuntimeError(f"curl {r.returncode}")


def _info(href):
    h = _get("https://pixabay.com" + href)
    for blob in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try:
            o = json.loads(blob)
        except Exception:  # noqa: BLE001
            continue
        if o.get("@type") == "AudioObject":
            st = {s["interactionType"].rsplit("/", 1)[-1]: s["userInteractionCount"] for s in o.get("interactionStatistic", [])}
            m = re.match(r"PT(?:(\d+)M)?(?:(\d+)S)?", o.get("duration", ""))
            return {"page": "https://pixabay.com" + href, "title": o.get("headline") or o.get("name"), "author": (o.get("author") or {}).get("name"),
                    "url": o.get("contentUrl"), "secs": (int(m.group(1) or 0) * 60 + int(m.group(2) or 0)) if m else None, "downloads": st.get("DownloadAction", 0)}
    return None


def search(q, k=6):
    h = _get("https://pixabay.com/sound-effects/search/" + urllib.parse.quote(q) + "/")
    out = []
    for l in list(dict.fromkeys(re.findall(r'href="(/sound-effects/[a-z0-9-]+-\d+/)"', h)))[:k]:
        try:
            i = _info(l)
            if i:
                out.append(i)
        except Exception as e:  # noqa: BLE001
            print("  skip", l, e)
        time.sleep(0.2)
    return sorted(out, key=lambda i: -i["downloads"])


def fetch(series, picks_path):
    picks = json.loads(Path(picks_path).read_text(encoding="utf-8"))
    out = series / "sfx"; out.mkdir(exist_ok=True)
    rows, logged = [], (out / "SOURCES.md").read_text(encoding="utf-8") if (out / "SOURCES.md").exists() else ""
    for p in picks:
        dst = out / f"{p['name']}.mp3"
        if not dst.exists():
            try:
                url = p.get("url") or (_info(urllib.parse.urlparse(p["page"]).path) or {}).get("url")
            except Exception:  # noqa: BLE001
                url = None
            r = None
            for wait in (3, 10, None) if url else ():
                r = subprocess.run(["curl", "-sSL", "--fail", "-A", UA, "-e", "https://pixabay.com/", "-o", str(dst), url])
                if r.returncode == 0 or not wait:
                    break
                time.sleep(wait)
            if not r or r.returncode != 0:
                dst.unlink(missing_ok=True)
                print(f"FAILED {p['name']}: download it from {p['page']} and save it as {dst}")
                continue
            time.sleep(2)
        if f"| {p['name']}.mp3 |" in logged:
            print(f"ok {p['name']} (already logged)")
            continue
        rows.append(f"| {p['name']}.mp3 | {p.get('use', '')} | {p.get('title', '')} | {p.get('author', '')} | {p.get('secs', '')} s | {dst.stat().st_size // 1024} KB | {p['page']} |")
        print(f"ok {p['name']}")
    missing = [p["name"] for p in picks if not (out / f"{p['name']}.mp3").exists()]
    if missing:
        print(f"{len(missing)} not downloaded ({', '.join(missing)}): Pixabay slows down quick downloads, so run the same command "
              "again in a minute (it only fetches the missing ones)")
    if not rows:
        return
    log = out / "SOURCES.md"
    head = "" if log.exists() else ("# Sound sources\n\nPixabay files: Pixabay Content License (free for commercial use, no attribution required, "
                                    "no redistribution of the files on their own). Synth sounds (synth:*) are made by the Arc Lab engine.\n")
    with log.open("a", encoding="utf-8") as f:
        f.write(head + f"\n## Pixabay batch, {date.today()}\n\n| File | Use | Title | Author | Length | Size | Page |\n|---|---|---|---|---|---|---|\n" + "\n".join(rows) + "\n")


def main(argv):
    series = find_series(ep_arg(argv) or ".")
    if "--list" in argv:
        print("hits:", ", ".join(sorted(LIB)))
        print("beds (give a length):", ", ".join(BEDS))
        return
    if "--render" in argv:
        i = argv.index("--render"); name = argv[i + 1]; dur = float(argv[i + 2]) if len(argv) > i + 2 and argv[i + 2][0].isdigit() else None
        import soundfile as sf
        d = series / "sfx" / "synth"; d.mkdir(parents=True, exist_ok=True)
        sf.write(d / f"{name}.wav", np.clip(synth(name, dur), -1, 1).astype(np.float32), SR)
        print(f"wrote {d / (name + '.wav')}")
        return
    if "--search" in argv:
        qs = argv[argv.index("--search") + 1:]
        qs = [q for q in qs if not q.startswith("--")]
        res = {q: search(q) for q in qs}
        (series / "sfx").mkdir(exist_ok=True)
        (series / "sfx" / "_search.json").write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding="utf-8")
        for q, v in res.items():
            print(q)
            for i in v[:5]:
                print(f"   {i['downloads']:>6} downloads {str(i['secs']):>4}s  {i['title'][:60]}  {i['page']}")
        print(f"(full results: {series / 'sfx' / '_search.json'})")
        return
    if "--fetch" in argv:
        fetch(series, argv[argv.index("--fetch") + 1])
        return
    print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
