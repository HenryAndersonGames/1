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
const ETYPES = ['walker', 'jumper', 'clinger', 'brute', 'ghoul', 'wolf', 'spider', 'void', 'titan'];
// Глаза для свечения в темноте (лицом вправо)
const EYE = {
  walker: [[21.6, -83.6], [16, -84.4]], jumper: [[30.6, -32.6]], clinger: [[10, -12.6], [7.6, -13.6]], brute: [[36.6, -96.6], [31, -97]],
  ghoul: [[12.6, -56.8], [6.8, -57.4]], wolf: [[33.4, -48.6]], spider: [[18, -21], [20.4, -19]], void: [[8.6, -80], [4, -80]],
  titan: [[54, -168], [47, -169], [57, -162], [50, -162.6]],
};

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
function recolor(s, col, alpha = 1) {
  const c = document.createElement('canvas');
  c.width = s.c.width; c.height = s.c.height;
  const x = c.getContext('2d');
  x.drawImage(s.c, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = alpha; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return { c, ax: s.ax, ay: s.ay, w: s.w, h: s.h };
}
const BIG = {};
function bigArt(name, sc) { const key = name + '@' + sc.toFixed(2); return BIG[key] || (BIG[key] = raster(Art.img[name], sc)); }
function flashOf(s) { return s.fl || (s.fl = recolor(s, '#ffffff', 0.85)); }
function redOf(s) { return s.rd || (s.rd = recolor(s, '#ff2a1a', 0.45)); }

async function initArt(onProgress) {
  const names = Object.keys(ART_SVG);
  const A = {};
  Art.img = {};
  let done = 0;
  // грузим пачками, чтобы не подвешивать слабый ПК
  for (let i = 0; i < names.length; i += 24) {
    await Promise.all(names.slice(i, i + 24).map((n) => loadSvg(n).then((a) => { if (a) { A[n] = raster(a); Art.img[n] = a; } done++; })));
    if (onProgress) onProgress(done / names.length);
  }
  Art.s = A;
  Art.players = [0, 1].map((i) => {
    const P = {};
    for (const k of Object.keys(A)) if (k.startsWith(`p${i}_`)) P[k.slice(3)] = A[k];
    P.walk = [0, 1, 2, 3, 4, 5].map((k) => A[`p${i}_walk${k}`]);
    P.carry = [0, 1, 2, 3].map((k) => A[`p${i}_carry${k}`]);
    return P;
  });
  Art.enemy = {};
  for (const t of ETYPES) Art.enemy[t] = { walk: [0, 1, 2, 3].map((k) => A[`${t}_walk${k}`]), wind: A[`${t}_wind`], die: A[`${t}_die`] };
  Art.trees = [A.pine0, A.pine1, A.pine2, A.dead0];
  Art.bushes = [A.bush0, A.bush1, A.bush2];
  Art.chunks = new Map();
  Art.ready = true;
}

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

// ---------- Земля: чанки 512x512, запекаются по требованию, старые выгружаются ----------
const CHUNK = 512, MAX_CHUNKS = 28;
function getChunk(cx, cy) {
  const key = cy * 64 + cx;
  let ch = Art.chunks.get(key);
  if (ch) { ch.used = G.t; return ch.c; }
  if (Art.chunks.size >= MAX_CHUNKS) {
    let old = null;
    for (const [k, v] of Art.chunks) if (!old || v.used < old[1].used) old = [k, v];
    Art.chunks.delete(old[0]);
  }
  ch = { c: bakeChunk(cx, cy), used: G.t };
  Art.chunks.set(key, ch);
  return ch.c;
}
const FLOOR_TILE = { wood: 'floor_wood', stone: 'floor_stone', tile: 'floor_tile', concrete: 'floor_concrete', asphalt: 'floor_asphalt', lab: 'floor_lab', hay: 'floor_hay' };
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
  x.strokeStyle = 'rgba(15,12,8,0.18)'; x.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const hx = rng() * CHUNK, hy = rng() * CHUNK, n = 4 + (rng() * 5) | 0;
    x.beginPath(); for (let k = 0; k < n; k++) { x.moveTo(hx + k * 4, hy); x.lineTo(hx + k * 4 - 6, hy + 8); } x.stroke();
  }
  // грунтовые дороги
  for (const r of World.roads) {
    if (!rectsOverlap(ox, oy, CHUNK, CHUNK, r.x - 20, r.y - 20, r.w + 40, r.h + 40)) continue;
    const vert = r.h > r.w;
    x.fillStyle = '#3a3328'; x.strokeStyle = OL; x.lineWidth = 2;
    x.beginPath();
    if (vert) {
      for (let py = -10; py <= CHUNK + 10; py += 12) { const wy = py + oy; x.lineTo(r.x - ox + Math.sin(wy * 0.013) * 6, py); }
      for (let py = CHUNK + 10; py >= -10; py -= 12) { const wy = py + oy; x.lineTo(r.x + r.w - ox + Math.sin(wy * 0.011 + 2) * 6, py); }
    } else {
      for (let px = -10; px <= CHUNK + 10; px += 12) { const wx = px + ox; x.lineTo(px, r.y - oy + Math.sin(wx * 0.013) * 6); }
      for (let px = CHUNK + 10; px >= -10; px -= 12) { const wx = px + ox; x.lineTo(px, r.y + r.h - oy + Math.sin(wx * 0.011 + 2) * 6); }
    }
    x.save(); x.beginPath(); x.rect(r.x - ox - 12, r.y - oy - 12, r.w + 24, r.h + 24); x.clip();
    x.beginPath();
    if (vert) {
      for (let py = -10; py <= CHUNK + 10; py += 12) { const wy = py + oy; x.lineTo(r.x - ox + Math.sin(wy * 0.013) * 6, py); }
      for (let py = CHUNK + 10; py >= -10; py -= 12) { const wy = py + oy; x.lineTo(r.x + r.w - ox + Math.sin(wy * 0.011 + 2) * 6, py); }
    } else {
      for (let px = -10; px <= CHUNK + 10; px += 12) { const wx = px + ox; x.lineTo(px, r.y - oy + Math.sin(wx * 0.013) * 6); }
      for (let px = CHUNK + 10; px >= -10; px -= 12) { const wx = px + ox; x.lineTo(px, r.y + r.h - oy + Math.sin(wx * 0.011 + 2) * 6); }
    }
    x.closePath(); x.fill(); x.globalAlpha = 0.5; x.stroke(); x.globalAlpha = 1;
    x.strokeStyle = '#2a241c'; x.lineWidth = 5;
    for (const k of [0.3, 0.7]) {
      x.beginPath();
      if (vert) for (let py = -10; py <= CHUNK + 10; py += 12) x.lineTo(r.x + r.w * k - ox + Math.sin((py + oy) * 0.02 + k * 5) * 3, py);
      else for (let px = -10; px <= CHUNK + 10; px += 12) x.lineTo(px, r.y + r.h * k - oy + Math.sin((px + ox) * 0.02 + k * 5) * 3);
      x.stroke();
    }
    x.restore();
  }
  // полы, асфальт, бетон
  for (const f of World.floors) {
    if (!rectsOverlap(ox, oy, CHUNK, CHUNK, f.x - 8, f.y - 8, f.w + 16, f.h + 16)) continue;
    x.save(); x.beginPath(); x.rect(f.x - ox, f.y - oy, f.w, f.h); x.clip();
    const t = S[FLOOR_TILE[f.kind]];
    // тайлы выравниваем по мировой сетке 64
    const sx = Math.floor(Math.max(f.x, ox - 64) / 64) * 64, sy = Math.floor(Math.max(f.y, oy - 64) / 64) * 64;
    const ex = Math.min(f.x + f.w, ox + CHUNK + 64), ey = Math.min(f.y + f.h, oy + CHUNK + 64);
    for (let yy = sy; yy < ey; yy += 64) for (let xx = sx; xx < ex; xx += 64) x.drawImage(t.c, xx - ox, yy - oy, 64, 64);
    if (f.road) {
      x.strokeStyle = '#c9b46a'; x.lineWidth = 3; x.setLineDash([24, 18]); x.beginPath();
      if (f.w > f.h) { x.moveTo(f.x - ox, f.y + f.h / 2 - oy); x.lineTo(f.x + f.w - ox, f.y + f.h / 2 - oy); }
      else { x.moveTo(f.x + f.w / 2 - ox, f.y - oy); x.lineTo(f.x + f.w / 2 - ox, f.y + f.h - oy); }
      x.stroke(); x.setLineDash([]);
    }
    x.restore();
    x.strokeStyle = OL; x.lineWidth = 2; x.strokeRect(f.x - ox, f.y - oy, f.w, f.h);
  }
  // природные декали (не на полах и дорогах)
  const covered = (wx, wy) => World.floors.some((f) => wx > f.x - 6 && wx < f.x + f.w + 6 && wy > f.y - 6 && wy < f.y + f.h + 10) ||
    World.roads.some((r) => wx > r.x - 8 && wx < r.x + r.w + 8 && wy > r.y - 8 && wy < r.y + r.h + 8) || dist(wx, wy, World.fire.x, World.fire.y) < 46;
  const decals = [['d_grass0', 26], ['d_grass1', 22], ['d_grass2', 22], ['d_leaves0', 7], ['d_leaves1', 7], ['d_stone1', 6], ['d_stone0', 2], ['d_fern', 4], ['d_mush', 1.5], ['d_flowers', 2.5], ['d_twig', 3], ['d_stump', 0.4], ['d_bones', 0.4]];
  const list = [];
  for (const [n, k] of decals) { const cnt = Math.floor(k) + (rng() < k % 1 ? 1 : 0); for (let i = 0; i < cnt; i++) list.push([n, rng() * CHUNK, rng() * CHUNK, 0.85 + rng() * 0.35, rng() < 0.5]); }
  for (const d of World.decals) if (d.x > ox - 30 && d.x < ox + CHUNK + 30 && d.y > oy - 30 && d.y < oy + CHUNK + 30) list.push([d.spr, d.x - ox, d.y - oy, d.s, false, true]);
  list.sort((a, b) => a[2] - b[2]);
  for (const [n, px, py, sc, fl, forced] of list) {
    if (!forced && covered(px + ox, py + oy)) continue;
    const s = S[n];
    x.save(); x.translate(px, py); if (fl) x.scale(-1, 1);
    x.drawImage(s.c, -s.ax * sc, -s.ay * sc, s.w * sc, s.h * sc);
    x.restore();
  }
  const fire = World.fire;
  if (fire && rectsOverlap(ox, oy, CHUNK, CHUNK, fire.x - 60, fire.y - 60, 120, 120)) { const s = S.fire_ring; x.drawImage(s.c, fire.x - ox - s.ax, fire.y - oy - s.ay, s.w, s.h); }
  return c;
}
