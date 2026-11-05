# Arc Lab Series Skill (v1.0.2)

One Claude Code skill: your idea in, a voted, animated story series out. Claude writes the series bible and each
episode, records the voices (your ElevenLabs key), designs and draws original characters and sets in code, builds and
checks every shot, mixes the sound, and hands you a finished episode plus its publishing pack. You approve three
checkpoints: the script, the look, the draft. Your audience votes; the next episode follows the vote.

## Quick start: from install to your first draft

**You'll need:** Claude Code with a paid Claude plan (Pro or Max) or a pay-as-you-go Claude API key (with a key, use
the `claude` terminal app; with a plan, the desktop app's Code tab works too), an ElevenLabs account for the voices,
and Windows 10/11 or macOS 13 (Ventura) or newer. No GPU, no AI video: every picture is drawn in code.

1. **Put the skill in place** (`INSTALL.md`): the file must end up at `.claude/skills/arc-lab-series/SKILL.md` in
   your home folder, exactly one `arc-lab-series` level deep. Easiest: open Claude Code and type "Unzip the
   newest arc-lab-series zip from my Downloads into my Claude skills folder (replacing any old arc-lab-series folder),
   so the file ends up at .claude/skills/arc-lab-series/SKILL.md in my home folder". Or clone the repo there
   (`INSTALL.md` has the commands).
   **Then start a new Claude Code session** so it sees the skill.
2. **Let Claude set it up.** Make an empty folder for your series, open Claude Code in it and type:
   > set up the Arc Lab series skill

   Claude runs the doctor, installs what's missing with your OK (Node.js, Python packages, ffmpeg, the drawing
   library), and stops when it says **"ready to make episodes"**. Check it yourself any time: on Windows (PowerShell)
   `python "$HOME\.claude\skills\arc-lab-series\engine\arclab.py" doctor`, on a Mac
   `python3 ~/.claude/skills/arc-lab-series/engine/arclab.py doctor`.
3. **Give it your idea**, one or two sentences:
   > Make me a series: a kid and their robot run a night-shift repair shop, and viewers vote each episode.

   Claude makes the series folder and asks you to paste your ElevenLabs key into its `.env` file (it never prints or
   shares the key).
4. **Approval 1, the words:** Claude writes the series bible and episode 1's script. Read it; say OK or what to change.
5. **Approval 2, the look:** Claude records the voices, then shows you the characters (model sheets) and a few
   look-test stills. OK them or ask for changes.
6. **Approval 3, the draft:** Claude builds every shot and the captions, an original score made in code, and the
   sound effects (a built-in library made in code, plus free Pixabay sounds if you OK them), checks every frame (and
   that nothing sits under the app's buttons), and sends you a small draft video. This is the longest step: expect a
   few hours of Claude working for a 30-40 s episode, most of it without you; each draft render takes minutes.
7. **Final and posting:** after your OK, Claude renders the full-size final, makes cover options and writes the post
   text (caption, poll, pinned comments). You post it; the votes decide episode 2.

Stuck? Run the doctor first, then ask Claude: every tool says what's missing and how to fix it. Still stuck? The
setup guide is at https://arclabstudios.com/start.html; ask in #help on our Discord (the button is on your order page)
or email contact@arclabstudios.com.

## Read more

- **The lessons, in plain words, one per step:** `lessons/` (1 Install and check, 2 Your first idea, 3 Directing the
  script, 4 Voice and look test, 5 Reading a draft and giving notes, 6 Posting, the vote and the next episode).
- **Install details and troubleshooting:** `INSTALL.md`.
- **What Claude follows:** `SKILL.md`.
- **The method:** `docs/CRAFT.md` (story), `docs/PUBLISHING.md` (posting and the vote loop), `docs/SAFE_ZONE.md`
  (keeping words and faces clear of the app's buttons).
- **The engine:** `docs/LOOK_API.md`, `docs/CHARS_API.md`, `docs/PIPELINE.md`.
- **A complete example:** `examples/day-23/` ("Day 23", episode 1: a 37.6 s survival-story episode made with the
  skill: you wake from a coma, a dog leads you out, the dead turn). It ships without audio: Claude can voice it with
  your key and fetch its sounds if you want to render it.
- **What changed:** `CHANGELOG.md`. **Licence:** `LICENSE.md` (use it for anything you make; don't resell the skill).

## What's inside
```
SKILL.md INSTALL.md LICENSE.md README.md CHANGELOG.md VERSION
lessons/     01-06: install, first idea, script, voice and look, draft notes, posting and the vote
docs/        CRAFT.md PUBLISHING.md SAFE_ZONE.md LOOK_API.md CHARS_API.md PIPELINE.md
engine/      arclab.py (the one command) · look/ (render, light, grade, camera) · chars/ (human, critter, custom rig,
             takes, model sheets) · kit/ (backdrops) · pipeline/ (segment renderer, overlay, covers) · py/ (voice,
             speech-to-text check, original score, synth sound library + optional Pixabay fetch, mix, assemble, QA,
             every-frame sheets, doctor) · safezone/ (the safe-frame checker) · fonts/ (OFL) · package.json · requirements.txt
templates/   series bible, canon tracker, voices, cast/props/sets kit, episode beats, story, episode config, brief,
             kit contract, sound plan, look test, shot module, post text, QA checklist
examples/    day-23/ (the test series)
```
