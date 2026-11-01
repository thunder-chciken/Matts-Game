'use strict';
// =====================================================================
//  Crafting, smelting, shops, training
// =====================================================================
const MAT_PREFIX = { metal: 'ingot_', wood: 'log_', hide: 'hide_', cloth: 'cloth_' };

const Craft = {
  queue: null,
  recipesFor(skill) { return RECIPES.filter((r) => r.skill === skill).sort((a, b) => a.req - b.req); },
  matClass(rec) { const m = rec.mats.find((x) => x.m); return m ? m.m : null; },
  matOptions(rec) {
    const cls = this.matClass(rec);
    if (!cls) return [];
    return MATS[cls].map((m) => ({ mat: m, id: MAT_PREFIX[cls] + m.id, have: Player.count(MAT_PREFIX[cls] + m.id) }));
  },
  reqFor(rec, matId) {
    const cls = this.matClass(rec);
    if (!cls || !matId) return rec.req;
    return Math.max(rec.req, getMat(cls, matId).req);
  },
  needs(rec, matId) { // [{id, n}]
    return rec.mats.map((m) => (m.m ? { id: MAT_PREFIX[m.m] + matId, n: m.n } : { id: m.id, n: m.n }));
  },
  craftSkill(rec) { return Player.skill(rec.skill) + (rec.skill !== 'mining' ? 0 : 0); },
  chance(rec, matId) {
    const s = Player.skill(rec.skill), req = this.reqFor(rec, matId);
    return U.clamp(0.5 + (s - req) / 50 + Game.player.d.craft / 100, 0, 0.98);
  },
  check(rec, matId) {
    const P = Game.player, info = CRAFT_SKILLS.find((c) => c.skill === rec.skill);
    if (this.matClass(rec) && !matId) return 'Choose a material.';
    const s = Player.skill(rec.skill), req = this.reqFor(rec, matId);
    if (s < req - 25) return `Requires ${req} ${SKILL_BY_ID[rec.skill].name}.`;
    if (info.tool && !Player.findTool(info.tool)) return `You need a ${BASES[{ blacksmith: 'smithhammer', tailoring: 'sewingkit', woodwork: 'saw', alchemy: 'mortar' }[info.tool]].name}.`;
    if (rec.station === 'anvil' && !World.nearStation('anvil', P.x, P.y, 3)) return 'You must be near an anvil.';
    if (rec.station === 'forge' && !World.nearStation('forge', P.x, P.y, 3)) return 'You must be near a forge.';
    if (rec.station === 'heat' && !World.nearStation('heat', P.x, P.y, 3)) return 'You must be near an oven or forge.';
    for (const n of this.needs(rec, matId)) if (Player.count(n.id) < n.n) return `Not enough ${BASES[n.id].name} (${Player.count(n.id)}/${n.n}).`;
    return null;
  },
  maxCraftable(rec, matId) {
    let m = 999;
    for (const n of this.needs(rec, matId)) m = Math.min(m, Math.floor(Player.count(n.id) / n.n));
    return m;
  },
  start(rec, matId, n) {
    const why = this.check(rec, matId);
    if (why) { UI.log(why, '#ff8a7a'); return; }
    this.queue = { rec, matId, left: Math.max(1, Math.min(n, this.maxCraftable(rec, matId))) };
    this.next();
  },
  next() {
    const q = this.queue;
    if (!q) return;
    Player.startAction({ type: 'craft', dur: q.rec.smelt ? 0.6 : q.rec.skill === 'cooking' ? 0.8 : 1.1, label: (q.rec.smelt ? 'Smelting ' : 'Crafting ') + BASES[q.rec.out].name + (q.left > 1 ? ` (${q.left} left)` : '') });
    this.queue = q;
    UI.dirty('craft');
  },
  finishOne() {
    const q = this.queue;
    if (!q) return;
    const why = this.check(q.rec, q.matId);
    if (why) { UI.log(why, '#ff8a7a'); this.queue = null; UI.dirty('craft'); return; }
    this.craftOnce(q.rec, q.matId);
    q.left--;
    if (q.left > 0 && !this.check(q.rec, q.matId)) this.next();
    else { this.queue = null; UI.dirty('craft'); }
  },
  craftOnce(rec, matId) {
    const P = Game.player, d = P.d;
    const s = Player.skill(rec.skill), req = this.reqFor(rec, matId);
    const info = CRAFT_SKILLS.find((c) => c.skill === rec.skill);
    const tool = info.tool ? Player.findTool(info.tool) : null;
    const tb = Player.toolBonus(tool, info.tool || rec.skill);
    const luck = d.luck + tb.luck;
    const chance = U.clamp(this.chance(rec, matId) + tb.skill / 50, 0, 0.98);
    const needs = this.needs(rec, matId);
    Sound.play('craft');
    Game.fx('burst', { x: P.x, y: P.y, color: rec.skill === 'blacksmith' || rec.smelt ? '#ffb84a' : '#e8e0c8', n: 8, dur: 0.5, z: 20 });
    Player.gain(rec.skill, req + 15);
    if (tool) Player.useTool(tool);
    if (!U.chance(chance)) {
      for (const n of needs) Player.remove(n.id, Math.ceil(n.n / 2));
      UI.log(rec.smelt ? 'You burn away some of the ore.' : 'You fail and lose some materials.', '#ff8a7a');
      return;
    }
    for (const n of needs) Player.remove(n.id, n.n);
    const b = BASES[rec.out];
    let it;
    if (b.stack) {
      let qty = rec.qty;
      if (U.chance(tb.yield / 100)) qty *= 2;
      it = Items.create(rec.out, { qty });
      UI.log(`You create ${qty > 1 ? qty + ' ' : ''}${b.name}${qty > 1 && !b.name.endsWith('s') ? 's' : ''}.`, '#c8e0b0');
    } else {
      const exc = U.chance(U.clamp(0.05 + (s - req) / 110 + d.craft / 100 + tb.skill / 100, 0, 0.6));
      let r = 0;
      if (exc) r = Math.min(s >= 90 ? 4 : 3, Math.max(1, Items.rollRarity(Math.floor(s / 25), luck)));
      else if (U.chance(0.06 + luck / 900)) r = 1;
      it = Items.create(rec.out, { mat: b.mat ? matId : undefined, r, q: exc, crafter: P.name, level: Math.floor(s / 25) });
      UI.log(`You craft ${exc ? 'an exceptional ' : 'a '}${Items.name(it)}.`, Items.rarityColor(it));
      if (exc && r < 2) Game.text(P, 'Exceptional!', '#ffd94a', 11, 64);
    }
    Player.add(it);
    P.crafted++;
    Player.bountyEvent('craft', { n: 1 });
  },
};

const Shop = {
  buyPrice(baseId) {
    const b = BASES[baseId];
    const it = b.stack ? null : Items.create(baseId);
    return Math.max(1, Math.round((it ? Items.value(it) : b.val) * 1.3));
  },
  unitSell(it, vendor) { return Math.max(1, Math.round(Items.value(it) * 0.35 * (vendor.premium || 1))); },
  buys(vendor, it) {
    if (!vendor.buys || !vendor.buys.length) return false;
    const tags = Items.tags(it);
    return vendor.buys.some((t) => tags.includes(t));
  },
  buy(baseId, qty = 1) {
    const P = Game.player, price = this.buyPrice(baseId) * qty;
    if (P.gold < price) { UI.log('You cannot afford that.', '#ff8a7a'); return; }
    P.gold -= price;
    const b = BASES[baseId];
    Player.add(b.stack ? Items.create(baseId, { qty }) : Items.create(baseId), true);
    Sound.play('coin');
    UI.log(`You buy ${qty > 1 ? qty + ' ' : ''}${b.name} for ${price} gold.`, '#ffd94a');
    UI.dirty('gold'); UI.dirty('vendor');
  },
  sell(it, vendor) {
    const P = Game.player;
    if (Object.values(P.eq).includes(it)) return;
    const q = it.qty || 1, price = this.unitSell(it, vendor) * q;
    Player.removeItem(it);
    P.gold += price;
    Sound.play('coin');
    UI.log(`You sell ${q > 1 ? q + ' ' : ''}${Items.name(it)} for ${price} gold.`, '#ffd94a');
    UI.dirty('gold'); UI.dirty('vendor');
  },
  sellJunk(vendor) {
    const P = Game.player;
    let total = 0, n = 0;
    for (const it of P.inv.slice()) {
      const b = BASES[it.base];
      const junk = (b.sub === 'junk') || (Items.isGear(b) && (it.r || 0) === 0 && !it.q && !b.tool && !it.dye);
      if (junk && !it.lock && this.buys(vendor, it)) { total += this.unitSell(it, vendor) * (it.qty || 1); Player.removeItem(it); n++; }
    }
    if (!n) { UI.log('You have nothing this merchant wants as junk.', '#aaa'); return; }
    P.gold += total;
    Sound.play('coin');
    UI.log(`Sold ${n} common item${n > 1 ? 's' : ''} for ${total} gold.`, '#ffd94a');
    UI.dirty('gold'); UI.dirty('vendor');
  },
  trainCost(id) { return 15 * Math.ceil(Math.min(10, 35 - Game.player.skills[id].v)); },
  train(id) {
    const P = Game.player, s = P.skills[id];
    const pts = Math.min(10, U.round1(35 - s.v));
    if (pts <= 0) { UI.log("I've taught you all I can. The rest you must learn by doing.", '#aaa'); return; }
    const cost = this.trainCost(id);
    if (P.gold < cost) { UI.log('You cannot afford the training.', '#ff8a7a'); return; }
    if (Player.skillTotal() + pts > SKILL_CAP) { UI.log('You are at your skill cap. Lower another skill first.', '#ff8a7a'); return; }
    P.gold -= cost;
    s.v = U.round1(s.v + pts);
    UI.log(`You train ${SKILL_BY_ID[id].name} to ${s.v.toFixed(1)} for ${cost} gold.`, '#ffd94a');
    Sound.play('skill');
    UI.dirty('vendor'); UI.dirty('skills'); UI.dirty('gold');
  },
  buyHorse() {
    const P = Game.player, cost = 600;
    if (P.gold < cost) { UI.log('A horse costs 600 gold.', '#ff8a7a'); return; }
    if (Player.followers() + 1 > MAX_FOLLOWERS) { UI.log('You have too many followers.', '#ff8a7a'); return; }
    P.gold -= cost;
    Player.adoptPet('horse', U.pick(['Clover', 'Dusty', 'Maple', 'Thunder', 'Ash', 'Pepper', 'Willow']));
    UI.log('The stablemaster hands you the reins. Click your horse to ride it.', '#d8c8a0');
    Sound.play('coin'); UI.dirty('gold');
  },
};
