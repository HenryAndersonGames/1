'use strict';
// ---------- Транспорт: брошенные машины и трактор можно починить (Инженерия 2), заправить бензином и гонять ----------
// Починка: ◀ (стройка) рядом с машиной — 3 хлама + 1 дерево. Сесть/выйти: A. Газ — стик, тормоз/назад — B.
// 1 канистра топлива = 45 с езды (Инженерия 6 — 90 с). На скорости машина таранит монстров.
const VEH = { car0: { spd: 360, hp: 220 }, car1: { spd: 380, hp: 200 }, car2: { spd: 340, hp: 260 }, tractor: { spd: 230, hp: 420 } };
const VEH_HEAD = { car0: -16, car1: -16, car2: -16, tractor: -36 };
const isWreck = (pr) => !pr.dead && VEH[pr.spr];

function wreckNear(p) {
  let best = null, bd = 90;
  for (const pr of World.props) {
    if (!isWreck(pr)) continue;
    const d = distToRect(p.x, p.y, pr.x, pr.y, pr.w, pr.h);
    if (d < bd) { bd = d; best = pr; }
  }
  return best;
}
function vehicleNear(p) {
  let best = null, bd = 70;
  for (const v of G.vehicles) { const d = dist(p.x, p.y, v.x, v.y) - v.w / 2; if (d < bd) { bd = d; best = v; } }
  return best;
}
function repairVehicle(p, pr) {
  if (p.sk.eng < 2) { floatText(p.x, p.y - 110, 'Нужна Инженерия 2', '#ff9a8a', 14); Sfx.play('deny'); return true; }
  if (G.team.scrap < 3 || G.team.wood < 1) { floatText(p.x, p.y - 110, 'Нужно: 3 хлама и 1 дерево', '#ff9a8a', 14); Sfx.play('deny'); return true; }
  G.team.scrap -= 3; G.team.wood -= 1;
  pr.dead = true; pr.solid = false;
  const D = VEH[pr.spr];
  G.vehicles.push({ spr: pr.spr, x: pr.x + pr.w / 2, y: pr.y + pr.h / 2, w: pr.w, h: pr.h, ang: 0, spd: 0, fuel: 0, hp: D.hp, maxHp: D.hp, driver: null, pass: null, max: D.spd, flash: 0 });
  buildStaticGrid(); G.flowDirty = true; MM.dirty = true;
  burst(pr.x + pr.w / 2, pr.y + pr.h / 2, 20, 16, '#c8c0b0', 160, 3); Sfx.play('craft');
  msg(`${pr.spr === 'tractor' ? 'Трактор починен' : 'Машина починена'}! Садись — A, заправка — канистры с бензином`, '#e8c890');
  giveXP(p, 15);
  return true;
}
function enterVehicle(p, v) {
  if (!v.driver) v.driver = p; else if (!v.pass) v.pass = p; else return false;
  p.state = 'drive'; p.veh = v; p.atk = null; p.held && dropHeld(p, true);
  Sfx.play('door'); return true;
}
function exitVehicle(p) {
  const v = p.veh; if (!v) return;
  if (v.driver === p) v.driver = null; else if (v.pass === p) v.pass = null;
  p.veh = null; p.state = 'normal'; p.inv = 0.5;
  for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
    const x = v.x + Math.cos(v.ang + a) * (v.h / 2 + 20), y = v.y + Math.sin(v.ang + a) * (v.h / 2 + 20);
    if (freeSpot(x, y, p.r)) { p.x = x; p.y = y; break; }
  }
  Sfx.play('door');
}
// управление из updatePlayer, пока герой в машине
function driveUpdate(p, c, dt) {
  const v = p.veh;
  if (c.pressed.interact) { exitVehicle(p); return; }
  p.x = v.x; p.y = v.y; p.kx = p.ky = 0;
  if (v.driver !== p) { p.hint = `${Input.btn(p.i, 'interact')}: выйти`; return; }
  const m = Math.hypot(c.mx, c.my), fx = Math.cos(v.ang), fy = Math.sin(v.ang);
  if (v.fuel <= 0 && (m > 0.2 || c.down.roll)) {
    if (G.team.fuel > 0) { G.team.fuel--; v.fuel += p.sk.eng >= 6 ? 90 : 45; floatText(v.x, v.y - 60, 'Заправлено', '#e08a6a', 14); Sfx.play('pickup'); }
    else if (!v.warned) { v.warned = 1; floatText(v.x, v.y - 60, 'Нет бензина — найдите канистры', '#ff9a8a', 14); }
  }
  if (v.fuel > 0) {
    if (m > 0.2) {
      const want = Math.atan2(c.my, c.mx), da = angDiff(v.ang, want);
      const turn = (v.spr === 'tractor' ? 2.2 : 3) * dt * clamp(Math.abs(v.spd) / 120 + 0.3, 0.3, 1);
      if (Math.abs(da) < 2.4 || v.spd > 40) v.ang += clamp(da, -turn, turn);
      v.spd += (Math.abs(da) < 1.6 ? 420 : 160) * m * dt;
    }
    if (c.down.roll) v.spd -= 520 * dt;
    v.fuel -= dt * (Math.abs(v.spd) > 10 ? 1 : 0.15);
  }
  v.spd = clamp(v.spd, -120, v.max) * Math.pow(m > 0.2 && v.fuel > 0 ? 0.8 : 0.35, dt);
  p.hint = `${Input.btn(p.i, 'interact')}: выйти · ${Input.btn(p.i, 'roll')}: тормоз · бензин ${Math.ceil(v.fuel)} с (+${G.team.fuel} канистр)`;
}
function updateVehicles(dt) {
  for (const v of G.vehicles) {
    v.flash -= dt;
    if (Math.abs(v.spd) < 1) continue;
    const ox = v.x, oy = v.y;
    v.x += Math.cos(v.ang) * v.spd * dt; v.y += Math.sin(v.ang) * v.spd * dt;
    const o = { x: v.x, y: v.y }; collideWorld(o, 26, { nostruct: false });
    if (Math.abs(o.x - v.x) + Math.abs(o.y - v.y) > 0.5) {
      // удар о препятствие
      if (Math.abs(v.spd) > 160) { addShake(6); Sfx.play('hitH'); v.hp -= Math.abs(v.spd) * 0.04; v.flash = 0.1; burst(v.x, v.y, 10, 8, '#8a8070', 140, 3); }
      v.spd *= -0.25;
    }
    v.x = o.x; v.y = o.y;
    // таран
    const k = (v.driver && v.driver.sk.eng >= 6 ? 1.5 : 1);
    if (Math.abs(v.spd) > 110) for (const e of G.enemies) {
      if (e.dead || e.state === 'dying' || e.state === 'cling' || dist(e.x, e.y, v.x, v.y) > e.r + 30 || (e.ramT && G.t - e.ramT < 0.4)) continue;
      e.ramT = G.t;
      damageEnemy(e, Math.abs(v.spd) * 0.14 * k, { x: ox, y: oy }, Math.abs(v.spd) * 1.6, 0.8);
      v.spd *= e.type === 'titan' ? -0.3 : e.type === 'brute' ? 0.55 : 0.88; v.hp -= e.type === 'titan' ? 30 : 3; v.flash = 0.08;
      Sfx.play('hitH'); addShake(5); burst(e.x, e.y, 20, 10, '#7a1a14', 160, 3);
    }
    if (Math.abs(v.spd) > 60 && Math.random() < dt * 20) part(v.x - Math.cos(v.ang) * v.w * 0.45, v.y + 8, 4, rand(-30, 30), rand(-20, 20), 30, 0.5, '#8a7a5a', 4, 0);
    for (const q of [v.driver, v.pass]) if (q) { q.x = v.x; q.y = v.y; }
    if (v.hp <= 0) { // машина сгорела
      for (const q of [v.driver, v.pass]) if (q) exitVehicle(q);
      explode(v.x, v.y, 90, 40); G.vehicles.splice(G.vehicles.indexOf(v), 1);
      msg('Машина взорвалась!', '#ff8a6a'); break;
    }
  }
}
function drawVehicle(ctx, v) {
  const s = Art.s[v.spr], fl = Math.cos(v.ang) < 0 ? -1 : 1;
  const bob = Math.abs(v.spd) > 30 ? Math.sin(G.t * 30) * 0.8 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(v.x, v.y + v.h / 2, v.w / 2 + 8, 10, 0, 0, TAU); ctx.fill();
  const oy = v.spr === 'tractor' ? 0 : 26;
  ctx.save(); ctx.translate(v.x, v.y - v.h / 2 + oy + bob); ctx.scale(fl, 1); ctx.rotate(Math.sin(v.ang) * fl * 0.05);
  const img = v.flash > 0 ? flashOf(s) : s;
  ctx.drawImage(img.c, -v.w / 2 - img.ax, -img.ay, img.w, img.h);
  // головы героев в окнах
  [v.driver, v.pass].forEach((q, k) => { if (!q || !Puppet.ready) return; const h = Puppet.P[q.i].head, sc = HERO_SCALE * 0.8; ctx.drawImage(h.c, (k ? -22 : 14) - h.w * sc / 2, VEH_HEAD[v.spr] - h.h * sc, h.w * sc, h.h * sc); });
  ctx.restore();
  if (v.hp < v.maxHp) { const k = v.hp / v.maxHp; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(v.x - 25, v.y - 74, 50, 6); ctx.fillStyle = k > 0.4 ? '#c9b46a' : '#d6493a'; ctx.fillRect(v.x - 24, v.y - 73, 48 * k, 4); }
}
