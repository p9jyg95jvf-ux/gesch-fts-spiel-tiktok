"""Arc Lab pipeline: THE SCORE. Original music made from code, locked to the episode's story beats.

No recordings and no licences: every instrument is synthesised here, deterministically (the same score.json always
gives the same music), so a series can ship its music anywhere. The episode's score lives in <episode>/score.json; the
mixer (mix.py) renders it on its own MUSIC bus, ducks it under the voice and keeps the voice on top.

    python score.py --ep ep01                 render out/score.wav to listen to on its own

score.json:
{
  "bpm": 100, "key": "D minor (a note for people; the notes below are what plays)",
  "parts": [
    { "inst": "drone",    "note": "D1", "from": 0, "to": "cue:B01.bark1", "gain": -8, "fade": [2, 0.4] },
    { "inst": "pad",      "chords": [[0, ["D3","A3","C4","F4"]], ["line:3", ["D3","A3","Eb4","F4"]]], "from": 0.3, "to": 15.3, "gain": -6 },
    { "inst": "bell",     "seq": [[0.4, "D5"], [2.7, "A4"], ["word:1:slept", "F5"]], "gain": -12 },
    { "inst": "ostinato", "notes": ["D2","D2","D2","D2","D2","D2","F2","E2"], "from": "cue:B01.bark1", "to": 19.07, "gain": -8 },
    { "inst": "toms",     "pattern": "x..x..x.x...x...", "from": 27.23, "to": 37.6, "gain": -6 },
    { "inst": "ticks",    "from": 27.23, "to": 37.6, "gain": -22 },
    { "inst": "riser",    "from": 23.1, "to": "cue:B06.boom", "gain": -6 },
    { "inst": "braam",    "at": "cue:B06.boom", "note": "D1", "dur": 3.5, "gain": -2 }
  ],
  "stops": [ { "from": "cue:B04.almost", "to": 23.05 } ]
}
Times take the same forms as cues.json: seconds, "frame:N", "cue:<shot cue>", "line:N", "line:N:end", "word:N:word".
Rhythm parts (ostinato, toms, ticks) lock their first beat to "from" (put it on a cut or a word). "chords" changes the
pad's chord at each time; a part's "gain" is in dB relative to the others; "stops" are hard silences (a drop before a
reveal). The music is cut on the last frame of the episode.

Instruments: drone (sub + low octave), pad (detuned string-like saws, slow swell), bell (a music-box / celesta note),
ostinato (a plucked bass on eighth notes), toms (low drums from a 16-step pattern per bar), ticks (a clock-like hi-hat
on sixteenths), riser (a rising cluster that builds into a hit), braam (a huge low brass hit + sub drop).
"""
import re
import sys
from pathlib import Path

import numpy as np
from scipy import signal

SR = 48000
_NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8,
         "A": 9, "A#": 10, "Bb": 10, "B": 11}


def hz(n):
    """'D3' / 'Eb4' / 146.8 -> Hz"""
    if isinstance(n, (int, float)):
        return float(n)
    m = re.fullmatch(r"([A-G][#b]?)(-?\d)", str(n).strip())
    if not m:
        raise SystemExit(f"score.json: can't read the note '{n}' (use names like D3, Eb4, F#2)")
    return 440.0 * 2 ** ((_NOTE[m[1]] - 9) / 12 + (int(m[2]) - 4))


def _t(n):
    return np.arange(n) / SR


def _lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, min(f, SR * 0.45), btype="low", fs=SR, output="sos"), x, axis=0)


def _hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x, axis=0)


def _saw(f, n, phase=0.0):
    """a saw wave (f may be an array for glides); the band above ~6 kHz is filtered by every instrument that uses it"""
    ph = phase + np.cumsum(np.broadcast_to(f, (n,)).astype(np.float64)) / SR
    return 2 * (ph - np.floor(ph + 0.5))


def _fade(n, a, r):
    t = _t(n); d = n / SR
    return np.clip(t / max(a, 1e-4), 0, 1) * np.clip((d - t) / max(r, 1e-4), 0, 1)


def _pan(x, p):
    """mono -> stereo, p in -1..1 (equal power)"""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)


def reverb(x, dur=2.6, pre=0.02, damp=4200, seed=7):
    """a smooth stereo hall: decaying, darkening noise impulse responses (one per side, decorrelated)"""
    n = int(dur * SR); t = _t(n); out = []
    for c in range(2):
        ir = np.random.default_rng(seed + c).standard_normal(n) * np.exp(-t * 6.9 / dur)
        ir = _lp(ir, damp) * (1 - np.exp(-t / 0.004))
        ir = np.concatenate([np.zeros(int(pre * SR)), ir]); ir /= np.sqrt(np.sum(ir ** 2)) + 1e-12
        out.append(signal.fftconvolve(x[:, c], ir)[: len(x)])
    return np.stack(out, 1)


# ------------------------------------------------------------------------------------------------ instruments
def drone(note, dur, seed=1):
    n = int(dur * SR); t = _t(n); f = hz(note)
    y = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t + 1) + 0.18 * np.sin(2 * np.pi * 3.01 * f * t + 2)
    y *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.13 * t)
    rum = _lp(np.random.default_rng(seed).standard_normal(n), 120) * 0.6
    y = np.tanh(1.4 * (y + rum)) / np.tanh(1.4)
    return np.stack([y, np.roll(y, int(0.009 * SR))], 1)


def pad(chords, dur, bright=0.45, seed=2):
    """chords: [(t_rel, [notes])]; each chord swells in over 0.6 s and out over 0.9 s, overlapping the next"""
    n = int(dur * SR); out = np.zeros((n, 2)); rng = np.random.default_rng(seed)
    for k, (t0, notes) in enumerate(chords):
        t1 = chords[k + 1][0] if k + 1 < len(chords) else dur
        a = int(max(0, t0 - 0.15) * SR); b = min(n, int((t1 + 0.9) * SR)); m = b - a
        if m <= 0:
            continue
        seg = np.zeros((m, 2))
        for i, note in enumerate(notes):
            f = hz(note)
            for j, cents in enumerate((-9, -3, 4, 10)):
                ff = f * 2 ** (cents / 1200) * (1 + 0.0018 * np.sin(2 * np.pi * (4.6 + 0.3 * j) * _t(m) + rng.uniform(0, 6)))   # vibrato
                v = _saw(ff, m, rng.uniform())
                seg += _pan(v, [-0.7, -0.25, 0.25, 0.7][j] * (0.6 + 0.4 * (i % 2)))
        seg = _lp(seg, 300 + 2200 * bright, 4) * 0.6 + _lp(seg, 150 + 700 * bright, 4) * 0.4      # steep: strings, not buzz
        seg *= _fade(m, 0.6 if k else 1.4, 0.9)[:, None] / max(1, len(notes)) ** 0.5
        out[a:b] += seg[: n - a]
    return out


def bell(note, seed=3):
    """a music-box / celesta note: inharmonic partials with their own decays, a soft mallet click"""
    f = hz(note); n = int(3.2 * SR); t = _t(n)
    y = sum(amp * np.sin(2 * np.pi * f * r * t + k) * np.exp(-t / dec)
            for k, (r, amp, dec) in enumerate([(1, 1, 2.2), (2.0, 0.42, 1.3), (3.01, 0.2, 0.8), (4.18, 0.1, 0.45), (5.43, 0.05, 0.3)]))
    y += 0.08 * _hp(np.random.default_rng(seed).standard_normal(n), 3000) * np.exp(-t / 0.006)
    y *= np.clip(t / 0.003, 0, 1)
    return np.stack([y, np.roll(y, int(0.006 * SR))], 1)


def pluck(note, accent=1.0):
    """the ostinato's plucked bass: a saw whose filter snaps open and closes"""
    f = hz(note); n = int(0.42 * SR); t = _t(n)
    v = _saw(f, n) + 0.5 * _saw(f * 1.003, n, 0.3)
    bright, dark = _lp(v, 1600 + 900 * accent, 2), _lp(v, 260, 2)
    fe = np.exp(-t / 0.07)
    y = (bright * fe + dark * (1 - fe)) * np.exp(-t / 0.16) * np.clip(t / 0.003, 0, 1) * (0.75 + 0.25 * accent)
    y += 0.5 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.2)
    return np.stack([y, y], 1)


def tom(accent=1.0, seed=4):
    n = int(0.7 * SR); t = _t(n)
    f = 52 + 70 * np.exp(-t / 0.035)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32)
    y += 0.35 * _lp(np.random.default_rng(seed).standard_normal(n), 900) * np.exp(-t / 0.02)
    y = np.tanh(1.8 * y * accent) / np.tanh(1.8)
    return np.stack([y, y], 1)


def tick(accent=1.0, seed=5):
    n = int(0.06 * SR); t = _t(n)
    y = _hp(np.random.default_rng(seed).standard_normal(n), 6500, 4) * np.exp(-t / (0.008 + 0.01 * accent)) * accent
    return _pan(y, 0.25)


def riser(dur, note="D2", seed=6):
    """a cluster of saws gliding up an octave + a rising noise wash; it grows to full and stops dead"""
    n = int(dur * SR); t = _t(n); u = t / dur; f0 = hz(note); rng = np.random.default_rng(seed)
    y = np.zeros((n, 2))
    for k, iv in enumerate((0, 1, 7, 12, 13, 19)):                      # root, minor second, fifth, octave...: tense
        f = f0 * 2 ** (iv / 12) * 2 ** (u ** 1.6)
        y += _pan(_saw(f, n, rng.uniform()), -0.8 + 0.32 * k)
    y = _lp(y, 3200, 2) * 0.5 + _lp(y, 600, 2) * 0.5
    noise = np.random.default_rng(seed + 1).standard_normal((n, 2))
    sweep = np.zeros_like(noise); hop = 4800
    for i in range(0, n, hop):                                          # a band-pass that rises through the build
        fc = 300 * 2 ** (5 * (i / n) ** 1.3); seg = noise[max(0, i - 2400):i + hop]
        sweep[i:i + hop] = signal.sosfilt(signal.butter(2, [fc * 0.7, min(fc * 1.6, 20000)], btype="band", fs=SR, output="sos"), seg, axis=0)[-len(sweep[i:i + hop]):]
    y = y * 0.7 + sweep * 0.9
    return y * (u ** 2.2)[:, None] * np.clip((dur - t) / 0.01, 0, 1)[:, None]


def braam(note, dur, seed=8):
    """a huge low brass hit: detuned saws on the root, fifth and octave, driven, the filter blooms then closes; a sub drop"""
    n = int(dur * SR); t = _t(n); f = hz(note); rng = np.random.default_rng(seed)
    y = np.zeros((n, 2))
    for k, (r, a) in enumerate([(1, 1), (1.5, 0.6), (2, 0.7), (0.5, 0.5)]):
        for j, c in enumerate((-12, 0, 12)):
            y += _pan(_saw(f * r * 2 ** (c / 1200), n, rng.uniform()) * a, (-0.6, 0, 0.6)[j])
    y = np.tanh(1.6 * y / 3) * 1.2
    hi, lo = _lp(y, 2600, 2), _lp(y, 420, 2)
    fe = np.clip(t / 0.05, 0, 1) * np.exp(-np.clip(t - 0.08, 0, None) / 0.5)
    y = hi * fe[:, None] + lo * (1 - fe[:, None])
    y *= (np.clip(t / 0.025, 0, 1) * np.exp(-t / (dur * 0.42)))[:, None]
    sub = np.sin(2 * np.pi * np.cumsum(f * (0.5 + 0.12 * np.exp(-t / 0.4))) / SR) * np.exp(-t / (dur * 0.35)) * np.clip(t / 0.01, 0, 1)
    return y + 0.9 * np.stack([sub, sub], 1)


# ------------------------------------------------------------------------------------------------ the composer
def render(score, dur, when):
    """the whole score as float64 stereo (dur seconds). when(spec) -> seconds (the mixer's time resolver)"""
    n = int(dur * SR); dry, wet = np.zeros((n, 2)), np.zeros((n, 2))
    bpm = float(score.get("bpm", 100)); beat = 60 / bpm

    def put(bus, y, t0, gain):
        a = int(round(t0 * SR))
        if a >= n or a + len(y) <= 0:
            return
        s = max(0, -a); y = y[s:]; a = max(0, a); m = min(len(y), n - a)
        bus[a:a + m] += y[:m] * 10 ** (gain / 20)

    for p in score.get("parts", []):
        inst, g = p["inst"], p.get("gain", -10)
        t0 = when(p.get("from", p.get("at", 0))); t1 = when(p["to"]) if "to" in p else dur
        fin, fout = p.get("fade", [0.5, 0.5])
        if inst == "drone":
            y = drone(p["note"], t1 - t0) * _fade(int((t1 - t0) * SR), fin, fout)[:, None]
            put(dry, y, t0, g); put(wet, y * 0.3, t0, g)
        elif inst == "pad":
            ch = [(when(c[0]) - t0, c[1]) for c in p["chords"]]
            y = pad(ch, t1 - t0, p.get("bright", 0.45)) * _fade(int((t1 - t0) * SR), fin, fout)[:, None]
            put(dry, y * 0.55, t0, g); put(wet, y * 0.75, t0, g)
        elif inst == "bell":
            for i, (tt, note) in enumerate(p["seq"]):
                y = bell(note, seed=3 + i); put(dry, y * 0.45, when(tt), g); put(wet, y, when(tt), g)
        elif inst in ("ostinato", "toms", "ticks"):
            step = beat / (2 if inst == "ostinato" else 4); k = 0; tt = t0
            pat = p.get("pattern", "x.x.x.x.x.x.x.x." if inst == "toms" else "x" * 16)
            notes = p.get("notes", ["D2"])
            while tt < t1 - 1e-6:
                ramp = np.clip((tt - t0) / max(p.get("build", 0.001), 1e-3), 0, 1) if p.get("build") else 1.0
                if inst == "ostinato":
                    y = pluck(notes[k % len(notes)], 1.0 if k % 4 == 0 else 0.55)
                    put(dry, y, tt, g + 20 * np.log10(0.35 + 0.65 * ramp)); put(wet, y * 0.18, tt, g)
                else:
                    ch = pat[k % len(pat)]
                    if ch != ".":
                        acc = 1.0 if ch == "X" or k % len(pat) == 0 else 0.7
                        y = tom(acc, seed=4 + k % 3) if inst == "toms" else tick(acc if k % 4 == 0 else 0.55, seed=5 + k % 5)
                        put(dry, y, tt, g + 20 * np.log10(0.35 + 0.65 * ramp)); put(wet, y * (0.25 if inst == "toms" else 0.1), tt, g)
                k += 1; tt = t0 + k * step
        elif inst == "riser":
            y = riser(t1 - t0, p.get("note", "D2")); put(dry, y * 0.7, t0, g); put(wet, y * 0.5, t0, g)
        elif inst == "braam":
            y = braam(p.get("note", "D1"), p.get("dur", 3.5)); put(dry, y, t0, g); put(wet, y * 0.6, t0, g)
        else:
            raise SystemExit(f"score.json: unknown instrument '{inst}' (drone, pad, bell, ostinato, toms, ticks, riser, braam)")

    out = dry + reverb(wet, score.get("hall", 2.6))
    out = _hp(out, 32, 2)
    out = out / (np.abs(out).max() + 1e-9)                              # the loudest moment = full scale: dynamics kept
    out = np.tanh(out * 1.15) / np.tanh(1.15)                           # a gentle glue on the very top only
    # hard stops (a drop before a reveal): 15 ms out, a fast way back in at the end of the window
    gate = np.ones(n)
    for s in score.get("stops", []):
        a, b = int(when(s["from"]) * SR), int(when(s["to"]) * SR); fo = int(0.015 * SR); fi = int(s.get("fade_in", 0.02) * SR)
        gate[max(0, a - fo):a] *= np.linspace(1, 0, min(fo, a))
        gate[a:b] = 0
        gate[b:b + fi] *= np.linspace(0, 1, len(gate[b:b + fi]))
    return out * gate[:, None]


if __name__ == "__main__":                                              # render the score on its own to listen to
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import mix as MIX                                                    # noqa: E402  (the episode's timing + resolver)
    import soundfile as sf                                               # noqa: E402
    sc = MIX.read_json(MIX.E.dir / "score.json", None)
    if not sc:
        raise SystemExit("no score.json in this episode (see the top of score.py)")
    y = render(sc, MIX.DUR, MIX.when)
    MIX.E.out.mkdir(exist_ok=True)
    sf.write(MIX.E.out / "score.wav", (y * 0.7).astype(np.float32), SR, subtype="PCM_24")
    print(f"wrote {MIX.E.out / 'score.wav'} ({MIX.DUR:.1f} s)")
