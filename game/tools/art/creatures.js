'use strict';
const L = require('./lib');
const { INK, smooth, shape, line, g, dot, ell, dark, light, svg, poly, f } = L;
const TAU = Math.PI * 2;

// ================= Бродяга =================
const WS = '#7c8671', WH = '#8b937f';
function wLeg(dk) {
  const c = dk ? dark(WS, 0.3) : WS;
  let s = shape(smooth([[-3.4, 0, 1], [-3.8, 8], [-2, 15], [-1.2, 18.5], [-2.6, 25], [-3, 31], [-2.6, 35.5], [-3.4, 38.2], [-1.5, 40.3, 1], [10.5, 40.2, 1], [11.4, 38.6], [9, 37.4], [3.2, 35.8], [2.6, 31], [3.6, 24], [5, 18.5], [4.6, 11], [3.6, 0, 1]]), c, { sh: [2.2, 1.6], sw: 1.3,
    inner: line('M4.6 38.2L5.2 40.2M7.4 37.8L8 40', 0.6, INK) + line('M-1 30Q0 33 -0.6 35', 0.5, INK, 0.5) });
  s += shape(ell(2, 18.6, 2.8, 2.3), c, { sw: 1.1, sh: [1.2, 1], nodrop: true });
  return s;
}
function wArm(dk) {
  const c = dk ? dark(WS, 0.3) : WS;
  let s = shape(smooth([[-3.2, -1, 1], [-4.2, 9], [-2.6, 19], [-1.8, 25.5], [-2.8, 33], [-2.4, 42], [-1.8, 48.5], [-3.6, 51.5], [3.4, 51.5], [2.4, 48.5], [3, 41], [3.6, 33], [3.6, 25.5], [4.2, 17], [4.4, 8], [3.2, -1.2, 1]]), c, { sh: [2.2, 1.4], sw: 1.3,
    inner: line('M-1 36Q0 40 -0.6 45', 0.5, INK, 0.5) });
  s += shape(ell(1, 25.5, 2.5, 2.1), c, { sw: 1.1, sh: [1, 1], nodrop: true });
  const claw = dk ? dark('#d8cca6', 0.3) : '#d8cca6';
  for (const p of [[[-3, 53.4, 1], [-5, 61.8, 1], [-1.4, 55, 1]], [[-0.6, 54.6, 1], [-0.6, 63.4, 1], [1.4, 55, 1]], [[2.2, 54, 1], [4.4, 61.4, 1], [4, 53, 1]]]) s += shape(smooth(p), claw, { sw: 1, flat: true, nodrop: true });
  s += shape(smooth([[-3.8, 49.6], [3.6, 49.6], [4.4, 53.6], [0, 55.6], [-4.2, 54]]), c, { sw: 1.2, sh: [1, 1], nodrop: true });
  return s;
}
function wTorso() {
  let s = '';
  const rag = smooth([[-9.6, -3, 1], [9.2, -3, 1], [9.6, 6, 1], [6.6, 3.6, 1], [5, 9.4, 1], [2, 4.6, 1], [-1, 10.4, 1], [-3.6, 5, 1], [-6.6, 8.8, 1], [-10, 4, 1]]);
  s += shape(smooth([[-8.6, 2], [-12, -6], [-13.6, -18], [-11, -28], [-5, -35.6], [3, -38.6], [9.6, -37], [13.2, -32], [12.6, -25], [10, -18], [8.6, -10], [8.6, -2], [5, 3], [-2, 4]]), WS, { sh: [3.4, 2.4], sw: 1.5,
    inner: line('M1.6 -27.6Q6.6 -29.6 11.4 -27M1.2 -23Q6 -24.6 10.6 -22.4M1.4 -18.4Q5.4 -19.6 9.4 -17.8M2 -13.8Q5 -14.6 8.6 -13.2', 0.7, INK, 0.65) + line('M2 -6Q4 -5 6 -6', 0.6, INK, 0.5) });
  for (const [x, y] of [[-12.6, -12], [-12.9, -18], [-11.8, -24], [-9.2, -29.6], [-5.2, -34]]) s += shape(ell(x, y, 1.7, 1.5), WS, { sw: 0.9, flat: true, nodrop: true });
  s += shape(rag, '#4b4037', { sh: [1.6, 1.6], sw: 1.2, inner: line('M-6 -1L-5 5M0 -1L0.6 7M5 -1L5.6 5', 0.5, '#000', 0.5) });
  // шея и голова
  s += shape(smooth([[7, -35], [12.6, -38.4], [16, -35], [12, -30.6]]), dark(WS, 0.1), { sw: 1.2, flat: true });
  s += shape(smooth([[9.6, -41], [10.6, -48.6], [15.6, -53.2], [21.6, -52.6], [26.2, -48], [27.2, -42], [25.6, -36.6], [22.6, -32.6], [18, -31.6], [13.6, -33], [10.6, -36.6]]), WH, { sh: [2.6, 2.2], sw: 1.5,
    inner: line('M12 -49Q15 -47 17 -50M23 -50Q22 -47 24 -45', 0.5, '#4a5040', 0.8) });
  s += `<path d="${ell(21.6, -43.6, 2.9, 2.5)}" fill="#17130f"/><path d="${ell(16, -44.4, 2.4, 2.2)}" fill="#17130f"/>`;
  s += dot(22, -43.6, 0.95, '#f0e6b4') + dot(16.3, -44.3, 0.8, '#f0e6b4');
  s += line('M13.6 -47.6Q17 -48.8 19.6 -47.4M19.6 -47.4Q22 -48.6 24.6 -47', 0.9, INK);
  s += shape(poly([[17, -37.2], [25.6, -37.8], [24, -34.4], [18, -34.4]]), '#2a1a14', { sw: 0.9, flat: true, nodrop: true,
    inner: line('M18.6 -37.4L19 -35.6M20.4 -37.5L20.6 -35.4M22.2 -37.6L22.2 -35.4M24 -37.7L23.6 -35.6', 0.6, '#e8dcb4') });
  return s;
}
function walkerBody(ph, wind) {
  const s = Math.sin(ph), bob = -Math.abs(Math.cos(ph)) * 2;
  const la = wind ? 0 : s * 20, aa = wind ? -150 : -s * 12 - 14;
  let o = '';
  o += g(`translate(3 ${f(-75 + bob)}) rotate(${f(aa + (wind ? 12 : 6))})`, wArm(true));
  o += g(`translate(-3 -40) rotate(${f(-la)})`, wLeg(true));
  o += g(`translate(3 -40) rotate(${f(la)})`, wLeg(false));
  o += g(`translate(0 ${f(-40 + bob)})`, wTorso());
  o += g(`translate(9 ${f(-74 + bob)}) rotate(${f(wind ? aa - 8 : aa - 4)})`, wArm(false));
  return o;
}

// ================= Прыгун =================
const JC = '#5d4a40';
function jHind(dk) {
  const c = dk ? dark(JC, 0.3) : JC;
  return shape(smooth([[-6, -3], [-8.6, 4], [-6, 10], [-1, 12.6], [-2.6, 18], [-4.4, 22, 1], [4.6, 22, 1], [4, 19.4], [3.6, 15], [5.6, 8.6], [5.6, 1], [2, -4.6]]), c, { sh: [2, 1.6], sw: 1.3,
    inner: line('M-3 22L-3.4 20.6M0 22L0 20.4M3 22L3.4 20.6', 0.6, '#e0d4b0') });
}
function jFront(dk) {
  const c = dk ? dark(JC, 0.3) : JC;
  return shape(smooth([[-2.6, -3], [-3.2, 8], [-2.4, 15], [-3.8, 20], [-5, 22, 1], [4.6, 22, 1], [2.6, 19.4], [2.6, 15], [3, 7], [3, -3]]), c, { sh: [1.6, 1.4], sw: 1.3,
    inner: line('M-3.6 22L-4 20.6M-0.6 22L-0.6 20.4M2.4 22L2.8 20.6', 0.6, '#e0d4b0') });
}
function jBody() {
  let s = '';
  s += L.limb([[-25, -3], [-32, -7], [-38, -5], [-40, -0.6]], 2, JC, { sw: 1.2 });
  for (const x of [-18, -11, -4, 3, 10]) s += shape(smooth([[x - 2.6, -12.4], [x + 0.4, -19.4, 1], [x + 2.8, -13]]), '#d6c8a4', { sw: 1, flat: true, nodrop: true });
  s += shape(smooth([[-26, 0], [-24, -8], [-16, -13], [-4, -14.6], [8, -12.6], [16, -10], [21, -12.4], [28, -14.2], [35, -12.6], [39.6, -8, 1], [40.6, -4], [36, -2.6, 1], [31.6, -2.8], [35.6, 1.6, 1], [30, 4], [23, 3.6], [18, 1], [10, 3], [0, 4.6], [-12, 4], [-22, 4], [-27, 3]]), JC, { sh: [3, 2.4], sw: 1.5,
    inner: shape(smooth([[-14, 4.6], [-6, 0.6], [6, 0.4], [14, 3]]), light(JC, 0.15), { sw: 0, nodrop: true, flat: true }) +
      line('M-10 -8Q-8 -2 -10 3M-5 -9Q-3 -3 -5 3M0 -9Q2 -3 0 3M5 -9Q6.6 -4 5 2', 0.7, INK, 0.55) +
      line('M20 -8Q24 -6 26 -9', 0.6, INK, 0.6) });
  s += shape(poly([[22.6, 0.8], [36, -2.4], [31.6, -2.6], [35.6, 1.4], [24, 3]]), '#2a1712', { sw: 0, nodrop: true, flat: true });
  let teeth = '';
  for (let i = 0; i < 6; i++) { const x = 24 + i * 2; teeth += `M${x} ${f(1 - i * 0.5)}L${x + 1} ${f(-1.2 - i * 0.5)}L${x + 2} ${f(0.8 - i * 0.5)}`; }
  s += `<path d="${teeth}" fill="#efe4c4" stroke="${INK}" stroke-width="0.4"/>`;
  s += shape(ell(30.6, -8.6, 2, 1.6), '#e0c45c', { sw: 0.9, flat: true, nodrop: true }) + dot(31.1, -8.6, 0.8, INK);
  s += line('M27 -11Q30.6 -12.6 33.6 -10.6', 1, INK);
  return s;
}
function jumperBody(ph, crouch) {
  const s = Math.sin(ph), bob = crouch ? 7 : -Math.abs(Math.cos(ph)) * 2;
  const la = crouch ? 0 : s * 20;
  let o = '';
  o += g(`translate(-15 ${f(-22 + bob * 0.4)}) rotate(${f(crouch ? -30 : la)})`, jHind(true));
  o += g(`translate(17 ${f(-22 + bob * 0.4)}) rotate(${f(crouch ? 26 : -la)})`, jFront(true));
  o += g(`translate(0 ${f(-24 + bob)}) rotate(${crouch ? 5 : 0})`, jBody());
  o += g(`translate(-19 ${f(-21 + bob * 0.4)}) rotate(${f(crouch ? -38 : -la)})`, jHind(false));
  o += g(`translate(13 ${f(-21 + bob * 0.4)}) rotate(${f(crouch ? 30 : la)})`, jFront(false));
  return o;
}

// ================= Прилипала =================
function clingerBody(ph, noLegs) {
  let o = '';
  const legs = (side, dk) => {
    let s = '';
    for (let i = 0; i < 3; i++) {
      const w = Math.sin(ph * 2 + i * 2 + side) * 2.4;
      const bx = -8 + i * 5, dir = i - 1;
      const pts = [[bx, -7], [bx + dir * 6 + w - 2, -15 + (side ? 0 : 2)], [bx + dir * 9 + w * 1.4 - 2, -1.2]];
      s += L.limb(pts, 1.3, dk ? '#5a4040' : '#8e706a', { sw: 0.9 });
    }
    return s;
  };
  if (!noLegs) o += legs(0, true);
  o += shape(ell(-2.4, -12, 10.6, 8.4), '#b59a8f', { sh: [2.6, 2.2], sw: 1.4,
    inner: line('M-8 -18Q-10 -12 -8 -5M-3 -19.6Q-5 -12 -3 -4M2 -19Q0.4 -12 2 -4.6', 0.7, '#6a4a44', 0.7) +
      `<path d="${ell(-6, -10, 1.8, 1.4)}" fill="#7a4a44" fill-opacity="0.6"/><path d="${ell(0, -15, 1.4, 1.1)}" fill="#7a4a44" fill-opacity="0.6"/>` });
  o += line('M-12 -15L-14.6 -16.6M-11.6 -9L-14.2 -8.4M-6 -20L-6.6 -22.6M0 -20L0.6 -22.6', 0.6, INK);
  o += shape(ell(8.4, -11, 5, 4.4), '#7d5a52', { sh: [1.6, 1.4], sw: 1.3 });
  o += dot(10, -12.6, 1.3, '#d4302a') + dot(10.4, -13, 0.4, '#ffd0c0') + dot(7.6, -13.6, 0.9, '#d4302a') + dot(11.6, -10, 0.8, '#d4302a');
  o += L.limb([[11.6, -9], [15, -8], [14.6, -5.4]], 1.2, '#cdbb98', { sw: 0.8 }) + L.limb([[12, -12.4], [15.6, -13], [16, -10.6]], 1.2, '#cdbb98', { sw: 0.8 });
  if (!noLegs) o += legs(1, false);
  return o;
}

// ================= Тяжеловес =================
const BC = '#6b4639', BL = '#8f6350', BONE = '#d8cba6';
function bLeg(dk) {
  const c = dk ? dark(BC, 0.3) : BC;
  let s = shape(smooth([[-9, -2], [-11, 8], [-10.6, 20], [-11, 27], [-14, 32, 1], [-12, 34.6, 1], [12, 34.6, 1], [12.6, 31], [9.6, 27], [9.6, 20], [10.6, 8], [9, -2]]), c, { sh: [2.6, 2], sw: 1.5,
    inner: line('M-7 18Q-1 20 6 18M-6 22Q0 23.6 5 22', 0.7, INK, 0.5) });
  for (const x of [-8, -1, 6]) s += shape(smooth([[x - 2.4, 33], [x, 30.4], [x + 2.6, 33], [x + 1.6, 34.8], [x - 1.6, 34.8]]), dk ? dark(BONE, 0.3) : BONE, { sw: 0.9, flat: true, nodrop: true });
  return s;
}
function bArm(dk) {
  const c = dk ? dark(BC, 0.3) : BC, cl = dk ? dark(BL, 0.3) : BL;
  let s = shape(smooth([[-10, -6], [-13, 8], [-10, 22], [-5, 32], [-11, 42], [-13.6, 54], [-12, 64], [-6, 71], [4, 72], [11.6, 67], [14, 58], [12.6, 46], [8.6, 33], [12.6, 20], [13, 6], [9.6, -6]]), c, { sh: [3.4, 2.6], sw: 1.6,
    inner: line('M-8 64Q-2 66 4 64M-6 68Q0 70 6 67.6M-3 58Q2 60 8 58', 0.8, INK, 0.6) + line('M-6 28Q0 31 7 29', 0.8, INK, 0.5) });
  s += shape(smooth([[-10, 40], [-3, 36], [6, 38], [10, 46], [4, 50], [-6, 49]]), cl, { sw: 1.1, sh: [1.6, 1.4], nodrop: true,
    inner: line('M-6 43L-2 44M0 41L3 43M3 46L6 45', 0.6, INK, 0.6) });
  return s;
}
function bBody() {
  let s = '';
  for (const p of [[[-30, -60], [-40, -73, 1], [-24, -65]], [[-18, -74], [-23, -92, 1], [-10, -78]], [[0, -80], [2, -98, 1], [8, -80]], [[14, -80], [20, -93, 1], [22, -78]]]) {
    s += shape(smooth(p), BONE, { sw: 1.3, sh: [1.4, 1.2], inner: line(`M${p[0][0] + 1} ${p[0][1] - 3}L${p[2][0] - 1} ${p[2][1] - 4}`, 0.6, INK, 0.6) });
  }
  s += shape(smooth([[-34, 0], [-40, -14], [-42, -34], [-36, -54], [-24, -70], [-6, -80], [12, -82], [28, -76], [37, -62], [40, -46], [38, -28], [32, -12], [24, -2], [8, 3], [-14, 4]]), BC, { sh: [5, 4], sw: 1.8, hgap: 2.6,
    inner: shape(smooth([[-6, -30], [14, -38], [30, -30], [28, -8], [10, 0], [-6, -4]]), light(BC, 0.12), { sw: 0, nodrop: true, flat: true }) +
      line('M0 -24Q12 -26 24 -22M-2 -16Q10 -18 26 -14M0 -8Q10 -10 22 -6', 0.8, INK, 0.45) +
      line('M-30 -30Q-18 -46 -4 -56', 1, INK, 0.8) + line('M-27 -36L-24 -32M-22 -42L-18 -40M-16 -47L-12 -45M-10 -52L-6 -50', 0.8, '#e8d6b0', 0.9) });
  for (const [x, y, rx, ry] of [[-26, -50, 7, 5.6], [-12, -64, 6, 4.6], [18, -70, 5, 4], [-34, -28, 4.6, 4]]) s += shape(ell(x, y, rx, ry), BL, { sw: 1.1, sh: [1.6, 1.4] });
  s += shape(smooth([[24, -70], [30, -76], [38, -74.4], [43, -66], [42.6, -57], [36, -52.4], [28, -53], [23, -59]]), '#7a5143', { sh: [2.4, 2], sw: 1.5 });
  s += shape(smooth([[26, -69], [33, -72], [41.6, -67], [40, -64], [32, -66], [27, -64]]), '#4a2e24', { sw: 0.9, flat: true, nodrop: true });
  s += dot(36.6, -62.6, 1.3, '#f0e2b0') + dot(31, -63, 1.1, '#f0e2b0');
  s += shape(smooth([[34, -54.4], [33, -62, 1], [37.4, -55]]), BONE, { sw: 0.9, flat: true, nodrop: true });
  s += shape(smooth([[39.6, -55.6], [41, -62.6, 1], [42.6, -56.6]]), BONE, { sw: 0.9, flat: true, nodrop: true });
  return s;
}
function bruteBody(ph, wind) {
  const s = Math.sin(ph), bob = -Math.abs(Math.cos(ph)) * 2;
  const la = wind ? 0 : s * 12, aa = wind ? -165 : -s * 8;
  let o = '';
  o += g(`translate(-6 ${f(-70 + bob)}) rotate(${f(aa + (wind ? 20 : 4))})`, bArm(true));
  o += g(`translate(-13 -34) rotate(${f(-la)})`, bLeg(true));
  o += g(`translate(13 -34) rotate(${f(la)})`, bLeg(false));
  o += g(`translate(0 ${f(-34 + bob)})`, bBody());
  o += g(`translate(20 ${f(-66 + bob)}) rotate(${f(aa)})`, bArm(false));
  return o;
}

const W = {
  walker: (ph, w) => svg(-40, -146, 82, 150, walkerBody(ph, w)),
  jumper: (ph, w) => svg(-46, -48, 92, 52, jumperBody(ph, w)),
  clinger: (ph) => svg(-22, -26, 44, 30, clingerBody(ph)),
  brute: (ph, w) => svg(-62, -168, 130, 172, bruteBody(ph, w)),
};
const N = require('./creatures2');
function build(out) {
  out.walker_die = svg(-150, -80, 186, 86, g('translate(0 -36) rotate(-84)', walkerBody(0.4, false)));
  out.brute_die = svg(-190, -156, 214, 162, g('translate(0 -60) rotate(-82)', bruteBody(0.4, false)));
  out.jumper_die = svg(-50, -34, 100, 38, g('translate(0 6) rotate(10)', jumperBody(0, true)));
  out.clinger_die = svg(-22, -26, 44, 30, g('translate(0 -26) scale(1 -1)', clingerBody(1.2)));
  N.build(out);
  for (let k = 0; k < 4; k++) {
    const ph = k / 4 * TAU;
    out[`walker_walk${k}`] = W.walker(ph, false);
    out[`jumper_walk${k}`] = W.jumper(ph, false);
    out[`clinger_walk${k}`] = W.clinger(ph);
    out[`brute_walk${k}`] = W.brute(ph, false);
  }
  out.walker_wind = W.walker(0, true);
  out.jumper_wind = W.jumper(0, true);
  out.clinger_wind = W.clinger(0.5);
  out.brute_wind = W.brute(0, true);
}
module.exports = { build, P: { wLeg, wArm, wTorso, jHind, jFront, jBody, bLeg, bArm, bBody, clingerBody } };
