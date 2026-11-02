"""List the short silences in a stretch of a narration recording.

    python kit/pauses.py <recording> <from seconds> <to seconds> [shortest pause, default 0.06]
    e.g.  python kit/pauses.py audio/narration.mp3 31 63.5

Prints "start-end" for every silence, in seconds of the recording. Use it to find where the
phrases inside a sentence begin when the voice never pauses long enough for words.py to
split it (a fast TTS voice in Thai rarely pauses more than 0.1 s): the sentence times come
from the transcript, the phrase starts from the end of each silence here. Check the result
against the script by counting: a sentence with four phrases should show three silences in
it; where two phrases run together, estimate the boundary from the half-second transcript.
Requires: numpy, ffmpeg on PATH.
"""
import subprocess, sys
import numpy as np

if len(sys.argv) < 4:
    sys.exit(__doc__)
path, t0, t1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
least = float(sys.argv[4]) if len(sys.argv) > 4 else 0.06
SR = 16000
p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(t0), "-t", str(t1 - t0), "-i", path,
                    "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True)
x = np.frombuffer(p.stdout, dtype=np.int16).astype(np.float64) / 32768
hop = SR // 100
loud = np.array([np.sqrt(np.mean(x[i:i + 3 * hop] ** 2)) for i in range(0, max(1, len(x) - 3 * hop), hop)])
quiet = loud < 0.012
out, i = [], 0
while i < len(quiet):
    if quiet[i]:
        j = i
        while j < len(quiet) and quiet[j]:
            j += 1
        if (j - i) * 0.01 >= least:
            out.append("%.2f-%.2f" % (t0 + i * 0.01, t0 + j * 0.01))
        i = j
    else:
        i += 1
print(" ".join(out))
