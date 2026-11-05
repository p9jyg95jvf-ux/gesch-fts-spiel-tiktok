// Arc Lab pipeline: the SEGMENT RENDERER. Renders one time segment of an episode (a "plate": picture only, no text)
// through the look engine. Each builder owns one segment and its shots module; plates join losslessly in assemble.
//
//   node <engine>/pipeline/renderSeg.mjs --ep ep01 --seg A --plan                 shot table + coverage check, no render
//   node <engine>/pipeline/renderSeg.mjs --ep ep01 --seg A --stills 30,140 --sub 2 [--png out/stills/A]   full-size PNGs
//   node <engine>/pipeline/renderSeg.mjs --ep ep01 --seg A --scale 0.5 --ss 1 --sub 2 --procs 6   DRAFT -> out/draft/plate_A_half.mp4
//   node <engine>/pipeline/renderSeg.mjs --ep ep01 --seg A --procs 8                 FINAL -> out/plate_A.mkv (lossless RGB)
//   node <engine>/pipeline/renderSeg.mjs --ep ep01 --seg all --plan                  every segment + out/cuts.json (for QA)
//   node <engine>/pipeline/renderSeg.mjs --ep ep01 --sheet out/qa/sheet_A.jpg --clips out/draft/plate_A_half.mp4:0 [--every 6]
//
// episode.json: { fps, width, height, grade: [{ preset, t0, ramp? }], segments: { A: { range: [a, b], shots: 'shots/shotsA.mjs' } } }
// The shots module exports SHOTS (look engine format: { id, t0, t1, motion, layers, draw(L, t, ctx) }, times in
// EPISODE seconds), optionally init(), CUES ({ name: seconds } for the sound mix) and ALLOW (planned fast moves).
// Options: --range a-b (global frames inside the segment), --out file (.mkv lossless | .mp4 x264), --scale 1|0.5,
// --procs N (parallel workers; the CPU count minus 2 is a good start), --sub N, --ss 1|2, --nolight, --nofinish.
// Contract: writes EXACTLY b-a+1 frames, verifies the count with ffprobe, exits 0 only on success.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { once } from 'events';
import { fileURLToPath, pathToFileURL } from 'url';

const SELF = fileURLToPath(import.meta.url), ENGINE = path.resolve(path.dirname(SELF), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes(`--${k}`);
const EP = path.resolve(opt('ep', '.'));
const rel = (p) => path.resolve(EP, p);
const fail = (msg) => { console.error(`renderSeg: ${msg}`); process.exit(1); };
const ENC_MKV = ['-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0', '-pix_fmt', 'rgb24', '-color_range', 'pc', '-colorspace', 'rgb', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1'];
const TO709 = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709';
const TAGS709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart'];

if (has('sheet')) { await sheet(); process.exit(0); }
if (!fs.existsSync(path.join(EP, 'episode.json'))) fail(`no episode.json in ${EP} (pass --ep <episode folder>)`);
const CFG = JSON.parse(fs.readFileSync(path.join(EP, 'episode.json'), 'utf8'));
const FPS = CFG.fps || 30, W = CFG.width || 1080, H = CFG.height || 1920;
const SEGS = CFG.segments || {};
const core = await import(pathToFileURL(path.join(ENGINE, 'look', 'core.mjs')).href);
const { renderFrame, shotAt, T } = await import(pathToFileURL(path.join(ENGINE, 'look', 'render.mjs')).href);
const grade = await import(pathToFileURL(path.join(ENGINE, 'look', 'grade.mjs')).href);
grade.setChapters(CFG.grade);
core.setSS(+opt('ss', 2));

if (has('look')) { await look(); process.exit(0); }
const SEG = (opt('seg') || '').toUpperCase();
if (SEG === 'ALL') { await all(); process.exit(0); }
if (!SEGS[SEG]) fail(`--seg must be one of ${Object.keys(SEGS).join(', ') || '(episode.json has no segments yet)'} or all`);
const [F0, F1] = SEGS[SEG].range;
const shotsFile = rel(opt('shots', SEGS[SEG].shots || `shots/shots${SEG}.mjs`));
const { SHOTS } = await loadShots(shotsFile);
const ropt = { sub: opt('sub') ? +opt('sub') : 0, light: !has('nolight'), finish: !has('nofinish') };
const [A, B] = opt('range', `${F0}-${F1}`).split('-').map(Number);
if (!(Number.isInteger(A) && Number.isInteger(B) && F0 <= A && A <= B && B <= F1)) fail(`--range ${A}-${B} must lie inside segment ${SEG} (${F0}-${F1})`);

if (has('plan')) { plan(SEG, SHOTS, A, B, true); process.exit(0); }
if (opt('stills')) { await stills(); process.exit(0); }
const scale = +opt('scale', 1);
if (scale !== 1 && scale !== 0.5) fail('--scale must be 1 or 0.5');
const out = rel(opt('out', scale === 1 ? `out/plate_${SEG}.mkv` : `out/draft/plate_${SEG}_half.mp4`));
if (!has('worker')) coverage(SHOTS, A, B, true);
if (has('worker') || !opt('procs') || +opt('procs') <= 1) await renderRange(A, B, out, scale, has('worker'));
else await parallel(A, B, +opt('procs'), out, scale);
if (!has('worker')) verify(out, B - A + 1, scale);

// ------------------------------------------------------------------------------------------------ helpers
// --look: the LOOK TEST. Renders <ep>/look/lookshots.mjs (its exported STILLS frames) to <ep>/look/stills/*.png
async function look() {
  const file = rel(opt('shots', 'look/lookshots.mjs')), mod = await loadShots(file), list = opt('stills') ? opt('stills').split(',').map(Number) : mod.STILLS || [];
  const dir = rel(opt('png', 'look/stills')); fs.mkdirSync(dir, { recursive: true });
  const ro = { sub: opt('sub') ? +opt('sub') : 0, light: !has('nolight'), finish: !has('nofinish') };
  for (const f of list) {
    const t0 = performance.now(), r = renderFrame(mod.SHOTS, f, ro);
    const file2 = path.join(dir, `${r.shot.id}.png`); fs.writeFileSync(file2, core.writePng(file2, r.bytes));
    console.log(file2, `${Math.round(performance.now() - t0)} ms`, r.grade.name, `mean luma ${r.m.L.toFixed(0)}, dark ${(r.m.dark * 100).toFixed(0)}%${r.m.L < 40 ? '  <- TOO DARK' : ''}`);
  }
}
async function loadShots(file) {
  if (!fs.existsSync(file)) fail(`shots module missing: ${file}`);
  const mod = await import(pathToFileURL(file).href);
  if (mod.VIEWS) for (const v of mod.VIEWS) core.bindView(v);
  if (mod.init) await mod.init();
  if (!Array.isArray(mod.SHOTS) || !mod.SHOTS.length) fail(`${file} exports no SHOTS`);
  return mod;
}
function coverage(shots, a, b, strict) {
  const gaps = [];
  for (let f = a; f <= b; f++) if (!shotAt(shots, f / FPS)) gaps.push(f);
  if (gaps.length && strict) fail(`no shot covers ${gaps.length} frame(s) of ${a}-${b} (first ${gaps.slice(0, 5).join(', ')}): fix the shots' t0/t1`);
  return gaps;
}
function plan(seg, shots, a, b, exit) {
  const rows = []; let cur = null;
  for (let f = a; f <= b; f++) {
    const s = shotAt(shots, f / FPS), id = s ? s.id : '(none)';
    if (!cur || cur.id !== id) { cur = { id, f0: f, f1: f, chapter: grade.gradeFor(f / FPS, s && (typeof s.grade === 'function' ? s.grade(f / FPS) : s.grade)).name, sub: s ? (s.sub || s.motion || 'medium') : '-' }; rows.push(cur); }
    cur.f1 = f;
  }
  console.log(`segment ${seg} ${a}-${b} (${b - a + 1} frames)`);
  for (const r of rows) console.log(`  ${String(r.id).padEnd(14)} ${String(r.f0).padStart(5)}-${String(r.f1).padStart(5)}  ${(r.f0 / FPS).toFixed(2)}-${((r.f1 + 1) / FPS).toFixed(2)} s  ${String(r.f1 - r.f0 + 1).padStart(4)} fr  ${String(r.chapter).padEnd(14)} ${r.sub}`);
  const gaps = coverage(shots, a, b, false);
  console.log(gaps.length ? `GAPS: ${gaps.length} frame(s) not covered (first ${gaps.slice(0, 8).join(', ')})` : 'coverage OK: every frame has a shot');
  if (gaps.length && exit) process.exit(1);
  return { rows, gaps };
}
async function all() {
  const cuts = [], cues = {}, allow = [];
  let bad = 0;
  for (const [k, v] of Object.entries(SEGS)) {
    const mod = await loadShots(rel(v.shots || `shots/shots${k}.mjs`));
    const { rows, gaps } = plan(k, mod.SHOTS, v.range[0], v.range[1], false);
    bad += gaps.length;
    for (const r of rows) cuts.push(r.f0);
    Object.assign(cues, mod.CUES || {});
    allow.push(...(mod.ALLOW || []));
  }
  fs.mkdirSync(rel('out'), { recursive: true });
  fs.writeFileSync(rel('out/cuts.json'), JSON.stringify({ cuts: [...new Set(cuts)].sort((a, b) => a - b), cues, allow }, null, 1));
  console.log(`wrote out/cuts.json (${cuts.length} cuts, ${Object.keys(cues).length} named cues)`);
  if (bad) process.exit(1);
}
function writer(file, scale) {
  const w = Math.round(W * scale / 2) * 2, h = Math.round(H * scale / 2) * 2, mkv = file.endsWith('.mkv');
  const vf = [];
  if (scale !== 1) vf.push(`scale=${w}:${h}:flags=area`);
  if (!mkv) vf.push(TO709);
  const enc = mkv ? ENC_MKV : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-profile:v', 'high', ...TAGS709];
  const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    ...(vf.length ? ['-vf', vf.join(',')] : []), ...enc, '-threads', '2', '-r', String(FPS), file], { stdio: ['pipe', 'ignore', 'inherit'], windowsHide: true });
  p.stdin.on('error', (e) => console.error('writer stdin:', e.message));
  return {
    async write(buf) { if (!p.stdin.write(Buffer.from(buf))) await once(p.stdin, 'drain'); },
    async close() { p.stdin.end(); const [code] = await once(p, 'close'); if (code !== 0) throw new Error(`ffmpeg exited ${code} for ${file}`); },
  };
}
async function renderRange(a, b, out, scale, isWorker) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const wr = writer(out, scale), per = [], t0 = performance.now();
  for (let f = a; f <= b; f++) {
    const ts = performance.now();
    const r = renderFrame(SHOTS, f, ropt);
    await wr.write(r.bytes);
    per.push({ f, shot: r.shot.id, chapter: r.grade.name, N: r.N, ms: Math.round(performance.now() - ts), L: +r.m.L.toFixed(1), dark: +r.m.dark.toFixed(3), sat: +r.m.S.toFixed(3),
      faces: (r.meta.faces || []).map((q) => q.map((v) => Math.round(v))), clues: (r.meta.clues || []).map((q) => q.map((v) => Math.round(v))) });
    if ((f - a) % 15 === 0) console.log(`frame ${f} ${r.shot.id} N${r.N} ${Math.round(performance.now() - ts)} ms L ${r.m.L.toFixed(0)}`);
  }
  await wr.close();
  const st = { segment: SEG, a, b, frames: b - a + 1, ss: core.SS, scale, wall_s: +((performance.now() - t0) / 1000).toFixed(1), ms: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, +(v / (b - a + 1)).toFixed(1)])), per };
  fs.writeFileSync(isWorker ? out + '.json' : out.replace(/\.[a-z0-9]+$/i, '') + '_stats.json', JSON.stringify(summary(st), null, 1));
  if (!isWorker) { layout(per); byShot(summary(st)); }
}
// out/layout_<SEG>.json: where the faces and clues are on every frame (screen px), so the overlay can keep captions off them
function layout(per) {
  const f = rel(`out/layout_${SEG}.json`), old = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { frames: {} };
  for (const p of per) old.frames[p.f] = { faces: p.faces || [], clues: p.clues || [] };
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(old));
}
function summary(st) {
  const by = {};
  for (const p of st.per) { const r = (by[p.shot] ||= { frames: 0, N: p.N, chapter: p.chapter, ms: 0, L: 0, dark: 0, sat: 0 }); r.frames++; r.ms += p.ms; r.L += p.L; r.dark += p.dark; r.sat += p.sat; }
  for (const r of Object.values(by)) for (const k of ['ms', 'L', 'dark', 'sat']) r[k] = +(r[k] / r.frames).toFixed(k === 'ms' ? 0 : 3);
  return { ...st, byShot: by };
}
function byShot(st) {
  for (const [id, r] of Object.entries(st.byShot)) console.log(`  ${id.padEnd(14)} ${String(r.chapter).padEnd(12)} N${r.N} ${String(r.frames).padStart(4)} fr  mean luma ${r.L}  dark ${r.dark}  ${r.ms} ms${r.L < 40 ? '   <- TOO DARK (mean luma under 40)' : ''}`);
}
async function parallel(a, b, procs, out, scale) {
  const tStart = Date.now(), n = b - a + 1, chunks = Math.min(Math.ceil(n / 6), procs * 3), step = Math.ceil(n / chunks), parts = [];
  for (let s = a; s <= b; s += step) parts.push([s, Math.min(b, s + step - 1)]);
  const dir = path.join(path.dirname(out), `_parts_${path.basename(out).replace(/\W/g, '_')}`);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const pass = ['sub', 'ss', 'shots'].flatMap((k) => (opt(k) ? [`--${k}`, opt(k)] : [])).concat(['nolight', 'nofinish'].filter(has).map((k) => `--${k}`));
  let next = 0, failed = false;
  async function worker() {
    while (next < parts.length && !failed) {
      const i = next++, [s, e] = parts[i], pf = path.join(dir, `p${String(i).padStart(4, '0')}.mkv`);
      let code = 1;
      for (let attempt = 0; attempt < 2 && code !== 0; attempt++) {
        const c = spawn(process.execPath, [SELF, '--worker', '--ep', EP, '--seg', SEG, '--range', `${s}-${e}`, '--out', pf, '--scale', '1', ...pass], { stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true });
        [code] = await once(c, 'close');
        if (code !== 0) console.error(`chunk ${s}-${e} failed (${code})${attempt ? '' : ', retrying'}`);
      }
      if (code !== 0) failed = true;
      else console.log(`chunk ${i + 1}/${parts.length} (${s}-${e}) done, ${((Date.now() - tStart) / 1000).toFixed(0)} s`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(procs, parts.length) }, worker));
  if (failed) fail('a chunk failed twice; nothing joined');
  const lst = path.join(dir, 'list.txt');
  fs.writeFileSync(lst, parts.map((_, i) => `file '${path.join(dir, `p${String(i).padStart(4, '0')}.mkv`).split(path.sep).join('/')}'`).join('\n'));
  const mkv = out.endsWith('.mkv'), w = Math.round(W * scale / 2) * 2, h = Math.round(H * scale / 2) * 2;
  const vf = [`setpts=N/${FPS}/TB`]; if (scale !== 1) vf.push(`scale=${w}:${h}:flags=area`); if (!mkv) vf.push(TO709);
  const enc = mkv ? ENC_MKV : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-profile:v', 'high', ...TAGS709];
  const j = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', vf.join(','), '-r', String(FPS), '-frames:v', String(n), ...enc, out], { stdio: 'inherit' });
  if (j.status !== 0 || !fs.existsSync(out)) fail('join failed');
  const per = [], tot = {};
  parts.forEach((_, i) => { const s = JSON.parse(fs.readFileSync(path.join(dir, `p${String(i).padStart(4, '0')}.mkv.json`), 'utf8')); per.push(...s.per); for (const [k, v] of Object.entries(s.ms)) tot[k] = (tot[k] || 0) + v * s.frames; });
  const wall = (Date.now() - tStart) / 1000;
  const st = summary({ segment: SEG, a, b, frames: n, procs, scale, ss: +opt('ss', 2), sub: opt('sub') || 'per shot', wall_s: +wall.toFixed(1), wall_ms_per_frame: +((wall * 1000) / n).toFixed(1),
    cpu_ms_per_frame: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, +(v / n).toFixed(1)])), per });
  fs.writeFileSync(out.replace(/\.[a-z0-9]+$/i, '') + '_stats.json', JSON.stringify(st, null, 1));
  layout(per);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('wrote', out, `${n} frames in ${wall.toFixed(0)} s`);
  byShot(st);
}
function verify(file, want, scale) {
  const pr = spawnSync('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets,width,height,pix_fmt', '-of', 'json', file], { encoding: 'utf8' });
  let s = {};
  try { s = JSON.parse(pr.stdout).streams[0]; } catch { fail(`ffprobe could not read ${file}`); }
  const got = +s.nb_read_packets, w = Math.round(W * scale / 2) * 2, h = Math.round(H * scale / 2) * 2;
  const ok = got === want && s.width === w && s.height === h;
  console.log(`verify ${path.relative(EP, file)}: ${got} frames (want ${want}), ${s.width}x${s.height} ${s.pix_fmt} -> ${ok ? 'OK' : 'WRONG'}`);
  if (!ok) process.exit(1);
}
async function stills() {
  const dir = rel(opt('png', `out/stills/${SEG}`)); fs.mkdirSync(dir, { recursive: true });
  const list = opt('stills').split(',').map(Number);
  for (const f of list) if (!(f >= F0 && f <= F1)) fail(`still ${f} is outside segment ${SEG} (${F0}-${F1})`);
  const res = [];
  for (const f of list) {
    const t0 = performance.now(), r = renderFrame(SHOTS, f, ropt);
    const file = path.join(dir, `${opt('tag', SEG)}_f${String(f).padStart(5, '0')}.png`); fs.writeFileSync(file, core.writePng(file, r.bytes));
    res.push({ f, shot: r.shot.id, chapter: r.grade.name, ms: Math.round(performance.now() - t0), L: +r.m.L.toFixed(1), dark: +r.m.dark.toFixed(3), sat: +r.m.S.toFixed(3) });
    console.log(file, `${Math.round(performance.now() - t0)} ms`, r.shot.id, r.grade.name, `mean luma ${r.m.L.toFixed(0)}, dark ${(r.m.dark * 100).toFixed(0)}%`);
  }
  fs.writeFileSync(path.join(dir, `${opt('tag', SEG)}_stills.json`), JSON.stringify({ ss: core.SS, res }, null, 1));
}
async function sheet() {
  const outF = rel(opt('sheet')), every = +opt('every', 6), tw = +opt('tw', 216), th = Math.round(tw * 16 / 9), cols = +opt('cols', 10);
  if (!opt('clips')) fail('--sheet needs --clips file:firstFrame[,file:firstFrame...]');
  const tiles = [];
  fs.mkdirSync(path.dirname(outF), { recursive: true });
  const tmp = path.join(path.dirname(outF), `_sheet_tmp_${process.pid}`); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const font = path.join(ENGINE, 'fonts', 'Oswald-Variable.ttf').split(path.sep).join('/').replace(':', '\\:');
  opt('clips').split(',').forEach((spec, ci) => {
    const k = spec.lastIndexOf(':'), file = k > 1 ? spec.slice(0, k) : spec, first = k > 1 ? spec.slice(k + 1) : '0';
    const pat = path.join(tmp, `c${ci}_%04d.png`);
    spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', rel(file), '-vf', `select=not(mod(n\\,${every})),scale=${tw}:${th}:flags=area,drawtext=fontfile='${font}':text='%{eif\\:n*${every}+${first}\\:d}':x=5:y=5:fontsize=${Math.round(tw / 9)}:fontcolor=white:box=1:boxcolor=black@0.55`, '-fps_mode', 'vfr', pat], { stdio: 'inherit' });
    for (const fn of fs.readdirSync(tmp).filter((q) => q.startsWith(`c${ci}_`)).sort()) tiles.push(path.join(tmp, fn));
  });
  if (!tiles.length) fail('no frames came out of the clips');
  const lst = path.join(tmp, 'list.txt');
  fs.writeFileSync(lst, tiles.map((p) => `file '${p.split(path.sep).join('/')}'`).join('\n'));
  const rows = Math.ceil(tiles.length / cols);
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-r', '1', '-i', lst, '-vf', `tile=${cols}x${rows}:padding=4:color=0x111111`, '-frames:v', '1', '-q:v', '3', outF], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('sheet', outF, tiles.length, 'tiles');
}
