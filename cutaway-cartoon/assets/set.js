// ฉากตัดขวางและกล้อง ใช้ได้ทุกแนวด้วยการเปลี่ยนชุดสีและรายการห้อง ต้องมี ctx, lerp, W, H จากหน้า
const GENRES = {
  disaster: { sky: ["#0b111c", "#1a2433"], wall: ["#29323f", "#2e3746"], cut: "#0f141d", cutLine: "#1d2533", floor: "#3a4453", accent: "#f2b632", danger: "#ff5a48", light: "#ffe2a0" },
  ghost: { sky: ["#05060d", "#141026"], wall: ["#20202f", "#262334"], cut: "#07070e", cutLine: "#191726", floor: "#2c2838", accent: "#b6d36f", danger: "#d94a5a", light: "#a9e0c8" },
  comedy: { sky: ["#8fd3f0", "#dff4f7"], wall: ["#f4dcae", "#f6c8a2"], cut: "#b87a4d", cutLine: "#a26840", floor: "#c98f5f", accent: "#ff7a4d", danger: "#e03d3d", light: "#fff4c9" },
  scifi: { sky: ["#060716", "#161a3a"], wall: ["#23305a", "#1f3a5c"], cut: "#0a0e22", cutLine: "#232b52", floor: "#39507e", accent: "#4ce0e8", danger: "#ff4d8d", light: "#9ff3ff" },
  period: { sky: ["#e6a95e", "#f5dc9b"], wall: ["#a9744a", "#b98656"], cut: "#5a3a22", cutLine: "#6d4930", floor: "#7d5434", accent: "#d9a537", danger: "#d9483b", light: "#ffe2a0" },
};
// กล้อง: จุด (wx, wy) ในฉากไปอยู่ที่ (sx, sy) บนจอ คูณ zoom
function camIn(cam) { ctx.save(); ctx.translate(cam[3], cam[4]); ctx.scale(cam[0], cam[0]); ctx.translate(-cam[1], -cam[2]); }
function camOut() { ctx.restore(); }
// เลื่อนกล้องระหว่างจุด โดยซูมแบบลอการิทึมให้ความเร็วดูเท่ากัน keys: [{t, cam}]
function camAtTime(t, keys) {
  if (t <= keys[0].t) return keys[0].cam;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t < b.t) { let m = (t - a.t) / (b.t - a.t); m = m * m * (3 - 2 * m); return [Math.exp(lerp(Math.log(a.cam[0]), Math.log(b.cam[0]), m)), lerp(a.cam[1], b.cam[1], m), lerp(a.cam[2], b.cam[2], m), lerp(a.cam[3], b.cam[3], m), lerp(a.cam[4], b.cam[4], m)]; }
  }
  return keys[keys.length - 1].cam;
}
function setSky(P) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
// พื้นและผนังที่ถูกตัด มีลายเส้นทแยงเพื่อบอกว่านี่คือรอยตัด
function setHatch(P, x, y, w, h) {
  ctx.fillStyle = P.cut; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.strokeStyle = P.cutLine; ctx.lineWidth = 3;
  for (let i = x - h; i < x + w; i += 34) { ctx.beginPath(); ctx.moveTo(i, y + h); ctx.lineTo(i + h, y); ctx.stroke(); }
  ctx.restore();
}
// ห้องตัดขวางหนึ่งห้อง พื้นอยู่ที่ y=0 ของห้อง ขยายขึ้นด้านบน
function setRoom(P, x, y, w, h, level) {
  ctx.fillStyle = P.wall[(level || 0) % 2]; ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = P.floor; ctx.fillRect(x, y - 22, w, 22);
  const shade = ctx.createLinearGradient(0, y - h, 0, y); shade.addColorStop(0, "rgba(0,0,0,0.26)"); shade.addColorStop(0.45, "rgba(0,0,0,0)");
  ctx.fillStyle = shade; ctx.fillRect(x, y - h, w, h);
  setHatch(P, x - 22, y - h - 22, w + 44, 22); setHatch(P, x - 22, y - h, 22, h); setHatch(P, x + w, y - h, 22, h); setHatch(P, x - 22, y, w + 44, 26);
}
// อาคารทั้งหลัง: rooms คือแถวจากล่างขึ้นบน แต่ละแถวเป็นรายการความกว้าง
function setBuilding(P, x, floorY, rooms, h) {
  rooms.forEach((row, lv) => {
    let rx = x;
    row.forEach((w, i) => { setRoom(P, rx, floorY - lv * (h + 22), w, h, lv + i); rx += w + 22; });
  });
}
function setWindow(P, x, y, w, h, lit) {
  ctx.fillStyle = "#0a0d13"; ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = lit ? P.light : P.sky[1]; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#0a0d13"; ctx.fillRect(x + w / 2 - 2, y, 4, h); ctx.fillRect(x, y + h / 2 - 2, w, 4);
}
function setDoor(P, x, y, w, h, open) { ctx.fillStyle = open ? "#07090d" : P.cut; ctx.fillRect(x, y - h, w, h); ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(x + w - 14, y - h / 2, 5, 0, Math.PI * 2); ctx.fill(); }
function setTable(P, x, y, w, h) { ctx.fillStyle = P.cut; ctx.fillRect(x, y - h, w, 14); ctx.fillRect(x + 8, y - h + 14, 12, h - 14); ctx.fillRect(x + w - 20, y - h + 14, 12, h - 14); }
function setStairs(P, x, y, steps, sw, sh, dir) { ctx.fillStyle = P.cut; for (let i = 0; i < steps; i++) ctx.fillRect(x + dir * i * sw - (dir < 0 ? sw : 0), y - (i + 1) * sh, sw, (i + 1) * sh); }
function setLamp(P, x, y, r, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, P.light); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.save(); ctx.globalAlpha *= a === undefined ? 0.45 : a; ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
