'use strict';
// ---------- Процедурная графика: всё рисуется один раз в офскрин-канвасы ----------
const OL = '#15100c'; // цвет контура
const Art = {};

function bake(w, h, ax, ay, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.translate(ax, ay);
  x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = OL;
  fn(x);
  return { c, ax, ay, w, h };
}
function recolor(s, col, alpha = 1) {
  const c = document.createElement('canvas');
  c.width = s.w; c.height = s.h;
  const x = c.getContext('2d');
  x.drawImage(s.c, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = alpha; x.fillStyle = col; x.fillRect(0, 0, s.w, s.h);
  return { c, ax: s.ax, ay: s.ay, w: s.w, h: s.h };
}
function fs(x, fill, lw = 3) { x.fillStyle = fill; x.fill(); x.lineWidth = lw; x.strokeStyle = OL; x.stroke(); }
function limb(x, pts, w, col) {
  x.beginPath(); x.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
  x.lineWidth = w + 3.5; x.strokeStyle = OL; x.stroke();
  x.lineWidth = w; x.strokeStyle = col; x.stroke();
  x.strokeStyle = OL;
}
function ell(x, cx, cy, rx, ry) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); }

// ---------- Игроки ----------
const PAL = [
  { coat: '#6e4b2c', coatD: '#4b331e', accent: '#e8a03c', pants: '#3b3231', hair: '#251912', name: 'Игрок 1' },
  { coat: '#2e4853', coatD: '#20333c', accent: '#59c7b8', pants: '#2c2b33', hair: '#6a3d20', name: 'Игрок 2' },
];
function drawPlayerBody(x, pal, ph, moving) {
  const s = moving ? Math.sin(ph) : 0, bob = moving ? -Math.abs(Math.cos(ph)) * 2.5 : 0;
  limb(x, [-4, -18 + bob, -4 - s * 6, -3], 5, pal.pants);
  limb(x, [4, -18 + bob, 4 + s * 6, -3], 5, pal.pants);
  x.fillStyle = OL; ell(x, -4 - s * 6, -2, 4.5, 2.5); x.fill(); ell(x, 4 + s * 6, -2, 4.5, 2.5); x.fill();
  x.translate(0, bob);
  limb(x, [-7, -38, -10 + s * 4, -22], 4, pal.coatD);
  x.beginPath(); x.moveTo(-10, -43); x.lineTo(10, -43); x.lineTo(13, -16);
  x.quadraticCurveTo(0, -12, -13, -16); x.closePath(); fs(x, pal.coat);
  x.beginPath(); x.moveTo(2, -40); x.lineTo(3, -16); x.lineWidth = 1.5; x.stroke();
  x.fillStyle = OL; x.fillRect(4.5, -30, 2, 2); x.fillRect(4.5, -24, 2, 2);
  // шарф — главный цветовой маркер игрока
  x.beginPath(); x.moveTo(-11, -42); x.quadraticCurveTo(0, -37, 11, -42); x.lineTo(11, -47);
  x.quadraticCurveTo(0, -43, -11, -47); x.closePath(); fs(x, pal.accent, 2.5);
  x.beginPath(); x.moveTo(-8, -43); x.lineTo(-15 + s * 3, -29); x.lineTo(-9, -30); x.closePath(); fs(x, pal.accent, 2);
  // голова
  x.beginPath(); x.arc(1, -57, 11.5, 0, TAU); fs(x, '#e4d0ae');
  x.beginPath(); x.moveTo(-11.5, -56); x.lineTo(-14, -64); x.lineTo(-8, -63); x.lineTo(-8, -72); x.lineTo(-1, -67);
  x.lineTo(3, -74); x.lineTo(6, -67); x.lineTo(13, -69); x.lineTo(12, -61); x.quadraticCurveTo(5, -63, -2, -61);
  x.quadraticCurveTo(-7, -59, -11.5, -56); x.closePath(); fs(x, pal.hair, 2.5);
  x.fillStyle = OL; x.beginPath(); x.arc(7, -56, 1.9, 0, TAU); x.arc(1.5, -56, 1.9, 0, TAU); x.fill();
  x.beginPath(); x.moveTo(3, -50); x.lineTo(7, -50.5); x.lineWidth = 1.4; x.stroke();
}

// ---------- Монстры ----------
const EYE = { walker: [8, -73], jumper: [27, -29], clinger: [2, -14], brute: [22, -101] };

function drawWalker(x, ph, wind) {
  const s = Math.sin(ph), c = '#6d7763', cd = '#565e4e';
  limb(x, [-5, -32, -8 + s * 6, -14, -7 + s * 7, -1], 4, cd);
  limb(x, [5, -32, 8 - s * 6, -14, 7 - s * 7, -1], 4, cd);
  // дальняя рука
  if (wind) limb(x, [-2, -60, -10, -82, -6, -98], 4, cd);
  else limb(x, [-2, -60, -10 - s * 3, -36, -6 - s * 4, -10], 4, cd);
  // туловище — сутулое, вытянутое
  x.beginPath(); x.moveTo(-9, -30); x.quadraticCurveTo(-15, -56, -4, -68); x.lineTo(9, -66);
  x.quadraticCurveTo(14, -46, 8, -30); x.closePath(); fs(x, c);
  x.beginPath(); x.moveTo(-6, -58); x.lineTo(3, -56); x.moveTo(-7, -51); x.lineTo(4, -49); x.moveTo(-7, -44); x.lineTo(3, -42);
  x.lineWidth = 1.5; x.stroke();
  // голова, вынесенная вперёд
  x.beginPath(); x.ellipse(6, -73, 8, 9.5, 0.2, 0, TAU); fs(x, '#89907c');
  x.beginPath(); x.moveTo(4, -66); x.lineTo(12, -67); x.lineWidth = 2; x.stroke();
  x.fillStyle = '#e8e2b8'; x.beginPath(); x.arc(9, -74, 2, 0, TAU); x.arc(3.5, -74, 1.6, 0, TAU); x.fill();
  // ближняя рука с когтями
  let hx, hy;
  if (wind) { limb(x, [6, -62, 14, -84, 12, -102], 4.5, c); hx = 12; hy = -102; }
  else { limb(x, [6, -62, 13 + s * 3, -36, 14 + s * 4, -8], 4.5, c); hx = 14 + s * 4; hy = -8; }
  x.lineWidth = 2; x.beginPath();
  for (let i = -1; i <= 1; i++) { x.moveTo(hx, hy); x.lineTo(hx + 5 + i * 2, hy + (wind ? -6 : 6) + i * 2); }
  x.stroke();
}

function drawJumper(x, ph, crouch) {
  const s = Math.sin(ph), c = '#4c3b33', cd = '#3a2c26', dy = crouch ? 7 : 0;
  limb(x, [-12, -20 + dy, -20 - s * 5, -10, -16 - s * 6, -1], 3, cd);
  limb(x, [12, -22 + dy, 18 + s * 5, -12, 22 + s * 5, -1], 3, cd);
  x.beginPath(); x.moveTo(-22, -20 + dy); x.quadraticCurveTo(-6, -40 + dy, 16, -30 + dy);
  x.quadraticCurveTo(22, -20 + dy, 12, -14 + dy); x.quadraticCurveTo(-8, -10 + dy, -22, -20 + dy); fs(x, c);
  // гребень
  x.beginPath();
  for (let i = 0; i < 5; i++) { const bx = -14 + i * 6; x.moveTo(bx, -30 + dy + i * 0.3); x.lineTo(bx + 2, -38 + dy); x.lineTo(bx + 4, -31 + dy); }
  x.lineWidth = 2; x.stroke();
  // голова с пастью
  x.beginPath(); x.moveTo(14, -32 + dy); x.lineTo(32, -30 + dy); x.lineTo(34, -24 + dy); x.lineTo(24, -22 + dy);
  x.lineTo(30, -18 + dy); x.lineTo(16, -20 + dy); x.closePath(); fs(x, '#5c4a40');
  x.fillStyle = '#e9e2c6'; x.beginPath(); x.moveTo(24, -22 + dy); x.lineTo(26, -19 + dy); x.lineTo(28, -22 + dy); x.fill();
  limb(x, [-18, -18 + dy, -24 + s * 5, -8, -20 + s * 6, -1], 3.5, c);
  limb(x, [10, -18 + dy, 14 - s * 5, -9, 18 - s * 5, -1], 3.5, c);
}

function drawClinger(x, ph) {
  const s = Math.sin(ph * 2);
  x.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) {
    const a = (i - 1) * 0.6, w = s * (i % 2 ? 1 : -1) * 2;
    x.beginPath(); x.moveTo(-3, -12); x.lineTo(-12 - i, -16 + i * 6 + w); x.lineTo(-15 - i, -2 + i * 2); x.stroke();
    x.beginPath(); x.moveTo(3, -12); x.lineTo(12 + i, -16 + i * 6 - w); x.lineTo(15 + i, -2 + i * 2); x.stroke();
  }
  x.beginPath(); x.ellipse(0, -13, 9, 8, 0, 0, TAU); fs(x, '#b2958b');
  x.beginPath(); x.ellipse(-2, -15, 4, 3, 0, 0, TAU); x.fillStyle = '#cdb2a7'; x.fill();
  x.fillStyle = '#7a1f1a'; x.beginPath(); x.arc(2, -14, 3, 0, TAU); x.fill();
  x.fillStyle = OL; x.beginPath(); x.arc(2.5, -14, 1.3, 0, TAU); x.fill();
}

function drawBrute(x, ph, wind) {
  const s = Math.sin(ph), c = '#5e3f36', cl = '#7b5446', cd = '#46302a';
  limb(x, [-14, -28, -16 - s * 4, -2], 11, cd);
  limb(x, [14, -28, 16 + s * 4, -2], 11, cd);
  if (wind) limb(x, [-26, -82, -34, -108, -20, -124], 11, cd);
  else limb(x, [-26, -82, -42, -50, -38 - s * 3, -16], 11, cd);
  x.beginPath(); x.moveTo(-34, -30); x.quadraticCurveTo(-48, -84, -14, -100); x.quadraticCurveTo(22, -112, 34, -84);
  x.quadraticCurveTo(42, -52, 26, -26); x.quadraticCurveTo(-4, -18, -34, -30); fs(x, c);
  // наросты
  x.fillStyle = cl;
  ell(x, -18, -78, 9, 7); x.fill(); x.stroke();
  ell(x, 10, -92, 7, 5); x.fill(); x.stroke();
  ell(x, -26, -54, 6, 5); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(-10, -60); x.quadraticCurveTo(4, -52, 18, -62); x.lineWidth = 2; x.stroke();
  // маленькая голова
  x.beginPath(); x.ellipse(20, -98, 11, 9, 0.3, 0, TAU); fs(x, '#6e4a3f');
  x.fillStyle = '#e6dcb0'; x.beginPath(); x.arc(24, -100, 2.2, 0, TAU); x.arc(18, -101, 1.8, 0, TAU); x.fill();
  x.beginPath(); x.moveTo(16, -92); x.lineTo(28, -93); x.lineWidth = 2; x.stroke();
  if (wind) {
    limb(x, [24, -84, 34, -110, 26, -128], 12, c);
    x.beginPath(); x.arc(26, -130, 11, 0, TAU); fs(x, cl);
  } else {
    limb(x, [24, -84, 40, -52, 40 + s * 3, -20], 12, c);
    x.beginPath(); x.arc(40 + s * 3, -16, 11, 0, TAU); fs(x, cl);
  }
}

// ---------- Деревья ----------
function drawPine(x, rng, h) {
  x.beginPath(); x.moveTo(-6, 0); x.lineTo(-4, -34); x.lineTo(4, -34); x.lineTo(6, 0); x.closePath(); fs(x, '#3b2b21');
  const cols = ['#24332d', '#2b3c34', '#22302b', '#304238'];
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const y0 = -22 - i * h / 5.2, wdt = 54 - i * 11, top = y0 - h / 2.6;
    x.beginPath(); x.moveTo(-wdt, y0);
    const n = 5;
    for (let j = 1; j < n; j++) {
      const t = j / n;
      x.lineTo(-wdt * (1 - t) - rng() * 6, y0 - (y0 - top) * t + 6);
      x.lineTo(-wdt * (1 - t) + 7, y0 - (y0 - top) * t + 1);
    }
    x.lineTo(rng() * 4 - 2, top);
    for (let j = n - 1; j >= 1; j--) {
      const t = j / n;
      x.lineTo(wdt * (1 - t) - 7, y0 - (y0 - top) * t + 1);
      x.lineTo(wdt * (1 - t) + rng() * 6, y0 - (y0 - top) * t + 6);
    }
    x.lineTo(wdt, y0);
    x.quadraticCurveTo(0, y0 + 10, -wdt, y0);
    fs(x, cols[i % cols.length]);
    x.beginPath(); x.moveTo(-wdt * 0.5, y0 + 1); x.lineTo(-wdt * 0.2, y0 - 10); x.strokeStyle = '#3b5045'; x.lineWidth = 2; x.stroke();
    x.strokeStyle = OL;
  }
}
function drawDeadTree(x, rng) {
  x.beginPath(); x.moveTo(-9, 0); x.quadraticCurveTo(-5, -50, -3, -110); x.lineTo(3, -110); x.quadraticCurveTo(5, -50, 9, 0); x.closePath();
  fs(x, '#3d322b');
  const branch = (bx, by, a, len, w) => {
    if (len < 10) return;
    const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
    limb(x, [bx, by, ex, ey], w, '#3d322b');
    branch(ex, ey, a - 0.4 - rng() * 0.3, len * 0.66, Math.max(1, w * 0.6));
    if (rng() < 0.7) branch(ex, ey, a + 0.35 + rng() * 0.3, len * 0.6, Math.max(1, w * 0.6));
  };
  branch(0, -100, -Math.PI / 2 - 0.5, 36, 5);
  branch(0, -100, -Math.PI / 2 + 0.6, 32, 5);
  branch(-2, -64, -Math.PI + 0.5, 28, 4);
  branch(2, -76, -0.4, 26, 4);
}
function drawBush(x, rng) {
  for (let i = 0; i < 4; i++) {
    x.beginPath(); x.arc(-14 + i * 9 + rng() * 4, -10 - rng() * 8, 9 + rng() * 4, 0, TAU); fs(x, i % 2 ? '#2b3a2e' : '#33443a', 2.5);
  }
}

// ---------- Земля (чанки 512x512) ----------
const CHUNK = 512;
function bakeChunk(cx, cy) {
  const c = document.createElement('canvas'); c.width = CHUNK; c.height = CHUNK;
  const x = c.getContext('2d');
  const rng = mulberry32(cx * 7919 + cy * 104729 + 11);
  const ox = cx * CHUNK, oy = cy * CHUNK;
  x.fillStyle = '#2c3026'; x.fillRect(0, 0, CHUNK, CHUNK);
  const blobs = ['#32372a', '#272b22', '#2f3329', '#292d23', '#363a2b', '#2e2b23'];
  for (let i = 0; i < 34; i++) {
    x.globalAlpha = 0.55; x.fillStyle = blobs[(rng() * blobs.length) | 0];
    x.beginPath(); x.ellipse(rng() * CHUNK, rng() * CHUNK, 25 + rng() * 80, 15 + rng() * 50, rng() * 3, 0, TAU); x.fill();
  }
  x.globalAlpha = 1;
  // дорога
  for (const r of World.roads) {
    if (!rectsOverlap(ox, oy, CHUNK, CHUNK, r.x, r.y - 20, r.w, r.h + 40)) continue;
    x.fillStyle = '#3a3329';
    x.beginPath();
    for (let px = -10; px <= CHUNK + 10; px += 16) { const wx = px + ox; x.lineTo(px, r.y - oy + Math.sin(wx * 0.013) * 6 + Math.sin(wx * 0.05) * 2); }
    for (let px = CHUNK + 10; px >= -10; px -= 16) { const wx = px + ox; x.lineTo(px, r.y + r.h - oy + Math.sin(wx * 0.011 + 2) * 6 + Math.sin(wx * 0.07) * 2); }
    x.fill();
    x.strokeStyle = '#2b261f'; x.lineWidth = 5;
    for (const k of [0.32, 0.68]) {
      x.beginPath();
      for (let px = -10; px <= CHUNK + 10; px += 16) { const wx = px + ox; x.lineTo(px, r.y + r.h * k - oy + Math.sin(wx * 0.02 + k * 5) * 3); }
      x.stroke();
    }
  }
  // трава, камешки, листья
  for (let i = 0; i < 160; i++) {
    const gx = rng() * CHUNK, gy = rng() * CHUNK;
    x.strokeStyle = rng() < 0.5 ? '#3e4832' : '#4a5338'; x.lineWidth = 1.5;
    x.beginPath();
    for (let j = 0; j < 3; j++) { x.moveTo(gx + j * 3, gy); x.lineTo(gx + j * 3 + (rng() * 6 - 3), gy - 5 - rng() * 6); }
    x.stroke();
  }
  for (let i = 0; i < 40; i++) {
    x.fillStyle = rng() < 0.5 ? '#46423a' : '#3c3931';
    x.beginPath(); x.ellipse(rng() * CHUNK, rng() * CHUNK, 2 + rng() * 3, 1.5 + rng() * 2, 0, 0, TAU); x.fill();
  }
  for (let i = 0; i < 50; i++) { x.fillStyle = rng() < 0.5 ? '#5a4430' : '#4a3a28'; x.fillRect(rng() * CHUNK, rng() * CHUNK, 3, 2); }
  // полы
  for (const f of World.floors) {
    if (!rectsOverlap(ox, oy, CHUNK, CHUNK, f.x, f.y, f.w, f.h)) continue;
    x.save(); x.beginPath(); x.rect(f.x - ox, f.y - oy, f.w, f.h); x.clip();
    if (f.kind === 'wood') {
      x.fillStyle = '#4b3a2a'; x.fillRect(f.x - ox, f.y - oy, f.w, f.h);
      x.strokeStyle = '#33271c'; x.lineWidth = 2;
      for (let yy = 0; yy < f.h; yy += 16) {
        x.beginPath(); x.moveTo(f.x - ox, f.y - oy + yy); x.lineTo(f.x - ox + f.w, f.y - oy + yy); x.stroke();
        const off = (yy / 16) % 2 ? 40 : 0;
        for (let xx = off; xx < f.w; xx += 80) { x.beginPath(); x.moveTo(f.x - ox + xx, f.y - oy + yy); x.lineTo(f.x - ox + xx, f.y - oy + yy + 16); x.stroke(); }
      }
      x.fillStyle = 'rgba(0,0,0,0.15)';
      for (let i = 0; i < 12; i++) { x.beginPath(); x.ellipse(f.x - ox + rng() * f.w, f.y - oy + rng() * f.h, 10 + rng() * 20, 6 + rng() * 10, 0, 0, TAU); x.fill(); }
    } else {
      x.fillStyle = '#3a3934'; x.fillRect(f.x - ox, f.y - oy, f.w, f.h);
      x.strokeStyle = '#2a2925'; x.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        let px = f.x - ox + rng() * f.w, py = f.y - oy + rng() * f.h;
        x.beginPath(); x.moveTo(px, py);
        for (let j = 0; j < 4; j++) { px += rng() * 30 - 15; py += rng() * 30 - 15; x.lineTo(px, py); }
        x.stroke();
      }
      x.fillStyle = '#2c3026';
      for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(f.x - ox + rng() * f.w, f.y - oy + rng() * f.h, 8 + rng() * 14, 0, TAU); x.fill(); }
    }
    x.restore();
  }
  // кольцо камней у костра
  const fire = World.fire;
  if (fire && rectsOverlap(ox, oy, CHUNK, CHUNK, fire.x - 50, fire.y - 50, 100, 100)) {
    x.fillStyle = '#1e1a16'; x.beginPath(); x.ellipse(fire.x - ox, fire.y - oy, 26, 18, 0, 0, TAU); x.fill();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      x.beginPath(); x.ellipse(fire.x - ox + Math.cos(a) * 30, fire.y - oy + Math.sin(a) * 21, 7, 5, a, 0, TAU);
      x.fillStyle = i % 2 ? '#5b5850' : '#4c4a44'; x.fill(); x.strokeStyle = OL; x.lineWidth = 2; x.stroke();
    }
  }
  return c;
}

function initArt() {
  // игроки
  Art.players = PAL.map((pal) => {
    const walk = [], flash = [];
    for (let f = 0; f < 4; f++) {
      const s = bake(56, 84, 28, 78, (x) => drawPlayerBody(x, pal, f / 4 * TAU, true));
      walk.push(s); flash.push(recolor(s, '#ffffff'));
    }
    const idle = bake(56, 84, 28, 78, (x) => drawPlayerBody(x, pal, 0, false));
    return { walk, flash, idle, idleFlash: recolor(idle, '#ffffff') };
  });
  // монстры
  const mkE = (w, h, ax, ay, fn, frames = 4) => {
    const walk = [];
    for (let f = 0; f < frames; f++) walk.push(bake(w, h, ax, ay, (x) => fn(x, f / frames * TAU, false)));
    const wind = bake(w, h, ax, ay, (x) => fn(x, 0, true));
    return {
      walk, wind,
      flash: walk.map((s) => recolor(s, '#ffffff')),
      windFlash: recolor(wind, '#ffffff'),
      windRed: recolor(wind, '#ff2a1a', 0.45),
    };
  };
  Art.enemy = {
    walker: mkE(70, 120, 32, 112, drawWalker),
    jumper: mkE(84, 60, 40, 54, drawJumper),
    clinger: mkE(44, 36, 22, 30, (x, ph) => drawClinger(x, ph)),
    brute: mkE(140, 150, 70, 142, drawBrute),
  };
  // деревья
  const rng = mulberry32(99);
  Art.trees = [];
  for (let i = 0; i < 3; i++) Art.trees.push(bake(150, 230, 75, 222, (x) => drawPine(x, rng, 150 + i * 22)));
  Art.trees.push(bake(150, 200, 75, 192, (x) => drawDeadTree(x, rng)));
  Art.bushes = [];
  for (let i = 0; i < 3; i++) Art.bushes.push(bake(60, 40, 30, 34, (x) => drawBush(x, rng)));
  // чанки земли
  Art.chunks = [];
  const nx = Math.ceil(WORLD_W / CHUNK), ny = Math.ceil(WORLD_H / CHUNK);
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) Art.chunks.push({ cx, cy, c: bakeChunk(cx, cy) });
}
