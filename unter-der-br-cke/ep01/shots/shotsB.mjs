// Unter der Brücke · Folge 1 „Gefeuert“, SEGMENT B (Frames 695-1838): das Feuer, Kemal, der Hund, der Tausch, der schwarze Wagen,
// Brandt, die Abstimmung. Zeiten in Sekunden (Frame / 30). Zeilen und Wort-Einsätze: ../timeline_lock.json.
import { camPt, push, punch, shake, drift, contactShadow, glow, take, drawHuman, drawCritter, clamp, lerp, seg, io, out } from '../../engine.mjs';
import { DU, ABFINDUNG, HERTHA, KEMAL, BRANDT } from '../../kit/cast.mjs';
import { bridge, BRIDGE, deck, DECK } from '../../kit/sets.mjs';
import { drawBox, drawBarrel, barrelGlow, drawBottleSack, drawCrateSeat, drawTeaCup, drawCactus, drawBlackCar, carGlow, drawEnvelope } from '../../kit/props.mjs';
import { T, on, fr, I, BR, duWithBox } from './common.mjs';

const BL = [['BACK', { dof: 2 }], ['MID', { haze: 0.2 }], ['GROUND', {}], ['PROPS', {}], ['CAST', { subject: true }], ['RAIN', { blend: 'screen', light: false }], ['GLOW', { blend: 'add' }]];
const hp0 = { ...BR.hertha, turn: 0.45, pose: 'sit', seat: 55, expr: 'neutral', armR: 'hold', armL: 'down' };
const kp0 = { ...BR.kemal, turn: -0.5, pose: 'stand', expr: 'sly', armR: 'hips', armL: 'down' };
const dp0 = { ...BR.du, turn: 0.55, pose: 'stand', expr: 'worried', armR: 'hold', armL: 'hold' };
const ap0 = { ...BR.dog, turn: 0.5, headTurn: -0.4, pose: 'stand', expr: 'happy', earPerk: 1, wag: 0.5 };
const sc = (D, M, z = 1, k = 1.2) => { const h = camPt(M, D.head[0], D.head[1]); return [h[0], h[1], D.head[2] * z * k]; };

/** Das Feuer-Set mit der Gruppe. P = { du, hertha, kemal, dog } (Posen, oder null = nicht im Bild), o = { sag, open, cactus, fire, extra(g) } */
function fire(L, t, M, P, o = {}) {
  const b = BR.barrel, fk = o.fire ?? 1, faces = [];
  on(L, 'BACK', M) && bridge.back(L.BACK.x, { t });
  on(L, 'MID', M) && bridge.mid(L.MID.x, { t });
  on(L, 'GROUND', M) && bridge.ground(L.GROUND.x, { t });
  if (on(L, 'PROPS', M)) { drawBottleSack(L.PROPS.x, BR.sack); drawCrateSeat(L.PROPS.x, BR.crate2); drawCrateSeat(L.PROPS.x, BR.crate); drawBarrel(L.PROPS.x, { ...b, t, fire: fk }); }
  const list = [];
  if (P.hertha) list.push(['h', P.hertha.y, drawHuman(null, HERTHA, P.hertha)]);
  if (P.kemal) list.push(['k', P.kemal.y, drawHuman(null, KEMAL, P.kemal)]);
  if (P.du) list.push(['d', P.du.y, drawHuman(null, DU, P.du)]);
  if (P.dog) list.push(['a', P.dog.y, drawCritter(null, ABFINDUNG, P.dog)]);
  const ctx = on(L, 'CAST', M) ? L.CAST.x : null;
  for (const [k, , pts] of list.sort((p, q) => p[1] - q[1])) {
    if (ctx) {
      if (k === 'h') drawHuman(ctx, HERTHA, P.hertha);
      if (k === 'k') { contactShadow(ctx, P.kemal.x, P.kemal.y, 100, 13, 0.4); drawHuman(ctx, KEMAL, P.kemal); }
      if (k === 'd') duWithBox(ctx, P.du, { sag: o.sag ?? 1, open: o.open ?? 0, cactus: o.cactus ?? 1 });
      if (k === 'a') { contactShadow(ctx, P.dog.x, P.dog.y, 110, 13, 0.4); drawCritter(ctx, ABFINDUNG, P.dog); }
    }
    faces.push(sc({ head: pts.head }, M, M.zoom ?? 1));
  }
  if (ctx && o.extra) o.extra(ctx);
  on(L, 'RAIN', I) && bridge.rain(L.RAIN.x, { t });
  if (on(L, 'GLOW', M)) { bridge.glows(L.GLOW.x, { t, k: fk }); barrelGlow(L.GLOW.x, { ...b, t, k: fk }); }
  return { sun: camPt(M, b.cx, b.cy - 300), hz: camPt(M, 0, BRIDGE.hz)[1], faces, points: [{ ...((p) => ({ x: p[0], y: p[1] }))(camPt(M, b.cx, b.cy - 260)), r: 1000, col: '#FFAA55', k: 0.9 * fk }] };
}
const shot = (id, f0, f1, motion, draw) => ({ id, t0: T(f0), t1: T(f1), motion, layers: BL, draw });
const Mz = (fx, fy, sx, sy, z, o) => { const M = fr(fx, fy, sx, sy, z, o); M.zoom = z; return M; };

// ------------------------------------------------------------ B01 (695-769) L08 „Am Feuer sitzen zwei Fremde.“
const hB01 = take({ ...hp0, expr: 'neutral' }, [{ t: T(705), expr: 'happy', dur: 0.4 }], { seed: 5 });
const kB01 = take({ ...kp0 }, [{ t: T(735), expr: 'sly', armR: 'hips', dur: 0.4 }], { seed: 6 });
const B01 = shot('B01', 695, 770, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 3 }), u = io(seg(t, T(695), T(770)));
  const M = Mz(lerp(470, 880, u), 1400, 540, 900, 1.25, { dx, dy, rot: dr });
  return fire(L, t, M, { hertha: hB01(t), kemal: kB01(t) });
});

// ------------------------------------------------------------ B02 (770-833) L09 „Hertha zeigt auf einen Platz.“
const hB02 = take({ ...hp0, turn: -0.2, expr: 'happy', armR: 'down' }, [{ t: T(780), turn: -0.45, armR: 'point', dur: 0.4 }, { t: T(805), expr: 'happy', dur: 0.3 }], { seed: 5 });
const B02 = shot('B02', 770, 834, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 3 }), H = hB02(t), M = Mz(400, 1380, 560, 880, 1.55 * push(t, T(770), T(834), 0.06), { dx, dy, rot: dr });
  return fire(L, t, M, { hertha: H });
});

// ------------------------------------------------------------ B03 (834-894) L09 „Hier tauscht man.“
const hB03 = take({ ...hp0, expr: 'happy', armR: 'hold' }, [{ t: T(850), expr: 'happy', dur: 0.3 }], { seed: 5 });
const kB03 = take({ ...kp0, x: 840, armR: 'out', armL: 'down' }, [{ t: T(850), armR: 'hold', expr: 'sly', dur: 0.4 }], { seed: 6 });
const B03 = shot('B03', 834, 895, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 3 }), M = Mz(660, 1380, 540, 900, 1.35 * push(t, T(834), T(895), 0.06), { dx, dy, rot: dr });
  return fire(L, t, M, { hertha: hB03(t), kemal: kB03(t), du: { ...dp0, x: 220 } });
});

// ------------------------------------------------------------ B04 (895-964) L10 „Kemal will deinen Karton.“
// Kemal tritt vor, greift nach dem Karton (f905-930); Du lehnst dich zurück und hältst fest.
const kB04 = take({ ...kp0, x: 880 }, [{ t: T(895), x: 600, pose: 'walk', expr: 'angry', dur: 0.6, ease: 'out' }, { t: T(922), pose: 'stand', armR: 'reach', dur: 0.2 }], { seed: 6, cadence: 1.6 });
const dB04 = take({ ...dp0 }, [{ t: T(920), lean: -0.28, expr: 'scared', dur: 0.2 }, { t: T(940), lean: -0.18, dur: 0.3 }], { seed: 1 });
const B04 = shot('B04', 895, 965, 'medium', (L, t) => {
  const [sx, sy, sr] = shake(t, T(924), { amp: 6 }), [dx, dy, dr] = drift(t, { amp: 3 }), M = Mz(520, 1380, 540, 880, 1.35, { dx: dx + sx, dy: dy + sy, rot: dr + sr });
  return fire(L, t, M, { hertha: { ...hp0, expr: 'worried' }, kemal: kB04(t), du: dB04(t), sag: 1 });
});

// ------------------------------------------------------------ B05 (965-1039) L11 „Der Hund stellt sich dazwischen.“
// Abfindung springt (f972-985) zwischen euch, knurrt, Ohren flach; Kemal weicht zurück, Hände hoch.
const aB05 = take({ ...ap0, x: 660, y: 1735, turn: -0.6, headTurn: 0, expr: 'determined', earPerk: 0, pose: 'stand' },
  [{ t: T(970), pose: 'jump', jump: 0.9, x: 520, dur: 0.22 }, { t: T(982), pose: 'stand', jump: 0, x: 450, y: 1735, expr: 'angry', earPerk: -1, tilt: 0, dur: 0.18 }], { seed: 3, talk: { words: [T(985), T(995), T(1005)], end: T(1020) } });
const kB05 = take({ ...kp0, x: 600, armR: 'reach' }, [{ t: T(980), x: 700, armR: 'up', armL: 'up', expr: 'surprised', pose: 'walk', dur: 0.5, ease: 'out' }, { t: T(1005), pose: 'stand', dur: 0.2 }], { seed: 6, cadence: 1.6 });
const B05 = shot('B05', 965, 1040, 'fast', (L, t) => {
  const [sx, sy, sr] = shake(t, T(982), { amp: 9 }), [dx, dy, dr] = drift(t, { amp: 3 }), M = Mz(540, 1400, 540, 900, 1.35 * punch(t, T(982), 1.04), { dx: dx + sx, dy: dy + sy, rot: dr + sr });
  return fire(L, t, M, { hertha: { ...hp0, expr: 'surprised' }, kemal: kB05(t), du: { ...dp0, lean: -0.15, expr: 'scared' }, dog: aB05(t) });
});

// ------------------------------------------------------------ B06 (1040-1088) L12 „Hertha reicht dir Tee.“
const hB06 = take({ ...hp0, turn: -0.3, expr: 'happy', armR: 'hold' }, [{ t: T(1050), armR: 'reach', dur: 0.4 }], { seed: 5 });
const dB06 = take({ ...dp0, x: 330, expr: 'surprised', armR: 'hold' }, [{ t: T(1062), expr: 'happy', armL: 'reach', dur: 0.4 }], { seed: 1 });
const B06 = shot('B06', 1040, 1089, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 3 }), M = Mz(400, 1380, 540, 880, 1.6 * push(t, T(1040), T(1089), 0.05), { dx, dy, rot: dr });
  const H = hB06(t), Hd = drawHuman(null, HERTHA, H), up = seg(t, T(1048), T(1068));
  return fire(L, t, M, { hertha: H, du: dB06(t), dog: { ...ap0, x: 430, y: 1750, expr: 'happy', wag: 1 }, extra: (g) => drawTeaCup(g, { cx: lerp(Hd.hands[0][0], 360, up), cy: lerp(Hd.hands[0][1] + 20, 1320, up), s: 1.3, t }) });
});

// ------------------------------------------------------------ B07 (1089-1185) L13 „Du gibst ihr den Kaktus. Tausch.“
// Der Kaktus wandert aus dem Karton in Herthas Hand (f1100-1130) und steht danach auf ihrer Kiste; Abfindung legt sich zu deinen Füßen.
const aB07 = take({ ...ap0, x: 420, y: 1750, pose: 'stand', expr: 'happy', turn: 0.4 }, [{ t: T(1140), expr: 'sleepy', wag: 0.2, dur: 0.8 }], { seed: 3 });
const hB07 = take({ ...hp0, turn: -0.3, expr: 'happy', armR: 'reach' }, [{ t: T(1130), armR: 'hold', expr: 'joy', dur: 0.4 }], { seed: 5 });
const B07 = shot('B07', 1089, 1186, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 3 }), M = Mz(590, 1400, 540, 900, 1.15 * push(t, T(1089), T(1186), 0.05), { dx, dy, rot: dr });
  const Pd = { ...dp0, x: 300, armR: 'hold', armL: 'hold' }, Dd = drawHuman(null, DU, Pd), Hd = drawHuman(null, HERTHA, hB07(t));
  const a = [Dd.hands[0][0] - 40, Dd.hands[0][1] + 30], c = [Hd.hands[0][0], Hd.hands[0][1] - 10], seat = [BR.crate.cx - 20, BR.crate.cy - 120 * 1.1 - 4];
  const u1 = io(seg(t, T(1100), T(1130))), u2 = io(seg(t, T(1135), T(1160)));
  const cp = t < T(1130) ? [lerp(a[0], c[0], u1), lerp(a[1], c[1], u1) - Math.sin(u1 * Math.PI) * 60] : [lerp(c[0], seat[0], u2), lerp(c[1], seat[1], u2)];
  return fire(L, t, M, { hertha: hB07(t), kemal: { ...kp0, expr: 'happy' }, du: { ...Pd, expr: 'happy' }, dog: aB07(t), cactus: t < T(1100) ? 1 : 0, extra: (g) => t >= T(1100) && drawCactus(g, { cx: cp[0], cy: cp[1] + 70, s: 0.8, t }) });
});

// ------------------------------------------------------------ Brücke von unten: der schwarze Wagen, Brandt
const DL = [['BACK', { dof: 1.5 }], ['MID', {}], ['CAR', {}], ['TOP', { subject: true }], ['RAIN', { blend: 'screen', light: false }], ['GLOW', { blend: 'add' }], ['FG', { gain: 0.5 }]];
/** Szene „oben auf der Brücke“, von unten gesehen. M = Kamera. o = { car: {cx, lights, bino}, brandt: Pose|null, env: {…}|null, group: true } */
function top(L, t, M, o = {}) {
  const faces = [];
  on(L, 'BACK', M) && deck.back(L.BACK.x, { t });
  on(L, 'MID', M) && deck.mid(L.MID.x, { t });
  const c = o.car || {};
  on(L, 'CAR', M) && drawBlackCar(L.CAR.x, { cx: c.cx ?? 760, cy: 1190 + (c.dy || 0), s: c.s ?? 1.35, t, lights: c.lights ?? 1, binoculars: c.bino ?? 0, scratch: 1 });
  if (on(L, 'TOP', M)) {
    if (o.brandt) { drawHuman(L.TOP.x, BRANDT, o.brandt); }
    if (o.env) drawEnvelope(L.TOP.x, o.env);
  }
  if (o.brandt) faces.push(sc({ head: drawHuman(null, BRANDT, o.brandt).head }, M, M.zoom ?? 1));
  on(L, 'RAIN', I) && bridge.rain(L.RAIN.x, { t, a: 0.18 });
  if (on(L, 'GLOW', M)) { deck.glows(L.GLOW.x, { t }); if (c.lights !== 0) carGlow(L.GLOW.x, { cx: c.cx ?? 760, cy: 1190 + (c.dy || 0), s: c.s ?? 1.35, t, k: c.lights ?? 1 }); }
  if (o.group && on(L, 'FG', I)) {   // Du, Abfindung, Hertha als Silhouetten von hinten am unteren Rand, den Blick nach oben
    const g = L.FG.x;
    drawHuman(g, HERTHA, { x: 760, y: 2120, s: 2.1, turn: 2, pose: 'stand', headTurn: 0, nod: -0.25, expr: 'worried', blink: 0 });
    drawCritter(g, ABFINDUNG, { x: 560, y: 2110, s: 2.3, turn: 2, pose: 'sit', expr: 'alert', earPerk: 1, blink: 0 });
    drawHuman(g, DU, { x: 320, y: 2130, s: 2.4, turn: 2, pose: 'stand', headTurn: 0, nod: -0.25, expr: 'worried', armR: 'hold', armL: 'hold', blink: 0 });
  }
  return { sun: camPt(M, c.cx ?? 760, 1100), hz: camPt(M, 0, 1180)[1], faces, clues: o.clue || [] };
}
const dshot = (id, f0, f1, motion, draw) => ({ id, t0: T(f0), t1: T(f1), motion, layers: DL, draw });
const DM = (fy, sy, z = 1, o = {}) => { const M = fr(o.fx ?? 540, fy, 540, sy, z, o); M.zoom = z; return M; };

// ------------------------------------------------------------ B08 (1186-1233) L14 „Oben hält ein schwarzer Wagen.“  CLIP-MOMENT
// Der Wagen rollt von rechts über die Brücke (f1186-1230), die Scheinwerfer fegen über den Beton, er hält, Bremslicht. Wir stehen unten.
const B08 = dshot('B08', 1186, 1234, 'fast', (L, t) => {
  const u = out(seg(t, T(1186), T(1228))), [dx, dy, dr] = drift(t, { amp: 4 }), [sx, sy, sr] = shake(t, T(1230), { amp: 7 });
  const M = DM(1180, 930, 1.0 * push(t, T(1186), T(1234), 0.06), { dx: dx + sx, dy: dy + sy, rot: dr + sr });
  return top(L, t, M, { car: { cx: lerp(1560, 760, u), lights: 1 }, group: true, clue: [[560, 780, 700, 220]] });
});

// ------------------------------------------------------------ B09 (1234-1299) STILLE
// Der Wagen steht, der Motor läuft leise. Zoom auf die Scheibe: hinter dem Glas hebt sich ein Fernglas (f1262-1275). Kein Wort.
const B09 = dshot('B09', 1234, 1300, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 2 }), z = 1.6 * push(t, T(1234), T(1300), 0.25), rumble = Math.sin(t * 70) * 1.2;
  const M = DM(1090, 900, z, { fx: 740, dx, dy: dy + rumble, rot: dr });
  const c = drawBlackCar(null, { cx: 760, cy: 1190, s: 1.35 }), w = camPt(M, c.window[0], c.window[1]);
  return top(L, t, M, { car: { cx: 760, bino: seg(t, T(1262), T(1275)) }, clue: [[w[0] - 140, w[1] - 60, 320, 140]] });
});

// ------------------------------------------------------------ B10 (1300-1377) STILLE
// Unter der Brücke erstarrt alles: Du, Hertha, Kemal und Abfindung schauen nach oben, das Feuer klein, Licht von oben auf den Gesichtern.
const B10 = shot('B10', 1300, 1378, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 2 }), M = Mz(560, 1370, 540, 880, 1.3 * push(t, T(1300), T(1378), 0.07), { dx, dy, rot: dr });
  const up = { nod: -0.35, headTurn: 0, expr: 'worried' };
  return fire(L, t, M, { fire: 0.55, hertha: { ...hp0, turn: 0.1, ...up, armR: 'down' }, kemal: { ...kp0, x: 800, turn: -0.2, ...up, armR: 'down', expr: 'surprised' },
    du: { ...dp0, x: 300, turn: 0.2, ...up, expr: 'scared' }, dog: { ...ap0, x: 560, y: 1740, turn: 0.2, headTurn: 0, expr: 'alert', earPerk: 1, wag: 0, nod: -0.3, pose: 'sit' } });
});

// ------------------------------------------------------------ B11 (1378-1439) L15 „Es ist deine Chefin.“
// Frau Brandt kommt von rechts an der Autotür vorbei ans Geländer, den Umschlag in der Hand; sie bleibt stehen und schaut herunter.
const bB11 = take({ x: 1300, y: 1200, s: 1.7, turn: -1.1, pose: 'walk', expr: 'neutral', armR: 'hold', armL: 'down' },
  [{ t: T(1378), x: 420, dur: 1.55, ease: 'out' }, { t: T(1418), pose: 'stand', turn: 0.15, nod: 0.2, expr: 'happy', dur: 0.4 }], { seed: 7, cadence: 1.5 });
const B11 = dshot('B11', 1378, 1440, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 3 }), M = DM(1180, 930, 1.0 * push(t, T(1378), T(1440), 0.05), { dx, dy, rot: dr });
  const P = bB11(t), Bd = drawHuman(null, BRANDT, P);
  return top(L, t, M, { car: { cx: 760, lights: 0.6 }, brandt: P, env: { cx: Bd.hands[0][0] + 10, cy: Bd.hands[0][1] + 10, s: 0.85, rot: 0.3 }, group: true });
});

// ------------------------------------------------------------ B12 (1440-1498) L15 „Sie lächelt.“
// Nah auf Brandts Gesicht, höfliches Lächeln, Brille, der Umschlag in der Hand.
const bB12 = take({ x: 420, y: 1200, s: 1.7, turn: 0.1, pose: 'stand', nod: 0.2, expr: 'happy', armR: 'hold', armL: 'down' }, [{ t: T(1462), expr: 'sly', nod: 0.28, dur: 0.5 }], { seed: 7 });
const B12 = dshot('B12', 1440, 1499, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 3 }), P = bB12(t), Bd = drawHuman(null, BRANDT, P), z = 2.5 * push(t, T(1440), T(1499), 0.06);
  const M = fr(Bd.head[0], Bd.head[1], 540, 820, z, { dx, dy, rot: dr }); M.zoom = z;
  return top(L, t, M, { car: { cx: 760, lights: 0.6 }, brandt: P, env: { cx: Bd.hands[0][0] + 10, cy: Bd.hands[0][1] + 10, s: 0.85, rot: 0.3 } });
});

// ------------------------------------------------------------ B13 (1499-1838) L16 + L17 + Endkarte, EINE Einstellung
// Die Abstimmung: ruhiger Weitwinkel von unten. Brandt am Geländer oben (Gesicht über y 760), der Wagen hinter ihr, du und der Hund als Silhouetten
// unten. Der Umschlag löst sich (f1600) und trudelt langsam nach unten zu euch. Die Mitte (y 800-1440) bleibt ruhig.
const bB13 = take({ x: 420, y: 1200, s: 1.55, turn: 0.1, pose: 'stand', nod: 0.22, expr: 'sly', armR: 'hold', armL: 'down' }, [{ t: T(1600), armR: 'out', dur: 0.4 }, { t: T(1650), armR: 'down', expr: 'happy', dur: 0.5 }], { seed: 7 });
const B13 = dshot('B13', 1499, 1839, 'medium', (L, t) => {
  const [dx, dy, dr] = drift(t, { amp: 3 }), M = DM(1180, 700, 1.0 * push(t, T(1499), T(1839), 0.05), { dx, dy, rot: dr }), P = bB13(t), Bd = drawHuman(null, BRANDT, P);
  const d = seg(t, T(1604), T(1830)), ey = lerp(Bd.hands[0][1], 2250, d * d * 0.55 + d * 0.45), ex = Bd.hands[0][0] + Math.sin(d * 9) * 55 * (0.3 + d);
  return top(L, t, M, { car: { cx: 880, s: 1.05, lights: 0.8 }, brandt: P, group: true, env: t < T(1604) ? { cx: Bd.hands[0][0] + 10, cy: Bd.hands[0][1] + 10, s: 0.8, rot: 0.3 } : { cx: ex, cy: ey, s: 0.8, rot: Math.sin(d * 9) * 0.6 } });
});

export const SHOTS = [B01, B02, B03, B04, B05, B06, B07, B08, B09, B10, B11, B12, B13];
export const CUES = { 'B02.point': T(790), 'B04.reach': T(922), 'B05.jump': T(972), 'B05.land': T(982), 'B05.growl': T(985), 'B06.tea': T(1052), 'B07.cactus': T(1118), 'B07.tausch': T(1135),
  'B08.car': T(1186), 'B08.stop': T(1228), 'B09.engine': T(1234), 'B09.bino': T(1266), 'B10.freeze': T(1300), 'B11.step': T(1380), 'B11.door': T(1378), 'B12.smile': T(1462), 'B13.drop': T(1604) };
