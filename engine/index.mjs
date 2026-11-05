// Arc Lab engine: THE one import for kits and shot modules. A series project reaches it through its own engine.mjs
// shim (written by `arclab new-series`), so shot files stay portable:   import * as E from '../../engine.mjs';
export * from './lib.mjs';
export { SS, setSS, bindView, lin, enc, dec } from './look/core.mjs';
export { renderFrame, shotAt, SUBS } from './look/render.mjs';
export { CHAPTERS, PRESETS, setChapters, chapterAt, gradeFor, meter } from './look/grade.mjs';
export { push, punch, whip, shake, drift, camMatrix, applyCam, camPt } from './look/camera.mjs';
export { glow, eyeGlow, sparkGlow, screenGlow, timerGlow, contactShadow } from './look/light.mjs';
export { projector, lw, blob, tube, line, curve, ell, circ, poly, smoothPath, capsuleParts, nrm, pitch, shadeOf, litOff, painter } from './chars/rig.mjs';
export { makeHuman, drawHuman, HUMAN, BUILDS, ARMS, EXPR, HAIR, armVec } from './chars/human.mjs';
export { makeCritter, drawCritter, CRITTER, CEXPR } from './chars/critter.mjs';
export { take, mouthFromWords, blinkAt, between } from './chars/take.mjs';
export { sky, sea, ground, stars, moon, fog, rain, hills } from './kit/backdrops.mjs';
