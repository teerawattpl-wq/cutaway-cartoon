"""Lay out every frame of a film on contact sheets, numbered, so that every frame can be checked.

    python kit/frame_sheets.py <film.mp4> <out folder> [frames per second, default: all]
    e.g.  python kit/frame_sheets.py Story-v1.mp4 story01/frame-check
          python kit/frame_sheets.py Story-EN-v1.mp4 story01/frame-check-en 6

Writes one JPEG per two seconds of film (60 frames at 30 fps, ten across), each frame small
and numbered in its corner. Read every sheet. Most faults show up only here: a label that
stays at full strength while its scene fades, a frame where something jumps, a blink on the
frame you meant for a cover. A second language of the same picture can be checked at 6
frames per second. Requires: ffmpeg on PATH, pillow.
"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw

if len(sys.argv) < 3:
    sys.exit(__doc__)
film, dst = sys.argv[1], sys.argv[2]
fps = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(dst, exist_ok=True)
tmp = tempfile.mkdtemp()
vf = ("fps=%s," % fps if fps else "") + "scale=108:-1"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", film, "-vf", vf, os.path.join(tmp, "%05d.png")], check=True)
frames = sorted(f for f in os.listdir(tmp) if f.endswith(".png"))
per, cols = 60, 10
w, h = Image.open(os.path.join(tmp, frames[0])).size
for s in range(0, len(frames), per):
    rows = (min(per, len(frames) - s) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 2), rows * (h + 2)), (0, 0, 0))
    for i, f in enumerate(frames[s:s + per]):
        im = Image.open(os.path.join(tmp, f)).convert("RGB")
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 30, 11), fill=(0, 0, 0))
        d.text((2, 0), str(s + i + 1), fill=(255, 90, 90))
        sheet.paste(im, ((i % cols) * (w + 2), (i // cols) * (h + 2)))
    sheet.save(os.path.join(dst, "sheet-%03d.jpg" % (s // per + 1)), quality=82)
for f in frames:
    os.remove(os.path.join(tmp, f))
os.rmdir(tmp)
print(len(frames), "frames on", (len(frames) + per - 1) // per, "sheets in", dst)
