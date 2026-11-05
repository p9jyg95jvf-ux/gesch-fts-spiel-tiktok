# Day 23: the series bible (SECRET: never post this file)

> **This is the copy that ships with the skill, written from episode 1 alone.** Day 23 is still running, so everything
> after episode 1 (the answers, the later laws, cast and clues, the finale) is left out or marked
> `[SECRET: hidden ...]`. Your own bible keeps its secrets in exactly those places: write them out in full
> (`templates/SERIES_BIBLE.md`), so every episode can plant toward them.

The one source of truth for every episode. If a planning file disagrees with this file, this file wins. If a published
episode disagrees with it, the episode wins and this file gets fixed (and `CANON.md` records why).

## 1. The promise (what the viewer gets, every episode)

- **Premise in one line:** you wake from a coma on day 23 of the end of the world, in a small town where the dead walk.
  Nobody came to wake you, and a scruffy dog knows the way out.
- **Who "you" are:** the viewer IS the hero, told in the second person, present tense ("You wake up. Something is at
  the door.").
- **The page:** Instagram **@day23.series**, "Day 23 · Zombie Story · You Decide".
- **The loop:** every episode ends on a 3-option vote; the most-voted option is what happens next. Say it plainly in
  the caption of every post: "The votes decide Episode N+1."
- **The feel:** grim, quiet, survival. Dread first, gore never: the dead are frightening by number and by silence,
  not by blood.

## 2. The laws of this world (what is ALWAYS true)

1. **RULE #1 · STAY UNSEEN.** One of the dead seeing you is enough: when one turns, they all turn. (Shown: E1 L09, the
   RULE card. Used in action: the whole street turns.)
2. **The dead push; they don't open.** No handles, no latches, no climbing. A shut door holds until enough of them lean
   on it. (Shown: E1 L03-L04, the chained doors bowing.)
3. **The dog leads.** It barks to call you, then goes first, and you follow. (Shown: E1 L05-L07, the side doorway and
   the stairwell.)
4. **The story clock only runs forward.** The HUD's DAY number is the story clock; every episode starts on a new day or
   later the same day, never earlier. (Shown: E1 HUD "DAY 23".)
5. [SECRET: hidden: the laws added for later episodes. A law is added when an episode needs it, planted one beat
   before it's used, and stated on a RULE card.]

## 3. The cast

| Who | Role | Look (kit/cast.mjs id) | Voice (VOICES.json) | Wants | Never |
|---|---|---|---|---|---|
| You | the hero: a patient who slept through the end of the world | `YOU`: hospital gown with dots, head bandage, stubble, bare feet | narr (the narrator speaks for "you") | to get out alive | is never bitten |
| Scout | the companion: a scruffy shepherd mix with a red bandana. The emotional camera: ears and tail show what it feels in every shot | `SCOUT` | none (barks only) | to get you out | dies (see 7. Never) |
| The dead | the threat, by number. They act through sound and silence, not speeches | `W_NURSE`, `W_FARMER`, `W_JOGGER`, `W_SUIT` (+ new walkers from `walker()`) | none (groans only) | | run (they shamble), open doors (law 2) |
| The Suit | the first one who turns (E1: far up Main Street, its back to you) | `W_SUIT` | none | | is named on screen |
| [SECRET: hidden] | the characters of later episodes | | | | |

House rules for characters:
- A character who speaks is ON SCREEN, readable, front or three-quarter, while they speak (or the narrator relays them).
- No close-up human hands; no extra arms; props held with the character's own arms.
- Scout makes at least 4 visible choices of its own per episode.
- The dead are drawn grey and torn, never gory: no wounds, no blood on bodies, no eating on screen.

## 4. The mystery spine

- **The big question (the finale):** [SECRET: hidden: the question and its answer, written out in full in the
  studio's copy, so every episode plants toward it.]
- **Reveal roadmap:** one big answer per episode, one NEW mystery or hook per episode.

| Episode | Big answer | New mystery / hook |
|---|---|---|
| 1 | you slept 23 days; the town is dead; the dog knows the way out | the dead have seen you: the police car, the bus, or back inside? (the vote) |
| 2+ | [SECRET: hidden: one big answer each, ending on the finale] | [SECRET: hidden: one new mystery each] |
| Finale | [SECRET: hidden] | |

## 5. The clue plan (plant early, pay off later)

Episode 1's own set-ups, each paid off inside the episode or by its vote:

| Clue | Planted (ep, moment) | Paid off (ep, moment) | Notes |
|---|---|---|---|
| the rattling handle and the shape behind the frosted glass | E1 0:00 | E1 0:12, the chained doors | the threat is real, and it's close |
| one figure far up the road, its back to you | E1 0:22 ("Almost.") | E1 0:23, RULE #1: it turns, then all of them | the clip-able moment |
| the police car, its light bar still flashing | E1 0:19, every street shot | E1 0:27, vote option 1 | the battery works: teach before you vote |
| the yellow school bus in the right lane | E1 0:19, every street shot | E1 0:27, vote option 2 | a place to hide |
| [SECRET: hidden: the clues planted for later episodes and the finale] | | | |

A good payoff was on screen 45-60 s (or 1-2 episodes) before it pays off, and nobody pointed at it.

## 6. Vote rules

- Three options at most. Each is a physical verb about what's in the last frame, each with a felt stake.
- Teach before you vote: every option must already make sense from what the episode showed (E1: the police car and the
  bus are in every street shot before the vote; "back inside" is where you came from).
- Aim for a near-even split (55/45 is a great vote; 90/10 means one option was a trap).
- Never "give up" / ending the story as an option.

## 7. Never

- Never use real brands, real people, or anyone else's characters, names, logos, music or footage. Day 23 owes nothing
  to any existing zombie show: original town (Ashby Creek), original cast, original rules.
- Never confirm a fan theory; pinning a good guess with "We're not saying anything 👀" is the limit.
- No spoilers in the cover, title, caption or pinned comment.
- No gore: no wounds, no bites on screen, no blood on bodies (a smear on a wall is the limit).
- Never kill Scout.

## 8. Look and sound

- **Palette:** hospital = sick green-grey under dying fluorescent light (`threat` grade); outside = a washed-out dusty
  morning (`golden`, desaturated, contrasty). Strong red is rare and saved for what the eye must find: the dog's
  bandana, KEEP OUT, the police car's light bar.
- **Colour script per place:** hospital = threat, street = golden (desaturated), night = night, memory = memory (ONE
  flashback look only).
- **Home setups:** 1 your room wide (bed, door, calendar); 2 the long hallway (one-point perspective); 3 Main Street
  from the middle of the road; 4 a punch-in on one walker far away; 5 Scout close at its eye level.
- **Voices:** one narrator (series/VOICES.json). Same voice every episode.
- **Sound:** hum and dread pads inside; wind and the moans of the dead outside; every hit on a word or a picture
  moment; the dead's moans cut off by the last frame.
