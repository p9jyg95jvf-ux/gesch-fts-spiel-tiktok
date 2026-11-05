"""Arc Lab pipeline: EVERY-FRAME SHEETS. Every frame of a video, numbered, 12 x 8 = 96 per sheet (180 x 320 each), plus a
per-frame table (mean luma, near-black share, change from the previous frame), so a reviewer (you, or Claude reading
the sheets) can look at all of them. Dark frames are labelled DARK, big jumps dNN.

    python allframes.py --ep ep01 out/pip_ep01_draft.mp4        -> out/qa/<file>/all_0000.jpg ...
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Episode  # noqa: E402


def main(argv):
    ep = argv[argv.index("--ep") + 1] if "--ep" in argv else None
    rest = [a for i, a in enumerate(argv) if a != "--ep" and (i == 0 or argv[i - 1] != "--ep")]
    E = Episode(ep)
    src = Path(rest[0]) if Path(rest[0]).is_absolute() else E.dir / rest[0]
    outd = Path(rest[1]) if len(rest) > 1 else E.out / "qa" / src.stem
    outd.mkdir(parents=True, exist_ok=True)
    w, h, cols, rows = 180, 320, 12, 8
    per = cols * rows
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(src), "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    prev, rows_m, sheet, n = None, [], None, 0
    while True:
        buf = p.stdout.read(w * h * 3)
        if len(buf) < w * h * 3:
            break
        im = np.frombuffer(buf, np.uint8).reshape(h, w, 3); L = im.mean(axis=2)
        d = float(np.abs(L - prev).mean()) if prev is not None else 0.0
        rows_m.append({"f": n, "luma": round(float(L.mean()), 1), "dark": round(float((L < 20).mean()), 3), "diff": round(d, 2)})
        prev = L
        k = n % per
        if k == 0:
            if sheet is not None:
                sheet.save(outd / f"all_{n - per:04d}.jpg", quality=82)
            sheet = Image.new("RGB", (cols * w, rows * (h + 16)), (18, 18, 18))
        x0, y0 = (k % cols) * w, (k // cols) * (h + 16)
        sheet.paste(Image.fromarray(im), (x0, y0 + 16))
        flag = L.mean() < 40 or (L < 20).mean() > 0.3
        ImageDraw.Draw(sheet).text((x0 + 3, y0 + 2), f"{n}" + ("  DARK" if flag else "") + (f"  d{d:.0f}" if d > 12 else ""), fill=(255, 90, 90) if flag or d > 12 else (255, 230, 80))
        n += 1
    if sheet is not None:
        sheet.save(outd / f"all_{(n - 1) // per * per:04d}.jpg", quality=82)
    (outd / "metrics.json").write_text(json.dumps(rows_m), encoding="utf-8")
    print(f"{n} frames -> {(n + per - 1) // per} sheets in {outd}: LOOK AT EVERY SHEET")


if __name__ == "__main__":
    main(sys.argv[1:])
