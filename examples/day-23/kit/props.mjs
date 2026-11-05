// Day 23: THE PROPS KIT (contract: kit/KIT_API.md). Every function is (x, o) -> points, a pure function of its
// inputs; x may be null (points only). Style: the engine's cel look. No brands, no logos, no real products.
import { TAU, clamp, lerp, h01, rgba, mixHex, blob, tube, line, curve, ell, circ, poly, shadeOf, lw } from '../engine.mjs';

const INK = '#2B1D17';
const LWs = (s) => clamp(4.2 * s, 1.2, 6.5);
const rr = (g, X, Y, w, h, r) => { g.beginPath(); g.roundRect(X, Y, w, h, r); };

/** the hospital bed. (cx, cy) = where a sitter's hips go (seat 60 at s 1); layer 'back' (frame, mattress, pillow) or
 *  'front' (blanket over the legs, the front rail). Nominal 560 x 300 at s = 1. */
export function drawBed(x, { cx = 420, cy = 1500, s = 1, layer = 'back', blanket = 1 } = {}) {
  const pts = { seat: [cx, cy], head: [cx - 220 * s, cy - 120 * s] };
  if (!x) return pts;
  const LW = LWs(s), metal = '#9AA4AE';
  if (layer === 'back') {
    tube(x, [[cx - 250 * s, cy + 160 * s], [cx - 250 * s, cy - 150 * s]], 16 * s, metal, { line: LW, shade: shadeOf(metal) });   // headboard posts
    tube(x, [[cx - 250 * s, cy - 150 * s], [cx - 130 * s, cy - 150 * s]], 14 * s, metal, { line: LW });
    blob(x, [(g) => rr(g, cx - 270 * s, cy - 20 * s, 560 * s, 70 * s, 20 * s)], '#EEF2F2', '#B8C6CC', { line: LW });      // mattress
    blob(x, [(g) => rr(g, cx - 245 * s, cy - 70 * s, 150 * s, 60 * s, 28 * s)], '#FFFFFF', '#C8D4DA', { line: LW });      // pillow
    tube(x, [[cx - 260 * s, cy + 55 * s], [cx + 280 * s, cy + 55 * s]], 16 * s, metal, { line: LW });                    // frame
    for (const k of [-0.9, 0.9]) tube(x, [[cx + k * 260 * s, cy + 55 * s], [cx + k * 260 * s, cy + 160 * s]], 12 * s, metal, { line: LW });
    for (const k of [-0.9, 0.9]) { circ(x, cx + k * 260 * s, cy + 168 * s, 12 * s); x.fillStyle = '#3A3E46'; x.fill(); }
  } else if (blanket > 0) {
    blob(x, [(g) => { g.beginPath(); g.moveTo(cx - 60 * s, cy - 20 * s); g.quadraticCurveTo(cx + 120 * s, cy - 50 * s, cx + 290 * s, cy - 18 * s); g.lineTo(cx + 300 * s, cy + 60 * s); g.lineTo(cx - 70 * s, cy + 60 * s); g.closePath(); }], '#9DBFC2', '#6F9498', { line: LW });
    tube(x, [[cx + 30 * s, cy - 10 * s], [cx + 290 * s, cy - 10 * s]], 10 * s, '#9AA4AE', { line: LW });
  }
  return pts;
}
/** an IV stand with a drip bag (nominal 360 tall); the tube swings slightly */
export function drawIV(x, { cx = 200, cy = 1560, s = 1, t = 0 } = {}) {
  if (!x) return {};
  const LW = LWs(s), top = cy - 360 * s;
  tube(x, [[cx, cy], [cx, top]], 9 * s, '#9AA4AE', { line: LW });
  tube(x, [[cx - 40 * s, cy], [cx + 40 * s, cy]], 9 * s, '#9AA4AE', { line: LW });
  blob(x, [(g) => rr(g, cx - 32 * s, top - 10 * s, 64 * s, 90 * s, 14 * s)], 'rgba(220,235,240,0.92)', 'rgba(170,195,205,0.92)', { line: LW * 0.8 });
  curve(x, [cx, top + 80 * s], [cx + 60 * s + 8 * s * Math.sin(t), top + 200 * s], [cx + 90 * s, top + 330 * s], LW * 0.6, '#C8D8DC');
  return {};
}
/** wilted flowers in a vase on a little cabinet (nominal 160 wide); returns the vase top */
export function drawFlowers(x, { cx = 860, cy = 1500, s = 1 } = {}) {
  const pts = { top: [cx, cy - 260 * s] };
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [(g) => rr(g, cx - 80 * s, cy - 140 * s, 160 * s, 140 * s, 10 * s)], '#B9C2B8', '#8E988E', { line: LW });
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx - 26 * s, cy - 140 * s); g.lineTo(cx + 26 * s, cy - 140 * s); g.lineTo(cx + 20 * s, cy - 220 * s); g.lineTo(cx - 20 * s, cy - 220 * s); g.closePath(); }], '#8EB4C8', '#6A8EA2', { line: LW });
  for (const [dx, a] of [[-50, -0.9], [-10, -0.2], [40, 0.7], [70, 1.3]]) {
    const end = [cx + dx * s, cy - 250 * s + Math.abs(a) * 60 * s];
    curve(x, [cx, cy - 215 * s], [cx + dx * 0.3 * s, cy - 300 * s], end, LW * 0.8, '#6A6A3A');
    blob(x, [(g) => ell(g, end[0], end[1] + 12 * s, 16 * s, 11 * s, a)], '#8A6A4A', '#5E4430', { line: LW * 0.8 });
  }
  return pts;
}
/** a wall calendar: days 1-22 crossed out, 23 circled in red (circle 0..1 draws the circle on) */
export function drawCalendar(x, { cx = 520, cy = 820, s = 1, circle = 1 } = {}) {
  const w = 230 * s, h = 270 * s, pts = { c23: [cx, cy], box: [cx - w / 2, cy - h / 2, w, h] };
  const cell = (d) => { const i = d - 1, c = i % 7, r = Math.floor(i / 7); return [cx - w / 2 + 18 * s + c * 28 * s + 14 * s, cy - h / 2 + 92 * s + r * 34 * s + 14 * s]; };
  pts.c23 = cell(23);
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [(g) => rr(g, cx - w / 2, cy - h / 2, w, h, 6 * s)], '#F2EEE2', '#CFC8B6', { line: LW });
  x.fillStyle = '#B8423A'; x.fillRect(cx - w / 2 + 4 * s, cy - h / 2 + 4 * s, w - 8 * s, 60 * s);
  x.fillStyle = '#F2EEE2'; x.font = `bold ${30 * s}px Oswald`; x.textAlign = 'center'; x.fillText('MARCH', cx, cy - h / 2 + 46 * s);
  for (let d = 1; d <= 31; d++) {
    const [px, py] = cell(d);
    x.fillStyle = '#5A5048'; x.font = `${15 * s}px Oswald`; x.fillText(String(d), px, py + 6 * s);
    if (d < 23) { line(x, [[px - 9 * s, py - 9 * s], [px + 9 * s, py + 9 * s]], LW * 0.45, '#3A3030'); line(x, [[px + 9 * s, py - 9 * s], [px - 9 * s, py + 9 * s]], LW * 0.45, '#3A3030'); }
  }
  if (circle > 0) { const [px, py] = cell(23); x.fillStyle = '#C0201A'; x.font = `bold ${17 * s}px Oswald`; x.fillText('23', px, py + 6 * s); x.save(); x.lineWidth = LW * 1.3; x.strokeStyle = '#D02A22'; x.lineCap = 'round';
    // a hand-drawn ring that overshoots its start (two strokes: canvas drops arcs that sweep past a full turn)
    const sw = TAU * 1.08 * clamp(circle);
    x.beginPath(); x.ellipse(px, py, 20 * s, 17 * s, -0.2, -1.2, -1.2 + Math.min(sw, TAU * 0.98)); x.stroke();
    if (sw > TAU * 0.98) { x.beginPath(); x.ellipse(px, py, 21.5 * s, 18 * s, -0.2, -1.2 + TAU * 0.97, -1.2 + sw); x.stroke(); }
    x.restore(); }
  return pts;
}
/** a hospital room door with a frosted glass panel; shadow 0..1 = a dark figure behind the glass; rattle 0..1 shakes
 *  the handle; open 0..1 swings it in. (cx, cy) = the bottom centre; nominal 240 x 520. */
export function drawDoor(x, { cx = 900, cy = 1500, s = 1, t = 0, shadow = 0, rattle = 0, open = 0, col = '#7A8E9A' } = {}) {
  const w = 240 * s, h = 520 * s, j = rattle * Math.sin(t * 47) * 4 * s, pts = { glass: [cx, cy - h * 0.7], handle: [cx - w * 0.36, cy - h * 0.48] };
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [(g) => rr(g, cx - w / 2 - 14 * s, cy - h - 14 * s, w + 28 * s, h + 14 * s, 4 * s)], '#C8CCC4', '#9A9E96', { line: LW });   // frame
  blob(x, [(g) => { g.beginPath(); g.rect(cx - w / 2, cy - h, w, h); }], '#1A1E24', '#1A1E24', { line: LW });                       // the dark gap
  const ww = w * (1 - 0.8 * open);
  x.save(); x.translate(j, 0);
  blob(x, [(g) => { g.beginPath(); g.rect(cx - w / 2, cy - h, ww, h); }], col, shadeOf(col), { line: LW });
  if (open < 0.7) {
    const gx = cx - w / 2 + ww * 0.2, gy = cy - h * 0.86, gw = ww * 0.6, gh = h * 0.34;
    blob(x, [(g) => { g.beginPath(); g.rect(gx, gy, gw, gh); }], '#D8E2E2', '#B4C2C4', { line: LW * 0.8 });
    if (shadow > 0) {                                               // a figure pressed to the frosted glass
      x.save(); x.beginPath(); x.rect(gx, gy, gw, gh); x.clip();
      const soft = (cx_, cy_, rx_, ry_, a) => { x.save(); x.translate(cx_, cy_); x.scale(1, ry_ / rx_); const g = x.createRadialGradient(0, 0, 0, 0, 0, rx_); g.addColorStop(0, `rgba(30,34,36,${a})`); g.addColorStop(0.55, `rgba(30,34,36,${a * 0.8})`); g.addColorStop(1, 'rgba(30,34,36,0)'); circ(x, 0, 0, rx_); x.fillStyle = g; x.fill(); x.restore(); };
      const sway = 6 * s * Math.sin(t * 2.3);
      soft(gx + gw * 0.52 + sway, gy + gh * 0.36, gw * 0.3, gh * 0.3, 0.7 * shadow);            // the head
      soft(gx + gw * 0.5 + sway * 0.5, gy + gh * 1.08, gw * 0.62, gh * 0.55, 0.75 * shadow);    // the shoulders
      // two palms pressed flat on the glass (sharper: they touch it), fingers spread; they slide a little
      for (const [hx_, hy_, rot] of [[0.2, 0.5, -0.25], [0.83, 0.4, 0.2]]) {
        const px = gx + gw * hx_, py = gy + gh * hy_ + 5 * s * Math.sin(t * 7 + hx_ * 9) * shadow;
        x.save(); x.translate(px, py); x.rotate(rot); x.globalAlpha = 0.62 * shadow; x.fillStyle = '#2A2E30';
        x.beginPath(); x.roundRect(-14 * s, -6 * s, 28 * s, 30 * s, 9 * s); x.fill();                                   // the palm
        for (let k = 0; k < 4; k++) { const fx_ = (-10.5 + k * 7) * s, fl = (k === 0 || k === 3 ? 17 : 21) * s; x.save(); x.translate(fx_, -4 * s); x.rotate((k - 1.5) * 0.07); x.beginPath(); x.roundRect(-3 * s, -fl, 6 * s, fl + 4 * s, 3 * s); x.fill(); x.restore(); }
        x.save(); x.translate(-13 * s, 12 * s); x.rotate(-0.9); x.beginPath(); x.roundRect(-3.2 * s, -15 * s, 6.4 * s, 17 * s, 3.2 * s); x.fill(); x.restore();   // the thumb
        x.restore();
      }
      // breath fogging the glass
      const fogA = 0.18 * shadow * (0.6 + 0.4 * Math.sin(t * 3.1));
      const fg = x.createRadialGradient(gx + gw * 0.52 + sway, gy + gh * 0.55, 0, gx + gw * 0.52 + sway, gy + gh * 0.55, gw * 0.3);
      fg.addColorStop(0, `rgba(255,255,255,${fogA})`); fg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = fg; x.fillRect(gx, gy, gw, gh);
      x.restore();
    }
    tube(x, [[cx - w / 2 + ww * 0.82 - j * 0.6, cy - h * 0.48], [cx - w / 2 + ww * 0.82 - 30 * s - j * 0.6, cy - h * 0.48 + rattle * 6 * s * Math.sin(t * 31)]], 12 * s, '#C8CCD0', { line: LW });
  }
  x.restore();
  return pts;
}
/** a wheelchair tipped on its side (nominal 260 wide): frame, sling seat and back, footrest, a small caster; its big
 *  wheel lies flat-ish toward us and still turns slowly (t). (cx, cy) = where it touches the floor. */
export function drawWheelchair(x, { cx = 300, cy = 1600, s = 1, rot = -0.4, t = 0 } = {}) {
  if (!x) return {};
  const LW = LWs(s), steel = '#AEB6BE', steelSh = '#6E7882', sling = '#2E3E54';
  x.save(); x.translate(cx, cy); x.rotate(rot * 0.35); x.translate(-cx, -cy);
  // contact shadow
  x.save(); x.translate(cx + 20 * s, cy + 4 * s); x.scale(1, 0.22); const sg = x.createRadialGradient(0, 0, 0, 0, 0, 170 * s); sg.addColorStop(0, 'rgba(10,12,16,0.45)'); sg.addColorStop(1, 'rgba(10,12,16,0)'); circ(x, 0, 0, 170 * s); x.fillStyle = sg; x.fill(); x.restore();
  // the far wheel (mostly hidden), the frame tubes, the seat and back slings
  const wc = [cx - 30 * s, cy - 78 * s], wr = 78 * s;
  x.save(); x.translate(wc[0] + 40 * s, wc[1] - 26 * s); x.scale(0.45, 1); circ(x, 0, 0, wr); x.lineWidth = lw(x, LW * 2.2); x.strokeStyle = INK; x.stroke(); x.lineWidth = lw(x, LW * 1.1); x.strokeStyle = '#2A2C30'; x.stroke(); x.restore();
  tube(x, [[cx + 10 * s, cy - 120 * s], [cx + 120 * s, cy - 95 * s], [cx + 150 * s, cy - 8 * s]], 9 * s, steel, { line: LW * 0.8, shade: steelSh });       // the leg frame
  tube(x, [[cx + 10 * s, cy - 120 * s], [cx + 30 * s, cy - 210 * s], [cx + 6 * s, cy - 236 * s]], 9 * s, steel, { line: LW * 0.8, shade: steelSh });        // back post + handle
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx + 12 * s, cy - 128 * s); g.lineTo(cx + 118 * s, cy - 104 * s); g.lineTo(cx + 112 * s, cy - 84 * s); g.lineTo(cx + 8 * s, cy - 104 * s); g.closePath(); }], sling, shadeOf(sling, 0.3), { line: LW });
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx + 14 * s, cy - 126 * s); g.lineTo(cx + 32 * s, cy - 206 * s); g.lineTo(cx + 52 * s, cy - 200 * s); g.lineTo(cx + 34 * s, cy - 120 * s); g.closePath(); }], sling, shadeOf(sling, 0.3), { line: LW });
  blob(x, [(g) => rr(g, cx + 132 * s, cy - 22 * s, 46 * s, 14 * s, 4 * s)], '#3A3E44', '#2A2E34', { line: LW * 0.8 });                                 // footrest
  blob(x, [(g) => circ(g, cx + 168 * s, cy - 14 * s, 14 * s)], '#24262A', '#24262A', { line: LW * 0.8 });                                             // caster
  // the near wheel: tyre, rim, push-rim and spokes, turning slowly
  circ(x, wc[0], wc[1], wr); x.lineWidth = lw(x, LW) * 2 + 14 * s; x.strokeStyle = INK; x.stroke(); x.lineWidth = 14 * s; x.strokeStyle = '#24262A'; x.stroke();
  circ(x, wc[0], wc[1], wr * 0.86); x.lineWidth = 4 * s; x.strokeStyle = steel; x.stroke();
  circ(x, wc[0], wc[1], wr * 0.97); x.lineWidth = 2 * s; x.strokeStyle = 'rgba(255,255,255,0.18)'; x.stroke();
  const spin = t * 0.7;
  for (let k = 0; k < 12; k++) { const a = spin + k * Math.PI / 6; line(x, [[wc[0], wc[1]], [wc[0] + Math.cos(a) * wr * 0.85, wc[1] + Math.sin(a) * wr * 0.85]], LW * 0.28, '#8A949E'); }
  blob(x, [(g) => circ(g, wc[0], wc[1], 10 * s)], steel, steelSh, { line: LW * 0.8 });
  x.restore();
  return { wheel: wc };
}
/** double doors chained shut; push 0..1 bows the gap open, fingers curl through it; eye 0..1 a dead eye in the gap; t animates.
 *  (cx, cy) = bottom centre; nominal 520 x 600. Returns the gap rectangle (a clue) and the chain point. */
export function drawChainedDoors(x, { cx = 540, cy = 1500, s = 1, t = 0, push = 0, fingers = 1, eye = push > 0.3 ? 1 : 0 } = {}) {
  const w = 520 * s, h = 600 * s, gap = (8 + 26 * push * (0.7 + 0.3 * Math.sin(t * 11))) * s, chainY = cy - h * 0.48;
  const pts = { gap: [cx - 40 * s, cy - h, 80 * s, h], chain: [cx, chainY] };
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [(g) => { g.beginPath(); g.rect(cx - w / 2 - 20 * s, cy - h - 20 * s, w + 40 * s, h + 20 * s); }], '#B9BFB6', '#8E958C', { line: LW });
  blob(x, [(g) => { g.beginPath(); g.rect(cx - w / 2, cy - h, w, h); }], '#0E1012', '#0E1012', { line: LW });
  for (const sg of [-1, 1]) {
    const x0 = sg < 0 ? cx - w / 2 : cx + gap / 2, ww = w / 2 - gap / 2;
    blob(x, [(g) => { g.beginPath(); g.rect(x0, cy - h, ww, h); }], '#7E8E86', '#5E6C66', { line: LW });
    blob(x, [(g) => { g.beginPath(); g.rect(x0 + ww * 0.25, cy - h * 0.86, ww * 0.5, h * 0.22); }], '#1C2226', '#1C2226', { line: LW * 0.8 });   // dark wired window
    for (let k = 1; k < 4; k++) { line(x, [[x0 + ww * 0.25, cy - h * 0.86 + k * h * 0.055], [x0 + ww * 0.75, cy - h * 0.86 + k * h * 0.055]], LW * 0.3, '#3A4248'); }
    tube(x, [[cx + sg * (gap / 2 + 30 * s), chainY - 60 * s], [cx + sg * (gap / 2 + 30 * s), chainY + 60 * s]], 14 * s, '#B8BEC4', { line: LW });   // push bars
    for (let k = 0; k < 4; k++) { const sx = x0 + ww * (0.2 + 0.18 * k); line(x, [[sx, cy - h * 0.4], [sx + 30 * s, cy - h * 0.2]], LW * 0.35, 'rgba(40,30,30,0.6)'); }   // scratches
  }
  // red spray paint across both doors (dripping)
  x.save(); x.translate(cx, cy - h * 0.66); x.rotate(-0.06);
  x.font = `bold ${92 * s}px Oswald`; x.textAlign = 'center'; x.fillStyle = 'rgba(176,34,28,0.88)'; x.fillText('KEEP OUT', 0, 0);
  x.fillStyle = 'rgba(176,34,28,0.75)'; for (let k = 0; k < 9; k++) { const dx = (-180 + k * 46) * s, len = (14 + 40 * h01(k, 3)) * s; x.fillRect(dx, -6 * s, 4 * s, len); }
  x.restore();
  // a dead eye in the gap (it watches you)
  if (eye > 0) { const ey = chainY - 210 * s; x.save(); x.globalAlpha *= clamp(eye); x.beginPath(); x.rect(cx - gap / 2, cy - h, gap, h); x.clip(); ell(x, cx, ey, 16 * s, 10 * s); x.fillStyle = '#E2DDB8'; x.fill(); circ(x, cx + 3 * s, ey, 3 * s); x.fillStyle = '#1A1412'; x.fill(); x.restore(); }
  // fingers curling round the door edges (two hands, grey, knuckled, cracked nails), behind the chain
  if (fingers > 0) for (const [fy, side, seed] of [[chainY - 170 * s, -1, 1], [chainY + 70 * s, 1, 2]]) {
    const edge = cx + side * gap / 2, fw = 12.5 * s, skin = '#9EA88E', skinSh = '#6E7860';
    // the wrist / back of the hand, dark in the gap
    x.save(); x.beginPath(); x.rect(cx - gap / 2, cy - h, gap, h); x.clip();
    blob(x, [(g) => ell(g, cx, fy + 2 * fw, gap * 0.7 + 10 * s, 3.2 * fw)], '#4A5244', '#3A4236', { line: 0 });
    x.restore();
    for (let k = 3; k >= 0; k--) {                                    // bottom finger first, so each sits on the next
      const y0 = fy + k * fw * 1.05, len = (k === 0 || k === 3 ? 0.8 : 1) * (1 + 0.15 * h01(k, seed)), wig = Math.sin(t * 6 + k * 1.7 + seed * 3) * 3 * s * push;
      const p0 = [edge - side * 8 * s, y0], p1 = [edge + side * 7 * s, y0 - 1 * s], p2 = [edge + side * (19 * len) * s + wig, y0 + 3 * s];
      tube(x, [p0, p1, p2], fw * 0.9, skin, { line: LW * 0.6, shade: skinSh });
      line(x, [[p1[0], p1[1] - fw * 0.3], [p1[0] + side * 2 * s, p1[1] + fw * 0.28]], LW * 0.3, skinSh);                        // a knuckle crease
      x.save(); x.translate(p2[0] - side * fw * 0.1, p2[1]); ell(x, 0, 0, fw * 0.3, fw * 0.26); x.fillStyle = '#4A3E30'; x.fill(); x.restore();   // a dark nail
    }
    // the thumb, under the fingers
    const ty = fy + 4.2 * fw; tube(x, [[edge - side * 8 * s, ty], [edge + side * 12 * s, ty + 6 * s]], fw * 1.05, skin, { line: LW * 0.7, shade: skinSh });
  }
  // the chain wrapped through both bars + a padlock
  const links = 9;
  for (let k = 0; k < links; k++) {
    const u = k / (links - 1), px = lerp(cx - gap / 2 - 50 * s, cx + gap / 2 + 50 * s, u), py = chainY + Math.sin(u * Math.PI) * 14 * s + Math.sin(t * 13 + k) * 3 * s * push;
    x.save(); x.translate(px, py); x.rotate(k % 2 ? 0.5 : -0.5); ell(x, 0, 0, 14 * s, 8 * s); x.lineWidth = lw(x, LW * 1.5); x.strokeStyle = INK; x.stroke(); x.lineWidth = lw(x, LW * 0.8); x.strokeStyle = '#C8CCD0'; x.stroke(); x.restore();
  }
  blob(x, [(g) => rr(g, cx - 22 * s, chainY + 14 * s, 44 * s, 40 * s, 8 * s)], '#B88A3A', '#7A5A2A', { line: LW });
  x.beginPath(); x.arc(cx, chainY + 14 * s, 14 * s, Math.PI, TAU); x.lineWidth = lw(x, LW * 1.2); x.strokeStyle = '#9AA0A6'; x.stroke();
  return pts;
}
/** A vehicle built as simple 3D boxes and drawn in the set's own perspective, so it sits ON the ground (wheels touch
 *  the road, a contact shadow under it) and shows the right faces from any camera.
 *  proj(X, Y, Z) -> [x, y] is the set's projection (world units, Y up = negative); cam = { X, Y, Z } the camera in the
 *  same world. X, Z = ground centre; yaw (degrees) = where the nose points (0 = straight away from the camera, 90 =
 *  screen-right). kind 'sedan' | 'police' | 'bus'; lights 0..1 (the police light bar flashing); fire 0..1 (a burning
 *  wreck: scorched paint, broken glass). Sizes (world units, a person ~ 162 tall): sedan 420 x 176 x 128, bus
 *  1050 x 240 x 285. Returns { foot: [[X, Z] x4] (the footprint), top: [x, y], lights: [[x, y, r]] , fire: [x, y, r] }. */
export function drawVehicle(x, { proj, cam = { X: 0, Y: -175, Z: 0 }, X = 0, Z = 1000, yaw = 0, kind = 'sedan', col = '#7A2E2E', t = 0, lights = 0, fire = 0, dusty = 0.35 } = {}) {
  const bus = kind === 'bus', police = kind === 'police';
  const L = bus ? 1050 : 420, Wd = bus ? 240 : 176, Hb = bus ? 285 : 72, clr = bus ? 30 : 22;
  const a = yaw * Math.PI / 180, fw = [Math.sin(a), Math.cos(a)], rt = [Math.cos(a), -Math.sin(a)];
  const Wp = (u, v, h) => [X + u * fw[0] + v * rt[0], -h, Z + u * fw[1] + v * rt[1]];          // local -> world
  const P = (w) => proj(w[0], w[1], w[2]);
  const foot = [[-L / 2, -Wd / 2], [L / 2, -Wd / 2], [L / 2, Wd / 2], [-L / 2, Wd / 2]].map(([u, v]) => { const w = Wp(u, v, 0); return [w[0], w[2]]; });
  const sc = 900 / Math.max(120, Z), LWv = clamp(2.6 * sc, 1, 6.5);
  const body = police ? '#E4E6E8' : bus ? '#E3A81C' : fire > 0 ? mixHex(col, '#2A2420', 0.55) : col;
  const res = { foot, top: P(Wp(0, 0, bus ? 285 : 140)), lights: [], fire: null };
  if (!x) return res;

  const SUN = [-0.45, 0.72, 0.53];                                      // toward the sun: left, up, behind the street
  const shadeFace = (c, n) => { const k = Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]); return mixHex(shadeOf(c, 0.42), c, clamp(0.25 + 0.85 * k)); };
  const vis = (pts, n) => { const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]); return n[0] * (cam.X - c[0]) + n[1] * (-(cam.Y) - (-c[1])) * 1 + n[2] * (cam.Z - c[2]) > 0; };
  // n: world normal (X, up, Z)
  const nrmOf = (u, v, up) => [u * fw[0] + v * rt[0], up, u * fw[1] + v * rt[1]];
  const quad = (Q, fill, ink = true) => { x.beginPath(); Q.forEach((w, i) => { const p = P(w); i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath(); x.fillStyle = fill; x.fill(); if (ink) { x.lineJoin = 'round'; x.lineWidth = lw(x, LWv); x.strokeStyle = '#2B1D17'; x.stroke(); } };
  const lerpW = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)];
  const inset = (Q, ku, kv) => { const [a0, b0, c0, d0] = Q; const top = [lerpW(a0, b0, ku), lerpW(a0, b0, 1 - ku)], bot = [lerpW(d0, c0, ku), lerpW(d0, c0, 1 - ku)]; return [lerpW(top[0], bot[0], kv), lerpW(top[1], bot[1], kv), lerpW(bot[1], top[1], kv), lerpW(bot[0], top[0], kv)]; };

  // ---- contact shadow (three soft passes) + a dark core under the body
  for (const [k, al] of [[1.16, 0.1], [1.07, 0.14], [0.98, 0.22]]) {
    x.beginPath(); [[-L / 2, -Wd / 2], [L / 2, -Wd / 2], [L / 2, Wd / 2], [-L / 2, Wd / 2]].forEach(([u, v], i) => { const w = Wp(u * k, v * k, 0), p = proj(w[0], 0, w[2] - 45); i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath();
    x.fillStyle = `rgba(14,10,8,${al})`; x.fill();
  }

  // ---- wheels: discs in the side planes; the far side first (the body hides them except under it)
  const wr = bus ? 48 : 34, wu = bus ? [-0.33, 0.3] : [-0.3, 0.31];
  const wheel = (u0, v0) => {
    const ring = (r, h0) => { const Q = []; for (let i = 0; i < 18; i++) { const an = TAU * i / 18; Q.push(Wp(u0 + Math.cos(an) * r, v0, h0 + Math.sin(an) * r)); } return Q; };
    quad(ring(wr, wr), '#1C1C20');
    quad(ring(wr * 0.48, wr), fire > 0 ? '#3A3430' : '#7E848C', false);
    quad(ring(wr * 0.16, wr), '#2A2A30', false);
  };
  const sideVis = (sg) => vis([Wp(0, sg * Wd / 2, Hb / 2)], nrmOf(0, sg, 0));
  const wheelSides = [-1, 1].sort((p, q) => (sideVis(p) ? 1 : 0) - (sideVis(q) ? 1 : 0));
  for (const sg of wheelSides) if (!sideVis(sg)) for (const u of wu) wheel(u * L, sg * (Wd / 2 - 6));

  // ---- a box (lower body / bus) and, for cars, the cabin on top
  const boxFaces = (u0, u1, v0, v1, h0, h1, topIn = null) => {
    const bt = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => Wp(u, v, h0));
    const ti = topIn || { u0, u1, v0, v1 };
    const tp = [[ti.u0, ti.v0], [ti.u1, ti.v0], [ti.u1, ti.v1], [ti.u0, ti.v1]].map(([u, v]) => Wp(u, v, h1));
    const faces = [];
    const names = ['left', 'front', 'right', 'back'], ns = [nrmOf(0, -1, 0), nrmOf(1, 0, 0), nrmOf(0, 1, 0), nrmOf(-1, 0, 0)];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, Q = [tp[i], tp[j], bt[j], bt[i]];
      // slanted faces (a cabin): tilt the normal up by the inset
      let n = ns[i]; if (topIn) { const dh = h1 - h0, din = i === 0 ? ti.v0 - v0 : i === 2 ? v1 - ti.v1 : i === 1 ? u1 - ti.u1 : ti.u0 - u0; const l = Math.hypot(dh, din); n = [n[0] * dh / l, din / l, n[2] * dh / l]; }
      faces.push({ name: names[i], Q, n });
    }
    faces.push({ name: 'top', Q: tp, n: [0, 1, 0] });
    return faces.filter((f) => vis(f.Q, f.n));
  };
  const dustFace = (Q, top) => {
    if (dusty <= 0 && fire <= 0) return;
    const ys = Q.map((w) => P(w)[1]), y0 = Math.max(...ys), y1 = lerp(y0, Math.min(...ys), top);
    x.save(); x.beginPath(); Q.forEach((w, i) => { const p = P(w); i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath(); x.clip();
    const gr = x.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, fire > 0 ? 'rgba(26,22,20,0.7)' : `rgba(138,118,92,${0.55 * dusty})`); gr.addColorStop(1, 'rgba(138,118,92,0)');
    x.fillStyle = gr; x.fillRect(-1e4, Math.min(y0, y1) - 2, 2e4, Math.abs(y0 - y1) + 4); x.restore();
  };
  const winCol = fire > 0 ? '#1A1A1C' : '#33414C';
  const glass = (Q) => {
    quad(Q, winCol);
    if (fire > 0) return;
    x.save(); x.beginPath(); Q.forEach((w, i) => { const p = P(w); i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath(); x.clip();
    const p0 = P(Q[0]), p2 = P(Q[2]); x.strokeStyle = 'rgba(220,235,255,0.22)'; x.lineWidth = Math.max(2, Math.abs(p2[0] - p0[0]) * 0.12);
    x.beginPath(); x.moveTo(lerp(p0[0], p2[0], 0.15), p2[1]); x.lineTo(lerp(p0[0], p2[0], 0.55), p0[1]); x.stroke(); x.restore();
  };

  if (bus) {
    const F = boxFaces(-L / 2, L / 2, -Wd / 2, Wd / 2, clr, Hb);
    for (const f of F) {
      quad(f.Q, shadeFace(body, f.n));
      const [tl, tr, br, bl] = f.Q, hgt = (k) => [lerpW(bl, tl, k), lerpW(br, tr, k)];
      // the black rub rails
      for (const [k0, k1] of [[0.28, 0.33], [0.4, 0.42]]) { const [a0, b0] = hgt(k0), [a1, b1] = hgt(k1); quad([a1, b1, b0, a0], '#24242A', false); }
      if (f.name !== 'top') dustFace(f.Q, 0.35);
      if (f.name === 'left' || f.name === 'right') {
        const n = 8; for (let i = 0; i < n; i++) { const k0 = 0.06 + i * 0.112, k1 = k0 + 0.088; if (f.name === 'right' && i === n - 1) continue; const [a0, b0] = hgt(0.6), [a1, b1] = hgt(0.86); glass([lerpW(a1, b1, k0), lerpW(a1, b1, k1), lerpW(a0, b0, k1), lerpW(a0, b0, k0)]); }
        if (f.name === 'right') { const [a0, b0] = hgt(0.04), [a1, b1] = hgt(0.86); glass([lerpW(a1, b1, 0.9), lerpW(a1, b1, 0.97), lerpW(a0, b0, 0.97), lerpW(a0, b0, 0.9)]); }   // the door
      }
      if (f.name === 'front') { const [a0, b0] = hgt(0.55), [a1, b1] = hgt(0.88); glass([lerpW(a1, b1, 0.06), lerpW(a1, b1, 0.94), lerpW(a0, b0, 0.94), lerpW(a0, b0, 0.06)]); }
      if (f.name === 'back') { const [a0, b0] = hgt(0.55), [a1, b1] = hgt(0.85); glass([lerpW(a1, b1, 0.35), lerpW(a1, b1, 0.65), lerpW(a0, b0, 0.65), lerpW(a0, b0, 0.35)]); }
      if (f.name === 'front' || f.name === 'back') for (const k of [0.1, 0.9]) { const [a0, b0] = hgt(0.12), [a1, b1] = hgt(0.2); quad([lerpW(a1, b1, k - 0.05), lerpW(a1, b1, k + 0.05), lerpW(a0, b0, k + 0.05), lerpW(a0, b0, k - 0.05)], f.name === 'back' ? '#9A2A22' : '#E8E2C8'); }
    }
  } else {
    const F = boxFaces(-L / 2, L / 2, -Wd / 2, Wd / 2, clr, Hb);
    for (const f of F) {
      quad(f.Q, shadeFace(body, f.n));
      if (f.name !== 'top') dustFace(f.Q, 0.8);
      const [tl, tr, br, bl] = f.Q, hgt = (k) => [lerpW(bl, tl, k), lerpW(br, tr, k)];
      if (police && (f.name === 'left' || f.name === 'right')) {               // black doors, a gold star
        const [a0, b0] = hgt(0.02), [a1, b1] = hgt(0.98), k0 = f.name === 'right' ? 0.3 : 0.25, k1 = f.name === 'right' ? 0.75 : 0.7;
        quad([lerpW(a1, b1, k0), lerpW(a1, b1, k1), lerpW(a0, b0, k1), lerpW(a0, b0, k0)], shadeFace('#22262C', f.n));
        const sp = P(lerpW(lerpW(a0, b0, (k0 + k1) / 2), lerpW(a1, b1, (k0 + k1) / 2), 0.55)), r = 14 * sc;
        if (r > 2) { x.beginPath(); for (let k = 0; k < 10; k++) { const rr_ = (k % 2 ? 0.42 : 1) * r, an = -Math.PI / 2 + k * Math.PI / 5; x.lineTo(sp[0] + Math.cos(an) * rr_, sp[1] + Math.sin(an) * rr_); } x.closePath(); x.fillStyle = '#D8B84A'; x.fill(); }
      }
      if (f.name === 'front' || f.name === 'back') {
        for (const k of [0.14, 0.86]) { const [a0, b0] = hgt(0.45), [a1, b1] = hgt(0.75); quad([lerpW(a1, b1, k - 0.08), lerpW(a1, b1, k + 0.08), lerpW(a0, b0, k + 0.08), lerpW(a0, b0, k - 0.08)], f.name === 'back' ? '#8E241E' : '#E6E0C6'); }
        if (f.name === 'front') { const [a0, b0] = hgt(0.25), [a1, b1] = hgt(0.55); quad([lerpW(a1, b1, 0.3), lerpW(a1, b1, 0.7), lerpW(a0, b0, 0.7), lerpW(a0, b0, 0.3)], '#2A2C30', false); }
      }
    }
    // the cabin (a frustum) with its glass
    const C = boxFaces(-L * 0.3, L * 0.16, -Wd * 0.47, Wd * 0.47, Hb, 128, { u0: -L * 0.22, u1: L * 0.05, v0: -Wd * 0.4, v1: Wd * 0.4 });
    for (const f of C) {
      quad(f.Q, shadeFace(body, f.n));
      if (f.name !== 'top') glass(inset(f.Q, f.name === 'left' || f.name === 'right' ? 0.08 : 0.1, 0.14));
      if (f.name === 'left' || f.name === 'right') { const [tl, tr, br, bl] = f.Q, m0 = lerpW(tl, tr, 0.5), m1 = lerpW(bl, br, 0.5); quad([lerpW(m0, tr, -0.04), lerpW(m0, tr, 0.04), lerpW(m1, br, 0.04), lerpW(m1, br, -0.04)], shadeFace(body, f.n), false); }
    }
    if (police) {                                                            // the light bar on the roof
      const B = boxFaces(-L * 0.1, -L * 0.03, -Wd * 0.34, Wd * 0.34, 128, 140);
      const on_ = lights > 0 ? Math.floor(t * 2.4) % 2 : -1;
      for (const f of B) { const half = (side) => { const [tl, tr, br, bl] = f.Q; return side ? [lerpW(tl, tr, 0.5), tr, br, lerpW(bl, br, 0.5)] : [tl, lerpW(tl, tr, 0.5), lerpW(bl, br, 0.5), bl]; };
        if (f.name === 'top') { quad(f.Q, '#3A3E46'); continue; }
        quad(half(0), on_ === 0 ? '#FF5A4A' : '#7A2A26'); quad(half(1), on_ === 1 ? '#5A8CFF' : '#26367A'); }
      if (lights > 0) { const p = P(Wp(-L * 0.065, 0, 134)); res.lights.push([p[0], p[1], 90 * sc, on_ === 0 ? '255,70,60' : '70,120,255']); }
    }
  }
  // near-side wheels, in front of the body side
  for (const sg of wheelSides) if (sideVis(sg)) for (const u of wu) wheel(u * L, sg * (Wd / 2 + 2));
  if (fire > 0) { const p = P(Wp(L * 0.22, 0, 80)); res.fire = [p[0], p[1], 120 * sc]; }
  return res;
}
export { h01, rgba, mixHex };

// ------------------------------------------------------------------------------------------------ episode 2 props
const DEAD = '#A2A890';

/** the police car's keys: a steel ring, three keys and a black fob. (cx, cy) = the top of the ring (where it hangs
 *  from); swing in radians rocks the bunch. Nominal 110 x 150 at s = 1. Returns { ring, box } (box = clue rect). */
export function drawKeys(x, { cx = 540, cy = 900, s = 1, swing = 0 } = {}) {
  const box = [cx - 70 * s, cy - 10 * s, 140 * s, 170 * s];
  if (!x) return { ring: [cx, cy + 26 * s], box };
  const LW = LWs(s * 0.8);
  x.save(); x.translate(cx, cy); x.rotate(swing);
  // keys first (behind the ring's front arc): each a round bow, a blade with teeth, hanging from the ring
  const keys = [[-0.55, '#C9C3B4', 1.0], [0.1, '#D4B45A', 0.85], [0.6, '#BFC4C8', 0.92]];
  for (const [a, col, k] of keys) {
    x.save(); x.translate(Math.sin(a) * 26 * s, 26 * s + Math.cos(a) * 26 * s); x.rotate(-a * 0.55);
    blob(x, [(g) => { g.beginPath(); g.roundRect(-5.5 * s, 14 * s, 11 * s, 74 * s * k, 3 * s); },
      (g) => { g.beginPath(); g.moveTo(5 * s, 40 * s); for (let i = 0; i < 5; i++) { g.lineTo(13 * s, (44 + i * 8) * k * s); g.lineTo(5 * s, (48 + i * 8) * k * s); } g.closePath(); },
      (g) => circ(g, 0, 8 * s, 15 * s)], col, shadeOf(col, 0.3), { line: LW });
    circ(x, 0, 6 * s, 5 * s); x.fillStyle = INK; x.fill();
    x.restore();
  }
  // the fob: a black rounded block with one rubber button
  x.save(); x.translate(-40 * s, 52 * s); x.rotate(0.35);
  blob(x, [(g) => { g.beginPath(); g.roundRect(-17 * s, 0, 34 * s, 56 * s, 12 * s); }], '#26262A', '#141416', { line: LW });
  circ(x, 0, 22 * s, 8 * s); x.fillStyle = '#4A4A50'; x.fill(); x.restore();
  // the ring (a steel circle) on top of the keys' bows
  x.beginPath(); x.arc(0, 26 * s, 26 * s, 0, TAU); x.lineWidth = 9 * s; x.strokeStyle = INK; x.stroke();
  x.lineWidth = 5 * s; x.strokeStyle = '#D8D8D2'; x.stroke();
  x.restore();
  return { ring: [cx, cy + 26 * s], box };
}

/** a dead officer's duty belt across the hips: black leather, a steel buckle, two pouches and a key clip with the car
 *  keys (drawKeys) hanging at one hip (side 1 = screen right). (cx, cy) = the belt's centre; w = half its visible width
 *  (from the body's hipHalf, scale and turn). keys 0 = the clip is empty (the dog took them); ks = the keys' own scale.
 *  Returns { keys, box }. */
export function drawDutyBelt(x, { cx = 540, cy = 1000, s = 1, w = 80, keys = 1, swing = 0, side = 1, ks = s } = {}) {
  const kx = cx + side * w * 0.62, ky = cy + 6 * s;
  const res = { keys: [kx, ky + 20 * ks], box: [kx - 70 * ks, ky - 10 * ks, 140 * ks, 170 * ks] };
  if (!x) return res;
  const LW = LWs(s * 0.8);
  blob(x, [(g) => { g.beginPath(); g.roundRect(cx - w, cy - 9 * s, w * 2, 18 * s, 4 * s); }], '#1C1C20', '#0E0E10', { line: LW });
  blob(x, [(g) => { g.beginPath(); g.roundRect(cx - 12 * s, cy - 11 * s, 24 * s, 22 * s, 4 * s); }], '#C8CCD0', '#8A8E94', { line: LW });
  for (const p of [-0.55, -0.15]) blob(x, [(g) => { g.beginPath(); g.roundRect(cx - side * p * w * 1.5 - 13 * s, cy - 6 * s, 26 * s, 30 * s, 5 * s); }], '#232328', '#121214', { line: LW });
  blob(x, [(g) => { g.beginPath(); g.roundRect(kx - 7 * s, cy - 10 * s, 14 * s, 26 * s, 3 * s); }], '#B8BCC0', '#7A7E84', { line: LW });   // the key clip
  if (keys > 0) drawKeys(x, { cx: kx, cy: ky + 10 * s, s: ks, swing });
  return res;
}

/** the officer's badge: a gold six-point star on a small dark leather tab, pinned on the chest. (cx, cy) = its centre.
 *  Nominal 44 x 56 at s = 1 (no lettering). */
export function drawBadge(x, { cx = 540, cy = 900, s = 1 } = {}) {
  if (!x) return { box: [cx - 24 * s, cy - 30 * s, 48 * s, 60 * s] };
  const LW = LWs(s * 0.8);
  blob(x, [(g) => { g.beginPath(); g.roundRect(cx - 22 * s, cy - 28 * s, 44 * s, 56 * s, 10 * s); }], '#2A2420', '#1A1614', { line: LW });
  const star = (g) => { g.beginPath(); for (let i = 0; i < 12; i++) { const r = (i % 2 ? 9 : 19) * s, a = -Math.PI / 2 + i * Math.PI / 6; i ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); };
  blob(x, [star], '#E8C04A', '#B08A28', { line: LW });
  circ(x, cx, cy, 4 * s); x.fillStyle = '#FFF0B0'; x.fill();
  return { box: [cx - 24 * s, cy - 30 * s, 48 * s, 60 * s] };
}

/** a dead hand pressed flat on glass, seen from the other side, in the cast's chibi proportions: a round grey palm with
 *  four short fat finger nubs and a thumb nub (the rig's own hands are mittens; these only spread the fingers because
 *  they're pressed), the pressed pads paler. (cx, cy) = the palm's centre, which goes at the end of that walker's own
 *  arm (drawHuman's `hands`); rot = which way the fingers point (0 = up); side 1 = thumb on the screen's left.
 *  Size: s ≈ the walker's scale × 0.5 makes it match the rig's hand. Nominal 60 x 80 at s = 1. */
export function drawDeadHand(x, { cx = 540, cy = 700, s = 1, rot = 0, side = 1, press = 1, col = DEAD } = {}) {
  const box = [cx - 44 * s, cy - 60 * s, 88 * s, 110 * s];
  if (!x) return { box };
  const LW = LWs(s * 0.8);
  x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(side, 1);
  const fingers = [[-15, -20, 0.22, 15], [-5, -24, 0.07, 19], [6, -23, -0.07, 18], [16, -19, -0.22, 14]];   // [x, y, tilt, length]
  const parts = [(g) => ell(g, 0, 0, 22 * s, 23 * s)];
  for (const [fx, fy, a, L] of fingers) parts.push((g) => { g.save(); g.translate(fx * s, fy * s); g.rotate(-a); g.roundRect(-6 * s, -L * s, 12 * s, (L + 8) * s, 6 * s); g.restore(); });
  parts.push((g) => { g.save(); g.translate(-20 * s, 4 * s); g.rotate(-1.0); g.roundRect(-6.5 * s, -18 * s, 13 * s, 24 * s, 6.5 * s); g.restore(); });   // the thumb
  parts.push((g) => { g.roundRect(-15 * s, 14 * s, 30 * s, 34 * s, 9 * s); });                                          // the wrist
  blob(x, parts.map((p_) => (g) => { g.beginPath(); p_(g); }), col, shadeOf(col, 0.3), { line: LW });
  if (press > 0) {                                                     // the pressed pads, paler where they touch the glass
    x.save(); x.globalAlpha = 0.42 * press; x.fillStyle = mixHex(col, '#F0F2E8', 0.55);
    for (const [fx, fy, a, L] of fingers) { const tx = fx * s + Math.sin(a) * (L - 5) * s, ty = fy * s - Math.cos(a) * (L - 5) * s; ell(x, tx, ty, 4.5 * s, 5.5 * s, -a); x.fill(); }
    ell(x, 0, 3 * s, 14 * s, 13 * s); x.fill(); x.restore();
  }
  x.restore();
  return { box };
}

/** your own arm reaching into a close shot (an ignition, a switch, a key), in YOUR rig's proportions: the dotted gown
 *  sleeve from the frame edge to the elbow, a skin forearm of the rig's width, a mitten hand (handR) with a thumb, and
 *  (point: 1) the index finger out. from = where the arm enters (a frame edge or the shoulder), to = the hand's centre;
 *  s = the rig scale it should match (the hand's radius is 12 s); bend lifts the elbow (px at s 1). Returns { tip }. */
export function drawPovArm(x, { from = [0, 1920], to = [540, 1200], s = 4, point = 0, bend = 30, skin = '#DDAE88', sleeve = '#C9DCE4', sleeve2 = '#8EAAB8' } = {}) {
  const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const el = [from[0] + dx * 0.55 + nx * bend * s * 0.5, from[1] + dy * 0.55 + ny * bend * s * 0.5];
  const tip = [to[0] + ux * 26 * s, to[1] + uy * 26 * s];
  if (!x) return { tip };
  const LW = LWs(s * 0.7), armW = 19.5 * 0.84 * s, sk = shadeOf(skin, 0.25);
  const wr = [to[0] - ux * 10 * s, to[1] - uy * 10 * s];
  tube(x, [el, wr], armW, skin, { line: LW, shade: sk });                                 // the forearm, an even width
  tube(x, [from, el], 19.5 * 1.08 * s, sleeve, { line: LW, shade: shadeOf(sleeve, 0.2) });   // the gown sleeve to the elbow
  x.save(); x.fillStyle = sleeve2;                                                       // its printed dots
  for (let i = 1; i < 5; i++) { const k = i / 5; circ(x, lerp(from[0], el[0], k) + nx * 4 * s * (i % 2 ? 1 : -1), lerp(from[1], el[1], k) + ny * 4 * s * (i % 2 ? 1 : -1), 2.4 * s); x.fill(); }
  x.restore();
  const cuff = [lerp(from[0], el[0], 0.97), lerp(from[1], el[1], 0.97)];
  blob(x, [(g) => ell(g, cuff[0], cuff[1], 11 * s, 6 * s, Math.atan2(uy, ux) + Math.PI / 2)], sleeve, shadeOf(sleeve, 0.2), { line: LW });
  const hand = [(g) => circ(g, to[0], to[1], 12 * s), (g) => { g.save(); g.translate(to[0] - nx * 9 * s, to[1] - ny * 9 * s); g.rotate(Math.atan2(uy, ux) - 0.6); g.beginPath(); g.roundRect(-5 * s, -5 * s, 15 * s, 10 * s, 5 * s); g.restore(); }];
  if (point) hand.push((g) => { g.save(); g.translate(to[0] + ux * 8 * s, to[1] + uy * 8 * s); g.rotate(Math.atan2(uy, ux)); g.beginPath(); g.roundRect(0, -4.2 * s, 19 * s, 8.4 * s, 4.2 * s); g.restore(); });
  blob(x, hand, skin, sk, { line: LW });
  return { tip: point ? tip : to };
}

/** a crack spreading across a windshield from an impact point: jagged radial cracks plus broken rings between them,
 *  white with a dark edge so it reads on any background. k 0..1 grows it (0 = nothing). Seeded, so it grows in place. */
export function drawCrack(x, { cx = 540, cy = 700, s = 1, k = 1, seed = 3, reach = 520 } = {}) {
  const R = reach * s * clamp(k), box = [cx - R, cy - R, 2 * R, 2 * R];
  if (!x || k <= 0) return { box };
  const n = 11, rays = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (h01(i, seed) - 0.5) * 0.5, L = R * (0.45 + 0.55 * h01(i, seed + 1)), pts = [[cx, cy]];
    for (let j = 1; j <= 6; j++) { const r = L * j / 6, wob = (h01(i * 7 + j, seed + 2) - 0.5) * 0.22; pts.push([cx + Math.cos(a + wob) * r, cy + Math.sin(a + wob) * r]); }
    rays.push(pts);
  }
  const stroke = (pts, w) => { x.beginPath(); x.moveTo(...pts[0]); for (const p of pts.slice(1)) x.lineTo(...p); x.lineWidth = w; x.stroke(); };
  x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
  for (const pass of [0, 1]) {
    x.strokeStyle = pass ? 'rgba(250,252,255,0.92)' : 'rgba(20,24,30,0.45)';
    const w = pass ? 2.6 * s : 5 * s;
    for (const r of rays) stroke(r, w);
    for (let ring = 1; ring <= 3; ring++) {                            // breaks between neighbouring rays
      if (ring / 3 > k * 1.1) continue;
      for (let i = 0; i < n; i++) {
        if (h01(i * 3 + ring, seed + 5) < 0.3) continue;
        const a = rays[i][Math.min(6, ring * 2)], b = rays[(i + 1) % n][Math.min(6, ring * 2)];
        stroke([a, [lerp(a[0], b[0], 0.5) + (h01(i, seed + 6 + ring) - 0.5) * 20 * s, lerp(a[1], b[1], 0.5) + (h01(i, seed + 9 + ring) - 0.5) * 20 * s], b], w * 0.8);
      }
    }
  }
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, 40 * s); g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  circ(x, cx, cy, 40 * s); x.fillStyle = g; x.fill();                 // the impact star: crushed glass
  x.restore();
  return { box };
}

/** the dog's bandana flipped inside out (mid-leap): the plain underside of the red cloth with SCOUT stitched in white
 *  thread, and under it "Belongs to" and a line the folded-back flap hides (episode 3 reveals it). (cx, cy) = the knot
 *  at the neck; rot = where the cloth flies (radians, 0 = hanging down). Nominal 240 x 200 at s = 1. Returns { box }. */
export function drawBandanaInside(x, { cx = 540, cy = 900, s = 1, rot = 0, fold = 1 } = {}) {
  const box = [cx - 130 * s, cy - 20 * s, 260 * s, 230 * s];
  if (!x) return { box };
  const LW = LWs(s), col = '#B02622', sh = shadeOf(col, 0.3);
  x.save(); x.translate(cx, cy); x.rotate(rot);
  const tri = (g) => { g.beginPath(); g.moveTo(-118 * s, 0); g.quadraticCurveTo(0, 18 * s, 118 * s, -4 * s); g.quadraticCurveTo(60 * s, 90 * s, 6 * s, 196 * s); g.quadraticCurveTo(-50 * s, 96 * s, -118 * s, 0); g.closePath(); };
  for (const sg of [-1, 1]) blob(x, [(g) => poly(g, [[sg * 104 * s, -6 * s], [sg * 150 * s, -34 * s], [sg * 158 * s, -8 * s], [sg * 116 * s, 12 * s]])], col, sh, { line: LW });   // the knot's two ends at the neck
  blob(x, [tri], mixHex(col, '#5A1410', 0.12), sh, { line: LW });
  x.save(); tri(x); x.clip();
  x.globalAlpha = 0.18; x.strokeStyle = '#5A1410'; x.lineWidth = 1.4 * s;           // the weave of the plain underside
  for (let i = -12; i < 12; i++) { x.beginPath(); x.moveTo(i * 20 * s, -10 * s); x.lineTo(i * 20 * s + 220 * s, 210 * s); x.stroke(); }
  x.globalAlpha = 1;
  const stitch = (txt, px, py, size) => {                              // white thread: a soft body under a dashed stitch
    x.font = `${size * s}px "Patrick Hand"`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = size * 0.13 * s; x.strokeStyle = 'rgba(255,248,236,0.55)'; x.strokeText(txt, px, py);
    x.setLineDash([size * 0.09 * s, size * 0.05 * s]); x.lineWidth = size * 0.085 * s; x.strokeStyle = '#FFF8EC'; x.strokeText(txt, px, py); x.setLineDash([]);
  };
  stitch('SCOUT', 0, 44 * s, 60);
  stitch('Belongs to', -4 * s, 92 * s, 26);
  x.lineWidth = 2.4 * s; x.strokeStyle = '#FFF8EC'; x.setLineDash([5 * s, 4 * s]);  // the hidden line: just thread under the fold
  x.beginPath(); x.moveTo(-70 * s, 132 * s); x.lineTo(60 * s, 130 * s); x.stroke(); x.setLineDash([]);
  x.restore();
  if (fold > 0) {                                                      // the flap folded back over the lower line
    const flap = (g) => { g.beginPath(); g.moveTo(-88 * s, 114 * s); g.quadraticCurveTo(0, 104 * s, 76 * s, 110 * s); g.lineTo(6 * s, 198 * s); g.closePath(); };
    blob(x, [flap], col, sh, { line: LW });
    x.save(); flap(x); x.clip(); x.fillStyle = 'rgba(255,236,220,0.55)';
    for (let i = 0; i < 5; i++) { circ(x, -40 * s + i * 22 * s, 140 * s + (i % 2) * 14 * s, 5 * s); x.fill(); }   // the printed side shows on the flap
    x.restore();
  }
  x.restore();
  return { box };
}
