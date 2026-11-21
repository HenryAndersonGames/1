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
  let sx = G.shake ? rand(-G.shake, G.shake) * 0.5 : 0, sy = G.shake ? rand(-G.shake, G.shake) * 0.5 : 0;
  if (G.camKick) { const k = G.camKick.t / 0.12; sx -= G.camKick.x * k; sy -= G.camKick.y * k; }
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
  const vx0 = G.cam.x - v.w / 2 - 140, vx1 = G.cam.x + v.w / 2 + 140, vy0 = G.cam.y - v.h / 2 - 100, vy1 = G.cam.y + v.h / 2 + 340;
  const inView = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
  Render.view = { vx0, vx1, vy0, vy1 };

  // 1. земля
  for (let cy = Math.max(0, Math.floor((vy0 - 200) / CHUNK)); cy <= Math.min(Math.ceil(WORLD_H / CHUNK) - 1, Math.floor(vy1 / CHUNK)); cy++)
    for (let cx = Math.max(0, Math.floor(vx0 / CHUNK)); cx <= Math.min(Math.ceil(WORLD_W / CHUNK) - 1, Math.floor(vx1 / CHUNK)); cx++)
      ctx.drawImage(getChunk(cx, cy), cx * CHUNK, cy * CHUNK, CHUNK + 0.5, CHUNK + 0.5);
  // 2. пятна, паутина, ловушки, тени
  for (const s of G.stains) { if (!inView(s.x, s.y)) continue; ctx.fillStyle = s.col; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.6, s.a, 0, TAU); ctx.fill(); }
  for (const r of G.rubble || []) if (inView(r.x, r.y)) drawRubble(ctx, r);
  for (const w of G.webs) drawWeb(ctx, w);
  for (const s of World.structs) if (s.kind === 'trap' && inView(s.x, s.y)) drawTrap(ctx, s);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  for (const p of G.players) if (p.state !== 'dead') { ctx.beginPath(); ctx.ellipse(p.x, p.y, 15, 6, 0, 0, TAU); ctx.fill(); }
  for (const e of G.enemies) if (inView(e.x, e.y) && e.state !== 'cling' && !e.hidden) { const fl = EDEF[e.type].float ? 0.6 : 1; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 1.15 * fl, e.r * 0.45 * fl, 0, 0, TAU); ctx.fill(); }
  for (const t of World.trees) if (inView(t.x, t.y)) { ctx.beginPath(); ctx.ellipse(t.x + 10, t.y + 2, 46 * t.s, 17 * t.s, 0, 0, TAU); ctx.fill(); }
  for (const b of World.bushes) if (inView(b.x, b.y)) { ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + 1, 26, 7, 0, 0, TAU); ctx.fill(); }
  for (const p of G.players) if (p.state !== 'dead') {
    ctx.strokeStyle = PAL[p.i].accent; ctx.globalAlpha = 0.55; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 19, 8, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  }
  for (const f of G.fires) drawFireArea(ctx, f);
  for (const b of G.bombs) { put(ctx, Art.s.bomb, b.x, b.y); if (Math.floor(G.t * 12) % 2) { ctx.fillStyle = '#ff4020'; ctx.beginPath(); ctx.arc(b.x, b.y - 34, 3, 0, TAU); ctx.fill(); } }

  // 3. сортировка по глубине
  const dl = [];
  for (const t of World.trees) if (inView(t.x, t.y)) dl.push({ k: t.y, t: 0, o: t });
  for (const b of World.bushes) if (inView(b.x, b.y)) dl.push({ k: b.y, t: 1, o: b });
  for (const w of World.walls) if (rectsOverlap(w.x, w.y - WALL_H, w.w, w.h + WALL_H, vx0, vy0, vx1 - vx0, vy1 - vy0)) dl.push({ k: w.y + w.h, t: 2, o: w });
  for (const p of World.props) if (!p.dead && inView(p.x + p.w / 2, p.y + p.h)) dl.push({ k: p.y + p.h, t: 3, o: p });
  for (const s of World.structs) if (s.kind !== 'trap' && !s.carried && inView(s.x + s.w / 2, s.y)) dl.push({ k: s.y + s.h, t: 4, o: s });
  for (const p of G.players) dl.push({ k: p.y, t: 5, o: p });
  for (const e of G.enemies) if (inView(e.x, e.y) && !e.hidden && e.state !== 'held' && e.state !== 'thrownE') dl.push({ k: e.state === 'cling' && e.host ? e.host.y + 2 : e.y, t: 6, o: e });
  for (const it of G.items) if (!it.held && !it.fly && inView(it.x, it.y)) dl.push({ k: it.y - 4, t: 7, o: it });
  for (const k of G.pickups) if (inView(k.x, k.y)) dl.push({ k: k.y, t: 8, o: k });
  for (const pr of G.projs) dl.push({ k: pr.y, t: 9, o: pr });
  for (const a of G.allies) dl.push({ k: a.y, t: 11, o: a });
  if (inView(World.fire.x, World.fire.y)) dl.push({ k: World.fire.y, t: 10, o: World.fire });
  dl.sort((a, b) => a.k - b.k);
  for (const d of dl) {
    switch (d.t) {
      case 0: drawTree(ctx, d.o); break;
      case 1: spr(ctx, Art.bushes[d.o.v], d.o.x, d.o.y, false); break;
      case 2: drawWall(ctx, d.o); break;
      case 3: drawProp(ctx, d.o); break;
      case 4: drawStruct(ctx, d.o); break;
      case 5: drawPlayer(ctx, d.o); break;
      case 6: drawEnemy(ctx, d.o); break;
      case 7: drawGroundItem(ctx, d.o); break;
      case 8: drawPickup(ctx, d.o); break;
      case 9: drawProj(ctx, d.o); break;
      case 10: drawFire(ctx, d.o); break;
      case 11: drawAlly(ctx, d.o); break;
    }
  }
  for (const q of G.parts) {
    ctx.globalAlpha = Math.min(1, q.life / q.max * 2);
    ctx.fillStyle = q.col; ctx.fillRect(q.x - q.size / 2, q.y - q.z - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  // 4. освещение
  const dk = darkness();
  if (dk > 0.01) drawLight(ctx, dk);
  // 5. поверх темноты
  worldTransform(ctx);
  drawOverlay(ctx, dk);
  // 6. интерфейс
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.slowT > 0) { ctx.fillStyle = `rgba(150,200,255,${Math.min(0.18, G.slowT * 0.4)})`; ctx.fillRect(0, 0, Render.W, Render.H); }
  if (G.state === 'play') drawHUD(ctx);
}

// ---------- Объекты ----------
function occludes(x0, x1, yTop, yBase) {
  for (const p of G.players) { if (p.state === 'dead') continue; if (p.y < yBase && p.y > yTop && p.x > x0 && p.x < x1) return true; }
  return false;
}
function put(ctx, s, x, y) { ctx.drawImage(s.c, x - s.ax, y - s.ay, s.w, s.h); }

function drawTree(ctx, t) {
  const s = Art.trees[t.v], sh = t.shake > 0 ? Math.sin(t.shake * 60) * 3 : 0;
  if (occludes(t.x - 56 * t.s, t.x + 56 * t.s, t.y - s.ay * t.s + 10, t.y - 4)) ctx.globalAlpha = 0.38;
  ctx.drawImage(s.c, t.x - s.ax * t.s + sh, t.y - s.ay * t.s, s.w * t.s, s.h * t.s);
  ctx.globalAlpha = 1;
}
const WALLSTYLE = { wood: 'wall', ruin: 'ruin', brick: 'brick', metal: 'metal', concrete: 'concrete', barn: 'barn', fencewood: 'fencewood', fencechain: 'fencechain', fencebarb: 'fencebarb' };
function drawWall(ctx, w) {
  const S = Art.s, st = WALLSTYLE[w.style] || 'wall', horiz = w.w > w.h;
  const front = S[st + '_front'], top = S[st + (horiz ? '_top' : '_topv')];
  const H = st.startsWith('fence') ? 30 : WALL_H;
  if (occludes(w.x - 14, w.x + w.w + 14, w.y - H - 60, w.y + (horiz ? w.h : 6))) ctx.globalAlpha = st.startsWith('fence') ? 0.7 : 0.45;
  if (st === 'fencebarb') ctx.drawImage(front.c, 0, 0, front.c.width, front.c.height, w.x, w.y + w.h - H - 6, Math.min(w.w, 64), front.h);
  tile(ctx, front, w.x, w.y + w.h - H - (st === 'fencebarb' ? 6 : 0), w.w, front.h);
  tile(ctx, top, w.x, w.y - H, w.w, w.h);
  ctx.strokeStyle = OL; ctx.lineWidth = st.startsWith('fence') ? 1.6 : 2.4; ctx.lineJoin = 'round';
  if (!st.startsWith('fence')) { ctx.strokeRect(w.x, w.y - H, w.w, w.h + H); ctx.beginPath(); ctx.moveTo(w.x, w.y + w.h - H); ctx.lineTo(w.x + w.w, w.y + w.h - H); ctx.stroke(); }
  if (w.dmg) drawWallCracks(ctx, w, H, horiz);
  if (w.flash > 0) { w.flash -= 1 / 60; ctx.fillStyle = 'rgba(255,250,230,0.35)'; ctx.fillRect(w.x, w.y - H, w.w, w.h + H); }
  ctx.globalAlpha = 1;
}
// трещины на повреждённых участках стены (по 32 px)
function drawWallCracks(ctx, w, H, horiz) {
  const max = WALL_HP[w.style] || 200;
  ctx.save(); ctx.strokeStyle = 'rgba(30,22,18,0.85)'; ctx.lineCap = 'round';
  for (const ci in w.dmg) {
    const k = Math.min(1, w.dmg[ci] / max);
    if (k < 0.12) continue;
    const x0 = horiz ? w.x + ci * 32 : w.x, y0 = horiz ? w.y - H : w.y - H + ci * 32;
    const cw = horiz ? Math.min(32, w.w - ci * 32) : w.w, chh = horiz ? w.h + H : Math.min(32, w.h - ci * 32) + H;
    let sd = (+ci + 1) * 9301 + Math.floor(w.x + w.y);
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const n = 1 + Math.floor(k * 4);
    ctx.lineWidth = 1.2 + k * 1.6;
    for (let j = 0; j < n; j++) {
      let x = x0 + cw * (0.2 + rnd() * 0.6), y = y0 + chh * (0.15 + rnd() * 0.3);
      ctx.beginPath(); ctx.moveTo(x, y);
      const segs = 2 + Math.floor(k * 3);
      for (let q = 0; q < segs; q++) { x += (rnd() - 0.5) * 14; y += chh * 0.18 * (0.5 + rnd()); ctx.lineTo(clamp(x, x0, x0 + cw), Math.min(y, y0 + chh)); }
      ctx.stroke();
    }
    if (k > 0.6) { ctx.fillStyle = 'rgba(20,16,12,0.45)'; ctx.beginPath(); ctx.ellipse(x0 + cw / 2, y0 + chh * 0.5, cw * 0.22 * k, chh * 0.12 * k, 0, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
function drawRubble(ctx, r) {
  let sd = Math.floor(r.seed) + 7;
  const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const col = { wood: '#7a5c3a', barn: '#7a3e2c', brick: '#8a4a38', ruin: '#7a6e60', concrete: '#8a867c', metal: '#6d7474', fencewood: '#7a5c3a', fencechain: '#6d7474', fencebarb: '#5a4a38' }[r.style] || '#7a6e60';
  for (let i = 0; i < 9; i++) {
    const along = (rnd() - 0.5) * r.len, across = (rnd() - 0.5) * 30;
    const x = r.x + (r.horiz ? along : across), y = r.y + (r.horiz ? across : along), s = 4 + rnd() * 7;
    ctx.fillStyle = col; ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x - s * 0.3, y - s * 0.7); ctx.lineTo(x + s, y - s * 0.3); ctx.lineTo(x + s * 0.6, y + s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
function drawProp(ctx, p) {
  let s = Art.s[p.spr];
  if (p.spr === 'lamp' && p.on) s = Art.s.lamp_on;
  if (p.spr === 'flood' && World.gen.on) s = Art.s.flood_on;
  if (p.spr === 'generator' && World.gen.on) s = Art.s.generator_on;
  if (p.flash > 0) { p.flash -= 1 / 60; s = flashOf(s); }
  if (p.car) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h, p.w / 2 + 8, 10, 0, 0, TAU); ctx.fill(); put(ctx, s, p.x, p.y + 26); return; }
  if (p.hide) { // кукуруза: становится прозрачной, если внутри кто-то есть
    let a = 1;
    for (const q of G.players) if (q.state !== 'dead' && Math.abs(q.x - p.ox) < 26 && q.y < p.oy + 4 && q.y > p.oy - 70) a = 0.45;
    ctx.globalAlpha = a; put(ctx, s, p.ox, p.oy); ctx.globalAlpha = 1; return;
  }
  if (p.tall && occludes(p.x - 10, p.x + p.w + 10, p.y - p.tall - 40, p.y + p.h)) ctx.globalAlpha = 0.5;
  if (p.searched) ctx.filter = 'brightness(0.7)';
  const shk = p.maxHp && !p.explosive && p.flash > 0 ? Math.sin(G.t * 90) * (1 + (1 - p.hp / p.maxHp) * 3) : 0;
  put(ctx, s, (p.cx ? p.ox : p.x) + shk, p.cx ? p.oy : p.y);
  ctx.filter = 'none'; ctx.globalAlpha = 1;
  if (p.fuse) { ctx.fillStyle = Math.floor(G.t * 20) % 2 ? '#ffd040' : '#ff4020'; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y - 30, 4, 0, TAU); ctx.fill(); }
}
function structSprite(s) {
  const S = Art.s, k = s.hp / s.maxHp, dmg = k > 0.66 ? 0 : k > 0.33 ? 1 : 2;
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
    for (let i = 0; i < 4; i++) { if (i >= n && i !== 0) continue; put(ctx, s.flash > 0 ? flashOf(st) : st, s.x + 8, s.y + 10 + i * 15); }
  } else {
    const sp = structSprite(s);
    if (sp) put(ctx, s.flash > 0 ? flashOf(sp) : sp, s.x, s.y);
  }
  if (s.reinforced) { // прибитые доски
    ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(s.x - 2, s.y - 6); ctx.lineTo(s.x + s.w + 2, s.y + s.h - 14); ctx.stroke();
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#c8c4b8'; ctx.fillRect(s.x + 2, s.y - 6, 2, 2); ctx.fillRect(s.x + s.w - 4, s.y + s.h - 16, 2, 2);
  }
  if (s.locked && !s.broken) { ctx.fillStyle = '#c9a040'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.fillRect(s.x + s.w / 2 - 4, s.y - 20, 8, 7); ctx.strokeRect(s.x + s.w / 2 - 4, s.y - 20, 8, 7); ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y - 20, 3, Math.PI, 0); ctx.stroke(); }
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
  const fr = Art.s['flame' + (Math.floor(G.t * 9) % 4)], sc = 1 + Math.sin(G.t * 13) * 0.04;
  ctx.drawImage(fr.c, f.x - fr.ax * sc, f.y - 2 - fr.ay * sc, fr.w * sc, fr.h * sc);
  if (Math.random() < 0.2) part(f.x + rand(-12, 12), f.y - 20, 20, rand(-12, 12), rand(-5, 5), rand(90, 170), 1.3, Math.random() < 0.5 ? '#ffb040' : '#ff7a2a', 2, -40);
}
function drawFireArea(ctx, f) {
  const k = Math.min(1, f.t / 1.5);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + f.x, fr = Art.s['flame' + ((Math.floor(G.t * 9) + i) % 4)], sc = 0.5 * k;
    const x = f.x + Math.cos(a) * f.r * 0.45, y = f.y + Math.sin(a) * f.r * 0.25;
    ctx.drawImage(fr.c, x - fr.ax * sc, y - fr.ay * sc, fr.w * sc, fr.h * sc);
  }
}
function drawWeb(ctx, w) {
  ctx.globalAlpha = Math.min(1, w.t / 1.5) * 0.75;
  ctx.strokeStyle = '#e8e4d8'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + Math.cos(a) * w.r, w.y + Math.sin(a) * w.r * 0.55); }
  for (const r of [0.35, 0.65, 0.95]) { ctx.moveTo(w.x + w.r * r, w.y); ctx.ellipse(w.x, w.y, w.r * r, w.r * r * 0.55, 0, 0, TAU); }
  ctx.stroke(); ctx.globalAlpha = 1;
}
function drawGroundItem(ctx, it) {
  if (it.cat === 'w') {
    const s = Art.s['w_' + it.type];
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(it.x, it.y, 18, 4, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(it.x - 14, it.y - 4); ctx.rotate(-0.25); ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); ctx.restore();
    if (Math.floor(G.t * 2 + it.x) % 4 === 0) { ctx.fillStyle = 'rgba(255,240,200,0.5)'; ctx.fillRect(it.x + 6, it.y - 12, 2, 2); }
  } else put(ctx, Art.s[it.kind], it.x, it.y);
}
function drawItem(ctx, kind, x, y, z) { put(ctx, Art.s[kind], x, y - z); }
function drawPickup(ctx, k) {
  const b = Math.sin(k.t * 4) * 2 + 4, y = k.y - k.z - b;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(k.x, k.y, 9, 3, 0, 0, TAU); ctx.fill();
  put(ctx, Art.s[k.kind], k.x, y);
}
function drawProj(ctx, pr) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 9, 3, 0, 0, TAU); ctx.fill();
  const s = pr.kind === 'furn' ? Art.s[pr.ref.sub] : pr.kind === 'enemy' ? Art.enemy[pr.ref.type].walk[0] : Art.s[pr.kind];
  ctx.save(); ctx.translate(pr.x, pr.y - pr.z - (pr.kind === 'furn' ? 20 : 6)); ctx.rotate(G.t * (pr.kind === 'furn' ? 7 : 14));
  const sc = pr.kind === 'furn' ? 0.8 : 1;
  ctx.drawImage(s.c, -s.w / 2 * sc, -s.h / 2 * sc, s.w * sc, s.h * sc); ctx.restore();
}

// ----- Игрок: позы и оружие -----
function playerPose(p) {
  if (p.state === 'knock') return p.t > 0.3 ? 'down' : 'kneel';
  if (p.state === 'roll') return 'roll';
  if (p.state === 'dash') return 'atkL1';
  if (p.reviveTgt || p.search) return 'kneel';
  if (p.throwT > 0) return p.throwT > 0.15 ? 'throw0' : 'throw1';
  if (p.state === 'atk') {
    const a = p.atk, pose = a.M.pose, early = p.t < a.wind;
    if (pose === 'H' || pose === 'slam' || pose === 'leap') return early ? 'atkH0' : 'atkH1';
    return early ? 'atkL0' : 'atkL1';
  }
  if (p.state === 'light') return p.t < 0.06 ? 'atkL1' : 'idle0';
  if (p.hurtT > 0.15) return 'hurt';
  return null;
}
function weaponAngle(p) {
  const fl = Math.cos(p.face) < 0 ? -1 : 1;
  const W = wep(p);
  if (p.state === 'light' || (W.gun && p.state === 'normal')) return { a: p.face, fl };
  if (p.state === 'atk') {
    const a = p.atk, M = a.M;
    const [s0, s1] = M.sw;
    let rel;
    if (p.t < a.wind) rel = s0 - 0.25 * (p.t / a.wind);
    else rel = lerp(s0, s1, clamp((p.t - a.wind) / Math.max(0.05, a.act), 0, 1));
    return { a: p.face + rel * fl, fl, swing: p.t >= a.wind && p.t < a.wind + a.act + 0.05, M };
  }
  return { a: p.face + fl * 0.95, fl };
}
function drawWeapon(ctx, p, meta, bob) {
  const { a, fl, swing, M } = weaponAngle(p);
  const R = ART_META.rig, lean = (meta.lean || 0) * Math.PI / 180, hy = meta.hy || 0;
  const [ox, oy] = R.shoulder;
  const lx = ox * Math.cos(lean) - oy * Math.sin(lean), ly = ox * Math.sin(lean) + oy * Math.cos(lean);
  const sx = p.x + fl * lx, sy = p.y + R.hipY + hy + bob + ly;
  const ang = Math.atan2(Math.sin(a) * 0.62, Math.cos(a));
  const A = Art.players[p.i];
  if (swing && M) {
    const r = M.pose === 'spin' ? 58 : 50;
    ctx.strokeStyle = M.base === 'H' ? 'rgba(255,220,160,0.6)' : 'rgba(255,240,210,0.45)'; ctx.lineWidth = M.base === 'H' ? 9 : 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 56, r, r * 0.64, 0, ang - 0.7, ang + 0.15); ctx.stroke();
  }
  if (p.weapon.type !== 'fists') {
    const w = Art.s['w_' + p.weapon.type];
    const reach = ART_META.rig.armLen + (p.state === 'atk' && M && M.pose === 'thrust' && p.t >= p.atk.wind ? 6 : 0);
    const gx = sx + Math.cos(ang) * reach, gy = sy + Math.sin(ang) * reach;
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(ang); if (Math.cos(ang) < 0) ctx.scale(1, -1);
    ctx.drawImage(w.c, -w.ax, -w.ay, w.w, w.h); ctx.restore();
  }
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang - Math.PI / 2);
  ctx.drawImage(A.arm.c, -A.arm.ax, -A.arm.ay, A.arm.w, A.arm.h); ctx.restore();
}
// ----- Герой-марионетка: поза → деформация частей (руки и ноги гнутся в локтях и коленях) -----
function attackU(p) {
  const a = p.atk;
  if (a.gun) { const q = p.t / a.dur; return { u: q < 0.3 ? 1 + q / 0.3 * 2 : 3 + (q - 0.3) / 0.7 * 3, ph: q < 0.3 ? 'a' : 'r', q }; }
  if (p.t < a.wind) { const q = p.t / a.wind; return { u: q, ph: 'w', q }; }
  const t2 = p.t - a.wind;
  if (t2 < a.act) { const q = t2 / a.act; return { u: 1 + q * 3, ph: 'a', q }; }
  const q = clamp((t2 - a.act) / Math.max(0.01, a.rec), 0, 1);
  return { u: 4 + q * 2, ph: 'r', q };
}
function weaponLen(p) { if (p.weapon.type === 'fists') return 6; const w = Art.s['w_' + p.weapon.type]; return w.w - w.ax; }
function drawWeaponAt(ctx, p, grip, wa) {
  if (p.weapon.type === 'fists') return;
  const w = Art.s['w_' + p.weapon.type];
  ctx.save(); ctx.translate(grip[0], grip[1]); ctx.rotate(wa); if (Math.cos(wa) < 0) ctx.scale(1, -1);
  ctx.drawImage(w.c, -w.ax, -w.ay, w.w, w.h); ctx.restore();
}
// след удара (в локальных координатах героя)
function drawSmearPuppet(ctx, p, anim, uFrom, uTo, alpha) {
  const L = weaponLen(p) + 6, n = 12, outer = [], inner = [];
  for (let k = 0; k <= n; k++) {
    const u = lerp(uFrom, uTo, k / n), P = animPose(anim, u), g = puppetGrip(p.i, P), a = P.wa * Math.PI / 180, w = Math.pow(k / n, 1.4);
    outer.push([g[0] + Math.cos(a) * L, g[1] + Math.sin(a) * L]);
    inner.push([g[0] + Math.cos(a) * L * lerp(0.92, 0.3, w), g[1] + Math.sin(a) * L * lerp(0.92, 0.3, w)]);
  }
  ctx.beginPath(); ctx.moveTo(outer[0][0], outer[0][1]);
  for (const q of outer) ctx.lineTo(q[0], q[1]);
  for (let k = inner.length - 1; k >= 0; k--) ctx.lineTo(inner[k][0], inner[k][1]);
  ctx.closePath(); ctx.fillStyle = `rgba(255,250,232,${alpha})`; ctx.fill();
  ctx.strokeStyle = `rgba(42,31,26,${alpha * 0.55})`; ctx.lineWidth = 1.4; ctx.stroke();
}
function playerPoseNow(p) {
  if (p.state === 'knock') return p.t > 0.3 ? null : PZ.kneel;
  if (p.state === 'dash') return animPose('thrust', 3);
  if (p.reviveTgt || p.search || p.pickW) return PZ.kneel;
  if (p.throwT > 0) return p.throwT > 0.15 ? PZ.throw0 : PZ.throw1;
  if (p.hurtT > 0.15 && p.state === 'normal') return PZ.hurt;
  if (p.held && p.held.kind === 'furn') return p.moving ? walkPose(p.anim / 6 * TAU, true) : walkPose(0, true);
  if (p.moving) return walkPose(p.anim / 6 * TAU, false);
  return idlePose(G.t + p.i * 1.7);
}

function drawPlayer(ctx, p) {
  if (p.state === 'dead') {
    ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 28); ctx.moveTo(p.x - 10, p.y - 19); ctx.lineTo(p.x + 10, p.y - 19); ctx.stroke();
    ctx.strokeStyle = '#6a5038'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = PAL[p.i].accent; ctx.fillRect(p.x - 4, p.y - 22, 8, 5);
    return;
  }
  const fl = Math.cos(p.face) < 0 ? -1 : 1;
  const flash = p.hurtT > 0.12;
  if (p.inv > 0 && p.state !== 'roll' && p.state !== 'dash' && Math.floor(G.t * 20) % 2) ctx.globalAlpha = 0.55;
  // лежит: без сознания или сбит с ног
  if (p.state === 'downed' || (p.state === 'knock' && p.t > 0.3)) {
    ctx.save(); ctx.translate(p.x, p.y - 4); ctx.scale(fl, 1); ctx.rotate(-1.52); ctx.translate(0, -2);
    drawPuppet(ctx, p.i, KP({ sf: -60, ef: 30, sb: 40, eb: 50, tf: 10, kf: 20, tb: -6, kb: 10, hd: -10 }), { flash });
    ctx.restore(); ctx.globalAlpha = 1; return;
  }
  // атака
  if ((p.state === 'atk' || (p.state === 'light' && p.atk && p.atk.gun)) && !p.held) {
    const a = p.atk, A = attackU(p), M = a.M || {};
    const name = a.anim, P = animPose(name, A.u);
    let sx = 1, sy = 1, y = p.y;
    if (A.ph === 'w') { sx = 1 - 0.04 * A.q; sy = 1 + 0.04 * A.q; } else if (A.ph === 'a') { sx = 1.05; sy = 0.96; } else { sx = 1 + 0.03 * (1 - A.q); sy = 1 - 0.02 * (1 - A.q); }
    if (name === 'leap') y -= Math.sin(clamp(p.t / (a.wind + a.act), 0, 1) * Math.PI) * 30;
    const spin = M.pose === 'spin' && A.ph === 'a';
    const f2 = spin ? (Math.floor(A.q * (M.hits || 1) * 4) % 2 ? -fl : fl) : fl;
    ctx.save(); ctx.translate(p.x, y); ctx.scale(f2 * sx, sy);
    if (!a.gun && p.weapon.type !== 'fists') {
      if (spin) { ctx.restore(); ctx.strokeStyle = `rgba(255,250,232,${0.75 * (1 - A.q * 0.5)})`; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(p.x, y - 50, weaponLen(p) + 28, (weaponLen(p) + 28) * 0.55, 0, 0, TAU); ctx.stroke(); ctx.save(); ctx.translate(p.x, y); ctx.scale(f2 * sx, sy); }
      else if (A.ph === 'a') drawSmearPuppet(ctx, p, name, 1.2, A.u, 0.85);
      else if (A.ph === 'r' && A.q < 0.6) drawSmearPuppet(ctx, p, name, lerp(1.6, 3.6, A.q / 0.6), 4, 0.85 * (1 - A.q / 0.6));
    }
    const res = drawPuppet(ctx, p.i, P, { flash, weapon: (g, wa) => drawWeaponAt(ctx, p, g, wa) });
    if (!a.gun && p.weapon.type === 'fists' && A.ph === 'a') { ctx.strokeStyle = 'rgba(255,250,232,0.8)'; ctx.lineWidth = 2.5; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(res.grip[0] - 14, res.grip[1] + k * 5); ctx.lineTo(res.grip[0] - 30, res.grip[1] + k * 7); ctx.stroke(); } }
    if (a.gun && A.q < 0.25) { const L = weaponLen(p) + 4, mx = res.grip[0] + Math.cos(res.wa) * L, my = res.grip[1] + Math.sin(res.wa) * L; ctx.fillStyle = '#fff2b0'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 4 : 10, an = k / 10 * TAU; ctx.lineTo(mx + Math.cos(an) * r, my + Math.sin(an) * r); } ctx.fill(); }
    ctx.restore();
    if (a.charging || a.charge > 0) { const k = Math.min(1, a.charge / 1.2); ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y - 128, 11, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); ctx.strokeStyle = k >= 1 ? '#ffd860' : '#f2e6c8'; ctx.lineWidth = 3.5; ctx.stroke(); }
    ctx.globalAlpha = 1; return;
  }
  // прыжок-уклонение
  if (p.state === 'roll') {
    const k = clamp(1 - p.t / 0.32, 0, 1), hop = k > 0.18 && k < 0.82 ? Math.sin((k - 0.18) / 0.64 * Math.PI) * 24 : 0;
    const sq = k < 0.18 ? [1.06, 0.93] : k > 0.82 ? [1.08, 0.9] : [0.95, 1.05];
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 15 * (1 - hop / 70), 6, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y - hop); ctx.scale(fl * sq[0], sq[1]);
    drawPuppet(ctx, p.i, hopPose(k), { flash, weapon: (g, wa) => drawWeaponAt(ctx, p, g, wa) });
    ctx.restore(); ctx.globalAlpha = 1; return;
  }
  // ходьба/стойка: вид спереди и сзади
  const sv = Math.sin(p.face), view = sv > 0.72 ? 'f' : sv < -0.72 ? 'b' : 's';
  if (view !== 's' && !p.held && p.state === 'normal' && !p.reviveTgt && !p.search && !(p.hurtT > 0.15)) {
    ctx.save(); ctx.translate(p.x, p.y);
    const r = drawPuppetFB(ctx, p.i, view, p.anim / 6 * TAU * 0.9, p.moving, flash);
    if (p.weapon.type !== 'fists') { const w = Art.s['w_' + p.weapon.type], side = view === 'f' ? -1 : 1, a = Math.PI / 2 + side * 0.3; ctx.save(); ctx.translate(side * r.hand[0], r.hand[1]); ctx.rotate(a); if (Math.cos(a) < 0) ctx.scale(1, -1); if (view === 'b') ctx.globalAlpha *= 0.9; ctx.drawImage(w.c, -w.ax, -w.ay, w.w, w.h); ctx.restore(); }
    ctx.restore(); ctx.globalAlpha = 1;
  } else {
    const P = playerPoseNow(p);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(fl, 1);
    drawPuppet(ctx, p.i, P, { flash, weapon: p.held ? null : (g, wa) => drawWeaponAt(ctx, p, g, wa) });
    ctx.restore(); ctx.globalAlpha = 1;
  }
  if (p.held) {
    if (p.held.kind === 'item') drawItem(ctx, p.held.ref.kind, p.x, p.y - 122, 0);
    else if (p.held.kind === 'enemy') { const e = p.held.ref, sp = Art.enemy[e.type].walk[0]; ctx.save(); ctx.translate(p.x, p.y - 112); ctx.rotate(Math.PI); ctx.scale(0.8, 0.8); ctx.drawImage(sp.c, -sp.ax, -sp.ay / 2, sp.w, sp.h); ctx.restore(); }
    else { const f = p.held.ref, fs = Art.s[f.sub], sc = 0.72; ctx.drawImage(fs.c, p.x - (fs.ax + f.w / 2) * sc, p.y - 116 - (fs.ay + f.h) * sc, fs.w * sc, fs.h * sc); }
  }
}
function drawAlly(ctx, a) {
  ctx.globalAlpha = Math.min(1, a.t) * 0.75; ctx.filter = 'brightness(0.15) sepia(1) hue-rotate(220deg)';
  ctx.save(); ctx.translate(a.x, a.y); ctx.scale(Math.cos(a.face) < 0 ? -1 : 1, 1);
  drawPuppet(ctx, a.owner.i, a.hit > 0 ? animPose('punch', 3) : a.moving ? walkPose(a.anim / 6 * TAU) : idlePose(G.t));
  ctx.restore(); ctx.filter = 'none'; ctx.globalAlpha = 1;
}
function drawEnemy(ctx, e) {
  const A = Art.enemy[e.type], d = EDEF[e.type];
  const flip = Math.cos(e.face) < 0;
  let y = e.y;
  if (d.float) y -= 6 + Math.sin(G.t * 3 + e.x) * 3;
  if (e.state === 'dying') {
    const k = e.t < 0.4 ? e.t / 0.4 : 1;
    ctx.globalAlpha = k; spr(ctx, A.die, e.x, e.y, flip); ctx.globalAlpha = 1; return;
  }
  const fr = Math.floor(e.anim) % 4;
  const windy = e.state === 'wind' || e.state === 'crouch';
  let s = windy ? A.wind : A.walk[fr];
  if (e.state === 'leap') { s = A.walk[1]; y -= Math.sin((1 - e.t / (e.type === 'wolf' ? 0.34 : 0.42)) * Math.PI) * 30; }
  if (e.state === 'cling' && e.host) y = e.host.y - 40;
  if (e.frozen > 0) s = s.fz || (s.fz = recolor(s, '#a8d8ff', 0.55));
  else if (e.flash > 0) s = flashOf(s);
  if (e.hitT > 0 && e.state !== 'cling') {
    const k = e.hitT / 0.18;
    ctx.save(); ctx.translate(e.x, y); ctx.rotate((flip ? 1 : -1) * 0.14 * k); ctx.scale((flip ? -1 : 1) * (1 + 0.1 * k), 1 - 0.1 * k); ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); ctx.restore();
  } else spr(ctx, s, e.x, y, flip);
  if (windy && e.flash <= 0 && Math.floor(G.t * 16) % 2) spr(ctx, redOf(s), e.x, y, flip);
  if (e.stun > 0 || e.frozen > 0) {
    const h = d.h + 6;
    ctx.fillStyle = e.frozen > 0 ? '#c8ecff' : '#ffe08a'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const a = G.t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * 13, y - h + Math.sin(a) * 4, 2.6, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  if (e.hp < e.maxHp && (e.type === 'brute')) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - 31, y - d.h - 22, 62, 8);
    ctx.fillStyle = '#c9493a'; ctx.fillRect(e.x - 30, y - d.h - 21, 60 * Math.max(0, e.hp / e.maxHp), 6);
  }
}

// ---------- Свет ----------
function drawLight(ctx, dk) {
  const lx = Render.lx, lc = Render.lc, V = Render.view;
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.globalCompositeOperation = 'source-over';
  const dusk = G.phase === 'dusk' ? 1 - G.phaseT / DUSK_LEN : 0;
  lx.fillStyle = `rgba(${Math.round(lerp(8, 40, dusk))},${Math.round(lerp(10, 18, dusk))},${Math.round(lerp(26, 30, dusk))},${dk})`;
  lx.fillRect(0, 0, lc.width, lc.height);
  lx.globalCompositeOperation = 'destination-out';
  worldTransform(lx, 0.25);
  const light = (x, y, r, a) => {
    if (x + r < V.vx0 || x - r > V.vx1 || y + r < V.vy0 || y - r > V.vy1) return;
    const g = lx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lx.fillStyle = g; lx.beginPath(); lx.arc(x, y, r, 0, TAU); lx.fill();
  };
  const fl = 1 + Math.sin(G.t * 11) * 0.03 + Math.sin(G.t * 4.3) * 0.04;
  light(World.fire.x, World.fire.y - 10, 330 * fl, 1);
  light(World.lantern.x, World.lantern.y, 230, 0.9);
  if (World.gen.on) for (const f of World.floods) light(f.ox, f.oy - 40, 340, 0.95);
  for (const p of World.props) if (p.spr === 'lamp' && p.on) { const fk = Math.sin(G.t * 23 + p.x) > -0.95 ? 1 : 0.3; light(p.ox + 19, p.oy - 10, 190 * fk, 0.85); }
  for (const p of G.players) if (p.state !== 'dead') light(p.x, p.y - 30, 135, 0.75);
  for (const f of G.fires) light(f.x, f.y, f.r * 2.6, 0.9 * Math.min(1, f.t));
  for (const f of G.flashes) light(f.x, f.y, f.r, 1);
  for (const q of G.eprojs) if (q.kind === 'orb') light(q.x, q.y, 90, 0.7);
  for (const pr of G.projs) if (pr.kind === 'molotov') light(pr.x, pr.y, 80, 0.7);
  lx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lc, 0, 0, Render.W, Render.H);
  worldTransform(ctx);
  ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  glow(World.fire.x, World.fire.y - 10, 260 * fl, '255,140,40', 0.22 * dk);
  for (const f of G.fires) glow(f.x, f.y, f.r * 2, '255,120,30', 0.25 * dk);
  ctx.globalCompositeOperation = 'source-over';
}

// пузырь подсказки: «держи A: поднять» → [держи] (A) поднять
function drawHint(ctx, text, x, y) {
  const m = text.match(/^(держи )?([^:\s]+): (.*)$/);
  ctx.font = `bold 13px ${FONT}`;
  const pre = m && m[1] ? 'держи ' : '', b = m ? m[2] : null, rest = m ? m[3] : text;
  const wPre = pre ? ctx.measureText(pre).width : 0, wB = b ? (b.length > 2 ? ctx.measureText(b).width + 12 : 20) : 0, wR = ctx.measureText(rest).width;
  const w = wPre + wB + wR + 22, h = 24, x0 = x - w / 2;
  rrect(ctx, x0, y - h / 2, w, h, 12); ctx.fillStyle = 'rgba(24,18,13,0.88)'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 6, y + h / 2 - 1); ctx.lineTo(x, y + h / 2 + 7); ctx.lineTo(x + 6, y + h / 2 - 1); ctx.fillStyle = 'rgba(24,18,13,0.88)'; ctx.fill();
  let cx = x0 + 11;
  ctx.textAlign = 'left'; ctx.fillStyle = '#c8bca0'; if (pre) { ctx.fillText(pre, cx, y + 5); cx += wPre; }
  if (b) { if (b.length <= 2) glyph(ctx, b, cx + 9, y, 9), ctx.font = `bold 13px ${FONT}`; else { rrect(ctx, cx, y - 9, wB - 4, 18, 5); ctx.fillStyle = '#6a5e50'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(b, cx + (wB - 4) / 2, y + 5); ctx.textAlign = 'left'; } cx += wB; }
  ctx.fillStyle = '#f2e6c8'; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(rest, cx, y + 5);
  ctx.textAlign = 'center';
}

// ---------- Поверх темноты ----------
function drawOverlay(ctx, dk) {
  for (const e of G.enemies) {
    if (e.hidden) continue;
    const d = EDEF[e.type];
    if (e.state === 'wind') {
      const k = 1 - e.t / d.wind;
      if (d.slam) {
        const cx = e.x + Math.cos(e.face) * d.slam * 0.4, cy = e.y + Math.sin(e.face) * d.slam * 0.26;
        ctx.fillStyle = `rgba(220,40,20,${0.15 + 0.25 * k})`; ctx.beginPath(); ctx.ellipse(cx, cy, d.slam * k, d.slam * 0.6 * k, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,80,50,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, d.slam, d.slam * 0.6, 0, 0, TAU); ctx.stroke();
      } else if (e.shot) {
        ctx.strokeStyle = e.shot === 'orb' ? `rgba(180,140,255,${0.3 + 0.6 * k})` : `rgba(230,230,210,${0.3 + 0.5 * k})`; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.face) * 260, e.y + Math.sin(e.face) * 260); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = `rgba(255,70,40,${0.4 + 0.5 * k})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r + 16, (e.r + 16) * 0.55, 0, e.face - 0.8, e.face + 0.8); ctx.stroke();
      }
    } else if (e.state === 'crouch') {
      ctx.strokeStyle = 'rgba(255,90,50,0.6)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.leapDx * 170, e.y + e.leapDy * 170); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  // снаряды врагов
  for (const q of G.eprojs) {
    if (q.kind === 'orb') { ctx.fillStyle = 'rgba(180,140,255,0.35)'; ctx.beginPath(); ctx.arc(q.x, q.y - 30, 11, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8dcff'; ctx.beginPath(); ctx.arc(q.x, q.y - 30, 5, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = '#e8e4d8'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x, q.y - 16, 5, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  // выстрелы, молнии, волны
  for (const t of G.tracers) { ctx.strokeStyle = `rgba(255,230,160,${t.t / 0.08})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.x0, t.y0); ctx.lineTo(t.x1, t.y1); ctx.stroke(); }
  for (const b of G.bolts) {
    for (const [w, col] of [[6, 'rgba(120,140,255,0.5)'], [2.4, '#f4f0ff']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      for (let i = 0; i < b.pts.length - 1; i++) {
        const a = b.pts[i], c = b.pts[i + 1];
        ctx.moveTo(a.x, a.y);
        for (let k = 1; k <= 5; k++) ctx.lineTo(lerp(a.x, c.x, k / 5) + (k < 5 ? rand(-9, 9) : 0), lerp(a.y, c.y, k / 5) + (k < 5 ? rand(-9, 9) : 0));
      }
      ctx.stroke();
    }
  }
  for (const w of G.waves) {
    ctx.strokeStyle = `rgba(${w.col},${w.t * 2})`; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.6, 0, w.a - w.arc, w.a + w.arc); ctx.stroke();
  }
  if (dk > 0.3) {
    ctx.globalCompositeOperation = 'lighter';
    for (const e of G.enemies) {
      if (e.state === 'dying' || e.hidden) continue;
      const flip = Math.cos(e.face) < 0 ? -1 : 1;
      let y = e.y; if (e.state === 'cling' && e.host) y = e.host.y - 40;
      if (EDEF[e.type].float) y -= 6;
      ctx.fillStyle = e.type === 'clinger' || e.type === 'spider' ? `rgba(255,60,40,${dk})` : e.type === 'void' ? `rgba(190,150,255,${dk})` : `rgba(255,225,130,${dk * 0.95})`;
      for (const [ex, ey] of EYE[e.type]) { ctx.beginPath(); ctx.arc(e.x + ex * flip, y + ey, e.type === 'titan' ? 2.6 : 1.8, 0, TAU); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.textAlign = 'center';
  for (const p of G.players) {
    if (p.state === 'dead') continue;
    const col = PAL[p.i].accent;
    const top = p.held ? p.y - 156 : p.y - 120;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p.x - 6, top - 8); ctx.lineTo(p.x + 6, top - 8); ctx.lineTo(p.x, top); ctx.fill();
    ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke();
    if (p.state === 'downed') {
      const k = p.bleed / 25;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y - 40, 18, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#d6493a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - 40, 18, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      ctx.fillStyle = '#ffd0c0'; ctx.font = `bold 18px ${FONT}`; ctx.fillText('!', p.x, p.y - 34);
      const o = G.players[1 - p.i];
      if (o.reviveTgt === p) { ctx.strokeStyle = '#9fe39a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - 40, 25, -Math.PI / 2, -Math.PI / 2 + TAU * o.revive / (o.sk.med >= 2 ? 1.1 : 2.2)); ctx.stroke(); }
    }
    if (p.search) { ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y - 128, 12, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#e8d08a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - 128, 12, -Math.PI / 2, -Math.PI / 2 + TAU * p.search.t / 1.2); ctx.stroke(); }
    if (p.state === 'atk' && p.comboN >= 2 && p.atk.hitsDone > 0) { ctx.font = `bold 13px ${FONT}`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(p.atk.M.name, p.x, top - 14); ctx.fillStyle = '#ffe8a8'; ctx.fillText(p.atk.M.name, p.x, top - 14); }
    else if (p.hint) drawHint(ctx, p.hint, p.x, top - 20);
    if (!p.held && p.state === 'normal' && !p.hint && Input.ctrls[p.i].down.build) {
      const b = barricadeSpec(p);
      ctx.strokeStyle = canPlace(b.x, b.y, b.w, b.h, null, false) ? 'rgba(160,255,140,0.7)' : 'rgba(255,90,70,0.7)';
      ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }
  for (const sp of G.sparks) {
    const k = sp.t / sp.max, r = sp.r * (1.2 - k * 0.5);
    ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.a);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const rr = i % 2 ? r * 0.35 : r * (i % 4 ? 0.8 : 1.15), an = i / 16 * TAU; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr * 0.8); }
    ctx.closePath(); ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.fillStyle = '#fffbe8'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, TAU); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center';
  for (const n of G.dmgNums) {
    const sz = n.big ? 22 : 16;
    ctx.globalAlpha = Math.min(1, n.t * 3);
    ctx.font = `900 ${sz}px ${FONT}`; ctx.lineWidth = 4; ctx.strokeStyle = OL; ctx.strokeText(n.v, n.x, n.y);
    ctx.fillStyle = n.big ? '#ffd860' : '#fffbe8'; ctx.fillText(n.v, n.x, n.y);
  }
  ctx.globalAlpha = 1;
  for (const t of G.texts) {
    ctx.globalAlpha = Math.min(1, t.t * 2);
    ctx.font = `bold ${t.size}px ${FONT}`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.col; ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- Интерфейс (в духе Don't Starve: круглые шкалы, циферблат дня, кнопки-медальоны) ----------
const BTNCOL = { A: '#5fb84a', B: '#d84a3a', X: '#3a7ad8', Y: '#e0b030', LB: '#8a8070', RB: '#8a8070', RT: '#8a8070', LT: '#8a8070' };
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function bar(ctx, x, y, w, h, k, col, bg = 'rgba(0,0,0,0.55)') {
  rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  if (k > 0) { ctx.save(); rrect(ctx, x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x, y, w * clamp(k, 0, 1), h * 0.35); ctx.restore(); }
  rrect(ctx, x, y, w, h, h / 2); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke();
}
function panel(ctx, x, y, w, h) {
  rrect(ctx, x, y, w, h, 10);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(46,36,27,0.94)'); g.addColorStop(1, 'rgba(26,20,15,0.94)');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 3.5; ctx.stroke();
  rrect(ctx, x + 4, y + 4, w - 8, h - 8, 7); ctx.strokeStyle = 'rgba(176,140,92,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
}
function icon(ctx, name, x, y, size) {
  const s = Art.s[name]; if (!s) return;
  const k = size / Math.max(s.w, s.h);
  ctx.drawImage(s.c, x - s.w * k / 2, y - s.h * k / 2, s.w * k, s.h * k);
}
function inkText(ctx, text, x, y, col, size, bold = true, align = 'left') {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`; ctx.textAlign = align;
  ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(10,7,5,0.92)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = col; ctx.fillText(text, x, y);
}
function glyph(ctx, b, x, y, r = 9) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = BTNCOL[b] || '#6a5e50'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = `900 ${b.length > 1 ? r * 0.85 : r * 1.25}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(b, x, y + r * (b.length > 1 ? 0.32 : 0.45));
}
function heartPath(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.8); ctx.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.4); ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.8); }
function boltPath(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x + s * 0.2, y - s); ctx.lineTo(x - s * 0.55, y + s * 0.1); ctx.lineTo(x - s * 0.05, y + s * 0.1); ctx.lineTo(x - s * 0.25, y + s); ctx.lineTo(x + s * 0.55, y - s * 0.15); ctx.lineTo(x + s * 0.05, y - s * 0.15); ctx.closePath(); }
// круглая шкала: заполнение снизу вверх, значок в центре, дуга брони
function gauge(ctx, x, y, r, k, col, drawIcon, warn, ring) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#16110d'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 1, 0, TAU); ctx.clip();
  const top = y + r - 2 * r * clamp(k, 0, 1);
  ctx.fillStyle = col; ctx.fillRect(x - r, top, 2 * r, 2 * r);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - r, top, 2 * r, 3);
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = warn && Math.floor(G.t * 4) % 2 ? '#ff5a3a' : OL; ctx.lineWidth = 3.2; ctx.stroke();
  if (ring > 0) { ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * ring); ctx.strokeStyle = OL; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = '#a8c0dc'; ctx.lineWidth = 2.6; ctx.stroke(); }
  drawIcon(x, y);
}

function drawHUD(ctx) {
  const u = Render.H / 720;
  ctx.save(); ctx.scale(u, u);
  const W = Render.W / u;
  ctx.textBaseline = 'alphabetic';
  for (const p of G.players) drawPlayerHUD(ctx, p, p.i === 0 ? 14 : W - 14, p.i === 0 ? 1 : -1);
  drawClock(ctx, W / 2, 50);
  // ресурсы
  const items = [['wood', G.team.wood], ['scrap', G.team.scrap], ['cloth', G.team.cloth], ['fuel', G.team.fuel], ['ammo', G.team.ammo], ['food', G.team.food], ['band', G.team.band]];
  const rw = items.length * 66 + 18, rx = W / 2 - rw / 2, ry = 720 - 48;
  panel(ctx, rx, ry, rw, 38);
  items.forEach(([n, v], i) => { const x = rx + 30 + i * 66; icon(ctx, n, x, ry + 19, 24); inkText(ctx, String(v), x + 16, ry + 26, v > 0 ? '#f2e6c8' : '#8a7e68', 16); });
  // Титан
  const titan = G.enemies.find((e) => e.type === 'titan' && e.state !== 'dying');
  let my = 130;
  if (titan) { const bw = 440, bx = W / 2 - bw / 2; inkText(ctx, 'ТИТАН', W / 2, 118, '#ff8a6a', 15, true, 'center'); bar(ctx, bx, 124, bw, 13, titan.hp / titan.maxHp, '#c43e30'); my = 162; }
  // сообщения — лента
  for (const m of G.msgs) {
    ctx.globalAlpha = Math.min(1, m.t);
    ctx.font = `bold 17px ${FONT}`;
    const w = ctx.measureText(m.text).width + 34;
    rrect(ctx, W / 2 - w / 2, my - 19, w, 26, 13); ctx.fillStyle = 'rgba(18,13,9,0.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(176,140,92,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = m.col; ctx.fillText(m.text, W / 2, my);
    my += 32;
  }
  ctx.globalAlpha = 1;
  if (G.showFps) { ctx.textAlign = 'left'; ctx.font = `11px ${FONT}`; ctx.fillStyle = 'rgba(240,230,200,0.45)'; ctx.fillText(`FPS ${Render.fps.toFixed(0)} · монстров ${G.enemies.length} · F2 качество · F3 скрыть`, 12, 714); }
  ctx.restore();
}

function drawClock(ctx, x, y) {
  const R = 36, total = DAY_LEN + DUSK_LEN + NIGHT_LEN, a0 = -Math.PI / 2;
  const segs = [[DAY_LEN, '#e2c063'], [DUSK_LEN, '#d47c42'], [NIGHT_LEN, '#3e4a7c']];
  ctx.beginPath(); ctx.arc(x, y, R + 6, 0, TAU); ctx.fillStyle = '#2a2017'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 3.5; ctx.stroke();
  let a = a0;
  for (const [len, col] of segs) { const b = a + TAU * len / total; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, a, b); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke(); a = b; }
  const elapsed = G.phase === 'day' ? G.phaseT : G.phase === 'dusk' ? DAY_LEN + G.phaseT : DAY_LEN + DUSK_LEN + G.phaseT;
  const ha = a0 + TAU * elapsed / total;
  ctx.beginPath(); ctx.arc(x, y, R * 0.55, 0, TAU); ctx.fillStyle = '#2a2017'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + Math.cos(ha) * R * 0.5, y + Math.sin(ha) * R * 0.5); ctx.lineTo(x + Math.cos(ha) * (R + 2), y + Math.sin(ha) * (R + 2)); ctx.stroke();
  ctx.strokeStyle = '#f6eed6'; ctx.lineWidth = 3; ctx.stroke();
  inkText(ctx, String(G.day), x, y + 7, '#f2e6c8', 20, true, 'center');
  const lbl = G.phase === 'day' ? 'День' : G.phase === 'dusk' ? 'Сумерки' : 'Ночь';
  inkText(ctx, lbl, x, y + R + 24, G.phase === 'night' ? '#a8b4ff' : G.phase === 'dusk' ? '#ffb27a' : '#f2e6c8', 14, true, 'center');
  const gn = World.gen;
  if (gn.fuel > 0 || gn.on) { ctx.save(); boltPath(ctx, x + R + 18, y - R + 8, 9); ctx.fillStyle = gn.on ? '#b8ff9a' : '#c9b06a'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); inkText(ctx, String(gn.fuel), x + R + 30, y - R + 14, '#f2e6c8', 12); }
}

function drawPlayerHUD(ctx, p, ax, dir) {
  const pal = PAL[p.i], X = (dx) => ax + dir * dx;
  const px = X(42), py = 52;
  // портрет
  ctx.beginPath(); ctx.arc(px, py, 36, 0, TAU); ctx.fillStyle = p.state === 'dead' ? '#2a1a16' : '#3a3024'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(px, py, 34, 0, TAU); ctx.clip();
  if (p.state === 'dead' || p.state === 'downed') ctx.globalAlpha = 0.45;
  if (Puppet.ready) {
    // портрет — голова того же персонажа, что и в игре; смотрит к центру экрана
    const h = Puppet.P[p.i].head, k = 62 / h.w;
    ctx.translate(px, py); ctx.scale(dir, 1);
    ctx.drawImage(h.c, -h.w * k * 0.5 + 2, -h.h * k * 0.5 + 6, h.w * k, h.h * k);
  } else { const h = Art.players[p.i].head; ctx.drawImage(h.c, px - h.w * 1.2, py - 34, h.w * 2.4, h.h * 2.4); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(px, py, 36, 0, TAU); ctx.strokeStyle = OL; ctx.lineWidth = 4; ctx.stroke();
  // опыт — дуга вокруг портрета
  ctx.beginPath(); ctx.arc(px, py, 36, -Math.PI / 2, -Math.PI / 2 + TAU * p.xp / xpNeed(p.lvl)); ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(px + dir * 26, py + 26, 12, 0, TAU); ctx.fillStyle = pal.accent; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.stroke();
  inkText(ctx, String(p.lvl), px + dir * 26, py + 31, '#fff', 13, true, 'center');
  inkText(ctx, pal.name, px, py + 54, pal.accent, 13, true, 'center');
  if (p.pts > 0) inkText(ctx, `★${p.pts}`, px - dir * 30, py - 22, '#ffe08a', 14, true, 'center');
  if (p.state === 'dead') { inkText(ctx, 'Погиб · вернётся на рассвете', X(92), py + 6, '#ff8a7a', 14, true, dir > 0 ? 'left' : 'right'); return; }
  // шкалы
  const gx = (n) => X(110 + n * 54);
  gauge(ctx, gx(0), 44, 23, p.hp / p.maxHp, p.state === 'downed' ? '#6a2a22' : '#c43a2c',
    (x, y) => { heartPath(ctx, x, y + 1, 9); ctx.fillStyle = '#ffe2d6'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); }, p.hp < 30, p.armor / 120);
  gauge(ctx, gx(1), 44, 19, p.food / 100, '#d08a42', (x, y) => icon(ctx, 'food', x, y, 20), p.food < 20);
  gauge(ctx, gx(2), 44, 19, p.st / 100, '#d6c04a', (x, y) => { boltPath(ctx, x, y, 9); ctx.fillStyle = '#fff6d0'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); });
  inkText(ctx, p.state === 'downed' ? `${Math.ceil(p.bleed)}с` : String(Math.ceil(p.hp)), gx(0), 82, '#f2e6c8', 12, true, 'center');
  if (p.clingers.length) inkText(ctx, `ПАРАЗИТ ×${p.clingers.length}`, gx(1), 82, '#ff9a8a', 11, true, 'center');
  // оружие
  const W = wep(p), wx = gx(3) + dir * 6, wy = 44;
  ctx.beginPath(); ctx.arc(wx, wy, 24, 0, TAU); ctx.fillStyle = '#16110d'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 3.2; ctx.stroke();
  if (p.weapon.type !== 'fists') {
    const s = Art.s['w_' + p.weapon.type], k = Math.min(40 / s.w, 22 / s.h);
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(-0.7); ctx.drawImage(s.c, -s.w * k / 2, -s.h * k / 2, s.w * k, s.h * k); ctx.restore();
    if (W.durab < Infinity) { const d = p.weapon.dur / W.durab; ctx.beginPath(); ctx.arc(wx, wy, 27, -Math.PI / 2, -Math.PI / 2 + TAU * d); ctx.strokeStyle = OL; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = d > 0.3 ? '#b8d080' : '#e06a3a'; ctx.lineWidth = 2.6; ctx.stroke(); }
  } else inkText(ctx, '✊', wx, wy + 8, '#e0c8a4', 22, true, 'center');
  inkText(ctx, W.gun ? `${W.name} ${G.team.ammo}` : W.name, wx, 82, '#c8bca0', 11, true, 'center');
  // сумка со вторым оружием
  const bx2 = wx + dir * 36, by2 = 62;
  ctx.beginPath(); ctx.arc(bx2, by2, 14, 0, TAU); ctx.fillStyle = '#16110d'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.stroke();
  if (p.bag) { const s2 = Art.s['w_' + p.bag.type], k2 = Math.min(24 / s2.w, 14 / s2.h); ctx.save(); ctx.translate(bx2, by2); ctx.rotate(-0.7); ctx.drawImage(s2.c, -s2.w * k2 / 2, -s2.h * k2 / 2, s2.w * k2, s2.h * k2); ctx.restore(); }
  glyph(ctx, Input.btn(p.i, 'swap'), bx2 + dir * 11, by2 + 11, 7);
  if (p.pickW) { ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx, wy, 30, -Math.PI / 2, -Math.PI / 2 + TAU * p.pickW.t / 0.4); ctx.stroke(); }
  // способности
  for (let k = 0; k < 3; k++) {
    const id = p.slots[k], sx = X(118 + (dir > 0 ? k : 2 - k) * 44), sy = 112;
    ctx.beginPath(); ctx.arc(sx, sy, 17, 0, TAU); ctx.fillStyle = '#16110d'; ctx.fill();
    if (id) {
      const cd = p.abCd[id] > 0 ? p.abCd[id] / ABIL[id].cd : 0;
      if (cd > 0) ctx.globalAlpha = 0.45;
      icon(ctx, ABIL[id].icon, sx, sy, 32); ctx.globalAlpha = 1;
      if (cd > 0) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, 17, -Math.PI / 2, -Math.PI / 2 + TAU * cd); ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill(); inkText(ctx, Math.ceil(p.abCd[id]), sx, sy + 5, '#fff', 13, true, 'center'); }
    }
    ctx.beginPath(); ctx.arc(sx, sy, 17, 0, TAU); ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.stroke();
    glyph(ctx, Input.btn(p.i, 'ab' + (k + 1)), sx + dir * 13, sy + 13, 8);
  }
  if (p.state === 'atk' && p.comboN >= 2) inkText(ctx, `Комбо ×${p.comboN}`, X(250), 118, '#ffe08a', 15, true, dir > 0 ? 'left' : 'right');
  if (p.menu) drawSkillMenu(ctx, p, dir > 0 ? ax : ax - 330, 142);
  if (p.craft) drawCraftMenu(ctx, p, dir > 0 ? ax : ax - 330, 142);
}

function drawSkillMenu(ctx, p, x, my) {
  const pal = PAL[p.i];
  const ids = Object.keys(ABIL);
  const hgt = p.menuTab === 0 ? 50 + SKILLS.length * 50 : 70 + ids.length * 30;
  panel(ctx, x, my, 330, hgt);
  inkText(ctx, p.menuTab === 0 ? `Навыки · очков: ${p.pts}` : 'Способности', x + 14, my + 24, pal.accent, 15);
  inkText(ctx, p.menuTab === 0 ? '◀▶ способности' : '◀▶ навыки', x + 318, my + 24, '#8f846c', 11, false, 'right');
  if (p.menuTab === 0) {
    SKILLS.forEach((s, i) => {
      const yy = my + 32 + i * 50, lv = p.sk[s.id], sel = p.menuSel === i;
      if (sel) { ctx.fillStyle = 'rgba(255,230,170,0.1)'; ctx.fillRect(x + 8, yy, 314, 46); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.strokeRect(x + 8, yy, 314, 46); }
      icon(ctx, s.icon, x + 30, yy + 23, 30);
      inkText(ctx, s.name, x + 52, yy + 18, '#f2e6c8', 14);
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k < lv ? pal.accent : 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 206 + k * 22, yy + 9, 18, 9); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.strokeRect(x + 206 + k * 22, yy + 9, 18, 9); }
      ctx.font = `11px ${FONT}`; ctx.fillStyle = '#b8ac90'; ctx.textAlign = 'left';
      ctx.fillText(lv < 5 ? `${lv + 1}: ${s.lv[lv]} (${skillCost(lv)} оч.)` : 'Максимум', x + 52, yy + 36);
    });
    ctx.font = `11px ${FONT}`; ctx.fillStyle = '#8f846c'; ctx.textAlign = 'left';
    ctx.fillText(`${Input.btn(p.i, 'light')} — изучить · ${Input.btn(p.i, 'roll')} — закрыть`, x + 14, my + hgt - 8);
  } else {
    ids.forEach((id, i) => {
      const yy = my + 34 + i * 30, A = ABIL[id], ok = abilityUnlocked(p, id), sel = p.abSel === i;
      if (sel) { ctx.fillStyle = 'rgba(255,230,170,0.1)'; ctx.fillRect(x + 8, yy - 2, 314, 28); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.strokeRect(x + 8, yy - 2, 314, 28); }
      if (!ok) ctx.globalAlpha = 0.4;
      icon(ctx, A.icon, x + 24, yy + 12, 24);
      inkText(ctx, A.name, x + 42, yy + 11, '#f2e6c8', 13);
      ctx.font = `10px ${FONT}`; ctx.fillStyle = '#b8ac90'; ctx.textAlign = 'left';
      ctx.fillText(ok ? A.desc : `Нужно: ${SKILLS.find((s) => s.id === A.req[0]).name} ${A.req[1]}`, x + 42, yy + 23);
      const sl = p.slots.indexOf(id);
      if (sl >= 0) inkText(ctx, Input.btn(p.i, 'ab' + (sl + 1)), x + 316, yy + 16, pal.accent, 12, true, 'right');
      ctx.globalAlpha = 1;
    });
    ctx.font = `11px ${FONT}`; ctx.fillStyle = '#8f846c'; ctx.textAlign = 'left';
    ctx.fillText(`Нажми ${Input.btn(p.i, 'ab1')} / ${Input.btn(p.i, 'ab2')} / ${Input.btn(p.i, 'ab3')}, чтобы назначить в слот`, x + 14, my + hgt - 10);
  }
}

function drawCraftMenu(ctx, p, x, my) {
  const pal = PAL[p.i], hgt = 50 + RECIPES.length * 40;
  panel(ctx, x, my, 330, hgt);
  inkText(ctx, 'Верстак', x + 14, my + 24, pal.accent, 15);
  RECIPES.forEach((r, i) => {
    const yy = my + 32 + i * 40, sel = p.craftSel === i;
    const can = Object.entries(r.cost).every(([k, v]) => G.team[k] >= v) && (!r.eng || p.sk.eng >= r.eng);
    if (sel) { ctx.fillStyle = 'rgba(255,230,170,0.1)'; ctx.fillRect(x + 8, yy, 314, 36); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.strokeRect(x + 8, yy, 314, 36); }
    if (!can) ctx.globalAlpha = 0.45;
    inkText(ctx, r.name, x + 16, yy + 16, '#f2e6c8', 13);
    ctx.font = `10px ${FONT}`; ctx.fillStyle = '#b8ac90'; ctx.textAlign = 'left'; ctx.fillText(r.desc, x + 16, yy + 30);
    let cx = x + 314;
    for (const [k, v] of Object.entries(r.cost).reverse()) { inkText(ctx, String(v), cx, yy + 23, RES[k].col, 13, true, 'right'); icon(ctx, k, cx - 22, yy + 18, 18); cx -= 46; }
    ctx.globalAlpha = 1;
  });
  ctx.font = `11px ${FONT}`; ctx.fillStyle = '#8f846c'; ctx.textAlign = 'left';
  ctx.fillText(`${Input.btn(p.i, 'light')} — сделать · ${Input.btn(p.i, 'roll')} — закрыть`, x + 14, my + hgt - 8);
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
    put2('p0_idle0', 120, 2.1, false, 1);
    put2('p1_idle0', W - 120, 2.1, true, 1);
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
