// Arc Lab character system: the parametric CREATURE COMPANION (an original template: a chibi four-legged animal).
// Dogs, cats, foxes, rabbits, bears, invented creatures: one rig, different parameters. Its face, ears and tail are the
// story's "emotional camera": viewers read what it feels from them in every shot.
//
//   import { makeCritter, drawCritter } from '<engine>/chars/critter.mjs';
//   const PIP = makeCritter({ ears: { type: 'floppy' }, tail: { type: 'thin' }, col: { base: '#B86B3C' }, marks: { mask: 'left' } });
//   const pts = drawCritter(x, PIP, { x: 540, y: 1500, s: 1.5, turn: 0.8, pose: 'trot', phase: t * 2.2, expr: 'alert', t });
//
// POSE fields (all optional):
//   x, y        ground point under the body (frame px)          s       scale (1 = about 190 px tall standing)
//   turn        0 facing the camera, +1 profile facing screen-right, -1 facing left, +-2 from behind (continuous)
//   headTurn    extra yaw for the head (look at the camera while walking sideways: turn 1, headTurn -0.6)
//   nod         head pitch (+ down, - up)   tilt  head roll (radians; a curious tilt is about 0.25)
//   pose        'stand' | 'walk' | 'trot' | 'run' | 'sit' | 'lie' | 'jump' | 'sniff' | 'beg'
//   phase       gait cycles (walk ~ t*1.8, trot ~ t*2.6, run ~ t*3.2)       jump  0..1 height of a jump
//   expr        'neutral' | 'happy' | 'alert' | 'curious' | 'worried' | 'scared' | 'sad' | 'determined' | 'angry'
//               | 'sniffing' | 'sleepy' | 'asleep' | 'guilty' | 'proud'
//   earPerk     -1 flat back .. 0 relaxed .. 1 perked (number, or [left, right]); default from the expression
//   wag         tail wag amount 0..1 (wagHz speed, default 3.2)   tongue 0..1   talk 0..1 (mouth open: barks, panting)
//   blink 0..1, look [-1..1, -1..1], bob px, sq (squash/stretch, 1 = none), light [lx, ly]
// RETURNS { head: [x, y, r], face: [x, y], nose: [x, y], mouth: [x, y], tail: [x, y], paws: [[x, y] x4],
//           top: [x, y], box } in frame px.
import { TAU, clamp, lerp, mixHex } from '../lib.mjs';
import { projector, lw, blob, tube, line, curve, ell, circ, poly, nrm, pitch, shadeOf, litOff, painter, footPath, INK } from './rig.mjs';

export const CRITTER = {
  name: 'Buddy',
  body: { len: 46, r: 40 },                          // half distance chest-hip, chest radius
  head: { r: 54, snout: 0.6, snoutW: 0.55, eyeSize: 1 },
  ears: { type: 'floppy', size: 1, fold: 0 },        // floppy | pointy | round | long | none; fold: 0..1 tips folded
  tail: { type: 'bushy', size: 1 },                  // bushy | thin | curl | stub | plume | none; up: carriage (-0.5 low .. 0.62 default)
  legs: { len: 34, w: 19 },
  col: { base: '#C9824A', belly: '#F4E6D0', patch: '#6A4430', nose: '#2A1A16', eyes: '#1E1412', inner: '#E8A3A0', socks: '#F4E6D0', tongue: '#E8707A' },
  marks: { mask: null, chest: true, socks: false, muzzle: true, tailTip: false, saddle: false },   // mask: 'left' | 'right' | 'both'; saddle: a dark back
  fur: 'smooth',                                      // smooth | scruffy
  collar: null,                                       // { col, tag } or { col, style: 'bandana' }
  brows: true, whiskers: false,
};
const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? { ...a[k], ...v } : v; return o; };
export function makeCritter(spec = {}) { return merge(CRITTER, spec); }

export const CEXPR = {
  neutral:    { eye: 'open', lid: 0, brow: [0, 0], mouth: 'closed', ears: 0 },
  happy:      { eye: 'happy', lid: 0, brow: [0.25, 0.1], mouth: 'pant', ears: 0.25, tongue: 1, wag: 1 },
  proud:      { eye: 'happy', lid: 0, brow: [0.15, -0.2], mouth: 'smile', ears: 0.6, wag: 0.5 },
  alert:      { eye: 'open', lid: 0, brow: [0.45, 0.05], mouth: 'closed', ears: 1 },
  curious:    { eye: 'open', lid: 0, brow: [0.45, -0.25], mouth: 'closed', ears: 0.7 },
  worried:    { eye: 'open', lid: 0, brow: [0.25, 0.85], mouth: 'closed', ears: -0.45 },
  scared:     { eye: 'wide', lid: 0, brow: [0.55, 0.95], mouth: 'open', ears: -1 },
  sad:        { eye: 'open', lid: 0.38, brow: [0.05, 0.85], mouth: 'closed', ears: -0.85 },
  guilty:     { eye: 'open', lid: 0.3, brow: [0.25, 0.95], mouth: 'closed', ears: -0.75, look: [0, 0.6] },
  determined: { eye: 'open', lid: 0.2, brow: [-0.1, -0.75], mouth: 'closed', ears: 0.75 },
  angry:      { eye: 'open', lid: 0.3, brow: [-0.2, -1], mouth: 'snarl', ears: -0.35 },
  sniffing:   { eye: 'open', lid: 0.5, brow: [0.1, 0.1], mouth: 'closed', ears: 0.3 },
  sleepy:     { eye: 'open', lid: 0.65, brow: [-0.05, 0.2], mouth: 'closed', ears: -0.3 },
  asleep:     { eye: 'closed', lid: 1, brow: [-0.05, 0.1], mouth: 'closed', ears: -0.35 },
};

const vis = (f) => clamp((f - 0.06) / 0.22);

export function drawCritter(x, M, P = {}) {
  const s = P.s ?? 1, X = P.x ?? 540, Y = P.y ?? 1500, t = P.t ?? 0, turn = P.turn ?? 0;
  const pose = P.pose || 'stand', ph = P.phase ?? 0, cyc = TAU * ph;
  const ex = CEXPR[P.expr] || CEXPR.neutral;
  const pr = projector(X, Y, s, turn);
  const LW = clamp(4.4 * s, 1.2, 7), off = litOff(s, P.light, 4.2), sq = P.sq ?? 1;
  const base = M.col.base, baseSh = shadeOf(base, 0.3), R = M.head.r, rc = M.body.r, rh = rc * 0.9, BL = M.body.len, LL = M.legs.len;

  // ---- body placement (character space: ly down, lz forward)
  let chest = [0, -(LL + rc * 0.62), BL * 0.55], hip = [0, -(LL + rh * 0.58), -BL * 0.45], bodyPitch = 0, lift = P.bob ?? 0;
  if (pose === 'walk') lift += -2.5 * Math.cos(2 * cyc);
  if (pose === 'trot') lift += -4 * Math.abs(Math.cos(cyc));
  if (pose === 'run') { lift += -10 * Math.abs(Math.sin(cyc)); bodyPitch = 0.12 * Math.sin(cyc); const st = 1 + 0.12 * Math.sin(cyc + 0.6); chest[2] *= st; hip[2] *= st; }
  if (pose === 'jump') { const j = clamp(P.jump ?? 0.6); lift += -110 * j; bodyPitch = P.jumpPitch ?? 0.25 * (1 - 2 * j); }
  if (pose === 'sit' || pose === 'beg') { hip = [0, -rh * 0.98, -BL * 0.3]; chest = [0, -(rh * 0.98 + BL * 1.05), -BL * 0.05]; }
  if (pose === 'lie') { chest = [0, -rc * 0.86, BL * 0.5]; hip = [0, -rh * 0.84, -BL * 0.5]; }
  if (pose === 'sniff') bodyPitch = -0.12;
  const bob = (v) => [v[0], v[1] + lift, v[2]];
  const piv = [(chest[1] + hip[1]) / 2, (chest[2] + hip[2]) / 2];
  const B = (v) => bob(pitch(v, bodyPitch, piv[0], piv[1]));
  const C = B(chest), Hh = B(hip);
  // head (sits on top of the chest, a little forward)
  let headL = [0, C[1] - rc * 0.55 - R * 0.62 * sq, C[2] + rc * 0.32];
  let nod = (P.nod ?? 0) * 0.3;
  if (pose === 'sniff') { headL = [0, C[1] + rc * 0.1, C[2] + rc * 1.05]; nod += 0.32; }
  if (pose === 'lie') headL = [0, C[1] - rc * 0.35 - R * 0.55, C[2] + rc * 0.55];
  const hp = pr(...headL), hx = hp[0], hy = hp[1], rx = R * 1.04 * s, ry = R * s;
  const aH = (turn + (P.headTurn ?? 0)) * Math.PI / 2, tilt = P.tilt ?? 0;
  const HP = (phi, lam, rr = 1) => { const l = lam + nod * Math.cos(lam), q = phi + aH; return [hx + rx * rr * Math.sin(q) * Math.cos(l), hy + ry * rr * Math.sin(l), Math.cos(q) * Math.cos(l)]; };

  // ---- legs: [side, end ('f'|'b')] -> top, knee, paw
  const legs = [];
  const gait = { walk: [0, 0.5, 0.25, 0.75], trot: [0, 0.5, 0.5, 0], run: [0, 0.08, 0.5, 0.58] }[pose];
  [[1, 'f'], [-1, 'f'], [1, 'b'], [-1, 'b']].forEach(([sg, e], i) => {
    const anc = e === 'f' ? C : Hh, r0 = e === 'f' ? rc : rh, lx = sg * r0 * 0.5;
    const top = [lx, anc[1] + r0 * 0.3, anc[2] + (e === 'f' ? r0 * 0.05 : -r0 * 0.05)];
    let paw = [lx * 1.05, 0 + Math.min(0, lift * 0.0), anc[2] + (e === 'f' ? r0 * 0.12 : -r0 * 0.02)];
    let knee = null, haunch = false;
    if (gait) {
      const amp = pose === 'run' ? 34 : pose === 'trot' ? 20 : 15, hgt = pose === 'run' ? 26 : 12, q = cyc + TAU * gait[i];
      paw = [lx * 1.05, -Math.max(0, Math.cos(q)) * hgt, paw[2] + amp * Math.sin(q)];
      if (pose === 'run') paw[1] += lift * 0.35;
    }
    if (pose === 'jump') { const j = clamp(P.jump ?? 0.6); paw = [lx * 1.05, top[1] + LL * (0.9 - 0.3 * j), top[2] + (e === 'f' ? 18 : -22)]; }
    if ((pose === 'sit' || pose === 'beg') && e === 'b') { haunch = true; paw = [lx * 1.25, 0, anc[2] + rh * 0.95]; }
    if (pose === 'sit' && e === 'f') paw = [lx * 0.95, 0, anc[2] + rc * 0.42];
    if (pose === 'beg' && e === 'f') { knee = [lx * 0.9, anc[1] - rc * 0.05, anc[2] + rc * 0.75]; paw = [lx * 0.7, anc[1] - rc * 0.45, anc[2] + rc * 0.9]; }
    if (pose === 'lie') { if (e === 'f') paw = [lx * 1.05, -6, anc[2] + rc * 1.25]; else { haunch = true; paw = [lx * 1.3, -4, anc[2] + rh * 0.55]; } }
    legs.push({ sg, e, top, knee, paw, haunch, r0 });
  });

  // ---- tail
  const tb = [0, Hh[1] - rh * 0.3, Hh[2] - rh * 0.88];
  const wagAmt = P.wag ?? ex.wag ?? 0.15, wHz = P.wagHz ?? 3.2, w = wagAmt * 0.6 * Math.sin(TAU * wHz * t);
  const tUp = pose === 'sit' || pose === 'lie' ? -0.15 : ex.ears < -0.5 ? -0.45 : (M.tail.up ?? 0.62);  // scared / sad: tail low; tail.up sets the carriage
  const tdir = nrm([Math.sin(w) * 0.85, -tUp, -Math.cos(w) * 0.85]);
  const T0 = pr(...tb), Tl = (M.tail.size ?? 1) * R * 0.95;
  const T1 = pr(tb[0] + tdir[0] * Tl / s * s, tb[1] + tdir[1] * Tl, tb[2] + tdir[2] * Tl);

  // ---- result points
  const nose = HP(0, 0.3, 1 + 0.55 * M.head.snout + 0.18), mouth = HP(0, 0.52, 1 + 0.4 * M.head.snout);
  const paws = legs.map((l) => { const p = pr(...l.paw); return [p[0], p[1]]; });
  const res = { head: [hx, hy, R * s], face: HP(0, 0.1).slice(0, 2), nose: nose.slice(0, 2), mouth: mouth.slice(0, 2), tail: [T1[0], T1[1]], paws,
    top: [hx, hy - ry * 1.35], box: [Math.min(hx - rx * 1.5, ...paws.map((p) => p[0] - 20 * s)), hy - ry * 1.6, Math.max(hx + rx * 1.5, ...paws.map((p) => p[0] + 20 * s)), Y + 4] };
  if (!x) return res;

  const items = [];
  const scruffy = M.fur === 'scruffy';
  // body group
  const cP = pr(...C), hP = pr(...Hh);
  const neckL = [0, C[1] - rc * 0.75, C[2] + rc * 0.22], nP = pr(...neckL);
  items.push({ d: 0, draw: () => {
    const parts = [...capsuleOf(cP, rc * s, hP, rh * s), (g) => circ(g, nP[0], nP[1], rc * 0.62 * s)];
    if (scruffy && Math.abs(pr.sn) < 0.75) parts.push((g) => tuftsPath(g, [cP[0] + (pr(0, 0, 1)[0] - X) * rc * 0.7, cP[1] + rc * 0.62 * s], rc * 0.3 * s, 3, Math.PI / 2));
    blob(x, parts, base, baseSh, { line: LW, off });
    // chest bib (clipped to the body)
    if (M.marks.chest) {
      const bib = pr(C[0], C[1] + rc * 0.25, C[2] + rc * 0.62);
      x.save(); clipParts(x, parts);
      const k = clamp((bib[2] / (rc * s) + 0.3) / 0.6);
      if (k > 0) { x.globalAlpha *= k; ell(x, bib[0], bib[1], rc * 0.62 * s, rc * 0.72 * s); x.fillStyle = M.col.belly; x.fill(); }
      x.restore();
    }
    if (M.marks.saddle) {                                                // a dark saddle over the back (shepherd dogs)
      x.save(); clipParts(x, parts);
      const ac = Math.abs(pr.c), back = pr.c < -0.3, mx = (cP[0] + hP[0]) / 2, my = (cP[1] + hP[1]) / 2 - rc * (back ? 0.75 : 0.55 + 0.5 * ac) * s, ang = Math.atan2(hP[1] - cP[1], hP[0] - cP[0]) * (1 - ac);
      ell(x, mx, my, Math.hypot(hP[0] - cP[0], hP[1] - cP[1]) / 2 + rc * (0.75 + 0.2 * ac) * s, rc * (back ? 1.0 : 0.62 + 0.1 * ac) * s, ang); x.fillStyle = M.col.patch; x.fill();
      x.restore();
    }
    if (M.collar && M.collar.style === 'bandana') {
      // a neckerchief: tied under the chin, its triangle hanging down the front of the chest. It sits LOW enough to show
      // below the head from the front and from three-quarter views (the head covers the neck itself)
      const top = pr(0, C[1] - rc * 0.32, C[2] + rc * 0.62), tip = pr(0, C[1] + rc * 0.78, C[2] + rc * 0.92);
      const facing = (pr(0, C[1], C[2] + rc)[2] - pr(0, C[1], C[2])[2]) / (rc * s);          // 1 front .. 0 profile .. -1 back
      if (facing > -0.35) {
        const ac = Math.abs(pr.c), w = rc * s * (0.36 + 0.5 * Math.max(0, ac)), col = M.collar.col, sh = shadeOf(col, 0.3);
        const lean = (tip[0] - top[0]) * 0.35, L0 = [top[0] - w, top[1]], R0 = [top[0] + w, top[1] - rc * 0.04 * s], T = [tip[0] + lean, tip[1]];
        const tri = (g) => { g.beginPath(); g.moveTo(L0[0], L0[1]); g.quadraticCurveTo(top[0], top[1] + rc * 0.12 * s, R0[0], R0[1]); g.quadraticCurveTo(R0[0] - w * 0.15, (R0[1] + T[1]) / 2, T[0], T[1]); g.quadraticCurveTo(L0[0] + w * 0.25, (L0[1] + T[1]) / 2, L0[0], L0[1]); g.closePath(); };
        blob(x, [tri], col, sh, { line: LW, off });
        x.save(); tri(x); x.clip();                                     // a fold and a little printed pattern
        line(x, [[lerp(L0[0], R0[0], 0.3), top[1] + rc * 0.08 * s], [T[0], T[1] - rc * 0.05 * s]], LW * 0.4, shadeOf(col, 0.45));
        x.fillStyle = 'rgba(255,236,220,0.55)';
        for (let i = 0; i < 6; i++) { const u = (i % 3 + 0.5) / 3, v = 0.25 + 0.3 * Math.floor(i / 3); circ(x, lerp(lerp(L0[0], R0[0], u), T[0], v), lerp(top[1], T[1], v) + 2 * s, rc * 0.045 * s); x.fill(); }
        x.restore();
        // the knot's two short ends at the side of the neck (three-quarter and profile views)
        if (ac < 0.9) { const kx = top[0] - Math.sign(pr.sn || 1) * w * 0.95, ky = top[1] - rc * 0.02 * s;
          blob(x, [(g) => poly(g, [[kx, ky], [kx - Math.sign(pr.sn || 1) * rc * 0.22 * s, ky + rc * 0.28 * s], [kx + Math.sign(pr.sn || 1) * rc * 0.05 * s, ky + rc * 0.3 * s]])], col, sh, { line: LW * 0.8, off }); }
      }
    } else if (M.collar && pr(...neckL)[2] > -rc * 0.2 * s) {
      const cp = pr(neckL[0], neckL[1] - rc * 0.08, neckL[2]);
      x.save(); ell(x, cp[0], cp[1], rc * 0.66 * s, rc * 0.2 * s); x.lineWidth = rc * 0.16 * s; x.strokeStyle = INK; x.stroke(); x.lineWidth = rc * 0.1 * s; x.strokeStyle = M.collar.col; x.stroke(); x.restore();
      const tg = pr(neckL[0], neckL[1] + rc * 0.1, neckL[2] + rc * 0.62);
      if (tg[2] > -rc * 0.2 * s) blob(x, [(g) => circ(g, tg[0], tg[1] + 6 * s, 7.5 * s)], M.collar.tag || '#E8C04A', shadeOf(M.collar.tag || '#E8C04A'), { line: LW * 0.8, off });
    }
  } });

  // legs. Each leg is ONE smooth tapered shape (no joint circles) ending inside its paw. From any angle the two legs
  // nearest the camera are the "near pair" (full colour); the other two are the "far pair": clearly darker, a little
  // thinner and shorter-looking, so four legs always read as four (never a row of five or six).
  const legZ = legs.map((L) => pr(...L.top)[2]);                          // shoulders/hips only: stable while the paws swing
  const order = legZ.map((z, i) => [z, i]).sort((p, q) => p[0] - q[0]), farSet = new Set([order[0][1], order[1][1]]);
  const turned = Math.abs(pr.sn) > 0.12 || pr.c < 0;                   // straight-on from the front: far legs are hidden anyway
  legs.forEach((L, li) => {
    const tp = pr(...L.top), pp = pr(...L.paw), kp = L.knee ? pr(...L.knee) : null;
    const d = tp[2] + (L.e === 'f' ? 0.01 : 0);
    const far = turned && farSet.has(li), lc = far ? mixHex(shadeOf(base, 0.5), M.col.patch, 0.18) : base, lcSh = shadeOf(lc, 0.3);
    // every leg goes in BEHIND the body (it comes out from under the belly; no leg top shows on the body)
    items.push({ d: L.haunch && !far && d > -1 ? d + 100 : -300 + d * 0.5 + (far ? -50 : 0), draw: () => {   // a sitting near thigh sits beside the body
      const wd = M.legs.w * s * (far ? 0.88 : 1), pc = [pp[0] + pr.sn * M.legs.w * 0.2 * s, pp[1] - M.legs.w * 0.3 * s];
      if (L.haunch) {                                                 // a sitting back leg: a round thigh + a paw in front
        const th = pr(L.top[0] * 1.15, L.top[1] - rh * 0.15, L.top[2] + rh * 0.15);
        blob(x, [(g) => ell(g, th[0], th[1], rh * 0.62 * s * (0.55 + 0.45 * Math.abs(pr.sn)) + rh * 0.12 * s, rh * 0.6 * s)], lc, lcSh, { line: LW, off });
        pawOval(x, M, pp, L, pr, s, LW, off, lc, far);
        return;
      }
      const top = [tp[0], tp[1] - wd * 0.6];                          // start inside the body
      const pts = kp ? [top, kp, pc] : [top, [lerp(top[0], pc[0], 0.5), lerp(top[1], pc[1], 0.5)], pc];
      blob(x, [(g) => legPath(g, pts, [wd * 1.05, wd * 0.9, wd * 0.74])], lc, lcSh, { line: LW, off: [off[0] * 0.6, off[1] * 0.6] });
      if (M.marks.socks) { x.save(); legPath(x, pts, [wd * 1.05, wd * 0.9, wd * 0.74]); x.clip(); x.fillStyle = M.col.socks; x.fillRect(pc[0] - wd * 2, lerp(pts[1][1], pc[1], 0.35), wd * 4, wd * 4); x.restore(); }
      pawOval(x, M, pp, L, pr, s, LW, off, lc, far);
    } });
  });

  // tail
  items.push({ d: T0[2] < 0 ? -1e4 + T0[2] : 1e4, draw: () => drawTail(x, M, T0, T1, tdir, Tl, s, LW, off, t, w) });

  // head group
  const hd = pr(...headL)[2];
  items.push({ d: hd < -R * 0.15 * s ? hd * 10 : 5e4, draw: () => {
    x.save(); x.translate(hx, hy); x.rotate(tilt); x.translate(-hx, -hy);
    const perk = P.earPerk ?? ex.ears ?? 0, perks = Array.isArray(perk) ? perk : [perk, perk];
    const fl = M.ears.type === 'floppy', ears = [-1, 1].map((sg, i) => ({ sg, b: HP(sg * (fl ? 1.3 : 1.05), fl ? -0.62 : -0.74, 0.97), perk: perks[i] }));
    // far ears behind the head
    for (const e of ears) if (e.b[2] < -0.15) drawEar(x, M, e, hx, hy, R * s, LW, off, t);
    // skull + snout + cheek tufts as one group
    const snR = R * (0.34 + 0.22 * M.head.snoutW) * s, snC = HP(0, 0.4, 0.58 + 0.42 * M.head.snout);
    const snX = snR * (1 + 0.45 * M.head.snout * Math.abs(Math.sin(aH))), snY = snR * 0.86;   // longer in profile
    const parts = [(g) => ell(g, hx, hy, rx, ry)];
    if (scruffy) for (const sg of [-1, 1]) { const c = HP(sg * 1.45, 0.42, 1.0); if (c[2] > -0.6) parts.push((g) => tuftsPath(g, c, R * 0.3 * s, 3, Math.atan2(c[1] - hy, c[0] - hx))); }
    if (scruffy) { const c = HP(0.1, -0.98, 0.96); parts.push((g) => tuftsPath(g, c, R * 0.28 * s, 3, -Math.PI / 2 + (c[0] - hx) / rx * 0.5)); }
    const snoutBehind = snC[2] < -0.05;
    const snPath = (g) => ell(g, snC[0], snC[1], snX, snY);
    if (!snoutBehind) parts.push(snPath);
    else blob(x, [snPath], base, baseSh, { line: LW, off });
    blob(x, parts, base, baseSh, { line: LW, off: [off[0] * 1.3, off[1] * 1.3] });
    // markings: mask patch(es) and the light muzzle (clipped to the head group)
    x.save(); clipParts(x, parts);
    const masks = M.marks.mask === 'both' ? [-1, 1] : M.marks.mask === 'left' ? [-1] : M.marks.mask === 'right' ? [1] : [];
    for (const sg of masks) { const e = HP(sg * 0.5, -0.02), k = vis(e[2] + 0.15); if (k > 0) { x.globalAlpha = k; ell(x, e[0] + sg * 4 * s, e[1] - 2 * s, R * 0.3 * s * Math.max(0.45, e[2]), R * 0.32 * s, sg * 0.3); x.fillStyle = M.col.patch; x.fill(); } }
    x.globalAlpha = 1;
    if (M.marks.muzzle && !snoutBehind) {                               // the muzzle colour fades in toward the nose
      const mc = M.col.muzzle || M.col.belly, fx = snC[0] + Math.sin(aH) * snX * 0.18;
      ell(x, fx, snC[1] + snY * 0.04, snX * 0.9, snY * 0.94); x.fillStyle = mc; x.fill();
      ell(x, fx - snX * 0.1, snC[1] - snY * 0.45, snX * 0.5, snY * 0.2); x.fillStyle = 'rgba(255,240,220,0.16)'; x.fill();
    }
    x.restore();
    critterFace(x, M, ex, P, HP, R * s, LW, t, snC, snR, snX);
    for (const e of ears) if (e.b[2] >= -0.15) drawEar(x, M, e, hx, hy, R * s, LW, off, t);
    x.restore();
  } });
  painter(items);
  return res;
}

function legPath(g, P, W) {
  const nrmAt = (i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const L = P.map((p, i) => { const n = nrmAt(i); return [p[0] + n[0] * W[i] / 2, p[1] + n[1] * W[i] / 2]; });
  const R = P.map((p, i) => { const n = nrmAt(i); return [p[0] - n[0] * W[i] / 2, p[1] - n[1] * W[i] / 2]; });
  g.beginPath(); g.moveTo(L[0][0], L[0][1]); g.quadraticCurveTo(L[1][0], L[1][1], L[2][0], L[2][1]);
  g.lineTo(R[2][0], R[2][1]); g.quadraticCurveTo(R[1][0], R[1][1], R[0][0], R[0][1]);
  const a0 = Math.atan2(R[0][1] - P[0][1], R[0][0] - P[0][0]); g.arc(P[0][0], P[0][1], W[0] / 2, a0, a0 + Math.PI); g.closePath();
}
function capsuleOf(c1, r1, c2, r2) {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy);
  const parts = [(x) => circ(x, c1[0], c1[1], r1), (x) => circ(x, c2[0], c2[1], r2)];
  if (d > 0.5) { const nx = -dy / d, ny = dx / d; const q = cw([[c1[0] + nx * r1, c1[1] + ny * r1], [c2[0] + nx * r2, c2[1] + ny * r2], [c2[0] - nx * r2, c2[1] - ny * r2], [c1[0] - nx * r1, c1[1] - ny * r1]]); parts.push((x) => poly(x, q)); }
  return parts;
}
function clipParts(x, parts) { x.beginPath(); for (const p of parts) { const g = { beginPath() {}, moveTo: (...a) => x.moveTo(...a), lineTo: (...a) => x.lineTo(...a), arc: (...a) => { x.moveTo(a[0] + a[2], a[1]); x.arc(...a); }, ellipse: (...a) => { x.moveTo(a[0] + a[2] * Math.cos(a[4]), a[1] + a[2] * Math.sin(a[4])); x.ellipse(...a); }, closePath: () => x.closePath(), quadraticCurveTo: (...a) => x.quadraticCurveTo(...a), bezierCurveTo: (...a) => x.bezierCurveTo(...a) }; p(g); } x.clip(); }
/** a little fan of fur tufts (3 points) as a closed path, centred at c, pointing along angle ang */
function tuftsPath(g, c, r, n, ang) {
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux, P = [[c[0] - vx * r * 0.9, c[1] - vy * r * 0.9]];
  for (let i = 0; i < n; i++) {
    const a = -0.9 + 1.8 * (i + 0.5) / n, nxt = -0.9 + 1.8 * (i + 1) / n;
    P.push([c[0] + vx * r * a * 0.9 + ux * r * (0.9 + 0.25 * (i % 2)), c[1] + vy * r * a * 0.9 + uy * r * (0.9 + 0.25 * (i % 2))]);
    P.push([c[0] + vx * r * nxt * 0.9 + ux * r * 0.25, c[1] + vy * r * nxt * 0.9 + uy * r * 0.25]);
  }
  P.push([c[0] - ux * r * 0.3, c[1] - uy * r * 0.3]);
  poly(g, cw(P));
}
/** points in clockwise screen order (so a union of parts clips with the nonzero rule) */
function cw(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a >= 0 ? P : P.slice().reverse(); }
function pawOval(x, M, pp, L, pr, s, LW, off, lc, far = false) {
  const k = far ? 0.9 : 1, fl = M.legs.w * 1.5 * k, fw = M.legs.w * 1.22 * k, fh = M.legs.w * 0.82 * k;
  const as = Math.abs(pr.sn), td = Math.sign(pr.sn) || 0, hw = Math.sqrt((fw / 2 * pr.c) ** 2 + (fl / 2 * pr.sn) ** 2) * s;
  const cx = pp[0] + pr.sn * fl * 0.22 * s, y0 = pp[1], col = M.marks.socks ? M.col.socks : (lc || M.col.base);
  const hT = fh * s * (1 - 0.35 * as), hH = fh * s, hR = td > 0 ? hT : hH, hL = td > 0 ? hH : hT;
  blob(x, [(g) => footPath(g, cx, y0, hw, hL, hR, fh * 0.4 * s)], col, shadeOf(col, 0.3), { line: LW, off });
  // toe creases at the front of the paw (three toes from the front, one crease side-on)
  const fz = Math.max(0, pr.c), cr = shadeOf(col, 0.5);
  if (fz > 0.35) for (const q of [-0.36, 0, 0.36]) line(x, [[cx + q * hw, y0 - fh * 0.08 * s], [cx + q * hw, y0 - fh * 0.42 * s]], LW * 0.4, cr);
  else if (as > 0.45) line(x, [[cx + td * hw * 0.5, y0 - fh * 0.06 * s], [cx + td * hw * 0.5, y0 - hT * 0.5]], LW * 0.4, cr);
}
function drawEar(x, M, e, hx, hy, Rs, LW, off, t) {
  const T = M.ears.type; if (T === 'none') return;
  const sz = M.ears.size ?? 1, base = M.col.base, sh = shadeOf(base, 0.3), inner = M.col.inner;
  const b = e.b, sg = Math.sign(b[0] - hx) || e.sg, perk = clamp(e.perk, -1, 1);
  const side = Math.sign(b[0] - hx + 1e-6);
  if (T === 'floppy') {
    // hangs from the base: angle from straight down, swung outward by perk (+) or back/flat (-)
    const ang = side * (0.35 + 0.75 * Math.max(0, perk) - 0.22 * Math.max(0, -perk)) + 0.06 * Math.sin(t * 2.1 + e.sg);
    const L = Rs * 0.9 * sz, Wd = Rs * 0.36 * sz;
    const dx = Math.sin(ang), dy = Math.cos(ang), tip = [b[0] + dx * L, b[1] + dy * L - (perk > 0.5 ? L * 0.25 * (perk - 0.5) : 0)];
    const nx = -dy, ny = dx;
    const path = (g) => { g.beginPath(); g.moveTo(b[0] - nx * Wd * 0.45, b[1] - ny * Wd * 0.45); g.bezierCurveTo(b[0] - nx * Wd * 1.1 + dx * L * 0.45, b[1] - ny * Wd * 1.1 + dy * L * 0.45, tip[0] - nx * Wd * 0.8, tip[1] - ny * Wd * 0.8, tip[0], tip[1]); g.bezierCurveTo(tip[0] + nx * Wd * 0.8, tip[1] + ny * Wd * 0.8, b[0] + nx * Wd * 0.9 + dx * L * 0.45, b[1] + ny * Wd * 0.9 + dy * L * 0.45, b[0] + nx * Wd * 0.45, b[1] + ny * Wd * 0.45); g.closePath(); };
    const col = M.marks.mask === 'both' || (M.marks.mask === 'left' && e.sg < 0) || (M.marks.mask === 'right' && e.sg > 0) ? M.col.patch : mixHex(base, M.col.patch, 0.55);
    blob(x, [path], col, shadeOf(col, 0.3), { line: LW, off });
    return;
  }
  // upright ears: pointy / round / long
  const out = perk >= 0 ? 0.2 + 0.3 * (1 - perk) : 0.5 + 0.75 * (-perk);
  const L = Rs * (T === 'long' ? 1.25 : T === 'round' ? 0.42 : 0.62) * sz * (perk < 0 ? 1 + 0.2 * perk : 1), Wd = Rs * (T === 'long' ? 0.34 : T === 'round' ? 0.4 : 0.38) * sz;
  const ang = -Math.PI / 2 + side * (out + (T === 'long' && perk < 0 ? 0.6 * (-perk) : 0));
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const outer = (k) => (g) => {
    g.beginPath();
    if (T === 'round') { g.ellipse(b[0] + dx * L * 0.45, b[1] + dy * L * 0.45, Wd * k, L * 0.75 * k, ang + Math.PI / 2, 0, TAU); return; }
    g.moveTo(b[0] - nx * Wd * k, b[1] - ny * Wd * k);
    g.quadraticCurveTo(b[0] - nx * Wd * 0.7 * k + dx * L * 0.6, b[1] - ny * Wd * 0.7 * k + dy * L * 0.6, b[0] + dx * L * (0.4 + 0.6 * k), b[1] + dy * L * (0.4 + 0.6 * k));
    g.quadraticCurveTo(b[0] + nx * Wd * 0.7 * k + dx * L * 0.6, b[1] + ny * Wd * 0.7 * k + dy * L * 0.6, b[0] + nx * Wd * k, b[1] + ny * Wd * k); g.closePath();
  };
  blob(x, [outer(1)], base, sh, { line: LW, off });
  x.save(); outer(0.55)(x); x.fillStyle = inner; x.fill(); x.restore();
}
function drawTail(x, M, T0, T1, dir, Tl, s, LW, off, t, w, again = false) {
  const T = M.tail.type; if (T === 'none') return;
  const base = M.col.base, sh = shadeOf(base, 0.3), tipCol = M.marks.tailTip ? M.col.belly : base;
  const dx = T1[0] - T0[0], dy = T1[1] - T0[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const bend = 0.35 + 0.25 * Math.sin(t * 2 + 1);
  const mid = [T0[0] + dx * 0.5 + nx * L * 0.18 * bend, T0[1] + dy * 0.5 + ny * L * 0.18 * bend];
  if (T === 'stub') { blob(x, [(g) => circ(g, T0[0] + ux * 8 * s, T0[1] + uy * 8 * s, 14 * s)], base, sh, { line: LW, off }); return; }
  if (T === 'thin') { tube(x, [T0, mid, T1], 11 * s, base, { line: LW, shade: sh, off }); if (M.marks.tailTip) tube(x, [[lerp(mid[0], T1[0], 0.6), lerp(mid[1], T1[1], 0.6)], T1], 11 * s, tipCol, { line: 0 }); return; }
  if (T === 'curl') {
    const r = L * 0.32, cc = [T0[0] + ux * r * 1.1 + nx * r * 0.3, T0[1] + uy * r * 1.1 + ny * r * 0.3];
    x.save(); x.beginPath(); x.arc(cc[0], cc[1], r, Math.atan2(T0[1] - cc[1], T0[0] - cc[0]), Math.atan2(T0[1] - cc[1], T0[0] - cc[0]) + TAU * 0.82);
    x.lineCap = 'round'; x.lineWidth = 16 * s + lw(x, LW) * 2; x.strokeStyle = INK; x.stroke(); x.lineWidth = 16 * s; x.strokeStyle = base; x.stroke(); x.restore();
    return;
  }
  // bushy / plume: a fat tapered teardrop that bends. Foreshortened (pointing at or away from the camera) it still shows
  // as a short tail hanging from the rump, never a blob
  // seen end-on, the tail sweeps off to one side (with its wag) and stays short, so it never hangs between the legs
  if (L < Tl * s * 0.55 && !again) { const sg = Math.sign(dy) || 1, side = Math.sign(Math.sin(t * 0.3) + w * 3 + 0.2) || 1; T1 = [T0[0] + dx * 0.3 + side * Tl * s * (0.42 + 0.25 * Math.abs(w)), T0[1] + sg * Tl * s * 0.32 - Tl * s * 0.12]; return drawTail(x, M, T0, T1, dir, Tl, s, LW, off, t, w, true); }
  const Wd = (T === 'plume' ? 0.42 : 0.3) * Math.max(L, Tl * s * 0.85);
  const path = (g) => {
    g.beginPath(); g.moveTo(T0[0] + nx * Wd * 0.35, T0[1] + ny * Wd * 0.35);
    g.quadraticCurveTo(mid[0] + nx * Wd, mid[1] + ny * Wd, T1[0], T1[1]);
    g.quadraticCurveTo(mid[0] - nx * Wd, mid[1] - ny * Wd, T0[0] - nx * Wd * 0.35, T0[1] - ny * Wd * 0.35); g.closePath();
  };
  blob(x, [path], base, sh, { line: LW, off });
  if (M.marks.tailTip) { x.save(); path(x); x.clip(); circ(x, T1[0], T1[1], L * 0.32); x.fillStyle = tipCol; x.fill(); x.restore(); }
}
function critterFace(x, M, ex, P, HP, Rs, LW, t, snC, snR, snX = snR) {
  const blink = Math.max(P.blink ?? 0, ex.lid ?? 0), look = P.look || ex.look || [0, 0], es = M.head.eyeSize ?? 1;
  for (const sg of [-1, 1]) {
    const e = HP(sg * 0.5, -0.02), k = vis(e[2]); if (k <= 0) continue;
    const f = Math.max(0.32, e[2]), er = Rs * 0.13 * es;
    const cx = e[0] + look[0] * Rs * 0.05, cy = e[1] + look[1] * Rs * 0.04;
    x.save(); x.globalAlpha *= k;
    if (ex.eye === 'happy') curve(x, [cx - er * f, cy + er * 0.3], [cx, cy - er * 1.1], [cx + er * f, cy + er * 0.3], LW * 1.05);
    else if (ex.eye === 'closed' || blink > 0.92) curve(x, [cx - er * f, cy], [cx, cy + er * 0.6], [cx + er * f, cy], LW);
    else if (ex.eye === 'wide') {
      ell(x, cx, cy, er * 1.2 * f, er * 1.25); x.fillStyle = '#FFFFFF'; x.fill(); x.lineWidth = lw(x, LW * 0.75); x.strokeStyle = INK; x.stroke();
      circ(x, cx + look[0] * er * 0.3, cy, er * 0.5); x.fillStyle = M.col.eyes; x.fill(); circ(x, cx - er * 0.15, cy - er * 0.2, er * 0.16); x.fillStyle = '#FFF'; x.fill();
    } else {
      ell(x, cx, cy, er * f, er * 1.08); x.fillStyle = M.col.eyes; x.fill();
      circ(x, cx - er * 0.35 * f, cy - er * 0.42, er * 0.38); x.fillStyle = '#FFFFFF'; x.fill();
      circ(x, cx + er * 0.32 * f, cy + er * 0.4, er * 0.15); x.fill();
      if (blink > 0.02) {
        const ly = cy - er * 1.08 + 2.16 * er * blink;
        x.save(); ell(x, cx, cy, er * 1.2 * f, er * 1.2); x.clip(); x.fillStyle = M.col.base; x.fillRect(cx - er * 2, cy - er * 2, er * 4, ly - (cy - er * 2)); x.restore();
        line(x, [[cx - er * 1.1 * f, ly + er * 0.1], [cx + er * 1.1 * f, ly + er * 0.1]], LW * 0.95);
      }
    }
    x.restore();
    if (M.brows) {
      const [raise, slant] = ex.brow, lat = -0.28 - raise * 0.1;
      const a = HP(sg * 0.32, lat - slant * 0.07 + 0.02), b = HP(sg * 0.7, lat + slant * 0.05), kb = vis(Math.min(a[2], b[2]) + 0.1);
      if (kb > 0) { x.save(); x.globalAlpha *= kb; line(x, [[a[0], a[1]], [b[0], b[1]]], LW * 1.2, shadeOf(M.col.base, 0.55)); x.restore(); }
    }
  }
  // nose + mouth on the snout
  const fwd = snC[2];
  const nose = HP(0, 0.3, 0.58 + 0.42 * M.head.snout + (snX / Rs) * 0.95);
  const nk = vis(nose[2] + 0.35);
  const sniff = P.expr === 'sniffing' ? 0.12 * Math.sin(t * 22) : 0;
  if (nk > 0) {
    x.save(); x.globalAlpha *= nk;
    const nw = Rs * 0.13 * (1 + sniff), nh = Rs * 0.095;
    x.beginPath(); x.moveTo(nose[0] - nw, nose[1] - nh * 0.6); x.quadraticCurveTo(nose[0], nose[1] - nh * 1.15, nose[0] + nw, nose[1] - nh * 0.6); x.quadraticCurveTo(nose[0] + nw * 0.6, nose[1] + nh, nose[0], nose[1] + nh * 0.95); x.quadraticCurveTo(nose[0] - nw * 0.6, nose[1] + nh, nose[0] - nw, nose[1] - nh * 0.6); x.closePath();
    x.fillStyle = M.col.nose; x.fill(); x.lineWidth = lw(x, LW * 0.6); x.strokeStyle = INK; x.stroke();
    ell(x, nose[0] - nw * 0.35, nose[1] - nh * 0.45, nw * 0.3, nh * 0.22); x.fillStyle = 'rgba(255,255,255,0.55)'; x.fill();
    x.restore();
  }
  const talk = clamp(P.talk ?? 0), tongue = clamp(P.tongue ?? ex.tongue ?? 0);
  const mouthShape = talk > 0.05 ? 'open' : ex.mouth;
  const mc = [nose[0], nose[1] + Rs * 0.12];
  const mk = vis(fwd + 0.4); if (mk <= 0) return;
  x.save(); x.globalAlpha *= mk;
  const mw = Rs * 0.15 * Math.max(0.45, fwd + 0.3);
  line(x, [[nose[0], nose[1] + Rs * 0.07], mc], LW * 0.85);
  if (mouthShape === 'closed' || mouthShape === 'smile') {
    const up = mouthShape === 'smile' ? 0.06 : 0.03;
    curve(x, [mc[0] - mw, mc[1] - Rs * 0.01], [mc[0] - mw * 0.5, mc[1] + Rs * (0.06 + up)], mc, LW * 0.85);
    curve(x, mc, [mc[0] + mw * 0.5, mc[1] + Rs * (0.06 + up)], [mc[0] + mw, mc[1] - Rs * 0.01], LW * 0.85);
  } else {
    const open = mouthShape === 'pant' ? 0.55 + 0.15 * Math.sin(t * 9) : mouthShape === 'snarl' ? 0.3 : 0.35 + 0.65 * talk;
    const h = Rs * 0.2 * open + Rs * 0.04, ww = mw * 1.25;
    x.beginPath(); x.moveTo(mc[0] - ww, mc[1]); x.quadraticCurveTo(mc[0], mc[1] - Rs * 0.03, mc[0] + ww, mc[1]); x.quadraticCurveTo(mc[0] + ww * 0.7, mc[1] + h, mc[0], mc[1] + h); x.quadraticCurveTo(mc[0] - ww * 0.7, mc[1] + h, mc[0] - ww, mc[1]); x.closePath();
    x.fillStyle = '#4A1A1E'; x.fill();
    if (tongue > 0 || mouthShape === 'pant') { x.save(); x.clip(); ell(x, mc[0] + ww * 0.1, mc[1] + h * 0.95, ww * 0.55, h * 0.55); x.fillStyle = M.col.tongue; x.fill(); x.restore(); }
    x.lineWidth = lw(x, LW * 0.85); x.strokeStyle = INK; x.lineJoin = 'round'; x.stroke();
    if (mouthShape === 'snarl') { x.fillStyle = '#FFFFFF'; for (const sg of [-1, 1]) { poly(x, [[mc[0] + sg * ww * 0.55, mc[1] + 1], [mc[0] + sg * ww * 0.35, mc[1] + 1], [mc[0] + sg * ww * 0.45, mc[1] + h * 0.45]]); x.fill(); } }
    if (tongue > 0.4 && mouthShape === 'pant') {                       // tongue hanging out
      const tl = Rs * 0.2 * tongue;
      blob(x, [(g) => { g.beginPath(); g.ellipse(mc[0] + ww * 0.15, mc[1] + h + tl * 0.45, ww * 0.42, tl * 0.75, 0, 0, TAU); }], M.col.tongue, shadeOf(M.col.tongue, 0.2), { line: LW * 0.8 });
      line(x, [[mc[0] + ww * 0.15, mc[1] + h * 0.9], [mc[0] + ww * 0.15, mc[1] + h + tl * 0.7]], LW * 0.5, shadeOf(M.col.tongue, 0.4));
    }
  }
  if (M.whiskers) for (const sg of [-1, 1]) for (const k of [0, 1]) line(x, [[snC[0] + sg * snR * 0.6, snC[1] + k * 6], [snC[0] + sg * snR * 1.6, snC[1] - 6 + k * 14]], LW * 0.45);
  x.restore();
}
