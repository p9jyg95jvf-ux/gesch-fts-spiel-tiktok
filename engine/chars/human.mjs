// Arc Lab character system: the parametric CHIBI HUMAN (an original design, about 2.2 heads tall).
//
//   import { makeHuman, drawHuman } from '<engine>/chars/human.mjs';     (or from the engine index)
//   const NELL = makeHuman({ build: 'elder', hair: '#D9D4CC', hairStyle: 'bun', top: { type: 'raincoat', col: '#F2C230' }, glasses: { col: '#3A2A22' } });
//   const pts = drawHuman(x, NELL, { x: 540, y: 1500, s: 1.4, turn: 0.4, pose: 'walk', phase: t * 1.6, expr: 'worried', t });
//
// The MODEL (makeHuman) is what the character IS: build, colours, hair, outfit, accessories. Write it once per character
// in the series kit. The POSE (third argument) is what the character DOES on this frame; animate it with take()
// (chars/take.mjs), never with frame counters. drawHuman(null, M, P) draws nothing and only returns the points.
//
// POSE fields (all optional):
//   x, y        ground point between the feet (frame px)        s       scale (1 = about 280 px tall)
//   turn        0 front, +1 profile facing screen-right, -1 facing screen-left, +-2 from behind (continuous)
//   headTurn    extra yaw for the head only (same units)        nod     head pitch: + looks down, - looks up (-1..1)
//   tilt        head roll, radians                                lean    body lean, radians (+ = forward)
//   pose        'stand' | 'walk' | 'run' | 'shamble' | 'sit' | 'crouch'   phase   gait position (cycles; t * 1.6 walks)
//   seat        sit: seat height in px at s = 1 (0 = on the floor, 50 = a chair)
//   armR, armL  arm presets (ARMS below) or [ux, uy, uz, fx, fy, fz] vectors. armR is on the screen's right when the
//               character faces the camera. During walk/run, an arm left unset swings with the legs.
//   expr        'neutral' | 'happy' | 'joy' | 'worried' | 'scared' | 'surprised' | 'determined' | 'angry' | 'sad' | 'sly'
//               | 'sleepy' | 'asleep' | 'thinking' | 'undead' | 'hungry' (walkers: blank eyes)
//   blink 0..1, look [-1..1, -1..1] (eyes), talk 0..1 (mouth open; see take.mjs mouthFromWords), bob px, sq (squash 1)
//   light       [lx, ly] key-light direction for the cel shade (default upper left [-0.6, -0.8])
// RETURNS { head: [x, y, r], face: [x, y], hands: [[x, y] (armR), [x, y] (armL)], feet: [[x, y], [x, y]],
//           top: [x, y], box: [x0, y0, x1, y1] } in frame px: use them for meta.faces, shadows, props held in hands.
import { TAU, clamp, lerp, mixHex } from '../lib.mjs';
import { projector, lw, blob, tube, line, curve, ell, circ, poly, smoothPath, nrm, pitch, shadeOf, litOff, painter, footPath, INK } from './rig.mjs';

// ------------------------------------------------------------------------------------------------ builds
export const BUILDS = {
  kid:   { headR: 66, torsoH: 66, legLen: 44, shoulderW: 33, hipHalf: 29, depth: 21, arm1: 28, arm2: 26, armW: 17, handR: 10.5, legW: 19, hipW: 13, foot: [27, 13, 19], hunch: 0 },
  teen:  { headR: 64, torsoH: 80, legLen: 56, shoulderW: 38, hipHalf: 32, depth: 23, arm1: 34, arm2: 32, armW: 18, handR: 11.5, legW: 21, hipW: 15, foot: [30, 14, 21], hunch: 0 },
  adult: { headR: 64, torsoH: 90, legLen: 62, shoulderW: 42, hipHalf: 35, depth: 25, arm1: 38, arm2: 36, armW: 19.5, handR: 12, legW: 22, hipW: 17, foot: [32, 15, 22], hunch: 0 },
  broad: { headR: 64, torsoH: 92, legLen: 58, shoulderW: 52, hipHalf: 44, depth: 31, arm1: 38, arm2: 36, armW: 22, handR: 13, legW: 25, hipW: 20, foot: [34, 16, 24], hunch: 0 },
  elder: { headR: 63, torsoH: 84, legLen: 54, shoulderW: 41, hipHalf: 37, depth: 26, arm1: 36, arm2: 34, armW: 19, handR: 11.5, legW: 21, hipW: 16, foot: [32, 15, 22], hunch: 0.1 },
};
// ------------------------------------------------------------------------------------------------ the default model
export const HUMAN = {
  name: 'Hero', build: 'adult', dims: null,
  skin: '#F2C6A0', blush: true, freckles: false, nose: 'dot', eyeSize: 1.12, eyes: '#2A1E1A', brows: 1,
  hair: '#4A2E22', hairStyle: 'short',           // short | messy | bob | long | ponytail | bun | curly | buzz | bald | spiky
  top: { type: 'hoodie', col: '#3E5BA9', col2: '#E8E2D4' },      // tee | hoodie | jacket | raincoat | coat | sweater | dress | vest; pattern: 'dots'
  bottom: { type: 'pants', col: '#2F3442' },                     // pants | shorts | skirt (ignored under a dress)
  shoes: { type: 'sneakers', col: '#F4F1EA', col2: '#C8423A' },  // sneakers | boots
  hat: null,        // { type: 'rainhat' | 'beanie' | 'cap' | 'captain' | 'bucket', col, col2 }
  glasses: null,    // { col }
  scarf: null,      // { col, col2 }
  gloves: null,     // colour of gloves/mittens (else skin)
  torn: false,      // ragged hem + dirt stains (survivors, walkers)
  decay: false,     // walkers: hollow cheeks, a bruise, a scratch (use with expr 'undead' / 'hungry')
  stubble: null,    // a colour: a shaded jaw (stubble, a short beard)
  bandage: false,   // a bandage round the head
  barefoot: false,  // bare feet: the shoes colour is the skin of the feet (toes, no sole, no laces)
};
const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? { ...a[k], ...v } : v; return o; };
/** a character model: the defaults above with your changes merged in */
export function makeHuman(spec = {}) { return merge(HUMAN, spec); }

// ------------------------------------------------------------------------------------------------ arms
// [upper arm direction, forearm direction] in character space (side, down, forward); side is mirrored per arm.
export const ARMS = {
  down: [0.22, 0.97, 0.05, 0.12, 1, 0.14], out: [0.75, 0.62, 0, 0.85, 0.45, 0.05], up: [0.32, -0.95, 0.1, 0.12, -1, 0.05],
  wave: [0.85, -0.3, 0.15, 0.25, -1, 0], point: [0.18, 0.2, 1, 0.06, 0.05, 1], hold: [0.22, 0.88, 0.4, -0.85, 0.05, 0.62],
  hips: [0.85, 0.5, -0.15, -0.62, 0.8, 0.05], reach: [0.25, -0.4, 0.9, 0.1, -0.25, 1], shrug: [0.62, 0.72, 0.18, 0.62, -0.62, 0.3],
  chin: [0.2, 0.82, 0.4, -0.42, -0.85, 0.32], cover: [0.25, 0.75, 0.62, -0.5, -0.75, 0.5], lamp: [0.25, 0.55, 0.8, 0.05, -0.1, 1],
  hug: [0.4, 0.7, 0.6, -0.9, 0.1, 0.4], back: [0.1, 0.92, -0.38, -0.5, 0.6, -0.6], cheer: [0.55, -0.82, 0.1, 0.35, -0.95, 0.05],
};
/** arm preset -> vector (wave oscillates with t) */
export function armVec(v, t = 0) {
  if (Array.isArray(v)) return v;
  const a = ARMS[v] || ARMS.down;
  if (v === 'wave') { const w = 0.38 * Math.sin(t * 13); return [a[0], a[1], a[2], a[3] + w, a[4], a[5]]; }
  return a;
}

// ------------------------------------------------------------------------------------------------ expressions
// brow: [raise (+ up), slant (+ = inner ends up: worry; - = inner ends down: anger)], eye: open | happy | closed | wide,
// lid: upper-lid closure 0..1, mouth: smile | grin | open | o | flat | frown | wobble | smirk | snore, m: mouth amount
export const EXPR = {
  neutral:    { brow: [0, 0], eye: 'open', lid: 0, mouth: 'smile', m: 0.25 },
  happy:      { brow: [0.25, 0.1], eye: 'open', lid: 0, mouth: 'grin', m: 0.7 },
  joy:        { brow: [0.35, 0.15], eye: 'happy', lid: 0, mouth: 'grin', m: 1 },
  worried:    { brow: [0.2, 0.75], eye: 'open', lid: 0, mouth: 'wobble', m: 0.5 },
  scared:     { brow: [0.55, 0.9], eye: 'wide', lid: 0, mouth: 'open', m: 0.55 },
  surprised:  { brow: [0.7, 0.2], eye: 'wide', lid: 0, mouth: 'o', m: 0.8 },
  determined: { brow: [-0.1, -0.6], eye: 'open', lid: 0.22, mouth: 'flat', m: 0.4 },
  angry:      { brow: [-0.15, -1], eye: 'open', lid: 0.3, mouth: 'frown', m: 0.7 },
  sad:        { brow: [0.1, 0.8], eye: 'open', lid: 0.35, mouth: 'frown', m: 0.5 },
  sly:        { brow: [0.1, -0.3], eye: 'open', lid: 0.42, mouth: 'smirk', m: 0.7 },
  sleepy:     { brow: [-0.05, 0.2], eye: 'open', lid: 0.62, mouth: 'flat', m: 0.3 },
  asleep:     { brow: [-0.05, 0.1], eye: 'closed', lid: 1, mouth: 'snore', m: 0.5 },
  thinking:   { brow: [0.3, -0.2], eye: 'open', lid: 0.15, mouth: 'smirk', m: 0.3 },
  undead:     { brow: [-0.3, -0.25], eye: 'blank', lid: 0.04, mouth: 'teeth', m: 0.45 },     // walkers: dead eyes, slack jaw
  hungry:     { brow: [-0.35, -0.9], eye: 'blank', lid: 0, mouth: 'teeth', m: 1 },           // a walker that has seen you
};

// ------------------------------------------------------------------------------------------------ hair styles
// fringe(phi) -> latitude of the hairline at longitude phi (0 = face centre, +-PI/2 = ears, PI = back of the head);
// v = hair volume over the skull; back = hair hanging behind the head: null | 'bob' | 'long'; spikes / curls: outline.
const sm = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
function band(phi, front, side, back) { const a = Math.abs(phi); return a <= Math.PI / 2 ? lerp(front, side, sm(a / (Math.PI / 2))) : lerp(side, back, sm((a - Math.PI / 2) / (Math.PI / 2))); }
const tufts = (phi, n, amp, reach = 1.25) => (Math.abs(phi) < reach ? amp * Math.pow(Math.abs(Math.cos(phi * n * 0.5)), 3) * (1 - Math.abs(phi) / reach) : 0);
export const HAIR = {
  short:    { v: 1.08, fringe: (p) => band(p, -0.36, 0.02, 0.5) + tufts(p, 7, 0.17) },
  messy:    { v: 1.12, spikes: 9, fringe: (p) => band(p, -0.34, 0.04, 0.5) + tufts(p, 9, 0.2) },
  spiky:    { v: 1.14, spikes: 7, fringe: (p) => band(p, -0.42, 0.0, 0.45) + tufts(p, 5, 0.14) },
  bob:      { v: 1.1, back: 'bob', fringe: (p) => band(p, -0.2, 0.62, 0.7) + tufts(p, 11, 0.05, 0.9) },
  long:     { v: 1.09, back: 'long', fringe: (p) => band(p, -0.3, 0.45, 0.8) + (Math.abs(p) < 0.25 ? -0.12 * (1 - Math.abs(p) / 0.25) : 0) },
  ponytail: { v: 1.06, tail: 'pony', fringe: (p) => band(p, -0.46, 0.08, 0.42) + tufts(p, 5, 0.06, 0.7) },
  bun:      { v: 1.08, tail: 'bun', fringe: (p) => band(p, -0.4, 0.22, 0.45) + 0.07 * Math.sin(p * 4 + 0.6) * (Math.abs(p) < 1.6 ? 1 : 0) },
  curly:    { v: 1.16, curls: 13, fringe: (p) => band(p, -0.3, 0.1, 0.55) + tufts(p, 9, 0.1) },
  buzz:     { v: 1.025, fringe: (p) => band(p, -0.58, -0.12, 0.42) },
  bald:     { v: 1.02, fringe: (p) => (Math.abs(p) < 1.15 ? 2 : band(p, 0, -0.05, 0.38)), sideOnly: true },
};

// ------------------------------------------------------------------------------------------------ draw
export function drawHuman(x, M, P = {}) {
  const B = { ...(BUILDS[M.build] || BUILDS.adult), ...(M.dims || {}) };
  const s = P.s ?? 1, X = P.x ?? 540, Y = P.y ?? 1500, t = P.t ?? 0, turn = P.turn ?? 0;
  const pose = P.pose || 'stand', ph = P.phase ?? 0, R = B.headR;
  const pr = projector(X, Y, s, turn), c = pr.c, sn = pr.sn;
  const LW = clamp(4.4 * s, 1.2, 7), off = litOff(s, P.light, 4.2), sq = P.sq ?? 1;
  const skin = M.skin, skinSh = shadeOf(skin, 0.3);
  const shamble = pose === 'shamble';
  const lean = (P.lean ?? 0) + B.hunch + (pose === 'run' ? 0.2 : 0) + (shamble ? 0.2 : 0);
  const cyc = TAU * ph;

  // ---- vertical layout (character space, ly down, 0 = ground)
  let hipY = -B.legLen, bob = P.bob ?? 0;
  if (pose === 'walk') bob += -2.5 * Math.cos(2 * cyc);
  if (shamble) bob += -4 * Math.max(0, Math.cos(cyc)) + 2;
  if (pose === 'run') bob += -7 * Math.abs(Math.sin(cyc)) + 3;
  if (pose === 'crouch') hipY = -B.legLen * 0.55;
  if (pose === 'sit') hipY = -(P.seat ?? 50) - B.legW * 0.4;
  hipY += bob;
  const shY = hipY - B.torsoH * sq;
  const body = (v) => pitch(v, -lean, hipY, 0);                       // lean rotates everything above the hip
  const Pb = (lx, ly, lz) => { const v = body([lx, ly, lz]); return pr(v[0], v[1], v[2]); };

  // ---- legs
  const legs = [];
  for (const sg of [1, -1]) {
    const hip = [sg * B.hipW, hipY, 0];
    let knee, ankle;
    if (pose === 'walk' || pose === 'run' || shamble) {
      const A = pose === 'run' ? 0.85 : shamble ? (sg > 0 ? 0.34 : 0.12) : 0.42, th = A * Math.sin(cyc + (sg > 0 ? 0 : Math.PI));
      const lift = Math.max(0, Math.cos(cyc + (sg > 0 ? 0 : Math.PI))) * (pose === 'run' ? 22 : shamble ? (sg > 0 ? 6 : 0) : 7);
      const L = B.legLen;
      ankle = [sg * B.hipW, Math.min(0, hipY + Math.cos(th) * L) - lift, Math.sin(th) * L];
      const bend = pose === 'run' ? Math.max(0, -Math.sin(cyc + (sg > 0 ? 0 : Math.PI))) * 0.9 : 0.12;
      knee = [sg * B.hipW, (hip[1] + ankle[1]) / 2 - 2, (hip[2] + ankle[2]) / 2 + L * 0.28 * (0.3 + bend)];
    } else if (pose === 'sit') {
      const seat = P.seat ?? 50, thigh = B.legLen * 0.62;
      knee = [sg * B.hipW * 1.1, hipY + 2, thigh];
      ankle = seat < 8 ? [sg * B.hipW * 1.2, -4, thigh + B.legLen * 0.5] : [sg * B.hipW * 1.1, 0, thigh + 6];
    } else if (pose === 'crouch') {
      knee = [sg * B.hipW * 1.25, hipY + B.legLen * 0.3, B.legLen * 0.5]; ankle = [sg * B.hipW * 1.1, 0, B.legLen * 0.1];
    } else {
      const spread = P.stance ?? 1.08;
      ankle = [sg * B.hipW * spread, 0, 0]; knee = [sg * B.hipW * (1 + spread) / 2, hipY / 2, 1.5];
    }
    legs.push({ sg, hip, knee, ankle });
  }

  // ---- arms
  const arms = [];
  const swingArm = (sg) => {
    const A = pose === 'run' ? 0.95 : 0.45, th = -A * Math.sin(cyc + (sg > 0 ? 0 : Math.PI));
    const u = [0.16, Math.cos(th), Math.sin(th)];
    const f = pose === 'run' ? [0.08, Math.cos(th + 1.45), Math.sin(th + 1.45)] : [0.1, Math.cos(th * 1.25 + 0.15), Math.sin(th * 1.25 + 0.15)];
    return [...u, ...f];
  };
  for (const sg of [1, -1]) {
    const key = sg > 0 ? P.armR : P.armL;
    const sway = 0.12 * Math.sin(cyc + (sg > 0 ? 0 : 2));
    const v = key === undefined || key === null ? (pose === 'walk' || pose === 'run' ? swingArm(sg) : shamble ? [0.2, 0.42 + sway, 0.88, 0.06, 0.3 - sway, 0.95] : ARMS.down) : armVec(key, t);
    const u = nrm([v[0] * sg, v[1], v[2]]), f = nrm([v[3] * sg, v[4], v[5]]);
    const sh = [sg * (B.shoulderW - B.armW * 0.42), shY + B.armW * 0.62, 0];
    const el = [sh[0] + u[0] * B.arm1, sh[1] + u[1] * B.arm1, sh[2] + u[2] * B.arm1];
    const hd = [el[0] + f[0] * B.arm2, el[1] + f[1] * B.arm2, el[2] + f[2] * B.arm2];
    arms.push({ sg, sh, el, hd });
  }

  // ---- head
  const headTurn = turn + (P.headTurn ?? 0), aH = headTurn * Math.PI / 2;
  const headC = body([0, shY - R * 0.84 * sq, B.depth * 0.08 + (P.nod ?? 0) * 4]);
  const hc = pr(headC[0], headC[1], headC[2]);
  const hx = hc[0], hy = hc[1], rx = R * 1.05 * s, ry = R * s * (2 - sq) * 0.5 + R * s * 0.5;
  const nod = (P.nod ?? 0) * 0.28;
  /** a point on the head: longitude phi (0 = face), latitude lam (+ down), radius factor rr -> [x, y, facing] */
  const HP = (phi, lam, rr = 1) => { const l = lam + nod * Math.cos(lam) * 0.9, q = phi + aH; return [hx + rx * rr * Math.sin(q) * Math.cos(l), hy + ry * rr * Math.sin(l), Math.cos(q) * Math.cos(l)]; };
  const tilt = P.tilt ?? 0;

  // ---- points for the caller
  const hands = arms.map((a) => { const p = Pb(...a.hd); return [p[0], p[1]]; });
  const feet = legs.map((l) => { const p = pr(...l.ankle); return [p[0], p[1]]; });
  const top = [hx, hy - ry * (HAIR[M.hairStyle]?.v ?? 1.08) - (M.hat ? R * 0.25 * s : 0)];
  const res = { head: [hx, hy, R * s], face: HP(0, 0.15).slice(0, 2), hands, feet, top, box: [hx - rx * 1.4, top[1], hx + rx * 1.4, Y + 6] };
  if (!x) return res;

  const ex = EXPR[P.expr] || EXPR[P.expr === undefined ? 'neutral' : 'neutral'];
  const items = [];

  // back hair (behind everything above the shoulders)
  const HS = HAIR[M.hairStyle] || HAIR.short, hairC = M.hair, hairSh = shadeOf(hairC, 0.3);
  if (HS.back) {
    items.push({ d: -1e6, draw: () => {
      x.save(); x.translate(hx, hy); x.rotate(tilt); x.translate(-hx, -hy);
      const len = HS.back === 'long' ? R * 1.75 : R * 0.95, w = rx * (HS.back === 'long' ? 1.12 : 1.1);
      const fr = (k) => [hx + Math.sin(aH) * rx * 0.08, hy + ry * 0.1 + len * k];
      blob(x, [(g) => { g.beginPath(); g.ellipse(hx, hy - ry * 0.05, w, ry * 1.05, 0, Math.PI, TAU); g.lineTo(hx + w * 0.98, fr(1)[1] - R * 0.3 * s); g.quadraticCurveTo(hx + w * 0.9, fr(1)[1], hx, fr(1)[1] + R * 0.05 * s); g.quadraticCurveTo(hx - w * 0.9, fr(1)[1], hx - w * 0.98, fr(1)[1] - R * 0.3 * s); g.closePath(); }],
        hairC, hairSh, { line: LW, off });
      x.restore();
    } });
  }
  // tail hair (ponytail / bun): behind or in front of the head by its own depth
  if (HS.tail) {
    const pony = HS.tail === 'pony';
    const at = HP(Math.PI, pony ? -0.15 : -1.12, pony ? 1.02 : 0.98);
    const dep = at[2];
    items.push({ d: dep < 0 ? -1e5 : 1e5 + 3, draw: () => {
      x.save(); x.translate(hx, hy); x.rotate(tilt); x.translate(-hx, -hy);
      if (pony) {
        const sway = Math.sin(t * 2.4) * 0.12 + Math.sin(cyc) * (pose === 'run' ? 0.35 : 0.1), L = R * 1.15 * s, w = R * 0.32 * s;
        const dx = Math.sin(aH + Math.PI) * w * 0.9;
        const tip = [at[0] + dx + Math.sin(sway) * L * 0.6, at[1] + L];
        blob(x, [(g) => { g.beginPath(); g.moveTo(at[0] - w * 0.6, at[1]); g.quadraticCurveTo(at[0] + dx - w * 1.15, at[1] + L * 0.55, tip[0], tip[1]); g.quadraticCurveTo(at[0] + dx + w * 1.15, at[1] + L * 0.55, at[0] + w * 0.6, at[1]); g.closePath(); }],
          hairC, hairSh, { line: LW, off });
        circ(x, at[0], at[1] + w * 0.15, w * 0.32); x.fillStyle = M.hairTie || '#D04A5A'; x.fill();
      } else { blob(x, [(g) => circ(g, at[0], at[1], R * 0.4 * s)], hairC, hairSh, { line: LW, off }); curve(x, [at[0] - R * 0.25 * s, at[1] - R * 0.05 * s], [at[0], at[1] - R * 0.3 * s], [at[0] + R * 0.22 * s, at[1] + R * 0.02 * s], LW * 0.55, hairSh); }
      x.restore();
    } });
  }

  // legs + shoes
  const legDepthBase = pose === 'sit' ? (c > 0.2 ? 2 : -2) : -2;
  const bot = M.top.type === 'dress' ? { type: 'none', col: skin } : M.bottom;
  const legCol = bot.type === 'pants' ? bot.col : skin, legColSh = shadeOf(legCol, 0.28);
  const shoe = M.shoes, shoeSh = shadeOf(shoe.col, 0.28);
  const bare = shoe.col === skin || M.barefoot;
  for (const L of legs) {
    const hp = pr(...body(L.hip)), kp = pr(...L.knee);
    const fl = B.foot[0], fh = B.foot[1] * (bare ? 0.85 : 1), fw = Math.max(B.foot[2], B.legW * 1.22);
    // the leg ends inside the shoe: its round end sits fully under the shoe's dome
    const at = pr(L.ankle[0], L.ankle[1] - Math.max(fh * 0.82, B.legW * 0.5), L.ankle[2]);
    items.push({ d: legDepthBase * 1000 + hp[2], draw: () => {
      const w = B.legW * s;
      if (bot.type === 'shorts') {
        const mid = [lerp(hp[0], kp[0], 0.85), lerp(hp[1], kp[1], 0.85)];
        tube(x, [mid, kp, at], w * 0.86, skin, { line: LW, shade: skinSh, off });
        tube(x, [hp, mid], w * 1.08, bot.col, { line: LW, shade: shadeOf(bot.col), off });
      } else tube(x, [hp, kp, at], w, legCol, { line: LW, shade: legColSh, off });
      if (shoe.type === 'boots') tube(x, [[at[0], at[1] - B.legLen * 0.3 * s], at], w * 1.12, shoe.col, { line: LW, shade: shoeSh, off });
      // the shoe / foot: flat sole on the ground, heel under the ankle, toe pointing along the character's forward axis
      const heel = pr(L.ankle[0], L.ankle[1], L.ankle[2] - fl * 0.28), toe = pr(L.ankle[0], L.ankle[1], L.ankle[2] + fl * 0.8);
      const cx = (heel[0] + toe[0]) / 2, y0 = heel[1], as = Math.abs(sn), td = Math.sign(toe[0] - heel[0]);
      const hw = Math.sqrt((fw / 2 * c) ** 2 + (fl * 1.08 / 2 * sn) ** 2) * s, hT = fh * s * (1 - 0.42 * as), hH = fh * s;
      const hR = td > 0 ? hT : hH, hL = td > 0 ? hH : hT, path = (g) => footPath(g, cx, y0, hw, hL, hR, fh * 0.35 * s);
      blob(x, [path], shoe.col, shoeSh, { line: LW, off });
      x.save(); path(x); x.clip();
      if (!bare && shoe.type === 'sneakers') { x.fillStyle = shoe.col2 || mixHex(shoe.col, '#FFFFFF', 0.55); x.fillRect(cx - hw - 2, y0 - fh * 0.26 * s, hw * 2 + 4, fh * s); }   // the sole
      if (!bare && shoe.type === 'boots') { x.fillStyle = shadeOf(shoe.col, 0.5); x.fillRect(cx - hw - 2, y0 - fh * 0.2 * s, hw * 2 + 4, fh * s); }
      x.restore();
      if (bare) {                                                       // toes: little creases at the front of the foot
        const fz = Math.max(0, c) * (1 - as * 0.6), tx = td * hw * 0.55 * as;
        if (fz > 0.15) for (const k of [-0.32, 0, 0.32]) line(x, [[cx + tx + k * hw * 0.9, y0 - fh * 0.08 * s], [cx + tx + k * hw * 0.9, y0 - fh * 0.42 * s]], LW * 0.35, shadeOf(shoe.col, 0.35));
        else if (as > 0.5) line(x, [[cx + td * hw * 0.62, y0 - fh * 0.05 * s], [cx + td * hw * 0.62, y0 - hT * 0.55]], LW * 0.35, shadeOf(shoe.col, 0.35));
      } else if (shoe.type === 'sneakers' && c > 0.3) {                  // laces
        const ly = y0 - fh * 0.62 * s, lx = cx + td * hw * 0.15 * as;
        line(x, [[lx - hw * 0.22, ly], [lx + hw * 0.22, ly]], LW * 0.35, shadeOf(shoe.col, 0.4)); line(x, [[lx - hw * 0.2, ly + fh * 0.16 * s], [lx + hw * 0.2, ly + fh * 0.16 * s]], LW * 0.35, shadeOf(shoe.col, 0.4));
      }
    } });
  }

  // torso (outfit)
  const top_ = M.top, topC = top_.col, topSh = shadeOf(topC, 0.3), long = ['raincoat', 'coat'].includes(top_.type), dress = top_.type === 'dress';
  const hem = hipY + (long ? B.legLen * 0.55 : dress ? B.legLen * 0.5 : 9);
  const levels = [
    [hem, (long ? 1.14 : dress ? 1.45 : 1.02) * B.hipHalf, B.depth * (dress ? 1.2 : 1)],
    [hipY - B.torsoH * 0.3, B.hipHalf * (dress ? 0.85 : 0.98), B.depth * 0.95],
    [shY + B.torsoH * 0.28, B.shoulderW * 0.96, B.depth],
    [shY + 7, B.shoulderW, B.depth * 0.9],
    [shY - 3, R * 0.3, R * 0.25],
  ];
  const sil = levels.map(([ly, wx, wz]) => { const p = Pb(0, ly, 0); return [p[0], p[1], Math.sqrt((wx * c) ** 2 + (wz * sn) ** 2) * s]; });
  const torsoPath = (g) => {
    const L = sil, pts = [[L[0][0] + L[0][2], L[0][1], 1], [L[1][0] + L[1][2], L[1][1]], [L[2][0] + L[2][2], L[2][1]], [L[3][0] + L[3][2] * 0.92, L[3][1] - 2 * s],
      [L[4][0] + L[4][2], L[4][1]], [L[4][0] - L[4][2], L[4][1]], [L[3][0] - L[3][2] * 0.92, L[3][1] - 2 * s], [L[2][0] - L[2][2], L[2][1]], [L[1][0] - L[1][2], L[1][1]], [L[0][0] - L[0][2], L[0][1], 1]];
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (b[2] || a[2]) g.lineTo(b[0], b[1]); else g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    if (M.torn) {                                                       // a ragged hem
      const a = pts[pts.length - 1], b = pts[0], n = 7;
      for (let i = 1; i <= n; i++) { const u = i / n, j = i % 2 ? 9 * s : -3 * s; g.lineTo(lerp(a[0], b[0], u), lerp(a[1], b[1], u) + (i < n ? j : 0)); }
    } else g.quadraticCurveTo(L[0][0], L[0][1] + 6 * s, pts[0][0], pts[0][1]);
    g.closePath();
  };
  // hood (behind the neck in front views, on the upper back in back views)
  if (top_.type === 'hoodie') {
    const hp = Pb(0, shY - 2, -B.depth * 0.95);
    items.push({ d: hp[2] < 0 ? -50 : 50, draw: () => blob(x, [(g) => ell(g, hp[0], hp[1] + (hp[2] < 0 ? 0 : 10 * s), R * 0.66 * s * (0.75 + 0.25 * Math.abs(c)), R * (hp[2] < 0 ? 0.3 : 0.55) * s)], topC, topSh, { line: LW, off }) });
  }
  if (bot.type === 'skirt' && !dress) {
    items.push({ d: -1, draw: () => {
      const a = Pb(0, hipY - 4, 0), b = Pb(0, hipY + B.legLen * 0.48, 0), w0 = Math.sqrt((B.hipHalf * c) ** 2 + (B.depth * sn) ** 2) * s, w1 = w0 * 1.45;
      blob(x, [(g) => poly(g, [[a[0] - w0, a[1]], [a[0] + w0, a[1]], [b[0] + w1, b[1]], [b[0] - w1, b[1]]])], bot.col, shadeOf(bot.col), { line: LW, off });
    } });
  }
  items.push({ d: 0, draw: () => {
    blob(x, [torsoPath], topC, topSh, { line: LW, off });
    if (top_.pattern === 'dots' || M.torn) {                            // fabric dots (a hospital gown) / dirt and stains
      x.save(); torsoPath(x); x.clip();
      if (top_.pattern === 'dots') { x.fillStyle = top_.col2 || shadeOf(topC, 0.25); for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) { const p = Pb(-B.shoulderW * 1.2 + i * 12, shY + 8 + j * 18 + (i % 2) * 9, B.depth); if (p[2] > -2) { circ(x, p[0], p[1], 2.6 * s); x.fill(); } } }
      if (M.torn) { x.fillStyle = 'rgba(40,30,25,0.42)'; for (const [u, v, r] of [[-0.35, 0.35, 16], [0.3, 0.6, 12], [0.05, 0.85, 20]]) { const p = Pb(u * B.shoulderW, shY + v * (hem - shY), B.depth); ell(x, p[0], p[1], r * s, r * 0.7 * s, 0.4); x.fill(); } }
      x.restore();
    }
    const fz = c;                                                       // how much of the front faces the camera
    const front = (ly, k = 1) => { const lv = levels.reduce((p, q) => (Math.abs(q[0] - ly) < Math.abs(p[0] - ly) ? q : p)); return Pb(0, ly, lv[2] * k); };
    const fa = clamp((fz - 0.08) / 0.3);
    if (fa > 0) {
      x.save(); x.globalAlpha *= fa; torsoPath(x); x.clip();
      const col2 = top_.col2 || shadeOf(topC, 0.45);
      if (top_.type === 'hoodie') {
        const a = front(hipY - B.torsoH * 0.32), w = B.hipHalf * 0.62 * s * Math.abs(c), h = B.torsoH * 0.28 * s;
        x.beginPath(); x.moveTo(a[0] - w, a[1] + h * 0.6); x.lineTo(a[0] - w * 0.78, a[1] - h * 0.4); x.lineTo(a[0] + w * 0.78, a[1] - h * 0.4); x.lineTo(a[0] + w, a[1] + h * 0.6);
        x.strokeStyle = shadeOf(topC, 0.5); x.lineWidth = lw(x, LW * 0.75); x.stroke();
        const n = front(shY + 8), dx = 7 * s * Math.abs(c);
        line(x, [[n[0] - dx, n[1]], [n[0] - dx * 1.1, n[1] + 24 * s]], LW * 0.7, col2); line(x, [[n[0] + dx, n[1]], [n[0] + dx * 1.1, n[1] + 24 * s]], LW * 0.7, col2);
      }
      if (['jacket', 'raincoat', 'coat', 'vest'].includes(top_.type)) {
        const a = front(shY + 6), b = front(hem - 2);
        line(x, [a, b], LW * 0.6, shadeOf(topC, 0.55));
        if (top_.type !== 'jacket') for (let k = 0; k < 3; k++) { const p = front(lerp(shY + B.torsoH * 0.2, hipY + (long ? B.legLen * 0.2 : -8), k / 2)); circ(x, p[0] + 9 * s * Math.abs(c), p[1], 4.2 * s); x.fillStyle = col2; x.fill(); }
        // collar points
        const n = front(shY + 2), w = 15 * s * Math.abs(c);
        x.fillStyle = shadeOf(topC, 0.15); poly(x, [[n[0] - w, n[1] - 2 * s], [n[0], n[1] + 16 * s], [n[0] - 4 * s, n[1] - 4 * s]]); x.fill(); poly(x, [[n[0] + w, n[1] - 2 * s], [n[0], n[1] + 16 * s], [n[0] + 4 * s, n[1] - 4 * s]]); x.fill();
      }
      if (top_.type === 'sweater' || top_.type === 'tee') {
        const h = front(hem - 4); x.fillStyle = shadeOf(topC, 0.18); x.fillRect(h[0] - 200 * s, h[1] - 4 * s, 400 * s, 10 * s);
        const n = front(shY - 1); ell(x, n[0], n[1] + 2 * s, R * 0.26 * s * Math.abs(c), 7 * s); x.fillStyle = top_.type === 'tee' ? skin : shadeOf(topC, 0.2); x.fill();
      }
      if (dress) { const w = front(hipY - B.torsoH * 0.22); x.fillStyle = top_.col2 || shadeOf(topC, 0.35); x.fillRect(w[0] - 200 * s, w[1] - 5 * s, 400 * s, 10 * s); }
      x.restore();
    }
    if (M.scarf) {
      const n = Pb(0, shY - 2, 0), w = R * 0.42 * s;
      blob(x, [(g) => ell(g, n[0], n[1] + 4 * s, w, 12 * s)], M.scarf.col, shadeOf(M.scarf.col), { line: LW, off });
      if (c > -0.2) { const e = Pb(B.shoulderW * 0.3, shY + 10, B.depth); blob(x, [(g) => { g.beginPath(); g.moveTo(e[0] - 8 * s, e[1] - 6 * s); g.lineTo(e[0] + 9 * s, e[1] - 4 * s); g.lineTo(e[0] + 7 * s, e[1] + 38 * s); g.lineTo(e[0] - 7 * s, e[1] + 36 * s); g.closePath(); }], M.scarf.col2 || M.scarf.col, shadeOf(M.scarf.col), { line: LW, off }); }
    }
  } });

  // arms
  const handCol = M.gloves || skin;
  for (const A of arms) {
    const sp = Pb(...A.sh), ep = Pb(...A.el), hp = Pb(...A.hd);
    const above = hp[2] > R * 0.25 * s && hp[1] < hy + ry * 0.7;
    const zt = B.depth * 0.5 * s, lat = sp[2], reach = (ep[2] + hp[2]) / 2 - sp[2];
    const inFront = lat > zt * 0.6 ? true : lat < -zt * 0.6 ? false : reach > -zt * 0.8;
    items.push({ d: above ? 2e5 : inFront ? 100 + lat * 10 + reach : -100 + lat * 10, draw: () => {
      const longSleeve = top_.type !== 'tee' && top_.type !== 'vest' && top_.type !== 'dress';
      if (longSleeve) tube(x, [sp, ep, hp], B.armW * s, topC, { line: LW, shade: topSh, off });
      else {
        tube(x, [sp, ep, hp], B.armW * 0.84 * s, skin, { line: LW, shade: skinSh, off });
        if (top_.type !== 'vest') tube(x, [sp, [lerp(sp[0], ep[0], 0.6), lerp(sp[1], ep[1], 0.6)]], B.armW * 1.08 * s, topC, { line: LW, shade: topSh, off });
      }
      blob(x, [(g) => circ(g, hp[0], hp[1], B.handR * s)], handCol, shadeOf(handCol, 0.3), { line: LW, off });
    } });
  }

  // the head (face, hair cap, hat)
  items.push({ d: 1e5, draw: () => {
    x.save(); x.translate(hx, hy); x.rotate(tilt); x.translate(-hx, -hy);
    // ears
    const ears = [-1, 1].map((sg) => HP(sg * Math.PI / 2, 0.12, 0.97));
    const ear = (e, sg) => { const w = R * 0.16 * s * (0.35 + 0.65 * Math.abs(Math.sin(sg * Math.PI / 2 + aH))), h = R * 0.22 * s; blob(x, [(g) => ell(g, e[0], e[1], w, h)], skin, skinSh, { line: LW, off }); };
    ears.forEach((e, i) => { if (e[2] < -0.05) ear(e, i ? 1 : -1); });
    const neck = Pb(0, shY - 2, 0);
    tube(x, [[neck[0], neck[1] + 4 * s], [neck[0], hy + ry * 0.6]], R * 0.36 * s, skin, { line: LW, shade: skinSh, off });
    blob(x, [(g) => ell(g, hx, hy, rx, ry)], skin, skinSh, { line: LW, off: [off[0] * 1.4, off[1] * 1.4] });
    ears.forEach((e, i) => { if (e[2] >= -0.05 && e[2] < 0.6) ear(e, i ? 1 : -1); });
    // stubble (a shaded jaw), then the face (fades out as it turns away)
    if (M.stubble) {
      const top = [], bot = [];
      for (let i = 0; i <= 24; i++) { const ph = -1.55 + 3.1 * i / 24, a = HP(ph, 0.47 + 0.08 * Math.abs(ph) + 0.62 * sm((Math.abs(ph) - 0.75) / 0.8)); if (a[2] > 0.02) { top.push(a); bot.push([a[0], hy + ry * 1.3]); } }
      if (top.length > 2) {
      x.save(); ell(x, hx, hy, rx, ry); x.clip(); x.globalAlpha *= 0.3 * clamp(top.length / 16);
      x.beginPath(); top.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); for (let i = bot.length - 1; i >= 0; i--) x.lineTo(bot[i][0], bot[i][1]); x.closePath();
      // a soft top edge (stubble fades in toward the jaw; never a hard band across the face)
      const y0 = Math.min(...top.map((p) => p[1])) - ry * 0.05, y1 = y0 + (hy + ry - y0) * 0.55, gr = x.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, M.stubble); x.fillStyle = gr; x.fill(); x.restore();
      }
    }
    face(x, M, ex, P, HP, R * s, LW, t);
    hairCap(x, M, HS, HP, hx, hy, rx, ry, aH, LW, off, s, R);
    if (M.bandage) {                                                     // a bandage round the head, a spot showing through
      const N = 30, A = [], Bq = [];
      for (let i = 0; i <= N; i++) { const psi = -Math.PI / 2 + Math.PI * i / N, ph = psi - aH; A.push([hx + rx * 1.04 * Math.sin(psi) * Math.cos(-0.56), hy + ry * Math.sin(-0.56)]); Bq.push([hx + rx * 1.03 * Math.sin(psi) * Math.cos(-0.34), hy + ry * Math.sin(-0.34) + 4 * s * Math.sin(ph * 2)]); }
      blob(x, [(g) => { g.beginPath(); A.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = Bq.length - 1; i >= 0; i--) g.lineTo(Bq[i][0], Bq[i][1]); g.closePath(); }], '#F0EEE6', '#C8C6BC', { line: LW * 0.9, off });
      const sp = HP(0.45, -0.45, 1.04); if (sp[2] > 0.15) { ell(x, sp[0], sp[1], R * s * 0.08 * sp[2], R * s * 0.06); x.fillStyle = 'rgba(150,40,36,0.75)'; x.fill(); }
    }
    brows(x, M, ex, P, HP, R * s, LW);
    if (M.glasses) glasses(x, M, HP, R * s, LW, aH);
    if (M.hat) hat(x, M, HP, hx, hy, rx, ry, aH, LW, off, s, R);
    x.restore();
  } });
  painter(items);
  return res;
}

// ------------------------------------------------------------------------------------------------ face parts
const vis = (f) => clamp((f - 0.06) / 0.22);
function face(x, M, ex, P, HP, Rs, LW, t) {
  const blink = Math.max(P.blink ?? 0, ex.lid ?? 0), look = P.look || [0, 0];
  const es = M.eyeSize ?? 1;
  for (const sg of [-1, 1]) {
    const e = HP(sg * 0.42, 0.16), k = vis(e[2]); if (k <= 0) continue;
    const f = Math.max(0.3, e[2]), ew = Rs * 0.115 * es * f, eh = Rs * 0.165 * es;
    const cx = e[0] + look[0] * Rs * 0.045, cy = e[1] + look[1] * Rs * 0.035;
    x.save(); x.globalAlpha *= k;
    if (ex.eye === 'happy') curve(x, [cx - ew * 1.1, cy + eh * 0.25], [cx, cy - eh * 0.9], [cx + ew * 1.1, cy + eh * 0.25], LW * 1.05);
    else if (ex.eye === 'closed' || blink > 0.92) curve(x, [cx - ew * 1.1, cy], [cx, cy + eh * 0.55], [cx + ew * 1.1, cy], LW * 1.0);
    else if (ex.eye === 'blank') {                                       // a walker's eye: a sunken dark socket, pale eye, pinprick pupil
      ell(x, cx, cy + eh * 0.05, ew * 1.6, eh * 1.3); x.fillStyle = 'rgba(58,40,62,0.5)'; x.fill();
      ell(x, cx, cy, ew * 1.1, eh * 0.98); x.fillStyle = '#E8E4C4'; x.fill(); x.lineWidth = lw(x, LW * 0.85); x.strokeStyle = INK; x.stroke();
      circ(x, cx + look[0] * ew * 0.35, cy + look[1] * eh * 0.2, ew * 0.15); x.fillStyle = '#2A2420'; x.fill();
      const lid = Math.max(blink, ex.lid || 0);
      if (lid > 0.02) {
        const ly = cy - eh * 0.98 + 1.96 * eh * lid;
        x.save(); ell(x, cx, cy, ew * 1.2, eh * 1.05); x.clip(); x.fillStyle = M.skin; x.fillRect(cx - ew * 2, cy - eh * 2, ew * 4, ly - (cy - eh * 2)); x.restore();
        line(x, [[cx - ew * 1.15, ly + eh * 0.08], [cx + ew * 1.15, ly + eh * 0.08]], LW * 0.9);
      }
    } else if (ex.eye === 'wide') {
      ell(x, cx, cy, ew * 1.25, eh * 1.12); x.fillStyle = '#FFFFFF'; x.fill(); x.lineWidth = lw(x, LW * 0.75); x.strokeStyle = INK; x.stroke();
      circ(x, cx + look[0] * ew * 0.3, cy + look[1] * eh * 0.25, ew * 0.48); x.fillStyle = M.eyes; x.fill();
      circ(x, cx - ew * 0.15, cy - eh * 0.2, ew * 0.16); x.fillStyle = '#FFFFFF'; x.fill();
    } else {
      ell(x, cx, cy, ew, eh); x.fillStyle = M.eyes; x.fill();
      circ(x, cx - ew * 0.32, cy - eh * 0.38, ew * 0.36); x.fillStyle = '#FFFFFF'; x.fill();
      circ(x, cx + ew * 0.3, cy + eh * 0.38, ew * 0.15); x.fill();
      if (blink > 0.02) {                                               // upper lid comes down (skin), with an ink edge
        const ly = cy - eh + 2 * eh * blink;
        x.save(); ell(x, cx, cy, ew * 1.15, eh * 1.12); x.clip(); x.fillStyle = M.skin; x.fillRect(cx - ew * 2, cy - eh * 2, ew * 4, ly - (cy - eh * 2)); x.restore();
        line(x, [[cx - ew * 1.12, ly + eh * 0.12], [cx + ew * 1.12, ly + eh * 0.12]], LW * 0.95);
      }
    }
    x.restore();
    if (M.blush) { const b = HP(sg * 0.66, 0.42), kb = vis(b[2]); if (kb > 0) { x.save(); x.globalAlpha *= 0.32 * kb; ell(x, b[0], b[1], Rs * 0.13 * Math.max(0.3, b[2]), Rs * 0.07); x.fillStyle = '#F07A7A'; x.fill(); x.restore(); } }
    if (M.freckles) { for (let i = 0; i < 3; i++) { const fp = HP(sg * (0.5 + i * 0.09), 0.36 + (i % 2) * 0.05), kf = vis(fp[2]); if (kf > 0) { circ(x, fp[0], fp[1], Rs * 0.016); x.fillStyle = `rgba(150,80,50,${0.6 * kf})`; x.fill(); } } }
  }
  if (M.decay) {                                                        // walkers: hollow cheeks, a bruise, a scratch
    for (const sg of [-1, 1]) {
      const a = HP(sg * 0.78, 0.3), b = HP(sg * 0.6, 0.55), k = vis(Math.min(a[2], b[2]) + 0.1);
      if (k > 0) { x.save(); x.globalAlpha *= 0.7 * k; curve(x, a, [lerp(a[0], b[0], 0.5) - sg * Rs * 0.05, lerp(a[1], b[1], 0.5)], b, LW * 0.6, 'rgba(50,40,50,0.8)'); x.restore(); }
    }
    const bl = HP(0.55, -0.35), kb = vis(bl[2]); if (kb > 0) { x.save(); x.globalAlpha *= 0.4 * kb; ell(x, bl[0], bl[1], Rs * 0.16 * Math.max(0.4, bl[2]), Rs * 0.1, 0.5); x.fillStyle = '#4E5A3C'; x.fill(); x.restore(); }
    const sc0 = HP(-0.25, -0.5), sc1 = HP(-0.05, -0.38), ks = vis(Math.min(sc0[2], sc1[2])); if (ks > 0) { x.save(); x.globalAlpha *= 0.75 * ks; line(x, [sc0, sc1], LW * 0.55, '#6A2A2A'); x.restore(); }
  }
  // nose
  const n = HP(0, 0.33, 1.02);
  if (M.nose === 'dot' && n[2] > 0.3) { circ(x, n[0], n[1], Rs * 0.022); x.fillStyle = 'rgba(120,60,40,0.55)'; x.fill(); }
  if (M.nose && Math.abs(n[2]) < 0.55 && n[2] > -0.2) {                 // a little bump on the profile line
    const k = clamp((0.55 - Math.abs(n[2])) / 0.3), nb = HP(0, 0.33, 1.06);
    x.save(); x.globalAlpha *= k; blob(x, [(g) => circ(g, nb[0], nb[1], Rs * 0.07)], M.skin, M.skin, { line: LW * 0.8 }); x.restore();
  }
  // mouth
  const m = HP(0, 0.5), km = vis(m[2] + 0.12); if (km <= 0) return;
  const f = Math.max(0.35, m[2]), mw = Rs * 0.24 * f, talk = clamp(P.talk ?? 0);
  x.save(); x.globalAlpha *= km;
  let shape = ex.mouth, amt = ex.m;
  if (talk > 0.05 && shape !== 'o') { shape = 'open'; amt = 0.25 + talk * 0.75; }
  const [cx, cy] = m;
  if (shape === 'smile') curve(x, [cx - mw * 0.7, cy - Rs * 0.01], [cx, cy + Rs * 0.06 * (0.5 + amt)], [cx + mw * 0.7, cy - Rs * 0.01], LW * 0.9);
  else if (shape === 'flat') line(x, [[cx - mw * 0.55, cy + Rs * 0.01], [cx + mw * 0.55, cy + Rs * 0.01]], LW * 0.9);
  else if (shape === 'frown') curve(x, [cx - mw * 0.6, cy + Rs * 0.04], [cx, cy - Rs * 0.04 * (0.5 + amt)], [cx + mw * 0.6, cy + Rs * 0.04], LW * 0.9);
  else if (shape === 'wobble') { x.beginPath(); x.moveTo(cx - mw * 0.6, cy + Rs * 0.02); x.bezierCurveTo(cx - mw * 0.25, cy - Rs * 0.03, cx + mw * 0.05, cy + Rs * 0.05, cx + mw * 0.6, cy - Rs * 0.01); x.lineWidth = lw(x, LW * 0.9); x.strokeStyle = INK; x.lineCap = 'round'; x.stroke(); }
  else if (shape === 'smirk') curve(x, [cx - mw * 0.55, cy + Rs * 0.015], [cx + mw * 0.1, cy + Rs * 0.05], [cx + mw * 0.65, cy - Rs * 0.035], LW * 0.9);
  else if (shape === 'teeth') {                                        // a walker's mouth: open, ragged teeth top and bottom
    const h = Rs * (0.09 + 0.14 * amt) + Rs * 0.05 * Math.max(0, Math.sin(t * 5)) * amt, w = mw * 1.05;
    x.beginPath(); x.ellipse(cx, cy + h * 0.25, w * 0.75, h * 0.6, 0, 0, TAU); x.fillStyle = '#2A1416'; x.fill();
    x.save(); x.clip();
    x.fillStyle = '#E2DCB8';
    for (let k = -3; k <= 3; k++) { const tx = cx + k * w * 0.2; x.fillRect(tx - w * 0.08, cy + h * 0.25 - h * 0.62, w * 0.16, h * (0.26 + 0.05 * (k % 2))); x.fillRect(tx - w * 0.07, cy + h * 0.25 + h * 0.6 - h * (0.22 + 0.05 * ((k + 1) % 2)), w * 0.14, h * 0.3); }
    x.restore();
    x.beginPath(); x.ellipse(cx, cy + h * 0.25, w * 0.75, h * 0.6, 0, 0, TAU); x.lineWidth = lw(x, LW * 0.85); x.strokeStyle = INK; x.stroke();
  } else if (shape === 'o' || shape === 'snore') {
    const r = Rs * (shape === 'o' ? 0.07 + 0.04 * amt : 0.035 + 0.02 * Math.sin(t * 3)); ell(x, cx, cy + Rs * 0.02, r * 0.8 * f + r * 0.2, r);
    x.fillStyle = '#5A1E22'; x.fill(); x.lineWidth = lw(x, LW * 0.8); x.strokeStyle = INK; x.stroke();
  } else {                                                              // grin / open: a D shape with a tongue
    const h = Rs * (0.05 + 0.11 * amt), w = mw * (shape === 'grin' ? 1.1 : 0.85);
    x.beginPath(); x.moveTo(cx - w * 0.75, cy - h * 0.15); x.quadraticCurveTo(cx, cy - h * 0.3, cx + w * 0.75, cy - h * 0.15); x.quadraticCurveTo(cx + w * 0.55, cy + h, cx, cy + h); x.quadraticCurveTo(cx - w * 0.55, cy + h, cx - w * 0.75, cy - h * 0.15); x.closePath();
    x.fillStyle = '#5A1E22'; x.fill();
    x.save(); x.clip(); ell(x, cx, cy + h * 0.95, w * 0.5, h * 0.5); x.fillStyle = '#E8707A'; x.fill(); x.restore();
    x.lineWidth = lw(x, LW * 0.85); x.strokeStyle = INK; x.lineJoin = 'round'; x.stroke();
  }
  x.restore();
}
function brows(x, M, ex, P, HP, Rs, LW) {
  if (!M.brows) return;
  const [raise, slant] = ex.brow;
  for (const sg of [-1, 1]) {
    const lat = -0.07 - raise * 0.09;
    const a = HP(sg * 0.2, lat - slant * 0.06 * 0.9 + 0.02), b = HP(sg * 0.62, lat + slant * 0.04);
    const k = vis(Math.min(a[2], b[2]) + 0.1); if (k <= 0) continue;
    x.save(); x.globalAlpha *= k; line(x, [[a[0], a[1]], [b[0], b[1]]], LW * 1.25 * M.brows, shadeOf(M.hair, 0.5)); x.restore();
  }
}
function glasses(x, M, HP, Rs, LW, aH) {
  const col = M.glasses.col || INK, pts = [];
  for (const sg of [-1, 1]) {
    const e = HP(sg * 0.42, 0.16, 1.02), k = vis(e[2]); if (k <= 0) continue;
    pts.push(e);
    x.save(); x.globalAlpha *= k; ell(x, e[0], e[1], Rs * 0.2 * Math.max(0.3, e[2]), Rs * 0.19); x.lineWidth = lw(x, LW * 0.75); x.strokeStyle = col; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.fill(); x.restore();
  }
  if (pts.length === 2) { const b = HP(0, 0.12, 1.03); curve(x, [pts[0][0] + Rs * 0.19 * pts[0][2], pts[0][1]], [b[0], b[1] - Rs * 0.04], [pts[1][0] - Rs * 0.19 * pts[1][2], pts[1][1]], LW * 0.7, col); }
  else if (pts.length === 1) {                                        // profile: one lens + the arm back to the near ear
    const e = pts[0], ears = [HP(-Math.PI / 2, 0.1), HP(Math.PI / 2, 0.1)], er = ears[0][2] > ears[1][2] ? ears[0] : ears[1];
    const side = Math.sign(er[0] - e[0]) || 1;
    line(x, [[e[0] + side * Rs * 0.2 * Math.max(0.3, e[2]), e[1]], [er[0], er[1]]], LW * 0.7, col);
  }
}
function hairCap(x, M, HS, HP, hx, hy, rx, ry, aH, LW, off, s, R) {
  const hairC = M.hair, hairSh = shadeOf(hairC, 0.3), v = HS.v;
  const N = 44, F = [];
  for (let i = 0; i <= N; i++) {
    const psi = -Math.PI / 2 + Math.PI * i / N; let phi = psi - aH; phi = Math.atan2(Math.sin(phi), Math.cos(phi));
    const lam = clamp(HS.fringe(phi), -1.45, 1.45);
    if (HS.sideOnly && lam > 1.4) { F.push(null); continue; }
    F.push([hx + rx * Math.sin(psi) * Math.cos(lam), hy + ry * Math.sin(lam)]);
  }
  const outer = (g, from, to) => {                                       // the hair's outer edge over the top, right -> left
    const aR = Math.atan2((from[1] - hy) / (ry * v), (from[0] - hx) / (rx * v)), aL = Math.atan2((to[1] - hy) / (ry * v), (to[0] - hx) / (rx * v));
    let a1 = aL; if (a1 > aR) a1 -= TAU;
    const n = 36;
    for (let i = 0; i <= n; i++) {
      const a = aR + (a1 - aR) * i / n; let rr = 1;
      if (HS.spikes) rr += 0.09 * Math.pow(Math.abs(Math.sin((a - aH * 0.6) * HS.spikes * 0.5)), 6) * (Math.sin(a) < 0.2 ? 1 : 0);
      if (HS.curls) rr += 0.05 * Math.abs(Math.sin((a - aH * 0.5) * HS.curls * 0.5));
      g.lineTo(hx + rx * v * rr * Math.cos(a), hy + ry * v * rr * Math.sin(a));
    }
  };
  if (HS.sideOnly) {                                                     // bald: two side tufts only
    const runs = []; let cur = null;
    F.forEach((p) => { if (p) { (cur ||= []).push(p); } else if (cur) { runs.push(cur); cur = null; } }); if (cur) runs.push(cur);
    for (const r of runs) if (r.length > 2) blob(x, [(g) => { g.beginPath(); g.moveTo(r[0][0], r[0][1]); r.forEach((p) => g.lineTo(p[0], p[1])); const m = r[Math.floor(r.length / 2)]; const o = [(m[0] - hx) * 0.08, -ry * 0.12]; for (let i = r.length - 1; i >= 0; i--) g.lineTo(r[i][0] + o[0] * (1 - Math.abs(i / (r.length - 1) - 0.5) * 2) , r[i][1] + o[1] * (1 - Math.abs(i / (r.length - 1) - 0.5) * 2)); g.closePath(); }], hairC, hairSh, { line: LW, off });
    return;
  }
  const hairPath = (g) => { g.beginPath(); g.moveTo(F[0][0], F[0][1]); for (const p of F) g.lineTo(p[0], p[1]); outer(g, F[N], F[0]); g.closePath(); };
  blob(x, [hairPath], hairC, hairSh, { line: LW, off });
  x.save(); hairPath(x); x.clip();
  // strand lines (texture) on whatever side faces the camera
  x.globalAlpha *= 0.6;
  for (const k of [-0.5, 0.15, 0.7, Math.PI - 0.7, Math.PI - 0.1, Math.PI + 0.5]) {
    const back = k > 1.5, a = HP(k, -0.95, 1.0), b = HP(k * (back ? 1 : 0.8) + (back ? 0.12 : 0), back ? 0.3 : -0.45, 1.01);
    if (Math.min(a[2], b[2]) > 0.05) curve(x, a, [lerp(a[0], b[0], 0.35) + 6 * s, lerp(a[1], b[1], 0.5)], b, LW * 0.55, mixHex(hairSh, hairC, 0.3));
  }
  // a sheen on the lit side of the crown (the key light comes from the upper left)
  x.globalAlpha = 0.22;
  x.beginPath(); x.ellipse(hx - rx * 0.12, hy - ry * 0.42, rx * 0.62, ry * 0.36, -0.15, Math.PI * 1.08, Math.PI * 1.62);
  x.lineWidth = R * 0.09 * s; x.lineCap = 'round'; x.strokeStyle = mixHex(hairC, '#FFFFFF', 0.55); x.stroke();
  x.restore();
}
function hat(x, M, HP, hx, hy, rx, ry, aH, LW, off, s, R) {
  const H_ = M.hat, col = H_.col || '#D9B030', sh = shadeOf(col, 0.3), col2 = H_.col2 || shadeOf(col, 0.4);
  const dome = (lamBand, v, g) => {                                      // the crown: everything above latitude lamBand
    const aR = Math.asin(clamp(Math.sin(lamBand) / v, -1, 1)), a0 = aR, a1 = -Math.PI - aR;
    g.beginPath(); for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; g.lineTo(hx + rx * v * Math.cos(a), hy + ry * v * Math.sin(a)); } g.closePath();
  };
  if (H_.type === 'rainhat' || H_.type === 'bucket') {
    const lb = -0.24, by = hy + ry * Math.sin(lb) * 1.02, bw = rx * (H_.type === 'rainhat' ? 1.42 : 1.3), bh = ry * 0.34;
    const back = Math.sin(aH) * rx * 0.1;
    blob(x, [(g) => { g.beginPath(); g.ellipse(hx - back, by, bw, bh, 0, Math.PI, TAU); g.closePath(); }], col, sh, { line: LW, off });
    blob(x, [(g) => dome(lb, 1.13, g)], col, sh, { line: LW, off });
    blob(x, [(g) => { g.beginPath(); g.ellipse(hx - back, by, bw, bh * (H_.type === 'rainhat' ? 1.35 : 1.1), 0, 0, Math.PI); g.lineTo(hx - back - bw, by); g.closePath(); }], col, sh, { line: LW, off });
    curve(x, [hx - rx * 1.1, by - 4 * s], [hx, by + 6 * s], [hx + rx * 1.1, by - 4 * s], LW * 0.6, shadeOf(col, 0.5));
  } else if (H_.type === 'beanie') {
    blob(x, [(g) => dome(-0.18, 1.14, g)], col, sh, { line: LW, off });
    const y0 = hy + ry * Math.sin(-0.3) * 1.14, y1 = hy + ry * Math.sin(-0.12) * 1.14;
    blob(x, [(g) => { g.beginPath(); g.ellipse(hx, (y0 + y1) / 2, rx * 1.16, (y1 - y0) * 0.75, 0, 0, TAU); }], col2, shadeOf(col2, 0.3), { line: LW, off });
    blob(x, [(g) => circ(g, hx - Math.sin(aH) * rx * 0.2, hy - ry * 1.18, R * 0.2 * s)], col2, shadeOf(col2, 0.3), { line: LW, off });
  } else {                                                               // cap / captain: crown + a visor facing forward
    const captain = H_.type === 'captain';
    blob(x, [(g) => dome(-0.3, captain ? 1.12 : 1.1, g)], col, sh, { line: LW, off });
    if (captain) {
      const y0 = hy + ry * Math.sin(-0.45) * 1.12, y1 = hy + ry * Math.sin(-0.28) * 1.12;
      x.save(); dome(-0.28, 1.12, x); x.clip(); x.fillStyle = col2; x.fillRect(hx - rx * 1.3, y0, rx * 2.6, y1 - y0 + 2 * s); x.restore();
      const top = hy - ry * 1.12; blob(x, [(g) => ell(g, hx, top + ry * 0.12, rx * 1.18, ry * 0.2)], col, sh, { line: LW, off });
    }
    const fz = Math.cos(aH);
    if (fz > -0.25) {
      const fv = HP(0, -0.3, 1.1), w = rx * lerp(0.62, 0.72, Math.abs(fz)), h = ry * lerp(0.2, 0.13, Math.abs(fz));
      const cxv = fv[0] + Math.sin(aH) * rx * 0.32;
      blob(x, [(g) => ell(g, cxv, fv[1] + h * 0.35, w, h, Math.sin(aH) * 0.12)], captain ? '#1E2230' : col2, shadeOf(captain ? '#1E2230' : col2, 0.3), { line: LW, off });
    }
    if (captain) { const b = HP(0, -0.42, 1.13); if (b[2] > 0.1) { circ(x, b[0], b[1], R * 0.07 * s); x.fillStyle = '#E8C04A'; x.fill(); x.lineWidth = lw(x, LW * 0.6); x.strokeStyle = INK; x.stroke(); } }
  }
}
