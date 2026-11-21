// Персонажи в стиле «мало полигонов + нарисованная текстура» (как в играх эпохи PS1/PS2).
// Геометрия — простые тела вращения и цилиндры с UV; все детали (лицо, складки, пуговицы, ремни)
// процедурно «рисуются» на атласе 512×512 для каждого персонажа.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from './util.js';

const S = 512;
const R = {
  head: [0, 0, 256, 128], torso: [256, 0, 256, 160], skirt: [0, 128, 256, 128],
  uarm: [256, 160, 128, 64], farm: [384, 160, 128, 64], thigh: [256, 224, 128, 96], shin: [384, 224, 128, 112],
  hatc: [0, 256, 192, 64], hatb: [192, 256, 64, 64], hand: [256, 320, 64, 48], foot: [320, 320, 64, 48],
  pelvis: [384, 336, 128, 48], leather: [448, 384, 64, 48], hair: [0, 320, 128, 96], skin: [128, 320, 32, 32],
};
const PI = Math.PI;

const DEF = {
  skin: '#c99a78', hair: '#3a2a1e', hairStyle: 'short', beard: 'none', hat: 'cowboy', hatColor: '#3b2f25', band: '#1e1814',
  shirt: '#c9bfa8', vest: null, coat: null, coatLong: false, pants: '#4a4038', boots: '#2a1f18', skirt: null, apron: null,
  h: 1, w: 1, badge: false, glasses: false, collar: false, bandana: null, holster: false, bag: false, tie: null, chain: false, scar: false,
};

// ---------- цвет ----------
function hex2rgb(h) { const c = new THREE.Color(h); return [c.r, c.g, c.b].map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255)); }
function shadeC(h, f, warm = 0) {
  const [r, g, b] = hex2rgb(h);
  const k = (v, w) => Math.max(0, Math.min(255, Math.round(v * f + w)));
  return `rgb(${k(r, warm * 6)},${k(g, warm * 2)},${k(b, -warm * 6)})`;
}
const rgba = (h, a) => { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; };

// ---------- художник по области атласа ----------
// координаты: a — метры по окружности от центра «лица» области (+ к правому боку), y — метры от низа детали
class Area {
  constructor(ctx, rect, C, H, rnd) { this.c = ctx; this.r = rect; this.C = C; this.H = H; this.rnd = rnd; }
  begin() {
    const [x, y, w, h] = this.r, c = this.c;
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.setTransform(w / this.C, 0, 0, -h / this.H, x + w / 2, y + h);
    return this;
  }
  end() { this.c.restore(); }
  fill(col) { this.c.fillStyle = col; this.c.fillRect(-this.C, -0.1, this.C * 2, this.H + 0.2); return this; }
  rect(a, y, w, h, col) { this.c.fillStyle = col; this.c.fillRect(a, y, w, h); }
  poly(pts, col) { const c = this.c; c.fillStyle = col; c.beginPath(); pts.forEach(([a, y], i) => (i ? c.lineTo(a, y) : c.moveTo(a, y))); c.closePath(); c.fill(); }
  ell(a, y, rx, ry, col, rot = 0) { const c = this.c; c.fillStyle = col; c.beginPath(); c.ellipse(a, y, Math.abs(rx), Math.abs(ry), rot, 0, PI * 2); c.fill(); }
  // мазки кистью: живописный шум
  strokes(n, col, len, thick, y0 = 0, y1 = this.H, vertical = false, alpha = 0.12) {
    const c = this.c; c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      c.globalAlpha = alpha * (0.4 + this.rnd());
      const a = (this.rnd() - 0.5) * this.C, y = y0 + this.rnd() * (y1 - y0), l = len * (0.5 + this.rnd());
      c.save(); c.translate(a, y); c.rotate(vertical ? PI / 2 + (this.rnd() - 0.5) * 0.4 : (this.rnd() - 0.5) * 0.5);
      c.fillRect(-l / 2, -thick / 2, l, thick); c.restore();
    }
    c.globalAlpha = 1;
  }
  // объём: тень по бокам и на спине, блик спереди слева
  volume(dark = 0.42, light = 0.1) {
    const c = this.c, C = this.C;
    const g = c.createLinearGradient(-C / 2, 0, C / 2, 0);
    g.addColorStop(0, `rgba(10,6,4,${dark})`); g.addColorStop(0.22, `rgba(10,6,4,${dark * 0.55})`);
    g.addColorStop(0.4, 'rgba(10,6,4,0)'); g.addColorStop(0.58, 'rgba(10,6,4,0.04)');
    g.addColorStop(0.78, `rgba(10,6,4,${dark * 0.6})`); g.addColorStop(1, `rgba(10,6,4,${dark})`);
    c.fillStyle = g; c.fillRect(-C, -0.1, C * 2, this.H + 0.2);
    const h = c.createLinearGradient(-C * 0.2, 0, C * 0.05, 0);
    h.addColorStop(0, 'rgba(255,236,210,0)'); h.addColorStop(0.5, `rgba(255,236,210,${light})`); h.addColorStop(1, 'rgba(255,236,210,0)');
    c.fillStyle = h; c.fillRect(-C, -0.1, C * 2, this.H + 0.2);
  }
  vgrad(y0, y1, a0, a1) {
    const c = this.c, g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgba(10,6,4,${a0})`); g.addColorStop(1, `rgba(10,6,4,${a1})`);
    c.fillStyle = g; c.fillRect(-this.C, Math.min(y0, y1), this.C * 2, Math.abs(y1 - y0));
  }
  fold(a, y, len, ang, w, col = 'rgba(10,6,4,0.35)', hi = 'rgba(255,240,220,0.12)') {
    const c = this.c;
    c.save(); c.translate(a, y); c.rotate(ang);
    c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, len * 0.5); c.lineTo(0, len); c.lineTo(w * 0.3, len * 0.5); c.closePath(); c.fill();
    c.fillStyle = hi; c.beginPath(); c.moveTo(w * 0.35, 0.002); c.lineTo(w * 1.6, len * 0.5); c.lineTo(w * 0.35, len); c.lineTo(w * 1.0, len * 0.5); c.closePath(); c.fill();
    c.restore();
  }
}

// ---------- живопись деталей ----------
function paintHead(ctx, L, rnd, demon) {
  const A = new Area(ctx, R.head, 0.66, 0.252, rnd).begin();
  const skin = L.skin, hair = L.hair;
  A.fill(shadeC(skin, 1.0));
  A.strokes(60, shadeC(skin, 1.12, 1), 0.02, 0.006, 0, 0.25, false, 0.1);
  A.strokes(40, shadeC(skin, 0.85), 0.02, 0.005, 0, 0.25, false, 0.1);
  // скулы, глазницы, подбородок
  A.ell(-0.058, 0.1, 0.026, 0.02, rgba(L.female ? '#d86a6a' : '#a0503a', L.female ? 0.12 : 0.08));
  A.ell(0.058, 0.1, 0.026, 0.02, rgba(L.female ? '#d86a6a' : '#a0503a', L.female ? 0.12 : 0.08));
  A.ell(-0.034, 0.134, 0.026, 0.014, rgba('#3a1a10', 0.22)); A.ell(0.034, 0.134, 0.026, 0.014, rgba('#3a1a10', 0.22));
  A.vgrad(0, 0.035, 0.45, 0);
  A.ell(0, 0.022, 0.03, 0.012, 'rgba(255,230,200,0.12)');
  // уши
  for (const s of [-1, 1]) { A.ell(s * 0.165, 0.12, 0.018, 0.028, shadeC(skin, 0.82)); A.ell(s * 0.165, 0.12, 0.009, 0.018, shadeC(skin, 0.62)); }
  if (demon) {
    A.fill(shadeC('#2c1d1f', 1));
    A.strokes(80, '#120808', 0.03, 0.006, 0, 0.25, true, 0.3);
    A.ell(0, 0.05, 0.045, 0.035, '#140404'); A.ell(0, 0.048, 0.036, 0.026, '#5a0a08');
    for (let i = -3; i <= 3; i++) { A.poly([[i * 0.011 - 0.004, 0.075], [i * 0.011 + 0.004, 0.075], [i * 0.011, 0.06]], '#d8d0c0'); A.poly([[i * 0.011 - 0.004, 0.022], [i * 0.011 + 0.004, 0.022], [i * 0.011, 0.036]], '#d8d0c0'); }
    for (const s of [-1, 1]) { A.ell(s * 0.034, 0.14, 0.02, 0.011, '#ff3018'); A.ell(s * 0.034, 0.14, 0.008, 0.008, '#ffe060'); }
  } else {
    // глаза
    for (const s of [-1, 1]) {
      const a = s * 0.037, y = 0.134;
      A.ell(a, y, 0.0195, 0.0098, '#ece2d2');
      A.ell(a + s * -0.002, y - 0.0005, 0.0088, 0.0088, L.eyeColor || '#3a2616');
      A.ell(a + s * -0.002, y - 0.0005, 0.003, 0.003, '#0a0604');
      A.ell(a + s * -0.004, y + 0.002, 0.0016, 0.0016, 'rgba(255,255,255,0.9)');
      A.poly([[a - 0.018, y + 0.001], [a - 0.006, y + 0.0095], [a + 0.012, y + 0.008], [a + 0.019, y + 0.001], [a + 0.012, y + 0.005], [a - 0.006, y + 0.006]], '#1a100a');
      A.poly([[a - 0.014, y - 0.006], [a + 0.014, y - 0.006], [a + 0.01, y - 0.008], [a - 0.01, y - 0.008]], rgba('#3a1a10', 0.45));
      if (L.female) for (let k = 0; k < 3; k++) A.rect(a + s * (0.012 + k * 0.003), y + 0.006 - k * 0.002, s * 0.004, 0.0015, '#1a100a');
      // брови
      const bw = 0.03, by = 0.152 + (L.browUp || 0);
      A.poly([[a - s * 0.019, by + 0.0], [a, by + 0.005], [a + s * 0.018, by + 0.002], [a + s * 0.017, by - 0.002], [a, by + 0.0], [a - s * 0.018, by - 0.004]], shadeC(hair, 0.75));
    }
    // нос
    A.poly([[0.004, 0.125], [0.013, 0.09], [0.006, 0.084], [0.002, 0.095]], rgba('#3a1a10', 0.16));
    A.ell(0, 0.084, 0.013, 0.007, rgba('#3a1a10', 0.2));
    A.ell(-0.007, 0.082, 0.0035, 0.0022, '#2a1208'); A.ell(0.007, 0.082, 0.0035, 0.0022, '#2a1208');
    A.ell(-0.003, 0.097, 0.004, 0.012, 'rgba(255,235,210,0.25)');
    // рот
    const lip = L.female ? '#9a3a36' : shadeC(skin, 0.7);
    A.poly([[-0.022, 0.058], [-0.008, 0.0615], [0, 0.0605], [0.008, 0.0615], [0.022, 0.058], [0, 0.0555]], '#3a1810');
    A.ell(0, 0.051, 0.015, 0.0055, lip);
    if (L.female) { A.ell(-0.007, 0.0635, 0.01, 0.0045, shadeC('#9a3a36', 1.05)); A.ell(0.007, 0.0635, 0.01, 0.0045, shadeC('#9a3a36', 1.05)); A.ell(0, 0.049, 0.016, 0.006, '#a8423c'); }
    A.ell(0, 0.044, 0.012, 0.003, 'rgba(255,235,210,0.18)');
    if (L.scar) A.poly([[0.05, 0.16], [0.056, 0.16], [0.04, 0.09], [0.035, 0.092]], '#8a3a30');
    // борода и щетина
    if (L.beard === 'stubble') { A.c.globalAlpha = 0.3; A.poly([[-0.08, 0.1], [-0.06, 0.03], [-0.02, 0.0], [0.02, 0.0], [0.06, 0.03], [0.08, 0.1], [0.04, 0.07], [0.02, 0.075], [-0.02, 0.075], [-0.04, 0.07]], shadeC(hair, 0.9)); A.c.globalAlpha = 1; A.strokes(120, '#1a1008', 0.004, 0.0015, 0.0, 0.08, true, 0.3); }
    if (L.beard === 'mustache' || L.beard === 'full') {
      A.poly([[-0.026, 0.058], [-0.012, 0.072], [0, 0.068], [0.012, 0.072], [0.026, 0.058], [0.02, 0.064], [0, 0.064], [-0.02, 0.064]], shadeC(hair, 0.95));
      A.strokes(20, shadeC(hair, 0.6), 0.008, 0.002, 0.06, 0.07, true, 0.6);
    }
    if (L.beard === 'full' || L.beard === 'long') {
      A.poly([[-0.1, 0.13], [-0.085, 0.04], [-0.04, -0.005], [0.04, -0.005], [0.085, 0.04], [0.1, 0.13], [0.06, 0.08], [0.03, 0.05], [-0.03, 0.05], [-0.06, 0.08]], shadeC(hair, 0.95));
      A.ell(0, 0.054, 0.016, 0.006, '#3a1810');
      A.strokes(80, shadeC(hair, 0.65), 0.012, 0.003, 0.0, 0.1, true, 0.5);
      A.strokes(40, shadeC(hair, 1.3), 0.01, 0.002, 0.0, 0.1, true, 0.4);
    }
    if (L.glasses) for (const s of [-1, 1]) {
      const c = A.c; c.strokeStyle = '#141414'; c.lineWidth = 0.0035; c.beginPath(); c.ellipse(s * 0.034, 0.134, 0.021, 0.013, 0, 0, PI * 2); c.stroke();
      A.rect(-0.012, 0.135, 0.024, 0.003, '#141414');
    }
  }
  // волосы
  const H = shadeC(hair, 1);
  if (L.hairStyle !== 'none' && !demon) {
    if (L.hairStyle === 'bald') {
      for (const s of [-1, 1]) A.poly([[s * 0.12, 0.17], [s * 0.33, 0.17], [s * 0.33, 0.08], [s * 0.15, 0.09]], H);
    } else {
      // затылок и макушка
      const hp = [[-0.33, 0.07], [-0.15, 0.09], [-0.12, 0.165], [-0.09, 0.19], [-0.05, 0.185], [-0.02, 0.2], [0.02, 0.19], [0.06, 0.196], [0.09, 0.185], [0.12, 0.165], [0.15, 0.09], [0.33, 0.07], [0.33, 0.3], [-0.33, 0.3]];
      A.poly(hp, H);
      if (L.hairStyle === 'long') { A.poly([[-0.33, 0.0], [-0.12, 0.0], [-0.1, 0.12], [-0.13, 0.2], [-0.33, 0.2]], H); A.poly([[0.33, 0.0], [0.12, 0.0], [0.1, 0.12], [0.13, 0.2], [0.33, 0.2]], H); }
      const c = A.c; c.save(); c.beginPath(); hp.forEach(([a, y], i) => (i ? c.lineTo(a, y) : c.moveTo(a, y))); c.closePath(); c.clip();
      A.strokes(70, shadeC(hair, 0.6), 0.03, 0.003, 0.05, 0.25, true, 0.5);
      A.strokes(40, shadeC(hair, 1.45), 0.025, 0.002, 0.1, 0.25, true, 0.35);
      c.restore();
    }
  }
  if (!demon && L.hairStyle !== 'none' && L.hairStyle !== 'bald') for (const s of [-1, 1]) A.poly([[s * 0.09, 0.19], [s * 0.125, 0.19], [s * 0.13, 0.1], [s * 0.105, 0.11]], shadeC(hair, 0.9));
  if (!demon) { A.vgrad(0.252, 0.2, 0.25, 0); A.ell(-0.02, 0.16, 0.03, 0.03, 'rgba(255,238,215,0.14)'); }
  if (demon) A.poly([[-0.33, 0.2], [0.33, 0.2], [0.33, 0.3], [-0.33, 0.3]], '#1a1010');
  A.end();
}

function paintTorso(ctx, L, rnd, demon) {
  // торс: y 0 — талия, 0.53 — шея; спереди a=0
  const A = new Area(ctx, R.torso, 1.0, 0.56, rnd).begin();
  const female = !!L.skirt;
  const shirt = female ? L.skirt : L.shirt;
  A.fill(shadeC(shirt, 1));
  A.strokes(80, shadeC(shirt, 1.15, 1), 0.04, 0.006, 0, 0.5, false, 0.12);
  // шея
  A.rect(-0.5, 0.49, 1, 0.1, shadeC(L.skin, 0.9));
  A.vgrad(0.49, 0.53, 0.0, 0.0);
  A.rect(-0.5, 0.485, 1, 0.012, rgba('#1a0a04', 0.35));
  // воротник рубашки
  if (!female) { A.poly([[-0.07, 0.47], [0, 0.42], [-0.015, 0.49], [-0.06, 0.5]], shadeC(shirt, 1.12)); A.poly([[0.07, 0.47], [0, 0.42], [0.015, 0.49], [0.06, 0.5]], shadeC(shirt, 1.05)); }
  else { A.ell(0, 0.48, 0.07, 0.02, shadeC('#efe6d6', 1)); for (let i = -3; i <= 3; i++) A.ell(i * 0.02, 0.465, 0.009, 0.007, '#efe6d6'); }
  // пуговицы рубашки
  for (let i = 0; i < 5; i++) A.ell(0.004, 0.08 + i * 0.075, 0.005, 0.005, shadeC(shirt, 0.7));
  A.rect(-0.003, 0.0, 0.006, 0.44, rgba('#1a0a04', 0.12));
  if (L.tie) { A.poly([[-0.012, 0.45], [0.012, 0.45], [0.02, 0.16], [0, 0.13], [-0.02, 0.16]], shadeC(L.tie, 1)); A.ell(0, 0.45, 0.014, 0.012, shadeC(L.tie, 0.8)); }
  // жилет
  if (L.vest) {
    const V = shadeC(L.vest, 1);
    A.poly([[-0.5, 0], [-0.03, 0], [-0.025, 0.2], [-0.06, 0.4], [-0.1, 0.46], [-0.5, 0.46]], V);
    A.poly([[0.5, 0], [0.03, 0], [0.025, 0.2], [0.06, 0.4], [0.1, 0.46], [0.5, 0.46]], V);
    A.strokes(60, shadeC(L.vest, 1.2, 1), 0.03, 0.005, 0, 0.45, false, 0.15);
    for (let i = 0; i < 4; i++) A.ell(-0.034, 0.04 + i * 0.05, 0.006, 0.006, '#d8c890');
    A.poly([[-0.12, 0.2], [-0.06, 0.2], [-0.06, 0.21], [-0.12, 0.21]], shadeC(L.vest, 0.6));
    A.poly([[0.12, 0.2], [0.06, 0.2], [0.06, 0.21], [0.12, 0.21]], shadeC(L.vest, 0.6));
    if (L.chain) { A.c.strokeStyle = '#e0c050'; A.c.lineWidth = 0.004; A.c.beginPath(); A.c.moveTo(-0.034, 0.12); A.c.quadraticCurveTo(-0.06, 0.08, -0.1, 0.11); A.c.stroke(); }
  }
  // пальто / сюртук
  if (L.coat) {
    const C = shadeC(L.coat, 1), CD = shadeC(L.coat, 0.72);
    A.poly([[-0.5, 0], [-0.09, 0], [-0.08, 0.2], [-0.12, 0.47], [-0.5, 0.47]], C);
    A.poly([[0.5, 0], [0.09, 0], [0.08, 0.2], [0.12, 0.47], [0.5, 0.47]], C);
    A.strokes(90, shadeC(L.coat, 1.25, 1), 0.04, 0.005, 0, 0.47, true, 0.12);
    A.strokes(60, shadeC(L.coat, 0.7), 0.04, 0.005, 0, 0.47, true, 0.15);
    // лацканы
    A.poly([[-0.08, 0.2], [-0.13, 0.47], [-0.18, 0.47], [-0.15, 0.4], [-0.12, 0.32]], CD);
    A.poly([[0.08, 0.2], [0.13, 0.47], [0.18, 0.47], [0.15, 0.4], [0.12, 0.32]], CD);
    A.poly([[-0.085, 0.2], [-0.09, 0.0], [-0.1, 0.0], [-0.095, 0.2]], rgba('#0a0604', 0.5));
    A.poly([[0.085, 0.2], [0.09, 0.0], [0.1, 0.0], [0.095, 0.2]], rgba('#0a0604', 0.5));
    // карманы, пуговицы, складки
    for (const s of [-1, 1]) {
      A.rect(s * 0.18 - 0.04, 0.06, 0.08, 0.008, CD);
      A.ell(s * 0.11, 0.12, 0.007, 0.007, '#1e1a16'); A.ell(s * 0.11, 0.05, 0.007, 0.007, '#1e1a16');
      A.fold(s * 0.22, 0.05, 0.3, s * 0.15, 0.012);
    }
    A.rect(-0.5, 0.44, 1, 0.035, CD);
  }
  // складки рубашки от плеч
  if (!L.coat && !L.vest) for (const s of [-1, 1]) { A.fold(s * 0.12, 0.08, 0.3, s * -0.25, 0.012); A.fold(s * 0.06, 0.02, 0.2, s * 0.2, 0.01); }
  // бандана
  if (L.bandana) {
    A.poly([[-0.5, 0.47], [0.5, 0.47], [0.5, 0.52], [-0.5, 0.52]], shadeC(L.bandana, 0.9));
    A.poly([[-0.08, 0.5], [0.08, 0.5], [0, 0.36]], shadeC(L.bandana, 1));
    A.strokes(20, shadeC(L.bandana, 0.6), 0.02, 0.004, 0.37, 0.5, false, 0.4);
    for (let i = 0; i < 6; i++) A.ell(-0.04 + rnd() * 0.08, 0.42 + rnd() * 0.07, 0.004, 0.004, 'rgba(255,240,220,0.6)');
  }
  if (L.collar) { A.rect(-0.012, 0.47, 0.024, 0.025, '#f2f2f2'); }
  // ремень (у женщин — пояс)
  if (!female) {
    A.rect(-0.5, 0.0, 1, 0.045, '#2a1a10'); A.rect(-0.5, 0.04, 1, 0.004, '#4a3020');
    A.rect(-0.022, 0.004, 0.044, 0.036, '#c8a040'); A.rect(-0.014, 0.012, 0.028, 0.02, '#2a1a10');
  } else A.rect(-0.5, 0.0, 1, 0.03, shadeC(L.skirt, 0.65));
  if (L.apron) { A.poly([[-0.09, 0], [0.09, 0], [0.08, 0.26], [-0.08, 0.26]], shadeC(L.apron, 1)); A.rect(-0.12, 0.25, 0.03, 0.22, shadeC(L.apron, 0.95)); A.rect(0.09, 0.25, 0.03, 0.22, shadeC(L.apron, 0.95)); }
  if (L.badge) {
    const c = A.c; c.fillStyle = '#e8c050'; c.beginPath();
    for (let i = 0; i < 12; i++) { const rr = i % 2 ? 0.011 : 0.025, a = i * PI / 6; c.lineTo(-0.15 + Math.sin(a) * rr, 0.3 + Math.cos(a) * rr); }
    c.closePath(); c.fill(); A.ell(-0.15, 0.3, 0.007, 0.007, '#a87a20');
  }
  A.volume(0.5, 0.1);
  A.vgrad(0.0, 0.12, 0.25, 0.0);
  if (demon) { A.c.globalAlpha = 0.55; A.fill('#0a0404'); A.c.globalAlpha = 1; A.strokes(80, '#2a0808', 0.05, 0.004, 0, 0.5, true, 0.4); }
  A.end();
  // таз
  const P = new Area(ctx, R.pelvis, 0.95, 0.16, rnd).begin();
  P.fill(shadeC(female ? '#2a2222' : L.pants, 1));
  P.rect(-0.5, 0.12, 1, 0.04, '#2a1a10');
  if (L.holster) { P.rect(-0.5, 0.075, 1, 0.045, '#3a2414'); for (let i = 0; i < 18; i++) P.rect(-0.45 + i * 0.05, 0.08, 0.012, 0.03, '#c09040'); }
  P.poly([[-0.015, 0.12], [0.015, 0.12], [0.004, 0.0], [-0.004, 0.0]], rgba('#0a0604', 0.3));
  P.volume(0.5, 0.06);
  if (demon) { P.c.globalAlpha = 0.5; P.fill('#0a0404'); P.c.globalAlpha = 1; }
  P.end();
}

function paintSkirt(ctx, L, rnd, demon) {
  const A = new Area(ctx, R.skirt, 1.6, 0.62, rnd).begin();
  if (L.skirt) {
    A.fill(shadeC(L.skirt, 1));
    for (let i = 0; i < 9; i++) A.fold(-0.75 + i * 0.18 + rnd() * 0.05, 0.0, 0.55, (rnd() - 0.5) * 0.08, 0.025);
    A.rect(-1, 0, 2, 0.04, shadeC(L.skirt, 0.7));
    A.strokes(70, shadeC(L.skirt, 1.2, 1), 0.05, 0.006, 0, 0.6, true, 0.12);
    if (L.apron) { A.poly([[-0.17, 0.02], [0.17, 0.02], [0.13, 0.6], [-0.13, 0.6]], shadeC(L.apron, 1)); A.fold(-0.05, 0.03, 0.45, 0.02, 0.012); A.fold(0.06, 0.03, 0.45, -0.02, 0.012); }
  } else {
    // полы пальто: спина — в центре области
    const C = L.coat || '#333';
    A.fill(shadeC(C, 1));
    A.strokes(90, shadeC(C, 1.25, 1), 0.06, 0.006, 0, 0.6, true, 0.12);
    for (let i = 0; i < 7; i++) A.fold(-0.7 + i * 0.22 + rnd() * 0.05, 0.0, 0.5, (rnd() - 0.5) * 0.1, 0.02);
    A.poly([[-0.006, 0], [0.006, 0], [0.003, 0.25], [-0.003, 0.25]], rgba('#0a0604', 0.6));
    A.rect(-1, 0, 2, 0.03, shadeC(C, 0.7));
    A.rect(-1, 0.56, 2, 0.06, shadeC(C, 0.7));
    for (const s of [-1, 1]) A.rect(s * 0.79 - 0.02, 0, 0.04, 0.62, shadeC(C, 0.6));
  }
  // объём: тёмная спина у пальто, перед — для юбки
  const c = A.c, g = c.createLinearGradient(-0.8, 0, 0.8, 0);
  const bk = L.skirt ? 0.4 : 0.15, fr = L.skirt ? 0.0 : 0.35;
  g.addColorStop(0, `rgba(10,6,4,${fr})`); g.addColorStop(0.3, `rgba(10,6,4,${bk * 0.5})`); g.addColorStop(0.5, `rgba(10,6,4,${L.skirt ? 0 : bk})`);
  g.addColorStop(0.7, `rgba(10,6,4,${bk * 0.6})`); g.addColorStop(1, `rgba(10,6,4,${fr})`);
  if (L.skirt) { g.addColorStop(0.5, 'rgba(10,6,4,0.4)'); }
  c.fillStyle = g; c.fillRect(-1, 0, 2, 0.62);
  A.vgrad(0.62, 0.45, 0.3, 0);
  if (demon) { A.c.globalAlpha = 0.5; A.fill('#0a0404'); A.c.globalAlpha = 1; }
  A.end();
}

function paintLimb(ctx, rect, C, H, base, rnd, opts = {}) {
  const A = new Area(ctx, rect, C, H, rnd).begin();
  A.fill(shadeC(base, 1));
  A.strokes(40, shadeC(base, 1.25, 1), 0.04, 0.004, 0, H, true, 0.14);
  A.strokes(30, shadeC(base, 0.7), 0.04, 0.004, 0, H, true, 0.14);
  for (let i = 0; i < (opts.folds || 2); i++) A.fold(-0.06 + rnd() * 0.08, H * (0.15 + rnd() * 0.5), H * 0.3, 1.3 + (rnd() - 0.5) * 0.6, 0.008);
  if (opts.seam) A.rect(C * 0.24, 0, 0.004, H, rgba('#0a0604', 0.3));
  if (opts.cuff) { A.rect(-C, 0, C * 2, opts.cuffH || 0.03, shadeC(opts.cuff, 1)); A.rect(-C, opts.cuffH || 0.03, C * 2, 0.004, rgba('#0a0604', 0.4)); }
  if (opts.boot) {
    const bh = opts.bootH;
    A.rect(-C, 0, C * 2, bh, shadeC(opts.boot, 1));
    A.strokes(40, shadeC(opts.boot, 1.6), 0.02, 0.003, 0, bh, false, 0.25);
    A.rect(-C, bh - 0.02, C * 2, 0.02, shadeC(opts.boot, 1.35));
    A.rect(-C, bh, C * 2, 0.006, rgba('#0a0604', 0.5));
    for (let i = 0; i < 5; i++) A.rect(-0.03 + i * 0.015, bh * 0.4, 0.004, bh * 0.4, shadeC(opts.boot, 0.7));
  }
  if (opts.knee) A.ell(0, opts.knee, 0.03, 0.02, rgba('#0a0604', 0.25));
  A.volume(0.55, 0.12);
  if (opts.demon) { A.c.globalAlpha = 0.55; A.fill('#0a0404'); A.c.globalAlpha = 1; }
  A.end();
}

function paintSmall(ctx, L, rnd, demon) {
  // кисть
  const sk = demon ? '#2c1d1f' : L.skin;
  let A = new Area(ctx, R.hand, 0.1, 0.1, rnd).begin();
  A.fill(shadeC(sk, 1));
  for (let i = 1; i < 4; i++) A.rect(-0.05 + i * 0.025, 0, 0.003, 0.045, shadeC(sk, 0.65));
  A.rect(-0.05, 0.045, 0.1, 0.004, shadeC(sk, 0.75));
  A.vgrad(0, 0.1, 0.3, 0);
  if (demon) for (let i = 0; i < 4; i++) A.poly([[-0.04 + i * 0.025, 0.0], [-0.03 + i * 0.025, 0.0], [-0.035 + i * 0.025, 0.02]], '#0a0606');
  A.end();
  // стопа
  A = new Area(ctx, R.foot, 0.3, 0.1, rnd).begin();
  A.fill(shadeC(L.boots, 1)); A.rect(-0.15, 0, 0.3, 0.02, shadeC(L.boots, 0.55)); A.strokes(20, shadeC(L.boots, 1.6), 0.02, 0.003, 0.02, 0.1, false, 0.3); A.end();
  // кожа (кобура, сумка)
  A = new Area(ctx, R.leather, 0.2, 0.2, rnd).begin();
  A.fill('#4a2e1a'); A.strokes(30, '#6a4a2a', 0.03, 0.004, 0, 0.2, false, 0.3);
  const c = A.c; c.fillStyle = '#c8a060'; for (let i = 0; i < 10; i++) c.fillRect(-0.085, 0.01 + i * 0.019, 0.006, 0.008);
  A.end();
  // кожа для носа
  A = new Area(ctx, R.skin, 0.05, 0.05, rnd).begin(); A.fill(shadeC(sk, 0.95)); A.vgrad(0, 0.05, 0.25, 0); A.end();
  // волосы (накладка)
  A = new Area(ctx, R.hair, 0.6, 0.4, rnd).begin();
  A.fill(shadeC(L.hair, 1)); A.strokes(160, shadeC(L.hair, 0.55), 0.06, 0.004, 0, 0.4, true, 0.5); A.strokes(80, shadeC(L.hair, 1.5), 0.05, 0.003, 0, 0.4, true, 0.35); A.volume(0.4, 0.1); A.end();
  // шляпа: тулья и поля
  const HC = demon ? shadeC(L.hatColor, 0.5) : L.hatColor;
  A = new Area(ctx, R.hatc, 0.8, 0.3, rnd).begin();
  A.fill(shadeC(HC, 1)); A.strokes(60, shadeC(HC, 1.35, 1), 0.04, 0.005, 0, 0.3, false, 0.15); A.strokes(40, shadeC(HC, 0.7), 0.04, 0.005, 0, 0.3, false, 0.2);
  A.rect(-0.4, 0, 0.8, 0.045, shadeC(L.band, 1)); A.rect(-0.4, 0.045, 0.8, 0.004, shadeC(L.band, 1.6));
  if (L.hat === 'cowboy') { A.ell(0, 0.25, 0.04, 0.08, rgba('#0a0604', 0.4)); A.ell(0.3, 0.07, 0.07, 0.025, rgba('#3a2a10', 0.25)); }
  A.volume(0.4, 0.12); A.vgrad(0.3, 0.22, 0.25, 0); A.end();
  A = new Area(ctx, R.hatb, 1, 1, rnd).begin();
  const g = c.createRadialGradient(0, 0.5, 0.15, 0, 0.5, 0.55);
  A.fill(shadeC(HC, 1)); g.addColorStop(0, 'rgba(10,6,4,0.5)'); g.addColorStop(0.45, 'rgba(10,6,4,0.1)'); g.addColorStop(0.9, 'rgba(10,6,4,0.05)'); g.addColorStop(1, 'rgba(10,6,4,0.5)');
  A.c.fillStyle = g; A.c.fillRect(-1, 0, 2, 1); A.strokes(40, shadeC(HC, 1.3), 0.08, 0.008, 0, 1, false, 0.15);
  A.end();
}

// ---------- геометрия ----------
function remap(g, key) {
  const [x, y, w, h] = R[key];
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = Math.min(1, Math.max(0, uv.getX(i))), v = Math.min(1, Math.max(0, uv.getY(i)));
    uv.setXY(i, (x + 0.5 + u * (w - 1)) / S, 1 - (y + 0.5 + (1 - v) * (h - 1)) / S);
  }
  return g;
}
function prep(g, key, m) {
  if (g.index) g = g.toNonIndexed();
  remap(g, key);
  if (m) g.applyMatrix4(m);
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
// сглаживание нормалей по совпадающим позициям — швы и стыки деталей перетекают друг в друга
function smoothNormals(g) {
  const pos = g.attributes.position, n = pos.count, acc = new Map(), keys = new Array(n);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3();
  const key = (i) => `${Math.round(pos.getX(i) * 2000)}|${Math.round(pos.getY(i) * 2000)}|${Math.round(pos.getZ(i) * 2000)}`;
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    fn.subVectors(c, b).cross(a.clone().sub(b));
    for (let k = 0; k < 3; k++) {
      const kk = keys[i + k] = key(i + k);
      let v = acc.get(kk); if (!v) acc.set(kk, v = new THREE.Vector3());
      v.add(fn);
    }
  }
  const nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = acc.get(keys[i]).clone().normalize(); nrm[i * 3] = v.x; nrm[i * 3 + 1] = v.y; nrm[i * 3 + 2] = v.z; }
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return g;
}
// плавный профиль тела вращения по опорным точкам
function profile(pts, n) {
  const c = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y)));
  return c.getPoints(n).map((p) => [Math.max(0.0005, p.x), p.y]);
}
// лепка головы: нос, надбровья, глазницы, скулы, подбородок, затылок
function sculptHead(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z); if (r < 1e-4) continue;
    const ang = Math.atan2(x, z), f = Math.cos(ang);
    let dr = 0;
    const g2 = (a0, y0, sa, sy, amp) => amp * Math.exp(-(((ang - a0) / sa) ** 2 + ((y - y0) / sy) ** 2));
    dr += g2(0, 0.1, 0.16, 0.022, 0.011) + g2(0, 0.124, 0.1, 0.025, 0.004);       // нос и спинка
    dr += g2(0, 0.083, 0.2, 0.01, 0.004);                                            // крылья носа
    dr += g2(0.33, 0.152, 0.25, 0.012, 0.006) + g2(-0.33, 0.152, 0.25, 0.012, 0.006); // надбровья
    dr -= g2(0.33, 0.132, 0.16, 0.012, 0.007) + g2(-0.33, 0.132, 0.16, 0.012, 0.007); // глазницы
    dr += g2(0.62, 0.105, 0.22, 0.02, 0.006) + g2(-0.62, 0.105, 0.22, 0.02, 0.006);   // скулы
    dr += g2(0, 0.03, 0.3, 0.018, 0.01);                                             // подбородок
    dr += g2(0, 0.055, 0.18, 0.006, 0.003);                                          // губы
    dr += g2(Math.PI, 0.17, 0.8, 0.05, 0.012) + g2(-Math.PI, 0.17, 0.8, 0.05, 0.012); // затылок
    dr += g2(1.57, 0.12, 0.12, 0.025, 0.01) + g2(-1.57, 0.12, 0.12, 0.025, 0.01);    // уши
    let k = 1;
    if (f > 0) k -= 0.1 * Math.pow(f, 3) * (y > 0.04 && y < 0.2 ? 1 : 0.4);           // плоскость лица
    if (y < 0.085) k -= (1 - y / 0.085) * 0.08 * (1 - Math.max(0, f) * 0.6);          // сужение челюсти
    const nr = r * k + dr;
    p.setXYZ(i, x / r * nr, y, z / r * nr);
  }
  return g;
}
const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const lathe = (pts, seg, phiStart = PI, phiLen = PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLen);
const cyl = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, false, PI);
const merge = (arr) => mergeGeometries(arr, false);

export function buildPainted(lookIn, demon = false) {
  const L = Object.assign({}, DEF, lookIn);
  L.female = !!L.skirt;
  const W = L.w;
  const legS = demon ? 1.18 : 1, armS = demon ? 1.45 : 1, off = 0.96 * (legS - 1);
  const seed = [...JSON.stringify(lookIn)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7);
  const rnd = mulberry32(seed);
  // текстура
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
  paintHead(ctx, L, rnd, demon);
  paintTorso(ctx, L, rnd, demon);
  paintSkirt(ctx, L, rnd, demon);
  const sleeve = L.coat || (L.female ? L.skirt : L.shirt);
  paintLimb(ctx, R.uarm, 0.36, 0.3, sleeve, rnd, { folds: 2, demon });
  paintLimb(ctx, R.farm, 0.3, 0.27, sleeve, rnd, { folds: 2, cuff: L.coat ? shadeC(L.coat, 0.7) : shadeC(sleeve, 1.1), cuffH: 0.035, demon });
  const leg = L.female ? '#2a2222' : L.pants;
  paintLimb(ctx, R.thigh, 0.46, 0.46, leg, rnd, { folds: 3, seam: true, demon });
  paintLimb(ctx, R.shin, 0.38, 0.47, leg, rnd, { folds: 2, seam: true, boot: L.boots, bootH: 0.24, knee: 0.44, demon });
  paintSmall(ctx, L, rnd, demon);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  const material = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });

  // тело
  const Y = (y) => y + off;
  const body = [];
  body.push(prep(lathe(profile([[0.15, 0], [0.158, 0.09], [0.18, 0.2], [0.194, 0.3], [0.199, 0.37], [0.18, 0.43], [0.13, 0.475], [0.068, 0.5], [0.054, 0.53], [0.05, 0.56]], 22), 20), 'torso', M(0, Y(0.97), 0, 0, 0, 0, W, 1, 0.66 * W)));
  body.push(prep(lathe(profile([[0.128, -0.01], [0.15, 0.06], [0.155, 0.12], [0.15, 0.165]], 8), 20), 'pelvis', M(0, Y(0.81), 0, 0, 0, 0, W, 1, 0.72 * W)));
  if (L.female) body.push(prep(lathe(profile([[0.43, 0], [0.4, 0.12], [0.33, 0.3], [0.24, 0.5], [0.168, 0.62]], 14), 28), 'skirt', M(0, Y(0.4), 0, 0, 0, 0, W, 1, 0.9 * W)));
  else if (L.coat) {
    const long = L.coatLong;
    body.push(prep(lathe(profile(long ? [[0.29, 0], [0.255, 0.2], [0.21, 0.42], [0.18, 0.56], [0.172, 0.6]] : [[0.19, 0], [0.18, 0.1], [0.17, 0.18]], 12), 22, 0.45, PI * 2 - 0.9), 'skirt', M(0, Y(long ? 0.39 : 0.82), 0, 0, 0, 0, W, 1, 0.75 * W)));
  }
  const hy = Y(1.505);
  body.push(prep(sculptHead(lathe(profile([[0.001, 0], [0.034, 0.005], [0.058, 0.022], [0.075, 0.05], [0.087, 0.09], [0.096, 0.135], [0.097, 0.172], [0.089, 0.205], [0.066, 0.232], [0.034, 0.248], [0.001, 0.253]], 22), 32)), 'head', M(0, hy, 0.01, 0, 0, 0, 1.0, 0.96, 1.08)));
  body.push(prep(lathe(profile([[0.047, -0.06], [0.05, 0.0], [0.056, 0.05], [0.07, 0.085]], 6), 16), 'skin', M(0, hy - 0.02, 0.0, 0.12)));
  if (L.hairStyle === 'long' && !demon) body.push(prep(new THREE.BoxGeometry(0.17, 0.3, 0.04), 'hair', M(0, hy - 0.02, -0.095, 0.12)));
  if (L.hairStyle === 'bun' && !demon) body.push(prep(new THREE.SphereGeometry(0.055, 14, 10), 'hair', M(0, hy + 0.2, -0.1)));
  if ((L.hairStyle === 'short') && L.hat === 'none' && !demon) body.push(prep(lathe(profile([[0.104, 0], [0.1, 0.06], [0.075, 0.1], [0.001, 0.12]], 8), 24), 'hair', M(0, hy + 0.15, 0.0, -0.15, 0, 0, 0.98, 1, 1.12)));
  // шляпы
  const ht = hy + 0.215 + (demon ? 0.05 : 0);
  switch (L.hat) {
    case 'cowboy':
      body.push(prep(lathe(profile([[0.12, 0.0], [0.2, -0.008], [0.26, 0.0], [0.29, 0.03]], 8), 28), 'hatb', M(0, ht, 0.0, 0, 0, 0, 1, 1, 1.1)));
      body.push(prep(lathe(profile([[0.122, 0], [0.12, 0.08], [0.1, 0.13], [0.05, 0.142], [0.001, 0.12]], 10), 22), 'hatc', M(0, ht, 0, 0, 0, 0, 1, 1, 1.15)));
      break;
    case 'straw':
      body.push(prep(cyl(0.36, 0.36, 0.016, 28), 'hatb', M(0, ht, 0)));
      body.push(prep(cyl(0.11, 0.125, 0.12, 20), 'hatc', M(0, ht + 0.06, 0)));
      break;
    case 'bowler':
      body.push(prep(cyl(0.17, 0.17, 0.014, 24), 'hatb', M(0, ht - 0.01, 0, 0, 0, 0, 1, 1, 1.1)));
      body.push(prep(lathe(profile([[0.118, 0], [0.122, 0.04], [0.11, 0.09], [0.06, 0.125], [0.001, 0.13]], 10), 22), 'hatc', M(0, ht - 0.01, 0, 0, 0, 0, 1, 1, 1.1)));
      break;
    case 'top':
      body.push(prep(cyl(0.18, 0.18, 0.014, 24), 'hatb', M(0, ht - 0.01, 0, 0, 0, 0, 1, 1, 1.1)));
      body.push(prep(cyl(0.11, 0.105, 0.27, 20), 'hatc', M(0, ht + 0.13, 0, 0, 0, 0, 1, 1, 1.1)));
      break;
    case 'flat':
      body.push(prep(cyl(0.28, 0.28, 0.014, 28), 'hatb', M(0, ht, 0)));
      body.push(prep(cyl(0.11, 0.118, 0.07, 20), 'hatc', M(0, ht + 0.035, 0)));
      break;
    case 'cap':
      body.push(prep(lathe(profile([[0.112, 0], [0.11, 0.04], [0.08, 0.08], [0.001, 0.09]], 8), 22), 'hatc', M(0, ht - 0.07, 0, 0, 0, 0, 1, 1, 1.1)));
      body.push(prep(new THREE.BoxGeometry(0.16, 0.012, 0.09), 'hatb', M(0, ht - 0.06, 0.13, 0.15)));
      break;
    case 'visor':
      body.push(prep(new THREE.BoxGeometry(0.18, 0.008, 0.12), 'hatb', M(0, ht - 0.05, 0.12, -0.2)));
      break;
    case 'bonnet':
      body.push(prep(lathe(profile([[0.13, 0], [0.135, 0.1], [0.11, 0.2], [0.001, 0.25]], 10), 22, 0.7, PI * 2 - 1.4), 'hatc', M(0, hy + 0.02, -0.005, -0.35)));
      break;
    case 'feather':
      body.push(prep(cyl(0.08, 0.09, 0.05, 8), 'hatc', M(0.02, ht - 0.05, 0)));
      body.push(prep(new THREE.BoxGeometry(0.02, 0.28, 0.05), 'hair', M(0.07, ht + 0.07, -0.03, -0.3, 0, -0.2)));
      break;
  }
  if (L.holster) { body.push(prep(new THREE.BoxGeometry(0.06, 0.2, 0.09), 'leather', M(0.18 * W, Y(0.86), 0.03, 0, 0, 0.12))); body.push(prep(new THREE.BoxGeometry(0.035, 0.09, 0.05), 'foot', M(0.185 * W, Y(1.0), 0.0, 0, 0, 0.12))); }
  if (L.bag) body.push(prep(new THREE.BoxGeometry(0.1, 0.18, 0.28), 'leather', M(-0.23 * W, Y(0.78), 0.05)));

  // руки: плечо (с дельтой) и предплечье с кистью — тела вращения с мышечным профилем
  const LP = (pts, n, seg, key, m) => prep(lathe(profile(pts, n), seg), key, m);
  const upper = () => LP([[0.043 * W, -0.3], [0.05 * W, -0.22], [0.056 * W, -0.14], [0.058 * W, -0.06], [0.06 * W, 0.0], [0.045 * W, 0.028], [0.001, 0.04]], 14, 16, 'uarm', M(0, 0, 0, 0, 0, 0, 1.05, armS, 1));
  const fore = () => merge([
    LP([[0.031 * W, -0.265], [0.036 * W, -0.2], [0.047 * W, -0.08], [0.048 * W, -0.02], [0.04 * W, 0.02], [0.001, 0.035]], 12, 16, 'farm', M(0, 0, 0, 0, 0, 0, 1, armS, 1)),
    prep(new THREE.SphereGeometry(1, 14, 10), 'hand', M(0, -0.31 * armS, 0.006, 0, 0, 0, 0.033, 0.055, 0.019)),
    prep(new THREE.SphereGeometry(1, 10, 8), 'hand', M(0.026, -0.29 * armS, 0.02, 0.3, 0, 0.5, 0.011, 0.028, 0.012)),
  ]);
  const thigh = () => LP([[0.058 * W, -0.47], [0.066 * W, -0.38], [0.078 * W, -0.22], [0.084 * W, -0.08], [0.082 * W, 0.0], [0.06 * W, 0.04], [0.001, 0.06]], 14, 16, 'thigh', M(0, 0, 0, 0, 0, 0, 1, legS, 1));
  const shin = () => merge([
    LP([[0.054, -0.47], [0.058, -0.36], [0.06, -0.24], [0.062 * W, -0.12], [0.058 * W, -0.02], [0.045 * W, 0.025], [0.001, 0.04]], 14, 16, 'shin', M(0, 0, 0, 0, 0, 0, 1, legS, 1)),
    prep(new THREE.SphereGeometry(1, 16, 10), 'foot', M(0, -0.45 * legS, 0.05, 0, 0, 0, 0.052, 0.045, 0.135)),
    prep(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 14), 'foot', M(0, -0.488 * legS, 0.05, 0, 0, 0, 1.05, 1, 2.7)),
  ]);
  let eyes = null;
  if (demon) {
    const e = [];
    for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.04, 0.02, 0.01); g.applyMatrix4(M(s * 0.034, hy + 0.135, 0.1)); e.push(g); }
    eyes = merge(e.map((g) => { g.deleteAttribute('uv'); return g; }));
  }
  return {
    body: smoothNormals(merge(body)), upperL: smoothNormals(upper()), upperR: smoothNormals(upper()), foreL: smoothNormals(fore()), foreR: smoothNormals(fore()),
    thighL: smoothNormals(thigh()), thighR: smoothNormals(thigh()), shinL: smoothNormals(shin()), shinR: smoothNormals(shin()),
    eyes, material, texture: tex, canvas: cv,
    sx: 0.182 * W, sy: Y(1.375), elbow: -0.29 * armS, hx: 0.09 * W, hy: Y(0.96), knee: -0.45 * legS, female: L.female,
  };
}
