// ลายเส้นและแสงของการ์ตูนตัดขวาง: รูปทรงแบน แสงนุ่ม ฉากหน้าเบลอ เกรน และขอบภาพมืด
// คำบรรยายใช้ Kanit หนา ทีละวลี คำสำคัญใช้สีเน้น คำอันตรายใช้สีแดง
// ต้องมี kit.js จากหน้า (ctx, ph, out, back, cl, rgb, rnd, W, H) และเรียก useGenre(P) หนึ่งครั้งใน film.js เพื่อให้สีคำบรรยายตามแนว

if (typeof PAL === "undefined") {
  window.PAL = {
    yellow: "#f2b632",
    danger: "#ff5a48",
    dangerInk: "#d8402f",
    warm: [255, 196, 120],
    glowCool: [176, 208, 255],
    live: [255, 214, 90],
  };
}

const CAP = { font: '700 72px "Kanit", sans-serif', y: 1310, maxW: 880, white: "#ffffff", yellow: PAL.yellow, red: PAL.danger };

// lines: { 1: [ {p: 0, parts: [["ถ้าตีสอง"]]}, {parts: [["คุณตื่นมา"], ["ชั้นล่าง", "yellow"]]} ] }
// ก้อนที่มี p เริ่มที่วลีนั้นของบรรทัด ก้อนที่ไม่มี p แบ่งเวลาถึงก้อนที่มี p ถัดไปตามความยาวตัวอักษร
function captionTimes(lines) {
  const out = [];
  for (const L in lines) {
    const ch = lines[L], start = T["l" + L], end = T["e" + L], ps = T["p" + L];
    const at = ch.map((c) => (c.p !== undefined ? ps[c.p] : null));
    at[0] = at[0] === null ? start : at[0];
    for (let i = 0; i < ch.length; ) {
      let j = i + 1; while (j < ch.length && at[j] === null) j++;
      const a = at[i], b = j < ch.length ? at[j] : end;
      const len = (c) => c.parts.map((p) => p[0]).join("").length;
      const tot = ch.slice(i, j).reduce((s, c) => s + len(c), 0) || 1;
      let acc = 0;
      for (let k = i; k < j; k++) { out.push({ t0: a + ((b - a) * acc) / tot, t1: 0, parts: ch[k].parts }); acc += len(ch[k]); }
      i = j;
    }
    for (let k = out.length - ch.length; k < out.length - 1; k++) out[k].t1 = out[k + 1].t0;
    out[out.length - 1].t1 = end + 0.15;
  }
  return out;
}

function drawCaption(t, caps) {
  const c = caps.find((c) => t >= c.t0 && t < c.t1);
  if (!c || !c.parts[0][0]) return;
  const a = ph(t, c.t0, 0.08), s = 0.9 + 0.1 * out(ph(t, c.t0, 0.14));
  ctx.save();
  ctx.font = CAP.font; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  const widths = c.parts.map((p) => ctx.measureText(p[0]).width), total = widths.reduce((x, y) => x + y, 0);
  const fit = Math.min(1, CAP.maxW / total);
  ctx.translate(540, CAP.y); ctx.scale(s * fit, s * fit); ctx.globalAlpha = a;
  let x = -total / 2;
  c.parts.forEach((p, i) => {
    ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    ctx.lineWidth = 10; ctx.strokeStyle = "rgba(10,12,18,0.9)"; ctx.lineJoin = "round";
    ctx.strokeText(p[0], x, 0);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = CAP[p[1] || "white"]; ctx.fillText(p[0], x, 0);
    x += widths[i];
  });
  ctx.restore();
}

// เกรน: ลายสุ่มชิ้นเดียวสร้างตอนโหลด เลื่อนตำแหน่งทุกเฟรมตามเลขเฟรม
const GRAIN = (() => {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const g = c.getContext("2d"), im = g.createImageData(512, 512);
  for (let i = 0; i < im.data.length; i += 4) { const v = rnd() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
})();
function drawGrain(t, a) {
  const f = Math.floor(t * 30), ox = (f * 197) % 512, oy = (f * 331) % 512;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.globalCompositeOperation = "overlay";
  for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) ctx.drawImage(GRAIN, x, y);
  ctx.restore();
}
function drawVignette(a) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H * 0.47, H * 0.26, W / 2, H * 0.5, H * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + a + ")");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// แสงนุ่มที่ซ้อนทับ (จอโทรศัพท์ โคมไฟ ปลั๊กที่มีไฟ)
function glow(x, y, r, col, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgb(col, 0.55 * a)); g.addColorStop(0.35, rgb(col, 0.18 * a)); g.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}
// ของเบลอใกล้เลนส์ เคลื่อนเร็วกว่าฉาก (ความลึก k > 1)
function drawForeground(cam, items, alpha) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "blur(" + Math.round(30 * Math.max(0.6, cam[0] / 2)) + "px)";
  for (const it of items) {
    const a = it.a(cam) * alpha; if (a <= 0) continue;
    const sx = cam[3] + (it.x - cam[1]) * cam[0] * it.k, sy = cam[4] + (it.y - cam[2]) * cam[0] * it.k;
    ctx.globalAlpha = a; ctx.fillStyle = it.col;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(cam[0] * it.k, cam[0] * it.k); it.draw(); ctx.restore();
  }
  ctx.filter = "none"; ctx.restore();
}

// กากบาทแดงทับสิ่งที่ผิด: ขีดแรก แล้วขีดที่สอง
function redCross(x, y, r, m) {
  if (m <= 0) return;
  ctx.save(); ctx.strokeStyle = PAL.danger; ctx.lineWidth = 16; ctx.lineCap = "round";
  const a = cl(m * 2), b = cl(m * 2 - 1);
  ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x - r + 2 * r * a, y - r + 2 * r * a); ctx.stroke();
  if (b > 0) { ctx.beginPath(); ctx.moveTo(x + r, y - r); ctx.lineTo(x + r - 2 * r * b, y - r + 2 * r * b); ctx.stroke(); }
  ctx.restore();
}

// กลางวัน: วาดโลกลงชั้นของตัวเองด้วยสีกลางคืน แล้วปรับภาพครั้งเดียวตอนวางลงจอ
// กลางวันกับกลางคืนจึงเป็นภาพวาดเดียวกัน ของที่ต้องคงสีสด (กากบาท แสงฉุกเฉิน ตา) ให้วาดหลัง endWorld()
const WORLD = document.createElement("canvas"); WORLD.width = W; WORLD.height = H;
const worldCtx = WORLD.getContext("2d");
function beginWorld() { ctx = worldCtx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = "none"; ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, W, H); }
function endWorld(grade) { // grade: {b, c, s} หรือ null ถ้าไม่ปรับ
  ctx = mainCtx; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (grade) ctx.filter = "brightness(" + grade.b + ") contrast(" + grade.c + ") saturate(" + grade.s + ")";
  ctx.drawImage(WORLD, 0, 0); ctx.restore();
}
