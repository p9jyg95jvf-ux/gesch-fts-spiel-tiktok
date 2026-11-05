"""Arc Lab pipeline: the SPEECH-TO-TEXT WORD CHECK. Transcribes the voice track (or a finished video) with ElevenLabs
speech-to-text and diffs the words against the script. Repeated words ("the, the"), broken words and extra syllables
show up as insertions; a skipped word shows as a deletion. Fix a bad line with `voice.py --line N --seed 7`.

    python stt_check.py --ep ep01                 checks ep01/vo.wav against timeline.json
    python stt_check.py --ep ep01 --file out/ep01_final.mp4
"""
import difflib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Episode, env_key, ep_arg  # noqa: E402
import eleven  # noqa: E402

NUMS = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"}


def norm(s):
    s = s.lower().replace("’", "'").replace("‘", "'").replace("-", " ")
    s = re.sub(r"\b(\d+)\b", lambda m: NUMS.get(m.group(1), m.group(1)), s)
    return re.findall(r"[a-z0-9']+", s)


def main(argv):
    E = Episode(ep_arg(argv))
    src = E.dir / (argv[argv.index("--file") + 1] if "--file" in argv else "vo.wav")
    want = norm(" ".join(l["text"] for l in E.timeline["lines"]))
    j = eleven.stt(env_key(E.series), src)
    words = [w for w in j.get("words", []) if w.get("type") == "word"]
    got = norm(" ".join(w["text"] for w in words))
    sm = difflib.SequenceMatcher(a=want, b=got, autojunk=False)
    issues = []
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == "equal":
            continue
        t = words[b0]["start"] if b0 < len(words) else (words[-1]["end"] if words else 0)
        issues.append(f"{t:6.2f}s  {op:7s} script: {' '.join(want[a0:a1])!r:40s} heard: {' '.join(got[b0:b1])!r}")
    print(f"{src.name}: {len(got)} words heard, {len(want)} in the script, match {sm.ratio():.3f}")
    print("\n".join(issues) if issues else "no differences: the voice says exactly the script")
    (E.dir / "out").mkdir(exist_ok=True)
    (E.dir / "out" / "stt_check.txt").write_text(f"match {sm.ratio():.3f}\n" + "\n".join(issues), encoding="utf-8")
    sys.exit(0 if sm.ratio() >= 0.97 else 2)


if __name__ == "__main__":
    main(sys.argv[1:])
