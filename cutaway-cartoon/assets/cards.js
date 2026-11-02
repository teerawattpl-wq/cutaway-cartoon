// การ์ดที่วาดทับฉากในพิกัดจอ: การ์ดกฎ โทรศัพท์ และชื่อท้ายตอน แต่ละตัวรับเวลาและเวลาเข้า/ออกของตัวเอง
// เลื่อนลงมาจากด้านบนแล้วจางหาย ต้องโหลดหลัง look.js และเรียก useGenre(P) หนึ่งครั้งใน film.js
// แผนภาพและการ์ดตัวเลขเฉพาะเรื่องให้เขียนใน props.js ของเรื่องนั้น

const CARD = { paper: "#f1ece2", ink: "#1b1f27", soft: "#6b7280", red: PAL.dangerInk, yellow: PAL.yellow, ruleLabel: "กฎข้อ" };
const KF = (size) => '700 ' + size + 'px "Kanit", sans-serif';

// ให้การ์ดและคำบรรยายใช้สีเน้นกับสีอันตรายของแนวที่เลือกใน GENRES (set.js)
function useGenre(P) {
  PAL.yellow = P.accent; PAL.danger = P.danger; PAL.dangerInk = P.danger;
  CAP.yellow = P.accent; CAP.red = P.danger; CARD.red = P.danger; CARD.yellow = P.accent;
}

if (typeof roundRect === "undefined") {
  window.roundRect = function (x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
}

function cardIn(t, t0, t1) { // ค่า 0..1 ความชัดของการ์ด และระยะเลื่อนลงในแนวตั้ง
  const a = out(ph(t, t0, 0.35)) * (1 - ph(t, t1 - 0.25, 0.25));
  return { a, dy: (1 - back(ph(t, t0, 0.45))) * -60 };
}

function dimWorld(a) {
  if (a <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "rgba(4,6,10," + 0.5 * a + ")"; ctx.fillRect(0, 0, W, H); ctx.restore();
}

function cardBox(x, y, w, h) {
  ctx.fillStyle = "rgba(0,0,0,0.35)"; roundRect(x + 8, y + 12, w, h, 26); ctx.fill();
  ctx.fillStyle = CARD.paper; roundRect(x, y, w, h, 26); ctx.fill();
  ctx.fillStyle = CARD.red; roundRect(x, y, w, 14, 7); ctx.fill();
}
function ctext(s, x, y, size, col, align) {
  ctx.font = KF(size); ctx.fillStyle = col; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y);
}
function pill(s, x, y) {
  ctx.font = KF(34); const w = ctx.measureText(s).width + 50;
  ctx.fillStyle = CARD.red; roundRect(x - w / 2, y - 28, w, 56, 28); ctx.fill();
  ctext(s, x, y + 1, 34, "#ffffff");
}

// ไอคอนคนหนึ่งคน (หัวกับตัว) ใช้ทำตารางนับ
function personIcon(x, y, s, col) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y - 15 * s, 9 * s, 0, TAU); ctx.fill();
  roundRect(x - 11 * s, y - 3 * s, 22 * s, 26 * s, 8 * s); ctx.fill();
}
function bolt(x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x + 3 * s, y - 16 * s); ctx.lineTo(x - 8 * s, y + 2 * s); ctx.lineTo(x, y + 2 * s); ctx.lineTo(x - 4 * s, y + 16 * s);
  ctx.lineTo(x + 9 * s, y - 4 * s); ctx.lineTo(x + 1 * s, y - 4 * s); ctx.lineTo(x + 5 * s, y - 16 * s); ctx.closePath(); ctx.fill();
}

// การ์ดกฎ: เลขข้อ บรรทัดหัวเรื่อง แผนภาพเล็ก และแหล่งที่มา (ไม่ใส่ source ก็ไม่มีบรรทัดที่มา)
// การ์ดที่อ้างข้อเท็จจริงจริงต้องใส่ source ที่ตรวจแล้วเสมอ ส่วนเรื่องแต่งไม่ควรหน้าตาเหมือนคำแนะนำจริง
function drawRuleCard(t, t0, t1, num, lines, source, diagram, h) {
  const v = cardIn(t, t0, t1); if (v.a <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, v.dy); ctx.globalAlpha = v.a;
  const x = 110, y = 210, w = 860;
  h = h || 640;
  cardBox(x, y, w, h);
  pill(CARD.ruleLabel + " " + num, 540, y + 70);
  lines.forEach((s, i) => ctext(s, 540, y + 160 + i * 84, 70, CARD.ink));
  if (diagram) { ctx.save(); ctx.translate(540, y + 180 + lines.length * 84); diagram(t); ctx.restore(); }
  if (source) ctext("ที่มา: " + source, 540, y + h - 40, 28, CARD.soft);
  ctx.restore();
}

// โทรศัพท์ใหญ่บนจอ kind "call": o.who กับ o.num คือคนที่กำลังโทรหา kind "alert": ประกาศแดงใน o.lines
// o.title หัวประกาศ o.batt แบตเตอรี่ 0..1 (แดงเมื่อต่ำกว่า 0.2) ค่าเริ่มต้นเป็นข้อความกลาง ๆ ใส่เบอร์จริงเมื่อตรวจแล้วเท่านั้น
function drawPhone(t, t0, t1, kind, o) {
  const v = cardIn(t, t0, t1); if (v.a <= 0) return;
  o = Object.assign(kind === "call" ? { who: "โทรออก", num: "000", batt: 0.42 }
    : { title: "ประกาศ", lines: ["ข้อความสำคัญ"], note: "", batt: 0.18 }, o || {});
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, v.dy); ctx.globalAlpha = v.a;
  const x = 330, y = 260, w = 420, h = 800;
  ctx.fillStyle = "rgba(0,0,0,0.4)"; roundRect(x + 10, y + 14, w, h, 60); ctx.fill();
  ctx.fillStyle = "#0d1016"; roundRect(x, y, w, h, 60); ctx.fill();
  ctx.fillStyle = kind === "call" ? "#1d2b3f" : "#20262f"; roundRect(x + 16, y + 16, w - 32, h - 32, 46); ctx.fill();
  // แบตเตอรี่ มุมขวาบน
  const batt = o.batt, low = batt < 0.2;
  ctx.strokeStyle = "#cfd6df"; ctx.lineWidth = 3; roundRect(x + w - 110, y + 46, 56, 26, 6); ctx.stroke();
  ctx.fillStyle = low ? CARD.red : "#cfd6df"; ctx.fillRect(x + w - 106, y + 50, 48 * batt, 18);
  ctext(Math.round(batt * 100) + "%", x + w - 140, y + 60, 26, low ? PAL.danger : "#cfd6df", "right");
  if (kind === "call") {
    ctext("กำลังโทร...", 540, y + 200, 34, "#a9b6c8");
    ctext(o.who, 540, y + 290, 52, "#ffffff");
    ctext(o.num, 540, y + 420, 120, CARD.yellow);
    const pulse = 1 + 0.08 * Math.sin(t * 6);
    ctx.fillStyle = "#e0483a"; ctx.beginPath(); ctx.arc(540, y + h - 140, 56 * pulse, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffffff"; roundRect(512, y + h - 148, 56, 16, 8); ctx.fill();
  } else {
    ctx.fillStyle = CARD.red; roundRect(x + 40, y + 160, w - 80, 300, 24); ctx.fill();
    ctext(o.title, 540, y + 220, 36, "#ffffff");
    o.lines.forEach((s, i) => ctext(s, 540, y + 310 + i * 65, 44, "#ffffff"));
    if (o.note) ctext(o.note, 540, y + 540, 32, "#a9b6c8");
  }
  ctx.restore();
}

// ชื่อท้ายตอน: ข้อความ text ตัวใหญ่ที่แกน x กลางจอ ความสูงเริ่มต้น y 760 ย้ายได้ด้วย y (ชื่อซีรีส์หรือคำถามค้าง)
function drawEndTitle(t, t0, text, y) {
  const a = out(ph(t, t0, 0.4)); if (a <= 0) return;
  const s = 0.85 + 0.15 * back(ph(t, t0, 0.5));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
  ctx.translate(540, y === undefined ? 760 : y); ctx.scale(s, s);
  ctx.font = KF(170); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 16; ctx.strokeStyle = "rgba(8,10,16,0.9)"; ctx.lineJoin = "round";
  ctx.strokeText(text || "", 0, 0);
  ctx.fillStyle = "#ffffff"; ctx.fillText(text || "", 0, 0);
  ctx.restore();
}
