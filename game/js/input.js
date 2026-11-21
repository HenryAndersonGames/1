'use strict';
// ---------- Ввод: 2 геймпада + клавиатура (запасной вариант) ----------
const Input = (() => {
  const keys = new Set(), hits = new Set(); // hits — нажатия между опросами (не теряются при просадке кадров)
  const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Slash', 'Quote', 'F2', 'F3']);
  addEventListener('keydown', (e) => {
    keys.add(e.code); hits.add(e.code);
    if (PREVENT.has(e.code)) e.preventDefault();
    if (typeof Sfx !== 'undefined') Sfx.unlock();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('mousedown', () => { if (typeof Sfx !== 'undefined') Sfx.unlock(); });
  addEventListener('blur', () => keys.clear());

  // Раскладки клавиатуры для двух игроков
  const KB = [
    { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      light: ['KeyJ', 'KeyF'], heavy: ['KeyK', 'KeyG'], roll: ['Space', 'ShiftLeft'], interact: ['KeyE'], build: ['KeyQ'],
      trap: ['KeyR'], heal: ['KeyH', 'KeyC'], eat: ['KeyV'], swap: ['KeyT'], ab1: ['KeyU', 'Digit1'], ab2: ['KeyI', 'Digit2'], ab3: ['KeyO', 'Digit3'], ab4: ['KeyL', 'Digit4'], ab5: ['KeyP', 'Digit5'], menu: ['Tab'], start: ['Escape', 'Enter'] },
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      light: ['Numpad1', 'KeyM'], heavy: ['Numpad2', 'Comma'], roll: ['Numpad3', 'Period'], interact: ['Numpad0', 'Slash'], build: ['Numpad4'],
      trap: ['Numpad5'], heal: ['Numpad6'], eat: ['NumpadSubtract'], swap: ['NumpadMultiply'], ab1: ['Numpad7'], ab2: ['Numpad8'], ab3: ['Numpad9'], ab4: ['NumpadDecimal'], ab5: ['NumpadDivide'], menu: ['NumpadAdd', 'Quote'], start: ['NumpadEnter'] },
  ];
  // Геймпад (Xbox): A=0 B=1 X=2 Y=3 LB=4 RB=5 LT=6 RT=7 Back=8 Start=9
  // X — лёгкая атака, Y — тяжёлая, A — действие, B — перекат,
  // LB / RB / RT — три слота особых способностей, LT — бинт, крестовина ← баррикада, → ловушка
  const PAD = { light: [2], heavy: [3], roll: [1], interact: [0], ab1: [4], ab2: [5], ab3: [7], ab4: [10], ab5: [11], heal: [6], swap: [12], eat: [13], build: [14], trap: [15], menu: [8], start: [9] };
  const BTN = ['light', 'heavy', 'roll', 'interact', 'build', 'trap', 'heal', 'eat', 'swap', 'ab1', 'ab2', 'ab3', 'ab4', 'ab5', 'menu', 'start'];
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
      const k = (a) => kb[a].some((code) => keys.has(code) || hits.has(code));
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
        if (b(12)) down.up = true;
        if (b(13)) down.down = true;
        if (b(14)) down.left = true;
        if (b(15)) down.right = true;
        if (y < -0.6) down.up = true; if (y > 0.6) down.down = true;
        if (x < -0.6) down.left = true; if (x > 0.6) down.right = true;
      }
      const m = Math.hypot(mx, my);
      if (m > 1) { mx /= m; my /= m; }
      c.mx = mx; c.my = my; c.ax = ax; c.ay = ay;
      for (const a of ALL) { c.pressed[a] = !!down[a] && !c.prev[a]; c.prev[a] = !!down[a]; }
      c.down = down;
    }
    hits.clear();
  }

  // Название кнопки для подсказок
  const PADNAME = { light: 'X', heavy: 'Y', roll: 'B', interact: 'A', build: '◀', trap: '▶', heal: 'LT', eat: '▼', swap: '▲', ab1: 'LB', ab2: 'RB', ab3: 'RT', ab4: 'L3', ab5: 'R3', menu: 'Back', start: 'Start' };
  const KBNAME = [
    { light: 'J', heavy: 'K', roll: 'Пробел', interact: 'E', build: 'Q', trap: 'R', heal: 'H', eat: 'V', swap: 'T', ab1: 'U', ab2: 'I', ab3: 'O', ab4: 'L', ab5: 'P', menu: 'Tab', start: 'Enter' },
    { light: 'Num1', heavy: 'Num2', roll: 'Num3', interact: 'Num0', build: 'Num4', trap: 'Num5', heal: 'Num6', eat: 'Num−', swap: 'Num*', ab1: 'Num7', ab2: 'Num8', ab3: 'Num9', ab4: 'Num.', ab5: 'Num/', menu: 'Num+', start: 'NumEnter' },
  ];
  function btn(i, action) { return ctrls[i].pad ? PADNAME[action] : KBNAME[i][action]; }
  function anyPressed(action) { return ctrls[0].pressed[action] || ctrls[1].pressed[action]; }

  return { update, ctrls, btn, anyPressed, padCount: () => pads.length, keys };
})();
