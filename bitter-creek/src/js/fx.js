// Эффекты: трассеры, вспышки, кровь, пепел, ударные волны, плевки Голодного. Всё из пулов.
import * as THREE from 'three';
import { TEX, MAT } from './models.js';
import { dist } from './util.js';

export class FX {
  constructor(g) {
    this.g = g; this.scene = g.scene;
    this.parts = [];
    this.tracers = [];
    this.spits = [];
    this.dangers = [];
    const pm = (c, add) => new THREE.SpriteMaterial({ map: TEX.soft, color: c, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.pool = [];
    for (let i = 0; i < 90; i++) {
      const s = new THREE.Sprite(pm(0xffffff, false)); s.visible = false; this.scene.add(s);
      this.pool.push({ s, life: 0 });
    }
    this.flashMat = pm(0xffd080, true);
    this.flash = new THREE.Sprite(this.flashMat); this.flash.visible = false; this.flash.scale.set(1.4, 1.4, 1); this.scene.add(this.flash);
    this.flashT = 0;
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.9 });
    this.silverMat = new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 1 });
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
      const l = new THREE.Line(geo, this.tracerMat); l.visible = false; l.frustumCulled = false; this.scene.add(l);
      this.tracers.push({ l, life: 0 });
    }
    this.spitMat = new THREE.SpriteMaterial({ map: TEX.soft, color: 0x3a0a10, transparent: true, depthWrite: false });
    this.ringGeo = new THREE.RingGeometry(0.6, 1, 24).rotateX(-Math.PI / 2);
    this.discGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  }
  _part(x, y, z, color, size, vx, vy, vz, life, grav = -6, add = false) {
    const p = this.pool.find((q) => q.life <= 0) || this.pool[0];
    p.s.material.color.setHex(color); p.s.material.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending;
    p.s.position.set(x, y, z); p.s.scale.set(size, size, 1); p.s.visible = true;
    p.vx = vx; p.vy = vy; p.vz = vz; p.life = p.max = life; p.size = size; p.grav = grav;
  }
  blood(x, y, z, color = 0x7a0e0e) {
    for (let i = 0; i < 6; i++) this._part(x, y, z, color, 0.25 + Math.random() * 0.2, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, 0.5 + Math.random() * 0.3);
  }
  ash(x, y, z) { this._part(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), 0x141010, 0.5 + Math.random() * 0.6, (Math.random() - 0.5), 1.5 + Math.random(), (Math.random() - 0.5), 1.4, 0.3); }
  dust(x, y, z) { for (let i = 0; i < 3; i++) this._part(x, y, z, 0xb89a70, 0.4, (Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2, 0.5, -2); }
  sparks(x, y, z) { for (let i = 0; i < 4; i++) this._part(x, y, z, 0xffc070, 0.15, (Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6, 0.25, -12, true); }
  fire(x, y, z) { this._part(x + (Math.random() - 0.5) * 2, y, z + (Math.random() - 0.5) * 2, Math.random() < 0.5 ? 0xff7a20 : 0xffc040, 0.8 + Math.random(), 0, 3 + Math.random() * 2, 0, 0.9, 1, true); }

  shot(x0, y0, z0, x1, y1, z1, silver) {
    const t = this.tracers.find((q) => q.life <= 0) || this.tracers[0];
    const a = t.l.geometry.attributes.position.array;
    a[0] = x0; a[1] = y0; a[2] = z0; a[3] = x1; a[4] = y1; a[5] = z1;
    t.l.geometry.attributes.position.needsUpdate = true;
    t.l.material = silver ? this.silverMat : this.tracerMat;
    t.l.visible = true; t.life = 0.06;
    this.flash.position.set(x0, y0, z0); this.flash.visible = true; this.flashT = 0.05;
    this.flash.material.color.setHex(silver ? 0xc8e4ff : 0xffd080);
  }
  danger(x, z, r) {
    const m = new THREE.Mesh(this.discGeo, MAT.danger);
    m.scale.set(r, 1, r); m.position.set(x, this.g.world.groundAt(x, z) + 0.1, z);
    this.scene.add(m); this.dangers.push(m);
    return m;
  }
  clearDanger(m) { this.scene.remove(m); this.dangers = this.dangers.filter((d) => d !== m); }
  shockwave(x, z) {
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; this._part(x + Math.cos(a) * 2, this.g.world.groundAt(x, z) + 0.5, z + Math.sin(a) * 2, 0x2a1a14, 1.2, Math.cos(a) * 8, 1, Math.sin(a) * 8, 0.6, -1); }
  }
  spit(boss, target) {
    const s = new THREE.Sprite(this.spitMat); s.scale.set(1.6, 1.6, 1);
    const y = boss.y + 7;
    s.position.set(boss.x, y, boss.z);
    this.scene.add(s);
    const ty = this.g.world.groundAt(target.x, target.z) + 1;
    const dx = target.x - boss.x, dz = target.z - boss.z, dy = ty - y, d = Math.hypot(dx, dy, dz);
    const sp = 16;
    this.spits.push({ s, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp, life: d / sp + 0.4 });
  }
  clearAll() {
    for (const p of this.pool) { p.life = 0; p.s.visible = false; }
    for (const s of this.spits) this.scene.remove(s.s);
    this.spits = [];
    for (const d of this.dangers) this.scene.remove(d);
    this.dangers = [];
  }
  update(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; continue; }
      p.vy += p.grav * dt;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      const k = p.life / p.max;
      p.s.material.opacity = k;
      const sz = p.size * (1.3 - k * 0.3);
      p.s.scale.set(sz, sz, 1);
    }
    for (const t of this.tracers) if (t.life > 0) { t.life -= dt; if (t.life <= 0) t.l.visible = false; }
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flash.visible = false; }
    for (const s of this.spits) {
      s.life -= dt;
      s.s.position.x += s.vx * dt; s.s.position.y += s.vy * dt; s.s.position.z += s.vz * dt;
      this._part(s.s.position.x, s.s.position.y, s.s.position.z, 0x2a0608, 0.5, 0, 0, 0, 0.3, 0);
      for (const pl of this.g.players) {
        if (pl.targetable && dist(pl.x, pl.z, s.s.position.x, s.s.position.z) < 1.3 && Math.abs(s.s.position.y - (pl.char.group.position.y + 1)) < 2) {
          pl.damage(15, null); s.life = 0;
        }
      }
      if (s.life <= 0) this.scene.remove(s.s);
    }
    this.spits = this.spits.filter((s) => s.life > 0);
    for (const d of this.dangers) d.material.opacity = 0.35 + Math.sin(performance.now() / 60) * 0.25;
  }
}
