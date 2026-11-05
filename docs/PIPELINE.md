# The pipeline: files, commands, data

All commands: `python <engine>/arclab.py <command> --ep <episode folder>` (`<engine>` = this skill's `engine/` folder).

## Folders

```
my-series/                      (arclab new-series "My Series")
  arclab.json                   series name, engine path
  engine.mjs                    a one-line shim: every kit/shot file imports the engine through it
  .env                          ELEVENLABS_API_KEY=... (yours; never shared, never printed)
  series/BIBLE.md CANON.md VOICES.json
  kit/cast.mjs props.mjs sets.mjs KIT_API.md
  look/sheets/                  model sheets
  sfx/                          fetched sounds + SOURCES.md (licences)
  .cache/eleven/                voice takes (re-runs cost nothing)
  ep01/                         (arclab new-episode --series my-series)
    BEATS.md story.json         the episode (APPROVAL 1)
    vo.wav timeline.json timeline_lock.json        the voice step
    look/lookshots.mjs look/stills/                the look test (APPROVAL 2)
    BRIEF.md episode.json shots/shotsA.mjs ...     the build
    cues.json                   the sound plan
    overlay/00000.png ...       the overlay frames + cues_overlay.json
    out/draft/plate_A_half.mp4  draft plates;  out/plate_A.mkv final plates (lossless)
    out/layout_A.json           faces and clues per frame (the overlay keeps captions off them)
    out/cuts.json               cut frames + named CUES from the shots
    out/mix.wav out/CUES.md     the sound
    out/<name>_draft.mp4        (APPROVAL 3) -> out/<name>_final.mp4 + _phone.mp4
    out/qa/<file>/              final_qa sheets + report.json + safezone.png; allframes sheets
    publish/cover_*.png POST.md the publishing pack
```

## The steps

| Step | Command | Writes |
|---|---|---|
| setup check | `doctor [--ep SERIES]` | (prints what to fix) |
| new series / episode | `new-series "Name"` · `new-episode --series DIR` | folders from `templates/` |
| cast voices | `voices --ep EP` | (lists your key's voices) |
| voice | `voice --ep EP --bill` (cost, spends nothing) → `voice --ep EP` → `stt --ep EP` → `voice --ep EP --lock` | vo.wav, timeline.json, timeline_lock.json |
| fix one line | `voice --ep EP --line 4 --seed 7` then `voice --ep EP` | a fresh take of line 4 |
| line table for the brief | `voice --ep EP --table` | (markdown table) |
| model sheets | `sheets --ep SERIES` | look/sheets/*.png |
| look test | `look --ep EP` | ep/look/stills/*.png |
| shot plan + cuts | `plan --ep EP` | out/cuts.json (+ prints shot tables, coverage) |
| stills | `stills --ep EP --seg A --frames 30,140` | out/stills/A/*.png |
| overlay | `overlay --ep EP` (or `--stills 40,700`) | overlay/*.png, cues_overlay.json |
| music | `score --ep EP` (score.json → the original score alone, to listen to) | out/score.wav |
| sound | `mix --ep EP` (voice + effects + beds + the score) | out/mix.wav, out/CUES.md |
| draft | `draft --ep EP` (all of: plates → plan → overlay → mix → assemble → final_qa → allframes) | out/<name>_draft.mp4 + QA |
| one segment only | `draft --ep EP --seg B` | out/draft/plate_B_half.mp4 |
| final | `final --ep EP` (after APPROVAL 3) | out/<name>_final.mp4 + _phone.mp4 |
| safe frame | `safezone --ep EP [FILE]` (the check alone) · `safezone FILE` (any video, still or frames folder: the sheet) | out/qa/<file>/safezone.png + safezone.json |
| covers | `covers --ep EP --frames 75,345 --title "LINE 1|LINE 2"` | publish/cover_*.png + covers_sheet.jpg |
| sound library | `sfx --ep EP --list` · `--render NAME 10` · `--search "q"` · `--fetch picks.json` | sfx/ |

## Data formats

**story.json** (the script): `beats[]` each `{ gap, scene, card?, lines: [{ speaker, text, captions, gap_after?, vote?, cmt?, stat?, slot? }] }`
plus `vote: { title, options: [{ n, label, tag, say, col }] }`, `lead`, `line_gap`, `tail` (seconds the end card holds).
Captions: `|` splits chunks, `*word*` yellow, `!word!` red. `say` = the option's first spoken word (its pill pops on it).

**series/VOICES.json**: `{ model, cast: { narr: { voice, speed, stability, similarity, style, tempo, chip? }, ... } }`.

**timeline.json** (written by the voice step): `{ frames, duration, fps, lines: [{ i, speaker, text, start, end, words: [onsets], chunks: [{ text, start, end }], card?, vote?, cmt?, stat? }] }`.
Everything (shots, overlay, sound) syncs to it. Lock it before building pictures.

**episode.json**: `{ fps, width, height, grade: [{ preset, f0 | t0, ramp?, ...overrides }], segments: { A: { range: [a, b], shots } }, overlay: { hud, cards, avoid, vote, end, stat } }`.
Every frame 0..frames-1 belongs to exactly one segment.

**cues.json** (the sound plan): `{ beds: [{ sound, from, to, gain, fade, duck, lp }], hits: [{ sound, at, gain, offset, hit_at, a, b, rate, hp, lp, pan, note }], ui: 'auto', ui_gain }`.
`at`: seconds · `frame:F` · `line:N` · `line:N:end` · `word:N:word[:nth]` · `cue:NAME` (a shot's CUES).
`sound`: `synth:<name>` (the built-in library) or a file in `<series>/sfx/`. `music: { score, gain, duck, off }` adds the
episode's score on its own bus (ducked under the voice).

**score.json** (the music, original, from code): `{ bpm, hall, parts: [{ inst, from, to | at, gain, fade, ... }], stops: [{ from, to }] }`.
Instruments: `drone {note}`, `pad {chords: [[at, [notes]]], bright}`, `bell {seq: [[at, note]]}`, `ostinato {notes}` (eighths),
`toms {pattern}` / `ticks` (16 steps per bar, X accent), `riser {note}`, `braam {note, dur}`. Times as in cues.json; rhythm
parts start their first beat on `from`; `build` fades a rhythm part in over that many seconds.

**stats.json** (episode 2+): `{ total, p: [58, 13, 29], options: ["...", "...", "..."], winner_index }`: the last vote, read
by the stat line (`{TOTAL}`, `{P1}`, `{WINNER}`) and the YOUR VOTE card.

## Quality bars (enforced)

- Plates: exactly the segment's frame count (verified with ffprobe); a shot table and full coverage (`plan`).
- Mix: -14 LUFS integrated, true peak ≤ -1.3 dBTP (limited), every line ≥ 5.6 LU over the effects, exact length.
- Assemble: frame count, BT.709 tags, loudness within 0.5 LU of the mix.
- final_qa: frames, loudness (±1 LU), no dark frames, the safe frame (`docs/SAFE_ZONE.md`: no overlay pixel outside
  x 120-960 / y 270-1480 / the button rail, every face inside, captions in y 1180-1440 or listed if moved up, plus the
  `safezone.png` sheet with the app's buttons drawn on); lists single-frame pops and frozen stretches for a look by eye.
- allframes: EVERY frame on numbered sheets, which a human (or Claude, reading the images) looks at.

## Speed

On a 16-core desktop the 34 s example renders its half-size draft plates in ~2.2 minutes (8 workers), the overlay in
20 s, the mix in 4 s, the assembly in 7 s. Full quality costs roughly 6-10x the draft. `--procs` defaults to your CPU
count minus 2; lower it if the computer must stay usable.

## Optional: a second render machine

If you have another computer, it can render segments in parallel: copy the series folder there (same skill version),
run `python <engine>/arclab.py draft --ep ep01 --seg B` (or `final`'s plate step via `renderSeg.mjs --seg B`), and copy
`out/draft/plate_B_half.mp4` (or `out/plate_B.mkv`) back into the same place. Plates join losslessly. Don't copy `.env`
unless that machine also runs the voice step.
