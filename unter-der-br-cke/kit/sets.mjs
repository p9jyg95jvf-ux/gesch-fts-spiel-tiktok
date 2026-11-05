// Unter der Brücke: THE SETS. Each set is split by depth (back / mid / near ...) so shots put the parts on separate look-engine
// layers (parallax, haze, depth of field). Frame coordinates 1080 x 1920; draw a little past the edges (camera moves).
// Every set exports its anchor points (horizon, floor line, where the door is ...) so shots stay consistent.
import { W, H, TAU, lerp, h01, rgba, mixHex, sky, stars, moon, sea, ground, hills, fog, rain, blob, tube, line, ell, circ, poly, shadeOf } from '../engine.mjs';

// EXAMPLE: a hilltop at dusk (sky, stars, hills, grass, a fence). Replace with your series' places.
export const HILL = { hz: 1050, ground: 1420, moon: [780, 420] };
export const hill = {
  back(x, { t = 0 } = {}) {
    sky(x, { stops: [[0, '#1A2250'], [0.6, '#5A4A80'], [1, '#E89A7A']], y0: -260, y1: HILL.hz });
    stars(x, { n: 80, seed: 3, t, hz: HILL.hz - 300 });
    moon(x, { cx: HILL.moon[0], cy: HILL.moon[1], r: 54 });
    hills(x, { layers: [[HILL.hz - 40, 90, '#4A3E6A'], [HILL.hz + 20, 60, '#3A3258']] });
    return HILL;
  },
  ground(x, { t = 0 } = {}) {
    ground(x, { hz: HILL.ground - 120, far: '#5A6A4A', near: '#2E3A28' });
    for (let i = 0; i < 9; i++) tube(x, [[-100 + i * 160, HILL.ground - 10], [-100 + i * 160, HILL.ground - 130]], 16, '#7A5A3A', { line: 4 });
    tube(x, [[-200, HILL.ground - 110], [1300, HILL.ground - 110]], 14, '#7A5A3A', { line: 4 });
    return HILL;
  },
  /** near-layer grass blades that sway (give this layer a short shutter, 45-90) */
  near(x, { t = 0 } = {}) {
    for (let i = 0; i < 60; i++) {
      const bx = -150 + h01(i, 4) * 1380, by = H + 40, len = 120 + 160 * h01(i, 5), sw = Math.sin(t * 1.6 + i) * 18;
      x.beginPath(); x.moveTo(bx - 10, by); x.quadraticCurveTo(bx + sw * 0.5, by - len * 0.6, bx + sw, by - len); x.quadraticCurveTo(bx + sw * 0.5 + 6, by - len * 0.6, bx + 10, by); x.closePath();
      x.fillStyle = mixHex('#24301E', '#3E5230', h01(i, 6)); x.fill();
    }
  },
};
export { sea, fog, rain, rgba, lerp, ell, circ, poly, line, blob, shadeOf };
