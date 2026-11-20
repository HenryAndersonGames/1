'use strict';
// ---------- Ввод: 2 геймпада + клавиатура (запасной вариант) ----------
const Input = (() => {
  const keys = new Set();
  const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Slash', 'Quote']);
  addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (PREVENT.has(e.code)) e.preventDefault();
    if (typeof Sfx !== 'undefined') Sfx.unlock();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('mousedown', () => { if (typeof Sfx !== 'undefined') Sfx.unlock(); });
  addEventListener('blur', () => keys.clear());

  // Раскладки клавиатуры для двух игроков
  const KB = [
    { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      attack: ['Space', 'KeyF'], roll: ['ShiftLeft', 'KeyG'], interact: ['KeyE'], build: ['KeyQ'],
      trap: ['KeyZ'], menu: ['Tab'], start: ['Escape', 'Enter'] },
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      attack: ['Numpad1', 'KeyM'], roll: ['Numpad2', 'Comma'], interact: ['Numpad3', 'Period'], build: ['Numpad0', 'Slash'],
      trap: ['NumpadDecimal', 'KeyN'], menu: ['NumpadAdd', 'Quote'], start: ['NumpadEnter'] },
  ];
  // Стандартная раскладка геймпада (Xbox): A=0 B=1 X=2 Y=3 LB=4 RB=5 LT=6 RT=7 Back=8 Start=9
  const PAD = { attack: [0, 5, 7], roll: [1, 6], interact: [2], build: [3], trap: [4], menu: [8], start: [9] };
  const BTN = ['attack', 'roll', 'interact', 'build', 'trap', 'menu', 'start'];
  const ALL = BTN.concat(['up', 'down', 'left', 'right']);

  const mk = () => ({ mx: 0, my: 0, ax: 0, ay: 0, pad: null, down: {}, prev: {}, pressed: {} });
  const ctrls = [mk(), mk()];
  let pads = [];

  function update() {
    pads = [];
    if (navigator.getGamepads) {
      for (const p of navigator.getGamepads()) if (p && p.connected) pads.push(p);
    }
    for (let i = 0; i < 2; i++) {
      const c = ctrls[i], kb = KB[i], pad = pads[i] || null;
      c.pad = pad;
      const k = (a) => kb[a].some((code) => keys.has(code));
      const down = {};
      for (const a of ALL) down[a] = k(a);
      let mx = 0, my = 0, ax = 0, ay = 0;
      if (down.left) mx -= 1; if (down.right) mx += 1;
      if (down.up) my -= 1; if (down.down) my += 1;
      if (pad) {
        const x = pad.axes[0] || 0, y = pad.axes[1] || 0, m = Math.hypot(x, y);
        if (m > 0.22) { const s = Math.min(1, (m - 0.22) / 0.7) / m; mx += x * s; my += y * s; }
        const rx = pad.axes[2] || 0, ry = pad.axes[3] || 0;
        if (Math.hypot(rx, ry) > 0.45) { ax = rx; ay = ry; }
        const b = (j) => pad.buttons[j] && (pad.buttons[j].pressed || pad.buttons[j].value > 0.5);
        for (const a of BTN) if (PAD[a].some(b)) down[a] = true;
        if (b(12)) { down.up = true; my -= 1; }
        if (b(13)) { down.down = true; my += 1; }
        if (b(14)) { down.left = true; mx -= 1; }
        if (b(15)) { down.right = true; mx += 1; }
        if (y < -0.6) down.up = true; if (y > 0.6) down.down = true;
        if (x < -0.6) down.left = true; if (x > 0.6) down.right = true;
      }
      const m = Math.hypot(mx, my);
      if (m > 1) { mx /= m; my /= m; }
      c.mx = mx; c.my = my; c.ax = ax; c.ay = ay;
      for (const a of ALL) { c.pressed[a] = !!down[a] && !c.prev[a]; c.prev[a] = !!down[a]; }
      c.down = down;
    }
  }

  // Название кнопки для подсказок
  const PADNAME = { attack: 'A', roll: 'B', interact: 'X', build: 'Y', trap: 'LB', menu: 'Back', start: 'Start' };
  const KBNAME = [
    { attack: 'Пробел', roll: 'Shift', interact: 'E', build: 'Q', trap: 'Z', menu: 'Tab', start: 'Enter' },
    { attack: 'Num1', roll: 'Num2', interact: 'Num3', build: 'Num0', trap: 'Num.', menu: 'Num+', start: 'NumEnter' },
  ];
  function btn(i, action) { return ctrls[i].pad ? PADNAME[action] : KBNAME[i][action]; }
  function anyPressed(action) { return ctrls[0].pressed[action] || ctrls[1].pressed[action]; }

  return { update, ctrls, btn, anyPressed, padCount: () => pads.length, keys };
})();
