'use strict';
// =====================================================================
//  Isometric renderer
//  World pixel space: tile (x,y) top vertex at ((x-y)*32, (x+y)*16)
// =====================================================================
const WALL_COLORS = { timber: '#bfae8e', stone: '#7c776e', wood: '#7a5a38', crypt: '#3e3a4c' };

const Render = {
  zoom: 2.0, cam: { x: 0, y: 0 }, picks: [],
  init(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.light = mkCanvas(10, 10); this.lctx = this.light.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * this.dpr; this.canvas.height = this.H * this.dpr;
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.light.width = Math.ceil(this.W / 2); this.light.height = Math.ceil(this.H / 2);
  },
  proj(x, y) { return [(x - y) * 32, (x + y) * 16]; },
  // entity feet point (tile center) in world px
  feet(ex, ey) { return [(ex - ey) * 32, (ex + ey) * 16 + 16]; },
  screenToWorld(sx, sy) { return [(sx - this.W / 2) / this.zoom + this.cam.x, (sy - this.H / 2) / this.zoom + this.cam.y]; },
  worldToScreen(wx, wy) { return [(wx - this.cam.x) * this.zoom + this.W / 2, (wy - this.cam.y) * this.zoom + this.H / 2]; },
  worldToTile(wx, wy) { return [Math.floor((wx / 32 + wy / 16) / 2), Math.floor((wy / 16 - wx / 32) / 2)]; },
  screenToTile(sx, sy) { const [wx, wy] = this.screenToWorld(sx, sy); return this.worldToTile(wx, wy); },

  visPos(e) { return e.mt >= 1 ? [e.x, e.y] : [U.lerp(e.fx, e.x, e.mt), U.lerp(e.fy, e.y, e.mt)]; },

  draw(time) {
    const ctx = this.ctx, P = Game.player;
    const [vx, vy] = this.visPos(P);
    const [fx, fy] = this.feet(vx, vy);
    this.cam.x = fx; this.cam.y = fy - 20;
    const z = this.zoom, dpr = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b1420'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (this.W / 2 - this.cam.x * z), dpr * (this.H / 2 - this.cam.y * z));
    ctx.imageSmoothingEnabled = true;
    const left = this.cam.x - this.W / 2 / z, right = this.cam.x + this.W / 2 / z;
    const top = this.cam.y - this.H / 2 / z, bottom = this.cam.y + this.H / 2 / z;
    const dMin = Math.floor(left / 32) - 2, dMax = Math.ceil(right / 32) + 2;
    const sMin = Math.floor(top / 16) - 2, sMax = Math.ceil(bottom / 16) + 2;
    const W = World.W;
    this.picks.length = 0;
    // ---- ground ----
    if (Terrain.ready) Terrain.draw(ctx, sMin, sMax, dMin, dMax, time);
    else for (let s = sMin; s <= sMax; s++) {
      for (let d = dMin; d <= dMax; d++) {
        if ((s + d) & 1) continue;
        const x = (s + d) >> 1, y = (s - d) >> 1;
        if (!World.inb(x, y)) continue;
        const i = y * W + x, g = World.ground[i];
        const h = hash2(x, y, 3);
        const vars = Sprites.tiles[g][(h * 4) | 0];
        const img = vars.length > 1 ? vars[((time * 3 + h * 8) | 0) % vars.length] : vars[0];
        ctx.drawImage(img, d * 32 - 33, s * 16 - 1);
      }
    }
    if (!Terrain.ready) this.drawShores(sMin, sMax, dMin, dMax);
    // hover tile
    if (Game.hoverTile && !Game.hoverPick) {
      const [hx, hy] = Game.hoverTile;
      this.diamond(hx, hy, 'rgba(255,255,255,0.22)');
    }
    if (P.pathGoal) this.diamond(P.pathGoal[0], P.pathGoal[1], 'rgba(255,230,120,0.35)');
    // ---- bucket entities by diagonal ----
    const buckets = new Map(), flats = new Map();
    const add = (map, s, v) => { let a = map.get(s); if (!a) map.set(s, a = []); a.push(v); };
    for (const e of Game.ents) {
      if (e.hidden) continue;
      const key = e.mt >= 1 ? e.x + e.y : Math.max(e.fx + e.fy, e.x + e.y);
      if (key < sMin - 2 || key > sMax + 12) continue;
      add(buckets, key, e);
    }
    for (const c of Game.corpses) add(flats, c.x + c.y, c);
    for (const c of Game.chests) add(flats, c.x + c.y, c);
    // ---- objects & entities in depth order ----
    const ps = Math.round(vx + vy);
    const night = Game.night;
    // objects in front of the player that visually cover them become see-through
    const covers = (o, x, y) => {
      if (o.t !== 'tree' && o.t !== 'rock' && o.t !== 'bldg') return false;
      const [ox, oy] = this.proj(x, y), cy = oy + 16;
      const h = o.t === 'tree' ? 140 : o.t === 'rock' ? World.rockH[y * W + x] + 10 : 60;
      return Math.abs(ox - fx) < (o.t === 'tree' ? 58 : 36) && fy - 10 > cy - h && fy - 40 < cy + 16;
    };
    for (let s = sMin; s <= sMax + 12; s++) {
      const fl = flats.get(s);
      if (fl) for (const f of fl) f.isChest ? this.drawChest(f, time) : this.drawCorpse(f, time);
      for (let d = dMin; d <= dMax; d++) {
        if ((s + d) & 1) continue;
        const x = (s + d) >> 1, y = (s - d) >> 1;
        if (!World.inb(x, y)) continue;
        const o = World.obj[y * W + x];
        if (!o) continue;
        let alpha = 1;
        if (s > ps && s - ps <= 8 && covers(o, x, y)) alpha = 0.4;
        this.drawObj(o, x, y, time, alpha, night);
      }
      const b = buckets.get(s);
      if (b) for (const e of b) this.drawEntity(e, time);
    }
    // ---- effects ----
    this.drawEffects(time);
    // ---- overhead text (names, hp bars, speech) ----
    for (const e of Game.ents) if (!e.hidden) this.drawOverhead(e);
    // ---- night lighting ----
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawAtmosphere(night, time);
  },

  diamond(x, y, col) {
    const ctx = this.ctx, [wx, wy] = this.proj(x, y);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 32, wy + 16); ctx.lineTo(wx, wy + 32); ctx.lineTo(wx - 32, wy + 16); ctx.closePath(); ctx.fill();
  },
  drawShores(sMin, sMax, dMin, dMax) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(235,245,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let s = sMin; s <= sMax; s++) for (let d = dMin; d <= dMax; d++) {
      if ((s + d) & 1) continue;
      const x = (s + d) >> 1, y = (s - d) >> 1;
      if (!World.inb(x, y) || !World.isWater(x, y)) continue;
      const [wx, wy] = this.proj(x, y);
      if (!World.isWater(x, y - 1)) { ctx.moveTo(wx, wy + 1); ctx.lineTo(wx + 31, wy + 16); }
      if (!World.isWater(x - 1, y)) { ctx.moveTo(wx, wy + 1); ctx.lineTo(wx - 31, wy + 16); }
      if (!World.isWater(x + 1, y)) { ctx.moveTo(wx + 31, wy + 16); ctx.lineTo(wx, wy + 31); }
      if (!World.isWater(x, y + 1)) { ctx.moveTo(wx - 31, wy + 16); ctx.lineTo(wx, wy + 31); }
    }
    ctx.stroke();
  },
  pick(x0, y0, x1, y1, kind, ref, tx, ty) { this.picks.push({ x0, y0, x1, y1, kind, ref, tx, ty }); },

  // ---------- Objects ----------
  drawObj(o, x, y, time, alpha, night) {
    const ctx = this.ctx;
    const [wx, wy] = this.proj(x, y), cx = wx, cy = wy + 16;
    if (alpha < 1) ctx.globalAlpha = alpha;
    switch (o.t) {
      case 'rock': this.drawRock(x, y); break;
      case 'bldg': this.drawBuildingTile(World.buildings[o.b], x, y, night); break;
      case 'tree': {
        const depleted = World.nodes.get(x + ',' + y);
        if (depleted && depleted.left <= 0) ctx.globalAlpha *= 0.55;
        const pt = Sprites.paintedTree(o.kind, x, y);
        if (pt) {
          const [im, th] = pt, s = th / im.naturalHeight, tw = im.naturalWidth * s;
          ctx.fillStyle = 'rgba(0,0,0,0.32)';
          ctx.beginPath(); ctx.ellipse(cx + 8, cy + 4, tw * 0.36, tw * 0.13, 0, 0, 7); ctx.fill();
          ctx.save(); ctx.translate(cx, cy + 6);
          ctx.rotate(Math.sin(time * 0.8 + hash2(x, y, 80) * 6.28) * 0.012);
          if (hash2(x, y, 81) < 0.5) ctx.scale(-1, 1);
          ctx.drawImage(im, -tw / 2, -th, tw, th);
          ctx.restore();
          this.pick(cx - tw * 0.3, cy - th, cx + tw * 0.3, cy + 4, 'obj', o, x, y);
        } else {
          const t = Sprites.tree(o.kind, o.v);
          ctx.drawImage(t.c, cx - t.ax, cy - t.ay);
          this.pick(cx - 22, cy - 90, cx + 22, cy, 'obj', o, x, y);
        }
        break;
      }
      case 'boulder': {
        const n = World.nodes.get(x + ',' + y), dep = n && n.left <= 0;
        const s = Sprites.boulder(o.v, dep); ctx.drawImage(s.c, cx - s.ax, cy - s.ay);
        this.pick(cx - 16, cy - 22, cx + 16, cy + 4, 'obj', o, x, y);
        break;
      }
      case 'bush': {
        const n = World.nodes.get(x + ',' + y), dep = n && n.left <= 0;
        const s = Sprites.bush(o.herb, o.v, dep); ctx.drawImage(s.c, cx - s.ax, cy - s.ay);
        this.pick(cx - 13, cy - 22, cx + 13, cy + 4, 'obj', o, x, y);
        break;
      }
      case 'decor': {
        if (o.kind === 'brazier') { Sprites.drawStation(ctx, 'brazier', cx, cy, time); break; }
        if (Terrain.ready && (o.kind === 'tuft' || o.kind === 'flowers' || o.kind === 'fern' || o.kind === 'shell')) break;
        const s = Sprites.decor(o.kind, o.v || 0); ctx.drawImage(s.c, cx - s.ax, cy - s.ay);
        break;
      }
      default:
        Sprites.drawStation(ctx, o.t, cx, cy, time, { night, h: o.h, v: o.v });
        if (['forge', 'anvil', 'oven', 'board', 'shrine', 'well'].includes(o.t)) this.pick(cx - 16, cy - 40, cx + 16, cy + 4, 'obj', o, x, y);
    }
    ctx.globalAlpha = 1;
  },
  drawRock(x, y) {
    const ctx = this.ctx, W = World.W + 1, C = World.corner;
    const hN = C[y * W + x], hE = C[y * W + x + 1], hS = C[(y + 1) * W + x + 1], hW = C[(y + 1) * W + x];
    const [nx, ny] = this.proj(x, y), [ex, ey] = this.proj(x + 1, y), [sx, sy] = this.proj(x + 1, y + 1), [qx, qy] = this.proj(x, y + 1);
    const avg = (hN + hE + hS + hW) / 4, hv = hash2(x, y, 9);
    const base = avg > 72 ? U.mix('#9a948a', '#eef2f6', U.clamp((avg - 72) / 12, 0, 1)) : U.shade('#8a8276', (hv - 0.5) * 0.12);
    const below = World.objAt(x, y + 1), right = World.objAt(x + 1, y);
    if (!(below && below.t === 'rock')) {
      ctx.fillStyle = U.shade(base, -0.28);
      ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(sx, sy); ctx.lineTo(sx, sy - hS); ctx.lineTo(qx, qy - hW); ctx.closePath(); ctx.fill();
    }
    if (!(right && right.t === 'rock')) {
      ctx.fillStyle = U.shade(base, -0.45);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(ex, ey - hE); ctx.lineTo(sx, sy - hS); ctx.closePath(); ctx.fill();
    }
    const gx = (hE + hS - hN - hW) / 2, gy = (hW + hS - hN - hE) / 2;
    ctx.fillStyle = U.shade(base, U.clamp(gx * 0.012 - gy * 0.008, -0.4, 0.3));
    ctx.beginPath(); ctx.moveTo(nx, ny - hN); ctx.lineTo(ex, ey - hE); ctx.lineTo(sx, sy - hS); ctx.lineTo(qx, qy - hW); ctx.closePath(); ctx.fill();
    if (hv > 0.6 && avg < 72) {
      ctx.strokeStyle = 'rgba(40,30,20,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(nx + (ex - nx) * 0.3, ny - hN * 0.9 + 8); ctx.lineTo(nx + (sx - nx) * 0.5, (ny + sy) / 2 - avg + 4); ctx.stroke();
    }
    // ore glints on minable faces
    if (World.walkable(x, y + 1) || World.walkable(x + 1, y)) {
      const n = World.nodes.get(x + ',' + y);
      if (!n || n.left > 0) {
        if (hv > 0.75) { ctx.fillStyle = 'rgba(255,220,120,0.8)'; ctx.fillRect((qx + sx) / 2 - 1, (qy + sy) / 2 - hS * 0.4, 2, 2); }
      }
      const top = Math.min(ny - hN, ey - hE, qy - hW);
      this.pick(qx, top, ex, sy, 'obj', World.objAt(x, y), x, y);
    }
  },
  roofH(b, cx, cy) {
    const w = b.x1 - b.x0 + 1, d = b.y1 - b.y0 + 1;
    let t;
    if (w >= d) t = 1 - Math.abs(cy - (b.y0 + d / 2)) / (d / 2);
    else t = 1 - Math.abs(cx - (b.x0 + w / 2)) / (w / 2);
    return b.h + b.ridge * Math.max(0, t);
  },
  drawBuildingTile(b, x, y, night) {
    const ctx = this.ctx;
    const P = (cx, cy, z) => { const [a, c] = this.proj(cx, cy); return [a, c - z]; };
    const wall = WALL_COLORS[b.wall] || '#ccc';
    const alongX = (b.x1 - b.x0) >= (b.y1 - b.y0);
    const glow = night > 0.25;
    const face = (p0c, p1c, h0, h1, col, isDoor, isWindow, beams) => {
      const a = P(p0c[0], p0c[1], 0), bb = P(p1c[0], p1c[1], 0), c = P(p1c[0], p1c[1], h1), d = P(p0c[0], p0c[1], h0);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...bb); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fill();
      const lerpPt = (u, z) => { const cx = U.lerp(p0c[0], p1c[0], u), cy = U.lerp(p0c[1], p1c[1], u); return P(cx, cy, z); };
      const quad = (u0, u1, z0, z1, fill) => {
        const q = [lerpPt(u0, z0), lerpPt(u1, z0), lerpPt(u1, z1), lerpPt(u0, z1)];
        ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(...q[0]); for (let k = 1; k < 4; k++) ctx.lineTo(...q[k]); ctx.closePath(); ctx.fill();
      };
      if (b.wall === 'stone' || b.wall === 'crypt') {
        ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 0.8; ctx.beginPath();
        for (let zz = 6; zz < b.h; zz += 6) { const p = lerpPt(0, zz), q = lerpPt(1, zz); ctx.moveTo(...p); ctx.lineTo(...q); }
        ctx.stroke();
      } else if (b.wall === 'wood') {
        ctx.strokeStyle = 'rgba(40,25,10,0.25)'; ctx.lineWidth = 0.8; ctx.beginPath();
        for (let zz = 4; zz < b.h; zz += 4) { const p = lerpPt(0, zz), q = lerpPt(1, zz); ctx.moveTo(...p); ctx.lineTo(...q); }
        ctx.stroke();
      }
      if (beams) {
        quad(0, 0.07, 0, Math.min(h0, h1), '#5a3a20');
        quad(0, 1, b.h * 0.5 - 1, b.h * 0.5 + 1, '#5a3a20');
      }
      quad(0, 1, 0, 3, 'rgba(0,0,0,0.18)');
      if (isDoor) {
        quad(0.2, 0.8, 0, 22, '#2e1c0e');
        quad(0.26, 0.74, 0, 20, '#6a4422');
        quad(0.62, 0.66, 9, 11, '#d8b84a');
      } else if (isWindow) {
        quad(0.3, 0.7, 12, 23, '#3a2a1a');
        quad(0.34, 0.66, 13, 22, glow ? '#ffd27a' : '#6a8aa8');
        quad(0.48, 0.52, 13, 22, '#3a2a1a');
      }
    };
    // right face (x+)
    if (x === b.x1) {
      const isDoor = b.door.side === 'x' && y === b.door.at;
      face([x + 1, y + 1], [x + 1, y], this.roofH(b, x + 1, y + 1), this.roofH(b, x + 1, y), U.shade(wall, -0.22), isDoor, !isDoor && (y - b.y0) % 2 === 1, b.wall === 'timber');
    }
    // left face (y+)
    if (y === b.y1) {
      const isDoor = b.door.side === 'y' && x === b.door.at;
      face([x, y + 1], [x + 1, y + 1], this.roofH(b, x, y + 1), this.roofH(b, x + 1, y + 1), wall, isDoor, !isDoor && (x - b.x0) % 2 === 1, b.wall === 'timber');
    }
    // roof
    const hN = this.roofH(b, x, y), hE = this.roofH(b, x + 1, y), hS = this.roofH(b, x + 1, y + 1), hW = this.roofH(b, x, y + 1);
    const n = P(x, y, hN), e = P(x + 1, y, hE), s = P(x + 1, y + 1, hS), w = P(x, y + 1, hW);
    const mid = alongX ? (b.y0 + (b.y1 - b.y0 + 1) / 2) : (b.x0 + (b.x1 - b.x0 + 1) / 2);
    const facingFront = alongX ? y + 0.5 > mid : x + 0.5 > mid;
    ctx.fillStyle = U.shade(b.roof, facingFront ? 0.08 : -0.18);
    ctx.beginPath(); ctx.moveTo(...n); ctx.lineTo(...e); ctx.lineTo(...s); ctx.lineTo(...w); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = U.rgba(U.shade(b.roof, -0.5), 0.45); ctx.lineWidth = 0.8; ctx.beginPath();
    for (const f of [0.33, 0.66]) {
      if (alongX) { const a = P(x, y + f, this.roofH(b, x, y + f)), c = P(x + 1, y + f, this.roofH(b, x + 1, y + f)); ctx.moveTo(...a); ctx.lineTo(...c); }
      else { const a = P(x + f, y, this.roofH(b, x + f, y)), c = P(x + f, y + 1, this.roofH(b, x + f, y + 1)); ctx.moveTo(...a); ctx.lineTo(...c); }
    }
    ctx.stroke();
    // sign above door
    if (b.sign && ((b.door.side === 'y' && y === b.y1 && x === b.door.at) || (b.door.side === 'x' && x === b.x1 && y === b.door.at))) {
      const pt = b.door.side === 'y' ? P(x + 0.5, y + 1, 27) : P(x + 1, y + 0.5, 27);
      const sx = pt[0] + (b.door.side === 'y' ? -10 : 10), sy = pt[1];
      ctx.fillStyle = '#4a2e16'; ctx.fillRect(sx - 9, sy - 9, 18, 15);
      ctx.fillStyle = '#c8a06a'; ctx.fillRect(sx - 8, sy - 8, 16, 13);
      ctx.drawImage(Sprites.icon(b.sign, b.signColor, 14), sx - 7, sy - 8);
    }
  },

  // ---------- Entities ----------
  humanoidOpts(e, time) {
    const o = { time, walk: e.walkPh || 0, moving: e.mt < 1, right: e.face.right, front: e.face.front, atk: e.atkAnim, cast: e.castT > 0 ? 1 : 0 };
    if (e.kind === 'player' || e.look) {
      const L = e.look, eq = e.eq || {};
      Object.assign(o, { skin: L.skin, hairStyle: L.hair, hairColor: L.hairColor, beard: L.beard, female: L.female });
      if (e.vis) Object.assign(o, e.vis);
      const g = (slot) => eq[slot] ? BASES[eq[slot].base] : null;
      if (eq.chest) { const b = g('chest'); o.chest = { type: b.look, color: Items.color(eq.chest) }; if (b.look === 'robe') o.robe = Items.color(eq.chest); }
      if (eq.legs) o.legs = { color: Items.color(eq.legs) };
      if (eq.feet) o.feet = { color: Items.color(eq.feet) };
      if (eq.hands) o.hands = { color: Items.color(eq.hands) };
      if (eq.head) o.head = { type: g('head').look, color: Items.color(eq.head) };
      if (eq.back) o.cloak = Items.color(eq.back);
      if (eq.main) o.weapon = { icon: g('main').icon, color: Items.color(eq.main), glow: eq.main.r >= 3 ? RARITY[eq.main.r].color : null };
      if (eq.off) o.shield = { icon: g('off').icon, color: Items.color(eq.off) };
      if (e.kind === 'player' && e.action && e.action.anim) o.tool = e.action.anim;
      if (e.kind === 'player' && e.action && e.action.type === 'fish') o.weapon = { icon: 'pole', color: '#b08850' };
    } else {
      const L = e.def.look;
      Object.assign(o, {
        skin: L.skin, skeleton: L.skeleton, ragged: L.ragged, tusks: L.tusks, crown: L.crown, robe: L.robe, cloak: L.cloak,
        hood: L.hood, bald: L.bald, glow: L.glow, scale: L.scale, hairColor: L.hair || '#2a1a10', hairStyle: 'Short', float: e.def.boss && L.skeleton,
        chest: L.chest ? { type: 'shirt', color: L.chest } : null, legs: L.legs ? { color: L.legs } : null, feet: { color: '#3a2a1a' },
        weapon: L.weapon ? { icon: L.weapon, color: L.wcolor, glow: L.glow } : null, shield: L.shield ? { icon: 'buckler', color: '#7a7f86' } : null,
      });
    }
    return o;
  },
  drawEntity(e, time) {
    const ctx = this.ctx;
    const [vx, vy] = this.visPos(e);
    const [fx, fy] = this.feet(vx, vy);
    let alpha = e.dead ? 0.4 : 1;
    if (e.flash > 0) alpha = 0.6 + Math.sin(time * 40) * 0.4;
    // target / hover rings
    if (Game.target === e) { ctx.strokeStyle = e.hostileTo ? '#ff4a3a' : '#ffd94a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(fx, fy, 15, 6.5, 0, 0, 7); ctx.stroke(); }
    else if (Game.hoverPick && Game.hoverPick.ref === e) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(fx, fy, 14, 6, 0, 0, 7); ctx.stroke(); }
    let top = fy - 50;
    if (e.kind === 'player' || e.look || (e.def && e.def.body === 'humanoid')) {
      const o = this.humanoidOpts(e, time);
      o.alpha = alpha;
      if (e.kind === 'player' && e.mount) {
        Sprites.quad(ctx, fx, fy, MONSTERS[e.mount.mon].look, { right: o.right, walk: o.walk, moving: o.moving, time, saddle: true, alpha, tint: e.mount.tint });
        o.mounted = true;
        Sprites.humanoid(ctx, fx - (o.right ? 2 : -2), fy - 15, o);
        top = fy - 68;
      } else {
        Sprites.humanoid(ctx, fx, fy, o);
        top = fy - 50 * (o.scale || 1);
      }
    } else {
      const def = e.def, L = def.look;
      const o = { right: e.face.right, walk: e.walkPh || 0, moving: e.mt < 1, time, alpha, scale: def.boss ? 1.6 : 1, saddle: e.kind === 'pet' && def.mount };
      if (e.kind === 'pet') o.tint = null;
      if (def.body === 'quad') { Sprites.quad(ctx, fx, fy, L, o); top = fy - (L.leg + L.h + 10); }
      else if (def.body === 'spider') { Sprites.spider(ctx, fx, fy, L, o); top = fy - L.r * 3; }
      else if (def.body === 'blob') { Sprites.blob(ctx, fx, fy, L, o); top = fy - L.r * 2.2; }
      else if (def.body === 'wisp') { Sprites.wisp(ctx, fx, fy, L, o); top = fy - 44; }
      else if (def.body === 'drake') { Sprites.drake(ctx, fx, fy, L, o); top = fy - (L.leg + L.h * 2.2) * o.scale; }
    }
    e._top = top; e._fx = fx; e._fy = fy;
    if (e.kind !== 'decor') this.pick(fx - 14, top, fx + 14, fy + 4, 'ent', e);
  },
  drawOverhead(e) {
    const ctx = this.ctx;
    if (e._fx == null || e.kind === 'decor') return;
    const x = e._fx, top = e._top;
    const isTarget = Game.target === e, hov = Game.hoverPick && Game.hoverPick.ref === e;
    const showBar = !e.dead && e.maxHp && (e.hp < e.maxHp || isTarget) && e.kind !== 'npc';
    if (showBar) {
      const w = e.def && e.def.boss ? 60 : 30, pct = U.clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - w / 2 - 1, top - 7, w + 2, 5);
      ctx.fillStyle = e.kind === 'pet' || e.kind === 'player' ? '#3fd46a' : pct > 0.5 ? '#e0483a' : pct > 0.25 ? '#e0903a' : '#ff2a2a';
      ctx.fillRect(x - w / 2, top - 6, w * pct, 3);
    }
    let label = null, col = '#ddd';
    if (e.kind === 'npc') { label = e.title; col = '#8ad0ff'; if (hov) label = e.name + ', ' + e.title; }
    else if (hov || isTarget || (e.def && e.def.boss)) {
      label = e.name;
      col = e.kind === 'pet' ? '#7aff9a' : e.kind === 'player' ? '#9ad8ff' : e.def && e.def.boss ? '#ffb84a' : e.hostileTo || (e.def && e.def.aggro) ? '#ff8a7a' : '#d8d8d8';
    }
    if (label) {
      ctx.font = '600 9px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillText(label, x + 0.7, top - 10.3);
      ctx.fillStyle = col; ctx.fillText(label, x, top - 11);
    }
    if (e.say && e.say.t > 0) {
      ctx.font = '600 9px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(e.say.text).width + 10, yy = top - (label ? 30 : 20);
      ctx.fillStyle = 'rgba(15,12,8,0.82)'; this.roundRect(x - tw / 2, yy - 10, tw, 14, 4); ctx.fill();
      ctx.fillStyle = e.say.color || '#fff6d8'; ctx.fillText(e.say.text, x, yy);
    }
  },
  roundRect(x, y, w, h, r) {
    const ctx = this.ctx; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  },
  drawCorpse(c, time) {
    const ctx = this.ctx, [fx, fy] = this.feet(c.x, c.y);
    const fade = U.clamp(c.life / 5, 0, 1);
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(90,10,10,0.35)'; ctx.beginPath(); ctx.ellipse(fx + 3, fy, 13, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c.color || '#6a5a4a';
    ctx.beginPath(); ctx.ellipse(fx, fy - 3, 11, 4.5, 0.15, 0, 7); ctx.fill();
    ctx.fillStyle = U.shade(c.color || '#6a5a4a', 0.2); ctx.beginPath(); ctx.arc(fx + 10, fy - 4, 3.5, 0, 7); ctx.fill();
    if (c.items.length || c.gold) {
      const r = c.bestR;
      if (r >= 1) {
        const col = RARITY[r].color, h = 40 + r * 18, pulse = 0.5 + Math.sin(time * 3) * 0.2;
        const g = ctx.createLinearGradient(0, fy - h, 0, fy);
        g.addColorStop(0, U.rgba(col, 0)); g.addColorStop(1, U.rgba(col, 0.5 * pulse + r * 0.06));
        ctx.fillStyle = g; ctx.fillRect(fx - 4 - r, fy - h, 8 + r * 2, h);
        if (r >= 3) for (let k = 0; k < r; k++) { const p = (time * 0.6 + k / r) % 1; ctx.fillStyle = U.rgba(col, 1 - p); ctx.fillRect(fx - 6 + hash2(k, c.id, 1) * 12, fy - p * h, 2, 2); }
      }
      ctx.fillStyle = '#ffd94a'; ctx.beginPath(); ctx.arc(fx - 6, fy - 2, 1.6, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.pick(fx - 14, fy - 14, fx + 14, fy + 4, 'corpse', c);
  },
  drawChest(c, time) {
    const [fx, fy] = this.feet(c.x, c.y);
    Sprites.chest(this.ctx, fx, fy, c.opened, c.tier, time);
    if (!c.opened) {
      const g = this.ctx.createRadialGradient(fx, fy - 8, 1, fx, fy - 8, 18);
      g.addColorStop(0, 'rgba(255,220,120,' + (0.18 + Math.sin(time * 3) * 0.08) + ')'); g.addColorStop(1, 'rgba(255,220,120,0)');
      this.ctx.fillStyle = g; this.ctx.fillRect(fx - 18, fy - 26, 36, 36);
    }
    this.pick(fx - 14, fy - 22, fx + 14, fy + 4, 'chest', c);
  },

  // ---------- Effects ----------
  drawEffects(time) {
    const ctx = this.ctx;
    for (const f of Game.effects) {
      const t = f.t / f.dur;
      if (f.type === 'text') {
        const [wx, wy] = this.feet(f.x, f.y);
        ctx.globalAlpha = 1 - Math.pow(t, 3);
        ctx.font = `800 ${f.size || 11}px "Segoe UI", sans-serif`; ctx.textAlign = 'center';
        const yy = wy - (f.z || 50) - t * 26;
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillText(f.text, wx + 1, yy + 1);
        ctx.fillStyle = f.color; ctx.fillText(f.text, wx, yy);
        ctx.globalAlpha = 1;
      } else if (f.type === 'proj') {
        const x = U.lerp(f.sx, f.tx, t), y = U.lerp(f.sy, f.ty, t);
        const [wx, wy] = this.feet(x, y), lift = f.arc ? Math.sin(t * Math.PI) * 30 : 0;
        if (f.arrow) {
          const [ax, ay] = this.feet(f.sx, f.sy), [bx, by] = this.feet(f.tx, f.ty);
          const ang = Math.atan2(by - ay, bx - ax);
          ctx.save(); ctx.translate(wx, wy - 26 - lift); ctx.rotate(ang);
          ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.stroke();
          ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(9, 0); ctx.lineTo(6, 2); ctx.fill();
          ctx.restore();
        } else {
          const r = f.size || 6;
          const g = ctx.createRadialGradient(wx, wy - 26 - lift, 0.5, wx, wy - 26 - lift, r * 2.2);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, f.color); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(wx, wy - 26 - lift, r * 2.2, 0, 7); ctx.fill();
        }
      } else if (f.type === 'burst') {
        const [wx, wy] = this.feet(f.x, f.y);
        for (let k = 0; k < (f.n || 10); k++) {
          const a = hash2(k, f.seed, 1) * 6.28, sp = 10 + hash2(k, f.seed, 2) * 22;
          ctx.fillStyle = U.rgba(f.color, 1 - t);
          ctx.fillRect(wx + Math.cos(a) * sp * t, wy - (f.z || 26) + Math.sin(a) * sp * t * 0.7 - t * 8, 2.5, 2.5);
        }
      } else if (f.type === 'ring') {
        const [wx, wy] = this.feet(f.x, f.y);
        ctx.strokeStyle = U.rgba(f.color, 1 - t); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(wx, wy, (f.r || 30) * t + 4, ((f.r || 30) * t + 4) * 0.5, 0, 0, 7); ctx.stroke();
      } else if (f.type === 'rise') {
        const [wx, wy] = this.feet(f.x, f.y);
        for (let k = 0; k < 8; k++) {
          const p = (t + k / 8) % 1, ox = (hash2(k, f.seed, 3) - 0.5) * 26;
          ctx.fillStyle = U.rgba(f.color, (1 - p) * (1 - t * 0.5));
          ctx.fillRect(wx + ox, wy - p * 50, 2, 4);
        }
      } else if (f.type === 'meteor') {
        const [wx, wy] = this.feet(f.x, f.y);
        if (t < 0.6) {
          const p = t / 0.6;
          const g = ctx.createRadialGradient(wx + (1 - p) * 60, wy - (1 - p) * 220, 1, wx + (1 - p) * 60, wy - (1 - p) * 220, 14);
          g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#ff8a2a'); g.addColorStop(1, 'rgba(255,60,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(wx + (1 - p) * 60, wy - (1 - p) * 220, 14, 0, 7); ctx.fill();
        } else {
          const p = (t - 0.6) / 0.4;
          ctx.fillStyle = U.rgba('#ff6a2a', 0.6 * (1 - p));
          ctx.beginPath(); ctx.ellipse(wx, wy, 70 * p + 10, (70 * p + 10) * 0.5, 0, 0, 7); ctx.fill();
        }
      } else if (f.type === 'bolt') {
        const [ax, ay] = this.feet(f.sx, f.sy), [bx, by] = this.feet(f.tx, f.ty);
        ctx.strokeStyle = U.rgba(f.color, 1 - t); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ax, ay - 30);
        for (let k = 1; k <= 6; k++) { const p = k / 6; ctx.lineTo(U.lerp(ax, bx, p) + (k < 6 ? (hash2(k, f.seed + ((time * 20) | 0), 1) - 0.5) * 14 : 0), U.lerp(ay, by, p) - 30 + (k < 6 ? (hash2(k, f.seed, 2) - 0.5) * 10 : 0)); }
        ctx.stroke();
      }
    }
  },

  // ---------- Atmosphere: grading, fog, motes, light radius, vignette ----------
  initAtmosphere() {
    // tileable fog texture from wrapped value noise
    const S = 256, P = 6, c = mkCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S);
    const wn = (u, v, s) => {
      const xi = Math.floor(u), yi = Math.floor(v), xf = u - xi, yf = v - yi;
      const h = (a, b) => hash2(((a % P) + P) % P, ((b % P) + P) % P, s);
      const sm = (t) => t * t * (3 - 2 * t), uu = sm(xf), vv = sm(yf);
      const a = h(xi, yi), b = h(xi + 1, yi), cc = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      return a + (b - a) * uu + (cc - a) * vv + (a - b - cc + d) * uu * vv;
    };
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u = (i / S) * P, v = (j / S) * P;
      const n = wn(u, v, 1) * 0.55 + wn(u * 2, v * 2, 2) * 0.3 + wn(u * 4, v * 4, 3) * 0.15;
      const k = (j * S + i) * 4, a = U.clamp((n - 0.42) * 2.4, 0, 1);
      img.data[k] = 196; img.data[k + 1] = 200; img.data[k + 2] = 212; img.data[k + 3] = a * 255;
    }
    x.putImageData(img, 0, 0);
    this.fog = c;
    this.motes = [];
    this.lastT = 0;
  },
  updateMotes(time, night) {
    const dt = Math.min(0.05, Math.max(0, time - this.lastT)); this.lastT = time;
    const z = this.zoom, left = this.cam.x - this.W / 2 / z, top = this.cam.y - this.H / 2 / z;
    const vw = this.W / z, vh = this.H / z;
    const want = Math.round(40 + night * 50);
    while (this.motes.length < want) {
      const fly = Math.random() < night * 0.8;
      this.motes.push({ x: left + Math.random() * vw, y: top + Math.random() * vh, vx: (Math.random() - 0.5) * (fly ? 14 : 6), vy: fly ? (Math.random() - 0.5) * 10 : -2 - Math.random() * 5,
        t: 0, life: 4 + Math.random() * 6, fly, ph: Math.random() * 6.28 });
    }
    for (const m of this.motes) {
      m.t += dt; m.x += (m.vx + Math.sin(time * 0.7 + m.ph) * 4) * dt; m.y += m.vy * dt;
      if (m.x < left - 40 || m.x > left + vw + 40 || m.y < top - 40 || m.y > top + vh + 40) m.t = m.life;
    }
    // embers rising from forges, braziers and lairs
    for (const L of World.lights) {
      if (L.c !== '#ff9a40' && L.c !== '#ff6a2a') continue;
      const [wx, wy] = this.feet(L.x, L.y);
      if (wx < left - 50 || wx > left + vw + 50 || wy < top - 50 || wy > top + vh + 80) continue;
      if (Math.random() < dt * 6) this.motes.push({ x: wx + (Math.random() - 0.5) * 16, y: wy - 20, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 25, t: 0, life: 1.5 + Math.random(), ember: true, ph: Math.random() * 6 });
    }
    this.motes = this.motes.filter((m) => m.t < m.life);
  },
  drawMotes(time) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const f = Math.sin((m.t / m.life) * Math.PI);
      if (m.ember) { ctx.fillStyle = `rgba(255,${120 + (f * 80) | 0},40,${0.9 * f})`; ctx.fillRect(m.x, m.y, 1.6, 1.6); continue; }
      if (m.fly) {
        const p = 0.5 + Math.sin(time * 3 + m.ph) * 0.5, a = f * p;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 6);
        g.addColorStop(0, `rgba(220,255,140,${0.9 * a})`); g.addColorStop(1, 'rgba(120,200,60,0)');
        ctx.fillStyle = g; ctx.fillRect(m.x - 6, m.y - 6, 12, 12);
      } else { ctx.fillStyle = `rgba(255,230,180,${0.35 * f})`; ctx.fillRect(m.x, m.y, 1.4, 1.4); }
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  drawAtmosphere(night, time) {
    const ctx = this.ctx, d = this.dpr, W = this.W, H = this.H, P = Game.player;
    if (!this.fog) this.initAtmosphere();
    ctx.setTransform(d, 0, 0, d, 0, 0);
    // colour grade: desaturate, warm the midtones, deepen the shadows
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,0.18)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(170,110,55,0.3)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(236,232,226)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    // drifting fog, thicker at night and in the swamp
    const swamp = World.biome(P.x, P.y) === 'swamp' ? 0.18 : 0;
    const fogA = 0.08 + night * 0.16 + swamp;
    const pat = ctx.createPattern(this.fog, 'repeat');
    for (const [sc, sp, a] of [[3.2, 6, 1], [5.5, -3.5, 0.7]]) {
      const m = new DOMMatrix().translate(-this.cam.x * this.zoom * 0.9 + time * sp * this.zoom, -this.cam.y * this.zoom * 0.9 + time * sp * 0.3).scale(sc * this.zoom / 1.6);
      pat.setTransform(m);
      ctx.globalAlpha = fogA * a; ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawLighting(0.16 + night * 0.72, time, night);
    // motes & embers on top so they glow
    ctx.setTransform(d * this.zoom, 0, 0, d * this.zoom, d * (W / 2 - this.cam.x * this.zoom), d * (H / 2 - this.cam.y * this.zoom));
    this.updateMotes(time, night);
    this.drawMotes(time);
    // vignette
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(4,3,2,${0.5 + night * 0.25})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  },
  drawLighting(dark, time, night) {
    const l = this.lctx, w = this.light.width, h = this.light.height, sc = 0.5;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, w, h);
    l.fillStyle = `rgba(6,7,16,${dark})`; l.fillRect(0, 0, w, h);
    l.globalCompositeOperation = 'destination-out';
    const hole = (wx, wy, r, a = 1) => {
      const [sx, sy] = this.worldToScreen(wx, wy);
      const rr = r * this.zoom * sc;
      if (sx * sc < -rr || sy * sc < -rr || sx * sc > w + rr || sy * sc > h + rr) return;
      const g = l.createRadialGradient(sx * sc, sy * sc, 0, sx * sc, sy * sc, rr);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g; l.fillRect(sx * sc - rr, sy * sc - rr, rr * 2, rr * 2);
    };
    const P = Game.player, [px, py] = this.visPos(P), [pfx, pfy] = this.feet(px, py);
    const flick = 1 + Math.sin(time * 7) * 0.04 + Math.sin(time * 17) * 0.02;
    // the hero's light radius: wide by day, a torch-sized pool at night
    hole(pfx, pfy - 20, U.lerp(330, 190, night) * flick, 1);
    for (const L of World.lights) { const [wx, wy] = this.feet(L.x, L.y); hole(wx, wy - 20, L.r * 32 * flick, 0.95); }
    for (const f of Game.effects) if (f.type === 'proj' && !f.arrow) { const [wx, wy] = this.feet(U.lerp(f.sx, f.tx, f.t / f.dur), U.lerp(f.sy, f.ty, f.t / f.dur)); hole(wx, wy - 26, 70, 0.8); }
    for (const e of Game.ents) if (e.def && e.def.body === 'wisp' && e._fx != null) hole(e._fx, e._fy - 24, 60, 0.6);
    this.ctx.drawImage(this.light, 0, 0, this.canvas.width, this.canvas.height);
    // warm additive glow
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    for (const L of World.lights) {
      const [wx, wy] = this.feet(L.x, L.y); const [sx, sy] = this.worldToScreen(wx, wy - 20);
      const r = L.r * 22 * this.zoom * this.dpr * flick;
      if (sx < -r || sy < -r || sx > this.W + r || sy > this.H + r) continue;
      const g = ctx.createRadialGradient(sx * this.dpr, sy * this.dpr, 0, sx * this.dpr, sy * this.dpr, r);
      g.addColorStop(0, U.rgba(L.c, 0.08 + 0.24 * night)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(sx * this.dpr - r, sy * this.dpr - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  },

  // Pick under mouse (world px). Entities take priority.
  pickAt(sx, sy) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    let other = null;
    for (let i = this.picks.length - 1; i >= 0; i--) {
      const p = this.picks[i];
      if (wx < p.x0 || wx > p.x1 || wy < p.y0 || wy > p.y1) continue;
      if (p.kind === 'ent') { if (p.ref.kind === 'player') continue; return p; }
      if (!other || (p.kind !== 'obj' && other.kind === 'obj')) other = p;
    }
    return other;
  },
};
