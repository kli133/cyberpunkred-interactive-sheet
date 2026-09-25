// Логика интерактивного листа Cyberpunk RED. Справочные таблицы — в data.js.
const skillEntries = Object.values(skillCategories).flat();
const skills = skillEntries.map(([name]) => name);
const penalizedStats = [1, 2, 7]; // РЕФ, ЛВК, СКО
const rowTypes = {gear:3, weapon:5, relationship:3};
const STORAGE_KEY = 'cyberred-sheet';
const SKILL_POOL = 86, STAT_POOL = 62;
// Поля строк таблиц и киберслотов хранятся только в структурированном виде (state.gear, state.cyberSlots...).
const structuredKey = /^(gear|weapon|relationship)\d+_\d+$|^cyberSlot_/;
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
const skillSpent = () => skills.reduce((sum,_,i)=>sum + numeric(`skill${i}`)*skillWeight(i),0);
const armorPenalty = () => Math.abs(numeric('armorPenalty'));
const statPenalty = statIndex => penalizedStats.includes(statIndex) ? armorPenalty() : 0;
const isChecked = key => state[key] === true || state[key] === 'true';
// Ранения по правилам RED: тяжёлое — −2 ко всем действиям, смертельное (0 хитов) — −4 и −6 к СКО.
const isMortallyWounded = () => isChecked('deathSave') || (!isBlank(state.currentHp) && numeric('currentHp') <= 0);
const woundPenalty = () => isMortallyWounded() ? 4 : isChecked('seriousWound') ? 2 : 0;
const skillTotal = i => numeric(`skill${i}`) + numeric(`stat${skillStatIndex(i)}`) - statPenalty(skillStatIndex(i)) - woundPenalty();
const maxHp = () => 10 + 5*Math.ceil((numeric('stat8') + numeric('stat5'))/2);
const textValue = el => el.isContentEditable ? el.textContent : el.value;
const setVal = (el, value) => { if(el !== document.activeElement) el.value = value; };
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
  return s;
}

function loadState(){
  try { return migrate(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch { return migrate({}); }
}

let state = loadState();

function persist(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    $('#saveStatus').textContent = 'ОШИБКА СОХРАНЕНИЯ: НЕТ МЕСТА';
    return false;
  }
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
  if(state.creationMode === false){
    skills.forEach((_,i)=>{ state[`skill${i}`] = Math.max(0, numeric(`skill${i}`)); });
    return;
  }
  skills.forEach((_,i)=>{ state[`skill${i}`] = Math.max(0, Math.min(6, numeric(`skill${i}`))); });
  let excess = skillSpent() - SKILL_POOL;
  if(excess <= 0) return;
  // Срезаем в первую очередь навык, который только что меняли.
  const changed = /^skill(\d+)$/.exec(changedKey || '');
  if(changed){
    const i = Number(changed[1]);
    const cut = Math.min(numeric(`skill${i}`), Math.ceil(excess / skillWeight(i)));
    state[`skill${i}`] -= cut;
    excess -= cut * skillWeight(i);
  }
  for(let i = skills.length - 1; i >= 0 && excess > 0; i--){
    while(numeric(`skill${i}`) > 0 && excess > 0){ state[`skill${i}`]--; excess -= skillWeight(i); }
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
  $('#skillBudget').textContent = Math.max(0, SKILL_POOL - skillSpent());
  $$('[data-key^="skill"]').forEach(el=>setVal(el, state[el.dataset.key] ?? 0));
  $$('[data-skill-total]').forEach(cell=>{
    const i = Number(cell.dataset.skillTotal);
    const armor = statPenalty(skillStatIndex(i)), wound = woundPenalty();
    cell.textContent = skillTotal(i);
    cell.classList.toggle('is-penalized', armor + wound > 0);
    cell.title = [armor && `Штраф брони −${armor}`, wound && `Штраф ранения −${wound}`].filter(Boolean).join(', ');
  });
}

function renderSkills(){
  $('#skillBudget').closest('strong').classList.toggle('is-hidden', state.creationMode === false);
  $('.rules-note').classList.toggle('is-hidden', state.creationMode === false);
  const query = ($('#skillSearch')?.value || '').trim().toLocaleLowerCase('ru');
  const activeCategory = $('.skill-filter.active')?.dataset.category || 'Все';
  const maxLevel = state.creationMode === false ? 10 : 6;
  $('#skillsCategories').innerHTML = Object.entries(skillCategories).map(([category, entries]) => {
    if(activeCategory !== 'Все' && activeCategory !== category) return '';
    const visible = entries.filter(([name, stat]) => !query || `${name} ${stat}`.toLocaleLowerCase('ru').includes(query));
    if(!visible.length) return '';
    return `<article class="skill-category"><h2>${category}</h2><table class="skill-table"><thead><tr><th>Название</th><th>Стат</th><th>Урв</th><th>Сумм</th><th></th></tr></thead><tbody>${visible.map(([name,stat])=>{const i=skills.indexOf(name);const level=numeric(`skill${i}`);return `<tr><td>${name}<button class="skill-roll" data-roll-skill="${i}" title="Бросить 1d10 + стат + навык">1d10</button></td><td>${stat}</td><td><input data-key="skill${i}" type="number" min="0" max="${maxLevel}" value="${level}"></td><td class="skill-total" data-skill-total="${i}">${skillTotal(i)}</td><td></td></tr>`;}).join('')}</tbody></table></article>`;
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
function row(type,data={},index){
  const configs={gear:['Предмет','Кол-во','Заметка'],weapon:['Оружие','Урон','Боеприпасы','ROF','Заметки'],relationship:['Персонаж','Кто это?','Что ему нужно?']};
  return `<tr>${configs[type].map((x,j)=>{
    const key=`${type}${index}_${j}`;
    const isNote=(type==='gear'&&j===2)||(type==='weapon'&&j===4);
    return `<td>${isNote ? `<div class="formula-editor" data-key="${key}" contenteditable="true">${formulaHtml(key,data[j]||'')}</div>` : field(key,data[j]||'','','')}</td>`;
  }).join('')}<td><button class="remove" data-remove="${type}" data-index="${index}">×</button></td></tr>`;
}
function renderRows(type,selector){ const rows=state[type]?.length ? state[type] : [{}]; $(selector).innerHTML=rows.map((d,i)=>row(type,d,i)).join(''); }
function renderCyber(){
  const saved = state.cyberSlots || {};
  if(!state.cyberSlots && Array.isArray(state.cyberware) && state.cyberware.length) saved.cranial = state.cyberware;
  Object.entries(cyberSections).forEach(([key,[title,count]]) => {
    const target = $(`[data-cyber-section="${key}"]`);
    const rows = saved[key] || [];
    target.innerHTML = `<table class="cyber-slot-table"><thead><tr><th>${title}</th><th>Информация</th></tr></thead><tbody>${Array.from({length:count},(_,i)=>`<tr><td>${field(`cyberSlot_${key}_${i}_name`,rows[i]?.[0]||'')}</td><td>${field(`cyberSlot_${key}_${i}_info`,rows[i]?.[1]||'')}</td></tr>`).join('')}</tbody></table>`;
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
  $('#sheetName').textContent=(state.name||'НОВЫЙ ЛИСТ').toUpperCase();
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

function rollSkill(index){
  const modifier = skillTotal(index);
  state.dicePool=[{sides:10,count:1}];
  renderDicePool();
  $('#diceModifier').value=modifier;
  const wound = woundPenalty();
  rollDicePool([{sides:10,count:1}], modifier, wound ? `${skills[index]} (ранение −${wound})` : skills[index]);
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
    if(!structuredKey.test(key)) state[key] = el.type==='checkbox' ? el.checked : textValue(el);
  });
  if(changedKey === 'currentHp') syncWoundsWithHp();
  normalizeStats();
  normalizeSkills(changedKey);
  Object.entries(rowTypes).forEach(([type,width])=>{
    const elements=$$(`[data-key^="${type}"]`).filter(el=>structuredKey.test(el.dataset.key));
    const count=Math.ceil(elements.length/width);
    state[type]=Array.from({length:count},(_,i)=>elements.filter(el=>el.dataset.key.startsWith(`${type}${i}_`)).map(textValue));
  });
  state.cyberSlots = Object.keys(cyberSections).reduce((all,key)=>{
    all[key] = Array.from({length: cyberSections[key][1]},(_,i)=>[
      $(`[data-key="cyberSlot_${key}_${i}_name"]`)?.value || '',
      $(`[data-key="cyberSlot_${key}_${i}_info"]`)?.value || ''
    ]);
    return all;
  },{});
  delete state.cyberware;
  // Ничего не перерисовываем целиком, чтобы не сбивать фокус в поле, которое сейчас редактируется.
  refreshStats(); updateDerived();
  $('#dashboardGreeting').textContent = state.name ? `ОПЕРАТИВНИК: ${state.name.toUpperCase()}` : 'СИСТЕМА ГОТОВА';
  if(persist()) $('#saveStatus').textContent='СОХРАНЕНО '+now();
}

const setInput = (key, value) => $$(`[data-key="${key}"]`).forEach(el=>{ el.value = value; });

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
      // Одно и то же значение может быть в нескольких полях (человечность).
      $$(`[data-key="${key}"]`).forEach(other=>{ if(other!==el && other.type!=='checkbox') other.value=el.value; });
      save(key);
    });
    // После окончания ввода показываем значение с учётом ограничений.
    el.addEventListener('change',()=>{ if(clampedKey.test(el.dataset.key)) el.value = state[el.dataset.key]; });
  });
}

function render(){
  renderStats();renderSkills();renderLife();Object.keys(rowTypes).forEach(type=>renderRows(type,`#${type}Rows`));renderCyber();renderDashboard();
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

// При удалении строки заметки с формулами должны сдвинуться вместе со строками.
function shiftFormulaMarks(type, index){
  const marks = state.formulaMarks;
  if(!marks) return;
  const pattern = new RegExp(`^${type}(\\d+)_(\\d+)$`);
  state.formulaMarks = Object.entries(marks).reduce((next,[key,value])=>{
    const match = pattern.exec(key);
    if(!match) next[key] = value;
    else if(Number(match[1]) !== index) next[Number(match[1]) > index ? `${type}${Number(match[1]) - 1}_${match[2]}` : key] = value;
    return next;
  },{});
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
  img.onerror = () => { URL.revokeObjectURL(url); alert('Не удалось загрузить изображение.'); };
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
    if(!state[type]?.length) state[type]=[{}];
    state[type].push({});
    render();save();
  }
  const rem=e.target.closest('[data-remove]');
  if(rem){
    const type=rem.dataset.remove, index=Number(rem.dataset.index);
    if(state[type]?.length){ state[type].splice(index,1); shiftFormulaMarks(type,index); }
    render();save();
  }
  const skillRoll=e.target.closest('[data-roll-skill]');
  if(skillRoll) rollSkill(Number(skillRoll.dataset.rollSkill));
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
$('#rollDice').onclick=()=>{const pool=readDicePool();state.dicePool=pool;rollDicePool(pool,Number($('#diceModifier').value)||0,'Свободный бросок');};
$('#advantageBtn').onclick=()=>{state.rollMode=state.rollMode==='advantage'?'':'advantage';renderRollMode();persist();};
$('#disadvantageBtn').onclick=()=>{state.rollMode=state.rollMode==='disadvantage'?'':'disadvantage';renderRollMode();persist();};
$('#deathSaveButton').onclick=rollDeathSave;
$('#skillSearch').oninput=()=>{renderSkills();bindInputs();};
$('#clearLog').onclick=()=>{state.rollHistory=[];persist();renderDashboardLog();$('#diceLog').innerHTML='';};
$('#portraitInput').onchange=e=>{const file=e.target.files[0];if(file)loadPortrait(file);e.target.value='';};
$('#resetBtn').onclick=()=>{if(confirm('Очистить весь лист?')){state=migrate({});localStorage.removeItem(STORAGE_KEY);render();$('#diceLog').innerHTML='';$('#diceResult').textContent='—';$('#saveStatus').textContent='ЛИСТ ОЧИЩЕН';}};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.name||'cyberpunk-red-sheet').replace(/[\\/:*?"<>|]/g,'_')+'.json';a.click();URL.revokeObjectURL(a.href);};
$('#importInput').onchange=e=>{
  const file=e.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    let data;
    try{data=JSON.parse(reader.result);}catch{data=null;}
    if(!data || typeof data!=='object' || Array.isArray(data)){alert('Не удалось прочитать JSON-файл.');return;}
    state=migrate(data);
    render();save();
  };
  reader.readAsText(file);
  e.target.value='';
};
render();
