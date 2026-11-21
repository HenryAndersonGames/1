// Лошади: модель, аллюры (шаг, рысь, галоп), езда с инерцией, подзыв свистом.
import * as THREE from 'three';
import { GeoBuilder, MAT, SURF, shade } from './models.js';
import { angleDiff, clamp, dist } from './util.js';
import { WATER_Y } from './terrain.js';

export const HORSE_COATS = [
  { coat: '#5e3420', mane: '#1a1210', socks: false, name: 'гнедая' },
  { coat: '#8a4a22', mane: '#5a2a14', socks: true, name: 'рыжая' },
  { coat: '#1e1916', mane: '#0e0b0a', socks: false, name: 'вороная' },
  { coat: '#8c8680', mane: '#3a3532', socks: false, name: 'серая' },
  { coat: '#c49a5c', mane: '#efe2c4', socks: true, name: 'буланая' },
  { coat: '#6e5442', mane: '#2a1e16', socks: true, name: 'мышастая' },
];
const PI = Math.PI;
const FRONT = [0.6, 1.12], BACK = [-0.62, 1.18];

function buildHorse(C, blanket) {
  const F = SURF.FINE;
  const b = new GeoBuilder(F);
  const coat = C.coat, dk = shade(coat, 0.8), mane = C.mane, leather = '#3a2414';
  // корпус
  b.sph(coat, 0, 1.3, 0, 0.36, 0.4, 0.82, 20);
  b.sph(dk, 0, 1.12, 0, 0.32, 0.26, 0.66, 16);
  b.sph(coat, 0, 1.34, 0.6, 0.33, 0.42, 0.36, 16);
  b.sph(coat, 0, 1.38, -0.62, 0.37, 0.42, 0.4, 16);
  // шея и голова
  b.limb(coat, 0, 1.45, 0.74, 0, 2.0, 1.12, 0.25, 0.15, 14);
  b.sph(coat, 0, 1.78, 0.95, 0.17, 0.32, 0.2, 14, -0.7);
  b.sph(coat, 0, 2.03, 1.18, 0.12, 0.14, 0.17, 14);
  b.limb(coat, 0, 2.02, 1.22, 0, 1.73, 1.55, 0.125, 0.085, 14);
  b.sph(shade(coat, 0.9), 0, 1.72, 1.56, 0.088, 0.085, 0.1, 12);
  for (const s of [-1, 1]) {
    b.sph('#0c0908', s * 0.045, 1.69, 1.64, 0.018, 0.022, 0.012, 6);
    b.sph('#0e0b0a', s * 0.1, 2.05, 1.24, 0.022, 0.026, 0.022, 8);
    b.cone(coat, s * 0.065, 2.2, 1.12, 0.035, 0.13, 8, -0.25, 0, s * 0.25);
    b.sph(shade(coat, 1.08), s * 0.1, 1.95, 1.17, 0.06, 0.1, 0.09, 10);
  }
  // грива
  for (let i = 0; i < 10; i++) {
    const t = i / 9, y = 2.12 - t * 0.6, z = 1.1 - t * 0.5;
    b.box(mane, 0, y, z, 0.07, 0.2, 0.1, -0.75 + t * 0.1, 0, (i % 2 ? 0.25 : -0.25));
  }
  b.box(mane, 0, 2.16, 1.25, 0.06, 0.12, 0.08, 0.6);
  // уздечка и поводья
  b.cyl(leather, 0, 1.76, 1.48, 0.1, 0.1, 0.03, 12, PI / 2 - 0.85);
  b.cyl(leather, 0, 2.02, 1.2, 0.13, 0.13, 0.025, 12, 0.3);
  for (const s of [-1, 1]) b.limb(leather, s * 0.09, 1.72, 1.5, s * 0.1, 1.8, 0.22, 0.008, 0.008, 4);
  // попона и седло
  b.box(blanket, 0, 1.64, -0.05, 0.76, 0.05, 0.8, 0, 0, 0);
  for (const s of [-1, 1]) b.box(blanket, s * 0.37, 1.48, -0.05, 0.04, 0.32, 0.8, 0, 0, s * 0.15);
  b.box(shade(blanket, 1.4), 0, 1.655, -0.45, 0.78, 0.03, 0.04);
  b.sph(leather, 0, 1.7, -0.05, 0.27, 0.08, 0.36, 14);
  b.box(leather, 0, 1.78, -0.33, 0.36, 0.14, 0.08, -0.3);
  b.cyl(leather, 0, 1.83, 0.24, 0.035, 0.03, 0.16, 8);
  b.cyl(leather, 0, 1.92, 0.24, 0.05, 0.05, 0.03, 10);
  for (const s of [-1, 1]) {
    b.box(leather, s * 0.3, 1.5, 0.0, 0.03, 0.36, 0.06, 0, 0, s * 0.08);
    b.box('#6a6a6a', s * 0.33, 1.1, 0.0, 0.05, 0.08, 0.12);
    b.box(leather, s * 0.29, 1.32, 0.0, 0.02, 0.4, 0.04);
    b.box(leather, s * 0.3, 1.55, -0.55, 0.12, 0.26, 0.3); // седельные сумки
  }
  b.cyl('#c9b896', 0, 1.82, -0.5, 0.09, 0.09, 0.62, 10, 0, 0, PI / 2); // скатка
  const body = b.build();

  const tail = new GeoBuilder(F);
  tail.limb(mane, 0, 0, 0, 0, -0.35, -0.12, 0.06, 0.09, 8);
  tail.limb(mane, 0, -0.35, -0.12, 0, -0.95, -0.18, 0.1, 0.04, 8);
  tail.sph(mane, 0, -0.6, -0.16, 0.1, 0.3, 0.08, 10);

  const upper = (front) => {
    const l = new GeoBuilder(F);
    if (front) { l.sph(coat, 0, -0.08, 0.02, 0.13, 0.22, 0.15, 12); l.limb(coat, 0, -0.1, 0, 0, -0.5, 0.02, 0.1, 0.065, 12); }
    else { l.sph(coat, 0, -0.05, 0, 0.15, 0.32, 0.2, 12); l.limb(coat, 0, -0.15, 0, 0, -0.5, -0.08, 0.1, 0.06, 12); }
    l.sph(dk, 0, -0.5, front ? 0.02 : -0.08, 0.065, 0.07, 0.07, 10);
    return l.build();
  };
  const lower = () => {
    const l = new GeoBuilder(F);
    const sock = C.socks ? '#e8e0d0' : coat;
    l.limb(coat, 0, 0, 0, 0, -0.3, 0, 0.05, 0.042, 10);
    l.limb(sock, 0, -0.3, 0, 0, -0.5, 0.01, 0.042, 0.045, 10);
    l.sph(sock, 0, -0.5, 0.01, 0.055, 0.06, 0.06, 10);
    l.limb(sock, 0, -0.5, 0.01, 0, -0.58, 0.05, 0.045, 0.05, 8);
    l.cyl('#2a2420', 0, -0.62, 0.06, 0.06, 0.072, 0.08, 12);
    l.sph(mane, 0, -0.53, -0.03, 0.045, 0.05, 0.04, 6);
    return l.build();
  };
  return { body, tail: tail.build(), upperF: upper(true), upperB: upper(false), lower };
}

export class Horse {
  constructor(g, coatIdx, x, z, rot) {
    this.g = g;
    this.C = HORSE_COATS[coatIdx % HORSE_COATS.length];
    this.coatIdx = coatIdx;
    const blanket = ['#7a2a22', '#2a4a6a', '#6a5a2a', '#3a5a3a'][coatIdx % 4];
    const P = buildHorse(this.C, blanket);
    this.group = new THREE.Group();
    this.root = new THREE.Group(); this.group.add(this.root);
    const mk = (geo, parent) => { const m = new THREE.Mesh(geo, MAT.solid); m.castShadow = true; parent.add(m); return m; };
    mk(P.body, this.root);
    this.tail = new THREE.Group(); this.tail.position.set(0, 1.6, -1.0); mk(P.tail, this.tail); this.root.add(this.tail);
    this.legs = [];
    const spots = [[-0.17, FRONT, true, 0], [0.17, FRONT, true, PI], [-0.18, BACK, false, PI * 0.5], [0.18, BACK, false, PI * 1.5]];
    for (const [lx, [lz, ly], front, off] of spots) {
      const u = new THREE.Group(); u.position.set(lx, ly, lz); mk(front ? P.upperF : P.upperB, u);
      const k = new THREE.Group(); k.position.set(0, -0.5, front ? 0.02 : -0.08); mk(P.lower(), k); u.add(k);
      this.root.add(u);
      this.legs.push({ u, k, front, off });
    }
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(1, 16).rotateX(-PI / 2), MAT.blob);
    this.blob.scale.set(0.7, 1, 1.5);
    this.group.add(this.blob);
    g.scene.add(this.group);
    this.x = x; this.z = z; this.rot = rot; this.speed = 0; this.phase = Math.random() * 6; this.t = Math.random() * 10;
    this.rider = null; this.owner = -1; this.called = null; this.radius = 0.85; this.stepT = 0;
    this.home = { x, z, rot };
    this.sync();
  }
  get gait() { return this.speed < 0.3 ? 'stand' : this.speed < 5 ? 'walk' : this.speed < 11 ? 'trot' : 'gallop'; }

  // управление всадником: c — контроллер, yaw — поворот камеры
  steer(dt, c) {
    const g = this.g, yaw = g.camYaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const mx = rx * c.mx + fx * c.my, mz = rz * c.mx + fz * c.my, m = Math.hypot(mx, mz);
    let target = 0;
    if (m > 0.15) {
      const want = Math.atan2(mx, mz), d = angleDiff(this.rot, want);
      const turn = (2.4 - Math.min(this.speed, 15) * 0.07) * dt;
      this.rot += clamp(d, -turn, turn);
      target = Math.abs(d) > 2.2 && this.speed < 3 ? 1.5 : (c.run ? 15.5 : 4 + 5.5 * m);
    }
    this.drive(dt, target);
  }
  drive(dt, target) {
    const g = this.g;
    const inWater = g.world.groundAt(this.x, this.z) < WATER_Y - 0.3;
    if (inWater) target = Math.min(target, 4.5);
    const acc = target > this.speed ? 5.5 : 11;
    this.speed += clamp(target - this.speed, -acc * dt, acc * dt);
    if (this.speed < 0.02) { this.speed = 0; return; }
    let vx = Math.sin(this.rot) * this.speed * dt, vz = Math.cos(this.rot) * this.speed * dt;
    // поводок между напарниками
    if (this.rider) {
      const o = g.otherPlayer(this.rider);
      if (o && o.alive) {
        const dx = this.x - o.x, dz = this.z - o.z, d = Math.hypot(dx, dz);
        if (d > 33) { const nx = dx / d, nz = dz / d, out = vx * nx + vz * nz; if (out > 0) { vx -= nx * out; vz -= nz * out; this.speed *= 0.97; } }
      }
    }
    const ox = this.x, oz = this.z;
    const p = g.world.collide(this.x + vx, this.z + vz, this.radius);
    this.x = p.x; this.z = p.z;
    const moved = Math.hypot(this.x - ox, this.z - oz), want = Math.hypot(vx, vz);
    if (want > 0.001 && moved < want * 0.5) this.speed *= 0.85;
  }
  update(dt) {
    const g = this.g;
    this.t += dt;
    if (!this.rider) {
      if (this.called) {
        const p = this.called, d = dist(p.x, p.z, this.x, this.z);
        if (!p.alive || p.horse || d < 3.2) { this.called = null; }
        else {
          const want = Math.atan2(p.x - this.x, p.z - this.z), dd = angleDiff(this.rot, want);
          this.rot += clamp(dd, -3 * dt, 3 * dt);
          this.drive(dt, Math.abs(dd) > 1.2 ? 4 : d > 15 ? 15 : 6);
          // объезд препятствий
          if (this.speed < 1 && d > 4) { this.stuckT = (this.stuckT || 0) + dt; if (this.stuckT > 0.6) { this.rot += 1.2; this.stuckT = 0; } }
        }
      } else this.drive(dt, 0);
    }
    this.animate(dt);
    this.sync();
    // стук копыт
    if (this.speed > 0.8) {
      this.stepT -= dt * (this.gait === 'gallop' ? 3.2 : this.gait === 'trot' ? 2.6 : 1.8) * Math.max(1, this.speed / 5);
      if (this.stepT <= 0) { this.stepT = 1; const d = g.camDist(this.x, this.z); if (d < 45) g.audio.hoof(d, this.gait === 'gallop'); }
    }
  }
  animate(dt) {
    const gait = this.gait, s = this.speed;
    const freq = gait === 'walk' ? 1.6 + s * 0.35 : gait === 'trot' ? 2.6 + s * 0.12 : gait === 'gallop' ? 3.4 + s * 0.06 : 0;
    this.phase += dt * freq * PI;
    const amp = gait === 'walk' ? 0.32 : gait === 'trot' ? 0.5 : gait === 'gallop' ? 0.75 : 0;
    const offs = gait === 'gallop' ? [0, 0.35, PI, PI + 0.35] : gait === 'trot' ? [0, PI, PI, 0] : [0, PI, PI * 0.5, PI * 1.5];
    this.legs.forEach((L, i) => {
      if (gait === 'stand') {
        L.u.rotation.x *= 0.85; L.k.rotation.x *= 0.85;
        if (i === 3) L.k.rotation.x = 0.25 + Math.sin(this.t * 0.3) * 0.05; // отставленная задняя нога
        return;
      }
      const ph = this.phase + offs[i];
      L.u.rotation.x = -Math.sin(ph) * amp;
      const lift = Math.max(0, Math.sin(ph + (L.front ? 1.3 : -1.3)));
      L.k.rotation.x = lift * amp * (L.front ? 1.7 : 1.3);
    });
    const r = this.root;
    if (gait === 'gallop') { r.rotation.x = Math.sin(this.phase) * 0.07; r.position.y = Math.abs(Math.sin(this.phase)) * 0.12; }
    else if (gait === 'trot') { r.rotation.x = 0; r.position.y = Math.abs(Math.sin(this.phase * 2)) * 0.06; }
    else { r.rotation.x *= 0.9; r.position.y = gait === 'walk' ? Math.abs(Math.sin(this.phase * 2)) * 0.025 : Math.sin(this.t * 1.2) * 0.008; }
    this.tail.rotation.z = Math.sin(this.t * (gait === 'stand' ? 0.9 : 3)) * (gait === 'stand' ? 0.25 : 0.12);
    this.tail.rotation.x = gait === 'gallop' ? -0.9 : gait === 'trot' ? -0.45 : -0.1;
  }
  saddleY() { return this.g.world.groundAt(this.x, this.z) + this.root.position.y; }
  sync() {
    this.group.position.set(this.x, this.g.world.groundAt(this.x, this.z), this.z);
    this.group.rotation.y = this.rot;
    this.group.visible = this.g.nearestPlayerDist(this.x, this.z) < 150;
  }
  dispose() {
    this.g.scene.remove(this.group);
    this.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  }
}
