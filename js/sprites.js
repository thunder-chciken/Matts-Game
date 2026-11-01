'use strict';
// =====================================================================
//  Procedural sprites: tiles, trees, props, characters, creatures, icons
// =====================================================================
const TW = 64, TH = 32;
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

const Sprites = {
  tiles: [], cache: new Map(), iconCache: new Map(),

  init() {
    for (let g = 0; g < GROUND.length; g++) {
      const frames = GROUND[g].water ? 8 : 1;
      this.tiles[g] = [];
      for (let v = 0; v < 4; v++) {
        const arr = [];
        for (let f = 0; f < frames; f++) arr.push(this.makeTile(g, v, f, frames));
        this.tiles[g].push(arr);
      }
    }
  },

  // ---------- Ground tiles (66x34 with 1px bleed to hide seams) ----------
  makeTile(g, v, f, frames) {
    const c = mkCanvas(TW + 2, TH + 2), x = c.getContext('2d');
    const rnd = mulberry32(g * 1000 + v * 37 + 11);
    x.translate(1, 1);
    x.beginPath(); x.moveTo(32, -1); x.lineTo(65, 16); x.lineTo(32, 33); x.lineTo(-1, 16); x.closePath();
    x.save(); x.clip();
    const base = U.shade(GROUND[g].color, (rnd() - 0.5) * 0.08);
    x.fillStyle = base; x.fillRect(-2, -2, 70, 38);
    const speck = (n, amt, size) => {
      for (let k = 0; k < n; k++) {
        x.fillStyle = U.shade(base, (rnd() - 0.5) * amt);
        x.fillRect(rnd() * 64, rnd() * 32, size, size * 0.6 + 0.4);
      }
    };
    switch (g) {
      case G.GRASS: case G.FOREST: {
        speck(70, 0.3, 2);
        for (let k = 0; k < 26; k++) {
          const px = rnd() * 64, py = rnd() * 32;
          x.strokeStyle = U.shade(base, rnd() < 0.5 ? 0.18 : -0.22); x.lineWidth = 1;
          x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 3, py - 2 - rnd() * 3); x.stroke();
        }
        break;
      }
      case G.SWAMP: speck(60, 0.35, 3);
        x.fillStyle = 'rgba(40,60,50,0.35)';
        for (let k = 0; k < 3; k++) { x.beginPath(); x.ellipse(rnd() * 64, rnd() * 32, 6 + rnd() * 6, 3 + rnd() * 2, 0, 0, 7); x.fill(); }
        break;
      case G.SAND: speck(90, 0.18, 1.5); break;
      case G.DIRT: speck(70, 0.3, 2);
        for (let k = 0; k < 6; k++) { x.fillStyle = U.shade(base, -0.3); x.fillRect(rnd() * 64, rnd() * 32, 2, 1); }
        break;
      case G.ROCK: case G.ASH: case G.GRAVE: speck(80, 0.35, 2.5); break;
      case G.COBBLE: {
        for (let row = -1; row < 6; row++) for (let col = -1; col < 9; col++) {
          const px = col * 8 + (row % 2) * 4 + rnd() * 1.5, py = row * 6 + rnd();
          x.fillStyle = U.shade(base, (rnd() - 0.5) * 0.3);
          x.beginPath(); x.ellipse(px, py, 3.6, 2.4, 0, 0, 7); x.fill();
          x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 0.6; x.stroke();
        }
        break;
      }
      case G.PLANK: {
        for (let k = -4; k < 12; k++) {
          x.strokeStyle = 'rgba(40,25,10,0.55)'; x.lineWidth = 1;
          x.beginPath(); x.moveTo(k * 8, 0); x.lineTo(k * 8 + 32, 16 + 16); x.stroke();
        }
        speck(30, 0.25, 1.5);
        break;
      }
      case G.WATER: case G.DEEP: {
        const t = (f / frames) * Math.PI * 2;
        speck(20, 0.12, 3);
        for (let k = 0; k < 7; k++) {
          const py = (k * 5 + 2 + Math.sin(t + k) * 1.5) % 34, px = (rnd() * 64 + Math.cos(t + k * 2) * 4);
          x.strokeStyle = `rgba(255,255,255,${0.1 + 0.08 * Math.sin(t + k * 1.7)})`; x.lineWidth = 1;
          x.beginPath(); x.moveTo(px - 5, py); x.quadraticCurveTo(px, py - 1.5, px + 5, py); x.stroke();
        }
        break;
      }
    }
    x.restore();
    return c;
  },

  // ---------- Painted world sprites (assets/props) ----------
  propImgs: {},
  propImg(id) {
    if (typeof ART_MANIFEST === 'undefined' || !ART_MANIFEST.props || !ART_MANIFEST.props.includes(id)) return null;
    let im = this.propImgs[id];
    if (!im) { im = new Image(); im.src = 'assets/props/' + id + '.png'; this.propImgs[id] = im; }
    return im.complete && im.naturalWidth ? im : null;
  },
  // Pick a painted tree for a tile: [image, world height]
  paintedTree(kind, x, y) {
    const props = (typeof ART_MANIFEST !== 'undefined' && ART_MANIFEST.props) || [];
    if (!props.length) return null;
    const h = hash2(x, y, 77), h2 = hash2(x, y, 78);
    const of = (p) => props.filter((id) => id.startsWith(p));
    let list, height;
    if (kind === 'pine') { list = of('pine'); height = 135; }
    else if (kind === 'dead') {
      const swamp = World.groundAt(x, y) === G.SWAMP;
      list = swamp && h2 < 0.5 ? of('willow') : of('dead');
      height = list[0] && list[0].startsWith('willow') ? 115 : 105;
    } else {
      const r = h2;
      list = r < 0.62 ? of('oak') : r < 0.86 ? of('birch') : of('autumn');
      height = r < 0.62 ? 120 : r < 0.86 ? 125 : 115;
    }
    if (!list.length) return null;
    const im = this.propImg(list[Math.floor(h * list.length)]);
    return im ? [im, height * (0.82 + hash2(x, y, 79) * 0.32)] : null;
  },

  // ---------- Trees ----------
  tree(kind, v) {
    const key = 'tree:' + kind + v;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = mkCanvas(100, 130), x = c.getContext('2d');
    const rnd = mulberry32(v * 97 + kind.length * 13);
    const ax = 50, ay = 120;
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(ax, ay, 22, 9, 0, 0, 7); x.fill();
    if (kind === 'oak') {
      const h = 34 + rnd() * 12;
      x.fillStyle = '#5a3a20'; x.fillRect(ax - 4, ay - h, 8, h);
      x.fillStyle = '#3e2814'; x.fillRect(ax + 1, ay - h, 3, h);
      const palettes = [['#2f6a2a', '#3f8a32', '#5aa840'], ['#285a26', '#357a2e', '#4a983a'], ['#3a6a20', '#4f8a2a', '#6aa83a'], ['#a8582a', '#c87a32', '#e0a040']];
      const pal = v === 7 ? palettes[3] : palettes[v % 3];
      const cy = ay - h - 14, rr = 18 + rnd() * 6;
      for (let layer = 0; layer < 3; layer++) {
        for (let k = 0; k < 7; k++) {
          const a = rnd() * Math.PI * 2, d = rnd() * rr * (0.8 - layer * 0.2);
          const px = ax + Math.cos(a) * d * 1.2, py = cy + Math.sin(a) * d * 0.8 - layer * 4;
          x.fillStyle = pal[layer];
          x.beginPath(); x.arc(px, py, rr * (0.55 - layer * 0.1) + rnd() * 4, 0, 7); x.fill();
        }
      }
      x.fillStyle = 'rgba(255,255,220,0.12)'; x.beginPath(); x.arc(ax - 8, cy - 10, rr * 0.5, 0, 7); x.fill();
    } else if (kind === 'pine') {
      const h = 18 + rnd() * 8, tiers = 4, top = 70 + rnd() * 25;
      x.fillStyle = '#4a3018'; x.fillRect(ax - 3, ay - h, 6, h);
      const col = v % 2 ? '#1f4a2a' : '#245a30';
      for (let i = 0; i < tiers; i++) {
        const w = 24 - i * 5, yb = ay - h + 6 - i * (top / tiers) * 0.85, yt = yb - top / tiers - 10;
        x.fillStyle = U.shade(col, i * 0.05);
        x.beginPath(); x.moveTo(ax - w, yb); x.lineTo(ax, yt); x.lineTo(ax + w, yb); x.closePath(); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.18)';
        x.beginPath(); x.moveTo(ax, yt); x.lineTo(ax + w, yb); x.lineTo(ax + 2, yb); x.closePath(); x.fill();
      }
    } else { // dead
      const h = 40 + rnd() * 20;
      x.strokeStyle = '#4a4036'; x.lineCap = 'round';
      x.lineWidth = 6; x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + 2, ay - h); x.stroke();
      const branch = (sx, sy, a, len, w) => {
        if (len < 5) return;
        const ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
        x.lineWidth = w; x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
        branch(ex, ey, a - 0.5 + rnd() * 0.3, len * 0.65, w * 0.7);
        branch(ex, ey, a + 0.4 + rnd() * 0.3, len * 0.6, w * 0.7);
      };
      branch(ax + 2, ay - h, -Math.PI / 2 - 0.4, 16, 4);
      branch(ax + 1, ay - h * 0.6, -0.5, 12, 3);
      branch(ax + 1, ay - h * 0.7, -Math.PI + 0.4, 12, 3);
    }
    const out = { c, ax, ay };
    this.cache.set(key, out);
    return out;
  },

  // ---------- Small props (cached) ----------
  prop(key, draw, w = 64, h = 70) {
    if (this.cache.has(key)) return this.cache.get(key);
    const c = mkCanvas(w, h), x = c.getContext('2d');
    const ax = w / 2, ay = h - 10;
    draw(x, ax, ay);
    const out = { c, ax, ay };
    this.cache.set(key, out);
    return out;
  },
  boulder(v, depleted) {
    return this.prop('boulder' + v + (depleted ? 'd' : ''), (x, ax, ay) => {
      const rnd = mulberry32(v * 31 + 5), s = depleted ? 0.6 : 1;
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(ax, ay, 16 * s, 7 * s, 0, 0, 7); x.fill();
      for (let k = 0; k < 3; k++) {
        const px = ax + (rnd() - 0.5) * 14 * s, py = ay - 6 * s - rnd() * 6 * s, r = (8 + rnd() * 6) * s;
        const gr = x.createRadialGradient(px - r * 0.4, py - r * 0.5, 1, px, py, r);
        gr.addColorStop(0, '#b8b0a4'); gr.addColorStop(1, '#5e574e');
        x.fillStyle = gr; x.beginPath(); x.ellipse(px, py, r, r * 0.8, 0, 0, 7); x.fill();
      }
      if (!depleted) for (let k = 0; k < 4; k++) { x.fillStyle = rnd() < 0.5 ? '#e0c070' : '#9ad8ff'; x.fillRect(ax + (rnd() - 0.5) * 16, ay - 4 - rnd() * 12, 2, 2); }
    });
  },
  bush(herb, v, depleted) {
    return this.prop('bush' + herb + v + (depleted ? 'd' : ''), (x, ax, ay) => {
      const rnd = mulberry32(v * 17 + herb.length * 7), col = BASES[herb].color;
      x.fillStyle = 'rgba(0,0,0,0.22)'; x.beginPath(); x.ellipse(ax, ay, 13, 5, 0, 0, 7); x.fill();
      const leaf = herb === 'ghostbloom' ? '#3a5a4a' : herb === 'emberroot' ? '#5a5a2a' : '#3a7a2e';
      for (let k = 0; k < 9; k++) {
        x.fillStyle = U.shade(leaf, (rnd() - 0.5) * 0.4);
        x.beginPath(); x.ellipse(ax + (rnd() - 0.5) * 18, ay - 5 - rnd() * 9, 5, 4, rnd() * 3, 0, 7); x.fill();
      }
      if (!depleted) for (let k = 0; k < 7; k++) {
        const px = ax + (rnd() - 0.5) * 18, py = ay - 6 - rnd() * 11;
        x.fillStyle = col; x.beginPath(); x.arc(px, py, 2.2, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(px - 0.5, py - 1, 1, 1);
      }
    });
  },
  decor(kind, v) {
    return this.prop('decor' + kind + v, (x, ax, ay) => {
      const rnd = mulberry32(v * 13 + kind.length);
      switch (kind) {
        case 'flowers': {
          const cols = ['#ff6a8a', '#ffe066', '#ffffff', '#9a7aff', '#ff9a4a', '#6ad8ff'];
          for (let k = 0; k < 6; k++) {
            const px = ax + (rnd() - 0.5) * 30, py = ay - (rnd() - 0.5) * 12;
            x.strokeStyle = '#3a7a2e'; x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - 4); x.stroke();
            x.fillStyle = cols[(v + k) % cols.length]; x.beginPath(); x.arc(px, py - 5, 1.8, 0, 7); x.fill();
          }
          break;
        }
        case 'tuft': case 'fern': case 'reeds': {
          const col = kind === 'reeds' ? '#7a8a4a' : kind === 'fern' ? '#2f7a2a' : '#4a8a32';
          for (let k = 0; k < 9; k++) {
            const px = ax + (rnd() - 0.5) * 18, py = ay - (rnd() - 0.5) * 6, hh = (kind === 'reeds' ? 14 : 7) + rnd() * 5;
            x.strokeStyle = U.shade(col, (rnd() - 0.5) * 0.3); x.lineWidth = kind === 'fern' ? 2 : 1;
            x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (rnd() - 0.5) * 6, py - hh / 2, px + (rnd() - 0.5) * 8, py - hh); x.stroke();
          }
          break;
        }
        case 'mushroom':
          for (let k = 0; k < 3; k++) {
            const px = ax + (rnd() - 0.5) * 16, py = ay - (rnd() - 0.5) * 6;
            x.fillStyle = '#e8dcc8'; x.fillRect(px - 1, py - 4, 2, 4);
            x.fillStyle = v % 2 ? '#c83a2a' : '#c8a070'; x.beginPath(); x.ellipse(px, py - 4, 3.5, 2.2, 0, Math.PI, 0); x.fill();
          }
          break;
        case 'shell': x.fillStyle = '#f0d8c8'; x.beginPath(); x.ellipse(ax, ay, 3, 2, 0.4, 0, 7); x.fill(); break;
        case 'bones':
          x.strokeStyle = '#e8e2cc'; x.lineWidth = 2; x.lineCap = 'round';
          for (let k = 0; k < 3; k++) { const px = ax + (rnd() - 0.5) * 18, py = ay - (rnd() - 0.5) * 8; x.beginPath(); x.moveTo(px - 4, py - 1); x.lineTo(px + 4, py + 1); x.stroke(); }
          x.fillStyle = '#e8e2cc'; x.beginPath(); x.arc(ax + 3, ay - 3, 3, 0, 7); x.fill();
          break;
        case 'crate':
          this.isoBox(x, ax, ay, 9, 9, 14, '#a07848', '#8a6238', '#c09058');
          x.strokeStyle = 'rgba(40,25,10,0.6)'; x.beginPath(); x.moveTo(ax - 9, ay - 4.5 - 7); x.lineTo(ax, ay - 7); x.lineTo(ax + 9, ay - 4.5 - 7); x.stroke();
          break;
        case 'barrel':
          x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(ax, ay, 9, 4, 0, 0, 7); x.fill();
          x.fillStyle = '#8a5a30'; x.fillRect(ax - 7, ay - 18, 14, 18);
          x.fillStyle = '#6a4220'; x.fillRect(ax + 2, ay - 18, 5, 18);
          x.fillStyle = '#4a4a4a'; x.fillRect(ax - 7, ay - 15, 14, 2); x.fillRect(ax - 7, ay - 5, 14, 2);
          x.fillStyle = '#a07040'; x.beginPath(); x.ellipse(ax, ay - 18, 7, 3, 0, 0, 7); x.fill();
          break;
        case 'hay': this.isoBox(x, ax, ay, 12, 8, 10, '#d8b84a', '#b89a3a', '#e8cc6a'); break;
        case 'post': x.fillStyle = '#5a3a20'; x.fillRect(ax - 2, ay - 22, 4, 22); break;
        case 'brazier':
          x.fillStyle = '#3a3a40'; x.fillRect(ax - 1.5, ay - 16, 3, 16);
          x.fillStyle = '#4a4a50'; x.beginPath(); x.ellipse(ax, ay - 17, 7, 3, 0, 0, 7); x.fill();
          break;
      }
    }, 64, 50);
  },
  // Small iso box helper: half-width hw, half-depth hd, height h
  isoBox(x, ax, ay, hw, hd, h, left, right, top) {
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(ax, ay, hw + 3, hd * 0.6 + 2, 0, 0, 7); x.fill();
    const w = hw, d = hd * 0.5;
    x.fillStyle = left; x.beginPath(); x.moveTo(ax - w, ay - d); x.lineTo(ax, ay); x.lineTo(ax, ay - h); x.lineTo(ax - w, ay - d - h); x.closePath(); x.fill();
    x.fillStyle = right; x.beginPath(); x.moveTo(ax + w, ay - d); x.lineTo(ax, ay); x.lineTo(ax, ay - h); x.lineTo(ax + w, ay - d - h); x.closePath(); x.fill();
    x.fillStyle = top; x.beginPath(); x.moveTo(ax - w, ay - d - h); x.lineTo(ax, ay - h); x.lineTo(ax + w, ay - d - h); x.lineTo(ax, ay - 2 * d - h); x.closePath(); x.fill();
  },

  // Dynamic props (animated) drawn each frame
  drawStation(ctx, t, sx, sy, time, o) {
    switch (t) {
      case 'forge': {
        this.isoBox(ctx, sx, sy, 16, 16, 18, '#6a625a', '#55504a', '#7a726a');
        const fl = 0.7 + Math.sin(time * 9) * 0.15 + Math.sin(time * 23) * 0.1;
        const gr = ctx.createRadialGradient(sx, sy - 22, 1, sx, sy - 22, 10);
        gr.addColorStop(0, `rgba(255,230,120,${fl})`); gr.addColorStop(0.5, `rgba(255,120,30,${fl * 0.8})`); gr.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sx, sy - 22, 11, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#4a4440'; ctx.fillRect(sx + 6, sy - 46, 7, 26);
        for (let k = 0; k < 3; k++) {
          const p = ((time * 0.6 + k / 3) % 1);
          ctx.fillStyle = `rgba(120,120,120,${0.35 * (1 - p)})`;
          ctx.beginPath(); ctx.arc(sx + 9 + Math.sin(time + k) * 3, sy - 48 - p * 24, 3 + p * 5, 0, 7); ctx.fill();
        }
        break;
      }
      case 'anvil':
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 12, 5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(sx - 5, sy - 10, 10, 10);
        ctx.fillStyle = '#3a3c42'; ctx.beginPath();
        ctx.moveTo(sx - 12, sy - 16); ctx.lineTo(sx + 9, sy - 16); ctx.lineTo(sx + 14, sy - 19); ctx.lineTo(sx + 9, sy - 21); ctx.lineTo(sx - 10, sy - 21); ctx.closePath(); ctx.fill();
        ctx.fillRect(sx - 4, sy - 16, 8, 6);
        ctx.fillStyle = '#6a6c72'; ctx.fillRect(sx - 10, sy - 21, 19, 1.5);
        break;
      case 'oven': {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 16, 7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#9a5a3a'; ctx.beginPath(); ctx.ellipse(sx, sy - 6, 14, 6, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy - 8, 14, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#7a4228'; ctx.beginPath(); ctx.arc(sx + 3, sy - 10, 11, Math.PI * 1.2, Math.PI * 0.1); ctx.fill();
        const fl = 0.6 + Math.sin(time * 8) * 0.2;
        ctx.fillStyle = `rgba(255,${140 + fl * 60},40,${fl})`; ctx.beginPath(); ctx.arc(sx - 1, sy - 5, 5, Math.PI, 0); ctx.fill();
        break;
      }
      case 'well':
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 16, 7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#7a7670'; ctx.beginPath(); ctx.ellipse(sx, sy - 6, 13, 6, 0, 0, 7); ctx.fill();
        ctx.fillRect(sx - 13, sy - 12, 26, 6);
        ctx.fillStyle = '#8a8680'; ctx.beginPath(); ctx.ellipse(sx, sy - 12, 13, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#1a3a5a'; ctx.beginPath(); ctx.ellipse(sx, sy - 12, 9, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#5a3a20'; ctx.fillRect(sx - 12, sy - 34, 3, 22); ctx.fillRect(sx + 9, sy - 34, 3, 22);
        ctx.fillStyle = '#8a3a2a'; ctx.beginPath(); ctx.moveTo(sx - 16, sy - 32); ctx.lineTo(sx, sy - 42); ctx.lineTo(sx + 16, sy - 32); ctx.closePath(); ctx.fill();
        break;
      case 'lamp': {
        ctx.fillStyle = '#2a2a2e'; ctx.fillRect(sx - 1.5, sy - 34, 3, 34);
        ctx.fillRect(sx - 4, sy - 2, 8, 2);
        const on = o && o.night > 0.15;
        ctx.fillStyle = on ? '#ffe8a0' : '#9a9070'; ctx.fillRect(sx - 3.5, sy - 42, 7, 8);
        ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.moveTo(sx - 5, sy - 42); ctx.lineTo(sx, sy - 46); ctx.lineTo(sx + 5, sy - 42); ctx.fill();
        break;
      }
      case 'board':
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 14, 5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#5a3a20'; ctx.fillRect(sx - 12, sy - 30, 3, 30); ctx.fillRect(sx + 9, sy - 30, 3, 30);
        ctx.fillStyle = '#8a6238'; ctx.fillRect(sx - 14, sy - 34, 28, 18);
        ctx.fillStyle = '#efe6cc'; ctx.fillRect(sx - 11, sy - 31, 7, 9); ctx.fillRect(sx - 2, sy - 32, 8, 10); ctx.fillRect(sx + 7, sy - 30, 5, 7);
        ctx.fillStyle = '#ffd94a'; ctx.beginPath(); ctx.arc(sx, sy - 40 + Math.sin(time * 3) * 1.5, 3, 0, 7); ctx.fill();
        break;
      case 'shrine': {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 14, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#6a6a78'; ctx.beginPath(); ctx.ellipse(sx, sy - 3, 12, 5, 0, 0, 7); ctx.fill();
        const bob = Math.sin(time * 2) * 2;
        const gr = ctx.createLinearGradient(sx - 6, 0, sx + 6, 0);
        gr.addColorStop(0, '#bfeaff'); gr.addColorStop(1, '#4a8ad8');
        ctx.fillStyle = gr; ctx.beginPath();
        ctx.moveTo(sx, sy - 44 + bob); ctx.lineTo(sx + 6, sy - 22 + bob); ctx.lineTo(sx, sy - 10 + bob); ctx.lineTo(sx - 6, sy - 22 + bob); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(sx, sy - 44 + bob); ctx.lineTo(sx - 6, sy - 22 + bob); ctx.lineTo(sx - 2, sy - 22 + bob); ctx.closePath(); ctx.fill();
        break;
      }
      case 'tomb':
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 10, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = (o && o.v % 2) ? '#7a7a80' : '#6a6a70';
        ctx.beginPath(); ctx.moveTo(sx - 7, sy - 2); ctx.lineTo(sx - 7, sy - 16); ctx.arc(sx, sy - 16, 7, Math.PI, 0); ctx.lineTo(sx + 7, sy - 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(sx - 3, sy - 15, 6, 1.5); ctx.fillRect(sx - 0.75, sy - 18, 1.5, 7);
        break;
      case 'fence': {
        ctx.fillStyle = '#7a5a30';
        const alongX = o && o.h === 'x';
        const dx = alongX ? 16 : -16, dy = 8;
        ctx.fillRect(sx - dx - 1.5, sy - dy - 16, 3, 16);
        ctx.fillRect(sx + dx - 1.5, sy + dy - 16, 3, 16);
        ctx.strokeStyle = '#9a7240'; ctx.lineWidth = 2.5;
        for (const hy of [-13, -7]) { ctx.beginPath(); ctx.moveTo(sx - dx, sy - dy + hy); ctx.lineTo(sx + dx, sy + dy + hy); ctx.stroke(); }
        break;
      }
      case 'brazier': {
        const s = this.decor('brazier', 0); ctx.drawImage(s.c, sx - s.ax, sy - s.ay);
        const fl = Math.sin(time * 10) * 2;
        const gr = ctx.createRadialGradient(sx, sy - 22, 1, sx, sy - 22, 9);
        gr.addColorStop(0, 'rgba(220,255,255,0.95)'); gr.addColorStop(1, 'rgba(80,180,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sx, sy - 22 - fl, 6, 9 + fl, 0, 0, 7); ctx.fill();
        break;
      }
    }
  },

  chest(ctx, sx, sy, opened, tier, time) {
    const cols = ['#8a5a30', '#6a6a7a', '#3a5a8a', '#6a3a8a'];
    const wood = cols[Math.min(3, tier)];
    this.isoBox(ctx, sx, sy, 11, 8, 10, U.shade(wood, -0.1), U.shade(wood, -0.3), wood);
    ctx.fillStyle = '#e0b84a'; ctx.fillRect(sx - 1, sy - 9, 2, 6);
    if (!opened) {
      ctx.fillStyle = U.shade(wood, 0.15);
      ctx.beginPath(); ctx.moveTo(sx - 11, sy - 4 - 10); ctx.lineTo(sx, sy - 10); ctx.lineTo(sx + 11, sy - 4 - 10); ctx.lineTo(sx + 11, sy - 4 - 14); ctx.lineTo(sx, sy - 18); ctx.lineTo(sx - 11, sy - 4 - 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e0b84a'; ctx.lineWidth = 1.5; ctx.stroke();
      if (Math.sin(time * 4 + sx) > 0.7) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(sx + 4, sy - 20, 2, 2); }
    }
  },

  // ---------- Humanoids ----------
  // o: look + gear description, see Render.humanoidOpts
  humanoid(ctx, x, y, o) {
    const s = o.scale || 1;
    ctx.save();
    ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 11 * s, 4.5 * s, 0, 0, 7); ctx.fill();
    if (o.float) ctx.translate(0, -6 - Math.sin(o.time * 2) * 2);
    ctx.scale(o.right ? s : -s, s);
    const skel = o.skeleton, bone = '#e6e0c8';
    const skin = skel ? bone : o.skin || '#e8c09a';
    const ph = o.moving ? o.walk : 0;
    const legSwing = Math.sin(ph) * 4.5, legLift = Math.abs(Math.cos(ph)) * 1.5;
    const fem = o.female;
    const robe = o.robe || (o.chest && o.chest.type === 'robe' ? o.chest.color : null);
    const front = o.front;
    // cloak (behind when facing camera)
    if (o.cloak && front) {
      ctx.fillStyle = U.shade(o.cloak, -0.15);
      ctx.beginPath(); ctx.moveTo(-8, -31); ctx.lineTo(8, -31); ctx.lineTo(10 + legSwing * 0.3, -4); ctx.lineTo(-11, -4); ctx.closePath(); ctx.fill();
    }
    const ty = o.mounted ? -2 : 0;
    // far arm
    const armSwing = o.moving ? -Math.sin(ph) * 0.45 : 0;
    this.arm(ctx, -7, -30 + ty, armSwing * -1 + 0.1, o, skin, true);
    // legs
    if (!o.mounted) {
      const legCol = skel ? bone : (o.legs ? o.legs.color : '#4a3a2a');
      const bootCol = o.feet ? o.feet.color : skel ? bone : U.shade(skin, -0.2);
      for (const side of [-1, 1]) {
        const sw = side * legSwing, lift = side > 0 ? legLift : 0;
        const lx = side * 3.2 + sw;
        if (!robe || o.moving) {
          ctx.strokeStyle = U.shade(legCol, side < 0 ? -0.2 : 0); ctx.lineCap = 'round';
          ctx.lineWidth = skel ? 2.5 : 5;
          ctx.beginPath(); ctx.moveTo(side * 3.2, -16); ctx.lineTo(lx, -3 - lift); ctx.stroke();
        }
        ctx.fillStyle = U.shade(bootCol, side < 0 ? -0.2 : 0);
        ctx.beginPath(); ctx.ellipse(lx + 1.2, -1.6 - lift, 3.4, 2.2, 0, 0, 7); ctx.fill();
      }
    }
    // torso
    const chestCol = skel ? null : (o.chest ? o.chest.color : skin);
    const ctype = o.chest ? o.chest.type : 'none';
    if (robe) {
      const g = ctx.createLinearGradient(-9, 0, 9, 0);
      g.addColorStop(0, U.shade(robe, -0.25)); g.addColorStop(1, U.shade(robe, 0.1));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-6.5, -32 + ty); ctx.lineTo(6.5, -32 + ty); ctx.lineTo(9.5 + legSwing * 0.2, -2); ctx.lineTo(-9.5 + legSwing * 0.2, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = U.shade(robe, 0.3); ctx.fillRect(-6.5, -18 + ty, 13, 2);
      ctx.fillStyle = U.shade(robe, -0.35); ctx.fillRect(-1, -30 + ty, 2, 28);
    } else if (skel) {
      ctx.strokeStyle = bone; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -32 + ty); ctx.lineTo(0, -15 + ty); ctx.stroke();
      for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.ellipse(0, -28 + r * 3.2 + ty, 6 - r * 0.6, 1.4, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, -15 + ty, 5, 2, 0, 0, 7); ctx.stroke();
    } else {
      const sw = fem ? 6 : 7.2, wb = fem ? 5.2 : 6.2;
      const g = ctx.createLinearGradient(-sw, 0, sw, 0);
      g.addColorStop(0, U.shade(chestCol, -0.22)); g.addColorStop(0.6, chestCol); g.addColorStop(1, U.shade(chestCol, 0.12));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-sw, -32 + ty); ctx.lineTo(sw, -32 + ty); ctx.lineTo(wb, -15 + ty); ctx.lineTo(-wb, -15 + ty); ctx.closePath(); ctx.fill();
      if (ctype === 'chain') {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        for (let yy = -31; yy < -16; yy += 2) for (let xx = -6; xx < 6; xx += 2) ctx.fillRect(xx + ((yy / 2) % 2), yy + ty, 1, 1);
      } else if (ctype === 'plate') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(1, -30 + ty, 2, 12);
        ctx.fillStyle = U.shade(chestCol, 0.15);
        ctx.beginPath(); ctx.ellipse(-7, -31 + ty, 4, 3, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(7, -31 + ty, 4, 3, 0, 0, 7); ctx.fill();
      } else if (ctype === 'leather') {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, -31 + ty); ctx.lineTo(0, -16 + ty); ctx.stroke();
      }
      if (o.ragged) { ctx.fillStyle = skin; ctx.fillRect(-3, -24 + ty, 3, 3); ctx.fillRect(3, -20 + ty, 2, 3); }
      ctx.fillStyle = 'rgba(40,25,10,0.8)'; ctx.fillRect(-wb, -17 + ty, wb * 2, 2);
      if (ctype !== 'none' && ctype !== 'plate') { ctx.fillStyle = '#c8a040'; ctx.fillRect(-1, -17 + ty, 2, 2); }
    }
    // shield on far side
    if (o.shield) this.shieldShape(ctx, -9, -23 + ty, o.shield.icon, o.shield.color, front);
    // head
    const hy = -38 + ty;
    const hairCol = o.hairColor || '#3d2817';
    const style = o.hairStyle || 'Short';
    if (!skel && !o.bald && (style === 'Long' || style === 'Braids') && !o.hood) {
      ctx.fillStyle = U.shade(hairCol, -0.1);
      ctx.fillRect(-6.5, hy - 2, 13, front ? 11 : 14);
    }
    ctx.fillStyle = skin; ctx.fillRect(-2, hy + 4, 4, 3);
    ctx.beginPath(); ctx.arc(0, hy, 6.2, 0, 7); ctx.fill();
    if (front) {
      if (skel) {
        ctx.fillStyle = '#1a1410'; ctx.fillRect(0, hy - 1.5, 2.5, 2.5); ctx.fillRect(3.5, hy - 1.5, 2.2, 2.5);
        ctx.fillRect(1.5, hy + 3, 4, 1);
        if (o.glow) { ctx.fillStyle = o.glow; ctx.fillRect(0.5, hy - 1, 1.5, 1.5); ctx.fillRect(4, hy - 1, 1.5, 1.5); }
      } else {
        ctx.fillStyle = o.eyes || '#1a1410'; ctx.fillRect(1, hy - 1, 1.6, 1.8); ctx.fillRect(4, hy - 1, 1.6, 1.8);
        ctx.fillStyle = 'rgba(160,60,40,0.35)'; ctx.fillRect(2, hy + 3, 3, 0.9);
      }
      if (o.tusks) { ctx.fillStyle = '#f0ead0'; ctx.fillRect(1, hy + 2.5, 1.2, 2.5); ctx.fillRect(4.5, hy + 2.5, 1.2, 2.5); }
    }
    // hair
    if (!skel && !o.bald && !o.hood && style !== 'Bald') this.hair(ctx, hy, style, hairCol, front);
    if (!skel && front && o.beard && o.beard !== 'None') this.beard(ctx, hy, o.beard, hairCol);
    // headgear
    if (o.hood) {
      ctx.fillStyle = o.hood;
      ctx.beginPath(); ctx.arc(0, hy - 0.5, 7.2, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(7, hy + 6); ctx.lineTo(-7, hy + 6); ctx.closePath(); ctx.fill();
      if (front) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-1, hy + 1.5, 8, 4); }
    }
    if (o.head) this.headgear(ctx, hy, o.head.type, o.head.color, front);
    if (o.crown) {
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath(); ctx.moveTo(-6, hy - 4); for (let k = 0; k <= 4; k++) { ctx.lineTo(-6 + k * 3, hy - (k % 2 ? 7 : 11)); } ctx.lineTo(6, hy - 4); ctx.closePath(); ctx.fill();
    }
    // near arm + weapon
    let theta, wAng;
    const ranged = o.weapon && (o.weapon.icon === 'bow' || o.weapon.icon === 'longbow' || o.weapon.icon === 'crossbow');
    if (o.cast > 0) { theta = 2.4; wAng = Math.PI; }
    else if (o.atk >= 0 && o.atk <= 1) {
      if (ranged) { theta = U.lerp(0.2, 1.55, Math.min(1, o.atk * 3)); wAng = Math.PI; }
      else if (o.atk < 0.35) { const t = o.atk / 0.35; theta = U.lerp(0.15, -2.3, t); wAng = U.lerp(2.3, Math.PI + 0.7, t); }
      else { const t = (o.atk - 0.35) / 0.65, e = 1 - Math.pow(1 - t, 3); theta = U.lerp(-2.3, 1.0, e); wAng = U.lerp(Math.PI + 0.7, 1.4, e); }
    } else {
      theta = 0.15 + (o.moving ? Math.sin(ph) * 0.45 : 0);
      wAng = ranged ? Math.PI - 0.25 : 2.3 + (o.moving ? Math.sin(ph) * 0.45 : 0);
    }
    if (o.tool === 'mining' || o.tool === 'lumberjack') { // gathering swing
      const t = (Math.sin(o.time * 7) + 1) / 2;
      theta = U.lerp(-2.0, 0.9, t); wAng = U.lerp(Math.PI + 0.5, 1.6, t);
    }
    const hand = this.arm(ctx, 7, -30 + ty, theta, o, skin, false);
    if (o.weapon) {
      ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(-(wAng - Math.PI));
      this.weaponShape(ctx, o.weapon.icon, o.weapon.color, o.weapon.icon === 'pole' ? 30 : 20, o.weapon.glow);
      ctx.restore();
    }
    if (o.cloak && !front) {
      ctx.fillStyle = o.cloak;
      ctx.beginPath(); ctx.moveTo(-8, -32 + ty); ctx.lineTo(8, -32 + ty); ctx.lineTo(10 + legSwing * 0.3, -4); ctx.lineTo(-11, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = U.shade(o.cloak, -0.25); ctx.fillRect(-1, -30 + ty, 2, 26);
    }
    if (o.mounted) { // near leg hanging over horse
      ctx.strokeStyle = o.legs ? o.legs.color : '#4a3a2a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(3, -16); ctx.lineTo(6, -8); ctx.lineTo(4, 2); ctx.stroke();
      ctx.fillStyle = o.feet ? o.feet.color : '#3a2a1a'; ctx.beginPath(); ctx.ellipse(5.5, 3, 3.4, 2.2, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  },
  arm(ctx, sx, sy, theta, o, skin, far) {
    const la = 13;
    const hx = sx + Math.sin(theta) * la, hy = sy + Math.cos(theta) * la;
    const sleeve = o.skeleton ? '#e6e0c8' : o.robe ? o.robe : o.chest && o.chest.type !== 'none' ? o.chest.color : skin;
    ctx.strokeStyle = far ? U.shade(sleeve, -0.25) : sleeve; ctx.lineCap = 'round';
    ctx.lineWidth = o.skeleton ? 2.2 : 4;
    const ex = sx + Math.sin(theta) * la * 0.55 + (far ? -1 : 1), ey = sy + Math.cos(theta) * la * 0.55;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = o.hands ? o.hands.color : skin;
    ctx.beginPath(); ctx.arc(hx, hy, o.skeleton ? 1.6 : 2.3, 0, 7); ctx.fill();
    return [hx, hy];
  },
  hair(ctx, hy, style, col, front) {
    ctx.fillStyle = col;
    const cap = () => { ctx.beginPath(); ctx.arc(0, hy - 0.5, 6.6, Math.PI * (front ? 1.05 : 0.85), Math.PI * (front ? 1.95 : 2.15)); ctx.closePath(); ctx.fill(); if (!front) { ctx.fillRect(-6.4, hy - 1, 12.8, 6); } else { ctx.fillRect(-6.4, hy - 2, 3, 4); } };
    switch (style) {
      case 'Short': cap(); break;
      case 'Long': cap(); ctx.fillRect(-6.6, hy - 2, 3, 10); break;
      case 'Ponytail': cap(); ctx.beginPath(); ctx.ellipse(-7, hy + 3, 2.4, 6, 0.3, 0, 7); ctx.fill(); break;
      case 'Mohawk': for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 2.4 - 1.5, hy - 5); ctx.lineTo(k * 2.4, hy - 11 + Math.abs(k)); ctx.lineTo(k * 2.4 + 1.5, hy - 5); ctx.fill(); } break;
      case 'Braids': cap(); ctx.fillRect(-7, hy, 2, 11); ctx.fillRect(5, hy, 2, 11); break;
      case 'Topknot': cap(); ctx.beginPath(); ctx.arc(-1, hy - 8, 3, 0, 7); ctx.fill(); break;
      case 'Curly': for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8) * Math.PI; ctx.beginPath(); ctx.arc(Math.cos(a) * 5.5, hy + Math.sin(a) * 5.5, 2.6, 0, 7); ctx.fill(); } if (!front) ctx.fillRect(-6, hy - 2, 12, 6); break;
    }
  },
  beard(ctx, hy, b, col) {
    ctx.fillStyle = col;
    switch (b) {
      case 'Stubble': ctx.globalAlpha *= 0.4; ctx.beginPath(); ctx.arc(1.5, hy + 2, 5, 0.1, Math.PI - 0.1); ctx.fill(); ctx.globalAlpha /= 0.4; break;
      case 'Goatee': ctx.beginPath(); ctx.moveTo(1, hy + 4); ctx.lineTo(5, hy + 4); ctx.lineTo(3, hy + 8); ctx.fill(); break;
      case 'Full Beard': ctx.beginPath(); ctx.arc(1.5, hy + 2, 5.6, 0, Math.PI); ctx.fill(); break;
      case 'Long Beard': ctx.beginPath(); ctx.moveTo(-3, hy + 2); ctx.lineTo(7, hy + 2); ctx.lineTo(3, hy + 14); ctx.closePath(); ctx.fill(); break;
      case 'Mustache': ctx.fillRect(0, hy + 2.2, 6, 1.4); break;
    }
  },
  headgear(ctx, hy, type, col, front) {
    switch (type) {
      case 'cap': ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, hy - 1, 6.8, Math.PI, 0); ctx.fill(); ctx.fillRect(-7, hy - 2, 14, 2); break;
      case 'coif':
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, hy, 7.4, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(7.4, hy + 7); ctx.lineTo(-7.4, hy + 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let k = -6; k < 7; k += 2) ctx.fillRect(k, hy - 6, 1, 12);
        if (front) { ctx.fillStyle = '#e8c09a'; ctx.beginPath(); ctx.ellipse(2.5, hy + 1, 3.6, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1a1410'; ctx.fillRect(1, hy - 1, 1.6, 1.8); ctx.fillRect(4, hy - 1, 1.6, 1.8); }
        break;
      case 'helm': {
        const g = ctx.createLinearGradient(-7, 0, 7, 0); g.addColorStop(0, U.shade(col, -0.3)); g.addColorStop(1, U.shade(col, 0.25));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, hy, 7.6, Math.PI, 0); ctx.lineTo(7.6, hy + 5); ctx.lineTo(-7.6, hy + 5); ctx.closePath(); ctx.fill();
        if (front) { ctx.fillStyle = '#111'; ctx.fillRect(0, hy - 1, 7, 1.8); }
        ctx.fillStyle = '#b8302a'; ctx.beginPath(); ctx.ellipse(-1, hy - 9, 2, 4, -0.3, 0, 7); ctx.fill();
        break;
      }
      case 'hat':
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, hy - 4, 10, 2.6, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-6, hy - 4); ctx.quadraticCurveTo(-1, hy - 14, 4, hy - 22); ctx.quadraticCurveTo(3, hy - 12, 6, hy - 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = U.shade(col, 0.35); ctx.fillRect(-6, hy - 6, 12, 1.6);
        break;
    }
  },
  shieldShape(ctx, x, y, icon, col, front) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(-6, 0, 6, 0); g.addColorStop(0, U.shade(col, -0.3)); g.addColorStop(1, U.shade(col, 0.2));
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (icon === 'buckler') ctx.arc(0, 0, 5.5, 0, 7);
    else if (icon === 'woodshield') ctx.arc(0, 0, 7, 0, 7);
    else if (icon === 'kite') { ctx.moveTo(-6, -7); ctx.lineTo(6, -7); ctx.lineTo(5, 3); ctx.lineTo(0, 10); ctx.lineTo(-5, 3); ctx.closePath(); }
    else { ctx.rect(-7, -10, 13, 20); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, 7); ctx.fill();
    ctx.restore();
  },
  // Weapon drawn from grip at origin toward -y. L = nominal length
  weaponShape(ctx, k, col, L, glow) {
    const wood = '#7a5230', dark = 'rgba(0,0,0,0.55)';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const metal = col || '#b0b8c0';
    const blade = (len, w, curve = 0) => {
      ctx.fillStyle = metal; ctx.strokeStyle = dark; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-w / 2, -4);
      ctx.quadraticCurveTo(-w / 2 + curve, -4 - len * 0.6, curve * 1.4, -4 - len);
      ctx.quadraticCurveTo(w / 2 + curve, -4 - len * 0.6, w / 2, -4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-0.4, -5, 0.8, -len * 0.8);
      ctx.fillStyle = '#6a5a3a'; ctx.fillRect(-w / 2 - 3, -5, w + 6, 2);
      ctx.fillStyle = '#4a3020'; ctx.fillRect(-1, -3, 2, 5);
      ctx.fillStyle = '#c8a040'; ctx.beginPath(); ctx.arc(0, 2.5, 1.5, 0, 7); ctx.fill();
    };
    const shaft = (len, w = 2, c = wood) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -len); ctx.stroke(); };
    switch (k) {
      case 'dagger': blade(L * 0.45, 3); break;
      case 'sword': blade(L * 0.75, 3.4); break;
      case 'longsword': blade(L * 0.9, 3.6); break;
      case 'rapier': blade(L * 0.95, 1.6); ctx.strokeStyle = '#c8a040'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -4, 3, 0, Math.PI); ctx.stroke(); break;
      case 'scimitar': blade(L * 0.8, 4, 3); break;
      case 'katana': blade(L * 0.95, 2.6, 1.5); break;
      case 'greatsword': blade(L * 1.15, 5); break;
      case 'hatchet': case 'axe': case 'battleaxe': {
        const big = k === 'battleaxe';
        shaft(L * (big ? 1.0 : 0.75), 2.2);
        const top = -L * (big ? 1.0 : 0.75);
        ctx.fillStyle = metal; ctx.strokeStyle = dark; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, top + 1); ctx.quadraticCurveTo(big ? 9 : 6, top - 2, big ? 9 : 6, top + (big ? 10 : 7)); ctx.quadraticCurveTo(3, top + 5, 0, top + (big ? 8 : 6)); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (big) { ctx.beginPath(); ctx.moveTo(0, top + 1); ctx.quadraticCurveTo(-9, top - 2, -9, top + 10); ctx.quadraticCurveTo(-3, top + 5, 0, top + 8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        break;
      }
      case 'club': ctx.strokeStyle = metal || wood; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -L * 0.5); ctx.stroke(); ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(0, -L * 0.45); ctx.lineTo(0.5, -L * 0.8); ctx.stroke(); break;
      case 'mace': shaft(L * 0.6, 2.2, '#5a4030'); ctx.fillStyle = metal; ctx.beginPath(); ctx.arc(0, -L * 0.65, 4, 0, 7); ctx.fill();
        ctx.strokeStyle = metal; ctx.lineWidth = 1.5; for (let a = 0; a < 6; a++) { ctx.beginPath(); ctx.moveTo(0, -L * 0.65); ctx.lineTo(Math.cos(a) * 6, -L * 0.65 + Math.sin(a) * 6); ctx.stroke(); } break;
      case 'warhammer': shaft(L * 1.0, 2.4, '#5a4030'); ctx.fillStyle = metal; ctx.strokeStyle = dark; ctx.lineWidth = 0.8; ctx.fillRect(-6, -L - 4, 12, 7); ctx.strokeRect(-6, -L - 4, 12, 7); break;
      case 'staff': shaft(L * 1.25, 2.4, metal || wood); ctx.fillStyle = U.shade(metal || wood, 0.2); ctx.beginPath(); ctx.arc(0, -L * 1.25, 2.6, 0, 7); ctx.fill(); break;
      case 'wstaff': {
        shaft(L * 1.3, 2.2, metal || wood);
        const g = glow || '#9ad8ff';
        const gr = ctx.createRadialGradient(0, -L * 1.3 - 3, 0.5, 0, -L * 1.3 - 3, 7);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, g); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -L * 1.3 - 3, 7, 0, 7); ctx.fill();
        break;
      }
      case 'pickaxe': shaft(L * 0.8, 2.2); ctx.strokeStyle = metal; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(-8, -L * 0.8 + 4); ctx.quadraticCurveTo(0, -L * 0.8 - 3, 8, -L * 0.8 + 4); ctx.stroke(); break;
      case 'spear': shaft(L * 1.25, 2); ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(-2.5, -L * 1.2); ctx.lineTo(0, -L * 1.2 - 8); ctx.lineTo(2.5, -L * 1.2); ctx.closePath(); ctx.fill(); break;
      case 'bow': case 'longbow': {
        const h = k === 'longbow' ? L * 0.9 : L * 0.7;
        ctx.strokeStyle = metal || wood; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(0, h); ctx.quadraticCurveTo(h * 0.7, 0, 0, -h); ctx.stroke();
        ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, -h); ctx.stroke();
        break;
      }
      case 'crossbow': ctx.strokeStyle = metal || wood; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -L * 0.6); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -L * 0.45); ctx.quadraticCurveTo(0, -L * 0.7, 9, -L * 0.45); ctx.stroke(); break;
      case 'pole': ctx.strokeStyle = '#b08850'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -L); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(6, -L + 18); ctx.stroke(); break;
      case 'smithhammer': shaft(L * 0.55, 2); ctx.fillStyle = metal; ctx.fillRect(-4, -L * 0.6 - 3, 8, 5); break;
      case 'saw': shaft(L * 0.25, 3); ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(-3, -L * 0.25); ctx.lineTo(3, -L * 0.25); ctx.lineTo(1, -L * 0.85); ctx.lineTo(-3, -L * 0.85); ctx.closePath(); ctx.fill(); break;
      default: blade(L * 0.7, 3);
    }
  },

  // ---------- Creatures (facing right) ----------
  quad(ctx, x, y, L, o) {
    const s = o.scale || 1;
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const len = L.len, h = L.h, leg = L.leg;
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0, len * 0.65 * s, 5 * s, 0, 0, 7); ctx.fill();
    ctx.scale(o.right ? s : -s, s);
    const ph = o.moving ? o.walk * 1.3 : 0;
    const by = -leg - h / 2 + (o.moving ? Math.abs(Math.sin(ph)) * 1.2 : 0);
    const col = o.tint || L.color, dark = U.shade(col, -0.3);
    // legs
    const legX = [-len * 0.34, -len * 0.18, len * 0.22, len * 0.36];
    legX.forEach((lx, i) => {
      const far = i % 2 === 0;
      const sw = Math.sin(ph + (i < 2 ? 0 : Math.PI) + (far ? Math.PI : 0)) * 4;
      ctx.strokeStyle = far ? U.shade(col, -0.4) : dark; ctx.lineWidth = L.bulky ? 4.5 : 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lx, by + h * 0.25); ctx.lineTo(lx + sw, -1); ctx.stroke();
    });
    // tail
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
    const tx = -len / 2;
    if (L.tail === 'long') { ctx.beginPath(); ctx.moveTo(tx, by); ctx.quadraticCurveTo(tx - 8, by + 4, tx - 12, by - 2 + Math.sin(o.time * 4) * 2); ctx.stroke(); }
    else if (L.tail === 'bushy') { ctx.beginPath(); ctx.ellipse(tx - 4, by - 1, 6, 2.6, -0.5 + Math.sin(o.time * 3) * 0.2, 0, 7); ctx.fill(); }
    else if (L.tail === 'puff') { ctx.fillStyle = '#efe8d8'; ctx.beginPath(); ctx.arc(tx, by - 1, 2.2, 0, 7); ctx.fill(); }
    else if (L.mane) { ctx.strokeStyle = L.mane; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, by - 2); ctx.quadraticCurveTo(tx - 6, by + 2, tx - 5, by + 10); ctx.stroke(); }
    // body
    const g = ctx.createLinearGradient(0, by - h / 2, 0, by + h / 2);
    g.addColorStop(0, U.shade(col, 0.15)); g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, by, len / 2, h / 2 * (L.bulky ? 1.15 : 1), 0, 0, 7); ctx.fill();
    if (L.bulky) { ctx.beginPath(); ctx.ellipse(len * 0.1, by - h * 0.35, len * 0.25, h * 0.35, 0, 0, 7); ctx.fill(); }
    // neck & head
    const tall = L.ears === 'deer';
    const hx = len / 2 + (tall ? 2 : 1), hy = by - (tall ? h * 0.9 : h * 0.2);
    if (tall) { ctx.strokeStyle = col; ctx.lineWidth = h * 0.5; ctx.beginPath(); ctx.moveTo(len * 0.35, by - h * 0.1); ctx.lineTo(hx, hy + 2); ctx.stroke(); }
    if (L.mane) { ctx.strokeStyle = L.mane; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(len * 0.3, by - h * 0.45); ctx.lineTo(hx - 1, hy - 3); ctx.stroke(); }
    const hs = L.bulky ? h * 0.42 : tall ? h * 0.35 : h * 0.45;
    ctx.fillStyle = U.shade(col, 0.05);
    ctx.beginPath(); ctx.ellipse(hx, hy, hs, hs * 0.85, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + hs * 0.9, hy + hs * 0.25, hs * 0.65, hs * 0.45, 0.1, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(hx + hs * 1.45, hy + hs * 0.15, 1, 0, 7); ctx.fill();
    ctx.fillStyle = L.eyes || '#111'; ctx.fillRect(hx + hs * 0.3, hy - hs * 0.35, 1.8, 1.8);
    // ears
    ctx.fillStyle = dark;
    if (L.ears === 'long') { ctx.beginPath(); ctx.ellipse(hx - 1, hy - hs - 3, 1.6, 4.5, -0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx + 1.5, hy - hs - 3, 1.6, 4.5, 0.1, 0, 7); ctx.fill(); }
    else if (L.ears === 'point') { ctx.beginPath(); ctx.moveTo(hx - 3, hy - hs + 1); ctx.lineTo(hx - 1, hy - hs - 5); ctx.lineTo(hx + 1.5, hy - hs + 1); ctx.fill(); }
    else if (L.ears === 'round') { ctx.beginPath(); ctx.arc(hx - 1.5, hy - hs, 2.4, 0, 7); ctx.fill(); }
    else if (L.ears === 'deer') { ctx.beginPath(); ctx.ellipse(hx - 3, hy - hs, 1.6, 3.4, -0.8, 0, 7); ctx.fill(); }
    if (L.antlers) {
      ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(hx, hy - hs); ctx.lineTo(hx - 2, hy - hs - 9); ctx.moveTo(hx - 1, hy - hs - 5); ctx.lineTo(hx - 6, hy - hs - 8);
      ctx.moveTo(hx - 2, hy - hs - 8); ctx.lineTo(hx + 2, hy - hs - 12); ctx.stroke();
    }
    if (o.saddle) { ctx.fillStyle = '#6a3a1a'; ctx.beginPath(); ctx.ellipse(0, by - h / 2 + 1, len * 0.18, 3, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  },
  spider(ctx, x, y, L, o) {
    const s = o.scale || 1;
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0, L.r * 1.8 * s, 5 * s, 0, 0, 7); ctx.fill();
    ctx.scale(o.right ? s : -s, s);
    const ph = o.moving ? o.walk * 2 : o.time;
    const by = -L.r * 0.9;
    const n = L.legs;
    ctx.strokeStyle = U.shade(L.color, -0.2); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), ang = (k - (n / 4 - 0.5)) * 0.5;
      const sw = Math.sin(ph + i) * (o.moving ? 2.5 : 0.6);
      const kx = Math.cos(ang) * L.r * 1.3 * side + sw, ky = by - L.r * 0.6;
      ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(kx, ky); ctx.lineTo(kx * 1.4, -0.5); ctx.stroke();
    }
    if (L.claws) {
      ctx.fillStyle = U.shade(L.color, 0.1);
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(L.r * 1.2, by - 1 + sd * 3, 3.2, 2.2, 0.3 * sd, 0, 7); ctx.fill(); }
    }
    ctx.fillStyle = L.color;
    if (!L.claws) { ctx.beginPath(); ctx.ellipse(-L.r * 0.7, by - 1, L.r, L.r * 0.8, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = U.shade(L.color, 0.1);
    ctx.beginPath(); ctx.ellipse(L.claws ? 0 : L.r * 0.35, by, L.claws ? L.r * 1.1 : L.r * 0.55, L.r * (L.claws ? 0.6 : 0.5), 0, 0, 7); ctx.fill();
    if (L.mark) { ctx.fillStyle = L.mark; ctx.beginPath(); ctx.arc(-L.r * 0.7, by - 2, 2.2, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ff4a4a'; ctx.fillRect(L.r * 0.7, by - 2, 1.4, 1.4); ctx.fillRect(L.r * 0.9, by - 1, 1.4, 1.4);
    ctx.restore();
  },
  blob(ctx, x, y, L, o) {
    const s = o.scale || 1, w = Math.sin(o.time * 4 + x) * 0.12;
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, L.r * 1.2 * s, 4 * s, 0, 0, 7); ctx.fill();
    ctx.scale(s, s);
    const r = L.r;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 1.1, 1, 0, -r * 0.7, r * 1.3);
    g.addColorStop(0, U.shade(L.color, 0.4)); g.addColorStop(1, U.rgba(L.color, 0.8));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, -r * (0.7 - w * 0.5), r * (1.1 + w), r * (0.8 - w), 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; const ex = o.right ? 3 : -3;
    ctx.fillRect(ex - 3, -r * 0.9, 2, 3); ctx.fillRect(ex + 2, -r * 0.9, 2, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 1.1, r * 0.25, r * 0.15, -0.4, 0, 7); ctx.fill();
    ctx.restore();
  },
  wisp(ctx, x, y, L, o) {
    const s = o.scale || 1, bob = Math.sin(o.time * 2.5 + x * 0.1) * 3;
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 8 * s, 3 * s, 0, 0, 7); ctx.fill();
    ctx.scale(o.right ? s : -s, s);
    const cy = -24 + bob;
    if (L.wraith) {
      const g = ctx.createLinearGradient(0, cy - 14, 0, cy + 18);
      g.addColorStop(0, '#2a1a3a'); g.addColorStop(1, 'rgba(60,30,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-8, cy - 4); ctx.quadraticCurveTo(0, cy - 20, 8, cy - 4);
      for (let k = 0; k <= 6; k++) ctx.lineTo(8 - k * (16 / 6), cy + 16 + Math.sin(o.time * 6 + k) * 3 * (k % 2 ? 1 : -1));
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = L.color; ctx.fillRect(1, cy - 6, 2, 2); ctx.fillRect(5, cy - 6, 2, 2);
      ctx.strokeStyle = '#2a1a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, cy + 1); ctx.lineTo(12, cy + 4 + Math.sin(o.time * 3) * 2); ctx.stroke();
    } else {
      const gr = ctx.createRadialGradient(0, cy, 1, 0, cy, L.r * 1.6);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, L.color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, cy, L.r * 1.6, 0, 7); ctx.fill();
    }
    ctx.restore();
  },
  drake(ctx, x, y, L, o) {
    const s = o.scale || 1;
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, L.len * 0.8 * s, 7 * s, 0, 0, 7); ctx.fill();
    ctx.scale(o.right ? s : -s, s);
    const col = L.color, dark = U.shade(col, -0.35);
    const ph = o.moving ? o.walk : 0, by = -L.leg - L.h / 2;
    const flap = Math.sin(o.time * (o.moving ? 6 : 1.5)) * 0.25;
    // far wing
    ctx.fillStyle = U.shade(col, -0.45);
    ctx.beginPath(); ctx.moveTo(-2, by - L.h * 0.3); ctx.lineTo(-L.len * 0.5, by - L.h * 1.9 - flap * 20); ctx.lineTo(-L.len * 0.7, by - L.h * 0.6); ctx.closePath(); ctx.fill();
    // legs
    for (const [lx, far] of [[-L.len * 0.3, 1], [-L.len * 0.2, 0], [L.len * 0.2, 1], [L.len * 0.3, 0]]) {
      const sw = Math.sin(ph + lx) * 4;
      ctx.strokeStyle = far ? U.shade(col, -0.5) : dark; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lx, by + 2); ctx.lineTo(lx + sw, -1); ctx.stroke();
    }
    // tail
    ctx.strokeStyle = col; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-L.len * 0.4, by); ctx.quadraticCurveTo(-L.len * 0.8, by + 6, -L.len * 1.05, by - 4 + Math.sin(o.time * 2) * 3); ctx.stroke();
    // body
    const g = ctx.createLinearGradient(0, by - L.h / 2, 0, by + L.h / 2);
    g.addColorStop(0, U.shade(col, 0.15)); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, by, L.len / 2, L.h / 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = L.belly; ctx.beginPath(); ctx.ellipse(2, by + L.h * 0.25, L.len * 0.35, L.h * 0.2, 0, 0, 7); ctx.fill();
    // neck & head
    ctx.strokeStyle = col; ctx.lineWidth = L.h * 0.45;
    const hx = L.len * 0.62, hy = by - L.h * 1.1;
    ctx.beginPath(); ctx.moveTo(L.len * 0.3, by - L.h * 0.1); ctx.quadraticCurveTo(L.len * 0.55, by - L.h * 0.3, hx, hy); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(hx + 3, hy, L.h * 0.38, L.h * 0.26, 0.15, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + L.h * 0.5, hy + 2, L.h * 0.3, L.h * 0.16, 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd94a'; ctx.fillRect(hx + 2, hy - 3, 2, 2);
    ctx.strokeStyle = '#e8dcb8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx - 1, hy - L.h * 0.2); ctx.lineTo(hx - 7, hy - L.h * (L.horns ? 0.75 : 0.5)); ctx.stroke();
    // spines
    ctx.fillStyle = dark;
    for (let k = 0; k < 5; k++) { const sx = -L.len * 0.35 + k * L.len * 0.15; ctx.beginPath(); ctx.moveTo(sx - 2, by - L.h / 2 + 1); ctx.lineTo(sx, by - L.h / 2 - 4); ctx.lineTo(sx + 2, by - L.h / 2 + 1); ctx.fill(); }
    // near wing
    ctx.fillStyle = U.shade(col, -0.2); ctx.strokeStyle = dark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(2, by - L.h * 0.3); ctx.lineTo(-L.len * 0.3, by - L.h * 2.1 + flap * 20); ctx.lineTo(-L.len * 0.45, by - L.h * 1.2); ctx.lineTo(-L.len * 0.55, by - L.h * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  },

  // ---------- Item icons ----------
  icon(key, color, size = 40) {
    const ck = key + '|' + color + '|' + size;
    if (this.iconCache.has(ck)) return this.iconCache.get(ck);
    const c = mkCanvas(size, size), x = c.getContext('2d');
    x.scale(size / 40, size / 40);
    this.drawIcon(x, key, color || '#b0b0b0');
    this.iconCache.set(ck, c);
    return c;
  },
  iconURL(key, color, size = 40) {
    const ck = 'url|' + key + '|' + color + '|' + size;
    if (this.iconCache.has(ck)) return this.iconCache.get(ck);
    const u = this.icon(key, color, size).toDataURL();
    this.iconCache.set(ck, u);
    return u;
  },
  drawIcon(x, key, col) {
    const ol = '#16110c', dk = U.shade(col, -0.35), lt = U.shade(col, 0.35);
    x.lineJoin = 'round'; x.lineCap = 'round';
    const fillStroke = (fill, lw = 1.6) => { x.fillStyle = fill; x.fill(); x.strokeStyle = ol; x.lineWidth = lw; x.stroke(); };
    const grad = (x0, y0, x1, y1, a, b) => { const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
    if (key.startsWith('sp_')) { this.spellIcon(x, key.slice(3), col); return; }
    const weaponKeys = ['dagger', 'rapier', 'spear', 'sword', 'longsword', 'scimitar', 'katana', 'greatsword', 'battleaxe', 'hatchet', 'club', 'mace', 'warhammer', 'staff', 'wstaff', 'pickaxe', 'bow', 'longbow', 'crossbow', 'pole', 'smithhammer', 'saw'];
    if (weaponKeys.includes(key)) {
      x.save(); x.translate(14, 27); x.rotate(Math.PI / 4);
      x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 2;
      const L = key === 'dagger' ? 30 : ['spear', 'staff', 'wstaff', 'pole'].includes(key) ? 21 : 26;
      if (['staff', 'wstaff', 'spear', 'pole'].includes(key)) x.translate(0, 8);
      this.weaponShape(x, key, key === 'club' || key === 'staff' || key === 'wstaff' || key === 'bow' || key === 'longbow' || key === 'crossbow' ? (col === '#b0b0b0' ? '#9a6a3a' : col) : col, L, '#9ad8ff');
      x.restore();
      return;
    }
    switch (key) {
      case 'cap': x.beginPath(); x.arc(20, 24, 12, Math.PI, 0); x.lineTo(33, 27); x.lineTo(7, 27); x.closePath(); fillStroke(grad(8, 0, 32, 0, lt, dk)); break;
      case 'chainhelm': x.beginPath(); x.arc(20, 21, 12, Math.PI, 0); x.lineTo(32, 34); x.lineTo(8, 34); x.closePath(); fillStroke(grad(8, 0, 32, 0, lt, dk));
        x.fillStyle = '#2a2420'; x.beginPath(); x.ellipse(20, 25, 6, 6, 0, 0, 7); x.fill(); break;
      case 'helm': x.beginPath(); x.arc(20, 20, 12, Math.PI, 0); x.lineTo(32, 32); x.lineTo(8, 32); x.closePath(); fillStroke(grad(8, 0, 32, 0, lt, dk));
        x.fillStyle = '#111'; x.fillRect(12, 20, 16, 3); x.fillRect(19, 20, 2, 9);
        x.fillStyle = '#b8302a'; x.beginPath(); x.ellipse(20, 6, 3, 5, 0, 0, 7); x.fill(); break;
      case 'hat': x.beginPath(); x.ellipse(20, 30, 16, 4, 0, 0, 7); fillStroke(col);
        x.beginPath(); x.moveTo(11, 30); x.quadraticCurveTo(18, 14, 28, 4); x.quadraticCurveTo(25, 18, 29, 30); x.closePath(); fillStroke(grad(10, 0, 30, 0, lt, dk));
        x.fillStyle = '#ffd94a'; x.fillRect(12, 26, 16, 2); break;
      case 'shirt': case 'chest': case 'chain': case 'plate': case 'robe': {
        x.beginPath();
        if (key === 'robe') { x.moveTo(13, 6); x.lineTo(27, 6); x.lineTo(34, 13); x.lineTo(30, 16); x.lineTo(31, 36); x.lineTo(9, 36); x.lineTo(10, 16); x.lineTo(6, 13); }
        else { x.moveTo(13, 6); x.lineTo(27, 6); x.lineTo(35, 12); x.lineTo(31, 18); x.lineTo(29, 16); x.lineTo(29, 34); x.lineTo(11, 34); x.lineTo(11, 16); x.lineTo(9, 18); x.lineTo(5, 12); }
        x.closePath(); fillStroke(grad(6, 0, 34, 0, lt, dk));
        if (key === 'chain') { x.fillStyle = 'rgba(0,0,0,0.3)'; for (let yy = 9; yy < 33; yy += 3) for (let xx = 12; xx < 29; xx += 3) x.fillRect(xx, yy, 1.2, 1.2); }
        if (key === 'plate') { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(22, 10, 3, 18); x.strokeStyle = ol; x.lineWidth = 1; x.beginPath(); x.moveTo(11, 22); x.lineTo(29, 22); x.stroke(); }
        if (key === 'chest') { x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(20, 8); x.lineTo(20, 33); x.stroke(); }
        if (key === 'robe') { x.fillStyle = U.shade(col, 0.4); x.fillRect(10, 20, 20, 2.5); }
        break;
      }
      case 'legs': x.beginPath(); x.moveTo(11, 6); x.lineTo(29, 6); x.lineTo(31, 35); x.lineTo(23, 35); x.lineTo(20, 15); x.lineTo(17, 35); x.lineTo(9, 35); x.closePath(); fillStroke(grad(9, 0, 31, 0, lt, dk)); break;
      case 'gloves': x.beginPath(); x.moveTo(12, 34); x.lineTo(12, 16); x.quadraticCurveTo(12, 8, 16, 9); x.lineTo(17, 6); x.lineTo(20, 6); x.lineTo(21, 9); x.lineTo(24, 7); x.lineTo(26, 10); x.lineTo(30, 14); x.lineTo(28, 22); x.lineTo(27, 34); x.closePath(); fillStroke(grad(12, 0, 30, 0, lt, dk)); break;
      case 'boots': case 'shoes': {
        const top = key === 'boots' ? 6 : 20;
        x.beginPath(); x.moveTo(12, top); x.lineTo(22, top); x.lineTo(22, 26); x.lineTo(33, 29); x.lineTo(33, 34); x.lineTo(10, 34); x.lineTo(10, top + 2); x.closePath(); fillStroke(grad(10, 0, 33, 0, lt, dk)); break;
      }
      case 'cloak': x.beginPath(); x.moveTo(15, 5); x.lineTo(25, 5); x.quadraticCurveTo(34, 20, 34, 35); x.lineTo(6, 35); x.quadraticCurveTo(6, 20, 15, 5); x.closePath(); fillStroke(grad(6, 0, 34, 0, lt, dk));
        x.fillStyle = '#ffd94a'; x.beginPath(); x.arc(20, 8, 2, 0, 7); x.fill(); break;
      case 'buckler': case 'woodshield': x.beginPath(); x.arc(20, 20, key === 'buckler' ? 12 : 14, 0, 7); fillStroke(grad(6, 6, 34, 34, lt, dk));
        x.beginPath(); x.arc(20, 20, 4, 0, 7); fillStroke(lt, 1); break;
      case 'kite': x.beginPath(); x.moveTo(9, 6); x.lineTo(31, 6); x.lineTo(29, 22); x.lineTo(20, 36); x.lineTo(11, 22); x.closePath(); fillStroke(grad(9, 0, 31, 0, lt, dk));
        x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(20, 9); x.lineTo(20, 30); x.moveTo(13, 15); x.lineTo(27, 15); x.stroke(); break;
      case 'tower': x.beginPath(); x.rect(9, 4, 22, 32); fillStroke(grad(9, 0, 31, 0, lt, dk)); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(12, 8, 16, 2); x.fillRect(12, 30, 16, 2); break;
      case 'ring': x.beginPath(); x.arc(20, 23, 10, 0, 7); x.strokeStyle = ol; x.lineWidth = 6; x.stroke(); x.strokeStyle = col; x.lineWidth = 3.5; x.stroke();
        x.beginPath(); x.moveTo(15, 12); x.lineTo(20, 6); x.lineTo(25, 12); x.lineTo(20, 16); x.closePath(); fillStroke('#7fd4ff', 1.2); break;
      case 'amulet': x.strokeStyle = col; x.lineWidth = 1.6; x.beginPath(); x.moveTo(8, 4); x.quadraticCurveTo(20, 30, 32, 4); x.stroke();
        x.beginPath(); x.arc(20, 26, 7, 0, 7); fillStroke(grad(14, 20, 26, 32, lt, dk)); x.fillStyle = '#ff4a6a'; x.beginPath(); x.arc(20, 26, 3, 0, 7); x.fill(); break;
      case 'talisman': x.beginPath(); x.moveTo(20, 5); x.lineTo(32, 20); x.lineTo(20, 35); x.lineTo(8, 20); x.closePath(); fillStroke(grad(8, 5, 32, 35, lt, dk));
        x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 1; x.beginPath(); x.arc(20, 20, 5, 0, 7); x.stroke(); break;
      case 'rabbitfoot': x.beginPath(); x.ellipse(20, 24, 7, 11, 0.3, 0, 7); fillStroke(col); x.fillStyle = '#c8a070'; x.fillRect(16, 6, 6, 6); break;
      case 'sewing': x.beginPath(); x.rect(7, 14, 26, 18); fillStroke('#a0703c'); x.fillStyle = '#e8e0c8'; x.beginPath(); x.arc(15, 12, 4, 0, 7); x.fill(); x.fillStyle = '#c83a3a'; x.beginPath(); x.arc(25, 12, 4, 0, 7); x.fill();
        x.strokeStyle = '#ddd'; x.lineWidth = 1; x.beginPath(); x.moveTo(28, 4); x.lineTo(20, 22); x.stroke(); break;
      case 'mortar': x.beginPath(); x.moveTo(8, 18); x.lineTo(32, 18); x.quadraticCurveTo(30, 34, 20, 34); x.quadraticCurveTo(10, 34, 8, 18); x.closePath(); fillStroke(grad(8, 0, 32, 0, '#e0d8c8', '#8a8478'));
        x.strokeStyle = '#6a5a4a'; x.lineWidth = 3.5; x.beginPath(); x.moveTo(20, 20); x.lineTo(30, 5); x.stroke(); break;
      case 'ore': {
        const r = mulberry32(3);
        for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(11 + r() * 18, 14 + r() * 14, 8, 6, r() * 3, 0, 7); fillStroke(grad(0, 10, 40, 34, '#9a948a', '#4a4640'), 1.2); }
        x.fillStyle = col; for (let k = 0; k < 9; k++) { x.beginPath(); x.arc(9 + r() * 22, 12 + r() * 18, 1.8 + r() * 1.5, 0, 7); x.fill(); }
        break;
      }
      case 'ingot': x.beginPath(); x.moveTo(6, 26); x.lineTo(12, 14); x.lineTo(34, 14); x.lineTo(28, 26); x.closePath(); fillStroke(lt);
        x.beginPath(); x.moveTo(6, 26); x.lineTo(28, 26); x.lineTo(28, 32); x.lineTo(6, 32); x.closePath(); fillStroke(col);
        x.beginPath(); x.moveTo(28, 26); x.lineTo(34, 14); x.lineTo(34, 20); x.lineTo(28, 32); x.closePath(); fillStroke(dk); break;
      case 'log': x.beginPath(); x.moveTo(8, 14); x.lineTo(30, 14); x.lineTo(30, 30); x.lineTo(8, 30); x.closePath(); fillStroke(grad(0, 14, 0, 30, U.shade(col, -0.1), U.shade(col, -0.5)));
        x.beginPath(); x.ellipse(30, 22, 5, 8, 0, 0, 7); fillStroke(lt); x.strokeStyle = dk; x.lineWidth = 1; x.beginPath(); x.ellipse(30, 22, 2.5, 4, 0, 0, 7); x.stroke(); break;
      case 'hide': x.beginPath(); x.moveTo(10, 8); x.quadraticCurveTo(20, 4, 30, 8); x.lineTo(34, 16); x.lineTo(30, 22); x.lineTo(33, 32); x.quadraticCurveTo(20, 36, 7, 32); x.lineTo(10, 22); x.lineTo(6, 15); x.closePath(); fillStroke(grad(6, 0, 34, 0, lt, dk)); break;
      case 'cloth': x.beginPath(); x.rect(7, 12, 26, 18); fillStroke(grad(0, 12, 0, 30, lt, dk)); x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1; for (let k = 15; k < 30; k += 3) { x.beginPath(); x.moveTo(7, k); x.lineTo(33, k); x.stroke(); } break;
      case 'gem': x.beginPath(); x.moveTo(12, 12); x.lineTo(28, 12); x.lineTo(34, 18); x.lineTo(20, 34); x.lineTo(6, 18); x.closePath(); fillStroke(grad(6, 12, 34, 34, lt, dk));
        x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.moveTo(12, 12); x.lineTo(18, 12); x.lineTo(14, 18); x.lineTo(8, 18); x.closePath(); x.fill(); break;
      case 'herb': x.strokeStyle = '#3a7a2e'; x.lineWidth = 2; x.beginPath(); x.moveTo(20, 36); x.lineTo(20, 14); x.stroke();
        for (const [lx, ly, a] of [[14, 24, -0.6], [26, 20, 0.6], [15, 15, -0.5]]) { x.beginPath(); x.ellipse(lx, ly, 6, 3, a, 0, 7); fillStroke('#4a9a3a', 1); }
        x.beginPath(); x.arc(20, 10, 5, 0, 7); fillStroke(col, 1.2); break;
      case 'fish': x.beginPath(); x.ellipse(18, 20, 12, 7, 0, 0, 7); fillStroke(grad(0, 13, 0, 27, lt, dk)); x.beginPath(); x.moveTo(29, 20); x.lineTo(37, 13); x.lineTo(37, 27); x.closePath(); fillStroke(col);
        x.fillStyle = '#111'; x.beginPath(); x.arc(11, 18, 1.6, 0, 7); x.fill(); break;
      case 'cookedfish': x.beginPath(); x.ellipse(20, 26, 15, 6, 0, 0, 7); fillStroke('#e8e0d0'); x.beginPath(); x.ellipse(19, 21, 11, 6, 0, 0, 7); fillStroke(grad(0, 15, 0, 27, lt, dk));
        x.strokeStyle = 'rgba(60,30,10,0.6)'; x.lineWidth = 1; for (let k = 12; k < 28; k += 4) { x.beginPath(); x.moveTo(k, 17); x.lineTo(k + 3, 25); x.stroke(); } break;
      case 'meat': case 'cookedmeat': x.beginPath(); x.ellipse(18, 20, 11, 9, 0.4, 0, 7); fillStroke(grad(0, 11, 0, 29, lt, dk));
        x.strokeStyle = ol; x.lineWidth = 4; x.beginPath(); x.moveTo(26, 26); x.lineTo(34, 33); x.stroke(); x.strokeStyle = '#f0e8d8'; x.lineWidth = 2.5; x.stroke(); break;
      case 'potion': x.beginPath(); x.moveTo(16, 6); x.lineTo(24, 6); x.lineTo(24, 14); x.quadraticCurveTo(33, 18, 32, 27); x.quadraticCurveTo(30, 36, 20, 36); x.quadraticCurveTo(10, 36, 8, 27); x.quadraticCurveTo(7, 18, 16, 14); x.closePath(); fillStroke('rgba(220,235,255,0.55)');
        x.beginPath(); x.moveTo(9, 24); x.quadraticCurveTo(20, 21, 31, 24); x.quadraticCurveTo(30, 35, 20, 35); x.quadraticCurveTo(10, 35, 9, 24); x.closePath(); x.fillStyle = col; x.fill();
        x.fillStyle = '#8a5a30'; x.fillRect(15, 3, 10, 5); x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(12, 20, 2, 8); break;
      case 'bandage': x.beginPath(); x.ellipse(20, 22, 12, 10, 0, 0, 7); fillStroke('#efe8d8'); x.beginPath(); x.ellipse(20, 22, 5, 4, 0, 0, 7); fillStroke('#d8d0c0', 1);
        x.fillStyle = '#efe8d8'; x.fillRect(26, 26, 10, 6); break;
      case 'arrow': for (let k = 0; k < 3; k++) { x.save(); x.translate(12 + k * 6, 30); x.rotate(Math.PI / 4); x.strokeStyle = '#8a6a3a'; x.lineWidth = 1.8; x.beginPath(); x.moveTo(0, 6); x.lineTo(0, -22); x.stroke();
        x.fillStyle = '#b0b8c0'; x.beginPath(); x.moveTo(-3, -20); x.lineTo(0, -27); x.lineTo(3, -20); x.fill(); x.fillStyle = '#e8e0d0'; x.fillRect(-2.5, 2, 5, 5); x.restore(); } break;
      case 'cache': x.beginPath(); x.rect(6, 16, 28, 18); fillStroke(grad(0, 16, 0, 34, col, U.shade(col, -0.5)));
        x.beginPath(); x.moveTo(6, 16); x.quadraticCurveTo(20, 4, 34, 16); x.closePath(); fillStroke(lt);
        x.fillStyle = '#ffd94a'; x.fillRect(17, 18, 6, 8); x.fillRect(6, 22, 28, 2);
        x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.arc(30, 8, 2, 0, 7); x.fill(); break;
      case 'bone': x.strokeStyle = ol; x.lineWidth = 6; x.beginPath(); x.moveTo(10, 30); x.lineTo(30, 10); x.stroke(); x.strokeStyle = col; x.lineWidth = 4; x.stroke();
        for (const [bx, by] of [[9, 29], [11, 32], [29, 8], [32, 11]]) { x.beginPath(); x.arc(bx, by, 3.2, 0, 7); fillStroke(col, 1); } break;
      case 'gel': x.beginPath(); x.ellipse(20, 26, 12, 8, 0, 0, 7); fillStroke(U.rgba(col, 0.8)); x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(15, 23, 3, 2, -0.4, 0, 7); x.fill(); break;
      case 'trophy': x.beginPath(); x.moveTo(20, 4); x.lineTo(26, 16); x.lineTo(24, 34); x.lineTo(16, 34); x.lineTo(14, 16); x.closePath(); fillStroke(grad(14, 0, 26, 0, lt, dk));
        x.strokeStyle = '#ffd94a'; x.lineWidth = 1.5; x.beginPath(); x.arc(20, 20, 13, -0.5, Math.PI + 0.5, true); x.stroke(); break;
      case 'coins': for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(14 + (k % 2) * 10, 28 - k * 5, 9, 4.5, 0, 0, 7); fillStroke(grad(0, 20, 0, 34, '#ffe680', '#c89a20'), 1.2); } break;
      case 'horse': this.quad(x, 22, 34, MONSTERS.horse.look, { right: true, time: 0, scale: 0.9 }); break;
      case 'scroll': x.beginPath(); x.rect(10, 8, 20, 24); fillStroke('#efe2c0'); x.fillStyle = '#c8b080'; x.fillRect(8, 6, 24, 4); x.fillRect(8, 30, 24, 4);
        x.strokeStyle = 'rgba(80,50,20,0.6)'; x.lineWidth = 1; for (let k = 14; k < 28; k += 4) { x.beginPath(); x.moveTo(13, k); x.lineTo(27, k); x.stroke(); } break;
      case 'seal': x.beginPath(); x.arc(20, 20, 13, 0, 7); fillStroke(grad(8, 8, 32, 32, '#ffe680', '#b8861a')); x.fillStyle = '#7a4a10'; x.font = 'bold 14px serif'; x.textAlign = 'center'; x.fillText('B', 20, 25); break;
      default: x.beginPath(); x.arc(20, 20, 10, 0, 7); fillStroke(col);
    }
  },
  spellIcon(x, key, col) {
    const g = x.createRadialGradient(20, 20, 2, 20, 20, 19);
    g.addColorStop(0, U.shade(col, 0.5)); g.addColorStop(0.5, U.rgba(col, 0.5)); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 40, 40);
    x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 2;
    switch (key) {
      case 'spark': case 'chain': x.beginPath(); x.moveTo(23, 4); x.lineTo(13, 21); x.lineTo(20, 21); x.lineTo(15, 36); x.lineTo(28, 16); x.lineTo(21, 16); x.closePath(); x.fill(); break;
      case 'flame': x.beginPath(); x.moveTo(20, 4); x.quadraticCurveTo(32, 18, 27, 30); x.quadraticCurveTo(20, 38, 13, 30); x.quadraticCurveTo(8, 18, 20, 4); x.fill(); break;
      case 'frost': for (let a = 0; a < 6; a++) { x.beginPath(); x.moveTo(20, 20); x.lineTo(20 + Math.cos(a * 1.047) * 14, 20 + Math.sin(a * 1.047) * 14); x.stroke(); } break;
      case 'mend': case 'restore': x.fillRect(16, 8, 8, 24); x.fillRect(8, 16, 24, 8); break;
      case 'meteor': x.beginPath(); x.arc(24, 24, 8, 0, 7); x.fill(); x.lineWidth = 3; x.beginPath(); x.moveTo(18, 18); x.lineTo(6, 6); x.moveTo(22, 15); x.lineTo(14, 4); x.moveTo(15, 22); x.lineTo(4, 14); x.stroke(); break;
    }
  },
};
