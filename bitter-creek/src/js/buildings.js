// Постройки. Локальные координаты: фасад смотрит в +z, линия фасада z=0, здание уходит в -z.
// b — сплошная геометрия, g — светящиеся окна.
import { shade } from './models.js';

const TRIM = '#3a2a1d', ROOF = '#4a3a2f', POST = '#5a4330', PORCH = '#6b5038';

export function win(b, g, x, y, z, w, h, o = {}) {
  const trim = o.trim || TRIM;
  b.box(trim, x, y, z - 0.01, w + 0.22, h + 0.22, 0.05);
  if (o.dark) {
    b.box('#1c1612', x, y, z + 0.015, w, h, 0.03);
    b.box('#7a5a3e', x, y + h * 0.15, z + 0.05, w + 0.3, 0.16, 0.04, 0, 0, 0.25);
    b.box('#6e5036', x, y - h * 0.2, z + 0.06, w + 0.3, 0.16, 0.04, 0, 0, -0.2);
    return;
  }
  g.box(o.glass || '#ffcf86', x, y, z + 0.012, w, h, 0.03);
  b.box(trim, x, y - h / 2 - 0.14, z + 0.06, w + 0.34, 0.07, 0.14);
  b.box(trim, x, y + h / 2 + 0.16, z + 0.03, w + 0.36, 0.09, 0.08);
  b.box(trim, x, y, z + 0.035, 0.06, h, 0.03);
  b.box(trim, x, y + h * 0.1, z + 0.035, w, 0.06, 0.03);
  if (o.bars) for (let i = -2; i <= 2; i++) b.box('#222', x + i * w / 5, y, z + 0.06, 0.04, h, 0.04);
  if (o.shutters) {
    b.box(o.shutters, x - w / 2 - 0.28, y, z + 0.02, 0.34, h + 0.1, 0.05);
    b.box(o.shutters, x + w / 2 + 0.28, y, z + 0.02, 0.34, h + 0.1, 0.05);
  }
}

export function sideWin(b, g, x, y, z, len, h, o = {}) {
  const sx = Math.sign(x) || 1;
  b.box(o.trim || TRIM, x, y, z, 0.05, h + 0.22, len + 0.22);
  if (o.dark) { b.box('#6e5036', x + sx * 0.04, y, z, 0.04, 0.18, len + 0.3, 0.3, 0, 0); return; }
  g.box(o.glass || '#ffcf86', x + sx * 0.03, y, z, 0.03, h, len);
  b.box(o.trim || TRIM, x + sx * 0.05, y, z, 0.03, h, 0.06);
}

function door(b, x, y, z, o = {}) {
  const c = o.color || '#3a2818';
  b.box(o.trim || TRIM, x, y + 1.2, z, 1.7, 2.5, 0.06);
  b.box(c, x, y + 1.1, z + 0.03, 1.3, 2.2, 0.05);
  for (const dy of [0.55, 1.6]) for (const dx of [-0.3, 0.3]) b.box(shade(c, 1.18), x + dx, y + dy, z + 0.06, 0.42, dy > 1 ? 0.75 : 0.65, 0.02);
  b.box(o.trim || TRIM, x, y + 2.5, z + 0.06, 1.9, 0.12, 0.12);
  b.sph('#c7a24a', x + 0.48, y + 1.1, z + 0.08, 0.04, 0.04, 0.03, 8);
}

export function porch(b, w, o = {}) {
  const roof = o.roof || ROOF, post = o.post || POST;
  const depth = o.porchD || 2.7, ph = o.porchH || 3.0;
  b.box(o.porchC || PORCH, 0, 0.1, depth / 2, w, 0.2, depth);
  for (let x = -w / 2 + 0.3; x < w / 2; x += 0.5) b.box(shade(o.porchC || PORCH, 0.85), x, 0.205, depth / 2, 0.03, 0.01, depth);
  b.box(roof, 0, ph + 0.05, depth / 2 + 0.05, w + 0.2, 0.12, depth + 0.2, 0.09, 0, 0);
  const n = Math.max(2, Math.round(w / 4.5) + 1);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.25 + i * (w - 0.5) / (n - 1);
    b.box(post, x, ph / 2, depth - 0.15, 0.16, ph, 0.16);
    b.box(shade(post, 0.85), x, 0.28, depth - 0.15, 0.22, 0.1, 0.22);
    b.box(shade(post, 0.85), x, ph - 0.1, depth - 0.15, 0.24, 0.1, 0.24);
    b.box(post, x, ph - 0.3, depth - 0.42, 0.08, 0.08, 0.55, 0.8, 0, 0);
  }
  // стропила под навесом
  for (let x = -w / 2 + 0.2; x <= w / 2; x += 0.75) b.box(shade(roof, 0.8), x, ph - 0.03, depth / 2 + 0.1, 0.07, 0.09, depth + 0.3, 0.09, 0, 0);
  b.box(shade(roof, 0.75), 0, ph - 0.2, depth - 0.15, w, 0.14, 0.1);
  if (o.rail !== false) {
    for (const s of [-1, 1]) {
      const cx = s * (w / 2 - 1.5);
      b.box(post, cx, 0.8, depth - 0.15, 2.6, 0.07, 0.09);
      b.box(post, cx, 0.3, depth - 0.15, 2.6, 0.05, 0.07);
      for (let x = cx - 1.2; x <= cx + 1.2; x += 0.2) b.box(shade(post, 1.1), x, 0.55, depth - 0.15, 0.035, 0.48, 0.035);
    }
  }
  if (o.hitch !== false) {
    b.box(post, -1.6, 0.5, depth + 1.1, 0.14, 1.0, 0.14);
    b.box(post, 1.6, 0.5, depth + 1.1, 0.14, 1.0, 0.14);
    b.box(post, 0, 0.95, depth + 1.1, 3.5, 0.1, 0.1);
  }
}

export function falseFront(b, g, o) {
  const { w, d, h } = o;
  const wall = o.wall, wall2 = o.wall2 || shade(wall, 1.1), trim = o.trim || TRIM;
  const ff = h + (o.ff ?? 2.4);
  b.box(wall, 0, h / 2, -d / 2, w, h, d);
  b.box(o.roof || ROOF, 0, h + 0.1, -d / 2 - 0.1, w + 0.3, 0.2, d + 0.1);
  b.box(wall2, 0, ff / 2, 0.08, w + 0.3, ff, 0.3);
  b.box(trim, 0, ff + 0.12, 0.08, w + 0.6, 0.24, 0.45);
  if (o.step) {
    b.box(wall2, 0, ff + 0.6, 0.08, w * 0.42, 0.7, 0.3);
    b.box(trim, 0, ff + 1.0, 0.08, w * 0.42 + 0.35, 0.16, 0.42);
  }
  for (let y = 0.9; y < ff - 0.3; y += 0.85) b.box(shade(wall2, 0.82), 0, y, 0.235, w + 0.3, 0.05, 0.02);
  b.box(trim, -w / 2 - 0.1, ff / 2, 0.24, 0.2, ff, 0.08);
  b.box(trim, w / 2 + 0.1, ff / 2, 0.24, 0.2, ff, 0.08);
  for (let x = -w / 2; x <= w / 2 + 0.01; x += w / Math.max(4, Math.round(w / 1.4))) {
    b.box(trim, x, ff - 0.08, 0.3, 0.1, 0.2, 0.18);
    b.box(trim, x, ff - 0.22, 0.27, 0.07, 0.12, 0.1);
  }
  b.box(trim, 0, ff - 0.35, 0.25, w + 0.3, 0.06, 0.06);
  for (let x = -w / 2 + 0.5; x < w / 2; x += 1.1) b.box(shade(o.roof || ROOF, 0.8), x, h + 0.06, -d - 0.15, 0.08, 0.1, 0.4);
  // боковые окна
  for (const s of [-1, 1]) sideWin(b, g, s * (w / 2 + 0.02), 1.6, -d * 0.45, 1.2, 1.1, { dark: o.dark });
  if (o.swing) {
    b.box(TRIM, 0, 1.25, 0.24, 1.9, 2.6, 0.05);
    b.box('#120c08', 0, 1.2, 0.26, 1.7, 2.4, 0.03);
    b.box('#6b4a2e', -0.44, 1.3, 0.34, 0.8, 1.2, 0.05);
    b.box('#6b4a2e', 0.44, 1.3, 0.34, 0.8, 1.2, 0.05);
  } else door(b, 0, 0, 0.24, { color: o.doorC });
  const wx = Math.min(w * 0.3, 3.4);
  for (const s of [-1, 1]) win(b, g, s * wx, 1.65, 0.24, Math.min(1.8, w * 0.16), 1.4, { dark: o.dark, bars: o.bars, trim });
  if (o.upper) {
    for (const s of [-1, 0, 1]) win(b, g, s * wx, h + (o.twoStory ? -2.6 : 0.4), 0.24, 1.0, 1.2, { dark: o.dark, trim });
  }
  if (o.twoStory) {
    const bh = 3.3;
    porch(b, w, { ...o, porchH: bh, hitch: o.hitch });
    b.box(PORCH, 0, bh + 0.15, 1.35, w, 0.12, 2.7);
    for (let x = -w / 2 + 0.3; x <= w / 2 - 0.3; x += 0.6) b.box(POST, x, bh + 0.65, 2.6, 0.07, 0.9, 0.07);
    b.box(POST, 0, bh + 1.1, 2.6, w, 0.1, 0.1);
    b.box(o.roof || ROOF, 0, bh + 3.0, 1.35, w + 0.2, 0.12, 2.9, 0.12, 0, 0);
    for (const s of [-1, 1]) b.box(POST, s * (w / 2 - 0.25), bh + 1.5, 2.55, 0.16, 3.0, 0.16);
    door(b, 0, bh + 0.2, 0.24);
  } else porch(b, w, o);
  return { signY: ff - 1.0, signW: Math.min(w - 1.2, 8.5), signZ: 0.27 };
}

export function bank(b, g, o) {
  const { w, d, h } = o;
  const brick = o.wall || '#7d4034', stone = '#b5a892';
  b.box(brick, 0, h / 2, -d / 2, w, h, d);
  for (let y = 0.6; y < h; y += 0.5) b.box(shade(brick, 0.85), 0, y, 0.005, w + 0.02, 0.04, 0.02);
  b.box(stone, 0, h + 0.2, -d / 2, w + 0.5, 0.4, d + 0.5);
  b.box(stone, 0, h + 0.65, 0.1, w + 0.4, 0.5, 0.3);
  b.box(stone, 0, h + 1.15, 0.1, w * 0.5, 0.5, 0.3);
  b.box(stone, 0, 0.15, 1.0, w * 0.55, 0.3, 2.0);
  b.box(stone, 0, 0.35, 0.6, w * 0.45, 0.2, 1.2);
  for (const s of [-1, 1]) {
    b.cyl(stone, s * 2.0, 2.0, 1.6, 0.25, 0.28, 3.8, 8);
    b.box(stone, s * 2.0, 3.95, 1.6, 0.7, 0.2, 0.7);
  }
  b.box(stone, 0, 4.15, 1.3, 5.0, 0.3, 1.4);
  door(b, 0, 0.45, 0.03, { color: '#2b1a12' });
  for (const s of [-1, 1]) win(b, g, s * w * 0.32, 1.9, 0.03, 1.3, 1.8, { bars: true, trim: stone });
  for (const s of [-1, 0, 1]) win(b, g, s * w * 0.32, h - 1.2, 0.03, 1.1, 1.3, { trim: stone });
  return { signY: h + 1.15, signW: w * 0.45, signZ: 0.27 };
}

export function house(b, g, o) {
  const { w, d, h } = o;
  const rh = o.rh || w * 0.38;
  const wall = o.wall, roof = o.roof || '#3f322a';
  b.box(wall, 0, h / 2, -d / 2, w, h, d);
  b.prism(shade(wall, 0.92), 0, h, -d / 2, w, rh, d);
  for (let y = 0.6; y < h; y += 0.6) b.box(shade(wall, 0.85), 0, y, 0.005, w + 0.02, 0.04, 0.02);
  const a = Math.atan2(rh, w / 2), L = Math.hypot(w / 2, rh) + 0.6;
  // кровля рядами дранки
  const rows = 7;
  for (const s of [-1, 1]) {
    b.box(shade(roof, 0.7), s * (w / 4 + 0.05), h + rh / 2 + 0.02, -d / 2, L, 0.08, d + 0.8, 0, 0, -s * a);
    for (let k = 0; k < rows; k++) {
      const t = (k + 0.5) / rows, ex = s * (w / 2 + 0.3);
      const cx = ex * (1 - t), cy = h - 0.08 + (rh + 0.08) * t + 0.1;
      b.box(shade(roof, 0.88 + (k % 2) * 0.16), cx, cy, -d / 2, L / rows * 1.2, 0.07, d + 0.8, 0, 0, -s * (a + 0.05));
    }
    // торцевая доска и выступающие балки
    b.box(shade(wall, 0.7), s * (w / 4), h + rh / 2, 0.42, L - 0.3, 0.12, 0.06, 0, 0, -s * a);
  }
  b.box(shade(roof, 0.6), 0, h + rh + 0.08, -d / 2, 0.32, 0.2, d + 0.85);
  // угловые доски
  for (const s of [-1, 1]) { b.box(shade(wall, 0.75), s * (w / 2 + 0.03), h / 2, 0.03, 0.14, h, 0.14); b.box(shade(wall, 0.75), s * (w / 2 + 0.03), h / 2, -d - 0.03, 0.14, h, 0.14); }
  b.box(shade(wall, 0.7), 0, 0.15, 0.03, w + 0.1, 0.3, 0.08);
  if (o.chimney !== false) b.box('#6b4a3c', w * 0.25, h + rh * 0.7, -d * 0.7, 0.7, rh + 0.8, 0.7);
  door(b, o.doorX || 0, 0, 0.03, { color: o.doorC });
  const wx = w * 0.3;
  for (const s of [-1, 1]) if (Math.abs(s * wx - (o.doorX || 0)) > 1.2) win(b, g, s * wx, 1.6, 0.03, 1.1, 1.2, { dark: o.dark, shutters: o.shutters });
  for (const s of [-1, 1]) sideWin(b, g, s * (w / 2 + 0.01), 1.6, -d * 0.5, 1.1, 1.1, { dark: o.dark });
  if (o.attic) win(b, g, 0, h + rh * 0.4, 0.02, 0.7, 0.7, { dark: o.dark });
  if (o.porch) porch(b, w, { porchH: 2.6, porchD: 2.2, hitch: false, rail: true, roof });
  else { b.box('#5a4433', 0, 0.12, 0.5, 2.0, 0.24, 1.0); }
  return { signY: h - 0.2, signW: 3.5, signZ: 0.3 };
}

export function church(b, g, o) {
  const w = 12, d = 22, h = 7.2, rh = 5.2;
  const wall = '#c4baa6', roof = '#3b302a';
  house(b, g, { w, d, h, rh, wall, roof, chimney: false, doorC: '#2a1c14' });
  // башня
  b.box(wall, 0, 6.5, -1.6, 4.2, 13, 4.2);
  b.box(shade(wall, 0.85), 0, 13.1, -1.6, 4.6, 0.3, 4.6);
  b.box('#141010', 0, 11.6, 0.52, 1.4, 2.0, 0.05);
  b.box('#141010', 0, 11.6, -3.72, 1.4, 2.0, 0.05);
  b.cone(roof, 0, 15.8, -1.6, 3.3, 5.2, 4, 0, Math.PI / 4, 0);
  b.box('#2a2520', 0, 19.0, -1.6, 0.18, 1.8, 0.18);
  b.box('#2a2520', 0, 19.3, -1.6, 0.9, 0.16, 0.16);
  b.box(TRIM, 0, 1.6, 0.58, 2.2, 3.4, 0.08);
  b.box('#2a1c14', -0.52, 1.5, 0.64, 1.0, 3.0, 0.06);
  b.box('#2a1c14', 0.52, 1.5, 0.64, 1.0, 3.0, 0.06);
  g.box('#e0a560', 0, 6.2, 0.56, 1.2, 1.2, 0.04);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const z = -6 - i * 4.2;
    b.box(TRIM, s * (w / 2 + 0.02), 3.6, z, 0.06, 3.4, 1.4);
    g.box(i % 2 ? '#d8954a' : '#b8583c', s * (w / 2 + 0.04), 3.6, z, 0.04, 3.0, 1.1);
  }
  b.box('#8a8070', 0, 0.12, 1.6, 5, 0.24, 2.4);
  return { signY: -100 };
}

export function barn(b, g, o) {
  const { w, d, h } = o;
  const wall = o.wall || '#6e3326', trim = '#d8cdb5';
  house(b, g, { w, d, h, rh: w * 0.42, wall, roof: '#3a2c26', chimney: false, dark: true });
  b.box('#4a2a20', 0, 1.9, 0.06, 4.4, 3.8, 0.08);
  b.box(trim, 0, 1.9, 0.11, 4.4, 0.15, 0.04, 0, 0, 0.7);
  b.box(trim, 0, 1.9, 0.11, 4.4, 0.15, 0.04, 0, 0, -0.7);
  b.box(trim, 0, 3.85, 0.11, 4.6, 0.15, 0.04);
  b.box('#1a1210', 0, h + 1.2, 0.04, 1.6, 1.4, 0.05);
  b.box('#c9b070', 0.4, 0.4, 1.6, 1.4, 0.8, 1.0);
  b.box('#c9b070', -2.8, 0.4, 1.4, 1.2, 0.8, 0.9, 0, 0.4, 0);
  return { signY: h + 0.2, signW: 4.5, signZ: 0.2 };
}

export function shack(b, g, o) {
  const w = o.w || 5, d = o.d || 4, h = 2.6;
  const wall = o.wall || '#6a5844';
  b.box(wall, 0, h / 2, -d / 2, w, h, d);
  for (let x = -w / 2 + 0.25; x < w / 2; x += 0.5) b.box(shade(wall, 0.8 + (x * 7 % 3) * 0.08), x, h / 2, 0.01, 0.42, h, 0.03);
  b.box('#4a3c30', 0, h + 0.35, -d / 2, w + 0.8, 0.15, d + 1.0, 0.15, 0, 0);
  b.box('#555', w * 0.3, h + 1.0, -d * 0.6, 0.18, 1.6, 0.18);
  door(b, -w * 0.2, 0, 0.04, { color: '#2a2016' });
  win(b, g, w * 0.25, 1.6, 0.04, 0.8, 0.7, {});
  return { signY: -100 };
}

export function waterTower(b) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('#5a4433', sx * 1.6, 3.5, sz * 1.6, 0.25, 7, 0.25, sz * 0.05, 0, -sx * 0.05);
  b.box('#5a4433', 0, 3.5, 0, 3.4, 0.15, 0.15, 0, 0, 0.9);
  b.box('#5a4433', 0, 3.5, 0, 0.15, 0.15, 3.4, 0.9, 0, 0);
  b.box('#4a3a2e', 0, 7.1, 0, 4.0, 0.25, 4.0);
  b.cyl('#6e5640', 0, 8.6, 0, 2.0, 2.0, 2.8, 10);
  for (let y = 7.6; y < 10; y += 0.8) b.cyl('#2e2620', 0, y, 0, 2.03, 2.03, 0.08, 10);
  b.cone('#3f322a', 0, 10.6, 0, 2.3, 1.2, 10);
  b.box('#3a2c22', 0.4, 4.5, 2.05, 0.1, 9, 0.1);
}

export function well(b) {
  b.cyl('#7a6a58', 0, 0.45, 0, 1.2, 1.25, 0.9, 10);
  b.cyl('#0d0b0a', 0, 0.91, 0, 0.95, 0.95, 0.02, 10);
  for (const s of [-1, 1]) b.box('#5a4433', s * 1.05, 1.5, 0, 0.16, 2.2, 0.16);
  b.box('#5a4433', 0, 2.3, 0, 2.3, 0.12, 0.12);
  b.cyl('#4a3a2e', 0, 2.1, 0, 0.12, 0.12, 1.6, 6, 0, 0, Math.PI / 2);
  b.box('#3f322a', -0.5, 2.85, 0, 1.4, 0.1, 1.8, 0, 0, 0.6);
  b.box('#3f322a', 0.5, 2.85, 0, 1.4, 0.1, 1.8, 0, 0, -0.6);
  b.box('#6b5038', 0.3, 1.35, 0.2, 0.35, 0.35, 0.35);
}

export function gallows(b) {
  b.box('#4f3c2c', 0, 1.4, 0, 4.2, 0.2, 4.2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('#4a3829', sx * 1.95, 0.7, sz * 1.95, 0.22, 1.4, 0.22);
  for (let i = 0; i < 6; i++) b.box('#4f3c2c', 2.6 + i * 0.3, 1.25 - i * 0.24, 0, 0.32, 0.12, 1.2);
  b.box('#3e2f24', -1.3, 3.9, 0, 0.26, 5.0, 0.26);
  b.box('#3e2f24', 0, 6.2, 0, 3.0, 0.24, 0.24);
  b.box('#3e2f24', -0.8, 5.5, 0, 0.14, 1.3, 0.14, 0, 0, 0.8);
  b.box('#b8a47a', 0.9, 5.3, 0, 0.05, 1.7, 0.05);
  b.cyl('#b8a47a', 0.9, 4.3, 0, 0.18, 0.18, 0.05, 6, Math.PI / 2, 0, 0);
  b.box('#1e1814', 0.9, 1.52, 0, 1.2, 0.05, 1.2);
}

export function lampPost(b, g) {
  b.box('#2e2620', 0, 1.7, 0, 0.16, 3.4, 0.16);
  b.box('#2e2620', 0.3, 3.35, 0, 0.7, 0.08, 0.08);
  b.box('#1e1a16', 0.6, 3.05, 0, 0.32, 0.06, 0.32);
  g.box('#ffd28a', 0.6, 2.85, 0, 0.24, 0.34, 0.24);
  b.box('#1e1a16', 0.6, 2.62, 0, 0.3, 0.06, 0.3);
}

export function barrel(b, x, z, y = 0, c = '#6b4a2e') {
  b.cyl(c, x, y + 0.5, z, 0.38, 0.34, 1.0, 8);
  b.cyl('#2c2420', x, y + 0.2, z, 0.375, 0.375, 0.06, 8);
  b.cyl('#2c2420', x, y + 0.8, z, 0.375, 0.375, 0.06, 8);
}
export function crate(b, x, z, s = 0.8, ry = 0, y = 0) {
  b.box('#8a6a46', x, y + s / 2, z, s, s, s, 0, ry, 0);
  b.box('#5a4430', x, y + s / 2, z, s + 0.02, 0.08, s + 0.02, 0, ry, 0);
}
export function wagon(b, ry = 0) {
  b.box('#6a4e34', 0, 1.1, 0, 2.0, 0.5, 4.0);
  b.box('#5a4030', 0, 0.85, 0, 1.8, 0.1, 3.8);
  for (const sx of [-1, 1]) for (const sz of [-1.3, 1.3]) {
    b.cyl('#3a2c20', sx * 1.08, 0.7, sz, 0.7, 0.7, 0.1, 10, 0, 0, Math.PI / 2);
    b.cyl('#2a2018', sx * 1.08, 0.7, sz, 0.15, 0.15, 0.2, 6, 0, 0, Math.PI / 2);
  }
  b.box('#5a4030', 0, 0.75, 2.8, 0.12, 0.12, 2.2);
  b.cyl('#d9cfb5', 0, 1.6, 0, 1.0, 1.0, 3.6, 7, Math.PI / 2, 0, 0);
}
export function trough(b) {
  b.box('#5a4433', 0, 0.35, 0, 2.2, 0.7, 0.7);
  b.box('#3b4a4a', 0, 0.62, 0, 2.0, 0.05, 0.5);
}
export function cow(b, dead = false, c = '#7a5a40') {
  if (dead) {
    b.box(c, 0, 0.45, 0, 1.0, 0.8, 2.0, 0, 0, Math.PI / 2 - 0.1);
    b.box(c, 0.1, 0.3, 1.25, 0.45, 0.45, 0.6, 0, 0.3, 1.3);
    b.box('#3a0e0a', -0.3, 0.02, 0.3, 2.4, 0.02, 2.0);
    for (const s of [-1, 1]) b.box(c, 0.9, 0.3 + s * 0.15, s * 0.6, 0.9, 0.16, 0.16, 0, 0, 0.1);
    return;
  }
  b.box(c, 0, 1.05, 0, 0.9, 0.8, 1.8);
  b.box('#e8e0d0', 0.2, 1.1, 0.3, 0.92, 0.5, 0.6);
  b.box(c, 0, 1.2, 1.1, 0.45, 0.5, 0.6);
  b.box('#d8c0a8', 0, 1.05, 1.42, 0.4, 0.25, 0.1);
  b.box('#e0d8c0', -0.25, 1.48, 1.05, 0.25, 0.06, 0.06);
  b.box('#e0d8c0', 0.25, 1.48, 1.05, 0.25, 0.06, 0.06);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(shade(c, 0.8), sx * 0.3, 0.35, sz * 0.65, 0.16, 0.7, 0.16);
  b.box(c, 0, 1.0, -0.95, 0.06, 0.6, 0.06, 0.3, 0, 0);
}

export function skeleton(b, ry = 0) {
  const bone = '#d6ccb2';
  b.box(bone, 0, 0.1, 0, 0.3, 0.12, 0.6, 0, ry, 0);
  b.box(bone, Math.sin(ry) * 0.5, 0.12, Math.cos(ry) * 0.5, 0.22, 0.2, 0.24, 0, ry, 0);
  for (let i = -2; i <= 2; i++) b.box(bone, 0, 0.1, i * 0.1, 0.5, 0.04, 0.03, 0, ry, 0);
  b.box(bone, -0.2, 0.06, -0.6, 0.06, 0.06, 0.7, 0, ry + 0.2, 0);
  b.box(bone, 0.2, 0.06, -0.6, 0.06, 0.06, 0.7, 0, ry - 0.2, 0);
}

export function cowSkull(b) {
  b.box('#e2d8c0', 0, 0.15, 0, 0.35, 0.25, 0.55);
  b.box('#e2d8c0', -0.35, 0.25, -0.1, 0.4, 0.07, 0.07, 0, 0, 0.4);
  b.box('#e2d8c0', 0.35, 0.25, -0.1, 0.4, 0.07, 0.07, 0, 0, -0.4);
  b.box('#1a1410', -0.09, 0.2, 0.15, 0.08, 0.06, 0.2);
  b.box('#1a1410', 0.09, 0.2, 0.15, 0.08, 0.06, 0.2);
}

export function grave(b, kind, c) {
  if (kind === 'cross') {
    b.box(c || '#5a4636', 0, 0.75, 0, 0.12, 1.5, 0.08);
    b.box(c || '#5a4636', 0, 1.1, 0, 0.7, 0.12, 0.08);
  } else {
    b.box(c || '#8a8478', 0, 0.5, 0, 0.7, 1.0, 0.18);
    b.cyl(c || '#8a8478', 0, 1.0, 0, 0.35, 0.35, 0.18, 8, Math.PI / 2, 0, 0);
  }
  b.box('#5e4a36', 0, 0.06, 0.9, 0.8, 0.12, 1.7);
}
