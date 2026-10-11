// Логика интерактивного листа Cyberpunk RED. Справочные таблицы — в data.js.
const skillEntries = Object.values(skillCategories).flat();
const skills = skillEntries.map(([name]) => name);
const penalizedStats = [1, 2, 7]; // РЕФ, ЛВК, СКО
const rowTypes = {gear:3, weapon:11, relationship:3, ammo:3};
// Порядок колонок в таблицах: j — индекс значения в сохранённой строке (новые колонки оружия добавлены в конец).
// short — короткое однострочное значение (числа, урон); остальные текстовые ячейки многострочные и растут вместе с текстом.
const rowColumns = {
  gear:[{j:0},{j:1,short:true},{j:2,note:true}],
  // weapon: 7 — множитель автоогня (скрытое поле, заполняется типом), 8 — тип, 9 — автоогонь включён.
  weapon:[{j:0,label:'Оружие'},{j:8,select:'type',label:'Тип'},{j:5,select:'skill',label:'Навык'},{j:1,short:true,placeholder:'3d6',label:'Урон'},{j:2,short:true,label:'Патр.'},{j:6,short:true,label:'Маг.'},{j:3,short:true,label:'ROF'},{j:9,toggle:true,label:'Авто'},{j:10,select:'loadedAmmo',label:'Боеприпасы'},{j:4,note:true,label:'Заметки'}],
  // ammo: 0 калибр, 1 тип, 2 количество; колонка «свойство» — справочная, не хранится.
  ammo:[{j:0,select:'caliber',label:'Калибр'},{j:1,select:'ammoType',label:'Тип'},{j:2,short:true,label:'Кол-во'},{j:-1,select:'ammoInfo'}],
  relationship:[{j:0},{j:1},{j:2}]
};
const INDEX_KEY = 'cyberred-index';
const LEGACY_KEY = 'cyberred-sheet';
const SKILL_POOL = 86, STAT_POOL = 62, MAX_SKILL = 10;
// Поля строк таблиц и киберслотов хранятся только в структурированном виде (state.gear, state.cyberSlots...).
// Таблицы учёта ролей (программы, команда, контакты…) работают как остальные таблицы листа.
Object.values(roles).forEach(({table})=>{
  if(!table) return;
  rowTypes[table.key] = table.columns.length;
  rowColumns[table.key] = table.columns.map((_,j)=>({j}));
});
// Программы: 0 название, 1 класс, 2 ATK, 3 DEF, 4 REZ макс., 5 эффект, 6 тип из книги,
// 7 REZ текущий, 8 включена, 9 что усиливает, 10 на сколько (скрытое поле), 11 урон.
// 12 — урон по Чёрному ЛЬДУ (если отличается), 13 — 'effect': кубики — свойство, а не урон.
rowTypes.rolePrograms = 14;
rowColumns.rolePrograms = [{j:0},{j:6,select:'program'},{j:1},{j:2,short:true},{j:3,short:true},{j:7,short:true},{j:4,short:true},{j:8,toggle:true},{j:11,short:true},{j:9,select:'boost'},{j:5}];
// Команда корпората: 0 имя, 1 работа, 2 лояльность, 3 заметки, 4 тип подчинённого, 5 СТАТы.
rowTypes.roleTeam = 6;
rowColumns.roleTeam = [{j:0},{j:4,select:'teamType'},{j:1},{j:2,short:true},{j:5},{j:3}];
// Транспорт кочевника: 0 название, 1 улучшения, 2 заметки, 3 тип, 4 ПЗТ сейчас, 5 ПЗТ макс., 6 места и скорость.
rowTypes.roleVehicles = 7;
rowColumns.roleVehicles = [{j:0},{j:3,select:'vehicleType'},{j:4,short:true},{j:5,short:true},{j:6},{j:1},{j:2}];
const structuredKey = new RegExp(`^(${Object.keys(rowTypes).join('|')})\\d+_\\d+$|^cyberSlot_|^cskill\\d+_`);
const clampedKey = /^(stat|skill)\d+$|^(currentHp|luckCurrent|humanityCurrent|armorHeadCurrent|armorBodyCurrent|roleRank)$/;

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
// Бонус роли к навыку: Обнаружение угроз Соло, Полевая экспертиза Техника, Мото Кочевника.
const fieldExpertiseSkills = ['Знания техники','Кибертехника','Электроника/Безопасность (x2)','Оружейник','Автомеханика','Морская технология','Авиационные технологии'];
function roleSkillBonus(name){
  if(name === 'Внимательность' && soloLevel('threat')) return [soloLevel('threat'), 'Обнаружение угроз'];
  if(state.roleId === 'tech' && fieldExpertiseSkills.includes(name) && numeric(rolePointsKey('tech','field'))) return [numeric(rolePointsKey('tech','field')), 'Полевая экспертиза (не для работ Создателя)'];
  if(state.roleId === 'nomad' && motoSkills.includes(name)) return [roleRank(), 'Мото'];
  return [0, ''];
}
const refTotal = ref => { const s = skillStatIndex(refBase(ref)); return refLevel(ref) + statValue(s) - statPenalty(s) - woundPenalty() + roleSkillBonus(skills[refBase(ref)])[0]; };
const allRefs = () => [...skills.map((_,i)=>`b${i}`), ...(state.customSkills || []).map((_,j)=>`c${j}`)];
const skillSpent = () => allRefs().reduce((sum,ref)=>sum + refLevel(ref)*refWeight(ref),0);
// Повышение навыка за очки улучшения: 20 × новый уровень, для (x2) — вдвое дороже.
const upgradeCost = ref => (refLevel(ref) + 1) * 20 * refWeight(ref);
const keyToRef = key => { const b = /^skill(\d+)$/.exec(key || ''); if(b) return `b${b[1]}`; const c = /^cskill(\d+)_level$/.exec(key || ''); return c ? `c${c[1]}` : null; };
function setRefLevel(ref, level){
  if(ref[0] === 'b') state[`skill${ref.slice(1)}`] = level;
  else customSkill(ref).level = level;
}
// Роль персонажа: способность с рангом и направлениями (см. roles в data.js).
const currentRole = () => roles[state.roleId];
const roleRank = () => Math.max(0, Math.min(ROLE_MAX_RANK, numeric('roleRank')));
const rolePointsKey = (roleId, key) => `rolePts_${roleId}_${key}`;
const rolePointsBudget = () => roleRank() * (currentRole()?.pointsPerRank || 1);
const rolePointsSpent = roleId => (roles[roleId]?.specialties || []).reduce((sum,item)=>sum + numeric(rolePointsKey(roleId, item.key)) * item.cost, 0);
// Уровень направления Соло (Боевая готовность) — для автоматических бонусов.
const soloLevel = key => state.roleId === 'solo' ? numeric(rolePointsKey('solo', key)) : 0;
// NET-действий за ход по рангу Интерфейса.
const netActions = rank => rank >= 10 ? 5 : rank >= 7 ? 4 : rank >= 4 ? 3 : 2;
const roleUpgradeCost = () => (roleRank() + 1) * ROLE_RANK_IP;
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
  if(Array.isArray(s.rolePrograms)) s.rolePrograms.forEach(row=>{
    const preset = programPresets[row?.[6]];
    if(!preset || !isBlank(row[12]) || !isBlank(row[13]) || (!preset[9] && !preset[10])) return;
    row[11] = String(preset[5] ?? ''); row[12] = String(preset[9] ?? ''); row[13] = String(preset[10] ?? '');
  });
  if(Array.isArray(s.roleTeam)) s.roleTeam.forEach(row=>{ if(row?.[4] && String(row[3] || '').startsWith('Прикрытие: ')) row[3] = ''; });
  delete s.targetDv;
  // Роль раньше была свободным текстом — узнаём её по названию.
  if(!s.roleId && !isBlank(s.role)){
    const text = String(s.role).toLowerCase().replace(/ё/g, 'е');
    const match = Object.entries(roles).flatMap(([id,item])=>item.aliases.map(alias=>[id, alias])).sort((a,b)=>b[1].length - a[1].length).find(([,alias])=>text.includes(alias));
    if(match) s.roleId = match[0];
  }
  if(s.roleId && !roles[s.roleId]) delete s.roleId;
  if(s.roleId && isBlank(s.roleRank)) s.roleRank = ROLE_START_RANK;
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
    const [roleBonus, roleNote] = roleSkillBonus(skills[refBase(ref)]);
    cell.textContent = refTotal(ref);
    cell.title = [armor && `Штраф брони −${armor}`, wound && `Штраф ранения −${wound}`, empNote, roleBonus && `${roleNote} +${roleBonus}`].filter(Boolean).join(', ');
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
    <label>Образ жизни${growField('lifeStyle',state.lifeStyle||'', 'Например: Бродяга, Средний, Богатый')}</label>
    <label>Арендная плата${growField('lifeRent',state.lifeRent||'', 'Ежемесячная плата')}</label>
    <label>Жильё${growField('lifeHousing',state.lifeHousing||'', 'Тип и описание жилья')}</label>
    <label>Образ и стиль${growField('lifeLook',state.lifeLook||'', 'Внешний вид и стиль')}</label>
  </div>`;
  const alias = `<label class="full">Псевдоним${field('lifeAlias',state.lifeAlias||'')}</label>`;
  $('#lifeFields').innerHTML = alias + lifeFields.map((name,i)=>`<label class="${i===0?'full':''}">${name}${growField(`life${i}`,state[`life${i}`]||'')}</label>`).join('');
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
  const cells = rowColumns[type].map(({j,note,short,select,toggle,placeholder,label})=>{
    const key = `${type}${index}_${j}`;
    if(note) return `<td><div class="formula-editor" data-key="${key}" contenteditable="true">${formulaHtml(key,data[j]||'')}</div></td>`;
    if(select === 'skill') return `<td>${weaponSkillSelect(key, data[j] || '')}</td>`;
    if(select === 'type') return `<td>${weaponTypeSelect(key, data[j] || '', `${type}${index}_7`, data[7] || '')}</td>`;
    if(select === 'teamType') return `<td><select data-key="${key}" aria-label="Тип подчинённого"><option value="">—</option>${Object.entries(execSubordinates).map(([id,item])=>`<option value="${id}"${id === data[j] ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select></td>`;
    if(select === 'vehicleType') return `<td><select data-key="${key}" aria-label="Тип транспорта"><option value="">Свой</option>${Object.entries(vehicleTypes).map(([id,item])=>`<option value="${id}"${id === data[j] ? ' selected' : ''}>${esc(item[0])}</option>`).join('')}</select></td>`;
    if(select === 'caliber') return `<td><select data-key="${key}" aria-label="Калибр"><option value="">—</option>${Object.entries(ammoCalibers).map(([id,[name]])=>`<option value="${id}"${id === data[j] ? ' selected' : ''}>${esc(name)}</option>`).join('')}</select></td>`;
    if(select === 'ammoType') return `<td><select data-key="${key}" aria-label="Тип боеприпасов">${ammoTypeOptions(data[0], data[j])}</select></td>`;
    if(select === 'ammoInfo'){ const item = ammoTypes[data[1]]; return `<td class="ammo-info">${item ? `${esc(item[3])}<small>${esc(item[1])} за ${ammoCalibers[data[0]]?.[1] === 1 ? 'штуку' : '10 шт.'}</small>` : ''}</td>`; }
    if(select === 'loadedAmmo') return `<td><select data-key="${key}" aria-label="Заряжено">${loadedAmmoOptions(data)}</select></td>`;
    if(select === 'program') return `<td>${programPresetSelect(key, data[j] || '')}</td>`;
    if(select === 'boost') return `<td>${programBoostSelect(key, data[j] || '', `${type}${index}_10`, data[10] || '')}</td>`;
    if(toggle && type !== 'weapon') return `<td class="auto-cell"><input type="checkbox" data-key="${key}" aria-label="Включено"${data[j] === '1' ? ' checked' : ''}></td>`;
    if(toggle) return `<td class="auto-cell"><input type="checkbox" data-key="${key}" aria-label="Автоматический огонь"${isAutofireOn(data) ? ' checked' : ''}${autofireMultiplier(data) ? '' : ' disabled'}></td>`;
    return short ? `<td>${field(key, data[j] || '', 'text', placeholder || '')}</td>` : `<td>${growField(key, data[j] || '')}</td>`;
  }).map((html,k)=>{ const label = rowColumns[type][k].label; return label ? html.replace('<td', `<td data-label="${label}"`) : html; }).join('');
  const ammoActions = type === 'ammo'
    ? `<button type="button" class="weapon-btn" data-ammo-pack="${index}" title="Купить пачку: +10 (гранаты и ракеты — +1)">+${ammoCalibers[data[0]]?.[1] ?? 10}</button>`
    : '';
  const programActions = type === 'rolePrograms'
    ? `<button type="button" class="weapon-btn" data-program-attack="${index}" title="Бросок на попадание: 1d10 + ранг Интерфейса + ATK; результат назовите мастеру">ПОПАДАНИЕ</button><button type="button" class="weapon-btn" data-program-damage="${index}" title="Бросок урона программы (после попадания)">УРОН</button><button type="button" class="weapon-btn" data-program-rez="${index}" title="Восстановить REZ до максимума">↺</button>`
    : '';
  const roleActions = type === 'roleTeam'
    ? `<button type="button" class="weapon-btn" data-role-action="loyaltyCheck" data-index="${index}" title="Проверка лояльности: мастер бросает 1d6">1D6</button>`
    : type === 'roleVehicles'
      ? `<button type="button" class="weapon-btn" data-role-action="vehicleRepair" data-index="${index}" title="Полностью починить: ПЗТ = максимум">↺</button>`
      : '';
  const weaponActions = type === 'weapon'
    ? `<button type="button" class="weapon-btn" data-weapon-attack="${index}">ПОПАДАНИЕ</button><button type="button" class="weapon-btn" data-weapon-damage="${index}">УРОН</button><button type="button" class="weapon-btn" data-weapon-reload="${index}" title="Перезарядить: патроны = магазин">↻</button>`
    : '';
  return `<tr>${cells}<td class="row-actions">${weaponActions}${programActions}${roleActions}${ammoActions}<button type="button" class="remove" data-remove="${type}" data-index="${index}" title="Удалить строку">×</button></td></tr>`;
}
// СТАТы подчинённого хранятся строкой «ИНТ 5 · РЕФ 7 · …»; на карточке — сеткой полей.
const parseTeamStats = text => execStatNames.map(name=>{ const match = new RegExp(`${name}\\s*(\\d+)`).exec(String(text || '')); return match ? match[1] : ''; });
const formatTeamStats = values => values.map((value,i)=>isBlank(value) ? '' : `${execStatNames[i]} ${value}`).filter(Boolean).join(' · ');
// Карточка подчинённого корпората: шапка, сетка СТАТов, навыки и снаряжение из книги (свёрнуты), заметки.
function teamCard(data, i){
  const type = execSubordinates[data[4]];
  const stats = parseTeamStats(data[5]);
  const skills = type ? type.skills.split('; ').map(line=>{ const [bonus, list] = line.split(': '); return `<li><strong>${esc(bonus)}</strong> ${esc(list)}</li>`; }).join('') : '';
  return `<article class="team-card">
    <div class="team-head">
      <input class="team-name" data-key="roleTeam${i}_0" value="${esc(data[0] || '')}" placeholder="Имя подчинённого" aria-label="Имя">
      <label class="team-loyalty" title="Лояльность: проверка — 1d6 мастера">ЛОЯЛЬНОСТЬ<input data-key="roleTeam${i}_2" type="number" value="${esc(data[2] || '')}"></label>
      <button type="button" class="weapon-btn" data-role-action="loyaltyCheck" data-index="${i}" title="Проверка лояльности: мастер бросает 1d6">1D6</button>
      <button type="button" class="remove" data-remove="roleTeam" data-index="${i}" title="Уволить / удалить">×</button>
    </div>
    <div class="team-meta">
      <select data-key="roleTeam${i}_4" aria-label="Тип подчинённого"><option value="">Тип —</option>${Object.entries(execSubordinates).map(([id,item])=>`<option value="${id}"${id === data[4] ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select>
      ${growField(`roleTeam${i}_1`, data[1] || '', 'Работа')}
    </div>
    <div class="team-stats">${execStatNames.map((name,k)=>`<label><span>${name}</span><input data-team-stat="${i}" data-stat-index="${k}" type="number" min="0" max="10" value="${esc(stats[k])}" aria-label="${name}"></label>`).join('')}</div>
    <input type="hidden" data-key="roleTeam${i}_5" value="${esc(data[5] || '')}">
    ${type ? `<details class="team-details"><summary>Навыки и снаряжение</summary><p><strong>Прикрытие:</strong> ${esc(type.cover)}</p><ul>${skills}</ul><p><strong>Киберимпланты и снаряжение:</strong> ${esc(type.gear)}</p></details>` : ''}
    ${growField(`roleTeam${i}_3`, data[3] || '', 'Заметки')}
  </article>`;
}
// Программа кибердеки — компактная карточка: параметры в одну строку, эффект под ней.
function programCard(data, i){
  const k = j => `rolePrograms${i}_${j}`;
  const mini = (label, j, title = '') => `<label class="mini"${title ? ` title="${title}"` : ''}><span>${label}</span><input data-key="${k(j)}" value="${esc(data[j] || '')}"></label>`;
  return `<article class="program-card">
    <div class="program-main">
      <label class="program-on" title="Программа включена"><input type="checkbox" data-key="${k(8)}"${data[8] === '1' ? ' checked' : ''} aria-label="Включена"></label>
      <input class="program-name" data-key="${k(0)}" value="${esc(data[0] || '')}" placeholder="Программа" aria-label="Название">
      <div class="program-fields">
        <label class="mini wide"><span>Из книги</span>${programPresetSelect(k(6), data[6] || '')}</label>
        <label class="mini wide"><span>Класс</span><input data-key="${k(1)}" value="${esc(data[1] || '')}"></label>
        ${mini('ATK', 2)}${mini('ЗАЩ', 3)}
        <label class="mini rez" title="REZ сейчас / максимум"><span>REZ</span><span class="rez-pair"><input data-key="${k(7)}" value="${esc(data[7] || '')}" aria-label="REZ сейчас">/<input data-key="${k(4)}" value="${esc(data[4] || '')}" aria-label="REZ максимум"></span></label>
        <label class="mini"><span data-program-roll-label="${i}">${data[13] === 'effect' ? 'Свойство' : !isBlank(data[12]) ? 'Урон: прогр.' : 'Урон'}</span><input data-key="${k(11)}" value="${esc(data[11] || '')}"></label>
        <label class="mini" title="Урон по Чёрному ЛЬДУ, если он отличается"><span>Урон: Ч.ЛЁД</span><input data-key="${k(12)}" value="${esc(data[12] || '')}"></label>
        <input type="hidden" data-key="${k(13)}" value="${esc(data[13] || '')}">
        <label class="mini wide"><span>Усиливает</span>${programBoostSelect(k(9), data[9] || '', k(10), data[10] || '')}</label>
      </div>
      <div class="row-actions"><button type="button" class="weapon-btn" data-program-attack="${i}" title="Бросок на попадание: 1d10 + ранг Интерфейса + ATK; результат назовите мастеру">ПОПАДАНИЕ</button><button type="button" class="weapon-btn" data-program-damage="${i}">УРОН</button><button type="button" class="weapon-btn" data-program-damage="${i}" data-target="ice" title="Урон по Чёрному ЛЬДУ (после попадания)">ПО ЧЁРНОМУ ЛЬДУ</button><button type="button" class="weapon-btn" data-program-rez="${i}" title="Восстановить REZ до максимума">↺</button><button type="button" class="remove" data-remove="rolePrograms" data-index="${i}" title="Удалить">×</button></div>
    </div>
    ${growField(k(5), data[5] || '', 'Эффект')}
  </article>`;
}
// Транспорт кочевника — карточка: ПЗТ с полоской, характеристики, улучшения галочками.
const vehicleUpgradeList = data => String(data?.[1] || '').split(/[;,\n]/).map(part=>part.trim()).filter(Boolean);
function vehicleCard(data, i){
  const k = j => `roleVehicles${i}_${j}`;
  const preset = vehicleTypes[data[3]];
  const chosen = vehicleUpgradeList(data);
  const rank = roleRank();
  const stats = preset
    ? `<div class="vehicle-stats"><div><span>Мест</span><strong>${esc(preset[2])}</strong></div><div><span>СКО в бою</span><strong>${preset[3]}</strong></div><div><span>Скорость</span><strong>${preset[4]} км/ч</strong></div></div><input type="hidden" data-key="${k(6)}" value="${esc(data[6] || '')}">`
    : growField(k(6), data[6] || '', 'Места, СКО в бою, скорость');
  const upgrades = nomadUpgrades.map(([name, from, kind])=>`<label class="check-row${rank >= from ? '' : ' is-locked'}" title="${esc(kind)}"><input type="checkbox" data-vehicle-upgrade="${i}" value="${esc(name)}"${chosen.includes(name) ? ' checked' : ''}${rank >= from || chosen.includes(name) ? '' : ' disabled'}> ${esc(name)} <small>ранг ${from}</small></label>`).join('');
  return `<article class="vehicle-card">
    <div class="team-head">
      <input class="team-name" data-key="${k(0)}" value="${esc(data[0] || '')}" placeholder="Транспорт" aria-label="Название">
      <select data-key="${k(3)}" aria-label="Тип транспорта"><option value="">Свой</option>${Object.entries(vehicleTypes).map(([id,item])=>`<option value="${id}"${id === data[3] ? ' selected' : ''}>${esc(item[0])}</option>`).join('')}</select>
      <button type="button" class="remove" data-remove="roleVehicles" data-index="${i}" title="Удалить">×</button>
    </div>
    <div class="vehicle-hp">
      <label>ПЗТ<span class="rez-pair"><input data-key="${k(4)}" value="${esc(data[4] || '')}" aria-label="ПЗТ сейчас">/<input data-key="${k(5)}" value="${esc(data[5] || '')}" aria-label="ПЗТ максимум"></span></label>
      <div class="hp-bar" data-vehicle-bar="${i}"><span></span></div>
      <input class="vehicle-damage" data-vehicle-damage="${i}" type="number" min="0" placeholder="урон" aria-label="Урон транспорту">
      <button type="button" class="weapon-btn" data-role-action="vehicleDamage" data-index="${i}" title="Снять урон с ПЗТ">УРОН</button>
      <button type="button" class="weapon-btn" data-role-action="vehicleRepair" data-index="${i}" title="Полностью починить">↺</button>
    </div>
    ${stats}
    <details class="team-details"><summary data-vehicle-summary="${i}">Улучшения</summary><div class="vehicle-upgrades">${upgrades}</div></details>
    <input type="hidden" data-key="${k(1)}" value="${esc(data[1] || '')}">
    ${growField(k(2), data[2] || '', 'Заметки')}
  </article>`;
}
function refreshVehicleCards(){
  $$('[data-vehicle-bar]').forEach(bar=>{
    const data = state.roleVehicles?.[Number(bar.dataset.vehicleBar)];
    const max = Number(data?.[5]) || 0, now = Math.max(0, Number(data?.[4]) || 0);
    const share = max ? Math.min(1, now / max) : 0;
    bar.firstElementChild.style.width = `${Math.round(share * 100)}%`;
    bar.classList.toggle('is-low', max > 0 && share <= .5);
    bar.title = max ? `${now} / ${max}${now === 0 ? ' — уничтожен' : ''}` : '';
  });
  $$('[data-vehicle-summary]').forEach(summary=>{
    const count = vehicleUpgradeList(state.roleVehicles?.[Number(summary.dataset.vehicleSummary)]).length;
    summary.textContent = count ? `Улучшения (${count})` : 'Улучшения';
  });
}
const cardRenderers = {roleTeam:teamCard, rolePrograms:programCard, roleVehicles:vehicleCard};
function renderRows(type){
  const rows = state[type]?.length ? state[type] : [[]];
  if(!$(`#${type}Rows`)) return;
  $(`#${type}Rows`).innerHTML = rows.map((data,i)=>cardRenderers[type] ? cardRenderers[type](data, i) : row(type,data,i)).join('');
  if(type === 'roleVehicles') refreshVehicleCards();
  if(type === 'weapon') refreshWeaponRows();
  if(type === 'rolePrograms') refreshProgramRows();
  autoGrowAll();
}
// Галочка «Авто» доступна только оружию с автоогнём; при включённой кнопка атаки — «ОЧЕРЕДЬ».
function refreshWeaponRows(){
  $$('#weaponRows tr').forEach((tr,i)=>{
    const data = state.weapon?.[i];
    const ammoSelect = tr.querySelector('[data-key$="_10"]');
    if(ammoSelect && ammoSelect !== document.activeElement) ammoSelect.innerHTML = loadedAmmoOptions(data);
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
      attack.textContent = 'ПОПАДАНИЕ';
      attack.title = on ? 'Бросок на попадание очередью: 10 патронов, 1d10 + РЕФ + «Автоматический огонь»; результат назовите мастеру' : 'Бросок на попадание: 1d10 + стат + навык; результат назовите мастеру';
    }
    if(damage){
      const loaded = loadedAmmo(data);
      const effect = !on && loaded && loaded.type in ammoNoDamage;
      const shell = !on && loaded?.caliber === 'shell';
      damage.textContent = on ? 'УРОН ОЧЕРЕДИ' : effect ? 'ЭФФЕКТ' : 'УРОН';
      damage.title = on ? 'Урон очереди после попадания: 2d6 × множитель, который назовёт мастер'
        : effect ? `${ammoTypes[loaded.type][0]}: урона оружия нет — ${ammoTypes[loaded.type][3]}`
        : shell ? `Урон дробью: ${SHOTGUN_SHELL_DAMAGE} всем целям в конусе` : 'Бросок урона после попадания';
    }
  });
}
// Многострочное поле, которое растёт по высоте вместе с текстом.
const growField = (key, value='', placeholder='') => `<textarea class="grow-field" data-key="${key}" rows="1" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
// Chrome и Edge подгоняют высоту сами (field-sizing: content), остальным браузерам помогаем скриптом.
const nativeGrow = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
function autoGrow(el){
  if(nativeGrow || !el.offsetParent) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}
const autoGrowAll = () => $$('.grow-field').forEach(autoGrow);

function renderCyber(){
  const saved = state.cyberSlots || {};
  if(!state.cyberSlots && Array.isArray(state.cyberware) && state.cyberware.length) saved.cranial = state.cyberware;
  Object.entries(cyberSections).forEach(([key,[title,count]]) => {
    const target = $(`[data-cyber-section="${key}"]`);
    const rows = saved[key] || [];
    target.innerHTML = `<table class="cyber-slot-table"><thead><tr><th>${title}</th><th>Информация</th><th title="Потеря человечности: число или формула (2d6)">ПЧ</th></tr></thead><tbody>${Array.from({length:count},(_,i)=>`<tr><td>${growField(`cyberSlot_${key}_${i}_name`,rows[i]?.[0]||'')}</td><td>${growField(`cyberSlot_${key}_${i}_info`,rows[i]?.[1]||'')}</td><td class="hl-cell">${field(`cyberSlot_${key}_${i}_hl`,rows[i]?.[2]||'')}</td></tr>`).join('')}</tbody></table>`;
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
const critPart = item => item.critical && Number(item.critExtra) ? ` ${Number(item.die) === 10 ? '+' : '−'} крит ${Number(item.critExtra)}` : '';
const diceText = item => (item.diceDetails ? item.diceDetails.map(die=>`D${Number(die.sides)}: ${Number(die.value)}`).join(' + ') : (Array.isArray(item.dice) ? item.dice.map(Number).join(' + ') : Number(item.die))) + critPart(item);
const critText = item => item.critical ? ` <em>${Number(item.die) === 10 ? 'КРИТИЧЕСКИЙ УСПЕХ' : 'КРИТИЧЕСКИЙ ПРОВАЛ'}</em>` : '';
const logLine = item => item.kind === 'damage'
  ? `<b class="log-tag">УРОН</b> ${esc(item.text)}`
  : `${esc(item.label)}${item.mode ? ` [${esc(item.mode)}]` : ''}: <b>${diceText(item)}</b>${Number(item.modifier) ? ` + ${signed(Number(item.modifier))}` : ''} = <strong>${signed(Number(item.total))}</strong>${critText(item)}${item.note ? ` <em>${esc(item.note)}</em>` : ''}`;

function addHistory(entry){
  state.rollHistory = [{...entry, time:now()}, ...(state.rollHistory || [])].slice(0, 30);
  renderDashboardLog();
}

// crits: по правилам RED (стр. 130) 10 на 1d10 — критический успех: бросается ещё 1d10 и прибавляется;
// 1 — критический провал: ещё 1d10 вычитается. Повторная 10 или 1 на втором кубике нового крита не даёт.
// attack — бросок атаки: «Умелое обращение» Соло отменяет критический провал только на атаках (стр. 146).
function rollDicePool(pool, modifier, label='Свободный бросок', {crits=true, judge, attack=false}={}){
  const dicePool=normalizeDicePool(pool);
  const diceDetails=dicePool.flatMap(({sides,count})=>Array.from({length:count},()=>({sides,value:rollDie(sides)})));
  const die = diceDetails.reduce((sum,item)=>sum+item.value,0);
  const fumbleRecovered = crits && attack && diceDetails.length === 1 && diceDetails[0].sides === 10 && die === 1 && soloLevel('fumble') > 0;
  const critical = crits && diceDetails.length === 1 && diceDetails[0].sides === 10 && (die === 10 || (die === 1 && !fumbleRecovered));
  const critExtra = critical ? d(10) : 0;
  const total = die + modifier + (die === 10 ? critExtra : -critExtra);
  const entry = {label, die, diceDetails, modifier, total, critical, critExtra, mode:rollModeLabel()};
  if(judge) entry.note = judge(entry) || '';
  if(fumbleRecovered) entry.note = [entry.note, 'единица не критический провал (Умелое обращение)'].filter(Boolean).join('. ');
  addHistory(entry);
  persist();
  const critDie = critical ? `<span class="formula-die is-crit" aria-label="Кубик крита">${die === 10 ? '+' : '−'}${critExtra}<small>КРИТ</small></span>` : '';
  $('#diceResult').innerHTML = `<div class="formula-roll-values">${diceDetails.map((item,index)=>`<span class="formula-die${critical && index === 0 ? ' is-crit-source' : ''}" aria-label="D${item.sides}, кубик ${index + 1}">${item.value}<small>D${item.sides}</small></span>`).join('')}${critDie}</div><strong class="formula-roll-total">СУММА: ${signed(total)}</strong>${critText(entry) || entry.note ? `<div class="roll-note">${critText(entry)}${entry.note ? `<span>${esc(entry.note)}</span>` : ''}</div>` : ''}`;
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
function rollCheck(ref, label = refLabel(ref), judge, extras = [], {attack = false} = {}){
  const wound = woundPenalty();
  const luck = spendLuck();
  const modifier = refTotal(ref) + luck + extras.reduce((sum,[value])=>sum + value, 0);
  state.dicePool=[{sides:10,count:1}];
  renderDicePool();
  $('#diceModifier').value=modifier;
  return rollDicePool([{sides:10,count:1}], modifier, withNotes(label, [wound && `ранение −${wound}`, luck && `удача +${luck}`, ...extras.map(([value,note])=>value && `${note} +${value}`)]), {judge, attack});
}
const rollSkill = ref => rollCheck(typeof ref === 'number' ? `b${ref}` : String(ref));

// Инициатива: 1d10 + РЕФ (со штрафом брони).
function rollInitiative(){
  const luck = spendLuck();
  const armor = statPenalty(1);
  const reaction = soloLevel('initiative');
  rollDicePool([{sides:10,count:1}], statValue(1) - armor + luck + reaction, withNotes('Инициатива', [armor && `броня −${armor}`, luck && `удача +${luck}`, reaction && `реакция +${reaction}`]), {crits:false});
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
  `множитель называет мастер, макс. ×${multiplier}`,
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
    rollCheck(`b${skills.indexOf(AUTOFIRE_SKILL)}`, `${name}: попадание очередью`, undefined, [[soloLevel('precision'), 'точная атака']], {attack:true});
    return;
  }
  const skill = skills.indexOf(data[5]);
  if(skill < 0){ toast(`${name}: выберите тип или навык оружия`); return; }
  if(rangedWeaponSkills.includes(data[5]) && !spendAmmo(index, data, data[5] === AUTOFIRE_SKILL ? AUTOFIRE_AMMO : 1)) return;
  rollCheck(`b${skill}`, `${name}: попадание`, undefined, [[soloLevel('precision'), 'точная атака']], {attack:true});
}
// Урон: формула оружия. Для очереди — 2d6 и таблица множителей: DV знает мастер,
// он берёт множитель = на сколько атака превысила DV (не больше множителя оружия).
// Две и больше шестёрок на кубиках урона — критическая травма у цели.
function weaponDamage(index){
  const data = weaponRow(index);
  if(!data) return;
  const name = data[0] || 'Оружие';
  if(isAutofireOn(data)){
    rollDicePool([AUTOFIRE_DAMAGE], 0, `${name}: урон очереди`, {crits:false, judge: entry => [damageTable(entry, autofireMultiplier(data)), weaknessNote(), ammoNote(data)].filter(Boolean).join('. ')});
    return;
  }
  const loaded = loadedAmmo(data);
  // Яд, ЭМИ, газ и т. п. урона оружия не наносят: цель делает проверку, при провале — эффект.
  if(loaded && loaded.type in ammoNoDamage){
    const [ammoName,,,effect] = ammoTypes[loaded.type];
    const dice = parseDamage(ammoNoDamage[loaded.type]);
    if(!dice){ toast(`${name}, ${ammoName}: ${effect}`); return; }
    rollDicePool([{sides:dice.sides,count:dice.count}], dice.bonus, `${name}: ${ammoName.toLowerCase()} — урон мимо брони`, {crits:false, judge: () => `Только если цель провалит проверку. ${effect}`});
    return;
  }
  const shell = loaded?.caliber === 'shell';
  const damage = parseDamage(shell ? SHOTGUN_SHELL_DAMAGE : data[1]);
  if(!damage){ toast(`${name}: укажите урон в виде 3d6 или 2d6+2`); return; }
  rollDicePool([{sides:damage.sides,count:damage.count}], damage.bonus, `${name}: ${shell ? 'урон дробью' : 'урон'}`, {crits:false,
    judge: entry => [shell && 'Дробь: один бросок урона для всех целей в конусе перед вами, броня каждой цели уменьшает урон',
      isCriticalDamage(entry) && `КРИТИЧЕСКАЯ ТРАВМА у цели: +${CRITICAL_BONUS_DAMAGE} урона`, weaknessNote(), ammoNote(data)].filter(Boolean).join('. ')});
}
const ammoNote = data => { const loaded = loadedAmmo(data); return loaded && loaded.type !== 'basic' ? `${ammoTypes[loaded.type][0]}: ${ammoTypes[loaded.type][3]}` : ''; };
const weaknessNote = () => soloLevel('weakness') ? `Слабое место: +${soloLevel('weakness')} к урону, если это первое попадание за ход` : '';
// ---------- Боеприпасы: запас в снаряжении и заряженные в оружие ----------
const ammoTypeOptions = (caliber, value) => {
  const group = ammoCalibers[caliber]?.[2];
  const list = Object.entries(ammoTypes).filter(([, item])=>!group || item[2].includes(group));
  return '<option value="">—</option>' + list.map(([id,[name]])=>`<option value="${id}"${id === value ? ' selected' : ''}>${esc(name)}</option>`).join('');
};
// Своё оружие (тип не выбран) может брать любой калибр, холодное — никакой.
const weaponCaliberList = data => isBlank(data?.[8]) ? Object.keys(ammoCalibers) : weaponCalibers[data[8]] || [];
const ammoStock = (caliber, type) => (state.ammo || []).filter(row=>row[0] === caliber && row[1] === type).reduce((sum,row)=>sum + (Number(row[2]) || 0), 0);
// Заряжено: «калибр:тип»; пусто — патроны не связаны со снаряжением (перезарядка без учёта запаса).
function loadedAmmoOptions(data){
  const calibers = weaponCaliberList(data);
  if(!calibers.length) return '<option value="">— не нужны</option>';
  const options = calibers.flatMap(caliber=>Object.entries(ammoTypes).filter(([, item])=>item[2].includes(ammoCalibers[caliber][2]))
    .map(([type,[name]])=>[`${caliber}:${type}`, `${calibers.length > 1 ? `${ammoCalibers[caliber][0]}: ` : ''}${name} (${ammoStock(caliber, type)})`]));
  return '<option value="">— без учёта запаса</option>' + options.map(([id,name])=>`<option value="${id}"${id === data?.[10] ? ' selected' : ''}>${esc(name)}</option>`).join('');
}
const loadedAmmo = data => { const [caliber, type] = String(data?.[10] || '').split(':'); return ammoCalibers[caliber] && ammoTypes[type] ? {caliber, type} : null; };
// Снять патроны из запаса (по строкам снаряжения), вернуть остаток в запас.
function takeAmmo(caliber, type, count){
  let taken = 0;
  (state.ammo || []).forEach(row=>{
    if(taken >= count || row[0] !== caliber || row[1] !== type) return;
    const part = Math.min(Number(row[2]) || 0, count - taken);
    row[2] = String((Number(row[2]) || 0) - part);
    taken += part;
  });
  return taken;
}
function returnAmmo(caliber, type, count){
  if(count <= 0) return;
  if(!state.ammo?.some(row=>row.some(cell=>!isBlank(cell)))) state.ammo = [];
  const row = state.ammo.find(item=>item[0] === caliber && item[1] === type);
  if(row) row[2] = String((Number(row[2]) || 0) + count);
  else state.ammo.push([caliber, type, String(count)]);
}
// После изменения запаса из кода — перерисовать таблицу боеприпасов, чтобы save() прочитал актуальные числа.
function syncAmmoTable(){ renderRows('ammo'); bindInputs(); }
// Зарядить магазин из запаса выбранного типа.
function loadFromStock(index, data){
  const loaded = loadedAmmo(data);
  const magazine = Number(data[6]) || 0;
  const current = Math.max(0, Number(data[2]) || 0);
  const taken = takeAmmo(loaded.caliber, loaded.type, Math.max(0, magazine - current));
  data[2] = String(current + taken);
  setInput(`weapon${index}_2`, data[2]);
  return {taken, magazine, total:current + taken, left:ammoStock(loaded.caliber, loaded.type), name:ammoTypes[loaded.type][0]};
}
// Смена заряженных патронов: остаток в магазине вернуть в запас старого типа и зарядить новым.
function applyWeaponAmmo(key, value){
  const match = /^weapon(\d+)_10$/.exec(key);
  if(!match) return;
  const index = Number(match[1]);
  const data = state.weapon?.[index];
  if(!data) return;
  const before = loadedAmmo(data);
  const current = Math.max(0, Number(data[2]) || 0);
  // Заряженные без учёта запаса патроны не возвращаются: магазин заряжается заново из снаряжения.
  if(before && current) returnAmmo(before.caliber, before.type, current);
  data[10] = value;
  if(current && (before || loadedAmmo(data))){ data[2] = '0'; setInput(`weapon${index}_2`, '0'); }
  refreshWeaponRows();
  if(loadedAmmo(data) && !isBlank(data[6])){
    const result = loadFromStock(index, data);
    toast(`${data[0] || 'Оружие'}: заряжено ${result.name} — ${result.total} / ${result.magazine}, в запасе ${result.left}`);
  }
  syncAmmoTable();
}

function weaponReload(index){
  const data = weaponRow(index);
  if(!data) return;
  const name = data[0] || 'Оружие';
  if(isBlank(data[6])){ toast(`${name}: укажите размер магазина`); return; }
  if(loadedAmmo(data)){
    if((Number(data[2]) || 0) >= Number(data[6])){ toast(`${name}: магазин уже полон`); return; }
    const result = loadFromStock(index, data);
    syncAmmoTable();
    refreshWeaponRows();
    if(persist()) $('#saveStatus').textContent='СОХРАНЕНО '+now();
    toast(result.taken ? `${name}: перезаряжено (${result.name}) — ${result.total} / ${result.magazine}, в запасе ${result.left}` : `${name}: нет патронов «${result.name}» в снаряжении`);
    return;
  }
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
  if(state.roleId) state.roleRank = Math.max(1, Math.min(ROLE_MAX_RANK, Math.floor(numeric('roleRank')) || ROLE_START_RANK));
  normalizeStats();
  normalizeSkills(changedKey);
  // Значения строк собираются по индексу колонки из ключа, а не по порядку в таблице.
  Object.entries(rowTypes).forEach(([type,width])=>{
    if(!$(`#${type}Rows`)) return; // таблица другой роли сейчас не показана — её данные не трогаем
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
  refreshRolePanel();
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
  // Патроны из снаряжения: заряженные вернуть в запас; если калибр подходит — зарядить заново из запаса.
  const data = state.weapon?.[i];
  const before = loadedAmmo(data);
  if(before){
    returnAmmo(before.caliber, before.type, Math.max(0, Number(data[2]) || 0));
    data[2] = '0'; data[6] = magazine; data[8] = value;
    if(!(weaponCalibers[value] || []).includes(before.caliber)){ data[10] = ''; setInput(`weapon${i}_10`, ''); setInput(`weapon${i}_2`, '0'); }
    else loadFromStock(i, data);
    syncAmmoTable();
  }
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
  const deflection = through > 0 && soloLevel('deflection');
  const fullText = deflection ? `${text} Отражение урона: если это первое попадание за ход, урон меньше на ${deflection}.` : text;
  $('#damageResult').textContent = fullText;
  addHistory({kind:'damage', text:fullText});
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
      if(el.classList.contains('grow-field')) autoGrow(el);
      applyArmorInput(key, el.value);
      if(key === 'roleId' && el.value && isBlank(state.roleRank)) setInput('roleRank', ROLE_START_RANK);
      applyWeaponType(key, el.value);
      applyWeaponAmmo(key, el.value);
      applyProgramPreset(key, el.value);
      applyVehiclePreset(key, el.value);
      applyHumanityLoss(key, el.value);
      // Одно и то же значение может быть в нескольких полях (человечность).
      $$(`[data-key="${key}"]`).forEach(other=>{ if(other!==el && other.type!=='checkbox') other.value=el.value; });
      save(key);
      if(key === 'roleId'){ renderRolePanel(); bindInputs(); }
      else if(/^weapon\d+_8$/.test(key)){ renderRows('weapon'); bindInputs(); }
      // Смена калибра сбрасывает неподходящий тип — перерисовать и сохранить; остатки видны в списках «Боеприпасы» у оружия.
      else if(/^ammo\d+_[01]$/.test(key)){ renderRows('ammo'); bindInputs(); save(); refreshWeaponRows(); }
      else if(/^ammo\d+_2$/.test(key)) refreshWeaponRows();
      else if(/^role(Team\d+_4|Vehicles\d+_3|Programs\d+_6)$/.test(key)){ renderRows(key.startsWith('roleTeam') ? 'roleTeam' : key.startsWith('roleVehicles') ? 'roleVehicles' : 'rolePrograms'); bindInputs(); refreshRolePanel(); }
      else if(currentRole()) refreshRoleExtras();
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

// Лист для печати: отдельная компактная вёрстка из данных персонажа (A4, около трёх страниц),
// собирается перед печатью. Значения выводятся текстом, без полей ввода.
// blank — пустой бланк для заполнения от руки: те же разделы, но без значений.
let printBlank = false;
function renderPrintSheet(blank = printBlank){
  const saved = state;
  if(blank) state = migrate({});
  try {
    $('#printSheet').innerHTML = printSheetHtml(blank);
    $('#printSheet').classList.toggle('p-blank', blank);
  } finally {
    state = saved;
  }
}
function printSheetHtml(blank){
  const text = value => isBlank(value) ? '' : esc(String(value).trim());
  const multiline = value => text(value).replace(/\n/g, '<br>');
  const rowsOrBlank = (rows, columns, minimum) => {
    const filled = rows.filter(cells => cells.some(cell => !isBlank(cell)));
    const empty = Array.from({length:Math.max(0, minimum - filled.length)}, () => Array(columns).fill(''));
    return [...filled, ...empty].map(cells => `<tr>${cells.map(cell => `<td>${cell === '' ? '&nbsp;' : cell}</td>`).join('')}</tr>`).join('');
  };
  const table = (className, head, body) => `<table class="p-table ${className}"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  const field = (label, value) => `<div class="p-field"><span>${label}</span><strong>${text(value) || '&nbsp;'}</strong></div>`;
  const section = (title, body, extra = '') => `<section class="p-section ${extra}"><h2>${title}</h2>${body}</section>`;
  const box = checked => checked ? '☑' : '☐';
  const slash = '&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;';

  const hp = maxHp(), emp = numeric('stat9');
  const speed = Math.max(0, numeric('stat7') - statPenalty(7) - (isMortallyWounded() ? 6 : 0));
  const statBoxes = stats.map((name,i)=>{
    const value = blank ? (i === 6 || i === 9 ? slash : '&nbsp;')
      : i === 6 ? `${numeric('luckCurrent')}/${numeric('stat6')}` : i === 9 && currentEmp() !== emp ? `${currentEmp()}/${emp}` : numeric(`stat${i}`);
    return `<div class="p-stat"><span>${name}</span><strong>${value}</strong></div>`;
  }).join('');
  const derived = [
    ['Хиты', blank ? slash : `${numeric('currentHp')} / ${hp}`],
    ['Порог ранения', blank ? '&nbsp;' : Math.ceil(hp/2)],
    ['Испытание смерти', blank ? '&lt;' : esc(`< ${numeric('stat8')}${numeric('deathSavePenalty') ? ` (+${numeric('deathSavePenalty')})` : ''}`)],
    ['Скорость', blank ? '&nbsp;' : speed],
    ['Человечность', blank ? slash : `${numeric('humanityCurrent')} / ${emp*10}`]
  ].map(([label,value])=>`<div class="p-stat p-derived"><span>${label}</span><strong>${value}</strong></div>`).join('');
  const armorName = zone => armorPresets[state[`armor${zone}Type`]]?.[0] || '';
  const armorValue = zone => blank ? '' : `SP ${numeric(`armor${zone}Current`)} / ${numeric(`armor${zone}`)}${armorName(zone) ? ' — ' + armorName(zone) : ''}`;
  const wounds = `<div class="p-wounds">${box(!blank && isChecked('seriousWound'))} Тяжёлое ранение (−2 ко всем действиям) &nbsp;&nbsp; ${box(!blank && isMortallyWounded())} Смертельное ранение (−4, −6 СКО)</div>`;
  const armor = `<div class="p-grid p-grid-3">
    ${field('Голова: SP текущее / макс.', armorValue('Head'))}
    ${field('Тело: SP текущее / макс.', armorValue('Body'))}
    ${field('Штраф РЕФ/ЛВК/СКО', blank ? '' : armorPenalty() ? `−${armorPenalty()}` : '0')}
  </div>${wounds}`;

  const weaponRows = (state.weapon || []).map(data=>{
    const skill = skills.indexOf(data[5]);
    const multiplier = autofireMultiplier(data);
    const attack = skill >= 0 ? `+${refTotal(`b${skill}`)}` : '';
    const autofire = multiplier ? `×${multiplier}, +${refTotal(`b${skills.indexOf(AUTOFIRE_SKILL)}`)}${isAutofireOn(data) ? ' (вкл.)' : ''}` : '';
    const ammo = isBlank(data[2]) && isBlank(data[6]) ? '' : `${text(data[2])} / ${text(data[6])}${loadedAmmo(data) ? ` ${esc(ammoTypes[loadedAmmo(data).type][0].toLowerCase())}` : ''}`;
    const loaded = loadedAmmo(data);
    const damage = loaded && loaded.type in ammoNoDamage ? (ammoNoDamage[loaded.type] ? `${ammoNoDamage[loaded.type]} мимо брони` : 'эффект')
      : loaded?.caliber === 'shell' ? `${SHOTGUN_SHELL_DAMAGE} дробь` : text(data[1]);
    return [text(data[0]), text(weaponTypes[data[8]]?.[0]), text(data[5]), attack, damage, ammo, text(data[3]), autofire, text(data[4])];
  });
  const skillBlocks = Object.entries(skillCategories).map(([category, entries])=>{
    const rows = entries.flatMap(([name, stat])=>{
      const variants = (state.customSkills || []).map((item,j)=>item.base === name ? `c${j}` : null).filter(Boolean);
      return [`b${skills.indexOf(name)}`, ...variants].map(ref=>{
        const level = refLevel(ref);
        return blank
          ? `<tr><td>${esc(refLabel(ref))}${basicSkills.includes(name) ? ' <small>Б</small>' : ''}</td><td>${esc(stat)}</td><td></td><td></td></tr>`
          : `<tr class="${level ? 'is-trained' : ''}"><td>${esc(refLabel(ref))}</td><td>${esc(stat)}</td><td>${level}</td><td>${refTotal(ref)}</td></tr>`;
      });
    }).join('');
    return `<div class="p-skill-group"><h3>${category}</h3><table class="p-table p-skills"><tbody>${rows}</tbody></table></div>`;
  }).join('');
  const cyberRows = Object.entries(cyberSections).flatMap(([key,[title]])=>(state.cyberSlots?.[key] || [])
    .filter(row=>row.some(cell=>!isBlank(cell)))
    .map(row=>[esc(title), multiline(row[0]), multiline(row[1]), text(row[2])]));
  const lifeRows = [['Псевдоним', state.lifeAlias], ...lifeFields.map((name,i)=>[name, state[`life${i}`]])];
  const portrait = !blank && isSafeImage(state.portrait) ? `<img class="p-portrait" src="${state.portrait}" alt="">` : '';
  const cyberTitle = blank ? 'Киберимпланты' : `Киберимпланты <small>человечность ${numeric('humanityCurrent')} / ${emp*10}, потеря ${humanityLoss()}</small>`;

  return `
    <header class="p-header">
      ${portrait}
      <div class="p-title">
        <div class="p-brand">CYBERPUNK <b>RED</b> // ЛИСТ ПЕРСОНАЖА</div>
        ${blank ? field('Имя персонажа', '') : `<h1>${text(state.name) || '&nbsp;'}</h1>`}
        <div class="p-grid p-grid-4">${field(blank ? 'Роль и ранг' : 'Роль', blank ? '' : currentRole() ? `${currentRole().name}, ранг ${roleRank()}` : state.role)}${field('Репутация', state.reputation)}${field('Евродоллары', state.eddies)}${field('Очки улучшения', state.ip)}</div>
        <div class="p-grid p-grid-1">${field('Особая способность', state.ability)}</div>
      </div>
    </header>
    ${section('Характеристики', `<div class="p-stats">${statBoxes}</div><div class="p-stats p-stats-derived">${derived}</div>`)}
    ${section('Броня и здоровье', armor)}
    ${section('Оружие', table('p-weapons', ['Оружие','Тип','Навык','Атака','Урон','Патроны','ROF','Очередь','Заметки'], rowsOrBlank(weaponRows, 9, blank ? 7 : 4)))}
    <div class="p-grid p-grid-2">
      ${section('Критические травмы', `<div class="p-note">${multiline(state.criticalInjuries) || '&nbsp;'}</div>`)}
      ${section('Зависимости', `<div class="p-note">${multiline(state.addictions) || '&nbsp;'}</div>`)}
    </div>
    <div class="p-grid p-grid-gear">
      ${section('Снаряжение', table('p-gear', ['Предмет','Кол-во','Заметка'], rowsOrBlank((state.gear || []).map(row=>row.map(text)), 3, blank ? 8 : 5)))}
      ${section('Боеприпасы', table('p-ammo', ['Калибр','Тип','Кол-во'], rowsOrBlank((state.ammo || []).map(row=>[text(ammoCalibers[row[0]]?.[0]), text(ammoTypes[row[1]]?.[0]), text(row[2])]), 3, blank ? 8 : 5)))}
    </div>
    ${section(`Навыки <small>стат · уровень · итог${blank ? ' · Б — базовый навык, при создании не ниже 2' : ''}</small>`, `<div class="p-skill-columns">${skillBlocks}</div>`, 'p-page-break')}
    ${section(cyberTitle, table('p-cyber', ['Слот','Имплант','Информация','ПЧ'], rowsOrBlank(cyberRows, 4, blank ? 8 : 4)), 'p-page-break')}
    ${section('Жизненный путь', `<div class="p-grid p-grid-2">${[['Образ жизни', state.lifeStyle], ['Арендная плата', state.lifeRent], ['Жильё', state.lifeHousing], ['Образ и стиль', state.lifeLook], ...lifeRows].map(([label,value])=>field(esc(label), value)).join('')}</div>`)}
    ${section('Связи', table('p-relations', ['Персонаж','Кто это?','Что ему нужно?'], rowsOrBlank((state.relationship || []).map(row=>row.map(text)), 3, blank ? 6 : 4)))}
    ${blank || !currentRole() ? '' : printRoleSection(section, table, rowsOrBlank, text, multiline)}
    ${section('Заметки', `<div class="p-note">${[multiline(state.roleplay), multiline(state.sessionNotes)].filter(Boolean).join('<br><br>') || '&nbsp;'}</div>`)}
  `;
}
function printRoleSection(section, table, rowsOrBlank, text, multiline){
  const role = currentRole(), id = state.roleId;
  const specialties = (role.specialties || []).filter(item=>numeric(rolePointsKey(id, item.key)))
    .map(item=>`${esc(item.name)} — ${numeric(rolePointsKey(id, item.key))}`).join('; ');
  const net = role.interfaceAbilities ? `NET-действий за ход: ${netActions(roleRank())}${isBlank(state.netDeck) ? '' : `; кибердека: ${text(state.netDeck)}`}${isBlank(state.netSlots) ? '' : `, слотов ${text(state.netSlots)}`}` : '';
  const programs = role.table?.key === 'rolePrograms';
  const head = programs ? ['Программа','Класс','ATK','DEF','REZ','Вкл','Урон / свойство','Эффект'] : role.table?.columns.map(esc);
  const tableRows = (state[role.table?.key] || []).map(row=>programs
    ? [text(row[0]), text(row[1]), text(row[2]), text(row[3]), isBlank(row[4]) ? '' : `${text(isBlank(row[7]) ? row[4] : row[7])} / ${text(row[4])}`, row[8] === '1' ? '✓' : '', [text(row[11]), !isBlank(row[12]) && `Ч.ЛЁД ${text(row[12])}`].filter(Boolean).join(', '), text(row[5])]
    : rowColumns[role.table.key].map(({j,select})=>select === 'teamType' ? text(execSubordinates[row[j]]?.name) : select === 'vehicleType' ? text(vehicleTypes[row[j]]?.[0]) : text(row[j])));
  const rows = role.table ? table('p-role', head, rowsOrBlank(tableRows, head.length, 2)) : '';
  const notes = multiline(state[`roleNotes_${id}`]);
  return section(`${esc(role.ability)} <small>${esc(role.name)}, ранг ${roleRank()}</small>`,
    [specialties && `<p>${specialties}</p>`, net && `<p>${net}</p>`, rows, notes && `<div class="p-note">${notes}</div>`].filter(Boolean).join(''));
}
function printSheet(blank){
  printBlank = blank;
  renderPrintSheet();
  window.print();
}

// Вкладка роли: появляется после выбора роли и собирается из описания роли в data.js.
function renderRolePanel(){
  const role = currentRole(), id = state.roleId;
  const tab = $('#roleTab'), panel = $('#role');
  tab.hidden = !role;
  if(!role){
    panel.innerHTML = '';
    if(panel.classList.contains('active')) switchTab('character');
    return;
  }
  tab.textContent = `06 // ${role.name}`;
  const specialties = role.specialties ? `<div class="panel role-specialties">
      <div class="section-title">НАПРАВЛЕНИЯ <span id="rolePointsInfo"></span></div>
      <table class="data-table"><thead><tr><th>Направление</th><th>Цена</th><th>Уровень</th></tr></thead><tbody>${role.specialties.map(item=>`<tr>
        <td><strong>${esc(item.name)}</strong><small>${esc(item.effect)}</small></td>
        <td>${item.cost} оч.</td>
        <td><input data-key="${rolePointsKey(id, item.key)}" type="number" min="0" max="${item.max ?? ROLE_MAX_RANK}" value="${numeric(rolePointsKey(id, item.key))}" aria-label="Уровень: ${esc(item.name)}"></td>
      </tr>`).join('')}</tbody></table>
    </div>` : '';
  const net = role.interfaceAbilities ? `<div class="panel role-net">
      <div class="section-title">СЕТЬ <span id="netActionsInfo"></span></div>
      <div class="armor-form">
        <label>Кибердека<input data-key="netDeck" value="${esc(state.netDeck || '')}" placeholder="Модель кибердеки"></label>
        <label>Слоты программ<input data-key="netSlots" type="number" min="0" value="${esc(state.netSlots ?? '')}"></label>
      </div>
      <div class="net-attack">
        <div class="net-block-title">АТАКА РАЗРЯДОМ <small>базовая атака по программе или нетраннеру</small></div>
        <div class="role-buttons">
          <button type="button" class="weapon-btn" data-interface="zap" title="Бросок на попадание: Интерфейс + 1d10; результат назовите мастеру">ПОПАДАНИЕ: ИНТЕРФЕЙС + 1D10</button>
          <button type="button" class="weapon-btn" data-zap-damage title="Урон Разряда после попадания: 1d6 программе или мозгу нетраннера">УРОН 1D6</button>
        </div>
      </div>
      <div class="net-block-title">ФУНКЦИИ ИНТЕРФЕЙСА <small>проверка: Интерфейс + 1d10</small></div>
      <div class="role-buttons">${role.interfaceAbilities.filter(([key])=>key !== 'zap').map(([key,name,hint])=>`<button type="button" class="weapon-btn" data-interface="${key}" title="Интерфейс + 1d10: ${esc(hint)}">${esc(name)}</button>`).join('')}</div>
      <div class="net-summary"><span id="netBoostSummary"></span> <strong id="netBoostExtra"></strong></div>
      <div class="armor-form net-brain">
        <label>Урон по мозгу<input id="brainDamage" type="number" min="0" placeholder="0"></label>
        <button type="button" class="death-save-button" data-brain-damage title="Урон от ЛЁДа и программ: мимо брони, с учётом включённых защитников">ПРИНЯТЬ УРОН</button>
      </div>
      <div class="damage-result" id="netDamageResult"></div>
    </div>` : '';
  const table = role.table ? `<div class="panel role-table-panel">
      <div class="section-title">${esc(role.table.title).toUpperCase()} <span id="roleTableInfo"></span></div>
      ${cardRenderers[role.table.key] ? `<div class="${role.table.key === 'roleTeam' ? 'team-cards' : role.table.key === 'rolePrograms' ? 'program-cards' : 'team-cards'}" id="${role.table.key}Rows"></div>` : `<div class="table-scroll"><table class="data-table role-table${role.table.key === 'rolePrograms' ? ' program-table' : ''}"><thead><tr>${role.table.columns.map(column=>`<th>${esc(column)}</th>`).join('')}<th></th></tr></thead><tbody id="${role.table.key}Rows"></tbody></table></div>`}
      <button class="add-row" data-add="${role.table.key}">+ ДОБАВИТЬ</button>
    </div>` : '';
  panel.innerHTML = `
    <div class="page-heading">
      <div><span class="eyebrow">ROLE ABILITY // 06</span><h1>${esc(role.name).toUpperCase()}</h1></div>
      <div class="role-rank">
        <label>РАНГ<input data-key="roleRank" type="number" min="1" max="${ROLE_MAX_RANK}" value="${roleRank()}" aria-label="Ранг способности роли"></label>
        <button type="button" class="skill-upgrade" data-role-upgrade hidden></button>
      </div>
    </div>
    <div class="role-grid">
      <div class="panel role-ability">
        <div class="section-title">${esc(role.ability).toUpperCase()}</div>
        <p>${esc(role.text)}</p>
        ${role.roll ? `<button type="button" class="primary role-roll" data-role-roll>${esc(role.roll).toUpperCase()}: 1D10 + РАНГ</button>` : ''}
      </div>
      ${specialties}${net}${roleExtraPanels(id)}${table}
      <div class="panel role-notes">
        <div class="section-title">ЗАМЕТКИ РОЛИ</div>
        <textarea data-key="roleNotes_${id}" rows="5" placeholder="Особенности, договорённости, долги, что обещано…">${esc(state[`roleNotes_${id}`] || '')}</textarea>
      </div>
    </div>`;
  if(role.table) renderRows(role.table.key);
  refreshRolePanel();
}
// ---------- Дополнительные панели ролей ----------
const optionList = (entries, value) => entries.map(([id,name])=>`<option value="${esc(id)}"${String(id) === String(value) ? ' selected' : ''}>${esc(name)}</option>`).join('');
const roleSelect = (key, label, entries, fallback) => `<label>${label}<select data-key="${key}">${optionList(entries, state[key] ?? fallback)}</select></label>`;
const roleCheck = (key, label) => `<label class="check-row"><input type="checkbox" data-key="${key}"${isChecked(key) ? ' checked' : ''}> ${label}</label>`;
const tierFor = (tiers, rank) => [...tiers].reverse().find(tier=>rank >= tier[0]) || tiers[0];
const techSkillEntries = () => skills.map((name,i)=>[name,i]).filter(([,i])=>skillStatIndex(i) === 3).map(([name])=>[name, name]);
// Бросок из частей: [[значение, подпись], …] + 1d10 (+ удача, если её можно тратить).
function rollParts(label, parts, {judge, luck = true, crits = true} = {}){
  const spent = luck ? spendLuck() : 0;
  const all = [...parts, [spent, 'удача']].filter(([value])=>value);
  const modifier = all.reduce((sum,[value])=>sum + value, 0);
  return rollDicePool([{sides:10,count:1}], modifier, withNotes(label, all.map(([value,note])=>`${note} ${value >= 0 ? '+' : '−'}${Math.abs(value)}`)), {judge, crits});
}
const beats = dv => entry => entry.total > dv ? `УСПЕХ (СЛ ${dv})` : `ПРОВАЛ (СЛ ${dv}; при равенстве — провал)`;
const skillPart = name => { const i = skills.indexOf(name); return [refLevel(`b${i}`), name.replace(' (x2)', '')]; };

function roleExtraPanels(id){
  const panel = (title, body, info = '') => `<div class="panel role-extra"><div class="section-title">${title}${info ? ` <span data-role-info="${info}"></span>` : ''}</div>${body}</div>`;
  if(id === 'rockerboy') return panel('ВЛИЯНИЕ НА ФАНАТОВ', `
    <div class="armor-form">${roleSelect('rbTarget', 'На кого', Object.entries(rockerTargets).map(([key,[name,dv]])=>[key, `${name} — СЛ ${dv}`]), 'fan')}</div>
    <button type="button" class="primary role-roll" data-role-action="rbRoll">ХАРИЗМАТИЧЕСКОЕ ДАВЛЕНИЕ: РАНГ + 1D10</button>
    <div class="role-info" data-role-info="rbTier"></div>`);
  if(id === 'tech') return panel('РАБОТА СОЗДАТЕЛЯ', `
    <div class="armor-form">
      ${roleSelect('techWork', 'Работа', [['upgrade','Модернизация'],['fabrication','Изготовление'],['invention','Изобретение']], 'upgrade')}
      ${roleSelect('techPrice', 'Ценовая категория', Object.entries(priceCategories).map(([key,[name,dv,time]])=>[key, `${name} — СЛ ${dv}, ${time}`]), 'costly')}
      ${roleSelect('techSkill', 'ТЕХ-навык ремонта предмета', techSkillEntries(), 'Знания техники')}
    </div>
    <button type="button" class="primary role-roll" data-role-action="techRoll">БРОСОК: ТЕХ + НАВЫК + РАНГ СПЕЦИАЛИЗАЦИИ + 1D10</button>
    <div class="role-info" data-role-info="techInfo"></div>`);
  if(id === 'medtech') return panel('МЕДИЦИНСКИЕ НАВЫКИ', `
    <div class="role-info" data-role-info="medSkills"></div>
    <div class="role-buttons">
      <button type="button" class="weapon-btn" data-role-action="medSurgery">ХИРУРГИЯ: ТЕХ + НАВЫК + 1D10</button>
      <button type="button" class="weapon-btn" data-role-action="medTech">МЕДТЕХНОЛОГИИ: ТЕХ + НАВЫК + 1D10</button>
    </div>`) + panel('ФАРМАЦЕВТИКА', `
    <table class="data-table med-drugs"><thead><tr><th>Изучен</th><th>Препарат</th><th>Доз</th><th></th></tr></thead><tbody>${Object.entries(medDrugs).map(([key,[name,effect]])=>`<tr>
      <td class="auto-cell"><input type="checkbox" data-key="medKnown_${key}"${isChecked(`medKnown_${key}`) ? ' checked' : ''} aria-label="Изучен: ${esc(name)}"></td>
      <td><strong>${esc(name)}</strong><small>${esc(effect)}</small></td>
      <td><input data-key="medDoses_${key}" type="number" min="0" value="${numeric(`medDoses_${key}`)}" aria-label="Доз: ${esc(name)}"></td>
      <td class="row-actions"><button type="button" class="weapon-btn" data-role-action="drugSynth" data-drug="${key}" title="Синтез: СЛ ${MED_SYNTH_DV}, 1 час, 200eb">СИНТЕЗ</button><button type="button" class="weapon-btn" data-role-action="drugUse" data-drug="${key}" title="Ввести одну дозу (действие)">ВВЕСТИ</button>${key === 'speedheal' ? '<button type="button" class="weapon-btn" data-role-action="drugSelf" data-drug="speedheal" title="Ввести себе: +ТЕЛ + ВОЛЯ к ПЗ">СЕБЕ</button>' : ''}</td>
    </tr>`).join('')}</tbody></table>`, 'medKnownInfo') + panel('КРИОСИСТЕМЫ', '<div class="role-info" data-role-info="cryoInfo"></div>');
  if(id === 'media') return panel('СЛУХИ', `
    <div class="armor-form">
      ${roleSelect('mediaSkill', 'Навык поиска', mediaSkills.map(name=>[name,name]), 'Поиск информации')}
    </div>
    <div class="role-buttons">
      <button type="button" class="weapon-btn" data-role-action="rumorPassive" title="Обычно бросает мастер, тайно, дважды в неделю">ПАССИВНО: ДОВЕРИЕ + 1D10</button>
      <button type="button" class="weapon-btn" data-role-action="rumorActive">АКТИВНЫЙ ПОИСК: СТАТ + НАВЫК + 1D10</button>
    </div>`) + panel('ПУБЛИКАЦИЯ', `
    ${roleCheck('mediaProof1', 'Есть хотя бы одно легко проверяемое доказательство (+1)')}
    ${roleCheck('mediaProof4', 'Больше 4 неопровержимых доказательств (+2)')}
    <button type="button" class="primary role-roll" data-role-action="mediaPublish">ПРОВЕРКА ДОСТОВЕРНОСТИ: 1D10</button>
    <div class="role-info" data-role-info="mediaTier"></div>`);
  if(id === 'exec') return panel('БОНУСЫ КОРПОРАЦИИ', '<div class="role-info" data-role-info="execPerks"></div>') + panel('НАЙМ И ЛОЯЛЬНОСТЬ', `
    <div class="armor-form">${roleSelect('execHireType', 'Тип подчинённого', Object.entries(execSubordinates).map(([key,item])=>[key, item.name]), 'bodyguard')}</div>
    <button type="button" class="weapon-btn" data-role-action="execHire" title="СТАТы — бросок 1d6 по таблице типа, лояльность — 1d6 + 1">НАНЯТЬ: БРОСИТЬ СТАТЫ</button>
    <div class="armor-form">
      <label>Подчинённый<select data-role-select="execMember"></select></label>
      ${roleSelect('execEvent', 'Событие', Object.entries(loyaltyEvents).map(([key,[name,value]])=>[key, `${value > 0 ? '+' : ''}${value}: ${name}`]), 'praise')}
    </div>
    <button type="button" class="weapon-btn" data-role-action="execLoyalty">ИЗМЕНИТЬ ЛОЯЛЬНОСТЬ</button>`, 'execTeamInfo');
  if(id === 'lawman') return panel('ВЫЗОВ ПОДКРЕПЛЕНИЯ', `
    <div class="armor-form"><label>Кого вызвать<select data-key="lawTier"></select></label></div>
    <button type="button" class="primary role-roll" data-role-action="lawCall">ВЫЗВАТЬ: D10 НЕ БОЛЬШЕ РАНГА</button>
    <div class="role-info" data-role-info="lawTable"></div>`);
  if(id === 'fixer') return panel('ВОРОТИЛА', `
    <button type="button" class="primary role-roll" data-role-action="fixerHaggle">ТОРГ: ХАР + ТОРГОВЛЯ + РАНГ + 1D10</button>
    <div class="role-info" data-role-info="fixerTier"></div>`);
  if(id === 'nomad') return panel('АВТОПАРК СЕМЬИ', '<div class="role-info" data-role-info="nomadFleet"></div>');
  return '';
}

function refreshRoleExtras(){
  const id = state.roleId, rank = roleRank();
  const info = name => $(`[data-role-info="${name}"]`);
  const list = items => `<ul class="role-list">${items.map(([on, html])=>`<li class="${on ? '' : 'is-locked'}">${html}</li>`).join('')}</ul>`;
  if(id === 'rockerboy' && info('rbTier')){
    const [, venue, ...effects] = tierFor(rockerTiers, rank);
    const target = state.rbTarget || 'fan';
    info('rbTier').innerHTML = `<p><strong>Где выступаете:</strong> ${esc(venue)}</p>` + list(Object.keys(rockerTargets).map((key,i)=>[true, `<span class="${key === target ? 'is-current' : ''}"><strong>${esc(rockerTargets[key][0])} (СЛ ${rockerTargets[key][1]}):</strong> ${esc(effects[i])}</span>`]));
  }
  if(id === 'tech' && info('techInfo')){
    const work = state.techWork || 'upgrade', [, dv, time] = priceCategories[state.techPrice || 'costly'];
    const notes = {upgrade:'Материалы той же ценовой категории, что и модернизируемый предмет (транспорт — как «Очень дорогое»).',
      fabrication:'Материалы на одну ценовую категорию дешевле (Супер роскошь — половина цены).',
      invention:'Опишите изобретение мастеру: он утверждает цену (минимум «Дорогое») и эффект.'};
    info('techInfo').innerHTML = `<p>СЛ ${dv}, время ${esc(time)}. Ранг специализации: ${numeric(rolePointsKey('tech', work))}. ${esc(notes[work])}</p><p>Полевая экспертиза ${numeric(rolePointsKey('tech','field'))}: «подлатать» предмет на ${numeric(rolePointsKey('tech','field')) * 10} минут; бонус к ТЕХ-навыкам учтён в навыках.</p>`;
  }
  if(id === 'medtech' && info('medSkills')){
    info('medSkills').innerHTML = `<p><strong>Хирургия:</strong> ${medSurgeryLevel()} (итог ${medSurgeryLevel() + statValue(3)}) · <strong>Медицинские технологии:</strong> ${medTechLevel()} (итог ${medTechLevel() + statValue(3)})</p>`;
    const known = Object.keys(medDrugs).filter(key=>isChecked(`medKnown_${key}`)).length, allowed = numeric(rolePointsKey('medtech','pharma'));
    info('medKnownInfo').textContent = `ИЗУЧЕНО ${known} / ${allowed}`;
    info('medKnownInfo').classList.toggle('is-over', known > allowed);
    const cryo = numeric(rolePointsKey('medtech','cryo'));
    info('cryoInfo').innerHTML = list(cryoBenefits.map((text,i)=>[i < cryo, `${i + 1}: ${esc(text)}`]));
  }
  if(id === 'media' && info('mediaTier')){
    const [, access, audience, chance, impact] = tierFor(mediaTiers, rank);
    const bonus = (isChecked('mediaProof1') ? 1 : 0) + (isChecked('mediaProof4') ? 2 : 0);
    info('mediaTier').innerHTML = `<p><strong>Аудитория поверит:</strong> ${Math.min(10, chance + bonus)} из 10${bonus ? ` (${chance} + ${bonus} за доказательства)` : ''}</p>` + list([[true, `<strong>Доступ:</strong> ${esc(access)}`],[true, `<strong>Аудитория:</strong> ${esc(audience)}`],[true, `<strong>Влияние:</strong> ${esc(impact)}`]]);
  }
  if(id === 'exec' && info('execPerks')){
    info('execPerks').innerHTML = list(execPerks.map(([from, text])=>[rank >= from, `<strong>Ранг ${from}:</strong> ${esc(text)}`]));
    const allowed = execSubordinateRanks.filter(from=>rank >= from).length, have = (state.roleTeam || []).filter(row=>!isBlank(row[0]) || !isBlank(row[4])).length;
    info('execTeamInfo').textContent = `ПОДЧИНЁННЫХ ${have} / ${allowed}`;
    info('execTeamInfo').classList.toggle('is-over', have > allowed);
    const member = $('[data-role-select="execMember"]');
    if(member){
      const value = member.value;
      member.innerHTML = (state.roleTeam || []).map((row,i)=>[i, row[0] || execSubordinates[row[4]]?.name || `Строка ${i + 1}`]).map(([i,name])=>`<option value="${i}"${String(i) === value ? ' selected' : ''}>${esc(name)} (лояльность ${esc(state.roleTeam[i][2] || 0)})</option>`).join('');
    }
  }
  if(id === 'lawman' && info('lawTable')){
    const select = $('[data-key="lawTier"]');
    if(select){
      const available = lawmanBackup.filter(([from])=>rank >= from);
      const current = Math.min(Number(state.lawTier ?? available.length - 1), available.length - 1);
      select.innerHTML = available.map(([from, to, who],i)=>`<option value="${i}"${i === current ? ' selected' : ''}>Ранг ${from === to ? from : `${from}–${to}`}: ${esc(who.split(':')[0])}</option>`).join('');
    }
    info('lawTable').innerHTML = `<div class="table-scroll"><table class="data-table law-table"><thead><tr><th>Ранг</th><th>Кто приезжает</th><th>БН</th><th>ОС</th><th>ПЗ</th><th>СКО/ТЕЛ</th></tr></thead><tbody>${lawmanBackup.map(([from,to,who,bn,sp,hp,move])=>`<tr class="${rank >= from ? '' : 'is-locked'}"><td>${from === to ? from : `${from}–${to}`}</td><td>${esc(who)}</td><td>${bn}</td><td>${sp}</td><td>${hp}</td><td>${move}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if(id === 'fixer' && info('fixerTier')){
    const [, contacts, goods, haggle, culture] = tierFor(fixerTiers, rank);
    info('fixerTier').innerHTML = list([[true, `<strong>Связи и клиенты:</strong> ${esc(contacts)}`],[true, `<strong>Можно достать:</strong> ${esc(goods)}`],[true, `<strong>Торг:</strong> ${esc(haggle)}`],[true, `<strong>Свой чел:</strong> ${esc(culture)}`]]);
  }
  if(id === 'nomad' && info('nomadFleet')){
    const vehicles = (state.roleVehicles || []).filter(row=>!isBlank(row[0]) || !isBlank(row[3]));
    const upgrades = vehicles.reduce((sum,row)=>sum + String(row[1] || '').split(/[,;\n]/).filter(part=>part.trim()).length, 0);
    info('nomadFleet').innerHTML = `<p><strong>Мото +${rank}</strong> к ${motoSkills.map(name=>name.replace(' (x2)','')).join(', ')}.</p>
      <p><strong>Выборов автопарка:</strong> ${vehicles.length + upgrades} из ${rank} (транспорт ${vehicles.length}, улучшений ${upgrades}).</p>
      <p><strong>Доступный транспорт:</strong> ${Object.values(vehicleTypes).filter(item=>rank >= item[5]).map(item=>esc(item[0])).join(', ')}</p>
      <p><strong>Улучшения:</strong></p>` + list(nomadUpgrades.map(([name, from, kind])=>[rank >= from, `${esc(name)} <small>— ранг ${from}, ${esc(kind)}</small>`]));
  }
}

const medSurgeryLevel = () => Math.min(10, numeric(rolePointsKey('medtech','surgery')) * 2);
const medTechLevel = () => Math.min(10, numeric(rolePointsKey('medtech','pharma')) + numeric(rolePointsKey('medtech','cryo')));
const wound = () => [-woundPenalty(), 'ранение'];

function roleAction(action, data){
  const rank = roleRank();
  if(action === 'rbRoll'){
    const [name, dv] = rockerTargets[state.rbTarget || 'fan'];
    rollParts(`Харизматическое давление: ${name}`, [[rank, 'ранг']], {judge: beats(dv)});
  }
  if(action === 'techRoll'){
    const work = state.techWork || 'upgrade', [price, dv, time] = priceCategories[state.techPrice || 'costly'];
    const skill = state.techSkill || 'Знания техники';
    const names = {upgrade:'Модернизация', fabrication:'Изготовление', invention:'Изобретение'};
    rollParts(`${names[work]} (${price})`, [[statValue(3), 'ТЕХ'], skillPart(skill), [numeric(rolePointsKey('tech', work)), 'специализация'], wound()],
      {judge: entry => entry.total > dv ? `УСПЕХ (СЛ ${dv}), время ${time}` : `ПРОВАЛ (СЛ ${dv}): потрачена половина времени, материалы целы`});
  }
  if(action === 'medSurgery') rollParts('Хирургия', [[statValue(3), 'ТЕХ'], [medSurgeryLevel(), 'Хирургия'], wound()]);
  if(action === 'medTech') rollParts('Медицинские технологии', [[statValue(3), 'ТЕХ'], [medTechLevel(), 'Медтехнологии'], wound()]);
  if(action === 'drugSynth'){
    const key = data.drug, [name] = medDrugs[key];
    if(!isChecked(`medKnown_${key}`)){ toast(`${name}: препарат не изучен`); return; }
    const entry = rollParts(`Синтез: ${name}`, [[statValue(3), 'ТЕХ'], [medTechLevel(), 'Медтехнологии'], wound()],
      {judge: entry => entry.total > MED_SYNTH_DV ? `УСПЕХ (СЛ ${MED_SYNTH_DV}): +${medTechLevel()} доз, 1 час, 200eb` : `ПРОВАЛ (СЛ ${MED_SYNTH_DV}): материалы пропали`});
    if(entry.total > MED_SYNTH_DV){
      state[`medDoses_${key}`] = numeric(`medDoses_${key}`) + medTechLevel();
      setInput(`medDoses_${key}`, state[`medDoses_${key}`]);
      persist();
    }
  }
  if(action === 'drugUse' || action === 'drugSelf'){
    const key = data.drug, [name, effect] = medDrugs[key];
    if(numeric(`medDoses_${key}`) <= 0){ toast(`${name}: доз нет`); return; }
    state[`medDoses_${key}`] = numeric(`medDoses_${key}`) - 1;
    setInput(`medDoses_${key}`, state[`medDoses_${key}`]);
    let text = `${name}: введена доза — ${effect}`;
    if(action === 'drugSelf'){
      if(isMortallyWounded()) text += '. Не действует: смертельное ранение';
      else {
        const heal = numeric('stat8') + numeric('stat5'), before = numeric('currentHp');
        state.currentHp = Math.min(maxHp(), before + heal);
        syncWoundsWithHp(); fillStaticInputs(); updateDerived();
        text += `. ХИТЫ ${before} → ${state.currentHp}`;
      }
    }
    addHistory({kind:'damage', text});
    toast(text);
    persist();
  }
  if(action === 'rumorPassive'){
    rollParts('Слухи (пассивно)', [[rank, 'Доверие']], {luck:false});
  }
  if(action === 'rumorActive'){
    const skill = state.mediaSkill || 'Поиск информации', i = skills.indexOf(skill);
    rollParts(`Поиск слухов: ${skill}`, [[refTotal(`b${i}`), skill]]);
  }
  if(action === 'mediaPublish'){
    const [, , , chance] = tierFor(mediaTiers, rank);
    const target = Math.min(10, chance + (isChecked('mediaProof1') ? 1 : 0) + (isChecked('mediaProof4') ? 2 : 0));
    rollDicePool([{sides:10,count:1}], 0, 'Достоверность публикации', {crits:false, judge: entry => entry.die <= target ? `ПОВЕРИЛИ (${target} из 10)` : `НЕ ПОВЕРИЛИ (${target} из 10)`});
  }
  if(action === 'execHire'){
    const type = state.execHireType || 'bodyguard', item = execSubordinates[type];
    const roll = d(6), stats = item.stats[roll - 1], loyalty = d(6) + 1;
    if(!state.roleTeam?.some(row=>row.some(cell=>!isBlank(cell)))) state.roleTeam = [];
    state.roleTeam.push([item.name, item.job, String(loyalty), '', type, stats.map((value,i)=>`${execStatNames[i]} ${value}`).join(' · ')]);
    renderRows('roleTeam'); bindInputs(); save();
    addHistory({kind:'damage', text:`Нанят: ${item.name} (СТАТы по 1d6 = ${roll}, лояльность 1d6 + 1 = ${loyalty})`});
    toast(`Нанят ${item.name}: лояльность ${loyalty}`);
  }
  if(action === 'execLoyalty'){
    const index = Number($('[data-role-select="execMember"]')?.value);
    const row = state.roleTeam?.[index];
    if(!row){ toast('Сначала добавьте подчинённого'); return; }
    const [name, change] = loyaltyEvents[state.execEvent || 'praise'];
    const before = Number(row[2]) || 0;
    row[2] = String(before + change);
    setInput(`roleTeam${index}_2`, row[2]);
    persist(); refreshRoleExtras();
    const who = row[0] || 'Подчинённый';
    toast(`${who}: лояльность ${before} → ${row[2]}${Number(row[2]) <= 0 ? ' — подчинённый уйдёт' : ''}`);
    addHistory({kind:'damage', text:`${who}: ${name} (${change > 0 ? '+' : ''}${change}), лояльность ${before} → ${row[2]}`});
  }
  if(action === 'loyaltyCheck'){
    if(!state.roleTeam?.[data.index]) save();
    const row = state.roleTeam?.[data.index];
    if(!row) return;
    const loyalty = Number(row[2]) || 0;
    rollDicePool([{sides:6,count:1}], 0, `Лояльность: ${row[0] || 'подчинённый'} (${loyalty})`, {crits:false});
  }
  if(action === 'vehicleDamage'){
    if(!state.roleVehicles?.[data.index]) save();
    const row = state.roleVehicles?.[data.index];
    const input = $(`[data-vehicle-damage="${data.index}"]`);
    const damage = Math.max(0, Math.floor(Number(input?.value) || 0));
    if(!row || !damage) return;
    const before = Number(row[4]) || 0;
    row[4] = String(Math.max(0, before - damage));
    setInput(`roleVehicles${data.index}_4`, row[4]);
    input.value = '';
    persist(); refreshVehicleCards(); refreshRoleExtras();
    const text = `${row[0] || 'Транспорт'}: −${damage} ПЗТ, ${before} → ${row[4]}${row[4] === '0' ? ' — уничтожен (семья чинит неделю за 500eb)' : ''}`;
    addHistory({kind:'damage', text});
    toast(text);
  }
  if(action === 'vehicleRepair'){
    if(!state.roleVehicles?.[data.index]) save();
    const row = state.roleVehicles?.[data.index];
    if(!row || isBlank(row[5])) return;
    row[4] = row[5];
    setInput(`roleVehicles${data.index}_4`, row[4]);
    persist(); refreshVehicleCards();
    toast(`${row[0] || 'Транспорт'}: ПЗТ восстановлены (${row[5]})`);
  }
  if(action === 'lawCall'){
    const available = lawmanBackup.filter(([from])=>rank >= from);
    const index = Math.min(Number($('[data-key="lawTier"]')?.value ?? available.length - 1), available.length - 1);
    rollDicePool([{sides:10,count:1}], 0, 'Вызов подкрепления', {crits:false, judge: entry => {
      if(entry.die > rank) return `никто не откликнулся (нужно не больше ${rank}); можно повторить в следующем раунде`;
      const arrive = d(6);
      if(arrive < 6) return `откликнулись! Прибудут через ${arrive} р.: ${available[index][2]}`;
      if(index + 1 < lawmanBackup.length) return `откликнулись! На d6 выпало 6 — через 6 раундов прибудет подкрепление выше: ${lawmanBackup[index + 1][2]}`;
      return `откликнулись! На d6 выпало 6 — через 6 раундов прибудут две группы: ${available[index][2]}`;
    }});
  }
  if(action === 'fixerHaggle'){
    rollParts('Торг', [[statValue(4), 'ХАР'], skillPart('Торговля'), [rank, 'Воротила'], wound()]);
  }
}

// Обновляет числа на вкладке роли без перерисовки (чтобы не сбивать фокус).
// ---------- Программы нетраннера ----------
function programPresetSelect(key, value){
  return `<select data-key="${key}" aria-label="Программа из книги"><option value="">Своя</option>${Object.entries(programPresets).map(([id,[name]])=>`<option value="${id}"${id === value ? ' selected' : ''}>${esc(name)}</option>`).join('')}</select>`;
}
function programBoostSelect(key, value, amountKey, amount){
  const abilities = (roles.netrunner.interfaceAbilities || []).map(([id,name])=>[id, `+ ${name.split(' (')[0]}`]);
  const options = [['', '—'], ...abilities, ['speed', '+ Скорость в Сети'], ['brain', '− урон по мозгу']];
  return `<select data-key="${key}" aria-label="Что усиливает программа">${options.map(([id,name])=>`<option value="${id}"${id === value ? ' selected' : ''}>${esc(name)}</option>`).join('')}</select><input type="hidden" data-key="${amountKey}" value="${esc(amount)}">`;
}
const programName = data => data?.[0] || programPresets[data?.[6]]?.[0] || 'Программа';
const isProgramOn = data => data?.[8] === '1';
const isDerezzed = data => !isBlank(data?.[4]) && Number(data[4]) > 0 && !isBlank(data?.[7]) && Number(data[7]) <= 0;
// Бонус активных программ: target — ключ способности Интерфейса, 'speed' или 'brain'.
const programBoosts = target => (state.rolePrograms || []).filter(data=>isProgramOn(data) && data[9] === target)
  .map(data=>[Number(data[10]) || (programPresets[data[6]]?.[7] ?? 2), programName(data).split(' (')[0]]);
const programBoostTotal = target => programBoosts(target).reduce((sum,[value])=>sum + value, 0);
function programRow(index){
  if(!state.rolePrograms?.[index]) save();
  return state.rolePrograms?.[index];
}
// Выбор транспорта из книги заполняет ПЗТ, места и скорость.
function applyVehiclePreset(key, value){
  const match = /^roleVehicles(\d+)_3$/.exec(key);
  const preset = match && vehicleTypes[value];
  if(!preset) return;
  const i = match[1];
  const [name, hp, seats, move, kmh] = preset;
  if(isBlank($(`[data-key="roleVehicles${i}_0"]`)?.value)) setInput(`roleVehicles${i}_0`, name);
  setInput(`roleVehicles${i}_4`, hp);
  setInput(`roleVehicles${i}_5`, hp);
  setInput(`roleVehicles${i}_6`, `${seats} мест, СКО ${move}, ${kmh} км/ч`);
}
// Выбор программы из книги заполняет строку.
function applyProgramPreset(key, value){
  const match = /^rolePrograms(\d+)_6$/.exec(key);
  const preset = match && programPresets[value];
  if(!preset) return;
  const i = match[1];
  const [name, kind, attack, defense, rez, damage, boost, amount, effect, iceDamage = '', rollKind = ''] = preset;
  if(isBlank($(`[data-key="rolePrograms${i}_0"]`)?.value)) setInput(`rolePrograms${i}_0`, name);
  [[1,kind],[2,attack],[3,defense],[4,rez],[7,rez],[11,damage],[12,iceDamage],[13,rollKind],[9,boost],[10,amount],[5,effect]].forEach(([j,v])=>setInput(`rolePrograms${i}_${j}`, v));
}
// Снесённая программа (REZ 0) выключается; строки подсвечиваются по состоянию.
function refreshProgramRows(){
  $$('#roleProgramsRows .program-card').forEach((tr,i)=>{
    const data = state.rolePrograms?.[i];
    if(!data) return;
    const derezzed = isDerezzed(data);
    if(derezzed && isProgramOn(data)){
      data[8] = '';
      const toggle = tr.querySelector('[data-key$="_8"]');
      if(toggle) toggle.checked = false;
    }
    tr.classList.toggle('is-active', isProgramOn(data));
    tr.classList.toggle('is-derezzed', derezzed);
    tr.title = derezzed ? 'REZ исчерпан — программа снесена' : '';
    const attack = tr.querySelector('[data-program-attack]');
    if(attack) attack.disabled = /^(Усилит|Защит)/i.test(data[1] || '');
    const effect = data[13] === 'effect', ice = !isBlank(data[12]);
    const damage = tr.querySelector('[data-program-damage]:not([data-target])');
    if(damage){
      damage.disabled = !parseDamage(data[11]);
      damage.textContent = effect ? 'СВОЙСТВО' : ice ? 'ПО ПРОГРАММЕ' : 'УРОН';
      damage.title = effect ? `Бросок свойства: ${data[5] || ''}` : ice ? 'Урон по обычной программе (после попадания)' : 'Бросок урона программы (после попадания)';
    }
    const iceButton = tr.querySelector('[data-program-damage][data-target="ice"]');
    if(iceButton){ iceButton.hidden = !ice || effect; iceButton.disabled = !parseDamage(data[12]); }
    const rollLabel = tr.querySelector('[data-program-roll-label]');
    if(rollLabel) rollLabel.textContent = effect ? 'Свойство' : ice ? 'Урон: прогр.' : 'Урон';
  });
  const summary = $('#netBoostSummary');
  if(summary){
    const active = (state.rolePrograms || []).filter(isProgramOn);
    summary.textContent = active.length ? `Включены: ${active.map(data=>programName(data).split(' (')[0]).join(', ')}` : 'Включённых программ нет';
    const brain = programBoostTotal('brain'), speed = programBoostTotal('speed');
    $('#netBoostExtra').textContent = [speed && `Скорость в Сети +${speed}`, brain && `урон по мозгу −${brain}`].filter(Boolean).join(' · ');
  }
}
function programAttack(index){
  const data = programRow(index);
  if(!data) return;
  const attack = Number(data[2]) || 0;
  const luck = spendLuck();
  rollDicePool([{sides:10,count:1}], roleRank() + attack + luck, withNotes(`${programName(data)}: попадание`, [`Интерфейс ${roleRank()}`, `ATK ${attack}`, luck && `удача +${luck}`]));
  if(/^Против/i.test(data[1] || '') && isProgramOn(data)){
    data[8] = '';
    $$(`[data-key="rolePrograms${index}_8"]`).forEach(el=>{ el.checked = false; });
    refreshProgramRows();
    persist();
  }
}
// Урон программы: по обычной программе (или человеку) либо по Чёрному ЛЬДУ, если урон по нему отличается.
// У программ вроде Суперклея кубики — свойство (длительность, штраф), а не урон.
function programDamage(index, target){
  const data = programRow(index);
  if(!data) return;
  const effect = data[13] === 'effect', ice = target === 'ice';
  const damage = parseDamage(ice ? data[12] : data[11]);
  if(!damage){ toast(`${programName(data)}: укажите ${effect ? 'кубики свойства' : 'урон'} в виде 3d6`); return; }
  const label = effect ? 'свойство' : ice ? 'урон по Чёрному ЛЬДУ' : !isBlank(data[12]) ? 'урон по программе' : 'урон';
  rollDicePool([{sides:damage.sides,count:damage.count}], damage.bonus, `${programName(data)}: ${label}`, {crits:false, judge: () => effect ? data[5] || '' : ''});
}
function programRestore(index){
  const data = programRow(index);
  if(!data || isBlank(data[4])) return;
  data[7] = data[4];
  setInput(`rolePrograms${index}_7`, data[7]);
  refreshProgramRows();
  if(persist()) $('#saveStatus').textContent='СОХРАНЕНО '+now();
  toast(`${programName(data)}: REZ восстановлен (${data[4]})`);
}
// Урон по мозгу проходит мимо брони; включённые защитники вроде «Брони» уменьшают его.
function applyBrainDamage(){
  const damage = Math.max(0, Math.floor(Number($('#brainDamage').value) || 0));
  if(!damage) return;
  const reduction = programBoostTotal('brain');
  const through = Math.max(0, damage - reduction);
  const hpBefore = numeric('currentHp');
  state.currentHp = Math.max(0, hpBefore - through);
  syncWoundsWithHp();
  fillStaticInputs();
  updateDerived();
  const status = state.currentHp === 0 ? ' СМЕРТЕЛЬНОЕ РАНЕНИЕ.' : isChecked('seriousWound') ? ' ТЯЖЁЛОЕ РАНЕНИЕ.' : '';
  const text = `Урон по мозгу ${damage}${reduction ? ` (защита −${reduction})` : ''}: −${through} ХИТ, ${hpBefore} → ${state.currentHp}/${maxHp()}.${status}`;
  $('#netDamageResult').textContent = text;
  addHistory({kind:'damage', text});
  $('#brainDamage').value = '';
  if(persist()) $('#saveStatus').textContent='СОХРАНЕНО '+now();
}

function refreshRolePanel(){
  const role = currentRole();
  if(!role || !$('#role').innerHTML) return;
  const rank = roleRank();
  const info = $('#rolePointsInfo');
  if(info){
    const spent = rolePointsSpent(state.roleId), budget = rolePointsBudget();
    info.textContent = `ОЧКИ ${spent} / ${budget}`;
    info.classList.toggle('is-over', spent > budget);
    info.title = spent > budget ? 'Распределено больше очков, чем даёт ранг' : '';
  }
  const net = $('#netActionsInfo');
  if(net) net.textContent = `NET-ДЕЙСТВИЙ ЗА ХОД: ${netActions(rank)}`;
  refreshProgramRows();
  refreshVehicleCards();
  refreshRoleExtras();
  const tableInfo = $('#roleTableInfo');
  if(tableInfo) tableInfo.textContent = state.roleId === 'netrunner' && !isBlank(state.netSlots) ? `ПРОГРАММ ${(state.rolePrograms || []).filter(row=>!isBlank(row[0])).length} / ${numeric('netSlots')}` : '';
  const upgrade = $('[data-role-upgrade]');
  if(upgrade){
    const cost = roleUpgradeCost();
    upgrade.hidden = state.creationMode !== false || rank >= ROLE_MAX_RANK;
    upgrade.textContent = `↑${cost} IP`;
    upgrade.disabled = numeric('ip') < cost;
    upgrade.title = `Повысить ранг до ${rank + 1} за ${cost} IP`;
  }
}
// Проверка способности роли: 1d10 + ранг (+ потраченная удача).
function rollRoleAbility(label, extras = []){
  const luck = spendLuck();
  rollDicePool([{sides:10,count:1}], roleRank() + luck + extras.reduce((sum,[value])=>sum + value, 0), withNotes(label, [luck && `удача +${luck}`, ...extras.map(([value,note])=>value && `${note} +${value}`)]));
}
function upgradeRole(){
  const cost = roleUpgradeCost();
  if(roleRank() >= ROLE_MAX_RANK || numeric('ip') < cost) return;
  state.ip = numeric('ip') - cost;
  state.roleRank = roleRank() + 1;
  setInput('ip', state.ip);
  setInput('roleRank', state.roleRank);
  refreshSkills(); refreshRolePanel();
  if(persist()) $('#saveStatus').textContent='СОХРАНЕНО '+now();
  toast(`${currentRole().ability}: ранг ${state.roleRank} за ${cost} IP`);
}

function render(){
  renderSheetSelect();
  normalizeSkills();
  renderStats();renderSkills();renderLife();renderRolePanel();Object.keys(rowTypes).forEach(type=>renderRows(type));renderCyber();renderDashboard();
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
  autoGrowAll();
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
    // Пустая строка-заготовка, появившаяся после удаления последней строки, не нужна.
    state[type] = (state[type] || []).filter(row=>row.some(cell=>!isBlank(cell)));
    state[type].splice(Math.min(index, state[type].length), 0, removed);
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
$('#roleSelect').innerHTML = '<option value="">— не выбрана —</option>' + Object.entries(roles).map(([id,item])=>`<option value="${id}">${esc(item.name)}</option>`).join('');
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
  const pack=e.target.closest('[data-ammo-pack]');
  if(pack){
    const row = state.ammo?.[Number(pack.dataset.ammoPack)];
    if(row){ row[2] = String((Number(row[2]) || 0) + (ammoCalibers[row[0]]?.[1] ?? 10)); syncAmmoTable(); save(); refreshWeaponRows(); }
  }
  const weapon=e.target.closest('[data-weapon-attack],[data-weapon-damage],[data-weapon-reload]');
  if(weapon){
    const {weaponAttack:attack, weaponDamage:damage, weaponReload:reload} = weapon.dataset;
    if(attack !== undefined) weaponAttack(Number(attack));
    if(damage !== undefined) weaponDamage(Number(damage));
    if(reload !== undefined) weaponReload(Number(reload));
  }
  const skillRoll=e.target.closest('[data-roll-skill]');
  if(skillRoll) rollSkill(skillRoll.dataset.rollSkill);
  const interfaceRoll=e.target.closest('[data-interface]');
  if(interfaceRoll){ const ability = currentRole()?.interfaceAbilities?.find(([key])=>key === interfaceRoll.dataset.interface); if(ability) rollRoleAbility(ability[0] === 'zap' ? 'Разряд: попадание' : `Интерфейс: ${ability[1]}`, programBoosts(ability[0])); }
  const program=e.target.closest('[data-program-attack],[data-program-damage],[data-program-rez]');
  if(program){
    const {programAttack:attack, programDamage:damage, programRez:rez} = program.dataset;
    if(attack !== undefined) programAttack(Number(attack));
    if(damage !== undefined) programDamage(Number(damage), program.dataset.target);
    if(rez !== undefined) programRestore(Number(rez));
  }
  if(e.target.closest('[data-brain-damage]')) applyBrainDamage();
  const roleButton=e.target.closest('[data-role-action]');
  if(roleButton) roleAction(roleButton.dataset.roleAction, {...roleButton.dataset, index:Number(roleButton.dataset.index)});
  if(e.target.closest('[data-zap-damage]')) rollDicePool([{sides:6,count:1}], 0, 'Разряд: урон', {crits:false});
  if(e.target.closest('[data-role-roll]')) rollRoleAbility(currentRole()?.roll || 'Способность роли');
  if(e.target.closest('[data-role-upgrade]')) upgradeRole();
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
// Галочки улучшений транспорта собираются в строку (свои улучшения, вписанные текстом раньше, сохраняются).
document.addEventListener('change',e=>{
  const box = e.target.closest('[data-vehicle-upgrade]');
  if(!box) return;
  const i = box.dataset.vehicleUpgrade;
  const known = nomadUpgrades.map(([name])=>name);
  const custom = vehicleUpgradeList(state.roleVehicles?.[i]).filter(name=>!known.includes(name));
  const checked = $$(`[data-vehicle-upgrade="${i}"]:checked`).map(el=>el.value);
  setInput(`roleVehicles${i}_1`, [...checked, ...custom].join('; '));
  save(`roleVehicles${i}_1`);
});
// Поля СТАТов на карточке подчинённого собираются в строку роли.
document.addEventListener('input',e=>{
  const stat = e.target.closest('[data-team-stat]');
  if(!stat) return;
  const i = stat.dataset.teamStat;
  const values = $$(`[data-team-stat="${i}"]`).map(el=>el.value.trim());
  setInput(`roleTeam${i}_5`, formatTeamStats(values));
  save(`roleTeam${i}_5`);
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
// Удача восстанавливается до значения УДЧ в начале каждой игровой сессии (стр. 130).
$('#restoreLuck').onclick=()=>{state.luckCurrent=numeric('stat6');setInput('luckCurrent',state.luckCurrent);persist();updateDerived();toast(`Удача восстановлена: ${state.luckCurrent}`);};
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
$('#printBtn').onclick=()=>printSheet(false);
$('#printBlankBtn').onclick=()=>printSheet(true);
// Ctrl+P печатает заполненный лист; после печати режим бланка сбрасывается.
window.addEventListener('beforeprint', ()=>renderPrintSheet());
window.addEventListener('afterprint', ()=>{ printBlank = false; });
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
window.addEventListener('resize', autoGrowAll);
