'use strict';
// Оружие и расходники. Пивот оружия — точка хвата (0,0), ствол/лезвие смотрит вдоль +x.
const L = require('./lib');
const { INK, smooth, shape, line, g, dot, ell, dark, light, svg, poly, rect, f } = L;

const wood = '#a87c4c', iron = '#8e9396', steel = '#b4b9bc', grip = '#3a3030';
const tape = (x0, x1, h) => {
  let d = '';
  for (let x = x0; x < x1; x += 2.4) d += `M${f(x)} ${-h}L${f(x - 0.6)} ${h}`;
  return shape(poly([[x0 - 0.6, -h - 0.2], [x1, -h - 0.2], [x1, h + 0.2], [x0 - 0.6, h + 0.2]]), grip, { sw: 1, flat: true, nodrop: true, inner: line(d, 0.5, '#7a7068', 0.9) });
};
const nail = (x, y, a) => line(`M${x} ${y}L${x + 1} ${y + a * 4}`, 1.6, INK) + line(`M${x} ${y}L${x + 1} ${y + a * 4}`, 0.7, '#a9a59c');

function bat(spiked) {
  let s = shape(smooth([[-2, -1.4, 1], [12, -1.8], [24, -3.2], [36.6, -4.4], [38.6, -2.4], [38.6, 2.2], [36.6, 4.2], [24, 3], [12, 1.8], [-2, 1.4, 1]]), wood, { sh: [1.4, 1.6], sw: 1.3,
    inner: line('M14 -0.6Q24 -1.4 35 -1.8M18 1Q26 1.2 34 1.6', 0.5, '#5a3a20', 0.6) });
  s += tape(-2, 8, 2);
  const nails = spiked ? [[20, -3, -1], [24, -3.6, -1], [28, -4, -1], [32, -4.2, -1], [36, -4.4, -1], [22, 3, 1], [27, 3.6, 1], [31, 4, 1], [35, 4.2, 1]] : [[26, -3.6, -1], [31, -4.2, -1], [29, 3.6, 1], [34.4, 4, 1]];
  for (const [x, y, a] of nails) s += nail(x, y, a);
  if (spiked) s += shape(rect(17, -3.4, 3, 6.8), '#6a6a6e', { sw: 0.7, flat: true, nodrop: true }) + shape(rect(33, -4.4, 2.4, 8.8), '#6a6a6e', { sw: 0.7, flat: true, nodrop: true });
  return svg(-5, -9, 47, 18, s);
}
function knife() {
  let s = shape(smooth([[9, -1.8, 1], [24, -2.4], [29, -0.6, 1], [24, 1.6], [9, 1.8, 1]]), steel, { sw: 1.1, sh: [0.8, 1], nohatch: true, inner: line('M10 -0.4L24 -0.8', 0.6, '#fff', 0.6) });
  s += shape(rect(7, -3.2, 2.4, 6.4), '#5a5a5e', { sw: 0.9, flat: true, nodrop: true });
  s += shape(smooth([[-3, -2, 1], [7, -2, 1], [7, 2, 1], [-3, 2, 1], [-4, 0]]), '#4a3020', { sw: 1, sh: [0.8, 0.8], nohatch: true }) + dot(0, 0, 0.6, '#c9a65a') + dot(4, 0, 0.6, '#c9a65a');
  return svg(-6, -6, 38, 12, s);
}
function axe() {
  let s = shape(smooth([[-2, -1.6, 1], [34, -1.4, 1], [34, 1.4, 1], [-2, 1.6, 1]]), wood, { sw: 1.2, sh: [1, 1.2], inner: line('M2 -0.3L30 -0.3', 0.5, '#5a3a20', 0.6) });
  s += tape(-2, 6, 1.8);
  s += shape(smooth([[26, -2, 1], [26, -6], [30, -12, 1], [38, -13, 1], [36, -6], [35, 1.6, 1], [30, 1.6, 1]]), iron, { sw: 1.3, sh: [1.6, 1.4],
    inner: line('M30.6 -11.6L37 -12.4', 1.1, '#dfe2e4', 0.9) + `<path d="${ell(32, -5, 2, 1.4)}" fill="#7a3a1e" fill-opacity="0.6"/>` });
  return svg(-5, -16, 46, 22, s);
}
function pipe() {
  let s = shape(smooth([[-2, -2.2, 1], [38, -2.2, 1], [38, 2.2, 1], [-2, 2.2, 1]]), '#7a7e80', { sw: 1.2, sh: [1, 1.4], nohatch: true,
    inner: line('M0 -0.8L36 -0.8', 0.8, '#c4c8ca', 0.7) + `<path d="${ell(20, 0.6, 4, 1.2)}" fill="#7a3a1e" fill-opacity="0.7"/>` });
  s += shape(rect(34, -3.4, 6, 6.8), '#5e6264', { sw: 1, flat: true, nodrop: true }) + shape(rect(-3, -3.2, 4, 6.4), '#5e6264', { sw: 1, flat: true, nodrop: true });
  return svg(-6, -6, 49, 12, s);
}
function board() {
  let s = L.plank(-2, -2.6, 40, 5.2, '#7a5a3a', 7, { sw: 1.1 });
  s += nail(30, -2.6, -1) + nail(34, 2.4, 1) + line('M36 -2.6L38 -1L36.6 0.4L38 2.6', 1, INK);
  return svg(-5, -8, 46, 16, s);
}
function sledge() {
  let s = shape(smooth([[-2, -1.6, 1], [36, -1.4, 1], [36, 1.4, 1], [-2, 1.6, 1]]), wood, { sw: 1.2, sh: [1, 1.2] });
  s += tape(-2, 7, 1.9);
  s += shape(smooth([[33, -7, 1], [44, -7, 1], [45, -5], [45, 5], [44, 7, 1], [33, 7, 1], [32, 5], [32, -5]]), '#5e6264', { sw: 1.4, sh: [2, 2],
    inner: line('M34 -5L43 -5', 1, '#a0a4a6', 0.8) });
  return svg(-5, -10, 54, 20, s);
}
function crowbar() {
  let s = shape(smooth([[-4, -3, 1], [-1, -1.4], [33, -1.4], [36, -3.6], [38, -6, 1], [39.4, -5, 1], [37.4, -1.6], [35, 1.4], [-1, 1.4], [-4, 3.4, 1], [-6, 3, 1], [-3, 0]]), '#9a2a22', { sw: 1.1, sh: [1, 1.2], nohatch: true,
    inner: line('M2 -0.4L32 -0.4', 0.6, '#e08070', 0.7) });
  return svg(-9, -9, 52, 15, s);
}
function chair() {
  let s = '';
  s += shape(rect(10, -10, 4, 20), '#5e4630', { sw: 1, sh: [1, 1], nodrop: true });
  s += shape(rect(26, -10, 4, 20), '#5e4630', { sw: 1, sh: [1, 1], nodrop: true });
  s += L.plank(8, -3, 24, 6, '#7a5a3a', 3, { sw: 1 });
  s += shape(rect(-2, -10, 12, 3), '#6a4e36', { sw: 0.9, flat: true, nodrop: true }) + shape(rect(-2, 7, 12, 3), '#6a4e36', { sw: 0.9, flat: true, nodrop: true });
  s += shape(rect(28, -12, 4, 24), '#6a4e36', { sw: 1, sh: [1, 1] });
  return svg(-5, -15, 41, 30, s);
}
function pistol() {
  let s = shape(smooth([[-2, -3, 1], [22, -3, 1], [22, 1, 1], [6, 1, 1], [5, 3], [1, 3], [-1, 7, 1], [-5, 7, 1], [-3, 1], [-3, -2]]), '#3a3c40', { sw: 1.2, sh: [1, 1.2], nohatch: true,
    inner: line('M0 -1.6L21 -1.6', 0.6, '#8a8e92', 0.8) + line('M-4 4L-1 4M-3.6 5.6L-1.4 5.6', 0.5, '#6a6a6e') });
  s += line('M2 1Q3 4 5 2', 0.8, INK);
  return svg(-8, -6, 33, 16, s);
}
function shotgun() {
  let s = shape(smooth([[-10, -1, 1], [0, -2.4], [10, -2.6, 1], [44, -2.6, 1], [44, 0.6, 1], [12, 1.2, 1], [8, 3], [0, 3], [-10, 5, 1], [-12, 2]]), '#6a4a30', { sw: 1.2, sh: [1.2, 1.2] });
  s += shape(rect(10, -3, 34, 2.2), '#3a3c40', { sw: 0.9, flat: true, nodrop: true }) + shape(rect(16, 0.6, 16, 2.4), '#5a4030', { sw: 0.8, flat: true, nodrop: true, inner: line('M18 1L18 3M21 1L21 3M24 1L24 3M27 1L27 3M30 1L30 3', 0.5, INK) });
  return svg(-14, -6, 61, 14, s);
}
function molotov() {
  let s = shape(smooth([[-4.4, 0, 1], [-4.8, -11], [-2, -15], [-1.8, -20, 1], [1.8, -20, 1], [2, -15], [4.8, -11], [4.4, 0, 1]]), '#7a5a2a', { sw: 1.1, sh: [2, 1], nohatch: true,
    inner: `<rect x="-5" y="-9" width="10" height="9" fill="#b0681e" fill-opacity="0.8"/>` + line('M-2.6 -2L-2.6 -12', 1, '#fff', 0.4) });
  s += shape(smooth([[-1.6, -20], [-3, -24], [-1, -27], [1, -24], [2, -27], [3, -23], [1.6, -20]]), '#d6c49a', { sw: 0.9, flat: true, nodrop: true });
  s += shape(smooth([[-2, -26], [-1, -31], [0.6, -28], [2, -33, 1], [3.4, -27], [2, -25]]), '#f08a24', { sw: 0.7, flat: true, nodrop: true }) + shape(smooth([[-0.6, -26.4], [0.6, -29.6], [1.8, -26.4]]), '#ffd86a', { sw: 0, flat: true, nodrop: true });
  return svg(-7, -35, 14, 38, s);
}
function tknife() {
  let s = shape(smooth([[0, -1.6, 1], [12, -2], [16, 0, 1], [12, 2], [0, 1.6, 1]]), steel, { sw: 1, nohatch: true, sh: [0.6, 0.8] });
  s += shape(smooth([[-8, -1.4, 1], [0, -1.4, 1], [0, 1.4, 1], [-8, 1.4, 1], [-9, 0]]), '#3a3030', { sw: 0.9, flat: true, nodrop: true }) + dot(-6, 0, 0.9, '#2a2420');
  return svg(-11, -5, 30, 10, s);
}
// ресурсы-подбираемые
function cloth() {
  let s = shape(smooth([[-10, -2], [-6, -9], [2, -10], [9, -6], [10, 0], [4, 2], [-4, 2]]), '#8a7a62', { sw: 1, sh: [1.6, 1.4], hgap: 1.6,
    inner: line('M-6 -6Q0 -4 6 -7M-7 -2Q0 0 8 -3', 0.7, '#5a4a38', 0.8) + line('M-2 -9L-1 -6M4 -8L5 -5', 0.5, '#d8c8a8', 0.9) });
  return svg(-12, -13, 24, 17, s);
}
function fuel() {
  let s = shape(smooth([[-8, 2, 1], [-8, -12, 1], [-4, -16, 1], [8, -16, 1], [8, 2, 1]]), '#9a2a22', { sw: 1.2, sh: [2, 1.6],
    inner: line('M-5 -10L5 -2M5 -10L-5 -2', 1, dark('#9a2a22', 0.3)) });
  s += shape(rect(-3, -20, 4, 4), '#3a3634', { sw: 0.9, flat: true, nodrop: true }) + shape(rect(2, -19, 6, 3), '#3a3634', { sw: 0.9, flat: true, nodrop: true });
  return svg(-11, -23, 22, 27, s);
}
function ammo() {
  let s = shape(rect(-9, -9, 18, 10), '#4e5a3a', { sw: 1.1, sh: [1.4, 1.4], inner: line('M-6 -5L6 -5', 1, '#d8c48a') });
  for (let i = 0; i < 4; i++) s += shape(smooth([[-6 + i * 4, -9, 1], [-6 + i * 4, -13], [-5 + i * 4, -15, 1], [-4 + i * 4, -13], [-4 + i * 4, -9, 1]]), '#c9a040', { sw: 0.6, flat: true, nodrop: true });
  return svg(-12, -18, 24, 21, s);
}

function build(out) {
  out.w_bat = bat(false); out.w_spiked = bat(true); out.w_knife = knife(); out.w_axe = axe(); out.w_pipe = pipe();
  out.w_board = board(); out.w_sledge = sledge(); out.w_crowbar = crowbar(); out.w_chair = chair();
  out.w_pistol = pistol(); out.w_shotgun = shotgun();
  out.molotov = molotov(); out.tknife = tknife();
  out.cloth = cloth(); out.fuel = fuel(); out.ammo = ammo();
}
module.exports = { build };
