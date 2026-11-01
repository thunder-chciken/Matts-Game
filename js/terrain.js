'use strict';
// =====================================================================
//  Painted terrain: seamless textures projected to isometric space,
//  drawn as one pattern fill per texture with soft blended borders.
//  Falls back to the procedural tiles when no terrain art is present.
// =====================================================================
const TERRAIN_TILES_PER_TEX = 3; // one texture repeat spans 3x3 tiles
const TERRAIN_KEYS = ['grass', 'grass2', 'forest', 'mud', 'flagstone', 'cobble', 'sand', 'swamp', 'rocky', 'planks', 'grave', 'ash', 'water', 'deepwater', 'earth', 'meadow'];
// draw order / priority: higher keys bleed over lower ones at borders
const TERRAIN_PRIORITY = { deepwater: 0, water: 1, sand: 2, swamp: 3, rocky: 4, grass: 5, grass2: 5, meadow: 5, forest: 6, earth: 7, mud: 7, grave: 7, ash: 7, cobble: 8, flagstone: 8, planks: 9 };

const Terrain = {
  ready: false, pat: {}, proj: {},

  load() {
    const keys = (typeof ART_MANIFEST !== 'undefined' && ART_MANIFEST.terrain) || [];
    if (!TERRAIN_KEYS.every((k) => keys.includes(k))) return;
    let left = TERRAIN_KEYS.length;
    for (const k of TERRAIN_KEYS) {
      const img = new Image();
      img.onload = () => { this.proj[k] = this.project(this.seamless(img)); if (--left === 0) this.finish(); };
      img.onerror = () => { left = -1; };
      img.src = 'assets/terrain/' + k + '.png';
    }
  },
  // Cross-fade each axis with a half-shifted copy so the texture wraps without seams
  seamless(img) {
    const S = Math.min(img.naturalWidth, img.naturalHeight, 512);
    const c = mkCanvas(S, S), x = c.getContext('2d');
    x.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, S, S);
    let a = x.getImageData(0, 0, S, S).data;
    const weight = (i) => { const t = Math.abs(i - S / 2) / (S / 2); const u = U.clamp((t - 0.5) / 0.5, 0, 1); return 1 - u * u * (3 - 2 * u); };
    const pass = (src, horizontal) => {
      const out = new Uint8ClampedArray(src.length), h = S >> 1;
      for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
        const w = weight(horizontal ? xx : y);
        const sx = horizontal ? (xx + h) % S : xx, sy = horizontal ? y : (y + h) % S;
        const i = (y * S + xx) * 4, j = (sy * S + sx) * 4;
        for (let ch = 0; ch < 3; ch++) out[i + ch] = src[i + ch] * w + src[j + ch] * (1 - w);
        out[i + 3] = 255;
      }
      return out;
    };
    a = pass(pass(a, true), false);
    x.putImageData(new ImageData(a, S, S), 0, 0);
    return c;
  },
  // Map the square texture onto the iso grid; the result tiles in screen space
  project(tex) {
    const S = tex.width, N = TERRAIN_TILES_PER_TEX, k = (32 * N) / S;
    const c = mkCanvas(64 * N, 32 * N), x = c.getContext('2d');
    x.setTransform(k, k / 2, -k, k / 2, 32 * N, 0);
    x.fillStyle = x.createPattern(tex, 'repeat');
    x.fillRect(-S * 3, -S * 3, S * 7, S * 7);
    return c;
  },
  finish() {
    // large soft dark blotches to break up repetition
    const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), P = 4;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u = (i / S) * P, v = (j / S) * P;
      const n = this.wrapNoise(u, v, P, 7) * 0.7 + this.wrapNoise(u * 2, v * 2, P, 8) * 0.3;
      const k = (j * S + i) * 4;
      img.data[k] = 8; img.data[k + 1] = 6; img.data[k + 2] = 4; img.data[k + 3] = U.clamp((n - 0.4) * 1.6, 0, 1) * 95;
    }
    x.putImageData(img, 0, 0);
    this.macro = c;
    this.buildKeys();
    this.ready = true;
  },
  wrapNoise(u, v, P, s) {
    const xi = Math.floor(u), yi = Math.floor(v), xf = u - xi, yf = v - yi;
    const h = (a, b) => hash2(((a % P) + P) % P, ((b % P) + P) % P, s), sm = (t) => t * t * (3 - 2 * t);
    const A = h(xi, yi), B = h(xi + 1, yi), C = h(xi, yi + 1), D = h(xi + 1, yi + 1), uu = sm(xf), vv = sm(yf);
    return A + (B - A) * uu + (C - A) * vv + (A - B - C + D) * uu * vv;
  },
  // Which texture each tile uses (variants chosen by low-frequency noise)
  buildKeys() {
    const W = World.W, H = World.H, idx = Object.fromEntries(TERRAIN_KEYS.map((k, i) => [k, i]));
    this.key = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const g = World.ground[y * W + x], n = fbm(x / 9, y / 9, 991, 3), n2 = fbm(x / 5, y / 5, 313, 2);
      let k;
      switch (g) {
        case G.DEEP: k = 'deepwater'; break;
        case G.WATER: k = 'water'; break;
        case G.SAND: k = 'sand'; break;
        case G.GRASS: k = n < 0.4 ? 'grass2' : n > 0.6 ? 'meadow' : 'grass'; break;
        case G.FOREST: k = n2 > 0.62 ? 'meadow' : 'forest'; break;
        case G.DIRT: k = World.townAt(x, y) >= 0 ? 'earth' : n2 > 0.6 ? 'earth' : 'mud'; break;
        case G.COBBLE: k = n2 > 0.58 ? 'cobble' : 'flagstone'; break;
        case G.SWAMP: k = 'swamp'; break;
        case G.ROCK: k = 'rocky'; break;
        case G.PLANK: k = 'planks'; break;
        case G.GRAVE: k = 'grave'; break;
        case G.ASH: k = 'ash'; break;
        default: k = 'grass';
      }
      this.key[y * W + x] = idx[k];
    }
  },
  pattern(ctx, k) {
    if (!this.pat[k]) this.pat[k] = ctx.createPattern(this.proj[k], 'repeat');
    return this.pat[k];
  },

  // Draw all visible ground. Called with the world transform active.
  draw(ctx, sMin, sMax, dMin, dMax, time) {
    const W = World.W, keys = this.key, nK = TERRAIN_KEYS.length;
    const bases = Array.from({ length: nK }, () => []);
    const fringes = Array.from({ length: nK }, () => []);
    const pr = TERRAIN_KEYS.map((k) => TERRAIN_PRIORITY[k]);
    const kAt = (x, y) => (x >= 0 && y >= 0 && x < W && y < World.H ? keys[y * W + x] : -1);
    for (let s = sMin; s <= sMax; s++) for (let d = dMin; d <= dMax; d++) {
      if ((s + d) & 1) continue;
      const x = (s + d) >> 1, y = (s - d) >> 1;
      if (!World.inb(x, y)) continue;
      const k = keys[y * W + x];
      bases[k].push(x, y);
      // neighbours across each diamond edge: N-E (y-1), E-S (x+1), S-W (y+1), W-N (x-1)
      const nb = [kAt(x, y - 1), kAt(x + 1, y), kAt(x, y + 1), kAt(x - 1, y)];
      for (let e = 0; e < 4; e++) {
        const o = nb[e];
        if (o >= 0 && o !== k && pr[o] > pr[k]) fringes[o].push(x, y, e);
      }
    }
    // base fills
    for (let k = 0; k < nK; k++) {
      const b = bases[k];
      if (!b.length) continue;
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 2) {
        const wx = (b[i] - b[i + 1]) * 32, wy = (b[i] + b[i + 1]) * 16;
        ctx.moveTo(wx, wy - 0.5); ctx.lineTo(wx + 32.6, wy + 16); ctx.lineTo(wx, wy + 32.5); ctx.lineTo(wx - 32.6, wy + 16); ctx.closePath();
      }
      this.fillTex(ctx, k, time);
    }
    // soft borders: three passes, wider and fainter
    for (const [ext, alpha] of [[5, 1], [10, 0.55], [16, 0.25]]) {
      ctx.globalAlpha = alpha;
      for (let k = 0; k < nK; k++) {
        const f = fringes[k];
        if (!f.length) continue;
        ctx.beginPath();
        for (let i = 0; i < f.length; i += 3) this.fringePath(ctx, f[i], f[i + 1], f[i + 2], ext);
        this.fillTex(ctx, k, time);
      }
    }
    ctx.globalAlpha = 1;
    // break up repetition with large soft dark patches
    const left = (dMin - 1) * 32, top = (sMin - 1) * 16;
    if (!this.macroPat) this.macroPat = ctx.createPattern(this.macro, 'repeat');
    this.macroPat.setTransform(new DOMMatrix().scale(2.2, 1.1));
    ctx.fillStyle = this.macroPat;
    ctx.fillRect(left, top, (dMax - dMin + 2) * 32, (sMax - sMin + 2) * 16);
  },
  fillTex(ctx, k, time) {
    const key = TERRAIN_KEYS[k], p = this.pattern(ctx, key);
    if (key === 'water' || key === 'deepwater') p.setTransform(new DOMMatrix().translate(time * 3, time * 1.5));
    ctx.fillStyle = p;
    ctx.fill();
  },
  // A wobbly strip along one diamond edge, reaching `ext` px into the tile
  fringePath(ctx, x, y, e, ext) {
    const wx = (x - y) * 32, wy = (x + y) * 16;
    const V = [[wx, wy], [wx + 32, wy + 16], [wx, wy + 32], [wx - 32, wy + 16]];
    const A = V[e], B = V[(e + 1) % 4], cx = wx, cy = wy + 16;
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    let nx = cx - mx, ny = cy - my; const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
    const steps = 6;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps, taper = Math.sin(t * Math.PI);
      const wob = 0.55 + hash2(x * 7 + i, y * 13 + e, 5) * 0.9;
      const px = A[0] + (B[0] - A[0]) * t, py = A[1] + (B[1] - A[1]) * t;
      ctx.lineTo(px + nx * ext * taper * wob * 1.6, py + ny * ext * taper * wob * 0.8 * 1.6);
    }
    ctx.closePath();
  },
};
