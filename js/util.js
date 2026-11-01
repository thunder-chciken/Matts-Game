'use strict';
// ---------- General helpers ----------
const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  cheb: (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by)),
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  round1: (v) => Math.round(v * 10) / 10,
  weighted(list) { // [[value, weight], ...]
    let tot = 0;
    for (const e of list) tot += e[1];
    let r = Math.random() * tot;
    for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
    return list[list.length - 1][0];
  },
  _uid: Date.now() % 100000,
  uid() { return (++this._uid).toString(36) + Math.floor(Math.random() * 1e6).toString(36); },
  fmt(n) { return Math.floor(n).toLocaleString(); },
  hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  },
  shade(hex, amt) { // amt -1..1, negative darkens
    const [r, g, b] = U.hexToRgb(hex);
    if (amt < 0) return U.rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
    return U.rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  },
  mix(h1, h2, t) {
    const a = U.hexToRgb(h1), b = U.hexToRgb(h2);
    return U.rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  },
  rgba(hex, a) { const [r, g, b] = U.hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; },
  dayKey(d = new Date()) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  daysBetween(k1, k2) {
    const a = new Date(k1 + 'T00:00:00'), b = new Date(k2 + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  },
  esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
  timeStr(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m ${sec % 60}s`;
  },
};

// ---------- Seeded randomness & noise ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct = 4) {
  let t = 0, amp = 1, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { t += vnoise(x * f, y * f, s + i * 17) * amp; n += amp; amp *= 0.5; f *= 2; }
  return t / n;
}

// ---------- Synth sound effects (no audio files needed) ----------
const Sound = {
  ctx: null, on: true, vol: 0.22,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, type = 'sine', vol = 1, slide = 0, delay = 0) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(this.vol * vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  noise(dur, vol = 1, freq = 1200, delay = 0) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.value = this.vol * vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0);
  },
  play(name, extra) {
    if (!this.on || !this.ctx) return;
    switch (name) {
      case 'swing': this.noise(0.12, 0.5, 900); break;
      case 'hit': this.noise(0.08, 1, 400); this.tone(140, 0.1, 'square', 0.3, -60); break;
      case 'miss': this.noise(0.1, 0.35, 2200); break;
      case 'hurt': this.tone(220, 0.15, 'sawtooth', 0.35, -120); break;
      case 'mine': this.tone(1400 + Math.random() * 300, 0.08, 'triangle', 0.5); this.noise(0.05, 0.6, 3000); break;
      case 'chop': this.noise(0.09, 0.9, 500); this.tone(180, 0.06, 'triangle', 0.4); break;
      case 'splash': this.noise(0.3, 0.6, 700); break;
      case 'pickup': this.tone(660, 0.07, 'triangle', 0.5); this.tone(990, 0.09, 'triangle', 0.4, 0, 0.06); break;
      case 'coin': this.tone(1320, 0.06, 'square', 0.25); this.tone(1760, 0.1, 'square', 0.2, 0, 0.05); break;
      case 'craft': this.tone(880, 0.05, 'square', 0.25); this.noise(0.06, 0.6, 2500); break;
      case 'skill': this.tone(784, 0.1, 'sine', 0.5); this.tone(1046, 0.16, 'sine', 0.45, 0, 0.08); break;
      case 'spell': this.tone(300, 0.35, 'sine', 0.4, 600); break;
      case 'heal': this.tone(523, 0.2, 'sine', 0.4); this.tone(784, 0.25, 'sine', 0.35, 0, 0.1); break;
      case 'death': this.tone(200, 0.6, 'sawtooth', 0.4, -150); break;
      case 'click': this.tone(500, 0.03, 'square', 0.15); break;
      case 'open': this.tone(330, 0.08, 'triangle', 0.4); this.tone(440, 0.1, 'triangle', 0.35, 0, 0.07); break;
      case 'tame': this.tone(440, 0.15, 'sine', 0.3); this.tone(554, 0.15, 'sine', 0.3, 0, 0.15); this.tone(659, 0.25, 'sine', 0.3, 0, 0.3); break;
      case 'rare': { // fanfare scaled by rarity tier
        const r = extra || 2;
        const notes = [523, 659, 784, 1046, 1318, 1568];
        for (let i = 0; i < r + 1; i++) this.tone(notes[i], 0.22, 'triangle', 0.45, 0, i * 0.09);
        if (r >= 4) this.tone(2093, 0.6, 'sine', 0.3, 0, (r + 1) * 0.09);
        break;
      }
    }
  },
};
