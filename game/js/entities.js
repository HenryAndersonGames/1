'use strict';
// ---------- Игроки, оружие, предметы, постройки ----------
const skillCost = (lvl) => 1 + Math.floor(lvl / 2);
const xpNeed = (lvl) => 40 + 30 * (lvl - 1);

function makePlayer(i, x, y) {
  return {
    i, x, y, r: 13, face: i ? Math.PI : 0, kx: 0, ky: 0, hp: 100, maxHp: 100, st: 100, state: 'normal', t: 0,
    weapon: { type: 'bat', dur: WEAPONS.bat.durab }, atk: null, comboN: 0, queue: null, gunCd: 0, sinceRoll: 9,
    slots: [null, null, null, null, null], gear: { head: null, body: null, arms: null, legs: null }, rageT: 0, stoneT: 0, regenAb: 0, bag: null, pickW: null, abCd: {}, menuTab: 0, abSel: 0, food: 100, armor: 0, counterT: 0, hungerT: 0,
    rollDx: 0, rollDy: 0, inv: 0, hurtT: 0, held: null, clingers: [], shake: 0, bleed: 0, revive: 0, reviveTgt: null,
    search: null, webT: 0, slowT: 0, xp: 0, lvl: 1, pts: 0, sk: { str: 0, agi: 0, eng: 0, mar: 0, med: 0, oth: 0 },
    menu: false, menuSel: 0, craft: false, craftSel: 0, anim: 0, moving: false, rollStrike: 0, hint: '', kills: 0, throwT: 0, regenT: 0,
  };
}
const pname = (p) => PAL[p.i].name;
const alive = (p) => p.state !== 'downed' && p.state !== 'dead';
const wep = (p) => WEAPONS[p.weapon.type];

// ===== Эффекты =====
const MAX_PARTS = 420;
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
function stain(x, y, col, r) { if (G.stains.length > 90) G.stains.shift(); G.stains.push({ x, y, col, r, a: Math.random() * 3 }); }
function addShake(v) { G.shake = Math.min(16, G.shake + v); }

function giveXP(p, amt) {
  if (p.state === 'dead') return;
  p.xp += amt;
  while (p.xp >= xpNeed(p.lvl)) {
    p.xp -= xpNeed(p.lvl); p.lvl++; p.pts++;
    floatText(p.x, p.y - 124, 'Новый уровень!', PAL[p.i].accent, 20);
    msg(`${pname(p)}: уровень ${p.lvl} — очко навыка (${Input.btn(p.i, 'menu')})`, PAL[p.i].accent);
    Sfx.play('level');
  }
}

// ===== Игрок =====
const takeBuf = (p, a) => { if (p.buf && p.buf[a] > 0) { p.buf[a] = 0; return true; } return false; };
const peekBuf = (p, a) => p.buf && p.buf[a] > 0;
function updatePlayer(p, c, dt) {
  p.inv = Math.max(0, p.inv - dt); p.hurtT = Math.max(0, p.hurtT - dt); p.rollStrike = Math.max(0, p.rollStrike - dt);
  p.webT = Math.max(0, p.webT - dt); p.slowT = Math.max(0, p.slowT - dt); p.gunCd -= dt; p.throwT -= dt;
  p.sinceRoll = (p.sinceRoll ?? 9) + dt;
  for (const k in p.abCd) p.abCd[k] -= dt;
  p.hint = '';
  if (p.state === 'dead') return;
  p.x += p.kx * dt; p.y += p.ky * dt;
  const kd = Math.pow(0.0008, dt); p.kx *= kd; p.ky *= kd;

  if (p.state === 'downed') {
    p.bleed -= dt;
    p.x += c.mx * 30 * dt; p.y += c.my * 30 * dt;
    collideWorld(p, p.r, null);
    if (p.bleed <= 0) {
      p.state = 'dead';
      msg(`${pname(p)} погиб... вернётся на рассвете, если второй продержится`, '#ff8a7a');
      Sfx.play('down'); burst(p.x, p.y, 10, 14, '#5a1612', 120, 4);
    }
    return;
  }
  // голод: тает со временем; на нуле — медленная выносливость и потеря здоровья
  p.counterT = Math.max(0, p.counterT - dt);
  const was = p.food;
  p.food = Math.max(0, p.food - dt * 0.22);
  if (was >= 25 && p.food < 25) floatText(p.x, p.y - 124, 'Голодно... (еда: ' + Input.btn(p.i, 'eat') + ')', '#e8b08a', 14);
  if (p.food <= 0 && p.hp > 20) { p.hungerT += dt; if (p.hungerT > 2) { p.hungerT = 0; p.hp -= 1; } }
  if (p.sk.med >= 4 && p.hp < p.maxHp) { p.regenT += dt; if (p.regenT > 1) { p.regenT = 0; p.hp = Math.min(p.maxHp, p.hp + 1); } }

  // меню навыков / крафта
  if (c.pressed.menu && !p.craft) { p.menu = !p.menu; Sfx.play('menu'); }
  if (p.menu) {
    if (c.pressed.left || c.pressed.right) { p.menuTab = 1 - p.menuTab; Sfx.play('menu'); }
    if (p.menuTab === 0) menuNav(p, c, 'menuSel', SKILLS.length, () => buySkill(p, SKILLS[p.menuSel].id), () => { p.menu = false; });
    else {
      const ids = Object.keys(ABIL);
      menuNav(p, c, 'abSel', ids.length, () => {}, () => { p.menu = false; });
      for (let k = 0; k < 5; k++) if (c.pressed['ab' + (k + 1)]) {
        const id = ids[p.abSel];
        if (!abilityUnlocked(p, id)) { Sfx.play('deny'); continue; }
        const old = p.slots.indexOf(id); if (old >= 0) p.slots[old] = p.slots[k];
        p.slots[k] = id; Sfx.play('level');
      }
    }
    collideWorld(p, p.r, null); return;
  }
  if (p.craft) {
    if (dist(p.x, p.y, World.bench.x + 32, World.bench.y + 15) > 100) p.craft = false;
    else { menuNav(p, c, 'craftSel', RECIPES.length, () => craft(p, RECIPES[p.craftSel]), () => { p.craft = false; }); collideWorld(p, p.r, null); return; }
  }

  if (p.state !== 'roll' && p.state !== 'atk') p.st = Math.min(100, p.st + (p.food > 0 ? 30 : 15) * dt);
  const mv = Math.hypot(c.mx, c.my);
  p.moving = mv > 0.1;
  const busy = p.state === 'light' || p.state === 'atk' || p.state === 'dash';
  if ((c.ax || c.ay) && !busy) p.face = Math.atan2(c.ay, c.ax);
  else if (p.moving && !busy) p.face = Math.atan2(c.my, c.mx);

  let spd = 160 * (1 + 0.06 * p.sk.agi + (p.sk.agi >= 4 ? 0.05 : 0)) * gearSpdMul(p);
  if (p.held && p.held.kind === 'furn') spd *= 0.5 + 0.08 * p.sk.str;
  if (p.clingers.length) spd *= 0.5;
  if (p.webT > 0) spd *= 0.4;
  if (p.slowT > 0) spd *= 0.6;
  if (inWeb(p.x, p.y)) spd *= 0.5;

  // поднимаем союзника
  if (p.reviveTgt) {
    const t = p.reviveTgt, need = p.sk.med >= 2 ? 1.1 : 2.2;
    if (!c.down.interact || t.state !== 'downed' || dist(p.x, p.y, t.x, t.y) > 64) { p.reviveTgt = null; p.revive = 0; }
    else {
      p.revive += dt; spd = 0; p.moving = false;
      if (p.revive >= need) {
        t.state = 'normal'; t.hp = t.maxHp * (p.sk.med >= 5 ? 0.8 : 0.4); t.inv = 1.5; p.reviveTgt = null; p.revive = 0;
        msg(`${pname(p)} поднял союзника!`, '#9fe39a'); Sfx.play('revive'); giveXP(p, 15);
      }
    }
  }
  // подбор оружия удержанием
  if (p.pickW) {
    const it = p.pickW.it;
    if (!c.down.interact || G.items.indexOf(it) < 0 || dist(p.x, p.y, it.x, it.y) > 60) p.pickW = null;
    else if ((p.pickW.t += dt) >= 0.4) { p.pickW = null; takeWeapon(p, it); }
  }
  // обыск
  if (p.search) {
    const s = p.search;
    if (!c.down.interact || p.moving || dist(p.x, p.y, s.prop.x + s.prop.w / 2, s.prop.y + s.prop.h / 2) > Math.max(s.prop.w, s.prop.h) / 2 + 50) p.search = null;
    else {
      s.t += dt; spd = 0;
      if (s.t >= 1.2) { searchProp(p, s.prop); p.search = null; }
    }
  }

  switch (p.state) {
    case 'roll': {
      p.t -= dt;
      const rs = (330 + 25 * Math.min(p.sk.agi, 2)) * (p.sk.agi >= 2 ? 1.15 : 1);
      p.x += p.rollDx * rs * dt; p.y += p.rollDy * rs * dt;
      if (p.sk.agi >= 5) for (const e of G.enemies) if (!e.dead && e.state !== 'cling' && e.type !== 'titan' && dist(p.x, p.y, e.x, e.y) < p.r + e.r + 4) {
        e.kx += p.rollDx * 300 / e.mass; e.ky += p.rollDy * 300 / e.mass; e.stun = Math.max(e.stun, 0.5);
      }
      if (p.t <= 0) { burst(p.x, p.y, 2, 8, '#5a5040', 110, 3, 0.45); p.state = 'normal'; p.sinceRoll = 0; if (p.sk.agi >= 3) p.rollStrike = 0.5; }
      break;
    }
    case 'knock':
      p.t -= dt; p.moving = false;
      if (p.t <= 0) { p.state = 'normal'; p.inv = Math.max(p.inv, 0.4); }
      break;
    case 'light':
      p.t += dt; if (p.t >= p.atk.dur) endAttack(p);
      p.x += c.mx * spd * 0.35 * dt; p.y += c.my * spd * 0.35 * dt;
      break;
    case 'atk': updateAttack(p, c, dt, spd); break;
    case 'dash': {
      p.t -= dt;
      for (let k = 0; k < 4; k++) { p.x += p.rollDx * 275 * dt; p.y += p.rollDy * 275 * dt; collideWorld(p, p.r, null); }
      for (const e of G.enemies) if (!e.dead && e.state !== 'dying' && e.state !== 'cling' && !p.dashSet.has(e) && dist(p.x, p.y, e.x, e.y) < e.r + 26) { p.dashSet.add(e); damageEnemy(e, 26 + 3 * p.sk.agi, p, 300, 0.5); Sfx.play('hit'); }
      burst(p.x, p.y, 10, 1, '#8a7a60', 40, 3, 0.3);
      if (p.t <= 0) p.state = 'normal';
      break;
    }
    default:
      p.x += c.mx * spd * dt; p.y += c.my * spd * dt;
  }
  if (p.moving) p.anim += dt * 10 * (spd / 160);

  if (p.state === 'knock') { collideWorld(p, p.r, null); return; }
  // ---- кнопки ----
  if (peekBuf(p, 'roll') && p.state !== 'roll' && p.state !== 'dash' && !(p.state === 'atk' && p.t >= p.atk.wind && p.t < p.atk.wind + p.atk.act) && takeBuf(p, 'roll')) {
    if (p.clingers.length) {
      p.shake++;
      floatText(p.x, p.y - 116, `Стряхнуть: ${p.shake}/3`, '#ffb0a0', 14);
      if (p.shake >= 3) shakeOffClingers(p);
    } else {
      const cost = Math.max(8, 25 - 3 * p.sk.agi - (p.sk.agi >= 4 ? 3 : 0)) * (1 - gearSum(p, 'roll'));
      if (p.st >= cost && !(p.held && p.held.kind === 'furn')) {
        p.st -= cost; p.state = 'roll'; p.t = 0.32; burst(p.x, p.y, 2, 6, '#5a5040', 90, 3, 0.4); p.perfectDone = false; p.atk = null; p.queue = null; p.search = null;
        if (mv > 0.1) { p.rollDx = c.mx / mv; p.rollDy = c.my / mv; } else { p.rollDx = Math.cos(p.face); p.rollDy = Math.sin(p.face); }
        p.inv = Math.max(p.inv, 0.3); p.reviveTgt = null;
        Sfx.play('roll'); burst(p.x, p.y, 2, 4, '#4a4232', 60, 3, 0.4);
      }
    }
  }
  const atkPress = peekBuf(p, 'light') ? 'light' : peekBuf(p, 'heavy') ? 'heavy' : null;
  if (atkPress) {
    if (p.held) { takeBuf(p, atkPress); throwHeld(p, atkPress === 'heavy'); }
    else if (p.clingers.length) { takeBuf(p, atkPress); floatText(p.x, p.y - 116, `Паразит! Жми ${Input.btn(p.i, 'roll')}`, '#ff9a8a', 14); Sfx.play('deny'); }
    else if (p.state === 'normal') { takeBuf(p, atkPress); startAttack(p, atkPress); }
    else if (p.state === 'atk' && !p.atk.queued && p.t >= p.atk.wind * 0.6 && queueAttack(p, atkPress)) takeBuf(p, atkPress);
  }
  for (let k = 0; k < 5; k++) if (peekBuf(p, 'ab' + (k + 1)) && (p.state === 'normal' || p.state === 'atk' && p.t > p.atk.wind + p.atk.act)) { takeBuf(p, 'ab' + (k + 1)); if (p.state === 'atk') endAttack(p); useAbility(p, k); }
  if (c.pressed.interact && p.state === 'normal') interact(p);
  if (c.pressed.build && p.state === 'normal') buildOrRepair(p);
  if (c.pressed.trap && p.state === 'normal') placeTrap(p);
  if (c.pressed.heal && p.state === 'normal') useBandage(p);
  if (c.pressed.eat && p.state === 'normal') eat(p);
  if (c.pressed.swap && p.state === 'normal') swapWeapon(p);

  collideWorld(p, p.r, p.state === 'roll' && p.sk.agi >= 1 ? { low: true } : null);
  if (p.held && p.held.kind === 'furn') { const f = p.held.ref; f.x = p.x - f.w / 2; f.y = p.y - f.h / 2; }
  computeHint(p);
}

function menuNav(p, c, key, n, ok, close) {
  if (c.pressed.up) { p[key] = (p[key] + n - 1) % n; Sfx.play('menu'); }
  if (c.pressed.down) { p[key] = (p[key] + 1) % n; Sfx.play('menu'); }
  if (c.pressed.light || c.pressed.interact) ok();
  if (c.pressed.roll || (key === 'craftSel' && c.pressed.menu)) { close(); p.buf = {}; }
}

function buySkill(p, id) {
  const lvl = p.sk[id];
  if (lvl >= 5) { Sfx.play('deny'); return; }
  const cost = skillCost(lvl);
  if (p.pts < cost) { Sfx.play('deny'); floatText(p.x, p.y - 124, `Нужно очков: ${cost}`, '#ff9a8a', 14); return; }
  p.pts -= cost; p.sk[id]++;
  Sfx.play('level');
  floatText(p.x, p.y - 124, SKILLS.find((s) => s.id === id).name + ' ' + p.sk[id], PAL[p.i].accent, 16);
  autoSlot(p);
  if (p.pts === 0 && p.menuTab === 0) p.menu = false;
}

// ----- Видимость: удары, способности и действия не проходят сквозь стены и закрытые двери -----
function wallBetween(ax, ay, bx, by, margin = 0) {
  const d = dist(ax, ay, bx, by), n = Math.ceil(d / 7);
  for (let k = 1; k < n; k++) {
    if (k * 7 > d - margin) break;
    const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (pointBlocked(x, y)) return true;
    let b = false;
    sgQuery(SG.dcells, x - 1, y - 1, x + 1, y + 1, (s) => { if (s.solid && !s.low && !s.carried && x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) { b = true; return false; } });
    if (b) return true;
  }
  return false;
}

// ----- Бой: наборы приёмов и комбо -----
function moveAllowed(p, id) { const M = MOVESETS[WCLASS[p.weapon.type]][id]; return M && (!M.mar || p.sk.mar >= M.mar); }
function startAttack(p, kind, forced) {
  const W = wep(p);
  p.search = null; p.queue = null;
  if (kind === 'light' && W.gun) { shoot(p); return; }
  let id = forced || (kind === 'light' ? 'L1' : 'H1');
  if (!forced && p.sinceRoll < 0.35) id = kind === 'light' ? 'DL' : (moveAllowed(p, 'DH') ? 'DH' : 'H1');
  startMove(p, id);
}
// Наведение удара: направление стика в момент нажатия + мягкий доводчик на ближайшего врага в секторе ±70°
// (раньше удар шёл туда, куда герой смотрел в прошлом кадре, — и часто мимо)
function attackAim(p, c, wide) {
  c = c || Input.ctrls[p.i];
  let base = p.face, stick = false;
  if (Math.hypot(c.mx, c.my) > 0.3) { base = Math.atan2(c.my, c.mx); stick = true; }
  if (c.ax || c.ay) { base = Math.atan2(c.ay, c.ax); stick = true; }
  const W = wep(p), reach = (W.gun ? W.gun.range * 0.8 : Math.max(W.L.reach, W.H.reach) + 46);
  let best = null, bs = Infinity;
  for (const e of G.enemies) {
    if (e.dead || e.state === 'dying' || e.hidden || e.state === 'held' || e.state === 'cling') continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d > reach + e.r) continue;
    const da = Math.abs(angDiff(base, Math.atan2(e.y - p.y, e.x - p.x)));
    // стик не трогали — бьём ближайшего врага рядом в любую сторону
    if (da > (!stick && d < reach * 0.75 ? Math.PI : wide ? 1.6 : 1.22)) continue;
    if (wallBetween(p.x, p.y, e.x, e.y, e.r)) continue;
    const sc = d + da * 70;
    if (sc < bs) { bs = sc; best = e; }
  }
  p.face = best ? Math.atan2(best.y - p.y, best.x - p.x) : base;
  p.aimT = best;
}
function startMove(p, id, M) {
  const W = wep(p);
  attackAim(p, null, true);
  M = M || MOVESETS[WCLASS[p.weapon.type]][id];
  const B = M.base === 'H' ? W.H : W.L;
  let wind = M.wind === 1 ? W.H.wind : M.wind, rec = M.rec === 1 ? W.H.rec : M.rec;
  if (M.base === 'H' && p.sk.mar >= 4) wind *= 0.6;
  let weak = false;
  if (M.base === 'H') { if (p.st >= 16) p.st -= 16; else weak = true; }
  p.state = 'atk'; p.t = 0;
  p.atk = { id, M, B, wind, act: Math.max(0.07, M.act), rec, charge: 0, charging: M.base === 'H' && !M.anim, hitsDone: 0, hits: M.hits || 1, weak, queued: null, hitSet: new Set(), anim: animFor(id, M, WCLASS[p.weapon.type]) };
  p.comboN = (p.comboN || 0) + 1;
  Sfx.play(M.base === 'H' ? 'heavy' : 'swing');
}
function updateAttack(p, c, dt, spd) {
  const a = p.atk, M = a.M;
  p.t += dt;
  // во время замаха удар доводится за целью
  if (p.t < a.wind) attackAim(p, c);
  // держишь «тяжёлую» — замах удерживается и копит силу (до ×1.7), отпустил — удар
  if (a.charging && p.t >= a.wind * 0.98) {
    if (c.down.heavy && a.charge < 1.6) { a.charge += dt; p.t = a.wind * 0.98; p.st = Math.max(0, p.st - 6 * dt); }
    else a.charging = false;
  }
  if (a.charging && !c.down.heavy && p.t < a.wind * 0.98) a.charging = false;
  const t0 = a.wind, t1 = a.wind + a.act;
  if (p.t >= t0 && a.hitsDone === 0 && M.lunge) { p.kx += Math.cos(p.face) * M.lunge; p.ky += Math.sin(p.face) * M.lunge; }
  // несколько попаданий за активную фазу (шквал, вращение)
  while (a.hitsDone < a.hits && p.t >= t0 + (a.act * a.hitsDone) / a.hits) { a.hitsDone++; a.hitSet.clear(); meleeHit(p); if (p.state !== 'atk') return; }
  const k = p.t < t0 ? 0.2 : p.t < t1 ? 0.1 : 0.35;
  p.x += c.mx * spd * k * dt; p.y += c.my * spd * k * dt;
  if (p.t >= t1 + a.rec) {
    const q = a.queued;
    p.state = 'normal'; p.atk = null;
    if (q) startMove(p, q);
    else p.comboN = 0;
  }
}
function queueAttack(p, kind) {
  const a = p.atk;
  const nx = a.M.next && a.M.next[kind === 'light' ? 'L' : 'H'];
  if (nx && moveAllowed(p, nx)) a.queued = nx;
  else if (p.t >= a.wind + a.act) a.queued = kind === 'light' ? 'L1' : 'H1';
  return !!a.queued;
}
function endAttack(p) { p.state = 'normal'; p.atk = null; }

// ----- Особые способности (3 кнопки) -----
function abilityUnlocked(p, id) { const r = ABIL[id].req; return p.sk[r[0]] >= r[1]; }
function autoSlot(p) {
  for (const id of Object.keys(ABIL)) {
    if (!abilityUnlocked(p, id) || p.slots.includes(id)) continue;
    const k = p.slots.indexOf(null);
    if (k >= 0) { p.slots[k] = id; floatText(p.x, p.y - 120, `Способность: ${ABIL[id].name} → ${Input.btn(p.i, 'ab' + (k + 1))}`, '#c8a8ff', 14); }
  }
}
function useAbility(p, slot) {
  const id = p.slots[slot];
  if (!id) { floatText(p.x, p.y - 120, 'Слот пуст — способности в меню навыков', '#bbb', 12); return; }
  if (p.abCd[id] > 0) { floatText(p.x, p.y - 120, `${ABIL[id].name}: ${p.abCd[id].toFixed(1)} с`, '#bbb', 12); Sfx.play('deny'); return; }
  p.abCd[id] = ABIL[id].cd;
  const fx = Math.cos(p.face), fy = Math.sin(p.face);
  const foes = (r, x = p.x, y = p.y) => G.enemies.filter((e) => !e.dead && e.state !== 'dying' && e.state !== 'cling' && e.state !== 'held' && dist(x, y, e.x, e.y) < r + e.r && !wallBetween(x, y, e.x, e.y, e.r));
  switch (id) {
    case 'push':
      for (const e of foes(160)) if (Math.abs(angDiff(p.face, Math.atan2(e.y - p.y, e.x - p.x))) < 1.0) { damageEnemy(e, 10, p, 750, 0.9); e.thrown = 0.4; }
      G.waves.push({ x: p.x, y: p.y - 20, r: 20, max: 170, a: p.face, arc: 1.0, col: '180,140,255', t: 0.35 }); Sfx.play('blink'); addShake(4); break;
    case 'bolt': {
      let cur = { x: p.x, y: p.y - 40 }, pts = [cur];
      const used = new Set();
      for (let k = 0; k < 4; k++) {
        let best = null, bd = 1e9;
        for (const e of foes(k ? 200 : 400, cur.x, cur.y + (k ? 0 : 40))) {
          if (used.has(e)) continue;
          if (!k && Math.abs(angDiff(p.face, Math.atan2(e.y - p.y, e.x - p.x))) > 1.3) continue;
          const d = dist2(cur.x, cur.y, e.x, e.y); if (d < bd) { bd = d; best = e; }
        }
        if (!best) break;
        used.add(best); damageEnemy(best, 34 + 4 * p.sk.oth, p, 80, 0.6);
        cur = { x: best.x, y: best.y - 30 }; pts.push(cur);
      }
      if (pts.length === 1) pts.push({ x: p.x + fx * 200, y: p.y + fy * 200 - 30 });
      G.bolts.push({ pts, t: 0.3 }); G.flashes.push({ x: p.x, y: p.y, r: 260, t: 0.15 }); Sfx.play('zap'); break;
    }
    case 'fire':
      for (let k = 1; k <= 4; k++) G.fires.push({ x: p.x + fx * 50 * k, y: p.y + fy * 50 * k, r: 46, t: 5 });
      for (const e of foes(220)) if (Math.abs(angDiff(p.face, Math.atan2(e.y - p.y, e.x - p.x))) < 0.5) damageEnemy(e, 18, p, 150, 0.2);
      Sfx.play('fire'); break;
    case 'frost':
      for (const e of foes(180)) { damageEnemy(e, 10, p, 60, 0); e.frozen = e.type === 'titan' ? 0.8 : 2.6; }
      G.waves.push({ x: p.x, y: p.y - 10, r: 20, max: 190, a: 0, arc: Math.PI, col: '150,210,255', t: 0.45 }); Sfx.play('frost'); break;
    case 'shadow':
      G.allies.push({ x: p.x - fx * 30, y: p.y - fy * 30, owner: p, t: 15, cd: 0, face: p.face, anim: 0 });
      burst(p.x, p.y - 30, 30, 20, '#5a3a8a', 160, 4); Sfx.play('blink'); break;
    case 'dash':
      p.state = 'dash'; p.t = 0.2; p.inv = 0.3; p.rollDx = fx; p.rollDy = fy; p.dashSet = new Set(); Sfx.play('roll'); break;
    case 'quake':
      for (const e of foes(140)) damageEnemy(e, 30 * (1 + 0.1 * p.sk.str), p, 320, 1.4);
      G.waves.push({ x: p.x, y: p.y, r: 20, max: 150, a: 0, arc: Math.PI, col: '200,170,120', t: 0.35 });
      burst(p.x, p.y, 2, 24, '#5a5040', 260, 5, 0.6); stain(p.x, p.y, 'rgba(20,16,10,0.35)', 60); Sfx.play('slam'); addShake(10); break;
    case 'whirl':
      startMove(p, 'whirl', { name: 'Вихрь', base: 'L', k: 0.9, wind: 0.08, act: 0.9, rec: 0.25, arc: Math.PI, sw: [-3.1, 28], pose: 'spin', hits: 6, kb: 1.4, next: {} }); break;
    default: useAbilityExtra(p, id); break;
    case 'medic': {
      const o = partner(p);
      for (const q of [p, o]) if (alive(q) && dist(p.x, p.y, q.x, q.y) < 170) { q.hp = Math.min(q.maxHp, q.hp + 30); floatText(q.x, q.y - 96, '+30', '#9fe39a', 16); burst(q.x, q.y - 30, 30, 10, '#9fe39a', 100, 3); }
      Sfx.play('revive'); break;
    }
  }
}
function updateAllies(dt) {
  for (let i = G.allies.length - 1; i >= 0; i--) {
    const a = G.allies[i];
    a.t -= dt; a.cd -= dt; a.anim += dt * 9;
    if (a.t <= 0 || a.owner.state === 'dead') { burst(a.x, a.y - 30, 30, 14, '#5a3a8a', 140, 3); G.allies.splice(i, 1); continue; }
    let tgt = null, bd = 1e9;
    for (const e of G.enemies) { if (e.dead || e.state === 'dying' || e.state === 'cling' || e.hidden) continue; const d = dist2(a.x, a.y, e.x, e.y); if (d < bd && dist(a.owner.x, a.owner.y, e.x, e.y) < 420) { bd = d; tgt = e; } }
    const tx = tgt ? tgt.x : a.owner.x - 40, ty = tgt ? tgt.y : a.owner.y + 10, d = dist(a.x, a.y, tx, ty);
    a.moving = d > (tgt ? tgt.r + 18 : 40);
    if (a.moving) { const ang = Math.atan2(ty - a.y, tx - a.x); a.face = ang; a.x += Math.cos(ang) * 190 * dt; a.y += Math.sin(ang) * 190 * dt; }
    else if (tgt && a.cd <= 0) { a.cd = 0.55; a.hit = 0.15; damageEnemy(tgt, 12 + 2 * a.owner.sk.oth, a, 160, 0.25); Sfx.play('hit'); }
    a.hit = (a.hit || 0) - dt;
    collideWorld(a, 12, { low: true });
  }
}

function shoot(p) {
  const W = wep(p), gun = W.gun;
  if (p.gunCd > 0) return;
  attackAim(p, null, true);
  if (G.team.ammo <= 0) { floatText(p.x, p.y - 116, 'Нет патронов', '#ff9a8a', 14); Sfx.play('click'); p.gunCd = 0.3; return; }
  G.team.ammo--; p.gunCd = gun.rate;
  p.state = 'light'; p.t = 0; p.atk = { gun: true, dur: W.L.dur, anim: 'shoot' };
  const mx = p.x + Math.cos(p.face) * 30, my = p.y - 38 + Math.sin(p.face) * 18;
  for (let k = 0; k < gun.pellets; k++) {
    const a = p.face + (Math.random() - 0.5) * gun.spread * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    let ex = p.x, ey = p.y, hitE = null;
    for (let d = 16; d < gun.range; d += 8) {
      const x = p.x + dx * d, y = p.y + dy * d;
      ex = x; ey = y;
      let boom = false;
      for (const pr of World.props) if (pr.explosive && !pr.dead && x > pr.x && x < pr.x + pr.w && y > pr.y - 20 && y < pr.y + pr.h) { damageProp(pr, 30); boom = true; break; }
      if (boom || pointBlocked(x, y)) break;
      let blocked = false;
      sgQuery(SG.dcells, x - 1, y - 1, x + 1, y + 1, (s) => { if (s.solid && !s.low && x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) { blocked = true; return false; } });
      if (blocked) break;
      for (const e of G.enemies) if (!e.dead && e.state !== 'dying' && e.state !== 'cling' && !e.hidden && dist2(x, y, e.x, e.y - 10) < (e.r + 6) * (e.r + 6)) { hitE = e; break; }
      if (hitE) break;
      for (const pr of World.props) if (pr.explosive && !pr.dead && x > pr.x && x < pr.x + pr.w && y > pr.y - 20 && y < pr.y + pr.h) { damageProp(pr, 30); blocked = true; break; }
      if (blocked) break;
    }
    if (hitE) damageEnemy(hitE, gun.dmg * (1 + 0.05 * p.sk.str), p, 120, 0.15);
    G.tracers.push({ x0: mx, y0: my, x1: ex, y1: ey - 20, t: 0.08 });
  }
  G.flashes.push({ x: mx, y: my, r: 150, t: 0.07 });
  burst(mx, my, 20, 4, '#ffd070', 120, 2.5, 0.2);
  Sfx.play(gun.pellets > 1 ? 'shotgun' : 'shot'); addShake(gun.pellets > 1 ? 5 : 2);
  alertNoise(p.x, p.y, gun.noise);
  wearWeapon(p, 1);
}

function wearWeapon(p, n) {
  if (p.weapon.type === 'fists') return;
  p.weapon.dur -= n;
  if (p.weapon.dur <= 0) {
    const nm = wep(p).name;
    floatText(p.x, p.y - 124, `${nm} сломалось!`, '#ffb27a', 16); msg(`${pname(p)}: ${nm.toLowerCase()} сломалось`, '#ffb27a');
    burst(p.x, p.y - 30, 20, 10, '#8a6a44', 160, 3);
    if (WEAPONS[p.weapon.type].improvised) { /* доска/стул разлетаются */ }
    p.weapon = { type: 'fists', dur: Infinity }; Sfx.play('break');
  }
}

function meleeHit(p) {
  const a = p.atk, M = a.M, B = a.B, W = wep(p), heavy = M.base === 'H';
  let dmg = B.dmg * M.k * (1 + 0.15 * Math.min(p.sk.str, 3) + (p.sk.str >= 4 ? 0.15 : 0)) * gearDmgMul(p);
  let crit = '';
  if (p.rollStrike > 0) { dmg *= 2; p.rollStrike = 0; crit = 'Удар с переката!'; }
  if (a.weak) dmg *= 0.6;
  if (a.charge > 0.25) { const k = Math.min(1, a.charge / 1.2); dmg *= 1 + 0.7 * k; if (k >= 1) crit = crit || 'Заряженный удар!'; }
  let cstun = 0;
  if (p.counterT > 0) { dmg *= 2; cstun = 0.8; p.counterT = 0; crit = 'Контратака!'; }
  if (a.hitsDone === 1 && (p.comboN || 0) >= 3) crit = crit || M.name + '!';
  const reach = B.reach + (M.reachAdd || 0), arc = M.arc;
  const kb = (heavy ? W.H.kb * (p.sk.str >= 3 ? 1.3 : 1) : W.L.kb) * (M.kb || 1);
  const stun = heavy ? W.H.stun * (M.stunK || 1) + (p.sk.str >= 4 ? 0.3 : 0) : 0.12 * (M.stunK || 1);
  let hit = 0;
  const cx = p.x + Math.cos(p.face) * reach * 0.6, cy = p.y + Math.sin(p.face) * reach * 0.6;
  for (const e of G.enemies) {
    if (e.dead || e.state === 'dying' || e.state === 'cling' || e.state === 'held' || e.state === 'thrownE' || a.hitSet.has(e)) continue;
    const d = dist(p.x, p.y, e.x, e.y), ang = Math.atan2(e.y - p.y, e.x - p.x);
    const inArc = d <= reach + e.r && (Math.abs(angDiff(p.face, ang)) <= arc || d <= e.r + p.r + 4);
    const inAoe = M.aoe && dist(cx, cy, e.x, e.y) < M.aoe + e.r;
    if (!inArc && !inAoe) continue;
    if (wallBetween(p.x, p.y, e.x, e.y, e.r)) continue;
    let dd = dmg;
    if (M.back && Math.abs(angDiff(e.face, ang)) < 1.0) { dd *= M.back; crit = 'В спину!'; }
    if (p.sk.mar >= 5 && (e.stun > 0 || e.frozen > 0)) dd *= 2;
    damageEnemy(e, dd, p, kb, stun + cstun);
    a.hitSet.add(e);
    if (M.launch && p.sk.mar >= 3 && e.type !== 'titan' && e.type !== 'brute') e.thrown = 0.6;
    hit++;
  }
  if (M.aoe) { burst(cx, cy, 2, 14, '#5a5040', 220, 4, 0.5); addShake(5); stain(cx, cy, 'rgba(20,16,10,0.3)', M.aoe * 0.5); }
  // постройки, мебель, ящики, двери — всё ломается; баррикады, двери и окна — только тяжёлым ударом
  for (const s of World.structs) {
    if (s.hp <= 0 || s.broken || s.carried || s.kind === 'trap') continue;
    if (s.kind === 'door' && !s.solid) continue;
    const ok = s.kind === 'loot' || s.kind === 'furn' || heavy || (s.kind === 'door' && W.pry);
    if (!ok) continue;
    const q = nearestOnRect(p.x, p.y, s), dq = dist(p.x, p.y, q.x, q.y);
    if (dq > reach - 4) continue;
    if (dq > 6 && Math.abs(angDiff(p.face, Math.atan2(q.y - p.y, q.x - p.x))) > arc + 0.4) continue;
    if (dq > 6 && wallBetween(p.x, p.y, q.x, q.y, 4)) continue;
    damageStruct(s, s.kind === 'door' ? dmg * (W.pry ? 3 : 1) : dmg); hit++;
  }
  for (const pr of World.props) {
    if (pr.dead || pr.hp <= 0 || !pr.solid) continue;
    const q = nearestOnRect(p.x, p.y, pr), dq = dist(p.x, p.y, q.x, q.y);
    if (dq > reach - 4) continue;
    if (dq > 6 && Math.abs(angDiff(p.face, Math.atan2(q.y - p.y, q.x - p.x))) > arc + 0.4) continue;
    if (dq > 6 && wallBetween(p.x, p.y, q.x, q.y, 4)) continue;
    damageProp(pr, dmg, p); hit++;
  }
  // стены: если перед героем стена — долбим её (лёгкие удары слабее, тяжёлые/заряженные — сильнее)
  if (!hit) hit = hitWall(p, reach, heavy, dmg * (a.charge > 0.25 ? 1.6 : 1));
  // рубим деревья
  if (!hit) for (const t of World.trees) {
    if (Math.abs(t.x - p.x) > 100 || Math.abs(t.y - p.y) > 100) continue;
    if (dist(p.x, p.y, t.x, t.y) > reach + t.r - 6) continue;
    if (Math.abs(angDiff(p.face, Math.atan2(t.y - p.y, t.x - p.x))) > arc) continue;
    t.shake = 0.3; Sfx.play('wood');
    burst(t.x, t.y, 30, 4, '#6b5236', 120, 3);
    const chop = wep(p).chop || 1;
    if (t.wood > 0 && Math.random() < (heavy ? 0.7 : 0.4) * chop) {
      const n = Math.min(t.wood, chop); t.wood -= n;
      const a = Math.atan2(p.y - t.y, p.x - t.x);
      for (let k = 0; k < n; k++) dropPickup('wood', t.x + Math.cos(a) * 26, t.y + Math.sin(a) * 26);
    } else if (t.wood <= 0) floatText(t.x, t.y - 60, 'Дерево пустое до утра', '#bbb', 13);
    hit = -1; break;
  }
  if (hit > 0) {
    G.hitstop = crit ? 0.12 : heavy ? 0.085 : 0.045; addShake(heavy ? 6 : 2.5); Sfx.play(heavy ? 'hitH' : 'hit');
    G.camKick = { x: Math.cos(p.face) * (heavy ? 7 : 3), y: Math.sin(p.face) * (heavy ? 5 : 2), t: 0.12 };
    wearWeapon(p, heavy ? 2 : 1);
    if (crit) floatText(p.x, p.y - 120, crit, '#ffe08a', 15);
  }
}

function shakeOffClingers(p) {
  for (const e of p.clingers) {
    e.state = 'move'; e.host = null; e.stun = 1.3; e.cd = 1.5;
    const a = Math.random() * TAU; e.x = p.x + Math.cos(a) * 30; e.y = p.y + Math.sin(a) * 30;
    e.kx = Math.cos(a) * 350; e.ky = Math.sin(a) * 350;
  }
  p.clingers.length = 0; p.shake = 0;
  floatText(p.x, p.y - 116, 'Стряхнул!', '#d6ffb0', 15);
}

function hurtPlayer(p, dmg, src) {
  if (!alive(p)) return;
  // идеальный уворот: удар пришёл в первые мгновения переката
  if (src && p.state === 'roll' && 0.3 - p.t < 0.17 && !p.perfectDone) {
    p.perfectDone = true; p.counterT = 1.6; G.slowT = 0.45;
    floatText(p.x, p.y - 124, 'Идеальный уворот!', '#bfe8ff', 17); Sfx.play('blink');
    G.waves.push({ x: p.x, y: p.y - 30, r: 10, max: 70, a: 0, arc: Math.PI, col: '190,230,255', t: 0.3 });
    return;
  }
  if (p.inv > 0) return;
  // мебель в руках — щит от ударов спереди
  if (src && p.held && p.held.kind === 'furn') {
    const a = Math.atan2(src.y - p.y, src.x - p.x);
    if (Math.abs(angDiff(p.face, a)) < 1.3) {
      const k = p.sk.str >= 5 ? 0.8 : 0.5, f = p.held.ref;
      f.hp -= dmg * k; dmg *= 1 - k;
      floatText(p.x, p.y - 124, 'Блок!', '#d8c49a', 14); Sfx.play('wood');
      if (f.hp <= 0) { p.held = null; f.carried = false; destroyStruct(f); }
    }
  }
  dmg *= gearDefMul(p); wearGear(p, dmg);
  if (p.armor > 0) { const a = dmg * 0.35; p.armor = Math.max(0, p.armor - a); dmg -= a; if (p.armor <= 0) floatText(p.x, p.y - 124, 'Броня разбита!', '#b0c0d0', 14); }
  p.hp -= dmg; p.inv = 0.45; p.hurtT = 0.3; p.reviveTgt = null; p.revive = 0; p.search = null;
  if (src) { const a = Math.atan2(p.y - src.y, p.x - src.x); p.kx += Math.cos(a) * 260; p.ky += Math.sin(a) * 260; }
  burst(p.x, p.y, 30, 6, '#7a1a14', 140, 3);
  addShake(4); Sfx.play('hurt');
  if (p.state === 'light' || (p.state === 'atk' && p.t < p.atk.wind && p.sk.str < 3)) { p.state = 'normal'; p.atk = null; }
  if (p.hp <= 0) { downPlayer(p); return; }
  // мощный удар сбивает с ног (Сила 4 — устоять)
  if (src && dmg >= 22 && p.sk.str < 4 && p.state !== 'roll') {
    p.state = 'knock'; p.t = 0.75; p.atk = null; p.inv = 0.9; dropHeld(p, true);
    p.kx *= 1.6; p.ky *= 1.6;
  }
}

// напарник (в одиночной игре — «никто»)
const NOBODY = { state: 'dead', i: 1, x: -1e5, y: -1e5, clingers: [], hp: 0, maxHp: 1, sk: { med: 0, str: 0 }, reviveTgt: null, revive: 0 };
function partner(p) { return G.players.find((q) => q !== p) || NOBODY; }
function downPlayer(p) {
  p.hp = 0; p.state = 'downed'; p.bleed = 25; p.menu = false; p.craft = false; p.atk = null;
  dropHeld(p, true);
  for (const e of p.clingers) { e.state = 'move'; e.host = null; e.stun = 1; e.x += rand(-20, 20); e.y += rand(-20, 20); }
  p.clingers.length = 0;
  const o = partner(p);
  if (G.solo) msg(G.team.band > 0 ? `${pname(p)} без сознания… бинт поднимет через 3 с` : `${pname(p)} без сознания — бинтов нет!`, '#ff8a7a');
  else msg(alive(o) ? `${pname(p)} без сознания! ${pname(o)}: держи ${Input.btn(o.i, 'interact')} рядом, чтобы поднять` : `${pname(p)} без сознания!`, '#ff8a7a');
  Sfx.play('down'); stain(p.x, p.y, 'rgba(70,10,8,0.6)', 18);
}

function eat(p) {
  if (G.team.food <= 0) { floatText(p.x, p.y - 116, 'Нет еды', '#ff9a8a', 14); Sfx.play('deny'); return; }
  if (p.food > 85) { floatText(p.x, p.y - 116, 'Не голоден', '#bbb', 13); return; }
  G.team.food--; p.food = Math.min(100, p.food + 45); p.hp = Math.min(p.maxHp, p.hp + 8);
  floatText(p.x, p.y - 116, 'Ням', '#e8b08a', 15); Sfx.play('pickup');
}
function useBandage(p) {
  if (G.team.band <= 0) { floatText(p.x, p.y - 116, 'Нет бинтов', '#ff9a8a', 14); Sfx.play('deny'); return; }
  const o = partner(p);
  const ally = p.sk.med >= 3 && alive(o) && dist(p.x, p.y, o.x, o.y) < 90 && o.hp < o.maxHp;
  if (p.hp >= p.maxHp && !ally) { floatText(p.x, p.y - 116, 'Здоровье полное', '#bbb', 13); return; }
  G.team.band--;
  const h = 35 * (p.sk.med >= 1 ? 1.5 : 1);
  p.hp = Math.min(p.maxHp, p.hp + h); floatText(p.x, p.y - 116, `+${Math.round(h)}`, '#9fe39a', 16);
  if (ally) { o.hp = Math.min(o.maxHp, o.hp + h); floatText(o.x, o.y - 90, `+${Math.round(h)}`, '#9fe39a', 16); }
  Sfx.play('revive');
}

// ----- Взаимодействие (A) -----
function interactTarget(p) {
  const o = partner(p);
  if (o.state === 'downed' && dist(p.x, p.y, o.x, o.y) < 60) return { t: 'revive', o };
  if (alive(o) && o.clingers.length && !p.clingers.length && dist(p.x, p.y, o.x, o.y) < 72) return { t: 'unclinger', o };
  if (p.held) return { t: 'drop' };
  if (p.sk.str >= 3) for (const e of G.enemies) {
    if (e.dead || e.state === 'dying' || e.state === 'held' || !(e.stun > 0.15 || e.frozen > 0) || ['brute', 'titan', 'void'].includes(e.type)) continue;
    if (dist(p.x, p.y, e.x, e.y) < e.r + 40) return { t: 'grab', e };
  }
  const fx = p.x + Math.cos(p.face) * 18, fy = p.y + Math.sin(p.face) * 18;
  let best = null, bd = 1e9;
  const consider = (d, lim, obj, tx, ty, m = 10) => { if (d < lim && d < bd && (tx === undefined || !wallBetween(p.x, p.y, tx, ty, m))) { bd = d; best = obj; } };
  for (const it of G.items) if (!it.held && !it.fly) consider(dist(fx, fy, it.x, it.y), 46, { t: 'item', it }, it.x, it.y, 4);
  sgQuery(SG.dcells, fx - 60, fy - 60, fx + 60, fy + 60, (s) => {
    if (s.carried) return;
    if (s.kind === 'furn') consider(distToRect(fx, fy, s.x, s.y, s.w, s.h), 30, { t: 'furn', s }, s.x + s.w / 2, s.y + s.h / 2, 20);
    else if (s.kind === 'door' && !s.broken) consider(distToRect(fx, fy, s.x, s.y, s.w, s.h) + 6, 44, { t: 'door', s });
  });
  sgQuery(SG.cells, fx - 70, fy - 70, fx + 70, fy + 70, (e) => {
    const pr = e.ref;
    if (!pr || pr.spr === undefined) return;
    const d = distToRect(fx, fy, pr.x, pr.y, pr.w, pr.h);
    const tx = pr.x + pr.w / 2, ty = pr.y + pr.h / 2, m = Math.max(pr.w, pr.h) / 2 + 4;
    if (pr.bench) consider(d + 4, 40, { t: 'bench' }, tx, ty, m);
    else if (pr === World.gen) consider(d, 40, { t: 'gen' }, tx, ty, m);
    else if (pr.search && !pr.searched) consider(d + 2, 36, { t: 'search', pr }, tx, ty, m);
  });
  return best;
}

function interact(p) {
  const t = interactTarget(p);
  if (!t) return;
  switch (t.t) {
    case 'revive': p.reviveTgt = t.o; p.revive = 0; break;
    case 'unclinger': {
      const e = t.o.clingers.pop(); t.o.shake = 0;
      if (e) { e.host = null; e.state = 'move'; killEnemy(e, p); floatText(t.o.x, t.o.y - 90, 'Сорвал паразита!', '#d6ffb0', 15); }
      break;
    }
    case 'drop': dropHeld(p, false); break;
    case 'grab': {
      const e = t.e;
      e.state = 'held'; e.holder = p; e.t = 3; p.held = { kind: 'enemy', ref: e };
      floatText(p.x, p.y - 140, 'Схватил!', '#ffe08a', 15); Sfx.play('hitH'); break;
    }
    case 'item': {
      const it = t.it;
      if (it.cat === 'w' || it.cat === 'g') { p.pickW = { it, t: 0 }; return; }
      if (false) {
        if (p.weapon.type !== 'fists') G.items.push({ cat: 'w', type: p.weapon.type, dur: p.weapon.dur, x: p.x + Math.cos(p.face + 2) * 14, y: p.y + 6, held: false, fly: false });
        p.weapon = { type: it.type, dur: it.dur };
        G.items.splice(G.items.indexOf(it), 1);
        floatText(p.x, p.y - 120, WEAPONS[it.type].name, '#f0e4c4', 15);
      } else { it.held = true; p.held = { kind: 'item', ref: it }; }
      Sfx.play('pickup'); break;
    }
    case 'furn': {
      const need = FURN[t.s.sub].str || 0;
      if (t.s.reinforced) { floatText(p.x, p.y - 116, 'Прибито намертво', '#ff9a8a', 14); Sfx.play('deny'); return; }
      if (p.sk.str < need) { floatText(p.x, p.y - 116, `Слишком тяжело (Сила ${need})`, '#ff9a8a', 14); Sfx.play('deny'); return; }
      t.s.carried = true; t.s.solid = false; p.held = { kind: 'furn', ref: t.s }; G.flowDirty = true;
      Sfx.play('pickup'); break;
    }
    case 'door': {
      const s = t.s;
      if (s.locked) {
        if (wep(p).pry) { s.locked = false; floatText(s.x + s.w / 2, s.y - 60, 'Взломано!', '#d6c49a', 15); Sfx.play('door'); wearWeapon(p, 3); }
        else { floatText(s.x + s.w / 2, s.y - 60, 'Заперто: монтировка или тяжёлый удар', '#ff9a8a', 13); Sfx.play('deny'); }
        return;
      }
      if (s.open) {
        for (const e of G.enemies) if (!e.dead && e.state !== 'dying' && distToRect(e.x, e.y, s.x, s.y, s.w, s.h) < e.r) { floatText(s.x + s.w / 2, s.y - 60, 'Мешает монстр', '#ff9a8a', 13); Sfx.play('deny'); return; }
        for (const q of G.players) if (q.state !== 'dead' && distToRect(q.x, q.y, s.x, s.y, s.w, s.h) < q.r + 1) {
          // шагнуть из проёма на свою сторону
          if (s.horiz) q.y = q.y < s.y + s.h / 2 ? s.y - q.r - 2 : s.y + s.h + q.r + 2;
          else q.x = q.x < s.x + s.w / 2 ? s.x - q.r - 2 : s.x + s.w + q.r + 2;
        }
      }
      s.open = !s.open; s.solid = !s.open; G.flowDirty = true; Sfx.play('door');
      break;
    }
    case 'search': p.search = { prop: t.pr, t: 0 }; Sfx.play('search'); break;
    case 'bench': p.craft = true; p.craftSel = 0; Sfx.play('menu'); break;
    case 'gen': {
      const gn = World.gen;
      if (G.team.fuel <= 0) { floatText(gn.x + 24, gn.y - 50, 'Нужно топливо', '#ff9a8a', 14); Sfx.play('deny'); return; }
      G.team.fuel--; gn.fuel++;
      if (G.phase !== 'day') gn.on = true;
      floatText(gn.x + 24, gn.y - 50, `Генератор: запас на ${gn.fuel} ноч.`, '#d8ffb0', 14); Sfx.play('build');
      break;
    }
  }
}

function takeWeapon(p, it) {
  if (it.cat === 'g') { equipGear(p, it); return; }
  G.items.splice(G.items.indexOf(it), 1);
  if (p.weapon.type === 'fists') p.weapon = { type: it.type, dur: it.dur };
  else if (!p.bag) { p.bag = p.weapon; p.weapon = { type: it.type, dur: it.dur }; floatText(p.x, p.y - 140, `${WEAPONS[p.bag.type].name} → в сумку`, '#c8bca0', 13); }
  else { G.items.push({ cat: 'w', type: p.weapon.type, dur: p.weapon.dur, x: p.x + Math.cos(p.face + 2) * 14, y: p.y + 6, held: false, fly: false }); p.weapon = { type: it.type, dur: it.dur }; }
  floatText(p.x, p.y - 120, WEAPONS[it.type].name, '#f0e4c4', 15); Sfx.play('pickup');
}
function swapWeapon(p) {
  if (!p.bag) { floatText(p.x, p.y - 116, 'В сумке пусто', '#bbb', 13); return; }
  const t = p.weapon; p.weapon = p.bag; p.bag = t.type === 'fists' ? null : t;
  floatText(p.x, p.y - 120, WEAPONS[p.weapon.type].name, '#f0e4c4', 15); Sfx.play('pickup');
}
function searchProp(p, pr) {
  pr.searched = G.day;
  const n = pr.spr === 'gaspump' ? 0 : randi(1, 2);
  const cx = pr.x + pr.w / 2, cy = pr.y + pr.h + 8;
  if (pr.spr === 'gaspump') { dropPickup('fuel', cx, cy); dropPickup('fuel', cx, cy); }
  for (let i = 0; i < n; i++) dropFromLoot(rollLoot(pr.zone), cx, cy);
  if (Math.random() < 0.25) floatText(cx, pr.y - 30, 'Пусто...', '#bbb', 13);
  Sfx.play('pickup'); giveXP(p, 3);
}

function dropFromLoot(v, x, y) {
  if (v === 'band') dropPickup('band', x, y);
  else if (v === 'armor') dropPickup('armor', x, y);
  else if (v.startsWith('r:')) { const k = v.slice(2); dropPickup(k, x, y); if (k === 'ammo') dropPickup(k, x, y); }
  else if (v.startsWith('w:')) { const t = v.slice(2); G.items.push({ cat: 'w', type: t, dur: Math.round(WEAPONS[t].durab * rand(0.5, 1)), x: x + rand(-14, 14), y: y + rand(-4, 8), held: false, fly: false }); }
  else if (v.startsWith('t:')) G.items.push({ cat: 't', kind: v.slice(2), x: x + rand(-14, 14), y: y + rand(-4, 8), held: false, fly: false });
  else if (v.startsWith('g:')) { const id = v.slice(2); G.items.push({ cat: 'g', id, dur: Math.round(GEAR[id].dur * rand(0.6, 1)), x: x + rand(-14, 14), y: y + rand(-4, 8), held: false, fly: false }); }
}

function craft(p, r) {
  if (r.eng && p.sk.eng < r.eng) { floatText(p.x, p.y - 124, `Нужна Инженерия ${r.eng}`, '#ff9a8a', 14); Sfx.play('deny'); return; }
  if (r.need && p.weapon.type !== r.need) { floatText(p.x, p.y - 124, 'Нужна бита в руках', '#ff9a8a', 14); Sfx.play('deny'); return; }
  if (r.id === 'repair' && (p.weapon.type === 'fists' || p.weapon.dur >= WEAPONS[p.weapon.type].durab)) { floatText(p.x, p.y - 124, 'Нечего чинить', '#bbb', 14); return; }
  for (const [k, v] of Object.entries(r.cost)) if (G.team[k] < v) { floatText(p.x, p.y - 124, `Не хватает: ${RES[k].name}`, '#ff9a8a', 14); Sfx.play('deny'); return; }
  for (const [k, v] of Object.entries(r.cost)) G.team[k] -= v;
  const b = World.bench, bx = b.x + 32, by = b.y + 44;
  switch (r.id) {
    case 'bandage': G.team.band++; break;
    case 'molotov': G.items.push({ cat: 't', kind: 'molotov', x: bx, y: by, held: false, fly: false }); break;
    case 'ammo': G.team.ammo += 6; break;
    case 'repair': p.weapon.dur = WEAPONS[p.weapon.type].durab; break;
    case 'spiked': p.weapon = { type: 'spiked', dur: WEAPONS.spiked.durab }; break;
    case 'bomb': G.items.push({ cat: 't', kind: 'bomb', x: bx, y: by, held: false, fly: false }); break;
    case 'armor': p.armor = 120; break;
    case 'tknife': for (let i = 0; i < 2; i++) G.items.push({ cat: 't', kind: 'tknife', x: bx - 10 + i * 20, y: by, held: false, fly: false }); break;
  }
  floatText(p.x, p.y - 124, `Сделано: ${r.name}`, '#d8ffb0', 15); Sfx.play('craft');
}

// куда встанет мебель: вплотную перед героем по направлению взгляда (то же место показывается «призраком»)
function furnSpot(p) {
  if (!p.held || p.held.kind !== 'furn') return null;
  const f = p.held.ref, fx = Math.cos(p.face), fy = Math.sin(p.face);
  const ext = Math.abs(fx) * f.w / 2 + Math.abs(fy) * f.h / 2;
  let first = null;
  for (const dd of [2, 8, 14, 22, 32, 44]) for (const sd of [0, 6, -6, 12, -12, 20, -20]) {
    const d = p.r + ext + dd;
    const x = Math.round(p.x + fx * d - fy * sd - f.w / 2), y = Math.round(p.y + fy * d + fx * sd - f.h / 2);
    if (!first) first = { x, y, ok: false };
    if (canPlace(x, y, f.w, f.h, f)) return { x, y, ok: true };
  }
  return first;
}
function dropHeld(p, forced) {
  if (!p.held) return;
  const h = p.held;
  if (h.kind === 'enemy') { const e = h.ref; e.state = 'move'; e.holder = null; e.stun = 0.6; e.x = p.x + Math.cos(p.face) * 24; e.y = p.y + Math.sin(p.face) * 24; p.held = null; return; }
  if (h.kind === 'item') { h.ref.held = false; h.ref.x = p.x + Math.cos(p.face) * 16; h.ref.y = p.y + Math.sin(p.face) * 16 + 2; p.held = null; return; }
  const f = h.ref, spot = furnSpot(p);
  if (spot && spot.ok) { f.x = spot.x; f.y = spot.y; f.carried = false; f.solid = true; p.held = null; G.flowDirty = true; Sfx.play('build'); burst(f.x + f.w / 2, f.y + f.h, 4, 8, '#8a7a66', 80, 3); return; }
  if (forced) { f.x = p.x - f.w / 2; f.y = p.y - f.h / 2; f.carried = false; f.solid = false; f.ghost = 1.5; p.held = null; G.flowDirty = true; }
  else { floatText(p.x, p.y - 116, 'Нет места', '#ff9a8a', 14); Sfx.play('deny'); }
}

function throwHeld(p, strong) {
  const h = p.held;
  if (h.kind === 'furn' && p.sk.str < 2) { dropHeld(p, false); return; }
  const a = p.face, sp = (h.kind === 'furn' ? 420 : 560) * (strong ? 1.25 : 1);
  if (h.kind === 'enemy') { h.ref.state = 'thrownE'; h.ref.holder = null; }
  const pr = { kind: h.kind === 'furn' ? 'furn' : h.kind === 'enemy' ? 'enemy' : h.ref.kind, ref: h.ref, x: p.x + Math.cos(a) * 18, y: p.y + Math.sin(a) * 18, z: 40, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 140, owner: p, hit: new Set() };
  if (h.kind === 'item') h.ref.fly = true;
  G.projs.push(pr); p.held = null; p.throwT = 0.3;
  Sfx.play('throw');
}

// ----- Строительство, ремонт, укрепление (LB) -----
function frontPoint(p, d) { return { x: p.x + Math.cos(p.face) * d, y: p.y + Math.sin(p.face) * d }; }
function repairTarget(p) {
  const f = frontPoint(p, 30);
  let best = null, bd = 1e9;
  for (const s of World.structs) {
    const rep = (s.kind === 'door' || s.kind === 'window' || s.kind === 'barricade') && s.hp < s.maxHp && !s.locked;
    const reinf = s.kind === 'furn' && !s.carried && !s.reinforced && p.sk.eng >= 1;
    if (!rep && !reinf) continue;
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
  if (r && r.kind === 'furn') {
    if (G.team.wood < 1) { msg('Укрепить: нужно 1 дерево', '#ff9a8a'); Sfx.play('deny'); return; }
    G.team.wood--; r.reinforced = true; r.maxHp *= 2; r.hp = r.maxHp; G.flowDirty = true;
    floatText(r.x + r.w / 2, r.y - 40, 'Укреплено!', '#d6c49a', 15); Sfx.play('build'); burst(r.x + r.w / 2, r.y, 20, 8, '#8a6a44', 90, 3); giveXP(p, 3);
    return;
  }
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
    floatText(r.x + r.w / 2, r.y - 30, 'Починено', '#d6c49a', 14); giveXP(p, 2);
    return;
  }
  const cost = p.sk.eng >= 2 ? 1 : 2;
  if (G.team.wood < cost) { msg(`Баррикада: нужно дерево (${cost})`, '#ff9a8a'); Sfx.play('deny'); return; }
  const b = barricadeSpec(p);
  if (!canPlace(b.x, b.y, b.w, b.h, null, false)) { floatText(p.x, p.y - 116, 'Нельзя строить здесь', '#ff9a8a', 14); Sfx.play('deny'); return; }
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
  if (!canPlace(x, y, 36, 28, null, false)) { floatText(p.x, p.y - 116, 'Нельзя ставить здесь', '#ff9a8a', 14); Sfx.play('deny'); return; }
  G.team.scrap -= cost;
  const uses = 6 + (p.sk.eng >= 3 ? 6 : 0);
  makeStruct('trap', x, y, 36, 28, { hp: uses, maxHp: uses, solid: false, low: true, cd: new Map() });
  G.flowDirty = true; Sfx.play('build');
}

function computeHint(p) {
  const b = (a) => Input.btn(p.i, a);
  if (p.held) {
    if (p.held.kind === 'furn') p.hint = `${b('interact')}: поставить` + (p.sk.str >= 2 ? `  ${b('light')}: бросить` : '') + '  (щит)';
    else p.hint = `${b('light')}/${b('heavy')}: бросить  ${b('interact')}: положить`;
    return;
  }
  const t = interactTarget(p);
  if (t) {
    const n = {
      grab: `${b('interact')}: схватить`,
      revive: `держи ${b('interact')}: поднять`, unclinger: `${b('interact')}: сорвать паразита`, furn: `${b('interact')}: взять`,
      bench: `${b('interact')}: верстак (крафт)`, gen: `${b('interact')}: заправить генератор`,
      search: `держи ${b('interact')}: обыскать`,
    };
    if (t.t === 'door') p.hint = t.s.locked ? `Заперто` : `${b('interact')}: ${t.s.open ? 'закрыть' : 'открыть'}`;
    else if (t.t === 'item') p.hint = t.it.cat === 'w' ? `держи ${b('interact')}: взять ${WEAPONS[t.it.type].name.toLowerCase()}` : t.it.cat === 'g' ? `держи ${b('interact')}: надеть — ${GEAR[t.it.id].name.toLowerCase()} (${GEAR[t.it.id].desc})` : `${b('interact')}: поднять`;
    else p.hint = n[t.t] || '';
    return;
  }
  const r = repairTarget(p);
  if (r) p.hint = r.kind === 'furn' ? `${b('build')}: прибить (1 дер.)` : `${b('build')}: починить (${r.broken ? 2 : 1} дер.)`;
}

// ===== Постройки =====
function damageStruct(s, dmg) {
  if (s.hp <= 0 || s.broken) return;
  s.hp -= dmg; s.flash = 0.12;
  burst(s.x + s.w / 2, s.y + s.h / 2, 20, 4, '#7a5c3a', 120, 3);
  Sfx.play('wood');
  if (s.hp <= 0) destroyStruct(s); else G.flowDirty = true;
}
function destroyStruct(s) {
  G.flowDirty = true;
  burst(s.x + s.w / 2, s.y + s.h / 2, 20, 16, '#7a5c3a', 200, 4, 0.7);
  Sfx.play(s.kind === 'window' ? 'glass' : 'break');
  if (s.kind === 'door' || s.kind === 'window') {
    s.hp = 0; s.broken = true; s.solid = false; s.open = false; s.locked = false;
    if (World.house && rectsOverlap(s.x, s.y, s.w, s.h, World.house.x - 4, World.house.y - 4, World.house.w + 8, World.house.h + 8)) msg(s.kind === 'door' ? 'Дверь выбита!' : 'Окно разбито!', '#ffb27a');
    return;
  }
  const k = World.structs.indexOf(s);
  if (k >= 0) World.structs.splice(k, 1);
  if (s.kind === 'loot') { const n = randi(2, 3); for (let i = 0; i < n; i++) dropFromLoot(rollLoot(s.zone), s.x + s.w / 2, s.y + s.h / 2); }
  // из сломанной мебели и баррикад остаются доски — подручное оружие
  if ((s.kind === 'furn' || s.kind === 'barricade') && Math.random() < 0.6) G.items.push({ cat: 'w', type: Math.random() < 0.25 && s.kind === 'furn' ? 'chair' : 'board', dur: 10, x: s.x + s.w / 2, y: s.y + s.h / 2, held: false, fly: false });
  for (const p of G.players) if (p.held && p.held.ref === s) p.held = null;
}
function damageProp(pr, dmg, by) {
  if (pr.dead) return;
  if (pr.explosive) {
    if (pr.fuse) return;
    pr.hp -= dmg; pr.flash = 0.1;
    if (pr.hp <= 0) { pr.fuse = 0.35; Sfx.play('hiss'); }
    return;
  }
  if (pr.hp <= 0) return;
  pr.hp -= dmg; pr.flash = 0.12;
  const metal = PROP_METAL.has(pr.spr);
  burst(pr.x + pr.w / 2, pr.y + pr.h / 2, 26, metal ? 5 : 4, metal ? '#9aa0a0' : '#7a5c3a', 140, 3);
  if (metal) spark(pr.x + pr.w / 2, pr.y, 6);
  Sfx.play(metal ? 'clang' : 'wood');
  if (pr.hp > 0) {
    if (!pr.warned && by) { pr.warned = 1; floatText(pr.x + pr.w / 2, pr.y - 40, 'Ломается…', '#e8d8b0', 13); }
    return;
  }
  // предмет разбит — проход свободен
  pr.dead = true; pr.solid = false;
  const cx = pr.x + pr.w / 2, cy = pr.y + pr.h / 2;
  burst(cx, cy, 30, 22, metal ? '#7d8484' : '#7a5c3a', 220, 4, 0.8);
  stain(cx, cy + pr.h / 2, metal ? 'rgba(60,64,66,0.35)' : 'rgba(70,52,34,0.35)', Math.max(pr.w, pr.h) * 0.55);
  Sfx.play('break'); addShake(metal ? 6 : 4);
  if (pr.search && !pr.searched) { const n = randi(1, 2); for (let i = 0; i < n; i++) dropFromLoot(rollLoot(pr.zone), cx, cy); }
  if (metal) dropPickup('scrap', cx, cy); else if (Math.random() < 0.6) dropPickup('wood', cx, cy);
  buildStaticGrid(); G.flowDirty = true; MM.dirty = true;
}
function spark(x, y, n) {
  if (!G.sparks) return;
  const big = n > 3;
  G.sparks.push({ x: x + rand(-4, 4), y: y + rand(-4, 4), t: big ? 0.18 : 0.12, max: big ? 0.18 : 0.12, r: big ? 22 : 14, a: rand(0, 1) });
  for (let k = 0; k < n; k++) part(x, y, 30, rand(-200, 200), rand(-200, 200), rand(60, 200), 0.3, '#ffd870', 2, 500);
}
function nearestOnRect(x, y, r) { return { x: clamp(x, r.x, r.x + r.w), y: clamp(y, r.y, r.y + r.h) }; }

// ----- Разрушаемые стены: долгими ударами можно пробить проход -----
const WALL_HP = { wood: 150, ruin: 90, brick: 280, metal: 340, concrete: 320, barn: 150, fencewood: 60, fencechain: 90, fencebarb: 70 };
function wallAtPoint(x, y) {
  let w = null;
  sgQuery(SG.cells, x - 1, y - 1, x + 1, y + 1, (e) => { if (e.t === 0 && e.ref.style && x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h) { w = e.ref; return false; } });
  return w;
}
function hitWall(p, reach, heavy, dmg) {
  const dx = Math.cos(p.face), dy = Math.sin(p.face);
  for (let d = p.r; d <= reach + 4; d += 4) {
    const x = p.x + dx * d, y = p.y + dy * d, w = wallAtPoint(x, y);
    if (!w) { if (pointBlocked(x, y)) return 0; continue; }
    const horiz = w.w >= w.h, along = horiz ? x - w.x : y - w.y, ci = Math.floor(along / 32);
    const max = WALL_HP[w.style] || 200;
    w.dmg = w.dmg || {}; w.flash = 0.1;
    w.dmg[ci] = (w.dmg[ci] || 0) + dmg * (heavy ? 1 : 0.35);
    const fence = (w.style || '').startsWith('fence');
    burst(x, y, fence ? 14 : 30, heavy ? 10 : 5, WALL_DUST[w.style] || '#8a7a66', heavy ? 200 : 130, 3.5, 0.55);
    if (!fence || w.style === 'fencechain') spark(x, y - 20, heavy ? 5 : 2);
    Sfx.play(w.style === 'metal' || w.style === 'fencechain' ? 'clang' : heavy ? 'hitH' : 'wood');
    if (!w.warned) { w.warned = 1; floatText(x, y - 70, heavy ? 'Стена трещит!' : 'Стена поддаётся… бей тяжёлым (Y)', '#e8d8b0', 14); }
    if (w.dmg[ci] >= max) breakWall(w, horiz ? x : y, horiz);
    return 1;
  }
  return 0;
}
const WALL_DUST = { wood: '#8a6a44', barn: '#8a4a34', brick: '#9a5a44', ruin: '#8a7a66', concrete: '#9a968c', metal: '#7d8484', fencewood: '#8a6a44', fencechain: '#7d8484', fencebarb: '#6a5a44' };
function breakWall(w, c, horiz) {
  const GAP = 64, start = horiz ? w.x : w.y, len = horiz ? w.w : w.h;
  let a = clamp(c - GAP / 2, start, start + len - GAP), b = a + GAP;
  if (a - start < 20) a = start;           // огрызки стен не оставляем
  if (start + len - b < 20) b = start + len;
  const k = World.walls.indexOf(w);
  if (k < 0) return;
  World.walls.splice(k, 1);
  const piece = (p0, p1, shift) => {
    if (p1 - p0 <= 0) return;
    const n = horiz ? { x: p0, y: w.y, w: p1 - p0, h: w.h, style: w.style } : { x: w.x, y: p0, w: w.w, h: p1 - p0, style: w.style };
    // переносим накопленные трещины на оставшиеся куски
    if (w.dmg) { n.dmg = {}; for (const ci in w.dmg) { const g = start + ci * 32 + 16; if (g >= p0 && g < p1) n.dmg[Math.floor((g - p0) / 32)] = w.dmg[ci]; } }
    World.walls.push(n);
  };
  piece(start, a); piece(b, start + len);
  const fence = (w.style || '').startsWith('fence');
  const gx = horiz ? (a + b) / 2 : w.x + w.w / 2, gy = horiz ? w.y + w.h / 2 : (a + b) / 2;
  burst(gx, gy, 40, fence ? 16 : 34, WALL_DUST[w.style] || '#8a7a66', 260, 5, 1);
  for (let i = 0; i < (fence ? 3 : 8); i++) burst(gx + rand(-24, 24), gy + rand(-24, 24), rand(10, 60), 2, '#2a2420', 160, 6, 0.9);
  stain(gx, gy + 6, 'rgba(40,34,28,0.45)', 40);
  (G.rubble || (G.rubble = [])).push({ x: gx, y: gy, horiz, style: w.style, len: b - a, seed: Math.random() * 1000 });
  Sfx.play('break'); addShake(fence ? 4 : 10);
  if (!fence && Math.random() < 0.7) G.items.push({ cat: 't', kind: 'brick', x: gx + rand(-20, 20), y: gy + rand(-20, 20), held: false, fly: false });
  msg(fence ? 'Забор проломлен' : 'Стена проломлена — путь свободен (и для монстров тоже!)', '#e8c890');
  buildStaticGrid(); G.flowDirty = true; MM.dirty = true;
}

// ===== Предметы =====
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
      const d = dist(p.x, p.y, k.x, k.y);
      if (d < 70) { const a = Math.atan2(p.y - k.y, p.x - k.x); k.x += Math.cos(a) * 260 * dt; k.y += Math.sin(a) * 260 * dt; }
      if (d < 22) {
        if (k.kind === 'armor') { if (p.armor >= 100) continue; p.armor = 120; floatText(p.x, p.y - 116, 'Броня!', '#b0c0d0', 14); }
        else if (k.kind === 'band' || !RES[k.kind]) { G.team.band++; floatText(p.x, p.y - 116, '+1 бинт', '#9fe39a', 13); }
        else { G.team[k.kind]++; floatText(p.x, p.y - 116, `+1 ${RES[k.kind].name.toLowerCase()}`, RES[k.kind].col, 13); }
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
    const r = pr.kind === 'furn' || pr.kind === 'enemy' ? 22 : 8;
    for (const e of G.enemies) {
      if (e.dead || e.state === 'dying' || e.state === 'cling' || e.state === 'held' || e.state === 'thrownE' || pr.hit.has(e)) continue;
      if (e === pr.ref) continue;
      if (dist(pr.x, pr.y, e.x, e.y) < e.r + r) {
        pr.hit.add(e);
        if (pr.kind === 'enemy') { damageEnemy(e, 40 + 8 * pr.owner.sk.str, pr, 420, 1); floatText(e.x, e.y - 60, 'Сбил!', '#ffe08a', 14); addShake(4); continue; }
        const th = THROWN[pr.kind];
        const dmg = pr.kind === 'furn' ? 55 + 10 * pr.owner.sk.str : th.dmg;
        damageEnemy(e, dmg, pr, pr.kind === 'furn' ? 450 : 220, pr.kind === 'furn' ? 1 : th.stun);
        Sfx.play('hit'); addShake(3);
        if (pr.kind !== 'furn') { land = true; pr.vx *= -0.2; pr.vy *= -0.2; }
        break;
      }
    }
    for (const p2 of World.props) if (p2.explosive && !p2.dead && pr.x > p2.x && pr.x < p2.x + p2.w && pr.y > p2.y - 10 && pr.y < p2.y + p2.h) { damageProp(p2, 30); land = true; }
    const o = { x: pr.x, y: pr.y };
    collideWorld(o, r * 0.6, { low: true });
    if (Math.abs(o.x - pr.x) > 0.1 || Math.abs(o.y - pr.y) > 0.1) { land = true; pr.x = o.x; pr.y = o.y; }
    if (!land) continue;
    G.projs.splice(i, 1);
    const th = THROWN[pr.kind];
    if (pr.kind === 'enemy') {
      const e = pr.ref; e.x = pr.x; e.y = pr.y; e.state = 'move'; collideWorld(e, e.r, null);
      damageEnemy(e, 30 + 6 * pr.owner.sk.str, { x: pr.x - pr.vx, y: pr.y - pr.vy }, 200, 1.2);
      burst(pr.x, pr.y, 4, 14, '#4a4232', 200, 4); addShake(6); Sfx.play('slam');
    } else if (pr.kind === 'furn') {
      const f = pr.ref;
      let x = pr.x - f.w / 2, y = pr.y - f.h / 2, placed = false;
      for (let k = 0; k < 14 && !placed; k++) { if (canPlace(x, y, f.w, f.h, f)) placed = true; else { x -= pr.vx * 0.02; y -= pr.vy * 0.02; } }
      if (!placed) { x = pr.owner.x - f.w / 2; y = pr.owner.y + 20; }
      f.x = x; f.y = y; f.carried = false; f.solid = placed; if (!placed) f.ghost = 1.5;
      damageStruct(f, 15); G.flowDirty = true; addShake(4);
    } else if (th.bomb) {
      pr.ref.fly = false; const k = G.items.indexOf(pr.ref); if (k >= 0) G.items.splice(k, 1);
      G.bombs.push({ x: pr.x, y: pr.y, t: 1.0 }); Sfx.play('hiss');
    } else if (th.keep) { pr.ref.fly = false; pr.ref.x = pr.x; pr.ref.y = pr.y; Sfx.play('wood'); }
    else {
      pr.ref.fly = false; const k = G.items.indexOf(pr.ref); if (k >= 0) G.items.splice(k, 1);
      burst(pr.x, pr.y, 6, 10, pr.kind === 'molotov' ? '#e08a2a' : '#7fb07a', 140, 3); Sfx.play('glass');
      if (th.fire) { G.fires.push({ x: pr.x, y: pr.y, r: 70, t: 6 }); Sfx.play('fire'); }
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
  for (let i = G.tracers.length - 1; i >= 0; i--) { G.tracers[i].t -= dt; if (G.tracers[i].t <= 0) G.tracers.splice(i, 1); }
  for (let i = G.flashes.length - 1; i >= 0; i--) { G.flashes[i].t -= dt; if (G.flashes[i].t <= 0) G.flashes.splice(i, 1); }
  for (let i = G.waves.length - 1; i >= 0; i--) { const w = G.waves[i]; w.t -= dt; w.r += (w.max - w.r) * Math.min(1, dt * 12); if (w.t <= 0) G.waves.splice(i, 1); }
  for (let i = G.bolts.length - 1; i >= 0; i--) { G.bolts[i].t -= dt; if (G.bolts[i].t <= 0) G.bolts.splice(i, 1); }
}
