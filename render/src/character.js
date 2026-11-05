import * as THREE from 'three';
import { box, cyl, ico, cone, mat, lerp, smooth, clamp } from './util.js';

// ---------- Figuren-Presets ----------
export const PRESETS = {
  milo: { skin: '#e8b48a', top: '#6f8aa6', topDetail: '#4d6580', pants: '#3a3f55', shoes: '#2b2b30', hair: '#5a3a24', hat: '#e8742b', scale: 1, build: 1 },
  bruno: { skin: '#d9a07a', top: '#1c1c22', topDetail: '#2c2c35', pants: '#17171c', shoes: '#0d0d10', hair: null, glasses: true, scale: 1.12, build: 1.45 },
  dilara: { skin: '#c98e68', top: '#d9453a', topDetail: '#f4f1ea', pants: '#2f3340', shoes: '#f4f1ea', hair: '#1a1210', bun: true, apron: '#f4f1ea', scale: 0.96, build: 0.95 },
  henk: { skin: '#e2b999', top: '#8b6b4a', topDetail: '#6d5238', pants: '#4b4b52', shoes: '#3a2c20', hair: '#d9d9d9', hat: '#6a7a52', beard: '#e8e8e8', scale: 0.96, build: 1.05 }
};

const THIGH = 0.46, SHIN = 0.46, UPPER = 0.36, FORE = 0.34;
export const HIP_Y = THIGH + SHIN + 0.07;

export function makeExtraPreset(r) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  return {
    skin: pick(['#e8b48a', '#c98e68', '#8d5a3b', '#f1c9a5']),
    top: pick(['#4a7c59', '#b5651d', '#5b5ea6', '#c44569', '#2f6f9f', '#7a7a7a']),
    topDetail: '#00000022',
    pants: pick(['#2d3142', '#3b3b3b', '#4b3f72', '#243b55']),
    shoes: '#222', hair: pick(['#2b1b12', '#6b4423', '#c9a24a', '#111']),
    scale: 0.92 + r() * 0.16, build: 0.9 + r() * 0.2
  };
}

/** Baut eine Low-Poly-Figur mit benannten Gelenken. */
export function buildCharacter(preset) {
  const p = preset;
  const root = new THREE.Group();            // Position + Gierwinkel
  const hips = new THREE.Group(); root.add(hips);
  const J = { root, hips };
  const b = p.build;

  // Torso (sechskantig)
  const torso = new THREE.Group(); hips.add(torso); J.torso = torso;
  const body = cyl(0.25 * b, 0.21 * b, 0.62, 6, p.top); body.position.y = 0.31; body.scale.z = 0.72; torso.add(body);
  if (p.apron) { const ap = box(0.36 * b, 0.46, 0.04, p.apron); ap.position.set(0, 0.26, 0.17); torso.add(ap); }
  if (p.topDetail && p.topDetail.length === 7) { const st = box(0.34 * b, 0.07, 0.3, p.topDetail); st.position.set(0, 0.04, 0); torso.add(st); }
  if (p.hat === '#e8742b') { /* Milos Hoodie-Kapuze */ const hood = cyl(0.2, 0.26 * b, 0.12, 6, p.topDetail); hood.position.set(0, 0.64, -0.06); hood.scale.z = 0.8; torso.add(hood); }

  // Kopf
  const neck = new THREE.Group(); neck.position.y = 0.66; torso.add(neck); J.neck = neck;
  const head = new THREE.Group(); head.position.y = 0.16; neck.add(head); J.head = head;
  const skull = ico(0.25, 1, p.skin); skull.scale.set(0.95, 1.05, 0.95); head.add(skull);
  const nose = cone(0.04, 0.09, 4, p.skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.02, 0.26); head.add(nose);
  const eyeGeo = new THREE.BoxGeometry(0.055, 0.075, 0.03);
  const eyeMat = mat('#1a1a1f');
  J.eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.set(sx * 0.09, 0.05, 0.225); head.add(e); J.eyes.push(e);
  }
  const mouth = box(0.09, 0.02, 0.02, '#5a2a2a'); mouth.position.set(0, -0.1, 0.225); head.add(mouth); J.mouth = mouth;
  if (p.glasses) { const g = box(0.34, 0.06, 0.04, '#0b0b0d'); g.position.set(0, 0.05, 0.235); head.add(g); }
  if (p.hair) {
    const hair = ico(0.265, 1, p.hair); hair.scale.set(0.98, 0.7, 1); hair.position.set(0, 0.09, -0.04); head.add(hair);
  }
  if (p.bun) { const bun = ico(0.1, 0, p.hair); bun.position.set(0, 0.27, -0.12); head.add(bun); }
  if (p.beard) { const bd = ico(0.17, 0, p.beard); bd.scale.set(1, 0.8, 0.7); bd.position.set(0, -0.14, 0.14); head.add(bd); }
  if (p.hat) {
    const beanie = ico(0.275, 1, p.hat); beanie.scale.set(1, 0.72, 1); beanie.position.set(0, 0.13, -0.01); head.add(beanie);
    if (p.hat === '#e8742b') { const pom = ico(0.07, 0, '#f4f1ea'); pom.position.set(0, 0.36, 0); head.add(pom); }
    else { const brim = cyl(0.33, 0.33, 0.03, 8, p.hat); brim.position.set(0, 0.1, 0); head.add(brim); }
  }

  // Arme (Schulter → Ellbogen → Hand)
  function arm(sx) {
    const sh = new THREE.Group(); sh.position.set(sx * (0.3 * b + 0.02), 0.56, 0); torso.add(sh);
    const up = cyl(0.065 * Math.sqrt(b), 0.06 * Math.sqrt(b), UPPER, 5, p.top); up.position.y = -UPPER / 2; sh.add(up);
    const el = new THREE.Group(); el.position.y = -UPPER; sh.add(el);
    const fo = cyl(0.055 * Math.sqrt(b), 0.05, FORE, 5, p.skin); fo.position.y = -FORE / 2; el.add(fo);
    const hand = ico(0.065, 0, p.skin); hand.position.y = -FORE - 0.01; el.add(hand);
    return { sh, el };
  }
  const aL = arm(-1), aR = arm(1);
  J.shL = aL.sh; J.elL = aL.el; J.shR = aR.sh; J.elR = aR.el;

  // Beine
  function leg(sx) {
    const th = new THREE.Group(); th.position.set(sx * 0.12 * b, 0, 0); hips.add(th);
    const t = cyl(0.095 * Math.sqrt(b), 0.08, THIGH, 5, p.pants); t.position.y = -THIGH / 2; th.add(t);
    const kn = new THREE.Group(); kn.position.y = -THIGH; th.add(kn);
    const s = cyl(0.075, 0.062, SHIN, 5, p.pants); s.position.y = -SHIN / 2; kn.add(s);
    const foot = box(0.12, 0.08, 0.26, p.shoes); foot.position.set(0, -SHIN - 0.005, 0.05); kn.add(foot);
    return { th, kn };
  }
  const lL = leg(-1), lR = leg(1);
  J.thL = lL.th; J.knL = lL.kn; J.thR = lR.th; J.knR = lR.kn;

  root.scale.setScalar(p.scale);
  root.userData.J = J;
  return root;
}

// ---------- Posen (nur Zahlen → lassen sich weich überblenden) ----------
const BASE = () => ({
  hipY: HIP_Y, torsoX: 0, torsoZ: 0, headX: 0, headY: 0, headZ: 0,
  shLx: 0, shLz: 0.05, shRx: 0, shRz: -0.05, elL: -0.1, elR: -0.1,
  thLx: 0, thRx: 0, thLz: 0, thRz: 0, knL: 0, knR: 0, eyes: 1, mouth: 0.2, zzz: 0
});

/** Berechnet die Pose für eine Animation. tl = Sekunden im Segment, dist = zurückgelegte Strecke. */
export function poseFor(anim, tl, dist = 0, sit = false, seatY = 0.5) {
  const q = BASE();
  const sitting = anim === 'sleep' || ((anim === 'wake' || anim === 'hungry') && sit);
  if (sitting) {
    q.hipY = seatY + 0.07; q.thLx = q.thRx = -Math.PI / 2 + 0.05; q.knL = q.knR = Math.PI / 2 - 0.05;
    q.thLz = -0.06; q.thRz = 0.06;
  }
  const breathe = Math.sin(tl * 2.1) * 0.02;
  switch (anim) {
    case 'idle':
      q.torsoX = breathe; q.shLz = 0.06 + breathe; q.shRz = -0.06 - breathe; q.headY = Math.sin(tl * 0.7) * 0.12;
      break;
    case 'walk': {
      const ph = dist / 0.78 * Math.PI;
      const s = Math.sin(ph), c = Math.cos(ph);
      q.hipY = HIP_Y - 0.02 + Math.abs(Math.cos(ph)) * 0.05;
      q.thLx = s * 0.75; q.thRx = -s * 0.75;
      q.knL = Math.max(0, -c) * 0.9 + 0.05; q.knR = Math.max(0, c) * 0.9 + 0.05;
      q.shLx = -s * 0.6; q.shRx = s * 0.6; q.elL = -0.25 - Math.max(0, s) * 0.4; q.elR = -0.25 - Math.max(0, -s) * 0.4;
      q.torsoX = 0.07; q.torsoZ = s * 0.04; q.headX = -0.05;
      break;
    }
    case 'sleep':
      q.torsoX = -0.18; q.torsoZ = 0.1; q.headX = 0.45; q.headZ = 0.35; q.headY = 0.2;
      q.shLx = -0.5; q.shRx = -0.5; q.shLz = 0.1; q.shRz = -0.1; q.elL = -1.1; q.elR = -1.1;
      q.eyes = 0.05; q.mouth = 0.15 + (Math.sin(tl * 1.6) * 0.5 + 0.5) * 0.4; q.zzz = 1;
      q.torsoX += Math.sin(tl * 1.6) * 0.03;
      break;
    case 'wake': {
      // Aufsetzen, Augen auf, Strecken
      const k = smooth(tl / 1.2);
      q.eyes = clamp(tl / 0.6, 0.05, 1);
      q.torsoX = lerp(-0.18, 0.15, k); q.headX = lerp(0.45, -0.05, k); q.headZ = lerp(0.35, 0, k) + Math.sin(tl * 9) * 0.05 * (1 - k);
      q.shLx = lerp(-0.5, -0.1, k); q.shRx = lerp(-0.5, -0.1, k); q.elL = lerp(-1.1, -0.5, k); q.elR = lerp(-1.1, -0.5, k);
      q.zzz = 0; q.mouth = 0.3;
      break;
    }
    case 'hungry': {
      // Bauch halten, Bauchgrollen-Zittern
      const g = Math.max(0, Math.sin(tl * 4.2)) ** 3;
      q.torsoX = 0.2 + g * 0.05; q.headX = 0.22; q.headY = Math.sin(tl * 1.4) * 0.18;
      q.shLx = -0.5; q.shRx = -0.5; q.shLz = -0.25; q.shRz = 0.25; q.elL = -1.35; q.elR = -1.35;
      q.mouth = 0.1 + g * 0.35;
      q.hipY += g * 0.012; q.torsoZ = Math.sin(tl * 22) * 0.012 * g;
      break;
    }
    case 'talk': {
      const m = Math.max(0, Math.sin(tl * 13) * Math.sin(tl * 4.7 + 1));
      q.mouth = 0.15 + m * 0.65; q.headX = Math.sin(tl * 5) * 0.06; q.headY = Math.sin(tl * 1.3) * 0.14;
      q.shRx = -0.7 + Math.sin(tl * 3.1) * 0.35; q.elR = -1.0 + Math.sin(tl * 3.1 + 1) * 0.4; q.shRz = -0.15;
      q.shLx = -0.15; q.elL = -0.5 + Math.sin(tl * 2.3) * 0.2;
      q.torsoX = 0.03 + breathe;
      break;
    }
    case 'wave': {
      const w = Math.sin(tl * 9);
      q.shRz = -2.45; q.shRx = 0; q.elR = -0.35 + w * 0.35; q.mouth = 0.55; q.headZ = -0.08; q.headY = -0.1;
      q.shLz = 0.06; q.torsoX = breathe;
      break;
    }
    case 'think': {
      q.shRx = -1.0; q.elR = -2.25; q.shRz = -0.25; q.headX = 0.12; q.headZ = 0.14; q.headY = Math.sin(tl * 0.8) * 0.3;
      q.shLx = -0.25; q.elL = -1.4; q.torsoX = 0.04 + breathe; q.mouth = 0.05;
      q.hipY = HIP_Y; q.thLx = 0.05; q.thRx = -0.05;
      break;
    }
    default: break;
  }
  return q;
}

export function applyPose(J, q) {
  J.hips.position.y = q.hipY;
  J.torso.rotation.set(q.torsoX, 0, q.torsoZ);
  J.neck.rotation.set(q.headX, q.headY, q.headZ);
  J.shL.rotation.set(q.shLx, 0, q.shLz); J.shR.rotation.set(q.shRx, 0, q.shRz);
  J.elL.rotation.set(q.elL, 0, 0); J.elR.rotation.set(q.elR, 0, 0);
  J.thL.rotation.set(q.thLx, 0, q.thLz); J.thR.rotation.set(q.thRx, 0, q.thRz);
  J.knL.rotation.set(q.knL, 0, 0); J.knR.rotation.set(q.knR, 0, 0);
  for (const e of J.eyes) e.scale.y = Math.max(0.08, q.eyes);
  J.mouth.scale.y = 0.6 + q.mouth * 5;
  J.mouth.scale.x = 1 - q.mouth * 0.25;
}

export function blendPose(a, b, k) {
  const o = {};
  for (const key of Object.keys(a)) o[key] = lerp(a[key], b[key], k);
  return o;
}
