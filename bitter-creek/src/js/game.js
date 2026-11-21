// Игра: цикл, время суток, ночи и похищения, бой, последствия, сохранения, финал.
import * as THREE from 'three';
import { initMaterials, MAT, makeSky } from './models.js';
import { World } from './world.js';
import { Player, NPC, Demon, Boss, planPath, PIT_TRAIL } from './entities.js';
import { FX } from './fx.js';
import { Post } from './post.js';
import { Ambient } from './details.js';
import { Horse } from './horse.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { UI } from './ui.js';
import { Dialogue } from './dialogue.js';
import { NPCS, CLUES, KEY_CLUES, ACCUSE_NEED, SPOTS, CACHES, LOST_LOOKS, INTRO, FINALE_SCENE, FINALE_SCENE_NODOC, STRANGE_GENERIC, ending } from './story.js';
import { LOC } from './terrain.js';
import { clamp, lerp, dist, pick, shuffle, angleDiff, smoothstep } from './util.js';
import { loadSettings, saveSettings, writeSave, readSave, deleteSave } from './save.js';

// ключевые кадры освещения по часам
const KF = [
  { h: 0, sky: '#0b0e18', sun: '#7a92c8', sunI: 0.7, hs: '#50648c', hg: '#1c1612', hi: 0.72, fn: 6, ff: 80, night: 1 },
  { h: 5, sky: '#0b0e18', sun: '#7a92c8', sunI: 0.7, hs: '#50648c', hg: '#1c1612', hi: 0.72, fn: 6, ff: 80, night: 1 },
  { h: 6.3, sky: '#8a7470', sun: '#ffb080', sunI: 1.4, hs: '#b8a49a', hg: '#4a3828', hi: 1.05, fn: 28, ff: 170, night: 0.4 },
  { h: 8, sky: '#c9a57e', sun: '#ffe4bc', sunI: 2.5, hs: '#efe0c8', hg: '#6a5040', hi: 1.55, fn: 55, ff: 235, night: 0 },
  { h: 17, sky: '#c9a57e', sun: '#ffe4bc', sunI: 2.5, hs: '#efe0c8', hg: '#6a5040', hi: 1.55, fn: 55, ff: 235, night: 0 },
  { h: 19, sky: '#b4643c', sun: '#ff8440', sunI: 1.7, hs: '#d89a78', hg: '#4a2a1a', hi: 1.05, fn: 40, ff: 190, night: 0.3 },
  { h: 20.4, sky: '#191420', sun: '#7080b0', sunI: 0.6, hs: '#4a4a6a', hg: '#1a1410', hi: 0.55, fn: 8, ff: 85, night: 1 },
  { h: 24, sky: '#0b0e18', sun: '#7a92c8', sunI: 0.7, hs: '#50648c', hg: '#1c1612', hi: 0.72, fn: 6, ff: 80, night: 1 },
];
const ECLIPSE = { sky: '#1c0606', sun: '#c03020', sunI: 0.7, hs: '#6a2020', hg: '#140808', hi: 0.6, fn: 6, ff: 75, night: 1 };
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function lerpHex(a, b, t, out) { _c1.set(a); _c2.set(b); out.copy(_c1).lerp(_c2, t); return out; }

export class Game {
  constructor() {
    this.settings = loadSettings();
    const q = this.settings.quality;
    this.canvas = document.getElementById('c');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: q === 'high', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(q === 'low' ? 0.7 : 1);
    this.post = new Post(this.renderer, q);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.renderer.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#c9a57e');
    this.scene.fog = new THREE.Fog('#c9a57e', 60, 240);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.3, 320);
    initMaterials(q);
    this.sky = makeSky(); this.scene.add(this.sky);
    this.hemi = new THREE.HemisphereLight('#efe0c8', '#6a5040', 1.5); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffe4bc', 2.5); this.scene.add(this.sun); this.scene.add(this.sun.target);
    if (q !== 'low') {
      const S = q === 'high' ? 2048 : 1024, R = q === 'high' ? 50 : 34;
      this.sun.castShadow = true; this.sun.shadow.mapSize.set(S, S);
      const s = this.sun.shadow.camera; s.left = -R; s.right = R; s.top = R; s.bottom = -R; s.near = 1; s.far = 220;
      this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.04;
    }
    this.world = new World(this.scene, q);
    this.fx = new FX(this);
    this.horses = [];
    this.ambient = new Ambient(this);
    this.input = new Input(this.canvas);
    this.audio = new Sfx();
    this.ui = new UI(this);
    this.dialogue = new Dialogue(this);
    this.players = []; this.npcs = []; this.demons = []; this.boss = null;
    this.mode = 'menu'; this.time = 0; this.camYaw = 0; this.shake = 0; this.eclipse = false;
    this.camTarget = new THREE.Vector3(0, 0, 0);
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); this._v = new THREE.Vector3();
    this.state = null;
    this.onceNotes = new Set();
    this.applySettings(true);
    addEventListener('resize', () => this.resize());
    this.resize();
    this.ui.showMain();
    document.getElementById('loading').classList.add('hidden');
    addEventListener('keydown', () => this.audio.resume());
    addEventListener('mousedown', () => this.audio.resume());
    addEventListener('keydown', (e) => { if (e.code === 'F11') { this.settings.fullscreen = !this.settings.fullscreen; this.applySettings(); e.preventDefault(); } });
    this.last = performance.now();
    const loop = () => { requestAnimationFrame(loop); this.frame(); };
    loop();
  }

  applySettings(first) {
    const s = this.settings;
    const gr = document.getElementById('grain');
    if (gr && !gr.style.backgroundImage) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 160;
      const cx = cv.getContext('2d'), im = cx.createImageData(160, 160);
      for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      cx.putImageData(im, 0, 0); gr.style.backgroundImage = `url(${cv.toDataURL()})`;
    }
    document.body.classList.toggle('nograin', true);
    this.audio.setVolume(s.volume);
    const post = s.quality !== 'low';
    this.canvas.classList.toggle('grade', !!s.grade && !post);
    document.getElementById('vignette').style.display = post ? 'none' : '';
    if (this.post && this.post.enabled) this.post.mComp.uniforms.grain.value = s.grade ? 0.045 : 0;
    if (window.native) window.native.fullscreen(!!s.fullscreen);
    else if (!first) {
      try { if (s.fullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen(); else if (!s.fullscreen && document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* */ }
    }
    saveSettings(s);
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    const pr = this.renderer.getPixelRatio();
    this.post.setSize(Math.round(w * pr), Math.round(h * pr));
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  quit() { if (window.native) window.native.quit(); else window.close(); }

  // ---------- время ----------
  hour() { return this.state ? ((this.state.t % 24) + 24) % 24 : 18; }
  dayNum() { return this.state ? Math.floor(this.state.t / 24) + 1 : 1; }
  isNight() { const h = this.hour(); return this.eclipse || h >= 20.2 || h < 5.5; }
  nightNum() { const h = this.hour(); return h < 12 ? this.dayNum() - 1 : this.dayNum(); }
  nightsPassed() { return this.dayNum() - 1; }

  // ---------- API для сюжета ----------
  hasClue(id) { return this.state.clues.includes(id); }
  addClue(id) {
    if (this.hasClue(id) || !CLUES[id]) return;
    this.state.clues.push(id);
    const c = CLUES[id];
    this.notify(`Новая улика${c.key ? ' ◆' : ''}: ${c.t}`, 'clue');
    this.audio.clue();
    if (c.key && this.keyCount() === ACCUSE_NEED && !this.flag('docExposed')) this.notify('Улик достаточно. Пора поговорить с доктором Холтом.', 'clue');
  }
  keyCount() { return KEY_CLUES.filter((k) => this.hasClue(k)).length; }
  flag(k) { return !!this.state.flags[k]; }
  setFlag(k, v = true) { this.state.flags[k] = v; }
  addRep(n) { this.state.rep = clamp(this.state.rep + n, -100, 100); if (this.state.rep <= -50) this.lawHostile(); }
  addMoney(n) { this.state.money += n; }
  spend(n) { if (this.state.money < n) return false; this.state.money -= n; return true; }
  giveAmmo(n) { for (const p of this.players) p.ammo += n; this.notify(`Патроны: +${n} каждому`); }
  giveSilver(n) {
    const per = this.players.length === 2 ? Math.ceil(n / 2) : n;
    for (const p of this.players) p.silver += per;
    this.notify(`Серебряные пули: +${per}${this.players.length === 2 ? ' каждому' : ''}. Переключение: [${this.input.glyph(0, 'swap')}]`, 'clue');
  }
  healAll(amount = 100) { for (const p of this.players) { if (p.downed) p.revive(40); p.hp = Math.min(p.maxHp, p.hp + amount); } }
  npc(id) { return this.npcs.find((n) => n.id === id); }
  npcAlive(id) { const n = this.npc(id); return n && n.alive; }
  makeHostile(id) { const n = this.npc(id); if (n && n.alive) n.makeHostile(this.talkPlayer || this.players[0]); }
  discover(k) {
    if (!this.state.discovered[k]) {
      this.state.discovered[k] = true;
      const names = { cemetery: 'Кладбище', hut: 'Хижина Изи', mission: 'Руины миссии', pit: 'Яма', pit_area: 'Лес к северо-востоку — там что-то есть' };
      if (names[k]) this.notify(`На карте: ${names[k]}`);
    }
  }
  notify(t, cls) { this.ui.notify(t, cls); }
  notifyOnce(t, cls) { if (this.onceNotes.has(t)) return; this.onceNotes.add(t); setTimeout(() => this.onceNotes.delete(t), 8000); this.notify(t, cls); }

  // ---------- сессия ----------
  endSession() {
    for (const p of this.players) p.dispose();
    for (const n of this.npcs) n.dispose();
    for (const d of this.demons) d.dispose();
    for (const h of this.horses || []) h.dispose();
    this.horses = [];
    if (this.boss) this.scene.remove(this.boss.group);
    this.players = []; this.npcs = []; this.demons = []; this.boss = null; this.eclipse = false;
    this.fx.clearAll();
    this.dialogue.close();
    this.ui.book.classList.add('hidden');
    this.state = null;
    this.mode = 'menu';
  }
  setup(numPlayers) {
    this.endSession();
    this.input.numPlayers = numPlayers;
    this.state = {
      v: 1, t: 9.0, numPlayers, money: 15, rep: 0, clues: [], flags: {}, discovered: { town: true, mine: true, farm: true },
      innocents: 0, hollowsKilled: 0, saved: 0, lostTotal: 0, caches: {}, log: { lost: [], saved: [], returned: [] }, lostLooks: [],
    };
    this.schedule = [];
    for (let i = 0; i < numPlayers; i++) this.players.push(new Player(this, i));
    for (const d of NPCS) this.npcs.push(new NPC(this, d));
    this.spawnHorses();
    this.players[0].x = 97; this.players[0].z = 3; this.players[0].rot = -Math.PI / 2;
    if (this.players[1]) { this.players[1].x = 97; this.players[1].z = -1.5; this.players[1].rot = -Math.PI / 2; }
    this.camYaw = Math.PI / 2 - 0.3;
    this.hud(true);
  }
  spawnHorses() {
    const W = this.world, list = [];
    const at = (id, lx, lz, coat) => { const a = W.anchors[id], p = W.toWorld(id, lx, lz); list.push(new Horse(this, coat, p.x, p.z, a.ry + Math.PI)); };
    list.push(new Horse(this, 0, 98.8, 4.7, -Math.PI / 2));
    list.push(new Horse(this, 4, 98.6, -3.3, -Math.PI / 2));
    at('saloon', -4.4, 5.0, 2); at('saloon', -6.2, 5.0, 1);
    at('sheriff', 4.2, 5.0, 3); at('hotel', 4.4, 5.0, 5);
    at('stable', -3, 3.5, 1); at('stable', 3, 3.5, 3);
    at('farm', 3, 6, 0);
    this.horses = list;
  }
  callHorse(p) {
    if (p.horse) return;
    let h = this.horses.find((q) => q.owner === p.idx && !q.rider);
    if (!h) { let bd = 1e9; for (const q of this.horses) { if (q.rider) continue; const d = dist(q.x, q.z, p.x, p.z); if (d < bd) { bd = d; h = q; } } }
    this.audio.whistle();
    if (!h || dist(h.x, h.z, p.x, p.z) > 320) { this.notifyOnce('Свист уносит ветер. Лошади слишком далеко.'); return; }
    h.called = p; h.owner = p.idx;
    setTimeout(() => this.audio.neigh(this.camDist(h.x, h.z)), 500);
    this.notifyOnce(`${p.name} свистит. Лошадь бежит на зов.`);
  }
  pushFromHorses(p) {
    for (const h of this.horses) {
      if (h === p.horse) continue;
      for (const k of [-0.75, 0, 0.75]) {
        const cx = h.x + Math.sin(h.rot) * k, cz = h.z + Math.cos(h.rot) * k;
        const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), R = 0.55 + p.radius;
        if (d < R && d > 1e-4) { p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
      }
    }
  }
  hud(on) { this.ui.hudEl.classList.toggle('hidden', !on); this.ui.hideScreen(); this.ui.screen.classList.remove('main'); }
  newGame(n) {
    this.setup(n);
    // два случайных жителя уже подменены
    const pool = shuffle(this.npcs.filter((x) => x.d.pool));
    pool.slice(0, 2).forEach((x) => { x.hollow = true; });
    this.ui.showCard('Биттер-Крик', INTRO, () => {
      this.mode = 'play';
      this.saveGame(false);
      this.notify(`Подойдите к жителю и нажмите [${this.input.glyph(0, 'interact')}], чтобы поговорить.`);
      setTimeout(() => this.notify(`[${this.input.glyph(0, 'book')}] — блокнот: улики, жители, карта и цели.`), 2500);
      setTimeout(() => this.notify('Начните с шерифа: его контора — на главной улице, к западу.'), 5000);
      setTimeout(() => this.notify(`У въезда ждут две лошади: подойдите и нажмите [${this.input.glyph(0, 'interact')}]. Свистнуть лошадь — [${this.input.glyph(0, 'call')}].`), 7500);
    }, 'intro');
  }
  saveGame(manual) {
    if (!this.state) return;
    const data = {
      state: this.state, camYaw: this.camYaw,
      horses: this.horses.map((h) => ({ x: h.x, z: h.z, rot: h.rot, owner: h.owner })),
      players: this.players.map((p) => ({ x: p.x, z: p.z, hp: p.downed ? 40 : p.hp, ammo: p.ammo, silver: p.silver, clip: p.clip, clipType: p.clipType, prefer: p.prefer })),
      npcs: Object.fromEntries(this.npcs.map((n) => [n.id, {
        alive: n.alive, hollow: n.hollow, revealed: n.revealed, missing: n.missing, returned: n.returned, hp: n.hp, st: n.state,
        asked: n.asked, metOnce: !!n.metOnce, searched: n.searched, silverTested: !!n.silverTested, killedBy: n.killedBy || null, wasHostile: n.wasHostile,
      }])),
    };
    const ok = writeSave(data);
    if (manual) this.notify(ok ? 'Игра сохранена.' : 'Не удалось сохранить игру!');
  }
  loadGame() {
    const s = readSave();
    if (!s) { this.notify('Сохранение не найдено'); return; }
    this.setup(s.state.numPlayers || 1);
    this.state = s.state;
    this.state.log = this.state.log || { lost: [], saved: [], returned: [] };
    this.camYaw = s.camYaw || 0;
    s.players.forEach((d, i) => { const p = this.players[i]; if (!p) return; Object.assign(p, { x: d.x, z: d.z, hp: d.hp, ammo: d.ammo, silver: d.silver, clip: d.clip, clipType: d.clipType, prefer: d.prefer }); });
    for (const n of this.npcs) {
      const d = s.npcs[n.id]; if (!d) continue;
      Object.assign(n, { alive: d.alive, hollow: d.hollow, revealed: d.revealed, missing: d.missing, returned: d.returned, hp: d.hp, asked: d.asked || {}, metOnce: d.metOnce, searched: d.searched, silverTested: d.silverTested, killedBy: d.killedBy, wasHostile: d.wasHostile });
      if (!n.alive || d.st === 'gone' || d.st === 'dead') { n.state = 'gone'; n.hide(); }
      else if (d.st === 'fled') { n.state = 'fled'; n.hide(); }
      else if (n.workTime()) { n.state = 'atWork'; }
      else { n.state = 'home'; n.hide(); }
    }
    (s.horses || []).forEach((d, i) => { const h = this.horses[i]; if (h) { h.x = d.x; h.z = d.z; h.rot = d.rot; h.owner = d.owner; h.sync(); } });
    this.schedule = [];
    this.mode = 'play';
    this.notify(`День ${this.dayNum()}. Игра загружена.`);
  }

  // ---------- игроки ----------
  otherPlayer(p) { return this.players.find((q) => q !== p); }
  nearestPlayer(x, z, targetable = false) {
    let best = null, bd = 1e9;
    for (const p of this.players) { if (targetable && !p.targetable) continue; const d = dist(x, z, p.x, p.z); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  nearestPlayerDist(x, z) { let bd = 1e9; for (const p of this.players) bd = Math.min(bd, dist(x, z, p.x, p.z)); return bd; }
  camDist(x, z) { return dist(x, z, this.camTarget.x, this.camTarget.z); }
  mouseGround(y) {
    const m = this.input.mouse;
    this.ray.setFromCamera({ x: m.ndcX, y: m.ndcY }, this.camera);
    this.plane.constant = -y;
    return this.ray.ray.intersectPlane(this.plane, this._v) ? this._v : null;
  }
  onPlayerDown(p) {
    if (this.players.every((q) => q.downed)) {
      setTimeout(() => this.gameOver(), 1500);
      this.mode = 'dying';
    }
  }
  onBleedOut(p) {
    const loss = Math.min(5, this.state.money);
    this.state.money -= loss;
    const d = this.world.doors.hotel;
    p.x = d.x; p.z = d.z; p.revive(50);
    this.notify(`${p.name} очнулся в отеле: Агнес затащила его внутрь. (−$${loss})`);
  }
  gameOver() {
    this.ui.showCard('Конец пути', ['Пыль оседает на ваши лица.', 'В Биттер-Крике станет на два трупа больше. Мортон будет доволен.'], () => {
      this.mode = 'menu';
      this.ui.showScreen('Вы погибли', '', [
        { label: 'Загрузить последнее сохранение', fn: () => this.loadGame() },
        { label: 'В главное меню', fn: () => { this.endSession(); this.ui.showMain(); } },
      ]);
    }, 'death');
  }

  // ---------- бой ----------
  targets() {
    const t = [];
    for (const n of this.npcs) if (n.targetable && n.state !== 'home') t.push(n);
    for (const d of this.demons) if (d.targetable) t.push(d);
    if (this.boss && this.boss.targetable) t.push(this.boss);
    return t;
  }
  fireShot(p, dir, type) {
    const gy = this.world.groundAt(p.x, p.z);
    const sx = p.x + Math.sin(dir) * 0.7, sz = p.z + Math.cos(dir) * 0.7, sy = gy + 1.45;
    let best = null, bs = 1e9;
    for (const t of this.targets()) {
      const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
      if (d > 45 || d < 0.2) continue;
      const diff = Math.abs(angleDiff(dir, Math.atan2(dx, dz)));
      if (diff > 1.2) continue;
      const lat = Math.sin(diff) * d;
      const threat = t.isBoss || t.isDemon || t.hostile;
      // по мирным — только при точном прицеле; угрозы в приоритете
      const rad = t.isBoss ? 4 + d * 0.05 : threat ? 0.8 + d * 0.05 : 0.45 + d * 0.012;
      if (lat > rad) continue;
      if (!t.isBoss && this.world.lineBlocked(p.x, p.z, t.x, t.z)) continue;
      const s = d + diff * 25 + (threat ? -12 : 0);
      if (s < bs) { bs = s; best = t; }
    }
    let ex, ey, ez;
    if (best) {
      ex = best.x; ez = best.z; ey = best.isBoss ? best.y + 6 : this.world.groundAt(best.x, best.z) + 1.3;
    } else {
      let d = 45;
      for (let s = 1; s < 45; s += 0.8) { if (this.world.blockedAt(p.x + Math.sin(dir) * s, p.z + Math.cos(dir) * s)) { d = s; break; } }
      ex = p.x + Math.sin(dir) * d; ez = p.z + Math.cos(dir) * d; ey = sy;
      if (d < 45) this.fx.sparks(ex, ey, ez); else this.fx.dust(ex, this.world.groundAt(ex, ez) + 0.2, ez);
    }
    this.fx.shot(sx, sy, sz, ex, ey, ez, type === 'silver');
    this.audio.shot(this.camDist(p.x, p.z), type === 'silver');
    if (best) best.damage(50, p, type);
    // жители пугаются выстрелов
    if (!this.isNight()) {
      let scared = 0;
      for (const n of this.npcs) {
        if (n === best || !n.targetable || n.hostile || n.state === 'home') continue;
        if (dist(n.x, n.z, p.x, p.z) < 26) { n.scare(p, 5); scared++; }
      }
      if (scared && !(best && (best.isDemon || best.hostile))) this.addRep(-1);
    }
  }
  melee(p, dir) {
    let hit = null, bd = 1e9;
    for (const t of this.targets()) {
      if (t.isBoss) continue;
      const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
      if (d > 2.0) continue;
      if (Math.abs(angleDiff(dir, Math.atan2(dx, dz))) > 1.1) continue;
      if (d < bd) { bd = d; hit = t; }
    }
    if (hit) {
      this.audio.punch(0);
      const dx = hit.x - p.x, dz = hit.z - p.z, d = Math.hypot(dx, dz) || 1;
      hit.tryMove(dx / d * 0.6, dz / d * 0.6);
      hit.damage(14, p, 'punch');
    }
  }
  npcShoot(npc, t) {
    const gy = this.world.groundAt(npc.x, npc.z);
    const hitIt = Math.random() < 0.5;
    const ox = hitIt ? 0 : (Math.random() - 0.5) * 3;
    this.fx.shot(npc.x + Math.sin(npc.rot) * 0.7, gy + 1.45, npc.z + Math.cos(npc.rot) * 0.7, t.x + ox, this.world.groundAt(t.x, t.z) + 1.2, t.z + ox, false);
    this.audio.shot(this.camDist(npc.x, npc.z));
    if (hitIt) t.damage(11, npc);
  }

  // ---------- последствия ----------
  witnesses(x, z, except) {
    let w = 0;
    for (const n of this.npcs) if (n !== except && n.alive && n.char.group.visible && n.state !== 'home' && !n.hollow && dist(n.x, n.z, x, z) < 30) { w++; n.scare(this.players[0], 9); }
    return w;
  }
  onAssault(n, kind) {
    if (n.hollow || this.isNight()) return;
    this.addRep(kind === 'punch' ? -2 : -5);
    this.notifyOnce(`${n.name}: «Вы что творите?!»`);
  }
  onSurrender(n) {
    this.notify(`${n.name} поднимает руки: «Хватит! Хватит!»`);
    if (n.id === 'bull') { this.setFlag('bullBeaten'); this.notify('Маккой побеждён. Теперь Грейвс будет сговорчивее.', 'clue'); }
  }
  lawHostile() {
    if (this.flag('lawHostile')) return;
    this.setFlag('lawHostile');
    for (const id of ['sheriff', 'billy']) { const n = this.npc(id); if (n && n.alive && !n.hollow) n.makeHostile(); }
    this.notify('Шериф объявил на вас охоту!', 'bad');
  }
  onNpcKilled(n, src, kind) {
    n.killedBy = src && src.isPlayer ? 'players' : 'other';
    n.targetedBy = null;
    if (n.hollow) { this.dissolveHollow(n); return; }
    if (n.d.culprit) {
      this.setFlag('docDead'); this.setFlag('docDied');
      const w = this.witnesses(n.x, n.z, n);
      if (!this.flag('docExposed') && this.keyCount() < ACCUSE_NEED) { this.addRep(w ? -30 : -10); this.notify(`Вы убили доктора Холта${w ? ' на глазах у людей' : ''}. Город в ужасе.`, 'bad'); }
      else this.notify('Доктор Холт мёртв. Обыщите тело: у него ключ от погреба.');
      return;
    }
    if (n.wasHostile) { this.addRep(-4); this.notify(`${n.name} убит в драке.`); return; }
    if (!src || !src.isPlayer) return;
    this.state.innocents++;
    const w = this.witnesses(n.x, n.z, n);
    this.addRep(w ? -30 : -12);
    this.notify(`Вы убили: ${n.name}. Он был человеком. ${w ? 'Это видели (' + w + ').' : 'Кажется, никто не видел.'}`, 'bad');
  }
  dissolveHollow(n) {
    n.alive = false; n.revealed = true; n.state = 'gone'; n.hide();
    const d = new Demon(this, n.d.look, { x: n.x, z: n.z });
    d.rot = n.rot; d.alive = false; d.dying = 0.001; d.char.setPose('dead'); d.char.update(0.1, 0); d.sync();
    this.demons.push(d);
    this.state.hollowsKilled++;
    this.addRep(12);
    this.notify(`${n.name} был Пустым! Тело чернеет и рассыпается пеплом.`, 'good');
    this.audio.shriek(this.camDist(n.x, n.z));
  }
  revealHollow(n, src) {
    if (!n.alive || !n.hollow) return;
    n.state = 'demon'; n.revealed = true; n.hide(); n.talking = false;
    const d = new Demon(this, n.d.look, { x: n.x, z: n.z, npc: n });
    d.rot = n.rot; d.state = 'hunt'; d.target = src && src.isPlayer ? src : this.nearestPlayer(n.x, n.z, true); d.provoked = 12;
    this.demons.push(d);
    this.audio.shriek(this.camDist(n.x, n.z));
    this.notify(`${n.name} — Пустой! Тварь сбрасывает человеческую кожу!`, 'bad');
    this.witnesses(n.x, n.z, n);
    this.addRep(5);
  }
  onDemonKilled(d, src) {
    if (d.npc) {
      const n = d.npc;
      n.alive = false; n.revealed = true; n.state = 'gone';
      this.state.hollowsKilled++; this.addRep(10);
      this.notify(`Пустой уничтожен. Под маской был: ${n.name}.`, 'good');
    } else this.notifyOnce('Тварь рассыпалась пеплом.', 'good');
  }

  // ---------- ночь ----------
  nightStart(n) {
    if (n > 7) return;
    this.audio.bell();
    this.setFlag('nightSeen');
    this.notify(n === 7 ? 'Седьмая ночь. Чёрная луна восходит. Это последний шанс.' : `Наступает ночь ${n}. Жители запираются по домам. Слушайте крики.`, 'bad');
    const base = this.state.t;
    this.schedule = [];
    const hollows = this.npcs.filter((x) => x.alive && x.hollow && !x.revealed);
    for (const h of hollows) this.schedule.push({ t: base + 0.8 + Math.random() * 4.5, type: 'hollow', id: h.id });
    const pits = Math.ceil(n / 3);
    for (let i = 0; i < pits; i++) this.schedule.push({ t: base + 1.2 + Math.random() * 5, type: 'pit' });
    const roam = Math.floor(n / 2) + 1;
    for (let i = 0; i < roam; i++) this.schedule.push({ t: base + 1 + Math.random() * 6, type: 'roam' });
    this.state.log = { lost: [], saved: [], returned: [] };
  }
  spawnDemon(x, z, mode = 'roam', look) {
    const looks = LOST_LOOKS.map((l) => l.look).concat(this.state.lostLooks || []);
    const d = new Demon(this, look || pick(looks), { x, z });
    d.state = mode;
    if (mode === 'hunt') { d.target = this.nearestPlayer(x, z, true); d.provoked = 20; }
    this.demons.push(d);
    return d;
  }
  runSchedule() {
    if (!this.schedule.length || this.eclipse) return;
    const now = this.state.t;
    const due = this.schedule.filter((e) => e.t <= now);
    this.schedule = this.schedule.filter((e) => e.t > now);
    for (const e of due) {
      if (e.type === 'hollow') {
        const n = this.npc(e.id);
        if (!n || !n.alive || !n.hollow || n.state !== 'home') continue;
        n.state = 'demon';
        const h = n.home;
        const d = new Demon(this, n.d.look, { x: h.x, z: h.z, npc: n });
        this.demons.push(d);
        d.pickNext();
      } else if (e.type === 'pit') {
        const d = this.spawnDemon(125 + Math.random() * 30, -60 - Math.random() * 40);
        d.pickNext();
      } else {
        const a = Math.random() * 6.28;
        this.spawnDemon(Math.cos(a) * 130, Math.sin(a) * 110, 'roam');
      }
    }
  }
  pickVictim(demon) {
    const night = this.nightNum();
    const cand = this.npcs.filter((n) => n.alive && !n.hollow && n.state === 'home' && !n.d.culprit && !(n.targetedBy && n.targetedBy.alive && n.targetedBy !== demon));
    if (!cand.length) return null;
    const w = cand.map((n) => (n.d.key ? (night >= 3 ? 1 : 0.05) : 3) / (1 + dist(n.x, n.z, demon.x, demon.z) / 150));
    let s = w.reduce((a, b) => a + b, 0), r = Math.random() * s;
    for (let i = 0; i < cand.length; i++) { r -= w[i]; if (r <= 0) return cand[i]; }
    return cand[0];
  }
  onAbduction(v, d) {
    this.audio.scream(this.camDist(v.x, v.z));
    this.notify(`Крик в ночи! Тварь утаскивает к лесу: ${v.name}!`, 'bad');
  }
  onVictimConsumed(v) {
    if (!v) return;
    v.alive = false; v.missing = true; v.state = 'gone'; v.hide(); v.targetedBy = null;
    this.state.lostTotal++;
    this.state.log.lost.push(v.id);
    this.state.lostLooks = (this.state.lostLooks || []).concat([v.d.look]).slice(-8);
    this.notify(`${v.name} исчез в Яме.`, 'bad');
  }
  onVictimFreed(v, by) {
    if (!v || !v.alive) return;
    v.targetedBy = null;
    v.state = 'toHome'; v.show();
    v.path = planPath(v, v.home);
    if (by) {
      this.state.saved++; this.state.log.saved.push(v.id);
      this.addRep(8);
      this.notify(`Вы отбили у твари: ${v.name}!`, 'good');
    }
  }
  dawn() {
    for (const d of this.demons) if (!this.boss && (!d.npc || !d.npc.revealed || d.npc.state === 'demon')) d.burn();
    for (const n of this.npcs) {
      if (n.state === 'dragged') this.onVictimFreed(n, null);
      if (n.state === 'demon' && n.alive) { n.state = 'home'; }
      if (n.state === 'dead') {
        if (!n.searched) { const lines = this.searchBody(n, true); if (lines.length > 1) this.notify(`Мортон передал вам вещи покойного: ${n.name}.`); }
        n.state = 'gone'; n.hide();
      }
    }
    // часть пропавших возвращается Пустыми
    const live = this.npcs.filter((n) => n.alive && n.hollow && !n.revealed).length;
    let budget = Math.max(0, 4 - live);
    for (const id of this.state.log.lost) {
      const n = this.npc(id);
      if (!n || budget <= 0 || this.nightNum() >= 7 || Math.random() > 0.55) continue;
      n.alive = true; n.missing = false; n.hollow = true; n.returned = true; n.state = 'home'; n.hp = n.maxHp; n.revealed = false; n.silverTested = false;
      this.state.lostTotal--; this.state.log.returned.push(id); budget--;
    }
    if (this.nightNum() >= 7 && !this.flag('won')) this.lose();
  }
  morning() {
    const L = this.state.log, nm = (ids) => ids.map((id) => this.npc(id).name).join(', ');
    const lines = [`Утро. День ${this.dayNum()}.`];
    lines.push(L.lost.length ? `Этой ночью пропали: ${nm(L.lost)}.` : 'Этой ночью никто не пропал.');
    if (L.saved.length) lines.push(`Вы отбили у тварей: ${nm(L.saved)}.`);
    if (L.returned.length) lines.push(`К утру вернулись: ${nm(L.returned)}. Говорят — заблудились в холмах. Ни царапины.`);
    lines.push(`До чёрной луны: ${8 - this.dayNum()} ноч.`);
    this.saveGame(false);
    this.ui.showCard('', lines, () => { this.mode = 'play'; }, 'morning');
  }

  // ---------- сюжетные события ----------
  strangeAnswer(n) {
    const hol = this.npcs.filter((h) => h.alive && h.hollow && !h.revealed && h !== n);
    const hinted = hol.find((h) => h.d.hint && h.d.hint.by === n.id);
    if (hinted) return hinted.d.hint.text;
    const ret = hol.find((h) => h.returned);
    if (ret && Math.random() < 0.7) return `${ret.name} вернулся. Говорит — заблудился в холмах. Три дня без воды — и ни царапины, и губы не потрескались. А на сапогах красная глина. Такая только у леса.`;
    if (n.id === 'ruby' && hol.length) return `Говорят, ${pick(hol).name} стал сам не свой. Я бы присмотрелась.`;
    return pick(STRANGE_GENERIC);
  }
  searchBody(n, silent) {
    n.searched = true;
    const b = n.d.body || {};
    const lines = [`*Вы обыскиваете тело. ${n.name}.`];
    if (b.money) { this.addMoney(b.money); lines.push(`(Найдено: $${b.money})`); }
    if (b.silver) { this.giveSilver(b.silver); lines.push(`(Найдено: ${b.silver} серебряных пуль)`); }
    if (b.note) lines.push('*' + b.note);
    if (b.flag) this.setFlag(b.flag, true);
    if (b.flag === 'cellarKey') lines.push('*На шнурке — ключ. Похоже, от погреба.');
    if (b.flag === 'crossGiven') lines.push('*В кармане — серебряное распятие миссии.');
    for (const c of b.clues || []) this.addClue(c);
    if (lines.length === 1) lines.push('*Ничего полезного.');
    return lines;
  }
  takeCache(id) {
    const c = CACHES[id]; this.state.caches[id] = true;
    if (c.money) this.addMoney(c.money);
    if (c.ammo) this.giveAmmo(c.ammo);
    if (c.silver) this.giveSilver(c.silver);
    if (c.heal) this.healAll(100);
  }
  exposeDoctor() {
    const d = this.npc('doctor');
    this.setFlag('docExposed');
    if (d && d.alive) { d.state = 'fled'; d.hide(); d.talking = false; }
    this.discover('pit');
    this.addRep(15);
    this.notify('Доктор Холт бежал к Яме в лесу. Идите за ним — и возьмите серебро.', 'bad');
  }
  restUntilEvening() {
    this.ui.fade(1);
    setTimeout(() => {
      this.state.t = Math.floor(this.state.t / 24) * 24 + 19;
      this.healAll(100);
      for (const p of this.players) { p.downed = false; }
      for (const n of this.npcs) if (n.alive && (n.state === 'toWork' || n.state === 'atWork')) { /* продолжат день */ }
      this.saveGame(false);
      this.ui.fade(0);
      this.notify('Вы отдохнули до вечера. Раны затянулись. Скоро стемнеет.');
    }, 600);
  }
  startFinale() {
    if (this.flag('finaleStarted')) return;
    this.setFlag('finaleStarted');
    const doc = this.flag('docExposed') && !this.flag('docDead');
    const lines = doc ? FINALE_SCENE : FINALE_SCENE_NODOC;
    this.ui.showCard('Яма', lines, () => {
      if (doc) { this.setFlag('docDied'); this.setFlag('docDead'); }
      this.eclipse = true;
      this.schedule = [];
      for (const d of this.demons) d.burn();
      for (const n of this.npcs) if (n.state === 'dragged') this.onVictimFreed(n, null);
      this.boss = new Boss(this);
      this.audio.growl(0); this.shake = 1.2;
      this.mode = 'play';
      this.notify('Голодный восстал! Бейте его серебром!', 'bad');
    }, 'finale');
  }
  onBossKilled() {
    this.setFlag('bossDead');
    for (const d of this.demons) d.burn();
    this.shake = 1.5;
    this.notify('Голодный рухнул в Яму! Сожгите Сердце на алтаре!', 'clue');
  }
  win() {
    this.setFlag('won');
    this.eclipse = false;
    const e = ending(this);
    deleteSave();
    this.ui.showCard(e.title, e.lines, () => this.credits(), 'ending');
  }
  lose() {
    this.setFlag('lost');
    const e = ending(this);
    deleteSave();
    this.ui.showCard(e.title, e.lines, () => this.credits(), 'ending bad');
  }
  credits() {
    const s = this.state;
    this.ui.showCard('Дело закрыто', [
      `Улик найдено: ${s.clues.length} из ${Object.keys(CLUES).length}.`,
      `Спасено от тварей: ${s.saved}. Пустых уничтожено: ${s.hollowsKilled}. Невинных убито: ${s.innocents}.`,
      'Биттер-Крик. Нуарный вестерн.', 'Спасибо за игру.',
    ], () => { this.endSession(); this.ui.showMain(); }, 'ending');
  }
  objectives() {
    const o = [], h = (c) => this.hasClue(c), f = (k) => this.flag(k);
    const add = (t, done) => o.push({ t, done });
    add('Поговорить с шерифом Коулом (контора шерифа, главная улица).', h('missing'));
    add('Расспросить людей в салуне «Последний шанс».', h('returners'));
    add('Найти старого Изю в холмах на северо-западе и узнать легенду.', h('legend'));
    if (h('legend')) add('Поговорить с отцом Финчем в церкви (север города).', f('crossGiven'));
    if (h('legend')) add('Попросить кузнеца Брандта отлить серебряные пули.', f('silverGiven'));
    add('Узнать правду об обвале шахты (вдова Беннет — на кладбище).', h('mine_sealed'));
    if (h('mine_sealed')) add('Надавить на банкира Грейвса.', h('doc_mine'));
    if (f('graveHint')) add('Осмотреть могилу Лили Холт на кладбище.', h('empty_grave'));
    if (h('clay') || h('tracks') || h('map')) add('Найти, куда ведут следы в лесу к северо-востоку.', h('pit'));
    if (f('oscarRefused')) add('Достать бумагу от шерифа (или денег) для телеграфиста.', h('telegram'));
    add('Узнать, что видит по ночам мальчишка Пип.', h('night_walk'));
    add('Осмотреть шахту «Милость Господня» на западе.', h('vial'));
    if (this.keyCount() >= ACCUSE_NEED && !f('docExposed') && !f('docDead')) add('◆ Предъявить улики доктору Холту!', false);
    if (f('docExposed') || f('docDead')) add('◆ Отправиться к Яме и уничтожить Сердце Голодного.', f('bossDead'));
    if (f('docDead') && !h('doc_diary')) add('Обыскать погреб доктора.', h('doc_diary'));
    add(`Пережить ночи и защищать жителей. Осталось ночей: ${Math.max(0, 8 - this.dayNum())}.`, false);
    o.sort((a, b) => a.done - b.done);
    return o;
  }

  // ---------- взаимодействие ----------
  scanInteract(p) {
    let best = null, bd = 1e9;
    const consider = (d, item) => { if (d < bd) { bd = d; best = item; } };
    if (p.horse) return { kind: 'dismount', x: p.x, z: p.z, label: 'лошадь', verb: 'Спешиться', y: this.world.groundAt(p.x, p.z) };
    for (const h of this.horses) {
      if (h.rider) continue;
      const d = dist(p.x, p.z, h.x, h.z);
      if (d < 2.6) consider(d + 0.3, { kind: 'mount', h, x: h.x, z: h.z, label: `Лошадь (${h.C.name})`, verb: 'Сесть верхом' });
    }
    const o = this.otherPlayer(p);
    if (o && o.downed) { const d = dist(p.x, p.z, o.x, o.z); if (d < 2.4) consider(d - 1, { kind: 'revive', x: o.x, z: o.z, label: o.name, verb: 'Поднять (держать)' }); }
    for (const n of this.npcs) {
      const d = dist(p.x, p.z, n.x, n.z);
      if (d > 2.8) continue;
      if (n.alive && n.char.group.visible && !n.hostile && n.state !== 'dragged' && n.state !== 'home' && !n.surrenderT) consider(d, { kind: 'talk', n, x: n.x, z: n.z, label: n.metOnce ? n.name : n.d.role[0].toUpperCase() + n.d.role.slice(1), verb: 'Говорить' });
      else if (n.state === 'dead' && !n.searched && d < 2.2) consider(d, { kind: 'body', n, x: n.x, z: n.z, label: n.name, verb: 'Обыскать тело' });
    }
    for (const s of SPOTS) {
      const pos = s._pos || (s._pos = s.pos(this.world));
      const d = dist(p.x, p.z, pos.x, pos.z);
      if (d < s.r) consider(d + 0.5, { kind: 'spot', s, x: pos.x, z: pos.z, label: s.label, verb: 'Осмотреть' });
    }
    for (const c of this.world.caches) {
      if (this.state.caches[c.id]) continue;
      const d = dist(p.x, p.z, c.x, c.z);
      if (d < 2.6) consider(d + 0.5, { kind: 'cache', id: c.id, x: c.x, z: c.z, label: CACHES[c.id].label, verb: 'Осмотреть' });
    }
    if (best) best.y = this.world.groundAt(best.x, best.z);
    return best;
  }
  doInteract(p, it) {
    switch (it.kind) {
      case 'talk': this.dialogue.openNpc(it.n, p); break;
      case 'body': this.dialogue.openBody(it.n, p); break;
      case 'spot': this.dialogue.openSpot(it.s, p); break;
      case 'cache': this.dialogue.openCache(it.id, p); break;
      case 'mount': p.mount(it.h); break;
      case 'dismount': p.dismount(); break;
    }
  }

  // ---------- цикл ----------
  frame() {
    const now = performance.now();
    let dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.input.poll();
    const nav = this.input.nav();
    if (nav.any) this.audio.resume();
    if (this.mode === 'play') this.updatePlay(dt);
    else if (this.mode === 'dialog') { this.dialogue.update(nav); this.updateVisualOnly(dt); }
    else if (this.mode === 'dying') { this.updateVisualOnly(dt); }
    else { this.ui.update(dt, nav); this.updateVisualOnly(dt); }
    if (this.mode === 'card' || this.mode === 'book' || this.mode === 'pause') { /* уже обработано */ }
    if (this.state && this.mode !== 'menu') this.ui.hud(dt);
    const cine = this.mode === 'dialog' || this.mode === 'card';
    if (cine !== this._cine) { this._cine = cine; document.body.classList.toggle('cine', cine); }
    this.updateLighting(dt);
    this.updateCamera(dt);
    this.audio.update(dt, !!this.state);
    this.post.render(this.scene, this.camera, this.time);
    this.input.endFrame();
  }
  updateVisualOnly(dt) {
    if (this.mode === 'menu') { this.ambient.update(dt, this.nightness || 0); this.fx.update(dt); return; }
    this.fx.update(dt * 0.3);
    this.world.update(dt, this.nightness || 0);
  }
  updatePlay(dt) {
    const st = this.state;
    // время
    const h0 = this.hour();
    if (!this.eclipse) {
      const rate = (h0 >= 7 && h0 < 19.5) ? 1 / 38 : (h0 >= 20.4 || h0 < 5.5) ? 1 / 30 : 1 / 26;
      st.t += dt * rate;
    }
    const h1 = this.hour();
    const crossed = (x) => (h0 < x && h1 >= x) || (h0 > h1 && x <= h1);
    if (crossed(20)) this.nightStart(this.dayNum());
    if (crossed(5.5)) this.dawn();
    if (this.mode !== 'play') return;
    if (crossed(7)) { this.morning(); return; }
    if (this.isNight()) this.runSchedule();

    // игроки
    const ctrls = this.players.map((_, i) => this.input.ctrl(i));
    if (ctrls.some((c) => c.pause)) { this.ui.showPause(); return; }
    if (ctrls.some((c) => c.book)) { this.ui.openBook(); return; }
    this.players.forEach((p, i) => {
      const c = ctrls[i];
      if (c.camL) { this.camYaw += dt * 1.6; this.camManualT = 2; }
      if (c.camR) { this.camYaw -= dt * 1.6; this.camManualT = 2; }
      p.update(dt, c);
      if (c.call && !p.downed) this.callHorse(p);
      if (!p.horse && !p.downed) this.pushFromHorses(p);
      p.focus = null; p.prompt = '';
      if (p.downed) return;
      const it = this.scanInteract(p);
      if (it) {
        p.focus = it;
        p.prompt = `[${this.input.glyph(i, 'interact')}] ${it.verb}: ${it.label}`;
        if (it.kind === 'revive') {
          if (c.interactHeld) { p.reviveT += dt; p.prompt = `Поднимаю напарника… ${Math.round(p.reviveT / 1.5 * 100)}%`; if (p.reviveT >= 1.5) { p.reviveT = 0; this.otherPlayer(p).revive(40); } }
          else p.reviveT = 0;
        } else if (c.interact) this.doInteract(p, it);
      }
    });
    if (this.mode !== 'play') return;
    for (const h of this.horses) h.update(dt);
    this.ambient.update(dt, this.nightness || 0);
    for (const n of this.npcs) n.update(dt);
    for (const d of this.demons) d.update(dt);
    this.demons = this.demons.filter((d) => !d.dead);
    if (this.boss) { this.boss.update(dt); if (this.boss.state === 'gone') this.boss = null; }
    this.fx.update(dt);
    this.world.update(dt, this.nightness || 0);
    this.checkTriggers(dt);
  }
  checkTriggers(dt) {
    const st = this.state;
    this.trigT = (this.trigT || 0) - dt;
    if (this.trigT > 0) return;
    this.trigT = 0.5;
    for (const p of this.players) {
      for (const k of ['cemetery', 'hut', 'mission']) if (dist(p.x, p.z, LOC[k].x, LOC[k].z) < 35) this.discover(k);
      if (dist(p.x, p.z, LOC.pit.x, LOC.pit.z) < 45) this.discover('pit');
      if (this.flag('docExposed') && !this.flag('finaleStarted') && dist(p.x, p.z, LOC.pit.x, LOC.pit.z) < 26) { this.startFinale(); return; }
      // доктор ночью в лесу
      const doc = this.npc('doctor');
      if (doc && doc.alive && doc.state === 'nightWalk' && doc.char.group.visible && dist(p.x, p.z, doc.x, doc.z) < 22 && Math.abs(doc.x) > 105 && !this.hasClue('night_walk')) {
        this.addClue('night_walk');
        this.notify('Вы видели доктора Холта ночью — он шёл к лесу!', 'clue');
      }
    }
    // сердцебиение у Ямы
    const pd = this.nearestPlayerDist(LOC.pit.x, LOC.pit.z);
    if (pd < 60) { this.beatT = (this.beatT || 0) - 0.5; if (this.beatT <= 0) { this.audio.heartbeat(1 - pd / 60); this.beatT = 1.5; } }
  }

  // ---------- свет и камера ----------
  updateLighting(dt) {
    const h = this.state ? this.hour() : 18.3;
    let a = KF[0], b = KF[1];
    for (let i = 0; i < KF.length - 1; i++) if (h >= KF[i].h && h <= KF[i + 1].h) { a = KF[i]; b = KF[i + 1]; break; }
    const t = (h - a.h) / Math.max(0.001, b.h - a.h);
    let L = {
      sky: lerpHex(a.sky, b.sky, t, new THREE.Color()), sun: lerpHex(a.sun, b.sun, t, new THREE.Color()),
      hs: lerpHex(a.hs, b.hs, t, new THREE.Color()), hg: lerpHex(a.hg, b.hg, t, new THREE.Color()),
      sunI: lerp(a.sunI, b.sunI, t), hi: lerp(a.hi, b.hi, t), fn: lerp(a.fn, b.fn, t), ff: lerp(a.ff, b.ff, t), night: lerp(a.night, b.night, t),
    };
    this.eclT = clamp((this.eclT || 0) + (this.eclipse ? dt : -dt) * 0.5, 0, 1);
    if (this.eclT > 0) {
      const e = this.eclT;
      L.sky.lerp(_c1.set(ECLIPSE.sky), e); L.sun.lerp(_c1.set(ECLIPSE.sun), e); L.hs.lerp(_c1.set(ECLIPSE.hs), e); L.hg.lerp(_c1.set(ECLIPSE.hg), e);
      L.sunI = lerp(L.sunI, ECLIPSE.sunI, e); L.hi = lerp(L.hi, ECLIPSE.hi, e); L.fn = lerp(L.fn, ECLIPSE.fn, e); L.ff = lerp(L.ff, ECLIPSE.ff, e); L.night = lerp(L.night, 1, e);
    }
    const qf = this.settings.quality === 'low' ? 0.75 : 1;
    this.scene.background.copy(L.sky);
    if (this.sky) {
      const u = this.sky.material.uniforms;
      u.horizon.value.copy(L.sky);
      u.top.value.copy(L.sky).multiplyScalar(L.night > 0.5 ? 0.45 : 0.62).lerp(_c2.set(L.night > 0.5 ? '#05070d' : '#5d7390'), L.night > 0.5 ? 0.6 : 0.45);
      u.sunCol.value.copy(L.sun);
      u.sunAmt.value = (1 - L.night) * (this.eclT > 0 ? 0.2 : 1);
      u.cloudCol.value.copy(L.hs).lerp(L.sun, 0.35).multiplyScalar(L.night > 0.5 ? 0.25 : 1);
      u.cloudAmt.value = 0.85 - L.night * 0.35;
      u.time.value = this.time;
      this.sky.position.copy(this.camera.position);
    }
    this.scene.fog.color.copy(L.sky); this.scene.fog.near = L.fn; this.scene.fog.far = L.ff * qf;
    this.camera.far = L.ff * qf + 25; this.camera.updateProjectionMatrix();
    this.hemi.color.copy(L.hs); this.hemi.groundColor.copy(L.hg); this.hemi.intensity = L.hi;
    this.sun.color.copy(L.sun); this.sun.intensity = L.sunI;
    const dayT = clamp((h - 5.5) / 14.5, 0, 1);
    const el = L.night > 0.7 ? 0.9 : 0.35 + Math.sin(dayT * Math.PI) * 0.9;
    const az = L.night > 0.7 ? 2.2 : -1.2 + dayT * 2.6;
    const ct = this.camTarget;
    this.sun.position.set(ct.x + Math.cos(az) * Math.cos(el) * 100, ct.y + Math.sin(el) * 100, ct.z + Math.sin(az) * Math.cos(el) * 100);
    this.sun.target.position.copy(ct);
    if (this.sky) this.sky.material.uniforms.sunDir.value.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    this.nightness = L.night;
    if (MAT.rimCol) MAT.rimCol.value.copy(L.sun).multiplyScalar(L.night > 0.5 ? 0.55 : 0.35);
    this.post.grade(L.night, this.eclT || 0);
    for (const p of this.players) p.light.intensity = L.night * (p.downed ? 4 : 9);
    this.audio.setNight(L.night, this.demons.some((d) => d.alive && d.state === 'hunt') ? 1 : 0);
  }
  updateCamera(dt) {
    const cam = this.camera;
    if (!this.state || this.mode === 'menu' && !this.players.length) {
      // облёт города в меню
      const a = this.time * 0.05;
      cam.position.set(Math.cos(a) * 70, 26, Math.sin(a) * 70);
      cam.lookAt(0, 4, 0);
      this.camTarget.set(0, 0, 0);
      return;
    }
    // разговор: крупный план из-за плеча агента
    if (this.mode === 'dialog' && this.dialogue.npc && this.talkPlayer) {
      const n = this.dialogue.npc, p = this.talkPlayer;
      const dx = n.x - p.x, dz = n.z - p.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
      const side = this._dlgSide || (this._dlgSide = Math.random() < 0.5 ? 1 : -1);
      const cx = p.x - ux * 1.7 - uz * 0.8 * side, cz = p.z - uz * 1.7 + ux * 0.8 * side;
      cam.position.set(cx, this.world.groundAt(p.x, p.z) + 1.9 * (p.horse ? 1.5 : 1), cz);
      cam.lookAt(n.x, this.world.groundAt(n.x, n.z) + 1.3 * (n.d.look.h || 1), n.z);
      if (!p.horse) { p.rot = Math.atan2(dx, dz); p.char.group.rotation.y = p.rot; }
      this.camTarget.set(n.x, 0, n.z);
      return;
    }
    this._dlgSide = 0;
    const ps = this.players;
    let mx = 0, mz = 0;
    for (const p of ps) { mx += p.x; mz += p.z; }
    mx /= ps.length; mz /= ps.length;
    let sep = 0;
    if (ps.length > 1) sep = dist(ps[0].x, ps[0].z, ps[1].x, ps[1].z);
    if (this.boss && this.boss.alive) {
      const bd = dist(mx, mz, this.boss.x, this.boss.z);
      if (bd < 45) { mx = lerp(mx, this.boss.x, 0.35); mz = lerp(mz, this.boss.z, 0.35); sep = Math.max(sep, 26 + bd * 0.4); }
    }
    const my = this.world.groundAt(mx, mz);
    const target = this._ct || (this._ct = new THREE.Vector3(mx, my, mz));
    const k = 1 - Math.exp(-dt * 6);
    target.x += (mx - target.x) * k; target.z += (mz - target.z) * k; target.y += (my - target.y) * k;
    this.camTarget.copy(target);
    const riding = this.players.some((p) => p.horse);
    const base = riding ? 8.2 : 6.0;
    const want = clamp(base + sep * 0.95, base, 46);
    this.camDistNow = this.camDistNow ? lerp(this.camDistNow, want, 1 - Math.exp(-dt * 2.5)) : want;
    const D = this.camDistNow;
    // низкий ракурс вблизи, выше — когда напарники разошлись
    const pitch = lerp(0.2, 0.85, clamp((D - base) / 36, 0, 1)) + (riding ? 0.06 : 0);
    const yaw = this.camYaw, sx = Math.sin(yaw), sz = Math.cos(yaw);
    const ty = target.y + 1.55, tp = Math.tan(pitch), H = Math.cos(pitch) * D;
    // препятствия по линии взгляда: дома и склоны — камера подъезжает ближе
    const freeAt = (yw) => {
      const ax = Math.sin(yw), az = Math.cos(yw);
      for (let s = 0.8; s < H; s += 0.5) {
        const x = target.x + ax * s, z = target.z + az * s, y = ty + s * tp;
        if ((y < 9 && this.world.blockedAt(x, z, true)) || this.world.groundAt(x, z) + 0.6 > y) return Math.max(1.6, s - 0.6);
      }
      return H;
    };
    let free = freeAt(yaw);
    // умная камера: если за спиной стена — плавно отворачиваемся к свободному обзору
    this.camManualT = Math.max(0, (this.camManualT || 0) - dt);
    if (free < Math.min(H, 4.5) && this.camManualT <= 0 && this.mode === 'play') {
      let best = yaw, bf = free;
      for (const d of [0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2.0, -2.0]) { const f = freeAt(yaw + d); if (f > bf + 0.8) { bf = f; best = yaw + d; } if (bf >= H) break; }
      if (best !== yaw) this.camYaw += (best - yaw) * Math.min(1, dt * 2.2);
    }
    const wantH = Math.min(H, free);
    this.camHNow = this.camHNow === undefined ? wantH : lerp(this.camHNow, wantH, 1 - Math.exp(-dt * (wantH < this.camHNow ? 14 : 2.2)));
    const Hc = this.camHNow;
    let px = target.x + sx * Hc, pz = target.z + sz * Hc;
    let py = ty + Hc * tp + (Hc < 3 ? (3 - Hc) * 0.5 : 0);
    // навесы: герой под крышей — камера под её краем; камера у края — над или под ним
    const ru = this.world.roofAt(target.x, target.z);
    if (ru !== null) py = Math.min(py, ru - 0.45);
    else { const rc = this.world.roofAt(px, pz); if (rc !== null && py > rc - 0.5 && py < rc + 0.7) py = rc + 0.7; }
    const gy = this.world.groundAt(px, pz) + 0.7;
    if (py < gy) py = gy;
    if (this.shake > 0 && this.settings.shake) {
      this.shake -= dt;
      px += (Math.random() - 0.5) * this.shake; py += (Math.random() - 0.5) * this.shake; pz += (Math.random() - 0.5) * this.shake;
    } else this.shake = Math.max(0, this.shake - dt);
    cam.position.set(px, py, pz);
    cam.lookAt(target.x, target.y + 1.45, target.z);
  }
}
