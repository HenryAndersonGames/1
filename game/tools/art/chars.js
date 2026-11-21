'use strict';
// Герои в «книжной» стилистике: вытянутые пропорции, тонкий ровный контур, плоские приглушённые цвета,
// круглые глаза-пуговки с белой каймой. Риг из частей → кадры анимации.
const L = require('./lib');
const { INK, smooth, shape, line, g, dot, ell, dark, light, svg, rect, poly, f } = L;

const LINE = '#2a1f1a';
const PAL = [
  // Вера: горчичный дождевик, рыжие косы, оливковые брюки, высокие сапоги
  { coat: '#c99a3a', coat2: '#a87a26', scarf: '#c0532e', pants: '#5d6340', boot: '#5a3a26', hair: '#a8492a', skin: '#e9c9a4' },
  // Лёва: шапка-ушанка, свитер с ромбами, тёмные брюки, светлые кеды
  { coat: '#5b7c7a', coat2: '#3e5a58', scarf: '#4fb3a4', pants: '#3a3a44', boot: '#d9d2c0', hair: '#6a4026', hat: '#8a3f36', skin: '#f0d6b8' },
];
// Плоские формы с тонким контуром (без штриховки и тяжёлой тени)
const F = (d, fill, o = {}) => shape(d, fill, Object.assign({ sw: 0.75, nodrop: true, flat: true }, o));
const Fs = (d, fill, o = {}) => shape(d, fill, Object.assign({ sw: 0.75, nodrop: true, sh: [2.2, 1.6], nolight: true, nohatch: true, dk: 0.16 }, o));
const thin = (d, w = 0.6, col = LINE, op = 1) => line(d, w, col, op);

// Риг: бедро на высоте 44, плечо на 29 выше бедра, рука 27
const RIG = { hipY: -44, shoulder: [3, -29], armLen: 26 };

function leg(c, dk, i) {
  const pc = dk ? dark(c.pants, 0.22) : c.pants, bc = dk ? dark(c.boot, 0.2) : c.boot;
  let s = Fs(poly([[-2.4, -1], [2.4, -1], [2.1, 40], [-2.1, 40]]), pc);
  if (i === 0) s += Fs(smooth([[-2.6, 26, 1], [2.6, 26, 1], [2.6, 40.5], [6.4, 42], [6.8, 44.4, 1], [-2.8, 44.4, 1], [-2.9, 40]]), bc) + thin('M-2.6 28.6L2.6 28.6', 0.5, '#000', 0.35);
  else s += Fs(smooth([[-2.4, 39.6, 1], [2.4, 39.6, 1], [5, 41], [6.6, 43], [6.2, 44.6, 1], [-2.6, 44.6, 1], [-2.8, 42]]), bc) + thin('M-2.6 43.4L6.2 43.4', 0.6, '#7a6a5a') + thin('M0 40.6L1.4 41.6', 0.5, '#7a6a5a');
  return s;
}
function arm(c, dk) {
  const cc = dk ? dark(c.coat, 0.22) : c.coat, sk = dk ? dark(c.skin, 0.2) : c.skin;
  let s = Fs(poly([[-2, -1.6], [2, -1.6], [1.9, 23], [-1.9, 23]]), cc);
  s += F(rect(-2.2, 21.6, 4.4, 2.6), dark(cc, 0.15));
  s += F(ell(0.1, 26.4, 2.3, 2.6), sk);
  return s;
}
function torso(c, i) {
  let s = F(rect(-1.3, -35, 2.6, 6), c.skin);
  if (i === 0) {
    s += Fs(smooth([[-5.6, -30, 1], [5.6, -30, 1], [7.2, -18], [10.4, 10, 1], [5, 11.4], [0, 10.4], [-5, 11.4], [-10.4, 10, 1], [-7.2, -18]]), c.coat, {
      inner: thin('M1.4 -29L2.6 10.6', 0.6) + dot(4, -22, 0.8, LINE) + dot(4.6, -14, 0.8, LINE) + dot(5.2, -6, 0.8, LINE) +
        thin('M-7.4 -4L-2 -4L-2 1L-7.8 1Z', 0.55) + thin('M-10 9Q0 7 10 9', 0.5, '#000', 0.25) });
    s += Fs(smooth([[-5.8, -30], [0, -27.4], [5.8, -30], [5.6, -33.2], [0, -30.8], [-5.6, -33.2]]), c.scarf, { inner: thin('M-3 -32.6L-2.6 -28.6M1 -31L1.2 -27.6M4 -32.4L3.6 -28.8', 0.7, dark(c.scarf, 0.3)) });
    s += Fs(smooth([[-4.4, -29.4], [-7.6, -22], [-9.6, -15, 1], [-6.6, -15.4, 1], [-4.6, -22]]), c.scarf);
  } else {
    let dia = ''; for (let k = -6; k <= 6; k += 4) dia += `M${k} -16L${k + 2} -13L${k} -10L${k - 2} -13Z`;
    s += Fs(smooth([[-5.8, -30, 1], [5.8, -30, 1], [7, -14], [7.6, 4, 1], [-7.6, 4, 1], [-7, -14]]), c.coat, {
      inner: thin(dia, 0.6, '#d9d2c0', 0.9) + thin('M-7 -6L7 -6M-7.4 0L7.4 0', 0.9, dark(c.coat, 0.25)) });
    s += Fs(smooth([[-6, -30], [0, -27], [6, -30], [5.8, -33.6], [0, -31], [-5.8, -33.6]]), c.scarf);
    s += Fs(smooth([[4, -29.4], [6.6, -20], [8.4, -14, 1], [5.6, -14.6, 1], [3.6, -22]]), c.scarf, { inner: thin('M5 -19L7.4 -18.4', 0.6, dark(c.scarf, 0.3)) });
  }
  return s;
}
function eyes(cx, cy) {
  let s = '';
  for (const [x, r] of [[cx, 2.3], [cx + 4.3, 2.15]]) s += F(ell(x, cy, r, r * 1.08), '#fbf6ea', { sw: 0.55 }) + dot(x + 0.7, cy + 0.2, r * 0.5, LINE);
  return s;
}
function head(c, i) {
  let s = '';
  if (i === 0) {
    s += Fs(smooth([[-7, -8], [-9.6, 2], [-9, 10], [-7, 16, 1], [-5, 10], [-5.6, 2], [-4.6, -6]]), c.hair, { inner: thin('M-9 2L-5.6 3M-8.8 7L-5.4 8M-8 12L-5.6 12.6', 0.55) });
    s += F(ell(-7, 17, 1.8, 1.4), c.scarf);
    s += Fs(smooth([[-9.2, -9], [-9.6, -16], [-5, -21.4], [3, -22], [9.4, -17], [10.4, -10], [8, -12], [-2, -13], [-7, -6]]), c.hair);
    s += Fs(ell(1.2, -10.4, 8.6, 9.6), c.skin);
    s += Fs(smooth([[-7, -14, 1], [-5.4, -19.4], [2, -21.2], [8.8, -17.6], [10, -13.2, 1], [6, -12.6, 1], [2, -13, 1], [-2, -12.8, 1], [-5.6, -13.4, 1]]), c.hair);
    s += eyes(1.8, -9.2);
    s += thin('M10 -6.6L10.8 -5.2L9.8 -4.8', 0.55) + thin('M5.4 -2.6Q6.8 -1.8 8.2 -2.6', 0.6);
    s += `<path d="${ell(9.4, -4.6, 1.6, 0.9)}" fill="#d98b72" fill-opacity="0.4"/>`;
  } else {
    s += Fs(ell(1, -10, 8.8, 9.8), c.skin);
    s += Fs(smooth([[-9.2, -10], [-8.6, -18], [-2, -22.6], [5, -22.4], [10.2, -17], [10.6, -11], [6, -14.4], [-3, -14.6]]), c.hat, { inner: thin('M-6 -19L-5 -14.6M-1 -21.6L-0.6 -14.6M4 -21.6L4 -14.4M8 -19L7.6 -13.4', 0.55, dark(c.hat, 0.35)) });
    s += Fs(smooth([[-9.6, -12], [-7.6, -12.6], [-6.6, -3], [-8.4, 0.4, 1], [-10.6, -3]]), '#d9cdb4', { inner: thin('M-9 -10L-8.6 -2', 0.5, '#9a8a6a') });
    s += thin('M-8.4 0.4L-8 6', 0.6) + F(ell(-8, 6.6, 1.2, 1.2), '#d9cdb4');
    s += Fs(smooth([[-8.4, -14.6], [0, -16.4], [10.6, -12.2], [10.4, -10.6], [0, -13.4], [-8.4, -12.6]]), '#d9cdb4');
    s += F(ell(-2.6, -23.4, 2.8, 2.6), '#d9cdb4');
    s += eyes(1.6, -8.2);
    for (const [x, y] of [[4.2, -4.4], [5.6, -3.8], [8.6, -4.2], [9.8, -4.8]]) s += dot(x, y, 0.4, '#a0603a');
    s += thin('M10.2 -5.6L11 -4.2L10 -3.8', 0.55) + thin('M5.6 -1.4L8.4 -1.8', 0.6);
  }
  return s;
}

// ---------- Позы ----------
function pose(i, P) {
  const c = PAL[i];
  const hy = RIG.hipY + (P.hy || 0) * 1.6, bob = P.bob || 0, lean = P.lean || 0;
  const up = `translate(0 ${f(hy + bob)}) rotate(${f(lean)})`;
  const sh = RIG.shoulder;
  let o = '';
  o += g(up, g(`translate(${-sh[0] - 1} ${sh[1]}) rotate(${f(P.up ? 176 : (P.ab ?? 6))})`, arm(c, true)));
  const ls = P.legS || 1;
  o += g(`translate(-1.6 ${f(hy)}) rotate(${f(P.lb || 0)}) scale(1 ${ls})`, leg(c, true, i));
  o += g(`translate(1.6 ${f(hy)}) rotate(${f(P.lf || 0)}) scale(1 ${ls})`, leg(c, false, i));
  o += g(up, torso(c, i) + (P.up ? g(`translate(${sh[0] + 1} ${sh[1]}) rotate(184)`, arm(c, false)) : '') + g(`translate(0.6 -33) rotate(${f(P.hd || 0)})`, head(c, i)));
  if (!P.up && P.fa !== undefined) o += g(up, g(`translate(${sh[0]} ${sh[1]}) rotate(${f(P.fa)})`, arm(c, false)));
  return o;
}
const frame = (i, P) => svg(-60, -112, 120, 120, pose(i, P));
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
  const lx = sx - Math.sin(ad) * 26.4, ly = sy + Math.cos(ad) * 26.4;
  return { x: lx * Math.cos(L) - ly * Math.sin(L), y: hip + lx * Math.sin(L) + ly * Math.cos(L) };
}

function build(out) {
  const meta = { poses: {}, rig: RIG, anims: {}, skin: PAL.map((c) => c.skin), coat: PAL.map((c) => c.coat) };
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
    out[`p${i}_arm`] = svg(-6, -5, 12, 36, arm(PAL[i], false));
    out[`p${i}_head`] = svg(-16, -30, 32, 40, head(PAL[i], i));
  }
  require('./weapons').build(out);
  out.__meta = meta;
}
module.exports = { build, PAL };
