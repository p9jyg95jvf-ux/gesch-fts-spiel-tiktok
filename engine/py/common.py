"""Arc Lab pipeline: shared helpers for every Python tool (paths, the API key, ffmpeg/ffprobe, loudness).

A SERIES folder holds arclab.json (made by `arclab new-series`); each EPISODE is a sub-folder (ep01, ep02 ...) holding
episode.json, story.json and, once built, timeline.json, vo.wav, out/ and overlay/. Every tool takes --ep <episode dir>
(default: the current folder) and finds the series root by walking up to arclab.json.

Keys: the BUYER's own ElevenLabs key, read from the environment (ELEVENLABS_API_KEY) or the series' .env file. It is
never printed, logged, copied or written anywhere else.
"""
import json
import os
import re
import subprocess
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent
FPS, W, H = 30, 1080, 1920


class Episode:
    """Paths and config for one episode folder."""

    def __init__(self, ep=None):
        self.dir = Path(ep or os.getcwd()).resolve()
        if (self.dir / "episode.json").exists() is False and (self.dir / "arclab.json").exists():
            raise SystemExit(f"{self.dir} is the SERIES folder; pass --ep <series>/ep01 (an episode folder)")
        self.series = find_series(self.dir)
        self.cfg = read_json(self.dir / "episode.json", {})
        self.fps = int(self.cfg.get("fps", FPS))
        self.out = self.dir / "out"
        self.overlay = self.dir / "overlay"
        self.cache = self.series / ".cache"

    @property
    def timeline(self):
        for n in ("timeline.json", "timeline_lock.json"):    # timeline.json = the latest takes, on the lock's line starts
            if (self.dir / n).exists():
                return read_json(self.dir / n)
        raise SystemExit(f"no timeline.json in {self.dir}: run `arclab voice` first")

    @property
    def frames(self):
        return int(self.timeline["frames"])

    def segments(self):
        """{'A': (a, b, shots_module_path), ...} from episode.json"""
        segs = {}
        for k, v in (self.cfg.get("segments") or {}).items():
            segs[k] = (int(v["range"][0]), int(v["range"][1]), self.dir / v.get("shots", f"shots/shots{k}.mjs"))
        return segs


def find_series(start):
    p = Path(start).resolve()
    for q in [p, *p.parents]:
        if (q / "arclab.json").exists():
            return q
    raise SystemExit(f"no arclab.json above {start}: run `arclab new-series` first, or pass --ep <episode folder>")


def read_json(p, default=None):
    p = Path(p)
    if not p.exists():
        if default is not None:
            return default
        raise SystemExit(f"missing {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def write_json(p, obj):
    Path(p).write_text(json.dumps(obj, indent=1, ensure_ascii=False), encoding="utf-8")


def env_key(series, name="ELEVENLABS_API_KEY"):
    """The buyer's key: environment first, then <series>/.env, then ~/.arclab/.env. Never printed."""
    if os.environ.get(name):
        return os.environ[name].strip()
    for f in (Path(series) / ".env", Path.home() / ".arclab" / ".env"):
        if f.exists():
            for line in f.read_text(encoding="utf-8").splitlines():
                if line.strip().startswith(name + "="):
                    v = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if v:
                        return v
    raise SystemExit(f"no {name}: put `{name}=...` in {Path(series) / '.env'} (see INSTALL.md); it is never shared")


def ffmpeg(*args, quiet=True):
    cmd = ["ffmpeg", "-y", "-hide_banner"] + (["-loglevel", "error"] if quiet else []) + [str(a) for a in args]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {' '.join(cmd[:12])} ...\n{r.stderr[-1500:]}")
    return r


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-show_streams", "-show_format", "-of", "json", str(path)],
                       capture_output=True, text=True)
    j = json.loads(r.stdout or "{}")
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), {})
    a = next((s for s in j.get("streams", []) if s.get("codec_type") == "audio"), None)
    fr = v.get("r_frame_rate", "30/1").split("/")
    return {"frames": int(v.get("nb_read_packets", 0) or 0), "width": v.get("width"), "height": v.get("height"),
            "pix_fmt": v.get("pix_fmt"), "codec": v.get("codec_name"), "profile": v.get("profile"),
            "fps": float(fr[0]) / float(fr[1] or 1), "color_space": v.get("color_space"), "color_range": v.get("color_range"),
            "color_primaries": v.get("color_primaries"), "color_transfer": v.get("color_transfer"),
            "duration": float(j.get("format", {}).get("duration", 0) or 0), "size": int(j.get("format", {}).get("size", 0) or 0),
            "bit_rate": int(j.get("format", {}).get("bit_rate", 0) or 0), "audio": a}


def loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    P = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)
    return {"lufs": float(I[-1]) if I else None, "true_peak": float(P[-1]) if P else None}


def ep_arg(argv):
    """--ep <dir> from argv (default cwd)"""
    if "--ep" in argv:
        return argv[argv.index("--ep") + 1]
    return None
