#!/usr/bin/env bash
# Installiert Piper (offline Text-to-Speech) und lädt die deutschen Stimmen nach ./voices
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .venv-tts
.venv-tts/bin/pip install -q piper-tts
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE
mkdir -p voices
for v in thorsten/medium/de_DE-thorsten-medium karlsson/low/de_DE-karlsson-low kerstin/low/de_DE-kerstin-low; do
  f=voices/$(basename "$v")
  [ -f "$f.onnx" ] || curl -sSL --fail -o "$f.onnx" "$BASE/$v.onnx"
  [ -f "$f.onnx.json" ] || curl -sSL --fail -o "$f.onnx.json" "$BASE/$v.onnx.json"
done
echo "TTS bereit: $(ls voices/*.onnx | wc -l) Stimmen"
