'use strict';
// =====================================================================
//  Game state, entities, AI, combat, spawning
// =====================================================================
const Game = {
  state: 'title', ents: [], player: null, corpses: [], chests: [], effects: [],
  time: 0, clock: 8 * 60, night: 0, target: null, hoverTile: null, hoverPick: null,
  nextId: 1, bossTimers: {}, spawnT: 0, chestT: 0, saveT: 0, slot: 0,

  // ---------- helpers ----------
  fx(type, props) { this.effects.push(Object.assign({ type, t: 0, dur: 1, seed: (Math.random() * 1000) | 0 }, props)); },
  text(e, text, color, size, z) { const [x, y] = Render.visPos(e); this.fx('text', { x, y, text, color, size, z, dur: 1.2 }); },
  say(e, text, color) { e.say = { text, t: 3, color }; },
  entAt(x, y) { const id = World.occ[World.idx(x, y)]; return id ? this.ents.find((e) => e.id === id) : null; },
  updateClock(dt) {
    this.clock = (this.clock + dt) % 1440;
    const h = this.clock / 60;
    const dark = h < 5 ? 1 : h < 7 ? 1 - (h - 5) / 2 : h < 19 ? 0 : h < 21 ? (h - 19) / 2 : 1;
    this.night = dark * 0.6;
  },
  clockStr() { const h = Math.floor(this.clock / 60), m = Math.floor(this.clock % 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); },
};

function makeEnt(o) {
  const e = Object.assign({
    id: Game.nextId++, x: 0, y: 0, mt: 1, md: 0.3, face: { right: true, front: true }, walkPh: 0,
    atkAnim: -1, castT: 0, hp: 1, maxHp: 1, flash: 0, swingT: 0, path: null, say: null, aiT: Math.random(),
  }, o);
  e.fx = e.x; e.fy = e.y;
  return e;
}
function addEnt(e) { Game.ents.push(e); World.occ[World.idx(e.x, e.y)] = e.id; return e; }
function removeEnt(e) {
  const i = Game.ents.indexOf(e);
  if (i >= 0) Game.ents.splice(i, 1);
  const k = World.idx(e.x, e.y);
  if (World.occ[k] === e.id) World.occ[k] = 0;
  if (Game.target === e) Game.target = null;
}
function placeEnt(e, x, y) {
  const k = World.idx(e.x, e.y);
  if (World.occ[k] === e.id) World.occ[k] = 0;
  e.x = e.fx = x; e.y = e.fy = y; e.mt = 1; e.path = null;
  World.occ[World.idx(x, y)] = e.id;
}
function isWild(e) { return e.kind === 'mob' || e.kind === 'decor'; }
function canEnter(e, x, y) {
  if (!World.walkable(x, y)) return false;
  const o = World.occ[World.idx(x, y)];
  if (o && o !== e.id) return false;
  if (isWild(e) && !(e.def && e.def.boss) && World.townAt(x, y) >= 0 && e.kind !== 'decor') return false;
  return true;
}
function setFace(e, dx, dy) {
  const sdx = dx - dy, sdy = dx + dy;
  if (sdx) e.face.right = sdx > 0;
  if (sdy) e.face.front = sdy > 0;
}
function faceToward(e, t) { setFace(e, Math.sign(t.x - e.x), Math.sign(t.y - e.y)); }
function stepEnt(e, dx, dy, stepTime) {
  if (e.mt < 1) return false;
  const nx = e.x + dx, ny = e.y + dy;
  if (!canEnter(e, nx, ny)) return false;
  if (dx && dy && (!World.walkable(e.x + dx, e.y) || !World.walkable(e.x, e.y + dy))) return false;
  const k = World.idx(e.x, e.y);
  if (World.occ[k] === e.id) World.occ[k] = 0;
  World.occ[World.idx(nx, ny)] = e.id;
  e.fx = e.x; e.fy = e.y; e.x = nx; e.y = ny; e.mt = 0;
  e.md = stepTime * (e.slowT > 0 ? 1.6 : 1);
  setFace(e, dx, dy);
  return true;
}
function updateMotion(e, dt) {
  if (e.mt < 1) {
    e.mt = Math.min(1, e.mt + dt / e.md);
    e.walkPh += (dt / e.md) * Math.PI;
  }
  if (e.atkAnim >= 0) { e.atkAnim += dt / 0.45; if (e.atkAnim > 1) e.atkAnim = -1; }
  if (e.flash > 0) e.flash -= dt;
  if (e.say && e.say.t > 0) e.say.t -= dt;
  if (e.slowT > 0) e.slowT -= dt;
}
// Follow a computed path one step at a time
function followPath(e, stepTime) {
  if (e.mt < 1 || !e.path || !e.path.length) return;
  const [nx, ny] = e.path[0];
  if (stepEnt(e, nx - e.x, ny - e.y, stepTime)) { e.path.shift(); e.blocked = 0; }
  else { e.blocked = (e.blocked || 0) + 1; if (e.blocked > 3) e.path = null; }
}
function pathTo(e, tx, ty, near = 0, maxN = 1500) {
  const self = e;
  const cost = (x, y) => (World.walkable(x, y) && !(isWild(self) && !(self.def && self.def.boss) && World.townAt(x, y) >= 0) ? 1 : Infinity);
  e.path = Path.find(e.x, e.y, tx, ty, cost, maxN, near, true);
  return e.path;
}

// ---------- Combat ----------
function profileOf(e) {
  if (e.kind === 'player') return Player.profile();
  const d = e.def, lvl = e.petLvl || 0;
  return { skill: d.atk + lvl, def: d.def + lvl, dmg: d.dmg, mult: 1 + lvl / 100, spd: d.swing || 2.2, range: 1, ar: d.ar, hit: 0, fire: 0, leech: 0, block: d.look && d.look.shield ? 0.15 : 0 };
}
function attack(att, tgt) {
  const A = profileOf(att), D = profileOf(tgt);
  att.atkAnim = 0; faceToward(att, tgt);
  if (att.kind === 'player') Player.onSwing(A, tgt);
  const ch = U.clamp(0.5 + (A.skill - D.def) / 160 + A.hit / 100, 0.12, 0.95);
  if (!U.chance(ch)) {
    Game.text(tgt, 'miss', '#cfcfcf', 9);
    if (att.kind === 'player' || tgt.kind === 'player') Sound.play('miss');
    return;
  }
  if (D.block > 0 && U.chance(D.block)) {
    Game.text(tgt, 'Blocked!', '#9ad8ff', 9);
    if (tgt.kind === 'player') { Player.gain('parrying', A.skill); Sound.play('mine'); }
    return;
  }
  let dmg = U.randi(A.dmg[0], A.dmg[1]) * A.mult + A.fire;
  dmg *= 1 - D.ar / (D.ar + 60);
  dmg = Math.max(1, Math.round(dmg));
  damage(tgt, dmg, att, A.fire > 0 ? '#ffab4a' : null);
  if (A.leech > 0) heal(att, Math.max(1, Math.round((dmg * A.leech) / 100)), true);
  if (att.kind === 'player' || tgt.kind === 'player' || att.kind === 'pet') Sound.play('hit');
}
function damage(tgt, amt, src, color) {
  if (tgt.dead) return;
  tgt.hp -= amt; tgt.flash = 0.15;
  Game.text(tgt, String(amt), color || (tgt.kind === 'player' ? '#ff5a4a' : tgt.kind === 'pet' ? '#ffb07a' : '#fff4d0'), tgt.kind === 'player' ? 12 : 11);
  if (tgt.kind === 'player') { Sound.play('hurt'); Player.onHurt(src); }
  if (src && (tgt.kind === 'mob' || tgt.kind === 'pet') && src !== tgt) {
    if (tgt.kind === 'mob') { tgt.target = src; tgt.hostileTo = true; tgt.hurtT = 6; tgt.lastAttacker = src; }
    if (tgt.kind === 'pet' && !tgt.target) tgt.target = src;
  }
  if (tgt.kind === 'player' && src) for (const p of Game.ents) if (p.kind === 'pet' && p.mode !== 'stay' && !p.target) p.target = src;
  if (tgt.hp <= 0) kill(tgt, src);
}
function heal(e, amt, quiet) {
  if (e.dead) return;
  const before = e.hp;
  e.hp = Math.min(e.maxHp, e.hp + amt);
  if (!quiet || e.hp - before >= 3) Game.text(e, '+' + Math.round(e.hp - before), '#6aff8a', 10);
}
function kill(e, src) {
  if (e.kind === 'player') { Player.die(); return; }
  e.dead = true;
  if (e.kind === 'pet') {
    UI.log(`${e.name} has fallen.`, '#ff8a7a');
    removeEnt(e); Player.recalcFollowers(); return;
  }
  removeEnt(e);
  const P = Game.player;
  const byPlayer = src && (src.kind === 'player' || src.kind === 'pet');
  const def = e.def;
  if (byPlayer) {
    const loot = Items.monsterLoot(def, P.d.luck, P.d.gold);
    const corpse = { id: e.id, x: e.x, y: e.y, items: loot.items, gold: loot.gold, life: def.boss ? 300 : 90, color: def.look.color || def.look.skin || def.look.chest || '#6a5a4a', name: def.name, bestR: 0 };
    corpse.bestR = corpse.items.reduce((m, it) => Math.max(m, BASES[it.base].stack ? 0 : (it.r || 0)), 0);
    Game.corpses.push(corpse);
    P.kills[e.mon] = (P.kills[e.mon] || 0) + 1;
    Player.bountyEvent('kill', { mon: e.mon });
    if (def.boss) {
      UI.toast(`${def.name} has been slain!`, '#ffb84a', 'Its hoard awaits.');
      Sound.play('rare', 5);
      const L = BOSS_LAIRS.find((b) => b.id === e.mon);
      Game.bossTimers[e.mon] = Game.time + (L ? L.respawn : 600);
    }
    if (Game.target === e) Game.target = null;
    if (Settings.autoLoot && !def.boss) Player.lootCorpse(corpse, true);
  }
  Game.fx('burst', { x: e.x, y: e.y, color: '#c83a2a', n: 12, dur: 0.6 });
  if (def.boss) Game.bossTimers[e.mon] = Game.bossTimers[e.mon] || Game.time + 600;
}

// Ranged attack (spells from mobs, arrows from player)
function shoot(att, tgt, opts) {
  const [sx, sy] = Render.visPos(att), [tx, ty] = Render.visPos(tgt);
  const dist = U.dist(sx, sy, tx, ty);
  Game.fx('proj', { sx, sy, tx, ty, color: opts.color || '#fff', dur: Math.max(0.15, dist * 0.05), arrow: opts.arrow, size: opts.size, onHit: opts.onHit, arc: opts.arc });
}

// ---------- Mob AI ----------
function spawnMob(id, x, y, extra) {
  const def = MONSTERS[id];
  const e = makeEnt(Object.assign({ kind: 'mob', mon: id, def, name: def.name, x, y, hp: def.hp, maxHp: def.hp, home: [x, y], hostileTo: !!def.aggro }, extra || {}));
  e.face.right = U.chance(0.5);
  return addEnt(e);
}
function updateMob(e, dt) {
  const P = Game.player, def = e.def;
  if (e.rangedCd > 0) e.rangedCd -= dt;
  e.swingT -= dt;
  if (def.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + def.regen * dt);
  if (e.hurtT > 0) e.hurtT -= dt;
  e.aiT -= dt;
  const step = def.step;
  // flee
  if (def.passive === 'flee' && e.hurtT > 0 && e.lastAttacker && !e.lastAttacker.dead) {
    if (e.mt >= 1) {
      const a = e.lastAttacker; let best = null, bd = -1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (!canEnter(e, e.x + dx, e.y + dy)) continue;
        const d = U.dist(e.x + dx, e.y + dy, a.x, a.y);
        if (d > bd) { bd = d; best = [dx, dy]; }
      }
      if (best) stepEnt(e, best[0], best[1], step * 0.85);
    }
    return;
  }
  // acquire target
  if (!e.target && def.aggro && !P.dead && e.aiT <= 0) {
    if (U.cheb(e.x, e.y, P.x, P.y) <= def.aggro && World.townAt(P.x, P.y) < 0) { e.target = P; Game.say(e, def.boss ? 'You dare enter my domain?' : '!', '#ff8a7a'); }
    else for (const p of Game.ents) if (p.kind === 'pet' && U.cheb(e.x, e.y, p.x, p.y) <= def.aggro - 2) { e.target = p; break; }
  }
  const t = e.target;
  if (t) {
    const homeD = U.dist(e.x, e.y, e.home[0], e.home[1]);
    if (t.dead || !Game.ents.includes(t) || U.cheb(e.x, e.y, t.x, t.y) > 22 || homeD > (def.boss ? 18 : 30) || (t.kind === 'player' && P.dead)) {
      e.target = null; e.returning = true; e.path = null; return;
    }
    const d = U.cheb(e.x, e.y, t.x, t.y);
    if (def.ranged && d >= 2 && d <= def.ranged.range && (e.rangedCd || 0) <= 0) {
      e.rangedCd = def.ranged.cd; e.atkAnim = 0; e.castT = 0.4; faceToward(e, t);
      const R = def.ranged;
      shoot(e, t, { color: R.color, size: R.breath ? 9 : 6, onHit: () => { if (!t.dead) { const ar = profileOf(t).ar; damage(t, Math.max(1, Math.round(U.randi(R.dmg[0], R.dmg[1]) * (1 - ar / (ar + 90)))), e, R.color); } } });
      if (R.breath) Game.say(e, 'ROAR!', '#ff8a4a');
      return;
    }
    if (def.summon && (e.summonT = (e.summonT || 12) - dt) <= 0) {
      e.summonT = 14;
      let n = 0;
      for (const m of Game.ents) if (m.summoned) n++;
      if (n < 4) for (let k = 0; k < 2; k++) {
        const p = World.findWalkableNear(e.x + U.randi(-2, 2), e.y + U.randi(-2, 2), 3);
        if (p) { const s = spawnMob(def.summon, p[0], p[1], { summoned: true }); s.target = t; Game.fx('ring', { x: p[0], y: p[1], color: '#8fe3ff', dur: 0.8 }); }
      }
      Game.say(e, 'Rise, my servants!', '#8fe3ff');
    }
    if (d <= 1) {
      if (e.mt >= 1) faceToward(e, t);
      if (e.swingT <= 0 && e.mt >= 1) { e.swingT = def.swing || 2.2; attack(e, t); }
      return;
    }
    if (e.mt >= 1) {
      if (!e.path || !e.path.length || e.aiT <= 0) { e.aiT = 0.5 + Math.random() * 0.3; pathTo(e, t.x, t.y, 1, 600); }
      followPath(e, step * 0.9);
    }
    return;
  }
  if (e.returning) {
    if (e.mt >= 1) {
      if (U.cheb(e.x, e.y, e.home[0], e.home[1]) <= 2) { e.returning = false; e.hp = e.maxHp; e.path = null; }
      else { if (!e.path || !e.path.length) { pathTo(e, e.home[0], e.home[1], 1, 1500); if (!e.path) { e.returning = false; e.home = [e.x, e.y]; } } followPath(e, step); }
    }
    return;
  }
  // wander
  if (e.mt >= 1 && e.aiT <= 0) {
    e.aiT = 1.5 + Math.random() * 3;
    if (U.chance(0.6)) {
      const dx = U.randi(-1, 1), dy = U.randi(-1, 1);
      if (U.dist(e.x + dx, e.y + dy, e.home[0], e.home[1]) < (e.kind === 'decor' ? 3 : 7)) stepEnt(e, dx, dy, step * 1.6);
    }
  }
}

// ---------- Pet AI ----------
function updatePet(e, dt) {
  const P = Game.player, def = e.def;
  e.swingT -= dt;
  if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + dt * 0.5);
  e.aiT -= dt;
  if (P.dead) { e.target = null; return; }
  if (!e.target && e.mode !== 'stay' && Game.target && Game.target.kind === 'mob' && P.combat && !Game.target.dead && U.cheb(Game.target.x, Game.target.y, P.x, P.y) < 14) e.target = Game.target;
  const t = e.target;
  if (t) {
    if (t.dead || !Game.ents.includes(t) || U.cheb(e.x, e.y, P.x, P.y) > 18) { e.target = null; e.path = null; }
    else {
      const d = U.cheb(e.x, e.y, t.x, t.y);
      if (def.ranged && d >= 2 && d <= def.ranged.range && (e.rangedCd = (e.rangedCd || 0) - dt) <= 0) {
        e.rangedCd = def.ranged.cd;
        const R = def.ranged;
        shoot(e, t, { color: R.color, size: 7, onHit: () => { if (!t.dead) damage(t, U.randi(R.dmg[0], R.dmg[1]), e, R.color); } });
        return;
      }
      if (d <= 1) { if (e.mt >= 1) faceToward(e, t); if (e.swingT <= 0 && e.mt >= 1) { e.swingT = def.swing || 2.2; attack(e, t); } return; }
      if (e.mt >= 1) { if (!e.path || !e.path.length || e.aiT <= 0) { e.aiT = 0.5; pathTo(e, t.x, t.y, 1, 600); } followPath(e, def.step * 0.85); }
      return;
    }
  }
  if (e.mode === 'stay') return;
  const d = U.cheb(e.x, e.y, P.x, P.y);
  if (d > 24) { const p = World.findWalkableNear(P.x, P.y, 3); if (p) placeEnt(e, p[0], p[1]); return; }
  if (d > 2 && e.mt >= 1) {
    if (!e.path || !e.path.length || e.aiT <= 0) { e.aiT = 0.4; pathTo(e, P.x, P.y, 1, 800); }
    followPath(e, Math.min(def.step, P.mount ? 0.15 : 0.24) * (d > 5 ? 0.8 : 1));
  }
}

// ---------- NPC vendors ----------
function spawnNPCs() {
  for (const s of World.npcSpawns) {
    const v = VENDORS[s.role];
    const rnd = mulberry32(s.x * 31 + s.y * 7);
    const female = rnd() < 0.45;
    const look = {
      skin: LOOK_OPTIONS.skins[(rnd() * 7) | 0], hair: female ? U.pick(['Long', 'Ponytail', 'Braids', 'Topknot']) : U.pick(['Short', 'Curly', 'Bald', 'Short']),
      hairColor: LOOK_OPTIONS.hairColors[(rnd() * 9) | 0], beard: female ? 'None' : U.pick(['None', 'Full Beard', 'Mustache', 'Goatee']), female,
    };
    const eq = {
      chest: Items.create(s.role === 'mage' ? 'robe' : s.role === 'blacksmith' || s.role === 'miner' ? 'leathertunic' : 'shirt', { dye: v.color }),
      legs: Items.create('trousers', { dye: U.shade(v.color, -0.4) }), feet: Items.create('shoes'),
    };
    if (s.role === 'mage') eq.head = Items.create('wizhat', { dye: v.color });
    if (s.role === 'blacksmith') eq.main = Items.create('smithhammer');
    if (s.role === 'healer') eq.chest = Items.create('robe', { dye: '#efe8d8' });
    const name = randomName();
    const npc = makeEnt({ kind: 'npc', role: s.role, title: v.title, name, x: s.x, y: s.y, look, eq, hp: 100, maxHp: 100, town: s.town, home: [s.x, s.y] });
    npc.face.front = true; npc.face.right = rnd() < 0.5;
    addEnt(npc);
  }
  for (const d of World.decorMobs) {
    const def = MONSTERS[d.mon];
    addEnt(makeEnt({ kind: 'decor', mon: d.mon, def, name: 'Stabled Horse', x: d.x, y: d.y, hp: 1, maxHp: 1, home: [d.x, d.y] }));
  }
}
function updateNPC(e, dt) {
  e.aiT -= dt;
  if (e.aiT <= 0) {
    e.aiT = 4 + Math.random() * 6;
    const P = Game.player;
    if (U.cheb(e.x, e.y, P.x, P.y) <= 3 && U.chance(0.35)) {
      faceToward(e, P);
      Game.say(e, U.pick(['Welcome, traveler!', 'Fine wares today.', 'Looking for something rare?', 'Mind the wilds at night.', 'Come, take a look!', 'Coin for quality.']));
    } else if (U.chance(0.4)) e.face.right = !e.face.right;
  }
}

// ---------- Spawner, chests, corpses ----------
const Spawner = {
  update(dt) {
    const P = Game.player;
    Game.spawnT -= dt;
    if (Game.spawnT <= 0) {
      Game.spawnT = 0.8;
      let near = 0;
      for (let i = Game.ents.length - 1; i >= 0; i--) {
        const e = Game.ents[i];
        if (e.kind !== 'mob') continue;
        const d = U.cheb(e.x, e.y, P.x, P.y);
        if (d > 60 && !e.def.boss) { removeEnt(e); continue; }
        if (d < 40) near++;
      }
      if (near < 42) this.spawnNear(P);
      for (const L of BOSS_LAIRS) {
        const alive = Game.ents.some((e) => e.mon === L.id);
        if (!alive && U.cheb(P.x, P.y, L.x, L.y) < 45 && (Game.bossTimers[L.id] || 0) <= Game.time) {
          const p = World.findWalkableNear(L.x, L.y, 3);
          if (p) { spawnMob(L.id, p[0], p[1]); UI.log(`You sense a dreadful presence near ${L.name}...`, '#ffb84a'); }
        }
      }
    }
    // treasure chests
    Game.chestT -= dt;
    if (Game.chestT <= 0) {
      Game.chestT = 15;
      const nearC = Game.chests.filter((c) => !c.opened && U.cheb(c.x, c.y, P.x, P.y) < 45).length;
      if (nearC < 4) this.spawnChest(P);
      Game.chests = Game.chests.filter((c) => U.cheb(c.x, c.y, P.x, P.y) < 90);
    }
    for (const c of Game.chests) if (c.opened) c.life -= dt;
    Game.chests = Game.chests.filter((c) => !c.opened || c.life > 0);
    for (const c of Game.corpses) c.life -= dt;
    Game.corpses = Game.corpses.filter((c) => c.life > 0);
  },
  randomSpot(P, dmin, dmax) {
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2, d = U.rand(dmin, dmax);
      const x = Math.round(P.x + Math.cos(a) * d), y = Math.round(P.y + Math.sin(a) * d);
      if (!World.inb(x, y) || !World.walkable(x, y) || World.occ[World.idx(x, y)] || World.townAt(x, y) >= 0) continue;
      return [x, y];
    }
    return null;
  },
  spawnNear(P) {
    const p = this.randomSpot(P, 16, 36);
    if (!p) return;
    const [x, y] = p;
    let tier = World.zoneTier(x, y);
    if (tier > 0 && U.chance(0.3)) tier--;
    const list = SPAWNS[World.biome(x, y)][tier];
    const id = U.pick(list);
    const pack = id === 'wolf' || id === 'direwolf' || id === 'bandit' || id === 'skeleton' ? U.randi(1, 3) : 1;
    for (let k = 0; k < pack; k++) {
      const q = k === 0 ? p : World.findWalkableNear(x + U.randi(-2, 2), y + U.randi(-2, 2), 2);
      if (q && World.townAt(q[0], q[1]) < 0) spawnMob(id, q[0], q[1]);
    }
  },
  spawnChest(P) {
    const p = this.randomSpot(P, 14, 38);
    if (!p) return;
    Game.chests.push({ isChest: true, x: p[0], y: p[1], tier: World.zoneTier(p[0], p[1]), opened: false, life: 30 });
  },
};

// ---------- Effects update ----------
function updateEffects(dt) {
  for (const f of Game.effects) {
    f.t += dt;
    if (f.t >= f.dur && f.onHit && !f.hitDone) { f.hitDone = true; f.onHit(); }
  }
  Game.effects = Game.effects.filter((f) => f.t < f.dur);
}
