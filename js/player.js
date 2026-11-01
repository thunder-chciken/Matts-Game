'use strict';
// =====================================================================
//  Player: stats, skills, inventory, equipment, actions, progression
// =====================================================================
const EQUIP_SLOTS = ['head', 'neck', 'chest', 'back', 'hands', 'legs', 'feet', 'main', 'off', 'ring', 'trinket'];
const SLOT_NAMES = { head: 'Head', neck: 'Neck', chest: 'Chest', back: 'Cloak', hands: 'Hands', legs: 'Legs', feet: 'Feet', main: 'Main Hand', off: 'Off Hand', ring: 'Ring', trinket: 'Trinket' };
const MAX_FOLLOWERS = 5;

const Player = {
  get P() { return Game.player; },

  // ---------- Creation ----------
  create(c) {
    const skills = {};
    for (const s of SKILLS) skills[s.id] = { v: 0, lock: 'up' };
    for (const id in c.skills) skills[id].v = c.skills[id];
    const town = TOWNS.find((t) => t.id === c.town) || TOWNS[0];
    const P = makeEnt({
      kind: 'player', name: c.name, look: c.look, stats: Object.assign({}, c.stats), skills, inv: [], eq: {}, bank: [],
      gold: 150, codex: {}, birthsign: c.birthsign, prof: c.prof, home: town.id, titles: [], title: '',
      bounty: null, daily: { last: null, streak: 0 }, buffs: [], kills: {}, playTime: 0, created: Date.now(),
      milestones: [], seals: 0, x: town.x, y: town.y + 2, mount: null, cds: {}, crafted: 0,
    });
    P.face.front = true;
    Game.player = P;
    this.giveStarterKit(c);
    this.recalc();
    P.hp = P.maxHp; P.mana = P.d.maxMana; P.stam = P.d.maxStam;
    return P;
  },
  starterKit(c) {
    const k = [['shirt', { dye: c.look.shirt }], ['trousers', { dye: c.look.pants }], ['shoes', { dye: c.look.boots }]];
    if (c.look.cloak) k.push(['cloak', { dye: c.look.cloak }]);
    const s = c.skills, has = (id, n = 1) => (s[id] || 0) >= n;
    const weap = [['swords', 'longsword'], ['maces', 'mace'], ['fencing', 'rapier'], ['archery', 'shortbow']]
      .filter(([sk]) => has(sk)).sort((a, b) => s[b[0]] - s[a[0]])[0];
    if (weap) k.push([weap[1], {}]);
    if (has('archery')) k.push(['arrow', { qty: 100 }]);
    if (has('parrying')) k.push(['buckler', {}]);
    if (has('magery')) { k.push(['mpot', { qty: 4 }]); if (!weap) k.push(['quarterstaff', {}]); }
    if (has('magery', 40) && !c.look.cloak) k.push(['robe', { dye: c.look.shirt }]);
    if (has('healing')) k.push(['bandage', { qty: 40 }]);
    if (has('mining')) k.push(['pickaxe', {}]);
    if (has('lumberjack')) k.push(['hatchet', {}]);
    if (has('blacksmith')) k.push(['smithhammer', {}], ['ingot_iron', { qty: 30 }]);
    if (has('tailoring')) k.push(['sewingkit', {}], ['cloth_linen', { qty: 25 }], ['hide_plain', { qty: 15 }]);
    if (has('woodwork')) k.push(['saw', {}], ['log_pine', { qty: 30 }]);
    if (has('alchemy')) k.push(['mortar', {}], ['sunleaf', { qty: 12 }], ['moonpetal', { qty: 6 }]);
    if (has('fishing')) k.push(['fishpole', {}]);
    if (has('cooking')) k.push(['fish_trout', { qty: 8 }]);
    if (has('herbalism') && !has('alchemy')) k.push(['mortar', {}]);
    if (has('taming')) k.push(['cook_meat', { qty: 6 }]);
    k.push(['hpot_l', { qty: 3 }], ['cook_meat', { qty: 5 }], ['cache_d', { qty: 1 }]);
    return k;
  },
  giveStarterKit(c) {
    const P = this.P;
    for (const [id, o] of this.starterKit(c)) {
      const it = Items.create(id, o);
      this.add(it, true);
      const b = BASES[id];
      if (b.slot && !P.eq[b.slot] && (b.cat === 'armor' || b.cat === 'weapon' || b.cat === 'shield')) {
        if (b.slot === 'off' && P.eq.main && BASES[P.eq.main.base].twoH) continue;
        this.equip(it, true);
      }
    }
  },

  // ---------- Skills & stats ----------
  skillBase(id) { return this.P.skills[id].v; },
  skill(id) { return this.P.skills[id].v + ((this.P.d && this.P.d.skillB[id]) || 0); },
  skillTotal() { let t = 0; for (const id in this.P.skills) t += this.P.skills[id].v; return U.round1(t); },
  statTotal() { const s = this.P.stats; return s.str + s.dex + s.int; },
  gain(id, difficulty) {
    const P = this.P, s = P.skills[id];
    if (!s || s.lock !== 'up' || s.v >= SKILL_MAX) return;
    let c;
    if (difficulty == null) c = 0.35 * (1 - s.v / 110) + 0.03;
    else {
      const gap = difficulty - s.v;
      c = gap < -30 ? 0.01 : 0.45 * (1 - s.v / 115) * (gap > -12 ? 1 : 0.45) + 0.02;
    }
    if (s.v < 30) c *= 1.6;
    if (!U.chance(c)) return;
    const amt = s.v < 40 ? 0.3 : s.v < 70 ? 0.2 : 0.1;
    if (this.skillTotal() + amt > SKILL_CAP) {
      const down = SKILLS.find((k) => P.skills[k.id].lock === 'down' && P.skills[k.id].v >= amt);
      if (!down) return;
      P.skills[down.id].v = U.round1(P.skills[down.id].v - amt);
    }
    const before = s.v;
    s.v = Math.min(SKILL_MAX, U.round1(s.v + amt));
    const sk = SKILL_BY_ID[id];
    UI.log(`${sk.name} +${amt.toFixed(1)}  (${s.v.toFixed(1)})`, '#ffd94a');
    Game.fx('rise', { x: P.x, y: P.y, color: '#ffd94a', dur: 0.9 });
    Sound.play('skill');
    for (const [n, t] of SKILL_TITLES) if (before < n && s.v >= n && n >= 30) { UI.toast(`${t} ${sk.noun}`, '#ffd94a', `Your ${sk.name} has reached ${n}!`); Sound.play('rare', 3); break; }
    if (U.chance(0.18)) this.statGain(sk.stat);
    UI.dirty('skills'); UI.dirty('char');
  },
  statGain(st) {
    const P = this.P;
    if (P.stats[st] >= STAT_MAX || this.statTotal() >= STAT_CAP) return;
    P.stats[st]++;
    UI.log(`Your ${STAT_INFO[st].name} increases to ${P.stats[st]}.`, STAT_INFO[st].color);
    this.recalc();
  },
  recalc() {
    const P = this.P, b = { skillB: {} };
    const add = (k, v) => { if (k.startsWith('skill_')) { const s = k.slice(6); b.skillB[s] = (b.skillB[s] || 0) + v; } else b[k] = (b[k] || 0) + v; };
    let ar = 0;
    for (const slot of EQUIP_SLOTS) {
      const it = P.eq[slot];
      if (!it) continue;
      const bon = Items.bonuses(it);
      for (const k in bon) add(k, bon[k]);
      const st = Items.stats(it);
      if (st.ar) ar += st.ar;
    }
    const bs = BIRTHSIGNS.find((x) => x.id === P.birthsign);
    if (bs) for (const k in bs.bonus) add(k, bs.bonus[k]);
    for (const bf of P.buffs) for (const k in bf.mods) add(k, bf.mods[k]);
    for (const m of P.milestones) { const ms = CODEX_MILESTONES.find((x) => x.pct === m); if (ms && ms.luck) add('luck', ms.luck); }
    const g = (k) => b[k] || 0;
    const d = {
      str: P.stats.str + g('str'), dex: P.stats.dex + g('dex'), int: P.stats.int + g('int'),
      ar: ar + g('ar'), luck: g('luck'), gold: g('gold'), dmg: g('dmg'), hit: g('hit'), spd: g('spd'), leech: g('leech'),
      fire: g('fire'), regen: g('regen'), mregen: g('mregen'), spell: g('spell'), speed: g('speed'), yield: g('yield'), craft: g('craft'),
      skillB: b.skillB,
    };
    d.maxHp = 40 + Math.floor(d.str * 0.6) + g('hp');
    d.maxMana = 10 + d.int + g('mana');
    d.maxStam = 20 + d.dex;
    d.carry = Math.round(60 + d.str * 3);
    P.d = d; P.maxHp = d.maxHp;
    if (P.hp > P.maxHp) P.hp = P.maxHp;
    if (P.mana > d.maxMana) P.mana = d.maxMana;
    UI.dirty('char');
  },
  weight() { return this.P.inv.reduce((s, it) => s + Items.weight(it), 0); },
  stepTime() {
    const P = this.P;
    let t = P.mount ? 0.13 : 0.23;
    t /= 1 + P.d.speed / 100;
    if (this.weight() > P.d.carry) t *= 1.7;
    if (P.stam <= 0) t *= 1.3;
    return t;
  },
  profile() {
    const P = this.P, d = P.d, w = P.eq.main, wb = w ? BASES[w.base] : null;
    const skillId = wb && wb.skill ? wb.skill : 'wrestling';
    const ws = this.skill(skillId);
    const st = w ? Items.stats(w) : { dmg: [1, 4], spd: 2.0 };
    const mult = (0.6 + this.skill('tactics') / 200 + this.skill('anatomy') / 400 + d.str / 400) * (1 + d.dmg / 100);
    const spd = Math.max(0.8, (st.spd * (1.1 - d.dex / 300)) / (1 + d.spd / 100));
    const off = P.eq.off ? BASES[P.eq.off.base] : null;
    const block = Math.min(0.45, off && off.block ? this.skill('parrying') / 300 + off.block : this.skill('parrying') / 900);
    return { skill: ws, def: ws, dmg: st.dmg, mult, spd, range: st.range || 1, ar: d.ar, hit: d.hit, fire: d.fire, leech: d.leech, block, skillId, ranged: !!st.range };
  },
  onSwing(A, tgt) {
    this.gain(A.skillId, tgt.def ? tgt.def.def : 30);
    this.gain('tactics', tgt.def ? tgt.def.def : 30);
    if (A.skillId !== 'archery' && U.chance(0.5)) this.gain('anatomy', tgt.def ? tgt.def.def : 30);
    this.P.stam = Math.max(0, this.P.stam - 1);
  },
  onHurt(src) {
    const P = this.P;
    P.hurtT = 6;
    if (P.action && P.action.type !== 'bandage') this.cancelAction('You are interrupted!');
    if (src && src.kind === 'mob' && !Game.target) Game.target = src;
  },

  // ---------- Inventory ----------
  add(it, silent) {
    const P = this.P, b = BASES[it.base];
    const disc = Codex.register(P.codex, it);
    if (b.stack) {
      const ex = P.inv.find((x) => x.base === it.base);
      if (ex) ex.qty += it.qty; else P.inv.push(it);
    } else P.inv.push(it);
    if (!silent) {
      if (!b.stack && (it.r || 0) >= 2) {
        UI.toast(Items.name(it), Items.rarityColor(it), RARITY[it.r].name + (it.art ? ' — ' + ARTIFACT_BY_ID[it.art].lore : ''));
        Sound.play('rare', it.r);
        if (it.r >= 2) this.bountyEvent('loot', { r: it.r });
      }
    }
    if (disc) {
      const label = disc === 'new' ? 'New Codex entry' : `New rarity in Codex`;
      UI.log(`${label}: ${Items.name(it)}${disc === 'rarity' ? ' (' + RARITY[it.r].name + ')' : ''}`, '#7fe0ff');
      if (!silent) UI.codexPing();
      this.checkMilestones();
    }
    UI.dirty('inv');
    return true;
  },
  count(baseId) { return this.P.inv.reduce((s, it) => s + (it.base === baseId ? it.qty || 1 : 0), 0); },
  remove(baseId, n) {
    const P = this.P;
    for (let i = P.inv.length - 1; i >= 0 && n > 0; i--) {
      const it = P.inv[i];
      if (it.base !== baseId) continue;
      const q = it.qty || 1;
      if (q > n) { it.qty -= n; n = 0; } else { P.inv.splice(i, 1); n -= q; }
    }
    UI.dirty('inv');
  },
  removeItem(it) { const i = this.P.inv.indexOf(it); if (i >= 0) this.P.inv.splice(i, 1); UI.dirty('inv'); },
  findTool(skill) {
    const P = this.P, cands = [];
    if (P.eq.main && BASES[P.eq.main.base].tool === skill) cands.push(P.eq.main);
    for (const it of P.inv) if (BASES[it.base].tool === skill) cands.push(it);
    cands.sort((a, b) => Items.power(b) - Items.power(a));
    return cands[0] || null;
  },
  useTool(tool) {
    if (!tool || tool.uses == null) return;
    tool.uses--;
    if (tool.uses <= 0) {
      UI.log(`Your ${Items.name(tool)} breaks!`, '#ff8a7a');
      const P = this.P;
      if (P.eq.main === tool) { delete P.eq.main; this.recalc(); } else this.removeItem(tool);
    }
  },
  toolBonus(tool, skill) {
    if (!tool) return { skill: 0, yield: 0, luck: 0 };
    // an equipped tool's bonuses are already part of the player's derived stats
    if (this.P.eq.main === tool) return { skill: 0, yield: 0, luck: 0 };
    const b = Items.bonuses(tool);
    return { skill: b['skill_' + skill] || 0, yield: b.yield || 0, luck: b.luck || 0 };
  },
  equip(it, silent) {
    const P = this.P, b = BASES[it.base];
    if (!b.slot) return false;
    if (b.slot === 'off' && P.eq.main && BASES[P.eq.main.base].twoH) this.unequip('main', true);
    if (b.slot === 'main' && b.twoH && P.eq.off) this.unequip('off', true);
    if (P.eq[b.slot]) this.unequip(b.slot, true);
    this.removeItem(it);
    P.eq[b.slot] = it;
    if (!silent) Sound.play('pickup');
    this.recalc(); UI.dirty('inv'); UI.dirty('char');
    return true;
  },
  unequip(slot, silent) {
    const P = this.P, it = P.eq[slot];
    if (!it) return;
    delete P.eq[slot];
    P.inv.push(it);
    if (!silent) Sound.play('click');
    this.recalc(); UI.dirty('inv'); UI.dirty('char');
  },

  // ---------- Using items ----------
  use(it) {
    const P = this.P, b = BASES[it.base];
    if (P.dead) return;
    if (b.slot && (b.cat === 'weapon' || b.cat === 'armor' || b.cat === 'shield' || b.cat === 'jewelry')) { this.equip(it); return; }
    if (b.sub === 'bandage') { this.startBandage(); return; }
    if (b.tool) { UI.log(`Use the ${b.name} by clicking on a ${({ mining: 'rock', lumberjack: 'tree', fishing: 'water tile' })[b.tool] || 'crafting station'}. Open crafting with [U].`, '#ccc'); if (CRAFT_SKILLS.some((c) => c.tool === b.tool)) UI.openCraft(b.tool); return; }
    const u = b.use;
    if (!u) { UI.log(`You can't use that.`, '#aaa'); return; }
    if (u.cache) {
      const out = Items.openCache(it.base, P.d.luck, P);
      if (it.qty > 1) it.qty--; else this.removeItem(it);
      Sound.play('open');
      if (out.gold) this.addGold(out.gold);
      for (const x of out.items) this.add(x);
      if (out.items[0] && (out.items[0].r || 0) < 2) UI.toast(Items.name(out.items[0]), Items.rarityColor(out.items[0]), 'From your ' + b.name);
      return;
    }
    if (u.potion) {
      const k = 'pot_' + u.potion;
      if ((P.cds[k] || 0) > Game.time) { UI.log(`You must wait ${Math.ceil(P.cds[k] - Game.time)}s before drinking another.`, '#aaa'); return; }
      P.cds[k] = Game.time + 10;
    }
    if (u.heal) heal(P, u.heal);
    if (u.mana) { P.mana = Math.min(P.d.maxMana, P.mana + u.mana); Game.text(P, '+' + u.mana + ' mana', '#7aa8ff', 10); }
    if (u.buff) this.addBuff(b.name, u.buff, u.dur, b.color);
    if (u.food) UI.log(`You eat the ${b.name}. Delicious!`, '#d8c8a0'); else Sound.play('heal');
    if (it.qty > 1) it.qty--; else this.removeItem(it);
    UI.dirty('inv'); UI.dirty('hotbar');
  },
  addBuff(name, mods, dur, color) {
    const P = this.P;
    P.buffs = P.buffs.filter((b) => b.name !== name && !(b.food && mods.regen && name.match(/Meat|Trout|Bass|Salmon|Swordfish|Glowfin/)));
    P.buffs.push({ name, mods, t: dur, dur, color });
    UI.log(`${name}: ${Object.entries(mods).map(([k, v]) => '+' + v + ' ' + (AFFIXES[k] ? AFFIXES[k].label.replace(/\+?\{v\}%?\s?/, '') : k)).join(', ')} for ${Math.round(dur / 60)} min`, color || '#9ad8ff');
    this.recalc();
  },
  addGold(n) {
    if (n <= 0) return;
    this.P.gold += n;
    Game.text(this.P, '+' + n + 'g', '#ffd94a', 10, 64);
    Sound.play('coin');
    UI.dirty('gold');
  },
  adoptPet(mon, name) {
    const P = this.P, def = MONSTERS[mon];
    const p = World.findWalkableNear(P.x + 1, P.y + 1, 4) || [P.x, P.y];
    const e = makeEnt({ kind: 'pet', mon, def, name: name || def.name, x: p[0], y: p[1], hp: def.hp, maxHp: def.hp, mode: 'follow', home: p });
    addEnt(e);
    this.recalcFollowers();
    return e;
  },
  followers() {
    let n = 0;
    for (const e of Game.ents) if (e.kind === 'pet') n += e.def.tame ? e.def.tame.slots : 1;
    if (this.P.mount) n += 1;
    return n;
  },
  recalcFollowers() { UI.dirty('pets'); },

  // ---------- Actions ----------
  startAction(a) {
    const P = this.P;
    if (P.dead) return;
    P.action = Object.assign({ t: 0 }, a);
    P.path = null; P.pathGoal = null;
  },
  cancelAction(msg) {
    const P = this.P;
    if (!P.action) return;
    if (msg) UI.log(msg, '#aaa');
    if (P.action.type === 'cast') P.castT = 0;
    P.action = null;
    Craft.queue = null; UI.dirty('craft');
  },

  // Decide what clicking a pick should do
  interact(pk, alt) {
    const P = this.P;
    if (P.dead) return;
    if (pk.kind === 'ent') {
      const e = pk.ref;
      if (e.kind === 'npc') { this.goDo(e.x, e.y, 2, () => UI.openVendor(e)); return; }
      if (e.kind === 'pet') {
        if (e.def.mount && !P.mount) { this.goDo(e.x, e.y, 1, () => this.mount(e)); return; }
        UI.openPets(); return;
      }
      if (e.kind === 'mob') {
        if (alt === 'tame') { this.tryTame(e); return; }
        Game.target = e; P.combat = true; P.pending = { type: 'attack', ent: e };
        P.action = null; return;
      }
      return;
    }
    if (pk.kind === 'corpse') { this.goDo(pk.ref.x, pk.ref.y, 2, () => UI.openLoot(pk.ref)); return; }
    if (pk.kind === 'chest') {
      const c = pk.ref; if (c.opened) return;
      this.goDo(c.x, c.y, 1, () => this.startAction({ type: 'chest', dur: 2.2, chest: c, label: 'Opening chest...' }));
      return;
    }
    if (pk.kind === 'obj') {
      const o = pk.ref, x = pk.tx, y = pk.ty;
      switch (o.t) {
        case 'rock': case 'boulder': this.goDo(x, y, 1, () => this.beginGather('mining', x, y)); return;
        case 'tree': if (o.deco) { UI.log('That tree is part of the town.', '#aaa'); return; } this.goDo(x, y, 1, () => this.beginGather('lumberjack', x, y)); return;
        case 'bush': this.goDo(x, y, 1, () => this.beginGather('herbalism', x, y)); return;
        case 'forge': this.goDo(x, y, 2, () => UI.openCraft('mining')); return;
        case 'anvil': this.goDo(x, y, 2, () => UI.openCraft('blacksmith')); return;
        case 'oven': this.goDo(x, y, 2, () => UI.openCraft('cooking')); return;
        case 'board': this.goDo(x, y, 2, () => UI.openBounties()); return;
        case 'shrine': this.goDo(x, y, 2, () => { heal(P, P.maxHp); P.mana = P.d.maxMana; UI.log('The shrine restores you.', '#9ad8ff'); Sound.play('heal'); }); return;
        case 'well': UI.log('The water is cool and clear.', '#9ad8ff'); return;
      }
    }
  },
  clickGround(x, y) {
    const P = this.P;
    if (P.dead) return;
    if (World.isWater(x, y) && U.cheb(P.x, P.y, x, y) <= 6 && this.findTool('fishing')) { this.beginGather('fishing', x, y); return; }
    this.cancelAction(); P.pending = null;
    if (World.walkable(x, y)) { pathTo(P, x, y, 0, 4000); P.pathGoal = [x, y]; }
    else { pathTo(P, x, y, 1, 4000); P.pathGoal = [x, y]; }
  },
  goDo(x, y, range, fn) {
    const P = this.P;
    this.cancelAction();
    if (U.cheb(P.x, P.y, x, y) <= range && P.mt >= 1) { fn(); return; }
    P.pending = { type: 'goto', x, y, range, fn };
    pathTo(P, x, y, range, 4000);
    P.pathGoal = null;
  },

  beginGather(skill, x, y) {
    const P = this.P;
    const tool = skill === 'herbalism' ? null : this.findTool(skill);
    if (skill !== 'herbalism' && !tool) { UI.log(`You need a ${({ mining: 'pickaxe', lumberjack: 'hatchet', fishing: 'fishing pole' })[skill]} for that.`, '#ff8a7a'); return; }
    const n = World.nodes.get(x + ',' + y);
    if (skill !== 'fishing' && n && n.left <= 0) { UI.log(skill === 'mining' ? 'There is no ore left here.' : skill === 'lumberjack' ? 'There is no usable wood left here.' : 'This plant has been picked clean.', '#aaa'); return; }
    faceToward(P, { x, y });
    const dur = skill === 'fishing' ? 2.6 : skill === 'herbalism' ? 1.4 : 1.5;
    this.startAction({ type: 'gather', skill, x, y, dur: dur * (1 - Math.min(0.3, this.skill(skill) / 400)), anim: skill === 'mining' || skill === 'lumberjack' ? skill : null, label: ({ mining: 'Mining', lumberjack: 'Chopping', fishing: 'Fishing', herbalism: 'Harvesting' })[skill] + '...' });
    if (skill === 'fishing') Game.fx('ring', { x, y, color: '#ffffff', dur: 1, r: 18 });
  },
  finishGather(a) {
    const P = this.P, sk = a.skill;
    const tool = sk === 'herbalism' ? null : this.findTool(sk);
    const tb = this.toolBonus(tool, sk);
    const skill = this.skill(sk) + tb.skill;
    const luck = P.d.luck + tb.luck;
    const key = a.x + ',' + a.y;
    let node = World.nodes.get(key);
    if (sk !== 'fishing') {
      if (!node) { node = { left: sk === 'mining' ? U.randi(8, 14) : sk === 'lumberjack' ? U.randi(6, 10) : 3, regen: 0 }; World.nodes.set(key, node); }
      if (node.left <= 0) { this.cancelAction(); return; }
    }
    const doubled = () => U.chance((P.d.yield + tb.yield) / 100);
    let got = null, qty = 1, diff = 20;
    if (sk === 'mining' || sk === 'lumberjack') {
      Sound.play(sk === 'mining' ? 'mine' : 'chop');
      if (!U.chance(0.55 + skill / 220)) { UI.log(sk === 'mining' ? 'You loosen some rocks but find nothing useful.' : 'You hack at the tree but get nothing usable.', '#aaa'); this.gain(sk, 20); this.useTool(tool); return true; }
      const list = sk === 'mining' ? MATS.metal : MATS.wood;
      let mat = list[0];
      for (let i = list.length - 1; i > 0; i--) {
        const m = list[i];
        if (skill >= m.req && U.chance(0.1 + (skill - m.req) / 200 + luck / 1500)) { mat = m; break; }
      }
      got = (sk === 'mining' ? 'ore_' : 'log_') + mat.id;
      qty = U.randi(1, 2) + (doubled() ? 1 : 0);
      diff = mat.req + 12;
      node.left--;
      if (sk === 'mining' && U.chance(0.03 + luck / 2000)) {
        const gems = GEMS.filter((g) => g[3] <= skill + 15);
        const g = gems[gems.length - 1 - Math.floor(Math.pow(Math.random(), 0.5) * gems.length)] || GEMS[0];
        this.add(Items.create('gem_' + g[0]));
        UI.log(`You found a ${g[1]}!`, g[2]);
      }
    } else if (sk === 'herbalism') {
      const o = World.objAt(a.x, a.y), req = BASES[o.herb].req;
      if (!U.chance(U.clamp(0.5 + (skill - req) / 80, 0.12, 0.97))) { UI.log('You damage the plant and get nothing.', '#aaa'); this.gain(sk, req + 10); node.left--; if (node.left <= 0) node.regen = Game.time + 180; this.cancelAction(); return; }
      got = o.herb; qty = U.randi(1, 2) + Math.floor(skill / 45) + (doubled() ? 1 : 0); diff = req + 15;
      node.left--;
      Sound.play('pickup');
    } else if (sk === 'fishing') {
      Sound.play('splash');
      const deep = World.groundAt(a.x, a.y) === G.DEEP;
      const r = Math.random();
      if (r < 0.012 * (1 + luck / 100)) { got = 'coffer'; UI.log('You haul up a barnacle-crusted Sunken Coffer!', '#5ad8c8'); diff = 60; }
      else if (r < 0.07) { got = 'oldboot'; diff = 10; }
      else {
        if (!U.chance(0.5 + skill / 200)) { UI.log('Nothing bites...', '#aaa'); this.gain(sk, 15); this.useTool(tool); return true; }
        let pick = FISH[0];
        for (let i = FISH.length - 1; i > 0; i--) {
          const f = FISH[i];
          if (f[3] >= 65 && !deep) continue;
          if (skill >= f[3] && U.chance(0.12 + (skill - f[3]) / 180 + luck / 1500)) { pick = FISH[i]; break; }
        }
        got = 'fish_' + pick[0]; diff = pick[3] + 12;
        qty = doubled() ? 2 : 1;
        if (U.chance(0.02 + luck / 3000)) { this.add(Items.create('tr_crab')); UI.log('Something shiny was tangled in your line!', '#ff9a8a'); }
      }
    }
    if (got) {
      const it = Items.create(got, { qty });
      this.add(it);
      UI.log(`You put ${qty > 1 ? qty + ' ' : 'a '}${BASES[got].name} in your pack.`, '#c8e0b0');
      Game.text(P, `+${qty} ${BASES[got].name}`, BASES[got].color, 10, 60);
      this.bountyEvent('gather', { skill: sk, n: qty });
    }
    this.gain(sk, diff);
    this.useTool(tool);
    if (node && node.left <= 0) {
      node.regen = Game.time + (sk === 'herbalism' ? 180 : 300);
      UI.log(sk === 'mining' ? 'The vein is exhausted.' : sk === 'lumberjack' ? 'You have chopped all the usable wood.' : 'The plant is picked clean.', '#aaa');
      this.cancelAction();
      return false;
    }
    if (this.weight() > P.d.carry * 1.25) { UI.log('Your pack is too heavy to carry more.', '#ff8a7a'); this.cancelAction(); return false; }
    return true; // repeat
  },

  tryTame(e) {
    const P = this.P, def = e.def;
    if (!def.tame) { UI.log('That creature cannot be tamed.', '#aaa'); return; }
    const skill = this.skill('taming');
    if (skill < def.tame.diff - 25) { UI.log(`You have no chance of taming that (needs ~${def.tame.diff} Animal Taming).`, '#ff8a7a'); return; }
    if (this.followers() + def.tame.slots > MAX_FOLLOWERS) { UI.log('You have too many followers to control another.', '#ff8a7a'); return; }
    this.goDo(e.x, e.y, 4, () => this.startAction({ type: 'tame', ent: e, dur: 5.4, stage: 0, label: 'Taming ' + def.name + '...' }));
  },
  finishTame(a) {
    const P = this.P, e = a.ent, def = e.def;
    if (e.dead || !Game.ents.includes(e)) return;
    const skill = this.skill('taming');
    const c = U.clamp(0.4 + (skill - def.tame.diff) / 40, 0.03, 0.95);
    this.gain('taming', def.tame.diff + 5);
    if (U.chance(c)) {
      e.kind = 'pet'; e.mode = 'follow'; e.target = null; e.hostileTo = false; e.hp = e.maxHp; e.path = null;
      if (Game.target === e) Game.target = null;
      UI.log(`The ${def.name} accepts you as its master!`, '#7aff9a');
      UI.toast(`Tamed: ${def.name}`, '#7aff9a', def.mount ? 'Click it to ride!' : 'It will follow and fight for you.');
      Game.fx('ring', { x: e.x, y: e.y, color: '#7aff9a', dur: 0.9 });
      Sound.play('tame');
      this.recalcFollowers();
    } else {
      UI.log(`You fail to tame the ${def.name}.`, '#ff8a7a');
      if (!def.passive && U.chance(0.35)) { e.target = P; e.hostileTo = true; Game.say(e, 'Grrr!', '#ff8a7a'); }
    }
  },
  mount(e) {
    const P = this.P;
    if (P.mount) return;
    P.mount = { mon: e.mon, name: e.name, hp: e.hp };
    removeEnt(e);
    UI.log(`You mount ${e.name}.`, '#d8c8a0'); Sound.play('click');
    UI.dirty('pets');
  },
  dismount() {
    const P = this.P;
    if (!P.mount) return;
    const m = P.mount;
    P.mount = null;
    const pet = this.adoptPet(m.mon, m.name);
    pet.hp = Math.max(1, m.hp || pet.maxHp);
    UI.log(`You dismount ${m.name}.`, '#d8c8a0');
  },

  startBandage() {
    const P = this.P;
    if (!this.count('bandage')) { UI.log('You have no bandages.', '#ff8a7a'); return; }
    if (P.action && P.action.type === 'bandage') return;
    let tgt = P;
    if (Game.target && Game.target.kind === 'pet' && U.cheb(P.x, P.y, Game.target.x, Game.target.y) <= 2) tgt = Game.target;
    if (tgt.hp >= tgt.maxHp) { UI.log(tgt === P ? 'You are not wounded.' : `${tgt.name} is not wounded.`, '#aaa'); return; }
    this.remove('bandage', 1);
    P.bandage = { t: 0, dur: Math.max(2, 5.5 - P.d.dex / 35), tgt };
    UI.log(tgt === P ? 'You begin applying a bandage.' : `You begin bandaging ${tgt.name}.`, '#d8e8c8');
  },
  finishBandage(b) {
    const t = b.tgt;
    if (t.dead) return;
    const amt = Math.round(6 + this.skill('healing') * 0.35 + this.skill('anatomy') * 0.15 + U.rand(0, 6));
    heal(t, amt);
    Sound.play('heal');
    this.gain('healing', 40); this.gain('anatomy', 40);
  },

  castSpell(i) {
    const P = this.P, sp = SPELLS[i];
    if (!sp || P.dead) return;
    const sk = this.skill('magery');
    if (sk < sp.req - 10) { UI.log(`${sp.name} requires ${sp.req} Magery.`, '#ff8a7a'); return; }
    if (P.mana < sp.mana) { UI.log('Not enough mana.', '#7aa8ff'); return; }
    if (P.action && P.action.type === 'cast') return;
    let tgt = null;
    if (sp.kind !== 'heal') {
      tgt = Game.target && Game.target.kind === 'mob' && !Game.target.dead ? Game.target : this.nearestHostile(10);
      if (!tgt) { UI.log('No target in range.', '#aaa'); return; }
      if (U.cheb(P.x, P.y, tgt.x, tgt.y) > 10) { UI.log('That is too far away.', '#aaa'); return; }
      Game.target = tgt; P.combat = true;
    } else tgt = Game.target && Game.target.kind === 'pet' && U.cheb(P.x, P.y, Game.target.x, Game.target.y) <= 8 ? Game.target : P;
    P.path = null; P.pending = null;
    this.startAction({ type: 'cast', spell: sp, tgt, dur: sp.cast * (1 - Math.min(0.3, P.d.dex / 400)), label: sp.name });
    P.castT = 1;
    Sound.play('spell');
    Game.say(P, sp.name + '!', sp.color);
  },
  finishCast(a) {
    const P = this.P, sp = a.spell, t = a.tgt;
    P.castT = 0;
    const sk = this.skill('magery');
    P.mana -= sp.mana;
    this.gain('magery', sp.req + 20);
    if (U.chance(U.clamp((sp.req + 15 - sk) / 60, 0, 0.6))) { UI.log('The spell fizzles.', '#aaa'); Game.fx('burst', { x: P.x, y: P.y, color: '#888', n: 8, dur: 0.5 }); return; }
    const pow = 1 + sk / 150 + P.d.int / 300 + P.d.spell / 100;
    if (sp.kind === 'heal') {
      heal(t, Math.round(U.randi(sp.heal[0], sp.heal[1]) * pow));
      Game.fx('rise', { x: t.x, y: t.y, color: sp.color, dur: 1 }); Sound.play('heal');
      return;
    }
    if (t.dead || !Game.ents.includes(t)) return;
    const dmgRoll = () => Math.round(U.randi(sp.dmg[0], sp.dmg[1]) * pow);
    if (sp.kind === 'bolt') {
      shoot(P, t, { color: sp.color, size: 7, onHit: () => { if (!t.dead) { damage(t, dmgRoll(), P, sp.color); if (sp.slow) t.slowT = 4; } } });
    } else if (sp.kind === 'chain') {
      const hits = [t, ...Game.ents.filter((e) => e.kind === 'mob' && e !== t && !e.dead && U.cheb(e.x, e.y, t.x, t.y) <= 4).slice(0, 2)];
      let prev = P;
      for (const h of hits) { const [sx, sy] = Render.visPos(prev), [tx, ty] = Render.visPos(h); Game.fx('bolt', { sx, sy, tx, ty, color: sp.color, dur: 0.4 }); damage(h, dmgRoll(), P, sp.color); prev = h; }
      Sound.play('hit');
    } else if (sp.kind === 'aoe') {
      const cx = t.x, cy = t.y;
      Game.fx('meteor', { x: cx, y: cy, dur: 1.0, onHit: () => {
        for (const e of Game.ents.slice()) if (e.kind === 'mob' && !e.dead && U.cheb(e.x, e.y, cx, cy) <= sp.radius) damage(e, dmgRoll(), P, sp.color);
        Sound.play('hit');
      } });
    }
  },
  nearestHostile(r) {
    const P = this.P;
    let best = null, bd = 1e9;
    for (const e of Game.ents) {
      if (e.kind !== 'mob' || e.dead) continue;
      const d = U.cheb(e.x, e.y, P.x, P.y);
      if (d <= r && d < bd && (e.hostileTo || e.def.aggro)) { bd = d; best = e; }
    }
    return best;
  },
  openChest(c) {
    const P = this.P;
    c.opened = true; c.life = 30;
    const tier = c.tier;
    const items = [], n = U.randi(1, 2) + (tier >= 2 ? 1 : 0);
    for (let k = 0; k < n; k++) items.push(Items.randomGear(tier, P.d.luck + 15, U.chance(0.3) ? 1 : 0));
    if (U.chance(0.4)) items.push(Items.create('gem_' + U.pick(GEMS.slice(0, tier + 3))[0]));
    if (U.chance(0.25)) items.push(Items.create(U.pick(['hpot', 'mpot', 'elixir_swift', 'elixir_might'])));
    if (U.chance(0.03 + tier * 0.01)) items.push(Items.create('cache_c'));
    const gold = Math.round(U.randi(20, 60) * (tier + 1) * (1 + P.d.gold / 100));
    const corpse = { id: Game.nextId++, x: c.x, y: c.y, items, gold, life: 0.01, name: 'Treasure Chest', bestR: 0, isChestLoot: true };
    Sound.play('open');
    Game.fx('burst', { x: c.x, y: c.y, color: '#ffd94a', n: 16, dur: 0.8 });
    this.bountyEvent('chest', {});
    UI.openLoot(corpse);
  },
  lootCorpse(c, auto) {
    if (c.gold) { this.addGold(c.gold); c.gold = 0; }
    for (const it of c.items.slice()) this.take(c, it, auto);
    UI.dirty('loot');
  },
  take(c, it) {
    const i = c.items.indexOf(it);
    if (i < 0) return;
    c.items.splice(i, 1);
    this.add(it);
    if (!BASES[it.base].stack && (it.r || 0) < 2) Sound.play('pickup');
    c.bestR = c.items.reduce((m, x) => Math.max(m, BASES[x.base].stack ? 0 : (x.r || 0)), 0);
    UI.dirty('loot');
  },

  // ---------- Death ----------
  die() {
    const P = this.P;
    if (P.dead) return;
    P.dead = true; P.hp = 0; P.action = null; P.path = null; P.pending = null; P.bandage = null;
    Game.target = null;
    for (const e of Game.ents) if (e.target === P) e.target = null;
    const lost = Math.floor(P.gold * 0.1);
    P.gold -= lost;
    Sound.play('death');
    UI.showDeath(lost);
  },
  respawn() {
    const P = this.P;
    const town = World.nearestTown(P.x, P.y);
    const sh = World.shrines.find((s) => s.town === town.index) || World.shrines[0];
    const p = World.findWalkableNear(sh.x, sh.y, 4);
    placeEnt(P, p[0], p[1]);
    P.dead = false; P.hp = Math.round(P.maxHp * 0.6); P.mana = Math.round(P.d.maxMana * 0.5);
    for (const e of Game.ents) if (e.kind === 'pet') { const q = World.findWalkableNear(P.x, P.y, 4); if (q) placeEnt(e, q[0], q[1]); e.target = null; }
    Game.fx('ring', { x: P.x, y: P.y, color: '#9ad8ff', dur: 1.2 });
    UI.log(`You awaken at the shrine of ${town.name}.`, '#9ad8ff');
  },

  // ---------- Per-frame update ----------
  update(dt) {
    const P = this.P;
    P.playTime += dt;
    if (P.dead) return;
    const d = P.d;
    if (P.hurtT > 0) P.hurtT -= dt;
    const calm = !(P.hurtT > 0);
    const still = P.mt >= 1 && !P.path;
    P.hp = Math.min(P.maxHp, P.hp + (0.12 + d.regen * 0.25) * (calm ? 3 : 1) * dt);
    P.mana = Math.min(d.maxMana, P.mana + (0.25 + this.skill('meditation') / 35 + d.mregen * 0.35) * (still ? 1.6 : 1) * dt);
    P.stam = Math.min(d.maxStam, P.stam + 3 * dt);
    if (Math.random() < dt * 0.25 && still && this.skill('meditation') < 100 && P.mana < d.maxMana * 0.9) this.gain('meditation', 40);
    // buffs
    let changed = false;
    for (const b of P.buffs) { b.t -= dt; if (b.t <= 0) { changed = true; UI.log(`${b.name} wears off.`, '#aaa'); } }
    if (changed) { P.buffs = P.buffs.filter((b) => b.t > 0); this.recalc(); }
    // nodes regrow
    if (Math.random() < dt) for (const [k, n] of World.nodes) if (n.left <= 0 && n.regen && n.regen < Game.time) World.nodes.delete(k);
    // bandage (can walk while bandaging)
    if (P.bandage) { P.bandage.t += dt; if (P.bandage.t >= P.bandage.dur) { const b = P.bandage; P.bandage = null; this.finishBandage(b); } }
    // action progress
    const a = P.action;
    if (a) {
      a.t += dt;
      if (a.type === 'tame' && a.t > (a.stage + 1) * 1.8 && a.stage < 2) {
        a.stage++;
        Game.say(P, U.pick(["Easy now...", "I won't hurt you.", 'Steady...', 'Good creature.', "That's it..."]), '#d8ffd8');
      }
      if (a.type === 'tame' && (a.ent.dead || U.cheb(P.x, P.y, a.ent.x, a.ent.y) > 6)) { this.cancelAction('The creature is too far away.'); }
      else if (a.t >= a.dur) {
        if (a.type === 'gather') {
          const again = this.finishGather(a);
          if (again && Settings.autoRepeat && P.action === a) a.t = 0; else if (P.action === a) P.action = null;
        } else {
          P.action = null;
          if (a.type === 'cast') this.finishCast(a);
          else if (a.type === 'tame') this.finishTame(a);
          else if (a.type === 'chest') this.openChest(a.chest);
          else if (a.type === 'craft') Craft.finishOne();
        }
      }
    }
    // pending goto / attack
    const pd = P.pending;
    if (pd && pd.type === 'goto' && P.mt >= 1) {
      if (U.cheb(P.x, P.y, pd.x, pd.y) <= pd.range) { P.pending = null; P.path = null; pd.fn(); }
      else if (!P.path || !P.path.length) { P.pending = null; UI.log("You can't reach that.", '#aaa'); }
    }
    // combat
    P.swingT -= dt;
    const t = Game.target;
    if (t && (t.dead || !Game.ents.includes(t))) { Game.target = null; P.pending = null; }
    else if (t && t.kind === 'mob' && P.combat) {
      const prof = this.profile();
      const dist = U.cheb(P.x, P.y, t.x, t.y);
      const inRange = dist <= prof.range;
      if (inRange && P.mt >= 1 && (!P.action || P.action.type === 'craft')) {
        if (P.pending && P.pending.type === 'attack') { P.pending = null; P.path = null; }
        if (P.swingT <= 0 && P.stam > 0) {
          P.swingT = prof.spd;
          if (prof.ranged) {
            if (!this.count('arrow')) { if (!P.noArrowMsg) UI.log('You have no arrows!', '#ff8a7a'); P.noArrowMsg = true; }
            else {
              P.noArrowMsg = false;
              this.remove('arrow', 1);
              P.atkAnim = 0; faceToward(P, t);
              shoot(P, t, { arrow: true, onHit: () => { if (!t.dead) attack(P, t); } });
              P.atkAnim = 0;
            }
          } else attack(P, t);
          UI.dirty('hotbar');
        }
      } else if (P.pending && P.pending.type === 'attack' && P.mt >= 1) {
        if (!P.path || !P.path.length || (P.repathT = (P.repathT || 0) - dt) <= 0) { P.repathT = 0.5; pathTo(P, t.x, t.y, prof.range, 1500); }
      }
    }
    // move
    if (P.mt >= 1 && P.path && P.path.length) {
      if (P.action && P.action.type !== 'craft') this.cancelAction();
      followPath(P, this.stepTime());
      if (!P.path || !P.path.length) P.pathGoal = null;
    }
    if (P.mt >= 1 && P.lastTown !== World.townAt(P.x, P.y)) {
      const ti = World.townAt(P.x, P.y);
      if (ti >= 0) UI.banner(TOWNS[ti].name, 'You are safe within the town walls.');
      else if (P.lastTown >= 0) UI.banner('The Wilds', 'Danger: ' + ['Low', 'Moderate', 'High', 'Deadly'][World.zoneTier(P.x, P.y)]);
      P.lastTown = ti;
    }
  },

  // ---------- Codex milestones, titles ----------
  checkMilestones() {
    const P = this.P, pct = Codex.pct(P.codex);
    for (const m of CODEX_MILESTONES) {
      if (pct >= m.pct && !P.milestones.includes(m.pct)) {
        P.milestones.push(m.pct);
        P.titles.push(m.title);
        this.addGold(m.gold);
        UI.toast(`Codex ${m.pct}%: "${m.title}"`, '#7fe0ff', `+${m.gold} gold${m.luck ? ', +' + m.luck + ' permanent Luck' : ''}. New title unlocked!`);
        Sound.play('rare', 4);
        this.recalc();
      }
    }
  },
  bestTitle() {
    const P = this.P;
    let best = null;
    for (const s of SKILLS) { const v = P.skills[s.id].v; if (!best || v > best.v) best = { v, s }; }
    return best ? `${skillTitle(best.v)} ${best.s.noun}` : '';
  },
  displayTitle() { const P = this.P; return P.title || this.bestTitle(); },

  // ---------- Bounties & daily ----------
  ensureBounties() {
    const P = this.P, day = U.dayKey();
    if (P.bounty && P.bounty.day === day) return;
    const rnd = mulberry32(parseInt(day.replace(/-/g, ''), 10) + P.name.length * 977);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const list = [], used = new Set();
    while (list.length < 3) {
      const tpl = pick(BOUNTY_TEMPLATES);
      const key = tpl.type + (tpl.skill || '') + tpl.tier;
      if (used.has(key)) continue;
      used.add(key);
      const n = tpl.n[0] + Math.floor(rnd() * (tpl.n[1] - tpl.n[0] + 1));
      const b = { type: tpl.type, n, have: 0, tier: tpl.tier, claimed: false, skill: tpl.skill, rarity: tpl.rarity };
      if (tpl.mobs) b.mob = pick(tpl.mobs);
      b.text = tpl.text.replace('{n}', n).replace('{mob}', b.mob ? MONSTERS[b.mob].name + (n > 1 ? 's' : '') : '');
      b.gold = Math.round((80 + tpl.tier * 120) * (1 + n / 20));
      b.seals = tpl.tier;
      list.push(b);
    }
    P.bounty = { day, list };
    UI.dirty('bounty');
  },
  bountyEvent(type, data) {
    const P = this.P;
    if (!P.bounty) return;
    for (const b of P.bounty.list) {
      if (b.claimed || b.have >= b.n || b.type !== type) continue;
      let inc = 0;
      if (type === 'kill' && b.mob === data.mon) inc = 1;
      else if (type === 'gather' && b.skill === data.skill) inc = data.n;
      else if (type === 'craft') inc = data.n || 1;
      else if (type === 'loot' && data.r >= b.rarity) inc = 1;
      else if (type === 'chest') inc = 1;
      if (!inc) continue;
      b.have = Math.min(b.n, b.have + inc);
      if (b.have >= b.n) { UI.toast('Bounty complete!', '#ffd94a', b.text + ' — claim it at any Bounty Board or with [B].'); Sound.play('rare', 2); }
      UI.dirty('bounty');
    }
  },
  claimBounty(i) {
    const P = this.P, b = P.bounty.list[i];
    if (!b || b.claimed || b.have < b.n) return;
    b.claimed = true;
    this.addGold(b.gold);
    P.seals += b.seals;
    this.add(Items.create(b.tier >= 2 ? 'cache_c' : 'cache_d'));
    UI.log(`Bounty claimed: +${b.gold} gold, +${b.seals} Bounty Seal${b.seals > 1 ? 's' : ''}.`, '#ffd94a');
    Sound.play('rare', 2);
    UI.dirty('bounty');
  },
  dailyAvailable() { return this.P.daily.last !== U.dayKey(); },
  claimDaily() {
    const P = this.P, today = U.dayKey();
    if (P.daily.last === today) return;
    const gap = P.daily.last ? U.daysBetween(P.daily.last, today) : 99;
    P.daily.streak = gap === 1 ? P.daily.streak + 1 : 1;
    P.daily.last = today;
    const s = P.daily.streak;
    const gold = 100 * Math.min(s, 7);
    this.addGold(gold);
    const cache = s % 7 === 0 ? 'cache_g' : s % 3 === 0 ? 'cache_c' : 'cache_d';
    this.add(Items.create(cache));
    if (s >= 5) P.seals += 1;
    UI.toast(`Daily Gift — Day ${s} streak!`, '#7fe08a', `+${gold} gold and a ${BASES[cache].name}${s >= 5 ? ' and a Bounty Seal' : ''}. Come back tomorrow for more!`);
    Sound.play('rare', 3);
    UI.dirty('bounty');
  },
  buySeal(entry) {
    const P = this.P;
    if (P.seals < entry.cost) { UI.log('Not enough Bounty Seals.', '#ff8a7a'); return; }
    P.seals -= entry.cost;
    this.add(Items.create(entry.id));
    Sound.play('coin');
    UI.dirty('bounty');
  },

  // ---------- Save / load ----------
  serialize() {
    const P = this.P;
    return {
      v: 1, name: P.name, look: P.look, stats: P.stats, skills: P.skills, inv: P.inv, eq: P.eq, bank: P.bank, gold: P.gold,
      codex: P.codex, birthsign: P.birthsign, prof: P.prof, home: P.home, titles: P.titles, title: P.title, bounty: P.bounty,
      daily: P.daily, kills: P.kills, playTime: P.playTime, created: P.created, milestones: P.milestones, seals: P.seals,
      x: P.x, y: P.y, hp: P.hp, mana: P.mana, mount: P.mount, buffs: P.buffs, crafted: P.crafted, clock: Game.clock,
      pets: Game.ents.filter((e) => e.kind === 'pet').map((e) => ({ mon: e.mon, name: e.name, hp: e.hp, mode: e.mode })),
      saved: Date.now(),
    };
  },
  deserialize(s) {
    const P = makeEnt({ kind: 'player', x: s.x, y: s.y, cds: {}, path: null });
    Object.assign(P, {
      name: s.name, look: s.look, stats: s.stats, skills: s.skills, inv: s.inv, eq: s.eq, bank: s.bank || [], gold: s.gold,
      codex: s.codex || {}, birthsign: s.birthsign, prof: s.prof, home: s.home, titles: s.titles || [], title: s.title || '',
      bounty: s.bounty, daily: s.daily || { last: null, streak: 0 }, kills: s.kills || {}, playTime: s.playTime || 0,
      created: s.created, milestones: s.milestones || [], seals: s.seals || 0, mount: s.mount || null, buffs: s.buffs || [], crafted: s.crafted || 0,
    });
    for (const sk of SKILLS) if (!P.skills[sk.id]) P.skills[sk.id] = { v: 0, lock: 'up' };
    Game.player = P;
    this.recalc();
    P.hp = Math.max(1, Math.min(P.maxHp, s.hp || P.maxHp)); P.mana = s.mana || P.d.maxMana; P.stam = P.d.maxStam;
    if (s.clock != null) Game.clock = s.clock;
    return P;
  },
};
