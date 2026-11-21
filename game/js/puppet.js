'use strict';
// ---------- «Марионетка»: деформация картинки треугольной сеткой по костям (как Puppet pin в After Effects) ----------
// Части героя вырезаны из видео-разворота (js/herodata.js). Руки и ноги — сетки на двух костях
// (плечо→локоть→кисть, бедро→колено→стопа); у сустава вершины плавно смешивают влияние костей, поэтому
// рукав и штанина гнутся, а не ломаются. Углы: 0 — вниз, +90 — вперёд, 180 — вверх, −90 — назад.

const Puppet = { ready: false, P: [] };

function loadImg(b64) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
}
function imgCanvas(img, tint, alpha) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  if (tint) { x.globalCompositeOperation = 'source-atop'; x.globalAlpha = alpha; x.fillStyle = tint; x.fillRect(0, 0, c.width, c.height); }
  return c;
}
async function initPuppet() {
  for (const P of HERO.players) {
    const o = {};
    for (const [k, d] of Object.entries(P)) {
      const img = await loadImg(d.png);
      o[k] = Object.assign({}, d, { c: imgCanvas(img), fl: imgCanvas(img, '#ffffff', 0.85), dk: imgCanvas(img, '#20202a', 0.28), px: 2 });
      if (d.bones) o[k].mesh = limbMesh(o[k]);
      if (k === 'front' || k === 'back') o[k].mesh = gridMesh(o[k], 4, 9);
    }
    Puppet.P.push(o);
  }
  Puppet.rig = HERO.rig;
  Puppet.ready = true;
}

// ----- сетки -----
const ang = (x, y) => Math.atan2(x, y) * 180 / Math.PI; // 0 = вниз, +90 = вперёд (+x)
function limbMesh(part) {
  const [A, B, C] = part.bones, cols = 1;
  const W = part.c.width, H = part.c.height, verts = [], tris = [];
  const ax = C[0] - A[0], ay = C[1] - A[1], L2 = ax * ax + ay * ay;
  const tE = ((B[0] - A[0]) * ax + (B[1] - A[1]) * ay) / L2;
  // строки сетки только там, где кость гнётся (жёсткие участки — по одному куску): быстро на слабых ПК
  const vOf = (t) => clamp((A[1] + t * ay - part.o[1]) * 2, 0, H);
  const vs = [0];
  for (let k = 0; k <= 5; k++) vs.push(vOf(tE - 0.13 + 0.26 * k / 5));
  vs.push(H);
  const rows = vs.length - 1;
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const u = c / cols * W, v = vs[r];
    const wx = part.o[0] + u / 2, wy = part.o[1] + v / 2;
    const t = ((wx - A[0]) * ax + (wy - A[1]) * ay) / L2;
    const k = clamp((t - (tE - 0.11)) / 0.22, 0, 1), w = k * k * (3 - 2 * k);
    verts.push({ u, v, x: wx, y: wy, w });
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * (cols + 1) + c;
    tris.push([i, i + 1, i + cols + 1], [i + 1, i + cols + 2, i + cols + 1]);
  }
  return { verts, tris, A, B, C, r1: ang(B[0] - A[0], B[1] - A[1]), r2: ang(C[0] - B[0], C[1] - B[1]), l1: Math.hypot(B[0] - A[0], B[1] - A[1]), l2: Math.hypot(C[0] - B[0], C[1] - B[1]) };
}
function gridMesh(part, cols, rows) {
  const W = part.c.width, H = part.c.height, verts = [], tris = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) { const u = c / cols * W, v = r / rows * H; verts.push({ u, v, x: part.o[0] + u / 2, y: part.o[1] + v / 2 }); }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const i = r * (cols + 1) + c; tris.push([i, i + 1, i + cols + 1], [i + 1, i + cols + 2, i + cols + 1]); }
  return { verts, tris };
}
const rot = (x, y, a) => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };
// деформация конечности: A2 — новое положение корня, a1/a2 — абсолютные углы костей
function deformLimb(m, A2, a1, a2) {
  const d1 = -(a1 - m.r1), d2 = -(a2 - m.r2); // экранный поворот (y вниз): наш угол растёт к +x
  const [bx, by] = rot(m.B[0] - m.A[0], m.B[1] - m.A[1], d1);
  const B2 = [A2[0] + bx, A2[1] + by];
  const out = m.verts.map((p) => {
    const [x1, y1] = rot(p.x - m.A[0], p.y - m.A[1], d1);
    const [x2, y2] = rot(p.x - m.B[0], p.y - m.B[1], d2);
    const ax = A2[0] + x1, ay = A2[1] + y1, cx = B2[0] + x2, cy = B2[1] + y2;
    return [ax + (cx - ax) * p.w, ay + (cy - ay) * p.w];
  });
  const [cx, cy] = rot(m.C[0] - m.B[0], m.C[1] - m.B[1], d2);
  return { pts: out, elbow: B2, end: [B2[0] + cx, B2[1] + cy] };
}
// рисование сетки: каждый треугольник — аффинное отображение куска текстуры
function drawMesh(ctx, img, mesh, pts) {
  for (const [i, j, k] of mesh.tris) {
    const a = mesh.verts[i], b = mesh.verts[j], c = mesh.verts[k];
    const [x0, y0] = pts[i], [x1, y1] = pts[j], [x2, y2] = pts[k];
    const den = a.u * (b.v - c.v) - b.u * (a.v - c.v) + c.u * (a.v - b.v);
    if (Math.abs(den) < 1e-6) continue;
    const m11 = (x0 * (b.v - c.v) - x1 * (a.v - c.v) + x2 * (a.v - b.v)) / den;
    const m12 = (y0 * (b.v - c.v) - y1 * (a.v - c.v) + y2 * (a.v - b.v)) / den;
    const m21 = (a.u * (x1 - x2) - b.u * (x0 - x2) + c.u * (x0 - x1)) / den;
    const m22 = (a.u * (y1 - y2) - b.u * (y0 - y2) + c.u * (y0 - y1)) / den;
    const dx = (a.u * (b.v * x2 - c.v * x1) - b.u * (a.v * x2 - c.v * x0) + c.u * (a.v * x1 - b.v * x0)) / den;
    const dy = (a.u * (b.v * y2 - c.v * y1) - b.u * (a.v * y2 - c.v * y0) + c.u * (a.v * y1 - b.v * y0)) / den;
    // слегка расширяем треугольник, чтобы не было швов
    const mx = (x0 + x1 + x2) / 3, my = (y0 + y1 + y2) / 3, g = 1.06;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(mx + (x0 - mx) * g, my + (y0 - my) * g); ctx.lineTo(mx + (x1 - mx) * g, my + (y1 - my) * g); ctx.lineTo(mx + (x2 - mx) * g, my + (y2 - my) * g);
    ctx.closePath(); ctx.clip();
    ctx.transform(m11, m12, m21, m22, dx, dy);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}
function drawRigid(ctx, part, img, pivotW, at, angle) {
  ctx.save(); ctx.translate(at[0], at[1]); ctx.rotate(-angle * Math.PI / 180);
  ctx.drawImage(img, part.o[0] - pivotW[0], part.o[1] - pivotW[1], part.c.width / 2, part.c.height / 2);
  ctx.restore();
}

// ---------- Позы и анимации ----------
// поза: lean, hy (опускание таза), hd; ноги: tf/kf (бедро/колено передней), tb/kb (задней); руки: sf/ef (плечо/локоть передней), sb/eb; wa — угол оружия
const POSE0 = { lean: 0, hy: 0, hd: 0, tf: 0, kf: 4, tb: 0, kb: 4, sf: 4, ef: 10, sb: -4, eb: 10, wa: 80 };
const KP = (o) => Object.assign({}, POSE0, o);
const ANIM = {
  slash: [KP({ lean: -4, sf: -35, ef: 70, wa: -140, tf: 14, kf: 14, tb: -14, kb: 10, sb: 20, eb: 30 }), KP({ lean: -10, hy: 1.5, sf: -62, ef: 100, wa: -168, tf: 16, kf: 20, tb: -16, kb: 12, sb: 30, eb: 40, hd: -4 }),
    KP({ lean: 4, hy: 1, sf: 10, ef: 75, wa: -96, tf: 20, kf: 18, tb: -18, kb: 10, sb: 0, eb: 30 }), KP({ lean: 14, hy: 2, sf: 76, ef: 22, wa: -14, tf: 28, kf: 22, tb: -22, kb: 8, sb: -30, eb: 40, hd: 4 }),
    KP({ lean: 17, hy: 2.5, sf: 102, ef: 8, wa: 38, tf: 30, kf: 24, tb: -24, kb: 8, sb: -40, eb: 40, hd: 6 }), KP({ lean: 11, hy: 2, sf: 72, ef: 18, wa: 70, tf: 22, kf: 18, tb: -18, kb: 8, sb: -20, eb: 30 }), KP({ lean: 4, hy: 0.5, sf: 30, ef: 22, wa: 85, tf: 10, kf: 8, tb: -8, kb: 6 })],
  chop: [KP({ lean: -3, sf: 140, ef: 50, wa: -120, tf: 12, kf: 12, tb: -12, kb: 8 }), KP({ lean: -9, hy: 2, sf: 162, ef: 92, wa: -176, tf: 14, kf: 18, tb: -16, kb: 10, sb: 30, eb: 40, hd: -6 }),
    KP({ lean: 6, hy: 1, sf: 152, ef: 42, wa: -92, tf: 18, kf: 16, tb: -16, kb: 8 }), KP({ lean: 16, hy: 2.5, sf: 100, ef: 10, wa: -10, tf: 26, kf: 22, tb: -20, kb: 8, sb: -30, eb: 40, hd: 4 }),
    KP({ lean: 21, hy: 3.5, sf: 56, ef: 4, wa: 60, tf: 28, kf: 26, tb: -22, kb: 8, sb: -36, eb: 40, hd: 8 }), KP({ lean: 14, hy: 2.5, sf: 40, ef: 14, wa: 80, tf: 22, kf: 20, tb: -18, kb: 8 }), KP({ lean: 6, hy: 1, sf: 20, ef: 20, wa: 88, tf: 10, kf: 10, tb: -8, kb: 6 })],
  overhead: [KP({ lean: -10, hy: 3, sf: 150, ef: 80, wa: -140, tf: 18, kf: 24, tb: -24, kb: 18, sb: 40, eb: 40, hd: -4 }), KP({ lean: -20, hy: 5.5, sf: 172, ef: 122, wa: -178, tf: 22, kf: 34, tb: -30, kb: 26, sb: 60, eb: 50, hd: -9 }),
    KP({ lean: 0, hy: 3, sf: 160, ef: 50, wa: -96, tf: 30, kf: 26, tb: -30, kb: 16, sb: 20, eb: 30 }), KP({ lean: 22, hy: 5, sf: 96, ef: 8, wa: 0, tf: 36, kf: 34, tb: -32, kb: 10, sb: -40, eb: 40, hd: 6 }),
    KP({ lean: 29, hy: 7, sf: 46, ef: 0, wa: 74, tf: 38, kf: 40, tb: -32, kb: 10, sb: -52, eb: 40, hd: 9 }), KP({ lean: 23, hy: 6, sf: 36, ef: 10, wa: 84, tf: 30, kf: 32, tb: -26, kb: 10, sb: -34, eb: 36, hd: 6 }), KP({ lean: 10, hy: 3, sf: 20, ef: 20, wa: 90, tf: 16, kf: 16, tb: -12, kb: 8 })],
  thrust: [KP({ lean: -6, hy: 1, sf: 20, ef: 110, wa: 0, tf: 10, kf: 12, tb: -10, kb: 10, sb: -20, eb: 40 }), KP({ lean: -12, hy: 2, sf: 8, ef: 132, wa: -2, tf: 12, kf: 16, tb: -16, kb: 12, sb: -30, eb: 50, hd: -4 }),
    KP({ lean: 10, hy: 1, sf: 70, ef: 62, wa: 0, tf: 26, kf: 20, tb: -20, kb: 8, sb: -10, eb: 30 }), KP({ lean: 19, hy: 2, sf: 90, ef: 4, wa: 0, tf: 34, kf: 28, tb: -26, kb: 6, sb: -40, eb: 30, hd: 4 }),
    KP({ lean: 21, hy: 2.5, sf: 92, ef: 0, wa: 2, tf: 36, kf: 30, tb: -26, kb: 6, sb: -44, eb: 30, hd: 4 }), KP({ lean: 13, hy: 1.5, sf: 70, ef: 28, wa: 14, tf: 24, kf: 20, tb: -18, kb: 6 }), KP({ lean: 5, hy: 0.5, sf: 40, ef: 40, wa: 34, tf: 12, kf: 10, tb: -8, kb: 6 })],
  uppercut: [KP({ lean: 6, hy: 5, sf: -30, ef: 30, wa: 128, tf: 20, kf: 40, tb: -20, kb: 34 }), KP({ lean: 11, hy: 8, sf: -46, ef: 42, wa: 142, tf: 24, kf: 56, tb: -26, kb: 46, hd: 6 }),
    KP({ lean: 2, hy: 4, sf: 40, ef: 52, wa: -12, tf: 20, kf: 30, tb: -18, kb: 24 }), KP({ lean: -7, hy: 0, sf: 140, ef: 30, wa: -82, tf: 14, kf: 10, tb: -10, kb: 8, sb: -30, eb: 30, hd: -6 }),
    KP({ lean: -11, hy: -1, sf: 176, ef: 8, wa: -112, tf: 10, kf: 6, tb: -8, kb: 6, sb: -40, eb: 30, hd: -10 }), KP({ lean: -7, hy: 0, sf: 160, ef: 20, wa: -100, tf: 10, kf: 8, tb: -8, kb: 6 }), KP({ lean: -2, hy: 0.5, sf: 60, ef: 40, wa: -10, tf: 8, kf: 8, tb: -6, kb: 6 })],
  leap: [KP({ lean: 6, hy: 9, sf: 150, ef: 60, wa: -118, tf: 30, kf: 70, tb: -20, kb: 60, hd: 4 }), KP({ lean: 2, hy: 11, sf: 168, ef: 100, wa: -160, tf: 34, kf: 84, tb: -24, kb: 74 }),
    KP({ lean: -8, hy: -6, sf: 165, ef: 50, wa: -92, tf: 50, kf: 90, tb: 10, kb: 90, hd: -6 }), KP({ lean: 18, hy: -2, sf: 100, ef: 10, wa: -2, tf: 40, kf: 50, tb: -10, kb: 40, hd: 4 }),
    KP({ lean: 28, hy: 8, sf: 44, ef: 0, wa: 76, tf: 36, kf: 60, tb: -30, kb: 30, hd: 9 }), KP({ lean: 22, hy: 7, sf: 34, ef: 10, wa: 84, tf: 30, kf: 46, tb: -24, kb: 24, hd: 6 }), KP({ lean: 10, hy: 3, sf: 20, ef: 20, wa: 90, tf: 16, kf: 20, tb: -12, kb: 10 })],
  punch: [KP({ lean: -6, hy: 1, sf: 40, ef: 120, sb: 50, eb: 110, tf: 12, kf: 14, tb: -14, kb: 12 }), KP({ lean: -11, hy: 2, sf: 30, ef: 136, sb: 55, eb: 115, tf: 14, kf: 18, tb: -16, kb: 14, hd: -4 }),
    KP({ lean: 8, hy: 1, sf: 80, ef: 50, sb: 30, eb: 120, tf: 22, kf: 18, tb: -18, kb: 10 }), KP({ lean: 18, hy: 2, sf: 92, ef: 0, sb: 20, eb: 120, tf: 30, kf: 24, tb: -24, kb: 8, hd: 4 }),
    KP({ lean: 20, hy: 2.5, sf: 94, ef: 0, sb: 20, eb: 120, tf: 30, kf: 24, tb: -24, kb: 8, hd: 4 }), KP({ lean: 12, hy: 1.5, sf: 70, ef: 40, sb: 30, eb: 110, tf: 20, kf: 16, tb: -16, kb: 8 }), KP({ lean: 4, hy: 0.5, sf: 40, ef: 70, sb: 30, eb: 80, tf: 10, kf: 10, tb: -8, kb: 8 })],
  shoot: [KP({ sf: 88, ef: 0, wa: 0, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ sf: 90, ef: 0, wa: 0, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ lean: -7, sf: 100, ef: 12, wa: -10, tf: 10, kf: 8, tb: -10, kb: 8 }),
    KP({ lean: -4, sf: 94, ef: 6, wa: -4, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ sf: 90, ef: 0, wa: 0, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ sf: 90, ef: 0, wa: 0, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ sf: 90, ef: 0, wa: 0, tf: 10, kf: 8, tb: -10, kb: 8 })],
};
const PZ = {
  hurt: KP({ lean: -16, hd: -12, sf: -30, ef: 40, sb: -40, eb: 30, tf: -10, kf: 14, tb: 14, kb: 10, wa: 110 }),
  kneel: KP({ hy: 16, lean: 14, tf: 80, kf: 120, tb: -14, kb: 104, sf: 40, ef: 40, sb: 10, eb: 30, wa: 60 }),
  throw0: KP({ lean: -12, sf: -150, ef: 60, sb: 40, eb: 30, tf: 14, kf: 12, tb: -16, kb: 10 }),
  throw1: KP({ lean: 14, sf: 100, ef: 4, sb: -30, eb: 30, tf: 28, kf: 22, tb: -22, kb: 8 }),
};
const lerpPose = (A, B, t) => { const o = {}; for (const k in A) o[k] = A[k] + (B[k] - A[k]) * t; return o; };
const ease = (t) => t * t * (3 - 2 * t);
function animPose(name, u) { const F = ANIM[name], i = clamp(Math.floor(u), 0, F.length - 2); return lerpPose(F[i], F[i + 1], ease(clamp(u - i, 0, 1))); }
function walkPose(ph, carry) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return KP({ lean: 4, hy: Math.abs(c) * -1.4 + 0.6, tf: 24 * s, kf: 6 + 34 * Math.max(0, c) * (s > -0.3 ? 1 : 0.4), tb: -24 * s, kb: 6 + 34 * Math.max(0, -c) * (s < 0.3 ? 1 : 0.4),
    sf: carry ? 172 : -20 * s, ef: carry ? 30 : 18 + 14 * Math.max(0, s), sb: carry ? 168 : 20 * s, eb: carry ? 30 : 18 + 14 * Math.max(0, -s), hd: carry ? -6 : 0 });
}
function idlePose(t) { const b = Math.sin(t * 2.2); return KP({ hy: 0.4 + b * 0.5, hd: b * 1.5, sf: 4 + b * 2, ef: 12 + b * 3, sb: -4 - b * 2, eb: 12 + b * 3, kf: 5, kb: 5 }); }
function hopPose(k) {
  if (k < 0.18) return lerpPose(POSE0, KP({ hy: 9, tf: 30, kf: 62, tb: -14, kb: 58, sf: -30, ef: 40, sb: -40, eb: 40, lean: 10 }), ease(k / 0.18));
  if (k < 0.82) return lerpPose(KP({ hy: 9, tf: 30, kf: 62, tb: -14, kb: 58, sf: -30, ef: 40, sb: -40, eb: 40, lean: 10 }), KP({ hy: -4, tf: 56, kf: 96, tb: 20, kb: 100, sf: -50, ef: 60, sb: -60, eb: 50, lean: 14 }), ease(clamp((k - 0.18) / 0.3, 0, 1)));
  return lerpPose(KP({ hy: 8, tf: 26, kf: 56, tb: -16, kb: 48, sf: 20, ef: 40, sb: -10, eb: 40, lean: 8 }), POSE0, ease((k - 0.82) / 0.18));
}

// ---------- Сборка тела по позе (вид сбоку, лицом вправо; координаты от стопы) ----------
function rigSolve(P) {
  const R = Puppet.rig;
  const hip = [R.hip[0], R.hip[1] + P.hy];
  const tr = (p) => { const [x, y] = rot(p[0] - R.hip[0], p[1] - R.hip[1], P.lean); return [hip[0] + x, hip[1] + y]; };
  return { hip, shoulder: tr(R.shoulder), neck: tr(R.neck) };
}
// grip — точка хвата в кисти (чуть дальше запястья по предплечью)
function drawPuppet(ctx, i, P, opt = {}) {
  const S = Puppet.P[i], J = rigSolve(P);
  const img = (part, back) => opt.flash ? part.fl : back ? part.dk : part.c;
  const leg = S.leg, arm = S.arm;
  const legF = deformLimb(leg.mesh, J.hip, P.tf, P.tf - P.kf);
  const legB = deformLimb(leg.mesh, [J.hip[0] - 1.2, J.hip[1]], P.tb, P.tb - P.kb);
  const armF = deformLimb(arm.mesh, J.shoulder, P.sf, P.sf + P.ef);
  const armB = deformLimb(arm.mesh, [J.shoulder[0] - 2.4, J.shoulder[1] + 0.6], P.sb, P.sb + P.eb);
  const fa = (P.sf + P.ef) * Math.PI / 180, grip = [armF.end[0] + Math.sin(fa) * 3.6, armF.end[1] + Math.cos(fa) * 3.6];
  const wa = P.wa * Math.PI / 180, behind = P.wa < -112 || P.wa > 112;
  if (opt.weapon && behind) opt.weapon(grip, wa);
  drawMesh(ctx, img(arm, true), arm.mesh, armB.pts);
  drawMesh(ctx, img(leg, true), leg.mesh, legB.pts);
  drawMesh(ctx, img(leg), leg.mesh, legF.pts);
  drawRigid(ctx, S.torso, img(S.torso), S.torso.pivot, J.hip, -P.lean);
  drawRigid(ctx, S.head, img(S.head), S.head.pivot, J.neck, -(P.lean + P.hd));
  if (opt.weapon && !behind) opt.weapon(grip, wa);
  drawMesh(ctx, img(arm), arm.mesh, armF.pts);
  return { grip, wa };
}
// вид спереди/сзади: деформация всей картинки — шаги (колено «укорачивает» ногу) и взмах рук
function drawPuppetFB(ctx, i, view, ph, moving, flash) {
  const part = Puppet.P[i][view === 'f' ? 'front' : 'back'], m = part.mesh;
  const h = part.h, hem = -h * 0.3, sh = -h * 0.66, half = part.w / 2;
  const s = moving ? Math.sin(ph) : 0, bob = moving ? -Math.abs(Math.cos(ph)) * 1.6 : Math.sin(G.t * 2.2) * 0.4;
  const pts = m.verts.map((p) => {
    let x = p.x, y = p.y + bob;
    const side = Math.sign(p.x) || 1;
    if (p.y > hem) { const t = clamp((p.y - hem) / -hem, 0, 1), lift = Math.max(0, side * s) * 6; y -= lift * t; x += side * Math.max(0, side * s) * 1.2 * t; }
    if (Math.abs(p.x) > half * 0.62 && p.y > sh && p.y < hem + 8) { const t = clamp((p.y - sh) / (hem + 8 - sh), 0, 1); y -= Math.abs(s) * 1.5 * t; x += side * s * side * 1.4 * t; }
    return [x, y];
  });
  drawMesh(ctx, flash ? part.fl : part.c, m, pts);
  return { hand: [part.w * 0.38, -h * 0.36 + bob] };
}

// точка хвата без рисования (для следа удара)
function puppetGrip(i, P) {
  const S = Puppet.P[i], J = rigSolve(P);
  const armF = deformLimb(S.arm.mesh, J.shoulder, P.sf, P.sf + P.ef);
  const fa = (P.sf + P.ef) * Math.PI / 180;
  return [armF.end[0] + Math.sin(fa) * 3.6, armF.end[1] + Math.cos(fa) * 3.6];
}
