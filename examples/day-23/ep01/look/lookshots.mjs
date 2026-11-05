// LOOK TEST (approval point 2) for Day 23 ep 1: one still per set with the cast, through the real look engine.
//   python <engine>/arclab.py look --ep ep01
import { setChapters, camMatrix, applyCam, camPt, contactShadow, glow, drawCritter, drawHuman } from '../../engine.mjs';
import { YOU, SCOUT, W_NURSE, W_FARMER, W_JOGGER, W_SUIT } from '../../kit/cast.mjs';
import { room, ROOM, hall, HALL, street } from '../../kit/sets.mjs';
import { drawBed, drawIV, drawFlowers, drawDoor, drawWheelchair, drawChainedDoors } from '../../kit/props.mjs';

export function init() {
  setChapters([{ preset: 'threat', f0: 0, name: 'hospital', exposure: 1.42, accent: 0.9, sat: 0.8 },
    { preset: 'golden', f0: 120, name: 'street', sat: 0.74, curve: { c: 1.46, black: 0.05 }, vig: 0.42 }]);
}
const on = (L, n, M = I) => { if (!L[n].on) return false; applyCam(L[n].x, M); return true; };
const I = camMatrix({});
const lamps = (i) => [1, 1, 0, 1, 0.25, 0, 1][i];

const LT1 = { id: 'LT1_hospital_room', t0: 0, t1: 1, motion: 'still',
  layers: [['ROOM', {}], ['DOOR', {}], ['BED', {}], ['YOU', { subject: true }], ['BEDF', {}], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    on(L, 'ROOM') && (room.back(L.ROOM.x, { t }), drawIV(L.ROOM.x, { cx: 110, cy: 1520, t }), drawFlowers(L.ROOM.x, { cx: 700, cy: 1470 }));
    on(L, 'DOOR') && drawDoor(L.DOOR.x, { cx: 900, cy: 1440, t, shadow: 1, rattle: 1 });
    const [bx, by] = ROOM.bed;
    on(L, 'BED') && drawBed(L.BED.x, { cx: bx, cy: by + 20, s: 1, layer: 'back' });
    const yp = { x: bx - 60, y: by + 80, s: 1.35, turn: 0.45, headTurn: 0.35, pose: 'sit', seat: 60, expr: 'scared', armL: 'down', armR: 'down', t };
    const Y = drawHuman(null, YOU, yp);
    on(L, 'YOU') && drawHuman(L.YOU.x, YOU, yp);
    on(L, 'BEDF') && drawBed(L.BEDF.x, { cx: bx, cy: by + 20, s: 1, layer: 'front' });
    on(L, 'GLOW') && (room.slits(L.GLOW.x, {}), room.glows(L.GLOW.x, { t }));
    return { sun: ROOM.window, hz: ROOM.floor, faces: [[Y.head[0], Y.head[1], Y.head[2] * 1.2]], points: [{ x: ROOM.window[0], y: ROOM.window[1], r: 1300, col: '#FFE6C0', k: 0.5 }] };
  } };

const LT2 = { id: 'LT2_hallway', t0: 1, t1: 2, motion: 'still',
  layers: [['HALL', {}], ['DOORS', {}], ['PROPS', {}], ['YOU', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    on(L, 'HALL') && hall.draw(L.HALL.x, { t, lamps });
    const fd = hall.proj(0, 1, 1);
    on(L, 'DOORS') && drawChainedDoors(L.DOORS.x, { cx: fd[0], cy: fd[1], s: 0.33, t, push: 0.7 });
    on(L, 'PROPS') && drawWheelchair(L.PROPS.x, { cx: 300, cy: 1620, s: 1.1, rot: -0.35 });
    const yp = { x: 560, y: 1560, s: 1.6, turn: 2, pose: 'stand', expr: 'scared', t };
    const Y = drawHuman(null, YOU, yp);
    on(L, 'YOU') && drawHuman(L.YOU.x, YOU, yp);
    on(L, 'GLOW') && hall.glows(L.GLOW.x, { lamps, t });
    return { sun: [540, 200], hz: HALL.vp[1], faces: [] };
  } };

const LT3 = { id: 'LT3_chained_doors', t0: 2, t1: 3, motion: 'still',
  layers: [['HALL', { dof: 3 }], ['DOORS', {}], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    on(L, 'HALL', camMatrix({ zoom: 3.2, cx: 540, cy: 1020 })) && hall.draw(L.HALL.x, { t, lamps });
    on(L, 'DOORS') && drawChainedDoors(L.DOORS.x, { cx: 540, cy: 1560, s: 1.55, t, push: 1 });
    on(L, 'GLOW') && glow(L.GLOW.x, 540, 300, 500, 0.25, '220,255,230', 0.2);
    return { sun: [540, 100], hz: 900, clues: [] };
  } };

const LT4 = { id: 'LT4_scout_doorway', t0: 3, t1: 4, motion: 'still',
  layers: [['HALL', {}], ['SCOUT', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const M = camMatrix({ zoom: 3.3, cx: 805, cy: 1330, dx: -270, dy: -200 });
    on(L, 'HALL', M) && hall.draw(L.HALL.x, { t, lamps });
    const sp = { x: 805, y: 1410, s: 0.5, turn: -0.55, headTurn: -0.2, pose: 'stand', expr: 'alert', talk: 1, earPerk: 1, wag: 0.4, t };
    const S = drawCritter(null, SCOUT, sp);
    if (on(L, 'SCOUT', M)) { contactShadow(L.SCOUT.x, sp.x, sp.y, 70, 12); drawCritter(L.SCOUT.x, SCOUT, sp); }
    on(L, 'GLOW', M) && hall.glows(L.GLOW.x, { lamps, t });
    const h = camPt(M, S.head[0], S.head[1]);
    return { sun: camPt(M, 540, 200), hz: 0, faces: [[h[0], h[1], S.head[2] * 3.3 * 1.2]] };
  } };

// the same street as the episode (3D vehicles, grounded): the police car on the left curb, the bus, a burning wreck
const CARS5 = [{ X: 140, Z: 3700, yaw: 68, kind: 'sedan', col: '#4A6A8A', fire: 1 }, { X: 260, Z: 2300, yaw: 172, kind: 'bus' },
  { X: -320, Z: 1400, yaw: -10, kind: 'sedan', col: '#7A3A2E' }, { X: -300, Z: 640, yaw: -28, kind: 'police', lights: 1 }];
const LT5 = { id: 'LT5_main_street', t0: 4, t1: 5, motion: 'still',
  layers: [['SKY', { dof: 1.5 }], ['TOWN', { haze: 0.5, hazeW: 260 }], ['CARS', {}], ['CAST', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    on(L, 'SKY') && street.sky(L.SKY.x, { t });
    on(L, 'TOWN') && street.town(L.TOWN.x, { t });
    if (on(L, 'CARS')) for (const v of [...CARS5].sort((p, q) => q.Z - p.Z)) street.vehicle(L.CARS.x, v, t);
    const w = street.place(40, 1900), y = street.place(-30, 270), sc = street.place(110, 290);
    const yp = { ...y, turn: 0.25, pose: 'stand', expr: 'worried', t }, sp = { ...sc, s: sc.s * 1.05, turn: -0.3, pose: 'stand', expr: 'alert', earPerk: 1, t };
    const Y = drawHuman(null, YOU, yp), S = drawCritter(null, SCOUT, sp);
    if (on(L, 'CAST')) { drawHuman(L.CAST.x, W_SUIT, { ...w, turn: 0.6, pose: 'shamble', expr: 'undead', t }); contactShadow(L.CAST.x, y.x, y.y, 90, 16); drawHuman(L.CAST.x, YOU, yp); drawCritter(L.CAST.x, SCOUT, sp); }
    on(L, 'GLOW') && (glow(L.GLOW.x, 120, 520, 600, 0.35, '255,220,170', 0.15), street.vehicleGlows(L.GLOW.x, CARS5, t), street.air(L.GLOW.x, t));
    return { sun: [120, 520], hz: 960, faces: [[Y.head[0], Y.head[1], Y.head[2] * 1.2], [S.head[0], S.head[1], S.head[2] * 1.2]] };
  } };

const LT6 = { id: 'LT6_they_turn', t0: 5, t1: 6, motion: 'still',
  layers: [['SKY', { dof: 1.5 }], ['TOWN', { haze: 0.5, hazeW: 260 }], ['WALKERS', { subject: true }], ['YOU', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    on(L, 'SKY') && street.sky(L.SKY.x, { t });
    on(L, 'TOWN') && street.town(L.TOWN.x, { t });
    const ws = [[W_FARMER, -170, 700, -0.1], [W_NURSE, 70, 560, 0.15], [W_JOGGER, 230, 820, -0.25], [W_SUIT, -40, 1100, 0.2], [W_NURSE, 260, 1400, -0.2], [W_FARMER, -250, 1600, 0.3],
      [W_SUIT, 120, 1900, 0.1], [W_JOGGER, -120, 2300, -0.1], [W_FARMER, 260, 2600, 0.2], [W_NURSE, -260, 3000, 0], [W_SUIT, 40, 3300, 0.1]];
    if (on(L, 'WALKERS')) for (const [m, X, Z, tu] of ws.slice().sort((a, b) => b[2] - a[2])) { const p = street.place(X, Z); drawHuman(L.WALKERS.x, m, { ...p, turn: tu, pose: 'shamble', phase: X * 0.01, expr: 'hungry', t }); }
    const y = street.place(-260, 230);
    on(L, 'YOU') && drawHuman(L.YOU.x, YOU, { ...y, turn: 1.75, headTurn: 0.2, pose: 'stand', expr: 'scared', t });
    on(L, 'GLOW') && (glow(L.GLOW.x, 120, 520, 600, 0.35, '255,220,170', 0.15), street.air(L.GLOW.x, t));
    const fw = street.place(60, 640), fh = drawHuman(null, W_NURSE, { ...fw, turn: 0.15, pose: 'shamble', expr: 'hungry', t });
    return { sun: [120, 520], hz: 960, faces: [[fh.head[0], fh.head[1], fh.head[2]]] };
  } };

export const SHOTS = [LT1, LT2, LT3, LT4, LT5, LT6];
export const STILLS = [15, 45, 75, 105, 135, 165];
