'use strict';
// Иконки особых способностей (круглые медальоны)
const L = require('./lib');
const { INK, smooth, shape, line, g, dot, ell, dark, light, svg, poly, rect, f } = L;
const medal = (bg, body) => svg(-20, -20, 40, 40, shape(ell(0, 0, 17, 17), bg, { sw: 1.8, sh: [3, 3], nohatch: true, lk: 0.2 }) + `<path d="${ell(0, 0, 14, 14)}" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="1"/>` + body);
function build(out) {
  out.ab_push = medal('#3a2e5a', line('M-8 -9Q-2 0 -8 9', 2.6, '#c8a8ff') + line('M-2 -11Q5 0 -2 11', 2.6, '#c8a8ff') + line('M4 -12Q12 0 4 12', 2.6, '#e8d8ff'));
  out.ab_bolt = medal('#2a3a5a', shape(poly([[3, -13], [-7, 2], [-1, 2], [-4, 13], [7, -3], [1, -3]]), '#f0e070', { sw: 1.2, flat: true, nodrop: true }));
  out.ab_fire = medal('#5a2a1e', shape(smooth([[-8, 8, 1], [-9, -1], [-4, -6], [-3, -12, 1], [2, -5], [4, -10, 1], [9, -1], [8, 8, 1]]), '#f08a24', { sw: 1.2, flat: true, nodrop: true }) + shape(smooth([[-4, 8, 1], [-4, 2], [0, -3, 1], [4, 2], [4, 8, 1]]), '#ffd86a', { sw: 0, flat: true, nodrop: true }));
  let fl = ''; for (let k = 0; k < 6; k++) fl += g(`rotate(${k * 60})`, line('M0 0L0 -12M0 -8L-3 -11M0 -8L3 -11', 1.8, '#dff2ff'));
  out.ab_frost = medal('#2a4a62', line('M0 0L0 0', 0.1, INK) + `<g stroke="${INK}">${fl.replace(/#dff2ff/g, INK).replace(/stroke-width="1.8"/g, 'stroke-width="3.4"')}</g>` + fl);
  out.ab_shadow = medal('#4a3a5a', shape(smooth([[-7, 12, 1], [-8, 0], [-6, -6], [0, -11], [6, -6], [8, 0], [7, 12, 1]]), '#1a1022', { sw: 1, flat: true, nodrop: true }) + dot(-2.6, -4, 1.3, '#c8a8ff') + dot(2.6, -4, 1.3, '#c8a8ff'));
  out.ab_dash = medal('#3a4a3a', shape(poly([[-2, -7], [9, 0], [-2, 7], [-2, 3], [-10, 3], [-10, -3], [-2, -3]]), '#e8e0c8', { sw: 1.2, flat: true, nodrop: true }) + line('M-13 -8L-7 -8M-14 8L-8 8', 1.6, '#e8a03c'));
  out.ab_quake = medal('#4a3e2e', line('M-12 6L-4 2L0 8L5 1L12 5', 2.4, INK) + shape(poly([[-6, -2], [-2, -10], [3, -4]]), '#8a7a62', { sw: 1, flat: true, nodrop: true }) + shape(poly([[4, -6], [8, -12], [10, -4]]), '#8a7a62', { sw: 1, flat: true, nodrop: true }));
  out.ab_whirl = medal('#4a3a2a', line('M0 0Q6 -2 5 -7Q2 -12 -5 -9Q-12 -4 -9 4Q-5 12 4 11Q12 9 13 1', 2.6, '#e8d8b0'));
  out.ab_medic = medal('#e6ddd0', shape(poly([[-3, -10], [3, -10], [3, -3], [10, -3], [10, 3], [3, 3], [3, 10], [-3, 10], [-3, 3], [-10, 3], [-10, -3], [-3, -3]]), '#c0362a', { sw: 1, flat: true, nodrop: true }));
  out.icon_oth = svg(-18, -18, 36, 36, shape(poly([[0, -15], [15, 11], [-15, 11]]), '#3a2e5a', { sw: 1.6, sh: [2, 2], nohatch: true }) + shape(ell(0, 3, 7, 4.4), '#e8e0d0', { sw: 1, flat: true, nodrop: true }) + dot(0, 3, 2.6, '#9a6aff') + dot(0, 3, 1, INK));
}
module.exports = { build };
