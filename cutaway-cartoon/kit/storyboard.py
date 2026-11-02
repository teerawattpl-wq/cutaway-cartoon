"""Make the storyboard: one picture with one frame per narration line, each with its number,
its time and the words spoken, taken from the real film code. Show it to the user and wait
for approval before adding motion.

Usage (from the project folder, after kit/build.py):
    python kit/storyboard.py <story folder> <lang> [--at 1.5,6.6,...] [--cols 4]

By default the frames are taken just before the end of each line, when everything that line
puts on screen should be there. Give --at to choose other times (still one per caption).
Writes <story>/storyboard-<lang>.jpg.
Requires: pillow, Node.js with the HyperFrames CLI (npx hyperframes).
"""
import argparse, glob, io, json, os, re, shutil, subprocess, sys, tempfile, textwrap
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ap = argparse.ArgumentParser()
ap.add_argument("story")
ap.add_argument("lang")
ap.add_argument("--at", default="")
ap.add_argument("--cols", type=int, default=4)
args = ap.parse_args()
STORY = os.path.abspath(args.story)
BUILD = os.path.join(STORY, "build", args.lang)
T = json.loads(re.search(r"\{.*\}", io.open(os.path.join(BUILD, "timings.js"), encoding="utf-8").read()).group(0))
n_lines = len([k for k in T if re.fullmatch(r"l\d+", k)])
times = [float(x) for x in args.at.split(",")] if args.at else [round(T["e%d" % n] - 0.15, 2) for n in range(1, n_lines + 1)]
lines = []
script = os.path.join(STORY, "lines.%s.json" % args.lang)
if os.path.exists(script):
    lines = [ln["text"] for ln in json.load(io.open(script, encoding="utf-8"))["lines"]]

tmp = tempfile.mkdtemp(prefix="storyboard_")
cmd = "npx hyperframes snapshot --at %s --no-end -o \"%s\"" % (",".join(str(t) for t in times), tmp)
subprocess.run(cmd, cwd=BUILD, shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
frames = sorted(glob.glob(os.path.join(tmp, "frame-*.png")))
if len(frames) != len(times):
    sys.exit("expected %d frames, got %d" % (len(times), len(frames)))


def font(size):
    """A font that has the script of the captions. Thai needs one of these."""
    for p in ["C:/Windows/Fonts/leelawui.ttf", "C:/Windows/Fonts/tahoma.ttf", "/System/Library/Fonts/Supplemental/Thonburi.ttc",
              "/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


first = Image.open(frames[0])
TW = 380
TH = round(TW * first.height / first.width)
CAP, PAD, cols = 150, 14, max(1, min(args.cols, len(frames)))
rows = (len(frames) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (TW + PAD) + PAD, rows * (TH + CAP + PAD) + PAD), (250, 247, 240))
d = ImageDraw.Draw(sheet)
f_big, f_small = font(26), font(21)
for i, (path, t) in enumerate(zip(frames, times)):
    x, y = PAD + (i % cols) * (TW + PAD), PAD + (i // cols) * (TH + CAP + PAD)
    sheet.paste(Image.open(path).convert("RGB").resize((TW, TH), Image.LANCZOS), (x, y))
    d.rectangle([x, y, x + TW - 1, y + TH - 1], outline=(43, 38, 34), width=2)
    d.text((x + 2, y + TH + 6), "%d   %d:%04.1f" % (i + 1, int(t // 60), t % 60), fill=(184, 88, 11), font=f_big)
    if i < len(lines):
        wrapped = textwrap.wrap(lines[i], width=44 if re.search(r"[A-Za-z]{4}", lines[i]) else 38)[:4]
        d.multiline_text((x + 2, y + TH + 42), "\n".join(wrapped), fill=(43, 38, 34), font=f_small, spacing=4)
out = os.path.join(STORY, "storyboard-%s.jpg" % args.lang)
sheet.save(out, quality=90)
shutil.rmtree(tmp, ignore_errors=True)
print("saved", out, "|", len(frames), "frames at", times)
