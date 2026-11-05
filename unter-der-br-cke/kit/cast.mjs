// Unter der Brücke: DIE BESETZUNG. Ein Modell pro Figur. Referenz: docs/CHARS_API.md. Prüfen mit:
//   python <engine>/arclab.py sheets --ep <series>
import { makeHuman, makeCritter } from '../engine.mjs';

// Du: Jonas Weigel, 34, gefeuerter Disponent
export const DU = makeHuman({
  name: 'Du', build: 'adult',
  skin: '#EFC3A0', hair: '#4A3224', hairStyle: 'short', stubble: '#5A4538',
  top: { type: 'jacket', col: '#E9E6DE', col2: '#8A93A6' },
  bottom: { type: 'pants', col: '#3B4252' },
  shoes: { type: 'boots', col: '#2A2623', col2: '#1A1715' },
});

// Abfindung: struppiger Straßenhund, roter Schal
export const ABFINDUNG = makeCritter({
  name: 'Abfindung',
  body: { len: 62, r: 40 },
  head: { r: 52, snout: 0.5, snoutW: 0.55, eyeSize: 1.15 },
  ears: { type: 'floppy', size: 1 },
  tail: { type: 'bushy', size: 1 },
  col: { base: '#B88A5A', belly: '#EBD9B8', patch: '#6B4A2C', nose: '#2A1A16', eyes: '#1E1412', inner: '#E8A8A0', muzzle: '#8A6A44' },
  marks: { mask: 'left', chest: true, socks: true, muzzle: true, tailTip: true },
  fur: 'scruffy',
  collar: { col: '#D63A2F', style: 'bandana' },
});

// Oma Hertha: ältere Brückenbewohnerin
export const HERTHA = makeHuman({
  name: 'Hertha', build: 'elder',
  skin: '#E8C2A4', blush: true, hair: '#CFCFCF', hairStyle: 'bun',
  top: { type: 'coat', col: '#6E5A8A', col2: '#C9B9D8' },
  bottom: { type: 'skirt', col: '#4A3F5C' },
  shoes: { type: 'boots', col: '#3A2F2A', col2: '#241C18' },
  scarf: { col: '#D8A24A', col2: '#B5832E' },
});

// Kemal: Pfandflaschen-Sammler
export const KEMAL = makeHuman({
  name: 'Kemal', build: 'teen',
  skin: '#D6A67E', hair: '#1E1612', hairStyle: 'spiky',
  top: { type: 'hoodie', col: '#2F7A6B', col2: '#E8E2D4' },
  bottom: { type: 'pants', col: '#3A3F4A' },
  shoes: { type: 'sneakers', col: '#F4F1EA', col2: '#2F7A6B' },
  hat: { type: 'cap', col: '#1F2A44', col2: '#E8E2D4' },
});

// Frau Brandt: die Chefin
export const BRANDT = makeHuman({
  name: 'Brandt', build: 'adult',
  skin: '#F0CDB0', hair: '#2A2220', hairStyle: 'bob',
  top: { type: 'coat', col: '#1C1F2B', col2: '#B8B8C2' },
  bottom: { type: 'pants', col: '#1C1F2B' },
  shoes: { type: 'boots', col: '#14151C', col2: '#0B0B10' },
  glasses: { col: '#2B2B33' },
});

export const CAST = {
  du: { kind: 'human', model: DU, label: 'Du', scale: 1 },
  abfindung: { kind: 'critter', model: ABFINDUNG, label: 'Abfindung', scale: 1 },
  hertha: { kind: 'human', model: HERTHA, label: 'Hertha', scale: 1 },
  kemal: { kind: 'human', model: KEMAL, label: 'Kemal', scale: 1 },
  brandt: { kind: 'human', model: BRANDT, label: 'Frau Brandt', scale: 1 },
};
