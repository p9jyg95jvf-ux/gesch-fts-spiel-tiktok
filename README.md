# MILO – VON NULL

TikTok-Mitmach-Serie: Ein Low-Poly-Mensch ist pleite und arbeitet sich hoch. Nach jeder Folge
stimmt die Community in den Kommentaren ab, was als Nächstes passiert.

- **Länge:** jede Folge 61–70 Sekunden (wird beim Rendern hart geprüft)
- **Format:** 1080×1920 (9:16), 30 fps, mit Musik und Geräuschen
- **Story:** siehe [`story/bible.md`](story/bible.md)

## Ablauf pro Folge

1. **Video rendern** – `npm run render -- ep001` → `out/ep001.mp4`
2. **Auf TikTok posten**, Abstimmung läuft in den Kommentaren (A / B / C)
3. **Ergebnis eintragen** – `npm run vote -- ep001 --votes A=12,B=40,C=7` (oder direkt `npm run vote -- ep001 B`)
   Das aktualisiert `state/state.json` (Geld, Energie, Schulden, Ruf, Beziehungen).
4. **Nächste Folge schreiben** – `story/episodes/ep002.json`. Der **Rückblick** („Bisher … / Du hast entschieden …“)
   wird automatisch aus der Abstimmung vorangestellt (7 s, in die Gesamtlänge eingerechnet).
5. Wieder bei 1.

## Einrichtung

```bash
npm install
npm run build:render     # bündelt den 3D-Renderer
npm test                 # Engine-Tests
npm run validate         # prüft Länge und Pflichtfelder aller Folgen
```

Benötigt Node 22, ffmpeg und Chromium (lokal per `CHROMIUM_PATH=/pfad/zu/chromium` oder `npx playwright-core install chromium`).

Vorschaubilder statt ganzes Video: `node render/render.js ep001 --stills` oder `--frame 12.5`.

## Auf GitHub rendern

Actions → „Folge rendern“ → *Run workflow* → Folge eingeben. Das fertige MP4 liegt danach als Artefakt am Lauf.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `story/` | Story-Bibel, Startzustand, Folgen als JSON (`episodes/`) |
| `engine/` | Spielstand, Abstimmung, Rückblick, Längenprüfung |
| `render/` | Three.js-Szenen, Figuren, Overlays, Audio-Synthese, Render-Skript |
| `state/` | aktueller Spielstand (`state.json`) |
| `test/` | Tests |

## Eine neue Folge schreiben

Kopiere `story/episodes/ep001.json` als Vorlage. Eine Folge besteht aus Szenen (Umgebung, Kamera, Figuren-Tracks,
Untertitel/Sprechblasen, HUD) und endet in einer Abstimmungsszene (`"vote"`) mit `choice` (3 Optionen mit `effects`
und `recap`). Verfügbare Umgebungen: `shelter`, `street`, `crossroads`, `recap`. Animationen: `idle`, `walk`, `sleep`,
`wake`, `hungry`, `talk`, `wave`, `think`. Neue Umgebungen und Figuren kommen in `render/src/world.js` bzw. `character.js`.
