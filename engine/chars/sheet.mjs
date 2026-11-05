// Model sheets for the LOOK TEST (approval point 2): every character of a series kit, turned through all angles, in its
// main poses and every expression, on a plain card. Flat colours (no look engine), so it's quick: about 1 s a sheet.
//
//   node <engine>/chars/sheet.mjs --kit <series>/kit/cast.mjs --out <dir> [--only you,scout] [--bg #E9E4DA]
//
// The kit module exports CAST = { id: { kind: 'human' | 'critter', model, label, scale? } } (see templates/kit/cast.mjs),
// or { kind: 'custom', draw: (x, pose) => points, label, exprs? } for a rig of your own (chars/custom_example.mjs).
// Writes <dir>/sheet_<id>.png (1080 x 1920) per character, plus <dir>/lineup.png (everyone side by side, to check scale).
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createCanvas } from '../lib.mjs';
import { drawHuman, EXPR } from './human.mjs';
import { drawCritter, CEXPR } from './critter.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const kit = opt('kit'); if (!kit) { console.error('need --kit <cast.mjs>'); process.exit(1); }
const outDir = path.resolve(opt('out', 'look_test')); fs.mkdirSync(outDir, { recursive: true });
const { CAST } = await import(pathToFileURL(path.resolve(kit)).href);
const only = opt('only') ? opt('only').split(',') : Object.keys(CAST);
const BG = opt('bg', '#E9E4DA');

function card(x, title) {
  x.fillStyle = BG; x.fillRect(0, 0, 1080, 1920);
  x.fillStyle = '#2B1D17'; x.font = 'bold 54px Oswald'; x.textAlign = 'left'; x.fillText(title.toUpperCase(), 60, 100);
  x.font = '28px Oswald'; x.fillStyle = '#6A5E58';
}
function label(x, s, X, Y) { x.save(); x.font = '24px Oswald'; x.fillStyle = '#6A5E58'; x.textAlign = 'center'; x.fillText(s, X, Y); x.restore(); }
function floor(x, Y) { x.save(); x.strokeStyle = 'rgba(43,29,23,0.18)'; x.lineWidth = 3; x.beginPath(); x.moveTo(40, Y); x.lineTo(1040, Y); x.stroke(); x.restore(); }
const draw = (x, c, P) => (c.kind === 'custom' ? c.draw(x, P) : c.kind === 'critter' ? drawCritter(x, c.model, P) : drawHuman(x, c.model, P));

for (const id of only) {
  const c = CAST[id]; if (!c) { console.error(`no cast member "${id}"`); continue; }
  const cv = createCanvas(1080, 1920), x = cv.getContext('2d'), k = c.scale ?? 1, t = 0.4;
  card(x, `${c.label || id} · model sheet`);
  x.fillText(c.kind === 'critter' ? 'creature companion rig' : c.kind === 'custom' ? 'custom rig' : 'chibi human rig', 60, 140);
  // row 1: the turnaround
  const turns = [0, 0.5, 1, 1.5, 2, -0.5], s1 = 0.78 * k;
  turns.forEach((tu, i) => { const X = 100 + i * 176, Y = 520; floor(x, Y); draw(x, c, { x: X, y: Y, s: s1, turn: tu, t, expr: c.model && c.model.torn ? 'undead' : 'neutral' }); label(x, `turn ${tu}`, X, Y + 40); });
  // row 2: poses
  const poses = c.kind === 'custom' ? [['idle', 0.4], ['roll', 0.8]] : c.kind === 'critter' ? [['stand', 0.8], ['walk', 0.8], ['trot', 1], ['run', 1], ['sit', 0.6], ['lie', 0.9], ['sniff', 1], ['jump', 1]] : c.model.torn ? [['stand', 0.4], ['shamble', 0.6], ['shamble', -0.3], ['walk', 0.8], ['crouch', 0.6]] : [['stand', 0.4], ['walk', 0.6], ['run', 0.8], ['sit', 0.5], ['crouch', 0.6]];
  const n2 = poses.length, s2 = (c.kind === 'critter' ? 0.62 : 0.78) * k;
  poses.forEach(([p, tu], i) => {
    const X = 1080 / (n2 + 1) * (i + 1) - (c.kind === 'critter' ? 20 : 0), Y = 960;
    floor(x, Y);
    draw(x, c, { x: X, y: Y, s: s2, turn: tu, pose: p, phase: 0.18, t, jump: 0.5, seat: p === 'sit' ? (c.kind === 'critter' ? 0 : 45) : undefined, expr: p === 'sniff' ? 'sniffing' : c.model && c.model.torn ? 'undead' : 'neutral', armR: p === 'stand' && c.kind !== 'critter' && !(c.model && c.model.torn) ? 'wave' : undefined });
    label(x, p, X, Y + 40);
  });
  // rows 3-4: expressions (head and shoulders, three-quarter)
  const exprs = c.kind === 'custom' ? (c.exprs || ['neutral', 'happy']) : Object.keys(c.kind === 'critter' ? CEXPR : EXPR), cols = 5, s3 = 0.9 * k;
  exprs.forEach((e, i) => {
    const X = 120 + (i % cols) * 210, Y = 1330 + Math.floor(i / cols) * 270;
    x.save(); x.beginPath(); x.rect(X - 105, Y - 245, 210, 265); x.clip();
    draw(x, c, { x: X, y: Y + (c.kind === 'critter' ? 60 : 120) * s3, s: s3, turn: 0.3, t, expr: e, armR: e === 'thinking' ? 'chin' : e === 'scared' ? 'cover' : undefined });
    x.restore(); label(x, e, X, Y + 46);
  });
  fs.writeFileSync(path.join(outDir, `sheet_${id}.png`), cv.toBuffer('image/png'));
  console.log('wrote', path.join(outDir, `sheet_${id}.png`));
}
// the line-up: everyone at their story scale, three-quarter view, on one floor
const cv = createCanvas(1080, 1920), x = cv.getContext('2d');
card(x, 'cast line-up');
const ids = only, Y = 1200;
floor(x, Y);
ids.forEach((id, i) => { const c = CAST[id], X = 1080 / (ids.length + 1) * (i + 1); draw(x, c, { x: X, y: Y, s: 1.25 * (c.scale ?? 1), turn: 0.35, t: 0.4, expr: c.model && c.model.torn ? 'hungry' : c.kind === 'critter' ? 'alert' : 'worried' }); label(x, c.label || id, X, Y + 50); });
fs.writeFileSync(path.join(outDir, 'lineup.png'), cv.toBuffer('image/png'));
console.log('wrote', path.join(outDir, 'lineup.png'));
