// Unter der Brücke: DIE REQUISITEN. Vertrag: kit/KIT_API.md. Cel-Stil: blob()/tube() mit Tuschelinie, Licht von links oben.
// Jede Funktion ist (x, o) -> Punkte, rein aus den Eingaben (x darf null sein: dann nur Punkte). Keine Marken, kein Text
// außer Schildern, die zur Welt gehören.
import { TAU, clamp, lerp, mixHex, h01, blob, tube, line, curve, ell, circ, poly, shadeOf, glow } from '../engine.mjs';

const LWs = (s) => clamp(4.2 * s, 1.2, 6.5);
const rect = (cx, cy, w, h) => (g) => { g.beginPath(); g.rect(cx - w / 2, cy - h, w, h); };

/** Der Karton. (cx, cy) = Mitte der Unterkante, s = Maßstab (1 = 300 px breit, 220 hoch). open 0..1 = die Klappen gehen auf,
 *  items 0..1 = Inhalt sichtbar (Kaktus, Tasse, Stapler), sag 0..1 = er wirkt schwer (Kanten biegen sich). */
export function drawBox(x, { cx = 540, cy = 1500, s = 1, open = 0, items = 1, sag = 0, cactus = 1, t = 0 } = {}) {
  const w = 300 * s, h = 220 * s, top = cy - h, pts = { top: [cx, top], cactus: [cx - 60 * s, top - 70 * s], box: [cx - w / 2, top, w, h], inside: [cx, top + 10 * s] };
  if (!x) return pts;
  const LW = LWs(s), col = '#B98A55';
  // Inhalt hinter der Vorderwand
  if (items > 0) {
    // Tasse
    blob(x, [(g) => ell(g, cx + 80 * s, top - 40 * s, 34 * s, 30 * s)], '#D9D4C8', shadeOf('#D9D4C8', 0.3), { line: LW * 0.8 });
    blob(x, [(g) => ell(g, cx + 80 * s, top - 62 * s, 28 * s, 8 * s)], '#4A3226', '#2E1F18', { line: LW * 0.5 });
    // Stapler
    blob(x, [(g) => { g.beginPath(); g.roundRect(cx - 10 * s, top - 52 * s, 80 * s, 30 * s, 7 * s); }], '#C0392B', shadeOf('#C0392B', 0.3), { line: LW * 0.8 });
    // Kaktus
    if (cactus > 0) drawCactus(x, { cx: cx - 80 * s, cy: top + 14 * s, s: 1.25 * s * cactus, t });
  }
  // Vorderwand
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx - w / 2, top); g.lineTo(cx + w / 2, top); g.lineTo(cx + w / 2 - sag * 8 * s, cy); g.lineTo(cx - w / 2 + sag * 8 * s, cy); g.closePath(); }], col, shadeOf(col, 0.28), { line: LW });
  // Klebeband und Beschriftung (Kritzel, kein Text)
  blob(x, [rect(cx, cy, 40 * s, h)], '#D8B878', shadeOf('#D8B878', 0.25), { line: LW * 0.4 });
  blob(x, [(g) => { g.beginPath(); g.rect(cx - 112 * s, cy - 112 * s, 74 * s, 50 * s); }], '#F1E8D2', shadeOf('#F1E8D2', 0.2), { line: LW * 0.5 });
  line(x, [[cx - 102 * s, cy - 96 * s], [cx - 50 * s, cy - 96 * s]], LW * 0.6, '#5A3A22'); line(x, [[cx - 102 * s, cy - 80 * s], [cx - 62 * s, cy - 80 * s]], LW * 0.6, '#5A3A22');
  // Klappen
  for (const sgn of [-1, 1]) {
    const a = open * 1.15;
    blob(x, [(g) => poly(g, [[cx + sgn * w / 2, top], [cx + sgn * (w / 2 + 70 * s * Math.cos(a)), top - 70 * s * Math.sin(a)], [cx + sgn * (w / 2 + 70 * s * Math.cos(a) - 140 * s), top - 70 * s * Math.sin(a) - 8 * s], [cx + sgn * (w / 2 - 140 * s), top - 8 * s]])], mixHex(col, '#FFFFFF', 0.08), shadeOf(col, 0.3), { line: LW * 0.8 });
  }
  return pts;
}

/** Kaktus im Töpfchen. (cx, cy) = Unterkante, s = 1 = 110 px hoch. Gibt { top } zurück. */
export function drawCactus(x, { cx = 540, cy = 1500, s = 1, t = 0 } = {}) {
  const pts = { top: [cx, cy - 110 * s] };
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx - 26 * s, cy - 34 * s); g.lineTo(cx + 26 * s, cy - 34 * s); g.lineTo(cx + 20 * s, cy); g.lineTo(cx - 20 * s, cy); g.closePath(); }], '#C8704A', shadeOf('#C8704A', 0.3), { line: LW });
  blob(x, [(g) => { g.beginPath(); g.roundRect(cx - 17 * s, cy - 104 * s, 34 * s, 76 * s, 17 * s); }], '#4C9A5A', shadeOf('#4C9A5A', 0.3), { line: LW });
  blob(x, [(g) => { g.beginPath(); g.roundRect(cx + 10 * s, cy - 82 * s, 28 * s, 14 * s, 7 * s); }, (g) => { g.beginPath(); g.roundRect(cx + 26 * s, cy - 96 * s, 14 * s, 30 * s, 7 * s); }], '#4C9A5A', shadeOf('#4C9A5A', 0.3), { line: LW * 0.8 });
  for (const [px, py] of [[-6, -90], [4, -70], [-8, -52], [32, -88]]) line(x, [[cx + px * s, cy + py * s], [cx + (px + 4) * s, cy + (py - 5) * s]], LW * 0.4, '#F4EBD0');
  return pts;
}

/** Glastür des Bürogebäudes. (cx, cy) = Unterkante Mitte, 1 = 300 x 560. shadow 0..1 = Silhouette einer Frau dahinter (Brandt),
 *  open 0..1 = die Tür schwingt auf, slam 0..1 = Erschütterungs-Stoß (Glas wackelt). Gibt { glass, handle, shadowHead } zurück. */
export function drawGlassDoor(x, { cx = 540, cy = 1500, s = 1, t = 0, shadow = 1, open = 0, slam = 0, light = 1 } = {}) {
  const w = 300 * s, h = 560 * s, top = cy - h, gx = cx - w / 2 + 24 * s, gw = w - 48 * s;
  const pts = { glass: [gx, top + 24 * s, gw, h - 48 * s], handle: [cx + w / 2 - 44 * s, cy - h * 0.46], shadowHead: [cx, cy - h * 0.62] };
  if (!x) return pts;
  const LW = LWs(s), fr = '#2F3440', jig = slam * Math.sin(t * 60) * 5 * s;
  blob(x, [(g) => { g.beginPath(); g.rect(cx - w / 2 - 14 * s, top - 14 * s, w + 28 * s, h + 14 * s); }], '#1D2029', '#12141A', { line: LW });
  // Glasfläche mit warmem Innenlicht
  const gr = x.createLinearGradient(0, top, 0, cy);
  gr.addColorStop(0, mixHex('#FFE9B8', '#8A98B4', 0.2 * (1 - light))); gr.addColorStop(1, mixHex('#F2C47A', '#6A7690', 0.3 * (1 - light)));
  x.save(); x.translate(jig, 0); x.fillStyle = gr; x.beginPath(); x.rect(gx, top + 24 * s, gw, h - 48 * s); x.fill();
  // Silhouette: Kopf, Bob, Schultern (nur Umriss)
  if (shadow > 0) {
    x.globalAlpha = shadow; x.fillStyle = '#17141C';
    const sx = cx, sy = cy - 24 * s;
    x.beginPath(); x.ellipse(sx, sy - 360 * s, 44 * s, 52 * s, 0, 0, TAU); x.fill();
    x.beginPath(); x.moveTo(sx - 50 * s, sy - 330 * s); x.quadraticCurveTo(sx - 70 * s, sy - 280 * s, sx - 56 * s, sy - 250 * s); x.lineTo(sx + 56 * s, sy - 250 * s); x.quadraticCurveTo(sx + 70 * s, sy - 280 * s, sx + 50 * s, sy - 330 * s); x.fill();
    x.beginPath(); x.moveTo(sx - 96 * s, sy - 230 * s); x.quadraticCurveTo(sx, sy - 280 * s, sx + 96 * s, sy - 230 * s); x.lineTo(sx + 110 * s, sy); x.lineTo(sx - 110 * s, sy); x.closePath(); x.fill();
    x.globalAlpha = 1;
  }
  // Reflexion und Rahmen
  x.fillStyle = 'rgba(255,255,255,0.10)'; x.beginPath(); x.moveTo(gx + 10 * s, top + 24 * s); x.lineTo(gx + 90 * s, top + 24 * s); x.lineTo(gx + 20 * s, cy - 24 * s); x.lineTo(gx - 10 * s, cy - 24 * s); x.closePath(); x.fill();
  x.restore();
  line(x, [[gx, top + 24 * s], [gx + gw, top + 24 * s], [gx + gw, cy - 24 * s], [gx, cy - 24 * s], [gx, top + 24 * s]], LW * 1.2, fr);
  tube(x, [[cx + w / 2 - 44 * s, cy - h * 0.58], [cx + w / 2 - 44 * s, cy - h * 0.34]], 14 * s, '#C9CCD6', { line: LW * 0.8, shade: shadeOf('#C9CCD6', 0.3) });
  return pts;
}

/** Fassade des Bürogebäudes (für das Set): Brandt-Logistik-Schild ohne Text, nur ein Logo-Balken. */
export function drawPlanter(x, { cx = 200, cy = 1500, s = 1 } = {}) {
  if (!x) return { top: [cx, cy - 120 * s] };
  const LW = LWs(s);
  blob(x, [rect(cx, cy, 140 * s, 80 * s)], '#6A6C74', shadeOf('#6A6C74', 0.3), { line: LW });
  blob(x, [(g) => ell(g, cx, cy - 110 * s, 62 * s, 52 * s)], '#3A6A4C', shadeOf('#3A6A4C', 0.3), { line: LW });
  return { top: [cx, cy - 120 * s] };
}

/** Das Tonnenfeuer. (cx, cy) = Unterkante, 1 = 150 x 200. Flammen laufen über t. barrelGlow() zeichnet das Licht auf eine 'add'-Ebene.
 *  Gibt { mouth, flame } zurück (mouth = Mitte der Öffnung, Lichtquelle). */
export function drawBarrel(x, { cx = 640, cy = 1500, s = 1, t = 0, fire = 1 } = {}) {
  const w = 150 * s, h = 200 * s, top = cy - h, pts = { mouth: [cx, top + 4 * s], flame: [cx, top - 70 * s * fire] };
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx - w / 2, top); g.lineTo(cx + w / 2, top); g.lineTo(cx + w / 2 - 8 * s, cy); g.lineTo(cx - w / 2 + 8 * s, cy); g.closePath(); }], '#5A5E68', shadeOf('#5A5E68', 0.3), { line: LW });
  for (const k of [0.3, 0.65]) line(x, [[cx - w / 2 + 2 * s, top + h * k], [cx + w / 2 - 2 * s, top + h * k]], LW * 0.7, '#3A3D45');
  // Luftlöcher (heller Schein)
  for (let i = 0; i < 3; i++) { x.fillStyle = `rgba(255,170,70,${0.7 * fire})`; x.beginPath(); x.ellipse(cx - 40 * s + i * 40 * s, top + h * 0.2, 7 * s, 5 * s, 0, 0, TAU); x.fill(); }
  // Öffnung + Flammen
  blob(x, [(g) => ell(g, cx, top, w / 2, 14 * s)], '#2A2A30', '#1A1A1E', { line: LW });
  if (fire > 0) for (const [k, col, wid, hh] of [[0, '#E8561E', 1, 1], [1, '#F29A2E', 0.7, 0.75], [2, '#FFD77A', 0.42, 0.5]]) {
    const fl = 1 + 0.18 * Math.sin(t * 11 + k * 2) + 0.1 * Math.sin(t * 23 + k);
    const hgt = 100 * s * hh * fl * fire, ww = 56 * s * wid, sw = Math.sin(t * 7 + k) * 8 * s;
    x.fillStyle = col; x.beginPath(); x.moveTo(cx - ww, top); x.quadraticCurveTo(cx - ww * 0.9 + sw, top - hgt * 0.6, cx + sw, top - hgt); x.quadraticCurveTo(cx + ww * 0.9 + sw, top - hgt * 0.5, cx + ww, top); x.closePath(); x.fill();
  }
  return pts;
}
export function barrelGlow(x, { cx = 640, cy = 1500, s = 1, t = 0, k = 1 } = {}) {
  const fl = 0.85 + 0.15 * Math.sin(t * 13) + 0.08 * Math.sin(t * 29), top = cy - 200 * s;
  glow(x, cx, top - 30 * s, 520 * s, 0.55 * k * fl, '255,150,60', 0.15);
  glow(x, cx, top - 50 * s, 190 * s, 0.7 * k * fl, '255,210,120', 0.25);
}

/** Der schwarze Wagen, von vorn-seitlich gesehen (nach links schauend). (cx, cy) = Unterkante Mitte, 1 = 560 breit. lights 0..1,
 *  scratch 0..1 = der runde Kratzer an der Fahrertür (Hinweis), binoculars 0..1 = Fernglas hinter der Scheibe,
 *  door 0..1 = Fahrertür offen. Gibt { scratch, headlight, window, door } zurück. */
export function drawBlackCar(x, { cx = 700, cy = 600, s = 1, t = 0, lights = 1, scratch = 1, binoculars = 0, door = 0 } = {}) {
  const w = 560 * s, h = 190 * s, pts = { scratch: [cx + 40 * s, cy - 78 * s, 56 * s, 56 * s], headlight: [cx - w / 2 + 40 * s, cy - 76 * s], window: [cx - 20 * s, cy - h * 0.82], door: [cx + 40 * s, cy - 90 * s] };
  if (!x) return pts;
  const LW = LWs(s), body = '#232837';
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx - w / 2, cy - 30 * s); g.quadraticCurveTo(cx - w / 2, cy - 100 * s, cx - w / 2 + 70 * s, cy - 110 * s); g.lineTo(cx - 120 * s, cy - h * 0.86); g.quadraticCurveTo(cx - 80 * s, cy - h, cx - 10 * s, cy - h); g.lineTo(cx + 140 * s, cy - h); g.quadraticCurveTo(cx + 200 * s, cy - h * 0.9, cx + 230 * s, cy - 110 * s); g.lineTo(cx + w / 2, cy - 96 * s); g.lineTo(cx + w / 2, cy - 28 * s); g.closePath(); }], body, shadeOf(body, 0.35), { line: LW });
  // Scheibe
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx - 100 * s, cy - h * 0.8); g.lineTo(cx - 20 * s, cy - h * 0.93); g.lineTo(cx + 130 * s, cy - h * 0.93); g.lineTo(cx + 190 * s, cy - 112 * s); g.lineTo(cx - 110 * s, cy - 112 * s); g.closePath(); }], '#2B3340', '#1B212B', { line: LW * 0.7 });
  if (binoculars > 0) { x.globalAlpha = binoculars; x.fillStyle = '#0A0B0F'; x.beginPath(); x.ellipse(cx + 6 * s, cy - 138 * s, 28 * s, 12 * s, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(cx + 54 * s, cy - 138 * s, 28 * s, 12 * s, 0, 0, TAU); x.fill(); x.globalAlpha = 1; }
  // Fahrertür-Linie und Kratzer (runde Schramme)
  line(x, [[cx - 40 * s, cy - 108 * s], [cx - 40 * s, cy - 36 * s]], LW * 0.5, '#3A3E48'); line(x, [[cx + 150 * s, cy - 108 * s], [cx + 150 * s, cy - 36 * s]], LW * 0.5, '#3A3E48');
  if (scratch > 0) { x.save(); x.globalAlpha = scratch; x.strokeStyle = '#C8CCD8'; x.lineWidth = Math.max(2, 4 * s); x.beginPath(); x.arc(cx + 68 * s, cy - 64 * s, 24 * s, 0.3, TAU - 0.5); x.stroke(); x.restore(); }
  // Räder
  for (const wx of [cx - 170 * s, cx + 170 * s]) blob(x, [(g) => circ(g, wx, cy - 24 * s, 42 * s)], '#0C0D10', '#050507', { line: LW });
  // Scheinwerfer
  blob(x, [(g) => ell(g, cx - w / 2 + 38 * s, cy - 76 * s, 30 * s, 16 * s, -0.2)], mixHex('#FFF4D0', '#6A6E78', 1 - lights), '#BDB69A', { line: LW * 0.7 });
  return pts;
}
export function carGlow(x, { cx = 700, cy = 600, s = 1, t = 0, k = 1, sweep = 0 } = {}) {
  const hx = cx - 280 * s + 38 * s, hy = cy - 76 * s;
  glow(x, hx, hy, 420 * s, 0.8 * k, '255,244,210', 0.2);
  glow(x, hx - 260 * s, hy + 110 * s, 520 * s, 0.35 * k, '255,240,200', 0.1);
  glow(x, cx + 280 * s - 20 * s, cy - 80 * s, 80 * s, 0.7 * k, '255,50,40', 0.3);
}

/** Der Umschlag in Brandts Hand / im Fallen. (cx, cy) = Mitte, rot = Drehung. 1 = 120 x 80. Gibt { c } zurück. */
export function drawEnvelope(x, { cx = 540, cy = 900, s = 1, rot = 0 } = {}) {
  const pts = { c: [cx, cy] };
  if (!x) return pts;
  const LW = LWs(s);
  x.save(); x.translate(cx, cy); x.rotate(rot);
  blob(x, [(g) => { g.beginPath(); g.rect(-60 * s, -40 * s, 120 * s, 80 * s); }], '#F1E8D2', shadeOf('#F1E8D2', 0.25), { line: LW });
  line(x, [[-60 * s, -40 * s], [0, 4 * s], [60 * s, -40 * s]], LW * 0.7, '#8A7A5A');
  blob(x, [(g) => circ(g, 0, 4 * s, 9 * s)], '#B8302A', shadeOf('#B8302A', 0.3), { line: LW * 0.5 });
  x.restore();
  return pts;
}

/** Pfandsack (durchsichtig, mit Flaschen). (cx, cy) = Unterkante. 1 = 130 x 170. */
export function drawBottleSack(x, { cx = 300, cy = 1500, s = 1 } = {}) {
  const pts = { top: [cx, cy - 170 * s] };
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx - 52 * s, cy); g.quadraticCurveTo(cx - 74 * s, cy - 90 * s, cx - 30 * s, cy - 150 * s); g.lineTo(cx + 30 * s, cy - 150 * s); g.quadraticCurveTo(cx + 74 * s, cy - 90 * s, cx + 52 * s, cy); g.closePath(); }], '#8AA6A0', shadeOf('#8AA6A0', 0.3), { line: LW });
  for (let i = 0; i < 6; i++) { const bx = cx - 34 * s + (i % 3) * 34 * s, by = cy - 28 * s - Math.floor(i / 3) * 52 * s; blob(x, [(g) => { g.beginPath(); g.roundRect(bx - 11 * s, by - 40 * s, 22 * s, 40 * s, 8 * s); }], '#D9C9A0', shadeOf('#D9C9A0', 0.25), { line: LW * 0.5 }); }
  tube(x, [[cx - 20 * s, cy - 150 * s], [cx, cy - 172 * s], [cx + 20 * s, cy - 150 * s]], 10 * s, '#8AA6A0', { line: LW * 0.6 });
  return pts;
}

/** Holzkiste als Sitz. (cx, cy) = Unterkante. 1 = 170 x 120. Gibt { seat } (Sitzhöhe y). */
export function drawCrateSeat(x, { cx = 540, cy = 1500, s = 1, col = '#8A6A44' } = {}) {
  const w = 170 * s, h = 120 * s, pts = { seat: [cx, cy - h] };
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [rect(cx, cy, w, h)], col, shadeOf(col, 0.3), { line: LW });
  for (const k of [0.34, 0.68]) line(x, [[cx - w / 2, cy - h * k], [cx + w / 2, cy - h * k]], LW * 0.6, shadeOf(col, 0.5));
  return pts;
}

/** Teetasse in der Hand / auf dem Fass. (cx, cy) = Unterkante. 1 = 56 x 52. steam 0..1. */
export function drawTeaCup(x, { cx = 540, cy = 1500, s = 1, t = 0, steam = 1 } = {}) {
  const pts = { top: [cx, cy - 52 * s] };
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx - 28 * s, cy - 52 * s); g.lineTo(cx + 28 * s, cy - 52 * s); g.lineTo(cx + 20 * s, cy); g.lineTo(cx - 20 * s, cy); g.closePath(); }], '#E8E2D4', shadeOf('#E8E2D4', 0.3), { line: LW * 0.8 });
  curve(x, [cx + 28 * s, cy - 40 * s], [cx + 52 * s, cy - 34 * s], [cx + 24 * s, cy - 16 * s], LW * 0.9, '#2B1D17');
  if (steam > 0) for (let i = 0; i < 2; i++) { const o = Math.sin(t * 3 + i * 2) * 6 * s; curve(x, [cx - 8 * s + i * 16 * s, cy - 62 * s], [cx - 8 * s + i * 16 * s + o, cy - 86 * s], [cx - 8 * s + i * 16 * s - o, cy - 108 * s], LW * 0.6, `rgba(240,240,250,${0.55 * steam})`); }
  return pts;
}

/** Passant mit Schirm von hinten (Silhouetten-Statisten für die Stadtstraße). (cx, cy) = Füße. 1 = 240 hoch. */
export function drawPasserby(x, { cx = 300, cy = 1500, s = 1, col = '#1F2230', umb = '#3A4A6A', t = 0, dir = 1 } = {}) {
  const pts = { head: [cx, cy - 180 * s] };
  if (!x) return pts;
  const LW = LWs(s), sw = Math.sin(t * 6 + cx) * 12 * s * dir;
  tube(x, [[cx - 12 * s, cy], [cx - 8 * s + sw, cy - 70 * s]], 20 * s, col, { line: LW * 0.8 });
  tube(x, [[cx + 12 * s, cy], [cx + 8 * s - sw, cy - 70 * s]], 20 * s, col, { line: LW * 0.8 });
  blob(x, [(g) => { g.beginPath(); g.roundRect(cx - 30 * s, cy - 150 * s, 60 * s, 90 * s, 22 * s); }], col, shadeOf(col, 0.3), { line: LW });
  blob(x, [(g) => circ(g, cx, cy - 172 * s, 22 * s)], '#B88F70', shadeOf('#B88F70', 0.3), { line: LW * 0.8 });
  blob(x, [(g) => { g.beginPath(); g.moveTo(cx - 76 * s, cy - 190 * s); g.quadraticCurveTo(cx, cy - 270 * s, cx + 76 * s, cy - 190 * s); g.closePath(); }], umb, shadeOf(umb, 0.3), { line: LW });
  line(x, [[cx, cy - 190 * s], [cx, cy - 120 * s]], LW * 0.8, '#2B1D17');
  return pts;
}
export { TAU, lerp, curve, ell, circ, tube, glow };
