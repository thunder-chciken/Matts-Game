'use strict';
// =====================================================================
//  UI: HUD, windows, tooltips, menus
// =====================================================================
const Art = {
  has(kind, id) { return typeof ART_MANIFEST !== 'undefined' && ART_MANIFEST[kind] && ART_MANIFEST[kind].includes(id); },
  itemIcon(it) {
    const b = BASES[it.base];
    const id = it.art && this.has('icons', it.art) ? it.art : it.base;
    if (this.has('icons', id)) return 'assets/icons/' + id + '.png';
    return Sprites.iconURL(b.icon, Items.color(it));
  },
  baseIcon(baseId) {
    if (this.has('icons', baseId)) return 'assets/icons/' + baseId + '.png';
    const b = BASES[baseId];
    return Sprites.iconURL(b.icon, b.mat ? MATS[b.mat][0].color : b.color);
  },
  portrait(prof) { return this.has('portraits', prof) ? 'assets/portraits/' + prof + '.png' : null; },
};

const $ = (s, r = document) => r.querySelector(s);
const UI = {
  wins: {}, dirtySet: new Set(), logLines: [], toastQ: [],
  vendor: null, loot: null, bankOpen: false, craftSkill: 'blacksmith', craftSel: null, craftMat: {}, codexCat: 'Weapons', vendorTab: 'buy',

  init() {
    this.hud = $('#hud');
    this.tip = $('#tooltip');
    this.buildHotbar();
    this.mini = $('#minimap'); this.miniCtx = this.mini.getContext('2d');
    this.portrait = $('#hud-portrait'); this.portraitCtx = this.portrait.getContext('2d');
    document.addEventListener('mousemove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; if (this.tip.style.display === 'block') this.placeTip(); });
    document.addEventListener('click', (e) => this.onClick(e));
    document.addEventListener('contextmenu', (e) => { if (e.target.closest('#ui-layer')) { e.preventDefault(); this.onRightClick(e); } });
    document.addEventListener('mouseover', (e) => this.onHover(e));
    document.addEventListener('mousedown', (e) => { if (!e.target.closest('.ctxmenu')) this.closeCtx(); });
    $('#menu').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) this.toggle(b.dataset.open); });
  },

  // ---------- generic ----------
  dirty(n) { this.dirtySet.add(n); },
  log(text, color = '#e8e0d0') {
    this.logLines.push({ text, color, t: Game.time });
    if (this.logLines.length > 60) this.logLines.shift();
    this.dirty('journal');
  },
  toast(title, color, sub) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.setProperty('--c', color);
    el.innerHTML = `<div class="t-title">${U.esc(title)}</div>${sub ? `<div class="t-sub">${U.esc(sub)}</div>` : ''}`;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 4800);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  },
  banner(title, sub) {
    const b = $('#banner');
    b.innerHTML = `<div class="b-title">${U.esc(title)}</div><div class="b-sub">${U.esc(sub)}</div>`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  },
  codexPing() { const b = $('#menu [data-open="codex"]'); if (b) { b.classList.remove('ping'); void b.offsetWidth; b.classList.add('ping'); } },

  win(id, title, w) {
    if (this.wins[id]) return this.wins[id];
    const el = document.createElement('div');
    el.className = 'win'; el.id = 'win-' + id;
    el.style.width = (w || 340) + 'px';
    const saved = this.winPos && this.winPos[id];
    const n = Object.keys(this.wins).length;
    el.style.left = (saved ? saved[0] : 80 + n * 30) + 'px';
    el.style.top = (saved ? saved[1] : 90 + n * 24) + 'px';
    el.innerHTML = `<div class="win-head"><span class="win-title">${title}</span><button class="win-x" data-close="${id}">✕</button></div><div class="win-body"></div>`;
    $('#ui-layer').appendChild(el);
    const head = el.querySelector('.win-head');
    head.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      const ox = e.clientX - el.offsetLeft, oy = e.clientY - el.offsetTop;
      const mv = (ev) => { el.style.left = U.clamp(ev.clientX - ox, 0, window.innerWidth - 60) + 'px'; el.style.top = U.clamp(ev.clientY - oy, 0, window.innerHeight - 30) + 'px'; };
      const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); this.winPos = this.winPos || {}; this.winPos[id] = [el.offsetLeft, el.offsetTop]; };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
      this.front(el);
    });
    el.addEventListener('mousedown', () => this.front(el));
    this.wins[id] = el;
    this.front(el);
    return el;
  },
  front(el) { this.zTop = (this.zTop || 20) + 1; el.style.zIndex = this.zTop; },
  isOpen(id) { return !!this.wins[id]; },
  close(id) {
    const el = this.wins[id];
    if (!el) return;
    el.remove(); delete this.wins[id];
    if (id === 'vendor') this.vendor = null;
    if (id === 'loot') this.loot = null;
    if (id === 'bank') this.bankOpen = false;
    this.hideTip();
  },
  closeAll() { for (const id of Object.keys(this.wins)) this.close(id); this.closeCtx(); },
  toggle(id) {
    if (this.isOpen(id)) { this.close(id); return; }
    Sound.play('click');
    ({ char: () => this.openChar(), inv: () => this.openInv(), skills: () => this.openSkills(), codex: () => this.openCodex(),
      bounty: () => this.openBounties(), pets: () => this.openPets(), craft: () => this.openCraft(), map: () => this.openMap(), help: () => this.openHelp(), settings: () => this.openSettings() })[id]();
  },
  body(id) { return this.wins[id].querySelector('.win-body'); },

  // ---------- item slots & tooltips ----------
  slotHTML(it, src, extra = '') {
    if (!it) return `<div class="slot empty" ${extra}></div>`;
    const b = BASES[it.base], r = b.stack ? 0 : it.art ? 5 : it.r || 0;
    const q = it.qty > 1 ? `<span class="qty">${it.qty > 9999 ? Math.floor(it.qty / 1000) + 'k' : it.qty}</span>` : '';
    const ex = it.q ? '<span class="exc">★</span>' : '';
    const lk = it.lock ? '<span class="lock">🔒</span>' : '';
    return `<div class="slot r${r}" data-uid="${it.uid}" data-src="${src}" ${extra}><img src="${Art.itemIcon(it)}" draggable="false">${q}${ex}${lk}</div>`;
  },
  findItem(uid, src) {
    const P = Game.player;
    if (src === 'inv') return P.inv.find((i) => i.uid === uid);
    if (src === 'eq') return Object.values(P.eq).find((i) => i.uid === uid);
    if (src === 'bank') return P.bank.find((i) => i.uid === uid);
    if (src === 'loot' && this.loot) return this.loot.items.find((i) => i.uid === uid);
    if (src === 'buy' && this.buyCache) return this.buyCache[uid];
    if (src === 'codex' && this.codexCache) return this.codexCache[uid];
    return null;
  },
  itemTip(it, src) {
    const P = Game.player, b = BASES[it.base], s = Items.stats(it), rc = it.art ? RARITY[5] : RARITY[b.stack ? 0 : it.r || 0];
    const lines = [];
    lines.push(`<div class="tt-name" style="color:${rc.color}">${U.esc(Items.name(it))}${it.qty > 1 ? ' ×' + it.qty : ''}</div>`);
    const kind = b.cat === 'weapon' ? `${b.twoH ? 'Two-handed' : 'One-handed'} ${SKILL_BY_ID[b.skill].name}` : b.slot ? SLOT_NAMES[b.slot] : b.sub ? b.sub[0].toUpperCase() + b.sub.slice(1) : b.cat;
    lines.push(`<div class="tt-sub">${b.stack ? '' : (it.q ? 'Exceptional ' : '') + rc.name + ' · '}${kind}</div>`);
    if (s.dmg) lines.push(`<div class="tt-stat">Damage <b>${s.dmg[0]}–${s.dmg[1]}</b> · Speed <b>${s.spd.toFixed(1)}s</b>${s.range ? ' · Range ' + s.range : ''}</div>`);
    if (s.ar) lines.push(`<div class="tt-stat">Armor <b>${s.ar}</b>${s.block ? ' · Block +' + Math.round(s.block * 100) + '%' : ''}</div>`);
    const bon = Items.bonuses(it);
    const innate = Object.assign({}, b.innate || {});
    if (it.mat && b.mat) { const m = getMat(b.mat, it.mat); if (m.bonus) for (const k in m.bonus) innate[k] = (innate[k] || 0) + m.bonus[k]; }
    for (const k in innate) lines.push(`<div class="tt-innate">${AFFIXES[k] ? AFFIXES[k].label.replace('{v}', innate[k]) : k + ' ' + innate[k]}</div>`);
    for (const a of it.aff || []) lines.push(`<div class="tt-aff">${Items.affLabel(a)}</div>`);
    void bon;
    if (b.use) {
      const u = b.use;
      if (u.heal) lines.push(`<div class="tt-use">Restores ${u.heal} health</div>`);
      if (u.mana) lines.push(`<div class="tt-use">Restores ${u.mana} mana</div>`);
      if (u.buff) lines.push(`<div class="tt-use">${Object.entries(u.buff).map(([k, v]) => '+' + v + (['speed', 'spd', 'dmg', 'gold'].includes(k) ? '% ' : ' ') + ({ regen: 'Health Regen', mregen: 'Mana Regen', str: 'Strength', luck: 'Luck', speed: 'Move Speed', spd: 'Swing Speed', dmg: 'Damage', gold: 'Gold Find' }[k] || k)).join(', ')} for ${Math.round(u.dur / 60)} min</div>`);
      if (u.cache) lines.push(`<div class="tt-use">Open for a ${RARITY[Math.min(5, u.cache.minR)].name}${u.cache.minR < 5 ? '-or-better' : ''} reward!</div>`);
    }
    if (b.tool) lines.push(`<div class="tt-use">Tool: ${SKILL_BY_ID[b.tool].name}${it.uses != null ? ' · ' + it.uses + ' uses left' : ''}</div>`);
    if (it.art) lines.push(`<div class="tt-lore">"${U.esc(ARTIFACT_BY_ID[it.art].lore)}"</div>`);
    if (it.crafter) lines.push(`<div class="tt-crafter">Crafted by ${U.esc(it.crafter)}</div>`);
    // comparison with equipped
    if (b.slot && src !== 'eq' && P.eq[b.slot] && P.eq[b.slot] !== it) {
      const diff = Items.power(it) - Items.power(P.eq[b.slot]);
      lines.push(`<div class="tt-cmp" style="color:${diff >= 0 ? '#6aff8a' : '#ff7a6a'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)} power vs equipped</div>`);
    } else if (b.slot && !P.eq[b.slot] && src !== 'eq') lines.push(`<div class="tt-cmp" style="color:#6aff8a">Empty slot: equip it!</div>`);
    const val = Items.value(it);
    lines.push(`<div class="tt-foot">Value ${U.fmt(val)}g${it.qty > 1 ? ' each' : ''} · Weight ${(Items.weight(it)).toFixed(1)}</div>`);
    if (src === 'inv') lines.push(`<div class="tt-hint">${this.bankOpen ? 'Click: deposit' : this.vendor && Shop.buys(VENDORS[this.vendor.role], it) ? 'Shift-click: sell (' + Shop.unitSell(it, VENDORS[this.vendor.role]) * (it.qty || 1) + 'g)' : b.slot ? 'Click: equip' : b.use || b.sub === 'bandage' ? 'Click: use' : ''} · Right-click: options</div>`);
    if (src === 'eq') lines.push(`<div class="tt-hint">Click: unequip</div>`);
    if (src === 'bank') lines.push(`<div class="tt-hint">Click: withdraw</div>`);
    if (src === 'loot') lines.push(`<div class="tt-hint">Click: take</div>`);
    if (src === 'buy') lines.push(`<div class="tt-hint">Click: buy for ${Shop.buyPrice(it.base)}g${b.stack ? ' · Shift: buy 10' : ''}</div>`);
    return lines.join('');
  },
  showTip(html) { this.tip.innerHTML = html; this.tip.style.display = 'block'; this.placeTip(); },
  hideTip() { this.tip.style.display = 'none'; },
  placeTip() {
    const t = this.tip, w = t.offsetWidth, h = t.offsetHeight;
    let x = this.mouseX + 16, y = this.mouseY + 14;
    if (x + w > window.innerWidth - 8) x = this.mouseX - w - 12;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  },
  onHover(e) {
    const s = e.target.closest('[data-uid]');
    if (s) { const it = this.findItem(s.dataset.uid, s.dataset.src); if (it) { this.showTip(this.itemTip(it, s.dataset.src)); return; } }
    const t = e.target.closest('[data-tip]');
    if (t) { this.showTip(t.dataset.tip); return; }
    if (!e.target.closest('.ctxmenu')) this.hideTip();
  },
  onClick(e) {
    const close = e.target.closest('[data-close]');
    if (close) { this.close(close.dataset.close); Sound.play('click'); return; }
    const act = e.target.closest('[data-act]');
    if (act) { this.doAct(act.dataset.act, act.dataset, e); return; }
    const s = e.target.closest('.slot[data-uid]');
    if (!s) return;
    const it = this.findItem(s.dataset.uid, s.dataset.src);
    if (!it) return;
    const P = Game.player, src = s.dataset.src;
    if (src === 'inv') {
      if (this.bankOpen) { Player.removeItem(it); P.bank.push(it); Sound.play('click'); this.dirty('bank'); }
      else if (e.shiftKey && this.vendor && Shop.buys(VENDORS[this.vendor.role], it)) Shop.sell(it, VENDORS[this.vendor.role]);
      else Player.use(it);
    } else if (src === 'eq') { Player.unequip(BASES[it.base].slot); }
    else if (src === 'bank') { P.bank.splice(P.bank.indexOf(it), 1); Player.add(it, true); Sound.play('click'); this.dirty('bank'); }
    else if (src === 'loot') { Player.take(this.loot, it); }
    else if (src === 'buy') { Shop.buy(it.base, e.shiftKey && BASES[it.base].stack ? 10 : 1); }
    this.hideTip();
  },
  onRightClick(e) {
    const s = e.target.closest('.slot[data-uid]');
    if (!s || s.dataset.src !== 'inv') return;
    const it = this.findItem(s.dataset.uid, 'inv');
    if (!it) return;
    const b = BASES[it.base], opts = [];
    if (b.slot && b.cat !== 'tool') opts.push({ label: 'Equip', fn: () => Player.equip(it) });
    if (b.use || b.sub === 'bandage') opts.push({ label: 'Use', fn: () => Player.use(it) });
    if (this.vendor && Shop.buys(VENDORS[this.vendor.role], it)) opts.push({ label: `Sell (${Shop.unitSell(it, VENDORS[this.vendor.role]) * (it.qty || 1)}g)`, fn: () => Shop.sell(it, VENDORS[this.vendor.role]) });
    if (this.bankOpen) opts.push({ label: 'Deposit', fn: () => { Player.removeItem(it); Game.player.bank.push(it); this.dirty('bank'); } });
    if (!b.stack) opts.push({ label: it.lock ? 'Unlock' : 'Lock (keep from junk sales)', fn: () => { it.lock = !it.lock; this.dirty('inv'); } });
    opts.push({ label: 'Destroy', danger: true, fn: () => { if ((it.r || 0) >= 2 || it.art) { if (!confirm(`Destroy ${Items.name(it)}?`)) return; } Player.removeItem(it); } });
    this.ctxMenu(e.clientX, e.clientY, opts);
  },
  ctxMenu(x, y, opts) {
    this.closeCtx();
    const m = document.createElement('div');
    m.className = 'ctxmenu';
    m.innerHTML = opts.map((o, i) => `<div class="ctx-item${o.danger ? ' danger' : ''}" data-i="${i}">${U.esc(o.label)}</div>`).join('');
    $('#ui-layer').appendChild(m);
    m.style.left = Math.min(x, window.innerWidth - m.offsetWidth - 8) + 'px';
    m.style.top = Math.min(y, window.innerHeight - m.offsetHeight - 8) + 'px';
    m.addEventListener('click', (e) => { const it = e.target.closest('.ctx-item'); if (it) { opts[+it.dataset.i].fn(); this.closeCtx(); Sound.play('click'); } });
    this.ctx = m;
  },
  closeCtx() { if (this.ctx) { this.ctx.remove(); this.ctx = null; } },

  doAct(a, d, e) {
    const P = Game.player;
    Sound.play('click');
    switch (a) {
      case 'lock': { const s = P.skills[d.id]; s.lock = s.lock === 'up' ? 'down' : s.lock === 'down' ? 'lock' : 'up'; this.dirty('skills'); break; }
      case 'codexcat': this.codexCat = d.cat; this.dirty('codex'); break;
      case 'sortinv': {
        const order = { weapon: 0, armor: 1, shield: 2, jewelry: 3, tool: 4, consumable: 5, resource: 6, trophy: 7 };
        P.inv.sort((a, b) => (order[BASES[a.base].cat] - order[BASES[b.base].cat]) || ((b.r || 0) - (a.r || 0)) || Items.name(a).localeCompare(Items.name(b)));
        this.dirty('inv'); break;
      }
      case 'craftskill': this.craftSkill = d.skill; this.craftSel = null; this.dirty('craft'); break;
      case 'craftsel': this.craftSel = d.id; this.dirty('craft'); break;
      case 'craftmat': this.craftMat[this.craftSel] = d.mat; this.dirty('craft'); break;
      case 'craftgo': {
        const rec = RECIPES.find((r) => r.id === this.craftSel);
        if (rec) Craft.start(rec, this.craftMat[rec.id] || this.defaultMat(rec), d.n === 'max' ? 999 : +d.n);
        break;
      }
      case 'craftstop': Player.cancelAction('You stop crafting.'); break;
      case 'vtab': this.vendorTab = d.tab; this.dirty('vendor'); break;
      case 'selljunk': Shop.sellJunk(VENDORS[this.vendor.role]); break;
      case 'train': Shop.train(d.id); break;
      case 'buyhorse': Shop.buyHorse(); break;
      case 'healme': heal(P, P.maxHp); Sound.play('heal'); Game.say(this.vendor, 'There, good as new.'); break;
      case 'openbank': this.openBank(); break;
      case 'lootall': if (this.loot) { Player.lootCorpse(this.loot); if (!this.loot.items.length) this.close('loot'); } break;
      case 'depositmats': {
        for (const it of P.inv.slice()) { const c = BASES[it.base].cat; if (c === 'resource' || c === 'trophy') { Player.removeItem(it); const ex = BASES[it.base].stack && P.bank.find((x) => x.base === it.base); if (ex) ex.qty += it.qty; else P.bank.push(it); } }
        this.dirty('bank'); break;
      }
      case 'claim': Player.claimBounty(+d.i); break;
      case 'daily': Player.claimDaily(); break;
      case 'seal': Player.buySeal(SEAL_SHOP[+d.i]); break;
      case 'petmode': { const pet = Game.ents.find((x) => x.id === +d.id); if (pet) { pet.mode = d.mode; pet.target = null; pet.path = null; } this.dirty('pets'); break; }
      case 'petride': { const pet = Game.ents.find((x) => x.id === +d.id); if (pet) Player.interact({ kind: 'ent', ref: pet }); break; }
      case 'petrelease': { const pet = Game.ents.find((x) => x.id === +d.id); if (pet && confirm(`Release ${pet.name} into the wild?`)) { pet.kind = 'mob'; pet.home = [pet.x, pet.y]; pet.hostileTo = false; this.dirty('pets'); } break; }
      case 'dismount': Player.dismount(); this.dirty('pets'); break;
      case 'title': P.title = d.value; this.dirty('char'); break;
      case 'respawn': $('#death').classList.remove('show'); Player.respawn(); break;
      case 'save': Main.save(true); break;
      case 'quit': Main.save(); location.reload(); break;
      case 'togglesetting': Settings[d.key] = !Settings[d.key]; Main.saveSettings(); if (d.key === 'sound') Sound.on = Settings.sound; this.dirty('settings'); break;
      case 'hot': Main.hotkey(+d.i); break;
    }
  },
  defaultMat(rec) {
    const opts = Craft.matOptions(rec);
    if (!opts.length) return null;
    const usable = opts.filter((o) => o.have > 0 && Player.skill(rec.skill) >= Craft.reqFor(rec, o.mat.id) - 25);
    return (usable[usable.length - 1] || opts[0]).mat.id;
  },

  // ---------- HUD ----------
  buildHotbar() {
    const hb = $('#hotbar');
    let h = '';
    for (let i = 0; i < 10; i++) h += `<div class="hot" data-act="hot" data-i="${i}"><span class="hk">${(i + 1) % 10}</span><img><span class="hq"></span><div class="cd"></div></div>`;
    hb.innerHTML = h;
  },
  updateHotbar() {
    const P = Game.player;
    const slots = document.querySelectorAll('#hotbar .hot');
    slots.forEach((el, i) => {
      const img = el.querySelector('img'), q = el.querySelector('.hq');
      let tip = '', locked = false, qty = '';
      if (i < 7) {
        const sp = SPELLS[i];
        img.src = Sprites.iconURL('sp_' + sp.id, sp.color);
        locked = Player.skill('magery') < sp.req - 10;
        tip = `<div class="tt-name" style="color:${sp.color}">${sp.name}</div><div class="tt-sub">Spell · ${sp.mana} mana · ${sp.cast}s cast</div><div class="tt-use">${sp.desc}</div><div class="tt-foot">Requires ${sp.req} Magery${locked ? ' (you have ' + Player.skill('magery').toFixed(1) + ')' : ''}</div>`;
      } else if (i === 7) {
        img.src = Sprites.iconURL('bandage', '#efe8d8'); qty = Player.count('bandage'); locked = !qty;
        tip = '<div class="tt-name">Bandage</div><div class="tt-use">Heal yourself, or your targeted pet. Scales with Healing &amp; Anatomy.</div>';
      } else if (i === 8) {
        const id = ['hpot_g', 'hpot', 'hpot_l'].find((x) => Player.count(x)) || 'hpot_l';
        img.src = Art.baseIcon(id); qty = Player.count(id); locked = !qty;
        tip = `<div class="tt-name">${BASES[id].name}</div><div class="tt-use">Drinks your best healing potion.</div>`;
      } else {
        const id = ['mpot_g', 'mpot'].find((x) => Player.count(x)) || 'mpot';
        img.src = Art.baseIcon(id); qty = Player.count(id); locked = !qty;
        tip = `<div class="tt-name">${BASES[id].name}</div><div class="tt-use">Drinks your best mana potion.</div>`;
      }
      el.classList.toggle('locked', locked);
      q.textContent = qty ? qty : '';
      el.dataset.tip = tip;
    });
  },
  updateHUD() {
    const P = Game.player, d = P.d;
    const bar = (id, v, m) => { const el = $(id); el.querySelector('.fill').style.width = U.clamp((v / m) * 100, 0, 100) + '%'; el.querySelector('.val').textContent = `${Math.ceil(v)} / ${m}`; };
    bar('#bar-hp', P.hp, P.maxHp); bar('#bar-mana', P.mana, d.maxMana); bar('#bar-stam', P.stam, d.maxStam);
    $('#hud-name').textContent = P.name;
    $('#hud-title').textContent = Player.displayTitle();
    $('#hud-gold').innerHTML = `<img src="${Sprites.iconURL('coins', '#ffd94a', 20)}"> ${U.fmt(P.gold)}`;
    $('#hud-clock').textContent = (Game.night > 0.3 ? '☾ ' : '☀ ') + Game.clockStr();
    // action bar
    const a = P.action || (P.bandage ? { label: 'Bandaging...', t: P.bandage.t, dur: P.bandage.dur } : null);
    const ab = $('#actionbar');
    if (a) { ab.style.display = 'block'; ab.querySelector('.ab-label').textContent = a.label || ''; ab.querySelector('.ab-fill').style.width = U.clamp((a.t / a.dur) * 100, 0, 100) + '%'; }
    else ab.style.display = 'none';
    // target frame
    const t = Game.target, tf = $('#targetframe');
    if (t && !t.dead) {
      tf.style.display = 'block';
      const tier = t.def ? ['Harmless', 'Weak', 'Dangerous', 'Deadly', 'BOSS'][t.def.tier] : '';
      tf.innerHTML = `<div class="tf-name">${U.esc(t.name)} <span class="tf-tier t${t.def ? t.def.tier : 0}">${t.kind === 'pet' ? 'Your pet' : tier}</span></div><div class="tf-bar"><div style="width:${U.clamp(t.hp / t.maxHp * 100, 0, 100)}%"></div><span>${Math.ceil(t.hp)} / ${t.maxHp}</span></div>`;
    } else tf.style.display = 'none';
    // buffs
    const bh = P.buffs.map((b) => `<div class="buff" style="--c:${b.color || '#9ad8ff'}" data-tip="${U.esc('<div class=tt-name>' + b.name + '</div><div class=tt-use>' + Math.ceil(b.t / 60) + ' min left</div>')}">${b.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}<span>${Math.ceil(b.t / 60)}m</span></div>`).join('');
    const be = $('#buffs'); if (be.innerHTML !== bh) be.innerHTML = bh;
    const daily = Player.dailyAvailable(), bountyReady = P.bounty && P.bounty.list.some((b) => !b.claimed && b.have >= b.n);
    $('#menu [data-open="bounty"]').classList.toggle('glow', daily || bountyReady);
  },
  drawPortrait(time) {
    const c = this.portraitCtx, P = Game.player;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 64, 64);
    c.setTransform(1.25, 0, 0, 1.25, 32, 66);
    const o = Render.humanoidOpts(P, time);
    o.moving = false; o.front = true; o.right = true; o.atk = -1;
    Sprites.humanoid(c, 0, 0, o);
  },
  drawMinimap() {
    const c = this.miniCtx, P = Game.player, S = 160;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#0b1420'; c.fillRect(0, 0, S, S);
    const k = 1.6;
    c.setTransform(k, k / 2, -k, k / 2, S / 2 - (P.x - P.y) * k, S / 2 - (P.x + P.y) * k / 2);
    c.imageSmoothingEnabled = false;
    c.drawImage(World.mini, 0, 0);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const toM = (x, y) => [S / 2 + (x - P.x - (y - P.y)) * k, S / 2 + (x - P.x + (y - P.y)) * k / 2];
    for (const e of Game.ents) {
      if (e === P || e.kind === 'decor') continue;
      const [mx, my] = toM(e.x, e.y);
      if (mx < 0 || my < 0 || mx > S || my > S) continue;
      c.fillStyle = e.kind === 'npc' ? '#8ad0ff' : e.kind === 'pet' ? '#7aff9a' : e.def.boss ? '#ffb84a' : e.hostileTo ? '#ff5a4a' : '#d8d8d8';
      c.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }
    for (const ch of Game.chests) if (!ch.opened && U.cheb(ch.x, ch.y, P.x, P.y) < 16) { const [mx, my] = toM(ch.x, ch.y); c.fillStyle = '#ffd94a'; c.fillRect(mx - 2, my - 2, 4, 4); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(S / 2, S / 2, 3, 0, 7); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
  },
  updateJournal() {
    const el = $('#journal');
    el.innerHTML = this.logLines.slice(-7).map((l) => `<div style="color:${l.color};opacity:${U.clamp(1 - (Game.time - l.t - 14) / 6, 0.25, 1)}">${U.esc(l.text)}</div>`).join('');
  },
  showDeath(lost) {
    const d = $('#death');
    d.querySelector('.d-sub').textContent = lost ? `You dropped ${lost} gold in the chaos. Your gear is safe.` : 'Your gear is safe.';
    d.classList.add('show');
  },

  update(dt, time) {
    this.updateHUD();
    this.drawPortrait(time);
    this.mmT = (this.mmT || 0) - dt;
    if (this.mmT <= 0) { this.mmT = 0.2; this.drawMinimap(); this.updateHotbar(); this.updateJournal(); }
    this.refT = (this.refT || 0) - dt;
    if (this.refT <= 0) {
      this.refT = 0.12;
      const map = { inv: 'renderInv', char: 'renderChar', skills: 'renderSkills', codex: 'renderCodex', bounty: 'renderBounties', pets: 'renderPets', craft: 'renderCraft', vendor: 'renderVendor', bank: 'renderBank', loot: 'renderLoot', settings: 'renderSettings' };
      if (this.dirtySet.has('inv')) { this.dirtySet.add('vendor'); this.dirtySet.add('craft'); this.dirtySet.add('char'); }
      if (this.dirtySet.has('gold')) { this.dirtySet.add('vendor'); this.dirtySet.add('char'); this.dirtySet.add('inv'); }
      for (const n of this.dirtySet) if (map[n] && this.wins[n]) this[map[n]]();
      this.dirtySet.clear();
      if (this.wins.map) this.renderMap();
      if (this.wins.craft) this.updateCraftProgress();
    }
    if (this.loot && Game.player && U.cheb(this.loot.x, this.loot.y, Game.player.x, Game.player.y) > 3) this.close('loot');
    if (this.vendor && Game.player && U.cheb(this.vendor.x, this.vendor.y, Game.player.x, Game.player.y) > 4) { this.close('vendor'); this.close('bank'); }
  },

  // ---------- Windows ----------
  openInv() { this.win('inv', 'Backpack', 380); this.renderInv(); },
  renderInv() {
    const P = Game.player, w = Player.weight(), cap = P.d.carry;
    let h = `<div class="row between"><span class="muted">Weight <b style="color:${w > cap ? '#ff7a6a' : '#e8e0d0'}">${w.toFixed(0)}</b> / ${cap}</span><span class="gold"><img src="${Sprites.iconURL('coins', '#ffd94a', 20)}"> ${U.fmt(P.gold)}</span></div>`;
    h += `<div class="wbar"><div style="width:${U.clamp(w / cap * 100, 0, 100)}%;background:${w > cap ? '#c84a3a' : '#6a9a4a'}"></div></div>`;
    h += '<div class="grid">';
    for (const it of P.inv) h += this.slotHTML(it, 'inv');
    for (let i = P.inv.length; i < Math.max(40, Math.ceil(P.inv.length / 8) * 8); i++) h += '<div class="slot empty"></div>';
    h += '</div>';
    h += `<div class="row"><button class="btn" data-act="sortinv">Sort</button><span class="muted small">${this.bankOpen ? 'Click items to deposit them in your bank.' : this.vendor ? 'Shift-click to sell.' : 'Click to equip or use. Right-click for options.'}</span></div>`;
    this.body('inv').innerHTML = h;
  },
  openChar() { this.win('char', 'Character', 470); this.renderChar(); },
  renderChar() {
    const P = Game.player, d = P.d, pr = Player.profile();
    const slot = (s) => `<div class="pd-slot"><div class="pd-label">${SLOT_NAMES[s]}</div>${P.eq[s] ? this.slotHTML(P.eq[s], 'eq') : '<div class="slot empty"></div>'}</div>`;
    const titles = [Player.bestTitle(), ...P.titles];
    const row = (k, v, tip) => `<div class="st-row"${tip ? ` data-tip="${U.esc(tip)}"` : ''}><span>${k}</span><b>${v}</b></div>`;
    let h = `<div class="pd-name">${U.esc(P.name)}</div>
      <select class="title-sel" onchange="UI.doAct('title',{value:this.value})">${titles.map((t) => `<option ${t === Player.displayTitle() ? 'selected' : ''}>${U.esc(t)}</option>`).join('')}</select>
      <div class="paperdoll"><div class="pd-col">${['head', 'neck', 'chest', 'back', 'hands', 'ring'].map(slot).join('')}</div>
      <canvas id="pd-canvas" width="150" height="230"></canvas>
      <div class="pd-col">${['main', 'off', 'legs', 'feet', 'trinket'].map(slot).join('')}</div></div>
      <div class="stats-grid">
      ${['str', 'dex', 'int'].map((s) => row(`<span style="color:${STAT_INFO[s].color}">${STAT_INFO[s].name}</span>`, `${d[s]}${d[s] !== P.stats[s] ? ` <small>(${P.stats[s]})</small>` : ''}`, `<div class=tt-name>${STAT_INFO[s].name}</div><div class=tt-use>${STAT_INFO[s].desc}</div>`)).join('')}
      ${row('Health', `${Math.ceil(P.hp)} / ${P.maxHp}`)}${row('Mana', `${Math.ceil(P.mana)} / ${d.maxMana}`)}${row('Stamina', `${Math.ceil(P.stam)} / ${d.maxStam}`)}
      ${row('Armor', d.ar)}${row('Damage', `${Math.round(pr.dmg[0] * pr.mult)}–${Math.round(pr.dmg[1] * pr.mult)}${pr.fire ? ' +' + pr.fire : ''}`)}${row('Swing', pr.spd.toFixed(2) + 's')}
      ${row('Hit bonus', '+' + d.hit + '%')}${row('Block', Math.round(pr.block * 100) + '%')}${row('Luck', d.luck, '<div class=tt-name>Luck</div><div class=tt-use>Raises the rarity of loot, chests, catches, crafts and rare ore.</div>')}
      ${row('Gold find', '+' + d.gold + '%')}${row('Spell power', '+' + d.spell + '%')}${row('Move speed', '+' + d.speed + '%')}
      ${row('Stat total', `${Player.statTotal()} / ${STAT_CAP}`)}${row('Followers', `${Player.followers()} / ${MAX_FOLLOWERS}`)}${row('Codex', Codex.pct(P.codex).toFixed(1) + '%')}
      </div><div class="muted small center">Played ${U.timeStr(P.playTime)} · Birthsign: ${BIRTHSIGNS.find((b) => b.id === P.birthsign).name}</div>`;
    this.body('char').innerHTML = h;
    const c = $('#pd-canvas').getContext('2d');
    c.setTransform(3, 0, 0, 3, 75, 214);
    const o = Render.humanoidOpts(P, Game.time); o.moving = false; o.front = true; o.right = true; o.atk = -1;
    Sprites.humanoid(c, 0, 0, o);
  },
  openSkills() { this.win('skills', 'Skills', 360); this.renderSkills(); },
  renderSkills() {
    const P = Game.player;
    let h = `<div class="row between"><span class="muted">Total <b>${Player.skillTotal().toFixed(1)}</b> / ${SKILL_CAP}</span><span class="muted small" data-tip="<div class=tt-name>Skill locks</div><div class=tt-use>▲ raise · ▼ lower (makes room when you hit the cap) · ■ locked</div>">▲▼■ locks ⓘ</span></div><div class="skills">`;
    for (const cat of SKILL_CATS) {
      h += `<div class="sk-cat">${cat}</div>`;
      for (const s of SKILLS.filter((k) => k.cat === cat)) {
        const v = P.skills[s.id].v, bonus = (P.d.skillB[s.id] || 0), lk = P.skills[s.id].lock;
        h += `<div class="sk-row" data-tip="${U.esc(`<div class=tt-name>${s.name}</div><div class=tt-sub>${skillTitle(v)} ${s.noun} · ${STAT_INFO[s.stat].name}</div><div class=tt-use>${s.desc}</div>`)}">
          <span class="sk-name">${s.name}</span><div class="sk-bar"><div style="width:${v}%"></div></div>
          <span class="sk-val">${v.toFixed(1)}${bonus ? `<small>+${bonus}</small>` : ''}</span>
          <button class="lk lk-${lk}" data-act="lock" data-id="${s.id}">${lk === 'up' ? '▲' : lk === 'down' ? '▼' : '■'}</button></div>`;
      }
    }
    this.body('skills').innerHTML = h + '</div>';
  },
  openCodex() { this.win('codex', 'Codex — Collection', 560); this.renderCodex(); },
  renderCodex() {
    const P = Game.player, pct = Codex.pct(P.codex), next = CODEX_MILESTONES.find((m) => !P.milestones.includes(m.pct));
    const ents = Codex.entries();
    this.codexCache = {};
    let h = `<div class="codex-top"><div class="cx-pct">${pct.toFixed(1)}%</div><div class="cx-bar"><div style="width:${pct}%"></div>${CODEX_MILESTONES.map((m) => `<i style="left:${m.pct}%" class="${P.milestones.includes(m.pct) ? 'got' : ''}"></i>`).join('')}</div>
      <div class="muted small">${Codex.points(P.codex)} / ${Codex.total()} discoveries${next ? ` · Next: <b>${next.pct}%</b> → title "${next.title}" + ${U.fmt(next.gold)}g` : ' · Complete!'}</div></div><div class="tabs">`;
    for (const c of CODEX_CATS) {
      const list = ents.filter((e) => e.cat === c), tot = list.reduce((s, e) => s + (e.gear ? 5 : 1), 0), got = list.reduce((s, e) => s + (e.gear ? [0, 1, 2, 3, 4].filter((i) => (P.codex[e.key] || 0) & (1 << i)).length : P.codex[e.key] ? 1 : 0), 0);
      h += `<button class="tab ${c === this.codexCat ? 'on' : ''}" data-act="codexcat" data-cat="${c}">${c} <small>${got}/${tot}</small></button>`;
    }
    h += '</div><div class="cx-grid">';
    for (const e of ents.filter((x) => x.cat === this.codexCat)) {
      const v = P.codex[e.key] || 0, found = !!v;
      const fake = e.art ? Items.artifact(e.art) : Items.create(e.base, BASES[e.base].stack ? { qty: 1 } : { r: e.gear ? [4, 3, 2, 1, 0].find((i) => v & (1 << i)) || 0 : 0 });
      fake.uid = 'cx_' + e.key; this.codexCache[fake.uid] = fake;
      const pips = e.gear ? `<div class="pips">${[0, 1, 2, 3, 4].map((i) => `<i style="background:${v & (1 << i) ? RARITY[i].color : '#2a2622'}"></i>`).join('')}</div>` : '';
      h += `<div class="cx-entry ${found ? '' : 'unk'}">${found ? this.slotHTML(fake, 'codex') : `<div class="slot"><img src="${e.art ? Art.baseIcon(e.base) : Art.baseIcon(e.base)}" class="sil"></div>`}<div class="cx-name">${found ? U.esc(e.art ? ARTIFACT_BY_ID[e.art].name : BASES[e.base].name) : '???'}</div>${pips}</div>`;
    }
    this.body('codex').innerHTML = h + '</div>';
  },
  openBounties() { Player.ensureBounties(); this.win('bounty', 'Bounty Board', 420); this.renderBounties(); },
  renderBounties() {
    const P = Game.player;
    Player.ensureBounties();
    const daily = Player.dailyAvailable();
    let h = `<div class="daily ${daily ? 'ready' : ''}"><div><b>Daily Gift</b><div class="muted small">Streak: ${P.daily.streak} day${P.daily.streak === 1 ? '' : 's'} · Day 3: Collector's Cache · Day 7: Gilded Cache</div></div>
      ${daily ? '<button class="btn gold" data-act="daily">Claim!</button>' : '<span class="muted small">Come back tomorrow</span>'}</div>
      <div class="sk-cat">Today's Bounties <span class="muted small">(refresh daily)</span></div>`;
    P.bounty.list.forEach((b, i) => {
      const done = b.have >= b.n;
      h += `<div class="bounty ${b.claimed ? 'claimed' : done ? 'done' : ''}"><div class="bn-text">${U.esc(b.text)}</div>
        <div class="bn-bar"><div style="width:${b.have / b.n * 100}%"></div><span>${b.have} / ${b.n}</span></div>
        <div class="row between"><span class="muted small">Reward: ${b.gold}g · ${b.seals} Seal${b.seals > 1 ? 's' : ''} · ${b.tier >= 2 ? "Collector's" : 'Daily'} Cache</span>
        ${b.claimed ? '<span class="muted small">Claimed</span>' : done ? `<button class="btn gold" data-act="claim" data-i="${i}">Claim</button>` : ''}</div></div>`;
    });
    h += `<div class="sk-cat">Seal Exchange <span class="seals"><img src="${Sprites.iconURL('seal', '#ffd94a', 20)}"> ${P.seals}</span></div>`;
    SEAL_SHOP.forEach((s, i) => {
      h += `<div class="seal-row">${this.slotHTML(Object.assign(Items.create(s.id), { uid: 'seal_' + i }), 'none')}<div><b>${BASES[s.id].name}</b><div class="muted small">${s.desc}</div></div><button class="btn" data-act="seal" data-i="${i}" ${P.seals < s.cost ? 'disabled' : ''}>${s.cost} seals</button></div>`;
    });
    this.body('bounty').innerHTML = h;
  },
  openPets() { this.win('pets', 'Pets & Mounts', 360); this.renderPets(); },
  renderPets() {
    const P = Game.player, pets = Game.ents.filter((e) => e.kind === 'pet');
    let h = `<div class="muted">Followers <b>${Player.followers()}</b> / ${MAX_FOLLOWERS} · Animal Taming ${Player.skill('taming').toFixed(1)}</div>`;
    if (P.mount) h += `<div class="pet"><b>Riding: ${U.esc(P.mount.name)}</b><button class="btn" data-act="dismount">Dismount [R]</button></div>`;
    if (!pets.length && !P.mount) h += `<p class="muted small">No pets yet. Right-click a wild animal and choose <b>Tame</b> (needs Animal Taming), or buy a horse from any Stablemaster.</p>`;
    for (const p of pets) {
      h += `<div class="pet"><div class="row between"><b>${U.esc(p.name)}</b><span class="muted small">${p.def.name}${p.def.mount ? ' · rideable' : ''}</span></div>
        <div class="bn-bar"><div style="width:${p.hp / p.maxHp * 100}%;background:#3fbf5a"></div><span>${Math.ceil(p.hp)} / ${p.maxHp}</span></div>
        <div class="row">${['follow', 'stay'].map((m) => `<button class="btn ${p.mode === m ? 'on' : ''}" data-act="petmode" data-id="${p.id}" data-mode="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}
        ${p.def.mount && !P.mount ? `<button class="btn" data-act="petride" data-id="${p.id}">Ride</button>` : ''}<button class="btn danger" data-act="petrelease" data-id="${p.id}">Release</button></div></div>`;
    }
    this.body('pets').innerHTML = h;
  },
  openCraft(skillOrTool) {
    if (skillOrTool) { const c = CRAFT_SKILLS.find((x) => x.skill === skillOrTool || x.tool === skillOrTool); if (c) { this.craftSkill = c.skill; this.craftSel = null; } }
    this.win('craft', 'Crafting', 600); this.renderCraft();
  },
  renderCraft() {
    const sk = this.craftSkill, recs = Craft.recipesFor(sk), mySkill = Player.skill(sk);
    if (!this.craftSel || !recs.find((r) => r.id === this.craftSel)) this.craftSel = (recs.filter((r) => r.req <= mySkill + 5).pop() || recs[0]).id;
    let h = '<div class="tabs">' + CRAFT_SKILLS.map((c) => `<button class="tab ${c.skill === sk ? 'on' : ''}" data-act="craftskill" data-skill="${c.skill}">${c.label} <small>${Player.skill(c.skill).toFixed(0)}</small></button>`).join('') + '</div>';
    h += '<div class="craft"><div class="rec-list">';
    for (const r of recs) {
      const b = BASES[r.out], ok = mySkill >= r.req - 25;
      h += `<div class="rec ${r.id === this.craftSel ? 'on' : ''} ${ok ? '' : 'dim'}" data-act="craftsel" data-id="${r.id}"><img src="${Art.baseIcon(r.out)}"><span>${b.name}${r.qty > 1 ? ' ×' + r.qty : ''}</span><small style="color:${mySkill >= r.req ? '#8aca7a' : ok ? '#e0b04a' : '#a05a4a'}">${r.req}</small></div>`;
    }
    h += '</div><div class="rec-detail">';
    const rec = RECIPES.find((r) => r.id === this.craftSel);
    if (rec) {
      const opts = Craft.matOptions(rec);
      let mat = this.craftMat[rec.id] || this.defaultMat(rec);
      const b = BASES[rec.out];
      const sample = b.stack ? Items.create(rec.out, { qty: rec.qty }) : Items.create(rec.out, { mat: b.mat ? mat : undefined });
      sample.uid = 'craftsample'; this.buyCache = this.buyCache || {}; this.codexCache = this.codexCache || {}; this.codexCache.craftsample = sample;
      h += `<div class="row">${this.slotHTML(sample, 'codex')}<div><div class="tt-name">${b.name}${rec.qty > 1 ? ' ×' + rec.qty : ''}</div><div class="muted small">${SKILL_BY_ID[rec.skill].name} ${Craft.reqFor(rec, mat)}${rec.station ? ' · needs ' + ({ anvil: 'an anvil', forge: 'a forge', heat: 'an oven or forge' })[rec.station] : ''}</div></div></div>`;
      if (opts.length) {
        h += '<div class="sk-cat">Material</div><div class="mats">';
        for (const o of opts) {
          const req = Craft.reqFor(rec, o.mat.id);
          h += `<button class="matbtn ${o.mat.id === mat ? 'on' : ''} ${o.have ? '' : 'none'}" data-act="craftmat" data-mat="${o.mat.id}" style="--c:${o.mat.color}" data-tip="${U.esc(`<div class=tt-name>${BASES[o.id].name}</div><div class=tt-use>Requires ${req} skill · x${o.mat.mult.toFixed(2)} stats${o.mat.bonus ? ' · ' + Object.entries(o.mat.bonus).map(([k, v]) => AFFIXES[k].label.replace('{v}', v)).join(', ') : ''}</div>`)}"><i></i>${o.mat.name || BASES[o.id].name.split(' ')[0]} <small>${o.have}</small></button>`;
        }
        h += '</div>';
      }
      h += '<div class="sk-cat">Requires</div>';
      for (const n of Craft.needs(rec, mat)) {
        const have = Player.count(n.id);
        h += `<div class="need"><img src="${Art.baseIcon(n.id)}"><span>${BASES[n.id].name}</span><b style="color:${have >= n.n ? '#8aca7a' : '#ff7a6a'}">${have} / ${n.n}</b></div>`;
      }
      const why = Craft.check(rec, mat), ch = Craft.chance(rec, mat);
      h += `<div class="chance">Success chance <b>${Math.round(ch * 100)}%</b>${!b.stack ? ` · Exceptional ${Math.round(U.clamp(0.05 + (mySkill - Craft.reqFor(rec, mat)) / 110 + Game.player.d.craft / 100, 0, 0.6) * 100)}%` : ''}</div>`;
      if (why) h += `<div class="warn">${U.esc(why)}</div>`;
      h += `<div class="row"><button class="btn gold" data-act="craftgo" data-n="1" ${why ? 'disabled' : ''}>Craft</button><button class="btn" data-act="craftgo" data-n="5" ${why ? 'disabled' : ''}>×5</button><button class="btn" data-act="craftgo" data-n="max" ${why ? 'disabled' : ''}>All (${why ? 0 : Craft.maxCraftable(rec, mat)})</button>
        ${Craft.queue ? '<button class="btn danger" data-act="craftstop">Stop</button>' : ''}</div><div id="craft-prog" class="wbar"><div></div></div>`;
      if (!b.stack) h += `<p class="muted small">Exceptional crafts can roll Uncommon to Legendary bonuses. Higher skill and Luck mean better rolls.</p>`;
    }
    this.body('craft').innerHTML = h + '</div></div>';
  },
  updateCraftProgress() {
    const el = document.querySelector('#craft-prog div'), a = Game.player.action;
    if (el) el.style.width = a && a.type === 'craft' ? (a.t / a.dur * 100) + '%' : '0%';
  },
  openVendor(npc) {
    const v = VENDORS[npc.role];
    faceToward(npc, Game.player);
    if (v.bank) { this.vendor = npc; this.openBank(); Game.say(npc, 'Your valuables are safe with us.'); return; }
    this.vendor = npc;
    this.vendorTab = v.sells && v.sells.length ? 'buy' : v.buys && v.buys.length ? 'sell' : 'train';
    if (this.wins.vendor) this.close('vendor');
    this.vendor = npc;
    this.win('vendor', `${U.esc(npc.name)} the ${v.title}`, 420);
    Game.say(npc, U.pick(['How can I help?', 'Have a look.', 'Best prices in the vale!']));
    Sound.play('open');
    this.renderVendor();
    if (!this.wins.inv) this.openInv();
  },
  renderVendor() {
    const npc = this.vendor; if (!npc) return;
    const v = VENDORS[npc.role], P = Game.player;
    if (!this.wins.vendor) return;
    const tabs = [];
    if (v.sells && v.sells.length) tabs.push(['buy', 'Buy']);
    if (v.buys && v.buys.length) tabs.push(['sell', 'Sell']);
    if (v.trains && v.trains.length) tabs.push(['train', 'Train']);
    if (v.stable) tabs.push(['stable', 'Stable']);
    if (v.heals) tabs.push(['heal', 'Heal']);
    let h = '<div class="tabs">' + tabs.map(([k, l]) => `<button class="tab ${this.vendorTab === k ? 'on' : ''}" data-act="vtab" data-tab="${k}">${l}</button>`).join('') + `<span class="gold right"><img src="${Sprites.iconURL('coins', '#ffd94a', 20)}"> ${U.fmt(P.gold)}</span></div>`;
    if (this.vendorTab === 'buy') {
      this.buyCache = {};
      h += '<div class="shop">';
      for (const id of v.sells) {
        const b = BASES[id], it = b.stack ? Items.create(id, { qty: 1 }) : Items.create(id);
        it.uid = 'buy_' + id; this.buyCache[it.uid] = it;
        h += `<div class="shop-row">${this.slotHTML(it, 'buy')}<span>${b.name}</span><b class="gold">${Shop.buyPrice(id)}g</b></div>`;
      }
      h += '</div><p class="muted small">Click to buy. Shift-click stackables to buy 10.</p>';
    } else if (this.vendorTab === 'sell') {
      const sellable = P.inv.filter((it) => Shop.buys(v, it));
      h += `<div class="row between"><span class="muted small">This merchant buys: ${v.buys.join(', ')}</span><button class="btn" data-act="selljunk">Sell all Common gear</button></div><div class="grid">`;
      for (const it of sellable) h += this.slotHTML(it, 'inv');
      h += `</div><p class="muted small">${sellable.length ? 'Shift-click (or right-click) items to sell. Locked items are never sold as junk.' : 'You have nothing this merchant wants.'}</p>`;
    } else if (this.vendorTab === 'train') {
      h += '<p class="muted small">I can teach you the basics, up to 35 skill. Mastery comes from practice.</p>';
      for (const id of v.trains) {
        const s = P.skills[id], can = s.v < 35;
        h += `<div class="shop-row"><span>${SKILL_BY_ID[id].name}</span><span class="muted">${s.v.toFixed(1)}</span>${can ? `<button class="btn" data-act="train" data-id="${id}">+${Math.min(10, U.round1(35 - s.v))} for ${Shop.trainCost(id)}g</button>` : '<span class="muted small">Mastered basics</span>'}</div>`;
      }
    } else if (this.vendorTab === 'stable') {
      h += `<div class="shop-row"><img src="${Sprites.iconURL('horse', '#7a5030', 40)}" width="40"><span><b>Riding Horse</b><div class="muted small">Doubles your travel speed. Click it to ride.</div></span><button class="btn gold" data-act="buyhorse">600g</button></div>
        <p class="muted small">Tame wild horses and beasts yourself with Animal Taming. Right-click a creature and choose Tame.</p>`;
    } else if (this.vendorTab === 'heal') {
      h += `<div class="shop-row"><span>Restore your health (free for adventurers)</span><button class="btn" data-act="healme">Heal me</button></div>`;
    }
    this.body('vendor').innerHTML = h;
  },
  openBank() {
    this.bankOpen = true;
    this.win('bank', 'Bank Vault', 400);
    this.renderBank();
    if (!this.wins.inv) this.openInv();
    this.dirty('inv');
    Sound.play('open');
  },
  renderBank() {
    const P = Game.player;
    let h = `<div class="row between"><span class="muted">${P.bank.length} stacks stored · shared across all towns</span><button class="btn" data-act="depositmats">Deposit resources & trophies</button></div><div class="grid">`;
    for (const it of P.bank) h += this.slotHTML(it, 'bank');
    for (let i = P.bank.length; i < Math.max(48, Math.ceil(P.bank.length / 8) * 8); i++) h += '<div class="slot empty"></div>';
    this.body('bank').innerHTML = h + '</div><p class="muted small">Click an item here to withdraw it. Click items in your backpack to deposit.</p>';
  },
  openLoot(c) {
    if (this.wins.loot) this.close('loot');
    this.loot = c;
    this.win('loot', U.esc(c.name), 300);
    Sound.play('open');
    this.renderLoot();
  },
  renderLoot() {
    const c = this.loot; if (!c) return;
    let h = '';
    if (c.gold) h += `<div class="loot-row" data-act="lootall"><img src="${Sprites.iconURL('coins', '#ffd94a', 32)}" width="32"><span class="gold">${c.gold} gold</span></div>`;
    for (const it of c.items) h += `<div class="loot-row">${this.slotHTML(it, 'loot')}<span style="color:${it.art ? RARITY[5].color : BASES[it.base].stack ? '#e8e0d0' : RARITY[it.r || 0].color}">${U.esc(Items.name(it))}${it.qty > 1 ? ' ×' + it.qty : ''}</span></div>`;
    if (!c.gold && !c.items.length) h += '<p class="muted">Empty.</p>';
    h += `<div class="row"><button class="btn gold" data-act="lootall">Take All [Space]</button></div>`;
    this.body('loot').innerHTML = h;
  },
  openMap() { this.win('map', 'World Map — The Vale of Hoardlands', 620); this.renderMap(); },
  renderMap() {
    const body = this.body('map');
    let c = body.querySelector('canvas');
    if (!c) { body.innerHTML = '<canvas width="590" height="320"></canvas><div class="muted small">Towns are safe. Danger rises the farther you travel. Skulls mark boss lairs.</div>'; c = body.querySelector('canvas'); }
    const x = c.getContext('2d'), P = Game.player, k = 1.5;
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#0b1420'; x.fillRect(0, 0, c.width, c.height);
    const ox = c.width / 2, oy = 14;
    x.setTransform(k, k / 2 * 0.58, -k, k / 2 * 0.58, ox, oy);
    x.imageSmoothingEnabled = false; x.drawImage(World.mini, 0, 0);
    x.setTransform(1, 0, 0, 1, 0, 0);
    const toM = (tx, ty) => [ox + (tx - ty) * k, oy + (tx + ty) * k / 2 * 0.58];
    x.font = '700 11px Georgia, serif'; x.textAlign = 'center';
    for (const t of TOWNS) { const [mx, my] = toM(t.x, t.y); x.fillStyle = '#ffd94a'; x.fillRect(mx - 3, my - 3, 6, 6); x.fillStyle = '#000'; x.fillText(t.name, mx + 1, my - 6); x.fillStyle = '#fff4d0'; x.fillText(t.name, mx, my - 7); }
    for (const L of BOSS_LAIRS) { const [mx, my] = toM(L.x, L.y); x.fillStyle = '#ff6a4a'; x.font = '14px serif'; x.fillText('☠', mx, my + 4); x.font = '600 10px Georgia, serif'; x.fillStyle = '#ffb8a0'; x.fillText(L.name, mx, my - 8); }
    const [px, py] = toM(P.x, P.y);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 3.5 + Math.sin(Game.time * 5), 0, 7); x.fill(); x.strokeStyle = '#000'; x.stroke();
  },
  openHelp() {
    this.win('help', 'How to Play', 460);
    this.body('help').innerHTML = `<div class="help">
      <p><b>Collect everything.</b> Every weapon, armor piece and trinket exists in five rarities, plus unique gold <b style="color:#ffd94a">Artifacts</b>. Fill your <b>Codex</b> [J] to earn titles, gold and permanent Luck.</p>
      <div class="sk-cat">Controls</div>
      <table>
      <tr><td>Left-click ground</td><td>Walk there (hold to keep walking toward the cursor)</td></tr>
      <tr><td>WASD / Arrows</td><td>Move</td></tr>
      <tr><td>Left-click monster</td><td>Attack. You keep swinging while in range.</td></tr>
      <tr><td>Right-click creature</td><td>Options: Attack, Tame, Ride</td></tr>
      <tr><td>Click rock / tree / plant</td><td>Mine, chop, harvest (auto-repeats)</td></tr>
      <tr><td>Click water</td><td>Fish (needs a pole)</td></tr>
      <tr><td>Click NPC</td><td>Shop, sell, train, bank</td></tr>
      <tr><td>1–7</td><td>Spells · 8 Bandage · 9 Heal potion · 0 Mana potion</td></tr>
      <tr><td>Tab / Esc</td><td>Next target / clear target and close windows</td></tr>
      <tr><td>Space</td><td>Loot the nearest corpse</td></tr>
      <tr><td>R</td><td>Mount / dismount</td></tr>
      <tr><td>C I K J B P U M</td><td>Character, Backpack, Skills, Codex, Bounties, Pets, Crafting, Map</td></tr>
      <tr><td>Mouse wheel</td><td>Zoom</td></tr></table>
      <div class="sk-cat">Tips</div>
      <ul><li>Skills rise when you use them. Harder targets teach more.</li>
      <li>Smelt ore at a forge, then forge gear at an anvil. Rarer metals need more Mining and Blacksmithing.</li>
      <li>Treasure chests appear in the wilds. Look for the golden glow.</li>
      <li>Claim your <b>Daily Gift</b> every day to build a streak.</li>
      <li>Glowfin Feasts and Elixirs of Fortune boost Luck: better drops!</li>
      <li>Your game saves automatically.</li></ul></div>`;
  },
  openSettings() { this.win('settings', 'Settings', 300); this.renderSettings(); },
  renderSettings() {
    const opt = (k, l) => `<div class="shop-row"><span>${l}</span><button class="btn ${Settings[k] ? 'on' : ''}" data-act="togglesetting" data-key="${k}">${Settings[k] ? 'On' : 'Off'}</button></div>`;
    this.body('settings').innerHTML = opt('sound', 'Sound effects') + opt('autoLoot', 'Auto-loot kills') + opt('autoRepeat', 'Auto-repeat gathering') +
      `<div class="row"><button class="btn gold" data-act="save">Save now</button><button class="btn" data-act="quit">Save & quit to title</button></div>`;
  },
};
