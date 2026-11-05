// LOOK ENGINE / core: float frame buffers, layer pool, 2x supersampling downscale, blurs, lossless writer.
// All buffers are RGBA Float32, PREMULTIPLIED, LINEAR light, 1080x1920 (the output size).
// Layer canvases are drawn at SS x size (2160x3840 for SS=2) and averaged down 2:1 in linear light.
import { spawn } from 'child_process';
import { once } from 'events';
import { createCanvas, VIEW, W, H } from '../lib.mjs';

export { W, H };
export const FPS = 30;
export const NPX = W * H;

// ---------------------------------------------------------------- supersampling
export let SS = 2;
const VIEWS = new Set([VIEW]);
/** Register another VIEW object (only needed if a shot module brings its own copy of lib.mjs). */
export function bindView(v) { if (v) { VIEWS.add(v); v.s = SS; } }
/** Set the supersampling factor (1 or 2). Sets VIEW.s so ink() widths and shadowBlur stay right at 2x. */
export function setSS(v) { SS = v; for (const w of VIEWS) w.s = v; }

// ---------------------------------------------------------------- colour transfer
export const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
export const toSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const PL = new Float32Array(256 * 256);            // [alpha<<8 | premultiplied byte] -> premultiplied LINEAR value
for (let a = 1; a < 256; a++) for (let c = 0; c <= a; c++) PL[(a << 8) | c] = toLin(Math.min(1, c / a)) * (a / 255);
const ENC_N = 8192, ENC = new Float32Array(ENC_N + 2), DEC = new Float32Array(ENC_N + 2);
for (let i = 0; i <= ENC_N + 1; i++) { ENC[i] = toSrgb(Math.min(1, i / ENC_N)); DEC[i] = toLin(Math.min(1, i / ENC_N)); }
/** linear -> display (sRGB) 0..1, table-interpolated (fast) */
export const enc = (v) => { if (v <= 0) return 0; if (v >= 1) return 1; const f = v * ENC_N, i = f | 0; return ENC[i] + (ENC[i + 1] - ENC[i]) * (f - i); };
/** display (sRGB) 0..1 -> linear */
export const dec = (v) => { if (v <= 0) return 0; if (v >= 1) return 1; const f = v * ENC_N, i = f | 0; return DEC[i] + (DEC[i + 1] - DEC[i]) * (f - i); };
/** '#RRGGBB' -> linear [r,g,b] */
export const lin = (hex) => { const n = parseInt(hex.slice(1), 16); return [toLin(((n >> 16) & 255) / 255), toLin(((n >> 8) & 255) / 255), toLin((n & 255) / 255)]; };

// ---------------------------------------------------------------- layer pool
// A layer = one transparent canvas at SS x size + a float accumulator at 1x. Slots are pooled by position, so shots
// with different layer names reuse the same memory. Reading layer.x marks the layer as drawn this sample.
const POOL = [];
function slot(i) {
  if (!POOL[i]) {
    const cv = createCanvas(W * SS, H * SS);
    POOL[i] = { cv, _x: cv.getContext('2d'), acc: new Float32Array(NPX * 4), dirty: true, used: false, any: false, bb: [0, 0, W, H], scanned: false, cbb: null };
  }
  return POOL[i];
}
export class Layer {
  constructor(i, name, opt) { this.s = slot(i); this.name = name; this.opt = opt; this.on = true; }
  /** the 2D context to draw into (frame coordinates; the SS scale is already applied) */
  get x() { const s = this.s; s.used = true; s.dirty = true; s.scanned = false; return s._x; }
  get acc() { return this.s.acc; }
}
export function resetCtx(x) {
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
  x.shadowBlur = 0; x.shadowOffsetX = 0; x.shadowOffsetY = 0; x.shadowColor = 'rgba(0,0,0,0)';
  x.lineCap = 'butt'; x.lineJoin = 'miter'; x.setLineDash([]);
}
/**
 * Clear a layer for the next sub-frame (only if something was drawn into it). When accum() scanned the last drawing,
 * only its bounding box is cleared (most layers cover a fraction of the frame); otherwise the whole canvas.
 */
export function clearLayer(l) {
  const s = l.s, x = s._x;
  if (s.dirty) {
    resetCtx(x);
    if (!s.scanned) x.clearRect(0, 0, W * SS, H * SS);
    else if (s.cbb) { const b = s.cbb, m = 2; x.clearRect(Math.max(0, b[0] * SS - m), Math.max(0, b[1] * SS - m), (b[2] - b[0]) * SS + 2 * m, (b[3] - b[1]) * SS + 2 * m); }
    s.dirty = false; s.scanned = false; s.cbb = null;
  }
  resetCtx(x); x.setTransform(SS, 0, 0, SS, 0, 0); s.used = false;
}

/**
 * Add a layer's canvas (SS x size, premultiplied sRGB bytes) into its float accumulator at 1x, weight w.
 * SS=2: each output pixel = the average of its 2x2 block in LINEAR light (gamma-correct edges).
 * Also tracks the layer's bounding box (bb = [x0, y0, x1, y1]) so later passes skip empty space.
 */
export function accum(l, w, src = l.s.cv.data()) {
  const s = l.s, acc = s.acc;
  // read whole RGBA pixels as 32-bit words (little endian: r = p & 255, ..., a = p >>> 24)
  const u32 = (src.byteOffset & 3) === 0 ? new Uint32Array(src.buffer, src.byteOffset, src.length >> 2) : new Uint32Array(new Uint8Array(src).buffer);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  const wa1 = w / 255;
  if (SS === 1) {
    for (let y = 0; y < H; y++) {
      let j = y * W, o = y * W * 4, rx0 = -1, rx1 = -1;
      for (let k = 0; k < W; k++, j++, o += 4) {
        const p = u32[j]; if (p === 0) continue;
        if (rx0 < 0) rx0 = k; rx1 = k;
        const a = p >>> 24, b = a << 8;
        acc[o] += w * PL[b | (p & 255)]; acc[o + 1] += w * PL[b | ((p >>> 8) & 255)]; acc[o + 2] += w * PL[b | ((p >>> 16) & 255)]; acc[o + 3] += wa1 * a;
      }
      if (rx0 >= 0) { if (rx0 < x0) x0 = rx0; if (rx1 > x1) x1 = rx1; if (y < y0) y0 = y; y1 = y; }
    }
  } else {
    const RW = W * 2, w4 = w / 4, wa = w / 1020;
    for (let y = 0; y < H; y++) {
      let j0 = y * 2 * RW, j1 = j0 + RW, o = y * W * 4, rx0 = -1, rx1 = -1;
      for (let k = 0; k < W; k++, j0 += 2, j1 += 2, o += 4) {
        const p0 = u32[j0], p1 = u32[j0 + 1], p2 = u32[j1], p3 = u32[j1 + 1];
        if ((p0 | p1 | p2 | p3) === 0) continue;
        if (rx0 < 0) rx0 = k; rx1 = k;
        if (p0 === p1 && p0 === p2 && p0 === p3) {
          // flat 2x2 block (most of a cartoon frame): one lookup per channel
          const a = p0 >>> 24, b = a << 8;
          acc[o] += w * PL[b | (p0 & 255)]; acc[o + 1] += w * PL[b | ((p0 >>> 8) & 255)]; acc[o + 2] += w * PL[b | ((p0 >>> 16) & 255)]; acc[o + 3] += wa1 * a;
        } else {
          // an edge: average the four samples in LINEAR light (gamma-correct antialiasing)
          const b0 = (p0 >>> 24) << 8, b1 = (p1 >>> 24) << 8, b2 = (p2 >>> 24) << 8, b3 = (p3 >>> 24) << 8;
          acc[o] += w4 * (PL[b0 | (p0 & 255)] + PL[b1 | (p1 & 255)] + PL[b2 | (p2 & 255)] + PL[b3 | (p3 & 255)]);
          acc[o + 1] += w4 * (PL[b0 | ((p0 >>> 8) & 255)] + PL[b1 | ((p1 >>> 8) & 255)] + PL[b2 | ((p2 >>> 8) & 255)] + PL[b3 | ((p3 >>> 8) & 255)]);
          acc[o + 2] += w4 * (PL[b0 | ((p0 >>> 16) & 255)] + PL[b1 | ((p1 >>> 16) & 255)] + PL[b2 | ((p2 >>> 16) & 255)] + PL[b3 | ((p3 >>> 16) & 255)]);
          acc[o + 3] += wa * ((p0 >>> 24) + (p1 >>> 24) + (p2 >>> 24) + (p3 >>> 24));
        }
      }
      if (rx0 >= 0) { if (rx0 < x0) x0 = rx0; if (rx1 > x1) x1 = rx1; if (y < y0) y0 = y; y1 = y; }
    }
  }
  s.scanned = true;
  if (x1 >= 0) {
    s.cbb = [x0, y0, x1 + 1, y1 + 1];
    if (!s.any) s.bb = s.cbb.slice();
    else { const b = s.bb; s.bb = [Math.min(b[0], x0), Math.min(b[1], y0), Math.max(b[2], x1 + 1), Math.max(b[3], y1 + 1)]; }
    s.any = true;
  } else s.cbb = null;
}
/** reset a layer's float accumulator for a new frame (only the rows/columns used last frame) */
export function zeroAcc(l) {
  const s = l.s;
  if (s.any) { const [x0, y0, x1, y1] = s.bb; if (x1 - x0 > W * 0.6) s.acc.fill(0, y0 * W * 4, y1 * W * 4); else for (let y = y0; y < y1; y++) s.acc.fill(0, (y * W + x0) * 4, (y * W + x1) * 4); }
  s.any = false; s.bb = [0, 0, 0, 0];
}

// ---------------------------------------------------------------- float image ops
/** 3 box passes ~ gaussian (sigma ~ sqrt(r^2 + r)). In place on buf (w x h RGBA), tmp = scratch of the same size. Optional row range. */
export function blur(buf, w, h, r, tmp, y0 = 0, y1 = h) {
  r = Math.round(r); if (r < 1) return buf;
  y0 = Math.max(0, y0); y1 = Math.min(h, y1); if (y1 <= y0) return buf;
  for (let pass = 0; pass < 3; pass++) { boxH(buf, tmp, w, y0, y1, r); boxV(tmp, buf, w, y0, y1, r); }
  return buf;
}
// horizontal running box, all 4 channels per step
function boxH(src, dst, w, y0, y1, r) {
  const inv = 1 / (2 * r + 1), last = (w - 1) * 4;
  for (let y = y0; y < y1; y++) {
    const row = y * w * 4;
    let s0 = src[row] * (r + 1), s1 = src[row + 1] * (r + 1), s2 = src[row + 2] * (r + 1), s3 = src[row + 3] * (r + 1);
    for (let i = 1; i <= r; i++) { const j = row + Math.min(last, i * 4); s0 += src[j]; s1 += src[j + 1]; s2 += src[j + 2]; s3 += src[j + 3]; }
    for (let x = 0, o = row; x < w; x++, o += 4) {
      dst[o] = s0 * inv; dst[o + 1] = s1 * inv; dst[o + 2] = s2 * inv; dst[o + 3] = s3 * inv;
      const a = row + Math.min(last, (x + r + 1) * 4), b = row + Math.max(0, (x - r) * 4);
      s0 += src[a] - src[b]; s1 += src[a + 1] - src[b + 1]; s2 += src[a + 2] - src[b + 2]; s3 += src[a + 3] - src[b + 3];
    }
  }
}
// vertical running box over rows [y0, y1), row-major with a running column-sum (cache friendly), clamped at the range
let COLS = new Float64Array(0);
function boxV(src, dst, w, y0, y1, r) {
  const st = w * 4, inv = 1 / (2 * r + 1), cl = (y) => (y < y0 ? y0 : y >= y1 ? y1 - 1 : y);
  if (COLS.length < st) COLS = new Float64Array(st);
  const S = COLS; S.fill(0, 0, st);
  for (let i = -r; i <= r; i++) { const o = cl(y0 + i) * st; for (let j = 0; j < st; j++) S[j] += src[o + j]; }
  for (let y = y0; y < y1; y++) {
    const o = y * st, a = cl(y + r + 1) * st, b = cl(y - r) * st;
    for (let j = 0; j < st; j++) { dst[o + j] = S[j] * inv; S[j] += src[a + j] - src[b + j]; }
  }
}
// small separable gaussian (sigma < ~1.6 px), rows [y0, y1); kernel radius ceil(2.5 sigma)
function gauss(buf, w, sigma, tmp, y0, y1) {
  const R = Math.max(1, Math.ceil(sigma * 2.5)), K = new Float32Array(2 * R + 1); let ks = 0;
  for (let i = -R; i <= R; i++) ks += (K[i + R] = Math.exp(-(i * i) / (2 * sigma * sigma)));
  for (let i = 0; i < K.length; i++) K[i] /= ks;
  const st = w * 4, last = (w - 1) * 4;
  for (let y = y0; y < y1; y++) {
    const row = y * st;
    for (let x = 0; x < w; x++) {
      let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
      for (let i = -R; i <= R; i++) { const j = row + Math.min(last, Math.max(0, (x + i) * 4)), k = K[i + R]; s0 += buf[j] * k; s1 += buf[j + 1] * k; s2 += buf[j + 2] * k; s3 += buf[j + 3] * k; }
      const o = row + x * 4; tmp[o] = s0; tmp[o + 1] = s1; tmp[o + 2] = s2; tmp[o + 3] = s3;
    }
  }
  for (let y = y0; y < y1; y++) {
    const o = y * st;
    for (let j = 0; j < st; j++) buf[o + j] = 0;
    for (let i = -R; i <= R; i++) { const yy = y + i < y0 ? y0 : y + i >= y1 ? y1 - 1 : y + i, a = yy * st, k = K[i + R]; for (let j = 0; j < st; j++) buf[o + j] += tmp[a + j] * k; }
  }
}
// half-size working buffers for cheap wide blurs (depth of field)
const HW = W / 2, HH = H / 2;
const HB = { a: new Float32Array(HW * HH * 4), t: new Float32Array(HW * HH * 4) };
/** padding (px) a layer's bounding box grows by when blurLayer() blurs it with radius r */
export const blurPad = (r) => Math.ceil(r * 3) + 4;
/**
 * Depth-of-field style blur of a full-size layer buffer, rows y0..y1 only. r ~ the blur's sigma in output px.
 * r < 1.6: full-res small gaussian. r >= 1.6: blurred at half size (4x cheaper: 3 box passes ~ gaussian), then
 * bilinear upsampled. Content spreads by at most blurPad(r) px.
 */
export function blurLayer(buf, r, tmp, y0 = 0, y1 = H) {
  if (r < 0.35) return;
  const pad = blurPad(r), ya = Math.max(0, y0 - pad), yb = Math.min(H, y1 + pad);
  if (r < 1.6) { gauss(buf, W, r, tmp, ya, yb); return; }
  const hy0 = ya >> 1, hy1 = Math.min(HH, (yb + 1) >> 1);
  const a = HB.a;
  for (let y = hy0; y < hy1; y++) for (let x = 0; x < HW; x++) {
    const o = (y * HW + x) * 4, i0 = ((2 * y) * W + 2 * x) * 4, i1 = i0 + W * 4;
    for (let c = 0; c < 4; c++) a[o + c] = 0.25 * (buf[i0 + c] + buf[i0 + 4 + c] + buf[i1 + c] + buf[i1 + 4 + c]);
  }
  const sh = r / 2;
  if (sh < 1.6) gauss(a, HW, sh, HB.t, hy0, hy1);
  else blur(a, HW, HH, Math.max(1, Math.round((Math.sqrt(1 + 4 * sh * sh) - 1) / 2)), HB.t, hy0, hy1);
  for (let y = ya; y < yb; y++) {
    let fy = (y + 0.5) / 2 - 0.5; fy = Math.min(Math.max(fy, hy0), hy1 - 1.001); const yy = fy | 0, ty = fy - yy;
    for (let x = 0; x < W; x++) {
      let fx = (x + 0.5) / 2 - 0.5; if (fx < 0) fx = 0; if (fx > HW - 1.001) fx = HW - 1.001; const xx = fx | 0, tx = fx - xx;
      const j = (yy * HW + xx) * 4, o = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) buf[o + c] = (a[j + c] * (1 - tx) + a[j + 4 + c] * tx) * (1 - ty) + (a[j + HW * 4 + c] * (1 - tx) + a[j + HW * 4 + 4 + c] * tx) * ty;
    }
  }
}
/** bilinear alpha sample of a full-size buffer */
export const sampA = (buf, fx, fy) => {
  if (fx < 0) fx = 0; if (fy < 0) fy = 0; if (fx > W - 1.001) fx = W - 1.001; if (fy > H - 1.001) fy = H - 1.001;
  const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, i = (y0 * W + x0) * 4 + 3;
  return (buf[i] * (1 - tx) + buf[i + 4] * tx) * (1 - ty) + (buf[i + W * 4] * (1 - tx) + buf[i + W * 4 + 4] * tx) * ty;
};

// ---------------------------------------------------------------- quarter-size helpers (light passes)
export const QW = W / 4, QH = H / 4;
export const qbuf = () => new Float32Array(QW * QH * 4);
/** average 4x4 blocks of a full-size RGBA buffer into a quarter-size one */
export function down4(src, dst) {
  dst.fill(0);
  for (let y = 0; y < H; y++) { const qy = y >> 2; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, o = (qy * QW + (x >> 2)) * 4; dst[o] += src[i]; dst[o + 1] += src[i + 1]; dst[o + 2] += src[i + 2]; dst[o + 3] += src[i + 3]; } }
  for (let i = 0; i < dst.length; i++) dst[i] *= 1 / 16;
}
/** bilinear sample of channel c of a quarter-size buffer at full-size pixel (x, y) */
export function q4(q, x, y, c) {
  let fx = (x + 0.5) / 4 - 0.5, fy = (y + 0.5) / 4 - 0.5;
  if (fx < 0) fx = 0; if (fy < 0) fy = 0; if (fx > QW - 1.001) fx = QW - 1.001; if (fy > QH - 1.001) fy = QH - 1.001;
  const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, i = (y0 * QW + x0) * 4 + c;
  return (q[i] * (1 - tx) + q[i + 4] * tx) * (1 - ty) + (q[i + QW * 4] * (1 - tx) + q[i + QW * 4 + 4] * tx) * ty;
}
/** add a quarter-size RGB buffer (bilinear upsample) into a full-size one: dst += q * col * k * mask */
export function addUp4(dst, q, col, k, opt = {}) {
  const { fade = null, fadeOut = null, mask = null, maskK = 1 } = opt;
  for (let y = 0; y < H; y++) {
    let ky = fade ? k * Math.min(1, Math.max(0, (y - fade[0]) / (fade[1] - fade[0]))) : k;
    if (fadeOut) { const u = Math.min(1, Math.max(0, (y - fadeOut[0]) / (fadeOut[1] - fadeOut[0]))); ky *= 1 - u * u * (3 - 2 * u); }
    if (ky <= 0) continue;
    let fy = (y + 0.5) / 4 - 0.5; if (fy < 0) fy = 0; const y0 = Math.min(QH - 2, fy | 0), ty = Math.min(1, fy - y0);
    for (let x = 0; x < W; x++) {
      let fx = (x + 0.5) / 4 - 0.5; if (fx < 0) fx = 0; const x0 = Math.min(QW - 2, fx | 0), tx = Math.min(1, fx - x0);
      const i00 = (y0 * QW + x0) * 4, i01 = i00 + 4, i10 = i00 + QW * 4, i11 = i10 + 4, o = (y * W + x) * 4;
      let m = ky;
      if (mask) m *= 1 - maskK * ((mask[i00 + 3] * (1 - tx) + mask[i01 + 3] * tx) * (1 - ty) + (mask[i10 + 3] * (1 - tx) + mask[i11 + 3] * tx) * ty);
      if (m <= 0) continue;
      for (let c = 0; c < 3; c++) { const v = (q[i00 + c] * (1 - tx) + q[i01 + c] * tx) * (1 - ty) + (q[i10 + c] * (1 - tx) + q[i11 + c] * tx) * ty; dst[o + c] += v * m * (col ? col[c] : 1); }
    }
  }
}

// ---------------------------------------------------------------- deterministic hash (dither, noise)
export const hash3 = (x, y, f) => { let h = (x * 374761393 + y * 668265263 + f * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

// ---------------------------------------------------------------- writers
const TAGS = ['-color_range', 'pc', '-colorspace', 'rgb', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1'];
/** Lossless RGB plate (libx264rgb -qp 0, .mkv). Lossless plates; ONE final x264 encode later, in assemble. */
export class Writer {
  constructor(file, { threads = 2 } = {}) {
    this.p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
      '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0', '-threads', String(threads), ...TAGS, file], { stdio: ['pipe', 'ignore', 'inherit'] });
    this.p.stdin.on('error', (e) => console.error('writer stdin:', e.message));
  }
  async write(buf) { if (!this.p.stdin.write(Buffer.from(buf))) await once(this.p.stdin, 'drain'); }   // copies: buf is reused
  async close() { this.p.stdin.end(); await once(this.p, 'close'); }
}
/** RGB bytes -> PNG file (full size) */
export function writePng(file, rgb) {
  const c = createCanvas(W, H), x = c.getContext('2d'), id = x.createImageData(W, H), d = id.data;
  for (let i = 0, o = 0; i < NPX * 3; i += 3, o += 4) { d[o] = rgb[i]; d[o + 1] = rgb[i + 1]; d[o + 2] = rgb[i + 2]; d[o + 3] = 255; }
  x.putImageData(id, 0, 0);
  return c.toBuffer('image/png');
}
