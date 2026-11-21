'use strict';
// ---------- Данные игры: оружие, монстры, навыки, крафт, добыча ----------

// Оружие: у каждого ОДНА лёгкая (L) и ОДНА тяжёлая (H) атака.
// L: dmg, reach, arc (полуугол), dur (длительность), hit (момент удара), kb (отброс)
// H: dmg, reach, arc, wind (замах), rec (восстановление), kb, stun
const WEAPONS = {
  fists: { name: 'Кулаки', durab: Infinity, L: { dmg: 7, reach: 46, arc: 0.9, dur: 0.22, hit: 0.08, kb: 110 }, H: { dmg: 16, reach: 50, arc: 1.0, wind: 0.32, rec: 0.25, kb: 260, stun: 0.4 } },
  bat: { name: 'Бита', durab: 70, L: { dmg: 16, reach: 64, arc: 1.0, dur: 0.28, hit: 0.1, kb: 150 }, H: { dmg: 36, reach: 72, arc: 1.3, wind: 0.38, rec: 0.3, kb: 420, stun: 0.6 } },
  spiked: { name: 'Бита с гвоздями', durab: 60, L: { dmg: 21, reach: 64, arc: 1.0, dur: 0.28, hit: 0.1, kb: 150 }, H: { dmg: 46, reach: 72, arc: 1.3, wind: 0.38, rec: 0.3, kb: 420, stun: 0.7 } },
  knife: { name: 'Нож', durab: 90, L: { dmg: 13, reach: 50, arc: 0.8, dur: 0.18, hit: 0.07, kb: 70 }, H: { dmg: 30, reach: 54, arc: 0.7, wind: 0.24, rec: 0.2, kb: 120, stun: 0.3, back: 2 } },
  axe: { name: 'Топор', durab: 55, chop: 2, L: { dmg: 20, reach: 66, arc: 1.0, dur: 0.34, hit: 0.13, kb: 160 }, H: { dmg: 50, reach: 74, arc: 1.1, wind: 0.5, rec: 0.35, kb: 380, stun: 0.6 } },
  pipe: { name: 'Труба', durab: 50, L: { dmg: 16, reach: 70, arc: 1.0, dur: 0.3, hit: 0.11, kb: 170 }, H: { dmg: 34, reach: 76, arc: 1.2, wind: 0.42, rec: 0.3, kb: 440, stun: 0.7 } },
  board: { name: 'Доска', durab: 14, improvised: true, L: { dmg: 12, reach: 66, arc: 1.0, dur: 0.28, hit: 0.1, kb: 140 }, H: { dmg: 26, reach: 72, arc: 1.2, wind: 0.38, rec: 0.3, kb: 360, stun: 0.5 } },
  chair: { name: 'Стул', durab: 7, improvised: true, L: { dmg: 14, reach: 60, arc: 1.2, dur: 0.32, hit: 0.12, kb: 220 }, H: { dmg: 32, reach: 66, arc: 1.4, wind: 0.42, rec: 0.3, kb: 520, stun: 0.9 } },
  crowbar: { name: 'Монтировка', durab: 80, pry: true, L: { dmg: 16, reach: 62, arc: 1.0, dur: 0.28, hit: 0.1, kb: 150 }, H: { dmg: 32, reach: 66, arc: 1.1, wind: 0.36, rec: 0.3, kb: 360, stun: 0.6 } },
  sledge: { name: 'Кувалда', durab: 45, L: { dmg: 22, reach: 72, arc: 1.0, dur: 0.44, hit: 0.18, kb: 240 }, H: { dmg: 72, reach: 80, arc: 1.5, wind: 0.75, rec: 0.45, kb: 620, stun: 1.1, aoe: true } },
  // ----- холодное (новое) -----
  machete: { name: 'Мачете', durab: 75, L: { dmg: 22, reach: 64, arc: 1.0, dur: 0.24, hit: 0.09, kb: 110 }, H: { dmg: 46, reach: 70, arc: 1.1, wind: 0.3, rec: 0.22, kb: 200, stun: 0.4, back: 1.5 } },
  fireaxe: { name: 'Пожарный топор', durab: 70, chop: 3, L: { dmg: 26, reach: 72, arc: 1.0, dur: 0.38, hit: 0.15, kb: 200 }, H: { dmg: 70, reach: 80, arc: 1.2, wind: 0.6, rec: 0.4, kb: 480, stun: 0.8 } },
  shovel: { name: 'Лопата', durab: 60, L: { dmg: 18, reach: 76, arc: 1.1, dur: 0.32, hit: 0.12, kb: 220 }, H: { dmg: 42, reach: 82, arc: 1.3, wind: 0.45, rec: 0.32, kb: 540, stun: 0.9 } },
  hammer: { name: 'Молот', durab: 90, L: { dmg: 20, reach: 56, arc: 0.9, dur: 0.24, hit: 0.09, kb: 160 }, H: { dmg: 50, reach: 60, arc: 1.0, wind: 0.36, rec: 0.26, kb: 380, stun: 1.0 } },
  hockey: { name: 'Клюшка', durab: 40, L: { dmg: 15, reach: 82, arc: 1.1, dur: 0.26, hit: 0.1, kb: 270 }, H: { dmg: 34, reach: 86, arc: 1.3, wind: 0.36, rec: 0.28, kb: 620, stun: 0.6 } },
  // ----- огнестрел: магазин + перезарядка, урон намного выше ближнего боя -----
  // gun: dmg (за пулю/дробину), rate (между выстрелами), mag, reload (с), pellets, spread, range, pierce (пробивает N врагов), kb
  pistol: { name: 'Пистолет', durab: 200, gun: { dmg: 42, rate: 0.36, mag: 8, reload: 1.3, spread: 0.04, range: 560, pellets: 1, noise: 520, kb: 180, stun: 0.2 }, L: { dur: 0.2 }, H: { dmg: 14, reach: 50, arc: 0.9, wind: 0.24, rec: 0.2, kb: 220, stun: 0.5 } },
  revolver: { name: 'Револьвер', durab: 180, gun: { dmg: 78, rate: 0.62, mag: 6, reload: 2.0, spread: 0.03, range: 600, pellets: 1, noise: 620, kb: 320, stun: 0.45 }, L: { dur: 0.3 }, H: { dmg: 16, reach: 50, arc: 0.9, wind: 0.24, rec: 0.2, kb: 240, stun: 0.5 } },
  shotgun: { name: 'Дробовик', durab: 120, gun: { dmg: 30, rate: 1.05, mag: 5, reload: 2.2, spread: 0.26, range: 340, pellets: 7, noise: 760, kb: 120, stun: 0.5 }, L: { dur: 0.45 }, H: { dmg: 22, reach: 58, arc: 1.0, wind: 0.3, rec: 0.25, kb: 380, stun: 0.7 } },
  sawnoff: { name: 'Обрез', durab: 90, gun: { dmg: 30, rate: 0.35, mag: 2, reload: 1.7, spread: 0.46, range: 220, pellets: 9, noise: 760, kb: 130, stun: 0.6 }, L: { dur: 0.35 }, H: { dmg: 20, reach: 52, arc: 1.0, wind: 0.28, rec: 0.22, kb: 360, stun: 0.7 } },
  rifle: { name: 'Охотничье ружьё', durab: 150, gun: { dmg: 140, rate: 1.3, mag: 5, reload: 2.4, spread: 0.01, range: 900, pellets: 1, pierce: 3, noise: 900, kb: 420, stun: 0.6 }, L: { dur: 0.5 }, H: { dmg: 22, reach: 64, arc: 1.0, wind: 0.32, rec: 0.26, kb: 400, stun: 0.7 } },
  crossbow: { name: 'Арбалет', durab: 120, gun: { dmg: 110, rate: 0.5, mag: 1, reload: 1.2, spread: 0.01, range: 650, pellets: 1, pierce: 2, noise: 60, kb: 260, stun: 0.4, bolt: true }, L: { dur: 0.3 }, H: { dmg: 18, reach: 56, arc: 1.0, wind: 0.3, rec: 0.24, kb: 300, stun: 0.6 } },
};

// Метательное (держится в руках, любая атака = бросок)
const THROWN = {
  brick: { name: 'Кирпич', dmg: 30, stun: 0.9, keep: true },
  bottle: { name: 'Бутылка', dmg: 22, stun: 0.4 },
  molotov: { name: 'Коктейль Молотова', dmg: 15, stun: 0.2, fire: true },
  tknife: { name: 'Метательный нож', dmg: 34, stun: 0.3, keep: true },
  bomb: { name: 'Самодельная бомба', dmg: 10, stun: 0.3, bomb: true },
};

const RES = {
  xammo: { name: 'Разрывные', col: '#ff9a5a' },
  wood: { name: 'Дерево', col: '#e6cfa0' }, scrap: { name: 'Хлам', col: '#c8d2d8' }, cloth: { name: 'Ткань', col: '#d8c8a8' },
  fuel: { name: 'Топливо', col: '#e08a6a' }, ammo: { name: 'Патроны', col: '#e0c070' }, food: { name: 'Еда', col: '#e8b08a' },
};

// ===== Монстры (бестиарий концепта: 9 существ) =====
const EDEF = {
  walker: { name: 'Бродяга', hp: 60, spd: 64, r: 15, dmg: 12, sdmg: 16, range: 30, wind: 0.5, cd: 1.0, xp: 10, mass: 1, h: 112 },
  jumper: { name: 'Прыгун', hp: 42, spd: 100, r: 14, dmg: 14, sdmg: 8, range: 26, wind: 0.32, cd: 0.9, xp: 15, mass: 0.8, h: 52 },
  clinger: { name: 'Прилипала', hp: 14, spd: 128, r: 9, dmg: 4, sdmg: 3, range: 18, wind: 0.2, cd: 0.6, xp: 6, mass: 0.35, h: 30 },
  brute: { name: 'Тяжеловес', hp: 340, spd: 42, r: 28, dmg: 28, sdmg: 80, range: 58, wind: 0.95, cd: 1.6, xp: 60, mass: 4.5, h: 150, slam: 82 },
  ghoul: { name: 'Гуль', hp: 22, spd: 118, r: 10, dmg: 6, sdmg: 6, range: 20, wind: 0.2, cd: 0.7, xp: 7, mass: 0.5, h: 60, squeeze: true },
  wolf: { name: 'Чёрный волк', hp: 55, spd: 150, r: 14, dmg: 14, sdmg: 6, range: 26, wind: 0.42, cd: 1.0, xp: 16, mass: 0.9, h: 46 },
  spider: { name: 'Тыквопаук', hp: 70, spd: 82, r: 18, dmg: 12, sdmg: 10, range: 30, wind: 0.42, cd: 1.0, xp: 20, mass: 1.2, h: 60 },
  void: { name: 'Пустотник', hp: 50, spd: 70, r: 13, dmg: 14, sdmg: 10, range: 26, wind: 0.8, cd: 2.4, xp: 24, mass: 0.8, h: 104, float: true },
  titan: { name: 'Титан', hp: 1500, spd: 30, r: 46, dmg: 40, sdmg: 240, range: 96, wind: 1.2, cd: 2.4, xp: 300, mass: 20, h: 300, slam: 140 },
};

// ===== Древо развития: 6 веток по 8 уровней (способности открываются прямо в узлах дерева) =====
const SKILL_MAX = 8;
const SKILLS = [
  { id: 'str', name: 'Грубая сила', icon: 'icon_str', col: '#e07a4a', lv: ['+15% урона, быстрее носишь мебель · способность «Боевой клич»', 'Можно бросать мебель · способность «Каменная кожа»', 'Тяжёлый удар отбрасывает сильнее · способность «Удар оземь»', 'Ещё +15% урона и оглушение · способность «Ярость»', 'Мебель в руках — надёжный щит (−80%)', '+10% урона, стены ломаешь вдвое быстрее', 'Брошенная мебель бьёт вдвое сильнее', 'Неудержимый: удары не прерываются, +15% урона'] },
  { id: 'agi', name: 'Акробатика', icon: 'icon_agi', col: '#7ad0a0', lv: ['+6% скорости, перекат дешевле', 'Перекат дальше · способность «Рывок»', 'Удар после переката ×2', 'Ещё быстрее, перекат дешевле · способность «Теневой шаг»', 'Перекат сбивает врагов с ног', '+6% скорости', 'Перекат на 30% дешевле', '+10% скорости, удар после переката ×3'] },
  { id: 'eng', name: 'Инженерия', icon: 'icon_eng', col: '#d8b048', lv: ['Баррикады прочнее; можно укреплять мебель', 'Починка транспорта (машины, трактор) · баррикада за 1 дерево · способность «Мина»', 'Ловушки служат вдвое дольше', 'Ремонт вдвое эффективнее · способность «Самострел»', 'Ловушка за 1 хлам', 'Транспорт тратит вдвое меньше бензина, таран сильнее', 'Двери, баррикады и мебель на 50% прочнее', 'Самострел стреляет вдвое чаще, мины мощнее'] },
  { id: 'mar', name: 'Боевые искусства', icon: 'icon_mar', col: '#e05a5a', lv: ['Два лёгких + тяжёлый = добивание (×1.5, оглушение)', 'Третий лёгкий удар — круговой', 'Тяжёлый удар швыряет врага в других', 'Замах тяжёлого на 40% быстрее · способность «Вихрь»', 'Оглушённые получают двойной урон', 'Лёгкие удары на 15% быстрее', 'Комбо из 4+ ударов: +30% урона', 'Критический удар: 15% шанс ×2'] },
  { id: 'med', name: 'Медицина', icon: 'icon_med', col: '#9fe39a', lv: ['Бинты лечат на 50% больше · способность «Второе дыхание»', 'Поднимаешь союзника вдвое быстрее', 'Бинт лечит и союзника рядом · способность «Полевой медик»', 'Медленная регенерация', 'Поднятый союзник встаёт с 80% здоровья', '+20 к максимуму здоровья', 'Бинт ещё и лечит со временем', 'Раз за ночь встаёшь сам с 50% здоровья'] },
  { id: 'oth', name: 'Потусторонние', icon: 'icon_oth', col: '#a888ff', lv: ['Способность «Толчок»', 'Способность «Молния»', 'Способность «Огненная волна»', 'Способность «Ледяная волна»', 'Способность «Теневой помощник»', 'Перезарядка способностей −20% · способность «Воронка»', 'Каждая способность даёт 1 с неуязвимости', 'Ещё −20% перезарядки'] },
];

// ===== Крафт на верстаке =====
const RECIPES = [
  { id: 'bandage', name: 'Бинт', cost: { cloth: 2 }, desc: '+1 бинт' },
  { id: 'medkit', name: 'Аптечка', cost: { cloth: 3, food: 1 }, desc: '+2 бинта сразу' },
  { id: 'ammo', name: 'Патроны ×8', cost: { scrap: 2 }, eng: 1, desc: 'Для любого огнестрела. Инженерия 1' },
  { id: 'xammo', name: 'Разрывные патроны ×4', cost: { scrap: 2, fuel: 1 }, eng: 3, desc: 'Взрываются при попадании. Заряжаются первыми. Инж. 3' },
  { id: 'upg_dmg', name: 'Улучшить оружие: урон', cost: { scrap: 3, wood: 1 }, eng: 1, desc: '+25% урона оружию в руках (до +3)' },
  { id: 'upg_tough', name: 'Улучшить оружие: прочность', cost: { scrap: 1, cloth: 2 }, desc: 'Обмотка и скобы: +50% прочности, починка' },
  { id: 'upg_mag', name: 'Улучшить огнестрел: магазин', cost: { scrap: 4 }, eng: 4, desc: '+50% патронов в магазине. Инж. 4' },
  { id: 'repair', name: 'Починить оружие в руках', cost: { scrap: 2 }, desc: 'Полная прочность' },
  { id: 'spiked', name: 'Бита с гвоздями', cost: { scrap: 3 }, eng: 2, need: 'bat', desc: 'Нужна бита в руках и Инж. 2' },
  { id: 'sawnoff', name: 'Обрез из дробовика', cost: { scrap: 1 }, eng: 2, need: 'shotgun', desc: 'Короче, шире разлёт, 2 выстрела подряд. Нужен дробовик' },
  { id: 'machete', name: 'Мачете', cost: { scrap: 4, wood: 1 }, eng: 2, desc: 'Быстрое и острое. Инженерия 2' },
  { id: 'hammer', name: 'Молот', cost: { scrap: 3, wood: 1 }, eng: 1, desc: 'Сильно оглушает. Инженерия 1' },
  { id: 'crossbow', name: 'Арбалет', cost: { wood: 3, scrap: 3, cloth: 1 }, eng: 4, desc: 'Бесшумный, пробивает двоих. Инж. 4' },
  { id: 'knuckles', name: 'Кастет', cost: { scrap: 2 }, desc: 'Удары кулаками ×1.8 (навсегда)' },
  { id: 'tknife', name: 'Метательные ножи ×2', cost: { scrap: 2 }, eng: 1, desc: 'Инженерия 1' },
  { id: 'molotov', name: 'Коктейль Молотова', cost: { cloth: 1, fuel: 1 }, desc: 'Поджигает область' },
  { id: 'bomb', name: 'Самодельная бомба', cost: { scrap: 2, fuel: 1 }, eng: 3, desc: 'Взрыв через секунду. Инженерия 3' },
  { id: 'armor', name: 'Самодельная броня', cost: { scrap: 4, cloth: 2 }, eng: 3, desc: '−35% урона, пока цела. Инженерия 3' },
  { id: 'g_helmet', name: 'Каска', cost: { scrap: 3, cloth: 1 }, eng: 2, desc: '−15% урона. Инженерия 2' },
  { id: 'g_boots', name: 'Берцы', cost: { cloth: 2, scrap: 1 }, desc: '+8% скорости' },
  { id: 'g_vest', name: 'Бронежилет', cost: { scrap: 6, cloth: 3 }, eng: 4, desc: '−26% урона. Инженерия 4' },
];

// ===== Добыча по зонам =====
// [вес, что] — 'r:wood' ресурс, 'w:knife' оружие, 't:bottle' метательное, 'band' бинт
const LOOT = {
  forest: [[1, 'r:food'], [5, 'r:wood'], [2, 'r:cloth'], [1, 'r:scrap'], [1, 'band'], [0.5, 'w:axe'], [0.6, 't:bottle']],
  town: [[3, 'r:food'], [0.3, 'armor'], [3, 'r:cloth'], [2, 'band'], [2, 'r:scrap'], [1, 'r:ammo'], [0.6, 'w:knife'], [0.5, 'w:crowbar'], [0.4, 'w:bat'], [0.3, 'w:pistol'], [1, 't:bottle'], [0.6, 'r:fuel']],
  industrial: [[0.5, 'armor'], [0.4, 't:bomb'], [5, 'r:scrap'], [2, 'r:fuel'], [1, 'r:ammo'], [0.8, 'w:pipe'], [0.5, 'w:sledge'], [0.5, 'w:crowbar'], [0.6, 't:brick']],
  farm: [[4, 'r:food'], [3, 'r:wood'], [3, 'r:cloth'], [2, 'r:fuel'], [0.6, 'w:axe'], [0.4, 'w:shotgun'], [1, 'band']],
  lab: [[0.6, 'armor'], [3, 'band'], [2, 'r:ammo'], [2, 'r:scrap'], [0.6, 'w:shotgun'], [0.6, 'w:pistol'], [1, 'r:cloth']],
};
LOOT.town.push([0.4, 'w:machete'], [0.3, 'w:hammer'], [0.3, 'w:hockey'], [0.25, 'w:revolver'], [0.5, 'r:xammo']);
LOOT.industrial.push([0.4, 'w:fireaxe'], [0.4, 'w:shovel'], [0.4, 'w:hammer'], [0.2, 'w:sawnoff'], [0.4, 'r:xammo']);
LOOT.farm.push([0.5, 'w:shovel'], [0.3, 'w:rifle'], [0.3, 'w:machete']);
LOOT.lab.push([0.3, 'w:rifle'], [0.3, 'w:revolver'], [0.5, 'r:xammo']);
LOOT.forest.push([0.2, 'w:machete'], [0.15, 'w:shovel']);
LOOT.village = LOOT.town; LOOT.depot = LOOT.industrial; LOOT.camp = LOOT.farm;
function rollLoot(zone) {
  const t = LOOT[zone] || LOOT.forest;
  let sum = 0; for (const [w] of t) sum += w;
  let r = Math.random() * sum;
  for (const [w, v] of t) { r -= w; if (r <= 0) return v; }
  return t[0][1];
}

// ===== Наборы приёмов (в духе Rotwood: комбинирование разных атак) =====
// Вход: лёгкая → L1, тяжёлая → H1, перекат+лёгкая → DL, перекат+тяжёлая → DH.
// next: какой приём следует, если во время текущего нажать L или H. mar — нужный уровень Боевых искусств.
// k — множитель урона от базового (L.dmg или H.dmg оружия), base: 'L'|'H'.
// sw: [от, до] — дуга замаха относительно взгляда; pose: L|H|spin|thrust|slam|leap
const MOVESETS = {
  blunt: {
    L1: { name: 'Удар', base: 'L', k: 1, wind: 0.08, act: 0.06, rec: 0.16, arc: 1.0, sw: [-1.2, 1.0], pose: 'L', next: { L: 'L2', H: 'LH' } },
    L2: { name: 'Обратный удар', base: 'L', k: 1, wind: 0.08, act: 0.06, rec: 0.18, arc: 1.0, sw: [1.0, -1.2], pose: 'L', next: { L: 'L3', H: 'LLH' } },
    L3: { name: 'Размашистый', base: 'L', k: 1.35, wind: 0.14, act: 0.12, rec: 0.3, arc: Math.PI, sw: [-3.1, 3.1], pose: 'spin', kb: 1.8, mar: 1, next: { L: 'L1', H: 'H1' } },
    H1: { name: 'Тяжёлый удар', base: 'H', k: 1, wind: 1, act: 0.08, rec: 1, arc: 1.3, sw: [-2.4, 0.9], pose: 'H', next: { H: 'HH', L: 'L1' } },
    HH: { name: 'Удар сверху', base: 'H', k: 1.25, wind: 0.32, act: 0.08, rec: 0.4, arc: 0.9, sw: [-2.8, 0.5], pose: 'slam', aoe: 64, stunK: 1.6, mar: 2, next: {} },
    LH: { name: 'Выпад', base: 'H', k: 0.9, wind: 0.16, act: 0.1, rec: 0.3, arc: 0.55, sw: [0, 0], pose: 'thrust', lunge: 420, reachAdd: 22, kb: 1.2, mar: 1, next: { L: 'L1' } },
    LLH: { name: 'Апперкот-добивание', base: 'H', k: 1.5, wind: 0.22, act: 0.08, rec: 0.35, arc: 1.1, sw: [1.4, -1.6], pose: 'H', stunK: 2, launch: true, mar: 2, next: {} },
    DL: { name: 'Удар с переката', base: 'L', k: 1.5, wind: 0.04, act: 0.1, rec: 0.2, arc: 1.0, sw: [-1.0, 1.0], pose: 'thrust', lunge: 260, next: { L: 'L2', H: 'LH' } },
    DH: { name: 'Прыжок с ударом', base: 'H', k: 1.4, wind: 0.28, act: 0.08, rec: 0.35, arc: 1.0, sw: [-2.8, 0.6], pose: 'leap', lunge: 300, aoe: 72, mar: 3, next: {} },
  },
};
// Нож — быстрые серии, удар в спину
MOVESETS.blade = Object.assign({}, MOVESETS.blunt, {
  L1: { name: 'Укол', base: 'L', k: 1, wind: 0.05, act: 0.05, rec: 0.1, arc: 0.8, sw: [-0.4, 0.4], pose: 'thrust', next: { L: 'L2', H: 'LH' } },
  L2: { name: 'Порез', base: 'L', k: 1, wind: 0.05, act: 0.05, rec: 0.12, arc: 0.9, sw: [0.9, -0.9], pose: 'L', next: { L: 'L3', H: 'LLH' } },
  L3: { name: 'Шквал', base: 'L', k: 0.7, wind: 0.06, act: 0.3, rec: 0.25, arc: 0.9, sw: [-0.9, 0.9], pose: 'L', hits: 3, mar: 1, next: { L: 'L1' } },
  H1: { name: 'Удар в спину', base: 'H', k: 1, wind: 1, act: 0.06, rec: 1, arc: 0.7, sw: [-1.6, 0.4], pose: 'thrust', back: 2.2, lunge: 220, next: { L: 'L1', H: 'HH' } },
});
// Топор и кувалда — медленные, мощные, с ударом по площади
MOVESETS.heavy = Object.assign({}, MOVESETS.blunt, {
  L1: { name: 'Рубящий', base: 'L', k: 1, wind: 0.14, act: 0.07, rec: 0.24, arc: 1.0, sw: [-1.6, 0.9], pose: 'L', next: { L: 'L2', H: 'LH' } },
  L2: { name: 'Встречный', base: 'L', k: 1.1, wind: 0.14, act: 0.07, rec: 0.26, arc: 1.0, sw: [0.9, -1.6], pose: 'L', next: { L: 'L3', H: 'LLH' } },
  HH: { name: 'Вращение', base: 'H', k: 0.7, wind: 0.2, act: 0.5, rec: 0.4, arc: Math.PI, sw: [-3.1, 9.4], pose: 'spin', hits: 3, mar: 2, next: {} },
});
// Кулаки
MOVESETS.fists = Object.assign({}, MOVESETS.blunt, {
  L1: { name: 'Джеб', base: 'L', k: 1, wind: 0.05, act: 0.05, rec: 0.1, arc: 0.8, sw: [0, 0], pose: 'thrust', next: { L: 'L2', H: 'LH' } },
  L2: { name: 'Кросс', base: 'L', k: 1.1, wind: 0.06, act: 0.05, rec: 0.12, arc: 0.8, sw: [0, 0], pose: 'thrust', next: { L: 'L3', H: 'LLH' } },
  L3: { name: 'Пинок', base: 'L', k: 1.6, wind: 0.1, act: 0.08, rec: 0.25, arc: 0.9, sw: [0, 0], pose: 'H', kb: 2.4, mar: 1, next: { L: 'L1' } },
  LH: { name: 'Плечом вперёд', base: 'H', k: 0.8, wind: 0.12, act: 0.2, rec: 0.3, arc: 0.9, sw: [0, 0], pose: 'thrust', lunge: 460, kb: 1.6, mar: 1, next: {} },
});
const WCLASS = { machete: 'blade', fireaxe: 'heavy', shovel: 'blunt', hammer: 'blunt', hockey: 'blunt', revolver: 'blunt', rifle: 'blunt', sawnoff: 'blunt', crossbow: 'blunt', fists: 'fists', bat: 'blunt', spiked: 'blunt', pipe: 'blunt', board: 'blunt', chair: 'blunt', crowbar: 'blunt', knife: 'blade', axe: 'heavy', sledge: 'heavy', pistol: 'blunt', shotgun: 'blunt' };

// ===== Особые способности — назначаются на 3 кнопки =====
const ABIL = {
  push: { name: 'Толчок', icon: 'ab_push', cd: 5, req: ['oth', 1], desc: 'Силовой импульс отбрасывает врагов перед тобой' },
  bolt: { name: 'Молния', icon: 'ab_bolt', cd: 7, req: ['oth', 2], desc: 'Цепная молния по ближайшим врагам' },
  fire: { name: 'Огненная волна', icon: 'ab_fire', cd: 9, req: ['oth', 3], desc: 'Поджигает полосу земли перед тобой' },
  frost: { name: 'Ледяная волна', icon: 'ab_frost', cd: 12, req: ['oth', 4], desc: 'Замораживает всех вокруг' },
  shadow: { name: 'Теневой помощник', icon: 'ab_shadow', cd: 24, req: ['oth', 5], desc: 'Призывает тень, которая сражается 15 с' },
  dash: { name: 'Рывок', icon: 'ab_dash', cd: 4, req: ['agi', 2], desc: 'Стремительный рывок, ранящий всех на пути' },
  quake: { name: 'Удар оземь', icon: 'ab_quake', cd: 8, req: ['str', 3], desc: 'Оглушает всех вокруг' },
  whirl: { name: 'Вихрь', icon: 'ab_whirl', cd: 10, req: ['mar', 4], desc: 'Серия круговых ударов оружием' },
  medic: { name: 'Полевой медик', icon: 'ab_medic', cd: 20, req: ['med', 3], desc: 'Лечит себя и союзника рядом' },
};

// Какая анимация у приёма (7 кадров из ART_META.anims)
function animFor(id, M, cls) {
  if (M.anim) return M.anim;
  if (cls === 'fists') return 'punch';
  if (M.pose === 'spin') return 'slash';
  if (M.pose === 'thrust') return 'thrust';
  if (M.pose === 'leap') return 'leap';
  if (id === 'LLH') return 'uppercut';
  if (M.pose === 'H' || M.pose === 'slam') return 'overhead';
  return id === 'L2' ? 'chop' : 'slash';
}
