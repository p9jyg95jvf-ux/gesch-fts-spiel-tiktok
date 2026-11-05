# Day 23 · Episode 1: BUILD BRIEF (every builder reads all of it before starting)

Story: `BEATS.md`. Rulebook: `../series/BIBLE.md`. Words and timing: `timeline_lock.json` (LOCKED: 1128 frames, 30 fps,
37.6 s; never change it). Script: `story.json`. Kit: `../kit/` (contract `../kit/KIT_API.md`). Engine docs:
`<skill>/docs/LOOK_API.md`, `<skill>/docs/CHARS_API.md`, `<skill>/docs/PIPELINE.md`.

This is the worked example: every shot below is built and renders. Read it next to `shots/shotsA.mjs` and
`shots/shotsB.mjs` to see how a line of the brief becomes code.

## Who builds what (each builder touches ONLY its own files)

| Builder | Files | Frames |
|---|---|---|
| KIT | `../kit/props.mjs`, `../kit/sets.mjs` (bed, IV, flowers, calendar, door, wheelchair, chained doors, vehicles; room, hallway, Main Street) | - |
| SEG-A | `shots/shotsA.mjs` | 0-459 |
| SEG-B | `shots/shotsB.mjs` | 460-1127 |
| OVL | `episode.json` "overlay" (HUD, the RULE card, vote, end card; captions come from the timeline) | all |
| SOUND | `cues.json` (written from the shots' CUES and the timeline) + `score.json` (the music) | all |

## The lines (locked; f = frame). From `python <engine>/arclab.py voice --ep ep01 --table`

| Line | Who | Frames | Text |
|---|---|---|---|
| L00 | narr | 2-78 | You wake up. Something is at the door. |
| L01 | narr | 95-189 | Twenty-three days. That's how long you slept. |
| L02 | narr | 207-265 | And nobody came to wake you. |
| L03 | narr | 284-369 | At the end of the hall, the doors are chained. |
| L04 | narr | 378-440 | And something is pushing back. |
| L05 | narr | 461-503 | Then a dog barks. |
| L06 | narr | 512-554 | It knows the way out. |
| L07 | narr | 573-654 | Outside, the whole town is empty. |
| L08 | narr | 662-694 | Almost. |
| L09 | narr | 720-797 | One turns. Then all of them. (card: RULE #1 · STAY UNSEEN, f695-731) |
| L10 | narr | 820-943 | Run for the police car. Hide in the bus. Or go back inside. |
| L11 | narr | 952-1026 | Comment one, two or three. |

Word onsets for exact timing: `timeline_lock.json` (`lines[i].words`, seconds). Key words: "Something" f37, "door"
f62, "slept" f162, "chained" f338, "pushing" f406, "back" f419, "dog" f472, "barks" f481, "empty" f627, "turns" f727,
"them" f776, "Run" f820, "Hide" f865, "go" f903. Cut 1-4 frames BEFORE the first word of a line.

## Shot lists (as built)

### SEG-A (frames 0-459): the hospital, grade `threat`
- **A01 (0-91) L00.** FRAME 0 IS ACTION. Your room, wide: the door handle rattles, a dark shape behind the frosted
  glass; you jolt upright in bed (f3). The shape presses on "Something" (f37); the door shakes on "door" (f62). Flicker.
- **A02 (92-142) L01.** The calendar: MARCH, 1-22 crossed out, 23 ringed in red. A slow push that ends with the ring
  centred (zoom 2.2 → 2.8).
- **A03 (143-204) L01.** You, close: you stare, then your hand goes to the bandage (f168). Wilted flowers soft in front.
- **A04 (205-375) L02 + L03, one shot.** The hallway: you step out of your room (from behind) into an empty corridor; a
  wheelchair on its side, papers, lamps dying. You stop and look round; on "At the end of the hall" (f284) you walk on
  toward the doors and the camera follows behind you; by "chained" (f338) the chain, padlock and KEEP OUT read over
  your shoulder. The wheelchair slides out of frame as the camera passes it.
- **A06 (376-459) L04.** The doors close: grey fingers in the gap; on "pushing" (f406) the doors bow and the chain
  jumps; on "back" an eye in the gap (f417-421, pause bait). The clue rect covers the whole upper door so the caption
  sits under it.

### SEG-B (frames 460-1127): the dog, then Main Street, grade `golden` (desaturated) from f572
- **B01 (460-509) L05.** The side doorway under the EXIT sign: the dog, red bandana, barks on "dog" (f472) and "barks"
  (f481).
- **B02 (510-571) L06.** It turns (f512) and trots into the dark stairwell (gone by f548); you run in after it from
  the left (f536).
- **B03 (572-659) L07.** Main Street: you and the dog walk out into the middle of the road (from behind). The vehicles
  are 3D and grounded (kit `drawVehicle`): the police car crashed on the left curb, its light bar still flashing red and
  blue on the road; the school bus stopped in the right lane, door side toward us; a car parked on the left; a wreck
  burning far up the street (flames, embers, a smoke column). Dust in the sun, ash drifting down, newspaper blowing.
- **B04 (660-691) L08.** "Almost.": a punch (f662) toward one figure standing in the road, its back to us, swaying.
- **B05 (692-759) card + L09.** The RULE #1 card lands in the silence; then close on it: grey neck, torn collar. It turns
  to face you (f731), jaw opens (f748).
- **B06 (760-816) L09.** Over your shoulders (you on the left, the dog on the right, backs to us): the whole street of
  the dead turns one by one (from f758), then starts to shamble; a boom and a shake on "them" (f776), you flinch and
  the dog drops its ears. Same spot and same crowd as the vote shot that follows.

### The vote and end card
- **B07 (817-1127) L10 + L11 + end card, ONE shot (no cut: nobody vanishes).** You and the dog in the middle of the
  street, facing us; the dead closing in behind, slowing as they near. You look at the police car on "Run" (f820), the
  bus on "Hide" (f865), back at the hospital on "go" (f903); on "Comment one" (f955) you glance back over your
  shoulder; at f985 you turn to face them and the dog turns with you, ears back. The end card lands over the two of
  you facing the dead. Faces stay in y 400-760; the vote stack fills y 800-1440 (the safe frame, `docs/SAFE_ZONE.md`).
- Keep **y 800-1440 calm** (the vote title, pills and "COMMENT 1 · 2 · 3") and **y 340-700 calm-ish** (the end card).
  Small life only.

## House rules (breaking one sends the shot back)
- Faces readable: the speaking/reacting face is big enough to read at phone size, inside the safe frame
  (x 120-960, y 270-1480, left of x 860 from y 900 down).
- Props sit on the floor or a table, in scale, and exist in EVERY shot whose view shows their spot.
- Nothing too dark: mean luma above ~55 except one deliberate beat; every dark shot has its light source in frame.
- Diegetic text only (handwriting, signs, a phone screen); every other word is the overlay's.
- Return `faces` and `clues` in every shot's META: the overlay keeps captions off them automatically.
- Pure functions of time (no Math.random, no frame counters); fast moves spread over 6+ frames.
- Vehicles and walkers in the street share ONE depth order (`depthDraw` in shotsB.mjs): never draw a car over someone
  standing in front of it.

## How to work
1. Read the closest example shot (`<skill>/examples/day-23/ep01/shots/`), the kit contract and LOOK_API.md.
   Export `SHOTS` and `CUES` (named moments in seconds, for the sound).
2. Stills while you work: `arclab stills --ep . --seg A --frames f,f,f` and LOOK at each at full size (faces, hands,
   props on the floor, nothing cut off, nothing too dark, captions' band clear or the face/clue returned in META).
3. Draft plate: `arclab draft --ep . --seg A`, then look at its every-frame sheets. Fix and re-render.
4. **Done =** your plate renders with 0 errors, the frame count matches your range, and you have looked at every frame.
   Reply with: the shot list as built (frames), the CUES you export, anything you simplified, anything you're unsure of.
