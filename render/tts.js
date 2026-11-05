// Sprachausgabe mit Piper (offline). Plant alle gesprochenen Zeilen einer Folge, erzeugt Sprachdateien
// (mit Cache) und prüft, dass jede Zeile in ihr Zeitfenster passt.
//   node render/tts.js ep001      → Tabelle der Zeilen + Prüfung
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, loadState, resolveEpisode } from '../engine/story.js';

const VOICES = JSON.parse(readFileSync(join(ROOT, 'render', 'voices.json'), 'utf8'));
const CACHE = join(ROOT, 'out', 'tts-cache');
const speakable = (t) => t.replace(/ /g, ' ').replace(/€/g, 'Euro').replace(/…/g, '...').replace(/\bA\b/g, 'A').trim();

/** Alle gesprochenen Zeilen: { who, text, start, maxEnd } (Sekunden ab Videoanfang). */
export function planVoice(episode) {
  const lines = []; let s = 0;
  for (const sc of episode.scenes) {
    for (const c of sc.captions ?? []) {
      lines.push({ who: c.kind === 'speech' ? c.who : 'Erzähler', text: speakable(c.say ?? c.text), start: s + c.t + 0.08, maxEnd: s + c.t + c.d });
    }
    if (sc.recap) {
      lines.push({ who: 'Erzähler', text: speakable(`Bisher: ${sc.recap.summary}`), start: s + 0.45, maxEnd: s + 4.0 });
      lines.push({ who: 'Erzähler', text: speakable(`Du hast entschieden: ${sc.recap.decision}`), start: s + 4.2, maxEnd: s + sc.duration - 0.1 });
    }
    if (sc.vote) {
      const sceneEnd = s + sc.duration;
      let t = s + sc.vote.t + 3.0;
      const parts = [episode.choice.question.replace(/\?$/, '') + '?'];
      for (const o of episode.choice.options) parts.push(`${o.key}: ${o.label}.`);
      parts.push(episode.choice.cta + '.');
      parts.forEach((p) => lines.push({ who: 'Erzähler', text: speakable(p), start: t, maxEnd: sceneEnd - 0.2, chain: true }));
    }
    s += sc.duration;
  }
  return lines;
}

function piperBin() {
  const local = join(ROOT, '.venv-tts', 'bin', 'piper');
  return existsSync(local) ? local : 'piper';
}

function synth(who, text) {
  const v = VOICES[who];
  if (!v) throw new Error(`Keine Stimme für "${who}" in render/voices.json`);
  const key = createHash('sha1').update(JSON.stringify([v, text])).digest('hex').slice(0, 16);
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${key}.wav`);
  if (existsSync(file)) return file;
  const model = join(ROOT, 'voices', `${v.model}.onnx`);
  if (!existsSync(model)) throw new Error(`Stimme fehlt: ${model} – bitte "bash scripts/setup-tts.sh" ausführen`);
  const raw = file + '.raw.wav';
  const r = spawnSync(piperBin(), ['-m', model, '-f', raw, '--length-scale', String(v.lengthScale ?? 1)], { input: text, encoding: 'utf8' });
  if (r.status !== 0 || !existsSync(raw)) throw new Error(`Piper fehlgeschlagen für "${text}": ${r.stderr}`);
  const rate = 22050;
  const filt = v.pitchSemitones ? `asetrate=${Math.round(rate * 2 ** (v.pitchSemitones / 12))},aresample=${rate},` : '';
  const f = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `${filt}highpass=f=70,loudnorm=I=-17:TP=-2:LRA=7`, '-ar', '44100', '-ac', '1', file]);
  if (f.status !== 0) throw new Error('ffmpeg (Stimme) fehlgeschlagen: ' + f.stderr);
  return file;
}

export function wavInfo(file) {
  const b = readFileSync(file);
  // robust: "data"-Chunk suchen
  let p = 12, fmt = null;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') return { ...fmt, samples: new Int16Array(b.buffer.slice(b.byteOffset + p + 8, b.byteOffset + p + 8 + Math.min(size, b.length - p - 8))) };
    p += 8 + size + (size % 2);
  }
  throw new Error('WAV ohne data-Chunk: ' + file);
}

/** Erzeugt alle Sprachdateien, setzt Zeiten (Ketten nacheinander) und meldet Überschreitungen. */
export function buildVoice(episode) {
  const lines = planVoice(episode);
  const problems = [];
  let cursor = 0;
  for (const l of lines) {
    l.file = synth(l.who, l.text);
    const w = wavInfo(l.file); l.dur = w.samples.length / w.sr;
    if (l.chain) l.start = Math.max(l.start, cursor + 0.25);
    l.end = l.start + l.dur; cursor = l.end;
    if (l.end > l.maxEnd + 1e-6) problems.push(`„${l.text}“ (${l.who}): endet bei ${l.end.toFixed(2)} s, erlaubt bis ${l.maxEnd.toFixed(2)} s`);
  }
  const sorted = [...lines].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].start < sorted[i - 1].end - 0.05) problems.push(`Überlappung: „${sorted[i - 1].text}“ und „${sorted[i].text}“`);
  return { lines, problems };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ep = resolveEpisode(process.argv[2], loadState());
  const { lines, problems } = buildVoice(ep);
  for (const l of lines) console.log(`${l.start.toFixed(2).padStart(6)}–${l.end.toFixed(2).padStart(6)} (max ${l.maxEnd.toFixed(2)})  ${l.who.padEnd(8)} ${l.text}`);
  if (problems.length) { console.error('\nProbleme:\n - ' + problems.join('\n - ')); process.exit(1); }
  console.log('\nSprache passt in alle Zeitfenster.');
}
