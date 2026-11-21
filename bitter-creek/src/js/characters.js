// Модели персонажей: люди, демоны-«Пустые», Голодный.
// Скелет из жёстких частей: тело; плечо → предплечье; бедро → голень. Гладкие формы, реалистичные пропорции.
import * as THREE from 'three';
import { GeoBuilder, MAT, SURF, shade, mixColor } from './models.js';

const DEF = {
  skin: '#c99a78', hair: '#3a2a1e', hairStyle: 'short', beard: 'none',
  hat: 'cowboy', hatColor: '#3b2f25', band: '#1e1814',
  shirt: '#c9bfa8', vest: null, coat: null, coatLong: false,
  pants: '#4a4038', boots: '#2a1f18', skirt: null, apron: null,
  h: 1, w: 1, badge: false, glasses: false, collar: false, bandana: null,
  holster: false, bag: false, tie: null, chain: false, scar: false,
};
const COLOR_KEYS = ['hair', 'hatColor', 'band', 'shirt', 'vest', 'coat', 'pants', 'boots', 'skirt', 'apron', 'bandana', 'tie'];
const PI = Math.PI;

export function buildParts(lookIn, demon = false) {
  const L = Object.assign({}, DEF, lookIn);
  if (demon) {
    for (const k of COLOR_KEYS) if (L[k]) L[k] = shade(mixColor(L[k], '#2a1414', 0.35), 0.42);
    L.skin = '#2c1d1f';
  }
  const W = L.w;
  const legS = demon ? 1.18 : 1, armS = demon ? 1.45 : 1;
  const off = 0.96 * (legS - 1);
  const Y = (y) => y + off;
  const F = SURF.CHAR;
  const b = new GeoBuilder(F), eyes = new GeoBuilder(F);
  const skinD = shade(L.skin, 0.82);
  const female = !!L.skirt;
  const shirt = female ? L.skirt : L.shirt;
  const sleeve = L.coat || shirt;
  const kz = 0.64; // сплющенность торса спереди-назад

  // ---- торс ----
  if (!female) {
    b.ecyl(L.pants, 0, Y(0.96), 0, 0.15 * W, 0.15 * W, 0.16, 0.74, 16);
    b.ecyl('#2a1d14', 0, Y(1.01), 0, 0.158 * W, 0.158 * W, 0.055, 0.75, 16);
    b.box('#c9a43a', 0, Y(1.01), 0.158 * W * 0.75 + 0.004, 0.06, 0.045, 0.012);
  }
  b.ecyl(shirt, 0, Y(1.21), 0, 0.19 * W, 0.152 * W, 0.38, kz, 16);
  b.ecyl(shirt, 0, Y(1.43), 0, 0.12, 0.192 * W, 0.08, kz, 16);
  const zf = (r) => r * kz; // передняя точка эллипса
  if (L.vest) {
    b.ecyl(L.vest, 0, Y(1.215), 0, 0.197 * W, 0.16 * W, 0.37, kz + 0.02, 16);
    b.box(shirt, 0, Y(1.27), zf(0.19 * W) + 0.012, 0.07, 0.3, 0.012);
    for (let i = 0; i < 4; i++) b.sph('#d8c898', 0.045, Y(1.1 + i * 0.075), zf(0.19 * W) + 0.012, 0.009, 0.009, 0.006, 6);
  }
  if (L.tie) b.box(L.tie, 0, Y(1.3), zf(0.19 * W) + 0.022, 0.045, 0.2, 0.012);
  if (L.chain) b.box('#d8b64a', 0.06, Y(1.12), zf(0.2 * W) + 0.02, 0.12, 0.008, 0.008, 0, 0, 0.3);
  if (L.coat) {
    const C = L.coat;
    b.ecyl(C, 0, Y(1.2), 0, 0.205 * W, 0.17 * W, 0.4, kz + 0.04, 16);
    b.ecyl(C, 0, Y(1.425), 0, 0.13, 0.208 * W, 0.09, kz + 0.04, 16);
    // распахнутый перёд: полоса рубашки/жилета и лацканы
    b.box(L.vest || shirt, 0, Y(1.22), zf(0.205 * W) + 0.012, 0.1, 0.38, 0.012);
    b.box(shade(C, 0.82), -0.065, Y(1.33), zf(0.2 * W) + 0.02, 0.05, 0.17, 0.012, 0, 0, -0.32);
    b.box(shade(C, 0.82), 0.065, Y(1.33), zf(0.2 * W) + 0.02, 0.05, 0.17, 0.012, 0, 0, 0.32);
    b.ecyl(C, 0, Y(1.47), -0.01, 0.075, 0.1, 0.07, 1.0, 12); // воротник
    for (const s of [-1, 1]) {
      b.box(shade(C, 0.78), s * 0.12 * W, Y(1.07), zf(0.17 * W) + 0.022, 0.09, 0.012, 0.02, 0, s * 0.35, 0);
      b.sph('#2a2420', s * 0.07, Y(1.18), zf(0.19 * W) + 0.02, 0.012, 0.012, 0.008, 6);
      b.sph('#2a2420', s * 0.07, Y(1.06), zf(0.175 * W) + 0.02, 0.012, 0.012, 0.008, 6);
    }
    if (L.coatLong) {
      b.box(C, 0, Y(0.68), -0.12 * W, 0.36 * W, 0.66, 0.03, -0.1, 0, 0);
      for (const s of [-1, 1]) {
        b.box(C, s * 0.175 * W, Y(0.7), -0.02, 0.03, 0.64, 0.22 * W, 0, 0, s * 0.09);
        b.box(C, s * 0.14 * W, Y(0.74), 0.08 * W, 0.09, 0.56, 0.025, 0.06, s * 0.35, s * 0.06);
      }
    } else {
      b.ecyl(C, 0, Y(0.95), 0, 0.17 * W, 0.18 * W, 0.12, kz + 0.06, 16);
    }
  }
  if (female) {
    b.cyl(L.skirt, 0, Y(0.53), 0, 0.19 * W, 0.4 * W, 0.98, 20);
    b.ecyl(shade(L.skirt, 0.72), 0, Y(1.03), 0, 0.155 * W, 0.155 * W, 0.05, kz + 0.1, 16);
    b.cyl(shade(L.skirt, 0.85), 0, Y(0.06), 0, 0.4 * W, 0.405 * W, 0.04, 20);
  }
  if (L.apron) b.box(L.apron, 0, Y(female ? 0.66 : 0.78), female ? 0.27 * W : zf(0.17 * W) + 0.02, 0.32, female ? 0.72 : 0.55, 0.012, female ? -0.27 : -0.05, 0, 0);
  if (L.collar) b.box('#f0f0f0', 0, Y(1.48), 0.055, 0.045, 0.04, 0.02);
  else if (!female && !L.bandana) for (const s of [-1, 1]) b.box(L.shirt, s * 0.035, Y(1.47), 0.05, 0.05, 0.035, 0.012, 0.3, 0, s * 0.5);
  if (L.badge) {
    const bz = zf(0.2 * W) + (L.coat ? 0.03 : 0.015);
    b.box('#e0bc48', -0.1, Y(1.3), bz, 0.055, 0.055, 0.008);
    b.box('#e0bc48', -0.1, Y(1.3), bz + 0.002, 0.055, 0.055, 0.008, 0, 0, PI / 4);
  }
  if (L.holster) {
    b.box('#3a2616', 0.17 * W, Y(0.87), 0.03, 0.06, 0.2, 0.09, 0, 0, 0.12);
    b.box('#2b2b2b', 0.175 * W, Y(1.0), 0.0, 0.035, 0.09, 0.05, 0, 0, 0.12);
    b.ecyl('#3a2616', 0, Y(0.98), 0, 0.165 * W, 0.17 * W, 0.045, 0.76, 16);
    for (let i = 0; i < 8; i++) b.cyl('#b8913a', -0.12 + i * 0.03, Y(0.985), 0.125 * W, 0.006, 0.006, 0.03, 4);
  }
  if (L.bag) {
    b.box('#3a2418', -0.22 * W, Y(0.78), 0.05, 0.1, 0.18, 0.28);
    b.box('#c8a868', -0.22 * W, Y(0.86), 0.05, 0.102, 0.02, 0.06);
  }

  // ---- шея и голова ----
  b.cyl(L.skin, 0, Y(1.5), 0, 0.048, 0.056, 0.12, 10);
  const hy = Y(1.64);
  if (!demon) {
    b.sph(L.skin, 0, hy + 0.02, 0, 0.098, 0.118, 0.108, 18);
    b.sph(L.skin, 0, hy - 0.05, 0.018, 0.082, 0.068, 0.088, 14);
    b.sph(skinD, 0, hy - 0.003, 0.105, 0.017, 0.03, 0.022, 8, -0.25);
    b.sph(skinD, 0, hy - 0.02, 0.112, 0.016, 0.014, 0.014, 8);
    for (const s of [-1, 1]) {
      b.sph('#ece4d6', s * 0.038, hy + 0.028, 0.088, 0.018, 0.011, 0.009, 8);
      b.sph('#22160e', s * 0.038, hy + 0.028, 0.096, 0.008, 0.008, 0.004, 6);
      b.box(shade(L.hair, 0.9), s * 0.04, hy + 0.054, 0.096, 0.038, 0.009, 0.012, 0, 0, s * -0.1);
      b.sph(L.skin, s * 0.098, hy + 0.012, -0.005, 0.016, 0.032, 0.024, 8);
      b.sph(shade(L.skin, 0.94), s * 0.055, hy - 0.02, 0.08, 0.025, 0.02, 0.015, 8);
    }
    for (const s of [-1, 1]) {
      b.sph(shade(L.skin, 0.72), s * 0.038, hy + 0.03, 0.082, 0.026, 0.02, 0.012, 8);
      b.sph(shade(L.skin, 1.04), s * 0.06, hy - 0.005, 0.08, 0.028, 0.018, 0.02, 8);
      if (!female && L.hairStyle !== 'bald') b.box(L.hair, s * 0.096, hy - 0.005, 0.02, 0.012, 0.06, 0.03);
    }
    b.sph('#8a4a3e', 0, hy - 0.055, 0.098, 0.028, 0.008, 0.01, 8);
    b.sph('#7a3e34', 0, hy - 0.064, 0.096, 0.024, 0.007, 0.01, 8);
    b.sph(shade(L.skin, 0.88), 0, hy - 0.088, 0.085, 0.03, 0.016, 0.02, 8);
    if (L.scar) b.box('#8a4a40', 0.055, hy, 0.088, 0.008, 0.07, 0.008, 0, 0, 0.4);
  } else {
    b.sph(L.skin, 0, hy + 0.05, 0, 0.09, 0.16, 0.1, 16);
    b.sph('#1a0807', 0, hy - 0.06, 0.04, 0.07, 0.09, 0.07, 12);
    b.sph('#4a0a08', 0, hy - 0.07, 0.06, 0.05, 0.06, 0.05, 10);
    for (let i = -2; i <= 2; i++) { b.cone('#d8d0c0', i * 0.018, hy - 0.03, 0.095, 0.006, 0.03, 4, PI); b.cone('#d8d0c0', i * 0.018, hy - 0.11, 0.09, 0.006, 0.03, 4); }
    for (const s of [-1, 1]) eyes.sph('#ff3a1c', s * 0.035, hy + 0.06, 0.085, 0.022, 0.012, 0.012, 8);
  }
  const hh = demon ? 0.05 : 0;
  if (L.hairStyle !== 'none') {
    if (L.hairStyle !== 'bald') b.hemi(L.hair, 0, hy + 0.035 + hh, -0.006, 0.104, 0.1, 0.114, -0.3);
    b.sph(L.hair, 0, hy + 0.005 + hh, -0.045, 0.1, 0.11, 0.075, 12);
    for (const s of [-1, 1]) b.sph(L.hair, s * 0.09, hy + 0.035 + hh, -0.02, 0.022, 0.05, 0.07, 8);
    if (L.hairStyle === 'long') {
      b.sph(L.hair, 0, hy - 0.12, -0.065, 0.11, 0.18, 0.06, 12);
      for (const s of [-1, 1]) b.sph(L.hair, s * 0.095, hy - 0.06, -0.01, 0.03, 0.12, 0.06, 8);
    }
    if (L.hairStyle === 'bun') b.sph(L.hair, 0, hy + 0.06 + hh, -0.12, 0.06, 0.055, 0.05, 10);
  }
  if (!demon) {
    const H = L.hair;
    if (L.beard === 'mustache') for (const s of [-1, 1]) b.box(H, s * 0.022, hy - 0.035, 0.103, 0.045, 0.014, 0.014, 0, 0, s * -0.25);
    if (L.beard === 'full') { b.sph(H, 0, hy - 0.068, 0.03, 0.09, 0.075, 0.088, 12); for (const s of [-1, 1]) b.box(H, s * 0.022, hy - 0.035, 0.105, 0.045, 0.014, 0.014, 0, 0, s * -0.25); }
    if (L.beard === 'long') { b.sph(H, 0, hy - 0.07, 0.03, 0.09, 0.08, 0.088, 12); b.sph(H, 0, hy - 0.16, 0.06, 0.07, 0.12, 0.05, 10); }
    if (L.beard === 'stubble') b.sph(shade(L.skin, 0.74), 0, hy - 0.052, 0.016, 0.085, 0.07, 0.091, 12);
    if (L.glasses) {
      for (const s of [-1, 1]) b.cyl('#1a1a1a', s * 0.038, hy + 0.028, 0.104, 0.024, 0.024, 0.006, 12, PI / 2);
      b.box('#1a1a1a', 0, hy + 0.03, 0.105, 0.03, 0.006, 0.006);
    }
  }
  if (L.bandana) {
    b.cyl(L.bandana, 0, Y(1.49), 0, 0.075, 0.085, 0.06, 12);
    b.prism(L.bandana, 0, Y(1.36), 0.075, 0.12, 0.12, 0.02);
  }
  // шляпы
  const ht = hy + 0.105 + hh, HC = L.hatColor;
  switch (L.hat) {
    case 'cowboy':
      b.ecyl(HC, 0, ht, 0, 0.28, 0.28, 0.014, 1.12, 24);
      for (const s of [-1, 1]) b.box(HC, s * 0.255, ht + 0.03, 0, 0.06, 0.012, 0.44, 0, 0, s * -0.6);
      b.ecyl(HC, 0, ht + 0.075, 0, 0.1, 0.122, 0.14, 1.12, 18);
      b.box(shade(HC, 0.75), 0, ht + 0.145, 0, 0.025, 0.012, 0.16);
      b.ecyl(L.band, 0, ht + 0.025, 0, 0.123, 0.123, 0.028, 1.12, 18);
      break;
    case 'straw':
      b.cyl(HC, 0, ht, 0, 0.34, 0.34, 0.014, 24);
      b.cyl(HC, 0, ht + 0.065, 0, 0.11, 0.125, 0.12, 18);
      b.cyl('#7a3a24', 0, ht + 0.025, 0, 0.126, 0.126, 0.026, 18);
      break;
    case 'bowler':
      b.cyl(HC, 0, ht - 0.01, 0, 0.17, 0.17, 0.012, 22);
      b.hemi(HC, 0, ht + 0.02, 0, 0.115, 0.12, 0.125);
      b.cyl(L.band, 0, ht + 0.012, 0, 0.117, 0.117, 0.024, 18);
      break;
    case 'top':
      b.cyl(HC, 0, ht - 0.01, 0, 0.18, 0.18, 0.012, 22);
      b.ecyl(HC, 0, ht + 0.13, 0, 0.108, 0.104, 0.26, 1.1, 18);
      b.ecyl(L.band, 0, ht + 0.02, 0, 0.106, 0.106, 0.035, 1.1, 18);
      break;
    case 'flat':
      b.cyl(HC, 0, ht, 0, 0.27, 0.27, 0.014, 24);
      b.cyl(HC, 0, ht + 0.04, 0, 0.11, 0.118, 0.07, 18);
      break;
    case 'cap':
      b.hemi(HC, 0, ht - 0.03, 0, 0.112, 0.08, 0.12);
      b.box(HC, 0, ht - 0.035, 0.13, 0.15, 0.012, 0.09, 0.1);
      break;
    case 'visor':
      b.box('#3d6b4a', 0, ht - 0.03, 0.12, 0.17, 0.008, 0.12, -0.2);
      b.cyl('#3d6b4a', 0, ht - 0.03, 0, 0.112, 0.112, 0.02, 16);
      break;
    case 'bonnet':
      b.hemi(HC, 0, hy + 0.01, -0.02, 0.125, 0.15, 0.13, -0.5);
      b.ecyl(HC, 0, hy + 0.04, 0.06, 0.15, 0.15, 0.03, 1, 16, PI / 2 - 0.4);
      b.box(shade(HC, 0.8), 0, hy - 0.1, 0.06, 0.02, 0.1, 0.01);
      break;
    case 'feather':
      b.cyl(HC, 0.02, ht - 0.03, 0, 0.08, 0.09, 0.05, 14);
      b.sph('#1a1a1a', 0.06, ht + 0.08, -0.03, 0.02, 0.15, 0.03, 8, -0.3, 0, -0.2);
      break;
  }

  // ---- руки: плечо и предплечье с кистью ----
  const upper = () => {
    const a = new GeoBuilder(F);
    a.sph(sleeve, 0, 0, 0, 0.062 * W, 0.062 * W, 0.062 * W, 10);
    a.cyl(sleeve, 0, -0.145, 0, 0.056 * W, 0.047 * W, 0.29, 12);
    const g = a.build(); g.scale(1, armS, 1); return g;
  };
  const fore = (right) => {
    const a = new GeoBuilder(F);
    a.sph(sleeve, 0, 0, 0, 0.049 * W, 0.049 * W, 0.049 * W, 10);
    a.cyl(sleeve, 0, -0.125, 0, 0.047 * W, 0.04 * W, 0.25, 12);
    a.cyl(L.coat ? shade(L.coat, 0.85) : shirt, 0, -0.245, 0, 0.042 * W, 0.044 * W, 0.03, 12);
    a.box(L.skin, 0, -0.3, 0.004, 0.056, 0.07, 0.03);
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.0135;
      a.box(L.skin, fx, -0.348, 0.008, 0.012, 0.035, 0.016, 0.25);
      a.box(skinD, fx, -0.374, 0.018, 0.011, 0.025, 0.014, 0.9);
    }
    a.box(L.skin, right ? -0.032 : 0.032, -0.3, 0.02, 0.016, 0.045, 0.018, 0.3, 0, right ? 0.5 : -0.5);
    if (demon) for (let i = -1; i <= 1; i++) a.cone('#121010', i * 0.018, -0.4, 0.015, 0.009, 0.1, 4, PI);
    const g = a.build(); g.scale(1, armS, 1); return g;
  };
  // ---- ноги: бедро и голень с сапогом ----
  const thigh = () => {
    const l = new GeoBuilder(F);
    const c = female ? '#2a2222' : L.pants;
    l.sph(c, 0, 0, 0, 0.076 * W, 0.07, 0.076 * W, 10);
    l.cyl(c, 0, -0.22, 0, 0.076 * W, 0.058 * W, 0.45, 12);
    const g = l.build(); g.scale(1, legS, 1); return g;
  };
  const shin = () => {
    const l = new GeoBuilder(F);
    const c = female ? '#2a2222' : L.pants;
    l.sph(c, 0, 0, 0, 0.058 * W, 0.058 * W, 0.058 * W, 10);
    l.cyl(c, 0, -0.14, 0, 0.057 * W, 0.05 * W, 0.26, 12);
    l.cyl(L.boots, 0, -0.33, 0, 0.062, 0.056, 0.22, 12);
    l.cyl(shade(L.boots, 1.2), 0, -0.225, 0, 0.064, 0.064, 0.02, 12);
    l.box(L.boots, 0, -0.44, 0.045, 0.085, 0.07, 0.22);
    l.sph(L.boots, 0, -0.442, 0.15, 0.043, 0.036, 0.05, 10);
    l.box(shade(L.boots, 0.6), 0, -0.47, -0.04, 0.07, 0.04, 0.06);
    l.box(shade(L.boots, 0.6), 0, -0.476, 0.06, 0.088, 0.012, 0.2);
    if (L.holster) { l.box('#9a9080', 0, -0.43, -0.09, 0.012, 0.012, 0.06); l.cyl('#b8b0a0', 0, -0.43, -0.125, 0.022, 0.022, 0.006, 8, 0, 0, Math.PI / 2); }
    const g = l.build(); g.scale(1, legS, 1); return g;
  };
  return {
    body: b.build(), upperL: upper(), upperR: upper(), foreL: fore(false), foreR: fore(true),
    thighL: thigh(), thighR: thigh(), shinL: shin(), shinR: shin(),
    eyes: eyes.empty ? null : eyes.build(),
    sx: 0.205 * W, sy: Y(1.42), elbow: -0.29 * armS, hx: 0.092 * W, hy: Y(0.96), knee: -0.45 * legS, female,
  };
}

const blobGeo = new THREE.CircleGeometry(0.55, 16).rotateX(-PI / 2);

export class Character {
  constructor(look, opts = {}) {
    this.demon = !!opts.demon;
    const P = buildParts(look, this.demon);
    this.group = new THREE.Group();
    this.root = new THREE.Group();
    this.group.add(this.root);
    const s = (look.h || 1) * (this.demon ? 1.08 : 1);
    this.root.scale.setScalar(s);
    const mk = (geo, parent, mat = MAT.solid) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; parent.add(m); return m; };
    this.body = mk(P.body, this.root);
    const limb = (geoA, geoB, x, y, joint) => {
      const a = new THREE.Group(); a.position.set(x, y, 0); mk(geoA, a);
      const b = new THREE.Group(); b.position.set(0, joint, 0); mk(geoB, b); a.add(b);
      this.root.add(a); return [a, b];
    };
    [this.armL, this.elbowL] = limb(P.upperL, P.foreL, -P.sx, P.sy, P.elbow);
    [this.armR, this.elbowR] = limb(P.upperR, P.foreR, P.sx, P.sy, P.elbow);
    [this.legL, this.kneeL] = limb(P.thighL, P.shinL, -P.hx, P.hy, P.knee);
    [this.legR, this.kneeR] = limb(P.thighR, P.shinR, P.hx, P.hy, P.knee);
    this.hipY = P.hy;
    if (P.eyes) this.root.add(new THREE.Mesh(P.eyes, MAT.eyes));
    if (opts.gun) {
      const gb = new GeoBuilder(SURF.FINE);
      gb.cyl('#2a2a2c', 0, -0.42, 0.035, 0.012, 0.012, 0.2, 8);
      gb.cyl('#3a3a3c', 0, -0.36, 0.035, 0.024, 0.024, 0.05, 8);
      gb.box('#2a2a2c', 0, -0.33, 0.03, 0.025, 0.06, 0.05);
      gb.box('#5a3a22', 0, -0.31, -0.005, 0.03, 0.05, 0.035, -0.4);
      this.gun = new THREE.Mesh(gb.build(), MAT.solid);
      this.gun.visible = false;
      this.elbowR.add(this.gun);
    }
    this.blob = new THREE.Mesh(blobGeo, MAT.blob);
    this.blob.renderOrder = 1;
    this.group.add(this.blob);
    this.phase = Math.random() * 6; this.t = Math.random() * 10;
    this.pose = 'idle'; this.poseT = 0; this.deadT = 0;
  }
  setPose(p, dur = 0) { this.pose = p; this.poseT = dur; }
  setLimbs(ua, ea, ub, eb, tl, kl, tr, kr) {
    this.armL.rotation.x = ua; this.elbowL.rotation.x = ea;
    this.armR.rotation.x = ub; this.elbowR.rotation.x = eb;
    this.legL.rotation.x = tl; this.kneeL.rotation.x = kl;
    this.legR.rotation.x = tr; this.kneeR.rotation.x = kr;
  }
  update(dt, speed) {
    this.t += dt;
    if (this.poseT > 0) { this.poseT -= dt; if (this.poseT <= 0) this.pose = 'idle'; }
    const r = this.root, p = this.pose;
    if (this.gun) this.gun.visible = (p === 'aim' || p === 'rideAim');
    this.armL.rotation.z = 0; this.armR.rotation.z = 0; this.legL.rotation.z = 0; this.legR.rotation.z = 0;
    if (p === 'dead' || p === 'downed') {
      this.deadT = Math.min(1, this.deadT + dt * 3);
      const e = 1 - Math.pow(1 - this.deadT, 3);
      r.rotation.x = -PI / 2 * e * (p === 'downed' ? 0.92 : 1);
      r.position.y = 0.14 * e;
      this.setLimbs(-2.6 * e, -0.3, -2.2 * e, -0.6, 0.15, 0.3, -0.1, 0.5);
      this.armL.rotation.z = -0.3 * e; this.armR.rotation.z = 0.4 * e;
      this.blob.visible = false;
      return;
    }
    this.deadT = 0; this.blob.visible = true;
    r.rotation.x = this.demon ? 0.3 : 0;
    r.position.y = 0;
    if (p === 'ride' || p === 'rideAim') {
      this.blob.visible = false;
      const b = Math.sin(this.t * 2) * 0.03;
      this.setLimbs(-0.5, -0.9 + b, p === 'rideAim' ? -PI / 2 : -0.5, p === 'rideAim' ? 0 : -0.9 - b, -1.3, 1.45, -1.3, 1.45);
      this.legL.rotation.z = -0.32; this.legR.rotation.z = 0.32;
      return;
    }
    this.phase += dt * speed * (this.demon ? 1.5 : 2.2);
    const sw = Math.min(speed / 4.5, 1.3) * 0.62;
    const ph = this.phase, sn = Math.sin(ph);
    let ua = -sn * sw * 0.85, ub = sn * sw * 0.85;
    let ea = -0.2 - Math.max(0, sn) * sw * 0.6, eb = -0.2 - Math.max(0, -sn) * sw * 0.6;
    let tl = sn * sw, tr = -sn * sw;
    let kl = Math.max(0, Math.sin(ph - 1.3)) * sw * 1.5, kr = Math.max(0, Math.sin(ph - 1.3 + PI)) * sw * 1.5;
    r.position.y = Math.abs(Math.cos(ph)) * 0.04 * sw - (sw > 0.6 ? 0.03 : 0);
    if (sw > 0.65) r.rotation.x += 0.08;
    if (speed < 0.15) { ua = Math.sin(this.t * 1.6) * 0.03; ub = -ua; ea = eb = -0.12; tl = tr = kl = kr = 0; r.position.y = Math.sin(this.t * 1.6) * 0.004; }
    switch (p) {
      case 'aim': ub = -PI / 2 + 0.05; eb = 0; ua = Math.min(ua, -0.3); ea = -0.6; break;
      case 'punch': ub = -1.7; eb = -0.05; ua = 0.2; ea = -1.4; break;
      case 'claw': ua = ub = -1.4 + Math.sin(this.t * 18) * 0.3; ea = eb = -0.4; break;
      case 'drag': ua = ub = -1.0; ea = eb = -0.3; break;
      case 'carried': r.rotation.x = -1.2; r.position.y = 0.45; ua = ub = -2.7; ea = eb = 0; tl = tr = 0.15; kl = kr = 0.3; break;
      case 'talk': ub = -0.45 + Math.sin(this.t * 3) * 0.15; eb = -1.0 + Math.sin(this.t * 2.3) * 0.2; break;
      case 'surrender': ua = ub = -2.9; ea = eb = -0.35; this.armL.rotation.z = -0.25; this.armR.rotation.z = 0.25; break;
      case 'mourn': r.rotation.x = 0.22; ua = ub = -0.45; ea = eb = -1.2; break;
      case 'drink': ub = -1.2; eb = -1.6; break;
    }
    if (this.demon && p !== 'claw' && p !== 'drag') { ua -= 0.35; ub -= 0.35; ea -= 0.3; eb -= 0.3; }
    this.setLimbs(ua, ea, ub, eb, tl, kl, tr, kr);
  }
  dispose(scene) {
    scene.remove(this.group);
    this.group.traverse(o => { if (o.isMesh && o.geometry !== blobGeo) o.geometry.dispose(); });
  }
}

// Голодный — финальное чудовище
export function buildBoss() {
  const b = new GeoBuilder(SURF.FINE), e = new GeoBuilder(SURF.FINE);
  const dark = '#1b1213', flesh = '#3a1e1e', bone = '#cfc3a8';
  b.cyl(dark, 0, 1.6, 0, 1.0, 1.5, 3.2, 14);
  b.sph(flesh, 0, 3.6, 0.1, 1.5, 1.3, 1.2, 18);
  b.sph(dark, 0, 5.0, 0.4, 0.9, 1.1, 0.9, 16);
  for (let i = 0; i < 9; i++) b.sph(i % 2 ? flesh : '#2a1616', Math.sin(i * 2.1) * 1.1, 2.6 + (i % 4) * 0.6, Math.cos(i * 1.7) * 0.8, 0.5, 0.4, 0.45, 10);
  b.sph('#2a0606', 0, 4.6, 1.15, 0.45, 0.32, 0.12, 12);
  for (let i = -3; i <= 3; i++) b.cone(bone, i * 0.12, 4.86, 1.2, 0.04, 0.2, 6, PI, 0, 0);
  for (let i = -3; i <= 3; i++) b.cone(bone, i * 0.12, 4.35, 1.2, 0.04, 0.2, 6, 0, 0, 0);
  // рога
  for (const s of [-1, 1]) {
    b.limb(bone, s * 0.3, 5.6, 0.3, s * 0.85, 6.6, 0.1, 0.13, 0.07, 8);
    b.limb(bone, s * 0.85, 6.6, 0.1, s * 1.5, 7.0, 0.0, 0.07, 0.03, 8);
    b.limb(bone, s * 0.7, 6.4, 0.15, s * 0.8, 7.3, 0.3, 0.05, 0.02, 8);
  }
  // лица-маски, вросшие в тело
  const masks = [[-0.7, 3.4, 1.1], [0.8, 3.9, 1.0], [0.0, 2.6, 1.35], [-0.5, 4.3, 0.9], [0.6, 2.9, 1.2], [-1.1, 2.4, 0.8], [1.2, 3.1, 0.6]];
  for (const [x, y, z] of masks) {
    b.sph('#b8a48e', x, y, z, 0.15, 0.2, 0.06, 12);
    e.sph('#ff2010', x - 0.055, y + 0.04, z + 0.05, 0.025, 0.014, 0.01, 6);
    e.sph('#ff2010', x + 0.055, y + 0.04, z + 0.05, 0.025, 0.014, 0.01, 6);
    b.box('#2a0a08', x, y - 0.08, z + 0.05, 0.08, 0.02, 0.01);
  }
  e.sph('#ff2010', -0.28, 5.25, 1.18, 0.09, 0.045, 0.03, 8);
  e.sph('#ff2010', 0.28, 5.25, 1.18, 0.09, 0.045, 0.03, 8);
  for (let i = 0; i < 7; i++) b.limb(dark, Math.cos(i * 0.9) * 0.9, 1.2, Math.sin(i * 0.9) * 0.9, Math.cos(i * 0.9) * 2.0, 0, Math.sin(i * 0.9) * 2.0, 0.3, 0.08, 8);
  const arm = () => {
    const a = new GeoBuilder(SURF.FINE);
    a.sph(dark, 0, 0, 0, 0.36, 0.36, 0.36, 10);
    a.cyl(dark, 0, -1.2, 0, 0.32, 0.22, 2.4, 10);
    a.sph(flesh, 0, -2.4, 0, 0.24, 0.24, 0.24, 10);
    a.cyl(flesh, 0, -3.1, 0.1, 0.22, 0.16, 1.8, 10);
    for (let i = -1; i <= 1; i++) a.cone(bone, i * 0.12, -4.2, 0.2, 0.06, 0.6, 6, PI, 0, 0);
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
