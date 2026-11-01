'use strict';
// =====================================================================
//  World generation: terrain, towns, roads, lairs, resources
// =====================================================================
const G = { DEEP: 0, WATER: 1, SAND: 2, GRASS: 3, DIRT: 4, COBBLE: 5, FOREST: 6, SWAMP: 7, ROCK: 8, PLANK: 9, GRAVE: 10, ASH: 11 };
const GROUND = [
  { name: 'Deep Water', color: '#122c40', walk: false, water: true },
  { name: 'Water', color: '#1f4a62', walk: false, water: true },
  { name: 'Sand', color: '#9c8a62', walk: true },
  { name: 'Grass', color: '#43602f', walk: true },
  { name: 'Dirt Road', color: '#6a5236', walk: true },
  { name: 'Cobblestone', color: '#69645c', walk: true },
  { name: 'Forest Floor', color: '#2f4824', walk: true },
  { name: 'Swamp', color: '#38422a', walk: true },
  { name: 'Rocky Ground', color: '#5c554c', walk: true },
  { name: 'Planks', color: '#5c4630', walk: true },
  { name: 'Grave Soil', color: '#383029', walk: true },
  { name: 'Ash', color: '#2a2321', walk: true },
];

// ---------- Generic A* ----------
const Path = {
  gen: 0,
  init(N) {
    this.g = new Float32Array(N); this.came = new Int32Array(N);
    this.stamp = new Int32Array(N); this.closed = new Int32Array(N);
  },
  // cost(x,y) -> step cost or Infinity. Returns [[x,y],...] excluding start, or null.
  find(sx, sy, tx, ty, cost, maxNodes = 5000, near = 0, partial = false) {
    const W = World.W, H = World.H;
    const gen = ++this.gen, g = this.g, came = this.came, stamp = this.stamp, closed = this.closed;
    const hI = [], hF = [];
    const push = (i, f) => {
      let n = hI.length; hI.push(i); hF.push(f);
      while (n > 0) { const p = (n - 1) >> 1; if (hF[p] <= f) break; hI[n] = hI[p]; hF[n] = hF[p]; n = p; }
      hI[n] = i; hF[n] = f;
    };
    const pop = () => {
      const top = hI[0], li = hI.pop(), lf = hF.pop();
      if (hI.length) {
        let n = 0; const len = hI.length;
        while (true) {
          let c = 2 * n + 1; if (c >= len) break;
          if (c + 1 < len && hF[c + 1] < hF[c]) c++;
          if (hF[c] >= lf) break;
          hI[n] = hI[c]; hF[n] = hF[c]; n = c;
        }
        hI[n] = li; hF[n] = lf;
      }
      return top;
    };
    const heur = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const s = sy * W + sx;
    stamp[s] = gen; g[s] = 0; came[s] = -1;
    push(s, heur(sx, sy));
    let expanded = 0, best = s, bestH = heur(sx, sy), goal = -1;
    while (hI.length && expanded < maxNodes) {
      const cur = pop();
      if (closed[cur] === gen) continue;
      closed[cur] = gen; expanded++;
      const cx = cur % W, cy = (cur / W) | 0;
      const hh = heur(cx, cy);
      if (hh < bestH) { bestH = hh; best = cur; }
      if ((near === 0 && cx === tx && cy === ty) || (near > 0 && Math.max(Math.abs(cx - tx), Math.abs(cy - ty)) <= near)) { goal = cur; break; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (closed[ni] === gen) continue;
        let c = cost(nx, ny);
        if (c === Infinity) continue;
        if (dx && dy) {
          if (cost(cx + dx, cy) === Infinity || cost(cx, cy + dy) === Infinity) continue;
          c *= 1.414;
        }
        const ng = g[cur] + c;
        if (stamp[ni] !== gen || ng < g[ni]) {
          stamp[ni] = gen; g[ni] = ng; came[ni] = cur;
          push(ni, ng + heur(nx, ny));
        }
      }
    }
    if (goal < 0) { if (!partial || best === s) return null; goal = best; }
    const out = [];
    for (let c = goal; c !== s && c >= 0; c = came[c]) out.push([c % W, (c / W) | 0]);
    out.reverse();
    return out;
  },
};

const World = {
  W: 192, H: 192,
  idx(x, y) { return y * this.W + x; },
  inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; },
  objAt(x, y) { return this.inb(x, y) ? this.obj[y * this.W + x] : null; },
  groundAt(x, y) { return this.inb(x, y) ? this.ground[y * this.W + x] : G.DEEP; },
  isWater(x, y) { return GROUND[this.groundAt(x, y)].water; },
  walkable(x, y) { return this.inb(x, y) && this.walk[y * this.W + x] === 1; },
  townAt(x, y) { return this.inb(x, y) ? this.town[y * this.W + x] - 1 : -1; },
  setObj(x, y, o) { const i = this.idx(x, y); this.obj[i] = o; this.walk[i] = GROUND[this.ground[i]].walk && (!o || o.walk) ? 1 : 0; },
  refreshWalk(x, y) { this.setObj(x, y, this.obj[this.idx(x, y)]); },
  cornerH(x, y) { return this.corner[y * (this.W + 1) + x]; },

  gen(seed = WORLD_SEED) {
    const W = this.W, H = this.H, N = W * H;
    this.ground = new Uint8Array(N); this.obj = new Array(N).fill(null);
    this.walk = new Uint8Array(N); this.occ = new Int32Array(N); this.town = new Uint8Array(N);
    this.rockH = new Float32Array(N); this.corner = new Float32Array((W + 1) * (H + 1));
    this.buildings = []; this.stations = []; this.npcSpawns = []; this.lights = []; this.shrines = []; this.boards = [];
    this.nodes = new Map(); this.decorMobs = [];
    Path.init(N);
    const elev = new Float32Array(N), moist = new Float32Array(N);

    // ---- 1. Height & moisture ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let e = fbm(x / 38, y / 38, seed, 5);
      const north = U.clamp((44 - y) / 30, 0, 1);
      e += north * 0.36 * (0.55 + 0.9 * vnoise(x / 13, y / 13, seed + 5));
      const coast = 168 + (vnoise(0, y / 18, seed + 9) - 0.5) * 16;
      if (x > coast - 14) e -= U.clamp((x - (coast - 14)) / 14, 0, 1) * 0.8;
      const edgeW = U.clamp((10 - x) / 10, 0, 1), edgeS = U.clamp((y - (H - 11)) / 10, 0, 1);
      e -= Math.max(edgeW, edgeS) * 0.6;
      if (y < 4) e += 0.4;
      // a mountain range in the south-east
      e += Math.max(0, 1 - U.dist(x, y, 120, 168) / 22) * 0.28 * vnoise(x / 9, y / 9, seed + 11);
      elev[y * W + x] = e;
      moist[y * W + x] = fbm(x / 28 + 100, y / 28, seed + 3, 4);
    }
    // ---- 2. Base ground ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, e = elev[i], m = moist[i];
      let g;
      if (e < 0.28) g = G.DEEP;
      else if (e < 0.33) g = G.WATER;
      else if (e < 0.355) g = G.SAND;
      else if (e > 0.7) g = G.ROCK;
      else {
        const swampF = U.clamp((y - 112) / 30, 0, 1) * U.clamp((88 - x) / 30, 0, 1);
        if (swampF > 0.25 && m > 0.42) g = G.SWAMP;
        else if (m > 0.56) g = G.FOREST;
        else g = G.GRASS;
      }
      this.ground[i] = g;
      if (g === G.ROCK) this.rockH[i] = Math.min(95, 16 + (e - 0.7) * 280);
    }
    // ---- 3. Towns ----
    TOWNS.forEach((t, ti) => this.buildTown(t, ti, seed));
    // ---- 4. Boss lairs ----
    this.buildCrypt(BOSS_LAIRS[0]);
    this.buildRoost(BOSS_LAIRS[1]);
    // ---- 5. Roads ----
    const T = TOWNS;
    this.road(T[0].x - 21, T[0].y, T[1].x + 21, T[1].y);
    this.road(T[0].x, T[0].y - 21, T[1].x, T[1].y + 21);
    this.road(T[0].x + 21, T[0].y, T[2].x - 21, T[2].y);
    this.road(T[0].x, T[0].y + 21, BOSS_LAIRS[0].x + 6, BOSS_LAIRS[0].y - 6);
    this.road(T[1].x + 21, T[1].y, BOSS_LAIRS[1].x - 6, BOSS_LAIRS[1].y + 4);
    this.road(T[2].x, T[2].y - 21, T[2].x - 4, 60);
    // ---- 6. Rocks become mountain columns ----
    for (let i = 0; i < N; i++) if (this.ground[i] === G.ROCK && this.rockH[i] > 0 && !this.obj[i]) this.obj[i] = { t: 'rock' };
    // ---- 7. Vegetation & resources ----
    const rnd = mulberry32(seed + 77);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (this.obj[i] || this.town[i]) continue;
      const g = this.ground[i], r = rnd(), dens = vnoise(x / 6, y / 6, seed + 21);
      const nearRock = this.neighborRock(x, y);
      if (g === G.FOREST) {
        if (r < 0.3 * dens + 0.08) this.obj[i] = { t: 'tree', kind: (y < 75 || rnd() < 0.35) ? 'pine' : 'oak', v: (rnd() * 8) | 0 };
        else if (r < 0.43 * dens + 0.1 && rnd() < 0.12) this.obj[i] = this.bush(y < 80 && rnd() < 0.4 ? 'frostcap' : 'moonpetal');
        else if (rnd() < 0.06) this.obj[i] = { t: 'decor', kind: rnd() < 0.5 ? 'mushroom' : 'fern', v: (rnd() * 4) | 0, walk: true };
      } else if (g === G.GRASS) {
        if (nearRock && r < 0.09) this.obj[i] = { t: 'boulder', v: (rnd() * 4) | 0 };
        else if (r < 0.028) this.obj[i] = { t: 'tree', kind: y < 70 ? 'pine' : 'oak', v: (rnd() * 8) | 0 };
        else if (r < 0.038) this.obj[i] = this.bush(y < 80 && rnd() < 0.3 ? 'frostcap' : nearRock ? 'emberroot' : 'sunleaf');
        else if (r < 0.04) this.obj[i] = { t: 'boulder', v: (rnd() * 4) | 0 };
        else if (r < 0.1) this.obj[i] = { t: 'decor', kind: rnd() < 0.5 ? 'flowers' : 'tuft', v: (rnd() * 6) | 0, walk: true };
      } else if (g === G.SWAMP) {
        if (r < 0.06) this.obj[i] = { t: 'tree', kind: 'dead', v: (rnd() * 8) | 0 };
        else if (r < 0.075) this.obj[i] = this.bush(rnd() < 0.55 ? 'ghostbloom' : 'moonpetal');
        else if (r < 0.15) this.obj[i] = { t: 'decor', kind: rnd() < 0.6 ? 'reeds' : 'mushroom', v: (rnd() * 4) | 0, walk: true };
      } else if (g === G.SAND) {
        if (r < 0.012) this.obj[i] = this.bush('emberroot');
        else if (r < 0.03) this.obj[i] = { t: 'decor', kind: 'shell', v: (rnd() * 4) | 0, walk: true };
      } else if (g === G.GRAVE) {
        if (r < 0.05) this.obj[i] = { t: 'decor', kind: 'bones', v: (rnd() * 4) | 0, walk: true };
      }
    }
    // ---- 8. Corner heights for mountains ----
    for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
      let s = 0, c = 0;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const tx = x + dx, ty = y + dy;
        if (!this.inb(tx, ty)) continue;
        const o = this.obj[ty * W + tx];
        s += o && o.t === 'rock' ? this.rockH[ty * W + tx] : 0; c++;
      }
      this.corner[y * (W + 1) + x] = c ? s / c : 0;
    }
    // ---- 9. Walkability ----
    for (let i = 0; i < N; i++) { const o = this.obj[i]; this.walk[i] = GROUND[this.ground[i]].walk && (!o || o.walk) ? 1 : 0; }
    this.buildMinimap();
  },

  neighborRock(x, y) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const g = this.groundAt(x + dx, y + dy);
      if (g === G.ROCK && this.rockH[this.idx(x + dx, y + dy)] > 0) return true;
    }
    return false;
  },
  bush(herb) { return { t: 'bush', herb, v: (Math.random() * 4) | 0 }; },

  clearArea(x0, y0, x1, y1, g) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!this.inb(x, y)) continue;
      const i = this.idx(x, y);
      this.ground[i] = g; this.obj[i] = null; this.rockH[i] = 0;
    }
  },

  addBuilding(b) {
    b.idx = this.buildings.length;
    this.buildings.push(b);
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) this.obj[this.idx(x, y)] = { t: 'bldg', b: b.idx };
    return b;
  },
  place(x, y, o) { if (this.inb(x, y)) { const i = this.idx(x, y); this.obj[i] = o; } },

  buildTown(t, ti, seed) {
    const cx = t.x, cy = t.y, R = 21;
    t.index = ti;
    this.clearArea(cx - R, cy - R, cx + R, cy + R, G.GRASS);
    for (let y = cy - R - 3; y <= cy + R + 3; y++) for (let x = cx - R - 3; x <= cx + R + 3; x++) if (this.inb(x, y)) this.town[this.idx(x, y)] = ti + 1;
    if (t.docks) {
      // carve the sea to the east
      for (let y = cy - R - 4; y <= cy + R + 4; y++) for (let x = cx + 17; x < this.W; x++) {
        if (!this.inb(x, y)) continue;
        const i = this.idx(x, y);
        this.ground[i] = x <= cx + 19 ? G.SAND : x < cx + 24 ? G.WATER : G.DEEP;
        this.obj[i] = null; this.rockH[i] = 0;
      }
      for (let x = cx + 17; x <= cx + 32; x++) for (let y = cy; y <= cy + 1; y++) this.ground[this.idx(x, y)] = G.PLANK;
      for (let y = cy - 4; y <= cy + 5; y++) for (let x = cx + 29; x <= cx + 32; x++) this.ground[this.idx(x, y)] = G.PLANK;
      this.place(cx + 32, cy - 4, { t: 'decor', kind: 'post' });
      this.place(cx + 32, cy + 5, { t: 'decor', kind: 'post' });
      this.lights.push({ x: cx + 31, y: cy - 3, r: 5, c: '#ffd890' });
      this.npcSpawns.push({ role: 'collector', x: cx + 30, y: cy + 1, town: ti });
    }
    // streets & plaza
    for (let d = -R; d <= R; d++) for (let w = -1; w <= 1; w++) {
      if (!(t.docks && d > 16)) this.ground[this.idx(cx + d, cy + w)] = G.COBBLE;
      this.ground[this.idx(cx + w, cy + d)] = G.COBBLE;
    }
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) this.ground[this.idx(cx + x, cy + y)] = G.COBBLE;
    // buildings in six slots, doors face the streets
    const slots = [
      { x0: -13, y0: -8, x1: -9, y1: -4, side: 'y', at: -11, nx: -11, ny: -3 },
      { x0: -8, y0: -17, x1: -4, y1: -13, side: 'x', at: -15, nx: -3, ny: -15 },
      { x0: 5, y0: -8, x1: 9, y1: -4, side: 'y', at: 7, nx: 7, ny: -3 },
      { x0: 13, y0: -8, x1: 17, y1: -4, side: 'y', at: 15, nx: 15, ny: -3 },
      { x0: -8, y0: 4, x1: -4, y1: 8, side: 'x', at: 6, nx: -3, ny: 6 },
      { x0: -8, y0: 12, x1: -4, y1: 16, side: 'x', at: 14, nx: -3, ny: 14 },
    ];
    const rnd = mulberry32(seed + ti * 101);
    t.roles.forEach((role, i) => {
      const s = slots[i];
      const v = VENDORS[role];
      this.addBuilding({
        x0: cx + s.x0, y0: cy + s.y0, x1: cx + s.x1, y1: cy + s.y1,
        h: 30 + ((rnd() * 8) | 0), ridge: 16 + ((rnd() * 8) | 0),
        roof: role === 'banker' ? '#6a5a2a' : U.shade(t.roof, (rnd() - 0.5) * 0.3), wall: t.wall,
        door: { side: s.side, at: s.side === 'y' ? cx + s.at : cy + s.at }, sign: v.icon, signColor: v.color, role, town: ti,
      });
      this.npcSpawns.push({ role, x: cx + s.nx, y: cy + s.ny, town: ti });
      // crates & barrels beside shops
      if (rnd() < 0.8) this.place(cx + s.x1 + (s.side === 'y' ? 1 : 0), cy + s.y1 + (s.side === 'x' ? 1 : 0), { t: 'decor', kind: rnd() < 0.5 ? 'crate' : 'barrel' });
    });
    if (t.forge) { this.place(cx + 10, cy - 3, { t: 'forge' }); this.stations.push({ t: 'forge', x: cx + 10, y: cy - 3 }); this.lights.push({ x: cx + 10, y: cy - 3, r: 6, c: '#ff9a40' }); }
    if (t.anvil) { this.place(cx + 11, cy - 3, { t: 'anvil' }); this.stations.push({ t: 'anvil', x: cx + 11, y: cy - 3 }); }
    this.place(cx - 7, cy - 3, { t: 'oven' }); this.stations.push({ t: 'oven', x: cx - 7, y: cy - 3 });
    this.lights.push({ x: cx - 7, y: cy - 3, r: 4, c: '#ff9a40' });
    this.place(cx + 3, cy + 3, { t: 'board' }); this.boards.push({ x: cx + 3, y: cy + 3, town: ti });
    this.place(cx - 3, cy + 3, { t: 'shrine' }); this.shrines.push({ x: cx - 3, y: cy + 2, town: ti });
    this.lights.push({ x: cx - 3, y: cy + 3, r: 4, c: '#9ad8ff' });
    this.place(cx + 3, cy - 3, { t: 'well' });
    for (const [lx, ly] of [[-5, -2], [5, -2], [-5, 2], [5, 2], [-17, -2], [11, 2], [17, -2], [-2, -11], [2, 11], [-2, 18], [2, -18], [-17, 2]]) {
      const i = this.idx(cx + lx, cy + ly);
      if (!this.obj[i]) { this.obj[i] = { t: 'lamp' }; this.lights.push({ x: cx + lx, y: cy + ly, r: 5, c: '#ffd890' }); }
    }
    // stable paddock (south-east quadrant)
    const px0 = cx + 6, py0 = cy + 5, px1 = cx + 14, py1 = cy + 12;
    for (let x = px0; x <= px1; x++) for (let y = py0; y <= py1; y++) {
      const edge = x === px0 || x === px1 || y === py0 || y === py1;
      if (edge && !(x === px0 && (y === cy + 8 || y === cy + 9))) this.place(x, y, { t: 'fence', h: y === py0 || y === py1 ? 'x' : 'y' });
      else this.ground[this.idx(x, y)] = G.DIRT;
    }
    this.place(px0 + 3, py0 + 2, { t: 'decor', kind: 'hay' });
    this.decorMobs.push({ mon: 'horse', x: px0 + 4, y: py0 + 4 }, { mon: 'horse', x: px0 + 6, y: py0 + 3 });
    this.npcSpawns.push({ role: 'stable', x: cx + 4, y: cy + 8, town: ti });
    // decorative trees and flowers inside town
    for (let k = 0; k < 40; k++) {
      const x = cx + ((rnd() * 2 - 1) * (R - 1)) | 0, y = cy + ((rnd() * 2 - 1) * (R - 1)) | 0;
      const i = this.idx(x, y);
      if (this.obj[i] || this.ground[i] !== G.GRASS) continue;
      if (Math.abs(x - cx) < 3 || Math.abs(y - cy) < 3) continue;
      this.obj[i] = rnd() < 0.3 ? { t: 'tree', kind: 'oak', v: (rnd() * 8) | 0, deco: true } : { t: 'decor', kind: 'flowers', v: (rnd() * 6) | 0, walk: true };
    }
  },

  buildCrypt(L) {
    const { x, y } = L;
    this.clearArea(x - 10, y - 10, x + 10, y + 10, G.GRAVE);
    this.addBuilding({ x0: x - 4, y0: y - 9, x1: x + 2, y1: y - 5, h: 36, ridge: 12, roof: '#2a2440', wall: 'crypt', door: { side: 'y', at: x - 1 }, sign: null });
    for (let k = 0; k < 30; k++) {
      const tx = x + U.randi(-9, 9), ty = y + U.randi(-4, 9);
      const i = this.idx(tx, ty);
      if (!this.obj[i] && U.dist(tx, ty, x, y) > 2.5) this.obj[i] = { t: 'tomb', v: k % 4 };
    }
    for (let k = 0; k < 8; k++) {
      const tx = x + U.randi(-10, 10), ty = y + U.randi(-10, 10), i = this.idx(tx, ty);
      if (!this.obj[i] && U.dist(tx, ty, x, y) > 4) this.obj[i] = { t: 'tree', kind: 'dead', v: k };
    }
    this.lights.push({ x: x - 4, y: y - 4, r: 4, c: '#8fe3ff' }, { x: x + 2, y: y - 4, r: 4, c: '#8fe3ff' });
    this.place(x - 4, y - 4, { t: 'decor', kind: 'brazier' });
    this.place(x + 2, y - 4, { t: 'decor', kind: 'brazier' });
  },
  buildRoost(L) {
    const { x, y } = L;
    for (let ty = y - 9; ty <= y + 9; ty++) for (let tx = x - 9; tx <= x + 9; tx++) {
      if (!this.inb(tx, ty) || U.dist(tx, ty, x, y) > 9.2) continue;
      const i = this.idx(tx, ty);
      this.ground[i] = G.ASH; this.obj[i] = null; this.rockH[i] = 0;
      if (U.chance(0.06) && U.dist(tx, ty, x, y) > 3) this.obj[i] = { t: 'decor', kind: 'bones', v: (Math.random() * 4) | 0, walk: true };
    }
    this.lights.push({ x, y, r: 7, c: '#ff6a2a' });
  },

  road(x0, y0, x1, y1) {
    const cost = (x, y) => {
      const i = this.idx(x, y), g = this.ground[i];
      if (g === G.DEEP || g === G.WATER) return Infinity;
      if (this.obj[i] && this.obj[i].t === 'bldg') return Infinity;
      if (g === G.ROCK) return 7;
      if (g === G.DIRT || g === G.COBBLE) return 0.5;
      if (g === G.FOREST || g === G.SWAMP) return 1.6;
      return 1;
    };
    const p = Path.find(x0, y0, x1, y1, cost, 60000);
    if (!p) return;
    for (const [x, y] of [[x0, y0], ...p]) {
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) {
        const tx = x + dx, ty = y + dy;
        if (!this.inb(tx, ty)) continue;
        const i = this.idx(tx, ty);
        if (this.town[i] && this.ground[i] === G.COBBLE) continue;
        const o = this.obj[i];
        if (o && (o.t === 'bldg' || o.t === 'fence' || o.t === 'forge' || o.t === 'anvil' || o.t === 'oven' || o.t === 'board' || o.t === 'shrine' || o.t === 'well' || o.t === 'lamp' || o.t === 'tomb')) continue;
        if (this.ground[i] === G.DEEP || this.ground[i] === G.WATER || this.ground[i] === G.PLANK) continue;
        this.ground[i] = this.ground[i] === G.ROCK ? G.ROCK : G.DIRT;
        this.rockH[i] = 0; this.obj[i] = null;
      }
    }
  },

  // Zone tier for spawns & treasure: distance from the nearest town
  zoneTier(x, y) {
    let d = 1e9;
    for (const t of TOWNS) d = Math.min(d, U.dist(x, y, t.x, t.y));
    for (const L of BOSS_LAIRS) if (U.dist(x, y, L.x, L.y) < 26) return 3;
    return d < 34 ? 0 : d < 52 ? 1 : d < 72 ? 2 : 3;
  },
  biome(x, y) {
    const g = this.groundAt(x, y);
    if (g === G.FOREST) return 'forest';
    if (g === G.SWAMP || g === G.GRAVE) return 'swamp';
    if (g === G.ROCK || g === G.ASH || this.neighborRock(x, y)) return 'mountain';
    if (g === G.SAND) return 'beach';
    return 'plains';
  },
  nearestTown(x, y) {
    let best = TOWNS[0], bd = 1e9;
    for (const t of TOWNS) { const d = U.dist(x, y, t.x, t.y); if (d < bd) { bd = d; best = t; } }
    return best;
  },
  nearStation(type, x, y, r = 2) {
    return this.stations.some((s) => (type === 'heat' ? s.t === 'forge' || s.t === 'oven' : s.t === type) && U.cheb(s.x, s.y, x, y) <= r);
  },

  buildMinimap() {
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(this.W, this.H);
    for (let i = 0; i < this.W * this.H; i++) {
      const o = this.obj[i];
      let col = GROUND[this.ground[i]].color;
      if (o) {
        if (o.t === 'rock') col = U.shade('#8a8278', Math.min(0.5, this.rockH[i] / 160));
        else if (o.t === 'tree') col = o.kind === 'dead' ? '#4a4030' : '#2e5a22';
        else if (o.t === 'bldg') col = '#b05a3a';
      }
      const [r, g, b] = U.hexToRgb(col);
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.mini = c;
  },

  // Find a walkable tile near (x,y)
  findWalkableNear(x, y, maxR = 8, avoidOcc = true) {
    for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = x + dx, ty = y + dy;
      if (this.walkable(tx, ty) && (!avoidOcc || !this.occ[this.idx(tx, ty)])) return [tx, ty];
    }
    return null;
  },
};
