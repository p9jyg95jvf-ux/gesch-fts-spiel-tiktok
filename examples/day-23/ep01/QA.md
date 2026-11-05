# Day 23 · Episode 1: QA checklist (draft, then final)

**Status (27 Oct 2026): FINAL.** Draft 6 approved by the creator ("The music works. Draft 6 is approved"). The final
`out/day23_ep01_final.mp4` (1080x1920, 37.6 s, 16.2 MB) and the phone copy `out/day23_ep01_phone.mp4` pass final_qa:
1128/1128 frames, -14.1 LUFS, true peak -1.3 dBTP, 0 dark frames, 0 pops, 0 frozen stretches, BT.709 tags; every frame
looked at (out/qa/day23_ep01_final/).

## Automatic (must all pass)
- [x] `final_qa`: 1128/1128 frames, -14.0 LUFS, true peak -1.3 dBTP, 0 dark frames (darkest: mean luma 47.6 at f92,
      the calendar under a flicker), audio stream present, 0 single-frame pops, 0 frozen stretches.
- [x] `assemble` checks: frames, BT.709 tags, loudness within 0.5 LU of the mix (delta 0.0).
- [x] `stt_check`: 77/77 words match the script.
- [x] `mix`: voice over the rest ≥ 5.6 LU on every line (min 5.9 LU; FX ducked under L00, L04, L05, L09).

## By eye: EVERY frame (`allframes` sheets; look at all of them)
- [x] Frame 0 is action (the handle rattles, the shape behind the glass); the hook reads with the sound off.
- [x] Every face that matters is readable at phone size and above y 1540; no caption, card or pill on a face or a clue
      (A06: the clue rect covers the whole upper door, so the caption sits above KEEP OUT and the eye).
- [x] No extra or missing limbs, no hands in close-up, no pose pops, no double images on the punch-ins.
- [x] Props exist in every shot whose view shows their spot; vehicles and walkers drawn in one depth order.
- [x] Nothing too dark; every dark shot shows its light source (the ceiling lamps, the blinds, the stairwell edge).
- [x] Captions in sync; nothing in the bottom 380 px; everything inside x 140-940. A caption ends on a cut that comes in
      its line's last 0.25 s ("Almost." no longer spills into B05).
- [x] The RULE #1 card lands in the silence before L09 and stays inside the frame while it slams in. Its caption ("One
      turns.") waits for the card and lands with the walker's turn (f738).
- [x] The vote: title + pills + "COMMENT 1 · 2 · 3" readable, each pill pops on its spoken option (f820/865/903), the
      end card follows (f1035).
- [x] Sound: every hit on its word or picture moment (out/CUES.md); hum + dread inside, wind + moans outside; the moans
      cut off by the last frame.

## Fixed during QA
- The calendar ring didn't draw (an arc sweeping past a full turn draws nothing); now two strokes, and the push ends with
  the 23 centred.
- Scout too small in B02 (s 0.5 → 0.62, closer camera); the far walker in B04 hidden by the bus (moved in front, the
  bus and cars pushed back); the walker's turn in B05 waited until the card shrinks (f731); B06 crowd too small
  (zoom 1.15 → 1.9); B08 POV raised so the crowd fills the frame under the end card.
- Engine: card and vote-title slams start smaller, so they never leave the frame.

## Round 2 (the creator's notes on draft 1: clipping, the dog's legs, floating vehicles, walkers through cars, glow)
- **The dog (engine critter rig):** each leg's tube ended in a round cap that stuck out under the paw ("two circles",
  and with four legs it read as six). Legs now end inside the paw, taper, get toe creases, and the far pair is a shade
  darker. The muzzle is a crisp oval that reaches forward (not a ball); the back marking caps the back from any angle; a
  tail seen end-on hangs as a tail (never a ring or a star); a shepherd carries its tail low (`tail.up`).
- **People (engine human rig):** arms are layered by where the ARM is (shoulder side + reach), so arms reaching forward
  are never hidden behind the body (no floating hands). Stubble only on the side of the jaw that faces the camera,
  fading in softly (it showed through the back of the head as a dark band). Hair gets strand lines from every side
  and a sheen, so the back of a head reads as hair, not a helmet.
- **Vehicles:** rebuilt as 3D boxes in the street's own perspective (kit `drawVehicle`): wheels on the road, a contact
  shadow, only the faces the camera can see, shaded by the sun. The flat side-on cut-outs floated above the road.
- **Walkers vs cars:** one depth order for people and vehicles (a footprint test + a topological sort), and every
  walker's lane is moved once so its path never enters a footprint. Nobody walks through or is drawn over a car.
- **Feet sliding:** you walk INTO the hallway and out into the street at the pace of your steps; the dead only start to
  walk after they turn, at a speed that matches their shamble, and stand when they stop. The dog walks into the dark
  stairwell (the dark covers it) instead of fading out.
- **Props:** the shape behind the door glass is a soft head and shoulders with two palms pressed flat and breath fog
  (it read as a profile icon); fingers grip the door edge side by side with nails (they read as springs); a real
  wheelchair whose wheel still turns; a water tower on the horizon.
- **Glow and detail:** the ceiling panels bloom, the EXIT sign glows green, dust floats in every light beam, cold light
  through the door glass; on the street the police light bar still flashes red and blue on the road, a wreck burns far
  up the street (flames, embers, a smoke column), ash drifts down, newspaper pages blow along the road, a tipped trash
  can and a suitcase.

## Round 3 (the creator: "the dog still has 6 legs")
- From behind and at an angle all four legs showed side by side at the same brightness, the low tail hung between the
  hind legs like a fifth leg, and the engine's shadow-side light pass printed leg-shaped stripes onto the belly.
- Fixed in the engine: each leg is ONE tapered shape that comes out from under the body (no joint circles, no leg tops
  on the belly); the two legs nearest the camera are full colour and the far two clearly darker, chosen by the
  shoulders/hips so it never flips mid-stride; the shadow-side pass now reads a softened silhouette (no stripes under
  any body, dog or person); the bandana only shows when the throat faces the camera; a sitting dog's near thigh sits in
  front again. Scout: longer legs (a shepherd stands tall) and a tail carried mid-high that sweeps to one side when
  seen from behind. Checked at every angle and in every shot the dog is in (B01, B02, B03, B07).

## Round 4 (the creator: "the cut at 30-33 s is bad, people vanish")
- The vote shot (you + the dog) cut at 31.7 s to a point-of-view shot of the crowd without you, so both of you
  disappeared mid-vote. Now the vote and the end card are ONE continuous shot: you glance back over your shoulder on
  "Comment one" and turn to face the dead at 32.8 s, the dog turns with you, and the crowd keeps closing in (slowing as
  it nears, its steps following the distance covered so the feet never slide).

## Round 5 (the creator: "make the feet better and remove the two circles from all legs")
- Every person's leg ended in a round cap that stuck out below the shoe, so each foot read as two circles. Now the leg
  ends inside the foot, and the foot is one shape (shared `footPath` in the engine rig): a flat sole on the ground, a
  domed top, the toe pointing the way the character faces. Shoes get a sole and laces, boots a heel, and your bare feet
  get toes (`barefoot: true`). The dog's paws use the same shape: a flat pad, a domed top and toe creases.

## Round 6 (the creator: "add some music")
- An original score (score.json, rendered by the new engine module `score.py`; no downloads, no licences): D minor,
  100 BPM. A low drone, a cold string pad and a lonely music-box bell in the hospital (dissonant at the chained doors);
  a plucked-bass pulse when the dog leads you out; wide strings and a falling bell line over the empty street; dead
  silence on "Almost."; a rising cluster through RULE #1 into a huge low hit on "all of them"; drums, a driving bass
  (D, Bb, G, A) and lifting strings under the vote, cut dead on the last frame. It sits 9-15 dB under the voice and
  full under the end card; the old dread pad and swell sounds were removed (the score replaces them). Mix: -14.1 LUFS,
  voice over the rest min 5.9 LU.

## Round 7 (after the first final: Scout's red bandana was missing)
- Found while making the page's profile picture: the round-3 leg fix had moved the bandana up under the chin, where the
  head hid it in every shot (and side views drew a plain collar ring instead). The bandana matters: it's how viewers
  know the dog at a glance. Engine fix: the bandana's triangle now hangs down the chest below the chin with a fold
  and a small print, its knot ends show side-on, and no ring collar is drawn on a bandana dog. The creator chose to fix
  it before posting; the final was re-rendered.

## Round 8 (the creator: "the man and wheelchair disappear" at 9.4 s)
- The hallway shot cut to a dolly toward the doors with you and the wheelchair gone. Now A04 is ONE shot (205-375):
  you stop and look round, then walk on down the hall toward the doors (placed in the hallway's perspective, so your
  size and steps match the floor); the camera follows behind you and the wheelchair slides out of frame as it passes.
  Captions keep off your body (it is in the shot's clues; the overlay now picks the nearest clear spot anywhere between
  the HUD and y 1540 when the bands next to an obstacle are blocked).
- Checked every other cut for the same problem: "Then all of them" (B06) looked down the street from where you stand
  but drew neither you nor the dog. Now it's over your shoulders, you on the left, the dog on the right, the street
  between you; 12 more walkers fill the street ("all of them"); B06 and the vote share one crowd walk, so every walker
  is in the same place on both sides of the cut, and you and the dog stand where you are in the vote. The other cuts
  are close-ups or a change of place (the calendar, the doors close up, the far walker), where nobody vanishes from
  the same framing.

## Safe frame (27 Oct, a new rule for every 9:16 video; `docs/SAFE_ZONE.md`)
- The posted final predates the rule: its HUD started at y 252 (under the app's header), the vote pills reached x 890
  (under the like rail) and "COMMENT 1 · 2 · 3" sat at y 1530, and one caption sat below y 1480 in the hallway.
- The skill's overlay now follows the safe frame. ep01 re-checked in a throwaway test render (the episode's own
  `overlay/` and finals were left as they are, because the Part 1 re-cut reads them): final_qa PASS, safe frame PASS:
  no overlay pixel outside it on any of the 1128 frames, every face inside it.
- Noted, not failed: 8 of the 10 caption lines move up (inside the safe frame) to clear your face or body, because the
  shots put them in the caption band; the clue centres at f0-91 (the door), f205-232 (your back) and f776-816 (your
  shoulder) are outside it, none of them something to read. A new episode frames the face above the band instead.

## Before APPROVAL 3 (draft -> final)
- [x] The creator watched the draft with sound and said what to change (6 rounds above). Changes made, draft re-checked.
- [x] Then `arclab final`, and the final passes everything above again (full size).
