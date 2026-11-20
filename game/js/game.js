'use strict';
// ---------- Состояние игры, день/ночь, волны, камера ----------
const VIEW_H = 720;          // логическая высота кадра (мировых единиц при zoom=1)
const ZOOM_MIN = 0.62;       // насколько камера может отдалиться
const DAY_LEN = 110, DUSK_LEN = 20, NIGHT_LEN = 80;

const G = {
  state: 'title', t: 0, day: 1, phase: 'day', phaseT: 0,
  team: { wood: 4, scrap: 2 }, players: [], enemies: [], items: [], pickups: [], projs: [], parts: [], texts: [], stains: [], msgs: [],
  spawnQ: [], kills: 0, cam: { x: 1248, y: 1000, zoom: 1 }, shake: 0, hitstop: 0, flowT: 0, flowDirty: true, overT: 0,
  paused: false, showFps: true, quality: 1, bestNight: 0,
};

function msg(text, col = '#f2e6c8') {
  G.msgs.push({ text, col, t: 4 });
  if (G.msgs.length > 4) G.msgs.shift();
}

function newGame() {
  buildWorld();
  const f = World.fire;
  G.t = 0; G.day = 1; G.phase = 'day'; G.phaseT = 0; G.kills = 0; G.overT = 0;
  G.team = { wood: 4, scrap: 2 };
  G.players = [makePlayer(0, f.x - 50, f.y - 50), makePlayer(1, f.x + 50, f.y - 50)];
  G.enemies = []; G.items = []; G.pickups = []; G.projs = []; G.parts = []; G.texts = []; G.stains = []; G.msgs = []; G.spawnQ = [];
  G.cam.x = f.x; G.cam.y = f.y - 80; G.cam.zoom = 1;
  G.flowDirty = true;
  // подручные предметы
  const rng = mulberry32(7);
  for (const r of World.ruins) for (let i = 0; i < 3; i++) {
    G.items.push({ kind: rng() < 0.5 ? 'brick' : 'bottle', x: r.x + 40 + rng() * (r.w - 80), y: r.y + 40 + rng() * (r.h - 80), held: false, fly: false });
  }
  const h = World.house;
  G.items.push({ kind: 'brick', x: h.x + 100, y: h.y + h.h + 50, held: false, fly: false });
  G.items.push({ kind: 'bottle', x: h.x + 220, y: h.y + h.h + 60, held: false, fly: false });
  G.items.push({ kind: 'brick', x: h.x + 60, y: h.y + 60, held: false, fly: false });
  respawnLoot(true);
  spawnDayWanderers();
  msg('День 1. Соберите припасы и вернитесь к дому до темноты', '#f2e6c8');
  msg('Бейте деревья и ящики — дерево и хлам нужны для баррикад и ловушек', '#cfc3a2');
  G.state = 'play';
}

function respawnLoot(all) {
  const have = World.structs.filter((s) => s.kind === 'loot').length;
  const want = 16;
  const spots = World.lootSpots.slice().sort(() => Math.random() - 0.5);
  let n = want - have;
  for (const sp of spots) {
    if (n <= 0) break;
    if (!canPlace(sp.x - 15, sp.y - 13, 30, 26, null, false)) continue;
    addLoot(sp.x, sp.y); n--;
  }
  if (!all) for (const t of World.trees) t.wood = 3;
}

function spawnDayWanderers() {
  const n = 3 + Math.min(4, G.day - 1);
  for (let i = 0; i < n; i++) {
    const pt = randomFarPoint(600);
    if (pt) spawnEnemy(G.day >= 3 && i === 0 ? 'jumper' : 'walker', pt.x, pt.y, false);
  }
}

function randomFarPoint(minD, edge) {
  for (let k = 0; k < 60; k++) {
    let x, y;
    if (edge) {
      const s = randi(0, 3);
      x = s < 2 ? rand(120, WORLD_W - 120) : (s === 2 ? rand(60, 160) : WORLD_W - rand(60, 160));
      y = s >= 2 ? rand(120, WORLD_H - 120) : (s === 0 ? rand(60, 160) : WORLD_H - rand(60, 160));
    } else { x = rand(150, WORLD_W - 150); y = rand(150, WORLD_H - 150); }
    let ok = true;
    for (const p of G.players) if (p.state !== 'dead' && dist(x, y, p.x, p.y) < minD) ok = false;
    if (ok && dist(x, y, World.fire.x, World.fire.y) < 500) ok = false;
    if (ok && freeSpot(x, y, 16) && !Nav.blocked[cellOf(x, y)]) return { x, y };
  }
  return null;
}

function planNight(n) {
  const list = [];
  const add = (type, k) => { for (let i = 0; i < k; i++) list.push(type); };
  add('walker', 5 + 2 * n);
  add('clinger', 1 + n);
  if (n >= 2) add('jumper', 1 + n);
  if (n >= 3) add('brute', 1 + Math.floor((n - 3) / 2));
  list.sort(() => Math.random() - 0.5);
  // тяжеловесы — во второй половине ночи
  list.sort((a, b) => (a === 'brute') - (b === 'brute'));
  G.spawnQ = [];
  let t = 2;
  const span = NIGHT_LEN * 0.72;
  for (let i = 0; i < list.length;) {
    const grp = Math.min(list.length - i, randi(2, 3));
    G.spawnQ.push({ t, types: list.slice(i, i + grp) });
    i += grp; t += span / Math.ceil(list.length / 2.5);
  }
}

function updatePhase(dt) {
  G.phaseT += dt;
  if (G.phase === 'day' && G.phaseT >= DAY_LEN) {
    G.phase = 'dusk'; G.phaseT = 0;
    msg('Смеркается! Возвращайтесь к дому и готовьте оборону', '#ffc27a'); Sfx.play('dusk');
  } else if (G.phase === 'dusk' && G.phaseT >= DUSK_LEN) {
    G.phase = 'night'; G.phaseT = 0;
    planNight(G.day);
    for (const e of G.enemies) e.aggro = true;
    msg(`Ночь ${G.day}. Они идут.`, '#ff8a7a'); Sfx.play('night');
  } else if (G.phase === 'night') {
    while (G.spawnQ.length && G.spawnQ[0].t <= G.phaseT) {
      const s = G.spawnQ.shift();
      const pt = randomFarPoint(650, true);
      if (!pt) continue;
      for (const type of s.types) spawnEnemy(type, pt.x + rand(-30, 30), pt.y + rand(-30, 30), true);
    }
    if (G.phaseT >= NIGHT_LEN) dawn();
  }
}

function dawn() {
  G.bestNight = Math.max(G.bestNight, G.day);
  for (const e of G.enemies) if (!e.dead && e.state !== 'dying') {
    if (e.host) { const k = e.host.clingers.indexOf(e); if (k >= 0) e.host.clingers.splice(k, 1); e.host = null; }
    e.state = 'dying'; e.t = 0.8; burst(e.x, e.y, 20, 8, '#c9b58a', 100, 4, 0.8);
  }
  G.spawnQ = [];
  for (const p of G.players) {
    if (p.state === 'dead') {
      p.state = 'normal'; p.hp = p.maxHp * 0.5; p.x = World.fire.x + (p.i ? 40 : -40); p.y = World.fire.y - 50; p.inv = 2;
      msg(`${pname(p)} вернулся к костру`, PAL[p.i].accent);
    } else if (p.state === 'downed') { p.state = 'normal'; p.hp = p.maxHp * 0.3; }
    else p.hp = Math.min(p.maxHp, p.hp + 25);
    giveXP(p, 40 + 10 * G.day);
  }
  msg(`Рассвет. Пережито ночей: ${G.day}. +опыт`, '#fff2b0'); Sfx.play('dawn');
  G.day++; G.phase = 'day'; G.phaseT = 0;
  respawnLoot(false);
  spawnDayWanderers();
}

// Сколько темноты (0..1) и оттенок
function darkness() {
  if (G.phase === 'day') return G.day > 1 && G.phaseT < 6 ? 0.8 * (1 - G.phaseT / 6) : 0;
  if (G.phase === 'dusk') return 0.55 * (G.phaseT / DUSK_LEN);
  if (G.phase === 'night') return Math.min(0.86, 0.55 + G.phaseT / 4 * 0.31);
  return 0;
}

// ---------- Камера и «поводок» между игроками ----------
function viewSize(zoom) {
  const scale = (Render.H / VIEW_H) * zoom;
  return { w: Render.W / scale, h: Render.H / scale, scale };
}

function updateCamera(dt, instant) {
  let ps = G.players.filter((p) => p.state !== 'dead');
  if (!ps.length) ps = G.players;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of ps) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y - 30); y1 = Math.max(y1, p.y - 30); }
  const base = viewSize(1);
  const z = clamp(Math.min(1, base.w / (x1 - x0 + 360), base.h / (y1 - y0 + 330)), ZOOM_MIN, 1);
  const k = instant ? 1 : 1 - Math.pow(0.004, dt), kz = instant ? 1 : 1 - Math.pow(0.08, dt);
  G.cam.zoom = lerp(G.cam.zoom, z, kz);
  G.cam.x = lerp(G.cam.x, (x0 + x1) / 2, k);
  G.cam.y = lerp(G.cam.y, (y0 + y1) / 2, k);
  const v = viewSize(G.cam.zoom);
  G.cam.x = clamp(G.cam.x, v.w / 2, WORLD_W - v.w / 2);
  G.cam.y = clamp(G.cam.y, v.h / 2 - 60, WORLD_H - v.h / 2);
}

function leash() {
  const [a, b] = G.players;
  if (a.state === 'dead' || b.state === 'dead') return;
  const v = viewSize(ZOOM_MIN);
  const mx = v.w - 380, my = v.h - 350;
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) > mx) { const e = (Math.abs(dx) - mx) / 2 * Math.sign(dx); a.x += e; b.x -= e; }
  if (Math.abs(dy) > my) { const e = (Math.abs(dy) - my) / 2 * Math.sign(dy); a.y += e; b.y -= e; }
}

// ---------- Главное обновление ----------
function update(dt) {
  G.t += dt;
  G.shake = Math.max(0, G.shake - dt * 30);
  for (const m of G.msgs) m.t -= dt;
  G.msgs = G.msgs.filter((m) => m.t > 0);

  if (G.hitstop > 0) { G.hitstop -= dt; return; }

  updatePhase(dt);

  // поле потоков для монстров
  G.flowT -= dt;
  if (G.flowT <= 0 || G.flowDirty) {
    let tg = G.players.filter(alive);
    if (!tg.length) tg = G.players.filter((p) => p.state !== 'dead');
    computeFlow(tg);
    G.flowT = 0.3; G.flowDirty = false;
  }

  for (const p of G.players) updatePlayer(p, Input.ctrls[p.i], dt);
  for (const e of G.enemies) updateEnemy(e, dt);
  separate();
  leash();
  for (const p of G.players) if (p.state !== 'dead') collideWorld(p, p.r, false);

  G.enemies = G.enemies.filter((e) => !e.dead);
  updateProjs(dt);
  updatePickups(dt);
  updateParts(dt);
  for (const s of World.structs) {
    s.flash -= dt;
    if (s.kind === 'furn' && !s.solid && !s.carried && canPlace(s.x, s.y, s.w, s.h, s)) { s.solid = true; G.flowDirty = true; }
  }
  for (const t of World.trees) if (t.shake > 0) t.shake -= dt;

  // поражение: оба без сознания или мертвы
  if (!G.players.some(alive)) {
    G.overT += dt;
    if (G.overT > 1.5) { G.state = 'over'; G.bestNight = Math.max(G.bestNight, G.day - 1); Sfx.play('down'); }
  } else G.overT = 0;

  updateCamera(dt);
}

function separate() {
  const E = G.enemies, P = G.players;
  for (let i = 0; i < E.length; i++) {
    const a = E[i];
    if (a.state === 'dying' || a.state === 'cling') continue;
    for (let j = i + 1; j < E.length; j++) {
      const b = E[j];
      if (b.state === 'dying' || b.state === 'cling') continue;
      const dx = b.x - a.x, dy = b.y - a.y, R = a.r + b.r, d2 = dx * dx + dy * dy;
      if (d2 >= R * R || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), o = (R - d) / d, wa = b.mass / (a.mass + b.mass), wb = 1 - wa;
      a.x -= dx * o * wa; a.y -= dy * o * wa; b.x += dx * o * wb; b.y += dy * o * wb;
    }
    for (const p of P) {
      if (p.state === 'dead' || p.state === 'roll') continue;
      const dx = p.x - a.x, dy = p.y - a.y, R = a.r + p.r, d2 = dx * dx + dy * dy;
      if (d2 >= R * R || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), o = (R - d) / d, wp = a.mass / (a.mass + 1.2);
      p.x += dx * o * wp; p.y += dy * o * wp; a.x -= dx * o * (1 - wp); a.y -= dy * o * (1 - wp);
    }
  }
  const [a, b] = P;
  if (a.state !== 'dead' && b.state !== 'dead') {
    const dx = b.x - a.x, dy = b.y - a.y, R = a.r + b.r, d2 = dx * dx + dy * dy;
    if (d2 < R * R && d2 > 1e-6) { const d = Math.sqrt(d2), o = (R - d) / d / 2; a.x -= dx * o; a.y -= dy * o; b.x += dx * o; b.y += dy * o; }
  }
}
