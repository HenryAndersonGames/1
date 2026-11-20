'use strict';
// ---------- Отрисовка ----------
const Render = { W: 1280, H: 720, cv: null, ctx: null, lc: null, lx: null, scale: 1, fps: 60 };
const FONT = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';

function initRender() {
  Render.cv = document.getElementById('c');
  Render.ctx = Render.cv.getContext('2d', { alpha: false });
  Render.lc = document.createElement('canvas');
  Render.lx = Render.lc.getContext('2d');
  resize();
  addEventListener('resize', resize);
}

function resize() {
  const q = G.quality;
  const h = Math.min(innerHeight, 1080) * q, w = h * innerWidth / innerHeight;
  Render.W = Render.cv.width = Math.round(w);
  Render.H = Render.cv.height = Math.round(h);
  Render.lc.width = Math.ceil(Render.W / 4); Render.lc.height = Math.ceil(Render.H / 4);
}

function worldTransform(ctx, k = 1) {
  const v = viewSize(G.cam.zoom);
  const sx = G.shake ? rand(-G.shake, G.shake) * 0.5 : 0, sy = G.shake ? rand(-G.shake, G.shake) * 0.5 : 0;
  const s = v.scale * k;
  ctx.setTransform(s, 0, 0, s, (Render.W / 2 - (G.cam.x + sx) * v.scale) * k, (Render.H / 2 - (G.cam.y + sy) * v.scale) * k);
  return v;
}

function spr(ctx, s, x, y, flip, sc = 1) {
  if (flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(-sc, sc); ctx.drawImage(s.c, -s.ax, -s.ay); ctx.restore();
  } else if (sc !== 1) {
    ctx.drawImage(s.c, x - s.ax * sc, y - s.ay * sc, s.w * sc, s.h * sc);
  } else ctx.drawImage(s.c, x - s.ax, y - s.ay);
}

function render() {
  const ctx = Render.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d0c0a'; ctx.fillRect(0, 0, Render.W, Render.H);
  if (!G.players.length) return;
  const v = worldTransform(ctx);
  const vx0 = G.cam.x - v.w / 2 - 120, vx1 = G.cam.x + v.w / 2 + 120, vy0 = G.cam.y - v.h / 2 - 80, vy1 = G.cam.y + v.h / 2 + 260;
  const inView = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

  // 1. земля
  for (const ch of Art.chunks) {
    const x = ch.cx * CHUNK, y = ch.cy * CHUNK;
    if (x + CHUNK < vx0 || x > vx1 || y + CHUNK < vy0 - 200 || y > vy1) continue;
    ctx.drawImage(ch.c, x, y, CHUNK + 0.5, CHUNK + 0.5);
  }
  // 2. пятна, ловушки, тени
  for (const s of G.stains) {
    if (!inView(s.x, s.y)) continue;
    ctx.fillStyle = s.col; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.6, s.a, 0, TAU); ctx.fill();
  }
  for (const s of World.structs) if (s.kind === 'trap' && inView(s.x, s.y)) drawTrap(ctx, s);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  for (const p of G.players) if (p.state !== 'dead') { ctx.beginPath(); ctx.ellipse(p.x, p.y, 15, 6, 0, 0, TAU); ctx.fill(); }
  for (const e of G.enemies) if (inView(e.x, e.y) && e.state !== 'cling') {
    ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 1.15, e.r * 0.45, 0, 0, TAU); ctx.fill();
  }
  for (const t of World.trees) if (inView(t.x, t.y)) { ctx.beginPath(); ctx.ellipse(t.x + 8, t.y, 42 * t.s, 16 * t.s, 0, 0, TAU); ctx.fill(); }
  // маркеры игроков на земле
  for (const p of G.players) if (p.state !== 'dead') {
    ctx.strokeStyle = PAL[p.i].accent; ctx.globalAlpha = 0.55; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 19, 8, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  }

  // 3. сортировка по глубине
  const dl = [];
  for (const t of World.trees) if (inView(t.x, t.y)) dl.push({ k: t.y, t: 0, o: t });
  for (const b of World.bushes) if (inView(b.x, b.y)) dl.push({ k: b.y, t: 1, o: b });
  for (const w of World.walls) if (rectsOverlap(w.x, w.y - WALL_H, w.w, w.h + WALL_H, vx0, vy0, vx1 - vx0, vy1 - vy0)) dl.push({ k: w.y + w.h, t: 2, o: w });
  for (const c of World.cars) if (inView(c.x + c.w / 2, c.y)) dl.push({ k: c.y + c.h, t: 3, o: c });
  for (const s of World.structs) if (s.kind !== 'trap' && !s.carried && inView(s.x + s.w / 2, s.y)) dl.push({ k: s.y + s.h, t: 4, o: s });
  for (const p of G.players) dl.push({ k: p.y, t: 5, o: p });
  for (const e of G.enemies) if (inView(e.x, e.y)) dl.push({ k: e.state === 'cling' && e.host ? e.host.y + 2 : e.y, t: 6, o: e });
  for (const it of G.items) if (!it.held && !it.fly && inView(it.x, it.y)) dl.push({ k: it.y - 4, t: 7, o: it });
  for (const k of G.pickups) if (inView(k.x, k.y)) dl.push({ k: k.y, t: 8, o: k });
  for (const pr of G.projs) dl.push({ k: pr.y, t: 9, o: pr });
  dl.push({ k: World.fire.y, t: 10, o: World.fire });
  dl.sort((a, b) => a.k - b.k);
  for (const d of dl) {
    switch (d.t) {
      case 0: drawTree(ctx, d.o); break;
      case 1: spr(ctx, Art.bushes[d.o.v], d.o.x, d.o.y, false); break;
      case 2: drawWall(ctx, d.o); break;
      case 3: drawCar(ctx, d.o); break;
      case 4: drawStruct(ctx, d.o); break;
      case 5: drawPlayer(ctx, d.o); break;
      case 6: drawEnemy(ctx, d.o); break;
      case 7: drawItem(ctx, d.o.kind, d.o.x, d.o.y, 0); break;
      case 8: drawPickup(ctx, d.o); break;
      case 9: drawProj(ctx, d.o); break;
      case 10: drawFire(ctx, d.o); break;
    }
  }
  // частицы
  for (const q of G.parts) {
    ctx.globalAlpha = Math.min(1, q.life / q.max * 2);
    ctx.fillStyle = q.col; ctx.fillRect(q.x - q.size / 2, q.y - q.z - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;

  // 4. освещение
  const dk = darkness();
  if (dk > 0.01) drawLight(ctx, dk);

  // 5. поверх темноты: телеграфы атак, глаза, маркеры
  worldTransform(ctx);
  drawOverlay(ctx, dk);

  // 6. интерфейс
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawHUD(ctx);
}

// ---------- Объекты ----------
function occludes(x0, x1, yTop, yBase) {
  for (const p of G.players) {
    if (p.state === 'dead') continue;
    if (p.y < yBase && p.y > yTop && p.x > x0 && p.x < x1) return true;
  }
  return false;
}

function drawTree(ctx, t) {
  const s = Art.trees[t.v], sh = t.shake > 0 ? Math.sin(t.shake * 60) * 3 : 0;
  const occ = occludes(t.x - 58 * t.s, t.x + 58 * t.s, t.y - 190 * t.s, t.y);
  if (occ) ctx.globalAlpha = 0.38;
  ctx.drawImage(s.c, t.x - s.ax * t.s + sh, t.y - s.ay * t.s, s.w * t.s, s.h * t.s);
  ctx.globalAlpha = 1;
}

function boxRaised(ctx, x, y, w, h, H, top, front, lw = 2.5) {
  ctx.fillStyle = front; ctx.fillRect(x, y + h - H, w, H);
  ctx.fillStyle = top; ctx.fillRect(x, y - H, w, h);
  ctx.strokeStyle = OL; ctx.lineWidth = lw;
  ctx.strokeRect(x, y - H, w, h + H);
  ctx.beginPath(); ctx.moveTo(x, y + h - H); ctx.lineTo(x + w, y + h - H); ctx.stroke();
}

function drawWall(ctx, w) {
  const horiz = w.w > w.h;
  const occ = occludes(w.x - 14, w.x + w.w + 14, w.y - WALL_H - 50, w.y + (horiz ? w.h : 6));
  if (occ) ctx.globalAlpha = 0.45;
  if (w.bench) {
    boxRaised(ctx, w.x, w.y, w.w, w.h, 22, '#5d4630', '#3e2e20');
    ctx.fillStyle = '#7c7f82'; ctx.fillRect(w.x + 8, w.y - 20, 14, 6); ctx.fillStyle = '#a0603a'; ctx.fillRect(w.x + 34, w.y - 18, 20, 4);
    ctx.globalAlpha = 1; return;
  }
  const top = w.ruin ? '#4a4741' : '#463831', front = w.ruin ? '#34322d' : '#30251f';
  boxRaised(ctx, w.x, w.y, w.w, w.h, WALL_H, top, front);
  // доски/кирпичи на лицевой стороне
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
  if (horiz) {
    for (let yy = w.y + w.h - WALL_H + 9; yy < w.y + w.h; yy += 9) { ctx.moveTo(w.x + 2, yy); ctx.lineTo(w.x + w.w - 2, yy); }
    if (w.ruin) for (let xx = w.x + 14; xx < w.x + w.w; xx += 22) { ctx.moveTo(xx, w.y + w.h - WALL_H); ctx.lineTo(xx, w.y + w.h); }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawCar(ctx, c) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(c.x + c.w / 2, c.y + c.h, c.w / 2 + 6, 10, 0, 0, TAU); ctx.fill();
  boxRaised(ctx, c.x, c.y, c.w, c.h, 26, c.col, '#2c2723');
  ctx.fillStyle = '#1d2224'; ctx.fillRect(c.x + 24, c.y - 22, 56, c.h - 12);
  ctx.strokeStyle = OL; ctx.strokeRect(c.x + 24, c.y - 22, 56, c.h - 12);
  ctx.fillStyle = '#6a3a22'; ctx.fillRect(c.x + 86, c.y - 18, 14, 10); ctx.fillRect(c.x + 8, c.y + 2, 10, 6);
  ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(c.x + 20, c.y + c.h - 2, 9, 0, TAU); ctx.arc(c.x + c.w - 20, c.y + c.h - 2, 9, 0, TAU); ctx.fill();
}

function planks(ctx, x, y, w, h, n, col, vert) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    if (vert) { const pw = w / n; ctx.fillRect(x + i * pw + 1, y, pw - 2, h); ctx.strokeRect(x + i * pw + 1, y, pw - 2, h); }
    else { const ph = h / n; ctx.fillRect(x, y + i * ph + 1, w, ph - 2); ctx.strokeRect(x, y + i * ph + 1, w, ph - 2); }
  }
}

function drawStruct(ctx, s) {
  ctx.strokeStyle = OL; ctx.lineWidth = 2;
  const fl = s.flash > 0;
  if (s.ghost) ctx.globalAlpha = 0.6;
  const dmg = s.hp / s.maxHp;
  switch (s.kind) {
    case 'door': {
      if (s.broken) {
        ctx.fillStyle = '#3a2a1c'; ctx.fillRect(s.x, s.y + s.h - 6, s.w, 6);
        ctx.fillStyle = '#5a4128';
        for (let i = 0; i < 4; i++) ctx.fillRect(s.x + 4 + i * (s.w / 4), s.y + s.h - 10 - (i % 2) * 4, 6, 8);
        break;
      }
      if (s.open) {
        // распахнутая створка вдоль петли
        if (s.horiz) boxRaised(ctx, s.x - 2, s.y - s.w + s.h, 7, s.w, WALL_H, '#5b4330', '#3e2d1f', 2);
        else boxRaised(ctx, s.x, s.y - 4, s.w + 44, 7, WALL_H - 4, '#5b4330', '#3e2d1f', 2);
        break;
      }
      const occ = s.horiz && occludes(s.x - 10, s.x + s.w + 10, s.y - WALL_H - 50, s.y + s.h);
      if (occ) ctx.globalAlpha = 0.5;
      boxRaised(ctx, s.x, s.y, s.w, s.h, WALL_H, fl ? '#fff' : '#6a4d33', fl ? '#fff' : '#57402a');
      if (s.horiz && !fl) {
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let xx = s.x + 12; xx < s.x + s.w; xx += 12) { ctx.moveTo(xx, s.y + s.h - WALL_H); ctx.lineTo(xx, s.y + s.h); }
        ctx.stroke();
        ctx.fillStyle = '#c9a65a'; ctx.beginPath(); ctx.arc(s.x + s.w - 10, s.y + s.h - 16, 2.5, 0, TAU); ctx.fill();
      }
      drawCracks(ctx, s, dmg);
      ctx.globalAlpha = 1;
      break;
    }
    case 'window': {
      if (s.broken) {
        boxRaised(ctx, s.x, s.y, s.w, s.h, 8, '#3b302a', '#2b231e', 2);
        ctx.fillStyle = '#8fa6a8';
        ctx.beginPath(); ctx.moveTo(s.x + 3, s.y + s.h - 8); ctx.lineTo(s.x + 8, s.y + s.h - 14); ctx.lineTo(s.x + 11, s.y + s.h - 8); ctx.fill();
        break;
      }
      const occ = s.horiz && occludes(s.x - 10, s.x + s.w + 10, s.y - WALL_H - 50, s.y + s.h);
      if (occ) ctx.globalAlpha = 0.5;
      boxRaised(ctx, s.x, s.y, s.w, s.h, WALL_H, fl ? '#fff' : '#463831', fl ? '#fff' : '#30251f');
      if (s.horiz) {
        ctx.fillStyle = '#1f2a33'; ctx.fillRect(s.x + 4, s.y + s.h - WALL_H + 6, s.w - 8, WALL_H - 14);
        ctx.fillStyle = '#6a4d33'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
        const n = Math.max(1, Math.ceil(dmg * 3));
        for (let i = 0; i < n; i++) {
          ctx.save(); ctx.translate(s.x + s.w / 2, s.y + s.h - WALL_H + 10 + i * 7); ctx.rotate(i % 2 ? 0.25 : -0.2);
          ctx.fillRect(-s.w / 2 - 2, -2.5, s.w + 4, 5); ctx.strokeRect(-s.w / 2 - 2, -2.5, s.w + 4, 5); ctx.restore();
        }
      } else {
        ctx.fillStyle = '#6a4d33'; ctx.fillRect(s.x + 3, s.y - WALL_H + 4, s.w - 6, s.h - 6);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'barricade': {
      const H = 24;
      ctx.strokeStyle = OL; ctx.lineWidth = 2;
      if (s.vert) {
        ctx.fillStyle = fl ? '#fff' : '#3d2c1e'; ctx.fillRect(s.x + 2, s.y - H, s.w - 4, s.h + H - 4); ctx.strokeRect(s.x + 2, s.y - H, s.w - 4, s.h + H - 4);
        planks(ctx, s.x, s.y - H, s.w, s.h + 4, 1, fl ? '#fff' : '#7a5a3a', true);
        ctx.fillStyle = '#5e4630';
        for (let i = 0; i < 3; i++) { ctx.fillRect(s.x - 3, s.y - H + 8 + i * 22, s.w + 6, 6); ctx.strokeRect(s.x - 3, s.y - H + 8 + i * 22, s.w + 6, 6); }
      } else {
        ctx.fillStyle = fl ? '#fff' : '#3d2c1e'; ctx.fillRect(s.x, s.y - H + 4, s.w, s.h + H - 4);
        planks(ctx, s.x, s.y - H, s.w, H + s.h - 2, 3, fl ? '#fff' : '#7a5a3a', false);
        ctx.save(); ctx.translate(s.x + s.w / 2, s.y - 4); ctx.rotate(-0.35);
        ctx.fillStyle = '#5e4630'; ctx.fillRect(-s.w / 2, -3, s.w, 6); ctx.strokeRect(-s.w / 2, -3, s.w, 6); ctx.restore();
      }
      drawCracks(ctx, s, dmg);
      break;
    }
    case 'furn': {
      const f = FURN[s.sub];
      if (s.sub === 'table') {
        ctx.fillStyle = '#2b2019';
        ctx.fillRect(s.x + 4, s.y + s.h - 16, 5, 16); ctx.fillRect(s.x + s.w - 9, s.y + s.h - 16, 5, 16);
        ctx.fillStyle = fl ? '#fff' : '#6b4f35'; ctx.fillRect(s.x, s.y - f.H, s.w, s.h + 6); ctx.strokeRect(s.x, s.y - f.H, s.w, s.h + 6);
        ctx.fillStyle = '#56402b'; ctx.fillRect(s.x, s.y - f.H + s.h + 6, s.w, 5); ctx.strokeRect(s.x, s.y - f.H + s.h + 6, s.w, 5);
      } else if (s.sub === 'cabinet') {
        boxRaised(ctx, s.x, s.y, s.w, s.h, f.H, fl ? '#fff' : '#5a4332', fl ? '#fff' : '#45331f');
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(s.x + s.w / 2, s.y + s.h - f.H + 3); ctx.lineTo(s.x + s.w / 2, s.y + s.h - 3); ctx.stroke();
        ctx.fillStyle = '#c9a65a'; ctx.fillRect(s.x + s.w / 2 - 6, s.y + s.h - f.H / 2, 3, 6); ctx.fillRect(s.x + s.w / 2 + 3, s.y + s.h - f.H / 2, 3, 6);
      } else {
        boxRaised(ctx, s.x, s.y, s.w, s.h, f.H, fl ? '#fff' : '#7a5a3a', fl ? '#fff' : '#5e4630');
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath();
        ctx.moveTo(s.x + 3, s.y + s.h - f.H + 3); ctx.lineTo(s.x + s.w - 3, s.y + s.h - 3);
        ctx.moveTo(s.x + s.w - 3, s.y + s.h - f.H + 3); ctx.lineTo(s.x + 3, s.y + s.h - 3); ctx.stroke();
      }
      drawCracks(ctx, s, dmg);
      break;
    }
    case 'loot': {
      boxRaised(ctx, s.x, s.y, s.w, s.h, 18, fl ? '#fff' : '#7e6a45', fl ? '#fff' : '#5d4d31', 2);
      ctx.fillStyle = '#c99a3a'; ctx.fillRect(s.x + s.w / 2 - 3, s.y + s.h - 18, 6, 18);
      ctx.fillStyle = '#d8c48a'; ctx.fillRect(s.x + 4, s.y - 14, 8, 3);
      break;
    }
  }
  ctx.globalAlpha = 1;
  if (dmg < 1 && s.kind !== 'loot' && !s.broken && s.kind !== 'trap') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(s.x + s.w / 2 - 18, s.y - 48, 36, 5);
    ctx.fillStyle = dmg > 0.5 ? '#c9b46a' : dmg > 0.25 ? '#d6873a' : '#d6493a'; ctx.fillRect(s.x + s.w / 2 - 18, s.y - 48, 36 * dmg, 5);
  }
}

function drawCracks(ctx, s, dmg) {
  if (dmg > 0.66) return;
  ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath();
  const cx = s.x + s.w / 2, cy = s.y + s.h - 14;
  ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx - 2, cy); ctx.lineTo(cx - 6, cy + 8);
  if (dmg < 0.33) { ctx.moveTo(cx + 6, cy - 10); ctx.lineTo(cx + 2, cy - 2); ctx.lineTo(cx + 10, cy + 4); }
  ctx.stroke();
}

function drawTrap(ctx, s) {
  ctx.fillStyle = s.flash > 0 ? '#fff' : '#3a3632'; ctx.strokeStyle = OL; ctx.lineWidth = 2;
  ctx.fillRect(s.x, s.y, s.w, s.h); ctx.strokeRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = '#9aa0a3';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const x = s.x + 5 + i * 9, y = s.y + 6 + j * 8;
    ctx.beginPath(); ctx.moveTo(x - 3, y + 3); ctx.lineTo(x, y - 5); ctx.lineTo(x + 3, y + 3); ctx.fill();
  }
}

function drawFire(ctx, f) {
  const t = G.t;
  ctx.fillStyle = '#3a2618'; ctx.strokeStyle = OL; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.save(); ctx.translate(f.x, f.y - 4); ctx.rotate(i * 1.05); ctx.fillRect(-18, -4, 36, 8); ctx.strokeRect(-18, -4, 36, 8); ctx.restore();
  }
  const layers = [['#c2401c', 22, 44], ['#f08a24', 15, 34], ['#ffd860', 8, 22]];
  for (const [col, w, h] of layers) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(f.x - w, f.y - 4);
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const xx = f.x - w + (2 * w) * i / n, hh = h * (0.6 + 0.4 * Math.sin(t * 9 + i * 2.1)) * (i % 2 ? 1 : 0.6);
      ctx.lineTo(xx, f.y - 4 - hh);
    }
    ctx.lineTo(f.x + w, f.y - 4); ctx.closePath(); ctx.fill();
  }
  if (Math.random() < 0.15) part(f.x + rand(-10, 10), f.y - 10, 20, rand(-10, 10), rand(-5, 5), rand(80, 160), 1.2, '#ffb040', 2, -40);
}

function drawItem(ctx, kind, x, y, z) {
  ctx.strokeStyle = OL; ctx.lineWidth = 2;
  if (kind === 'brick') {
    ctx.fillStyle = '#8c3e2c'; ctx.fillRect(x - 9, y - 8 - z, 18, 9); ctx.strokeRect(x - 9, y - 8 - z, 18, 9);
    ctx.fillStyle = '#a5503a'; ctx.fillRect(x - 9, y - 12 - z, 18, 4); ctx.strokeRect(x - 9, y - 12 - z, 18, 4);
  } else {
    ctx.fillStyle = '#4f7a52'; ctx.beginPath(); ctx.moveTo(x - 4, y - z); ctx.lineTo(x - 5, y - 12 - z); ctx.lineTo(x - 2, y - 15 - z);
    ctx.lineTo(x - 2, y - 21 - z); ctx.lineTo(x + 2, y - 21 - z); ctx.lineTo(x + 2, y - 15 - z); ctx.lineTo(x + 5, y - 12 - z); ctx.lineTo(x + 4, y - z); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 3, y - 11 - z, 2, 8);
  }
}

function drawPickup(ctx, k) {
  const b = Math.sin(k.t * 4) * 2 + 4, y = k.y - k.z - b;
  ctx.strokeStyle = OL; ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(k.x, k.y, 8, 3, 0, 0, TAU); ctx.fill();
  if (k.kind === 'wood') {
    ctx.fillStyle = '#7a5530'; ctx.fillRect(k.x - 10, y - 6, 20, 7); ctx.strokeRect(k.x - 10, y - 6, 20, 7);
    ctx.fillStyle = '#c9a070'; ctx.beginPath(); ctx.ellipse(k.x + 10, y - 2.5, 2.5, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  } else if (k.kind === 'scrap') {
    ctx.fillStyle = '#8a959b'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? 5 : 8; ctx.lineTo(k.x + Math.cos(a) * r, y - 4 + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(k.x, y - 4, 2, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#e8e2d6'; ctx.fillRect(k.x - 8, y - 11, 16, 13); ctx.strokeRect(k.x - 8, y - 11, 16, 13);
    ctx.fillStyle = '#c23a2e'; ctx.fillRect(k.x - 1.5, y - 9, 3, 9); ctx.fillRect(k.x - 4.5, y - 6, 9, 3);
  }
}

function drawProj(ctx, pr) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 8, 3, 0, 0, TAU); ctx.fill();
  if (pr.kind === 'furn') {
    const f = pr.ref;
    ctx.save(); ctx.translate(pr.x, pr.y - pr.z); ctx.rotate(G.t * 8);
    ctx.fillStyle = '#7a5a3a'; ctx.strokeStyle = OL; ctx.lineWidth = 2;
    ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h); ctx.strokeRect(-f.w / 2, -f.h / 2, f.w, f.h); ctx.restore();
  } else {
    ctx.save(); ctx.translate(pr.x, pr.y - pr.z); ctx.rotate(G.t * 14); drawItem(ctx, pr.kind, 0, 6, 0); ctx.restore();
  }
}

function drawWeapon(ctx, p) {
  let a, len = 36;
  if (p.state === 'attack') {
    const k = clamp(p.t / p.hitAt, 0, 1), dir = p.combo === 1 ? -1 : 1;
    const sweep = p.combo === 2 ? 2.6 : 2.0;
    a = p.face - dir * sweep / 2 + dir * sweep * (p.t < p.hitAt ? k * 0.15 : Math.min(1, 0.15 + (p.t - p.hitAt) / 0.06));
    if (p.t >= p.hitAt && p.t < p.hitAt + 0.08) {
      ctx.strokeStyle = 'rgba(255,240,210,0.5)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 28, 54, 34, 0, p.face - sweep / 2, p.face + sweep / 2); ctx.stroke();
    }
  } else a = p.face + (Math.cos(p.face) >= 0 ? 0.9 : -0.9);
  const hx = p.x + Math.cos(a) * 8, hy = p.y - 30 + Math.sin(a) * 5;
  const ex = p.x + Math.cos(a) * len, ey = p.y - 30 + Math.sin(a) * len * 0.6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = OL; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = '#a77a4c'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = '#7d5735'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(lerp(hx, ex, 0.55), lerp(hy, ey, 0.55)); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.fillStyle = '#e4d0ae'; ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, TAU); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawPlayer(ctx, p) {
  const A = Art.players[p.i];
  if (p.state === 'dead') {
    ctx.strokeStyle = OL; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 26); ctx.moveTo(p.x - 9, p.y - 18); ctx.lineTo(p.x + 9, p.y - 18); ctx.stroke();
    ctx.strokeStyle = PAL[p.i].accent; ctx.lineWidth = 2.5; ctx.stroke();
    return;
  }
  const flip = Math.cos(p.face) < 0;
  if (p.state === 'downed') {
    ctx.save(); ctx.translate(p.x, p.y - 6); ctx.rotate(flip ? 1.45 : -1.45); ctx.scale(flip ? -1 : 1, 1);
    ctx.drawImage(A.idle.c, -A.idle.ax, -A.idle.ay + 30); ctx.restore();
    return;
  }
  const fr = p.moving ? Math.floor(p.anim) % 4 : -1;
  const s = p.hurtT > 0.12 ? (fr < 0 ? A.idleFlash : A.flash[fr]) : (fr < 0 ? A.idle : A.walk[fr]);
  const back = Math.sin(p.face) < -0.3;
  const blink = p.inv > 0 && p.state !== 'roll' && Math.floor(G.t * 20) % 2;
  if (blink) ctx.globalAlpha = 0.55;
  if (back && !p.held) drawWeapon(ctx, p);
  if (p.state === 'roll') {
    const k = 1 - p.t / 0.3;
    ctx.save(); ctx.translate(p.x, p.y - 20); ctx.rotate((flip ? -1 : 1) * k * TAU); ctx.scale(flip ? -0.9 : 0.9, 0.9);
    ctx.drawImage(s.c, -s.ax, -s.ay + 20); ctx.restore();
  } else spr(ctx, s, p.x, p.y, flip);
  if (!back && !p.held && p.state !== 'roll') drawWeapon(ctx, p);
  ctx.globalAlpha = 1;
  if (p.held) {
    if (p.held.kind === 'item') drawItem(ctx, p.held.ref.kind, p.x, p.y - 76, 0);
    else {
      const f = p.held.ref, y = p.y - 70;
      ctx.fillStyle = '#7a5a3a'; ctx.strokeStyle = OL; ctx.lineWidth = 2;
      ctx.fillRect(p.x - f.w / 2, y - f.h, f.w, f.h); ctx.strokeRect(p.x - f.w / 2, y - f.h, f.w, f.h);
      ctx.fillStyle = '#5e4630'; ctx.fillRect(p.x - f.w / 2, y - 6, f.w, 6); ctx.strokeRect(p.x - f.w / 2, y - 6, f.w, 6);
    }
    // руки вверх
    ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - 38); ctx.lineTo(p.x - 10, p.y - 66); ctx.moveTo(p.x + 8, p.y - 38); ctx.lineTo(p.x + 10, p.y - 66); ctx.stroke();
    ctx.strokeStyle = PAL[p.i].coatD; ctx.lineWidth = 3.5; ctx.stroke();
  }
}

function drawEnemy(ctx, e) {
  const A = Art.enemy[e.type];
  const flip = Math.cos(e.face) < 0;
  const fr = Math.floor(e.anim) % A.walk.length;
  const windy = e.state === 'wind' || e.state === 'crouch';
  let s = windy ? A.wind : A.walk[fr];
  if (e.flash > 0) s = windy ? A.windFlash : A.flash[fr];
  if (e.state === 'dying') ctx.globalAlpha = Math.max(0, e.t / 0.4);
  let y = e.y, sc = 1;
  if (e.state === 'leap') y -= Math.sin((1 - e.t / 0.42) * Math.PI) * 30;
  if (e.state === 'dying') { sc = 1; y += (1 - e.t / 0.4) * 8; }
  if (e.state === 'cling' && e.host) { y = e.host.y - 34; }
  spr(ctx, s, e.x, y, flip, sc);
  if (windy && e.flash <= 0 && Math.floor(G.t * 16) % 2) spr(ctx, A.windRed, e.x, y, flip, sc);
  ctx.globalAlpha = 1;
  if (e.stun > 0 && e.state !== 'dying') {
    const h = e.type === 'brute' ? 140 : e.type === 'walker' ? 100 : 46;
    ctx.fillStyle = '#ffe08a';
    for (let i = 0; i < 3; i++) { const a = G.t * 6 + i * 2.1; ctx.fillRect(e.x + Math.cos(a) * 12 - 2, y - h + Math.sin(a) * 4 - 2, 4, 4); }
  }
  if (e.hp < e.maxHp && e.state !== 'dying' && e.type === 'brute') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - 30, y - 150, 60, 6);
    ctx.fillStyle = '#c9493a'; ctx.fillRect(e.x - 30, y - 150, 60 * Math.max(0, e.hp / e.maxHp), 6);
  }
}

// ---------- Свет ----------
function drawLight(ctx, dk) {
  const lx = Render.lx, lc = Render.lc;
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.globalCompositeOperation = 'source-over';
  const dusk = G.phase === 'dusk' ? 1 - G.phaseT / DUSK_LEN : 0;
  lx.fillStyle = `rgba(${Math.round(lerp(8, 40, dusk))},${Math.round(lerp(10, 18, dusk))},${Math.round(lerp(26, 30, dusk))},${dk})`;
  lx.fillRect(0, 0, lc.width, lc.height);
  lx.globalCompositeOperation = 'destination-out';
  worldTransform(lx, 0.25);
  const light = (x, y, r, a) => {
    const g = lx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lx.fillStyle = g; lx.beginPath(); lx.arc(x, y, r, 0, TAU); lx.fill();
  };
  const fl = 1 + Math.sin(G.t * 11) * 0.03 + Math.sin(G.t * 4.3) * 0.04;
  light(World.fire.x, World.fire.y - 10, 330 * fl, 1);
  light(World.lantern.x, World.lantern.y, 230, 0.9);
  for (const p of G.players) if (p.state !== 'dead') light(p.x, p.y - 30, 135, 0.75);
  for (const pr of G.projs) light(pr.x, pr.y, 40, 0.3);
  lx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lc, 0, 0, Render.W, Render.H);
  // тёплое свечение костра
  worldTransform(ctx);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(World.fire.x, World.fire.y - 10, 0, World.fire.x, World.fire.y - 10, 260 * fl);
  g.addColorStop(0, `rgba(255,140,40,${0.22 * dk})`); g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(World.fire.x, World.fire.y - 10, 260 * fl, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- Поверх темноты ----------
function drawOverlay(ctx, dk) {
  // телеграфы атак — видны всегда
  for (const e of G.enemies) {
    if (e.state === 'wind') {
      const k = 1 - e.t / EDEF[e.type].wind;
      if (e.type === 'brute') {
        const cx = e.x + Math.cos(e.face) * 34, cy = e.y + Math.sin(e.face) * 22;
        ctx.fillStyle = `rgba(220,40,20,${0.15 + 0.25 * k})`; ctx.beginPath(); ctx.ellipse(cx, cy, 82 * k, 50 * k, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,80,50,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 82, 50, 0, 0, TAU); ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(255,70,40,${0.4 + 0.5 * k})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r + 16, (e.r + 16) * 0.55, 0, e.face - 0.8, e.face + 0.8); ctx.stroke();
      }
    } else if (e.state === 'crouch') {
      ctx.strokeStyle = 'rgba(255,90,50,0.6)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.leapDx * 170, e.y + e.leapDy * 170); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  // светящиеся глаза в темноте
  if (dk > 0.3) {
    ctx.globalCompositeOperation = 'lighter';
    for (const e of G.enemies) {
      if (e.state === 'dying') continue;
      const ey = EYE[e.type], flip = Math.cos(e.face) < 0 ? -1 : 1;
      let y = e.y; if (e.state === 'cling' && e.host) y = e.host.y - 34;
      if (e.state === 'leap') y -= Math.sin((1 - e.t / 0.42) * Math.PI) * 30;
      const x = e.x + ey[0] * flip, yy = y + ey[1];
      ctx.fillStyle = `rgba(255,${e.type === 'clinger' ? 60 : 220},120,${dk * 0.9})`;
      ctx.fillRect(x - 2, yy - 1.5, 3, 3); ctx.fillRect(x - 6 * flip - 1.5, yy - 1, 2.5, 2.5);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // маркеры и подсказки игроков
  ctx.textAlign = 'center';
  for (const p of G.players) {
    if (p.state === 'dead') continue;
    const col = PAL[p.i].accent;
    const top = p.held ? p.y - 118 : p.y - 92;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p.x - 6, top - 8); ctx.lineTo(p.x + 6, top - 8); ctx.lineTo(p.x, top); ctx.fill();
    ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke();
    if (p.state === 'downed') {
      const k = p.bleed / 25;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y - 40, 18, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#d6493a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - 40, 18, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      ctx.fillStyle = '#ffd0c0'; ctx.font = `bold 18px ${FONT}`; ctx.fillText('!', p.x, p.y - 34);
      const o = G.players[1 - p.i];
      if (o.reviveTgt === p) {
        ctx.strokeStyle = '#9fe39a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - 40, 25, -Math.PI / 2, -Math.PI / 2 + TAU * o.revive / 2.2); ctx.stroke();
      }
    }
    if (p.hint) {
      ctx.font = `bold 13px ${FONT}`;
      const w = ctx.measureText(p.hint).width + 12;
      ctx.fillStyle = 'rgba(10,8,6,0.7)'; ctx.fillRect(p.x - w / 2, top - 32, w, 19);
      ctx.fillStyle = '#f0e4c4'; ctx.fillText(p.hint, p.x, top - 18);
    }
    // предпросмотр баррикады
    if (!p.held && p.state === 'normal' && !p.hint && Input.ctrls[p.i].down.build) {
      const b = barricadeSpec(p);
      ctx.strokeStyle = canPlace(b.x, b.y, b.w, b.h, null, false) ? 'rgba(160,255,140,0.7)' : 'rgba(255,90,70,0.7)';
      ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }
  for (const t of G.texts) {
    ctx.globalAlpha = Math.min(1, t.t * 2);
    ctx.font = `bold ${t.size}px ${FONT}`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.col; ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- Интерфейс ----------
function bar(ctx, x, y, w, h, k, col, bg = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
  ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(22,18,14,0.82)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#5a4a36'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawHUD(ctx) {
  const u = Render.H / 720;
  ctx.save(); ctx.scale(u, u);
  const W = Render.W / u;
  ctx.textBaseline = 'alphabetic';
  for (const p of G.players) drawPlayerPanel(ctx, p, p.i === 0 ? 14 : W - 14 - 290, 14);

  // часы
  const cw = 300, cx = W / 2 - cw / 2;
  panel(ctx, cx, 10, cw, 52);
  ctx.textAlign = 'center'; ctx.font = `bold 17px ${FONT}`;
  let label, k, col;
  if (G.phase === 'day') { label = `День ${G.day}`; k = G.phaseT / DAY_LEN; col = '#e6c76a'; }
  else if (G.phase === 'dusk') { label = `Сумерки — ночь через ${Math.ceil(DUSK_LEN - G.phaseT)} с`; k = G.phaseT / DUSK_LEN; col = '#e08a4a'; }
  else { label = `Ночь ${G.day} — до рассвета ${Math.ceil(NIGHT_LEN - G.phaseT)} с`; k = G.phaseT / NIGHT_LEN; col = '#7a8ad6'; }
  ctx.fillStyle = '#f2e6c8'; ctx.fillText(label, W / 2, 32);
  bar(ctx, cx + 14, 41, cw - 28, 9, k, col);

  // ресурсы
  const rw = 250, rx = W / 2 - rw / 2, ry = 720 - 44;
  panel(ctx, rx, ry, rw, 34);
  ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'left';
  drawPickup(ctx, { kind: 'wood', x: rx + 26, y: ry + 26, z: 0, t: 0 });
  ctx.fillStyle = '#e6cfa0'; ctx.fillText(`Дерево: ${G.team.wood}`, rx + 42, ry + 23);
  drawPickup(ctx, { kind: 'scrap', x: rx + 146, y: ry + 26, z: 0, t: 0 });
  ctx.fillStyle = '#c8d2d8'; ctx.fillText(`Хлам: ${G.team.scrap}`, rx + 160, ry + 23);

  // сообщения
  ctx.textAlign = 'center';
  let my = 94;
  for (const m of G.msgs) {
    ctx.globalAlpha = Math.min(1, m.t);
    ctx.font = `bold 18px ${FONT}`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(m.text, W / 2, my);
    ctx.fillStyle = m.col; ctx.fillText(m.text, W / 2, my);
    my += 26;
  }
  ctx.globalAlpha = 1;

  if (G.showFps) {
    ctx.textAlign = 'left'; ctx.font = `12px ${FONT}`; ctx.fillStyle = 'rgba(240,230,200,0.7)';
    ctx.fillText(`FPS ${Render.fps.toFixed(0)} · монстров ${G.enemies.length} · ${Render.W}x${Render.H} · F2 качество · F3 скрыть`, 14, 712);
  }
  ctx.restore();
}

function drawPlayerPanel(ctx, p, x, y) {
  const pal = PAL[p.i];
  panel(ctx, x, y, 290, 88);
  ctx.textAlign = 'left'; ctx.font = `bold 15px ${FONT}`; ctx.fillStyle = pal.accent;
  const dev = Input.ctrls[p.i].pad ? 'геймпад' : 'клавиатура';
  ctx.fillText(`${pal.name}`, x + 12, y + 21);
  ctx.font = `12px ${FONT}`; ctx.fillStyle = '#a89c80'; ctx.fillText(`ур. ${p.lvl} · ${dev}`, x + 86, y + 21);
  if (p.state === 'dead') {
    ctx.font = `bold 15px ${FONT}`; ctx.fillStyle = '#ff8a7a'; ctx.fillText('Погиб — вернётся на рассвете', x + 12, y + 52);
    return;
  }
  bar(ctx, x + 12, y + 30, 266, 13, p.hp / p.maxHp, p.state === 'downed' ? '#7a2a22' : '#c9493a');
  ctx.font = `bold 11px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(p.state === 'downed' ? `БЕЗ СОЗНАНИЯ ${Math.ceil(p.bleed)} с` : `${Math.ceil(p.hp)} / ${p.maxHp}`, x + 18, y + 41);
  bar(ctx, x + 12, y + 47, 266, 7, p.st / 100, '#d6c26a');
  bar(ctx, x + 12, y + 58, 266, 5, p.xp / xpNeed(p.lvl), '#8a7ad6');
  ctx.font = `12px ${FONT}`; ctx.fillStyle = '#cfc3a2';
  const sk = `Сила ${p.sk.str} · Акроб. ${p.sk.agi} · Инж. ${p.sk.eng}`;
  ctx.fillText(sk, x + 12, y + 79);
  if (p.pts > 0) { ctx.fillStyle = pal.accent; ctx.textAlign = 'right'; ctx.fillText(`★ ${p.pts} [${Input.btn(p.i, 'menu')}]`, x + 280, y + 79); ctx.textAlign = 'left'; }
  if (p.clingers.length) { ctx.fillStyle = '#ff9a8a'; ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(`ПАРАЗИТ ×${p.clingers.length}`, x + 280, y + 21); ctx.textAlign = 'left'; }

  if (p.menu) {
    const my = y + 96;
    panel(ctx, x, my, 290, 200);
    ctx.font = `bold 14px ${FONT}`; ctx.fillStyle = pal.accent;
    ctx.fillText(`Навыки — очков: ${p.pts}`, x + 12, my + 22);
    SKILLS.forEach((s, i) => {
      const yy = my + 34 + i * 52, lv = p.sk[s.id], sel = p.menuSel === i;
      if (sel) { ctx.fillStyle = 'rgba(255,230,170,0.12)'; ctx.fillRect(x + 6, yy - 2, 278, 50); ctx.strokeStyle = pal.accent; ctx.strokeRect(x + 6, yy - 2, 278, 50); }
      ctx.fillStyle = '#f2e6c8'; ctx.font = `bold 14px ${FONT}`; ctx.fillText(s.name, x + 14, yy + 16);
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k < lv ? pal.accent : 'rgba(255,255,255,0.15)'; ctx.fillRect(x + 160 + k * 22, yy + 6, 18, 9); }
      ctx.font = `12px ${FONT}`; ctx.fillStyle = '#b8ac90';
      ctx.fillText(lv < 5 ? `${lv + 1}: ${s.lv[lv]} (${skillCost(lv)} оч.)` : 'Максимум', x + 14, yy + 36);
    });
    ctx.font = `11px ${FONT}`; ctx.fillStyle = '#8f846c';
    ctx.fillText(`${Input.btn(p.i, 'attack')} — купить · ${Input.btn(p.i, 'roll')}/${Input.btn(p.i, 'menu')} — закрыть`, x + 12, my + 192);
  }
}

// ---------- Экраны ----------
function drawScreen(title, lines, sub) {
  const ctx = Render.ctx, u = Render.H / 720, W = Render.W / u;
  ctx.setTransform(u, 0, 0, u, 0, 0);
  ctx.fillStyle = 'rgba(8,7,6,0.72)'; ctx.fillRect(0, 0, W, 720);
  ctx.textAlign = 'center';
  ctx.font = `bold 64px Georgia, "Times New Roman", serif`;
  ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(title, W / 2, 140);
  ctx.fillStyle = '#e8d8b0'; ctx.fillText(title, W / 2, 140);
  ctx.font = `18px ${FONT}`; ctx.fillStyle = '#b8ac90'; ctx.fillText(sub, W / 2, 176);
  let y = 230;
  for (const l of lines) {
    if (l === '') { y += 12; continue; }
    const head = l.startsWith('#');
    ctx.font = head ? `bold 18px ${FONT}` : `15px ${FONT}`;
    ctx.fillStyle = head ? '#e8a03c' : '#e6dcc4';
    ctx.fillText(head ? l.slice(1) : l, W / 2, y);
    y += head ? 28 : 22;
  }
}
