// Day 23: THE CAST. Models only (what each character IS); poses live in the shots. Reference: docs/CHARS_API.md.
import { makeHuman, makeCritter } from '../engine.mjs';

// YOU: a patient at Ashby Creek General who wakes from a coma on day 23. Episode 1 wardrobe: a dotted hospital gown, bare feet.
// Signature: the messy dark hair and the head bandage (from episode 2, clothes found on the way).
export const YOU = makeHuman({
  name: 'You', build: 'adult', dims: { torsoH: 98, legLen: 70, shoulderW: 46, hipHalf: 36 },
  skin: '#DDAE88', hair: '#3A2A1E', hairStyle: 'messy', eyeSize: 1.0, blush: false, stubble: '#3A2A22', bandage: true,
  top: { type: 'dress', col: '#C9DCE4', col2: '#8EAAB8', pattern: 'dots' },
  bottom: { type: 'pants', col: '#C9DCE4' },
  shoes: { type: 'sneakers', col: '#D9A882', col2: null }, barefoot: true,   // bare feet (toes, no sole)
});

// SCOUT: the stray who came for you. A scruffy shepherd mix: tan with a dark saddle and a dark muzzle, big upright
// ears, a bushy tail, a red bandana. The companion: his ears and tail say what he feels in every shot.
export const SCOUT = makeCritter({
  name: 'Scout',
  body: { len: 50, r: 37 },
  head: { r: 54, snout: 0.78, snoutW: 0.5, eyeSize: 1.0 },
  ears: { type: 'pointy', size: 1.2 },
  tail: { type: 'bushy', size: 1.05, up: 0.28 },                       // a shepherd carries its tail low
  legs: { len: 50, w: 18 },                                          // a shepherd stands tall: the legs show below the body
  col: { base: '#C98A4B', belly: '#ECD3A6', patch: '#2B2421', muzzle: '#4E382C', nose: '#1A1412', eyes: '#1A120E', inner: '#D99A8A', tongue: '#E8707A' },
  marks: { mask: null, chest: true, socks: false, muzzle: true, tailTip: false, saddle: true },
  fur: 'scruffy',
  collar: { col: '#C02A26', style: 'bandana' },
});

// WALKERS: the town's dead. Grey-green skin, blank eyes, torn clothes. Each one was somebody.
const walker = (spec) => makeHuman({ torn: true, decay: true, blush: false, nose: null, eyes: '#5A5A48', brows: 1.3, eyeSize: 1.1, ...spec });
export const W_NURSE = walker({ name: 'Nurse', build: 'adult', skin: '#A7B19A', hair: '#4A3A2C', hairStyle: 'bun', hairTie: '#3A3A3A',
  top: { type: 'tee', col: '#6F9C94' }, bottom: { type: 'pants', col: '#6F9C94' }, shoes: { type: 'sneakers', col: '#D8D8D0', col2: null } });
export const W_FARMER = walker({ name: 'Farmer', build: 'broad', skin: '#9DA78D', hair: '#3A3026', hairStyle: 'buzz',
  top: { type: 'sweater', col: '#7A5A40' }, bottom: { type: 'pants', col: '#3E4E68' }, shoes: { type: 'boots', col: '#3A2A20' }, hat: { type: 'cap', col: '#9A3A30', col2: '#7A2A24' } });
export const W_JOGGER = walker({ name: 'Jogger', build: 'teen', skin: '#ADB4A0', hair: '#8A6A3A', hairStyle: 'ponytail', hairTie: '#C04060',
  top: { type: 'tee', col: '#C86A86' }, bottom: { type: 'shorts', col: '#3A3A48' }, shoes: { type: 'sneakers', col: '#E8E8E0', col2: '#5A8AC0' } });
export const W_SUIT = walker({ name: 'Suit', build: 'adult', skin: '#A2A890', hair: '#3A322C', hairStyle: 'short',
  top: { type: 'jacket', col: '#3A3E4A' }, bottom: { type: 'pants', col: '#2E3240' }, shoes: { type: 'boots', col: '#1E1E22' } });
export const WALKERS = [W_NURSE, W_FARMER, W_JOGGER, W_SUIT];
// episode 2: the officer who crashed the police car. His car keys still hang on his duty belt (props.drawDutyBelt,
// drawn by the shots at the hips). Not in WALKERS, so episode 1's crowds stay as they were.
export const W_COP = walker({ name: 'Officer', build: 'adult', skin: '#A0A88E', hair: '#2E2A26', hairStyle: 'short',
  top: { type: 'tee', col: '#2C3A5A', col2: '#C9A646' }, bottom: { type: 'pants', col: '#1E2638' }, shoes: { type: 'boots', col: '#141418' },
  hat: { type: 'captain', col: '#1E2638', col2: '#C9A646' } });

export const CAST = {
  you: { kind: 'human', model: YOU, label: 'You (the patient)', scale: 1 },
  scout: { kind: 'critter', model: SCOUT, label: 'Scout (the dog)', scale: 1 },
  nurse: { kind: 'human', model: W_NURSE, label: 'Walker: the nurse', scale: 1 },
  farmer: { kind: 'human', model: W_FARMER, label: 'Walker: the farmer', scale: 1 },
  jogger: { kind: 'human', model: W_JOGGER, label: 'Walker: the jogger', scale: 1 },
  suit: { kind: 'human', model: W_SUIT, label: 'Walker: the suit', scale: 1 },
  cop: { kind: 'human', model: W_COP, label: 'Walker: the officer (ep 2)', scale: 1 },
};
