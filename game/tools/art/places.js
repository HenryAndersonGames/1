'use strict';
// Локации: город, промзона, ферма, лаборатория + генератор базы
const L = require('./lib');
const { INK, smooth, shape, line, g, dot, ell, dark, light, svg, poly, rect, wrect, plank, f, rng, lerp } = L;
const H = 52;
const shadowBottom = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" fill-opacity="0.28"/>`;
const outline = (x, y, w, h, sw = 1.6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
// коробка с верхом и лицевой стороной (футпринт 0..w × 0..h, высота Hh)
function box(w, h, Hh, top, front, o = {}) {
  let s = shape(rect(0, h - Hh, w, Hh), front, { sw: 0, nodrop: true, sh: [2, 2], hgap: 2, inner: o.front || '' });
  s += shape(rect(0, -Hh, w, h), top, { sw: 0, nodrop: true, sh: [1.6, 1.6], nohatch: true, inner: o.top || '' });
  s += outline(0, -Hh, w, h + Hh) + line(`M0 ${h - Hh}L${w} ${h - Hh}`, 1.3, INK);
  return s;
}
const propSvg = (w, h, Hh, body, extraTop = 0) => svg(-6, -Hh - 6 - extraTop, w + 12, h + Hh + 12 + extraTop, body);

// ================= Стены разных типов =================
function brickFront(w, seed) {
  const r = rng(seed);
  let s = `<rect x="0" y="0" width="${w}" height="${H}" fill="#3a2420"/>`;
  const rows = 8, rh = H / rows;
  for (let i = 0; i < rows; i++) {
    for (let x = (i % 2) * -8 - 8; x < w + 8; x += 16) {
      const c = ['#7a3e2e', '#6e3828', '#83463a', '#733a2c'][Math.floor(r() * 4)];
      s += shape(rect(x + 0.6, i * rh + 0.6, 14.8, rh - 1.2), c, { sw: 0.4, nodrop: true, sh: [0.8, 0.8], nohatch: true, lk: 0.12 });
    }
  }
  for (let k = 0; k < 3; k++) { const x = r() * w, y = r() * H; s += line(`M${f(x)} ${f(y)}L${f(x + 4)} ${f(y + 6)}L${f(x + 2)} ${f(y + 12)}`, 0.7, INK, 0.8); }
  s += `<rect x="0" y="${H - 10}" width="${w}" height="10" fill="#2a2a26" fill-opacity="0.35"/>` + shadowBottom(0, H - 4, w, 4);
  return s;
}
function metalFront(w, seed) {
  let s = `<rect x="0" y="0" width="${w}" height="${H}" fill="#5a6064"/>`;
  for (let x = 0; x < w; x += 6) s += `<rect x="${x}" y="0" width="3" height="${H}" fill="#6e7478"/>` + line(`M${x} 0L${x} ${H}`, 0.6, INK, 0.5);
  const r = rng(seed);
  for (let k = 0; k < 4; k++) s += `<path d="${ell(r() * w, 10 + r() * 36, 4 + r() * 6, 2 + r() * 5)}" fill="#7a3a1e" fill-opacity="0.55"/>`;
  s += line(`M0 4L${w} 4M0 ${H - 5}L${w} ${H - 5}`, 1, INK, 0.6) + shadowBottom(0, H - 4, w, 4);
  return s;
}
function concreteFront(w, seed) {
  const r = rng(seed);
  let s = `<rect x="0" y="0" width="${w}" height="${H}" fill="#7a7a74"/>`;
  s += line(`M0 26L${w} 26M32 0L32 26M16 26L16 ${H}M48 26L48 ${H}`, 0.8, '#4a4a46', 0.9);
  for (let k = 0; k < 4; k++) s += `<path d="${ell(r() * w, r() * H, 3 + r() * 5, 6 + r() * 8)}" fill="#5a5a52" fill-opacity="0.35"/>`;
  s += `<rect x="0" y="${H - 9}" width="${w}" height="5" fill="#c9a030"/>`;
  for (let x = -4; x < w; x += 10) s += `<path d="M${x} ${H - 4}L${x + 5} ${H - 9}L${x + 8} ${H - 9}L${x + 3} ${H - 4}Z" fill="#1a1a18"/>`;
  s += shadowBottom(0, H - 4, w, 4);
  return s;
}
function barnFront(w, seed) {
  let s = `<rect x="0" y="0" width="${w}" height="${H}" fill="#2a1410"/>`;
  for (let x = 0; x < w; x += 10.67) s += plank(x, 0, 10.67, H, ['#7e2e22', '#742a1f', '#86352a'][Math.round(x / 10.67) % 3], seed + x, { vert: true, sw: 0.7 });
  s += line(`M0 14L${w} 14M0 40L${w} 40`, 2, '#d8c8a8', 0.75) + shadowBottom(0, H - 4, w, 4);
  return s;
}
function topBeam(w, h, vert, col, seed) {
  return plank(vert ? 0.4 : -5, vert ? -5 : 0.4, vert ? w - 0.8 : w + 10, vert ? h + 10 : h - 0.8, col, seed, { vert, sw: 1, knot: 0.4 });
}
function stoneTop(w, h, vert, col) {
  let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="${col}"/>`;
  s += line(vert ? `M3 0L3 ${h}M${w - 3} 0L${w - 3} ${h}` : `M0 3L${w} 3M0 ${h - 3}L${w} ${h - 3}`, 0.8, INK, 0.4);
  for (let k = 8; k < (vert ? h : w); k += 16) s += line(vert ? `M0 ${k}L${w} ${k}` : `M${k} 0L${k} ${h}`, 0.6, INK, 0.4);
  return s;
}
function fenceFront(w, kind) {
  const FH = 30;
  let s = '';
  if (kind === 'wood') {
    for (let x = 2; x < w; x += 12) s += shape(smooth([[x, FH, 1], [x, 4], [x + 4, 0, 1], [x + 8, 4], [x + 8, FH, 1]]), ['#6a5038', '#5e4630'][(x / 12) % 2 | 0], { sw: 0.9, nodrop: true, sh: [1.4, 1], hgap: 2 });
    s += plank(-2, 8, w + 4, 4.4, '#4e3a28', 3, { sw: 0.8 }) + plank(-2, 20, w + 4, 4.4, '#4e3a28', 4, { sw: 0.8 });
  } else {
    let d = '';
    for (let x = -30; x < w + 30; x += 5) d += `M${x} 2L${x + 26} ${FH}M${x + 26} 2L${x} ${FH}`;
    s += `<clipPath id="cl${kind}"><rect x="0" y="0" width="${w}" height="${FH}"/></clipPath><g clip-path="url(#cl${kind})">${line(d, 0.6, '#8a9094', 0.9)}</g>`;
    s += line(`M0 2L${w} 2`, 2.4, INK) + line(`M0 2L${w} 2`, 1.2, '#8a9094');
    for (const x of [1, w - 1]) s += line(`M${x} 0L${x} ${FH}`, 3.6, INK) + line(`M${x} 0L${x} ${FH}`, 2, '#6a7074');
    if (kind === 'barb') { let b = ''; for (let x = 2; x < w; x += 6) b += `M${x} -2L${x + 3} -5M${x + 3} -2L${x} -5`; s += line(`M0 -3L${w} -3`, 0.8, INK) + line(b, 0.7, INK); }
  }
  return s;
}

// ================= Полы =================
function floorTile() {
  let s = '';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) s += `<rect x="${j * 16}" y="${i * 16}" width="16" height="16" fill="${(i + j) % 2 ? '#8a8676' : '#6a6658'}"/>`;
  s += line('M0 0L64 0M0 16L64 16M0 32L64 32M0 48L64 48M0 0L0 64M16 0L16 64M32 0L32 64M48 0L48 64', 0.5, INK, 0.4);
  s += `<path d="${ell(40, 24, 10, 5)}" fill="#3a3a30" fill-opacity="0.25"/>` + line('M6 40L14 46L10 54', 0.6, INK, 0.6);
  return s;
}
function floorConcrete(seed) {
  const r = rng(seed);
  let s = '<rect x="0" y="0" width="64" height="64" fill="#5c5c56"/>';
  for (let k = 0; k < 10; k++) s += `<path d="${ell(r() * 64, r() * 64, 4 + r() * 10, 3 + r() * 6)}" fill="${r() < 0.5 ? '#525250' : '#66665e'}" fill-opacity="0.6"/>`;
  s += line(`M0 32L64 32M32 0L32 64`, 0.8, '#3a3a36', 0.8) + line(`M${f(10 + r() * 10)} 4L${f(18 + r() * 6)} 14L${f(14 + r() * 6)} 24`, 0.7, INK, 0.7);
  return s;
}
function floorAsphalt(seed) {
  const r = rng(seed);
  let s = '<rect x="0" y="0" width="64" height="64" fill="#34343a"/>';
  for (let k = 0; k < 60; k++) s += `<rect x="${f(r() * 64)}" y="${f(r() * 64)}" width="1.2" height="1.2" fill="${r() < 0.5 ? '#46464c' : '#28282c'}"/>`;
  return s;
}
function floorLab() {
  let s = '<rect x="0" y="0" width="64" height="64" fill="#9a9c98"/>';
  s += line('M0 0L64 0M0 32L64 32M0 0L0 64M32 0L32 64', 1, '#6a6c68');
  s += `<path d="${ell(44, 46, 9, 6)}" fill="#5a6a3a" fill-opacity="0.35"/><path d="${ell(12, 14, 6, 3)}" fill="#3a2a40" fill-opacity="0.3"/>`;
  return s;
}
function floorHay(seed) {
  const r = rng(seed);
  let s = '<rect x="0" y="0" width="64" height="64" fill="#4a3c28"/>';
  let d = '';
  for (let k = 0; k < 70; k++) { const x = r() * 64, y = r() * 64, a = r() * 3; d += `M${f(x)} ${f(y)}L${f(x + Math.cos(a) * 6)} ${f(y + Math.sin(a) * 6)}`; }
  s += line(d, 0.8, '#b09050', 0.8);
  return s;
}

// ================= Предметы локаций =================
function lamp(on) {
  let s = `<path d="${ell(0, 0, 9, 3.4)}" fill="#000" fill-opacity="0.3"/>`;
  s += shape(rect(-2.4, -120, 4.8, 120), '#3a3e42', { sw: 1.2, sh: [1.2, 1], nohatch: true });
  s += shape(rect(-5, -8, 10, 8), '#30343a', { sw: 1.1, flat: true });
  s += shape(smooth([[-2, -118], [14, -124], [18, -120], [2, -114]]), '#3a3e42', { sw: 1.1, flat: true });
  s += shape(smooth([[10, -122], [24, -124], [26, -118], [12, -116]]), '#2e3236', { sw: 1.1, flat: true });
  s += shape(ell(19, -116, 6, 2.6), on ? '#fff2b0' : '#5a5a50', { sw: 1, nodrop: true, flat: true });
  return svg(-12, -130, 42, 136, s);
}
function bin() {
  const s = box(24, 18, 26, '#3c4a3e', '#4e5e4e', { front: line('M4 -6L4 16M10 -6L10 16M16 -6L16 16', 0.7, INK, 0.5), top: shape(rect(-1, -26, 26, 6), '#33402f', { sw: 0.8, nodrop: true, flat: true }) });
  return propSvg(24, 18, 26, s + shape(smooth([[18, -26], [24, -30], [27, -26], [22, -24]]), '#d8d0b8', { sw: 0.7, flat: true, nodrop: true }));
}
function barrel(col) {
  let s = shape(smooth([[0, -24, 1], [22, -24, 1], [22.6, 0], [22, 16, 1], [0, 16, 1], [-0.6, 0]]), col, { sw: 1.4, sh: [3, 2],
    inner: line('M0 -10L22 -10M0 4L22 4', 1.2, INK, 0.7) + `<path d="${ell(16, -4, 3, 6)}" fill="#7a3a1e" fill-opacity="0.6"/>` });
  s += shape(ell(11, -24, 11, 4.2), light(col, 0.12), { sw: 1.2, nodrop: true, flat: true, inner: `<path d="${ell(15, -24, 2, 1)}" fill="#1a110b"/>` });
  s += shape(poly([[7, -6], [11, -14], [15, -6]]), '#e8c040', { sw: 0.7, nodrop: true, flat: true }) + line('M11 -11.6L11 -8.6', 0.8, INK);
  return svg(-6, -34, 36, 56, s);
}
function pallets() {
  let s = '';
  for (let k = 0; k < 3; k++) {
    const y = 8 - k * 7;
    s += shape(rect(0, y, 40, 3), '#6a5232', { sw: 0.8, nodrop: true, flat: true });
    for (const x of [0, 17, 35]) s += shape(rect(x, y + 3, 5, 4), '#5a4428', { sw: 0.7, nodrop: true, flat: true });
    for (let j = 0; j < 5; j++) s += plank(j * 8.2, y - 3 - (k === 2 ? 24 : 0) * 0, 7.4, 3.2, '#a8875a', 30 + k * 5 + j, { sw: 0.7, sh: [0.6, 0.6] });
  }
  s += shape(rect(0, -30, 40, 16), '#9a7a4e', { sw: 1, nodrop: true, sh: [1.2, 1.2], inner: line('M8 -30L8 -14M16 -30L16 -14M24 -30L24 -14M32 -30L32 -14', 0.8, INK, 0.6) });
  s += shape(rect(0, -14, 40, 4), '#5a4428', { sw: 0.8, nodrop: true, flat: true });
  return svg(-6, -36, 52, 56, s);
}
function container(col) {
  let s = box(128, 52, 56, light(col, 0.08), col, {
    front: (() => { let d = ''; for (let x = 4; x < 128; x += 6) d += `M${x} -2L${x} 50`; return line(d, 1, dark(col, 0.35), 0.9) + line('M0 2L128 2M0 48L128 48', 1, INK, 0.6) + `<path d="${ell(90, 20, 10, 8)}" fill="#7a3a1e" fill-opacity="0.5"/>`; })(),
    top: (() => { let d = ''; for (let x = 6; x < 128; x += 10) d += `M${x} -56L${x} -6`; return line(d, 0.8, dark(col, 0.25), 0.8); })(),
  });
  s += shape(rect(100, 0, 3, 44), '#2a2a2a', { sw: 0.5, nodrop: true, flat: true }) + shape(rect(110, 0, 3, 44), '#2a2a2a', { sw: 0.5, nodrop: true, flat: true });
  return propSvg(128, 52, 56, s);
}
function shelf() {
  let s = box(64, 20, 50, '#5a4a38', '#4a3c2e');
  for (let k = 0; k < 3; k++) {
    const y = -26 + k * 14;
    s += plank(2, y + 10, 60, 3, '#6e5a42', 40 + k, { sw: 0.6 });
    for (let j = 0; j < 6; j++) {
      const x = 5 + j * 9.6, c = ['#a03a2a', '#3a6a8a', '#c9a040', '#5a7a3a'][(j + k) % 4];
      if ((j * 7 + k) % 5 === 0) continue;
      s += shape(rect(x, y + 1, 6, 9), c, { sw: 0.6, nodrop: true, flat: true, inner: `<rect x="${x}" y="${y + 4}" width="6" height="2" fill="#e8dcc0"/>` });
    }
  }
  return propSvg(64, 20, 50, s);
}
function fridge() {
  let s = box(30, 24, 54, '#c8c8bc', '#b4b4a8', { front: line('M2 -12L28 -12', 1, INK) + shape(rect(24, -24, 2.4, 8), '#6a6a66', { sw: 0.5, nodrop: true, flat: true }) + shape(rect(24, -6, 2.4, 10), '#6a6a66', { sw: 0.5, nodrop: true, flat: true }) + `<path d="${ell(10, 6, 5, 3)}" fill="#7a5a2a" fill-opacity="0.4"/>` });
  return propSvg(30, 24, 54, s);
}
function sofa() {
  let s = '';
  s += shape(rect(0, -18, 64, 14), '#5a3a4a', { sw: 1.2, sh: [2, 2], nodrop: true });
  s += box(64, 30, 14, '#6a4458', '#553646', { top: line('M21 -14L21 14M43 -14L43 14', 1, INK, 0.6) + line('M8 -6L14 0', 0.8, '#d8c8b0', 0.7) });
  s += shape(rect(-2, -10, 8, 40), '#4e3040', { sw: 1.2, sh: [1.4, 1.4] }) + shape(rect(58, -10, 8, 40), '#4e3040', { sw: 1.2, sh: [1.4, 1.4] });
  return propSvg(64, 30, 26, s);
}
function bed() {
  let s = box(40, 64, 16, '#8a8a9a', '#5a4a3a', { top: shape(rect(4, -12, 32, 12), '#e0dcd0', { sw: 0.8, nodrop: true, flat: true }) + shape(rect(0, 4, 40, 44), '#4a5a7a', { sw: 0.8, nodrop: true, sh: [1.6, 1.6], inner: line('M4 14Q20 18 36 12M6 30Q20 34 34 28', 0.8, INK, 0.5) }) });
  return propSvg(40, 64, 16, s);
}
function counter() {
  let s = box(64, 24, 30, '#7a6a52', '#5a4a3a', { front: line('M0 -2L64 -2', 1, INK, 0.5) + shape(rect(8, 2, 20, 14), '#4a3c2e', { sw: 0.6, nodrop: true, flat: true }) });
  s += shape(rect(40, -34, 18, 12), '#3a3c40', { sw: 1, sh: [1.4, 1.2], inner: shape(rect(42, -33, 14, 4), '#5a8a6a', { sw: 0.4, nodrop: true, flat: true }) });
  return propSvg(64, 24, 30, s, 6);
}
function gaspump() {
  let s = box(24, 20, 46, '#a83a2a', '#922e22', { front: shape(rect(5, -20, 14, 10), '#1c2024', { sw: 0.6, nodrop: true, flat: true, inner: line('M7 -16L15 -16', 0.8, '#e8a040') }) + shape(rect(4, 2, 16, 8), '#e8dcc0', { sw: 0.5, nodrop: true, flat: true }) });
  s += line('M24 -14Q32 -10 30 6', 2.6, INK) + line('M24 -14Q32 -10 30 6', 1.2, '#2a2a2a') + shape(rect(26, 2, 8, 6), '#3a3a3a', { sw: 0.7, nodrop: true, flat: true });
  return propSvg(30, 20, 46, s);
}
function hay() {
  let s = shape(smooth([[0, 26, 1], [-2, 0], [4, -22], [20, -28], [36, -22], [42, 0], [40, 26, 1]]), '#c09a48', { sw: 1.4, sh: [3, 2.4], hgap: 1.8,
    inner: (() => { let d = ''; const r = rng(3); for (let k = 0; k < 40; k++) { const x = r() * 40, y = -26 + r() * 52; d += `M${f(x)} ${f(y)}L${f(x + 4)} ${f(y + 1)}`; } return line(d, 0.6, '#7a5a20', 0.8); })() });
  s += shape(ell(20, -18, 16, 8), '#d4b060', { sw: 1, nodrop: true, sh: [1.6, 1.6], inner: `<path d="${ell(20, -18, 9, 4.4)}" fill="none" stroke="#8a6a2a" stroke-width="0.7"/><path d="${ell(20, -18, 3.6, 1.8)}" fill="none" stroke="#8a6a2a" stroke-width="0.7"/>` });
  return svg(-6, -32, 52, 64, s);
}
function corn(seed) {
  const r = rng(seed);
  let s = '';
  for (let k = 0; k < 3; k++) {
    const x = -8 + k * 8 + r() * 3, h = 54 + r() * 14;
    s += L.limb([[x, 0], [x + r() * 2, -h * 0.5], [x + (r() - 0.5) * 4, -h]], 2, '#6a7a3a', { sw: 0.9 });
    for (let j = 0; j < 4; j++) {
      const y = -14 - j * 12, sd = (j + k) % 2 ? 1 : -1;
      s += shape(smooth([[x, y, 1], [x + sd * 10, y - 6], [x + sd * 18, y + 2, 1], [x + sd * 9, y - 2]]), j % 2 ? '#7a8a42' : '#6a7a36', { sw: 0.7, nodrop: true, flat: true });
    }
    if (r() < 0.6) s += shape(ell(x + 3, -30, 2.4, 6), '#d8b048', { sw: 0.7, nodrop: true, flat: true });
  }
  return svg(-28, -76, 56, 80, s);
}
function scarecrow() {
  let s = L.limb([[0, 0], [0, -70]], 3.6, '#5e4630') + L.limb([[-22, -54], [22, -54]], 3, '#5e4630');
  s += shape(smooth([[-10, -60], [10, -60], [12, -30, 1], [6, -34], [0, -28, 1], [-6, -34], [-12, -30, 1]]), '#6a5a8a', { sw: 1.2, sh: [2, 2], inner: shape(rect(-4, -52, 6, 6), '#a03a2a', { sw: 0.5, nodrop: true, flat: true }) });
  s += shape(ell(0, -70, 8, 8), '#c8a868', { sw: 1.2, sh: [1.6, 1.6], inner: line('M-4 -72L-1 -69M-1 -72L-4 -69M2 -72L5 -69M5 -72L2 -69M-4 -65Q0 -63 4 -65', 0.8, INK) });
  s += shape(smooth([[-14, -74, 1], [14, -74, 1], [6, -78], [2, -88, 1], [-4, -78]]), '#3a2c20', { sw: 1.1, flat: true });
  for (const sd of [-1, 1]) s += line(`M${sd * 22} -54L${sd * 26} -50M${sd * 22} -54L${sd * 25} -57`, 1, '#c8a868');
  return svg(-30, -92, 60, 96, s);
}
function tractor() {
  let s = '';
  s += shape(ell(16, 40, 14, 12), '#1c1a18', { sw: 1.2, flat: true });
  s += box(96, 52, 30, '#6a8a3a', '#5a7a30', { top: shape(rect(44, -30, 36, 28), '#3a4a2a', { sw: 0.8, nodrop: true, flat: true }) + line('M6 -22L38 -22M6 -14L38 -14', 1, INK, 0.5), front: `<path d="${ell(70, 6, 10, 6)}" fill="#7a3a1e" fill-opacity="0.6"/>` });
  s += shape(ell(76, 40, 18, 16), '#1c1a18', { sw: 1.4, flat: true, inner: `<path d="${ell(76, 40, 8, 7)}" fill="#c8a040"/>` });
  s += shape(ell(16, 42, 10, 9), '#2a2826', { sw: 1.2, flat: true, inner: `<path d="${ell(16, 42, 4, 4)}" fill="#c8a040"/>` });
  s += shape(rect(84, -44, 4, 18), '#2a2a2a', { sw: 0.8, flat: true });
  return svg(-6, -50, 110, 112, s);
}
function well() {
  let s = shape(ell(20, 18, 20, 12), '#5a5850', { sw: 1.4, sh: [2, 2], nohatch: true, inner: `<path d="${ell(20, 16, 13, 7)}" fill="#0c1014"/>` });
  s += L.limb([[4, 16], [4, -30]], 2.6, '#5e4630') + L.limb([[36, 16], [36, -30]], 2.6, '#5e4630');
  s += shape(poly([[-2, -28], [20, -44], [42, -28], [38, -26], [20, -38], [2, -26]]), '#6a3a2a', { sw: 1.1, sh: [1.2, 1.2] });
  s += L.limb([[4, -16], [36, -16]], 1.6, '#5e4630') + line('M20 -16L20 6', 0.8, '#b09a6a');
  return svg(-6, -48, 52, 82, s);
}
function labTable() {
  let s = box(64, 28, 30, '#b4b8b4', '#8a8e8a', { front: line('M2 -2L62 -2', 1, INK, 0.5) + shape(rect(4, 2, 26, 18), '#7a7e7a', { sw: 0.5, nodrop: true, flat: true }) + shape(rect(34, 2, 26, 18), '#7a7e7a', { sw: 0.5, nodrop: true, flat: true }) });
  const fl = (x, y, c, h) => shape(smooth([[x - 3, y, 1], [x - 4, y - 4], [x - 1.2, y - h + 4], [x - 1.2, y - h, 1], [x + 1.2, y - h, 1], [x + 1.2, y - h + 4], [x + 4, y - 4], [x + 3, y, 1]]), '#c8dcdc', { sw: 0.7, nodrop: true, flat: true, inner: `<rect x="${x - 5}" y="${y - 5}" width="10" height="5" fill="${c}"/>` });
  s += fl(10, -14, '#7ad04a', 12) + fl(18, -12, '#b06ae0', 10) + fl(48, -16, '#e0603a', 14);
  s += shape(rect(28, -26, 14, 10), '#3a3c40', { sw: 0.8, sh: [1, 1], inner: shape(rect(30, -25, 10, 5), '#4ae0a0', { sw: 0.3, nodrop: true, flat: true }) });
  return propSvg(64, 28, 30, s, 6);
}
function capsule(broken) {
  let s = shape(ell(16, 22, 16, 8), '#4a4e52', { sw: 1.3, sh: [2, 2], nohatch: true });
  s += shape(rect(2, -62, 28, 84), broken ? '#2a3a3a' : '#5a9a8a', { sw: 1.3, nodrop: true, sh: [3, 2], nohatch: true,
    inner: broken ? line('M6 -40L14 -30L10 -18M20 -50L26 -36', 0.9, '#c8e8e0') : `<rect x="2" y="-40" width="28" height="62" fill="#4aa07a" fill-opacity="0.7"/>` + `<path d="${ell(16, -14, 6, 12)}" fill="#2a3a30" fill-opacity="0.8"/>` + line('M6 -58L6 18', 1.6, '#fff', 0.4) + dot(10, -30, 1.2, '#c8f0d8') + dot(22, -10, 1, '#c8f0d8') });
  s += shape(rect(0, -68, 32, 8), '#5a5e62', { sw: 1.2, flat: true }) + shape(rect(0, 20, 32, 6), '#5a5e62', { sw: 1.2, flat: true });
  return svg(-6, -74, 44, 108, s);
}
function rack() {
  let s = box(32, 20, 60, '#2a2c30', '#34363c');
  for (let k = 0; k < 7; k++) { const y = -36 + k * 7; s += shape(rect(3, y, 26, 5), '#202226', { sw: 0.5, nodrop: true, flat: true }) + dot(6, y + 2.5, 0.8, k % 3 ? '#4ae070' : '#e04a3a') + dot(9, y + 2.5, 0.8, '#4a8ae0'); }
  return propSvg(32, 20, 60, s);
}
function growth(seed) {
  const r = rng(seed);
  let s = '';
  for (let k = 0; k < 5; k++) {
    const x = -14 + k * 7 + r() * 3, h = 14 + r() * 22, w = 3 + r() * 3;
    s += shape(smooth([[x - w, 0, 1], [x - w * 0.6, -h * 0.6], [x, -h, 1], [x + w * 0.6, -h * 0.6], [x + w, 0, 1]]), k % 2 ? '#7a4aa8' : '#5a3a8a', { sw: 1, sh: [1.4, 1.2], nohatch: true, lk: 0.3,
      inner: line(`M${x - 1} ${-h * 0.8}L${x - 1.4} ${-h * 0.2}`, 0.8, '#d8b8ff', 0.8) });
  }
  s += shape(smooth([[-20, 2], [-10, -4], [10, -4], [22, 2], [10, 6], [-10, 6]]), '#3a2a3e', { sw: 1, flat: true, nodrop: true }) + dot(-6, 2, 1.4, '#b48cff') + dot(8, 1, 1.2, '#b48cff');
  return svg(-24, -44, 50, 54, s);
}
function sign() {
  let s = L.limb([[0, 0], [0, -34]], 2.2, '#4a4e52');
  s += shape(poly([[-12, -32], [0, -52], [12, -32]]), '#e0b830', { sw: 1.3, sh: [1.4, 1.4], nohatch: true, inner: shape(rect(-1.2, -46, 2.4, 8), INK, { sw: 0, nodrop: true, flat: true }) + dot(0, -36, 1.3, INK) });
  return svg(-16, -56, 32, 60, s);
}
function generator(on) {
  let s = box(48, 32, 34, '#6a7a52', '#5a6a44', {
    front: shape(rect(6, 6, 18, 14), '#2a2c30', { sw: 0.6, nodrop: true, flat: true, inner: line('M8 10L22 10M8 14L22 14M8 18L22 18', 0.8, '#5a5e62') }) + dot(36, 12, 3, on ? '#5ae060' : '#5a2a22') + dot(36, 12, 1.2, on ? '#d8ffd0' : '#3a1a16'),
    top: shape(rect(8, -28, 18, 10), '#4a5a3a', { sw: 0.7, nodrop: true, flat: true }) + shape(ell(36, -20, 5, 3), '#3a3c40', { sw: 0.7, nodrop: true, flat: true }),
  });
  s += line('M40 -34L42 -44L46 -46', 2.6, INK) + line('M40 -34L42 -44L46 -46', 1.2, '#4a4e52');
  if (on) s += `<path d="${ell(46, -50, 4, 3)}" fill="#8a8a88" fill-opacity="0.5"/><path d="${ell(49, -56, 5, 3.6)}" fill="#8a8a88" fill-opacity="0.35"/>`;
  return propSvg(48, 32, 34, s, 20);
}
function flood(on) {
  let s = L.limb([[0, 0], [0, -80]], 2.6, '#3a3e42') + L.limb([[-8, 0], [0, -20], [8, 0]], 1.8, '#3a3e42');
  s += shape(rect(-10, -92, 20, 12), '#2e3236', { sw: 1.2, sh: [1, 1] }) + shape(rect(-8, -90, 16, 8), on ? '#fff6c0' : '#4a4a44', { sw: 0.6, nodrop: true, flat: true });
  return svg(-14, -96, 28, 100, s);
}
function crateStack() {
  let s = box(40, 36, 30, '#6e5a3e', '#5a4a32', { front: line('M0 6L40 36M40 6L0 36', 1.2, '#3a2c1c', 0.8), top: line('M0 -21L40 -21M0 -12L40 -12M0 -3L40 -3', 0.8, INK, 0.5) });
  return propSvg(40, 36, 30, s);
}
function locker() {
  let s = box(28, 20, 54, '#5a6a7a', '#4a5a6a', { front: line('M14 -34L14 20', 1, INK) + line('M4 -28L10 -28M4 -26L10 -26M18 -28L24 -28M18 -26L24 -26', 0.6, INK, 0.8) + dot(11, -6, 1, '#c8ccd0') + dot(17, -6, 1, '#c8ccd0') });
  return propSvg(28, 20, 54, s);
}
// декали
function decal(kind, seed) {
  const r = rng(seed);
  let s = '';
  if (kind === 'crack') { let d = 'M-14 0'; let x = -14, y = 0; for (let k = 0; k < 6; k++) { x += 5; y += (r() - 0.5) * 6; d += `L${f(x)} ${f(y)}`; } s = line(d, 1, INK, 0.7) + line(`M-2 ${f(y / 2)}L2 ${f(y / 2 - 7)}`, 0.8, INK, 0.6); }
  if (kind === 'oil') s = `<path d="${ell(0, 0, 14, 7)}" fill="#0c0c10" fill-opacity="0.55"/><path d="${ell(5, 2, 6, 3)}" fill="#0c0c10" fill-opacity="0.4"/><path d="${ell(-3, -1, 4, 1.6)}" fill="#5a4a7a" fill-opacity="0.3"/>`;
  if (kind === 'paper') s = g(`rotate(${f(r() * 60 - 30)})`, shape(poly([[-5, -4], [5, -5], [6, 3], [-4, 4]]), '#d8d0b8', { sw: 0.6, nodrop: true, flat: true, inner: line('M-3 -2L3 -2.6M-3 0L4 -0.6M-3 2L2 1.6', 0.4, INK, 0.6) }));
  if (kind === 'puddle') s = `<path d="${ell(0, 0, 16, 7)}" fill="#1a2630" fill-opacity="0.55"/><path d="${ell(-4, -2, 6, 1.4)}" fill="#8aa0b0" fill-opacity="0.3"/>`;
  if (kind === 'goo') s = `<path d="${ell(0, 0, 12, 6)}" fill="#4a2a5a" fill-opacity="0.6"/>` + dot(6, 3, 2, '#7a4aa8') + dot(-8, -2, 1.4, '#7a4aa8');
  if (kind === 'cone') s = shape(poly([[-6, 0], [-1.6, -16], [1.6, -16], [6, 0]]), '#e06a2a', { sw: 1, nodrop: true, sh: [1, 1], nohatch: true, inner: `<rect x="-6" y="-9" width="12" height="3" fill="#f0f0e0"/>` }) + shape(rect(-8, -1, 16, 3), '#2a2a2a', { sw: 0.8, nodrop: true, flat: true });
  return svg(-20, -20, 40, 30, s);
}

function build(out) {
  const styles = {
    brick: [brickFront(64, 3), '#5a4a42', 'stone'], metal: [metalFront(64, 4), '#6a7074', 'stone'],
    concrete: [concreteFront(64, 5), '#8a8a84', 'stone'], barn: [barnFront(64, 6), '#5a2a22', 'wood'],
  };
  for (const [k, [front, topc, tt]] of Object.entries(styles)) {
    out[`${k}_front`] = svg(0, 0, 64, H, front);
    out[`${k}_top`] = svg(0, 0, 64, 16, tt === 'wood' ? topBeam(64, 16, false, topc, 9) : stoneTop(64, 16, false, topc));
    out[`${k}_topv`] = svg(0, 0, 16, 64, tt === 'wood' ? topBeam(16, 64, true, topc, 9) : stoneTop(16, 64, true, topc));
  }
  for (const k of ['wood', 'chain', 'barb']) {
    out[`fence${k}_front`] = svg(0, k === 'barb' ? -6 : 0, 64, k === 'barb' ? 36 : 30, fenceFront(64, k));
    out[`fence${k}_top`] = svg(0, 0, 64, 8, k === 'wood' ? topBeam(64, 8, false, '#5e4630', 2) : stoneTop(64, 8, false, '#6a7074'));
    out[`fence${k}_topv`] = svg(0, 0, 8, 64, k === 'wood' ? topBeam(8, 64, true, '#5e4630', 2) : stoneTop(8, 64, true, '#6a7074'));
  }
  out.floor_tile = svg(0, 0, 64, 64, floorTile());
  out.floor_concrete = svg(0, 0, 64, 64, floorConcrete(3));
  out.floor_asphalt = svg(0, 0, 64, 64, floorAsphalt(4));
  out.floor_lab = svg(0, 0, 64, 64, floorLab());
  out.floor_hay = svg(0, 0, 64, 64, floorHay(5));
  out.lamp = lamp(false); out.lamp_on = lamp(true);
  out.bin = bin(); out.barrel = barrel('#9a2a22'); out.barrel2 = barrel('#3a5a7a'); out.pallets = pallets();
  out.container0 = container('#3e5a6e'); out.container1 = container('#8a4a2a');
  out.shelf = shelf(); out.fridge = fridge(); out.sofa = sofa(); out.bed = bed(); out.counter = counter(); out.gaspump = gaspump();
  out.hay = hay(); out.corn0 = corn(1); out.corn1 = corn(7); out.scarecrow = scarecrow(); out.tractor = tractor(); out.well = well();
  out.labtable = labTable(); out.capsule = capsule(false); out.capsule_broken = capsule(true); out.rack = rack(); out.growth0 = growth(2); out.growth1 = growth(9); out.sign = sign();
  out.generator = generator(false); out.generator_on = generator(true); out.flood = flood(false); out.flood_on = flood(true);
  out.cratestack = crateStack(); out.locker = locker();
  for (const k of ['crack', 'oil', 'paper', 'puddle', 'goo', 'cone']) out[`d_${k}`] = decal(k, 3);
}
module.exports = { build };
