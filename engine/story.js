// Lädt Folgen und Spielstand, baut den Rückblick und prüft die Videolänge.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const MIN_SECONDS = 61;
export const MAX_SECONDS = 70;
export const RECAP_SECONDS = 7;

export const episodePath = (id) => join(ROOT, 'story', 'episodes', `${id}.json`);
export const statePath = () => join(ROOT, 'state', 'state.json');

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadState() {
  if (existsSync(statePath())) return loadJson(statePath());
  return loadJson(join(ROOT, 'story', 'state.initial.json'));
}

export function saveState(state) {
  writeFileSync(statePath(), JSON.stringify(state, null, 2) + '\n');
}

export function loadEpisodeRaw(id) {
  const p = episodePath(id);
  if (!existsSync(p)) {
    throw new Error(`Folge ${id} existiert nicht. Schreibe story/episodes/${id}.json (siehe story/bible.md).`);
  }
  return loadJson(p);
}

/** Der Rückblick: max. 2 kurze Sätze – was war, und was die Community entschieden hat. */
export function buildRecap(history) {
  const last = history[history.length - 1];
  if (!last) return null;
  return { summary: last.summary, decision: last.recap, label: last.label, key: last.key };
}

/** Folge fertig zum Rendern: bei Nr. ≥ 2 mit vorangestellter Rückblick-Szene. */
export function resolveEpisode(id, state) {
  const ep = structuredClone(loadEpisodeRaw(id));
  const recap = ep.number > 1 ? buildRecap(state.history) : null;
  if (recap) {
    ep.scenes.unshift({
      id: 'recap',
      duration: RECAP_SECONDS,
      env: { type: 'recap', time: 'day', weather: 'none' },
      camera: [{ t: 0, pos: [0, 1.6, 6], look: [0, 1.2, 0] }],
      actors: [],
      recap
    });
  }
  ep.recap = recap;
  ep.duration = totalDuration(ep);
  return ep;
}

export const totalDuration = (ep) => ep.scenes.reduce((s, sc) => s + sc.duration, 0);

/** Gibt eine Liste von Fehlern zurück (leer = ok). */
export function validateEpisode(ep) {
  const errors = [];
  const total = totalDuration(ep);
  if (total < MIN_SECONDS || total > MAX_SECONDS) {
    errors.push(`Länge ${total}s liegt nicht in ${MIN_SECONDS}–${MAX_SECONDS}s`);
  }
  if (!ep.choice || !Array.isArray(ep.choice.options) || ep.choice.options.length < 2) {
    errors.push('Folge braucht eine Entscheidung mit mindestens 2 Optionen');
  } else {
    const keys = ep.choice.options.map((o) => o.key);
    if (new Set(keys).size !== keys.length) errors.push('Option-Keys müssen eindeutig sein');
    for (const o of ep.choice.options) {
      for (const f of ['key', 'label', 'sub', 'next', 'recap', 'effects']) {
        if (o[f] === undefined) errors.push(`Option ${o.key ?? '?'}: Feld "${f}" fehlt`);
      }
    }
  }
  const last = ep.scenes[ep.scenes.length - 1];
  if (!last || !last.vote) errors.push('Letzte Szene muss die Abstimmung ("vote") enthalten');
  if (!ep.summary) errors.push('Folge braucht "summary" (für den Rückblick der nächsten Folge)');
  for (const sc of ep.scenes) {
    for (const c of sc.captions ?? []) {
      if (c.t + c.d > sc.duration + 1e-6) errors.push(`Szene ${sc.id}: Untertitel "${c.text}" endet nach der Szene`);
    }
    for (const a of sc.actors ?? []) {
      for (const seg of a.track) {
        if (seg.t + seg.d > sc.duration + 1e-6) errors.push(`Szene ${sc.id}: Track von ${a.id} läuft über die Szene hinaus`);
      }
    }
  }
  return errors;
}
