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
    ctx.save(); ctx.translate(x, y); ctx.scale(-sc, sc); ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); ctx.restore();
  } else ctx.drawImage(s.c, x - s.ax * sc, y - s.ay * sc, s.w * sc, s.h * sc);
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
  for (const t of World.trees) if (inView(t.x, t.y)) { ctx.beginPath(); ctx.ellipse(t.x + 10, t.y + 2, 46 * t.s, 17 * t.s, 0, 0, TAU); ctx.fill(); }
  for (const b of World.bushes) if (inView(b.x, b.y)) { ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + 1, 26, 7, 0, 0, TAU); ctx.fill(); }
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
  if (G.state === 'play') drawHUD(ctx);
}

// ---------- Объекты ----------
function occludes(x0, x1, yTop, yBase) {
  for (const p of G.players) {
    if (p.state === 'dead') continue;
    if (p.y < yBase && p.y > yTop && p.x > x0 && p.x < x1) return true;
  }
  return false;
}

// спрайт по якорю в точке (x,y) — футпринт-якорь берётся из viewBox
function put(ctx, s, x, y) { ctx.drawImage(s.c, x - s.ax, y - s.ay, s.w, s.h); }

function drawTree(ctx, t) {
  const s = Art.trees[t.v], sh = t.shake > 0 ? Math.sin(t.shake * 60) * 3 : 0;
  const occ = occludes(t.x - 56 * t.s, t.x + 56 * t.s, t.y - s.ay * t.s + 10, t.y - 4);
  if (occ) ctx.globalAlpha = 0.38;
  ctx.drawImage(s.c, t.x - s.ax * t.s + sh, t.y - s.ay * t.s, s.w * t.s, s.h * t.s);
  ctx.globalAlpha = 1;
}

function drawWall(ctx, w) {
  const S = Art.s;
  if (w.bench) { put(ctx, S.bench, w.x, w.y); return; }
  const horiz = w.w > w.h;
  const occ = occludes(w.x - 14, w.x + w.w + 14, w.y - WALL_H - 60, w.y + (horiz ? w.h : 6));
  if (occ) ctx.globalAlpha = 0.45;
  const front = w.ruin ? S.ruin_front : S.wall_front;
  const top = horiz ? (w.ruin ? S.ruin_top : S.wall_top) : (w.ruin ? S.ruin_topv : S.wall_topv);
  tile(ctx, front, w.x, w.y + w.h - WALL_H, w.w, WALL_H);
  tile(ctx, top, w.x, w.y - WALL_H, w.w, w.h);
  ctx.strokeStyle = OL; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  ctx.strokeRect(w.x, w.y - WALL_H, w.w, w.h + WALL_H);
  ctx.beginPath(); ctx.moveTo(w.x, w.y + w.h - WALL_H); ctx.lineTo(w.x + w.w, w.y + w.h - WALL_H); ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawCar(ctx, c) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(c.x + c.w / 2, c.y + c.h, c.w / 2 + 8, 10, 0, 0, TAU); ctx.fill();
  put(ctx, Art.s['car' + (c.v || 0)], c.x, c.y + 26);
}

function structSprite(s) {
  const S = Art.s, k = s.hp / s.maxHp;
  const dmg = k > 0.66 ? 0 : k > 0.33 ? 1 : 2;
  switch (s.kind) {
    case 'door':
      if (s.broken) return s.horiz ? S.door_h_broken : S.door_v_broken;
      if (s.open) return s.horiz ? S.door_h_open : S.door_v_open;
      return S[(s.horiz ? 'door_h' : 'door_v') + dmg];
    case 'window':
      if (!s.horiz) return s.broken ? S.win_v_broken : S.win_v;
      return s.broken ? S.win_h_broken : S['win_h' + Math.max(1, Math.ceil(k * 3))];
    case 'barricade': return S['barr_h' + dmg];
    case 'furn': return S[s.sub];
    case 'loot': return S.loot;
  }
  return null;
}

function drawStruct(ctx, s) {
  if (s.ghost) ctx.globalAlpha = 0.6;
  const k = s.hp / s.maxHp;
  if ((s.kind === 'door' || s.kind === 'window') && !s.broken && !s.open && s.horiz && occludes(s.x - 10, s.x + s.w + 10, s.y - WALL_H - 60, s.y + s.h)) ctx.globalAlpha = 0.5;
  if (s.kind === 'barricade' && s.vert) {
    const n = Math.max(1, Math.ceil(k * 4)), st = Art.s.stake;
    for (let i = 0; i < 4; i++) {
      if (i >= n && i !== 0) continue;
      const sp = s.flash > 0 ? flashOf(st) : st;
      put(ctx, sp, s.x + 8, s.y + 10 + i * 15);
    }
  } else {
    const sp = structSprite(s);
    if (sp) put(ctx, s.flash > 0 ? flashOf(sp) : sp, s.x, s.y);
  }
  ctx.globalAlpha = 1;
  if (k < 1 && s.kind !== 'loot' && !s.broken && s.kind !== 'trap') {
    const by = s.y - (s.kind === 'door' || s.kind === 'window' ? WALL_H + 10 : 44);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(s.x + s.w / 2 - 19, by - 1, 38, 7);
    ctx.fillStyle = k > 0.5 ? '#c9b46a' : k > 0.25 ? '#d6873a' : '#d6493a'; ctx.fillRect(s.x + s.w / 2 - 18, by, 36 * k, 5);
  }
}

function drawTrap(ctx, s) { put(ctx, s.flash > 0 ? flashOf(Art.s.trap) : Art.s.trap, s.x, s.y); }

function drawFire(ctx, f) {
  put(ctx, Art.s.fire_logs, f.x, f.y);
  const fr = Art.s['flame' + (Math.floor(G.t * 9) % 4)];
  const sc = 1 + Math.sin(G.t * 13) * 0.04;
  ctx.drawImage(fr.c, f.x - fr.ax * sc, f.y - 2 - fr.ay * sc, fr.w * sc, fr.h * sc);
  if (Math.random() < 0.2) part(f.x + rand(-12, 12), f.y - 20, 20, rand(-12, 12), rand(-5, 5), rand(90, 170), 1.3, Math.random() < 0.5 ? '#ffb040' : '#ff7a2a', 2, -40);
}

function drawItem(ctx, kind, x, y, z) { put(ctx, Art.s[kind], x, y - z); }

function drawPickup(ctx, k) {
  const b = Math.sin(k.t * 4) * 2 + 4, y = k.y - k.z - b;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(k.x, k.y, 9, 3, 0, 0, TAU); ctx.fill();
  put(ctx, Art.s[k.kind], k.x, y);
}

function drawProj(ctx, pr) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 9, 3, 0, 0, TAU); ctx.fill();
  const s = pr.kind === 'furn' ? Art.s[pr.ref.sub] : Art.s[pr.kind];
  ctx.save(); ctx.translate(pr.x, pr.y - pr.z - (pr.kind === 'furn' ? 20 : 6)); ctx.rotate(G.t * (pr.kind === 'furn' ? 7 : 14));
  const sc = pr.kind === 'furn' ? 0.8 : 1;
  ctx.drawImage(s.c, -s.w / 2 * sc, -s.h / 2 * sc, s.w * sc, s.h * sc); ctx.restore();
}

function drawWeapon(ctx, p, bob) {
  const fl = Math.cos(p.face) < 0 ? -1 : 1;
  let a;
  if (p.state === 'attack') {
    const k = clamp(p.t / p.hitAt, 0, 1), dir = p.combo === 1 ? -1 : 1;
    const sweep = p.combo === 2 ? 2.6 : 2.0;
    a = p.face - dir * sweep / 2 + dir * sweep * (p.t < p.hitAt ? k * 0.15 : Math.min(1, 0.15 + (p.t - p.hitAt) / 0.06));
    if (p.t >= p.hitAt && p.t < p.hitAt + 0.1) {
      ctx.strokeStyle = 'rgba(255,240,210,0.55)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 34, 56, 36, 0, p.face - sweep / 2, p.face + sweep / 2); ctx.stroke();
    }
  } else a = p.face + fl * 0.95;
  const ang = Math.atan2(Math.sin(a) * 0.62, Math.cos(a));
  const sx = p.x + fl * 4, sy = p.y - 45 + bob;
  const A = Art.players[p.i], bat = Art.s.bat;
  const gx = sx + Math.cos(ang) * 18, gy = sy + Math.sin(ang) * 18;
  ctx.save(); ctx.translate(gx, gy); ctx.rotate(ang); if (Math.cos(ang) < 0) ctx.scale(1, -1);
  ctx.drawImage(bat.c, -bat.ax, -bat.ay, bat.w, bat.h); ctx.restore();
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang - Math.PI / 2);
  ctx.drawImage(A.arm.c, -A.arm.ax, -A.arm.ay, A.arm.w, A.arm.h); ctx.restore();
}

function drawPlayer(ctx, p) {
  const A = Art.players[p.i];
  if (p.state === 'dead') {
    ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 28); ctx.moveTo(p.x - 10, p.y - 19); ctx.lineTo(p.x + 10, p.y - 19); ctx.stroke();
    ctx.strokeStyle = '#6a5038'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = PAL[p.i].accent; ctx.fillRect(p.x - 4, p.y - 22, 8, 5);
    return;
  }
  const flip = Math.cos(p.face) < 0;
  if (p.state === 'downed') {
    ctx.save(); ctx.translate(p.x, p.y - 8); ctx.rotate(flip ? 1.45 : -1.45); ctx.scale(flip ? -1 : 1, 1);
    ctx.drawImage(A.idle.c, -A.idle.ax, -A.idle.ay + 36, A.idle.w, A.idle.h); ctx.restore();
    return;
  }
  const fr = p.moving ? Math.floor(p.anim) % 4 : -1;
  const bob = fr < 0 ? Math.sin(G.t * 2.4 + p.i) * 0.6 : -Math.abs(Math.cos(fr / 4 * TAU)) * 2.2;
  const hurt = p.hurtT > 0.12;
  const s = fr < 0 ? (hurt ? A.idleFlash : A.idle) : (hurt ? A.flash[fr] : A.walk[fr]);
  const back = Math.sin(p.face) < -0.3;
  const blink = p.inv > 0 && p.state !== 'roll' && Math.floor(G.t * 20) % 2;
  if (blink) ctx.globalAlpha = 0.55;
  if (back && !p.held && p.state !== 'roll') drawWeapon(ctx, p, bob);
  if (p.state === 'roll') {
    const k = 1 - p.t / 0.3;
    ctx.save(); ctx.translate(p.x, p.y - 26); ctx.rotate((flip ? -1 : 1) * k * TAU); ctx.scale(flip ? -0.85 : 0.85, 0.85);
    ctx.drawImage(s.c, -s.ax, -s.ay + 30, s.w, s.h); ctx.restore();
  } else spr(ctx, s, p.x, p.y + (fr < 0 ? bob * 0.3 : 0), flip);
  if (!back && !p.held && p.state !== 'roll') drawWeapon(ctx, p, bob);
  ctx.globalAlpha = 1;
  if (p.held) {
    if (p.held.kind === 'item') drawItem(ctx, p.held.ref.kind, p.x, p.y - 88, 0);
    else {
      const f = p.held.ref, fs = Art.s[f.sub], sc = 0.75;
      ctx.drawImage(fs.c, p.x - (fs.ax + f.w / 2) * sc, p.y - 84 - (fs.ay + f.h) * sc, fs.w * sc, fs.h * sc);
    }
    const arm = A.arm;
    for (const dx of [-7, 8]) { ctx.save(); ctx.translate(p.x + dx, p.y - 45); ctx.rotate(Math.PI + (dx < 0 ? 0.15 : -0.15)); ctx.drawImage(arm.c, -arm.ax, -arm.ay, arm.w, arm.h); ctx.restore(); }
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
  let y = e.y;
  if (e.state === 'leap') y -= Math.sin((1 - e.t / 0.42) * Math.PI) * 30;
  if (e.state === 'dying') y += (1 - e.t / 0.4) * 8;
  if (e.state === 'cling' && e.host) y = e.host.y - 40;
  spr(ctx, s, e.x, y, flip);
  if (windy && e.flash <= 0 && Math.floor(G.t * 16) % 2) spr(ctx, A.windRed, e.x, y, flip);
  ctx.globalAlpha = 1;
  if (e.stun > 0 && e.state !== 'dying') {
    const h = e.type === 'brute' ? 150 : e.type === 'walker' ? 112 : e.type === 'jumper' ? 52 : 34;
    ctx.fillStyle = '#ffe08a'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const a = G.t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * 13, y - h + Math.sin(a) * 4, 2.6, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  if (e.hp < e.maxHp && e.state !== 'dying' && e.type === 'brute') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - 31, y - 172, 62, 8);
    ctx.fillStyle = '#c9493a'; ctx.fillRect(e.x - 30, y - 171, 60 * Math.max(0, e.hp / e.maxHp), 6);
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
      const flip = Math.cos(e.face) < 0 ? -1 : 1;
      let y = e.y; if (e.state === 'cling' && e.host) y = e.host.y - 40;
      if (e.state === 'leap') y -= Math.sin((1 - e.t / 0.42) * Math.PI) * 30;
      ctx.fillStyle = e.type === 'clinger' ? `rgba(255,60,40,${dk})` : `rgba(255,225,130,${dk * 0.95})`;
      for (const [ex, ey] of EYE[e.type]) { ctx.beginPath(); ctx.arc(e.x + ex * flip, y + ey, 1.8, 0, TAU); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // маркеры и подсказки игроков
  ctx.textAlign = 'center';
  for (const p of G.players) {
    if (p.state === 'dead') continue;
    const col = PAL[p.i].accent;
    const top = p.held ? p.y - 132 : p.y - 100;
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
function bar(ctx, x, y, w, h, k, col, bg = 'rgba(0,0,0,0.6)') {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, w * clamp(k, 0, 1), Math.max(1, h * 0.3));
  ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(24,18,13,0.9)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(150,118,80,0.55)'; ctx.lineWidth = 1.2; ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = '#8a7656';
  for (const [cx, cy] of [[x + 4, y + 4], [x + w - 4, y + 4], [x + 4, y + h - 4], [x + w - 4, y + h - 4]]) {
    ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, TAU); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke();
  }
}

function icon(ctx, name, x, y, size) {
  const s = Art.s[name];
  const k = size / Math.max(s.w, s.h);
  ctx.drawImage(s.c, x - s.w * k / 2, y - s.h * k / 2, s.w * k, s.h * k);
}

function inkText(ctx, text, x, y, col, size, bold = true, align = 'left') {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`; ctx.textAlign = align;
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,7,5,0.9)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = col; ctx.fillText(text, x, y);
}

function drawHUD(ctx) {
  const u = Render.H / 720;
  ctx.save(); ctx.scale(u, u);
  const W = Render.W / u;
  ctx.textBaseline = 'alphabetic';
  for (const p of G.players) drawPlayerPanel(ctx, p, p.i === 0 ? 12 : W - 12 - 300, 12);

  // часы
  const cw = 320, cx = W / 2 - cw / 2;
  panel(ctx, cx, 8, cw, 56);
  let label, k, col, ic;
  if (G.phase === 'day') { label = `День ${G.day}`; k = G.phaseT / DAY_LEN; col = '#e6c76a'; ic = 'icon_sun'; }
  else if (G.phase === 'dusk') { label = `Сумерки · ночь через ${Math.ceil(DUSK_LEN - G.phaseT)} с`; k = G.phaseT / DUSK_LEN; col = '#e08a4a'; ic = 'icon_sun'; }
  else { label = `Ночь ${G.day} · до рассвета ${Math.ceil(NIGHT_LEN - G.phaseT)} с`; k = G.phaseT / NIGHT_LEN; col = '#7a8ad6'; ic = 'icon_moon'; }
  icon(ctx, ic, cx + 30, 36, 34);
  inkText(ctx, label, cx + 54, 32, '#f2e6c8', 17);
  bar(ctx, cx + 54, 41, cw - 70, 9, k, col);

  // ресурсы
  const rw = 270, rx = W / 2 - rw / 2, ry = 720 - 50;
  panel(ctx, rx, ry, rw, 40);
  icon(ctx, 'wood', rx + 30, ry + 20, 26);
  inkText(ctx, `Дерево: ${G.team.wood}`, rx + 48, ry + 26, '#e6cfa0', 16);
  icon(ctx, 'scrap', rx + 156, ry + 20, 24);
  inkText(ctx, `Хлам: ${G.team.scrap}`, rx + 172, ry + 26, '#c8d2d8', 16);

  // сообщения
  let my = 98;
  for (const m of G.msgs) {
    ctx.globalAlpha = Math.min(1, m.t);
    ctx.font = `bold 18px ${FONT}`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(m.text, W / 2, my);
    ctx.fillStyle = m.col; ctx.fillText(m.text, W / 2, my);
    my += 26;
  }
  ctx.globalAlpha = 1;

  if (G.showFps) {
    ctx.textAlign = 'left'; ctx.font = `12px ${FONT}`; ctx.fillStyle = 'rgba(240,230,200,0.6)';
    ctx.fillText(`FPS ${Render.fps.toFixed(0)} · монстров ${G.enemies.length} · ${Render.W}x${Render.H} · F2 качество · F3 скрыть`, 14, 712);
  }
  ctx.restore();
}

function drawPlayerPanel(ctx, p, x, y) {
  const pal = PAL[p.i];
  panel(ctx, x, y, 300, 96);
  // портрет
  const px = x + 46, py = y + 48;
  ctx.save(); ctx.beginPath(); ctx.arc(px, py, 33, 0, TAU);
  ctx.fillStyle = p.state === 'dead' ? '#2a1a16' : '#3a3024'; ctx.fill(); ctx.clip();
  const h = Art.players[p.i].head;
  if (p.state === 'dead' || p.state === 'downed') ctx.globalAlpha = 0.45;
  ctx.drawImage(h.c, px - 2 - h.ax * 1.5, py + 22 - h.ay * 1.5, h.w * 1.5, h.h * 1.5);
  ctx.restore();
  ctx.strokeStyle = OL; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, py, 33, 0, TAU); ctx.stroke();
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 31, 0, TAU); ctx.stroke();
  // уровень
  ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(px + 24, py + 24, 11, 0, TAU); ctx.fill();
  ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#1a110b'; ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(p.lvl, px + 24, py + 28);

  const bx = x + 90, bw = 198;
  inkText(ctx, pal.name, bx, y + 24, pal.accent, 15);
  ctx.font = `11px ${FONT}`; ctx.fillStyle = '#a89c80'; ctx.textAlign = 'right';
  if (!p.clingers.length) ctx.fillText(Input.ctrls[p.i].pad ? 'геймпад' : 'клавиатура', x + 288, y + 23);
  else inkText(ctx, `ПАРАЗИТ ×${p.clingers.length}`, x + 288, y + 23, '#ff9a8a', 12, true, 'right');
  if (p.state === 'dead') { inkText(ctx, 'Погиб — вернётся на рассвете', bx, y + 56, '#ff8a7a', 13); return; }
  bar(ctx, bx, y + 32, bw, 14, p.hp / p.maxHp, p.state === 'downed' ? '#7a2a22' : '#c43e30');
  inkText(ctx, p.state === 'downed' ? `БЕЗ СОЗНАНИЯ ${Math.ceil(p.bleed)} с` : `${Math.ceil(p.hp)} / ${p.maxHp}`, bx + 6, y + 44, '#fff', 11);
  bar(ctx, bx, y + 50, bw, 7, p.st / 100, '#d6c26a');
  bar(ctx, bx, y + 61, bw, 5, p.xp / xpNeed(p.lvl), '#8a7ad6');
  const sk = [['icon_str', p.sk.str], ['icon_agi', p.sk.agi], ['icon_eng', p.sk.eng]];
  sk.forEach(([n, v], i) => { icon(ctx, n, bx + 9 + i * 44, y + 80, 18); inkText(ctx, String(v), bx + 21 + i * 44, y + 85, '#e6dcc4', 13); });
  if (p.pts > 0) inkText(ctx, `★ ${p.pts}  [${Input.btn(p.i, 'menu')}]`, x + 288, y + 86, pal.accent, 13, true, 'right');

  if (p.menu) {
    const my = y + 104;
    panel(ctx, x, my, 300, 214);
    inkText(ctx, `Навыки — очков: ${p.pts}`, x + 14, my + 26, pal.accent, 15);
    SKILLS.forEach((s, i) => {
      const yy = my + 36 + i * 54, lv = p.sk[s.id], sel = p.menuSel === i;
      if (sel) { ctx.fillStyle = 'rgba(255,230,170,0.1)'; ctx.fillRect(x + 8, yy, 284, 50); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.strokeRect(x + 8, yy, 284, 50); }
      icon(ctx, ['icon_str', 'icon_agi', 'icon_eng'][i], x + 30, yy + 25, 32);
      inkText(ctx, s.name, x + 52, yy + 20, '#f2e6c8', 14);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k < lv ? pal.accent : 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 176 + k * 22, yy + 10, 18, 9);
        ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.strokeRect(x + 176 + k * 22, yy + 10, 18, 9);
      }
      ctx.font = `12px ${FONT}`; ctx.fillStyle = '#b8ac90'; ctx.textAlign = 'left';
      ctx.fillText(lv < 5 ? `${lv + 1}: ${s.lv[lv]} (${skillCost(lv)} оч.)` : 'Максимум', x + 52, yy + 39);
    });
    ctx.font = `11px ${FONT}`; ctx.fillStyle = '#8f846c'; ctx.textAlign = 'left';
    ctx.fillText(`${Input.btn(p.i, 'attack')} — купить · ${Input.btn(p.i, 'roll')}/${Input.btn(p.i, 'menu')} — закрыть`, x + 14, my + 204);
  }
}

// ---------- Экраны ----------
function drawScreen(title, lines, sub, art) {
  const ctx = Render.ctx, u = Render.H / 720, W = Render.W / u;
  ctx.setTransform(u, 0, 0, u, 0, 0);
  ctx.fillStyle = 'rgba(8,7,6,0.72)'; ctx.fillRect(0, 0, W, 720);
  if (art && Art.ready) {
    // иллюстрация: силуэты чудовищ позади, герои по краям
    const k = u;
    const put2 = (name, x, sc, flip, alpha, dark) => {
      let s = bigArt(name, sc * k);
      if (dark) s = recolorCache(s);
      ctx.save(); ctx.translate(x, 714); ctx.scale(flip ? -1 : 1, 1); ctx.globalAlpha = alpha;
      ctx.drawImage(s.c, -s.ax * sc, -s.ay * sc, s.w * sc, s.h * sc); ctx.restore();
    };
    put2('brute_wind', 70, 2.4, false, 0.55, true);
    put2('walker_walk1', W - 70, 2.9, true, 0.55, true);
    ctx.globalAlpha = 1;
    put2('p0_idle', 120, 2.5, false, 1);
    put2('p1_idle', W - 120, 2.5, true, 1);
    const g = ctx.createLinearGradient(0, 560, 0, 720); g.addColorStop(0, 'rgba(8,7,6,0)'); g.addColorStop(1, 'rgba(8,7,6,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 560, W, 160);
  }
  ctx.textAlign = 'center';
  ctx.font = `bold 68px Georgia, "Times New Roman", serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12; ctx.strokeStyle = '#000'; ctx.strokeText(title, W / 2 + 3, 144);
  ctx.lineWidth = 8; ctx.strokeStyle = OL; ctx.strokeText(title, W / 2, 140);
  const tg = ctx.createLinearGradient(0, 90, 0, 145); tg.addColorStop(0, '#f4e6c0'); tg.addColorStop(1, '#c9a86a');
  ctx.fillStyle = tg; ctx.fillText(title, W / 2, 140);
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

function recolorCache(s) { return s.sil || (s.sil = recolor(s, '#2a3431', 1)); }
