'use strict';
// ---------- Броня (надевается и видна на герое) и дополнительные способности ----------
const GEAR = {
  helmet: { slot: 'head', name: 'Строительная каска', def: 0.15, dur: 70, col: '#e8b020', desc: '−15% урона' },
  bikehelm: { slot: 'head', name: 'Велошлем', def: 0.08, spd: 0.03, dur: 45, col: '#d04a3a', desc: '−8% урона, +3% скорости' },
  vest: { slot: 'body', name: 'Бронежилет', def: 0.26, spd: -0.05, dur: 130, col: '#3e4a40', desc: '−26% урона, чуть медленнее' },
  padded: { slot: 'body', name: 'Стёганка', def: 0.12, dur: 80, col: '#9a845a', desc: '−12% урона' },
  gloves: { slot: 'arms', name: 'Боевые перчатки', dmg: 0.12, dur: 90, col: '#4a3428', desc: '+12% урона' },
  bracers: { slot: 'arms', name: 'Наручи', def: 0.08, dmg: 0.05, dur: 100, col: '#8a9096', desc: '−8% урона, +5% удара' },
  boots: { slot: 'legs', name: 'Берцы', spd: 0.08, def: 0.04, dur: 100, col: '#2e2a26', desc: '+8% скорости' },
  kneepads: { slot: 'legs', name: 'Наколенники', def: 0.06, roll: 0.3, dur: 80, col: '#3a3a44', desc: 'Перекат на 30% дешевле' },
};
const GEAR_SLOTS = ['head', 'body', 'arms', 'legs'];
// лут: броня встречается в городе, промзоне, лаборатории и на ферме
LOOT.town.push([0.5, 'g:helmet'], [0.5, 'g:bikehelm'], [0.4, 'g:padded'], [0.4, 'g:gloves'], [0.4, 'g:boots']);
LOOT.industrial.push([0.7, 'g:helmet'], [0.4, 'g:vest'], [0.5, 'g:gloves'], [0.5, 'g:boots'], [0.4, 'g:kneepads'], [0.3, 'g:bracers']);
LOOT.lab.push([0.5, 'g:vest'], [0.5, 'g:bracers'], [0.4, 'g:kneepads']);
LOOT.farm.push([0.5, 'g:padded'], [0.4, 'g:boots'], [0.3, 'g:gloves']);
LOOT.forest.push([0.15, 'g:padded'], [0.15, 'g:bikehelm']);

const gearSum = (p, k) => { let s = 0; for (const sl of GEAR_SLOTS) { const g = p.gear && p.gear[sl]; if (g) s += GEAR[g.id][k] || 0; } return s; };
function gearDmgMul(p) { return (1 + gearSum(p, 'dmg')) * (p.rageT > 0 ? 1.5 : 1); }
function gearSpdMul(p) { return (1 + gearSum(p, 'spd')) * (p.rageT > 0 ? 1.2 : 1); }
function gearDefMul(p) { return (1 - Math.min(0.6, gearSum(p, 'def'))) * (p.stoneT > 0 ? 0.3 : 1); }
// износ: удар приходится в случайную надетую вещь
function wearGear(p, dmg) {
  const worn = GEAR_SLOTS.filter((s) => p.gear[s]);
  if (!worn.length) return;
  const sl = worn[Math.floor(Math.random() * worn.length)], g = p.gear[sl];
  g.dur -= dmg * 0.5;
  if (g.dur <= 0) { p.gear[sl] = null; floatText(p.x, p.y - 128, `${GEAR[g.id].name} развалилась`, '#ffb27a', 14); msg(`${pname(p)}: ${GEAR[g.id].name.toLowerCase()} — сломано`, '#ffb27a'); Sfx.play('break'); }
}
function equipGear(p, it) {
  G.items.splice(G.items.indexOf(it), 1);
  const D = GEAR[it.id], old = p.gear[D.slot];
  if (old) G.items.push({ cat: 'g', id: old.id, dur: old.dur, x: p.x + Math.cos(p.face + 2) * 16, y: p.y + 6, held: false, fly: false });
  p.gear[D.slot] = { id: it.id, dur: it.dur };
  floatText(p.x, p.y - 124, `Надето: ${D.name}`, '#d8e4f0', 15); floatText(p.x, p.y - 106, D.desc, '#b8c4d0', 12);
  Sfx.play('pickup'); burst(p.x, p.y - 40, 30, 8, '#c8d4e0', 100, 2.5);
}

// ---------- Отрисовка брони на герое ----------
// вид сбоку: J — суставы (rigSolve), limbs — результат deformLimb; всё в координатах героя (лицом вправо)
function drawGearSide(ctx, p, P, J, L) {
  const g = p.gear; if (!g) return;
  const lean = P.lean * D2R;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (g.legs) {
    const D = GEAR[g.legs.id];
    for (const leg of [L.legB, L.legF]) {
      if (g.legs.id === 'boots') { ctx.fillStyle = D.col; ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(leg.end[0] + 2.4, leg.end[1] + 7.8, 6.4, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillRect(leg.end[0] - 2.8, leg.end[1] + 1, 6, 6); ctx.strokeRect(leg.end[0] - 2.8, leg.end[1] + 1, 6, 6); }
      else { ctx.fillStyle = D.col; ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(leg.elbow[0] + 2.2, leg.elbow[1], 3.2, 4.2, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
  }
  if (g.body) {
    const D = GEAR[g.body.id];
    ctx.save(); ctx.translate(J.hip[0], J.hip[1]); ctx.rotate(lean);
    const top = J.neck[1] - J.hip[1] + 7 / Math.max(0.3, Math.cos(lean));
    ctx.beginPath(); ctx.moveTo(-5.6, top + 2); ctx.lineTo(5.2, top); ctx.lineTo(6.2, -9); ctx.lineTo(-6.4, -8); ctx.closePath();
    ctx.fillStyle = D.col; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-3.5, top + 5); ctx.lineTo(-3.5, -11); ctx.moveTo(1, top + 4); ctx.lineTo(1.4, -11); ctx.stroke();
    if (g.body.id === 'vest') { ctx.fillStyle = '#d8d0b0'; ctx.fillRect(-2.6, top + 6, 5, 2.4); }
    ctx.restore();
  }
  if (g.head) {
    const D = GEAR[g.head.id];
    ctx.save(); ctx.translate(J.neck[0], J.neck[1]); ctx.rotate((P.lean + P.hd) * D2R);
    ctx.fillStyle = D.col; ctx.strokeStyle = OL; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0.4, -12.2, 13.9, Math.PI + 0.12, -0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (g.head.id === 'helmet') { ctx.beginPath(); ctx.moveTo(-15.5, -11.6); ctx.lineTo(17, -11.6); ctx.lineWidth = 2.6; ctx.stroke(); ctx.strokeStyle = D.col; ctx.lineWidth = 1.4; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-2, -25.5, 3.6, 11); }
    else { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; for (const x of [-7, -1, 5]) { ctx.beginPath(); ctx.moveTo(x, -24); ctx.lineTo(x + 2, -14); ctx.stroke(); } }
    ctx.restore();
  }
}
function drawGearArm(ctx, p, armD, fa) {
  const g = p.gear && p.gear.arms; if (!g) return;
  const D = GEAR[g.id], [ex, ey] = armD.end, dx = Math.sin(fa), dy = Math.cos(fa);
  ctx.lineCap = 'round';
  if (g.id === 'bracers') { ctx.strokeStyle = OL; ctx.lineWidth = 6.4; ctx.beginPath(); ctx.moveTo(ex - dx * 9, ey - dy * 9); ctx.lineTo(ex - dx * 2, ey - dy * 2); ctx.stroke(); ctx.strokeStyle = D.col; ctx.lineWidth = 4.2; ctx.stroke(); }
  else { ctx.fillStyle = D.col; ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(ex + dx * 2.6, ey + dy * 2.6, 3.2, 0, TAU); ctx.fill(); ctx.stroke(); }
}
// вид спереди/сзади
function drawGearFB(ctx, p, view, pose, L) {
  const g = p.gear; if (!g) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (g.legs) for (const leg of [L.lL, L.lR]) {
    const D = GEAR[g.legs.id]; ctx.fillStyle = D.col; ctx.strokeStyle = OL; ctx.lineWidth = 1.2;
    if (g.legs.id === 'boots') { ctx.beginPath(); ctx.ellipse(leg.d.end[0], leg.d.end[1] + 6.4, 5.6, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    else if (view === 'f') { ctx.beginPath(); ctx.ellipse(leg.d.elbow[0], leg.d.elbow[1], 4, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  const sw = pose.sway * D2R, cx = 0, top = -100 + pose.bob;
  if (g.body) {
    const D = GEAR[g.body.id];
    ctx.save(); ctx.translate(0, -32 + pose.bob); ctx.rotate(-sw);
    ctx.beginPath(); ctx.moveTo(-9.5, -54); ctx.lineTo(9.5, -54); ctx.lineTo(10.5, -26); ctx.lineTo(-10.5, -26); ctx.closePath();
    ctx.fillStyle = D.col; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, -50); ctx.lineTo(-5, -29); ctx.moveTo(5, -50); ctx.lineTo(5, -29); ctx.stroke();
    ctx.restore();
  }
  if (g.head) {
    const D = GEAR[g.head.id];
    ctx.save(); ctx.translate(cx, top); ctx.rotate(-sw * 0.5);
    ctx.fillStyle = D.col; ctx.strokeStyle = OL; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0, 0, 14.4, Math.PI + 0.1, -0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (g.head.id === 'helmet') { ctx.beginPath(); ctx.moveTo(-17, 0.6); ctx.lineTo(17, 0.6); ctx.lineWidth = 2.6; ctx.stroke(); ctx.strokeStyle = D.col; ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.restore();
  }
}
function drawGearHands(ctx, p, list) {
  const g = p.gear && p.gear.arms; if (!g) return;
  const D = GEAR[g.id];
  for (const a of list) { ctx.fillStyle = D.col; ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(a.d.end[0], a.d.end[1] + 2, 3.2, 0, TAU); ctx.fill(); ctx.stroke(); }
}
// значок вещи (лежит на земле, в HUD)
function drawGearIcon(ctx, id, x, y, s) {
  const D = GEAR[id], k = s / 24;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = D.col; ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (D.slot === 'head') { ctx.arc(0, 4, 10, Math.PI, 0); ctx.lineTo(13, 4); ctx.lineTo(-13, 4); ctx.closePath(); }
  else if (D.slot === 'body') { ctx.moveTo(-8, -10); ctx.lineTo(-3, -7); ctx.lineTo(3, -7); ctx.lineTo(8, -10); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); ctx.closePath(); }
  else if (D.slot === 'arms') { ctx.moveTo(-6, -9); ctx.lineTo(5, -9); ctx.lineTo(7, 6); ctx.lineTo(2, 10); ctx.lineTo(-7, 8); ctx.closePath(); }
  else { ctx.moveTo(-5, -10); ctx.lineTo(3, -10); ctx.lineTo(3, 4); ctx.lineTo(11, 6); ctx.lineTo(11, 10); ctx.lineTo(-5, 10); ctx.closePath(); }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-4, -4, 3, 6);
  ctx.restore();
}

// ---------- Новые способности ----------
Object.assign(ABIL, {
  roar: { name: 'Боевой клич', icon: 'ab_quake', cd: 14, req: ['str', 1], desc: 'Оглушает и отталкивает врагов вокруг, бодрит напарника', col: '#e0a050' },
  stone: { name: 'Каменная кожа', icon: 'ab_frost', cd: 16, req: ['str', 2], desc: '5 с получаешь на 70% меньше урона', col: '#a0a4aa' },
  rage: { name: 'Ярость', icon: 'ab_fire', cd: 18, req: ['str', 4], desc: '6 с: урон ×1.5, скорость +20%', col: '#e04030' },
  blink: { name: 'Теневой шаг', icon: 'ab_dash', cd: 6, req: ['agi', 4], desc: 'Мгновенный скачок вперёд с ударом в точке появления', col: '#9a6aff' },
  mine: { name: 'Мина', icon: 'ab_quake', cd: 10, req: ['eng', 2], desc: 'Ставит мину — взрывается, когда монстр рядом', col: '#d0b040' },
  turret: { name: 'Самострел', icon: 'ab_bolt', cd: 30, req: ['eng', 4], desc: 'Арбалет на треноге 20 с стреляет по монстрам', col: '#c8a070' },
  vortex: { name: 'Воронка', icon: 'ab_shadow', cd: 14, req: ['oth', 3], desc: 'Стягивает монстров в точку перед тобой и ранит', col: '#8a5aff' },
  regen: { name: 'Второе дыхание', icon: 'ab_medic', cd: 25, req: ['med', 1], desc: 'Восстанавливает выносливость и лечит 8 с', col: '#9fe39a' },
});
function useAbilityExtra(p, id) {
  const fx = Math.cos(p.face), fy = Math.sin(p.face);
  const foes = (r, x = p.x, y = p.y) => G.enemies.filter((e) => !e.dead && e.state !== 'dying' && e.state !== 'cling' && e.state !== 'held' && dist(x, y, e.x, e.y) < r + e.r && !wallBetween(x, y, e.x, e.y, e.r));
  switch (id) {
    case 'roar':
      for (const e of foes(250)) { damageEnemy(e, 6, p, 420, 1.1); }
      for (const q of G.players) if (alive(q) && dist(q.x, q.y, p.x, p.y) < 260) q.st = 100;
      G.waves.push({ x: p.x, y: p.y - 40, r: 20, max: 260, a: 0, arc: Math.PI, col: '230,170,90', t: 0.45 }); Sfx.play('howl'); addShake(7); break;
    case 'stone': p.stoneT = 5; burst(p.x, p.y - 40, 30, 16, '#a0a4aa', 140, 4); Sfx.play('slam'); break;
    case 'rage': p.rageT = 6; burst(p.x, p.y - 40, 30, 16, '#e04030', 160, 4); Sfx.play('growl'); floatText(p.x, p.y - 124, 'ЯРОСТЬ!', '#ff7050', 18); break;
    case 'blink': {
      let tx = p.x, ty = p.y;
      for (let d = 170; d >= 30; d -= 14) { const x = p.x + fx * d, y = p.y + fy * d; if (freeSpot(x, y, p.r) && !wallBetween(p.x, p.y, x, y, 0)) { tx = x; ty = y; break; } }
      burst(p.x, p.y - 40, 30, 16, '#6a3aaa', 160, 4);
      p.x = tx; p.y = ty; p.inv = 0.35;
      for (const e of foes(70)) damageEnemy(e, 22 + 3 * p.sk.agi, p, 260, 0.5);
      burst(tx, ty - 40, 30, 18, '#9a6aff', 200, 4); G.waves.push({ x: tx, y: ty - 10, r: 10, max: 80, a: 0, arc: Math.PI, col: '160,110,255', t: 0.3 }); Sfx.play('blink'); break;
    }
    case 'mine': G.mines.push({ x: p.x + fx * 26, y: p.y + fy * 26, t: 0, arm: 0.8 }); Sfx.play('build'); break;
    case 'turret': G.turrets.push({ x: p.x + fx * 34, y: p.y + fy * 34, t: 20, cd: 0.5, face: p.face, owner: p }); Sfx.play('build'); burst(p.x + fx * 34, p.y + fy * 34, 10, 8, '#8a6a44', 90, 3); break;
    case 'vortex': G.vortexes.push({ x: p.x + fx * 130, y: p.y + fy * 130, t: 2.6, owner: p, tick: 0 }); Sfx.play('orb'); break;
    case 'regen': p.regenAb = 8; p.st = 100; burst(p.x, p.y - 40, 30, 14, '#9fe39a', 120, 3); Sfx.play('revive'); break;
  }
}
function updateExtras(dt) {
  for (const p of G.players) {
    if (p.rageT > 0) { p.rageT -= dt; if (Math.random() < dt * 14) part(p.x + rand(-10, 10), p.y, rand(20, 70), 0, 0, 40, 0.5, '#ff6040', 2.5, -80); }
    if (p.stoneT > 0) p.stoneT -= dt;
    if (p.regenAb > 0 && alive(p)) { p.regenAb -= dt; p.hp = Math.min(p.maxHp, p.hp + 4 * dt); if (Math.random() < dt * 8) part(p.x + rand(-10, 10), p.y, rand(10, 60), 0, 0, 50, 0.6, '#9fe39a', 2.5, -90); }
  }
  for (let i = G.mines.length - 1; i >= 0; i--) {
    const m = G.mines[i]; m.t += dt;
    if (m.t < m.arm) continue;
    if (G.enemies.some((e) => !e.dead && e.state !== 'dying' && !EDEF[e.type].float && dist2(e.x, e.y, m.x, m.y) < 34 * 34)) { G.mines.splice(i, 1); explode(m.x, m.y, 95, 70); }
  }
  for (let i = G.turrets.length - 1; i >= 0; i--) {
    const t = G.turrets[i]; t.t -= dt; t.cd -= dt;
    if (t.t <= 0) { burst(t.x, t.y - 10, 10, 10, '#8a6a44', 120, 3); G.turrets.splice(i, 1); continue; }
    let best = null, bd = 320 * 320;
    for (const e of G.enemies) { if (e.dead || e.state === 'dying' || e.hidden) continue; const d = dist2(t.x, t.y, e.x, e.y); if (d < bd && !wallBetween(t.x, t.y, e.x, e.y, e.r)) { bd = d; best = e; } }
    if (best) { t.face = Math.atan2(best.y - t.y, best.x - t.x); if (t.cd <= 0) { t.cd = 0.55; damageEnemy(best, 14 + 2 * t.owner.sk.eng, t, 120, 0.15); G.tracers.push({ x0: t.x, y0: t.y - 22, x1: best.x, y1: best.y - 24, t: 0.07 }); Sfx.play('throw'); } }
  }
  for (let i = G.vortexes.length - 1; i >= 0; i--) {
    const v = G.vortexes[i]; v.t -= dt; v.tick -= dt;
    if (v.t <= 0) { G.vortexes.splice(i, 1); G.waves.push({ x: v.x, y: v.y, r: 10, max: 120, a: 0, arc: Math.PI, col: '150,100,255', t: 0.3 }); continue; }
    for (const e of G.enemies) {
      if (e.dead || e.state === 'dying' || e.type === 'titan') continue;
      const d = dist(e.x, e.y, v.x, v.y);
      if (d > 230 || d < 4) continue;
      const pull = 260 * (1 - d / 260) * dt;
      e.x += (v.x - e.x) / d * pull; e.y += (v.y - e.y) / d * pull;
      if (v.tick <= 0 && d < 90) damageEnemy(e, 7 + v.owner.sk.oth, v, 0, 0.3);
    }
    if (v.tick <= 0) v.tick = 0.4;
  }
}
function drawExtrasGround(ctx) {
  for (const m of G.mines) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(m.x, m.y, 10, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a4a40'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(m.x, m.y - 2, 9, 4.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = m.t < m.arm ? '#888' : Math.floor(G.t * 4) % 2 ? '#ff4030' : '#601810'; ctx.beginPath(); ctx.arc(m.x, m.y - 4, 2, 0, TAU); ctx.fill();
  }
  for (const v of G.vortexes) {
    for (let k = 0; k < 3; k++) {
      const r = 20 + ((G.t * 80 + k * 30) % 90);
      ctx.strokeStyle = `rgba(150,100,255,${0.5 * (1 - r / 110)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(v.x, v.y, r, r * 0.5, 0, G.t * 4 + k, G.t * 4 + k + 4.5); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,20,80,0.6)'; ctx.beginPath(); ctx.ellipse(v.x, v.y, 14, 7, 0, 0, TAU); ctx.fill();
  }
}
function drawTurret(ctx, t) {
  ctx.strokeStyle = OL; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(t.x, t.y - 18); ctx.lineTo(t.x - 10, t.y); ctx.moveTo(t.x, t.y - 18); ctx.lineTo(t.x + 10, t.y); ctx.moveTo(t.x, t.y - 18); ctx.lineTo(t.x, t.y + 3); ctx.stroke();
  ctx.strokeStyle = '#7a5a38'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.translate(t.x, t.y - 22); ctx.scale(Math.cos(t.face) < 0 ? -1 : 1, 1);
  ctx.fillStyle = '#6a4a30'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.fillRect(-8, -3, 20, 6); ctx.strokeRect(-8, -3, 20, 6);
  ctx.beginPath(); ctx.moveTo(10, -10); ctx.quadraticCurveTo(15, 0, 10, 10); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
  const k = t.t / 20; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(t.x - 12, t.y - 40, 24, 4); ctx.fillStyle = '#c8a070'; ctx.fillRect(t.x - 12, t.y - 40, 24 * k, 4);
}
function drawPlayerAura(ctx, p) {
  if (p.stoneT > 0) { ctx.strokeStyle = `rgba(190,195,205,${0.5 + Math.sin(G.t * 10) * 0.15})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 20, 8, 0, 0, TAU); ctx.stroke(); }
  if (p.rageT > 0) { ctx.fillStyle = `rgba(255,70,40,${0.18 + Math.sin(G.t * 14) * 0.06})`; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 22, 9, 0, 0, TAU); ctx.fill(); }
}
