// Диалоги: темы, проверка серебром, обвинения, осмотр мест и тел.
import { TOPICS, TOPIC_ORDER, DEFLECT, HOLLOW_PERSONAL, HOLLOW_GREET, ACCUSE_SCENE, BURN_SCENE, CACHES } from './story.js';
import { pick } from './util.js';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export class Dialogue {
  constructor(g) {
    this.g = g;
    this.el = document.getElementById('dialog');
    this.nameEl = this.el.querySelector('.dname');
    this.textEl = this.el.querySelector('.dtext');
    this.choEl = this.el.querySelector('.dchoices');
    this.choices = []; this.sel = 0; this.npc = null;
  }
  get open() { return this.g.mode === 'dialog'; }
  begin(player, speaker) {
    this.g.mode = 'dialog'; this.player = player; this.g.talkPlayer = player; this.speaker = speaker;
    this.el.classList.remove('hidden');
    this.g.audio.ui();
  }
  openNpc(npc, player) {
    this.npc = npc; npc.talking = true; this.first = true;
    this.begin(player, npc.name);
    this.root();
  }
  openSpot(spot, player) { this.npc = null; this.begin(player, spot.label); spot.use(this.g, this); }
  openBody(npc, player) {
    this.npc = null; this.begin(player, npc.name + ' (тело)');
    const lines = this.g.searchBody(npc);
    this.say(lines);
  }
  openCache(id, player) {
    const c = CACHES[id];
    this.npc = null; this.begin(player, c.label);
    this.g.takeCache(id);
    this.say(c.text);
  }
  close() {
    if (this.npc) this.npc.talking = false;
    this.npc = null; this.choices = [];
    this.el.classList.add('hidden');
    if (this.g.mode === 'dialog') this.g.mode = 'play';
    this.g.talkPlayer = null;
  }

  fmt(t) {
    const name = this.npc ? this.npc.name.split(' ').slice(-1)[0] : '';
    t = t.replace(/\{name\}/g, this.npc ? this.npc.name : name);
    return t.split('\n').map((seg) => seg.startsWith('*') ? `<p class="narr">${esc(seg.slice(1))}</p>` : (seg.startsWith('(') ? `<p class="sys">${esc(seg)}</p>` : `<p>«${esc(seg)}»</p>`)).join('');
  }
  render(text, choices, speaker) {
    this.nameEl.textContent = speaker || this.speaker || '';
    this.textEl.innerHTML = this.fmt(text);
    this.choices = choices; this.sel = 0;
    this.choEl.innerHTML = '';
    choices.forEach((c, i) => {
      const b = document.createElement('div');
      b.className = 'choice' + (c.t.startsWith('◆') ? ' key' : '') + (c.t.startsWith('✝') ? ' holy' : '');
      b.textContent = c.t;
      b.onmouseenter = () => { this.sel = i; this.hl(); };
      b.onclick = () => { this.sel = i; this.pickSel(); };
      this.choEl.appendChild(b);
    });
    this.hl();
  }
  hl() { [...this.choEl.children].forEach((c, i) => c.classList.toggle('sel', i === this.sel)); const s = this.choEl.children[this.sel]; if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest' }); }
  pickSel() { const c = this.choices[this.sel]; if (c) { this.g.audio.ui(); c.fn(); } }
  update(nav) {
    if (!this.choices.length) return;
    if (nav.up) { this.sel = (this.sel + this.choices.length - 1) % this.choices.length; this.hl(); }
    if (nav.down) { this.sel = (this.sel + 1) % this.choices.length; this.hl(); }
    if (nav.ok) this.pickSel();
    else if (nav.back) {
      const last = this.choices[this.choices.length - 1];
      if (this.choices.length === 1) this.pickSel(); else if (last) last.fn();
    }
  }

  say(lines, after) {
    if (typeof lines === 'string') lines = [lines];
    let i = 0;
    const done = after || (() => (this.npc ? this.root() : this.close()));
    const show = () => {
      const last = i >= lines.length - 1;
      this.render(lines[i], [{ t: last ? 'Продолжить ▸' : 'Далее ▸', fn: () => { if (last) done(); else { i++; show(); } } }]);
    };
    show();
  }
  choice(text, options) { this.render(text, options); }

  root() {
    const g = this.g, n = this.npc, d = n.d;
    if (!n.alive) { this.close(); return; }
    if (g.state.rep <= -45 && !d.brave && !n.hollow) {
      this.render('*' + n.name + ' пятится от вас.\nНе подходите! Убийцы! На помощь!', [{ t: 'Уйти', fn: () => { n.scare(this.player, 8); this.close(); } }]);
      return;
    }
    let greet;
    if (this.first) {
      this.first = false;
      if (n.hollow && Math.random() < 0.5) greet = pick(HOLLOW_GREET);
      else greet = n.metOnce && d.greet[1] ? d.greet[1] : d.greet[0];
      n.metOnce = true;
    } else greet = pick(['Что-нибудь ещё?', 'Слушаю.', 'Ещё вопросы, агент?']);
    if (n.returned && Math.random() < 0.6) greet = '*' + n.name + ' смотрит на вас и улыбается — слишком широко.\nЯ заблудился в холмах. Три дня. Но теперь я дома. Дома.';
    const ch = [];
    for (const tid of TOPIC_ORDER) {
      const T = TOPICS[tid];
      if (T.need && !T.need(g)) continue;
      const always = ['town', 'missing', 'mine', 'strange', 'personal'].includes(tid);
      if (!always && d.topics[tid] === undefined) continue;
      ch.push({ t: T.t + (n.asked[tid] ? '' : '  •'), fn: () => this.topic(tid) });
    }
    if (d.actions) for (const a of d.actions(g, n)) ch.push(a);
    if (g.flag('crossGiven') && !n.silverTested) ch.push({ t: '✝ Прижать серебряное распятие', fn: () => this.silverTest() });
    ch.push({ t: 'Уйти', fn: () => this.close() });
    this.render(greet, ch);
  }

  topic(tid) {
    const g = this.g, n = this.npc, d = n.d;
    let r = d.topics[tid];
    if (tid === 'personal' && n.hollow) r = pick(HOLLOW_PERSONAL);
    if (tid === 'strange') r = g.strangeAnswer(n);
    if (r === undefined) r = pick(DEFLECT);
    if (typeof r === 'function') r = r(g, n);
    n.asked[tid] = true;
    if (typeof r === 'string' || Array.isArray(r)) { this.say(r); return; }
    this.say(r.say, () => {
      if (r.clue) g.addClue(r.clue);
      if (r.flag) g.setFlag(r.flag, true);
      if (r.fn) r.fn(g, n);
      if (r.note) g.notify(r.note);
      if (this.npc) this.root(); else this.close();
    });
  }

  silverTest() {
    const g = this.g, n = this.npc;
    n.silverTested = true;
    if (n.hollow) {
      this.say(['*Вы прижимаете распятие к запястью. Кожа шипит и чернеет, как бумага над свечой.', '*{name} кричит — не своим голосом. Лицо сползает, словно мокрая маска.'], () => { this.close(); g.revealHollow(n, this.player); });
    } else {
      g.addRep(-3);
      this.say(['*Вы прижимаете распятие к руке. Ничего не происходит. Тёплая живая кожа.', pick(['Вы что, с ума сошли?!', 'Убери от меня эту штуку, агент!', 'Я крещёный, агент. Можете не проверять.', 'Это ещё что за шутки?'])]);
    }
  }
  accuseDoctor() { this.say(ACCUSE_SCENE, () => { this.close(); this.g.exposeDoctor(); }); }
  burnHeart() { this.say(BURN_SCENE, () => { this.close(); this.g.win(); }); }
}
