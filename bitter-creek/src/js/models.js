// Построитель низкополигональной геометрии: всё склеивается в один буфер с цветами вершин,
// чтобы город рисовался считанными вызовами отрисовки.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const cache = new Map();
function cached(key, make) {
  let g = cache.get(key);
  if (!g) {
    g = make();
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    cache.set(key, g);
  }
  return g;
}

function prismGeo() {
  const A = [-0.5, 0, 0.5], B = [0.5, 0, 0.5], C = [0, 1, 0.5];
  const A2 = [-0.5, 0, -0.5], B2 = [0.5, 0, -0.5], C2 = [0, 1, -0.5];
  const tris = [A, B, C, B2, A2, C2, A, C, C2, A, C2, A2, B, B2, C2, B, C2, C, A, A2, B2, A, B2, B];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  return g;
}

export const G = {
  box: () => cached('box', () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: (rt, rb, seg) => cached(`c${rt}|${rb}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, 1, seg)),
  cone: (seg) => cached('k' + seg, () => new THREE.ConeGeometry(1, 1, seg)),
  ico: (d) => cached('i' + d, () => new THREE.IcosahedronGeometry(1, d)),
  dodeca: () => cached('dd', () => new THREE.DodecahedronGeometry(1, 0)),
  prism: () => cached('prism', prismGeo),
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

export function shade(hex, f) {
  _c.set(hex);
  _c.r = Math.min(1, _c.r * f); _c.g = Math.min(1, _c.g * f); _c.b = Math.min(1, _c.b * f);
  return '#' + _c.getHexString();
}
export function mixColor(a, b, t) {
  const c1 = new THREE.Color(a), c2 = new THREE.Color(b);
  return '#' + c1.lerp(c2, t).getHexString();
}

export class GeoBuilder {
  constructor() { this.parts = []; this.base = null; this.jitter = 0; }

  setBase(x, y, z, ry = 0) {
    if (x === null) { this.base = null; return; }
    this.base = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), new THREE.Vector3(1, 1, 1));
  }

  add(geo, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const g = geo.clone();
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    if (this.base) g.applyMatrix4(this.base);
    _c.set(color);
    if (this.jitter) {
      const j = 1 + (Math.random() - 0.5) * this.jitter;
      _c.r *= j; _c.g *= j; _c.b *= j;
    }
    const n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g);
    return this;
  }

  // Все размеры — полные (ширина, высота, глубина), координаты — центр.
  box(c, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) { return this.add(G.box(), c, x, y, z, w, h, d, rx, ry, rz); }
  cyl(c, x, y, z, rt, rb, h, seg = 8, rx = 0, ry = 0, rz = 0) { return this.add(G.cyl(rt, rb, seg), c, x, y, z, 1, h, 1, rx, ry, rz); }
  cone(c, x, y, z, r, h, seg = 6, rx = 0, ry = 0, rz = 0) { return this.add(G.cone(seg), c, x, y, z, r, h, r, rx, ry, rz); }
  ico(c, x, y, z, sx, sy = sx, sz = sx, d = 0, rx = 0, ry = 0, rz = 0) { return this.add(G.ico(d), c, x, y, z, sx, sy, sz, rx, ry, rz); }
  rock(c, x, y, z, sx, sy = sx, sz = sx, ry = 0) { return this.add(G.dodeca(), c, x, y, z, sx, sy, sz, 0.2, ry, 0.1); }
  // Треугольная призма: основание по y, вершина сверху, вытянута по z.
  prism(c, x, y, z, w, h, d, ry = 0) { return this.add(G.prism(), c, x, y, z, w, h, d, 0, ry, 0); }

  get empty() { return this.parts.length === 0; }

  build() {
    if (!this.parts.length) return null;
    const g = mergeGeometries(this.parts, false);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    g.computeBoundingBox();
    this.parts = [];
    return g;
  }
}

export const MAT = {};
export const TEX = {};

function radialTexture(inner, outer, size = 64) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const gr = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cv);
  return t;
}

export function initMaterials() {
  MAT.solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.eyes = new THREE.MeshBasicMaterial({ color: 0xff3a1c });
  MAT.bossEyes = new THREE.MeshBasicMaterial({ color: 0xff2010 });
  TEX.blob = radialTexture('rgba(0,0,0,1)', 'rgba(0,0,0,0)');
  TEX.glow = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  TEX.soft = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  MAT.blob = new THREE.MeshBasicMaterial({ map: TEX.blob, transparent: true, depthWrite: false, opacity: 0.42 });
  MAT.water = new THREE.MeshLambertMaterial({ color: '#3f5257', transparent: true, opacity: 0.82 });
  MAT.pool = new THREE.MeshBasicMaterial({ map: TEX.glow, color: '#ffb060', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  MAT.lampGlow = new THREE.SpriteMaterial({ map: TEX.glow, color: '#ffbb66', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  MAT.danger = new THREE.MeshBasicMaterial({ map: TEX.glow, color: '#ff2a10', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 });
}

// Табличка с надписью (канва-текстура)
export function makeSign(text, w, h, opts = {}) {
  const cv = document.createElement('canvas');
  const scale = 64;
  cv.width = Math.min(1024, Math.round(w * scale)); cv.height = Math.round(h * scale);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = opts.bg || '#2b1d12'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = opts.border || '#c9a868'; ctx.lineWidth = 4; ctx.strokeRect(5, 5, cv.width - 10, cv.height - 10);
  ctx.fillStyle = opts.fg || '#e9d6a8';
  let fs = Math.round(cv.height * 0.55);
  ctx.font = `bold ${fs}px Georgia, "Times New Roman", serif`;
  while (ctx.measureText(text).width > cv.width - 24 && fs > 10) { fs -= 2; ctx.font = `bold ${fs}px Georgia, "Times New Roman", serif`; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  return m;
}
