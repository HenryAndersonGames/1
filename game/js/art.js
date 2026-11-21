'use strict';
// ---------- Графика: векторные SVG (js/artdata.js, исходники в art/*.svg) ----------
// При запуске каждый SVG один раз растрируется в канвас с запасом 2x — дальше только drawImage.
const OL = '#1a110b';
const SS = 2;
const Art = { ready: false };

const PAL = [
  { accent: '#e8a03c', coatD: '#4b331e', name: 'Игрок 1' },
  { accent: '#59c7b8', coatD: '#20333c', name: 'Игрок 2' },
];

function loadSvg(name) {
  return new Promise((res) => {
    const text = ART_SVG[name];
    const m = text.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
    const img = new Image();
    img.onload = () => res({ name, img, x: +m[1], y: +m[2], w: +m[3], h: +m[4] });
    img.onerror = () => { console.warn('Не загрузился SVG', name); res(null); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
  });
}

function raster(a, sc = SS) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(a.w * sc)); c.height = Math.max(1, Math.ceil(a.h * sc));
  c.getContext('2d').drawImage(a.img, 0, 0, c.width, c.height);
  return { c, ax: -a.x, ay: -a.y, w: a.w, h: a.h };
}

// Белый/цветной силуэт спрайта (вспышка при ударе, подсветка атаки)
function recolor(s, col, alpha = 1) {
  const c = document.createElement('canvas');
  c.width = s.c.width; c.height = s.c.height;
  const x = c.getContext('2d');
  x.drawImage(s.c, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = alpha; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return { c, ax: s.ax, ay: s.ay, w: s.w, h: s.h };
}
// Крупная версия спрайта прямо из вектора (для экранов и портретов)
const BIG = {};
function bigArt(name, sc) {
  const key = name + '@' + sc.toFixed(2);
  return BIG[key] || (BIG[key] = raster(Art.img[name], sc));
}
function flashOf(s) { return s.fl || (s.fl = recolor(s, '#ffffff', 0.85)); }

// Глаза для свечения в темноте (координаты в спрайте, лицом вправо)
const EYE = {
  walker: [[21.6, -83.6], [16, -84.4]],
  jumper: [[30.6, -32.6]],
  clinger: [[10, -12.6], [7.6, -13.6]],
  brute: [[36.6, -96.6], [31, -97]],
};

async function initArt(onProgress) {
  const names = Object.keys(ART_SVG);
  const A = {};
  Art.img = {};
  let done = 0;
  await Promise.all(names.map((n) => loadSvg(n).then((a) => { if (a) { A[n] = raster(a); Art.img[n] = a; } done++; if (onProgress) onProgress(done / names.length); })));
  Art.s = A;
  Art.players = [0, 1].map((i) => {
    const walk = [0, 1, 2, 3].map((k) => A[`p${i}_walk${k}`]);
    return { walk, flash: walk.map(flashOf), idle: A[`p${i}_idle`], idleFlash: flashOf(A[`p${i}_idle`]), arm: A[`p${i}_arm`], head: A[`p${i}_head`] };
  });
  Art.enemy = {};
  for (const t of ['walker', 'jumper', 'clinger', 'brute']) {
    const walk = [0, 1, 2, 3].map((k) => A[`${t}_walk${k}`]);
    const wind = A[`${t}_wind`];
    Art.enemy[t] = { walk, wind, flash: walk.map(flashOf), windFlash: flashOf(wind), windRed: recolor(wind, '#ff2a1a', 0.45) };
  }
  Art.trees = [A.pine0, A.pine1, A.pine2, A.dead0];
  Art.bushes = [A.bush0, A.bush1, A.bush2];
  Art.chunks = [];
  const nx = Math.ceil(WORLD_W / CHUNK), ny = Math.ceil(WORLD_H / CHUNK);
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) Art.chunks.push({ cx, cy, c: bakeChunk(cx, cy) });
  Art.ready = true;
}

// Повтор тайла в прямоугольнике (без clip — обрезаем исходник)
function tile(ctx, s, x, y, w, h) {
  const k = s.c.width / s.w;
  for (let yy = 0; yy < h - 0.01; yy += s.h) {
    const th = Math.min(s.h, h - yy);
    for (let xx = 0; xx < w - 0.01; xx += s.w) {
      const tw = Math.min(s.w, w - xx);
      ctx.drawImage(s.c, 0, 0, tw * k, th * k, x + xx, y + yy, tw, th);
    }
  }
}

// ---------- Земля (чанки 512x512, запекаются один раз) ----------
const CHUNK = 512;
function bakeChunk(cx, cy) {
  const c = document.createElement('canvas'); c.width = CHUNK; c.height = CHUNK;
  const x = c.getContext('2d');
  const rng = mulberry32(cx * 7919 + cy * 104729 + 11);
  const ox = cx * CHUNK, oy = cy * CHUNK;
  const S = Art.s;
  x.fillStyle = '#2b2f25'; x.fillRect(0, 0, CHUNK, CHUNK);
  const blobs = ['#31362a', '#262a21', '#2e3228', '#292c22', '#353829', '#2f2b22', '#24281f'];
  for (let i = 0; i < 40; i++) {
    x.globalAlpha = 0.5; x.fillStyle = blobs[(rng() * blobs.length) | 0];
    x.beginPath(); x.ellipse(rng() * CHUNK, rng() * CHUNK, 25 + rng() * 90, 15 + rng() * 55, rng() * 3, 0, TAU); x.fill();
  }
  x.globalAlpha = 1;
  // штриховка земли — как в иллюстрации
  x.strokeStyle = 'rgba(15,12,8,0.18)'; x.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const hx = rng() * CHUNK, hy = rng() * CHUNK, n = 4 + (rng() * 5) | 0;
    x.beginPath();
    for (let k = 0; k < n; k++) { x.moveTo(hx + k * 4, hy); x.lineTo(hx + k * 4 - 6, hy + 8); }
    x.stroke();
  }
  // дорога
  for (const r of World.roads) {
    if (!rectsOverlap(ox, oy, CHUNK, CHUNK, r.x, r.y - 20, r.w, r.h + 40)) continue;
    const edge = (k, off) => { const wx = k + ox; return r.y + off - oy + Math.sin(wx * 0.013 + off) * 6 + Math.sin(wx * 0.05) * 2; };
    x.fillStyle = '#3a3328'; x.strokeStyle = OL; x.lineWidth = 2;
    x.beginPath();
    for (let px = -10; px <= CHUNK + 10; px += 12) x.lineTo(px, edge(px, 0));
    for (let px = CHUNK + 10; px >= -10; px -= 12) x.lineTo(px, edge(px, r.h));
    x.closePath(); x.fill();
    x.globalAlpha = 0.5; x.stroke(); x.globalAlpha = 1;
    x.strokeStyle = '#2a241c'; x.lineWidth = 6;
    for (const k of [0.32, 0.68]) {
      x.beginPath();
      for (let px = -10; px <= CHUNK + 10; px += 12) { const wx = px + ox; x.lineTo(px, r.y + r.h * k - oy + Math.sin(wx * 0.02 + k * 5) * 3); }
      x.stroke();
    }
    for (let i = 0; i < 30; i++) { const s = S.d_stone1, px = rng() * CHUNK, py = r.y - oy + rng() * r.h; x.drawImage(s.c, px - s.ax * 0.6, py - s.ay * 0.6, s.w * 0.6, s.h * 0.6); }
  }
  // полы
  for (const f of World.floors) {
    if (!rectsOverlap(ox, oy, CHUNK, CHUNK, f.x - 8, f.y - 8, f.w + 16, f.h + 16)) continue;
    x.save(); x.beginPath(); x.rect(f.x - ox, f.y - oy, f.w, f.h); x.clip();
    tile(x, f.kind === 'wood' ? S.floor_wood : S.floor_stone, f.x - ox, f.y - oy, f.w, f.h);
    x.restore();
    x.strokeStyle = OL; x.lineWidth = 2; x.strokeRect(f.x - ox, f.y - oy, f.w, f.h);
  }
  // декали: трава, листья, камни, грибы...
  const inFloor = (wx, wy) => World.floors.some((f) => wx > f.x - 6 && wx < f.x + f.w + 6 && wy > f.y - 6 && wy < f.y + f.h + 10) ||
    World.roads.some((r) => wy > r.y - 4 && wy < r.y + r.h + 4) || dist(wx, wy, World.fire.x, World.fire.y) < 46;
  const decals = [['d_grass0', 26], ['d_grass1', 22], ['d_grass2', 22], ['d_leaves0', 7], ['d_leaves1', 7], ['d_stone1', 6], ['d_stone0', 2], ['d_fern', 4], ['d_mush', 1.5], ['d_flowers', 2.5], ['d_twig', 3], ['d_stump', 0.4], ['d_bones', 0.4]];
  const list = [];
  for (const [n, k] of decals) {
    const cnt = Math.floor(k) + (rng() < k % 1 ? 1 : 0);
    for (let i = 0; i < cnt; i++) list.push([n, rng() * CHUNK, rng() * CHUNK]);
  }
  list.sort((a, b) => a[2] - b[2]);
  for (const [n, px, py] of list) {
    if (inFloor(px + ox, py + oy)) continue;
    const s = S[n], sc = 0.85 + rng() * 0.35, fl = rng() < 0.5;
    x.save(); x.translate(px, py); if (fl) x.scale(-1, 1);
    x.drawImage(s.c, -s.ax * sc, -s.ay * sc, s.w * sc, s.h * sc);
    x.restore();
  }
  // кострище
  const fire = World.fire;
  if (fire && rectsOverlap(ox, oy, CHUNK, CHUNK, fire.x - 60, fire.y - 60, 120, 120)) {
    const s = S.fire_ring;
    x.drawImage(s.c, fire.x - ox - s.ax, fire.y - oy - s.ay, s.w, s.h);
  }
  return c;
}
