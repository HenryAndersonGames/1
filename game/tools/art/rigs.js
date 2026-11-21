'use strict';
// Риги существ для скелетной (cutout) анимации в игре — как у героев: каждая конечность режется в суставе
// на верхний и нижний кусок со скруглённым концом (колено/локоть), игра вращает их по костям.
// Пишет rig_<тип>_<часть> и ART_META.rigs.
const L = require('./lib');
const { svg, g, f } = L;
const C1 = require('./creatures').P;
const C2 = require('./creatures2').P;

// limb: fn(dk) — рисунок конечности «вниз» от точки крепления; j — сустав, e — конец (стопа/кисть), r — радиус скругления,
// box — [x, y, w, h] рамка рисунка; at — точка крепления в координатах существа; arm — рука (качается с торсом)
const RIGS = {
  walker: {
    lean: 8,
    limbs: [
      { n: 'armB', fn: C1.wArm, dk: 1, at: [3, -75], arm: 1, j: [1, 25.5], e: [0, 50], r: 3.4, box: [-9, -5, 18, 72] },
      { n: 'legB', fn: C1.wLeg, dk: 1, at: [-3, -40], j: [2, 18.6], e: [1, 38], r: 3.4, box: [-8, -4, 22, 48] },
      { n: 'legF', fn: C1.wLeg, at: [3, -40], j: [2, 18.6], e: [1, 38], r: 3.4, box: [-8, -4, 22, 48] },
      { n: 'torso', fn: C1.wTorso, at: [0, -40], box: [-18, -58, 50, 72] },
      { n: 'armF', fn: C1.wArm, at: [9, -74], arm: 1, j: [1, 25.5], e: [0, 50], r: 3.4, box: [-9, -5, 18, 72] },
    ],
  },
  ghoul: {
    lean: 14,
    limbs: [
      { n: 'armB', fn: C2.gArm, dk: 1, at: [1, -32], arm: 1, j: [0, 12], e: [0, 22.5], r: 2.8, box: [-7, -3, 14, 35] },
      { n: 'legB', fn: C2.gLeg, dk: 1, at: [-2, -18], j: [0.2, 10], e: [1, 16.5], r: 2.6, box: [-6, -3, 14, 23] },
      { n: 'legF', fn: C2.gLeg, at: [2, -18], j: [0.2, 10], e: [1, 16.5], r: 2.6, box: [-6, -3, 14, 23] },
      { n: 'torso', fn: C2.gTorso, at: [0, -18], box: [-12, -50, 32, 58] },
      { n: 'armF', fn: C2.gArm, at: [6, -31], arm: 1, j: [0, 12], e: [0, 22.5], r: 2.8, box: [-7, -3, 14, 35] },
    ],
  },
  brute: {
    lean: 6,
    limbs: [
      { n: 'armB', fn: C1.bArm, dk: 1, at: [-6, -70], arm: 1, j: [0, 34], e: [0, 62], r: 9.5, box: [-17, -9, 34, 84] },
      { n: 'legB', fn: C1.bLeg, dk: 1, at: [-13, -34], j: [0, 16], e: [0, 30], r: 10, box: [-16, -5, 32, 42] },
      { n: 'legF', fn: C1.bLeg, at: [13, -34], j: [0, 16], e: [0, 30], r: 10, box: [-16, -5, 32, 42] },
      { n: 'torso', fn: C1.bBody, at: [0, -34], box: [-46, -102, 92, 110] },
      { n: 'armF', fn: C1.bArm, at: [20, -66], arm: 1, j: [0, 34], e: [0, 62], r: 9.5, box: [-17, -9, 34, 84] },
    ],
  },
  titan: {
    lean: 4,
    limbs: [
      { n: 'armB', fn: C2.tArm, dk: 1, at: [-10, -166], arm: 1, j: [0, 52], e: [0, 100], r: 15, box: [-26, -12, 52, 130] },
      { n: 'legB', fn: C2.tLeg, dk: 1, at: [-24, -54], j: [0, 28], e: [0, 48], r: 17, box: [-26, -6, 52, 64] },
      { n: 'legF', fn: C2.tLeg, at: [24, -54], j: [0, 28], e: [0, 48], r: 17, box: [-26, -6, 52, 64] },
      { n: 'torso', fn: C2.tBody, at: [0, -54], box: [-74, -168, 144, 178] },
      { n: 'armF', fn: C2.tArm, at: [34, -158], arm: 1, j: [0, 52], e: [0, 100], r: 15, box: [-26, -12, 52, 130] },
    ],
  },
  wolf: {
    quad: 1,
    limbs: [
      { n: 'legHB', fn: C2.wLegH, dk: 1, at: [-17, -27], j: [-1, 12], e: [-1, 25], r: 4, box: [-9, -5, 16, 34] },
      { n: 'legFB', fn: C2.wLegF, dk: 1, at: [16, -27], j: [0, 13], e: [-0.5, 25], r: 3.2, box: [-7, -4, 13, 33] },
      { n: 'torso', fn: C2.wolfTorso, at: [0, -28], box: [-50, -34, 98, 40] },
      { n: 'legHF', fn: C2.wLegH, at: [-21, -26], j: [-1, 12], e: [-1, 25], r: 4, box: [-9, -5, 16, 34] },
      { n: 'legFF', fn: C2.wLegF, at: [12, -26], j: [0, 13], e: [-0.5, 25], r: 3.2, box: [-7, -4, 13, 33] },
    ],
  },
  jumper: {
    quad: 1,
    limbs: [
      { n: 'legHB', fn: C1.jHind, dk: 1, at: [-15, -22], j: [-1, 11], e: [0, 20], r: 4.4, box: [-10, -6, 17, 30] },
      { n: 'legFB', fn: C1.jFront, dk: 1, at: [17, -22], j: [0, 12], e: [0, 20], r: 3.2, box: [-7, -5, 13, 29] },
      { n: 'torso', fn: C1.jBody, at: [0, -24], box: [-43, -22, 86, 30] },
      { n: 'legHF', fn: C1.jHind, at: [-19, -21], j: [-1, 11], e: [0, 20], r: 4.4, box: [-10, -6, 17, 30] },
      { n: 'legFF', fn: C1.jFront, at: [13, -21], j: [0, 12], e: [0, 20], r: 3.2, box: [-7, -5, 13, 29] },
    ],
  },
  void: {
    float: 1,
    limbs: [
      { n: 'armB', fn: C2.vArm, dk: 1, at: [2, -58], arm: 1, j: [0, 10], e: [0, 21], r: 4.6, box: [-7, -3, 14, 33] },
      { n: 'torso', fn: () => C2.voidRobe(0, 0), at: [0, 0], box: [-20, -94, 42, 104] },
      { n: 'armF', fn: C2.vArm, at: [6, -56], arm: 1, j: [0, 10], e: [0, 21], r: 4.6, box: [-7, -3, 14, 33] },
    ],
  },
  spider: {
    // ноги рисуются в игре процедурно (по 4 с каждой стороны, колено вверх), тело — одним куском
    procLegs: { n: 4, base: [[4, -20], [1.6, -20], [-0.8, -20], [-3.2, -20]], feet: [-33, -19, 9, 27], knee: -44, w: 2, col: ['#1c1618', '#2e2428'] },
    limbs: [{ n: 'torso', fn: () => C2.spiderTorso(false), at: [0, 0], box: [-34, -48, 60, 50] }],
  },
  clinger: {
    procLegs: { n: 3, base: [[-8, -7], [-3, -7], [2, -7]], feet: [-17, -5, 7], knee: -15, w: 1.3, col: ['#5a4040', '#8e706a'] },
    limbs: [{ n: 'torso', fn: () => clingerTorso(), at: [0, 0], box: [-15, -23, 34, 24] }],
  },
};
// тело прилипалы без ножек (ножки — процедурно в игре)
function clingerTorso() { return C1.clingerBody(0, true); }

function build(out) {
  const meta = (out.__meta = out.__meta || {});
  meta.rigs = {};
  for (const [type, R] of Object.entries(RIGS)) {
    const M = { lean: R.lean || 0, quad: !!R.quad, float: !!R.float, procLegs: R.procLegs || null, layers: [] };
    for (const l of R.limbs) {
      const [bx, by, bw, bh] = l.box;
      const body = l.fn(!!l.dk);
      if (!l.j) {
        out[`rig_${type}_${l.n}`] = svg(bx, by, bw, bh, body);
        M.layers.push({ n: l.n, at: l.at, torso: 1 });
        continue;
      }
      // верхний кусок: всё выше сустава + круг сустава; нижний — всё ниже сустава + круг
      const id = `${type}${l.n}`, [jx, jy] = l.j, r = l.r;
      const up = `<clipPath id="u${id}"><rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(jy - by)}"/><circle cx="${f(jx)}" cy="${f(jy)}" r="${f(r)}"/></clipPath>`;
      const lo = `<clipPath id="l${id}"><rect x="${f(bx)}" y="${f(jy)}" width="${f(bw)}" height="${f(by + bh - jy)}"/><circle cx="${f(jx)}" cy="${f(jy)}" r="${f(r)}"/></clipPath>`;
      out[`rig_${type}_${l.n}_u`] = svg(bx, by, bw, bh, `<defs>${up}</defs><g clip-path="url(#u${id})">${body}</g>`);
      out[`rig_${type}_${l.n}_l`] = svg(bx, by, bw, bh, `<defs>${lo}</defs><g clip-path="url(#l${id})">${body}</g>`);
      M.layers.push({ n: l.n, at: l.at, arm: !!l.arm, j: l.j, e: l.e });
    }
    meta.rigs[type] = M;
  }
}
module.exports = { build };
