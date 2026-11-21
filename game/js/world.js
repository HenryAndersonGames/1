'use strict';
// ---------- Мир: зоны, здания, препятствия, навигация, столкновения ----------
const WORLD_W = 6400, WORLD_H = 4800, CELL = 32;
const GW = WORLD_W / CELL, GH = WORLD_H / CELL;
const WALL_H = 52; // высота стен (как в art/*.svg)

const World = {
  walls: [], trees: [], bushes: [], props: [], structs: [], floors: [], roads: [], decals: [], zones: [],
  fire: null, house: null, lantern: null, gen: null, lootSpots: [], ruins: [],
};

// ----- Постройки (динамические, разрушаемые) -----
const STRUCT_HP = { door: 160, window: 70, barricade: 90, loot: 30, locked: 220 };
const FURN = {
  crate: { w: 40, h: 36, hp: 90, H: 30 },
  cabinet: { w: 56, h: 22, hp: 120, H: 52, str: 1 },
  table: { w: 64, h: 36, hp: 80, H: 24 },
  sofa: { w: 64, h: 30, hp: 120, H: 26, str: 1 },
  bed: { w: 40, h: 64, hp: 100, H: 16, str: 1 },
};
function makeStruct(kind, x, y, w, h, o = {}) {
  const s = Object.assign({ kind, x, y, w, h, hp: 100, maxHp: 100, solid: true, low: false, open: false, broken: false, carried: false, flash: 0, sub: '' }, o);
  s.maxHp = o.maxHp || s.hp;
  World.structs.push(s);
  return s;
}
function addFurn(sub, x, y) { const f = FURN[sub]; return makeStruct('furn', x, y, f.w, f.h, { sub, hp: f.hp, low: true, H: f.H }); }
function addLoot(x, y, zone) { return makeStruct('loot', x - 15, y - 13, 30, 26, { hp: STRUCT_HP.loot, low: true, zone: zone || zoneAt(x, y) }); }

// ----- Неподвижные предметы окружения -----
const PROPS = {
  lamp: { w: 10, h: 8, cx: true, light: 1 }, bin: { w: 24, h: 18, search: 1 }, barrel: { w: 22, h: 16, explosive: 1 }, barrel2: { w: 22, h: 16 },
  pallets: { w: 40, h: 20, low: 1 }, container0: { w: 128, h: 52, tall: 56 }, container1: { w: 128, h: 52, tall: 56 },
  shelf: { w: 64, h: 20, search: 1, tall: 50 }, fridge: { w: 30, h: 24, search: 1, tall: 54 }, counter: { w: 64, h: 24, search: 1 }, gaspump: { w: 24, h: 20, search: 1, fuel: 1 },
  hay: { w: 40, h: 26, low: 1 }, corn0: { w: 0, h: 0, cx: true, hide: 1, nosolid: 1 }, corn1: { w: 0, h: 0, cx: true, hide: 1, nosolid: 1 },
  scarecrow: { w: 8, h: 8, cx: true }, tractor: { w: 96, h: 52 }, well: { w: 40, h: 30 }, labtable: { w: 64, h: 28, search: 1 },
  capsule: { w: 32, h: 26 }, capsule_broken: { w: 32, h: 26 }, rack: { w: 32, h: 20, search: 1, tall: 60 },
  growth0: { w: 0, h: 0, cx: true, nosolid: 1 }, growth1: { w: 0, h: 0, cx: true, nosolid: 1 }, sign: { w: 0, h: 0, cx: true, nosolid: 1 },
  generator: { w: 48, h: 32 }, flood: { w: 8, h: 8, cx: true }, cratestack: { w: 40, h: 36, search: 1 }, locker: { w: 28, h: 20, search: 1, tall: 54 },
  bench: { w: 64, h: 30, bench: 1 }, car0: { w: 112, h: 50, car: 1, search: 1 }, car1: { w: 112, h: 50, car: 1, search: 1 }, car2: { w: 112, h: 50, car: 1, search: 1 },
};
// прочность предметов: всё, что мешает пройти, можно разбить (генератор и прожекторы базы — нет)
const PROP_HP = { bin: 40, barrel2: 60, pallets: 50, container0: 700, container1: 700, shelf: 110, fridge: 140, counter: 110, gaspump: 160, hay: 40,
  scarecrow: 30, tractor: 480, well: 320, labtable: 110, capsule: 140, capsule_broken: 90, rack: 100, cratestack: 80, locker: 110, bench: 70, car0: 420, car1: 420, car2: 420, lamp: 60 };
const PROP_METAL = new Set(['bin', 'barrel2', 'container0', 'container1', 'fridge', 'gaspump', 'tractor', 'capsule', 'capsule_broken', 'rack', 'locker', 'car0', 'car1', 'car2', 'lamp']);
function addProp(spr, x, y, o = {}) {
  const d = PROPS[spr];
  const p = Object.assign({ spr, x, y, w: d.w, h: d.h, solid: !d.nosolid, low: !!d.low, cx: !!d.cx, search: !!d.search, explosive: !!d.explosive,
    hide: !!d.hide, tall: d.tall || 0, car: !!d.car, bench: !!d.bench, hp: d.explosive ? 20 : (PROP_HP[spr] || 0), searched: 0 }, o);
  p.maxHp = p.hp;
  if (p.cx) { p.x = x - p.w / 2; p.y = y - p.h / 2; p.ox = x; p.oy = y; }
  p.zone = zoneAt(x, y);
  World.props.push(p);
  return p;
}

// ----- Зоны -----
const ZONES = [
  { id: 'town', name: 'Город', x: 3136, y: 160, w: 1600, h: 1344 },
  { id: 'industrial', name: 'Промзона', x: 3328, y: 2400, w: 1408, h: 1056 },
  { id: 'farm', name: 'Ферма', x: 192, y: 2432, w: 1760, h: 1024 },
  { id: 'lab', name: 'Лаборатория', x: 192, y: 192, w: 1600, h: 1120 },
  { id: 'village', name: 'Посёлок', x: 5056, y: 256, w: 1216, h: 1536 },
  { id: 'depot', name: 'Автобаза', x: 4992, y: 2624, w: 1280, h: 1856 },
  { id: 'camp', name: 'Заброшенный лагерь', x: 640, y: 3904, w: 1792, h: 704 },
];
function zoneAt(x, y) {
  for (const z of World.zones) if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z.id;
  return 'forest';
}

// ----- Стены с проёмами -----
function addWall(x, y, w, h, gaps, style) {
  const horiz = w >= h, total = horiz ? w : h;
  gaps = (gaps || []).slice().sort((a, b) => a.at - b.at);
  let cur = 0;
  const seg = (a, b) => { if (b - a > 0) World.walls.push(horiz ? { x: x + a, y, w: b - a, h, style } : { x, y: y + a, w, h: b - a, style }); };
  for (const g of gaps) {
    seg(cur, g.at);
    const gx = horiz ? x + g.at : x, gy = horiz ? y : y + g.at, gw = horiz ? g.len : w, gh = horiz ? h : g.len;
    if (g.kind === 'door') makeStruct('door', gx, gy, gw, gh, { hp: g.locked ? STRUCT_HP.locked : STRUCT_HP.door, horiz, locked: !!g.locked });
    else if (g.kind === 'window') makeStruct('window', gx, gy, gw, gh, { hp: STRUCT_HP.window, horiz });
    cur = g.at + g.len;
  }
  seg(cur, total);
}
// Здание: двери/окна задаются абсолютной координатой вдоль стены (кратной 32)
function building(x, y, w, h, style, floor, open = {}) {
  const T = 16;
  World.floors.push({ x, y, w, h, kind: floor });
  const conv = (list, side) => (list || []).map((o) => {
    const len = o.kind === 'door' ? 64 : 32;
    const at = side === 'n' || side === 's' ? o.at - x : o.at - (y + T);
    return { at, len, kind: o.kind, locked: o.locked };
  });
  const by = (side) => (open[side] || []);
  addWall(x, y, w, T, conv(by('n'), 'n'), style);
  addWall(x, y + h - T, w, T, conv(by('s'), 's'), style);
  addWall(x, y + T, T, h - 2 * T, conv(by('w'), 'w'), style);
  addWall(x + w - T, y + T, T, h - 2 * T, conv(by('e'), 'e'), style);
}
const D = (at, locked) => ({ kind: 'door', at, locked });
const Wn = (at) => ({ kind: 'window', at });

function fenceLine(x0, y0, x1, y1, style, gaps = []) {
  const horiz = y0 === y1, T = 8;
  if (horiz) addWall(x0, y0, x1 - x0, T, gaps.map((g) => ({ at: g[0] - x0, len: g[1] - g[0], kind: 'gap' })), style);
  else addWall(x0, y0, T, y1 - y0, gaps.map((g) => ({ at: g[0] - y0, len: g[1] - g[0], kind: 'gap' })), style);
}

function buildWorld() {
  Object.assign(World, { walls: [], trees: [], bushes: [], props: [], structs: [], floors: [], roads: [], decals: [], lootSpots: [], ruins: [] });
  World.zones = ZONES;
  const rng = mulberry32(20261121);
  const T = 16;
  const deco = (spr, x, y, s = 1) => World.decals.push({ spr, x, y, s });

  // ===== Дороги =====
  World.roads.push({ x: 2592, y: 320, w: 64, h: 3136, kind: 'dirt' });
  World.roads.push({ x: 160, y: 2208, w: 6144, h: 64, kind: 'dirt' });
  World.roads.push({ x: 1088, y: 1280, w: 64, h: 1184, kind: 'dirt' });
  World.roads.push({ x: 3616, y: 2272, w: 64, h: 160, kind: 'dirt' });
  World.floors.push({ x: 2656, y: 768, w: 2080, h: 96, kind: 'asphalt', road: 1 });
  World.floors.push({ x: 3872, y: 160, w: 96, h: 1344, kind: 'asphalt', road: 1 });

  // ===== База: дом в лесу =====
  const hx = 2112, hy = 1568, hw = 448, hh = 352;
  World.house = { x: hx, y: hy, w: hw, h: hh };
  building(hx, hy, hw, hh, 'wood', 'wood', { n: [Wn(2208), Wn(2432)], s: [D(2304)], w: [Wn(1728)], e: [D(1728)] });
  // перегородка: спальня справа, проход 64
  World.lantern = { x: hx + hw / 2, y: hy + hh / 2 - 10 };
  addWall(hx + 288, hy + 16, 16, hh - 32, [{ at: 96, len: 96, kind: 'gap' }], 'wood');
  addFurn('cabinet', hx + 24, hy + 24); addFurn('crate', hx + 104, hy + 30); addFurn('table', hx + 112, hy + 130); addFurn('crate', hx + 30, hy + 250);
  addFurn('bed', hx + 370, hy + 28); addFurn('cabinet', hx + 330, hy + 270); addFurn('sofa', hx + 150, hy + 262);
  World.bench = addProp('bench', hx + 196, hy + 40);
  World.fire = { x: hx + hw / 2, y: hy + hh + 112, r: 24 };
  World.gen = addProp('generator', hx + hw + 20, hy + 40);
  World.gen.fuel = 0; World.gen.on = false;
  World.floods = [addProp('flood', hx - 40, hy + hh + 40), addProp('flood', hx + hw + 40, hy + hh + 40)];

  // ===== Город =====
  building(3168, 256, 320, 352, 'brick', 'tile', { s: [D(3296)] });
  World.shop = { x: 3520, y: 224, w: 352, h: 416 };
  building(3520, 224, 352, 416, 'brick', 'tile', { s: [D(3648)] });
  building(4000, 256, 320, 384, 'brick', 'tile', { s: [D(4128, true)] });
  building(4384, 256, 320, 384, 'metal', 'concrete', { s: [D(4512)] });
  building(3200, 1024, 320, 320, 'wood', 'wood', { n: [D(3328)], e: [Wn(1088)], w: [Wn(1120)] });
  building(3616, 1216, 256, 224, 'brick', 'tile', { n: [D(3712)] });
  building(4032, 1056, 352, 320, 'brick', 'wood', { n: [D(4160)] });
  building(4416, 1088, 288, 288, 'wood', 'wood', { n: [D(4480)], w: [Wn(1168)] });
  World.floors.push({ x: 3520, y: 960, w: 352, h: 224, kind: 'asphalt' });
  // интерьеры
  for (let i = 0; i < 3; i++) addProp('shelf', 3552 + (i % 2) * 120, 400 + i * 64);
  addProp('shelf', 3760, 400); addProp('counter', 3744, 560); addProp('fridge', 3540, 590);
  addProp('shelf', 4064, 420); addProp('shelf', 4176, 420); addProp('counter', 4200, 560); addProp('locker', 4060, 560);
  addProp('locker', 4410, 420); addProp('cratestack', 4600, 420); addProp('barrel', 4420, 580); addProp('barrel', 4446, 586);
  addFurn('sofa', 3240, 420); addFurn('bed', 3420, 420); addFurn('table', 3300, 520); addProp('fridge', 3218, 540);
  addFurn('bed', 3260, 1070); addFurn('sofa', 3360, 1160); addProp('fridge', 3440, 1060);
  addProp('counter', 3680, 1300); addProp('shelf', 3700, 1240);
  addFurn('sofa', 4100, 1100); addFurn('table', 4220, 1180); addFurn('bed', 4280, 1080); addProp('fridge', 4300, 1220);
  addFurn('bed', 4430, 1110); addFurn('cabinet', 4520, 1110); addFurn('crate', 4560, 1200);
  addProp('gaspump', 3600, 1020); addProp('gaspump', 3720, 1020);
  // улица
  for (let x = 2720; x < 4700; x += 256) {
    if (Math.abs(x - 3900) < 90) continue;
    const on = rng() < 0.55;
    addProp('lamp', x, 750, { on });
    addProp('lamp', x + 128, 884, { on: rng() < 0.45 });
  }
  addProp('car1', 3000, 790); addProp('car0', 4300, 800); addProp('car2', 3890, 300, {});
  addProp('bin', 3460, 700); addProp('bin', 4000, 690); addProp('bin', 3180, 900); addProp('bin', 4370, 920);
  for (let i = 0; i < 40; i++) deco(pick(['d_paper', 'd_crack', 'd_oil', 'd_puddle', 'd_paper']), 3100 + rng() * 1600, 300 + rng() * 1150);
  deco('d_cone', 3600, 820); deco('d_cone', 3640, 830); deco('d_cone', 4200, 812);

  // ===== Промзона =====
  World.floors.push({ x: 3328, y: 2432, w: 1376, h: 1024, kind: 'concrete' });
  fenceLine(3328, 2432, 4704, 2432, 'fencechain', [[3584, 3712]]);
  fenceLine(3328, 2432, 3328, 3456, 'fencechain', [[2880, 2976]]);
  building(3456, 2560, 512, 320, 'metal', 'concrete', { s: [D(3552), D(3808)], n: [D(3680)] });
  building(4160, 2976, 384, 288, 'metal', 'concrete', { w: [D(3072)], n: [D(4288, true)] });
  for (let i = 0; i < 4; i++) addProp('cratestack', 3500 + i * 56, 2620);
  addProp('pallets', 3740, 2620); addProp('pallets', 3790, 2620); addProp('locker', 3900, 2600); addProp('locker', 3870, 2600);
  addProp('shelf', 3500, 2780); addProp('shelf', 3600, 2780); addProp('barrel', 3880, 2780); addProp('barrel', 3906, 2786); addProp('barrel', 3892, 2808);
  addProp('cratestack', 4200, 3030); addProp('locker', 4480, 3020); addProp('pallets', 4300, 3140); addProp('barrel', 4420, 3180); addProp('barrel', 4446, 3180);
  addProp('container0', 4096, 2496); addProp('container1', 4256, 2496); addProp('container1', 4096, 2592); addProp('container0', 4416, 2624);
  addProp('container0', 3456, 3040); addProp('container1', 3456, 3136); addProp('container0', 3680, 3280);
  for (const [x, y] of [[3420, 2950], [3446, 2960], [4000, 3000], [4026, 3010], [3800, 3200], [4600, 2800]]) addProp('barrel', x, y);
  for (const [x, y] of [[3980, 2960], [3720, 3120], [4620, 2560], [3500, 3380]]) addProp('pallets', x, y);
  for (let i = 0; i < 30; i++) deco(pick(['d_oil', 'd_crack', 'd_crack', 'd_puddle']), 3360 + rng() * 1320, 2460 + rng() * 960);

  // ===== Ферма =====
  building(448, 2528, 352, 288, 'barn', 'hay', { e: [D(2624)], s: [D(608)] });
  building(1184, 2528, 320, 288, 'wood', 'wood', { s: [D(1312)], n: [Wn(1280), Wn(1408)], e: [Wn(2656)] });
  for (const [x, y] of [[480, 2580], [530, 2580], [480, 2640], [700, 2700]]) addProp('hay', x, y);
  addProp('cratestack', 720, 2580); addProp('locker', 660, 2570);
  addFurn('bed', 1240, 2600); addFurn('table', 1320, 2640); addProp('fridge', 1420, 2600); addFurn('cabinet', 1380, 2720);
  addProp('tractor', 860, 2560); addProp('well', 1060, 2700); addProp('hay', 900, 2840); addProp('hay', 950, 2860); addProp('hay', 180 + 700, 2900);
  const field = (fx, fy, fw, fh) => {
    for (let y = fy; y < fy + fh; y += 34) for (let x = fx; x < fx + fw; x += 30) addProp(rng() < 0.5 ? 'corn0' : 'corn1', x + rng() * 8, y + rng() * 8);
    World.fields = (World.fields || []).concat([{ x: fx, y: fy, w: fw, h: fh }]);
  };
  World.fields = [];
  field(320, 2944, 640, 384); field(1280, 2880, 480, 448);
  addProp('scarecrow', 640, 3100); addProp('scarecrow', 1520, 3080);
  fenceLine(288, 2912, 1000, 2912, 'fencewood', [[576, 672]]);
  fenceLine(1248, 2848, 1792, 2848, 'fencewood', [[1472, 1568]]);
  for (let i = 0; i < 20; i++) deco(pick(['d_leaves0', 'd_puddle', 'd_grass1']), 300 + rng() * 1600, 2460 + rng() * 950);

  // ===== Лаборатория =====
  fenceLine(224, 224, 1760, 224, 'fencebarb');
  fenceLine(224, 1248, 1760, 1248, 'fencebarb', [[1056, 1184]]);
  fenceLine(224, 224, 224, 1256, 'fencebarb');
  fenceLine(1760, 224, 1760, 1256, 'fencebarb', [[640, 736]]);
  World.floors.push({ x: 232, y: 232, w: 1528, h: 1016, kind: 'concrete' });
  building(512, 448, 480, 320, 'concrete', 'lab', { s: [D(736)], e: [D(560, true)] });
  building(1216, 448, 288, 224, 'concrete', 'lab', { s: [D(1312)] });
  for (let i = 0; i < 3; i++) addProp('labtable', 560 + i * 120, 500);
  addProp('capsule', 560, 620); addProp('capsule_broken', 620, 620); addProp('capsule', 680, 620);
  addProp('rack', 900, 480); addProp('rack', 940, 480); addProp('locker', 920, 640); addProp('labtable', 800, 660);
  addProp('rack', 1280, 560); addProp('locker', 1380, 560);
  for (const [x, y] of [[420, 900], [1100, 860], [700, 1000], [1500, 380], [320, 420], [1560, 980], [980, 1120]]) { addProp(rng() < 0.5 ? 'growth0' : 'growth1', x, y); deco('d_goo', x + 10, y + 8); }
  addProp('sign', 1040, 1220); addProp('sign', 1200, 1220); addProp('sign', 1740, 600);
  for (let i = 0; i < 16; i++) deco(pick(['d_goo', 'd_crack', 'd_oil']), 260 + rng() * 1480, 260 + rng() * 960);

  // ===== Посёлок (восток) =====
  World.roads.push({ x: 4704, y: 1056, w: 1568, h: 64, kind: 'dirt' });
  World.roads.push({ x: 5600, y: 320, w: 64, h: 1472, kind: 'dirt' });
  building(5120, 320, 320, 288, 'wood', 'wood', { s: [D(5248)], e: [Wn(416)] });
  building(5760, 320, 384, 320, 'brick', 'tile', { s: [D(5920)], w: [Wn(448)] });
  building(5120, 1216, 352, 288, 'wood', 'wood', { n: [D(5248)], w: [Wn(1312)] });
  building(5760, 1184, 416, 352, 'barn', 'hay', { n: [D(5920)], e: [D(1312)] });
  building(5152, 704, 288, 256, 'wood', 'wood', { e: [D(800)], n: [Wn(5248)] });
  building(5760, 736, 320, 256, 'brick', 'wood', { w: [D(832)] });
  addFurn('bed', 5150, 360); addFurn('table', 5260, 450); addProp('fridge', 5380, 360); addFurn('sofa', 5300, 520);
  addProp('shelf', 5800, 370); addProp('shelf', 5900, 370); addProp('counter', 6000, 500); addFurn('crate', 5800, 520);
  addFurn('bed', 5150, 1260); addFurn('cabinet', 5300, 1260); addProp('locker', 5400, 1400); addFurn('table', 5220, 1380);
  for (const [x, y] of [[5800, 1240], [5860, 1240], [6080, 1400]]) addProp('hay', x, y);
  addProp('tractor', 5900, 1600); addFurn('sofa', 5190, 760); addProp('fridge', 5380, 760); addProp('shelf', 5800, 780); addFurn('table', 5900, 860);
  addProp('car0', 5300, 1120); addProp('car2', 5680, 1700); addProp('well', 5500, 980);
  for (const y of [420, 760, 1300, 1650]) addProp('lamp', 5560, y, { on: rng() < 0.5 });
  fenceLine(5056, 1792, 5536, 1792, 'fencewood', [[5280, 5376]]);
  for (let i = 0; i < 30; i++) deco(pick(['d_leaves0', 'd_puddle', 'd_grass1', 'd_paper']), 5100 + rng() * 1100, 300 + rng() * 1450);
  // ===== Автобаза (юго-восток): гаражи, машины, бензоколонки =====
  World.roads.push({ x: 4704, y: 2208, w: 64, h: 2400, kind: 'dirt' });
  World.floors.push({ x: 4992, y: 2624, w: 1280, h: 1856, kind: 'asphalt' });
  fenceLine(4992, 2624, 6272, 2624, 'fencechain', [[5440, 5568]]);
  fenceLine(4992, 2624, 4992, 4480, 'fencechain', [[3200, 3328]]);
  building(5120, 2752, 640, 384, 'metal', 'concrete', { s: [D(5248), D(5568)], e: [D(2880)] });
  building(5888, 3392, 320, 448, 'metal', 'concrete', { w: [D(3520)], n: [D(6016)] });
  building(5120, 3904, 448, 320, 'brick', 'tile', { n: [D(5312)] });
  addProp('car1', 5180, 2830); addProp('car0', 5420, 2830); addProp('car2', 5200, 3000);
  for (const [x, y] of [[5200, 3300], [5420, 3320], [5650, 3300], [5300, 3560], [5600, 3600], [6000, 2800], [6080, 3060]]) addProp(pick(['car0', 'car1', 'car2']), x, y);
  addProp('gaspump', 5700, 2700); addProp('gaspump', 5780, 2700); addProp('gaspump', 5860, 2700);
  addProp('tractor', 5950, 3950); addProp('container0', 6000, 4250); addProp('container1', 5800, 4250);
  for (let i = 0; i < 4; i++) addProp('cratestack', 5640 + i * 46, 2780);
  addProp('locker', 5920, 3420); addProp('shelf', 6000, 3600); addProp('counter', 5180, 3960); addProp('shelf', 5300, 3960); addProp('locker', 5480, 4100);
  for (const [x, y] of [[5050, 3800], [5076, 3810], [6150, 3300], [5700, 4000]]) addProp('barrel', x, y);
  for (let i = 0; i < 30; i++) deco(pick(['d_oil', 'd_crack', 'd_oil', 'd_puddle']), 5020 + rng() * 1220, 2660 + rng() * 1800);
  // ===== Заброшенный лагерь (юг) =====
  World.roads.push({ x: 1088, y: 3456, w: 64, h: 480, kind: 'dirt' });
  World.floors.push({ x: 640, y: 3904, w: 1792, h: 704, kind: 'stone' });
  building(704, 3968, 288, 224, 'wood', 'wood', { e: [D(4032)] });
  building(1216, 4096, 256, 224, 'wood', 'wood', { n: [D(1312)] });
  building(1728, 3968, 320, 256, 'ruin', 'stone', { s: [D(1856)] });
  addFurn('bed', 730, 4000); addFurn('crate', 900, 4100); addFurn('table', 1250, 4200); addProp('locker', 1400, 4130);
  addProp('cratestack', 1800, 4030); addProp('shelf', 1900, 4030); addFurn('crate', 1760, 4150);
  addProp('car1', 1500, 3950); addProp('well', 2200, 4300); addProp('bench', 2100, 4450);
  for (let i = 0; i < 20; i++) deco(pick(['d_leaves0', 'd_grass1', 'd_puddle']), 660 + rng() * 1750, 3920 + rng() * 680);
  for (const [x, y] of [[5300, 900], [6000, 1000], [5900, 2900], [5400, 3450], [5900, 3700], [5350, 4100], [800, 4300], [1350, 4300], [1900, 4300]]) World.lootSpots.push({ x, y });

  // ===== Машины на дорогах =====
  addProp('car0', 1700, 2190); addProp('car2', 2620, 2600); addProp('car1', 4000, 2200);

  // ===== Руины в лесу =====
  const ruins = [{ x: 1408, y: 1600, w: 256, h: 192 }, { x: 2048, y: 640, w: 288, h: 224 }, { x: 2848, y: 2720, w: 256, h: 192 }, { x: 448, y: 1664, w: 224, h: 160 }];
  World.ruins = ruins;
  for (const r of ruins) {
    World.floors.push({ x: r.x, y: r.y, w: r.w, h: r.h, kind: 'stone' });
    const gaps = (off) => {
      const g = [];
      const n = 1 + (rng() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) g.push({ at: off + 32 + Math.floor(rng() * 3) * 32 + i * 96, len: 64 + (rng() < 0.4 ? 32 : 0), kind: 'gap' });
      return g.filter((a, i, arr) => i === 0 || a.at > arr[i - 1].at + arr[i - 1].len);
    };
    const cut = (gs, total) => gs.filter((g) => g.at + g.len < total - 16);
    addWall(r.x, r.y, r.w, T, cut(gaps(0), r.w), 'ruin');
    addWall(r.x, r.y + r.h - T, r.w, T, cut(gaps(0), r.w), 'ruin');
    addWall(r.x, r.y + T, T, r.h - 2 * T, cut(gaps(16), r.h - 2 * T), 'ruin');
    addWall(r.x + r.w - T, r.y + T, T, r.h - 2 * T, cut(gaps(16), r.h - 2 * T), 'ruin');
    World.lootSpots.push({ x: r.x + 60, y: r.y + 60 }, { x: r.x + r.w - 60, y: r.y + r.h - 56 });
    addFurn(rng() < 0.5 ? 'crate' : 'table', r.x + r.w / 2 - 50, r.y + r.h / 2 - 10);
  }
  // точки ящиков с припасами
  for (const [x, y] of [[3400, 460], [3780, 620], [4240, 610], [4650, 600], [3300, 1200], [4500, 1230], [3700, 2700], [3600, 2840], [4400, 3100], [4600, 3350],
    [600, 2700], [760, 2760], [1300, 2730], [620, 700], [880, 720], [1350, 620], [1600, 900]]) World.lootSpots.push({ x, y });
  for (let i = 0; i < 60 && World.lootSpots.filter((s) => s.forest).length < 12; i++) {
    const x = 300 + rng() * (WORLD_W - 600), y = 300 + rng() * (WORLD_H - 600);
    if (zoneAt(x, y) === 'forest' && dist(x, y, World.fire.x, World.fire.y) > 420) World.lootSpots.push({ x, y, forest: true });
  }

  // ===== Лес =====
  const avoid = [{ x: hx - 220, y: hy - 160, w: hw + 440, h: hh + 420 }];
  for (const z of ZONES) avoid.push({ x: z.x - 40, y: z.y - 40, w: z.w + 80, h: z.h + 80 });
  for (const r of World.roads) avoid.push({ x: r.x - 40, y: r.y - 40, w: r.w + 80, h: r.h + 80 });
  for (const f of World.floors) if (f.road) avoid.push({ x: f.x - 40, y: f.y - 40, w: f.w + 80, h: f.h + 80 });
  for (const r of ruins) avoid.push({ x: r.x - 60, y: r.y - 90, w: r.w + 120, h: r.h + 150 });
  for (const s of World.lootSpots) if (s.forest) avoid.push({ x: s.x - 50, y: s.y - 50, w: 100, h: 100 });
  for (const p of World.props) if (p.car) avoid.push({ x: p.x - 30, y: p.y - 60, w: p.w + 60, h: p.h + 90 });
  const tgrid = new Map();
  const tkey = (x, y) => (Math.floor(x / 100) << 8) | Math.floor(y / 100);
  const okTree = (x, y, md) => {
    for (const a of avoid) if (x > a.x && x < a.x + a.w && y > a.y && y < a.y + a.h) return false;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const l = tgrid.get(tkey(x + dx * 100, y + dy * 100));
      if (l) for (const t of l) if (dist2(x, y, t.x, t.y) < md * md) return false;
    }
    return true;
  };
  const plant = (x, y, v) => {
    const t = { x, y, r: 15, v, s: 0.85 + rng() * 0.35, wood: 3, shake: 0 };
    World.trees.push(t);
    const k = tkey(x, y); if (!tgrid.has(k)) tgrid.set(k, []); tgrid.get(k).push(t);
  };
  for (let i = 0; i < 4000 && World.trees.length < 380; i++) {
    const side = Math.floor(rng() * 4);
    let x, y;
    if (side === 0) { x = rng() * WORLD_W; y = 20 + rng() * 110; } else if (side === 1) { x = rng() * WORLD_W; y = WORLD_H - 20 - rng() * 100; }
    else if (side === 2) { x = 20 + rng() * 110; y = rng() * WORLD_H; } else { x = WORLD_W - 20 - rng() * 110; y = rng() * WORLD_H; }
    if (okTree(x, y, 62)) plant(x, y, Math.floor(rng() * 3));
  }
  for (let i = 0; i < 16000 && World.trees.length < 1450; i++) {
    const x = 160 + rng() * (WORLD_W - 320), y = 160 + rng() * (WORLD_H - 320);
    if (okTree(x, y, 80)) plant(x, y, rng() < 0.15 ? 3 : Math.floor(rng() * 3));
  }
  for (let i = 0; i < 700; i++) {
    const x = 100 + rng() * (WORLD_W - 200), y = 100 + rng() * (WORLD_H - 200);
    if (okTree(x, y, 40)) World.bushes.push({ x, y, v: Math.floor(rng() * 3) });
  }
  buildStaticGrid();
  rebuildDynamic();
}

// ---------- Пространственная сетка (статические препятствия) ----------
const SG = { cs: 128, nx: Math.ceil(WORLD_W / 128), ny: Math.ceil(WORLD_H / 128), cells: [], dcells: [] };
let STAMP = 1;
function sgAdd(cells, e, x0, y0, x1, y1) {
  const a = Math.max(0, Math.floor(x0 / SG.cs)), b = Math.min(SG.nx - 1, Math.floor(x1 / SG.cs));
  const c = Math.max(0, Math.floor(y0 / SG.cs)), d = Math.min(SG.ny - 1, Math.floor(y1 / SG.cs));
  for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) cells[y * SG.nx + x].push(e);
}
function rebuildStatic() {
  SG.cells = Array.from({ length: SG.nx * SG.ny }, () => []);
  for (const w of World.walls) sgAdd(SG.cells, { t: 0, x: w.x, y: w.y, w: w.w, h: w.h, ref: w }, w.x, w.y, w.x + w.w, w.y + w.h);
  for (const p of World.props) if (p.solid && !p.dead) sgAdd(SG.cells, { t: 0, x: p.x, y: p.y, w: Math.max(p.w, 6), h: Math.max(p.h, 6), ref: p }, p.x, p.y, p.x + p.w, p.y + p.h);
  for (const t of World.trees) sgAdd(SG.cells, { t: 1, x: t.x, y: t.y, r: t.r, ref: t }, t.x - t.r, t.y - t.r, t.x + t.r, t.y + t.r);
  const f = World.fire;
  sgAdd(SG.cells, { t: 1, x: f.x, y: f.y, r: f.r, ref: f }, f.x - f.r, f.y - f.r, f.x + f.r, f.y + f.r);
}
function rebuildDynamic() {
  if (SG.dcells.length !== SG.nx * SG.ny) SG.dcells = Array.from({ length: SG.nx * SG.ny }, () => []);
  for (const c of SG.dcells) c.length = 0;
  for (const s of World.structs) if (!s.carried) sgAdd(SG.dcells, s, s.x, s.y, s.x + s.w, s.y + s.h);
}
function sgQuery(cells, x0, y0, x1, y1, fn) {
  STAMP++;
  const a = Math.max(0, Math.floor(x0 / SG.cs)), b = Math.min(SG.nx - 1, Math.floor(x1 / SG.cs));
  const c = Math.max(0, Math.floor(y0 / SG.cs)), d = Math.min(SG.ny - 1, Math.floor(y1 / SG.cs));
  for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) for (const e of cells[y * SG.nx + x]) {
    if (e._s === STAMP) continue; e._s = STAMP;
    if (fn(e) === false) return;
  }
}

// ---------- Навигация ----------
const Nav = {
  blocked: new Uint8Array(GW * GH), cost: new Float32Array(GW * GH), costG: new Float32Array(GW * GH),
  dist: new Float32Array(GW * GH), distG: new Float32Array(GW * GH), sref: new Array(GW * GH).fill(null), heap: new MinHeap(),
};
function buildStaticGrid() {
  rebuildStatic();
  const B = Nav.blocked; B.fill(0);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const i = gy * GW + gx, x = gx * CELL, y = gy * CELL;
    if (gx === 0 || gy === 0 || gx === GW - 1 || gy === GH - 1) { B[i] = 1; continue; }
    let b = false;
    sgQuery(SG.cells, x, y, x + CELL, y + CELL, (e) => {
      if (e.t === 0 ? rectsOverlap(x + 1, y + 1, CELL - 2, CELL - 2, e.x, e.y, e.w, e.h) : distToRect(e.x, e.y, x, y, CELL, CELL) < e.r - 2) { b = true; return false; }
    });
    B[i] = b ? 1 : 0;
  }
}
const cellOf = (x, y) => clamp(Math.floor(y / CELL), 0, GH - 1) * GW + clamp(Math.floor(x / CELL), 0, GW - 1);
function eachCell(s, fn) {
  const x0 = Math.max(0, Math.floor(s.x / CELL)), x1 = Math.min(GW - 1, Math.floor((s.x + s.w - 0.01) / CELL));
  const y0 = Math.max(0, Math.floor(s.y / CELL)), y1 = Math.min(GH - 1, Math.floor((s.y + s.h - 0.01) / CELL));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(y * GW + x);
}
function dijkstra(C, D, targets) {
  const B = Nav.blocked, H = Nav.heap; H.clear();
  D.fill(Infinity);
  for (const t of targets) {
    let i = cellOf(t.x, t.y);
    // игрок прижат к стене и его клетка «занята» стеной — берём ближайшую свободную клетку С ЕГО СТОРОНЫ,
    // иначе волна расходилась бы сквозь стену и монстры ломились бы в стену, а не в дверь
    if (B[i]) {
      let bj = -1, bd = Infinity;
      const gx = i % GW, gy = (i / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const j = ny * GW + nx;
        if (B[j]) continue;
        const cx = nx * CELL + CELL / 2, cy = ny * CELL + CELL / 2;
        let wall = false;
        for (let k = 1; k <= 4 && !wall; k++) wall = pointBlocked(t.x + (cx - t.x) * k / 4, t.y + (cy - t.y) * k / 4);
        if (wall) continue;
        const dd = dist2(t.x, t.y, cx, cy);
        if (dd < bd) { bd = dd; bj = j; }
      }
      if (bj < 0) continue;
      i = bj;
    }
    if (D[i] > 0) { D[i] = 0; H.push(0, i); }
  }
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
function computeFlow(targets) {
  const N = GW * GH, C = Nav.cost, CG = Nav.costG, S = Nav.sref, B = Nav.blocked;
  for (let i = 0; i < N; i++) { C[i] = CG[i] = B[i] ? Infinity : 1; S[i] = null; }
  for (const s of World.structs) {
    if (s.carried) continue;
    if (s.kind === 'trap') { eachCell(s, (i) => { if (!B[i]) { C[i] += 2; CG[i] += 2; } }); continue; }
    if (!s.solid) continue;
    const add = s.kind === 'loot' ? 3 : 3 + s.hp / 14;
    eachCell(s, (i) => {
      if (B[i]) return;
      C[i] = Math.max(C[i], 1 + add); S[i] = s;
      CG[i] = s.kind === 'window' ? 2 : Math.max(CG[i], 1 + add);
    });
  }
  dijkstra(C, Nav.dist, targets);
  // поле для «пролезающих в окна» считаем, только если такие монстры есть
  if (G.enemies.some((e) => EDEF[e.type].squeeze && !e.dead)) dijkstra(CG, Nav.distG, targets);
}
function flowStep(x, y, squeeze) {
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL), D = squeeze ? Nav.distG : Nav.dist, B = Nav.blocked;
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
  let s = Nav.sref[bi] || Nav.sref[ci];
  if (squeeze && s && s.kind === 'window') s = null;
  return { x: (bi % GW) * CELL + CELL / 2, y: ((bi / GW) | 0) * CELL + CELL / 2, s };
}
function lineClear(ax, ay, bx, by, staticOnly) {
  const d = dist(ax, ay, bx, by), n = Math.ceil(d / 14);
  for (let k = 1; k < n; k++) {
    const t = k / n, i = cellOf(ax + (bx - ax) * t, ay + (by - ay) * t);
    if (Nav.blocked[i] || (!staticOnly && Nav.sref[i])) return false;
  }
  return true;
}

// ---------- Столкновения ----------
// fl: { low: игнорировать низкие постройки, squeeze: пролезает в окна, nostruct }
function collideWorld(o, r, fl) {
  const lo = fl && fl.low, sq = fl && fl.squeeze;
  sgQuery(SG.cells, o.x - r, o.y - r, o.x + r, o.y + r, (e) => {
    if (e.t === 0) { if (!(lo && e.ref.low)) pushCircleRect(o, r, e.x, e.y, e.w, e.h); }
    else pushCircleCircle(o, r, e.x, e.y, e.r);
  });
  if (!(fl && fl.nostruct)) sgQuery(SG.dcells, o.x - r, o.y - r, o.x + r, o.y + r, (s) => {
    if (!s.solid || s.carried || (lo && s.low) || (sq && s.kind === 'window')) return;
    pushCircleRect(o, r, s.x, s.y, s.w, s.h);
  });
  o.x = clamp(o.x, CELL + r, WORLD_W - CELL - r);
  o.y = clamp(o.y, CELL + r, WORLD_H - CELL - r);
}
function pointBlocked(x, y) {
  let b = false;
  sgQuery(SG.cells, x - 1, y - 1, x + 1, y + 1, (e) => {
    if (e.t === 0 && !e.ref.low && x > e.x && x < e.x + e.w && y > e.y && y < e.y + e.h) { b = true; return false; }
  });
  return b;
}

function canPlace(x, y, w, h, ignore, solidOnly = true) {
  if (x < CELL || y < CELL || x + w > WORLD_W - CELL || y + h > WORLD_H - CELL) return false;
  let ok = true;
  sgQuery(SG.cells, x, y, x + w, y + h, (e) => {
    if (e.t === 0 ? rectsOverlap(x, y, w, h, e.x, e.y, e.w, e.h) : distToRect(e.x, e.y, x, y, w, h) < e.r) { ok = false; return false; }
  });
  if (!ok) return false;
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
  collideWorld(o, r, null);
  return Math.abs(o.x - x) < 0.5 && Math.abs(o.y - y) < 0.5;
}
function inHideZone(x, y) {
  for (const f of World.fields || []) if (x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.h) return true;
  return false;
}
