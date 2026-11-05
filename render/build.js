// Bündelt den Renderer (Three.js + Szenencode) zu render/dist/bundle.js und kopiert die Schriften.
import { build } from 'esbuild';
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
mkdirSync(join(here, 'dist', 'fonts'), { recursive: true });
await build({ entryPoints: [join(here, 'src', 'main.js')], bundle: true, outfile: join(here, 'dist', 'bundle.js'), format: 'iife', minify: true, target: 'chrome110' });
for (const w of ['500', '700', '800']) {
  copyFileSync(join(root, 'node_modules', '@fontsource', 'inter', 'files', `inter-latin-${w}-normal.woff2`), join(here, 'dist', 'fonts', `inter-${w}.woff2`));
}
console.log('Renderer gebaut.');
