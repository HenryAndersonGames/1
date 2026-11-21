// Мир: рельеф, город (~30 построек), окрестности, растительность, столкновения.
import * as THREE from 'three';
import { GeoBuilder, MAT, SURF, makeSign, shade } from './models.js';
import * as BLD from './buildings.js';
import { heightAt, groundColor, forestMask, roadDist, creekZ, LOC, MAP_HALF, PLAY_HALF, WATER_Y } from './terrain.js';
import { mulberry32, clamp, smoothstep } from './util.js';
import { buildDetails } from './details.js';
import { railZ } from './terrain.js';

const BUILDINGS = [
  // северная сторона главной улицы
  { id: 'stable', type: 'barn', side: 'N', x: -86, w: 14, d: 16, h: 5, wall: '#6a4a34', sign: 'КОНЮШНЯ ХОУКА' },
  { id: 'smith', type: 'ff', side: 'N', x: -68, w: 12, d: 13, h: 4.6, wall: '#5e4a3a', sign: 'КУЗНИЦА БРАНДТА' },
  { id: 'undertaker', type: 'ff', side: 'N', x: -51, w: 11, d: 13, h: 4.8, wall: '#3e3634', sign: 'ГРОБОВЩИК', step: true },
  { id: 'sheriff', type: 'ff', side: 'N', x: -34, w: 12, d: 14, h: 4.8, wall: '#7a6450', sign: 'ШЕРИФ', bars: true },
  { id: 'barber', type: 'ff', side: 'N', x: -18, w: 11, d: 12, h: 4.4, wall: '#5f6a64', sign: 'ЦИРЮЛЬНЯ' },
  { id: 'saloon', type: 'ff', side: 'N', x: 19, w: 17, d: 18, h: 7.6, wall: '#7a4a32', sign: 'САЛУН «ПОСЛЕДНИЙ ШАНС»', twoStory: true, swing: true, upper: true, step: true },
  { id: 'hotel', type: 'ff', side: 'N', x: 38, w: 14, d: 16, h: 7.4, wall: '#56626a', sign: 'ОТЕЛЬ «ГРАНД»', twoStory: true, upper: true },
  { id: 'bank', type: 'bank', side: 'N', x: 55, w: 13, d: 15, h: 6, sign: 'БАНК ГРЕЙВСА' },
  { id: 'telegraph', type: 'ff', side: 'N', x: 71, w: 11, d: 12, h: 4.4, wall: '#6a5a48', sign: 'ПОЧТА · ТЕЛЕГРАФ' },
  { id: 'paper', type: 'ff', side: 'N', x: 86, w: 11, d: 12, h: 4.6, wall: '#55504a', sign: 'ВЕСТНИК' },
  // южная сторона
  { id: 'h_hank', type: 'shack', side: 'S', x: -86, w: 6, d: 5, wall: '#5a4a3a' },
  { id: 'store', type: 'ff', side: 'S', x: -70, w: 14, d: 14, h: 5, wall: '#7a6248', sign: 'ЛАВКА ПУЛОВ', step: true },
  { id: 'h_clare', type: 'house', side: 'S', x: -53, w: 9, d: 10, h: 3.6, wall: '#4e4844', shutters: '#2a2422' },
  { id: 'doctor', type: 'ff', side: 'S', x: -37, w: 12, d: 14, h: 5, wall: '#6c6458', sign: 'ДОКТОР А. ХОЛТ' },
  { id: 'school', type: 'house', side: 'S', x: -20, w: 11, d: 12, h: 4.2, wall: '#7e4a38', sign: 'ШКОЛА', porch: true, bell: true },
  { id: 'h_baker', type: 'house', side: 'S', x: 19, w: 10, d: 10, h: 3.6, wall: '#6a5a4a', dark: true },
  { id: 'h_billy', type: 'house', side: 'S', x: 34, w: 9, d: 9, h: 3.4, wall: '#5a6a5e', shutters: '#2e3a30' },
  { id: 'h_graves', type: 'house', side: 'S', x: 52, w: 16, d: 14, h: 6.2, wall: '#3f4a44', porch: true, attic: true, shutters: '#1e2622', roof: '#262222' },
  { id: 'h_empty1', type: 'house', side: 'S', x: 70, w: 9, d: 10, h: 3.6, wall: '#5e5248', dark: true },
  { id: 'h_empty2', type: 'house', side: 'S', x: 86, w: 10, d: 10, h: 3.6, wall: '#6b5f50', dark: true },
  // поперечная улица (север)
  { id: 'h_morris', type: 'house', side: 'W', z: -38, w: 10, d: 10, h: 3.6, wall: '#655544', dark: true },
  { id: 'h_lee', type: 'house', side: 'E', z: -38, w: 10, d: 10, h: 3.6, wall: '#5f6658', dark: true },
  { id: 'h_empty3', type: 'house', side: 'W', z: -54, w: 9, d: 9, h: 3.4, wall: '#6e5a46', dark: true },
  { id: 'h_emily', type: 'house', side: 'E', z: -54, w: 9, d: 9, h: 3.4, wall: '#7a6e5c', shutters: '#3a4a4e' },
  { id: 'church', type: 'church', ox: 0, oz: -67, ry: 0, w: 12, d: 22 },
  // поперечная улица (юг)
  { id: 'h_empty5', type: 'house', side: 'W', z: 32, w: 10, d: 10, h: 3.6, wall: '#5e4e40', dark: true },
  { id: 'h_empty6', type: 'house', side: 'W', z: 48, w: 9, d: 9, h: 3.4, wall: '#62584a', dark: true },
  // окрестности
  { id: 'farm', type: 'house', ox: 198, oz: 160, ry: -Math.PI / 2, w: 10, d: 11, h: 3.8, wall: '#7a6a52', porch: true, shutters: '#4a3a2a' },
  { id: 'barn', type: 'barn', ox: 197, oz: 182, ry: -Math.PI / 2, w: 12, d: 14, h: 5 },
  { id: 'hut', type: 'shack', ox: LOC.hut.x, oz: LOC.hut.z, ry: Math.PI * 0.2, w: 5, d: 4 },
];

const CELL = 16;

export class World {
  constructor(scene, quality = 'medium') {
    this.scene = scene;
    this.quality = quality;
    this.grid = new Map();
    this.anchors = {};
    this.doors = {};
    this.lamps = [];
    this.chunks = new Map();
    this.windowMeshes = [];
    this.rng = mulberry32(1887);
    this.buildTerrain();
    this.buildWater();
    this.buildTown();
    this.buildOutskirts();
    buildDetails(this);
    this.buildVegetation();
    this.finishChunks();
  }

  // ---------- столкновения ----------
  _cells(minX, minZ, maxX, maxZ, fn) {
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++)
      for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) fn(cx + ',' + cz);
  }
  _insert(c, minX, minZ, maxX, maxZ) {
    this._cells(minX, minZ, maxX, maxZ, (k) => { let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(c); });
  }
  addBox(minX, minZ, maxX, maxZ, tall = true) {
    const c = { t: 0, minX, minZ, maxX, maxZ, tall };
    this._insert(c, minX, minZ, maxX, maxZ);
    return c;
  }
  addCircle(x, z, r, tall = true) {
    const c = { t: 1, x, z, r, tall };
    this._insert(c, x - r, z - r, x + r, z + r);
    return c;
  }
  collide(x, z, r) {
    const seen = new Set();
    for (let iter = 0; iter < 2; iter++) {
      this._cells(x - r, z - r, x + r, z + r, (k) => {
        const arr = this.grid.get(k); if (!arr) return;
        for (const c of arr) {
          if (iter === 0 && seen.has(c)) continue; seen.add(c);
          if (c.t === 0) {
            const cx = clamp(x, c.minX, c.maxX), cz = clamp(z, c.minZ, c.maxZ);
            const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
            if (d2 < r * r) {
              if (d2 > 1e-8) { const d = Math.sqrt(d2); x = cx + dx / d * r; z = cz + dz / d * r; }
              else {
                const l = x - c.minX, rr = c.maxX - x, t = z - c.minZ, bb = c.maxZ - z;
                const m = Math.min(l, rr, t, bb);
                if (m === l) x = c.minX - r; else if (m === rr) x = c.maxX + r; else if (m === t) z = c.minZ - r; else z = c.maxZ + r;
              }
            }
          } else {
            const dx = x - c.x, dz = z - c.z, rr = r + c.r, d2 = dx * dx + dz * dz;
            if (d2 < rr * rr && d2 > 1e-8) { const d = Math.sqrt(d2); x = c.x + dx / d * rr; z = c.z + dz / d * rr; }
          }
        }
      });
    }
    x = clamp(x, -PLAY_HALF, PLAY_HALF); z = clamp(z, -PLAY_HALF, PLAY_HALF);
    return { x, z };
  }
  blockedAt(x, z, boxesOnly = false) {
    const arr = this.grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
    if (!arr) return false;
    for (const c of arr) {
      if (!c.tall || (boxesOnly && c.t !== 0)) continue;
      if (c.t === 0) { if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true; }
      else if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r * 0.6) return true;
    }
    return false;
  }
  lineBlocked(x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.7);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.blockedAt(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return true;
    }
    return false;
  }
  roofAt(x, z) {
    for (const r of this.roofs || []) if (x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ) return r.y;
    return null;
  }
  groundAt(x, z) {
    // мост
    if (Math.abs(x) < 3.2 && Math.abs(z - LOC.bridge.z) < 10) return Math.max(heightAt(x, z), 0.35);
    return heightAt(x, z);
  }

  // ---------- геометрия по чанкам ----------
  chunk(x, z) {
    const k = Math.floor(x / 64) + ',' + Math.floor(z / 64);
    let c = this.chunks.get(k);
    if (!c) { c = { s: new GeoBuilder(), g: new GeoBuilder() }; this.chunks.set(k, c); }
    return c;
  }
  // локальные координаты постройки -> мировые
  toWorld(id, lx, lz) {
    const a = this.anchors[id];
    const c = Math.cos(a.ry), s = Math.sin(a.ry);
    return { x: a.ox + lx * c + lz * s, z: a.oz - lx * s + lz * c };
  }
  place(x, z, ry, y, fn) {
    const c = this.chunk(x, z);
    const yy = y === undefined ? this.groundAt(x, z) : y;
    c.s.setBase(x, yy, z, ry); c.g.setBase(x, yy, z, ry);
    fn(c.s, c.g);
    c.s.setBase(null); c.g.setBase(null);
  }

  finishChunks() {
    for (const c of this.chunks.values()) {
      const sg = c.s.build();
      if (sg) {
        const m = new THREE.Mesh(sg, MAT.solid);
        m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false;
        this.scene.add(m);
      }
      const gg = c.g.build();
      if (gg) { const m = new THREE.Mesh(gg, MAT.glow); m.matrixAutoUpdate = false; this.scene.add(m); }
    }
    this.chunks.clear();
  }

  // ---------- рельеф ----------
  buildTerrain() {
    const seg = this.quality === 'low' ? 130 : this.quality === 'high' ? 260 : 200;
    const geo = new THREE.PlaneGeometry(MAP_HALF * 2, MAP_HALF * 2, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    const col = new Float32Array(pos.count * 3), det = new Float32Array(pos.count).fill(2);
    const r = mulberry32(42);
    for (let i = 0; i < pos.count; i++) {
      const rgb = groundColor(pos.getX(i), pos.getZ(i), pos.getY(i), Math.abs(nrm.getY(i)), r());
      col[i * 3] = Math.pow(rgb[0], 2.2); col[i * 3 + 1] = Math.pow(rgb[1], 2.2); col[i * 3 + 2] = Math.pow(rgb[2], 2.2);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aDet', new THREE.BufferAttribute(det, 1));
    geo.deleteAttribute('uv');
    const m = new THREE.Mesh(geo, MAT.solid);
    m.receiveShadow = true; m.matrixAutoUpdate = false;
    this.scene.add(m);
    this.terrain = m;
  }

  buildWater() {
    const pts = [];
    for (let x = -MAP_HALF; x <= MAP_HALF; x += 8) pts.push(x);
    const verts = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const x0 = pts[i], x1 = pts[i + 1], z0 = creekZ(x0), z1 = creekZ(x1), W = 9;
      verts.push(x0, WATER_Y, z0 - W, x0, WATER_Y, z0 + W, x1, WATER_Y, z1 - W);
      verts.push(x1, WATER_Y, z1 - W, x0, WATER_Y, z0 + W, x1, WATER_Y, z1 + W);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, MAT.water);
    m.renderOrder = 2;
    this.scene.add(m);
  }

  // ---------- город ----------
  buildTown() {
    for (const B of BUILDINGS) this.addBuilding(B);
    const r = this.rng;
    // фонари вдоль главной улицы
    for (let x = -92; x <= 92; x += 23) {
      for (const s of [-1, 1]) {
        if ((x / 23 + (s > 0 ? 1 : 0)) % 2 === 0) continue;
        this.addLamp(x + s * 4, s * 8.6, s > 0 ? Math.PI : 0);
      }
    }
    this.addLamp(-4.5, -62, Math.PI / 2);
    this.addLamp(4.5, 20, -Math.PI / 2);
    this.addLamp(4.5, 58, -Math.PI / 2);
    // колодец, водонапорная башня, виселица
    this.place(5, -22, 0, 0, (b) => BLD.well(b)); this.addCircle(5, -22, 1.4);
    this.place(17, 30, 0, 0, (b) => BLD.waterTower(b));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.addCircle(17 + sx * 1.6, 30 + sz * 1.6, 0.3);
    this.place(17, 48, 0, 0, (b) => BLD.gallows(b)); this.addBox(14.9, 45.9, 19.1, 50.1, false);
    // бочки, ящики, повозки
    const props = [
      ['barrel', -61.5, -9.5], ['barrel', -62.3, -10.4], ['barrel', -77.5, 9.8], ['crate', -63, 10], ['crate', -63.5, 11.2],
      ['barrel', 28.8, -10.8], ['barrel', 29.6, -9.8], ['crate', 9.5, -10.5], ['barrel', 46.5, -10],
      ['crate', -43.5, 9.6], ['barrel', 63.6, 10.5], ['crate', 77.8, -10.2], ['barrel', -28, 10.4], ['crate', 26, 10.6],
      ['trough', -86, -5.6], ['trough', 19, -5.4], ['trough', -34, -5.5],
    ];
    for (const [t, x, z] of props) {
      if (t === 'barrel') { this.place(x, z, 0, 0, (b) => BLD.barrel(b, 0, 0)); this.addCircle(x, z, 0.45); }
      else if (t === 'crate') { this.place(x, z, r() * 0.5, 0, (b) => BLD.crate(b, 0, 0, 0.9)); this.addCircle(x, z, 0.55); }
      else { this.place(x, z, 0, 0, (b) => BLD.trough(b)); this.addBox(x - 1.1, z - 0.4, x + 1.1, z + 0.4, false); }
    }
    this.place(-96, 7, 0.3, 0, (b) => BLD.wagon(b)); this.addBox(-98, 4, -94, 10);
    this.place(62, 5.8, Math.PI / 2 + 0.1, 0, (b) => BLD.wagon(b)); this.addBox(59.5, 4.5, 64.5, 7.2);
    // доска объявлений у шерифа
    this.place(-26, -9.6, 0, 0, (b) => {
      b.box('#4a3828', -0.9, 1.1, 0, 0.14, 2.2, 0.14); b.box('#4a3828', 0.9, 1.1, 0, 0.14, 2.2, 0.14);
      b.box('#5a4430', 0, 1.6, 0, 2.2, 1.2, 0.08);
      b.box('#d9cdb0', -0.5, 1.7, 0.05, 0.5, 0.65, 0.01); b.box('#cfc0a0', 0.15, 1.55, 0.05, 0.45, 0.6, 0.01);
      b.box('#e0d4b8', 0.7, 1.7, 0.05, 0.4, 0.55, 0.01);
    });
    // кладбищенская табличка-указатель
    this.signPost(104, -8, 'КЛАДБИЩЕ →', -0.9);
    this.signPost(-103, 7, '← ШАХТА', 0.4);
    this.signPost(6, 70, 'МИССИЯ ↓', 0);
    // ограда при въезде
    for (let i = 0; i < 6; i++) this.place(-102, -16 + i * 2.4, 0, 0, (b) => b.box('#4a3a2c', 0, 0.6, 0, 0.12, 1.2, 0.12));
  }

  signPost(x, z, text, ry) {
    this.place(x, z, ry, undefined, (b) => b.box('#4a3828', 0, 1.2, 0, 0.14, 2.4, 0.14));
    const s = makeSign(text, 2.2, 0.5, { bg: '#3a2a1a' });
    s.position.set(x, this.groundAt(x, z) + 2.1, z + 0.09);
    s.rotation.y = ry;
    this.scene.add(s);
  }

  addLamp(x, z, ry) {
    this.place(x, z, ry, undefined, (b, g) => BLD.lampPost(b, g));
    this.addCircle(x, z, 0.3);
    const lx = x + Math.cos(ry) * 0.6, lz = z - Math.sin(ry) * 0.6;
    const y = this.groundAt(x, z);
    const sp = new THREE.Sprite(MAT.lampGlow);
    sp.position.set(lx, y + 2.85, lz); sp.scale.set(3.2, 3.2, 1);
    this.scene.add(sp);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 14).rotateX(-Math.PI / 2), MAT.pool);
    pool.position.set(lx, y + 0.06, lz);
    this.scene.add(pool);
    this.lamps.push({ x: lx, z: lz });
  }

  addBuilding(B) {
    let ox, oz, ry;
    if (B.side === 'N') { ox = B.x; oz = -12; ry = 0; }
    else if (B.side === 'S') { ox = B.x; oz = 12; ry = Math.PI; }
    else if (B.side === 'W') { ox = -11; oz = B.z; ry = Math.PI / 2; }
    else if (B.side === 'E') { ox = 11; oz = B.z; ry = -Math.PI / 2; }
    else { ox = B.ox; oz = B.oz; ry = B.ry; }
    const oy = this.groundAt(ox, oz) - (B.side ? 0 : 0.2);
    this.anchors[B.id] = { ox, oz, ry, w: B.w, d: B.d, y: oy };
    let info;
    this.place(ox, oz, ry, oy, (b, g) => {
      const o = { ...B };
      switch (B.type) {
        case 'ff': info = BLD.falseFront(b, g, o); break;
        case 'bank': b.surface = SURF.FINE; info = BLD.bank(b, g, o); b.surface = SURF.WOOD; break;
        case 'house': info = BLD.house(b, g, o);
          if (B.bell) { b.box('#5a4433', 0, B.h + B.w * 0.38 + 0.6, -1.5, 1.2, 1.4, 1.2); b.cone('#3f322a', 0, B.h + B.w * 0.38 + 1.8, -1.5, 1.0, 1.0, 4, 0, Math.PI / 4, 0); b.cyl('#9a8a5a', 0, B.h + B.w * 0.38 + 0.6, -1.5, 0.2, 0.35, 0.5, 6); }
          break;
        case 'church': info = BLD.church(b, g, o); break;
        case 'barn': info = BLD.barn(b, g, o); break;
        case 'shack': info = BLD.shack(b, g, o); break;
      }
    });
    // столкновения корпуса
    const w = B.w, d = B.d;
    const pts = [this.toWorld(B.id, -w / 2, -d), this.toWorld(B.id, w / 2, 0)];
    this.addBox(Math.min(pts[0].x, pts[1].x), Math.min(pts[0].z, pts[1].z), Math.max(pts[0].x, pts[1].x), Math.max(pts[0].z, pts[1].z));
    if (B.type === 'church') {
      const t = [this.toWorld(B.id, -2.1, -3.7), this.toWorld(B.id, 2.1, 0.5)];
      this.addBox(Math.min(t[0].x, t[1].x), Math.min(t[0].z, t[1].z), Math.max(t[0].x, t[1].x), Math.max(t[0].z, t[1].z));
    }
    const porchD = (B.type === 'ff') ? 3.4 : (B.porch ? 3.0 : 1.6);
    // навесы крылец — для камеры
    if (B.type === 'ff' || B.porch) {
      const dep = B.type === 'ff' ? 2.9 : 2.3, ph = B.type === 'ff' ? (B.twoStory ? 3.3 : 3.0) : 2.6;
      const q = [this.toWorld(B.id, -B.w / 2 - 0.1, 0), this.toWorld(B.id, B.w / 2 + 0.1, dep)];
      (this.roofs || (this.roofs = [])).push({ minX: Math.min(q[0].x, q[1].x), maxX: Math.max(q[0].x, q[1].x), minZ: Math.min(q[0].z, q[1].z), maxZ: Math.max(q[0].z, q[1].z), y: oy + ph });
    }
    this.doors[B.id] = this.toWorld(B.id, 0, porchD);
    // вывеска
    if (B.sign && info && info.signY > 0) {
      const s = makeSign(B.sign, info.signW, Math.min(1.3, info.signW * 0.2));
      const p = this.toWorld(B.id, 0, info.signZ);
      s.position.set(p.x, oy + info.signY, p.z);
      s.rotation.y = ry;
      this.scene.add(s);
    }
  }

  // ---------- окрестности ----------
  buildOutskirts() {
    const r = this.rng;
    // мост
    const bz = LOC.bridge.z;
    this.place(0, bz, 0, 0, (b) => {
      b.box('#5e4632', 0, 0.25, 0, 6.2, 0.25, 20);
      for (let z = -9.5; z <= 9.5; z += 0.8) b.box('#6b5038', 0, 0.4, z, 6.2, 0.06, 0.6);
      for (const s of [-1, 1]) {
        b.box('#4a3828', s * 3.0, 1.0, 0, 0.15, 0.12, 20);
        for (let z = -9; z <= 9; z += 3) { b.box('#4a3828', s * 3.0, 0.6, z, 0.15, 1.0, 0.15); b.box('#3a2c20', s * 2.6, -1.2, z, 0.3, 3.2, 0.3); }
      }
    });
    for (const s of [-1, 1]) this.addBox(s * 3.0 - 0.15, bz - 10, s * 3.0 + 0.15, bz + 10, false);

    // кладбище
    const C = LOC.cemetery;
    this.cemeteryGraves = [];
    this.place(C.x, C.z, 0, undefined, (b) => {
      const W = 36, D = 28;
      for (let x = -W / 2; x <= W / 2; x += 2.4) for (const z of [-D / 2, D / 2]) {
        if (z > 0 && Math.abs(x) < 2.5) continue;
        b.box('#3a302a', x, 0.7, z, 0.12, 1.4, 0.12); b.box('#3a302a', x + 1.2, 1.2, z, 2.4, 0.08, 0.06);
      }
      for (let z = -D / 2; z <= D / 2; z += 2.4) for (const x of [-W / 2, W / 2]) {
        b.box('#3a302a', x, 0.7, z, 0.12, 1.4, 0.12); if (z < D / 2) b.box('#3a302a', x, 1.2, z + 1.2, 0.06, 0.08, 2.4);
      }
      b.box('#3a302a', -2.5, 1.5, D / 2, 0.2, 3, 0.2); b.box('#3a302a', 2.5, 1.5, D / 2, 0.2, 3, 0.2); b.box('#3a302a', 0, 3.0, D / 2, 5.4, 0.2, 0.2);
    });
    const cg = (lx, lz, kind, col) => this.place(C.x + lx, C.z + lz, 0, undefined, (b) => BLD.grave(b, kind, col));
    for (let i = 0; i < 12; i++) cg(-14 + i * 2.4, -9, 'cross', '#6a5440');
    for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) {
      if (row === 1 && i === 5) continue;
      cg(-13 + i * 4 + (row % 2), -2 + row * 4.5, r() > 0.5 ? 'stone' : 'cross', r() > 0.5 ? '#7a7468' : undefined);
    }
    // разрытая могила Лили
    this.lilyGrave = { x: C.x + 8, z: C.z + 2.5 };
    this.place(this.lilyGrave.x, this.lilyGrave.z, 0, undefined, (b) => {
      b.box('#8f8a80', 0, 0.45, 0, 0.6, 0.9, 0.16);
      b.cyl('#8f8a80', 0, 0.9, 0, 0.3, 0.3, 0.16, 8, Math.PI / 2, 0, 0);
      b.box('#120d0a', 0, 0.02, 1.1, 0.9, 0.04, 1.8);
      b.box('#5a3e2a', 1.0, 0.25, 1.1, 0.7, 0.5, 1.6);
      b.box('#4a3624', 0.2, 0.3, 2.2, 0.08, 1.4, 0.08, 0.6, 0, 0.3);
      b.box('#d8d0b8', -0.15, 0.03, 1.4, 0.5, 0.02, 0.12);
    });
    const fenceC = [[C.x - 18, C.z - 14, C.x + 18, C.z - 13.8], [C.x - 18, C.z + 13.8, C.x - 2.6, C.z + 14], [C.x + 2.6, C.z + 13.8, C.x + 18, C.z + 14],
      [C.x - 18.1, C.z - 14, C.x - 17.9, C.z + 14], [C.x + 17.9, C.z - 14, C.x + 18.1, C.z + 14]];
    for (const f of fenceC) this.addBox(...f, false);

    // ферма: поле, мельница, коровы
    const F = LOC.farm;
    this.place(F.x - 22, F.z - 14, 0, undefined, (b) => {
      for (let i = 0; i < 9; i++) b.box(i % 2 ? '#5a5a30' : '#6a5a34', 0, 0.2, -10 + i * 2.5, 22, 0.4, 1.2);
      for (let x = -12; x <= 12; x += 3) { b.box('#5a4433', x, 0.6, -12, 0.12, 1.2, 0.12); b.box('#5a4433', x, 0.6, 12, 0.12, 1.2, 0.12); }
      b.box('#5a4433', 0, 1.0, -12, 24, 0.08, 0.06); b.box('#5a4433', 0, 1.0, 12, 24, 0.08, 0.06);
    });
    this.addBox(F.x - 34, F.z - 26.1, F.x - 10, F.z - 25.9, false); this.addBox(F.x - 34, F.z - 2.1, F.x - 10, F.z - 1.9, false);
    const wm = { x: F.x - 4, z: F.z + 22 };
    this.place(wm.x, wm.z, 0, undefined, (b) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('#5a4a3a', sx * 1.1, 4.5, sz * 1.1, 0.2, 9.2, 0.2, sz * 0.1, 0, -sx * 0.1);
      b.box('#4a3a2e', 0, 9.2, 0, 1.4, 0.8, 1.4);
      b.box('#6a5a48', 0, 9.6, -1.6, 0.1, 0.8, 2.4);
    });
    this.addCircle(wm.x, wm.z, 1.6);
    const blades = new GeoBuilder();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      blades.box('#bdb29a', Math.sin(a) * 1.6, Math.cos(a) * 1.6, 0, 0.5, 3.2, 0.04, 0, 0, -a);
    }
    blades.cyl('#3a3028', 0, 0, 0, 0.25, 0.25, 0.3, 8, Math.PI / 2, 0, 0);
    this.windmill = new THREE.Mesh(blades.build(), MAT.solid);
    this.windmill.position.set(wm.x, this.groundAt(wm.x, wm.z) + 9.4, wm.z + 0.9);
    this.scene.add(this.windmill);
    const cows = [[F.x - 6, F.z - 8], [F.x - 9, F.z + 6], [F.x + 14, F.z - 18]];
    for (const [x, z] of cows) { this.place(x, z, r() * 6, undefined, (b) => BLD.cow(b)); this.addCircle(x, z, 1.0); }
    this.deadCow = { x: F.x - 38, z: F.z - 12 };
    this.place(this.deadCow.x, this.deadCow.z, 0.4, undefined, (b) => BLD.cow(b, true));
    this.place(F.x - 2, F.z - 4, 0.2, undefined, (b) => BLD.trough(b));
    this.place(F.x + 6, F.z + 2, 0, undefined, (b) => BLD.wagon(b));

    // шахта «Милость Господня»
    const M = { x: -236, z: -70 };
    this.anchors.mine = { ox: M.x, oz: M.z, ry: Math.PI / 2, w: 6, d: 6 };
    this.place(M.x, M.z, Math.PI / 2, undefined, (b) => {
      b.box('#0a0807', 0, 2.2, -2.5, 4.6, 4.6, 5);
      for (const s of [-1, 1]) { b.box('#4a3828', s * 2.4, 2.3, 0.2, 0.45, 4.6, 0.45); b.box('#3f2f22', s * 2.4, 2.3, -1.5, 0.4, 4.6, 0.4); }
      b.box('#4a3828', 0, 4.75, 0.2, 5.6, 0.5, 0.55);
      b.box('#5a4430', -0.6, 2.0, 0.5, 4.4, 0.25, 0.1, 0, 0, 0.35);
      b.box('#5a4430', 0.4, 3.0, 0.5, 4.2, 0.25, 0.1, 0, 0, -0.25);
      b.box('#5a4430', 0.9, 1.1, 0.5, 2.6, 0.25, 0.1, 0, 0, 0.6);
      for (let i = 0; i < 9; i++) b.rock('#6e5d4c', (r() - 0.5) * 9, 0.6 + r() * 1.5, -2 + (r() - 0.5) * 3, 1 + r() * 1.4);
      for (let i = 0; i < 7; i++) b.rock('#5f5040', -4 - r() * 3, 4 + r() * 2.5, -3 - r() * 3, 1.5 + r() * 1.5);
      for (let i = 0; i < 7; i++) b.rock('#5f5040', 4 + r() * 3, 4 + r() * 2.5, -3 - r() * 3, 1.5 + r() * 1.5);
      for (const s of [-0.5, 0.5]) b.box('#3a3330', s, 0.08, 6, 0.1, 0.1, 14);
      for (let z = 0; z < 13; z += 1.0) b.box('#4a3828', 0, 0.04, z, 1.6, 0.06, 0.2);
      // вагонетка
      b.box('#4a4038', 0, 0.75, 4.5, 1.2, 0.8, 1.8); b.box('#2a2420', 0, 1.15, 4.5, 1.0, 0.1, 1.6);
      for (const s of [-1, 1]) for (const zz of [3.9, 5.1]) b.cyl('#2a2420', s * 0.55, 0.28, zz, 0.25, 0.25, 0.1, 8, 0, 0, Math.PI / 2);
      b.cone('#7a6a5a', 3.5, 0.6, 6, 1.6, 1.2, 6); b.cone('#6a5a4a', -3.8, 0.5, 7, 1.3, 1.0, 6);
    });
    {
      const a = this.toWorld('mine', -3, -5), c = this.toWorld('mine', 3, 0.5);
      this.addBox(Math.min(a.x, c.x), Math.min(a.z, c.z), Math.max(a.x, c.x), Math.max(a.z, c.z));
      const cart = this.toWorld('mine', 0, 4.5); this.addCircle(cart.x, cart.z, 1.0);
      const s = makeSign('МИЛОСТЬ ГОСПОДНЯ', 4.2, 0.7, { bg: '#2a2018' });
      const p = this.toWorld('mine', 0, 0.5);
      s.position.set(p.x, this.groundAt(M.x, M.z) + 5.4, p.z); s.rotation.y = Math.PI / 2;
      this.scene.add(s);
    }

    // руины миссии Сан-Себастьян
    const Mi = LOC.mission;
    this.anchors.mission = { ox: Mi.x, oz: Mi.z, ry: Math.PI, w: 20, d: 16 };
    const adobe = '#b08060';
    const walls = [[-10, -16, -10, -2, 3.2], [10, -16, 10, -6, 2.0], [10, -3, 10, 0, 1.0], [-10, -16, 3, -16, 2.6], [6, -16, 10, -16, 1.4], [-10, 0, -3, 0, 4.2], [3, 0, 10, 0, 3.6]];
    this.place(Mi.x, Mi.z, Math.PI, undefined, (b) => {
      b.surface = SURF.FINE;
      for (const [x0, z0, x1, z1, h] of walls) {
        const len = Math.hypot(x1 - x0, z1 - z0), steps = Math.ceil(len / 2);
        for (let i = 0; i < steps; i++) {
          const t = (i + 0.5) / steps, hh = h * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + x0)));
          const horiz = Math.abs(x1 - x0) > 0.1;
          b.box(shade(adobe, 0.9 + (i % 3) * 0.06), x0 + (x1 - x0) * t, hh / 2, z0 + (z1 - z0) * t, horiz ? len / steps + 0.02 : 0.8, hh, horiz ? 0.8 : len / steps + 0.02);
        }
      }
      // колокольня-эспадания
      b.box(adobe, -2.6, 4.5, 0, 1.2, 9, 1.0); b.box(adobe, 2.6, 4.5, 0, 1.2, 9, 1.0); b.box(adobe, 0, 6.6, 0, 4.0, 0.9, 1.0);
      b.box(adobe, 0, 9.3, 0, 6.4, 0.8, 1.0); b.box(adobe, 0, 10.3, 0, 2.4, 1.2, 1.0);
      b.box(adobe, -1.4, 8.2, 0, 0.6, 1.6, 1.0); b.box(adobe, 1.4, 8.2, 0, 0.6, 1.6, 1.0);
      b.box('#3a2c22', 0, 11.3, 0, 0.16, 1.0, 0.16); b.box('#3a2c22', 0, 11.4, 0, 0.6, 0.12, 0.12);
      b.box('#3a2c22', 0, 7.9, 0, 1.8, 0.12, 0.12);
      // упавший колокол
      b.cyl('#a9aeb2', 2.5, 0.55, 4.0, 0.45, 0.85, 1.2, 10, 0.3, 0, 1.4);
      for (let i = 0; i < 10; i++) b.rock(adobe, (r() - 0.5) * 18, 0.3, -2 - r() * 13, 0.4 + r() * 0.6);
      b.box('#5a4430', -6, 0.15, -8, 2.5, 0.3, 0.6, 0, 0.4, 0); b.box('#5a4430', -4, 0.15, -10, 2.2, 0.3, 0.6, 0, -0.3, 0);
      b.box('#4a3828', 5, 1.1, -12, 0.15, 2.2, 0.15, 0.3, 0, 0.2); b.box('#4a3828', 5, 1.6, -12, 0.9, 0.12, 0.12, 0.3, 0, 0.2);
      b.surface = SURF.WOOD;
    });
    for (const [x0, z0, x1, z1] of walls) {
      const a = this.toWorld('mission', x0, z0), c = this.toWorld('mission', x1, z1);
      this.addBox(Math.min(a.x, c.x) - 0.4, Math.min(a.z, c.z) - 0.4, Math.max(a.x, c.x) + 0.4, Math.max(a.z, c.z) + 0.4);
    }
    for (const s of [-2.6, 2.6]) { const p = this.toWorld('mission', s, 0); this.addCircle(p.x, p.z, 0.8); }
    this.missionBell = this.toWorld('mission', 2.5, 4.0);

    // Яма
    const P = LOC.pit;
    const py = heightAt(P.x + 12, P.z);
    this.place(P.x, P.z, 0, py, (b, g) => {
      for (let i = 0; i < 11; i++) {
        const a = i / 11 * Math.PI * 2, rr = 10.5;
        const h = 2.2 + r() * 1.8;
        b.box(shade('#5a5450', 0.8 + r() * 0.3), Math.cos(a) * rr, h / 2 - 0.3, Math.sin(a) * rr, 0.9, h, 0.6, (r() - 0.5) * 0.2, -a, (r() - 0.5) * 0.3);
      }
      b.cyl('#030202', 0, -6.5, 0, 6.5, 6.5, 0.3, 14);
      // алтарь
      b.box('#4a4440', -9, 0.5, 6, 2.6, 1.0, 1.4, 0, 0.5, 0);
      b.box('#3a0a08', -9, 1.02, 6, 1.6, 0.04, 0.8, 0, 0.5, 0);
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9, x = -9 + Math.cos(a) * 1.9, z = 6 + Math.sin(a) * 1.4;
        b.cyl('#141010', x, 0.25, z, 0.07, 0.08, 0.5, 6);
        g.box('#ffb050', x, 0.56, z, 0.05, 0.12, 0.05);
      }
      for (let i = 0; i < 14; i++) b.box('#d8ccb0', (r() - 0.5) * 16, 0.05, (r() - 0.5) * 16, 0.5 * r() + 0.2, 0.08, 0.08, 0, r() * 3, 0);
      for (let i = 0; i < 6; i++) b.box('#6a1a14', (r() - 0.5) * 18, 1.2 + r(), (r() - 0.5) * 18, 0.12, 0.9, 0.02, 0, r() * 3, 0.2);
    });
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; this.addCircle(P.x + Math.cos(a) * 10.5, P.z + Math.sin(a) * 10.5, 0.6); }
    this.addCircle(P.x, P.z, 5.2, false);
    this.altar = { x: P.x - 9, z: P.z + 6 };
    this.addCircle(this.altar.x, this.altar.z, 1.2, false);

    // хижина Изи — хлам вокруг
    const Hh = LOC.hut;
    this.place(Hh.x + 3, Hh.z + 2, 0, undefined, (b) => {
      BLD.barrel(b, 0, 0); BLD.crate(b, 1.0, 0.6, 0.7);
      b.box('#5a4433', -2, 0.6, 1, 0.08, 1.2, 0.08, 0, 0, 0.5); b.box('#888', -1.7, 1.15, 1, 0.5, 0.08, 0.1, 0, 0, 0.5);
      b.cyl('#3a3028', -4, 0.3, -1, 0.5, 0.5, 0.15, 8); b.ico('#2a2420', -4, 0.5, -1, 0.3);
      BLD.cowSkull(b);
    });
    this.addCircle(Hh.x + 3, Hh.z + 2, 0.6);

    // телеграфные столбы вдоль восточной дороги
    const poles = [];
    for (let x = 110; x < 380; x += 26) {
      const z = (x < 180 ? 8 * (x - 104) / 76 : 8 + (x - 180) * 0.12) - 7;
      poles.push([x, z]);
      this.place(x, z, 0, undefined, (b) => { b.box('#4a3a2e', 0, 3.5, 0, 0.22, 7, 0.22); b.box('#4a3a2e', 0, 6.6, 0, 0.12, 0.12, 1.6); });
      this.addCircle(x, z, 0.3);
    }
    for (let i = 0; i < poles.length - 1; i++) {
      const [x0, z0] = poles[i], [x1, z1] = poles[i + 1];
      const y0 = this.groundAt(x0, z0) + 6.65, y1 = this.groundAt(x1, z1) + 6.65;
      const len = Math.hypot(x1 - x0, z1 - z0, y1 - y0);
      for (const s of [-0.6, 0.6]) {
        const c = this.chunk(x0, z0);
        c.s.box('#1a1a1a', (x0 + x1) / 2, (y0 + y1) / 2 - 0.25, (z0 + z1) / 2 + s, len, 0.03, 0.03, 0, -Math.atan2(z1 - z0, x1 - x0), Math.atan2(y1 - y0, Math.hypot(x1 - x0, z1 - z0)));
      }
    }

    // тайники и находки в пустыне
    this.caches = [
      { id: 'c_bridge', x: 4.5, z: LOC.bridge.z + 8 },
      { id: 'c_skeleton', x: 150, z: 255 },
      { id: 'c_wagon', x: -140, z: 140 },
      { id: 'c_lookout', x: -270, z: -170 },
      { id: 'c_tree', x: 300, z: -60 },
      { id: 'c_skull', x: 90, z: -150 },
      { id: 'c_creek', x: -190, z: creekZ(-190) + 6 },
    ];
    this.place(150, 255, 0.6, undefined, (b) => BLD.skeleton(b, 0.6));
    this.place(-140, 140, 0.9, undefined, (b) => {
      b.box('#4a3628', 0, 0.5, 0, 2.0, 0.4, 4.0, 0.1, 0, 0.25);
      b.cyl('#3a2c20', 1.1, 0.7, 1.3, 0.7, 0.7, 0.1, 10, 0, 0, Math.PI / 2);
      b.cyl('#3a2c20', -0.6, 0.08, -1.6, 0.7, 0.7, 0.1, 10, 0, 0.3, 0.1);
      b.box('#cfc4a8', 0.2, 0.9, -0.5, 1.6, 0.04, 2.4, 0.2, 0, 0.3);
      BLD.crate(b, -1.8, 1.5, 0.7, 0.4);
    });
    this.addBox(-142, 137, -138, 143);
    this.place(90, -150, 0, undefined, (b) => { BLD.cowSkull(b); b.rock('#6e5d4c', 1.2, 0.3, -0.5, 0.6); });
    this.place(-270, -170, 0, undefined, (b) => { b.box('#4a3828', 0, 0.9, 0, 0.12, 1.8, 0.12); b.box('#8a2a20', 0.3, 1.6, 0, 0.6, 0.4, 0.02); BLD.crate(b, 0.8, 0.6, 0.6); });
    this.place(4.5, LOC.bridge.z + 8, 0, undefined, (b) => BLD.crate(b, 0, 0, 0.6, 0.3));
    this.place(-190, creekZ(-190) + 6, 0, undefined, (b) => { b.rock('#6a5a48', 0, 0.4, 0, 0.9); b.box('#4a3a2a', 0.8, 0.15, 0.3, 0.5, 0.3, 0.35); });
  }

  // ---------- растительность (инстансы) ----------
  buildVegetation() {
    const r = mulberry32(777);
    const types = {
      pine: this.vegGeo('pine'), dead: this.vegGeo('dead'), cactus: this.vegGeo('cactus'),
      rock: this.vegGeo('rock'), bush: this.vegGeo('bush'), cotton: this.vegGeo('cotton'), grass: this.vegGeo('grass'), reed: this.vegGeo('reed'),
    };
    const inst = {};
    const add = (type, x, z, s, ry) => {
      const R = type === 'grass' || type === 'reed' ? 90 : 200, key = type + ':' + Math.floor(x / R) + ',' + Math.floor(z / R);
      (inst[key] || (inst[key] = { type, list: [] })).list.push([x, z, s, ry]);
    };
    const clearOf = (x, z, pad) => {
      if (roadDist(x, z).d < pad) return false;
      if (Math.hypot(x / 1.3, z) < 120) return false;
      for (const k of ['cemetery', 'farm', 'mission', 'hut']) { const L = LOC[k]; if (Math.hypot(x - L.x, z - L.z) < (k === 'farm' ? 48 : 26)) return false; }
      if (Math.hypot(x + 232, z + 70) < 18) return false;
      if (Math.hypot(x - LOC.pit.x, z - LOC.pit.z) < 14) return false;
      if (Math.abs(z - creekZ(x)) < 8) return false;
      if (Math.abs(z - railZ(x)) < 9) return false;
      for (const c of this.clearZones || []) if (Math.hypot(x - c.x, z - c.z) < c.r) return false;
      return true;
    };
    const N = this.quality === 'low' ? 0.6 : 1;
    // лес
    for (let i = 0; i < 9000 * N && (inst.__pines || 0) < 900 * N; i++) {
      const x = (r() - 0.5) * 2 * PLAY_HALF, z = (r() - 0.5) * 2 * PLAY_HALF;
      const fm = forestMask(x, z);
      if (fm < 0.45 || !clearOf(x, z, 2.5)) continue;
      const h = heightAt(x, z);
      if (h > 42) continue;
      const nearPit = Math.hypot(x - LOC.pit.x, z - LOC.pit.z) < 60;
      const isCreek = Math.abs(z - creekZ(x)) < 26 && Math.hypot(x - 225, z + 225) > 180;
      if (isCreek) add('cotton', x, z, 0.8 + r() * 0.6, r() * 6);
      else if (nearPit && r() < 0.55) add('dead', x, z, 0.9 + r() * 0.5, r() * 6);
      else add('pine', x, z, 0.75 + r() * 0.7, r() * 6);
      inst.__pines = (inst.__pines || 0) + 1;
    }
    // пустыня
    const scatter = (type, count, cond) => {
      let placed = 0;
      for (let i = 0; i < count * 12 && placed < count; i++) {
        const x = (r() - 0.5) * 2 * (PLAY_HALF + 30), z = (r() - 0.5) * 2 * (PLAY_HALF + 30);
        if (!clearOf(x, z, 2)) continue;
        const h = heightAt(x, z);
        if (!cond(x, z, h)) continue;
        const s = type === 'rock' ? (h > 10 ? 1 + r() * 3 : 0.5 + r() * 1.3) : 0.7 + r() * 0.6;
        add(type, x, z, s, r() * 6);
        placed++;
      }
    };
    scatter('cactus', Math.round(260 * N), (x, z, h) => forestMask(x, z) < 0.2 && h < 14);
    scatter('rock', Math.round(380 * N), (x, z, h) => forestMask(x, z) < 0.5 && (h > 6 || r() < 0.35));
    scatter('bush', Math.round(420 * N), (x, z, h) => forestMask(x, z) < 0.4 && h < 25);
    scatter('dead', Math.round(50 * N), (x, z, h) => forestMask(x, z) < 0.3 && h < 20);
    // камыш и осока у ручья
    for (let i = 0; i < 1400 * N; i++) {
      const x = (r() - 0.5) * 2 * PLAY_HALF, side = r() < 0.5 ? -1 : 1;
      const z = creekZ(x) + side * (3.2 + r() * 5.5);
      if (Math.abs(x) < 6 || heightAt(x, z) > 2) continue;
      add('reed', x, z, 0.7 + r() * 0.7, r() * 6);
    }
    // сухая трава — в том числе на окраинах города
    if (this.quality !== 'low') {
      const G = this.quality === 'high' ? 3200 : 1800;
      let placed = 0;
      for (let i = 0; i < G * 6 && placed < G; i++) {
        const x = (r() - 0.5) * 2 * PLAY_HALF * (i % 3 ? 0.55 : 1), z = (r() - 0.5) * 2 * PLAY_HALF * (i % 3 ? 0.55 : 1);
        if (roadDist(x, z).d < 0.5 || Math.abs(z - creekZ(x)) < 4) continue;
        const td = Math.hypot(x / 1.3, z);
        if (td < 75 && Math.abs(z) < 30) continue;
        if (this.blockedAt(x, z)) continue;
        if (heightAt(x, z) > 25 || forestMask(x, z) > 0.6) continue;
        add('grass', x, z, 0.8 + r() * 0.7, r() * 6);
        placed++;
      }
    }
    // приметное дерево у тайника и на кладбище
    add('dead', 300, -62, 1.4, 0.3);
    add('dead', LOC.cemetery.x - 12, LOC.cemetery.z + 8, 1.2, 1.1);
    delete inst.__pines;

    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    for (const key in inst) {
      const { type, list } = inst[key];
      const im = new THREE.InstancedMesh(types[type], MAT.solid, list.length);
      im.castShadow = type === 'pine' || type === 'dead' || type === 'cactus' || type === 'cotton';
      if (type === 'grass') im.frustumCulled = true;
      im.receiveShadow = type === 'rock';
      list.forEach(([x, z, s, ry], i) => {
        q.setFromAxisAngle(v.set(0, 1, 0), ry);
        const y = heightAt(x, z) - (type === 'rock' ? s * 0.3 : 0.05);
        m4.compose(v.set(x, y, z), q, sc.set(s, type === 'rock' ? s * (0.6 + (i % 5) * 0.1) : s, s));
        im.setMatrixAt(i, m4);
        const k = 0.85 + ((i * 7919) % 100) / 100 * 0.3;
        col.setRGB(k, k, k * (0.95 + ((i * 31) % 10) / 100));
        im.setColorAt(i, col);
        // столкновения
        if (type === 'pine' || type === 'cotton') this.addCircle(x, z, 0.5 * s);
        else if (type === 'dead') this.addCircle(x, z, 0.35 * s);
        else if (type === 'cactus') this.addCircle(x, z, 0.42 * s);
        else if (type === 'rock' && s > 1.1) this.addCircle(x, z, 0.85 * s, s > 1.8);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      this.scene.add(im);
    }
  }

  vegGeo(type) {
    const b = new GeoBuilder(SURF.FINE);
    switch (type) {
      case 'pine':
        b.cyl('#4a3526', 0, 1.6, 0, 0.12, 0.3, 3.2, 9);
        for (let i = 0; i < 6; i++) {
          const y = 2.0 + i * 0.95, r = 2.3 - i * 0.33;
          b.cone(i % 2 ? '#2e3e2a' : '#344832', Math.sin(i * 2.4) * 0.08, y + 0.6, Math.cos(i * 2.4) * 0.08, r, 1.9, 11, 0, i * 0.7, 0);
        }
        b.cone('#3c5236', 0, 8.1, 0, 0.5, 1.4, 9);
        break;
      case 'cotton':
        b.cyl('#4a3c2e', 0, 1.5, 0, 0.22, 0.42, 3.0, 10);
        b.limb('#4a3c2e', 0, 2.6, 0, 1.2, 4.0, 0.3, 0.18, 0.08, 7);
        b.limb('#4a3c2e', 0, 2.8, 0, -1.0, 4.2, -0.6, 0.16, 0.07, 7);
        [[0, 4.6, 0, 2.1, 1.5], [1.4, 4.9, 0.5, 1.4, 1.1], [-1.2, 4.8, -0.8, 1.5, 1.1], [0.3, 5.6, -0.4, 1.3, 1.0], [-0.4, 4.2, 1.0, 1.2, 0.9]].forEach(([x, y, z, r, h], i) =>
          b.sph(i % 2 ? '#56623a' : '#606c40', x, y, z, r, h, r, 10));
        break;
      case 'dead':
        b.cyl('#3a322c', 0, 2.4, 0, 0.1, 0.32, 4.8, 9);
        b.limb('#3a322c', 0, 2.6, 0, 1.4, 4.0, 0.2, 0.12, 0.04, 6);
        b.limb('#3a322c', 1.0, 3.6, 0.15, 1.6, 4.6, 0.6, 0.06, 0.02, 5);
        b.limb('#3a322c', 0, 2.2, 0, -1.2, 3.4, 0.5, 0.11, 0.035, 6);
        b.limb('#3a322c', 0, 3.6, 0, 0.3, 5.4, -1.0, 0.09, 0.03, 6);
        b.limb('#3a322c', 0, 4.2, 0, -0.8, 5.6, 0.2, 0.07, 0.02, 5);
        b.limb('#3a322c', -0.8, 3.1, 0.35, -1.5, 3.6, 1.1, 0.05, 0.015, 5);
        break;
      case 'cactus':
        b.cyl('#4c6638', 0, 1.6, 0, 0.3, 0.34, 3.2, 12);
        b.sph('#4c6638', 0, 3.2, 0, 0.3, 0.24, 0.3, 12);
        for (let i = 0; i < 6; i++) b.box('#5a7444', Math.sin(i * 1.05) * 0.32, 1.6, Math.cos(i * 1.05) * 0.32, 0.03, 3.1, 0.03, 0, i * 1.05, 0);
        b.limb('#4f6a3a', 0.2, 1.4, 0, 0.75, 1.55, 0, 0.17, 0.17, 10); b.sph('#4f6a3a', 0.78, 1.55, 0, 0.17, 0.17, 0.17, 10);
        b.cyl('#4f6a3a', 0.8, 2.15, 0, 0.16, 0.18, 1.2, 10); b.sph('#4f6a3a', 0.8, 2.75, 0, 0.16, 0.13, 0.16, 10);
        b.limb('#4a6436', -0.2, 1.8, 0, -0.65, 1.95, 0.1, 0.15, 0.15, 10); b.sph('#4a6436', -0.68, 1.95, 0.1, 0.15, 0.15, 0.15, 10);
        b.cyl('#4a6436', -0.7, 2.35, 0.1, 0.14, 0.15, 0.8, 10); b.sph('#4a6436', -0.7, 2.75, 0.1, 0.14, 0.11, 0.14, 10);
        break;
      case 'rock':
        b.rock('#7b6a58', 0, 0.5, 0, 1, 0.8, 1);
        b.rock('#6e5e4e', 0.6, 0.3, 0.4, 0.5, 0.45, 0.5);
        b.rock('#857360', -0.5, 0.2, -0.3, 0.4, 0.3, 0.45);
        break;
      case 'bush':
        b.sph('#77744a', 0, 0.35, 0, 0.7, 0.42, 0.7, 9);
        b.sph('#6a6a42', 0.45, 0.3, 0.2, 0.45, 0.33, 0.45, 8);
        b.sph('#827c4e', -0.3, 0.32, -0.35, 0.42, 0.3, 0.4, 8);
        for (let i = 0; i < 5; i++) b.limb('#5a4a36', 0, 0, 0, Math.sin(i * 1.3) * 0.6, 0.5, Math.cos(i * 1.3) * 0.6, 0.03, 0.01, 4);
        break;
      case 'reed':
        for (let i = 0; i < 11; i++) {
          const a = i * 0.57, rr = 0.05 + (i % 4) * 0.08;
          b.cone(i % 3 ? '#5a6a34' : '#6e7a3e', Math.cos(a) * rr, 0.55 + (i % 3) * 0.1, Math.sin(a) * rr, 0.03, 1.1 + (i % 3) * 0.25, 3, Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15);
          if (i % 4 === 0) b.cyl('#4a3220', Math.cos(a) * rr * 1.2, 1.3 + (i % 3) * 0.15, Math.sin(a) * rr * 1.2, 0.04, 0.04, 0.22, 6);
        }
        break;
      case 'grass':
        for (let i = 0; i < 9; i++) {
          const a = i * 0.7, rr = 0.08 + (i % 3) * 0.1;
          b.cone(i % 3 ? '#a89660' : '#8a8048', Math.cos(a) * rr, 0.22 + (i % 4) * 0.04, Math.sin(a) * rr, 0.035, 0.45 + (i % 4) * 0.1, 3, Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4);
        }
        break;
    }
    return b.build();
  }

  update(dt, night) {
    if (this.windmill) this.windmill.rotation.z += dt * 0.6;
    MAT.lampGlow.opacity = night * 0.85;
    MAT.pool.opacity = night * 0.35;
    // окна: днём тёмное стекло, ночью тёплый свет
    const d = 1 - night;
    MAT.glow.color.setRGB(0.16 * d + 1.0 * night, 0.17 * d + 0.8 * night, 0.19 * d + 0.55 * night);
  }
}
