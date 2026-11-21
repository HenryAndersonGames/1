'use strict';
// ---------- Скелетная (cutout) анимация существ ----------
// Каждая конечность — два жёстких куска (бедро+голень, плечо+предплечье) со скруглённым суставом,
// они вращаются по костям, как у героев. Торс наклоняется вокруг таза, руки крепятся к торсу.
// Углы: 0 — вниз, +90 — вперёд (лицом вправо), 180 — вверх. Рисуется дёшево: 2 drawImage на конечность.
const ERIG = {};
const ENEMY_SCALE = 0.86; // существа немного меньше, чтобы дома выглядели домами
const D2R = Math.PI / 180;
const angOf = (x, y) => Math.atan2(x, y) / D2R;

function initRigs() {
  for (const [type, M] of Object.entries(ART_META.rigs || {})) {
    const R = { type, M, layers: [] };
    for (const l of M.layers) {
      if (l.torso) { R.layers.push({ n: l.n, torso: true, at: l.at, s: Art.s[`rig_${type}_${l.n}`] }); continue; }
      const r1 = angOf(l.j[0], l.j[1]), r2 = angOf(l.e[0] - l.j[0], l.e[1] - l.j[1]);
      R.layers.push({ n: l.n, at: l.at, arm: l.arm, j: l.j, e: l.e, r1, r2, u: Art.s[`rig_${type}_${l.n}_u`], lo: Art.s[`rig_${type}_${l.n}_l`] });
    }
    R.torsoAt = (R.layers.find((l) => l.torso) || { at: [0, 0] }).at;
    ERIG[type] = R;
  }
}
const variant = (s, v) => !v ? s : v === 'fl' ? flashOf(s) : v === 'rd' ? (s.rdS || (s.rdS = recolor(s, '#ff2a1a', 0.45))) : v === 'fz' ? (s.fz || (s.fz = recolor(s, '#a8d8ff', 0.55))) : s;

// pose: { lean, bob, dx, L: { имя: [бедро, голень] } } — углы абсолютные; не заданы — поза покоя
function drawRig(ctx, type, pose, v) {
  const R = ERIG[type];
  if (!R) return false;
  const T = R.torsoAt, hip = [T[0] + (pose.dx || 0), T[1] + (pose.bob || 0)], lean = (pose.lean || 0) * D2R;
  const onTorso = (p) => { const x = p[0] - T[0], y = p[1] - T[1], c = Math.cos(lean), s = Math.sin(lean); return [hip[0] + x * c - y * s, hip[1] + x * s + y * c]; };
  if (R.M.procLegs) drawProcLegs(ctx, R.M.procLegs, pose, 0, v);
  for (const l of R.layers) {
    if (l.torso) {
      const s = variant(l.s, v);
      ctx.save(); ctx.translate(hip[0], hip[1]); ctx.rotate(lean);
      ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h);
      ctx.restore();
      continue;
    }
    const A = l.arm ? onTorso(l.at) : [l.at[0] + (pose.dx || 0), l.at[1] + (pose.legBob || 0)];
    const q = (pose.L && pose.L[l.n]) || [l.r1, l.r2];
    const rot1 = -(q[0] - l.r1) * D2R + (l.arm ? lean : 0), rot2 = -(q[1] - l.r2) * D2R + (l.arm ? lean : 0);
    const jx = A[0] + l.j[0] * Math.cos(rot1) - l.j[1] * Math.sin(rot1), jy = A[1] + l.j[0] * Math.sin(rot1) + l.j[1] * Math.cos(rot1);
    const lo = variant(l.lo, v), up = variant(l.u, v);
    ctx.save(); ctx.translate(jx, jy); ctx.rotate(rot2); ctx.drawImage(lo.c, -lo.ax - l.j[0], -lo.ay - l.j[1], lo.w, lo.h); ctx.restore();
    ctx.save(); ctx.translate(A[0], A[1]); ctx.rotate(rot1); ctx.drawImage(up.c, -up.ax, -up.ay, up.w, up.h); ctx.restore();
  }
  if (R.M.procLegs) drawProcLegs(ctx, R.M.procLegs, pose, 1, v);
  return true;
}
// процедурные ноги (паук, прилипала): колено вверх, стопа шагает по кругу
function drawProcLegs(ctx, P, pose, side, v) {
  const col = v === 'fl' ? '#ffffff' : v === 'fz' ? '#a8d8ff' : P.col[side];
  const ph = pose.ph || 0, k = pose.walk || 0, lift = pose.legsUp || 0;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < P.n; i++) {
    const b = P.base[i], w = Math.sin(ph * 2 + i * 1.7 + side * 2);
    const bx = b[0] + (pose.dx || 0), by = b[1] + (pose.bob || 0);
    let fx = P.feet[i] + w * 4 * k + (side ? 3 : -3), fy = -Math.max(0, Math.cos(ph * 2 + i * 1.7 + side * 2)) * 4 * k;
    if (lift) { fx = P.feet[i] * 0.4 + 10; fy = -20 * lift - i * 3; }
    const kx = (bx + fx) / 2 + (i < P.n / 2 ? -4 : 4), ky = P.knee + (pose.bob || 0) * 0.6 - (i === 1 || i === 2 ? 4 : 0) + Math.abs(w) * 2 * k;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(kx, ky, fx, fy);
    ctx.strokeStyle = OL; ctx.lineWidth = P.w + 2.2; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = P.w; ctx.stroke();
  }
}

// ---------- Позы по состоянию существа ----------
function bipedWalk(R, ph, k, style) {
  const s = Math.sin(ph), c = Math.cos(ph), L = {};
  const leg = (n, sg) => { const l = R.layers.find((x) => x.n === n); if (!l) return; const sw = s * sg, lift = Math.max(0, c * sg);
    const th = l.r1 + 24 * sw * k; L[n] = [th, th - (5 + 38 * lift * (sw > -0.3 ? 1 : 0.4)) * k]; };
  leg('legF', 1); leg('legB', -1);
  const arm = (n, sg) => { const l = R.layers.find((x) => x.n === n); if (!l) return;
    if (style === 'reach') { const sh = 62 + 10 * s * sg * k; L[n] = [sh, sh + 22 + 8 * c]; }
    else if (style === 'wild') { const sh = l.r1 + 34 * s * sg * k - 10; L[n] = [sh, sh + 30 + 20 * Math.max(0, s * sg)]; }
    else { const sh = l.r1 - 16 * s * sg * k; L[n] = [sh, sh + 14 + 10 * Math.max(0, -s * sg)]; } };
  arm('armF', 1); arm('armB', -1);
  return L;
}
function quadWalk(R, ph, k) {
  const L = {}, s = (o) => Math.sin(ph + o), c = (o) => Math.cos(ph + o);
  const leg = (n, o, hind) => { const l = R.layers.find((x) => x.n === n); if (!l) return; const sw = s(o) * k, lift = Math.max(0, c(o)) * k;
    const th = l.r1 + 28 * sw; L[n] = hind ? [th - 10 * lift, th + 26 * lift + 6] : [th + 8 * lift, th - 34 * lift]; };
  leg('legHF', 0, 1); leg('legFB', 0.3, 0); leg('legHB', Math.PI, 1); leg('legFF', Math.PI + 0.3, 0);
  return L;
}
function enemyPose(e) {
  const R = ERIG[e.type], d = EDEF[e.type], M = R.M;
  const ph = e.anim / 4 * TAU, moving = e.state === 'move' || e.state === 'retreat';
  const style = e.type === 'walker' ? 'reach' : e.type === 'ghoul' ? 'wild' : 'hang';
  let pose = { lean: M.lean, bob: 0, legBob: 0, ph, walk: moving ? 1 : 0.2 };
  if (M.procLegs) { pose.bob = -Math.abs(Math.cos(ph)) * 1.5; }
  else if (M.quad) { pose.L = quadWalk(R, ph, moving ? 1 : 0.15); pose.bob = -Math.abs(Math.cos(ph)) * 2.2; pose.lean = Math.sin(ph * 2) * 2; }
  else if (M.float) {
    pose.bob = Math.sin(G.t * 3 + e.x) * 3;
    pose.L = { armF: [18 + Math.sin(ph) * 10, 30 + Math.sin(ph) * 10], armB: [10 - Math.sin(ph) * 8, 24] };
    pose.lean = Math.sin(ph) * 3;
  } else { pose.L = bipedWalk(R, ph, moving ? 1 : 0.12, style); pose.bob = -Math.abs(Math.cos(ph)) * (moving ? 2.2 : 0.6); }
  // замах: руки вверх-назад, присед; удар: руки вперёд-вниз, корпус вперёд
  if (e.state === 'wind' || e.state === 'crouch') {
    const k = clamp(1 - e.t / Math.max(0.05, e.state === 'wind' ? d.wind : 0.45), 0, 1), kk = ease(k);
    if (M.quad) { pose.bob = 7 * kk; pose.lean = -6 * kk; pose.L = quadWalk(R, 0, 0); for (const n in pose.L) { const q = pose.L[n], hind = n.startsWith('legH'); pose.L[n] = hind ? [q[0] - 30 * kk, q[1] + 60 * kk] : [q[0] + 20 * kk, q[1] - 50 * kk]; } }
    else if (M.procLegs) { pose.bob = -6 * kk; pose.legsUp = 0; pose.lean = -10 * kk; }
    else {
      pose.lean = M.lean - 18 * kk; pose.bob = 3 * kk;
      const up = M.float ? [100, 110] : [150, 150 + 50];
      pose.L = Object.assign(pose.L || {}, {
        armF: [lerp(pose.L && pose.L.armF ? pose.L.armF[0] : 10, up[0], kk), lerp(pose.L && pose.L.armF ? pose.L.armF[1] : 20, up[1], kk)],
        armB: [lerp(pose.L && pose.L.armB ? pose.L.armB[0] : 0, up[0] - 15, kk), lerp(pose.L && pose.L.armB ? pose.L.armB[1] : 20, up[1] - 10, kk)],
      });
      if (!M.float) { pose.L.legF = [24 * kk, 24 * kk - 40 * kk]; pose.L.legB = [-20 * kk, -20 * kk - 30 * kk]; }
    }
  } else if (e.state === 'recover') {
    const dur = e.type === 'brute' || e.type === 'titan' ? 0.7 : 0.35, k = clamp(e.t / dur, 0, 1), kk = ease(k);
    if (!M.quad && !M.procLegs) {
      pose.lean = M.lean + 22 * kk;
      pose.L = Object.assign(pose.L || {}, { armF: [lerp(pose.L.armF ? pose.L.armF[0] : 10, 60, kk), lerp(pose.L.armF ? pose.L.armF[1] : 20, 64, kk)], armB: [lerp(pose.L.armB ? pose.L.armB[0] : 0, 48, kk), lerp(pose.L.armB ? pose.L.armB[1] : 20, 56, kk)] });
      if (!M.float) { pose.L.legF = [30 * kk, 30 * kk - 30 * kk]; pose.L.legB = [-26 * kk, -26 * kk - 10 * kk]; }
    } else pose.lean = 8 * kk;
  } else if (e.state === 'leap') {
    if (M.quad) { pose.lean = -8; pose.L = { legHF: [-60, -20], legHB: [-70, -30], legFF: [70, 40], legFB: [60, 30] }; }
    else if (M.procLegs) pose.legsUp = 1;
  }
  // попадание: корпус откидывает назад, руки разлетаются
  if (e.hitT > 0 && !M.procLegs) {
    const k = e.hitT / 0.18;
    pose.lean -= 16 * k;
    if (pose.L && pose.L.armF) { pose.L.armF = [pose.L.armF[0] - 40 * k, pose.L.armF[1] - 20 * k]; }
  }
  if (e.stun > 0 && !M.quad && !M.procLegs) { pose.lean = M.lean + 18 + Math.sin(G.t * 6) * 4; if (pose.L) { pose.L.armF = [-8, 0]; pose.L.armB = [-12, -4]; } }
  return pose;
}

// ---------- Отрисовка существа ----------
function drawEnemyRig(ctx, e) {
  const R = ERIG[e.type], d = EDEF[e.type];
  if (!R) return false;
  const flip = Math.cos(e.face) < 0 ? -1 : 1;
  let y = e.y, rot = 0, alpha = 1;
  if (d.float) y -= 6;
  if (e.state === 'leap') y -= Math.sin((1 - e.t / (e.type === 'wolf' ? 0.34 : 0.42)) * Math.PI) * 30;
  if (e.state === 'cling' && e.host) y = e.host.y - 40 * HERO_SCALE;
  const pose = enemyPose(e);
  // смерть: падает навзничь, конечности обмякают, потом растворяется
  if (e.state === 'dying') {
    const k = clamp((1.4 - e.t) / 0.45, 0, 1), kk = ease(k);
    rot = (R.M.quad || R.M.procLegs ? 0.25 : -1.45) * kk;
    if (R.M.procLegs) pose.legsUp = kk;
    if (pose.L) for (const n in pose.L) pose.L[n] = [lerp(pose.L[n][0], n.startsWith('arm') ? -40 : 20, kk), lerp(pose.L[n][1], n.startsWith('arm') ? -30 : 10, kk)];
    pose.lean = lerp(pose.lean, -10, kk);
    alpha = e.t < 0.4 ? e.t / 0.4 : 1;
  }
  let v = null;
  if (e.frozen > 0) v = 'fz'; else if (e.flash > 0) v = 'fl';
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(e.x, y);
  let sx = flip * ENEMY_SCALE, sy = ENEMY_SCALE;
  // сжатие при ударе
  if (e.hitT > 0 && e.state !== 'cling' && e.state !== 'dying') { const k = e.hitT / 0.18; sx *= 1 + 0.1 * k; sy *= 1 - 0.1 * k; }
  ctx.scale(sx, sy); if (rot) ctx.rotate(rot);
  drawRig(ctx, e.type, pose, v);
  // телеграф замаха — красная вспышка
  if ((e.state === 'wind' || e.state === 'crouch') && !v && Math.floor(G.t * 16) % 2) { ctx.globalAlpha *= 0.6; drawRig(ctx, e.type, pose, 'rd'); }
  ctx.restore();
  return true;
}
