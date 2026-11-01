'use strict';
// =====================================================================
//  HOARDLANDS - static game data
// =====================================================================
const SKILL_CAP = 720, SKILL_MAX = 100, STAT_CAP = 260, STAT_MAX = 110;
const CREATE_STAT_TOTAL = 100, CREATE_STAT_MIN = 10, CREATE_STAT_MAX = 70;
const CREATE_SKILL_TOTAL = 150, CREATE_SKILL_MAX = 50, CREATE_SKILL_COUNT = 4;
const WORLD_SEED = 7331;

const STAT_INFO = {
  str: { name: 'Strength', short: 'STR', color: '#e0604c', desc: 'Raises max health, melee damage and how much you can carry.' },
  dex: { name: 'Dexterity', short: 'DEX', color: '#5fd16e', desc: 'Raises stamina, swing speed and bandaging speed.' },
  int: { name: 'Intelligence', short: 'INT', color: '#5aa6ff', desc: 'Raises max mana and the power of your spells.' },
};

const SKILLS = [
  { id: 'swords', name: 'Swordsmanship', cat: 'Combat', stat: 'str', noun: 'Swordsman', desc: 'Fighting with swords and axes.' },
  { id: 'maces', name: 'Mace Fighting', cat: 'Combat', stat: 'str', noun: 'Armsman', desc: 'Fighting with maces, hammers, clubs, staves and pickaxes.' },
  { id: 'fencing', name: 'Fencing', cat: 'Combat', stat: 'dex', noun: 'Fencer', desc: 'Fighting with daggers, rapiers and spears.' },
  { id: 'archery', name: 'Archery', cat: 'Combat', stat: 'dex', noun: 'Archer', desc: 'Bows and crossbows. Each shot uses an arrow.' },
  { id: 'wrestling', name: 'Wrestling', cat: 'Combat', stat: 'str', noun: 'Brawler', desc: 'Unarmed fighting. Your defense when barehanded.' },
  { id: 'tactics', name: 'Tactics', cat: 'Combat', stat: 'str', noun: 'Warrior', desc: 'Raises the damage of every weapon.' },
  { id: 'parrying', name: 'Parrying', cat: 'Combat', stat: 'dex', noun: 'Duelist', desc: 'Chance to block blows. Much better with a shield.' },
  { id: 'anatomy', name: 'Anatomy', cat: 'Combat', stat: 'int', noun: 'Biologist', desc: 'Bonus melee damage and stronger bandages.' },
  { id: 'healing', name: 'Healing', cat: 'Combat', stat: 'int', noun: 'Healer', desc: 'Heal yourself and your pets with bandages.' },
  { id: 'magery', name: 'Magery', cat: 'Magic', stat: 'int', noun: 'Mage', desc: 'Cast spells. More skill unlocks stronger spells.' },
  { id: 'meditation', name: 'Meditation', cat: 'Magic', stat: 'int', noun: 'Stoic', desc: 'Faster mana regeneration, best while standing still.' },
  { id: 'mining', name: 'Mining', cat: 'Gathering', stat: 'str', noun: 'Miner', desc: 'Dig ore and gems from rock. Smelt ore into ingots at a forge.' },
  { id: 'lumberjack', name: 'Lumberjacking', cat: 'Gathering', stat: 'str', noun: 'Woodsman', desc: 'Chop logs from trees with a hatchet.' },
  { id: 'fishing', name: 'Fishing', cat: 'Gathering', stat: 'dex', noun: 'Fisher', desc: 'Catch fish, junk and the odd sunken treasure.' },
  { id: 'herbalism', name: 'Herbalism', cat: 'Gathering', stat: 'int', noun: 'Herbalist', desc: 'Harvest herbs from wild plants for alchemy.' },
  { id: 'blacksmith', name: 'Blacksmithing', cat: 'Crafting', stat: 'str', noun: 'Blacksmith', desc: 'Forge metal weapons, armor, shields and tools at an anvil.' },
  { id: 'tailoring', name: 'Tailoring', cat: 'Crafting', stat: 'dex', noun: 'Tailor', desc: 'Sew cloth and leather gear, cloaks and bandages.' },
  { id: 'woodwork', name: 'Woodworking', cat: 'Crafting', stat: 'dex', noun: 'Bowyer', desc: 'Craft bows, staves, wooden shields, arrows and tools.' },
  { id: 'alchemy', name: 'Alchemy', cat: 'Crafting', stat: 'int', noun: 'Alchemist', desc: 'Brew potions and elixirs from herbs.' },
  { id: 'cooking', name: 'Cooking', cat: 'Crafting', stat: 'int', noun: 'Cook', desc: 'Cook fish and meat into food that heals and buffs.' },
  { id: 'taming', name: 'Animal Taming', cat: 'Other', stat: 'int', noun: 'Tamer', desc: 'Tame wild creatures to fight beside you. Horses can be ridden.' },
];
const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
const SKILL_CATS = ['Combat', 'Magic', 'Gathering', 'Crafting', 'Other'];
const SKILL_TITLES = [[100, 'Grandmaster'], [90, 'Master'], [75, 'Expert'], [60, 'Adept'], [45, 'Journeyman'], [30, 'Apprentice'], [0, 'Novice']];
function skillTitle(v) { for (const [n, t] of SKILL_TITLES) if (v >= n) return t; return 'Novice'; }

const PROFESSIONS = [
  { id: 'warrior', name: 'Warrior', icon: 'longsword', desc: 'Front-line fighter. Heavy swords, a shield and bandages to patch up after.', stats: { str: 60, dex: 30, int: 10 }, skills: { swords: 50, tactics: 50, parrying: 30, healing: 20 } },
  { id: 'mage', name: 'Mage', icon: 'wstaff', desc: 'Commands fire, frost and lightning. Fragile up close, devastating at range.', stats: { str: 15, dex: 20, int: 65 }, skills: { magery: 50, meditation: 50, wrestling: 25, alchemy: 25 } },
  { id: 'smith', name: 'Blacksmith', icon: 'smithhammer', desc: 'Digs ore, smelts ingots and forges the gear everyone else wants.', stats: { str: 55, dex: 25, int: 20 }, skills: { blacksmith: 50, mining: 50, maces: 30, tactics: 20 } },
  { id: 'ranger', name: 'Ranger', icon: 'bow', desc: 'A woodland archer who carves bows and arrows from the logs they chop.', stats: { str: 35, dex: 50, int: 15 }, skills: { archery: 50, tactics: 40, woodwork: 30, lumberjack: 30 } },
  { id: 'tamer', name: 'Beastmaster', icon: 'tr_wolf', desc: 'Bonds with wolves, bears and even drakes. Rides a horse from day one.', stats: { str: 30, dex: 25, int: 45 }, skills: { taming: 50, healing: 40, archery: 30, tactics: 30 } },
  { id: 'fisher', name: 'Fisher', icon: 'fishpole', desc: 'Reels in rare fish and sunken treasure, then cooks feasts that grant luck.', stats: { str: 35, dex: 45, int: 20 }, skills: { fishing: 50, cooking: 40, fencing: 35, tactics: 25 } },
  { id: 'alchemist', name: 'Alchemist', icon: 'potion', desc: 'Harvests wild herbs and brews healing draughts and elixirs of fortune.', stats: { str: 20, dex: 25, int: 55 }, skills: { alchemy: 50, herbalism: 50, magery: 30, meditation: 20 } },
  { id: 'tailor', name: 'Tailor', icon: 'cloth', desc: 'Sews robes, leather armor and bandages. Quick with a rapier.', stats: { str: 30, dex: 45, int: 25 }, skills: { tailoring: 50, healing: 30, fencing: 40, tactics: 30 } },
  { id: 'custom', name: 'Custom', icon: 'scroll', desc: 'Pick your own stats and up to four skills.', stats: null, skills: null },
];

const BIRTHSIGNS = [
  { id: 'anvil', name: 'The Anvil', desc: '+8% crafting success and exceptional chance.', bonus: { craft: 8 } },
  { id: 'wolf', name: 'The Wolf', desc: '+6% weapon damage and +3% hit chance.', bonus: { dmg: 6, hit: 3 } },
  { id: 'lantern', name: 'The Lantern', desc: '+15 max mana and +8% spell damage.', bonus: { mana: 15, spell: 8 } },
  { id: 'coin', name: 'The Coin', desc: '+20% gold from every source.', bonus: { gold: 20 } },
  { id: 'clover', name: 'The Clover', desc: '+25 Luck. Better rarity on every drop, catch and craft.', bonus: { luck: 25 } },
  { id: 'oak', name: 'The Oak', desc: '+15 max health and +1 health regeneration.', bonus: { hp: 15, regen: 1 } },
  { id: 'compass', name: 'The Compass', desc: '+6% move speed and +10% double-yield gathering.', bonus: { speed: 6, yield: 10 } },
];

const LOOK_OPTIONS = {
  skins: ['#f6d7bd', '#eec39a', '#d9a47a', '#c08a5c', '#9c6a43', '#7a4f30', '#5a3a24', '#b8d0c0'],
  hairStyles: ['Short', 'Long', 'Ponytail', 'Mohawk', 'Bald', 'Braids', 'Topknot', 'Curly'],
  hairColors: ['#1d1611', '#3d2817', '#6b4423', '#a0652f', '#d9a94e', '#e8d9a8', '#b3341f', '#8a8a8a', '#eeeeee', '#4c6bc4'],
  beards: ['None', 'Stubble', 'Goatee', 'Full Beard', 'Long Beard', 'Mustache'],
  clothColors: ['#7a2a2a', '#2f4f8a', '#2f6b3a', '#6b4a8a', '#8a6a2a', '#3a3a3a', '#d8d0bc', '#8a3a6a', '#2a6b6b', '#a85a20', '#1f2a44', '#5a3a1e'],
};
const NAME_PARTS = {
  a: ['Ael', 'Bran', 'Cor', 'Dar', 'El', 'Fen', 'Gar', 'Hal', 'Ise', 'Jor', 'Kae', 'Lor', 'Mar', 'Nor', 'Os', 'Per', 'Quin', 'Ras', 'Syl', 'Tor', 'Ul', 'Vae', 'Wyn', 'Yor', 'Zan'],
  b: ['wyn', 'ric', 'ia', 'dan', 'eth', 'ira', 'on', 'mund', 'ra', 'vin', 'lyn', 'gar', 'is', 'ael', 'den', 'mira', 'thas', 'ok', 'elle', 'ius'],
};
function randomName() { return U.pick(NAME_PARTS.a) + U.pick(NAME_PARTS.b); }

// ---------- Rarity ----------
const RARITY = [
  { name: 'Common', color: '#cfcfcf', affixes: 0, mult: 1.0, weight: 1000 },
  { name: 'Uncommon', color: '#4ade6a', affixes: 1, mult: 1.05, weight: 330 },
  { name: 'Rare', color: '#4aa8ff', affixes: 2, mult: 1.1, weight: 95 },
  { name: 'Epic', color: '#b765ff', affixes: 3, mult: 1.16, weight: 24 },
  { name: 'Legendary', color: '#ff9b2f', affixes: 4, mult: 1.24, weight: 5 },
  { name: 'Artifact', color: '#ffd94a', affixes: 0, mult: 1.3, weight: 0 },
];

// ---------- Materials ----------
const MATS = {
  metal: [
    { id: 'iron', name: 'Iron', req: 0, mult: 1.0, color: '#a4abb3' },
    { id: 'copper', name: 'Copper', req: 35, mult: 1.1, color: '#d07a3c', bonus: { fire: 2 } },
    { id: 'silver', name: 'Silver', req: 55, mult: 1.2, color: '#e6edf5', bonus: { mana: 6 } },
    { id: 'mithril', name: 'Mithril', req: 70, mult: 1.32, color: '#79d4ff', bonus: { spd: 4 } },
    { id: 'adamant', name: 'Adamantite', req: 85, mult: 1.46, color: '#3cb878', bonus: { ar: 3, hp: 8 } },
    { id: 'starmetal', name: 'Starmetal', req: 95, mult: 1.62, color: '#b98cff', bonus: { luck: 20 } },
  ],
  wood: [
    { id: 'pine', name: 'Pine', req: 0, mult: 1.0, color: '#caa36c' },
    { id: 'oak', name: 'Oak', req: 30, mult: 1.1, color: '#9b6a3a', bonus: { hp: 4 } },
    { id: 'ash', name: 'Ash', req: 50, mult: 1.2, color: '#e2d3ae', bonus: { spd: 3 } },
    { id: 'yew', name: 'Yew', req: 65, mult: 1.32, color: '#b4543a', bonus: { dmg: 5 } },
    { id: 'ironwood', name: 'Ironwood', req: 80, mult: 1.46, color: '#6a7880', bonus: { ar: 2, hp: 6 } },
    { id: 'elderwood', name: 'Elderwood', req: 95, mult: 1.62, color: '#63d6a8', bonus: { luck: 15, spell: 5 } },
  ],
  hide: [
    { id: 'plain', name: '', res: 'Hide', req: 0, mult: 1.0, color: '#9a6534' },
    { id: 'thick', name: 'Thick', res: 'Thick Hide', req: 45, mult: 1.25, color: '#5f3d22', bonus: { hp: 6 } },
    { id: 'scaled', name: 'Drakescale', res: 'Drakescale Hide', req: 80, mult: 1.55, color: '#3f8a62', bonus: { ar: 3, hp: 10 } },
  ],
  cloth: [
    { id: 'linen', name: '', res: 'Linen Cloth', req: 0, mult: 1.0, color: '#e9e1cc' },
    { id: 'silk', name: 'Silk', res: 'Spider Silk', req: 45, mult: 1.25, color: '#f3c4dd', bonus: { mana: 6 } },
    { id: 'shadowsilk', name: 'Shadowsilk', res: 'Shadowsilk', req: 80, mult: 1.55, color: '#5c48a0', bonus: { spell: 6, mregen: 1 } },
  ],
};
const MAT_BY = {};
for (const t in MATS) for (const m of MATS[t]) MAT_BY[t + ':' + m.id] = m;
function getMat(type, id) { return MAT_BY[type + ':' + id] || null; }

// ---------- Affixes ----------
// on: which item kinds may roll it. min/max scale with item level.
const AFFIXES = {
  dmg: { label: '+{v}% Damage', pre: 'Brutal', suf: 'of Slaughter', min: 5, max: 40, on: ['weapon'] },
  hit: { label: '+{v}% Hit Chance', pre: 'Keen', suf: 'of Precision', min: 3, max: 15, on: ['weapon', 'jewelry', 'hands'] },
  spd: { label: '+{v}% Swing Speed', pre: 'Swift', suf: 'of Haste', min: 3, max: 15, on: ['weapon', 'hands', 'jewelry'] },
  leech: { label: '{v}% Life Leech', pre: 'Vampiric', suf: 'of the Leech', min: 2, max: 10, on: ['weapon'] },
  fire: { label: '+{v} Fire Damage', pre: 'Fiery', suf: 'of Embers', min: 2, max: 14, on: ['weapon'] },
  str: { label: '+{v} Strength', pre: 'Mighty', suf: 'of the Bear', min: 1, max: 10, on: ['weapon', 'armor', 'shield', 'jewelry'] },
  dex: { label: '+{v} Dexterity', pre: 'Nimble', suf: 'of the Fox', min: 1, max: 10, on: ['weapon', 'armor', 'shield', 'jewelry'] },
  int: { label: '+{v} Intelligence', pre: 'Sage', suf: 'of the Owl', min: 1, max: 10, on: ['weapon', 'armor', 'shield', 'jewelry'] },
  hp: { label: '+{v} Max Health', pre: 'Stalwart', suf: 'of Vigor', min: 4, max: 30, on: ['armor', 'shield', 'jewelry'] },
  mana: { label: '+{v} Max Mana', pre: 'Arcane', suf: 'of the Magi', min: 4, max: 30, on: ['armor', 'jewelry', 'staff'] },
  ar: { label: '+{v} Armor', pre: 'Reinforced', suf: 'of Warding', min: 1, max: 8, on: ['armor', 'shield'] },
  regen: { label: '+{v} Health Regen', pre: 'Mending', suf: 'of Renewal', min: 1, max: 5, on: ['armor', 'jewelry', 'shield'] },
  mregen: { label: '+{v} Mana Regen', pre: 'Mystic', suf: 'of Clarity', min: 1, max: 5, on: ['armor', 'jewelry', 'staff'] },
  luck: { label: '+{v} Luck', pre: 'Lucky', suf: 'of Fortune', min: 5, max: 50, on: ['weapon', 'armor', 'shield', 'jewelry', 'tool'] },
  gold: { label: '+{v}% Gold Find', pre: 'Gilded', suf: 'of Greed', min: 5, max: 40, on: ['jewelry', 'armor'] },
  spell: { label: '+{v}% Spell Damage', pre: 'Runed', suf: 'of Sorcery', min: 3, max: 25, on: ['jewelry', 'staff', 'robe'] },
  speed: { label: '+{v}% Move Speed', pre: 'Fleet', suf: 'of the Wind', min: 2, max: 10, on: ['feet', 'jewelry'] },
  yield: { label: '+{v}% Double Yield', pre: 'Bountiful', suf: 'of Plenty', min: 5, max: 30, on: ['tool'] },
  skill: { label: '+{v} {skill}', pre: 'Masterwork', suf: 'of the Adept', min: 1, max: 10, on: ['weapon', 'armor', 'shield', 'jewelry', 'tool'] },
};

// ---------- Item bases ----------
const BASES = {};
function defBase(id, o) { o.id = id; o.w = o.w ?? 1; o.val = o.val ?? 5; BASES[id] = o; return o; }

// Weapons: id, name, skill, icon, dmg, speed(s), twoH, mat, value, weight, extra
[
  ['dagger', 'Dagger', 'fencing', 'dagger', [3, 8], 1.7, 0, 'metal', 20, 1],
  ['rapier', 'Rapier', 'fencing', 'rapier', [6, 13], 2.2, 0, 'metal', 70, 3],
  ['spear', 'Spear', 'fencing', 'spear', [10, 20], 3.0, 1, 'metal', 110, 6],
  ['shortsword', 'Short Sword', 'swords', 'sword', [5, 11], 2.1, 0, 'metal', 40, 4],
  ['longsword', 'Longsword', 'swords', 'longsword', [8, 15], 2.5, 0, 'metal', 90, 6],
  ['scimitar', 'Scimitar', 'swords', 'scimitar', [7, 14], 2.3, 0, 'metal', 85, 5],
  ['katana', 'Katana', 'swords', 'katana', [9, 16], 2.3, 0, 'metal', 160, 5],
  ['greatsword', 'Greatsword', 'swords', 'greatsword', [14, 26], 3.4, 1, 'metal', 220, 10],
  ['battleaxe', 'Battle Axe', 'swords', 'battleaxe', [12, 22], 3.1, 1, 'metal', 150, 8],
  ['hatchet', 'Hatchet', 'swords', 'hatchet', [4, 9], 2.3, 0, 'metal', 25, 4, { tool: 'lumberjack', uses: 120 }],
  ['club', 'Club', 'maces', 'club', [4, 9], 2.2, 0, 'wood', 15, 4],
  ['mace', 'Mace', 'maces', 'mace', [7, 14], 2.5, 0, 'metal', 70, 6],
  ['warhammer', 'War Hammer', 'maces', 'warhammer', [14, 25], 3.4, 1, 'metal', 190, 10],
  ['quarterstaff', 'Quarterstaff', 'maces', 'staff', [8, 15], 2.6, 1, 'wood', 50, 5, { staff: true }],
  ['wizstaff', 'Wizard Staff', 'maces', 'wstaff', [6, 12], 2.8, 1, 'wood', 180, 5, { staff: true, innate: { spell: 8, mana: 10 } }],
  ['pickaxe', 'Pickaxe', 'maces', 'pickaxe', [3, 8], 2.6, 0, 'metal', 25, 5, { tool: 'mining', uses: 120 }],
  ['shortbow', 'Shortbow', 'archery', 'bow', [6, 13], 2.4, 1, 'wood', 60, 4, { range: 8 }],
  ['longbow', 'Longbow', 'archery', 'longbow', [10, 19], 3.0, 1, 'wood', 150, 5, { range: 10 }],
  ['crossbow', 'Crossbow', 'archery', 'crossbow', [13, 23], 3.5, 1, 'wood', 220, 7, { range: 9 }],
].forEach(([id, name, skill, icon, dmg, spd, twoH, mat, val, w, extra]) =>
  defBase(id, Object.assign({ name, cat: 'weapon', slot: 'main', skill, icon, dmg, spd, twoH: !!twoH, mat, val, w, codex: 'Weapons' }, extra || {})));

// Armor: id, name, slot, icon, ar, mat, value, weight, look(type for paperdoll render)
[
  ['leathercap', 'Leather Cap', 'head', 'cap', 2, 'hide', 25, 1, 'cap'],
  ['chaincoif', 'Chain Coif', 'head', 'chainhelm', 4, 'metal', 50, 2, 'coif'],
  ['platehelm', 'Plate Helm', 'head', 'helm', 6, 'metal', 90, 4, 'helm'],
  ['wizhat', 'Wizard Hat', 'head', 'hat', 1, 'cloth', 40, 1, 'hat', { innate: { mana: 5 } }],
  ['shirt', 'Linen Shirt', 'chest', 'shirt', 1, 'cloth', 8, 1, 'shirt'],
  ['robe', 'Robe', 'chest', 'robe', 2, 'cloth', 60, 2, 'robe', { robe: true, innate: { mana: 10 } }],
  ['leathertunic', 'Leather Tunic', 'chest', 'chest', 5, 'hide', 60, 4, 'leather'],
  ['chaintunic', 'Chain Tunic', 'chest', 'chain', 8, 'metal', 110, 7, 'chain'],
  ['platechest', 'Plate Cuirass', 'chest', 'plate', 12, 'metal', 200, 10, 'plate'],
  ['trousers', 'Trousers', 'legs', 'legs', 1, 'cloth', 8, 1, 'cloth'],
  ['leatherlegs', 'Leather Leggings', 'legs', 'legs', 4, 'hide', 50, 3, 'leather'],
  ['chainlegs', 'Chain Leggings', 'legs', 'legs', 6, 'metal', 90, 5, 'chain'],
  ['platelegs', 'Plate Greaves', 'legs', 'legs', 9, 'metal', 160, 8, 'plate'],
  ['leathergloves', 'Leather Gloves', 'hands', 'gloves', 2, 'hide', 25, 1, 'leather'],
  ['plategloves', 'Plate Gauntlets', 'hands', 'gloves', 4, 'metal', 70, 3, 'plate'],
  ['shoes', 'Shoes', 'feet', 'shoes', 1, 'hide', 10, 1, 'shoes'],
  ['leatherboots', 'Leather Boots', 'feet', 'boots', 2, 'hide', 30, 2, 'leather'],
  ['platefeet', 'Plate Sabatons', 'feet', 'boots', 4, 'metal', 70, 4, 'plate'],
  ['cloak', 'Cloak', 'back', 'cloak', 1, 'cloth', 35, 2, 'cloak'],
].forEach(([id, name, slot, icon, ar, mat, val, w, look, extra]) =>
  defBase(id, Object.assign({ name, cat: 'armor', slot, icon, ar, mat, val, w, look, codex: 'Armor' }, extra || {})));

// Shields
[
  ['buckler', 'Buckler', 'buckler', 4, 'metal', 40, 3, 0.06],
  ['woodshield', 'Wooden Shield', 'woodshield', 5, 'wood', 35, 4, 0.08],
  ['kite', 'Kite Shield', 'kite', 8, 'metal', 120, 7, 0.1],
  ['tower', 'Tower Shield', 'tower', 12, 'metal', 220, 12, 0.13],
].forEach(([id, name, icon, ar, mat, val, w, block]) =>
  defBase(id, { name, cat: 'shield', slot: 'off', icon, ar, mat, val, w, block, codex: 'Shields' }));

// Jewelry (loot only)
defBase('ring', { name: 'Ring', cat: 'jewelry', slot: 'ring', icon: 'ring', val: 60, w: 0.1, color: '#e6c25a', codex: 'Jewelry' });
defBase('amulet', { name: 'Amulet', cat: 'jewelry', slot: 'neck', icon: 'amulet', val: 70, w: 0.2, color: '#e6c25a', codex: 'Jewelry' });
defBase('talisman', { name: 'Talisman', cat: 'jewelry', slot: 'trinket', icon: 'talisman', val: 80, w: 0.3, color: '#9fd8ff', codex: 'Jewelry' });
defBase('rabbitfoot', { name: "Lucky Rabbit's Foot", cat: 'jewelry', slot: 'trinket', icon: 'rabbitfoot', val: 50, w: 0.1, color: '#e8dcc8', innate: { luck: 15 }, codex: 'Jewelry', noRoll: true });

// Tools (used from your backpack)
defBase('smithhammer', { name: "Smith's Hammer", cat: 'tool', icon: 'smithhammer', tool: 'blacksmith', uses: 100, val: 25, w: 3, color: '#8a8f96', codex: 'Tools' });
defBase('sewingkit', { name: 'Sewing Kit', cat: 'tool', icon: 'sewing', tool: 'tailoring', uses: 100, val: 20, w: 1, color: '#c8a070', codex: 'Tools' });
defBase('saw', { name: "Woodworker's Saw", cat: 'tool', icon: 'saw', tool: 'woodwork', uses: 100, val: 25, w: 2, color: '#a0a6ad', codex: 'Tools' });
defBase('mortar', { name: 'Mortar & Pestle', cat: 'tool', icon: 'mortar', tool: 'alchemy', uses: 100, val: 25, w: 1, color: '#c8c0b0', codex: 'Tools' });
defBase('fishpole', { name: 'Fishing Pole', cat: 'tool', icon: 'pole', tool: 'fishing', uses: 150, val: 20, w: 2, color: '#b08850', codex: 'Tools' });
BASES.hatchet.codex = 'Tools'; BASES.pickaxe.codex = 'Tools';

// Resources generated from materials
for (const m of MATS.metal) {
  defBase('ore_' + m.id, { name: m.name + ' Ore', cat: 'resource', sub: 'ore', icon: 'ore', color: m.color, stack: true, w: 0.6, val: 3 + m.req * 0.25, codex: 'Resources', req: m.req });
  defBase('ingot_' + m.id, { name: m.name + ' Ingot', cat: 'resource', sub: 'metal', icon: 'ingot', color: m.color, stack: true, w: 0.4, val: 6 + m.req * 0.5, codex: 'Resources', req: m.req, matId: m.id, matType: 'metal' });
}
for (const m of MATS.wood) defBase('log_' + m.id, { name: m.name + ' Log', cat: 'resource', sub: 'wood', icon: 'log', color: m.color, stack: true, w: 0.5, val: 2 + m.req * 0.3, codex: 'Resources', req: m.req, matId: m.id, matType: 'wood' });
for (const m of MATS.hide) defBase('hide_' + m.id, { name: m.res, cat: 'resource', sub: 'hide', icon: 'hide', color: m.color, stack: true, w: 0.3, val: 3 + m.req * 0.4, codex: 'Resources', req: m.req, matId: m.id, matType: 'hide' });
for (const m of MATS.cloth) defBase('cloth_' + m.id, { name: m.res, cat: 'resource', sub: 'cloth', icon: 'cloth', color: m.color, stack: true, w: 0.2, val: 2 + m.req * 0.4, codex: 'Resources', req: m.req, matId: m.id, matType: 'cloth' });

const GEMS = [
  ['amethyst', 'Amethyst', '#a66bff', 0, 30], ['ruby', 'Ruby', '#ff3b4f', 20, 45], ['sapphire', 'Sapphire', '#3b7bff', 35, 60],
  ['emerald', 'Emerald', '#2fd17a', 50, 80], ['diamond', 'Diamond', '#e9fbff', 70, 140], ['stargem', 'Star Opal', '#ffb3f0', 90, 300],
];
for (const [id, name, color, req, val] of GEMS) defBase('gem_' + id, { name, cat: 'resource', sub: 'gem', icon: 'gem', color, stack: true, w: 0.1, val, req, codex: 'Herbs & Gems' });

const HERBS = [
  ['sunleaf', 'Sunleaf', '#f0d84a', 0], ['moonpetal', 'Moonpetal', '#a9b6ff', 10], ['frostcap', 'Frostcap', '#86e6ff', 30],
  ['emberroot', 'Emberroot', '#ff6a3a', 45], ['ghostbloom', 'Ghostbloom', '#d6fff0', 70],
];
for (const [id, name, color, req] of HERBS) defBase(id, { name, cat: 'resource', sub: 'herb', icon: 'herb', color, stack: true, w: 0.05, val: 3 + req * 0.3, req, codex: 'Herbs & Gems' });

const FISH = [
  ['trout', 'Trout', '#9fb88a', 0, 4], ['bass', 'Bass', '#6f9a5a', 20, 7], ['salmon', 'Salmon', '#e6876a', 40, 12],
  ['swordfish', 'Swordfish', '#6a8ac8', 65, 25], ['glowfin', 'Glowfin', '#6affe0', 85, 60],
];
for (const [id, name, color, req, val] of FISH) defBase('fish_' + id, { name: 'Raw ' + name, cat: 'resource', sub: 'fish', icon: 'fish', color, stack: true, w: 0.5, val, req, codex: 'Fish & Food' });

// Food
defBase('raw_meat', { name: 'Raw Meat', cat: 'resource', sub: 'food', icon: 'meat', color: '#c8564a', stack: true, w: 0.4, val: 2, codex: 'Fish & Food' });
const FOODS = [
  ['cook_meat', 'Roast Meat', 'raw_meat', 0, '#9a5a32', { heal: 10, buff: { regen: 1 }, dur: 120 }],
  ['cook_trout', 'Cooked Trout', 'fish_trout', 5, '#c8a070', { heal: 12, buff: { regen: 1 }, dur: 150 }],
  ['cook_bass', 'Grilled Bass', 'fish_bass', 25, '#b08a50', { heal: 18, buff: { regen: 2 }, dur: 180 }],
  ['cook_salmon', 'Smoked Salmon', 'fish_salmon', 45, '#e0805a', { heal: 25, buff: { regen: 2, mregen: 1 }, dur: 240 }],
  ['cook_sword', 'Swordfish Steak', 'fish_swordfish', 65, '#8aa0d0', { heal: 35, buff: { regen: 3, str: 5 }, dur: 300 }],
  ['cook_glow', 'Glowfin Feast', 'fish_glowfin', 85, '#6affe0', { heal: 50, buff: { regen: 4, luck: 25 }, dur: 300 }],
];
for (const [id, name, from, req, color, use] of FOODS) defBase(id, { name, cat: 'consumable', sub: 'food', icon: 'cookedfish', color, stack: true, w: 0.3, val: 4 + req * 0.6, req, from, use: Object.assign({ food: true }, use), codex: 'Fish & Food' });
BASES.cook_meat.icon = 'cookedmeat';

// Potions & elixirs
[
  ['hpot_l', 'Lesser Healing Potion', '#ff6a6a', { heal: 22, potion: 'hp' }, 15],
  ['hpot', 'Healing Potion', '#ff3030', { heal: 45, potion: 'hp' }, 40],
  ['hpot_g', 'Greater Healing Potion', '#d0002a', { heal: 85, potion: 'hp' }, 90],
  ['mpot', 'Mana Potion', '#4a7bff', { mana: 30, potion: 'mp' }, 30],
  ['mpot_g', 'Greater Mana Potion', '#2a3bff', { mana: 65, potion: 'mp' }, 80],
  ['elixir_swift', 'Elixir of Haste', '#86e6ff', { buff: { speed: 12, spd: 8 }, dur: 180 }, 60],
  ['elixir_might', 'Elixir of Might', '#ff8a2a', { buff: { str: 10, dmg: 8 }, dur: 180 }, 70],
  ['elixir_fortune', 'Elixir of Fortune', '#ffd94a', { buff: { luck: 60, gold: 20 }, dur: 300 }, 200],
].forEach(([id, name, color, use, val]) => defBase(id, { name, cat: 'consumable', sub: 'potion', icon: 'potion', color, stack: true, w: 0.3, val, use, codex: 'Potions' }));
defBase('bandage', { name: 'Bandage', cat: 'consumable', sub: 'bandage', icon: 'bandage', color: '#efe8d8', stack: true, w: 0.05, val: 2, codex: 'Potions' });
defBase('arrow', { name: 'Arrow', cat: 'consumable', sub: 'arrow', icon: 'arrow', color: '#caa36c', stack: true, w: 0.02, val: 1, codex: 'Potions' });

// Caches (open from your pack for a random reward)
[
  ['cache_d', 'Daily Cache', '#7fe08a', 1, 1, 40], ['coffer', 'Sunken Coffer', '#5aa0a0', 1, 2, 60],
  ['cache_c', "Collector's Cache", '#4aa8ff', 2, 2, 150], ['cache_g', 'Gilded Cache', '#b765ff', 3, 3, 400],
  ['cache_a', 'Artifact Coffer', '#ffd94a', 5, 4, 1500],
].forEach(([id, name, color, minR, tier, val]) => defBase(id, { name, cat: 'consumable', sub: 'cache', icon: 'cache', color, stack: true, w: 1, val, use: { cache: { minR, tier } }, codex: 'Potions' }));

// Misc drops
defBase('bone', { name: 'Bone', cat: 'resource', sub: 'junk', icon: 'bone', color: '#e8e2cc', stack: true, w: 0.2, val: 2, codex: 'Resources' });
defBase('slimegel', { name: 'Slime Gel', cat: 'resource', sub: 'junk', icon: 'gel', color: '#7ad95a', stack: true, w: 0.1, val: 4, codex: 'Resources' });
defBase('oldboot', { name: 'Soggy Old Boot', cat: 'resource', sub: 'junk', icon: 'boots', color: '#5a4a3a', stack: true, w: 1, val: 1, codex: 'Fish & Food' });

// Trophies: rare collectible monster parts
const TROPHIES = [
  ['tr_rat', 'Giant Rat Tail', '#c8a0a0', 15], ['tr_crab', 'Iridescent Shell', '#ff9a8a', 20], ['tr_antler', 'Stag Antler', '#d8c8a0', 25],
  ['tr_wolf', 'Wolf Fang', '#efe8d8', 40], ['tr_bear', 'Bear Claw', '#6a4a3a', 50], ['tr_slime', 'Slime Core', '#8aff6a', 45],
  ['tr_spider', 'Spider Eye', '#c83a8a', 55], ['tr_bandit', "Bandit's Mask", '#3a3a3a', 60], ['tr_skull', 'Polished Skull', '#efe8d8', 80],
  ['tr_tusker', 'Bogrunt Tusk', '#e8e0b0', 90], ['tr_wraith', 'Wraith Essence', '#9a7aff', 140], ['tr_ogre', 'Ogre Tooth', '#e0d090', 160],
  ['tr_troll', 'Troll Heart', '#6a8a3a', 180], ['tr_drake', 'Drake Claw', '#c84a2a', 260], ['tr_hollow', 'Shard of the Hollow Crown', '#b8a0ff', 800],
  ['tr_cinder', 'Cinder Scale', '#ff6a2a', 900],
];
for (const [id, name, color, val] of TROPHIES) defBase(id, { name, cat: 'trophy', icon: 'trophy', color, stack: true, w: 0.2, val, codex: 'Trophies' });

// ---------- Artifacts (unique, gold-named) ----------
const ARTIFACTS = [
  { id: 'dawnbringer', name: 'Dawnbringer', base: 'longsword', mat: 'silver', aff: [['dmg', 35], ['fire', 10], ['hp', 20]], lore: 'Forged at first light, it burns brightest against the dark.' },
  { id: 'pinewhisper', name: 'Whisper of the Pines', base: 'longbow', mat: 'yew', aff: [['spd', 15], ['dex', 8], ['hit', 10]], lore: 'The string hums like wind in the high branches.' },
  { id: 'gravewarden', name: "Gravewarden's Bulwark", base: 'tower', mat: 'adamant', aff: [['hp', 30], ['ar', 8], ['regen', 3]], lore: 'It held the crypt door for a hundred years.' },
  { id: 'hollowcrown', name: 'Crown of the Hollow King', base: 'platehelm', mat: 'starmetal', aff: [['int', 10], ['mana', 25], ['mregen', 4], ['spell', 15]], lore: 'Cold, and heavier than any crown should be.', boss: 'hollowking' },
  { id: 'cinderheart', name: 'Heart of Cindermaw', base: 'amulet', aff: [['str', 10], ['hp', 35], ['regen', 4], ['luck', 30]], lore: 'Still warm. Still beating.', boss: 'cindermaw' },
  { id: 'tinkerhammer', name: "Tinker's Lucky Hammer", base: 'smithhammer', aff: [['skill', 12, 'blacksmith'], ['luck', 40]], lore: 'Every strike rings true.' },
  { id: 'deepdelver', name: "Deepdelver's Pick", base: 'pickaxe', mat: 'adamant', aff: [['skill', 12, 'mining'], ['yield', 30]], lore: 'It always finds the vein.' },
  { id: 'moonweave', name: 'Moonweave Robe', base: 'robe', mat: 'shadowsilk', aff: [['int', 8], ['mana', 30], ['mregen', 5], ['spell', 12]], lore: 'Woven only under a full moon.' },
  { id: 'wanderer', name: 'Band of the Wanderer', base: 'ring', aff: [['speed', 10], ['dex', 6], ['luck', 30]], lore: 'Its last owner never stayed in one place.' },
  { id: 'anglerdream', name: "The Angler's Dream", base: 'fishpole', aff: [['skill', 15, 'fishing'], ['luck', 60]], lore: 'The fish practically leap onto the hook.' },
  { id: 'stormcaller', name: 'Stormcaller', base: 'wizstaff', mat: 'elderwood', aff: [['spell', 25], ['int', 10], ['mregen', 3]], lore: 'Clouds gather wherever it is raised.' },
  { id: 'bloodfang', name: 'Bloodfang', base: 'katana', mat: 'mithril', aff: [['leech', 12], ['dmg', 25], ['spd', 10]], lore: 'It is always thirsty.' },
  { id: 'titanmaul', name: "Titan's Maul", base: 'warhammer', mat: 'adamant', aff: [['str', 12], ['dmg', 40], ['hit', 8]], lore: 'Mountains have been leveled with less.' },
];
const ARTIFACT_BY_ID = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a]));

// ---------- Spells ----------
const SPELLS = [
  { id: 'spark', name: 'Spark', req: 0, mana: 4, cast: 0.6, dmg: [4, 8], kind: 'bolt', color: '#ffe066', desc: 'A crackling bolt of energy.' },
  { id: 'mend', name: 'Mend', req: 10, mana: 7, cast: 0.8, heal: [10, 18], kind: 'heal', color: '#7dff9a', desc: 'Close minor wounds.' },
  { id: 'flame', name: 'Flame Lance', req: 30, mana: 11, cast: 1.0, dmg: [11, 19], kind: 'bolt', color: '#ff7a2e', desc: 'A spear of fire.' },
  { id: 'frost', name: 'Frost Shard', req: 45, mana: 13, cast: 1.0, dmg: [12, 20], kind: 'bolt', slow: true, color: '#8fe3ff', desc: 'Damages and slows the target.' },
  { id: 'restore', name: 'Restoration', req: 60, mana: 18, cast: 1.4, heal: [35, 55], kind: 'heal', color: '#b5ffd0', desc: 'A powerful healing light.' },
  { id: 'chain', name: 'Chain Lightning', req: 70, mana: 20, cast: 1.2, dmg: [16, 26], kind: 'chain', color: '#c9b3ff', desc: 'Strikes the target and up to 2 nearby foes.' },
  { id: 'meteor', name: 'Meteor', req: 88, mana: 30, cast: 1.8, dmg: [30, 48], kind: 'aoe', radius: 2, color: '#ff4a2e', desc: 'Calls down fire on an area.' },
];

// ---------- Crafting recipes ----------
// mats: {m:'metal', n} = any material of that class (player picks), {id, n} = fixed item
const RECIPES = [];
function rec(skill, out, req, mats, extra) { RECIPES.push(Object.assign({ id: skill + ':' + out, skill, out, req, mats, qty: 1 }, extra || {})); }
// Blacksmithing @ anvil
[
  ['dagger', 0, 3], ['pickaxe', 5, 4], ['hatchet', 5, 4], ['buckler', 8, 6], ['shortsword', 10, 6], ['mace', 20, 7],
  ['chaincoif', 20, 7], ['rapier', 30, 8], ['longsword', 35, 10], ['chainlegs', 35, 12], ['chaintunic', 42, 16],
  ['scimitar', 45, 9], ['kite', 50, 14], ['spear', 50, 10], ['battleaxe', 55, 14], ['platehelm', 58, 12],
  ['plategloves', 60, 10], ['platefeet', 62, 12], ['warhammer', 65, 16], ['platelegs', 70, 18], ['katana', 75, 12],
  ['platechest', 80, 24], ['greatsword', 85, 18], ['tower', 90, 22],
].forEach(([out, req, n]) => rec('blacksmith', out, req, [{ m: 'metal', n }], { station: 'anvil' }));
rec('blacksmith', 'smithhammer', 10, [{ id: 'ingot_iron', n: 4 }], { station: 'anvil' });
rec('blacksmith', 'saw', 10, [{ id: 'ingot_iron', n: 3 }], { station: 'anvil' });
// Tailoring
rec('tailoring', 'bandage', 0, [{ id: 'cloth_linen', n: 1 }], { qty: 8 });
rec('tailoring', 'sewingkit', 5, [{ id: 'cloth_linen', n: 2 }]);
[['shirt', 5, 'cloth', 4], ['trousers', 8, 'cloth', 4], ['shoes', 10, 'hide', 3], ['cloak', 20, 'cloth', 8], ['leathercap', 22, 'hide', 4],
  ['leathergloves', 28, 'hide', 4], ['leatherboots', 32, 'hide', 5], ['wizhat', 35, 'cloth', 6], ['leatherlegs', 42, 'hide', 8],
  ['robe', 50, 'cloth', 12], ['leathertunic', 55, 'hide', 12]].forEach(([out, req, m, n]) => rec('tailoring', out, req, [{ m, n }]));
// Woodworking
rec('woodwork', 'arrow', 0, [{ id: 'log_pine', n: 1 }], { qty: 12 });
rec('woodwork', 'mortar', 5, [{ id: 'log_pine', n: 3 }]);
rec('woodwork', 'fishpole', 10, [{ id: 'log_pine', n: 4 }]);
[['club', 0, 4], ['quarterstaff', 15, 6], ['woodshield', 20, 8], ['shortbow', 30, 8], ['longbow', 55, 12], ['wizstaff', 65, 12], ['crossbow', 75, 14]]
  .forEach(([out, req, n]) => rec('woodwork', out, req, [{ m: 'wood', n }]));
// Alchemy
[
  ['hpot_l', 0, [['sunleaf', 2]]], ['mpot', 15, [['moonpetal', 2]]], ['hpot', 35, [['sunleaf', 3], ['moonpetal', 1]]],
  ['elixir_swift', 45, [['frostcap', 2], ['sunleaf', 1]]], ['elixir_might', 55, [['emberroot', 2], ['frostcap', 1]]],
  ['mpot_g', 65, [['moonpetal', 3], ['ghostbloom', 1]]], ['hpot_g', 75, [['sunleaf', 3], ['ghostbloom', 1], ['emberroot', 1]]],
  ['elixir_fortune', 88, [['ghostbloom', 2], ['gem_emerald', 1]]],
].forEach(([out, req, m]) => rec('alchemy', out, req, m.map(([id, n]) => ({ id, n }))));
// Cooking @ oven/forge
for (const [id, , from, req] of FOODS) rec('cooking', id, req, [{ id: from, n: 1 }], { station: 'heat' });
// Smelting (Mining) @ forge
for (const m of MATS.metal) rec('mining', 'ingot_' + m.id, m.req, [{ id: 'ore_' + m.id, n: 1 }], { station: 'forge', smelt: true });

const CRAFT_SKILLS = [
  { skill: 'blacksmith', tool: 'blacksmith', label: 'Blacksmithing' },
  { skill: 'tailoring', tool: 'tailoring', label: 'Tailoring' },
  { skill: 'woodwork', tool: 'woodwork', label: 'Woodworking' },
  { skill: 'alchemy', tool: 'alchemy', label: 'Alchemy' },
  { skill: 'cooking', tool: null, label: 'Cooking' },
  { skill: 'mining', tool: null, label: 'Smelting' },
];

// ---------- Monsters ----------
// body: quad | humanoid | blob | wisp | spider | drake
const MONSTERS = {
  rabbit: { name: 'Rabbit', body: 'quad', look: { len: 9, h: 6, color: '#b8a088', ears: 'long', tail: 'puff', leg: 3 }, tier: 0, hp: 6, dmg: [1, 2], atk: 5, def: 5, ar: 0, step: 0.3, passive: 'flee',
    loot: { gold: [0, 0], mats: [['raw_meat', 1, 1, 1]], trophy: 'rabbitfoot', trophyChance: 0.04 } },
  deer: { name: 'Deer', body: 'quad', look: { len: 20, h: 12, color: '#a0703c', ears: 'deer', antlers: true, leg: 11 }, tier: 0, hp: 22, dmg: [2, 4], atk: 15, def: 20, ar: 2, step: 0.3, passive: 'flee', tame: { diff: 15, slots: 1 },
    loot: { gold: [0, 0], mats: [['hide_plain', 1, 1, 3], ['raw_meat', 1, 1, 2]], trophy: 'tr_antler' } },
  horse: { name: 'Wild Horse', body: 'quad', look: { len: 24, h: 16, color: '#7a5030', mane: '#2a1a10', ears: 'deer', leg: 14 }, tier: 0, hp: 45, dmg: [3, 6], atk: 25, def: 30, ar: 4, step: 0.22, passive: 'flee', tame: { diff: 30, slots: 1 }, mount: true,
    loot: { gold: [0, 0], mats: [['hide_plain', 1, 2, 4]] } },
  rat: { name: 'Giant Rat', body: 'quad', look: { len: 12, h: 7, color: '#6a5a50', ears: 'round', tail: 'long', leg: 3 }, tier: 0, hp: 11, dmg: [1, 3], atk: 15, def: 10, ar: 0, step: 0.35, aggro: 5,
    loot: { gold: [1, 6], mats: [['raw_meat', 0.4, 1, 1]], trophy: 'tr_rat' } },
  crab: { name: 'Shore Crab', body: 'spider', look: { r: 7, color: '#d85a3a', legs: 6, claws: true }, tier: 0, hp: 15, dmg: [1, 4], atk: 20, def: 20, ar: 6, step: 0.4, aggro: 4,
    loot: { gold: [1, 8], mats: [['raw_meat', 0.5, 1, 1]], trophy: 'tr_crab' } },
  wolf: { name: 'Gray Wolf', body: 'quad', look: { len: 18, h: 10, color: '#7a7a80', ears: 'point', tail: 'bushy', leg: 8 }, tier: 1, hp: 28, dmg: [3, 7], atk: 40, def: 35, ar: 4, step: 0.26, aggro: 8, tame: { diff: 40, slots: 1 },
    loot: { gold: [0, 0], mats: [['hide_plain', 1, 1, 2]], trophy: 'tr_wolf' } },
  bear: { name: 'Black Bear', body: 'quad', look: { len: 22, h: 15, color: '#2e2620', ears: 'round', tail: 'stub', leg: 7, bulky: true }, tier: 1, hp: 48, dmg: [4, 9], atk: 40, def: 40, ar: 6, step: 0.32, aggro: 0, tame: { diff: 45, slots: 1 },
    loot: { gold: [0, 0], mats: [['hide_plain', 1, 2, 3], ['raw_meat', 1, 1, 3]], trophy: 'tr_bear' } },
  slime: { name: 'Green Slime', body: 'blob', look: { r: 10, color: '#6ad04a' }, tier: 1, hp: 30, dmg: [3, 6], atk: 35, def: 20, ar: 0, step: 0.45, aggro: 6,
    loot: { gold: [3, 12], mats: [['slimegel', 0.8, 1, 3]], gear: 0.12, trophy: 'tr_slime' } },
  spider: { name: 'Giant Spider', body: 'spider', look: { r: 9, color: '#3a2a3a', legs: 8, mark: '#c83a3a' }, tier: 1, hp: 36, dmg: [4, 8], atk: 45, def: 35, ar: 4, step: 0.3, aggro: 7,
    loot: { gold: [2, 10], mats: [['cloth_silk', 0.6, 1, 3]], gear: 0.12, trophy: 'tr_spider' } },
  bandit: { name: 'Bandit', body: 'humanoid', look: { skin: '#d9a47a', chest: '#4a3a2a', legs: '#2a2a2a', hood: '#3a3a3a', weapon: 'sword', wcolor: '#a4abb3' }, tier: 1, hp: 45, dmg: [4, 10], atk: 50, def: 45, ar: 8, step: 0.28, aggro: 8,
    loot: { gold: [15, 40], gear: 0.35, trophy: 'tr_bandit' } },
  zombie: { name: 'Zombie', body: 'humanoid', look: { skin: '#7a9a6a', chest: '#4a4a3a', legs: '#3a3a2a', hair: '#2a2a1a', ragged: true }, tier: 2, hp: 55, dmg: [5, 10], atk: 45, def: 35, ar: 4, step: 0.55, aggro: 7, undead: true,
    loot: { gold: [5, 20], mats: [['bone', 0.5, 1, 2]], gear: 0.22 } },
  skeleton: { name: 'Skeleton', body: 'humanoid', look: { skeleton: true, weapon: 'sword', wcolor: '#8a8f96', shield: true }, tier: 2, hp: 52, dmg: [5, 11], atk: 55, def: 50, ar: 10, step: 0.32, aggro: 8, undead: true,
    loot: { gold: [8, 25], mats: [['bone', 1, 1, 3]], gear: 0.3, trophy: 'tr_skull' } },
  direwolf: { name: 'Dire Wolf', body: 'quad', look: { len: 22, h: 13, color: '#3a3a44', ears: 'point', tail: 'bushy', leg: 10, eyes: '#ff4a2a' }, tier: 2, hp: 66, dmg: [6, 13], atk: 65, def: 60, ar: 8, step: 0.24, aggro: 9, tame: { diff: 70, slots: 2 },
    loot: { gold: [0, 0], mats: [['hide_thick', 1, 1, 2]], trophy: 'tr_wolf' } },
  grizzly: { name: 'Grizzly Bear', body: 'quad', look: { len: 26, h: 18, color: '#6a4426', ears: 'round', tail: 'stub', leg: 8, bulky: true }, tier: 2, hp: 85, dmg: [7, 15], atk: 65, def: 60, ar: 10, step: 0.3, aggro: 6, tame: { diff: 65, slots: 2 },
    loot: { gold: [0, 0], mats: [['hide_thick', 1, 2, 4], ['raw_meat', 1, 2, 3]], trophy: 'tr_bear' } },
  tusker: { name: 'Bogrunt', body: 'humanoid', look: { skin: '#6a8a3a', chest: '#5a3a1e', legs: '#3a2a1a', tusks: true, weapon: 'axe', wcolor: '#8a8f96', scale: 1.1 }, tier: 2, hp: 72, dmg: [7, 14], atk: 65, def: 60, ar: 14, step: 0.3, aggro: 9,
    loot: { gold: [30, 70], gear: 0.45, trophy: 'tr_tusker' } },
  captain: { name: 'Bandit Captain', body: 'humanoid', look: { skin: '#c08a5c', chest: '#7a2a2a', legs: '#2a2a2a', hood: '#1a1a1a', weapon: 'longsword', wcolor: '#d0d6dc', cloak: '#3a1a1a' }, tier: 2, hp: 110, dmg: [9, 17], atk: 75, def: 70, ar: 18, step: 0.27, aggro: 9,
    loot: { gold: [60, 130], gear: 0.7, trophy: 'tr_bandit' } },
  bonemage: { name: 'Bone Mage', body: 'humanoid', look: { skeleton: true, robe: '#3a2a5a', weapon: 'staff', wcolor: '#6a4a8a' }, tier: 2, hp: 70, dmg: [4, 8], atk: 50, def: 50, ar: 6, step: 0.35, aggro: 10, undead: true,
    ranged: { range: 7, dmg: [8, 15], color: '#8fe3ff', cd: 3.2 },
    loot: { gold: [20, 50], mats: [['bone', 1, 1, 2], ['moonpetal', 0.5, 1, 3]], gear: 0.5, trophy: 'tr_skull' } },
  wraith: { name: 'Wraith', body: 'wisp', look: { r: 11, color: '#7a5aff', wraith: true }, tier: 3, hp: 95, dmg: [8, 16], atk: 75, def: 70, ar: 8, step: 0.3, aggro: 10, undead: true,
    ranged: { range: 7, dmg: [10, 18], color: '#a07aff', cd: 3 },
    loot: { gold: [40, 90], mats: [['cloth_shadowsilk', 0.6, 1, 2], ['ghostbloom', 0.3, 1, 2]], gear: 0.7, trophy: 'tr_wraith' } },
  ogre: { name: 'Ogre', body: 'humanoid', look: { skin: '#a08a5a', chest: '#5a4a2a', legs: '#4a3a1e', weapon: 'club', wcolor: '#7a5a3a', scale: 1.55, bald: true }, tier: 3, hp: 175, dmg: [12, 24], atk: 80, def: 70, ar: 16, step: 0.4, aggro: 8,
    loot: { gold: [80, 180], gear: 0.85, rolls: 2, trophy: 'tr_ogre' } },
  troll: { name: 'Troll', body: 'humanoid', look: { skin: '#5a7a6a', chest: '#3a4a3a', legs: '#2a3a2a', weapon: 'mace', wcolor: '#6a6a6a', scale: 1.45, tusks: true, bald: true }, tier: 3, hp: 200, dmg: [12, 22], atk: 85, def: 75, ar: 20, step: 0.35, aggro: 8, regen: 3,
    loot: { gold: [90, 200], gear: 0.85, rolls: 2, trophy: 'tr_troll' } },
  drake: { name: 'Drake', body: 'drake', look: { len: 28, h: 16, color: '#b8402a', belly: '#e0a050', leg: 9 }, tier: 3, hp: 240, dmg: [14, 26], atk: 90, def: 80, ar: 22, step: 0.3, aggro: 10, tame: { diff: 90, slots: 3 },
    ranged: { range: 6, dmg: [16, 28], color: '#ff6a2a', cd: 5, breath: true },
    loot: { gold: [120, 260], mats: [['hide_scaled', 1, 2, 4]], gear: 1, rolls: 2, trophy: 'tr_drake' } },
  // Bosses
  hollowking: { name: 'The Hollow King', body: 'humanoid', look: { skeleton: true, robe: '#2a1a4a', crown: true, weapon: 'staff', wcolor: '#b8a0ff', scale: 1.5, glow: '#8fe3ff' }, tier: 4, boss: true, hp: 1300, dmg: [18, 32], atk: 100, def: 95, ar: 25, step: 0.34, aggro: 12, undead: true,
    ranged: { range: 8, dmg: [22, 38], color: '#8fe3ff', cd: 2.6 }, summon: 'skeleton',
    loot: { gold: [800, 1500], gear: 1, rolls: 5, minR: 2, trophy: 'tr_hollow', trophyChance: 0.5, artifacts: ['hollowcrown', 'gravewarden', 'moonweave', 'stormcaller'], artChance: 0.35 } },
  cindermaw: { name: 'Cindermaw the Elder', body: 'drake', look: { len: 40, h: 24, color: '#5a1a12', belly: '#ff8a2a', leg: 13, horns: true }, tier: 4, boss: true, hp: 1700, dmg: [22, 38], atk: 105, def: 100, ar: 30, step: 0.3, aggro: 12,
    ranged: { range: 7, dmg: [28, 45], color: '#ff4a1a', cd: 3.5, breath: true },
    loot: { gold: [1200, 2200], mats: [['hide_scaled', 1, 6, 10]], gear: 1, rolls: 6, minR: 2, trophy: 'tr_cinder', trophyChance: 0.5, artifacts: ['cinderheart', 'titanmaul', 'bloodfang', 'dawnbringer'], artChance: 0.35 } },
};
// Spawn tables by biome & tier
const SPAWNS = {
  plains: [['rabbit', 'deer', 'rat', 'horse'], ['wolf', 'bandit', 'slime', 'deer'], ['captain', 'tusker', 'grizzly', 'bandit'], ['ogre', 'troll', 'captain']],
  forest: [['deer', 'rabbit', 'rat'], ['wolf', 'bear', 'spider'], ['direwolf', 'grizzly', 'tusker', 'spider'], ['troll', 'wraith', 'direwolf']],
  swamp: [['rat', 'slime'], ['slime', 'zombie', 'spider'], ['zombie', 'skeleton', 'bonemage'], ['wraith', 'bonemage', 'troll']],
  mountain: [['rat', 'rabbit'], ['wolf', 'tusker'], ['tusker', 'direwolf', 'ogre'], ['ogre', 'troll', 'drake']],
  beach: [['crab', 'rabbit'], ['crab', 'slime', 'bandit'], ['captain', 'tusker'], ['ogre', 'troll']],
};
const BOSS_LAIRS = [
  { id: 'hollowking', name: 'Hollow Crypt', x: 34, y: 162, respawn: 600 },
  { id: 'cindermaw', name: "Cindermaw's Roost", x: 162, y: 26, respawn: 600 },
];

// ---------- Towns & vendors ----------
const TOWNS = [
  { id: 'havenmoor', name: 'Havenmoor', x: 100, y: 100, wall: 'timber', roof: '#9a3a2a',
    desc: 'A busy crossroads town in the green heart of the vale. Every trade has a shop here, and the roads lead everywhere.',
    roles: ['banker', 'mage', 'blacksmith', 'provisioner', 'healer', 'tailor'], forge: true, anvil: true },
  { id: 'ironreach', name: 'Ironreach', x: 64, y: 50, wall: 'stone', roof: '#4a5a6a',
    desc: 'A hard stone town at the foot of the northern peaks. The best ore in the land, and the most dangerous mountains.',
    roles: ['banker', 'miner', 'blacksmith', 'provisioner', 'healer', 'bowyer'], forge: true, anvil: true },
  { id: 'saltmere', name: 'Saltmere', x: 144, y: 120, wall: 'wood', roof: '#2a6a7a',
    desc: 'A salty harbor town on the eastern sea. Fishers, herbalists and traders of strange curios.',
    roles: ['banker', 'alchemist', 'fisher', 'provisioner', 'healer', 'tailor'], forge: true, anvil: false, docks: true },
];
const VENDORS = {
  banker: { title: 'Banker', icon: 'coins', bank: true, buys: [], sells: [], color: '#d8b84a' },
  blacksmith: { title: 'Blacksmith', icon: 'smithhammer', color: '#8a8f96',
    sells: ['dagger', 'shortsword', 'longsword', 'mace', 'buckler', 'chaincoif', 'chaintunic', 'chainlegs', 'pickaxe', 'hatchet', 'smithhammer', 'saw', 'ingot_iron'],
    buys: ['weapon', 'armor', 'shield', 'metal', 'ore'], trains: ['blacksmith', 'swords', 'maces', 'fencing', 'parrying'] },
  provisioner: { title: 'Provisioner', icon: 'bandage', color: '#b08850',
    sells: ['bandage', 'arrow', 'fishpole', 'sewingkit', 'mortar', 'saw', 'pickaxe', 'hatchet', 'cloth_linen', 'cook_meat', 'shirt', 'trousers', 'shoes', 'cloak'],
    buys: ['food', 'fish', 'junk', 'wood', 'tool', 'hide', 'cloth'], trains: ['cooking', 'lumberjack', 'archery', 'wrestling', 'tactics'] },
  mage: { title: 'Mage', icon: 'wstaff', color: '#6a4aaa',
    sells: ['mpot', 'hpot_l', 'wizhat', 'robe', 'quarterstaff', 'wizstaff', 'moonpetal'],
    buys: ['herb', 'potion', 'jewelry', 'gem'], trains: ['magery', 'meditation'] },
  healer: { title: 'Healer', icon: 'potion', color: '#d84a4a', heals: true,
    sells: ['bandage', 'hpot_l', 'hpot', 'sunleaf'], buys: ['herb', 'potion'], trains: ['healing', 'anatomy'] },
  tailor: { title: 'Tailor', icon: 'cloth', color: '#c86a9a',
    sells: ['cloth_linen', 'hide_plain', 'sewingkit', 'shirt', 'trousers', 'shoes', 'cloak', 'leathercap', 'leathertunic', 'leatherlegs', 'leathergloves', 'leatherboots', 'robe'],
    buys: ['armor', 'cloth', 'hide'], trains: ['tailoring'] },
  fisher: { title: 'Fishmonger', icon: 'fish', color: '#4a8ab0',
    sells: ['fishpole', 'cook_trout', 'cook_bass'], buys: ['fish', 'food', 'junk', 'trophy'], trains: ['fishing', 'cooking'] },
  alchemist: { title: 'Alchemist', icon: 'mortar', color: '#4ab07a',
    sells: ['mortar', 'sunleaf', 'moonpetal', 'hpot_l', 'hpot', 'mpot'], buys: ['herb', 'potion', 'gem'], trains: ['alchemy', 'herbalism'] },
  bowyer: { title: 'Bowyer', icon: 'bow', color: '#8a6a3a',
    sells: ['shortbow', 'longbow', 'arrow', 'saw', 'log_pine', 'club', 'quarterstaff', 'woodshield'], buys: ['weapon', 'wood', 'shield'], trains: ['woodwork', 'archery', 'lumberjack'] },
  miner: { title: 'Mine Foreman', icon: 'pickaxe', color: '#6a6a7a',
    sells: ['pickaxe', 'ingot_iron', 'ore_iron', 'smithhammer'], buys: ['ore', 'metal', 'gem'], trains: ['mining', 'blacksmith'] },
  stable: { title: 'Stablemaster', icon: 'horse', color: '#a07040', stable: true, sells: [], buys: [], trains: ['taming'] },
  collector: { title: 'Curio Collector', icon: 'trophy', color: '#d8b84a', sells: [], buys: ['trophy', 'gem', 'jewelry'], premium: 1.4 },
};

// ---------- Bounties ----------
const BOUNTY_TEMPLATES = [
  { type: 'kill', mobs: ['wolf', 'rat', 'slime', 'spider', 'bandit'], n: [6, 12], tier: 1, text: 'Slay {n} {mob}' },
  { type: 'kill', mobs: ['skeleton', 'zombie', 'tusker', 'grizzly', 'direwolf', 'bonemage'], n: [5, 9], tier: 2, text: 'Slay {n} {mob}' },
  { type: 'kill', mobs: ['ogre', 'troll', 'wraith', 'drake'], n: [2, 4], tier: 3, text: 'Slay {n} {mob}' },
  { type: 'gather', skill: 'mining', n: [20, 40], tier: 1, text: 'Mine {n} ore' },
  { type: 'gather', skill: 'lumberjack', n: [20, 40], tier: 1, text: 'Chop {n} logs' },
  { type: 'gather', skill: 'fishing', n: [10, 20], tier: 1, text: 'Catch {n} fish' },
  { type: 'gather', skill: 'herbalism', n: [15, 30], tier: 1, text: 'Harvest {n} herbs' },
  { type: 'craft', n: [6, 12], tier: 1, text: 'Craft {n} items' },
  { type: 'loot', rarity: 2, n: [1, 3], tier: 2, text: 'Find {n} Rare-or-better items' },
  { type: 'chest', n: [1, 3], tier: 2, text: 'Open {n} treasure chests' },
];
const SEAL_SHOP = [
  { id: 'cache_c', cost: 3, desc: 'Guaranteed Rare or better.' },
  { id: 'cache_g', cost: 8, desc: 'Guaranteed Epic or better.' },
  { id: 'cache_a', cost: 25, desc: 'Contains a random Artifact.' },
  { id: 'elixir_fortune', cost: 2, desc: '+60 Luck for 5 minutes.' },
];
const CODEX_CATS = ['Weapons', 'Armor', 'Shields', 'Jewelry', 'Tools', 'Resources', 'Herbs & Gems', 'Fish & Food', 'Potions', 'Trophies', 'Artifacts'];
const CODEX_MILESTONES = [
  { pct: 5, title: 'the Curious', gold: 200 }, { pct: 10, title: 'the Gatherer', gold: 500 }, { pct: 20, title: 'the Collector', gold: 1000, luck: 5 },
  { pct: 35, title: 'the Hoarder', gold: 2500, luck: 10 }, { pct: 50, title: 'the Curator', gold: 5000, luck: 15 },
  { pct: 70, title: 'the Archivist', gold: 10000, luck: 20 }, { pct: 90, title: 'Keeper of Relics', gold: 25000, luck: 30 },
];
