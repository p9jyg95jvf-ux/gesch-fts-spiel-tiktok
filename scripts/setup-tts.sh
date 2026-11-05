#!/usr/bin/env bash
# Installiert Piper (offline Text-to-Speech) und lädt die deutschen Stimmen nach ./voices
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .venv-tts
.venv-tts/bin/pip install -q piper-tts
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE
mkdir -p voices
for v in thorsten/high/de_DE-thorsten-high thorsten_emotional/medium/de_DE-thorsten_emotional-medium; do
  f=voices/$(basename "$v")
  [ -f "$f.onnx" ] || curl -sSL --fail -o "$f.onnx" "$BASE/$v.onnx"
  [ -f "$f.onnx.json" ] || curl -sSL --fail -o "$f.onnx.json" "$BASE/$v.onnx.json"
done
echo "TTS bereit: $(ls voices/*.onnx | wc -l) Stimmen"
