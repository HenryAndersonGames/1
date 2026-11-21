'use strict';
const L = require('./lib');
const { INK, smooth, shape, line, g, dot, ell, dark, light, svg, poly, f, rng, lerp } = L;

// ================= Ель =================
function tier(cx, yb, W, Ht, seed, col) {
  const r = rng(seed);
  const top = [cx + (r() - 0.5) * 3, yb - Ht];
  const Lt = [cx - W, yb + 3], Rt = [cx + W, yb + 3];
  const pts = [[Lt[0], Lt[1], 1]];
  const n = 4 + Math.round(W / 18);
  for (let i = 1; i < n; i++) {
    const t = i / n, e = [lerp(Lt[0], top[0], t), lerp(Lt[1], top[1], t)];
    pts.push([e[0] + 3 + 3 * (1 - t), e[1] - 1.5, 1]);
    pts.push([e[0] - 2 - 6 * (1 - t) * r(), e[1] + 3 + 5 * (1 - t), 1]);
  }
  pts.push([top[0], top[1], 1]);
  for (let i = n - 1; i >= 1; i--) {
    const t = i / n, e = [lerp(Rt[0], top[0], t), lerp(Rt[1], top[1], t)];
    pts.push([e[0] + 2 + 6 * (1 - t) * r(), e[1] + 3 + 5 * (1 - t), 1]);
    pts.push([e[0] - 3 - 3 * (1 - t), e[1] - 1.5, 1]);
  }
  pts.push([Rt[0], Rt[1], 1]);
  // нижний край — свисающие лапы
  const k = 3 + Math.round(W / 14);
  for (let i = 1; i < k; i++) {
    const x = lerp(Rt[0], Lt[0], i / k);
    pts.push([x + (W / k) * 0.5, yb - 3 - r() * 3]);
    pts.push([x, yb + 4 + r() * 4, 1]);
  }
  let hl = '';
  for (let i = 0; i < 6; i++) {
    const t = 0.2 + r() * 0.6, x = lerp(Lt[0], top[0], t) + 6 + r() * W * 0.5, y = lerp(Lt[1], top[1], t) + 4 + r() * 6;
    hl += `M${f(x)} ${f(y)}L${f(x - 4 - r() * 3)} ${f(y + 3 + r() * 2)}`;
  }
  return shape(smooth(pts), col, { sh: [6, 5], sw: 1.6, hgap: 2.4, hang: -62, hop: 0.5, dk: 0.45, lk: 0.12,
    inner: line(hl, 0.9, '#4d6656', 0.8) });
}
function pine(seed, h) {
  const r = rng(seed);
  let s = '';
  // корни и ствол
  s += shape(smooth([[-9, 1, 1], [-5.6, -4], [-5, -30], [-4, -46, 1], [4, -46, 1], [5, -30], [6, -4], [10, 1.4, 1], [4, 0], [0, 1.6], [-4, 0]]), '#3e2d22', { sh: [3, 2], sw: 1.5,
    inner: line('M-2 -40Q-3 -20 -1.6 -2M2 -36Q1 -18 2.4 -4', 0.6, INK, 0.6) });
  const tiers = 5 + (r() < 0.5 ? 1 : 0);
  const cols = ['#21312b', '#26372f', '#223029', '#29392f', '#24342c', '#2a3b31'];
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const yb = lerp(-24, -h + 44, t), W = lerp(54, 13, t) * (0.92 + r() * 0.12), Ht = lerp(h * 0.36, 46, t);
    s += tier((r() - 0.5) * 4, yb, W, Ht, seed * 13 + i, cols[(i + seed) % cols.length]);
  }
  return svg(-68, -h - 16, 136, h + 22, s);
}

// ================= Сухое дерево =================
function deadTree(seed) {
  const r = rng(seed);
  let br = '';
  const branch = (x, y, a, len, w, depth) => {
    if (len < 9 || depth > 4) return;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const mx = (x + ex) / 2 + Math.cos(a + 1.6) * len * 0.12 * (r() - 0.5) * 2, my = (y + ey) / 2 + Math.sin(a + 1.6) * len * 0.12;
    const nx = -Math.sin(a), ny = Math.cos(a), w2 = w * 0.45;
    const pts = [[x + nx * w / 2, y + ny * w / 2], [mx + nx * (w + w2) / 4, my + ny * (w + w2) / 4], [ex + nx * w2 / 2, ey + ny * w2 / 2, 1], [ex - nx * w2 / 2, ey - ny * w2 / 2, 1], [mx - nx * (w + w2) / 4, my - ny * (w + w2) / 4], [x - nx * w / 2, y - ny * w / 2]];
    br += shape(smooth(pts), '#3d322b', { sw: 1.2, sh: [1.4, 1.2], nodrop: true, nohatch: true });
    branch(ex, ey, a - 0.35 - r() * 0.35, len * (0.62 + r() * 0.12), w2 * 1.05, depth + 1);
    if (r() < 0.75) branch(ex, ey, a + 0.3 + r() * 0.35, len * (0.55 + r() * 0.12), w2, depth + 1);
  };
  branch(-1, -100, -Math.PI / 2 - 0.45, 38, 7, 0);
  branch(1, -102, -Math.PI / 2 + 0.55, 34, 6.4, 0);
  branch(-3, -66, -Math.PI + 0.55, 30, 5.6, 1);
  branch(3, -78, -0.42, 30, 5.6, 1);
  let s = br;
  s += shape(smooth([[-12, 1, 1], [-7, -6], [-6, -30], [-8, -52], [-4, -80], [-4, -104, 1], [4, -104, 1], [5, -82], [8, -56], [6, -30], [7, -6], [13, 1.4, 1], [5, -0.6], [0, 1.6], [-5, -0.6]]), '#3d322b', { sh: [4, 2.6], sw: 1.6,
    inner: line('M-2 -96Q-4 -70 -2 -40Q-1 -20 -3 -4M2 -90Q0 -60 2.6 -30M-1 -60Q1 -56 0 -50', 0.7, INK, 0.7) });
  s += shape(ell(1.4, -42, 2.4, 3.4), '#1e1612', { sw: 0.8, flat: true, nodrop: true });
  return svg(-75, -190, 150, 196, s);
}

// ================= Кусты =================
function bush(seed, berries) {
  const r = rng(seed);
  let s = '';
  const blobs = [[-14, -9, 11], [12, -9, 11], [0, -15, 13], [-6, -5, 10], [7, -5, 10]];
  blobs.forEach(([x, y, R], i) => {
    const pts = [];
    const n = 14;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2, rr = R * (k % 2 ? 0.8 : 1.04 + r() * 0.08);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.86, k % 2 ? 1 : 0]);
    }
    s += shape(smooth(pts), i % 2 ? '#2b3a2e' : '#324438', { sw: 1.3, sh: [2.6, 2.4], dk: 0.45, nodrop: i > 0,
      inner: line(`M${x - 4} ${y - 2}L${x - 7} ${y + 1}M${x + 1} ${y - 5}L${x - 2} ${y - 3}`, 0.8, '#4d6656', 0.8) });
  });
  if (berries) for (const [x, y] of [[-8, -12], [5, -16], [10, -7], [-2, -6], [-14, -6]]) s += dot(x, y, 1.6, INK) + dot(x, y, 1.1, '#7a1e2a') + dot(x - 0.4, y - 0.4, 0.35, '#e08a90');
  return svg(-30, -32, 60, 36, s);
}

// ================= Декали земли =================
function grass(seed, col) {
  const r = rng(seed);
  let s = '';
  const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const bx = -8 + i * 16 / n + r() * 2, h = 8 + r() * 9, lean = (r() - 0.5) * 9;
    s += shape(smooth([[bx - 1.4, 0, 1], [bx + lean * 0.5 - 0.4, -h * 0.55], [bx + lean, -h, 1], [bx + lean * 0.5 + 0.8, -h * 0.5], [bx + 1.4, 0, 1]]), i % 2 ? col : dark(col, 0.15), { sw: 0.7, nodrop: true, sh: [1, 0.6], nohatch: true });
  }
  return svg(-14, -20, 28, 22, s);
}
function fern(seed) {
  const r = rng(seed);
  let s = '';
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (k - 1.5) * 0.55, len = 14 + r() * 4;
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len;
    s += line(`M0 0Q${f(ex * 0.4)} ${f(ey * 0.6)} ${f(ex)} ${f(ey)}`, 1.6, INK) + line(`M0 0Q${f(ex * 0.4)} ${f(ey * 0.6)} ${f(ex)} ${f(ey)}`, 0.7, '#4a5a3c');
    for (let j = 1; j < 6; j++) {
      const t = j / 6, px = ex * t, py = ey * t + (1 - t) * 0, w = 4 * (1 - t) + 1;
      for (const sd of [-1, 1]) {
        const qx = px + Math.cos(a + sd * 1.2) * w, qy = py + Math.sin(a + sd * 1.2) * w;
        s += shape(smooth([[px, py, 1], [(px + qx) / 2 + 0.6, (py + qy) / 2 - 0.6], [qx, qy, 1], [(px + qx) / 2 - 0.6, (py + qy) / 2 + 0.6]]), '#3d4d34', { sw: 0.5, nodrop: true, flat: true });
      }
    }
  }
  return svg(-18, -22, 36, 24, s);
}
function mushrooms(seed) {
  const r = rng(seed);
  let s = '';
  const list = [[-4, 0, 1], [4, 1, 0.75], [9, 0, 0.55]];
  for (const [x, y, k] of list) {
    s += shape(smooth([[x - 1.6 * k, y, 1], [x - 1.2 * k, y - 6 * k], [x + 1.2 * k, y - 6 * k], [x + 1.6 * k, y, 1]]), '#d9ccb0', { sw: 0.8, sh: [0.8, 0.6] });
    s += shape(smooth([[x - 6 * k, y - 5 * k, 1], [x - 4 * k, y - 10 * k], [x + 2 * k, y - 11 * k], [x + 6 * k, y - 6 * k], [x + 6 * k, y - 5 * k, 1]]), '#8a3826', { sw: 1, sh: [1.6, 1.2], nohatch: true,
      inner: dot(x - 2 * k, y - 8 * k, 0.9 * k, '#e9d9b8') + dot(x + 2 * k, y - 9 * k, 0.7 * k, '#e9d9b8') + dot(x + 4 * k, y - 7 * k, 0.6 * k, '#e9d9b8') });
  }
  return svg(-12, -14, 26, 16, s);
}
function stone(seed, big) {
  const r = rng(seed), R = big ? 11 : 6;
  const pts = [];
  for (let k = 0; k < 8; k++) { const a = Math.PI + k / 8 * Math.PI; pts.push([Math.cos(a) * R * (0.8 + r() * 0.3), Math.sin(a) * R * 0.8 * (0.7 + r() * 0.4) + 1]); }
  pts.push([R * 0.9, 2], [0, 3], [-R * 0.9, 2]);
  return svg(-R - 4, -R - 4, R * 2 + 8, R + 10, shape(smooth(pts), big ? '#59564e' : '#4c4a44', { sw: 1.1, sh: [2, 2], dk: 0.45,
    inner: big ? line(`M${-R * 0.4} ${-R * 0.3}L${-R * 0.1} ${R * 0.1}L${R * 0.3} 0`, 0.6, INK, 0.7) + `<path d="${ell(-R * 0.3, R * 0.1, R * 0.3, R * 0.16)}" fill="#55663f" fill-opacity="0.6"/>` : '' }));
}
function leaves(seed) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < 4; i++) {
    const x = (r() - 0.5) * 16, y = (r() - 0.5) * 8, a = r() * 180, c = ['#6e4a26', '#8a5a2a', '#5a3c22', '#7a6a30'][i];
    s += g(`translate(${f(x)} ${f(y)}) rotate(${f(a)})`, shape(smooth([[-4, 0, 1], [0, -2.4], [4, 0, 1], [0, 2.4]]), c, { sw: 0.6, nodrop: true, flat: true }) + line('M-3.6 0L3.6 0', 0.4, INK, 0.7));
  }
  return svg(-14, -10, 28, 20, s);
}
function bones() {
  let s = '';
  s += g('rotate(-20)', shape(smooth([[-8, -1.2, 1], [8, -1.2, 1], [9, -3], [11, -2], [10.6, 0], [11, 2], [9, 3], [8, 1.2, 1], [-8, 1.2, 1], [-9, 3], [-11, 2], [-10.6, 0], [-11, -2], [-9, -3]]), '#d6caa8', { sw: 0.9, sh: [1, 1] }));
  s += shape(smooth([[2, -4], [9, -6], [13, -3], [12, 1.6], [6, 2], [2, 0]]), '#cfc2a0', { sw: 0.9, sh: [1.4, 1.2], inner: dot(9.6, -2.6, 1.2, INK) + dot(6, -2.2, 1, INK) });
  return svg(-14, -10, 30, 16, s);
}
function stump() {
  let s = shape(smooth([[-11, 0, 1], [-10, -8], [-9, -12, 1], [9, -12, 1], [10, -8], [12, 0, 1], [6, -1], [0, 1], [-6, -1]]), '#4a382a', { sh: [3, 1.6], sw: 1.4, inner: line('M-5 -10L-5 -1M1 -11L1 0M6 -10L6 -1', 0.6, INK, 0.6) });
  s += shape(ell(0, -12, 9, 3.6), '#a07a50', { sw: 1.2, flat: true, nodrop: true, inner: `<path d="${ell(0, -12, 5.4, 2)}" fill="none" stroke="#6a4a30" stroke-width="0.6"/><path d="${ell(0, -12, 2.4, 0.9)}" fill="none" stroke="#6a4a30" stroke-width="0.6"/>` });
  return svg(-15, -18, 30, 20, s);
}
function twig(seed) {
  const r = rng(seed);
  let s = L.limb([[-10, 1], [-2, -1], [10, 0.6]], 1.6, '#4a3626', { sw: 0.8 });
  s += L.limb([[0, -0.6], [3, -4], [6, -5]], 1, '#4a3626', { sw: 0.7 });
  return svg(-13, -8, 26, 11, s);
}
function flowers(seed) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < 3; i++) {
    const x = -5 + i * 5, h = 6 + r() * 5;
    s += line(`M${x} 0Q${x + 1} ${-h / 2} ${x} ${-h}`, 1.4, INK) + line(`M${x} 0Q${x + 1} ${-h / 2} ${x} ${-h}`, 0.6, '#4a5a38');
    s += shape(ell(x, -h, 1.8, 1.6), i === 1 ? '#7a5a9a' : '#5a4a7a', { sw: 0.6, nodrop: true, flat: true }) + dot(x, -h, 0.5, '#e0c060');
  }
  return svg(-9, -14, 18, 16, s);
}

function build(out) {
  out.pine0 = pine(3, 196);
  out.pine1 = pine(11, 222);
  out.pine2 = pine(29, 176);
  out.dead0 = deadTree(5);
  out.bush0 = bush(1, false);
  out.bush1 = bush(7, true);
  out.bush2 = bush(13, false);
  out.d_grass0 = grass(1, '#4b5a39');
  out.d_grass1 = grass(5, '#55603c');
  out.d_grass2 = grass(9, '#3f4c33');
  out.d_fern = fern(3);
  out.d_mush = mushrooms(2);
  out.d_stone0 = stone(4, true);
  out.d_stone1 = stone(8, false);
  out.d_leaves0 = leaves(3);
  out.d_leaves1 = leaves(17);
  out.d_bones = bones();
  out.d_stump = stump();
  out.d_twig = twig(2);
  out.d_flowers = flowers(6);
}
module.exports = { build };
