// Генератор персонажа «Хранитель фонаря»: зеркальная симметрия, гладкие кривые, чистый cel-shading
const { smooth } = require('../../game/tools/art/lib');
const CX = 200, OUT = '#161316', W = 5;
let id = 0;
const mir = (pts) => { // правая половина сверху вниз → замкнутый симметричный контур
  const r = pts, l = pts.slice(1, -1).reverse().map(([x, y, s]) => [2 * CX - x, y, s]);
  return smooth(r.concat(l));
};
const P = (d, fill, o = {}) => `<path d="${d}" fill="${fill}" stroke="${o.stroke || OUT}" stroke-width="${o.w ?? W}" stroke-linejoin="round" stroke-linecap="round"${o.extra || ''}/>`;
// фигура с тенью внутри (clip)
function shaded(d, fill, shadowD, shadowCol, extraInside = '') {
  const c = 'c' + (id++);
  return `<clipPath id="${c}"><path d="${d}"/></clipPath><path d="${d}" fill="${fill}"/>` +
    `<g clip-path="url(#${c})">${shadowD ? `<path d="${shadowD}" fill="${shadowCol}"/>` : ''}${extraInside}</g>` + P(d, 'none');
}
const line = (d, w = 2.6, col = OUT) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (x, y, r, fill, w = W) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${OUT}" stroke-width="${w}"/>`;

// палитра
const C = {
  cloak: '#b4512d', cloakS: '#873a1f', mantle: '#cf6b3c', mantleS: '#a64c26',
  tunic: '#5f7486', tunicS: '#47586a', leather: '#6b4429', leatherS: '#4f301c', brass: '#d9b04e', brassS: '#a8822e',
  dark: '#29252e', face: '#2b2733', eye: '#f6d35a', feather: '#ead6a6', featherS: '#c9b07a', wood: '#8a6440', woodS: '#654629',
  glass: '#cfe8e2', glow: '#fff1b0', patch: '#6f8350',
};

let s = '';
// мягкое свечение фонаря
s += `<defs><radialGradient id="glow"><stop offset="0" stop-color="#fff3b8" stop-opacity="0.95"/><stop offset="1" stop-color="#fff3b8" stop-opacity="0"/></radialGradient></defs>`;
s += `<ellipse cx="${CX}" cy="446" rx="118" ry="11" fill="#e9e6e1"/>`;
s += `<circle cx="66" cy="132" r="62" fill="url(#glow)"/>`;

// --- плащ сзади ---
const cloak = mir([[CX, 196], [262, 206], [300, 236], [322, 300], [338, 372], [346, 418, 1], [322, 410, 1], [306, 426, 1], [282, 412, 1], [262, 428, 1], [240, 414, 1], [CX, 422, 1]]);
s += shaded(cloak, C.cloak, `M${CX + 52} 150 L360 150 L360 440 L${CX + 52} 440 Z`, C.cloakS,
  line('M120 270 Q104 340 98 400') + line('M280 270 Q296 340 302 400') + line('M146 300 Q140 360 142 412', 2.2));
// заплатка
s += P('M72 338 L102 332 L106 362 L76 368 Z', C.patch, { w: 3.6 }) + line('M78 342 l4 4 M86 340 l4 4 M94 338 l4 4 M80 360 l4 4 M90 358 l4 4', 2);

// --- ноги ---
for (const sx of [-1, 1]) {
  const x = CX + sx * 30;
  const boot = smooth([[x - 16 * sx, 396, 1], [x + 16 * sx, 396, 1], [x + 17 * sx, 420], [x + 24 * sx, 432], [x + 22 * sx, 442, 1], [x - 18 * sx, 442, 1], [x - 18 * sx, 422]]);
  s += shaded(boot, C.dark, `M${x - 20} 432 L${x + 30} 432 L${x + 30} 446 L${x - 20} 446 Z`, '#151317');
}

// --- туловище ---
const body = mir([[CX, 236], [244, 240], [266, 284], [272, 340], [264, 396], [CX, 404]]);
s += shaded(body, C.tunic, `M240 230 Q268 320 252 410 L300 410 L300 230 Z`, C.tunicS,
  line(`M${CX} 262 L${CX} 330`, 2.6) + [276, 300].map((y) => circ(CX + 9, y, 3.6, C.brass, 2.4)).join('') +
  // пояс
  `<path d="M100 330 L300 330 L300 354 L100 354 Z" fill="${C.leather}" stroke="${OUT}" stroke-width="3.4"/>` + `<path d="M100 348 L300 348 L300 354 L100 354 Z" fill="${C.leatherS}"/>`);
// ремень через грудь
s += P('M142 254 L232 328 L218 330 L132 266 Z', C.leather, { w: 3.6 }) + circ(192, 298, 6, C.brass, 3);

s += P('M184 324 L216 324 Q220 324 220 328 L220 356 Q220 360 216 360 L184 360 Q180 360 180 356 L180 328 Q180 324 184 324 Z', C.brass, { w: 4 });
s += P('M192 333 L208 333 L208 351 L192 351 Z', C.leather, { w: 3 });
// --- сумка на поясе и бутылочка ---
s += shaded(smooth([[132, 348, 1], [172, 348, 1], [174, 384], [152, 396], [130, 384]]), C.leather, 'M160 340 L180 340 L180 400 L160 400 Z', C.leatherS);
s += P(smooth([[130, 346, 1], [174, 346, 1], [174, 362], [152, 370], [130, 362]]), '#7a5032', { w: 3.6 }) + circ(152, 364, 3.6, C.brass, 2.2);
s += line('M246 354 L246 364', 3);
s += shaded(smooth([[238, 370], [254, 370], [260, 388], [246, 400], [232, 388]]), '#7cc2b4', 'M248 360 L270 360 L270 404 L248 404 Z', '#5a9a8e',
  '<path d="M236 380 Q246 376 258 380 L262 404 L230 404 Z" fill="#9fd8cc" opacity="0.6"/>');
s += P('M240 362 L252 362 L252 371 L240 371 Z', C.leather, { w: 3 });
s += line('M238 384 Q240 378 244 376', 2.4, '#ffffff');

// --- посох и фонарь (за левой рукой) ---
const staff = 'M100 446 L100 138 C100 100 98 82 84 70 C70 58 52 64 52 80 C52 90 58 96 64 96';
s += line(staff, 14, OUT) + line(staff, 7.5, C.wood) + line('M103 440 L103 150', 2, C.woodS);
s += line('M64 96 L64 110', 3);
s += P('M50 110 L78 110 L82 120 L46 120 Z', C.dark, { w: 4 });
s += shaded('M50 120 L78 120 L76 162 L52 162 Z', '#ffd55a', 'M66 118 L82 118 L82 166 L66 166 Z', '#f2b83e', '<path d="M56 126 L58 156" stroke="#fff8d8" stroke-width="3" stroke-linecap="round"/>');
s += line('M64 120 L64 162 M51 141 L77 141', 2.6);
s += P('M46 162 L82 162 L78 172 L50 172 Z', C.dark, { w: 4 });

// --- руки ---
for (const sx of [-1, 1]) {
  const sleeve = smooth([[CX + sx * 70, 248], [CX + sx * 92, 268], [CX + sx * 104, 306], [CX + sx * 104, 330, 1], [CX + sx * 78, 330, 1], [CX + sx * 76, 300], [CX + sx * 66, 272]]);
  s += shaded(sleeve, C.cloak, sx > 0 ? `M${CX + 88} 240 L320 240 L320 340 L${CX + 88} 340 Z` : '', C.cloakS);
}
// банка с мотыльком в правой руке
s += shaded(smooth([[282, 352, 1], [312, 352, 1], [314, 390], [306, 398, 1], [288, 398, 1], [280, 390]]), C.glass, 'M300 346 L320 346 L320 402 L300 402 Z', '#a9cdc6',
  `<circle cx="297" cy="378" r="12" fill="#fff6c8" opacity="0.9"/>` + line('M287 366 L288 388', 3, '#ffffff'));
s += `<path d="M291 378 Q284 368 290 364 Q296 370 296 378 Z M303 378 Q310 368 304 364 Q298 370 298 378 Z" fill="${C.feather}" stroke="${OUT}" stroke-width="1.6"/>` + line('M297 370 L297 384', 2.2);
s += P('M284 344 L310 344 L310 354 L284 354 Z', C.wood, { w: 3.4 });
s += circ(96, 334, 15, C.dark) + line('M86 330 Q96 326 106 330', 2.2, '#4a4552');
s += circ(296, 336, 14, C.dark) + line('M287 332 Q296 328 305 332', 2.2, '#4a4552');

// --- накидка с фестонами ---
let m = `M${CX} 180 C246 182 290 196 308 236`;
const lobes = [308, 278, 248, 218, 182, 152, 122, 92];
for (let i = 0; i < lobes.length - 1; i++) { const a = lobes[i], b = lobes[i + 1], mid = (a + b) / 2; m += ` Q${mid} ${i === 0 || i === lobes.length - 2 ? 266 : 278} ${b} ${i === lobes.length - 2 ? 236 : 252}`; }
m += ` C110 196 154 182 ${CX} 180 Z`;
s += shaded(m, C.mantle, 'M236 170 Q270 210 252 280 L320 280 L320 170 Z', C.mantleS,
  line('M140 214 Q146 236 136 256 M260 214 Q254 236 264 256', 2.4));
s += circ(CX, 240, 12, C.brass, 4) + circ(CX, 240, 5, C.brassS, 2.4);

// --- антенны-перья ---
function antenna(sx) {
  const b = [CX + sx * 22, 62], c = [CX + sx * 44, 6], t = [CX + sx * 78, 4];
  const pt = (k) => [(1 - k) ** 2 * b[0] + 2 * (1 - k) * k * c[0] + k * k * t[0], (1 - k) ** 2 * b[1] + 2 * (1 - k) * k * c[1] + k * k * t[1]];
  const L = [], R = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12, [x, y] = pt(k), [x2, y2] = pt(Math.min(1, k + 0.01));
    const a = Math.atan2(y2 - y, x2 - x), wdt = 13 * Math.sin(Math.PI * Math.min(1, k * 1.08)) + 2;
    L.push([x + Math.cos(a - Math.PI / 2) * wdt, y + Math.sin(a - Math.PI / 2) * wdt]);
    R.push([x + Math.cos(a + Math.PI / 2) * wdt, y + Math.sin(a + Math.PI / 2) * wdt]);
  }
  const d = smooth(L.concat(R.reverse()));
  let barbs = '';
  for (let i = 2; i <= 10; i++) { const k = i / 12, [x, y] = pt(k), [x2, y2] = pt(k + 0.01), a = Math.atan2(y2 - y, x2 - x); for (const sg of [-1, 1]) { const w2 = 11 * Math.sin(Math.PI * k); barbs += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + Math.cos(a + sg * 2.1) * w2).toFixed(1)} ${(y + Math.sin(a + sg * 2.1) * w2).toFixed(1)}`; } }
  let spine = 'M' + [0, 0.25, 0.5, 0.75, 1].map((k) => pt(k).map((v) => v.toFixed(1)).join(' ')).join(' L');
  return shaded(d, C.feather, null, null, line(barbs, 2, C.featherS)) + line(spine, 2.4);
}
s += antenna(-1) + antenna(1);

// --- капюшон и лицо ---
const hood = mir([[CX, 40], [236, 46], [262, 76], [274, 122], [268, 162], [248, 186], [CX, 194]]);
s += shaded(hood, C.cloak, 'M236 30 Q284 110 244 200 L300 200 L300 30 Z', C.cloakS,
  line('M150 70 Q140 90 138 112', 3.6, '#d77a4c'));
const faceD = mir([[CX, 80], [226, 86], [244, 112], [244, 144], [230, 166], [CX, 174]]);
s += shaded(faceD, C.face, `M${CX} 70 L250 70 L250 180 L${CX} 180 Z`, '#221e29');
for (const sx of [-1, 1]) {
  const ex = CX + sx * 19;
  s += circ(ex, 128, 12.5, C.eye, 4);
  s += `<circle cx="${ex + 4}" cy="124" r="4" fill="#ffffff"/>`;
}
// мотыльки-огоньки
for (const [x, y, k] of [[332, 92, 1], [30, 210, 0.8], [354, 196, 0.7]]) {
  s += `<circle cx="${x}" cy="${y}" r="${13 * k}" fill="#fff3b8" opacity="0.55"/><circle cx="${x}" cy="${y}" r="${4 * k}" fill="#fff8d8"/>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="940" viewBox="0 -14 400 470"><rect x="0" y="-14" width="400" height="470" fill="#ffffff"/>${s}</svg>`;
require('fs').writeFileSync(__dirname + '/../moth_keeper.svg', svg);
console.log('ok');
