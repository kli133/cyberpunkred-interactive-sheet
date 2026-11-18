// Киберимпланты — вынесено из player/app.js. Глобалы: state, helpers из app/shared.
// --- Киберимпланты (каталог и системы — data.js) ---
const cyberByName = Object.fromEntries(Object.values(cyberCatalog).flat().map(item=>[item[0], item]));
const cyberItemMeta = name => cyberByName[name]?.[5] || {};
const cyberPieceId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const blankCyberSys = () => ({foundation:null, options:[]});
const blankCyber = () => Object.fromEntries(Object.keys(cyberSystems).map(key=>[key, blankCyberSys()]));
function normalizePiece(raw){
  const p = raw && typeof raw === 'object' ? raw : {};
  return {
    id:String(p.id || cyberPieceId()),
    catalog:String(p.catalog || ''),
    name:String(p.name || ''),
    info:String(p.info || ''),
    hl:String(p.hl ?? ''),
    installed:p.installed !== false,
    active:p.active === true,
    slotCost:Math.max(1, Number(p.slotCost) || 1),
    custom:p.custom === true || !p.catalog
  };
}
function normalizeCyber(raw){
  const base = blankCyber();
  if(!raw || typeof raw !== 'object') return base;
  Object.keys(cyberSystems).forEach(key=>{
    const src = raw[key] || {};
    base[key].foundation = src.foundation ? normalizePiece(src.foundation) : null;
    base[key].options = (Array.isArray(src.options) ? src.options : []).map(normalizePiece);
  });
  return base;
}
function migrateLegacyCyber(s){
  if(s.cyber && typeof s.cyber === 'object') return normalizeCyber(s.cyber);
  const cyber = blankCyber();
  const old = s.cyberSlots;
  if(old && typeof old === 'object'){
    Object.entries(old).forEach(([key, rows])=>{
      const sys = cyberLegacyMap[key] || key;
      if(!cyber[sys]) return;
      (Array.isArray(rows) ? rows : []).forEach(row=>{
        const cells = [0,1,2].map(j=>String(row?.[j] ?? ''));
        if(cells.every(isBlank)) return;
        const match = cyberByName[cells[0]];
        const meta = match?.[5] || {};
        const piece = normalizePiece({
          catalog:match ? match[0] : '', name:cells[0], info:cells[1] || (match ? match[2] : ''),
          hl:cells[2], installed:true, slotCost:meta.slots || 1, custom:!match
        });
        if(meta.kind === 'foundation' && !cyber[sys].foundation) cyber[sys].foundation = piece;
        else cyber[sys].options.push(piece);
      });
    });
  }
  return cyber;
}
const cyberSys = key => (state.cyber ||= blankCyber())[key] || blankCyberSys();
function allCyberPieces(){
  return Object.keys(cyberSystems).flatMap(key=>{
    const sys = cyberSys(key);
    return [sys.foundation, ...sys.options].filter(Boolean).map(piece=>({key, piece, foundation:piece === sys.foundation}));
  });
}
function pieceMeta(piece){
  if(piece.catalog && cyberByName[piece.catalog]) return cyberItemMeta(piece.catalog);
  return {kind:piece.custom ? 'body' : 'option', slots:piece.slotCost || 1};
}
function pieceActive(piece, key){
  if(!piece?.installed) return false;
  const conf = cyberSystems[key];
  const foundation = cyberSys(key).foundation;
  const meta = pieceMeta(piece);
  // Модуль без включённой базы: на живой конечности действуют только meat-импланты.
  if(conf?.foundation && piece !== foundation && !foundation?.installed){
    if(!(conf.meat && meta.meat)) return false;
  }
  if(meta.activate && !piece.active) return false;
  return true;
}
function installedFx(){
  return allCyberPieces().filter(({key, piece})=>pieceActive(piece, key)).map(({piece})=>pieceMeta(piece));
}
function cyberIgnoresWound(){ return installedFx().some(fx=>fx.ignoreWound); }
function cyberBody(){
  let value = numeric('stat8');
  installedFx().forEach(fx=>{
    if(fx.stat?.[0] === 8) value = fx.stat[2] != null ? Math.min(fx.stat[2], value + fx.stat[1]) : value + fx.stat[1];
  });
  installedFx().forEach(fx=>{
    if(fx.statMin?.[0] === 8) value = Math.min(fx.statMin[2], Math.max(value, fx.statMin[1]));
  });
  return value;
}
function cyberInitBonus(){
  return installedFx().reduce((sum, fx)=>sum + (Number(fx.init) || 0), 0);
}
function cyberMoveBonus(){
  return installedFx().reduce((sum, fx)=>sum + (Number(fx.move) || 0), 0);
}
function cyberSpFloor(){
  return installedFx().reduce((max, fx)=>Math.max(max, Number(fx.sp) || 0), 0);
}
function cyberSkillBonus(name){
  const plain = s => String(s || '').toLowerCase();
  const installed = allCyberPieces().filter(({key, piece})=>pieceActive(piece, key));
  let bonus = 0;
  const notes = [];
  installed.forEach(({piece})=>{
    const fx = pieceMeta(piece);
    if(fx.needPair && !installed.some(({piece:p})=>(p.catalog || p.name) === fx.needPair)) return;
    if(fx.skill){
      const [names, amount] = fx.skill;
      if(String(names).split('|').some(n=>plain(name) === plain(n) || plain(name).startsWith(plain(n)))){
        bonus += amount;
        notes.push(piece.name || piece.catalog);
      }
    }
    if(fx.skillStack){
      const [skillName, amount, need] = fx.skillStack;
      if(plain(name).startsWith(plain(skillName))){
        const count = installed.filter(({piece:p})=>(p.catalog || p.name) === (piece.catalog || piece.name)).length;
        if(count >= need){ bonus += amount; notes.push(piece.catalog || piece.name); }
      }
    }
  });
  return [bonus, notes.filter((n,i,a)=>a.indexOf(n)===i).join(', ')];
}
function parseHlText(text){
  const raw = String(text || '').trim();
  if(!raw || raw === '0') return {avg:0, formula:null, half:false};
  const avg = Number((raw.match(/^(\d+)/) || [])[1]) || 0;
  const dice = raw.match(/(\d+)\s*[dд]\s*(\d+)/i);
  const half = /\/\s*2/.test(raw);
  return {avg, formula:dice ? {count:Number(dice[1]), sides:Number(dice[2])} : null, half};
}
function rollHl(text){
  const parsed = parseHlText(text);
  if(!parsed.formula) return parsed.avg;
  let total = Array.from({length:parsed.formula.count},()=>d(parsed.formula.sides)).reduce((a,b)=>a+b,0);
  if(parsed.half) total = Math.ceil(total / 2);
  return total;
}
function pieceLabel(piece){ return piece.name || piece.catalog || 'Свой имплант'; }
function humanityLoss(){
  return allCyberPieces().reduce((sum,{piece})=>sum + (piece.installed ? (Number(piece.hl) || 0) : 0), 0);
}
function adjustHumanity(delta){
  if(!delta) return;
  const current = isBlank(state.humanityCurrent) ? numeric('stat9') * 10 : numeric('humanityCurrent');
  state.humanityCurrent = Math.max(0, current - delta);
  setInput('humanityCurrent', state.humanityCurrent);
}
function ensurePieceHl(piece){
  if(!isBlank(piece.hl) && /^\d+$/.test(String(piece.hl).trim())) return Number(piece.hl);
  const source = piece.catalog && cyberByName[piece.catalog] ? cyberByName[piece.catalog][4] : piece.hl;
  const rolled = rollHl(source || '0');
  piece.hl = String(rolled);
  return rolled;
}
function setPieceInstalled(piece, on, key){
  const was = piece.installed !== false;
  if(was === on) return;
  if(on){
    const hl = ensurePieceHl(piece);
    piece.installed = true;
    adjustHumanity(hl);
    if(pieceMeta(piece).activate) piece.active = false;
    toast(`${term(pieceLabel(piece))}: ${t('установлено')}${hl ? `, ${t('ПЧ')} ${hl}` : ''}`);
  } else {
    const refund = Number(piece.hl) || 0;
    piece.installed = false;
    piece.active = false;
    adjustHumanity(-refund);
    toast(`${term(pieceLabel(piece))}: ${t('снято')}${refund ? `, ${t('Человечность +')}${refund}` : ''}`);
  }
}
function catalogOptions(group, kind){
  return Object.values(cyberCatalog).flat().filter(item=>{
    const meta = item[5] || {};
    return meta.group === group && (!kind || meta.kind === kind);
  });
}
function slotsUsed(key){
  const sys = cyberSys(key);
  return sys.options.reduce((sum, p)=>sum + (Number(p.slotCost) || pieceMeta(p).slots || 1), 0);
}
function slotsMax(key){
  const conf = cyberSystems[key];
  if(conf.bodySlots) return conf.bodySlots;
  if(conf.foundation){
    const f = cyberSys(key).foundation;
    if(f?.installed) return Number(pieceMeta(f).slots) || conf.slots;
    if(conf.meat) return 99; // в мясо — без лимита киберслотов
    return 0;
  }
  return conf.slots || 0;
}
const uniqueLabels = {speedware:'ускоритель (Керезников / Сандевистан)', skin:'кожная броня (тканекожа / подкожная)'};
function hasInstalledCatalog(name){
  return allCyberPieces().some(({piece})=>piece.installed && (piece.catalog === name || piece.name === name));
}
function optionAlreadyHere(key, catalogName){
  return cyberSys(key).options.some(p=>(p.catalog || p.name) === catalogName);
}
// Пусто — можно поставить; иначе короткая причина для списка.
function canAddOption(key, catalogName){
  const conf = cyberSystems[key];
  const meta = catalogName ? cyberItemMeta(catalogName) : {slots:1, kind:'option'};
  const baseOn = Boolean(cyberSys(key).foundation?.installed);
  if(conf.foundation && !baseOn && !conf.meat) return `Сначала включите «${conf.foundation}»`;
  if(conf.foundation && !baseOn && conf.meat && catalogName && !meta.meat)
    return `Только в кибер${conf.group === 'leg' ? 'ногу' : 'руку'} (или импланты «в живую»)`;
  if(catalogName && optionAlreadyHere(key, catalogName)) return 'Уже есть в этом слоте';
  if(meta.need && !hasInstalledCatalog(meta.need)) return `Нужен установленный «${meta.need}»`;
  if(meta.unique){
    const rival = allCyberPieces().find(({piece})=>piece.installed && pieceMeta(piece).unique === meta.unique && (piece.catalog || piece.name) !== catalogName);
    if(rival) return `Конфликт: уже стоит «${pieceLabel(rival.piece)}» (${uniqueLabels[meta.unique] || meta.unique})`;
  }
  const cost = meta.slots || 1;
  const free = slotsMax(key) - slotsUsed(key);
  if(slotsMax(key) < 99 && cost > free)
    return free <= 0 ? 'Нет свободных слотов' : `Нужно ${cost} сл., свободно ${Math.max(0, free)}`;
  return '';
}
function optionTags(meta, key){
  const tags = [];
  if(meta.slots) tags.push(`${meta.slots} сл.`);
  if(meta.meat && cyberSystems[key]?.meat) tags.push('в живую');
  if(meta.pair) tags.push('пара');
  if(meta.need) tags.push(hasInstalledCatalog(meta.need) ? `✓ ${meta.need}` : meta.need);
  if(meta.unique) tags.push(uniqueLabels[meta.unique]?.split(' (')[0] || meta.unique);
  if(meta.weapon) tags.push('оружие');
  if(meta.init) tags.push(`иниц. +${meta.init}`);
  if(meta.stat || meta.statMin) tags.push('ТЕЛ');
  if(meta.sp) tags.push(`SP ${meta.sp}`);
  if(meta.ignoreWound) tags.push('без боли');
  if(meta.skill || meta.skillStack) tags.push('навык');
  return tags;
}
function makeFromCatalog(name){
  const item = cyberByName[name];
  if(!item) return normalizePiece({custom:true, name:'', installed:false});
  const meta = item[5] || {};
  return normalizePiece({
    catalog:item[0], name:item[0], info:item[2],
    hl:'', installed:false, slotCost:meta.slots || 1, custom:false
  });
}
function pieceInfoText(piece){
  if(piece.custom) return piece.info || '';
  const item = piece.catalog && cyberByName[piece.catalog];
  if(item) return item[2];
  // Старые сохранения: убрать «установка: …» с карточки.
  return String(piece.info || '').replace(/\s*·\s*установка:\s*[^·]+/i, '').replace(/\s*·\s*\d+eb\b/gi, '').trim();
}
function makeCustom(slotCost=1){
  return normalizePiece({catalog:'', name:'', info:'', hl:'', installed:false, slotCost, custom:true});
}
function resolveWeaponType(type){
  return weaponTypes[type] || cyberWeaponTypes[type] || null;
}
function defaultAmmoForWeapon(type){
  const kinds = weaponAmmoKinds[type] || [];
  if(!kinds.length) return null;
  const kind = kinds[0];
  const form = ammoKinds[kind]?.[2];
  if(!form) return null;
  const ammoType = ammoTypes.basic?.[2]?.includes(form) ? 'basic'
    : Object.keys(ammoTypes).find(id=>ammoTypes[id][2].includes(form));
  return ammoType ? {kind, type:ammoType} : null;
}
function ensureAmmoStock(kind, type){
  if(!ammoKinds[kind] || !ammoTypes[type]) return;
  if(!Array.isArray(state.ammo)) state.ammo = [];
  if(!state.ammo.some(row=>row[1] === `${kind}:${type}`))
    state.ammo.push([ammoKinds[kind][1], `${kind}:${type}`, '0']);
}
function syncCyberWeapons(quiet=false){
  if(!Array.isArray(state.weapon)) state.weapon = [];
  const marker = id => `__cyber:${id}`;
  const keep = new Set();
  const notes = [];
  allCyberPieces().forEach(({key, piece})=>{
    const fx = pieceMeta(piece);
    if(!fx.weapon || !pieceActive(piece, key)) return;
    keep.add(piece.id);
    const [wname, type, mag] = fx.weapon;
    const preset = resolveWeaponType(type);
    const existing = state.weapon.findIndex(row => String(row?.[4] || '').includes(marker(piece.id)));
    const isNew = existing < 0;
    const row = isNew ? Array(rowTypes.weapon).fill('') : state.weapon[existing];
    row[0] = wname;
    row[4] = marker(piece.id);
    if(preset){
      row[8] = type;
      row[5] = preset[1];
      row[1] = preset[2];
      const magazine = mag != null ? String(mag) : String(preset[3] ?? '');
      row[6] = magazine;
      row[3] = String(preset[4] ?? '');
      row[7] = String(preset[5] ?? '');
      if(isNew) row[2] = '0';
      else if(isBlank(row[2])) row[2] = '0';
    }
    const ammo = defaultAmmoForWeapon(type);
    if(ammo){
      ensureAmmoStock(ammo.kind, ammo.type);
      if(isNew || isBlank(row[10])) row[10] = `${ammo.kind}:${ammo.type}`;
      if(isNew && Number(row[6]) > 0){
        const taken = takeAmmo(ammo.kind, ammo.type, Number(row[6]) || 0);
        row[2] = String(taken);
        notes.push(taken
          ? `${wname}: в снаряжении, магазин ${taken}/${row[6]}`
          : `${wname}: в снаряжении — добавьте патроны (${ammoTypes[ammo.type][0]})`);
      }
    } else if(isNew) {
      notes.push(`${wname}: добавлено в снаряжение`);
    }
    if(isNew) state.weapon.push(row);
    else state.weapon[existing] = row;
  });
  // Снять кибероружие: патроны из магазина вернуть в запас.
  state.weapon = state.weapon.filter(row=>{
    const note = String(row?.[4] || '');
    if(!note.includes('__cyber:')) return true;
    const id = (note.match(/__cyber:([^\s]+)/) || [])[1];
    if(keep.has(id)) return true;
    const loaded = loadedAmmo(row);
    const current = Math.max(0, Number(row[2]) || 0);
    if(loaded && current) returnAmmo(loaded.kind, loaded.type, current);
    return false;
  });
  if(!quiet && notes.length) toast(notes.join(' · '));
}
function cyberEffectSummary(){
  const bits = [];
  if(cyberBody() !== numeric('stat8')) bits.push(`${term('ТЕЛ')} ${cyberBody()}`);
  if(cyberInitBonus()) bits.push(`${t('инициатива +')}${cyberInitBonus()}`);
  if(cyberIgnoresWound()) bits.push(t('без штрафа тяжёлого ранения'));
  if(cyberSpFloor()) bits.push(`SP ≥ ${cyberSpFloor()}`);
  if(cyberMoveBonus()) bits.push(`${t('бег +')}${cyberMoveBonus()} ${t('м')}`);
  const notes = installedFx().map(fx=>fx.note).filter(Boolean).map(note=>t(note));
  return [...bits, ...notes].filter((v,i,a)=>a.indexOf(v)===i);
}
function findCyberPiece(key, id){
  const sys = cyberSys(key);
  if(sys.foundation?.id === id) return {sys, piece:sys.foundation, foundation:true};
  const index = sys.options.findIndex(p=>p.id === id);
  return index >= 0 ? {sys, piece:sys.options[index], foundation:false, index} : null;
}
function commitCyber(rerender=true){
  syncCyberWeapons();
  if(rerender){
    renderCyber();
    renderRows('weapon');
    renderRows('ammo');
    bindInputs();
  }
  updateDerived();
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
}
function addCyberPiece(key, value){
  const sys = cyberSys(key);
  if(value === '__custom'){
    const block = canAddOption(key, '');
    if(block && slotsMax(key) < 99 && slotsUsed(key) >= slotsMax(key)){ toast(termsIn(block)); return; }
    const piece = makeCustom(1);
    piece.installed = true;
    sys.options.push(piece);
    commitCyber();
    return;
  }
  const block = canAddOption(key, value);
  if(block){ toast(termsIn(block)); return; }
  const piece = makeFromCatalog(value);
  // Из каталога сразу ставим: ПЧ и эффекты (включая оружие в снаряжении).
  sys.options.push(piece);
  setPieceInstalled(piece, true, key);
  commitCyber();
}
function handleCyberClick(e){
  const btn = e.target.closest('[data-cyber-act]');
  if(!btn || btn.matches('input, textarea, select')) return;
  const key = btn.dataset.cyberKey, id = btn.dataset.cyberId, act = btn.dataset.cyberAct;
  if(act === 'foundation'){ toggleFoundation(key); return; }
  if(act === 'picker'){
    const panel = $(`[data-cyber-picker="${key}"]`);
    if(!panel) return;
    const open = panel.hasAttribute('hidden');
    $$('[data-cyber-picker]').forEach(el=>el.setAttribute('hidden', ''));
    if(open){
      panel.removeAttribute('hidden');
      panel.querySelector('[data-cyber-filter]')?.focus();
    }
    return;
  }
  if(act === 'pick'){
    addCyberPiece(key, btn.dataset.cyberName);
    return;
  }
  if(act === 'pick-custom'){
    addCyberPiece(key, '__custom');
    return;
  }
  const found = id ? findCyberPiece(key, id) : null;
  if(act === 'toggle' && found){
    setPieceInstalled(found.piece, !found.piece.installed, key);
    commitCyber();
    return;
  }
  if(act === 'active' && found){
    found.piece.active = !found.piece.active;
    toast(`${term(pieceLabel(found.piece))}: ${found.piece.active ? t('активирован') : t('деактивирован')}`);
    commitCyber();
    return;
  }
  if(act === 'del' && found){
    if(found.piece.installed) setPieceInstalled(found.piece, false, key);
    if(found.foundation) found.sys.foundation = null;
    else found.sys.options.splice(found.index, 1);
    commitCyber();
  }
}
function handleCyberChange(e){
  const field = e.target.closest('[data-cyber-field]');
  if(!field) return;
  const found = findCyberPiece(field.dataset.cyberKey, field.dataset.cyberId);
  if(!found) return;
  const name = field.dataset.cyberField;
  if(name === 'hl'){
    let value = field.value.trim();
    if(/[dд]/i.test(value)){
      const total = rollHl(value);
      const shown = parseFormula(value) ? `${parseFormula(value).count}d${parseFormula(value).sides}` : value;
      value = String(total);
      field.value = value;
      toast(`${t('Потеря человечности:')} ${shown} = ${total}`);
    }
    const prev = Number(found.piece.hl) || 0;
    const next = Number(value) || 0;
    found.piece.hl = next ? String(next) : '';
    if(found.piece.installed) adjustHumanity(next - prev);
    commitCyber(false);
    return;
  }
  found.piece[name] = field.value;
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
}


function cyberHead(key, conf, sys){
  const used = slotsUsed(key);
  const max = slotsMax(key);
  const hasBase = Boolean(conf.foundation);
  const baseOn = hasBase && sys.foundation?.installed;
  const over = used > max && max < 99;
  let baseCtrl = '';
  if(hasBase){
    const rawLabel = baseOn ? (sys.foundation.name || conf.foundation) : foundationOffLabel(conf);
    const label = baseOn ? term(rawLabel) : rawLabel;
    const hl = baseOn
      ? `<label class="cyber-base-hl" title="${esc(t('Потеря человечности базы'))}">${t('ПЧ')} <input data-cyber-field="hl" data-cyber-key="${key}" data-cyber-id="${esc(sys.foundation.id)}" value="${esc(sys.foundation.hl)}"></label>`
      : '';
    const baseTitle = baseOn ? t('Снять базу (вернуть ПЧ)') : `${t('Установка:')} ${term(conf.foundation)}`;
    baseCtrl = `<button type="button" class="cyber-base-toggle${baseOn ? ' is-on' : ''}" data-cyber-act="foundation" data-cyber-key="${key}" title="${esc(baseTitle)}">${esc(label)}</button>${hl}`;
  }
  const slots = conf.bodySlots
    ? (conf.bodySlots >= 99 ? '' : `<span class="cyber-head-meta${over ? ' is-over' : ''}">${used}/${conf.bodySlots} ${t('сл.')}</span>`)
    : hasBase
      ? `<span class="cyber-head-meta${over ? ' is-over' : ''}">${baseOn ? `${used}/${max} ${t('сл.')}` : (conf.meat ? t('модули в мясо') : t('нужна база'))}</span>`
      : '';
  return `<div class="cyber-panel-head">
    <strong class="cyber-head-title">${esc(term(conf.title))}</strong>
    ${baseCtrl}${slots}
  </div>`;
}
function cyberPieceCard(key, piece, kind){
  const meta = pieceMeta(piece);
  const on = piece.installed !== false;
  const over = kind === 'option' && slotsUsed(key) > slotsMax(key);
  const activate = meta.activate && on
    ? `<button type="button" class="cyber-active${piece.active ? ' is-on' : ''}" data-cyber-act="active" data-cyber-key="${key}" data-cyber-id="${esc(piece.id)}" title="${esc(t('Боевая активация (Сандевистан)'))}">${piece.active ? t('АКТИВЕН') : t('ВЫКЛ')}</button>`
    : '';
  const nameCell = piece.custom
    ? `<input data-cyber-field="name" data-cyber-key="${key}" data-cyber-id="${esc(piece.id)}" value="${esc(piece.name)}" placeholder="${esc(t('Свой имплант'))}">`
    : `<strong title="${esc(t(pieceInfoText(piece) || ''))}">${esc(term(pieceLabel(piece)))}</strong>${meta.slots ? ` <small>${meta.slots} ${t('сл.')}</small>` : ''}`;
  const infoCell = piece.custom
    ? `<textarea class="grow-field" data-cyber-field="info" data-cyber-key="${key}" data-cyber-id="${esc(piece.id)}" rows="1" placeholder="${esc(t('Описание'))}">${esc(piece.info)}</textarea>`
    : `<span class="cyber-desc">${esc(t(pieceInfoText(piece) || meta.note || ''))}</span>`;
  const weaponNote = meta.weapon && on && pieceActive(piece, key)
    ? `<span class="cyber-weapon-link">${t('→ в снаряжении:')} ${esc(term(meta.weapon[0]))}</span>`
    : meta.weapon && on
      ? `<span class="cyber-weapon-link is-warn">${t('оружие не активно (проверьте базу)')}</span>`
      : meta.weapon ? `<span class="cyber-weapon-link">${t('после ВКЛ появится в снаряжении')}</span>` : '';
  return `<article class="cyber-piece${on ? ' is-installed' : ' is-off'}${over ? ' is-over' : ''}">
    <div class="cyber-piece-tools">
      <button type="button" class="cyber-install${on ? ' is-on' : ''}" data-cyber-act="toggle" data-cyber-key="${key}" data-cyber-id="${esc(piece.id)}" aria-pressed="${on}" title="${esc(on ? t('Снять (вернуть ПЧ)') : t('Установить (списать ПЧ)'))}">${on ? t('ВКЛ') : t('ВЫКЛ')}</button>
      ${activate}
      <button type="button" class="remove" data-cyber-act="del" data-cyber-key="${key}" data-cyber-id="${esc(piece.id)}" title="${esc(t('Удалить'))}">×</button>
    </div>
    <div class="cyber-piece-main">
      <div class="cyber-piece-name">${nameCell}</div>
      <div class="cyber-piece-info">${infoCell}${weaponNote}</div>
    </div>
    <label class="cyber-piece-hl" title="${esc(t('Потеря человечности'))}">${t('ПЧ')} <input data-cyber-field="hl" data-cyber-key="${key}" data-cyber-id="${esc(piece.id)}" value="${esc(piece.hl)}" placeholder="0"></label>
  </article>`;
}
function cyberCatalogLists(key){
  const conf = cyberSystems[key];
  const kind = conf.bodySlots ? 'body' : 'option';
  const available = [], blocked = [];
  catalogOptions(conf.group, kind).filter(item=>item[0] !== conf.foundation).forEach(item=>{
    const reason = canAddOption(key, item[0]);
    const entry = {item, reason, tags:optionTags(item[5] || {}, key)};
    (reason ? blocked : available).push(entry);
  });
  return {available, blocked};
}
function displayOptionTags(tags){
  return tags.map(tag=>{
    if(/^\d+ сл\.$/.test(tag)) return tag.replace('сл.', t('сл.'));
    if(tag.startsWith('иниц.')) return tag.replace('иниц.', t('иниц.'));
    if(tag.startsWith('✓ ')) return `✓ ${term(tag.slice(2))}`;
    return t(tag) !== tag ? t(tag) : term(tag);
  });
}
function cyberAddSelect(key){
  const free = slotsMax(key) - slotsUsed(key);
  const {available, blocked} = cyberCatalogLists(key);
  const freeLabel = slotsMax(key) >= 99
    ? (cyberSys(key).foundation?.installed ? '' : t('живая · без лимита слотов'))
    : `${Math.max(0, free)}/${slotsMax(key)} ${t('сл.')}`;
  const pickMeta = (item, tags, extra=[]) => [item[1] && item[1] !== '—' ? term(item[1]) : '', ...displayOptionTags(tags), item[3], item[4] !== '0' ? `${t('ПЧ')} ${item[4]}` : '', ...extra.map(x=>termsIn(x))].filter(Boolean).join(' · ');
  const availHtml = available.map(({item, tags})=>`<button type="button" class="cyber-pick" data-cyber-act="pick" data-cyber-key="${key}" data-cyber-name="${esc(item[0])}" title="${esc([item[1] !== '—' ? `${t('Установка:')} ${term(item[1])}` : '', t(item[2])].filter(Boolean).join(' · '))}">
      <span class="cyber-pick-name">${esc(term(item[0]))}</span>
      <span class="cyber-pick-meta">${esc(pickMeta(item, tags))}</span>
    </button>`).join('') || `<p class="cyber-empty-note">${t('Сейчас ничего не доступно')}</p>`;
  const blockHtml = blocked.map(({item, reason, tags})=>`<div class="cyber-pick is-blocked" title="${esc(t(reason))}">
      <span class="cyber-pick-name">${esc(term(item[0]))}</span>
      <span class="cyber-pick-meta">${esc(pickMeta(item, tags, [t(reason)]))}</span>
    </div>`).join('');
  return `<div class="cyber-add">
    <div class="cyber-add-bar">
      <button type="button" class="cyber-add-open" data-cyber-act="picker" data-cyber-key="${key}">${t('+ модуль')}${available.length ? ` · ${available.length}` : ''}</button>
      ${freeLabel ? `<span class="cyber-add-free">${esc(freeLabel)}</span>` : ''}
    </div>
    <div class="cyber-picker" data-cyber-picker="${key}" hidden>
      <input type="search" data-cyber-filter="${key}" placeholder="${esc(t('Найти модуль…'))}" aria-label="${esc(t('Поиск модуля'))}">
      <div class="cyber-picker-avail" data-cyber-pick-list="${key}">${availHtml}</div>
      <button type="button" class="cyber-pick is-custom" data-cyber-act="pick-custom" data-cyber-key="${key}">${t('+ свой имплант')}</button>
      ${blocked.length ? `<details class="cyber-picker-blocked"><summary>${t('Пока нельзя')} (${blocked.length})</summary>${blockHtml}</details>` : ''}
    </div>
  </div>`;
}
function toggleFoundation(key){
  const conf = cyberSystems[key];
  const sys = cyberSys(key);
  if(!conf.foundation) return;
  if(sys.foundation?.installed){
    setPieceInstalled(sys.foundation, false, key);
    commitCyber();
    return;
  }
  if(!sys.foundation) sys.foundation = makeFromCatalog(conf.foundation);
  setPieceInstalled(sys.foundation, true, key);
  commitCyber();
}
function foundationOn(key){
  return Boolean(cyberSys(key).foundation?.installed);
}
function renderCyberDiagram(){
  const diagram = $('#cyberDiagram');
  if(!diagram) return;
  const setCyber = (names, on) => names.forEach(name=>{
    diagram.querySelectorAll(`[data-body="${name}"]`).forEach(el=>el.classList.toggle('is-cyber', on));
  });
  setCyber(['rightArm', 'rightHand'], foundationOn('rightArm'));
  setCyber(['leftArm', 'leftHand'], foundationOn('leftArm'));
  setCyber(['rightLeg', 'rightFoot'], foundationOn('rightLeg'));
  setCyber(['leftLeg', 'leftFoot'], foundationOn('leftLeg'));
  setCyber(['rightEye'], foundationOn('rightEye'));
  setCyber(['leftEye'], foundationOn('leftEye'));
  setCyber(['audioL', 'audioR'], foundationOn('audio'));
  setCyber(['neural', 'neuralPort'], foundationOn('neural'));
  const skin = cyberSpFloor() > 0;
  const fashion = (cyberSys('fashion').options || []).some(p=>p.installed);
  const internal = (cyberSys('internal').options || []).some(p=>p.installed);
  diagram.querySelectorAll('[data-body="torso"]').forEach(el=>{
    el.classList.toggle('is-cyber', skin || internal);
    el.classList.toggle('is-armor', skin);
  });
  diagram.querySelectorAll('[data-body="head"]').forEach(el=>{
    el.classList.toggle('is-cyber', fashion || foundationOn('rightEye') || foundationOn('leftEye') || foundationOn('audio'));
    el.classList.toggle('is-fashion', fashion);
  });
  const bits = [];
  if(foundationOn('rightArm') || foundationOn('leftArm')) bits.push(t('руки'));
  if(foundationOn('rightLeg') || foundationOn('leftLeg')) bits.push(t('ноги'));
  if(foundationOn('rightEye') || foundationOn('leftEye')) bits.push(t('глаза'));
  if(foundationOn('audio')) bits.push(t('слух'));
  if(foundationOn('neural')) bits.push(t('нейро'));
  if(skin) bits.push(`SP ${cyberSpFloor()}`);
  const legend = $('#cyberDiagramLegend');
  if(legend) legend.innerHTML = bits.length
    ? `<span class="cyber-legend-dot is-cyber"></span> ${t('Кибер:')} ${esc(bits.join(' · '))}`
    : `<span class="cyber-legend-dot"></span> ${t('Органика')}`;
}
function renderCyber(){
  state.cyber = normalizeCyber(state.cyber);
  // Подтянуть кибероружие, если имплант уже стоял, а строка в снаряжении пропала.
  const before = (state.weapon || []).length;
  syncCyberWeapons(true);
  if((state.weapon || []).length !== before){ renderRows('weapon'); renderRows('ammo'); bindInputs(); }
  Object.entries(cyberSystems).forEach(([key, conf])=>{
    const target = $(`[data-cyber-section="${key}"]`);
    if(!target) return;
    const sys = cyberSys(key);
    const canOptions = !conf.foundation || sys.foundation?.installed || conf.meat;
    const cards = sys.options.map(p=>cyberPieceCard(key, p, conf.bodySlots ? 'body' : 'option')).join('');
    const empty = !sys.options.length
      ? `<p class="cyber-empty-note">${canOptions ? t('Модулей пока нет') : t('Сначала включите базу в подписи сверху')}</p>`
      : '';
    target.innerHTML = `<section class="cyber-panel">
      ${cyberHead(key, conf, sys)}
      <div class="cyber-pieces">${cards}${empty}</div>
      ${canOptions || conf.bodySlots ? `<div class="cyber-panel-add">${cyberAddSelect(key)}</div>` : ''}
    </section>`;
  });
  renderCyberDiagram();
  const summary = cyberEffectSummary();
  const effects = $('#cyberEffects');
  if(effects) effects.textContent = summary.length ? `${t('Действует:')} ${summary.join(' · ')}` : t('Установленные импланты влияют на ТЕЛ, навыки, инициативу, броню и оружие.');
  autoGrowAll();
}

// Поля из Player.html не перерисовываются, поэтому при импорте/сбросе их значения выставляются явно.
function fillStaticInputs(){
  $$('[data-static]').forEach(el=>{
    const value = state[el.dataset.key];
    if(el.type === 'checkbox') el.checked = value === undefined ? el.defaultChecked : value === true || value === 'true';
    else el.value = value ?? el.defaultValue ?? '';
  });
}

function updateResource(key, max){
  if(isBlank(state[key])) state[key] = max;
  state[key] = Math.max(0, Math.min(numeric(key), max));
  $$(`[data-key="${key}"]`).forEach(el=>{ el.max = max; setVal(el, state[key]); });
}

function updateDerived(){
  const body=statValue(8), baseBody=numeric('stat8'), emp=numeric('stat9');
  // Cyberpunk RED: ХИТЫ = 10 + 5 × ⌈(ТЕЛ + ВОЛЯ) / 2⌉. ТЕЛ с учётом мышц/экзоскелета.
  const hp=maxHp();
  updateResource('currentHp', hp);
  $('#hpMaximum').textContent=hp;
  $('#deathSaveValue').textContent=`< ${body}`;
  $('#woundValue').textContent=Math.ceil(hp/2);
  // Перемещение: СКО × 2 м (стр. 168); смертельное −6 СКО, травмы ног/лёгких — свои штрафы, минимум 1 (стр. 186–187); + скейт-ноги.
  const moveMods = playerInjuryMods();
  const movePenalty = (isMortallyWounded() ? 6 : 0) + moveMods.move;
  const moveStat = (() => {
    const base = Math.max(0, numeric('stat7') - statPenalty(7));
    return movePenalty ? Math.max(Math.min(1, base), base - movePenalty) : base;
  })();
  const move = moveStat * 2 + cyberMoveBonus();
  $('#speedValue').textContent=`${move} м`;
  const spFloor = cyberSpFloor();
  ['Head','Body'].forEach(zone=>{
    const key = `armor${zone}`;
    const worn = numeric(key);
    if(spFloor && worn < spFloor){
      state[key] = spFloor;
      setInput(key, spFloor);
      if(numeric(`${key}Current`) < spFloor){ state[`${key}Current`] = spFloor; setInput(`${key}Current`, spFloor); }
    }
    updateResource(`${key}Current`, numeric(key));
  });
  updateResource('luckCurrent', numeric('stat6'));
  updateResource('humanityCurrent', emp * 10);
  const psycho = emp > 0 && numeric('humanityCurrent') <= 0;
  const bodyNote = body !== baseBody ? ` · ТЕЛ ${baseBody}→${body}` : '';
  $('#humanityMeta').textContent = `${t('ПОТЕРЯ')} ${humanityLoss()} · ${term('ЭМП')} ${currentEmp()}/${emp}${bodyNote}${spFloor ? ` · SP≥${spFloor}` : ''}${psycho ? ` · ${t('КИБЕРПСИХОЗ')}` : ''}`;
  $('#humanityMeta').classList.toggle('is-danger', psycho);
  // Штраф испытаний против смерти действует, пока персонаж смертельно ранен.
  if(!isMortallyWounded()) state.deathSavePenalty = 0;
  const deathPenalty = deathSaveTotalPenalty();
  const serious = isChecked('seriousWound');
  const injuryBits = [moveMods.all && `травмы −${moveMods.all}`, moveMods.ranged && `дальние −${moveMods.ranged}`, moveMods.melee && `ближние −${moveMods.melee}`, moveMods.move && `СКО −${moveMods.move}`, moveMods.headMult > 2 && `голова ×${moveMods.headMult}`, moveMods.noDodge && 'не уклоняется'].filter(Boolean);
  $('#woundStatus').textContent = [
    isMortallyWounded() ? `СМЕРТЕЛЬНОЕ РАНЕНИЕ: −4 КО ВСЕМ ДЕЙСТВИЯМ, −6 СКО${deathPenalty ? ` · ШТРАФ ИСПЫТАНИЙ +${deathPenalty}` : ''}`
      : serious && cyberIgnoresWound() ? 'ТЯЖЁЛОЕ РАНЕНИЕ: редактор боли — без штрафа −2'
      : serious ? 'ТЯЖЁЛОЕ РАНЕНИЕ: −2 КО ВСЕМ ДЕЙСТВИЯМ' : '',
    injuryBits.length ? `ТРАВМЫ: ${injuryBits.join(' · ')}` : ''
  ].filter(Boolean).join(' · ');
  const effects = $('#cyberEffects');
  if(effects){
    const summary = cyberEffectSummary();
    effects.textContent = summary.length ? `${t('Действует:')} ${summary.join(' · ')}` : t('Установленные импланты влияют на ТЕЛ, навыки, инициативу, броню и оружие.');
  }
  refreshSkills();
}

// Галочки ранений следуют за хитами: ниже порога — тяжёлое ранение, 0 — смертельное.
