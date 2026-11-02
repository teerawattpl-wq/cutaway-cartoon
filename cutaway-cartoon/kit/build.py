"""Build one language of one story: timeline from the real narration, soundtrack, and the page.

Usage (from the project folder):
    python kit/build.py <story folder> <lang>          e.g.  python kit/build.py story01 th

Reads   <story>/story.json                  size, scripts, phrase cues, marks (see below)
        <story>/audio/<lang>/lines/NN.wav   one file per narration line, in order
        <story>/*.js                        the story's own drawings and film.js (render(t))
        <story>/events.js                   optional: storyEvents(T), the list of moments that film and sound share
        <story>/sound.py                    optional: cues(T, S, p) and music(T, S)
        kit/                                page.html, kit.js, host.js, synth.py, fonts/
        narrator/                           optional: poses.js and pictures from prep_narrator.py
Writes  <story>/build/<lang>/               index.html, timings.js, the .js files, fonts/,
                                            assets/narrator/, audio/mix.wav, audio/mix-final.wav

The timeline is laid out from the length of each narration line, after long pauses inside a
line have been shortened. A new voice take therefore only needs this script run again; the
film reads every time from timings.js (window.T) and moves with it.

window.T holds, in seconds from the start of the film:
    l1, l2, ...   start of each line          e1, e2, ...   end of each line
    p1, p2, ...   list: start of each phrase inside the line
    <mark>        any named moment from story.json
    dur, lang, mouth (one "0"/"1" per 1/15 s: is the narrator's mouth open), mouthFps

story.json:
    {"title": "...", "size": [1080, 1920], "scripts": ["subject.js", "film.js"],
     "lead": 0.4, "gap": 0.3, "keep": 0.3, "tail": 3.2,
     "phrases": {"en": {"1": [0, 3.22, 6.80]}},
     "marks": {"th": {"reveal": {"line": 7, "phrase": 1, "plus": 2.2}},
               "en": {"reveal": {"line": 7, "raw": 7.09}}}}
  phrases  By default a phrase starts after every pause the voice made. When a language
           pauses in the wrong places, list the phrase starts yourself, in seconds from the
           start of that line's file (take them from words.py).
  marks    A named moment: the start of a phrase ("line" + "phrase", plus optional "plus"
           seconds), or a time inside the line's file ("line" + "raw").
  scripts  The story's own files, in load order. An entry that starts with "kit/" is taken
           from the kit instead, e.g. "kit/data/land-110m.js" and "kit/globe.js". Any other
           path is relative to the story folder ("../shared/house.js" for a series file).

events.js (optional) holds one function and nothing else, because it runs both in the page
and here:
    function storyEvents(T) {
      return [{ name: "stamp", t: T.p3[1] + 0.2, sfx: "thud", gain: 0.5 },
              { name: "sweep", t: T.l4 - 0.3, sfx: "swish", args: [0.5, 500, 3600], gain: 0.16 }];
    }
  name  how film.js refers to the moment: const EV = eventTimes(storyEvents(T)); EV.stamp
  sfx   a function of synth.py played at that moment, with optional args and gain.
The picture and the sound then read the same list, so a sound cannot drift from its action.

Requires: numpy, scipy, ffmpeg on PATH.
"""
import importlib.util, io, json, os, shutil, subprocess, sys, wave
import numpy as np
from scipy.signal import resample_poly

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
KIT = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(KIT)
sys.path.insert(0, KIT)
import synth as S

if len(sys.argv) != 3:
    sys.exit(__doc__)
STORY, LANG = os.path.abspath(sys.argv[1]), sys.argv[2]
OUT = os.path.join(STORY, "build", LANG)
LINES = os.path.join(STORY, "audio", LANG, "lines")
cfg = json.load(io.open(os.path.join(STORY, "story.json"), encoding="utf-8"))
LEAD, GAP, KEEP, TAIL = cfg.get("lead", 0.4), cfg.get("gap", 0.3), cfg.get("keep", 0.3), cfg.get("tail", 3.2)
CUES = cfg.get("phrases", {}).get(LANG, {})
MARKS = cfg.get("marks", {}).get(LANG, {})
W, H = cfg.get("size", [1080, 1920])


def tighten(path):
    """Shorten pauses over 0.4 s to KEEP. Return (audio at S.SR, [start of each phrase],
    a function from a time in the original file to the time in the shortened audio)."""
    w = wave.open(path)
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    win = int(0.02 * sr)
    n = len(x) // win
    loud = np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(axis=1)) > 10 ** (-38 / 20)
    idx = np.where(loud)[0]
    spans, a = [], idx[0]
    for i, j in zip(idx[:-1], idx[1:]):
        if (j - i) * 0.02 > 0.4:
            spans.append((a, i + 1))
            a = j
    spans.append((a, idx[-1] + 1))
    out, starts, raw0, pad = [], [], [], int(0.04 * sr)
    for a, b in spans:
        seg = x[max(0, a * win - pad): b * win + pad].copy()
        f = min(pad, len(seg) // 2)
        seg[:f] *= np.linspace(0, 1, f)
        seg[-f:] *= np.linspace(1, 0, f)
        starts.append(sum(len(s) for s in out) / sr)
        raw0.append((max(0, a * win - pad) / sr, len(seg) / sr))
        out += [seg, np.zeros(int(KEEP * sr))]

    def at(raw):
        k = max([i for i in range(len(raw0)) if raw0[i][0] <= raw + 1e-6] or [0])
        return starts[k] + min(max(raw - raw0[k][0], 0), raw0[k][1])

    y = resample_poly(np.concatenate(out[:-1]), S.SR, sr)
    return y / (np.abs(y).max() + 1e-9) * 0.7, [round(s, 3) for s in starts], at


# ---- 1. timeline ----------------------------------------------------------------------------
files = sorted(f for f in os.listdir(LINES) if f.lower().endswith(".wav"))
if not files:
    sys.exit("no narration lines in " + LINES)
T, voices, line_at, t = {}, [], {}, LEAD
for n, f in enumerate(files, 1):
    y, starts, at = tighten(os.path.join(LINES, f))
    if str(n) in CUES:
        starts = [round(float(at(c)), 3) for c in CUES[str(n)]]
    T["l%d" % n], T["e%d" % n] = round(t, 3), round(t + len(y) / S.SR, 3)
    T["p%d" % n] = [round(t + s, 3) for s in starts]
    line_at[n] = (t, starts, at)
    voices.append((t, y))
    print("line %d: %.2f s, phrases at %s" % (n, len(y) / S.SR, starts))
    t += len(y) / S.SR + GAP
for name, m in MARKS.items():
    t0, starts, at = line_at[m["line"]]
    T[name] = round(float(t0 + (at(m["raw"]) if "raw" in m else starts[m["phrase"]]) + m.get("plus", 0)), 3)
T["dur"] = round(T["e%d" % len(files)] + TAIL, 2)
T["lang"] = LANG
N = int(T["dur"] * S.SR)
voice = np.zeros(N)
for t0, y in voices:
    S.put(voice, t0, y)

# The narrator's mouth: open on the loud part of each syllable, 15 times a second.
FPS = 15
hop = S.SR // FPS
loud = np.sqrt((voice[: (N // hop) * hop].reshape(-1, hop) ** 2).mean(axis=1))
peak = np.array([loud[max(0, i - 4): i + 5].max() for i in range(len(loud))])
T["mouth"] = "".join("1" if a > 0.02 and a > 0.45 * b else "0" for a, b in zip(loud, peak))
T["mouthFps"] = FPS

# ---- 2. the page ----------------------------------------------------------------------------
os.makedirs(os.path.join(OUT, "audio"), exist_ok=True)
io.open(os.path.join(OUT, "timings.js"), "w", encoding="utf-8", newline="\n").write("window.T = " + json.dumps(T) + ";\n")
narrator = os.path.join(PROJECT, "narrator")
has_narrator = os.path.exists(os.path.join(narrator, "poses.js"))
has_events = os.path.exists(os.path.join(STORY, "events.js"))
story_js = [s for s in cfg["scripts"] if not s.startswith("kit/")]
kit_js = [s[4:] for s in cfg["scripts"] if s.startswith("kit/")]
scripts = (["kit.js"] + (["assets/narrator/poses.js"] if has_narrator else []) + (["events.js"] if has_events else [])
           + [os.path.basename(s) for s in cfg["scripts"]] + ["host.js"])
page = io.open(os.path.join(KIT, "page.html"), encoding="utf-8").read()
for key, val in [("__SCRIPTS__", "\n".join('    <script src="%s"></script>' % s for s in scripts)),
                 ("__DUR__", str(T["dur"])), ("__W__", str(W)), ("__H__", str(H)), ("__LANG__", LANG)]:
    page = page.replace(key, val)
io.open(os.path.join(OUT, "index.html"), "w", encoding="utf-8", newline="\n").write(page)
for js in ["kit.js", "host.js"]:
    shutil.copyfile(os.path.join(KIT, js), os.path.join(OUT, js))
for js in story_js + (["events.js"] if has_events else []):  # "../shared/x.js" lands in the build as x.js
    shutil.copyfile(os.path.join(STORY, js), os.path.join(OUT, os.path.basename(js)))
for js in kit_js:
    shutil.copyfile(os.path.join(KIT, js), os.path.join(OUT, os.path.basename(js)))
shutil.copytree(os.path.join(KIT, "fonts"), os.path.join(OUT, "fonts"), dirs_exist_ok=True)
if has_narrator:
    shutil.copytree(narrator, os.path.join(OUT, "assets", "narrator"), dirs_exist_ok=True)
print("duration", T["dur"], "| narrator", "yes" if has_narrator else "no")

# ---- 3. sound -------------------------------------------------------------------------------
story_sound = None
if os.path.exists(os.path.join(STORY, "sound.py")):
    spec = importlib.util.spec_from_file_location("story_sound", os.path.join(STORY, "sound.py"))
    story_sound = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(story_sound)

if story_sound and hasattr(story_sound, "music"):
    music = story_sound.music(T, S)
else:
    music = S.music_pad(T["dur"])
music = np.resize(music, N) if len(music) >= N else np.pad(music, (0, N - len(music)))
ts = np.arange(N) / S.SR
music = music * np.clip(ts / 0.5, 0, 1) * np.clip((T["dur"] - ts) / 1.0, 0, 1)

sfx = np.zeros(N)
if has_events:                                  # the moments film.js also uses: run the same function here
    io.open(os.path.join(OUT, "timings.json"), "w", encoding="utf-8").write(json.dumps(T))
    runner = ("const fs=require('fs');const T=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));"
              "const f=new Function('T',fs.readFileSync(process.argv[2],'utf8')+';return storyEvents(T);');"
              "console.log(JSON.stringify(f(T)));")
    res = subprocess.run(["node", "-e", runner, os.path.join(OUT, "timings.json"), os.path.join(STORY, "events.js")],
                         capture_output=True, text=True, encoding="utf-8", check=True)
    events = json.loads(res.stdout)
    io.open(os.path.join(OUT, "events.json"), "w", encoding="utf-8").write(json.dumps(events, ensure_ascii=False, indent=1))
    for e in events:
        if e.get("sfx"):
            S.put(sfx, e["t"], getattr(S, e["sfx"])(*e.get("args", [])), e.get("gain", 0.2))
    print("events", len(events), "| with sound", sum(1 for e in events if e.get("sfx")))
if story_sound and hasattr(story_sound, "cues"):
    story_sound.cues(T, S, lambda t, x, gain=1.0: S.put(sfx, t, x, gain))

music *= S.rms(voice) * 10 ** (-21 / 20) / S.rms(music)       # music about 21 dB under the voice
mix = np.tanh((voice + music + sfx * 0.5) * 1.1) / 1.1
mix = mix / np.abs(mix).max() * 0.89
raw = os.path.join(OUT, "audio", "mix.wav")
S.write_wav(raw, mix)
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af",
                "loudnorm=I=-16:TP=-2:LRA=11", "-ar", "44100", os.path.join(OUT, "audio", "mix-final.wav")], check=True)
print("saved", os.path.join(OUT, "audio", "mix-final.wav"))
