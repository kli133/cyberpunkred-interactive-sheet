// Логика интерактивного листа Cyberpunk RED. Справочные таблицы — в data.js.
const skillEntries = Object.values(skillCategories).flat();
const skills = skillEntries.map(([name]) => name);
const penalizedStats = [1, 2, 7]; // РЕФ, ЛВК, СКО
const rowTypes = {gear:3, weapon:10, relationship:3};
// Порядок колонок в таблицах: j — индекс значения в сохранённой строке (новые колонки оружия добавлены в конец).
const rowColumns = {
  gear:[{j:0},{j:1},{j:2,note:true}],
  // weapon: 7 — множитель автоогня (скрытое поле, заполняется типом), 8 — тип, 9 — автоогонь включён.
  weapon:[{j:0},{j:8,select:'type'},{j:5,select:'skill'},{j:1,placeholder:'3d6'},{j:2},{j:6},{j:3},{j:9,toggle:true},{j:4,note:true}],
  relationship:[{j:0},{j:1},{j:2}]
};
const INDEX_KEY = 'cyberred-index';
const LEGACY_KEY = 'cyberred-sheet';
const SKILL_POOL = 86, STAT_POOL = 62, MAX_SKILL = 10;
// Поля строк таблиц и киберслотов хранятся только в структурированном виде (state.gear, state.cyberSlots...).
const structuredKey = /^(gear|weapon|relationship)\d+_\d+$|^cyberSlot_|^cskill\d+_/;
const clampedKey = /^(stat|skill)\d+$|^(currentHp|luckCurrent|humanityCurrent|armorHeadCurrent|armorBodyCurrent)$/;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const field = (key, value='', type='text', placeholder='') => `<input data-key="${key}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
const numeric = key => Number(state[key]) || 0;
const isBlank = value => value === undefined || value === null || String(value).trim() === '';
const d = sides => Math.floor(Math.random()*sides)+1;
const now = () => new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
const statAlias = name => statAliases[name] || name;
const skillStatIndex = i => stats.indexOf(statAlias(skillEntries[i][1]));
const skillWeight = i => skills[i].includes('(x2)') ? 2 : 1;
const armorPenalty = () => Math.abs(numeric('armorPenalty'));
const statPenalty = statIndex => penalizedStats.includes(statIndex) ? armorPenalty() : 0;
const isChecked = key => state[key] === true || state[key] === 'true';
// Ранения по правилам RED: тяжёлое — −2 ко всем действиям, смертельное (0 хитов) — −4 и −6 к СКО.
const isMortallyWounded = () => isChecked('deathSave') || (!isBlank(state.currentHp) && numeric('currentHp') <= 0);
const woundPenalty = () => isMortallyWounded() ? 4 : isChecked('seriousWound') ? 2 : 0;
// ЭМП падает вместе с человечностью: ЭМП = ⌊человечность / 10⌋, но не выше базового значения.
const currentEmp = () => isBlank(state.humanityCurrent) ? numeric('stat9') : Math.min(numeric('stat9'), Math.floor(numeric('humanityCurrent')/10));
const statValue = i => i === 9 ? currentEmp() : numeric(`stat${i}`);
const skillTotal = i => numeric(`skill${i}`) + statValue(skillStatIndex(i)) - statPenalty(skillStatIndex(i)) - woundPenalty();
// Навыки адресуются ссылкой: «b12» — навык из книги, «c3» — дополнительная специализация.
const customSkill = ref => state.customSkills?.[Number(ref.slice(1))];
const refBase = ref => ref[0] === 'b' ? Number(ref.slice(1)) : skills.indexOf(customSkill(ref)?.base);
const refLevel = ref => ref[0] === 'b' ? numeric(`skill${ref.slice(1)}`) : Number(customSkill(ref)?.level) || 0;
const refLabel = ref => ref[0] === 'b' ? skills[refBase(ref)] : `${customSkill(ref)?.base}: ${customSkill(ref)?.spec || '—'}`;
const refWeight = ref => skillWeight(refBase(ref));
const refMin = ref => state.creationMode !== false && ref[0] === 'b' && basicSkills.includes(skills[refBase(ref)]) ? 2 : 0;
const refTotal = ref => { const s = skillStatIndex(refBase(ref)); return refLevel(ref) + statValue(s) - statPenalty(s) - woundPenalty(); };
const allRefs = () => [...skills.map((_,i)=>`b${i}`), ...(state.customSkills || []).map((_,j)=>`c${j}`)];
const skillSpent = () => allRefs().reduce((sum,ref)=>sum + refLevel(ref)*refWeight(ref),0);
// Повышение навыка за очки улучшения: 20 × новый уровень, для (x2) — вдвое дороже.
const upgradeCost = ref => (refLevel(ref) + 1) * 20 * refWeight(ref);
const keyToRef = key => { const b = /^skill(\d+)$/.exec(key || ''); if(b) return `b${b[1]}`; const c = /^cskill(\d+)_level$/.exec(key || ''); return c ? `c${c[1]}` : null; };
function setRefLevel(ref, level){
  if(ref[0] === 'b') state[`skill${ref.slice(1)}`] = level;
  else customSkill(ref).level = level;
}
const maxHp = () => 10 + 5*Math.ceil((numeric('stat8') + numeric('stat5'))/2);
const textValue = el => el.isContentEditable ? el.textContent : el.value;
const setVal = (el, value) => { if(el !== document.activeElement) el.value = value; };
const setInput = (key, value) => $$(`[data-key="${key}"]`).forEach(el=>{ el.value = value; });
const isSafeImage = src => /^data:image\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(String(src || ''));
const formulaHtml = (key, value) => {
  const formulas = state.formulaMarks?.[key] || [];
  let html = esc(value);
  formulas.forEach(formula => {
    const safe = esc(formula);
    html = html.replace(safe, `<span class="formula-marked" data-formula="${safe}">${safe}</span>`);
  });
  return html;
};

function migrate(data){
  const s = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  if(s.creationMode === undefined) s.creationMode = true;
  // Раньше человечность хранилась в двух независимых полях.
  if(s.humanityCurrent === undefined && s.humanityValue !== undefined) s.humanityCurrent = s.humanityValue;
  delete s.humanityValue;
  Object.keys(s).forEach(key => { if(structuredKey.test(key)) delete s[key]; });
  if(s.portrait && !isSafeImage(s.portrait)) delete s.portrait;
  delete s.targetDv;
  Object.entries(rowTypes).forEach(([type,width])=>{
    if(!Array.isArray(s[type])) { delete s[type]; return; }
    s[type] = s[type].map(row=>Array.from({length:width},(_,j)=>String(row?.[j] ?? '')));
  });
  s.customSkills = (Array.isArray(s.customSkills) ? s.customSkills : [])
    .filter(item=>variantSkills.includes(item?.base))
    .map(item=>({base:item.base, spec:String(item.spec ?? ''), level:Number(item.level) || 0}));
  if(s.cyberSlots && typeof s.cyberSlots === 'object'){
    Object.keys(s.cyberSlots).forEach(key=>{ s.cyberSlots[key] = (Array.isArray(s.cyberSlots[key]) ? s.cyberSlots[key] : []).map(row=>[0,1,2].map(j=>String(row?.[j] ?? ''))); });
  }
  // Сколько человечности уже списано за каждый слот — чтобы при правке списывать только разницу.
  if(!s.cyberHlApplied || typeof s.cyberHlApplied !== 'object'){
    s.cyberHlApplied = {};
    Object.entries(s.cyberSlots || {}).forEach(([key,rows])=>rows.forEach((row,i)=>{ if(/^\d+$/.test(row[2])) s.cyberHlApplied[`${key}_${i}`] = Number(row[2]); }));
  }
  return s;
}

// Несколько персонажей: список в cyberred-index, каждый лист — под своим ключом.
// Первый лист хранится под старым ключом, поэтому прежние сохранения подхватываются сами.
const sheetKey = id => id === 'main' ? LEGACY_KEY : `${LEGACY_KEY}:${id}`;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
function readJson(key, fallback){
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function loadIndex(){
  const index = readJson(INDEX_KEY, null);
  if(index && Array.isArray(index.sheets) && index.sheets.length){
    if(!index.sheets.some(sheet=>sheet.id === index.current)) index.current = index.sheets[0].id;
    return index;
  }
  return {current:'main', sheets:[{id:'main', name:readJson(LEGACY_KEY, {})?.name || ''}]};
}
let sheetIndex = loadIndex();
const loadState = (id = sheetIndex.current) => migrate(readJson(sheetKey(id), {}));
let state = loadState();

function persist(){
  try {
    localStorage.setItem(sheetKey(sheetIndex.current), JSON.stringify(state));
    const entry = sheetIndex.sheets.find(sheet=>sheet.id === sheetIndex.current);
    if(entry) entry.name = state.name || '';
    localStorage.setItem(INDEX_KEY, JSON.stringify(sheetIndex));
    return true;
  } catch {
    $('#saveStatus').textContent = 'ОШИБКА СОХРАНЕНИЯ: НЕТ МЕСТА';
    return false;
  }
}

function renderSheetSelect(){
  $('#sheetSelect').innerHTML = sheetIndex.sheets.map(sheet=>`<option value="${esc(sheet.id)}"${sheet.id === sheetIndex.current ? ' selected' : ''}>${esc((sheet.name || 'Без имени').toUpperCase())}</option>`).join('');
}
function clearTransient(){
  $('#diceLog').innerHTML = '';
  $('#diceResult').textContent = '—';
  $('#damageResult').textContent = '';
}
function openSheet(id, data){
  sheetIndex.current = id;
  state = data ?? loadState(id);
  clearTransient();
  render();
  persist();
}
function switchSheet(id){
  if(id === sheetIndex.current) return;
  persist();
  openSheet(id);
}
function createSheet(data = {}){
  persist();
  const id = newId();
  sheetIndex.sheets.push({id, name:data.name || ''});
  openSheet(id, migrate(data));
}
function deleteSheet(){
  const position = sheetIndex.sheets.findIndex(sheet=>sheet.id === sheetIndex.current);
  const removed = {id:sheetIndex.current, data:state};
  if(!confirm(`Удалить персонажа «${state.name || 'Без имени'}»?`)) return;
  localStorage.removeItem(sheetKey(removed.id));
  sheetIndex.sheets.splice(position, 1);
  if(sheetIndex.sheets.length) openSheet(sheetIndex.sheets[Math.max(0, position - 1)].id);
  else { const id = newId(); sheetIndex.sheets.push({id, name:''}); openSheet(id, migrate({})); }
  toast('Персонаж удалён', 'Вернуть', ()=>{
    persist();
    sheetIndex.sheets.splice(position, 0, {id:removed.id, name:removed.data.name || ''});
    openSheet(removed.id, removed.data);
  });
}

function normalizeStats(){
  if(state.creationMode === false) return stats.reduce((total,_,i)=>total + numeric(`stat${i}`),0);
  let total = 0;
  stats.forEach((_, i) => {
    const key = `stat${i}`;
    const value = Math.max(2, Math.min(8, Number(state[key]) || 2));
    state[key] = value;
    total += value;
  });
  return total;
}

function normalizeSkills(changedKey){
  const maxLevel = state.creationMode === false ? MAX_SKILL : 6;
  allRefs().forEach(ref=>setRefLevel(ref, Math.max(refMin(ref), Math.min(maxLevel, refLevel(ref)))));
  if(state.creationMode === false) return;
  let excess = skillSpent() - SKILL_POOL;
  // Срезаем в первую очередь навык, который только что меняли, затем — с конца списка.
  const changed = keyToRef(changedKey);
  for(const ref of changed ? [changed, ...allRefs().reverse()] : allRefs().reverse()){
    while(excess > 0 && refLevel(ref) > refMin(ref)){ setRefLevel(ref, refLevel(ref) - 1); excess -= refWeight(ref); }
    if(excess <= 0) break;
  }
}

function renderStats(){
  const oldBudget = $('.point-budget');
  if(oldBudget) oldBudget.remove();
  const total = normalizeStats();
  $('#statsGrid').innerHTML = stats.map((name,i) => {
    const statValue = `<input class="stat-value" data-key="stat${i}" type="number" min="${state.creationMode === false ? 0 : 2}" max="${state.creationMode === false ? 99 : 8}" step="1" value="${esc(state[`stat${i}`] || 0)}" aria-label="${name}">`;
    if(i === 6 || i === 9){
      const key = i === 6 ? 'luckCurrent' : 'humanityCurrent';
      const max = i === 6 ? numeric('stat6') : numeric('stat9') * 10;
      const current = `<input class="resource-value" data-key="${key}" type="number" min="0" max="${max}" value="${esc(state[key] ?? max)}" aria-label="Текущее ${name}">`;
      return `<div class="stat-row has-resource"><span>${name}</span><div class="resource-pair">${current}<span class="resource-separator">из</span>${statValue}</div></div>`;
    }
    return `<div class="stat-row"><span>${name}</span>${statValue}</div>`;
  }).join('');
  if(state.creationMode !== false){
    $('#statsGrid').insertAdjacentHTML('beforebegin', `<div class="point-budget">ПУЛ СОЗДАНИЯ: <strong>${total}</strong> / ${STAT_POOL} <small>Минимум 2, максимум 8.</small></div>`);
  }
}

function refreshStats(){
  $$('[data-key^="stat"]').forEach(el=>setVal(el, state[el.dataset.key] ?? 0));
  const budget = $('.point-budget strong');
  if(budget) budget.textContent = stats.reduce((sum,_,i)=>sum+numeric(`stat${i}`),0);
}

function refreshSkills(){
  const creation = state.creationMode !== false;
  $('#skillBudget').textContent = Math.max(0, SKILL_POOL - skillSpent());
  $('#ipInfo').textContent = numeric('ip');
  $$('[data-key^="skill"]').forEach(el=>setVal(el, state[el.dataset.key] ?? 0));
  $$('[data-key^="cskill"][data-key$="_level"]').forEach(el=>setVal(el, refLevel(keyToRef(el.dataset.key))));
  $$('[data-skill-total]').forEach(cell=>{
    const ref = cell.dataset.skillTotal;
    const s = skillStatIndex(refBase(ref));
    const armor = statPenalty(s), wound = woundPenalty();
    const empNote = s === 9 && currentEmp() < numeric('stat9') && `ЭМП снижена человечностью до ${currentEmp()}`;
    cell.textContent = refTotal(ref);
    cell.title = [armor && `Штраф брони −${armor}`, wound && `Штраф ранения −${wound}`, empNote].filter(Boolean).join(', ');
    cell.classList.toggle('is-penalized', armor + wound > 0 || Boolean(empNote));
  });
  $$('[data-upgrade]').forEach(button=>{
    const ref = button.dataset.upgrade;
    const cost = upgradeCost(ref);
    button.hidden = creation || refLevel(ref) >= MAX_SKILL;
    button.textContent = `↑${cost}`;
    button.disabled = numeric('ip') < cost;
    button.title = `Повысить до ${refLevel(ref) + 1} за ${cost} IP`;
  });
}

function skillRowHtml(ref, maxLevel){
  const base = refBase(ref);
  const custom = ref[0] === 'c';
  const j = ref.slice(1);
  const name = skills[base];
  const rollButton = `<button class="skill-roll" data-roll-skill="${ref}" title="Бросить 1d10 + стат + навык">1d10</button>`;
  // Специализация — в контейнере с переносом, чтобы на узком экране поле и кнопка не наезжали на колонку «Стат».
  const title = custom
    ? `<div class="skill-name"><span class="skill-variant">${esc(name)}:</span><input class="skill-spec" data-key="cskill${j}_spec" value="${esc(customSkill(ref).spec)}" placeholder="специализация" aria-label="Специализация">${rollButton}</div>`
    : `${esc(name)}${basicSkills.includes(name) ? '<span class="basic-mark" title="Базовый навык: при создании не ниже 2">Б</span>' : ''}${rollButton}`;
  const actions = [
    `<button type="button" class="skill-upgrade" data-upgrade="${ref}" hidden></button>`,
    !custom && variantSkills.includes(name) ? `<button type="button" class="skill-add-variant" data-add-variant="${esc(name)}" title="Добавить специализацию">+</button>` : '',
    custom ? `<button type="button" class="remove" data-remove-skill="${j}" title="Удалить специализацию">×</button>` : ''
  ].join('');
  return `<tr class="${custom ? 'is-variant' : ''}"><td>${title}</td><td>${esc(skillEntries[base][1])}</td><td><input data-key="${custom ? `cskill${j}_level` : `skill${base}`}" type="number" min="${refMin(ref)}" max="${maxLevel}" value="${refLevel(ref)}" aria-label="Уровень навыка"></td><td class="skill-total" data-skill-total="${ref}">${refTotal(ref)}</td><td class="skill-actions">${actions}</td></tr>`;
}

function renderSkills(){
  const creation = state.creationMode !== false;
  $('#skillBudget').closest('strong').classList.toggle('is-hidden', !creation);
  $('#ipInfo').closest('strong').classList.toggle('is-hidden', creation);
  $('.rules-note').classList.toggle('is-hidden', !creation);
  const query = ($('#skillSearch')?.value || '').trim().toLocaleLowerCase('ru');
  const activeCategory = $('.skill-filter.active')?.dataset.category || 'Все';
  const maxLevel = creation ? 6 : MAX_SKILL;
  const matches = text => !query || text.toLocaleLowerCase('ru').includes(query);
  $('#skillsCategories').innerHTML = Object.entries(skillCategories).map(([category, entries]) => {
    if(activeCategory !== 'Все' && activeCategory !== category) return '';
    const rows = entries.flatMap(([name, stat]) => {
      const baseVisible = matches(`${name} ${stat}`);
      const variants = (state.customSkills || []).map((item,j)=>item.base === name ? `c${j}` : null).filter(Boolean)
        .filter(ref=>baseVisible || matches(`${refLabel(ref)} ${stat}`));
      return baseVisible || variants.length ? [skillRowHtml(`b${skills.indexOf(name)}`, maxLevel), ...variants.map(ref=>skillRowHtml(ref, maxLevel))] : [];
    });
    if(!rows.length) return '';
    return `<article class="skill-category"><h2>${category}</h2><table class="skill-table"><thead><tr><th>Название</th><th>Стат</th><th>Урв</th><th>Сумм</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></article>`;
  }).join('') || '<div class="empty-search">НАВЫКИ НЕ НАЙДЕНЫ</div>';
  renderSkillFilters();
  refreshSkills();
}

function renderSkillFilters(){
  const active = $('.skill-filter.active')?.dataset.category || 'Все';
  $('#skillFilters').innerHTML = ['Все', ...Object.keys(skillCategories)].map(category =>
    `<button class="skill-filter ${category === active ? 'active' : ''}" data-category="${category}">${category}</button>`
  ).join('');
}

function renderLife(){
  $('#lifeBasics').innerHTML = `<div class="section-title">ПОВСЕДНЕВНАЯ ЖИЗНЬ <span>LIFESTYLE</span></div><div class="life-basics-fields">
    <label>Образ жизни${field('lifeStyle',state.lifeStyle||'', 'text', 'Например: Бродяга, Средний, Богатый')}</label>
    <label>Арендная плата${field('lifeRent',state.lifeRent||'', 'text', 'Ежемесячная плата')}</label>
    <label>Жильё${field('lifeHousing',state.lifeHousing||'', 'text', 'Тип и описание жилья')}</label>
    <label>Образ и стиль${field('lifeLook',state.lifeLook||'', 'text', 'Внешний вид и стиль')}</label>
  </div>`;
  const alias = `<label class="full">Псевдоним${field('lifeAlias',state.lifeAlias||'')}</label>`;
  $('#lifeFields').innerHTML = alias + lifeFields.map((name,i)=>`<label class="${i===0?'full':''}">${name}${field(`life${i}`,state[`life${i}`]||'')}</label>`).join('');
}
function weaponSkillSelect(key, value){
  const options = list => list.map(name=>`<option value="${esc(name)}"${name === value ? ' selected' : ''}>${esc(name)}</option>`).join('');
  return `<select data-key="${key}" aria-label="Навык оружия"><option value="">—</option><optgroup label="Дальний бой">${options(rangedWeaponSkills)}</optgroup><optgroup label="Ближний бой">${options(meleeWeaponSkills)}</optgroup></select>`;
}
function weaponTypeSelect(key, value, multiplierKey, multiplier){
  const options = Object.entries(weaponTypes).map(([id,[name]])=>`<option value="${id}"${id === value ? ' selected' : ''}>${esc(name)}</option>`).join('');
  return `<select data-key="${key}" aria-label="Тип оружия" title="Выбор типа заполняет навык, урон, магазин, ROF и автоогонь"><option value="">Своё</option>${options}</select><input type="hidden" data-key="${multiplierKey}" value="${esc(multiplier)}">`;
}
// Автоогонь доступен, если у оружия есть множитель (из типа оружия).
const autofireMultiplier = data => Number(data?.[7]) || 0;
const isAutofireOn = data => autofireMultiplier(data) > 0 && data?.[9] === '1';
function row(type,data=[],index){
  const cells = rowColumns[type].map(({j,note,select,toggle,placeholder})=>{
    const key = `${type}${index}_${j}`;
    if(note) return `<td><div class="formula-editor" data-key="${key}" contenteditable="true">${formulaHtml(key,data[j]||'')}</div></td>`;
    if(select === 'skill') return `<td>${weaponSkillSelect(key, data[j] || '')}</td>`;
    if(select === 'type') return `<td>${weaponTypeSelect(key, data[j] || '', `${type}${index}_7`, data[7] || '')}</td>`;
    if(toggle) return `<td class="auto-cell"><input type="checkbox" data-key="${key}" aria-label="Автоматический огонь"${isAutofireOn(data) ? ' checked' : ''}${autofireMultiplier(data) ? '' : ' disabled'}></td>`;
    return `<td>${field(key, data[j] || '', 'text', placeholder || '')}</td>`;
  }).join('');
  const weaponActions = type === 'weapon'
    ? `<button type="button" class="weapon-btn" data-weapon-attack="${index}">АТК</button><button type="button" class="weapon-btn" data-weapon-damage="${index}">УРН</button><button type="button" class="weapon-btn" data-weapon-reload="${index}" title="Перезарядить: патроны = магазин">↻</button>`
    : '';
  return `<tr>${cells}<td class="row-actions">${weaponActions}<button type="button" class="remove" data-remove="${type}" data-index="${index}" title="Удалить строку">×</button></td></tr>`;
}
function renderRows(type){
  const rows = state[type]?.length ? state[type] : [[]];
  $(`#${type}Rows`).innerHTML = rows.map((data,i)=>row(type,data,i)).join('');
  if(type === 'weapon') refreshWeaponRows();
}
// Галочка «Авто» доступна только оружию с автоогнём; при включённой кнопка атаки — «ОЧЕРЕДЬ».
function refreshWeaponRows(){
  $$('#weaponRows tr').forEach((tr,i)=>{
    const data = state.weapon?.[i];
    const toggle = tr.querySelector('[data-key$="_9"]');
    const multiplier = autofireMultiplier(data);
    const on = isAutofireOn(data);
    if(toggle){
      toggle.disabled = !multiplier;
      toggle.checked = on;
      toggle.title = multiplier ? `Автоматический огонь (множитель до ×${multiplier})` : 'Этот тип оружия не стреляет очередями';
    }
    tr.classList.toggle('is-autofire', on);
    const attack = tr.querySelector('[data-weapon-attack]');
    const damage = tr.querySelector('[data-weapon-damage]');
    if(attack){
      attack.textContent = on ? 'ОЧЕРЕДЬ' : 'АТК';
      attack.title = on ? 'Очередь: 10 патронов, 1d10 + РЕФ + «Автоматический огонь»' : 'Атака: 1d10 + стат + навык';
    }
    if(damage) damage.title = on ? 'Урон очереди: 2d6 × множитель (таблица для мастера)' : 'Бросок урона';
  });
}
function renderCyber(){
  const saved = state.cyberSlots || {};
  if(!state.cyberSlots && Array.isArray(state.cyberware) && state.cyberware.length) saved.cranial = state.cyberware;
  Object.entries(cyberSections).forEach(([key,[title,count]]) => {
    const target = $(`[data-cyber-section="${key}"]`);
    const rows = saved[key] || [];
    target.innerHTML = `<table class="cyber-slot-table"><thead><tr><th>${title}</th><th>Информация</th><th title="Потеря человечности: число или формула (2d6)">ПЧ</th></tr></thead><tbody>${Array.from({length:count},(_,i)=>`<tr><td>${field(`cyberSlot_${key}_${i}_name`,rows[i]?.[0]||'')}</td><td>${field(`cyberSlot_${key}_${i}_info`,rows[i]?.[1]||'')}</td><td class="hl-cell">${field(`cyberSlot_${key}_${i}_hl`,rows[i]?.[2]||'')}</td></tr>`).join('')}</tbody></table>`;
  });
}

// Поля из index.html не перерисовываются, поэтому при импорте/сбросе их значения выставляются явно.
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

const humanityLoss = () => Object.values(state.cyberHlApplied || {}).reduce((sum,value)=>sum + (Number(value) || 0),0);

// Потеря человечности от импланта: списывается разница с тем, что уже списано за этот слот.
function applyHumanityLoss(key, value){
  const match = /^cyberSlot_(\w+?)_(\d+)_hl$/.exec(key);
  if(!match || !/^\d*$/.test(String(value).trim())) return;
  const slot = `${match[1]}_${match[2]}`;
  const applied = state.cyberHlApplied || (state.cyberHlApplied = {});
  const next = Number(value) || 0;
  const delta = next - (Number(applied[slot]) || 0);
  if(!delta) return;
  if(next) applied[slot] = next; else delete applied[slot];
  const current = isBlank(state.humanityCurrent) ? numeric('stat9') * 10 : numeric('humanityCurrent');
  state.humanityCurrent = Math.max(0, current - delta);
  setInput('humanityCurrent', state.humanityCurrent);
}

function updateDerived(){
  const body=numeric('stat8'), emp=numeric('stat9');
  // Cyberpunk RED: ХИТЫ = 10 + 5 × ⌈(ТЕЛ + ВОЛ) / 2⌉.
  const hp=maxHp();
  updateResource('currentHp', hp);
  $('#hpMaximum').textContent=hp;
  $('#deathSaveValue').textContent=`< ${body}`;
  $('#woundValue').textContent=Math.ceil(hp/2);
  $('#speedValue').textContent=Math.max(0, numeric('stat7') - statPenalty(7) - (isMortallyWounded() ? 6 : 0));
  updateResource('armorHeadCurrent', numeric('armorHead'));
  updateResource('armorBodyCurrent', numeric('armorBody'));
  updateResource('luckCurrent', numeric('stat6'));
  updateResource('humanityCurrent', emp * 10);
  const psycho = emp > 0 && numeric('humanityCurrent') <= 0;
  $('#humanityMeta').textContent = `ПОТЕРЯ ${humanityLoss()} · ЭМП ${currentEmp()}/${emp}${psycho ? ' · КИБЕРПСИХОЗ' : ''}`;
  $('#humanityMeta').classList.toggle('is-danger', psycho);
  // Штраф испытаний против смерти действует, пока персонаж смертельно ранен.
  if(!isMortallyWounded()) state.deathSavePenalty = 0;
  const deathPenalty = numeric('deathSavePenalty');
  $('#woundStatus').textContent = isMortallyWounded()
    ? `СМЕРТЕЛЬНОЕ РАНЕНИЕ: −4 КО ВСЕМ ДЕЙСТВИЯМ, −6 СКО${deathPenalty ? ` · ШТРАФ ИСПЫТАНИЙ +${deathPenalty}` : ''}`
    : isChecked('seriousWound') ? 'ТЯЖЁЛОЕ РАНЕНИЕ: −2 КО ВСЕМ ДЕЙСТВИЯМ' : '';
  refreshSkills();
}

// Галочки ранений следуют за хитами: ниже порога — тяжёлое ранение, 0 — смертельное.
function syncWoundsWithHp(){
  if(isBlank(state.currentHp)) return;
  const hp = numeric('currentHp');
  state.seriousWound = hp < Math.ceil(maxHp() / 2);
  state.deathSave = hp <= 0;
  $$('[data-key="seriousWound"]').forEach(el=>{ el.checked = state.seriousWound; });
  $$('[data-key="deathSave"]').forEach(el=>{ el.checked = state.deathSave; });
}

function normalizeDicePool(pool){
  const normalized=[];
  let totalCount=0;
  (Array.isArray(pool) ? pool : []).forEach(item=>{
    const sides=Math.max(1,Math.min(1000,Number(item?.sides)||10));
    const count=Math.max(1,Math.min(100,Number(item?.count)||1));
    const allowed=Math.min(count,100-totalCount);
    if(allowed>0){normalized.push({sides,count:allowed});totalCount+=allowed;}
  });
  return normalized.length ? normalized : [{sides:10,count:1}];
}

function rollDie(sides){
  const first=Math.floor(Math.random()*sides)+1;
  if(state.rollMode !== 'advantage' && state.rollMode !== 'disadvantage') return first;
  const second=Math.floor(Math.random()*sides)+1;
  return state.rollMode === 'advantage' ? Math.max(first,second) : Math.min(first,second);
}

function rollModeLabel(){
  return state.rollMode === 'advantage' ? 'ПРЕИМУЩЕСТВО' : state.rollMode === 'disadvantage' ? 'ПОМЕХА' : '';
}

const signed = value => value >= 0 ? String(value) : '−'+Math.abs(value);
const diceText = item => item.diceDetails ? item.diceDetails.map(die=>`D${Number(die.sides)}: ${Number(die.value)}`).join(' + ') : (Array.isArray(item.dice) ? item.dice.map(Number).join(' + ') : Number(item.die));
const critText = item => item.critical ? ` <em>${Number(item.die) === 10 ? 'КРИТИЧЕСКИЙ УСПЕХ' : 'КРИТИЧЕСКАЯ НЕУДАЧА'}${item.critExtra ? ` (${item.die === 10 ? '+' : '−'}${Number(item.critExtra)})` : ''}</em>` : '';
const logLine = item => item.kind === 'damage'
  ? `<b class="log-tag">УРОН</b> ${esc(item.text)}`
  : `${esc(item.label)}${item.mode ? ` [${esc(item.mode)}]` : ''}: <b>${diceText(item)}</b>${Number(item.modifier) ? ` + ${signed(Number(item.modifier))}` : ''} = <strong>${signed(Number(item.total))}</strong>${critText(item)}${item.note ? ` <em>${esc(item.note)}</em>` : ''}`;

function addHistory(entry){
  state.rollHistory = [{...entry, time:now()}, ...(state.rollHistory || [])].slice(0, 30);
  renderDashboardLog();
}

// crits: по правилам RED 10 на 1d10 добавляет ещё 1d10, 1 — вычитает ещё 1d10.
function rollDicePool(pool, modifier, label='Свободный бросок', {crits=true, judge}={}){
  const dicePool=normalizeDicePool(pool);
  const diceDetails=dicePool.flatMap(({sides,count})=>Array.from({length:count},()=>({sides,value:rollDie(sides)})));
  const die = diceDetails.reduce((sum,item)=>sum+item.value,0);
  const critical = crits && diceDetails.length === 1 && diceDetails[0].sides === 10 && (die === 1 || die === 10);
  const critExtra = critical ? d(10) : 0;
  const total = die + modifier + (die === 10 ? critExtra : -critExtra);
  const entry = {label, die, diceDetails, modifier, total, critical, critExtra, mode:rollModeLabel()};
  if(judge) entry.note = judge(entry) || '';
  addHistory(entry);
  persist();
  $('#diceResult').innerHTML = `<div class="formula-roll-values">${diceDetails.map((item,index)=>`<span class="formula-die" aria-label="D${item.sides}, кубик ${index + 1}">${item.value}<small>D${item.sides}</small></span>`).join('')}</div><strong class="formula-roll-total">СУММА: ${signed(total)}</strong>${critText(entry)}${entry.note ? ` <em>${esc(entry.note)}</em>` : ''}`;
  $('#diceLog').insertAdjacentHTML('afterbegin', `<div>${logLine(entry)}</div>`);
  $('#diceDrawer').classList.add('open');
  return entry;
}

function parseFormula(value){
  const match = String(value).trim().match(/^(\d+)\s*[dд]\s*(\d+)$/i);
  if(!match) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  return count > 0 && count <= 100 && sides > 0 && sides <= 1000 ? {count,sides} : null;
}

function rollFormula(formula){
  if(!formula) return;
  rollDicePool([formula], 0, `${formula.count}d${formula.sides}`, {crits:false});
}

// Удача: заявленные очки добавляются к броску и списываются с текущей УДЧ.
function spendLuck(){
  const input = $('#luckSpend');
  const spend = Math.max(0, Math.min(Math.floor(Number(input.value) || 0), numeric('luckCurrent')));
  input.value = 0;
  if(!spend) return 0;
  state.luckCurrent = numeric('luckCurrent') - spend;
  setInput('luckCurrent', state.luckCurrent);
  return spend;
}
const withNotes = (label, notes) => notes.filter(Boolean).length ? `${label} (${notes.filter(Boolean).join(', ')})` : label;

// Проверка навыка: 1d10 + стат + навык с учётом штрафов брони и ранений (+ потраченная удача).
function rollCheck(ref, label = refLabel(ref), judge){
  const wound = woundPenalty();
  const luck = spendLuck();
  const modifier = refTotal(ref) + luck;
  state.dicePool=[{sides:10,count:1}];
  renderDicePool();
  $('#diceModifier').value=modifier;
  return rollDicePool([{sides:10,count:1}], modifier, withNotes(label, [wound && `ранение −${wound}`, luck && `удача +${luck}`]), {judge});
}
const rollSkill = ref => rollCheck(typeof ref === 'number' ? `b${ref}` : String(ref));

// Инициатива: 1d10 + РЕФ (со штрафом брони).
function rollInitiative(){
  const luck = spendLuck();
  const armor = statPenalty(1);
  rollDicePool([{sides:10,count:1}], statValue(1) - armor + luck, withNotes('Инициатива', [armor && `броня −${armor}`, luck && `удача +${luck}`]), {crits:false});
}

function upgradeSkill(ref){
  const cost = upgradeCost(ref);
  if(refLevel(ref) >= MAX_SKILL || numeric('ip') < cost) return;
  state.ip = numeric('ip') - cost;
  setRefLevel(ref, refLevel(ref) + 1);
  setInput('ip', state.ip);
  refreshSkills();
  if(persist()) $('#saveStatus').textContent='СОХРАНЕНО '+now();
  toast(`${refLabel(ref)}: уровень ${refLevel(ref)} за ${cost} IP`);
}

function addVariant(base){
  (state.customSkills ||= []).push({base, spec:'', level:0});
  renderSkills(); bindInputs(); persist();
  $(`[data-key="cskill${state.customSkills.length - 1}_spec"]`)?.focus();
}
function removeVariant(index){
  const [removed] = state.customSkills.splice(index, 1);
  renderSkills(); bindInputs(); save();
  toast('Специализация удалена', 'Вернуть', ()=>{
    state.customSkills.splice(index, 0, removed);
    renderSkills(); bindInputs(); save();
  });
}

// Урон оружия: «3d6», «2d6+2», «4к6».
function parseDamage(value){
  const match = String(value).trim().match(/^(\d+)\s*[dдк]\s*(\d+)(?:\s*([+\-−])\s*(\d+))?$/i);
  if(!match) return null;
  const formula = parseFormula(`${match[1]}d${match[2]}`);
  return formula && {...formula, bonus: match[3] ? (match[3] === '+' ? 1 : -1) * Number(match[4]) : 0};
}
function weaponRow(index){
  if(!state.weapon?.[index]) save();
  return state.weapon?.[index];
}
const isCriticalDamage = entry => entry.diceDetails.filter(die=>die.sides === 6 && die.value === 6).length >= 2;
// Патроны списываются, только если в колонке «Патр.» указано число.
function spendAmmo(index, data, need){
  if(isBlank(data[2])) return true;
  const ammo = Number(data[2]) || 0;
  if(ammo < need){ toast(`${data[0] || 'Оружие'}: патронов ${ammo}, нужно ${need}. Перезарядите.`); return false; }
  data[2] = String(ammo - need);
  setInput(`weapon${index}_2`, data[2]);
  return true;
}
const damageTable = (entry, multiplier) => [
  Array.from({length:multiplier},(_,i)=>`×${i + 1} = ${entry.total * (i + 1)}`).join(' · '),
  `множитель = на сколько атака превысила DV, макс. ×${multiplier}`,
  isCriticalDamage(entry) && `КРИТИЧЕСКАЯ ТРАВМА у цели: +${CRITICAL_BONUS_DAMAGE} урона`
].filter(Boolean).join('. ');
// Атака: одиночный выстрел или удар — 1d10 + стат + навык оружия, дальний бой тратит 1 патрон.
// С включённым «Авто» — очередь: 10 патронов, 1d10 + РЕФ + «Автоматический огонь».
// Попала ли атака, решает мастер: сравнивает результат с DV или броском уклонения цели.
function weaponAttack(index){
  const data = weaponRow(index);
  if(!data) return;
  const name = data[0] || 'Оружие';
  if(isAutofireOn(data)){
    if(!spendAmmo(index, data, AUTOFIRE_AMMO)) return;
    rollCheck(`b${skills.indexOf(AUTOFIRE_SKILL)}`, `${name}: очередь`);
    return;
  }
  const skill = skills.indexOf(data[5]);
  if(skill < 0){ toast(`${name}: выберите тип или навык оружия`); return; }
  if(rangedWeaponSkills.includes(data[5]) && !spendAmmo(index, data, data[5] === AUTOFIRE_SKILL ? AUTOFIRE_AMMO : 1)) return;
  rollCheck(`b${skill}`, `${name}: атака`);
}
// Урон: формула оружия. Для очереди — 2d6 и таблица множителей: DV знает мастер,
// он берёт множитель = на сколько атака превысила DV (не больше множителя оружия).
// Две и больше шестёрок на кубиках урона — критическая травма у цели.
function weaponDamage(index){
  const data = weaponRow(index);
  if(!data) return;
  const name = data[0] || 'Оружие';
  if(isAutofireOn(data)){
    rollDicePool([AUTOFIRE_DAMAGE], 0, `${name}: урон очереди`, {crits:false, judge: entry => damageTable(entry, autofireMultiplier(data))});
    return;
  }
  const damage = parseDamage(data[1]);
  if(!damage){ toast(`${name}: укажите урон в виде 3d6 или 2d6+2`); return; }
  rollDicePool([{sides:damage.sides,count:damage.count}], damage.bonus, `${name}: урон`, {crits:false,
    judge: entry => isCriticalDamage(entry) ? `КРИТИЧЕСКАЯ ТРАВМА у цели: +${CRITICAL_BONUS_DAMAGE} урона` : ''});
}
function weaponReload(index){
  const data = weaponRow(index);
  if(!data) return;
  const name = data[0] || 'Оружие';
  if(isBlank(data[6])){ toast(`${name}: укажите размер магазина`); return; }
  data[2] = data[6];
  setInput(`weapon${index}_2`, data[2]);
  if(persist()) $('#saveStatus').textContent='СОХРАНЕНО '+now();
  toast(`${name}: перезаряжено (${data[6]})`);
}

let toastTimer;
// Короткое сообщение внизу экрана; с action — кнопка действия (например «Вернуть»).
function toast(message, actionLabel, action){
  const el = $('#toast');
  el.innerHTML = `<span>${esc(message)}</span>${actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  if(action) el.querySelector('button').onclick = () => { el.hidden = true; clearTimeout(toastTimer); action(); };
  toastTimer = setTimeout(()=>{ el.hidden = true; }, action ? 8000 : 4000);
}

// Испытание против смерти: 1d10 + штраф должен быть меньше ТЕЛ, десятка — всегда провал.
// Каждое испытание увеличивает штраф на 1, пока персонаж смертельно ранен.
function rollDeathSave(){
  const body = numeric('stat8'), penalty = numeric('deathSavePenalty');
  rollDicePool([{sides:10,count:1}], penalty, 'Испытание против смерти', {crits:false,
    judge: entry => `${entry.die !== 10 && entry.total < body ? 'УСПЕХ' : 'ПРОВАЛ'} (нужно < ${body}${penalty ? `, штраф +${penalty}` : ''})`});
  state.deathSavePenalty = penalty + 1;
  updateDerived();
  persist();
}

function renderDicePool(){
  const pool=normalizeDicePool(state.dicePool || [{sides:10,count:1}]);
  $('#dicePool').innerHTML=pool.map((item,index)=>`<div class="dice-pool-row" data-dice-index="${index}">
    <label>ГРАНИ<select class="dice-sides"><option value="10"${item.sides===10?' selected':''}>D10</option><option value="6"${item.sides===6?' selected':''}>D6</option><option value="100"${item.sides===100?' selected':''}>D100</option></select></label>
    <label>КОЛИЧЕСТВО<input class="dice-count" type="number" min="1" max="100" value="${item.count}"></label>
    <button type="button" class="remove-die" aria-label="Удалить тип кубика"${pool.length===1?' disabled':''}>×</button>
  </div>`).join('');
}

function renderRollMode(){
  const mode=state.rollMode || '';
  [['advantageBtn','advantage'],['disadvantageBtn','disadvantage']].forEach(([id,value])=>{
    const button=$(`#${id}`);
    button.classList.toggle('active',mode===value);
    button.setAttribute('aria-pressed',String(mode===value));
  });
}

function readDicePool(){
  return $$('.dice-pool-row').map(row=>({
    sides:Number(row.querySelector('.dice-sides').value),
    count:Number(row.querySelector('.dice-count').value)
  }));
}

function renderDashboardLog(){
  const history = Array.isArray(state.rollHistory) ? state.rollHistory : [];
  $('#dashboardLog').innerHTML = history.length ? history.map(item => `<div><span>${esc(item.time)}</span> ${logLine(item)}</div>`).join('') : 'Пока нет бросков.';
}

function renderDashboard(){
  $('#dashboardGreeting').textContent = state.name ? `ОПЕРАТИВНИК: ${state.name.toUpperCase()}` : 'СИСТЕМА ГОТОВА';
  renderDashboardLog();
  const preview = $('#portraitPreview');
  const hasImage = isSafeImage(state.portrait);
  preview.classList.toggle('has-image', hasImage);
  preview.style.backgroundImage = hasImage ? `url("${state.portrait}")` : '';
}

function save(changedKey){
  $$('[data-key]').forEach(el=>{
    const key = el.dataset.key;
    const custom = /^cskill(\d+)_(spec|level)$/.exec(key);
    if(custom){
      const item = state.customSkills?.[Number(custom[1])];
      if(item) item[custom[2]] = custom[2] === 'level' ? Number(el.value) || 0 : el.value;
    }
    else if(!structuredKey.test(key)) state[key] = el.type==='checkbox' ? el.checked : textValue(el);
  });
  if(changedKey === 'currentHp') syncWoundsWithHp();
  normalizeStats();
  normalizeSkills(changedKey);
  // Значения строк собираются по индексу колонки из ключа, а не по порядку в таблице.
  Object.entries(rowTypes).forEach(([type,width])=>{
    const pattern = new RegExp(`^${type}(\\d+)_(\\d+)$`);
    const rows = [];
    $$(`[data-key^="${type}"]`).forEach(el=>{
      const match = pattern.exec(el.dataset.key);
      if(match) (rows[Number(match[1])] ||= Array(width).fill(''))[Number(match[2])] = el.type === 'checkbox' ? (el.checked ? '1' : '') : textValue(el);
    });
    state[type] = Array.from(rows, data=>data || Array(width).fill(''));
  });
  state.cyberSlots = Object.keys(cyberSections).reduce((all,key)=>{
    all[key] = Array.from({length: cyberSections[key][1]},(_,i)=>['name','info','hl'].map(part=>$(`[data-key="cyberSlot_${key}_${i}_${part}"]`)?.value || ''));
    return all;
  },{});
  delete state.cyberware;
  refreshWeaponRows();
  // Ничего не перерисовываем целиком, чтобы не сбивать фокус в поле, которое сейчас редактируется.
  refreshStats(); updateDerived();
  $('#dashboardGreeting').textContent = state.name ? `ОПЕРАТИВНИК: ${state.name.toUpperCase()}` : 'СИСТЕМА ГОТОВА';
  if(persist()) $('#saveStatus').textContent='СОХРАНЕНО '+now();
  if(changedKey === 'name') renderSheetSelect();
}

// Выбор типа оружия заполняет навык, урон, магазин (и патроны), ROF и множитель автоогня.
function applyWeaponType(key, value){
  const match = /^weapon(\d+)_8$/.exec(key);
  const preset = match && weaponTypes[value];
  if(!preset) return;
  const i = match[1];
  const [name, skill, damage, magazine, rof, multiplier] = preset;
  if(isBlank($(`[data-key="weapon${i}_0"]`)?.value)) setInput(`weapon${i}_0`, name);
  setInput(`weapon${i}_5`, skill);
  setInput(`weapon${i}_1`, damage);
  setInput(`weapon${i}_6`, magazine);
  setInput(`weapon${i}_2`, magazine);
  setInput(`weapon${i}_3`, rof);
  setInput(`weapon${i}_7`, multiplier || '');
  if(!multiplier) $$(`[data-key="weapon${i}_9"]`).forEach(el=>{ el.checked = false; });
}

// Выбор брони из списка заполняет SP и штраф; ручная правка максимума считается сменой брони.
function applyArmorInput(key, value){
  const typeKey = /^armor(Head|Body)Type$/.exec(key);
  if(typeKey){
    const preset = armorPresets[value];
    if(!preset) return;
    setInput(`armor${typeKey[1]}`, preset[1]);
    setInput(`armor${typeKey[1]}Current`, preset[1]);
    const penalties = ['Head','Body'].map(zone=>armorPresets[$(`[data-key="armor${zone}Type"]`).value]?.[2] || 0);
    setInput('armorPenalty', Math.max(...penalties));
    return;
  }
  const maxKey = /^armor(Head|Body)$/.exec(key);
  if(maxKey){
    setInput(`armor${maxKey[1]}Current`, value);
    setInput(`armor${maxKey[1]}Type`, '');
  }
}

const zoneName = zone => zone === 'Head' ? 'голову' : 'тело';
const zoneTitle = zone => zone === 'Head' ? 'голова' : 'тело';

// Урон по правилам RED: SP вычитается из урона, прошедший урон по голове удваивается,
// при пробитии SP уменьшается на 1; оружие ближнего боя учитывает половину SP (округление вверх).
// Критическая травма: бросок 2d6 по таблице зоны и +5 урона сразу в хиты, мимо брони.
function applyDamage(){
  const damage = Math.max(0, Math.floor(Number($('#damageInput').value) || 0));
  const crit = $('#damageCrit').checked;
  if(!damage && !crit) return;
  const zone = $('#damageZone').value;
  const spKey = `armor${zone}Current`;
  const sp = numeric(spKey);
  const effectiveSp = $('#damageMelee').checked ? Math.ceil(sp / 2) : sp;
  let through = Math.max(0, damage - effectiveSp);
  if(zone === 'Head') through *= 2;
  if(through > 0 && sp > 0) state[spKey] = sp - 1;
  let injury = '';
  if(crit){
    const roll = d(6) + d(6);
    injury = `${criticalInjuries[zone][roll - 2]} (${zoneTitle(zone)}, 2d6 = ${roll})`;
    state.criticalInjuries = [String(state.criticalInjuries || '').trim(), injury].filter(Boolean).join('\n');
    through += CRITICAL_BONUS_DAMAGE;
  }
  const hpBefore = numeric('currentHp');
  state.currentHp = Math.max(0, hpBefore - through);
  syncWoundsWithHp();
  fillStaticInputs();
  updateDerived();
  const status = state.currentHp === 0 ? ' СМЕРТЕЛЬНОЕ РАНЕНИЕ — нужны испытания против смерти.' : isChecked('seriousWound') ? ' ТЯЖЁЛОЕ РАНЕНИЕ.' : '';
  const ablation = sp !== numeric(spKey) ? ` SP ${sp} → ${numeric(spKey)}.` : '';
  const text = through > 0
    ? `${damage} в ${zoneName(zone)} (SP ${effectiveSp}): −${through} ХИТ, ${hpBefore} → ${state.currentHp}/${maxHp()}.${ablation}${injury ? ` Крит. травма: ${injury}.` : ''}${status}`
    : `${damage} в ${zoneName(zone)} остановлено бронёй (SP ${effectiveSp}).`;
  $('#damageResult').textContent = text;
  addHistory({kind:'damage', text});
  $('#damageInput').value = '';
  $('#damageCrit').checked = false;
  if(persist()) $('#saveStatus').textContent='СОХРАНЕНО '+now();
}

function repairArmor(){
  state.armorHeadCurrent = numeric('armorHead');
  state.armorBodyCurrent = numeric('armorBody');
  fillStaticInputs();
  updateDerived();
  $('#damageResult').textContent = `Броня восстановлена: голова SP ${state.armorHeadCurrent}, тело SP ${state.armorBodyCurrent}.`;
  persist();
}

function bindInputs(){
  $$('[data-key]').forEach(el=>{
    if(el.dataset.bound) return;
    el.dataset.bound='true';
    el.addEventListener('input',()=>{
      const key=el.dataset.key;
      if(state.creationMode !== false && /^stat\d+$/.test(key)){
        const next=Math.max(2,Math.min(8,Number(el.value)||2));
        const otherTotal=stats.reduce((sum,_,i)=>sum+(key===`stat${i}`?0:numeric(`stat${i}`)),0);
        if(otherTotal+next>STAT_POOL){
          el.value=state[key];
          return;
        }
      }
      applyArmorInput(key, el.value);
      applyWeaponType(key, el.value);
      applyHumanityLoss(key, el.value);
      // Одно и то же значение может быть в нескольких полях (человечность).
      $$(`[data-key="${key}"]`).forEach(other=>{ if(other!==el && other.type!=='checkbox') other.value=el.value; });
      save(key);
    });
    // После окончания ввода показываем значение с учётом ограничений.
    el.addEventListener('change',()=>{
      const key = el.dataset.key;
      if(clampedKey.test(key)) el.value = state[key];
      const ref = keyToRef(key);
      if(ref && ref[0] === 'c') el.value = refLevel(ref);
      // Потерю человечности можно ввести формулой (2d6) — она сразу бросается.
      const formula = /_hl$/.test(key) && parseFormula(el.value);
      if(formula){
        const rolled = Array.from({length:formula.count},()=>d(formula.sides)).reduce((sum,value)=>sum+value,0);
        el.value = rolled;
        applyHumanityLoss(key, el.value);
        save(key);
        toast(`Потеря человечности: ${formula.count}d${formula.sides} = ${rolled}`);
      }
    });
  });
}

function render(){
  renderSheetSelect();
  normalizeSkills();
  renderStats();renderSkills();renderLife();Object.keys(rowTypes).forEach(type=>renderRows(type));renderCyber();renderDashboard();
  $('#creationMode').checked=state.creationMode !== false;
  renderDicePool();
  renderRollMode();
  fillStaticInputs();
  bindInputs();
  updateDerived();
}

function switchTab(tabName){
  $$('.tab,.tab-panel').forEach(x=>x.classList.remove('active'));
  const tab=$(`.tab[data-tab="${tabName}"]`);
  const panel=document.getElementById(tabName);
  if(tab && panel){tab.classList.add('active');panel.classList.add('active');}
}

// Формулы в заметках привязаны к номеру строки: при удалении и возврате строки сдвигаем их.
// dir = −1 — строка удалена (возвращаются её отметки), dir = +1 — строка вставлена обратно.
function shiftFormulaMarks(type, index, dir = -1){
  const pattern = new RegExp(`^${type}(\\d+)_(\\d+)$`);
  const removed = {};
  state.formulaMarks = Object.entries(state.formulaMarks || {}).reduce((next,[key,value])=>{
    const match = pattern.exec(key);
    if(!match){ next[key] = value; return next; }
    const i = Number(match[1]);
    if(dir < 0 && i === index){ removed[match[2]] = value; return next; }
    const shifted = dir < 0 ? (i > index ? i - 1 : i) : (i >= index ? i + 1 : i);
    next[`${type}${shifted}_${match[2]}`] = value;
    return next;
  },{});
  return removed;
}

function removeRow(type, index){
  if(!state[type]?.length){ render(); save(); return; }
  const [removed] = state[type].splice(index, 1);
  const marks = shiftFormulaMarks(type, index);
  render(); save();
  toast('Строка удалена', 'Вернуть', ()=>{
    state[type].splice(index, 0, removed);
    shiftFormulaMarks(type, index, 1);
    Object.entries(marks).forEach(([j,value])=>{ state.formulaMarks[`${type}${index}_${j}`] = value; });
    render(); save();
  });
}

function loadPortrait(file){
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    // Уменьшаем портрет, чтобы не упереться в лимит localStorage (~5 МБ).
    const scale = Math.min(1, 512 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const previous = state.portrait;
    state.portrait = canvas.toDataURL('image/jpeg', 0.85);
    if(!persist()) state.portrait = previous;
    renderDashboard();
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('Не удалось загрузить изображение.'); };
  img.src = url;
}

$$('[data-armor-zone]').forEach(select=>{
  select.innerHTML = '<option value="">Своя / нет</option>' + Object.entries(armorPresets).map(([id,[name,sp,penalty]])=>`<option value="${id}">${name} — SP ${sp}${penalty ? `, −${penalty}` : ''}</option>`).join('');
});
$$('[data-key]').forEach(el=>{ el.dataset.static='true'; });
$('#applyDamage').onclick=applyDamage;
$('#repairArmor').onclick=repairArmor;
$('#damageInput').onkeydown=e=>{ if(e.key==='Enter') applyDamage(); };
$('#creationMode').onchange=()=>{state.creationMode=$('#creationMode').checked;save();render();};

document.addEventListener('click',e=>{
  const tab=e.target.closest('.tab');
  if(tab) switchTab(tab.dataset.tab);
  const add=e.target.closest('[data-add]');
  if(add){
    const type=add.dataset.add;
    // Пустой лист уже показывает одну строку по умолчанию.
    if(!state[type]?.length) state[type]=[[]];
    state[type].push([]);
    render();save();
  }
  const rem=e.target.closest('[data-remove]');
  if(rem) removeRow(rem.dataset.remove, Number(rem.dataset.index));
  const weapon=e.target.closest('[data-weapon-attack],[data-weapon-damage],[data-weapon-reload]');
  if(weapon){
    const {weaponAttack:attack, weaponDamage:damage, weaponReload:reload} = weapon.dataset;
    if(attack !== undefined) weaponAttack(Number(attack));
    if(damage !== undefined) weaponDamage(Number(damage));
    if(reload !== undefined) weaponReload(Number(reload));
  }
  const skillRoll=e.target.closest('[data-roll-skill]');
  if(skillRoll) rollSkill(skillRoll.dataset.rollSkill);
  const upgrade=e.target.closest('[data-upgrade]');
  if(upgrade) upgradeSkill(upgrade.dataset.upgrade);
  const addSkill=e.target.closest('[data-add-variant]');
  if(addSkill) addVariant(addSkill.dataset.addVariant);
  const removeSkill=e.target.closest('[data-remove-skill]');
  if(removeSkill) removeVariant(Number(removeSkill.dataset.removeSkill));
  const formula=e.target.closest('[data-formula]');
  if(formula) rollFormula(parseFormula(formula.dataset.formula));
  const filter=e.target.closest('.skill-filter');
  if(filter){$$('.skill-filter').forEach(x=>x.classList.remove('active'));filter.classList.add('active');renderSkills();bindInputs();}
});
document.addEventListener('contextmenu',e=>{
  const input=e.target.closest('.formula-editor');
  const selection=window.getSelection();
  if(!input || !selection || selection.isCollapsed || !input.contains(selection.anchorNode)) return;
  const selected=selection.toString();
  const formula=parseFormula(selected);
  if(!formula) return;
  e.preventDefault();
  const marker=document.createElement('span');
  marker.className='formula-marked';
  marker.dataset.formula=selected;
  try { selection.getRangeAt(0).surroundContents(marker); } catch { return; }
  const key=input.dataset.key;
  const marks=state.formulaMarks || (state.formulaMarks={});
  marks[key]=Array.from(new Set([...(marks[key] || []),selected]));
  save();
});
$('#diceToggle').onclick=()=>$('#diceDrawer').classList.toggle('open');
$('#diceClose').onclick=()=>$('#diceDrawer').classList.remove('open');
$('#addDie').onclick=()=>{state.dicePool=[...readDicePool(),{sides:6,count:1}];renderDicePool();persist();};
$('#dicePool').oninput=()=>{state.dicePool=readDicePool();persist();};
$('#dicePool').onclick=e=>{const remove=e.target.closest('.remove-die');if(!remove)return;const pool=readDicePool();pool.splice(Number(remove.closest('.dice-pool-row').dataset.diceIndex),1);state.dicePool=pool;renderDicePool();persist();};
$('#rollDice').onclick=()=>{
  const pool=readDicePool();
  state.dicePool=pool;
  const luck=spendLuck();
  rollDicePool(pool,(Number($('#diceModifier').value)||0)+luck,withNotes('Свободный бросок',[luck && `удача +${luck}`]));
};
$('#initiativeBtn').onclick=rollInitiative;
$('#advantageBtn').onclick=()=>{state.rollMode=state.rollMode==='advantage'?'':'advantage';renderRollMode();persist();};
$('#disadvantageBtn').onclick=()=>{state.rollMode=state.rollMode==='disadvantage'?'':'disadvantage';renderRollMode();persist();};
$('#deathSaveButton').onclick=rollDeathSave;
$('#skillSearch').oninput=()=>{renderSkills();bindInputs();};
$('#clearLog').onclick=()=>{state.rollHistory=[];persist();renderDashboardLog();$('#diceLog').innerHTML='';};
$('#portraitInput').onchange=e=>{const file=e.target.files[0];if(file)loadPortrait(file);e.target.value='';};
$('#resetBtn').onclick=()=>{if(confirm('Очистить лист текущего персонажа?')){state=migrate({});clearTransient();render();persist();$('#saveStatus').textContent='ЛИСТ ОЧИЩЕН';}};
$('#sheetSelect').onchange=e=>switchSheet(e.target.value);
$('#newSheet').onclick=()=>{createSheet();switchTab('character');};
$('#deleteSheet').onclick=deleteSheet;
$('#printBtn').onclick=()=>window.print();
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.name||'cyberpunk-red-sheet').replace(/[\\/:*?"<>|]/g,'_')+'.json';a.click();URL.revokeObjectURL(a.href);};
$('#importInput').onchange=e=>{
  const file=e.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    let data;
    try{data=JSON.parse(reader.result);}catch{data=null;}
    if(!data || typeof data!=='object' || Array.isArray(data)){toast('Не удалось прочитать JSON-файл.');return;}
    // Импорт добавляет нового персонажа, а не перезаписывает текущего.
    createSheet(data);
    save();
    toast(`Импортирован персонаж «${state.name || 'Без имени'}»`);
  };
  reader.readAsText(file);
  e.target.value='';
};
render();
