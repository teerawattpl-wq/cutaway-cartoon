"""Set up a project folder for a cutaway cartoon, once.

    python tools/setup_project.py <project folder>

Copies   kit/           to <project>/kit/       build.py, make_voice.py, words.py, pauses.py, frame_sheets.py, ...
         assets/*.js    to <project>/shared/    figure.js, set.js, look.js, cards.js (a file that is already there is kept)
         examples/hello to <project>/hello/     a three-line story to read and build
Then prints what to check next. Run it from this skill's folder, or give its path.
Requires only Python 3.
"""
import os, shutil, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) != 2:
    sys.exit(__doc__)
PROJECT = os.path.abspath(sys.argv[1])
os.makedirs(os.path.join(PROJECT, "shared"), exist_ok=True)
shutil.copytree(os.path.join(HERE, "kit"), os.path.join(PROJECT, "kit"), dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__"))
kept = []
for f in sorted(os.listdir(os.path.join(HERE, "assets"))):
    if f.endswith(".js"):
        dst = os.path.join(PROJECT, "shared", f)
        if os.path.exists(dst):
            kept.append(f)
        else:
            shutil.copyfile(os.path.join(HERE, "assets", f), dst)
if not os.path.exists(os.path.join(PROJECT, "hello")):
    shutil.copytree(os.path.join(HERE, "examples", "hello"), os.path.join(PROJECT, "hello"))
print("project:", PROJECT)
print("kit/ copied; shared/ has", ", ".join(sorted(os.listdir(os.path.join(PROJECT, "shared")))))
if kept:
    print("kept as they were:", ", ".join(kept))
print("""
Next:
  python --version ; ffmpeg -version ; node -v ; npx hyperframes --version
  pip install numpy scipy        (or put  uv run --no-project --with numpy --with scipy  in front of python)
  a .env file with GEMINI_API_KEY=... in the project folder, for the narration (never share it)
  hello/ has a story to read; its README.md says how to build it.""")
