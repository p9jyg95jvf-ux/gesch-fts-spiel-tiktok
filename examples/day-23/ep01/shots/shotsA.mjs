// Day 23 ep 1 "You Slept Through It", SEGMENT A (frames 0-459): room 214 and the hallway.
// Times are episode seconds (frame / 30). Lines and word onsets: ../timeline_lock.json (BRIEF.md has the table).
import { camMatrix, applyCam, camPt, push, punch, shake, drift, contactShadow, glow, take, drawHuman, clamp, lerp, seg, io, h01 } from '../../engine.mjs';
import { YOU } from '../../kit/cast.mjs';
import { room, ROOM, hall, HALL, motes } from '../../kit/sets.mjs';
import { drawBed, drawIV, drawFlowers, drawDoor, drawWheelchair, drawChainedDoors, drawCalendar } from '../../kit/props.mjs';

const T = (f) => f / 30;
const on = (L, n, M) => { if (!L[n].on) return false; applyCam(L[n].x, M); return true; };
// the power is failing: the light dips in 2-frame steps (a pure function of time)
const flick = (t, seed = 3) => { const k = Math.floor(t * 15); return h01(k, seed) > 0.82 ? 0.55 : h01(k, seed + 1) > 0.9 ? 0.8 : 1; };
const hallLamps = (t) => (i) => (i === 2 || i === 5 ? 0 : i === 4 ? (h01(Math.floor(t * 15), 7) > 0.5 ? 1 : 0.15) : 1);
const [BX, BY] = ROOM.bed;
const youBed = { x: BX - 60, y: BY + 80, s: 1.35, turn: 0.45, pose: 'sit', seat: 60, armL: 'down', armR: 'down' };

// ---------------------------------------------------------------- A01 (0-91) L00 "You wake up. Something is at the door."
// FRAME 0 IS ACTION: the handle rattles, a dark shape behind the frosted glass; you jolt up in bed. On "Something" (f37)
// the shape presses to the glass; on "door" (f62) a heavy thump shakes the room.
const rattle = (t) => { const f = t * 30; return f < 12 ? 1 : f >= 37 && f < 50 ? 0.8 : f >= 60 && f < 78 ? 1 : 0.15; };
const youA01 = take({ ...youBed, lean: -0.95, nod: -0.25, expr: 'asleep' },
  [{ t: T(3), lean: 0, nod: 0, expr: 'surprised', dur: 0.3, ease: 'out' }, { t: T(12), headTurn: 0.5, look: [0.6, 0], dur: 0.3 }, { t: T(40), expr: 'scared', dur: 0.12 }, { t: T(63), lean: -0.12, dur: 0.15, ease: 'out' }], { seed: 2 });
const A01 = { id: 'A01', t0: 0, t1: T(92), motion: 'medium', grade: (t) => ({ exposure: flick(t) }),
  layers: [['ROOM', { shutter: 90 }], ['DOOR', {}], ['BED', {}], ['YOU', { subject: true }], ['BEDF', {}], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [s1x, s1y, s1r] = shake(t, T(62), { amp: 10 }), [s2x, s2y] = shake(t, T(37), { amp: 4 }), [dx, dy, dr] = drift(t, { amp: 3 });
    const M = camMatrix({ zoom: 1.12 * push(t, 0, T(92), 0.05), cx: 600, cy: 1250, dx: dx + s1x + s2x, dy: dy + s1y + s2y + 40, rot: dr + s1r });
    on(L, 'ROOM', M) && (room.back(L.ROOM.x, { t, flick: flick(t) }), drawIV(L.ROOM.x, { cx: 110, cy: 1520, t }), drawFlowers(L.ROOM.x, { cx: 700, cy: 1470 }));
    on(L, 'DOOR', M) && drawDoor(L.DOOR.x, { cx: 900, cy: 1440, t, shadow: lerp(0.55, 1, seg(t, T(30), T(40))), rattle: rattle(t) });
    on(L, 'BED', M) && drawBed(L.BED.x, { cx: BX, cy: BY + 20, layer: 'back' });
    const P0 = youA01(t), Y = drawHuman(null, YOU, P0);
    on(L, 'YOU', M) && drawHuman(L.YOU.x, YOU, P0);
    on(L, 'BEDF', M) && drawBed(L.BEDF.x, { cx: BX, cy: BY + 20, layer: 'front' });
    on(L, 'GLOW', M) && (room.slits(L.GLOW.x, { k: flick(t) }), room.glows(L.GLOW.x, { t, flick: flick(t) }));
    const h = camPt(M, Y.head[0], Y.head[1]), g = camPt(M, 900, 1440 - 520 * 0.7);
    return { sun: camPt(M, ...ROOM.window), hz: camPt(M, 0, ROOM.floor)[1], faces: [[h[0], h[1], Y.head[2] * 1.12 * 1.2]], clues: [[g[0] - 90, g[1] - 110, 180, 200]],
      points: [{ ...((p) => ({ x: p[0], y: p[1] }))(camPt(M, ...ROOM.window)), r: 1300, col: '#FFE6C0', k: 0.5 * flick(t) }] };
  } };

// ---------------------------------------------------------------- A02 (92-142) L01 "Twenty-three days."
// The calendar, close: every day crossed out, 23 circled in red. A slow push into the circle.
const A02 = { id: 'A02', t0: T(92), t1: T(143), motion: 'still', grade: (t) => ({ exposure: flick(t, 5) }),
  layers: [['ROOM', {}], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 3 }), u = io(seg(t, T(92), T(143))), z = lerp(2.2, 2.8, u);
    const c23 = drawCalendar(null, { cx: 520, cy: 820 }).c23, fx = lerp(520, c23[0], u), fy = lerp(820, c23[1], u);
    const M = camMatrix({ zoom: z, cx: fx, cy: fy, dx: 540 - fx + dx, dy: lerp(860, 1010, u) - fy + dy, rot: dr });
    on(L, 'ROOM', M) && room.back(L.ROOM.x, { t, flick: flick(t, 5) });
    on(L, 'GLOW', M) && (room.slits(L.GLOW.x, { k: 0.8 }), room.glows(L.GLOW.x, { t, flick: flick(t, 5), door: false }));
    const a = camPt(M, 520 - 115, 820 - 135), b = camPt(M, 520 + 115, 820 + 135);
    return { sun: camPt(M, ...ROOM.window), hz: 0, clues: [[a[0], a[1], b[0] - a[0], b[1] - a[1]]] };
  } };

// ---------------------------------------------------------------- A03 (143-204) L01 "That's how long you slept."
// You, close, staring at it; the wilted flowers soft in the foreground. Your hand goes to the bandage.
const youA03 = take({ ...youBed, headTurn: -0.15, nod: -0.15, look: [-0.4, -0.5], expr: 'worried' },
  [{ t: T(160), expr: 'sad', nod: 0.1, look: [-0.2, 0.2], dur: 0.5 }, { t: T(168), armL: 'chin', dur: 0.35 }], { seed: 3 });
const A03 = { id: 'A03', t0: T(143), t1: T(205), motion: 'medium', grade: (t) => ({ exposure: flick(t, 7) }),
  layers: [['ROOM', { dof: 3 }], ['BED', { dof: 1.5 }], ['YOU', { subject: true }], ['BEDF', {}], ['FLOWERS', { dof: 5, gain: 0.8 }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const head = drawHuman(null, YOU, youBed).head, [dx, dy, dr] = drift(t, { amp: 3 });
    const M = camMatrix({ zoom: 2.0 * push(t, T(143), T(205), 0.04), cx: head[0], cy: head[1], dx: 540 - head[0] + dx, dy: 820 - head[1] + dy, rot: dr });
    on(L, 'ROOM', M) && room.back(L.ROOM.x, { t, flick: flick(t, 7) });
    on(L, 'BED', M) && drawBed(L.BED.x, { cx: BX, cy: BY + 20, layer: 'back' });
    const P0 = youA03(t), Y = drawHuman(null, YOU, P0);
    on(L, 'YOU', M) && drawHuman(L.YOU.x, YOU, P0);
    on(L, 'BEDF', M) && drawBed(L.BEDF.x, { cx: BX, cy: BY + 20, layer: 'front' });
    on(L, 'FLOWERS', camMatrix({ zoom: 2.6, cx: 700, cy: 1300, dx: 120 + dx * 1.4, dy: 380 })) && drawFlowers(L.FLOWERS.x, { cx: 700, cy: 1470, s: 1.1 });
    on(L, 'GLOW', M) && (room.slits(L.GLOW.x, {}), room.glows(L.GLOW.x, { t, flick: flick(t, 7), door: false }));
    const h = camPt(M, Y.head[0], Y.head[1]);
    return { sun: camPt(M, ...ROOM.window), hz: 0, faces: [[h[0], h[1], Y.head[2] * 2.0 * 1.15]] };
  } };

// ---------------------------------------------------------------- A04 (205-375) L02 + L03, ONE shot (no cut: nobody vanishes)
// "And nobody came to wake you." You step out of your room into the hallway (from behind): empty, lights dying, papers,
// a tipped wheelchair, a dark drag mark, and far away at the end, the doors. You stop and look round. Then on "At the end
// of the hall" (f284) you walk on down the hall toward the doors and the camera follows behind you, closing in, so by
// "chained" (f338) the chain and the KEEP OUT are readable over your shoulder. The wheelchair slides out of frame as the
// camera passes it.
// Your walk is placed in the hallway's perspective: depth z = 1 / k (k = hall scale at the floor point), so your size
// and height follow the floor, and your steps cover ground at a walking pace (about 0.21 depth units a second).
const HK = (z) => 1 / z, hallAt = (xn, z) => { const k = HK(z); return { x: 540 + xn * 640 * k, y: HALL.vp[1] + 1150 * k, s: 2.64 * k }; };
const WALK_X = 0.168, Z_STOP = 1 / 0.652, Z_END = Z_STOP + 0.213 * (T(376) - T(284));
const youA04 = take({ x: 810, y: 1890, s: 2.3, turn: -1.75, pose: 'walk', expr: 'worried' },
  [{ t: T(205), ...hallAt(WALK_X, Z_STOP), turn: -1.9, dur: 1.75, ease: 'linear' }, { t: T(258), pose: 'stand', headTurn: 0.3, dur: 0.35 },
   { t: T(282), pose: 'walk', headTurn: 0, dur: 0.3 }], { seed: 4, cadence: 1.15 });
const youPose = (t) => {
  const P = youA04(t);
  if (t >= T(284)) { const z = Z_STOP + 0.213 * (t - T(284)); Object.assign(P, hallAt(WALK_X - 0.03 * (t - T(284)), z)); }
  return P;
};
const A04 = { id: 'A04', t0: T(205), t1: T(376), motion: 'medium',
  layers: [['HALL', { shutter: 90 }], ['DOORS', {}], ['PROPS', {}], ['YOU', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const u = io(seg(t, T(282), T(372))), walking = t >= T(284) ? 1 : 0, lamps = hallLamps(t);
    const bob = walking * Math.sin(t * 2 * Math.PI * 1.15 * 2) * 4 * (1 - u * 0.5), [dx, dy, dr] = drift(t, { amp: 3.5 });
    const zoom = lerp(1, 1.05, seg(t, T(205), T(282))) * lerp(1, 1.48, u);
    const M = camMatrix({ zoom, cx: 540, cy: lerp(950, 985, u), dx, dy: dy + bob, rot: dr });
    on(L, 'HALL', M) && hall.draw(L.HALL.x, { t, lamps });
    const fd = hall.proj(0, 1, 1);
    on(L, 'DOORS', M) && drawChainedDoors(L.DOORS.x, { cx: fd[0], cy: fd[1], s: 0.33, t, push: lerp(0.3, 0.55, u), eye: 0 });
    on(L, 'PROPS', M) && drawWheelchair(L.PROPS.x, { cx: 260, cy: 1560, s: 1.05, rot: -0.35, t });
    const P0 = youPose(t), Y = drawHuman(null, YOU, P0);
    if (on(L, 'YOU', M)) { contactShadow(L.YOU.x, P0.x, P0.y, 75 * P0.s, 13 * P0.s, 0.35); drawHuman(L.YOU.x, YOU, P0); }
    on(L, 'GLOW', M) && hall.glows(L.GLOW.x, { lamps, t });
    const h = camPt(M, Y.head[0], Y.head[1]), a = camPt(M, fd[0] - 90, fd[1] - 200), b = camPt(M, fd[0] + 90, fd[1]);
    const ya = camPt(M, Y.box[0], Y.box[1]), yb = camPt(M, Y.box[2], Y.box[3]);   // your whole body: captions keep off it
    return { sun: camPt(M, 540, 200), hz: 900, faces: [[h[0], h[1], Y.head[2] * zoom * 1.1]],
      clues: [[ya[0], ya[1], yb[0] - ya[0], yb[1] - ya[1]], ...(u > 0.5 ? [[a[0], a[1], b[0] - a[0], b[1] - a[1]]] : [])] };
  } };

// ---------------------------------------------------------------- A06 (376-459) L04 "And something is pushing back."
// The doors, close: grey fingers curl through the gap; on "pushing" (f406) the doors bow and the chain jumps; on "back"
// (f419) an eye in the gap, looking at you.
const A06 = { id: 'A06', t0: T(376), t1: T(460), motion: 'medium',
  layers: [['HALL', { dof: 3 }], ['DOORS', { shutter: 120 }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [sx, sy, sr] = shake(t, T(406), { amp: 9 }), [dx, dy, dr] = drift(t, { amp: 3 });
    const z = push(t, T(376), T(460), 0.05) * punch(t, T(419), 1.06);
    const M = camMatrix({ zoom: z, cx: 540, cy: 1000, dx: dx + sx, dy: dy + sy, rot: dr + sr });
    on(L, 'HALL', camMatrix({ zoom: 3.2, cx: 540, cy: 1020 })) && hall.draw(L.HALL.x, { t, lamps: hallLamps(t) });
    const pushK = t < T(406) ? 0.45 : lerp(1, 0.75, seg(t, T(412), T(440)));
    on(L, 'DOORS', M) && drawChainedDoors(L.DOORS.x, { cx: 540, cy: 1560, s: 1.55, t, push: pushK, eye: seg(t, T(417), T(421)) });
    on(L, 'GLOW', M) && (glow(L.GLOW.x, 540, 300, 500, 0.25, '220,255,230', 0.2), glow(L.GLOW.x, 540, 1000, 260, 0.12 + 0.1 * clamp((t - T(400)) * 3) * (0.6 + 0.4 * Math.sin(t * 23)), '255,236,200', 0.08), motes(L.GLOW.x, t, { box: [200, 300, 880, 1500], n: 26, seed: 9, col: '220,255,236', a: 0.3, wind: 3 }));
    const a = camPt(M, 160, 620), b = camPt(M, 920, 1290);                // the whole upper door: KEEP OUT, the eye, the fingers
    return { sun: camPt(M, 540, 100), hz: 900, clues: [[a[0], a[1], b[0] - a[0], b[1] - a[1]]] };
  } };

export const SHOTS = [A01, A02, A03, A04, A06];
export const CUES = { 'A01.rattle': 0, 'A01.press': T(37), 'A01.thump': T(62), 'A01.jolt': T(3), 'A02.calendar': T(95), 'A03.hand': T(168),
  'A04.step': T(206), 'A05.walk': T(284), 'A06.push': T(406), 'A06.eye': T(419) };
