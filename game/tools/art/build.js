'use strict';
// Сборка векторной графики: node tools/art/build.js
// Пишет game/art/*.svg (для редактирования в Inkscape/Illustrator) и game/js/artdata.js (для игры).
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const out = {};
const mods = ['chars', 'creatures', 'nature', 'props'];
for (const m of mods) {
  const p = path.join(__dirname, m + '.js');
  if (fs.existsSync(p)) require(p).build(out);
}
const artDir = path.join(ROOT, 'art');
fs.mkdirSync(artDir, { recursive: true });
for (const f of fs.readdirSync(artDir)) if (f.endsWith('.svg')) fs.unlinkSync(path.join(artDir, f));
for (const [k, v] of Object.entries(out)) fs.writeFileSync(path.join(artDir, k + '.svg'), v);
const js = "'use strict';\n// Сгенерировано tools/art/build.js — не редактировать вручную.\nconst ART_SVG = " + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(ROOT, 'js', 'artdata.js'), js);
// лист предпросмотра
const sc = Number(process.env.SCALE || 3);
const filter = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
let html = '<html><body style="margin:0;background:#2c3026;font:11px sans-serif;color:#ddd;display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px;padding:10px">';
for (const [k, v] of Object.entries(out)) {
  if (filter && !filter.test(k)) continue;
  const m = v.match(/width="([\d.]+)" height="([\d.]+)"/);
  html += `<div style="text-align:center"><img src="data:image/svg+xml;utf8,${encodeURIComponent(v)}" width="${m[1] * sc}" height="${m[2] * sc}"><br>${k}</div>`;
}
fs.writeFileSync(process.env.PREVIEW || '/tmp/art-preview.html', html + '</body></html>');
// постоянный лист со всеми ассетами (открывается из папки art/)
let sheet = '<!doctype html><meta charset="utf-8"><title>Shattered Dawn — графика</title><body style="margin:0;background:#2c3026;font:12px sans-serif;color:#ddd;display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px;padding:14px">';
for (const [k, v] of Object.entries(out)) {
  const m = v.match(/width="([\d.]+)" height="([\d.]+)"/);
  sheet += `<div style="text-align:center"><img src="${k}.svg" width="${m[1] * 2.5}" height="${m[2] * 2.5}"><br>${k}</div>`;
}
fs.writeFileSync(path.join(artDir, 'index.html'), sheet + '</body>');
console.log('assets:', Object.keys(out).length, 'bytes:', js.length);
