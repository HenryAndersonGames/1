// Игроки, жители, демоны, Голодный.
import * as THREE from 'three';
import { Character, buildBoss } from './characters.js';
import { PLAYERS } from './story.js';
import { angleLerp, clamp, dist } from './util.js';
import { LOC, WATER_Y } from './terrain.js';

// ---------- маршруты по улицам ----------
const EXITS = [{ x: 100, z: 0, seg: 'main' }, { x: -100, z: 0, seg: 'main' }, { x: 0, z: 64, seg: 's' }];
function streetAnchor(p) {
  if (Math.abs(p.x) < 104 && Math.abs(p.z) <= 15) return { seg: 'main', x: clamp(p.x, -99, 99), z: p.z < 0 ? -2.5 : 2.5 };
  if (Math.abs(p.x) < 30 && p.z < -12 && p.z > -72) return { seg: 'n', x: p.x < 0 ? -2.5 : 2.5, z: clamp(p.z, -63, -3) };
  if (Math.abs(p.x) < 30 && p.z > 12 && p.z < 72) return { seg: 's', x: p.x < 0 ? -2.5 : 2.5, z: clamp(p.z, 3, 64) };
  return null;
}
export function planPath(a, b) {
  let A = streetAnchor(a), B = streetAnchor(b);
  const near = (p) => EXITS.reduce((m, e) => (dist(p.x, p.z, e.x, e.z) < dist(p.x, p.z, m.x, m.z) ? e : m), EXITS[0]);
  if (!A && !B) return [{ x: b.x, z: b.z }];
  if (!A) { const e = near(a); A = { seg: e.seg, x: e.x, z: e.z }; }
  if (!B) { const e = near(b); B = { seg: e.seg, x: e.x, z: e.z }; }
  const pts = [{ x: A.x, z: A.z }];
  if (A.seg !== B.seg) {
    pts.push({ x: A.seg === 'main' ? 0 : A.x, z: A.seg === 'main' ? A.z : 0 });
    pts.push({ x: B.seg === 'main' ? 0 : B.x, z: B.seg === 'main' ? B.z : 0 });
  }
  pts.push({ x: B.x, z: B.z });
  pts.push({ x: b.x, z: b.z });
  return pts;
}
export const PIT_TRAIL = [{ x: 104, z: -3 }, { x: 122, z: -26 }, { x: 152, z: -82 }, { x: 192, z: -160 }, { x: 222, z: -222 }, { x: LOC.pit.x - 6, z: LOC.pit.z + 7 }];

// ---------- базовый актёр ----------
class Actor {
  constructor(g) { this.g = g; this.x = 0; this.z = 0; this.rot = 0; this.radius = 0.42; this.speedNow = 0; this.path = null; this.stuckT = 0; this.lastD = 1e9; }
  tryMove(mx, mz) {
    const p = this.g.world.collide(this.x + mx, this.z + mz, this.radius);
    this.x = p.x; this.z = p.z;
  }
  face(a, dt, rate = 10) { this.rot = angleLerp(this.rot, a, Math.min(1, dt * rate)); }
  moveToward(tx, tz, speed, dt) {
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    if (d < 0.5) return true;
    const s = Math.min(speed * dt, d);
    const ox = this.x, oz = this.z;
    this.tryMove(dx / d * s, dz / d * s);
    this.speedNow = Math.hypot(this.x - ox, this.z - oz) / Math.max(dt, 1e-4);
    this.face(Math.atan2(dx, dz), dt, 8);
    // застревание: обходим препятствие вбок
    if (this.speedNow < speed * 0.25) {
      this.stuckT += dt;
      if (this.stuckT > 0.4) { const side = Math.sin(this.g.time * 0.7 + this.x) > 0 ? 1 : -1; this.tryMove(-dz / d * s * 1.5 * side, dx / d * s * 1.5 * side); }
      if (this.stuckT > 4) { this.x = tx; this.z = tz; this.stuckT = 0; }
    } else this.stuckT = 0;
    return false;
  }
  followPath(speed, dt) {
    if (!this.path || !this.path.length) return true;
    const p = this.path[0];
    if (this.moveToward(p.x, p.z, speed, dt)) { this.path.shift(); this.stuckT = 0; }
    return !this.path.length;
  }
  sync(extraY = 0) {
    const y = this.g.world.groundAt(this.x, this.z);
    this.char.group.position.set(this.x, y + extraY, this.z);
    this.char.group.rotation.y = this.rot;
  }
}

// ---------- игрок ----------
export class Player extends Actor {
  constructor(g, idx) {
    super(g);
    this.idx = idx; this.data = PLAYERS[idx]; this.name = this.data.name;
    this.char = new Character(this.data.look, { gun: true });
    g.scene.add(this.char.group);
    this.maxHp = 100; this.hp = 100; this.alive = true; this.downed = false; this.downT = 0;
    this.clip = 6; this.clipType = 'lead'; this.ammo = 24; this.silver = 0; this.prefer = 'lead';
    this.reloadT = 0; this.cd = 0; this.aimT = 0; this.aimDir = 0; this.reviveT = 0; this.hurtT = 0;
    this.light = new THREE.PointLight('#ffb867', 0, 22, 1.4);
    g.scene.add(this.light);
    this.isPlayer = true;
  }
  get targetable() { return this.alive && !this.downed; }
  damage(amt, src) {
    if (!this.alive || this.downed || this.g.mode !== 'play') return;
    this.hp -= amt; this.hurtT = 0.3;
    this.g.audio.hurt(); this.g.fx.blood(this.x, this.g.world.groundAt(this.x, this.z) + 1.2, this.z, 0x7a0e0e);
    this.g.ui.flashHurt(this.idx);
    if (this.hp <= 0) { this.hp = 0; this.down(); }
  }
  down() {
    this.downed = true; this.downT = 35; this.char.setPose('downed');
    this.g.notify(`${this.name} ранен и не может встать!`, 'bad');
    this.g.onPlayerDown(this);
  }
  revive(hp = 40) { this.downed = false; this.hp = hp; this.char.setPose('idle'); this.g.notify(`${this.name} снова на ногах.`); }
  update(dt, c) {
    const g = this.g;
    if (this.downed) {
      this.downT -= dt;
      this.char.pose = 'downed';
      this.char.update(dt, 0); this.sync();
      if (this.downT <= 0) g.onBleedOut(this);
      return;
    }
    this.cd -= dt; this.aimT -= dt; this.hurtT -= dt;
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.finishReload(); }
    // движение относительно камеры
    const yaw = g.camYaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let mx = rx * c.mx + fx * c.my, mz = rz * c.mx + fz * c.my;
    const ml = Math.hypot(mx, mz);
    const inWater = g.world.groundAt(this.x, this.z) < WATER_Y - 0.4;
    const sp = (c.run ? 8.6 : 5.0) * (inWater ? 0.55 : 1) * (this.aimT > 0 ? 0.75 : 1);
    if (ml > 0.05) {
      let vx = mx * sp * dt, vz = mz * sp * dt;
      // «поводок»: напарники не могут разойтись слишком далеко
      const o = g.otherPlayer(this);
      if (o && o.alive) {
        const dx = this.x - o.x, dz = this.z - o.z, d = Math.hypot(dx, dz), MAX = 34;
        if (d > MAX - 1) {
          const nx = dx / d, nz = dz / d, out = vx * nx + vz * nz;
          if (out > 0) { vx -= nx * out; vz -= nz * out; }
        }
      }
      const ox = this.x, oz = this.z;
      this.tryMove(vx, vz);
      this.speedNow = Math.hypot(this.x - ox, this.z - oz) / dt;
    } else this.speedNow = 0;
    // прицел
    let aim = null;
    if (c.aimStick) aim = Math.atan2(rx * c.ax + fx * c.ay, rz * c.ax + fz * c.ay);
    else if (c.mouseAim) {
      const p = g.mouseGround(this.char.group.position.y + 1.2);
      if (p) aim = Math.atan2(p.x - this.x, p.z - this.z);
    }
    if (aim !== null) { this.aimDir = aim; if (c.aimStick) this.aimT = 0.6; }
    else if (ml > 0.05) this.aimDir = Math.atan2(mx, mz);
    if (c.shoot) this.shoot();
    if (c.punch) this.punch();
    if (c.reload) this.startReload();
    if (c.swap) this.swap();
    const faceDir = (this.aimT > 0 || aim !== null && c.mouseAim && c.shootHeld) ? this.aimDir : (ml > 0.05 ? Math.atan2(mx, mz) : this.rot);
    this.face(this.aimT > 0 ? this.aimDir : faceDir, dt, 14);
    if (this.char.pose !== 'punch') this.char.pose = this.aimT > 0 ? 'aim' : 'idle';
    this.char.update(dt, this.speedNow);
    this.sync();
    this.light.position.set(this.x, this.char.group.position.y + 2.4, this.z);
  }
  shoot() {
    const g = this.g;
    if (this.reloadT > 0 || this.cd > 0) return;
    if (this.clip <= 0) { g.audio.click(); this.startReload(); return; }
    this.clip--; this.cd = 0.32; this.aimT = 1.2;
    this.rot = this.aimDir; this.char.pose = 'aim';
    g.fireShot(this, this.aimDir, this.clipType);
    if (this.clip === 0) this.startReload();
  }
  punch() {
    if (this.cd > 0) return;
    this.cd = 0.45; this.char.setPose('punch', 0.25);
    this.rot = this.aimDir;
    this.g.melee(this, this.aimDir);
  }
  reserve(t) { return t === 'silver' ? this.silver : this.ammo; }
  startReload() {
    if (this.reloadT > 0) return;
    const t = this.prefer;
    if (this.clip >= 6 && this.clipType === t) return;
    if (this.reserve(t) <= 0 && !(this.clipType !== t && this.reserve(this.clipType) > 0)) { if (this.clip === 0) this.g.notifyOnce(`${this.name}: патроны кончились!`); return; }
    this.reloadT = 1.3; this.g.audio.reload();
  }
  finishReload() {
    let t = this.prefer;
    if (this.reserve(t) <= 0 && this.clip === 0) t = t === 'silver' ? 'lead' : 'silver';
    if (this.clipType !== t) { if (this.clipType === 'silver') this.silver += this.clip; else this.ammo += this.clip; this.clip = 0; this.clipType = t; }
    const need = 6 - this.clip, have = this.reserve(t), n = Math.min(need, have);
    if (t === 'silver') this.silver -= n; else this.ammo -= n;
    this.clip += n;
  }
  swap() {
    this.prefer = this.prefer === 'lead' ? 'silver' : 'lead';
    this.g.notify(`${this.name}: ${this.prefer === 'silver' ? 'заряжает серебро' : 'заряжает свинец'}`);
    if (this.reserve(this.prefer) > 0) { this.reloadT = 0; this.startReload(); }
  }
  dispose() { this.char.dispose(this.g.scene); this.g.scene.remove(this.light); }
}

// ---------- житель ----------
export class NPC extends Actor {
  constructor(g, d) {
    super(g);
    this.d = d; this.id = d.id; this.name = d.name;
    this.char = new Character(d.look, { gun: d.fighter === 'gun' });
    g.scene.add(this.char.group);
    this.alive = true; this.hollow = false; this.revealed = false; this.missing = false; this.returned = false;
    this.maxHp = d.hp || 100; this.hp = this.maxHp;
    this.x = d.work[0]; this.z = d.work[1]; this.rot = d.work[1] < 0 ? 0 : Math.PI;
    if (Math.abs(d.work[1]) > 20) this.rot = Math.random() * 6;
    this.state = 'atWork'; this.hostile = false; this.wasHostile = false; this.target = null;
    this.scared = 0; this.scareFrom = null; this.cd = 0; this.searched = false; this.asked = {};
    this.wanderT = Math.random() * 4; this.patrolI = 0; this.talking = false;
    this.wake = 6.6 + Math.random() * 0.8; this.sleep = 19.1 + Math.random() * 0.8;
    if (d.drunk) this.sleep = 20.2;
  }
  get home() { return this.g.world.doors[this.d.home]; }
  get workPos() { return { x: this.d.work[0], z: this.d.work[1] }; }
  get targetable() { return this.alive && this.char.group.visible && this.state !== 'dragged'; }
  get human() { return !this.hollow; }
  workTime() { const h = this.g.hour(); return h >= this.wake && h < this.sleep && !this.g.eclipse; }
  hide() { this.char.group.visible = false; }
  show() { this.char.group.visible = true; }
  goHome() { this.state = 'toHome'; this.path = planPath(this, this.home); }
  goWork() { this.state = 'toWork'; this.path = planPath(this, this.workPos); }

  update(dt) {
    const g = this.g;
    if (this.state === 'dead') { this.char.pose = 'dead'; this.char.update(dt, 0); return; }
    if (this.state === 'gone' || this.state === 'demon' || this.state === 'fled') { this.hide(); return; }
    if (this.state === 'home') {
      this.hide();
      const hr = g.hour();
      // доктор каждую ночь ходит к Яме
      if (this.d.culprit && !g.eclipse && !this.walked && hr >= 21.3 && hr < 23.5) {
        const h = this.home; this.x = h.x; this.z = h.z; this.show(); this.walked = true;
        this.state = 'nightWalk'; this.path = planPath(this, PIT_TRAIL[0]).concat(PIT_TRAIL.map((q) => ({ ...q })));
        return;
      }
      if (this.workTime() && !g.isNight()) { this.walked = false; const h = this.home; this.x = h.x; this.z = h.z; this.show(); this.goWork(); }
      return;
    }
    if (this.state === 'nightWalk') {
      const hr = g.hour();
      if (hr >= 3.6 && hr < 12) { this.state = 'home'; this.hide(); return; }
      this.show();
      if (this.followPath(2.7, dt)) this.char.pose = 'mourn';
      this.char.update(dt, this.speedNow); this.sync();
      return;
    }
    if (this.state === 'dragged') { this.char.pose = 'carried'; this.char.update(dt, 0); return; }
    // дальние жители не обновляются, если игроки далеко
    const pd = g.nearestPlayerDist(this.x, this.z);
    const far = pd > 140;
    this.char.group.visible = !far;
    this.cd -= dt;
    this.speedNow = 0;
    if (this.surrenderT > 0) { this.surrenderT -= dt; this.char.pose = 'surrender'; this.char.update(dt, 0); this.sync(); return; }
    if (this.hostile) this.fight(dt);
    else if (this.scared > 0) {
      this.scared -= dt;
      const s = this.scareFrom || this;
      const dx = this.x - s.x, dz = this.z - s.z, d = Math.hypot(dx, dz) || 1;
      this.moveToward(this.x + dx / d * 5, this.z + dz / d * 5, 5.2, dt);
      if (this.scared <= 0) { if (this.workTime()) this.goWork(); else this.goHome(); }
    } else if (this.talking) {
      const p = g.talkPlayer; if (p) this.face(Math.atan2(p.x - this.x, p.z - this.z), dt, 6);
    } else {
      if (!this.workTime() && this.state !== 'toHome') this.goHome();
      else if (this.workTime() && this.state === 'toHome') this.goWork();
      if (this.state === 'toWork') { if (this.followPath(this.d.far ? 2.8 : 2.4, dt)) this.state = 'atWork'; }
      else if (this.state === 'toHome') { if (this.followPath(2.8, dt)) { this.state = 'home'; this.hide(); return; } }
      else if (this.state === 'atWork') this.idle(dt, pd);
    }
    if (far) return;
    if (this.talking) this.char.pose = 'talk';
    else if (this.char.pose === 'talk') this.char.pose = 'idle';
    if (this.d.mourn && this.state === 'atWork' && this.speedNow < 0.1 && !this.talking) this.char.pose = 'mourn';
    else if (this.char.pose === 'mourn') this.char.pose = 'idle';
    this.char.update(dt, this.speedNow);
    this.sync();
  }
  idle(dt, pd) {
    const g = this.g;
    this.wanderT -= dt;
    if (this.d.patrol) {
      const p = this.d.patrol[this.patrolI];
      if (this.moveToward(p[0], p[1], 2.2, dt)) this.patrolI = (this.patrolI + 1) % this.d.patrol.length;
      return;
    }
    if (this.wanderTarget) {
      if (this.moveToward(this.wanderTarget.x, this.wanderTarget.z, 1.6, dt)) this.wanderTarget = null;
      return;
    }
    if (pd < 4.5) {
      const p = g.nearestPlayer(this.x, this.z);
      if (p) this.face(Math.atan2(p.x - this.x, p.z - this.z), dt, 4);
    } else if (this.wanderT <= 0) {
      this.wanderT = 5 + Math.random() * 9;
      const r = this.d.wander || 2.5, w = this.workPos;
      this.wanderTarget = { x: w.x + (Math.random() - 0.5) * 2 * r, z: w.z + (Math.random() - 0.5) * 2 * Math.min(r, 1.5) };
    }
  }
  fight(dt) {
    const g = this.g;
    let t = this.target;
    if (!t || !t.targetable) { t = this.target = g.nearestPlayer(this.x, this.z, true); }
    if (!t || dist(t.x, t.z, this.x, this.z) > 45) { this.hostile = false; this.goWork(); return; }
    const d = dist(t.x, t.z, this.x, this.z);
    const a = Math.atan2(t.x - this.x, t.z - this.z);
    if (this.d.fighter === 'gun') {
      if (d > 13 || g.world.lineBlocked(this.x, this.z, t.x, t.z)) this.moveToward(t.x, t.z, 4.6, dt);
      else { this.face(a, dt, 8); this.char.pose = 'aim'; }
      if (d < 18 && this.cd <= 0 && !g.world.lineBlocked(this.x, this.z, t.x, t.z)) {
        this.cd = 1.5 + Math.random() * 0.6; this.char.pose = 'aim';
        g.npcShoot(this, t);
      }
    } else {
      if (d > 1.5) this.moveToward(t.x, t.z, 5.4, dt);
      else {
        this.face(a, dt, 8);
        if (this.cd <= 0) {
          this.cd = 1.0; this.char.setPose('punch', 0.3);
          g.audio.punch(g.camDist(this.x, this.z));
          t.damage(this.id === 'bull' ? 16 : 10, this);
        }
      }
    }
  }
  makeHostile(target) {
    if (!this.alive || this.hollow && this.state === 'demon') return;
    this.hostile = true; this.wasHostile = true; this.target = target || this.g.nearestPlayer(this.x, this.z, true);
    this.talking = false; this.scared = 0;
  }
  scare(from, t = 7) { if (this.hostile || !this.alive || this.state === 'home' || this.state === 'dragged') return; this.scared = t; this.scareFrom = from; this.wanderTarget = null; }
  damage(amt, src, kind) {
    if (!this.alive || this.state === 'home' || this.state === 'demon') return;
    const g = this.g;
    if (this.hollow && kind === 'silver') { g.revealHollow(this, src); return; }
    this.hp -= amt;
    g.fx.blood(this.x, this.char.group.position.y + 1.2, this.z, this.hollow ? 0x151010 : 0x7a0e0e);
    if (this.hp <= 0) { this.die(src, kind); return; }
    if (this.hostile) { if (this.checkSurrender(kind)) return; this.target = src.isPlayer ? src : this.target; return; }
    if (this.d.fighter && src.isPlayer) this.makeHostile(src);
    else this.scare(src, 8);
    if (src.isPlayer) g.onAssault(this, kind);
    // избитый драчун сдаётся
  }
  checkSurrender(kind) {
    if (this.hostile && this.d.fighter === 'fists' && kind === 'punch' && this.hp < this.maxHp * 0.35) {
      this.hostile = false; this.surrenderT = 3.5; this.g.onSurrender(this);
      return true;
    }
    return false;
  }
  die(src, kind) {
    this.alive = false; this.state = 'dead'; this.hostile = false; this.talking = false;
    this.char.setPose('dead');
    this.g.onNpcKilled(this, src, kind);
  }
  dispose() { this.char.dispose(this.g.scene); }
}

// ---------- демон (Пустой в истинном облике) ----------
export class Demon extends Actor {
  constructor(g, look, opts = {}) {
    super(g);
    this.char = new Character(look, { demon: true });
    g.scene.add(this.char.group);
    this.npc = opts.npc || null; this.label = opts.label || 'Пустой';
    this.hp = opts.hp || 100; this.alive = true; this.dying = 0;
    this.x = opts.x; this.z = opts.z; this.radius = 0.5;
    this.state = 'roam'; this.victim = null; this.target = null; this.cd = 0; this.lostT = 0; this.growlT = 3 + Math.random() * 5;
    this.provoked = 0; this.boss = !!opts.boss;
    this.isDemon = true;
  }
  get targetable() { return this.alive && this.dying === 0; }
  seek(victim) { this.victim = victim; victim.targetedBy = this; this.state = 'seek'; this.path = planPath(this, victim.home); }
  update(dt) {
    const g = this.g;
    if (this.dying > 0) {
      this.dying += dt;
      const s = Math.max(0.01, 1 - this.dying / 1.6);
      this.char.root.scale.y = s * 1.1; this.char.group.position.y -= dt * 0.6;
      if (Math.random() < 0.5) g.fx.ash(this.x, this.char.group.position.y + 1.5, this.z);
      if (this.dying > 1.6) { this.dispose(); this.dead = true; }
      return;
    }
    this.cd -= dt; this.provoked -= dt; this.growlT -= dt;
    if (this.growlT <= 0) { this.growlT = 4 + Math.random() * 6; g.audio.growl(g.camDist(this.x, this.z)); }
    const p = g.nearestPlayer(this.x, this.z, true);
    const pd = p ? dist(p.x, p.z, this.x, this.z) : 1e9;
    this.speedNow = 0;
    const aggro = this.state === 'drag' ? 6 : 13;
    if (this.state !== 'hunt' && p && (pd < aggro || this.provoked > 0)) {
      if (this.state === 'drag') this.dropVictim(p);
      this.state = 'hunt'; this.target = p;
    }
    switch (this.state) {
      case 'seek': {
        const v = this.victim;
        if (!v || !v.alive || v.state !== 'home') { this.victim = null; this.pickNext(); break; }
        if (this.followPath(4.8, dt)) {
          v.state = 'dragged'; v.show(); this.state = 'drag';
          this.path = planPath(this, PIT_TRAIL[0]).concat(PIT_TRAIL.map((q) => ({ ...q })));
          g.onAbduction(v, this);
        }
        break;
      }
      case 'drag': {
        const v = this.victim;
        const done = this.followPath(2.9, dt);
        this.char.pose = 'drag';
        if (v) {
          const bx = this.x - Math.sin(this.rot) * 1.4, bz = this.z - Math.cos(this.rot) * 1.4;
          v.x = bx; v.z = bz; v.rot = this.rot + Math.PI; v.sync();
          v.char.pose = 'carried';
        }
        if (done) { g.onVictimConsumed(v, this); this.victim = null; this.state = 'roam'; }
        break;
      }
      case 'hunt': {
        const t = this.target && this.target.targetable ? this.target : p;
        if (!t) { this.pickNext(); break; }
        const d = dist(t.x, t.z, this.x, this.z);
        if (d > 32 && this.provoked <= 0) { this.lostT += dt; if (this.lostT > 4) { this.lostT = 0; this.pickNext(); } }
        else this.lostT = 0;
        if (d > 1.6) this.moveToward(t.x, t.z, this.boss ? 4 : 5.6, dt);
        else {
          this.face(Math.atan2(t.x - this.x, t.z - this.z), dt, 8);
          if (this.cd <= 0) { this.cd = 1.05; this.char.setPose('claw', 0.35); t.damage(13, this); g.audio.punch(g.camDist(this.x, this.z)); }
        }
        if (this.char.pose !== 'claw') this.char.pose = d < 4 ? 'claw' : 'idle';
        break;
      }
      case 'roam': default: {
        if (!this.path || !this.path.length) {
          const tgt = p && pd < 90 ? p : { x: (Math.random() - 0.5) * 120, z: (Math.random() - 0.5) * 80 };
          this.path = [{ x: tgt.x + (Math.random() - 0.5) * 20, z: tgt.z + (Math.random() - 0.5) * 20 }];
        }
        this.followPath(3.2, dt);
        if (p && pd < 22) { this.state = 'hunt'; this.target = p; }
      }
    }
    this.char.update(dt, this.speedNow);
    this.sync();
  }
  pickNext() {
    const v = this.g.pickVictim(this);
    if (v) this.seek(v); else { this.state = 'roam'; this.path = null; }
  }
  dropVictim(by) {
    const v = this.victim;
    if (v) { this.victim = null; this.g.onVictimFreed(v, by); }
  }
  damage(amt, src, kind) {
    if (!this.alive || this.dying) return;
    const g = this.g;
    const mult = kind === 'silver' ? 5.5 : kind === 'punch' ? 0.45 : 0.36;
    this.hp -= amt * mult;
    g.fx.blood(this.x, this.char.group.position.y + 1.6, this.z, 0x120808);
    if (kind === 'silver') g.audio.shriek(g.camDist(this.x, this.z));
    if (src && src.isPlayer) { this.provoked = 6; if (this.state === 'drag') this.dropVictim(src); this.state = 'hunt'; this.target = src; }
    if (this.hp <= 0) this.die(src);
  }
  die(src) {
    this.alive = false; this.dying = 0.001;
    this.dropVictim(src);
    this.g.audio.shriek(this.g.camDist(this.x, this.z));
    this.g.onDemonKilled(this, src);
  }
  burn() { if (this.alive) { this.alive = false; this.dying = 0.001; this.dropVictim(null); } }
  dispose() { this.char.dispose(this.g.scene); }
}

// ---------- Голодный ----------
export class Boss {
  constructor(g) {
    this.g = g;
    const m = buildBoss();
    this.group = m.group; this.arms = m.arms;
    this.group.scale.setScalar(1.35);
    g.scene.add(this.group);
    this.x = LOC.pit.x; this.z = LOC.pit.z; this.rot = 0;
    this.maxHp = 1500; this.hp = this.maxHp; this.alive = true; this.isBoss = true;
    this.y = -14; this.state = 'rise'; this.t = 0;
    this.slamCd = 4; this.spitCd = 3; this.summonCd = 10; this.slam = null; this.radius = 3.5;
  }
  get targetable() { return this.alive && this.state !== 'rise'; }
  update(dt) {
    const g = this.g;
    this.t += dt;
    const baseY = g.world.groundAt(this.x + 8, this.z) - 3.2;
    if (this.state === 'rise') {
      this.y += dt * 4; if (this.y >= baseY) { this.y = baseY; this.state = 'fight'; }
    } else if (this.state === 'dying') {
      this.y -= dt * 3; this.group.rotation.z += dt * 0.2;
      if (Math.random() < 0.6) g.fx.ash(this.x + (Math.random() - 0.5) * 5, this.y + 6, this.z + (Math.random() - 0.5) * 5);
      if (this.y < baseY - 16) { g.scene.remove(this.group); this.state = 'gone'; }
    } else if (this.state === 'fight') {
      const p = g.nearestPlayer(this.x, this.z, true);
      if (p) this.rot = angleLerp(this.rot, Math.atan2(p.x - this.x, p.z - this.z), dt * 2);
      this.slamCd -= dt; this.spitCd -= dt; this.summonCd -= dt;
      if (this.slam) {
        this.slam.t -= dt;
        this.arms.forEach((a, i) => { a.rotation.x = -2.6 + (1 - this.slam.t / 1.2) * 0.6; });
        if (this.slam.t <= 0) {
          this.arms.forEach((a) => { a.rotation.x = 0.4; });
          g.fx.shockwave(this.slam.x, this.slam.z);
          g.audio.punch(0); g.shake = 0.6;
          for (const pl of g.players) if (pl.targetable && dist(pl.x, pl.z, this.slam.x, this.slam.z) < 5) pl.damage(32, this);
          g.fx.clearDanger(this.slam.decal);
          this.slam = null;
        }
      } else {
        this.arms.forEach((a, i) => { a.rotation.x = Math.sin(this.t * 1.5 + i) * 0.4 - 0.3; a.rotation.z = (i % 2 ? 0.3 : -0.3) + Math.sin(this.t * 2 + i) * 0.2; });
        if (p && this.slamCd <= 0 && dist(p.x, p.z, this.x, this.z) < 19) {
          this.slamCd = 3.6 + Math.random() * 1.5;
          this.slam = { x: p.x, z: p.z, t: 1.2, decal: g.fx.danger(p.x, p.z, 5) };
          g.audio.growl(0);
        } else if (p && this.spitCd <= 0) {
          this.spitCd = 2.2 + Math.random();
          g.fx.spit(this, p);
        }
        if (this.summonCd <= 0) {
          this.summonCd = 16;
          if (g.demons.filter((d) => d.alive).length < 4) for (let i = 0; i < 2; i++) {
            const a = Math.random() * 6.28;
            g.spawnDemon(this.x + Math.cos(a) * 12, this.z + Math.sin(a) * 12, 'hunt');
          }
        }
      }
    }
    this.group.position.set(this.x, this.y + Math.sin(this.t * 1.3) * 0.3, this.z);
    this.group.rotation.y = this.rot;
  }
  damage(amt, src, kind) {
    if (this.state !== 'fight') return;
    const mult = kind === 'silver' ? 1.15 : kind === 'punch' ? 0.05 : 0.22;
    this.hp -= amt * mult;
    this.g.fx.blood(this.x + (Math.random() - 0.5) * 3, this.y + 5 + Math.random() * 3, this.z + 2, 0x120808);
    if (kind === 'silver' && Math.random() < 0.3) this.g.audio.shriek(0);
    if (this.hp <= 0) { this.hp = 0; this.state = 'dying'; this.alive = false; this.g.onBossKilled(); }
  }
}
