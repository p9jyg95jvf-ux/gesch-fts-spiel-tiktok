// Arc Lab character system: a CUSTOM RIG, built from the shared rig helpers only (rig.mjs). Copy this pattern when a
// series needs a character that is neither a chibi human nor a four-legged creature: a robot, a bird, a ghost, a car
// with a face. The recipe:
//   1. projector(X, Y, s, turn) turns character-space points (lx, ly down, lz forward) into screen points + depth;
//   2. build the body from spheres (circles), capsules and tubes in character space;
//   3. put face features on a head sphere by longitude/latitude (HP below), so they slide and foreshorten with `turn`;
//   4. draw groups back to front with painter() (sorted by depth), each group as ONE blob() (ink underlay + cel shade);
//   5. return the points shots need (head, face, top, box) and accept x = null (points only).
//
// EXAMPLE: "Lumo", a little lamp-headed robot on two wheels. Pose: { x, y, s, turn, t, expr, lamp 0..1, look, tilt, roll }
import { TAU, clamp, lerp, mixHex } from '../lib.mjs';
import { projector, blob, tube, line, curve, ell, circ, shadeOf, litOff, painter } from './rig.mjs';

export const LUMO = { body: '#5C7FA8', trim: '#E8C04A', glass: '#CFE6F2', eyes: '#1A2230', wheel: '#2A2E38' };

export function drawBot(x, M = LUMO, P = {}) {
  const s = P.s ?? 1, X = P.x ?? 540, Y = P.y ?? 1500, t = P.t ?? 0, turn = P.turn ?? 0;
  const pr = projector(X, Y, s, turn), LW = clamp(4.4 * s, 1.2, 7), off = litOff(s, P.light, 4.2);
  const roll = (P.roll ?? 0) * Math.sin(t * 6), bob = 2 * Math.sin(t * 3.1);
  const body = pr(0, -70 + bob, 0), head = pr(0, -150 + bob, 4), R = 46, aH = turn * Math.PI / 2 + (P.headTurn ?? 0) * Math.PI / 2;
  const HP = (phi, lam, rr = 1) => { const q = phi + aH; return [head[0] + R * s * rr * Math.sin(q) * Math.cos(lam), head[1] + R * s * rr * Math.sin(lam), Math.cos(q) * Math.cos(lam)]; };
  const res = { head: [head[0], head[1], R * s], face: HP(0, 0.1).slice(0, 2), top: [head[0], head[1] - R * s * 1.8], box: [X - 70 * s, head[1] - R * s * 1.8, X + 70 * s, Y] };
  if (!x) return res;
  const items = [];
  for (const sg of [-1, 1]) {                                          // wheels at the sides (depth sorted)
    const w = pr(sg * 34, -16, 0);
    items.push({ d: w[2], draw: () => blob(x, [(g) => ell(g, w[0], w[1], 18 * s * (0.35 + 0.65 * Math.abs(pr.sn)) + 6 * s, 18 * s)], M.wheel, shadeOf(M.wheel), { line: LW, off }) });
  }
  items.push({ d: 0, draw: () => {                                      // body: a rounded barrel + a trim band
    blob(x, [(g) => { g.beginPath(); g.roundRect(body[0] - 40 * s, body[1] - 52 * s, 80 * s, 104 * s, 30 * s); }], M.body, shadeOf(M.body), { line: LW, off });
    const fz = pr.c; if (fz > 0.1) { const c = pr(0, -78 + bob, 30); circ(x, c[0], c[1], 9 * s); x.fillStyle = M.trim; x.fill(); }
    tube(x, [[body[0] - 38 * s, body[1] + 20 * s], [body[0] + 38 * s, body[1] + 20 * s]], 8 * s, M.trim, { line: 0 });
  } });
  items.push({ d: 50, draw: () => {                                     // head: a glass dome with a lamp inside, then the face
    x.save(); x.translate(head[0], head[1]); x.rotate((P.tilt ?? 0) + roll * 0.05); x.translate(-head[0], -head[1]);
    const lamp = clamp(P.lamp ?? 0.6);
    blob(x, [(g) => circ(g, head[0], head[1], R * s)], mixHex(M.glass, '#FFF2C0', lamp * 0.6), shadeOf(M.glass, 0.25), { line: LW, off });
    circ(x, head[0] - R * s * 0.35, head[1] - R * s * 0.4, R * s * 0.18); x.fillStyle = 'rgba(255,255,255,0.7)'; x.fill();
    const look = P.look || [0, 0];
    for (const sg of [-1, 1]) {
      const e = HP(sg * 0.42, 0.1); if (e[2] < 0.1) continue;
      const happy = P.expr === 'happy';
      if (happy) curve(x, [e[0] - 7 * s, e[1] + 3 * s], [e[0], e[1] - 8 * s], [e[0] + 7 * s, e[1] + 3 * s], LW);
      else { ell(x, e[0] + look[0] * 4 * s, e[1] + look[1] * 3 * s, 6 * s * Math.max(0.3, e[2]), 9 * s); x.fillStyle = M.eyes; x.fill(); }
    }
    const a = pr(0, -150 - R + bob, 0);                                 // antenna with a bulb
    line(x, [[a[0], a[1] + 4 * s], [a[0] + 6 * s, a[1] - 26 * s]], LW * 0.8, '#2A2E38');
    blob(x, [(g) => circ(g, a[0] + 6 * s, a[1] - 30 * s, 7 * s)], M.trim, shadeOf(M.trim), { line: LW * 0.8 });
    x.restore();
  } });
  painter(items);
  return res;
}
