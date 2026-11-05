// Arc Lab engine: shared drawing helpers. The canvas (@napi-rs/canvas, installed in engine/node_modules by INSTALL.md),
// the frame size, easing curves, closed-form springs, a seeded RNG, a smooth-shape helper and the ink-line stroke.
// Every drawing function built on these is a PURE FUNCTION OF TIME: the same t gives the same pixels, so a frame can be
// re-rendered in any order, in any worker, and come out identical.
import path from 'path';
import { fileURLToPath } from 'url';
import canvas from '@napi-rs/canvas';

export const { createCanvas, loadImage, GlobalFonts, Path2D } = canvas;
export const ENGINE = path.dirname(fileURLToPath(import.meta.url));

// the bundled fonts (SIL Open Font License, see fonts/OFL-*.txt): Oswald for captions and cards, Patrick Hand for
// handwriting drawn inside the picture (notes, labels, signs)
GlobalFonts.registerFromPath(path.join(ENGINE, 'fonts', 'Oswald-Variable.ttf'), 'Oswald');
GlobalFonts.registerFromPath(path.join(ENGINE, 'fonts', 'PatrickHand-Regular.ttf'), 'Patrick Hand');

export const W = 1080, H = 1920, FPS = 30;
export const TAU = Math.PI * 2;

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));           // 0..1 progress of t through [a, b]
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const io = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const out = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const out5 = (t) => 1 - Math.pow(1 - clamp(t), 5);
export const inn = (t) => Math.pow(clamp(t), 3);
export const in2 = (t) => Math.pow(clamp(t), 2);
export const sine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
export const outBack = (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };

// Damped spring step response 0 -> 1 (closed form). f = natural frequency in Hz, z = damping ratio (< 1 bounces).
export function spring(t, f = 3, z = 0.5) {
  if (t <= 0) return 0;
  const w = TAU * f;
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}
// Impulse-like kick: 0 at rest, swings then settles back to 0 (a spring released from a displaced start).
export function kick(t, f = 3, z = 0.35) { if (t <= 0) return 0; return Math.exp(-z * TAU * f * t) * Math.sin(TAU * f * Math.sqrt(1 - z * z) * t); }

// Seeded RNG (mulberry32): never Math.random, so a re-render gives identical frames.
export function rng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (a, b) => a + (b - a) * next();
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}
// Stateless hash noise 0..1 for (i, seed): use it for per-item variation inside draw() (grass blades, waves, stars).
export const h01 = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// Smooth closed (or open) shape through points with Catmull-Rom tangents turned into cubic beziers.
// A point written [x, y, 1] is a sharp corner (no tangent through it).
export function spline(x, pts, closed = true, tension = 1) {
  const n = pts.length, P = (i) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  x.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = tension / 6;
    const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    x.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  if (closed) x.closePath();
}

// Outline stroke with a fixed on-screen width (in 1080x1920 frame pixels), whatever scale the current transform holds.
// (Skia keeps paths in user space, so we divide by the transform's area scale.) VIEW.s is the supersampling factor:
// the look engine sets it, so ink stays the same width at 2x.
export const VIEW = { s: 1 };
export const INK = '#2B1D17';
export function ink(x, width, color = INK) {
  const m = x.getTransform(), sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
  x.lineWidth = (width * VIEW.s) / sc; x.strokeStyle = color; x.lineJoin = 'round'; x.lineCap = 'round';
  x.stroke();
}

export const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };
export const mixHex = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
export const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
/** darken (k < 0) or lighten (k > 0) a hex colour toward black / white */
export const shadeHex = (h, k) => (k < 0 ? mixHex(h, '#000000', -k) : mixHex(h, '#FFFFFF', k));
