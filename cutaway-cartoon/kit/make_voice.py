"""Generate the whole narration with Gemini TTS in ONE request (free tier: about 10 requests/day).

Usage:  python kit/make_voice.py <lines.json> <out.wav>
        e.g. kit/make_voice.py story01/lines.th.json story01/audio/th/narration-raw.wav
Paths are relative to the project folder (the parent of kit/). Reads GEMINI_API_KEY from the
nearest .env at or above the project folder; the key is never printed. A <long pause> is added
after every line so the recording can be cut apart by silence afterwards.

lines.json:  {"voices": {"Narrator": "Charon"},
              "styles": {"Narrator": "a warm, curious documentary narrator, speaking Thai"},
              "lines": [{"speaker": "Narrator", "text": "...", "style": "opening hook, quietly amazed"}]}
The service insists on exactly two voices, so a silent second speaker is added when the
script has one.
"""
import base64, io, json, os, sys, urllib.request, urllib.error, wave

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = "gemini-3.8-flash-tts"


def load_key():
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"]
    d = ROOT
    while True:
        env = os.path.join(d, ".env")
        if os.path.exists(env):
            for line in open(env, encoding="utf-8-sig"):
                line = line.strip()
                if line.startswith("GEMINI_API_KEY"):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
        if os.path.dirname(d) == d:
            sys.exit("GEMINI_API_KEY not found in the environment or in a .env file")
        d = os.path.dirname(d)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    spec = json.load(open(os.path.join(ROOT, sys.argv[1]), encoding="utf-8"))
    out = os.path.join(ROOT, sys.argv[2])
    if len(spec["voices"]) == 1:
        spec["voices"]["Unused"] = "Kore"
    body = {
        "model": MODEL,
        "input": [{"type": "user_input", "content": [
            {"type": "text", "text": ln["text"] + " <long pause>",
             "annotations": [{"type": "speech_metadata", "speaker": ln["speaker"],
                              "style": spec["styles"][ln["speaker"]] + ", " + ln["style"]}]}
            for ln in spec["lines"]]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": {
            "speakers": [{"speaker": s, "voice": v} for s, v in spec["voices"].items()]}},
    }
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        data=json.dumps(body).encode(),
        headers={"x-goog-api-key": load_key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit("TTS_FAILED %s %s" % (e.code, e.read().decode("utf-8", "replace")[:800]))
    audio = [c for s in d.get("steps", []) if s.get("type") == "model_output"
             for c in s.get("content", []) if c.get("type") == "audio"]
    if not audio:
        sys.exit("NO_AUDIO " + json.dumps(d, ensure_ascii=False)[:800])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(base64.b64decode(audio[-1]["data"]))
    w = wave.open(out)
    print("saved", out, "| seconds", round(w.getnframes() / w.getframerate(), 2))


if __name__ == "__main__":
    main()
