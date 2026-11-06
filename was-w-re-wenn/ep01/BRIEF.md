# Was wäre wenn · Episode 1: BUILD BRIEF (every builder reads all of it before starting)

Story: `BEATS.md`. Rulebook: `../series/BIBLE.md`. Words and timing: `timeline_lock.json` (LOCKED: _FRAMES_ frames, 30 fps,
_SECONDS_ s; never change it). Script: `story.json`. Kit: `../kit/` (contract `../kit/KIT_API.md`). Engine docs:
`<skill>/docs/LOOK_API.md`, `<skill>/docs/CHARS_API.md`, `<skill>/docs/PIPELINE.md`.

## Who builds what (each builder touches ONLY its own files)

| Builder | Files | Frames |
|---|---|---|
| KIT | `../kit/props.mjs`, `../kit/sets.mjs` (new props/sets for this episode; contract first, stubs in 10 min) | - |
| SEG-A | `shots/shotsA.mjs` | 0-_ |
| SEG-B | `shots/shotsB.mjs` | _-_ |
| OVL | `episode.json` "overlay" (HUD, cards, vote, end card; captions come from the timeline) | all |
| SOUND | `cues.json` (the lead writes it from the shots' CUES and the timeline) | all |

## The lines (locked; f = frame). Paste from `python <engine>/arclab.py voice --ep . --table`

| Line | Who | Frames | Text |
|---|---|---|---|

Word onsets for exact timing: `timeline_lock.json` (`lines[i].words`, seconds). Cut 1-4 frames BEFORE the first word of
a line. One clear picture per line.

## Shot lists

### SEG-A (frames _-_)
- **A01 (0-__) L00.** FRAME 0 IS ACTION. _What we see, who does what, where the camera is, what moves._
- **A02 (__-__) L01.** _..._

### SEG-B (frames _-_)
- **B01 ...**

### The vote and end card
- Keep **y 800-1440 calm** (the vote title, pills and "COMMENT 1 · 2 · 3") and **y 340-700 calm-ish** (the end card).
  Faces above y 760 during the vote. Small life only.

## House rules (breaking one sends the shot back)
- Faces readable: the speaking/reacting face is big enough to read at phone size, inside the safe frame
  (`docs/SAFE_ZONE.md`: x 120-960, y 270-1480, and left of x 860 from y 900 down) and above the caption band
  (y 1180-1440) while its line plays. Nothing to read below y 1480.
- Props sit on the floor or a table, in scale, and exist in EVERY shot whose view shows their spot.
- Nothing too dark: mean luma above ~55 except one deliberate beat; every dark shot has its light source in frame.
- Diegetic text only (handwriting, signs, a phone screen); every other word is the overlay's.
- Return `faces` and `clues` in every shot's META: the overlay keeps captions off them automatically.
- Pure functions of time (no Math.random, no frame counters); fast moves spread over 6+ frames.

## How to work
1. Read the closest example shot (`<skill>/examples/day-23/ep01/shots/`), the kit contract and LOOK_API.md.
   Export `SHOTS` and `CUES` (named moments in seconds, for the sound).
2. Stills while you work: `arclab stills --ep . --seg A --frames f,f,f` and LOOK at each at full size (faces, hands,
   props on the floor, nothing cut off, nothing too dark, captions' band clear or the face/clue returned in META).
3. Draft plate: `arclab draft --ep . --seg A`, then look at its every-frame sheets. Fix and re-render.
4. **Done =** your plate renders with 0 errors, the frame count matches your range, and you have looked at every frame.
   Reply with: the shot list as built (frames), the CUES you export, anything you simplified, anything you're unsure of.
