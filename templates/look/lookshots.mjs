// {{SERIES}} ep{{N}}: LOOK TEST (approval point 2). One still per set with the cast in it, through the real look engine
// (light, grade, depth). Show these to the creator BEFORE any shot is built.   python <engine>/arclab.py look --ep <ep>
// Each look shot is 1 s of "time" (t0..t1) with its own colour-script chapter; STILLS lists the frames to render.
import { setChapters, camMatrix, applyCam, camPt, contactShadow, glow, drawCritter, drawHuman } from '../../engine.mjs';
import { HERO, BUDDY } from '../../kit/cast.mjs';
import { hill, HILL } from '../../kit/sets.mjs';

export function init() { setChapters([{ preset: 'dusk', f0: 0 }, { preset: 'night', f0: 30 }]); }
const on = (L, n, M) => { if (!L[n].on) return false; applyCam(L[n].x, M); return true; };
const I = camMatrix({});

function hillShot(id, t0, t1) {
  return { id, t0, t1, motion: 'still',
    layers: [['SKY', { dof: 1.5 }], ['GROUND', {}], ['CAST', { subject: true }], ['NEAR', { dof: 3, gain: 0.6 }], ['GLOW', { blend: 'add' }]],
    draw(L, t) {
      on(L, 'SKY', I) && hill.back(L.SKY.x, { t });
      on(L, 'GROUND', I) && hill.ground(L.GROUND.x, { t });
      const h = { x: 420, y: 1560, s: 1.6, turn: 0.35, expr: 'happy', t }, b = { x: 700, y: 1580, s: 1.4, turn: -0.4, headTurn: 0.3, pose: 'sit', expr: 'happy', t };
      const H = drawHuman(null, HERO, h), B = drawCritter(null, BUDDY, b);
      if (on(L, 'CAST', I)) { contactShadow(L.CAST.x, h.x, h.y, 110, 20); contactShadow(L.CAST.x, b.x, b.y, 110, 18); drawHuman(L.CAST.x, HERO, h); drawCritter(L.CAST.x, BUDDY, b); }
      on(L, 'NEAR', I) && hill.near(L.NEAR.x, { t });
      on(L, 'GLOW', I) && glow(L.GLOW.x, ...HILL.moon, 200, 0.4, '220,225,255');
      return { sun: HILL.moon, hz: HILL.hz, faces: [[H.head[0], H.head[1], H.head[2] * 1.2], [B.head[0], B.head[1], B.head[2] * 1.2]] };
    } };
}
export const SHOTS = [hillShot('LT1_hill_dusk', 0, 1), hillShot('LT2_hill_night', 1, 2)];
export const STILLS = [15, 45];
