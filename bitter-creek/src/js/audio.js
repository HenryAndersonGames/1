// Процедурный звук: никаких файлов. Выстрелы, удары, крики, ветер, ночной гул и гитара.
export class Sfx {
  constructor() {
    this.ok = false;
    this.volume = 0.8;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.amb = this.ctx.createGain(); this.amb.gain.value = 0.6; this.amb.connect(this.master);
      this.mus = this.ctx.createGain(); this.mus.gain.value = 0.35; this.mus.connect(this.master);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.ok = true;
      this.startAmbience();
      this.buildGuitar();
    } catch (e) { this.ok = false; }
    this.night = 0;
    this.musT = 0;
  }
  resume() { if (this.ok && this.ctx.state !== 'running') this.ctx.resume(); }
  setVolume(v) { this.volume = v; if (this.ok) this.master.gain.value = v; }

  _noise(dur, filterType, freq, q, gain, dest = this.sfx, t0 = 0) {
    const c = this.ctx, t = c.currentTime + t0;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return f;
  }
  _tone(type, f0, f1, dur, gain, dest = this.sfx, t0 = 0) {
    const c = this.ctx, t = c.currentTime + t0;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  vol(d) { return Math.max(0, 1 - d / 70); }

  shot(d = 0, silver = false) {
    if (!this.ok) return; const v = this.vol(d); if (v <= 0) return;
    this._noise(0.35, 'lowpass', 2400, 0.7, 0.9 * v);
    this._noise(0.08, 'highpass', 3000, 0.5, 0.5 * v);
    this._tone('sine', 140, 40, 0.25, 0.8 * v);
    if (silver) this._tone('triangle', 2600, 1800, 0.5, 0.08 * v);
    this._noise(1.2, 'bandpass', 600, 0.6, 0.12 * v, this.sfx, 0.12);
  }
  click() { if (!this.ok) return; this._tone('square', 1800, 900, 0.03, 0.08); }
  reload() { if (!this.ok) return; for (let i = 0; i < 3; i++) this._tone('square', 1200 + i * 200, 700, 0.03, 0.05, this.sfx, i * 0.12); }
  punch(d = 0) { if (!this.ok) return; const v = this.vol(d); this._noise(0.12, 'lowpass', 500, 1, 0.9 * v); this._tone('sine', 120, 50, 0.12, 0.6 * v); }
  hurt() { if (!this.ok) return; this._tone('sawtooth', 300, 180, 0.2, 0.15); }
  ui() { if (!this.ok) return; this._tone('triangle', 880, 660, 0.06, 0.06); }
  clue() { if (!this.ok) return; [523, 659, 784].forEach((f, i) => this._tone('triangle', f, f, 0.5, 0.08, this.sfx, i * 0.09)); }
  scream(d = 0) {
    if (!this.ok) return; const v = Math.max(0.15, this.vol(d * 0.4));
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(700, t); o.frequency.linearRampToValueAtTime(1100, t + 0.25); o.frequency.exponentialRampToValueAtTime(380, t + 1.4);
    const lfo = c.createOscillator(); lfo.frequency.value = 7; const lg = c.createGain(); lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 3;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 * v, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); lfo.start(t); o.stop(t + 1.6); lfo.stop(t + 1.6);
  }
  growl(d = 0) {
    if (!this.ok) return; const v = this.vol(d); if (v <= 0) return;
    this._tone('sawtooth', 90, 55, 0.9, 0.18 * v);
    this._noise(0.9, 'lowpass', 300, 4, 0.35 * v);
  }
  shriek(d = 0) {
    if (!this.ok) return; const v = this.vol(d); if (v <= 0) return;
    this._tone('sawtooth', 1400, 300, 0.8, 0.12 * v); this._tone('square', 1900, 500, 0.6, 0.06 * v);
    this._noise(0.6, 'highpass', 2000, 1, 0.3 * v);
  }
  bell() {
    if (!this.ok) return;
    [220, 440, 553, 660, 880].forEach((f, i) => this._tone('sine', f, f * 0.995, 4.5 - i * 0.6, [0.2, 0.12, 0.06, 0.05, 0.03][i], this.sfx));
  }
  hoof(d = 0, gallop = false) {
    if (!this.ok) return; const v = this.vol(d * 1.5); if (v <= 0) return;
    this._noise(0.05, 'bandpass', 900 + Math.random() * 400, 2, 0.35 * v);
    this._tone('sine', 180 + Math.random() * 40, 90, 0.06, (gallop ? 0.3 : 0.2) * v);
  }
  neigh(d = 0) {
    if (!this.ok) return; const v = this.vol(d); if (v <= 0) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(900, t + 0.15); o.frequency.exponentialRampToValueAtTime(260, t + 1.1);
    const l = c.createOscillator(); l.frequency.value = 22; const lg = c.createGain(); lg.gain.value = 60; l.connect(lg); lg.connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * v, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); l.start(t); o.stop(t + 1.3); l.stop(t + 1.3);
  }
  whistle() {
    if (!this.ok) return;
    this._tone('sine', 1500, 2300, 0.18, 0.12); this._tone('sine', 2300, 1700, 0.35, 0.12, this.sfx, 0.2);
  }
  heartbeat(v = 1) { if (!this.ok) return; this._tone('sine', 60, 35, 0.18, 0.5 * v); this._tone('sine', 55, 30, 0.2, 0.4 * v, this.sfx, 0.22); }

  startAmbience() {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.8;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency);
    this.windGain = c.createGain(); this.windGain.gain.value = 0.05;
    s.connect(f); f.connect(this.windGain); this.windGain.connect(this.amb); s.start(); lfo.start();
    // ночной гул
    this.droneGain = c.createGain(); this.droneGain.gain.value = 0;
    for (const fr of [43.65, 44.1, 65.4]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = fr; o.connect(this.droneGain); o.start();
    }
    this.droneGain.connect(this.amb);
  }
  setNight(n, danger = 0) {
    if (!this.ok) return;
    this.night = n;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.04 + n * 0.05, t, 1.5);
    this.droneGain.gain.setTargetAtTime(n * 0.07 + danger * 0.08, t, 2);
  }

  // Гитара: синтез Карплуса-Стронга, минорная пентатоника
  buildGuitar() {
    const c = this.ctx, sr = c.sampleRate;
    const notes = [82.41, 110, 123.47, 146.83, 164.81, 196, 220, 246.94, 293.66, 329.63];
    this.strings = notes.map((f) => {
      const len = Math.floor(sr * 2.2), buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
      const N = Math.round(sr / f); const ring = new Float32Array(N);
      for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
      let idx = 0;
      for (let i = 0; i < len; i++) {
        const nx = (idx + 1) % N;
        const v = (ring[idx] + ring[nx]) * 0.4985;
        d[i] = ring[idx]; ring[idx] = v; idx = nx;
      }
      return buf;
    });
    this.pattern = [[0, 4, 7], [1, 5, 8], [2, 6, 9], [0, 3, 7], [1, 4, 6]];
  }
  pluck(i, t, g = 0.25) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.strings[i];
    const gg = c.createGain(); gg.gain.value = g;
    s.connect(gg); gg.connect(this.mus); s.start(t);
  }
  update(dt, playing) {
    if (!this.ok || !playing) return;
    this.musT -= dt;
    if (this.musT <= 0) {
      const t = this.ctx.currentTime + 0.05;
      if (this.night < 0.5) {
        const ch = this.pattern[Math.floor(Math.random() * this.pattern.length)];
        ch.forEach((n, k) => this.pluck(n, t + k * 0.32, 0.16));
        if (Math.random() < 0.5) this.pluck(ch[1] + 1 > 9 ? 9 : ch[1] + 1, t + 1.1, 0.12);
        this.musT = 3.5 + Math.random() * 4;
      } else {
        // ночью — редкие низкие ноты
        this.pluck(Math.floor(Math.random() * 3), t, 0.2);
        this.musT = 6 + Math.random() * 6;
      }
    }
  }
}
