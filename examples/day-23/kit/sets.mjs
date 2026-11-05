// Day 23: THE SETS (contract: kit/KIT_API.md). Each set is split by depth so shots can put the parts on separate
// look-engine layers; every set exports its anchor points. Frame coordinates 1080 x 1920.
import { W, H, TAU, clamp, lerp, h01, rgba, mixHex, sky, blob, tube, line, ell, circ, poly, shadeOf, lw, glow } from '../engine.mjs';
import { drawCalendar, drawVehicle, drawKeys } from './props.mjs';

const M_ = 260;

/** floating particles for an add layer: dust motes that drift and twinkle in the light, or (fall > 0) ash and embers
 *  that sink and drift with the wind. box = [x0, y0, x1, y1] in the layer's space; pure function of t. */
export function motes(x, t, { box = [0, 0, W, H], n = 40, seed = 1, col = '255,240,210', a = 0.5, r = [1.4, 3.8], wind = 10, fall = 0 } = {}) {
  const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
  for (let i = 0; i < n; i++) {
    const rr = lerp(r[0], r[1], h01(i, seed + 1)), sp = 0.4 + h01(i, seed + 2);
    let px = x0 + w * h01(i, seed + 3) + wind * t * sp + Math.sin(t * 0.7 * sp + i) * 14;
    let py = y0 + h * h01(i, seed + 4) + fall * t * sp + Math.sin(t * 0.9 * sp + i * 2) * 10;
    px = x0 + ((px - x0) % w + w) % w; py = y0 + ((py - y0) % h + h) % h;
    const tw = 0.55 + 0.45 * Math.sin(t * (1.5 + sp * 2) + i * 3.1), al = a * tw;
    const g = x.createRadialGradient(px, py, 0, px, py, rr * 2.4);
    g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(0.4, `rgba(${col},${al * 0.5})`); g.addColorStop(1, `rgba(${col},0)`);
    circ(x, px, py, rr * 2.4); x.fillStyle = g; x.fill();
  }
}

// ------------------------------------------------------------------------------------------------ the hospital room
// Room 214: pale green walls, a window with blinds (morning light cutting through), the wall calendar, a ceiling light
// that flickers, a speckled tile floor. The door (props.drawDoor) and the bed (props.drawBed) go on their own layers.
// grime, blood and litter (seeded, so every frame matches)
function grime(x, seed, [x0, y0, x1, y1]) {
  x.save();
  for (let i = 0; i < 16; i++) { const px = lerp(x0, x1, h01(i, seed)), py = lerp(y0, y1, h01(i, seed + 1)), r = 14 + 40 * h01(i, seed + 2); x.globalAlpha = 0.04 + 0.05 * h01(i, seed + 3); x.fillStyle = h01(i, seed + 4) > 0.5 ? '#2E2A20' : '#5A5030'; x.beginPath(); x.ellipse(px, py, r, r * (0.4 + 0.9 * h01(i, seed + 5)), 0, 0, TAU); x.fill(); }
  for (let i = 0; i < 6; i++) { const px = lerp(x0, x1, h01(i, seed + 9)), py = lerp(y0, y1 * 0.5, h01(i, seed + 10)); x.globalAlpha = 0.12; x.fillStyle = '#3A3420'; x.fillRect(px, py, 3, 90 + 140 * h01(i, seed + 11)); }
  x.restore();
}
function smear(x, cx, cy, k = 1) { x.save(); x.globalAlpha = 0.62; x.fillStyle = '#5E1814'; x.beginPath(); x.moveTo(cx, cy); x.bezierCurveTo(cx + 40 * k, cy + 30 * k, cx + 30 * k, cy + 140 * k, cx + 10 * k, cy + 220 * k); x.lineTo(cx - 16 * k, cy + 200 * k); x.bezierCurveTo(cx - 6 * k, cy + 120 * k, cx - 20 * k, cy + 40 * k, cx, cy); x.fill(); x.restore(); }
function hand(x, cx, cy, k = 1, a = 0.6) {
  x.save(); x.globalAlpha = a; x.fillStyle = '#5E1814'; x.beginPath(); x.ellipse(cx, cy, 26 * k, 30 * k, 0, 0, TAU); x.fill();
  for (let f = 0; f < 5; f++) { const ang = -2.4 + f * 0.42, L = (f === 0 ? 30 : 46) * k; x.beginPath(); x.ellipse(cx + Math.cos(ang) * (26 * k + L / 2), cy + Math.sin(ang) * (30 * k + L / 2), 7 * k, L / 2, ang + Math.PI / 2, 0, TAU); x.fill(); }
  x.fillRect(cx - 6 * k, cy + 20 * k, 6 * k, 70 * k); x.restore();
}
function papers(x, n, [x0, y0, x1, y1], seed) {
  for (let i = 0; i < n; i++) { const px = lerp(x0, x1, h01(i, seed)), py = lerp(y0, y1, h01(i, seed + 1)), k = 0.25 + py / 3200; x.save(); x.translate(px, py); x.rotate((h01(i, seed + 2) - 0.5) * 1.6); x.scale(1, 0.45); x.fillStyle = '#E8E4D8'; x.fillRect(-40 * k, -50 * k, 80 * k, 100 * k); x.strokeStyle = 'rgba(43,29,23,0.6)'; x.lineWidth = 2; x.strokeRect(-40 * k, -50 * k, 80 * k, 100 * k); x.restore(); }
}

export const ROOM = { floor: 1420, window: [150, 560], calendar: [520, 820], door: [880, 1460], bed: [380, 1420], light: [540, 120] };
export const room = {
  back(x, { t = 0, flick = 1, circle = 1 } = {}) {
    const R = ROOM;
    const wg = x.createLinearGradient(0, -M_, 0, R.floor); wg.addColorStop(0, '#46584E'); wg.addColorStop(1, '#73887A');
    x.fillStyle = wg; x.fillRect(-M_, -M_, W + 2 * M_, R.floor + M_);
    x.fillStyle = '#7A9286'; x.fillRect(-M_, R.floor - 140, W + 2 * M_, 140);                      // a darker dado band
    line(x, [[-M_, R.floor - 140], [W + M_, R.floor - 140]], 4, '#5E7468');
    grime(x, 11, [-100, 0, W + 100, R.floor]);
    // a smeared handprint and a swipe of blood by the door
    smear(x, 760, 1080, 1.0); hand(x, 800, 960, 0.9, 0.6);
    // window + blinds with daylight slits
    const [wx, wy] = R.window, ww = 300, wh = 520;
    blob(x, [(g) => { g.beginPath(); g.rect(wx - ww / 2 - 18, wy - wh / 2 - 18, ww + 36, wh + 36); }], '#D8DCD4', '#AEB4AA', { line: 4 });
    x.fillStyle = '#FFF2D0'; x.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
    for (let k = 0; k < 18; k++) { const y = wy - wh / 2 + k * (wh / 18); x.fillStyle = '#C8C0A8'; if (k === 11) { x.save(); x.translate(wx - ww / 2, y); x.rotate(0.12); x.fillRect(0, 0, ww * 0.6, wh / 18 * 0.72); x.restore(); } else x.fillRect(wx - ww / 2, y, ww, wh / 18 * 0.72); }
    // the calendar
    drawCalendar(x, { cx: R.calendar[0], cy: R.calendar[1], s: 1, circle });
    // a tile floor
    const fg = x.createLinearGradient(0, R.floor, 0, H + M_); fg.addColorStop(0, '#A8AEA4'); fg.addColorStop(1, '#7E847A');
    x.fillStyle = fg; x.fillRect(-M_, R.floor, W + 2 * M_, H + M_ - R.floor);
    x.save(); x.globalAlpha = 0.25; x.strokeStyle = '#4E544A'; x.lineWidth = 2.5;
    for (let i = 0; i < 9; i++) { const y = R.floor + Math.pow(i / 9, 1.5) * (H + M_ - R.floor); x.beginPath(); x.moveTo(-M_, y); x.lineTo(W + M_, y); x.stroke(); }
    for (let k = -10; k <= 10; k++) { x.beginPath(); x.moveTo(540 + k * 70, R.floor); x.lineTo(540 + k * 240, H + M_); x.stroke(); }
    x.restore();
    papers(x, 5, [40, R.floor + 80, 1040, H - 80], 3);
    // the ceiling light panel (flicker 0..1)
    blob(x, [(g) => { g.beginPath(); g.rect(R.light[0] - 180, -10, 360, 60); }], mixHex('#9AA49C', '#F4FFF6', flick), mixHex('#7E887E', '#D8E8DA', flick), { line: 4 });
    return R;
  },
  /** light from the window slits (draw in an add layer) */
  slits(x, { k = 1 } = {}) {
    const [wx, wy] = ROOM.window;
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const y0 = wy - 200 + i * 70; x.globalAlpha = 0.07 * k;
      x.fillStyle = '#FFE8C0'; poly(x, [[wx + 150, y0], [wx + 150, y0 + 12], [wx + 820, y0 + 560], [wx + 820, y0 + 520]]); x.fill();
    }
    x.restore();
    glow(x, wx, wy, 300, 0.35 * k, '255,236,200', 0.2);
  },
  /** the room's own light for an add layer: the flickering ceiling panel, cold light through the door glass, dust */
  glows(x, { t = 0, flick = 1, door = true } = {}) {
    const [lx, ly] = ROOM.light;
    glow(x, lx, ly + 20, 420, 0.32 * flick, '220,255,236', 0.18);
    if (door) { const g = [ROOM.door[0] + 20, ROOM.door[1] - 360]; glow(x, g[0], g[1], 150, 0.22, '200,230,255', 0.3); }
    motes(x, t, { box: [ROOM.window[0] + 100, ROOM.window[1] - 240, ROOM.window[0] + 820, ROOM.window[1] + 520], n: 34, seed: 3, col: '255,236,200', a: 0.45, wind: 6 });
  },
};

// ------------------------------------------------------------------------------------------------ the hallway
// A long hospital corridor in one-point perspective (vanishing point VP). Light panels down the ceiling (each can be
// on/off/flickering), doors down both walls, a side doorway on the right (where the dog appears), the chained double
// doors at the far end.
export const HALL = { vp: [540, 900], far: 0.14, sideDoor: 0.42 };
export const hall = {
  /** proj(xn, yn, d): xn -1..1 across the corridor, yn -1 (ceiling)..1 (floor), d 0 (near) .. 1 (far end) */
  proj(xn, yn, d) { const k = lerp(1, HALL.far, Math.pow(d, 0.55)); return [HALL.vp[0] + xn * 640 * k, HALL.vp[1] + yn * 1150 * k * (yn > 0 ? 1 : 0.92)]; },
  draw(x, { t = 0, lamps = (i) => 1 } = {}) {
    const P = hall.proj;
    const quad = (pts, c) => { poly(x, pts); x.fillStyle = c; x.fill(); };
    quad([P(-1, 1, 0), P(1, 1, 0), P(1, 1, 1), P(-1, 1, 1)], '#9AA096');                        // floor
    quad([P(-1, -1, 0), P(1, -1, 0), P(1, -1, 1), P(-1, -1, 1)], '#C8CCC2');                    // ceiling
    quad([P(-1, -1, 0), P(-1, 1, 0), P(-1, 1, 1), P(-1, -1, 1)], '#6E8476');                    // left wall
    quad([P(1, -1, 0), P(1, 1, 0), P(1, 1, 1), P(1, -1, 1)], '#667C6E');                        // right wall
    x.save(); poly(x, [P(-1, -1, 0), P(-1, 1, 0), P(-1, 1, 1), P(-1, -1, 1)]); x.clip(); grime(x, 5, [-200, 0, 540, 1900]); x.restore();
    // a dark drag mark down the floor toward the far doors
    x.save(); x.globalAlpha = 0.55; poly(x, [P(0.05, 1, 0.05), P(0.22, 1, 0.05), P(0.08, 1, 0.9), P(0.02, 1, 0.9)]); x.fillStyle = '#4A1E1A'; x.fill(); x.restore();
    // floor tiles + a wall stripe
    x.save(); x.globalAlpha = 0.28; x.strokeStyle = '#4E544A'; x.lineWidth = 2.5;
    for (let i = 1; i < 14; i++) { const d = i / 14; x.beginPath(); x.moveTo(...P(-1, 1, d)); x.lineTo(...P(1, 1, d)); x.stroke(); }
    for (let k = -4; k <= 4; k++) { x.beginPath(); x.moveTo(...P(k / 4, 1, 0)); x.lineTo(...P(k / 4, 1, 1)); x.stroke(); }
    x.restore();
    for (const sg of [-1, 1]) { poly(x, [P(sg, 0.32, 0), P(sg, 0.4, 0), P(sg, 0.4, 1), P(sg, 0.32, 1)]); x.fillStyle = '#6E8A7A'; x.fill(); }
    // doors down both walls
    for (let i = 0; i < 4; i++) for (const sg of [-1, 1]) {
      const d0 = 0.08 + i * 0.22, d1 = d0 + 0.07; if (sg > 0 && Math.abs(d0 - HALL.sideDoor) < 0.08) continue;
      poly(x, [P(sg, -0.25, d0), P(sg, 1, d0), P(sg, 1, d1), P(sg, -0.25, d1)]); x.fillStyle = '#6E7E88'; x.fill(); x.lineWidth = lw(x, 3); x.strokeStyle = '#3A4248'; x.stroke();
    }
    // the side doorway (dark stairwell) on the right
    const sd = HALL.sideDoor; poly(x, [P(1, -0.3, sd), P(1, 1, sd), P(1, 1, sd + 0.08), P(1, -0.3, sd + 0.08)]); x.fillStyle = '#14181C'; x.fill(); x.lineWidth = lw(x, 4); x.strokeStyle = '#2B1D17'; x.stroke();
    const ex = P(1, -0.42, sd + 0.04); blob(x, [(g) => { g.beginPath(); g.rect(ex[0] - 26, ex[1] - 12, 52, 24); }], '#2EA84E', '#1E7A36', { line: 3 });
    x.fillStyle = '#E8FFE8'; x.font = 'bold 15px Oswald'; x.textAlign = 'center'; x.fillText('EXIT', ex[0], ex[1] + 6);
    // ceiling lights
    for (let i = 0; i < 7; i++) {
      const d = 0.05 + i * 0.14, on = clamp(lamps(i)), a = P(-0.25, -1, d), b = P(0.25, -1, d), c = P(0.25, -1, d + 0.05), e = P(-0.25, -1, d + 0.05);
      poly(x, [a, b, c, e]); x.fillStyle = mixHex('#8A928A', '#F6FFF6', on); x.fill();
    }
    // one ceiling panel has fallen and hangs by a corner
    { const a = P(-0.25, -1, 0.33), b = P(0.25, -1, 0.33), c = P(0.25, -0.55, 0.36), e = P(-0.25, -0.62, 0.38); poly(x, [a, b, c, e]); x.fillStyle = '#B8BCB2'; x.fill(); x.lineWidth = lw(x, 3); x.strokeStyle = '#2B1D17'; x.stroke(); }
    { const p = P(-1, 0.1, 0.62), k = lerp(1, HALL.far, Math.pow(0.62, 0.55)); hand(x, p[0] + 30 * k, p[1], k * 0.9, 0.7); }
    papers(x, 5, [260, 1250, 860, 1850], 5);
    // the far end wall (the chained doors are drawn by props.drawChainedDoors at FAR)
    poly(x, [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)]); x.fillStyle = '#7A9286'; x.fill();
    return HALL;
  },
  /** light pools from the lamps for an add layer */
  glows(x, { lamps = (i) => 1, t = 0 } = {}) {
    for (let i = 0; i < 7; i++) {
      const d = 0.05 + i * 0.14, on = clamp(lamps(i)), k = lerp(1, HALL.far, Math.pow(d, 0.55));
      if (on <= 0.05) continue;
      const p = hall.proj(0, 0.95, d + 0.03), c = hall.proj(0, -1, d + 0.025);
      glow(x, p[0], p[1], 260 * k, 0.18 * on, '220,255,230', 0.2);                  // the pool on the floor
      glow(x, c[0], c[1] + 10 * k, 300 * k, 0.3 * on, '230,255,240', 0.25);           // the panel itself
    }
    const ex = hall.proj(1, -0.42, HALL.sideDoor + 0.04);
    glow(x, ex[0], ex[1], 90, 0.55, '60,255,120', 0.35); glow(x, ex[0] - 30, ex[1] + 120, 220, 0.12, '60,255,120', 0.1);
    motes(x, t, { box: [140, 300, 940, 1500], n: 30, seed: 7, col: '220,255,236', a: 0.32, wind: 4 });
  },
};

// ------------------------------------------------------------------------------------------------ Main Street
// A small-town main street in one-point perspective: brick shopfronts both sides, blade signs, lamp posts, a water
// tower on the horizon, abandoned cars, a police car, a school bus. place(X, Z) gives a character's ground point and
// scale at street position X (left -, right +) and depth Z (near 250 .. far 4000).
export const STREET = { hz: 960, f: 900, cam: 175, edge: 300, facade: 470 };
const SP = (X, Y, Z) => { const k = STREET.f / Z; return [540 + X * k, STREET.hz + (STREET.cam + Y) * k]; };   // Y up negative
export const street = {
  proj: SP,
  place(X, Z, base = 0.9) { const p = SP(X, 0, Z); return { x: p[0], y: p[1], s: base * 180 * (STREET.f / Z) / 280 }; },
  sky(x, { t = 0 } = {}) {
    sky(x, { stops: [[0, '#6E8AB0'], [0.55, '#C8B89A'], [1, '#F2C890']], y0: -M_, y1: STREET.hz + 20 });
    // the water tower + trees on the horizon
    // the water tower: legs and braces, a round tank with a walkway, a cone roof (seen through the haze, so muted)
    const wt = SP(-420, -560, 5200), tw = 44, th = 34, lg = STREET.hz + 4;
    for (const dx of [-0.8, -0.3, 0.3, 0.8]) line(x, [[wt[0] + dx * tw * 0.8, wt[1] + th * 0.5], [wt[0] + dx * tw * 1.15, lg]], 3, '#5E626A');
    for (const k of [0.35, 0.7]) { const y = lerp(wt[1] + th * 0.5, lg, k); line(x, [[wt[0] - tw * (0.66 + 0.3 * k), y], [wt[0] + tw * (0.66 + 0.3 * k), y]], 2, '#5E626A'); }
    line(x, [[wt[0] - tw * 0.7, wt[1] + th * 0.55], [wt[0] + tw * 0.95, lg - 10]], 1.5, '#5E626A'); line(x, [[wt[0] + tw * 0.7, wt[1] + th * 0.55], [wt[0] - tw * 0.95, lg - 10]], 1.5, '#5E626A');
    blob(x, [(g) => { g.beginPath(); g.moveTo(wt[0] - tw, wt[1] - th * 0.5); g.lineTo(wt[0] + tw, wt[1] - th * 0.5); g.lineTo(wt[0] + tw, wt[1] + th * 0.35); g.quadraticCurveTo(wt[0], wt[1] + th * 0.9, wt[0] - tw, wt[1] + th * 0.35); g.closePath(); }], '#8E929A', '#6E727A', { line: 3 });
    blob(x, [(g) => poly(g, [[wt[0] - tw * 1.08, wt[1] - th * 0.5], [wt[0], wt[1] - th * 1.35], [wt[0] + tw * 1.08, wt[1] - th * 0.5]])], '#7A7E86', '#5E626A', { line: 3 });
    line(x, [[wt[0] - tw * 1.12, wt[1] + th * 0.05], [wt[0] + tw * 1.12, wt[1] + th * 0.05]], 2, '#4E525A');
    x.fillStyle = '#5E6E58'; for (let i = 0; i < 26; i++) { const px = -M_ + i * 60 + 20 * h01(i, 2); ell(x, px, STREET.hz - 10 - 18 * h01(i, 3), 40 + 20 * h01(i, 4), 26 + 14 * h01(i, 5)); x.fill(); }
  },
  /** the street, the sidewalks and both rows of shopfronts */
  town(x, { t = 0 } = {}) {
    const { edge, facade } = STREET, zN = 70, zF = 9000;
    const quad = (pts, c) => { poly(x, pts); x.fillStyle = c; x.fill(); };
    quad([SP(-edge, 0, zN), SP(edge, 0, zN), SP(edge, 0, zF), SP(-edge, 0, zF)], '#5E5A56');                // road
    for (const sg of [-1, 1]) quad([SP(sg * edge, 0, zN), SP(sg * facade, -6, zN), SP(sg * facade, -6, zF), SP(sg * edge, 0, zF)], '#A89C8A');   // sidewalks
    for (let z = 260; z < 6000; z *= 1.35) { const a = SP(-6, 0, z), b = SP(6, 0, z), c = SP(6, 0, z * 1.12), d = SP(-6, 0, z * 1.12); poly(x, [a, b, c, d]); x.fillStyle = '#D8C878'; x.fill(); }
    // cracks and litter on the road
    x.save(); x.strokeStyle = 'rgba(40,36,32,0.5)'; x.lineWidth = 2;
    for (let i = 0; i < 18; i++) { const z = 300 + 3000 * h01(i, 7) ** 2, X = (h01(i, 8) - 0.5) * 520, a = SP(X, 0, z); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(a[0] + 30 * STREET.f / z, a[1] + 4); x.stroke(); }
    x.restore();
    // litter: a tipped trash can and its spill, a suitcase, a lone shoe, newspaper pages the wind keeps moving
    const onRoad = (X, Z, w, h, c, rot = 0) => { const p = SP(X, 0, Z), k = STREET.f / Z; x.save(); x.translate(p[0], p[1]); x.rotate(rot); x.beginPath(); x.roundRect(-w * k / 2, -h * k, w * k, h * k, 4 * k); x.fillStyle = c; x.fill(); x.lineWidth = Math.max(1, 3 * k * 0.5); x.strokeStyle = '#2B1D17'; x.stroke(); x.restore(); };
    { const p = SP(-250, 0, 980), k = STREET.f / 980; x.save(); x.translate(p[0], p[1] - 22 * k); x.rotate(1.35); x.beginPath(); x.roundRect(-30 * k, -48 * k, 60 * k, 96 * k, 6 * k); x.fillStyle = '#5A6266'; x.fill(); x.lineWidth = Math.max(1, 1.5 * k); x.strokeStyle = '#2B1D17'; x.stroke(); x.restore();
      for (let i = 0; i < 6; i++) { const q = SP(-190 + i * 22, 0, 960 - i * 30); ell(x, q[0], q[1], 9 * k, 4 * k, 0.3 * i); x.fillStyle = i % 2 ? '#C8C0B0' : '#4A4440'; x.fill(); } }
    onRoad(180, 1150, 80, 52, '#6A3A2A', -0.12); onRoad(70, 760, 26, 12, '#2A2622', 0.4);
    for (let i = 0; i < 7; i++) {
      const z = 420 + 2600 * h01(i, 41) ** 1.4, X = (h01(i, 42) - 0.5) * 520 + ((t * (40 + 30 * h01(i, 43)) + h01(i, 44) * 600) % 600) - 300, p = SP(X, -6 - 10 * Math.abs(Math.sin(t * 2.3 + i)), z), k = STREET.f / z;
      x.save(); x.translate(p[0], p[1]); x.rotate(Math.sin(t * 1.7 + i) * 0.6 + i); x.fillStyle = '#E6E0D2'; x.fillRect(-18 * k, -12 * k, 36 * k, 24 * k);
      x.fillStyle = 'rgba(60,56,52,0.5)'; for (let l = 0; l < 4; l++) x.fillRect(-14 * k, (-8 + l * 5) * k, 28 * k, 1.6 * k); x.restore();
    }
    // shopfronts: segments of facade along each side, back to front
    const shops = [['DINER', '#9A4A3A'], ['PHARMACY', '#5A6E86'], ['HARDWARE', '#8A6A3A'], ['BARBER', '#6A4A5A'], ['BANK', '#7A7468'], ['BOOKS', '#4E6A58'], ['FEED & SEED', '#8E5A3A'], ['BAKERY', '#A07A50']];
    for (const sg of [-1, 1]) {
      let z = 7000, i = sg > 0 ? 3 : 0;
      const segs = [];
      while (z > 180) { const z0 = z / 1.42; segs.push([z0, z, i++]); z = z0; }
      for (const [z0, z1, k] of segs) {
        const [name, col] = shops[k % shops.length], hgt = 330 + 140 * h01(k, sg + 5);
        quad([SP(sg * facade, 0, z0), SP(sg * facade, -hgt, z0), SP(sg * facade, -hgt, z1), SP(sg * facade, 0, z1)], col);
        x.lineWidth = lw(x, 3); x.strokeStyle = '#2B1D17'; poly(x, [SP(sg * facade, 0, z0), SP(sg * facade, -hgt, z0), SP(sg * facade, -hgt, z1), SP(sg * facade, 0, z1)]); x.stroke();
        // windows (upper) and the shop window (lower, dark), an awning
        for (let w = 0; w < 2; w++) { const za = lerp(z0, z1, 0.15 + w * 0.42), zb = lerp(z0, z1, 0.4 + w * 0.42); quad([SP(sg * facade, -hgt + 70, za), SP(sg * facade, -hgt + 170, za), SP(sg * facade, -hgt + 170, zb), SP(sg * facade, -hgt + 70, zb)], '#3A4450'); }
        quad([SP(sg * facade, -20, lerp(z0, z1, 0.1)), SP(sg * facade, -150, lerp(z0, z1, 0.1)), SP(sg * facade, -150, lerp(z0, z1, 0.75)), SP(sg * facade, -20, lerp(z0, z1, 0.75))], '#232A30');
        quad([SP(sg * facade, -170, z0), SP(sg * (facade - 70), -150, z0), SP(sg * (facade - 70), -150, z1), SP(sg * facade, -170, z1)], shadeOf(col, 0.25));
        // a blade sign facing the camera
        const bs = SP(sg * (facade - 30), -230, lerp(z0, z1, 0.5)), k2 = STREET.f / lerp(z0, z1, 0.5), bw = Math.max(20, name.length * 13 * k2 * 0.9), bh = 40 * k2;
        if (bh > 6) {
          x.fillStyle = '#F0E6D0'; x.strokeStyle = '#2B1D17'; x.lineWidth = Math.max(1, 2.5 * k2 * 0.5); x.beginPath(); x.rect(bs[0] - bw / 2, bs[1] - bh / 2, bw, bh); x.fill(); x.stroke();
          x.fillStyle = '#3A2A22'; x.font = `bold ${Math.max(6, 26 * k2)}px Oswald`; x.textAlign = 'center'; x.fillText(name, bs[0], bs[1] + 9 * k2);
        }
      }
      // lamp posts
      for (const z of [420, 900, 2000, 4200]) { const a = SP(sg * (STREET.edge + 40), 0, z), b = SP(sg * (STREET.edge + 40), -380, z); tube(x, [a, b], Math.max(2, 9 * STREET.f / z), '#3A4048', { line: 2 }); }
    }
  },
  /** a vehicle on the street at (X, Z), nose pointing yaw degrees (props.drawVehicle: 3D, grounded, shadowed).
   *  A wreck with fire > 0 also gets flames and a smoke column. x = null: footprint only. */
  vehicle(x, v, t = 0) {
    const r = drawVehicle(x, { ...v, proj: SP, cam: CAM, t });
    if (x && v.fire > 0 && r.fire) flames(x, r.fire, t, v.fire);
    return r;
  },
  /** the street's air for an add layer: dust in the sun and ash drifting down from the fire */
  air(x, t = 0) {
    motes(x, t, { box: [-200, 200, W + 200, H], n: 46, seed: 11, col: '255,226,180', a: 0.4, wind: 12 });
    motes(x, t, { box: [-200, -200, W + 200, H], n: 40, seed: 19, col: '235,230,225', a: 0.55, r: [1.6, 3.2], wind: 22, fall: 38 });
  },
  /** additive light for the vehicles (draw on a { blend: 'add' } layer): flashing light bars, fire glow and spill */
  vehicleGlows(x, list, t = 0, { fire = true } = {}) {
    for (const v of list) {
      const r = drawVehicle(null, { ...v, proj: SP, cam: CAM, t }), sc = STREET.f / Math.max(120, v.Z);
      if (v.lights > 0) {
        const p = SP(v.X, -134, v.Z), on_ = Math.floor(t * 2.4) % 2, rgb = on_ ? '70,120,255' : '255,70,60';
        glow(x, p[0], p[1], 120 * sc, 0.9 * v.lights, rgb, 0.3);
        const g = SP(v.X, 0, v.Z); x.save(); x.translate(g[0], g[1]); x.scale(1, 0.28); glow(x, 0, 0, 420 * sc, 0.45 * v.lights, rgb, 0.1); x.restore();
      }
      if (v.fire > 0 && fire) {
        const f = SP(v.X, -90, v.Z), fl = 0.8 + 0.2 * Math.sin(t * 17) * Math.sin(t * 5.3 + 1);
        glow(x, f[0], f[1], 260 * sc, 0.75 * v.fire * fl, '255,140,50', 0.25);
        const g = SP(v.X, 0, v.Z); x.save(); x.translate(g[0], g[1]); x.scale(1, 0.3); glow(x, 0, 0, 700 * sc, 0.35 * v.fire * fl, '255,120,40', 0.08); x.restore();
      }
    }
  },
};
const CAM = { X: 0, Y: -STREET.cam, Z: 0 };
/** flames (flickering tongues) and a smoke column that rises and drifts with the wind */
function flames(x, [fx, fy, r], t, k) {
  // smoke first (behind the flames): soft blobs that rise, grow and fade
  for (let i = 0; i < 26; i++) {
    const age = (t * 0.2 + i / 26) % 1, rise = age * r * 9, sz = r * (0.45 + age * 1.9);
    const sx = fx + Math.sin(i * 2.3 + t * 0.7) * r * 0.3 + age * age * r * 2.6, sy = fy - r * 0.4 - rise;
    const c = mixHex('#2A2624', '#8A847C', age), gr = x.createRadialGradient(sx, sy, 0, sx, sy, sz);
    gr.addColorStop(0, rgba(c, 0.42 * k * (1 - age) * Math.min(1, age * 5))); gr.addColorStop(0.6, rgba(c, 0.22 * k * (1 - age) * Math.min(1, age * 5))); gr.addColorStop(1, rgba(c, 0));
    circ(x, sx, sy, sz); x.fillStyle = gr; x.fill();
  }
  // embers: sparks that rise with the heat and wink out
  for (let i = 0; i < 10; i++) {
    const age = (t * 0.55 + h01(i, 31)) % 1, ex = fx + (h01(i, 32) - 0.5) * r * 1.2 + Math.sin(t * 3 + i) * r * 0.2 + age * r * 0.8, ey = fy - r * 0.5 - age * r * 4;
    circ(x, ex, ey, Math.max(0.8, r * 0.035 * (1 - age))); x.fillStyle = rgba('#FFC060', 0.9 * (1 - age)); x.fill();
  }
  // flame tongues: tall teardrops that flicker
  const tongue = (cx, h, w, col) => { x.beginPath(); x.moveTo(cx - w, fy); x.quadraticCurveTo(cx - w * 0.9, fy - h * 0.55, cx + Math.sin(t * 9 + cx) * w * 0.4, fy - h); x.quadraticCurveTo(cx + w * 0.9, fy - h * 0.55, cx + w, fy); x.closePath(); x.fillStyle = col; x.fill(); };
  for (let i = -2; i <= 2; i++) {
    const cx = fx + i * r * 0.32, h = r * (0.9 + 0.5 * Math.abs(Math.sin(t * 11 + i * 1.7)) - 0.15 * Math.abs(i)) * k;
    tongue(cx, h, r * 0.24, '#E8622A'); tongue(cx, h * 0.66, r * 0.15, '#FFB040'); tongue(cx, h * 0.34, r * 0.08, '#FFF0B0');
  }
}
// ------------------------------------------------------------------------------------------------ inside the police car (episode 2)
// Two camera setups inside the crashed police car, each split by depth: what's OUTSIDE the glass (the street), the
// CABIN around the glass (an opaque frame with the windows cut out, so the dead pressed on the glass sit between the two
// layers), the seat and the cage in front, and the GLOWS (the light bar's red/blue strobe, the dash lights).
//   fwd:  from the back seat, through the open slot of the cage partition, over your shoulder: the windshield, the dash,
//         the radio, the light-bar switches, the mounted laptop, the pillar spotlight
//   side: from the passenger seat, across at you and the driver's window: the door (lock post, armrest, handle, the
//         window crank, a speaker, the map pocket), the seat belt, the wheel
// Surfaces are big, so they get gradients for volume (lit from the glass) on top of the house ink line, and wear:
// vinyl seams, a split in the seat, a cracked dash pad, papers, scuffs.
const VINYL = '#5E5248', VINYL_D = '#3E3530', CHROME = '#C6CACE';
export const CAR = {
  fwd: { dash: 1090, wheel: [330, 1265, 188], ignition: [560, 1352], radio: [655, 1262], mic: [868, 1352], sw: [655, 1360],
    mirror: [560, 360], laptop: [905, 1190], spot: [22, 560] },
  side: { sill: 1010, crank: [390, 1320], handle: [730, 1135], lock: [170, 1000] },
};
CAR.fwd.glassPath = (g) => { g.beginPath(); g.moveTo(60, 392); g.quadraticCurveTo(540, 292, 1020, 392); g.lineTo(1150, 1068); g.quadraticCurveTo(540, 1124, -70, 1068); g.closePath(); };
CAR.side.glassPath = (g) => { g.beginPath(); g.moveTo(70, 430); g.quadraticCurveTo(70, 392, 112, 392); g.lineTo(720, 380); g.quadraticCurveTo(930, 400, 1012, 690); g.lineTo(1012, 1010); g.lineTo(70, 1010); g.closePath(); };
// rough polygons of the glass (for clue/face checks and the sheen)
CAR.fwd.glass = [[60, 392], [1020, 392], [1150, 1068], [-70, 1068]];
CAR.side.glass = [[70, 392], [940, 420], [1012, 1010], [70, 1010]];

/** the light bar's strobe: [rgb, on 0..1] at time t (red and blue alternating, 2.4 flashes a second, like the street's
 *  vehicleGlows). weak 0..1 makes it dim and stutter (the battery dying). */
export function strobe(t, weak = 0) {
  const ph = t * 2.4, on_ = Math.floor(ph) % 2, f = ph - Math.floor(ph);
  let k = Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.25)), 0.5);
  if (weak > 0) k *= 1 - weak * (0.55 + 0.45 * (h01(Math.floor(ph * 3), 23) > 0.6 ? 1 : 0));
  return [on_ ? '70,120,255' : '255,70,60', k];
}
const lgrad = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) g.addColorStop(o, c); return g; };
/** a big surface: the path filled with a gradient (volume), then the house ink line */
function panel(x, path, fill, { line: w = 5 } = {}) {
  path(x); x.fillStyle = fill; x.fill();
  if (w > 0) { path(x); x.lineJoin = 'round'; x.lineWidth = lw(x, w); x.strokeStyle = '#2B1D17'; x.stroke(); }
}
const stitch = (x, pts, col = 'rgba(220,200,180,0.35)', w = 2.2) => { x.save(); x.setLineDash([9, 7]); line(x, pts, w, col); x.restore(); };
export const car = {
  // ---------------------------------------------------------------- fwd: over your shoulder toward the windshield
  /** OUTSIDE the windshield: Main Street ahead (the street set raised so its horizon sits near y 740) and the police
   *  car's own white hood with its black stripe at the bottom of the glass */
  fwdOutside(x, { t = 0 } = {}) {
    x.save(); x.transform(1.12, 0, 0, 1.12, -65, -335); street.sky(x, { t }); street.town(x, { t }); x.restore();
    panel(x, (g) => { g.beginPath(); g.moveTo(-M_, 1160); g.lineTo(-M_, 975); g.quadraticCurveTo(540, 905, W + M_, 975); g.lineTo(W + M_, 1160); g.closePath(); },
      lgrad(x, 0, 905, 0, 1100, [[0, '#F4F5F6'], [0.5, '#D6D9DE'], [1, '#A8ADB4']]), { line: 4 });
    x.save(); x.globalAlpha = 0.5; line(x, [[60, 1000], [540, 950], [1020, 1000]], 3, '#8A9098'); x.restore();      // the hood's crease
  },
  /** the CABIN around the windshield. dash 0..1 = dash lights; lightsOn = the light-bar switch; key = a key in the
   *  ignition; radio 0..1 = the radio's display */
  fwdCabin(x, { t = 0, dash = 0, lightsOn = 1, key = 0, radio = 0 } = {}) {
    const C = CAR.fwd, gp = C.glassPath;
    // the glass's own tint band along the top (the sun strip) and the rubber seal
    x.save(); gp(x); x.clip(); x.fillStyle = lgrad(x, 0, 300, 0, 470, [[0, 'rgba(40,70,80,0.55)'], [1, 'rgba(40,70,80,0)']]); x.fillRect(-M_, 280, W + 2 * M_, 200); x.restore();
    // roof lining, pillars and dash in one even-odd shape (the glass cut out), lit from the glass
    x.save(); x.beginPath(); x.rect(-M_, -M_, W + 2 * M_, H + 2 * M_); x.moveTo(60, 392); x.lineTo(-70, 1068); x.quadraticCurveTo(540, 1124, 1150, 1068); x.lineTo(1020, 392); x.quadraticCurveTo(540, 292, 60, 392); x.closePath();
    x.fillStyle = lgrad(x, 0, 0, 0, H, [[0, '#3E3A36'], [0.16, '#6A645C'], [0.5, '#4A4540'], [1, '#26231F']]); x.fill('evenodd'); x.restore();
    gp(x); x.lineWidth = lw(x, 12); x.strokeStyle = '#16140F'; x.stroke();
    // the roof: a padded lining with a dome light, two sun visors folded down at an angle, a ticket book under the strap
    for (let i = 0; i < 5; i++) line(x, [[-M_, 80 + i * 46], [W + M_, 80 + i * 46 + (i - 2) * 3]], 2, 'rgba(30,26,22,0.18)');
    panel(x, (g) => { g.beginPath(); g.roundRect(480, 150, 120, 56, 14); }, lgrad(x, 0, 150, 0, 206, [[0, '#E8E2D4'], [1, '#B8B0A0']]), { line: 4 });
    const visor = (pts, col) => panel(x, (g) => poly(g, pts), lgrad(x, 0, pts[0][1], 0, pts[2][1], [[0, shadeOf(col, 0.1)], [1, col]]), { line: 5 });
    visor([[70, 268], [440, 250], [430, 352], [96, 378]], '#7A7268');
    visor([[640, 250], [1010, 268], [985, 378], [650, 352]], '#7A7268');
    panel(x, (g) => { g.beginPath(); g.moveTo(170, 286); g.lineTo(300, 280); g.lineTo(296, 352); g.lineTo(176, 360); g.closePath(); }, '#EDE6D2', { line: 3 });   // the ticket book
    for (let i = 0; i < 4; i++) line(x, [[186, 300 + i * 13], [284, 296 + i * 13]], 2, 'rgba(60,50,40,0.45)');
    line(x, [[150, 300], [330, 290]], 9, '#2A2420');                                                   // the visor's strap over it
    // the rear-view mirror on its stem
    tube(x, [[560, 300], [560, 336]], 18, '#2A2622', { line: 4 });
    panel(x, (g) => { g.beginPath(); g.roundRect(430, 330, 260, 74, 30); }, '#24211E', { line: 5 });
    panel(x, (g) => { g.beginPath(); g.roundRect(444, 342, 232, 50, 22); }, lgrad(x, 444, 342, 676, 392, [[0, '#9AA6B0'], [0.5, '#C8D0D6'], [1, '#6E7A84']]), { line: 0 });
    // the pillars: thick, rounded, darker at the edges; the spotlight on the left one, its handle reaching in
    for (const sg of [-1, 1]) {
      const a = sg < 0 ? [60, 392] : [1020, 392], b = sg < 0 ? [-70, 1068] : [1150, 1068];
      panel(x, (g) => poly(g, [a, b, [b[0] + sg * 140, b[1] + 40], [a[0] + sg * 90, a[1] - 10]]), lgrad(x, a[0], 0, a[0] + sg * 120, 0, [[0, '#6A645C'], [1, '#2E2A26']]), { line: 5 });
    }
    const [spx, spy] = C.spot;
    tube(x, [[spx + 10, spy + 34], [spx + 40, spy + 150], [spx + 92, spy + 214]], 20, '#3A3632', { line: 4 });
    panel(x, (g) => { g.beginPath(); g.roundRect(spx + 72, spy + 204, 56, 32, 14); }, '#1E1C1A', { line: 4 });   // the grip
    panel(x, (g) => ell(g, spx, spy, 40, 44), lgrad(x, spx - 40, 0, spx + 40, 0, [[0, '#E2E6EA'], [1, '#7A7E84']]), { line: 5 });
    panel(x, (g) => ell(g, spx + 4, spy, 26, 30), lgrad(x, spx - 20, spy - 26, spx + 26, spy + 26, [[0, '#FFFBEA'], [1, '#B8B4A4']]), { line: 3 });
    // the dash: the top (lit by the glass, a cracked pad, papers), the binnacle behind the wheel, the centre stack
    panel(x, (g) => { g.beginPath(); g.moveTo(-M_, 1080); g.quadraticCurveTo(540, 1140, W + M_, 1080); g.lineTo(W + M_, 1190); g.quadraticCurveTo(540, 1236, -M_, 1190); g.closePath(); },
      lgrad(x, 0, 1084, 0, 1236, [[0, '#7A7268'], [0.45, '#4E4842'], [1, '#2E2A26']]), { line: 5 });
    line(x, [[380, 1118], [440, 1132], [470, 1126], [530, 1146]], 3, 'rgba(20,16,12,0.7)');               // a crack in the dash pad
    for (const [px, py, r, c] of [[700, 1112, -0.08, '#F0EBDD'], [760, 1104, 0.06, '#E6E0D0'], [820, 1116, -0.02, '#EDE8DA']]) {     // papers on the dash
      x.save(); x.translate(px, py); x.rotate(r); x.transform(1, 0, -0.5, 0.42, 0, 0);
      panel(x, (g) => { g.beginPath(); g.rect(-60, -70, 120, 150); }, c, { line: 3 });
      for (let i = 0; i < 6; i++) line(x, [[-44, -46 + i * 20], [40, -46 + i * 20]], 3, 'rgba(70,60,50,0.4)');
      x.restore();
    }
    panel(x, (g) => { g.beginPath(); g.moveTo(-M_, 1190); g.quadraticCurveTo(540, 1236, W + M_, 1190); g.lineTo(W + M_, H + M_); g.lineTo(-M_, H + M_); g.closePath(); },
      lgrad(x, 0, 1190, 0, 1500, [[0, '#3A3632'], [1, '#1E1C1A']]), { line: 0 });
    panel(x, (g) => { g.beginPath(); g.moveTo(150, 1230); g.quadraticCurveTo(330, 1120, 510, 1230); g.lineTo(510, 1300); g.lineTo(150, 1300); g.closePath(); }, lgrad(x, 0, 1140, 0, 1300, [[0, '#4A4540'], [1, '#26231F']]), { line: 5 });
    for (const gx of [270, 390]) { panel(x, (g) => circ(g, gx, 1252, 40), mixHex('#121110', '#3A2A14', dash), { line: 4 });
      for (let k = 0; k < 7; k++) { const a = -2.6 + k * 0.62; line(x, [[gx + Math.cos(a) * 30, 1252 + Math.sin(a) * 30], [gx + Math.cos(a) * 36, 1252 + Math.sin(a) * 36]], 2, 'rgba(230,220,200,0.5)'); }
      line(x, [[gx, 1252], [gx + Math.cos(-2.4 + dash * 1.6) * 30, 1252 + Math.sin(-2.4 + dash * 1.6) * 30]], 4, mixHex('#8A4A2A', '#FFB050', dash)); }
    // the centre stack: two vents, the radio (a segment display, no numbers), the light-bar switch panel, the ignition
    const [rx, ry] = C.radio;
    for (const vx of [rx - 70, rx + 70]) { panel(x, (g) => { g.beginPath(); g.roundRect(vx - 56, ry - 96, 112, 46, 8); }, '#1A1816', { line: 4 }); for (let i = 1; i < 4; i++) line(x, [[vx - 48, ry - 96 + i * 11.5], [vx + 48, ry - 96 + i * 11.5]], 3, '#3A3632'); }
    panel(x, (g) => { g.beginPath(); g.roundRect(rx - 140, ry - 40, 280, 84, 10); }, lgrad(x, 0, ry - 40, 0, ry + 44, [[0, '#4A4844'], [1, '#2A2826']]), { line: 5 });
    panel(x, (g) => { g.beginPath(); g.roundRect(rx - 104, ry - 24, 150, 40, 6); }, mixHex('#141210', '#F0A848', radio), { line: 3 });
    if (radio > 0.05) { x.save(); x.globalAlpha = radio; x.fillStyle = '#5A3008'; for (let i = 0; i < 5; i++) x.fillRect(rx - 94 + i * 27, ry - 16, 17, 24); x.restore(); }
    for (const [kx, ky, kr] of [[rx + 92, ry - 4, 22], [rx + 92, ry + 30, 12], [rx - 124, ry + 26, 10]]) panel(x, (g) => circ(g, kx, ky, kr), lgrad(x, kx - kr, ky - kr, kx + kr, ky + kr, [[0, '#9A9690'], [1, '#4A4642']]), { line: 3 });
    const [sx, sy] = C.sw;
    panel(x, (g) => { g.beginPath(); g.roundRect(sx - 150, sy - 38, 300, 76, 10); }, lgrad(x, 0, sy - 38, 0, sy + 38, [[0, '#3E3C38'], [1, '#22201E']]), { line: 5 });
    for (let i = 0; i < 4; i++) { const px = sx - 104 + i * 56, up = i === 0 ? lightsOn : 0.15;           // switch 1 = the light bar
      panel(x, (g) => { g.beginPath(); g.roundRect(px - 14, sy - 24, 28, 48, 6); }, '#151413', { line: 3 });
      panel(x, (g) => { g.beginPath(); g.roundRect(px - 9, sy - 20 + (1 - up) * 22, 18, 18, 4); }, i === 0 ? '#E8E6DE' : '#9A9894', { line: 2 }); }
    for (const [lx, c] of [[sx + 104, '#FF4A3A'], [sx + 130, '#4A7AFF']]) { panel(x, (g) => circ(g, lx, sy - 14, 9), lightsOn ? c : '#2A2826', { line: 2 }); }
    const [ix, iy] = C.ignition;
    panel(x, (g) => circ(g, ix, iy, 24), lgrad(x, ix - 24, iy - 24, ix + 24, iy + 24, [[0, '#E2E6EA'], [1, '#6E7278']]), { line: 4 });
    circ(x, ix, iy, 12); x.fillStyle = '#121110'; x.fill(); x.fillStyle = '#5A5650'; x.fillRect(ix - 2.5, iy - 9, 5, 18);
    if (key > 0) drawKeys(x, { cx: ix, cy: iy - 10, s: 0.75, swing: 0.15 * Math.sin(t * 5) });
    // the mounted laptop on its arm (passenger side), lid up, screen dead; the mic on its clip, the coiled cord
    const [lx_, ly_] = C.laptop;
    tube(x, [[lx_ - 10, ly_ + 150], [lx_ - 40, ly_ + 60]], 26, '#2A2826', { line: 4 });
    panel(x, (g) => poly(g, [[lx_ - 150, ly_ + 40], [lx_ + 130, ly_ + 20], [lx_ + 170, ly_ + 90], [lx_ - 120, ly_ + 116]]), lgrad(x, 0, ly_ + 20, 0, ly_ + 116, [[0, '#4A4844'], [1, '#2A2826']]), { line: 5 });
    panel(x, (g) => poly(g, [[lx_ - 140, ly_ - 150], [lx_ + 120, ly_ - 180], [lx_ + 130, ly_ + 22], [lx_ - 150, ly_ + 40]]), '#2E2C2A', { line: 5 });
    panel(x, (g) => poly(g, [[lx_ - 122, ly_ - 134], [lx_ + 104, ly_ - 160], [lx_ + 112, ly_ + 6], [lx_ - 130, ly_ + 24]]), lgrad(x, lx_ - 120, ly_ - 150, lx_ + 110, ly_ + 20, [[0, '#2A3440'], [0.5, '#141A20'], [1, '#0C0E12']]), { line: 3 });
    x.save(); x.globalAlpha = 0.25; poly(x, [[lx_ - 100, ly_ - 128], [lx_ - 40, ly_ - 136], [lx_ - 96, ly_ + 14], [lx_ - 124, ly_ + 18]]); x.fillStyle = '#C8D4DE'; x.fill(); x.restore();   // a reflection on the dead screen
    const [mx, my] = C.mic;
    x.save(); x.lineWidth = lw(x, 6); x.strokeStyle = '#121110'; x.beginPath();
    for (let i = 0; i <= 44; i++) { const u = i / 44, px = lerp(rx + 140, mx, u), py = lerp(ry + 30, my + 70, u) + Math.sin(u * Math.PI) * 70, cx = px + Math.cos(i * 1.9) * 9, cy = py + Math.sin(i * 1.9) * 5; i ? x.lineTo(cx, cy) : x.moveTo(cx, cy); }
    x.stroke(); x.restore();
    panel(x, (g) => { g.beginPath(); g.roundRect(mx - 32, my - 48, 64, 104, 24); }, lgrad(x, mx - 32, 0, mx + 32, 0, [[0, '#4A4844'], [1, '#1E1C1A']]), { line: 4 });
    panel(x, (g) => { g.beginPath(); g.roundRect(mx - 42, my - 10, 14, 34, 5); }, '#6A6660', { line: 3 });
    for (let i = 0; i < 3; i++) line(x, [[mx - 14, my - 30 + i * 9], [mx + 14, my - 30 + i * 9]], 2, '#6A6660');
    // the steering wheel: a thick rim lit along its top, three spokes, the horn pad, the column
    const [wx, wy, wr] = C.wheel;
    tube(x, [[wx + 10, wy + 40], [wx + 40, wy + 300]], 76, '#24211E', { line: 5 });
    x.save(); x.beginPath(); x.ellipse(wx, wy, wr, wr * 0.9, -0.06, 0, TAU); x.lineWidth = lw(x, 52); x.strokeStyle = '#2B1D17'; x.stroke(); x.lineWidth = lw(x, 40); x.strokeStyle = '#2A2724'; x.stroke();
    x.beginPath(); x.ellipse(wx, wy, wr, wr * 0.9, -0.06, Math.PI * 1.08, Math.PI * 1.9); x.lineWidth = lw(x, 10); x.strokeStyle = 'rgba(210,200,185,0.45)'; x.stroke(); x.restore();
    for (const a of [Math.PI * 1.02, -0.02, Math.PI / 2]) tube(x, [[wx, wy], [wx + Math.cos(a) * wr * 0.93, wy + Math.sin(a) * wr * 0.84]], 32, '#2E2B28', { line: 4 });
    panel(x, (g) => ell(g, wx, wy, 70, 58), lgrad(x, 0, wy - 58, 0, wy + 58, [[0, '#4A4642'], [1, '#22201E']]), { line: 5 });
    return C;
  },
  /** the front bench seat's back, seen from the back seat: draw it IN FRONT of you (it hides you below the shoulders).
   *  Worn brown vinyl with seams and a split showing the foam. top = its top edge (y) */
  fwdBench(x, { top = 1400 } = {}) {
    const path = (g) => { g.beginPath(); g.moveTo(-M_, H + M_); g.lineTo(-M_, top + 70); g.quadraticCurveTo(-60, top - 6, 200, top + 4); g.quadraticCurveTo(540, top + 30, 880, top + 4); g.quadraticCurveTo(1140, top - 6, W + M_, top + 70); g.lineTo(W + M_, H + M_); g.closePath(); };
    panel(x, path, lgrad(x, 0, top, 0, top + 420, [[0, '#7A6A5C'], [0.12, VINYL], [1, VINYL_D]]), { line: 6 });
    x.save(); path(x); x.clip();
    line(x, [[-M_, top + 34], [W + M_, top + 34]], 3, 'rgba(240,220,200,0.25)');                       // the lit roll along the top
    for (const sx of [120, 330, 540, 750, 960]) { line(x, [[sx, top + 60], [sx + (sx - 540) * 0.08, H + 100]], 5, 'rgba(30,24,20,0.5)'); stitch(x, [[sx + 9, top + 64], [sx + 9 + (sx - 540) * 0.08, H + 100]]); }
    x.restore();
  },
  /** the cage partition between the seats, right at the lens: a steel lower panel with rivets and a diamond mesh at
   *  the sides (the slot in the middle is open). Put it on a layer with depth of field so it reads as near and soft. */
  fwdCage(x, { top = 1500 } = {}) {
    panel(x, (g) => { g.beginPath(); g.rect(-M_, top, W + 2 * M_, H + M_ - top); }, lgrad(x, 0, top, 0, H, [[0, '#3A3C40'], [1, '#1A1B1E']]), { line: 6 });
    for (let i = 0; i < 9; i++) { circ(x, 60 + i * 120, top + 34, 7); x.fillStyle = '#5A5C60'; x.fill(); }
    for (const [x0, x1] of [[-M_, 130], [950, W + M_]]) {
      x.save(); x.beginPath(); x.rect(x0, -M_, x1 - x0, top + M_); x.clip();
      x.strokeStyle = 'rgba(20,20,22,0.85)'; x.lineWidth = 7;
      for (let k = -30; k < 30; k++) { x.beginPath(); x.moveTo(x0 + k * 70, -M_); x.lineTo(x0 + k * 70 + 2300, 2300 - M_); x.stroke(); x.beginPath(); x.moveTo(x0 + k * 70, -M_); x.lineTo(x0 + k * 70 - 2300, 2300 - M_); x.stroke(); }
      x.restore();
    }
    for (const bx of [130, 950]) tube(x, [[bx, -M_], [bx, top]], 30, '#2E3034', { line: 5 });
  },
  /** the cabin's light for an add layer: the strobe washing through the glass, sun on the dash, dash and radio glow */
  fwdGlows(x, { t = 0, lightsOn = 1, weak = 0, dash = 0, radio = 0 } = {}) {
    glow(x, 760, 1110, 520, 0.16, '255,220,170', 0.2);                                                      // sun on the dash top
    if (lightsOn > 0) { const [rgb, k] = strobe(t, weak); glow(x, 540, 620, 900, 0.36 * k * lightsOn, rgb, 0.08); glow(x, 540, 1080, 700, 0.2 * k * lightsOn, rgb, 0.1); }
    if (dash > 0) { glow(x, 270, 1252, 80, 0.5 * dash, '255,170,80', 0.3); glow(x, 390, 1252, 80, 0.5 * dash, '255,170,80', 0.3); }
    if (radio > 0) { const [rx, ry] = CAR.fwd.radio; glow(x, rx - 29, ry - 4, 160, 0.65 * radio, '255,176,80', 0.25); glow(x, rx, ry - 200, 520, 0.14 * radio, '255,176,80', 0.1); }
    glow(x, CAR.fwd.spot[0] + 4, CAR.fwd.spot[1], 50, 0.16, '255,250,230', 0.3);
    motes(x, t, { box: [100, 400, 1000, 1100], n: 26, seed: 29, col: '255,236,210', a: 0.3, wind: 4 });
  },

  // ---------------------------------------------------------------- side: from the passenger seat
  /** OUTSIDE the driver's window: the shopfronts on the left side of Main Street, close */
  sideOutside(x, { t = 0 } = {}) {
    x.save(); x.transform(3.0, 0, 0, 3.0, -450, -2160); street.sky(x, { t }); street.town(x, { t }); x.restore();
  },
  /** the CABIN seen from the passenger seat: the roof with a grab handle, the B-pillar and the seat belt, the window's
   *  ledge with the lock post, the door (armrest, the inside handle, a window crank, a speaker, the map pocket).
   *  win 0..1 = the window wound down (0 = shut: glass in the frame); the crank turns as it winds */
  sideCabin(x, { t = 0, win = 0 } = {}) {
    const C = CAR.side, gp = C.glassPath;
    x.save(); x.beginPath(); x.rect(-M_, -M_, W + 2 * M_, H + 2 * M_); x.moveTo(70, 430); x.lineTo(70, 1010); x.lineTo(1012, 1010); x.lineTo(1012, 690); x.quadraticCurveTo(930, 400, 720, 380); x.lineTo(112, 392); x.quadraticCurveTo(70, 392, 70, 430); x.closePath();
    x.fillStyle = lgrad(x, 0, 0, 0, H, [[0, '#3E3A36'], [0.18, '#625C54'], [0.5, '#4A4540'], [1, '#26231F']]); x.fill('evenodd'); x.restore();
    gp(x); x.lineWidth = lw(x, 12); x.strokeStyle = '#16140F'; x.stroke();
    for (let i = 0; i < 5; i++) line(x, [[-M_, 70 + i * 52], [W + M_, 74 + i * 52]], 2, 'rgba(30,26,22,0.18)');            // the roof lining
    x.save(); x.beginPath(); x.moveTo(380, 312); x.quadraticCurveTo(470, 250, 560, 312); x.lineWidth = lw(x, 30); x.strokeStyle = '#2B1D17'; x.stroke(); x.lineWidth = lw(x, 20); x.strokeStyle = '#6A6258'; x.stroke(); x.restore();  // grab handle
    // the B-pillar at the left with the seat belt hanging from its ring
    panel(x, (g) => { g.beginPath(); g.moveTo(-M_, 300); g.lineTo(66, 330); g.lineTo(66, 1030); g.lineTo(-M_, 1060); g.closePath(); }, lgrad(x, -100, 0, 66, 0, [[0, '#2A2622'], [1, '#5A544C']]), { line: 5 });
    panel(x, (g) => { g.beginPath(); g.roundRect(14, 470, 44, 30, 8); }, CHROME, { line: 3 });
    panel(x, (g) => poly(g, [[22, 490], [50, 490], [104, 1120], [74, 1124]]), lgrad(x, 30, 0, 100, 0, [[0, '#3A3E46'], [1, '#22252A']]), { line: 3 });
    // the window's ledge (a chrome strip), the lock post
    panel(x, (g) => { g.beginPath(); g.moveTo(-M_, 1010); g.lineTo(W + M_, 1010); g.lineTo(W + M_, 1066); g.lineTo(-M_, 1072); g.closePath(); }, lgrad(x, 0, 1010, 0, 1072, [[0, '#7A7268'], [1, '#3E3A36']]), { line: 5 });
    line(x, [[-M_, 1016], [W + M_, 1016]], 5, CHROME);
    const [lkx, lky] = C.lock; panel(x, (g) => { g.beginPath(); g.roundRect(lkx - 9, lky - 38, 18, 44, 8); }, lgrad(x, lkx - 9, 0, lkx + 9, 0, [[0, '#E2E6EA'], [1, '#8A8E94']]), { line: 3 });
    // the door panel: in shade (the light comes through the window above it), worn vinyl, seams
    const door = (g) => { g.beginPath(); g.moveTo(-M_, 1070); g.lineTo(W + M_, 1066); g.lineTo(W + M_, H + M_); g.lineTo(-M_, H + M_); g.closePath(); };
    panel(x, door, lgrad(x, 0, 1066, 0, 1900, [[0, '#5A524A'], [0.3, '#4A4038'], [1, '#2A2420']]), { line: 0 });
    x.save(); door(x); x.clip();
    for (const yy of [1420, 1700]) { line(x, [[-M_, yy], [W + M_, yy - 6]], 4, 'rgba(25,20,16,0.5)'); stitch(x, [[-M_, yy + 10], [W + M_, yy + 4]]); }
    for (let i = 0; i < 4; i++) line(x, [[120 + i * 210, 1480], [150 + i * 210, 1560]], 3, 'rgba(200,180,160,0.12)');      // scuffs
    x.restore();
    // the armrest: a long padded bar with the handle's chrome recess above it
    panel(x, (g) => { g.beginPath(); g.moveTo(40, 1205); g.quadraticCurveTo(520, 1180, 1000, 1200); g.lineTo(1000, 1270); g.quadraticCurveTo(520, 1262, 40, 1282); g.closePath(); }, lgrad(x, 0, 1182, 0, 1282, [[0, '#7A6E62'], [0.35, '#5E5448'], [1, '#332C26']]), { line: 5 });
    stitch(x, [[60, 1215], [520, 1194], [980, 1210]]);
    const [hx, hy] = C.handle;
    panel(x, (g) => { g.beginPath(); g.roundRect(hx - 80, hy - 30, 160, 60, 24); }, '#1E1A16', { line: 4 });
    panel(x, (g) => { g.beginPath(); g.roundRect(hx - 62, hy - 14, 124, 26, 12); }, lgrad(x, 0, hy - 14, 0, hy + 12, [[0, '#EEF0F2'], [1, '#8A8E94']]), { line: 3 });
    // the window crank (it turns as the window winds), a speaker grille, the map pocket with a folded map and papers
    const [cx, cy] = C.crank, a = -0.6 + win * 9;
    panel(x, (g) => circ(g, cx, cy, 36), lgrad(x, cx - 36, cy - 36, cx + 36, cy + 36, [[0, '#E2E6EA'], [1, '#6E7278']]), { line: 4 });
    tube(x, [[cx, cy], [cx + Math.cos(a) * 92, cy + Math.sin(a) * 92]], 18, '#C8CCD0', { line: 4 });
    panel(x, (g) => circ(g, cx + Math.cos(a) * 92, cy + Math.sin(a) * 92, 22), lgrad(x, 0, cy - 20, 0, cy + 20, [[0, '#4A4642'], [1, '#1A1816']]), { line: 4 });
    panel(x, (g) => circ(g, 760, 1560, 88), '#2A2622', { line: 5 });
    for (let i = 0; i < 40; i++) { const r = 74 * Math.sqrt(h01(i, 3)), an = i * 2.4; circ(x, 760 + Math.cos(an) * r, 1560 + Math.sin(an) * r, 5); x.fillStyle = '#121010'; x.fill(); }
    panel(x, (g) => { g.beginPath(); g.moveTo(90, 1600); g.lineTo(560, 1592); g.lineTo(560, 1700); g.quadraticCurveTo(320, 1720, 90, 1702); g.closePath(); }, '#3A322C', { line: 5 });
    panel(x, (g) => poly(g, [[150, 1600], [190, 1530], [330, 1546], [300, 1606]]), '#E8E0C8', { line: 3 });         // the papers
    panel(x, (g) => poly(g, [[300, 1602], [330, 1518], [470, 1528], [450, 1604]]), '#C8B890', { line: 3 });         // the folded map
    for (let i = 1; i < 4; i++) line(x, [[330 + i * 34, 1522], [310 + i * 36, 1602]], 2, 'rgba(90,70,40,0.5)');
    // the glass, wound down by win (its top edge drops into the door)
    if (win < 1) { const top = lerp(392, C.sill, win); x.save(); gp(x); x.clip();
      x.fillStyle = 'rgba(200,215,230,0.04)'; x.fillRect(0, top, W, C.sill - top); line(x, [[60, top + 4], [W, top + 10]], 6, 'rgba(230,240,250,0.55)'); x.restore(); }
    return C;
  },
  /** the driver's seat back seen from the passenger side (behind you, toward the door): draw it BEFORE you */
  sideSeat(x, { cx = 520, top = 980 } = {}) {
    const p = (g) => { g.beginPath(); g.moveTo(cx - 250, H + M_); g.lineTo(cx - 250, top + 60); g.quadraticCurveTo(cx - 250, top, cx - 180, top); g.lineTo(cx - 70, top + 10); g.quadraticCurveTo(cx - 20, top + 20, cx - 40, top + 120); g.lineTo(cx - 60, H + M_); g.closePath(); };
    panel(x, p, lgrad(x, cx - 250, 0, cx - 30, 0, [[0, VINYL_D], [0.7, VINYL], [1, '#7A6A5C']]), { line: 6 });
    x.save(); p(x); x.clip(); for (const sx of [cx - 190, cx - 120]) stitch(x, [[sx, top + 40], [sx - 10, H]]); x.restore();
    panel(x, (g) => { g.beginPath(); g.roundRect(cx - 230, top + 560, 560, 160, 60); }, lgrad(x, 0, top + 560, 0, top + 720, [[0, '#7A6A5C'], [0.3, VINYL], [1, VINYL_D]]), { line: 6 });
  },
  /** the passenger end of the bench, right at the lens along the bottom of the side view (it hides your lap): put it
   *  on a near layer with a little depth of field. top = its top edge (y) */
  sideNear(x, { top = 1470 } = {}) {
    const p = (g) => { g.beginPath(); g.moveTo(-M_, H + M_); g.lineTo(-M_, top + 30); g.quadraticCurveTo(540, top - 30, W + M_, top + 30); g.lineTo(W + M_, H + M_); g.closePath(); };
    panel(x, p, lgrad(x, 0, top - 30, 0, top + 300, [[0, '#7A6A5C'], [0.15, VINYL], [1, VINYL_D]]), { line: 6 });
    x.save(); p(x); x.clip(); line(x, [[-M_, top + 26], [W + M_, top + 26]], 4, 'rgba(240,220,200,0.22)');
    for (const sx of [200, 540, 880]) stitch(x, [[sx, top + 50], [sx + (sx - 540) * 0.2, H + 100]]); x.restore();
  },
  /** the dash's end and the steering wheel at the screen's right, in front of your legs: draw it AFTER you */
  sideDash(x, {} = {}) {
    panel(x, (g) => { g.beginPath(); g.moveTo(800, 1080); g.quadraticCurveTo(880, 1000, W + M_, 980); g.lineTo(W + M_, H + M_); g.lineTo(870, H + M_); g.quadraticCurveTo(780, 1400, 800, 1080); g.closePath(); },
      lgrad(x, 800, 0, W, 0, [[0, '#5A544C'], [0.4, '#3E3A36'], [1, '#22201E']]), { line: 5 });
    x.save(); x.beginPath(); x.ellipse(915, 1150, 92, 268, 0.1, 0, TAU); x.lineWidth = lw(x, 56); x.strokeStyle = '#2B1D17'; x.stroke(); x.lineWidth = lw(x, 44); x.strokeStyle = '#2A2724'; x.stroke();
    x.beginPath(); x.ellipse(915, 1150, 92, 268, 0.1, Math.PI * 1.1, Math.PI * 1.75); x.lineWidth = lw(x, 10); x.strokeStyle = 'rgba(210,200,185,0.45)'; x.stroke(); x.restore();
    tube(x, [[950, 1160], [1120, 1240]], 70, '#24211E', { line: 5 });
  },
  /** glass reflections on a layer above what's pressed against it (soft diagonal sheen), clipped to the glass */
  sheen(x, glassPath, { k = 1 } = {}) {
    x.save(); glassPath(x); x.clip(); x.globalAlpha = 0.12 * k; x.fillStyle = '#E8F0F8';
    for (const [o, w] of [[0, 120], [260, 50]]) { x.beginPath(); x.moveTo(60 + o, 300); x.lineTo(60 + o + w, 300); x.lineTo(360 + o + w, 1110); x.lineTo(360 + o, 1110); x.closePath(); x.fill(); }
    x.restore();
  },
  sideGlows(x, { t = 0, lightsOn = 1, weak = 0 } = {}) {
    // the strobe washes the cabin below the window and rims the frame; it stays off the faces at the glass
    if (lightsOn > 0) { const [rgb, k] = strobe(t, weak); glow(x, 640, 1300, 760, 0.26 * k * lightsOn, rgb, 0.08); glow(x, 1010, 700, 260, 0.3 * k * lightsOn, rgb, 0.12); }
    motes(x, t, { box: [100, 420, 1000, 1000], n: 20, seed: 31, col: '255,236,210', a: 0.3, wind: 4 });
  },
};
export { glow };
