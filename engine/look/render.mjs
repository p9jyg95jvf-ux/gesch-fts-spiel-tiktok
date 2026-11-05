// LOOK ENGINE / render: the layered frame renderer and the CLI.
//
// A shot module exports SHOTS = [shot, ...] (see LOOK_API.md). For each output frame the engine finds the shot,
// draws it N times inside the shutter (sub-frames), keeps per layer only the sub-frames inside that layer's own
// shutter angle, averages them in linear light at 1x (2x supersampled), then runs the light pass, the frame passes
// and the finish, and writes a lossless RGB plate.
//
//   node src/look/render.mjs --shots <module.mjs> [--range a-b] [--procs 24] [--out plate.mkv] [--stats s.json]
//   node src/look/render.mjs --shots <module.mjs> --stills 470,1000 --png <dir>      (full-size PNGs)
//   options: --ss 1|2 (default 2)  --sub N (force sub-frames)  --nolight  --nofinish (raw linear->sRGB)
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { once } from 'events';
import { pathToFileURL, fileURLToPath } from 'url';
import { W, H, FPS, NPX, SS, setSS, bindView, Layer, clearLayer, accum, zeroAcc, blurLayer, blurPad, enc, dec, lin, down4, qbuf, QW, QH, addUp4, Writer, writePng } from './core.mjs';
import { rim, shade, pointLight, shadowMask, applyShadow, dirTo, shaftRays, protectMask, bloom, glare, pool, dirBlur } from './light.mjs';
import { gradeFor, finish, meter } from './grade.mjs';

export const SUBS = { fast: 8, medium: 4, still: 1 };
const now = () => performance.now();
const colOf = (c) => (Array.isArray(c) ? c : lin(c));

// ---------------------------------------------------------------- shot preparation
function layerList(shot) {
  const L = Array.isArray(shot.layers) ? shot.layers : Object.entries(shot.layers);
  return L.map(([name, o = {}]) => [name, o]);
}
const PREP = new WeakMap();
function prep(shot) {
  if (PREP.has(shot)) return PREP.get(shot);
  const list = layerList(shot), L = {};
  list.forEach(([name, o], i) => { L[name] = new Layer(i, name, o); });
  const p = { list, L, names: list.map(([n]) => n) };
  PREP.set(shot, p); return p;
}
export function shotAt(SHOTS, t) {
  for (const s of SHOTS) if (t >= s.t0 - 1e-6 && t < s.t1 - 1e-6) return s;
  return null;
}

// ---------------------------------------------------------------- buffers
const frame = new Float32Array(NPX * 4), tmp = new Float32Array(NPX * 4), bytes = new Uint8Array(NPX * 3), KEEP = new Float32Array(NPX);
const TQ = qbuf(), TQ2 = qbuf(), SHM = [];
export const T = {};                   // ms per pass, summed
const tick = (k, t0) => { T[k] = (T[k] || 0) + now() - t0; };

/**
 * Render frame f (global reel frame) of the given shot list into RGB bytes (returned; reused buffer).
 * opt: { sub, light = true, finish = true }. Returns { bytes, meta, grade, shot, m (meter) }.
 */
export function renderFrame(SHOTS, f, opt = {}) {
  const tc = f / FPS, shot = shotAt(SHOTS, tc);
  if (!shot) throw new Error(`no shot covers frame ${f} (t=${tc.toFixed(3)})`);
  const P = prep(shot), { L, list, names } = P;
  const N = opt.sub || shot.sub || SUBS[shot.motion || 'medium'] || 4;
  const OFF = Array.from({ length: N }, (_, k) => ((k + 0.5) / N - 0.5) * 0.5);    // sub-frame offsets (frames), 180 deg max
  const kc = N >> 1;                                                               // the centre sample (meta, still layers)
  const keep = (o, k) => { const ang = o.shutter ?? 180; if (ang <= 0 || N === 1) return k === kc; return Math.abs(OFF[k]) <= Math.max(ang / 720, Math.abs(OFF[kc])) + 1e-9; };
  const CNT = {}; for (const [n, o] of list) CNT[n] = OFF.filter((_, k) => keep(o, k)).length;

  let t0 = now();
  for (const n of names) zeroAcc(L[n]);
  tick('zero', t0);
  let meta = {};
  for (let k = 0; k < N; k++) {
    const ts = Math.min(shot.t1 - 1e-4, Math.max(shot.t0, tc + OFF[k] / FPS));
    t0 = now(); for (const [n, o] of list) { clearLayer(L[n]); L[n].on = keep(o, k); } tick('clear', t0);
    t0 = now(); const m = shot.draw(L, ts, { f, k, N, tc, shot }) || {}; tick('draw', t0);
    if (k === kc) meta = m;
    // canvas.data() flushes Skia's deferred drawing (the real rasterisation cost) and copies the pixels: timed as 'raster'
    for (const [n] of list) { const l = L[n]; if (l.on && l.s.used) { let t1 = now(); const src = l.s.cv.data(); tick('raster', t1); t1 = now(); accum(l, 1 / CNT[n], src); tick('accum', t1); } }
  }

  // ---- light configuration: chapter defaults <- shot.light (object or fn(meta, t)) <- meta.light
  const g = gradeFor(tc, typeof shot.grade === 'function' ? shot.grade(tc) : shot.grade);
  const K = { ...g.key, ...(typeof shot.light === 'function' ? shot.light(meta, tc) : shot.light || {}), ...(meta.light || {}) };
  const sun = meta.sun || K.sun || [W * 0.78, H * 0.18], hz = meta.hz ?? K.hz ?? H * 0.45;
  const lightOn = opt.light !== false;
  const kCol = colOf(K.col), shCol = colOf(K.shadeCol), hzCol = colOf(K.hazeCol), csCol = colOf(K.shadowCol);
  const subjects = list.filter(([, o]) => o.subject).map(([n]) => n);
  const under = K.shaftUnder !== undefined ? K.shaftUnder : subjects[0] ?? null;
  const points = (meta.points || []).map((p) => ({ ...p, col: colOf(p.col || '#FFE9B0') }));

  // ---- compose bottom to top
  t0 = now();
  frame.fill(0); for (let i = 3; i < frame.length; i += 4) frame[i] = 1;
  KEEP.fill(0);
  tick('compose', t0);
  let shaftsDone = !(lightOn && K.shafts > 0);
  const doShafts = (li) => {
    const t1 = now();
    TQ.fill(0); for (let i = 3; i < TQ.length; i += 4) TQ[i] = 1;
    for (let lj = li; lj < list.length; lj++) { const lo = L[list[lj][0]], bl = list[lj][1].blend; if (!lo.s.any || bl === 'add' || bl === 'screen') continue; down4(lo.acc, TQ2); for (let i = 3; i < TQ.length; i += 4) TQ[i] *= 1 - Math.min(1, TQ2[i]); }
    const sh = shaftRays(frame, TQ, sun, { thr: K.shaftThr ?? 0.5, soft: K.shaftSoft ?? 0.25, decay: K.shaftDecay ?? 0.972, density: K.shaftDensity ?? 1.0, ymax: K.shaftYmax ?? hz + 10, srcR: K.shaftR ?? 0 });
    addUp4(frame, sh, colOf(K.shaftCol || K.col), K.shafts, { fade: K.shaftFade || [sun[1] - 420, sun[1] + 60], fadeOut: K.shaftFadeOut === undefined ? [hz + 150, hz + 900] : K.shaftFadeOut });
    shaftsDone = true; tick('shafts', t1);
  };
  // long soft cast shadows: masks from the subjects' own silhouettes. By default a shadow lands on everything
  // composited before its layer (the ground behind); `onto: ['MF', 'FG']` also darkens named layers in front of it.
  const SH = [];
  if (lightOn && meta.shadows) {
    t0 = now();
    meta.shadows.forEach((cs, i) => {
      const lay = L[cs.layer]; if (!lay || !lay.s.any) return;
      const foot = cs.foot, len = cs.len ?? 2.0, dvx = foot[0] - sun[0], dvy = foot[1] - sun[1], dl = Math.hypot(dvx, dvy) || 1;
      const sx = cs.sx ?? (dvx / dl) * len, sy = cs.sy ?? Math.max(0.08, Math.min(0.45, (dvy / dl) * len * 0.3));
      const m = shadowMask(lay.acc, lay.s.bb, { foot, sx, sy, blurQ: cs.blur ?? 3, hz: cs.hz ?? hz, grow: cs.grow ?? 0.6 }, (SHM[i] ||= qbuf()));
      if (m) SH.push({ ...cs, m, k: cs.k ?? K.shadowK, hz: cs.hz ?? hz });
    });
    tick('castShadow', t0);
  }
  for (let li = 0; li < list.length; li++) {
    const [n, o] = list[li], l = L[n], s = l.s;
    // light shafts go in UNDER this layer: rays from bright sky not covered by this layer or anything above it
    if (!shaftsDone && (n === under || (under == null && (o.blend === 'add' || o.blend === 'screen')))) doShafts(li);
    for (const sh of SH) if (sh.layer === n && !sh.behindDone) { t0 = now(); applyShadow(frame, sh.m, { k: sh.k, col: csCol, hz: sh.hz }); sh.behindDone = true; tick('castShadow', t0); }
    if (!s.any) continue;
    const b = s.acc, bb = s.bb, isSub = !!o.subject;
    for (const sh of SH) if (sh.onto && sh.onto.includes(n)) { t0 = now(); applyShadow(b, sh.m, { k: sh.k, col: csCol, hz: sh.hz }); tick('castShadow', t0); }
    if (o.gain !== undefined && o.gain !== 1) { t0 = now(); const gk = o.gain; for (let y = bb[1]; y < bb[3]; y++) for (let x = bb[0]; x < bb[2]; x++) { const i = (y * W + x) * 4; b[i] *= gk; b[i + 1] *= gk; b[i + 2] *= gk; } tick('gain', t0); }
    if (lightOn && o.light !== false && o.blend !== 'add') {
      const dir = dirTo(bb, sun), bbMin = Math.min(bb[2] - bb[0], bb[3] - bb[1]);
      const kShade = (o.shade ?? (isSub ? 1 : 0)) * K.shade, kRim = (o.rim ?? (isSub ? 1 : 0)) * K.rim;
      if (kShade > 0) { t0 = now(); shade(b, bb, dir, { width: o.shadeW ?? Math.max(K.shadeW, 0.09 * bbMin), col: shCol, k: kShade }); tick('shade', t0); }
      if (kRim > 0) { t0 = now(); rim(b, bb, dir, { dist: o.rimW ?? K.rimW, inset: o.rimInset ?? (isSub ? 6 : 0), col: kCol, k: kRim }); tick('rim', t0); }
      for (const p of points) if (p.layers ? p.layers.includes(n) : o.blend !== 'screen') { t0 = now(); pointLight(b, bb, p); tick('points', t0); }
    }
    if (!isSub && (o.haze || o.tint)) {
      t0 = now();
      const hw = o.hazeW ?? 220;
      for (let y = bb[1]; y < bb[3]; y++) {
        const h = (o.tint || 0) + (o.haze ? o.haze * Math.exp(-(((y - hz + 40) / hw) ** 2)) : 0); if (h <= 0.001) continue;
        for (let x = bb[0]; x < bb[2]; x++) { const i = (y * W + x) * 4, a = b[i + 3]; b[i] += (hzCol[0] * a - b[i]) * h; b[i + 1] += (hzCol[1] * a - b[i + 1]) * h; b[i + 2] += (hzCol[2] * a - b[i + 2]) * h; }
      }
      tick('haze', t0);
    }
    if (!isSub && o.dof >= 0.35) {
      t0 = now(); blurLayer(b, o.dof, tmp, bb[1], bb[3]);
      const p = blurPad(o.dof); s.bb = [Math.max(0, bb[0] - p), Math.max(0, bb[1] - p), Math.min(W, bb[2] + p), Math.min(H, bb[3] + p)];   // the blur spread the content
      tick('dof', t0);
    }
    // blend
    t0 = now();
    const [xa, ya, xb, yb] = s.bb;
    if (o.blend === 'add') {
      const k = o.k ?? 1;
      for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) { const i = (y * W + x) * 4; frame[i] += b[i] * k; frame[i + 1] += b[i + 1] * k; frame[i + 2] += b[i + 2] * k; }
    } else if (o.blend === 'screen') {
      // display-space "over" for screen-space overlays designed in sRGB (old dawn passes, speed lines)
      for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
        const i = (y * W + x) * 4, a = b[i + 3]; if (a <= 0.0005) continue; const ia = 1 - a, ra = 1 / a;
        for (let c = 0; c < 3; c++) frame[i + c] = dec(enc(b[i + c] * ra) * a + enc(frame[i + c]) * ia);
        KEEP[i >> 2] *= ia;
      }
    } else {
      // KEEP = how much of each final pixel is a subject's own colour (grade protection in the finish)
      for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
        const i = (y * W + x) * 4, a = b[i + 3]; if (a <= 0) continue; const ia = 1 - a, p = i >> 2;
        frame[i] = b[i] + frame[i] * ia; frame[i + 1] = b[i + 1] + frame[i + 1] * ia; frame[i + 2] = b[i + 2] + frame[i + 2] * ia;
        KEEP[p] = isSub ? (a > 1 ? 1 : a) + KEEP[p] * ia : KEEP[p] * ia;
      }
    }
    tick('blend', t0);
  }

  if (!shaftsDone) doShafts(list.length);
  // ---- frame passes
  if (lightOn) {
    t0 = now();
    const pk = K.pool, pa = meta.pool || {};
    if ((pa.k ?? pk) > 0) pool(frame, { ...pa, k: pa.k ?? pk });
    tick('pool', t0);
    t0 = now();
    const prot = protectMask(subjects.map((n) => (L[n].s.any ? L[n].acc : null)).filter(Boolean), meta.faces || []);
    tick('protect', t0);
    if (K.bloom > 0) { t0 = now(); bloom(frame, { thr: K.bloomThr, k: K.bloom, protect: prot, protectK: K.protectK ?? 0.9 }); tick('bloom', t0); }
    if (K.glare > 0) { t0 = now(); glare(frame, sun, { r: K.glareR ?? 700, k: K.glare, col: kCol, protect: prot }); tick('glare', t0); }
  }
  if (meta.blur && Math.hypot(meta.blur[0], meta.blur[1]) >= 2) { t0 = now(); dirBlur(frame, meta.blur[0], meta.blur[1]); tick('whip', t0); }
  if (opt.float) return { frame, keep: KEEP, meta, grade: g, shot, N };
  t0 = now();
  if (opt.finish === false) {
    for (let i = 0, o = 0; i < NPX * 4; i += 4, o += 3) { bytes[o] = Math.round(enc(frame[i]) * 255); bytes[o + 1] = Math.round(enc(frame[i + 1]) * 255); bytes[o + 2] = Math.round(enc(frame[i + 2]) * 255); }
  } else finish(frame, bytes, f, g, KEEP);
  tick('finish', t0);
  t0 = now(); const m = meter(bytes); tick('meter', t0);
  return { bytes, meta, grade: g, shot, m, N };
}

// ---------------------------------------------------------------- CLI
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes(`--${k}`);
const SELF = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === SELF.toLowerCase();
if (isMain) setImmediate(() => main().catch((e) => { console.error(e); process.exit(1); }));   // not awaited: shot modules import index.mjs -> this file

async function loadShots(file) {
  const mod = await import(pathToFileURL(path.resolve(file)).href);
  if (mod.VIEWS) for (const v of mod.VIEWS) bindView(v);
  if (mod.init) await mod.init();
  return mod.SHOTS;
}
async function main() {
  setSS(+opt('ss', 2));
  const shotsFile = opt('shots'); if (!shotsFile) { console.error('need --shots <module.mjs>'); process.exit(1); }
  const SHOTS = await loadShots(shotsFile);
  const ropt = { sub: opt('sub') ? +opt('sub') : 0, light: !has('nolight'), finish: !has('nofinish') };
  if (opt('stills')) {
    const dir = path.resolve(opt('png', 'look_stills')); fs.mkdirSync(dir, { recursive: true });
    const res = [];
    for (const f of opt('stills').split(',').map(Number)) {
      const t0 = now(); const r = renderFrame(SHOTS, f, ropt); const ms = now() - t0;
      const file = path.join(dir, `${opt('tag', 'look')}_f${String(f).padStart(5, '0')}.png`); fs.writeFileSync(file, writePng(file, r.bytes));
      res.push({ f, shot: r.shot.id, chapter: r.grade.name, ms: Math.round(ms), L: +r.m.L.toFixed(1), dark: +r.m.dark.toFixed(3), sat: +r.m.S.toFixed(3) });
      console.log(file, `${Math.round(ms)} ms`, `L ${r.m.L.toFixed(0)} dark ${(r.m.dark * 100).toFixed(0)}%`);
    }
    fs.writeFileSync(path.join(dir, `${opt('tag', 'look')}_stills.json`), JSON.stringify({ ss: SS, res, ms: perFrame(res.length) }, null, 1));
    return;
  }
  const all = SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]);
  const [a, b] = opt('range', `${Math.min(...all)}-${Math.max(...all)}`).split('-').map(Number);
  const out = path.resolve(opt('out', 'look_out.mkv')), statsFile = opt('stats', out.replace(/\.[a-z0-9]+$/i, '') + '_stats.json');
  if (has('worker') || !opt('procs') || +opt('procs') <= 1) await renderRange(SHOTS, a, b, out, statsFile, ropt);
  else await parallel(shotsFile, a, b, +opt('procs'), out, statsFile);
}
function perFrame(n) { return Object.fromEntries(Object.entries(T).map(([k, v]) => [k, +(v / n).toFixed(1)])); }

async function renderRange(SHOTS, a, b, out, statsFile, ropt) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const wr = new Writer(out), frames = [], tStart = now();
  for (let f = a; f <= b; f++) {
    const t0 = now(); const r = renderFrame(SHOTS, f, ropt); const ms = now() - t0;
    const tw = now(); await wr.write(r.bytes); tick('write', tw);
    frames.push({ f, shot: r.shot.id, chapter: r.grade.name, N: r.N, ms: Math.round(ms), L: +r.m.L.toFixed(1), dark: +r.m.dark.toFixed(3), sat: +r.m.S.toFixed(3) });
    if ((f - a) % 10 === 0) console.log(`frame ${f} ${r.shot.id} N${r.N} ${Math.round(ms)} ms  L ${r.m.L.toFixed(0)}`);
  }
  await wr.close();
  const nf = b - a + 1;
  fs.writeFileSync(statsFile, JSON.stringify({ a, b, frames: nf, ss: SS, wall_s: +((now() - tStart) / 1000).toFixed(1), ms: perFrame(nf), per: frames }, null, 1));
}

// split [a, b] into chunks (3 per process for load balance), run `procs` workers at a time, join losslessly in order
async function parallel(shotsFile, a, b, procs, out, statsFile) {
  const tStart = Date.now(), n = b - a + 1, chunks = Math.min(n, procs * 3), step = Math.ceil(n / chunks), parts = [];
  for (let s = a; s <= b; s += step) parts.push([s, Math.min(b, s + step - 1)]);
  const dir = path.join(path.dirname(out), `_parts_${path.basename(out).replace(/\W/g, '_')}`); fs.mkdirSync(dir, { recursive: true });
  const pass = ['ss', 'sub'].flatMap((k) => (opt(k) ? [`--${k}`, opt(k)] : [])).concat(['nolight', 'nofinish'].filter(has).map((k) => `--${k}`));
  let next = 0, failed = false;
  const self = SELF;
  async function worker() {
    while (next < parts.length && !failed) {
      const i = next++, [s, e] = parts[i], pf = path.join(dir, `p${String(i).padStart(4, '0')}.mkv`);
      const c = spawn(process.execPath, [self, '--worker', '--shots', shotsFile, '--range', `${s}-${e}`, '--out', pf, '--stats', pf + '.json', ...pass], { stdio: ['ignore', 'ignore', 'inherit'] });
      const [code] = await once(c, 'close'); if (code !== 0) { failed = true; console.error('chunk failed', s, e, code); }
      else console.log(`chunk ${i + 1}/${parts.length} (${s}-${e}) done, ${((Date.now() - tStart) / 1000).toFixed(0)} s`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(procs, parts.length) }, worker));
  if (failed) process.exit(1);
  const lst = path.join(dir, 'list.txt');
  fs.writeFileSync(lst, parts.map((_, i) => `file '${path.join(dir, `p${String(i).padStart(4, '0')}.mkv`).split(path.sep).join('/')}'`).join('\n'));
  const c = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out], { stdio: 'inherit' }); await once(c, 'close');
  // merge stats
  const st = parts.map((_, i) => JSON.parse(fs.readFileSync(path.join(dir, `p${String(i).padStart(4, '0')}.mkv.json`), 'utf8')));
  const tot = {}; let nf = 0; const per = [];
  for (const s of st) { nf += s.frames; per.push(...s.per); for (const [k, v] of Object.entries(s.ms)) tot[k] = (tot[k] || 0) + v * s.frames; }
  const byShot = {};
  for (const p of per) { const r = (byShot[p.shot] ||= { frames: 0, N: p.N, chapter: p.chapter, ms: 0, L: 0, dark: 0, sat: 0 }); r.frames++; r.ms += p.ms; r.L += p.L; r.dark += p.dark; r.sat += p.sat; }
  for (const r of Object.values(byShot)) { for (const k of ['ms', 'L', 'dark', 'sat']) r[k] = +(r[k] / r.frames).toFixed(k === 'ms' ? 0 : 3); }
  const wall = (Date.now() - tStart) / 1000;
  const summary = { a, b, frames: nf, procs, cpus: os.cpus().length, wall_s: +wall.toFixed(1), wall_ms_per_frame: +((wall * 1000) / nf).toFixed(1), cpu_ms_per_frame: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, +(v / nf).toFixed(1)])), byShot, per };
  fs.writeFileSync(statsFile, JSON.stringify(summary, null, 1));
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f)); fs.rmdirSync(dir);
  console.log('wrote', out, `${nf} frames in ${wall.toFixed(0)} s`);
}
