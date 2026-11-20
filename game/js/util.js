'use strict';
// ---------- Общие утилиты ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  return d;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Выталкивает круг (o.x,o.y,r) из прямоугольника. true, если было пересечение.
function pushCircleRect(o, r, rx, ry, rw, rh) {
  if (o.x + r <= rx || o.x - r >= rx + rw || o.y + r <= ry || o.y - r >= ry + rh) return false;
  const cx = clamp(o.x, rx, rx + rw), cy = clamp(o.y, ry, ry + rh);
  const dx = o.x - cx, dy = o.y - cy, d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return false;
  if (d2 > 1e-6) {
    const d = Math.sqrt(d2), k = (r - d) / d;
    o.x += dx * k; o.y += dy * k;
  } else {
    const l = o.x - rx, rr = rx + rw - o.x, t = o.y - ry, b = ry + rh - o.y;
    const m = Math.min(l, rr, t, b);
    if (m === l) o.x = rx - r; else if (m === rr) o.x = rx + rw + r;
    else if (m === t) o.y = ry - r; else o.y = ry + rh + r;
  }
  return true;
}

function pushCircleCircle(o, r, cx, cy, cr) {
  const dx = o.x - cx, dy = o.y - cy, R = r + cr, d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return false;
  const d = Math.sqrt(d2) || 0.001, k = (R - d) / d;
  o.x += dx * k; o.y += dy * k;
  return true;
}

function distToRect(x, y, rx, ry, rw, rh) {
  return dist(x, y, clamp(x, rx, rx + rw), clamp(y, ry, ry + rh));
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Двоичная куча для Дейкстры
class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v, top = v[0];
    const lk = k.pop(), lv = v.pop(), n = k.length;
    if (n > 0) {
      let i = 0;
      while (true) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
  clear() { this.k.length = 0; this.v.length = 0; }
}
