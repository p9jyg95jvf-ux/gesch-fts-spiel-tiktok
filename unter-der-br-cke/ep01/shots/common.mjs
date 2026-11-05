// Gemeinsame Helfer für Folge 1 (Zeit in Sekunden = Frame / 30). Jede Einstellung ist eine reine Funktion der Zeit.
import { camMatrix, applyCam, contactShadow, drawHuman, drawCritter } from '../../engine.mjs';
import { DU } from '../../kit/cast.mjs';
import { drawBox } from '../../kit/props.mjs';

export const T = (f) => f / 30;
export const on = (L, n, M) => { if (!L[n].on) return false; applyCam(L[n].x, M); return true; };
/** Kamera: der Weltpunkt (fx, fy) landet bei Bildpunkt (sx, sy), um `zoom` vergrößert. */
export const fr = (fx, fy, sx, sy, zoom = 1, o = {}) => camMatrix({ zoom, cx: fx, cy: fy, dx: sx - fx + (o.dx || 0), dy: sy - fy + (o.dy || 0), rot: o.rot || 0 }, o.depth);
export const I = camMatrix({});

// Stammpositionen unter der Brücke (Weltkoordinaten, in jeder Einstellung gleich)
export const BR = {
  barrel: { cx: 660, cy: 1530, s: 1.25 }, crate: { cx: 470, cy: 1560, s: 1.1 }, crate2: { cx: 250, cy: 1560, s: 1.1 }, sack: { cx: 1010, cy: 1560, s: 1.1 },
  hertha: { x: 470, y: 1560, s: 1.5 }, kemal: { x: 880, y: 1620, s: 1.55 }, du: { x: 300, y: 1700, s: 1.8 }, dog: { x: 570, y: 1730, s: 1.7 },
};

/** Du mit Karton: zeichnet Du, dann den Karton in den Händen. Gibt die Punkte von Du zurück. */
export function duWithBox(x, P, o = {}) {
  const D = drawHuman(null, DU, P);
  if (x) {
    contactShadow(x, P.x, P.y, 120 * (P.s / 1.8), 16, 0.35);
    drawHuman(x, DU, P);
    if (o.box !== false) { const k = P.s / 1.8, h = D.hands[0]; drawBox(x, { cx: h[0] + 20 * k, cy: h[1] + 175 * k, s: 0.68 * k, sag: o.sag ?? 1, open: o.open ?? 0, items: 1, cactus: o.cactus ?? 1, t: P.t }); }
  }
  return D;
}
export const face = (pt, M, k = 1.2, zoom = 1) => { const h = pt.head; return [h[0], h[1], h[2] * k * zoom]; };
export const faceScreen = (D, M, camPt, k = 1.2, zoom = 1) => { const h = camPt(M, D.head[0], D.head[1]); return [h[0], h[1], D.head[2] * zoom * k]; };
