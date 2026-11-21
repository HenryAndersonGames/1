'use strict';
// Герои в «книжной» стилистике: вытянутые пропорции, тонкий ровный контур, плоские приглушённые цвета,
// круглые глаза-пуговки с белой каймой. Риг из частей → кадры анимации.
const L = require('./lib');
const { INK, smooth, shape, line, g, dot, ell, dark, light, svg, rect, poly, f } = L;

const LINE = '#262028';
// Герой по референсу (видео-разворот): лысый, очки-гогглы на лбу, длинное пальто с воротником-стойкой,
// серая водолазка, широкие фиолетовые брюки, розовые ботинки. Тонкий ровный контур, плоский цвет.
const PAL = [
  { skin: '#f4a674', coat: '#4f8794', shirt: '#d9d9d4', pants: '#5f5078', shoe: '#ec7189', gog: '#4a4c58' },
  { skin: '#5b5c63', coat: '#e3b23a', shirt: '#d9d9d4', pants: '#5f5078', shoe: '#ec7189', gog: '#3a3c46' },
];
const F = (d, fill, o = {}) => shape(d, fill, Object.assign({ sw: 0.8, nodrop: true, flat: true }, o));
const thin = (d, w = 0.7, col = LINE, op = 1) => line(d, w, col, op);
const dk = (c, k = 0.12) => dark(c, k);
const RIG = { hipY: -40, shoulder: [1, -31], armLen: 29 };

// ---------- Вид сбоку (лицом вправо) ----------
function leg(c, back) {
  const pc = back ? dk(c.pants, 0.18) : c.pants, sc = back ? dk(c.shoe, 0.15) : c.shoe;
  let s = F(poly([[-4.6, -2], [4.4, -2], [4.2, 34.5], [-4.6, 34.5]]), pc) + thin('M0 4L0.4 30', 0.5, '#000', 0.25);
  s += F(smooth([[-5, 33, 1], [4.4, 33, 1], [5.2, 35.4], [9.4, 37.2], [10, 40.2, 1], [-5.4, 40.2, 1], [-5.8, 37]]), sc);
  return s;
}
function arm(c, back) {
  const cc = back ? dk(c.coat, 0.16) : c.coat, sk = back ? dk(c.skin, 0.12) : c.skin;
  let s = F(poly([[-3.4, -2.5], [3.6, -2.5], [4.3, 23], [-4, 23]]), cc) + thin('M-3.6 20.5L4 20.5', 0.6);
  s += F(smooth([[-2.4, 22.6], [2.8, 22.6], [3.4, 27], [2, 30.4], [-0.6, 30.6], [-2.6, 27.6]]), sk) + thin('M2.6 25L4.4 26.4L3 28', 0.6);
  return s;
}
function torso(c) {
  let s = F(rect(-2.4, -35, 5, 6), c.skin);
  // воротник-стойка за шеей
  s += F(smooth([[-7, -31, 1], [-8.4, -38.4, 1], [-3.6, -34.6], [-1, -31]]), dk(c.coat, 0.1));
  // пальто
  s += F(smooth([[-6.4, -31, 1], [-8.4, -22], [-10.4, -2], [-11.6, 11, 1], [9.6, 11, 1], [8.6, -6], [7.4, -22], [5.8, -31, 1]]), c.coat,
    { inner: thin('M-9.6 3L-10.8 10.6M-3 -6L-3.4 10.8', 0.55, '#000', 0.3) });
  // водолазка в распахе и лацкан
  s += F(poly([[2.6, -31], [6.6, -30.6], [7.4, -7], [3.6, -6]]), c.shirt);
  s += F(smooth([[1.8, -31, 1], [5.2, -26], [3.4, -15], [5.8, -6, 1], [8.4, -6, 1], [7.6, -24], [6.4, -31, 1]]), dk(c.coat, 0.06));
  s += F(smooth([[2.6, -31], [5, -37.4, 1], [6.8, -31]]), c.coat);
  return s;
}
function headSide(c) {
  let s = F(ell(2.2, -15.5, 14.4, 14.4), c.skin);
  s += thin('M-12 -22.2Q2 -26 16.2 -22.4', 4.6, LINE) + thin('M-12 -22.2Q2 -26 16.2 -22.4', 3, c.gog);
  s += F(rect(12.4, -27.4, 4.6, 9.6), dk(c.gog, 0.1), { sw: 0.7 }) + F(ell(17.8, -22.6, 2.6, 4.6), '#2c3644', { sw: 0.7 }) + dot(18.4, -24.4, 0.9, '#b8c8d8');
  s += dot(10.4, -13.6, 1.25, LINE) + thin('M10.2 -8.6Q12.4 -7 14.2 -9', 0.75);
  return s;
}

// ---------- Вид спереди и со спины ----------
function viewFB(c, back, ph, moving) {
  const st = moving ? Math.sin(ph) : 0, bob = moving ? -Math.abs(Math.cos(ph)) * 1.6 : 0;
  const lift = (k) => Math.max(0, k) * 4;
  let s = '';
  // ноги
  for (const sd of [-1, 1]) {
    const l = lift(sd * st), x = sd * 5.4;
    s += F(poly([[x - 4.4, -42 + bob], [x + 4.4, -42 + bob], [x + 4.4, -6 - l], [x - 4.4, -6 - l]]), c.pants);
    s += F(smooth([[x - 5.2, -7 - l, 1], [x + 5.2, -7 - l, 1], [x + 6, -2.6 - l], [x + 4.6, 0.2 - l, 1], [x - 4.6, 0.2 - l, 1], [x - 6, -2.6 - l]]), c.shoe);
  }
  const y = bob;
  // руки по бокам (качаются в такт)
  const armS = (sd) => {
    const sw = moving ? -sd * st * 1.6 : 0, x0 = sd * 12.4, x1 = sd * 15.6;
    return F(poly([[x0 - 3.4, -69 + y], [x0 + 3.4, -69 + y], [x1 + 3.6, -45 + y + sw], [x1 - 3.6, -45 + y + sw]]), back ? c.coat : dk(c.coat, 0.04)) +
      F(smooth([[x1 - 2.6, -45.6 + y + sw], [x1 + 2.6, -45.6 + y + sw], [x1 + 3, -41 + y + sw], [x1, -38.4 + y + sw], [x1 - 3, -41 + y + sw]]), c.skin);
  };
  if (!back) {
    s += F(poly([[-3, -71 + y], [3, -71 + y], [4.4, -44 + y], [-4.4, -44 + y]]), c.shirt);
    s += F(poly([[-5, -50 + y], [5, -50 + y], [5.6, -30 + y], [-5.6, -30 + y]]), c.pants);
  }
  s += armS(-1) + armS(1);
  if (back) {
    s += F(smooth([[-11, -70 + y, 1], [11, -70 + y, 1], [13.4, -50 + y], [16.4, -30 + y, 1], [-16.4, -30 + y, 1], [-13.4, -50 + y]]), c.coat,
      { inner: thin(`M0 ${-60 + y}L0 ${-31 + y}`, 0.55, '#000', 0.25) });
    s += F(smooth([[-8.6, -70 + y, 1], [-9.4, -78 + y, 1], [9.4, -78 + y, 1], [8.6, -70 + y, 1]]), dk(c.coat, 0.08));
  } else {
    for (const sd of [-1, 1]) {
      const X = (v) => sd * v;
      s += F(smooth([[X(11), -70 + y, 1], [X(3.2), -70 + y, 1], [X(5), -56 + y], [X(4.8), -30 + y, 1], [X(16.4), -30 + y, 1], [X(13.4), -50 + y]]), c.coat);
      s += F(smooth([[X(3.2), -70 + y, 1], [X(8.4), -61 + y, 1], [X(5), -52 + y, 1], [X(5), -56 + y]]), dk(c.coat, 0.07));
      s += F(smooth([[X(3), -70 + y, 1], [X(6.6), -78 + y, 1], [X(8.2), -70 + y, 1]]), c.coat);
    }
  }
  // голова
  s += F(rect(-2.6, -74 + y, 5.2, 5), c.skin);
  s += F(ell(0, -86 + y, 14.6, 14.6), c.skin);
  s += thin(`M-14.4 ${-91 + y}Q0 ${-95 + y} 14.4 ${-91 + y}`, 4.8, LINE) + thin(`M-14.4 ${-91 + y}Q0 ${-95 + y} 14.4 ${-91 + y}`, 3.2, c.gog);
  if (!back) {
    for (const sd of [-1, 1]) s += F(ell(sd * 5.6, -92.4 + y, 4.8, 4.6), c.gog, { sw: 0.8 }) + F(ell(sd * 5.6, -92.4 + y, 3.3, 3.1), '#2c3644', { sw: 0.5 }) + dot(sd * 5.6 + 1.2, -93.6 + y, 0.9, '#b8c8d8');
    s += dot(-4.6, -84 + y, 1.3, LINE) + dot(4.6, -84 + y, 1.3, LINE) + thin(`M-2.4 ${-79.6 + y}Q0 ${-78 + y} 2.4 ${-79.6 + y}`, 0.8);
  } else s += F(rect(-3, -93.6 + y, 6, 4.4), dk(c.gog, 0.1), { sw: 0.6 });
  return s;
}
const head = (c) => headSide(c);
// ---------- Позы ----------
function pose(i, P) {
  const c = PAL[i];
  const hy = RIG.hipY + (P.hy || 0) * 1.6, bob = P.bob || 0, lean = P.lean || 0;
  const up = `translate(0 ${f(hy + bob)}) rotate(${f(lean)})`;
  const sh = RIG.shoulder;
  let o = '';
  o += g(up, g(`translate(${-sh[0] - 1} ${sh[1]}) rotate(${f(P.up ? 176 : (P.ab ?? 6))})`, arm(c, true)));
  const ls = P.legS || 1;
  o += g(`translate(-1.6 ${f(hy)}) rotate(${f(P.lb || 0)}) scale(1 ${ls})`, leg(c, true));
  o += g(`translate(1.6 ${f(hy)}) rotate(${f(P.lf || 0)}) scale(1 ${ls})`, leg(c, false));
  o += g(up, torso(c) + (P.up ? g(`translate(${sh[0] + 1} ${sh[1]}) rotate(184)`, arm(c, false)) : '') + g(`translate(0.4 -33) rotate(${f(P.hd || 0)})`, headSide(c)));
  if (!P.up && P.fa !== undefined) o += g(up, g(`translate(${sh[0]} ${sh[1]}) rotate(${f(P.fa)})`, arm(c, false)));
  return o;
}
const frame = (i, P) => svg(-62, -136, 124, 144, pose(i, P));
const TAU = Math.PI * 2;
const POSES = {
  idle0: { bob: 0 }, idle1: { bob: 0.9, hd: 3 },
  atkL0: { lean: -9, lf: 8, lb: -14, ab: 24 },
  atkL1: { lean: 13, lf: 26, lb: -20, ab: -30, hy: 1.5 },
  atkH0: { lean: -18, lf: 20, lb: -30, ab: 40, hy: 4, hd: -6 },
  atkH1: { lean: 22, lf: 34, lb: -30, ab: -50, hy: 4, hd: 6 },
  hurt: { lean: -16, hd: -12, lf: -12, lb: 16, ab: 50 },
  kneel: { hy: 11, legS: 0.6, lf: -22, lb: 18, lean: 14, ab: 10, fa: -40 },
  roll: { hy: 14, legS: 0.55, lean: 70, lf: -100, lb: -70, ab: -60, hd: 20, fa: -90 },
  throw0: { lean: -12, lf: 14, lb: -16, ab: 30, fa: 150 },
  throw1: { lean: 14, lf: 28, lb: -22, ab: -20, fa: -100 },
};
// ---------- Анимации ударов: 7 кадров (2 замах · 3 удар · 2 возврат) ----------
// fa — угол передней руки (0 вниз, −90 вперёд, 180 вверх, 90 назад), wa — направление оружия в кадре (0 вперёд, −90 вверх, 90 вниз)
const K = (lean, hy, lf, lb, ab, fa, wa, hd = 0) => ({ lean, hy, lf, lb, ab, fa, wa, hd });
const ANIMS = {
  slash: [K(-4, 0, 6, -8, 20, 100, -150), K(-11, 1.5, 12, -16, 36, 138, -128, -4), K(4, 1, 18, -16, 0, -150, -70), K(14, 1.5, 26, -20, -24, -96, -8, 4), K(17, 2.5, 28, -22, -36, -46, 52, 6), K(11, 2, 20, -16, -20, -26, 72, 3), K(4, 0.5, 10, -8, 0, -12, 82)],
  chop: [K(-3, 0.5, 8, -10, 22, 158, -112), K(-9, 2, 12, -16, 40, 192, -150, -6), K(6, 1, 16, -14, 10, -166, -84), K(16, 2.5, 24, -18, -24, -110, -4, 4), K(21, 3.5, 28, -20, -36, -56, 66, 8), K(14, 2.5, 20, -16, -20, -36, 82, 4), K(6, 1, 10, -8, 0, -16, 88)],
  overhead: [K(-10, 3, 16, -24, 40, 172, -128, -4), K(-21, 5.5, 22, -32, 54, 208, -172, -9), K(0, 3, 28, -30, 0, -170, -92), K(22, 5, 36, -32, -40, -100, 0, 6), K(29, 7, 38, -32, -52, -40, 76, 9), K(23, 6, 30, -26, -34, -30, 84, 6), K(10, 3, 16, -12, -10, -14, 90, 2)],
  thrust: [K(-6, 1, 6, -10, 30, 48, 0), K(-12, 2, 10, -16, 44, 72, -4, -4), K(10, 1, 24, -20, -10, -62, 0, 2), K(19, 2, 34, -26, -30, -90, 0, 4), K(21, 2.5, 36, -26, -34, -96, 2, 4), K(13, 1.5, 24, -18, -20, -70, 14, 2), K(5, 0.5, 12, -8, 0, -30, 34)],
  uppercut: [K(6, 5, 18, -20, 20, 40, 128), K(11, 8, 24, -26, 30, 56, 140, 6), K(2, 4, 18, -18, 0, -62, -14), K(-7, 0, 10, -10, -30, -140, -82, -6), K(-11, -1, 8, -8, -40, -176, -112, -10), K(-7, 0, 8, -8, -24, -158, -100, -6), K(-2, 0.5, 6, -6, 0, -60, -10)],
  leap: [K(6, 8, 30, -30, 30, 150, -118, 4), K(2, 11, 34, -34, 46, 192, -160), K(-8, -8, -10, 12, 20, -168, -92, -6), K(18, -2, 20, -18, -30, -102, -2, 4), K(28, 8, 38, -32, -50, -42, 76, 9), K(22, 7, 30, -26, -34, -30, 84, 6), K(10, 3, 16, -12, -10, -14, 90, 2)],
  punch: [K(-6, 1, 6, -10, -20, 34, 0), K(-11, 2, 10, -16, -30, 48, 0, -4), K(8, 1, 22, -18, 20, -66, 0, 2), K(18, 2, 30, -24, 34, -92, 0, 4), K(20, 2.5, 32, -24, 36, -96, 0, 4), K(12, 1.5, 20, -16, 20, -70, 0), K(4, 0.5, 10, -8, 6, -30, 0)],
  shoot: [K(-2, 0, 8, -10, 10, -88, 0), K(-2, 0, 8, -10, 10, -90, 0), K(-7, 0, 8, -10, 14, -100, -10), K(-4, 0, 8, -10, 12, -94, -4), K(-2, 0, 8, -10, 10, -90, 0), K(-1, 0, 8, -10, 10, -90, 0), K(0, 0, 8, -10, 10, -90, 0)],
};
function handOf(P) {
  const r = (a) => a * Math.PI / 180, L = r(P.lean || 0);
  const hip = RIG.hipY + (P.hy || 0) * 1.6;
  const [sx, sy] = RIG.shoulder, ad = r(P.fa);
  const lx = sx - Math.sin(ad) * RIG.armLen, ly = sy + Math.cos(ad) * RIG.armLen;
  return { x: lx * Math.cos(L) - ly * Math.sin(L), y: hip + lx * Math.sin(L) + ly * Math.cos(L) };
}

function build(out) {
  const meta = { poses: {}, rig: RIG, anims: {}, skin: PAL.map((c) => c.skin), coat: PAL.map((c) => c.coat), fb: { hand: [15.6, -41] } };
  for (let i = 0; i < 2; i++) for (const [n, frames] of Object.entries(ANIMS)) frames.forEach((F, k) => {
    out[`p${i}_a_${n}${k}`] = frame(i, F);
    if (i === 0) { (meta.anims[n] = meta.anims[n] || []).push(Object.assign(handOf(F), { wa: F.wa, lean: F.lean, hy: F.hy * 1.6 })); }
  });
  for (let i = 0; i < 2; i++) {
    for (let k = 0; k < 6; k++) {
      const ph = k / 6 * TAU, s = Math.sin(ph), bob = -Math.abs(Math.cos(ph)) * 2.4;
      out[`p${i}_walk${k}`] = frame(i, { bob, lb: -s * 24, lf: s * 24, ab: -s * 20 + 6 });
      if (i === 0) meta.poses[`walk${k}`] = { bob, lean: 0, hy: 0 };
    }
    for (let k = 0; k < 4; k++) {
      const ph = k / 4 * TAU, s = Math.sin(ph), bob = -Math.abs(Math.cos(ph)) * 1.6;
      out[`p${i}_carry${k}`] = frame(i, { bob, lb: -s * 16, lf: s * 16, up: true, ab: 0 });
    }
    for (const [n, P] of Object.entries(POSES)) {
      out[`p${i}_${n}`] = frame(i, P);
      if (i === 0) meta.poses[n] = { bob: P.bob || 0, lean: P.lean || 0, hy: (P.hy || 0) * 1.6, baked: P.fa !== undefined };
    }
    out[`p${i}_down`] = svg(-112, -36, 132, 46, g('translate(6 -6) rotate(-86)', pose(i, { ab: 70, fa: -60, lf: 8, lb: -6, hd: -14 })));
    out[`p${i}_arm`] = svg(-6, -5, 12, 38, arm(PAL[i], false));
    out[`p${i}_head`] = svg(-18, -104, 36, 40, viewFB(PAL[i], false, 0, false));
    for (let k = 0; k < 4; k++) { out[`p${i}_fwalk${k}`] = svg(-30, -106, 60, 110, viewFB(PAL[i], false, k / 4 * TAU, true)); out[`p${i}_bwalk${k}`] = svg(-30, -106, 60, 110, viewFB(PAL[i], true, k / 4 * TAU, true)); }
    out[`p${i}_fidle`] = svg(-30, -106, 60, 110, viewFB(PAL[i], false, 0, false));
    out[`p${i}_bidle`] = svg(-30, -106, 60, 110, viewFB(PAL[i], true, 0, false));
  }
  require('./weapons').build(out);
  out.__meta = meta;
}
module.exports = { build, PAL };
