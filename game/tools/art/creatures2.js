'use strict';
// Остальные существа из бестиария: Гуль, Чёрный волк, Тыквопаук, Пустотник, Титан
const L = require('./lib');
const { INK, smooth, shape, line, g, dot, ell, dark, light, svg, poly, f, limb } = L;
const TAU = Math.PI * 2;

// ================= Гуль =================
const GS = '#7e7a88';
function gLeg(dk) {
  const c = dk ? dark(GS, 0.3) : GS;
  return shape(smooth([[-2.6, 0, 1], [-3.4, 6], [-1, 10], [-2.4, 15], [-3, 17.6, 1], [5.4, 18, 1], [5.8, 16.4], [2, 15], [2.6, 10], [3, 5], [2.6, 0, 1]]), c, { sw: 1.2, sh: [1.4, 1.2] }) +
    shape(ell(0.2, 10, 1.8, 1.6), c, { sw: 0.9, nodrop: true, flat: true });
}
function gArm(dk) {
  const c = dk ? dark(GS, 0.3) : GS, cl = dk ? dark('#d6caa4', 0.3) : '#d6caa4';
  let s = '';
  for (const p of [[[-2, 23, 1], [-4, 29, 1], [-0.6, 24, 1]], [[0, 23.6, 1], [0.4, 30, 1], [1.6, 23.4, 1]], [[1.8, 23, 1], [4.4, 28, 1], [3, 22.4, 1]]]) s += shape(smooth(p), cl, { sw: 0.8, flat: true, nodrop: true });
  s += shape(smooth([[-2, -1, 1], [-2.8, 8], [-1.6, 13], [-2.2, 20], [-3, 23.4], [3, 23.4], [2.2, 20], [2.6, 13], [3, 7], [2, -1, 1]]), c, { sw: 1.2, sh: [1.2, 1] });
  return s;
}
function gTorso() {
  let s = '';
  s += shape(smooth([[-7, 2], [-9.4, -6], [-8.4, -14], [-3, -19.4], [4, -20], [8.4, -16], [7.4, -8], [6, 0], [0, 3]]), GS, { sw: 1.4, sh: [2.4, 2],
    inner: line('M0 -14Q4 -15 7 -13M0 -10Q4 -11 6.6 -9.4M0 -6Q3 -7 6 -5.6', 0.6, INK, 0.6) });
  for (const [x, y] of [[-8.6, -6], [-8.6, -10.6], [-7.4, -15], [-4.4, -18.4]]) s += shape(ell(x, y, 1.3, 1.1), GS, { sw: 0.8, nodrop: true, flat: true });
  s += shape(smooth([[-8, -1], [7, -1], [7.4, 4, 1], [4, 2.4, 1], [2, 6, 1], [0, 2.6, 1], [-3, 5.6, 1], [-5, 2, 1], [-8.4, 3.6, 1]]), '#3e3530', { sw: 0.9, nodrop: true, flat: true });
  // голова — крупная, с острыми ушами и широкой ухмылкой
  s += shape(smooth([[2, -39], [-5, -47, 1], [1.4, -37.4]]), dark(GS, 0.1), { sw: 1, flat: true });
  s += shape(smooth([[0, -34], [1, -42.6], [6, -47], [13, -46.4], [17.4, -41], [17.6, -34], [14.4, -28.6], [8, -27], [2.4, -29]]), light(GS, 0.12), { sw: 1.4, sh: [2.2, 2] });
  s += shape(ell(12.6, -38.8, 2.4, 2), '#e8d470', { sw: 0.8, nodrop: true, flat: true }) + dot(13.1, -38.8, 0.9, INK);
  s += shape(ell(6.8, -39.4, 2, 1.8), '#e8d470', { sw: 0.8, nodrop: true, flat: true }) + dot(7.2, -39.4, 0.8, INK);
  s += line('M10 -42.4L15 -41.6M5 -42.6L8 -42.2', 0.9, INK);
  s += shape(smooth([[6.6, -33.4], [17.4, -34.6], [15.4, -30], [8.6, -30.2]]), '#2a1612', { sw: 0.9, nodrop: true, flat: true,
    inner: `<path d="M7 -33.4L8 -31.6L9 -33.6L10 -31.4L11 -33.8L12 -31.4L13 -34L14 -31.4L15 -34.2L16 -31.8L17 -34.4" fill="none" stroke="#eadfbe" stroke-width="0.7"/>` });
  return s;
}
function ghoulBody(ph, wind) {
  const s = Math.sin(ph), bob = -Math.abs(Math.cos(ph)) * 1.6;
  const la = wind ? 0 : s * 26, aa = wind ? -150 : -s * 16 - 10;
  let o = '';
  o += g(`translate(1 ${f(-32 + bob)}) rotate(${f(aa + 10)})`, gArm(true));
  o += g(`translate(-2 -18) rotate(${f(-la)})`, gLeg(true));
  o += g(`translate(2 -18) rotate(${f(la)})`, gLeg(false));
  o += g(`translate(0 ${f(-18 + bob)})`, gTorso());
  o += g(`translate(6 ${f(-31 + bob)}) rotate(${f(aa - 6)})`, gArm(false));
  return o;
}

// ================= Чёрный волк =================
const WC = '#26252d';
function wLegH(dk) {
  const c = dk ? dark(WC, 0.2) : WC;
  return shape(smooth([[-5, -3], [-7, 7], [-3, 13], [-4.6, 22], [-5.6, 27, 1], [3, 27, 1], [1, 22], [3, 12], [4.4, 0]]), c, { sw: 1.3, sh: [1.6, 1.4], lk: 0.22 });
}
function wLegF(dk) {
  const c = dk ? dark(WC, 0.2) : WC;
  return shape(smooth([[-2.6, -2], [-3, 14], [-3, 23], [-4.6, 27, 1], [4, 27, 1], [2.4, 23], [2.6, 12], [2.6, -2]]), c, { sw: 1.3, sh: [1.2, 1.2], lk: 0.22 });
}
function wolfTorso() {
  let b = '';
  // хвост
  b += shape(smooth([[-28, -8], [-38, -12], [-48, -10, 1], [-42, -6], [-47, -2, 1], [-38, -2], [-28, -2]]), WC, { sw: 1.2, sh: [1.6, 1.4], lk: 0.2 });
  b += shape(smooth([[-30, -2], [-28, -10], [-20, -15], [-8, -17], [4, -16], [14, -14], [20, -18], [26, -23.4], [32, -24.6], [38, -22], [46.4, -19, 1], [44.4, -15.6], [36.4, -14.4], [38.4, -11, 1], [30, -11], [24, -8], [16, -4], [6, 0], [-8, 2], [-22, 2]]), WC, { sw: 1.5, sh: [3, 2.4], lk: 0.22,
    inner: line('M-18 -12L-14 -8M-10 -14L-6 -10M-2 -14L2 -10M6 -13L10 -9', 0.8, '#55536a', 0.8) });
  // шерсть дыбом по хребту
  b += shape(smooth([[-24, -13], [-22, -20, 1], [-18, -15], [-14, -22, 1], [-10, -16.6], [-6, -23, 1], [-2, -17], [2, -22, 1], [6, -16.4], [10, -20, 1], [14, -14.6]]), WC, { sw: 1.2, flat: true, nodrop: true });
  b += shape(smooth([[26, -23.4], [27.4, -32, 1], [31.6, -24.6]]), WC, { sw: 1.1, flat: true });
  b += shape(ell(33.4, -20.6, 2, 1.3), '#f0de6a', { sw: 0.7, nodrop: true, flat: true }) + dot(33.8, -20.6, 0.6, INK);
  b += `<path d="M37 -14.4L38 -12.6L39 -14.6L40 -12.8L41 -15" fill="none" stroke="#eadfbe" stroke-width="0.8"/>`;
  return b;
}
function wolfBody(ph, wind) {
  const body = wolfTorso;
  const s = Math.sin(ph), bob = wind ? 7 : -Math.abs(Math.cos(ph)) * 2.4;
  const la = wind ? 0 : s * 32;
  let o = '';
  o += g(`translate(-17 ${f(-27 + bob * 0.3)}) rotate(${f(wind ? -30 : la)})`, wLegH(true));
  o += g(`translate(16 ${f(-27 + bob * 0.3)}) rotate(${f(wind ? 24 : -la)})`, wLegF(true));
  o += g(`translate(0 ${f(-28 + bob)}) rotate(${wind ? 7 : 0})`, body());
  o += g(`translate(-21 ${f(-26 + bob * 0.3)}) rotate(${f(wind ? -40 : -la)})`, wLegH(false));
  o += g(`translate(12 ${f(-26 + bob * 0.3)}) rotate(${f(wind ? 30 : la)})`, wLegF(false));
  return o;
}

// ================= Тыквопаук =================
function spiderTorso(wind) {
  let o = '';
  const ry = wind ? -30 : -24;
  // брюшко-тыква
  o += shape(ell(-10, ry, 21, 17.4), '#c06420', { sh: [4, 3], sw: 1.6, hgap: 2.4, lk: 0.2,
    inner: line(`M-10 ${ry - 17}Q-14 ${ry} -10 ${ry + 17}M-2 ${ry - 16}Q2 ${ry} -1 ${ry + 16}M-18 ${ry - 15}Q-24 ${ry} -19 ${ry + 15}M5 ${ry - 11}Q9 ${ry} 6 ${ry + 12}M-25 ${ry - 9}Q-29 ${ry} -26 ${ry + 9}`, 1, '#6a2e0c', 0.85) +
      `<path d="${ell(-18, ry + 6, 5, 3.4)}" fill="#3a4a24" fill-opacity="0.8"/><path d="${ell(0, ry - 8, 3, 2.2)}" fill="#3a4a24" fill-opacity="0.8"/>` +
      `<path d="${ell(-6, ry + 8, 4.4, 3)}" fill="#2a120a"/>` + line(`M-9 ${ry + 7}L-12 ${ry + 12}M-4 ${ry + 10}L-3 ${ry + 14}`, 1, '#4a5a20', 0.9) });
  o += shape(smooth([[-12, ry - 16], [-13, ry - 22], [-9, ry - 24, 1], [-9, ry - 17]]), '#4a5a2a', { sw: 1, flat: true });
  // головогрудь
  const hx = 14, hy = wind ? -30 : -18;
  o += shape(ell(hx, hy, 8, 7), '#2c2226', { sw: 1.4, sh: [1.6, 1.4], lk: 0.25 });
  for (const [x, y, r] of [[hx + 4, hy - 3, 1.5], [hx + 6.4, hy - 1, 1.1], [hx + 1.6, hy - 4, 1.1], [hx + 4.6, hy + 1, 0.9]]) o += dot(x, y, r, '#e0301e');
  o += limb([[hx + 6, hy + 3], [hx + 10, hy + 6], [hx + 8, hy + 9]], 1.4, '#d6c8a4', { sw: 0.8 }) + limb([[hx + 3, hy + 4], [hx + 6, hy + 8], [hx + 3.6, hy + 10]], 1.4, '#d6c8a4', { sw: 0.8 });
  return o;
}
function spiderBody(ph, wind) {
  let o = '';
  const legs = (side, dk) => {
    let s = '';
    const feet = [-30, -16, 6, 24];
    for (let i = 0; i < 4; i++) {
      const w = Math.sin(ph * 2 + i * 1.7 + side * 2) * 3.4;
      const bx = 4 - i * 2.4, by = -20;
      let fx = feet[i] + w + (side ? 3 : -3), fy = 0, kx = (bx + fx) / 2 + (i < 2 ? -4 : 4), ky = -44 - (i === 1 || i === 2 ? 4 : 0);
      if (wind && i >= 2) { fx = 26 + i * 4; fy = -30 - i * 4; kx = 22; ky = -50; }
      s += limb([[bx, by], [kx, ky], [fx, fy]], 2, dk ? '#1c1618' : '#2e2428', { sw: 1 });
    }
    return s;
  };
  o += legs(0, true);
  o += spiderTorso(wind);
  o += legs(1, false);
  return o;
}

// ================= Пустотник =================
function voidRobe(fl, sway) {
  const robe = '#2b2735';
  let o = '';
  // мантия с рваным подолом
  o += shape(smooth([[-13, fl - 10], [-17, fl - 34], [-15, fl - 62], [-9, fl - 82], [1, fl - 90], [11, fl - 86], [15.6, fl - 72], [16, fl - 44], [18 + sway, fl - 8], [17 + sway, fl + 2, 1], [12 + sway, fl - 4], [8 + sway * 0.6, fl + 6, 1], [4, fl - 3], [0 - sway * 0.4, fl + 8, 1], [-4, fl - 2], [-8 - sway, fl + 5, 1], [-11, fl - 4], [-15 - sway, fl + 1, 1]]), robe, { sh: [3.6, 3], sw: 1.5, lk: 0.14,
    inner: line(`M-6 ${fl - 70}Q-9 ${fl - 40} -6 ${fl - 6}M4 ${fl - 60}Q6 ${fl - 34} 5 ${fl - 6}`, 0.8, '#0e0c14', 0.7) });
  // капюшон и маска
  o += shape(smooth([[-6, fl - 78], [0, fl - 87], [10, fl - 84], [14, fl - 72], [12, fl - 60], [2, fl - 58], [-4, fl - 64]]), '#14111a', { sw: 1.2, flat: true, nodrop: true });
  o += shape(ell(6.4, fl - 71, 6.4, 8.6), '#e2ddd0', { sw: 1.2, sh: [1.6, 1.6], hop: 0.2, nodrop: true,
    inner: line(`M5 ${fl - 79}L6.6 ${fl - 74}L5.4 ${fl - 70}`, 0.6, INK, 0.7) + `<path d="${ell(8.6, fl - 72.4, 1.4, 0.8)}" fill="#3a3448"/><path d="${ell(4, fl - 72.6, 1.2, 0.7)}" fill="#3a3448"/>` });
  return o;
}
function voidBody(ph, wind) {
  const fl = -8 + Math.sin(ph) * 2.4, sway = Math.sin(ph + 1) * 2.4;
  let o = '';
  const robe = '#2b2735';
  // дальняя рука
  if (wind) o += g(`translate(2 ${f(fl - 58)}) rotate(-80)`, vArm(true));
  o += voidRobe(fl, sway);
  // ближняя рука
  o += g(`translate(6 ${f(fl - 56)}) rotate(${wind ? -84 : 18 + sway * 2})`, vArm(false));
  if (wind) o += `<path d="${ell(26, fl - 58, 7, 7)}" fill="#b48cff" fill-opacity="0.35"/>` + shape(ell(26, fl - 58, 4, 4), '#d8c4ff', { sw: 1, nodrop: true, flat: true });
  return o;
}
function vArm(dk) {
  const c = dk ? '#1c1924' : '#2b2735';
  let s = shape(smooth([[-4, -1, 1], [-5, 10], [-3.6, 16, 1], [3.6, 16, 1], [5, 9], [4, -1, 1]]), c, { sw: 1.2, sh: [1.2, 1], lk: 0.12 });
  s += limb([[0, 16], [0.6, 22], [0, 27]], 1.4, dk ? '#a8a294' : '#d6d0c2', { sw: 0.9 }) + limb([[-1.4, 16], [-2.4, 22], [-3, 26]], 1.2, dk ? '#a8a294' : '#d6d0c2', { sw: 0.8 }) + limb([[1.4, 16], [3, 21], [3.4, 25]], 1.2, dk ? '#a8a294' : '#d6d0c2', { sw: 0.8 });
  s += `<path d="${ell(0, 26, 3, 3)}" fill="#b48cff" fill-opacity="0.45"/>`;
  return s;
}

// ================= Титан =================
const TC = '#565961', TP = '#41434b';
function tLeg(dk) {
  const c = dk ? dark(TC, 0.3) : TC;
  let s = shape(smooth([[-15, -2], [-18, 14], [-17, 34], [-18, 46], [-23, 53, 1], [21, 53, 1], [18, 46], [16, 34], [17, 14], [15, -2]]), c, { sw: 1.8, sh: [3, 2.4], hgap: 2.6,
    inner: line('M-12 26Q0 29 12 26M-12 32Q0 35 12 32', 0.9, INK, 0.5) });
  for (const x of [-15, -4, 7]) s += shape(smooth([[x - 3, 52], [x, 47], [x + 4, 52], [x + 3, 54], [x - 2, 54]]), dk ? '#8a826c' : '#bcb294', { sw: 1, flat: true, nodrop: true });
  return s;
}
function tArm(dk) {
  const c = dk ? dark(TC, 0.3) : TC, p = dk ? dark(TP, 0.3) : TP;
  let s = shape(smooth([[-16, -8], [-21, 14], [-16, 36], [-10, 50], [-19, 64], [-23, 84], [-20, 100], [-10, 112], [8, 113], [20, 105], [23, 90], [20, 70], [14, 52], [20, 32], [21, 10], [16, -8]]), c, { sh: [4.6, 3.6], sw: 1.9, hgap: 2.6,
    inner: line('M-14 100Q0 104 14 100M-10 106Q2 109 14 104', 1, INK, 0.6) + line('M-6 70L2 78L-2 88', 1.4, '#e07a2a', 0.9) });
  s += shape(smooth([[-16, 58], [-4, 52], [14, 56], [18, 70], [6, 74], [-12, 72]]), p, { sw: 1.3, sh: [2, 1.8], nodrop: true });
  s += shape(smooth([[-16, 4], [-2, -2], [16, 4], [14, 22], [-12, 22]]), p, { sw: 1.3, sh: [2, 1.8], nodrop: true });
  return s;
}
function tBody() {
  let s = '';
  // сухие ветви и мох на спине — «оброс лесом»
  for (const [x, y, a, l] of [[-40, -112, -2.2, 30], [-18, -130, -1.9, 26], [6, -134, -1.4, 22]]) {
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
    s += limb([[x, y], [(x + ex) / 2 + 3, (y + ey) / 2], [ex, ey]], 3, '#3d322b', { sw: 1.2 }) + limb([[(x + ex) / 2, (y + ey) / 2], [(x + ex) / 2 - 8, (y + ey) / 2 - 6]], 1.6, '#3d322b', { sw: 1 });
  }
  s += shape(smooth([[-56, 0], [-66, -26], [-68, -60], [-58, -96], [-36, -124], [-6, -136], [24, -134], [50, -120], [62, -96], [66, -66], [60, -34], [48, -10], [24, 2], [-20, 6]]), TC, { sh: [7, 6], sw: 2.2, hgap: 3,
    inner: shape(smooth([[-10, -54], [14, -64], [40, -54], [40, -18], [14, 0], [-10, -8]]), light(TC, 0.1), { sw: 0, nodrop: true, flat: true }) +
      line('M-30 -40L-20 -30L-26 -18M10 -90L18 -80L14 -68L22 -58', 1.8, '#e07a2a', 0.95) + line('M-30 -40L-20 -30L-26 -18M10 -90L18 -80L14 -68L22 -58', 0.7, '#ffd08a', 0.9) +
      line('M-4 -46Q14 -50 34 -44M-4 -36Q14 -40 36 -34M0 -24Q16 -28 34 -22', 1, INK, 0.45) });
  for (const p of [[[-60, -60], [-48, -88], [-30, -82], [-38, -52]], [[-40, -104], [-20, -122], [0, -116], [-14, -96]], [[6, -120], [30, -126], [40, -108], [18, -102]], [[-56, -30], [-40, -40], [-34, -18], [-50, -10]]]) {
    s += shape(smooth(p.map((q) => [q[0], q[1], 1])), TP, { sw: 1.4, sh: [2.4, 2], inner: line(`M${p[0][0] + 4} ${p[0][1]}L${p[2][0] - 4} ${p[2][1] + 2}`, 0.8, '#7a7e88', 0.8) });
  }
  for (const [x, y, rx, ry] of [[-30, -122, 16, 6], [-52, -92, 9, 5], [10, -132, 12, 4.4]]) s += `<path d="${ell(x, y, rx, ry)}" fill="#4a5a34"/>` + line(`M${x - rx * 0.6} ${y}L${x - rx * 0.4} ${y - 3}M${x} ${y - 1}L${x + 1} ${y - 4}M${x + rx * 0.5} ${y}L${x + rx * 0.6} ${y - 3}`, 0.8, '#6a7a44');
  // голова
  s += shape(smooth([[34, -112], [40, -122.6], [52, -124.6], [61, -117], [61, -104], [52, -97], [40, -99]]), '#4e5058', { sw: 1.8, sh: [2.6, 2.2] });
  for (const [x, y] of [[54, -114], [47, -115], [57, -108], [50, -108.6]]) s += dot(x, y, 1.6, INK) + dot(x, y, 1.1, '#f0c860');
  s += shape(smooth([[44, -102], [60, -103], [57, -97.6], [46, -97.4]]), '#1e1414', { sw: 1, nodrop: true, flat: true,
    inner: `<path d="M45 -102L46.6 -99.6L48 -102.2L49.6 -99.6L51 -102.4L52.6 -99.6L54 -102.6L55.6 -99.8L57 -102.6" fill="none" stroke="#eadfbe" stroke-width="0.9"/>` });
  return s;
}
function titanBody(ph, wind) {
  const s = Math.sin(ph), bob = -Math.abs(Math.cos(ph)) * 3;
  const la = wind ? 0 : s * 10, aa = wind ? -170 : -s * 7;
  let o = '';
  o += g(`translate(-10 ${f(-166 + bob)}) rotate(${f(aa + (wind ? 14 : 4))})`, tArm(true));
  o += g(`translate(-24 -54) rotate(${f(-la)})`, tLeg(true));
  o += g(`translate(24 -54) rotate(${f(la)})`, tLeg(false));
  o += g(`translate(0 ${f(-54 + bob)})`, tBody());
  o += g(`translate(34 ${f(-158 + bob)}) rotate(${f(aa)})`, tArm(false));
  return o;
}

function build(out) {
  for (let k = 0; k < 4; k++) {
    const ph = k / 4 * TAU;
    out[`ghoul_walk${k}`] = svg(-32, -84, 66, 88, ghoulBody(ph, false));
    out[`wolf_walk${k}`] = svg(-54, -64, 112, 68, wolfBody(ph, false));
    out[`spider_walk${k}`] = svg(-48, -70, 100, 74, spiderBody(ph, false));
    out[`void_walk${k}`] = svg(-32, -110, 70, 120, voidBody(ph, false));
    out[`titan_walk${k}`] = svg(-104, -330, 216, 336, titanBody(ph, false));
  }
  out.ghoul_wind = svg(-32, -84, 66, 88, ghoulBody(0, true));
  out.wolf_wind = svg(-54, -64, 112, 68, wolfBody(0, true));
  out.spider_wind = svg(-48, -70, 100, 74, spiderBody(0, true));
  out.void_wind = svg(-32, -110, 70, 120, voidBody(0, true));
  out.titan_wind = svg(-104, -330, 216, 336, titanBody(0, true));
  out.ghoul_die = svg(-90, -68, 112, 72, g('translate(0 -32) rotate(-84)', ghoulBody(0.4, false)));
  out.wolf_die = svg(-54, -40, 112, 44, g('translate(0 18) rotate(10)', wolfBody(0, true)));
  out.spider_die = svg(-48, -50, 100, 54, g('translate(0 -48) scale(1 -1)', spiderBody(0.8, false)));
  out.void_die = svg(-120, -72, 150, 78, g('translate(4 -32) rotate(-84)', voidBody(0, false)));
  out.titan_die = svg(-350, -250, 390, 258, g('translate(0 -116) rotate(-82)', titanBody(0.4, false)));
}
module.exports = { build, P: { gLeg, gArm, gTorso, wLegH, wLegF, wolfTorso, vArm, voidRobe, tLeg, tArm, tBody, spiderTorso } };
