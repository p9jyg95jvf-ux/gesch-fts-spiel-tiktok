// Day 23 ep 1 "You Slept Through It", SEGMENT B (frames 460-1127): the dog, the way out, Main Street, they turn, the vote.
import { camMatrix, applyCam, camPt, push, punch, shake, drift, contactShadow, glow, take, drawHuman, drawCritter, clamp, lerp, seg, io, h01 } from '../../engine.mjs';
import { YOU, SCOUT, W_NURSE, W_FARMER, W_JOGGER, W_SUIT } from '../../kit/cast.mjs';
import { hall, street } from '../../kit/sets.mjs';

const T = (f) => f / 30;
const on = (L, n, M) => { if (!L[n].on) return false; applyCam(L[n].x, M); return true; };
const hallLamps = (t) => (i) => (i === 2 || i === 5 ? 0 : i === 4 ? (h01(Math.floor(t * 15), 7) > 0.5 ? 1 : 0.15) : 1);
const SUN = [120, 520];
const SC = 805, SCY = 1410;                                              // the stairwell doorway's foot (set space)

// ---------------------------------------------------------------- B01 (460-509) L05 "Then a dog barks."
// In the side doorway: a scruffy shepherd dog with a red bandana. It barks on "dog" (f472) and "barks" (f481).
const barkAt = (t, fs) => Math.max(0, ...fs.map((f) => { const u = (t - T(f)) / 0.16; return u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0; }));
const scoutB01 = take({ x: SC, y: SCY, s: 0.5, turn: -0.55, headTurn: -0.2, pose: 'stand', expr: 'alert', earPerk: 1, wag: 0.5 }, [], { seed: 5 });
const B01 = { id: 'B01', t0: T(460), t1: T(510), motion: 'medium',
  layers: [['HALL', { shutter: 90 }], ['SCOUT', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 4 }), M = camMatrix({ zoom: 3.3 * push(t, T(460), T(510), 0.05), cx: 805, cy: 1330, dx: -270 + dx, dy: -200 + dy, rot: dr });
    on(L, 'HALL', M) && hall.draw(L.HALL.x, { t, lamps: hallLamps(t) });
    const b = barkAt(t, [472, 481]), P0 = { ...scoutB01(t), talk: b, nod: -0.25 * b, bob: -3 * b }, S = drawCritter(null, SCOUT, P0);
    if (on(L, 'SCOUT', M)) { contactShadow(L.SCOUT.x, P0.x, P0.y, 70, 12); drawCritter(L.SCOUT.x, SCOUT, P0); }
    on(L, 'GLOW', M) && hall.glows(L.GLOW.x, { lamps: hallLamps(t), t });
    const h = camPt(M, S.head[0], S.head[1]);
    return { sun: camPt(M, 540, 200), hz: 0, faces: [[h[0], h[1], S.head[2] * 3.3 * 1.2]] };
  } };

// ---------------------------------------------------------------- B02 (510-571) L06 "It knows the way out."
// It turns and trots into the dark stairwell (gone into the black by f548); you run after it from the left (from behind).
const scoutB02 = take({ x: SC, y: SCY, s: 0.62, turn: -0.55, pose: 'stand', expr: 'alert', earPerk: 1, wag: 0.6 },
  [{ t: T(512), turn: 0.7, headTurn: -0.6, dur: 0.25 }, { t: T(522), pose: 'trot', turn: 1.2, x: SC + 75, y: SCY - 62, s: 0.44, dur: 1.0, ease: 'in' }], { seed: 6, cadence: 2.2 });
const youB02 = take({ x: 240, y: 2200, s: 2.2, turn: 1.6, pose: 'run', expr: 'determined' },
  [{ t: T(536), x: 690, y: 1640, s: 1.2, dur: 1.2, ease: 'linear' }], { seed: 7 });
const B02 = { id: 'B02', t0: T(510), t1: T(572), motion: 'fast',
  layers: [['HALL', { shutter: 90 }], ['SCOUT', { subject: true }], ['YOU', { subject: true, shutter: 150 }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 5 }), M = camMatrix({ zoom: 2.2, cx: 790, cy: 1320, dx: -170 + dx, dy: -160 + dy, rot: dr });
    on(L, 'HALL', M) && hall.draw(L.HALL.x, { t, lamps: hallLamps(t) });
    const P0 = scoutB02(t), fade = clamp(1 - seg(t, T(530), T(550)));
    if (fade > 0 && on(L, 'SCOUT', M)) {                                  // it walks into the dark: the dark covers it
      const x = L.SCOUT.x; contactShadow(x, P0.x, P0.y, 70 * P0.s / 0.5, 12 * P0.s / 0.5, 0.4 * fade); drawCritter(x, SCOUT, P0);
      x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 1 - fade; x.fillStyle = '#0E1114'; x.fillRect(-1e4, -1e4, 2e4, 2e4); x.restore();
    }
    const Y0 = youB02(t);
    t > T(535) && on(L, 'YOU', M) && drawHuman(L.YOU.x, YOU, Y0);
    on(L, 'GLOW', M) && hall.glows(L.GLOW.x, { lamps: hallLamps(t), t });
    const S = drawCritter(null, SCOUT, P0), h = camPt(M, S.head[0], S.head[1]);
    return { sun: camPt(M, 540, 200), hz: 0, faces: fade > 0.3 ? [[h[0], h[1], S.head[2] * 2.2 * 1.2]] : [] };
  } };

// ---------------------------------------------------------------- B03 (572-659) L07 "Outside, the whole town is empty."
// Main Street, morning. You and the dog walk out into the middle of it (from behind). Cars left where they stopped, a
// police car, a school bus. Nobody. Wind.
const youB03 = take({ ...street.place(-60, 230), turn: 1.9, headTurn: 0.25, pose: 'walk', expr: 'worried' },
  [{ t: T(572), ...street.place(-35, 375), dur: 1.75, ease: 'linear' }, { t: T(624), pose: 'stand', headTurn: -0.35, dur: 0.4 }], { seed: 8, cadence: 1.35 });
const scoutB03 = take({ ...street.place(90, 250, 0.95), turn: 1.7, pose: 'trot', expr: 'alert', earPerk: 1, wag: 0.3 },
  [{ t: T(572), ...street.place(75, 400, 0.95), dur: 1.6, ease: 'linear' }, { t: T(620), pose: 'stand', turn: 1.95, headTurn: -0.4, dur: 0.3 }], { seed: 9, cadence: 2.2 });
// the abandoned vehicles (3D, in the street's perspective): the police car crashed on the left curb, its light bar
// still flashing (the battery is alive: "maybe the keys are in it"); the school bus stopped in the right lane, door side
// toward us; a car parked on the left; a wreck still burning far up the street.
const TRAFFIC = [{ X: 140, Z: 3700, yaw: 68, kind: 'sedan', col: '#4A6A8A', fire: 1 }, { X: 260, Z: 2300, yaw: 172, kind: 'bus' },
  { X: -320, Z: 1400, yaw: -10, kind: 'sedan', col: '#7A3A2E' }, { X: -300, Z: 640, yaw: -28, kind: 'police', lights: 1 }];
const FOOT = TRAFFIC.map((v) => street.vehicle(null, v).foot);
function streetLayers(L, cam, t, opts = {}) {
  const M = camMatrix(cam);
  on(L, 'SKY', camMatrix(cam, 0.6)) && street.sky(L.SKY.x, { t });
  on(L, 'TOWN', M) && street.town(L.TOWN.x, { t });
  if (L.CARS && on(L, 'CARS', M)) for (const v of [...TRAFFIC].sort((a, b) => b.Z - a.Z)) street.vehicle(L.CARS.x, v, t);
  return M;
}
// ---- people and vehicles in ONE correct depth order. A person is in front of a vehicle when some side of its footprint
// has both the person and the camera outside it; people sort far to near. Only things that overlap on screen are
// ordered against each other (a topological sort), so nobody is ever drawn through a car.
function frontOf(X, Z, foot) {
  const cx = foot.reduce((a, p) => a + p[0], 0) / 4, cz = foot.reduce((a, p) => a + p[1], 0) / 4;
  for (let i = 0; i < 4; i++) {
    const a = foot[i], b = foot[(i + 1) % 4]; let nx = b[1] - a[1], nz = -(b[0] - a[0]);
    if (nx * (cx - a[0]) + nz * (cz - a[1]) > 0) { nx = -nx; nz = -nz; }
    if (nx * (X - a[0]) + nz * (Z - a[1]) > 0 && nx * (0 - a[0]) + nz * (0 - a[1]) > 0) return true;
  }
  return false;
}
function vehBox(foot, hgt) {
  const pts = foot.flatMap(([X, Z]) => [street.proj(X, 0, Z), street.proj(X, -hgt, Z)]);
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}
const overlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
function depthDraw(x, people, t = 0, withTraffic = true) {
  const items = people.map((p) => { const q = street.place(p.X, p.Z); return { ...p, kind: 'p', box: [q.x - 90 * q.s, q.y - 320 * q.s, q.x + 90 * q.s, q.y + 10] }; });
  if (withTraffic) TRAFFIC.forEach((v, i) => items.push({ kind: 'v', Z: v.Z, foot: FOOT[i], box: vehBox(FOOT[i], v.kind === 'bus' ? 300 : 150), draw: (g) => street.vehicle(g, v, t) }));
  const n = items.length, after = items.map(() => []), indeg = items.map(() => 0);
  const edge = (a, b) => { after[a].push(b); indeg[b]++; };                       // a is drawn before b
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const A = items[i], B = items[j]; if (!overlap(A.box, B.box)) continue;
    if (A.kind === B.kind) A.Z > B.Z ? edge(i, j) : edge(j, i);
    else { const [P_, V, pi, vi] = A.kind === 'p' ? [A, B, i, j] : [B, A, j, i]; frontOf(P_.X, P_.Z, V.foot) ? edge(vi, pi) : edge(pi, vi); }
  }
  const done = items.map(() => false);
  for (let k = 0; k < n; k++) {
    let best = -1;
    for (let i = 0; i < n; i++) if (!done[i] && indeg[i] === 0 && (best < 0 || items[i].Z > items[best].Z)) best = i;
    if (best < 0) for (let i = 0; i < n; i++) if (!done[i] && (best < 0 || items[i].Z > items[best].Z)) best = i;   // a cycle: farthest first
    done[best] = true; items[best].draw(x); for (const j of after[best]) indeg[j]--;
  }
}
// a walker's lane: its straight path (X fixed, z from zHi down to zLo) never enters a vehicle's footprint (+ a margin);
// a lane that would is moved, once, to the nearer clear side (never off the sidewalks)
function clearLane(X, zLo, zHi, m = 55) {
  for (let pass = 0; pass < 3; pass++) for (const foot of FOOT) {
    let lo = Infinity, hi = -Infinity;
    for (let z = zLo - m; z <= zHi + m; z += 25) for (let i = 0; i < 4; i++) {
      const a = foot[i], b = foot[(i + 1) % 4]; if ((a[1] - z) * (b[1] - z) > 0 || a[1] === b[1]) continue;
      const xx = a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]); lo = Math.min(lo, xx); hi = Math.max(hi, xx);
    }
    if (lo < X + m && X - m < hi) { const c = [lo - m, hi + m].filter((v) => Math.abs(v) < 430); if (c.length) X = c.reduce((p, q) => (Math.abs(q - X) < Math.abs(p - X) ? q : p)); }
  }
  return X;
}
const B03 = { id: 'B03', t0: T(572), t1: T(660), motion: 'medium',
  layers: [['SKY', { dof: 1.5 }], ['TOWN', { haze: 0.5, hazeW: 260 }], ['CARS', {}], ['CAST', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 4 }), cam = { zoom: push(t, T(572), T(660), 0.05), cx: 540, cy: 1100, dx, dy, rot: dr };
    const M = streetLayers(L, cam, t);
    const Y0 = youB03(t), S0 = scoutB03(t);
    if (on(L, 'CAST', M)) { contactShadow(L.CAST.x, S0.x, S0.y, 70, 12); drawCritter(L.CAST.x, SCOUT, S0); contactShadow(L.CAST.x, Y0.x, Y0.y, 80, 14); drawHuman(L.CAST.x, YOU, Y0); }
    on(L, 'GLOW', M) && (glow(L.GLOW.x, ...SUN, 600, 0.35, '255,220,170', 0.15), street.vehicleGlows(L.GLOW.x, TRAFFIC, t), street.air(L.GLOW.x, t));
    const Y = drawHuman(null, YOU, Y0), h = camPt(M, Y.head[0], Y.head[1]);
    return { sun: SUN, hz: camPt(M, 0, 960)[1], faces: [[h[0], h[1], Y.head[2] * 1.1]], light: { rim: 1.2 } };
  } };

// ---------------------------------------------------------------- B04 (660-691) L08 "Almost."
// A punch toward the far end of the street: one figure standing in the road, its back to us, swaying.
const FARX = -40, FAR = street.place(FARX, 1700);
const B04 = { id: 'B04', t0: T(660), t1: T(692), motion: 'medium',
  layers: [['SKY', { dof: 2 }], ['TOWN', { haze: 0.45, hazeW: 260 }], ['CROWD', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 3 }), z = 3.7 * push(t, T(660), T(692), 0.06) * punch(t, T(662), 1.12), cy0 = FAR.y - 120 * FAR.s;
    const cam = { zoom: z, cx: FAR.x, cy: cy0, dx: 540 - FAR.x + dx, dy: 900 - cy0 + dy, rot: dr };
    const M = streetLayers(L, cam, t);
    on(L, 'CROWD', M) && depthDraw(L.CROWD.x, [{ X: FARX, Z: 1700, draw: (x) => { contactShadow(x, FAR.x, FAR.y, 80 * FAR.s, 14 * FAR.s, 0.35); drawHuman(x, W_SUIT, { ...FAR, turn: 2, tilt: 0.25 + 0.08 * Math.sin(t * 2), pose: 'stand', expr: 'undead', t }); } }], t);
    on(L, 'GLOW', M) && (glow(L.GLOW.x, ...SUN, 600, 0.35, '255,220,170', 0.15), street.vehicleGlows(L.GLOW.x, TRAFFIC, t), street.air(L.GLOW.x, t));
    return { sun: SUN, hz: camPt(M, 0, 960)[1], light: { rim: 1.4 } };
  } };

// ---------------------------------------------------------------- B05 (692-759) card RULE #1 + L09 "One turns."
// Close on it: grey neck, torn collar. On "turns" (f727) it turns all the way round to face you: dead eyes, open jaw.
const walkerB05 = take({ x: 560, y: 1560, s: 2.6, turn: 2, tilt: 0.2, pose: 'stand', expr: 'undead' },
  [{ t: T(731), turn: 0.15, headTurn: 0.05, tilt: -0.05, dur: 0.5, ease: 'io' }, { t: T(748), expr: 'hungry', nod: -0.1, dur: 0.15 }], { seed: 11, blink: false });
const B05 = { id: 'B05', t0: T(692), t1: T(760), motion: 'medium',
  layers: [['SKY', { dof: 4 }], ['TOWN', { dof: 3.5, haze: 0.4 }], ['CARS', { dof: 3 }], ['WALKER', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 4 }), cam = { zoom: 1.5 * push(t, T(692), T(760), 0.04), cx: 540, cy: 1000, dx, dy: dy + 120, rot: dr };
    streetLayers(L, cam, t);
    const P0 = walkerB05(t), Wk = drawHuman(null, W_SUIT, P0);
    on(L, 'WALKER', camMatrix({ dx: dx * 0.5, dy: dy * 0.5 })) && drawHuman(L.WALKER.x, W_SUIT, P0);
    on(L, 'GLOW', camMatrix(cam)) && (glow(L.GLOW.x, ...SUN, 600, 0.4, '255,220,170', 0.15), street.vehicleGlows(L.GLOW.x, TRAFFIC, t, { fire: false }), street.air(L.GLOW.x, t));
    return { sun: SUN, hz: 900, faces: [[Wk.head[0], Wk.head[1], Wk.head[2] * 1.15]], light: { rim: 1.5 } };
  } };

// ---------------------------------------------------------------- B06 (760-816) L09 "Then all of them."
// The whole street, over your shoulders: one by one the dead turn toward you (staggered), then start to shamble. A low
// boom on "them" (f776).
const CROWD = [[W_FARMER, -170, 700], [W_NURSE, 70, 560], [W_JOGGER, 230, 820], [W_SUIT, -40, 1100], [W_NURSE, 260, 1400], [W_FARMER, -250, 1600],
  [W_SUIT, 120, 1900], [W_JOGGER, -120, 2300], [W_FARMER, 260, 2600], [W_NURSE, -260, 3000], [W_SUIT, 40, 3300], [W_JOGGER, 180, 3700],
  // ...and the rest of the town, deeper down the street: "all of them"
  [W_JOGGER, -60, 950], [W_SUIT, 170, 1250], [W_FARMER, -20, 1500], [W_NURSE, 120, 1750], [W_SUIT, -200, 2050], [W_JOGGER, 210, 2150],
  [W_FARMER, -90, 2700], [W_NURSE, 60, 2900], [W_JOGGER, -200, 3500], [W_SUIT, 230, 4000], [W_FARMER, -60, 4300], [W_NURSE, 120, 4700]];
// a shambling step covers ~16 world units; at 1.1 cycles/s (2 steps) that is ~35 units/s: feet never slide
const SHAMBLE_SPEED = 35, SHAMBLE_CAD = 1.1;
function crowd(L, M, t, { t0 = 0, dur = 6, turnAt = null, speed = 0, zOff = 0, zMin = 260, approach = false } = {}) {
  const items = CROWD.map(([m, X0, Z], i) => {
    const ta = turnAt !== null ? turnAt + 0.07 * i : -1, go = ta < 0 ? t0 : ta + 0.3, sp = speed * (0.9 + 0.2 * h01(i, 51)), z0 = Z + zOff;
    // approach: they start at full shambling speed and slow as they close in on zMin (never reach it, never stop dead)
    const zAt = (tt) => { const u = Math.max(0, tt - go); return approach ? (z0 <= zMin ? z0 : zMin + (z0 - zMin) * Math.exp(-sp * u / (z0 - zMin))) : Math.max(zMin, z0 - sp * u); };
    const X = clearLane(X0, zAt(t0 + dur), zAt(t0));
    const z = zAt(t), p = street.place(X, z), moving = speed > 0 && zAt(t) < zAt(t - 0.1) - 0.5;
    const turned = ta < 0 ? 1 : clamp((t - ta) / 0.4), tu = lerp(2 - 0.3 * (i % 3), 0.1 * Math.sign(-X || 1), io(turned));
    const walking = moving && turned > 0.6 && t > go;
    // the step cycle follows the distance actually covered, so feet never slide even as they slow down
    const phase = (z0 - z) / SHAMBLE_SPEED * SHAMBLE_CAD + i * 0.37;
    return { X, Z: z, draw: (x) => { contactShadow(x, p.x, p.y, 80 * p.s, 14 * p.s, 0.35); drawHuman(x, m, { ...p, turn: tu, pose: walking ? 'shamble' : 'stand', phase, expr: turned > 0.5 ? 'hungry' : 'undead', tilt: 0.15 * Math.sin(i) + (walking ? 0 : 0.05 * Math.sin(t * 1.3 + i)), t }); } };
  });
  depthDraw(L.CROWD.x, items, t);
}
// You and the dog stand in the street with your backs to us (the spot where you turn round to face them in the vote):
// the camera looks over your shoulders as the whole street turns. On "them" you flinch back; the dog drops its ears.
// one crowd walk for B06 and the vote, so every walker is in the same place on both sides of the cut: they turn from
// f758, start to shamble, and close in slowly (slowing as they near), never nearer than 660 (well behind you at 520)
const CROWD_WALK = { t0: T(760), dur: 13, turnAt: T(758), speed: SHAMBLE_SPEED, zOff: 450, zMin: 660, approach: true };
const youB06 = take({ ...street.place(-125, 520), turn: 1.85, headTurn: -0.2, pose: 'stand', expr: 'scared', armL: 'down', armR: 'down' },
  [{ t: T(762), headTurn: 0.05, dur: 0.3 }, { t: T(776), lean: -0.12, nod: -0.1, armL: 'out', armR: 'out', dur: 0.25 }], { seed: 14 });
const scoutB06 = take({ ...street.place(125, 540, 0.95), turn: 1.75, pose: 'stand', expr: 'alert', earPerk: 1 },
  [{ t: T(770), expr: 'angry', earPerk: -0.5, nod: 0.15, dur: 0.3 }], { seed: 15 });
const B06 = { id: 'B06', t0: T(760), t1: T(817), motion: 'medium',
  layers: [['SKY', { dof: 1.5 }], ['TOWN', { haze: 0.5, hazeW: 260 }], ['CROWD', { subject: true }], ['CAST', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [sx, sy, sr] = shake(t, T(776), { amp: 7 }), [dx, dy, dr] = drift(t, { amp: 3 }), cam = { zoom: 1.9 * push(t, T(760), T(817), 0.06), cx: 540, cy: 1035, dx: dx + sx, dy: dy + sy - 40, rot: dr + sr };
    const M = streetLayers(L, cam, t);
    on(L, 'CROWD', M) && crowd(L, M, t, CROWD_WALK);
    const Y0 = youB06(t), S0 = scoutB06(t);
    if (on(L, 'CAST', M)) { contactShadow(L.CAST.x, S0.x, S0.y, 60, 10); drawCritter(L.CAST.x, SCOUT, S0); contactShadow(L.CAST.x, Y0.x, Y0.y, 70, 12); drawHuman(L.CAST.x, YOU, Y0); }
    on(L, 'GLOW', M) && (glow(L.GLOW.x, ...SUN, 600, 0.35, '255,220,170', 0.15), street.vehicleGlows(L.GLOW.x, TRAFFIC, t), street.air(L.GLOW.x, t));
    const Y = drawHuman(null, YOU, Y0), ya = camPt(M, Y.box[0], Y.box[1]), yb = camPt(M, Y.box[2], Y.box[3]);
    return { sun: SUN, hz: camPt(M, 0, 960)[1], clues: [[ya[0], ya[1], yb[0] - ya[0], yb[1] - ya[1]]] };
  } };

// ---------------------------------------------------------------- B07 (817-1127) L10 the VOTE + L11 + end card, ONE shot
// You and the dog in the middle of the street, facing us; behind you, the dead are coming, closing in slowly. You look
// at each option as it's said: the police car (left, f820), the bus (right, f865), back at us: the hospital (f903). On
// "Comment one" (f955) you glance back over your shoulder at them; at f985 you turn to face them and the dog turns with
// you, ears back. The end card lands over the two of you, backs to us, facing the dead. No cut: nobody vanishes.
// Faces stay in the upper band (y 400-760): the vote stack fills y 800-1440.
const youVote = take({ ...street.place(-125, 520), turn: 0.15, pose: 'stand', expr: 'scared', armL: 'down', armR: 'down' },
  [{ t: T(820), headTurn: -0.55, look: [-0.6, 0], dur: 0.25 }, { t: T(865), headTurn: 0.55, look: [0.6, 0], dur: 0.25 }, { t: T(903), headTurn: 0, look: [0, 0], expr: 'determined', dur: 0.25 },
   { t: T(955), headTurn: 0.85, look: [0.7, 0], nod: -0.05, expr: 'scared', dur: 0.4 },
   { t: T(985), turn: 1.88, headTurn: 0.1, look: [0, 0], nod: 0, expr: 'determined', dur: 0.85, ease: 'io' }], { seed: 12 });
const scoutVote = take({ ...street.place(125, 540, 0.95), turn: -0.4, headTurn: 0.6, pose: 'stand', expr: 'alert', earPerk: 1 },
  [{ t: T(840), headTurn: 1.0, expr: 'angry', earPerk: -0.3, dur: 0.3 },
   { t: T(992), turn: 1.75, headTurn: 0, expr: 'angry', earPerk: -0.5, dur: 0.7, ease: 'io' }], { seed: 13 });
function voteShot(id, f0, f1, { dy0, zoom0, zOff }) {
  return { id, t0: T(f0), t1: T(f1), motion: 'medium',
    layers: [['SKY', { dof: 1.5 }], ['TOWN', { haze: 0.5, hazeW: 260 }], ['CROWD', { subject: true }], ['CAST', { subject: true }], ['GLOW', { blend: 'add' }]],
    draw(L, t) {
      const [dx, dy, dr] = drift(t, { amp: 3 }), cam = { zoom: zoom0 * push(t, T(f0), T(f1), 0.07), cx: 540, cy: 1000, dx, dy: dy + dy0, rot: dr };
      const M = streetLayers(L, cam, t);
      on(L, 'CROWD', M) && crowd(L, M, t, CROWD_WALK);
      const Y0 = youVote(t), S0 = scoutVote(t);
      if (on(L, 'CAST', M)) { contactShadow(L.CAST.x, S0.x, S0.y, 60, 10); drawCritter(L.CAST.x, SCOUT, S0); contactShadow(L.CAST.x, Y0.x, Y0.y, 70, 12); drawHuman(L.CAST.x, YOU, Y0); }
      on(L, 'GLOW', M) && (glow(L.GLOW.x, ...SUN, 600, 0.35, '255,220,170', 0.15), street.vehicleGlows(L.GLOW.x, TRAFFIC, t), street.air(L.GLOW.x, t));
      const Y = drawHuman(null, YOU, Y0), h = camPt(M, Y.head[0], Y.head[1]);
      return { sun: SUN, hz: camPt(M, 0, 960)[1], faces: Math.abs(Y0.turn) < 1.2 ? [[h[0], h[1], Y.head[2] * zoom0 * 1.2]] : [], light: { rim: 1.3 } };
    } };
}
const B07 = voteShot('B07', 817, 1128, { dy0: -380, zoom0: 1.15, zOff: 450 });

export const SHOTS = [B01, B02, B03, B04, B05, B06, B07];
export const CUES = { 'B01.bark1': T(472), 'B01.bark2': T(481), 'B02.turn': T(512), 'B02.run': T(536), 'B03.out': T(572), 'B04.almost': T(662),
  'B05.turn': T(731), 'B05.snarl': T(748), 'B06.turn': T(758), 'B06.boom': T(776), 'B07.vote': T(817), 'B07.glance': T(955), 'B07.face': T(985) };
