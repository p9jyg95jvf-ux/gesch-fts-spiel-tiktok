// Was wäre wenn ep1, SEGMENT A. Built by the SEG-A builder from BRIEF.md. Times are episode seconds (frame / 30):
// write T(f) with the frame numbers from the BRIEF's line table (cut 1-4 frames BEFORE a line's first word).
// Read docs/LOOK_API.md (shots, layers, META) and docs/CHARS_API.md (poses, take). Render stills while you work:
//   python <engine>/arclab.py stills --ep <ep> --seg A --frames 10,60
import { camMatrix, applyCam, camPt, push, punch, shake, drift, contactShadow, glow, take, drawHuman, drawCritter, clamp, lerp, seg } from '../../engine.mjs';
import { HERO, BUDDY } from '../../kit/cast.mjs';
import { hill, HILL } from '../../kit/sets.mjs';

const T = (f) => f / 30;
const on = (L, n, M) => { if (!L[n].on) return false; applyCam(L[n].x, M); return true; };

// A01 (frames 0-89): EXAMPLE shot. Frame 0 is action: the hero is already walking, the companion trots alongside.
const heroA01 = take({ x: 200, y: 1560, s: 1.6, turn: 1, pose: 'walk', expr: 'determined' },
  [{ t: 0, x: 620, dur: 3.0, ease: 'linear' }, { t: T(60), pose: 'stand', headTurn: -0.7, expr: 'surprised', dur: 0.25 }], { seed: 1 });
const buddyA01 = take({ x: 80, y: 1590, s: 1.3, turn: 1, pose: 'trot', expr: 'happy' },
  [{ t: 0, x: 480, dur: 3.0, ease: 'linear' }, { t: T(62), pose: 'stand', headTurn: -0.5, expr: 'alert', earPerk: 1, dur: 0.2 }], { seed: 2 });
const A01 = { id: 'A01', t0: 0, t1: T(90), motion: 'medium',
  layers: [['SKY', { dof: 1.5 }], ['GROUND', { shutter: 90 }], ['CAST', { subject: true }], ['NEAR', { dof: 3, gain: 0.6, shutter: 90 }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 4 });
    const cam = { zoom: push(t, 0, T(90), 0.04), cx: 540, cy: 1300, dx, dy, rot: dr }, M = camMatrix(cam);
    on(L, 'SKY', camMatrix(cam, 0.3)) && hill.back(L.SKY.x, { t });
    on(L, 'GROUND', M) && hill.ground(L.GROUND.x, { t });
    const h = heroA01(t), b = buddyA01(t), H = drawHuman(null, HERO, h), B = drawCritter(null, BUDDY, b);
    if (on(L, 'CAST', M)) { contactShadow(L.CAST.x, b.x, b.y, 100, 16); drawCritter(L.CAST.x, BUDDY, b); contactShadow(L.CAST.x, h.x, h.y, 110, 18); drawHuman(L.CAST.x, HERO, h); }
    on(L, 'NEAR', camMatrix(cam, 1.4)) && hill.near(L.NEAR.x, { t });
    on(L, 'GLOW', camMatrix(cam, 0.3)) && glow(L.GLOW.x, ...HILL.moon, 200, 0.4, '220,225,255');
    const hp = camPt(M, H.head[0], H.head[1]), bp = camPt(M, B.head[0], B.head[1]);
    // META: the key light, the horizon, FACES (no bloom on them, and the captions keep off them), CLUES (captions keep off)
    return { sun: camPt(camMatrix(cam, 0.3), ...HILL.moon), hz: camPt(M, 0, HILL.hz)[1], faces: [[hp[0], hp[1], H.head[2] * 1.2], [bp[0], bp[1], B.head[2] * 1.2]], clues: [] };
  } };

export const SHOTS = [A01];
// named moments for the sound mix: cues.json can say "at": "cue:A01.stop"
export const CUES = { 'A01.stop': T(60) };
