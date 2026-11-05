import * as THREE from 'three';

// Deterministischer Zufall: gleiche Folge ergibt immer dasselbe Video.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOutBack = (t) => { t = clamp(t); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

const matCache = new Map();
/** Flach schattiertes Low-Poly-Material (gecacht). */
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color, flatShading: true, roughness: 0.9, metalness: 0, ...opts
    }));
  }
  return matCache.get(key);
}

export function box(w, h, d, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cyl(rTop, rBot, h, seg, color, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function ico(r, detail, color, opts) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cone(r, h, seg, color, opts) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Schild/Beschriftung als Textur-Plane. */
export function sign(text, w, h, { bg = '#222', fg = '#fff', size = 0.62, weight = 800 } = {}) {
  const px = 256;
  const c = document.createElement('canvas');
  c.width = Math.round(px * w); c.height = Math.round(px * h);
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  g.fillStyle = fg;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.split('\n');
  let fs = c.height * size / lines.length;
  g.font = `${weight} ${fs}px Inter, sans-serif`;
  const widest = Math.max(...lines.map((ln) => g.measureText(ln).width));
  if (widest > c.width * 0.9) { fs *= (c.width * 0.9) / widest; g.font = `${weight} ${fs}px Inter, sans-serif`; }
  lines.forEach((ln, i) => g.fillText(ln, c.width / 2, c.height * (i + 0.5) / lines.length + fs * 0.04));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !bg }));
  return m;
}
