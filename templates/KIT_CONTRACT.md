# {{SERIES}} kit: KIT_API, the CONTRACT

Owner: the **KIT** builder. Everyone else imports `kit/props.mjs` / `kit/sets.mjs` and never edits them. The KIT
builder writes STUBS for every function below FIRST (within ~10 minutes: correct signature, a plain placeholder shape,
the documented return value), so shot builders can start at once; then it replaces each stub with the real drawing.

**House style:** the engine's cel look: `blob()` for filled shapes (ink underlay + two-tone cel shade, light from the
upper left), `tube()` for limbs/rails/poles, `line()`/`curve()` for detail strokes, flat colours, one soft ink line.
Every function takes `(x, o)`: `x` is a 2D context (or `null`: then only compute and return the points) and
`o = { cx, cy, s, t, ... }` (centre or base point in frame px, scale, episode seconds, the prop's own state).
Pure functions of their inputs (seeded hashes only, never Math.random). No brands, no logos, no real products; no
text except handwriting/signs that belong in the world. Nominal size at s = 1 is stated for each.

## props.mjs

### drawExample(x, { cx, cy, s, t, open = 0 }) → { top: [x, y], box: [x, y, w, h] }
_What it is, nominal size, every state parameter (0..1 ranges), what each returned point is for (a hand position, a
glow source, a clue rectangle for META.clues)._

## sets.mjs

### setName = { back(x, o), mid(x, o), near(x, o) } and SET_NAME = { hz, floor, ... anchor points }
_What the place is; which parts go on which layer; the anchors shots need (horizon y, floor line, where the door is);
the light source(s) and where they are (for META.sun and points)._

## Reused (already live; import, never edit)
- `kit/cast.mjs`: the cast models (CAST).
- Engine backdrops: `sky, stars, moon, sea, ground, hills, fog, rain` (engine/kit/backdrops.mjs).
