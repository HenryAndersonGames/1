// Рельеф карты: высоты, дороги, биомы. Чистые функции — используются и для меша, и для логики.
import { fbm, smoothstep, lerp, distToSeg, clamp } from './util.js';

export const MAP_HALF = 400;      // карта 800x800
export const PLAY_HALF = 345;     // дальше — горы и невидимая стена
export const WATER_Y = -1.7;

export const LOC = {
  town: { x: 0, z: 0, name: 'Биттер-Крик' },
  cemetery: { x: 135, z: -45, name: 'Кладбище' },
  mine: { x: -232, z: -70, name: 'Шахта «Милость Господня»' },
  hut: { x: -207, z: -228, name: 'Хижина Изи' },
  pit: { x: 238, z: -242, name: 'Яма' },
  mission: { x: -62, z: 262, name: 'Руины миссии Сан-Себастьян' },
  farm: { x: 188, z: 152, name: 'Ферма Гриффинов' },
  bridge: { x: 0, z: 0, name: 'Мост' },
};

// железная дорога: проходит севернее города, через холмы — выемкой, в горы — тоннелями
export function railZ(x) { return -104 + 5 * Math.sin(x * 0.006) - 0.012 * Math.max(0, -x - 150) * 2; }
export const RAIL_Y = 0.55;

export function creekZ(x) {
  return 112 + 18 * Math.sin(x * 0.012) + 8 * Math.sin(x * 0.031 + 1.3);
}
LOC.bridge.z = creekZ(0);

export const ROADS = [
  { w: 9, town: true, pts: [[-104, 0], [104, 0]] },
  { w: 7.5, town: true, pts: [[0, -68], [0, 0]] },
  { w: 7, pts: [[0, 0], [0, 132], [-22, 188], [-58, 252]] },
  { w: 5, pts: [[0, 136], [90, 143], [176, 150]] },
  { w: 6, pts: [[104, 0], [180, 8], [262, 20], [400, 30]] },
  { w: 6, pts: [[-104, 0], [-170, -26], [-226, -66]] },
  { w: 3.2, pts: [[-170, -26], [-194, -120], [-205, -218]] },
  { w: 3.2, pts: [[106, 0], [122, -26], [152, -82], [192, -160], [232, -234]] },
  { w: 3, pts: [[106, -2], [128, -30]] },
  { w: 3.6, pts: [[29.5, -10], [29.5, -40], [36, -82]] },
];

export function roadDist(x, z) {
  let best = 1e9, bw = 0, town = false;
  for (const r of ROADS) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const d = distToSeg(x, z, a[0], a[1], b[0], b[1]) - r.w;
      if (d < best) { best = d; bw = r.w; town = !!r.town; }
    }
  }
  return { d: best, w: bw, town };
}

export function forestMask(x, z) {
  const d1 = Math.hypot(x - 225, z - 225 * -1) / 175;
  let m = 1 - d1;
  m += (fbm(x * 0.02 + 3, z * 0.02 + 7, 3) - 0.5) * 0.7;
  // прибрежные рощи вдоль ручья
  const cz = Math.abs(z - creekZ(x));
  m = Math.max(m, (1 - smoothstep(6, 22, cz)) * (fbm(x * 0.05, z * 0.05, 2) - 0.35) * 1.6);
  // роща у хижины
  const dh = Math.hypot(x + 215, z + 250) / 60;
  m = Math.max(m, (1 - dh) * 0.9 + (fbm(x * 0.03, z * 0.03, 2) - 0.5) * 0.5);
  return m;
}

const PADS = [
  { x: 0, z: 0, rx: 1.3, r: 108, f: 45, h: 0 },
  { ...LOC.cemetery, r: 26, f: 18 },
  { ...LOC.farm, r: 40, f: 25 },
  { ...LOC.mission, r: 22, f: 18 },
  { ...LOC.hut, r: 10, f: 12 },
  { x: -226, z: -68, r: 14, f: 10 },
  { ...LOC.pit, r: 24, f: 16 },
];

function rawHeight(x, z) {
  let h = (fbm(x * 0.008 + 10, z * 0.008 - 5, 3) - 0.5) * 12;
  h += Math.sin(x * 0.045 + Math.sin(z * 0.03) * 2.0) * 0.9 * smoothstep(40, 200, z);
  // массив холмов на северо-западе
  const hx = (x + 310) / 200, hz = (z + 140) / 220;
  const hd = Math.sqrt(hx * hx + hz * hz);
  h += Math.pow(Math.max(0, 1 - hd), 1.6) * 62 * (0.65 + 0.7 * fbm(x * 0.018, z * 0.018, 3));
  // невысокие холмы на юге у миссии
  const sx = (x + 140) / 110, sz = (z - 310) / 70;
  h += Math.pow(Math.max(0, 1 - Math.sqrt(sx * sx + sz * sz)), 1.5) * 22;
  // горы по краю
  const e = Math.max(Math.abs(x), Math.abs(z));
  h += smoothstep(300, 395, e) * (42 + 34 * fbm(x * 0.015, z * 0.015, 2));
  return Math.max(h, -0.8);
}

for (const p of PADS) if (p.h === undefined) p.h = rawHeight(p.x, p.z) * 0.6;

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  for (const p of PADS) {
    const dx = (x - p.x) / (p.rx || 1), dz = z - p.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < p.r + p.f) h = lerp(p.h, h, smoothstep(p.r, p.r + p.f, d));
  }
  // насыпь и выемка железной дороги
  const rd = Math.abs(z - railZ(x));
  if (rd < 18) h = lerp(RAIL_Y - 0.25, h, smoothstep(3.2, 13 + Math.min(5, Math.max(0, h - RAIL_Y) * 0.15), rd));
  // русло ручья
  const cz = Math.abs(z - creekZ(x));
  if (cz < 12) h -= (1 - smoothstep(3.5, 10, cz)) * 3.4;
  // провал Ямы
  const pd = Math.hypot(x - LOC.pit.x, z - LOC.pit.z);
  if (pd < 8) h -= (1 - smoothstep(0, 7.5, pd)) * 7;
  return h;
}

// Цвет треугольника рельефа
export function groundColor(x, z, h, ny, rnd) {
  const n = fbm(x * 0.03, z * 0.03, 2);
  const j = (rnd - 0.5) * 0.06;
  const rd = roadDist(x, z);
  const townD = Math.hypot(x / 1.3, z);
  const cz = Math.abs(z - creekZ(x));
  const pd = Math.hypot(x - LOC.pit.x, z - LOC.pit.z);
  let c;
  const rz = Math.abs(z - railZ(x));
  if (rz < 2.6) c = [0.36, 0.33, 0.3];
  else if (rz < 4.2) c = [0.46, 0.4, 0.33];
  else if (h < WATER_Y + 0.6 && cz < 11) c = [0.33, 0.29, 0.22];
  else if (rd.d < 0) {
    c = rd.town ? [0.62, 0.5, 0.36] : [0.58, 0.46, 0.32];
    if (rd.town && Math.abs(Math.abs(z) - 2.3) < 0.55 && Math.abs(x) < 104) c = [0.52, 0.41, 0.29];
  }
  else if (pd < 40) c = pd < 12 ? [0.2, 0.08, 0.06] : [0.38, 0.17, 0.12];
  else if (ny < 0.78) c = h > 30 ? [0.55, 0.47, 0.4] : [0.48, 0.38, 0.29];
  else if (h > 34) c = [0.6, 0.53, 0.45];
  else if (forestMask(x, z) > 0.45) c = n > 0.5 ? [0.27, 0.26, 0.17] : [0.31, 0.29, 0.19];
  else if (cz < 16) c = [0.4, 0.38, 0.22];
  else if (townD < 110) c = [0.66, 0.54, 0.38];
  else if (n > 0.6) c = [0.55, 0.5, 0.3];
  else if (n < 0.35) c = [0.74, 0.58, 0.4];
  else c = [0.71, 0.56, 0.37];
  return [clamp(c[0] + j, 0, 1), clamp(c[1] + j, 0, 1), clamp(c[2] + j * 0.8, 0, 1)];
}
