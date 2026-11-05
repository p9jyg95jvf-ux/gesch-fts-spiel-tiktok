"""Arc Lab pipeline: ASSEMBLE. Joins the segment plates in order, lays the overlay PNGs on top (blended in RGB, so caption
edges stay clean), adds out/mix.wav, and makes ONE encode to the upload file.

    python assemble.py --ep ep01 --draft      -> out/<name>_draft.mp4 (540x960, from out/draft/plate_<X>_half.mp4;
                                                 a segment with no draft plate falls back to its full plate, scaled)
    python assemble.py --ep ep01 --final      -> out/<name>_final.mp4 (1080x1920 upload file, from out/plate_<X>.mkv)
                                                 + out/<name>_phone.mp4 (720x1280, small, for sending to your phone)
    options: --name NAME   --no-overlay   --audio file   --crf 17   --check-only file

Upload settings: H.264 High, preset slow, crf 17, yuv420p, 30 fps, BT.709 matrix + tags, TV range, +faststart,
AAC 48 kHz 192 kbps. Checks after the encode: frame count, colour tags, and loudness against the mix (within 0.5 LU).
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Episode, ffmpeg, probe, loudness  # noqa: E402

TO709 = "scale=out_color_matrix=bt709:out_range=tv:flags=bicubic,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709"
TAGS = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
X264_FINAL = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-x264-params", "aq-mode=3"]
X264_DRAFT = ["-c:v", "libx264", "-preset", "veryfast", "-profile:v", "high", "-crf", "20"]
X264_PHONE = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-crf", "20", "-maxrate", "2800k", "-bufsize", "5600k"]


def plate_for(E, seg, draft):
    """(path, decode filter) for a segment's plate"""
    cands = ([E.out / "draft" / f"plate_{seg}_half.mp4"] if draft else []) + [E.out / f"plate_{seg}.mkv", E.out / f"plate_{seg}.mp4"]
    for p in cands:
        if p.exists():
            info = probe(p)
            dec = "format=gbrp" if info["pix_fmt"] in ("rgb24", "gbrp", "bgr0") else "scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=gbrp"
            return p, info, dec
    raise SystemExit(f"no plate for segment {seg}: render it first (arclab draft / renderSeg.mjs --seg {seg})")


def build(E, args):
    segs = E.segments()
    if not segs:
        raise SystemExit("episode.json has no segments")
    n = E.frames
    w, h = (540, 960) if args.draft else (1080, 1920)
    inputs, chains, k = [], [], 0
    for seg, (a, b, _) in sorted(segs.items(), key=lambda kv: kv[1][0]):
        p, info, dec = plate_for(E, seg, args.draft)
        want = b - a + 1
        if info["frames"] < want:
            raise SystemExit(f"plate {p.name} has {info['frames']} frames, segment {seg} needs {want} ({a}-{b})")
        inputs += ["-i", str(p)]
        chains.append(f"[{k}:v]{dec},trim=end_frame={want},setpts=PTS-STARTPTS,scale={w}:{h}:flags=area,setsar=1[p{k}]")
        k += 1
    graph = ";".join(chains) + ";" + "".join(f"[p{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=0,setpts=N/{E.fps}/TB[base];"
    if args.no_overlay:
        graph += "[base]null[comp];"
    else:
        missing = [f for f in range(n) if not (E.overlay / f"{f:05d}.png").exists()]
        if missing:
            raise SystemExit(f"overlay PNGs missing for {len(missing)} frames (first {missing[:5]}): run the overlay first, or --no-overlay")
        inputs += ["-framerate", str(E.fps), "-start_number", "0", "-i", str(E.overlay / "%05d.png")]
        graph += f"[{k}:v]format=rgba,scale={w}:{h}:flags=area[ov];[base][ov]overlay=format=gbrp:eof_action=pass[comp];"
        k += 1
    audio = Path(args.audio) if args.audio else E.out / "mix.wav"
    if not audio.exists():
        if args.draft and (E.dir / "vo.wav").exists():
            print(f"note: {audio.name} doesn't exist yet, so this draft uses the bare voice (vo.wav)")
            audio = E.dir / "vo.wav"
        else:
            raise SystemExit(f"sound missing: {audio} (run the mix first)")
    inputs += ["-i", str(audio)]
    graph += f"[comp]{TO709}[v]"
    return inputs, graph, k, n, (w, h), audio


def encode(E, args):
    inputs, graph, a_idx, n, size, audio = build(E, args)
    name = args.name or f"{E.series.name}_{E.dir.name}".replace(" ", "_")
    kind = "draft" if args.draft else "final"
    out = E.out / f"{name}_{kind}.mp4"
    venc = X264_DRAFT if args.draft else X264_FINAL + ["-crf", str(args.crf)]
    t0 = time.time()
    ffmpeg(*inputs, "-filter_complex", graph, "-map", "[v]", "-map", f"{a_idx}:a", "-frames:v", n, "-r", E.fps, *venc, *TAGS,
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", f"{n / E.fps:.6f}", "-movflags", "+faststart", out)
    print(f"{kind}: {out.name} in {time.time() - t0:.0f} s")
    rep = {"name": name, "kind": kind, "file": str(out), "audio": str(audio), "checks": checks(E, out, n, size, audio)}
    if kind == "final":
        phone = E.out / f"{name}_phone.mp4"
        ffmpeg("-i", out, "-vf", "scale=720:1280:flags=lanczos,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709",
               *X264_PHONE, "-pix_fmt", "yuv420p", *TAGS, "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", phone)
        rep["phone"] = str(phone)
        print(f"phone copy: {phone.name} ({phone.stat().st_size / 1e6:.1f} MB)")
    (E.out / f"{name}_{kind}_assemble.json").write_text(json.dumps(rep, indent=1), encoding="utf-8")
    return rep


def checks(E, f, n, size, audio):
    i = probe(f)
    res = {"frames": {"got": i["frames"], "want": n, "ok": i["frames"] == n},
           "tags": {"got": f"{i['color_space']}/{i['color_primaries']}/{i['color_transfer']}/{i['color_range']} {i['pix_fmt']} {i['width']}x{i['height']}",
                    "ok": (i["color_space"], i["color_range"], i["pix_fmt"], i["width"], i["height"]) == ("bt709", "tv", "yuv420p", size[0], size[1])}}
    a, b = loudness(audio), loudness(f)
    d = None if a["lufs"] is None or b["lufs"] is None else round(b["lufs"] - a["lufs"], 2)
    res["loudness"] = {"mix_lufs": a["lufs"], "file_lufs": b["lufs"], "file_true_peak": b["true_peak"], "delta": d, "ok": d is not None and abs(d) <= 0.5}
    res["ok"] = all(v["ok"] for v in res.values())
    print("checks:", "PASS" if res["ok"] else "FAIL", json.dumps({k: v for k, v in res.items() if k != "ok"}))
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ep"); ap.add_argument("--name"); ap.add_argument("--draft", action="store_true"); ap.add_argument("--final", action="store_true")
    ap.add_argument("--no-overlay", action="store_true"); ap.add_argument("--audio"); ap.add_argument("--crf", type=float, default=17)
    args = ap.parse_args()
    if not (args.draft or args.final):
        raise SystemExit("say --draft or --final")
    E = Episode(args.ep)
    rep = encode(E, args)
    sys.exit(0 if rep["checks"]["ok"] else 2)


if __name__ == "__main__":
    main()
