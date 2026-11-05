// {{SERIES}}: THE CAST. One model per character: what the character IS (build, colours, hair, outfit, markings).
// What they DO goes in the shots (poses + take()). Reference: docs/CHARS_API.md. Check every change with:
//   python <engine>/arclab.py sheets --ep <series>      -> look/sheets/sheet_<id>.png + lineup.png
import { makeHuman, makeCritter } from '../engine.mjs';

// The hero (replace with your series' lead). Builds: kid | teen | adult | broad | elder.
export const HERO = makeHuman({
  name: 'Hero', build: 'teen',
  skin: '#F2C6A0', hair: '#3A2418', hairStyle: 'messy',            // short | messy | spiky | bob | long | ponytail | bun | curly | buzz | bald
  top: { type: 'hoodie', col: '#3E5BA9', col2: '#E8E2D4' },          // tee | hoodie | jacket | raincoat | coat | sweater | dress | vest
  bottom: { type: 'pants', col: '#2F3442' },                         // pants | shorts | skirt
  shoes: { type: 'sneakers', col: '#F4F1EA', col2: '#C8423A' },      // sneakers | boots
});

// The companion (a creature: change ears/tail/snout/colours to make a dog, cat, fox, rabbit or something new).
export const BUDDY = makeCritter({
  name: 'Buddy',
  head: { r: 54, snout: 0.45, snoutW: 0.55, eyeSize: 1.1 },
  ears: { type: 'pointy', size: 1 },                                 // floppy | pointy | round | long | none
  tail: { type: 'bushy', size: 1 },                                  // bushy | thin | curl | stub | plume | none
  col: { base: '#E8963C', belly: '#FBEBD4', patch: '#8A4A22', nose: '#2A1A16', eyes: '#1E1412', inner: '#F2B0A8' },
  marks: { mask: null, chest: true, socks: true, muzzle: true, tailTip: true },
  fur: 'smooth',                                                     // smooth | scruffy
});

// id -> { kind: 'human' | 'critter', model, label, scale }: the sheet tool and the look test read this.
export const CAST = {
  hero: { kind: 'human', model: HERO, label: 'Hero', scale: 1 },
  buddy: { kind: 'critter', model: BUDDY, label: 'Buddy', scale: 1 },
};
