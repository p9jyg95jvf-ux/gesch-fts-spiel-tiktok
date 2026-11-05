// Prüft alle Folgen: Länge 61–70 s, Entscheidung, Pflichtfelder.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadEpisodeRaw, loadJson, resolveEpisode, validateEpisode, totalDuration } from './story.js';

let failed = false;
const ids = readdirSync(join(ROOT, 'story', 'episodes')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
for (const id of ids) {
  const raw = loadEpisodeRaw(id);
  // Für Folgen ≥ 2 wird der Rückblick (7 s) mitgerechnet.
  const fakeState = { history: [{ summary: 'x', recap: 'y', label: 'z', key: 'A' }] };
  const ep = raw.number > 1 ? resolveEpisode(id, fakeState) : raw;
  const errors = validateEpisode(ep);
  console.log(`${id}: ${totalDuration(ep)}s ${errors.length ? 'FEHLER' : 'ok'}`);
  for (const e of errors) { console.log('  -', e); failed = true; }
}
process.exit(failed ? 1 : 0);
