"""Arc Lab Series Skill: ONE command for every pipeline step. Claude runs these; you never have to.

    python <engine>/arclab.py doctor [--ep EP]                 check the setup (Node, Python packages, ffmpeg, canvas, key)
    python <engine>/arclab.py new-series "Day 23" [--dir PARENT]   a series folder from the templates
    python <engine>/arclab.py new-episode --series SERIES [--n 2]           an episode folder (ep02 ...) in a series
    python <engine>/arclab.py score --ep EP                                  render the episode's music (score.json) to out/score.wav
    python <engine>/arclab.py voices --ep EP                    the ElevenLabs voices your key can use (for casting)
    python <engine>/arclab.py voice --ep EP [--bill] [--lock] [--table] [--line N --seed S]
    python <engine>/arclab.py stt --ep EP [--file out/x.mp4]    speech-to-text word check
    python <engine>/arclab.py sheets --ep EP                    model sheets of the series cast (look test)
    python <engine>/arclab.py look --ep EP                      look-test stills (ep/look/lookshots.mjs)
    python <engine>/arclab.py plan --ep EP                      shot tables + coverage + out/cuts.json
    python <engine>/arclab.py stills --ep EP --seg A --frames 30,140   full-size stills of a segment
    python <engine>/arclab.py overlay --ep EP [--stills 40,700]  captions/HUD/cards/vote (all frames, or previews)
    python <engine>/arclab.py mix --ep EP                       the sound mix (-14 LUFS)
    python <engine>/arclab.py draft --ep EP [--procs N]         half-size draft: plates -> overlay -> mix -> assemble -> QA
    python <engine>/arclab.py final --ep EP [--procs N]         full-quality final (only after the draft is approved)
    python <engine>/arclab.py qa --ep EP FILE [frames]          final QA on a file;   allframes --ep EP FILE: every-frame sheets
    python <engine>/arclab.py safezone --ep EP [FILE]           the safe-frame check alone (also part of qa); or any video,
                                                                 still or frames folder: safezone FILE (contact sheet only)
    python <engine>/arclab.py covers --ep EP --frames 75,345 --title "TITLE|LINE 2"
    python <engine>/arclab.py sfx --ep EP --list | --render NAME [secs] | --search "q" ... | --fetch picks.json

--procs: parallel render workers (default: CPU count minus 2). A second machine can render a segment in parallel: copy
the series folder there, run `arclab.py draft --ep EP --seg B` on it, copy out/draft/plate_B_half.mp4 back (see
PIPELINE.md, "Optional: a second render machine").
"""
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

ENGINE = Path(__file__).resolve().parent
SKILL = ENGINE.parent
PY = [sys.executable]
NODE = shutil.which("node") or "node"


def arg(argv, k, d=None):
    return argv[argv.index(k) + 1] if k in argv else d


def run(cmd, check=True):
    print("$", " ".join(str(c) for c in cmd), flush=True)
    r = subprocess.run([str(c) for c in cmd])
    if check and r.returncode != 0:
        raise SystemExit(f"step failed (exit {r.returncode}): {' '.join(str(c) for c in cmd[:4])} ...")
    return r.returncode


def py(script, *a, check=True):
    return run([*PY, ENGINE / "py" / script, *a], check)


def node(script, *a, check=True):
    return run([NODE, ENGINE / script, *a], check)


def procs(argv):
    return arg(argv, "--procs", str(max(1, (os.cpu_count() or 4) - 2)))


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "series"


def segments(ep):
    cfg = json.loads((Path(ep) / "episode.json").read_text(encoding="utf-8"))
    return list((cfg.get("segments") or {}).keys())


# ------------------------------------------------------------------------------------------------ scaffolding
def new_series(argv):
    name = next((a for a in argv[1:] if not a.startswith("--") and argv[argv.index(a) - 1] not in ("--dir",)), None)
    if not name:
        raise SystemExit('usage: arclab.py new-series "Series Name" [--dir PARENT]')
    root = Path(arg(argv, "--dir", ".")).resolve() / slug(name)
    if root.exists():
        raise SystemExit(f"{root} already exists")
    T = SKILL / "templates"
    (root / "series").mkdir(parents=True)
    (root / "kit").mkdir()
    (root / "sfx").mkdir()
    (root / "look").mkdir()
    (root / "arclab.json").write_text(json.dumps({"series": name, "handle": "", "engine": ENGINE.as_posix(), "created": str(date.today())}, indent=1), encoding="utf-8")
    (root / "engine.mjs").write_text("// Points this series' shots and kit at the Arc Lab engine (written by `arclab new-series`; re-run `arclab doctor --fix-engine` if the engine moves).\n"
                                     f"export * from '{(ENGINE / 'index.mjs').as_uri()}';\n", encoding="utf-8")
    for src, dst in [("SERIES_BIBLE.md", "series/BIBLE.md"), ("CANON.md", "series/CANON.md"), ("VOICES.json", "series/VOICES.json"),
                     ("kit/cast.mjs", "kit/cast.mjs"), ("kit/props.mjs", "kit/props.mjs"), ("kit/sets.mjs", "kit/sets.mjs"), ("KIT_CONTRACT.md", "kit/KIT_API.md"),
                     ("env.example", ".env.example"), ("gitignore", ".gitignore")]:
        txt = (T / src).read_text(encoding="utf-8").replace("{{SERIES}}", name)
        (root / dst).write_text(txt, encoding="utf-8")
    (root / "sfx" / "SOURCES.md").write_text("# Sound sources\n\nSynth sounds (synth:*) are made by the Arc Lab engine. Pixabay files fetched with `arclab sfx --fetch` are logged below "
                                            "(Pixabay Content License: free for commercial use, no redistribution of the files on their own).\n", encoding="utf-8")
    print(f"series folder: {root}\nnext: put your ElevenLabs key in {root / '.env'} (copy .env.example), then `arclab.py new-episode --series {root}`")


def new_episode(argv):
    series = Path(arg(argv, "--series", ".")).resolve()
    if not (series / "arclab.json").exists():
        raise SystemExit(f"{series} is not a series folder (no arclab.json)")
    n = int(arg(argv, "--n", "0")) or 1 + max([int(p.name[2:]) for p in series.glob("ep[0-9][0-9]") if p.name[2:].isdigit()] or [0])
    ep = series / f"ep{n:02d}"
    if ep.exists():
        raise SystemExit(f"{ep} already exists")
    name = json.loads((series / "arclab.json").read_text(encoding="utf-8"))["series"]
    T = SKILL / "templates"
    for d in ("shots", "look", "publish"):
        (ep / d).mkdir(parents=True, exist_ok=True)
    for src, dst in [("EPISODE_BEATS.md", "BEATS.md"), ("story.json", "story.json"), ("episode.json", "episode.json"), ("BRIEF.md", "BRIEF.md"),
                     ("cues.json", "cues.json"), ("score.json", "score.json"), ("POST.md", "publish/POST.md"), ("QA_CHECKLIST.md", "QA.md"),
                     ("shots/shotsA.mjs", "shots/shotsA.mjs"), ("look/lookshots.mjs", "look/lookshots.mjs")]:
        txt = (T / src).read_text(encoding="utf-8").replace("{{SERIES}}", name).replace("{{N}}", str(n))
        (ep / dst).write_text(txt, encoding="utf-8")
    if n > 1:
        (ep / "stats.json").write_text(json.dumps({"total": 0, "p": [0, 0, 0], "options": ["OPTION 1", "OPTION 2", "OPTION 3"], "winner_index": 0,
                                                   "note": "fill in the last episode's real vote before the voice step (the stat line reads it)"}, indent=1), encoding="utf-8")
    print(f"episode folder: {ep}")


# ------------------------------------------------------------------------------------------------ the big steps
def draft(argv):
    ep = arg(argv, "--ep", "."); P = procs(argv)
    segs = [arg(argv, "--seg")] if "--seg" in argv else segments(ep)
    for s in segs:
        node("pipeline/renderSeg.mjs", "--ep", ep, "--seg", s, "--scale", "0.5", "--ss", "1", "--sub", "2", "--procs", P)
    if "--seg" in argv:
        return
    node("pipeline/renderSeg.mjs", "--ep", ep, "--seg", "all", "--plan")
    for f in Path(ep, "overlay").glob("[0-9]*.png"):
        f.unlink()
    node("pipeline/overlay.mjs", "--ep", ep, "--all", "--procs", str(min(6, int(P))))
    py("mix.py", "--ep", ep)
    name = arg(argv, "--name") or f"{Path(ep).resolve().parent.name}_{Path(ep).resolve().name}"
    py("assemble.py", "--ep", ep, "--draft", "--name", name, check=False)
    code = py("final_qa.py", "--ep", ep, f"out/{name}_draft.mp4", check=False)
    py("allframes.py", "--ep", ep, f"out/{name}_draft.mp4")
    print(f"\nDRAFT: {Path(ep) / 'out' / (name + '_draft.mp4')}  final_qa {'PASS' if code == 0 else 'FAIL'}; now LOOK at every sheet in out/qa/{name}_draft/")
    sys.exit(code)


def final(argv):
    ep = arg(argv, "--ep", "."); P = procs(argv)
    for s in segments(ep):
        node("pipeline/renderSeg.mjs", "--ep", ep, "--seg", s, "--procs", P, *(["--ss", arg(argv, "--ss")] if "--ss" in argv else []), *(["--sub", arg(argv, "--sub")] if "--sub" in argv else []))
    node("pipeline/renderSeg.mjs", "--ep", ep, "--seg", "all", "--plan")
    for f in Path(ep, "overlay").glob("[0-9]*.png"):          # always fresh: the full render's layout moves captions
        f.unlink()
    node("pipeline/overlay.mjs", "--ep", ep, "--all", "--procs", str(min(6, int(P))))
    py("mix.py", "--ep", ep)
    name = arg(argv, "--name") or f"{Path(ep).resolve().parent.name}_{Path(ep).resolve().name}"
    py("assemble.py", "--ep", ep, "--final", "--name", name, check=False)
    code = py("final_qa.py", "--ep", ep, f"out/{name}_final.mp4", check=False)
    print(f"\nFINAL: {Path(ep) / 'out' / (name + '_final.mp4')} (+ _phone.mp4)  final_qa {'PASS' if code == 0 else 'FAIL'}")
    sys.exit(code)


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__); return
    c, rest = argv[0], argv[1:]
    ep = arg(rest, "--ep", ".")
    if c == "doctor":
        py("doctor.py", *rest, check=False)
    elif c == "new-series":
        new_series(argv)
    elif c == "new-episode":
        new_episode(argv)
    elif c == "voices":
        py("voice.py", "--voices", "--ep", ep)
    elif c == "voice":
        py("voice.py", *rest)
    elif c == "stt":
        py("stt_check.py", *rest, check=False)
    elif c == "sheets":
        from_ep = Path(ep).resolve()
        series = next((p for p in [from_ep, *from_ep.parents] if (p / "arclab.json").exists()), from_ep)
        node("chars/sheet.mjs", "--kit", series / "kit" / "cast.mjs", "--out", series / "look" / "sheets", *rest[2:] if rest[:1] == ["--ep"] else rest)
    elif c == "look":
        node("pipeline/renderSeg.mjs", "--ep", ep, "--look", *[a for a in rest if a not in ("--ep", ep)])
    elif c == "plan":
        node("pipeline/renderSeg.mjs", "--ep", ep, "--seg", "all", "--plan")
    elif c == "stills":
        node("pipeline/renderSeg.mjs", "--ep", ep, "--seg", arg(rest, "--seg", "A"), "--stills", arg(rest, "--frames", "0"), "--sub", arg(rest, "--sub", "2"))
    elif c == "overlay":
        node("pipeline/overlay.mjs", *rest, *([] if ("--stills" in rest or "--range" in rest or "--cues" in rest) else ["--all"]))
    elif c == "mix":
        py("mix.py", *rest)
    elif c == "draft":
        draft(rest)
    elif c == "final":
        final(rest)
    elif c == "qa":
        py("final_qa.py", *rest, check=False)
    elif c == "safezone":
        if "--ep" in rest:
            py("safezone.py", *rest, check=False)
        else:
            run([*PY, ENGINE / "safezone" / "check.py", *rest], check=False)
    elif c == "allframes":
        py("allframes.py", *rest)
    elif c == "covers":
        node("pipeline/cover.mjs", *rest)
    elif c == "sfx":
        py("sfx.py", *rest)
    elif c == "score":
        py("score.py", *rest)
    elif c == "assemble":
        py("assemble.py", *rest, check=False)
    else:
        raise SystemExit(f"unknown command '{c}' (python arclab.py help)")


if __name__ == "__main__":
    main(sys.argv[1:])
