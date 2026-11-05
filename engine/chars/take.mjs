// Arc Lab character system: TAKES. A take turns a list of timed changes into a pose function of time, so a character's
// performance in a shot is data, not code:
//
//   const nellTake = take({ x: 300, y: 1500, s: 1.3, turn: 0.3, expr: 'asleep', pose: 'sit', seat: 50 }, [
//     { t: 12.4, expr: 'sleepy', headTurn: 0.4 },              // at 12.4 s she half wakes (blends over 0.35 s)
//     { t: 13.1, nod: 0.3, dur: 0.6, ease: 'out' },             // ...and nods off again over 0.6 s
//     { t: 14.0, x: 520, dur: 1.2 },                           // a move across the floor (set pose: 'walk' too)
//   ], { talk: { words: [12.6, 12.85, 13.0], end: 13.4 } });   // her line's word onsets from timeline.json
//   ... in draw(L, t): const P = nellTake(t); drawHuman(L.HERO.x, NELL, P);
//
// Numbers and number arrays blend (look, light, arm vectors; arm NAMES are converted to vectors so arms move smoothly);
// strings (expr, pose, eye shapes) switch at the key's time. Automatic blinks every ~3 s unless blink: false.
// Everything is a pure function of t: safe for motion blur sub-frames and parallel workers.
import { clamp } from '../lib.mjs';
import { armVec } from './human.mjs';

const EASE = {
  smooth: (u) => u * u * (3 - 2 * u), linear: (u) => u, out: (u) => 1 - (1 - u) ** 3, in: (u) => u * u * u,
  io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2), back: (u) => { const s = 1.7, v = u - 1; return v * v * ((s + 1) * v + s) + 1; },
};
const CADENCE = { walk: 1.6, run: 2.6, trot: 2.6, shamble: 0.9 };
const norm = (k, v) => ((k === 'armR' || k === 'armL') && typeof v === 'string' ? armVec(v) : v);
const blendV = (a, b, u) => (Array.isArray(a) && Array.isArray(b) ? a.map((v, i) => v + ((b[i] ?? v) - v) * u) : typeof a === 'number' && typeof b === 'number' ? a + (b - a) * u : u < 1 ? a : b);

/** base pose + keys [{ t, dur?, ease?, ...fields }] -> (t) => pose. opts: { blink: true, seed, talk: { words, end }, cadence } */
export function take(base, keys = [], opts = {}) {
  const K = keys.slice().sort((a, b) => a.t - b.t);
  return (t) => {
    const P = {};
    for (const [k, v] of Object.entries(base)) P[k] = norm(k, v);
    for (const key of K) {
      if (t < key.t) break;
      const dur = key.dur ?? 0.35, u = dur <= 0 ? 1 : (EASE[key.ease || 'smooth'] || EASE.smooth)(clamp((t - key.t) / dur));
      for (const [k, v0] of Object.entries(key)) {
        if (k === 't' || k === 'dur' || k === 'ease') continue;
        const v = norm(k, v0);
        P[k] = typeof v === 'string' || typeof v === 'boolean' || P[k] === undefined ? (typeof v === 'number' || Array.isArray(v) ? blendV(P[k] ?? v, v, u) : v) : blendV(P[k], v, u);
      }
    }
    P.t = t;
    if (P.phase === undefined && CADENCE[P.pose]) P.phase = t * (opts.cadence ?? CADENCE[P.pose]);
    if (opts.blink !== false && P.blink === undefined) P.blink = blinkAt(t, opts.seed ?? 1);
    if (opts.talk && P.talk === undefined) P.talk = mouthFromWords(t, opts.talk.words, opts.talk.end);
    return P;
  };
}
/** a natural blink (0..1) every ~2.6-4 s, 0.14 s long; seed varies the rhythm per character */
export function blinkAt(t, seed = 1) {
  const period = 3.2;
  const k = Math.floor((t + seed * 1.37) / period), j = ((Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453) % 1 + 1) % 1;
  const t0 = k * period - seed * 1.37 + j * 1.1, u = (t - t0) / 0.14;
  return u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
}
/** mouth openness 0..1 from a line's word onsets (seconds) and its end: a flap per syllable-ish, closed after `end` */
export function mouthFromWords(t, words = [], end = 0) {
  if (!words.length || t < words[0] - 0.02 || t > end + 0.05) return 0;
  let i = 0; while (i < words.length - 1 && t >= words[i + 1]) i++;
  const nextT = i + 1 < words.length ? words[i + 1] : end, len = Math.max(0.08, nextT - words[i]);
  const syl = Math.max(1, Math.round(len / 0.17)), u = clamp((t - words[i]) / len);
  return 0.25 + 0.75 * Math.abs(Math.sin(u * syl * Math.PI));
}
/** smooth 0..1 progress of t through [a, b] */
export const between = (t, a, b) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
