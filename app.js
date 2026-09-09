// Cyberpunk RED: характеристики создаются пулом из 62 очков, значения 2–8.
const stats = ['ИНТ','РЕФ','ЛВК','ТЕХ','ХАР','ВОЛ','УДЧ','СКО','ТЕЛ','ЭМП'];
const statAliases = { 'ВОЛЯ': 'ВОЛ', 'РЕА': 'РЕФ' };
const skillCategories = {
  'Навыки восприятия': [['Концентрация','ВОЛЯ'],['Скрытие/раскрытие','ИНТ'],['Чтение по губам','ИНТ'],['Внимательность','ИНТ'],['Выслеживание','ИНТ']],
  'Физические навыки': [['Атлетика','ЛВК'],['Акробатика','ЛВК'],['Танец','ЛВК'],['Выносливость','ВОЛЯ'],['Сопрот. пыткам/наркотикам','ВОЛЯ'],['Скрытность','ЛВК']],
  'Навыки управления': [['Вождение','РЕА'],['Пилотирование (x2)','РЕА'],['Судовождение','РЕА'],['Верховая езда','РЕА']],
  'Навыки ближнего боя': [['Рукопашный бой','ЛВК'],['Уклонение','ЛВК'],['Боевые искусства (x2)','ЛВК'],['Оружие ближнего боя','ЛВК']],
  'Социальные навыки': [['Подкуп','ХАР'],['Общение','ЭМП'],['Проницательность','ЭМП'],['Допрос','ХАР'],['Убеждение','ХАР'],['Уход за собой','ХАР'],['Знание улиц','ХАР'],['Торговля','ХАР'],['Гардероб и стиль','ХАР']],
  'Образовательные навыки': [['Бухгалтерия','ИНТ'],['Обращение с животными','ИНТ'],['Бюрократия','ИНТ'],['Бизнес','ИНТ'],['Композиция','ИНТ'],['Криминология','ИНТ'],['Криптография','ИНТ'],['Дедукция','ИНТ'],['Образование','ИНТ'],['Азартные игры','ИНТ'],['Язык','ИНТ'],['Поиск информации','ИНТ'],['Знание местности','ИНТ'],['Наука','ИНТ'],['Тактика','ИНТ'],['Выживание в пустыне','ИНТ']],
  'Сценические навыки': [['Актёрское мастерство','ХАР'],['Игра на инструментах','ТЕХ']],
  'Навыки дальнего боя': [['Стрельба из лука','РЕА'],['Автоматический огонь (x2)','РЕА'],['Пистолеты','РЕА'],['Оружие КР-калибра (x2)','РЕА'],['Тактическое оружие','РЕА']],
  'Технические навыки': [['Авиационные технологии','ТЕХ'],['Знания техники','ТЕХ'],['Кибертехника','ТЕХ'],['Подрывник (x2)','ТЕХ'],['Электроника/Безопасность (x2)','ТЕХ'],['Первая помощь','ТЕХ'],['Фальсификация','ТЕХ'],['Автомеханика','ТЕХ'],['Художественное ремесло','ТЕХ'],['Парамедик (x2)','ТЕХ'],['Кино и фотография','ТЕХ'],['Взлом замков','ТЕХ'],['Карманник','ТЕХ'],['Морская технология','ТЕХ'],['Оружейник','ТЕХ']]
};
const skillEntries = Object.values(skillCategories).flat();
const skills = skillEntries.map(([name]) => name);
const lifeFields = ['Культурное наследие','Личность','Стиль одежды','Прическа','Что ты ценишь больше всего?','Отношение к людям?','Самый близкий человек','Самое ценное, чем ты обладаешь','История семьи','Среда, в которой прошло детство','Семейный кризис','Жизненные цели','Трагическая любовь'];
const cyberSections = {
  cranial:['Кибераудио',3], rightEye:['Правый киберглаз',3], leftEye:['Левый киберглаз',3],
  rightArm:['Правая киберрука',4], leftArm:['Левая киберрука',4], neural:['Нейроинтерфейс',5],
  rightLeg:['Правая кибернога',3], leftLeg:['Левая кибернога',3],
  internal:['Внутр. киберимплант',6], external:['Внешний киберимплант',6],
  fashionware:['Стильной киберимплант',6], borgware:['Боргирование',6]
};
let state = JSON.parse(localStorage.getItem('cyberred-sheet') || '{}');
if(state.creationMode === undefined) state.creationMode = true;
const $ = s => document.querySelector(s);
const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const field = (key, value='', type='text', placeholder='') => `<input data-key="${key}" type="${type}" value="${esc(value)}" placeholder="${placeholder}">`;
const numeric = key => Number(state[key]) || 0;
const statAlias = name => statAliases[name] || name;
const textValue = el => el.isContentEditable ? el.textContent : el.value;
const formulaHtml = (key, value) => {
  const formulas = state.formulaMarks?.[key] || [];
  let html = esc(value);
  formulas.forEach(formula => {
    const safe = esc(formula);
    html = html.replace(safe, `<span class="formula-marked" data-formula="${safe}">${safe}</span>`);
  });
  return html;
};

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

function renderStats(){
  const oldBudget = $('.point-budget');
  if(oldBudget) oldBudget.remove();
  const total = normalizeStats();
  $('#statsGrid').innerHTML = stats.map((name,i) => {
    const statValue = `<input class="stat-value" data-key="stat${i}" type="number" min="${state.creationMode === false ? 0 : 2}" max="${state.creationMode === false ? 99 : 8}" step="1" value="${state[`stat${i}`] || 0}" aria-label="${name}">`;
    if(i === 6 || i === 9){
      const key = i === 6 ? 'luckCurrent' : 'humanityCurrent';
      const max = i === 6 ? state.stat6 || 0 : (state.stat9 || 0) * 10;
      const fallback = i === 6 ? state.stat6 || 0 : (state.stat9 || 0) * 10;
      const current = `<input class="resource-value" data-key="${key}" type="number" min="0" max="${max}" value="${state[key] ?? fallback}" aria-label="Текущее ${name}">`;
      return `<div class="stat-row has-resource"><span>${name}</span><div class="resource-pair">${current}<span class="resource-separator">из</span>${statValue}</div></div>`;
    }
    return `<div class="stat-row"><span>${name}</span>${statValue}</div>`;
  }).join('');
  if(state.creationMode !== false){
    $('#statsGrid').insertAdjacentHTML('beforebegin', `<div class="point-budget">ПУЛ СОЗДАНИЯ: <strong>${total}</strong> / 62 <small>Минимум 2, максимум 8.</small></div>`);
  }
}

function renderSkills(){
  const total = skills.reduce((sum,_,i)=>sum + numeric(`skill${i}`),0);
  $('#skillBudget').textContent = Math.max(0,86-total);
  $('#skillBudget').closest('strong').classList.toggle('is-hidden', state.creationMode === false);
  $('.rules-note').classList.toggle('is-hidden', state.creationMode === false);
  const query = ($('#skillSearch')?.value || '').trim().toLocaleLowerCase('ru');
  const activeCategory = document.querySelector('.skill-filter.active')?.dataset.category || 'Все';
  $('#skillsCategories').innerHTML = Object.entries(skillCategories).map(([category, entries]) => {
    if(activeCategory !== 'Все' && activeCategory !== category) return '';
    const visible = entries.filter(([name, stat]) => !query || `${name} ${stat}`.toLocaleLowerCase('ru').includes(query));
    if(!visible.length) return '';
    return `<article class="skill-category"><h2>${category}</h2><table class="skill-table"><thead><tr><th>Название</th><th>Стат</th><th>Урв</th><th>Сумм</th><th></th></tr></thead><tbody>${visible.map(([name,stat])=>{const i=skills.indexOf(name);const level=numeric(`skill${i}`);const statIndex=stats.indexOf(statAlias(stat)||stat);return `<tr><td>${name}<button class="skill-roll" data-roll-skill="${i}" title="Бросить 1d10 + стат + навык">1d10</button></td><td>${stat}</td><td><input data-key="skill${i}" type="number" min="0" max="${state.creationMode === false ? 10 : 6}" value="${level}"></td><td class="skill-total">${level + numeric(`stat${statIndex}`)}</td><td></td></tr>`;}).join('')}</tbody></table></article>`;
  }).join('') || '<div class="empty-search">НАВЫКИ НЕ НАЙДЕНЫ</div>';
  renderSkillFilters();
}

function renderSkillFilters(){
  const active = document.querySelector('.skill-filter.active')?.dataset.category || 'Все';
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
function renderRows(type,selector){ const rows=state[type]||[{}]; $(selector).innerHTML=rows.map((d,i)=>row(type,d,i)).join(''); }
function renderCyber(){
  const saved = state.cyberSlots || {};
  if(!state.cyberSlots && Array.isArray(state.cyberware) && state.cyberware.length) saved.cranial = state.cyberware;
  Object.entries(cyberSections).forEach(([key,[title,count]]) => {
    const target = document.querySelector(`[data-cyber-section="${key}"]`);
    const rows = saved[key] || [];
    target.innerHTML = `<table class="cyber-slot-table"><thead><tr><th>${title}</th><th>Информация</th></tr></thead><tbody>${Array.from({length:count},(_,i)=>`<tr><td>${field(`cyberSlot_${key}_${i}_name`,rows[i]?.[0]||'')}</td><td>${field(`cyberSlot_${key}_${i}_info`,rows[i]?.[1]||'')}</td></tr>`).join('')}</tbody></table>`;
  });
}

function updateDerived(){
  const body=numeric('stat8'), will=numeric('stat5'), emp=numeric('stat9'), hp=10+(body*5);
  if(state.currentHp === undefined || state.currentHp === '') state.currentHp=hp;
  state.currentHp=Math.max(0,Math.min(numeric('currentHp'),hp));
  const hpInput = $('#hpValue');
  if(hpInput){ hpInput.value=state.currentHp; hpInput.max=hp; }
  const hpMaximum = $('#hpMaximum');
  if(hpMaximum) hpMaximum.textContent=hp;
  $('#staminaValue').textContent=body+will;
  $('#woundValue').textContent=Math.ceil(hp/2);
  $('#speedValue').textContent=numeric('stat7');
  const humanityValue = $('#humanityValue');
  if(humanityValue){
    const maxHumanity = emp * 10;
    humanityValue.max = maxHumanity;
    if(state.humanityValue === undefined || state.humanityValue === '') state.humanityValue = maxHumanity;
    state.humanityValue = Math.max(0, Math.min(numeric('humanityValue'), maxHumanity));
    humanityValue.value = state.humanityValue;
  }
  const luckInput = $('[data-key="luckCurrent"]');
  if(luckInput){ luckInput.max=numeric('stat6'); if(state.luckCurrent === undefined) state.luckCurrent=numeric('stat6'); luckInput.value=Math.min(numeric('luckCurrent'),numeric('stat6')); }
  const humanityInput = $('[data-key="humanityCurrent"]');
  if(humanityInput){ humanityInput.max=emp*10; if(state.humanityCurrent === undefined) state.humanityCurrent=emp*10; humanityInput.value=Math.min(numeric('humanityCurrent'),emp*10); }
  $('#sheetName').textContent=(state.name||'НОВЫЙ ЛИСТ').toUpperCase();
}

function normalizeDicePool(pool){
  const normalized=[];
  let totalCount=0;
  (Array.isArray(pool) ? pool : []).forEach(item=>{
    const sides=Math.max(1,Math.min(1000,Number(item.sides)||10));
    const count=Math.max(1,Math.min(100,Number(item.count)||1));
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

function rollDicePool(pool, modifier, label='Свободный бросок'){
  const dicePool=normalizeDicePool(pool);
  const diceDetails=dicePool.flatMap(({sides,count})=>Array.from({length:count},()=>({sides,value:rollDie(sides)})));
  const dice=diceDetails.map(item=>item.value);
  const die = dice.reduce((sum,value)=>sum+value,0);
  const total = die + modifier;
  const critical = diceDetails.length === 1 && diceDetails[0].sides === 10 && (die === 1 || die === 10);
  const result = `${total >= 0 ? total : '−'+Math.abs(total)}`;
  const mode=rollModeLabel();
  const entry = {label, die, dice, diceDetails, modifier, total, critical, mode, time:new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})};
  state.rollHistory = [entry, ...(state.rollHistory || [])].slice(0, 30);
  localStorage.setItem('cyberred-sheet',JSON.stringify(state));
  $('#diceResult').innerHTML = `<div class="formula-roll-values">${diceDetails.map((item,index)=>`<span class="formula-die" aria-label="D${item.sides}, кубик ${index + 1}">${item.value}<small>D${item.sides}</small></span>`).join('')}</div><strong class="formula-roll-total">СУММА: ${result}</strong>`;
  $('#diceLog').insertAdjacentHTML('afterbegin', `<div>${label}${mode ? ` [${mode}]` : ''}: <b>${diceDetails.map(item=>`D${item.sides}: ${item.value}`).join(' + ')}</b> + ${modifier} = <strong>${result}</strong>${critical ? ` <em>${die === 10 ? 'КРИТИЧЕСКИЙ УСПЕХ' : 'КРИТИЧЕСКАЯ ЕДИНИЦА'}</em>` : ''}</div>`);
  renderDashboardLog();
  $('#diceDrawer').classList.add('open');
}

function rollDice(sides, modifier, label='Свободный бросок', count=1){
  rollDicePool([{sides,count}],modifier,label);
}

function parseFormula(value){
  const match = String(value).trim().match(/^(\d+)\s*[dд]\s*(\d+)$/i);
  if(!match) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  return count > 0 && count <= 100 && sides > 0 && sides <= 1000 ? {count,sides} : null;
}

function rollFormula(formula){
  const dice = Array.from({length:formula.count},()=>rollDie(formula.sides));
  const total = dice.reduce((sum,value)=>sum+value,0);
  const label = `${formula.count}d${formula.sides}`;
  const mode=rollModeLabel();
  const entry = {label, formula:label, dice, die:total, modifier:0, total, critical:false, mode, time:new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})};
  state.rollHistory = [entry, ...(state.rollHistory || [])].slice(0,30);
  localStorage.setItem('cyberred-sheet',JSON.stringify(state));
  $('#diceResult').innerHTML = `<div class="formula-roll-values">${dice.map((value,index)=>`<span class="formula-die" aria-label="Кубик ${index + 1}">${value}</span>`).join('')}</div><strong class="formula-roll-total">СУММА: ${total}</strong>`;
  $('#diceLog').insertAdjacentHTML('afterbegin', `<div>${label}${mode ? ` [${mode}]` : ''}: <b>${dice.join(' + ')}</b> = <strong>${total}</strong></div>`);
  renderDashboardLog();
  $('#diceDrawer').classList.add('open');
}

function rollSkill(index){
  const [name, stat] = skillEntries[index];
  const statIndex = stats.indexOf(statAlias(stat));
  const modifier = numeric(`skill${index}`) + numeric(`stat${statIndex}`);
  state.dicePool=[{sides:10,count:1}];
  renderDicePool();
  $('#diceModifier').value=modifier;
  rollDice(10, modifier, name);
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
  return [...document.querySelectorAll('.dice-pool-row')].map(row=>({
    sides:Number(row.querySelector('.dice-sides').value),
    count:Number(row.querySelector('.dice-count').value)
  }));
}

function renderDashboardLog(){
  const history = state.rollHistory || [];
  $('#dashboardLog').innerHTML = history.length ? history.map(item =>
    `<div><span>${item.time}</span> ${item.label}${item.mode ? ` [${item.mode}]` : ''}: <b>${item.diceDetails ? item.diceDetails.map(die=>`D${die.sides}: ${die.value}`).join(' + ') : (item.dice ? item.dice.join(' + ') : item.die)}</b>${item.modifier ? ` + ${item.modifier}` : ''} = <strong>${item.total}</strong></div>`
  ).join('') : 'Пока нет бросков.';
}

function renderDashboard(){
  $('#dashboardGreeting').textContent = state.name ? `ОПЕРАТИВНИК: ${state.name.toUpperCase()}` : 'СИСТЕМА ГОТОВА';
  renderDashboardLog();
  if(state.portrait) {
    $('#portraitPreview').classList.add('has-image');
    $('#portraitPreview').style.backgroundImage=`url("${state.portrait}")`;
  } else {
    $('#portraitPreview').classList.remove('has-image');
    $('#portraitPreview').style.backgroundImage='';
  }
}

function save(){
  document.querySelectorAll('[data-key]').forEach(el=>{state[el.dataset.key]=el.type==='checkbox'?el.checked:textValue(el)});
  normalizeStats();
  if(state.creationMode !== false){
    const levels = skills.map((_,i)=>numeric(`skill${i}`));
    let total = levels.reduce((a,b)=>a+b,0);
    skills.forEach((_,i)=>{state[`skill${i}`]=Math.min(6,numeric(`skill${i}`));});
    total = skills.reduce((sum,_,i)=>sum + numeric(`skill${i}`),0);
    while(total > 86){const index=skills.findIndex((_,i)=>numeric(`skill${i}`)>0);if(index<0)break;state[`skill${index}`]--;total--;}
  }
  document.querySelectorAll('[data-key^="stat"]').forEach(el=>{el.value=state[el.dataset.key]});
  const budget = $('.point-budget strong');
  if(budget) budget.textContent=stats.reduce((sum,_,i)=>sum+numeric(`stat${i}`),0);
  ['gear','weapon','relationship','cyberware'].forEach(type=>{
    const elements=[...document.querySelectorAll(`[data-key^="${type}"]`)];
    const width=type==='cyberware'?2:type==='weapon'?5:3;
    const count=Math.ceil(elements.length/width);
    state[type]=Array.from({length:count},(_,i)=>elements.filter(el=>el.dataset.key.startsWith(`${type}${i}_`)).map(textValue));
  });
  state.cyberSlots = Object.keys(cyberSections).reduce((all,key)=>{
    const fields = [...document.querySelectorAll(`[data-key^="cyberSlot_${key}_"]`)];
    all[key] = Array.from({length: cyberSections[key][1]},(_,i)=>[
      fields.find(el=>el.dataset.key===`cyberSlot_${key}_${i}_name`)?.value || '',
      fields.find(el=>el.dataset.key===`cyberSlot_${key}_${i}_info`)?.value || ''
    ]);
    return all;
  },{});
  localStorage.setItem('cyberred-sheet',JSON.stringify(state));
  $('#saveStatus').textContent='СОХРАНЕНО '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  renderStats(); renderSkills(); bindInputs(); updateDerived();
}

function bindInputs(){
  document.querySelectorAll('[data-key]').forEach(el=>{
    if(el.dataset.bound) return;
    const value=state[el.dataset.key];
    if(el.type==='checkbox') el.checked=value==='true'||value===true;
    else if(value!==undefined && !el.isContentEditable) el.value=value;
    el.dataset.bound='true';
    el.addEventListener('input',()=>{
      const key=el.dataset.key;
      if(state.creationMode !== false && /^stat\d+$/.test(key)){
        const next=Math.max(2,Math.min(8,Number(el.value)||2));
        const otherTotal=stats.reduce((sum,_,i)=>sum+(key===`stat${i}`?0:numeric(`stat${i}`)),0);
        if(otherTotal+next>62){
          el.value=state[key];
          return;
        }
      }
      save();
    });
  });
}

function render(){
  renderStats();renderSkills();renderLife();renderRows('gear','#gearRows');renderRows('weapon','#weaponRows');renderRows('relationship','#relationshipRows');renderCyber();renderDashboard();
  $('#creationMode').checked=state.creationMode !== false;
  renderRollMode();
  bindInputs();
  updateDerived();
}

function switchTab(tabName){
  document.querySelectorAll('.tab,.tab-panel').forEach(x=>x.classList.remove('active'));
  const tab=document.querySelector(`.tab[data-tab="${tabName}"]`);
  const panel=document.getElementById(tabName);
  if(tab && panel){tab.classList.add('active');panel.classList.add('active');}
}

document.querySelectorAll('.tab').forEach(tab=>tab.onclick=()=>switchTab(tab.dataset.tab));
$('#creationMode').onchange=()=>{state.creationMode=$('#creationMode').checked;save();render();};

document.addEventListener('click',e=>{
  const tab=e.target.closest('.tab');
  if(tab) switchTab(tab.dataset.tab);
  const add=e.target.closest('[data-add]');
  if(add){const type=add.dataset.add;(state[type]||(state[type]=[])).push({});render();save();}
  const rem=e.target.closest('[data-remove]');
  if(rem){state[rem.dataset.remove].splice(Number(rem.dataset.index),1);render();save();}
  const skillRoll=e.target.closest('[data-roll-skill]');
  if(skillRoll) rollSkill(Number(skillRoll.dataset.rollSkill));
  const formula=e.target.closest('[data-formula]');
  if(formula) rollFormula(parseFormula(formula.dataset.formula));
});
document.addEventListener('contextmenu',e=>{
  const input=e.target.closest('.formula-editor');
  const selection=window.getSelection();
  if(!input || !selection || selection.isCollapsed || !input.contains(selection.anchorNode)) return;
  const selected=selection.toString();
  const formula=parseFormula(selected);
  if(!formula) return;
  e.preventDefault();
  const range=selection.getRangeAt(0);
  const marker=document.createElement('span');
  marker.className='formula-marked';
  marker.dataset.formula=selected;
  range.surroundContents(marker);
  const key=input.dataset.key;
  const marks=state.formulaMarks || (state.formulaMarks={});
  marks[key]=Array.from(new Set([...(marks[key] || []),selected]));
  save();
});
renderDicePool();
renderRollMode();
$('#diceToggle').onclick=()=>$('#diceDrawer').classList.toggle('open');
$('#diceClose').onclick=()=>$('#diceDrawer').classList.remove('open');
$('#addDie').onclick=()=>{state.dicePool=[...readDicePool(),{sides:6,count:1}];renderDicePool();};
$('#dicePool').oninput=()=>{state.dicePool=readDicePool();localStorage.setItem('cyberred-sheet',JSON.stringify(state));};
$('#dicePool').onclick=e=>{const remove=e.target.closest('.remove-die');if(!remove)return;const pool=readDicePool();pool.splice(Number(remove.closest('.dice-pool-row').dataset.diceIndex),1);state.dicePool=pool;renderDicePool();};
$('#rollDice').onclick=()=>{const pool=readDicePool();state.dicePool=pool;rollDicePool(pool,Number($('#diceModifier').value)||0,'Свободный бросок');};
$('#advantageBtn').onclick=()=>{state.rollMode=state.rollMode==='advantage'?'':'advantage';renderRollMode();localStorage.setItem('cyberred-sheet',JSON.stringify(state));};
$('#disadvantageBtn').onclick=()=>{state.rollMode=state.rollMode==='disadvantage'?'':'disadvantage';renderRollMode();localStorage.setItem('cyberred-sheet',JSON.stringify(state));};
$('#deathSaveButton').onclick=()=>rollDice(10,0,'Испытание против смерти');
$('#skillSearch').oninput=()=>{renderSkills();bindInputs();};
document.addEventListener('click',e=>{const filter=e.target.closest('.skill-filter');if(filter){document.querySelectorAll('.skill-filter').forEach(x=>x.classList.remove('active'));filter.classList.add('active');renderSkills();bindInputs();}});
$('#clearLog').onclick=()=>{state.rollHistory=[];localStorage.setItem('cyberred-sheet',JSON.stringify(state));renderDashboardLog();};
$('#portraitInput').onchange=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{state.portrait=reader.result;localStorage.setItem('cyberred-sheet',JSON.stringify(state));renderDashboard();};reader.readAsDataURL(file);};
$('#resetBtn').onclick=()=>{if(confirm('Очистить весь лист?')){state={};localStorage.removeItem('cyberred-sheet');render();}};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.name||'cyberpunk-red-sheet')+'.json';a.click();URL.revokeObjectURL(a.href);};
$('#importInput').onchange=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{state=JSON.parse(reader.result);render();save();}catch{alert('Не удалось прочитать JSON-файл.');}};reader.readAsText(file);};
render();
