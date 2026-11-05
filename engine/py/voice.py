"""Arc Lab pipeline: THE VOICE STEP. story.json -> one ElevenLabs take per line -> vo.wav + timeline.json.

Rules learned the hard way (keep them):
- ONE TAKE PER LINE, never cut out of the middle of a take (inner cuts make stutters). Each take gets its same-speaker
  neighbours as unbilled context (previous_text / next_text) so the delivery flows, and is trimmed only at its own edges.
- Lines follow each other with the story's line_gap (or a line's gap_after); each beat starts after its "gap".
- A stat line ({"stat": true}, the "last episode's vote" line) fills a FIXED slot, so when the real numbers arrive only that
  take changes and nothing after it moves.
- Once the picture is being built, LOCK the timing (--lock): every later run places each line's first character exactly
  on its locked start, so a re-record never moves the picture. Lines that run long are tempo-fitted (at most x1.12).
- Then run the speech-to-text check (stt_check.py): it catches repeated or broken words the ear misses.

    python voice.py --ep ep01 --bill      characters that would be billed (cache misses only); spends nothing
    python voice.py --ep ep01             -> vo.wav (48 kHz mono) + timeline.json (lines, word onsets, caption chunks)
    python voice.py --ep ep01 --lock      freeze timeline.json as timeline_lock.json
    python voice.py --ep ep01 --table     the line table (frames) for BRIEF.md
    python voice.py --voices              the voices your key can use (to cast the series in series/VOICES.json)
    python voice.py --ep ep01 --line 4 --seed 7    re-take one line with a new seed (to lose a stutter)
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Episode, env_key, find_series, read_json, write_json, ep_arg  # noqa: E402
import eleven  # noqa: E402

SR, MAX_FIT = 48000, 1.12
MARKS = re.compile(r"[*!]")


def decode(mp3, tempo):
    af = f"atempo={tempo:.5f}" if abs(tempo - 1) > 1e-6 else "anull"
    with tempfile.TemporaryDirectory() as td:
        w = Path(td) / "a.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-af", af, "-ac", "1", "-ar", str(SR), "-c:a", "pcm_f32le", str(w)], check=True)
        a, _ = sf.read(str(w), dtype="float32")
    return a


def fill(text, stats):
    """{TOTAL}, {P1}.. {WINNER} placeholders from stats.json (the last episode's vote)"""
    if not stats:
        return text
    rep = {"TOTAL": f"{int(stats.get('total', 0)):,}", "WINNER": stats.get("winner", "")}
    for i, p in enumerate(stats.get("p", []), 1):
        rep[f"P{i}"] = f"{p}%"
    return re.sub(r"\{(\w+)\}", lambda m: str(rep.get(m.group(1), m.group(0))), text)


def chunks_for(cap, ls, le, ws):
    """caption chunks ('a|*b*|c'): each chunk starts on the spoken word nearest its share of the line"""
    if not cap:
        return []
    parts = cap.split("|")
    wts = [max(1, len(MARKS.sub("", p))) for p in parts]
    acc, tot, out = 0, sum(wts), []
    for i, p in enumerate(parts):
        est = ls + (le - ls) * acc / tot
        on = ls if i == 0 or not ws else min(ws, key=lambda w: abs(w - est))
        out.append({"text": p, "start": round(on, 3)})
        acc += wts[i]
    for i in range(len(out)):
        out[i]["end"] = round(out[i + 1]["start"] if i + 1 < len(out) else le, 3)
    return out


def jobs(story, stats):
    flat = []
    for bi, b in enumerate(story["beats"]):
        for ln in b["lines"]:
            flat.append((bi, b, ln, fill(ln["text"], stats) if ln.get("stat") else ln["text"]))
    out = []
    for i, (bi, b, ln, text) in enumerate(flat):
        sp = ln.get("speaker", "narr")
        same = lambda k: 0 <= k < len(flat) and flat[k][2].get("speaker", "narr") == sp and not flat[k][2].get("stat")  # noqa: E731
        prev = flat[i - 1][3] if not ln.get("stat") and same(i - 1) else None
        nxt = flat[i + 1][3] if not ln.get("stat") and same(i + 1) else None
        out.append((i, bi, b, ln, text, prev, nxt))
    return out


def voice_cfg(series):
    v = read_json(series / "series" / "VOICES.json")
    return v.get("model", "eleven_multilingual_v2"), v["cast"]


def take_kw(model, c, text, prev, nxt, seed=None):
    return dict(text=text, model=model, speed=c.get("speed", 1.0), stability=c.get("stability", 0.45), similarity=c.get("similarity", 0.8),
                style=c.get("style", 0.2), prev=prev, nxt=nxt, seed=seed)


def main(argv):
    if "--voices" in argv:
        series = find_series(ep_arg(argv) or ".")
        for v in eleven.voices(env_key(series)):
            lab = ", ".join(f"{k}: {v2}" for k, v2 in v["labels"].items())
            print(f"{v['voice_id']}  {v['name']:<28} {v['category'] or '':<12} {lab}")
        return
    E = Episode(ep_arg(argv))
    lock_f, tl_f = E.dir / "timeline_lock.json", E.dir / "timeline.json"
    if "--lock" in argv:
        shutil.copy(tl_f, lock_f)
        print(f"locked {tl_f.name} as {lock_f.name}: the picture can be built on it now")
        return
    if "--table" in argv:
        tl = E.timeline
        print("| Line | Who | Frames | Text |\n|---|---|---|---|")
        for l in tl["lines"]:
            card = f" (card: {l['card']})" if l.get("card") else ""
            print(f"| L{l['i']:02d} | {l['speaker']} | {round(l['start'] * E.fps)}-{round(l['end'] * E.fps)} | {l['text']}{card} |")
        print(f"\n{tl['frames']} frames, {tl['duration']} s")
        return
    story = read_json(E.dir / "story.json")
    stats = read_json(E.dir / "stats.json", {})
    model, cast = voice_cfg(E.series)
    cache = E.cache / "eleven"
    seeds = story.get("seeds", {})
    if "--line" in argv:
        seeds[argv[argv.index("--line") + 1]] = int(argv[argv.index("--seed") + 1]) if "--seed" in argv else 1
        story["seeds"] = seeds
        write_json(E.dir / "story.json", story)
        print(f"line {argv[argv.index('--line') + 1]} will be re-taken with seed {seeds[argv[argv.index('--line') + 1]]}")
    J = jobs(story, stats)
    for i, bi, b, ln, text, prev, nxt in J:
        if ln.get("speaker", "narr") not in cast:
            raise SystemExit(f"line {i}: speaker '{ln.get('speaker')}' is not cast in series/VOICES.json")
    key = lambda: env_key(E.series)  # noqa: E731
    if "--bill" in argv:
        bill = 0
        for i, bi, b, ln, text, prev, nxt in J:
            c = cast[ln.get("speaker", "narr")]
            hit = eleven.cached(cache, c["voice"], **take_kw(model, c, text, prev, nxt, seeds.get(str(i))))
            bill += 0 if hit else len(text)
            print(f"line {i:02d} {ln.get('speaker', 'narr'):6s} {'cached' if hit else 'NEW   '} {len(text):3d}  {text}")
        print(f"characters to bill: {bill}")
        return
    lock = read_json(lock_f) if lock_f.exists() else None
    if lock and len(lock["lines"]) != len(J):
        raise SystemExit(f"{len(J)} lines vs {len(lock['lines'])} in the lock: delete timeline_lock.json only if the picture will be rebuilt")
    lead, gap0, tail = story.get("lead", 0.05), story.get("line_gap", 0.28), story.get("tail", 3.0)
    segs, recs, pos, last_beat = [], [], lead, -1
    for i, bi, b, ln, text, prev, nxt in J:
        sp = ln.get("speaker", "narr")
        c = cast[sp]
        mp3, al = eleven.tts_ts(cache, key, c["voice"], **take_kw(model, c, text, prev, nxt, seeds.get(str(i))))
        tempo = c.get("tempo", 1.0)
        chars = al["characters"]
        first = next(k for k, ch in enumerate(chars) if ch != " ")
        last = max(k for k, ch in enumerate(chars) if ch != " ")
        need = (al["character_end_times_seconds"][last] - al["character_start_times_seconds"][first]) / tempo
        slot = ln.get("slot") if ln.get("stat") else None
        if bi != last_beat:
            pos += b.get("gap", 0.3) if recs else 0
            last_beat = bi
        start = lock["lines"][i]["start"] if lock else pos
        if lock:
            nxt_start = lock["lines"][i + 1]["start"] if i + 1 < len(lock["lines"]) else lock["duration"] - tail
            room = nxt_start - start - 0.12
            if need > room:
                k = min(MAX_FIT, need / room)
                print(f"line {i:02d}: tempo-fit x{k:.3f} to keep the lock ({need:.2f} s into {room:.2f} s)")
                tempo *= k
        if slot and need > slot - 0.25:
            k = min(MAX_FIT, need / (slot - 0.3))
            print(f"line {i:02d}: stat take tempo-fit x{k:.3f} into its {slot} s slot")
            tempo *= k
        a = decode(mp3, tempo)
        cs = [v / tempo for v in al["character_start_times_seconds"]]
        ce = [v / tempo for v in al["character_end_times_seconds"]]
        t0, t1 = max(0.0, cs[first] - 0.12), min(len(a) / SR, ce[last] + 0.30)
        seg = a[int(t0 * SR):int(t1 * SR)].copy()
        fi, fo = int(0.020 * SR), min(int(0.060 * SR), len(seg) // 3)
        seg[:fi] *= np.linspace(0, 1, fi)
        if fo:
            seg[-fo:] *= np.linspace(1, 0, fo)
        off = start - cs[first]
        ls_, le_ = start, ce[last] + off
        ws = [cs[q] + off for q in range(first, last + 1) if (q == first or chars[q - 1] == " ") and chars[q] != " "]
        segs.append((t0 + off, seg))
        rec = {"i": i, "beat": bi, "speaker": sp, "text": text, "start": round(ls_, 3), "end": round(le_, 3),
               "words": [round(v, 3) for v in ws], "chunks": chunks_for(ln.get("captions", ""), ls_, le_, ws)}
        if b.get("card") and (not recs or recs[-1]["beat"] != bi):
            rec["card"] = b["card"]
        for k in ("stat", "vote", "cmt"):
            if ln.get(k):
                rec[k] = True
        if ln.get("stat"):
            rec.update({"template": ln["text"], "slot": slot})
        recs.append(rec)
        pos = (start + slot) if slot else (le_ + ln.get("gap_after", gap0))
        print(f"{i:02d} {sp:6s} {ls_:6.2f}-{le_:6.2f}  {text}")
    dur = lock["duration"] if lock else round(recs[-1]["end"] + tail, 3)
    frames = int(round(dur * E.fps))
    N = frames * (SR // E.fps)
    track = np.zeros(N, np.float32)
    for at, seg in segs:
        a0 = int(round(at * SR))
        if a0 < 0:
            seg, a0 = seg[-a0:], 0
        track[a0:a0 + len(seg)] += seg[:max(0, N - a0)]
    sf.write(E.dir / "vo.wav", track, SR)
    tl = {"voices": {k: {kk: v[kk] for kk in ("name", "speed", "stability", "tempo") if kk in v} for k, v in cast.items()}, "model": model,
          "sr": SR, "duration": round(N / SR, 3), "frames": frames, "fps": E.fps, "stats": stats, "lines": recs}
    write_json(tl_f, tl)
    print(f"{len(recs)} lines, {N / SR:.2f} s = {frames} frames{' (locked)' if lock else ''} -> vo.wav, timeline.json")


if __name__ == "__main__":
    main(sys.argv[1:])
