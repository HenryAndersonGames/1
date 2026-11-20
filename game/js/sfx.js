'use strict';
// ---------- Простые синтезированные звуки (без файлов) ----------
const Sfx = (() => {
  let ac = null, master = null, noiseBuf = null;
  const last = {};
  function unlock() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0.3; master.connect(ac.destination);
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  const ok = () => ac && ac.state === 'running';
  function tone(f, dur, type = 'square', vol = 0.2, slide = 0, delay = 0) {
    if (!ok()) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, vol = 0.2, freq = 1200, q = 1) {
    if (!ok()) return;
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function rate(n, ms) {
    const now = performance.now();
    if (last[n] && now - last[n] < ms) return false;
    last[n] = now; return true;
  }
  function play(n) {
    if (!ok()) return;
    switch (n) {
      case 'swing': if (rate(n, 50)) hiss(0.09, 0.12, 2600, 0.7); break;
      case 'hit': if (rate(n, 35)) { tone(150, 0.09, 'square', 0.16, -90); hiss(0.07, 0.2, 700); } break;
      case 'wood': if (rate(n, 50)) { hiss(0.14, 0.25, 450); tone(95, 0.1, 'triangle', 0.25, -40); } break;
      case 'break': hiss(0.3, 0.3, 380); tone(70, 0.25, 'triangle', 0.3, -30); break;
      case 'hurt': if (rate(n, 80)) tone(230, 0.2, 'sawtooth', 0.18, -150); break;
      case 'pickup': if (rate(n, 40)) { tone(660, 0.06, 'square', 0.08); tone(990, 0.07, 'square', 0.08, 0, 0.05); } break;
      case 'night': tone(98, 1.8, 'sawtooth', 0.12, -30); tone(147, 1.8, 'sawtooth', 0.08, -45); break;
      case 'dusk': tone(330, 0.5, 'triangle', 0.12); tone(262, 0.7, 'triangle', 0.12, 0, 0.35); break;
      case 'dawn': [523, 659, 784].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, 0, i * 0.15)); break;
      case 'level': [440, 554, 659, 880].forEach((f, i) => tone(f, 0.15, 'square', 0.08, 0, i * 0.07)); break;
      case 'down': tone(320, 0.7, 'sawtooth', 0.2, -260); break;
      case 'throw': hiss(0.13, 0.12, 1700); break;
      case 'build': tone(210, 0.05, 'square', 0.15); tone(210, 0.05, 'square', 0.15, 0, 0.09); break;
      case 'roll': if (rate(n, 60)) hiss(0.16, 0.09, 600); break;
      case 'slam': tone(55, 0.45, 'square', 0.3, -25); hiss(0.35, 0.3, 260); break;
      case 'door': tone(180, 0.12, 'triangle', 0.15, 60); break;
      case 'glass': hiss(0.2, 0.2, 4200, 2); tone(1800, 0.08, 'triangle', 0.05); break;
      case 'deny': tone(140, 0.12, 'square', 0.1); break;
      case 'revive': [392, 523, 659].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, 0, i * 0.1)); break;
      case 'cling': if (rate(n, 100)) tone(500, 0.15, 'sawtooth', 0.12, 300); break;
      case 'menu': tone(520, 0.05, 'square', 0.07); break;
    }
  }
  return { unlock, play };
})();
