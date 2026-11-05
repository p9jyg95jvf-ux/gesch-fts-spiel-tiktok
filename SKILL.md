---
name: arc-lab-series
description: Arc Lab Series Skill. Turns a series idea into finished, vote-driven, code-animated story episodes (vertical 9:16 shorts for Instagram Reels / YouTube Shorts / TikTok), with original chibi characters drawn in code (no AI video), ElevenLabs voices on the user's own key, captions, a sound mix, frame-by-frame QA and a publishing pack. Use when the user wants to start an animated story series, make the next episode from a vote result, work on any step of an Arc Lab series (bible, script, voice, look test, shots, sound, draft, final, covers, post text), or set up or update this skill.
---

# Arc Lab Series Skill

You (Claude) make an animated story series with the user. **The user brings the idea and approves three checkpoints;
you do everything else**: the series bible, the episode script, the voices, the characters and sets (drawn in code),
the shots, the captions, the sound, the QA, and the publishing pack. Then the next episode from the audience's vote.

Read this file fully before starting. Then use, as needed:
- `docs/CRAFT.md`: how to write and stage an episode people finish and vote on. **Read it before writing any script.**
- `docs/CHARS_API.md`: the character system (humans, creature companions, custom rigs, takes).
- `docs/LOOK_API.md`: how a shot is built (layers, camera, light, colour script).
- `docs/PIPELINE.md`: every command, file and data format.
- `docs/PUBLISHING.md`: posting, the vote loop, growth.
- `lessons/` (01-install-and-check.md … 06-posting-and-the-vote.md): Arc Lab's guides for the user, in plain words, one
  per step (install, idea and bible, script, voice and look test, draft notes, posting and the vote). Point the user to
  the one for the step you're at.
- `examples/day-23/`: a complete, working episode made with this skill ("Day 23", ep 1: you wake from a coma in a town
  where the dead walk): bible, canon, cast (a hero, a dog, four walkers), kit, script, voice, look test, shots, overlay
  config, sound plan, QA and publishing pack. **Copy its patterns.**

`<engine>` below = this skill's `engine/` folder. Every command is `python <engine>/arclab.py <command> ...`.

## Golden rules (never break these)

1. **Original only.** Every character, creature, place, prop, name, logo and sound is new for this series. Never
   recreate or imitate an existing franchise, brand, celebrity or copyrighted character, even if the user asks for
   "something like X": offer an original take instead, and explain that original IP is what they can own and earn from.
2. **No AI video, no AI images in the picture.** Everything on screen is drawn by code through the engine. (AI voices
   via ElevenLabs are fine; that's the only generated media.)
3. **The user's own keys and accounts.** The ElevenLabs key lives in `<series>/.env` (or the environment). Never print,
   log, echo, copy or commit it. Never create accounts, never post or publish, never spend money: before any step that
   costs credits, tell the user what it costs (`voice --bill` gives the character count) and get a yes.
4. **Downloads only with permission.** The built-in synth library covers most sounds. Fetching Pixabay sounds is
   optional: show the user what you'd download (names, pages, sizes) and wait for a yes; every file is logged in
   `sfx/SOURCES.md`. Never ship or share those files outside the user's project.
5. **Three approvals.** Stop and wait for the user at each one. Don't build pictures before APPROVAL 2, don't render the
   final before APPROVAL 3. If the user is away, prepare everything up to the checkpoint and say what you're waiting for.
6. **Look at what you make.** Read every still and every QA sheet you render (they're images: open them). Pixel checks
   are not enough; ask "can a stranger tell what just happened?".
7. **Plain language.** Many users are not coders. Make the technical calls yourself and explain results simply.

## Step 0: setup (first time only, ~2 minutes)

1. `python <engine>/arclab.py doctor`. Fix what it lists, using `INSTALL.md` (Node, Python packages, ffmpeg,
   `npm install` in `<engine>`). Re-run until it's all OK.
2. Ask where the series should live (default: the current folder), then `new-series "<Series Name>" --dir <there>`.
3. The user puts their ElevenLabs key in `<series>/.env` (copy `.env.example`; paid plan for commercial use). You never
   see or type the key yourself; if they paste it into chat, write it to `.env` and never repeat it.
4. `doctor --ep <series>` again: the key and the engine link must be OK.

## Step 1: the series bible (from the idea)

From the user's one-line idea, ask at most 3 quick questions if the answer changes everything (who "you" are in the
story; the tone; anything they must or mustn't have), otherwise decide and say what you decided. Then write:
- `series/BIBLE.md` (template sections): the promise (second person, the vote loop), 3-6 laws of the world, the cast
  (role, wants, never), the mystery spine (the big secret + a reveal roadmap: one answer and one new mystery per
  episode), the clue plan, vote rules, nevers, look and sound.
- `series/CANON.md`: empty tracker, filled after each episode is posted.
- The cast in `kit/cast.mjs` (models only; see CHARS_API.md). Give the hero / companion one signature colour each.

Show the user a short summary of the bible (5-8 lines, no spoilers needed: they're the creator). Adjust if asked.

## Step 2: the episode script → APPROVAL 1

`new-episode --series <series>` makes `ep01/`. Write:
- `BEATS.md`: the beat sheet, using `docs/CRAFT.md` (frame 0 is action; a picture every 1.5-2.5 s; an event every
  ~3 s; a turn every ~7 s; one clip-able moment at ~60%; a fair twist; a big bright cliffhanger; a 3-option vote of
  physical verbs, each taught in the episode). First episode: 30-45 s for a quick test, 75-110 s for a full episode.
- `story.json`: the lines (4-5 words per sentence on average, present tense, second person; captions chunked with
  `*yellow*` and `!red!`), the beats' `scene` notes, the `card`s, the vote line (`"vote": true`), the comment line
  (`"cmt": true`), and the `vote` options (label, tag, the word that's spoken first: `say`).
- Episode 2+: start with the stat line (`"stat": true, "slot": 4.4`, e.g. "{TOTAL} votes. Most of you said, follow the
  prints.") and fill `stats.json` with the real vote the user reports.

**APPROVAL 1:** show the user the beats (a table: time, what we see, what's said) and the vote. Wait for OK or changes.

## Step 3: the voice (ElevenLabs, the user's key)

1. Cast once per series: `voices --ep <ep>` lists the voices on their key. Propose a narrator (calm, weighty, clear)
   and one voice per speaking character; write `series/VOICES.json` (copy the example's settings as a start). The same
   voices every episode.
2. `voice --ep <ep> --bill`: tell the user how many characters it will use. On a yes: `voice --ep <ep>`. One take
   per line; nothing is ever cut out of the middle of a take.
3. `stt --ep <ep>`: the speech-to-text word check must say "no differences" (match ≥ 0.97). A stutter or a wrong word:
   `voice --ep <ep> --line N --seed 7`, then `voice` again, then `stt` again.
4. Listen-check: send the user `vo.wav` if they want to hear it. Then **lock**: `voice --ep <ep> --lock`. From now on the
   timing is fixed; `voice --ep <ep> --table` prints the line table (frames) for the brief.

## Step 4: the look test → APPROVAL 2

1. Build what the episode needs in the kit: characters (`kit/cast.mjs`), sets (`kit/sets.mjs`), props
   (`kit/props.mjs`), with a contract in `kit/KIT_API.md` (signatures, sizes, states, returned points). Follow the
   example kit's style and structure.
2. `sheets --ep <series>`: model sheets (turnaround, poses, every expression) and a line-up. Look at them and fix.
3. Write `ep/look/lookshots.mjs` (one still per set with the cast in it, in its real colour-script chapter) and run
   `look --ep <ep>`. Look at each still: faces readable at phone size, nothing too dark (the tool flags mean luma under
   40), the hero and companion the brightest things, the clue objects readable.
4. **APPROVAL 2:** show the user the model sheets + look stills (make one board image). Wait for OK or changes.

## Step 5: the build (shots), in parallel when it's long

1. Split the locked frames into segments (~10-30 s each, cut on line boundaries) in `episode.json` `segments`, set the
   colour script (`grade`, a chapter per place/mood, `f0` on a cut) and the overlay config (`overlay`: HUD tag, clock,
   place, card style, vote title, end card).
2. Write `BRIEF.md` from the template: who builds what, the locked line table, a shot list per segment (one clear
   picture per line, cut 1-4 frames before the line's first word, what moves, where the camera is, what the companion
   feels), the house rules, how to check, what "done" means.
3. Build the shots (`shots/shotsA.mjs`, ...). Every shot returns `faces` and `clues` in META, so captions stay off them.
   Frame every shot for the phone (`docs/SAFE_ZONE.md`): faces inside x 120-960, y 270-1480 and, from y 900 down, left
   of x 860; the face that matters above the caption band (y 1180-1440) while its line plays; nothing to read below
   y 1480.
   - **Short episode (≤ 45 s):** build the segments yourself, one at a time.
   - **Long episode:** use the Agent tool: one builder per segment (and one for the kit if new props are needed), all
     started together, each given ONLY: the brief, its segment, its files, the kit contract, and the docs to read.
     Each builder touches only its own files, renders stills and its draft plate, looks at every frame, and reports
     the shots as built + its CUES. You check each report against its stills before accepting it.
4. `plan --ep <ep>`: every frame covered by exactly one shot; `out/cuts.json` written.

## Step 6: words and sound

1. Overlay: `overlay --ep <ep> --stills <a few frames>` to check the HUD, a caption, a card, the vote, the end card.
2. Sound plan `cues.json`: beds for each place, and a hit on every important word (`word:N:word`) or picture moment
   (`cue:A01.name`, from the shots' CUES). Use the synth library first (`sfx --list`). Rules: nothing voice-like under the
   narration, one silence after the clip-able moment, a sound cut off by the last frame.
3. Music `score.json`: an original score made by the engine (no downloads, no licences), locked to the cuts and words.
   Plan it like a film composer: quiet under the opening, a pulse when the hero moves, a dead silence before the
   reveal, a riser into the twist with one big hit (`braam`) on the word, drums and a driving bass under the vote, cut
   dead on the last frame. Instruments: drone, pad, bell, ostinato, toms, ticks, riser, braam (top of
   `<engine>/py/score.py`). `score --ep <ep>` renders it alone to check. It plays about 10-14 dB under the voice
   (cues.json `"music": { "gain": -11, "duck": 6 }`) and full where nobody speaks. Copy `examples/day-23/ep01/score.json`.
4. `mix --ep <ep>`: must print about -14 LUFS, true peak about -1.3, and "voice over the rest" ≥ 5.6 LU.

## Step 7: the draft, QA, fixes → APPROVAL 3

1. `draft --ep <ep>` renders the half-size draft plates, the overlay, the mix, assembles `out/<name>_draft.mp4`, runs
   `final_qa` (frame count, loudness, no dark frames, the safe frame) and writes every-frame sheets.
   **Open `out/qa/<name>_draft/safezone.png`** (red = the app crops or covers it, white = its buttons, pill and
   caption): nothing to read in red or under a button. final_qa FAILS on overlay text outside the safe frame or a face
   outside it, and lists captions it had to move up to clear a face (look at those).
2. **Look at every sheet** (`out/qa/<name>_draft/all_*.jpg`) using `templates/QA_CHECKLIST.md`: double images, a
   caption on a face or a clue, a caption lingering into the next shot, a character on top of the vote title, props
   missing, too dark, off-model poses. Fix the shot, re-render that segment (`draft --ep <ep> --seg B`), re-run `draft`.
3. **APPROVAL 3:** send the user the draft (it's small) and say what you checked. Wait for OK or changes.

## Step 8: the final and the publishing pack

1. `final --ep <ep>`: full quality, `out/<name>_final.mp4` (upload file) + `_phone.mp4`, final_qa again (with the
   safe-frame check on the full render's face data). Look at the QA sheets and `safezone.png` once more, and tell the
   user the safe-frame check passed.
2. Covers: pick 3 spoiler-free frames (the hero's face big, from the first third) and run `covers --ep <ep> --frames
   a,b,c --title "LINE 1|LINE 2"`. Run `safezone publish/cover_A.png` (and B, C) and look: the title inside
   x 100-980 and the grid's 3:4 crop (y 240-1680). Show `publish/covers_sheet.jpg`; the user picks.
3. Fill `publish/POST.md` (from the template; `docs/PUBLISHING.md`): YouTube title + description + settings, the
   Instagram caption + poll, the pinned vote comment, the clue comment and its hint, the story, the checklist.
   No spoilers anywhere.
4. Hand over: the final file, the chosen cover, POST.md. **The user posts.** Offer the posting checklist.

## Step 9: the next episode (the vote loop)

After ~24 h the user tells you the vote (comment counts + poll). Then:
1. Update `series/CANON.md` from what the posted episode actually showed and said (its timeline + shots).
2. `new-episode --series <series>`; fill `stats.json` with the real numbers; the winning option is what happens.
3. Back to Step 2 (the story opens on the winner, credited within 4 s). Reuse the kit; add only what's new.

## When things go wrong

- `doctor` first. Then the error message: every tool says what's missing and how to fix it.
- "Update the Arc Lab skill": if the skill folder is a git clone (it has a `.git` folder), run `git pull` in it, then
  `npm install` in `<engine>` and `doctor`; if it came as a zip, tell the user to download the new zip and replace the
  folder (their series live elsewhere, so nothing is lost), then, in a new session, run `npm install` in `<engine>` and
  `doctor` (the zip has no `node_modules`).
- Rendering the Day 23 example: voice it with the user's key (`voice --ep examples/day-23/ep01`; the example ships
  without audio), and fetch its 15 Pixabay sounds with their OK (`sfx --ep examples/day-23/ep01 --fetch
  examples/day-23/sfx/picks_ep01.json`; run it again if some are slow to come).
- A shot module error: render a single still of that shot (`stills --ep <ep> --seg A --frames N`) to see it.
- "TOO DARK": raise the chapter's `exposure` or draw a light source into the shot; never lift with a flat gain.
- Captions in the wrong place: make sure the shot returns `faces`/`clues` (screen coordinates via `camPt`), then
  re-render that segment and the overlay.
- The voice changed after the lock: never move the picture; `voice` keeps every line on its locked start and fits
  small changes; a bigger rewrite means re-locking and re-timing the shots (tell the user).
- Slow renders: lower `--procs` to keep the computer usable, or render a segment on a second machine
  (docs/PIPELINE.md).
