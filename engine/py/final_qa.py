"""Arc Lab pipeline: FINAL QA. The last automatic check on a finished file (draft or final), before a human watches it.

    python final_qa.py --ep ep01 out/pip_ep01_draft.mp4 [key frames to save at full size ...]

1. The file: codec, size, frame count (must match the timeline), an audio stream, loudness (integrated -14 LUFS +- 1,
   true peak at or under -1 dBTP).
2. Every frame decoded small: frames too dark (mean luma < 40 or > 30% near-black), single-frame pops that are not on a
   cut (out/cuts.json), and frozen stretches over 1 s (a dead picture).
3. The safe frame (safezone.py, docs/SAFE_ZONE.md): every overlay frame inside it, captions in their band, every face
   inside it, and the contact sheet safezone.png with the app's buttons drawn on.
4. Overview sheets (every 6th frame, dark frames marked red) and the listed key frames, for a look by eye.
Writes out/qa/<file>/report.json. Exit code 0 = PASS (frames, loudness, no dark frames, safe frame), 2 = FAIL.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Episode, probe, loudness, read_json  # noqa: E402
import safezone  # noqa: E402


def main(argv):
    ep = argv[argv.index("--ep") + 1] if "--ep" in argv else None
    rest = [a for i, a in enumerate(argv) if a != "--ep" and (i == 0 or argv[i - 1] != "--ep")]
    E = Episode(ep)
    src = Path(rest[0]) if Path(rest[0]).is_absolute() else E.dir / rest[0]
    keys = [int(a) for a in rest[1:]]
    outd = E.out / "qa" / src.stem; outd.mkdir(parents=True, exist_ok=True)
    want = E.frames
    i = probe(src)
    lo = loudness(src)
    print(f"file {src.name}: {i['size'] / 1e6:.1f} MB, {i['duration']:.2f} s, {i['codec']} {i['profile']} {i['width']}x{i['height']} "
          f"{i['pix_fmt']} {i['color_space']}/{i['color_range']} {i['fps']:.2f} fps; audio {'yes' if i['audio'] else 'NONE'}")
    print(f"loudness: integrated {lo['lufs']} LUFS, true peak {lo['true_peak']} dBFS")
    w, h = 135, 240
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3); n = len(fr)
    L = fr.mean(axis=3); mean, dark = L.mean(axis=(1, 2)), (L < 20).mean(axis=(1, 2))
    dim = [k for k in range(n) if mean[k] < 40 or dark[k] > 0.3]
    cuts = set(read_json(E.out / "cuts.json", {}).get("cuts", []))
    diff = np.abs(np.diff(L, axis=0)).mean(axis=(1, 2))
    pops = [k for k in range(1, n - 1) if diff[k - 1] > 12 and diff[k] > 12 and np.abs(L[k + 1] - L[k - 1]).mean() < 4 and k not in cuts and k + 1 not in cuts]
    still, run = [], 0
    for k, d in enumerate(diff):
        run = run + 1 if d < 0.1 else 0
        if run == 31:
            still.append(k - 29)
    print(f"frames {n} (want {want}) -> {'OK' if n == want else 'MISMATCH'}")
    print(f"mean luma {mean.mean():.1f} (darkest {mean.min():.1f} at frame {int(mean.argmin())}); dark frames: {len(dim)} {dim[:30]}")
    print(f"single-frame pops: {len(pops)} {pops[:30]}")
    print(f"frozen stretches over 1 s (start frames): {still}")
    cols, every, per = 12, 6, 12 * 9
    idx = list(range(0, n, every))
    for s in range(0, len(idx), per):
        part = idx[s:s + per]; rows = (len(part) + cols - 1) // cols
        sh = Image.new("RGB", (cols * w, rows * (h + 14)), (20, 20, 20)); d = ImageDraw.Draw(sh)
        for k, f in enumerate(part):
            x0, y0 = (k % cols) * w, (k // cols) * (h + 14)
            sh.paste(Image.fromarray(fr[f]), (x0, y0 + 14)); d.text((x0 + 3, y0 + 1), str(f), fill=(255, 80, 80) if f in dim else (255, 255, 0))
        sh.save(outd / f"over_{part[0]:04d}.jpg", quality=82)
    for k in keys:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", f"select=eq(n\\,{k})", "-vframes", "1", "-q:v", "2", str(outd / f"key_{k:04d}.jpg")])
    safe = safezone.check(E, src, outd)
    ok_frames, ok_loud = n == want, lo["lufs"] is not None and abs(lo["lufs"] + 14) <= 1.0 and (lo["true_peak"] or 0) <= -0.9
    rep = {"file": str(src), "frames": {"got": n, "want": want, "ok": ok_frames},
           "loudness": {"lufs": lo["lufs"], "true_peak": lo["true_peak"], "ok": ok_loud},
           "dark": {"frames": dim, "mean_luma": round(float(mean.mean()), 1), "ok": not dim},
           "pops": pops, "frozen": still, "audio": bool(i["audio"]), "safe_zone": safe}
    rep["pass"] = ok_frames and ok_loud and not dim and rep["audio"] and safe["ok"]
    (outd / "report.json").write_text(json.dumps(rep, indent=1), encoding="utf-8")
    print(f"FINAL QA: {'PASS' if rep['pass'] else 'FAIL'} (frames {ok_frames}, loudness {ok_loud}, no dark frames {not dim}, safe frame {safe['ok']}); sheets in {outd}")
    if pops or still:
        print("  look at the pops / frozen stretches by eye: a planned flash or a held end card is fine, a glitch is not")
    sys.exit(0 if rep["pass"] else 2)


if __name__ == "__main__":
    main(sys.argv[1:])
