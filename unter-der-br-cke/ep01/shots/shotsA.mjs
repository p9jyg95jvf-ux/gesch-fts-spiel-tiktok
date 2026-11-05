// Unter der Brücke · Folge 1 „Gefeuert“, SEGMENT A (Frames 0-694): Büro-Eingang, Stadt, Brücke, der Hund.
// Zeiten in Sekunden (Frame / 30). Zeilen und Wort-Einsätze: ../timeline_lock.json.
import { camPt, push, punch, shake, drift, contactShadow, glow, take, drawHuman, drawCritter, clamp, lerp, seg, io, out } from '../../engine.mjs';
import { DU, ABFINDUNG, HERTHA, KEMAL, WACHMANN } from '../../kit/cast.mjs';
import { office, OFFICE, city, CITY, bridge, BRIDGE } from '../../kit/sets.mjs';
import { drawBox, drawGlassDoor, drawBarrel, barrelGlow, drawPasserby, drawBottleSack, drawCrateSeat } from '../../kit/props.mjs';
import { T, on, fr, I, BR, duWithBox } from './common.mjs';

const fc = (D, M, zoom, k = 1.2) => { const h = camPt(M, D.head[0], D.head[1]); return [h[0], h[1], D.head[2] * zoom * k]; };

// ------------------------------------------------------------ A01 (0-99) L00 „Die Tür knallt zu. Du bist gefeuert.“
// FRAME 0 IST ACTION: Du stolperst mit dem Karton aus der Tür, der Wachmann zeigt hinterher, Brandts Silhouette steht hinter dem
// Glas. Auf „gefeuert“ (f58) knallt die Tür: Glas wackelt, Schock, Kamera zuckt.
const slam = (t) => (t < T(58) ? 0 : Math.max(0, 1 - (t - T(58)) * 4.5));
const duA01 = take({ x: 760, y: 1560, s: 1.7, turn: -0.35, pose: 'walk', expr: 'surprised', lean: 0.3, armR: 'hold', armL: 'hold' },
  [{ t: T(2), x: 500, pose: 'stand', lean: 0.05, expr: 'sad', dur: 0.55, ease: 'out' }, { t: T(60), headTurn: 0.5, expr: 'sad', dur: 0.25 }], { seed: 1 });
const wachA01 = take({ x: 790, y: 1590, s: 1.8, turn: -0.55, pose: 'stand', expr: 'neutral', armR: 'point', armL: 'hips' }, [{ t: T(60), expr: 'neutral', armR: 'hips', dur: 0.4 }], { seed: 4 });
const A01 = { id: 'A01', t0: 0, t1: T(100), motion: 'medium',
  layers: [['BACK', { dof: 1.5 }], ['GROUND', { shutter: 90 }], ['DOOR', {}], ['CAST', { subject: true }], ['RAIN', { blend: 'screen', light: false }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [sx, sy, sr] = shake(t, T(58), { amp: 12 }), [dx, dy, dr] = drift(t, { amp: 3 });
    const D0 = drawHuman(null, DU, duA01(t));
    const M = fr(D0.head[0], D0.head[1], 470, 880, 1.02 * push(t, 0, T(100), 0.07), { dx: dx + sx, dy: dy + sy, rot: dr + sr });
    on(L, 'BACK', M) && office.back(L.BACK.x, { t });
    on(L, 'GROUND', M) && office.ground(L.GROUND.x, { t });
    on(L, 'DOOR', M) && drawGlassDoor(L.DOOR.x, { cx: 820, cy: 1500, s: 1.2, t, shadow: Math.min(1, seg(t, T(6), T(14)) + 0.0), slam: slam(t) });
    const P = duA01(t), W = wachA01(t);
    let D;
    if (on(L, 'CAST', M)) { drawHuman(L.CAST.x, WACHMANN, W); D = duWithBox(L.CAST.x, P, { sag: 0.6 }); } else D = drawHuman(null, DU, P);
    on(L, 'RAIN', I) && office.rain(L.RAIN.x, { t });
    on(L, 'GLOW', M) && office.glows(L.GLOW.x, { t });
    const a = camPt(M, 640, 960), b = camPt(M, 1000, 1500);
    return { sun: camPt(M, ...OFFICE.light), hz: camPt(M, 0, OFFICE.hz)[1], faces: [fc(D, M, 1.02 * push(t, 0, T(100), 0.07))], clues: [[a[0], a[1], b[0] - a[0], b[1] - a[1]]] };
  } };

// ------------------------------------------------------------ A02 (100-184) L01 „Dein Leben. Ein Karton.“
// Der Karton groß im Bild, langsamer Zoom hinein: Kaktus, Stapler, Tasse. Er schwankt leicht in den Händen.
const A02 = { id: 'A02', t0: T(100), t1: T(185), motion: 'medium',
  layers: [['BACK', { dof: 4 }], ['BOX', { subject: true }], ['RAIN', { blend: 'screen', light: false }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 5 });
    const M = fr(540, 1180, 540, 1020, 1.0 * push(t, T(100), T(185), 0.1), { dx, dy, rot: dr });
    on(L, 'BACK', fr(540, 1180, 540, 1020, 1.2, { dx: dx * 0.4 })) && office.back(L.BACK.x, { t });
    const sway = Math.sin(t * 2.2) * 6, B = drawBox(null, { cx: 540, cy: 1380, s: 2.3 });
    on(L, 'BOX', M) && drawBox(L.BOX.x, { cx: 540 + sway, cy: 1380 + Math.abs(sway) * 0.3, s: 2.3, open: 0.35, sag: 1, t });
    on(L, 'RAIN', I) && office.rain(L.RAIN.x, { t });
    on(L, 'GLOW', M) && glow(L.GLOW.x, 540, 900, 700, 0.18, '255,214,150', 0.2);
    const a = camPt(M, B.box[0], B.box[1]), b = camPt(M, B.box[0] + B.box[2], B.box[1] + B.box[3]);
    return { sun: camPt(M, 540, 600), hz: 0, faces: [], clues: [[a[0], a[1], b[0] - a[0], b[1] - a[1]]] };
  } };

// ------------------------------------------------------------ A03 (185-249) L02 „Schwerer, als er aussieht.“
// Du, nah: das Gewicht zieht dich nach vorn und unten; Namensschild „J. Weigel“ an der Brust, Blick auf den Karton.
const duA03 = take({ x: 540, y: 1560, s: 1.8, turn: 0.2, pose: 'stand', expr: 'worried', lean: 0.1, nod: 0.12, armR: 'hold', armL: 'hold', look: [0, 0.5] },
  [{ t: T(190), lean: 0.3, nod: 0.3, sq: 0.94, dur: 0.35, ease: 'out' }, { t: T(215), look: [0.4, 0], expr: 'sad', dur: 0.3 }], { seed: 1 });
const A03 = { id: 'A03', t0: T(185), t1: T(250), motion: 'medium',
  layers: [['BACK', { dof: 4 }], ['GROUND', {}], ['CAST', { subject: true }], ['RAIN', { blend: 'screen', light: false }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 4 }), P = duA03(t), D0 = drawHuman(null, DU, P), z = 2.0 * push(t, T(185), T(250), 0.06);
    const M = fr(D0.head[0], D0.head[1], 540, 800, z, { dx, dy, rot: dr });
    on(L, 'BACK', M) && office.back(L.BACK.x, { t });
    on(L, 'GROUND', M) && office.ground(L.GROUND.x, { t });
    let D;
    if (on(L, 'CAST', M)) {
      D = duWithBox(L.CAST.x, P, { sag: 1 });
      const g = L.CAST.x, hx = D.head[0] + D.head[2] * 0.7, hy = D.head[1] + D.head[2] * 1.6, w = D.head[2] * 0.75;   // Namensschild
      g.save(); g.fillStyle = '#F4F1EA'; g.strokeStyle = '#2B1D17'; g.lineWidth = 3; g.beginPath(); g.roundRect(hx - w / 2, hy - w * 0.3, w, w * 0.6, 4); g.fill(); g.stroke();
      g.fillStyle = '#2B1D17'; g.fillRect(hx - w * 0.38, hy - w * 0.12, w * 0.76, 4); g.fillRect(hx - w * 0.38, hy + w * 0.06, w * 0.5, 4); g.restore();
    } else D = drawHuman(null, DU, P);
    on(L, 'RAIN', I) && office.rain(L.RAIN.x, { t });
    on(L, 'GLOW', M) && office.glows(L.GLOW.x, { t });
    return { sun: camPt(M, ...OFFICE.light), hz: 0, faces: [fc(D, M, z)] };
  } };

// ------------------------------------------------------------ A04 (250-343) L03 „Kein Job. Keine Wohnung. Kein Plan.“
// Du von hinten durch den Regen, die Stadt zieht vorbei (Parallaxe), Passanten mit Schirmen kommen entgegen.
const duA04 = take({ x: 450, y: 1540, s: 1.55, turn: 2, pose: 'walk', expr: 'sad', armR: 'hold', armL: 'hold' }, [], { seed: 1, cadence: 1.5 });
const A04 = { id: 'A04', t0: T(250), t1: T(344), motion: 'medium',
  layers: [['BACK', { dof: 2 }], ['MID', { haze: 0.3 }], ['GROUND', { shutter: 90 }], ['PASS', {}], ['CAST', { subject: true }], ['RAIN', { blend: 'screen', light: false }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const u = t - T(250), [dx, dy, dr] = drift(t, { amp: 3 }), sc = (d) => fr(540, 1300, 540, 1130, 1.0, { dx: -u * 110 * d + dx, dy, rot: dr });
    on(L, 'BACK', sc(0.25)) && city.back(L.BACK.x, { t });
    on(L, 'MID', sc(0.7)) && city.mid(L.MID.x, { t });
    on(L, 'GROUND', sc(1)) && city.ground(L.GROUND.x, { t });
    if (on(L, 'PASS', sc(1))) { drawPasserby(L.PASS.x, { cx: 1250 - u * 330, cy: 1490, s: 1.0, t, umb: '#7A3A58', dir: -1 }); drawPasserby(L.PASS.x, { cx: 1700 - u * 400, cy: 1540, s: 1.25, t, umb: '#2F6A7A', dir: -1 }); }
    const P = duA04(t);
    let D = drawHuman(null, DU, P);
    if (on(L, 'CAST', fr(540, 1300, 540, 1130, 1.0, { dx, dy, rot: dr }))) { contactShadow(L.CAST.x, P.x, P.y, 100, 14, 0.4); drawHuman(L.CAST.x, DU, P); }
    on(L, 'RAIN', I) && city.rain(L.RAIN.x, { t });
    on(L, 'GLOW', sc(0.7)) && city.glows(L.GLOW.x, { t });
    const a = camPt(sc(1), D.box[0], D.box[1]), b = camPt(sc(1), D.box[2], D.box[3]);
    return { sun: camPt(sc(0.25), ...CITY.light), hz: CITY.hz, faces: [], clues: [[a[0], a[1], b[0] - a[0], b[1] - a[1]]] };
  } };

// ------------------------------------------------------------ A05 (344-439) L04 „Zwölf Euro vierzig. Mehr bleibt nicht.“
// Gegenschuss: Du läufst auf uns zu, das Gesicht müde; die Stadt gleitet nach hinten. Der Kontostand tickt im HUD.
const duA05 = take({ x: 560, y: 1500, s: 1.4, turn: 0, pose: 'walk', expr: 'sad', armR: 'hold', armL: 'hold' },
  [{ t: T(344), s: 1.9, y: 1560, dur: 3.1, ease: 'linear' }, { t: T(392), expr: 'worried', look: [0, 0.4], dur: 0.4 }], { seed: 2, cadence: 1.5 });
const A05 = { id: 'A05', t0: T(344), t1: T(440), motion: 'medium',
  layers: [['BACK', { dof: 2 }], ['MID', { haze: 0.3 }], ['GROUND', { shutter: 90 }], ['CAST', { subject: true }], ['RAIN', { blend: 'screen', light: false }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const u = t - T(344), [dx, dy, dr] = drift(t, { amp: 3 }), P = duA05(t), D0 = drawHuman(null, DU, P);
    const sc = (d) => fr(D0.head[0], D0.head[1], 540, 760, 1.0 * push(t, T(344), T(440), 0.05), { dx: u * 60 * d + dx - 60, dy, rot: dr });
    on(L, 'BACK', sc(0.25)) && city.back(L.BACK.x, { t });
    on(L, 'MID', sc(0.6)) && city.mid(L.MID.x, { t });
    on(L, 'GROUND', sc(1)) && city.ground(L.GROUND.x, { t });
    const Mc = fr(D0.head[0], D0.head[1], 540, 760, 1.0 * push(t, T(344), T(440), 0.05), { dx, dy, rot: dr });
    let D = D0;
    if (on(L, 'CAST', Mc)) D = duWithBox(L.CAST.x, P, { sag: 1 });
    on(L, 'RAIN', I) && city.rain(L.RAIN.x, { t });
    on(L, 'GLOW', sc(0.6)) && city.glows(L.GLOW.x, { t });
    return { sun: camPt(sc(0.25), ...CITY.light), hz: CITY.hz, faces: [fc(D, Mc, 1.0)] };
  } };

// ------------------------------------------------------------ A06 (440-543) L05 „Es wird Nacht. Du findest eine Brücke.“
// Weitwinkel: die riesige Brücke, am Feuer zwei kleine Gestalten, du winzig kommst von links ins Licht.
const duA06 = take({ x: 90, y: 1650, s: 0.9, turn: 0.9, pose: 'walk', expr: 'worried', armR: 'hold', armL: 'hold' }, [{ t: T(440), x: 330, dur: 3.4, ease: 'linear' }], { seed: 1, cadence: 1.6 });
export const bridgeGroup = (L, M, t, o = {}) => {   // Hertha und Kemal am Feuer (feste Positionen)
  const hp = take({ ...BR.hertha, turn: 0.45, pose: 'sit', seat: 55, expr: 'neutral', armR: 'hold', armL: 'down' }, [], { seed: 5 })(t);
  const kp = take({ ...BR.kemal, turn: -0.5, pose: 'stand', expr: 'sly', armR: 'hips', armL: 'down' }, [], { seed: 6 })(t);
  return { hp, kp };
};
const A06 = { id: 'A06', t0: T(440), t1: T(544), motion: 'medium',
  layers: [['BACK', { dof: 1.5 }], ['MID', { haze: 0.2 }], ['GROUND', {}], ['PROPS', {}], ['CAST', { subject: true }], ['RAIN', { blend: 'screen', light: false }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 3 }), z = 0.92 * push(t, T(440), T(544), 0.12), M = fr(540, 1250, 540, 1060, z, { dx, dy, rot: dr });
    on(L, 'BACK', M) && bridge.back(L.BACK.x, { t });
    on(L, 'MID', M) && bridge.mid(L.MID.x, { t });
    on(L, 'GROUND', M) && bridge.ground(L.GROUND.x, { t });
    const b = BR.barrel, { hp, kp } = bridgeGroup(L, M, t);
    if (on(L, 'PROPS', M)) { drawBottleSack(L.PROPS.x, BR.sack); drawCrateSeat(L.PROPS.x, BR.crate); drawBarrel(L.PROPS.x, { ...b, t }); }
    const P = duA06(t);
    if (on(L, 'CAST', M)) { drawHuman(L.CAST.x, HERTHA, hp); drawHuman(L.CAST.x, KEMAL, kp); contactShadow(L.CAST.x, P.x, P.y, 90, 12, 0.4); duWithBox(L.CAST.x, P, { sag: 1 }); }
    on(L, 'RAIN', I) && bridge.rain(L.RAIN.x, { t });
    if (on(L, 'GLOW', M)) { bridge.glows(L.GLOW.x, { t }); barrelGlow(L.GLOW.x, { ...b, t }); }
    const D = drawHuman(null, DU, P);
    return { sun: camPt(M, b.cx, b.cy - 300), hz: camPt(M, 0, BRIDGE.hz)[1], faces: [fc(D, M, z, 1.6)], points: [{ ...((p) => ({ x: p[0], y: p[1] }))(camPt(M, b.cx, b.cy - 260)), r: 1100, col: '#FFAA55', k: 0.9 }] };
  } };

// ------------------------------------------------------------ A07 (544-594) L06 „Ein Hund folgt dir.“
// Abfindung trabt von links hinter dir her, dein Kopf dreht sich, er bleibt stehen. Schweif, Ohren: er hofft.
const dogA07 = take({ x: 215, y: 1730, s: 1.7, turn: 0.9, pose: 'trot', expr: 'curious', earPerk: 1, wag: 0.5 },
  [{ t: T(544), x: 285, dur: 1.2, ease: 'out' }, { t: T(584), pose: 'stand', expr: 'happy', dur: 0.2 }], { seed: 3 });
const duA07 = take({ x: 470, y: 1700, s: 1.8, turn: 1.4, pose: 'walk', expr: 'worried', armR: 'hold', armL: 'hold' },
  [{ t: T(544), x: 520, dur: 0.9, ease: 'out' }, { t: T(566), pose: 'stand', turn: 0.9, headTurn: -0.7, expr: 'surprised', dur: 0.4 }], { seed: 1 });
const A07 = { id: 'A07', t0: T(544), t1: T(595), motion: 'medium',
  layers: [['BACK', { dof: 2 }], ['MID', { haze: 0.2 }], ['GROUND', {}], ['PROPS', {}], ['CAST', { subject: true }], ['RAIN', { blend: 'screen', light: false }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 3 }), M = fr(540, 1450, 540, 1150, 1.15 * push(t, T(544), T(595), 0.06), { dx, dy, rot: dr });
    on(L, 'BACK', M) && bridge.back(L.BACK.x, { t });
    on(L, 'MID', M) && bridge.mid(L.MID.x, { t });
    on(L, 'GROUND', M) && bridge.ground(L.GROUND.x, { t });
    const b = BR.barrel;
    on(L, 'PROPS', M) && drawBarrel(L.PROPS.x, { ...b, t });
    const pd = dogA07(t), pu = duA07(t), dd = drawCritter(null, ABFINDUNG, pd), D = drawHuman(null, DU, pu);
    if (on(L, 'CAST', M)) { contactShadow(L.CAST.x, pu.x, pu.y, 110, 14, 0.4); duWithBox(L.CAST.x, pu, { sag: 1 }); contactShadow(L.CAST.x, pd.x, pd.y, 100, 12, 0.4); drawCritter(L.CAST.x, ABFINDUNG, pd); }
    on(L, 'RAIN', I) && bridge.rain(L.RAIN.x, { t });
    if (on(L, 'GLOW', M)) { bridge.glows(L.GLOW.x, { t }); barrelGlow(L.GLOW.x, { ...b, t }); }
    return { sun: camPt(M, b.cx, b.cy - 300), hz: camPt(M, 0, BRIDGE.hz)[1], faces: [fc(D, M, 1.15), [camPt(M, dd.head[0], dd.head[1])[0], camPt(M, dd.head[0], dd.head[1])[1], dd.head[2] * 1.15 * 1.2]],
      points: [{ ...((p) => ({ x: p[0], y: p[1] }))(camPt(M, b.cx, b.cy - 260)), r: 1000, col: '#FFAA55', k: 0.9 }] };
  } };

// ------------------------------------------------------------ A08 (595-639) L07 „Auf seinem Schal steht:“
// Abfindung ganz nah, Kopf schief, Ohren hoch, Zunge raus; der rote Schal unter dem Kinn.
const dogA08 = take({ x: 540, y: 1730, s: 4.3, turn: 0.15, headTurn: -0.1, pose: 'stand', expr: 'curious', earPerk: 1, tilt: 0.12, wag: 0.8 },
  [{ t: T(612), expr: 'happy', tongue: 1, tilt: -0.12, dur: 0.3 }], { seed: 3 });
const A08 = { id: 'A08', t0: T(595), t1: T(640), motion: 'medium',
  layers: [['BACK', { dof: 5 }], ['CAST', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy, dr] = drift(t, { amp: 3 }), P = dogA08(t), D0 = drawCritter(null, ABFINDUNG, P), z = push(t, T(595), T(640), 0.08);
    const M = fr(D0.head[0], D0.head[1], 540, 800, z, { dx, dy, rot: dr });
    on(L, 'BACK', M) && bridge.back(L.BACK.x, { t });
    if (on(L, 'CAST', M)) { contactShadow(L.CAST.x, P.x, P.y, 300, 30, 0.4); drawCritter(L.CAST.x, ABFINDUNG, P); }
    if (on(L, 'GLOW', M)) { glow(L.GLOW.x, 900, 900, 900, 0.45, '255,150,60', 0.15); }
    return { sun: camPt(M, 900, 700), hz: 0, faces: [fc(D0, M, z, 1.15)] };
  } };

// ------------------------------------------------------------ A09 (640-694) L07 „Abfindung.“
// Makro auf den roten Schal; „ABFINDUNG“ wird in Handschrift sichtbar (Wisch von links), der Schal wippt im Atem.
const A09 = { id: 'A09', t0: T(640), t1: T(695), motion: 'medium',
  layers: [['BACK', { dof: 6 }], ['SCARF', { subject: true }], ['GLOW', { blend: 'add' }]],
  draw(L, t) {
    const [dx, dy] = drift(t, { amp: 5 }), br = Math.sin(t * 3.2) * 6, z = push(t, T(640), T(695), 0.08);
    on(L, 'BACK', fr(540, 1100, 540, 1000, 1.4, { dx: dx * 0.5 })) && bridge.back(L.BACK.x, { t });
    if (on(L, 'SCARF', fr(540, 1000, 540, 1000, z, { dx, dy }))) {
      const g = L.SCARF.x;
      // Fell links und rechts
      for (const [fx, col] of [[100, '#B88A5A'], [980, '#9A7248']]) { g.fillStyle = col; g.beginPath(); g.ellipse(fx, 900, 300, 760, 0, 0, Math.PI * 2); g.fill(); }
      // Schal: ein breites Dreieck mit weißen Punkten
      g.save(); g.translate(540, 800); g.rotate(-0.04 + Math.sin(t * 1.6) * 0.012);
      g.fillStyle = '#2B1D17'; g.beginPath(); g.moveTo(-418, -164 + br * 0.3); g.lineTo(418, -164 + br * 0.3); g.lineTo(0, 700 + br); g.closePath(); g.fill();
      g.fillStyle = '#D63A2F'; g.beginPath(); g.moveTo(-404, -150 + br * 0.3); g.lineTo(404, -150 + br * 0.3); g.lineTo(0, 680 + br); g.closePath(); g.fill();
      g.fillStyle = '#A82A22'; g.beginPath(); g.moveTo(404, -150 + br * 0.3); g.lineTo(0, 680 + br); g.lineTo(160, -150); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 28; i++) { const px = ((i * 137) % 700) - 350, py = ((i * 89) % 700) - 100; if (Math.abs(px) < 380 - py * 0.55) { g.beginPath(); g.arc(px, py, 7, 0, Math.PI * 2); g.fill(); } }
      // Handschrift ABFINDUNG, von links aufgedeckt
      const u = seg(t, T(644), T(664));
      g.beginPath(); g.rect(-360, -60, 720 * u, 260); g.clip();
      g.font = '120px "Patrick Hand"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.strokeStyle = '#2B1D17'; g.lineWidth = 12; g.strokeText('ABFINDUNG', 0, 90); g.fillStyle = '#F7F2E4'; g.fillText('ABFINDUNG', 0, 90);
      g.restore();
    }
    on(L, 'GLOW', fr(540, 1000, 540, 1000, z)) && glow(L.GLOW.x, 980, 760, 800, 0.5, '255,150,60', 0.15);
    return { sun: [980, 760], hz: 0, faces: [], clues: [[170, 640, 740, 300]] };
  } };

export const SHOTS = [A01, A02, A03, A04, A05, A06, A07, A08, A09];
export const CUES = { 'A01.start': 0, 'A01.slam': T(58), 'A02.box': T(100), 'A03.heavy': T(190), 'A04.rain': T(250), 'A06.bridge': T(440), 'A07.bark': T(552), 'A09.write': T(644) };
