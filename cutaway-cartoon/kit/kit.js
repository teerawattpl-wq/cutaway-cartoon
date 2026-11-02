// Drawing kit for code-drawn explainers: maths, easing, ink lines, paper, text, camera.
// Everything draws on the current `ctx` and depends only on the numbers passed in, so the
// same time always gives the same picture. Randomness is seeded (seed(n), then rnd()) and
// must be used only while the page loads, never inside render(t).
//
// A story adds its own files after this one: the things it draws (a bee, a planet, a gear)
// and film.js, which defines render(t).

const cv = document.getElementById("cv"), mainCtx = cv.getContext("2d");
const W = cv.width, H = cv.height, R3 = Math.sqrt(3), TAU = Math.PI * 2;
const INK = [43, 38, 34], LAV = [201, 205, 245];        // ink on paper; chalk-blue on the blueprint night
let ctx = mainCtx;                              // scenes may point this at an offscreen layer

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(1);
function seed(n) { rnd = mulberry32(n); }           // call once at the top of the story's first file
const cl = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, m) => a + (b - a) * m;
const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const out = (x) => 1 - Math.pow(1 - x, 3);
const back = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const ph = (t, a, d) => cl((t - a) / d);        // 0..1 over [a, a + d]
const rgb = (c, a) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (a === undefined ? 1 : a) + ")";
const mix = (c1, c2, m) => [0, 1, 2].map((i) => Math.round(lerp(c1[i], c2[i], m)));

// ---------- ink ----------
const sampler = document.getElementById("sampler");
function P(d, step) {                           // an SVG path string as a slightly unsteady point list
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d); sampler.appendChild(p);
  const L = p.getTotalLength(), n = Math.max(2, Math.ceil(L / (step || 2))), pts = [];
  for (let i = 0; i <= n; i++) { const q = p.getPointAtLength((L * i) / n); pts.push([q.x, q.y]); }
  const a1 = rnd() * TAU, a2 = rnd() * TAU, amp = 0.55;
  return pts.map(([x, y], i) => [x + amp * Math.sin(i * 0.23 + a1), y + amp * Math.sin(i * 0.17 + a2)]);
}
function trace(pts, frac) {
  const n = Math.max(2, Math.round(pts.length * (frac === undefined ? 1 : frac)));
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}
function stroke(pts, frac, width, color) {
  if (frac <= 0) return;
  trace(pts, frac); ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
}
function hexPath(cx, cy, R) {                   // pointy-top regular hexagon
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; ctx[i ? "lineTo" : "moveTo"](cx + R * Math.cos(a), cy + R * Math.sin(a)); }
  ctx.closePath();
}
function polyPath(pts) { ctx.beginPath(); pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p[0], p[1])); ctx.closePath(); }
function clipTo(pts) { trace(pts); ctx.closePath(); ctx.clip(); }
// Part of a closed outline, from fraction f0 to f1 of its length (used to "unroll" a perimeter).
function polyFrac(pts, f0, f1) {
  const n = pts.length, len = [], tot = pts.reduce((s, p, i) => { const q = pts[(i + 1) % n], l = Math.hypot(q[0] - p[0], q[1] - p[1]); len.push(l); return s + l; }, 0);
  let a = f0 * tot, b = f1 * tot, acc = 0, started = false;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n], l = len[i], s = Math.max(a, acc), e = Math.min(b, acc + l);
    if (e > s) {
      const u0 = (s - acc) / l, u1 = (e - acc) / l;
      if (!started) { ctx.moveTo(lerp(p[0], q[0], u0), lerp(p[1], q[1], u0)); started = true; }
      ctx.lineTo(lerp(p[0], q[0], u1), lerp(p[1], q[1], u1));
    }
    acc += l;
  }
}

// ================= paper and grain =================
function offscreen(fn) { const c = document.createElement("canvas"); c.width = W; c.height = H; if (fn) fn(c.getContext("2d")); return c; }
let paper = null, grain = null;
// Paints the paper and the print grain from the story's seeded generator. The page calls it
// before the first frame; call it yourself earlier if the order of random draws matters.
function makePaper() {
  paper = offscreen((g) => {
  g.fillStyle = "#f3e9d2"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 14000; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(120,90,40,0.07)" : "rgba(255,255,255,0.10)"; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2); }
  g.strokeStyle = "rgba(120,90,40,0.07)"; g.lineWidth = 1;
  for (let i = 0; i < 260; i++) { const x = rnd() * W, y = rnd() * H, a = rnd() * TAU, l = 10 + rnd() * 30; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * Math.cos(a), y + l * Math.sin(a) + 6, x + 2 * l * Math.cos(a), y + 2 * l * Math.sin(a)); g.stroke(); }
});
  grain = offscreen((g) => {
  for (let i = 0; i < 26000; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(60,35,5,0.06)" : "rgba(255,250,235,0.06)"; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2.4, 1 + rnd() * 2.4); }
});
}
function vignette(a) {
  const v = ctx.createRadialGradient(W / 2, H * 0.47, H * 0.36, W / 2, H * 0.47, H * 0.74);
  v.addColorStop(0, "rgba(42,24,6,0)"); v.addColorStop(1, "rgba(42,24,6," + 0.42 * a + ")");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// ================= text =================
const FONT = '"Pridi", "KanitL", serif', NUM = '"KanitL", sans-serif';
function txt(s, x, y, size, color, o) {
  o = o || {};
  ctx.font = "700 " + size + "px " + (o.font || FONT); ctx.textAlign = o.align || "center"; ctx.textBaseline = "alphabetic";
  if (o.stroke) { ctx.lineWidth = o.sw || 10; ctx.strokeStyle = o.stroke; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
// A paper label with an ink border. parts = [[text, colour], ...]; p = 0..1 appearing.
function tag(parts, cx, y, p, size) {
  if (p <= 0) return;
  size = size || 50;
  ctx.save(); ctx.globalAlpha = cl(p * 1.5); ctx.translate(0, (1 - out(cl(p))) * 26);
  ctx.font = "700 " + size + "px " + FONT;
  const ws = parts.map((q) => ctx.measureText(q[0]).width), tw = ws.reduce((a, b) => a + b, 0), padX = size * 0.5, h = size * 1.56;
  ctx.fillStyle = "rgba(60,35,5,0.22)"; ctx.fillRect(cx - tw / 2 - padX + 5, y - h * 0.7 + 7, tw + 2 * padX, h);
  ctx.fillStyle = "#fbf4e2"; ctx.fillRect(cx - tw / 2 - padX, y - h * 0.7, tw + 2 * padX, h);
  ctx.lineWidth = 3; ctx.strokeStyle = rgb(INK); ctx.strokeRect(cx - tw / 2 - padX, y - h * 0.7, tw + 2 * padX, h);
  let x = cx - tw / 2; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  parts.forEach((q, i) => { ctx.fillStyle = q[1] || rgb(INK); ctx.fillText(q[0], x, y + size * 0.12); x += ws[i]; });
  ctx.restore();
}
function leader(x1, y1, x2, y2, p) {           // an ink line from a label to the thing it names
  if (p <= 0) return;
  const f = io(cl(p));
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, f), lerp(y1, y2, f)); ctx.lineWidth = 4; ctx.strokeStyle = rgb(INK); ctx.lineCap = "round"; ctx.stroke();
  if (f >= 1) { ctx.beginPath(); ctx.arc(x2, y2, 10, 0, TAU); ctx.fillStyle = rgb(INK); ctx.fill(); }
}

// ================= camera: zoom s, with world point (fx, fy) held at screen point (sx, sy) =================
function camMix(a, b, m) { return [Math.exp(lerp(Math.log(a[0]), Math.log(b[0]), m)), lerp(a[1], b[1], m), lerp(a[2], b[2], m), lerp(a[3], b[3], m), lerp(a[4], b[4], m)]; }
// keys = [{ t, d, cam }]: at time t start moving to cam, arriving d seconds later. In time order.
function camChain(cam0, keys, now) {
  let from = cam0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (now < k.t) return from;
    if (i + 1 < keys.length && now >= keys[i + 1].t) { from = camMix(from, k.cam, io(ph(keys[i + 1].t, k.t, k.d))); continue; }
    return camMix(from, k.cam, io(ph(now, k.t, k.d)));
  }
  return from;
}
// The story's shared moments (events.js) as a lookup: const EV = eventTimes(storyEvents(T)); EV.stamp
function eventTimes(list) { const o = {}; list.forEach((e) => { if (e.name) o[e.name] = e.t; }); return o; }
function camApply(c) { ctx.translate(c[3], c[4]); ctx.scale(c[0], c[0]); ctx.translate(-c[1], -c[2]); }
const w2s = (c, x, y) => [c[3] + c[0] * (x - c[1]), c[4] + c[0] * (y - c[2])];
