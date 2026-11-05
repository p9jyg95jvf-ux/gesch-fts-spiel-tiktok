"""Arc Lab: SETUP DOCTOR. Checks everything the skill needs and says exactly how to fix what's missing.

    python <engine>/arclab.py doctor [--ep <series or episode folder>]
"""
import importlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent
OK, BAD = [], []


def check(name, ok, fix):
    (OK if ok else BAD).append(name)
    print(f"  {'OK ' if ok else 'FIX'}  {name}" + ("" if ok else f"\n        -> {fix}"))


def out(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return (r.stdout + r.stderr).strip()
    except Exception as e:  # noqa: BLE001
        return f"ERR {e}"


def main(argv):
    print("Arc Lab doctor\n")
    node = shutil.which("node")
    v = out(["node", "--version"]) if node else ""
    major = int(v.lstrip("v").split(".")[0]) if v.startswith("v") else 0
    check(f"Node.js {v or '(missing)'} (need 18+)", major >= 18, "install Node.js LTS from nodejs.org, then reopen the terminal")
    check(f"Python {sys.version.split()[0]} (need 3.10+)", sys.version_info >= (3, 10), "install Python 3.12 from python.org (tick 'Add to PATH')")
    for mod, pipname in [("numpy", "numpy"), ("scipy", "scipy"), ("soundfile", "soundfile"), ("PIL", "pillow"), ("requests", "requests")]:
        try:
            importlib.import_module(mod); ok = True
        except Exception:  # noqa: BLE001
            ok = False
        check(f"Python package {pipname}", ok, f"{sys.executable} -m pip install -r \"{ENGINE / 'requirements.txt'}\"")
    ff = shutil.which("ffmpeg") and shutil.which("ffprobe")
    check("ffmpeg + ffprobe on PATH", bool(ff), "Windows: `winget install Gyan.FFmpeg`; Mac: `brew install ffmpeg`; then reopen the terminal")
    if ff:
        enc = out(["ffmpeg", "-hide_banner", "-encoders"])
        check("ffmpeg has libx264 + libx264rgb", "libx264 " in enc and "libx264rgb" in enc, "install a full ffmpeg build (the winget/brew ones above include x264)")
    canvas = (ENGINE / "node_modules" / "@napi-rs" / "canvas").exists()
    check("@napi-rs/canvas in engine/node_modules", canvas, f"cd \"{ENGINE}\" && npm install")
    if canvas and node:
        r = out(["node", "-e", f"import('{(ENGINE / 'lib.mjs').as_uri()}').then(m=>{{const c=m.createCanvas(64,64);c.getContext('2d').fillRect(0,0,8,8);console.log('canvas ok',c.toBuffer('image/png').length)}})"])
        check("the canvas draws", "canvas ok" in r, f"reinstall: cd \"{ENGINE}\" && npm install --force   ({r[-200:]})")
    check("bundled fonts", (ENGINE / "fonts" / "Oswald-Variable.ttf").exists(), "re-copy the skill folder (engine/fonts is missing)")
    skill, home = ENGINE.parent, Path.home() / ".claude" / "skills" / "arc-lab-series"
    placed = skill.name == "arc-lab-series" and skill.parent.name == "skills" and (skill / "SKILL.md").exists()
    if placed or any(q.name == "skills" for q in skill.parents):     # an install attempt: one level too deep is the usual slip
        check(f"skill folder in place ({skill / 'SKILL.md'})", placed,
              f"move the folder that holds SKILL.md so the file is at {home / 'SKILL.md'} (unzipping can add an extra "
              "folder level), then start a new Claude Code session")
    else:
        print(f"  NOTE skill folder {skill} is outside a skills folder: Claude Code only finds the skill at {home}")
    ep = argv[argv.index("--ep") + 1] if "--ep" in argv else None
    if ep:
        p = Path(ep).resolve()
        series = next((q for q in [p, *p.parents] if (q / "arclab.json").exists()), None)
        check("series folder (arclab.json)", series is not None, "run `arclab.py new-series \"Name\"` first")
        if series:
            sys.path.insert(0, str(ENGINE / "py"))
            from common import env_key  # noqa: E402
            try:
                env_key(series); has = True
            except SystemExit:
                has = False
            check("ElevenLabs key (ELEVENLABS_API_KEY in the series .env; never printed)", has, f"copy {series / '.env.example'} to {series / '.env'} and paste your key after the =")
            shim = (series / "engine.mjs").read_text(encoding="utf-8") if (series / "engine.mjs").exists() else ""
            import re
            from urllib.parse import urlparse
            from urllib.request import url2pathname
            m = re.search(r"from '([^']+)'", shim)
            tgt = None
            if m:
                ref = m.group(1)
                tgt = Path(url2pathname(urlparse(ref).path)) if ref.startswith("file:") else (series / ref)   # Windows C:\..., Mac /Users/...
            same = bool(tgt) and tgt.resolve() == (ENGINE / "index.mjs").resolve()
            check("engine.mjs points at this engine", same, "re-create it: arclab.py doctor --ep SERIES --fix-engine")
            if "--fix-engine" in argv:
                (series / "engine.mjs").write_text(f"// Points this series' shots and kit at the Arc Lab engine.\nexport * from '{(ENGINE / 'index.mjs').as_uri()}';\n", encoding="utf-8")
                a = json.loads((series / "arclab.json").read_text(encoding="utf-8")); a["engine"] = ENGINE.as_posix()
                (series / "arclab.json").write_text(json.dumps(a, indent=1), encoding="utf-8")
                print("        fixed engine.mjs + arclab.json")
    print(f"\n{len(OK)} OK, {len(BAD)} to fix" + ("" if BAD else ": ready to make episodes"))
    sys.exit(1 if BAD else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
