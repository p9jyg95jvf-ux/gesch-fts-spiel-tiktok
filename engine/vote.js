// Wendet das Abstimmungsergebnis an und speichert den neuen Spielstand.
//   node engine/vote.js ep001 B
//   node engine/vote.js ep001 --votes A=12,B=40,C=7
import { loadState, saveState, loadEpisodeRaw, validateEpisode } from './story.js';
import { fileURLToPath } from 'node:url';

export function tally(spec) {
  const counts = {};
  for (const part of spec.split(',')) {
    const [k, v] = part.split('=');
    counts[k.trim().toUpperCase()] = Number(v);
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || Number.isNaN(ranked[0][1])) throw new Error('Ungültige Stimmen');
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) {
    throw new Error(`Gleichstand zwischen ${ranked[0][0]} und ${ranked[1][0]} – bitte Stichwahl oder Entscheidung per Hand: node engine/vote.js <folge> <KEY>`);
  }
  return ranked[0][0];
}

export function applyChoice(state, episode, key) {
  const opt = episode.choice.options.find((o) => o.key === key);
  if (!opt) throw new Error(`Option ${key} gibt es in ${episode.id} nicht`);
  const next = structuredClone(state);
  const e = opt.effects ?? {};
  for (const stat of ['money', 'energy', 'debt', 'reputation']) {
    if (e[stat]) next.stats[stat] = Math.max(0, next.stats[stat] + e[stat]);
  }
  next.stats.energy = Math.min(100, next.stats.energy);
  for (const [who, d] of Object.entries(e.relations ?? {})) next.relations[who] = (next.relations[who] ?? 0) + d;
  for (const f of e.flags ?? []) if (!next.flags.includes(f)) next.flags.push(f);
  next.history.push({
    episode: episode.id, key, label: opt.label, recap: opt.recap, summary: episode.summary
  });
  next.episode = opt.next;
  next.day += 1;
  return next;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [epId, arg, spec] = process.argv.slice(2);
  if (!epId || !arg) {
    console.error('Aufruf: node engine/vote.js <folge> <KEY>   oder   node engine/vote.js <folge> --votes A=12,B=40');
    process.exit(2);
  }
  const key = arg === '--votes' ? tally(spec) : arg.toUpperCase();
  const episode = loadEpisodeRaw(epId);
  const errors = validateEpisode(episode);
  if (errors.length) console.warn('Hinweis:', errors.join('; '));
  const state = loadState();
  if (state.episode !== epId) {
    console.error(`Aktueller Spielstand steht auf ${state.episode}, nicht auf ${epId}.`);
    process.exit(1);
  }
  const next = applyChoice(state, episode, key);
  saveState(next);
  console.log(`Gewählt: ${key} – ${next.history.at(-1).label}`);
  console.log(`Nächste Folge: ${next.episode}`);
  console.log('Spielstand:', JSON.stringify(next.stats), JSON.stringify(next.relations));
}
