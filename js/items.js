'use strict';
// =====================================================================
//  Items: creation, stats, naming, value, loot and the Codex
// =====================================================================
const GEAR_CATS = ['weapon', 'armor', 'shield', 'jewelry', 'tool'];
const ANY_SKILLS = ['swords', 'maces', 'fencing', 'archery', 'tactics', 'parrying', 'anatomy', 'healing', 'magery', 'meditation', 'taming'];

const Items = {
  create(baseId, o = {}) {
    const b = BASES[baseId];
    if (!b) throw new Error('Unknown item ' + baseId);
    const it = { uid: U.uid(), base: baseId };
    if (b.stack) { it.qty = o.qty || 1; return it; }
    if (b.mat) it.mat = o.mat || MATS[b.mat][0].id;
    it.r = o.r || 0;
    if (o.q) it.q = 1;
    if (o.crafter) it.crafter = o.crafter;
    if (o.dye) it.dye = o.dye;
    if (b.uses) it.uses = o.uses || Math.round(b.uses * (it.mat ? getMat(b.mat, it.mat).mult : 1) * (1 + it.r * 0.25));
    if (o.aff) it.aff = o.aff;
    else if (it.r > 0 && it.r < 5 && !b.noRoll) this.rollAffixes(it, o.level ?? 1);
    else it.aff = [];
    return it;
  },
  isGear(b) { return GEAR_CATS.includes(b.cat) && !b.noRoll; },
  kindsFor(b) {
    const k = [b.cat];
    if (b.staff) k.push('staff');
    if (b.robe) k.push('robe');
    if (b.slot === 'hands') k.push('hands');
    if (b.slot === 'feet') k.push('feet');
    return k;
  },
  skillFor(b) {
    if (b.tool) return b.tool;
    if (b.skill && U.chance(0.55)) return b.skill;
    if (b.cat === 'weapon') return U.pick(['tactics', 'anatomy', b.skill]);
    if (b.cat === 'shield') return 'parrying';
    if (b.robe || b.id === 'wizhat') return U.pick(['magery', 'meditation']);
    return U.pick(ANY_SKILLS.concat(['mining', 'lumberjack', 'fishing', 'herbalism', 'blacksmith', 'tailoring', 'woodwork', 'alchemy', 'cooking']));
  },
  rollAffixes(it, level) {
    const b = BASES[it.base], kinds = this.kindsFor(b);
    const pool = Object.keys(AFFIXES).filter((k) => AFFIXES[k].on.some((o) => kinds.includes(o)));
    const n = RARITY[it.r].affixes, chosen = [];
    while (chosen.length < n && pool.length) chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    it.aff = chosen.map((k) => {
      const a = AFFIXES[k];
      const t = U.clamp(Math.pow(Math.random(), 1.3) * (0.35 + level * 0.17) + it.r * 0.07, 0, 1);
      const o = { k, v: Math.max(a.min, Math.round(U.lerp(a.min, a.max, t))) };
      if (k === 'skill') o.s = this.skillFor(b);
      return o;
    });
  },
  mult(it) {
    const b = BASES[it.base];
    let m = 1;
    if (it.mat && b.mat) m *= getMat(b.mat, it.mat).mult;
    m *= RARITY[it.r || 0].mult;
    if (it.q) m *= 1.15;
    return m;
  },
  // Flattened bonuses: innate + material + affixes. Skill bonuses as skill_<id>
  bonuses(it) {
    const b = BASES[it.base], out = {};
    const add = (k, v) => { out[k] = (out[k] || 0) + v; };
    if (b.innate) for (const k in b.innate) add(k, b.innate[k]);
    if (it.mat && b.mat) { const m = getMat(b.mat, it.mat); if (m.bonus) for (const k in m.bonus) add(k, m.bonus[k]); }
    for (const a of it.aff || []) add(a.k === 'skill' ? 'skill_' + a.s : a.k, a.v);
    return out;
  },
  stats(it) {
    const b = BASES[it.base], m = this.mult(it), s = {};
    if (b.dmg) s.dmg = [Math.max(1, Math.round(b.dmg[0] * m)), Math.max(1, Math.round(b.dmg[1] * m))];
    if (b.spd) s.spd = b.spd;
    if (b.ar) s.ar = Math.max(1, Math.round(b.ar * m));
    if (b.block) s.block = b.block;
    if (b.range) s.range = b.range;
    return s;
  },
  name(it) {
    const b = BASES[it.base];
    if (it.art) return ARTIFACT_BY_ID[it.art].name;
    if (b.stack) return b.name;
    const parts = [];
    if (it.q) parts.push('Exceptional');
    const aff = it.aff || [];
    if (aff[0]) parts.push(AFFIXES[aff[0].k].pre);
    if (it.mat && b.mat) { const m = getMat(b.mat, it.mat); if (m.name) parts.push(m.name); }
    parts.push(b.name);
    let n = parts.join(' ');
    if (aff[1]) n += ' ' + AFFIXES[aff[1].k].suf;
    return n;
  },
  color(it) { // icon tint
    const b = BASES[it.base];
    if (it.dye) return it.dye;
    if (it.mat && b.mat) return getMat(b.mat, it.mat).color;
    return b.color || '#b0b0b0';
  },
  rarityColor(it) { return RARITY[it.r || 0].color; },
  value(it) {
    const b = BASES[it.base];
    if (b.stack) return b.val;
    if (it.art) return Math.round(b.val * 20 + 2500);
    const v = b.val * Math.pow(this.mult(it), 2) * (1 + Math.pow(it.r || 0, 1.6) * 0.9) * (it.q ? 1.4 : 1);
    return Math.max(1, Math.round(v));
  },
  weight(it) { return BASES[it.base].w * (it.qty || 1); },
  tags(it) { const b = BASES[it.base]; return [b.cat, b.sub].filter(Boolean); },
  affLabel(a) {
    const t = AFFIXES[a.k].label.replace('{v}', a.v);
    return a.k === 'skill' ? t.replace('{skill}', SKILL_BY_ID[a.s] ? SKILL_BY_ID[a.s].name : a.s) : t;
  },
  // Gear score for quick comparisons
  power(it) {
    const s = this.stats(it), bon = this.bonuses(it);
    let p = 0;
    if (s.dmg) p += ((s.dmg[0] + s.dmg[1]) / 2) * (2.5 / (s.spd || 2.5)) * 4;
    if (s.ar) p += s.ar * 6;
    for (const k in bon) p += bon[k] * (k === 'luck' ? 0.4 : k.startsWith('skill_') ? 3 : 1.5);
    return Math.round(p);
  },

  // ---------- Loot ----------
  rollRarity(tier, luck, minR = 0) {
    const w = [];
    for (let i = 0; i < 5; i++) w.push([i, i === 0 ? RARITY[0].weight / (1 + tier * 0.25) : RARITY[i].weight * (1 + tier * 0.7) * (1 + luck / 120)]);
    return Math.max(minR, U.weighted(w));
  },
  rollMat(type, tier, luck = 0) {
    const list = MATS[type], w = [];
    for (let i = 0; i < list.length; i++) {
      const cap = type === 'hide' || type === 'cloth' ? Math.ceil((tier + 1) / 2) : tier + 1;
      if (i > cap) continue;
      w.push([list[i].id, Math.pow(0.45, i) * (1 + tier * 0.5 * i) * (i > 0 ? 1 + luck / 200 : 1)]);
    }
    return U.weighted(w);
  },
  _gearPool: null,
  gearPool() {
    if (!this._gearPool) {
      this._gearPool = [];
      for (const id in BASES) {
        const b = BASES[id];
        if (!GEAR_CATS.includes(b.cat) || b.noRoll) continue;
        const w = b.cat === 'jewelry' ? 0.7 : b.cat === 'tool' ? 0.35 : 1;
        this._gearPool.push([id, w]);
      }
    }
    return this._gearPool;
  },
  randomGear(tier, luck = 0, minR = 0) {
    const id = U.weighted(this.gearPool()), b = BASES[id];
    const r = this.rollRarity(tier, luck, minR);
    return this.create(id, { r, mat: b.mat ? this.rollMat(b.mat, tier, luck) : undefined, level: tier });
  },
  artifact(id) {
    const a = ARTIFACT_BY_ID[id];
    const it = this.create(a.base, { r: 5, mat: a.mat, aff: a.aff.map(([k, v, s]) => (s ? { k, v, s } : { k, v })) });
    it.art = id;
    return it;
  },
  monsterLoot(def, luck, goldFind) {
    const L = def.loot || {}, items = [];
    let gold = 0;
    if (L.gold && L.gold[1] > 0) gold = Math.round(U.randi(L.gold[0], L.gold[1]) * (1 + goldFind / 100));
    for (const [id, ch, a, b] of L.mats || []) if (U.chance(ch)) items.push(this.create(id, { qty: U.randi(a, b) }));
    const rolls = L.rolls || 1;
    for (let i = 0; i < rolls; i++) if (L.gear && U.chance(L.gear * (1 + luck / 300))) items.push(this.randomGear(def.tier, luck, L.minR || 0));
    if (L.trophy && U.chance((L.trophyChance || 0.05) * (1 + luck / 150))) {
      items.push(BASES[L.trophy].stack ? this.create(L.trophy) : this.create(L.trophy, { r: 1 }));
    }
    if (L.artifacts && U.chance(L.artChance * (1 + luck / 200))) items.push(this.artifact(U.pick(L.artifacts)));
    else if (def.tier >= 3 && U.chance(0.004 * (1 + luck / 100))) items.push(this.artifact(U.pick(ARTIFACTS.filter((a) => !a.boss)).id));
    // gems from tough humanoids
    if (def.tier >= 2 && U.chance(0.08)) items.push(this.create('gem_' + U.pick(GEMS.slice(0, def.tier + 2))[0]));
    return { gold, items };
  },
  openCache(base, luck, player) {
    const c = BASES[base].use.cache, out = { gold: 0, items: [] };
    if (c.minR >= 5) {
      const unowned = ARTIFACTS.filter((a) => !player.codex['art:' + a.id]);
      out.items.push(this.artifact(U.pick(unowned.length ? unowned : ARTIFACTS).id));
      return out;
    }
    out.gold = Math.round(U.randi(20, 60) * (c.tier + 1) * (1 + luck / 200));
    out.items.push(this.randomGear(c.tier, luck + 20, c.minR));
    if (U.chance(0.35)) out.items.push(this.create('gem_' + U.pick(GEMS.slice(0, c.tier + 2))[0]));
    return out;
  },
};

// =====================================================================
//  Codex: the collection log. Gear tracks every rarity found per base.
// =====================================================================
const Codex = {
  _entries: null,
  entries() {
    if (this._entries) return this._entries;
    const list = [];
    for (const id in BASES) {
      const b = BASES[id];
      if (!b.codex) continue;
      list.push({ key: id, cat: b.codex, gear: Items.isGear(b), base: id });
    }
    for (const a of ARTIFACTS) list.push({ key: 'art:' + a.id, cat: 'Artifacts', art: a.id, base: a.base });
    this._entries = list;
    return list;
  },
  total() { return this.entries().reduce((s, e) => s + (e.gear ? 5 : 1), 0); },
  points(codex) {
    let p = 0;
    for (const e of this.entries()) {
      const v = codex[e.key] || 0;
      if (e.gear) { for (let i = 0; i < 5; i++) if (v & (1 << i)) p++; }
      else if (v) p++;
    }
    return p;
  },
  pct(codex) { return (this.points(codex) / this.total()) * 100; },
  // returns 'new' (first of base), 'rarity' (new rarity tier), or null
  register(codex, it) {
    const b = BASES[it.base];
    if (!b.codex) return null;
    if (it.art) {
      const k = 'art:' + it.art;
      if (codex[k]) return null;
      codex[k] = 1;
      return 'new';
    }
    const prev = codex[it.base] || 0;
    if (Items.isGear(b)) {
      const bit = 1 << Math.min(4, it.r || 0);
      if (prev & bit) return null;
      codex[it.base] = prev | bit;
      return prev ? 'rarity' : 'new';
    }
    if (prev) return null;
    codex[it.base] = 1;
    return 'new';
  },
};
