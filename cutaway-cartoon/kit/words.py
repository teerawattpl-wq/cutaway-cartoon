"""Print what a recording says with times, one line per run of speech, and list the long
pauses. Use it to (1) check the voice said what the script says, (2) find where to cut the
raw narration into lines, (3) find phrase starts for story.json.

Usage:  python kit/words.py <recording.wav> <language code, e.g. en or th>
Requires: faster-whisper, ffmpeg on PATH. Times near a pause can be off by about 0.3 s.
Short words and words that differ only by tone are often heard wrong: a mismatch here is a
reason for a person to listen, not proof the take is bad.

Languages written with spaces are printed word by word. Languages written without spaces
(Thai, Japanese, Chinese, ...) come back one character at a time, so they are joined into
phrases and split wherever the voice pauses for 0.3 s.
"""
import io, re, subprocess, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from faster_whisper import WhisperModel

path, lang = sys.argv[1], sys.argv[2]
model = WhisperModel("small.en" if lang == "en" else "small", device="cpu", compute_type="int8")
segs, _ = model.transcribe(path, language=lang, word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
NO_SPACES = lang in ("th", "ja", "zh", "lo", "km", "my")
NL = chr(10)


def show(start, end, text, new_line):
    print((NL if new_line else "") + "%.2f-%.2f %s" % (start, end, text.strip()), end=" | ")


prev, run = 0.0, None
for s in segs:
    for w in s.words:
        gap = w.start - prev
        if NO_SPACES:
            if run is None or gap > 0.3:
                if run:
                    show(*run)
                run = [w.start, w.end, "", gap > 0.9]
            run[1], run[2] = w.end, run[2] + w.word.strip()
        else:
            show(w.start, w.end, w.word, gap > 0.9)
        prev = w.end
if run:
    show(*run)
print(NL + NL + "pauses of 0.9 s or more (cut the lines in the middle of these):")
p = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "silencedetect=noise=-38dB:d=0.9", "-f", "null", "-"],
                   capture_output=True, text=True, encoding="utf-8", errors="replace")
starts, ends = re.findall(r"silence_start: ([0-9.]+)", p.stderr), re.findall(r"silence_end: ([0-9.]+)", p.stderr)
for a, b in zip(starts, ends):
    print("  %7.2f - %7.2f" % (float(a), float(b)))
