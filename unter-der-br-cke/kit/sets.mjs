// Unter der Brücke: DIE SETS. Jedes Set ist nach Tiefe geteilt (back / mid / ground / near), damit Einstellungen die Teile auf eigene
// Look-Ebenen legen (Parallaxe, Dunst, Schärfentiefe). Bildkoordinaten 1080 x 1920; ein Stück über den Rand zeichnen (Kamerabewegung).
// Jedes Set exportiert seine Ankerpunkte (Horizont, Boden, Tür, Feuer ...), damit alle Einstellungen zusammenpassen.
import { W, H, TAU, lerp, h01, rgba, mixHex, sky, stars, moon, ground, hills, fog, rain, blob, tube, line, ell, circ, poly, shadeOf, glow } from '../engine.mjs';

const M = 300; // Überhang links/rechts
const win = (x, cx, cy, w, h, on, col = '#FFD99A') => { x.fillStyle = on ? col : '#1A1E2C'; x.fillRect(cx - w / 2, cy - h / 2, w, h); };

// ───────────────────────── 1. BÜRO-EINGANG (Abend, Regen) ─────────────────────────
export const OFFICE = { hz: 1180, floor: 1500, door: [540, 1500], light: [540, 1180] };
export const office = {
  back(x, { t = 0 } = {}) {
    sky(x, { stops: [[0, '#2A3050'], [0.7, '#5A5878'], [1, '#8A7C86']], y0: -260, y1: OFFICE.hz });
    // Gebäudefassade, Betonplatten
    x.fillStyle = '#6E727E'; x.fillRect(-M, 320, W + 2 * M, OFFICE.floor - 320 + 120);
    x.fillStyle = '#5A5E6A'; for (let i = -1; i < 8; i++) x.fillRect(i * 170 - 6, 320, 12, OFFICE.floor - 320 + 120);
    for (let r = 0; r < 4; r++) for (let c = -1; c < 7; c++) win(x, c * 190 + 100, 480 + r * 190, 120, 130, h01(r * 9 + c, 3) > 0.38);
    // Vordach über der Tür + Schild-Balken (ohne Text, ein Logo-Zeichen)
    blob(x, [(g) => { g.beginPath(); g.rect(300, 1010, 480, 40); }], '#2A2E3A', '#1B1E27', { line: 5 });
    blob(x, [(g) => { g.beginPath(); g.roundRect(380, 930, 320, 64, 12); }], '#3A3F50', '#252836', { line: 5 });
    x.fillStyle = '#E8B84A'; x.beginPath(); x.moveTo(470, 975); x.lineTo(500, 945); x.lineTo(530, 975); x.closePath(); x.fill(); x.fillRect(560, 950, 100, 14); x.fillRect(560, 972, 70, 10);
    return OFFICE;
  },
  ground(x, { t = 0 } = {}) {
    ground(x, { hz: OFFICE.floor - 10, far: '#444856', near: '#262A36', y1: 3200 });
    // nasser Gehweg: Platten + Spiegelung des Türlichts
    for (let i = -2; i < 12; i++) line(x, [[i * 140 - 60, OFFICE.floor + 20], [i * 200 - 300, H + 40]], 3, 'rgba(20,24,34,0.55)');
    const g = x.createLinearGradient(0, OFFICE.floor, 0, H); g.addColorStop(0, 'rgba(255,214,140,0.30)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(380, OFFICE.floor); x.lineTo(700, OFFICE.floor); x.lineTo(1500, 3200); x.lineTo(-400, 3200); x.closePath(); x.fill();
    return OFFICE;
  },
  rain(x, { t = 0, a = 0.4 } = {}) { rain(x, { t, n: 220, a, angle: 0.16 }); },
  glows(x, { t = 0 } = {}) { glow(x, 540, 1260, 620, 0.35, '255,214,150', 0.2); glow(x, 540, 980, 360, 0.25, '232,184,74', 0.2); },
};

// ───────────────────────── 2. STADTSTRASSE (Nacht, Neon, Regen) ─────────────────────────
export const CITY = { hz: 1040, floor: 1560, light: [200, 760] };
export const city = {
  back(x, { t = 0 } = {}) {
    sky(x, { stops: [[0, '#10122A'], [0.6, '#2A2450'], [1, '#6A3A68']], y0: -260, y1: CITY.hz });
    // Skyline in zwei Tiefen
    for (const [base, col, seed, wmin] of [[CITY.hz, '#2A2C4A', 1, 90], [CITY.hz + 40, '#1C1E36', 2, 120]]) {
      let px = -M; let i = 0;
      while (px < W + M) { const bw = wmin + h01(i, seed) * 90, bh = 160 + h01(i, seed + 7) * 520; x.fillStyle = col; x.fillRect(px, base - bh, bw, bh + 200);
        for (let r = 0; r < bh / 56; r++) for (let c = 0; c < bw / 44; c++) if (h01(i * 31 + r * 7 + c, seed) > 0.62) { x.fillStyle = h01(i + r, seed + 3) > 0.7 ? '#9AD8E8' : '#FFD58A'; x.fillRect(px + 10 + c * 44, base - bh + 18 + r * 56, 20, 26); }
        px += bw + 6; i++; }
    }
    return CITY;
  },
  /** Mittelebene: Ladenfronten mit Neon (ohne Schrift) */
  mid(x, { t = 0 } = {}) {
    const neon = ['#FF4FA8', '#3FD8E8', '#FFB347', '#9A7CFF'];
    for (let i = -1; i < 6; i++) {
      const sx = i * 230, sy = CITY.floor - 380;
      blob(x, [(g) => { g.beginPath(); g.rect(sx, sy, 214, 380); }], '#242744', '#171A30', { line: 4 });
      blob(x, [(g) => { g.beginPath(); g.rect(sx + 20, sy + 150, 174, 170); }], mixHex('#FFE2A8', '#242744', 0.25 + 0.4 * h01(i, 9)), '#3A3A58', { line: 4 });
      const nc = neon[i & 3] || neon[0], fl = 0.85 + 0.15 * Math.sin(t * 9 + i * 2);
      x.save(); x.globalAlpha = fl; line(x, [[sx + 30, sy + 60], [sx + 184, sy + 60]], 12, nc); line(x, [[sx + 50, sy + 100], [sx + 164, sy + 100]], 8, nc); x.restore();
    }
    return CITY;
  },
  ground(x, { t = 0 } = {}) {
    ground(x, { hz: CITY.floor - 90, far: '#3A3C52', near: '#1A1C2C', y1: 3200 });
    // nasser Asphalt: Neon-Spiegelungen
    for (let i = 0; i < 8; i++) { const c = ['#FF4FA8', '#3FD8E8', '#FFB347'][i % 3], px = 60 + i * 150; const g = x.createLinearGradient(0, CITY.floor, 0, H); g.addColorStop(0, rgba(c.length === 7 ? c : '#FFFFFF', 0.28)); g.addColorStop(1, rgba('#000000', 0)); x.fillStyle = g; x.fillRect(px - 26, CITY.floor, 52, 1700); }
    return CITY;
  },
  rain(x, { t = 0, a = 0.35 } = {}) { rain(x, { t, n: 260, a, angle: 0.18 }); },
  glows(x, { t = 0 } = {}) { for (let i = 0; i < 6; i++) { const c = ['255,79,168', '63,216,232', '255,179,71'][i % 3]; glow(x, 60 + i * 200, CITY.floor - 300, 260, 0.35, c, 0.15); } },
};

// ───────────────────────── 3. UNTER DER BRÜCKE (Hauptset, Nacht) ─────────────────────────
export const BRIDGE = { hz: 1000, floor: 1500, barrel: [660, 1500], ceil: 380, pillarL: 130, pillarR: 960, seat: [440, 1500], seat2: [900, 1500], light: [690, 1300] };
export const bridge = {
  back(x, { t = 0 } = {}) {
    sky(x, { stops: [[0, '#0A0E22'], [0.7, '#1C2448'], [1, '#3A3A60']], y0: -260, y1: BRIDGE.hz });
    stars(x, { n: 50, seed: 8, t, hz: BRIDGE.hz - 200 });
    // Fluss mit Lichtern der Stadt am anderen Ufer
    for (let i = -1; i < 12; i++) { const bx = i * 120, bh = 120 + h01(i, 5) * 160; x.fillStyle = '#1A1E38'; x.fillRect(bx, BRIDGE.hz - bh, 100, bh + 20); for (let k = 0; k < 4; k++) if (h01(i * 5 + k, 2) > 0.45) { x.fillStyle = '#FFD58A'; x.fillRect(bx + 12 + k * 22, BRIDGE.hz - bh + 20 + h01(i * 7 + k, 4) * (bh - 44), 12, 16); } }
    const g = x.createLinearGradient(0, BRIDGE.hz, 0, H); g.addColorStop(0, '#26305A'); g.addColorStop(1, '#0E1228'); x.fillStyle = g; x.fillRect(-M, BRIDGE.hz, W + 2 * M, H - BRIDGE.hz);
    for (let i = 0; i < 26; i++) { const ly = BRIDGE.hz + 20 + i * 18, lx = 80 + h01(i, 6) * 900, ln = 40 + h01(i, 7) * 140; line(x, [[lx, ly], [lx + ln, ly]], 3, 'rgba(255,213,138,0.22)'); }
    return BRIDGE;
  },
  /** Mittelebene: Brückenpfeiler und die Unterseite der Brücke (Betonbalken) */
  mid(x, { t = 0 } = {}) {
    // Unterseite
    blob(x, [(g) => { g.beginPath(); g.rect(-M, -200, W + 2 * M, BRIDGE.ceil + 200); }], '#4A4E66', '#343850', { line: 0 });
    for (let i = -1; i < 7; i++) line(x, [[i * 220 + 40, -200], [i * 220 + 40, BRIDGE.ceil]], 26, '#3A3E56');
    for (let i = -1; i < 9; i++) { x.fillStyle = '#232634'; x.fillRect(i * 150 - 20, BRIDGE.ceil - 60, 40, 80); }
    line(x, [[-M, BRIDGE.ceil], [W + M, BRIDGE.ceil]], 8, '#12141C');
    // Pfeiler
    for (const px of [BRIDGE.pillarL, BRIDGE.pillarR]) {
      blob(x, [(g) => { g.beginPath(); g.moveTo(px - 110, BRIDGE.ceil); g.lineTo(px + 110, BRIDGE.ceil); g.lineTo(px + 90, BRIDGE.floor + 30); g.lineTo(px - 90, BRIDGE.floor + 30); g.closePath(); }], '#5A5F78', '#3A3E54', { line: 5 });
      for (let k = 0; k < 7; k++) line(x, [[px - 80 + h01(k, px) * 160, BRIDGE.ceil + 40 + k * 130], [px - 60 + h01(k, px + 1) * 120, BRIDGE.ceil + 90 + k * 130]], 3, 'rgba(15,16,24,0.5)');
    }
    // Graffiti-Flecken (Farbe, keine Schrift)
    x.save(); x.globalAlpha = 0.5; line(x, [[BRIDGE.pillarL - 60, 900], [BRIDGE.pillarL + 40, 860], [BRIDGE.pillarL + 10, 960]], 18, '#C8483A'); line(x, [[BRIDGE.pillarR - 50, 760], [BRIDGE.pillarR + 30, 800]], 14, '#3FB0C8'); x.restore();
    return BRIDGE;
  },
  ground(x, { t = 0 } = {}) {
    ground(x, { hz: BRIDGE.floor - 20, far: '#3A3C48', near: '#1A1C26', y1: 3200 });
    // Pfütze mit Feuerschein
    x.save(); x.globalAlpha = 0.55; x.fillStyle = '#FF9A3A'; x.beginPath(); x.ellipse(BRIDGE.barrel[0], BRIDGE.floor + 120, 190, 26, 0, 0, TAU); x.fill(); x.restore();
    return BRIDGE;
  },
  rain(x, { t = 0, a = 0.25 } = {}) { rain(x, { t, n: 120, a, angle: 0.12, len: 38 }); },
  glows(x, { t = 0, k = 1 } = {}) { const f = 0.85 + 0.15 * Math.sin(t * 13); glow(x, BRIDGE.barrel[0], BRIDGE.floor - 220, 720, 0.45 * k * f, '255,150,60', 0.15); glow(x, BRIDGE.barrel[0], BRIDGE.ceil + 40, 900, 0.3 * k * f, '255,170,90', 0.1); glow(x, 540, BRIDGE.hz, 700, 0.12, '120,140,255', 0.2); },
};

// ───────────────────────── 4. BRÜCKE VON OBEN GESEHEN (von unten nach oben) ─────────────────────────
export const DECK = { edge: 1180, rail: 1100, car: [760, 1180], brandt: [330, 1180], light: [760, 1100] };
export const deck = {
  back(x, { t = 0 } = {}) {
    sky(x, { stops: [[0, '#1A2250'], [0.55, '#3E3A7A'], [1, '#C2788A']], y0: -260, y1: 1180 });
    stars(x, { n: 40, seed: 4, t, hz: 600 });
    return DECK;
  },
  /** Fahrbahnrand von unten: Betonkante, Geländer als Silhouette */
  mid(x, { t = 0 } = {}) {
    blob(x, [(g) => { g.beginPath(); g.rect(-M, DECK.edge, W + 2 * M, 1400); }], '#4A4E66', '#2E3248', { line: 6 });
    for (let i = -1; i < 8; i++) line(x, [[i * 170, DECK.edge + 40], [i * 150 - 80, 1960]], 5, 'rgba(20,22,34,0.5)');
    line(x, [[-M, DECK.edge + 30], [W + M, DECK.edge + 30]], 10, '#14161E');
    for (let i = -1; i < 12; i++) tube(x, [[i * 110, DECK.edge], [i * 110, DECK.rail - 40]], 12, '#1A1C26', { line: 3 });
    tube(x, [[-M, DECK.rail - 40], [W + M, DECK.rail - 40]], 14, '#1A1C26', { line: 3 });
    return DECK;
  },
  glows(x, { t = 0 } = {}) { glow(x, 540, 1000, 900, 0.3, '255,170,140', 0.2); },
};
export { rain, fog, rgba, lerp, ell, circ, poly, line, blob, shadeOf };
