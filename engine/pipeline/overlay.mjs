// Arc Lab pipeline: the OVERLAY. Every word on screen that is not part of the picture: the HUD, captions (chunked,
// *yellow* key words, !red! danger words), speaker name chips, story cards, the "last episode's vote" card, the vote
// pills, the end card. Transparent PNGs (overlay/00000.png ...) that assemble composites over the plates, plus
// overlay/cues_overlay.json (when each card/pill lands) for the sound mix. Pure data: episode.json + timeline + story.
//
//   node <engine>/pipeline/overlay.mjs --ep ep01 --all [--procs 4]     every frame
//   node <engine>/pipeline/overlay.mjs --ep ep01 --range 0 120           some frames
//   node <engine>/pipeline/overlay.mjs --ep ep01 --stills 40,700,980     full-size PNG previews over grey (out/overlay_stills)
//   node <engine>/pipeline/overlay.mjs --ep ep01 --cues                  only cues_overlay.json
//
// SAFE FRAME (docs/SAFE_ZONE.md; final_qa checks every overlay frame against it): on a phone the apps crop 50-100 px
// off each side and draw their header over y < 270, the like/comment rail over x > 860 from y 900 down, and the name,
// caption and trial-reel rows below y 1480. So every word sits inside x 120-960 and y 270-1480, and from y 900 down left
// of x 860; captions stay in the band y 1180-1440, centred, at most 640 px wide (x 220-860) and at most 2 rows (longer
// lines page: chunks 3-4 replace 1-2). Pop-ins never grow a box past those lines. ONE text layer at a time: a caption,
// OR a card, OR the vote. Never cover a clue: list its rectangle in episode.json overlay.avoid and the captions move up
// (still inside the safe frame, never below y 1440).
//
// episode.json "overlay": {
//   "hud":  { "from": 2.0, "tag": "NIGHT 1", "clock": [[0, "2:13 AM"], [18, "2:14 AM"]], "place": [[0, "GULL ROCK LIGHT"]], "pill": "EP 1" },
//   "cards": { "style": "clue", "chip": true },       story cards come from the timeline (a beat's "card")
//   "avoid": [{ "f": [600, 700], "rect": [x, y, w, h] }],
//   "vote":  { "title": "WHAT DO YOU DO?" },           options come from story.json "vote"
//   "end":   { "kicker": "PIP OF GULL ROCK · NIGHT 1", "title": "EPISODE 2", "follow": "FOLLOW FOR EPISODE 2" },
//   "stat":  { "title": "EPISODE 1 · YOUR VOTE" }       a stat line (story line "stat": true) + stats.json
// }
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { once } from 'events';
import { fileURLToPath, pathToFileURL } from 'url';
import { createCanvas, clamp, lerp, seg, in2, out, kick } from '../lib.mjs';

const SELF = fileURLToPath(import.meta.url);
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes(`--${k}`);
const EP = path.resolve(opt('ep', '.'));
const readJ = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const CFG = readJ(path.join(EP, 'episode.json'), {}), OV = CFG.overlay || {};
// timeline.json first: after a re-take on a locked episode it holds the new word times (on the lock's line starts)
const TL = readJ(path.join(EP, 'timeline.json'), null) || readJ(path.join(EP, 'timeline_lock.json'), null);
if (!TL) { console.error('overlay: no timeline.json (run the voice step first)'); process.exit(1); }
const STORY = readJ(path.join(EP, 'story.json'), {}), STATS = readJ(path.join(EP, 'stats.json'), null);
const seriesRoot = (() => { let p = EP; for (let i = 0; i < 6; i++) { if (fs.existsSync(path.join(p, 'arclab.json'))) return p; p = path.dirname(p); } return EP; })();
const VOICES = readJ(path.join(seriesRoot, 'series', 'VOICES.json'), { cast: {} });
const W = 1080, H = 1920, FPS = TL.fps || 30, N = TL.frames, LN = TL.lines;
const YEL = '#FFD84A', RED = '#FF4A3D', WHITE = '#FFFFFF', GREY = '#C9CFD9', INKC = '#000000';
const F = (s) => `bold ${s}px Oswald`;
export const SAFE = { x0: 120, y0: 270, x1: 960, y1: 1480, railX: 860, railY: 900, cap: [220, 1180, 860, 1440] };   // = engine/safezone/check.py
const XL = 140, XR = 940, CW = SAFE.cap[2] - SAFE.cap[0], CAPW = 610;   // panels 20 px inside the frame; caption rows fit 610 so a pop stays in 640
const CAP_MID = (SAFE.cap[1] + SAFE.cap[3]) / 2, HUD_Y = 280, CHIP_Y = 432, ROWS = 2;
const M = createCanvas(64, 64).getContext('2d');
M.font = F(100); const CAP = M.measureText('H').actualBoundingBoxAscent / 100;

// ------------------------------------------------------------------------------------------------ timing
const NORM = (s) => String(s).toLowerCase().replace(/[*!"“”.,?;:—…]/g, '').replace(/’/g, "'").trim();
const TOK = LN.map((l) => l.text.split(/\s+/).filter(Boolean).map(NORM));
const wordT = (li, w, fb) => { const k = TOK[li].indexOf(NORM(w)); return k >= 0 && LN[li].words[k] !== undefined ? LN[li].words[k] : fb; };
const L_VOTE = LN.findIndex((l) => l.vote), L_CMT = LN.findIndex((l) => l.cmt), L_STAT = LN.findIndex((l) => l.stat);
const OPTS = (STORY.vote && STORY.vote.options) || [];
const CUTS = (readJ(path.join(EP, 'out', 'cuts.json'), {}).cuts || []).map((f) => f / FPS);
const cutIn = (a, b) => CUTS.find((c) => c > a + 1e-6 && c <= b + 1e-6);           // the first cut inside (a, b]
// the vote card lands 0.35 s before the vote line, or on the cut into the vote shot if that comes later
const T_VOTE = L_VOTE >= 0 ? Math.max(LN[L_VOTE].start - 0.35, cutIn(LN[L_VOTE].start - 0.6, LN[L_VOTE].start) ?? -1) : null;
const T_OPT = OPTS.map((o, i) => (L_VOTE >= 0 ? wordT(L_VOTE, o.say || o.label.split(' ')[0], LN[L_VOTE].start + i * (LN[L_VOTE].end - LN[L_VOTE].start) / 3) : null));
const T_CMT = L_CMT >= 0 ? LN[L_CMT].start : null;
const T_NUM = L_CMT >= 0 ? ['one', 'two', 'three', 'four'].map((w) => wordT(L_CMT, w, null)) : [];
const T_END = OV.end ? (OV.end.at ?? (L_CMT >= 0 ? LN[L_CMT].end + 0.25 : N / FPS - 3)) : null;
const HUD = OV.hud || null, T_HUD = HUD ? (HUD.from ?? 2.0) : 1e9;
// story cards: slam ~0.85 s before their line, shrink to a chip under the HUD after it starts
const CARDS = LN.filter((l) => l.card).map((l, k) => ({ text: l.card, t0: Math.max(0, l.start - 0.85), t1: l.start + 0.35, li: l.i, k }));
CARDS.forEach((c, k) => { c.chipEnd = k + 1 < CARDS.length ? CARDS[k + 1].t0 : (T_VOTE ?? N / FPS); });
// stat card (the last episode's vote), shown over its stat line's slot
const STAT = L_STAT >= 0 && STATS ? { t0: LN[L_STAT].start - 0.15, t1: LN[L_STAT].start + (LN[L_STAT].slot || 4.4) - 0.2, stamp: LN[L_STAT].end - 0.4 } : null;
// captions: each line's chunks show from their start until the line ends (+ a short hold), never into the next line or
// past a cut near its end
const CAPS = LN.filter((l) => l.chunks && l.chunks.length).map((l) => ({ l, t1: Math.min(l.end + 0.32, (LN[l.i + 1]?.start ?? 1e9) - 0.06, cutIn(l.end - 0.25, l.end + 0.32) ?? 1e9) }));   // a cut in the line's last 0.25 s ends it too
// LAYOUT: faces and clues per frame (written by renderSeg as out/layout_<SEG>.json) + manual avoid rects. Each caption
// line gets ONE position for its whole life (no jumping): the normal band if it is clear on every frame it shows,
// else just above (or below) whatever it would cover.
const LAY = {};
for (const fn of (fs.existsSync(path.join(EP, 'out')) ? fs.readdirSync(path.join(EP, 'out')) : []).filter((q) => /^layout_.*\.json$/.test(q))) Object.assign(LAY, JSON.parse(fs.readFileSync(path.join(EP, 'out', fn), 'utf8')).frames);
function obstacles(f) {
  const o = [], L = LAY[f];
  if (L) { for (const [x, y, r] of L.faces || []) o.push([x - r, y - r, x + r, y + r]); for (const [x, y, w, h] of L.clues || []) o.push([x, y, x + w, y + h]); }
  for (const av of OV.avoid || []) if (f >= av.f[0] && f <= av.f[1]) { const [x, y, w, h] = av.rect; o.push([x, y, x + w, y + h]); }
  return o;
}
const capSize = (l, ch) => fit(rich(ch.text), l.chunks.length > ROWS ? 78 : 86, CAPW);
function capLayout(C) {
  const pages = [];                                    // the tallest page of <= 2 rows sets the box for the whole line
  C.l.chunks.forEach((ch, k) => { (pages[Math.floor(k / ROWS)] ||= []).push(capSize(C.l, ch) * 1.08); });
  const total = Math.max(...pages.map((p) => p.reduce((a, b) => a + b, 0))) + (VOICES.cast?.[C.l.speaker]?.chip ? 56 : 0);
  C.total = total;
  const f0 = Math.round(C.l.chunks[0].start * FPS), f1 = Math.ceil(C.t1 * FPS - 1e-6) - 1, obs = [];   // the frames it is drawn on (t < t1)
  for (let f = f0; f <= f1; f++) obs.push(...obstacles(f).filter((b) => b[2] > 540 - CW / 2 - 10 && b[0] < 540 + CW / 2 + 10));
  const hits = (top) => obs.filter((b) => !(b[3] < top - 10 || b[1] > top + total + 10));
  const lo = HUD ? CHIP_Y + 62 + 24 : SAFE.y0 + 24, hi = SAFE.cap[3];       // a moved caption: under the HUD, never below 1440
  let top = clamp(CAP_MID - total / 2, SAFE.cap[1], hi - total);
  C.moved = false;
  if (hits(top).length) {
    const above = Math.min(...hits(top).map((b) => b[1])) - total - 30, below = Math.max(...hits(top).map((b) => b[3])) + 30;
    const cands = [above, below].filter((y) => y >= lo && y + total <= hi && !hits(y).length);
    if (!cands.length) {                             // nothing clear next to it: the clear spot nearest the normal band,
      const want = CAP_MID - total / 2;                                          // anywhere between the HUD and y 1440
      for (let y = lo; y + total <= hi; y += 10) if (!hits(y).length) cands.push(y);
      cands.sort((p, q) => Math.abs(p - want) - Math.abs(q - want));
    }
    top = cands.length ? cands[0] : Math.max(lo, above);
    C.moved = true;
  }
  return top;
}
function layoutCaps() { if (!LAID) { CAPS.forEach((C) => { C.top = capLayout(C); }); LAID = true; } }
let LAID = false;                                    // caption positions are worked out on the first frame drawn

export function cues() {
  const o = { hud: HUD ? { in: T_HUD } : null, cards: CARDS.map((c) => ({ text: c.text, in: c.t0, chip: c.t1 })), stat: STAT ? { in: STAT.t0, stamp: STAT.stamp, out: STAT.t1 } : null,
    vote: T_VOTE !== null ? { in: T_VOTE, pills: T_OPT, comment: T_CMT, nums: T_NUM } : null, end: T_END !== null ? { in: T_END } : null };
  return o;
}

// ------------------------------------------------------------------------------------------------ drawing helpers
const POOL = []; let DEPTH = 0;
function layer(x, a, fn) {                 // draw a group at full opacity offscreen, composite it at alpha (no outline-through-fill)
  if (a <= 0.003) return;
  if (a >= 0.997) { fn(x); return; }
  const c = POOL[DEPTH] || (POOL[DEPTH] = createCanvas(W, H)), y = c.getContext('2d');
  y.setTransform(1, 0, 0, 1, 0, 0); y.globalAlpha = 1; y.clearRect(0, 0, W, H);
  DEPTH++; try { fn(y); } finally { DEPTH--; }
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha *= a; x.drawImage(c, 0, 0); x.restore();
}
function rich(s, base = WHITE) {           // *word* = yellow, !word! = red
  const chars = []; let c = base;
  for (const ch of s) { if (ch === '*') { c = c === YEL ? base : YEL; continue; } if (ch === '!') { c = c === RED ? base : RED; continue; } chars.push({ ch: ch.toUpperCase(), c }); }
  const words = []; let cur = null;
  for (const o of chars) { if (o.ch === ' ') { cur = null; continue; } if (!cur) { cur = []; words.push(cur); } const last = cur[cur.length - 1]; if (last && last.c === o.c) last.t += o.ch; else cur.push({ t: o.ch, c: o.c }); }
  return words;
}
const join = (words) => words.flatMap((w, i) => (i ? [{ t: ' ', c: WHITE }, ...w] : w));
function runsW(x, runs, size) { x.font = F(size); return runs.reduce((a, r) => a + x.measureText(r.t).width, 0); }
function fit(words, size, maxW, minSize = 44) { for (let s = size; s >= minSize; s -= 2) if (runsW(M, join(words), s) + 0.2 * s <= maxW) return s; return minSize; }
function text(x, runs, X, Y, size, o = {}) {
  const { align = 'center', sw = 0.2, shadow = 1, outline = INKC } = o;
  x.font = F(size); x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  const ws = runs.map((r) => x.measureText(r.t).width), w = ws.reduce((a, b) => a + b, 0);
  const sx = align === 'center' ? X - w / 2 : align === 'left' ? X : X - w;
  x.save(); x.lineJoin = 'round'; x.miterLimit = 2; x.lineWidth = size * sw; x.strokeStyle = outline; x.fillStyle = outline;
  if (shadow > 0.01) { x.shadowColor = `rgba(0,0,0,${0.5 * shadow})`; x.shadowBlur = size * 0.25; x.shadowOffsetY = size * 0.08; }
  let px = sx; runs.forEach((r, i) => { if (sw > 0) x.strokeText(r.t, px, Y); x.fillText(r.t, px, Y); px += ws[i]; });
  x.restore();
  px = sx; runs.forEach((r, i) => { x.fillStyle = r.c; x.fillText(r.t, px, Y); px += ws[i]; });
  return w;
}
function rrect(x, X, Y, w, h, r) { r = Math.max(0, Math.min(r, h / 2, w / 2)); x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function panel(x, X, Y, w, h, bg = 'rgba(10,12,20,0.78)', r = 26) {
  x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 24; x.shadowOffsetY = 6; rrect(x, X, Y, w, h, r); x.fillStyle = bg; x.fill(); x.restore();
  x.save(); rrect(x, X, Y, w, h, r); x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,0.14)'; x.stroke(); x.restore();
}
function pill(x, cx, cy, label, size, bg, o = {}) {
  const { padX = size * 0.6, h = size * 1.55, fg = WHITE, w: wFix } = o;
  const w = wFix || runsW(M, [{ t: label }], size) + padX * 2;
  x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = h * 0.3; x.shadowOffsetY = h * 0.08; rrect(x, cx - w / 2, cy - h / 2, w, h, h / 2); x.fillStyle = bg; x.fill(); x.restore();
  x.save(); rrect(x, cx - w / 2, cy - h / 2, w, h, h / 2); x.lineWidth = Math.max(3, h * 0.05); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.stroke(); x.clip();
  const g = x.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(cx - w / 2, cy - h / 2, w, h); x.restore();
  text(x, [{ t: label, c: fg }], cx, cy + (CAP * size) / 2, size, { sw: 0.08, shadow: 0 });
  return w;
}
function around(x, px, py, s) { x.translate(px, py); x.scale(s, s); x.translate(-px, -py); }
function slam(t, t0, dur = 0.16, from = 2.2) { if (t < t0) return from; const k = seg(t, t0, t0 + dur); return k < 1 ? lerp(from, 1, in2(k)) : 1 - 0.05 * kick(t - t0 - dur, 6, 0.38); }
const popIn = (t, t0) => 1.12 - 0.12 * out(clamp(((t - t0) * FPS + 1) / 4));
const fade = (t, a, b, d = 0.12) => clamp((t - a) / d) * clamp((b - t) / d);
const pick = (arr, t) => { let v = null; for (const [t0, s] of arr || []) if (t >= t0) v = s; return v; };

// ------------------------------------------------------------------------------------------------ the frame
export function drawOverlay(x, f) {
  layoutCaps();
  const t = f / FPS;
  const voteOn = T_VOTE !== null && t >= T_VOTE, endOn = T_END !== null && t >= T_END;
  // HUD (top left) + the episode pill (top right)
  if (HUD && t >= T_HUD) {
    const k = out(clamp((t - T_HUD) / (5 / FPS))), a = (voteOn ? 0.6 : 1) * (endOn ? 1 - clamp((t - T_END) / 0.2) : 1);
    layer(x, a * k, (y) => {
      y.save(); y.translate(-(1 - k) * 20, 0);                       // a short slide: the panel never crosses x 120
      const tag = HUD.tag || '', clock = pick(HUD.clock, t), place = pick(HUD.place, t);
      const w1 = runsW(M, [{ t: tag }], 44), w2 = clock ? runsW(M, [{ t: '  ' + clock }], 44) : 0, w3 = place ? runsW(M, [{ t: place }], 32) : 0;
      const pw = Math.min(XR - XL - 160, Math.max(w1 + w2, w3) + 52);
      panel(y, XL, HUD_Y, pw, place ? 126 : 80, 'rgba(10,12,20,0.62)', 20);
      text(y, [{ t: tag, c: YEL }, ...(clock ? [{ t: '  ' + clock, c: WHITE }] : [])], XL + 26, HUD_Y + 58, 44, { align: 'left', sw: 0.12, shadow: 0 });
      if (place) text(y, [{ t: place, c: GREY }], XL + 26, HUD_Y + 106, 32, { align: 'left', sw: 0.1, shadow: 0 });
      y.restore();
      if (HUD.pill) { const pw2 = runsW(M, [{ t: HUD.pill }], 38) + 44; pill(y, XR - pw2 / 2, HUD_Y + 30, HUD.pill, 38, '#D8382E', { w: pw2 }); }
    });
  }
  // story cards: slam in the middle, then a chip under the HUD
  for (const c of CARDS) {
    if (t < c.t0 || t >= c.chipEnd) continue;
    const big = t < c.t1, u = clamp((t - c.t1) / 0.22), e = out(u);
    layer(x, voteOn ? 0.6 : 1, (y) => {
      if (big || u < 1) {
        const s = slam(t, c.t0, 0.16, 1.15) * lerp(1, 0.42, e), cx = lerp(540, XL + 170, e), cy = lerp(740, CHIP_Y + 31, e);   // from 1.25 the 640 px panel stays in x 140-940, above y 900
        y.save(); around(y, cx, cy, s);
        panel(y, cx - 320, cy - 120, 640, 240, 'rgba(12,14,24,0.86)', 30);
        text(y, rich(OV.cards?.kicker || ''), cx, cy - 46, 40, { sw: 0.1, shadow: 0 });
        const words = rich(`*${c.text}*`), size = fit(words, 112, 580, 60);
        text(y, join(words), cx, cy + (OV.cards?.kicker ? 70 : 40), size, { sw: 0.14 });
        y.restore();
      } else if (OV.cards?.chip !== false) {
        const label = c.text, w = runsW(M, [{ t: label }], 34) + 48;
        y.save(); panel(y, XL, CHIP_Y, w, 62, 'rgba(12,14,24,0.8)', 31); text(y, [{ t: label, c: YEL }], XL + w / 2, CHIP_Y + 31 + CAP * 17, 34, { sw: 0.1, shadow: 0 }); y.restore();
      }
    });
  }
  // the last episode's vote (stat card)
  if (STAT && t >= STAT.t0 && t < STAT.t1 + 0.25) drawStat(x, t);
  // captions (not under a card slam, not during the vote)
  const slamming = CARDS.some((c) => t >= c.t0 && t < c.t1 + 0.22) || (STAT && t >= STAT.t0 && t < STAT.t1 + 0.25);
  if (!voteOn && !slamming) for (const C of CAPS) {
    const l = C.l; if (t < l.chunks[0].start - 0.03 || t >= C.t1) continue;
    const shown = l.chunks.filter((ch) => t >= ch.start - 0.03), page = Math.floor((shown.length - 1) / ROWS);
    const rows = shown.slice(page * ROWS).map((ch) => { const w = rich(ch.text); return { w, size: capSize(l, ch), t0: ch.start }; });
    const rowH = (r) => r.size * 1.08, total = rows.reduce((a, r) => a + rowH(r), 0);
    const sp = VOICES.cast?.[l.speaker]?.chip;
    let top = C.top + (sp ? 56 : 0);
    if (sp) { const w = runsW(M, [{ t: sp.label }], 34) + 40; y0chip(x, 540, top - 44, sp, w); }
    let y = top;
    for (const r of rows) {
      y += rowH(r);
      const s = Math.min(popIn(t, r.t0), CW / (runsW(M, join(r.w), r.size) + 0.2 * r.size));   // the pop never grows a row past 640
      x.save(); around(x, 540, y - r.size * 0.35, s); text(x, join(r.w), 540, y - r.size * 0.12, r.size); x.restore();
    }
  }
  if (voteOn) drawVote(x, t, endOn);
  if (endOn) drawEnd(x, t);
}
function y0chip(x, cx, cy, sp, w) { x.save(); rrect(x, cx - w / 2, cy - 28, w, 56, 28); x.fillStyle = sp.col || '#3ED6B5'; x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,0.55)'; x.stroke(); x.restore(); text(x, [{ t: sp.label, c: sp.ink || '#06231D' }], cx, cy + CAP * 17, 34, { sw: 0, shadow: 0 }); }
function drawVote(x, t, endOn) {
  const title = (OV.vote && OV.vote.title) || (STORY.vote && STORY.vote.title) || 'WHAT DO YOU DO?';
  const shrink = endOn ? out(clamp((t - T_END) / 0.25)) : 0;
  // the stack stands on the comment line (baseline 1420, inside the caption band's bottom): pills 120 high every 138 px,
  // 600 wide (x 240-840, clear of the button rail), the title above them
  const n = Math.max(1, OPTS.length), gap = 138, ph = 120, pw = 600, base0 = 1270 - (n - 1) * gap, ty0 = base0 - 144;
  const ty = lerp(ty0, Math.max(ty0 - 60, 740), shrink), base = lerp(base0, base0 - 30, shrink);
  x.save(); around(x, 540, ty, slam(t, T_VOTE, 0.16, ty > 860 ? 1.04 : 1.15) * lerp(1, 0.8, shrink));   // a wide title: a small slam stays in frame
  const tw = rich(`*${title}*`); text(x, join(tw), 540, ty + 30, fit(tw, 100, 600, 60));
  x.restore();
  OPTS.forEach((o, i) => {
    const t0 = T_OPT[i]; if (t0 === null || t < t0 - 0.05) return;
    const cy = base + i * gap, s = Math.min(1 + 0.5 * (popIn(t, t0) - 1), 1.03) * (1 + 0.03 * Math.max(0, kick(t - (T_NUM[i] ?? 1e9), 5, 0.35)));
    x.save(); around(x, 540, cy, s);
    const w = pw, h = ph;
    x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 30; x.shadowOffsetY = 8; rrect(x, 540 - w / 2, cy - h / 2, w, h, h / 2); x.fillStyle = o.col || ['#2FAF6A', '#E0563C', '#3E7BD6', '#9A5AD0'][i]; x.fill(); x.restore();
    rrect(x, 540 - w / 2, cy - h / 2, w, h, h / 2); x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,0.55)'; x.stroke();
    x.beginPath(); x.arc(540 - w / 2 + h / 2, cy, h / 2 - 12, 0, Math.PI * 2); x.fillStyle = 'rgba(255,255,255,0.95)'; x.fill();
    text(x, [{ t: String(o.n ?? i + 1), c: '#111' }], 540 - w / 2 + h / 2, cy + CAP * 28, 56, { sw: 0, shadow: 0 });
    const lx = 540 - w / 2 + h + 18, ls = fit([[{ t: o.label, c: WHITE }]], o.tag ? 48 : 52, w - h - 50, 34);   // ~18 px of air above the label
    text(x, [{ t: o.label, c: WHITE }], lx, cy + (o.tag ? 4 : CAP * ls / 2), ls, { align: 'left', sw: 0.12, shadow: 0.5 });
    if (o.tag) text(x, [{ t: o.tag, c: 'rgba(255,255,255,0.85)' }], lx, cy + 40, 26, { align: 'left', sw: 0.08, shadow: 0 });
    x.restore();
  });
  if (T_CMT !== null && t >= T_CMT) {
    const s = popIn(t, T_CMT);
    x.save(); around(x, 540, 1400, s); text(x, [{ t: 'COMMENT ', c: WHITE }, { t: Array.from({ length: n }, (_, i) => i + 1).join(' · '), c: YEL }], 540, 1420, 56); x.restore();
  }
}
function drawEnd(x, t) {
  const E = OV.end, u = clamp((t - T_END) / 0.2);
  layer(x, u, (y) => {
    if (E.kicker) text(y, [{ t: E.kicker, c: GREY }], 540, 380, 40, { sw: 0.12 });
    y.save(); around(y, 540, 500, slam(t, T_END + 0.1)); const w = rich(`*${E.title}*`); text(y, join(w), 540, 540, fit(w, 130, 760, 70)); y.restore();
    if (E.follow && t >= T_END + 0.5) { y.save(); around(y, 540, 660, popIn(t, T_END + 0.5)); pill(y, 540, 660, E.follow, 42, '#D8382E'); y.restore(); }
  });
}
function drawStat(x, t) {
  const S = OV.stat || {}, opts = OPTS.length ? OPTS : (STATS.options || []).map((label, i) => ({ n: i + 1, label }));
  const prevOpts = STATS.options || opts.map((o) => o.label);
  const a = clamp((t - STAT.t0) / 0.15) * clamp((STAT.t1 + 0.25 - t) / 0.25);
  layer(x, a, (y) => {
    const cy = 1180, w = 640, h = 470;                 // x 220-860, y 945-1415: clear of the rail and the bottom rows
    panel(y, 540 - w / 2, cy - h / 2, w, h, 'rgba(12,14,24,0.88)', 34);
    text(y, [{ t: S.title || 'LAST EPISODE · YOUR VOTE', c: GREY }], 540, cy - h / 2 + 64, 40, { sw: 0.1, shadow: 0 });
    const k = clamp((t - STAT.t0 - 0.2) / 1.2), total = Math.round((STATS.total || 0) * out(k));
    if (STATS.total) text(y, [{ t: total.toLocaleString('en-US'), c: YEL }, { t: ' VOTES', c: WHITE }], 540, cy - h / 2 + 150, 76);   // no total reported: percentages only
    prevOpts.forEach((label, i) => {
      const p = (STATS.p || [])[i] || 0, by = cy - 40 + i * 92, bw = 540 * (p / 100) * out(clamp((t - STAT.t0 - 0.4 - i * 0.15) / 0.6));
      rrect(y, 540 - 270, by - 30, 540, 60, 30); y.fillStyle = 'rgba(255,255,255,0.1)'; y.fill();
      rrect(y, 540 - 270, by - 30, Math.max(60, bw), 60, 30); y.fillStyle = i === (STATS.winner_index ?? 0) ? '#2FAF6A' : 'rgba(255,255,255,0.28)'; y.fill();
      text(y, [{ t: `${i + 1} · ${label}`, c: WHITE }], 540 - 250, by + CAP * 17, 34, { align: 'left', sw: 0.1, shadow: 0 });
      text(y, [{ t: `${p}%`, c: WHITE }], 540 + 250, by + CAP * 17, 34, { align: 'right', sw: 0.1, shadow: 0 });
    });
    if (t >= STAT.stamp) {
      const s = slam(t, STAT.stamp, 0.14, 1.3), wi = STATS.winner_index ?? 0;
      const sx = 540 + 160, sy = cy - 40 + wi * 92 - (STATS.total ? 0 : 74);
      y.save(); y.translate(sx, sy); y.rotate(-0.12); y.scale(s, s); y.translate(-sx, -sy);     // turn and slam about its own centre
      rrect(y, sx - 90, sy - 34, 180, 68, 12); y.lineWidth = 7; y.strokeStyle = '#FF4A3D'; y.stroke();
      text(y, [{ t: 'YOU CHOSE', c: '#FF4A3D' }], sx, sy + CAP * 17, 34, { sw: 0, shadow: 0 }); y.restore();
    }
  });
}

// ------------------------------------------------------------------------------------------------ CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === SELF.toLowerCase();
if (isMain) await main();
async function main() {
  const dir = path.join(EP, 'overlay'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'cues_overlay.json'), JSON.stringify(cues(), null, 1));
  layoutCaps();                                      // where each caption line sits, for final_qa's safe-frame check
  fs.writeFileSync(path.join(dir, 'captions.json'), JSON.stringify({ safe: SAFE, lines: CAPS.map((C) => ({ line: C.l.i, f: [Math.round(C.l.chunks[0].start * FPS), Math.round(C.t1 * FPS)],
    box: [SAFE.cap[0], Math.round(C.top), SAFE.cap[2], Math.round(C.top + C.total)], rows: Math.min(ROWS, C.l.chunks.length), pages: Math.ceil(C.l.chunks.length / ROWS), moved: C.moved })) }, null, 1));
  if (has('cues')) { console.log('wrote overlay/cues_overlay.json'); return; }
  if (opt('stills')) {
    const od = path.join(EP, 'out', 'overlay_stills'); fs.mkdirSync(od, { recursive: true });
    for (const f of opt('stills').split(',').map(Number)) {
      const c = createCanvas(W, H), x = c.getContext('2d'); x.fillStyle = '#4A5060'; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(255,255,255,0.3)'; x.lineWidth = 2; x.beginPath();               // the safe frame (with the rail notch) + the caption band
      [[SAFE.x0, SAFE.y0], [SAFE.x1, SAFE.y0], [SAFE.x1, SAFE.railY], [SAFE.railX, SAFE.railY], [SAFE.railX, SAFE.y1], [SAFE.x0, SAFE.y1]].forEach(([px, py], k) => (k ? x.lineTo(px, py) : x.moveTo(px, py)));
      x.closePath(); x.stroke(); x.strokeRect(SAFE.cap[0], SAFE.cap[1], SAFE.cap[2] - SAFE.cap[0], SAFE.cap[3] - SAFE.cap[1]);
      drawOverlay(x, f); fs.writeFileSync(path.join(od, `ov_${String(f).padStart(5, '0')}.png`), c.toBuffer('image/png')); console.log('still', f);
    }
    return;
  }
  let a = 0, b = N - 1;
  if (opt('range')) { a = +opt('range'); b = +args[args.indexOf('--range') + 2]; }
  const procs = +opt('procs', 1);
  if (procs > 1 && !has('worker')) {
    const step = Math.ceil((b - a + 1) / procs), jobs = [];
    for (let s = a; s <= b; s += step) jobs.push(spawn(process.execPath, [SELF, '--ep', EP, '--range', String(s), String(Math.min(b, s + step - 1)), '--worker'], { stdio: 'inherit' }));
    const codes = await Promise.all(jobs.map((p) => once(p, 'close').then(([c]) => c)));
    if (codes.some((c) => c !== 0)) { console.error('overlay: a worker failed'); process.exit(1); }
  } else {
    const c = createCanvas(W, H), x = c.getContext('2d');
    for (let f = a; f <= b; f++) {
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
      drawOverlay(x, f);
      fs.writeFileSync(path.join(dir, `${String(f).padStart(5, '0')}.png`), c.toBuffer('image/png'));
    }
  }
  if (!has('worker')) {
    const missing = []; for (let f = 0; f < N; f++) if (!fs.existsSync(path.join(dir, `${String(f).padStart(5, '0')}.png`))) missing.push(f);
    console.log(`overlay: frames ${a}-${b} written to overlay/ (${N} in the episode, ${missing.length} missing${missing.length ? `, first ${missing.slice(0, 5)}` : ''})`);
  }
}
void pathToFileURL;
