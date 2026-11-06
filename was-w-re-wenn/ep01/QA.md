# Was wäre wenn · Episode 1: QA checklist (draft, then final)

## Automatic (must all pass)
- [ ] `final_qa`: frame count = the timeline's, loudness -14 LUFS ± 1 and true peak ≤ -1 dBTP, NO dark frames,
      an audio stream. Pops and frozen stretches listed are looked at by eye (a planned flash or the held end card is fine).
- [ ] `assemble` checks: frames, BT.709 tags, loudness within 0.5 LU of the mix.
- [ ] `stt_check`: the voice says exactly the script (match ≥ 0.97; no repeated or broken words).
- [ ] `mix`: every line has ≥ 5.6 LU of voice over the rest (the mix prints the minimum).

## By eye: EVERY frame (`allframes` sheets; look at all of them)
- [ ] Frame 0 is action; the hook reads in the first 3 s with the sound off.
- [ ] Every face that matters is readable at phone size and inside the safe frame; no caption, card or pill on a face
      or a clue. `out/qa/<file>/safezone.png`: nothing to read in red or under a white button (final_qa: safe frame PASS).
- [ ] No extra or missing limbs, no hands in close-up, no character popping between poses in one frame
      (fast pose changes spread over 6+ frames), no double images from motion blur.
- [ ] Props exist in every shot whose view shows their spot; continuity of clothes, positions and light across cuts.
- [ ] Nothing too dark; every dark shot shows its light source.
- [ ] Captions: 1-4 words per chunk, the coloured word is the right one, in sync with the voice (a chunk lands on its
      word, never a frame early), in the band y 1180-1440 and at most 2 rows; any line final_qa says it moved up
      still reads well where it landed.
- [ ] Cards land in the silences, read for at least 0.9 s, and never stack with captions.
- [ ] The vote: title + pills + "COMMENT 1 · 2 · 3" readable, each pill pops on its spoken option, the end card follows.
- [ ] Sound: every hit on its word or picture moment (CUES.md lists them with frames); beds change with the place;
      nothing voice-like under the narration; the last sound is cut off by the last frame.

## Before APPROVAL 3 (draft -> final)
- [ ] The creator watched the draft with sound and said what to change. Changes made, draft re-checked.
- [ ] Then `arclab final`, and the final passes everything above again (full size).
