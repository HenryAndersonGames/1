// Построитель геометрии: всё склеивается в один буфер с цветами вершин и типом поверхности,
// чтобы город рисовался считанными вызовами отрисовки. Детали поверхности (доски, песок, ткань)
// дорисовывает шейдер по мировым координатам — без UV-развёрток.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Поверхности (атрибут aDet): 0 — ткань/камень (мелкий шум), 1 — доски, 2 — земля
export const SURF = { FINE: 0, WOOD: 1, GROUND: 2 };

const cache = new Map();
function prepare(g, smooth) {
  if (smooth) {
    if (g.index) { g.computeVertexNormals(); g = g.toNonIndexed(); }
    else if (!g.attributes.normal) g.computeVertexNormals();
  } else {
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('normal');
    g.computeVertexNormals();
  }
  g.deleteAttribute('uv');
  return g;
}
function cached(key, smooth, make) {
  const k = key + (smooth ? '|s' : '|f');
  let g = cache.get(k);
  if (!g) { g = prepare(make(), smooth); cache.set(k, g); }
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
  box: () => cached('box', false, () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: (rt, rb, seg, smooth = true) => cached(`c${rt}|${rb}|${seg}`, smooth, () => new THREE.CylinderGeometry(rt, rb, 1, seg)),
  cone: (seg, smooth = true) => cached('k' + seg, smooth, () => new THREE.ConeGeometry(1, 1, seg)),
  ico: (d, smooth = true) => cached('i' + d, smooth, () => new THREE.IcosahedronGeometry(1, d)),
  sphere: (w, h, smooth = true) => cached(`s${w}|${h}`, smooth, () => new THREE.SphereGeometry(1, w, h)),
  hemi: (w = 16) => cached('h' + w, true, () => new THREE.SphereGeometry(1, w, Math.round(w / 2), 0, Math.PI * 2, 0, Math.PI / 2)),
  dodeca: () => cached('dd', false, () => new THREE.DodecahedronGeometry(1, 0)),
  prism: () => cached('prism', false, prismGeo),
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
  constructor(surface = SURF.WOOD) { this.parts = []; this.base = null; this.jitter = 0; this.surface = surface; }

  setBase(x, y, z, ry = 0) {
    if (x === null) { this.base = null; return; }
    this.base = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), new THREE.Vector3(1, 1, 1));
  }

  add(geo, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, surf) {
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
    const n = g.attributes.position.count, arr = new Float32Array(n * 3), det = new Float32Array(n);
    const sv = surf === undefined ? this.surface : surf;
    for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; det[i] = sv; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.setAttribute('aDet', new THREE.BufferAttribute(det, 1));
    this.parts.push(g);
    return this;
  }

  // Размеры полные (ширина, высота, глубина), координаты — центр.
  box(c, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0, surf) { return this.add(G.box(), c, x, y, z, w, h, d, rx, ry, rz, surf); }
  cyl(c, x, y, z, rt, rb, h, seg = 8, rx = 0, ry = 0, rz = 0, surf) { return this.add(G.cyl(rt, rb, seg), c, x, y, z, 1, h, 1, rx, ry, rz, surf); }
  // эллиптический цилиндр: радиусы по x и z задаются масштабом
  ecyl(c, x, y, z, rt, rb, h, kz, seg = 12, rx = 0, ry = 0, rz = 0, surf) { return this.add(G.cyl(rt, rb, seg), c, x, y, z, 1, h, kz, rx, ry, rz, surf); }
  cone(c, x, y, z, r, h, seg = 6, rx = 0, ry = 0, rz = 0, surf) { return this.add(G.cone(seg), c, x, y, z, r, h, r, rx, ry, rz, surf); }
  ico(c, x, y, z, sx, sy = sx, sz = sx, d = 1, rx = 0, ry = 0, rz = 0, surf) { return this.add(G.ico(d), c, x, y, z, sx, sy, sz, rx, ry, rz, surf); }
  sph(c, x, y, z, sx, sy = sx, sz = sx, seg = 12, rx = 0, ry = 0, rz = 0, surf) { return this.add(G.sphere(seg, Math.max(6, Math.round(seg * 0.75))), c, x, y, z, sx, sy, sz, rx, ry, rz, surf); }
  hemi(c, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, surf) { return this.add(G.hemi(16), c, x, y, z, sx, sy, sz, rx, ry, rz, surf); }
  rock(c, x, y, z, sx, sy = sx, sz = sx, ry = 0) { return this.add(G.dodeca(), c, x, y, z, sx, sy, sz, 0.2, ry, 0.1, SURF.FINE); }
  // Треугольная призма: основание по y, вершина сверху, вытянута по z.
  prism(c, x, y, z, w, h, d, ry = 0, surf) { return this.add(G.prism(), c, x, y, z, w, h, d, 0, ry, 0, surf); }
  // Цилиндр между двумя точками (для конечностей, веток, проводов)
  limb(c, ax, ay, az, bx, by, bz, ra, rb, seg = 8, surf) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    return this.add(G.cyl(rb, ra, seg), c, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, 1, L, 1, e.x, e.y, e.z, surf);
  }

  get empty() { return this.parts.length === 0; }

  build() {
    if (!this.parts.length) return null;
    const g = mergeGeometries(this.parts, false);
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
  return new THREE.CanvasTexture(cv);
}

// Бесшовная текстура деталей: R — доски, G — земля, B — мелкий шум
function detailTexture() {
  const N = 256, img = new Uint8Array(N * N * 4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // периодический value-noise
  const grid = (per) => { const a = new Float32Array(per * per); for (let i = 0; i < a.length; i++) a[i] = rnd(); return a; };
  const smooth = (t) => t * t * (3 - 2 * t);
  const noise = (g, per, x, y) => {
    const fx = x * per / N, fy = y * per / N, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
    const v = (i, j) => g[((j % per + per) % per) * per + ((i % per + per) % per)];
    const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx, b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
  const g4 = grid(4), g8 = grid(8), g16 = grid(16), g32 = grid(32), g64 = grid(64), g128 = grid(128);
  const rows = 16, rowH = N / rows;
  const plankShade = Array.from({ length: rows }, () => 0.82 + rnd() * 0.3);
  const plankCut = Array.from({ length: rows }, () => Math.floor(rnd() * N));
  const R = new Float32Array(N * N), Gc = new Float32Array(N * N), B = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    // доски: горизонтальные ряды, щели, волокна, торцы
    const row = Math.floor(y / rowH), ry = y % rowH;
    let v = plankShade[row];
    v *= 0.85 + 0.3 * noise(g128, 128, x * 0.15, y * 3); // волокна вдоль доски
    v *= 0.9 + 0.2 * noise(g16, 16, x, y);
    if (ry < 1.5) v *= 0.35; else if (ry < 3) v *= 0.8;
    if (Math.abs(x - plankCut[row]) < 1.2) v *= 0.45;
    if (noise(g64, 64, x, y) > 0.86) v *= 0.7; // сучки
    R[i] = v;
    // земля: крупные пятна + песок + камешки
    let gr = 0.55 * noise(g4, 4, x, y) + 0.25 * noise(g16, 16, x, y) + 0.2 * noise(g64, 64, x, y);
    gr = 0.6 + gr * 0.6;
    if (noise(g128, 128, x, y) > 0.82) gr *= 0.8;
    if (noise(g32, 32, x, y) < 0.12) gr *= 1.12;
    Gc[i] = gr;
    // мелкий шум: ткань/камень
    B[i] = 0.75 + 0.3 * noise(g128, 128, x, y) + 0.15 * noise(g32, 32, x, y) + 0.1 * noise(g8, 8, x, y);
  }
  const norm = (a) => { let s = 0; for (const v of a) s += v; const m = s / a.length; for (let i = 0; i < a.length; i++) a[i] = Math.min(1, a[i] / m * 0.5); };
  norm(R); norm(Gc); norm(B);
  for (let i = 0; i < N * N; i++) { img[i * 4] = R[i] * 255; img[i * 4 + 1] = Gc[i] * 255; img[i * 4 + 2] = B[i] * 255; img[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(img, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function addDetail(mat, strength) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.detailMap = { value: TEX.detail };
    sh.uniforms.detailStr = { value: strength };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aDet;
varying float vDet; varying vec3 vWP; varying vec3 vWN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vec4 bcP = vec4(transformed, 1.0); vec3 bcN = objectNormal;
#ifdef USE_INSTANCING
  bcP = instanceMatrix * bcP; bcN = mat3(instanceMatrix) * bcN;
#endif
vWP = (modelMatrix * bcP).xyz; vWN = mat3(modelMatrix) * bcN; vDet = aDet;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D detailMap; uniform float detailStr;
varying float vDet; varying vec3 vWP; varying vec3 vWN;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 bw = abs(normalize(vWN)); bw = bw * bw; bw = bw * bw; bw /= (bw.x + bw.y + bw.z + 1e-4);
  float fine = texture2D(detailMap, vWP.zy * 1.1).b * bw.x + texture2D(detailMap, vWP.xz * 1.1).b * bw.y + texture2D(detailMap, vWP.xy * 1.1).b * bw.z;
  float d = fine;
  if (vDet > 0.5 && vDet < 1.5) {
    float pl = texture2D(detailMap, vWP.zy * 0.24).r * bw.x + texture2D(detailMap, vWP.xz * 0.24).r * bw.y + texture2D(detailMap, vWP.xy * 0.24).r * bw.z;
    d = pl * 0.8 + fine * 0.2;
  } else if (vDet > 1.5) {
    float g1 = texture2D(detailMap, vWP.xz * 0.045).g;
    float g2 = texture2D(detailMap, vWP.xz * 0.37).g;
    float g3 = texture2D(detailMap, vWP.xz * 1.9).b;
    d = 0.5 + (g1 * 0.45 + g2 * 0.35 + g3 * 0.2 - 0.5) * 1.8;
  }
  diffuseColor.rgb *= mix(1.0, d * 2.0, detailStr);
}`);
  };
  mat.customProgramCacheKey = () => 'bcdetail';
}

export function initMaterials(quality = 'medium') {
  TEX.detail = detailTexture();
  MAT.solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  if (quality !== 'low') addDetail(MAT.solid, 0.55);
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

// Небесный купол: градиент от горизонта к зениту и ореол солнца
export function makeSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color('#6a7f9a') }, horizon: { value: new THREE.Color('#c9a57e') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#ffe0b0') }, sunAmt: { value: 1 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(horizon, top, pow(h, 0.55));
      float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
      c += sunCol * (pow(s, 600.0) * 1.6 + pow(s, 12.0) * 0.25) * sunAmt;
      if (vDir.y < 0.0) c = horizon;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// Табличка с надписью (канва-текстура)
export function makeSign(text, w, h, opts = {}) {
  const cv = document.createElement('canvas');
  const scale = 64;
  cv.width = Math.min(1024, Math.round(w * scale)); cv.height = Math.round(h * scale);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = opts.bg || '#2b1d12'; ctx.fillRect(0, 0, cv.width, cv.height);
  // потёртые доски
  for (let y = 0; y < cv.height; y += 9) { ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.12})`; ctx.fillRect(0, y, cv.width, 1); }
  for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(255,240,200,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * cv.width, Math.random() * cv.height, 3 + Math.random() * 20, 1); }
  ctx.strokeStyle = opts.border || '#c9a868'; ctx.lineWidth = 4; ctx.strokeRect(5, 5, cv.width - 10, cv.height - 10);
  ctx.fillStyle = opts.fg || '#e9d6a8';
  let fs = Math.round(cv.height * 0.55);
  ctx.font = `bold ${fs}px Georgia, "Times New Roman", serif`;
  while (ctx.measureText(text).width > cv.width - 24 && fs > 10) { fs -= 2; ctx.font = `bold ${fs}px Georgia, "Times New Roman", serif`; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.92;
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
}
