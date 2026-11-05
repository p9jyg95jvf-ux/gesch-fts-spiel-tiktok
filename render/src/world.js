import * as THREE from 'three';
import { rng, box, cyl, ico, cone, mat, sign, lerp, clamp } from './util.js';
import { buildCharacter, makeExtraPreset, applyPose, poseFor, HIP_Y } from './character.js';

const SKY = {
  night: { top: '#080c22', bottom: '#2b3160', fog: '#1a2048', hemiSky: '#6f7fd0', hemiGround: '#1b1d33', hemi: 0.9, sun: '#8fa4ff', sunI: 0.6, win: 0.85 },
  dawn: { top: '#4a5a86', bottom: '#f0a58a', fog: '#c79aa0', hemiSky: '#ffd6c2', hemiGround: '#5a4a5a', hemi: 0.95, sun: '#ffc08a', sunI: 1.4, win: 0.5 },
  day: { top: '#4aa8f5', bottom: '#dff2ff', fog: '#cfe9ff', hemiSky: '#ffffff', hemiGround: '#9a9a8c', hemi: 1.05, sun: '#fff1d0', sunI: 2.4, win: 0.0 }
};

function skyDome(cfg) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(cfg.top) }, bottom: { value: new THREE.Color(cfg.bottom) } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ float k = smoothstep(-0.05,0.55,h); gl_FragColor = vec4(mix(bottom,top,k),1.0); }'
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), m);
  s.renderOrder = -10;
  return s;
}

function setupLights(scene, cfg, { shadows = true, focus = [0, 0, 0] } = {}) {
  scene.add(new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, cfg.hemi));
  const sun = new THREE.DirectionalLight(cfg.sun, cfg.sunI);
  sun.position.set(focus[0] + 8, 14, focus[2] + 9);
  sun.target.position.set(...focus);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera; c.left = -14; c.right = 14; c.top = 12; c.bottom = -12; c.near = 1; c.far = 50;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
}

const PALETTE = ['#c9b79c', '#a7b4c2', '#d8a48f', '#8fa3a0', '#b9a2c7', '#cdbf8a', '#9aa7b8', '#d6c3b5'];

/** Fassaden mit Fenstern; sammelt Fenster-Instanzen in `win`. */
function building(scene, win, r, x, z, w, h, d, color, faceZ = 1) {
  const b = box(w, h, d, color); b.position.set(x, h / 2, z); scene.add(b);
  const roof = box(w + 0.3, 0.25, d + 0.3, '#5d5d66'); roof.position.set(x, h + 0.12, z); scene.add(roof);
  const cols = Math.max(1, Math.floor(w / 1.6)), rows = Math.max(1, Math.floor((h - 1.5) / 1.8));
  for (const side of [1, -1]) {
    if (side !== faceZ && faceZ !== 0) continue;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const wx = x - w / 2 + (i + 0.5) * (w / cols);
      const wy = 2.2 + j * 1.8;
      win.push({ x: wx, y: wy, z: z + side * (d / 2 + 0.02), lit: r() < 0.55, side });
    }
  }
}

function finishWindows(scene, win, cfg) {
  if (!win.length) return;
  const geo = new THREE.PlaneGeometry(0.8, 1.05);
  const mk = (list, color) => {
    if (!list.length) return;
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }), list.length);
    const o = new THREE.Object3D();
    list.forEach((w, i) => { o.position.set(w.x, w.y, w.z); o.rotation.y = w.side === 1 ? 0 : Math.PI; o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    scene.add(m);
  };
  const night = cfg.win > 0.6;
  mk(win.filter((w) => w.lit), night ? '#ffd27a' : cfg === SKY.dawn ? '#ffd9a8' : '#8fc4ea');
  mk(win.filter((w) => !w.lit), night ? '#1c2447' : cfg === SKY.dawn ? '#6a7596' : '#7fb0d6');
}

function lamp(scene, x, z, cfg, light = false) {
  const pole = cyl(0.06, 0.08, 4.2, 6, '#3a3d46'); pole.position.set(x, 2.1, z); scene.add(pole);
  const arm = box(0.9, 0.07, 0.07, '#3a3d46'); arm.position.set(x + 0.4, 4.2, z); scene.add(arm);
  const head = box(0.4, 0.14, 0.22, '#222', {}); head.position.set(x + 0.8, 4.15, z); scene.add(head);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.18), new THREE.MeshBasicMaterial({ color: cfg.win > 0.6 ? '#fff1b8' : '#d9d9c8' }));
  glow.position.set(x + 0.8, 4.06, z); scene.add(glow);
  if (light) { const pl = new THREE.PointLight('#ffcf8a', 55, 14, 1.6); pl.position.set(x + 0.8, 3.7, z + 0.3); scene.add(pl); }
}

function tree(scene, x, z, r, s = 1) {
  const t = cyl(0.12 * s, 0.17 * s, 1.4 * s, 5, '#6b4a2f'); t.position.set(x, 0.7 * s, z); scene.add(t);
  for (let i = 0; i < 3; i++) {
    const c = ico((1.0 - i * 0.18) * s, 0, i % 2 ? '#4f9a5a' : '#3f8a4c');
    c.position.set(x + (r() - 0.5) * 0.3, (1.9 + i * 0.7) * s, z + (r() - 0.5) * 0.3); scene.add(c);
  }
}

function car(color) {
  const g = new THREE.Group();
  const body = box(2.2, 0.55, 1.0, color); body.position.y = 0.55; g.add(body);
  const cab = box(1.2, 0.45, 0.9, color); cab.position.set(-0.1, 1.05, 0); g.add(cab);
  const gl = box(1.22, 0.3, 0.92, '#223344', { roughness: 0.2 }); gl.position.set(-0.1, 1.08, 0); gl.scale.set(0.98, 0.85, 0.99); g.add(gl);
  for (const [x, z] of [[-0.7, 0.5], [0.7, 0.5], [-0.7, -0.5], [0.7, -0.5]]) {
    const w = cyl(0.26, 0.26, 0.18, 8, '#15151a'); w.rotation.x = Math.PI / 2; w.position.set(x, 0.26, z); g.add(w);
  }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.7), new THREE.MeshBasicMaterial({ color: '#fff4c2' })); hl.position.set(1.12, 0.6, 0); g.add(hl);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.7), new THREE.MeshBasicMaterial({ color: '#ff3b30' })); tl.position.set(-1.12, 0.6, 0); g.add(tl);
  return g;
}

function rainSystem(scene, area, count = 700) {
  const r = rng(7);
  const drops = Array.from({ length: count }, () => ({ x: area.x0 + r() * (area.x1 - area.x0), y: r() * area.h, z: area.z0 + r() * (area.z1 - area.z0), sp: 14 + r() * 6 }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: 0.55 }));
  lines.frustumCulled = false; scene.add(lines);
  return (t) => {
    const p = geo.attributes.position.array;
    drops.forEach((d, i) => {
      const y = ((d.y - d.sp * t) % area.h + area.h) % area.h;
      p.set([d.x, y, d.z, d.x - 0.04, y + 0.45, d.z], i * 6);
    });
    geo.attributes.position.needsUpdate = true;
  };
}

function extras(scene, list, r) {
  // Passanten im Hintergrund (laufen deterministisch hin und her)
  return list.map((e, i) => {
    const ch = buildCharacter(makeExtraPreset(r)); scene.add(ch);
    return { ch, ...e };
  });
}

/** Baut eine Umgebung. Rückgabe: { scene, update(t), actorsRoot } */
export function buildEnv(env, seed) {
  const cfg = SKY[env.time];
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(cfg.fog, 28, 120);
  const dome = skyDome(cfg);
  scene.add(dome);
  const r = rng(seed);
  const updaters = [];
  const win = [];
  const night = env.time === 'night';

  const ground = (x0, x1, z0, z1, color, y = 0, rough = 0.95) => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat(color, { roughness: rough }));
    g.rotation.x = -Math.PI / 2; g.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.receiveShadow = true; scene.add(g); return g;
  };

  if (env.type === 'shelter') {
    setupLights(scene, cfg, { shadows: !night, focus: [0, 0, 0] });
    ground(-300, 300, -300, 300, night ? '#10131f' : '#4a4d58', -0.02);
    ground(-80, 80, -10, -2.4, night ? '#23252d' : '#34363f', 0, env.weather === 'rain' ? 0.35 : 0.9);       // Straße
    ground(-80, 80, -2.4, 12, '#8e909a', 0.02);                                                              // Gehweg
    ground(-80, 80, -14, -10, '#8e909a', 0.02);
    const curb = box(160, 0.16, 0.2, '#b9bbc4'); curb.position.set(0, 0.08, -2.4); scene.add(curb);
    for (let x = -70; x < 70; x += 5) { const m = box(2.2, 0.01, 0.16, '#e8e2c8'); m.position.set(x, 0.03, -6.2); scene.add(m); }
    // Straßenblock hinten + vorn
    for (let x = -60; x < 60; x += 7.5) {
      const h = 7 + r() * 16;
      building(scene, win, r, x + r() * 1.5, -19 - r() * 3, 6 + r() * 1.5, h, 8, PALETTE[Math.floor(r() * PALETTE.length)], 1);
    }
    for (let x = -60; x < 60; x += 8) {
      const h = 8 + r() * 14;
      const bx = x + r() * 1.5, col = PALETTE[Math.floor(r() * PALETTE.length)];
      if (bx > -44 && bx < 14) continue;   // Schneise für den Kameraflug im Intro
      building(scene, win, r, bx, 22 + r() * 3, 6.5, h, 8, col, -1);
    }
    for (let x = -40; x < 40; x += 9) building(scene, win, r, x, -34, 8, 18 + r() * 25, 8, PALETTE[Math.floor(r() * PALETTE.length)], 1);
    // Immobilienbüro mit dem Kühlschrank (Running Gag)
    const shop = box(7, 4.2, 5, '#a58d7f'); shop.position.set(-5.5, 2.1, -13.4); scene.add(shop);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.6), new THREE.MeshBasicMaterial({ color: night ? '#ffe7b0' : '#e7f1f5' })); glass.position.set(-5.5, 1.9, -10.88); scene.add(glass);
    const fridge = box(1.3, 2.4, 1.1, '#f4f7fa'); fridge.position.set(-4.0, 1.2, -10.6); scene.add(fridge);
    const fdoor = box(1.32, 0.06, 1.12, '#b9c3cc'); fdoor.position.set(-4.0, 1.6, -10.6); scene.add(fdoor);
    const fhandle = box(0.07, 0.6, 0.07, '#9aa3ab'); fhandle.position.set(-3.5, 1.5, -10.0); scene.add(fhandle);
    const imm = sign('IMMO BRAUN', 4.2, 0.7, { bg: '#2d3a4a', fg: '#fff', size: 0.55 }); imm.position.set(-5.5, 3.55, -10.86); scene.add(imm);
    const zettel = sign('WOHNUNG FREI\ninkl. Kühlschrank', 2.0, 0.8, { bg: '#fff6c9', fg: '#3a3a3a', size: 0.7 }); zettel.position.set(-7.0, 1.9, -10.85); scene.add(zettel);
    // Haltestelle
    const frame = '#4b5563';
    for (const x of [-1.9, 1.9]) { const p = box(0.1, 2.5, 0.1, frame); p.position.set(x, 1.25, -1.0); scene.add(p); }
    const p2 = box(0.1, 2.5, 0.1, frame); p2.position.set(-1.9, 1.25, 1.0); scene.add(p2);
    const roof = box(4.3, 0.12, 2.4, '#38404d'); roof.position.set(0, 2.55, 0.1); scene.add(roof);
    const gm = new THREE.MeshStandardMaterial({ color: '#bfe3f2', transparent: true, opacity: 0.22, roughness: 0.1, side: THREE.DoubleSide });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.3), gm); back.position.set(0, 1.3, -1.0); scene.add(back);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.3), gm); left.rotation.y = Math.PI / 2; left.position.set(-1.9, 1.3, 0); scene.add(left);
    const bench = box(2.3, 0.08, 0.5, '#7a5a3a'); bench.position.set(0, 0.5, 0.35); scene.add(bench);
    const benchBack = box(2.3, 0.4, 0.06, '#7a5a3a'); benchBack.position.set(0, 0.85, 0.08); scene.add(benchBack);
    for (const x of [-1.05, 1.05]) { const l = box(0.08, 0.5, 0.45, '#2d2f36'); l.position.set(x, 0.25, 0.35); scene.add(l); }
    const stopSign = sign('7', 0.5, 0.5, { bg: '#f2c230', fg: '#222', size: 0.8 }); stopSign.position.set(2.6, 2.4, 0.1); scene.add(stopSign);
    const stopPole = cyl(0.04, 0.04, 2.6, 5, '#555'); stopPole.position.set(2.6, 1.3, 0.1); scene.add(stopPole);
    const ad = sign('FRISCH\nGEZAPFT', 1.0, 1.5, { bg: '#e0524a', fg: '#fff', size: 0.5 }); ad.position.set(-1.45, 1.3, -0.96); scene.add(ad);
    // Rucksack, Pappbecher
    const bag = box(0.4, 0.5, 0.25, '#7b4b2a'); bag.position.set(-0.85, 0.3, 0.4); bag.rotation.y = 0.3; scene.add(bag);
    const bin = cyl(0.25, 0.22, 0.8, 6, '#3f6b4f'); bin.position.set(3.4, 0.4, 0.3); scene.add(bin);
    // Laternen + Autos
    lamp(scene, -4.5, -1.6, cfg, night); lamp(scene, 7.5, -1.6, cfg, false); lamp(scene, 14, -1.6, cfg, false);
    const cars = [
      { c: car('#c0392b'), z: -4.0, dir: 1, speed: 7, off: 0 }, { c: car('#2c6fbb'), z: -4.0, dir: 1, speed: 7, off: 28 },
      { c: car('#e8b830'), z: -8.2, dir: -1, speed: 6, off: 10 }, { c: car('#4a4f5c'), z: -8.2, dir: -1, speed: 6, off: 40 }
    ];
    cars.forEach((k) => { if (k.dir < 0) k.c.rotation.y = Math.PI; scene.add(k.c); });
    updaters.push((t) => cars.forEach((k) => { const L = 80; k.c.position.set(((k.off + t * k.speed * k.dir) % L + L) % L - L / 2, 0, k.z); }));
    if (env.weather === 'rain') updaters.push(rainSystem(scene, { x0: -16, x1: 16, z0: -12, z1: 12, h: 12 }, 900));
    if (night) { const pl = new THREE.PointLight('#ffcf8a', 60, 18, 1.5); pl.position.set(0, 2.3, 0.2); scene.add(pl); }
    const bw = box(0.0, 0, 0, '#000'); // placeholder to keep structure
  }

  if (env.type === 'street' || env.type === 'crossroads') {
    const wide = env.type === 'crossroads';
    setupLights(scene, cfg, { shadows: true, focus: [wide ? 0 : -1, 0, 1] });
    ground(-80, 80, -4, 6, '#a8aab2', 0.0);                                  // Gehweg
    ground(-80, 80, 6, 30, '#3b3d46', 0.0);                                  // Straße
    ground(-80, 80, -40, -4, wide ? '#7fae6a' : '#a8aab2', 0.0);
    for (let x = -70; x < 70; x += 2) { const t = box(1.98, 0.01, 10, (Math.floor(x / 2) % 2) ? '#9ea0a8' : '#a8aab2'); t.position.set(x + 1, 0.03, 1); t.visible = false; }
    if (env.type === 'street') {
      ground(-80, 80, -4, 7, '#a8aab2', 0.0);
      // Häuserzeile
      const shops = [
        { x: -9, w: 6, c: '#d9b99a', name: 'KIOSK', col: '#2f6f9f' },
        { x: -3.2, w: 5.6, c: '#e8cf9a', name: 'BÄCKEREI', col: '#b5651d', bakery: true },
        { x: 3.4, w: 6.4, c: '#b8c4a8', name: 'FRISEUR', col: '#5b5ea6' },
        { x: 10, w: 6.5, c: '#c9a7b0', name: 'APOTHEKE', col: '#2f8f5b' },
        { x: 16.6, w: 6.5, c: '#a8b8c9', name: 'CAFÉ', col: '#c44569' }
      ];
      shops.forEach((s, i) => {
        const h = 9 + (i % 3) * 3;
        building(scene, win, r, s.x, -6.2, s.w, h, 4.4, s.c, 1);
        const win2 = box(s.w * 0.7, 1.9, 0.1, '#bfe3f2', { roughness: 0.2 }); win2.position.set(s.x, 1.35, -3.97); scene.add(win2);
        const aw = box(s.w * 0.9, 0.16, 1.3, s.col); aw.position.set(s.x, 2.65, -3.4); aw.rotation.x = 0.16; scene.add(aw);
        const sg = sign(s.name, Math.min(4.2, s.w * 0.7), 0.6, { bg: s.col, fg: '#fff', size: 0.55 }); sg.position.set(s.x, 3.25, -3.98); scene.add(sg);
        if (s.bakery) {
          for (let k = 0; k < 6; k++) { const bread = ico(0.17, 0, '#c98a3a'); bread.scale.set(1.5, 0.8, 0.9); bread.position.set(s.x - 1.3 + k * 0.52, 0.95 + (k % 2) * 0.01, -3.7); scene.add(bread); }
          const shelf = box(3.4, 0.07, 0.6, '#6b4a2f'); shelf.position.set(s.x, 0.78, -3.7); scene.add(shelf);
        }
      });
      for (let x = -14; x < 24; x += 9) building(scene, win, r, x, -26, 8, 16 + r() * 14, 8, PALETTE[Math.floor(r() * PALETTE.length)], 1);
      lamp(scene, -6, 4.6, cfg); lamp(scene, 8, 4.6, cfg);
      const bench = box(1.8, 0.08, 0.5, '#7a5a3a'); bench.position.set(7.5, 0.5, 3.6); scene.add(bench);
    } else {
      // Weggabelung: links Henk, rechts Dilara, geradeaus der Park
      ground(-80, 80, -40, -9, '#7fae6a', 0.0);
      ground(-80, 80, -9, 40, '#a8aab2', 0.0);
      const path = box(3.2, 0.03, 30, '#c8b58a'); path.position.set(0, 0.05, -24); scene.add(path);
      for (let x = -30; x < 40; x += 10) building(scene, win, r, x, -16, 7 + r() * 2, 8 + r() * 6, 4, PALETTE[Math.floor(r() * PALETTE.length)], 1);
      building(scene, win, r, -4.5, 24, 8, 14, 5, '#bfb39a', -1); building(scene, win, r, 6, 24, 8, 12, 5, '#a9b5c4', -1);
      // Park (geradeaus)
      for (let i = 0; i < 9; i++) tree(scene, -9 + (i * 2.4) + r() * 0.6, -14 - r() * 6, r, 1 + r() * 0.5);
      const parkSign = sign('STADTPARK', 3.2, 0.7, { bg: '#2f8f5b', fg: '#fff', size: 0.55 }); parkSign.position.set(0, 3.0, -9.4); scene.add(parkSign);
      for (const x of [-1.2, 1.2]) { const p = cyl(0.06, 0.06, 3, 5, '#4b3a2a'); p.position.set(x, 1.5, -9.4); scene.add(p); }
      const bins = [[-1.8, -11], [1.8, -12.5]];
      bins.forEach(([x, z]) => { const b2 = cyl(0.3, 0.26, 0.9, 6, '#3f6b4f'); b2.position.set(x, 0.45, z); scene.add(b2); });
      const glints = [];
      for (let i = 0; i < 9; i++) {
        const bt = cyl(0.06, 0.07, 0.3, 6, i % 3 ? '#9ed6a8' : '#e8f4f0', { roughness: 0.3, emissive: '#bff0d0', emissiveIntensity: 0.25 });
        bt.position.set(-2.4 + r() * 4.8, 0.2, -10 - r() * 4); bt.rotation.z = (r() - 0.5) * 1.6; bt.rotation.y = r() * 3; scene.add(bt); glints.push(bt);
      }
      updaters.push((t) => glints.forEach((g, i) => { g.material = g.material; g.scale.setScalar(1 + 0.12 * Math.sin(t * 4 + i)); }));
      // Henk – Gebrauchtmarkt links
      const tbl = box(2.6, 0.08, 1.1, '#8b6b4a'); tbl.position.set(-4.6, 0.85, -1.4); scene.add(tbl);
      for (const [dx, dz] of [[-1.15, -0.45], [1.15, -0.45], [-1.15, 0.45], [1.15, 0.45]]) { const l = box(0.08, 0.85, 0.08, '#5a4630'); l.position.set(-4.6 + dx, 0.42, -1.4 + dz); scene.add(l); }
      const bikeG = new THREE.Group();
      const wheel = () => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 5, 14), mat('#1f2430')); w.castShadow = true; return w; };
      const w1 = wheel(); w1.position.set(-0.55, 0.45, 0); const w2 = wheel(); w2.position.set(0.55, 0.45, 0);
      const fr1 = cyl(0.03, 0.03, 1.05, 5, '#d1453b'); fr1.rotation.z = Math.PI / 2; fr1.position.set(0, 0.62, 0);
      const fr2 = cyl(0.03, 0.03, 0.7, 5, '#d1453b'); fr2.rotation.z = 0.5; fr2.position.set(-0.28, 0.62, 0);
      const fr3 = cyl(0.03, 0.03, 0.6, 5, '#d1453b'); fr3.rotation.z = -0.35; fr3.position.set(0.5, 0.75, 0);
      const seat = box(0.28, 0.06, 0.14, '#222'); seat.position.set(-0.45, 0.98, 0);
      const bar = box(0.05, 0.05, 0.5, '#222'); bar.position.set(0.62, 1.05, 0);
      bikeG.add(w1, w2, fr1, fr2, fr3, seat, bar); bikeG.position.set(-4.4, 0.89, -1.4); bikeG.scale.setScalar(0.62); bikeG.position.y = 0.92; scene.add(bikeG);
      const price = sign('10 €', 0.9, 0.5, { bg: '#fff6c9', fg: '#c0392b', size: 0.75 }); price.position.set(-4.6, 1.5, -0.7); scene.add(price);
      const hs = sign('HENKS TRÖDEL', 2.4, 0.5, { bg: '#5a4630', fg: '#fff', size: 0.6 }); hs.position.set(-4.6, 2.6, -1.8); scene.add(hs);
      const hp = [[-5.8, -1.8], [-3.4, -1.8]]; hp.forEach(([x, z]) => { const p = cyl(0.05, 0.05, 2.7, 5, '#5a4630'); p.position.set(x, 1.35, z); scene.add(p); });
      // Dilara – Dönerei rechts
      const stand = box(3.0, 1.0, 1.2, '#e8e2d0'); stand.position.set(4.2, 0.5, -2.0); scene.add(stand);
      const counter = box(3.2, 0.1, 1.4, '#6b6f78'); counter.position.set(4.2, 1.02, -2.0); scene.add(counter);
      const back = box(3.0, 2.2, 0.3, '#d9453a'); back.position.set(4.2, 1.2, -2.9); scene.add(back);
      const aw = box(3.4, 0.14, 1.9, '#d9453a'); aw.position.set(4.2, 2.45, -2.0); aw.rotation.x = -0.12; scene.add(aw);
      for (let i = 0; i < 6; i++) { const st = box(0.567, 0.15, 1.9, '#f4f1ea'); st.position.set(4.2 - 1.42 + i * 0.567 + 0.28, 2.455, -2.0); st.rotation.x = -0.12; if (i % 2) scene.add(st); }
      const spit = cyl(0.28, 0.2, 0.9, 7, '#8b5a2b'); spit.position.set(5.2, 1.6, -2.5); scene.add(spit);
      updaters.push((t) => { spit.rotation.y = t * 1.2; });
      const ds = sign('DÖNEREI\nDILARA', 2.6, 0.9, { bg: '#fff3d6', fg: '#d9453a', size: 0.7 }); ds.position.set(4.2, 3.05, -2.0); ds.rotation.x = 0; scene.add(ds);
      for (const x of [2.8, 5.6]) { const p = cyl(0.05, 0.05, 2.6, 5, '#d9d9d9'); p.position.set(x, 1.3, -1.1); scene.add(p); }
      const kg = [[-0.3, 0.6], [1.0, 0.6]];
      lamp(scene, -9, 4.6, cfg); lamp(scene, 10, 4.6, cfg);
      // Wegweiser
      const ws = sign('PARK ↑', 1.6, 0.5, { bg: '#2f8f5b', fg: '#fff', size: 0.6 }); ws.position.set(0, 0.5, -5.5); ws.visible = false; scene.add(ws);
    }
    // Passanten
    const ex = extras(scene, wide
      ? [{ x0: -14, x1: 14, z: -5.5, sp: 0.9 }, { x0: 14, x1: -14, z: -7, sp: 0.8 }]
      : [{ x0: -16, x1: 18, z: -2.3, sp: 0.8 }, { x0: 18, x1: -16, z: -1.5, sp: 0.7 }], r);
    updaters.push((t) => ex.forEach((e, i) => {
      const L = Math.abs(e.x1 - e.x0), dir = Math.sign(e.x1 - e.x0), d = ((t * e.sp + i * 6.7) % L);
      e.ch.position.set(e.x0 + dir * d, 0, e.z); e.ch.rotation.y = dir * Math.PI / 2;
      applyPose(e.ch.userData.J, poseFor('walk', t, t * e.sp));
    }));
  }

  if (env.type === 'recap') {
    scene.remove(dome);
    scene.background = new THREE.Color('#1c2342');
    scene.add(new THREE.HemisphereLight('#ffffff', '#445', 1.2));
    const d = new THREE.DirectionalLight('#ffdca8', 2.2); d.position.set(3, 5, 6); scene.add(d);
    const bits = [];
    for (let i = 0; i < 30; i++) {
      const m = ico(0.25 + r() * 0.5, 0, ['#e8742b', '#6f8aa6', '#f2c230', '#d9453a', '#3f8a4c'][i % 5]);
      m.position.set((r() - 0.5) * 10, (r() - 0.5) * 14, -4 - r() * 8); scene.add(m); bits.push(m);
    }
    updaters.push((t) => bits.forEach((m, i) => { m.rotation.set(t * 0.3 + i, t * 0.4 + i * 2, 0); m.position.y += 0; }));
    scene.fog = null;
  }

  finishWindows(scene, win, cfg);
  return { scene, update: (t) => updaters.forEach((u) => u(t)) };
}
