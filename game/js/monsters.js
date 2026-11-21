'use strict';
// ---------- Монстры: поведение, снаряды, огонь, взрывы ----------
// Бродяга ломает двери · Прыгун прыгает с подготовкой · Прилипала цепляется, снимает союзник
// Тяжеловес и Титан бьют по площади и сносят укрепления · Гули стаей лезут в окна и цепляются
// Волки кружат и бросаются из темноты · Тыквопаук прячется в кукурузе, плюётся паутиной
// Пустотник держит дистанцию и стреляет энергией поверх низких укрытий

function spawnEnemy(type, x, y, night) {
  const d = EDEF[type], n = G.day;
  const hpMul = night ? 1 + 0.15 * (n - 1) : 0.85;
  const e = {
    type, x, y, r: d.r, hp: d.hp * hpMul, maxHp: d.hp * hpMul, dmgMul: night ? 1 + 0.1 * (n - 1) : 0.85,
    state: 'move', t: 0, cd: rand(0, 1), stun: 0, kx: 0, ky: 0, face: rand(0, TAU), flash: 0, anim: rand(0, 4), mass: d.mass,
    night, aggro: night, wanderA: rand(0, TAU), wanderT: 0, host: null, tgt: null, tgtS: null, leapDx: 0, leapDy: 0, hitP: null,
    dead: false, tick: 1, hidden: false, hitT: 0, thrown: 0, shootCd: rand(1, 3), circleT: rand(1, 2), circleDir: Math.random() < 0.5 ? 1 : -1, blinkCd: 0, home: { x, y },
  };
  G.enemies.push(e);
  return e;
}

function damageEnemy(e, dmg, src, kb, stun) {
  if (e.dead || e.state === 'dying') return;
  e.hp -= dmg; e.flash = 0.12; e.hitT = 0.15; e.hidden = false;
  const a = Math.atan2(e.y - src.y, e.x - src.x);
  e.kx += Math.cos(a) * kb / e.mass; e.ky += Math.sin(a) * kb / e.mass;
  const st = e.type === 'titan' ? stun * 0.1 : e.type === 'brute' ? stun * 0.35 : stun;
  if (st > e.stun) e.stun = st;
  if ((e.state === 'wind' || e.state === 'crouch') && st > 0.3) e.state = 'move';
  burst(e.x, e.y, 25, 5, e.type === 'clinger' ? '#8a6f66' : e.type === 'void' ? '#6a4aa0' : e.type === 'spider' ? '#c06420' : '#3b2a1e', 150, 3);
  e.aggro = true;
  if (e.hp <= 0) killEnemy(e, src.i !== undefined ? src : src.owner);
}

function killEnemy(e, by) {
  if (e.dead || e.state === 'dying') return;
  if (e.host) { const h = e.host; const k = h.clingers.indexOf(e); if (k >= 0) h.clingers.splice(k, 1); e.host = null; }
  e.state = 'dying'; e.t = 1.4; G.kills++;
  stain(e.x, e.y, e.type === 'void' ? 'rgba(60,30,90,0.5)' : 'rgba(30,22,14,0.55)', e.r * 1.2);
  burst(e.x, e.y, 20, 10, '#2c2118', 180, 4);
  Sfx.play(e.type === 'titan' ? 'slam' : 'die');
  const d = EDEF[e.type];
  if (by && by.i !== undefined) {
    by.kills++; giveXP(by, d.xp);
    const o = G.players[1 - by.i]; if (o.state !== 'dead') giveXP(o, Math.round(d.xp / 2));
    floatText(e.x, e.y - 40, `+${d.xp} XP`, '#e9d78a', 13);
  }
  if (e.type === 'titan') { addShake(14); msg('Титан повержен!', '#fff2b0'); for (let i = 0; i < 8; i++) dropFromLoot(rollLoot(pick(['industrial', 'lab', 'town'])), e.x, e.y); }
  else if (Math.random() < (e.type === 'brute' ? 1 : 0.18)) dropPickup(pick(['scrap', 'wood', 'cloth']), e.x, e.y);
}

function targetPlayer(e) {
  if (e.state === 'held') return null;
  let best = null, bd = 1e9;
  for (const p of G.players) { if (!alive(p)) continue; const d = dist2(e.x, e.y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
  return best;
}
function alertNoise(x, y, r) { for (const e of G.enemies) if (!e.aggro && dist(x, y, e.x, e.y) < r) e.aggro = true; }

// Освещено ли место (для волков: опаснее в темноте)
function nearLight(x, y) {
  if (G.phase === 'day') return true;
  if (dist(x, y, World.fire.x, World.fire.y) < 260) return true;
  if (World.house && x > World.house.x && x < World.house.x + World.house.w && y > World.house.y && y < World.house.y + World.house.h) return true;
  if (World.gen.on) for (const f of World.floods) if (dist(x, y, f.ox, f.oy) < 300) return true;
  for (const f of G.fires) if (dist(x, y, f.x, f.y) < 160) return true;
  return false;
}

function updateEnemy(e, dt) {
  const d = EDEF[e.type];
  e.flash -= dt; e.hitT -= dt;
  if (e.state === 'dying') { e.t -= dt; if (e.t <= 0) e.dead = true; return; }
  if (e.state === 'thrownE') return;
  if (e.state === 'held') {
    const h = e.holder;
    e.t -= dt;
    if (!h || !alive(h) || !h.held || h.held.ref !== e || e.t <= 0) { if (h && h.held && h.held.ref === e) h.held = null; e.state = 'move'; e.holder = null; e.stun = 0.2; if (h) { e.x = h.x + 20; e.y = h.y; } return; }
    e.x = h.x; e.y = h.y - 1; return;
  }
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
  // брошенный враг сбивает других
  if (e.thrown > 0) {
    e.thrown -= dt;
    for (const o of G.enemies) {
      if (o === e || o.dead || o.state === 'dying' || o.state === 'cling') continue;
      if (dist(e.x, e.y, o.x, o.y) < e.r + o.r + 2) {
        damageEnemy(o, 22, e, 300, 0.6); damageEnemy(e, 12, o, 0, 0.3); e.thrown = 0; addShake(3); Sfx.play('hitH');
        floatText(o.x, o.y - 50, 'Сбил!', '#ffe08a', 14); break;
      }
    }
  }
  const fl = { low: e.state === 'leap' || d.float, squeeze: d.squeeze };
  if (e.frozen > 0) { e.frozen -= dt; collideWorld(e, e.r, fl); return; }
  if (e.stun > 0) { e.stun -= dt; if (e.state !== 'leap') e.state = 'move'; collideWorld(e, e.r, fl); return; }
  e.cd -= dt; e.shootCd -= dt; e.blinkCd -= dt;

  const night = e.night || G.phase !== 'day';
  const spd = d.spd * (e.night ? 1 + 0.03 * (G.day - 1) : 1);
  let mx = 0, my = 0;

  // Тыквопаук прячется в кукурузе
  if (e.type === 'spider') {
    let near = false;
    for (const p of G.players) if (alive(p) && dist(p.x, p.y, e.x, e.y) < 150) near = true;
    e.hidden = !near && inHideZone(e.x, e.y) && (e.state === 'move' || e.state === 'idle');
  }

  switch (e.state) {
    case 'wind':
      e.t -= dt;
      if (e.t <= 0) { enemyStrike(e); e.state = 'recover'; e.t = e.type === 'brute' || e.type === 'titan' ? 0.7 : 0.35; e.cd = d.cd; }
      break;
    case 'recover':
      e.t -= dt; if (e.t <= 0) e.state = 'move';
      break;
    case 'crouch':
      e.t -= dt;
      if (e.t <= 0) { e.state = 'leap'; e.t = e.type === 'wolf' ? 0.34 : 0.42; e.hitP = null; Sfx.play(e.type === 'wolf' ? 'growl' : 'swing'); }
      break;
    case 'leap': {
      e.t -= dt;
      const ls = e.type === 'wolf' ? 520 : 420;
      mx = e.leapDx * ls; my = e.leapDy * ls;
      for (const p of G.players) {
        if (!alive(p) || e.hitP) continue;
        if (dist(e.x, e.y, p.x, p.y) < e.r + p.r + 4) {
          e.hitP = p;
          const dark = e.type === 'wolf' && !nearLight(p.x, p.y) ? 1.5 : 1;
          hurtPlayer(p, d.dmg * e.dmgMul * dark, e);
        }
      }
      if (e.t <= 0) {
        if (e.type === 'wolf') { e.state = 'retreat'; e.t = 0.8; }
        else { e.state = 'recover'; e.t = 0.5; e.cd = 1.4; }
      }
      break;
    }
    case 'retreat': {
      e.t -= dt;
      const p = targetPlayer(e);
      if (p) { const a = Math.atan2(e.y - p.y, e.x - p.x) + e.circleDir * 0.5; mx = Math.cos(a) * spd; my = Math.sin(a) * spd; e.face = a; }
      if (e.t <= 0) { e.state = 'move'; e.circleT = rand(1.2, 2.6); e.cd = 0.6; }
      break;
    }
    case 'move': {
      const p = targetPlayer(e);
      if (!p) { wander(e, dt); mx = Math.cos(e.wanderA) * spd * 0.3; my = Math.sin(e.wanderA) * spd * 0.3; break; }
      const dp = dist(e.x, e.y, p.x, p.y);
      if (!e.aggro) {
        const sense = e.type === 'spider' ? 150 : e.type === 'wolf' ? (night ? 500 : 300) : 360;
        if (dp < sense) { e.aggro = true; Sfx.play(e.type === 'wolf' ? 'howl' : 'growl'); }
        else { wander(e, dt); mx = Math.cos(e.wanderA) * spd * 0.35; my = Math.sin(e.wanderA) * spd * 0.35; if (e.type === 'spider' || e.type === 'void') { mx *= 0.3; my *= 0.3; } break; }
      }
      const los = dp < 320 && lineClear(e.x, e.y, p.x, p.y);
      // ---- особые приёмы ----
      if (e.type === 'clinger' && dp < e.r + p.r + 14 && e.cd <= 0 && p.state !== 'roll' && p.clingers.length < 3) {
        e.state = 'cling'; e.host = p; e.cA = rand(0, TAU); e.tick = 0.6; p.clingers.push(e); p.shake = 0;
        floatText(p.x, p.y - 94, 'Прилипала!', '#ff9a8a', 15); Sfx.play('cling');
        break;
      }
      if ((e.type === 'jumper' || e.type === 'spider') && dp < 230 && dp > 70 && e.cd <= 0 && los) { startLeap(e, p, 0.5); break; }
      if (e.type === 'spider' && dp < 330 && dp > 110 && e.shootCd <= 0 && lineClear(e.x, e.y, p.x, p.y, true)) {
        e.state = 'wind'; e.t = d.wind; e.shot = 'web'; e.face = Math.atan2(p.y - e.y, p.x - e.x); e.tgt = p; break;
      }
      if (e.type === 'void') {
        if (dp < 110 && e.blinkCd <= 0) { blink(e, p); break; }
        if (dp < 430 && e.shootCd <= 0 && lineClear(e.x, e.y, p.x, p.y, true)) {
          e.state = 'wind'; e.t = d.wind; e.shot = 'orb'; e.face = Math.atan2(p.y - e.y, p.x - e.x); e.tgt = p; Sfx.play('charge'); break;
        }
      }
      if (e.type === 'wolf' && dp < 280) {
        e.circleT -= dt;
        if (e.circleT <= 0 && e.cd <= 0 && los) { startLeap(e, p, 0.42); break; }
        const a = Math.atan2(e.y - p.y, e.x - p.x), want = 150;
        const tx = -Math.sin(a) * e.circleDir, ty = Math.cos(a) * e.circleDir, rad = clamp((dp - want) / 60, -1, 1);
        mx = (tx - Math.cos(a) * rad) * spd * 0.85; my = (ty - Math.sin(a) * rad) * spd * 0.85;
        e.face = Math.atan2(my, mx);
        break;
      }
      const melee = e.type !== 'clinger' && e.type !== 'void' && e.type !== 'spider' ? true : e.type === 'spider';
      if (melee && dp < d.range + p.r && e.cd <= 0) {
        e.state = 'wind'; e.t = d.wind; e.tgt = p; e.tgtS = null; e.shot = null; e.face = Math.atan2(p.y - e.y, p.x - e.x);
        break;
      }
      // ---- движение ----
      let tx, ty;
      if (e.type === 'void' && dp < 220) { const a = Math.atan2(e.y - p.y, e.x - p.x); tx = e.x + Math.cos(a) * 60; ty = e.y + Math.sin(a) * 60; }
      else if (los || dp < 50) { tx = p.x; ty = p.y; }
      else {
        const st = flowStep(e.x, e.y, d.squeeze);
        if (st) {
          tx = st.x; ty = st.y;
          if (st.s && st.s.solid && e.cd <= 0 && distToRect(e.x, e.y, st.s.x, st.s.y, st.s.w, st.s.h) < e.r + 10 && !(d.float && st.s.low)) {
            e.state = 'wind'; e.t = d.wind; e.tgtS = st.s; e.tgt = null; e.shot = null;
            e.face = Math.atan2(st.s.y + st.s.h / 2 - e.y, st.s.x + st.s.w / 2 - e.x);
            break;
          }
        } else { tx = p.x; ty = p.y; }
      }
      const a = Math.atan2(ty - e.y, tx - e.x);
      e.face = e.type === 'void' ? Math.atan2(p.y - e.y, p.x - e.x) : a;
      mx = Math.cos(a) * spd; my = Math.sin(a) * spd;
      if (dp < d.range + p.r - 4) { mx *= 0.1; my *= 0.1; }
      break;
    }
  }
  e.x += mx * dt; e.y += my * dt;
  if (mx || my || d.float) e.anim += dt * ({ clinger: 10, brute: 4, titan: 3, wolf: 11, ghoul: 10, void: 4 }[e.type] || 7);
  collideWorld(e, e.r, fl);
  // ловушки и огонь
  if (e.state !== 'leap' && !d.float) for (const s of World.structs) {
    if (s.kind !== 'trap' || s.hp <= 0) continue;
    if (!rectsOverlap(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2, s.x, s.y, s.w, s.h)) continue;
    const last = s.cd.get(e) || 0;
    if (G.t - last < 0.7) continue;
    s.cd.set(e, G.t);
    damageEnemy(e, 22, { x: s.x + s.w / 2, y: s.y + s.h / 2 }, 60, 0.4);
    if (e.state === 'dying') for (const p of G.players) giveXP(p, 4);
    s.hp--; s.flash = 0.15; Sfx.play('hit');
    if (s.hp <= 0) destroyStruct(s);
  }
  for (const f of G.fires) if (dist(e.x, e.y, f.x, f.y) < f.r) { e.burnT = (e.burnT || 0) + dt; if (e.burnT > 0.4) { e.burnT = 0; damageEnemy(e, 6, { x: f.x, y: f.y }, 30, 0); } }
}

function startLeap(e, p, t) {
  e.state = 'crouch'; e.t = t; e.face = Math.atan2(p.y - e.y, p.x - e.x);
  e.leapDx = Math.cos(e.face); e.leapDy = Math.sin(e.face);
}
function blink(e, p) {
  for (let k = 0; k < 10; k++) {
    const a = Math.atan2(e.y - p.y, e.x - p.x) + rand(-1.2, 1.2), d = rand(150, 220);
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (freeSpot(x, y, e.r) && !Nav.blocked[cellOf(x, y)]) {
      burst(e.x, e.y - 40, 30, 14, '#9a6aff', 160, 3);
      e.x = x; e.y = y; e.blinkCd = 4; e.shootCd = Math.min(e.shootCd, 0.6);
      burst(x, y - 40, 30, 14, '#9a6aff', 160, 3); Sfx.play('blink');
      return;
    }
  }
  e.blinkCd = 1;
}
function wander(e, dt) {
  e.wanderT -= dt;
  if (e.wanderT <= 0) {
    e.wanderT = rand(1.5, 4);
    e.wanderA = dist(e.x, e.y, e.home.x, e.home.y) > 300 ? Math.atan2(e.home.y - e.y, e.home.x - e.x) : e.wanderA + rand(-1.5, 1.5);
  }
}

function enemyStrike(e) {
  const d = EDEF[e.type];
  if (e.shot) {
    const p = e.tgt, a = p ? Math.atan2(p.y - e.y, p.x - e.x) : e.face;
    if (e.shot === 'orb') { G.eprojs.push({ kind: 'orb', x: e.x + Math.cos(a) * 24, y: e.y + Math.sin(a) * 14, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 3, dmg: d.dmg * e.dmgMul }); Sfx.play('orb'); e.shootCd = d.cd + rand(0, 1); }
    else { G.eprojs.push({ kind: 'web', x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 12, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 1.1, dmg: 4 }); Sfx.play('web'); e.shootCd = 3.5; }
    e.shot = null; e.tgt = null;
    return;
  }
  if (d.slam) {
    const cx = e.x + Math.cos(e.face) * d.slam * 0.4, cy = e.y + Math.sin(e.face) * d.slam * 0.26;
    Sfx.play('slam'); addShake(e.type === 'titan' ? 14 : 9);
    burst(cx, cy, 2, e.type === 'titan' ? 30 : 18, '#4a4232', 240, 5, 0.6);
    stain(cx, cy, 'rgba(20,16,10,0.35)', d.slam * 0.5);
    for (const p of G.players) if (alive(p) && dist(cx, cy, p.x, p.y) < d.slam + p.r) hurtPlayer(p, d.dmg * e.dmgMul, { x: cx, y: cy });
    for (const s of World.structs) { if (!s.solid || s.carried) continue; if (distToRect(cx, cy, s.x, s.y, s.w, s.h) < d.slam) damageStruct(s, d.sdmg * e.dmgMul); }
    for (const pr of World.props) if (pr.explosive && !pr.dead && distToRect(cx, cy, pr.x, pr.y, pr.w, pr.h) < d.slam) damageProp(pr, 50);
    return;
  }
  if (e.tgtS) {
    const s = e.tgtS; e.tgtS = null;
    if (s.solid && distToRect(e.x, e.y, s.x, s.y, s.w, s.h) < e.r + 16) damageStruct(s, d.sdmg * e.dmgMul);
    return;
  }
  const p = e.tgt; e.tgt = null;
  if (!p || !alive(p)) return;
  if (dist(e.x, e.y, p.x, p.y) < d.range + p.r + 14 && Math.abs(angDiff(e.face, Math.atan2(p.y - e.y, p.x - e.x))) < 1.4) {
    hurtPlayer(p, d.dmg * e.dmgMul, e);
    if (e.type === 'ghoul') { p.slowT = 1.2; floatText(p.x, p.y - 94, 'Гуль вцепился!', '#ffb0a0', 13); }
  }
  Sfx.play('swing');
}

// ----- Вражеские снаряды, паутина, огонь, взрывы -----
function inWeb(x, y) { for (const w of G.webs) if (dist2(x, y, w.x, w.y) < w.r * w.r) return true; return false; }
function updateHazards(dt) {
  for (let i = G.eprojs.length - 1; i >= 0; i--) {
    const q = G.eprojs[i];
    q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
    let end = q.life <= 0;
    if (q.kind === 'orb' && Math.random() < 0.5) part(q.x, q.y, 30, rand(-20, 20), rand(-20, 20), 20, 0.4, '#b48cff', 3, 0);
    for (const p of G.players) {
      if (!alive(p) || p.inv > 0 || dist(p.x, p.y, q.x, q.y) > p.r + 8) continue;
      if (q.kind === 'orb') hurtPlayer(p, q.dmg, q);
      else { p.webT = 2.4; floatText(p.x, p.y - 94, 'Паутина!', '#e0e0d0', 14); }
      end = true; break;
    }
    if (pointBlocked(q.x, q.y)) end = true;
    sgQuery(SG.dcells, q.x - 1, q.y - 1, q.x + 1, q.y + 1, (s) => { if (s.solid && !s.low && q.x > s.x && q.x < s.x + s.w && q.y > s.y && q.y < s.y + s.h) end = true; });
    if (end) {
      G.eprojs.splice(i, 1);
      if (q.kind === 'orb') burst(q.x, q.y, 30, 10, '#b48cff', 140, 3);
      else G.webs.push({ x: q.x, y: q.y, r: 40, t: 7 });
    }
  }
  for (let i = G.webs.length - 1; i >= 0; i--) { G.webs[i].t -= dt; if (G.webs[i].t <= 0) G.webs.splice(i, 1); }
  for (let i = G.fires.length - 1; i >= 0; i--) {
    const f = G.fires[i];
    f.t -= dt;
    if (Math.random() < 0.6) part(f.x + rand(-f.r, f.r) * 0.8, f.y + rand(-f.r, f.r) * 0.5, 4, rand(-10, 10), rand(-5, 5), rand(80, 160), 0.7, Math.random() < 0.5 ? '#ffb040' : '#ff6a20', 3, -60);
    for (const p of G.players) if (alive(p) && dist(p.x, p.y, f.x, f.y) < f.r) { p.burnT = (p.burnT || 0) + dt; if (p.burnT > 0.6) { p.burnT = 0; p.inv = 0; hurtPlayer(p, 4, null); } }
    if (f.t <= 0) G.fires.splice(i, 1);
  }
  for (let i = G.bombs.length - 1; i >= 0; i--) {
    const b = G.bombs[i]; b.t -= dt;
    if (Math.random() < 0.6) part(b.x, b.y - 18, 10, rand(-20, 20), 0, 60, 0.4, '#ffb040', 3, -40);
    if (b.t <= 0) { G.bombs.splice(i, 1); explode(b.x, b.y, 115, 85); }
  }
  // бочки с горючим
  for (const pr of World.props) if (pr.fuse) { pr.fuse -= dt; if (Math.random() < 0.5) part(pr.x + 11, pr.y - 20, 10, rand(-20, 20), 0, 60, 0.4, '#ffb040', 3, -40); if (pr.fuse <= 0) explodeProp(pr); }
}
function explodeProp(pr) {
  pr.fuse = 0; pr.dead = true; pr.solid = false;
  explode(pr.x + pr.w / 2, pr.y + pr.h / 2, 120, 70);
  buildStaticGrid(); G.flowDirty = true;
}
function explode(x, y, R, dmg) {
  Sfx.play('explode'); addShake(14);
  G.flashes.push({ x, y, r: 380, t: 0.25 });
  burst(x, y, 10, 30, '#ffb040', 320, 5, 0.7); burst(x, y, 10, 20, '#3a3028', 260, 6, 1.1);
  stain(x, y, 'rgba(10,8,6,0.6)', R * 0.5);
  G.fires.push({ x, y, r: 60, t: 3 });
  for (const e of G.enemies) { const d = dist(x, y, e.x, e.y); if (d < R + e.r) damageEnemy(e, dmg * (1 - d / (R + e.r) * 0.5), { x, y }, 600, 1.2); }
  for (const p of G.players) { const d = dist(x, y, p.x, p.y); if (alive(p) && d < R) { p.inv = 0; hurtPlayer(p, dmg * 0.45 * (1 - d / R * 0.5), { x, y }); } }
  for (const s of World.structs) if (!s.carried && distToRect(x, y, s.x, s.y, s.w, s.h) < R) damageStruct(s, dmg);
  for (const pr of World.props) if (pr.explosive && !pr.dead && !pr.fuse && distToRect(x, y, pr.x, pr.y, pr.w, pr.h) < R) { pr.fuse = 0.25; }
}
