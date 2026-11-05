// LOOK-TEST (Freigabe 2) für Folge 1: ein Standbild pro Ort mit der Besetzung, durch die echte Look-Engine.
//   python <engine>/arclab.py look --ep ep01
import { setChapters, camMatrix, applyCam, camPt, contactShadow, glow, drawCritter, drawHuman } from '../../engine.mjs';
import { DU, ABFINDUNG, HERTHA, KEMAL, BRANDT, WACHMANN } from '../../kit/cast.mjs';
import { office, OFFICE, city, CITY, bridge, BRIDGE, deck, DECK } from '../../kit/sets.mjs';
import { drawBox, drawGlassDoor, drawBarrel, barrelGlow, drawBlackCar, carGlow, drawEnvelope, drawBottleSack, drawCrateSeat, drawTeaCup, drawPasserby, drawCactus } from '../../kit/props.mjs';

export function init() {
  setChapters([
    { preset: 'dusk', f0: 0, name: 'buero', exposure: 1.25, sat: 0.85 },
    { preset: 'night', f0: 30, name: 'stadt', exposure: 1.45, sat: 0.9 },
    { preset: 'lamplit', f0: 60, name: 'bruecke', exposure: 1.7, sat: 0.9 },
    { preset: 'lamplit', f0: 90, name: 'karton', exposure: 1.3 },
    { preset: 'threat', f0: 120, name: 'wagen', exposure: 2.2, accent: 0.8 },
  ]);
}
const I = camMatrix({});
const on = (L, n, M = I) => { if (!L[n].on) return false; applyCam(L[n].x, M); return true; };
const face = (P, k = 1.2) => [P.head[0], P.head[1], P.head[2] * k];

const LT1 = { id: 'LT1_buero_eingang', t0: 0, t1: 1, motion: 'still',
  layers: [['BACK', { dof: 1.5 }], ['GROUND', {}], ['DOOR', {}], ['CAST', { subject: true }], ['RAIN', { blend: 'screen' }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    on(L, 'BACK') && office.back(L.BACK.x, { t });
    on(L, 'GROUND') && office.ground(L.GROUND.x, { t });
    on(L, 'DOOR') && drawGlassDoor(L.DOOR.x, { cx: 820, cy: 1500, s: 1.2, t, shadow: 1 });
    const dp = { x: 400, y: 1640, s: 1.7, turn: -0.4, pose: 'stand', expr: 'sad', armR: 'hold', armL: 'hold', t };
    const wp = { x: 640, y: 1600, s: 1.8, turn: -0.5, pose: 'stand', expr: 'neutral', armR: 'point', t };
    const D = drawHuman(null, DU, dp);
    if (on(L, 'CAST')) { drawHuman(L.CAST.x, WACHMANN, wp); contactShadow(L.CAST.x, dp.x, dp.y, 120, 16); drawHuman(L.CAST.x, DU, dp); drawBox(L.CAST.x, { cx: D.hands[0][0] + 10, cy: D.hands[0][1] + 140, s: 0.7, sag: 1, open: 0 }); }
    on(L, 'RAIN') && office.rain(L.RAIN.x, { t });
    on(L, 'GLOW') && office.glows(L.GLOW.x, { t });
    return { sun: OFFICE.light, hz: OFFICE.hz, faces: [face(D)] };
  } };

const LT2 = { id: 'LT2_stadt_nacht', t0: 1, t1: 2, motion: 'still',
  layers: [['BACK', { dof: 1.5 }], ['MID', { haze: 0.3 }], ['GROUND', {}], ['PASS', {}], ['CAST', { subject: true }], ['RAIN', { blend: 'screen' }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    on(L, 'BACK') && city.back(L.BACK.x, { t });
    on(L, 'MID') && city.mid(L.MID.x, { t });
    on(L, 'GROUND') && city.ground(L.GROUND.x, { t });
    if (on(L, 'PASS')) { drawPasserby(L.PASS.x, { cx: 150, cy: 1480, s: 1.1, t, umb: '#7A3A58' }); drawPasserby(L.PASS.x, { cx: 900, cy: 1500, s: 1.2, t, umb: '#2F6A7A', dir: -1 }); }
    const dp = { x: 560, y: 1700, s: 1.8, turn: 2, pose: 'walk', phase: 0.3, expr: 'worried', t };
    const D = drawHuman(null, DU, dp);
    if (on(L, 'CAST')) { contactShadow(L.CAST.x, dp.x, dp.y, 120, 16); drawHuman(L.CAST.x, DU, dp); drawBox(L.CAST.x, { cx: D.hands[0][0], cy: D.hands[0][1] + 120, s: 0.6, sag: 1 }); }
    on(L, 'RAIN') && city.rain(L.RAIN.x, { t });
    on(L, 'GLOW') && city.glows(L.GLOW.x, { t });
    return { sun: CITY.light, hz: CITY.hz, faces: [] };
  } };

const LT3 = { id: 'LT3_bruecke_feuer', t0: 2, t1: 3, motion: 'still',
  layers: [['BACK', { dof: 1.5 }], ['MID', { haze: 0.2 }], ['GROUND', {}], ['PROPS', {}], ['CAST', { subject: true }], ['RAIN', { blend: 'screen' }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    on(L, 'BACK') && bridge.back(L.BACK.x, { t });
    on(L, 'MID') && bridge.mid(L.MID.x, { t });
    on(L, 'GROUND') && bridge.ground(L.GROUND.x, { t });
    const [bx, by] = BRIDGE.barrel;
    if (on(L, 'PROPS')) { drawBottleSack(L.PROPS.x, { cx: 940, cy: 1560, s: 1.1 }); drawCrateSeat(L.PROPS.x, { cx: 430, cy: 1560, s: 1.1 }); drawBarrel(L.PROPS.x, { cx: bx, cy: by + 30, s: 1.25, t }); }
    const hp = { x: 460, y: 1560, s: 1.5, turn: 0.5, pose: 'sit', seat: 55, expr: 'happy', armR: 'hold', t };
    const kp = { x: 930, y: 1620, s: 1.55, turn: -0.5, pose: 'stand', expr: 'sly', armR: 'hips', t };
    const dp = { x: 250, y: 1700, s: 1.8, turn: 0.55, pose: 'stand', expr: 'worried', armR: 'hold', armL: 'hold', t };
    const ap = { x: 600, y: 1730, s: 1.7, turn: 0.5, headTurn: -0.5, pose: 'stand', expr: 'happy', earPerk: 1, wag: 0.5, t };
    const H1 = drawHuman(null, HERTHA, hp), K = drawHuman(null, KEMAL, kp), D = drawHuman(null, DU, dp), A = drawCritter(null, ABFINDUNG, ap);
    if (on(L, 'CAST')) { contactShadow(L.CAST.x, dp.x, dp.y, 120, 16); drawHuman(L.CAST.x, HERTHA, hp); drawHuman(L.CAST.x, KEMAL, kp); drawHuman(L.CAST.x, DU, dp); drawCritter(L.CAST.x, ABFINDUNG, ap); drawBox(L.CAST.x, { cx: D.hands[0][0] + 20, cy: D.hands[0][1] + 130, s: 0.65, sag: 1 }); }
    on(L, 'RAIN') && bridge.rain(L.RAIN.x, { t });
    if (on(L, 'GLOW')) { bridge.glows(L.GLOW.x, { t }); barrelGlow(L.GLOW.x, { cx: bx, cy: by + 30, s: 1.25, t }); }
    return { sun: [bx, by - 280], hz: BRIDGE.hz, faces: [face(H1), face(K), face(D), face(A)],
      points: [{ x: bx, y: by - 260, r: 900, col: '#FFAA55', k: 0.9 }] };
  } };

const LT4 = { id: 'LT4_karton_nah', t0: 3, t1: 4, motion: 'still',
  layers: [['BACK', { dof: 3 }], ['PROPS', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const M = camMatrix({ zoom: 1.6, cx: 540, cy: 1400 });
    on(L, 'BACK', M) && bridge.back(L.BACK.x, { t });
    if (on(L, 'PROPS', M)) { drawBox(L.PROPS.x, { cx: 540, cy: 1640, s: 1.9, open: 0.5, sag: 1, t }); drawTeaCup(L.PROPS.x, { cx: 900, cy: 1500, s: 1.3, t }); }
    on(L, 'GLOW', M) && barrelGlow(L.GLOW.x, { cx: 940, cy: 1560, s: 1.2, t, k: 0.7 });
    return { sun: [940, 1200], hz: BRIDGE.hz, faces: [], clues: [[400, 1100, 340, 420]] };
  } };

const LT5 = { id: 'LT5_wagen_oben', t0: 4, t1: 5, motion: 'still',
  layers: [['BACK', { dof: 1.5 }], ['MID', {}], ['CAR', {}], ['BRANDT', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    on(L, 'BACK') && deck.back(L.BACK.x, { t });
    on(L, 'MID') && deck.mid(L.MID.x, { t });
    on(L, 'CAR') && drawBlackCar(L.CAR.x, { cx: 760, cy: 1190, s: 1.35, t, binoculars: 1 });
    const bp = { x: 300, y: 1200, s: 1.7, turn: 0.3, pose: 'stand', expr: 'happy', armR: 'hold', t };
    const B = drawHuman(null, BRANDT, bp);
    if (on(L, 'BRANDT')) { drawHuman(L.BRANDT.x, BRANDT, bp); drawEnvelope(L.BRANDT.x, { cx: B.hands[0][0], cy: B.hands[0][1], s: 0.7, rot: 0.3 }); }
    if (on(L, 'GLOW')) { deck.glows(L.GLOW.x, { t }); carGlow(L.GLOW.x, { cx: 760, cy: 1190, s: 1.35, t }); }
    return { sun: [760, 1100], hz: 1180, faces: [face(B)], clues: [[790, 1090, 90, 90]] };
  } };

export const SHOTS = [LT1, LT2, LT3, LT4, LT5];
export const STILLS = [15, 45, 75, 105, 135];
