'use strict';
// =====================================================================
//  Title screen & character creation
// =====================================================================
const CREATOR_STEPS = ['Profession', 'Appearance', 'Attributes', 'Skills', 'Birthsign', 'Origin', 'Review'];

const Creator = {
  C: null, step: 0, view: 0, walk: false, anim: null,

  // ---------- Title ----------
  showTitle() {
    Game.state = 'title';
    $('#hud').classList.add('hidden');
    $('#creator').classList.add('hidden');
    const t = $('#title');
    t.classList.remove('hidden');
    const saves = Main.listSaves();
    let h = `<div class="logo">HOARDLANDS</div><div class="tagline">Gather. Craft. Hunt. Collect every relic in the Vale.</div><div class="saves">`;
    saves.forEach((s, i) => {
      if (!s) return;
      const pct = Codex.pct(s.codex || {}).toFixed(1);
      h += `<div class="save-card"><canvas width="64" height="72" data-slot="${i}"></canvas><div class="sc-info"><div class="sc-name">${U.esc(s.name)}</div>
        <div class="sc-sub">${U.esc(s.title || '')} ${PROFESSIONS.find((p) => p.id === s.prof)?.name || ''} · Codex ${pct}% · ${U.timeStr(s.playTime || 0)}</div>
        <div class="sc-sub muted">${U.fmt(s.gold)} gold · last played ${new Date(s.saved).toLocaleDateString()}</div></div>
        <button class="btn gold" onclick="Main.load(${i})">Play</button><button class="btn danger small" onclick="Creator.deleteSave(${i})">✕</button></div>`;
    });
    const free = saves.findIndex((s) => !s);
    h += `</div>${free >= 0 ? `<button class="btn big gold" onclick="Creator.begin(${free})">Create New Character</button>` : '<div class="muted">All four character slots are full.</div>'}
      <div class="muted small foot">An original isometric sandbox RPG. Your progress saves in this browser.</div>`;
    t.innerHTML = h;
    t.querySelectorAll('canvas[data-slot]').forEach((c) => {
      const s = saves[+c.dataset.slot], x = c.getContext('2d');
      x.setTransform(1.2, 0, 0, 1.2, 32, 66);
      const fake = { kind: 'player', look: s.look, eq: s.eq, face: { right: true, front: true }, mt: 1 };
      const o = Render.humanoidOpts(fake, 0); o.moving = false; o.atk = -1;
      Sprites.humanoid(x, 0, 0, o);
    });
  },
  deleteSave(i) {
    const s = Main.listSaves()[i];
    if (s && confirm(`Delete ${s.name} forever? This cannot be undone.`)) { localStorage.removeItem('hoardlands_slot_' + i); this.showTitle(); }
  },

  // ---------- Creation ----------
  begin(slot) {
    Game.slot = slot;
    Sound.init();
    const prof = PROFESSIONS[0];
    this.C = {
      prof: prof.id, name: randomName(), stats: Object.assign({}, prof.stats), skills: Object.assign({}, prof.skills), birthsign: 'clover', town: 'havenmoor',
      look: { female: false, skin: LOOK_OPTIONS.skins[1], hair: 'Short', hairColor: LOOK_OPTIONS.hairColors[2], beard: 'None', shirt: '#7a2a2a', pants: '#3a3a3a', boots: '#5a3a1e', cloak: null },
    };
    this.step = 0; this.view = 0;
    $('#title').classList.add('hidden');
    $('#creator').classList.remove('hidden');
    this.render();
    if (!this.anim) { const loop = (t) => { if (Game.state !== 'title') { this.anim = null; return; } this.drawPreview(t / 1000); this.anim = requestAnimationFrame(loop); }; this.anim = requestAnimationFrame(loop); }
  },
  statSum() { const s = this.C.stats; return s.str + s.dex + s.int; },
  skillSum() { return Object.values(this.C.skills).reduce((a, b) => a + b, 0); },
  valid() {
    const C = this.C, errs = [];
    if (!/^[A-Za-z][A-Za-z ']{1,15}$/.test(C.name.trim())) errs.push('Name must be 2–16 letters.');
    if (this.statSum() !== CREATE_STAT_TOTAL) errs.push(`Spend exactly ${CREATE_STAT_TOTAL} attribute points (${this.statSum()} now).`);
    const n = Object.keys(C.skills).length;
    if (n < 1) errs.push('Choose at least one skill.');
    if (this.skillSum() > CREATE_SKILL_TOTAL) errs.push(`Skills exceed ${CREATE_SKILL_TOTAL} points.`);
    return errs;
  },
  render() {
    const C = this.C, el = $('#creator');
    const steps = CREATOR_STEPS.map((s, i) => `<button class="step ${i === this.step ? 'on' : ''} ${i < this.step ? 'done' : ''}" onclick="Creator.go(${i})"><span>${i + 1}</span>${s}</button>`).join('');
    el.innerHTML = `<div class="cr-head"><div class="logo small">HOARDLANDS</div><div class="steps">${steps}</div></div>
      <div class="cr-main"><div class="cr-left">
        <div class="preview"><canvas id="cr-preview" width="300" height="340"></canvas>
          <div class="pv-ctrl"><button class="btn" onclick="Creator.rotate(-1)">⟲</button><button class="btn ${this.walk ? 'on' : ''}" onclick="Creator.walk=!Creator.walk;Creator.render()">Walk</button><button class="btn" onclick="Creator.rotate(1)">⟳</button></div></div>
        <div class="cr-name">${U.esc(C.name || '—')}</div><div class="cr-sub">${PROFESSIONS.find((p) => p.id === C.prof).name} · ${BIRTHSIGNS.find((b) => b.id === C.birthsign).name} · ${TOWNS.find((t) => t.id === C.town).name}</div>
        ${this.derivedHTML()}
      </div><div class="cr-right" id="cr-step">${this.stepHTML()}</div></div>
      <div class="cr-foot"><button class="btn" onclick="Main.backToTitle()">Cancel</button><div class="spacer"></div>
        ${this.step > 0 ? '<button class="btn" onclick="Creator.go(Creator.step-1)">Back</button>' : ''}
        ${this.step < CREATOR_STEPS.length - 1 ? '<button class="btn gold" onclick="Creator.go(Creator.step+1)">Next</button>' : `<button class="btn big gold" onclick="Creator.finish()" ${this.valid().length ? 'disabled' : ''}>Enter the World</button>`}</div>`;
  },
  go(i) { this.step = U.clamp(i, 0, CREATOR_STEPS.length - 1); Sound.play('click'); this.render(); },
  rotate(d) { this.view = (this.view + d + 4) % 4; },
  derivedHTML() {
    const C = this.C, s = C.stats, bs = BIRTHSIGNS.find((b) => b.id === C.birthsign).bonus;
    const hp = 40 + Math.floor(s.str * 0.6) + (bs.hp || 0), mana = 10 + s.int + (bs.mana || 0), stam = 20 + s.dex, carry = 60 + s.str * 3;
    const kit = Player.starterKit(C).map(([id, o]) => `${BASES[id].name}${o.qty > 1 ? ' ×' + o.qty : ''}`);
    return `<div class="derived"><div><span>Health</span><b style="color:#e0604c">${hp}</b></div><div><span>Mana</span><b style="color:#5aa6ff">${mana}</b></div>
      <div><span>Stamina</span><b style="color:#5fd16e">${stam}</b></div><div><span>Carry</span><b>${carry}</b></div></div>
      <div class="kit"><div class="sk-cat">Starting kit</div><div class="muted small">${kit.join(' · ')}${C.skills.taming >= 40 || C.prof === 'tamer' ? ' · <b>a tame horse</b>' : ''} · 150 gold</div></div>`;
  },
  stepHTML() {
    const C = this.C;
    switch (this.step) {
      case 0: return `<h2>Choose a Profession</h2><p class="muted">Professions set your starting attributes, skills and gear. You can grow into any skill later. Nothing is locked in.</p><div class="prof-grid">` +
        PROFESSIONS.map((p) => {
          const portrait = Art.portrait(p.id);
          return `<div class="prof ${C.prof === p.id ? 'on' : ''}" onclick="Creator.setProf('${p.id}')">${portrait ? `<img class="portrait" src="${portrait}">` : `<img class="picon" src="${Sprites.iconURL(p.icon, p.icon === 'potion' ? '#ff4a6a' : p.icon === 'cloth' ? '#c86a9a' : '#c0c8d0', 48)}">`}
          <div class="pn">${p.name}</div><div class="pd">${p.desc}</div>
          ${p.skills ? `<div class="ps">${Object.entries(p.skills).map(([k, v]) => `${SKILL_BY_ID[k].name} ${v}`).join(' · ')}</div><div class="ps muted">STR ${p.stats.str} · DEX ${p.stats.dex} · INT ${p.stats.int}</div>` : ''}</div>`;
        }).join('') + '</div>';
      case 1: {
        const sw = (key, list) => list.map((c) => `<button class="sw ${C.look[key] === c ? 'on' : ''}" style="background:${c || 'transparent'}" onclick="Creator.setLook('${key}', ${c ? `'${c}'` : 'null'})">${c ? '' : '✕'}</button>`).join('');
        const opts = (key, list) => list.map((v) => `<button class="chip ${C.look[key] === v ? 'on' : ''}" onclick="Creator.setLook('${key}','${v}')">${v}</button>`).join('');
        return `<h2>Appearance</h2>
          <label>Name</label><div class="row"><input id="cr-name" maxlength="16" value="${U.esc(C.name)}" oninput="Creator.C.name=this.value;Creator.refreshSide()"><button class="btn" onclick="Creator.C.name=randomName();Creator.render()">🎲 Random</button></div>
          <label>Body</label><div class="row"><button class="chip ${!C.look.female ? 'on' : ''}" onclick="Creator.setLook('female',false)">Masculine</button><button class="chip ${C.look.female ? 'on' : ''}" onclick="Creator.setLook('female',true)">Feminine</button></div>
          <label>Skin tone</label><div class="row wrap">${sw('skin', LOOK_OPTIONS.skins)}</div>
          <label>Hair style</label><div class="row wrap">${opts('hair', LOOK_OPTIONS.hairStyles)}</div>
          <label>Hair color</label><div class="row wrap">${sw('hairColor', LOOK_OPTIONS.hairColors)}</div>
          <label>Facial hair</label><div class="row wrap">${opts('beard', LOOK_OPTIONS.beards)}</div>
          <label>Shirt</label><div class="row wrap">${sw('shirt', LOOK_OPTIONS.clothColors)}</div>
          <label>Trousers</label><div class="row wrap">${sw('pants', LOOK_OPTIONS.clothColors)}</div>
          <label>Shoes</label><div class="row wrap">${sw('boots', ['#5a3a1e', '#3a2a1a', '#2a2a2a', '#7a5a3a', '#8a3a2a', '#d8d0bc'])}</div>
          <label>Cloak</label><div class="row wrap">${sw('cloak', [null, ...LOOK_OPTIONS.clothColors])}</div>
          <div class="row"><button class="btn" onclick="Creator.randomLook()">🎲 Randomize appearance</button></div>`;
      }
      case 2: {
        const left = CREATE_STAT_TOTAL - this.statSum();
        return `<h2>Attributes</h2><p class="muted">Distribute <b>${CREATE_STAT_TOTAL}</b> points (${CREATE_STAT_MIN}–${CREATE_STAT_MAX} each). Attributes also grow as you use related skills, up to ${STAT_CAP} total.</p>
          <div class="pts ${left === 0 ? 'ok' : 'bad'}">Points remaining: <b>${left}</b></div>` +
          ['str', 'dex', 'int'].map((k) => `<div class="attr"><div class="attr-head"><b style="color:${STAT_INFO[k].color}">${STAT_INFO[k].name}</b><span class="muted small">${STAT_INFO[k].desc}</span></div>
            <div class="row"><button class="btn" onclick="Creator.addStat('${k}',-5)">−5</button><button class="btn" onclick="Creator.addStat('${k}',-1)">−</button>
            <input type="range" min="${CREATE_STAT_MIN}" max="${CREATE_STAT_MAX}" value="${C.stats[k]}" oninput="Creator.setStat('${k}',+this.value)" style="--c:${STAT_INFO[k].color}">
            <button class="btn" onclick="Creator.addStat('${k}',1)">+</button><button class="btn" onclick="Creator.addStat('${k}',5)">+5</button><b class="attr-val">${C.stats[k]}</b></div></div>`).join('') +
          `<div class="muted small">Skills that use each attribute: ${['str', 'dex', 'int'].map((k) => `<b style="color:${STAT_INFO[k].color}">${STAT_INFO[k].short}</b> ${SKILLS.filter((s) => s.stat === k).map((s) => s.name).join(', ')}`).join('<br>')}</div>`;
      }
      case 3: {
        const n = Object.keys(C.skills).length, left = CREATE_SKILL_TOTAL - this.skillSum();
        let h = `<h2>Starting Skills</h2><p class="muted">Pick up to <b>${CREATE_SKILL_COUNT}</b> skills and spread <b>${CREATE_SKILL_TOTAL}</b> points (max ${CREATE_SKILL_MAX} each). Every other skill starts at 0 and rises with use. You can learn all ${SKILLS.length}, up to a ${SKILL_CAP} total.</p>
          <div class="pts ${left >= 0 ? 'ok' : 'bad'}">Selected ${n}/${CREATE_SKILL_COUNT} · Points remaining: <b>${left}</b></div><div class="skill-pick">`;
        for (const cat of SKILL_CATS) {
          h += `<div class="sk-cat">${cat}</div>`;
          for (const s of SKILLS.filter((k) => k.cat === cat)) {
            const on = C.skills[s.id] != null;
            h += `<div class="sp-row ${on ? 'on' : ''}"><label class="sp-name"><input type="checkbox" ${on ? 'checked' : ''} ${!on && n >= CREATE_SKILL_COUNT ? 'disabled' : ''} onchange="Creator.toggleSkill('${s.id}',this.checked)"> ${s.name} <span class="muted small">${STAT_INFO[s.stat].short}</span></label>
              ${on ? `<input type="range" min="0" max="${CREATE_SKILL_MAX}" value="${C.skills[s.id]}" oninput="Creator.setSkill('${s.id}',+this.value)"><b>${C.skills[s.id]}</b>` : `<span class="muted small sp-desc">${s.desc}</span>`}</div>`;
          }
        }
        return h + '</div>';
      }
      case 4: return `<h2>Birthsign</h2><p class="muted">The star you were born under grants a small, permanent blessing.</p><div class="sign-grid">` +
        BIRTHSIGNS.map((b) => `<div class="sign ${C.birthsign === b.id ? 'on' : ''}" onclick="Creator.C.birthsign='${b.id}';Creator.render()"><div class="sg-star">✦</div><div class="pn">${b.name}</div><div class="pd">${b.desc}</div></div>`).join('') + '</div>';
      case 5: return `<h2>Origin</h2><p class="muted">Choose the town where your story begins. Every town has a bank, healer's shrine and bounty board.</p><div class="town-grid">` +
        TOWNS.map((t) => `<div class="town ${C.town === t.id ? 'on' : ''}" onclick="Creator.C.town='${t.id}';Creator.render()"><canvas class="town-map" width="200" height="110" data-town="${t.id}"></canvas><div class="pn">${t.name}</div><div class="pd">${t.desc}</div>
          <div class="ps">Shops: ${t.roles.map((r) => VENDORS[r].title).join(', ')}, Stablemaster</div></div>`).join('') + '</div>';
      case 6: {
        const errs = this.valid();
        return `<h2>Review</h2><table class="review">
          <tr><td>Name</td><td>${U.esc(C.name)}</td></tr><tr><td>Profession</td><td>${PROFESSIONS.find((p) => p.id === C.prof).name}</td></tr>
          <tr><td>Attributes</td><td>STR ${C.stats.str} · DEX ${C.stats.dex} · INT ${C.stats.int}</td></tr>
          <tr><td>Skills</td><td>${Object.entries(C.skills).map(([k, v]) => `${SKILL_BY_ID[k].name} ${v}`).join('<br>')}</td></tr>
          <tr><td>Birthsign</td><td>${BIRTHSIGNS.find((b) => b.id === C.birthsign).name}: ${BIRTHSIGNS.find((b) => b.id === C.birthsign).desc}</td></tr>
          <tr><td>Origin</td><td>${TOWNS.find((t) => t.id === C.town).name}</td></tr></table>
          ${errs.length ? `<div class="warn">${errs.map(U.esc).join('<br>')}</div>` : '<p class="ok-msg">Ready! Your adventure awaits in the Vale.</p>'}`;
      }
    }
    return '';
  },
  refreshSide() { const n = document.querySelector('.cr-name'); if (n) n.textContent = this.C.name; },
  afterRender() {
    document.querySelectorAll('canvas.town-map').forEach((c) => {
      const t = TOWNS.find((x) => x.id === c.dataset.town), x = c.getContext('2d');
      x.fillStyle = '#0b1420'; x.fillRect(0, 0, c.width, c.height);
      const k = 0.55;
      x.setTransform(k, k / 2, -k, k / 2, c.width / 2, 2);
      x.imageSmoothingEnabled = false; x.drawImage(World.mini, 0, 0);
      x.setTransform(1, 0, 0, 1, 0, 0);
      const mx = c.width / 2 + (t.x - t.y) * k, my = 2 + (t.x + t.y) * k / 2;
      x.strokeStyle = '#ffd94a'; x.lineWidth = 2; x.beginPath(); x.arc(mx, my, 7, 0, 7); x.stroke();
    });
  },
  setProf(id) {
    const p = PROFESSIONS.find((x) => x.id === id);
    this.C.prof = id;
    if (p.stats) { this.C.stats = Object.assign({}, p.stats); this.C.skills = Object.assign({}, p.skills); }
    Sound.play('click'); this.render();
  },
  setLook(k, v) { this.C.look[k] = v; if (k === 'female' && v && this.C.look.beard !== 'None') this.C.look.beard = 'None'; this.render(); },
  randomLook() {
    const L = this.C.look, O = LOOK_OPTIONS;
    L.female = U.chance(0.5); L.skin = U.pick(O.skins.slice(0, 7)); L.hair = U.pick(O.hairStyles); L.hairColor = U.pick(O.hairColors);
    L.beard = L.female ? 'None' : U.pick(O.beards); L.shirt = U.pick(O.clothColors); L.pants = U.pick(O.clothColors);
    L.cloak = U.chance(0.4) ? U.pick(O.clothColors) : null;
    this.render();
  },
  setStat(k, v) {
    const s = this.C.stats;
    v = U.clamp(v, CREATE_STAT_MIN, CREATE_STAT_MAX);
    const others = this.statSum() - s[k];
    s[k] = Math.min(v, CREATE_STAT_TOTAL - others >= CREATE_STAT_MIN ? CREATE_STAT_TOTAL - others : v);
    s[k] = U.clamp(s[k], CREATE_STAT_MIN, CREATE_STAT_MAX);
    this.C.prof = this.matchesProf() ? this.C.prof : 'custom';
    this.render();
  },
  addStat(k, d) { this.setStat(k, this.C.stats[k] + d); },
  toggleSkill(id, on) {
    if (on) { if (Object.keys(this.C.skills).length >= CREATE_SKILL_COUNT) return; this.C.skills[id] = Math.max(0, Math.min(CREATE_SKILL_MAX, CREATE_SKILL_TOTAL - this.skillSum())); }
    else delete this.C.skills[id];
    this.C.prof = 'custom'; this.render();
  },
  setSkill(id, v) {
    const others = this.skillSum() - this.C.skills[id];
    this.C.skills[id] = U.clamp(Math.min(v, CREATE_SKILL_TOTAL - others), 0, CREATE_SKILL_MAX);
    this.C.prof = 'custom'; this.render();
  },
  matchesProf() {
    const p = PROFESSIONS.find((x) => x.id === this.C.prof);
    return p && p.stats && ['str', 'dex', 'int'].every((k) => p.stats[k] === this.C.stats[k]);
  },
  drawPreview(time) {
    const c = document.getElementById('cr-preview');
    if (!c) return;
    const x = c.getContext('2d'), C = this.C;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    const g = x.createRadialGradient(150, 290, 10, 150, 290, 140);
    g.addColorStop(0, 'rgba(255,220,150,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.save(); x.translate(150, 300); x.scale(1, 0.5);
    x.fillStyle = 'rgba(120,100,70,0.35)'; x.beginPath(); x.arc(0, 0, 90, 0, 7); x.fill(); x.restore();
    // Build a fake player with starter gear for the preview
    const eq = {};
    for (const [id, o] of Player.starterKit(C)) {
      const b = BASES[id];
      if (b.slot && !eq[b.slot] && (b.cat === 'armor' || b.cat === 'weapon' || b.cat === 'shield')) {
        if (b.slot === 'off' && eq.main && BASES[eq.main.base].twoH) continue;
        if (b.slot === 'chest' && id === 'shirt' && Player.starterKit(C).some(([i]) => i === 'robe')) continue;
        eq[b.slot] = Items.create(id, o);
      }
    }
    const views = [{ right: true, front: true }, { right: false, front: true }, { right: false, front: false }, { right: true, front: false }];
    const fake = { kind: 'player', look: { skin: C.look.skin, hair: C.look.hair, hairColor: C.look.hairColor, beard: C.look.beard, female: C.look.female }, eq, face: views[this.view], mt: this.walk ? 0.5 : 1, walkPh: time * 8 };
    const o = Render.humanoidOpts(fake, time);
    o.moving = this.walk; o.walk = time * 9; o.atk = -1;
    x.setTransform(5, 0, 0, 5, 150, 300 + Math.sin(time * 2) * (this.walk ? 0 : 0.6));
    Sprites.humanoid(x, 0, 0, o);
  },
  finish() {
    const errs = this.valid();
    if (errs.length) { alert(errs.join('\n')); return; }
    const C = this.C;
    C.name = C.name.trim().replace(/\b\w/g, (m) => m.toUpperCase());
    Main.newGame(C);
  },
};
// re-run canvas setup after each creator render
const _crRender = Creator.render;
Creator.render = function () { _crRender.call(this); this.afterRender(); };
