'use strict';
// ---------- «Марионетка»: деформация картинки треугольной сеткой по костям (как Puppet pin в After Effects) ----------
// Части героя вырезаны из видео-разворота (js/herodata.js). Руки и ноги — сетки на двух костях
// (плечо→локоть→кисть, бедро→колено→стопа); у сустава вершины плавно смешивают влияние костей, поэтому
// рукав и штанина гнутся, а не ломаются. Углы: 0 — вниз, +90 — вперёд, 180 — вверх, −90 — назад.

const Puppet = { ready: false, P: [] };
const HERO_SCALE = 0.74; // герои ниже зданий (раньше были выше крыш)

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
// s1/s2 — укорочение костей «в глубину» (колено/рука к камере), 1 — без изменений
function deformLimb(m, A2, a1, a2, s1 = 1, s2 = 1) {
  const d1 = -(a1 - m.r1), d2 = -(a2 - m.r2); // экранный поворот (y вниз): наш угол растёт к +x
  const u1 = [Math.sin(m.r1 * Math.PI / 180), Math.cos(m.r1 * Math.PI / 180)], u2 = [Math.sin(m.r2 * Math.PI / 180), Math.cos(m.r2 * Math.PI / 180)];
  const sq = (x, y, u, k) => { if (k === 1) return [x, y]; const t = (x * u[0] + y * u[1]) * (k - 1); return [x + u[0] * t, y + u[1] * t]; };
  const [bx, by] = rot(...sq(m.B[0] - m.A[0], m.B[1] - m.A[1], u1, s1), d1);
  const B2 = [A2[0] + bx, A2[1] + by];
  const out = m.verts.map((p) => {
    const [x1, y1] = rot(...sq(p.x - m.A[0], p.y - m.A[1], u1, s1), d1);
    const [x2, y2] = rot(...sq(p.x - m.B[0], p.y - m.B[1], u2, s2), d2);
    const ax = A2[0] + x1, ay = A2[1] + y1, cx = B2[0] + x2, cy = B2[1] + y2;
    return [ax + (cx - ax) * p.w, ay + (cy - ay) * p.w];
  });
  const [cx, cy] = rot(...sq(m.C[0] - m.B[0], m.C[1] - m.B[1], u2, s2), d2);
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
    const mx = (x0 + x1 + x2) / 3, my = (y0 + y1 + y2) / 3;
    const ex = (x, y) => { const dx = x - mx, dy = y - my, l = Math.hypot(dx, dy) || 1, k = 1 + 0.7 / l; return [mx + dx * k * 1.02, my + dy * k * 1.02]; };
    const [a0, b0] = ex(x0, y0), [a1, b1] = ex(x1, y1), [a2, b2] = ex(x2, y2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a0, b0); ctx.lineTo(a1, b1); ctx.lineTo(a2, b2);
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
// поза: lean, hy (опускание таза), hd; ноги: tf/kf (бедро/колено передней), tb/kb (задней); руки: sf/ef (плечо/локоть передней), sb/eb;
// wr — поворот оружия в кисти относительно предплечья (оружие всегда идёт за рукой); th — хват двумя руками (0..1).
// В ключах можно задать wd — абсолютное направление оружия (0 вниз, 90 вперёд, 180 вверх): пересчитывается в wr.
const POSE0 = { lean: 0, hy: 0, hd: 0, tf: 0, kf: 4, tb: 0, kb: 4, sf: 4, ef: 10, sb: -4, eb: 10, wr: 40, th: 0 };
const KP = (o) => {
  const r = Object.assign({}, POSE0, o);
  if (o.wa !== undefined) r.wd = 90 - o.wa;
  if (r.wd !== undefined) { r.wr = r.wd - (r.sf + r.ef); delete r.wd; }
  delete r.wa;
  return r;
};
const poseWD = (P) => P.sf + P.ef + P.wr;                     // направление оружия (градусы, 0 вниз, 90 вперёд)
const poseWA = (P) => (90 - poseWD(P)) * Math.PI / 180;       // экранный угол оружия (радианы)
// Удары по видео-референсу: большой замах за голову двумя руками → присед в широкой стойке → резкий удар
// с глубоким наклоном вперёд, свободная рука уходит назад для равновесия → возврат.
const ANIM = {
  slash: [KP({ lean: -5, hy: 1.5, sf: 110, ef: 80, wd: 230, th: 1, tf: 12, kf: 14, tb: -12, kb: 12 }), KP({ lean: -10, hy: 3, hd: -4, sf: 125, ef: 95, wd: 250, th: 1, tf: 16, kf: 22, tb: -18, kb: 18 }),
    KP({ lean: 2, hy: 2, sf: 115, ef: 45, wd: 165, th: 1, tf: 20, kf: 18, tb: -20, kb: 12 }), KP({ lean: 14, hy: 2.5, hd: 4, sf: 95, ef: 8, wd: 95, th: 0.8, tf: 26, kf: 22, tb: -24, kb: 8 }),
    KP({ lean: 18, hy: 3, hd: 5, sf: 70, ef: 2, wd: 45, th: 0.4, tf: 28, kf: 24, tb: -26, kb: 8, sb: -30, eb: 30 }), KP({ lean: 11, hy: 2, sf: 50, ef: 14, wd: 52, tf: 20, kf: 16, tb: -18, kb: 8 }), KP({ lean: 4, hy: 0.5, sf: 25, ef: 18, wd: 60, tf: 10, kf: 8, tb: -8, kb: 6 })],
  chop: [KP({ lean: -3, sf: 150, ef: 40, wd: 200, tf: 12, kf: 12, tb: -12, kb: 8 }), KP({ lean: -9, hy: 2, hd: -5, sf: 168, ef: 70, wd: 230, tf: 14, kf: 18, tb: -16, kb: 10, sb: 30, eb: 40 }),
    KP({ lean: 6, hy: 1, sf: 160, ef: 25, wd: 170, tf: 18, kf: 16, tb: -16, kb: 8 }), KP({ lean: 16, hy: 2.5, hd: 4, sf: 105, ef: 6, wd: 95, tf: 26, kf: 22, tb: -20, kb: 8, sb: -30, eb: 40 }),
    KP({ lean: 22, hy: 3.5, hd: 7, sf: 55, ef: 2, wd: 30, tf: 28, kf: 26, tb: -22, kb: 8, sb: -40, eb: 40 }), KP({ lean: 14, hy: 2.5, sf: 40, ef: 12, wd: 45, tf: 22, kf: 20, tb: -18, kb: 8 }), KP({ lean: 6, hy: 1, sf: 20, ef: 20, wd: 60, tf: 10, kf: 10, tb: -8, kb: 6 })],
  overhead: [KP({ lean: -6, hy: 2, hd: -3, sf: 150, ef: 100, wd: 215, th: 1, tf: 10, kf: 14, tb: -12, kb: 12 }), KP({ lean: -12, hy: 7, hd: -6, sf: 160, ef: 110, wd: 235, th: 1, tf: 26, kf: 44, tb: -28, kb: 38 }),
    KP({ lean: 6, hy: 6, sf: 175, ef: 30, wd: 185, th: 1, tf: 32, kf: 38, tb: -32, kb: 24 }), KP({ lean: 24, hy: 8, hd: 5, sf: 125, ef: 8, wd: 110, th: 0.6, tf: 40, kf: 44, tb: -38, kb: 14 }),
    KP({ lean: 36, hy: 12, hd: 10, sf: 62, ef: 0, wd: 28, tf: 46, kf: 60, tb: -42, kb: 10, sb: -120, eb: 20 }), KP({ lean: 32, hy: 11, hd: 8, sf: 58, ef: 4, wd: 24, tf: 44, kf: 56, tb: -40, kb: 10, sb: -110, eb: 30 }),
    KP({ lean: 8, hy: 2, sf: 24, ef: 20, wd: 70, tf: 14, kf: 12, tb: -12, kb: 8, sb: -10, eb: 20 })],
  thrust: [KP({ lean: -6, hy: 1, sf: 15, ef: 95, wd: 92, th: 1, tf: 10, kf: 12, tb: -10, kb: 10 }), KP({ lean: -12, hy: 2, hd: -4, sf: 0, ef: 115, wd: 95, th: 1, tf: 12, kf: 16, tb: -16, kb: 12 }),
    KP({ lean: 10, hy: 1, sf: 60, ef: 50, wd: 90, th: 1, tf: 26, kf: 20, tb: -20, kb: 8 }), KP({ lean: 19, hy: 2, hd: 4, sf: 88, ef: 4, wd: 88, th: 1, tf: 34, kf: 28, tb: -26, kb: 6 }),
    KP({ lean: 21, hy: 2.5, hd: 4, sf: 90, ef: 0, wd: 88, th: 1, tf: 36, kf: 30, tb: -26, kb: 6 }), KP({ lean: 13, hy: 1.5, sf: 65, ef: 30, wd: 80, th: 0.6, tf: 24, kf: 20, tb: -18, kb: 6 }), KP({ lean: 5, hy: 0.5, sf: 30, ef: 30, wd: 65, tf: 12, kf: 10, tb: -8, kb: 6 })],
  uppercut: [KP({ lean: 8, hy: 5, sf: -20, ef: 20, wd: -20, th: 1, tf: 20, kf: 40, tb: -20, kb: 34 }), KP({ lean: 12, hy: 8, hd: 6, sf: -35, ef: 25, wd: -40, th: 1, tf: 24, kf: 56, tb: -26, kb: 46 }),
    KP({ lean: 2, hy: 4, sf: 30, ef: 30, wd: 40, th: 1, tf: 20, kf: 30, tb: -18, kb: 24 }), KP({ lean: -8, hy: 0, hd: -6, sf: 130, ef: 20, wd: 140, th: 0.8, tf: 14, kf: 10, tb: -10, kb: 8 }),
    KP({ lean: -12, hy: -1, hd: -9, sf: 170, ef: 40, wd: 215, th: 0.6, tf: 10, kf: 6, tb: -8, kb: 6 }), KP({ lean: -7, hy: 0, sf: 160, ef: 60, wd: 230, th: 0.6, tf: 10, kf: 8, tb: -8, kb: 6 }), KP({ lean: -2, hy: 0.5, sf: 60, ef: 40, wd: 80, tf: 8, kf: 8, tb: -6, kb: 6 })],
  leap: [KP({ lean: 6, hy: 9, sf: 150, ef: 90, wd: 220, th: 1, tf: 30, kf: 70, tb: -20, kb: 60, hd: 4 }), KP({ lean: 2, hy: 11, sf: 165, ef: 105, wd: 240, th: 1, tf: 34, kf: 84, tb: -24, kb: 74 }),
    KP({ lean: -8, hy: -6, sf: 172, ef: 40, wd: 190, th: 1, tf: 50, kf: 90, tb: 10, kb: 90, hd: -6 }), KP({ lean: 18, hy: -2, sf: 115, ef: 10, wd: 100, th: 0.5, tf: 40, kf: 50, tb: -10, kb: 40, hd: 4 }),
    KP({ lean: 30, hy: 10, sf: 55, ef: 0, wd: 25, tf: 40, kf: 62, tb: -32, kb: 30, hd: 9, sb: -120, eb: 20 }), KP({ lean: 24, hy: 8, sf: 45, ef: 8, wd: 30, tf: 32, kf: 48, tb: -26, kb: 24, hd: 6, sb: -100, eb: 30 }), KP({ lean: 10, hy: 3, sf: 20, ef: 20, wd: 70, tf: 16, kf: 20, tb: -12, kb: 10 })],
  punch: [KP({ lean: -6, hy: 1, sf: 40, ef: 120, sb: 50, eb: 110, tf: 12, kf: 14, tb: -14, kb: 12 }), KP({ lean: -11, hy: 2, sf: 30, ef: 136, sb: 55, eb: 115, tf: 14, kf: 18, tb: -16, kb: 14, hd: -4 }),
    KP({ lean: 8, hy: 1, sf: 80, ef: 50, sb: 30, eb: 120, tf: 22, kf: 18, tb: -18, kb: 10 }), KP({ lean: 18, hy: 2, sf: 92, ef: 0, sb: 20, eb: 120, tf: 30, kf: 24, tb: -24, kb: 8, hd: 4 }),
    KP({ lean: 20, hy: 2.5, sf: 94, ef: 0, sb: 20, eb: 120, tf: 30, kf: 24, tb: -24, kb: 8, hd: 4 }), KP({ lean: 12, hy: 1.5, sf: 70, ef: 40, sb: 30, eb: 110, tf: 20, kf: 16, tb: -16, kb: 8 }), KP({ lean: 4, hy: 0.5, sf: 40, ef: 70, sb: 30, eb: 80, tf: 10, kf: 10, tb: -8, kb: 8 })],
  shoot: [KP({ sf: 88, ef: 0, wd: 90, th: 1, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ sf: 90, ef: 0, wd: 90, th: 1, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ lean: -7, sf: 100, ef: 12, wd: 100, th: 1, tf: 10, kf: 8, tb: -10, kb: 8 }),
    KP({ lean: -4, sf: 94, ef: 6, wd: 94, th: 1, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ sf: 90, ef: 0, wd: 90, th: 1, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ sf: 90, ef: 0, wd: 90, th: 1, tf: 10, kf: 8, tb: -10, kb: 8 }), KP({ sf: 90, ef: 0, wd: 90, th: 1, tf: 10, kf: 8, tb: -10, kb: 8 })],
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
// обратная кинематика: углы плеча и предплечья, чтобы кисть попала в точку T (локоть — вниз)
function ik2(S, T, l1, l2) {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.1, l1 + l2 - 0.05);
  const base = Math.atan2(dx, dy), A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  let best = null;
  for (const sg of [1, -1]) {
    const a1 = base + sg * A, ex = S[0] + Math.sin(a1) * l1, ey = S[1] + Math.cos(a1) * l1;
    if (!best || ey > best.ey) best = { a1, ex, ey };
  }
  const a2 = Math.atan2(T[0] - best.ex, T[1] - best.ey);
  return [best.a1 * 180 / Math.PI, a2 * 180 / Math.PI];
}
// grip — точка хвата в кисти (чуть дальше запястья по предплечью)
function drawPuppet(ctx, i, P, opt = {}) {
  const S = Puppet.P[i], J = rigSolve(P);
  const img = (part, back) => opt.flash ? part.fl : back ? part.dk : part.c;
  const leg = S.leg, arm = S.arm;
  const legF = deformLimb(leg.mesh, J.hip, P.tf, P.tf - P.kf);
  const legB = deformLimb(leg.mesh, [J.hip[0] - 1.2, J.hip[1]], P.tb, P.tb - P.kb);
  const armF = deformLimb(arm.mesh, J.shoulder, P.sf, P.sf + P.ef);
  const fa = (P.sf + P.ef) * Math.PI / 180, grip = [armF.end[0] + Math.sin(fa) * 3.6, armF.end[1] + Math.cos(fa) * 3.6];
  const wa = poseWA(P), behind = Math.cos(wa) < -0.37;
  const SB = [J.shoulder[0] - 2.4, J.shoulder[1] + 0.6];
  let ab = [P.sb, P.sb + P.eb];
  // хват двумя руками: дальняя рука тянется к рукояти чуть дальше ближней (обратная кинематика двух костей)
  if (opt.weapon && opt.twoHand && P.th > 0.5) ab = ik2(SB, [grip[0] + Math.cos(wa) * 4.6, grip[1] + Math.sin(wa) * 4.6], arm.mesh.l1, arm.mesh.l2);
  const armB = deformLimb(arm.mesh, SB, ab[0], ab[1]);
  if (opt.weapon && behind) opt.weapon(grip, wa);
  drawMesh(ctx, img(arm, true), arm.mesh, armB.pts);
  if (opt.p) drawGearArm(ctx, opt.p, armB, ab[1] * D2R);
  drawMesh(ctx, img(leg, true), leg.mesh, legB.pts);
  drawMesh(ctx, img(leg), leg.mesh, legF.pts);
  drawRigid(ctx, S.torso, img(S.torso), S.torso.pivot, J.hip, -P.lean);
  drawRigid(ctx, S.head, img(S.head), S.head.pivot, J.neck, -(P.lean + P.hd));
  if (opt.p) drawGearSide(ctx, opt.p, P, J, { legF, legB });
  if (opt.weapon && !behind) opt.weapon(grip, wa);
  drawMesh(ctx, img(arm), arm.mesh, armF.pts);
  if (opt.p) drawGearArm(ctx, opt.p, armF, fa);
  return { grip, wa };
}
// ---------- Вид спереди / сзади: тело + отдельные руки и ноги ----------
// Бег по референсу: колено идёт к камере (бедро укорачивается), стопа поднимается; руки согнуты в локтях
// и работают в противофазе с ногами — кулак поднимается к груди, другая рука уходит назад.
// поза: bob, sway; руки/ноги: [поворот плеча, поворот предплечья (от покоя, + к центру), укорочение 1, укорочение 2]
function fbRunPose(ph, k) {
  const s = Math.sin(ph), lift = (v) => Math.max(0, v);
  const L = lift(s) * k, R = lift(-s) * k;
  return {
    bob: (-Math.abs(s) * 2.6 + 1.2) * k, sway: s * 2.2 * k,
    legL: [4 * L, -6 * L, 1 - 0.4 * L, 1 - 0.32 * L], legR: [4 * R, -6 * R, 1 - 0.4 * R, 1 - 0.32 * R],
    // рука в противофазе ноге: правая нога вверх — левая рука вперёд (к груди)
    armL: [6 * R - 3 * L, 48 + 112 * R + 10 * L, 1 - 0.24 * R, 1 - 0.36 * R], armR: [6 * L - 3 * R, 48 + 112 * L + 10 * R, 1 - 0.24 * L, 1 - 0.36 * L],
  };
}
function fbIdlePose(t) {
  const b = Math.sin(t * 2.2);
  return { bob: b * 0.4, sway: 0, legL: [0, 0, 1, 1], legR: [0, 0, 1, 1], armL: [1 + b, 8 + b * 2, 1, 1], armR: [1 + b, 8 + b * 2, 1, 1] };
}
// opt.weapon(grip, waRad) — оружие в правой руке героя (спереди — слева на экране, сзади — справа)
function drawPuppetFB(ctx, i, view, pose, opt = {}) {
  const S = Puppet.P[i], v = view === 'f' ? 'f_' : 'b_';
  const body = S[v + 'body'], img = (p) => opt.flash ? p.fl : p.c;
  const hipY = S[v + 'legL'].bones[0][1], hip = [0, hipY + pose.bob];
  const tr = (p) => { const [x, y] = rot(p[0], p[1] - hipY, -pose.sway); return [hip[0] + x, hip[1] + y]; };
  const limb = (name, P, inward) => {
    const part = S[v + name], m = part.mesh, A = tr(part.bones[0]);
    const a1 = m.r1 + inward * P[0], a2 = m.r2 + inward * (P[0] + P[1]);
    return { part, d: deformLimb(m, A, a1, a2, P[2], P[3]), a2 };
  };
  const lL = limb('legL', pose.legL, 1), lR = limb('legR', pose.legR, -1);
  const aL = limb('armL', pose.armL, 1), aR = limb('armR', pose.armR, -1);
  const hand = view === 'f' ? aL : aR, out = view === 'f' ? -1 : 1;
  const fa = hand.a2 * Math.PI / 180, grip = [hand.d.end[0] + Math.sin(fa) * 2.4, hand.d.end[1] + Math.cos(fa) * 2.4];
  // оружие в кулаке: рука опущена — бита смотрит вниз-наружу, кулак у груди — бита над плечом
  const raise = clamp(((hand.a2 - hand.part.mesh.r2) * -out - 50) / 110, 0, 1), wd = out * (28 + 140 * raise), wa = (90 - wd) * Math.PI / 180;
  // ноги под пальто
  drawMesh(ctx, img(lL.part), lL.part.mesh, lL.d.pts); drawMesh(ctx, img(lR.part), lR.part.mesh, lR.d.pts);
  if (view === 'b') { if (opt.weapon) opt.weapon(grip, wa); drawMesh(ctx, img(aL.part), aL.part.mesh, aL.d.pts); drawMesh(ctx, img(aR.part), aR.part.mesh, aR.d.pts); if (opt.p) drawGearHands(ctx, opt.p, [aL, aR]); }
  drawRigid(ctx, body, img(body), [0, hipY], hip, -pose.sway);
  if (opt.p) drawGearFB(ctx, opt.p, view, pose, { lL, lR });
  if (view === 'f') { drawMesh(ctx, img(aR.part), aR.part.mesh, aR.d.pts); drawMesh(ctx, img(aL.part), aL.part.mesh, aL.d.pts); if (opt.p) drawGearHands(ctx, opt.p, [aL, aR]); if (opt.weapon) opt.weapon(grip, wa); }
  return { grip, wa };
}

// точка хвата без рисования (для следа удара)
function puppetGrip(i, P) {
  const S = Puppet.P[i], J = rigSolve(P);
  const armF = deformLimb(S.arm.mesh, J.shoulder, P.sf, P.sf + P.ef);
  const fa = (P.sf + P.ef) * Math.PI / 180;
  return [armF.end[0] + Math.sin(fa) * 3.6, armF.end[1] + Math.cos(fa) * 3.6];
}
