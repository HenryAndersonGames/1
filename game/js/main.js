'use strict';
// ---------- Запуск и главный цикл (фиксированный шаг 60 Гц) ----------
const STEP = 1 / 60;
let acc = 0, lastT = 0, fpsAcc = 0, fpsN = 0;

function controlsHelp() {
  const pads = Input.padCount();
  return [
    `#Геймпадов подключено: ${pads} ${pads < 2 ? '(нажмите любую кнопку на геймпаде, чтобы он определился)' : ''}`,
    'Левый стик — движение · Правый стик — направление удара',
    'A — удар (3 удара = комбо) · B — перекат · X — поднять / дверь / помочь · Y — баррикада / ремонт',
    'LB — ловушка · Back — навыки · Start — пауза',
    '',
    '#Клавиатура (если геймпада нет)',
    'Игрок 1: WASD, Пробел — удар, Shift — перекат, E — взаимодействие, Q — баррикада, Z — ловушка, Tab — навыки',
    'Игрок 2: стрелки, Num1 — удар, Num2 — перекат, Num3 — взаимодействие, Num0 — баррикада, Num. — ловушка, Num+ — навыки',
    '',
    '#Как выжить',
    'Днём собирайте дерево и хлам (бейте деревья и ящики), к ночи возвращайтесь к дому у костра.',
    'Закрывайте двери, ставьте баррикады и мебель в проходы. Прилипалу с союзника срывает напарник (X).',
    'Упавшего напарника поднимайте, удерживая X рядом. Если упадут оба — забег окончен.',
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
    drawScreen('Shattered Dawn', controlsHelp().concat(['', '#Нажмите A / Enter, чтобы начать']), 'кооперативное выживание вдвоём · прототип');
    if (Input.anyPressed('attack') || Input.anyPressed('start')) { Sfx.unlock(); newGame(); }
    return;
  }
  if (G.state === 'over') {
    render();
    drawScreen('Забег окончен', [
      `#Пережито ночей: ${G.day - 1}`, `Убито монстров: ${G.kills}`,
      `Уровни: ${PAL[0].name} — ${G.players[0].lvl}, ${PAL[1].name} — ${G.players[1].lvl}`,
      `Рекорд: ${G.bestNight} ноч.`, '', '#Start / Enter — новый забег',
    ], 'оба игрока пали');
    if (Input.anyPressed('start') || Input.anyPressed('attack')) newGame();
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

window.addEventListener('load', () => {
  initRender();
  buildWorld();
  initArt();
  requestAnimationFrame((t) => { lastT = t; frame(t); });
});
