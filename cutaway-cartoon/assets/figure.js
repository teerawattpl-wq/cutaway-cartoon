// ตัวละครแบบข้อต่อ ตั้งค่าได้ทุกแบบด้วย spec ใช้ท่าร่วมกันทั้งหมด
// ต้องมี ctx, lerp, TAU จากหน้า หน่วย: สะโพกอยู่ที่ (0,0), +x คือด้านหน้า, -y คือด้านบน, มุมเป็นเรเดียน
const FIG_BASE = {
  skin: "#dcc3a0", skinShade: "#b89c7b", hair: "#17130f", shirt: "#33507c", shirtShade: "#253c5e",
  pants: "#6f7682", pantsShade: "#555b66", shoe: "#0c0f15", line: "#0c0f15", accent: "#f2b632", accentShade: "#c98f1d",
  headR: 36, neck: 12, torso: 112, upper: 62, fore: 58, thigh: 84, shin: 84, armW: 12, sleeveW: 22, legW: 26, shinW: 15, bodyW: 47,
  hairStyle: "short", top: "shirt", eyes: "dot", accessories: [], float: false, shadow: false,
};
// ตัวละครเงาดำ ใช้กับคนทำพลาดหรือผีไร้หน้า
const FIG_DARK = { skin: "#07090d", skinShade: "#07090d", hair: "#07090d", shirt: "#07090d", shirtShade: "#07090d", pants: "#07090d", pantsShade: "#07090d", shoe: "#07090d", line: "#07090d", shadow: true };

const figPose = (o) => Object.assign({ torso: 0, head: 0, armB: 0.15, elbowB: 0.25, armF: -0.1, elbowF: 0.3, hipB: 0.05, kneeB: 0.02, hipF: -0.05, kneeF: 0.02, blink: 0, look: 0.6, mouth: 0, brow: 0 }, o || {});
const figMix = (a, b, m) => { const r = {}; for (const k in a) r[k] = typeof a[k] === "number" ? lerp(a[k], b[k], m) : a[k]; return r; };
const figWalk = (base, phase, amp) => {
  const s = Math.sin(phase * Math.PI), p = Object.assign({}, base);
  p.hipF = base.hipF + 0.42 * amp * s; p.hipB = base.hipB - 0.42 * amp * s;
  p.kneeF = base.kneeF + 0.5 * amp * Math.max(0, -s); p.kneeB = base.kneeB + 0.5 * amp * Math.max(0, s);
  p.armF = base.armF - 0.35 * amp * s; p.armB = base.armB + 0.35 * amp * s;
  return p;
};
// ความสูงของสะโพกจากพื้นเมื่อยืนตรง ใช้วางเท้าให้ตรงพื้น
const figHip = (spec) => { const S = Object.assign({}, FIG_BASE, spec); return S.thigh + S.shin + 8; };

function figRound(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function figLimb(S, x1, y1, x2, y2, w, col) {
  ctx.lineCap = "round";
  ctx.strokeStyle = S.line; ctx.lineWidth = w + 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
const figDir = (a) => [Math.sin(a), Math.cos(a)];

function figLeg(S, hipA, kneeA, shade) {
  const d1 = figDir(hipA), kx = d1[0] * S.thigh, ky = d1[1] * S.thigh;
  const d2 = figDir(hipA - kneeA), fx = kx + d2[0] * S.shin, fy = ky + d2[1] * S.shin;
  const robed = S.top === "dress" || S.top === "robe", cover = shade ? S.shirtShade : S.shirt;
  const bare = S.top === "dress" || S.bareLegs ? (shade ? S.skinShade : S.skin) : S.top === "robe" ? cover : (shade ? S.pantsShade : S.pants);
  figLimb(S, 0, 0, kx, ky, S.legW, robed ? cover : (shade ? S.pantsShade : S.pants));
  figLimb(S, kx, ky, fx, fy, S.shinW, bare);
  ctx.fillStyle = S.line; ctx.beginPath(); ctx.ellipse(fx + 9, fy + 2, 16, 8.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = S.shoe; ctx.beginPath(); ctx.ellipse(fx + 9, fy + 1, 13, 6, 0, 0, TAU); ctx.fill();
}
function figArm(S, armA, elbowA, shade) {
  const sy = -S.torso + 8, d1 = figDir(armA), ex = d1[0] * S.upper, ey = sy + d1[1] * S.upper;
  const d2 = figDir(armA + elbowA), hx = ex + d2[0] * S.fore, hy = ey + d2[1] * S.fore, skin = shade ? S.skinShade : S.skin;
  figLimb(S, ex, ey, hx, hy, S.armW, skin);
  figLimb(S, 0, sy, ex, ey, S.armW, skin);
  figLimb(S, 0, sy, d1[0] * S.upper * 0.5, sy + d1[1] * S.upper * 0.5, S.sleeveW, shade ? S.shirtShade : S.shirt);
  ctx.fillStyle = S.line; ctx.beginPath(); ctx.arc(hx, hy, 9.5, 0, TAU); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx, hy, 7, 0, TAU); ctx.fill();
}
function figHairBack(S) {
  const R = S.headR;
  ctx.fillStyle = S.hair;
  if (S.hairStyle === "long") { figRound(-R * 1.15, -R * 0.7, R * 1.15, R * 2.5, R * 0.5); ctx.fill(); }
  if (S.hairStyle === "bob") { figRound(-R * 1.15, -R * 0.7, R * 1.25, R * 1.55, R * 0.45); ctx.fill(); }
  if (S.hairStyle === "bun") { ctx.beginPath(); ctx.arc(-R * 0.55, -R * 1.2, R * 0.48, 0, TAU); ctx.fill(); }
  if (S.hairStyle === "ghost") { figRound(-R * 1.2, -R * 0.95, R * 2.45, R * 3.5, R * 0.6); ctx.fill(); }
}
function figHairFront(S) {
  const R = S.headR;
  ctx.fillStyle = S.hair;
  if (S.hairStyle === "bald") return;
  if (S.hairStyle === "ghost") { ctx.beginPath(); ctx.moveTo(-R * 1.1, -R * 0.8); ctx.quadraticCurveTo(0, -R * 1.3, R * 1.1, -R * 0.75); ctx.lineTo(R * 0.92, R * 1.25); ctx.lineTo(R * 0.58, R * 1.05); ctx.lineTo(R * 0.7, -R * 0.1); ctx.lineTo(-R * 0.1, R * 0.2); ctx.lineTo(-R * 1.1, R * 0.4); ctx.closePath(); ctx.fill(); return; }
  if (S.hairStyle === "spiky") { ctx.beginPath(); ctx.moveTo(-R * 1.02, R * 0.1); for (let i = 0; i < 6; i++) { const a = Math.PI * (1.02 + i * 0.19); ctx.lineTo(Math.cos(a) * R * 1.45, Math.sin(a) * R * 1.45); ctx.lineTo(Math.cos(a + 0.26) * R * 0.95, Math.sin(a + 0.26) * R * 0.95); } ctx.lineTo(R * 0.15, -R * 0.45); ctx.lineTo(-R * 0.62, -R * 0.02); ctx.closePath(); ctx.fill(); return; }
  ctx.beginPath(); ctx.arc(0, 0, R + 3.5, Math.PI * 0.93, Math.PI * 1.98);
  ctx.quadraticCurveTo(R * 0.55, -R * 0.62, R * 0.12, -R * 0.5); ctx.quadraticCurveTo(-R * 0.25, -R * 0.42, -R * 0.62, -R * 0.05); ctx.quadraticCurveTo(-R * 0.86, R * 0.22, -R * 1.02, R * 0.2); ctx.closePath(); ctx.fill();
}
function figFace(S, p) {
  const R = S.headR, lx = R * (0.18 + 0.32 * p.look), ey = -R * 0.02, eh = Math.max(0.12, 1 - p.blink), l = S.eyes === "hollow" ? "#f4f6f8" : S.line;
  if (S.shadow) return;
  if (S.eyes === "wide") {
    for (const [x, r] of [[lx, 9.5], [lx + R * 0.38, 8.5]]) { ctx.fillStyle = "#f6f4ec"; ctx.beginPath(); ctx.ellipse(x, ey, r, r * 1.2 * eh, 0, 0, TAU); ctx.fill(); ctx.fillStyle = S.line; ctx.beginPath(); ctx.arc(x + 2, ey, 3.4, 0, TAU); ctx.fill(); }
  } else {
    ctx.fillStyle = l;
    ctx.beginPath(); ctx.ellipse(lx, ey, 4.2, 5.4 * eh, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(lx + R * 0.36, ey, 3.8, 5 * eh, 0, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = S.line; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  const b = p.brow || 0;
  ctx.beginPath(); ctx.moveTo(lx - 6, ey - 13 - b * 2); ctx.lineTo(lx + 6, ey - 13 + b * 5 - p.mouth * 3); ctx.stroke();
  const mx = lx + R * 0.16, my = R * 0.42;
  if (p.mouth > 0.2) { ctx.fillStyle = S.line; ctx.beginPath(); ctx.ellipse(mx, my, 4 + p.mouth * 2, 3 + p.mouth * 5, 0, 0, TAU); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(mx - 6, my); ctx.lineTo(mx + 5, my - 0.5); ctx.stroke(); }
}
function figWear(S, p, layer) {
  const R = S.headR, A = S.accessories;
  if (layer === "head") {
    const lx = R * (0.18 + 0.32 * p.look);
    if (A.includes("glasses")) { ctx.strokeStyle = S.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lx, 0, 10, 0, TAU); ctx.moveTo(lx + R * 0.36 + 10, 0); ctx.arc(lx + R * 0.36, 0, 10, 0, TAU); ctx.stroke(); }
    if (A.includes("moustache")) { ctx.fillStyle = S.hair; ctx.beginPath(); ctx.ellipse(lx + R * 0.16, R * 0.3, 13, 4.5, 0, 0, TAU); ctx.fill(); }
    if (A.includes("beard")) { ctx.fillStyle = S.hair; ctx.beginPath(); ctx.arc(R * 0.3, R * 0.55, R * 0.6, 0.1, Math.PI * 0.95); ctx.fill(); }
    if (A.includes("cap")) { ctx.fillStyle = S.accent; ctx.beginPath(); ctx.arc(0, -R * 0.2, R + 3, Math.PI, 0); ctx.closePath(); ctx.fill(); figRound(R * 0.3, -R * 0.3, R * 1.05, 8, 4); ctx.fill(); }
    if (A.includes("hardhat")) { ctx.fillStyle = S.accent; ctx.beginPath(); ctx.arc(0, -R * 0.15, R + 6, Math.PI, 0); ctx.closePath(); ctx.fill(); figRound(-R * 1.2, -R * 0.2, R * 2.5, 8, 4); ctx.fill(); }
    if (A.includes("crown")) { ctx.fillStyle = S.accent; ctx.beginPath(); ctx.moveTo(-R * 0.75, -R * 0.8); ctx.lineTo(-R * 0.75, -R * 1.45); ctx.lineTo(-R * 0.25, -R * 1.05); ctx.lineTo(0, -R * 1.55); ctx.lineTo(R * 0.3, -R * 1.05); ctx.lineTo(R * 0.8, -R * 1.45); ctx.lineTo(R * 0.8, -R * 0.75); ctx.closePath(); ctx.fill(); }
    if (A.includes("catears")) { ctx.fillStyle = S.hair; for (const x of [-0.6, 0.55]) { ctx.beginPath(); ctx.moveTo((x - 0.3) * R, -R * 0.8); ctx.lineTo(x * R, -R * 1.55); ctx.lineTo((x + 0.35) * R, -R * 0.85); ctx.closePath(); ctx.fill(); } }
  }
  if (layer === "back") {
    if (A.includes("pack")) { ctx.save(); ctx.translate(-44, -S.torso * 0.5); ctx.fillStyle = S.line; figRound(-24, -50, 48, 96, 15); ctx.fill(); ctx.fillStyle = S.accent; figRound(-20.5, -46.5, 41, 89, 12); ctx.fill(); ctx.fillStyle = S.accentShade; figRound(-20.5, 6, 41, 14, 4); ctx.fill(); ctx.restore(); }
    if (A.includes("cape")) { ctx.fillStyle = S.accent; ctx.beginPath(); ctx.moveTo(-18, -S.torso); ctx.quadraticCurveTo(-74, -S.torso * 0.3, -66, 54); ctx.lineTo(12, 22); ctx.closePath(); ctx.fill(); }
  }
  if (layer === "front" && A.includes("tie")) { ctx.fillStyle = S.accent; ctx.beginPath(); ctx.moveTo(6, -S.torso + 2); ctx.lineTo(14, -S.torso * 0.55); ctx.lineTo(4, -S.torso * 0.42); ctx.lineTo(-3, -S.torso * 0.55); ctx.closePath(); ctx.fill(); }
}
// x, y: สะโพกในเฟรมปัจจุบัน; s: ขนาด; face: 1 ขวา, -1 ซ้าย; p จาก figPose
function drawFig(x, y, s, face, p, spec, alpha) {
  const S = Object.assign({}, FIG_BASE, spec);
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s); ctx.lineJoin = "round"; if (alpha !== undefined) ctx.globalAlpha *= alpha;
  if (S.float) {
    // ผีลอย: ไม่มีขา ใช้ผ้าปลายแหลมแทน
    ctx.fillStyle = S.line; ctx.beginPath(); ctx.moveTo(-S.bodyW * 0.62, -6); ctx.quadraticCurveTo(-S.bodyW, 95, -6, 150); ctx.quadraticCurveTo(S.bodyW * 0.7, 80, S.bodyW * 0.62, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = S.shirt; ctx.beginPath(); ctx.moveTo(-S.bodyW * 0.5, -6); ctx.quadraticCurveTo(-S.bodyW * 0.8, 85, -6, 136); ctx.quadraticCurveTo(S.bodyW * 0.55, 75, S.bodyW * 0.5, -6); ctx.closePath(); ctx.fill();
  } else {
    figLeg(S, p.hipB, p.kneeB, true);
    // ชุดยาวต้องคลุมขา จึงวาดขาหน้าก่อนลำตัว
    if (S.top === "dress" || S.top === "robe") figLeg(S, p.hipF, p.kneeF, false);
  }
  ctx.save(); ctx.rotate(p.torso);
  figWear(S, p, "back");
  figArm(S, p.armB, p.elbowB, true);
  const w = S.bodyW;
  ctx.fillStyle = S.line; figRound(-w / 2 - 3.5, -S.torso - 8, w + 7, S.torso + 22, 22); ctx.fill();
  ctx.fillStyle = S.shirt; figRound(-w / 2, -S.torso - 4.5, w, S.torso + 15, 19); ctx.fill();
  if (S.top === "dress") { ctx.fillStyle = S.line; ctx.beginPath(); ctx.moveTo(-w / 2 - 4, -10); ctx.lineTo(-w * 0.95, 88); ctx.lineTo(w * 0.95, 88); ctx.lineTo(w / 2 + 4, -10); ctx.closePath(); ctx.fill(); ctx.fillStyle = S.shirt; ctx.beginPath(); ctx.moveTo(-w / 2, -8); ctx.lineTo(-w * 0.86, 84); ctx.lineTo(w * 0.86, 84); ctx.lineTo(w / 2, -8); ctx.closePath(); ctx.fill(); }
  else if (S.top !== "robe") { ctx.fillStyle = S.pants; figRound(-w / 2, -12, w, 22, 9); ctx.fill(); }
  figWear(S, p, "front");
  figLimb(S, 0, -S.torso, 0, -S.torso - S.neck - 6, 13, S.skin);
  ctx.save(); ctx.translate(0, -S.torso - S.neck - S.headR); ctx.rotate(p.head);
  figHairBack(S);
  ctx.fillStyle = S.line; ctx.beginPath(); ctx.arc(0, 0, S.headR + 3.5, 0, TAU); ctx.fill();
  ctx.fillStyle = S.skin; ctx.beginPath(); ctx.arc(0, 0, S.headR, 0, TAU); ctx.fill();
  figHairFront(S);
  figFace(S, p);
  figWear(S, p, "head");
  ctx.restore();
  figArm(S, p.armF, p.elbowF, false);
  ctx.restore();
  if (!S.float && S.top !== "dress" && S.top !== "robe") figLeg(S, p.hipF, p.kneeF, false);
  ctx.restore();
}
