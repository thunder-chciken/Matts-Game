'use strict';
// =====================================================================
//  Main loop, input, save/load
// =====================================================================
const Settings = { sound: true, autoLoot: false, autoRepeat: true };
const MAX_SLOTS = 4;

const Main = {
  keys: new Set(), mouse: { x: 0, y: 0, down: false, downT: 0, hold: false, downPick: null },

  init() {
    this.loadSettings();
    Sprites.init();
    World.gen(WORLD_SEED);
    Render.init(document.getElementById('game'));
    UI.init();
    this.bindInput();
    Creator.showTitle();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    window.addEventListener('beforeunload', () => { if (Game.state === 'play') this.save(); });
  },
  loadSettings() { try { Object.assign(Settings, JSON.parse(localStorage.getItem('hoardlands_settings') || '{}')); } catch (e) { /* defaults */ } Sound.on = Settings.sound; },
  saveSettings() { try { localStorage.setItem('hoardlands_settings', JSON.stringify(Settings)); } catch (e) { /* ignore */ } },

  // ---------- Saves ----------
  listSaves() {
    const out = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      try { const s = localStorage.getItem('hoardlands_slot_' + i); out.push(s ? JSON.parse(s) : null); } catch (e) { out.push(null); }
    }
    return out;
  },
  save(manual) {
    if (Game.state !== 'play' || !Game.player) return;
    try {
      const data = Player.serialize();
      data.title = Player.displayTitle();
      localStorage.setItem('hoardlands_slot_' + Game.slot, JSON.stringify(data));
      if (manual) UI.log('Game saved.', '#9ad8ff');
    } catch (e) { UI.log('Could not save: ' + e.message, '#ff7a6a'); }
  },
  load(slot) {
    const s = this.listSaves()[slot];
    if (!s) return;
    Sound.init();
    Game.slot = slot;
    Player.deserialize(s);
    this.startWorld(s.pets || [], false);
  },
  newGame(C) {
    Player.create(C);
    this.startWorld([], true);
    this.save();
  },
  backToTitle() { Game.state = 'title'; Creator.showTitle(); },

  startWorld(pets, isNew) {
    const P = Game.player;
    Game.ents = []; Game.corpses = []; Game.chests = []; Game.effects = []; Game.target = null;
    World.occ.fill(0);
    if (!World.walkable(P.x, P.y)) { const p = World.findWalkableNear(P.x, P.y, 10); P.x = P.fx = p[0]; P.y = P.fy = p[1]; }
    addEnt(P);
    spawnNPCs();
    for (const pd of pets) { const e = Player.adoptPet(pd.mon, pd.name); e.hp = Math.max(1, Math.min(e.maxHp, pd.hp || e.maxHp)); e.mode = pd.mode || 'follow'; }
    if (isNew) {
      // the starter horse was adopted before the world reset
      if (C_hasStarterHorse(P)) Player.adoptPet('horse', 'Trusty Steed');
    }
    Game.state = 'play';
    $('#title').classList.add('hidden'); $('#creator').classList.add('hidden'); $('#hud').classList.remove('hidden');
    UI.closeAll();
    Player.ensureBounties();
    P.lastTown = World.townAt(P.x, P.y);
    const t = World.nearestTown(P.x, P.y);
    UI.banner(t.name, isNew ? 'Your adventure begins.' : 'Welcome back, ' + P.name + '.');
    if (isNew) {
      UI.log(`Welcome to the Vale, ${P.name}! Press H for help.`, '#ffd94a');
      UI.log('Open the Daily Cache in your backpack [I] and claim your Daily Gift [B].', '#7fe08a');
      setTimeout(() => UI.openHelp(), 600);
    } else {
      UI.log(`Welcome back, ${P.name}.`, '#ffd94a');
      if (Player.dailyAvailable()) UI.toast('Daily Gift ready!', '#7fe08a', 'Press B to claim it and keep your streak going.');
    }
    UI.dirty('inv');
  },

  // ---------- Loop ----------
  loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    if (Game.state === 'play') {
      this.update(dt);
      Render.draw(Game.time);
      UI.update(dt, Game.time);
    }
    requestAnimationFrame((tt) => this.loop(tt));
  },
  update(dt) {
    Game.time += dt;
    Game.updateClock(dt);
    const P = Game.player;
    this.handleMovement(dt);
    for (const e of Game.ents.slice()) {
      updateMotion(e, dt);
      if (e.kind === 'mob' || e.kind === 'decor') updateMob(e, dt);
      else if (e.kind === 'pet') updatePet(e, dt);
      else if (e.kind === 'npc') updateNPC(e, dt);
    }
    Player.update(dt);
    Spawner.update(dt);
    updateEffects(dt);
    // hover
    if (!this.mouse.overUI) {
      Game.hoverPick = Render.pickAt(this.mouse.x, this.mouse.y);
      Game.hoverTile = Render.screenToTile(this.mouse.x, this.mouse.y);
      const hp = Game.hoverPick;
      document.getElementById('game').style.cursor = hp ? (hp.kind === 'ent' && hp.ref.kind === 'mob' ? 'crosshair' : 'pointer') : 'default';
    } else { Game.hoverPick = null; Game.hoverTile = null; }
    Game.saveT += dt;
    if (Game.saveT > 30) { Game.saveT = 0; this.save(); }
    void P;
  },
  handleMovement() {
    const P = Game.player;
    if (P.dead || P.mt < 1) return;
    let dx = 0, dy = 0;
    const k = this.keys;
    if (k.has('w') || k.has('arrowup')) { dx -= 1; dy -= 1; }
    if (k.has('s') || k.has('arrowdown')) { dx += 1; dy += 1; }
    if (k.has('a') || k.has('arrowleft')) { dx -= 1; dy += 1; }
    if (k.has('d') || k.has('arrowright')) { dx += 1; dy -= 1; }
    if (!dx && !dy && this.mouse.hold) {
      const [fx, fy] = Render.feet(...Render.visPos(P));
      const [sx, sy] = Render.worldToScreen(fx, fy - 20);
      const vx = this.mouse.x - sx, vy = this.mouse.y - sy;
      if (Math.hypot(vx, vy) > 18) {
        const sector = ((Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) % 8) + 8) % 8;
        [dx, dy] = [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]][sector];
      }
    }
    dx = Math.sign(dx); dy = Math.sign(dy);
    if (!dx && !dy) return;
    P.path = null; P.pathGoal = null; P.pending = null;
    if (P.action && P.action.type !== 'craft') Player.cancelAction();
    if (P.action && P.action.type === 'craft') Player.cancelAction('You stop crafting.');
    const st = Player.stepTime();
    if (!stepEnt(P, dx, dy, st) && dx && dy) { if (!stepEnt(P, dx, 0, st)) stepEnt(P, 0, dy, st); }
  },

  // ---------- Input ----------
  bindInput() {
    const cv = document.getElementById('game');
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (Game.state !== 'play') return;
      const k = e.key.toLowerCase();
      Sound.init();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { this.keys.add(k); e.preventDefault(); return; }
      if (e.repeat) return;
      const P = Game.player;
      if (/^[0-9]$/.test(k)) { this.hotkey(k === '0' ? 9 : +k - 1); return; }
      switch (k) {
        case 'escape': UI.closeAll(); Game.target = null; P.combat = false; Player.cancelAction(); break;
        case 'tab': { e.preventDefault(); this.cycleTarget(); break; }
        case ' ': e.preventDefault(); this.lootNearest(); break;
        case 'r': if (P.mount) Player.dismount(); else { const h = Game.ents.find((x) => x.kind === 'pet' && x.def.mount && U.cheb(x.x, x.y, P.x, P.y) <= 2); if (h) Player.mount(h); else UI.log('No mount nearby.', '#aaa'); } break;
        case 'c': UI.toggle('char'); break;
        case 'i': UI.toggle('inv'); break;
        case 'k': UI.toggle('skills'); break;
        case 'j': UI.toggle('codex'); break;
        case 'b': UI.toggle('bounty'); break;
        case 'p': UI.toggle('pets'); break;
        case 'u': UI.toggle('craft'); break;
        case 'm': UI.toggle('map'); break;
        case 'h': case 'f1': e.preventDefault(); UI.toggle('help'); break;
        case 'o': UI.toggle('settings'); break;
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.hold = false; this.mouse.down = false; });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      this.mouse.overUI = e.target !== cv;
    });
    cv.addEventListener('mousedown', (e) => {
      if (Game.state !== 'play') return;
      Sound.init();
      UI.closeCtx();
      if (e.button === 0) {
        this.mouse.down = true; this.mouse.downT = performance.now(); this.mouse.downPick = Render.pickAt(e.clientX, e.clientY);
        if (!this.mouse.downPick) setTimeout(() => { if (this.mouse.down && performance.now() - this.mouse.downT >= 200) this.mouse.hold = true; }, 210);
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0 || !this.mouse.down) return;
      const wasHold = this.mouse.hold;
      this.mouse.down = false; this.mouse.hold = false;
      if (Game.state !== 'play' || e.target !== cv || wasHold) return;
      const pk = Render.pickAt(e.clientX, e.clientY);
      if (pk) Player.interact(pk);
      else { const [tx, ty] = Render.screenToTile(e.clientX, e.clientY); Player.clickGround(tx, ty); }
    });
    cv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (Game.state !== 'play') return;
      const pk = Render.pickAt(e.clientX, e.clientY);
      if (!pk) return;
      const opts = this.contextFor(pk);
      if (opts.length) UI.ctxMenu(e.clientX, e.clientY, opts);
    });
    cv.addEventListener('wheel', (e) => { Render.zoom = U.clamp(Render.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.8, 2.6); e.preventDefault(); }, { passive: false });
  },
  contextFor(pk) {
    const P = Game.player, o = [];
    if (pk.kind === 'ent') {
      const e = pk.ref;
      if (e.kind === 'mob') {
        o.push({ label: `Attack ${e.name}`, fn: () => Player.interact(pk) });
        if (e.def.tame) o.push({ label: `Tame (difficulty ${e.def.tame.diff})`, fn: () => Player.interact(pk, 'tame') });
        o.push({ label: 'Inspect', fn: () => UI.log(`${e.name}: ${Math.ceil(e.hp)}/${e.maxHp} HP · ${['harmless', 'weak', 'dangerous', 'deadly', 'legendary'][e.def.tier]}${e.def.tame ? ' · tameable (' + e.def.tame.diff + ')' : ''}`, '#d8d8d8') });
      } else if (e.kind === 'pet') {
        if (e.def.mount && !P.mount) o.push({ label: `Ride ${e.name}`, fn: () => Player.interact(pk) });
        o.push({ label: e.mode === 'stay' ? 'Follow me' : 'Stay here', fn: () => { e.mode = e.mode === 'stay' ? 'follow' : 'stay'; e.target = null; e.path = null; UI.dirty('pets'); } });
        o.push({ label: 'Target (for bandages & heals)', fn: () => { Game.target = e; } });
        o.push({ label: 'Pet window', fn: () => UI.openPets() });
      } else if (e.kind === 'npc') o.push({ label: `Talk to ${e.name}`, fn: () => Player.interact(pk) });
    } else if (pk.kind === 'corpse') o.push({ label: 'Loot', fn: () => Player.interact(pk) });
    else if (pk.kind === 'chest') o.push({ label: 'Open chest', fn: () => Player.interact(pk) });
    else if (pk.kind === 'obj') o.push({ label: { rock: 'Mine', boulder: 'Mine', tree: 'Chop', bush: 'Harvest' }[pk.ref.t] || 'Use', fn: () => Player.interact(pk) });
    return o;
  },
  hotkey(i) {
    const P = Game.player;
    if (P.dead) return;
    if (i < 7) Player.castSpell(i);
    else if (i === 7) Player.startBandage();
    else if (i === 8) { const id = ['hpot_g', 'hpot', 'hpot_l'].find((x) => Player.count(x)); if (id) Player.use(P.inv.find((x) => x.base === id)); else UI.log('No healing potions.', '#aaa'); }
    else { const id = ['mpot_g', 'mpot'].find((x) => Player.count(x)); if (id) Player.use(P.inv.find((x) => x.base === id)); else UI.log('No mana potions.', '#aaa'); }
  },
  cycleTarget() {
    const P = Game.player;
    const list = Game.ents.filter((e) => e.kind === 'mob' && !e.dead && U.cheb(e.x, e.y, P.x, P.y) <= 12).sort((a, b) => U.dist(a.x, a.y, P.x, P.y) - U.dist(b.x, b.y, P.x, P.y));
    if (!list.length) return;
    const i = list.indexOf(Game.target);
    Game.target = list[(i + 1) % list.length];
  },
  lootNearest() {
    const P = Game.player;
    if (UI.loot) { Player.lootCorpse(UI.loot); if (!UI.loot.items.length) UI.close('loot'); return; }
    const c = Game.corpses.filter((x) => (x.items.length || x.gold) && U.cheb(x.x, x.y, P.x, P.y) <= 2).sort((a, b) => U.dist(a.x, a.y, P.x, P.y) - U.dist(b.x, b.y, P.x, P.y))[0];
    if (c) UI.openLoot(c);
    else { const ch = Game.chests.find((x) => !x.opened && U.cheb(x.x, x.y, P.x, P.y) <= 1); if (ch) Player.interact({ kind: 'chest', ref: ch }); }
  },
};
// Starter pets are created by Player.create before the world is reset; re-adopt them afterwards.
function C_hasStarterHorse(P) { return P.prof === 'tamer' || (P.skills.taming && P.skills.taming.v >= 40); }

window.addEventListener('load', () => Main.init());
