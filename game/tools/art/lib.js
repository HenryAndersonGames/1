'use strict';
// Библиотека «рисованного» вектора: жирный чернильный контур, свет/тень, штриховка.
const INK = '#1a110b';
let UID = 0;
const f = (n) => Math.round(n * 100) / 100;
const lerp = (a, b, t) => a + (b - a) * t;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
// тень холоднее, свет теплее — как в иллюстрации
function dark(h, k = 0.38) { const [r, g, b] = hex2rgb(h); return rgb2hex(r * (1 - k) * 0.9, g * (1 - k) * 0.94, b * (1 - k) + 10 * k); }
function light(h, k = 0.16) { const [r, g, b] = hex2rgb(h); return rgb2hex(r + (255 - r) * k + 8 * k, g + (255 - g) * k + 3 * k, b + (255 - b) * k * 0.7); }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }

// Сглаженный замкнутый/открытый контур через точки (Catmull-Rom). [x,y,1] — острый угол.
function smooth(pts, closed = true, t = 1) {
  const n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const end = closed ? n : n - 1;
  for (let i = 0; i < end; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    let c1 = [p1[0] + (p2[0] - p0[0]) / 6 * t, p1[1] + (p2[1] - p0[1]) / 6 * t];
    let c2 = [p2[0] - (p3[0] - p1[0]) / 6 * t, p2[1] - (p3[1] - p1[1]) / 6 * t];
    if (p1[2]) c1 = [p1[0] + (p2[0] - p1[0]) / 3, p1[1] + (p2[1] - p1[1]) / 3];
    if (p2[2]) c2 = [p2[0] - (p2[0] - p1[0]) / 3, p2[1] - (p2[1] - p1[1]) / 3];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}
const poly = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
function ell(cx, cy, rx, ry = rx) {
  const k = 0.5523;
  return `M${f(cx - rx)} ${f(cy)}C${f(cx - rx)} ${f(cy - ry * k)} ${f(cx - rx * k)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)}` +
    `C${f(cx + rx * k)} ${f(cy - ry)} ${f(cx + rx)} ${f(cy - ry * k)} ${f(cx + rx)} ${f(cy)}` +
    `C${f(cx + rx)} ${f(cy + ry * k)} ${f(cx + rx * k)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)}` +
    `C${f(cx - rx * k)} ${f(cy + ry)} ${f(cx - rx)} ${f(cy + ry * k)} ${f(cx - rx)} ${f(cy)}Z`;
}
// Неровный (рукотворный) прямоугольник
function wrect(x, y, w, h, seed, j = 0.6) {
  const r = rng(seed);
  const q = () => (r() - 0.5) * 2 * j;
  return poly([[x + q(), y + q()], [x + w * 0.5, y + q() * 0.6], [x + w + q(), y + q()], [x + w + q(), y + h + q()], [x + w * 0.5, y + h + q() * 0.6], [x + q(), y + h + q()]]);
}

function bbox(d) {
  const nums = (d.match(/-?\d*\.?\d+/g) || []).map(Number);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]);
    y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]);
  }
  return [x0, y0, x1, y1];
}

function hatch(bb, o = {}) {
  const [x0, y0, x1, y1] = bb;
  const gap = o.gap || 2.2, a = (o.ang ?? -52) * Math.PI / 180, r = rng(o.seed || 1);
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
  let d = '';
  for (let t = -R; t <= R; t += gap * (0.8 + r() * 0.4)) {
    const ox = cx + nx * t, oy = cy + ny * t, l1 = -R * (0.75 + r() * 0.25), l2 = R * (0.75 + r() * 0.25);
    d += `M${f(ox + dx * l1)} ${f(oy + dy * l1)}L${f(ox + dx * l2)} ${f(oy + dy * l2)}`;
  }
  return `<path d="${d}" fill="none" stroke="${o.col || INK}" stroke-width="${o.w || 0.6}" stroke-opacity="${o.op ?? 0.45}" stroke-linecap="round"/>`;
}

const BIG = '<rect x="-600" y="-600" width="1200" height="1200" fill="COL"/>';

// Главный примитив: залитая форма с контуром, светом по краю, тенью и штриховкой
function shape(d, fill, o = {}) {
  const sw = o.sw ?? 1.5, id = UID++;
  const [dx, dy] = o.sh ?? [2.6, 2.2];
  let s = '';
  if (!o.nodrop) s += `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${f(sw * 2)}" stroke-linejoin="round" transform="translate(${o.dropX ?? 0.6} ${o.dropY ?? 1})"/>`;
  if (sw > 0) s += `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${f(sw * 2)}" stroke-linejoin="round"/>`;
  s += `<path d="${d}" fill="${fill}"/>`;
  let inner = '';
  if (!o.flat) {
    const sc = o.shade || dark(fill, o.dk ?? 0.38), lc = o.light || light(fill, o.lk ?? 0.17);
    if (!o.nolight) {
      inner += BIG.replace('COL', lc);
      inner += `<path d="${d}" fill="${fill}" transform="translate(${f(dx * 0.4)} ${f(dy * 0.5)})"/>`;
    }
    inner += `<mask id="m${id}" maskUnits="userSpaceOnUse" x="-600" y="-600" width="1200" height="1200">${BIG.replace('COL', '#fff')}<path d="${d}" fill="#000" transform="translate(${-dx} ${-dy})"/></mask>`;
    inner += `<g mask="url(#m${id})">${BIG.replace('COL', sc)}${o.nohatch ? '' : hatch(bbox(d), { gap: o.hgap || 2.2, ang: o.hang, seed: id + 7, op: o.hop ?? 0.42, w: o.hw || 0.6 })}</g>`;
  }
  if (o.inner) inner += o.inner;
  if (inner) s += `<clipPath id="c${id}"><path d="${d}"/></clipPath><g clip-path="url(#c${id})">${inner}</g>`;
  return s;
}

// Обводка-линия (детали, складки, текстура)
const line = (d, w = 0.8, col = INK, op = 1) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`;
// Конечность из штриха: чернильная подложка + цвет + тень
function limb(pts, w, col, o = {}) {
  const d = smooth(pts, false);
  return line(d, w + (o.sw ?? 1.5) * 2, INK) + line(d, w, col) + line(d, w * 0.35, dark(col, 0.35), 0.8).replace('/>', ` transform="translate(${w * 0.22} ${w * 0.22})"/>`);
}
const g = (tr, s) => `<g transform="${tr}">${s}</g>`;
const dot = (x, y, r, col) => `<path d="${ell(x, y, r)}" fill="${col}"/>`;

// Доска с текстурой дерева
function plank(x, y, w, h, col, seed, o = {}) {
  const r = rng(seed);
  let grain = '';
  const vert = o.vert;
  const n = Math.max(2, Math.round((vert ? w : h) / 2.6));
  for (let i = 0; i < n; i++) {
    if (vert) {
      const gx = x + (i + 0.5) * w / n + (r() - 0.5);
      grain += `M${f(gx)} ${f(y + r() * h * 0.3)}C${f(gx + (r() - 0.5) * 2)} ${f(y + h * 0.4)} ${f(gx + (r() - 0.5) * 2)} ${f(y + h * 0.6)} ${f(gx + (r() - 0.5))} ${f(y + h - r() * h * 0.3)}`;
    } else {
      const gy = y + (i + 0.5) * h / n + (r() - 0.5);
      grain += `M${f(x + r() * w * 0.3)} ${f(gy)}C${f(x + w * 0.4)} ${f(gy + (r() - 0.5) * 2)} ${f(x + w * 0.6)} ${f(gy + (r() - 0.5) * 2)} ${f(x + w - r() * w * 0.3)} ${f(gy + (r() - 0.5))}`;
    }
  }
  let inner = line(grain, 0.5, dark(col, 0.45), 0.7);
  if (r() < (o.knot ?? 0.5)) {
    const kx = x + w * (0.2 + r() * 0.6), ky = y + h * (0.25 + r() * 0.5);
    inner += `<path d="${ell(kx, ky, vert ? 1.2 : 2.2, vert ? 2.2 : 1.1)}" fill="none" stroke="${dark(col, 0.5)}" stroke-width="0.7"/>`;
  }
  if (o.nails) for (const [nx, ny] of o.nails) inner += dot(nx, ny, 0.8, '#2a2420') + dot(nx - 0.25, ny - 0.3, 0.3, '#9a958c');
  return shape(wrect(x, y, w, h, seed, o.j ?? 0.35), col, { sw: o.sw ?? 0.9, sh: o.sh || [1.6, 1.6], nodrop: true, hgap: 1.8, hop: 0.3, inner });
}

function svg(minx, miny, w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}" height="${f(h)}" viewBox="${f(minx)} ${f(miny)} ${f(w)} ${f(h)}">${body}</svg>`;
}

module.exports = { INK, f, lerp, rng, dark, light, mix, smooth, poly, rect, ell, wrect, bbox, hatch, shape, line, limb, g, dot, plank, svg };
