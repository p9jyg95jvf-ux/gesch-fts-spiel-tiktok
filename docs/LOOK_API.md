# The look engine: how a shot is drawn and finished

Every frame of an episode goes through the look engine (`engine/look/`). You draw each shot as a few DEPTH LAYERS with
plain canvas code; the engine does the rest:
- **motion blur per layer** (sub-frame accumulation, a shutter angle per layer);
- **2x supersampling** with a linear-light downscale (clean, gamma-correct edges);
- **the key light:** rim light, shadow side, long soft cast shadows, light shafts, bloom (never on faces), point lights;
- **the colour script:** the grade changes chapter by chapter (episode.json "grade");
- **depth haze and depth of field** (never on subjects);
- **the finish:** filmic S-curve, split tint, vignette, a 1-level dither (no grain);
- **camera helpers:** push-in, punch-in, whip-pan with blur, decaying shake, handheld drift.
It writes a picture-only **plate** (no text; the overlay adds the words later).

Import everything from your series' `engine.mjs` shim: `import { camMatrix, applyCam, ... } from '../../engine.mjs';`

## A minimal shot

```js
import { camMatrix, applyCam, camPt, push, shake, drift, contactShadow, glow, take, drawCritter } from '../../engine.mjs';
import { BUDDY } from '../../kit/cast.mjs';
import { hill, HILL } from '../../kit/sets.mjs';
const T = (f) => f / 30;
const on = (L, n, M) => { if (!L[n].on) return false; applyCam(L[n].x, M); return true; };
const buddy = take({ x: 540, y: 1560, s: 1.6, turn: 0.4, pose: 'sit', expr: 'curious' }, [{ t: T(40), expr: 'alert', earPerk: 1, dur: 0.15 }]);

const A01 = {
  id: 'A01', t0: 0, t1: T(90),                       // seconds: the shot's cut times (also pick the colour-script chapter)
  motion: 'medium',                                  // sub-frames: 'fast' = 8, 'medium' = 4, 'still' = 1 (or sub: N)
  layers: [                                          // back to front: [name, options]
    ['SKY', { dof: 1.5 }],                           // far: soft
    ['GROUND', { shutter: 90 }],                     // camera-tracked ground: SHORT shutter (no mush)
    ['CAST', { subject: true }],                     // never blurred or hazed; rim, shadow side, keeps its colours
    ['GLOW', { blend: 'add' }],                      // light: lamps, eyes, sparks
  ],
  draw(L, t) {                                       // called once per SUB-FRAME at time t: a pure function of t
    const [dx, dy, dr] = drift(t, { amp: 4 }), [sx, sy, sr] = shake(t, T(40), { amp: 8 });
    const cam = { zoom: push(t, 0, T(90), 0.04), cx: 540, cy: 1300, dx: dx + sx, dy: dy + sy, rot: dr + sr }, M = camMatrix(cam);
    on(L, 'SKY', camMatrix(cam, 0.3)) && hill.back(L.SKY.x, { t });           // far layer: less parallax
    on(L, 'GROUND', M) && hill.ground(L.GROUND.x, { t });
    const P0 = buddy(t), P = drawCritter(null, BUDDY, P0);                   // points without drawing
    if (on(L, 'CAST', M)) { contactShadow(L.CAST.x, P0.x, P0.y, 110, 18); drawCritter(L.CAST.x, BUDDY, P0); }
    on(L, 'GLOW', camMatrix(cam, 0.3)) && glow(L.GLOW.x, ...HILL.moon, 200, 0.4, '220,225,255');
    const h = camPt(M, P.head[0], P.head[1]);
    return {                                         // META (the centre sub-frame's is used)
      sun: camPt(camMatrix(cam, 0.3), ...HILL.moon), // THE key light, screen px (may be off screen); upper left suits the rigs
      hz: camPt(M, 0, HILL.hz)[1],                   // horizon y (haze band, shaft source limit, shadow ceiling)
      faces: [[h[0], h[1], P.head[2] * 1.2]],        // no bloom on these AND the captions keep off them
      clues: [],                                     // [x, y, w, h] rectangles the captions must never cover
    };
  },
};
export const SHOTS = [A01];
export const CUES = { 'A01.ears': T(40) };          // named moments for the sound mix
```

## The shot object

| Field | Meaning |
|---|---|
| `id`, `t0`, `t1` | Shot name and cut times in seconds. Frame f belongs to the shot where `t0 <= f/30 < t1`. Write `T(frame)`. |
| `motion` / `sub` | `'fast'` = 8 sub-frames (runs, whips, impacts), `'medium'` = 4, `'still'` = 1. |
| `layers` | Ordered `[[name, opts], ...]`, back to front. |
| `draw(L, t, ctx)` | Draws one sub-frame. `t` is clamped inside the shot, so blur never crosses a cut. `L.NAME.x` = that layer's 2D context in frame coordinates (1080 x 1920, supersampling already applied). `L.NAME.on` = false when this sub-frame isn't kept for that layer: skip its drawing. Returns META. |
| `light` | Optional object or `(meta, t) => object` overriding the chapter's key-light values. |
| `grade` | Optional object or `(t) => object` overriding the chapter grade. `exposure` MULTIPLIES the chapter's. |

### Layer options

| Option | Default | Meaning |
|---|---|---|
| `shutter` | 180 | Shutter angle. Camera-tracked ground/grass: 45-90. Limbs, wings, sparks: 120-180. 0 = drawn once, sharp. |
| `subject` | false | The hero, the companion, the thing the caption names: no depth of field, haze or tint; rim + shadow side; protected from bloom; keeps its model colours in dark grades. |
| `blend` | `'normal'` | `'add'`: additive light (glows). `'screen'`: display-space overlay. |
| `dof` | 0 | Depth-of-field blur, about its sigma in px (far layers ~1.5-3, nearest foreground ~4). Ignored on subjects. |
| `haze`, `hazeW` | 0, 220 | Aerial haze toward the chapter's haze colour, strongest at the horizon `meta.hz`. |
| `tint` | 0 | Constant aerial tint. |
| `gain` | 1 | Multiplies the layer's colour (0.6 = a dark foreground occluder). |
| `rim`, `rimW`, `rimInset` | 1 / 0 | Rim strength (1 on subjects, 0 elsewhere), band width, inset. |
| (shadow side) | | The shadow-side band reads a softened silhouette, so thin parts just past an edge (legs under a body) never print stripes onto it. |
| `shade`, `shadeW` | 1 / 0 | Shadow-side strength (1 on subjects), band width. |
| `light` | true | `false`: no light passes on this layer (UI-like FX, wet-shine decals). |
| `k` | 1 | Gain for `'add'` layers. |

### META fields

| Field | Meaning |
|---|---|
| `sun: [x, y]` | The key light in screen px. Rim and shadow-side directions come from it; shafts and glare start there. |
| `hz` | Horizon y. |
| `faces: [[x, y, r]]` | Faces: no bloom on them; **the overlay keeps captions off them** (recorded per frame in out/layout_*.json). |
| `clues: [[x, y, w, h]]` | Story clues on screen: **the overlay keeps captions off them**. |
| `shadows: [{ layer, foot: [x, y], len }]` | Long soft cast shadow from a layer's silhouette; `foot` = ground contact. |
| `points: [{ x, y, r, col, k, layers }]` | Point lights that light SURFACES in their own colour (a lamp, a screen, a spark). |
| `pool: { x, y, rx, ry, k }` | The light pool: the frame falls off into shadow outside this ellipse. |
| `blur: [vx, vy]` | Whip-pan blur vector (pass `whip(...).blur`). |
| `light: {...}` | Light keys for this frame only. |

## The colour script (episode.json "grade")

`[{ "preset": "night", "f0": 0 }, { "preset": "lamplit", "f0": 260 }, ...]`: a chapter per change of place or mood, `f0`
= the frame of a cut (or `t0` seconds), optional `ramp` seconds to blend, and any preset value to override
(`"exposure": 0.9` multiplies). Presets: `day`, `golden`, `overcast`, `dusk`, `night`, `lamplit`, `interior`, `storm`,
`threat` (red the only accent), `forest` (god rays), `memory` (ONE flashback look per series).

Darkness comes from the curve and the light pool, not a global gain, so highlights stay bright. Keep the mean luma
above ~55 (the renderer prints it per shot and flags "TOO DARK" under 40); draw silhouettes and light sources for mood.

## Camera helpers

| Helper | Returns / does |
|---|---|
| `push(t, t0, t1, amt)` | Zoom multiplier creeping at constant speed, already moving on frame 0. Use on every hold. |
| `punch(t, tHit, k)` | Punch-in on a reveal word (snapped to a frame edge so no frame blurs across it). Multiply into zoom. |
| `whip(t, tCut, { dir, dist, dur })` | `{ dx, dy, blur }`: whip-pan out of one shot and into the next; return `blur` in META. |
| `shake(t, tHit, { amp, freq, decay })` | `[dx, dy, rot]` decaying shake. |
| `drift(t, { amp })` | `[dx, dy, rot]` slow handheld drift: holds are never dead. |
| `camMatrix({ zoom, cx, cy, dx, dy, rot }, depth)` | Layer camera with parallax (sky 0.3, far 0.6, mid 1, near 1.3, foreground 1.6). |
| `applyCam(ctx, M)` / `camPt(M, x, y)` | Set a layer's transform / map a point through it (for sun, faces, clues). |

Glow helpers (draw into an `add` layer): `glow(x, px, py, r, a, 'r,g,b')`, `eyeGlow`, `sparkGlow`, `screenGlow`,
`timerGlow`; `contactShadow(x, cx, cy, rw, rh, a)` on a normal layer.

## Rules

- **Never blur the subject** (mark it `subject: true`). **Shutter per layer** (a full 180° on tracked ground = mush).
- **Pure functions of time:** no `Math.random`, no frame counters; use `h01(i, seed)` / `rng(seed)` for variety.
- **Fast pose changes over 6+ frames** (a 1-frame pose snap + blur = a double face). Keep blinks off impact frames.
- **Skip work when `L.NAME.on` is false.**
- The rigs bake a cel shade for a light at the upper left: put `sun` left/upper-left when the story allows.

## Cost (a 16-core desktop, measured on the example episode)

Half-size draft (`--scale 0.5 --ss 1 --sub 2`): ~0.13 s per frame with 8 workers (34 s episode: ~2.2 min).
Full quality (`--ss 2`, per-shot sub-frames): roughly 6-10x the draft. Half the cost is drawing the layers at 2x.
