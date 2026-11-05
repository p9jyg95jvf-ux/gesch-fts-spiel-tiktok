import { clamp, lerp, smooth, easeOutBack } from './util.js';

const el = (cls, parent, text = '') => { const d = document.createElement('div'); d.className = cls; if (text) d.textContent = text; parent.appendChild(d); return d; };
const COLORS = { A: '#ff8a3d', B: '#1fc9a6', C: '#8b6bff' };
const SPEAKER = { Milo: '#e8742b', Bruno: '#555b6e', Dilara: '#d9453a', Henk: '#6a7a52' };

/** Fenster-Funktion: Einblenden, Halten, Ausblenden. Liefert { a: Deckkraft, k: Pop-Faktor }. */
function win(t, t0, d, fin = 0.22, fout = 0.2) {
  if (t < t0 || t > t0 + d) return { a: 0, k: 0 };
  const a = Math.min(smooth((t - t0) / fin), 1 - smooth((t - (t0 + d - fout)) / fout));
  return { a: clamp(a), k: easeOutBack((t - t0) / (fin * 1.6)) };
}
const fmtEuro = (v) => `${Math.round(v).toLocaleString('de-DE')} €`;

export function createOverlay(root, episode) {
  const ui = el('ui', root);
  const timeline = []; let start = 0;
  for (const sc of episode.scenes) { timeline.push({ sc, start, end: start + sc.duration }); start += sc.duration; }
  const total = start;

  // --- HUD ---
  const hud = el('hud', ui);
  const chips = {};
  for (const [k, label] of [['money', 'GELD'], ['energy', 'ENERGIE'], ['debt', 'SCHULDEN'], ['reputation', 'RUF']]) {
    const c = el(`chip chip-${k}`, hud); el('chip-label', c, label); chips[k] = el('chip-value', c, '');
  }
  const hudScenes = timeline.filter((s) => s.sc.hud);
  const fmt = { money: fmtEuro, energy: (v) => `${Math.round(v)} %`, debt: fmtEuro, reputation: (v) => `${Math.round(v)}` };

  // --- Titel ---
  const title = el('title', ui);
  const tMain = el('title-main', title), tSub = el('title-sub', title), tTag = el('title-tag', title);

  // --- Untertitel / Sprechblasen ---
  const caps = [];
  for (const s of timeline) for (const c of s.sc.captions ?? []) {
    const e = el(`cap cap-${c.kind}`, ui);
    if (c.kind === 'speech') {
      const n = el('speaker', e, c.who); n.style.background = SPEAKER[c.who] ?? '#444';
      el('speech-text', e, c.text); el('tail', e);
    } else e.textContent = c.text;
    caps.push({ e, t0: s.start + c.t, d: c.d, kind: c.kind });
  }

  // --- Abstimmung ---
  const vote = el('vote', ui);
  const voteBox = el('vote-box', vote);
  el('vote-pill', voteBox, 'ABSTIMMUNG');
  el('vote-q', voteBox, episode.choice.question);
  const cards = episode.choice.options.map((o) => {
    const c = el('vcard', voteBox); c.style.setProperty('--c', COLORS[o.key] ?? '#fff');
    el('vkey', c, o.key); const tx = el('vtext', c); el('vlabel', tx, o.label); el('vsub', tx, o.sub); return c;
  });
  const cta = el('cta', voteBox, episode.choice.cta);
  const voteScene = timeline.find((s) => s.sc.vote);

  // --- Rückblick ---
  const recap = el('recap', ui);
  const rBox = el('recap-box', recap);
  const rTag = el('recap-tag', rBox, 'BISHER');
  const rText = el('recap-text', rBox);
  const rTag2 = el('recap-tag recap-tag2', rBox, 'IHR HABT ENTSCHIEDEN');
  const rDec = el('recap-dec', rBox);
  const recapScene = timeline.find((s) => s.sc.recap);
  if (recapScene) { rText.textContent = recapScene.sc.recap.summary; rDec.textContent = recapScene.sc.recap.decision; }

  const fade = el('fade', ui);

  function update(t) {
    // HUD
    const hs = hudScenes.find((s) => t >= s.start && t < s.end);
    if (hs) {
      const idx = hudScenes.indexOf(hs);
      const from = hs.sc.hud.from ?? 0;
      const tl = t - hs.start;
      const show = win(tl, from, hs.sc.duration - from + 5, 0.4, 0.01);
      hud.style.opacity = show.a;
      hud.style.transform = `translateY(${(1 - show.k) * -40}px)`;
      const prevV = idx > 0 ? hudScenes[idx - 1].sc.hud.values : hs.sc.hud.values;
      const k = idx > 0 ? smooth(tl / 1.0) : 1;
      for (const key of Object.keys(chips)) {
        const v = lerp(prevV[key], hs.sc.hud.values[key], k);
        chips[key].textContent = fmt[key](v);
        chips[key].parentElement.classList.toggle('changing', k > 0 && k < 1 && prevV[key] !== hs.sc.hud.values[key]);
      }
    } else hud.style.opacity = 0;

    // Titel
    const ts = timeline.find((s) => s.sc.title && t >= s.start && t < s.end);
    if (ts) {
      const T = ts.sc.title; const w = win(t - ts.start, T.t, T.d, 0.35, 0.3);
      title.style.opacity = w.a;
      title.style.transform = `scale(${0.7 + 0.3 * w.k}) rotate(${(1 - w.k) * -6}deg)`;
      tMain.textContent = T.main; tSub.textContent = T.sub; tTag.textContent = T.tag;
    } else title.style.opacity = 0;

    // Untertitel
    for (const c of caps) {
      const w = win(t, c.t0, c.d, c.kind === 'alert' ? 0.15 : 0.22, 0.18);
      c.e.style.opacity = w.a;
      const sc = c.kind === 'alert' ? 0.6 + 0.4 * w.k : 0.92 + 0.08 * w.k;
      c.e.style.transform = c.kind === 'alert' ? `translate(-50%, -50%) scale(${sc}) rotate(-4deg)` : `translateX(-50%) translateY(${(1 - w.k) * 24}px) scale(${sc})`;
    }

    // Abstimmung
    if (voteScene) {
      const tl = t - voteScene.start; const T0 = voteScene.sc.vote.t;
      const w = win(tl, T0, voteScene.sc.duration - T0 + 5, 0.4, 0.01);
      vote.style.opacity = w.a;
      voteBox.style.transform = `translateY(${(1 - w.k) * 60}px)`;
      cards.forEach((c, i) => {
        const cw = win(tl, T0 + 0.7 + i * 0.45, 99, 0.35, 0.01);
        c.style.opacity = cw.a; c.style.transform = `translateX(${(1 - cw.k) * 120}px) scale(${0.9 + 0.1 * cw.k})`;
      });
      const cw = win(tl, T0 + 2.4, 99, 0.4, 0.01);
      const pulse = 1 + Math.sin(tl * 5) * 0.025;
      cta.style.opacity = cw.a; cta.style.transform = `scale(${(0.9 + 0.1 * cw.k) * pulse})`;
    }

    // Rückblick
    if (recapScene) {
      const tl = t - recapScene.start; const D = recapScene.sc.duration;
      const w = win(tl, 0, D, 0.4, 0.3);
      recap.style.opacity = w.a;
      const part = (e, t0) => { const p = win(tl, t0, 99, 0.35, 0.01); e.style.opacity = p.a; e.style.transform = `translateY(${(1 - p.k) * 36}px)`; };
      part(rTag, 0.1); part(rText, 0.4); part(rTag2, 4.3); part(rDec, 4.6);
    }

    // Szenenübergang (kurzer Schwarzblitz)
    const cur = timeline.find((s) => t >= s.start && t < s.end) ?? timeline.at(-1);
    const idx = timeline.indexOf(cur);
    let f = 0;
    if (idx > 0) f = Math.max(f, 1 - smooth((t - cur.start) / 0.28));
    if (idx < timeline.length - 1) f = Math.max(f, smooth((t - (cur.end - 0.22)) / 0.22));
    fade.style.opacity = f;
  }
  return { update, total };
}
