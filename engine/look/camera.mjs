// LOOK ENGINE / camera: pure functions of time that return numbers for your own camera code, plus a matrix
// helper for 2D layer cameras with depth parallax. Rule: the camera is already moving on the first frame of every
// shot (use push()/drift(), never an ease that starts at rest).
import { W, H } from './core.mjs';
import { SS } from './core.mjs';

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sm = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
// smooth value noise from summed sines (deterministic; seed picks the phases)
const noise = (t, seed) => Math.sin(t * 1.7 + seed * 1.3) * 0.5 + Math.sin(t * 3.1 + seed * 2.9) * 0.3 + Math.sin(t * 5.3 + seed * 4.7) * 0.2;

/** Creeping push-in: zoom multiplier 1 -> 1 + amt, constant speed from frame 0 (dread beats: amt 0.02-0.05). */
export function push(t, t0, t1, amt = 0.04) { return 1 + amt * clamp((t - t0) / (t1 - t0)); }
/**
 * Punch-in on a reveal word: before tHit 1, from tHit a hard cut to k (1.25-1.35)
 * that lands with a small overshoot and keeps creeping. Returns a zoom multiplier.
 */
export function punch(t, tHit, k = 1.3, { over = 0.035, creep = 0.02 } = {}) {
  tHit = (Math.round(tHit * 30 - 0.5) + 0.5) / 30;          // snap to a frame EDGE: no frame's motion blur straddles the jump
  if (t < tHit) return 1;
  const u = t - tHit; return k * (1 + over * Math.exp(-u * 9) + creep * u);
}
/**
 * Whip-pan between two linked shots: offsets for the camera around the cut at tCut, and the blur vector.
 * dir = [1, 0] pans right (content slides left). dist = travel in frame widths. dur = seconds each side.
 * Returns { dx, dy, blur: [vx, vy] } in frame px; blur is the per-frame motion (pass it in the shot's meta.blur).
 */
export function whip(t, tCut, { dir = [1, 0], dist = 1.0, dur = 0.16 } = {}) {
  const D = dist * W, fps = 30;
  const off = (tt) => {
    if (tt < tCut) { const u = clamp((tt - (tCut - dur)) / dur); return -D * u * u * u; }        // accelerate out
    const u = clamp((tt - tCut) / dur); return D * (1 - u) * (1 - u) * (1 - u);                   // decelerate in
  };
  const o = off(t), v = (off(t + 0.5 / fps) - off(t - 0.5 / fps));
  const vClamp = Math.abs(v) > D * 0.5 ? 0 : v;                                                    // never across the cut itself
  return { dx: o * dir[0], dy: o * dir[1], blur: [vClamp * dir[0] * 0.5, vClamp * dir[1] * 0.5] };
}
/** Decaying shake after an impact at tHit: [dx, dy, rot]. amp px, freq Hz, decay 1/s. */
export function shake(t, tHit, { amp = 14, freq = 16, decay = 7, rot = 0.006, seed = 1 } = {}) {
  if (t < tHit) return [0, 0, 0];
  const u = t - tHit, e = Math.exp(-u * decay), w = u * freq;
  return [amp * e * noise(w, seed), amp * 0.7 * e * noise(w, seed + 17), rot * e * noise(w, seed + 33)];
}
/** Slow handheld drift: [dx, dy, rot] (amp px). Keeps holds alive; on dread beats use amp 4-8. */
export function drift(t, { amp = 5, freq = 0.35, rot = 0.002, seed = 2 } = {}) {
  const w = t * freq * 6.283;
  return [amp * noise(w, seed), amp * 0.8 * noise(w * 0.9, seed + 5), rot * noise(w * 0.7, seed + 9)];
}

/**
 * 2D camera as a matrix [a, b, c, d, e, f] in FRAME px (1080x1920): zoom about (cx, cy), then offset (dx, dy) and roll.
 * depth = parallax factor for this layer (sky 0.3, far 0.6, mid 1, near 1.3, foreground 1.6): zoom^depth, offsets x depth.
 */
export function camMatrix({ zoom = 1, cx = W / 2, cy = H / 2, dx = 0, dy = 0, rot = 0 } = {}, depth = 1) {
  const z = Math.pow(zoom, depth), ox = dx * depth, oy = dy * depth, r = rot * depth;
  const c = Math.cos(r) * z, s = Math.sin(r) * z;
  // p' = R*z*(p - (cx,cy)) + (cx,cy) + (ox,oy)
  return [c, s, -s, c, cx - (c * cx - s * cy) + ox, cy - (s * cx + c * cy) + oy];
}
/** set a layer context's transform to a camera matrix (adds the supersampling scale) */
export function applyCam(x, m) { x.setTransform(SS * m[0], SS * m[1], SS * m[2], SS * m[3], SS * m[4], SS * m[5]); }
/** map a frame-space point through a camera matrix */
export const camPt = (m, X, Y) => [m[0] * X + m[2] * Y + m[4], m[1] * X + m[3] * Y + m[5]];
export { sm as smooth01 };
