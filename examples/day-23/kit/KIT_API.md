# Day 23 kit: KIT_API, the CONTRACT

Owner: the **KIT** builder. Everyone else imports `kit/props.mjs` / `kit/sets.mjs` and never edits them. The KIT
builder writes STUBS for every function below FIRST (within ~10 minutes: correct signature, a plain placeholder shape,
the documented return value), so shot builders can start at once; then it replaces each stub with the real drawing.

**House style:** the engine's cel look: `blob()` for filled shapes (ink underlay + two-tone cel shade, light from the
upper left), `tube()` for limbs/rails/poles, `line()`/`curve()` for detail strokes, flat colours, one soft ink line.
Every function takes `(x, o)`: `x` is a 2D context (or `null`: then only compute and return the points) and
`o = { cx, cy, s, t, ... }` (centre or base point in frame px, scale, episode seconds, the prop's own state).
Pure functions of their inputs (seeded hashes only, never Math.random). No brands, no logos, no real products; no
text except handwriting/signs that belong in the world. Day 23 grit: grime, a smear, a handprint, papers, sprayed
paint are fine; no blood on bodies, no wounds.

## props.mjs

### drawBed(x, { cx, cy, s, layer = 'back' | 'front', blanket = 1 })
The hospital bed. `(cx, cy)` = where a sitter's hips go. Nominal 560 x 300. Draw `layer: 'back'` (frame, mattress,
pillow) BEFORE the character and `layer: 'front'` (blanket over the legs, the front rail) AFTER it.

### drawIV(x, { cx, cy, s, t }) · drawFlowers(x, { cx, cy, s }) → vase top
An IV stand with a drip bag (nominal 360 tall; the tube swings with `t`). Wilted flowers in a vase on a little cabinet
(nominal 160 wide).

### drawCalendar(x, { cx, cy, s, circle = 1 }) → { c23: [x, y], box: [x, y, w, h] }
A wall calendar: MARCH, days 1-22 crossed out, 23 in bold red with a hand-drawn ring (`circle` 0..1 draws the ring on).
Nominal 230 x 270. `c23` is the centre of the 23 (aim a push at it); `box` is a clue rectangle. Works with `x = null`.

### drawDoor(x, { cx, cy, s, t, shadow = 0, rattle = 0, open = 0, col })
A room door with a frosted glass panel. `shadow` 0..1 = a dark figure behind the glass; `rattle` 0..1 shakes the handle;
`open` 0..1 swings it in. `(cx, cy)` = bottom centre; nominal 240 x 520.

### drawWheelchair(x, { cx, cy, s, rot = -0.4 })
A wheelchair on its side (nominal 220 wide).

### drawChainedDoors(x, { cx, cy, s, t, push = 0, fingers = 1, eye }) → { gap: [x, y, w, h], chain: [x, y] }
Double doors chained and padlocked, KEEP OUT sprayed in red with drips. `push` 0..1 bows the gap open; `fingers`
0..1 grey fingers curl through it; `eye` 0..1 a dead eye in the gap (default: on when `push > 0.3`). `(cx, cy)` =
bottom centre; nominal 520 x 600. `gap` is a clue rectangle; `chain` is where to aim a shake.

### drawVehicle(x, { proj, cam, X, Z, yaw, kind = 'sedan' | 'police' | 'bus', col, t, lights = 0, fire = 0, dusty = 0.35 }) → { foot, top, fire }
A vehicle built as 3D boxes (body, cabin, glass, wheels) and drawn in the SET's own perspective (`proj(X, Y, Z)`, Y up =
negative; `cam` = the camera in the same world), so it always sits on the ground: wheels touch the road and a soft
contact shadow lies under it. Only the faces the camera can see are drawn, each shaded by the sun direction. `yaw` =
where the nose points in degrees (0 = straight away from the camera). `police`: black doors, a gold star, a light bar
(`lights` 0..1 flashes red/blue); `bus`: a yellow school bus with a door on its right side; `fire` 0..1: a scorched
wreck. Sizes in world units (a person is ~162 tall): sedan 420 x 176 x 128, bus 1050 x 240 x 285. `foot` = the four
ground corners [X, Z] (keep people out of them; order people against them).

### Episode 2 props
- `drawKeys(x, { cx, cy, s, swing })` → `{ ring, box }`: the police car's keys (a steel ring, three keys, a black fob),
  hanging from (cx, cy). Nominal 110 x 150. `box` is a clue rectangle.
- `drawDutyBelt(x, { cx, cy, s, w, keys = 1, swing, side = 1 })` → `{ keys, box }`: the dead officer's belt across the
  hips (buckle, two pouches, a key clip with the keys at one hip). `w` = half its visible width; `keys: 0` = the clip is
  empty. Shots put it at the hips: `cy = pose.y - 62 * pose.s - 6 * pose.s` for a standing adult.
- `drawDeadHand(x, { cx, cy, s, rot, side, press = 1, col })`: a grey hand pressed flat on glass, seen through it (paler
  pads where it presses). Draw it at a walker's own `hands` points so no hand floats without an arm.
- `drawCrack(x, { cx, cy, s, k, seed, reach })`: a windshield crack from an impact point; `k` 0..1 grows it in place.
- `drawBandanaInside(x, { cx, cy, s, rot, fold = 1 })` → `{ box }`: the bandana flipped inside out mid-leap: SCOUT
  stitched in white thread, "Belongs to" under it, the next line hidden by the folded flap (episode 3). Pause bait.

## sets.mjs

### room = { back(x, { t, flick, circle }), slits(x, { k }), glows(x, { t, flick, door }) } and ROOM = { floor, window, calendar, door, bed, light }
Room 214: dark green walls with grime, a blood smear and a handprint, blinds with one broken slat (daylight behind),
the calendar, papers, a flickering ceiling light (`flick` 0..1 dims it). `slits` draws the daylight bars through the
blinds on an additive GLOW layer; `glows` adds the ceiling panel's bloom, cold light through the door glass and dust in the window beams. Anchors: `ROOM.floor` (y 1420), `window`, `calendar`, `door`, `bed`, `light` (use
`light` or `window` for META.sun).

### hall = { proj(xn, yn, d), draw(x, { t, lamps }), glows(x, { lamps, t }) } and HALL = { vp, far, sideDoor }
The long hallway in one-point perspective toward `HALL.vp`. `proj(xn, yn, d)` maps a point across (-1..1), up/down
(-1..1, floor = 1) and depth `d` (0 near .. 1 the far doors) to frame px: use it to put characters and props on the
floor. `lamps(i)` = brightness 0..1 of ceiling lamp `i` (flicker them). A side doorway under an EXIT sign at depth
`HALL.sideDoor` (0.42). Draw `drawChainedDoors` at the far end yourself (the shot decides how far it pushes).
`glows` (add layer): the lamp panels and their floor pools bloom, the EXIT sign glows green, dust floats under the lamps.

### street = { proj(X, Y, Z), place(X, Z, base = 0.9), sky(x, { t }), town(x, { t }), vehicle(x, v, t), vehicleGlows(x, list, t, { fire }), air(x, t) } and STREET = { hz, f, cam, edge, facade }
Main Street, morning: a dusty sky, shopfronts on both sides (hand-painted signs only), a water tower on the horizon,
litter (a tipped trash can, a suitcase, a shoe, newspaper pages the wind keeps moving). `place(X, Z)` gives a
character's ground point and scale at street position X (left -, right +) and depth Z (near 250 .. far 4000): spread it
into `drawHuman`/`drawCritter`. `vehicle(x, { X, Z, yaw, kind, col, lights, fire }, t)` draws a 3D vehicle (above); a
wreck with `fire` also gets flames, embers and a smoke column. On the add layer: `vehicleGlows` (light bars flashing on
the road, fire glow; `{ fire: false }` in close-ups so a far fire never glows over a near face) and `air` (dust in the
sun, ash drifting down). The horizon is at `STREET.hz` (y 960). People and vehicles share ONE depth order:
`depthDraw` in `ep01/shots/shotsB.mjs` (a person is in front of a car when a side of its footprint has both the person
and the camera outside it) and `clearLane` keeps every walker's path out of every footprint.

### car = { fwdOutside, fwdCabin, fwdBench, fwdGlows, sideOutside, sideCabin, sideSeat, sideDash, sideGlows, sheen } and CAR, strobe(t, weak)
Inside the crashed police car (episode 2), two setups, each split by depth so the dead pressed on the glass sit
between what's OUTSIDE and the CABIN (an opaque frame with the glass cut out):
- **fwd**, from the back seat over your shoulder: `fwdOutside` (Main Street ahead, the white hood), `fwdCabin(x, { dash,
  lightsOn, key, radio })` (roof, pillars, mirror, the dash with gauges, the radio and its coiled mic, the light-bar
  switch panel, the ignition, the steering wheel), `fwdBench` (the front bench seat's back: draw it IN FRONT of you),
  `fwdGlows` (the strobe through the glass, dash and radio light). Anchors in `CAR.fwd`: `glass`, `radio`, `mic`, `sw`,
  `ignition`, `wheel`.
- **side**, from the passenger seat toward you and the driver's window: `sideOutside`, `sideCabin(x, { win })` (the door
  with the armrest, handle and a window crank that turns as `win` 0..1 winds the window down), `sideSeat` (before you),
  `sideDash` (the dash and the wheel in front of your legs: after you), `sideGlows`. Anchors in `CAR.side`: `glass`,
  `sill`, `crank`, `handle`.
- `sheen(x, glassPoly, { k })`: soft reflections on the glass, on a layer above what's pressed against it.
- `strobe(t, weak)` → `[rgb, k]`: the light bar's red/blue flash; `weak` 0..1 dims and stutters it (the battery dying).
- Interior shots: add `grade: { exposure: 1.25-1.35 }` and a warm point light from the glass on the CABIN layer (never on
  the dead officer's layer: it washes his dark uniform out).

## cast.mjs
- `YOU` (makeHuman): dotted hospital gown, head bandage, stubble, bare feet.
- `SCOUT` (makeCritter): scruffy shepherd mix, saddle markings, dark muzzle, red bandana.
- `walker({...})`: makes one of the dead from a normal human description (grey skin, torn clothes, decay, blank eyes).
  `W_NURSE`, `W_FARMER`, `W_JOGGER`, `W_SUIT`; `WALKERS` lists them. Use `expr: 'undead'` (idle) or `'hungry'`
  (turned toward you, jaw open) and `pose: 'shamble'` for their walk.
- `W_COP` (episode 2): the officer who crashed the police car: navy uniform, a peaked cap with a gold band. Not in
  `WALKERS` (episode 1's crowds stay as they were); his duty belt and keys are props (`drawDutyBelt`).
- `CAST` maps ids to models (for `arclab sheets`).

### motes(x, t, { box, n, seed, col, a, r, wind, fall })
Floating particles for an add layer: dust motes that drift and twinkle in light beams, or (`fall` > 0) ash sinking
with the wind. Seeded: the same frame always looks the same.

## Reused (already live; import, never edit)
- Engine backdrops: `sky, stars, moon, sea, ground, hills, fog, rain` (engine/kit/backdrops.mjs).
