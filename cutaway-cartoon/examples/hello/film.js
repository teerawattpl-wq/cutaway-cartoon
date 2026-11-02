// ตัวอย่างที่เล็กที่สุดของการ์ตูนตัดขวาง: ห้องเดียว ตัวละครสองตัว กล้องเลื่อนต่อเนื่อง คำบรรยาย การ์ดหนึ่งใบ และชื่อท้ายตอน
// เวลาทุกอย่างมาจาก window.T (T.l1 คือจุดเริ่มบรรทัด 1, T.e1 จุดจบ, T.p1[k] จุดเริ่มวลีที่ k) ห้ามพิมพ์วินาทีลงไปตรง ๆ
const T = window.T;
const GN = GENRES.comedy;                              // ห้ามตั้งชื่อว่า P เพราะ kit.js มีฟังก์ชัน P อยู่แล้ว
useGenre(GN);                                          // ให้คำบรรยายและการ์ดใช้สีของแนวนี้
// จุดเริ่มวลีที่ k ของบรรทัด n ถ้าเสียงที่ได้มีช่วงเงียบน้อยกว่าที่คาด จะแบ่งเวลาบรรทัดเป็นสี่ส่วนเท่ากันแทน ภาพจึงไม่พังเมื่อเทค TTS ต่างไป
const Pp = (n, k) => (T["p" + n][k] !== undefined ? T["p" + n][k] : T["l" + n] + ((T["e" + n] - T["l" + n]) * k) / 4);

const AUNT = { hairStyle: "bun", top: "dress", shirt: "#b8486a", shirtShade: "#90385a", hair: "#55504a", headR: 38 };
const CAT = { skin: "#f09a52", skinShade: "#d27a3a", hair: "#f09a52", shirt: "#f09a52", shirtShade: "#d27a3a", pants: "#f09a52", pantsShade: "#d27a3a", hairStyle: "bald", accessories: ["catears"] };
const FLOOR = -22, ROOM_W = 1100, ROOM_H = 640;

const CAPS = captionTimes({
  1: [{ p: 0, parts: [["ป้ากับแมวส้ม"]] }, { parts: [["อยู่ห้องเดียวกัน"], [" สามปี", "yellow"]] }, { parts: [["ทะเลาะเรื่องเดียว"]] }, { parts: [["ใครได้ถือ"], ["รีโมต", "yellow"]] }],
  2: [{ p: 0, parts: [["ป้ายื่นมือไปหยิบ"]] }, { parts: [["แมวก็ยื่นเท้ามาแตะ"]] }, { parts: [["ทั้งสองคน"], ["ไม่ยอมกัน", "red"]] }],
  3: [{ p: 0, parts: [["ถ้าเป็นคุณ"]] }, { parts: [["จะให้ใครดูก่อนดี?", "yellow"]] }],
});

// กล้อง: [ซูม, จุดในฉาก x, จุดในฉาก y, ตำแหน่งบนจอ x, y] เริ่มเคลื่อนตั้งแต่เฟรมแรกเสมอ
const KEYS = [
  { t: 0, cam: [0.82, 550, -400, 540, 760] },
  { t: T.l2, cam: [1.25, 550, -260, 540, 840] },
  { t: Pp(2, 1), cam: [1.6, 550, -190, 540, 870] },
  { t: T.l3, cam: [1.0, 550, -320, 540, 820] },
  { t: T.dur, cam: [0.9, 550, -340, 540, 800] },
];

function render(t) {
  t = Math.max(0, Math.min(T.dur, t));
  ctx = mainCtx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([]); ctx.filter = "none"; ctx.globalCompositeOperation = "source-over";

  setSky(GN);
  camIn(camAtTime(t, KEYS));
  setBuilding(GN, 0, 0, [[ROOM_W]], ROOM_H);
  setWindow(GN, 120, -480, 200, 200, true);
  setDoor(GN, 940, FLOOR, 110, 320, false);
  setTable(GN, 480, FLOOR, 240, 130);

  // รีโมตบนโต๊ะ และตัวละครที่ขยับเข้าหากัน ท่าทุกท่าต้องขึ้นกับเวลา
  const reach = ph(t, T.l2, 1.2), tap = ph(t, Pp(2, 1), 0.6);
  ctx.fillStyle = "#222"; ctx.fillRect(578, FLOOR - 146, 44, 16);
  const breathe = Math.sin(t * 2.2) * 0.02;
  const auntPose = figMix(figPose({ mouth: t < T.e1 ? 0.4 * Math.abs(Math.sin(t * 9)) : 0 }), figPose({ armF: -1.1, elbowF: 0.35, brow: 0.7, torso: 0.1 }), io(reach));
  const catPose = figMix(figPose({ blink: ph(t % 3.7, 3.56, 0.14) }), figPose({ armF: -1.0, elbowF: 0.2, brow: -0.6, torso: -0.08 }), io(tap));
  drawFig(300 + 60 * breathe, FLOOR - figHip(AUNT), 1, 1, auntPose, AUNT);
  drawFig(800, FLOOR - figHip(CAT) * 0.62, 0.62, -1, catPose, CAT);
  camOut();

  drawVignette(0.4);

  // การ์ดกฎหนึ่งใบ ภาพประกอบขึ้นพร้อมการ์ด ห้ามปล่อยการ์ดว่าง
  const a = cardIn(t, Pp(2, 2), T.e2 + 0.2).a;
  dimWorld(a);
  drawRuleCard(t, Pp(2, 2), T.e2 + 0.2, 1, ["ห้ามแย่งรีโมต", "ตอนอีกฝ่ายกำลังดู"], "", (tt) => {
    ctx.fillStyle = "#222"; roundRect(-70, 20, 140, 46, 10); ctx.fill();
    ctx.fillStyle = CARD.red; ctx.beginPath(); ctx.arc(-30, 43, 10, 0, TAU); ctx.fill();
  }, 520);
  dimWorld(0.7 * ph(t, Pp(3, 1) - 0.1, 0.4));
  drawEndTitle(t, Pp(3, 1), "ใครชนะ?", 380);          // ย้ายขึ้นเหนือหลังคาห้อง ไม่ให้ทับตัวละคร

  drawCaption(t, CAPS);
  drawGrain(t, 0.07);
  window.__lastT = t;
}
