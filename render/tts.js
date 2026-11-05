// Sprachausgabe. Milo erzählt in Ich-Form (Piper, Thorsten-Stimme, bei Bedarf mit Emotion).
// Nebenfiguren sprechen in Sprechblasen mit Figuren-Gebrabbel (wie in Spielen) – das klingt bewusst
// nicht nach Computerstimme. Plant alle Zeilen, erzeugt Dateien (mit Cache) und prüft die Zeitfenster.
//   node render/tts.js ep001      → Tabelle der Zeilen + Prüfung
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, loadState, resolveEpisode } from '../engine/story.js';

const VOICES = JSON.parse(readFileSync(join(ROOT, 'render', 'voices.json'), 'utf8'));
const CACHE = join(ROOT, 'out', 'tts-cache');
const speakable = (t) => t.replace(/ /g, ' ').replace(/(\d)\s*€/g, '$1 Euro').replace(/€/g, 'Euro').replace(/\s*…\s*/g, ', ').replace(/^,\s*/, '').replace(/\s+/g, ' ').trim();

export function voiceFor(who) {
  let v = VOICES[who];
  if (!v) throw new Error(`Keine Stimme für "${who}" in render/voices.json`);
  if (v.same) v = VOICES[v.same];
  return v;
}

/** Alle Sprachzeilen: { who, text, emotion?, start, maxEnd, chain? } (Sekunden ab Videoanfang). */
export function planVoice(episode) {
  const lines = []; let s = 0;
  for (const sc of episode.scenes) {
    for (const c of sc.captions ?? []) {
      const who = c.kind === 'speech' ? c.who : 'Erzähler';
      lines.push({ who, emotion: c.emotion, text: speakable(c.say ?? c.text), start: s + c.t + 0.1, maxEnd: s + c.t + c.d });
    }
    if (sc.recap) {
      lines.push({ who: 'Erzähler', text: speakable(`Bisher: ${sc.recap.summary}`), start: s + 0.45, maxEnd: s + 4.6 });
      lines.push({ who: 'Erzähler', text: speakable(`Ihr habt entschieden: ${sc.recap.decision}`), start: s + 4.2, maxEnd: s + sc.duration - 0.1, chain: true });
    }
    if (sc.vote) {
      const say = sc.vote.say ?? [episode.choice.question, ...episode.choice.options.map((o) => `${o.key}: ${o.label}.`), episode.choice.cta + '.'];
      for (const p of say) lines.push({ who: 'Erzähler', text: speakable(p), start: s + sc.vote.t + 1.2, maxEnd: s + sc.duration - 0.3, chain: true });
    }
    s += sc.duration;
  }
  return lines;
}

function piperBin() {
  const local = join(ROOT, '.venv-tts', 'bin', 'piper');
  return existsSync(local) ? local : 'piper';
}

function synth(voice, text, emotion) {
  let model = voice.model, speaker;
  if (emotion) {
    if (!voice.emotions || voice.emotions[emotion] === undefined) throw new Error(`Emotion "${emotion}" nicht konfiguriert`);
    model = voice.emotions.model; speaker = voice.emotions[emotion];
  }
  const key = createHash('sha1').update(JSON.stringify([voice, model, speaker, text, 3])).digest('hex').slice(0, 16);
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${key}.wav`);
  if (existsSync(file)) return file;
  const modelPath = join(ROOT, 'voices', `${model}.onnx`);
  if (!existsSync(modelPath)) throw new Error(`Stimme fehlt: ${modelPath} – bitte "bash scripts/setup-tts.sh" ausführen`);
  const raw = file + '.raw.wav';
  const args = ['-m', modelPath, '-f', raw, '--length-scale', String(voice.lengthScale ?? 1),
    '--noise-scale', String(voice.noiseScale ?? 0.667), '--noise-w-scale', String(voice.noiseW ?? 0.8), '--sentence-silence', '0.12'];
  if (speaker !== undefined) args.push('-s', String(speaker));
  const r = spawnSync(piperBin(), args, { input: text, encoding: 'utf8' });
  if (r.status !== 0 || !existsSync(raw)) throw new Error(`Piper fehlgeschlagen für "${text}": ${r.stderr}`);
  // Leicht „mikrofoniert“: Bass-Säuberung, etwas Wärme/Präsenz, sanfte Kompression, Stille am Ende kürzen.
  const af = 'highpass=f=75,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=7500:t=q:w=1:g=-2,'
    + 'acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2,silenceremove=stop_periods=-1:stop_duration=0.15:stop_threshold=-45dB,'
    + 'loudnorm=I=-16:TP=-1.5:LRA=7';
  const f = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', af, '-ar', '44100', '-ac', '1', file]);
  if (f.status !== 0) throw new Error('ffmpeg (Stimme) fehlgeschlagen: ' + f.stderr);
  return file;
}

export function wavInfo(file) {
  const b = readFileSync(file);
  let p = 12, fmt = null;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') {
      const len = Math.min(size, b.length - p - 8) & ~1;
      const copy = Buffer.from(b.subarray(p + 8, p + 8 + len));
      return { ...fmt, samples: new Int16Array(copy.buffer, copy.byteOffset, len / 2) };
    }
    p += 8 + size + (size % 2);
  }
  throw new Error('WAV ohne data-Chunk: ' + file);
}

/** Silben grob zählen → Länge des Gebrabbels. */
export const syllables = (t) => (t.toLowerCase().match(/[aeiouäöüy]+/g) ?? []).length;

/** Erzeugt alle Sprachdateien, setzt Zeiten (Ketten nacheinander) und meldet Überschreitungen. */
export function buildVoice(episode) {
  const lines = planVoice(episode);
  const problems = [];
  let cursor = 0;
  for (const l of lines) {
    const v = voiceFor(l.who);
    if (v.babble) {
      l.babble = v.babble;
      l.dur = Math.min(l.maxEnd - l.start - 0.3, Math.max(syllables(l.text) / v.babble.speed, (l.maxEnd - l.start) * 0.6));
    } else {
      l.file = synth(v, l.text, l.emotion);
      const w = wavInfo(l.file); l.dur = w.samples.length / w.sr;
    }
    if (l.chain) l.start = Math.max(l.start, cursor + 0.45);
    l.end = l.start + l.dur; cursor = l.end;
    if (l.end > l.maxEnd + 1e-6) problems.push(`„${l.text}“ (${l.who}): endet bei ${l.end.toFixed(2)} s, erlaubt bis ${l.maxEnd.toFixed(2)} s`);
  }
  const spoken = lines.filter((l) => !l.babble).sort((a, b) => a.start - b.start);
  for (let i = 1; i < spoken.length; i++) if (spoken[i].start < spoken[i - 1].end - 0.05) problems.push(`Überlappung: „${spoken[i - 1].text}“ und „${spoken[i].text}“`);
  return { lines, problems };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ep = resolveEpisode(process.argv[2], loadState());
  const { lines, problems } = buildVoice(ep);
  for (const l of lines) console.log(`${l.start.toFixed(2).padStart(6)}–${l.end.toFixed(2).padStart(6)} (max ${l.maxEnd.toFixed(2).padStart(6)})  ${(l.babble ? l.who + '*' : l.who + (l.emotion ? '/' + l.emotion : '')).padEnd(15)} ${l.text}`);
  if (problems.length) { console.error('\nProbleme:\n - ' + problems.join('\n - ')); process.exit(1); }
  console.log('\nSprache passt in alle Zeitfenster.  (* = Gebrabbel)');
}
