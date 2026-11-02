// The narrator in the corner (optional). A cut-out character in screen space: it does not
// move with the camera. Its mouth follows the real loudness of the narration (T.mouth, made
// by build.py), it blinks, and it changes pose when the story's NARRATOR_PLAN says so.
//
// Needs: narrator/poses.js (window.NARRATOR, made by prep_narrator.py) and, in film.js,
//   const NARRATOR_PLAN = [[time, pose, fallbackPose], ...];   // in time order, first at 0
// If either is missing nothing is drawn, so a story without a narrator needs no changes.
// film.js calls drawNarrator(t) near the end of render(t), above the picture, below the grain.

const HOST = { img: {}, ready: false };
// Where the feet stand and how tall the figure is. Bottom-left is clear of the buttons that
// Reels and TikTok put on the right. Override with window.NARRATOR_AT = { x, y, height }.
const HOST_AT = Object.assign({ x: 195, y: H - 12, height: 520 }, window.NARRATOR_AT || {});

(function () {
  if (!window.NARRATOR) return;
  const names = [];
  Object.keys(window.NARRATOR.poses).forEach((p) => { names.push(p); window.NARRATOR.poses[p].variants.forEach((v) => names.push(p + "-" + v)); });
  const all = Promise.all(names.map((n) => new Promise((done) => { const im = new Image(); im.onload = () => { HOST.img[n] = im; done(); }; im.onerror = done; im.src = "assets/narrator/" + n + ".png"; })))
    .then(() => { HOST.ready = true; render(window.__lastT || 0); });
  window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady["narrator"] = all;                  // the renderer waits for the pictures
})();

function drawNarrator(t) {
  if (!HOST.ready || typeof NARRATOR_PLAN === "undefined") return;
  const P = window.NARRATOR.poses;
  let e = NARRATOR_PLAN[0];
  for (const row of NARRATOR_PLAN) if (row[0] <= t) e = row;
  const pose = P[e[1]] ? e[1] : e[2], d = P[pose];
  if (!d) return;
  const open = T.mouth[Math.min(T.mouth.length - 1, Math.floor(t * T.mouthFps))] === "1";
  let name = pose;
  if (open && d.variants.indexOf("open") >= 0) name = pose + "-open";
  else if (d.variants.indexOf("blink") >= 0 && t % 3.7 > 3.56) name = pose + "-blink";
  if (!HOST.img[name]) return;
  const s = HOST_AT.height / window.NARRATOR.figure;
  const pop = e[0] > 0 ? back(ph(t, e[0], 0.24)) : 1;         // a little squash each time the pose changes
  ctx.save();
  ctx.translate(HOST_AT.x, HOST_AT.y); ctx.rotate(Math.sin(t * 1.7) * 0.008);
  ctx.scale(s * lerp(1.07, 1, pop) * (d.flip ? -1 : 1), s * lerp(0.9, 1, pop));
  ctx.shadowColor = "rgba(40,20,0,0.42)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
  ctx.drawImage(HOST.img[name], -d.ax, -d.ay);
  ctx.restore();
}
