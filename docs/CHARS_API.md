# The character system: original chibi humans, creature companions, and your own rigs

Everything is drawn in code: no images, no AI. Characters are a few simple 3D volumes (spheres, capsules, tubes) turned
about the vertical axis and projected flat, with a soft ink line and a two-tone cel shade (light from the upper left).
One number, **`turn`**, rotates a whole character smoothly: `0` = facing the camera, `+1` = profile facing screen-right,
`-1` = facing screen-left, `±2` = seen from behind. Faces, ears, hair partings, buttons and collars are placed by
longitude/latitude on those volumes, so a head turn is ONE smooth animation, never a pop between drawings.

**Model** = what a character IS (written once per series in `kit/cast.mjs`). **Pose** = what it DOES on a frame
(written in the shots, animated with `take()`). `drawX(null, model, pose)` draws nothing and returns the points.

Check every character on its **model sheet** before any shot uses it (turnaround, poses, every expression):
`python <engine>/arclab.py sheets --ep <series>` → `look/sheets/sheet_<id>.png` + `lineup.png` (relative scale).

## Chibi human: `makeHuman(spec)` + `drawHuman(x, model, pose)`

About 2.2 heads tall. Model fields (all optional; the rest default):

| Field | Values |
|---|---|
| `build` | `kid` · `teen` · `adult` · `broad` · `elder` (a slight hunch). `dims: {...}` overrides any number (headR, torsoH, legLen, shoulderW, ...). |
| `skin`, `blush`, `freckles`, `nose` (`'dot'`/null), `eyeSize`, `eyes` (colour), `brows` (thickness) | |
| `hair`, `hairStyle`, `hairTie` | styles: `short` `messy` `spiky` `bob` `long` `ponytail` `bun` `curly` `buzz` `bald` |
| `top: { type, col, col2 }` | `tee` `hoodie` `jacket` `raincoat` `coat` `sweater` `dress` `vest` (col2 = trim/buttons) |
| `bottom: { type, col }` | `pants` `shorts` `skirt` |
| `shoes: { type, col, col2 }`, `barefoot` | `sneakers` (a sole in `col2`, laces) `boots`. Every foot is ONE shape with a flat sole on the ground and the toe pointing along the character's facing; the leg ends inside it. `barefoot: true` = skin-coloured feet with toes (set `shoes.col` to the skin) |
| `hat: { type, col, col2 }` | `rainhat` `bucket` `beanie` `cap` `captain` |
| `glasses: { col }`, `scarf: { col, col2 }`, `gloves` (colour) | |
| `top.pattern` | `'dots'` (a printed gown or shirt) |
| `stubble` (colour), `bandage` (true) | a shaded jaw; a bandage round the head |
| `torn`, `decay` (true) | ragged hems and stains; hollow cheeks and a bruise. Together with grey skin, `blush: false`, `nose: null`, `eyeSize: 1.1`: an undead walker (see `walker()` in `examples/day-23/kit/cast.mjs`) |

Pose fields:

| Field | Meaning |
|---|---|
| `x, y, s` | Ground point between the feet (frame px), scale (1 ≈ 280 px tall). |
| `turn`, `headTurn`, `nod`, `tilt` | Body yaw; extra head yaw; head pitch (+ looks down); head roll (radians). |
| `pose`, `phase`, `seat`, `stance` | `stand` `walk` `run` `sit` `crouch` `shamble` (a slow, dragging walk); gait position in cycles (`take()` fills it); sit height (0 floor, 50 chair). |
| `lean`, `bob`, `sq` | Body lean (+ forward), vertical bob px, squash/stretch. |
| `armR`, `armL` | Presets: `down` `out` `up` `wave` `point` `hold` `hips` `reach` `shrug` `chin` `cover` `lamp` `hug` `back` `cheer`, or a vector `[ux, uy, uz, fx, fy, fz]`. `armR` is on the screen's right when the character faces the camera. Unset arms swing while walking/running. |
| `expr` | `neutral` `happy` `joy` `worried` `scared` `surprised` `determined` `angry` `sad` `sly` `sleepy` `asleep` `thinking` `undead` (blank eyes, sunken sockets) `hungry` (undead, jaw open, teeth) |
| `blink`, `look: [x, y]`, `talk` | Eyelids 0..1; eye direction; mouth open 0..1 (lip-flap from word timings: see `take`). |

Returns `{ head: [x, y, r], face, hands: [[x, y] armR, [x, y] armL], feet, top, box }`.

## Creature companion: `makeCritter(spec)` + `drawCritter(x, model, pose)`

One four-legged template for dogs, cats, foxes, rabbits, bears and invented creatures. Its face, ears and tail are the
story's emotional camera.

| Model field | Values |
|---|---|
| `body: { len, r }` | half distance chest-hip, chest radius |
| `head: { r, snout 0..1, snoutW, eyeSize }` | snout 0 = flat face (cat), 0.6 = a dog's muzzle |
| `ears: { type, size }` | `floppy` `pointy` `round` `long` `none` |
| `tail: { type, size, up }` | `bushy` `thin` `curl` `stub` `plume` `none`; `up` = carriage (-0.5 hanging .. 0.62 raised, the default); seen end-on it still reads as a tail |
| `legs: { len, w }` | each paw is a small mitten (flat pad, domed top, toe creases); each leg is one smooth tapered shape that comes out from UNDER the body and ends inside its paw (toe creases). The two legs nearest the camera are full colour, the far two clearly darker and slimmer, so four legs always read as four from any angle. Give a tall breed a longer `len` so the legs show below the body. |
| `col: { base, belly, patch, nose, eyes, inner, socks, tongue, muzzle }` | `muzzle`: a darker muzzle colour |
| `marks: { mask, chest, socks, muzzle, tailTip, saddle }` | mask: `left` `right` `both` (a patch over the eye); saddle: a dark back in `col.patch` (shepherd dogs) |
| `fur` | `smooth` `scruffy` (fur tufts on the head, cheeks, chest) |
| `collar: { col, tag, style }`, `brows`, `whiskers` | style `'bandana'`: a printed neckerchief whose triangle hangs down the chest below the chin (visible from the front, three-quarter and side; the knot ends show side-on). Otherwise a ring collar with a tag |

| Pose field | Meaning |
|---|---|
| `x, y, s, turn, headTurn, nod, tilt` | as for humans (s 1 ≈ 190 px tall standing). Look at the camera while walking sideways: `turn: 1, headTurn: -0.6`. |
| `pose`, `phase`, `jump` | `stand` `walk` `trot` `run` `sit` `lie` `jump` `sniff` `beg` |
| `expr` | `neutral` `happy` `proud` `alert` `curious` `worried` `scared` `sad` `guilty` `determined` `angry` `sniffing` `sleepy` `asleep` |
| `earPerk` | -1 flat back · 0 relaxed · 1 perked (or `[left, right]`); default from the expression |
| `wag` (`wagHz`), `tongue`, `talk`, `blink`, `look` | tail wag amount; tongue out; mouth open (barks/panting) |

Returns `{ head, face, nose, mouth, tail, paws, top, box }`.

## Takes: performances as data (`take`)

```js
const scout = take({ x: 330, y: 1680, s: 1.7, turn: 0.55, pose: 'sit', expr: 'curious' }, [
  { t: T(34), expr: 'alert', earPerk: 1, dur: 0.12, ease: 'out' },     // ears shoot up on the word
  { t: T(60), x: 700, pose: 'trot', dur: 0.8 },                       // trots across (x blends; pose switches)
], { seed: 2, talk: { words: [11.03, 11.43, 11.67], end: 12.8 } });    // lip-flap from the line's word onsets
// in draw(L, t): const P = scout(t); drawCritter(L.CAST.x, SCOUT, P);
```
Numbers and vectors blend over `dur` (ease `smooth` `linear` `out` `in` `io` `back`); strings switch at the key time;
arm presets blend as vectors; blinks are automatic (`blink: false` to stop). Walk/run phases fill in by themselves.
Keep pose changes ≥ 6 frames (with motion blur, a faster snap shows a double image).

## Building a series' cast (what Claude does at the look-test step)

1. From the bible, write each character's model in `kit/cast.mjs` (start from the closest example; change build,
   colours, hair, outfit, markings). Give every lead ONE signature colour that no one else wears.
2. Render the sheets; check every angle (turn 0 → 2), every pose the episode needs, every expression. Fix and repeat.
3. Line-up check: relative heights read at a glance; the hero and companion are the brightest, most saturated things.
4. Put them in the real sets and light (the look test, `ep/look/lookshots.mjs`) and show the creator. APPROVAL 2.

## A character the templates can't make: write a custom rig

Copy `engine/chars/custom_example.mjs` (Lumo, a lamp-headed robot on wheels). The recipe:
1. `projector(X, Y, s, turn)` maps character-space points (lx, ly down, lz forward) to `[screenX, screenY, depth]`.
2. Build the body from spheres (circles), capsules (`capsuleParts`) and tubes in character space.
3. Put face features on a head sphere by longitude/latitude, so they slide and foreshorten with `turn`.
4. Draw each group as ONE `blob()` (ink underlay + cel shade), back to front with `painter()` by depth.
5. Return the points shots need (`head`, `face`, `top`, `box`) and accept `x = null`.
In `kit/cast.mjs`: `{ kind: 'custom', draw: (x, P) => drawBot(x, MODEL, P), label }`; the sheet tool draws it too.

## Props and sets (the kit), per series

Write the contract first (`kit/KIT_API.md`: each function's signature, nominal size, states 0..1, returned points),
then stubs in ~10 minutes so shot builders can start, then the real drawing. Use `blob`/`tube`/`line`/`curve` for the
house style, the engine backdrops (`sky`, `stars`, `moon`, `sea`, `ground`, `hills`, `fog`, `rain`) for places, and split
every set by depth (`back`, `mid`, `near`) with its anchor points exported. The example series' kit
(`examples/day-23/kit/`) is a complete, working reference: a hospital bed, a calendar, a door with a shape behind it,
chained doors with states, vehicles; a room, a one-point-perspective hallway and a street with depth placement.

## Originality rules (non-negotiable)

Every character, prop and set is designed fresh for the series. Never recreate an existing franchise's characters,
creatures, logos, costumes or props, even "inspired by". The rig makes it easy to make something new: different
proportions, a signature colour, a distinct silhouette, one memorable accessory.
