'use strict';
// ---------- Запуск и главный цикл (фиксированный шаг 60 Гц) ----------
const STEP = 1 / 60;
let acc = 0, lastT = 0, fpsAcc = 0, fpsN = 0;

function controlsHelp() {
  const pads = Input.padCount();
  return [
    `#Геймпадов подключено: ${pads} ${pads < 2 ? '(нажмите любую кнопку на геймпаде, чтобы он определился)' : ''}`,
    'Левый стик — движение · Правый стик — направление · X — лёгкая атака · Y — тяжёлая · B — перекат · A — действие / поднять / обыскать',
    'Комбо: X-X-X, X-Y (выпад), X-X-Y (добивание), Y-Y (удар сверху), перекат+X / перекат+Y · LB / RB / RT / L3 / R3 — 5 слотов способностей (назначаются в меню Back → способности)',
    'Y держать — замах с зарядом, отпустить — удар · B — прыжок-уклонение · держи A — взять оружие · ▲ — сменить оружие · LT — бинт · ◀ баррикада, ▶ ловушка, ▼ поесть · Back — навыки и способности · Start — пауза (там же «Вернуться к костру», если застряли, и «Начать заново»)',
    'Перекат в момент удара — идеальный уворот и контратака ×2 · с Силой 3 можно схватить оглушённого монстра (A) и швырнуть',
    '',
    '#Клавиатура (если геймпада нет)',
    'Игрок 1: WASD, J — лёгкая, K — тяжёлая, Пробел — перекат, E — действие, U/I/O/L/P — способности, Q — баррикада, R — ловушка, H — бинт, V — еда, Tab — навыки',
    'Игрок 2: стрелки, Num1/Num2 — атаки, Num3 — перекат, Num0 — действие, Num7/8/9/./÷ — способности, Num4/5 — стройка, Num6 — бинт, Num+ — навыки',
    '',
    '#Как выжить',
    'Днём исследуйте город, промзону, ферму и лабораторию: обыскивайте шкафы, ищите оружие, топливо и ткань.',
    'Ночью держите оборону у дома: двери, баррикады, мебель, ловушки, генератор с прожекторами.',
    'Упавшего напарника поднимайте, удерживая A рядом. Если упадут оба — забег окончен.',
    'Броня (каска, бронежилет, перчатки, берцы…) надевается удержанием A и видна на герое. Удар сам доворачивает к ближайшему врагу.',
    'Back — древо развития (6 веток по 8 уровней, способности прямо в узлах). За каждую ночь — очки навыков.',
    'Инженерия 2: ◀ у брошенной машины или трактора — починить (3 хлама, 1 дерево). A — сесть/выйти, стик — руль, B — тормоз, канистра бензина = 45 с езды.',
    'Ломается всё: мебель и шкафы — любыми ударами, двери и баррикады — тяжёлыми, стены — долгой серией тяжёлых (Y).',
  ];
}

// ---------- Меню паузы: продолжить / вернуться к костру (если застрял) / заново / управление ----------
const PAUSE_ITEMS = [
  ['Продолжить', 'вернуться в игру'],
  ['Вернуться к костру', 'если застряли — оба героя переносятся к костру'],
  ['Начать заново', 'новый забег с первого дня'],
  ['Управление', 'кнопки и советы'],
];
function pauseMenu() {
  const pm = G.pm || (G.pm = { sel: 0, help: false, confirm: false });
  for (const c of Input.ctrls) {
    const P = c.pressed;
    if (pm.help) { if (P.roll || P.light || P.interact || P.start || P.menu) { pm.help = false; Sfx.play('menu'); } continue; }
    if (P.start || P.roll) {
      if (pm.confirm) { pm.confirm = false; Sfx.play('menu'); continue; }
      G.paused = false; return;
    }
    if (P.up) { pm.sel = (pm.sel + PAUSE_ITEMS.length - 1) % PAUSE_ITEMS.length; pm.confirm = false; Sfx.play('menu'); }
    if (P.down) { pm.sel = (pm.sel + 1) % PAUSE_ITEMS.length; pm.confirm = false; Sfx.play('menu'); }
    if (P.light || P.interact) {
      Sfx.play('menu');
      if (pm.sel === 0) { G.paused = false; return; }
      if (pm.sel === 1) { returnToFire(); G.paused = false; return; }
      if (pm.sel === 2) {
        if (!pm.confirm) { pm.confirm = true; continue; }
        pm.confirm = false; pm.sel = 0; newGame(); G.paused = false; return;
      }
      if (pm.sel === 3) pm.help = true;
    }
  }
}
function returnToFire() {
  const f = World.fire;
  G.players.forEach((p, i) => {
    if (p.state === 'dead') return;
    if (p.held) dropHeld(p, true);
    for (let k = 0; k < 24; k++) {
      const a = (i ? 0.3 : Math.PI - 0.3) + k * 0.7, r = f.r + 40 + k * 6;
      const x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r;
      if (freeSpot(x, y, p.r) && !Nav.blocked[cellOf(x, y)]) { p.x = x; p.y = y; break; }
    }
    if (p.state !== 'downed') { p.state = 'normal'; p.atk = null; }
    p.vx = p.vy = 0; p.buf = {};
    for (const e of p.clingers || []) { e.state = 'move'; e.host = null; e.stun = 1; }
    if (p.clingers) p.clingers.length = 0;
    burst(p.x, p.y, 30, 14, '#e8a03c', 140, 3);
  });
  G.cam.x = f.x; G.cam.y = f.y - 80;
  G.flowDirty = true;
  msg('Вы вернулись к костру', '#e8c890');
}
function drawPause() {
  const pm = G.pm || { sel: 0 };
  if (pm.help) { drawScreen('Управление', controlsHelp().concat(['', '#B / Start — назад']), `День ${G.day}`); return; }
  const lines = [];
  PAUSE_ITEMS.forEach(([name, note], i) => {
    const on = i === pm.sel;
    if (on && i === 2 && pm.confirm) lines.push('#▶  Точно начать заново? Нажмите A ещё раз  ◀');
    else lines.push((on ? '#▶  ' : '') + name + (on ? '  ◀' : ''));
    lines.push(on ? note : ' ');
  });
  lines.push('', 'Стик / крестовина — выбор · A или X — выбрать · B / Start — продолжить');
  lines.push('Клавиатура: W/S или ↑/↓ — выбор · E или J — выбрать · Esc — продолжить');
  drawScreen('Пауза', lines, `День ${G.day} · ${G.phase === 'night' ? 'ночь' : 'день'}`);
}

// автонастройка: проседает FPS — снижаем внутреннее разрешение, стабильно 60 — поднимаем обратно
function autoQuality(dt) {
  if (!G.autoQ || G.state !== 'play' || G.paused) return;
  const A = autoQuality; A.t = (A.t || 0) + dt;
  if (A.t < 1) return;
  A.t = 0;
  const fps = Render.fps;
  if (fps < 47) { A.low = (A.low || 0) + 1; A.high = 0; } else if (fps > 58) { A.high = (A.high || 0) + 1; A.low = 0; } else { A.low = 0; A.high = 0; }
  if (A.low >= 2 && G.qLevel < Q_LEVELS.length - 1) { G.qLevel++; resize(); A.low = 0; }
  else if (A.high >= 8 && G.qLevel > 1) { G.qLevel--; resize(); A.high = 0; A.cool = 1; }
}
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (t - lastT) / 1000 || 0);
  lastT = t;
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 0.5) { Render.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }

  if (G.state !== 'play' || G.paused) Input.update();
  // F2: Авто → 1080 → 900 → 720 → 600 → 480 → Авто
  if (Input.keys.has('F2') && !frame.f2) {
    if (G.autoQ) { G.autoQ = false; G.qLevel = 0; } else if (G.qLevel >= Q_LEVELS.length - 1) { G.autoQ = true; G.qLevel = 2; } else G.qLevel++;
    resize(); msg(G.autoQ ? 'Качество: авто' : `Качество: ${Q_LEVELS[G.qLevel]}p`);
  }
  autoQuality(dt);
  prebakeChunks();
  frame.f2 = Input.keys.has('F2');
  if (Input.keys.has('F3') && !frame.f3) G.showFps = !G.showFps;
  frame.f3 = Input.keys.has('F3');

  if (G.state === 'title') {
    if (!G.players.length) { newGame(); G.state = 'title'; G.msgs = []; }
    G.cam.x = World.fire.x + Math.sin(t / 6000) * 300; G.cam.y = World.fire.y - 100;
    G.t += dt;
    render();
    drawScreen('Shattered Dawn', controlsHelp().concat(['', '#A / Enter — играть вдвоём        Y / K — играть одному']), 'выживание вдвоём или в одиночку · прототип', true);
    if (Input.anyPressed('heavy')) { Sfx.unlock(); newGame(true); }
    else if (Input.anyPressed('light') || Input.anyPressed('interact') || Input.anyPressed('start')) { Sfx.unlock(); newGame(false); }
    return;
  }
  if (G.state === 'over') {
    render();
    drawScreen('Забег окончен', [
      `#Пережито ночей: ${G.day - 1}`, `Убито монстров: ${G.kills}`,
      G.players.map((p) => `${PAL[p.i].name} — ур. ${p.lvl}`).join(', '),
      `Рекорд: ${G.bestNight} ноч.`, '', '#Start / Enter — новый забег',
    ], G.solo ? 'герой пал' : 'оба игрока пали');
    if (Input.anyPressed('start') || Input.anyPressed('light')) newGame();
    return;
  }
  if (G.paused) {
    pauseMenu();
    if (G.state !== 'play') return;
    render();
    drawPause();
    return;
  }
  acc += dt;
  let n = 0;
  while (acc >= STEP && n < 6) {
    Input.update(); // одно чтение ввода на шаг — нажатия не теряются и не дублируются
    if (Input.anyPressed('start')) { G.paused = true; acc = 0; break; }
    update(STEP);
    acc -= STEP; n++;
    if (G.state !== 'play') break;
  }
  if (n >= 6) acc = 0;
  render();
}

window.addEventListener('load', async () => {
  initRender();
  buildWorld();
  const ctx = Render.ctx;
  const loading = (k) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0c0a'; ctx.fillRect(0, 0, Render.W, Render.H);
    ctx.fillStyle = '#e8d8b0'; ctx.font = `bold ${Math.round(Render.H / 30)}px Georgia, serif`; ctx.textAlign = 'center';
    ctx.fillText('Загрузка…', Render.W / 2, Render.H / 2 - 20);
    ctx.fillStyle = '#3a2e22'; ctx.fillRect(Render.W / 2 - 150, Render.H / 2, 300, 10);
    ctx.fillStyle = '#e8a03c'; ctx.fillRect(Render.W / 2 - 150, Render.H / 2, 300 * k, 10);
  };
  loading(0);
  await initArt(loading);
  await initPuppet();
  initRigs();
  requestAnimationFrame((t) => { lastT = t; frame(t); });
});
