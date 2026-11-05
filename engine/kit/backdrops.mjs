// Arc Lab engine: generic BACKDROP helpers (sky, stars, moon, sea, ground, hills, fog, rain). Plain canvas drawing in
// frame coordinates (1080 x 1920), pure functions of t, drawn a little past the frame edges so camera moves never show
// a border. Series kits build their sets on top of these (see templates/kit/sets.mjs and CHARS_API.md).
import { W, H, TAU, clamp, lerp, h01, rgba, mixHex } from '../lib.mjs';

const M = 260;                                                       // margin past the frame for camera moves
/** vertical sky gradient: stops = [[0, '#0B1430'], [0.6, '#24345E'], [1, '#6A6A8E']] over y0..y1 */
export function sky(x, { stops = [[0, '#0B1430'], [0.55, '#22325C'], [1, '#5E6690']], y0 = -M, y1 = H * 0.55 } = {}) {
  const g = x.createLinearGradient(0, y0, 0, y1);
  for (const [k, c] of stops) g.addColorStop(k, c);
  x.fillStyle = g; x.fillRect(-M, y0 - M, W + 2 * M, y1 - y0 + 2 * M + H);
}
/** star field above the horizon (twinkle: 0..1) */
export function stars(x, { n = 140, seed = 3, t = 0, hz = H * 0.5, twinkle = 0.5, col = '#FFFFFF', y0 = -M } = {}) {
  x.save(); x.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const sx = -M + h01(i, seed) * (W + 2 * M), sy = y0 + h01(i, seed + 1) * (hz - y0), r = 0.8 + 2.2 * h01(i, seed + 2) ** 3;
    x.globalAlpha = clamp((0.35 + 0.65 * h01(i, seed + 3)) * (1 - twinkle * 0.5 * (1 + Math.sin(t * (1 + 3 * h01(i, seed + 4)) + i))) * clamp((hz - sy) / 200));
    x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fill();
  }
  x.restore();
}
/** a moon disc with soft craters (put a glow() for it in an add layer) */
export function moon(x, { cx = 780, cy = 360, r = 70, col = '#F4F1E4', shade = '#D8D4C6' } = {}) {
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fillStyle = col; x.fill(); x.clip();
  x.fillStyle = shade; for (const [u, v, k] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.35, 0.12], [0.35, -0.35, 0.09]]) { x.beginPath(); x.arc(cx + u * r, cy + v * r, k * r, 0, TAU); x.fill(); }
  x.restore();
}
/**
 * The sea from the horizon down: depth bands + moving wave crests (lighter strokes), optional moon/lamp glitter path.
 * glitter: { x, w, col } a column of sparkles under a light source.
 */
export function sea(x, { hz = H * 0.5, t = 0, far = '#2A4470', near = '#0E1C34', crest = '#8FB0D8', y1 = H + M, speed = 1, rows = 26, glitter = null, seed = 7 } = {}) {
  const g = x.createLinearGradient(0, hz, 0, y1); g.addColorStop(0, far); g.addColorStop(1, near);
  x.fillStyle = g; x.fillRect(-M, hz, W + 2 * M, y1 - hz);
  x.save(); x.lineCap = 'round';
  for (let r = 0; r < rows; r++) {
    const u = r / rows, y = hz + (y1 - hz) * u * u + 6, k = 0.4 + 2.6 * u * u;          // perspective: rows spread toward us
    x.strokeStyle = rgba(crest, 0.18 + 0.32 * u); x.lineWidth = 1.2 + 4 * u;
    const n = Math.round(10 + 8 * (1 - u));
    for (let i = 0; i < n; i++) {
      const ph = h01(i + r * 31, seed), len = (30 + 90 * h01(i, seed + r)) * k * 0.45;
      const sx = ((ph * (W + 2 * M) + t * speed * (12 + 30 * u) * (h01(i, r) > 0.5 ? 1 : -0.6)) % (W + 2 * M) + (W + 2 * M)) % (W + 2 * M) - M;
      const bob = Math.sin(t * 1.6 + i * 1.7 + r) * 3 * k;
      x.beginPath(); x.moveTo(sx - len, y + bob); x.quadraticCurveTo(sx, y + bob - 5 * k, sx + len, y + bob); x.stroke();
    }
  }
  if (glitter) {
    const { x: gx, w = 120, col = '#FFF2C8' } = glitter;
    for (let i = 0; i < 90; i++) {
      const u = h01(i, seed + 9), y = hz + 4 + (y1 - hz) * u * u, spread = w * (0.3 + 1.7 * u);
      const sx = gx + (h01(i, seed + 10) - 0.5) * spread, a = clamp(Math.sin(t * 3 + i * 2.3) * 0.5 + 0.5) * (1 - u * 0.6);
      x.fillStyle = rgba(col, 0.75 * a); x.fillRect(sx - 6 - 14 * u, y, 12 + 28 * u, 2 + 3 * u);
    }
  }
  x.restore();
}
/** a ground plane from the horizon down (two-colour gradient + soft texture dots) */
export function ground(x, { hz = H * 0.6, far = '#6E7A5A', near = '#3A4630', y1 = H + M, seed = 5, texture = 0.25 } = {}) {
  const g = x.createLinearGradient(0, hz, 0, y1); g.addColorStop(0, far); g.addColorStop(1, near);
  x.fillStyle = g; x.fillRect(-M, hz, W + 2 * M, y1 - hz);
  if (texture > 0) { x.save(); for (let i = 0; i < 220; i++) { const u = h01(i, seed), y = hz + (y1 - hz) * u * u; x.fillStyle = rgba(h01(i, seed + 1) > 0.5 ? '#000000' : '#FFFFFF', texture * 0.12); x.beginPath(); x.ellipse(-M + h01(i, seed + 2) * (W + 2 * M), y, 6 + 26 * u, 2 + 7 * u, 0, 0, TAU); x.fill(); } x.restore(); }
}
/** silhouette ridges: layers [[baseY, amplitude, colour], ...] back to front */
export function hills(x, { layers = [[H * 0.48, 60, '#3A4A6A'], [H * 0.52, 40, '#2A3654']], seed = 11, y1 = H + M } = {}) {
  layers.forEach(([by, amp, col], li) => {
    x.beginPath(); x.moveTo(-M, y1);
    for (let i = 0; i <= 48; i++) { const px = -M + (W + 2 * M) * i / 48, n = Math.sin(i * 0.37 + li * 2 + seed) * 0.5 + Math.sin(i * 0.91 + seed * 3) * 0.3 + Math.sin(i * 0.13 + li) * 0.2; x.lineTo(px, by - amp * (0.5 + 0.5 * n)); }
    x.lineTo(W + M, y1); x.closePath(); x.fillStyle = col; x.fill();
  });
}
/** drifting fog bands (draw on a far or mid layer, or on a near layer at low alpha) */
export function fog(x, { y = H * 0.5, h = 260, t = 0, a = 0.35, col = '#C8D2E4', bands = 4, speed = 14, seed = 2 } = {}) {
  x.save();
  for (let i = 0; i < bands; i++) {
    const yy = y + (h01(i, seed) - 0.5) * h, w = 700 + 600 * h01(i, seed + 1), sx = ((h01(i, seed + 2) * (W + 2 * M) + t * speed * (0.6 + h01(i, seed + 3))) % (W + 2 * M + w)) - M - w * 0.5;
    const g = x.createRadialGradient(sx, yy, 0, sx, yy, w * 0.5); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    x.save(); x.translate(sx, yy); x.scale(1, 0.22); x.translate(-sx, -yy); x.fillStyle = g; x.beginPath(); x.arc(sx, yy, w * 0.5, 0, TAU); x.fill(); x.restore();
  }
  x.restore();
}
/** rain streaks (a near layer with a short shutter looks best) */
export function rain(x, { t = 0, n = 160, seed = 4, angle = 0.18, a = 0.35, col = '#C8D8F0', len = 46, speed = 1900 } = {}) {
  x.save(); x.strokeStyle = rgba(col, a); x.lineCap = 'round';
  const dx = Math.sin(angle), dy = Math.cos(angle);
  for (let i = 0; i < n; i++) {
    const L = len * (0.6 + 0.8 * h01(i, seed)), sx = -M + h01(i, seed + 1) * (W + 2 * M), y = ((h01(i, seed + 2) * (H + 2 * M) + t * speed * (0.8 + 0.4 * h01(i, seed + 3))) % (H + 2 * M)) - M;
    x.lineWidth = 1.5 + 1.5 * h01(i, seed + 4); x.beginPath(); x.moveTo(sx + dx * (y + M) * 0.2, y); x.lineTo(sx + dx * (y + M) * 0.2 + dx * L, y + dy * L); x.stroke();
  }
  x.restore();
}
export { mixHex, lerp };
