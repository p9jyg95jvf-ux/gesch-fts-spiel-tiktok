// Rendert eine Folge Bild für Bild (Chromium + WebGL) und setzt sie mit ffmpeg zusammen.
//   node render/render.js ep001                  → out/ep001.mp4
//   node render/render.js ep001 --frame 12.5     → out/preview/ep001_12.50.jpg (Einzelbild zum Prüfen)
//   node render/render.js ep001 --stills         → je ein Standbild pro Szene
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, loadState, resolveEpisode, validateEpisode, MIN_SECONDS, MAX_SECONDS } from '../engine/story.js';

const args = process.argv.slice(2);
const epId = args[0];
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const has = (n) => args.includes(n);
if (!epId) { console.error('Aufruf: node render/render.js <folge> [--frame SEK] [--stills] [--workers N] [--fps N]'); process.exit(2); }

const state = loadState();
const episode = resolveEpisode(epId, state);
const errors = validateEpisode(episode);
if (errors.length) { console.error('Folge ungültig:\n - ' + errors.join('\n - ')); process.exit(1); }
const fps = Number(flag('--fps') ?? episode.fps ?? 30);
const workers = Number(flag('--workers') ?? 3);
const outDir = join(ROOT, 'out');
mkdirSync(outDir, { recursive: true });

function executablePath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of ['/opt/pw-browsers/chromium']) if (existsSync(p)) return p;
  return undefined; // Playwright-Standard (CI: `npx playwright install chromium`)
}

const browser = await chromium.launch({
  executablePath: executablePath(),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none']
});

async function openPage() {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.error('Seitenfehler:', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') console.error('Konsole:', m.text()); });
  await page.goto(pathToFileURL(join(ROOT, 'render', 'index.html')).href);
  const dur = await page.evaluate(async (ep) => window.milo.load(ep), episode);
  return { page, dur };
}

async function shot(page, t, file, quality = 92) {
  await page.evaluate((tt) => window.milo.renderAt(tt), t);
  await page.screenshot({ path: file, type: 'jpeg', quality });
}

try {
  if (has('--frame') || has('--stills')) {
    const prev = join(outDir, 'preview'); mkdirSync(prev, { recursive: true });
    const { page } = await openPage();
    const times = has('--frame') ? flag('--frame').split(',').map(Number) : (() => { let s = 0; const a = []; for (const sc of episode.scenes) { a.push(s + sc.duration * 0.55); s += sc.duration; } return a; })();
    for (const t of times) { const f = join(prev, `${epId}_${t.toFixed(2)}.jpg`); await shot(page, t, f); console.log(f); }
  } else {
    const frames = Math.round(episode.duration * fps);
    const dir = join(outDir, 'frames', epId);
    // --range A,B: nur diese Sekunden neu rendern (vorhandene Bilder bleiben), danach alles zusammensetzen
    const range = flag('--range')?.split(',').map(Number);
    if (!range) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const first = range ? Math.floor(range[0] * fps) : 0, last = range ? Math.min(frames, Math.ceil(range[1] * fps)) : frames;
    console.log(`${epId}: ${episode.duration}s, ${frames} Bilder @ ${fps} fps, ${workers} Worker`);
    const pages = await Promise.all(Array.from({ length: workers }, () => openPage()));
    let next = first, done = 0; const t0 = Date.now();
    await Promise.all(pages.map(async ({ page }) => {
      for (;;) {
        const i = next++; if (i >= last) return;
        await shot(page, i / fps, join(dir, `${String(i).padStart(5, '0')}.jpg`), 93);
        if (++done % 60 === 0) { const el = (Date.now() - t0) / 1000; console.log(`  ${done}/${last - first}  (${(done / el).toFixed(1)} Bilder/s, noch ~${Math.round((last - first - done) / (done / el))}s)`); }
      }
    }));
    // Audio erzeugen
    const wav = join(outDir, `${epId}.wav`);
    const au = spawnSync('node', [join(ROOT, 'render', 'audio.js'), epId, wav], { stdio: 'inherit' });
    const haveAudio = au.status === 0 && existsSync(wav);
    const mp4 = join(outDir, `${epId}.mp4`);
    const ff = ['-y', '-framerate', String(fps), '-i', join(dir, '%05d.jpg'), ...(haveAudio ? ['-i', wav] : []),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
      ...(haveAudio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []), mp4];
    const r = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('ffmpeg fehlgeschlagen');
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).stdout.toString().trim();
    const len = Number(probe);
    console.log(`Fertig: ${mp4} (${len.toFixed(2)} s)`);
    if (len < MIN_SECONDS || len > MAX_SECONDS) { console.error(`LÄNGE ${len}s außerhalb ${MIN_SECONDS}–${MAX_SECONDS}s!`); process.exitCode = 1; }
  }
} finally {
  await browser.close();
}
