# Changelog

Update with `git pull` in the skill folder (or ask Claude to "update the Arc Lab skill"), or download the new zip.

## 1.0.2 (1 Nov 2026)

A small free update. Your series folders aren't touched.
- **The Day 23 example now stops at episode 1.** Day 23 is still running, so its bible, facts file, beat sheet and
  notes in `examples/day-23/` now hold only what episode 1 showed. Anything about later episodes is left out or
  marked `[SECRET: hidden]`. Nothing in the engine changed.
- The examples in the bible and facts-file templates (`templates/SERIES_BIBLE.md`, `templates/CANON.md`) use episode 1
  only too.

## 1.0.1 "Lessons" (1 Nov 2026)

A free update for everyone who bought the skill. Your series folders aren't touched.
- **Six written lessons** in `lessons/`, one per step: install and check, your first idea (the bible and the rule
  card), directing the script, voice and look test, reading a draft and giving notes (with real notes from making Day
  23), and posting, the vote and the next episode.
- **Fixed:** after you re-recorded a line on a locked episode, the captions (and the sound effects and music cues
  pinned to words) still followed the old take's word times. They now follow the newest take.
- **Fixed (Mac):** the setup check for a series (`doctor --ep`) wrongly said "engine.mjs points at this engine: FIX" on
  every Mac, and re-linking didn't clear it. It now passes.
- **Updating with the zip:** after you replace the folder, start a new Claude Code session and ask Claude to "run the
  Arc Lab setup check". Replacing the folder removes the drawing library, and the check puts it back (with your OK).
- **Mac:** macOS 13 (Ventura) or newer. The current Node.js and Homebrew no longer support macOS 12.
- **Clearer "You'll need":** a paid Claude plan (Pro or Max) or a pay-as-you-go Claude API key (with a key, use the
  `claude` terminal app).
- **Help links** in the README and install guide: the setup guide at https://arclabstudios.com/start.html, #help on our
  Discord, and contact@arclabstudios.com.
- The README now describes the original score (made in code) and the sound effects (a built-in code library, plus free
  Pixabay sounds if you want them) separately.

## 1.0.0 (30 Oct 2026)

The first release.
- One command for every step (`engine/arclab.py`): doctor, new series and episodes, voices (your ElevenLabs key),
  model sheets, look test, shot plan, stills, overlay, original score, sound mix, draft, final, QA, covers, sounds.
- Original characters, sets and props drawn in code (humans, animals, custom rigs), with lighting, motion blur, bloom
  and a colour script.
- Captions, HUD, story cards, the vote and the end card, all inside the phone's safe frame (`docs/SAFE_ZONE.md`).
- Original music made in code (`score.json`), a synth sound library, and optional Pixabay sounds fetched into your
  own project with their licences logged.
- Checks on every draft and final: frame count, loudness (-14 LUFS), dark frames, glitches, the safe frame, and
  every frame on contact sheets.
- A complete example series, "Day 23" (episode 1), and templates for everything.
