// {{SERIES}}: THE PROPS KIT. Contract: kit/KIT_API.md (write the contract FIRST, then stubs, then the real drawing).
// House style: ink outline + two-tone cel shade (blob/tube from the engine), flat colours, light from the upper left.
// Every function is (x, o) -> points: a pure function of its inputs (x may be null: then only return the points).
// No brands, no logos, no real products, no text except handwriting / signs that belong in the world.
import { TAU, clamp, lerp, mixHex, blob, tube, line, curve, ell, circ, poly, shadeOf, glow } from '../engine.mjs';

const LWs = (s) => clamp(4.2 * s, 1.2, 6.5);

/** EXAMPLE: a wooden crate. (cx, cy) = the bottom centre; s = scale (1 = 160 px wide). Returns { top, box }. */
export function drawCrate(x, { cx = 540, cy = 1500, s = 1, col = '#B07A44', open = 0 } = {}) {
  const w = 160 * s, h = 120 * s, pts = { top: [cx, cy - h], box: [cx - w / 2, cy - h, w, h] };
  if (!x) return pts;
  const LW = LWs(s);
  blob(x, [(g) => { g.beginPath(); g.rect(cx - w / 2, cy - h, w, h); }], col, shadeOf(col, 0.3), { line: LW });
  for (const k of [0.33, 0.66]) line(x, [[cx - w / 2, cy - h * k], [cx + w / 2, cy - h * k]], LW * 0.6, shadeOf(col, 0.5));
  line(x, [[cx - w / 2, cy - h], [cx + w / 2, cy]], LW * 0.7, shadeOf(col, 0.45));
  if (open > 0) blob(x, [(g) => poly(g, [[cx - w / 2, cy - h], [cx + w / 2, cy - h], [cx + w / 2 - 20 * s, cy - h - 60 * s * open], [cx - w / 2 - 20 * s, cy - h - 60 * s * open]])], mixHex(col, '#FFFFFF', 0.1), shadeOf(col, 0.3), { line: LW });
  return pts;
}
/** EXAMPLE light prop: a lamp's glow for an { blend: 'add' } layer */
export function lampGlow(x, { cx = 540, cy = 900, k = 1 } = {}) { glow(x, cx, cy, 220, 0.7 * k, '255,210,140', 0.2); }
export { TAU, lerp, curve, ell, circ, tube };
