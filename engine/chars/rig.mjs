// Arc Lab character system: shared rig maths and drawing helpers (used by human.mjs, critter.mjs and your own kits).
//
// THE IDEA: every character is a few simple 3D volumes (spheres, capsules, tubes) in the character's own space, turned
// about the vertical axis and projected flat. One number, `turn`, rotates the whole character: 0 = facing the camera,
// +1 = profile facing screen-right, -1 = profile facing screen-left, +-2 = seen from behind. Features (eyes, ears, hair
// parting, buttons, collar) are placed by longitude/latitude on those volumes, so they slide and foreshorten correctly
// at any angle and a head turn is ONE smooth animation, never a pop between drawings.
//
// Character space: lx = the character's side axis, ly = DOWN (screen y), lz = forward (toward its nose / chest).
// Style: the series' cel look. A soft ink outline, a two-tone cel shade with the light from the upper left, flat colours.
// Outlines come from an INK UNDERLAY (each group of parts is stroked twice as wide in ink, then filled), so parts that
// belong together (body + head of a creature, a coat + its hem) merge without lines inside, and separate groups (an arm
// in front of the body) get a clean outline.
import { VIEW, INK, TAU, clamp, lerp, mixHex } from '../lib.mjs';

export { INK };
/** a projector for a character standing at screen (X, Y) with scale s and turn (see above) */
export function projector(X, Y, s, turn) {
  const a = turn * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
  /** local (lx, ly, lz) -> [screenX, screenY, depth]; depth > 0 = toward the camera */
  const P = (lx, ly, lz) => [X + (lx * c + lz * sn) * s, Y + ly * s, (lz * c - lx * sn) * s];
  P.a = a; P.c = c; P.sn = sn; P.s = s; P.X = X; P.Y = Y;
  return P;
}
/** screen-space line width (frame px) that stays the same at any transform scale and at 2x supersampling */
export function lw(x, w) { const m = x.getTransform(), sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; return (w * VIEW.s) / sc; }

/**
 * Draw a group of parts as ONE inked, cel-shaded shape.
 * parts: [fn(x) that builds a path (it calls beginPath itself)], base/shade: colours, line: outline width (frame px),
 * off: [dx, dy] shift of the lit fill toward the light (frame px; bigger = a wider shade crescent on the far side).
 */
export function blob(x, parts, base, shade, { line = 4, ink = INK, off = [-3, -4], noInk = false } = {}) {
  if (!parts.length) return;
  if (!noInk && line > 0) {
    x.save(); x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = ink; x.lineWidth = lw(x, line) * 2;
    for (const p of parts) { p(x); x.stroke(); }
    x.restore();
  }
  for (const p of parts) { p(x); x.fillStyle = shade; x.fill(); }
  if (base !== shade) {
    for (const p of parts) {
      x.save(); p(x); x.clip(); x.translate(off[0], off[1]);
      for (const q of parts) { q(x); x.fillStyle = base; x.fill(); }
      x.restore();
    }
  }
}
/** a tube (limb) through points [[x, y], ...]: ink underlay + fill (round caps) */
export function tube(x, pts, width, col, { line = 4, ink = INK, shade = null, off = [-2, -3] } = {}) {
  const path = () => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); };
  x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
  if (line > 0) { path(); x.strokeStyle = ink; x.lineWidth = width + lw(x, line) * 2; x.stroke(); }
  path(); x.strokeStyle = shade || col; x.lineWidth = width; x.stroke();
  if (shade && shade !== col) { x.translate(off[0], off[1]); path(); x.strokeStyle = col; x.lineWidth = width * 0.62; x.stroke(); }
  x.restore();
}
/** a plain ink stroke along points (open), width in frame px */
export function line(x, pts, width, col = INK, cap = 'round') {
  x.save(); x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
  x.lineWidth = lw(x, width); x.strokeStyle = col; x.lineCap = cap; x.lineJoin = 'round'; x.stroke(); x.restore();
}
/** quadratic curve stroke a -> b bending through control c */
export function curve(x, a, c, b, width, col = INK) {
  x.save(); x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo(c[0], c[1], b[0], b[1]);
  x.lineWidth = lw(x, width); x.strokeStyle = col; x.lineCap = 'round'; x.stroke(); x.restore();
}
export const ell = (x, cx, cy, rx, ry, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); };
export const circ = (x, cx, cy, r) => { x.beginPath(); x.arc(cx, cy, Math.max(0.01, r), 0, TAU); };
export function poly(x, P, close = true) { x.beginPath(); x.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) x.lineTo(P[i][0], P[i][1]); if (close) x.closePath(); }
/** smooth closed/open path through points (quadratic midpoints) */
export function smoothPath(x, P, closed = true) {
  x.beginPath();
  if (P.length < 3) { x.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) x.lineTo(P[i][0], P[i][1]); if (closed) x.closePath(); return; }
  if (closed) {
    const n = P.length, m0 = [(P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2]; x.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; x.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    x.closePath(); return;
  }
  x.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; const m = i === P.length - 2 ? b : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; x.quadraticCurveTo(a[0], a[1], m[0], m[1]); }
}
/**
 * A foot, shoe or paw seen from any angle: a flat sole on the ground (y0), a domed top, the toe end lower and rounder
 * than the heel when seen side-on. cx = centre, hw = half width on screen, hL / hR = height at the left / right end,
 * r = sole corner radius. One closed path, so it inks and shades as one shape.
 */
export function footPath(g, cx, y0, hw, hL, hR, r) {
  const L = cx - hw, R = cx + hw, top = Math.max(hL, hR), rr = Math.min(r, hw * 0.45, top * 0.45);
  g.beginPath(); g.moveTo(cx, y0); g.lineTo(R - rr, y0); g.quadraticCurveTo(R, y0, R, y0 - rr);
  g.bezierCurveTo(R, y0 - hR * 0.95, R - hw * 0.38, y0 - top, cx, y0 - top);
  g.bezierCurveTo(L + hw * 0.38, y0 - top, L, y0 - hL * 0.95, L, y0 - rr);
  g.quadraticCurveTo(L, y0, L + rr, y0); g.closePath();
}
/** the capsule hull of two circles (c1, r1) and (c2, r2): circles + the band between them, as one path builder each */
export function capsuleParts(c1, r1, c2, r2) {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy);
  const parts = [(x) => circ(x, c1[0], c1[1], r1), (x) => circ(x, c2[0], c2[1], r2)];
  if (d > 0.5) {
    const nx = -dy / d, ny = dx / d;
    parts.push((x) => poly(x, [[c1[0] + nx * r1, c1[1] + ny * r1], [c2[0] + nx * r2, c2[1] + ny * r2], [c2[0] - nx * r2, c2[1] - ny * r2], [c1[0] - nx * r1, c1[1] - ny * r1]]));
  }
  return parts;
}
/** normalise a 3-vector */
export const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
/** rotate (ly, lz) about the lx axis by angle p (pitch: positive tips the forward end UP) around pivot (py, pz) */
export function pitch(v, p, py = 0, pz = 0) {
  if (!p) return v;
  const c = Math.cos(p), s = Math.sin(p), y = v[1] - py, z = v[2] - pz;
  return [v[0], py + y * c - z * s, pz + y * s + z * c];
}
/** a shade colour for a base colour: darker and cooler (the cel's far side) */
export const shadeOf = (hex, k = 0.28) => mixHex(mixHex(hex, '#000000', k * 0.75), '#3A3A78', k * 0.45);
/** the lit offset vector for the cel fill at scale s (light from the upper left by default) */
export const litOff = (s, light = [-0.6, -0.8], k = 5) => [light[0] * k * s, light[1] * k * s];
/** sort items { d (depth), draw() } back to front and draw them */
export function painter(items) { items.filter(Boolean).sort((p, q) => p.d - q.d).forEach((it) => it.draw()); }
export { clamp, lerp };
