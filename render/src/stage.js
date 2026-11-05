import * as THREE from 'three';
import { buildEnv } from './world.js';
import { buildCharacter, PRESETS, applyPose, poseFor, blendPose } from './character.js';
import { lerp, smooth, clamp } from './util.js';

const BLEND = 0.3;
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

/** Position eines Segments zum Zeitpunkt tl (ohne faceTo-Auflösung). */
function segPos(seg, tl) {
  if (seg.from && seg.to) {
    const k = clamp(tl / seg.d);
    return { x: lerp(seg.from[0], seg.to[0], k), z: lerp(seg.from[1], seg.to[1], k), dist: Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]) * k };
  }
  return { x: seg.at[0], z: seg.at[1], dist: 0 };
}

function segAt(track, tl) {
  let idx = 0;
  for (let i = 0; i < track.length; i++) if (tl >= track[i].t - 1e-9) idx = i;
  return idx;
}

function posOf(actorDef, tl) {
  const i = segAt(actorDef.track, tl);
  const seg = actorDef.track[i];
  return segPos(seg, clamp(tl - seg.t, 0, seg.d));
}

function yawOf(actorDef, i, tl, others) {
  const seg = actorDef.track[i];
  const local = clamp(tl - seg.t, 0, seg.d);
  if (seg.from && seg.to) return Math.atan2(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]);
  if (seg.faceTo) {
    const o = others[seg.faceTo];
    const me = segPos(seg, local);
    if (o) { const op = posOf(o, tl); return Math.atan2(op.x - me.x, op.z - me.z); }
  }
  return ((seg.face ?? 0) * Math.PI) / 180;
}

export function createStage(episode, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1080, 1920, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const camera = new THREE.PerspectiveCamera(56, 1080 / 1920, 0.1, 400);

  let start = 0;
  const scenes = episode.scenes.map((sc, i) => {
    const env = buildEnv(sc.env, 1000 + i * 17);
    const actors = {};
    const byId = {};
    for (const a of sc.actors ?? []) {
      const preset = PRESETS[a.preset];
      const obj = buildCharacter(preset);
      env.scene.add(obj);
      byId[a.id] = a;
      actors[a.id] = { def: a, obj, preset };
    }
    const s = { sc, env, actors, byId, start, end: start + sc.duration };
    start += sc.duration;
    return s;
  });

  function actorState(S, A, tl) {
    const track = A.def.track;
    const i = segAt(track, tl);
    const seg = track[i];
    const local = clamp(tl - seg.t, 0, seg.d);
    const p = segPos(seg, local);
    let q = poseFor(seg.anim, local, p.dist, !!seg.sit);
    let yaw = yawOf(A.def, i, tl, S.byId);
    let x = p.x, z = p.z;
    if (i > 0 && local < BLEND) {
      const prev = track[i - 1];
      const pp = segPos(prev, prev.d);
      const pq = poseFor(prev.anim, prev.d, pp.dist, !!prev.sit);
      const k = smooth(local / BLEND);
      q = blendPose(pq, q, k);
      yaw = yaw - angDiff(yaw, yawOf(A.def, i - 1, prev.t + prev.d, S.byId)) * 0 ;
      const pyaw = yawOf(A.def, i - 1, prev.t + prev.d, S.byId);
      yaw = pyaw + angDiff(pyaw, yaw) * k;
      x = lerp(pp.x, x, k); z = lerp(pp.z, z, k);
    }
    return { x, z, yaw, q, anim: seg.anim };
  }

  function cameraAt(keys, tl) {
    let a = keys[0], b = keys[0], k = 0;
    for (let i = 0; i < keys.length; i++) if (tl >= keys[i].t) { a = keys[i]; b = keys[Math.min(i + 1, keys.length - 1)]; }
    if (b !== a) k = smooth((tl - a.t) / (b.t - a.t));
    const pos = a.pos.map((v, i) => lerp(v, b.pos[i], k));
    const look = a.look.map((v, i) => lerp(v, b.look[i], k));
    return { pos, look };
  }

  const zz = [];
  function renderAt(t) {
    t = clamp(t, 0, scenes.at(-1).end - 1e-6);
    const S = scenes.find((s) => t >= s.start && t < s.end) ?? scenes.at(-1);
    const tl = t - S.start;
    S.env.update(t);
    for (const A of Object.values(S.actors)) {
      const st = actorState(S, A, tl);
      A.obj.position.set(st.x, 0, st.z);
      A.obj.rotation.y = st.yaw;
      applyPose(A.obj.userData.J, st.q);
      A.obj.userData.zzz = st.q.zzz;
    }
    const { pos, look } = cameraAt(S.sc.camera, tl);
    const fov = S.sc.fov ?? 56;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    const sway = 0.012;
    camera.position.set(pos[0] + Math.sin(t * 0.9) * sway, pos[1] + Math.sin(t * 1.3 + 1) * sway, pos[2] + Math.cos(t * 0.7) * sway);
    camera.lookAt(look[0], look[1], look[2]);
    renderer.render(S.env.scene, camera);
    return { scene: S.sc, tl, index: scenes.indexOf(S) };
  }

  return { renderAt, scenes, renderer };
}
