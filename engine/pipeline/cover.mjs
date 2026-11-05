// Arc Lab pipeline: COVER OPTIONS for the publishing pack. Renders chosen frames at full quality through the look
// engine (no captions), adds the cover title, and shows how each crops on the profile grid (3:4) and in the feed.
//
//   node <engine>/pipeline/cover.mjs --ep ep01 --frames 75,345,760 --title "THE LIGHT WENT OUT" [--kicker "PIP OF GULL ROCK · EP 1"]
//        [--pill "EP 1"] [--y 330]  -> <ep>/publish/cover_A.png, cover_B.png ... + covers_sheet.jpg
//
// Cover rules: SPOILER-FREE (nothing that happens after the first third, no twist, no answer, no vote numbers), the
// hero's face big and readable at phone-grid size, the title in the top third (the grid crops to 3:4 around the
// middle, so keep everything important inside y 240-1680; text inside x 100-980, docs/SAFE_ZONE.md), the same title
// style every episode. Check a cover with `arclab.py safezone publish/cover_A.png`.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const EP = path.resolve(opt('ep', '.'));
const CFG = JSON.parse(fs.readFileSync(path.join(EP, 'episode.json'), 'utf8'));
const L = await import(pathToFileURL(path.join(ENGINE, 'lib.mjs')).href);
const core = await import(pathToFileURL(path.join(ENGINE, 'look', 'core.mjs')).href);
const { renderFrame } = await import(pathToFileURL(path.join(ENGINE, 'look', 'render.mjs')).href);
const grade = await import(pathToFileURL(path.join(ENGINE, 'look', 'grade.mjs')).href);
grade.setChapters(CFG.grade); core.setSS(2);
const frames = (opt('frames') || '').split(',').filter(Boolean).map(Number);
if (!frames.length) { console.error('need --frames f1,f2,...'); process.exit(1); }
const title = (opt('title') || CFG.title || '').toUpperCase(), kicker = (opt('kicker') || `${CFG.series || ''} · EP ${CFG.episode || 1}`).toUpperCase(), pill = opt('pill', `EP ${CFG.episode || 1}`);
const Y = +opt('y', 330);
const out = path.join(EP, 'publish'); fs.mkdirSync(out, { recursive: true });
const W = 1080, H = 1920;

function fit(x, s, size, maxW) { for (let k = size; k > 40; k -= 2) { x.font = `bold ${k}px Oswald`; if (x.measureText(s).width <= maxW) return k; } return 40; }
function words(x, text, cx, y, size, col) {
  x.font = `bold ${size}px Oswald`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.lineJoin = 'round'; x.lineWidth = size * 0.2; x.strokeStyle = '#000'; x.strokeText(text, cx, y); x.fillStyle = col; x.fillText(text, cx, y);
}
const done = [];
for (const [i, f] of frames.entries()) {
  const seg = Object.entries(CFG.segments || {}).find(([, v]) => f >= v.range[0] && f <= v.range[1]);
  if (!seg) { console.error(`frame ${f} is in no segment`); continue; }
  const mod = await import(pathToFileURL(path.resolve(EP, seg[1].shots)).href);
  if (mod.init) await mod.init();
  const r = renderFrame(mod.SHOTS, f, {});
  const c = L.createCanvas(W, H), x = c.getContext('2d'), id = x.createImageData(W, H);
  for (let p = 0, q = 0; p < W * H * 3; p += 3, q += 4) { id.data[q] = r.bytes[p]; id.data[q + 1] = r.bytes[p + 1]; id.data[q + 2] = r.bytes[p + 2]; id.data[q + 3] = 255; }
  x.putImageData(id, 0, 0);
  // a soft dark band behind the title so it reads on any picture
  const g = x.createLinearGradient(0, Y - 140, 0, Y + 360); g.addColorStop(0, 'rgba(6,8,16,0)'); g.addColorStop(0.35, 'rgba(6,8,16,0.55)'); g.addColorStop(0.75, 'rgba(6,8,16,0.4)'); g.addColorStop(1, 'rgba(6,8,16,0)');
  x.fillStyle = g; x.fillRect(0, Y - 140, W, 500);
  words(x, kicker, 540, Y, fit(x, kicker, 44, 560), '#C9CFD9');   // x 260-820: clear of the pill
  const parts = title.split('|'), size = Math.min(...parts.map((p) => fit(x, p, 150, 820)));
  parts.forEach((p, k) => words(x, p, 540, Y + 30 + size * 0.95 * (k + 1), size, k === parts.length - 1 ? '#FFD84A' : '#FFFFFF'));
  if (pill) { x.font = 'bold 40px Oswald'; const pw = x.measureText(pill).width + 44; x.fillStyle = '#D8382E'; x.beginPath(); x.roundRect(940 - pw, 272, pw, 62, 31); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(pill, 940 - pw / 2, 317); }   // below the app header (y 270)
  const name = `cover_${String.fromCharCode(65 + i)}.png`;
  fs.writeFileSync(path.join(out, name), c.toBuffer('image/png'));
  done.push({ name, f, c });
  console.log('cover', name, `frame ${f} (${r.shot.id})`);
}
// the sheet: each cover full, plus its 3:4 grid crop at phone-grid size
const tw = 360, th = 640, gw = 240, gh = 320, sheet = L.createCanvas(done.length * (tw + gw + 60) + 40, th + 120), s = sheet.getContext('2d');
s.fillStyle = '#16181E'; s.fillRect(0, 0, sheet.width, sheet.height);
done.forEach((d, i) => {
  const x0 = 40 + i * (tw + gw + 60);
  s.drawImage(d.c, x0, 60, tw, th);
  s.drawImage(d.c, 0, (H - 1440) / 2, W, 1440, x0 + tw + 20, 60, gw, gh);
  s.fillStyle = '#C9CFD9'; s.font = 'bold 26px Oswald'; s.fillText(`${d.name.replace('.png', '')} · frame ${d.f}`, x0, 42); s.fillText('grid (3:4)', x0 + tw + 20, 60 + gh + 34);
});
fs.writeFileSync(path.join(out, 'covers_sheet.jpg'), sheet.toBuffer('image/jpeg', 88));
console.log('sheet', path.join(out, 'covers_sheet.jpg'));
