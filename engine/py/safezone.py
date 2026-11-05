"""Arc Lab pipeline: the SAFE-FRAME check (docs/SAFE_ZONE.md). final_qa runs it on every draft and final.

    python safezone.py --ep ep01 [out/day23_ep01_final.mp4]

1. Overlay: no overlay frame (overlay/*.png) may have solid pixels (alpha >= 140; soft shadows are fine) above y 270,
   below y 1480, in the outer 120 px, or right of x 860 from y 900 down. FAIL if any.
2. Captions (overlay/captions.json): every line inside the band x 220-860, y 1180-1440, at most 2 rows. A line moved up
   to clear a face or a clue is listed (look at it); one outside the safe frame is a FAIL.
3. Key visuals (out/layout_*.json, written by full segment renders): every face's centre inside the safe frame, and
   left of x 860 from y 900 down (FAIL if not); a clue whose centre is outside it is listed for a look.
4. The sheet: engine/safezone/check.py's contact sheet of the file -> out/qa/<file>/safezone.png. Open it and look.
Exit 0 = PASS, 2 = FAIL.
"""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "safezone"))
from common import Episode, read_json  # noqa: E402
from check import SAFE, RAIL_X, RAIL_Y, CAP  # noqa: E402

X0, Y0, X1, Y1 = SAFE
SOLID, SPECK = 140, 20              # alpha that counts as drawn; pixels a frame may have outside before it counts


def runs(frames):
    """[3, 4, 5, 9] -> '3-5, 9'"""
    out, a = [], None
    for k, f in enumerate(frames):
        if a is None:
            a = f
        if k + 1 == len(frames) or frames[k + 1] != f + 1:
            out.append(f"{a}-{f}" if f > a else str(a)); a = None
    return ", ".join(out)


def outside(x, y):
    return x < X0 or x > X1 or y < Y0 or y > Y1 or (y > RAIL_Y and x > RAIL_X)


def overlay_frame(p):
    a = np.asarray(Image.open(p).convert("RGBA"))[:, :, 3] >= SOLID
    zones = {"top": a[:Y0], "bottom": a[Y1:], "left": a[Y0:Y1, :X0], "right": a[Y0:Y1, X1:], "rail": a[RAIL_Y:Y1, RAIL_X:X1]}
    return [k for k, z in zones.items() if z.sum() > SPECK]


def check(E, video=None, outd=None):
    rep, ok = {}, True
    # 1. the overlay, every frame
    pngs = sorted(E.overlay.glob("[0-9]*.png"))
    if pngs:
        with ThreadPoolExecutor(8) as ex:
            hits = list(ex.map(overlay_frame, pngs))
        bad = {}
        for p, h in zip(pngs, hits):
            for k in h:
                bad.setdefault(k, []).append(int(p.stem))
        rep["overlay"] = {"frames": len(pngs), "outside": {k: runs(v) for k, v in bad.items()}, "ok": not bad}
        ok &= not bad
        print(f"safe frame, overlay: {len(pngs)} frames, " + ("all inside" if not bad else "OUTSIDE: " + "; ".join(f"{k} at frames {runs(v)}" for k, v in bad.items())))
    else:
        rep["overlay"] = {"frames": 0, "ok": True}
        print("safe frame, overlay: no overlay frames to check")
    # 2. captions
    caps = read_json(E.overlay / "captions.json", {}).get("lines", [])
    moved = [c for c in caps if c.get("moved")]
    wrong = [c for c in caps if c["box"][0] < CAP[0] or c["box"][2] > CAP[2] or c["box"][3] > CAP[3] or c["box"][1] < Y0 or c["rows"] > 2
             or (not c.get("moved") and c["box"][1] < CAP[1])]
    rep["captions"] = {"lines": len(caps), "moved_up": [{"line": c["line"], "frames": c["f"], "top": c["box"][1]} for c in moved],
                       "wrong": [c["line"] for c in wrong], "ok": not wrong}
    ok &= not wrong
    print(f"safe frame, captions: {len(caps) - len(moved)} of {len(caps)} lines in the band y {CAP[1]}-{CAP[3]}"
          + (f"; moved up (inside the safe frame) to clear a face/clue: lines {[c['line'] for c in moved]} (look at them)" if moved else "")
          + (f"; OUTSIDE the band: lines {[c['line'] for c in wrong]}" if wrong else ""))
    # 3. faces and clues from the shots
    faces, clues, seen = {}, {}, 0
    for fn in sorted(E.out.glob("layout_*.json")):
        for f, L in read_json(fn, {}).get("frames", {}).items():
            seen += 1
            for x, y, r in L.get("faces", []):
                if outside(x, y):
                    faces.setdefault(int(f), (round(x), round(y)))
            for x, y, w, h in L.get("clues", []):
                if outside(x + w / 2, y + h / 2):
                    clues.setdefault(int(f), (round(x), round(y), round(w), round(h)))
    rep["faces"] = {"frames_checked": seen, "outside": runs(sorted(faces)), "ok": not faces}
    rep["clues"] = {"outside": runs(sorted(clues))}
    ok &= not faces
    if seen:
        print(f"safe frame, faces: {seen} frames, " + ("every face inside" if not faces else f"FACE OUTSIDE at frames {runs(sorted(faces))} (first at {next(iter(faces.values()))})")
              + (f"; clue centre outside at frames {runs(sorted(clues))} (look: is it something to read?)" if clues else ""))
    else:
        print("safe frame, faces: no out/layout_*.json yet (written by full segment renders); check the sheet by eye")
    # 4. the sheet
    if video and outd:
        sheet = Path(outd) / "safezone.png"
        r = subprocess.run([sys.executable, str(Path(__file__).resolve().parents[1] / "safezone" / "check.py"), str(video), "--out", str(sheet)], capture_output=True, text=True)
        rep["sheet"] = str(sheet) if r.returncode == 0 else None
        print(f"safe frame, sheet: {sheet if r.returncode == 0 else 'FAILED ' + r.stderr[-300:]} (open it and look: nothing to read in red or under a white button)")
    rep["ok"] = bool(ok)
    return rep


def main(argv):
    ep = argv[argv.index("--ep") + 1] if "--ep" in argv else None
    rest = [a for i, a in enumerate(argv) if a != "--ep" and (i == 0 or argv[i - 1] != "--ep")]
    E = Episode(ep)
    video = (Path(rest[0]) if Path(rest[0]).is_absolute() else E.dir / rest[0]) if rest else None
    outd = E.out / "qa" / (video.stem if video else "safezone")
    outd.mkdir(parents=True, exist_ok=True)
    rep = check(E, video, outd)
    (outd / "safezone.json").write_text(json.dumps(rep, indent=1), encoding="utf-8")
    print(f"SAFE FRAME: {'PASS' if rep['ok'] else 'FAIL'}")
    sys.exit(0 if rep["ok"] else 2)


if __name__ == "__main__":
    main(sys.argv[1:])
