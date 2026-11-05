# The craft: how to write and stage an episode people finish, share and vote on

These rules come from a vote-driven, code-animated story series and from taking apart its best episode and its worst
one, frame by frame. They are written for the skill to follow; the creator can overrule any of them.

## The story engine (every episode)

1. **Frame 0 is mid-action, with sound.** The threat (or the problem) is already in frame. No title card, no recap,
   no slow push on scenery, no talking heads. The first line starts on frame 0: 7 words or fewer, second person,
   present tense, with one red "stake" word ("You're carrying it. **Bare-handed.**").
2. **Credit the audience early.** From episode 2 on, the "YOUR VOTE" card lands within ~4 s ("Most of you said:
   follow the prints"), as a designed card over moving action, never a narrated stat over a frozen frame.
3. **One wide by ~6 s that carries the goal, the threat and the odds** in a single image (you, tiny; the danger, big;
   a number: a distance, a battery, a clock).
4. **A ticking number from ~2 s to the end** (a clock, a distance, a battery) on the HUD. Plant the payoff number
   silently 45-60 s before it pays off and never mention it until the payoff line.
5. **Something happens every ~3 s; a real story turn every ~7 s.** The threat changes TYPE about every 20 s (a chase,
   then a human plan, then the thing you're saving hurts you, then silence, then a trap), each closer to the hero.
   Put one short breather (a fix, then relief) just before each climax.
6. **One clip-able spectacle at ~60-65% of the runtime**, 3-4 s, full frame, then 1.5-2 s with no voice (only a
   ringing tone or the sea). Hide one pause-bait detail inside it and point to it in the pinned comment.
7. **Fair surprises only.** Every twist pays off something the viewer already saw. The hero survives by a CHOICE
   (keeping a rule, protecting the companion) or by the companion's choice, never by luck.
8. **The cliffhanger is big, bright and on screen long enough to read.** Then the vote, then the end card, together
   under ~7 s, with life still moving underneath. A sound cuts off on the last frame.

## Narration

- **Second person, present tense, all the way through** ("Your arm goes numb. It slips."). Past tense only for the
  reveal of what already happened.
- **Very short sentences: 4-5 words on average, 10 at most.** About half are fragments. Rhythm devices:
  countdown triplets ("Three percent. Four. Nine."), antithesis pairs ("It could get away. It doesn't."), one-word hits.
- **Show, don't explain.** Almost every line names what is on screen at that moment, and the caption word sits over
  the object. At most ~3 explaining lines per episode, each 12 words or fewer, each AFTER the picture showed the evidence.
- **Concrete nouns** (prints, lamp, rope, phone, collar). Save abstract words (trust, fear) for the one emotional beat.
- **The narrator never explains a mystery.** State the facts, move on; the comments argue about it.
- **At most ~3 words per second.** Write fewer words rather than speeding the voice up. Never time-stretch a rewritten
  line into an old slot: re-record and re-time.
- **One narrator with weight** (calm, grave, trailer-like). Characters speak only when they're on screen and readable.

## Picture

- **A new picture every 1.5-2.5 s; nothing held longer than 3.5 s before the vote.** Every shot moves: a push, a
  drift, a whip with motion blur. Aim for ~5 shots in the first 10 s.
- **Build each episode from 4-5 "home" setups** (the hero from behind on the move, the companion's face close, a
  macro on the key object, a wide for the odds) and return to them, so viewers are never lost.
- **Inserts are reactions, not illustrations:** object → a face reacting → the same object, closer. Never cut to an
  object that is only being talked about; never 3+ different inserts in a row; a held insert needs at least 1.5 s.
- **One clear picture per line; cut on action, not on words**; cut 1-4 frames before the line's first word.
- **The companion's face is the emotional camera.** Ears, eyes, tail: what it feels, in every shot it's in. It makes
  at least 4 visible choices of its own per episode, and it is never really hurt.
- **The antagonist acts through objects and events** (a print, a sound, a light, a message, a trap), seen only as a
  silhouette until its reveal; it acts on screen at least twice. Its things never turn up where it couldn't go.
- **Light flatters simple drawings:** rim light, silhouettes, glows, one or two light colours per scene, and a colour
  script that changes with the story. But NOT too dark: every dark shot shows its light source.

## Captions and on-screen text

- Bold condensed caps, white with a heavy outline; 1-4 words per chunk, at most 2 rows on screen (a line with more
  chunks pages: chunks 3-4 replace 1-2), clearing on the next sentence. **Yellow** = the key noun / new information; **red** = danger or the twist word; about one coloured word
  per chunk. Numbers as digits.
- ONE text layer at a time: a caption, OR a card, OR the vote. Keep the HUD to day, time, place and the active rules.
- No caption on a face or on a clue (the overlay moves captions automatically when shots report `faces`/`clues`).
- **The safe frame** (`docs/SAFE_ZONE.md`; final_qa fails a file that breaks it): every word and every face inside
  x 120-960, y 270-1480; from y 900 down, left of x 860 (the like/comment rail); captions in the band y 1180-1440,
  at most 640 px wide; below y 1480 background only (the app's name, caption and pill sit there). Frame shots so the
  face that matters is ABOVE the caption band while its line plays: then the captions stay in their band instead of
  moving up.

## The vote

- **Two options (three at most)**, each a physical verb about what's in the last frame, each pulling on a different
  instinct (information vs. protecting someone). The vote's object was planted earlier in the episode.
- **Say it three ways:** spoken ("Wake her, follow the prints, or bark? Comment one, two or three."), a big title, and
  numbered pills with one-line tags that pop as each option is spoken. Then COMMENT 1 · 2 · 3.
- **Teach before you vote:** every option must already make sense from the episode itself.
- A near-even split (55/45) is the sign of a good vote. Next episode, credit the winner within 4 s.

## What made the worst episode fail (don't)

1. **A talk episode:** 80 s of characters explaining backstory, ~30 new facts. → Every beat is something happening NOW.
2. **Lines from characters the viewer can't see saying them** (backs of heads, off screen). → On screen and readable, or the narrator relays it.
3. **A riddle chain** (A → "Mine." → "I gave them to him" → never said: so he took the photo). → Say the payoff plainly; one inference per beat.
4. **A new picture for every noun** (7 pictures in 8 s, a 4-frame flash). → One clear picture per line.
5. **Abstract inserts carrying the story** (notebooks to read, relabel stamps). → If the words say "a boot", show the boot, big and centred.
6. **Stacked text** (HUD + name tag + caption + stamp at once). → One text layer at a time.
7. **Opening on the past** (4 s of last episode's numbers over a frozen frame). → Frame 0 is action; stats as a quick card over motion.
8. **A parked cast** (37% of the runtime near-static). → Every shot has a body doing something with a goal.
9. **A flat or swapped voice** (cheap TTS for characters, a new narrator). → One good narrator, the same every episode.
10. **Characters built off-model on the wrong rig.** → Every character approved on its model sheet, at 1:1, in the real light, before any shot uses it.
11. **Six different flashback looks; recaps of earlier episodes.** → ONE memory look per series, used rarely; earlier episodes are not new content.
12. **A small, dark, static ending; story changed after picture lock; posted unwatched.** → Big bright cliffhanger, no story changes after the voice lock, and nobody posts a final they haven't watched end to end with sound.

## Process lessons

- Write the shot plan AFTER the voice exists (the timeline is the grid everything syncs to), and lock it.
- QA must ask "can a stranger say what just happened?", not only measure pixels.
- Shared props have ONE owner and ONE module (two builders once drew the same net differently).
- One look for the whole episode: builders share the kit, the colour script and the brief.
