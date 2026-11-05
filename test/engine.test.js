import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEpisodeRaw, loadJson, ROOT, validateEpisode, totalDuration, resolveEpisode, MIN_SECONDS, MAX_SECONDS } from '../engine/story.js';
import { applyChoice, tally } from '../engine/vote.js';
import { join } from 'node:path';

const initial = loadJson(join(ROOT, 'story', 'state.initial.json'));

test('Folge 1 ist 61–70 s lang und gültig', () => {
  const ep = loadEpisodeRaw('ep001');
  const t = totalDuration(ep);
  assert.ok(t >= MIN_SECONDS && t <= MAX_SECONDS, `Länge ${t}`);
  assert.deepEqual(validateEpisode(ep), []);
});

test('Zu kurze Folge wird abgelehnt', () => {
  const ep = loadEpisodeRaw('ep001');
  ep.scenes = ep.scenes.slice(0, 2);
  assert.ok(validateEpisode(ep).some((e) => e.includes('Länge')));
});

test('Abstimmung gewinnt die höchste Zahl, Gleichstand wirft', () => {
  assert.equal(tally('A=12,B=40,C=7'), 'B');
  assert.throws(() => tally('A=5,B=5,C=1'), /Gleichstand/);
});

test('Wahl ändert Stats, Beziehungen, Flags und Verlauf', () => {
  const ep = loadEpisodeRaw('ep001');
  const next = applyChoice(initial, ep, 'A');
  assert.equal(next.stats.money, 32);
  assert.equal(next.stats.energy, 20);
  assert.equal(next.relations.dilara, 1);
  assert.ok(next.flags.includes('path:dilara'));
  assert.equal(next.episode, 'ep002');
  assert.equal(next.history[0].key, 'A');
  assert.equal(initial.stats.money, 12, 'Ausgangszustand bleibt unverändert');
});

test('Geld und Energie fallen nie unter 0', () => {
  const ep = loadEpisodeRaw('ep001');
  const poor = structuredClone(initial);
  poor.stats.money = 3;
  assert.equal(applyChoice(poor, ep, 'C').stats.money, 0);
});

test('Rückblick wird vor Folge ≥ 2 eingefügt', async () => {
  const { writeFileSync, rmSync } = await import('node:fs');
  const p = join(ROOT, 'story', 'episodes', 'ep999.json');
  const ep = loadEpisodeRaw('ep001');
  ep.id = 'ep999'; ep.number = 2; ep.scenes[0].duration = 3; ep.scenes[0].title.d = 2; ep.scenes[0].captions = [];
  ep.scenes[0].camera = ep.scenes[0].camera.slice(0, 1);
  writeFileSync(p, JSON.stringify(ep));
  try {
    const state = applyChoice(initial, loadEpisodeRaw('ep001'), 'B');
    const resolved = resolveEpisode('ep999', state);
    assert.equal(resolved.scenes[0].id, 'recap');
    assert.match(resolved.recap.decision, /Pfandflaschen/);
  } finally { rmSync(p); }
});
