// LOOK ENGINE / light: one key light per shot. Float passes on layer buffers (rim, shadow side, cast
// shadow, point lights) and on the frame (light shafts, bloom with faces protected, sun glare, light pool,
// whip blur), plus canvas helpers that draw glows into an additive layer (sparks, glowing eyes, screens, lamps).
import { createCanvas, clamp } from '../lib.mjs';
import { W, H, QW, QH, qbuf, blur, down4, addUp4, sampA } from './core.mjs';

// ================================================================ layer passes (float, premultiplied linear)
const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
/** direction (unit vector) from a layer's bbox centre toward the key light position */
export function dirTo(bb, sun) { return unit([sun[0] - (bb[0] + bb[2]) / 2, sun[1] - (bb[1] + bb[3]) / 2]); }

/**
 * Warm rim: a band just INSIDE the silhouette edge that faces the light. `inset` skips the ink outline so it reads as a
 * cel rim, not a glowing sticker border. dist = band width (px). Adds col * k (scaled by the pixel's own alpha).
 */
export function rim(buf, bb, dir, { dist = 6, inset = 0, col, k = 1, flat = 0.35 }) {
  const [dx, dy] = dir, [x0, y0, x1, y1] = bb;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4, a = buf[i + 3]; if (a < 0.02) continue;
    const ins = inset ? sampA(buf, x + dx * inset, y + dy * inset) : 1; if (ins < 0.05) continue;
    const o1 = sampA(buf, x + dx * (inset + dist), y + dy * (inset + dist)), o2 = sampA(buf, x + dx * (inset + dist * 0.55), y + dy * (inset + dist * 0.55));
    const e = a * ins * Math.max(0, 1 - 0.5 * o1 - 0.5 * o2); if (e < 0.003) continue;
    // light reflected by the surface's own colour (albedo) plus a little flat light, so a navy jacket gets a warm
    // navy edge rather than a cream sticker border
    const ka = e * k * (1 - flat) * 1.5, kf = e * k * flat * a;
    buf[i] += col[0] * (buf[i] * ka + kf); buf[i + 1] += col[1] * (buf[i + 1] * ka + kf); buf[i + 2] += col[2] * (buf[i + 2] * ka + kf);
  }
}
/**
 * Shadow side: a soft band along the silhouette edge facing AWAY from the light, multiplied toward a cool shadow
 * colour. width = band width (px). k = strength 0..1.
 */
export function shade(buf, bb, dir, { width = 22, col, k = 0.4 }) {
  const dx = -dir[0], dy = -dir[1], [x0, y0, x1, y1] = bb;
  // The band looks across the shape's edge at a SOFTENED silhouette (alpha box-blurred along the edge direction), so
  // thin things just past an edge (legs under a body, fingers past a sleeve) don't print light/dark stripes onto the
  // shape above them; broad edges shade exactly as before.
  const bw = x1 - x0, bh = y1 - y0; if (bw <= 0 || bh <= 0) return;
  const r = Math.max(2, Math.round(width * 0.9)), SA = new Float32Array(bw * bh), along = Math.abs(dy) >= Math.abs(dx);
  if (along) for (let y = 0; y < bh; y++) {                            // light from above/below: blur each row
    let acc = 0; const row = (y + y0) * W;
    for (let x = -r; x < bw + r; x++) {
      const xi = x + r, xo = x - r - 1;
      if (xi >= 0 && xi < bw) acc += buf[(row + x0 + xi) * 4 + 3];
      if (xo >= 0 && xo < bw) acc -= buf[(row + x0 + xo) * 4 + 3];
      if (x >= 0 && x < bw) SA[y * bw + x] = acc / (2 * r + 1);
    }
  } else for (let x = 0; x < bw; x++) {                                // light from the side: blur each column
    let acc = 0;
    for (let y = -r; y < bh + r; y++) {
      const yi = y + r, yo = y - r - 1;
      if (yi >= 0 && yi < bh) acc += buf[((y0 + yi) * W + x0 + x) * 4 + 3];
      if (yo >= 0 && yo < bh) acc -= buf[((y0 + yo) * W + x0 + x) * 4 + 3];
      if (y >= 0 && y < bh) SA[y * bw + x] = acc / (2 * r + 1);
    }
  }
  const sb = (fx, fy) => { const xx = Math.round(fx) - x0, yy = Math.round(fy) - y0; return xx < 0 || yy < 0 || xx >= bw || yy >= bh ? 0 : SA[yy * bw + xx]; };
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4, a = buf[i + 3]; if (a < 0.02) continue;
    const o1 = sb(x + dx * width, y + dy * width), o2 = sb(x + dx * width * 0.5, y + dy * width * 0.5), o3 = sampA(buf, x + dx * width * 0.22, y + dy * width * 0.22);
    const e = Math.max(0, 1 - 0.3 * o1 - 0.35 * o2 - 0.35 * o3) * k; if (e < 0.004) continue;
    buf[i] *= 1 - e * (1 - col[0]); buf[i + 1] *= 1 - e * (1 - col[1]); buf[i + 2] *= 1 - e * (1 - col[2]);
  }
}
/**
 * Point light (spark flash, screen, lamp): lights the SURFACES of a layer near (x, y) in proportion to
 * their own colour (so it reads as light on the surface, not a haze). r = reach (px), col linear rgb, k strength.
 */
export function pointLight(buf, bb, { x, y, r, col, k }) {
  const xa = Math.max(bb[0], Math.floor(x - r)), xb = Math.min(bb[2], Math.ceil(x + r)), ya = Math.max(bb[1], Math.floor(y - r)), yb = Math.min(bb[3], Math.ceil(y + r)), r2 = r * r;
  for (let yy = ya; yy < yb; yy++) for (let xx = xa; xx < xb; xx++) {
    const d2 = (xx - x) ** 2 + (yy - y) ** 2; if (d2 >= r2) continue;
    const i = (yy * W + xx) * 4; if (buf[i + 3] < 0.01) continue;
    const f = (1 - d2 / r2) ** 2 * k;
    // light = albedo * light colour, plus a little straight add so near-black surfaces still pick up a glint
    buf[i] += (buf[i] * 2.2 + 0.06 * buf[i + 3]) * col[0] * f; buf[i + 1] += (buf[i + 1] * 2.2 + 0.06 * buf[i + 3]) * col[1] * f; buf[i + 2] += (buf[i + 2] * 2.2 + 0.06 * buf[i + 3]) * col[2] * f;
  }
}

// ---------------------------------------------------------------- long soft cast shadow (from a layer's own alpha)
const QS_T = qbuf();
/**
 * Long soft cast shadow, step 1: project a subject layer's silhouette onto the ground plane (quarter size).
 * foot = [x, y] ground contact point on screen; (sx, sy) = shadow offset per pixel of height (e.g. [-2.2, 0.18]:
 * long, to the left, slightly toward camera); blurQ = softness at quarter size; hz = horizon y (no shadow above it);
 * grow = how much the shadow fades with distance from the foot. Returns a quarter-size mask (alpha channel). ~5 ms.
 */
export function shadowMask(layerBuf, bb, { foot, sx, sy, blurQ = 3, hz = 0, grow = 0.6 }, m = qbuf()) {
  m.fill(0);
  const [fx, fy] = foot, top = bb[1], hMax = fy - top;
  if (hMax <= 4 || Math.abs(sy) < 1e-3) return null;
  for (let qy = 0; qy < QH; qy++) {
    const Y = qy * 4 + 2; if (Y < hz) continue;
    const h = (Y - fy) / sy; if (h < 0 || h > hMax) continue;
    for (let qx = 0; qx < QW; qx++) {
      const X = qx * 4 + 2, srcX = X - h * sx, srcY = fy - h;
      if (srcX < bb[0] - 2 || srcX > bb[2] + 2) continue;
      // two taps across the 4-px quarter cell keep thin limbs from aliasing
      const a = 0.5 * (sampA(layerBuf, srcX - 1, srcY) + sampA(layerBuf, srcX + 1, srcY));
      if (a > 0.001) m[(qy * QW + qx) * 4 + 3] = a * (1 - (h / hMax) * grow * 0.6);
    }
  }
  blur(m, QW, QH, blurQ, QS_T);
  return m;
}
/** Long soft cast shadow, step 2: darken a buffer (a layer's, or the frame so far) under the mask toward col. */
export function applyShadow(buf, m, { k = 0.45, col, hz = 0 }) {
  for (let y = Math.max(0, Math.floor(hz)); y < H; y++) {
    let fyq = (y + 0.5) / 4 - 0.5; if (fyq < 0) fyq = 0; const y0 = Math.min(QH - 2, fyq | 0), ty = Math.min(1, fyq - y0);
    for (let x = 0; x < W; x++) {
      let fxq = (x + 0.5) / 4 - 0.5; if (fxq < 0) fxq = 0; const x0 = Math.min(QW - 2, fxq | 0), tx = Math.min(1, fxq - x0);
      const j = (y0 * QW + x0) * 4 + 3, a = (m[j] * (1 - tx) + m[j + 4] * tx) * (1 - ty) + (m[j + QW * 4] * (1 - tx) + m[j + QW * 4 + 4] * tx) * ty;
      if (a < 0.002) continue;
      const e = Math.min(1, a) * k, o = (y * W + x) * 4;
      buf[o] *= 1 - e * (1 - col[0]); buf[o + 1] *= 1 - e * (1 - col[1]); buf[o + 2] *= 1 - e * (1 - col[2]);
    }
  }
}

// ================================================================ frame passes
const Q = { a: qbuf(), b: qbuf(), c: qbuf(), t: qbuf(), r: qbuf(), p: qbuf() };
/**
 * Light shafts (crepuscular rays): bright SKY pixels not covered by anything nearer are smeared toward the sun at
 * quarter size, so tree crowns, flocks and the hero cut them into shafts. Returns the quarter-size ray buffer (RGB = ray).
 * src = the frame composited up to the insertion layer; trans = quarter-size transmittance of everything above (A).
 * Rays fade in from fade[0] to fade[1] (y), so open sky never bleaches (pass fade = [sunY - 400, sunY + 60]).
 */
export function shaftRays(src, trans, sun, o = {}) {
  const { thr = 0.5, soft = 0.25, n = 48, density = 1.0, decay = 0.972, ymax = H, ymin = -1, srcR = 0 } = o;
  down4(src, Q.a);
  const m = Q.b; m.fill(0);
  // srcR (px): only sky within about this distance of the sun feeds the rays, so they fan out of one glow and the
  // occluders near the sun (tree crowns, a flock) cut clear beams, instead of the whole bright sky brightening
  const ir2 = srcR > 0 ? 1 / (srcR * srcR) : 0;
  for (let y = 0; y < QH; y++) {
    const yy = y * 4; if (yy > ymax || yy < ymin) continue;
    for (let x = 0; x < QW; x++) {
      const i = (y * QW + x) * 4, l = 0.2126 * Q.a[i] + 0.7152 * Q.a[i + 1] + 0.0722 * Q.a[i + 2];
      let v = Math.min(1, Math.max(0, (l - thr) / soft)) * (trans ? trans[i + 3] : 1);
      if (ir2 && v > 0) v *= Math.exp(-((x * 4 + 2 - sun[0]) ** 2 + (yy + 2 - sun[1]) ** 2) * ir2);
      m[i] = v;
    }
  }
  const sx = sun[0] / 4, sy = sun[1] / 4, r = Q.r;
  for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) {
    const ddx = ((sx - x) * density) / n, ddy = ((sy - y) * density) / n;
    let px = x, py = y, wgt = 1, s = 0;
    for (let i = 0; i < n; i++) {
      if (px >= 0 && py >= 0 && px < QW - 1 && py < QH - 1) { const ix = px | 0, iy = py | 0, fx = px - ix, fy = py - iy, j = (iy * QW + ix) * 4; s += ((m[j] * (1 - fx) + m[j + 4] * fx) * (1 - fy) + (m[j + QW * 4] * (1 - fx) + m[j + QW * 4 + 4] * fx) * fy) * wgt; }
      wgt *= decay; px += ddx; py += ddy;
    }
    const o2 = (y * QW + x) * 4; r[o2] = r[o2 + 1] = r[o2 + 2] = s / n; r[o2 + 3] = 0;
  }
  blur(r, QW, QH, 3, Q.t);
  return r;
}
/** quarter-size protect mask (alpha channel) from subject layers + explicit face circles [[x, y, r], ...] */
export function protectMask(bufs, faces = []) {
  const p = Q.p; p.fill(0);
  for (const b of bufs) {
    for (let y = 0; y < H; y += 2) { const qy = y >> 2; for (let x = 0; x < W; x += 2) { const a = b[(y * W + x) * 4 + 3]; if (a > 0) { const o = (qy * QW + (x >> 2)) * 4 + 3; p[o] += a * 0.25; } } }
  }
  for (const [fx, fy, fr] of faces) {
    const xa = Math.max(0, Math.floor((fx - fr * 1.4) / 4)), xb = Math.min(QW, Math.ceil((fx + fr * 1.4) / 4)), ya = Math.max(0, Math.floor((fy - fr * 1.4) / 4)), yb = Math.min(QH, Math.ceil((fy + fr * 1.4) / 4));
    for (let qy = ya; qy < yb; qy++) for (let qx = xa; qx < xb; qx++) { const d = Math.hypot(qx * 4 + 2 - fx, qy * 4 + 2 - fy) / fr; if (d < 1.4) { const o = (qy * QW + qx) * 4 + 3; p[o] = Math.max(p[o], d < 1 ? 1 : (1.4 - d) / 0.4); } }
  }
  for (let i = 3; i < p.length; i += 4) p[i] = Math.min(1, p[i]);
  blur(p, QW, QH, 2, Q.t);
  return p;
}
/**
 * Bloom on real highlights only (threshold on the max channel, so red eyes glow, not just white sky).
 * protect = quarter-size mask (alpha) of faces/subjects: no bloom is taken FROM them or laid ON them.
 */
export function bloom(frame, { thr = 0.9, k = 0.15, protect = null, protectK = 0.9 } = {}) {
  down4(frame, Q.a);
  for (let i = 0; i < Q.a.length; i += 4) {
    const l = Math.max(Q.a[i], Q.a[i + 1], Q.a[i + 2]);
    let f = l > thr ? (l - thr) / Math.max(1e-4, l) : 0;
    if (protect) f *= 1 - protectK * protect[i + 3];
    Q.a[i] *= f; Q.a[i + 1] *= f; Q.a[i + 2] *= f; Q.a[i + 3] = 0;
  }
  Q.b.set(Q.a); blur(Q.a, QW, QH, 4, Q.t); blur(Q.b, QW, QH, 16, Q.t);
  for (let i = 0; i < Q.a.length; i++) Q.c[i] = 0.55 * Q.a[i] + 0.45 * Q.b[i];
  addUp4(frame, Q.c, null, k, { mask: protect, maskK: protectK });
}
/** Sun glare: a broad soft additive glow around the key light (veiling glare), kept off protected faces. */
export function glare(frame, sun, { r = 700, k = 0.08, col, protect = null }) {
  const g = Q.c;
  for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) {
    const d2 = ((x * 4 + 2 - sun[0]) ** 2 + (y * 4 + 2 - sun[1]) ** 2) / (r * r), o = (y * QW + x) * 4;
    const v = Math.exp(-d2 * 2.2) + 0.25 * Math.exp(-d2 * 0.5);
    g[o] = col[0] * v; g[o + 1] = col[1] * v; g[o + 2] = col[2] * v; g[o + 3] = 0;
  }
  addUp4(frame, g, null, k, { mask: protect, maskK: 0.75 });
}
/**
 * Light pool: the one motivated light falls off into shadow. Multiplies the frame by a soft ellipse around
 * (x, y): 1 inside, (1 - k) far outside. This is what puts 40-80% of a frame into shadow like the references.
 */
export function pool(frame, { x = W / 2, y = H * 0.48, rx = W * 0.75, ry = H * 0.5, k = 0.3, soft = 1.0 }) {
  if (k <= 0) return;
  for (let yy = 0; yy < H; yy++) {
    const dy = (yy - y) / ry, dy2 = dy * dy;
    for (let xx = 0; xx < W; xx++) {
      const dx = (xx - x) / rx, d = Math.sqrt(dx * dx + dy2);
      if (d < 0.5) continue;
      const u = Math.min(1, (d - 0.5) / soft), f = 1 - k * u * u * (3 - 2 * u), o = (yy * W + xx) * 4;
      frame[o] *= f; frame[o + 1] *= f; frame[o + 2] *= f;
    }
  }
}
const DB = new Float32Array(W * H * 4);
/** Directional (whip-pan) blur of the whole frame along (vx, vy) px, `taps` samples. Used on whip frames only. */
export function dirBlur(frame, vx, vy, taps = 0) {
  const len = Math.hypot(vx, vy); if (len < 2) return;
  const n = taps || Math.min(40, Math.max(6, Math.ceil(len / 6)));
  DB.set(frame);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5; let px = x + vx * u, py = y + vy * u;
      if (px < 0) px = 0; if (py < 0) py = 0; if (px > W - 1.001) px = W - 1.001; if (py > H - 1.001) py = H - 1.001;
      const x0 = px | 0, y0 = py | 0, tx = px - x0, ty = py - y0, j = (y0 * W + x0) * 4, j2 = j + W * 4;
      r += (DB[j] * (1 - tx) + DB[j + 4] * tx) * (1 - ty) + (DB[j2] * (1 - tx) + DB[j2 + 4] * tx) * ty;
      g += (DB[j + 1] * (1 - tx) + DB[j + 5] * tx) * (1 - ty) + (DB[j2 + 1] * (1 - tx) + DB[j2 + 5] * tx) * ty;
      b += (DB[j + 2] * (1 - tx) + DB[j + 6] * tx) * (1 - ty) + (DB[j2 + 2] * (1 - tx) + DB[j2 + 6] * tx) * ty;
    }
    const o = (y * W + x) * 4; frame[o] = r / n; frame[o + 1] = g / n; frame[o + 2] = b / n;
  }
}

// ================================================================ canvas glow helpers (draw into an 'add' layer)
// Each draws additive light with globalCompositeOperation 'lighter'. Put them in a layer declared { blend: 'add' }
// so the light is added in linear space on top of the frame (and bloom picks the hot cores up).
const SPR = new Map();
function sprite(rgb, hard = 0.22) {
  const key = rgb + '|' + hard; if (SPR.has(key)) return SPR.get(key);
  const c = createCanvas(256, 256), g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(hard, `rgba(${rgb},0.5)`); r.addColorStop(0.55, `rgba(${rgb},0.12)`); r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); SPR.set(key, c); return c;
}
/** soft radial glow, radius rad (frame px), alpha a, colour 'r,g,b' (0-255) */
export function glow(x, px, py, rad, a = 1, rgb = '255,60,40', hard = 0.22) {
  if (a <= 0.003 || rad <= 0) return;
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = clamp(a); x.drawImage(sprite(rgb, hard), px - rad, py - rad, rad * 2, rad * 2); x.restore();
}
/** red eye halo: a tight hot core plus a wide dim halo. r = eye radius, open 0..1 (blinks dim it) */
export function eyeGlow(x, px, py, r, open = 1, rgb = '255,46,34') {
  if (open <= 0) return;
  glow(x, px, py, r * 2.2, 0.75 * open, rgb, 0.35);
  glow(x, px, py, r * 6.5, 0.32 * open, rgb, 0.12);
}
/** electric spark: halos along the bolt points [[x, y], ...] plus a 2-frame flash `flash` (0..1) at the first point */
export function sparkGlow(x, pts, a = 1, flash = 0, rgb = '255,236,140') {
  for (const [px, py] of pts) glow(x, px, py, 46, 0.35 * a, rgb, 0.3);
  if (flash > 0 && pts.length) glow(x, pts[0][0], pts[0][1], 420, 0.55 * flash, rgb, 0.08);
}
/** light spill of a phone screen: rect [x, y, w, h] (frame px, axis-aligned in current transform) */
export function screenGlow(x, rect, a = 1, rgb = '200,225,255') {
  const [rx, ry, rw, rh] = rect, cx = rx + rw / 2, cy = ry + rh / 2;
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = clamp(a * 0.55);
  x.drawImage(sprite(rgb, 0.4), cx - rw * 1.1, cy - rh * 0.95, rw * 2.2, rh * 1.9); x.restore();
  glow(x, cx, cy, Math.max(rw, rh) * 1.6, 0.25 * a, rgb, 0.1);
}
/** red LED timer spill (the timer itself is in the overlay; this lights the plate under it) */
export function timerGlow(x, cx, cy, w, h, a = 1, rgb = '255,40,30') {
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = clamp(a * 0.6);
  x.drawImage(sprite(rgb, 0.3), cx - w, cy - h * 1.6, w * 2, h * 3.2); x.restore();
  glow(x, cx, cy, w * 1.8, 0.3 * a, rgb, 0.08);
}
/** soft contact shadow under a foot / body (normal layer, multiply-looking dark ellipse) */
export function contactShadow(x, cx, cy, rw, rh, a = 0.45, rgb = '12,10,24') {
  x.save(); x.translate(cx, cy); x.scale(1, rh / rw);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, rw); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.6, `rgba(${rgb},${a * 0.45})`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, rw, 0, Math.PI * 2); x.fill(); x.restore();
}
