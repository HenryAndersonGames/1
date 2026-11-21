// Модели персонажей: люди, демоны-«Пустые», Голодный. Тело — 1 меш, руки и ноги — по мешу на шарнире.
import * as THREE from 'three';
import { GeoBuilder, MAT, shade, mixColor } from './models.js';

const DEF = {
  skin: '#c99a78', hair: '#3a2a1e', hairStyle: 'short', beard: 'none',
  hat: 'cowboy', hatColor: '#3b2f25', band: '#1e1814',
  shirt: '#c9bfa8', vest: null, coat: null, coatLong: false,
  pants: '#4a4038', boots: '#2a1f18', skirt: null, apron: null,
  h: 1, w: 1, badge: false, glasses: false, collar: false, bandana: null,
  holster: false, bag: false, tie: null, chain: false, scar: false,
};
const COLOR_KEYS = ['hair', 'hatColor', 'band', 'shirt', 'vest', 'coat', 'pants', 'boots', 'skirt', 'apron', 'bandana', 'tie'];

export function buildParts(lookIn, demon = false) {
  const L = Object.assign({}, DEF, lookIn);
  if (demon) {
    for (const k of COLOR_KEYS) if (L[k]) L[k] = shade(mixColor(L[k], '#2a1414', 0.35), 0.42);
    L.skin = '#2c1d1f';
  }
  const W = L.w;
  const legS = demon ? 1.22 : 1, armS = demon ? 1.55 : 1;
  const off = 0.95 * (legS - 1);
  const b = new GeoBuilder(), eyes = new GeoBuilder();
  const tw = 0.46 * W, td = 0.27 * W;
  const Y = (y) => y + off;
  const skinD = shade(L.skin, 0.8);
  const female = !!L.skirt;

  // торс
  const shirt = female && !L.shirtOverride ? L.skirt : L.shirt;
  b.box(shirt, 0, Y(1.2), 0, tw, 0.58, td);
  if (L.vest) {
    b.box(L.vest, -tw * 0.3, Y(1.22), td / 2 + 0.012, tw * 0.4, 0.5, 0.03);
    b.box(L.vest, tw * 0.3, Y(1.22), td / 2 + 0.012, tw * 0.4, 0.5, 0.03);
    b.box(L.vest, 0, Y(1.22), -td / 2 - 0.012, tw + 0.02, 0.5, 0.03);
    b.box(shade(L.vest, 1.6), tw * 0.12, Y(1.12), td / 2 + 0.03, 0.03, 0.03, 0.01);
    b.box(shade(L.vest, 1.6), tw * 0.12, Y(1.26), td / 2 + 0.03, 0.03, 0.03, 0.01);
  }
  if (L.tie) b.box(L.tie, 0, Y(1.33), td / 2 + 0.02, 0.07, 0.22, 0.02);
  if (L.chain) b.box('#d8b64a', tw * 0.14, Y(1.1), td / 2 + 0.035, 0.18, 0.02, 0.01, 0, 0, 0.3);
  if (!female) {
    b.box('#2a1d14', 0, Y(0.95), 0, tw + 0.03, 0.08, td + 0.03);
    b.box('#c9a43a', 0, Y(0.95), td / 2 + 0.02, 0.08, 0.06, 0.02);
  }
  if (L.coat) {
    const cw = tw + 0.07, cd = td + 0.07;
    b.box(L.coat, -tw * 0.37, Y(1.17), 0, cw * 0.3, 0.66, cd);
    b.box(L.coat, tw * 0.37, Y(1.17), 0, cw * 0.3, 0.66, cd);
    b.box(L.coat, 0, Y(1.17), -td / 2 - 0.035, cw, 0.66, 0.04);
    b.box(shade(L.coat, 0.8), -tw * 0.2, Y(1.4), td / 2 + 0.04, 0.12, 0.2, 0.02, 0, 0, -0.35);
    b.box(shade(L.coat, 0.8), tw * 0.2, Y(1.4), td / 2 + 0.04, 0.12, 0.2, 0.02, 0, 0, 0.35);
    b.box(L.coat, 0, Y(1.49), -0.02, cw, 0.07, cd + 0.02);
    if (L.coatLong) {
      b.box(L.coat, -tw * 0.36, Y(0.62), -0.03, cw * 0.34, 0.6, cd + 0.04, -0.05, 0, 0.06);
      b.box(L.coat, tw * 0.36, Y(0.62), -0.03, cw * 0.34, 0.6, cd + 0.04, -0.05, 0, -0.06);
      b.box(L.coat, 0, Y(0.62), -td / 2 - 0.07, cw + 0.06, 0.6, 0.04, -0.08, 0, 0);
    } else {
      b.box(L.coat, 0, Y(0.8), -td / 2 - 0.04, cw, 0.24, 0.04);
    }
  }
  if (female) {
    b.cyl(L.skirt, 0, Y(0.55), 0, 0.26 * W, 0.42 * W, 0.86, 8);
    b.cyl(shade(L.skirt, 0.75), 0, Y(0.95), 0, 0.25 * W, 0.25 * W, 0.06, 8);
  }
  if (L.apron) b.box(L.apron, 0, Y(female ? 0.66 : 0.75), (female ? 0.33 : td / 2 + 0.03) * (female ? W : 1), 0.36, female ? 0.72 : 0.6, 0.02, female ? -0.2 : 0, 0, 0);
  if (L.collar) b.box('#efefef', 0, Y(1.5), td / 2 - 0.02, 0.09, 0.06, 0.05);
  if (L.badge) {
    b.box('#d8b13a', -tw * 0.27, Y(1.3), td / 2 + 0.04, 0.08, 0.08, 0.02);
    b.box('#d8b13a', -tw * 0.27, Y(1.3), td / 2 + 0.045, 0.08, 0.08, 0.02, 0, 0, Math.PI / 4);
  }
  if (L.holster) {
    b.box('#3a2616', tw * 0.56, Y(0.86), 0.02, 0.09, 0.22, 0.13);
    b.box('#2b2b2b', tw * 0.56, Y(1.0), -0.01, 0.06, 0.1, 0.07);
  }
  if (L.bag) b.box('#3a2418', -tw * 0.62, Y(0.75), 0.05, 0.14, 0.24, 0.34);

  // шея и голова
  b.box(L.skin, 0, Y(1.53), 0, 0.12, 0.09, 0.12);
  const hs = 0.27;
  if (!demon) {
    b.box(L.skin, 0, Y(1.7), 0, hs, 0.3, hs);
    b.box(skinD, 0, Y(1.69), hs / 2 + 0.02, 0.05, 0.08, 0.05);
    b.box('#161210', -0.065, Y(1.74), hs / 2 + 0.004, 0.045, 0.035, 0.01);
    b.box('#161210', 0.065, Y(1.74), hs / 2 + 0.004, 0.045, 0.035, 0.01);
    b.box(shade(L.hair, 0.9), -0.065, Y(1.78), hs / 2 + 0.006, 0.06, 0.015, 0.01);
    b.box(shade(L.hair, 0.9), 0.065, Y(1.78), hs / 2 + 0.006, 0.06, 0.015, 0.01);
    if (L.scar) b.box('#8a4a40', 0.07, Y(1.68), hs / 2 + 0.006, 0.02, 0.12, 0.01, 0, 0, 0.4);
  } else {
    // вытянутая голова, разинутая пасть
    b.box(L.skin, 0, Y(1.74), 0, hs * 0.92, 0.42, hs);
    b.box('#3a0a08', 0, Y(1.6), hs / 2 + 0.005, 0.16, 0.14, 0.02);
    for (let i = -2; i <= 2; i++) b.box('#d8d0c0', i * 0.03, Y(1.66), hs / 2 + 0.012, 0.015, 0.04, 0.01);
    eyes.box('#ff3a1c', -0.065, Y(1.8), hs / 2 + 0.01, 0.055, 0.03, 0.02);
    eyes.box('#ff3a1c', 0.065, Y(1.8), hs / 2 + 0.01, 0.055, 0.03, 0.02);
  }
  const hy = demon ? 0.07 : 0;
  // волосы
  if (L.hairStyle !== 'none') {
    if (L.hairStyle !== 'bald') b.box(L.hair, 0, Y(1.845 + hy), -0.01, hs + 0.02, 0.06, hs + 0.02);
    b.box(L.hair, 0, Y(1.73 + hy), -hs / 2 - 0.012, hs + 0.02, 0.22, 0.03);
    b.box(L.hair, -hs / 2 - 0.01, Y(1.75 + hy), -0.03, 0.025, 0.14, hs * 0.7);
    b.box(L.hair, hs / 2 + 0.01, Y(1.75 + hy), -0.03, 0.025, 0.14, hs * 0.7);
    if (L.hairStyle === 'long') {
      b.box(L.hair, 0, Y(1.52), -hs / 2 - 0.04, hs + 0.06, 0.42, 0.06);
      b.box(L.hair, -hs / 2 - 0.02, Y(1.6), -0.02, 0.04, 0.32, hs * 0.6);
      b.box(L.hair, hs / 2 + 0.02, Y(1.6), -0.02, 0.04, 0.32, hs * 0.6);
    }
    if (L.hairStyle === 'bun') b.ico(L.hair, 0, Y(1.82 + hy), -hs / 2 - 0.06, 0.085);
  }
  if (!demon) {
    if (L.beard === 'mustache') b.box(L.hair, 0, Y(1.645), hs / 2 + 0.015, 0.15, 0.035, 0.02);
    if (L.beard === 'full') {
      b.box(L.hair, 0, Y(1.6), 0.03, hs + 0.02, 0.16, hs * 0.85);
      b.box(L.hair, 0, Y(1.645), hs / 2 + 0.015, 0.15, 0.035, 0.02);
    }
    if (L.beard === 'long') {
      b.box(L.hair, 0, Y(1.55), 0.05, hs + 0.02, 0.26, hs * 0.8);
      b.box(L.hair, 0, Y(1.4), hs / 2 - 0.02, 0.16, 0.16, 0.06);
    }
    if (L.beard === 'stubble') b.box(shade(L.skin, 0.72), 0, Y(1.6), 0.02, hs + 0.008, 0.1, hs * 0.92);
    if (L.glasses) {
      b.box('#1a1a1a', 0, Y(1.74), hs / 2 + 0.014, 0.22, 0.02, 0.01);
      b.box('#9fb4bb', -0.065, Y(1.74), hs / 2 + 0.016, 0.06, 0.05, 0.005);
      b.box('#9fb4bb', 0.065, Y(1.74), hs / 2 + 0.016, 0.06, 0.05, 0.005);
    }
  }
  if (L.bandana) {
    b.box(L.bandana, 0, Y(1.52), 0.0, 0.2, 0.07, 0.19);
    b.prism(L.bandana, 0, Y(1.36), 0.1, 0.16, 0.14, 0.03);
  }
  // шляпы
  const ht = Y(1.86 + hy), H = L.hatColor;
  switch (L.hat) {
    case 'cowboy':
      b.cyl(H, 0, ht, 0, 0.32, 0.32, 0.03, 10);
      b.box(H, -0.29, ht + 0.035, 0, 0.09, 0.03, 0.48, 0, 0, 0.55);
      b.box(H, 0.29, ht + 0.035, 0, 0.09, 0.03, 0.48, 0, 0, -0.55);
      b.cyl(H, 0, ht + 0.1, 0, 0.14, 0.17, 0.17, 8);
      b.box(shade(H, 0.8), 0, ht + 0.19, 0, 0.06, 0.03, 0.2);
      b.cyl(L.band, 0, ht + 0.035, 0, 0.172, 0.172, 0.035, 8);
      break;
    case 'straw':
      b.cyl(H, 0, ht, 0, 0.38, 0.38, 0.03, 10);
      b.cyl(H, 0, ht + 0.08, 0, 0.15, 0.17, 0.13, 8);
      b.cyl('#7a3a24', 0, ht + 0.03, 0, 0.172, 0.172, 0.03, 8);
      break;
    case 'bowler':
      b.cyl(H, 0, ht - 0.01, 0, 0.21, 0.21, 0.025, 10);
      b.cyl(H, 0, ht + 0.07, 0, 0.12, 0.155, 0.14, 8);
      b.cyl(L.band, 0, ht + 0.02, 0, 0.157, 0.157, 0.03, 8);
      break;
    case 'top':
      b.cyl(H, 0, ht - 0.01, 0, 0.22, 0.22, 0.025, 10);
      b.cyl(H, 0, ht + 0.15, 0, 0.145, 0.14, 0.3, 8);
      b.cyl(L.band, 0, ht + 0.03, 0, 0.142, 0.142, 0.04, 8);
      break;
    case 'flat':
      b.cyl(H, 0, ht, 0, 0.31, 0.31, 0.03, 10);
      b.cyl(H, 0, ht + 0.05, 0, 0.15, 0.16, 0.08, 8);
      break;
    case 'cap':
      b.cyl(H, 0, ht - 0.02, 0, 0.155, 0.155, 0.09, 8);
      b.box(H, 0, ht - 0.05, 0.17, 0.2, 0.02, 0.12);
      break;
    case 'visor':
      b.box('#3d6b4a', 0, ht - 0.03, 0.16, 0.24, 0.02, 0.16, -0.2, 0, 0);
      b.cyl('#3d6b4a', 0, ht - 0.03, 0, 0.15, 0.15, 0.03, 8);
      break;
    case 'bonnet':
      b.box(H, 0, Y(1.76), -0.03, hs + 0.08, 0.32, hs + 0.04);
      b.box(H, 0, Y(1.78), hs / 2 + 0.03, hs + 0.14, 0.34, 0.04);
      b.box(shade(H, 0.8), 0, Y(1.58), 0.08, 0.04, 0.04, 0.12);
      break;
    case 'feather':
      b.box(H, 0.02, ht - 0.03, 0, 0.2, 0.06, 0.2);
      b.box('#1a1a1a', 0.08, ht + 0.12, -0.04, 0.03, 0.3, 0.05, -0.3, 0, -0.2);
      break;
  }

  // руки (шарнир в плече): рукав + кисть
  const sleeve = L.coat || shirt;
  const arm = (side) => {
    const a = new GeoBuilder();
    a.box(sleeve, 0, -0.26, 0, 0.13 * W, 0.52, 0.14 * W);
    if (L.coat) a.box(shade(sleeve, 0.85), 0, -0.5, 0, 0.14 * W, 0.06, 0.15 * W);
    a.box(L.skin, 0, -0.58, 0.0, 0.1, 0.12, 0.11);
    const g = a.build();
    g.scale(1, armS, 1);
    if (demon) {
      const cl = new GeoBuilder();
      for (let i = -1; i <= 1; i++) cl.cone('#121010', i * 0.035, -0.66 * armS - 0.08, 0.02, 0.018, 0.16, 4, Math.PI, 0, 0);
      const cg = cl.build();
      return mergeTwo(g, cg);
    }
    return g;
  };
  // ноги (шарнир в бедре)
  const leg = () => {
    const l = new GeoBuilder();
    if (!female) l.box(L.pants, 0, -0.34, 0, 0.17 * W, 0.62, 0.19 * W);
    else l.box('#2a2222', 0, -0.4, 0, 0.12, 0.5, 0.13);
    l.box(L.boots, 0, -0.8, 0.03, 0.18, 0.3, 0.27);
    l.box(shade(L.boots, 0.7), 0, -0.93, 0.03, 0.19, 0.04, 0.28);
    const g = l.build();
    g.scale(1, legS, 1);
    return g;
  };
  return {
    body: b.build(), armL: arm(-1), armR: arm(1), legL: leg(), legR: leg(),
    eyes: eyes.empty ? null : eyes.build(),
    sx: tw / 2 + 0.07 * W, sy: Y(1.45), hx: 0.11 * W, hy: Y(0.95), female,
  };
}

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function mergeTwo(a, b) {
  a.deleteAttribute('normal'); b.deleteAttribute('normal');
  const g = mergeGeometries([a, b], false);
  g.computeVertexNormals();
  return g;
}

const blobGeo = new THREE.CircleGeometry(0.55, 12).rotateX(-Math.PI / 2);

export class Character {
  constructor(look, opts = {}) {
    this.demon = !!opts.demon;
    const P = buildParts(look, this.demon);
    this.group = new THREE.Group();
    this.root = new THREE.Group();
    this.group.add(this.root);
    const s = (look.h || 1) * (this.demon ? 1.1 : 1);
    this.root.scale.setScalar(s);
    const mk = (geo, parent, mat = MAT.solid) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; parent.add(m); return m; };
    this.body = mk(P.body, this.root);
    this.armL = new THREE.Group(); this.armL.position.set(-P.sx, P.sy, 0); mk(P.armL, this.armL); this.root.add(this.armL);
    this.armR = new THREE.Group(); this.armR.position.set(P.sx, P.sy, 0); mk(P.armR, this.armR); this.root.add(this.armR);
    this.legL = new THREE.Group(); this.legL.position.set(-P.hx, P.hy, 0); mk(P.legL, this.legL); this.root.add(this.legL);
    this.legR = new THREE.Group(); this.legR.position.set(P.hx, P.hy, 0); mk(P.legR, this.legR); this.root.add(this.legR);
    if (P.eyes) { const e = new THREE.Mesh(P.eyes, MAT.eyes); this.root.add(e); }
    if (opts.gun) {
      const gb = new GeoBuilder();
      gb.box('#262626', 0, -0.62, 0.1, 0.045, 0.07, 0.24);
      gb.box('#4a3020', 0, -0.66, 0.0, 0.05, 0.12, 0.06);
      this.gun = new THREE.Mesh(gb.build(), MAT.solid);
      this.gun.visible = false;
      this.armR.add(this.gun);
    }
    this.blob = new THREE.Mesh(blobGeo, MAT.blob);
    this.blob.renderOrder = 1;
    this.group.add(this.blob);
    this.phase = Math.random() * 6; this.t = Math.random() * 10;
    this.pose = 'idle'; this.poseT = 0; this.deadT = 0; this.fade = 1;
  }
  setPose(p, dur = 0) { this.pose = p; this.poseT = dur; }
  update(dt, speed) {
    this.t += dt;
    if (this.poseT > 0) { this.poseT -= dt; if (this.poseT <= 0) this.pose = 'idle'; }
    const r = this.root, p = this.pose;
    if (this.gun) this.gun.visible = (p === 'aim');
    if (p === 'dead' || p === 'downed') {
      this.deadT = Math.min(1, this.deadT + dt * 3);
      const e = 1 - Math.pow(1 - this.deadT, 3);
      r.rotation.x = -Math.PI / 2 * e * (p === 'downed' ? 0.92 : 1);
      r.position.y = 0.16 * e;
      this.armL.rotation.x = -2.6 * e; this.armR.rotation.x = -2.2 * e;
      this.armL.rotation.z = -0.3 * e; this.armR.rotation.z = 0.4 * e;
      this.legL.rotation.x = 0.1; this.legR.rotation.x = -0.15;
      this.blob.visible = false;
      return;
    }
    this.deadT = 0; this.blob.visible = true;
    this.armL.rotation.z = 0; this.armR.rotation.z = 0;
    r.rotation.x = this.demon ? 0.3 : 0;
    r.position.y = 0;
    this.phase += dt * speed * (this.demon ? 1.5 : 2.3);
    const sw = Math.min(speed / 4.5, 1.25) * 0.68;
    let la = -Math.sin(this.phase) * sw * 0.8, ra = Math.sin(this.phase) * sw * 0.8;
    let ll = Math.sin(this.phase) * sw, lr = -Math.sin(this.phase) * sw;
    r.position.y = Math.abs(Math.cos(this.phase)) * 0.05 * sw;
    if (speed < 0.15) { la = Math.sin(this.t * 1.6) * 0.04; ra = -la; ll = lr = 0; }
    switch (p) {
      case 'aim': ra = -Math.PI / 2 + 0.05; break;
      case 'punch': ra = -1.7; la = 0.3; break;
      case 'claw': la = ra = -1.5 + Math.sin(this.t * 18) * 0.25; break;
      case 'drag': la = ra = -1.0; break;
      case 'carried': r.rotation.x = -1.2; r.position.y = 0.45; la = ra = -2.7; ll = lr = 0.15; break;
      case 'talk': ra = -0.35 + Math.sin(this.t * 3) * 0.2; break;
      case 'surrender': la = ra = -2.9; this.armL.rotation.z = -0.25; this.armR.rotation.z = 0.25; break;
      case 'mourn': r.rotation.x = 0.25; la = ra = -0.5; break;
      case 'drink': ra = -2.2; break;
    }
    if (this.demon && p !== 'claw' && p !== 'drag') { la -= 0.3; ra -= 0.3; }
    this.armL.rotation.x = la; this.armR.rotation.x = ra;
    this.legL.rotation.x = ll; this.legR.rotation.x = lr;
  }
  dispose(scene) {
    scene.remove(this.group);
    this.group.traverse(o => { if (o.isMesh && o.geometry !== blobGeo) o.geometry.dispose(); });
  }
}

// Голодный — финальное чудовище
export function buildBoss() {
  const b = new GeoBuilder(), e = new GeoBuilder();
  const dark = '#1b1213', flesh = '#3a1e1e', bone = '#cfc3a8';
  b.cyl(dark, 0, 1.6, 0, 1.0, 1.5, 3.2, 7);
  b.ico(flesh, 0, 3.6, 0.1, 1.5, 1.3, 1.2, 0);
  b.ico(dark, 0, 5.0, 0.4, 0.9, 1.1, 0.9, 0);
  b.box('#2a0606', 0, 4.6, 1.15, 0.9, 0.6, 0.2);
  for (let i = -3; i <= 3; i++) b.cone(bone, i * 0.12, 4.86, 1.2, 0.04, 0.2, 4, Math.PI, 0, 0);
  for (let i = -3; i <= 3; i++) b.cone(bone, i * 0.12, 4.35, 1.2, 0.04, 0.2, 4, 0, 0, 0);
  // рога
  for (const s of [-1, 1]) {
    b.cyl(bone, s * 0.55, 6.0, 0.2, 0.05, 0.12, 1.4, 5, 0, 0, -s * 0.5);
    b.cyl(bone, s * 1.0, 6.7, 0.2, 0.03, 0.06, 0.9, 5, 0, 0, -s * 1.1);
    b.cyl(bone, s * 0.75, 6.9, 0.1, 0.03, 0.05, 0.7, 5, 0.3, 0, -s * 0.1);
  }
  // лица-маски, вросшие в тело
  const masks = [[-0.7, 3.4, 1.1], [0.8, 3.9, 1.0], [0.0, 2.6, 1.35], [-0.5, 4.3, 0.9], [0.6, 2.9, 1.2]];
  for (const [x, y, z] of masks) {
    b.box('#b8a48e', x, y, z, 0.3, 0.38, 0.06);
    e.box('#ff2010', x - 0.06, y + 0.05, z + 0.04, 0.05, 0.03, 0.02);
    e.box('#ff2010', x + 0.06, y + 0.05, z + 0.04, 0.05, 0.03, 0.02);
  }
  e.box('#ff2010', -0.28, 5.25, 1.18, 0.16, 0.08, 0.04);
  e.box('#ff2010', 0.28, 5.25, 1.18, 0.16, 0.08, 0.04);
  for (let i = 0; i < 5; i++) b.cone(dark, Math.cos(i * 1.25) * 1.3, 0.4, Math.sin(i * 1.25) * 1.3, 0.35, 1.2, 4, 0, 0, Math.cos(i * 1.25) * 0.4);
  const arm = () => {
    const a = new GeoBuilder();
    a.cyl(dark, 0, -1.2, 0, 0.32, 0.22, 2.4, 6);
    a.cyl(flesh, 0, -3.1, 0.1, 0.22, 0.16, 1.8, 6);
    for (let i = -1; i <= 1; i++) a.cone(bone, i * 0.12, -4.2, 0.2, 0.06, 0.6, 4, Math.PI, 0, 0);
    return a.build();
  };
  const group = new THREE.Group();
  const body = new THREE.Mesh(b.build(), MAT.solid); body.castShadow = true;
  group.add(body);
  group.add(new THREE.Mesh(e.build(), MAT.bossEyes));
  const arms = [];
  const pos = [[-1.5, 4.0, 0.2], [1.5, 4.0, 0.2], [-1.2, 3.0, 0.5], [1.2, 3.0, 0.5]];
  for (const [x, y, z] of pos) {
    const piv = new THREE.Group(); piv.position.set(x, y, z);
    const m = new THREE.Mesh(arm(), MAT.solid); m.castShadow = true;
    piv.add(m); piv.rotation.z = x < 0 ? -0.3 : 0.3;
    group.add(piv); arms.push(piv);
  }
  return { group, arms, body };
}
