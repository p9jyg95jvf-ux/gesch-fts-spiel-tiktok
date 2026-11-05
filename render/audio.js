// Erzeugt Musik + Geräusche für eine Folge komplett im Code (keine Fremd-Audiodateien, keine Lizenzprobleme).
//   node render/audio.js ep001 out/ep001.wav
import { writeFileSync } from 'node:fs';
import { loadState, resolveEpisode } from '../engine/story.js';
import { rng } from './src/util.js';

const [epId, outFile] = process.argv.slice(2);
const SR = 44100;
const episode = resolveEpisode(epId, loadState());
const DUR = episode.duration;
const N = Math.round(DUR * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const rand = rng(42);

const add = (t0, fn, len, pan = 0, gain = 1) => {
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + len) * SR));
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = i0; i < i1; i++) { const v = fn((i - Math.floor(t0 * SR)) / SR); L[i] += v * gl; R[i] += v * gr; }
};
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// ---- Instrumente ----
const pluck = (t0, m, len = 1.4, amp = 0.2, pan = 0) => {
  const f = midi(m);
  add(t0, (t) => (Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 6) + 0.2 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t * 10)) * Math.exp(-t * 3.2) * Math.min(1, t / 0.004) * amp, len, pan);
};
const pad = (t0, m, len, amp = 0.05, pan = 0) => {
  const f = midi(m);
  add(t0, (t) => { const e = Math.min(1, t / 0.9) * Math.min(1, (len - t) / 0.9); return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.004 * t) * 0.8 + 0.25 * Math.sin(4 * Math.PI * f * t)) * e * amp; }, len, pan);
};
const bass = (t0, m, len = 0.6, amp = 0.28) => {
  const f = midi(m);
  add(t0, (t) => (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-t * 3.5) * Math.min(1, t / 0.01) * amp, len);
};
const kick = (t0, amp = 0.55) => add(t0, (t) => Math.sin(2 * Math.PI * (45 * t + 75 * (1 - Math.exp(-t * 28)) / 28)) * Math.exp(-t * 11) * amp, 0.3);
const hat = (t0, amp = 0.06, pan = 0.3) => { let p = 0; add(t0, (t) => { const n = rand() * 2 - 1; const o = n - p; p = n; return o * Math.exp(-t * 70) * amp; }, 0.08, pan); };
const snap = (t0, amp = 0.16) => { let p = 0; add(t0, (t) => { const n = rand() * 2 - 1; const o = n - p * 0.4; p = n; return (o * 0.8 + Math.sin(2 * Math.PI * 190 * t) * 0.5) * Math.exp(-t * 28) * amp; }, 0.2); };
const thud = (t0, amp = 0.2, f = 70) => add(t0, (t) => Math.sin(2 * Math.PI * f * t * Math.exp(-t * 5)) * Math.exp(-t * 28) * amp, 0.15);
const noiseBed = (t0, len, amp, cut = 0.2) => { let y = 0; add(t0, (t) => { y += cut * ((rand() * 2 - 1) - y); const e = Math.min(1, t / 0.6) * Math.min(1, (len - t) / 0.6); return y * amp * e; }, len); };
const whoosh = (t0, len = 0.35, amp = 0.16) => { let y = 0; add(t0, (t) => { const k = t / len; y += (0.05 + 0.5 * k) * ((rand() * 2 - 1) - y); return y * Math.sin(Math.PI * k) * amp; }, len); };
const ding = (t0, m = 88, amp = 0.12) => add(t0, (t) => Math.sin(2 * Math.PI * midi(m) * t) * Math.exp(-t * 6) * amp + Math.sin(2 * Math.PI * midi(m + 12) * t) * Math.exp(-t * 9) * amp * 0.4, 0.8);
const pop = (t0, m = 84, amp = 0.14) => add(t0, (t) => Math.sin(2 * Math.PI * midi(m) * t * (1 + 0.6 * Math.exp(-t * 40))) * Math.exp(-t * 18) * amp, 0.25);
const growl = (t0, len = 0.9, amp = 0.2) => add(t0, (t) => { const k = t / len; const f = 48 + 14 * Math.sin(t * 38) + 10 * Math.sin(t * 11); return (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 2.02 * t) * (0.5 + 0.5 * Math.sin(t * 52))) * Math.sin(Math.PI * k) ** 1.5 * amp; }, len);
const boom = (t0, amp = 0.5) => add(t0, (t) => Math.sin(2 * Math.PI * 55 * t * Math.exp(-t * 1.2)) * Math.exp(-t * 2.2) * amp, 2.2);

// ---- Zeitplan aus der Folge ----
const starts = []; let s = 0; for (const sc of episode.scenes) { starts.push(s); s += sc.duration; }
const sceneIdx = (id) => episode.scenes.findIndex((x) => x.id === id);
const at = (id) => starts[sceneIdx(id)];
const hasRecap = episode.scenes[0].id === 'recap';

const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4;
const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];   // Am F C G
const ROOT = [45, 41, 36 + 12, 43];

const vote0 = at('vote');
const groove0 = at(episode.scenes.some((x) => x.id === 'bruno') ? 'bruno' : episode.scenes[Math.min(2, episode.scenes.length - 1)].id);
const full0 = at(episode.scenes.some((x) => x.id === 'wege') ? 'wege' : episode.scenes.at(-1).id);

for (let bar = 0; bar * BAR < DUR; bar++) {
  const t = bar * BAR, ch = PROG[bar % 4];
  const inGroove = t >= groove0 - 0.01 && t < vote0, inFull = t >= full0 - 0.01 && t < vote0, inVote = t >= vote0 - 0.01;
  ch.forEach((m, i) => pad(t, m, BAR + 0.4, inVote ? 0.045 : 0.05, i - 1 > 0 ? 0.4 : -0.4));
  // Arpeggio
  const step = inFull ? BEAT / 2 : inGroove ? BEAT : BEAT * 2;
  const seq = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 24, ch[1] + 12, ch[2] + 12, ch[0] + 12];
  for (let k = 0, tt = t; tt < t + BAR - 0.01; k++, tt += step) pluck(tt, seq[k % seq.length] + (inVote ? 0 : 0), 1.4, inVote ? 0.09 : 0.14, ((k % 3) - 1) * 0.35);
  if (inGroove || inVote) { bass(t, ROOT[bar % 4]); bass(t + BEAT * 2.5, ROOT[bar % 4], 0.4, 0.2); }
  if (inGroove) for (let b = 0; b < 4; b++) { if (b % 2 === 0) kick(t + b * BEAT, 0.5); if (b % 2 === 1) snap(t + b * BEAT); hat(t + b * BEAT + BEAT / 2); }
  if (inVote) { kick(t, 0.35); kick(t + BEAT * 2, 0.3); for (let b = 0; b < 8; b++) hat(t + b * BEAT / 2, 0.035); }
}

// Titel-Treffer / Rückblick
boom(0.25, 0.55); whoosh(0.1, 0.3, 0.12); ding(0.3, 93, 0.08);
for (const st of starts.slice(1)) whoosh(st - 0.22, 0.3, 0.12);

// Regen in den Nacht-/Morgenszenen
for (const sc of episode.scenes) if (sc.env?.weather === 'rain') { const a = starts[episode.scenes.indexOf(sc)]; noiseBed(a, sc.duration, 0.05, 0.12); }

// Magenknurren
for (const sc of episode.scenes) for (const a of sc.actors ?? []) for (const seg of a.track) if (seg.anim === 'hungry') {
  const t0 = starts[episode.scenes.indexOf(sc)] + seg.t;
  for (let k = 0; k * 1.5 + 0.35 < seg.d; k++) growl(t0 + 0.35 + k * 1.5, 0.8, 0.22);
}
// Schritte
for (const sc of episode.scenes) for (const a of sc.actors ?? []) for (const seg of a.track) if (seg.anim === 'walk') {
  const t0 = starts[episode.scenes.indexOf(sc)] + seg.t, dist = Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]);
  const stepT = 0.78 / (dist / seg.d);
  for (let k = 0; k * stepT < seg.d; k++) thud(t0 + k * stepT, a.preset === 'bruno' ? 0.3 : 0.17, a.preset === 'bruno' ? 55 : 90);
}
// Abstimmungs-Sounds
if (voteScene()) {
  const v = voteScene();
  const T0 = v.start + v.sc.vote.t;
  episode.choice.options.forEach((_, i) => pop(T0 + 0.7 + i * 0.45, 79 + i * 3));
  ding(T0 + 2.4, 91, 0.14);
  for (let t = T0 + 3; t < DUR - 0.5; t += 1) { add(t, (x) => Math.sin(2 * Math.PI * 1800 * x) * Math.exp(-x * 60) * 0.05, 0.05); }
  // Spannungsaufbau am Ende
  let y = 0; const rs = DUR - 5;
  add(rs, (x) => { y += (0.01 + 0.25 * (x / 5)) * ((rand() * 2 - 1) - y); return y * (x / 5) ** 2 * 0.35; }, 5);
}
function voteScene() { const i = episode.scenes.findIndex((x) => x.vote); return i >= 0 ? { sc: episode.scenes[i], start: starts[i] } : null; }

// Sanftes Ausblenden + Normalisieren + Weichzeichnen der Spitzen
let peak = 0;
for (let i = 0; i < N; i++) { const f = Math.min(1, (DUR - i / SR) / 0.6); L[i] *= f; R[i] *= f; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const norm = peak > 0 ? 0.89 / peak : 1;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const l = Math.tanh(L[i] * norm * 1.1) * 0.95, r = Math.tanh(R[i] * norm * 1.1) * 0.95;
  pcm.writeInt16LE(Math.round(l * 32767), i * 4); pcm.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
writeFileSync(outFile, Buffer.concat([hdr, pcm]));
console.log(`Audio: ${outFile} (${DUR}s)`);
