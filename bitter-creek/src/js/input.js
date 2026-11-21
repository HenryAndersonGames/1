// Ввод: клавиатура, мышь, до двух геймпадов (XInput / стандартная раскладка).
// Игрок 1: WASD + мышь (+ геймпад 1). Игрок 2: стрелки (+ геймпад 2, или геймпад 1, если у первого его нет).

const KB = {
  wasd: {
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], run: ['ShiftLeft'],
    shoot: ['Space'], punch: ['KeyF'], interact: ['KeyE'], reload: ['KeyR'], swap: ['KeyQ'],
    camL: ['KeyZ'], camR: ['KeyC'], book: ['Tab', 'KeyJ'], pause: ['Escape'], call: ['KeyH'],
  },
  arrows: {
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], run: ['ShiftRight'],
    shoot: ['ControlRight', 'Numpad0'], punch: ['Slash', 'Numpad1'], interact: ['Enter', 'NumpadEnter'], reload: ['Period', 'Numpad2'], swap: ['Comma', 'Numpad3'],
    camL: ['BracketLeft'], camR: ['BracketRight'], book: ['Backslash', 'NumpadAdd'], pause: ['Backspace'], call: ['Quote', 'Numpad4'],
  },
};
// Кнопки стандартного геймпада
const PB = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, ndcX: 0, ndcY: 0, moved: -1e9, down: [false, false, false], clicked: [false, false, false] };
    this.pads = [];
    this.prevBtn = {};
    this.lastDevice = ['kb', 'kb'];
    this.numPlayers = 1;
    this.navRepeat = {};
    addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Slash'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      this.mouse.ndcX = e.clientX / innerWidth * 2 - 1; this.mouse.ndcY = -(e.clientY / innerHeight * 2 - 1);
      this.mouse.moved = performance.now();
    });
    canvas.addEventListener('mousedown', (e) => { this.mouse.down[e.button] = true; this.mouse.clicked[e.button] = true; this.mouse.moved = performance.now(); });
    addEventListener('mouseup', (e) => { this.mouse.down[e.button] = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  poll() {
    const raw = navigator.getGamepads ? navigator.getGamepads() : [];
    const pads = [];
    for (const p of raw) if (p && p.connected) pads.push(p);
    this.pads = pads.slice(0, 4);
    this.padNow = this.pads.map((p) => {
      const prev = this.prevBtn[p.index] || [];
      const now = p.buttons.map((b) => b.pressed || b.value > 0.5);
      const just = now.map((v, i) => v && !prev[i]);
      this.prevBtn[p.index] = now;
      return { p, now, just, ax: p.axes };
    });
  }
  endFrame() { this.pressed.clear(); this.mouse.clicked = [false, false, false]; }

  // Какие устройства управляют игроком i
  assignment(i) {
    const n = this.padNow ? this.padNow.length : 0;
    if (this.numPlayers === 1) return { kb: ['wasd', 'arrows'], mouse: true, pads: this.padNow ? this.padNow.map((_, k) => k) : [] };
    if (i === 0) return { kb: ['wasd'], mouse: true, pads: n >= 2 ? [0] : [] };
    return { kb: ['arrows'], mouse: false, pads: n >= 2 ? [1] : n === 1 ? [0] : [] };
  }

  key(list) { return list.some((k) => this.keys.has(k)); }
  hit(list) { return list.some((k) => this.pressed.has(k)); }

  ctrl(i) {
    const a = this.assignment(i);
    const c = { mx: 0, my: 0, ax: 0, ay: 0, aimStick: false, run: false, shoot: false, shootHeld: false, punch: false, interact: false, interactHeld: false, reload: false, swap: false, call: false, camL: false, camR: false, book: false, pause: false, mouseAim: false, pad: false };
    for (const set of a.kb) {
      const K = KB[set];
      if (this.key(K.up)) c.my += 1; if (this.key(K.down)) c.my -= 1;
      if (this.key(K.left)) c.mx -= 1; if (this.key(K.right)) c.mx += 1;
      c.run = c.run || this.key(K.run);
      c.shoot = c.shoot || this.hit(K.shoot); c.shootHeld = c.shootHeld || this.key(K.shoot);
      c.punch = c.punch || this.hit(K.punch);
      c.interact = c.interact || this.hit(K.interact); c.interactHeld = c.interactHeld || this.key(K.interact);
      c.reload = c.reload || this.hit(K.reload); c.swap = c.swap || this.hit(K.swap); c.call = c.call || this.hit(K.call);
      c.camL = c.camL || this.key(K.camL); c.camR = c.camR || this.key(K.camR);
      c.book = c.book || this.hit(K.book); c.pause = c.pause || this.hit(K.pause);
      if (this.hit(Object.values(K).flat())) this.lastDevice[i] = 'kb';
    }
    if (a.mouse) {
      if (performance.now() - this.mouse.moved < 2500) c.mouseAim = true;
      c.shoot = c.shoot || this.mouse.clicked[0]; c.shootHeld = c.shootHeld || this.mouse.down[0];
      c.punch = c.punch || this.mouse.clicked[2];
    }
    for (const k of a.pads) {
      const P = this.padNow[k]; if (!P) continue;
      const dz = (v) => (Math.abs(v) < 0.22 ? 0 : v);
      const lx = dz(P.ax[0] || 0), ly = dz(P.ax[1] || 0), rx = dz(P.ax[2] || 0), ry = dz(P.ax[3] || 0);
      c.mx += lx; c.my -= ly;
      if (P.now[PB.UP]) c.my += 1; if (P.now[PB.DOWN]) c.my -= 1; if (P.now[PB.LEFT]) c.mx -= 1; if (P.now[PB.RIGHT]) c.mx += 1;
      if (Math.hypot(rx, ry) > 0.35) { c.ax = rx; c.ay = -ry; c.aimStick = true; }
      c.run = c.run || P.now[PB.LT] || P.now[PB.LS];
      c.shoot = c.shoot || P.just[PB.RT]; c.shootHeld = c.shootHeld || P.now[PB.RT];
      c.punch = c.punch || P.just[PB.X];
      c.interact = c.interact || P.just[PB.A]; c.interactHeld = c.interactHeld || P.now[PB.A];
      c.reload = c.reload || P.just[PB.B]; c.swap = c.swap || P.just[PB.Y]; c.call = c.call || P.just[PB.RS];
      c.camL = c.camL || P.now[PB.LB]; c.camR = c.camR || P.now[PB.RB];
      c.book = c.book || P.just[PB.BACK]; c.pause = c.pause || P.just[PB.START];
      if (P.just.some((v) => v) || lx || ly) { this.lastDevice[i] = 'pad'; c.pad = true; }
    }
    const l = Math.hypot(c.mx, c.my);
    if (l > 1) { c.mx /= l; c.my /= l; }
    return c;
  }

  // Навигация по меню — любой ввод
  nav() {
    const n = { up: false, down: false, left: false, right: false, ok: false, back: false, tabL: false, tabR: false, any: false };
    const kh = (list) => this.hit(list);
    n.up = kh(['ArrowUp', 'KeyW']); n.down = kh(['ArrowDown', 'KeyS']);
    n.left = kh(['ArrowLeft', 'KeyA']); n.right = kh(['ArrowRight', 'KeyD']);
    n.ok = kh(['Enter', 'Space', 'KeyE', 'NumpadEnter']);
    n.back = kh(['Escape', 'Backspace', 'Tab']);
    n.tabL = kh(['BracketLeft', 'PageUp']); n.tabR = kh(['BracketRight', 'PageDown']);
    const now = performance.now();
    for (const P of this.padNow || []) {
      n.ok = n.ok || P.just[PB.A] || P.just[PB.START]; n.back = n.back || P.just[PB.B] || P.just[PB.BACK];
      n.up = n.up || P.just[PB.UP]; n.down = n.down || P.just[PB.DOWN];
      n.left = n.left || P.just[PB.LEFT]; n.right = n.right || P.just[PB.RIGHT];
      n.tabL = n.tabL || P.just[PB.LB]; n.tabR = n.tabR || P.just[PB.RB];
      // стик с автоповтором
      const y = P.ax[1] || 0, x = P.ax[0] || 0;
      const key = P.p.index;
      const dir = Math.abs(y) > 0.6 ? (y < 0 ? 'up' : 'down') : Math.abs(x) > 0.6 ? (x < 0 ? 'left' : 'right') : null;
      const st = this.navRepeat[key] || (this.navRepeat[key] = { dir: null, t: 0 });
      if (dir && (dir !== st.dir || now - st.t > 280)) { n[dir] = true; st.t = now + (dir !== st.dir ? 150 : 0); }
      st.dir = dir;
    }
    n.any = n.up || n.down || n.ok || n.back || n.left || n.right;
    return n;
  }

  glyph(i, action) {
    const pad = this.lastDevice[i] === 'pad';
    const map = pad
      ? { interact: 'A', shoot: 'RT', punch: 'X', reload: 'B', swap: 'Y', book: 'Back', run: 'LT', call: 'R3' }
      : (this.numPlayers === 2 && i === 1
        ? { interact: 'Enter', shoot: 'Пр.Ctrl', punch: '/', reload: '.', swap: ',', book: '\\', run: 'Пр.Shift', call: "'" }
        : { interact: 'E', shoot: 'ЛКМ/Пробел', punch: 'ПКМ/F', reload: 'R', swap: 'Q', book: 'Tab', run: 'Shift', call: 'H' });
    return map[action] || action;
  }
}
