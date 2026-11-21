'use strict';
const L = require('./lib');
const { INK, smooth, shape, line, g, dot, ell, dark, light, svg, poly, rect, wrect, plank, f, rng, lerp } = L;
const H = 52; // высота стены (как WALL_H в игре)
const WOOD = ['#5e4632', '#56402d', '#634a35', '#5a432f'];
const DOOR = ['#6c4d33', '#62452d', '#6f5036', '#664a30', '#6a4c32'];

const shadowBottom = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" fill-opacity="0.28"/>`;
const outlineRect = (x, y, w, h, sw = 1.4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;

// ================= Стены (тайлы) =================
function wallBoards(w, seed) {
  let s = `<rect x="0" y="0" width="${w}" height="${H}" fill="#1b130e"/>`;
  const n = 6, bh = H / n, r = rng(seed);
  for (let i = 0; i < n; i++) {
    const y = i * bh;
    s += plank(-5, y + 0.3, w + 10, bh - 0.6, WOOD[(i + seed) % 4], seed * 7 + i, { nails: [[2.4, y + bh / 2], [w - 2.4, y + bh / 2]], sw: 0.8 });
    if (i % 2 && w > 40) s += line(`M40 ${f(y + 0.4)}L40 ${f(y + bh - 0.4)}`, 1, INK) + dot(38, y + bh / 2, 0.7, '#2a2420') + dot(42, y + bh / 2, 0.7, '#2a2420');
  }
  s += `<rect x="0" y="0" width="${w}" height="3" fill="#000" fill-opacity="0.35"/>` + shadowBottom(0, H - 5, w, 5);
  return s;
}
function wallTop(w, h, vert, seed) {
  return plank(vert ? 0.4 : -5, vert ? -5 : 0.4, vert ? w - 0.8 : w + 10, vert ? h + 10 : h - 0.8, '#6a503a', seed, { vert, sw: 1, knot: 0.9 }) +
    line(vert ? `M3 0L3 ${h}M${w - 3} 0L${w - 3} ${h}` : `M0 3L${w} 3M0 ${h - 3}L${w} ${h - 3}`, 0.6, INK, 0.35);
}
function ruinFront(w, seed) {
  const r = rng(seed);
  let s = `<rect x="0" y="0" width="${w}" height="${H}" fill="#24221e"/>`;
  const rows = 5, rh = H / rows;
  const greys = ['#5b5850', '#4f4c46', '#625e56', '#57534b'];
  for (let i = 0; i < rows; i++) {
    let x = -((i * 9) % 18) - 4;
    while (x < w + 4) {
      const bw = 13 + r() * 11;
      s += shape(wrect(x + 0.6, i * rh + 0.6, bw - 1.2, rh - 1.2, seed * 31 + i * 7 + Math.round(x), 0.7), greys[Math.floor(r() * 4)], { sw: 0.8, nodrop: true, sh: [1.4, 1.4], hgap: 1.6, hop: 0.3,
        inner: r() < 0.3 ? line(`M${f(x + bw * 0.3)} ${f(i * rh + 2)}L${f(x + bw * 0.45)} ${f(i * rh + rh * 0.6)}L${f(x + bw * 0.4)} ${f(i * rh + rh - 2)}`, 0.5, INK, 0.7) : '' });
      x += bw;
    }
  }
  for (let k = 0; k < 4; k++) {
    const mx = r() * w, my = H - 4 - r() * 14;
    s += `<path d="${ell(mx, my, 5 + r() * 6, 2.4 + r() * 2.4)}" fill="#4a5a34" fill-opacity="0.75"/>`;
  }
  s += shadowBottom(0, H - 5, w, 5);
  return s;
}
function ruinTop(w, h, vert, seed) {
  const r = rng(seed);
  let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="#3c3a35"/>`;
  const n = vert ? Math.round(h / 8) : Math.round(w / 8);
  for (let i = 0; i < n + 1; i++) {
    const cx = vert ? w / 2 + (r() - 0.5) * 4 : i * 8 + r() * 3, cy = vert ? i * 8 + r() * 3 : h / 2 + (r() - 0.5) * 4;
    s += shape(ell(cx, cy, 4 + r() * 2, 3.4 + r() * 1.6), ['#5b5850', '#4f4c46', '#68645b'][i % 3], { sw: 0.7, nodrop: true, sh: [1, 1], nohatch: true });
  }
  s += `<path d="${ell(w * 0.6, h * 0.5, vert ? 4 : 9, vert ? 9 : 3)}" fill="#4a5a34" fill-opacity="0.7"/>`;
  return s;
}

// ================= Полы =================
function floorWood() {
  let s = '<rect x="0" y="0" width="64" height="64" fill="#1e1610"/>';
  const seams = [[0, 40], [24], [8, 48], [32]];
  const cols = ['#4e3b2a', '#473627', '#53402e', '#4a3828'];
  for (let i = 0; i < 4; i++) {
    const y = i * 16, sx = [-64, ...seams[i].map((v) => v), ...seams[i].map((v) => v + 64)].sort((a, b) => a - b);
    for (let k = 0; k < sx.length - 1; k++) {
      const x0 = sx[k], x1 = sx[k + 1];
      if (x1 < 0 || x0 > 64) continue;
      s += plank(x0 + 0.4, y + 0.4, x1 - x0 - 0.8, 15.2, cols[(i + k) % 4], i * 17 + k * 5 + 3, { sw: 0.7, sh: [1, 1], nails: [[x0 + 2.4, y + 4], [x0 + 2.4, y + 12], [x1 - 2.4, y + 4], [x1 - 2.4, y + 12]] });
    }
  }
  return s;
}
function floorStone() {
  const r = rng(5);
  let s = '<rect x="0" y="0" width="64" height="64" fill="#2a2925"/>';
  const cols = ['#45433d', '#3e3c37', '#4a4741', '#403e38'];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const x = j * 32, y = i * 32;
    s += shape(wrect(x + 1, y + 1, 30, 30, i * 7 + j * 3 + 1, 1), cols[i * 2 + j], { sw: 0.6, nodrop: true, sh: [1.4, 1.4], nohatch: true,
      inner: line(`M${f(x + 4 + r() * 10)} ${f(y + 4 + r() * 6)}L${f(x + 12 + r() * 8)} ${f(y + 14 + r() * 6)}L${f(x + 10 + r() * 14)} ${f(y + 26)}`, 0.6, INK, 0.7) });
  }
  s += `<path d="${ell(32, 32, 6, 3)}" fill="#4a5a34" fill-opacity="0.6"/><path d="${ell(0, 14, 3, 6)}" fill="#4a5a34" fill-opacity="0.5"/><path d="${ell(64, 14, 3, 6)}" fill="#4a5a34" fill-opacity="0.5"/>`;
  return s;
}

// ================= Двери =================
function holes(dmg, w, y0, seed) {
  const r = rng(seed);
  let s = '';
  const hole = (cx, cy, R) => {
    const pts = [];
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = R * (k % 2 ? 0.45 : 1); pts.push([cx + Math.cos(a) * rr * 0.7, cy + Math.sin(a) * rr, 1]); }
    return shape(smooth(pts), '#120c08', { sw: 1, nodrop: true, flat: true }) + line(`M${f(cx - R)} ${f(cy - R * 0.3)}L${f(cx - R * 1.6)} ${f(cy - R * 0.6)}M${f(cx + R * 0.6)} ${f(cy + R)}L${f(cx + R)} ${f(cy + R * 1.7)}`, 0.7, '#c9a070', 0.9);
  };
  const claws = (x, y) => line(`M${x} ${y}L${x + 8} ${y + 10}M${x + 3} ${y - 1}L${x + 11} ${y + 9}M${x + 6} ${y - 2}L${x + 14} ${y + 8}`, 0.9, '#2a1a10', 0.85) + line(`M${x + 0.6} ${y}L${x + 8.6} ${y + 10}M${x + 3.6} ${y - 1}L${x + 11.6} ${y + 9}`, 0.4, '#c9a070', 0.7);
  if (dmg >= 1) { s += hole(w * 0.4, y0 + 18, 5); s += claws(w * 0.55, y0 + 6); s += line(`M${f(w * 0.2)} ${y0 + 30}L${f(w * 0.3)} ${y0 + 36}L${f(w * 0.26)} ${y0 + 44}`, 0.8, INK); }
  if (dmg >= 2) { s += hole(w * 0.7, y0 + 32, 6.5); s += hole(w * 0.22, y0 + 10, 4); s += claws(w * 0.12, y0 + 24); }
  return s;
}
function doorFace(x, y, w, h, dmg, seed) {
  let s = '';
  const n = Math.max(1, Math.round(w / 10.4));
  for (let i = 0; i < n; i++) s += plank(x + i * w / n, y, w / n, h, DOOR[(i + seed) % 5], seed + i * 3, { vert: true, sw: 0.8 });
  if (w > 20) {
    s += plank(x, y + 6, w, 5.4, '#4e3826', seed + 40, { sw: 0.9, nails: [[x + 3, y + 8.7], [x + w - 3, y + 8.7], [x + w / 2, y + 8.7]] });
    s += plank(x, y + h - 12, w, 5.4, '#4e3826', seed + 41, { sw: 0.9, nails: [[x + 3, y + h - 9.3], [x + w - 3, y + h - 9.3], [x + w / 2, y + h - 9.3]] });
    const a = Math.atan2(-(h - 22), w - 8) * 180 / Math.PI, len = Math.hypot(w - 8, h - 22);
    s += g(`translate(${x + 4} ${y + h - 11}) rotate(${f(a)})`, plank(0, -2.6, len, 5.2, '#55402b', seed + 42, { sw: 0.9 }));
    // петли и кольцо
    for (const yy of [y + 6.4, y + h - 11.6]) s += shape(poly([[x - 1, yy], [x + 14, yy + 0.6], [x + 16, yy + 2.3], [x + 14, yy + 4], [x - 1, yy + 4.6]]), '#3a3634', { sw: 0.8, nodrop: true, nohatch: true, sh: [0.8, 0.8] }) + dot(x + 4, yy + 2.3, 0.7, '#8a857c') + dot(x + 10, yy + 2.4, 0.7, '#8a857c');
    s += `<path d="${ell(x + w - 9, y + h / 2 + 2, 3.2, 3.6)}" fill="none" stroke="${INK}" stroke-width="2.4"/><path d="${ell(x + w - 9, y + h / 2 + 2, 3.2, 3.6)}" fill="none" stroke="#9a8a6a" stroke-width="1"/>`;
    s += shape(ell(x + w - 9, y + h / 2 - 1.8, 1.6, 1.6), '#3a3634', { sw: 0.7, nodrop: true, flat: true });
  }
  s += holes(dmg, w, y, seed);
  return s;
}
function doorH(dmg) {
  let s = '';
  s += plank(-1, -H, 66, 16, '#5c4632', 91, { sw: 1.1 });
  s += `<rect x="0" y="-36" width="64" height="52" fill="#120c08"/>`;
  s += doorFace(6, -36, 52, 52, dmg, 11);
  s += plank(0, -36, 6.4, 52, '#4a3626', 92, { vert: true, sw: 1 }) + plank(57.6, -36, 6.4, 52, '#4a3626', 93, { vert: true, sw: 1 });
  s += shadowBottom(0, 11, 64, 5) + outlineRect(0, -H, 64, H + 16, 1.6) + line('M0 -36L64 -36', 1.2, INK);
  return svg(-4, -56, 72, 76, s);
}
function doorHOpen() {
  let s = '';
  s += plank(-1, -H, 66, 16, '#5c4632', 91, { sw: 1.1 });
  s += `<rect x="6" y="-36" width="52" height="52" fill="#3a2c20"/>` + `<rect x="6" y="-36" width="52" height="10" fill="#000" fill-opacity="0.4"/>`;
  // створка распахнута внутрь (на север) — видна торцом
  s += plank(6, -100, 7, 64, '#6c4d33', 5, { vert: true, sw: 1 }) + plank(6, -36, 7, 40, '#55402b', 6, { vert: true, sw: 1 });
  s += plank(0, -36, 6.4, 52, '#4a3626', 92, { vert: true, sw: 1 }) + plank(57.6, -36, 6.4, 52, '#4a3626', 93, { vert: true, sw: 1 });
  s += outlineRect(0, -H, 64, 16, 1.6);
  return svg(-4, -104, 72, 124, s);
}
function doorHBroken() {
  let s = '';
  s += plank(0, -8, 6.4, 24, '#4a3626', 92, { vert: true, sw: 1 }) + plank(57.6, -4, 6.4, 20, '#4a3626', 93, { vert: true, sw: 1 });
  s += g('rotate(-8 30 8)', plank(10, 4, 34, 6, '#6c4d33', 3, { sw: 1 })) + g('rotate(12 40 12)', plank(28, 8, 26, 5.4, '#62452d', 4, { sw: 1 }));
  s += line('M6 -8L4 -14L8 -10L9 -16L10 -8M58 -4L60 -12L61 -6L63 -10', 1, INK) + line('M6 -8L4 -14L8 -10L9 -16L10 -8', 0.5, '#c9a070');
  for (const [x, y] of [[20, 14], [48, 3], [14, 0], [36, 16]]) s += g(`rotate(${x * 7} ${x} ${y})`, shape(rect(x - 3, y - 0.8, 6, 1.6), '#8a6a44', { sw: 0.5, nodrop: true, flat: true }));
  return svg(-4, -20, 72, 40, s);
}
function doorV(dmg) {
  let s = '';
  // верх створки (вид сверху) + торец снизу
  s += `<rect x="0" y="-52" width="16" height="64" fill="#120c08"/>`;
  s += plank(0.4, -52, 15.2, 6, '#4a3626', 94, { sw: 1 }) + plank(0.4, 6, 15.2, 6, '#4a3626', 95, { sw: 1 });
  s += plank(4.5, -46, 7, 52, '#6c4d33', 7, { vert: true, sw: 1 });
  s += shape(rect(3.6, -42, 8.8, 3), '#3a3634', { sw: 0.7, nodrop: true, flat: true }) + shape(rect(3.6, -2, 8.8, 3), '#3a3634', { sw: 0.7, nodrop: true, flat: true });
  if (dmg >= 1) s += line('M6 -30L9 -24L7 -18M9 -12L6 -8', 0.9, INK);
  if (dmg >= 2) s += shape(poly([[5, -26], [11, -24], [10, -16], [6, -18]]), '#120c08', { sw: 0.8, nodrop: true, flat: true });
  s += plank(0, 12, 16, 52, '#4a3626', 96, { vert: true, sw: 1 });
  s += shadowBottom(0, 59, 16, 5) + outlineRect(0, -52, 16, 116, 1.6) + line('M0 12L16 12', 1.2, INK);
  return svg(-4, -56, 24, 124, s);
}
function doorVOpen() {
  let s = '';
  s += `<rect x="0" y="-52" width="16" height="64" fill="#3a2c20"/>`;
  s += plank(0.4, -52, 15.2, 6, '#4a3626', 94, { sw: 1 }) + plank(0.4, 6, 15.2, 6, '#4a3626', 95, { sw: 1 });
  // створка распахнута на запад — видна лицом
  s += plank(-48, -52, 48, 7, '#55402b', 8, { sw: 1 });
  s += doorFace(-48, -45, 48, 52, 0, 21) + outlineRect(-48, -52, 48, 59, 1.4) + line('M-48 -45L0 -45', 1, INK);
  s += plank(0, 12, 16, 52, '#4a3626', 96, { vert: true, sw: 1 }) + outlineRect(0, -52, 16, 116, 1.6);
  return svg(-52, -56, 72, 124, s);
}
function doorVBroken() {
  let s = '';
  s += plank(0, 30, 16, 34, '#4a3626', 96, { vert: true, sw: 1 });
  s += g('rotate(-70 8 20)', plank(-8, 17, 30, 6, '#6c4d33', 3, { sw: 1 }));
  s += line('M2 30L4 24L6 29L9 22L11 30L14 26', 1, INK) + line('M2 30L4 24L6 29L9 22L11 30', 0.5, '#c9a070');
  return svg(-14, -4, 44, 72, s);
}

// ================= Окна =================
function windowH(boards) {
  let s = '';
  s += wallTopRaw(32, 16, false, 33).replace(/^/, `<g transform="translate(0 -52)">`) + '</g>';
  s += `<g transform="translate(0 -36)">${wallBoards(32, 3)}</g>`;
  s += shape(rect(4, -32, 24, 25), '#4a3626', { sw: 1, nodrop: true, sh: [1.2, 1.2], nohatch: true });
  s += `<rect x="7" y="-29" width="18" height="18" fill="#17212a"/>` + line('M9 -27L14 -22M17 -28L23 -21M20 -16L24 -12', 0.8, '#5a7a8a', 0.8) + line('M16 -29L16 -11M7 -20L25 -20', 1.6, '#4a3626') + line('M16 -29L16 -11M7 -20L25 -20', 0.5, INK);
  s += plank(2, -9, 28, 3.6, '#5c4632', 4, { sw: 0.9 });
  const bd = [[-24, 0.22], [-17, -0.25], [-13, 0.12]];
  for (let i = 0; i < boards; i++) s += g(`translate(16 ${bd[i][0]}) rotate(${f(bd[i][1] * 57)})`, plank(-17, -2.6, 34, 5.2, ['#7a5a3a', '#6e5034', '#80603e'][i], 50 + i, { sw: 0.9, nails: [[-14.6, 0], [14.6, 0]] }));
  s += outlineRect(0, -H, 32, H + 16, 1.6) + line('M0 -36L32 -36', 1.2, INK);
  return svg(-4, -56, 40, 76, s);
}
function windowHBroken() {
  let s = '';
  s += `<g transform="translate(0 -36)"><clipPath id="wb"><rect x="0" y="30" width="32" height="22"/></clipPath><g clip-path="url(#wb)">${wallBoards(32, 3)}</g></g>`;
  s += line('M0 -6L4 -9L9 -5L14 -10L19 -6L25 -9L32 -6', 1.2, INK);
  for (const [x, y, a] of [[6, 2, 20], [16, 6, -30], [26, 1, 60], [11, 12, 10]]) s += g(`rotate(${a} ${x} ${y})`, shape(poly([[x - 3, y + 1], [x, y - 4], [x + 2, y + 1]]), '#7a9aaa', { sw: 0.6, nodrop: true, flat: true }));
  s += g('rotate(14 16 12)', plank(2, 10, 26, 4.6, '#6e5034', 51, { sw: 0.9 }));
  return svg(-4, -14, 40, 34, s);
}
function wallTopRaw(w, h, vert, seed) { return wallTop(w, h, vert, seed); }
function windowV(broken) {
  let s = '';
  if (broken) {
    s += plank(0, 30, 16, 22, '#5e4632', 5, { vert: true, sw: 1 }) + line('M0 30L4 26L8 31L12 25L16 30', 1.1, INK);
    return svg(-4, -4, 24, 60, s);
  }
  s += wallTop(16, 32, true, 77).replace(/^/, `<g transform="translate(0 -52)">`) + '</g>';
  s += shape(rect(3, -46, 10, 20), '#17212a', { sw: 0.9, nodrop: true, flat: true }) + line('M8 -46L8 -26', 1.4, '#4a3626');
  s += g('rotate(70 8 -36)', plank(-6, -38.4, 28, 4.8, '#7a5a3a', 52, { sw: 0.9 }));
  s += `<g transform="translate(0 -20)"><clipPath id="wv"><rect x="0" y="0" width="16" height="52"/></clipPath><g clip-path="url(#wv)">${wallBoards(16, 9)}</g></g>`;
  s += outlineRect(0, -52, 16, 84, 1.6) + line('M0 -20L16 -20', 1.2, INK);
  return svg(-4, -56, 24, 92, s);
}

// ================= Баррикады =================
function stake(seed) {
  let s = shape(smooth([[-5.6, 2, 1], [-5.4, -26], [-1, -36, 1], [5.2, -27], [5.6, 2, 1]]), '#5a4330', { sh: [2.4, 1.4], sw: 1.3,
    inner: line('M-3 -24L-2.6 0M1.4 -22L1.8 0', 0.6, INK, 0.6) + `<path d="${ell(0, -30, 2.4, 1.2)}" fill="#a88560"/>` });
  s += shape(rect(-6, -12, 12, 3.2), '#8a7450', { sw: 0.7, nodrop: true, flat: true, inner: line('M-4 -12L-3 -8.8M-1 -12L0 -8.8M2 -12L3 -8.8', 0.4, INK, 0.7) });
  return svg(-9, -40, 18, 46, s);
}
function barricadeH(dmg) {
  let s = '';
  const post = (x) => shape(smooth([[x - 3.4, 16, 1], [x - 3.4, -24], [x, -31, 1], [x + 3.4, -24], [x + 3.4, 16, 1]]), '#4e3a28', { sh: [1.8, 1.2], sw: 1.2, inner: line(`M${x - 1} -20L${x - 1} 12`, 0.5, INK, 0.6) });
  s += post(4) + post(60);
  const pl = [[-22, 0, '#7a5a3a'], [-12, 0, '#6e5034'], [-2, 0, '#80603e']];
  pl.forEach(([y, a, c], i) => {
    if (dmg >= 1 && i === 1) {
      s += g(`rotate(-14 4 ${y + 3})`, plank(-1, y, 30, 6.6, c, 60 + i, { sw: 1, nails: [[2, y + 3.3]] })) + g(`rotate(18 60 ${y + 3})`, plank(36, y + 2, 28, 6.6, c, 70 + i, { sw: 1, nails: [[61, y + 5]] }));
      return;
    }
    if (dmg >= 2 && i === 0) return;
    s += plank(-2, y, 68, 6.6, c, 60 + i, { sw: 1, nails: [[2, y + 3.3], [62, y + 3.3]] });
  });
  if (dmg < 2) s += g('rotate(-20 32 -6)', plank(4, -9, 56, 5.6, '#5e4630', 80, { sw: 1, nails: [[8, -6.2], [56, -6.2]] }));
  if (dmg >= 1) s += line('M20 -20L24 -14L22 -8M44 6L48 12', 0.9, INK);
  s += shadowBottom(-2, 12, 68, 4);
  return svg(-6, -36, 76, 58, s);
}

// ================= Мебель =================
function crate() {
  let s = '';
  for (let i = 0; i < 4; i++) s += plank(0, -30 + i * 9, 40, 9, WOOD[i % 4], 100 + i, { sw: 0.9, nails: [[2.4, -25.5 + i * 9], [37.6, -25.5 + i * 9]] });
  for (let i = 0; i < 3; i++) s += plank(0, 6 + i * 10, 40, 10, dark(WOOD[(i + 1) % 4], 0.12), 110 + i, { sw: 0.9 });
  s += g('rotate(-35.5 20 21)', plank(-4, 18.4, 48, 5.2, '#4e3826', 120, { sw: 0.9 }));
  for (const [x, y] of [[0, 6], [34, 6], [0, 30], [34, 30]]) s += shape(rect(x, y, 6, 6), '#3a3634', { sw: 0.8, nodrop: true, flat: true }) + dot(x + 3, y + 3, 0.8, '#8a857c');
  s += outlineRect(0, -30, 40, 66, 1.6) + line('M0 6L40 6', 1.4, INK);
  return svg(-4, -34, 48, 74, s);
}
function cabinet() {
  let s = '';
  s += plank(0, -52, 56, 22, '#6a4e36', 130, { sw: 1 });
  s += shape(rect(0, -30, 56, 46), '#5a4332', { sw: 1.2, nodrop: true, sh: [3, 2], hgap: 2 });
  s += plank(3, -27, 50, 9, '#664b34', 131, { sw: 0.9 }) + dot(28, -22.5, 1.2, '#c9a65a');
  s += shape(rect(4, -15, 23, 26), '#644a33', { sw: 0.9, nodrop: true, sh: [1.4, 1.4] });
  s += g('rotate(-3 30 -15)', shape(rect(29, -15, 23, 26), '#644a33', { sw: 0.9, nodrop: true, sh: [1.4, 1.4] }));
  s += `<rect x="27.4" y="-14" width="2" height="25" fill="#0e0906"/>`;
  s += dot(24, -2, 1.1, '#c9a65a') + dot(32, -2.6, 1.1, '#c9a65a') + line('M8 -8L12 -2M40 -10L44 -6L42 0', 0.8, INK, 0.8);
  s += shape(rect(2, 11, 5, 5), '#3a2a1c', { sw: 0.8, nodrop: true, flat: true }) + shape(rect(49, 11, 5, 5), '#3a2a1c', { sw: 0.8, nodrop: true, flat: true });
  s += outlineRect(0, -52, 56, 68, 1.6) + line('M0 -30L56 -30', 1.4, INK);
  return svg(-4, -56, 64, 76, s);
}
function table() {
  let s = '';
  s += shape(rect(4, 2, 4, 20), '#2e2219', { sw: 0.9, nodrop: true, flat: true }) + shape(rect(56, 2, 4, 20), '#2e2219', { sw: 0.9, nodrop: true, flat: true });
  for (const x of [2, 57]) s += shape(rect(x, 12, 5, 24), '#3e2e20', { sw: 1, sh: [1.4, 1], nodrop: true });
  for (let i = 0; i < 3; i++) s += plank(0, -24 + i * 12, 64, 12, ['#6e5238', '#664b33', '#72563a'][i], 140 + i, { sw: 0.9, nails: [[2.6, -18 + i * 12], [61.4, -18 + i * 12]] });
  s += plank(0, 12, 64, 5, '#4e3a28', 143, { sw: 0.9 });
  s += line('M14 -14L22 -10M16 -16L24 -12M40 -4L46 2', 0.6, INK, 0.7);
  // огарок свечи и кружка
  s += shape(rect(44, -20, 4, 7), '#e2d6b6', { sw: 0.7, nodrop: true, flat: true }) + shape(ell(46, -13, 4, 1.4), '#cfc2a0', { sw: 0.6, nodrop: true, flat: true }) + line('M46 -20L46 -22', 0.6, INK);
  s += shape(rect(12, -6, 6, 6), '#6a6a72', { sw: 0.7, nodrop: true, flat: true }) + shape(ell(15, -6, 3, 1), '#2a2420', { sw: 0.6, nodrop: true, flat: true });
  s += outlineRect(0, -24, 64, 41, 1.6);
  return svg(-4, -28, 72, 68, s);
}
function loot() {
  let s = '';
  for (let i = 0; i < 2; i++) s += plank(0, -18 + i * 13, 30, 13, ['#6e6046', '#635640'][i], 150 + i, { sw: 0.9, nails: [[2.4, -11.5 + i * 13], [27.6, -11.5 + i * 13]] });
  for (let i = 0; i < 2; i++) s += plank(0, 8 + i * 9, 30, 9, ['#57492f', '#5f5236'][i], 152 + i, { sw: 0.9 });
  s += shape(rect(11, -18, 8, 26), '#b8862e', { sw: 0.8, nodrop: true, sh: [1, 1], nohatch: true }) + shape(rect(11, 8, 8, 18), '#9a6e22', { sw: 0.8, nodrop: true, flat: true });
  s += line('M4 13L8 13M4 17L7 17M22 12L26 16M26 12L22 16', 0.9, '#d8c48a', 0.9);
  s += `<path d="M3 20Q0 23 3 25" fill="none" stroke="${INK}" stroke-width="2.6"/><path d="M3 20Q0 23 3 25" fill="none" stroke="#b09a6a" stroke-width="1.2"/>`;
  s += g('rotate(12 24 -8)', shape(rect(21, -11, 8, 6), '#e6dcc0', { sw: 0.7, nodrop: true, flat: true, inner: line('M22.4 -9L27 -9M22.4 -7L26 -7', 0.4, INK, 0.7) }));
  s += outlineRect(0, -18, 30, 44, 1.5) + line('M0 8L30 8', 1.3, INK);
  return svg(-4, -22, 38, 52, s);
}
function bench() {
  let s = '';
  for (const x of [3, 56]) s += shape(rect(x, 10, 5, 20), '#3e2e20', { sw: 1, nodrop: true, sh: [1.2, 1] });
  s += plank(0, -22, 64, 15, '#6a5038', 160, { sw: 1 }) + plank(0, -7, 64, 15, '#634a33', 161, { sw: 1 });
  s += plank(0, 8, 64, 8, '#4e3a28', 162, { sw: 0.9 }) + shape(rect(26, 9.6, 14, 5), '#5a432f', { sw: 0.7, nodrop: true, flat: true }) + dot(33, 12, 0.9, '#c9a65a');
  // тиски
  s += shape(rect(2, -20, 12, 9), '#4e5258', { sw: 0.9, sh: [1.2, 1.2] }) + shape(rect(4, -24, 8, 4), '#5e6268', { sw: 0.8, nodrop: true, flat: true }) + line('M8 -24L8 -28M5 -28L11 -28', 1, INK);
  // пила
  s += g('rotate(-8 34 -14)', shape(poly([[22, -16], [44, -18], [44, -12], [22, -12]]), '#9aa0a3', { sw: 0.8, nodrop: true, flat: true,
    inner: line('M22 -12L23 -13.4L24 -12L25 -13.4L26 -12L27 -13.4L28 -12L29 -13.4L30 -12L31 -13.4L32 -12L33 -13.4L34 -12L35 -13.4L36 -12L37 -13.4L38 -12', 0.5, INK) }) + shape(rect(44, -19, 7, 8), '#7a5530', { sw: 0.8, nodrop: true, flat: true }));
  // молоток
  s += g('rotate(30 54 -2)', shape(rect(46, -3, 16, 2.6), '#8a6a44', { sw: 0.7, nodrop: true, flat: true }) + shape(rect(58, -6, 4, 8.6), '#4e5258', { sw: 0.7, nodrop: true, flat: true }));
  s += dot(20, -2, 0.8, '#8a857c') + dot(23, 0, 0.8, '#8a857c') + dot(18, 1, 0.8, '#8a857c');
  s += outlineRect(0, -22, 64, 38, 1.6) + line('M0 8L64 8', 1.4, INK);
  return svg(-4, -32, 72, 66, s);
}

// ================= Машина =================
function car(col, seed) {
  const r = rng(seed);
  let s = '';
  s += shape(smooth([[0, -16, 1], [6, -24], [30, -26], [44, -26, 1], [82, -26, 1], [96, -24], [112, -18, 1], [112, 24, 1], [0, 24, 1]]), col, { sh: [3, 3], sw: 1.4, hgap: 2.4 });
  s += shape(poly([[30, -24], [44, -24], [44, 22], [30, 22]]), '#18202a', { sw: 1, nodrop: true, flat: true,
    inner: line('M33 -18L40 -4L36 10M40 -4L43 4', 0.7, '#7a9aaa', 0.9) });
  s += shape(poly([[82, -24], [92, -22], [92, 20], [82, 22]]), '#18202a', { sw: 1, nodrop: true, flat: true, inner: line('M84 -14L90 0', 0.7, '#7a9aaa', 0.8) });
  s += shape(rect(44, -26, 38, 48), light(col, 0.08), { sw: 1.1, nodrop: true, sh: [2, 2] });
  // бок
  s += shape(poly([[0, 24], [112, 24], [112, 46], [104, 50], [8, 50], [0, 46]]), dark(col, 0.2), { sh: [2, 2], sw: 1.4, hgap: 2,
    inner: line('M44 25L44 48M80 25L80 48', 1, INK) + line('M50 32L56 32M86 32L92 32', 1.4, '#2a2420') });
  for (const [x, y, rx, ry] of [[66, 0, 8, 5], [20, 36, 7, 4], [96, -10, 5, 6], [60, 40, 6, 3]]) s += `<path d="${ell(x, y, rx, ry)}" fill="#7a3a1e" fill-opacity="0.7"/><path d="${ell(x + 1, y + 0.6, rx * 0.4, ry * 0.4)}" fill="#1a110b"/>`;
  for (const x of [22, 90]) {
    s += shape(ell(x, 48, 11, 5), '#151110', { sw: 1, nodrop: true, flat: true });
    s += shape(ell(x, 46, 9, 6), '#2a2624', { sw: 1.2, nodrop: true, flat: true, inner: `<path d="${ell(x, 46, 4, 3)}" fill="#5a5650"/>` });
  }
  s += shape(rect(108, 28, 5, 6), '#d8c48a', { sw: 0.7, nodrop: true, flat: true }) + shape(rect(-1, 28, 4, 6), '#7a2a22', { sw: 0.7, nodrop: true, flat: true });
  return svg(-5, -30, 123, 86, s);
}


// машина спереди / сзади (едет вниз / вверх по экрану): (0,0) — центр под машиной
function carV(col, seed, front) {
  let s = '';
  // колёса по бокам
  for (const x of [-29, 25]) for (const y of [-44, 4]) s += shape(rect(x, y, 6, 16), '#1c1816', { sw: 1, flat: true, nodrop: true });
  // крыша и капот сверху (длинный корпус уходит вглубь)
  s += shape(smooth([[-27, -62, 1], [27, -62, 1], [28, 4, 1], [-28, 4, 1]]), col, { sh: [3, 3], sw: 1.3, hgap: 2.4 });
  const gy = front ? -8 : -54; // стекло ближе к «носу» спереди, к багажнику сзади
  s += shape(poly([[-22, gy], [22, gy], [20, gy + 12], [-20, gy + 12]]), '#18202a', { sw: 1, flat: true, nodrop: true, inner: line(`M-14 ${gy + 2}L-6 ${gy + 10}`, 0.7, '#7a9aaa', 0.9) });
  s += shape(rect(-20, front ? -50 : -36, 40, 26), light(col, 0.08), { sw: 1, nodrop: true, sh: [2, 2] });
  // торец: бампер, фары/фонари, номер
  s += shape(poly([[-28, 4], [28, 4], [28, 22], [24, 26], [-24, 26], [-28, 22]]), dark(col, 0.2), { sh: [2, 2], sw: 1.3, hgap: 2 });
  if (front) {
    s += shape(rect(-22, 8, 10, 6), '#f0e4b0', { sw: 0.8, flat: true, nodrop: true }) + shape(rect(12, 8, 10, 6), '#f0e4b0', { sw: 0.8, flat: true, nodrop: true });
    s += line('M-8 10L8 10M-8 13L8 13M-8 16L8 16', 1, '#1a1410', 0.8);
  } else {
    s += shape(rect(-24, 8, 8, 5), '#c83a2a', { sw: 0.8, flat: true, nodrop: true }) + shape(rect(16, 8, 8, 5), '#c83a2a', { sw: 0.8, flat: true, nodrop: true });
    s += shape(rect(-7, 12, 14, 6), '#e8e4d8', { sw: 0.7, flat: true, nodrop: true });
  }
  s += shape(rect(-29, 20, 58, 5), '#3a3634', { sw: 1, flat: true, nodrop: true });
  for (const [x, y, rx, ry] of [[-10, -30, 5, 3], [14, -14, 4, 3]]) s += `<path d="${ell(x, y, rx, ry)}" fill="#7a3a1e" fill-opacity="0.7"/>`;
  return svg(-34, -68, 68, 98, s);
}
function tractorV(front) {
  let s = '';
  for (const x of [-34, 22]) s += shape(rect(x, -40, 12, 34), '#1c1a18', { sw: 1.2, flat: true, inner: line(`M${x + 2} -36L${x + 10} -32M${x + 2} -28L${x + 10} -24M${x + 2} -20L${x + 10} -16`, 1, '#3a3632') });
  for (const x of [-24, 16]) s += shape(rect(x, front ? 0 : -60, 8, 16), '#1c1a18', { sw: 1, flat: true });
  s += shape(rect(-18, -64, 36, 70), '#b8402a', { sh: [3, 3], sw: 1.3 });
  s += shape(rect(-14, front ? -62 : -30, 28, 26), '#2a2a2a', { sw: 1, flat: true, nodrop: true, inner: line('M-10 -50L10 -50', 1, '#6a6a6a') });
  s += shape(poly([[-18, 6], [18, 6], [16, 20], [-16, 20]]), '#8a2e1e', { sw: 1.2, sh: [2, 2] });
  if (front) s += shape(rect(-12, 9, 24, 7), '#3a3630', { sw: 0.8, flat: true, nodrop: true, inner: line('M-10 11L10 11M-10 14L10 14', 0.8, '#1a1410') });
  else s += shape(rect(-6, 10, 12, 5), '#c83a2a', { sw: 0.8, flat: true, nodrop: true });
  s += line('M8 -64L8 -76', 3, INK) + line('M8 -64L8 -76', 1.6, '#6a6a6a');
  return svg(-40, -80, 80, 104, s);
}

// ================= Ловушка, костёр, предметы =================
function trap() {
  let s = '';
  s += plank(0, 0, 36, 14, '#4e3e30', 170, { sw: 1 }) + plank(0, 14, 36, 14, '#463728', 171, { sw: 1 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const x = 5 + i * 8.6 + (j % 2) * 2, y = 7 + j * 8;
    s += shape(poly([[x - 2.6, y + 1.6], [x, y - 7], [x + 2.6, y + 1.6]]), j === 1 ? '#8a5a3a' : '#9aa0a3', { sw: 0.7, nodrop: true, flat: true, inner: line(`M${x - 0.6} ${y}L${x - 0.1} ${y - 5}`, 0.5, '#fff', 0.5) });
  }
  return svg(-2, -10, 40, 40, s);
}
function fireRing() {
  let s = `<path d="${ell(0, 0, 25, 17)}" fill="#18120d"/>`;
  s += `<path d="${ell(0, 1, 18, 11)}" fill="#3a2e26"/><path d="${ell(-4, 0, 6, 3)}" fill="#55463a"/>`;
  const r = rng(4);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, x = Math.cos(a) * 30, y = Math.sin(a) * 20;
    s += shape(ell(x, y, 6 + r() * 2, 4.4 + r() * 1.4), ['#5d5a52', '#4d4b45', '#67635a'][i % 3], { sw: 1, sh: [1.6, 1.6], nohatch: true, nodrop: true });
  }
  return svg(-42, -30, 84, 58, s);
}
function fireLogs() {
  let s = '';
  for (const [a, c] of [[-24, '#3a2618'], [22, '#422c1c'], [-2, '#33221a']]) {
    s += g(`rotate(${a})`, shape(smooth([[-20, -3.6, 1], [20, -3.6, 1], [21.6, 0], [20, 3.6, 1], [-20, 3.6, 1], [-21.6, 0]]), c, { sw: 1.1, sh: [1.6, 1.6], nodrop: true,
      inner: line('M-12 -1L-4 -2M6 1L14 0', 0.9, '#e06a20', 0.9) + `<path d="${ell(-6, -1, 4, 1.2)}" fill="#1a110b" fill-opacity="0.7"/>` }) +
      shape(ell(20.6, 0, 1.8, 3.6), '#a07a50', { sw: 0.8, nodrop: true, flat: true }));
  }
  return svg(-26, -16, 52, 28, s);
}
function flame(k) {
  const r = rng(30 + k);
  const tongue = (W, Hh, n, ph) => {
    const pts = [[-W, 0, 1]];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = lerp(-W, W, t), hh = Hh * (0.55 + 0.45 * Math.sin(ph + i * 2.1 + k * 1.7)) * (1 - Math.abs(t - 0.5) * 0.9);
      pts.push([x - W / n * 0.3, -hh * 0.45]);
      pts.push([x + Math.sin(ph + i + k) * 2, -hh, 1]);
      pts.push([x + W / n * 0.3, -hh * 0.45]);
    }
    pts.push([W, 0, 1]); pts.push([W * 0.5, 3]); pts.push([-W * 0.5, 3]);
    return smooth(pts);
  };
  let s = '';
  s += shape(tongue(19, 50, 4, k * 1.3), '#c4421c', { sw: 1.3, sh: [2, 1], flat: true, nodrop: true });
  s += shape(tongue(13, 38, 3, k * 1.9 + 1), '#f08a24', { sw: 0, flat: true, nodrop: true });
  s += shape(tongue(7, 24, 2, k * 2.3 + 2), '#ffd86a', { sw: 0, flat: true, nodrop: true });
  s += `<path d="${ell(0, -2, 6, 2.6)}" fill="#fff6c8" fill-opacity="0.8"/>`;
  return svg(-26, -60, 52, 66, s);
}
function brick() {
  return svg(-12, -16, 24, 19, shape(poly([[-9, -12], [7, -13], [10, -9], [10, 0], [-8, 1], [-10, -4]]), '#8c3e2c', { sw: 1.1, sh: [2.4, 2],
    inner: shape(poly([[-9, -12], [7, -13], [10, -9], [-7, -8]]), '#a5513a', { sw: 0.7, nodrop: true, flat: true }) + dot(-3, -4, 0.8, '#5a2418') + dot(4, -3, 0.6, '#5a2418') + line('M-4 -11L-2 -9', 0.5, INK) }));
}
function bottle() {
  return svg(-7, -24, 14, 27, shape(smooth([[-4.4, 0, 1], [-4.8, -11], [-2, -15], [-1.8, -21, 1], [1.8, -21, 1], [2, -15], [4.8, -11], [4.4, 0, 1]]), '#3f6e48', { sw: 1.1, sh: [2, 1], nohatch: true,
    inner: shape(rect(-4.8, -10, 9.6, 5.6), '#d6c49a', { sw: 0.6, nodrop: true, flat: true, inner: line('M-3 -8L2 -8M-3 -6.4L1 -6.4', 0.5, INK, 0.7) }) + line('M-2.6 -2L-2.6 -9', 1, '#fff', 0.45) }) +
    shape(rect(-2.2, -23.6, 4.4, 3), '#7a5a3a', { sw: 0.7, nodrop: true, flat: true }));
}
function woodPickup() {
  let s = '';
  for (const [y, c] of [[-2, '#6e4c2c'], [-7, '#7a5530']]) {
    s += shape(smooth([[-10, y - 3, 1], [9, y - 3, 1], [10.6, y], [9, y + 3, 1], [-10, y + 3, 1]]), c, { sw: 1, sh: [1.4, 1.2], nodrop: true, inner: line(`M-6 ${y - 1}L2 ${y - 1.4}`, 0.5, INK, 0.6) });
    s += shape(ell(9.6, y, 2, 3), '#c9a070', { sw: 0.8, nodrop: true, flat: true, inner: `<path d="${ell(9.6, y, 0.9, 1.4)}" fill="none" stroke="#7a5530" stroke-width="0.4"/>` });
  }
  s += line('M-3 -11L-3 2M3 -11L3 2', 1.4, '#a8925a') + line('M-3 -11L-3 2M3 -11L3 2', 0.5, INK, 0.5);
  return svg(-13, -12, 27, 16, s);
}
function scrapPickup() {
  let s = '';
  s += g('rotate(-14)', shape(poly([[-9, -6], [4, -8], [6, 0], [-8, 1]]), '#6a6e70', { sw: 0.9, sh: [1.4, 1.2], inner: dot(-6, -4, 0.7, INK) + dot(2, -6, 0.7, INK) + `<path d="${ell(-2, -2, 3, 1.6)}" fill="#7a3a1e" fill-opacity="0.6"/>` }));
  const gear = [];
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 4 < 2 ? 6.4 : 4.8; gear.push([4 + Math.cos(a) * rr, -6 + Math.sin(a) * rr, 1]); }
  s += shape(smooth(gear), '#9aa0a3', { sw: 1, sh: [1.4, 1.4], inner: `<path d="${ell(4, -6, 2, 2)}" fill="#2a2420"/>` });
  s += g('rotate(30 -6 -2)', shape(rect(-9, -3, 7, 2.4), '#8a8e90', { sw: 0.7, nodrop: true, flat: true }) + shape(rect(-10.6, -4, 2.4, 4.4), '#8a8e90', { sw: 0.7, nodrop: true, flat: true }));
  return svg(-12, -14, 24, 18, s);
}
function medPickup() {
  let s = shape(smooth([[-9, -12, 1], [9, -12, 1], [9.6, 0], [9, 1.4, 1], [-9, 1.4, 1], [-9.6, 0]]), '#e6ddd0', { sw: 1.1, sh: [2, 1.6], nohatch: true });
  s += shape(poly([[-1.6, -10], [1.6, -10], [1.6, -7], [4.6, -7], [4.6, -4], [1.6, -4], [1.6, -1], [-1.6, -1], [-1.6, -4], [-4.6, -4], [-4.6, -7], [-1.6, -7]]), '#c0362a', { sw: 0.6, nodrop: true, flat: true });
  s += shape(rect(-9.6, -13.4, 19.2, 2.4), '#8a8278', { sw: 0.7, nodrop: true, flat: true });
  return svg(-12, -16, 24, 19, s);
}

// ================= Иконки интерфейса =================
function iconFist() {
  let s = shape(smooth([[-9, 8], [-11, -2], [-9, -9], [-2, -11], [6, -10], [11, -6], [11, 2], [7, 10], [-2, 12]]), '#e0c8a4', { sw: 1.6, sh: [2.4, 2] });
  s += line('M-8 -8Q-6 -2 -8 3M-2 -10Q0 -3 -2 2M4 -9Q6 -3 4 2M-9 3Q0 6 8 2', 1, INK);
  s += shape(smooth([[-12, 9], [-6, 7], [4, 10], [6, 16, 1], [-10, 16, 1]]), '#6e4c2e', { sw: 1.4, sh: [1.6, 1.4] });
  return svg(-18, -18, 36, 36, s);
}
function iconAgi() {
  let s = shape(smooth([[-8, -12, 1], [3, -12, 1], [4, 0], [12, 4], [13, 9, 1], [-8, 9, 1]]), '#4a3a30', { sw: 1.6, sh: [2.4, 2] });
  s += line('M-8 4L12 4', 1.2, INK) + line('M-2 -8L3 -8M-2 -4L3 -4', 0.9, '#d6c49a');
  s += shape(smooth([[-10, -4], [-17, -10, 1], [-14, -3], [-18, -1, 1], [-12, 1]]), '#e0d4b0', { sw: 1.2, flat: true });
  s += line('M-16 12L-6 12M-14 15L-2 15', 1.6, '#e8a03c');
  return svg(-18, -18, 36, 36, s);
}
function iconEng() {
  const gear = [];
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, rr = k % 3 === 0 ? 8 : 10.6; gear.push([-3 + Math.cos(a) * rr, 2 + Math.sin(a) * rr, 1]); }
  let s = shape(smooth(gear), '#9aa0a3', { sw: 1.5, sh: [2, 2], inner: `<path d="${ell(-3, 2, 3.6, 3.6)}" fill="#2a2420"/>` });
  s += g('rotate(-40 6 -4)', shape(smooth([[-2, -5, 1], [16, -2, 1], [18, -6], [21, -5], [20, 0], [21, 5], [18, 6], [16, 2, 1], [-2, 2, 1]]), '#7a7e80', { sw: 1.4, sh: [1.6, 1.4] }));
  return svg(-18, -18, 36, 36, s);
}
function iconMar() {
  let s = g('rotate(-35)', shape(smooth([[-2, -1.6, 1], [26, -2.6], [28, 0], [26, 2.6], [-2, 1.6, 1]]), '#a87c4c', { sw: 1.4, sh: [1, 1.2] }) + shape(rect(-4, -2.4, 9, 4.8), '#3a3030', { sw: 1, flat: true, nodrop: true }));
  s = g('translate(-10 10)', s);
  s += g('translate(12 10) rotate(-145)', shape(smooth([[0, -1.6, 1], [16, -2.4], [21, -0.4, 1], [16, 1.8], [0, 1.6, 1]]), '#b4b9bc', { sw: 1.2, sh: [0.8, 1], nohatch: true }) + shape(rect(-7, -2, 7, 4), '#4a3020', { sw: 1, flat: true, nodrop: true }));
  s += line('M-14 -14L-8 -10M14 -14L8 -10M0 -16L0 -10', 1.6, '#e8a03c');
  return svg(-18, -18, 36, 36, s);
}
function iconMed() {
  let s = shape(smooth([[-12, -10, 1], [12, -10, 1], [13, 0], [12, 10, 1], [-12, 10, 1], [-13, 0]]), '#e6ddd0', { sw: 1.5, sh: [2, 2], nohatch: true });
  s += shape(poly([[-2.6, -7], [2.6, -7], [2.6, -2.6], [7, -2.6], [7, 2.6], [2.6, 2.6], [2.6, 7], [-2.6, 7], [-2.6, 2.6], [-7, 2.6], [-7, -2.6], [-2.6, -2.6]]), '#c0362a', { sw: 0.8, nodrop: true, flat: true });
  return svg(-18, -18, 36, 36, s);
}
function iconSun() {
  let s = '';
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; s += g(`rotate(${k * 45})`, shape(poly([[-2.4, -9], [0, -15], [2.4, -9]]), '#e8b84a', { sw: 1, flat: true, nodrop: true })); }
  s += shape(ell(0, 0, 8, 8), '#f0c860', { sw: 1.4, sh: [2, 2], nohatch: true });
  return svg(-17, -17, 34, 34, s);
}
function iconMoon() {
  return svg(-17, -17, 34, 34, shape(smooth([[-2, -12], [8, -8], [11, 2], [5, 10], [-6, 11], [-1, 5], [1, -2]]), '#c8cce0', { sw: 1.4, sh: [2, 2], nohatch: true }) + dot(4, 2, 1.4, '#9aa0b8') + dot(6, -3, 0.9, '#9aa0b8'));
}

function build(out) {
  out.wall_front = svg(0, 0, 64, H, wallBoards(64, 1));
  out.wall_top = svg(0, 0, 64, 16, wallTop(64, 16, false, 5));
  out.wall_topv = svg(0, 0, 16, 64, wallTop(16, 64, true, 6));
  out.ruin_front = svg(0, 0, 64, H, ruinFront(64, 2));
  out.ruin_top = svg(0, 0, 64, 16, ruinTop(64, 16, false, 3));
  out.ruin_topv = svg(0, 0, 16, 64, ruinTop(16, 64, true, 4));
  out.floor_wood = svg(0, 0, 64, 64, floorWood());
  out.floor_stone = svg(0, 0, 64, 64, floorStone());
  for (let d = 0; d < 3; d++) { out[`door_h${d}`] = doorH(d); out[`door_v${d}`] = doorV(d); out[`barr_h${d}`] = barricadeH(d); }
  out.door_h_open = doorHOpen(); out.door_v_open = doorVOpen();
  out.door_h_broken = doorHBroken(); out.door_v_broken = doorVBroken();
  for (let b = 1; b <= 3; b++) out[`win_h${b}`] = windowH(b);
  out.win_h_broken = windowHBroken(); out.win_v = windowV(false); out.win_v_broken = windowV(true);
  out.stake = stake(1);
  out.crate = crate(); out.cabinet = cabinet(); out.table = table(); out.loot = loot(); out.bench = bench();
  out.car0 = car('#5b4a3a', 1); out.car1 = car('#3f4a4c', 2); out.car2 = car('#5a3a34', 3);
  [['car0', '#5b4a3a'], ['car1', '#3f4a4c'], ['car2', '#5a3a34']].forEach(([n, c], i) => { out[n + '_front'] = carV(c, i, true); out[n + '_back'] = carV(c, i, false); });
  out.tractor_front = tractorV(true); out.tractor_back = tractorV(false);
  out.trap = trap(); out.fire_ring = fireRing(); out.fire_logs = fireLogs();
  for (let k = 0; k < 4; k++) out[`flame${k}`] = flame(k);
  out.brick = brick(); out.bottle = bottle(); out.wood = woodPickup(); out.scrap = scrapPickup(); out.med = medPickup();
  out.icon_str = iconFist(); out.icon_agi = iconAgi(); out.icon_eng = iconEng(); out.icon_sun = iconSun(); out.icon_mar = iconMar(); out.icon_med = iconMed(); out.band = medPickup(); out.icon_moon = iconMoon();
}
module.exports = { build };
