'use strict';
// ---------- Мир: карта, препятствия, постройки, навигация ----------
const WORLD_W = 2560, WORLD_H = 1920, CELL = 32;
const GW = WORLD_W / CELL, GH = WORLD_H / CELL;
const WALL_H = 52; // визуальная высота стен (как в art/*.svg)

const World = {
  walls: [], trees: [], bushes: [], cars: [], structs: [], floors: [], roads: [],
  fire: null, house: null, lantern: null, lootSpots: [], spawnRing: [],
};

// Постройки (разрушаемые/интерактивные):
// door, window, barricade, furn (мебель: crate/cabinet/table), loot (ящик с припасами), trap
function makeStruct(kind, x, y, w, h, o = {}) {
  const s = Object.assign({
    kind, x, y, w, h, hp: 100, maxHp: 100, solid: true, low: false,
    open: false, broken: false, carried: false, hinge: 0, flash: 0, sub: '',
  }, o);
  s.maxHp = s.maxHp || s.hp;
  World.structs.push(s);
  return s;
}

const STRUCT_HP = { door: 160, window: 70, barricade: 90, loot: 30 };
const FURN = {
  crate: { w: 40, h: 36, hp: 90, H: 30 },
  cabinet: { w: 56, h: 22, hp: 120, H: 52 },
  table: { w: 64, h: 36, hp: 80, H: 24 },
};

// Стена с проёмами. gaps: [{at, len, kind}] — смещения вдоль стены
function addWall(x, y, w, h, gaps, opts = {}) {
  const horiz = w >= h, total = horiz ? w : h;
  gaps = (gaps || []).slice().sort((a, b) => a.at - b.at);
  let cur = 0;
  const seg = (a, b) => {
    if (b - a <= 0) return;
    World.walls.push(horiz ? { x: x + a, y, w: b - a, h, ruin: !!opts.ruin } : { x, y: y + a, w, h: b - a, ruin: !!opts.ruin });
  };
  for (const g of gaps) {
    seg(cur, g.at);
    const gx = horiz ? x + g.at : x, gy = horiz ? y : y + g.at;
    const gw = horiz ? g.len : w, gh = horiz ? h : g.len;
    if (g.kind === 'door') makeStruct('door', gx, gy, gw, gh, { hp: STRUCT_HP.door, horiz });
    else if (g.kind === 'window') makeStruct('window', gx, gy, gw, gh, { hp: STRUCT_HP.window, horiz });
    cur = g.at + g.len;
  }
  seg(cur, total);
}

function addFurn(sub, x, y) {
  const f = FURN[sub];
  return makeStruct('furn', x, y, f.w, f.h, { sub, hp: f.hp, low: true, H: f.H });
}
function addLoot(x, y) { return makeStruct('loot', x - 15, y - 13, 30, 26, { hp: STRUCT_HP.loot, low: true }); }

function buildWorld() {
  World.walls = []; World.trees = []; World.bushes = []; World.cars = []; World.structs = [];
  World.floors = []; World.roads = []; World.lootSpots = [];
  const rng = mulberry32(20261120);
  const T = 16;

  // ---- Дом-база (выровнен по сетке 32) ----
  const hx = 1088, hy = 832, hw = 320, hh = 256;
  World.house = { x: hx, y: hy, w: hw, h: hh };
  World.floors.push({ x: hx, y: hy, w: hw, h: hh, kind: 'wood' });
  addWall(hx, hy, hw, T, [{ at: 64, len: 32, kind: 'window' }, { at: 224, len: 32, kind: 'window' }]);
  addWall(hx, hy + hh - T, hw, T, [{ at: 128, len: 64, kind: 'door' }]);
  addWall(hx, hy + T, T, hh - 2 * T, [{ at: 80, len: 32, kind: 'window' }]);
  addWall(hx + hw - T, hy + T, T, hh - 2 * T, [{ at: 80, len: 64, kind: 'door' }]);
  World.lantern = { x: hx + hw / 2, y: hy + hh / 2 - 10 };
  addFurn('cabinet', hx + 24, hy + 24);
  addFurn('crate', hx + 260, hy + 30);
  addFurn('table', hx + 128, hy + 100);
  addFurn('crate', hx + 30, hy + 180);
  World.workbench = { x: hx + 230, y: hy + 180, w: 64, h: 30 };
  World.walls.push(Object.assign({ bench: true }, World.workbench));

  // костёр во дворе
  World.fire = { x: hx + hw / 2, y: hy + hh + 112, r: 24 };

  // ---- Дорога и брошенные машины ----
  World.roads.push({ x: 0, y: 1488, w: WORLD_W, h: 80 });
  World.cars.push({ x: 640, y: 1500, w: 112, h: 50, v: 0 });
  World.cars.push({ x: 1568, y: 1510, w: 112, h: 50, v: 1 });
  World.cars.push({ x: 2176, y: 1496, w: 112, h: 50, v: 2 });

  // ---- Руины с припасами ----
  const ruins = [
    { x: 352, y: 384, w: 288, h: 224 },
    { x: 1856, y: 448, w: 320, h: 224 },
    { x: 448, y: 1088, w: 256, h: 192 },
    { x: 1856, y: 1120, w: 288, h: 192 },
    { x: 1152, y: 288, w: 224, h: 160 },
  ];
  World.ruins = ruins;
  for (const r of ruins) {
    World.floors.push({ x: r.x, y: r.y, w: r.w, h: r.h, kind: 'stone' });
    const gaps = (off) => {
      const g = [];
      const n = 1 + (rng() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) g.push({ at: off + 32 + Math.floor(rng() * 4) * 32 + i * 96, len: 64 + (rng() < 0.4 ? 32 : 0), kind: 'gap' });
      return g.filter((a, i, arr) => i === 0 || a.at > arr[i - 1].at + arr[i - 1].len);
    };
    const cut = (gs, total) => gs.filter((g) => g.at + g.len < total - 16);
    addWall(r.x, r.y, r.w, T, cut(gaps(0), r.w), { ruin: true });
    addWall(r.x, r.y + r.h - T, r.w, T, cut(gaps(0), r.w), { ruin: true });
    addWall(r.x, r.y + T, T, r.h - 2 * T, cut(gaps(16), r.h - 2 * T), { ruin: true });
    addWall(r.x + r.w - T, r.y + T, T, r.h - 2 * T, cut(gaps(16), r.h - 2 * T), { ruin: true });
    World.lootSpots.push({ x: r.x + 60, y: r.y + 60 }, { x: r.x + r.w - 60, y: r.y + r.h - 56 }, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
    addFurn(rng() < 0.5 ? 'crate' : 'table', r.x + r.w / 2 - 70, r.y + r.h / 2 + 10);
  }
  // точки припасов в лесу
  for (let i = 0; i < 40 && World.lootSpots.filter((s) => s.forest).length < 10; i++) {
    const x = 200 + rng() * (WORLD_W - 400), y = 200 + rng() * (WORLD_H - 400);
    if (dist(x, y, World.fire.x, World.fire.y) > 420) World.lootSpots.push({ x, y, forest: true });
  }

  // ---- Деревья ----
  const avoid = [
    { x: hx - 180, y: hy - 140, w: hw + 360, h: hh + 380 },
    { x: 0, y: 1470, w: WORLD_W, h: 120 },
  ];
  for (const r of ruins) avoid.push({ x: r.x - 60, y: r.y - 80, w: r.w + 120, h: r.h + 140 });
  for (const s of World.lootSpots) if (s.forest) avoid.push({ x: s.x - 50, y: s.y - 50, w: 100, h: 100 });
  const okTree = (x, y, md) => {
    for (const a of avoid) if (x > a.x && x < a.x + a.w && y > a.y && y < a.y + a.h) return false;
    for (const t of World.trees) if (dist2(x, y, t.x, t.y) < md * md) return false;
    return true;
  };
  // плотная кромка леса по краю карты
  for (let i = 0; i < 900 && World.trees.length < 150; i++) {
    const side = Math.floor(rng() * 4);
    let x, y;
    if (side === 0) { x = rng() * WORLD_W; y = 20 + rng() * 120; }
    else if (side === 1) { x = rng() * WORLD_W; y = WORLD_H - 20 - rng() * 100; }
    else if (side === 2) { x = 20 + rng() * 120; y = rng() * WORLD_H; }
    else { x = WORLD_W - 20 - rng() * 120; y = rng() * WORLD_H; }
    if (okTree(x, y, 62)) World.trees.push({ x, y, r: 15, v: Math.floor(rng() * 3), s: 0.9 + rng() * 0.3, wood: 3, shake: 0 });
  }
  // рощи внутри
  for (let i = 0; i < 2500 && World.trees.length < 290; i++) {
    const x = 160 + rng() * (WORLD_W - 320), y = 160 + rng() * (WORLD_H - 320);
    if (okTree(x, y, 78)) World.trees.push({ x, y, r: 15, v: rng() < 0.15 ? 3 : Math.floor(rng() * 3), s: 0.85 + rng() * 0.35, wood: 3, shake: 0 });
  }
  for (let i = 0; i < 70; i++) {
    const x = 100 + rng() * (WORLD_W - 200), y = 100 + rng() * (WORLD_H - 200);
    if (okTree(x, y, 40)) World.bushes.push({ x, y, v: Math.floor(rng() * 3) });
  }

  buildStaticGrid();
}

// ---------- Навигация (поле потоков по сетке) ----------
const Nav = {
  blocked: new Uint8Array(GW * GH),
  cost: new Float32Array(GW * GH),
  dist: new Float32Array(GW * GH),
  sref: new Array(GW * GH).fill(null),
  heap: new MinHeap(),
};

function buildStaticGrid() {
  const B = Nav.blocked; B.fill(0);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const i = gy * GW + gx, x = gx * CELL, y = gy * CELL;
    if (gx === 0 || gy === 0 || gx === GW - 1 || gy === GH - 1) { B[i] = 1; continue; }
    let b = false;
    for (const w of World.walls) if (rectsOverlap(x + 1, y + 1, CELL - 2, CELL - 2, w.x, w.y, w.w, w.h)) { b = true; break; }
    if (!b) for (const c of World.cars) if (rectsOverlap(x + 1, y + 1, CELL - 2, CELL - 2, c.x, c.y, c.w, c.h)) { b = true; break; }
    if (!b) for (const t of World.trees) if (distToRect(t.x, t.y, x, y, CELL, CELL) < t.r - 2) { b = true; break; }
    if (!b && distToRect(World.fire.x, World.fire.y, x, y, CELL, CELL) < World.fire.r - 2) b = true;
    B[i] = b ? 1 : 0;
  }
}

const cellOf = (x, y) => clamp(Math.floor(y / CELL), 0, GH - 1) * GW + clamp(Math.floor(x / CELL), 0, GW - 1);

function computeFlow(targets) {
  const N = GW * GH, C = Nav.cost, D = Nav.dist, S = Nav.sref, B = Nav.blocked;
  for (let i = 0; i < N; i++) { C[i] = B[i] ? Infinity : 1; S[i] = null; D[i] = Infinity; }
  for (const s of World.structs) {
    if (s.carried) continue;
    if (s.kind === 'trap') {
      eachCell(s, (i) => { if (!B[i]) C[i] += 2; });
      continue;
    }
    if (!s.solid) continue;
    const add = s.kind === 'loot' ? 3 : 3 + s.hp / 14;
    eachCell(s, (i) => { if (!B[i]) { C[i] = Math.max(C[i], 1 + add); S[i] = s; } });
  }
  const H = Nav.heap; H.clear();
  for (const t of targets) { const i = cellOf(t.x, t.y); if (D[i] > 0) { D[i] = 0; H.push(0, i); } }
  while (H.size) {
    const i = H.pop(), d = D[i], gx = i % GW, gy = (i / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const j = ny * GW + nx;
      if (C[j] === Infinity) continue;
      if (dx && dy && (B[gy * GW + nx] || B[ny * GW + gx])) continue;
      const nd = d + C[j] * (dx && dy ? 1.414 : 1);
      if (nd < D[j]) { D[j] = nd; H.push(nd, j); }
    }
  }
}

function eachCell(s, fn) {
  const x0 = Math.max(0, Math.floor(s.x / CELL)), x1 = Math.min(GW - 1, Math.floor((s.x + s.w - 0.01) / CELL));
  const y0 = Math.max(0, Math.floor(s.y / CELL)), y1 = Math.min(GH - 1, Math.floor((s.y + s.h - 0.01) / CELL));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(y * GW + x);
}

// Следующая клетка по полю потоков: {x,y, s(препятствие)} или null
function flowStep(x, y) {
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL), D = Nav.dist, B = Nav.blocked;
  const ci = gy * GW + gx;
  let best = D[ci], bi = -1;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = gx + dx, ny = gy + dy;
    if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
    if (dx && dy && (B[gy * GW + nx] || B[ny * GW + gx])) continue;
    const j = ny * GW + nx;
    if (D[j] < best) { best = D[j]; bi = j; }
  }
  if (bi < 0) return null;
  return { x: (bi % GW) * CELL + CELL / 2, y: ((bi / GW) | 0) * CELL + CELL / 2, s: Nav.sref[bi] || Nav.sref[ci] };
}

// Прямая видимость по сетке (стены + твёрдые постройки)
function lineClear(ax, ay, bx, by) {
  const d = dist(ax, ay, bx, by), n = Math.ceil(d / 14);
  for (let k = 1; k < n; k++) {
    const t = k / n, i = cellOf(ax + (bx - ax) * t, ay + (by - ay) * t);
    if (Nav.blocked[i] || Nav.sref[i]) return false;
  }
  return true;
}

// ---------- Столкновения ----------
function collideWorld(o, r, ignoreLow) {
  for (const w of World.walls) pushCircleRect(o, r, w.x, w.y, w.w, w.h);
  for (const c of World.cars) pushCircleRect(o, r, c.x, c.y, c.w, c.h);
  for (const t of World.trees) {
    if (Math.abs(o.x - t.x) < r + t.r && Math.abs(o.y - t.y) < r + t.r) pushCircleCircle(o, r, t.x, t.y, t.r);
  }
  pushCircleCircle(o, r, World.fire.x, World.fire.y, World.fire.r);
  for (const s of World.structs) {
    if (!s.solid || s.carried || (ignoreLow && s.low)) continue;
    pushCircleRect(o, r, s.x, s.y, s.w, s.h);
  }
  o.x = clamp(o.x, CELL + r, WORLD_W - CELL - r);
  o.y = clamp(o.y, CELL + r, WORLD_H - CELL - r);
}

// Можно ли поставить прямоугольник (для баррикад, мебели, ловушек)
function canPlace(x, y, w, h, ignore, solidOnly = true) {
  if (x < CELL || y < CELL || x + w > WORLD_W - CELL || y + h > WORLD_H - CELL) return false;
  for (const wl of World.walls) if (rectsOverlap(x, y, w, h, wl.x, wl.y, wl.w, wl.h)) return false;
  for (const c of World.cars) if (rectsOverlap(x, y, w, h, c.x, c.y, c.w, c.h)) return false;
  for (const t of World.trees) if (distToRect(t.x, t.y, x, y, w, h) < t.r) return false;
  if (distToRect(World.fire.x, World.fire.y, x, y, w, h) < World.fire.r + 4) return false;
  for (const s of World.structs) {
    if (s === ignore || s.carried) continue;
    if (solidOnly && !s.solid && s.kind !== 'door' && s.kind !== 'window' && s.kind !== 'trap') continue;
    if (rectsOverlap(x, y, w, h, s.x, s.y, s.w, s.h)) return false;
  }
  for (const p of G.players) if (p.state !== 'dead' && distToRect(p.x, p.y, x, y, w, h) < p.r - 2) return false;
  for (const e of G.enemies) if (!e.dead && distToRect(e.x, e.y, x, y, w, h) < e.r - 2) return false;
  return true;
}

function freeSpot(x, y, r) {
  const o = { x, y };
  collideWorld(o, r, false);
  return Math.abs(o.x - x) < 0.5 && Math.abs(o.y - y) < 0.5;
}
