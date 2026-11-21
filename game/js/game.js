'use strict';
// ---------- Состояние игры, день/ночь, волны, камера ----------
const VIEW_H = 620;
const ZOOM_MIN = 0.62;
const DAY_LEN = 140, DUSK_LEN = 20, NIGHT_LEN = 85;

const G = {
  state: 'title', t: 0, day: 1, phase: 'day', phaseT: 0,
  team: {}, players: [], enemies: [], items: [], pickups: [], projs: [], parts: [], texts: [], stains: [], msgs: [],
  tracers: [], flashes: [], eprojs: [], webs: [], fires: [], waves: [], bolts: [], allies: [], bombs: [], slowT: 0, ambT: 3,
  spawnQ: [], kills: 0, cam: { x: 2368, y: 1900, zoom: 1 }, shake: 0, hitstop: 0, flowT: 0, flowDirty: true, overT: 0,
  paused: false, showFps: true, quality: 1, bestNight: 0, zoneShown: {},
};

function msg(text, col = '#f2e6c8') {
  G.msgs.push({ text, col, t: 4 });
  if (G.msgs.length > 4) G.msgs.shift();
}

function newGame() {
  buildWorld();
  const f = World.fire;
  Object.assign(G, { t: 0, day: 1, phase: 'day', phaseT: 0, kills: 0, overT: 0, zoneShown: {} });
  G.team = { wood: 4, scrap: 2, cloth: 1, fuel: 1, ammo: 0, band: 1, food: 2 };
  G.players = [makePlayer(0, f.x - 50, f.y - 50), makePlayer(1, f.x + 50, f.y - 50)];
  G.players[1].weapon = { type: 'pipe', dur: WEAPONS.pipe.durab };
  for (const k of ['enemies', 'items', 'pickups', 'projs', 'parts', 'texts', 'stains', 'msgs', 'spawnQ', 'tracers', 'flashes', 'eprojs', 'webs', 'fires', 'waves', 'bolts', 'allies', 'bombs']) G[k] = [];
  G.cam.x = f.x; G.cam.y = f.y - 80; G.cam.zoom = 1;
  G.flowDirty = true;
  // подручные предметы и находки
  const rng = mulberry32(7);
  const h = World.house;
  const put = (cat, kind, x, y) => G.items.push(cat === 'w' ? { cat, type: kind, dur: WEAPONS[kind].durab, x, y, held: false, fly: false } : { cat, kind, x, y, held: false, fly: false });
  put('t', 'brick', h.x + 100, h.y + h.h + 50); put('t', 'bottle', h.x + 220, h.y + h.h + 60); put('t', 'brick', h.x + 60, h.y + 60);
  put('w', 'knife', h.x + 150, h.y + 70);
  for (const r of World.ruins) for (let i = 0; i < 2; i++) put('t', rng() < 0.5 ? 'brick' : 'bottle', r.x + 40 + rng() * (r.w - 80), r.y + 40 + rng() * (r.h - 80));
  put('w', 'axe', 1330, 2700); put('w', 'sledge', 3700, 2700); put('w', 'crowbar', 3420, 520); put('w', 'pipe', 4500, 3100); put('w', 'shotgun', 760, 560); put('w', 'pistol', 4200, 520);
  put('t', 'molotov', 3700, 1300); put('t', 'bottle', 3300, 1150); put('t', 'brick', 3500, 2900);
  rebuildDynamic();
  respawnLoot(true);
  rebuildDynamic();
  spawnDayNatives();
  msg('День 1. Исследуйте окрестности и вернитесь к дому у костра до темноты', '#f2e6c8');
  msg('Обыскивайте шкафы и машины, бейте ящики и деревья. Город — на северо-востоке', '#cfc3a2');
  G.state = 'play';
}

function respawnLoot(all) {
  const have = World.structs.filter((s) => s.kind === 'loot').length;
  const spots = World.lootSpots.slice().sort(() => Math.random() - 0.5);
  let n = 30 - have;
  for (const sp of spots) {
    if (n <= 0) break;
    if (!canPlace(sp.x - 15, sp.y - 13, 30, 26, null, false)) continue;
    addLoot(sp.x, sp.y); n--;
  }
  if (!all) {
    for (const t of World.trees) t.wood = 3;
    for (const p of World.props) if (p.searched && G.day - p.searched >= 3) p.searched = 0;
  }
}

function randomPointIn(z, minD) {
  for (let k = 0; k < 40; k++) {
    const x = z.x + 40 + Math.random() * (z.w - 80), y = z.y + 40 + Math.random() * (z.h - 80);
    if (G.players.some((p) => p.state !== 'dead' && dist(x, y, p.x, p.y) < minD)) continue;
    if (freeSpot(x, y, 16) && !Nav.blocked[cellOf(x, y)]) return { x, y };
  }
  return null;
}
// Местные обитатели зон (днём)
function spawnDayNatives() {
  const n = G.day;
  const Z = Object.fromEntries(World.zones.map((z) => [z.id, z]));
  const put = (zone, type, k) => { for (let i = 0; i < k; i++) { const pt = zone === 'forest' ? randomFarPoint(700) : randomPointIn(Z[zone], 500); if (pt) spawnEnemy(type, pt.x, pt.y, false); } };
  const group = (zone, type, k) => { const pt = randomPointIn(Z[zone], 500); if (!pt) return; for (let i = 0; i < k; i++) spawnEnemy(type, pt.x + rand(-40, 40), pt.y + rand(-40, 40), false); };
  put('forest', 'walker', 3 + Math.min(4, n - 1));
  group('town', 'ghoul', 3 + Math.min(3, n)); group('town', 'ghoul', 3); put('town', 'walker', 2);
  put('industrial', 'walker', 3); if (n >= 2) put('industrial', 'brute', 1); put('industrial', 'clinger', 2);
  for (let i = 0; i < 3 + Math.min(3, n); i++) { const f = pick(World.fields); const e = spawnEnemy('spider', f.x + rand(30, f.w - 30), f.y + rand(30, f.h - 30), false); e.home = { x: e.x, y: e.y }; }
  put('lab', 'void', 2 + Math.min(2, n - 1)); put('lab', 'walker', 2);
  if (n >= 3) put('forest', 'jumper', 2);
}
function spawnWolfPack(k) {
  const pt = randomFarPoint(700);
  if (!pt) return;
  for (let i = 0; i < k; i++) spawnEnemy('wolf', pt.x + rand(-50, 50), pt.y + rand(-50, 50), true).aggro = true;
  Sfx.play('howl'); msg('Где-то в лесу воют волки...', '#a8b0d8');
}

function randomFarPoint(minD, edge) {
  for (let k = 0; k < 80; k++) {
    let x, y;
    if (edge) {
      const s = randi(0, 3);
      x = s < 2 ? rand(120, WORLD_W - 120) : (s === 2 ? rand(60, 180) : WORLD_W - rand(60, 180));
      y = s >= 2 ? rand(120, WORLD_H - 120) : (s === 0 ? rand(60, 180) : WORLD_H - rand(60, 180));
    } else { x = rand(150, WORLD_W - 150); y = rand(150, WORLD_H - 150); if (zoneAt(x, y) !== 'forest') continue; }
    let ok = true;
    for (const p of G.players) if (p.state !== 'dead' && dist(x, y, p.x, p.y) < minD) ok = false;
    if (ok && dist(x, y, World.fire.x, World.fire.y) < 600) ok = false;
    if (ok && freeSpot(x, y, 16) && !Nav.blocked[cellOf(x, y)]) return { x, y };
  }
  return null;
}

function planNight(n) {
  const list = [];
  const add = (type, k) => { for (let i = 0; i < k; i++) list.push(type); };
  add('walker', 5 + 2 * n);
  add('clinger', 1 + n);
  if (n >= 2) { add('jumper', 1 + n); add('ghoul', 3 * Math.ceil(n / 2)); }
  if (n >= 3) { add('brute', 1 + Math.floor((n - 3) / 2)); add('spider', n - 2); }
  if (n >= 4) add('void', n - 3);
  list.sort(() => Math.random() - 0.5);
  list.sort((a, b) => (a === 'brute') - (b === 'brute'));
  G.spawnQ = [];
  let t = 2;
  const span = NIGHT_LEN * 0.7;
  for (let i = 0; i < list.length;) {
    const grp = list[i] === 'ghoul' ? 3 : Math.min(list.length - i, randi(2, 3));
    G.spawnQ.push({ t, types: list.slice(i, i + grp) });
    i += grp; t += span / Math.ceil(list.length / 2.5);
  }
  if (n >= 2) G.spawnQ.push({ t: NIGHT_LEN * 0.3, wolves: 2 + Math.floor(n / 2) });
  if (n % 5 === 0) G.spawnQ.push({ t: NIGHT_LEN * 0.4, types: ['titan'], titan: true });
  G.spawnQ.sort((a, b) => a.t - b.t);
}

function updatePhase(dt) {
  G.phaseT += dt;
  if (G.phase === 'day' && G.phaseT >= DAY_LEN) {
    G.phase = 'dusk'; G.phaseT = 0;
    msg('Смеркается! Возвращайтесь к дому и готовьте оборону', '#ffc27a'); Sfx.play('dusk');
    if (World.gen.fuel > 0) { World.gen.on = true; msg('Генератор запущен — прожекторы горят всю ночь', '#d8ffb0'); }
  } else if (G.phase === 'dusk' && G.phaseT >= DUSK_LEN) {
    G.phase = 'night'; G.phaseT = 0;
    planNight(G.day);
    for (const e of G.enemies) e.aggro = true;
    msg(`Ночь ${G.day}. Они идут.`, '#ff8a7a'); Sfx.play('night');
  } else if (G.phase === 'night') {
    while (G.spawnQ.length && G.spawnQ[0].t <= G.phaseT) {
      const s = G.spawnQ.shift();
      if (s.wolves) { spawnWolfPack(s.wolves); continue; }
      const pt = randomFarPoint(700, true);
      if (!pt) continue;
      for (const type of s.types) spawnEnemy(type, pt.x + rand(-30, 30), pt.y + rand(-30, 30), true);
      if (s.titan) { msg('Земля дрожит... идёт Титан!', '#ff6a4a'); Sfx.play('slam'); addShake(10); }
    }
    if (G.phaseT >= NIGHT_LEN) dawn();
  }
}

function dawn() {
  G.bestNight = Math.max(G.bestNight, G.day);
  for (const e of G.enemies) if (!e.dead && e.state !== 'dying' && (e.night || e.type === 'wolf')) {
    if (e.host) { const k = e.host.clingers.indexOf(e); if (k >= 0) e.host.clingers.splice(k, 1); e.host = null; }
    e.state = 'dying'; e.t = 1; burst(e.x, e.y, 20, 8, '#c9b58a', 100, 4, 0.8);
  }
  G.spawnQ = [];
  for (const p of G.players) {
    if (p.state === 'dead') { p.state = 'normal'; p.hp = p.maxHp * 0.5; p.x = World.fire.x + (p.i ? 40 : -40); p.y = World.fire.y - 50; p.inv = 2; msg(`${pname(p)} вернулся к костру`, PAL[p.i].accent); }
    else if (p.state === 'downed') { p.state = 'normal'; p.hp = p.maxHp * 0.3; }
    else p.hp = Math.min(p.maxHp, p.hp + 25);
    giveXP(p, 40 + 10 * G.day);
  }
  if (World.gen.on) { World.gen.fuel--; World.gen.on = false; }
  msg(`Рассвет. Пережито ночей: ${G.day}. +опыт`, '#fff2b0'); Sfx.play('dawn');
  G.day++; G.phase = 'day'; G.phaseT = 0;
  respawnLoot(false);
  if (G.enemies.length < 40) spawnDayNatives();
}

function darkness() {
  if (G.phase === 'day') return G.day > 1 && G.phaseT < 6 ? 0.8 * (1 - G.phaseT / 6) : 0;
  if (G.phase === 'dusk') return 0.55 * (G.phaseT / DUSK_LEN);
  if (G.phase === 'night') return Math.min(0.86, 0.55 + G.phaseT / 4 * 0.31);
  return 0;
}

// ---------- Камера ----------
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
  if (G.slowT > 0) { G.slowT -= dt; dt *= 0.35; }
  G.t += dt;
  G.ambT -= dt;
  if (G.ambT <= 0) { G.ambT = rand(2.5, 6); Sfx.play(G.phase === 'day' ? 'bird' : G.phase === 'night' ? (Math.random() < 0.5 ? 'cricket' : 'wind') : 'cricket'); }
  G.shake = Math.max(0, G.shake - dt * 30);
  for (const m of G.msgs) m.t -= dt;
  G.msgs = G.msgs.filter((m) => m.t > 0);
  // буфер ввода: нажатие запоминается на 0.25 с (не теряется в «стоп-кадре» и в конце приёма)
  for (const p of G.players) {
    const c = Input.ctrls[p.i];
    p.buf = p.buf || {};
    for (const a of ['light', 'heavy', 'roll', 'ab1', 'ab2', 'ab3']) { if (c.pressed[a]) p.buf[a] = 0.25; else if (p.buf[a] > 0) p.buf[a] -= dt; }
  }
  if (G.hitstop > 0) { G.hitstop -= dt; return; }

  updatePhase(dt);
  rebuildDynamic();
  G.flowT -= dt;
  if (G.flowT <= 0 || G.flowDirty) {
    let tg = G.players.filter(alive);
    if (!tg.length) tg = G.players.filter((p) => p.state !== 'dead');
    computeFlow(tg);
    G.flowT = 0.4; G.flowDirty = false;
  }
  for (const p of G.players) updatePlayer(p, Input.ctrls[p.i], dt);
  // монстры далеко от игроков «спят» — экономия для слабых ПК
  for (const e of G.enemies) {
    if (e.state === 'held' || e.state === 'thrownE') { updateEnemy(e, dt); continue; }
    if (!e.aggro && e.state === 'move' && !G.players.some((p) => Math.abs(p.x - e.x) < 1100 && Math.abs(p.y - e.y) < 800)) continue;
    updateEnemy(e, dt);
  }
  separate();
  leash();
  for (const p of G.players) if (p.state !== 'dead') collideWorld(p, p.r, null);
  G.enemies = G.enemies.filter((e) => !e.dead);
  updateProjs(dt);
  updateHazards(dt);
  updateAllies(dt);
  updatePickups(dt);
  updateParts(dt);
  for (const s of World.structs) {
    s.flash -= dt;
    if (s.kind === 'furn' && !s.solid && !s.carried && canPlace(s.x, s.y, s.w, s.h, s)) { s.solid = true; s.ghost = 0; G.flowDirty = true; }
  }
  for (const t of World.trees) if (t.shake > 0) t.shake -= dt;
  // подсказка о зоне
  for (const p of G.players) if (alive(p)) {
    const z = zoneAt(p.x, p.y);
    if (z !== 'forest' && !G.zoneShown[z]) { G.zoneShown[z] = 1; const Z = World.zones.find((q) => q.id === z); msg(`${Z.name}`, '#f2e6c8'); }
  }
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
    if (a.state === 'dying' || a.state === 'cling' || a.state === 'held' || a.state === 'thrownE') continue;
    for (let j = i + 1; j < E.length; j++) {
      const b = E[j];
      if (b.state === 'dying' || b.state === 'cling' || b.state === 'held' || b.state === 'thrownE') continue;
      const dx = b.x - a.x, dy = b.y - a.y, R = a.r + b.r;
      if (dx > R || dx < -R || dy > R || dy < -R) continue;
      const d2 = dx * dx + dy * dy;
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
