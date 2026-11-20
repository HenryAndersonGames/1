'use strict';
// ---------- Игроки, монстры, предметы, эффекты ----------

// ===== Навыки (первые три ветки из концепта) =====
const SKILLS = [
  { id: 'str', name: 'Грубая сила', lv: ['+15% к урону, быстрее носишь мебель', 'Можно БРОСАТЬ мебель (A)', 'Тяжёлый удар отбрасывает сильнее', 'Ещё +15% урона и оглушение', 'Мебель в руках — щит (−50% урона)'] },
  { id: 'agi', name: 'Акробатика', lv: ['+6% скорость, перекат дешевле', 'Перекат дальше', 'Удар после переката ×2', 'Ещё быстрее, перекат дешевле', 'Перекат отталкивает врагов'] },
  { id: 'eng', name: 'Инженерия', lv: ['Баррикады прочнее (+30%)', 'Баррикада стоит 1 дерево', 'Ловушки служат дольше', 'Ремонт вдвое эффективнее', 'Ловушка стоит 1 хлам'] },
];
const skillCost = (lvl) => 1 + Math.floor(lvl / 2);
const xpNeed = (lvl) => 40 + 30 * (lvl - 1);

function makePlayer(i, x, y) {
  return {
    i, x, y, r: 13, face: i ? Math.PI : 0, kx: 0, ky: 0,
    hp: 100, maxHp: 100, st: 100, state: 'normal', t: 0,
    combo: 0, comboT: 0, queued: false, hitDone: true, atkDur: 0.3, hitAt: 0.1,
    rollDx: 0, rollDy: 0, inv: 0, hurtT: 0, held: null, clingers: [], shake: 0,
    bleed: 0, revive: 0, reviveTgt: null,
    xp: 0, lvl: 1, pts: 0, sk: { str: 0, agi: 0, eng: 0 }, menu: false, menuSel: 0,
    anim: 0, moving: false, rollStrike: 0, hint: '', kills: 0, swingA: 0,
  };
}
const pname = (p) => PAL[p.i].name;
const alive = (p) => p.state !== 'downed' && p.state !== 'dead';

// ===== Эффекты =====
const MAX_PARTS = 350;
function part(x, y, z, vx, vy, vz, life, col, size, grav = 600) {
  if (G.parts.length >= MAX_PARTS) G.parts.shift();
  G.parts.push({ x, y, z, vx, vy, vz, life, max: life, col, size, grav });
}
function burst(x, y, z, n, col, spd = 160, size = 3, life = 0.5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.7);
    part(x, y, z, Math.cos(a) * s, Math.sin(a) * s * 0.6, 80 + Math.random() * 200, life * (0.6 + Math.random() * 0.6), col, size * (0.6 + Math.random() * 0.8));
  }
}
function floatText(x, y, text, col = '#fff', size = 16) {
  if (G.texts.length > 30) G.texts.shift();
  G.texts.push({ x, y, text, col, size, t: 1.2 });
}
function stain(x, y, col, r) {
  if (G.stains.length > 70) G.stains.shift();
  G.stains.push({ x, y, col, r, a: Math.random() * 3 });
}
function addShake(v) { G.shake = Math.min(14, G.shake + v); }

// ===== Опыт =====
function giveXP(p, amt) {
  if (p.state === 'dead') return;
  p.xp += amt;
  while (p.xp >= xpNeed(p.lvl)) {
    p.xp -= xpNeed(p.lvl); p.lvl++; p.pts++;
    floatText(p.x, p.y - 90, 'Новый уровень!', PAL[p.i].accent, 20);
    msg(`${pname(p)}: уровень ${p.lvl} — очко навыка (${Input.btn(p.i, 'menu')})`, PAL[p.i].accent);
    Sfx.play('level');
  }
}

// ===== Игрок =====
function updatePlayer(p, c, dt) {
  p.inv = Math.max(0, p.inv - dt); p.hurtT = Math.max(0, p.hurtT - dt);
  p.rollStrike = Math.max(0, p.rollStrike - dt);
  p.hint = '';
  if (p.state === 'dead') return;

  // остаточный толчок
  p.x += p.kx * dt; p.y += p.ky * dt;
  const kd = Math.pow(0.0008, dt); p.kx *= kd; p.ky *= kd;

  if (p.state === 'downed') {
    p.bleed -= dt;
    p.x += c.mx * 30 * dt; p.y += c.my * 30 * dt;
    collideWorld(p, p.r, false);
    if (p.bleed <= 0) {
      p.state = 'dead';
      msg(`${pname(p)} погиб... вернётся на рассвете, если второй продержится`, '#ff8a7a');
      Sfx.play('down'); burst(p.x, p.y, 10, 14, '#5a1612', 120, 4);
    }
    return;
  }

  if (c.pressed.menu) { p.menu = !p.menu; Sfx.play('menu'); }
  if (p.menu) {
    if (c.pressed.up) { p.menuSel = (p.menuSel + 2) % 3; Sfx.play('menu'); }
    if (c.pressed.down) { p.menuSel = (p.menuSel + 1) % 3; Sfx.play('menu'); }
    if (c.pressed.attack || c.pressed.interact) buySkill(p, SKILLS[p.menuSel].id);
    if (c.pressed.roll) p.menu = false;
    collideWorld(p, p.r, false);
    return;
  }

  if (p.state !== 'roll') p.st = Math.min(100, p.st + 30 * dt);
  const mv = Math.hypot(c.mx, c.my);
  p.moving = mv > 0.1;
  if (c.ax || c.ay) p.face = Math.atan2(c.ay, c.ax);
  else if (p.moving && p.state !== 'attack') p.face = Math.atan2(c.my, c.mx);

  let spd = 160 * (1 + 0.06 * p.sk.agi);
  if (p.held && p.held.kind === 'furn') spd *= 0.5 + 0.08 * p.sk.str;
  if (p.clingers.length) spd *= 0.5;

  // поднимаем союзника
  if (p.reviveTgt) {
    const t = p.reviveTgt;
    if (!c.down.interact || t.state !== 'downed' || dist(p.x, p.y, t.x, t.y) > 64) { p.reviveTgt = null; p.revive = 0; }
    else {
      p.revive += dt; spd = 0; p.moving = false;
      if (p.revive >= 2.2) {
        t.state = 'normal'; t.hp = t.maxHp * 0.4; t.inv = 1.5; p.reviveTgt = null; p.revive = 0;
        msg(`${pname(p)} поднял союзника!`, '#9fe39a'); Sfx.play('revive');
        giveXP(p, 15);
      }
    }
  }

  switch (p.state) {
    case 'roll': {
      p.t -= dt;
      const rs = (330 + 25 * Math.min(p.sk.agi, 2)) * (p.sk.agi >= 2 ? 1.15 : 1);
      p.x += p.rollDx * rs * dt; p.y += p.rollDy * rs * dt;
      if (p.sk.agi >= 5) for (const e of G.enemies) if (!e.dead && e.state !== 'cling' && dist(p.x, p.y, e.x, e.y) < p.r + e.r + 4) {
        e.kx += p.rollDx * 300 / e.mass; e.ky += p.rollDy * 300 / e.mass; e.stun = Math.max(e.stun, 0.3);
      }
      if (p.t <= 0) { p.state = 'normal'; if (p.sk.agi >= 3) p.rollStrike = 0.5; }
      break;
    }
    case 'attack':
      p.t += dt;
      if (!p.hitDone && p.t >= p.hitAt) { p.hitDone = true; meleeHit(p); }
      p.x += c.mx * spd * 0.25 * dt; p.y += c.my * spd * 0.25 * dt;
      if (p.t >= p.atkDur) {
        if (p.queued) startAttack(p, (p.combo + 1) % 3);
        else { p.state = 'normal'; p.comboT = 0.35; }
      }
      break;
    default:
      p.x += c.mx * spd * dt; p.y += c.my * spd * dt;
      p.comboT -= dt;
  }
  if (p.moving) p.anim += dt * 9 * (spd / 160);

  // --- кнопки ---
  if (c.pressed.roll && p.state !== 'roll') {
    if (p.clingers.length) {
      p.shake++;
      floatText(p.x, p.y - 80, `Стряхнуть: ${p.shake}/3`, '#ffb0a0', 14);
      if (p.shake >= 3) shakeOffClingers(p);
    } else {
      const cost = Math.max(10, 25 - 3 * p.sk.agi - (p.sk.agi >= 4 ? 3 : 0));
      if (p.st >= cost && !(p.held && p.held.kind === 'furn')) {
        p.st -= cost; p.state = 'roll'; p.t = 0.3;
        const m = Math.hypot(c.mx, c.my);
        if (m > 0.1) { p.rollDx = c.mx / m; p.rollDy = c.my / m; }
        else { p.rollDx = Math.cos(p.face); p.rollDy = Math.sin(p.face); }
        p.inv = Math.max(p.inv, 0.3); p.queued = false; p.reviveTgt = null;
        Sfx.play('roll'); burst(p.x, p.y, 2, 4, '#4a4232', 60, 3, 0.4);
      }
    }
  }
  if (c.pressed.attack) {
    if (p.held) throwHeld(p);
    else if (p.clingers.length) { floatText(p.x, p.y - 80, `Паразит! Жми ${Input.btn(p.i, 'roll')}`, '#ff9a8a', 14); Sfx.play('deny'); }
    else if (p.state === 'attack') { if (p.t > p.atkDur * 0.3) p.queued = true; }
    else if (p.state === 'normal') startAttack(p, p.comboT > 0 ? (p.combo + 1) % 3 : 0);
  }
  if (c.pressed.interact && p.state !== 'roll') interact(p);
  if (c.pressed.build && p.state !== 'roll') buildOrRepair(p);
  if (c.pressed.trap && p.state !== 'roll') placeTrap(p);

  collideWorld(p, p.r, false);
  if (p.held && p.held.kind === 'furn') { const f = p.held.ref; f.x = p.x - f.w / 2; f.y = p.y - f.h / 2; }
  computeHint(p);
}

function buySkill(p, id) {
  const lvl = p.sk[id];
  if (lvl >= 5) { Sfx.play('deny'); return; }
  const cost = skillCost(lvl);
  if (p.pts < cost) { Sfx.play('deny'); floatText(p.x, p.y - 90, `Нужно очков: ${cost}`, '#ff9a8a', 14); return; }
  p.pts -= cost; p.sk[id]++;
  Sfx.play('level');
  floatText(p.x, p.y - 90, SKILLS.find((s) => s.id === id).name + ' ' + p.sk[id], PAL[p.i].accent, 16);
  if (p.pts === 0) p.menu = false;
}

function startAttack(p, idx) {
  p.state = 'attack'; p.combo = idx; p.t = 0; p.hitDone = false; p.queued = false;
  p.atkDur = idx === 2 ? 0.46 : 0.28; p.hitAt = idx === 2 ? 0.2 : 0.1;
  p.kx += Math.cos(p.face) * (idx === 2 ? 220 : 110); p.ky += Math.sin(p.face) * (idx === 2 ? 220 : 110);
  Sfx.play('swing');
}

function meleeHit(p) {
  const heavy = p.combo === 2;
  let dmg = (heavy ? 30 : 17) * (1 + 0.15 * Math.min(p.sk.str, 3) + (p.sk.str >= 4 ? 0.15 : 0));
  let crit = false;
  if (p.rollStrike > 0) { dmg *= 2; p.rollStrike = 0; crit = true; }
  const reach = heavy ? 74 : 62, arc = heavy ? 1.25 : 1.0;
  const kb = heavy ? (p.sk.str >= 3 ? 520 : 360) : 170;
  const stun = heavy ? (p.sk.str >= 4 ? 0.9 : 0.5) : 0.12;
  let hit = 0;
  for (const e of G.enemies) {
    if (e.dead || e.state === 'dying' || e.state === 'cling') continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d > reach + e.r) continue;
    if (Math.abs(angDiff(p.face, Math.atan2(e.y - p.y, e.x - p.x))) > arc && d > e.r + p.r + 4) continue;
    damageEnemy(e, dmg, p, kb, stun); hit++;
  }
  // ящики с припасами
  for (const s of World.structs) {
    if (s.kind !== 'loot' || s.hp <= 0) continue;
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    if (distToRect(p.x, p.y, s.x, s.y, s.w, s.h) > reach - 10) continue;
    if (Math.abs(angDiff(p.face, Math.atan2(cy - p.y, cx - p.x))) > arc + 0.3) continue;
    damageStruct(s, dmg); hit++;
  }
  // рубим деревья
  if (!hit) for (const t of World.trees) {
    if (dist(p.x, p.y, t.x, t.y) > reach + t.r - 6) continue;
    if (Math.abs(angDiff(p.face, Math.atan2(t.y - p.y, t.x - p.x))) > arc) continue;
    t.shake = 0.3; Sfx.play('wood');
    burst(t.x, t.y, 30, 4, '#6b5236', 120, 3);
    if (t.wood > 0 && Math.random() < 0.45) {
      t.wood--;
      const a = Math.atan2(p.y - t.y, p.x - t.x);
      dropPickup('wood', t.x + Math.cos(a) * 26, t.y + Math.sin(a) * 26);
    } else if (t.wood <= 0) floatText(t.x, t.y - 60, 'Дерево пустое до утра', '#bbb', 13);
    hit = -1; break;
  }
  if (hit > 0) { G.hitstop = heavy ? 0.06 : 0.035; addShake(heavy ? 5 : 2); Sfx.play('hit'); }
  if (crit && hit > 0) floatText(p.x, p.y - 80, 'Удар с переката!', '#ffe08a', 14);
}

function shakeOffClingers(p) {
  for (const e of p.clingers) {
    e.state = 'move'; e.host = null; e.stun = 1.3; e.cd = 1.5;
    const a = Math.random() * TAU; e.x = p.x + Math.cos(a) * 30; e.y = p.y + Math.sin(a) * 30;
    e.kx = Math.cos(a) * 350; e.ky = Math.sin(a) * 350;
  }
  p.clingers.length = 0; p.shake = 0;
  floatText(p.x, p.y - 80, 'Стряхнул!', '#d6ffb0', 15);
}

function hurtPlayer(p, dmg, src) {
  if (!alive(p) || p.inv > 0) return;
  if (p.held && p.held.kind === 'furn' && p.sk.str >= 5) dmg *= 0.5;
  p.hp -= dmg; p.inv = 0.45; p.hurtT = 0.25; p.reviveTgt = null; p.revive = 0;
  if (src) { const a = Math.atan2(p.y - src.y, p.x - src.x); p.kx += Math.cos(a) * 260; p.ky += Math.sin(a) * 260; }
  burst(p.x, p.y, 30, 6, '#7a1a14', 140, 3);
  addShake(4); Sfx.play('hurt');
  if (p.state === 'attack' && Math.random() < 0.5) p.state = 'normal';
  if (p.hp <= 0) downPlayer(p);
}

function downPlayer(p) {
  p.hp = 0; p.state = 'downed'; p.bleed = 25; p.menu = false;
  dropHeld(p, true);
  for (const e of p.clingers) { e.state = 'move'; e.host = null; e.stun = 1; e.x += rand(-20, 20); e.y += rand(-20, 20); }
  p.clingers.length = 0;
  const o = G.players[1 - p.i];
  msg(alive(o) ? `${pname(p)} без сознания! ${pname(o)}: держи ${Input.btn(o.i, 'interact')} рядом, чтобы поднять` : `${pname(p)} без сознания!`, '#ff8a7a');
  Sfx.play('down'); stain(p.x, p.y, 'rgba(70,10,8,0.6)', 18);
}

// ----- Взаимодействие (X) -----
function interactTarget(p) {
  const o = G.players[1 - p.i];
  if (o.state === 'downed' && dist(p.x, p.y, o.x, o.y) < 60) return { t: 'revive', o };
  if (alive(o) && o.clingers.length && !p.clingers.length && dist(p.x, p.y, o.x, o.y) < 72) return { t: 'unclinger', o };
  if (p.held) return { t: 'drop' };
  const fx = p.x + Math.cos(p.face) * 18, fy = p.y + Math.sin(p.face) * 18;
  let best = null, bd = 1e9;
  for (const it of G.items) {
    if (it.held || it.fly) continue;
    const d = dist(fx, fy, it.x, it.y);
    if (d < 46 && d < bd) { bd = d; best = { t: 'item', it }; }
  }
  for (const s of World.structs) {
    if (s.carried) continue;
    if (s.kind === 'furn') {
      const d = distToRect(fx, fy, s.x, s.y, s.w, s.h);
      if (d < 30 && d < bd) { bd = d; best = { t: 'furn', s }; }
    } else if (s.kind === 'door' && !s.broken) {
      const d = distToRect(fx, fy, s.x, s.y, s.w, s.h) + 6;
      if (d < 44 && d < bd) { bd = d; best = { t: 'door', s }; }
    }
  }
  return best;
}

function interact(p) {
  const t = interactTarget(p);
  if (!t) return;
  switch (t.t) {
    case 'revive': p.reviveTgt = t.o; p.revive = 0; break;
    case 'unclinger': {
      const e = t.o.clingers.pop(); t.o.shake = 0;
      if (e) { e.host = null; e.state = 'move'; killEnemy(e, p); floatText(t.o.x, t.o.y - 80, 'Сорвал паразита!', '#d6ffb0', 15); }
      break;
    }
    case 'drop': dropHeld(p, false); break;
    case 'item': t.it.held = true; p.held = { kind: 'item', ref: t.it }; Sfx.play('pickup'); break;
    case 'furn':
      t.s.carried = true; t.s.solid = false; p.held = { kind: 'furn', ref: t.s }; G.flowDirty = true;
      Sfx.play('pickup'); break;
    case 'door': {
      const s = t.s;
      if (s.open) {
        for (const q of G.players) if (q.state !== 'dead' && distToRect(q.x, q.y, s.x, s.y, s.w, s.h) < q.r) { Sfx.play('deny'); return; }
        for (const e of G.enemies) if (!e.dead && distToRect(e.x, e.y, s.x, s.y, s.w, s.h) < e.r) { Sfx.play('deny'); return; }
      }
      s.open = !s.open; s.solid = !s.open; G.flowDirty = true; Sfx.play('door');
      break;
    }
  }
}

function dropHeld(p, forced) {
  if (!p.held) return;
  const h = p.held;
  if (h.kind === 'item') {
    h.ref.held = false; h.ref.x = p.x + Math.cos(p.face) * 16; h.ref.y = p.y + Math.sin(p.face) * 16 + 2;
    p.held = null; return;
  }
  const f = h.ref;
  const d = p.r + Math.max(f.w, f.h) / 2 + 6;
  const tries = [0, 0.5, -0.5, 1, -1, Math.PI];
  for (const da of tries) {
    const a = p.face + da;
    const x = Math.round((p.x + Math.cos(a) * d - f.w / 2) / 4) * 4, y = Math.round((p.y + Math.sin(a) * d - f.h / 2) / 4) * 4;
    if (canPlace(x, y, f.w, f.h, f)) {
      f.x = x; f.y = y; f.carried = false; f.solid = true; p.held = null; G.flowDirty = true; Sfx.play('build'); return;
    }
  }
  if (forced) { // ставим где стоим (игрок упал)
    f.x = p.x - f.w / 2; f.y = p.y - f.h / 2; f.carried = false; f.solid = false; f.ghost = 1.5; p.held = null; G.flowDirty = true;
  } else { floatText(p.x, p.y - 80, 'Нет места', '#ff9a8a', 14); Sfx.play('deny'); }
}

function throwHeld(p) {
  const h = p.held;
  if (h.kind === 'furn' && p.sk.str < 2) { dropHeld(p, false); return; }
  const a = p.face, sp = h.kind === 'furn' ? 420 : 560;
  const pr = { kind: h.kind === 'furn' ? 'furn' : h.ref.kind, ref: h.ref, x: p.x + Math.cos(a) * 18, y: p.y + Math.sin(a) * 18, z: 40, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 140, owner: p, hit: new Set() };
  if (h.kind === 'item') { h.ref.fly = true; }
  G.projs.push(pr); p.held = null;
  Sfx.play('throw');
}

// ----- Строительство / ремонт (Y) -----
function frontPoint(p, d) { return { x: p.x + Math.cos(p.face) * d, y: p.y + Math.sin(p.face) * d }; }

function repairTarget(p) {
  const f = frontPoint(p, 30);
  let best = null, bd = 1e9;
  for (const s of World.structs) {
    if (!(s.kind === 'door' || s.kind === 'window' || s.kind === 'barricade') || s.hp >= s.maxHp) continue;
    const d = distToRect(f.x, f.y, s.x, s.y, s.w, s.h);
    if (d < 40 && d < bd) { bd = d; best = s; }
  }
  return best;
}

function barricadeSpec(p) {
  const vert = Math.abs(Math.cos(p.face)) > Math.abs(Math.sin(p.face));
  const w = vert ? 16 : 64, h = vert ? 64 : 16;
  const f = frontPoint(p, p.r + 20);
  return { x: Math.round((f.x - w / 2) / 8) * 8, y: Math.round((f.y - h / 2) / 8) * 8, w, h };
}

function buildOrRepair(p) {
  if (p.held) return;
  const r = repairTarget(p);
  if (r) {
    const cost = r.broken ? 2 : 1;
    if (G.team.wood < cost) { msg(`Нужно дерево: ${cost}`, '#ff9a8a'); Sfx.play('deny'); return; }
    if (r.broken) {
      for (const q of G.players) if (q.state !== 'dead' && distToRect(q.x, q.y, r.x, r.y, r.w, r.h) < q.r) { Sfx.play('deny'); return; }
      for (const e of G.enemies) if (!e.dead && distToRect(e.x, e.y, r.x, r.y, r.w, r.h) < e.r) { Sfx.play('deny'); return; }
    }
    G.team.wood -= cost;
    const amt = r.maxHp * (r.broken ? 0.6 : 0.45) * (p.sk.eng >= 4 ? 2 : 1);
    r.hp = Math.min(r.maxHp, (r.broken ? 0 : r.hp) + amt);
    if (r.broken) { r.broken = false; r.open = false; r.solid = true; }
    G.flowDirty = true; Sfx.play('build'); burst(r.x + r.w / 2, r.y + r.h / 2, 20, 6, '#8a6a44', 90, 3);
    floatText(r.x + r.w / 2, r.y - 30, 'Починено', '#d6c49a', 14);
    giveXP(p, 2);
    return;
  }
  const cost = p.sk.eng >= 2 ? 1 : 2;
  if (G.team.wood < cost) { msg(`Баррикада: нужно дерево (${cost})`, '#ff9a8a'); Sfx.play('deny'); return; }
  const b = barricadeSpec(p);
  if (!canPlace(b.x, b.y, b.w, b.h, null, false)) { floatText(p.x, p.y - 80, 'Нельзя строить здесь', '#ff9a8a', 14); Sfx.play('deny'); return; }
  G.team.wood -= cost;
  const hp = Math.round(STRUCT_HP.barricade * (1 + 0.3 * p.sk.eng));
  makeStruct('barricade', b.x, b.y, b.w, b.h, { hp, maxHp: hp, vert: b.w < b.h });
  G.flowDirty = true; Sfx.play('build'); burst(b.x + b.w / 2, b.y + b.h / 2, 20, 8, '#8a6a44', 90, 3);
}

function placeTrap(p) {
  if (p.held) return;
  const cost = p.sk.eng >= 5 ? 1 : 2;
  if (G.team.scrap < cost) { msg(`Ловушка: нужен хлам (${cost})`, '#ff9a8a'); Sfx.play('deny'); return; }
  const f = frontPoint(p, p.r + 22);
  const x = Math.round((f.x - 18) / 4) * 4, y = Math.round((f.y - 14) / 4) * 4;
  if (!canPlace(x, y, 36, 28, null, false)) { floatText(p.x, p.y - 80, 'Нельзя ставить здесь', '#ff9a8a', 14); Sfx.play('deny'); return; }
  G.team.scrap -= cost;
  const uses = 6 + (p.sk.eng >= 3 ? 6 : 0);
  makeStruct('trap', x, y, 36, 28, { hp: uses, maxHp: uses, solid: false, low: true, cd: new Map() });
  G.flowDirty = true; Sfx.play('build');
}

function computeHint(p) {
  if (p.held) {
    if (p.held.kind === 'furn') p.hint = `${Input.btn(p.i, 'interact')}: поставить` + (p.sk.str >= 2 ? `  ${Input.btn(p.i, 'attack')}: бросить` : '');
    else p.hint = `${Input.btn(p.i, 'attack')}: бросить  ${Input.btn(p.i, 'interact')}: положить`;
    return;
  }
  const t = interactTarget(p);
  if (t) {
    const b = Input.btn(p.i, 'interact');
    const names = { revive: `держи ${b}: поднять`, unclinger: `${b}: сорвать паразита`, item: `${b}: поднять`, furn: `${b}: взять мебель`, door: '' };
    p.hint = t.t === 'door' ? `${b}: ${t.s.open ? 'закрыть' : 'открыть'} дверь` : names[t.t];
    return;
  }
  const r = repairTarget(p);
  if (r) p.hint = `${Input.btn(p.i, 'build')}: починить (${r.broken ? 2 : 1} дер.)`;
}

// ===== Монстры =====
const EDEF = {
  walker: { hp: 60, spd: 64, r: 15, dmg: 12, sdmg: 16, range: 30, wind: 0.5, cd: 1.0, xp: 10, mass: 1, name: 'Бродяга' },
  jumper: { hp: 42, spd: 100, r: 14, dmg: 14, sdmg: 8, range: 26, wind: 0.32, cd: 0.9, xp: 15, mass: 0.8, name: 'Прыгун' },
  clinger: { hp: 14, spd: 128, r: 9, dmg: 4, sdmg: 3, range: 18, wind: 0.2, cd: 0.6, xp: 6, mass: 0.35, name: 'Прилипала' },
  brute: { hp: 340, spd: 42, r: 28, dmg: 28, sdmg: 80, range: 58, wind: 0.95, cd: 1.6, xp: 60, mass: 4.5, name: 'Тяжеловес' },
};

function spawnEnemy(type, x, y, night) {
  const d = EDEF[type], n = G.day;
  const hpMul = night ? 1 + 0.15 * (n - 1) : 0.8;
  const e = {
    type, x, y, r: d.r, hp: d.hp * hpMul, maxHp: d.hp * hpMul, dmgMul: night ? 1 + 0.1 * (n - 1) : 0.8,
    state: 'move', t: 0, cd: rand(0, 1), stun: 0, kx: 0, ky: 0, face: 0, flash: 0, anim: rand(0, 4), mass: d.mass,
    night, aggro: night, wanderA: rand(0, TAU), wanderT: 0, host: null, tgt: null, tgtS: null, leapDx: 0, leapDy: 0, hitP: null, dead: false, tick: 1,
  };
  G.enemies.push(e);
  return e;
}

function damageEnemy(e, dmg, src, kb, stun) {
  if (e.dead || e.state === 'dying') return;
  e.hp -= dmg; e.flash = 0.12;
  const a = Math.atan2(e.y - src.y, e.x - src.x);
  e.kx += Math.cos(a) * kb / e.mass; e.ky += Math.sin(a) * kb / e.mass;
  const st = e.type === 'brute' ? stun * 0.35 : stun;
  if (st > e.stun) e.stun = st;
  if (e.state === 'wind' && st > 0.3) e.state = 'move';
  burst(e.x, e.y, 25, 5, e.type === 'clinger' ? '#8a6f66' : '#3b2a1e', 150, 3);
  e.aggro = true;
  if (e.hp <= 0) killEnemy(e, src.i !== undefined ? src : src.owner);
}

function killEnemy(e, by) {
  if (e.dead || e.state === 'dying') return;
  if (e.host) { const h = e.host; const k = h.clingers.indexOf(e); if (k >= 0) h.clingers.splice(k, 1); e.host = null; }
  e.state = 'dying'; e.t = 0.4; G.kills++;
  stain(e.x, e.y, 'rgba(30,22,14,0.55)', e.r * 1.1);
  burst(e.x, e.y, 20, 10, '#2c2118', 180, 4);
  const d = EDEF[e.type];
  if (by && by.i !== undefined) {
    by.kills++;
    giveXP(by, d.xp);
    const o = G.players[1 - by.i]; if (o.state !== 'dead') giveXP(o, Math.round(d.xp / 2));
    floatText(e.x, e.y - 40, `+${d.xp} XP`, '#e9d78a', 13);
  }
  if (Math.random() < (e.type === 'brute' ? 1 : 0.18)) dropPickup(Math.random() < 0.6 ? 'scrap' : 'wood', e.x, e.y);
}

function targetPlayer(e) {
  let best = null, bd = 1e9;
  for (const p of G.players) {
    if (!alive(p)) continue;
    const d = dist2(e.x, e.y, p.x, p.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function updateEnemy(e, dt) {
  const d = EDEF[e.type];
  e.flash -= dt;
  if (e.state === 'dying') { e.t -= dt; if (e.t <= 0) e.dead = true; return; }

  if (e.state === 'cling') {
    const h = e.host;
    if (!h || !alive(h)) { e.state = 'move'; e.host = null; return; }
    e.x = h.x + Math.cos(e.cA) * 8; e.y = h.y + 1; e.anim += dt * 6;
    e.tick -= dt;
    if (e.tick <= 0) { e.tick = 1; h.inv = 0; hurtPlayer(h, d.dmg * e.dmgMul, null); Sfx.play('cling'); }
    return;
  }

  e.x += e.kx * dt; e.y += e.ky * dt;
  const kd = Math.pow(0.002, dt); e.kx *= kd; e.ky *= kd;
  if (e.stun > 0) { e.stun -= dt; if (e.state !== 'leap') e.state = 'move'; collideWorld(e, e.r, false); return; }
  e.cd -= dt;

  const spd = d.spd * (e.night ? 1 + 0.03 * (G.day - 1) : 1);
  let mx = 0, my = 0, ignoreLow = false;

  switch (e.state) {
    case 'wind':
      e.t -= dt;
      if (e.t <= 0) { enemyStrike(e); e.state = 'recover'; e.t = e.type === 'brute' ? 0.6 : 0.35; e.cd = d.cd; }
      break;
    case 'recover':
      e.t -= dt; if (e.t <= 0) e.state = 'move';
      break;
    case 'crouch':
      e.t -= dt;
      if (e.t <= 0) { e.state = 'leap'; e.t = 0.42; e.hitP = null; Sfx.play('swing'); }
      break;
    case 'leap': {
      e.t -= dt; ignoreLow = true;
      mx = e.leapDx * 420; my = e.leapDy * 420;
      for (const p of G.players) {
        if (!alive(p) || e.hitP) continue;
        if (dist(e.x, e.y, p.x, p.y) < e.r + p.r + 4) { e.hitP = p; hurtPlayer(p, d.dmg * e.dmgMul, e); }
      }
      if (e.t <= 0) { e.state = 'recover'; e.t = 0.5; e.cd = 1.4; }
      break;
    }
    case 'move': {
      const p = targetPlayer(e);
      if (!p) { wander(e, dt); mx = Math.cos(e.wanderA) * spd * 0.3; my = Math.sin(e.wanderA) * spd * 0.3; break; }
      const dp = dist(e.x, e.y, p.x, p.y);
      if (!e.aggro) {
        if (dp < 360) { e.aggro = true; Sfx.play('growl'); }
        else { wander(e, dt); mx = Math.cos(e.wanderA) * spd * 0.35; my = Math.sin(e.wanderA) * spd * 0.35; break; }
      }
      const los = dp < 300 && lineClear(e.x, e.y, p.x, p.y);
      if (e.type === 'clinger' && dp < e.r + p.r + 14 && e.cd <= 0 && p.state !== 'roll' && p.clingers.length < 3) {
        e.state = 'cling'; e.host = p; e.cA = rand(0, TAU); e.tick = 0.6; p.clingers.push(e); p.shake = 0;
        floatText(p.x, p.y - 84, 'Прилипала!', '#ff9a8a', 15); Sfx.play('cling');
        break;
      }
      if (e.type === 'jumper' && dp < 230 && dp > 70 && e.cd <= 0 && los) {
        e.state = 'crouch'; e.t = 0.5; e.face = Math.atan2(p.y - e.y, p.x - e.x);
        e.leapDx = Math.cos(e.face); e.leapDy = Math.sin(e.face);
        break;
      }
      if (e.type !== 'clinger' && dp < d.range + p.r && e.cd <= 0) {
        e.state = 'wind'; e.t = d.wind; e.tgt = p; e.tgtS = null; e.face = Math.atan2(p.y - e.y, p.x - e.x);
        break;
      }
      let tx, ty;
      if (los || dp < 50) { tx = p.x; ty = p.y; }
      else {
        const st = flowStep(e.x, e.y);
        if (st) {
          tx = st.x; ty = st.y;
          if (st.s && st.s.solid && e.cd <= 0 && distToRect(e.x, e.y, st.s.x, st.s.y, st.s.w, st.s.h) < e.r + 10) {
            e.state = 'wind'; e.t = d.wind; e.tgtS = st.s; e.tgt = null;
            e.face = Math.atan2(st.s.y + st.s.h / 2 - e.y, st.s.x + st.s.w / 2 - e.x);
            break;
          }
        } else { tx = p.x; ty = p.y; }
      }
      const a = Math.atan2(ty - e.y, tx - e.x);
      e.face = a; mx = Math.cos(a) * spd; my = Math.sin(a) * spd;
      if (dp < d.range + p.r - 4) { mx *= 0.1; my *= 0.1; }
      break;
    }
  }
  e.x += mx * dt; e.y += my * dt;
  if (mx || my) e.anim += dt * (e.type === 'clinger' ? 10 : e.type === 'brute' ? 4 : 7);
  collideWorld(e, e.r, ignoreLow);
  // ловушки
  if (e.state !== 'leap') for (const s of World.structs) {
    if (s.kind !== 'trap' || s.hp <= 0) continue;
    if (!rectsOverlap(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2, s.x, s.y, s.w, s.h)) continue;
    const last = s.cd.get(e) || 0;
    if (G.t - last < 0.7) continue;
    s.cd.set(e, G.t);
    damageEnemy(e, 22, { x: s.x + s.w / 2, y: s.y + s.h / 2 }, 60, 0.4);
    if (e.state === 'dying' || e.dead) giveTrapXP();
    s.hp--; s.flash = 0.15; Sfx.play('hit');
    if (s.hp <= 0) destroyStruct(s);
  }
}

function giveTrapXP() { for (const p of G.players) giveXP(p, 4); }

function wander(e, dt) {
  e.wanderT -= dt;
  if (e.wanderT <= 0) { e.wanderT = rand(1.5, 4); e.wanderA += rand(-1.5, 1.5); }
}

function enemyStrike(e) {
  const d = EDEF[e.type];
  if (e.type === 'brute') {
    const cx = e.x + Math.cos(e.face) * 34, cy = e.y + Math.sin(e.face) * 22;
    Sfx.play('slam'); addShake(9);
    burst(cx, cy, 2, 18, '#4a4232', 220, 5, 0.6);
    for (const p of G.players) if (alive(p) && dist(cx, cy, p.x, p.y) < 82 + p.r) hurtPlayer(p, d.dmg * e.dmgMul, { x: cx, y: cy });
    for (const s of World.structs) {
      if (!s.solid || s.carried) continue;
      if (distToRect(cx, cy, s.x, s.y, s.w, s.h) < 82) damageStruct(s, d.sdmg * e.dmgMul);
    }
    return;
  }
  if (e.tgtS) {
    const s = e.tgtS; e.tgtS = null;
    if (s.solid && distToRect(e.x, e.y, s.x, s.y, s.w, s.h) < e.r + 16) damageStruct(s, d.sdmg * e.dmgMul);
    return;
  }
  const p = e.tgt; e.tgt = null;
  if (!p || !alive(p)) return;
  const dp = dist(e.x, e.y, p.x, p.y);
  if (dp < d.range + p.r + 14 && Math.abs(angDiff(e.face, Math.atan2(p.y - e.y, p.x - e.x))) < 1.4) hurtPlayer(p, d.dmg * e.dmgMul, e);
  Sfx.play('swing');
}

function damageStruct(s, dmg) {
  if (s.hp <= 0 || s.broken) return;
  s.hp -= dmg; s.flash = 0.12;
  burst(s.x + s.w / 2, s.y + s.h / 2, 20, 4, '#7a5c3a', 120, 3);
  Sfx.play('wood');
  if (s.hp <= 0) destroyStruct(s);
  else G.flowDirty = true;
}

function destroyStruct(s) {
  G.flowDirty = true;
  burst(s.x + s.w / 2, s.y + s.h / 2, 20, 16, '#7a5c3a', 200, 4, 0.7);
  Sfx.play(s.kind === 'window' ? 'glass' : 'break');
  if (s.kind === 'door' || s.kind === 'window') {
    s.hp = 0; s.broken = true; s.solid = false; s.open = false;
    msg(s.kind === 'door' ? 'Дверь выбита!' : 'Окно разбито!', '#ffb27a');
    return;
  }
  const k = World.structs.indexOf(s);
  if (k >= 0) World.structs.splice(k, 1);
  if (s.kind === 'loot') dropLoot(s.x + s.w / 2, s.y + s.h / 2);
  for (const p of G.players) if (p.held && p.held.ref === s) p.held = null;
}

// ===== Предметы =====
function dropLoot(x, y) {
  const n = randi(2, 3);
  for (let i = 0; i < n; i++) dropPickup(Math.random() < 0.55 ? 'wood' : 'scrap', x, y);
  if (Math.random() < 0.3) dropPickup('med', x, y);
  if (Math.random() < 0.25) G.items.push({ kind: Math.random() < 0.5 ? 'brick' : 'bottle', x: x + rand(-20, 20), y: y + rand(-14, 14), held: false, fly: false });
}

function dropPickup(kind, x, y) {
  const a = rand(0, TAU), s = rand(40, 110);
  G.pickups.push({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, z: 10, vz: 160, t: 0 });
}

function updatePickups(dt) {
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const k = G.pickups[i];
    k.t += dt;
    if (k.z > 0 || k.vz > 0) { k.vz -= 700 * dt; k.z = Math.max(0, k.z + k.vz * dt); if (k.z === 0) k.vz = 0; }
    k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= Math.pow(0.02, dt); k.vy *= Math.pow(0.02, dt);
    if (k.t < 0.35) continue;
    for (const p of G.players) {
      if (!alive(p)) continue;
      if (k.kind === 'med' && p.hp >= p.maxHp) continue;
      const d = dist(p.x, p.y, k.x, k.y);
      if (d < 70) { const a = Math.atan2(p.y - k.y, p.x - k.x); k.x += Math.cos(a) * 260 * dt; k.y += Math.sin(a) * 260 * dt; }
      if (d < 22) {
        if (k.kind === 'wood') { G.team.wood++; floatText(p.x, p.y - 80, '+1 дерево', '#d8b98a', 13); }
        else if (k.kind === 'scrap') { G.team.scrap++; floatText(p.x, p.y - 80, '+1 хлам', '#b8c4cc', 13); }
        else { p.hp = Math.min(p.maxHp, p.hp + 35); floatText(p.x, p.y - 80, '+35 здоровья', '#9fe39a', 13); }
        Sfx.play('pickup'); G.pickups.splice(i, 1); break;
      }
    }
  }
}

function updateProjs(dt) {
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const pr = G.projs[i];
    pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.vz -= 900 * dt; pr.z += pr.vz * dt;
    let land = pr.z <= 0;
    const r = pr.kind === 'furn' ? 22 : 8;
    for (const e of G.enemies) {
      if (e.dead || e.state === 'dying' || e.state === 'cling' || pr.hit.has(e)) continue;
      if (dist(pr.x, pr.y, e.x, e.y) < e.r + r) {
        pr.hit.add(e);
        const dmg = pr.kind === 'furn' ? 55 + 10 * pr.owner.sk.str : pr.kind === 'brick' ? 30 : 22;
        damageEnemy(e, dmg, pr, pr.kind === 'furn' ? 450 : 220, pr.kind === 'bottle' ? 0.4 : 0.9);
        Sfx.play('hit'); addShake(3);
        if (pr.kind !== 'furn') { land = true; pr.vx *= -0.2; pr.vy *= -0.2; }
        break;
      }
    }
    const o = { x: pr.x, y: pr.y };
    collideWorld(o, r * 0.6, true);
    if (Math.abs(o.x - pr.x) > 0.1 || Math.abs(o.y - pr.y) > 0.1) { land = true; pr.x = o.x; pr.y = o.y; }
    if (!land) continue;
    G.projs.splice(i, 1);
    if (pr.kind === 'bottle') { pr.ref.fly = false; G.items.splice(G.items.indexOf(pr.ref), 1); burst(pr.x, pr.y, 6, 10, '#7fb07a', 140, 3); Sfx.play('glass'); }
    else if (pr.kind === 'brick') { pr.ref.fly = false; pr.ref.x = pr.x; pr.ref.y = pr.y; Sfx.play('wood'); }
    else {
      const f = pr.ref;
      let x = pr.x - f.w / 2, y = pr.y - f.h / 2, placed = false;
      for (let k = 0; k < 14 && !placed; k++) {
        if (canPlace(x, y, f.w, f.h, f)) placed = true;
        else { x -= pr.vx * 0.02; y -= pr.vy * 0.02; }
      }
      if (!placed) { x = pr.owner.x - f.w / 2; y = pr.owner.y + 20; }
      f.x = x; f.y = y; f.carried = false; f.solid = placed; if (!placed) f.ghost = 1.5;
      damageStruct(f, 15); G.flowDirty = true; addShake(4);
    }
  }
}

function updateParts(dt) {
  const P = G.parts;
  for (let i = P.length - 1; i >= 0; i--) {
    const q = P[i];
    q.life -= dt;
    if (q.life <= 0) { P.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vz -= q.grav * dt; q.z += q.vz * dt;
    if (q.z < 0) { q.z = 0; q.vz *= -0.3; q.vx *= 0.6; q.vy *= 0.6; }
  }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.t -= dt; t.y -= 26 * dt; if (t.t <= 0) G.texts.splice(i, 1); }
}
