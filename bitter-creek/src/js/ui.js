// Интерфейс: меню, HUD, блокнот (улики, жители, карта, цели), текстовые карточки, уведомления.
import * as THREE from 'three';
import { CLUES, KEY_CLUES, ACCUSE_NEED } from './story.js';
import { LOC, ROADS, heightAt, groundColor, creekZ, forestMask } from './terrain.js';
import { fmtHour, clamp } from './util.js';
import { hasSave } from './save.js';

const $ = (s) => document.querySelector(s);

class MenuList {
  constructor(el, g) { this.el = el; this.g = g; this.items = []; this.sel = 0; }
  set(items) { this.items = items; this.sel = Math.max(0, items.findIndex((i) => !i.disabled)); this.render(); }
  render() {
    this.el.innerHTML = '';
    this.items.forEach((it, i) => {
      const b = document.createElement('div');
      b.className = 'mbtn' + (it.disabled ? ' dis' : '') + (i === this.sel ? ' sel' : '');
      b.innerHTML = it.value ? `<span>${it.label}</span><span class="val">‹ ${it.value()} ›</span>` : it.label;
      b.onmouseenter = () => { if (!it.disabled) { this.sel = i; this.hl(); } };
      b.onclick = (e) => {
        if (it.disabled) return;
        this.sel = i;
        if (it.value) { const r = e.clientX > b.getBoundingClientRect().left + b.offsetWidth / 2; (r ? it.right : it.left)?.(); this.render(); }
        else it.fn?.();
        this.g.audio.ui();
      };
      this.el.appendChild(b);
    });
  }
  hl() { [...this.el.children].forEach((c, i) => c.classList.toggle('sel', i === this.sel)); }
  update(nav) {
    const n = this.items.length; if (!n) return;
    const step = (d) => { let k = this.sel; for (let t = 0; t < n; t++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } this.sel = k; this.hl(); this.g.audio.ui(); };
    if (nav.up) step(-1);
    if (nav.down) step(1);
    const it = this.items[this.sel];
    if (it && it.value && (nav.left || nav.right)) { (nav.right ? it.right : it.left)?.(); this.render(); this.g.audio.ui(); }
    else if (nav.ok && it && !it.disabled) { this.g.audio.ui(); it.fn?.(); }
  }
}

export class UI {
  constructor(g) {
    this.g = g;
    this.screen = $('#screen'); this.sTitle = $('#screen .stitle'); this.sBody = $('#screen .sbody');
    this.list = new MenuList($('#screen .slist'), g);
    this.card = $('#card'); this.book = $('#book');
    this.notesEl = $('#notes'); this.alertsEl = $('#alerts');
    this.hudEl = $('#hud'); this.clockEl = $('#clock'); this.moneyEl = $('#money');
    this.pEls = [$('#p1'), $('#p2')];
    this.hurtEl = $('#hurt'); this.labelEls = [$('#lbl1'), $('#lbl2')];
    this.fadeEl = $('#fade');
    this.hudT = 0; this.bookTab = 0; this.cardState = null; this.onBack = null;
    this.tabs = ['Улики', 'Жители', 'Карта', 'Цели'];
    this.arrows = new Map();
    this._v = new THREE.Vector3();
  }

  // ---------- экраны ----------
  showScreen(title, body, items, onBack) {
    this.screen.classList.remove('hidden');
    this.sTitle.innerHTML = title; this.sBody.innerHTML = body || '';
    this.list.set(items); this.onBack = onBack || null;
  }
  hideScreen() { this.screen.classList.add('hidden'); }
  showMain() {
    const g = this.g;
    g.mode = 'menu';
    this.hudEl.classList.add('hidden');
    this.screen.classList.add('main');
    const items = [];
    if (hasSave()) items.push({ label: 'Продолжить', fn: () => g.loadGame() });
    items.push({ label: 'Новая игра — один игрок', fn: () => g.newGame(1) });
    items.push({ label: 'Новая игра — два игрока', fn: () => g.newGame(2) });
    items.push({ label: 'Настройки', fn: () => this.showSettings(() => this.showMain()) });
    items.push({ label: 'Управление', fn: () => this.showControls(() => this.showMain()) });
    items.push({ label: 'Выход', fn: () => g.quit() });
    this.showScreen('<div class="logo">БИТТЕР-КРИК</div><div class="sub">нуарный вестерн · 1887</div>',
      `<div class="pads">Геймпадов подключено: ${g.input.pads.length}</div>`, items, null);
  }
  showPause() {
    const g = this.g;
    g.mode = 'pause';
    this.screen.classList.remove('main');
    const day = g.hour() >= 7 && g.hour() < 19.5 && !g.eclipse;
    this.showScreen('Пауза', '', [
      { label: 'Продолжить', fn: () => this.resume() },
      { label: 'Блокнот', fn: () => { this.hideScreen(); this.openBook(); } },
      { label: day ? 'Сохранить игру' : 'Сохранить (только днём)', disabled: !day, fn: () => { g.saveGame(true); this.resume(); } },
      { label: 'Настройки', fn: () => this.showSettings(() => this.showPause()) },
      { label: 'Управление', fn: () => this.showControls(() => this.showPause()) },
      { label: 'В главное меню', fn: () => { g.endSession(); this.showMain(); } },
    ], () => this.resume());
  }
  resume() { this.hideScreen(); this.g.mode = 'play'; }
  showSettings(back) {
    const g = this.g, s = g.settings;
    const Q = ['low', 'medium', 'high'], QN = { low: 'Низкое', medium: 'Среднее', high: 'Высокое' };
    const prevMode = g.mode;
    this.screen.classList.remove('main');
    const items = [
      { label: 'Качество графики', value: () => QN[s.quality], left: () => { s.quality = Q[Math.max(0, Q.indexOf(s.quality) - 1)]; this.qChanged = true; g.applySettings(); }, right: () => { s.quality = Q[Math.min(2, Q.indexOf(s.quality) + 1)]; this.qChanged = true; g.applySettings(); } },
      { label: 'Громкость', value: () => Math.round(s.volume * 100) + '%', left: () => { s.volume = clamp(Math.round(s.volume * 10 - 1) / 10, 0, 1); g.applySettings(); }, right: () => { s.volume = clamp(Math.round(s.volume * 10 + 1) / 10, 0, 1); g.applySettings(); } },
      { label: 'Полный экран', value: () => (s.fullscreen ? 'Да' : 'Нет'), left: () => { s.fullscreen = !s.fullscreen; g.applySettings(); }, right: () => { s.fullscreen = !s.fullscreen; g.applySettings(); } },
      { label: 'Тряска камеры', value: () => (s.shake ? 'Да' : 'Нет'), left: () => { s.shake = !s.shake; g.applySettings(); }, right: () => { s.shake = !s.shake; g.applySettings(); } },
      { label: 'Плёночный фильтр', value: () => (s.grade ? 'Да' : 'Нет'), left: () => { s.grade = !s.grade; g.applySettings(); }, right: () => { s.grade = !s.grade; g.applySettings(); } },
      { label: 'Назад', fn: () => { if (this.qChanged) { this.qChanged = false; g.notify('Качество применится после перезапуска игры.'); } back(); } },
    ];
    this.showScreen('Настройки', '<div class="hint">Влево/вправо — изменить значение. «Низкое» качество — для старых ноутбуков.</div>', items, () => items[items.length - 1].fn());
    g.mode = prevMode === 'menu' ? 'menu' : 'pause';
  }
  showControls(back) {
    this.screen.classList.remove('main');
    const html = `<table class="ctl">
      <tr><th></th><th>Геймпад</th><th>Игрок 1 (клавиатура)</th><th>Игрок 2 (клавиатура)</th></tr>
      <tr><td>Ходить</td><td>Левый стик</td><td>W A S D</td><td>Стрелки</td></tr>
      <tr><td>Бежать</td><td>LT / нажать стик</td><td>Shift</td><td>Правый Shift</td></tr>
      <tr><td>Целиться</td><td>Правый стик</td><td>Мышь</td><td>—</td></tr>
      <tr><td>Стрелять</td><td>RT</td><td>ЛКМ / Пробел</td><td>Правый Ctrl / Num0</td></tr>
      <tr><td>Удар кулаком</td><td>X</td><td>ПКМ / F</td><td>/ (слэш) / Num1</td></tr>
      <tr><td>Говорить, осмотреть, поднять</td><td>A</td><td>E</td><td>Enter</td></tr>
      <tr><td>Перезарядка</td><td>B</td><td>R</td><td>. (точка) / Num2</td></tr>
      <tr><td>Свинец / серебро</td><td>Y</td><td>Q</td><td>, (запятая) / Num3</td></tr>
      <tr><td>Сесть на лошадь / спешиться</td><td>A</td><td>E</td><td>Enter</td></tr>
      <tr><td>Свистнуть лошадь</td><td>R3 (нажать правый стик)</td><td>H</td><td>' (апостроф)</td></tr>
      <tr><td>Повернуть камеру</td><td>LB / RB</td><td>Z / C</td><td>[ / ]</td></tr>
      <tr><td>Блокнот</td><td>Back</td><td>Tab</td><td>\\</td></tr>
      <tr><td>Пауза</td><td>Start</td><td>Esc</td><td>Backspace</td></tr></table>
      <div class="hint">В игре на двоих с двумя геймпадами: геймпад 1 — Эзра, геймпад 2 — Мэй. С одним геймпадом: Эзра на клавиатуре и мыши, Мэй на геймпаде.</div>`;
    const prevMode = this.g.mode;
    this.showScreen('Управление', html, [{ label: 'Назад', fn: back }], back);
    this.g.mode = prevMode === 'menu' ? 'menu' : 'pause';
  }

  // ---------- текстовые карточки ----------
  showCard(title, lines, onDone, cls = '') {
    this.g.mode = 'card';
    this.card.className = 'screen ' + cls;
    this.card.querySelector('.ctitle').textContent = title || '';
    const body = this.card.querySelector('.ctext'); body.innerHTML = '';
    this.cardState = { lines, i: 0, onDone, body, t: 0 };
    this.cardNext();
  }
  cardNext() {
    const c = this.cardState;
    if (c.i >= c.lines.length) { this.card.classList.add('hidden'); this.cardState = null; c.onDone && c.onDone(); return; }
    const p = document.createElement('p'); p.textContent = c.lines[c.i++]; p.className = 'fadein';
    c.body.appendChild(p);
    c.at = performance.now();
    this.card.querySelector('.chint').textContent = c.i >= c.lines.length ? '▸ продолжить' : '▸ далее';
  }

  // ---------- блокнот ----------
  openBook() { this.g.mode = 'book'; this.book.classList.remove('hidden'); this.renderBook(); }
  closeBook() { this.book.classList.add('hidden'); this.g.mode = 'play'; }
  renderBook() {
    const tabs = this.book.querySelector('.tabs');
    tabs.innerHTML = this.tabs.map((t, i) => `<span class="tab ${i === this.bookTab ? 'on' : ''}" data-i="${i}">${t}</span>`).join('');
    tabs.querySelectorAll('.tab').forEach((el) => { el.onclick = () => { this.bookTab = +el.dataset.i; this.renderBook(); }; });
    const c = this.book.querySelector('.bcontent');
    c.scrollTop = 0;
    const g = this.g;
    if (this.bookTab === 0) {
      const kc = g.keyCount();
      let h = '';
      if (kc >= 2 || g.flag('docExposed')) h += `<div class="suspect">Все нити ведут к доктору Эймосу Холту. Ключевых улик: <b>${kc}</b> из ${ACCUSE_NEED} нужных для обвинения.</div>`;
      if (!g.state.clues.length) h += '<p class="empty">Пока ничего. Поговорите с шерифом.</p>';
      for (const id of g.state.clues.slice().reverse()) {
        const cl = CLUES[id]; if (!cl) continue;
        h += `<div class="clue ${cl.key ? 'key' : ''}"><div class="ct">${cl.key ? '◆ ' : ''}${cl.t}</div><div class="cd">${cl.d}</div></div>`;
      }
      c.innerHTML = h;
    } else if (this.bookTab === 1) {
      let h = '<table class="res">';
      for (const n of g.npcs) {
        let st = 'в городе', cls = '';
        if (n.state === 'fled') { st = 'скрылся'; cls = 'warn'; }
        else if (n.revealed) { st = 'Пустой — уничтожен'; cls = 'hollow'; }
        else if (n.missing) { st = 'пропал ночью'; cls = 'bad'; }
        else if (!n.alive) { st = n.killedBy === 'players' ? 'убит вами' : 'мёртв'; cls = 'bad'; }
        else if (n.returned) { st = 'вернулся… странный'; cls = 'warn'; }
        const met = n.metOnce ? '' : ' <span class="dim">(не знакомы)</span>';
        h += `<tr><td>${n.name}${met}</td><td class="dim">${n.d.role}</td><td class="${cls}">${st}</td></tr>`;
      }
      h += '</table>';
      h += `<div class="stats">Пропало: ${g.state.lostTotal} · Спасено вами: ${g.state.saved} · Невинных убито: ${g.state.innocents} · Пустых уничтожено: ${g.state.hollowsKilled}</div>`;
      c.innerHTML = h;
    } else if (this.bookTab === 2) {
      c.innerHTML = '<canvas id="mapc" width="560" height="560"></canvas><div class="maplegend">● Эзра  ● Мэй  ✕ крик  ? неизвестно</div>';
      this.drawMap(c.querySelector('#mapc'));
    } else {
      c.innerHTML = '<ul class="obj">' + g.objectives().map((o) => `<li class="${o.done ? 'done' : ''}">${o.t}</li>`).join('') + '</ul>';
    }
  }
  updateBook(nav) {
    if (nav.left || nav.tabL) { this.bookTab = (this.bookTab + 3) % 4; this.renderBook(); this.g.audio.ui(); }
    if (nav.right || nav.tabR) { this.bookTab = (this.bookTab + 1) % 4; this.renderBook(); this.g.audio.ui(); }
    const c = this.book.querySelector('.bcontent');
    if (nav.up) c.scrollTop -= 80; if (nav.down) c.scrollTop += 80;
    if (nav.back || nav.ok) this.closeBook();
  }
  mapBg() {
    if (this._mapBg) return this._mapBg;
    const N = 140, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i / N - 0.5) * 800, z = (j / N - 0.5) * 800, h = heightAt(x, z);
      let c = Math.hypot(x - LOC.pit.x, z - LOC.pit.z) < 42 ? [0.29, 0.28, 0.18] : groundColor(x, z, h, 1, 0.5);
      const shade = clamp(1 - Math.max(0, h) / 140, 0.55, 1);
      if (h < -1.4 && Math.abs(z - creekZ(x)) < 10) c = [0.35, 0.45, 0.5];
      const k = (j * N + i) * 4;
      img.data[k] = c[0] * 255 * shade * 0.9 + 20; img.data[k + 1] = c[1] * 255 * shade * 0.85 + 15; img.data[k + 2] = c[2] * 255 * shade * 0.7 + 10; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return (this._mapBg = cv);
  }
  drawMap(cv) {
    const g = this.g, ctx = cv.getContext('2d'), S = cv.width;
    const P = (x, z) => [(x / 800 + 0.5) * S, (z / 800 + 0.5) * S];
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.mapBg(), 0, 0, S, S);
    ctx.fillStyle = 'rgba(40,25,10,0.25)'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(80,50,25,0.75)';
    for (const r of ROADS) {
      ctx.lineWidth = r.w > 4 ? 2.5 : 1.2; ctx.setLineDash(r.w > 4 ? [] : [3, 3]);
      ctx.beginPath(); r.pts.forEach((p, i) => { const [a, b] = P(p[0], p[1]); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(40,25,15,0.85)';
    for (const id in g.world.anchors) {
      const a = g.world.anchors[id]; if (!a.w || ['mine', 'mission'].includes(id)) continue;
      const c = g.world.toWorld(id, 0, -a.d / 2); const [x, y] = P(c.x, c.z);
      ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
    }
    ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'center';
    const mark = (x, z, label, color = '#2a1408', sym = '■') => {
      const [a, b] = P(x, z);
      ctx.fillStyle = color; ctx.fillText(sym, a, b + 4);
      ctx.fillStyle = 'rgba(245,230,200,0.9)'; ctx.strokeStyle = 'rgba(30,15,5,0.8)'; ctx.lineWidth = 3;
      ctx.strokeText(label, a, b - 8); ctx.fillText(label, a, b - 8);
    };
    const D = g.state.discovered;
    mark(0, 0, 'Биттер-Крик');
    if (D.cemetery) mark(LOC.cemetery.x, LOC.cemetery.z, 'Кладбище', '#2a1408', '✝');
    mark(LOC.mine.x, LOC.mine.z, 'Шахта');
    mark(LOC.farm.x, LOC.farm.z, 'Ферма Гриффинов');
    if (D.hut) mark(LOC.hut.x, LOC.hut.z, 'Хижина Изи');
    if (D.mission) mark(LOC.mission.x, LOC.mission.z, 'Миссия', '#2a1408', '✝');
    if (D.pit) mark(LOC.pit.x, LOC.pit.z, 'ЯМА', '#8a0a0a', '●');
    else if (D.pit_area) {
      const [a, b] = P(LOC.pit.x + 15, LOC.pit.z + 10);
      ctx.strokeStyle = 'rgba(120,10,10,0.8)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(a, b, 30, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#8a0a0a'; ctx.fillText('?', a, b + 5);
    }
    for (const d of g.demons) if (d.victim && d.alive) { const [a, b] = P(d.x, d.z); ctx.fillStyle = '#d01010'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('✕', a, b + 6); }
    const cols = ['#e04030', '#3080e0'];
    g.players.forEach((p, i) => { const [a, b] = P(p.x, p.z); ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(a, b, 5, 0, 6.28); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
  }

  // ---------- уведомления ----------
  notify(text, cls = '') {
    const d = document.createElement('div');
    d.className = 'note ' + cls; d.textContent = text;
    this.notesEl.appendChild(d);
    while (this.notesEl.children.length > 6) this.notesEl.removeChild(this.notesEl.firstChild);
    setTimeout(() => d.classList.add('out'), 6500);
    setTimeout(() => d.remove(), 7500);
  }
  flashHurt() { this.hurtEl.style.opacity = 0.7; }
  fade(v) { this.fadeEl.style.opacity = v; }

  // ---------- HUD ----------
  update(dt, nav) {
    const g = this.g;
    if (this.hurtEl.style.opacity > 0) this.hurtEl.style.opacity = Math.max(0, this.hurtEl.style.opacity - dt * 1.5);
    if (g.mode === 'menu' || g.mode === 'pause') { if (nav.back && this.onBack) { this.g.audio.ui(); this.onBack(); } else this.list.update(nav); return; }
    if (g.mode === 'card' && this.cardState) {
      if (performance.now() - this.cardState.at > 350 && nav.any) this.cardNext();
      return;
    }
    if (g.mode === 'book') { this.updateBook(nav); return; }
  }
  hud(dt) {
    const g = this.g;
    this.hudT -= dt;
    this.updateLabels();
    this.updateArrows();
    if (this.hudT > 0) return;
    this.hudT = 0.1;
    const h = g.hour(), day = g.dayNum(), nn = g.nightNum();
    const isNight = g.isNight();
    this.clockEl.innerHTML = `<div class="ct1">${g.eclipse ? 'ЗАТМЕНИЕ' : (isNight ? 'НОЧЬ ' + nn + ' из 7' : 'ДЕНЬ ' + day) + ' · ' + fmtHour(h)}</div>` +
      `<div class="ct2">${g.eclipse ? 'ЧЁРНОЕ ЗАТМЕНИЕ' : isNight ? 'Защищайте жителей' : 'До чёрной луны: ' + Math.max(0, 7 - g.nightsPassed()) + ' ноч.'}</div>`;
    const rep = g.state.rep;
    const repT = rep >= 25 ? 'город вам доверяет' : rep >= -10 ? 'город настороже' : rep >= -45 ? 'город вас боится' : 'вас считают убийцами';
    this.moneyEl.innerHTML = `$${g.state.money}<span class="rep ${rep < -10 ? 'bad' : rep >= 25 ? 'good' : ''}">${repT}</span>`;
    g.players.forEach((p, i) => {
      const el = this.pEls[i];
      el.classList.remove('hidden');
      const pips = Array.from({ length: 6 }, (_, k) => `<i class="${k < p.clip ? (p.clipType === 'silver' ? 'ag' : 'pb') : 'em'}"></i>`).join('');
      let status = '';
      if (p.downed) status = `<div class="down">РАНЕН · ${Math.ceil(p.downT)} с · напарник: [${g.input.glyph(1 - i, 'interact')}]</div>`;
      else if (p.reloadT > 0) status = '<div class="rl">перезарядка…</div>';
      el.innerHTML = `<div class="pn">${p.name}</div>
        <div class="hp"><div style="width:${p.hp}%"></div></div>
        <div class="am">${pips}<span>свинец ${p.ammo} · <b class="agt">серебро ${p.silver}</b>${p.prefer === 'silver' ? ' ◂' : ''}</span></div>
        ${status}<div class="prompt">${p.prompt || ''}</div>`;
    });
    if (g.players.length < 2) this.pEls[1].classList.add('hidden');
  }
  updateLabels() {
    const g = this.g;
    g.players.forEach((p, i) => {
      const el = this.labelEls[i];
      const t = p.focus;
      if (!t || g.mode !== 'play') { el.style.display = 'none'; return; }
      this._v.set(t.x, (t.y || 0) + 2.4, t.z).project(g.camera);
      if (this._v.z > 1) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.textContent = t.label;
      el.style.left = ((this._v.x + 1) / 2 * innerWidth) + 'px';
      el.style.top = ((1 - this._v.y) / 2 * innerHeight) + 'px';
    });
  }
  updateArrows() {
    const g = this.g;
    const active = new Set();
    for (const d of g.demons) {
      if (!d.alive || !d.victim) continue;
      active.add(d);
      let el = this.arrows.get(d);
      if (!el) { el = document.createElement('div'); el.className = 'arrow'; el.innerHTML = '<div class="ar">▲</div><div class="at"></div>'; this.alertsEl.appendChild(el); this.arrows.set(d, el); }
      this._v.set(d.x, g.world.groundAt(d.x, d.z) + 2, d.z).project(g.camera);
      let x = this._v.x, y = this._v.y;
      if (this._v.z > 1) { x = -x; y = -y; }
      const on = Math.abs(x) < 0.9 && Math.abs(y) < 0.85 && this._v.z <= 1;
      const ang = Math.atan2(-y, x);
      if (!on) { const k = 0.9 / Math.max(Math.abs(x), Math.abs(y) / 0.95); x *= k; y *= k; }
      el.style.left = ((x + 1) / 2 * innerWidth) + 'px';
      el.style.top = ((1 - y) / 2 * innerHeight) + 'px';
      el.querySelector('.ar').style.transform = on ? 'rotate(180deg)' : `rotate(${ang + Math.PI / 2}rad)`;
      const dd = Math.round(g.nearestPlayerDist(d.x, d.z));
      el.querySelector('.at').textContent = `${d.victim.name} · ${dd} м`;
    }
    for (const [d, el] of this.arrows) if (!active.has(d)) { el.remove(); this.arrows.delete(d); }
  }
}
