"""Arc Lab pipeline: ElevenLabs text-to-speech WITH character timestamps, cached, plus voice listing and speech-to-text.

Every take is cached in <series>/.cache/eleven by (voice, model, settings, text, context), so re-running the voice step
costs no credits unless a line changed. The key is the buyer's own (common.env_key) and is never printed.
"""
import base64
import hashlib
import json
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1"


def _req(url, key, body=None, method="GET", timeout=240):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        msg = e.read()[:400].decode(errors="replace")
        raise RuntimeError(f"ElevenLabs HTTP {e.code}: {msg}") from None


def _body(text, model, speed, stability, similarity, style, prev, nxt, seed):
    b = {"text": text, "model_id": model,
         "voice_settings": {"stability": stability, "similarity_boost": similarity, "style": style, "use_speaker_boost": True, "speed": speed}}
    if prev:
        b["previous_text"] = prev
    if nxt:
        b["next_text"] = nxt
    if seed is not None:
        b["seed"] = seed
    return b


def tag(voice, body):
    return hashlib.sha1(json.dumps([voice, body], sort_keys=True).encode()).hexdigest()[:16]


def cached(cache, voice, **kw):
    t = tag(voice, _body(**kw))
    return (Path(cache) / f"{t}.mp3").exists() and (Path(cache) / f"{t}.json").exists()


def tts_ts(cache, key, voice, text, model="eleven_multilingual_v2", speed=1.0, stability=0.45, similarity=0.8, style=0.2,
           prev=None, nxt=None, seed=None):
    """-> (mp3 path, alignment {characters, character_start_times_seconds, character_end_times_seconds}). Cached."""
    body = _body(text, model, speed, stability, similarity, style, prev, nxt, seed)
    t = tag(voice, body)
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    mp3, js = cache / f"{t}.mp3", cache / f"{t}.json"
    if mp3.exists() and js.exists():
        return mp3, json.loads(js.read_text("utf-8"))["alignment"]
    res = _req(f"{API}/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128", key(), body, "POST")
    mp3.write_bytes(base64.b64decode(res["audio_base64"]))
    al = res.get("alignment") or res.get("normalized_alignment")
    js.write_text(json.dumps({"text": text, "voice": voice, "alignment": al}), encoding="utf-8")
    return mp3, al


def voices(key):
    """the voices this key can use: [{voice_id, name, category, labels}]"""
    j = _req(f"{API}/voices", key)
    return [{"voice_id": v["voice_id"], "name": v.get("name"), "category": v.get("category"), "labels": v.get("labels") or {}}
            for v in j.get("voices", [])]


def stt(key, path, model="scribe_v1"):
    """speech-to-text with word timings (multipart upload, needs `requests`)"""
    import requests
    with open(path, "rb") as f:
        r = requests.post(f"{API}/speech-to-text", headers={"xi-api-key": key},
                          data={"model_id": model, "tag_audio_events": "false", "diarize": "false"},
                          files={"file": (Path(path).name, f)}, timeout=300)
    if r.status_code != 200:
        raise RuntimeError(f"ElevenLabs STT HTTP {r.status_code}: {r.text[:300]}")
    return r.json()
