// LOOK ENGINE / grade: the COLOUR SCRIPT (the grade changes with the story, chapter by chapter, on shot cuts) and the
// FINISH. Finish order (per pixel): linear exposure + white balance -> display (sRGB) -> per-channel filmic S-curve (toe
// crush, contrast about a pivot, soft shoulder) -> saturation (richer in the shadows) -> green-to-teal shift (cool
// chapters) -> luminance-preserving split tint (shadow colour -> highlight colour) -> red accent kept out of the
// desaturation and the tint -> vignette -> 1-level triangular dither. NO grain (phone apps erase it and it costs bitrate).
//
// Darkness comes from the CURVE (toe + low pivot) and the light pool, not from one global gain, so highlights (sky, lamp
// light, glowing eyes, screens) stay bright: dark and rich, not grey and flat. Audiences dislike frames that are too dark
// on a phone: keep mean luma above ~55 except for one deliberate beat, and give every dark shot a visible light source.
import { lin, enc, hash3, W, H, NPX } from './core.mjs';

// ---------------------------------------------------------------- presets
// exposure: linear gain. wb: linear per-channel gain. curve: { black: display level crushed to 0, pivot: S-curve centre,
// c: contrast (1 = none), white: display level mapped to 1 }. sat: saturation; satSh: extra saturation in the shadows.
// teal: 0..1 shift green hues toward teal. tint: { sh, hi, k }: colourise toward a shadow->highlight colour ramp at the
// pixel's own luminance, strength k. accent: 0..1 keep red hues out of the desaturation and the tint (1 = red is the only
// colour left). keep: 0..1 how much SUBJECT pixels (layers with subject: true: the hero, the companion, the creature the
// caption names) are spared the desaturation, teal shift and tint, so they keep their model colours in a dark grade.
// vig: vignette. key: the key-light defaults for the light pass. target: { L: mean display luma 0-255, dark: share of
// pixels with luma < 40 } (what the QA compares a shot against).
export const PRESETS = {
  day: {
    label: 'clear daylight', exposure: 0.78, wb: [1.02, 1.0, 0.98], curve: { black: 0.03, pivot: 0.5, c: 1.18, white: 1.0 },
    sat: 1.06, satSh: 0.15, teal: 0, tint: { sh: '#2E3A5C', hi: '#FFF1DA', k: 0.1 }, accent: 0.1, vig: 0.22, keep: 0.2,
    key: { col: '#FFF0D8', rim: 0.7, rimW: 5, shade: 0.35, shadeCol: '#6E7FA8', shadeW: 22, shafts: 0, bloomThr: 0.95, bloom: 0.06, glare: 0.02, pool: 0.15, hazeCol: '#DCE8F4', shadowCol: '#3A4466', shadowK: 0.35 },
    target: { L: 110, dark: 0.08 },
  },
  golden: {
    label: 'golden hour / dawn', exposure: 0.6, wb: [1.06, 1.0, 0.9], curve: { black: 0.04, pivot: 0.5, c: 1.32, white: 1.0 },
    sat: 1.04, satSh: 0.25, teal: 0, tint: { sh: '#3A2C66', hi: '#FFD9A6', k: 0.16 }, accent: 0.2, vig: 0.32, keep: 0.2,
    key: { col: '#FFC98A', rim: 0.9, rimW: 6, shade: 0.4, shadeCol: '#6A5E9E', shadeW: 26, shafts: 0.45, bloomThr: 0.9, bloom: 0.12, glare: 0.04, pool: 0.45, hazeCol: '#F4D2AA', shadowCol: '#3B3263', shadowK: 0.42 },
    target: { L: 85, dark: 0.25 },
  },
  overcast: {
    label: 'soft overcast', exposure: 0.66, wb: [0.98, 1.0, 1.03], curve: { black: 0.04, pivot: 0.5, c: 1.15, white: 0.98 },
    sat: 0.9, satSh: 0.1, teal: 0.15, tint: { sh: '#22303C', hi: '#EEF2F2', k: 0.14 }, accent: 0.3, vig: 0.26, keep: 0.4,
    key: { col: '#E8EEF2', rim: 0.45, rimW: 5, shade: 0.3, shadeCol: '#56677A', shadeW: 24, shafts: 0, bloomThr: 0.95, bloom: 0.05, glare: 0, pool: 0.25, hazeCol: '#C8D2DA', shadowCol: '#26323E', shadowK: 0.3 },
    target: { L: 90, dark: 0.12 },
  },
  dusk: {
    label: 'dusk: cool shadows, last warm light', exposure: 0.68, wb: [1.0, 0.98, 1.02], curve: { black: 0.03, pivot: 0.5, c: 1.24, white: 0.98 },
    sat: 1.0, satSh: 0.3, teal: 0.2, tint: { sh: '#1C2348', hi: '#FFC49A', k: 0.22 }, accent: 0.3, vig: 0.34, keep: 0.45,
    key: { col: '#FFB98A', rim: 0.85, rimW: 6, shade: 0.45, shadeCol: '#3E4A7E', shadeW: 24, shafts: 0.25, bloomThr: 0.88, bloom: 0.12, glare: 0.03, pool: 0.45, hazeCol: '#B7A6C0', shadowCol: '#1A1E3C', shadowK: 0.45 },
    target: { L: 70, dark: 0.3 },
  },
  night: {
    label: 'moonlit night (readable, not black)', exposure: 0.8, wb: [0.92, 0.98, 1.1], curve: { black: 0.02, pivot: 0.46, c: 1.18, white: 0.96 },
    sat: 0.98, satSh: 0.25, teal: 0.2, tint: { sh: '#122046', hi: '#DCE8FF', k: 0.22 }, accent: 0.5, vig: 0.3, keep: 0.6,
    key: { col: '#BFD4FF', rim: 1.0, rimW: 6, shade: 0.45, shadeCol: '#26305E', shadeW: 24, shafts: 0.2, bloomThr: 0.85, bloom: 0.16, glare: 0.02, pool: 0.4, hazeCol: '#5A6A96', shadowCol: '#0A0F26', shadowK: 0.45 },
    target: { L: 62, dark: 0.32 },
  },
  lamplit: {
    label: 'night interior lit by a warm lamp', exposure: 0.62, wb: [1.05, 1.0, 0.94], curve: { black: 0.04, pivot: 0.5, c: 1.28, white: 0.99 },
    sat: 1.02, satSh: 0.3, teal: 0.1, tint: { sh: '#1A1A3A', hi: '#FFD8A8', k: 0.2 }, accent: 0.3, vig: 0.34, keep: 0.4,
    key: { col: '#FFC890', rim: 0.85, rimW: 6, shade: 0.45, shadeCol: '#3A3466', shadeW: 24, shafts: 0, bloomThr: 0.86, bloom: 0.14, glare: 0.02, pool: 0.45, hazeCol: '#8A7A88', shadowCol: '#16122C', shadowK: 0.45 },
    target: { L: 70, dark: 0.28 },
  },
  interior: {
    label: 'bright warm interior', exposure: 0.72, wb: [1.03, 1.0, 0.95], curve: { black: 0.03, pivot: 0.5, c: 1.2, white: 1.0 },
    sat: 1.04, satSh: 0.2, teal: 0, tint: { sh: '#2A2448', hi: '#FFE6C4', k: 0.12 }, accent: 0.2, vig: 0.26, keep: 0.25,
    key: { col: '#FFE2BC', rim: 0.75, rimW: 5, shade: 0.38, shadeCol: '#5A5486', shadeW: 22, shafts: 0, bloomThr: 0.92, bloom: 0.08, glare: 0, pool: 0.25, hazeCol: '#E8D6C0', shadowCol: '#2C2444', shadowK: 0.38 },
    target: { L: 100, dark: 0.1 },
  },
  storm: {
    label: 'storm: teal-grey, heavy, red as the only hot colour', exposure: 0.5, wb: [0.95, 1.0, 1.04], curve: { black: 0.05, pivot: 0.52, c: 1.4, white: 0.97 },
    sat: 0.75, satSh: 0.2, teal: 0.35, tint: { sh: '#0C1A24', hi: '#D8E4E0', k: 0.28 }, accent: 0.8, vig: 0.38, keep: 0.6,
    key: { col: '#D6E6F0', rim: 0.7, rimW: 5, shade: 0.5, shadeCol: '#2A3A4C', shadeW: 22, shafts: 0, bloomThr: 0.82, bloom: 0.18, glare: 0, pool: 0.5, hazeCol: '#6C7C84', shadowCol: '#0C141C', shadowK: 0.5 },
    target: { L: 58, dark: 0.38 },
  },
  threat: {
    label: 'threat: cool and dark, red the only accent', exposure: 0.42, wb: [0.99, 0.97, 0.98], curve: { black: 0.06, pivot: 0.55, c: 1.5, white: 0.97 },
    sat: 0.72, satSh: 0.2, teal: 0.3, tint: { sh: '#0C1226', hi: '#FFCC96', k: 0.3 }, accent: 1, vig: 0.38, keep: 0.6,
    key: { col: '#FFCB9A', rim: 0.6, rimW: 4, shade: 0.55, shadeCol: '#2A3052', shadeW: 22, shafts: 0.45, bloomThr: 0.8, bloom: 0.2, glare: 0, pool: 0.6, hazeCol: '#6C6070', shadowCol: '#0C1222', shadowK: 0.5 },
    target: { L: 48, dark: 0.5 },
  },
  forest: {
    label: 'dim forest with god rays', exposure: 0.58, wb: [1.0, 1.0, 0.96], curve: { black: 0.05, pivot: 0.5, c: 1.4, white: 0.98 },
    sat: 1.0, satSh: 0.35, teal: 0.25, tint: { sh: '#0C2A2A', hi: '#FFE0A0', k: 0.24 }, accent: 0.4, vig: 0.34, keep: 0.45,
    key: { col: '#FFD08A', rim: 0.85, rimW: 6, shade: 0.5, shadeCol: '#3E5872', shadeW: 24, shafts: 0.8, bloomThr: 0.88, bloom: 0.12, glare: 0.02, pool: 0.55, hazeCol: '#B9C6A0', shadowCol: '#142A30', shadowK: 0.5 },
    target: { L: 60, dark: 0.4 },
  },
  memory: {
    label: 'memory / flashback: soft, warm, lifted blacks (use ONE memory look per series)', exposure: 0.7, wb: [1.06, 1.0, 0.9], curve: { black: -0.04, pivot: 0.5, c: 1.05, white: 1.02 },
    sat: 0.7, satSh: 0, teal: 0, tint: { sh: '#5A4A6A', hi: '#FFE6C0', k: 0.32 }, accent: 0, vig: 0.42, keep: 0.2,
    key: { col: '#FFE0B0', rim: 0.5, rimW: 6, shade: 0.25, shadeCol: '#7A6A8A', shadeW: 26, shafts: 0.2, bloomThr: 0.85, bloom: 0.2, glare: 0.06, pool: 0.3, hazeCol: '#F0DCC0', shadowCol: '#5A4A60', shadowK: 0.3 },
    target: { L: 115, dark: 0.04 },
  },
};

// ---------------------------------------------------------------- the colour script (set per episode)
// A chapter = a preset + overrides + t0 (episode seconds where it starts; put it on a shot cut) + optional ramp
// (seconds to blend from the previous chapter). The episode's grade list lives in episode.json ("grade") and the
// segment renderer calls setChapters() with it. Default: one daylight chapter.
export const CHAPTERS = [];
function build(c) {
  const p = PRESETS[c.preset || 'day'];
  if (!p) throw new Error(`grade: unknown preset "${c.preset}" (have ${Object.keys(PRESETS).join(', ')})`);
  const o = { ...p, ...c, name: c.name || c.preset || 'day', key: { ...p.key, ...(c.key || {}) }, curve: { ...p.curve, ...(c.curve || {}) },
    tint: { ...p.tint, ...(c.tint || {}) }, target: { ...p.target, ...(c.target || {}) } };
  o.exposure = p.exposure * (c.exposure ?? 1);          // a chapter's exposure MULTIPLIES the preset's
  o.t0 = c.f0 !== undefined ? c.f0 / 30 + 1e-6 : +c.t0 || 0;          // f0 = the cut's frame number (exact); or t0 in seconds
  return o;
}
/** Replace the colour script: [{ preset, f0 | t0, ramp?, name?, ...overrides }] (sorted; the first starts at 0). */
export function setChapters(list) {
  const L = (list && list.length ? list : [{ preset: 'day', t0: 0 }]).map(build).sort((a, b) => a.t0 - b.t0);
  L[0].t0 = 0;
  CHAPTERS.length = 0; CHAPTERS.push(...L);
  return CHAPTERS;
}
setChapters([{ preset: 'day', t0: 0 }]);
const NUMK = ['exposure', 'sat', 'satSh', 'teal', 'accent', 'vig', 'keep'];
const KEYN = ['rim', 'rimW', 'shade', 'shadeW', 'shafts', 'bloomThr', 'bloom', 'glare', 'pool', 'shadowK'];
const KEYC = ['col', 'shadeCol', 'hazeCol', 'shadowCol'];
const mixN = (a, b, u) => a + (b - a) * u;
const mixHex = (a, b, u) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const c = (s) => Math.round(mixN((A >> s) & 255, (B >> s) & 255, u)); return '#' + [16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join(''); };
function blendCh(a, b, u) {
  if (u <= 0) return a; if (u >= 1) return b;
  const o = { ...b, name: `${a.name}>${b.name}`, key: { ...b.key }, target: { L: mixN(a.target.L, b.target.L, u), dark: mixN(a.target.dark, b.target.dark, u) } };
  for (const k of NUMK) o[k] = mixN(a[k], b[k], u);
  o.wb = a.wb.map((v, i) => mixN(v, b.wb[i], u));
  o.curve = Object.fromEntries(Object.keys(b.curve).map((k) => [k, mixN(a.curve[k], b.curve[k], u)]));
  o.tint = { sh: mixHex(a.tint.sh, b.tint.sh, u), hi: mixHex(a.tint.hi, b.tint.hi, u), k: mixN(a.tint.k, b.tint.k, u) };
  for (const k of KEYN) o.key[k] = mixN(a.key[k], b.key[k], u);
  for (const k of KEYC) o.key[k] = mixHex(a.key[k], b.key[k], u);
  return o;
}
/** The colour-script chapter (grade + key-light defaults) at reel time t (seconds), blended inside ramps. */
export function chapterAt(t) {
  let i = 0; while (i < CHAPTERS.length - 1 && t >= CHAPTERS[i + 1].t0 - 1e-6) i++;
  const c = CHAPTERS[i];
  if (i > 0 && c.ramp) { const u = (t - c.t0) / c.ramp; if (u < 1) return blendCh(CHAPTERS[i - 1], c, u * u * (3 - 2 * u)); }
  return c;
}
/**
 * Chapter merged with a shot's overrides. `exposure` MULTIPLIES the chapter's; `curve` and `tint` merge key by key;
 * `key` merges into the key-light defaults; anything else replaces the chapter value.
 */
export function gradeFor(t, over = null) {
  const c = chapterAt(t); if (!over) return c;
  const o = { ...c, key: { ...c.key, ...(over.key || {}) } };
  for (const [k, v] of Object.entries(over)) {
    if (k === 'key') continue;
    if (k === 'exposure') o.exposure = c.exposure * v;
    else if (k === 'curve' || k === 'tint') o[k] = { ...c[k], ...v };
    else o[k] = v;
  }
  return o;
}

// ---------------------------------------------------------------- the finish (display space, per pixel)
const hexD = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const lumD = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/** the per-channel tone curve as a 1025-entry table (display in -> display out) */
export function curveLUT(cv) {
  const { black = 0, pivot = 0.5, c = 1, white = 1 } = cv, p = Math.min(0.95, Math.max(0.05, pivot)), L = new Float32Array(1026);
  for (let i = 0; i <= 1025; i++) {
    const v = Math.min(1, Math.max(0, (i / 1024 - black) / (white - black)));
    L[i] = v < p ? p * Math.pow(v / p, c) : 1 - (1 - p) * Math.pow((1 - v) / (1 - p), c);
  }
  return L;
}
/**
 * Float frame (premultiplied linear, opaque) -> RGB bytes, graded by chapter g (from gradeFor), with the vignette and a
 * 1-LSB triangular dither (keeps the dark gradients from banding). fi = frame index (seeds the dither). Returns `out`.
 */
export function finish(frame, out, fi, g, keep = null) {
  const ex = g.exposure, wr = g.wb[0] * ex, wg = g.wb[1] * ex, wbb = g.wb[2] * ex;
  const kk = g.keep ?? 0, KP = keep && kk > 0 ? keep : null;      // subject protection: less desaturation / tint on subject layers
  const LUT = curveLUT(g.curve || {});
  const sc = (v) => { if (v <= 0) return LUT[0]; if (v >= 1) return LUT[1024]; const f = v * 1024, i = f | 0; return LUT[i] + (LUT[i + 1] - LUT[i]) * (f - i); };
  const sat = g.sat ?? 1, satSh = g.satSh ?? 0, teal = g.teal ?? 0, acc = g.accent ?? 0, vig = g.vig ?? 0;
  const T = g.tint || { k: 0 }, tk = T.k || 0;
  let ts = [0, 0, 0], th = [0, 0, 0];
  if (tk > 0) { const a = hexD(T.sh), b = hexD(T.hi), la = lumD(a) || 1, lb = lumD(b) || 1; ts = a.map((v) => v / la); th = b.map((v) => v / lb); }   // luma-normalised tint colours
  const cx = W / 2, cy = H * 0.47, ivx = 1 / (W * 0.62), ivy = 1 / (H * 0.6);
  for (let y = 0; y < H; y++) {
    const dy = (y - cy) * ivy, dy2 = dy * dy;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, o = (y * W + x) * 3;
      let r = sc(enc(frame[i] * wr)), gg = sc(enc(frame[i + 1] * wg)), b = sc(enc(frame[i + 2] * wbb));
      // red accent weight: red-dominant pixels within ~±25 deg of pure red, by chroma
      let aw = 0;
      if (acc > 0 && r > gg && r > b) {
        const mn = gg < b ? gg : b, ch = r - mn;
        if (ch > 0.04) { const hue = Math.abs((60 * (gg - b)) / ch); aw = acc * (hue >= 28 ? 0 : hue <= 8 ? 1 : (28 - hue) / 20) * Math.min(1, ch * 3); }
      }
      let L = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      const pm = KP ? KP[i >> 2] * kk : 0;
      // saturation (richer shadows); red accent keeps at least 1.12; protected subjects lose less colour
      const sh2 = (1 - L) * (1 - L);
      let k = sat + satSh * sh2; if (aw > 0) k += (Math.max(k, 1.12) - k) * aw; if (pm > 0 && k < 1) k += (1 - k) * pm;
      if (k !== 1) { r = L + (r - L) * k; gg = L + (gg - L) * k; b = L + (b - L) * k; }
      // greens toward teal (cool chapters)
      if (teal > 0 && gg > r && gg > b) { const d = (gg - (r > b ? r : b)) * teal * (1 - pm); b += d * 0.75; r -= d * 0.2; }
      // luminance-preserving split tint, kept off the red accent and (partly) off subjects
      if (tk > 0) {
        L = 0.2126 * r + 0.7152 * gg + 0.0722 * b; if (L < 0) L = 0;
        const u = L < 1 ? L : 1, m = tk * (1 - aw) * (1 - pm);
        r += (L * (ts[0] + (th[0] - ts[0]) * u) - r) * m; gg += (L * (ts[1] + (th[1] - ts[1]) * u) - gg) * m; b += (L * (ts[2] + (th[2] - ts[2]) * u) - b) * m;
      }
      const dx = (x - cx) * ivx, d = Math.sqrt(dx * dx + dy2), vu = d > 0.55 ? Math.min(1, (d - 0.55) / 0.6) : 0, v = 1 - vig * vu * vu;
      const dth = hash3(x, y, fi) + hash3(y, x, fi + 11) - 1;
      const R = r * v * 255 + dth, G = gg * v * 255 + dth, B = b * v * 255 + dth;
      out[o] = R <= 0 ? 0 : R >= 255 ? 255 : Math.round(R); out[o + 1] = G <= 0 ? 0 : G >= 255 ? 255 : Math.round(G); out[o + 2] = B <= 0 ? 0 : B >= 255 ? 255 : Math.round(B);
    }
  }
  return out;
}

/** The QA measures on final RGB bytes (every 3rd pixel): mean luma 0-255, share of luma < 40, saturation. */
export function meter(rgb) {
  let sL = 0, dark = 0, sS = 0, n = 0;
  for (let i = 0; i < NPX * 3; i += 9) {
    const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2], L = 0.2126 * r + 0.7152 * g + 0.0722 * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sL += L; if (L < 40) dark++; sS += mx > 0 ? (mx - mn) / mx : 0; n++;
  }
  return { L: sL / n, dark: dark / n, S: sS / n };
}
export { lin };
