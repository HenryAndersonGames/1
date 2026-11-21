// Наполнение мира: железная дорога со станцией и поездом, скалы и арка, хутора, городской хлам,
// перекати-поле, грифы, костры, камыш.
import * as THREE from 'three';
import { GeoBuilder, MAT, SURF, TEX, makeSign, shade } from './models.js';
import * as BLD from './buildings.js';
import { heightAt, railZ, RAIL_Y, creekZ, LOC, PLAY_HALF } from './terrain.js';
import { mulberry32, clamp, dist, lerp } from './util.js';

const STONE = '#9a6a4a', STONE2 = '#b27a52', STONE3 = '#7e5640';
export const STATION_X = 40;

export function buildDetails(w) {
  const r = mulberry32(2024);
  w.clearZones = w.clearZones || [];
  const clear = (x, z, rad) => w.clearZones.push({ x, z, r: rad });

  // ---------------- железная дорога ----------------
  const ties = [];
  for (let x = -375; x <= 375; x += 0.95) ties.push([x, railZ(x)]);
  {
    const b = new GeoBuilder(SURF.WOOD);
    b.box('#4a3a2c', 0, 0, 0, 0.26, 0.16, 2.5);
    const geo = b.build();
    const im = new THREE.InstancedMesh(geo, MAT.solid, ties.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    ties.forEach(([x, z], i) => {
      const a = Math.atan2(railZ(x + 1) - railZ(x - 1), 2);
      q.setFromAxisAngle(up, -a);
      m4.compose(new THREE.Vector3(x, RAIL_Y - 0.05, z), q, new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, m4);
      const k = 0.8 + ((i * 37) % 10) * 0.04; col.setRGB(k, k, k); im.setColorAt(i, col);
    });
    im.receiveShadow = true;
    w.scene.add(im);
  }
  for (let x = -375; x < 375; x += 6) {
    const x1 = x + 6, z0 = railZ(x), z1 = railZ(x1), len = Math.hypot(6, z1 - z0), a = Math.atan2(z1 - z0, 6);
    const c = w.chunk(x + 3, (z0 + z1) / 2);
    for (const s of [-0.72, 0.72]) {
      const ox = -Math.sin(a) * s, oz = Math.cos(a) * s;
      c.s.box('#5a5650', x + 3 + ox, RAIL_Y + 0.12, (z0 + z1) / 2 + oz, len + 0.02, 0.12, 0.07, 0, -a, 0, SURF.FINE);
      c.s.box('#8a8680', x + 3 + ox, RAIL_Y + 0.185, (z0 + z1) / 2 + oz, len + 0.02, 0.02, 0.09, 0, -a, 0, SURF.FINE);
    }
  }
  // порталы тоннелей
  for (const sx of [-1, 1]) {
    const x = sx * 338, z = railZ(x);
    w.place(x, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, RAIL_Y - 0.3, (b) => {
      b.surface = SURF.FINE;
      b.box('#0a0807', 0, 2.8, -3, 5.4, 5.6, 6);
      for (const s of [-1, 1]) b.box(STONE3, s * 3.4, 3.2, 0, 1.4, 6.4, 1.2);
      b.box(STONE3, 0, 6.8, 0, 8.2, 1.6, 1.2);
      b.box(shade(STONE3, 0.85), 0, 7.9, 0, 8.6, 0.5, 1.4);
      b.cyl(STONE3, 0, 5.6, 0.0, 2.75, 2.75, 1.2, 16, Math.PI / 2, 0, 0);
      b.box('#0a0807', 0, 5.6, 0.62, 5.4, 0.8, 0.04);
      for (let i = 0; i < 8; i++) b.rock(STONE, (r() - 0.5) * 14, 6 + r() * 6, -1 - r() * 3, 2 + r() * 2);
      b.surface = SURF.WOOD;
    });
  }
  // станция
  const sz = railZ(STATION_X) + 5.0;
  w.addBuilding({ id: 'station', type: 'ff', ox: STATION_X, oz: sz, ry: Math.PI, w: 16, d: 11, h: 5.2, wall: '#6a4e3a', sign: 'СТАНЦИЯ БИТТЕР-КРИК', step: true, hitch: false });
  clear(STATION_X, sz + 5, 22);
  w.place(STATION_X + 26, railZ(STATION_X + 26) + 4.4, Math.PI, undefined, (b) => {
    // водокачка для паровоза
    for (const s of [-1, 1]) b.box('#4a3a2c', s * 1.6, 3.5, 0, 0.3, 7, 0.3);
    b.box('#4a3a2c', 0, 3.5, 0, 3.4, 0.15, 0.15, 0, 0, 0.9);
    b.cyl('#5e4632', 0, 8.6, 0, 2.2, 2.2, 3.0, 14);
    for (let y = 7.5; y < 10; y += 0.75) b.cyl('#2e2620', 0, y, 0, 2.23, 2.23, 0.07, 14);
    b.cone('#3f322a', 0, 10.7, 0, 2.5, 1.2, 14);
    b.limb('#3a3a3a', 0, 8, 2.1, 0, 7.2, 4.4, 0.18, 0.15, 8);
  });
  w.addCircle(STATION_X + 26, railZ(STATION_X + 26) + 4.4, 2.0);
  w.place(STATION_X - 24, railZ(STATION_X - 24) - 3.2, 0, undefined, (b) => {
    // семафор
    b.box('#3a3a3a', 0, 3.5, 0, 0.2, 7, 0.2);
    b.box('#8a1a14', 0.6, 6.4, 0, 1.4, 0.25, 0.06, 0, 0, 0.5);
    b.box('#e8e0d0', 1.0, 6.62, 0.01, 0.3, 0.08, 0.04, 0, 0, 0.5);
    b.cyl('#2a2a2a', 0, 7.1, 0, 0.18, 0.18, 0.2, 10);
  });
  // хлам на перроне
  for (const [dx, dz, k] of [[-5, 1.5, 'c'], [-4.2, 1.8, 'c'], [6, 1.5, 'b'], [6.6, 2.1, 'b'], [2, 2, 'trunk']]) {
    const x = STATION_X + dx, z = sz - dz;
    w.place(x, z, r() * 0.5, 0.2 + RAIL_Y - 0.55, (b) => {
      if (k === 'c') BLD.crate(b, 0, 0, 0.8);
      else if (k === 'b') BLD.barrel(b, 0, 0);
      else { b.box('#5a3a22', 0, 0.3, 0, 1.0, 0.6, 0.6); b.box('#c8a050', 0, 0.3, 0, 1.02, 0.08, 0.62); }
    });
  }
  // дрезина на запасном пути
  w.place(STATION_X + 60, railZ(STATION_X + 60), 0, RAIL_Y + 0.2, (b) => {
    b.box('#5a4430', 0, 0.45, 0, 2.2, 0.15, 1.6);
    for (const s of [-1, 1]) for (const t of [-0.8, 0.8]) b.cyl('#2a2a2a', t, 0.3, s * 0.72, 0.3, 0.3, 0.08, 12, Math.PI / 2);
    b.box('#3a3a3a', 0, 0.9, 0, 0.15, 0.9, 0.15); b.box('#3a3a3a', 0, 1.35, 0, 1.6, 0.08, 0.08, 0, 0, 0.15);
  });

  // ---------------- скалы и арка ----------------
  const butte = (x, z, R, H, seed) => {
    const rr = mulberry32(seed);
    const y0 = heightAt(x, z) - 1;
    w.place(x, z, rr() * 6, y0, (b) => {
      b.surface = SURF.FINE;
      let y = 0, rad = R;
      const layers = Math.round(H / 3.2);
      for (let i = 0; i < layers; i++) {
        const h = 2.6 + rr() * 1.4, rk = rad * (0.92 + rr() * 0.12);
        b.cyl([STONE, STONE2, STONE3][i % 3], (rr() - 0.5) * 0.6, y + h / 2, (rr() - 0.5) * 0.6, rk * 0.96, rk, h, 9 + (seed % 3));
        y += h; rad *= i < layers - 2 ? 0.97 : 0.88;
      }
      b.cyl(shade(STONE2, 1.1), 0, y + 0.3, 0, rad * 0.9, rad, 0.6, 10);
      for (let i = 0; i < 10; i++) { const a = rr() * 6.28; b.rock(STONE3, Math.cos(a) * (R + 1.5), 1 + rr(), Math.sin(a) * (R + 1.5), 1.2 + rr() * 1.8); }
      b.surface = SURF.WOOD;
    });
    w.addCircle(x, z, R + 0.5);
    clear(x, z, R + 6);
  };
  butte(255, 105, 9, 22, 11); butte(-250, 165, 11, 26, 12); butte(150, 285, 7, 17, 13); butte(-150, 300, 6, 14, 14);
  butte(300, -20, 6, 18, 15); butte(-300, 60, 8, 20, 16); butte(70, -230, 5, 12, 17);
  // столбы-худу
  for (let i = 0; i < 14; i++) {
    const a = r() * 6.28, d = 150 + r() * 150, x = Math.cos(a) * d * 1.1, z = Math.sin(a) * d;
    if (Math.abs(z - railZ(x)) < 15 || Math.abs(z - creekZ(x)) < 14 || Math.hypot(x - LOC.farm.x, z - LOC.farm.z) < 50 || Math.hypot(x - LOC.mission.x, z - LOC.mission.z) < 30) continue;
    if (Math.hypot(x - LOC.pit.x, z - LOC.pit.z) < 60 || Math.hypot(x - LOC.cemetery.x, z - LOC.cemetery.z) < 35) continue;
    const H = 4 + r() * 6;
    w.place(x, z, r() * 6, heightAt(x, z) - 0.3, (b) => {
      b.surface = SURF.FINE;
      b.cyl(STONE, 0, H * 0.4, 0, 0.9, 1.4, H * 0.8, 9);
      b.cyl(STONE2, 0.1, H * 0.85, 0, 0.6, 0.85, H * 0.25, 9);
      b.cyl(STONE3, 0.15, H + 0.2, 0, 1.2, 0.8, 0.6, 9);
      b.surface = SURF.WOOD;
    });
    w.addCircle(x, z, 1.2);
  }
  // природная арка
  {
    const x = 92, z = 300, y0 = heightAt(x, z) - 0.5;
    w.place(x, z, 0.4, y0, (b) => {
      b.surface = SURF.FINE;
      for (const s of [-1, 1]) { b.cyl(STONE, s * 8, 4.5, 0, 2.2, 3.0, 9, 10); b.cyl(STONE2, s * 7.6, 10, 0, 1.9, 2.2, 3, 10); }
      for (let i = 0; i <= 10; i++) {
        const t = i / 10, a = Math.PI * t;
        b.sph(i % 2 ? STONE2 : STONE, -Math.cos(a) * 7.8, 11 + Math.sin(a) * 4.5, 0, 2.3, 1.7, 2.0, 10);
      }
      for (let i = 0; i < 12; i++) b.rock(STONE3, (r() - 0.5) * 24, 0.8, (r() - 0.5) * 8, 0.8 + r() * 1.6);
      b.surface = SURF.WOOD;
    });
    for (const s of [-1, 1]) w.addCircle(x + Math.cos(0.4) * s * 8, z - Math.sin(0.4) * s * 8, 3);
    clear(x, z, 16);
  }

  // ---------------- заброшенные хутора ----------------
  const homestead = (id, x, z, ry, name) => {
    w.addBuilding({ id, type: 'house', ox: x, oz: z, ry, w: 8, d: 8, h: 3.2, wall: '#6a5a48', dark: true, porch: true });
    const P = (lx, lz) => w.toWorld(id, lx, lz);
    const o1 = P(7, -6); w.place(o1.x, o1.z, ry, undefined, (b) => {
      b.box('#5e4a36', 0, 1.2, 0, 1.3, 2.4, 1.3); b.box('#4a3a2c', 0, 2.5, 0, 1.6, 0.12, 1.6, 0.15);
      b.box('#2a2018', 0, 1.0, 0.66, 0.7, 1.8, 0.04); b.box('#1a1410', 0, 1.9, 0.68, 0.12, 0.2, 0.02);
    }); w.addCircle(o1.x, o1.z, 0.9);
    const o2 = P(-7, 4); w.place(o2.x, o2.z, ry + 0.6, undefined, (b) => {
      b.box('#4a3628', 0, 0.5, 0, 2.0, 0.4, 4.0, 0.05, 0, 0.3);
      b.cyl('#3a2c20', 1.1, 0.5, 1.3, 0.7, 0.7, 0.1, 12, 0, 0, Math.PI / 2 + 0.3);
      b.cyl('#3a2c20', -1.4, 0.06, -0.6, 0.7, 0.7, 0.1, 12, 0, 0.5, 0.05);
    }); w.addBox(o2.x - 1.6, o2.z - 1.6, o2.x + 1.6, o2.z + 1.6);
    const o3 = P(4, 7); w.place(o3.x, o3.z, 0, undefined, (b) => BLD.well(b)); w.addCircle(o3.x, o3.z, 1.4);
    for (let i = 0; i < 9; i++) {
      const p = P(-9 + i * 2.2, 10); if (i === 4) continue;
      w.place(p.x, p.z, ry + (r() - 0.5) * 0.2, undefined, (b) => { b.box('#4a3a2c', 0, 0.55, 0, 0.12, 1.1, 0.12, (r() - 0.5) * 0.3); if (r() < 0.7) b.box('#5a4834', 1.1, 0.8, 0, 2.2, 0.08, 0.05); });
    }
    const p4 = P(-4, -3); w.place(p4.x, p4.z, ry, undefined, (b) => { for (const s of [-2, 2]) b.box('#4a3a2c', s, 1.1, 0, 0.1, 2.2, 0.1); b.box('#ddd', 0, 2.1, 0, 4, 0.01, 0.01); b.box('#c8b8a0', -1, 1.6, 0, 0.9, 0.9, 0.02); b.box('#8a5a4a', 0.6, 1.7, 0, 0.6, 0.7, 0.02); });
    clear(x, z, 16);
  };
  homestead('hs1', -135, 68, 0.9, 'Хутор Даффи');
  homestead('hs2', 128, 78, -2.3, 'Хутор Мейсонов');
  homestead('hs3', 35, 195, 3.0, 'Хутор Кроу');

  // ---------------- городские мелочи ----------------
  const bench = (x, z, ry) => w.place(x, z, ry, 0.2, (b) => {
    b.box('#5a4430', 0, 0.45, 0, 1.8, 0.07, 0.45); b.box('#5a4430', 0, 0.8, -0.2, 1.8, 0.5, 0.06, -0.15);
    for (const s of [-0.8, 0.8]) b.box('#4a3628', s, 0.22, 0, 0.08, 0.45, 0.4);
  });
  const lantern = (x, z, y) => w.place(x, z, 0, y, (b, g) => { b.box('#1e1a16', 0, 0.22, 0, 0.26, 0.04, 0.26); g.box('#ffd28a', 0, 0, 0, 0.18, 0.3, 0.18); b.box('#1e1a16', 0, -0.18, 0, 0.24, 0.04, 0.24); b.box('#1e1a16', 0, 0.4, 0, 0.03, 0.35, 0.03); });
  const outhouse = (x, z, ry) => { w.place(x, z, ry, undefined, (b) => {
    b.box('#5e4a36', 0, 1.2, 0, 1.3, 2.4, 1.3); b.box('#4a3a2c', 0, 2.5, 0, 1.6, 0.12, 1.6, 0.15);
    b.box('#3a2a1e', 0, 1.0, 0.66, 0.7, 1.8, 0.04); b.box('#1a1410', 0, 1.95, 0.68, 0.1, 0.18, 0.02, 0, 0, 0.5); b.box('#1a1410', 0, 1.95, 0.68, 0.1, 0.18, 0.02, 0, 0, -0.5);
  }); w.addCircle(x, z, 0.9); };
  // скамейки и фонари на крыльцах
  for (const id of ['saloon', 'hotel', 'sheriff', 'store', 'barber', 'telegraph', 'undertaker', 'doctor', 'paper', 'smith']) {
    const a = w.anchors[id]; if (!a) continue;
    const p = w.toWorld(id, -a.w / 2 + 1.4, 1.0); bench(p.x, p.z, a.ry);
    const l1 = w.toWorld(id, -1.4, 2.3), l2 = w.toWorld(id, 1.4, 2.3);
    lantern(l1.x, l1.z, 2.55); lantern(l2.x, l2.z, 2.55);
  }
  // уборные на задворках
  for (const [x, z] of [[-60, -32], [-25, -33], [42, -36], [73, -26], [-76, 34], [-44, 33], [-18, 32], [60, 36], [86, 30]]) outhouse(x, z, z > 0 ? Math.PI : 0);
  // дилижанс у отеля
  {
    const p = w.toWorld('hotel', -4, 7.8), a = w.anchors.hotel;
    w.place(p.x, p.z, a.ry + Math.PI / 2, undefined, (b) => {
      b.box('#5a2a1e', 0, 1.6, 0, 1.7, 1.5, 3.0); b.box('#3a1a12', 0, 2.42, 0, 1.9, 0.12, 3.2);
      b.box('#c8a050', 0, 1.6, 0, 1.72, 0.06, 3.02); b.box('#c8a050', 0, 0.86, 0, 1.6, 0.06, 2.8);
      for (const s of [-1, 1]) { b.box('#1a1410', s * 0.86, 1.85, 0, 0.03, 0.6, 1.2); b.box('#3a1a12', s * 0.86, 1.4, 0, 0.04, 1.1, 0.75); }
      b.box('#3a2a1e', 0, 2.1, 1.9, 1.5, 0.12, 0.8); b.box('#3a2a1e', 0, 2.5, 2.2, 1.5, 0.7, 0.1);
      for (const [lz, rr] of [[-1.0, 0.75], [1.1, 0.55]]) for (const s of [-1, 1]) {
        b.cyl('#3a2a1e', s * 0.95, rr, lz, rr, rr, 0.08, 18, 0, 0, Math.PI / 2);
        for (let k = 0; k < 6; k++) b.box('#4a3628', s * 0.95, rr, lz, 0.04, rr * 1.9, 0.05, k * Math.PI / 6);
      }
      b.box('#c8b898', 0, 2.65, -0.6, 1.4, 0.4, 1.2); b.box('#5a3a22', 0.3, 2.85, -0.3, 0.6, 0.4, 0.5);
      b.box('#4a3628', 0, 0.8, 2.9, 0.1, 0.1, 2.0);
    });
    w.addBox(p.x - 2, p.z - 2, p.x + 2, p.z + 2);
  }
  // сено и дрова у конюшни и кузницы
  for (const [x, z] of [[-94, -10], [-93, -8.5], [-78, -10]]) w.place(x, z, r(), undefined, (b) => { b.box('#c8b070', 0, 0.45, 0, 1.3, 0.9, 0.9); b.box('#a8904c', 0, 0.45, 0, 1.32, 0.05, 0.92); });
  w.place(-61, -10, 0, undefined, (b) => { for (let i = 0; i < 12; i++) b.cyl('#6a4e34', (i % 4) * 0.28 - 0.4, 0.14 + Math.floor(i / 4) * 0.25, 0, 0.13, 0.13, 1.1, 8, Math.PI / 2); });
  w.place(-66, -8.6, 0, 0, (b) => { b.box('#2a2a2a', 0, 0.5, 0, 0.5, 0.25, 0.35); b.box('#2a2a2a', 0.3, 0.6, 0, 0.4, 0.12, 0.25); b.cyl('#4a3a2c', 0, 0.2, 0, 0.3, 0.35, 0.4, 10); }); // наковальня
  // плакаты «разыскивается» на стенах
  for (const id of ['saloon', 'store', 'barber', 'bank', 'hotel', 'telegraph']) {
    const a = w.anchors[id]; const p = w.toWorld(id, a.w / 2 - 0.9, 0.3);
    w.place(p.x, p.z, a.ry, 1.7, (b) => { b.box('#d8c8a0', 0, 0, 0, 0.45, 0.6, 0.02); b.box('#3a2a1e', 0, 0.12, 0.012, 0.3, 0.2, 0.005); b.box('#6a1a14', 0, -0.2, 0.012, 0.32, 0.06, 0.005); });
  }
  // насос и корыта, мешки у лавки
  w.place(-62, 9.5, 0, 0, (b) => { for (let i = 0; i < 5; i++) b.sph('#c8b090', (i % 3) * 0.5, 0.3 + Math.floor(i / 3) * 0.4, 0, 0.3, 0.32, 0.25, 8); });
  w.place(8, 6, 0, 0, (b) => { b.cyl('#3a3a3a', 0, 0.7, 0, 0.1, 0.12, 1.4, 10); b.box('#3a3a3a', 0.25, 1.25, 0, 0.5, 0.06, 0.06, 0, 0, -0.4); b.limb('#3a3a3a', 0, 1.1, 0, 0, 1.0, 0.35, 0.05, 0.05, 6); BLD.trough(b); });
  w.addCircle(8, 6, 0.7);
  // заборчики за южными домами
  for (const x0 of [-58, 14, 65]) for (let i = 0; i < 7; i++) w.place(x0 + i * 1.6, 27, 0, undefined, (b) => { b.box('#cfc4a8', 0, 0.55, 0, 0.1, 1.1, 0.05); b.box('#cfc4a8', 0.8, 0.75, 0, 1.6, 0.07, 0.03); b.box('#cfc4a8', 0.8, 0.35, 0, 1.6, 0.07, 0.03); });

  // ---------------- кости, черепа и указатели в пустыне ----------------
  for (let i = 0; i < 22; i++) {
    const a = r() * 6.28, d = 120 + r() * 200, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(z - railZ(x)) < 6) continue;
    w.place(x, z, r() * 6, undefined, (b) => { if (i % 3) BLD.cowSkull(b); else BLD.skeleton(b, r() * 6); for (let k = 0; k < 4; k++) b.box('#d6ccb2', (r() - 0.5) * 2, 0.05, (r() - 0.5) * 2, 0.4, 0.06, 0.06, 0, r() * 3, 0); });
  }
  for (const [x, z, t, a] of [[150, 2, 'ТУСОН 48 МИЛЬ →', 0], [0, 150, '← МИССИЯ   ФЕРМА →', 0], [-180, -30, '↑ ХИЖИНА ИЗИ', 0.4], [125, -28, 'КЛАДБИЩЕ', -0.6]]) w.signPost(x, z, t, a);

  // ---------------- костры ----------------
  w.campfires = [];
  const fire = (x, z) => {
    w.place(x, z, 0, undefined, (b) => {
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; b.rock('#5a5048', Math.cos(a) * 0.75, 0.12, Math.sin(a) * 0.75, 0.22); }
      for (let i = 0; i < 4; i++) b.limb('#3a2a1c', Math.cos(i * 1.6) * 0.5, 0.1, Math.sin(i * 1.6) * 0.5, 0, 0.35, 0, 0.07, 0.05, 6);
      b.box('#1a1412', 0, 0.03, 0, 1.0, 0.04, 1.0);
      b.cyl('#4a3628', 1.6, 0.25, 0.3, 0.2, 0.22, 1.6, 8, 0, 0.4, Math.PI / 2);
    });
    w.addCircle(x, z, 0.8, false);
    w.campfires.push({ x, z, y: heightAt(x, z) });
  };
  fire(LOC.hut.x + 5, LOC.hut.z + 5); fire(LOC.mission.x + 6, LOC.mission.z - 10); fire(-118, -92); fire(LOC.pit.x - 14, LOC.pit.z + 14);
  clear(-118, -92, 10);
}

// ------------------------------------------------------------------------------------------
// Живое окружение: поезд, перекати-поле, грифы, огонь
// ------------------------------------------------------------------------------------------
function trainCar(kind) {
  const b = new GeoBuilder(SURF.FINE), g = new GeoBuilder(SURF.FINE);
  const wheels = (zs, R = 0.42) => { for (const z of zs) for (const s of [-1, 1]) { b.cyl('#1e1c1a', s * 0.75, R, z, R, R, 0.12, 16, 0, 0, Math.PI / 2); b.cyl('#8a1a14', s * 0.8, R, z, R * 0.35, R * 0.35, 0.05, 10, 0, 0, Math.PI / 2); } };
  if (kind === 'loco') {
    b.box('#1a1816', 0, 0.75, 0, 1.6, 0.3, 8.6);
    b.cyl('#1e1c1c', 0, 1.9, 1.2, 0.95, 0.95, 5.2, 18, Math.PI / 2);
    for (const z of [-0.6, 0.8, 2.2, 3.4]) b.cyl('#b8913a', 0, 1.9, z, 0.97, 0.97, 0.08, 18, Math.PI / 2);
    b.cyl('#141212', 0, 1.9, 3.85, 0.9, 0.9, 0.15, 18, Math.PI / 2);
    b.cyl('#1e1c1c', 0, 3.3, 3.0, 0.24, 0.2, 0.9, 12); b.cyl('#1e1c1c', 0, 4.0, 3.0, 0.55, 0.26, 0.7, 14);
    b.sph('#b8913a', 0, 2.9, 1.4, 0.38, 0.38, 0.38, 12); b.sph('#1e1c1c', 0, 2.85, 0.2, 0.28, 0.3, 0.28, 12);
    b.box('#3a1a14', 0, 2.3, -2.2, 2.2, 2.6, 2.4); b.box('#2a1410', 0, 3.7, -2.2, 2.6, 0.18, 2.8);
    for (const s of [-1, 1]) g.box('#ffd28a', s * 1.11, 2.7, -2.0, 0.02, 0.7, 0.9);
    b.prism('#3a1a14', 0, 0.35, 4.6, 1.8, 0.8, 0.8, 0); b.box('#8a1a14', 0, 0.4, 4.4, 1.9, 0.12, 0.3);
    g.box('#fff0c0', 0, 2.5, 4.0, 0.45, 0.45, 0.2); b.box('#1e1c1c', 0, 2.5, 3.85, 0.6, 0.6, 0.35);
    b.cyl('#b8913a', 0, 3.0, 2.3, 0.15, 0.2, 0.3, 10);
    wheels([2.8, 3.8], 0.42); wheels([-1.0, 0.4, 1.8], 0.72);
    for (const s of [-1, 1]) b.box('#8a8680', s * 0.86, 0.72, 0.4, 0.06, 0.08, 2.9);
  } else if (kind === 'tender') {
    b.box('#1a1816', 0, 0.75, 0, 1.6, 0.3, 4.4);
    b.box('#2a1612', 0, 1.6, 0, 2.2, 1.5, 4.2); b.box('#141210', 0, 2.38, 0.3, 2.0, 0.1, 3.0);
    for (let i = 0; i < 8; i++) b.rock('#141210', (i % 3 - 1) * 0.5, 2.45, -1 + i * 0.4, 0.3);
    wheels([-1.4, -0.6, 0.6, 1.4], 0.38);
  } else {
    const L = 9.5;
    b.box('#1a1816', 0, 0.75, 0, 1.6, 0.3, L);
    b.box(kind === 'mail' ? '#3a4a3a' : '#4a2018', 0, 1.9, 0, 2.4, 2.1, L - 0.6);
    b.box('#2a1410', 0, 3.1, 0, 2.6, 0.2, L - 0.2); b.box('#2a1410', 0, 3.35, 0, 1.2, 0.3, L - 1.2);
    b.box('#b8913a', 0, 1.0, 0, 2.42, 0.08, L - 0.62); b.box('#b8913a', 0, 2.6, 0, 2.42, 0.06, L - 0.62);
    if (kind !== 'mail') for (let i = 0; i < 7; i++) for (const s of [-1, 1]) g.box('#ffd28a', s * 1.21, 2.05, -3.6 + i * 1.2, 0.02, 0.6, 0.7);
    else for (const s of [-1, 1]) b.box('#2a2a2a', s * 1.21, 1.9, 0, 0.03, 1.6, 1.6);
    for (const s of [-1, 1]) { b.box('#2a1410', 0, 1.5, s * (L / 2 - 0.1), 1.8, 0.1, 0.6); b.box('#3a3a3a', 0.7, 1.9, s * (L / 2 + 0.1), 0.05, 1.4, 0.05); }
    wheels([-3.6, -2.8, 2.8, 3.6], 0.38);
  }
  const grp = new THREE.Group();
  const m = new THREE.Mesh(b.build(), MAT.solid); m.castShadow = true; grp.add(m);
  if (!g.empty) grp.add(new THREE.Mesh(g.build(), MAT.glow));
  return grp;
}

export class Ambient {
  constructor(g) {
    this.g = g; this.t = 0;
    const scene = g.scene, w = g.world;
    // поезд
    this.cars = [['loco', 8.6], ['tender', 4.4], ['coach', 9.5], ['coach', 9.5], ['mail', 9.5]].map(([k, L]) => { const o = trainCar(k); scene.add(o); return { o, L }; });
    this.lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: '#ffe0a0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.lamp.scale.set(5, 5, 1); scene.add(this.lamp);
    this.trainT = 40; this.trainX = 1e9; this.trainSpeed = 0; this.whistled = 0; this.chuffT = 0;
    // перекати-поле
    const tb = new GeoBuilder(SURF.FINE), rr = mulberry32(5);
    for (let i = 0; i < 40; i++) {
      const a = rr() * 6.28, e = (rr() - 0.5) * 3, R = 0.25 + rr() * 0.2;
      tb.limb(i % 2 ? '#8a7448' : '#a08a58', 0, 0, 0, Math.cos(a) * Math.cos(e) * R * 1.8, Math.sin(e) * R * 1.8, Math.sin(a) * Math.cos(e) * R * 1.8, 0.018, 0.008, 3);
    }
    tb.sph('#7a6a40', 0, 0, 0, 0.3, 0.3, 0.3, 8);
    const tgeo = tb.build();
    this.weeds = [];
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(tgeo, MAT.solid); m.castShadow = true; scene.add(m); this.weeds.push({ m, x: 1e9, z: 0, vx: 0, vz: 0, s: 0.8 + rr() * 0.6, ph: rr() * 6 }); }
    // грифы
    const vb = new GeoBuilder(SURF.FINE);
    vb.sph('#1a1614', 0, 0, 0, 0.18, 0.16, 0.5, 8); vb.sph('#c89a8a', 0, 0.05, 0.5, 0.08, 0.08, 0.1, 6); vb.cone('#1a1614', 0, 0, -0.55, 0.15, 0.4, 6, -Math.PI / 2);
    const wb = new GeoBuilder(SURF.FINE);
    wb.box('#1e1a18', 0.9, 0, 0, 1.8, 0.04, 0.55); wb.box('#141210', 1.85, 0, -0.05, 0.3, 0.03, 0.45);
    const vbody = vb.build(), wgeo = wb.build();
    this.birds = [];
    const centers = [[LOC.pit.x, LOC.pit.z], [150, 255], [-140, 140], [LOC.farm.x - 38, LOC.farm.z - 12], [255, 105]];
    centers.forEach(([cx, cz], i) => {
      for (let k = 0; k < (i === 0 ? 3 : 1); k++) {
        const o = new THREE.Group(); o.add(new THREE.Mesh(vbody, MAT.solid));
        const wl = new THREE.Mesh(wgeo, MAT.solid), wr = new THREE.Mesh(wgeo, MAT.solid); wr.scale.x = -1; o.add(wl); o.add(wr);
        scene.add(o);
        this.birds.push({ o, wl, wr, cx, cz, R: 18 + k * 9 + i * 3, h: 32 + k * 6, a: k * 2 + i, sp: 0.18 + k * 0.03 });
      }
    });
    // пламя костров
    this.fires = (w.campfires || []).map((f) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: '#ff8a30', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.position.set(f.x, f.y + 0.7, f.z); scene.add(sp);
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: '#ffe080', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      core.position.set(f.x, f.y + 0.45, f.z); scene.add(core);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 16).rotateX(-Math.PI / 2), MAT.pool.clone());
      pool.material.color.set('#ff9040'); pool.position.set(f.x, f.y + 0.08, f.z); scene.add(pool);
      return { ...f, sp, core, pool, e: 0 };
    });
  }
  // параметры поезда по расписанию: въезд с востока, остановка, отъезд на запад
  trainState(t) {
    const T1 = 28, STOP = 16, T2 = 34, P = 240, head = STATION_X + 10;
    t = t % P;
    if (t < T1) { const u = t / T1; return { x: 360 - (360 - head) * (1 - (1 - u) * (1 - u)), v: 2 * (360 - head) / T1 * (1 - u), on: true }; }
    if (t < T1 + STOP) return { x: head, v: 0, on: true, stopped: true };
    if (t < T1 + STOP + T2) { const u = (t - T1 - STOP) / T2; return { x: head - (head + 400) * u * u, v: 2 * (head + 400) / T2 * u, on: true }; }
    return { x: 1e9, v: 0, on: false };
  }
  update(dt, night) {
    const g = this.g, w = g.world;
    this.t += dt;
    // поезд
    this.trainT += dt;
    const st = this.trainState(this.trainT);
    this.trainSpeed = st.v; this.trainX = st.x;
    let x = st.x;
    for (const c of this.cars) {
      const cx = x + c.L / 2, vis = st.on && cx > -345 && cx < 345;
      c.o.visible = vis;
      if (vis) {
        const z = railZ(cx), a = Math.atan2(railZ(cx + 1) - railZ(cx - 1), 2);
        c.o.position.set(cx, RAIL_Y + 0.05, z);
        c.o.rotation.y = -Math.PI / 2 - a;
        c.x = cx; c.z = z;
      } else c.x = 1e9;
      x += c.L + 0.6;
    }
    const L0 = this.cars[0];
    this.lamp.visible = L0.o.visible;
    if (L0.o.visible) { this.lamp.position.set(L0.x - 4.3, RAIL_Y + 2.6, L0.z); this.lamp.material.opacity = 0.35 + night * 0.65; }
    if (st.on && L0.x < 1e8) {
      const d = g.camDist(L0.x, L0.z);
      // дым
      const rate = st.stopped ? 0.25 : 0.06 + 0.4 / (1 + st.v);
      this.smokeT = (this.smokeT || 0) - dt;
      if (this.smokeT <= 0 && d < 160) { this.smokeT = rate; g.fx.smoke(L0.x - 3.0, RAIL_Y + 4.4, L0.z, st.v); }
      // пыхтение и гудок
      if (st.v > 0.5 && d < 90) { this.chuffT -= dt * (0.6 + st.v * 0.12); if (this.chuffT <= 0) { this.chuffT = 1; g.audio.chuff(d); } }
      const ph = Math.floor(this.trainT / 240);
      if (this.whistled !== ph && L0.x < 240 && L0.x > 200) { this.whistled = ph; g.audio.trainWhistle(d); }
      if (this.departed !== ph && st.v > 0.5 && L0.x < STATION_X + 9) { this.departed = ph; g.audio.trainWhistle(d); }
    }
    // столкновения с игроками и лошадьми
    if (st.on) for (const pl of g.players.concat(g.horses || [])) {
      if (pl.rider) continue;
      for (const c of this.cars) {
        if (c.x > 1e8) continue;
        const dx = pl.x - c.x, dz = pl.z - c.z;
        if (Math.abs(dx) < c.L / 2 + 0.3 && Math.abs(dz) < 1.6) {
          const side = dz >= 0 ? 1 : -1;
          pl.z = c.z + side * 1.65; if (pl.horse) { pl.horse.z = pl.z; }
          if (st.v > 3 && pl.isPlayer && (pl.trainHitT || 0) < this.t) { pl.trainHitT = this.t + 1.5; pl.damage(40, null); g.notify(`${pl.name} сбит поездом!`, 'bad'); g.shake = 0.6; }
        }
      }
    }
    // перекати-поле
    const ct = g.camTarget;
    for (const wd of this.weeds) {
      if (dist(wd.x, wd.z, ct.x, ct.z) > 110 || night > 0.8) {
        if (night > 0.8) { wd.m.visible = false; continue; }
        const a = Math.random() * 6.28, d = 50 + Math.random() * 50;
        wd.x = ct.x - 70 + Math.random() * 30; wd.z = ct.z + Math.sin(a) * d;
        if (w.blockedAt(wd.x, wd.z)) continue;
        wd.vx = 2 + Math.random() * 3; wd.vz = (Math.random() - 0.5) * 1.5; wd.m.visible = true;
      }
      const gust = 0.7 + Math.sin(this.t * 0.5 + wd.ph) * 0.5;
      const nx = wd.x + wd.vx * gust * dt, nz = wd.z + wd.vz * gust * dt;
      if (w.blockedAt(nx, nz)) { wd.vz = -wd.vz + (Math.random() - 0.5) * 2; wd.vx *= 0.6; }
      else { wd.x = nx; wd.z = nz; }
      wd.vx = Math.max(1.2, wd.vx + (2.8 - wd.vx) * dt * 0.3);
      wd.ph += dt * wd.vx * gust * 2.2;
      const y = heightAt(wd.x, wd.z) + 0.38 * wd.s + Math.abs(Math.sin(wd.ph * 0.5)) * 0.35;
      wd.m.position.set(wd.x, y, wd.z); wd.m.rotation.set(0, 0, -wd.ph); wd.m.scale.setScalar(wd.s);
    }
    // грифы
    for (const b of this.birds) {
      b.a += dt * b.sp;
      b.o.visible = night < 0.7;
      const x = b.cx + Math.cos(b.a) * b.R, z = b.cz + Math.sin(b.a) * b.R;
      b.o.position.set(x, heightAt(b.cx, b.cz) + b.h + Math.sin(b.a * 3) * 1.5, z);
      b.o.rotation.set(0, -b.a, 0.35);
      const flap = Math.sin(this.t * 1.3 + b.a * 5) > 0.92 ? Math.sin(this.t * 14) * 0.5 : 0.08;
      b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
    }
    // костры
    for (const f of this.fires) {
      const fl = 0.85 + Math.sin(this.t * 13 + f.x) * 0.08 + Math.sin(this.t * 7.3) * 0.07 + (Math.random() - 0.5) * 0.08;
      f.sp.scale.set(2.2 * fl, 2.6 * fl, 1); f.core.scale.set(0.9 * fl, 1.3 * fl, 1);
      f.sp.material.opacity = 0.55 + night * 0.4; f.core.material.opacity = 0.9;
      f.pool.material.opacity = 0.08 + night * 0.4 * fl;
      f.e -= dt;
      if (f.e <= 0 && g.camDist(f.x, f.z) < 70) { f.e = 0.12; g.fx.ember(f.x, f.y + 0.6, f.z); }
    }
  }
}
