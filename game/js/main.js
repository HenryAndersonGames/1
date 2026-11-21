'use strict';
// ---------- Запуск и главный цикл (фиксированный шаг 60 Гц) ----------
const STEP = 1 / 60;
let acc = 0, lastT = 0, fpsAcc = 0, fpsN = 0;

function controlsHelp() {
  const pads = Input.padCount();
  return [
    `#Геймпадов подключено: ${pads} ${pads < 2 ? '(нажмите любую кнопку на геймпаде, чтобы он определился)' : ''}`,
    'Левый стик — движение · Правый стик — направление · X — лёгкая атака · Y — тяжёлая · B — перекат · A — действие / поднять / обыскать',
    'Комбо: X-X-X, X-Y (выпад), X-X-Y (добивание), Y-Y (удар сверху), перекат+X / перекат+Y · LB / RB / RT — особые способности',
    'LT — бинт · крестовина ◀ баррикада/ремонт, ▶ ловушка · Back — навыки и способности · Start — пауза',
    '',
    '#Клавиатура (если геймпада нет)',
    'Игрок 1: WASD, J — лёгкая, K — тяжёлая, Пробел — перекат, E — действие, U/I/O — способности, Q — баррикада, R — ловушка, H — бинт, Tab — навыки',
    'Игрок 2: стрелки, Num1/Num2 — атаки, Num3 — перекат, Num0 — действие, Num7/8/9 — способности, Num4/5 — стройка, Num6 — бинт, Num+ — навыки',
    '',
    '#Как выжить',
    'Днём исследуйте город, промзону, ферму и лабораторию: обыскивайте шкафы, ищите оружие, топливо и ткань.',
    'Ночью держите оборону у дома: двери, баррикады, мебель, ловушки, генератор с прожекторами.',
    'Упавшего напарника поднимайте, удерживая A рядом. Если упадут оба — забег окончен.',
  ];
}

function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (t - lastT) / 1000 || 0);
  lastT = t;
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 0.5) { Render.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }

  if (G.state !== 'play' || G.paused) Input.update();
  if (Input.keys.has('F2') && !frame.f2) { G.quality = G.quality === 1 ? 0.75 : G.quality === 0.75 ? 0.5 : 1; resize(); msg(`Качество: ${G.quality * 100}%`); }
  frame.f2 = Input.keys.has('F2');
  if (Input.keys.has('F3') && !frame.f3) G.showFps = !G.showFps;
  frame.f3 = Input.keys.has('F3');

  if (G.state === 'title') {
    if (!G.players.length) { newGame(); G.state = 'title'; G.msgs = []; }
    G.cam.x = World.fire.x + Math.sin(t / 6000) * 300; G.cam.y = World.fire.y - 100;
    G.t += dt;
    render();
    drawScreen('Shattered Dawn', controlsHelp().concat(['', '#Нажмите A / Enter, чтобы начать']), 'кооперативное выживание вдвоём · прототип', true);
    if (Input.anyPressed('light') || Input.anyPressed('interact') || Input.anyPressed('start')) { Sfx.unlock(); newGame(); }
    return;
  }
  if (G.state === 'over') {
    render();
    drawScreen('Забег окончен', [
      `#Пережито ночей: ${G.day - 1}`, `Убито монстров: ${G.kills}`,
      `Уровни: ${PAL[0].name} — ${G.players[0].lvl}, ${PAL[1].name} — ${G.players[1].lvl}`,
      `Рекорд: ${G.bestNight} ноч.`, '', '#Start / Enter — новый забег',
    ], 'оба игрока пали');
    if (Input.anyPressed('start') || Input.anyPressed('light')) newGame();
    return;
  }
  if (G.paused) {
    if (Input.anyPressed('start')) G.paused = false;
    render();
    drawScreen('Пауза', controlsHelp().concat(['', '#Start / Enter — продолжить']), `День ${G.day}`);
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
  requestAnimationFrame((t) => { lastT = t; frame(t); });
});
