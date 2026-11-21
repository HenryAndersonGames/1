// Постобработка (WebGL1-совместимая): SSAO, свечение, FXAA, нуарная цветокоррекция, виньетка, зерно.
// Сцена рендерится в текстуру уже с тонмаппингом (как на экран), затем один составной проход.
import * as THREE from 'three';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const AO_FRAG = (N) => `
precision highp float;
varying vec2 vUv;
uniform sampler2D tDepth; uniform vec2 res; uniform float near; uniform float far; uniform vec2 projXY; uniform float radius; uniform float time;
float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return (near * far) / ((far - near) * d - far); }
vec3 viewPos(vec2 uv){ float z = viewZ(uv); return vec3((uv * 2.0 - 1.0) * projXY * -z, z); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  float d = texture2D(tDepth, vUv).x;
  if (d >= 0.9999) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  vec2 px = 1.0 / res;
  vec3 pr = viewPos(vUv + vec2(px.x, 0.0)), pl = viewPos(vUv - vec2(px.x, 0.0));
  vec3 pu = viewPos(vUv + vec2(0.0, px.y)), pd = viewPos(vUv - vec2(0.0, px.y));
  vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl;
  vec3 dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
  vec3 n = normalize(cross(dx, dy));
  float rs = radius / (-P.z) / projXY.y * 0.5;
  float a0 = hash(vUv * res + time) * 6.2831;
  float ao = 0.0;
  for (int i = 0; i < ${N}; i++) {
    float fi = float(i);
    float a = a0 + fi * 2.39996;
    float r = rs * (0.2 + 0.8 * fract(fi * 0.618 + hash(vUv * 7.0 + fi)));
    vec2 suv = vUv + vec2(cos(a), sin(a)) * r;
    vec3 S = viewPos(suv);
    vec3 v = S - P;
    float vv = dot(v, v);
    ao += max(0.0, dot(v, n) - 0.02 * -P.z) / (vv + 0.02) * smoothstep(radius * radius * 4.0, 0.0, vv);
  }
  ao = clamp(1.0 - ao * 1.6 / float(${N}), 0.0, 1.0);
  ao = mix(ao, 1.0, smoothstep(40.0, 70.0, -P.z));
  gl_FragColor = vec4(vec3(ao), 1.0);
}`;

const BRIGHT_FRAG = `
precision highp float; varying vec2 vUv; uniform sampler2D tScene; uniform float threshold; uniform vec2 px;
void main(){
  vec3 c = (texture2D(tScene, vUv + vec2(-px.x, -px.y)).rgb + texture2D(tScene, vUv + vec2(px.x, -px.y)).rgb
          + texture2D(tScene, vUv + vec2(-px.x, px.y)).rgb + texture2D(tScene, vUv + vec2(px.x, px.y)).rgb) * 0.25;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(threshold, threshold + 0.25, l), 1.0);
}`;

const BLUR_FRAG = `
precision highp float; varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 dir;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
  c += (texture2D(tSrc, vUv + dir * 1.384).rgb + texture2D(tSrc, vUv - dir * 1.384).rgb) * 0.316;
  c += (texture2D(tSrc, vUv + dir * 3.23).rgb + texture2D(tSrc, vUv - dir * 3.23).rgb) * 0.07;
  gl_FragColor = vec4(c, 1.0);
}`;

const COMP_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene; uniform sampler2D tAO; uniform sampler2D tBloom;
uniform vec2 res; uniform vec2 aoPx; uniform float time; uniform float useAO; uniform float aoStr; uniform float bloomStr;
uniform float sat; uniform float contrast; uniform vec3 shadowTint; uniform vec3 highTint; uniform float vignette; uniform float grain; uniform float lift;
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 fxaa(vec2 uv){
  vec2 px = 1.0 / res;
  vec3 nw = texture2D(tScene, uv + vec2(-1.0, -1.0) * px).rgb, ne = texture2D(tScene, uv + vec2(1.0, -1.0) * px).rgb;
  vec3 sw = texture2D(tScene, uv + vec2(-1.0, 1.0) * px).rgb, se = texture2D(tScene, uv + vec2(1.0, 1.0) * px).rgb;
  vec3 m = texture2D(tScene, uv).rgb;
  float lnw = lum(nw), lne = lum(ne), lsw = lum(sw), lse = lum(se), lm = lum(m);
  float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));
  if (lmax - lmin < max(0.04, lmax * 0.12)) return m;
  vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), ((lnw + lsw) - (lne + lse)));
  float red = max((lnw + lne + lsw + lse) * 0.03125, 0.0078125);
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir * rcp, -8.0, 8.0) * px;
  vec3 a = 0.5 * (texture2D(tScene, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tScene, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tScene, uv - dir * 0.5).rgb + texture2D(tScene, uv + dir * 0.5).rgb);
  float lb = lum(b);
  return (lb < lmin || lb > lmax) ? a : b;
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 c = fxaa(vUv);
  if (useAO > 0.5) {
    float ao = texture2D(tAO, vUv).r * 0.4;
    ao += (texture2D(tAO, vUv + vec2(aoPx.x, 0.0)).r + texture2D(tAO, vUv - vec2(aoPx.x, 0.0)).r + texture2D(tAO, vUv + vec2(0.0, aoPx.y)).r + texture2D(tAO, vUv - vec2(0.0, aoPx.y)).r) * 0.15;
    c *= mix(1.0, ao, aoStr);
  }
  c += texture2D(tBloom, vUv).rgb * bloomStr;
  // нуарная цветокоррекция
  float l = lum(c);
  c = mix(vec3(l), c, sat);
  c = mix(c, c * shadowTint, (1.0 - smoothstep(0.0, 0.5, l)) * 0.6);
  c = mix(c, c * highTint, smoothstep(0.45, 1.0, l) * 0.5);
  c = clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0);
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.35);
  c = c * (1.0 - lift) + lift;
  vec2 q = vUv - 0.5; q.x *= res.x / res.y;
  c *= mix(1.0, smoothstep(1.05, 0.25, length(q)), vignette);
  c += (hash(vUv * res + fract(time * 13.1) * 100.0) - 0.5) * grain;
  gl_FragColor = vec4(c, 1.0);
}`;

export class Post {
  constructor(renderer, quality) {
    this.r = renderer;
    this.quality = quality;
    this.enabled = quality !== 'low';
    const caps = renderer.capabilities;
    this.ao = this.enabled && (caps.isWebGL2 || renderer.extensions.has('WEBGL_depth_texture'));
    this.scale = quality === 'high' ? 1.0 : 0.8;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.qscene = new THREE.Scene(); this.qscene.add(this.quad);
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    if (!this.enabled) return;
    const opt = { type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false };
    this.rtScene = new THREE.WebGLRenderTarget(4, 4, opt);
    this.rtScene.texture.colorSpace = THREE.SRGBColorSpace;
    this.rtScene.isXRRenderTarget = true; // заставляет three применить тонмаппинг и sRGB, как при выводе на экран
    if (this.ao) { this.rtScene.depthTexture = new THREE.DepthTexture(4, 4); this.rtScene.depthTexture.type = THREE.UnsignedIntType; }
    const small = { type: THREE.UnsignedByteType, depthBuffer: false, stencilBuffer: false };
    this.rtAO = new THREE.WebGLRenderTarget(4, 4, small);
    this.rtB1 = new THREE.WebGLRenderTarget(4, 4, small);
    this.rtB2 = new THREE.WebGLRenderTarget(4, 4, small);
    const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.mAO = mat(AO_FRAG(quality === 'high' ? 12 : 7), {
      tDepth: { value: this.ao ? this.rtScene.depthTexture : null }, res: { value: new THREE.Vector2() }, near: { value: 0.5 }, far: { value: 300 },
      projXY: { value: new THREE.Vector2(1, 1) }, radius: { value: 1.1 }, time: { value: 0 },
    });
    this.mBright = mat(BRIGHT_FRAG, { tScene: { value: this.rtScene.texture }, threshold: { value: 0.72 }, px: { value: new THREE.Vector2() } });
    this.mBlur = mat(BLUR_FRAG, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
    this.mComp = mat(COMP_FRAG, {
      tScene: { value: this.rtScene.texture }, tAO: { value: this.rtAO.texture }, tBloom: { value: this.rtB1.texture },
      res: { value: new THREE.Vector2() }, aoPx: { value: new THREE.Vector2() }, time: { value: 0 }, useAO: { value: this.ao ? 1 : 0 }, aoStr: { value: 0.85 }, bloomStr: { value: 0.55 },
      sat: { value: 0.7 }, contrast: { value: 1.12 }, shadowTint: { value: new THREE.Color(0.82, 0.92, 1.05) }, highTint: { value: new THREE.Color(1.08, 1.0, 0.86) },
      vignette: { value: 0.55 }, grain: { value: 0.045 }, lift: { value: 0.025 },
    });
  }
  setSize(w, h) {
    if (!this.enabled) return;
    const W = Math.max(4, Math.round(w * this.scale)), H = Math.max(4, Math.round(h * this.scale));
    this.W = W; this.H = H;
    this.rtScene.setSize(W, H);
    const aw = Math.round(W / 2), ah = Math.round(H / 2), bw = Math.round(W / 4), bh = Math.round(H / 4);
    this.rtAO.setSize(aw, ah); this.rtB1.setSize(bw, bh); this.rtB2.setSize(bw, bh);
    this.mAO.uniforms.res.value.set(aw, ah);
    this.mComp.uniforms.res.value.set(W, H);
    this.mComp.uniforms.aoPx.value.set(1 / aw, 1 / ah);
    this.mBright.uniforms.px.value.set(1 / W, 1 / H);
    this.bw = bw; this.bh = bh;
  }
  // параметры цветокоррекции в зависимости от времени суток
  grade(night, eclipse) {
    if (!this.enabled) return;
    const u = this.mComp.uniforms;
    u.sat.value = 0.74 - night * 0.3 - eclipse * 0.1;
    u.contrast.value = 1.1 + night * 0.12;
    u.shadowTint.value.setRGB(0.84 - night * 0.08 + eclipse * 0.3, 0.92 - eclipse * 0.25, 1.04 + night * 0.12 - eclipse * 0.3);
    u.highTint.value.setRGB(1.08 + eclipse * 0.15, 1.0 - night * 0.03 - eclipse * 0.2, 0.86 + night * 0.08 - eclipse * 0.2);
    u.bloomStr.value = 0.45 + night * 0.55;
    this.mBright.uniforms.threshold.value = 0.74 - night * 0.18;
    u.vignette.value = 0.5 + night * 0.25;
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qscene, this.qcam); }
  render(scene, camera, time) {
    const r = this.r;
    if (!this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);
    if (this.ao) {
      const u = this.mAO.uniforms;
      u.near.value = camera.near; u.far.value = camera.far; u.time.value = time % 10;
      const ty = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      u.projXY.value.set(ty * camera.aspect, ty);
      this.pass(this.mAO, this.rtAO);
    }
    this.pass(this.mBright, this.rtB1);
    const b = this.mBlur.uniforms;
    for (let i = 0; i < 2; i++) {
      b.tSrc.value = this.rtB1.texture; b.dir.value.set((1 + i) / this.bw, 0); this.pass(this.mBlur, this.rtB2);
      b.tSrc.value = this.rtB2.texture; b.dir.value.set(0, (1 + i) / this.bh); this.pass(this.mBlur, this.rtB1);
    }
    this.mComp.uniforms.time.value = time;
    this.pass(this.mComp, null);
  }
}
